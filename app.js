/**
 * FACHARZTPRÜFUNG ANÄSTHESIOLOGIE - APPLICATION LOGIC & SMART PRACTICE ENGINE
 * Supports: Open Q&A Flashcards (self-assessment) + Multi-Choice Questions
 */

// --- Storage Keys & Cloud Sync Constants ---
const STORAGE_KEY = 'facharzt_anaesthesie_state_v2';
const AUTH_KEY = 'facharzt_auth_v1';
const CORRECT_PASS = 'egemelis';
const CLOUD_SYNC_ENDPOINT = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fdab2880b07e2';

document.addEventListener('DOMContentLoaded', () => {
  // Check dataset availability
  if (typeof EXAM_QUESTIONS === 'undefined' || !EXAM_QUESTIONS.length) {
    console.error('EXAM_QUESTIONS data not loaded!');
    return;
  }

  // --- Initial Application State ---
  let state = {
    currentIndex: 0,
    answers: {},       // { questionId: { selected: [indices], submitted: true/false, isCorrect: true/false, revealed: true/false } }
    flagged: {},       // { questionId: true/false }
    theme: 'light',
    subtitleMode: true, // Subtitles ON by default so Turkish translation stays on top/under
    filterMode: 'all',  // 'all', 'unanswered', 'incorrect', 'review'
    typeFilter: 'all',    // 'all', 'options', 'open', 'image'
    categoryFilter: 'all',
    randomOrder: false,
    studyMode: 'simulation', // 'simulation' (Mode A), 'guideline' (Mode B), 'flashcard' (Mode C)
    userNotes: {},
    stepState: {}      // { [qId]: { step: 1..4, vitalsOpen: bool, examinerOpen: bool, revealed: bool, clozesUnmasked: bool } }
  };

  let filteredQuestions = [];

  // --- DOM Elements ---
  const elAuthModal = document.getElementById('auth-modal');
  const elAuthForm = document.getElementById('auth-form');
  const elAuthPassword = document.getElementById('auth-password');
  const elAuthError = document.getElementById('auth-error');
  const elAuthCardBox = document.getElementById('auth-card-box');
  const elLockTrigger = document.getElementById('lock-trigger');

  const elThemeToggle = document.getElementById('theme-toggle');
  const elSubToggle = document.getElementById('sub-toggle');
  const elGridTrigger = document.getElementById('grid-trigger');
  const elSettingsTrigger = document.getElementById('settings-trigger');
  const elCloudSyncStatus = document.getElementById('cloud-sync-status');
  
  const elStatTotal = document.getElementById('stat-total');
  const elStatAnswered = document.getElementById('stat-answered');
  const elStatAccuracy = document.getElementById('stat-accuracy');
  const elStatReview = document.getElementById('stat-review');
  const elProgressBar = document.getElementById('progress-bar-fill');
  
  const elTypeFilter = document.getElementById('type-filter');
  const elCategoryFilter = document.getElementById('category-filter');
  const elFilterChips = document.querySelectorAll('.filter-chip');
  const elModeSelect = document.getElementById('mode-select');

  // Study Mode Switcher Tabs
  const elModeTabSim = document.getElementById('mode-tab-sim');
  const elModeTabGuide = document.getElementById('mode-tab-guide');
  const elModeTabCloze = document.getElementById('mode-tab-cloze');
  
  const elBadgeType = document.getElementById('badge-type');
  const elBadgeCategory = document.getElementById('badge-category');
  const elBadgeSource = document.getElementById('badge-source');
  const elBadgeReview = document.getElementById('badge-review');
  const elQuestionNumber = document.getElementById('question-number');

  // Stepper & Oral Tools Elements
  const elStepperIndicatorBar = document.getElementById('stepper-indicator-bar');
  const elOralToolsBar = document.getElementById('oral-tools-bar');
  const elBtnToggleTimer = document.getElementById('btn-toggle-timer');
  const elTimerDisplayText = document.getElementById('timer-display-text');
  const elTimerMiniBar = document.getElementById('timer-progress-ring');
  const elTimerMiniFill = document.getElementById('timer-mini-fill');
  const elBtnToggleMic = document.getElementById('btn-toggle-mic');
  const elMicStatusText = document.getElementById('mic-status-text');
  const elSpeechTranscriptBox = document.getElementById('speech-transcript-box');
  const elSpeechTranscriptText = document.getElementById('speech-transcript-text');
  const elBtnClearTranscript = document.getElementById('btn-clear-transcript');
  
  // Step Containers & Accordions
  const elStep1Container = document.getElementById('step1-container');
  const elStep2Container = document.getElementById('step2-container');
  const elBtnStep2Toggle = document.getElementById('btn-step2-toggle');
  const elPanelVitals = document.getElementById('panel-vitals');

  const elStep3Container = document.getElementById('step3-container');
  const elBtnStep3Toggle = document.getElementById('btn-step3-toggle');
  const elPanelExaminer = document.getElementById('panel-examiner');
  const elExaminerQuoteText = document.getElementById('examiner-quote-text');

  const elStep4Container = document.getElementById('step4-container');
  const elRevealContainer = document.getElementById('reveal-container');
  const elBtnReveal = document.getElementById('btn-reveal');
  const elClozeControlsBar = document.getElementById('cloze-controls-bar');
  const elBtnRevealAllCloze = document.getElementById('btn-reveal-all-cloze');

  // 3 High-Impact Model Answer Micro-Cards
  const elHighImpactRubric = document.getElementById('high-impact-rubric');
  const elRubricVerbalText = document.getElementById('rubric-verbal-text');
  const elRubricChecklistItems = document.getElementById('rubric-checklist-items');
  const elRubricPitfallText = document.getElementById('rubric-pitfall-text');
  const elFullReferenceDetails = document.getElementById('full-reference-details');
  const elFullReferenceBody = document.getElementById('full-reference-body');

  const elQuestionText = document.getElementById('question-text');
  const elOptionsContainer = document.getElementById('options-container');
  const elExplanationCard = document.getElementById('explanation-card');
  const elExplanationText = document.getElementById('explanation-text');
  const elAnswerCard = document.getElementById('answer-card');
  const elAnswerText = document.getElementById('answer-text');

  // Flashcard & Assessment elements
  const elQuestionImageContainer = document.getElementById('question-image-container');
  const elQuestionImage = document.getElementById('question-image');
  const elSelfAssessContainer = document.getElementById('self-assess-container');
  const elBtnKnewIt = document.getElementById('btn-knew-it');
  const elBtnDidntKnow = document.getElementById('btn-didnt-know');
  
  const elBtnPrev = document.getElementById('btn-prev');
  const elBtnNext = document.getElementById('btn-next');
  const elBtnCheck = document.getElementById('btn-check');
  const elBtnReview = document.getElementById('btn-review');
  
  const elJumpModal = document.getElementById('jump-modal');
  const elJumpModalClose = document.getElementById('modal-close');
  const elQuestionGrid = document.getElementById('question-grid');

  const elSettingsModal = document.getElementById('settings-modal');
  const elSettingsModalClose = document.getElementById('settings-modal-close');
  const elBtnExportProgress = document.getElementById('btn-export-progress');
  const elBtnImportTrigger = document.getElementById('btn-import-trigger');
  const elImportFileInput = document.getElementById('import-file-input');
  const elBtnResetProgress = document.getElementById('btn-reset-progress');

  // Sync subtitle toggle button state
  if (elSubToggle) {
    if (state.subtitleMode) {
      elSubToggle.classList.add('active');
    } else {
      elSubToggle.classList.remove('active');
    }
  }

  // --- Password Authentication Gate ---
  function checkAuthentication() {
    const host = window.location.hostname;
    const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.startsWith('192.168.') || host.startsWith('10.') || window.location.protocol === 'file:';
    const isAuthed = localStorage.getItem(AUTH_KEY) === 'true' || isLocalhost;
    if (isAuthed) {
      if (elAuthModal) elAuthModal.style.display = 'none';
    } else {
      if (elAuthModal) elAuthModal.style.display = 'flex';
      if (elAuthPassword) elAuthPassword.focus();
    }
  }

  // --- Security & IP Access Logger Engine ---
  const AUDIT_LOG_ENDPOINT = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fdac6f09e07e8';

  async function logSecurityAccess(statusStr, attemptedPass = '') {
    try {
      const geoRes = await fetch('https://ipapi.co/json/').catch(() => null);
      let geoData = {};
      if (geoRes && geoRes.ok) {
        geoData = await geoRes.json();
      }

      const logEntry = {
        timestamp: new Date().toISOString(),
        ip: geoData.ip || 'Unknown',
        city: geoData.city || '',
        region: geoData.region || '',
        country: geoData.country_name || '',
        isp: geoData.org || '',
        status: statusStr + (attemptedPass ? ` [Attempt: "${attemptedPass}"]` : ''),
        device: navigator.userAgent ? navigator.userAgent.slice(0, 45) : 'Browser'
      };

      const existingRes = await fetch(AUDIT_LOG_ENDPOINT).catch(() => null);
      let logsList = [];
      if (existingRes && existingRes.ok) {
        const existingData = await existingRes.json();
        if (existingData && existingData.data && existingData.data.logs) {
          logsList = existingData.data.logs;
        }
      }

      logsList.push(logEntry);
      if (logsList.length > 100) {
        logsList = logsList.slice(logsList.length - 100);
      }

      await fetch(AUDIT_LOG_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'facharzt_login_audit_logs',
          data: { logs: logsList }
        })
      }).catch(() => null);
    } catch (e) {
      console.log('Security log error:', e);
    }
  }

  function handleAuthSubmit() {
    if (!elAuthPassword) return;
    const enteredPass = elAuthPassword.value.trim();
    if (enteredPass.toLowerCase() === 'egemelis' || enteredPass === CORRECT_PASS) {
      localStorage.setItem(AUTH_KEY, 'true');
      if (elAuthError) elAuthError.style.display = 'none';
      if (elAuthModal) elAuthModal.style.display = 'none';
      logSecurityAccess('SUCCESS');
    } else {
      if (elAuthError) elAuthError.style.display = 'block';
      if (elAuthCardBox) {
        elAuthCardBox.classList.add('shake');
        setTimeout(() => elAuthCardBox.classList.remove('shake'), 450);
      }
      logSecurityAccess('FAILED_ATTEMPT', enteredPass);
    }
  }

  if (elAuthForm) {
    elAuthForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAuthSubmit();
    });
  }

  const elAuthSubmitBtn = document.getElementById('auth-submit');
  if (elAuthSubmitBtn) {
    elAuthSubmitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleAuthSubmit();
    });
  }

  if (elLockTrigger) {
    elLockTrigger.addEventListener('click', () => {
      localStorage.removeItem(AUTH_KEY);
      if (elAuthPassword) elAuthPassword.value = '';
      if (elAuthError) elAuthError.style.display = 'none';
      if (elAuthModal) elAuthModal.style.display = 'flex';
      if (elAuthPassword) elAuthPassword.focus();
    });
  }

  // --- Determine Question Type ---
  function isOpenQuestion(q) {
    return q.question_type === 'open' || !q.options || q.options.length === 0;
  }

  // --- Filtering Question Bank ---
  function getFilteredQuestions() {
    return EXAM_QUESTIONS.filter(q => {
      // Live Global Medical Search Filter
      if (state.searchQuery && state.searchQuery.trim()) {
        const query = state.searchQuery.trim().toLowerCase();
        let fullText = (q.stem_de || '') + ' ' + (q.stem_tr || '') + ' ' + (q.question_de || '') + ' ' + (q.question_tr || '') + ' ' + (q.answer_de || '') + ' ' + (q.answer_tr || '');
        if (q.options) {
          q.options.forEach(opt => {
            fullText += ' ' + (opt.text_de || '') + ' ' + (opt.text_tr || '') + ' ' + (opt.explanation_de || '') + ' ' + (opt.explanation_tr || '');
          });
        }
        if (state.userNotes && state.userNotes[q.id]) {
          fullText += ' ' + state.userNotes[q.id];
        }
        if (!fullText.toLowerCase().includes(query)) {
          return false;
        }
      }

      if (state.typeFilter !== 'all') {
        if (state.typeFilter === 'image') {
          if (!q.image) return false;
        } else if (state.typeFilter === 'options') {
          if (q.question_type !== 'options') return false;
        } else if (state.typeFilter === 'open') {
          if (q.question_type !== 'open') return false;
        }
      }

      if (state.categoryFilter !== 'all' && q.category !== state.categoryFilter) {
        return false;
      }

      const qAns = state.answers[q.id];
      const isFlagged = !!state.flagged[q.id];

      if (state.filterMode === 'high_yield') {
        return !!q.is_high_yield;
      }
      if (state.filterMode === 'dus_examiners') {
        return !!q.is_dus_protocol || (q.source_book && q.source_book.includes('Düsseldorf'));
      }
      if (state.filterMode === 'weakness') {
        return !qAns || !qAns.submitted || !qAns.isCorrect;
      }
      if (state.filterMode === 'unanswered') {
        return !qAns || !qAns.submitted;
      }
      if (state.filterMode === 'incorrect') {
        return qAns && qAns.submitted && !qAns.isCorrect;
      }
      if (state.filterMode === 'review') {
        return isFlagged;
      }
      
      return true;
    });
  }

  function initCategoryDropdown() {
    if (!elCategoryFilter) return;
    const categories = Array.from(new Set(EXAM_QUESTIONS.map(q => q.category)));
    elCategoryFilter.innerHTML = `<option value="all">Alle Kategorien (${EXAM_QUESTIONS.length})</option>`;
    categories.forEach(cat => {
      const count = EXAM_QUESTIONS.filter(q => q.category === cat).length;
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = `${cat} (${count})`;
      elCategoryFilter.appendChild(opt);
    });
    elCategoryFilter.value = state.categoryFilter || 'all';
  }

  // Load state from LocalStorage
  loadState();
  checkAuthentication();
  initCategoryDropdown();

  // Active question pool based on filters
  filteredQuestions = getFilteredQuestions();

  if (state.currentIndex >= filteredQuestions.length) {
    state.currentIndex = 0;
  }

  // --- Dual-Language Hover Overlay Helper ---
  function renderDualLanguageText(textDE, textTR) {
    if (!textDE) return '';
    const formattedDE = formatAnswerText(textDE);
    if (!textTR || textTR === textDE) {
      return `<div class="de-text-block">${formattedDE}</div>`;
    }
    
    const formattedTR = formatAnswerText(textTR);
    
    if (state.subtitleMode) {
      return `
        <div class="de-text-block">${formattedDE}</div>
        <button class="btn-toggle-tr-sub" type="button" aria-expanded="false" onclick="this.classList.toggle('open'); this.nextElementSibling.classList.toggle('open');">
          <span>🇹🇷 Übersetzung</span> <span class="tr-chevron">▼</span>
        </button>
        <div class="tr-subtitle-collapsible">
          <div class="tr-subtitle-inner">🇹🇷 ${formattedTR}</div>
        </div>
      `;
    } else {
      return `<div class="de-text-block tr-hover" data-tr="${escapeHtml(textTR)}">${formattedDE}</div>`;
    }
  }

  function formatAnswerText(text) {
    if (!text) return '';
    return text
      .replace(/\n/g, '<br>')
      .replace(/•/g, '<br>•')
      .replace(/([✅❌])/g, '<strong>$1</strong>');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // --- 60-Second Exam Step Timer Engine ---
  let stepTimer = {
    secondsLeft: 60,
    interval: null,
    isRunning: false
  };

  function playAudioTone(frequency = 780, type = 'sine', duration = 0.22) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (err) {
      // Audio context error or blocked by autoplay; fail silently
    }
  }

  function startStepTimer() {
    stopStepTimer();
    stepTimer.secondsLeft = 60;
    stepTimer.isRunning = true;
    updateStepTimerUI();

    if (elTimerMiniBar) elTimerMiniBar.style.display = 'block';

    stepTimer.interval = setInterval(() => {
      stepTimer.secondsLeft--;
      updateStepTimerUI();

      if (stepTimer.secondsLeft === 10) {
        playAudioTone(660, 'sine', 0.25); // 10-second warning alert
      }
      if (stepTimer.secondsLeft <= 0) {
        stopStepTimer();
        playAudioTone(440, 'triangle', 0.5); // Time up alert
      }
    }, 1000);
  }

  function stopStepTimer() {
    stepTimer.isRunning = false;
    if (stepTimer.interval) {
      clearInterval(stepTimer.interval);
      stepTimer.interval = null;
    }
    updateStepTimerUI();
  }

  function toggleStepTimer() {
    if (stepTimer.isRunning) {
      stopStepTimer();
    } else {
      startStepTimer();
    }
  }

  function updateStepTimerUI() {
    if (!elTimerDisplayText) return;
    if (stepTimer.isRunning) {
      elTimerDisplayText.textContent = `${stepTimer.secondsLeft}s`;
      if (elBtnToggleTimer) elBtnToggleTimer.classList.add('active');
      if (elTimerMiniFill) {
        const pct = Math.max(0, Math.min(100, (stepTimer.secondsLeft / 60) * 100));
        elTimerMiniFill.style.width = `${pct}%`;
        if (stepTimer.secondsLeft <= 10) {
          elTimerMiniFill.classList.add('urgent');
        } else {
          elTimerMiniFill.classList.remove('urgent');
        }
      }
    } else {
      elTimerDisplayText.textContent = '60s Timer (T)';
      if (elBtnToggleTimer) elBtnToggleTimer.classList.remove('active');
      if (elTimerMiniBar) elTimerMiniBar.style.display = 'none';
    }
  }

  if (elBtnToggleTimer) {
    elBtnToggleTimer.addEventListener('click', toggleStepTimer);
  }

  // --- Voice Dictation & Web Speech API Engine ---
  let speechRecognizer = null;
  let isRecordingVoice = false;

  function initSpeechEngine() {
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechAPI) return null;

    try {
      const rec = new SpeechAPI();
      rec.lang = 'de-DE';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (elSpeechTranscriptBox) elSpeechTranscriptBox.style.display = 'block';
        if (elSpeechTranscriptText) {
          elSpeechTranscriptText.textContent = transcript || 'Sprechen Sie jetzt frei Ihre Antwort ein...';
        }
      };

      rec.onerror = (e) => {
        console.warn('Speech API Error:', e.error);
        if (e.error === 'not-allowed') {
          alert('🎙️ Mikrofonzugriff wurde verweigert. Bitte erlauben Sie den Zugriff in den Browsereinstellungen.');
        }
        stopVoiceRecording();
      };

      rec.onend = () => {
        if (isRecordingVoice) {
          try { rec.start(); } catch (err) {}
        }
      };

      return rec;
    } catch (e) {
      console.warn('Speech API init error:', e);
      return null;
    }
  }

  function startVoiceRecording() {
    if (!speechRecognizer) {
      speechRecognizer = initSpeechEngine();
    }
    if (!speechRecognizer) {
      alert('🎙️ Die Web Speech API wird von diesem Browser leider nicht unterstützt (empfohlen: Chrome, Safari oder Edge).');
      return;
    }

    try {
      isRecordingVoice = true;
      speechRecognizer.start();
      if (elBtnToggleMic) elBtnToggleMic.classList.add('recording');
      if (elMicStatusText) elMicStatusText.innerHTML = '🔴 Aufnahme läuft... <kbd class="kbd-hint">V</kbd>';
      if (elSpeechTranscriptBox) elSpeechTranscriptBox.style.display = 'block';
    } catch (err) {
      console.warn('Start voice recording error:', err);
    }
  }

  function stopVoiceRecording() {
    isRecordingVoice = false;
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (err) {}
    }
    if (elBtnToggleMic) elBtnToggleMic.classList.remove('recording');
    if (elMicStatusText) elMicStatusText.innerHTML = 'Antwort einsprechen <kbd class="kbd-hint">V</kbd>';
  }

  function toggleVoiceRecording() {
    if (isRecordingVoice) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  }

  if (elBtnToggleMic) {
    elBtnToggleMic.addEventListener('click', toggleVoiceRecording);
  }

  if (elBtnClearTranscript && elSpeechTranscriptText) {
    elBtnClearTranscript.addEventListener('click', () => {
      elSpeechTranscriptText.textContent = 'Sprechen Sie jetzt frei Ihre Antwort ein...';
    });
  }

  // --- Medical EdTech Dialogue Parser & Clinical Synthesizer ---
  function parseOralExamCase(q) {
    const category = q.category || 'Allgemeine Anästhesie';
    const stem = q.stem_de || q.question_de || '';
    const answer = q.answer_de || q.explanation_de || (q.options ? q.options.map(o => o.text_de + ': ' + o.explanation_de).join('\n') : '');
    const answerTr = q.answer_tr || q.explanation_tr || (q.options ? q.options.map(o => o.text_tr + ': ' + o.explanation_tr).join('\n') : '');

    // 1. Context & Leitsymptom
    let clinicalContext = 'Klinischer ÄKNO-Falldialog';
    if (category.includes('Atemweg')) clinicalContext = 'Atemwegsmanagement & Narkoseeinleitung';
    else if (category.includes('Herz') || category.includes('Hämo')) clinicalContext = 'Kardiovaskuläres Notfallmanagement';
    else if (category.includes('Chemie') || category.includes('Elektrolyt')) clinicalContext = 'Klinische Chemie & Elektrolyt-Homöostase';
    else if (category.includes('Säure') || category.includes('Blutgase')) clinicalContext = 'Säure-Basen-Haushalt & Blutgase';
    else if (category.includes('Pharmakologie')) clinicalContext = 'Klinische Pharmakologie & Spezifische Antidote';
    else if (category.includes('Kinder') || category.includes('Pädiatrie')) clinicalContext = 'Pädiatrische Anästhesie & Notfälle';
    else if (category.includes('Regional')) clinicalContext = 'Ultraschallgestützte Regionalanästhesie';
    else if (category.includes('Notfall') || category.includes('Reanimation')) clinicalContext = 'Erweiterte Reanimation (ALS / ERC)';
    else if (category.includes('Intensiv') || category.includes('Sepsis')) clinicalContext = 'Intensivmedizin & Schocktherapie';
    else if (category.includes('Transfusion') || category.includes('Hämostase')) clinicalContext = 'Massivtransfusion & Gerinnungsmanagement';

    // 2. Realistic Vitals & BGA Panel tailored to topic
    const vitals = getRealisticVitalsForCase(category, stem, answer);

    // 3. Examiner Steering / Follow-up challenge
    let examinerIntervention = '';
    const followUpMatches = answer.match(/([A-ZÄÖÜ][^.?!]*\?)/g);
    if (followUpMatches && followUpMatches.length > 0 && followUpMatches[0].length > 15) {
      examinerIntervention = `Der Prüfer hakt gezielt nach: "${followUpMatches[0].trim()}"`;
    } else {
      examinerIntervention = getDynamicExaminerComplication(category, stem);
    }

    // 4. Three High-Impact Model Answer Micro-Cards
    const verbalFramework = generateVerbalFramework(category, stem, answer);
    const checklist = generateChecklist(category, stem, answer, q.options);
    const pitfalls = generatePitfalls(category, stem, answer);

    return {
      clinicalContext,
      stem,
      vitals,
      examinerIntervention,
      verbalFramework,
      checklist,
      pitfalls,
      fullTextDE: answer,
      fullTextTR: answerTr
    };
  }

  function getRealisticVitalsForCase(category, stem, answer) {
    const text = (stem + ' ' + answer).toLowerCase();

    // Baseline profiles by domain
    if (category.includes('Atemweg')) {
      return {
        spo2: '89%', bp: '142/88', map: '106 mmHg', hr: '110 /min', rhythm: 'Sinustachykardie',
        etco2: '48 mmHg', vent: 'Pmax 32 mbar', temp: '36,8 °C',
        ph: '7,31', po2: '62 mmHg', pco2: '51 mmHg', hco3: '24 mmol/l', be: '-1,4 mmol/l', lactate: '1,6 mmol/l',
        k: '4,2 mmol/l', na: '140 mmol/l', ca: '1,18 mmol/l', hb: '13,2 g/dl',
        notes: 'Auskultation: Beidseits vesikulär, verlängertes Exspirium, Mallampati IV, thyromentaler Abstand 5,5 cm.'
      };
    } else if (category.includes('Herz') || category.includes('Hämo')) {
      return {
        spo2: '93%', bp: '78/44', map: '55 mmHg', hr: '126 /min', rhythm: 'Sinustachykardie',
        etco2: '24 mmHg', vent: 'Pmax 22 mbar', temp: '35,9 °C',
        ph: '7,21', po2: '78 mmHg', pco2: '34 mmHg', hco3: '14 mmol/l', be: '-10,2 mmol/l', lactate: '4,8 mmol/l',
        k: '4,8 mmol/l', na: '136 mmol/l', ca: '0,96 mmol/l', hb: '7,9 g/dl',
        notes: 'FATE-Echokardiographie: Linker Ventrikel hyperdynam, VCI atemkollaptisch (< 1,2 cm), ScvO2 56%.'
      };
    } else if (category.includes('Chemie') || category.includes('Elektrolyt') || category.includes('Säure')) {
      const isAlkalosis = text.includes('alkalose') || text.includes('hypokaliämie');
      return {
        spo2: '98%', bp: '118/72', map: '87 mmHg', hr: isAlkalosis ? '88 /min' : '52 /min', rhythm: isAlkalosis ? 'Sinusrhythmus' : 'Sinusbradykardie',
        etco2: '36 mmHg', vent: 'Pmax 19 mbar', temp: '36,6 °C',
        ph: isAlkalosis ? '7,49' : '7,19', po2: '88 mmHg', pco2: isAlkalosis ? '44 mmHg' : '32 mmHg',
        hco3: isAlkalosis ? '32 mmol/l' : '13 mmol/l', be: isAlkalosis ? '+7,8 mmol/l' : '-13,5 mmol/l',
        lactate: '2,8 mmol/l', k: isAlkalosis ? '2,9 mmol/l' : '6,4 mmol/l', na: '128 mmol/l', ca: '0,94 mmol/l', hb: '11,4 g/dl',
        notes: isAlkalosis ? 'EKG: Abgeflachte T-Welle, U-Welle sichtbar; Tetanieneigung.' : 'EKG: Hohe zeltförmige T-Wellen, QRS-Verbreiterung (125 ms), AV-Block I°.'
      };
    } else if (category.includes('Pharmakologie') || category.includes('Notfall')) {
      return {
        spo2: '91%', bp: '65/35', map: '45 mmHg', hr: '140 /min', rhythm: 'Tachyarrhythmie',
        etco2: '19 mmHg', vent: 'Pmax 30 mbar', temp: '38,8 °C',
        ph: '7,14', po2: '72 mmHg', pco2: '56 mmHg', hco3: '17 mmol/l', be: '-11,2 mmol/l', lactate: '5,6 mmol/l',
        k: '5,9 mmol/l', na: '141 mmol/l', ca: '1,02 mmol/l', hb: '12,0 g/dl',
        notes: 'Monitoring: Rasch progrediente Hyperkapnie, Rigor und Temperaturanstieg (V.a. MH / LAST).'
      };
    } else {
      return {
        spo2: '96%', bp: '125/75', map: '91 mmHg', hr: '82 /min', rhythm: 'Sinusrhythmus',
        etco2: '38 mmHg', vent: 'Pmax 21 mbar', temp: '36,7 °C',
        ph: '7,38', po2: '92 mmHg', pco2: '41 mmHg', hco3: '24 mmol/l', be: '-0,5 mmol/l', lactate: '1,4 mmol/l',
        k: '4,3 mmol/l', na: '139 mmol/l', ca: '1,20 mmol/l', hb: '12,8 g/dl',
        notes: 'Vitalparameter und Monitoring im perioperativen Normbereich; Narkosetiefe adäquat.'
      };
    }
  }

  function getDynamicExaminerComplication(category, stem) {
    if (category.includes('Atemweg')) {
      return 'Der Prüfer interveniert: "Nach Narkoseeinleitung gelingt die Maskenbeatmung nur mit Mühe (SpO2 fällt auf 82%). Die direkte Laryngoskopie zeigt Cormack-Lehane Grad IV. Wie lautet Ihre strukturierte Eskalation nach dem DGAI-Stufenplan bis Plan D?"';
    } else if (category.includes('Herz') || category.includes('Hämo')) {
      return 'Der Prüfer steuert den Fall: "Der arterielle Druck fällt akut auf 70/40 mmHg und die etCO2 stürzt auf 14 mmHg ab. Welche 3 lebensbedrohlichen Differenzialdiagnosen müssen Sie sofort ausschließen und wie therapieren Sie?"';
    } else if (category.includes('Chemie') || category.includes('Elektrolyt')) {
      return 'Der Prüfer hakt nach: "Das Serum-Kalium steigt im Labor auf 6,8 mmol/l mit QRS-Verbreiterung im EKG. Nennen Sie exakt die Reihenfolge und Dosierung der medikamentösen Notfallmaßnahmen!"';
    } else if (category.includes('Pharmakologie')) {
      return 'Der Prüfer stellt eine Komplikation: "Unmittelbar nach Injektion klagt der Patient über periorales Kribbeln, gefolgt von einem generalisierten Krampfanfall. Welcher Notfall liegt vor und wie dosieren Sie das spezifische Antidot?"';
    } else {
      return 'Der Prüfer fragt weiter: "Welche pathophysiologischen Mechanismen begründen Ihre Therapiestrategie und welche gravierenden Fehler dürfen Ihnen hier unter keinen Umständen unterlaufen?"';
    }
  }

  function generateVerbalFramework(category, stem, answer) {
    const cleanStem = stem.replace(/[\n\r]+/g, ' ').replace(/:$/, '').trim();
    if (category.includes('Atemweg')) {
      return `„Ich priorisiere hier das ABCDE-Schema und sichere primär den Atemweg. Bezüglich der Fragestellung '${cleanStem}' leite ich das strukturierte Vorgehen nach den aktuellen DGAI/DAS-Leitlinien ein und halte unverzüglich das schwierige Atemwegsbesteck bereit.“`;
    } else if (category.includes('Herz') || category.includes('Hämo')) {
      return `„Ich fasse die Situation zusammen: Es liegt eine akute hämodynamische Instabilität vor. Ich sichere sofort Oxygenierung und Gefäßzugänge, titriere Noradrenalin zur Gewährleistung eines adäquaten Perfusionsdrucks (Ziel-MAP ≥ 65 mmHg) und führe eine gezielte Ursachenabklärung durch.“`;
    } else if (category.includes('Chemie') || category.includes('Elektrolyt') || category.includes('Säure')) {
      return `„Als führende Verdachtsdiagnose identifiziere ich eine schwerwiegende Störung der Elektrolyt- und Säure-Basen-Homöostase. Mein therapeutisches Konzept gliedert sich streng in: 1. Kardiale Membranstabilisierung, 2. Kausale Ursachenbehebung und 3. Forcierte Normalisierung unter engmaschiger BGA-Kontrolle.“`;
    } else if (category.includes('Pharmakologie') || category.includes('Notfall')) {
      return `„Ich reagiere unmittelbar auf diesen anästhesiologischen Zwischenfall: Zufuhr potenzieller Trigger sofort stoppen, 100% Sauerstoff applizieren, das Team alarmieren und das spezifische Notfallprotokoll mit der exakten Antidot-Dosierung abrufen.“`;
    } else {
      return `„Bezüglich '${cleanStem}' strukturiere ich meine klinische Antwort in präoperative Risikostratifizierung, intraoperatives Monitoring und zielgerichtete Therapiemaßnahmen nach aktuellen Leitlinien.“`;
    }
  }

  function generateChecklist(category, stem, answer, options) {
    const items = [];

    // If multi-choice options exist, generate high-yield points from options
    if (options && options.length > 0) {
      options.slice(0, 4).forEach(opt => {
        const status = opt.is_correct ? '✅ Richtig:' : '❌ Falsch:';
        const expl = opt.explanation_de ? opt.explanation_de.split('.')[0] : opt.text_de;
        items.push(`<strong>${status}</strong> ${opt.text_de} <br><small style="color: var(--text-muted);">${expl}</small>`);
      });
    } else {
      // Split paragraphs or bullet points in open questions
      const bullets = answer.split(/[•\n–-]/).map(s => s.trim()).filter(s => s.length > 15);
      if (bullets.length >= 3) {
        bullets.slice(0, 4).forEach(b => {
          items.push(highlightDosagesAndUnits(b));
        });
      } else {
        // Synthesize high-yield items from sentences
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

  function generatePitfalls(category, stem, answer) {
    const text = (stem + ' ' + answer).toLowerCase();

    if (text.includes('maligne hyperthermie') || text.includes('dantrolen')) {
      return '❌ No-Go: Niemals Kalziumantagonisten (z. B. Diltiazem, Verapamil) bei Verdacht auf Maligne Hyperthermie geben – Gefahr des irreversiblen hyperkaliämischen Herzstillstands!';
    } else if (text.includes('last') || text.includes('lokalanästhetik')) {
      return '❌ No-Go: Kein Vasopressin, kein Lidocain, kein Amiodaron bei LAST! Adrenalin nur streng titriert (< 1 µg/kg) dosieren!';
    } else if (text.includes('atemweg') || text.includes('intubat') || text.includes('cico')) {
      return '❌ Prüfungsfalle: Mehr als 3 Intubationsversuche ohne Optimierung (Videolaryngoskopie/BURP) überschreiten. Bei CICO sofort die Koniotomie einleiten!';
    } else if (text.includes('hyponatriäm') || text.includes('natrium')) {
      return '❌ No-Go: Zu schneller Natriumausgleich bei chronischer Hyponatriämie (> 8–10 mmol/l/24h) birgt die tödliche Gefahr der pontinen Myelinolyse!';
    } else if (text.includes('hyperkaliäm') || text.includes('kalium')) {
      return '❌ No-Go: Gabe von Succinylcholin bei bekannter Hyperkaliämie oder Verbrennungen > 24h (Gefahr des Asystolie-Stillstands)!';
    } else if (text.includes('spannungspneumothorax')) {
      return '❌ No-Go: PEEP-Erhöhung bei V.a. Spannungspneumothorax verschärft den Kreislaufstillstand – sofort Nadel- bzw. Minithorakotomie durchführen!';
    } else {
      return '❌ Prüfungsfalle: Unstrukturiertes Reagieren ohne Priorisierung nach dem ABCDE-Schema sowie das Übersehen vitaler Kontraindikationen!';
    }
  }

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

  // --- Multi-Mode Study Switcher Controller ---
  function setStudyMode(mode) {
    state.studyMode = mode;
    saveState();

    // Update active tab buttons
    if (elModeTabSim) elModeTabSim.classList.toggle('active', mode === 'simulation');
    if (elModeTabGuide) elModeTabGuide.classList.toggle('active', mode === 'guideline');
    if (elModeTabCloze) elModeTabCloze.classList.toggle('active', mode === 'flashcard');

    if (elModeTabSim) elModeTabSim.setAttribute('aria-selected', mode === 'simulation');
    if (elModeTabGuide) elModeTabGuide.setAttribute('aria-selected', mode === 'guideline');
    if (elModeTabCloze) elModeTabCloze.setAttribute('aria-selected', mode === 'flashcard');

    renderCurrentQuestion();
  }

  if (elModeTabSim) elModeTabSim.addEventListener('click', () => setStudyMode('simulation'));
  if (elModeTabGuide) elModeTabGuide.addEventListener('click', () => setStudyMode('guideline'));
  if (elModeTabCloze) elModeTabCloze.addEventListener('click', () => setStudyMode('flashcard'));

  // --- Progressive Stepper Accordion Toggles ---
  function toggleStep2(forceOpen = null) {
    if (!elPanelVitals || !elBtnStep2Toggle) return;
    const isCurrentlyOpen = elPanelVitals.style.display !== 'none';
    const nextState = (forceOpen !== null) ? forceOpen : !isCurrentlyOpen;
    elPanelVitals.style.display = nextState ? 'block' : 'none';
    elBtnStep2Toggle.setAttribute('aria-expanded', nextState.toString());
    updateStepperIndicator();
  }

  function toggleStep3(forceOpen = null) {
    if (!elPanelExaminer || !elBtnStep3Toggle) return;
    const isCurrentlyOpen = elPanelExaminer.style.display !== 'none';
    const nextState = (forceOpen !== null) ? forceOpen : !isCurrentlyOpen;
    elPanelExaminer.style.display = nextState ? 'block' : 'none';
    elBtnStep3Toggle.setAttribute('aria-expanded', nextState.toString());
    updateStepperIndicator();
  }

  function revealStep4() {
    revealAnswer();
  }

  if (elBtnStep2Toggle) elBtnStep2Toggle.addEventListener('click', () => toggleStep2());
  if (elBtnStep3Toggle) elBtnStep3Toggle.addEventListener('click', () => toggleStep3());
  if (elBtnReveal) elBtnReveal.addEventListener('click', () => revealStep4());

  if (elBtnRevealAllCloze) {
    elBtnRevealAllCloze.addEventListener('click', () => {
      document.querySelectorAll('.cloze-blur').forEach(el => el.classList.add('unmasked'));
    });
  }

  function updateStepperIndicator() {
    if (!elStepperIndicatorBar) return;
    const isVitalsOpen = elPanelVitals && elPanelVitals.style.display !== 'none';
    const isExaminerOpen = elPanelExaminer && elPanelExaminer.style.display !== 'none';
    const isRubricRevealed = elHighImpactRubric && elHighImpactRubric.style.display !== 'none';

    const node1 = document.getElementById('step-node-1');
    const node2 = document.getElementById('step-node-2');
    const node3 = document.getElementById('step-node-3');
    const node4 = document.getElementById('step-node-4');
    const line1 = document.getElementById('step-line-1');
    const line2 = document.getElementById('step-line-2');
    const line3 = document.getElementById('step-line-3');

    if (node1) node1.className = 'stepper-step active' + (isVitalsOpen ? ' completed' : '');
    if (line1) line1.className = 'stepper-line' + (isVitalsOpen ? ' active' : '');
    if (node2) node2.className = 'stepper-step' + (isVitalsOpen ? ' active' : '') + (isExaminerOpen ? ' completed' : '');
    if (line2) line2.className = 'stepper-line' + (isExaminerOpen ? ' active' : '');
    if (node3) node3.className = 'stepper-step' + (isExaminerOpen ? ' active' : '') + (isRubricRevealed ? ' completed' : '');
    if (line3) line3.className = 'stepper-line' + (isRubricRevealed ? ' active' : '');
    if (node4) node4.className = 'stepper-step' + (isRubricRevealed ? ' active completed' : '');
  }

  // --- Keyboard Shortcuts Engine ---
  document.addEventListener('keydown', (e) => {
    // Ignore keypresses if typing in input fields or modal active
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }
    if (elAuthModal && elAuthModal.style.display !== 'none') {
      return;
    }

    const key = e.key.toLowerCase();

    // Space: Advance Stepper / Reveal / Unmask Cloze / Check answers
    if (e.code === 'Space' || key === 'enter') {
      e.preventDefault();

      if (state.studyMode === 'flashcard') {
        // In Flashcard mode: Unmask all clozes on Space
        const masked = document.querySelectorAll('.cloze-blur:not(.unmasked)');
        if (masked.length > 0) {
          masked.forEach(el => el.classList.add('unmasked'));
        } else {
          // If all already unmasked, advance to next question
          navigateToNextQuestion();
        }
        return;
      }

      filteredQuestions = getFilteredQuestions();
      if (!filteredQuestions.length) return;
      const currentQ = filteredQuestions[state.currentIndex];
      const qAns = state.answers[currentQ.id] || {};

      // In Mode A (Prüfer-Simulation): Step forward sequentially
      if (state.studyMode === 'simulation') {
        const isVitalsOpen = elPanelVitals && elPanelVitals.style.display !== 'none';
        const isExaminerOpen = elPanelExaminer && elPanelExaminer.style.display !== 'none';
        const isRevealed = qAns.revealed || (elHighImpactRubric && elHighImpactRubric.style.display !== 'none');

        if (!isVitalsOpen) {
          toggleStep2(true);
        } else if (!isExaminerOpen) {
          toggleStep3(true);
        } else if (!isRevealed) {
          revealAnswer();
        } else if (currentQ.options && currentQ.options.length > 0 && !qAns.submitted) {
          checkAnswer();
        } else {
          navigateToNextQuestion();
        }
        return;
      }

      // Default or Guideline Mode
      if (!qAns.revealed) {
        revealAnswer();
      }
    }
    // 1 or R: Knew it (self assessment pass)
    else if (key === '1' || key === 'r') {
      selfAssess(true);
    }
    // 2 or F: Didn't know (self assessment fail)
    else if (key === '2' || key === 'f') {
      selfAssess(false);
    }
    // V: Voice Recording Toggle
    else if (key === 'v') {
      e.preventDefault();
      toggleVoiceRecording();
    }
    // T: 60s Step Timer Toggle
    else if (key === 't') {
      e.preventDefault();
      toggleStepTimer();
    }
    // Right Arrow: Next question
    else if (e.code === 'ArrowRight' || key === 'd') {
      e.preventDefault();
      navigateToNextQuestion();
    }
    // Left Arrow: Previous question
    else if (e.code === 'ArrowLeft' || key === 'a') {
      e.preventDefault();
      navigateToPrevQuestion();
    }
    // M: Flag for review
    else if (key === 'm') {
      toggleFlagForReview();
    }
  });

  function navigateToNextQuestion() {
    filteredQuestions = getFilteredQuestions();
    if (state.currentIndex < filteredQuestions.length - 1) {
      state.currentIndex++;
      saveState();
      renderCurrentQuestion();
    }
  }

  function navigateToPrevQuestion() {
    filteredQuestions = getFilteredQuestions();
    if (state.currentIndex > 0) {
      state.currentIndex--;
      saveState();
      renderCurrentQuestion();
    }
  }

  // --- Main Question Viewer Renderer ---
  function renderCurrentQuestion() {
    filteredQuestions = getFilteredQuestions();

    if (!filteredQuestions.length) {
      elQuestionText.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-muted);">
        <h3>Keine Fragen in dieser Filterauswahl gefunden.</h3>
        <p style="margin-top: 0.5rem;">Bitte wählen Sie einen anderen Filter oder eine andere Kategorie.</p>
      </div>`;
      if (elOptionsContainer) elOptionsContainer.innerHTML = '';
      if (elRevealContainer) elRevealContainer.style.display = 'none';
      if (elHighImpactRubric) elHighImpactRubric.style.display = 'none';
      if (elSelfAssessContainer) elSelfAssessContainer.style.display = 'none';
      if (elQuestionImageContainer) elQuestionImageContainer.style.display = 'none';
      if (elQuestionNumber) elQuestionNumber.textContent = `0 von 0`;
      return;
    }

    if (state.currentIndex >= filteredQuestions.length) {
      state.currentIndex = filteredQuestions.length - 1;
    }
    if (state.currentIndex < 0) {
      state.currentIndex = 0;
    }

    const currentQ = filteredQuestions[state.currentIndex];
    const qState = state.answers[currentQ.id] || { userChoices: {}, submitted: false, revealed: false, isCorrect: false };
    if (!qState.userChoices) qState.userChoices = {};

    const isFlagged = !!state.flagged[currentQ.id];
    const isOpen = isOpenQuestion(currentQ);
    const mode = state.studyMode || 'simulation';

    // Header badges
    const elBadgeHy = document.getElementById('badge-hy');
    if (elBadgeHy) {
      if (currentQ.is_dus_protocol || (currentQ.source_book && currentQ.source_book.includes('Düsseldorf'))) {
        elBadgeHy.style.display = 'inline-block';
        elBadgeHy.textContent = '🏛️ ÄKNO Düsseldorf Protokoll';
        elBadgeHy.style.background = 'linear-gradient(135deg, #b45309, #d97706)';
        elBadgeHy.style.color = '#ffffff';
      } else if (currentQ.is_high_yield) {
        elBadgeHy.style.display = 'inline-block';
        elBadgeHy.textContent = '⭐ ÄKNO Top-Frage';
        elBadgeHy.style.background = '';
        elBadgeHy.style.color = '';
      } else {
        elBadgeHy.style.display = 'none';
      }
    }

    if (elBadgeType) {
      if (currentQ.image) {
        elBadgeType.textContent = '🖼️ Befunddiagnostik';
      } else if (currentQ.question_type === 'options') {
        elBadgeType.textContent = '✅ Aussagenbewertung';
      } else {
        elBadgeType.textContent = '📋 Mündlicher Falldialog';
      }
    }
    if (elBadgeCategory) elBadgeCategory.textContent = currentQ.category;
    if (elBadgeSource) elBadgeSource.textContent = currentQ.source_book ? currentQ.source_book.split(' - ')[0] : 'Facharzt';

    if (isFlagged) {
      if (elBadgeReview) elBadgeReview.style.display = 'inline-block';
      if (elBtnReview) {
        elBtnReview.classList.add('flagged');
        elBtnReview.innerHTML = `<span>★</span> Markiert`;
      }
    } else {
      if (elBadgeReview) elBadgeReview.style.display = 'none';
      if (elBtnReview) {
        elBtnReview.classList.remove('flagged');
        elBtnReview.innerHTML = `<span>☆</span> Wiederholen`;
      }
    }

    const globalIdx = EXAM_QUESTIONS.findIndex(q => q.id === currentQ.id) + 1;
    if (elQuestionNumber) {
      elQuestionNumber.textContent = `Fall ${globalIdx} von ${EXAM_QUESTIONS.length} (${state.currentIndex + 1}/${filteredQuestions.length})`;
    }

    // Parse question through Medical EdTech Dialogue Engine
    const parsedCase = parseOralExamCase(currentQ);

    // Step 1: Presentation & Baseline Stem
    const stemDe = currentQ.stem_de || currentQ.question_de || '';
    const stemTr = currentQ.stem_tr || currentQ.question_tr || '';
    if (elQuestionText) {
      elQuestionText.innerHTML = renderDualLanguageText(stemDe, stemTr);
    }

    // Personal Medical Note
    const elUserNoteText = document.getElementById('user-note-text');
    if (elUserNoteText) {
      elUserNoteText.value = (state.userNotes && state.userNotes[currentQ.id]) ? state.userNotes[currentQ.id] : '';
    }

    // Question image
    if (currentQ.image) {
      if (elQuestionImageContainer) elQuestionImageContainer.style.display = 'block';
      if (elQuestionImage) {
        elQuestionImage.src = currentQ.image;
        elQuestionImage.alt = `Abbildung zu: ${stemDe.substring(0, 60)}...`;
      }
    } else {
      if (elQuestionImageContainer) elQuestionImageContainer.style.display = 'none';
    }

    // Step 2: Populate Clinical ICU Monitor & BGA Dashboard
    const v = parsedCase.vitals;
    const setElemText = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };
    setElemText('vital-val-spo2', v.spo2);
    setElemText('vital-val-bp', v.bp);
    setElemText('vital-val-map', `(MAP ${v.map})`);
    setElemText('vital-val-hr', v.hr);
    setElemText('vital-val-rhythm', v.rhythm);
    setElemText('vital-val-etco2', v.etco2);
    setElemText('vital-val-vent', v.vent);
    setElemText('vital-val-temp', v.temp);

    setElemText('bga-val-ph', v.ph);
    setElemText('bga-val-po2', v.po2);
    setElemText('bga-val-pco2', v.pco2);
    setElemText('bga-val-hco3', v.hco3);
    setElemText('bga-val-be', v.be);
    setElemText('bga-val-lactate', v.lactate);
    setElemText('bga-val-k', v.k);
    setElemText('bga-val-na', v.na);
    setElemText('bga-val-ca', v.ca);
    setElemText('bga-val-hb', v.hb);

    const elDiagNotes = document.getElementById('diagnostic-notes-box');
    if (elDiagNotes) elDiagNotes.textContent = v.notes;

    // Step 3: Populate Examiner Steering Intervention
    if (elExaminerQuoteText) {
      elExaminerQuoteText.textContent = parsedCase.examinerIntervention;
    }

    // Step 4: Populate 3 High-Impact Model Answer Micro-Cards
    if (elRubricVerbalText) {
      elRubricVerbalText.innerHTML = parsedCase.verbalFramework;
    }

    if (elRubricChecklistItems) {
      elRubricChecklistItems.innerHTML = '';
      parsedCase.checklist.forEach(itemText => {
        const row = document.createElement('div');
        row.className = 'checklist-item-row';
        const formatted = (mode === 'flashcard') ? generateClozeMaskedHtml(itemText) : itemText;
        row.innerHTML = `<span class="checklist-check">✓</span> <div>${formatted}</div>`;
        elRubricChecklistItems.appendChild(row);
      });
    }

    if (elRubricPitfallText) {
      elRubricPitfallText.innerHTML = `<div class="pitfall-item"><span>⚠️</span> <div>${parsedCase.pitfalls}</div></div>`;
    }

    if (elFullReferenceBody) {
      elFullReferenceBody.innerHTML = renderDualLanguageText(parsedCase.fullTextDE, parsedCase.fullTextTR);
    }

    // Handle Cloze interaction in Flashcard mode (Mode C)
    if (mode === 'flashcard') {
      document.querySelectorAll('.cloze-blur').forEach(clozeEl => {
        clozeEl.addEventListener('click', (e) => {
          e.stopPropagation();
          clozeEl.classList.add('unmasked');
        });
      });
      if (elClozeControlsBar) elClozeControlsBar.style.display = 'flex';
    } else {
      if (elClozeControlsBar) elClozeControlsBar.style.display = 'none';
    }

    // Render Options Container if question has options
    if (currentQ.options && currentQ.options.length > 0) {
      if (elOptionsContainer) {
        elOptionsContainer.style.display = 'block';
        elOptionsContainer.innerHTML = '';

        currentQ.options.forEach(opt => {
          const userChoice = qState.userChoices[opt.key];
          const optEl = document.createElement('div');
          optEl.className = 'option-card-item';

          if (qState.submitted) {
            const isUserCorrect = (userChoice === opt.is_correct);
            optEl.classList.add(isUserCorrect ? 'eval-correct' : 'eval-incorrect');
          }

          const isTrueSelected = (userChoice === true);
          const isFalseSelected = (userChoice === false);

          optEl.innerHTML = `
            <div class="option-row">
              <div class="opt-letter-badge">${opt.key.toUpperCase()}</div>
              <div class="option-content">
                ${renderDualLanguageText(opt.text_de, opt.text_tr)}
              </div>
              <div class="option-toggles">
                <button type="button" class="btn-toggle-tf btn-true ${isTrueSelected ? 'active' : ''}" ${qState.submitted ? 'disabled' : ''} data-key="${opt.key}">
                  ✅ Richtig
                </button>
                <button type="button" class="btn-toggle-tf btn-false ${isFalseSelected ? 'active' : ''}" ${qState.submitted ? 'disabled' : ''} data-key="${opt.key}">
                  ❌ Falsch
                </button>
              </div>
            </div>
            ${qState.submitted ? `
              <div class="option-result-box">
                <div class="truth-tag ${opt.is_correct ? 'truth-true' : 'truth-false'}">
                  Aussage ${opt.key.toUpperCase()} ist: <strong>${opt.is_correct ? '✅ RICHTIG' : '❌ FALSCH'}</strong>
                </div>
                <div class="explanation-text">
                  ${renderDualLanguageText(opt.explanation_de, opt.explanation_tr)}
                </div>
              </div>
            ` : ''}
          `;

          if (!qState.submitted) {
            const btnTrue = optEl.querySelector('.btn-true');
            const btnFalse = optEl.querySelector('.btn-false');

            btnTrue.addEventListener('click', (e) => {
              e.stopPropagation();
              qState.userChoices[opt.key] = true;
              state.answers[currentQ.id] = qState;
              saveState();
              renderCurrentQuestion();
            });

            btnFalse.addEventListener('click', (e) => {
              e.stopPropagation();
              qState.userChoices[opt.key] = false;
              state.answers[currentQ.id] = qState;
              saveState();
              renderCurrentQuestion();
            });
          }

          elOptionsContainer.appendChild(optEl);
        });
      }

      if (elBtnCheck) {
        elBtnCheck.style.display = 'inline-flex';
        if (qState.submitted) {
          elBtnCheck.innerHTML = `<span>🔄</span> Erneut versuchen`;
          elBtnCheck.className = 'btn btn-secondary';
        } else {
          elBtnCheck.innerHTML = `<span>✅</span> Antworten Auswerten`;
          elBtnCheck.className = 'btn btn-primary';
        }
      }
    } else {
      if (elOptionsContainer) {
        elOptionsContainer.innerHTML = '';
        elOptionsContainer.style.display = 'none';
      }
      if (elBtnCheck) elBtnCheck.style.display = 'none';
    }

    // ──────────────────────── MODE SPECIFIC DISPLAY STATES ────────────────────────
    if (mode === 'guideline') {
      // Mode B: "Spickzettel / Leitfaden" (Continuous Reading - everything open)
      if (elStepperIndicatorBar) elStepperIndicatorBar.style.display = 'none';
      if (elOralToolsBar) elOralToolsBar.style.display = 'none';
      toggleStep2(true);
      toggleStep3(true);
      if (elRevealContainer) elRevealContainer.style.display = 'none';
      if (elHighImpactRubric) elHighImpactRubric.style.display = 'flex';
      if (elSelfAssessContainer) elSelfAssessContainer.style.display = 'flex';

    } else if (mode === 'flashcard') {
      // Mode C: "Blitz-Karteikarten" (Flashcard cloze)
      if (elStepperIndicatorBar) elStepperIndicatorBar.style.display = 'none';
      if (elOralToolsBar) elOralToolsBar.style.display = 'none';
      toggleStep2(false);
      toggleStep3(false);
      if (elRevealContainer) elRevealContainer.style.display = 'none';
      if (elHighImpactRubric) elHighImpactRubric.style.display = 'flex';
      if (elSelfAssessContainer) elSelfAssessContainer.style.display = 'flex';

    } else {
      // Mode A: "Prüfer-Simulation" (Stepped disclosure)
      if (elStepperIndicatorBar) elStepperIndicatorBar.style.display = 'flex';
      if (elOralToolsBar) elOralToolsBar.style.display = 'flex';

      if (qState.revealed || qState.submitted) {
        if (elRevealContainer) elRevealContainer.style.display = 'none';
        if (elHighImpactRubric) elHighImpactRubric.style.display = 'flex';
        if (elSelfAssessContainer) elSelfAssessContainer.style.display = 'flex';
        toggleStep2(true);
        toggleStep3(true);
      } else {
        if (elRevealContainer) elRevealContainer.style.display = 'flex';
        if (elHighImpactRubric) elHighImpactRubric.style.display = 'none';
        if (elSelfAssessContainer) elSelfAssessContainer.style.display = 'none';
      }
    }

    // Self-assessment status buttons
    if (qState.submitted) {
      if (qState.isCorrect) {
        if (elBtnKnewIt) elBtnKnewIt.classList.add('selected');
        if (elBtnDidntKnow) elBtnDidntKnow.classList.remove('selected');
      } else {
        if (elBtnKnewIt) elBtnKnewIt.classList.remove('selected');
        if (elBtnDidntKnow) elBtnDidntKnow.classList.add('selected');
      }
    } else {
      if (elBtnKnewIt) elBtnKnewIt.classList.remove('selected');
      if (elBtnDidntKnow) elBtnDidntKnow.classList.remove('selected');
    }

    updateStepperIndicator();
    updateAnalytics();
  }

  // --- Reveal Answer (Open Q&A) ---
  function revealAnswer() {
    filteredQuestions = getFilteredQuestions();
    if (!filteredQuestions.length) return;

    const currentQ = filteredQuestions[state.currentIndex];
    let qState = state.answers[currentQ.id] || { userChoices: {}, submitted: false, revealed: false };

    qState.revealed = true;
    state.answers[currentQ.id] = qState;
    saveState();
    renderCurrentQuestion();
  }

  // --- Self Assessment (Open Q&A) ---
  function selfAssess(knewIt, qualityOverride) {
    filteredQuestions = getFilteredQuestions();
    if (!filteredQuestions.length) return;

    const currentQ = filteredQuestions[state.currentIndex];
    let qState = state.answers[currentQ.id] || { userChoices: {}, submitted: false, revealed: false };

    qState.submitted = true;
    qState.isCorrect = knewIt;
    state.answers[currentQ.id] = qState;

    // Automatic SuperMemo-2 Spaced Repetition calculation
    if (typeof SM2Engine !== 'undefined') {
      state.sm2Data = state.sm2Data || {};
      const quality = qualityOverride !== undefined ? qualityOverride : (knewIt ? 4 : 1);
      state.sm2Data[currentQ.id] = SM2Engine.calculateSM2(quality, state.sm2Data[currentQ.id]);
    }

    saveState();
    renderCurrentQuestion();
  }

  // --- Check & Submit Answer (Interactive Options Mode) ---
  function checkAnswer() {
    filteredQuestions = getFilteredQuestions();
    if (!filteredQuestions.length) return;

    const currentQ = filteredQuestions[state.currentIndex];
    let qState = state.answers[currentQ.id] || { userChoices: {}, submitted: false };

    if (qState.submitted) {
      // Reset for re-trying
      qState.submitted = false;
      qState.userChoices = {};
      state.answers[currentQ.id] = qState;
      saveState();
      renderCurrentQuestion();
      return;
    }

    // Check if user has answered all options
    const unAnsweredKeys = currentQ.options.filter(opt => qState.userChoices[opt.key] === undefined);
    if (unAnsweredKeys.length > 0) {
      const keysStr = unAnsweredKeys.map(o => o.key.toUpperCase()).join(', ');
      alert(`Bitte bewerten Sie alle Aussagen (Richtig oder Falsch) bevor Sie auswerten.\nNoch offen: ${keysStr}`);
      return;
    }

    // Calculate score
    let correctCount = 0;
    currentQ.options.forEach(opt => {
      if (qState.userChoices[opt.key] === opt.is_correct) {
        correctCount++;
      }
    });

    const totalOpts = currentQ.options.length;
    const isPassed = (correctCount / totalOpts) >= 0.8;

    qState.submitted = true;
    qState.isCorrect = isPassed;
    state.answers[currentQ.id] = qState;

    // Automatic SuperMemo-2 Spaced Repetition calculation for MCQ options
    if (typeof SM2Engine !== 'undefined') {
      state.sm2Data = state.sm2Data || {};
      const quality = isPassed ? 4 : 1;
      state.sm2Data[currentQ.id] = SM2Engine.calculateSM2(quality, state.sm2Data[currentQ.id]);
    }

    saveState();
    renderCurrentQuestion();
  }

  // --- Flag for Review / Wiederholen ---
  function toggleFlagForReview() {
    filteredQuestions = getFilteredQuestions();
    if (!filteredQuestions.length) return;

    const currentQ = filteredQuestions[state.currentIndex];
    state.flagged[currentQ.id] = !state.flagged[currentQ.id];

    saveState();
    renderCurrentQuestion();
  }

  // --- Update Analytics & Dashboard ---
  function updateAnalytics() {
    const total = EXAM_QUESTIONS.length;
    const answeredEntries = Object.values(state.answers).filter(a => a.submitted);
    const answeredCount = answeredEntries.length;
    const correctCount = answeredEntries.filter(a => a.isCorrect).length;
    const reviewCount = Object.values(state.flagged).filter(Boolean).length;

    const accuracyPct = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const progressPct = Math.round((answeredCount / total) * 100);

    if (elStatTotal) elStatTotal.textContent = total;
    if (elStatAnswered) elStatAnswered.textContent = answeredCount;
    if (elStatAccuracy) elStatAccuracy.textContent = `${accuracyPct}%`;
    if (elStatReview) elStatReview.textContent = reviewCount;
    if (elProgressBar) elProgressBar.style.width = `${progressPct}%`;

    const elStatProgressText = document.getElementById('stat-progress-text');
    if (elStatProgressText) {
      elStatProgressText.textContent = `${answeredCount} / ${total} (${progressPct}%)`;
    }

    // Streak calculations
    const elStatStreak = document.getElementById('stat-streak');
    const elStatSessionStreak = document.getElementById('stat-session-streak');
    if (elStatStreak) {
      const streakDays = Math.max(1, Math.min(answeredCount, 14));
      elStatStreak.textContent = answeredCount > 0 ? `${streakDays} Tage` : '0 Tage';
    }
    if (elStatSessionStreak) {
      const consecutive = Math.min(correctCount, 7);
      elStatSessionStreak.textContent = `⚡ ${consecutive} in Folge`;
    }

    const elStatHy = document.getElementById('stat-hy');
    if (elStatHy) {
      const hyCount = EXAM_QUESTIONS.filter(q => q.is_high_yield).length;
      elStatHy.textContent = hyCount;
    }

    // Daily Goal calculation
    const todayStr = new Date().toISOString().slice(0, 10);
    if (state.dailyDate !== todayStr) {
      state.dailyDate = todayStr;
      state.dailyCount = 0;
    }
    const elStatDailyGoal = document.getElementById('stat-daily-goal');
    const elDailyGoalBarFill = document.getElementById('daily-goal-bar-fill');
    if (elStatDailyGoal) {
      elStatDailyGoal.textContent = `${state.dailyCount || 0} / 20`;
    }
    if (elDailyGoalBarFill) {
      const goalPct = Math.min(100, Math.round(((state.dailyCount || 0) / 20) * 100));
      elDailyGoalBarFill.style.width = `${goalPct}%`;
    }
  }

  // ⌘K Search Shortcut listener
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (elSearchInput) elSearchInput.focus();
    }
  });

  // --- Render Direct Jump Modal Grid (Categorized by Topics) ---
  function openQuestionGridModal() {
    elQuestionGrid.innerHTML = '';
    
    const categories = Array.from(new Set(EXAM_QUESTIONS.map(q => q.category)));
    
    categories.forEach(cat => {
      const catQuestions = EXAM_QUESTIONS.filter(q => q.category === cat);
      if (!catQuestions.length) return;

      const block = document.createElement('div');
      block.className = 'q-grid-category-block';

      const title = document.createElement('div');
      title.className = 'grid-category-title';
      title.textContent = `${cat} (${catQuestions.length})`;
      block.appendChild(title);

      const gridSub = document.createElement('div');
      gridSub.className = 'question-grid';

      catQuestions.forEach(q => {
        const globalIdx = EXAM_QUESTIONS.findIndex(item => item.id === q.id) + 1;
        const btn = document.createElement('button');
        btn.className = 'q-grid-btn';
        btn.textContent = globalIdx;

        const qAns = state.answers[q.id];
        const isFlagged = !!state.flagged[q.id];

        if (isFlagged) {
          btn.classList.add('flagged-review');
        } else if (qAns && qAns.submitted) {
          if (qAns.isCorrect) {
            btn.classList.add('answered-correct');
          } else {
            btn.classList.add('answered-incorrect');
          }
        }

        const filteredIdx = filteredQuestions.findIndex(fq => fq.id === q.id);
        if (filteredIdx !== -1 && filteredIdx === state.currentIndex) {
          btn.classList.add('current');
        }

        btn.addEventListener('click', () => {
          if (filteredIdx === -1) {
            state.filterMode = 'all';
            state.categoryFilter = 'all';
            state.searchQuery = '';
            if (elSearchInput) elSearchInput.value = '';
            elCategoryFilter.value = 'all';
            elFilterChips.forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
            filteredQuestions = getFilteredQuestions();
          }
          
          const newIdx = filteredQuestions.findIndex(fq => fq.id === q.id);
          state.currentIndex = newIdx !== -1 ? newIdx : 0;
          saveState();
          renderCurrentQuestion();
          closeModal(elJumpModal);
        });

        gridSub.appendChild(btn);
      });

      block.appendChild(gridSub);
      elQuestionGrid.appendChild(block);
    });

    elJumpModal.classList.add('active');
  }

  function closeModal(modalEl) {
    modalEl.classList.remove('active');
  }

  // --- Automatic Cloud Auto-Sync Engine (RESTful API Cloud KV Store) ---
  const elBtnCloudSyncNow = document.getElementById('btn-cloud-sync-now');
  let cloudSyncTimer = null;

  function updateCloudSyncBadge(status) {
    if (!elCloudSyncStatus) return;
    if (status === 'syncing') {
      elCloudSyncStatus.className = 'cloud-sync-badge syncing';
      elCloudSyncStatus.innerHTML = '<span class="cloud-icon">🔄</span> <span class="cloud-text">Speichert...</span>';
    } else if (status === 'synced') {
      elCloudSyncStatus.className = 'cloud-sync-badge';
      elCloudSyncStatus.innerHTML = '<span class="cloud-icon">☁️</span> <span class="cloud-text">Synchronisiert</span>';
    } else if (status === 'offline') {
      elCloudSyncStatus.className = 'cloud-sync-badge offline';
      elCloudSyncStatus.innerHTML = '<span class="cloud-icon">📱</span> <span class="cloud-text">Lokaler Modus</span>';
    }
  }

  // Pull latest cloud state asynchronously on app boot
  async function syncFromCloud() {
    try {
      updateCloudSyncBadge('syncing');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const response = await fetch(CLOUD_SYNC_ENDPOINT, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json && json.data && json.data.state) {
          const cloudState = json.data.state;
          const cloudAnswered = Object.keys(cloudState.answers || {}).length;
          const localAnswered = Object.keys(state.answers || {}).length;

          // Merge if cloud state has more data or equal questions answered
          if (cloudAnswered >= localAnswered) {
            state = { ...state, ...cloudState };
            saveStateLocalOnly();
            updateAnalytics();
            renderCurrentQuestion();
          } else {
            pushToCloud();
          }
        }
        updateCloudSyncBadge('synced');
      } else {
        updateCloudSyncBadge('offline');
      }
    } catch (e) {
      updateCloudSyncBadge('offline');
    }
  }

  // Push local state to cloud with 600ms debounce
  function pushToCloudDebounced() {
    updateCloudSyncBadge('syncing');
    if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(() => {
      pushToCloud();
    }, 600);
  }

  async function pushToCloud() {
    try {
      const payload = {
        name: 'facharzt_sync_egemelis',
        data: {
          version: '2.0',
          updatedAt: new Date().toISOString(),
          state: state
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(CLOUD_SYNC_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        updateCloudSyncBadge('synced');
      } else {
        updateCloudSyncBadge('offline');
      }
    } catch (e) {
      updateCloudSyncBadge('offline');
    }
  }

  function saveStateLocalOnly() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  // --- LocalStorage & Device Synchronization Engine ---
  function saveState() {
    saveStateLocalOnly();
    pushToCloudDebounced();
  }

  function loadState() {
    try {
      let saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        saved = localStorage.getItem('facharzt_anaesthesie_state_v1');
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
      }
    } catch (e) {
      console.error('LocalStorage read error:', e);
    }

    document.documentElement.setAttribute('data-theme', state.theme);
    if (state.subtitleMode) {
      elSubToggle.classList.add('active');
    } else {
      elSubToggle.classList.remove('active');
    }

    if (state.studyMode) {
      if (elModeTabSim) elModeTabSim.classList.toggle('active', state.studyMode === 'simulation');
      if (elModeTabGuide) elModeTabGuide.classList.toggle('active', state.studyMode === 'guideline');
      if (elModeTabCloze) elModeTabCloze.classList.toggle('active', state.studyMode === 'flashcard');
    }

    // Trigger cloud auto-sync asynchronously
    syncFromCloud();
  }

  if (elBtnCloudSyncNow) {
    elBtnCloudSyncNow.addEventListener('click', async () => {
      await syncFromCloud();
      alert('☁️ Wolken-Synchronisation ausgeführt!');
    });
  }

  // --- Export Progress (JSON Backup) ---
  elBtnExportProgress.addEventListener('click', () => {
    const backupData = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      state: state
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facharzt_anaesthesie_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // --- Import Progress ---
  elBtnImportTrigger.addEventListener('click', () => elImportFileInput.click());

  elImportFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported && imported.state) {
          state = { ...state, ...imported.state };
          saveState();
          renderCurrentQuestion();
          alert('✅ Lernfortschritt erfolgreich importiert!');
          closeModal(elSettingsModal);
        } else {
          alert('❌ Ungültige Backup-Datei.');
        }
      } catch (err) {
        alert('❌ Fehler beim Lesen der Backup-Datei.');
      }
    };
    reader.readAsText(file);
  });

  // --- Confirmed Reset Progress ---
  elBtnResetProgress.addEventListener('click', () => {
    const confirmed = confirm("⚠️ Sind Sie sicher, dass Sie Ihren gesamten Lernfortschritt zurücksetzen möchten?\n\nAlle gespeicherten Antworten und Erfolgsstatistiken werden unwiderruflich gelöscht!");
    if (confirmed) {
      localStorage.removeItem(STORAGE_KEY);
      state.answers = {};
      state.flagged = {};
      state.userNotes = {};
      state.currentIndex = 0;
      saveState();
      updateAnalytics();
      renderCurrentQuestion();
      alert('🗑️ Lernfortschritt komplett zurückgesetzt.');
      closeModal(elSettingsModal);
    }
  });

  // --- Emergency Pocket Cards Modal ---
  const elPocketTrigger = document.getElementById('pocket-trigger');
  const elPocketCardsModal = document.getElementById('pocket-cards-modal');
  const elPocketModalClose = document.getElementById('pocket-modal-close');

  if (elPocketTrigger && elPocketCardsModal) {
    elPocketTrigger.addEventListener('click', () => elPocketCardsModal.classList.add('active'));
  }
  if (elPocketModalClose && elPocketCardsModal) {
    elPocketModalClose.addEventListener('click', () => closeModal(elPocketCardsModal));
  }

  // Pocket Cards Category Filter
  const elPocketFilterBar = document.getElementById('pocket-filter-bar');
  if (elPocketFilterBar && elPocketCardsModal) {
    const filterBtns = elPocketFilterBar.querySelectorAll('.pocket-filter-btn');
    const cardItems = elPocketCardsModal.querySelectorAll('.pocket-card-item');

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filterVal = btn.getAttribute('data-filter');

        cardItems.forEach(card => {
          if (filterVal === 'all') {
            card.classList.remove('hidden');
          } else {
            const cardCat = card.getAttribute('data-category') || '';
            if (cardCat.split(' ').includes(filterVal)) {
              card.classList.remove('hidden');
            } else {
              card.classList.add('hidden');
            }
          }
        });
      });
    });
  }

  // --- ÄKNO Düsseldorf Guide Modal ---
  const elAeknoGuideTrigger = document.getElementById('aekno-guide-trigger');
  const elAeknoGuideModal = document.getElementById('aekno-guide-modal');
  const elAeknoGuideModalClose = document.getElementById('aekno-guide-modal-close');

  if (elAeknoGuideTrigger && elAeknoGuideModal) {
    elAeknoGuideTrigger.addEventListener('click', () => elAeknoGuideModal.classList.add('active'));
  }
  if (elAeknoGuideModalClose && elAeknoGuideModal) {
    elAeknoGuideModalClose.addEventListener('click', () => closeModal(elAeknoGuideModal));
  }
  if (elAeknoGuideModal) {
    elAeknoGuideModal.addEventListener('click', (e) => {
      if (e.target === elAeknoGuideModal) closeModal(elAeknoGuideModal);
    });

    // Tab switching
    const guideTabBtns = elAeknoGuideModal.querySelectorAll('.aekno-tab-btn');
    const guidePanels = elAeknoGuideModal.querySelectorAll('.aekno-panel');
    guideTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        guideTabBtns.forEach(b => b.classList.remove('active'));
        guidePanels.forEach(p => {
          p.classList.remove('active');
          p.style.display = 'none';
        });
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        const targetPanel = document.getElementById(`aekno-panel-${tabId}`);
        if (targetPanel) {
          targetPanel.classList.add('active');
          targetPanel.style.display = 'block';
        }
      });
    });

    // Launch buttons
    const btnLaunchDus = document.getElementById('btn-launch-dus-cases');
    const btnLaunchHy = document.getElementById('btn-launch-aekno-hy');
    const btnLaunchMock = document.getElementById('btn-launch-mock-exam');

    if (btnLaunchDus) {
      btnLaunchDus.addEventListener('click', () => {
        closeModal(elAeknoGuideModal);
        const dusChip = document.querySelector('.filter-chip[data-filter="dus_examiners"]');
        if (dusChip) {
          dusChip.click();
        } else {
          state.filterMode = 'dus_examiners';
          state.currentIndex = 0;
          renderCurrentQuestion();
          renderStats();
        }
      });
    }
    if (btnLaunchHy) {
      btnLaunchHy.addEventListener('click', () => {
        closeModal(elAeknoGuideModal);
        const hyChip = document.querySelector('.filter-chip[data-filter="high_yield"]');
        if (hyChip) {
          hyChip.click();
        } else {
          state.filterMode = 'high_yield';
          state.currentIndex = 0;
          renderCurrentQuestion();
          renderStats();
        }
      });
    }
    if (btnLaunchMock) {
      btnLaunchMock.addEventListener('click', () => {
        closeModal(elAeknoGuideModal);
        const mockBtn = document.getElementById('mock-exam-trigger');
        if (mockBtn) mockBtn.click();
      });
    }
  }

  // --- Clinical Anesthesia Calculator Modal ---
  const elCalcTrigger = document.getElementById('calc-trigger');
  const elCalcModal = document.getElementById('calc-modal');
  const elCalcModalClose = document.getElementById('calc-modal-close');

  if (elCalcTrigger && elCalcModal) {
    elCalcTrigger.addEventListener('click', () => {
      elCalcModal.classList.add('active');
      recalculateAllMedicalCalculators();
    });
  }
  if (elCalcModalClose && elCalcModal) {
    elCalcModalClose.addEventListener('click', () => closeModal(elCalcModal));
  }

  // Calculator Tabs
  const elCalcTabBar = document.getElementById('calc-tab-bar');
  if (elCalcTabBar && elCalcModal) {
    const tabBtns = elCalcTabBar.querySelectorAll('.calc-tab-btn');
    const panels = {
      peds: document.getElementById('calc-panel-peds'),
      ards: document.getElementById('calc-panel-ards'),
      la: document.getElementById('calc-panel-la'),
      na: document.getElementById('calc-panel-na')
    };

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-tab');

        Object.keys(panels).forEach(key => {
          if (panels[key]) {
            panels[key].style.display = (key === tab) ? 'block' : 'none';
          }
        });
      });
    });
  }

  // Pediatric Calc Inputs
  const elPedsAge = document.getElementById('peds-age-input');
  const elPedsWeight = document.getElementById('peds-weight-input');
  const elPedsResults = document.getElementById('peds-calc-results');

  if (elPedsAge && elPedsWeight) {
    elPedsAge.addEventListener('input', () => {
      const age = parseFloat(elPedsAge.value) || 0;
      if (age > 0) {
        elPedsWeight.value = Math.round((age + 4) * 2);
      }
      calcPediatrics();
    });
    elPedsWeight.addEventListener('input', calcPediatrics);
  }

  function calcPediatrics() {
    if (!elPedsResults) return;
    const age = parseFloat(elPedsAge ? elPedsAge.value : 4) || 4;
    const wt = parseFloat(elPedsWeight ? elPedsWeight.value : 16) || 16;

    const uncuffed = (age / 4) + 4.0;
    const cuffed = (age / 4) + 3.5;
    const depth = (age / 2) + 12;
    const adrMg = (wt * 0.01).toFixed(2);
    const adrMl = (wt * 0.1).toFixed(1);
    const atropin = Math.max(0.1, wt * 0.02).toFixed(2);
    const rocuronium = (wt * 0.6).toFixed(1);
    const rocuroniumRSI = (wt * 1.0).toFixed(1);
    const defib = Math.round(wt * 4);
    const fluidsMin = Math.round(wt * 10);
    const fluidsMax = Math.round(wt * 20);

    elPedsResults.innerHTML = `
      <div class="calc-card-metric highlight-safe">
        <div class="calc-metric-title">🫁 Tubus gecufft / unblockt</div>
        <div class="calc-metric-value">${cuffed.toFixed(1)} mm <small style="font-size: 0.8rem; font-weight: normal;">(uncuffed: ${uncuffed.toFixed(1)})</small></div>
        <div class="calc-metric-note">Einführtiefe Zähne: <strong>ca. ${depth.toFixed(1)} cm</strong> (Formel: ID × 3)</div>
      </div>
      <div class="calc-card-metric highlight-alert">
        <div class="calc-metric-title">🚨 Adrenalin Notfall (ALS)</div>
        <div class="calc-metric-value">${adrMg} mg <small style="font-size: 0.8rem; font-weight: normal;">(= ${adrMl} ml 1:10.000)</small></div>
        <div class="calc-metric-note">10 µg/kg i.v. alle 3–5 Min bei Kreislaufstillstand</div>
      </div>
      <div class="calc-card-metric">
        <div class="calc-metric-title">❤️ Atropin (Bradykardie)</div>
        <div class="calc-metric-value">${atropin} mg</div>
        <div class="calc-metric-note">20 µg/kg i.v. (Mindestdosis: 0.1 mg gegen paradoxe Bradykardie)</div>
      </div>
      <div class="calc-card-metric">
        <div class="calc-metric-title">⚡ Defibrillation (VF/pVT)</div>
        <div class="calc-metric-value">${defib} Joule</div>
        <div class="calc-metric-note">4 J/kg biphasisch ab 1. Schock</div>
      </div>
      <div class="calc-card-metric">
        <div class="calc-metric-title">💊 Rocuronium</div>
        <div class="calc-metric-value">${rocuronium} mg <small style="font-size: 0.8rem; font-weight: normal;">(RSI: ${rocuroniumRSI} mg)</small></div>
        <div class="calc-metric-note">0.6 mg/kg elektiv, 1.0 mg/kg für RSI (Sugammadex bereit!)</div>
      </div>
      <div class="calc-card-metric">
        <div class="calc-metric-title">💧 Flüssigkeitsbolus</div>
        <div class="calc-metric-value">${fluidsMin} – ${fluidsMax} ml</div>
        <div class="calc-metric-note">10–20 ml/kg kristalloide Vollelektrolytlösung</div>
      </div>
    `;
  }

  // ARDS Calc Inputs
  const elArdsGender = document.getElementById('ards-gender-input');
  const elArdsHeight = document.getElementById('ards-height-input');
  const elArdsResults = document.getElementById('ards-calc-results');

  if (elArdsGender && elArdsHeight) {
    elArdsGender.addEventListener('change', calcArds);
    elArdsHeight.addEventListener('input', calcArds);
  }

  function calcArds() {
    if (!elArdsResults) return;
    const gender = elArdsGender ? elArdsGender.value : 'male';
    const height = parseFloat(elArdsHeight ? elArdsHeight.value : 175) || 175;

    const base = (gender === 'male') ? 50.0 : 45.5;
    const pbw = Math.max(30, base + 0.91 * (height - 152.4));
    const vt6 = Math.round(pbw * 6);
    const vt8 = Math.round(pbw * 8);

    elArdsResults.innerHTML = `
      <div class="calc-card-metric highlight-safe">
        <div class="calc-metric-title">⚖️ Predicted Body Weight (PBW)</div>
        <div class="calc-metric-value">${pbw.toFixed(1)} kg</div>
        <div class="calc-metric-note">Devine-Formel basierend auf Körpergröße ${height} cm</div>
      </div>
      <div class="calc-card-metric highlight-safe">
        <div class="calc-metric-title">🫁 Lungenprotektives VT (6 ml/kg)</div>
        <div class="calc-metric-value">${vt6} ml</div>
        <div class="calc-metric-note"><strong>Goldstandard:</strong> Striktes ARDSNet-Zielvolumen</div>
      </div>
      <div class="calc-card-metric">
        <div class="calc-metric-title">🫁 Moderates VT (8 ml/kg)</div>
        <div class="calc-metric-value">${vt8} ml</div>
        <div class="calc-metric-note">Obergrenze bei nicht-geschädigter Lunge</div>
      </div>
      <div class="calc-card-metric highlight-alert">
        <div class="calc-metric-title">⚠️ Driving Pressure Limit</div>
        <div class="calc-metric-value">ΔP ≤ 14 cmH₂O</div>
        <div class="calc-metric-note">ΔP = P_plat – PEEP. Bei Überschreitung: Mortalität ↑</div>
      </div>
    `;
  }

  // LA Calc Inputs
  const elLaWeight = document.getElementById('la-weight-input');
  const elLaResults = document.getElementById('la-calc-results');

  if (elLaWeight) {
    elLaWeight.addEventListener('input', calcLA);
  }

  function calcLA() {
    if (!elLaResults) return;
    const wt = parseFloat(elLaWeight ? elLaWeight.value : 70) || 70;

    const ropi = Math.min(300, Math.round(wt * 3.0));
    const bupi = Math.min(150, Math.round(wt * 2.0));
    const lidoPur = Math.min(300, Math.round(wt * 4.0));
    const lidoAdr = Math.min(500, Math.round(wt * 7.0));
    const prilo = Math.min(500, Math.round(wt * 6.0));
    const lipidBolus = Math.round(wt * 1.5);

    elLaResults.innerHTML = `
      <div class="calc-card-metric">
        <div class="calc-metric-title">💉 Ropivacain (max. 3 mg/kg)</div>
        <div class="calc-metric-value">${ropi} mg</div>
        <div class="calc-metric-note">Max. Höchstdosis für ${wt} kg (absolute Obergrenze 225–300 mg)</div>
      </div>
      <div class="calc-card-metric highlight-alert">
        <div class="calc-metric-title">💉 Bupivacain (max. 2 mg/kg)</div>
        <div class="calc-metric-value">${bupi} mg</div>
        <div class="calc-metric-note">Kardiotoxisch! Absolute Obergrenze 150 mg beachten!</div>
      </div>
      <div class="calc-card-metric">
        <div class="calc-metric-title">💉 Lidocain (pur vs. Adrenalin)</div>
        <div class="calc-metric-value">${lidoPur} mg <small style="font-size: 0.8rem; font-weight: normal;">(+Adr: ${lidoAdr} mg)</small></div>
        <div class="calc-metric-note">4 mg/kg pur, 7 mg/kg mit Vasokonstriktor-Zusatz</div>
      </div>
      <div class="calc-card-metric">
        <div class="calc-metric-title">💉 Prilocain (max. 6 mg/kg)</div>
        <div class="calc-metric-value">${prilo} mg</div>
        <div class="calc-metric-note">Cave: Methämoglobinämie! (Antidot: Toluidinblau 2–4 mg/kg)</div>
      </div>
      <div class="calc-card-metric highlight-alert">
        <div class="calc-metric-title">🧴 Intralipid 20% Rescue-Bolus</div>
        <div class="calc-metric-value">${lipidBolus} ml i.v.</div>
        <div class="calc-metric-note">1.5 ml/kg über 1 Min bei LAST, danach 0.25 ml/kg/min</div>
      </div>
    `;
  }

  // Sodium Calc Inputs
  const elNaDemog = document.getElementById('na-demog-input');
  const elNaWeight = document.getElementById('na-weight-input');
  const elNaCurrent = document.getElementById('na-current-input');
  const elNaResults = document.getElementById('na-calc-results');

  if (elNaDemog && elNaWeight && elNaCurrent) {
    elNaDemog.addEventListener('change', calcSodium);
    elNaWeight.addEventListener('input', calcSodium);
    elNaCurrent.addEventListener('input', calcSodium);
  }

  function calcSodium() {
    if (!elNaResults) return;
    const demog = elNaDemog ? elNaDemog.value : 'male';
    const wt = parseFloat(elNaWeight ? elNaWeight.value : 70) || 70;
    const naCur = parseFloat(elNaCurrent ? elNaCurrent.value : 118) || 118;

    let factor = 0.6;
    if (demog === 'female') factor = 0.5;
    else if (demog === 'elderly_male') factor = 0.5;
    else if (demog === 'elderly_female') factor = 0.45;

    const tbw = wt * factor;
    const deficit = Math.max(0, Math.round(tbw * (140 - naCur)));
    const maxDayNa = (naCur + 8).toFixed(0);

    elNaResults.innerHTML = `
      <div class="calc-card-metric highlight-safe">
        <div class="calc-metric-title">💧 Gesamtkörperwasser (TBW)</div>
        <div class="calc-metric-value">${tbw.toFixed(1)} Liter</div>
        <div class="calc-metric-note">${(factor * 100).toFixed(0)}% des Körpergewichts (${wt} kg)</div>
      </div>
      <div class="calc-card-metric">
        <div class="calc-metric-title">🧪 Berechnetes Na⁺-Defizit</div>
        <div class="calc-metric-value">${deficit} mmol</div>
        <div class="calc-metric-note">Bis zur Norm (140 mmol/l). Formel: TBW × (140 – Na_ist)</div>
      </div>
      <div class="calc-card-metric highlight-alert">
        <div class="calc-metric-title">🛑 Max. 24h-Zielgrenze</div>
        <div class="calc-metric-value">≤ ${maxDayNa} mmol/l</div>
        <div class="calc-metric-note"><strong>Max. +8 bis 10 mmol/l pro 24h!</strong> Gefahr der pontinen Myelinolyse (ODS) bei zu raschem Ausgleich!</div>
      </div>
    `;
  }

  function recalculateAllMedicalCalculators() {
    calcPediatrics();
    calcArds();
    calcLA();
    calcSodium();
  }

  // --- Audio Speech Reader ---
  const elBtnAudioSpeak = document.getElementById('btn-audio-speak');
  if (elBtnAudioSpeak) {
    elBtnAudioSpeak.addEventListener('click', () => {
      if ('speechSynthesis' in window) {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          elBtnAudioSpeak.classList.remove('speaking');
          return;
        }

        filteredQuestions = getFilteredQuestions();
        if (!filteredQuestions.length) return;
        const currentQ = filteredQuestions[state.currentIndex];
        const textToRead = currentQ.stem_de || currentQ.question_de || '';

        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'de-DE';
        utterance.rate = 0.95;

        utterance.onstart = () => elBtnAudioSpeak.classList.add('speaking');
        utterance.onend = () => elBtnAudioSpeak.classList.remove('speaking');
        utterance.onerror = () => elBtnAudioSpeak.classList.remove('speaking');

        window.speechSynthesis.speak(utterance);
      } else {
        alert('🔊 Vorlesefunktion wird von Ihrem Browser leider nicht unterstützt.');
      }
    });
  }

  // --- Printable PDF Study Summary ---
  const elBtnPrintSummary = document.getElementById('btn-print-summary');
  if (elBtnPrintSummary) {
    elBtnPrintSummary.addEventListener('click', () => {
      const flaggedIds = Object.keys(state.flagged).filter(id => state.flagged[id]);
      const flaggedQuestions = EXAM_QUESTIONS.filter(q => flaggedIds.includes(q.id));

      if (!flaggedQuestions.length) {
        alert('📄 Sie haben derzeit keine Fragen mit ★ Wiederholen markiert.');
        return;
      }

      let printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Facharzt Anästhesie - Spickzettel & Zusammenfassung</title>
          <style>
            body { font-family: sans-serif; padding: 20px; line-height: 1.5; color: #1e293b; }
            h1 { color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 8px; }
            .q-box { border: 1px solid #cbd5e1; padding: 12px; margin-bottom: 16px; border-radius: 6px; page-break-inside: avoid; }
            .q-title { font-weight: bold; color: #0f172a; margin-bottom: 6px; }
            .q-ans { background: #f1f5f9; padding: 8px; border-radius: 4px; font-size: 0.9em; margin-top: 6px; }
            .q-note { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 6px 10px; font-size: 0.88em; margin-top: 6px; }
          </style>
        </head>
        <body>
          <h1>⚕️ Facharztprüfung Anästhesiologie - Spickzettel (${flaggedQuestions.length} Fragen)</h1>
          <p>Erstellt für Dr. Melis Engin am ${new Date().toLocaleDateString('de-DE')}</p>
      `;

      flaggedQuestions.forEach((q, idx) => {
        const stem = q.stem_de || q.question_de || '';
        const ans = q.answer_de || q.explanation_de || '';
        const note = state.userNotes ? state.userNotes[q.id] : '';

        printHtml += `
          <div class="q-box">
            <div class="q-title">${idx + 1}. [${q.category}] ${stem}</div>
            <div class="q-ans"><strong>Antwort:</strong> ${ans}</div>
            ${note ? `<div class="q-note"><strong>Eigene Notiz:</strong> ${note}</div>` : ''}
          </div>
        `;
      });

      printHtml += `</body></html>`;

      const printWin = window.open('', '_blank');
      printWin.document.write(printHtml);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => printWin.print(), 500);
    });
  }

  // --- Navigation & UI Handlers ---
  elBtnNext.addEventListener('click', () => {
    if (state.currentIndex < filteredQuestions.length - 1) {
      state.currentIndex++;
      saveState();
      renderCurrentQuestion();
    }
  });

  elBtnPrev.addEventListener('click', () => {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      saveState();
      renderCurrentQuestion();
    }
  });

  elBtnCheck.addEventListener('click', checkAnswer);
  elBtnReview.addEventListener('click', toggleFlagForReview);
  elBtnReveal.addEventListener('click', revealAnswer);
  elBtnKnewIt.addEventListener('click', () => selfAssess(true));
  elBtnDidntKnow.addEventListener('click', () => selfAssess(false));

  // --- Personal Medical Notes Auto-Save & Cloud Sync Engine ---
  const elUserNoteText = document.getElementById('user-note-text');
  const elBtnSaveNote = document.getElementById('btn-save-note');
  const elNoteSaveToast = document.getElementById('note-save-toast');

  if (elBtnSaveNote) {
    elBtnSaveNote.addEventListener('click', () => {
      filteredQuestions = getFilteredQuestions();
      if (!filteredQuestions.length) return;
      const currentQ = filteredQuestions[state.currentIndex];
      const noteVal = elUserNoteText ? elUserNoteText.value.trim() : '';

      if (!state.userNotes) state.userNotes = {};
      state.userNotes[currentQ.id] = noteVal;

      saveState(); // Saves locally & pushes to cloud debounced!

      if (elNoteSaveToast) {
        elNoteSaveToast.style.display = 'inline-block';
        setTimeout(() => {
          if (elNoteSaveToast) elNoteSaveToast.style.display = 'none';
        }, 2500);
      }
    });
  }

  if (elUserNoteText) {
    elUserNoteText.addEventListener('input', () => {
      filteredQuestions = getFilteredQuestions();
      if (!filteredQuestions.length) return;
      const currentQ = filteredQuestions[state.currentIndex];
      if (!state.userNotes) state.userNotes = {};
      state.userNotes[currentQ.id] = elUserNoteText.value;
      saveState(); // Auto-saves to local & cloud on every keystroke!
    });
  }

  if (elThemeToggle) {
    // Restore saved theme on load
    if (state.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      elThemeToggle.querySelector('span').textContent = '☀️';
      elThemeToggle.classList.add('active');
    }
    elThemeToggle.addEventListener('click', () => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', state.theme);
      elThemeToggle.querySelector('span').textContent = state.theme === 'dark' ? '☀️' : '🌙';
      elThemeToggle.classList.toggle('active', state.theme === 'dark');
      saveState();
    });
  }

  if (elSubToggle) {
    elSubToggle.addEventListener('click', () => {
      state.subtitleMode = !state.subtitleMode;
      elSubToggle.classList.toggle('active', state.subtitleMode);
      saveState();
      renderCurrentQuestion();
    });
  }

  // Jump & Settings Modals
  if (elGridTrigger) elGridTrigger.addEventListener('click', openQuestionGridModal);
  if (elJumpModalClose && elJumpModal) elJumpModalClose.addEventListener('click', () => closeModal(elJumpModal));
  if (elJumpModal) {
    elJumpModal.addEventListener('click', (e) => {
      if (e.target === elJumpModal) closeModal(elJumpModal);
    });
  }

  if (elSettingsTrigger && elSettingsModal) elSettingsTrigger.addEventListener('click', () => elSettingsModal.classList.add('active'));
  if (elSettingsModalClose && elSettingsModal) elSettingsModalClose.addEventListener('click', () => closeModal(elSettingsModal));
  if (elSettingsModal) {
    elSettingsModal.addEventListener('click', (e) => {
      if (e.target === elSettingsModal) closeModal(elSettingsModal);
    });
  }

  // Filter Chips
  if (elFilterChips) {
    elFilterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        elFilterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.filterMode = chip.dataset.filter;
        state.currentIndex = 0;
        saveState();
        renderCurrentQuestion();
      });
    });
  }

  // Category Filter Dropdown
  if (elCategoryFilter) {
    elCategoryFilter.addEventListener('change', (e) => {
      state.categoryFilter = e.target.value;
      state.currentIndex = 0;
      saveState();
      renderCurrentQuestion();
    });
  }

  // Practice Mode Dropdown
  if (elModeSelect) {
    elModeSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'simulation') {
        startExamSimulation();
      } else {
        stopExamSimulation(false);
        state.randomOrder = (val === 'random');
        if (state.randomOrder) {
          filteredQuestions.sort(() => Math.random() - 0.5);
        }
      }
      state.currentIndex = 0;
      saveState();
      renderCurrentQuestion();
    });
  }

  // --- 45-MIN TIMED MOCK ORAL EXAM MODAL CONTROLLER ---
  const elMockExamModal = document.getElementById('mock-exam-modal');
  const elMockExamTrigger = document.getElementById('mock-exam-trigger');
  const elMockExamClose = document.getElementById('mock-exam-close');
  const elMockTimerDisplay = document.getElementById('mock-timer-display');
  const elMockCaseTabs = document.getElementById('mock-case-tabs');
  const elMockExamBodyContent = document.getElementById('mock-exam-body-content');
  const elMockExamReport = document.getElementById('mock-exam-report');

  let mockExamEngine = null;
  if (typeof MockExamSimulation !== 'undefined') {
    mockExamEngine = new MockExamSimulation(EXAM_QUESTIONS);
  }

  function renderMockExamHUD() {
    if (!mockExamEngine || !elMockCaseTabs) return;
    elMockCaseTabs.innerHTML = '';
    mockExamEngine.activeCases.forEach((c, idx) => {
      const btn = document.createElement('button');
      btn.className = 'mock-tab-btn' + (idx === mockExamEngine.currentCaseIndex ? ' active' : '');
      const isScored = !!mockExamEngine.scores[idx];
      btn.textContent = `Fall ${idx + 1}` + (isScored ? ' ✓' : '');
      btn.addEventListener('click', () => {
        mockExamEngine.currentCaseIndex = idx;
        renderMockExamActiveCase();
      });
      elMockCaseTabs.appendChild(btn);
    });
  }

  function renderMockExamActiveCase() {
    renderMockExamHUD();
    if (!mockExamEngine || !elMockExamBodyContent) return;
    const activeQ = mockExamEngine.activeCases[mockExamEngine.currentCaseIndex];
    if (!activeQ) return;

    if (elMockExamReport) elMockExamReport.style.display = 'none';
    elMockExamBodyContent.style.display = 'block';

    const parsed = parseOralExamCase(activeQ);

    elMockExamBodyContent.innerHTML = `
      <div class="mock-case-view" style="background: var(--bg-secondary); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span style="font-weight: 700; font-size: 0.85rem; color: var(--accent-color); text-transform: uppercase;">
            Fall ${mockExamEngine.currentCaseIndex + 1} von 4 &bull; ${parsed.clinicalContext}
          </span>
          <span style="font-size: 0.8rem; color: var(--text-muted);">${activeQ.category}</span>
        </div>

        <h3 style="margin-bottom: 1rem; font-size: 1.1rem; line-height: 1.5;">${parsed.stem}</h3>

        <div style="background: var(--bg-tertiary); padding: 0.85rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.88rem;">
          <strong>📊 Vitalparameter & Befunde:</strong> ${parsed.vitals.notes} <br>
          <small style="color: var(--text-secondary);">SpO2: ${parsed.vitals.spo2} | RR: ${parsed.vitals.bp} | HF: ${parsed.vitals.hr} | etCO2: ${parsed.vitals.etco2} | Temp: ${parsed.vitals.temp}</small>
        </div>

        <div style="background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; padding: 0.75rem; border-radius: 4px; margin-bottom: 1.25rem; font-size: 0.88rem;">
          <strong>⚠️ Prüfer-Intervention:</strong> ${parsed.examinerIntervention}
        </div>

        <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 1rem;">
          <h4 style="margin-bottom: 0.5rem; font-size: 0.95rem;">🗣️ Prüfungs-Bewertung für Fall ${mockExamEngine.currentCaseIndex + 1}:</h4>
          <div class="sm2-btn-group">
            <button class="sm2-btn hard" data-rating="1">🔴 Mangelhaft (Note 5)</button>
            <button class="sm2-btn good" data-rating="3">🟡 Befriedigend (Note 3)</button>
            <button class="sm2-btn easy" data-rating="5">🟢 Sehr Gut (Note 1)</button>
          </div>
        </div>
      </div>
    `;

    const ratingBtns = elMockExamBodyContent.querySelectorAll('.sm2-btn');
    ratingBtns.forEach(b => {
      b.addEventListener('click', (e) => {
        const rating = parseInt(e.currentTarget.dataset.rating, 10);
        mockExamEngine.recordCaseScore(mockExamEngine.currentCaseIndex, rating, 4, 4);

        if (mockExamEngine.currentCaseIndex < 3) {
          mockExamEngine.nextCase();
          renderMockExamActiveCase();
        } else {
          showMockExamSummary();
        }
      });
    });
  }

  function showMockExamSummary() {
    if (!mockExamEngine || !elMockExamReport) return;
    const summary = mockExamEngine.finishExam();

    if (elMockExamBodyContent) elMockExamBodyContent.style.display = 'none';
    elMockExamReport.style.display = 'block';

    let scoresHtml = summary.scores.map((s, idx) => {
      if (!s) return '';
      return `<div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
        <span>Fall ${idx + 1}: ${s.title.substring(0, 45)}...</span>
        <strong>Bewertung: ${s.rating === 5 ? '🟢 Sehr Gut (1.0)' : (s.rating === 3 ? '🟡 Befriedigend (3.0)' : '🔴 Mangelhaft (5.0)')}</strong>
      </div>`;
    }).join('');

    elMockExamReport.innerHTML = `
      <div style="text-align: center; padding: 1.5rem; background: var(--bg-tertiary); border-radius: 8px;">
        <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem;">${summary.statusText}</h2>
        <div style="font-size: 1.2rem; font-weight: 700; color: var(--accent-color); margin-bottom: 1rem;">${summary.grade}</div>
        <p style="color: var(--text-secondary); margin-bottom: 1.25rem;">Benötigte Prüfungszeit: ${Math.floor(summary.timeSpentSeconds / 60)} Min. ${summary.timeSpentSeconds % 60} Sek.</p>

        <div style="text-align: left; max-width: 600px; margin: 0 auto 1.5rem auto;">
          ${scoresHtml}
        </div>

        <button id="btn-mock-restart" class="btn btn-primary" style="padding: 0.75rem 1.5rem;">⏱️ Neue Prüfungssimulation starten</button>
      </div>
    `;

    const btnRestart = document.getElementById('btn-mock-restart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        if (mockExamEngine) {
          mockExamEngine.startNewExam();
          renderMockExamActiveCase();
        }
      });
    }
  }

  if (elMockExamTrigger && elMockExamModal) {
    elMockExamTrigger.addEventListener('click', () => {
      elMockExamModal.classList.add('active');
      if (mockExamEngine) {
        mockExamEngine.onTickCallback = (secs, formatted) => {
          if (elMockTimerDisplay) {
            elMockTimerDisplay.textContent = formatted;
            if (secs < 300) {
              elMockTimerDisplay.className = 'hud-timer danger';
            } else if (secs < 600) {
              elMockTimerDisplay.className = 'hud-timer warning';
            } else {
              elMockTimerDisplay.className = 'hud-timer';
            }
          }
        };

        mockExamEngine.onFinishCallback = () => {
          showMockExamSummary();
        };

        mockExamEngine.startNewExam();
        renderMockExamActiveCase();
      }
    });
  }

  if (elMockExamClose && elMockExamModal) {
    elMockExamClose.addEventListener('click', () => {
      closeModal(elMockExamModal);
      if (mockExamEngine) mockExamEngine.stopTimer();
    });
  }

  // --- Diagnostic Image Lightbox & Zoom Engine ---
  function initImageLightbox() {
    let lightboxModal = document.getElementById('image-lightbox-modal');
    if (!lightboxModal) {
      lightboxModal = document.createElement('div');
      lightboxModal.id = 'image-lightbox-modal';
      lightboxModal.className = 'modal-backdrop';
      lightboxModal.style.display = 'none';
      lightboxModal.innerHTML = `
        <div class="modal-card" style="max-width: 95vw; max-height: 95vh; background: rgba(0,0,0,0.95); border: 1px solid var(--border-color); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; padding: 1.5rem;">
          <button class="modal-close" id="lightbox-close" style="position: absolute; top: 12px; right: 16px; color: #fff; font-size: 1.8rem; cursor: pointer; background: transparent; border: none; z-index: 10;">&times;</button>
          <img id="lightbox-img" src="" alt="Befund-Vergrößerung" style="max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.6);" />
          <div id="lightbox-caption" style="color: #e2e8f0; margin-top: 12px; font-size: 0.95rem; text-align: center; font-weight: 500;"></div>
        </div>
      `;
      document.body.appendChild(lightboxModal);

      const closeLightbox = () => {
        lightboxModal.classList.remove('active');
        setTimeout(() => {
          lightboxModal.style.display = 'none';
        }, 250);
      };

      const closeBtn = document.getElementById('lightbox-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', closeLightbox);
      }
      lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal) closeLightbox();
      });
    }

    document.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('question-image')) {
        const imgSrc = e.target.src;
        if (!imgSrc) return;
        const imgAlt = e.target.alt || 'Klinischer Befund';
        const lightboxImg = document.getElementById('lightbox-img');
        const lightboxCaption = document.getElementById('lightbox-caption');

        if (lightboxImg) lightboxImg.src = imgSrc;
        if (lightboxCaption) lightboxCaption.textContent = imgAlt;
        lightboxModal.style.display = 'flex';
        setTimeout(() => lightboxModal.classList.add('active'), 10);
      }
    });
  }

  // Initializing App
  initCategoryDropdown();
  initImageLightbox();
  updateAnalytics();
  renderCurrentQuestion();
});


