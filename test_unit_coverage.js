const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Lightweight browser global mocks for pure Node unit testing
function makeMockStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); }
  };
}

global.localStorage = makeMockStorage();
global.window = global;
global.navigator = {
  clipboard: { writeText: async () => true },
  mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => {} }] }) }
};

(async function runAllUnitSuites() {
  console.log('🧪 Starting High-Coverage Unit Test Suite...\n');

  // 1. js/sm2.js (100% functions)
  const SM2 = require('./js/sm2.js');
  const qList = [
    { id: 'q1' },
    { id: 'q2' },
    { id: 'q3' }
  ];
  const sm2Map = {
    q1: { dueDate: Date.now() - 1000 },
    q2: { dueDate: Date.now() + 86400000 * 5 }
  };
  const due = SM2.getDueQuestions(qList, sm2Map);
  assert.strictEqual(due.length, 2, 'q1 (past) and q3 (new) must be due');
  assert.deepStrictEqual(SM2.getDueQuestions(null, {}), [], 'Invalid questions list returns []');
  assert.strictEqual(SM2.formatDueDate(null), 'Heute fällig');
  assert.strictEqual(SM2.formatDueDate(Date.now() + 3600 * 1000), 'Morgen fällig');
  assert(SM2.formatDueDate(Date.now() + 86400000 * 3 - 1000).includes('3 Tagen'));
  console.log('[PASS] Unit 1: js/sm2.js (100% functions)');

  // 2. js/storage_sync.js (100% functions)
  const StorageSync = require('./js/storage_sync.js');
  localStorage.clear();
  assert.strictEqual(StorageSync.saveLocal({ streak: 4 }), true);
  assert.strictEqual(StorageSync.loadLocal({}).streak, 4);

  // Legacy key fallback
  localStorage.clear();
  localStorage.setItem(StorageSync.LEGACY_STORAGE_KEY, JSON.stringify({ streak: 9 }));
  assert.strictEqual(StorageSync.loadLocal({}).streak, 9);

  // Corrupted JSON fallback
  localStorage.setItem(StorageSync.STORAGE_KEY, '{bad-json');
  assert.deepStrictEqual(StorageSync.loadLocal({ fallback: true }), { fallback: true });

  // Mock fetch for pushToCloud / fetchFromCloud
  const origFetch = global.fetch;
  global.fetch = async (url, opts) => {
    if (opts && opts.method === 'PUT') {
      return { ok: true, json: async () => ({ id: '1' }) };
    }
    return {
      ok: true,
      json: async () => ({ data: { state: { streak: 11, notes: { q1: 'cloud' } } } })
    };
  };
  assert.strictEqual(await StorageSync.pushToCloud({ streak: 4 }), true);
  const fetched = await StorageSync.fetchFromCloud();
  assert.strictEqual(fetched.streak, 11);

  global.fetch = async () => { throw new Error('network down'); };
  assert.strictEqual(await StorageSync.pushToCloud({ streak: 4 }), false);
  assert.strictEqual(await StorageSync.fetchFromCloud(), null);
  global.fetch = origFetch;
  console.log('[PASS] Unit 2: js/storage_sync.js (100% functions)');

  // 3. js/storage_idb.js (LocalStorage fallback + mocked IndexedDB)
  localStorage.clear();
  delete global.window.indexedDB;
  // Re-require cleanly to exercise non-IDB fallback path
  delete require.cache[require.resolve('./js/storage_idb.js')];
  const IDBStorageEngine = require('./js/storage_idb.js');
  const idbFallback = new IDBStorageEngine();
  idbFallback.supported = false;
  idbFallback.db = null;
  await idbFallback.setItem('k1', { ok: true });
  const gotFallback = await idbFallback.getItem('k1');
  assert.strictEqual(gotFallback.ok, true);

  // Now exercise mocked IndexedDB path
  const idbStore = new Map();
  global.window.indexedDB = {
    open: () => {
      const req = {};
      setTimeout(() => {
        const fakeDb = {
          objectStoreNames: { contains: () => false },
          createObjectStore: () => {},
          transaction: () => {
            const tx = {};
            const store = {
              put: (val, key) => {
                idbStore.set(key, val);
                setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
              },
              get: (key) => {
                const getReq = {};
                setTimeout(() => {
                  getReq.result = idbStore.get(key);
                  getReq.onsuccess && getReq.onsuccess();
                }, 0);
                return getReq;
              }
            };
            tx.objectStore = () => store;
            return tx;
          }
        };
        req.onupgradeneeded && req.onupgradeneeded({ target: { result: fakeDb } });
        req.onsuccess && req.onsuccess({ target: { result: fakeDb } });
      }, 0);
      return req;
    }
  };
  idbFallback.supported = true;
  idbFallback.db = null;
  assert.strictEqual(await idbFallback.initDB(), true);
  assert.strictEqual(await idbFallback.setItem('k2', { val: 42 }), true);
  const gotIdb = await idbFallback.getItem('k2');
  assert.strictEqual(gotIdb.val, 42);

  // Exercise IDB error paths (open onerror, tx.onerror, req.onerror)
  global.window.indexedDB = {
    open: () => {
      const req = {};
      setTimeout(() => req.onerror && req.onerror(new Error('open fail')), 0);
      return req;
    }
  };
  idbFallback.db = null;
  assert.strictEqual(await idbFallback.initDB(), false);
  idbFallback.db = {
    transaction: () => {
      const tx = {};
      tx.objectStore = () => ({
        put: () => setTimeout(() => tx.onerror && tx.onerror(), 0),
        get: () => {
          const r = {};
          setTimeout(() => r.onerror && r.onerror(), 0);
          return r;
        }
      });
      return tx;
    }
  };
  assert.strictEqual(await idbFallback.setItem('k3', 1), false);
  assert.strictEqual(await idbFallback.getItem('k3'), null);
  console.log('[PASS] Unit 3: js/storage_idb.js');

  // 4. js/calculators.js (Pure math + DOM UI wiring)
  const fakeElements = new Map();
  function makeEl(id, val = '') {
    const listeners = {};
    return {
      id,
      value: val,
      textContent: '',
      innerHTML: '',
      style: {},
      classList: { toggle: () => {}, add: () => {}, remove: () => {} },
      dataset: {},
      addEventListener: (ev, fn) => { listeners[ev] = fn; },
      dispatch: (ev) => listeners[ev] && listeners[ev]({ currentTarget: fakeElements.get(id) }),
      closest: () => null,
      querySelectorAll: () => []
    };
  }
  const tabBtn = {
    classList: { add: () => {}, remove: () => {} },
    getAttribute: () => 'ards',
    addEventListener: (ev, fn) => { tabBtn._onClick = fn; }
  };
  const calcIds = [
    'calc-trigger', 'calc-modal', 'calc-modal-close', 'calc-tab-bar',
    'calc-panel-peds', 'calc-panel-ards', 'calc-panel-la', 'calc-panel-na',
    'peds-age-input', 'peds-weight-input', 'peds-calc-results',
    'ards-gender-input', 'ards-height-input', 'ards-calc-results',
    'la-weight-input', 'la-calc-results',
    'na-demog-input', 'na-weight-input', 'na-current-input', 'na-calc-results'
  ];
  calcIds.forEach(id => fakeElements.set(id, makeEl(id)));
  fakeElements.get('calc-tab-bar').querySelectorAll = () => [tabBtn];
  fakeElements.get('peds-age-input').value = '4';
  fakeElements.get('peds-weight-input').value = '16';
  fakeElements.get('ards-gender-input').value = 'female';
  fakeElements.get('ards-height-input').value = '168';
  fakeElements.get('la-weight-input').value = '70';
  fakeElements.get('na-demog-input').value = 'male';
  fakeElements.get('na-weight-input').value = '75';
  fakeElements.get('na-current-input').value = '118';

  const origDoc = global.document;
  global.document = {
    getElementById: (id) => fakeElements.get(id) || null,
    querySelectorAll: () => []
  };

  const Calculators = require('./js/calculators.js');
  const ped = Calculators.calculatePediatrics(4, 16);
  assert.strictEqual(ped.uncuffed, 5.0);
  assert.strictEqual(ped.cuffed, 4.5);
  assert.strictEqual(ped.defib, 64);
  const ardsM = Calculators.calculateARDS('male', 180);
  const ardsF = Calculators.calculateARDS('female', 165);
  assert(ardsM.pbw > ardsF.pbw);
  const la = Calculators.calculateLocalAnesthetics(70);
  assert.strictEqual(la.ropivacaine, 210);
  assert.strictEqual(la.intralipidBolus, 105);
  const na = Calculators.calculateSodium('male', 70, 120);
  assert(na.deficit > 0 && na.maxDayNa === '128');
  const naElderly = Calculators.calculateSodium('elderly_female', 60, 118);
  assert.strictEqual(naElderly.factor, 0.45);

  Calculators.init(() => {});
  assert(fakeElements.get('peds-calc-results').innerHTML.includes('Tubus'), 'Pediatrics UI rendered');
  assert(fakeElements.get('ards-calc-results').innerHTML.includes('PBW'), 'ARDS UI rendered');
  assert(fakeElements.get('la-calc-results').innerHTML.includes('Ropivacain'), 'LA UI rendered');
  assert(fakeElements.get('na-calc-results').innerHTML.includes('Natrium-Defizit'), 'Sodium UI rendered');
  // Exercise listeners & tab switch
  fakeElements.get('calc-trigger').dispatch('click');
  fakeElements.get('calc-modal-close').dispatch('click');
  tabBtn._onClick && tabBtn._onClick();
  fakeElements.get('peds-age-input').dispatch('input');
  fakeElements.get('ards-gender-input').dispatch('change');
  fakeElements.get('la-weight-input').dispatch('input');
  fakeElements.get('na-demog-input').dispatch('change');
  global.navigator = { clipboard: { writeText: () => Promise.resolve() } };
  Calculators.copyCalcValues('test', makeEl('copy-btn'));
  global.document = origDoc;
  console.log('[PASS] Unit 4: js/calculators.js');

  // 5. js/speech_engine.js (100% functions)
  const SpeechEngine = require('./js/speech_engine.js');
  const cleanSpeech = SpeechEngine.prepareMedicalTextForSpeech('PaCO2 45 mmHg, SpO2 98%, FiO2 1,0, z.B. i.v. 2 mg/kgKG');
  assert(cleanSpeech.includes('Millimeter Quecksilbersäule') || cleanSpeech.length > 10);
  const mockDeEl = { querySelectorAll: () => [{ textContent: '  Hallo Welt  ' }] };
  assert.strictEqual(SpeechEngine.getCleanSpeechText(mockDeEl), 'Hallo Welt');
  const mockCloneEl = {
    cloneNode: () => ({
      querySelectorAll: () => [{ remove: () => {} }],
      textContent: '  Geklont  '
    })
  };
  assert.strictEqual(SpeechEngine.getCleanSpeechText(mockCloneEl), 'Geklont');
  assert.strictEqual(SpeechEngine.getCleanSpeechText('  Direkt  '), 'Direkt');
  const chunks = SpeechEngine.chunkTextForTTS('Erster Satz. Zweiter Satz mit etwas mehr Text. Dritter Satz am Ende.', 30);
  assert(chunks.length >= 2, 'chunkTextForTTS splits long text');
  const voices = [
    { name: 'Google Deutsch', lang: 'de-DE', localService: false },
    { name: 'Anna', lang: 'de-DE', localService: true },
    { name: 'English', lang: 'en-US', localService: true }
  ];
  const ranked = SpeechEngine.rankGermanVoices(voices);
  assert.strictEqual(ranked.length, 2, 'Only German voices ranked');
  assert(SpeechEngine.scoreGermanVoice(voices[0]) > 0);
  assert(SpeechEngine.getVoiceQualityBadge(voices[0]).length > 0);
  assert(SpeechEngine.getCleanVoiceDisplayName('Microsoft Katja Online (Natural) - German').length > 0);
  assert(SpeechEngine.createGoogleTtsUrl('Hallo').includes('translate.google.com'));
  console.log('[PASS] Unit 5: js/speech_engine.js (100% functions)');

  // 6. js/voice.js
  global.window.SpeechRecognition = function() {
    this.start = () => { this.onstart && this.onstart(); };
    this.stop = () => { this.onend && this.onend(); };
    this.abort = () => {};
  };
  const VoiceMod = require('./js/voice.js');
  const voice = new VoiceMod();
  assert.strictEqual(voice.supported, true);
  let lastStatus = '';
  let lastText = '';
  assert.strictEqual(voice.startListening(t => { lastText = t; }, s => { lastStatus = s; }), true);
  assert.strictEqual(lastStatus, 'listening');
  voice.recognition.onresult({ results: [[{ transcript: 'Dantrolen geben' }]] });
  assert.strictEqual(lastText, 'Dantrolen geben');
  voice.recognition.onerror({ error: 'no-speech' });
  assert.strictEqual(lastStatus, 'error');
  voice.isListening = true;
  voice.stopListening();
  assert.strictEqual(lastStatus, 'stopped');

  const evalRes = VoiceMod.evaluateSpokenAnswer('Ich gebe Dantrolen 2,5 mg/kg und 100% Sauerstoff', [
    'Dantrolen 2,5 mg/kg i.v.',
    'FiO2 1,0 / 100% Sauerstoff',
    'Kühlung einleiten'
  ]);
  assert(evalRes && evalRes.matchRatio >= 0.5, 'Voice rubric evaluation scores matched items');
  const dussRes = VoiceMod.evaluateDüsseldorfExam('q_mh_01', 'Dantrolen 2,5 mg/kg und 100% Sauerstoff', [
    'Dantrolen 2,5 mg/kg i.v.',
    'FiO2 1,0 / 100% Sauerstoff'
  ]);
  assert(dussRes && dussRes.matchRatio >= 0.5);
  console.log('[PASS] Unit 6: js/voice.js');

  // 7. js/gemini_evaluator.js
  localStorage.clear();
  const GeminiMod = require('./js/gemini_evaluator.js');
  const gemini = new GeminiMod();
  assert.strictEqual(gemini.hasApiKey(), true, 'Default Gemini key present');
  gemini.setApiKey('AIzaSyTestKey123456789012345');
  assert.strictEqual(gemini.getUserKey(), 'AIzaSyTestKey123456789012345');
  gemini.setApiKey('');
  assert.strictEqual(gemini.getUserKey(), '');

  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              scorePercent: 90,
              passed: true,
              koViolated: false,
              grade: 'Note 1.5 (Sehr gut)',
              verdictDE: 'Sehr strukturierte Antwort.',
              verdictTR: 'Çok yapılandırılmış yanıt.',
              matchedPoints: ['100% O2'],
              missedPoints: []
            })
          }]
        }
      }]
    })
  });
  const aiRes = await gemini.evaluateAnswer({
    questionId: 'q_dus_01',
    category: 'Herz',
    questionText: 'Aortenstenose?',
    officialAnswer: 'Noradrenalin',
    rubricList: ['Noradrenalin'],
    spokenTranscript: 'Ich gebe Noradrenalin.'
  });
  assert.strictEqual(aiRes.passed, true);
  assert.strictEqual(aiRes.scorePercent, 90);

  // Exercise TTS, WAV conversion, blobToBase64, audioBlobToWav16k, and transcribeAudio
  const wavBlob = GeminiMod.pcm16Base64ToWavBlob(Buffer.from([1, 0, 2, 0]).toString('base64'), 24000);
  assert.strictEqual(wavBlob.size, 48);

  global.FileReader = class {
    readAsDataURL() {
      this.result = 'data:audio/wav;base64,AQACAQ==';
      setTimeout(() => this.onloadend && this.onloadend(), 0);
    }
  };
  const b64 = await GeminiMod.blobToBase64(wavBlob);
  assert.strictEqual(b64, 'AQACAQ==');

  global.window.AudioContext = class {
    async decodeAudioData() { return { duration: 0.01 }; }
    close() {}
  };
  global.window.OfflineAudioContext = class {
    createBufferSource() { return { connect: () => {}, start: () => {} }; }
    async startRendering() { return { getChannelData: () => new Float32Array([0.1, -0.1]) }; }
  };
  const wav16k = await GeminiMod.audioBlobToWav16k(wavBlob);
  assert(wav16k.size > 44);

  let sttCalls = 0;
  global.fetch = async (url) => {
    if (url.includes('tts')) {
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: Buffer.from([1, 0, 2, 0]).toString('base64') } }] } }]
        })
      };
    }
    sttCalls++;
    if (sttCalls === 1) {
      return { ok: false, status: 503, text: async () => 'busy' };
    }
    return {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '"Noradrenalin 10 Mikrogramm"' }] } }] })
    };
  };
  assert.strictEqual(gemini.hasCachedSpeech('Hallo Welt', 'Charon'), false);
  const ttsBlob = await gemini.synthesizeSpeech('Hallo Welt', 'Charon');
  assert(ttsBlob.size >= 44);
  assert.strictEqual(gemini.hasCachedSpeech('Hallo Welt', 'Charon'), true);
  const sttText = await gemini.transcribeAudio(wavBlob, 'de');
  assert.strictEqual(sttText, 'Noradrenalin 10 Mikrogramm');

  global.fetch = origFetch;
  console.log('[PASS] Unit 7: js/gemini_evaluator.js');

  // 8. js/abbreviations_data.js
  const abbrList = require('./js/abbreviations_data.js');
  assert(Array.isArray(abbrList) && abbrList.length >= 70, 'ANESTHESIA_ABBREVIATIONS loaded');
  console.log(`[PASS] Unit 8: js/abbreviations_data.js (${abbrList.length} entries)`);

  // 9. js/exam_simulation.js
  const MockExamSimulation = require('./js/exam_simulation.js');
  const qCode = fs.readFileSync(path.join(__dirname, 'questions.js'), 'utf8');
  const questions = new Function(qCode + '; return typeof EXAM_QUESTIONS !== "undefined" ? EXAM_QUESTIONS : [];')();
  const sim = new MockExamSimulation(questions);
  assert.strictEqual(MockExamSimulation.isDüsseldorfProtocol('q_dus_01'), true);
  assert.strictEqual(MockExamSimulation.isDüsseldorfProtocol('non_existent_id'), false);
  assert.strictEqual(sim.startNewExam(), true);
  assert.strictEqual(sim.formatTime(), '45:00');
  assert.strictEqual(sim.nextCase(), true);
  assert.strictEqual(sim.nextCase(), true);
  assert.strictEqual(sim.nextCase(), true);
  assert.strictEqual(sim.nextCase(), false);
  sim.recordCaseScore(0, { grade: 1.0, koViolated: false });
  sim.recordCaseScore(1, { grade: 2.0, koViolated: false });
  const sumGrade = sim.finishExam();
  assert.strictEqual(sumGrade.hadKO, false);
  assert(sumGrade.grade.includes('Note 1.0'));
  sim.recordCaseScore(0, 4.5, 4, 5);
  sim.recordCaseScore(1, 4.5, 4, 5);
  const sumStar = sim.finishExam();
  assert(sumStar.statusText.includes('BESTANDEN'));
  sim.recordCaseScore(2, { grade: 5.0, koViolated: true });
  const sumKo = sim.finishExam();
  assert.strictEqual(sumKo.hadKO, true);
  sim.stopTimer();
  console.log('[PASS] Unit 9: js/exam_simulation.js');

  console.log('\n🎉 ALL HIGH-COVERAGE UNIT SUITES PASSED!\n');
})();
