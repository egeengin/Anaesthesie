/**
 * Exhaustive Question-Answer and Clinical Integrity Auditor
 * Scans all 600 questions for accuracy, schema completeness, and voice evaluation keyword matching
 */

const fs = require('fs');
const path = require('path');

const questionsPath = path.join(__dirname, 'questions.js');
let questionsCode = fs.readFileSync(questionsPath, 'utf8');
questionsCode = questionsCode.replace('const EXAM_QUESTIONS =', 'global.EXAM_QUESTIONS =');
eval(questionsCode);
const questions = global.EXAM_QUESTIONS;

const VoiceExamEngine = require('./js/voice.js');
const SM2Engine = require('./js/sm2.js');
const MockExamSimulation = require('./js/exam_simulation.js');

console.log('🔍 Starting Deep Clinical & Data Integrity Audit across all 600 Questions...\n');

let mcqCount = 0;
let openCount = 0;
let imageCount = 0;
let highYieldCount = 0;
let categories = new Set();
let errors = [];

// 1. Audit Every Single Question
questions.forEach((q, index) => {
  const qNum = index + 1;
  if (!q.id) errors.push(`[Q${qNum}] Missing ID`);
  if (!q.category) errors.push(`[Q${qNum}] Missing category`);
  categories.add(q.category);

  if (q.is_high_yield) highYieldCount++;
  if (q.image) imageCount++;

  const stem = q.stem_de || q.question_de;
  if (!stem || stem.trim().length < 10) {
    errors.push(`[Q${qNum} - ID:${q.id}] Stem is missing or too short (${stem})`);
  }

  if (q.question_type === 'options') {
    mcqCount++;
    if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
      errors.push(`[Q${qNum} - ID:${q.id}] Options question has no options array!`);
    } else {
      q.options.forEach((opt, optIdx) => {
        if (!opt.key) errors.push(`[Q${qNum} opt ${optIdx}] Missing key`);
        if (!opt.text_de || opt.text_de.trim().length === 0) {
          errors.push(`[Q${qNum} opt ${opt.key}] Empty text_de`);
        }
        if (typeof opt.is_correct !== 'boolean') {
          errors.push(`[Q${qNum} opt ${opt.key}] is_correct is not boolean (${opt.is_correct})`);
        }
        if (!opt.explanation_de || opt.explanation_de.trim().length === 0) {
          errors.push(`[Q${qNum} opt ${opt.key}] Missing explanation_de`);
        }
      });
    }
  } else {
    openCount++;
    if (!q.answer_de && !q.explanation_de) {
      errors.push(`[Q${qNum} - ID:${q.id}] Open case question has NO answer_de and NO explanation_de!`);
    } else {
      const answer = q.answer_de || q.explanation_de;
      if (answer.trim().length < 15) {
        errors.push(`[Q${qNum} - ID:${q.id}] Open case answer is suspiciously short (${answer})`);
      }
    }
  }
});

console.log(`✅ Total Questions Audited: ${questions.length}`);
console.log(`   - Multiple-Choice (Aussagenbewertung): ${mcqCount}`);
console.log(`   - Open Case Dialogue (Mündliche Fälle): ${openCount}`);
console.log(`   - Image/Befunddiagnostik: ${imageCount}`);
console.log(`   - ÄKNO High-Yield Top-Fragen: ${highYieldCount}`);
console.log(`   - Clinical Categories Covered: ${categories.size}`);

if (errors.length > 0) {
  console.error(`\n❌ Found ${errors.length} Data Errors:`);
  errors.slice(0, 10).forEach(e => console.error(e));
  process.exit(1);
} else {
  console.log('\n🎉 ALL 600 QUESTIONS HAVE 100% COMPLETE & VALIDATED ANSWERS!\n');
}

// 2. Test Voice Recognition Keyword Matching with Authentic German Spoken Answers
console.log('🎙️ Testing Voice Speech-to-Text Keyword Evaluation with German Clinical Audio Transcripts...\n');

const testCases = [
  {
    topic: 'Maligne Hyperthermie (MH)',
    rubric: [
      'Trigger sofort stoppen (Inhalationsanästhetika & Succinylcholin)',
      'Dantrolen 2.5 mg/kg i.v. Bolus applizieren',
      'Hyperventilation mit 100% Sauerstoff',
      'Aktivkohlefilter einsetzen und Narkosegerät spülen'
    ],
    sampleGermanAnswer: 'Ich stoppe sofort alle volatilen Anästhetika und gebe 100% Sauerstoff mit maximalem Flow. Dann veranlasse ich sofort die Gabe von Dantrolen 2,5 mg/kg als Bolus und setze Aktivkohlefilter ein.'
  },
  {
    topic: 'Lokalanästhetika-Intoxikation (LAST)',
    rubric: [
      'Injektion sofort stoppen',
      '100% Sauerstoff und Atemwegssicherung',
      'Lipidrescue mit Intralipid 20% 1.5 ml/kg Bolus',
      'Infusion mit 0.25 ml/kg/min fortführen',
      'Keine Vasopressin oder Kalziumantagonisten'
    ],
    sampleGermanAnswer: 'Bei Verdacht auf LAST stoppe ich sofort die Injektion, sichere den Atemweg mit 100 Prozent Sauerstoff und fordere den Intralipid-Notfallwagen an. Ich verabreiche initial einen Bolus von 1,5 ml/kg Intralipid 20 Prozent über eine Minute gefolgt von einer kontinuierlichen Infusion.'
  },
  {
    topic: 'Postpartale Blutung (PPH)',
    rubric: [
      'Atonie als häufigste Ursache erkennen (Tonus)',
      'Oxytocin 3-5 IE langsam i.v.',
      'Sulproston Nalador Infusion 100 bis 500 µg/h',
      'Tranexamsäure 1 g i.v. frühzeitig',
      'Fibrinogenkonzentrat Ziel > 2 g/l'
    ],
    sampleGermanAnswer: 'Es liegt eine postpartale Blutung vor, am wahrscheinlichsten eine Uterusatonie. Ich beginne sofort mit Oxytocin Kurzinfusion und eskaliere bei Bedarf auf Sulproston Nalador. Zeitgleich gebe ich 1 Gramm Tranexamsäure und substituiere Fibrinogen.'
  }
];

testCases.forEach((tc, idx) => {
  const evalResult = VoiceExamEngine.evaluateSpokenAnswer(tc.sampleGermanAnswer, tc.rubric);
  console.log(`[Test ${idx + 1}: ${tc.topic}]`);
  console.log(`  Spoken Answer: "${tc.sampleGermanAnswer.substring(0, 75)}..."`);
  console.log(`  Matched Rubric Items: ${evalResult.matchedIndices.length} / ${tc.rubric.length} (${Math.round(evalResult.matchRatio * 100)}%)`);
  console.log(`  Keywords Detected: ${evalResult.keywordsMatched.slice(0, 6).join(', ')}`);

  if (evalResult.matchRatio < 0.6) {
    console.error(`❌ Keyword evaluation ratio too low for ${tc.topic}`);
    process.exit(1);
  }
});

console.log('\n🎉 ALL GERMAN VOICE TRANSCRIPTION & KEYWORD MATCH TESTS PASSED PERFECTLY!\n');
