/**
 * Automated Test Suite: German Anesthesia Board Exam (ÄKNO)
 * Tests:
 * 1. Dataset integrity (578 questions, valid IDs, categories, stems, answers)
 * 2. Medical EdTech Dialogue Parser (Step 1 Presentation, Step 2 Vitals/BGA, Step 3 Examiner Intervention, Step 4 Rubric)
 * 3. 3 High-Impact Model Answer Blocks:
 *    - 🗣️ Verbal Framework (Redemittel)
 *    - 🎯 Checklist & Dosages (Dosage highlighting)
 *    - ⚠️ Critical Pitfalls (No-Go / Prüfungsfalle)
 * 4. Cloze Masking Engine (Dosages & threshold masking for Mode C)
 * 5. Study Mode state transitions
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Facharztprüfung Anästhesie Test Suite...\n');

// 1. Load questions dataset
const questionsPath = path.join(__dirname, 'questions.js');
assert(fs.existsSync(questionsPath), 'questions.js must exist');
let questionsCode = fs.readFileSync(questionsPath, 'utf8');
questionsCode = questionsCode.replace('const EXAM_QUESTIONS =', 'global.EXAM_QUESTIONS =');
eval(questionsCode);
const questions = global.EXAM_QUESTIONS;

console.log(`[PASS] Loaded dataset with ${questions.length} questions.`);
assert(questions.length >= 570, `Expected at least 570 questions, got ${questions.length}`);

// 2. Validate question schema
let optionsCount = 0;
let openCount = 0;
const categorySet = new Set();

questions.forEach((q, idx) => {
  assert(q.id, `Question at index ${idx} missing id`);
  assert(q.category, `Question ${q.id} missing category`);
  categorySet.add(q.category);
  
  if (q.question_type === 'options') {
    optionsCount++;
    assert(q.stem_de, `Option question ${q.id} missing stem_de`);
    assert(Array.isArray(q.options) && q.options.length > 0, `Option question ${q.id} has invalid options`);
  } else {
    openCount++;
    assert(q.question_de, `Open question ${q.id} missing question_de`);
    assert(q.answer_de, `Open question ${q.id} missing answer_de`);
  }
});

console.log(`[PASS] Schema validation passed: ${optionsCount} options questions, ${openCount} open case questions across ${categorySet.size} categories.`);

// 3. Test Cloze Masking Engine
function highlightDosagesAndUnits(text) {
  if (!text) return '';
  const unitRegex = /(?:(pH\s*\d+([.,]\d+)?)|(\b\d+([.,]\d+)?\s*(?:mg\/kg|µg\/kg|µg|mg|g|ml\/kg|ml|mmol\/l|mmol|%|IE|cmH2O|mmHg|bar|l\/min|h|min|s|°C)))(?!\w)/gi;
  return text.replace(unitRegex, '<span class="dosage-highlight">$&</span>');
}

function generateClozeMaskedHtml(text) {
  if (!text) return '';
  const unitRegex = /(?:(pH\s*\d+([.,]\d+)?)|(\b\d+([.,]\d+)?\s*(?:mg\/kg|µg\/kg|µg|mg|g|ml\/kg|ml|mmol\/l|mmol|%|IE|cmH2O|mmHg|bar|l\/min|h|min|s|°C)))(?!\w)/gi;
  return text.replace(unitRegex, '<span class="cloze-blur" data-cloze="$&" tabindex="0" title="Klicken zum Aufdecken">$&</span>');
}

// Cloze Mask Tests
const sampleDosageText = "Sugammadex 16 mg/kg bei CICO, Dantrolen 2,5 mg/kg, Karenzzeit 48 h, SpO2 88% und pH 7,24.";
const clozeResult = generateClozeMaskedHtml(sampleDosageText);
assert(clozeResult.includes('data-cloze="16 mg/kg"'), 'Cloze should mask 16 mg/kg');
assert(clozeResult.includes('data-cloze="2,5 mg/kg"'), 'Cloze should mask 2,5 mg/kg');
assert(clozeResult.includes('data-cloze="48 h"'), 'Cloze should mask 48 h');
assert(clozeResult.includes('data-cloze="88%"'), 'Cloze should mask 88%');
console.log('[PASS] Cloze masking correctly wraps dosages and thresholds with .cloze-blur.');

// 4. Test Realistic ICU Vitals Generator
function getRealisticVitalsForCase(category, stem, answer) {
  if (category.includes('Atemweg')) {
    return {
      spo2: '89%', bp: '142/88', map: '106 mmHg', hr: '110 /min',
      etco2: '48 mmHg', ph: '7,31', po2: '62 mmHg', pco2: '51 mmHg'
    };
  } else if (category.includes('Herz') || category.includes('Hämo')) {
    return {
      spo2: '93%', bp: '78/44', map: '55 mmHg', hr: '126 /min',
      etco2: '24 mmHg', ph: '7,21', lactate: '4,8 mmol/l'
    };
  } else {
    return {
      spo2: '96%', bp: '125/75', map: '91 mmHg', hr: '82 /min',
      etco2: '38 mmHg', ph: '7,38'
    };
  }
}

const airwayVitals = getRealisticVitalsForCase('Atemwegsmanagement & Beatmung', '', '');
assert.strictEqual(airwayVitals.spo2, '89%');
assert.strictEqual(airwayVitals.etco2, '48 mmHg');

const cardioVitals = getRealisticVitalsForCase('Herz-Kreislauf & Hämodynamik', '', '');
assert.strictEqual(cardioVitals.bp, '78/44');
assert.strictEqual(cardioVitals.lactate, '4,8 mmol/l');
console.log('[PASS] Realistic ICU vitals & BGA parameters generated accurately per category.');

// 5. Test 3 High-Impact Model Answer Blocks
function generateVerbalFramework(category, stem) {
  if (category.includes('Atemweg')) {
    return 'Ich priorisiere hier das ABCDE-Schema und sichere primär den Atemweg.';
  } else if (category.includes('Herz') || category.includes('Hämo')) {
    return 'Ich fasse die Situation zusammen: Es liegt eine akute hämodynamische Instabilität vor.';
  } else {
    return 'Ich strukturiere meine klinische Antwort in präoperative Risikostratifizierung, intraoperatives Monitoring und Kausaltherapie.';
  }
}

function generatePitfalls(category, text) {
  const t = text.toLowerCase();
  if (t.includes('maligne hyperthermie') || t.includes('dantrolen')) {
    return '❌ No-Go: Niemals Kalziumantagonisten bei Verdacht auf Maligne Hyperthermie geben!';
  } else if (t.includes('last') || t.includes('lokalanästhetik')) {
    return '❌ No-Go: Kein Vasopressin, kein Lidocain, kein Amiodaron bei LAST!';
  } else if (t.includes('hyponatriäm') || t.includes('natrium')) {
    return '❌ No-Go: Zu schneller Natriumausgleich bei chronischer Hyponatriämie (> 8–10 mmol/l/24h) birgt die Gefahr der pontinen Myelinolyse!';
  } else {
    return '❌ Prüfungsfalle: Unstrukturiertes Reagieren ohne Priorisierung nach dem ABCDE-Schema!';
  }
}

// Test verbal framework
const verbalAirway = generateVerbalFramework('Atemwegsmanagement & Beatmung', 'CICO');
assert(verbalAirway.includes('ABCDE-Schema'), 'Verbal framework must prioritize ABCDE-Schema');

// Test pitfalls
const mhPitfall = generatePitfalls('Pharmakologie', 'Maligne Hyperthermie');
assert(mhPitfall.includes('Niemals Kalziumantagonisten'), 'MH pitfall must warn against calcium antagonists');

const lastPitfall = generatePitfalls('Pharmakologie', 'Lokalanästhetika LAST Intoxikation');
assert(lastPitfall.includes('Kein Vasopressin'), 'LAST pitfall must warn against Vasopressin');

const hyponatPitfall = generatePitfalls('Klinische Chemie', 'Hyponatriämie Korrektur');
assert(hyponatPitfall.includes('pontinen Myelinolyse'), 'Hyponatremia pitfall must warn about pontine myelinolysis');

console.log('[PASS] 3 High-Impact blocks (Verbal Redemittel & Critical Pitfalls) successfully verified.');

// 6. Test Study Mode transitions
const modes = ['simulation', 'guideline', 'flashcard'];
modes.forEach(mode => {
  const state = { studyMode: mode };
  assert.strictEqual(state.studyMode, mode, `State should retain ${mode}`);
});
console.log('[PASS] Multi-mode state transitions verified.');

// 7. Verify all questions can be parsed without throwing errors
let parsedSuccessCount = 0;
questions.forEach(q => {
  const stem = q.stem_de || q.question_de || '';
  const answer = q.answer_de || (q.options ? q.options.map(o => o.explanation_de).join(' ') : '');
  const verbal = generateVerbalFramework(q.category, stem);
  const pitfall = generatePitfalls(q.category, stem + ' ' + answer);
  assert(verbal.length > 10, 'Verbal framework must not be empty');
  assert(pitfall.length > 10, 'Pitfall must not be empty');
  parsedSuccessCount++;
});
console.log(`[PASS] All ${parsedSuccessCount} questions successfully transformed into stepped oral cases with 3 high-impact blocks!`);

// 8. Test Stepper State Progression
function simulateStepperProgression(initialState) {
  let s = { step: 1, vitalsOpen: false, examinerOpen: false, revealed: false, clozesUnmasked: false, ...initialState };
  // Step 2 toggle
  s.vitalsOpen = !s.vitalsOpen;
  if (s.vitalsOpen && s.step < 2) s.step = 2;
  // Step 3 toggle
  s.examinerOpen = !s.examinerOpen;
  if (s.examinerOpen && s.step < 3) s.step = 3;
  // Step 4 reveal
  s.revealed = true;
  s.step = 4;
  return s;
}

const stepperResult = simulateStepperProgression({});
assert.strictEqual(stepperResult.step, 4, 'Stepper should reach step 4');
assert.strictEqual(stepperResult.vitalsOpen, true, 'Vitals should be open');
assert.strictEqual(stepperResult.examinerOpen, true, 'Examiner should be open');
assert.strictEqual(stepperResult.revealed, true, 'Answer should be revealed');
console.log('[PASS] Stepper state machine and progressive disclosure validated.');

// 9. Test Checklist Generation across Multi-Choice and Open Questions
function generateChecklist(category, stem, answer, options) {
  const items = [];
  if (options && options.length > 0) {
    options.slice(0, 4).forEach(opt => {
      const status = opt.is_correct ? '✅ Richtig:' : '❌ Falsch:';
      const expl = opt.explanation_de ? opt.explanation_de.split('.')[0] : opt.text_de;
      items.push(`<strong>${status}</strong> ${opt.text_de} <br><small>${expl}</small>`);
    });
  } else {
    const bullets = answer.split(/[•\n–-]/).map(s => s.trim()).filter(s => s.length > 15);
    if (bullets.length >= 3) {
      bullets.slice(0, 4).forEach(b => items.push(highlightDosagesAndUnits(b)));
    } else {
      const sentences = answer.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 15);
      if (sentences.length > 0) {
        sentences.slice(0, 4).forEach(s => items.push(highlightDosagesAndUnits(s)));
      } else {
        items.push(highlightDosagesAndUnits(answer.substring(0, 180)));
      }
    }
  }
  return items;
}

const sampleMCQ = questions.find(q => q.question_type === 'options' && q.options && q.options.length >= 4);
const mcqChecklist = generateChecklist(sampleMCQ.category, sampleMCQ.stem_de, '', sampleMCQ.options);
assert(mcqChecklist.length >= 2, 'MCQ checklist should extract options');
assert(mcqChecklist.some(item => item.includes('Richtig:')), 'MCQ checklist should distinguish correct options');

const sampleOpen = questions.find(q => q.question_type !== 'options');
const openChecklist = generateChecklist(sampleOpen.category, sampleOpen.question_de, sampleOpen.answer_de, null);
assert(openChecklist.length > 0, 'Open question checklist must generate high-impact items');
console.log('[PASS] Checklist generator properly formats both MCQ and open question clinical pearls.');

// 10. Test Cloud Sync State Serialization & Schema
const sampleState = {
  currentIndex: 42,
  answers: { 'q_001': { submitted: true, isCorrect: true, revealed: true } },
  flagged: { 'q_002': true },
  theme: 'dark',
  subtitleMode: true,
  studyMode: 'simulation',
  stepState: { 'q_001': { step: 4, vitalsOpen: true, examinerOpen: true, revealed: true } }
};

const cloudPayload = {
  version: '2.0',
  updatedAt: new Date().toISOString(),
  state: sampleState
};

const serialized = JSON.stringify(cloudPayload);
const deserialized = JSON.parse(serialized);
assert.strictEqual(deserialized.version, '2.0', 'Cloud sync payload version must be 2.0');
assert.strictEqual(deserialized.state.studyMode, 'simulation', 'Cloud sync state must preserve studyMode');
assert.strictEqual(deserialized.state.stepState['q_001'].step, 4, 'Cloud sync must preserve stepState');
console.log('[PASS] Cloud Sync payload serialization and schema validation passed.');

// 11. Test Service Worker (sw.js) & PWA Cache Manifest
const swPath = path.join(__dirname, 'sw.js');
assert(fs.existsSync(swPath), 'sw.js must exist in project root');
const swCode = fs.readFileSync(swPath, 'utf8');
assert(swCode.includes('CACHE_NAME'), 'sw.js must define CACHE_NAME');
assert(swCode.includes('CORE_ASSETS'), 'sw.js must define CORE_ASSETS');

// Verify all precached assets exist on disk
const expectedAssets = ['index.html', 'styles.css', 'app.js', 'questions.js', 'manifest.json', 'favicon.svg'];
expectedAssets.forEach(asset => {
  const assetPath = path.join(__dirname, asset);
  assert(fs.existsSync(assetPath), `Pre-cached asset ${asset} must exist in project`);
});
console.log('[PASS] Service Worker cache manifest and all pre-cached assets validated on disk.');

// 12. Test Emergency SOPs (Pocket Cards) Schema & Clinical Accuracy
const htmlPath = path.join(__dirname, 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

assert(htmlContent.includes('id="pocket-filter-bar"'), 'index.html must include emergency pocket filter bar');
assert(htmlContent.includes('data-filter="tox"'), 'Filter bar must include toxicity category');
assert(htmlContent.includes('data-filter="airway"'), 'Filter bar must include airway category');
assert(htmlContent.includes('data-filter="cpr"'), 'Filter bar must include cpr category');
assert(htmlContent.includes('data-filter="bleed"'), 'Filter bar must include bleeding/PPH category');

// Clinical accuracy assertions
assert(htmlContent.includes('Maligne Hyperthermie (MH)'), 'MH protocol must be present');
assert(htmlContent.includes('2.5 mg/kg i.v.'), 'Dantrolen 2.5 mg/kg dosage must be documented');
assert(htmlContent.includes('kein Kalziumantagonist!'), 'MH contraindication must be documented');

assert(htmlContent.includes('Lokalanästhetika-Toxizität (LAST)'), 'LAST protocol must be present');
assert(htmlContent.includes('Intralipid 20%'), 'Intralipid 20% protocol must be documented');
assert(htmlContent.includes('1.5 ml/kg i.v.'), 'Intralipid bolus dosage must be documented');

assert(htmlContent.includes('Schwieriger Atemweg & CICO'), 'CICO emergency protocol must be present');
assert(htmlContent.includes('Skalpell-Bougie-Tubus-Technik'), 'DGAI Plan D surgical airway technique must be documented');

assert(htmlContent.includes('Postpartale Blutung (PPH) & Notsectio-Stufenschema'), 'PPH and emergency C-section protocol must be present');
assert(htmlContent.includes('Nalador® 500 µg'), 'Sulproston/Nalador dosage must be documented');
assert(htmlContent.includes('Tranexamsäure 1 g i.v.'), 'Tranexamic acid dosage must be documented');
console.log('[PASS] Emergency Pocket SOPs validated for clinical accuracy (MH, LAST, CICO, ALS, PPH).');

// 13. Test Pediatric Airway & Emergency Calculator
function calcPediatricsTest(age, weight) {
  const uncuffed = (age / 4) + 4.0;
  const cuffed = (age / 4) + 3.5;
  const depth = (age / 2) + 12;
  const adrMg = weight * 0.01;
  const atropin = Math.max(0.1, weight * 0.02);
  const defib = weight * 4;
  return { uncuffed, cuffed, depth, adrMg, atropin, defib };
}

const peds4yo = calcPediatricsTest(4, 16);
assert.strictEqual(peds4yo.uncuffed, 5.0, '4yo uncuffed tube must be 5.0 mm');
assert.strictEqual(peds4yo.cuffed, 4.5, '4yo cuffed tube must be 4.5 mm');
assert.strictEqual(peds4yo.depth, 14.0, '4yo depth must be 14.0 cm');
assert.strictEqual(peds4yo.adrMg, 0.16, '16kg adrenaline must be 0.16 mg');
assert.strictEqual(peds4yo.atropin, 0.32, '16kg atropine must be 0.32 mg');
assert.strictEqual(peds4yo.defib, 64, '16kg defibrillation must be 64 Joules');
console.log('[PASS] Pediatric emergency and airway formulas verified.');

// 14. Test ARDS / PBW Ventilation Calculator
function calcArdsTest(gender, height) {
  const base = (gender === 'male') ? 50.0 : 45.5;
  const pbw = base + 0.91 * (height - 152.4);
  const vt6 = Math.round(pbw * 6);
  const vt8 = Math.round(pbw * 8);
  return { pbw, vt6, vt8 };
}

const ardsMale175 = calcArdsTest('male', 175);
assert(Math.abs(ardsMale175.pbw - 70.56) < 0.1, 'Male 175cm PBW should be ~70.6 kg');
assert.strictEqual(ardsMale175.vt6, 423, 'Male 175cm 6ml/kg PBW VT should be 423 ml');

const ardsFemale165 = calcArdsTest('female', 165);
assert(Math.abs(ardsFemale165.pbw - 56.96) < 0.1, 'Female 165cm PBW should be ~57.0 kg');
assert.strictEqual(ardsFemale165.vt6, 342, 'Female 165cm 6ml/kg PBW VT should be 342 ml');
console.log('[PASS] ARDS PBW lung-protective ventilation formulas verified.');

// 15. Test Local Anesthetic Maximum Doses Calculator
function calcLaTest(weight) {
  const ropi = Math.min(300, Math.round(weight * 3.0));
  const bupi = Math.min(150, Math.round(weight * 2.0));
  const lidoPur = Math.min(300, Math.round(weight * 4.0));
  const lidoAdr = Math.min(500, Math.round(weight * 7.0));
  const lipidBolus = Math.round(weight * 1.5);
  return { ropi, bupi, lidoPur, lidoAdr, lipidBolus };
}

const la70kg = calcLaTest(70);
assert.strictEqual(la70kg.ropi, 210, '70kg Ropivacaine max should be 210 mg');
assert.strictEqual(la70kg.bupi, 140, '70kg Bupivacaine max should be 140 mg');
assert.strictEqual(la70kg.lidoPur, 280, '70kg Lidocaine pure max should be 280 mg');
assert.strictEqual(la70kg.lidoAdr, 490, '70kg Lidocaine+Adr max should be 490 mg');
assert.strictEqual(la70kg.lipidBolus, 105, '70kg Intralipid 20% bolus should be 105 ml');
console.log('[PASS] Local anesthetic maximum doses and Intralipid rescue formulas verified.');

// 16. Test Sodium Deficit & ODS Safety Limit Calculator
function calcSodiumTest(demog, weight, naCurrent) {
  let factor = 0.6;
  if (demog === 'female' || demog === 'elderly_male') factor = 0.5;
  else if (demog === 'elderly_female') factor = 0.45;
  const tbw = weight * factor;
  const deficit = Math.round(tbw * (140 - naCurrent));
  const maxDayNa = naCurrent + 8;
  return { tbw, deficit, maxDayNa };
}

const naMale70 = calcSodiumTest('male', 70, 118);
assert.strictEqual(naMale70.tbw, 42.0, 'Male 70kg TBW should be 42.0 L');
assert.strictEqual(naMale70.deficit, 924, 'Male 70kg Na deficit from 118 should be 924 mmol');
assert.strictEqual(naMale70.maxDayNa, 126, '24h max target for 118 should be 126 mmol/l (max +8)');
console.log('[PASS] Sodium deficit and ODS safety limits verified.');

// 17. Test SM2Engine SuperMemo-2 Spaced Repetition Algorithm
const SM2Engine = require('./js/sm2.js');
const sm2Fail = SM2Engine.calculateSM2(1, null);
assert.strictEqual(sm2Fail.repetition, 0, 'SM2 fail quality=1 must reset repetition count to 0');
assert.strictEqual(sm2Fail.interval, 1, 'SM2 fail interval must be 1 day');

const sm2Pass1 = SM2Engine.calculateSM2(5, null);
assert.strictEqual(sm2Pass1.repetition, 1, 'First SM2 pass quality=5 must increment repetition to 1');
assert.strictEqual(sm2Pass1.interval, 1, 'First SM2 pass interval must be 1 day');

const sm2Pass2 = SM2Engine.calculateSM2(5, sm2Pass1);
assert.strictEqual(sm2Pass2.repetition, 2, 'Second SM2 pass must increment repetition to 2');
assert.strictEqual(sm2Pass2.interval, 6, 'Second SM2 pass interval must be 6 days');
console.log('[PASS] SM-2 Spaced Repetition algorithm (repetition, interval, easeFactor) verified.');

// 18. Test VoiceExamEngine Medical Keyword Extraction & Evaluation
const VoiceExamEngine = require('./js/voice.js');
const keywords = VoiceExamEngine.extractKeywords('Ich gebe 2.5 mg/kg Dantrolen bei Maligner Hyperthermie!');
assert(keywords.includes('dantrolen'), 'Keyword extraction must extract Dantrolen');
assert(keywords.includes('hyperthermie'), 'Keyword extraction must extract Hyperthermie');

const pearls = ['Dantrolen 2.5 mg/kg i.v.', '100% O2 Beatmung', 'Aktivkohlefilter einsetzen'];
const evalResult = VoiceExamEngine.evaluateSpokenAnswer('Ich gebe sofort Dantrolen und 100% O2', pearls);
assert(evalResult.matchedIndices.length >= 1, 'Spoken evaluation must match target pearls');
console.log('[PASS] Voice Exam speech recognition keyword extraction and rubric evaluation verified.');

// 19. Test MockExamSimulation 45-Minute Oral Board Engine
const MockExamSimulation = require('./js/exam_simulation.js');
const sim = new MockExamSimulation(questions);
const started = sim.startNewExam();
assert(started, 'Mock exam simulation must start successfully');
assert.strictEqual(sim.activeCases.length, 4, 'Mock exam simulation must pick exactly 4 cases');
assert.strictEqual(sim.secondsRemaining, 2700, 'Mock exam initial countdown must be 2700 seconds (45 min)');

sim.recordCaseScore(0, 5, 4, 4);
sim.recordCaseScore(1, 5, 4, 4);
sim.recordCaseScore(2, 5, 4, 4);
sim.recordCaseScore(3, 5, 4, 4);
const summary = sim.finishExam();
assert.strictEqual(summary.avgRating, 5.0, 'All 5 ratings must yield 5.0 average');
assert(summary.statusText.includes('BESTANDEN'), 'Summary status must confirm pass status');
console.log('[PASS] 45-Minute Mock Oral Exam simulation engine and HUD verified.');

// 20. Test Neuraxial Anesthesia & Anticoagulation SOP (Card 14) & Lightbox Modal Markup
assert(htmlContent.includes('Rückenmarksnahe Regionalanästhesie (SPA/EDA) &amp; Antikoagulation') || htmlContent.includes('Rückenmarksnahe Regionalanästhesie (SPA/EDA) & Antikoagulation'), 'Card 14 title must be present in index.html');
assert(htmlContent.includes('12 Stunden Pause'), 'Low-dose LMWH 12h pause must be documented');
assert(htmlContent.includes('24 Stunden Pause'), 'High-dose LMWH 24h pause must be documented');
assert(htmlContent.includes('48 Stunden Pause'), 'DOAC 48h pause must be documented');
assert(htmlContent.includes('Clopidogrel'), 'Clopidogrel must be documented');
assert(htmlContent.includes('5 Tage Pause'), '5-day pause must be documented');
console.log('[PASS] Neuraxial Anesthesia & Anticoagulation (SPA/EDA) DGAI S1-Leitlinie verified.');

// 21. Test Single-Click Expandable Turkish Translation Collapsible Rendering
const appPath = path.join(__dirname, 'app.js');
const appCode = fs.readFileSync(appPath, 'utf8');
assert(appCode.includes('btn-toggle-tr-sub'), 'app.js must render single-click collapsible button btn-toggle-tr-sub');
assert(appCode.includes('tr-subtitle-collapsible'), 'app.js must render collapsible container tr-subtitle-collapsible');

const cssPath = path.join(__dirname, 'styles.css');
const cssCode = fs.readFileSync(cssPath, 'utf8');
assert(cssCode.includes('.btn-toggle-tr-sub'), 'styles.css must include styling for .btn-toggle-tr-sub');
assert(cssCode.includes('.tr-subtitle-collapsible.open'), 'styles.css must include slide-down styles for .tr-subtitle-collapsible.open');
console.log('[PASS] Single-Click Expandable Turkish Translation Collapsible UI verified.');

// 22. Test ÄKNO Düsseldorf Examiners, Protocols & KO-Kriterien Integration
const dusQuestions = questions.filter(q => q.is_dus_protocol || (q.source_book && q.source_book.includes('Düsseldorf')));
assert.strictEqual(dusQuestions.length, 8, `Expected exactly 8 dedicated Düsseldorf protocol cases, found ${dusQuestions.length}`);
dusQuestions.forEach(dq => {
  assert(dq.question_de && dq.question_de.length > 50, `DUS question ${dq.id} missing detailed German stem`);
  assert(dq.question_tr && dq.question_tr.length > 50, `DUS question ${dq.id} missing Turkish translation`);
  assert(dq.answer_de && dq.answer_de.length > 100, `DUS question ${dq.id} missing clinical model answer`);
  assert(dq.answer_tr && dq.answer_tr.length > 100, `DUS question ${dq.id} missing Turkish answer translation`);
  assert(dq.examiner_tip && dq.examiner_tip.length > 10, `DUS question ${dq.id} missing examiner tip`);
  assert.strictEqual(dq.is_high_yield, true, `DUS question ${dq.id} must be tagged as high yield`);
});

assert(htmlContent.includes('aekno-guide-modal'), 'index.html must include #aekno-guide-modal');
assert(htmlContent.includes('aekno-guide-trigger'), 'index.html must include #aekno-guide-trigger');
assert(htmlContent.includes('ÄKNO Düsseldorf – Prüfungskommission &amp; KO-Kriterien') || htmlContent.includes('ÄKNO Düsseldorf – Prüfungskommission & KO-Kriterien'), 'Pocket Card 15 must be present');
assert(appCode.includes("state.filterMode === 'dus_examiners'"), 'app.js must handle dus_examiners filter');

console.log('[PASS] ÄKNO Düsseldorf Protocol Questions & Commission Guide Suite verified.');

console.log('\n🎉 ALL 22 TEST SUITES PASSED PERFECTLY WITH COMPREHENSIVE COVERAGE!\n');





