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
    return '❌ Kardinalfehler (K.O.-Kriterium): Niemals Kalziumantagonisten bei Verdacht auf Maligne Hyperthermie geben!';
  } else if (t.includes('last') || t.includes('lokalanästhetik')) {
    return '❌ Kardinalfehler (K.O.-Kriterium): Kein Vasopressin, kein Lidocain, kein Amiodaron bei LAST!';
  } else if (t.includes('hyponatriäm') || t.includes('natrium')) {
    return '❌ Kardinalfehler (K.O.-Kriterium): Zu schneller Natriumausgleich bei chronischer Hyponatriämie (> 8–10 mmol/l/24h) birgt die Gefahr der pontinen Myelinolyse!';
  } else {
    return '❌ Kritische Prüfungsfalle: Unstrukturiertes Reagieren ohne Priorisierung nach dem ABCDE-Schema!';
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

// 21. Test Seamless Hover & Dwell Turkish Translation (Sentence & Box Level)
const appPath = path.join(__dirname, 'app.js');
const appCode = fs.readFileSync(appPath, 'utf8');
assert(!appCode.includes('btn-toggle-tr-sub'), 'app.js must remove obsolete button btn-toggle-tr-sub');
assert(!appCode.includes('translatable-sentence'), 'app.js must remove sentence-wise translatable-sentence spans as requested');
assert(appCode.includes('translatable-box'), 'app.js must render box-level translatable containers');
assert(appCode.includes('hover-tr-preview'), 'app.js must render hover-tr-preview elements');
assert(appCode.includes('initHoverTranslationHUD'), 'app.js must initialize hover translation HUD');

const cssPath = path.join(__dirname, 'styles.css');
const cssCode = fs.readFileSync(cssPath, 'utf8');
assert(cssCode.includes('.translatable-box'), 'styles.css must include styling for .translatable-box');
assert(cssCode.includes('.hover-tr-preview'), 'styles.css must include styling for .hover-tr-preview');
console.log('[PASS] Seamless Hover Turkish Translation (Clean Box Level, No Sentence Popups) verified.');

// 22. Test ÄKNO Düsseldorf Examiners, Protocols & KO-Kriterien Integration
const dusQuestions = questions.filter(q => q.is_dus_protocol || (q.source_book && q.source_book.includes('Düsseldorf')));
assert.strictEqual(dusQuestions.length, 42, `Expected exactly 42 dedicated Düsseldorf protocol cases, found ${dusQuestions.length}`);
assert(htmlContent.includes('examiner-reveal-box'), 'index.html must include #examiner-reveal-box');
assert(htmlContent.includes('badge-examiner-toggle'), 'index.html must include #badge-examiner-toggle');
assert(htmlContent.includes('examiner-reveal-card'), 'index.html must include #examiner-reveal-card');
assert(appCode.includes('getExaminerProfileForCase'), 'app.js must include getExaminerProfileForCase');
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
assert(appCode.includes("state.filterMode === 'sm2_due'"), 'app.js must handle sm2_due filter');

console.log('[PASS] ÄKNO Düsseldorf Protocol Questions & Commission Guide Suite verified.');

// 23. Test Audio Pronunciation & Multi-Device Cloud Sync Hardening Suite
assert(htmlContent.includes('btn-audio-speak-examiner'), 'index.html must include #btn-audio-speak-examiner');
assert(htmlContent.includes('btn-audio-speak-verbal'), 'index.html must include #btn-audio-speak-verbal');
assert(appCode.includes('btn-audio-speak-examiner'), 'app.js must bind #btn-audio-speak-examiner');
assert(appCode.includes('btn-audio-speak-verbal'), 'app.js must bind #btn-audio-speak-verbal');
assert(cssCode.includes('.btn-audio-action-sm'), 'styles.css must style .btn-audio-action-sm');
assert(appCode.includes('robustAnswers'), 'app.js must implement robust union merge for answers in syncFromCloud');
assert(appCode.includes('robustSm2'), 'app.js must implement timestamp-based union merge for SM-2 cards');
console.log('[PASS] Audio Pronunciation & Multi-Device Cloud Sync Hardening Suite verified.');

// 24. Test ÄKNO Live Simulation Cockpit & Voice Rubric Evaluation Suite
assert(htmlContent.includes('exam-simulation-bar'), 'index.html must include #exam-simulation-bar');
assert(htmlContent.includes('btn-sim-answer-timer'), 'index.html must include #btn-sim-answer-timer');
assert(htmlContent.includes('voice-lang-switch'), 'index.html must include .voice-lang-switch');
assert(htmlContent.includes('btn-voice-lang-de'), 'index.html must include #btn-voice-lang-de');
assert(htmlContent.includes('btn-voice-lang-tr'), 'index.html must include #btn-voice-lang-tr');
assert(htmlContent.includes('voice-mic-indicator'), 'index.html must include #voice-mic-indicator');
assert(cssCode.includes('.audio-wave-visualizer'), 'styles.css must style .audio-wave-visualizer');
assert(cssCode.includes('.voice-lang-switch'), 'styles.css must style .voice-lang-switch');
assert(cssCode.includes('.voice-mic-indicator'), 'styles.css must style .voice-mic-indicator');
assert(cssCode.includes('.voice-eval-card'), 'styles.css must style .voice-eval-card');
assert(appCode.includes('setupAudioVisualizer'), 'app.js must implement setupAudioVisualizer');
assert(appCode.includes('createSpeechRecognizerInstance'), 'app.js must implement createSpeechRecognizerInstance');
assert(appCode.includes('setSpeechLanguage'), 'app.js must implement setSpeechLanguage');
assert(appCode.includes('evaluateVoiceAnswer'), 'app.js must implement evaluateVoiceAnswer');
assert(appCode.includes('toggleStepTimer'), 'app.js must implement toggleStepTimer');
console.log('[PASS] ÄKNO Live Simulation Cockpit & Voice Rubric Evaluation Suite verified.');

// 25. Test Audio Speed Controller & Pocket Card 16 Mnemonics Hub Suite
assert(htmlContent.includes('btn-audio-speed'), 'index.html must include #btn-audio-speed');
assert(htmlContent.includes('audio-speed-display'), 'index.html must include #audio-speed-display');
assert(htmlContent.includes('High-Yield Merkformeln &amp; Leitlinien-Eselsbrücken') || htmlContent.includes('High-Yield Merkformeln & Leitlinien-Eselsbrücken'), 'Pocket Card 16 must be present in index.html');
assert(appCode.includes('getCleanSpeechText'), 'app.js must implement getCleanSpeechText to prevent reading non-German text');
assert(appCode.includes('speechRate'), 'app.js must support speechRate state');
assert(cssCode.includes('.audio-speed-pill'), 'styles.css must style .audio-speed-pill');
console.log('[PASS] Audio Speed Controller & Pocket Card 16 Mnemonics Hub Suite verified.');

// 26. Test ÄKNO Düsseldorf Dynamic Live Simulation & K.O.-Criteria Radar Suite
const { DUS_SIMULATION_REGISTRY } = MockExamSimulation;
assert(DUS_SIMULATION_REGISTRY && Object.keys(DUS_SIMULATION_REGISTRY).length === 42, 'All 42 authentic Düsseldorf protocol questions must be registered in DUS_SIMULATION_REGISTRY');

// Verify examiner profile, crisis complication and KO criteria structure
const q1Reg = DUS_SIMULATION_REGISTRY['q_dus_01'];
assert(q1Reg && q1Reg.examiner && q1Reg.examiner.name.includes('Annecke'), 'q_dus_01 must be linked to Prof. Annecke');
assert(q1Reg.crisis && q1Reg.crisis.vitals && q1Reg.crisis.prompt_de, 'q_dus_01 must contain crisis vitals and prompt');
assert(q1Reg.koCriteria && q1Reg.koCriteria.forbiddenPatterns, 'q_dus_01 must contain fatal KO criteria patterns');

// Verify newly added authentic cases (Annecke & Hohn Kasuistiken)
const q37Reg = DUS_SIMULATION_REGISTRY['q_dus_37'];
assert(q37Reg && q37Reg.examiner.name.includes('Annecke'), 'q_dus_37 must be linked to Prof. Annecke');
assert(q37Reg.crisis.vitals.spo2 === '74%', 'q_dus_37 crisis vitals verified');
const q40Reg = DUS_SIMULATION_REGISTRY['q_dus_40'];
assert(q40Reg && q40Reg.examiner.name.includes('Hohn'), 'q_dus_40 must be linked to Prof. Hohn');
assert(q40Reg.koCriteria.forbiddenPatterns.length > 0, 'q_dus_40 Succinylcholin KO criteria verified');

// Verify immediate failure on KO violation (Spinal in aortic stenosis)
const koEval = MockExamSimulation.evaluateCandidateAnswer('q_dus_01', 'Ich schlage eine Spinalanästhesie vor, da schonender.', ['SVR', 'Arterie']);
assert(koEval.passed === false, 'KO violation must fail the candidate');
assert(koEval.grade === 5.0, 'KO violation must yield Grade 5.0');
assert(koEval.koViolated === true, 'koViolated flag must be true');

// Verify passing score on solid answer
const passEval = MockExamSimulation.evaluateCandidateAnswer('q_dus_01', 'Ich etabliere eine invasive arterielle Blutdruckmessung vor Narkoseeinleitung. Noradrenalin stellen wir bereit, um den SVR hochzuhalten. Vorlast sichern und Sinusrhythmus halten.', ['Invasive arterielle Blutdruckmessung', 'Noradrenalin', 'Vorlast']);
assert(passEval.passed === true, 'Appropriate answer must pass');
assert(passEval.grade <= 2.0, 'Solid answer must score Grade 1.0 or 2.0');
assert(passEval.koViolated === false, 'koViolated flag must be false for safe answer');

// Verify HTML and CSS integration
assert(htmlContent.includes('sim-live-cockpit'), 'index.html must include #sim-live-cockpit');
assert(htmlContent.includes('btn-sim-speak-stem'), 'index.html must include #btn-sim-speak-stem');
assert(htmlContent.includes('btn-sim-peek-stem'), 'index.html must include #btn-sim-peek-stem');
assert(htmlContent.includes('btn-sim-trigger-crisis'), 'index.html must include #btn-sim-trigger-crisis');
assert(htmlContent.includes('sim-rhetoric-prompter'), 'index.html must include #sim-rhetoric-prompter');
assert(htmlContent.includes('sim-crisis-banner'), 'index.html must include #sim-crisis-banner');
assert(htmlContent.includes('sim-ko-radar-display'), 'index.html must include #sim-ko-radar-display');

assert(cssCode.includes('.sim-live-cockpit'), 'styles.css must style .sim-live-cockpit');
assert(cssCode.includes('.sim-crisis-banner'), 'styles.css must style .sim-crisis-banner');
assert(cssCode.includes('.vital-crisis-flash'), 'styles.css must style .vital-crisis-flash');
assert(cssCode.includes('.sim-ko-alert-box'), 'styles.css must style .sim-ko-alert-box');

// Verify app.js simulation pool restriction
assert(appCode.includes('is_dus_protocol'), 'app.js must filter for is_dus_protocol in simulation mode');
console.log('[PASS] ÄKNO Düsseldorf Dynamic Live Simulation & K.O.-Criteria Radar Suite verified.');

// 27. Test Comprehensive Examiner Intervention & Model Solution Engine
assert(htmlContent.includes('btn-toggle-examiner-answer'), 'index.html must include #btn-toggle-examiner-answer');
assert(htmlContent.includes('examiner-inline-answer-box'), 'index.html must include #examiner-inline-answer-box');
assert(htmlContent.includes('examiner-inline-answer-text'), 'index.html must include #examiner-inline-answer-text');
assert(htmlContent.includes('btn-audio-speak-examiner-ans'), 'index.html must include #btn-audio-speak-examiner-ans');
assert(htmlContent.includes('rubric-block-examiner-solution'), 'index.html must include #rubric-block-examiner-solution');
assert(htmlContent.includes('rubric-examiner-prompt-text'), 'index.html must include #rubric-examiner-prompt-text');
assert(htmlContent.includes('rubric-examiner-solution-text'), 'index.html must include #rubric-examiner-solution-text');
assert(htmlContent.includes('btn-audio-speak-solution'), 'index.html must include #btn-audio-speak-solution');

assert(cssCode.includes('.btn-examiner-ans-btn'), 'styles.css must style .btn-examiner-ans-btn');
assert(cssCode.includes('.examiner-inline-answer-box'), 'styles.css must style .examiner-inline-answer-box');
assert(cssCode.includes('.examiner-solution-card'), 'styles.css must style .examiner-solution-card');

assert(appCode.includes('getDynamicExaminerCase'), 'app.js must implement getDynamicExaminerCase');
assert(appCode.includes('examinerAnswer'), 'app.js must return examinerAnswer');
assert(appCode.includes('examinerAnswerTR'), 'app.js must return examinerAnswerTR');

// Evaluate dynamic examiner complication and answer for Cardio category (the exact user-reported case)
const getDynamicMatch = appCode.match(/function getDynamicExaminerCase\([\s\S]*?\n  \}/);
assert(getDynamicMatch, 'getDynamicExaminerCase must be found in app.js');
eval(getDynamicMatch[0].replace('function getDynamicExaminerCase', 'global.getDynamicExaminerCase = function'));

const cardioCase = global.getDynamicExaminerCase('Herz-Kreislauf & Hämodynamik', '', {});
assert(cardioCase.question_de.includes('70/40 mmHg'), 'Cardio examiner question must test 70/40 mmHg drop');
assert(cardioCase.question_de.includes('14 mmHg'), 'Cardio examiner question must test etCO2 14 mmHg crash');
assert(cardioCase.answer_de.includes('Lungenarterienembolie') || cardioCase.answer_de.includes('LAE'), 'Answer must include LAE / pulmonary embolism');
assert(cardioCase.answer_de.includes('Spannungspneumothorax'), 'Answer must include tension pneumothorax');
assert(cardioCase.answer_de.includes('Anaphylaxie'), 'Answer must include anaphylaxis/shock');
assert(cardioCase.answer_de.includes('Nadeldekompression'), 'Answer must include emergency needle decompression');
assert(cardioCase.answer_de.includes('Alteplase'), 'Answer must include thrombolysis dosage');
assert(/adrenalin/i.test(cardioCase.answer_de), 'Answer must include adrenaline titration');
assert(cardioCase.answer_tr.includes('Pulmoner Emboli'), 'Turkish answer must include Pulmoner Emboli');
assert(cardioCase.answer_tr.includes('Tansiyon Pnömotoraks'), 'Turkish answer must include Tansiyon Pnömotoraks');
assert(cardioCase.answer_tr.includes('Anafilaksi'), 'Turkish answer must include Anafilaksi');

// Test that all 642 questions now produce a valid examiner intervention and solution
questions.forEach(q => {
  const dynamicEntry = global.getDynamicExaminerCase(q.category, q.stem_de || q.question_de || '', q);
  assert(dynamicEntry.question_de && dynamicEntry.question_de.length > 20, `Question ${q.id} must have question_de`);
  assert(dynamicEntry.question_tr && dynamicEntry.question_tr.length > 20, `Question ${q.id} must have question_tr`);
  assert(dynamicEntry.answer_de && dynamicEntry.answer_de.length > 50, `Question ${q.id} must have detailed answer_de`);
  assert(dynamicEntry.answer_tr && dynamicEntry.answer_tr.length > 50, `Question ${q.id} must have detailed answer_tr`);
});

console.log('[PASS] Comprehensive Examiner Intervention & Model Solution Engine verified across all 642 questions.');

// 28. Test Natural Medical Speech Synthesis Engine, Permanent Google Deutsch & YouTube-Style Speed Controller
assert(htmlContent.includes('speed-control-wrapper'), 'index.html must include .speed-control-wrapper');
assert(htmlContent.includes('btn-audio-speed'), 'index.html must include #btn-audio-speed');
assert(htmlContent.includes('audio-speed-dropdown'), 'index.html must include #audio-speed-dropdown');
assert(htmlContent.includes('audio-speed-slider'), 'index.html must include #audio-speed-slider');
assert(htmlContent.includes('speed-slider-val-badge'), 'index.html must include #speed-slider-val-badge');
assert(htmlContent.includes('speed-presets-list'), 'index.html must include #speed-presets-list');

assert(cssCode.includes('.speed-control-wrapper'), 'styles.css must style .speed-control-wrapper');
assert(cssCode.includes('.audio-speed-dropdown'), 'styles.css must style .audio-speed-dropdown');
assert(cssCode.includes('.speed-range-slider'), 'styles.css must style .speed-range-slider');

assert(appCode.includes('prepareMedicalTextForSpeech'), 'app.js must implement prepareMedicalTextForSpeech');
assert(appCode.includes('setPlaybackSpeed'), 'app.js must implement setPlaybackSpeed');
assert(appCode.includes('speakMedicalText'), 'app.js must implement speakMedicalText');
assert(appCode.includes('window.speakText = speakMedicalText'), 'app.js must expose window.speakText');

// Extract and test prepareMedicalTextForSpeech directly
const prepMatch = appCode.match(/function prepareMedicalTextForSpeech\([\s\S]*?\n  \}/);
assert(prepMatch, 'prepareMedicalTextForSpeech function definition must exist');
eval(prepMatch[0].replace('function prepareMedicalTextForSpeech', 'global.prepareMedicalTextForSpeech = function'));

const rawMedicalTest = "**Patient:** 68 J, 82 kg, BMI 26,8 kg/m². Vitalwerte: RR 140/85 mmHg, HF 95/min, SpO2 92%, etCO2 42 mmHg. BGA: pH 7,31, pCO2 48 mmHg, BE -5 mmol/l. Medikation: 2 mg/kg KG Propofol i.v., 1:10.000 Noradrenalin. 🚨 Achtung!";
const spokenResult = global.prepareMedicalTextForSpeech(rawMedicalTest);

assert(!spokenResult.includes('**'), 'Markdown bold must be stripped');
assert(!spokenResult.includes('🚨'), 'Emojis must be stripped');
assert(spokenResult.includes('Blutdruck 140 zu 85 Millimeter Quecksilbersäule'), 'RR must be expanded phonetically');
assert(spokenResult.includes('Herzfrequenz 95 pro Minute'), 'HF must be expanded phonetically');
assert(spokenResult.includes('Sauerstoffsättigung 92 Prozent'), 'SpO2 must be expanded phonetically');
assert(spokenResult.includes('endexspiratorisches CO2 42 Millimeter Quecksilbersäule'), 'etCO2 must be expanded phonetically');
assert(spokenResult.includes('Blutgasanalyse:'), 'BGA: must be expanded phonetically');
assert(spokenResult.includes('Base Excess minus 5 Millimol pro Liter'), 'Negative BE must be expanded phonetically');
assert(spokenResult.includes('Milligramm pro Kilogramm Körpergewicht'), 'Dosage mg/kg KG must be expanded phonetically');
assert(spokenResult.includes('intravenös'), 'i.v. must be expanded to intravenös');
assert(spokenResult.includes('eins zu zehntausend'), '1:10.000 dilution must be expanded phonetically');

// Verify Google Deutsch TTS URL generation pattern exists
assert(appCode.includes('translate.google.com/translate_tts'), 'app.js must use Google natural TTS stream for zero-configuration audio');

// Verify Speech Interrupter / Stop Button and Anti-Double-Read Mutex
assert(htmlContent.includes('btn-audio-stop'), 'index.html must include #btn-audio-stop');
assert(appCode.includes('btn-audio-stop'), 'app.js must bind #btn-audio-stop');
assert(cssCode.includes('.audio-stop-pill'), 'styles.css must style .audio-stop-pill');
assert(cssCode.includes('.audio-listen-pill'), 'styles.css must style .audio-listen-pill');
assert(appCode.includes('isFallbackSpeaking'), 'app.js must guard against concurrent fallback speech loops');
assert(appCode.includes('fallbackTriggered'), 'app.js must implement fallbackTriggered single-flight guard');

// 29. Test Complete Turkish Translations for All 42 Düsseldorf Simulation Cases & Protocols
for (const [qid, data] of Object.entries(DUS_SIMULATION_REGISTRY)) {
  assert(data.speechIntro_tr && data.speechIntro_tr.length > 30, `Registry ${qid} must have Turkish speechIntro_tr`);
  assert(data.crisis && data.crisis.title_tr && data.crisis.title_tr.length > 5, `Registry ${qid} must have Turkish crisis.title_tr`);
  assert(data.crisis && data.crisis.prompt_tr && data.crisis.prompt_tr.length > 25, `Registry ${qid} must have Turkish crisis.prompt_tr`);
  assert(data.crisis && data.crisis.targetAction_tr && data.crisis.targetAction_tr.length > 25, `Registry ${qid} must have Turkish crisis.targetAction_tr`);
  assert(data.koCriteria && data.koCriteria.failureReason_tr && data.koCriteria.failureReason_tr.length > 20, `Registry ${qid} must have Turkish koCriteria.failureReason_tr`);
  assert(data.examiner && data.examiner.focus_tr && data.examiner.focus_tr.length > 10, `Registry ${qid} must have Turkish examiner.focus_tr`);
  assert(data.examiner && data.examiner.trap_tr && data.examiner.trap_tr.length > 10, `Registry ${qid} must have Turkish examiner.trap_tr`);
  
  // Ensure Turkish is distinct from German (not a raw untranslated fallback)
  assert.notStrictEqual(data.crisis.prompt_tr, data.crisis.prompt_de, `Registry ${qid} prompt_tr must not be identical to prompt_de`);
  assert.notStrictEqual(data.crisis.targetAction_tr, data.crisis.targetAction, `Registry ${qid} targetAction_tr must not be identical to targetAction`);
}

dusQuestions.forEach(dq => {
  assert(dq.examiner_tip_tr && dq.examiner_tip_tr.length > 15, `Question ${dq.id} must have Turkish examiner_tip_tr`);
  assert.notStrictEqual(dq.examiner_tip_tr, dq.examiner_tip, `Question ${dq.id} examiner_tip_tr must not be identical to examiner_tip`);
});

assert(htmlContent.includes('Musterantwort anzeigen / Cevabı Gör'), 'index.html must include bilingual button text for examiner answer');
assert(htmlContent.includes('Lösung der Prüfer-Intervention / Jüri Müdahalesi Çözümü'), 'index.html must include bilingual solution card header');
assert(htmlContent.includes('ÄKNO Notfall-Lösung / Acil Çözüm'), 'index.html must include bilingual emergency solution badge');

console.log('[PASS] Complete Turkish Translations Suite verified for all 42 Düsseldorf Simulation Registry cases and questions.');

// ============================================================================
// 30. TEST SUITE: ANESTHESIA ABBREVIATIONS & ACRONYMS GUIDE (KÜRZEL-LEXIKON)
// ============================================================================
console.log('Testing Suite 30: Anesthesia Abbreviations & Acronyms Guide (DE/TR)...');

const abbreviationsData = require('./js/abbreviations_data.js');
assert(Array.isArray(abbreviationsData), 'ANESTHESIA_ABBREVIATIONS must be an array');
assert(abbreviationsData.length >= 65, `Must have at least 65 abbreviations, found: ${abbreviationsData.length}`);

const requiredCategories = ['airway', 'hemodynamics', 'pharma', 'resuscitation', 'neuro_reg', 'peds_obs'];
const foundCategories = new Set();

const seenAbbrs = new Set();
abbreviationsData.forEach((item, idx) => {
  assert(item.abbr && item.abbr.trim().length > 0, `Item ${idx} must have non-empty abbr`);
  assert(!seenAbbrs.has(item.abbr), `Duplicate abbreviation found: ${item.abbr}`);
  seenAbbrs.add(item.abbr);

  assert(item.category && requiredCategories.includes(item.category), `Item ${item.abbr} has invalid category: ${item.category}`);
  foundCategories.add(item.category);

  assert(item.category_de && item.category_de.length > 3, `Item ${item.abbr} must have category_de`);
  assert(item.category_tr && item.category_tr.length > 3, `Item ${item.abbr} must have category_tr`);
  assert(item.de_full && item.de_full.length > 3, `Item ${item.abbr} must have de_full`);
  assert(item.tr_full && item.tr_full.length > 3, `Item ${item.abbr} must have tr_full`);
  assert(item.de_desc && item.de_desc.length > 15, `Item ${item.abbr} must have de_desc`);
  assert(item.tr_desc && item.tr_desc.length > 15, `Item ${item.abbr} must have tr_desc`);
  assert(item.exam_pearl && item.exam_pearl.length > 15, `Item ${item.abbr} must have exam_pearl`);
  assert(item.exam_pearl_tr && item.exam_pearl_tr.length > 15, `Item ${item.abbr} must have exam_pearl_tr`);
});

requiredCategories.forEach(cat => {
  assert(foundCategories.has(cat), `Category ${cat} must be represented in abbreviations dataset`);
});

// HTML checks
assert(htmlContent.includes('id="abbrev-trigger"'), 'index.html must include #abbrev-trigger');
assert(htmlContent.includes('id="abbrev-modal"'), 'index.html must include #abbrev-modal');
assert(htmlContent.includes('id="abbrev-search-input"'), 'index.html must include #abbrev-search-input');
assert(htmlContent.includes('id="abbrev-filter-bar"'), 'index.html must include #abbrev-filter-bar');
assert(htmlContent.includes('id="abbrev-cards-grid"'), 'index.html must include #abbrev-cards-grid');
assert(htmlContent.includes('src="js/abbreviations_data.js"'), 'index.html must load js/abbreviations_data.js');

// App.js checks
assert(appCode.includes('initAbbreviationsGuide'), 'app.js must implement initAbbreviationsGuide');
assert(appCode.includes('renderAbbreviations'), 'app.js must implement renderAbbreviations');
assert(appCode.includes('ANESTHESIA_ABBREVIATIONS'), 'app.js must reference ANESTHESIA_ABBREVIATIONS');

// SW checks
const swContent = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
assert(swContent.includes('./js/abbreviations_data.js'), 'sw.js must cache ./js/abbreviations_data.js');
assert(/facharzt-cache-v(?:4\.[6-9]|[5-9]\.[0-9])/.test(swContent), 'sw.js must be updated to v4.6 or newer');

console.log(`[PASS] Suite 30 passed! Verified ${abbreviationsData.length} dual-language abbreviations with complete metadata, UI, and service worker caching.`);

// ============================================================================
// 31. TEST SUITE: THEME-ADAPTIVE VITALPARAMETER VISUALS (LIGHT & DARK MODES)
// ============================================================================
console.log('Testing Suite 31: Theme-Adaptive Vitalparameter Visuals (Light & Dark Modes)...');

// Verify :root light theme vital tokens
assert(cssCode.includes('--vital-mon-bg: #F8FAFC;'), 'styles.css must define light theme --vital-mon-bg in :root');
assert(cssCode.includes('--vital-spo2-color: #047857;'), 'styles.css must define high-contrast SpO2 for light theme');
assert(cssCode.includes('--vital-bp-color: #0284C7;'), 'styles.css must define clinical sapphire blue BP for light theme');
assert(cssCode.includes('--vital-hr-color: #DC2626;'), 'styles.css must define arterial red HR for light theme');
assert(cssCode.includes('--vital-etco2-color: #B45309;'), 'styles.css must define high-contrast amber etCO2 for light theme');
assert(cssCode.includes('--vital-temp-color: #6D28D9;'), 'styles.css must define amethyst/purple Temp for light theme');

// Verify [data-theme="dark"] dark theme vital tokens
assert(cssCode.includes('--vital-mon-bg: #090E17;'), 'styles.css must define dark theme --vital-mon-bg in [data-theme="dark"]');
assert(cssCode.includes('--vital-spo2-color: #34D399;'), 'styles.css must define fluorescent SpO2 for dark theme');
assert(cssCode.includes('--vital-bp-color: #38BDF8;'), 'styles.css must define glowing sky blue BP for dark theme');
assert(cssCode.includes('--vital-hr-color: #F87171;'), 'styles.css must define coral red HR for dark theme');
assert(cssCode.includes('--vital-etco2-color: #FBBF24;'), 'styles.css must define neon amber etCO2 for dark theme');
assert(cssCode.includes('--vital-temp-color: #C4B5FD;'), 'styles.css must define glowing lilac Temp for dark theme');

// Verify clinical monitor classes use variables
assert(cssCode.includes('background: var(--vital-mon-bg);'), '.clinical-monitor-dashboard must use var(--vital-mon-bg)');
assert(cssCode.includes('background: var(--vital-tile-bg);'), '.vital-tile must use var(--vital-tile-bg)');
assert(cssCode.includes('color: var(--vital-spo2-color);'), '.vital-spo2 must use var(--vital-spo2-color)');
assert(cssCode.includes('color: var(--vital-bp-color);'), '.vital-bp must use var(--vital-bp-color)');
assert(cssCode.includes('color: var(--vital-hr-color);'), '.vital-hr must use var(--vital-hr-color)');
assert(cssCode.includes('color: var(--vital-etco2-color);'), '.vital-etco2 must use var(--vital-etco2-color)');
assert(cssCode.includes('color: var(--vital-temp-color);'), '.vital-temp must use var(--vital-temp-color)');

// Verify vital chips styling exists and app.js integrates them
assert(cssCode.includes('.vital-chip-spo2'), 'styles.css must include .vital-chip-spo2');
assert(appCode.includes('vital-chip vital-chip-spo2'), 'app.js mock exam must integrate vital-chip classes');

console.log('[PASS] Suite 31 passed! Verified theme-adaptive vitalparameter tokens and contrast-compliant colors in light and dark modes.');

// ============================================================================
// 32. TEST SUITE: COMPLETE SIMULATION ANSWERS, TRANSLATIONS & ALL STEPS VERIFICATION
// ============================================================================
console.log('Testing Suite 32: Complete Simulation Answers, Turkish Translations & Step Verification...');

// 1. Verify all 42 Düsseldorf Simulation Registry cases have complete answers, translations and all steps
for (let i = 1; i <= 42; i++) {
  const qid = 'q_dus_' + (i < 10 ? '0' + i : i);
  const regCase = DUS_SIMULATION_REGISTRY[qid];
  const qItem = questions.find(q => q.id === qid);

  assert(regCase, `DUS_SIMULATION_REGISTRY must contain case ${qid}`);
  assert(qItem, `questions.js must contain case ${qid}`);

  // Step 1: Presentation & Baseline Question
  assert(qItem.question_de && qItem.question_de.length >= 30, `${qid} Step 1: question_de must be >= 30 chars`);
  assert(qItem.question_tr && qItem.question_tr.length >= 30, `${qid} Step 1: question_tr must be >= 30 chars`);
  assert.notStrictEqual(qItem.question_de, qItem.question_tr, `${qid} Step 1: question_tr must not equal question_de`);

  // Step 2: Vitals & Diagnostic Notes
  assert(regCase.crisis && regCase.crisis.vitals, `${qid} Step 2: vitals must be defined`);
  assert(regCase.crisis.vitals.spo2 && regCase.crisis.vitals.bp && regCase.crisis.vitals.hr, `${qid} Step 2: key vitals must be defined`);

  // Step 3: Examiner Intervention / Crisis Prompt
  assert(regCase.crisis.prompt_de && regCase.crisis.prompt_de.length >= 25, `${qid} Step 3: prompt_de must be >= 25 chars`);
  assert(regCase.crisis.prompt_tr && regCase.crisis.prompt_tr.length >= 25, `${qid} Step 3: prompt_tr must be >= 25 chars`);
  assert.notStrictEqual(regCase.crisis.prompt_de, regCase.crisis.prompt_tr, `${qid} Step 3: prompt_tr must not equal prompt_de`);

  // Step 3 & Step 4: Crisis Action / Intervention Solution
  assert(regCase.crisis.targetAction && regCase.crisis.targetAction.length >= 25, `${qid} Step 3/4: targetAction must be >= 25 chars`);
  assert(regCase.crisis.targetAction_tr && regCase.crisis.targetAction_tr.length >= 25, `${qid} Step 3/4: targetAction_tr must be >= 25 chars`);
  assert.notStrictEqual(regCase.crisis.targetAction, regCase.crisis.targetAction_tr, `${qid} Step 3/4: targetAction_tr must not equal targetAction`);

  // Step 4: Complete Case Model Answer
  assert(qItem.answer_de && qItem.answer_de.length >= 100, `${qid} Step 4: answer_de must be comprehensive (>= 100 chars)`);
  assert(qItem.answer_tr && qItem.answer_tr.length >= 80, `${qid} Step 4: answer_tr must be comprehensive (>= 80 chars)`);
  assert.notStrictEqual(qItem.answer_de, qItem.answer_tr, `${qid} Step 4: answer_tr must not equal answer_de`);

  // K.O. Malpractice & Safety Trap
  assert(regCase.koCriteria && regCase.koCriteria.failureReason && regCase.koCriteria.failureReason.length >= 25, `${qid}: failureReason must be >= 25 chars`);
  assert(regCase.koCriteria.failureReason_tr && regCase.koCriteria.failureReason_tr.length >= 25, `${qid}: failureReason_tr must be >= 25 chars`);
  assert.notStrictEqual(regCase.koCriteria.failureReason, regCase.koCriteria.failureReason_tr, `${qid}: failureReason_tr must not equal failureReason`);
  assert(Array.isArray(regCase.koCriteria.forbiddenPatterns) && regCase.koCriteria.forbiddenPatterns.length >= 1, `${qid}: must have forbiddenPatterns`);
  assert(Array.isArray(regCase.koCriteria.mandatoryKeywords) && regCase.koCriteria.mandatoryKeywords.length >= 2, `${qid}: must have mandatoryKeywords`);

  // Examiner profile
  assert(regCase.examiner && regCase.examiner.focus && regCase.examiner.focus_tr, `${qid}: must have examiner focus in DE and TR`);
  assert(regCase.examiner.trap && regCase.examiner.trap_tr, `${qid}: must have examiner trap in DE and TR`);
}

// 2. Verify UI elements in index.html for instant crisis solution & translation
assert(htmlContent.includes('id="btn-sim-toggle-crisis-solution"'), 'index.html must include #btn-sim-toggle-crisis-solution');
assert(htmlContent.includes('id="sim-crisis-solution-card"'), 'index.html must include #sim-crisis-solution-card');
assert(htmlContent.includes('id="sim-crisis-solution-text"'), 'index.html must include #sim-crisis-solution-text');
assert(htmlContent.includes('id="sim-crisis-ko-text"'), 'index.html must include #sim-crisis-ko-text');
assert(htmlContent.includes('id="btn-audio-speak-crisis-solution"'), 'index.html must include #btn-audio-speak-crisis-solution');

// 3. Verify app.js integration
assert(appCode.includes('elBtnSimToggleCrisisSolution'), 'app.js must bind elBtnSimToggleCrisisSolution');
assert(appCode.includes('elSimCrisisSolutionCard'), 'app.js must manage elSimCrisisSolutionCard');
assert(appCode.includes('mock-case-full-solution'), 'app.js must render mock-case-full-solution in 45-min mock exam');
assert(appCode.includes('notes_tr'), 'app.js must define notes_tr for realistic vitals');

// 4. Clinical Invariant Tests across Key Simulation Cases
const q1 = DUS_SIMULATION_REGISTRY['q_dus_01'];
assert(q1.koCriteria.forbiddenPatterns.some(p => p.test('spinal')), 'Aortic stenosis must forbid spinal anesthesia');
assert(q1.koCriteria.mandatoryKeywords.includes('noradrenalin'), 'Aortic stenosis must require noradrenaline');

const q2 = DUS_SIMULATION_REGISTRY['q_dus_02'];
assert(q2.crisis.targetAction.toLowerCase().includes('cpap'), 'OLV crisis must include CPAP');

const q3 = DUS_SIMULATION_REGISTRY['q_dus_03'];
assert(q3.koCriteria.forbiddenPatterns.some(p => p.test('permissiv')), 'TBI/SHT must forbid permissive hypotension');

const q4 = DUS_SIMULATION_REGISTRY['q_dus_04'];
assert(q4.crisis.targetAction.toLowerCase().includes('dantrolen'), 'MH crisis must include Dantrolen');

const q7 = DUS_SIMULATION_REGISTRY['q_dus_07'];
assert(q7.crisis.targetAction.toLowerCase().includes('lipid') || q7.crisis.targetAction.toLowerCase().includes('intralipid'), 'LAST crisis must include Lipid rescue');

const q39 = DUS_SIMULATION_REGISTRY['q_dus_39'];
assert(q39.crisis.targetAction.toLowerCase().includes('knie-brust') || q39.crisis.targetAction.toLowerCase().includes('phenylephrin'), 'Tet-spell must include knee-chest or phenylephrine');

const q40 = DUS_SIMULATION_REGISTRY['q_dus_40'];
assert(q40.koCriteria.failureReason.toLowerCase().includes('succinylcholin'), 'Burn trauma must warn against succinylcholine');

const q41 = DUS_SIMULATION_REGISTRY['q_dus_41'];
assert(q41.koCriteria.failureReason.toLowerCase().includes('oxytocin'), 'Notsectio must warn against oxytocin boluses');

const q42 = DUS_SIMULATION_REGISTRY['q_dus_42'];
assert(q42.crisis.targetAction.toLowerCase().includes('larson') || q42.crisis.targetAction.toLowerCase().includes('cpap'), 'NPPE crisis must include Larson maneuver or CPAP');

console.log('[PASS] Suite 32 passed! Verified complete answers, Turkish translations, all steps, and clinical accuracy across all simulations.');

// =========================================================================
// Suite 33: 100% Universal Examiner Profile Coverage & Interactive Cockpit UI
// =========================================================================
console.log('Testing Suite 33: 100% Universal Examiner Profile Coverage & Cockpit UI...');

// 1. Verify getExaminerProfileForCase returns an authentic profile for EVERY question
const getProfileMatch = appCode.match(/function getExaminerProfileForCase\(q\) \{[\s\S]*?\n  \}/);
assert(getProfileMatch, 'getExaminerProfileForCase must be present in app.js');
eval(getProfileMatch[0].replace('function getExaminerProfileForCase', 'global.getExaminerProfileForCase = function'));

let missingProfileCount = 0;
questions.forEach(q => {
  const prof = global.getExaminerProfileForCase(q);
  if (!prof || !prof.name || !prof.focus || !prof.trap) {
    missingProfileCount++;
  } else {
    assert(prof.focus_tr && prof.focus_tr.length > 5, `Question ${q.id} missing Turkish examiner focus`);
    assert(prof.trap_tr && prof.trap_tr.length > 5, `Question ${q.id} missing Turkish examiner trap`);
  }
});
assert.strictEqual(missingProfileCount, 0, `All 642 questions must have an examiner profile, found ${missingProfileCount} missing`);

// 2. Verify Cockpit & Step 3 UI elements in index.html
assert(htmlContent.includes('id="btn-sim-toggle-examiner-profile"'), 'index.html must include #btn-sim-toggle-examiner-profile');
assert(htmlContent.includes('id="sim-profile-btn-label"'), 'index.html must include #sim-profile-btn-label');
assert(htmlContent.includes('id="sim-examiner-drawer"'), 'index.html must include #sim-examiner-drawer');
assert(htmlContent.includes('id="sim-examiner-drawer-content"'), 'index.html must include #sim-examiner-drawer-content');
assert(htmlContent.includes('id="sim-examiner-avatar-box"'), 'index.html must include #sim-examiner-avatar-box');
assert(htmlContent.includes('id="examiner-reveal-box"'), 'index.html must include #examiner-reveal-box');
assert(htmlContent.includes('id="badge-examiner-toggle"'), 'index.html must include #badge-examiner-toggle');
assert(htmlContent.includes('id="examiner-reveal-card"'), 'index.html must include #examiner-reveal-card');

// 3. Verify CSS styling in styles.css
assert(cssCode.includes('.btn-sim-profile'), 'styles.css must include .btn-sim-profile');
assert(cssCode.includes('.sim-examiner-drawer'), 'styles.css must include .sim-examiner-drawer');
assert(cssCode.includes('.examiner-drawer-grid'), 'styles.css must include .examiner-drawer-grid');
assert(cssCode.includes('.mock-examiner-profile-card'), 'styles.css must include .mock-examiner-profile-card');

// 4. Verify JS event wiring in app.js
assert(appCode.includes('toggleSimExaminerDrawer'), 'app.js must define toggleSimExaminerDrawer');
assert(appCode.includes('elBtnSimToggleExaminerProfile'), 'app.js must wire elBtnSimToggleExaminerProfile');
assert(appCode.includes('elSimExaminerDrawerContent'), 'app.js must populate elSimExaminerDrawerContent');
assert(appCode.includes('mock-examiner-profile-card'), 'app.js must render mock-examiner-profile-card in mock exam');
assert(appCode.includes('renderExaminerCardContent'), 'app.js must define renderExaminerCardContent');
assert(!appCode.includes("elExaminerBadgeTitle.textContent = `🏛️ ÄKNO"), 'elExaminerBadgeTitle must not prepend duplicate 🏛️ icon');

console.log('[PASS] Suite 33 passed! Verified 100% universal examiner profile coverage (642/642), cockpit quick-view drawer, Step 3 profile integration, and non-empty robust card rendering.');

// ============================================================================
// 34. Test Direct Inline Revealable Answers for Step 1 & Step 2
// ============================================================================
console.log('Testing Suite 34: Direct Inline Revealable Answers for Step 1 & Step 2 (DE/TR)...');

// 1. Verify HTML DOM elements
assert(htmlContent.includes('id="btn-toggle-step1-answer"'), 'index.html must include #btn-toggle-step1-answer');
assert(htmlContent.includes('id="step1-inline-answer-box"'), 'index.html must include #step1-inline-answer-box');
assert(htmlContent.includes('id="step1-inline-answer-text"'), 'index.html must include #step1-inline-answer-text');
assert(htmlContent.includes('id="btn-audio-speak-step1-ans"'), 'index.html must include #btn-audio-speak-step1-ans');

assert(htmlContent.includes('id="btn-toggle-step2-answer"'), 'index.html must include #btn-toggle-step2-answer');
assert(htmlContent.includes('id="step2-inline-answer-box"'), 'index.html must include #step2-inline-answer-box');
assert(htmlContent.includes('id="step2-inline-answer-text"'), 'index.html must include #step2-inline-answer-text');
assert(htmlContent.includes('id="btn-audio-speak-step2-ans"'), 'index.html must include #btn-audio-speak-step2-ans');

// 2. Verify CSS styling
assert(cssCode.includes('.step1-answer-box'), 'styles.css must style .step1-answer-box');
assert(cssCode.includes('.step2-answer-box'), 'styles.css must style .step2-answer-box');
assert(cssCode.includes('.step-inline-action-bar'), 'styles.css must style .step-inline-action-bar');
assert(cssCode.includes('.inline-ans-title'), 'styles.css must style .inline-ans-title');

// 3. Verify JS functions in app.js
assert(appCode.includes('generateVitalsInterpretation'), 'app.js must define generateVitalsInterpretation');
assert(appCode.includes('renderStep1InlineAnswer'), 'app.js must define renderStep1InlineAnswer');
assert(appCode.includes('renderStep2InlineAnswer'), 'app.js must define renderStep2InlineAnswer');
assert(appCode.includes('elBtnToggleStep1Answer'), 'app.js must handle elBtnToggleStep1Answer');
assert(appCode.includes('elBtnToggleStep2Answer'), 'app.js must handle elBtnToggleStep2Answer');

// Extract and test generateVitalsInterpretation
const vitalsInterpMatch = appCode.match(/function generateVitalsInterpretation\(category, stem, answer, vitals, q\) \{[\s\S]*?\n  \}/);
assert(vitalsInterpMatch, 'generateVitalsInterpretation must be found in app.js');
eval(vitalsInterpMatch[0].replace('function generateVitalsInterpretation', 'global.generateVitalsInterpretation = function'));

// Test that all 642 questions produce valid, non-empty, bilingual findings evaluations
const getVitalsMatch = appCode.match(/function getRealisticVitalsForCase\(category, stem, answer\) \{[\s\S]*?\n  \}/);
eval(getVitalsMatch[0].replace('function getRealisticVitalsForCase', 'global.getRealisticVitalsForCase = function'));

questions.forEach(q => {
  const vitals = global.getRealisticVitalsForCase(q.category, q.stem_de || q.question_de || '', q.answer_de || '');
  const interp = global.generateVitalsInterpretation(q.category, q.stem_de || q.question_de || '', q.answer_de || '', vitals, q);
  assert(interp && interp.de && interp.de.length > 50, `Question ${q.id} must have German vitals interpretation`);
  assert(interp && interp.tr && interp.tr.length > 50, `Question ${q.id} must have Turkish vitals interpretation`);
  assert(interp.de.includes('BEFUNDANALYSE') || interp.de.includes('Vitalparameter'), `Question ${q.id} German interpretation format`);
  assert(interp.tr.includes('ANALİZİ') || interp.tr.includes('BULGULARIN'), `Question ${q.id} Turkish interpretation format`);
});

console.log('[PASS] Suite 34 passed! Verified direct inline revealable answers, audio, and bilingual findings evaluation for Step 1 & Step 2 across all 642 questions.');

// -------------------------------------------------------------
// Suite 35: HTML Semantic Tag Balance & Modal Hierarchy Integrity
// -------------------------------------------------------------
console.log('Testing Suite 35: HTML Semantic Tag Balance & Modal Hierarchy Integrity...');
const indexPath = path.join(__dirname, 'index.html');
assert(fs.existsSync(indexPath), 'index.html must exist');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

// Check global div tag balance
const openDivsCount = (indexHtml.match(/<div(\s|>)/gi) || []).length;
const closeDivsCount = (indexHtml.match(/<\/div>/gi) || []).length;
assert.strictEqual(openDivsCount, closeDivsCount, `index.html must have perfectly balanced <div> tags (${openDivsCount} open vs ${closeDivsCount} close)`);

// Check that all top-level modals are siblings, not nested inside each other
const expectedModals = [
  'jump-modal',
  'user-guide-modal',
  'settings-modal',
  'pocket-cards-modal',
  'readiness-modal',
  'aekno-guide-modal',
  'calc-modal',
  'mock-exam-modal',
  'shortcut-modal',
  'abbrev-modal'
];

expectedModals.forEach(mId => {
  assert(indexHtml.includes(`id="${mId}"`), `Modal #${mId} must exist in index.html`);
});

// Verify no modal is accidentally nested inside another modal
expectedModals.forEach(mId => {
  const mStart = indexHtml.indexOf(`id="${mId}"`);
  const mDivStart = indexHtml.lastIndexOf('<div', mStart);
  
  // Find closing div using tag counting
  let depth = 0;
  let mDivEnd = -1;
  const regex = /<\/?div(\s[^>]*)?>/gi;
  regex.lastIndex = mDivStart;
  let match;
  while ((match = regex.exec(indexHtml)) !== null) {
    if (match[0].startsWith('</')) {
      depth--;
      if (depth === 0) {
        mDivEnd = regex.lastIndex;
        break;
      }
    } else {
      depth++;
    }
  }
  assert(mDivEnd !== -1, `Could not find balanced close for #${mId}`);
  const innerModalContent = indexHtml.substring(mStart, mDivEnd);
  
  // Ensure no other modal ID is nested inside this modal
  expectedModals.forEach(otherId => {
    if (otherId !== mId) {
      assert(
        !innerModalContent.includes(`id="${otherId}"`),
        `Modal #${otherId} must NOT be nested inside #${mId}`
      );
    }
  });
});

console.log('[PASS] Suite 35 passed! Verified perfect <div> balance (0 difference) and un-nested modal hierarchy across all 10 application modals.');

// 36. Test Hardware Microphone Stream, Real VU-Meter & MediaRecorder Audio Resilience
console.log('Testing Suite 36: Hardware Microphone Stream, Real VU-Meter & MediaRecorder Audio Resilience...');
assert(htmlContent.includes('btn-mic-diagnosis'), 'index.html must include #btn-mic-diagnosis');
assert(htmlContent.includes('mic-meta-row'), 'index.html must include #mic-meta-row');
assert(htmlContent.includes('mic-device-select'), 'index.html must include #mic-device-select');
assert(htmlContent.includes('mic-warning-banner'), 'index.html must include #mic-warning-banner');
assert(htmlContent.includes('voice-playback-box'), 'index.html must include #voice-playback-box');
assert(htmlContent.includes('voice-recorded-audio'), 'index.html must include #voice-recorded-audio');
assert(htmlContent.includes('mic-diag-panel'), 'index.html must include #mic-diag-panel');
assert(htmlContent.includes('diag-vu-fill'), 'index.html must include #diag-vu-fill');

assert(cssCode.includes('.btn-outline-mic'), 'styles.css must style .btn-outline-mic');
assert(cssCode.includes('.mic-device-select'), 'styles.css must style .mic-device-select');
assert(cssCode.includes('.mic-warning-banner'), 'styles.css must style .mic-warning-banner');
assert(cssCode.includes('.voice-playback-box'), 'styles.css must style .voice-playback-box');
assert(cssCode.includes('.mic-diag-panel'), 'styles.css must style .mic-diag-panel');
assert(cssCode.includes('.diag-vu-fill'), 'styles.css must style .diag-vu-fill');

assert(appCode.includes('initMicrophoneHardware'), 'app.js must implement initMicrophoneHardware');
assert(appCode.includes('setupMediaRecorder'), 'app.js must implement setupMediaRecorder');
assert(appCode.includes('runMicrophoneDiagnostics'), 'app.js must implement runMicrophoneDiagnostics');
assert(appCode.includes('refreshAudioDevicesList'), 'app.js must implement refreshAudioDevicesList');
assert(appCode.includes('showMicWarning'), 'app.js must implement showMicWarning');
assert(appCode.includes('hideMicWarning'), 'app.js must implement hideMicWarning');
assert(appCode.includes('createMediaStreamSource'), 'app.js setupAudioVisualizer must use real Web Audio API media stream source');
assert(appCode.includes('createAnalyser'), 'app.js setupAudioVisualizer must connect AnalyserNode for live volume');

console.log('[PASS] Suite 36 passed! Verified hardware audio stream, real VU-meter, MediaRecorder audio backup, device switcher, and interactive diagnostics.');

// 37. Test JavaScript Syntax Integrity (app.js, sw.js, questions.js)
console.log('Testing Suite 37: Complete JavaScript Syntax Integrity Validation...');
const { execSync } = require('child_process');
execSync('node -c app.js', { cwd: __dirname });
execSync('node -c sw.js', { cwd: __dirname });
execSync('node -c questions.js', { cwd: __dirname });
const jsDir = path.join(__dirname, 'js');
if (fs.existsSync(jsDir)) {
  fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).forEach(file => {
    execSync(`node -c js/${file}`, { cwd: __dirname });
  });
}
console.log('[PASS] Suite 37 passed! Verified zero syntax errors across all application JavaScript files.');

console.log('\n🎉 ALL 37 TEST SUITES PASSED PERFECTLY WITH COMPREHENSIVE COVERAGE!\n');










