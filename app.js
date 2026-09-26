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
    subtitleMode: false, // Default collapsed so page is clean & uncluttered; user can click small button directly below or press U
    filterMode: 'all',  // 'all', 'unanswered', 'incorrect', 'review'
    typeFilter: 'all',    // 'all', 'options', 'open', 'image'
    categoryFilter: 'all',
    randomOrder: false,
    studyMode: 'simulation', // 'simulation' (Mode A), 'guideline' (Mode B), 'flashcard' (Mode C)
    userNotes: {},
    speechRate: 0.95,        // 0.8x, 0.95x, 1.15x
    preferredVoiceName: localStorage.getItem('facharzt_preferred_voice') || '',
    speechPitch: 1.0,
    stepState: {}      // { [qId]: { step: 1..4, vitalsOpen: bool, examinerOpen: bool, revealed: bool, clozesUnmasked: bool } }
  };

  let filteredQuestions = [];

  // --- Runtime Timers & Speech State (Declared early to prevent TDZ ReferenceErrors) ---
  let examSimulationTimeLeft = 45 * 60;
  let examSimulationTimerId = null;
  let stepTimer = {
    secondsLeft: 60,
    interval: null,
    isRunning: false
  };
  let speechRecognizer = null;
  let isRecordingVoice = false;
  let finalSpokenTranscript = '';

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
  const elSearchInput = document.getElementById('search-input');
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

  // Simulation HUD & Timers
  const elExamSimulationBar = document.getElementById('exam-simulation-bar');
  const elSimCaseCounter = document.getElementById('sim-case-counter');
  const elExamTimer = document.getElementById('exam-timer');
  const elBtnSimAnswerTimer = document.getElementById('btn-sim-answer-timer');
  const elSimAnswerTimerDisplay = document.getElementById('sim-answer-timer-display');
  const elBtnStopExam = document.getElementById('btn-stop-exam');

  // Stepper & Oral Tools Elements
  const elStepperIndicatorBar = document.getElementById('stepper-indicator-bar');
  const elOralToolsBar = document.getElementById('oral-tools-bar');
  const elBtnToggleTimer = document.getElementById('btn-toggle-timer');
  const elTimerDisplayText = document.getElementById('timer-display-text');
  const elTimerMiniBar = document.getElementById('timer-progress-ring');
  const elTimerMiniFill = document.getElementById('timer-mini-fill');
  const elBtnToggleMic = document.getElementById('btn-toggle-mic');
  const elMicStatusText = document.getElementById('mic-status-text');
  const elAudioWaveVisualizer = document.getElementById('audio-wave-visualizer');
  const elSpeechTranscriptBox = document.getElementById('speech-transcript-box');
  const elSpeechTranscriptInput = document.getElementById('speech-transcript-input');
  const elSpeechTranscriptText = document.getElementById('speech-transcript-text');
  const elBtnClearTranscript = document.getElementById('btn-clear-transcript');
  const elBtnEvaluateVoice = document.getElementById('btn-evaluate-voice');
  const elBtnQuickReveal = document.getElementById('btn-quick-reveal');
  const elVoiceEvalCard = document.getElementById('voice-eval-card');
  const elEvalScoreBadge = document.getElementById('eval-score-badge');
  const elEvalStatusMsg = document.getElementById('eval-status-msg');
  const elEvalMatchedTags = document.getElementById('eval-matched-tags');
  const elEvalMissedTags = document.getElementById('eval-missed-tags');
  
  // ÄKNO Live Simulation Cockpit Elements
  const elSimLiveCockpit = document.getElementById('sim-live-cockpit');
  const elSimExaminerAvatar = document.getElementById('sim-examiner-avatar');
  const elSimExaminerName = document.getElementById('sim-examiner-name');
  const elSimExaminerClinic = document.getElementById('sim-examiner-clinic');
  const elBtnSimSpeakStem = document.getElementById('btn-sim-speak-stem');
  const elBtnSimPeekStem = document.getElementById('btn-sim-peek-stem');
  const elSimPeekLabel = document.getElementById('sim-peek-label');
  const elBtnSimTriggerCrisis = document.getElementById('btn-sim-trigger-crisis');
  const elSimRhetoricPrompter = document.getElementById('sim-rhetoric-prompter');
  const elSimCrisisBanner = document.getElementById('sim-crisis-banner');
  const elSimCrisisTitle = document.getElementById('sim-crisis-title');
  const elSimCrisisPrompt = document.getElementById('sim-crisis-prompt');
  const elBtnSimSpeakCrisis = document.getElementById('btn-sim-speak-crisis');
  const elSimKoRadarDisplay = document.getElementById('sim-ko-radar-display');
  const elSimEvalGradeBadge = document.getElementById('sim-eval-grade-badge');
  const elSimKoAlertBox = document.getElementById('sim-ko-alert-box');
  const elSimKoAlertBody = document.getElementById('sim-ko-alert-body');
  const elSimSafeBadge = document.getElementById('sim-safe-badge');
  const elSimStatementText = document.getElementById('sim-statement-text');
  
  // Step Containers & Accordions
  const elStep1Container = document.getElementById('step1-container');
  const elStep2Container = document.getElementById('step2-container');
  const elBtnStep2Toggle = document.getElementById('btn-step2-toggle');
  const elPanelVitals = document.getElementById('panel-vitals');

  const elStep3Container = document.getElementById('step3-container');
  const elBtnStep3Toggle = document.getElementById('btn-step3-toggle');
  const elPanelExaminer = document.getElementById('panel-examiner');
  const elExaminerQuoteText = document.getElementById('examiner-quote-text');
  const elExaminerRevealBox = document.getElementById('examiner-reveal-box');
  const elBadgeExaminerToggle = document.getElementById('badge-examiner-toggle');
  const elExaminerBadgeTitle = document.getElementById('examiner-badge-title');
  const elExaminerRevealCard = document.getElementById('examiner-reveal-card');
  const elBtnToggleExaminerAnswer = document.getElementById('btn-toggle-examiner-answer');
  const elExaminerInlineAnswerBox = document.getElementById('examiner-inline-answer-box');
  const elExaminerInlineAnswerText = document.getElementById('examiner-inline-answer-text');
  const elBtnAudioSpeakExaminerAns = document.getElementById('btn-audio-speak-examiner-ans');
  const elRubricBlockExaminerSolution = document.getElementById('rubric-block-examiner-solution');
  const elRubricExaminerPromptText = document.getElementById('rubric-examiner-prompt-text');
  const elRubricExaminerSolutionText = document.getElementById('rubric-examiner-solution-text');
  const elBtnAudioSpeakSolution = document.getElementById('btn-audio-speak-solution');

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
  const elToastContainer = document.getElementById('app-toast-container');

  // --- Modern Non-Blocking Clinical Toast Notification Engine ---
  function showToast(message, type = 'info', duration = 3500) {
    if (!elToastContainer) {
      console.log(`[Toast ${type}]:`, message);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `app-toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'warning') icon = '⚠️';
    else if (type === 'error' || type === 'danger') icon = '🚨';

    toast.innerHTML = `
      <span class="app-toast-icon">${icon}</span>
      <div class="app-toast-content">${message}</div>
    `;

    elToastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
    });

    let dismissTimer = setTimeout(() => {
      dismiss();
    }, duration);

    function dismiss() {
      clearTimeout(dismissTimer);
      toast.classList.remove('toast-visible');
      toast.classList.add('toast-hiding');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 350);
    }

    toast.addEventListener('click', dismiss);
  }

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
    let list = EXAM_QUESTIONS.filter(q => {
      // In Oral Simulation Mode (Mode A), STRICTLY focus on authentic ÄKNO Düsseldorf protocol cases (36 cases)
      if (state.studyMode === 'simulation') {
        const isDus = !!q.is_dus_protocol || (q.source_book && (q.source_book.includes('Düsseldorf') || q.source_book.includes('D\u00fcsseldorf')));
        if (!isDus) return false;
        if (q.question_type === 'options' || (q.options && q.options.length > 0)) {
          return false;
        }
      }

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

      if (state.filterMode === 'sm2_due') {
        const sm2Item = state.sm2Data ? state.sm2Data[q.id] : null;
        if (!sm2Item) return false;
        return Date.now() >= (sm2Item.dueDate || 0);
      }
      if (state.filterMode === 'high_yield') {
        return !!q.is_high_yield;
      }
      if (state.filterMode === 'dus_examiners') {
        return !!q.is_dus_protocol || (q.source_book && (q.source_book.includes('Düsseldorf') || q.source_book.includes('D\u00fcsseldorf')));
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

    // In Simulation mode, prioritize authentic Düsseldorf ÄKNO protocol questions first!
    if (state.studyMode === 'simulation' && !state.randomOrder) {
      list.sort((a, b) => {
        const aDus = !!a.is_dus_protocol || (a.source_book && (a.source_book.includes('Düsseldorf') || a.source_book.includes('D\u00fcsseldorf')));
        const bDus = !!b.is_dus_protocol || (b.source_book && (b.source_book.includes('Düsseldorf') || b.source_book.includes('D\u00fcsseldorf')));
        if (aDus && !bDus) return -1;
        if (!aDus && bDus) return 1;
        return 0;
      });
    }

    return list;
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

  // --- Dual-Language Hover Translation Helper ---
  function renderDualLanguageText(textDE, textTR) {
    if (!textDE) return '';
    const formattedDE = formatAnswerText(textDE);
    if (!textTR || textTR.trim() === textDE.trim()) {
      return `<div class="de-text-block">${formattedDE}</div>`;
    }
    
    const cleanTR = textTR.replace(/•/g, '<br>•').trim();

    return `
      <div class="translatable-box" data-tr="${escapeHtml(cleanTR)}" tabindex="0">
        <div class="de-text-block">${formattedDE}</div>
        <div class="hover-tr-preview" aria-hidden="true">
          <span class="hover-tr-badge">🇹🇷</span>
          <span class="hover-tr-content">${formatAnswerText(cleanTR)}</span>
        </div>
      </div>
    `;
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

  // --- 45-Minute Total Exam Simulation Timer ---
  function startExamSimulationTimer() {
    stopExamSimulationTimer();
    updateExamSimulationTimerUI();
    examSimulationTimerId = setInterval(() => {
      if (examSimulationTimeLeft > 0) {
        examSimulationTimeLeft--;
        updateExamSimulationTimerUI();
        if (examSimulationTimeLeft === 5 * 60) {
          playAudioTone(580, 'sine', 0.4); // 5-minute warning
        }
      } else {
        stopExamSimulationTimer();
        playAudioTone(440, 'triangle', 0.8);
        showToast('⏱️ Die 45-minütige mündliche Prüfungszeit ist abgelaufen!', 'warning', 6000);
      }
    }, 1000);
  }

  function stopExamSimulationTimer() {
    if (examSimulationTimerId) {
      clearInterval(examSimulationTimerId);
      examSimulationTimerId = null;
    }
  }

  function resetExamSimulationTimer() {
    examSimulationTimeLeft = 45 * 60;
    updateExamSimulationTimerUI();
  }

  function updateExamSimulationTimerUI() {
    if (!elExamTimer) return;
    const mins = Math.floor(examSimulationTimeLeft / 60);
    const secs = examSimulationTimeLeft % 60;
    elExamTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // --- 60-Second Exam Step Timer Engine ---
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

  // --- Hoisted Speech Handler (Eliminates TDZ / ReferenceErrors everywhere in app.js) ---
  function speakText(textOrElement, triggerBtn = null, onEnd = null) {
    if (typeof speakMedicalText === 'function') {
      return speakMedicalText(textOrElement, triggerBtn, onEnd);
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
    if (elTimerDisplayText) {
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
        elTimerDisplayText.textContent = '60s Stoppuhr (T)';
        if (elBtnToggleTimer) elBtnToggleTimer.classList.remove('active');
        if (elTimerMiniBar) elTimerMiniBar.style.display = 'none';
      }
    }

    if (elSimAnswerTimerDisplay) {
      if (stepTimer.isRunning) {
        elSimAnswerTimerDisplay.textContent = `${stepTimer.secondsLeft}s Antwortzeit`;
      } else {
        elSimAnswerTimerDisplay.textContent = '60s Antwortzeit';
      }
    }
  }

  if (elBtnToggleTimer) {
    elBtnToggleTimer.addEventListener('click', toggleStepTimer);
  }
  if (elBtnSimAnswerTimer) {
    elBtnSimAnswerTimer.addEventListener('click', toggleStepTimer);
  }

  // --- Voice Dictation, Speech Recognition & Clinical Evaluation Engine ---
  function initSpeechEngine() {
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechAPI) return null;

    try {
      const rec = new SpeechAPI();
      rec.lang = 'de-DE';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        isRecordingVoice = true;
        if (elBtnToggleMic) elBtnToggleMic.classList.add('recording');
        if (elMicStatusText) elMicStatusText.innerHTML = '🔴 Aufnahme läuft... <kbd class="kbd-hint">V</kbd>';
        if (elSpeechTranscriptBox) elSpeechTranscriptBox.style.display = 'block';
        if (elAudioWaveVisualizer) {
          elAudioWaveVisualizer.style.display = 'inline-flex';
          elAudioWaveVisualizer.classList.add('pulsing');
        }
      };

      rec.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalSpokenTranscript += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const fullSpoken = (finalSpokenTranscript + interim).trim();
        if (elSpeechTranscriptInput) {
          elSpeechTranscriptInput.value = fullSpoken;
        }
        if (elSpeechTranscriptText) {
          elSpeechTranscriptText.textContent = fullSpoken || 'Sprechen Sie jetzt frei Ihre Antwort ein...';
        }
      };

      rec.onerror = (e) => {
        console.warn('Speech API Error:', e.error);
        if (e.error === 'not-allowed') {
          showToast('🎙️ Mikrofonzugriff wurde verweigert. Bitte in den Browsereinstellungen erlauben.', 'warning', 5000);
          stopVoiceRecording();
        } else if (e.error === 'no-speech') {
          // Keep listening during natural candidate thinking pauses
        } else {
          stopVoiceRecording();
        }
      };

      rec.onend = () => {
        if (isRecordingVoice) {
          // Browser paused speech stream; safely resume
          setTimeout(() => {
            if (isRecordingVoice) {
              try { rec.start(); } catch (err) {}
            }
          }, 150);
        } else {
          if (elBtnToggleMic) elBtnToggleMic.classList.remove('recording');
          if (elMicStatusText) elMicStatusText.innerHTML = 'Antwort einsprechen <kbd class="kbd-hint">V</kbd>';
          if (elAudioWaveVisualizer) {
            elAudioWaveVisualizer.classList.remove('pulsing');
            elAudioWaveVisualizer.style.display = 'none';
          }
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
      showToast('🎙️ Spracherkennung wird in diesem Browser nicht unterstützt. Sie können Stichpunkte direkt tippen!', 'info', 5000);
      if (elSpeechTranscriptBox) elSpeechTranscriptBox.style.display = 'block';
      if (elSpeechTranscriptInput) elSpeechTranscriptInput.focus();
      return;
    }

    try {
      isRecordingVoice = true;
      finalSpokenTranscript = elSpeechTranscriptInput ? elSpeechTranscriptInput.value.trim() : '';
      if (finalSpokenTranscript && !finalSpokenTranscript.endsWith(' ')) {
        finalSpokenTranscript += ' ';
      }
      speechRecognizer.start();
      if (elBtnToggleMic) elBtnToggleMic.classList.add('recording');
      if (elMicStatusText) elMicStatusText.innerHTML = '🔴 Aufnahme läuft... <kbd class="kbd-hint">V</kbd>';
      if (elSpeechTranscriptBox) elSpeechTranscriptBox.style.display = 'block';
      if (elAudioWaveVisualizer) {
        elAudioWaveVisualizer.style.display = 'inline-flex';
        elAudioWaveVisualizer.classList.add('pulsing');
      }
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
    if (elAudioWaveVisualizer) {
      elAudioWaveVisualizer.classList.remove('pulsing');
      elAudioWaveVisualizer.style.display = 'none';
    }
  }

  function toggleVoiceRecording() {
    if (isRecordingVoice) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  }

  function evaluateVoiceAnswer() {
    stopVoiceRecording();

    const spokenText = elSpeechTranscriptInput ? elSpeechTranscriptInput.value.trim() : '';
    if (!spokenText) {
      showToast('⚠️ Bitte sprechen Sie zuerst Ihre Antwort ein oder notieren Sie Stichpunkte im Textfeld.', 'warning', 4000);
      if (elSpeechTranscriptInput) elSpeechTranscriptInput.focus();
      return;
    }

    filteredQuestions = getFilteredQuestions();
    const currentQ = filteredQuestions[state.currentIndex];
    if (!currentQ) return;
    const parsedCase = parseOralExamCase(currentQ);

    const targetRubric = (parsedCase.checklist && parsedCase.checklist.length)
      ? parsedCase.checklist
      : [currentQ.answer_de || ''];

    let evalResult = { matchedIndices: [], matchRatio: 0, keywordsMatched: [] };
    if (typeof VoiceExamEngine !== 'undefined' && VoiceExamEngine.evaluateSpokenAnswer) {
      evalResult = VoiceExamEngine.evaluateSpokenAnswer(spokenText, targetRubric);
    }

    const pct = Math.round(evalResult.matchRatio * 100);

    if (elVoiceEvalCard) {
      elVoiceEvalCard.style.display = 'block';

      if (elEvalScoreBadge) {
        elEvalScoreBadge.textContent = `🎯 ${pct}% Treffer (${evalResult.matchedIndices.length}/${targetRubric.length} Kriterien)`;
        elEvalScoreBadge.className = 'eval-score-badge ' + (pct >= 70 ? '' : (pct >= 40 ? 'mid' : 'low'));
      }

      if (elEvalStatusMsg) {
        if (pct >= 75) {
          elEvalStatusMsg.textContent = '🎉 Ausgezeichnet! Sie haben die entscheidenden ÄKNO-Leitlinienkriterien genannt.';
        } else if (pct >= 45) {
          elEvalStatusMsg.textContent = '👍 Solide Struktur! Einige wichtige Signalbegriffe fehlen noch (siehe unten).';
        } else {
          elEvalStatusMsg.textContent = '⚠️ Wichtige K.O.-Kriterien oder Leitlinienpunkte ausgelassen. Vergleichen Sie mit der Musterantwort.';
        }
      }

      if (elEvalMatchedTags) {
        if (evalResult.keywordsMatched.length > 0) {
          elEvalMatchedTags.innerHTML = evalResult.keywordsMatched.map(kw => `<span class="keyword-tag matched">✓ ${escapeHtml(kw)}</span>`).join('');
        } else {
          elEvalMatchedTags.innerHTML = '<span class="eval-empty-hint">Keine spezifischen Signalwörter erkannt</span>';
        }
      }

      if (elEvalMissedTags) {
        const missed = targetRubric.filter((_, idx) => !evalResult.matchedIndices.includes(idx));
        if (missed.length > 0) {
          elEvalMissedTags.innerHTML = missed.map(item => {
            const cleanItem = item.replace(/<[^>]*>/g, '').substring(0, 75);
            return `<span class="keyword-tag missed">○ ${escapeHtml(cleanItem)}${item.length > 75 ? '...' : ''}</span>`;
          }).join('');
        } else {
          elEvalMissedTags.innerHTML = '<span class="eval-empty-hint">Alle Kernkriterien abgedeckt! 🌟</span>';
        }
      }
    }

    // ÄKNO Düsseldorf Simulation Evaluation & K.O.-Criteria Check
    const isSimMode = (state.studyMode === 'simulation');
    if (isSimMode && typeof MockExamSimulation !== 'undefined' && MockExamSimulation.evaluateCandidateAnswer) {
      const simEval = MockExamSimulation.evaluateCandidateAnswer(currentQ.id, spokenText, targetRubric);
      if (elSimKoRadarDisplay) {
        elSimKoRadarDisplay.style.display = 'block';
        if (elSimEvalGradeBadge) {
          elSimEvalGradeBadge.textContent = simEval.gradeText;
          elSimEvalGradeBadge.style.color = simEval.passed ? 'var(--primary)' : '#dc2626';
        }

        if (simEval.koViolated) {
          if (elSimKoAlertBox) {
            elSimKoAlertBox.style.display = 'block';
            if (elSimKoAlertBody) elSimKoAlertBody.textContent = simEval.koReason;
          }
          if (elSimSafeBadge) elSimSafeBadge.style.display = 'none';
          playAudioTone(330, 'sawtooth', 0.6); // Harsh fail tone
        } else {
          if (elSimKoAlertBox) elSimKoAlertBox.style.display = 'none';
          if (elSimSafeBadge) elSimSafeBadge.style.display = 'block';
          playAudioTone(587.33, 'triangle', 0.35); // Success tone
        }

        if (elSimStatementText) {
          elSimStatementText.textContent = simEval.examinerFeedback;
        }
      }
    }

    // Automatically reveal model answer
    revealAnswer();

    // Highlight matched items in the checklist
    if (elRubricChecklistItems) {
      const rows = elRubricChecklistItems.querySelectorAll('.checklist-item-row');
      rows.forEach((row, idx) => {
        if (evalResult.matchedIndices.includes(idx)) {
          row.style.background = 'rgba(16, 185, 129, 0.12)';
          row.style.borderRadius = '6px';
        }
      });
    }
  }

  if (elBtnToggleMic) {
    elBtnToggleMic.addEventListener('click', toggleVoiceRecording);
  }

  if (elBtnEvaluateVoice) {
    elBtnEvaluateVoice.addEventListener('click', evaluateVoiceAnswer);
  }

  if (elBtnQuickReveal) {
    elBtnQuickReveal.addEventListener('click', () => {
      stopVoiceRecording();
      revealAnswer();
    });
  }

  if (elBtnClearTranscript) {
    elBtnClearTranscript.addEventListener('click', () => {
      finalSpokenTranscript = '';
      if (elSpeechTranscriptInput) elSpeechTranscriptInput.value = '';
      if (elSpeechTranscriptText) elSpeechTranscriptText.textContent = 'Sprechen Sie jetzt frei Ihre Antwort ein...';
      if (elVoiceEvalCard) elVoiceEvalCard.style.display = 'none';
      if (elSimKoRadarDisplay) elSimKoRadarDisplay.style.display = 'none';
    });
  }

  // --- Dynamic ÄKNO Düsseldorf Live Cockpit Event Listeners ---
  if (elBtnSimSpeakStem) {
    elBtnSimSpeakStem.addEventListener('click', () => {
      filteredQuestions = getFilteredQuestions();
      const currentQ = filteredQuestions[state.currentIndex];
      if (!currentQ) return;
      const reg = (typeof MockExamSimulation !== 'undefined' && MockExamSimulation.getRegistry)
        ? MockExamSimulation.getRegistry(currentQ.id)
        : null;
      const textToSpeak = reg ? reg.speechIntro : (currentQ.stem_de || currentQ.question_de);
      speakText(getCleanSpeechText(textToSpeak));
    });
  }

  if (elBtnSimPeekStem) {
    elBtnSimPeekStem.addEventListener('click', () => {
      if (!elQuestionText) return;
      const isHidden = (elQuestionText.style.display === 'none');
      elQuestionText.style.display = isHidden ? 'block' : 'none';
      if (elSimPeekLabel) {
        elSimPeekLabel.textContent = isHidden ? 'Falltext verbergen (Hörtest)' : 'Falltext einblenden';
      }
    });
  }

  function triggerCrisisComplication() {
    filteredQuestions = getFilteredQuestions();
    const currentQ = filteredQuestions[state.currentIndex];
    if (!currentQ) return;
    const reg = (typeof MockExamSimulation !== 'undefined' && MockExamSimulation.getRegistry)
      ? MockExamSimulation.getRegistry(currentQ.id)
      : null;
    if (!reg || !reg.crisis) return;

    if (elSimCrisisBanner) {
      elSimCrisisBanner.style.display = 'block';
      if (elSimCrisisTitle) {
        elSimCrisisTitle.innerHTML = reg.crisis.title_tr 
          ? `<span>${escapeHtml(reg.crisis.title)}</span> <span style="font-size:0.8rem; font-weight:normal; opacity:0.85; margin-left:8px;">🇹🇷 ${escapeHtml(reg.crisis.title_tr)}</span>`
          : escapeHtml(reg.crisis.title);
      }
      if (elSimCrisisPrompt) {
        elSimCrisisPrompt.innerHTML = renderDualLanguageText(reg.crisis.prompt_de, reg.crisis.prompt_tr);
      }
    }

    // Update vital numbers to crisis state
    const v = reg.crisis.vitals;
    if (v) {
      const setElemText = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
      };
      if (v.spo2) setElemText('vital-val-spo2', v.spo2);
      if (v.bp) setElemText('vital-val-bp', v.bp);
      if (v.map) setElemText('vital-val-map', `(MAP ${v.map})`);
      if (v.hr) setElemText('vital-val-hr', v.hr);
      if (v.rhythm) setElemText('vital-val-rhythm', v.rhythm);
      if (v.etco2) setElemText('vital-val-etco2', v.etco2);
    }

    const elMonDashboard = document.getElementById('clinical-monitor-dashboard');
    if (elMonDashboard) elMonDashboard.classList.add('vital-crisis-flash');

    toggleStep2(true); // Open vitals panel if closed
    playAudioTone(880, 'sine', 0.35); // Emergency alert beep
    speakText(reg.crisis.prompt_de);
  }

  if (elBtnSimTriggerCrisis) {
    elBtnSimTriggerCrisis.addEventListener('click', triggerCrisisComplication);
  }

  if (elBtnSimSpeakCrisis) {
    elBtnSimSpeakCrisis.addEventListener('click', () => {
      filteredQuestions = getFilteredQuestions();
      const currentQ = filteredQuestions[state.currentIndex];
      if (!currentQ) return;
      const reg = (typeof MockExamSimulation !== 'undefined' && MockExamSimulation.getRegistry)
        ? MockExamSimulation.getRegistry(currentQ.id)
        : null;
      if (reg && reg.crisis) speakText(reg.crisis.prompt_de);
    });
  }

  // 4-Phase Rhetoric Buttons
  const elRhetoricPhases = document.querySelectorAll('.sim-rhetoric-phase');
  elRhetoricPhases.forEach(btn => {
    btn.addEventListener('click', () => {
      elRhetoricPhases.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

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

    // 3. Examiner Steering / Follow-up challenge & Full Clinical Model Solution
    let examinerIntervention = '';
    let examinerInterventionTR = '';
    let examinerAnswer = '';
    let examinerAnswerTR = '';

    // Check 1: Authentic ÄKNO Düsseldorf Protocol Registry (MockExamSimulation)
    const reg = (typeof MockExamSimulation !== 'undefined' && MockExamSimulation.getRegistry)
      ? MockExamSimulation.getRegistry(q.id)
      : null;

    if (reg && reg.crisis) {
      examinerIntervention = reg.crisis.prompt_de;
      examinerInterventionTR = reg.crisis.prompt_tr || (q.stem_tr ? `Jüri müdahale ediyor: ${q.stem_tr}` : 'Jüri vakaya aniden müdahale ediyor ve acil çözüm bekliyor.');
      examinerAnswer = reg.crisis.targetAction;
      examinerAnswerTR = reg.crisis.targetAction_tr || (q.answer_tr || examinerAnswer);
      if (reg.koCriteria && reg.koCriteria.failureReason) {
        examinerAnswer += `\n\n⚠️ K.O.-Kriterium / Prüfungsfalle:\n${reg.koCriteria.failureReason}`;
        const koTR = reg.koCriteria.failureReason_tr || 'Bu ölümcül tuzağa düşülmemeli ve kılavuz basamakları sırasıyla uygulanmalıdır.';
        examinerAnswerTR += `\n\n⚠️ K.O. Kriteri / Sınav Tuzağı:\n${koTR}`;
      }
    } else if (q.examiner_intervention && q.examiner_answer) {
      examinerIntervention = q.examiner_intervention;
      examinerInterventionTR = q.examiner_intervention_tr || (q.stem_tr ? `Jüri müdahalesi: ${q.stem_tr}` : 'Jüri vaka seyrini acil bir komplikasyonla yönlendiriyor.');
      examinerAnswer = q.examiner_answer;
      examinerAnswerTR = q.examiner_answer_tr || (q.answer_tr || examinerAnswer);
    } else {
      // Check 2: Clean subquestion from textbook answer if present
      const subqRegex = /(?:^|[.!?\n])\s*([A-ZÄÖÜ][^.!?\n•–—]{8,85}\?)\s*([\s\S]+)$/;
      const match = answer.match(subqRegex);
      if (match && match[1].length > 15 && match[2].trim().length > 35 && !match[1].includes('•') && !match[1].includes('–')) {
        examinerIntervention = `Der Prüfer hakt gezielt nach: "${match[1].trim()}"`;
        examinerAnswer = match[2].trim();
        const matchTR = answerTr ? answerTr.match(subqRegex) : null;
        if (matchTR && matchTR[1]) {
          examinerInterventionTR = `Jüri özellikle sorguluyor: "${matchTR[1].trim()}"`;
          examinerAnswerTR = matchTR[2].trim();
        } else {
          examinerInterventionTR = `Jüri özellikle sorguluyor: "${match[1].trim()}"`;
          examinerAnswerTR = answerTr ? answerTr.trim() : examinerAnswer;
        }
      } else {
        // Check 3: Domain-specific dynamic clinical complication & model answer
        const dynamicEntry = getDynamicExaminerCase(category, stem, q);
        examinerIntervention = dynamicEntry.question_de;
        examinerInterventionTR = dynamicEntry.question_tr;
        examinerAnswer = dynamicEntry.answer_de;
        examinerAnswerTR = dynamicEntry.answer_tr;
      }
    }

    // 4. Three High-Impact Model Answer Micro-Cards + Examiner Solution
    const verbalFramework = generateVerbalFramework(category, stem, answer);
    const verbalFrameworkTR = generateVerbalFrameworkTR(category, stem, answer);
    const checklist = generateChecklist(category, stem, answer, q.options);
    const pitfalls = generatePitfalls(category, stem, answer);
    const pitfallsTR = generatePitfallsTR(category, stem, answer);

    return {
      clinicalContext,
      stem,
      vitals,
      examinerIntervention,
      examinerInterventionTR,
      examinerAnswer,
      examinerAnswerTR,
      verbalFramework,
      verbalFrameworkTR,
      checklist,
      pitfalls,
      pitfallsTR,
      fullTextDE: answer,
      fullTextTR: answerTr
    };
  }

  function getExaminerProfileForCase(q) {
    if (!q) return null;
    if (typeof MockExamSimulation !== 'undefined' && MockExamSimulation.getRegistry) {
      const reg = MockExamSimulation.getRegistry(q.id);
      if (reg && reg.examiner) return reg.examiner;
    }
    if (q.examiner_profile) return q.examiner_profile;
    const text = ((q.stem_de || '') + ' ' + (q.question_de || '') + ' ' + (q.answer_de || '') + ' ' + (q.source_book || '')).toLowerCase();

    if (text.includes('aortenklappen') || text.includes('einlungenventilation') || text.includes('dlt') || text.includes('annecke') || text.includes('doppellumentubus')) {
      return {
        name: 'Prof. Dr. med. Thorsten Annecke',
        hospital: 'Direktor Klinikum Leverkusen / ehem. UK Köln · ÄKNO Prüfungsvorsitzender',
        focus: 'Aortenklappenstenose (keine SPA!), Einlungenventilation & 5-Stufen-Hypoxämie-Algorithmus, DGAI-Atemwegs-Stufen',
        focus_tr: 'Aort kapak darlığı (kesinlikle SPA yok!), Tek akciğer ventilasyonu & 5 basamaklı hipoksemi algoritması, DGAI havayolu basamakları',
        trap: 'Vorschlag einer Spinalanästhesie bei Aortenklappenstenose oder Hektik ohne Fiberoptik bei DLT-Fehllage',
        trap_tr: 'Aort darlığında spinal anestezi önermek veya DLT tüp kaymasında fiberoptiksiz paniklemek',
        keywords: 'SVR hochhalten, Noradrenalin/Phenylephrin, Arterie VOR Einleitung, 100% FiO₂ → CPAP kollabierte Lunge',
        keywords_tr: "SVR'yi yüksek tut, Noradrenalin/Fenilefrin, İndüksiyondan ÖNCE arter, %100 FiO2 -> Kollabe akciğere CPAP"
      };
    } else if (text.includes('sugammadex') || text.includes('relaxometrie') || text.includes('tof') || text.includes('hohn') || text.includes('aufwachraum')) {
      return {
        name: 'Prof. Dr. med. Andreas Hohn',
        hospital: 'Chefarzt Ev. Krankenhaus Köln-Kalk / ehem. UK Köln · ÄKNO Fachprüfer',
        focus: 'Quantitative Relaxometrie (TOF-Ratio ≥ 0.9), Sugammadex-Dosierungen (2 vs. 4 vs. 16 mg/kg), ZAS vs. Überhang',
        focus_tr: 'Kantitatif Relaksometri (TOF oranı >= 0.9), Sugammadeks dozları (2 vs 4 vs 16 mg/kg), ZAS vs Kas gevşetici kalıntısı',
        trap: 'Extubation ohne Relaxometrie-Nachweis oder Verwechslung von NPPE mit Muskelrelaxanzien-Überhang',
        trap_tr: 'Relaksometri kanıtı olmadan ekstübe etmek veya NPPE ile gevşetici kalıntısını karıştırmak',
        keywords: 'TOF-Ratio ≥ 0.9, Sugammadex 16 mg/kg Notfall-Rescue, Posttetanic Count (PTC), Physostigmin bei ZAS',
        keywords_tr: 'TOF oranı >= 0.9, Sugammadeks 16 mg/kg acil kurtarma, Posttetanik sayım (PTC), ZAS\'ta Fizostigmin'
      };
    } else if (text.includes('kienbaum') || text.includes('polytrauma') || text.includes('rotem') || text.includes('schädel-hirn') || text.includes('massivtransfusion') || text.includes('tee')) {
      return {
        name: 'Prof. Dr. med. Peter Kienbaum',
        hospital: 'Direktor der Klinik für Anästhesiologie, Universitätsklinikum Düsseldorf (UKD)',
        focus: 'Hämodynamik & PiCCO/TEE, Schockraum-Algorithmus, Ziel-CPP ≥ 60–70 mmHg bei SHT, ROTEM-gezielte Gerinnung',
        focus_tr: 'Hemodinami & PiCCO/TEE, Şok odası algoritması, SHT\'de hedef CPP >= 60-70 mmHg, ROTEM kılavuzluğunda hemostaz',
        trap: 'Permissive Hypotonie bei Schädel-Hirn-Trauma (absolutes K.O.-Kriterium!) oder ungezielte FFP-Gabe ohne ROTEM',
        trap_tr: 'Kafa travmasında permissif hipotansiyon uygulamak (kesin K.O. kriteri!) veya ROTEM\'siz körlemesine FFP vermek',
        keywords: 'CPP = MAP - ICP, kein PEEP-Überdruck bei Spannungspneu, Fibrinogen bei FIBTEM A10 < 10 mm, TXA vor 3h',
        keywords_tr: 'CPP = MAP - ICP, Tansiyon pnömotoraksta PEEP\'ten kaçın, FIBTEM A10 < 10 mm ise Fibrinojen, İlk 3 saatte TXA'
      };
    } else if (text.includes('wappler') || text.includes('maligne hyperthermie') || text.includes('dantrolen') || text.includes('last') || text.includes('intralipid')) {
      return {
        name: 'Prof. Dr. med. Frank Wappler',
        hospital: 'Kliniken der Stadt Köln / Universität Witten/Herdecke · Nationales MH-Referenzzentrum',
        focus: 'Maligne Hyperthermie (EtCO₂-Anstieg, Dantrolen 2.5 mg/kg), Lokalanästhetika-Intoxikation (Intralipid 20%)',
        focus_tr: 'Malign Hipertermi (EtCO2 fırlaması, Dantrolen 2.5 mg/kg), Lokal Anestezik Sistemik Toksisitesi (İntralipid %20)',
        trap: 'Kalziumantagonisten bei V.a. MH oder Vasopressin/Lidocain bei LAST (sofortiges Durchfallen!)',
        trap_tr: 'Malign hipertermide kalsiyum kanal blokeri veya LAST\'ta Vazopressin/Lidokain vermek (anında sınavdan kalma!)',
        keywords: 'Trigger STOP, 100% O₂ High Flow, Dantrolen 2.5 mg/kg i.v., Intralipid 1.5 ml/kg Bolus, Kühlung bis 38.5°C',
        keywords_tr: 'Tetikleyiciyi DERHAL KES, %100 O2 High Flow, Dantrolen 2.5 mg/kg i.v., İntralipid 1.5 ml/kg bolus, 38.5°C\'ye soğutma'
      };
    } else if (text.includes('sectio') || text.includes('eklampsie') || text.includes('hellp') || text.includes('schwanger') || text.includes('pädiatr') || text.includes('kind')) {
      return {
        name: 'ÄKNO Spezialkommission Geburtshilfe & Pädiatrie',
        hospital: 'Ärztekammer Nordrhein (Düsseldorf) · Fachprüfer für Notfallsektio & Pädiatrie',
        focus: 'Notsectio EEZ ≤ 20 min, Linksseitenkippung 15–30°, Magnesiumsulfat 4–6 g, Larson-Punkt bei Laryngospasmus',
        focus_tr: 'Acil sezaryen EEZ <= 20 dk, Sol yan eğim 15-30°, Magnezyum sülfat 4-6 g, Laringospazmda Larson noktası',
        trap: 'Vergessen der Linksseitenkippung (Vena-cava-Kompression) oder Spinalanästhesie bei Thrombozytopenie < 50.000/µl',
        trap_tr: 'Sol yan eğimi unutmak (Vena kava basısı) veya Trombosit < 50.000/µl iken spinal anestezi yapmak',
        keywords: '15–30° Linksseitenkippung, RSI mit Krikoiddruck (Sellick), Tubus mit Cuff (ID = Alter/4 + 3.5), Atropin 0.02 mg/kg',
        keywords_tr: '15-30° Sol yan eğim, Sellick manevrasıyla RSI, Kaf\'lı endotrakeal tüp (Çap = Yaş/4 + 3.5), Atropin 0.02 mg/kg'
      };
    } else if (q.is_dus_protocol || (q.source_book && q.source_book.includes('Düsseldorf'))) {
      return {
        name: 'ÄKNO Prüfungskommission Düsseldorf',
        hospital: 'Haus der Ärzteschaft, Tersteegenstr. 9, 40474 Düsseldorf',
        focus: 'Strukturierte Priorisierung nach ABCDE, Patientensicherheit vor Detailwissen, klare Ansagen',
        focus_tr: 'ABCDE\'ye göre yapılandırılmış önceliklendirme, Ayrıntılı teoriden önce hasta güvenliği, Net komutlar',
        trap: 'Zögern bei Reanimation oder Atemwegsnotfall, unstrukturiertes Aufzählen von Medikamenten',
        trap_tr: 'Resüsitasyon veya havayolu acilinde tereddüt etmek, ilaçları plansızca sıralamak',
        keywords: 'ABCDE-Schema, klare Team-Anweisungen, zeitnahe Kausaltherapie, Vermeidung von K.O.-Kriterien',
        keywords_tr: 'ABCDE algoritması, net ekip talimatları, zamanında nedensel tedavi, K.O. kriterlerinden kaçınma'
      };
    }
    return null;
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

  function getDynamicExaminerCase(category, stem, q) {
    // 1. Herz-Kreislauf & Hämodynamik
    if (category.includes('Herz') || category.includes('Hämo')) {
      return {
        question_de: 'Der Prüfer steuert den Fall: "Der arterielle Druck fällt akut auf 70/40 mmHg und die etCO2 stürzt auf 14 mmHg ab. Welche 3 lebensbedrohlichen Differenzialdiagnosen müssen Sie sofort ausschließen und wie therapieren Sie?"',
        question_tr: 'Jüri vakayı yönlendiriyor: "Arteryel tansiyon akut olarak 70/40 mmHg\'ye ve etCO2 14 mmHg\'ye çakılıyor. Acilen dışlamanız gereken hayatı tehdit eden 3 ayırıcı tanı nedir ve nasıl tedavi edersiniz?"',
        answer_de: `Die 3 lebensbedrohlichen Differenzialdiagnosen bei akutem RR- und etCO2-Absturz:
1. Fulminante Lungenarterienembolie (LAE) / Gasembolie:
   • Pathophysiologie: Akuter Verschluss des Pulmonalisstromgebiets → massiver Anstieg des alveolären Totraums (Belüftung ohne Perfusion) lässt das etCO2 steil abstürzen; akutes Rechtsherzversagen mit linksventrikulärem Vorlastabfall bedingt die schwere Hypotonie.
   • Soforttherapie: 100% O2, Notfall-Echokardiographie (TEE: Rechtsherzdilatation, McConnell-Zeichen), Kreislaufstützung mit Noradrenalin (Ziel-MAP ≥ 65 mmHg) und ggf. Inotropika (Dobutamin), bei persistierendem Schock sofortige Lysetherapie (Alteplase 50–100 mg i.v. über 2 h bzw. 50 mg Bolus bei CPR) oder chirurgische/interventionelle Embolektomie.
2. Spannungspneumothorax:
   • Pathophysiologie: Ventilmechanismus führt zu progredientem intrapleuralem Druckanstieg → Kompression von Vena cava und rechtem Vorhof, venöser Rückstrom versiegt (obstruktiver Schock, RR stürzt ab); Beatmungsspitzendruck (Pmax) steigt steil an, etCO2 fällt infolge des minimierten Herzzeitvolumens ab.
   • Soforttherapie: SOFORTIGE Nadeldekompression VOR jedem Röntgen! Punktion mit großlumiger Kanüle (≥ 14G) im 2. ICR Medioklavikularlinie (Monaldi) oder 4./5. ICR vordere bis mittlere Axillarlinie (Bülau/ATLS); anschließend Anlage einer Bülau-Thoraxdrainage mit Wasserschloss.
3. Schwere Anaphylaxie (Grad III–IV) / Akuter Kreislaufkollaps (Massive Blutung / Myokardinfarkt / Tubusdislokation):
   • Pathophysiologie: Massive systemische Vasodilatation und Kapillarleck führen zum Zusammenbruch des SVR und der Organperfusion; begleitender Bronchospasmus treibt die Beatmungsdrücke in die Höhe.
   • Soforttherapie: Zufuhr aller potenziellen Trigger (Relaxanzien, Antibiotika, Kolloide, Latex) SOFORT STOPPEN! 100% O2, Hilfe rufen. Mittel der 1. Wahl ist ADRENALIN (Epinephrin): titrierter Bolus 10–50 µg i.v. alle 1–2 Minuten bei intubiertem/überwachtem Patienten (0,5 mg i.m. bei fehlendem venösem Zugang); rasche Druckinfusion von 20–30 ml/kg balancierten Kristalloiden; Zweitlinie: H1/H2-Blocker (Clemastin, Ranitidin) und Glukokortikoide (Prednisolon 250–500 mg i.v.).`,
        answer_tr: `Ani tansiyon ve etCO2 çakılmasında hayatı tehdit eden 3 ayırıcı tanı:
1. Masif Pulmoner Emboli (PTE) / Gaz Embolisi:
   • Patofizyoloji: Pulmoner vasküler yatağın ani tıkanması → devasa alveoler ölü boşluk (perfüzyonsuz ventilasyon) etCO2'nin aniden çakılmasına yol açar; akut sağ kalp yetmezliği ve sol ventrikül dolumunun çökmesi ağır hipotansiyon yapar.
   • Acil Tedavi: %100 O2, acil TEE ile sağ ventrikül dilatasyonunun doğrulanması, Noradrenalin ile MAP ≥ 65 mmHg hedeflenmesi; dirençli şokta acil tromboliz (Alteplaz 50–100 mg i.v.) veya embolektomi.
2. Tansiyon Pnömotoraks:
   • Patofizyoloji: Tek yönlü kapak mekanizmasıyla plevral basınç fırlar → vena kava ve kalbe venöz dönüş tıkanır (obstrüktif şok, tansiyon düşer); tepe solunum basıncı fırlar, kardiyak debi çöktüğü için etCO2 hızla düşer.
   • Acil Tedavi: Grafi BEKLEMEDEN ANINDA iğne dekompresyonu! 2. İKA medioklaviküler hat (Monaldi) veya 4./5. İKA ön aksiller hat (Bülau); ardından derhal su altı drenajlı toraks tüpü takılması.
3. Ağır Anafilaksi (Evre III–IV) / Masif Şok (Kanamalı çöküş / Akut MI / Tüp dislokasyonu):
   • Patofizyoloji: Sistemik vazodilatasyon ve kapiller kaçış vasküler rezistansı çökertir; eşlik eden bronkospazm solunum basınçlarını artırır.
   • Acil Tedavi: Tüm olası tetikleyicileri (kas gevşetici, antibiyotik, kolloid, lateks) DERHAL KES! %100 O2, ekibi alarma geçir. 1. seçenek ilaç ADRENALİN: İntübe hastada titre edilerek 10–50 µg i.v. bolus (damar yolu yoksa 0,5 mg i.m.); 20–30 ml/kg hızlı kristalloid yüklemesi; ikincil olarak antihistaminik ve kortikosteroid.`
      };
    }

    // 2. Atemwegsmanagement & Beatmung
    if (category.includes('Atemweg')) {
      return {
        question_de: 'Der Prüfer interveniert: "Nach Narkoseeinleitung gelingt die Maskenbeatmung nur mit Mühe (SpO2 fällt auf 82%). Die direkte Laryngoskopie zeigt Cormack-Lehane Grad IV. Wie lautet Ihre strukturierte Eskalation nach dem DGAI-Stufenplan bis Plan D?"',
        question_tr: 'Jüri müdahale ediyor: "Anestezi indüksiyonu sonrası maske ventilasyonu güçlükle sağlanabiliyor (SpO2 %82\'ye düşüyor). Doğrudan laringoskopide Cormack-Lehane Evre IV görülüyor. DGAI basamaklı planına göre Plan D\'ye kadar yapılandırılmış eskalasyonunuz nedir?"',
        answer_de: `Strukturierte Eskalation nach dem DGAI-Stufenplan "Schwieriger Atemweg":
• Plan A (Optimierung Maskenbeatmung & Laryngoskopie):
  - Ruf nach Hilfe ("Atemwegsnotfall!"), 100% O2 mit High-Flow.
  - Zweihändiger C-E-Griff mit Esmarch-Handgriff, Guedel- oder Wendl-Tubus einlegen.
  - Sofortiger Wechsel auf Videolaryngoskopie (z. B. hyperangulierter Spatel wie McGrath/C-MAC) kombiniert mit vorgebogenem Bougie / Führungsstab.
  - Maximal 2–3 vorsichtige Intubationsversuche zur Vermeidung von Larynxödem und Blutung.
• Plan B (Supraglottischer Atemweg / SGA):
  - Wenn Intubation fehlschlägt: Platzierung einer Larynxmaske (LMA) der 2. Generation (mit gastralem Absaugkanal, z. B. Supreme, ProSeal, Ambu AuraGain) oder eines Larynxtubus.
  - Bei suffizienter SGA-Ventilation: Oxygenierung gerettet ("Can Ventilate, Cannot Intubate").
• Plan C (Aufwachen lassen / Wake-up):
  - Bei elektiven Eingriffen und stabiler SGA-Ventilation: Narkosezufuhr stoppen, Muskelrelaxierung sofort antagonisieren (Sugammadex 16 mg/kg i.v. bei Rocuronium für blitzschnelle Reversierung), Patient erwachen lassen.
• Plan D (Cannot Intubate, Cannot Oxygenate - CICO / eFONA):
  - Gelingt weder Intubation noch SGA-Beatmung (SpO2 stürzt weiter ab, CICO-Notfall): Sofortiger chirurgischer Notfallzugang zur Trachea (emergency Front-of-Neck Access - eFONA).
  - Skalpell-Bougie-Tubus-Technik am Ligamentum cricothyroideum:
    1. Skalpell quer durch Lig. cricothyroideum führen.
    2. Klinge um 90° nach kaudal drehen zur Spreizung des Spalts.
    3. Bougie entlang der Klinge in die Trachea vorschieben (Rastung an Knorpelspangen spüren).
    4. Gecufften Endotrachealtubus (Größe 6,0 mm ID) über den Bougie vorschieben, Cuff blocken, Beatmung konnektieren und Kapnographie verifizieren.`,
        answer_tr: `DGAI "Zor Havayolu" Kılavuzuna Göre Basamaklı Eskalasyon:
• Plan A (Maske & Laringoskopi Optimizasyonu):
  - Yardım çağır ("Havayolu acili!"), yüksek akımlı %100 O2 ver.
  - İki elle C-E tutuşu ve Esmarch manevrası, uygun Guedel veya Wendl kanülü yerleştir.
  - Doğrudan Videolaringoskopiye geç (McGrath/C-MAC hiperangüle bleyd) ve önceden bükülmüş buji/stile kullan.
  - Ödem ve travmayı önlemek için en fazla 2–3 entübasyon denemesiyle sınırla.
• Plan B (Supraglottik Havayolu / SGA):
  - Entübasyon başarısız olursa: Mide drenaj kanallı 2. nesil Laringeal Maske (LMA Supreme, ProSeal, AuraGain) veya Laringeal Tüp yerleştir.
  - SGA ile ventilasyon sağlanırsa oksijenasyon kurtarılmış olur ("Havalandırılabilir, Entübe Edilemez").
• Plan C (Uyandırma):
  - Elektif ameliyatlarda ve SGA ile hasta stabilse: Anesteziyi kes, kas gevşemesini hızla geri çevir (Rokuronyum için acil kurtarma dozu Sugammadeks 16 mg/kg i.v.), hastayı uyandır.
• Plan D (Entübe Edilemez, Havalandırılamaz - CICO / eFONA):
  - Maske ve SGA ile havalandırma sağlanamazsa: Acil cerrahi havayolu (eFONA) basamağına geçilir.
  - Krikotiroid ligaman üzerinden Skalpel-Buji-Tüp tekniği:
    1. Krikotiroid membrana transvers skalpel kesisi yap.
    2. Bıçağı 90° kaudale çevirerek aralığı açık tut.
    3. Buji kılavuzunu trakeya içine ilerlet (halkaları hisset).
    4. 6.0 mm kafli endotrakeal tüpü buji üzerinden kaydır, kafi şişir ve kapnografi ile doğrula.`
      };
    }

    // 3. Klinische Chemie & Elektrolyte
    if (category.includes('Chemie') || category.includes('Elektrolyt')) {
      return {
        question_de: 'Der Prüfer hakt nach: "Das Serum-Kalium steigt im Labor auf 6,8 mmol/l mit QRS-Verbreiterung im EKG. Nennen Sie exakt die Reihenfolge und Dosierung der medikamentösen Notfallmaßnahmen!"',
        question_tr: 'Jüri sorguluyor: "Laboratuvarda serum potasyumu 6,8 mmol/l\'ye yükseliyor ve EKG\'de QRS genişlemesi görülüyor. İlaçlı acil müdahalelerin tam sırasını ve dozlarını belirtiniz!"',
        answer_de: `Strikte 3-Stufen-Notfalltherapie der schweren Hyperkaliämie:
1. Membranstabilisierung (SOFORT - Wirkeintritt in 1–3 Minuten):
   • Calciumgluconat 10%: 10 ml i.v. langsam über 2–3 Minuten (oder Calciumchlorid 10% 5–10 ml über ZVK).
   • Rationale: Hebt das Schwellenpotenzial der Herzmuskelzelle an und schützt das Myokard sofort vor Kammerflimmern und Asystolie (Achtung: Senkt NICHT den Kaliumwert!).
   • Bei anhaltenden EKG-Auffälligkeiten nach 5–10 Minuten repetieren!
2. Kalium-Shift nach intrazellulär (Wirkeintritt in 15–30 Minuten):
   • Glukose-Insulin-Infusion: 25 g Glukose (z. B. 125 ml Glukose 20%) + 10 IE Normalinsulin (Altinsulin) i.v. über 30 Minuten infundieren. Stündliche Blutzuckerkontrolle zwingend!
   • Beta-2-Sympathomimetika: Salbutamol 10–20 mg vernebeln oder 0,5 mg langsam i.v. (stimuliert Na+/K+-ATPase).
   • Natriumbicarbonat 8,4%: 50–100 ml i.v. langsam (nur bei begleitender metabolischer Azidose und gesicherter Ventilation indiziert). Milde Hyperventilation (Ziel-PaCO2 30–35 mmHg).
3. Forcierte Kalium-Elimination aus dem Organismus:
   • Schleifendiuretika: Furosemid 40–80 mg i.v. (bei erhaltener Nierenfunktion und Euvolämie).
   • Kationenaustauscherharze: Lokelma (Natrium-Zirkonium-Cyclosilikat) 10 g p.o. oder Resonium.
   • Ultima Ratio: Akute Hämodialyse / Hämofiltration bei Nierenversagen, Anurie oder refraktärem Verlauf.`,
        answer_tr: `Ağır Hiperkalemide 3 Aşamalı Acil Tedavi:
1. Kardiyak Membran Stabilizasyonu (ANINDA - 1–3 dakika içinde etki):
   • Kalsiyum glukonat %10: 10 ml i.v. yavaşça 2–3 dakika içinde (veya santral yoldan Kalsiyum klorür %10 5–10 ml).
   • Rasyonel: Miyokard hücre eşik potansiyelini yükselterek ventriküler fibrilasyon ve arresti önler (Potasyum seviyesini düşürmez!).
   • EKG bozukluğu sürerse 5–10 dakika sonra tekrarla!
2. Potasyumun Hücre İçine Kaydırılması (15–30 dakika içinde etki):
   • Glukoz-İnsülin İnfüzyonu: 25 g Glukoz (%20 Dekstroz 125 ml) + 10 Ü Kristalize Normal İnsülin i.v. 30 dakikada verilir. Kan şekeri takibi şart!
   • Beta-2 Agonist: Salbutamol 10–20 mg nebül veya yavaş i.v. (Na+/K+ ATPazı uyarır).
   • Sodyum Bikarbonat %8,4: 50–100 ml i.v. (asidoz varlığında ve ventilasyon sağlandığında). Hafif hiperventilasyon (hedef PaCO2 30–35 mmHg).
3. Potasyumun Vücuttan Uzaklaştırılması:
   • Kıvrım Diüretiği: Furosemid 40–80 mg i.v. (idrar çıkışı varsa).
   • Potasyum Bağlayıcı Reçineler: Lokelma 10 g veya Resonium.
   • Kesin Çözüm: Anüri veya dirençli hiperkalemide acil Hemodiyaliz!`
      };
    }

    // 4. Pharmakologie & Toxikologie / LAST
    if (category.includes('Pharmakologie') || category.includes('Toxikologie')) {
      return {
        question_de: 'Der Prüfer stellt eine Komplikation: "Unmittelbar nach Injektion klagt der Patient über periorales Kribbeln, gefolgt von einem generalisierten Krampfanfall. Welcher Notfall liegt vor und wie dosieren Sie das spezifische Antidot?"',
        question_tr: 'Jüri bir komplikasyon sunuyor: "Enjeksiyondan hemen sonra hasta perioral karıncalanmadan şikayet ediyor, ardından jeneralize nöbet gelişiyor. Hangi acil durum söz konusudur ve spesifik antidotu nasıl dozlarsınız?"',
        answer_de: `Diagnose: Lokalanästhetika-induzierte Systemtoxizität (LAST - Local Anesthetic Systemic Toxicity).
Leitliniengerechte Notfallmaßnahmen & Lipid-Rescue (DGAI / ASRA):
1. Akutmaßnahmen:
   • Lokalanästhetika-Zufuhr SOFORT STOPPEN! Hilfe anfordern, LAST-Rescue-Kit ("Lipid-Box") anfordern.
   • 100% Sauerstoff, zügige Atemwegssicherung (Hypoxie und Azidose verstärken die Kardiotoxizität!).
   • Krampfanfall durchbrechen: Midazolam 0,05–0,1 mg/kg i.v. titriert (2–5 mg). Propofol nur sehr zurückhaltend und niedrig dosiert wegen Gefahr zusätzlicher Myokarddepression.
2. Spezifisches Antidot (Lipidemulsion 20%, z. B. Intralipid® 20%):
   • Bolus: 1,5 ml/kg KG i.v. über 1 Minute (ca. 100 ml beim 70-kg-Patienten).
   • Erhaltungsinfusion: 0,25 ml/kg KG/min kontinuierlich (ca. 1000 ml/h).
   • Bei therapierefraktärer Instabilität / CPR: Bolus nach 3–5 min bis zu 2-mal wiederholen und Infusionsrate auf 0,5 ml/kg/min verdoppeln.
   • Maximale Gesamtdosis: 10–12 ml/kg in den ersten 30 Minuten nicht überschreiten!
3. Reanimation Besonderheiten:
   • Adrenalin NIEDRIG dosieren (< 1 µg/kg Bolus, z. B. 10–50 µg statt 1 mg!), um ventrikuläre Tachyarrhythmien zu vermeiden.
   • KONTRAINDIZIERT: Vasopressin, Calciumkanalblocker, Betablocker, Lokalanästhetika (Lidocain!).
   • Prolongierte CPR durchführen: Reanimation mindestens 60 Minuten aufrechterhalten, da Lipidemulsion das Toxin über Zeit extrahiert.`,
        answer_tr: `Tanı: Lokal Anestezik Sistemik Toksisitesi (LAST).
Kılavuzlara Uygun Acil Müdahale ve Lipid Tedavisi:
1. İlk Girişimler:
   • Lokal anestezik enjeksiyonunu DERHAL DURDUR! Ekibi çağır, Lipid Kurtarma Kiti'ni getirt.
   • %100 Oksijen desteği sağla, havayolunu emniyete al (hipoksi ve asidoz kardiyotoksisiteyi katlar).
   • Nöbeti sonlandır: Titre edilerek Midazolam 2–5 mg i.v. (propofolden kardiyak depresyon riski nedeniyle kaçın).
2. Spesifik Antidot (%20 Lipid Emülsiyonu - Intralipid 20%):
   • Başlangıç Bolusu: 1,5 ml/kg i.v. 1 dakika içinde (70 kg hasta için ~100 ml).
   • İdame İnfüzyon: 0,25 ml/kg/dk sürekli infüzyon.
   • Şok veya arrest sürerse: Bolusu 3–5 dakika arayla en fazla 2 kez tekrarla ve idame hızını 0,5 ml/kg/dk'ya çıkar.
   • Maksimum doz: İlk 30 dakikada toplam 10–12 ml/kg'ı aşma!
3. Kardiyak Arrest Yönetimi:
   • Adrenalin dozunu DÜŞÜK tut (< 1 µg/kg, örn. 10–50 µg bolus; 1 mg standart doz aritmiyi tetikler!).
   • KONTRENDİKE: Vazopressin, kalsiyum kanal blokerleri, beta blokerler ve Lidokain!
   • Uzamış KPR: Lipid bağlanması zaman aldığından resüsitasyonu en az 60 dakika sürdür.`
      };
    }

    // 5. Säure-Basen-Haushalt & Blutgase
    if (category.includes('Säure') || category.includes('Blutgase')) {
      return {
        question_de: 'Der Prüfer legt Ihnen eine BGA vor: "pH 7,12, PaCO2 62 mmHg, PaO2 58 mmHg, BE -8 mmol/l, Laktat 4,8 mmol/l. Welche kombinierte Störung liegt vor und wie priorisieren Sie Ihre therapeutischen Sofortschritte?"',
        question_tr: 'Jüri bir kan gazı sunuyor: "pH 7,12, PaCO2 62 mmHg, PaO2 58 mmHg, BE -8 mmol/l, Laktat 4,8 mmol/l. Hangi kombine bozukluk mevcuttur ve acil tedavi adımlarınızı nasıl önceliklendirirsiniz?"',
        answer_de: `Diagnose: Kombinierte schwere respiratorische und metabolische Azidose mit Laktatazidose bei ventilatorischer Insuffizienz und peripherer Gewebehypoxie.
Priorisierte Therapiestruktur:
1. Respiratorische Sofortkorrektur (PaCO2 senken & Hypoxämie beheben):
   • 100% Sauerstoff (FiO2 1,0).
   • Bei Spontanatmung: Sofortige NIV oder endotracheale Intubation.
   • Bei Beatmung: Minutenventilation steigern (Atemfrequenz anheben, Tidalvolumen 6 ml/kg PBW optimieren), um das PaCO2 kontrolliert auf 35–40 mmHg abzuhemen. PEEP adäquat titrieren.
2. Hämodynamische Kausaltherapie (Gewebeperfusion wiederherstellen):
   • Vasopressor: Noradrenalin-Perfusor zur Sicherung des Organperfusionsdrucks (Ziel-MAP ≥ 65 mmHg).
   • Gezielte Volumentherapie mit balancierten Kristalloiden (keine hyperchlorämische NaCl 0,9%!) zur Beseitigung der anaeroben Laktatproduktion.
3. Differenzierte Indikation für Natriumbicarbonat:
   • Natriumbicarbonat 8,4% (50–100 mmol) NUR erwägen bei pH < 7,15 und NACH Sicherstellung einer ausreichenden alveolären Ventilation, da durch die Pufferung CO2 entsteht (HCO3- + H+ ↔ H2CO3 ↔ H2O + CO2), das zwingend abgeatmet werden muss, um eine intrazelluläre paradoxe Azidose zu verhindern!`,
        answer_tr: `Tanı: Ventilatör yetmezliği ve doku hipoperfüzyonuna bağlı kombine ağır respiratuar ve laktik asidoz.
Öncelikli Tedavi Basamakları:
1. Solunumsal Acil Düzeltme (CO2 atılımı ve hipokseminin giderilmesi):
   • %100 Oksijen (FiO2 1,0).
   • Spontan soluyorsa acil NİV veya endotrakeal entübasyon.
   • Ventilatörde ise dakika ventilasyonunu artırarak (solunum sayısı ve Vt 6 ml/kg PBW optimizasyonu) PaCO2'yi kontrollü şekilde 35–40 mmHg'ye düşür.
2. Hemodinamik Kausal Tedavi (Doku perfüzyonunun sağlanması):
   • Noradrenalin perfüzörü ile hedef MAP ≥ 65 mmHg sağlanması.
   • Dengeli kristaloidlerle hedefe yönelik volüm replasmanı (anaerobik laktat üretimini kırmak için).
3. Sodyum Bikarbonat Endikasyonu:
   • Yalnızca pH < 7,15 ise ve MUTLAKA alveoler ventilasyon güvenceye alındıktan sonra düşünülmelidir; çünkü bikarbonat tamponlaması CO2 üretir ve bu CO2 atılamazsa hücre içi paradoksal asidoz derinleşir!`
      };
    }

    // 6. Kinderanästhesie & Pädiatrie
    if (category.includes('Kinder') || category.includes('Pädiatrie')) {
      return {
        question_de: 'Der Prüfer interveniert im Saal: "Unmittelbar nach Extubation eines 3-jährigen Kindes kommt es zu Stridor, thorakalen Einziehungen und die SpO2 stürzt auf 72% ab bei Bradykardie von 45/min. Wie lautet Ihr Notfallalgorithmus?"',
        question_tr: 'Jüri müdahale ediyor: "3 yaşındaki bir çocuğun ekstübasyonundan hemen sonra stridor, göğüs çekilmeleri gelişiyor ve SpO2 %72\'ye, kalp hızı 45/dk\'ya düşüyor. Acil durum algoritmanız nedir?"',
        answer_de: `Diagnose: Akuter Laryngospasmus mit bedrohlicher hypoxischer Bradykardie.
Stufenplan:
1. Sofortmaßnahmen:
   • 100% O2 mit dicht sitzender Maske und CPAP (APL-Ventil auf 15–20 cmH2O zudrehen, kontinuierlicher Überdruck sprengt den Spasmus).
   • Larson-Handgriff ("Laryngospasm notch"): Beidseitig kräftiger Druck mit den Mittelfingern in die Grube hinter dem aufsteigenden Unterkieferast (Processus mastoideus / Kieferwinkel) nach anterior-medial.
   • Rachenraum vorsichtig von Blut/Sekret absaugen (keine tiefe mechanische Reizung der Glottis!).
2. Medikamentöse Eskalation:
   • Wenn Spasmus persistiert: Propofol-Bolus 0,5–1,0 mg/kg i.v. zur Spasmusdurchbrechung.
3. K.O.-Kriterium bei Bradykardie:
   • Fällt HF < 60/min oder droht Asystolie: ZWINGEND Succinylcholin (0,5–1,0 mg/kg i.v. oder 3–4 mg/kg i.m.) ZUSAMMEN MIT ATROPIN (0,02 mg/kg i.v., Mindestdosis 0,1 mg)!
   • Niemals Succinylcholin ohne Atropin beim hypoxischen Kleinkind geben (Gefahr des vagalen Herzstillstands!).
   • Re-Intubation mit gecufftem Tubus (Größe: Alter/4 + 3,5 = 3/4 + 3,5 = 4,0 oder 4,5 mm ID).`,
        answer_tr: `Tanı: Hipoksik bradikardi ile seyreden akut laringospazm (Pediyatrik acil!).
Basamaklı Müdahale Planı:
1. İlk Müdahaleler:
   • Sıkı oturan maske ile %100 O2 ve sürekli CPAP (APL valfini 15–20 cmH2O'ya sıkarak spazmı aşmak).
   • Larson manevrası: Mastoid çıkıntı arkası çene köşesine iki elle derin bası uygulayarak laringospazmı kırmak.
   • Nazikçe farenksteki sekresyonu aspire etmek.
2. İlaçlı Kademeli Yaklaşım:
   • Spazm çözülmezse düşük doz Propofol (0,5–1 mg/kg i.v.).
3. Hayati K.O. Kriteri:
   • Kalp hızı < 60/dk altına inerse: Süksinilkolin (0,5–1,0 mg/kg i.v.) MUTLAKA ATROPİN (0,02 mg/kg i.v., min 0,1 mg) ile birlikte uygulanmalıdır! Atropinsiz süksinilkolin vagal asistoliye yol açar.
   • Kafli tüple re-entübasyon (Tüp çapı = Yaş/4 + 3,5).`
      };
    }

    // 7. Regionalanästhesie
    if (category.includes('Regional')) {
      return {
        question_de: 'Der Prüfer hakt nach: "Bei Anlage einer interskalenären Plexusblockade klagt der Patient plötzlich über Heiserkeit, Atemnot und Sie bemerken eine Ptosis und Miosis einseitig. Welche Nerven sind tangiert und wie klären Sie den Patienten auf?"',
        question_tr: 'Jüri sorguluyor: "İnterskalen blok uygulaması sırasında hasta aniden ses kısıklığı, nefes darlığı tarifliyor ve tek taraflı pitozis ile miyozis fark ediyorsunuz. Hangi sinirler etkilenmiştir ve hastayı nasıl aydınlatırsınız?"',
        answer_de: `Anatomische Ursachen & Betroffene Nerven:
1. Horner-Syndrom (Ptosis, Miosis, Enophthalmus):
   • Ursache: Akzidentelle Mitblockade des zervikalen Truncus sympathicus / Ganglion stellatum durch nach medial diffundierendes Lokalanästhetikum.
2. Heiserkeit & Klossgefühl:
   • Ursache: Blockade des N. laryngeus recurrens (Ast des N. vagus) mit einseitiger Stimmlippenparese.
3. Atemnot & verminderte Lungenbelüftung:
   • Ursache: 100%ige ipsilaterale N. phrenicus-Parese (Zwerchfellhochstand) bei anteriorer Diffusion über den M. scalenus anterior.
Vorgehen & Aufklärung:
• Patient sofort beruhigen: Das ist eine bekannte, vollkommen reversible Begleitwirkung und KEINE bleibende Nervenschädigung!
• Oberkörper hochlagern, Sauerstoffinsufflation über Nasenbrille (2–4 l/min).
• Pulsoxymetrie und Atemmuster engmaschig überwachen.
• Bei schweren vorbestehenden pulmonalen Vorerkrankungen (schwere COPD, Lungenfibrose) ist die interskalenäre Blockade wegen des Phrenicus-Ausfalls kontraindiziert.`,
        answer_tr: `Anatomik Nedenler ve Etkilenen Sinirler:
1. Horner Sendromu (Pitozis, miyozis, enoftalmus): Mediyale yayılan lokal anesteziğin servikal sempatik zinciri / ganglion stellatum'u bloke etmesi.
2. Ses kısıklığı: N. laryngeus recurrens blokajına bağlı tek taraflı vokal kord felci.
3. Nefes darlığı: M. scalenus anterior önünden geçen N. phrenicus'un %100 oranında geçici blokajı sonucu tek taraflı diyafram parezisi.
Yönetim ve Bilgilendirme:
• Hastayı rahatlat: Tamamen geçici, ilacın etkisi geçince düzelecek fizyolojik bir yan etkidir, kalıcı hasar değildir.
• Baş yukarı pozisyon ver, nazal 2–4 l/dk O2 desteği sağla.
• İleri KOAH hastalarında frenik sinir felci nedeniyle interskalen blok kontrendikedir.`
      };
    }

    // 8. Reanimation & Notfallmedizin / ALS
    if (category.includes('Notfall') || category.includes('Reanimation') || category.includes('ALS')) {
      return {
        question_de: 'Der Prüfer konfrontiert Sie: "Mitten im Eingriff meldet der Monitor Kammerflimmern. Nach dem 1. Schock (200 J biphasisch) und 2 Minuten CPR persistiert das Flimmern. Ein Kollege ruft: \'Gib sofort 1 mg Adrenalin!\' Wie entscheiden Sie und warum?"',
        question_tr: 'Jüri yüzleştiriyor: "Ameliyat esnasında monitörde ventriküler fibrilasyon görülüyor. 1. şok (200 J) ve 2 dk KPR sonrası VF sürüyor. Bir meslektaşınız \'Hemen 1 mg Adrenalin yap!\' diyor. Kararınız nedir ve neden?"',
        answer_de: `Entscheidung: KLARES VETO! ("Halt, Stopp! Nach aktuellen ERC-Leitlinien wird nach dem 1. und 2. Schock KEIN Adrenalin verabreicht!").
Begründung & Korrekter Algorithmus:
1. Begründung:
   • Eine zu frühe Adrenalingabe nach dem 1. oder 2. Schock erhöht die myokardiale Sauerstoffschuld und induziert refraktäre Arrhythmien, ohne das Überleben zu verbessern.
2. Korrekte Reanimationsfolge bei schockbarem Rhythmus (VF / pVT):
   • 1. Schock (200 J biphasisch) → Sofort 2 Minuten Herzdruckmassage (100–120/min kontinuierlich).
   • Rhythmusanalyse: Persistierendes VF → 2. Schock abgeben → Sofort 2 Minuten CPR!
   • Rhythmusanalyse: Persistierendes VF → 3. SCHOCK abgeben → JETZT ERST:
     - Adrenalin 1 mg i.v./i.o. verabreichen (dann alle 3–5 min / jeden 2. Zyklus wiederholen).
     - Amiodaron 300 mg i.v. Bolus (oder Lidocain 100 mg i.v. als Alternative). Nach dem 5. Schock nochmals Amiodaron 150 mg i.v.
3. Reversible Ursachen (4Hs & HITS) parallel abarbeiten:
   • Hypoxie, Hypovolämie, Hypo-/Hyperkaliämie, Hypo-/Hyperthermie.
   • Herzbeuteltamponade, Intoxikation, Thromboembolie, Spannungspneumothorax.`,
        answer_tr: `Karar: KESİN VETO! ("Durun! ERC kılavuzlarına göre 1. ve 2. şoktan sonra Adrenalin KESİNLİKLE VERİLMEZ!").
Gerekçe ve Doğru Algoritma:
1. Gerekçe: Erken adrenalin miyokardiyal oksijen tüketimini artırır ve dirençli VF'yi tetikler.
2. Şoklanabilir Ritimde Doğru Sıralama:
   • 1. Şok (200 J) → Kesintisiz 2 dakika KPR.
   • Ritim kontrolü: VF sürüyor → 2. Şok → Kesintisiz 2 dakika KPR.
   • Ritim kontrolü: VF sürüyor → 3. ŞOK → İŞTE ŞİMDİ İLK KEZ:
     - Adrenalin 1 mg i.v. (ardından her 3–5 dakikada bir).
     - Amiodaron 300 mg i.v. bolus (5. şok sonrası 150 mg tekrar).
3. 4H ve 4T geri döndürülebilir nedenleri dışla.`
      };
    }

    // 9. Intensivmedizin & Sepsis
    if (category.includes('Intensiv') || category.includes('Sepsis')) {
      return {
        question_de: 'Der Prüfer verschärft die Lage: "Auf der Intensivstation entwickelt der Patient im septischen Schock trotz 30 ml/kg Kristalloiden und Noradrenalin (0,4 µg/kg/min) einen MAP von nur 52 mmHg und Laktat 5,2 mmol/l. Welcher Zweitlinien-Vasopressor ist indiziert und wie dosieren Sie ihn?"',
        question_tr: 'Jüri durumu zorlaştırıyor: "Yoğun bakımda septik şoktaki hastada 30 ml/kg sıvı ve noradrenalin (0,4 µg/kg/dk) rağmen MAP 52 mmHg ve laktat 5,2 mmol/l kalıyor. Hangi 2. basamak vazopressör endikedir ve nasıl dozlarsınız?"',
        answer_de: `Leitlinien-Therapie nach Surviving Sepsis Campaign (SSC):
1. Zweitlinien-Vasopressor der Wahl:
   • Vasopressin (Argipressin) hinzufügen!
   • Dosierung: Fixe Laufrate von 0,03 I.E./min (wird NICHT titriert!).
   • Rationale: Durch relative Vasopressin-Defizienz bei Sepsis kommt es zu deutlicher Vasokonstriktion über V1-Rezeptoren und drastischer Einsparung von Noradrenalin.
2. Ergänzende Maßnahmen bei vasopressor-refraktärem Schock:
   • Hydrocortison: 200 mg/Tag i.v. (entweder kontinuierlich 8,3 mg/h oder 50 mg alle 6h i.v.) zur Behebung der relativen Nebennierenrindeninsuffizienz.
   • Bei myokardialer Dysfunktion (erhöhte Füllungsdrücke, LVEF erniedrigt im TTE): Dobutamin-Perfusor (2–10 µg/kg/min) zuschalten.
3. Kardinalfehler vermeiden:
   • Keine synthetischen Kolloide (HES / Gelatine) nachgeben (Nephrotoxizität und erhöhte Mortalität!).
   • Kein weiteres unkontrolliertes "Überwässern" nach den initialen 30 ml/kg (Gefahr von Lungenödem, Bauchkapselödem, Organstauung).
   • Ziel-MAP strikt ≥ 65 mmHg halten!`,
        answer_tr: `Surviving Sepsis Kılavuzuna Göre Yaklaşım:
1. Seçilecek 2. Basamak Vazopressör:
   • Vazopressin (Argipressin) eklenmelidir!
   • Doz: 0,03 Ü/dk SABİT HIZDA (titre edilmez!).
   • Rasyonel: V1 reseptörleri üzerinden vazokonstriksiyon sağlayarak noradrenalin ihtiyacını dramatik biçimde azaltır.
2. Dirençli Şokta Ek Tedaviler:
   • Hidrokortizon 200 mg/gün i.v. (rölatif adrenal yetmezliği düzeltmek için).
   • Miyokardiyal disfonksiyon varsa Dobutamin (2–10 µg/kg/dk) infüzyonu.
3. Hatalardan Kaçınma: Sentetik kolloidlerden (HES) kesinlikle kaçın, aşırı sıvı yüklemesi yapma, hedef MAP ≥ 65 mmHg koru.`
      };
    }

    // 10. Transfusionsmedizin & Hämostaseologie
    if (category.includes('Transfusion') || category.includes('Hämostase')) {
      return {
        question_de: 'Der Prüfer fordert Sie heraus: "Bei intraoperativer Massivblutung zeigt das ROTEM: EXTEM CT normal, aber FIBTEM A10 nur 6 mm. Der Chirurg fordert sofort 4 FFP. Wie lautet Ihre gezielte Gerinnungstherapie nach aktuellen Leitlinien?"',
        question_tr: 'Jüri meydan okuyor: "Masif intraoperatif kanamada ROTEM sonucu: EXTEM CT normal, ancak FIBTEM A10 yalnızca 6 mm. Cerrah acilen 4 ünite TDP istiyor. Güncel kılavuzlara göre hedefe yönelik kanama yönetiminiz nedir?"',
        answer_de: `Entscheidung: Widerspruch gegen die blinde FFP-Gabe!
Begründung & Gezielter ROTEM-Algorithmus:
1. Rationale:
   • FIBTEM A10 von 6 mm entspricht einer kritischen Hypofibrinogenämie (< 1,5 g/l).
   • FFP enthalten pro Beutel nur ca. 1,5–2,0 g Fibrinogen in großem Volumen (~250–300 ml). Um 4 g Fibrinogen zuzuführen, müssten 2 Liter FFP transfundiert werden → fatale Hypervolämie mit Rechtsherzüberlastung (TACO) oder immunologischer Lungenschädigung (TRALI) und Verdünnungskoagulopathie!
2. Gezielte Substitution:
   • Fibrinogenkonzentrat: Sofort 2–4 g i.v. (Faustformel: Erhöhung des FIBTEM A10 um 2 mm pro 1 g Fibrinogen beim 70-kg-Patienten; Ziel-FIBTEM A10 ≥ 10–12 mm).
   • Tranexamsäure: 1–2 g i.v. als Kurzinfusion über 10 min (falls noch nicht erfolgt, zwingend innerhalb der ersten 3 Stunden nach Blutungsbeginn zur Vermeidung von Hyperfibrinolyse).
3. Kalzium- und Temperaturkontrolle:
   • Ionisiertes Kalzium zwingend > 1,1–1,2 mmol/l halten (Calciumgluconat/Calciumchlorid i.v. bei Zitratbelastung durch EK-Gabe).
   • Körperkerntemperatur > 36,0 °C durch aktive Wärmematten und Blutwärmer sichern.`,
        answer_tr: `Karar: Körü körüne TDP verilmesine VETO!
Gerekçe ve Hedefe Yönelik Tedavi:
1. Rasyonel: FIBTEM A10 = 6 mm kritik hipofibrinojenemiyi (< 1,5 g/l) gösterir. TDP düşük fibrinojen içerir ve hacim yüklenmesine (TACO/TRALI) yol açar.
2. Spesifik Tedavi:
   • Fibrinojen konsantresi: Anında 2–4 g i.v. (Hedef FIBTEM A10 ≥ 10–12 mm).
   • Traneksamik asit: 1–2 g i.v. (ilk 3 saatte hiperfibrinolizi önlemek için).
3. Kalsiyum ve Sıcaklık: İyonize kalsiyum > 1,1 mmol/l ve vücut sıcaklığı > 36 °C tutulmalıdır.`
      };
    }

    // 11. Geburtshilfliche Anästhesie
    if (category.includes('Geburt') || category.includes('Sectio')) {
      return {
        question_de: 'Der Prüfer schlägt vor: "Bei einer Eklampsie mit generalisiertem Krampfanfall und RR 210/120 mmHg rät die Hebamme zur schnellen Gabe von 10 mg Diazepam. Wie reagieren Sie und was ist die evidenzbasierte Therapie?"',
        question_tr: 'Jüri öneriyor: "Eklampsi nöbeti geçiren ve tansiyonu 210/120 mmHg olan gebede ebe hızla 10 mg diazepam yapılmasını öneriyor. Yanıtınız ve kanıta dayalı tedaviniz nedir?"',
        answer_de: `Entscheidung: Sofortiger Widerspruch gegen Diazepam!
Leitlinienkonzept bei Eklampsie (DGGG/DGAI):
1. Krampfdurchbrechung & -prophylaxe (Mittel der 1. Wahl):
   • Magnesiumsulfat (MgSO4): 4–6 g i.v. als Kurzinfusion über 15–20 Minuten.
   • Anschließend Erhaltungsdosis von 1–2 g/h über Perfusor für mindestens 24 Stunden postpartal.
   • Zwingend am Bett bereithalten: Calciumgluconat 10% (10 ml i.v. langsam) als spezifisches Antidot bei Magnesiumtoxizität (Atemdepression, Reflexverlust).
   • Benzodiazepine sind kontraindiziert bzw. nur absolute Reserve bei refraktärem Status epilepticus, da sie die fetale Depression massiv verstärken und die mütterliche Vigilanz trüben.
2. Blutdrucksenkung:
   • Urapidil: 12,5–25 mg i.v. langsam titriert oder Perfusor (Ziel-RR systolisch 140–160 mmHg, diastolisch 90–105 mmHg; nicht zu tief senken wegen uteroplazentarer Minderperfusion!).
3. Geburtshilfliche Sofortmaßnahmen:
   • Zwingend 15–30° Linksseitenkippung des OP-Tischs zur Entlastung der Vena cava inferior!
   • Zügige Indikationsstellung zur Notsectio (EEZ ≤ 20 min).`,
        answer_tr: `Karar: Diazepam önerisine KESİN RET!
Kılavuzlara Uygun Eklampsi Tedavisi:
1. Nöbet Tedavisi ve Profilaksisi (1. Seçenek):
   • Magnezyum sülfat: 4–6 g i.v. yükleme dozu (15–20 dakikada), ardından 1–2 g/saat idame infüzyon.
   • Antidot Kalsiyum glukonat %10 başucunda hazır bekletilmelidir.
   • Benzodiazepinler fetal solunum depresyonunu artırdığı için kontrendikedir.
2. Tansiyon Kontrolü: Urapidil 12,5–25 mg i.v. yavaş titrasyon (hedef sistolik 140–160 mmHg).
3. Doğum Önlemleri: Vena kava basısını önlemek için masayı 15–30° sola eğ, acil sezaryen hazırlığı yap (EEZ ≤ 20 dk).`
      };
    }

    // 12. Thoraxanästhesie
    if (category.includes('Thorax')) {
      return {
        question_de: 'Der Prüfer simuliert: "Während der Einlungenventilation fällt die SpO2 trotz 100% FiO2 auf 78% ab. Nennen Sie das strukturierte 5-Stufen-Rettungsschema bei akuter OLV-Hypoxämie!"',
        question_tr: 'Jüri simüle ediyor: "Tek akciğer ventilasyonu sırasında %100 FiO2\'ye rağmen SpO2 %78\'e düşüyor. Akut OLV hipoksemisinde 5 basamaklı kurtarma şemasını sayınız!"',
        answer_de: `Strukturiertes 5-Stufen-Hypoxämieschema (Hohn / DGAI):
• Stufe 1: FiO2 an der abhängigen (ventilierten) Lunge sofort auf 1,0 erhöhen. Beatmungsdruck und Tidalvolumen kontrollieren (Vt 4–6 ml/kg PBW).
• Stufe 2: Fiberoptische Tubuslagekontrolle! Bronchoskop über den DLT einführen und Carina sowie Bronchialmanschette inspizieren (häufigste Ursache ist DLT-Dislokation oder Sekretverlegung!).
• Stufe 3: CPAP an die nicht-ventilierte (operierte) Lunge anlegen (2–5 cmH2O mit 100% O2). Das oxygeniert das Shuntblut der kollabierten Lunge, ohne die chirurgische Sicht nennenswert zu behindern!
• Stufe 4: PEEP an der ventilierten Lunge vorsichtig hochtitrieren (5–10 cmH2O) zur Atelektasenrekrutierung (Cave: Zu hoher PEEP leitet Blut in die nicht-ventilierte Shunt-Lunge um!).
• Stufe 5: Wenn SpO2 < 85% persistiert: Sofortige Unterbrechung der Einlungenventilation! Operateur auffordern, die Lunge freizugeben, und Wiederaufnahme der 2-Lungen-Ventilation bis zur Stabilisierung.`,
        answer_tr: `Tek Akciğer Ventilasyonunda 5 Basamaklı Hipoksemi Algoritması:
• 1. Basamak: Havalandırılan akciğere derhal %100 FiO2 ver, Vt 4–6 ml/kg PBW kontrol et.
• 2. Basamak: Fiberoptik bronkoskopi ile çift lümenli tüpün yerini kontrol et (en sık neden dislokasyon veya sekresyondur!).
• 3. Basamak: Havalandırılmayan kollabe akciğere 2–5 cmH2O CPAP uygula (%100 O2 ile şant kanını oksijenlendirir).
• 4. Basamak: Havalandırılan akciğere PEEP (5–10 cmH2O) titre et.
• 5. Basamak: SpO2 < %85 sürerse cerraha haber vererek tek akciğer ventilasyonunu derhal durdur ve iki akciğeri de havalandır.`
      };
    }

    // 13. Neuroanästhesie & ICP
    if (category.includes('Neuro') || category.includes('ICP') || category.includes('SHT')) {
      return {
        question_de: 'Der Prüfer stellt eine Falle: "Bei akutem Schädel-Hirn-Trauma mit ICP 28 mmHg schlägt der Notarzt vor, den MAP auf 60 mmHg zu senken, um die Hirnblutung nicht zu verstärken. Warum führt das zum sofortigen Durchfallen?"',
        question_tr: 'Jüri bir tuzak kuruyor: "KİBAS ve ICP 28 mmHg olan kafa travmalı hastada acil hekimi kanamayı artırmamak için MAP\'ı 60 mmHg\'ye düşürmeyi öneriyor. Bu neden sınavdan anında kalma nedenidir?"',
        answer_de: `Prüfungsfalle & K.O.-Kriterium:
• Physiologie: Der zerebrale Perfusionsdruck (CPP) berechnet sich als: CPP = MAP - ICP.
• Bei einem MAP von 60 mmHg und einem ICP von 28 mmHg beträgt der CPP nur: 60 - 28 = 32 mmHg!
• Die Leitlinien fordern zwingend einen Ziel-CPP von ≥ 60–70 mmHg!
• Ein CPP von 32 mmHg führt zur akuten ischämischen Nekrose des Hirnparenchyms, zerebralem Ödem und fataler Einklemmung im Foramen magnum!
Korrekte Therapiemaßnahmen:
1. MAP sofort mit Noradrenalin auf mindestens 90–100 mmHg anheben, um den CPP > 65 mmHg zu garantieren!
2. Oberkörper 30° hochlagern (venöser Abfluss optimieren, keine Halsvenenstauung).
3. Osmotherapie: Hypertones NaCl (z. B. NaCl 3% Bolus 2 ml/kg) oder Mannitol 20% (0,5–1 g/kg i.v.).
4. Tiefe Sedierung und Analgesie (Propofol/Sufentanil), Normokapnie (PaCO2 35–38 mmHg; keine tiefe Dauerhyperventilation!).`,
        answer_tr: `Tuzak ve K.O. Kriteri:
• Serebral perfüzyon basıncı formülü: CPP = MAP - ICP.
• MAP 60 ve ICP 28 iken CPP yalnızca 32 mmHg olur (Kılavuzlar en az 60–70 mmHg şart koşar!). Bu ölümcül iskemi ve fıtıklaşmaya yol açar.
Doğru Yaklaşım:
1. Noradrenalin ile MAP'ı hemen ≥ 90–100 mmHg seviyesine yükselt.
2. Baş 30° yukarı pozisyon ver, juguler drenajı rahatlat.
3. Osmoterapi: Hipertonik salin (%3 NaCl 2 ml/kg) veya Mannitol %20.
4. Derin sedasyon, normokapni (PaCO2 35–38 mmHg).`
      };
    }

    // 14. Aufwachraum & Postoperative Komplikationen
    if (category.includes('Aufwachraum') || category.includes('Lungenödem')) {
      return {
        question_de: 'Der Prüfer konfrontiert Sie im Aufwachraum: "30 Minuten nach komplikationsloser Extubation entwickelt ein junger muskulöser Patient plötzlich akute Dyspnoe, blutigen schaumigen Auswurf und die SpO2 stürzt auf 76%. Was ist passiert und wie therapieren Sie?"',
        question_tr: 'Jüri derlenme odasında soruyor: "Sorunsuz ekstübasyondan 30 dk sonra genç kaslı bir hastada aniden ağır dispne, kanlı köpüklü balgam gelişiyor ve SpO2 %76\'ya düşüyor. Ne oldu ve nasıl tedavi edersiniz?"',
        answer_de: `Diagnose: Negativdruck-Lungenödem (NPPE - Negative Pressure Pulmonary Edema / Müller-Manöver).
Pathophysiologie:
• Nach Laryngospasmus oder Tubusbiss atmet der muskulöse Patient mit maximaler Inspiration gegen die verschlossene Glottis an.
• Erzeugung massiver intrathorakaler Unterdrücke (bis -50 bis -100 cmH2O) führt zum steilen Anstieg des venösen Rückstroms und Zerreißung der Alveolo-Kapillären-Membran mit massivem transsudativem Permeabilitätsödem.
Therapie:
1. 100% Sauerstoff unter kontinuierlichem CPAP (10–12 cmH2O) oder NIV zur mechanischen Verdrängung des Ödems aus den Alveolen.
2. Oberkörper aufrecht lagern (Vorlastsenkung).
3. Sedierung und Beruhigung (z. B. Morphin 2–5 mg i.v. titriert).
4. Bei schwerer Erschöpfung oder Hypoxie: Sofortige Re-Intubation und invasive PEEP-Beatmung (PEEP 10–14 mbar). Typischerweise rasche Erholung binnen 12–24 Stunden.`,
        answer_tr: `Tanı: Negatif Basınçlı Akciğer Ödemi (NPPE / Müller manevrası).
Patofizyoloji: Laringospazm veya tüp ısırma sonrası kapalı glottise karşı güçlü soluma çabası göğüs içinde aşırı negatif basınç yaratarak alveollere sıvı dolmasına neden olur.
Tedavi:
1. %100 Oksijen ile sürekli CPAP (10–12 cmH2O) veya NİV.
2. Oturur pozisyon (baş yukarı).
3. Titre edilerek morfin i.v. (ön yükü azaltmak için).
4. Yetersiz kalırsa PEEP (10–14 mbar) ile acil re-entübasyon.`
      };
    }

    // 15. Default / Allgemeine Anästhesie
    return {
      question_de: 'Der Prüfer fragt weiter: "Welche pathophysiologischen Mechanismen begründen Ihre Therapiestrategie und welche gravierenden Fehler dürfen Ihnen hier unter keinen Umständen unterlaufen?"',
      question_tr: 'Jüri sormaya devam ediyor: "Tedavi stratejinizi hangi patofizyolojik mekanizmalar gerekçelendirir ve burada hiçbir koşulda yapmamanız gereken vahim hatalar nelerdir?"',
      answer_de: `Prüfer-Erwartungshorizont & Strukturierte Facharzt-Antwort:
1. Pathophysiologische Begründung nach ABCDE:
   • Airway & Breathing: Frühe Sicherung der Oxygenierung und Ventilation zur Vorbeugung sekundärer Hypoxieschäden (Gehirn, Myokard).
   • Circulation: Aufrechterhaltung eines zielgerichteten Organperfusionsdrucks (Ziel-MAP ≥ 65 mmHg) durch balancierte Volumentherapie und frühzeitigen Vasopressoreinsatz (Noradrenalin) vor übermäßiger Volumenüberladung.
2. Die 3 Kardinalfehler & K.O.-Kriterien:
   • 1. Zeitverzögerung lebensrettender Maßnahmen durch unstrukturiertes Handeln ("Treat first what kills first!").
   • 2. Verabreichung absolut kontraindizierter Substanzen (z. B. Kalziumantagonisten bei Maligner Hyperthermie, Benzodiazepine als 1. Wahl bei Eklampsie, Spinalanästhesie bei schwerer Aortenklappenstenose).
   • 3. Fehlende Teamführung und geschlossene Kommunikation (Closed-Loop) im Notfall.`,
      answer_tr: `Uzmanlık Sınavı Yanıtı:
1. ABCDE Patofizyolojik Temellendirme:
   • Oksijenasyon ve ventilasyonun erken güvenceye alınması ile sekonder organ hasarının önlenmesi.
   • Noradrenalin ile hedef MAP ≥ 65 mmHg organ perfüzyon basıncının korunması, aşırı sıvı yüklenmesinden kaçınılması.
2. 3 Vahim Hata ve K.O. Kriteri:
   • 1. Tedavi edilebilir hayati nedenlerin geciktirilmesi.
   • 2. Kontrendike ilaçların verilmesi (MH'de kalsiyum blokeri, eklampside ilk seçenek olarak diazepam verilmesi vb.).
   • 3. Kapalı devre ekip iletişiminin (Closed-loop) uygulanmaması.`
    };
  }

  function getDynamicExaminerComplication(category, stem) {
    return getDynamicExaminerCase(category, stem).question_de;
  }

  function getDynamicExaminerComplicationTR(category, stem) {
    return getDynamicExaminerCase(category, stem).question_tr;
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

  function generateVerbalFrameworkTR(category, stem, answer) {
    if (category.includes('Atemweg')) {
      return '„Burada ABCDE şemasını önceliklendiriyor ve öncelikle havayolunu güvenceye alıyorum. Güncel DGAI/DAS kılavuzlarına göre yapılandırılmış yaklaşımı başlatıyor ve derhal zor havayolu setini hazır bulunduruyorum.“';
    } else if (category.includes('Herz') || category.includes('Hämo')) {
      return '„Durumu özetliyorum: Akut bir hemodinamik instabilite mevcuttur. Derhal oksijenasyonu ve damar yollarını güvenceye alıyor, yeterli perfüzyon basıncını sağlamak için (Hedef MAP ≥ 65 mmHg) noradrenalin titre ediyor ve hedefe yönelik neden araştırması yapıyorum.“';
    } else if (category.includes('Chemie') || category.includes('Elektrolyt') || category.includes('Säure')) {
      return '„Önde gelen ön tanı olarak elektrolit ve asit-baz dengesinde ciddi bir bozukluk tespit ediyorum. Terapötik yaklaşımım kesin olarak 3 aşamaya ayrılır: 1. Kardiyak membran stabilizasyonu, 2. Nedene yönelik tedavi ve 3. Yakın BGA takibi altında hızlandırılmış normalizasyon.“';
    } else if (category.includes('Pharmakologie') || category.includes('Notfall')) {
      return '„Bu anesteziyolojik acil duruma derhal müdahale ediyorum: Potansiyel tetikleyicilerin verilmesini derhal durduruyor, %100 oksijen uyguluyor, ekibi alarma geçiriyor ve tam antidot dozuyla spesifik acil durum protokolünü uyguluyorum.“';
    } else {
      return '„Klinik yanıtımı preoperatif risk sınıflandırması, intraoperatif monitörizasyon ve güncel kılavuzlara göre hedefe yönelik tedavi önlemleri olarak yapılandırıyorum.“';
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
      return '❌ Kardinalfehler (K.O.-Kriterium): Niemals Kalziumantagonisten (z. B. Diltiazem, Verapamil) bei Verdacht auf Maligne Hyperthermie geben – Gefahr des irreversiblen hyperkaliämischen Herzstillstands!';
    } else if (text.includes('last') || text.includes('lokalanästhetik')) {
      return '❌ Kardinalfehler (K.O.-Kriterium): Kein Vasopressin, kein Lidocain, kein Amiodaron bei LAST! Adrenalin nur streng titriert (< 1 µg/kg) dosieren!';
    } else if (text.includes('atemweg') || text.includes('intubat') || text.includes('cico')) {
      return '❌ Kritische Prüfungsfalle: Mehr als 3 Intubationsversuche ohne Optimierung (Videolaryngoskopie/BURP) überschreiten. Bei CICO sofort die Koniotomie einleiten!';
    } else if (text.includes('hyponatriäm') || text.includes('natrium')) {
      return '❌ Kardinalfehler (K.O.-Kriterium): Zu schneller Natriumausgleich bei chronischer Hyponatriämie (> 8–10 mmol/l/24h) birgt die tödliche Gefahr der pontinen Myelinolyse!';
    } else if (text.includes('hyperkaliäm') || text.includes('kalium')) {
      return '❌ Kardinalfehler (K.O.-Kriterium): Gabe von Succinylcholin bei bekannter Hyperkaliämie oder Verbrennungen > 24h (Gefahr des Asystolie-Stillstands)!';
    } else if (text.includes('spannungspneumothorax')) {
      return '❌ Kardinalfehler (K.O.-Kriterium): PEEP-Erhöhung bei V.a. Spannungspneumothorax verschärft den Kreislaufstillstand – sofort Nadel- bzw. Minithorakotomie durchführen!';
    } else {
      return '❌ Kritische Prüfungsfalle: Unstrukturiertes Reagieren ohne Priorisierung nach dem ABCDE-Schema sowie das Übersehen vitaler Kontraindikationen!';
    }
  }

  function generatePitfallsTR(category, stem, answer) {
    const text = (stem + ' ' + answer).toLowerCase();

    if (text.includes('maligne hyperthermie') || text.includes('dantrolen')) {
      return '❌ Ölümcül Hata (K.O. Kriteri): Malign Hipertermi şüphesinde ASLA kalsiyum antagonistleri (örn. Diltiazem, Verapamil) vermeyin – geri dönüşümsüz hiperkalemik kardiyak arrest riski!';
    } else if (text.includes('last') || text.includes('lokalanästhetik')) {
      return '❌ Ölümcül Hata (K.O. Kriteri): LAST durumunda vazopressin, lidokain veya amiodaron kullanılmaz! Adrenalin yalnızca sıkı titre edilmiş (< 1 µg/kg) dozda verilir!';
    } else if (text.includes('atemweg') || text.includes('intubat') || text.includes('cico')) {
      return '❌ Kritik Sınav Tuzağı: Optimizasyon (videolaringoskopi/BURP) olmadan 3\'ten fazla entübasyon denemesi yapmak. CICO durumunda derhal koniyotomi başlatılmalıdır!';
    } else if (text.includes('hyponatriäm') || text.includes('natrium')) {
      return '❌ Ölümcül Hata (K.O. Kriteri): Kronik hiponatremide sodyumun çok hızlı düzeltilmesi (> 8–10 mmol/l/24h) ölümcül santral pontin miyelinoliz riski doğurur!';
    } else if (text.includes('hyperkaliäm') || text.includes('kalium')) {
      return '❌ Ölümcül Hata (K.O. Kriteri): Bilinen hiperkalemide veya > 24 saatlik yanıklarda süksinilkolin verilmesi (asistoli riski)!';
    } else if (text.includes('spannungspneumothorax')) {
      return '❌ Ölümcül Hata (K.O. Kriteri): Tansiyon pnömotoraks şüphesinde PEEP artırılması dolaşım arrestini derinleştirir – derhal iğne/tüp torakostomi uygulanmalıdır!';
    } else {
      return '❌ Kritik Sınav Tuzağı: ABCDE şemasına göre önceliklendirme yapmadan plansız tepki vermek ve hayati kontrendikasyonları gözden kaçırmak!';
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

    const isSim = (mode === 'simulation');
    document.body.classList.toggle('mode-simulation-active', isSim);

    if (elExamSimulationBar) {
      elExamSimulationBar.style.display = isSim ? 'flex' : 'none';
    }

    // Update active tab buttons
    if (elModeTabSim) elModeTabSim.classList.toggle('active', mode === 'simulation');
    if (elModeTabGuide) elModeTabGuide.classList.toggle('active', mode === 'guideline');
    if (elModeTabCloze) elModeTabCloze.classList.toggle('active', mode === 'flashcard');

    if (elModeTabSim) elModeTabSim.setAttribute('aria-selected', mode === 'simulation');
    if (elModeTabGuide) elModeTabGuide.setAttribute('aria-selected', mode === 'guideline');
    if (elModeTabCloze) elModeTabCloze.setAttribute('aria-selected', mode === 'flashcard');

    if (isSim) {
      startExamSimulationTimer();
    } else {
      stopExamSimulationTimer();
      stopStepTimer();
      stopVoiceRecording();
    }

    state.currentIndex = 0;
    renderCurrentQuestion();
  }

  if (elModeTabSim) elModeTabSim.addEventListener('click', () => setStudyMode('simulation'));
  if (elModeTabGuide) elModeTabGuide.addEventListener('click', () => setStudyMode('guideline'));
  if (elModeTabCloze) elModeTabCloze.addEventListener('click', () => setStudyMode('flashcard'));
  if (elBtnStopExam) elBtnStopExam.addEventListener('click', () => setStudyMode('guideline'));

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

  if (elBadgeExaminerToggle && elExaminerRevealCard) {
    elBadgeExaminerToggle.addEventListener('click', () => {
      const isExpanded = elExaminerRevealCard.style.display !== 'none';
      elExaminerRevealCard.style.display = isExpanded ? 'none' : 'block';
      elBadgeExaminerToggle.setAttribute('aria-expanded', (!isExpanded).toString());
    });
  }

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
    // Step navigation & self-assessment numbers
    else if (key === '1') {
      if (elHighImpactRubric && elHighImpactRubric.style.display !== 'none') {
        selfAssess(true);
      } else {
        const elQCard = document.getElementById('question-card');
        if (elQCard) elQCard.scrollIntoView({ behavior: 'smooth' });
      }
    }
    else if (key === '2') {
      if (elHighImpactRubric && elHighImpactRubric.style.display !== 'none') {
        selfAssess(false);
      } else {
        toggleStep2();
      }
    }
    else if (key === '3') {
      toggleStep3();
    }
    else if (key === '4') {
      revealAnswer();
    }
    // K, G, R: Knew it (self assessment pass)
    else if (key === 'k' || key === 'g' || key === 'r') {
      selfAssess(true);
    }
    // F: Didn't know (self assessment fail)
    else if (key === 'f') {
      selfAssess(false);
    }
    // U: Toggle Turkish translation preview overlay for all visible boxes
    else if (key === 'u') {
      e.preventDefault();
      const allPreviews = document.querySelectorAll('.hover-tr-preview');
      if (allPreviews.length > 0) {
        const isAnyOpen = Array.from(allPreviews).some(p => p.classList.contains('force-visible'));
        allPreviews.forEach(p => p.classList.toggle('force-visible', !isAnyOpen));
      }
    }
    // P: Audio pronunciation
    else if (key === 'p') {
      e.preventDefault();
      const verbalBtn = document.getElementById('btn-audio-speak-verbal');
      const audioBtn = document.getElementById('btn-audio-speak');
      if (elHighImpactRubric && elHighImpactRubric.style.display !== 'none' && verbalBtn) {
        verbalBtn.click();
      } else if (audioBtn) {
        audioBtn.click();
      }
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
    // ? or H: Toggle Keyboard Shortcut HUD
    else if (e.key === '?' || key === 'h') {
      e.preventDefault();
      toggleShortcutModal();
    }
  });

  function navigateToNextQuestion() {
    stopVoiceRecording();
    stopStepTimer();
    if (elSpeechTranscriptInput) elSpeechTranscriptInput.value = '';
    if (elVoiceEvalCard) elVoiceEvalCard.style.display = 'none';

    filteredQuestions = getFilteredQuestions();
    if (state.currentIndex < filteredQuestions.length - 1) {
      state.currentIndex++;
      saveState();
      renderCurrentQuestion();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function navigateToPrevQuestion() {
    stopVoiceRecording();
    stopStepTimer();
    if (elSpeechTranscriptInput) elSpeechTranscriptInput.value = '';
    if (elVoiceEvalCard) elVoiceEvalCard.style.display = 'none';

    filteredQuestions = getFilteredQuestions();
    if (state.currentIndex > 0) {
      state.currentIndex--;
      saveState();
      renderCurrentQuestion();
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

    const isSimMode = (mode === 'simulation');
    if (elQuestionNumber) {
      if (isSimMode) {
        elQuestionNumber.textContent = `🏛️ ÄKNO Düsseldorf: Fall ${state.currentIndex + 1} von ${filteredQuestions.length}`;
      } else {
        const globalIdx = EXAM_QUESTIONS.findIndex(q => q.id === currentQ.id) + 1;
        elQuestionNumber.textContent = `Fall ${globalIdx} von ${EXAM_QUESTIONS.length} (${state.currentIndex + 1}/${filteredQuestions.length})`;
      }
    }

    if (elSimCaseCounter) {
      elSimCaseCounter.textContent = `🏛️ ÄKNO Düsseldorf: Fall ${state.currentIndex + 1} von ${filteredQuestions.length}`;
    }

    // Live ÄKNO Simulation Cockpit Setup
    if (elSimLiveCockpit) {
      elSimLiveCockpit.style.display = isSimMode ? 'block' : 'none';
      if (isSimMode) {
        const reg = (typeof MockExamSimulation !== 'undefined' && MockExamSimulation.getRegistry)
          ? MockExamSimulation.getRegistry(currentQ.id)
          : null;
        const prof = reg ? reg.examiner : getExaminerProfileForCase(currentQ);
        if (prof) {
          if (elSimExaminerName) elSimExaminerName.textContent = prof.name;
          if (elSimExaminerClinic) elSimExaminerClinic.textContent = prof.hospital;
        }
        if (elSimCrisisBanner) elSimCrisisBanner.style.display = 'none';
        if (elSimKoRadarDisplay) elSimKoRadarDisplay.style.display = 'none';
        const elMonDashboard = document.getElementById('clinical-monitor-dashboard');
        if (elMonDashboard) elMonDashboard.classList.remove('vital-crisis-flash');

        if (elQuestionText) elQuestionText.style.display = 'block';
        if (elSimPeekLabel) elSimPeekLabel.textContent = 'Falltext verbergen (Hörtest)';
      }
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

    // Step 3: Populate Examiner Steering Intervention, Inline Answer & Reveal Card
    if (elExaminerQuoteText) {
      elExaminerQuoteText.innerHTML = renderDualLanguageText(parsedCase.examinerIntervention, parsedCase.examinerInterventionTR);
    }
    if (elExaminerInlineAnswerText) {
      elExaminerInlineAnswerText.innerHTML = renderDualLanguageText(highlightDosagesAndUnits(parsedCase.examinerAnswer), highlightDosagesAndUnits(parsedCase.examinerAnswerTR));
    }
    if (elExaminerInlineAnswerBox) {
      elExaminerInlineAnswerBox.style.display = 'none';
    }
    if (elBtnToggleExaminerAnswer) {
      elBtnToggleExaminerAnswer.innerHTML = '<span>💡</span> Musterantwort anzeigen / Cevabı Gör';
    }

    // Step 4: Populate Examiner Solution Card
    if (elRubricExaminerPromptText) {
      elRubricExaminerPromptText.innerHTML = renderDualLanguageText(parsedCase.examinerIntervention, parsedCase.examinerInterventionTR);
    }
    if (elRubricExaminerSolutionText) {
      elRubricExaminerSolutionText.innerHTML = renderDualLanguageText(highlightDosagesAndUnits(parsedCase.examinerAnswer), highlightDosagesAndUnits(parsedCase.examinerAnswerTR));
    }

    const examinerProfile = getExaminerProfileForCase(currentQ);
    if (examinerProfile && elExaminerRevealBox && elExaminerRevealCard) {
      elExaminerRevealBox.style.display = 'block';
      elExaminerRevealCard.style.display = 'none';
      if (elBadgeExaminerToggle) elBadgeExaminerToggle.setAttribute('aria-expanded', 'false');
      if (elExaminerBadgeTitle) {
        const shortName = examinerProfile.name.split('/')[0].trim();
        elExaminerBadgeTitle.textContent = `🏛️ ÄKNO Düsseldorf: Prüfer-Profil (${shortName}) / Jüri Profili`;
      }
      const profKeywordsDE = examinerProfile.keywords || (reg && reg.koCriteria && reg.koCriteria.mandatoryKeywords ? reg.koCriteria.mandatoryKeywords.join(', ') : '');
      const profKeywordsTR = examinerProfile.keywords_tr || profKeywordsDE;
      elExaminerRevealCard.innerHTML = `
        <div class="examiner-reveal-header">
          <div class="examiner-reveal-name">👨‍⚕️ ${examinerProfile.name}</div>
          <div class="examiner-reveal-clinic">📍 ${examinerProfile.hospital}</div>
        </div>
        <div class="examiner-profile-grid">
          <div class="examiner-profile-item">
            <strong>🎯 Prüfungsschwerpunkt / Sınav Odak Noktası</strong>
            <div>${renderDualLanguageText(examinerProfile.focus, examinerProfile.focus_tr)}</div>
          </div>
          <div class="examiner-profile-item alert-trap">
            <strong>⚠️ Typische Prüfungsfalle / Sınav Tuzağı</strong>
            <div>${renderDualLanguageText(examinerProfile.trap, examinerProfile.trap_tr)}</div>
          </div>
          ${profKeywordsDE ? `
          <div class="examiner-profile-item alert-pass">
            <strong>⭐ Signalwörter für Bestnote / Başarı Anahtarları</strong>
            <div>${renderDualLanguageText(profKeywordsDE, profKeywordsTR)}</div>
          </div>` : ''}
        </div>
      `;
    } else if (elExaminerRevealBox) {
      elExaminerRevealBox.style.display = 'none';
    }

    // Step 4: Populate 3 High-Impact Model Answer Micro-Cards
    if (elRubricVerbalText) {
      elRubricVerbalText.innerHTML = renderDualLanguageText(parsedCase.verbalFramework, parsedCase.verbalFrameworkTR);
    }

    if (elRubricChecklistItems) {
      elRubricChecklistItems.innerHTML = '';
      parsedCase.checklist.forEach((itemText, idx) => {
        let itemTR = '';
        if (currentQ.options && currentQ.options[idx]) {
          const opt = currentQ.options[idx];
          const stTR = opt.is_correct ? '✅ Doğru:' : '❌ Yanlış:';
          itemTR = `${stTR} ${opt.text_tr || opt.text_de}${opt.explanation_tr ? ' — ' + opt.explanation_tr.split('.')[0] : ''}`;
        } else if (parsedCase.fullTextTR) {
          const trBullets = parsedCase.fullTextTR.split(/[•\n–-]/).map(s => s.trim()).filter(s => s.length > 15);
          itemTR = trBullets[idx] || parsedCase.fullTextTR.substring(0, 140);
        }

        const row = document.createElement('div');
        row.className = 'checklist-item-row translatable-box';
        if (itemTR) row.setAttribute('data-tr', itemTR);
        row.title = 'Antippen zum Abhaken';
        const formatted = (mode === 'flashcard') ? generateClozeMaskedHtml(itemText) : itemText;
        row.innerHTML = `
          <div class="checklist-item-main">
            <span class="checklist-check">✓</span> 
            <div class="checklist-item-text">${formatted}</div>
          </div>
          ${itemTR ? `<div class="hover-tr-preview" aria-hidden="true"><span class="hover-tr-badge">🇹🇷</span> <span class="hover-tr-content">${itemTR}</span></div>` : ''}
        `;
        row.addEventListener('click', (e) => {
          if (e.target && e.target.classList && e.target.classList.contains('cloze-blur')) return;
          row.classList.toggle('checked-active');
        });
        elRubricChecklistItems.appendChild(row);
      });
    }

    if (elRubricPitfallText) {
      elRubricPitfallText.innerHTML = `<div class="pitfall-item"><span>⚠️</span> <div>${renderDualLanguageText(parsedCase.pitfalls, parsedCase.pitfallsTR)}</div></div>`;
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
          optEl.dataset.key = opt.key;

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
              btnTrue.classList.add('active');
              btnFalse.classList.remove('active');
              optEl.classList.remove('opt-card-warning');
            });

            btnFalse.addEventListener('click', (e) => {
              e.stopPropagation();
              qState.userChoices[opt.key] = false;
              state.answers[currentQ.id] = qState;
              saveState();
              btnFalse.classList.add('active');
              btnTrue.classList.remove('active');
              optEl.classList.remove('opt-card-warning');
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
      if (elBtnCheck) {
        if (!qState.revealed && !qState.submitted) {
          elBtnCheck.style.display = 'inline-flex';
          elBtnCheck.innerHTML = `<span>👁️</span> Musterantwort freischalten <kbd class="kbd-hint">Space</kbd>`;
          elBtnCheck.className = 'btn btn-primary';
        } else {
          elBtnCheck.style.display = 'none';
        }
      }
    }

    // ──────────────────────── MODE SPECIFIC DISPLAY STATES ────────────────────────
    const isSim = (mode === 'simulation');
    document.body.classList.toggle('mode-simulation-active', isSim);

    if (elExamSimulationBar) {
      elExamSimulationBar.style.display = isSim ? 'flex' : 'none';
    }
    if (elSimCaseCounter && isSim) {
      elSimCaseCounter.textContent = `Fall ${state.currentIndex + 1} von ${filteredQuestions.length}`;
    }

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

      // Keep clinical vitals and examiner dialogue open for realistic immersion
      toggleStep2(true);
      toggleStep3(true);

      if (qState.revealed || qState.submitted) {
        if (elRevealContainer) elRevealContainer.style.display = 'none';
        if (elHighImpactRubric) elHighImpactRubric.style.display = 'flex';
        if (elSelfAssessContainer) elSelfAssessContainer.style.display = 'flex';
      } else {
        if (elRevealContainer) elRevealContainer.style.display = 'flex';
        if (elHighImpactRubric) elHighImpactRubric.style.display = 'none';
        if (elSelfAssessContainer) elSelfAssessContainer.style.display = 'none';
      }
    }

    // Self-assessment status buttons & Dock sync
    const elDockSelfAssess = document.getElementById('dock-self-assess');
    const elBtnDockKnewIt = document.getElementById('btn-dock-knew-it');
    const elBtnDockDidntKnow = document.getElementById('btn-dock-didnt-know');

    const isOpenCase = (!currentQ.options || !currentQ.options.length);
    const isAnswerRevealed = qState.revealed || qState.submitted;

    if (elDockSelfAssess) {
      elDockSelfAssess.style.display = (isOpenCase && isAnswerRevealed) ? 'flex' : 'none';
    }

    if (qState.submitted) {
      if (qState.isCorrect) {
        if (elBtnKnewIt) elBtnKnewIt.classList.add('selected');
        if (elBtnDidntKnow) elBtnDidntKnow.classList.remove('selected');
        if (elBtnDockKnewIt) elBtnDockKnewIt.classList.add('selected');
        if (elBtnDockDidntKnow) elBtnDockDidntKnow.classList.remove('selected');
      } else {
        if (elBtnKnewIt) elBtnKnewIt.classList.remove('selected');
        if (elBtnDidntKnow) elBtnDidntKnow.classList.add('selected');
        if (elBtnDockKnewIt) elBtnDockKnewIt.classList.remove('selected');
        if (elBtnDockDidntKnow) elBtnDockDidntKnow.classList.add('selected');
      }
    } else {
      if (elBtnKnewIt) elBtnKnewIt.classList.remove('selected');
      if (elBtnDidntKnow) elBtnDidntKnow.classList.remove('selected');
      if (elBtnDockKnewIt) elBtnDockKnewIt.classList.remove('selected');
      if (elBtnDockDidntKnow) elBtnDockDidntKnow.classList.remove('selected');
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
    let sm2Item = null;
    if (typeof SM2Engine !== 'undefined') {
      state.sm2Data = state.sm2Data || {};
      const quality = qualityOverride !== undefined ? qualityOverride : (knewIt ? 4 : 1);
      state.sm2Data[currentQ.id] = SM2Engine.calculateSM2(quality, state.sm2Data[currentQ.id]);
      sm2Item = state.sm2Data[currentQ.id];
    }

    if (knewIt) {
      const days = sm2Item ? sm2Item.interval : 1;
      const ease = sm2Item ? sm2Item.easeFactor : '2.5';
      showToast(`✅ Gewusst! SM-2 Intervall: Wiederholung in ${days} Tag(en) (EF: ${ease})`, 'success', 3200);
    } else {
      showToast(`🔄 Im Wiederholungs-Fokus gespeichert (morgen fällig).`, 'info', 3200);
    }

    // Daily study count tracking
    const todayStr = new Date().toISOString().slice(0, 10);
    if (state.dailyDate !== todayStr) {
      state.dailyDate = todayStr;
      state.dailyCount = 0;
    }
    state.dailyCount = (state.dailyCount || 0) + 1;

    saveState();
    renderCurrentQuestion();
    updateAnalytics();
  }

  // --- Check & Submit Answer (Interactive Options Mode) ---
  function checkAnswer() {
    filteredQuestions = getFilteredQuestions();
    if (!filteredQuestions.length) return;

    const currentQ = filteredQuestions[state.currentIndex];
    if (!currentQ.options || !currentQ.options.length) {
      revealAnswer();
      return;
    }
    let qState = state.answers[currentQ.id] || { userChoices: {}, submitted: false };

    if (qState.submitted) {
      // Reset for re-trying
      qState.submitted = false;
      qState.userChoices = {};
      state.answers[currentQ.id] = qState;
      saveState();
      renderCurrentQuestion();
      showToast(`🔄 Frage zur erneuten Bearbeitung zurückgesetzt.`, 'info', 2500);
      return;
    }

    // Check if user has answered all options
    const unAnsweredKeys = currentQ.options.filter(opt => qState.userChoices[opt.key] === undefined);
    if (unAnsweredKeys.length > 0) {
      const keysStr = unAnsweredKeys.map(o => o.key.toUpperCase()).join(', ');
      
      // Highlight the unanswered option cards with gentle warning pulse
      if (elOptionsContainer) {
        unAnsweredKeys.forEach(opt => {
          const card = elOptionsContainer.querySelector(`.option-card-item[data-key="${opt.key}"]`);
          if (card) {
            card.classList.remove('opt-card-warning');
            void card.offsetWidth; // Force reflow to replay pulse
            card.classList.add('opt-card-warning');
          }
        });
      }

      showToast(`Bitte alle Aussagen bewerten! Noch offen: ${keysStr}`, 'warning', 4000);
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
    let sm2Feedback = null;
    if (typeof SM2Engine !== 'undefined') {
      state.sm2Data = state.sm2Data || {};
      const quality = isPassed ? 4 : 1;
      state.sm2Data[currentQ.id] = SM2Engine.calculateSM2(quality, state.sm2Data[currentQ.id]);
      sm2Feedback = state.sm2Data[currentQ.id];
    }

    // Instant Clinical Feedback Toast
    if (isPassed) {
      const repTxt = sm2Feedback ? ` • Wiederholung in ${sm2Feedback.interval} Tag(en)` : '';
      showToast(`🎯 Bestanden! ${correctCount}/${totalOpts} Aussagen richtig bewertet${repTxt}`, 'success', 4000);
    } else {
      showToast(`⚠️ Nicht bestanden (${correctCount}/${totalOpts} richtig). Zur Wiederholung markiert.`, 'error', 4000);
    }

    // Daily study count tracking
    const todayStrCheck = new Date().toISOString().slice(0, 10);
    if (state.dailyDate !== todayStrCheck) {
      state.dailyDate = todayStrCheck;
      state.dailyCount = 0;
    }
    state.dailyCount = (state.dailyCount || 0) + 1;

    saveState();
    renderCurrentQuestion();
    updateAnalytics();
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

  // --- ÄKNO Düsseldorf Exam Readiness Index Engine ---
  function calculateExamReadiness() {
    const total = EXAM_QUESTIONS.length;
    
    // Pillar 1: High-Yield & Düsseldorfer Protokoll-Fälle (35 pts max)
    const hyQuestions = EXAM_QUESTIONS.filter(q => q.is_high_yield || q.is_dus_protocol || (q.source_book && q.source_book.includes('Düsseldorf')));
    const hyAnsweredPassed = hyQuestions.filter(q => state.answers[q.id] && state.answers[q.id].submitted && state.answers[q.id].isCorrect).length;
    const hyScore = hyQuestions.length > 0 ? (hyAnsweredPassed / hyQuestions.length) * 35 : 0;

    // Pillar 2: Patient Safety & K.O.-Kriterien Radar (30 pts max)
    const criticalQuestions = EXAM_QUESTIONS.filter(q => {
      const p = parseOralExamCase(q);
      return (p.pitfalls && p.pitfalls.length > 15) || (q.examiner_tip && q.examiner_tip.toLowerCase().includes('k.o.'));
    });
    const criticalFailed = criticalQuestions.filter(q => state.answers[q.id] && state.answers[q.id].submitted && !state.answers[q.id].isCorrect).length;
    const safetyScore = Math.max(0, Math.round(30 - (criticalFailed * 5)));

    // Pillar 3: SM-2 Long-Term Retention & Dosierungs-Mastery (20 pts max)
    let sm2Mastered = 0;
    if (state.sm2Data) {
      Object.values(state.sm2Data).forEach(item => {
        if (item && item.interval >= 6 && item.repetition >= 2) {
          sm2Mastered++;
        }
      });
    }
    const sm2Score = Math.min(20, Math.round((sm2Mastered / Math.max(1, Math.min(total, 60))) * 20));

    // Pillar 4: Oral Fluency & Spoken Simulation (15 pts max)
    const oralQuestions = EXAM_QUESTIONS.filter(q => !q.options || !q.options.length);
    const oralPassed = oralQuestions.filter(q => state.answers[q.id] && state.answers[q.id].submitted && state.answers[q.id].isCorrect).length;
    const oralScore = Math.min(15, Math.round((oralPassed / Math.max(1, Math.min(oralQuestions.length, 50))) * 15));

    const totalScore = Math.min(100, Math.round(hyScore + safetyScore + sm2Score + oralScore));

    return {
      totalScore,
      hyScore: Math.round(hyScore),
      hyAnsweredPassed,
      hyTotal: hyQuestions.length,
      safetyScore,
      criticalFailed,
      criticalTotal: criticalQuestions.length,
      sm2Score,
      sm2Mastered,
      oralScore,
      oralPassed,
      oralTotal: oralQuestions.length
    };
  }

  function renderReadinessModal() {
    const r = calculateExamReadiness();

    const elHeroCard = document.getElementById('readiness-hero-card');
    const elScoreVal = document.getElementById('readiness-score-val');
    const elVerdictBadge = document.getElementById('readiness-verdict-badge');
    const elVerdictTitle = document.getElementById('readiness-verdict-title');
    const elVerdictDesc = document.getElementById('readiness-verdict-desc');

    if (elScoreVal) elScoreVal.textContent = `${r.totalScore}%`;
    if (elHeroCard) {
      const deg = Math.round((r.totalScore / 100) * 360);
      elHeroCard.style.setProperty('--readiness-deg', `${deg}deg`);
    }

    if (elVerdictBadge && elVerdictTitle && elVerdictDesc) {
      if (r.criticalFailed > 0) {
        elVerdictBadge.className = 'readiness-verdict-badge status-unprepared';
        elVerdictBadge.textContent = '🚨 K.O.-Kriterium Verletzt';
        elVerdictTitle.textContent = 'Akutes Durchfall-Risiko bei ÄKNO Düsseldorf';
        elVerdictDesc.textContent = `In ${r.criticalFailed} kritischen Notfallfällen wurde ein potenziell tödlicher Kardinalfehler registriert. Bei der Facharztprüfung vor Prof. Annecke oder Prof. Hohn führt das Verkennen vitaler K.O.-Kriterien (z.B. MH, LAST, CICO, Notfall-Sectio) zum sofortigen Abbruch der Prüfung!`;
      } else if (r.totalScore >= 80) {
        elVerdictBadge.className = 'readiness-verdict-badge status-ready';
        elVerdictBadge.textContent = '🟢 Prüfungsreif (ÄKNO Düsseldorf)';
        elVerdictTitle.textContent = 'Exzellente Vorbereitung auf das Facharzt-Kolloquium';
        elVerdictDesc.textContent = 'Patientensicherheit und Notfall-Algorithmen (MH, LAST, CICO, Anaphylaxie, Massentransfusion) sind verlässlich abrufbar. Die 4-Stufen-Prüfungsrhetorik wird beherrscht. Beste Voraussetzungen für das Bestehen!';
      } else if (r.totalScore >= 55) {
        elVerdictBadge.className = 'readiness-verdict-badge status-conditional';
        elVerdictBadge.textContent = '🟡 Bedingt Prüfungsreif (Aufbautraining nötig)';
        elVerdictTitle.textContent = 'Gute Grundlagen – Fokus auf Düsseldorfer Protokolle';
        elVerdictDesc.textContent = 'Das theoretische Grundgerüst steht, jedoch fehlen noch Routine in den spezifischen Düsseldorfer Prüferfällen und die Festigung wichtiger Notfalldosierungen im Langzeitgedächtnis.';
      } else {
        elVerdictBadge.className = 'readiness-verdict-badge status-unprepared';
        elVerdictBadge.textContent = '🔴 Noch nicht prüfungsreif';
        elVerdictTitle.textContent = 'Umfassendes systematisches Training erforderlich';
        elVerdictDesc.textContent = 'Derzeit sind noch zu wenige Original-Protokollfälle und Notfallalgorithmen abgeschlossen. Es besteht ein hohes Risiko für Wissenslücken in unvorhergesehenen Prüfungssituationen.';
      }
    }

    // Update 4 Pillars
    const setPillar = (scoreId, fillId, textId, score, maxScore, text) => {
      const elS = document.getElementById(scoreId);
      const elF = document.getElementById(fillId);
      const elT = document.getElementById(textId);
      if (elS) elS.textContent = `${score} / ${maxScore} Pkt`;
      if (elF) elF.style.width = `${Math.min(100, Math.round((score / maxScore) * 100))}%`;
      if (elT) elT.textContent = text;
    };

    setPillar('pillar-hy-score', 'pillar-hy-fill', 'pillar-hy-text', r.hyScore, 35, `${r.hyAnsweredPassed} von ${r.hyTotal} ÄKNO Top-Fragen gelöst`);
    setPillar('pillar-safety-score', 'pillar-safety-fill', 'pillar-safety-text', r.safetyScore, 30, r.criticalFailed === 0 ? '🛡️ 100% Patientensicherheit – keine Kardinalfehler' : `⚠️ ${r.criticalFailed} Kardinalfehler registriert`);
    setPillar('pillar-sm2-score', 'pillar-sm2-fill', 'pillar-sm2-text', r.sm2Score, 20, `${r.sm2Mastered} Fakten im festen Langzeitgedächtnis (≥ 6 Tage)`);
    setPillar('pillar-oral-score', 'pillar-oral-fill', 'pillar-oral-text', r.oralScore, 15, `${r.oralPassed} mündliche Prüfungsfälle sicher strukturiert`);

    // Dynamic Recommendations
    const elRecList = document.getElementById('readiness-recommendations-list');
    if (elRecList) {
      elRecList.innerHTML = '';
      const recs = [];

      if (r.criticalFailed > 0) {
        recs.push({
          isCrit: true,
          txt: `🚨 <strong>Kardinalfehler sofort eliminieren:</strong> Wiederholen Sie dringend die ${r.criticalFailed} falsch beantworteten Notfallfragen (Maligne Hyperthermie, LAST, Notfallintubation).`
        });
      }

      if (r.hyAnsweredPassed < 50) {
        recs.push({
          isCrit: false,
          txt: '🏛️ <strong>Düsseldorfer Protokollfälle:</strong> Trainieren Sie prioritär die echten Prüfungsprotokolle von Prof. Annecke & Prof. Hohn (Leverkusen / ÄKNO).'
        });
      }

      if (r.sm2Mastered < 20) {
        recs.push({
          isCrit: false,
          txt: '🧠 <strong>Dosierungssicherheit im Langzeitgedächtnis:</strong> Nutzen Sie den SM-2 Modus für exakte Notfalldosierungen (Dantrolen, Intralipid, Adrenalin, Sugammadex).'
        });
      }

      if (r.oralPassed < 15) {
        recs.push({
          isCrit: false,
          txt: '🗣️ <strong>60-Sekunden Mündliche Rhetorik:</strong> Sprechen Sie Ihre Antworten mit Taste [V] laut ein, um Prüfungshemmungen abzubauen.'
        });
      }

      if (!recs.length) {
        recs.push({
          isCrit: false,
          txt: '⭐ <strong>Höchste Prüfungsreife:</strong> Halten Sie Ihre Tagesziele aufrecht und absolvieren Sie 1–2 vollständige 45-Minuten Prüfungssimulationen vor dem Examen.'
        });
      }

      recs.forEach(rec => {
        const item = document.createElement('div');
        item.className = 'readiness-rec-item' + (rec.isCrit ? ' rec-critical' : '');
        item.innerHTML = rec.txt;
        elRecList.appendChild(item);
      });
    }
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

    // Dynamic ÄKNO Exam Readiness Score
    const readiness = calculateExamReadiness();
    const elStatReadiness = document.getElementById('stat-readiness-score');
    const elBadgeReadiness = document.getElementById('badge-readiness-trigger');
    if (elStatReadiness) {
      elStatReadiness.textContent = `${readiness.totalScore}%`;
    }
    if (elBadgeReadiness) {
      if (readiness.criticalFailed > 0) {
        elBadgeReadiness.style.borderColor = 'var(--danger)';
        elBadgeReadiness.style.background = 'var(--danger-bg)';
        if (elStatReadiness) elStatReadiness.style.color = 'var(--danger)';
      } else if (readiness.totalScore >= 80) {
        elBadgeReadiness.style.borderColor = 'var(--success)';
        elBadgeReadiness.style.background = 'var(--success-bg)';
        if (elStatReadiness) elStatReadiness.style.color = 'var(--success)';
      } else {
        elBadgeReadiness.style.borderColor = 'rgba(13, 148, 136, 0.35)';
        elBadgeReadiness.style.background = '';
        if (elStatReadiness) elStatReadiness.style.color = '';
      }
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

    // Dynamic SM-2 Spaced Repetition Due Counter on Filter Chip
    let sm2DueCount = 0;
    if (state.sm2Data) {
      const now = Date.now();
      Object.values(state.sm2Data).forEach(item => {
        if (item && item.dueDate && now >= item.dueDate) {
          sm2DueCount++;
        }
      });
    }
    const elChipSm2 = document.querySelector('.filter-chip[data-filter="sm2_due"]');
    if (elChipSm2) {
      elChipSm2.textContent = `🧠 Spaced Repetition (${sm2DueCount} fällig)`;
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

  // --- Render Direct Jump Modal Grid (Categorized by Topics with Live Search & Filtering) ---
  let jumpModalSearchQuery = '';
  let jumpModalFilter = 'all';

  function renderJumpModalGrid() {
    if (!elQuestionGrid) return;
    elQuestionGrid.innerHTML = '';

    const query = jumpModalSearchQuery.trim().toLowerCase();
    
    // Filter questions based on modal search and chips
    const matchingQuestions = EXAM_QUESTIONS.filter(q => {
      // 1. Chip filter
      const qAns = state.answers[q.id];
      const isFlagged = !!state.flagged[q.id];
      if (jumpModalFilter === 'dus') {
        const isDus = !!q.is_dus_protocol || (q.source_book && (q.source_book.includes('Düsseldorf') || q.source_book.includes('D\u00fcsseldorf')));
        if (!isDus) return false;
      } else if (jumpModalFilter === 'high_yield') {
        if (!q.is_high_yield) return false;
      } else if (jumpModalFilter === 'unanswered') {
        if (qAns && qAns.submitted) return false;
      } else if (jumpModalFilter === 'incorrect') {
        if (!qAns || !qAns.submitted || qAns.isCorrect) return false;
      } else if (jumpModalFilter === 'review') {
        if (!isFlagged) return false;
      } else if (jumpModalFilter === 'notes') {
        const hasNote = state.userNotes && state.userNotes[q.id] && state.userNotes[q.id].trim();
        if (!hasNote) return false;
      }

      // 2. Text query
      if (query) {
        const textToSearch = [
          q.stem_de, q.stem_tr, q.question_de, q.question_tr,
          q.answer_de, q.category, q.source_book, q.examiner_tip
        ].filter(Boolean).join(' ').toLowerCase();
        if (!textToSearch.includes(query)) return false;
      }

      return true;
    });

    if (matchingQuestions.length === 0) {
      elQuestionGrid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.95rem;">🔍 Keine Fragen gefunden für diese Filterauswahl.</div>';
      return;
    }

    const categories = Array.from(new Set(matchingQuestions.map(q => q.category)));
    
    categories.forEach(cat => {
      const catQuestions = matchingQuestions.filter(q => q.category === cat);
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

        // Tooltip snippet
        const promptSnippet = (q.stem_de || q.question_de || '').substring(0, 75) + '...';
        btn.title = `Frage ${globalIdx}: ${promptSnippet}`;

        const qAns = state.answers[q.id];
        const isFlagged = !!state.flagged[q.id];
        const hasNote = state.userNotes && state.userNotes[q.id] && state.userNotes[q.id].trim();

        if (hasNote) {
          btn.classList.add('has-user-note');
        }

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
            if (elCategoryFilter) elCategoryFilter.value = 'all';
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
  }

  function openQuestionGridModal() {
    // Wire up search & filter listeners once
    const jumpSearchInput = document.getElementById('jump-search-input');
    if (jumpSearchInput && !jumpSearchInput.dataset.wired) {
      jumpSearchInput.dataset.wired = 'true';
      jumpSearchInput.addEventListener('input', (e) => {
        jumpModalSearchQuery = e.target.value;
        renderJumpModalGrid();
      });
    }

    const jumpChips = document.querySelectorAll('.jump-chip');
    jumpChips.forEach(chip => {
      if (!chip.dataset.wired) {
        chip.dataset.wired = 'true';
        chip.addEventListener('click', () => {
          jumpChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          jumpModalFilter = chip.dataset.jumpFilter || 'all';
          renderJumpModalGrid();
        });
      }
    });

    renderJumpModalGrid();
    elJumpModal.classList.add('active');
  }

  function closeModal(modalEl) {
    if (modalEl) modalEl.classList.remove('active');
  }

  // --- Keyboard Shortcuts Quick HUD Modal ---
  const elShortcutModal = document.getElementById('shortcut-modal');
  const elBtnShortcutFloat = document.getElementById('btn-shortcut-float');
  const elShortcutModalClose = document.getElementById('shortcut-modal-close');

  function toggleShortcutModal() {
    if (!elShortcutModal) return;
    if (elShortcutModal.classList.contains('active')) {
      closeModal(elShortcutModal);
    } else {
      elShortcutModal.classList.add('active');
    }
  }

  if (elBtnShortcutFloat) {
    elBtnShortcutFloat.addEventListener('click', toggleShortcutModal);
  }
  if (elShortcutModalClose) {
    elShortcutModalClose.addEventListener('click', () => closeModal(elShortcutModal));
  }
  if (elShortcutModal) {
    elShortcutModal.addEventListener('click', (e) => {
      if (e.target === elShortcutModal) closeModal(elShortcutModal);
    });
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

          // Field-by-field union merge: prevent overwriting newer bookmarks, notes, or answers
          const cloudAnswers = cloudState.answers || {};
          const localAnswers = state.answers || {};
          const allQIds = new Set([...Object.keys(cloudAnswers), ...Object.keys(localAnswers)]);
          const robustAnswers = {};
          allQIds.forEach(id => {
            const cAns = cloudAnswers[id];
            const lAns = localAnswers[id];
            if (cAns && lAns) {
              robustAnswers[id] = (lAns.submitted || lAns.revealed) ? lAns : cAns;
            } else {
              robustAnswers[id] = lAns || cAns;
            }
          });

          // Flags union: if flagged on either device, keep flagged
          const robustFlagged = { ...(cloudState.flagged || {}) };
          Object.keys(state.flagged || {}).forEach(id => {
            if (state.flagged[id]) robustFlagged[id] = true;
          });

          // Notes union: preserve whichever note is present or longer
          const robustNotes = { ...(cloudState.notes || {}) };
          Object.keys(state.notes || {}).forEach(id => {
            const lNote = state.notes[id];
            const cNote = robustNotes[id];
            if (!cNote || (lNote && lNote.length >= cNote.length)) {
              robustNotes[id] = lNote;
            }
          });

          // SM-2 Spaced Repetition cards: preserve latest review timestamp
          const cloudSm2 = cloudState.sm2Cards || {};
          const localSm2 = state.sm2Cards || {};
          const allSm2Ids = new Set([...Object.keys(cloudSm2), ...Object.keys(localSm2)]);
          const robustSm2 = {};
          allSm2Ids.forEach(id => {
            const cCard = cloudSm2[id];
            const lCard = localSm2[id];
            if (cCard && lCard) {
              const cTime = new Date(cCard.lastReviewed || 0).getTime();
              const lTime = new Date(lCard.lastReviewed || 0).getTime();
              robustSm2[id] = (lTime >= cTime) ? lCard : cCard;
            } else {
              robustSm2[id] = lCard || cCard;
            }
          });

          // Daily reviews union
          const robustDaily = { ...(cloudState.dailyReviews || {}) };
          Object.keys(state.dailyReviews || {}).forEach(dateStr => {
            robustDaily[dateStr] = Math.max(robustDaily[dateStr] || 0, state.dailyReviews[dateStr] || 0);
          });

          state.answers = robustAnswers;
          state.flagged = robustFlagged;
          state.notes = robustNotes;
          state.sm2Cards = robustSm2;
          state.dailyReviews = robustDaily;
          state.streak = Math.max(cloudState.streak || 0, state.streak || 0);

          saveStateLocalOnly();
          updateAnalytics();
          renderCurrentQuestion();
          pushToCloudDebounced();
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
    if (elSubToggle) {
      if (state.subtitleMode) {
        elSubToggle.classList.add('active');
      } else {
        elSubToggle.classList.remove('active');
      }
    }

    const isSim = (state.studyMode === 'simulation');
    document.body.classList.toggle('mode-simulation-active', isSim);
    if (elExamSimulationBar) {
      elExamSimulationBar.style.display = isSim ? 'flex' : 'none';
    }

    if (state.studyMode) {
      if (elModeTabSim) elModeTabSim.classList.toggle('active', state.studyMode === 'simulation');
      if (elModeTabGuide) elModeTabGuide.classList.toggle('active', state.studyMode === 'guideline');
      if (elModeTabCloze) elModeTabCloze.classList.toggle('active', state.studyMode === 'flashcard');
    }

    if (isSim) {
      startExamSimulationTimer();
    }

    const elAudioSpeedDisplay = document.getElementById('audio-speed-display');
    if (elAudioSpeedDisplay && state.speechRate) {
      elAudioSpeedDisplay.textContent = `${state.speechRate}x`;
    }

    // Trigger cloud auto-sync asynchronously
    syncFromCloud();
  }

  if (elBtnCloudSyncNow) {
    elBtnCloudSyncNow.addEventListener('click', async () => {
      await syncFromCloud();
      showToast('☁️ Wolken-Synchronisation erfolgreich ausgeführt!', 'success', 3500);
    });
  }

  // --- Export Progress (JSON Backup) ---
  if (elBtnExportProgress) {
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
      a.download = `facharzt_anaesthesie_sicherung_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // --- Import Progress ---
  if (elBtnImportTrigger && elImportFileInput) {
    elBtnImportTrigger.addEventListener('click', () => elImportFileInput.click());
  }

  if (elImportFileInput) {
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
            showToast('✅ Lernfortschritt erfolgreich importiert!', 'success', 3500);
            closeModal(elSettingsModal);
          } else {
            showToast('❌ Ungültige Sicherungsdatei.', 'error', 3500);
          }
        } catch (err) {
          showToast('❌ Fehler beim Lesen der Sicherungsdatei.', 'error', 3500);
        }
      };
      reader.readAsText(file);
    });
  }

  // --- Confirmed Reset Progress ---
  if (elBtnResetProgress) {
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
        showToast('🗑️ Lernfortschritt komplett zurückgesetzt.', 'info', 3500);
        closeModal(elSettingsModal);
      }
    });
  }

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
          updateAnalytics();
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
          updateAnalytics();
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

  // --- ÄKNO Düsseldorf Prüfungs-Reife & Readiness Radar Modal Engine ---
  const elReadinessTrigger = document.getElementById('readiness-trigger');
  const elBadgeReadinessTrigger = document.getElementById('badge-readiness-trigger');
  const elReadinessModal = document.getElementById('readiness-modal');
  const elReadinessModalClose = document.getElementById('readiness-modal-close');

  function openReadinessModal() {
    if (!elReadinessModal) return;
    renderReadinessModal();
    elReadinessModal.classList.add('active');
  }

  if (elReadinessTrigger) elReadinessTrigger.addEventListener('click', openReadinessModal);
  if (elBadgeReadinessTrigger) elBadgeReadinessTrigger.addEventListener('click', openReadinessModal);
  if (elReadinessModalClose && elReadinessModal) {
    elReadinessModalClose.addEventListener('click', () => closeModal(elReadinessModal));
  }
  if (elReadinessModal) {
    elReadinessModal.addEventListener('click', (e) => {
      if (e.target === elReadinessModal) closeModal(elReadinessModal);
    });
  }

  // Readiness Action Buttons
  const btnTrainWeakness = document.getElementById('btn-train-weakness');
  const btnTrainDusProtocol = document.getElementById('btn-train-dus-protocol');
  const btnTrainSm2Due = document.getElementById('btn-train-sm2-due');

  if (btnTrainWeakness) {
    btnTrainWeakness.addEventListener('click', () => {
      closeModal(elReadinessModal);
      const chip = document.querySelector('.filter-chip[data-filter="weakness"]');
      if (chip) chip.click();
      showToast('🎯 Schwachstellen-Fokus aktiviert. Eliminieren Sie vorrangig Ihre Fehler!', 'warning', 4000);
    });
  }

  if (btnTrainDusProtocol) {
    btnTrainDusProtocol.addEventListener('click', () => {
      closeModal(elReadinessModal);
      const chip = document.querySelector('.filter-chip[data-filter="dus_examiners"]');
      if (chip) chip.click();
      showToast('🏛️ Düsseldorfer Original-Protokollfälle von Prof. Annecke & Prof. Hohn aktiviert!', 'info', 4000);
    });
  }

  if (btnTrainSm2Due) {
    btnTrainSm2Due.addEventListener('click', () => {
      closeModal(elReadinessModal);
      const chip = document.querySelector('.filter-chip[data-filter="sm2_due"]');
      if (chip) chip.click();
      showToast('🧠 Fällige Spaced-Repetition Fragen für dauerhafte Dosierungssicherheit aktiviert!', 'info', 4000);
    });
  }

  // --- Quick Dock Self-Assessment Listeners ---
  const elBtnDockKnewIt = document.getElementById('btn-dock-knew-it');
  const elBtnDockDidntKnow = document.getElementById('btn-dock-didnt-know');
  if (elBtnDockKnewIt) {
    elBtnDockKnewIt.addEventListener('click', (e) => {
      e.stopPropagation();
      selfAssess(true);
    });
  }
  if (elBtnDockDidntKnow) {
    elBtnDockDidntKnow.addEventListener('click', (e) => {
      e.stopPropagation();
      selfAssess(false);
    });
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

  // Global helper for calculator copy-to-clipboard
  window.copyCalcValues = function(text, btn) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '✓ In Zwischenablage kopiert!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = orig;
          btn.classList.remove('copied');
        }, 2200);
      });
    }
  };

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
      <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end;">
        <button class="btn-calc-copy" onclick="copyCalcValues('Pädiatrie (${age} Jahre, ${wt} kg): Tubus ${cuffed.toFixed(1)} mm (Tiefe ${depth.toFixed(1)} cm) | Adrenalin ${adrMg} mg | Atropin ${atropin} mg | Defib ${defib} J | Rocuronium ${rocuronium} mg (RSI: ${rocuroniumRSI} mg)', this)">
          📋 Pädiatrie-Werte kopieren
        </button>
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
      <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end;">
        <button class="btn-calc-copy" onclick="copyCalcValues('ARDS Beatmung (${height} cm): PBW ${pbw.toFixed(1)} kg | Vt (6 ml/kg): ${vt6} ml (Goldstandard) | Vt (8 ml/kg): ${vt8} ml | Max. Driving Pressure: ΔP ≤ 14 cmH₂O', this)">
          📋 Beatmungswerte kopieren
        </button>
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
      <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end;">
        <button class="btn-calc-copy" onclick="copyCalcValues('LA Höchstdosen (${wt} kg): Ropivacain ${ropi} mg | Bupivacain ${bupi} mg | Lidocain pur ${lidoPur} mg (mit Adr: ${lidoAdr} mg) | Prilocain ${prilo} mg | Intralipid 20% Bolus: ${lipidBolus} ml', this)">
          📋 LA-Dosen kopieren
        </button>
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
      <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end;">
        <button class="btn-calc-copy" onclick="copyCalcValues('Natrium-Defizit (${wt} kg, Na_ist: ${naCur} mmol/l): TBW ${tbw.toFixed(1)} L | Defizit bis 140: ${deficit} mmol | Max. 24h-Grenze: ≤ ${maxDayNa} mmol/l (+8 mmol/l max/Tag)', this)">
          📋 Natrium-Werte kopieren
        </button>
      </div>
    `;
  }

  function recalculateAllMedicalCalculators() {
    calcPediatrics();
    calcArds();
    calcLA();
    calcSodium();
  }

  // ==========================================================================
  // ANESTHESIA ABBREVIATIONS & ACRONYMS GUIDE (KÜRZEL-LEXIKON / KISALTMALAR KILAVUZU)
  // ==========================================================================
  const elAbbrevTrigger = document.getElementById('abbrev-trigger');
  const elAbbrevModal = document.getElementById('abbrev-modal');
  const elAbbrevModalClose = document.getElementById('abbrev-modal-close');
  const elAbbrevSearchInput = document.getElementById('abbrev-search-input');
  const elAbbrevSearchClear = document.getElementById('abbrev-search-clear');
  const elAbbrevFilterBar = document.getElementById('abbrev-filter-bar');
  const elAbbrevCardsGrid = document.getElementById('abbrev-cards-grid');
  const elAbbrevStatusText = document.getElementById('abbrev-status-text');
  const elAbbrevCountAll = document.getElementById('abbrev-count-all');
  const elAbbrevToggleTr = document.getElementById('abbrev-toggle-tr');

  let abbrevCurrentCat = 'all';
  let abbrevSearchQuery = '';
  let abbrevShowTurkish = true;

  function initAbbreviationsGuide() {
    const list = (typeof ANESTHESIA_ABBREVIATIONS !== 'undefined' ? ANESTHESIA_ABBREVIATIONS : (window.ANESTHESIA_ABBREVIATIONS || []));
    if (elAbbrevCountAll) {
      elAbbrevCountAll.textContent = list.length;
    }

    if (elAbbrevTrigger && elAbbrevModal) {
      elAbbrevTrigger.addEventListener('click', () => {
        elAbbrevModal.classList.add('active');
        renderAbbreviations();
        if (elAbbrevSearchInput) {
          setTimeout(() => elAbbrevSearchInput.focus(), 80);
        }
      });
    }

    if (elAbbrevModalClose && elAbbrevModal) {
      elAbbrevModalClose.addEventListener('click', () => closeModal(elAbbrevModal));
    }

    if (elAbbrevModal) {
      elAbbrevModal.addEventListener('click', (e) => {
        if (e.target === elAbbrevModal) closeModal(elAbbrevModal);
      });
    }

    if (elAbbrevSearchInput) {
      elAbbrevSearchInput.addEventListener('input', (e) => {
        abbrevSearchQuery = e.target.value;
        if (elAbbrevSearchClear) {
          elAbbrevSearchClear.style.display = abbrevSearchQuery ? 'block' : 'none';
        }
        renderAbbreviations();
      });
    }

    if (elAbbrevSearchClear && elAbbrevSearchInput) {
      elAbbrevSearchClear.addEventListener('click', () => {
        elAbbrevSearchInput.value = '';
        abbrevSearchQuery = '';
        elAbbrevSearchClear.style.display = 'none';
        renderAbbreviations();
        elAbbrevSearchInput.focus();
      });
    }

    if (elAbbrevFilterBar) {
      const filterBtns = elAbbrevFilterBar.querySelectorAll('.abbrev-filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          abbrevCurrentCat = btn.getAttribute('data-cat') || 'all';
          renderAbbreviations();
        });
      });
    }

    if (elAbbrevToggleTr) {
      elAbbrevToggleTr.addEventListener('change', (e) => {
        abbrevShowTurkish = e.target.checked;
        const trElements = elAbbrevCardsGrid ? elAbbrevCardsGrid.querySelectorAll('.abbrev-tr-content') : [];
        trElements.forEach(el => {
          el.style.display = abbrevShowTurkish ? (el.classList.contains('abbrev-term-tr') ? 'flex' : 'block') : 'none';
        });
      });
    }

    // Keyboard shortcuts (Alt+A to open/toggle, Escape to close)
    document.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (elAbbrevModal) {
          if (elAbbrevModal.classList.contains('active')) {
            closeModal(elAbbrevModal);
          } else {
            elAbbrevModal.classList.add('active');
            renderAbbreviations();
            if (elAbbrevSearchInput) setTimeout(() => elAbbrevSearchInput.focus(), 80);
          }
        }
      }
      if (e.key === 'Escape' && elAbbrevModal && elAbbrevModal.classList.contains('active')) {
        closeModal(elAbbrevModal);
      }
    });

    renderAbbreviations();
  }

  function renderAbbreviations() {
    if (!elAbbrevCardsGrid) return;
    const allItems = (typeof ANESTHESIA_ABBREVIATIONS !== 'undefined' ? ANESTHESIA_ABBREVIATIONS : (window.ANESTHESIA_ABBREVIATIONS || []));
    const query = abbrevSearchQuery.trim().toLowerCase();

    const filtered = allItems.filter(item => {
      // 1. Category filter
      if (abbrevCurrentCat !== 'all' && item.category !== abbrevCurrentCat) {
        return false;
      }
      // 2. Search query filter
      if (query) {
        const matchAbbr = item.abbr && item.abbr.toLowerCase().includes(query);
        const matchDeFull = item.de_full && item.de_full.toLowerCase().includes(query);
        const matchTrFull = item.tr_full && item.tr_full.toLowerCase().includes(query);
        const matchDeDesc = item.de_desc && item.de_desc.toLowerCase().includes(query);
        const matchTrDesc = item.tr_desc && item.tr_desc.toLowerCase().includes(query);
        const matchPearl = (item.exam_pearl && item.exam_pearl.toLowerCase().includes(query)) ||
                           (item.exam_pearl_tr && item.exam_pearl_tr.toLowerCase().includes(query));
        return matchAbbr || matchDeFull || matchTrFull || matchDeDesc || matchTrDesc || matchPearl;
      }
      return true;
    });

    if (elAbbrevStatusText) {
      elAbbrevStatusText.textContent = `Zeigt ${filtered.length} von ${allItems.length} Abkürzungen`;
    }

    if (filtered.length === 0) {
      elAbbrevCardsGrid.innerHTML = `
        <div class="abbrev-empty-state">
          <div class="empty-icon">🔍</div>
          <h3>Keine Abkürzung gefunden</h3>
          <p>Für die Suche nach "<strong>${escapeHtml(abbrevSearchQuery)}</strong>" liegt kein Eintrag vor.</p>
        </div>
      `;
      return;
    }

    elAbbrevCardsGrid.innerHTML = filtered.map(item => {
      const escapedAbbr = escapeHtml(item.abbr);
      const escapedCatDe = escapeHtml(item.category_de);
      const escapedDeFull = escapeHtml(item.de_full);
      const escapedTrFull = escapeHtml(item.tr_full);
      const escapedDeDesc = escapeHtml(item.de_desc);
      const escapedTrDesc = escapeHtml(item.tr_desc);
      const escapedPearl = item.exam_pearl ? escapeHtml(item.exam_pearl) : '';
      const escapedPearlTr = item.exam_pearl_tr ? escapeHtml(item.exam_pearl_tr) : '';

      return `
        <div class="abbrev-card" data-cat="${item.category}">
          <div class="abbrev-card-top">
            <div class="abbrev-badge-group">
              <span class="abbrev-badge">${escapedAbbr}</span>
              <span class="abbrev-cat-tag">${escapedCatDe}</span>
            </div>
            <button class="abbrev-audio-btn" data-speech="${escapeHtml(item.abbr + ': ' + item.de_full + '. ' + item.de_desc)}" title="Aussprache & Begriff auf Deutsch anhören">
              🔊
            </button>
          </div>

          <div class="abbrev-full-terms">
            <div class="abbrev-term-de">
              <span class="abbrev-flag">🇩🇪</span>
              <span>${escapedDeFull}</span>
            </div>
            <div class="abbrev-term-tr abbrev-tr-content" style="display: ${abbrevShowTurkish ? 'flex' : 'none'};">
              <span class="abbrev-flag">🇹🇷</span>
              <span>${escapedTrFull}</span>
            </div>
          </div>

          <div class="abbrev-desc-block">
            <div class="abbrev-desc-de">${escapedDeDesc}</div>
            <div class="abbrev-desc-tr abbrev-tr-content" style="display: ${abbrevShowTurkish ? 'block' : 'none'};">
              ${escapedTrDesc}
            </div>
          </div>

          ${escapedPearl ? `
            <div class="abbrev-pearl-box">
              <div class="abbrev-pearl-de">${escapedPearl}</div>
              ${escapedPearlTr ? `<div class="abbrev-pearl-tr abbrev-tr-content" style="display: ${abbrevShowTurkish ? 'block' : 'none'};">${escapedPearlTr}</div>` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Attach speech buttons to speakMedicalText
    const audioBtns = elAbbrevCardsGrid.querySelectorAll('.abbrev-audio-btn');
    audioBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const textToSpeak = btn.getAttribute('data-speech');
        if (typeof speakMedicalText === 'function') {
          speakMedicalText(textToSpeak, btn);
        } else if (typeof window.speakText === 'function') {
          window.speakText(textToSpeak, btn);
        }
      });
    });
  }

  // Initialize guide
  initAbbreviationsGuide();

  // ==========================================================================
  // NATURAL MEDICAL SPEECH SYNTHESIS ENGINE (Profi-Sprachausgabe & Stimmenwahl)
  // ==========================================================================

  // --- Medical Text Speech Preprocessor (Expands abbreviations into phonetic natural German) ---
  function prepareMedicalTextForSpeech(rawText) {
    if (!rawText) return '';

    let text = String(rawText);

    // 1. Strip HTML tags
    text = text.replace(/<[^>]*>/g, ' ');

    // 2. Strip Markdown formatting
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1'); // bold **text**
    text = text.replace(/\*([^*]+)\*/g, '$1');     // italic *text*
    text = text.replace(/__([^_]+)__/g, '$1');     // bold __text__
    text = text.replace(/_([^_]+)_/g, '$1');       // italic _text_
    text = text.replace(/^#+\s+/gm, '');           // headers #
    text = text.replace(/^[\*\-•]\s+/gm, '');      // bullet points
    text = text.replace(/`([^`]+)`/g, '$1');       // code blocks

    // 3. Remove Emojis & Graphic Symbols that TTS reads awkwardly
    text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}🚨⚠️💉🩺🩸⏱️📋💡🧠🎯★☆✓✗]/gu, ' ');

    // 4. Clean brackets and test markers
    text = text.replace(/\[\s*x\s*\]/gi, 'richtig');
    text = text.replace(/\[\s* \s*\]/gi, '');
    text = text.replace(/[\[\]]/g, ', ');

    // 5. Medical Ratios & Ranges
    text = text.replace(/\b1\s*:\s*10\.?000\b/g, 'eins zu zehntausend');
    text = text.replace(/\b1\s*:\s*100\.?000\b/g, 'eins zu einhunderttausend');
    text = text.replace(/\b1\s*:\s*200\.?000\b/g, 'eins zu zweihunderttausend');
    text = text.replace(/\b1\s*:\s*1\b/g, 'eins zu eins');
    text = text.replace(/(\d+)\s*[-–—]\s*(\d+)\s*([a-zA-Z%]+)/g, '$1 bis $2 $3');

    // 6. Blood Pressure & Hemodynamics
    text = text.replace(/\b(?:RR|Blutdruck)?\s*(\d{2,3})\s*[\/\\]\s*(\d{2,3})\s*(?:mmHg)?\b/gi, 'Blutdruck $1 zu $2 Millimeter Quecksilbersäule');
    text = text.replace(/\bRR\s*[:=]?\s*(\d{2,3})\b/gi, 'Blutdruck $1');
    text = text.replace(/\b(\d{2,3})\s*[\/\\]\s*(\d{2,3})\b/g, '$1 zu $2');

    // Heart Rate & Frequency
    text = text.replace(/\b(?:HF|Herzfrequenz)\s*[:=]?\s*(\d{2,3})\s*(?:\/\s*min|bpm|min[-⁻]¹)?\b/gi, 'Herzfrequenz $1 pro Minute');
    text = text.replace(/\b(\d+)\s*[\/\\]\s*min\b/gi, '$1 pro Minute');
    text = text.replace(/\b(\d+)\s*min[-⁻]¹\b/gi, '$1 pro Minute');

    // Saturation & Ventilation
    text = text.replace(/\b(?:SpO2|sO2|SaO2)\s*[:=]?\s*(\d{1,3})\s*%/gi, 'Sauerstoffsättigung $1 Prozent');
    text = text.replace(/\bSpO2\b/gi, 'Sauerstoffsättigung');
    text = text.replace(/\betCO2\s*[:=]?\s*(\d{1,3})\s*(?:mmHg)?\b/gi, 'endexspiratorisches CO2 $1 Millimeter Quecksilbersäule');
    text = text.replace(/\betCO2\b/gi, 'endexspiratorisches C O zwei');
    text = text.replace(/\bFiO2\s*[:=]?\s*([0-1][,\.]\d+|\d{1,3}\s*%)\b/gi, 'F i O zwei $1');
    text = text.replace(/\bPEEP\s*[:=]?\s*(\d+)\s*(?:cmH2O|mbar)?\b/gi, 'Peep $1 Zentimeter Wassersäule');
    text = text.replace(/\bVT\s*[:=]?\s*(\d+)\s*ml\b/gi, 'Atemzugvolumen $1 Milliliter');
    text = text.replace(/\bAF\s*[:=]?\s*(\d+)\b/gi, 'Atemfrequenz $1 pro Minute');

    // 7. BGA & Labs
    text = text.replace(/\bBGA\s*:/gi, 'Blutgasanalyse:');
    text = text.replace(/\bBGA\b/gi, 'Blutgasanalyse');
    text = text.replace(/\bpH\s*[:=]?\s*(\d+[,.]\d+)\b/gi, 'p H $1');
    text = text.replace(/\bpCO2\s*[:=]?\s*(\d+[,.]?\d*)\s*(?:mmHg)?\b/gi, 'p C O zwei $1 Millimeter Quecksilbersäule');
    text = text.replace(/\bpO2\s*[:=]?\s*(\d+[,.]?\d*)\s*(?:mmHg)?\b/gi, 'p O zwei $1 Millimeter Quecksilbersäule');
    text = text.replace(/\bBE\s*[:=]?\s*([+-]?\d+[,.]?\d*)\s*(?:mmol\/l)?\b/gi, 'Base Excess $1 Millimol pro Liter');
    text = text.replace(/\bBase Excess\s*-\s*(\d+)/gi, 'Base Excess minus $1');
    text = text.replace(/\bLaktat\s*[:=]?\s*(\d+[,.]?\d*)\s*(?:mmol\/l)?\b/gi, 'Laktat $1 Millimol pro Liter');

    // 8. Dosages & Body Weight
    text = text.replace(/\b(\d+[,.]?\d*)\s*mg\s*[\/\\]\s*kg(?:\s*KG)?\b/gi, '$1 Milligramm pro Kilogramm Körpergewicht ');
    text = text.replace(/\b(\d+[,.]?\d*)\s*(?:µg|mcg)\s*[\/\\]\s*kg\s*[\/\\]\s*min\b/gi, '$1 Mikrogramm pro Kilogramm pro Minute ');
    text = text.replace(/\b(\d+[,.]?\d*)\s*(?:µg|mcg)\s*[\/\\]\s*kg(?:\s*KG)?\b/gi, '$1 Mikrogramm pro Kilogramm Körpergewicht ');
    text = text.replace(/\b(\d+[,.]?\d*)\s*(?:µg|mcg)\b/gi, '$1 Mikrogramm ');
    text = text.replace(/\b(\d+[,.]?\d*)\s*mg\b/gi, '$1 Milligramm ');
    text = text.replace(/\b(\d+[,.]?\d*)\s*ml\b/gi, '$1 Milliliter ');
    text = text.replace(/\bkg\/m²\b/gi, 'Kilogramm pro Quadratmeter');
    text = text.replace(/\bkg\s+KG\b/gi, 'Kilogramm Körpergewicht');
    text = text.replace(/\b(\d+)\s*kg\b/gi, '$1 Kilogramm');

    // Standalone Units
    text = text.replace(/\bmmol\/[lL]\b/g, 'Millimol pro Liter');
    text = text.replace(/\bmg\/dl\b/gi, 'Milligramm pro Deziliter');
    text = text.replace(/\bg\/dl\b/gi, 'Gramm pro Deziliter');
    text = text.replace(/\bcmH2O\b/gi, 'Zentimeter Wassersäule');
    text = text.replace(/\bmmHg\b/gi, 'Millimeter Quecksilbersäule');
    text = text.replace(/\bmbar\b/gi, 'Millibar');

    // Medication timing
    text = text.replace(/\b1-0-0\b/g, 'morgens eins');
    text = text.replace(/\b1-0-1\b/g, 'morgens und abends eins');
    text = text.replace(/\b1-1-1\b/g, 'dreimal täglich eins');

    // 9. Clinical Routes & Abbreviations
    text = text.replace(/\bi\.v\./gi, 'intravenös');
    text = text.replace(/\bs\.c\./gi, 'subkutan');
    text = text.replace(/\bi\.m\./gi, 'intramuskulär');
    text = text.replace(/\bp\.o\./gi, 'per os');
    text = text.replace(/\bi\.a\./gi, 'intraarteriell');
    text = text.replace(/\bp\.i\./gi, 'per inhalationem');

    text = text.replace(/\bz\.B\./gi, 'zum Beispiel');
    text = text.replace(/\bu\.a\./gi, 'unter anderem');
    text = text.replace(/\bd\.h\./gi, 'das heißt');
    text = text.replace(/\bbzw\./gi, 'beziehungsweise');
    text = text.replace(/\bggf\./gi, 'gegebenenfalls');
    text = text.replace(/\bca\./gi, 'circa');
    text = text.replace(/\bevtl\./gi, 'eventuell');
    text = text.replace(/\bV\.a\./gi, 'Verdacht auf');
    text = text.replace(/\bZ\.n\./gi, 'Zustand nach');
    text = text.replace(/\bPat\./gi, 'Patient');

    // Specific Medical Terms & Acronyms
    text = text.replace(/\bOP\b/g, 'Operation');
    text = text.replace(/\bZVK\b/g, 'Zentraler Venenkatheter');
    text = text.replace(/\bPDK\b/g, 'Periduralkatheter');
    text = text.replace(/\bEDA\b/g, 'Epiduralanästhesie');
    text = text.replace(/\bSPA\b/g, 'Spinalanästhesie');
    text = text.replace(/\bEKG\b/g, 'E K G');
    text = text.replace(/\bEKs\b/g, 'Erythrozytenkonzentrate');
    text = text.replace(/\bEK\b/g, 'Erythrozytenkonzentrat');
    text = text.replace(/\bFFPs\b/g, 'Fresh Frozen Plasmas');
    text = text.replace(/\bFFP\b/g, 'Fresh Frozen Plasma');
    text = text.replace(/\bTKs\b/g, 'Thrombozytenkonzentrate');
    text = text.replace(/\bTK\b/g, 'Thrombozytenkonzentrat');
    text = text.replace(/\bLAST\b/g, 'Lokalanästhetika-Intoxikation');
    text = text.replace(/\bMH\b/g, 'Maligne Hyperthermie');
    text = text.replace(/\bCICO\b/g, 'Cannot Intubate Cannot Oxygenate');
    text = text.replace(/\bALS\b/g, 'Advanced Life Support');
    text = text.replace(/\bCPR\b/g, 'Reanimation');
    text = text.replace(/\bROSC\b/g, 'Return of Spontaneous Circulation');
    text = text.replace(/\bARDS\b/g, 'A R D S');
    text = text.replace(/\bKHK\b/g, 'koronare Herzkrankheit');
    text = text.replace(/\bCOPD\b/g, 'C O P D');
    text = text.replace(/\bpAVK\b/g, 'periphere arterielle Verschlusskrankheit');
    text = text.replace(/\bOSAS\b/g, 'obstruktives Schlafapnoe-Syndrom');
    text = text.replace(/\bBMI\b/g, 'Body-Mass-Index');

    // 10. Clean whitespace & punctuation (protecting German decimal numbers like 7,28 or 0,6)
    text = text.replace(/\s+/g, ' ');
    text = text.replace(/(?<!\d),/g, ', ');
    text = text.replace(/,(?!\d|\s)/g, ', ');
    text = text.replace(/\s*([;:.!?])\s*/g, '$1 ');

    return text.trim();
  }

  // --- Clean German Speech Text Extractor (Filters out Turkish collapsibles & buttons) ---
  function getCleanSpeechText(elementOrText) {
    if (!elementOrText) return '';
    if (typeof elementOrText === 'string') {
      return prepareMedicalTextForSpeech(elementOrText);
    }
    const deEl = elementOrText.querySelector ? elementOrText.querySelector('.de-text-block') : null;
    let raw = '';
    if (deEl) {
      raw = deEl.textContent.trim();
    } else if (elementOrText.cloneNode) {
      const clone = elementOrText.cloneNode(true);
      clone.querySelectorAll('.tr-sub-container, .tr-subtitle-collapsible, .badge, script, button').forEach(n => n.remove());
      raw = clone.textContent.trim();
    } else {
      raw = String(elementOrText);
    }
    return prepareMedicalTextForSpeech(raw);
  }

  // --- Smart German Voice Ranking & Selection Engine ---
  let preferredGermanVoice = null;
  let availableGermanVoices = [];

  function scoreGermanVoice(v) {
    let score = 0;
    const name = (v.name || '').toLowerCase();
    const lang = (v.lang || '').toLowerCase();

    // Must be German language
    if (!lang.startsWith('de')) return -100;

    // Region boost: Germany (de-DE), Austria (de-AT), Switzerland (de-CH)
    if (lang === 'de-de') score += 10;
    else if (lang.startsWith('de')) score += 5;

    // Tier 1: Natural / Neural / Online / Siri
    if (name.includes('natural') || name.includes('neural') || name.includes('online')) score += 100;
    if (name.includes('siri')) score += 95;
    if (name.includes('enhanced') || name.includes('premium') || name.includes('verbessert')) score += 85;
    if (name.includes('google')) score += 60;

    // Tier 2: Specific high-fidelity voices
    if (name.includes('katja') || name.includes('conrad') || name.includes('amala') || name.includes('killian')) score += 45;
    if (name.includes('helena') || name.includes('markus') || name.includes('petra') || name.includes('viktor') || name.includes('yannick')) score += 35;

    // Penalize legacy robotic/compact voices
    if (name.includes('compact') || name.includes('kompakt')) score -= 60;
    if (name.includes('espeak')) score -= 70;

    return score;
  }

  function rankGermanVoices(voices) {
    if (!voices || !voices.length) return [];
    const deVoices = voices.filter(v => (v.lang || '').toLowerCase().startsWith('de'));
    if (!deVoices.length) return voices;
    return deVoices.sort((a, b) => scoreGermanVoice(b) - scoreGermanVoice(a));
  }

  function getVoiceQualityBadge(v) {
    const name = (v.name || '').toLowerCase();
    if (name.includes('natural') || name.includes('neural') || name.includes('online')) {
      return '<span class="voice-badge-neural">🌟 KI Natural</span>';
    }
    if (name.includes('siri')) {
      return '<span class="voice-badge-siri">🍎 Siri</span>';
    }
    if (name.includes('enhanced') || name.includes('premium') || name.includes('verbessert')) {
      return '<span class="voice-badge-neural">✨ Verbessert</span>';
    }
    if (name.includes('google')) {
      return '<span class="voice-badge-siri">Google</span>';
    }
    return '<span class="voice-badge-system">System</span>';
  }

  function getCleanVoiceDisplayName(name) {
    if (!name) return 'Stimme';
    return name
      .replace(/\s*\(German\s*\(Germany\)\)/gi, '')
      .replace(/\s*\(Deutsch\s*\(Deutschland\)\)/gi, '')
      .replace(/\s*\(de-DE\)/gi, '')
      .replace(/\s*-\s*German\s*\(Germany\)/gi, '')
      .trim();
  }

  // --- Natural Neural Stream Player (Zero-Configuration for Mac & iPhone) ---
  let naturalAudioPlayer = null;
  let naturalAudioQueue = [];
  let currentChunkIndex = 0;
  let isSpeakingMedical = false;
  let activeMedicalTriggerBtn = null;
  let onSpeechCompleteCallback = null;
  let _speakSessionId = 0;

  function initNaturalAudioPlayer() {
    // No-op: each chunk now gets its own fresh Audio() instance in playCurrentAudioChunk().
    // Kept for backwards compatibility in case it's referenced elsewhere.
  }

  function chunkTextForTTS(text, maxLen = 160) {
    if (!text) return [];
    const sentences = text.match(/[^.!?:]+[.!?:]+/g) || [text];
    const chunks = [];

    for (let s of sentences) {
      s = s.trim();
      if (!s) continue;
      if (s.length <= maxLen) {
        chunks.push(s);
      } else {
        const parts = s.split(/(?<=[,;])\s+/);
        let cur = '';
        for (const p of parts) {
          if ((cur + ' ' + p).trim().length <= maxLen) {
            cur = (cur + ' ' + p).trim();
          } else {
            if (cur) chunks.push(cur);
            if (p.length <= maxLen) {
              cur = p;
            } else {
              const words = p.split(/\s+/);
              cur = '';
              for (const w of words) {
                if ((cur + ' ' + w).trim().length <= maxLen) {
                  cur = (cur + ' ' + w).trim();
                } else {
                  if (cur) chunks.push(cur);
                  cur = w;
                }
              }
            }
          }
        }
        if (cur) chunks.push(cur);
      }
    }
    return chunks;
  }

  function playCurrentAudioChunk() {
    if (!isSpeakingMedical || currentChunkIndex >= naturalAudioQueue.length) {
      stopMedicalSpeech();
      return;
    }
    const chunkText = naturalAudioQueue[currentChunkIndex];
    if (!chunkText || !chunkText.trim()) {
      currentChunkIndex++;
      playCurrentAudioChunk();
      return;
    }

    // Capture session and index at the exact moment this chunk begins.
    const capturedSession = _speakSessionId;
    const capturedIndex   = currentChunkIndex;

    // Completely silence the previous player before creating a new one.
    // A FRESH Audio() per chunk is the only reliable way to prevent spurious
    // 'ended' events that some browsers fire when .src changes on a reused element.
    if (naturalAudioPlayer) {
      try {
        naturalAudioPlayer.onended = null;
        naturalAudioPlayer.onerror = null;
        naturalAudioPlayer.pause();
      } catch (e) {}
    }
    naturalAudioPlayer = new Audio();

    // Use property assignment (not addEventListener) so there is always
    // exactly ONE handler — no accumulation possible.
    naturalAudioPlayer.onended = () => {
      console.log('[TTS-DEBUG] onended fired. capturedIndex:', capturedIndex, 'currentChunkIndex:', currentChunkIndex, 'capturedSession:', capturedSession, '_speakSessionId:', _speakSessionId);
      if (!isSpeakingMedical || _speakSessionId !== capturedSession || currentChunkIndex !== capturedIndex) {
        console.log('[TTS-DEBUG] onended IGNORED (stale).');
        return;
      }
      currentChunkIndex++;
      if (currentChunkIndex < naturalAudioQueue.length) {
        playCurrentAudioChunk();
      } else {
        stopMedicalSpeech();
      }
    };

    naturalAudioPlayer.onerror = () => {
      if (!isSpeakingMedical || _speakSessionId !== capturedSession || currentChunkIndex !== capturedIndex) return;
      console.warn('[NaturalAudio] Stream error, falling back to Web Speech.');
      fallbackToWebSpeech();
    };

    const encoded = encodeURIComponent(chunkText.trim());
    naturalAudioPlayer.src = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=de&client=tw-ob`;
    naturalAudioPlayer.playbackRate = state.speechRate || 0.95;

    const playPromise = naturalAudioPlayer.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        if (!isSpeakingMedical || _speakSessionId !== capturedSession) return;
        console.warn('[NaturalAudio] Play blocked, falling back to Web Speech:', err);
        fallbackToWebSpeech();
      });
    }
  }

  // --- Voice Engine: Permanent Google Deutsch (HD Natural) ---
  function updateGermanVoice() {
    if (!('speechSynthesis' in window)) return;
    const allVoices = window.speechSynthesis.getVoices();
    if (!allVoices || !allVoices.length) return;
    // Specifically lock to Google Deutsch or highest quality German neural voice
    preferredGermanVoice = allVoices.find(v => v.lang.startsWith('de') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Online')))
      || allVoices.find(v => v.lang.startsWith('de') && !v.name.includes('Compact'))
      || allVoices.find(v => v.lang.startsWith('de'))
      || null;
  }

  if ('speechSynthesis' in window) {
    updateGermanVoice();
    window.speechSynthesis.onvoiceschanged = updateGermanVoice;
  }

  function stopMedicalSpeech() {
    isSpeakingMedical = false;
    _speakSessionId++; // Invalidate any pending 'ended' events from the old session

    // Stop HTML5 Audio stream — null out handlers FIRST so no callback fires.
    if (naturalAudioPlayer) {
      try {
        naturalAudioPlayer.onended = null;
        naturalAudioPlayer.onerror = null;
        naturalAudioPlayer.pause();
      } catch (e) {}
      naturalAudioPlayer = null; // drop reference; next chunk gets a fresh instance
    }

    // Stop Web Speech Synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    document.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'));
    activeMedicalTriggerBtn = null;
    naturalAudioQueue = [];
    currentChunkIndex = 0;

    if (typeof onSpeechCompleteCallback === 'function') {
      const cb = onSpeechCompleteCallback;
      onSpeechCompleteCallback = null;
      cb();
    }
  }

  function fallbackToWebSpeech(remainingText = null) {
    if (!('speechSynthesis' in window)) {
      stopMedicalSpeech();
      return;
    }

    const textToSpeak = remainingText || (naturalAudioQueue.slice(currentChunkIndex).join(' '));
    if (!textToSpeak || !textToSpeak.trim()) {
      stopMedicalSpeech();
      return;
    }

    const rawChunks = textToSpeak.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9])/g).filter(s => s.trim().length > 0);
    const chunks = rawChunks.length ? rawChunks : [textToSpeak];
    let chunkIdx = 0;

    function speakNextFallbackChunk() {
      if (!isSpeakingMedical || chunkIdx >= chunks.length) {
        stopMedicalSpeech();
        return;
      }

      const chunk = chunks[chunkIdx++].trim();
      if (!chunk) {
        speakNextFallbackChunk();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = 'de-DE';
      if (preferredGermanVoice) utterance.voice = preferredGermanVoice;
      utterance.rate = state.speechRate || 0.95;
      utterance.pitch = state.speechPitch || 1.0;

      utterance.onend = () => {
        if (isSpeakingMedical) setTimeout(speakNextFallbackChunk, 50);
      };

      utterance.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        if (isSpeakingMedical) speakNextFallbackChunk();
      };

      window.speechSynthesis.speak(utterance);
    }

    speakNextFallbackChunk();
  }

  function speakMedicalText(textOrElement, triggerBtn = null, onEnd = null) {
    // Toggle stop if user clicks the button currently speaking
    if (isSpeakingMedical && triggerBtn && triggerBtn === activeMedicalTriggerBtn) {
      stopMedicalSpeech();
      return;
    }

    stopMedicalSpeech();

    const cleanText = getCleanSpeechText(textOrElement);
    if (!cleanText || !cleanText.trim()) return;

    isSpeakingMedical = true;
    activeMedicalTriggerBtn = triggerBtn;
    onSpeechCompleteCallback = onEnd;
    if (triggerBtn) triggerBtn.classList.add('speaking');

    const isOnline = (typeof navigator !== 'undefined' && navigator.onLine !== false);

    if (isOnline) {
      naturalAudioQueue = chunkTextForTTS(cleanText, 160);
      currentChunkIndex = 0;
      console.log('[TTS-DEBUG] speakMedicalText called. Queue length:', naturalAudioQueue.length, 'Chunks:', naturalAudioQueue);
      playCurrentAudioChunk();
    } else {
      fallbackToWebSpeech(cleanText);
    }
  }

  // Global alias so all cockpit / emergency / simulation calls use the natural medical engine
  window.speakText = speakMedicalText;

  // --- YouTube-Style Playback Speed Menu & Range Slider Controller ---
  const elBtnAudioSpeed = document.getElementById('btn-audio-speed');
  const elAudioSpeedDisplay = document.getElementById('audio-speed-display');
  const elAudioSpeedDropdown = document.getElementById('audio-speed-dropdown');
  const elAudioSpeedSlider = document.getElementById('audio-speed-slider');
  const elSpeedSliderValBadge = document.getElementById('speed-slider-val-badge');
  const elSpeedControlWrapper = document.getElementById('speed-control-wrapper');
  const elSpeedPresetsList = document.getElementById('speed-presets-list');

  function setPlaybackSpeed(rate, updateSlider = true) {
    const clampedRate = Math.min(1.5, Math.max(0.5, parseFloat(rate.toFixed(2))));
    state.speechRate = clampedRate;
    saveState();

    if (elAudioSpeedDisplay) elAudioSpeedDisplay.textContent = `${clampedRate}x`;
    if (elSpeedSliderValBadge) elSpeedSliderValBadge.textContent = `${clampedRate}x`;
    if (updateSlider && elAudioSpeedSlider) elAudioSpeedSlider.value = clampedRate;

    // Live update active stream playback rate (just like YouTube!)
    if (naturalAudioPlayer) {
      try { naturalAudioPlayer.playbackRate = clampedRate; } catch (e) {}
    }

    // Highlight matching preset button
    if (elSpeedPresetsList) {
      elSpeedPresetsList.querySelectorAll('.speed-preset-item').forEach(btn => {
        const btnRate = parseFloat(btn.getAttribute('data-rate'));
        btn.classList.toggle('active', Math.abs(btnRate - clampedRate) < 0.02);
      });
    }
  }

  // Initialize UI with saved speechRate
  if (state.speechRate) {
    setPlaybackSpeed(state.speechRate, true);
  }

  if (elBtnAudioSpeed && elAudioSpeedDropdown) {
    elBtnAudioSpeed.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = (elAudioSpeedDropdown.style.display !== 'none');
      elAudioSpeedDropdown.style.display = isVisible ? 'none' : 'block';
      if (elSpeedControlWrapper) elSpeedControlWrapper.classList.toggle('open', !isVisible);
      if (!isVisible && elAudioSpeedSlider) {
        elAudioSpeedSlider.value = state.speechRate || 0.95;
        if (elSpeedSliderValBadge) elSpeedSliderValBadge.textContent = `${state.speechRate || 0.95}x`;
      }
    });

    if (elAudioSpeedSlider) {
      elAudioSpeedSlider.addEventListener('input', (e) => {
        setPlaybackSpeed(parseFloat(e.target.value), false);
      });
    }

    if (elSpeedPresetsList) {
      elSpeedPresetsList.querySelectorAll('.speed-preset-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetRate = parseFloat(btn.getAttribute('data-rate'));
          setPlaybackSpeed(targetRate, true);
          if (typeof playAudioTone === 'function') playAudioTone(520, 'sine', 0.08);
          elAudioSpeedDropdown.style.display = 'none';
          if (elSpeedControlWrapper) elSpeedControlWrapper.classList.remove('open');
        });
      });
    }

    // Click outside to dismiss speed menu
    document.addEventListener('click', (e) => {
      if (elAudioSpeedDropdown.style.display !== 'none') {
        if (elSpeedControlWrapper && !elSpeedControlWrapper.contains(e.target)) {
          elAudioSpeedDropdown.style.display = 'none';
          elSpeedControlWrapper.classList.remove('open');
        }
      }
    });
  }

  // --- Audio Speech Reader (Question Stem) ---
  const elBtnAudioSpeak = document.getElementById('btn-audio-speak');
  if (elBtnAudioSpeak) {
    elBtnAudioSpeak.addEventListener('click', () => {
      filteredQuestions = getFilteredQuestions();
      if (!filteredQuestions.length) return;
      const currentQ = filteredQuestions[state.currentIndex];
      const textToRead = currentQ.stem_de || currentQ.question_de || '';
      speakMedicalText(textToRead, elBtnAudioSpeak);
    });
  }

  // --- Audio Pronunciation: Examiner Question ---
  const elBtnAudioSpeakExaminer = document.getElementById('btn-audio-speak-examiner');
  if (elBtnAudioSpeakExaminer) {
    elBtnAudioSpeakExaminer.addEventListener('click', () => {
      const elQuote = document.getElementById('examiner-quote-text');
      speakMedicalText(elQuote, elBtnAudioSpeakExaminer);
    });
  }

  // --- Inline Examiner Answer Toggle ---
  if (elBtnToggleExaminerAnswer) {
    elBtnToggleExaminerAnswer.addEventListener('click', () => {
      if (!elExaminerInlineAnswerBox) return;
      const isVisible = (elExaminerInlineAnswerBox.style.display !== 'none');
      elExaminerInlineAnswerBox.style.display = isVisible ? 'none' : 'block';
      elBtnToggleExaminerAnswer.innerHTML = isVisible
        ? '<span>💡</span> Musterantwort anzeigen / Cevabı Gör'
        : '<span>💡</span> Musterantwort verbergen / Cevabı Gizle';
    });
  }

  // --- Audio Pronunciation: Examiner Model Answer (Step 3 inline) ---
  if (elBtnAudioSpeakExaminerAns) {
    elBtnAudioSpeakExaminerAns.addEventListener('click', () => {
      filteredQuestions = getFilteredQuestions();
      const currentQ = filteredQuestions[state.currentIndex];
      if (!currentQ) return;
      const parsedCase = parseOralExamCase(currentQ);
      if (parsedCase && parsedCase.examinerAnswer) {
        speakMedicalText(parsedCase.examinerAnswer, elBtnAudioSpeakExaminerAns);
      }
    });
  }

  // --- Audio Pronunciation: Examiner Solution Card (Step 4) ---
  if (elBtnAudioSpeakSolution) {
    elBtnAudioSpeakSolution.addEventListener('click', () => {
      filteredQuestions = getFilteredQuestions();
      const currentQ = filteredQuestions[state.currentIndex];
      if (!currentQ) return;
      const parsedCase = parseOralExamCase(currentQ);
      if (parsedCase && parsedCase.examinerAnswer) {
        speakMedicalText(parsedCase.examinerAnswer, elBtnAudioSpeakSolution);
      }
    });
  }

  // --- Audio Pronunciation: Verbal Redemittel / Wie sage ich es? ---
  const elBtnAudioSpeakVerbal = document.getElementById('btn-audio-speak-verbal');
  if (elBtnAudioSpeakVerbal) {
    elBtnAudioSpeakVerbal.addEventListener('click', () => {
      const elVerbal = document.getElementById('rubric-verbal-text');
      speakMedicalText(elVerbal, elBtnAudioSpeakVerbal);
    });
  }

  // --- Printable PDF Study Summary ---
  const elBtnPrintSummary = document.getElementById('btn-print-summary');
  if (elBtnPrintSummary) {
    elBtnPrintSummary.addEventListener('click', () => {
      const flaggedIds = Object.keys(state.flagged).filter(id => state.flagged[id]);
      const flaggedQuestions = EXAM_QUESTIONS.filter(q => flaggedIds.includes(q.id));

      if (!flaggedQuestions.length) {
        showToast('📄 Sie haben derzeit keine Fragen mit ★ Wiederholen markiert.', 'info', 3500);
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
  if (elBtnNext) {
    elBtnNext.addEventListener('click', () => {
      if (state.currentIndex < filteredQuestions.length - 1) {
        state.currentIndex++;
        saveState();
        renderCurrentQuestion();
      }
    });
  }

  if (elBtnPrev) {
    elBtnPrev.addEventListener('click', () => {
      if (state.currentIndex > 0) {
        state.currentIndex--;
        saveState();
        renderCurrentQuestion();
      }
    });
  }

  if (elBtnCheck) elBtnCheck.addEventListener('click', checkAnswer);
  if (elBtnReview) elBtnReview.addEventListener('click', toggleFlagForReview);
  if (elBtnReveal) elBtnReveal.addEventListener('click', revealAnswer);
  if (elBtnKnewIt) elBtnKnewIt.addEventListener('click', () => selfAssess(true));
  if (elBtnDidntKnow) elBtnDidntKnow.addEventListener('click', () => selfAssess(false));

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

  // User Guide Modal
  const elUserGuideTrigger = document.getElementById('user-guide-trigger');
  const elUserGuideModal = document.getElementById('user-guide-modal');
  const elUserGuideModalClose = document.getElementById('user-guide-modal-close');
  const elBtnUserGuideCloseBottom = document.getElementById('btn-user-guide-close-bottom');

  if (elUserGuideTrigger && elUserGuideModal) {
    elUserGuideTrigger.addEventListener('click', () => elUserGuideModal.classList.add('active'));
  }
  if (elUserGuideModalClose && elUserGuideModal) {
    elUserGuideModalClose.addEventListener('click', () => closeModal(elUserGuideModal));
  }
  if (elBtnUserGuideCloseBottom && elUserGuideModal) {
    elBtnUserGuideCloseBottom.addEventListener('click', () => closeModal(elUserGuideModal));
  }
  if (elUserGuideModal) {
    elUserGuideModal.addEventListener('click', (e) => {
      if (e.target === elUserGuideModal) closeModal(elUserGuideModal);
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

  // Type Filter Dropdown
  if (elTypeFilter) {
    elTypeFilter.addEventListener('change', (e) => {
      state.typeFilter = e.target.value;
      state.currentIndex = 0;
      saveState();
      renderCurrentQuestion();
    });
  }

  // Live Medical Full-Text Search Input
  if (elSearchInput) {
    let searchDebounceTimer = null;
    elSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        state.searchQuery = e.target.value.trim();
        state.currentIndex = 0;
        renderCurrentQuestion();
      }, 250);
    });
  }

  // Practice Mode Dropdown
  if (elModeSelect) {
    elModeSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      state.randomOrder = (val === 'random');
      if (state.randomOrder) {
        filteredQuestions.sort(() => Math.random() - 0.5);
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

        <div style="margin-bottom: 1rem; font-size: 1.1rem; line-height: 1.5;">${renderDualLanguageText(parsed.stem, activeQ.stem_tr || activeQ.question_tr)}</div>

        <div style="background: var(--bg-tertiary); padding: 0.85rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.88rem; border: 1px solid var(--border-color);">
          <strong style="display: block; margin-bottom: 0.25rem;">📊 Vitalparameter & Befunde:</strong>
          <div style="color: var(--text-main); margin-bottom: 0.5rem; line-height: 1.4;">${parsed.vitals.notes}</div>
          <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
            <span class="vital-chip vital-chip-spo2">SpO₂: ${parsed.vitals.spo2}</span>
            <span class="vital-chip vital-chip-bp">RR: ${parsed.vitals.bp}</span>
            <span class="vital-chip vital-chip-hr">HF: ${parsed.vitals.hr}</span>
            <span class="vital-chip vital-chip-etco2">etCO₂: ${parsed.vitals.etco2}</span>
            <span class="vital-chip vital-chip-temp">Temp: ${parsed.vitals.temp}</span>
          </div>
        </div>

        <div style="background: rgba(192, 85, 68, 0.08); border-left: 3px solid var(--danger); padding: 0.75rem; border-radius: 4px; margin-bottom: 0.75rem; font-size: 0.88rem;">
          <strong>⚠️ Prüfer-Intervention:</strong> ${renderDualLanguageText(parsed.examinerIntervention, parsed.examinerInterventionTR)}
        </div>

        <div style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; padding: 0.75rem; border-radius: 4px; margin-bottom: 1.25rem; font-size: 0.88rem;">
          <strong>💡 Musterantwort zur Prüfer-Intervention:</strong><br>
          <div style="margin-top: 0.35rem; line-height: 1.5; white-space: pre-line;">${renderDualLanguageText(highlightDosagesAndUnits(parsed.examinerAnswer), highlightDosagesAndUnits(parsed.examinerAnswerTR))}</div>
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

  // --- Clean Overall Turkish Translation HUD (Box-Level Only, No Sentence Popups) ---
  function initHoverTranslationHUD() {
    // Touch tap support: tap on any translatable box to toggle inline translation preview
    document.addEventListener('click', (e) => {
      const box = e.target.closest('.translatable-box');
      if (box && !e.target.closest('button, input, select, textarea, kbd, a')) {
        const preview = box.querySelector('.hover-tr-preview');
        if (preview) {
          preview.classList.toggle('force-visible');
        }
      }
    });
  }

  // Initializing App
  initCategoryDropdown();
  initImageLightbox();
  initHoverTranslationHUD();
  updateAnalytics();
  renderCurrentQuestion();
});


