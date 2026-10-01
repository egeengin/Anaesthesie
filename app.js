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
  let speechRecognitionLang = 'de-DE';
  let micMediaStream = null;
  let micAudioContext = null;
  let micAnalyser = null;
  let micAnimFrame = null;
  let speechRestartTimer = null;

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
  const elBtnVoiceLangDe = document.getElementById('btn-voice-lang-de');
  const elBtnVoiceLangTr = document.getElementById('btn-voice-lang-tr');
  const elBtnSampleVoice = document.getElementById('btn-sample-voice');
  const elVoiceMicIndicator = document.getElementById('voice-mic-indicator');
  const elVoiceMicHint = document.getElementById('voice-mic-hint');
  const elBtnMicDiagnosis = document.getElementById('btn-mic-diagnosis');
  const elMicMetaRow = document.getElementById('mic-meta-row');
  const elMicDeviceWrapper = document.getElementById('mic-device-wrapper');
  const elMicDeviceSelect = document.getElementById('mic-device-select');
  const elMicWarningBanner = document.getElementById('mic-warning-banner');
  const elMicWarningTitle = document.getElementById('mic-warning-title');
  const elMicWarningDesc = document.getElementById('mic-warning-desc');
  const elBtnCloseMicWarning = document.getElementById('btn-close-mic-warning');
  const elVoicePlaybackBox = document.getElementById('voice-playback-box');
  const elVoiceRecordedAudio = document.getElementById('voice-recorded-audio');
  const elVoiceRecordingDuration = document.getElementById('voice-recording-duration');
  const elBtnReRecordVoice = document.getElementById('btn-re-record-voice');
  const elMicDiagPanel = document.getElementById('mic-diag-panel');
  const elBtnCloseMicDiag = document.getElementById('btn-close-mic-diag');
  const elDiagSpeechStatus = document.getElementById('diag-speech-status');
  const elDiagPermStatus = document.getElementById('diag-perm-status');
  const elDiagDeviceName = document.getElementById('diag-device-name');
  const elDiagVuFill = document.getElementById('diag-vu-fill');
  const elDiagVuLabel = document.getElementById('diag-vu-label');
  
  // ÄKNO Live Simulation Cockpit Elements
  const elSimLiveCockpit = document.getElementById('sim-live-cockpit');
  const elSimExaminerAvatar = document.getElementById('sim-examiner-avatar');
  const elSimExaminerAvatarBox = document.getElementById('sim-examiner-avatar-box');
  const elSimExaminerName = document.getElementById('sim-examiner-name');
  const elSimExaminerClinic = document.getElementById('sim-examiner-clinic');
  const elBtnSimSpeakStem = document.getElementById('btn-sim-speak-stem');
  const elBtnSimPeekStem = document.getElementById('btn-sim-peek-stem');
  const elSimPeekLabel = document.getElementById('sim-peek-label');
  const elBtnSimTriggerCrisis = document.getElementById('btn-sim-trigger-crisis');
  const elBtnSimToggleExaminerProfile = document.getElementById('btn-sim-toggle-examiner-profile');
  const elSimProfileBtnLabel = document.getElementById('sim-profile-btn-label');
  const elSimExaminerDrawer = document.getElementById('sim-examiner-drawer');
  const elSimExaminerDrawerContent = document.getElementById('sim-examiner-drawer-content');
  const elSimRhetoricPrompter = document.getElementById('sim-rhetoric-prompter');
  const elSimCrisisBanner = document.getElementById('sim-crisis-banner');
  const elSimCrisisTitle = document.getElementById('sim-crisis-title');
  const elSimCrisisPrompt = document.getElementById('sim-crisis-prompt');
  const elBtnSimSpeakCrisis = document.getElementById('btn-sim-speak-crisis');
  const elBtnSimToggleCrisisSolution = document.getElementById('btn-sim-toggle-crisis-solution');
  const elSimCrisisSolutionCard = document.getElementById('sim-crisis-solution-card');
  const elSimCrisisSolutionText = document.getElementById('sim-crisis-solution-text');
  const elSimCrisisKoText = document.getElementById('sim-crisis-ko-text');
  const elBtnAudioSpeakCrisisSolution = document.getElementById('btn-audio-speak-crisis-solution');
  const elSimKoRadarDisplay = document.getElementById('sim-ko-radar-display');
  const elSimEvalGradeBadge = document.getElementById('sim-eval-grade-badge');
  const elSimKoAlertBox = document.getElementById('sim-ko-alert-box');
  const elSimKoAlertBody = document.getElementById('sim-ko-alert-body');
  const elSimSafeBadge = document.getElementById('sim-safe-badge');
  const elSimStatementText = document.getElementById('sim-statement-text');
  
  // Step Containers & Accordions
  const elStep1Container = document.getElementById('step1-container');
  const elBtnToggleStep1Answer = document.getElementById('btn-toggle-step1-answer');
  const elStep1InlineAnswerBox = document.getElementById('step1-inline-answer-box');
  const elStep1InlineAnswerText = document.getElementById('step1-inline-answer-text');
  const elBtnAudioSpeakStep1Ans = document.getElementById('btn-audio-speak-step1-ans');
  const elBtnAudioSpeakStep1Box = document.getElementById('btn-audio-speak-step1-box');

  const elStep2Container = document.getElementById('step2-container');
  const elBtnStep2Toggle = document.getElementById('btn-step2-toggle');
  const elPanelVitals = document.getElementById('panel-vitals');
  const elBtnToggleStep2Answer = document.getElementById('btn-toggle-step2-answer');
  const elStep2InlineAnswerBox = document.getElementById('step2-inline-answer-box');
  const elStep2InlineAnswerText = document.getElementById('step2-inline-answer-text');
  const elBtnAudioSpeakStep2Ans = document.getElementById('btn-audio-speak-step2-ans');
  const elBtnAudioSpeakStep2Box = document.getElementById('btn-audio-speak-step2-box');

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
    
    const cleanTR = textTR.trim();

    return `<div class="translatable-box" data-tr="${escapeHtml(cleanTR)}" tabindex="0"><div class="de-text-block">${formattedDE}</div><div class="hover-tr-preview" aria-hidden="true"><span class="hover-tr-badge">🇹🇷</span><span class="hover-tr-content">${formatAnswerText(cleanTR)}</span></div></div>`;
  }

  function formatAnswerText(text) {
    if (!text) return '';
    return text
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/(?:\n|^)\s*•\s*/g, '\n• ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/(?:<br>\s*){3,}/g, '<br><br>')
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

  let baseRecordedText = '';
  let audioStream = null;
  let audioContext = null;
  let audioAnalyser = null;
  let audioSource = null;
  let audioAnimFrame = null;
  let mediaRecorder = null;
  let recordedAudioChunks = [];
  let recordedAudioBlob = null;
  let recordedAudioUrl = null;
  let recordingStartTime = 0;
  let recordingDurationInterval = null;
  let hasDetectedSoundInSession = false;
  let silenceFrameCounter = 0;
  let selectedAudioDeviceId = null;
  let currentMicDeviceName = 'Standard-Mikrofon';

  function showMicWarning(title, desc) {
    if (elMicWarningBanner) {
      if (elMicWarningTitle) elMicWarningTitle.innerHTML = title;
      if (elMicWarningDesc) elMicWarningDesc.innerHTML = desc;
      elMicWarningBanner.style.display = 'flex';
    }
  }

  function hideMicWarning() {
    if (elMicWarningBanner) {
      elMicWarningBanner.style.display = 'none';
    }
  }

  function isVirtualMic(label) {
    const l = (label || '').toLowerCase();
    return l.includes('teams') || l.includes('virtual') || l.includes('loopback') ||
           l.includes('blackhole') || l.includes('soundflower') || l.includes('zoom audio') ||
           l.includes('aggregate');
  }

  function isBuiltInHardwareMic(label) {
    const l = (label || '').toLowerCase();
    return l.includes('macbook') || l.includes('built-in') || l.includes('dahili') ||
           l.includes('internal') || l.includes('integriert') || l.includes('air mikrofonu') ||
           l.includes('pro mikrofonu') || l.includes('apple');
  }

  async function refreshAudioDevicesList() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices || !elMicDeviceSelect) {
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      if (audioInputs.length === 0) {
        if (elMicDeviceWrapper) elMicDeviceWrapper.style.display = 'none';
        return;
      }

      // If browser privacy hides labels before permission, immediately pre-populate MacBook Air hardware mic
      const hasLabels = audioInputs.some(d => d.label && d.label.trim().length > 0);
      if (!hasLabels) {
        const isMac = /macintosh|mac os x/i.test(navigator.userAgent || '');
        const defaultLabel = isMac ? '⭐ MacBook Air Mikrofonu (Dahili - Varsayılan)' : '⭐ Standard-Mikrofon (Dahili Donanım)';
        elMicDeviceSelect.innerHTML = `<option value="default" selected>${escapeHtml(defaultLabel)}</option>`;
        if (elMicDeviceWrapper) elMicDeviceWrapper.style.display = 'inline-flex';
        return;
      }

      // Categorize: 1. Built-in physical hardware (MacBook Air), 2. Other hardware (AirPods, USB), 3. Virtual (Teams)
      const builtInList = audioInputs.filter(d => isBuiltInHardwareMic(d.label));
      const otherList = audioInputs.filter(d => !isBuiltInHardwareMic(d.label) && !isVirtualMic(d.label));
      const virtualList = audioInputs.filter(d => isVirtualMic(d.label));

      const sortedInputs = [...builtInList, ...otherList, ...virtualList];

      // Auto-prioritize physical hardware mic: NEVER stay on virtual driver (Teams)
      const savedPref = localStorage.getItem('preferred_audio_device_id');
      const isCurrentVirtual = virtualList.some(v => v.deviceId === selectedAudioDeviceId);

      if (!selectedAudioDeviceId || isCurrentVirtual) {
        let bestMic = null;
        if (savedPref && !virtualList.some(v => v.deviceId === savedPref)) {
          bestMic = sortedInputs.find(d => d.deviceId === savedPref);
        }
        if (!bestMic) {
          bestMic = builtInList[0] || otherList[0] || audioInputs[0];
        }
        if (bestMic) {
          selectedAudioDeviceId = bestMic.deviceId;
          currentMicDeviceName = bestMic.label || 'MacBook Air Mikrofonu';
          localStorage.setItem('preferred_audio_device_id', selectedAudioDeviceId);
        }
      }

      elMicDeviceSelect.innerHTML = sortedInputs.map(dev => {
        const isBuiltIn = isBuiltInHardwareMic(dev.label);
        const isVirt = isVirtualMic(dev.label);
        let badge = '';
        if (isBuiltIn) badge = '⭐ (MacBook Dahili - Varsayılan)';
        else if (isVirt) badge = '⚠️ (Teams Sanal - Ses Almaz)';

        const rawLabel = dev.label || `Mikrofon (${dev.deviceId.slice(0, 6)}...)`;
        const displayLabel = `${rawLabel} ${badge}`.trim();
        const selected = (selectedAudioDeviceId === dev.deviceId) ? 'selected' : '';
        return `<option value="${escapeHtml(dev.deviceId)}" ${selected} ${isVirt ? 'style="color:#9ca3af;"' : ''}>${escapeHtml(displayLabel)}</option>`;
      }).join('');

      if (elMicDeviceWrapper) elMicDeviceWrapper.style.display = 'inline-flex';
    } catch (e) {
      console.warn('Device enumeration error:', e);
    }
  }

  async function initMicrophoneHardware(preferredDeviceId = null) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return null;
    }

    // Always prioritize the selected physical hardware mic over Teams virtual
    let targetDeviceId = preferredDeviceId || selectedAudioDeviceId;
    if (!targetDeviceId) {
      const savedPref = localStorage.getItem('preferred_audio_device_id');
      if (savedPref) targetDeviceId = savedPref;
    }

    // macOS CoreAudio optimization: on macOS, echoCancellation: true switches CoreAudio to AUVoiceProcessingIO,
    // which can starve Chrome's internal webkitSpeechRecognition capture pipeline. Using AUHAL (echoCancellation: false)
    // on macOS allows shared mic access so both getUserMedia and SpeechRecognition receive audio simultaneously.
    const isMac = /macintosh|mac os x/i.test(navigator.userAgent || '');
    const constraints = {
      audio: {
        echoCancellation: !isMac,
        noiseSuppression: !isMac,
        autoGainControl: !isMac,
        ...(targetDeviceId ? { deviceId: { exact: targetDeviceId } } : {})
      }
    };

    try {
      try {
        audioStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn('Advanced audio constraints failed, retrying basic:', firstErr);
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const tracks = audioStream.getAudioTracks();
      if (tracks && tracks.length > 0) {
        const t = tracks[0];
        currentMicDeviceName = t.label || 'MacBook Air Mikrofonu';
        if (elVoiceMicHint && isRecordingVoice) {
          elVoiceMicHint.textContent = speechRecognitionLang.startsWith('tr')
            ? `🎙️ ${currentMicDeviceName}: Dinleniyor...`
            : `🎙️ ${currentMicDeviceName}: Höre zu...`;
        }

        t.onended = () => {
          console.warn('Microphone hardware track ended');
          if (isRecordingVoice) {
            showMicWarning(
              'Mikrofon getrennt',
              'Die Verbindung zum Mikrofon wurde unterbrochen. Bitte überprüfen Sie das Audiogerät.'
            );
          }
        };

        t.onmute = () => {
          showMicWarning(
            'Mikrofon stummgeschaltet',
            'Ihr Mikrofon ist stummgeschaltet (Hardware-Schalter oder Systemeinstellungen).'
          );
        };

        t.onunmute = () => {
          hideMicWarning();
        };
      }

      refreshAudioDevicesList();
      return audioStream;
    } catch (err) {
      console.warn('Hardware getUserMedia error:', err);
      throw err;
    }
  }

  function setupAudioVisualizer(stream) {
    if (!stream) return false;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;

      if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioCtx();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }

      if (audioSource) {
        try { audioSource.disconnect(); } catch (e) {}
      }

      audioSource = audioContext.createMediaStreamSource(stream);
      audioAnalyser = audioContext.createAnalyser();
      audioAnalyser.fftSize = 64;
      audioAnalyser.smoothingTimeConstant = 0.4;
      audioSource.connect(audioAnalyser);

      const bufferLength = audioAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const waveBars = elAudioWaveVisualizer ? elAudioWaveVisualizer.querySelectorAll('.wave-bar') : [];

      function drawWave() {
        if (!isRecordingVoice && (!elMicDiagPanel || elMicDiagPanel.style.display === 'none')) {
          return;
        }
        audioAnimFrame = requestAnimationFrame(drawWave);
        audioAnalyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avgVol = sum / bufferLength; // 0..255
        const normalizedVol = Math.min(100, Math.round((avgVol / 120) * 100));

        // Update live VU meter in diagnostic panel if active
        if (elDiagVuFill) {
          elDiagVuFill.style.width = `${normalizedVol}%`;
        }
        if (elDiagVuLabel) {
          elDiagVuLabel.textContent = `${normalizedVol}%`;
        }

        if (avgVol > 6) {
          hasDetectedSoundInSession = true;
          silenceFrameCounter = 0;
          hideMicWarning();
          if (elAudioWaveVisualizer) {
            elAudioWaveVisualizer.classList.add('audio-detected');
            elAudioWaveVisualizer.classList.remove('pulsing');
          }
        } else {
          silenceFrameCounter++;
          // ~3.5 seconds of silence
          if (silenceFrameCounter > 210 && !hasDetectedSoundInSession && isRecordingVoice) {
            showMicWarning(
              'Kein Tonsignal erfasst (Eingangslautstärke 0)',
              'Das Mikrofon liefert keine Töne. Bitte prüfen Sie in den Systemeinstellungen die Mikrofon-Lautstärke oder wählen Sie oben das aktive Eingabegerät aus.'
            );
          }
        }

        if (waveBars && waveBars.length) {
          for (let i = 0; i < waveBars.length; i++) {
            const freqIdx = Math.floor((i / waveBars.length) * bufferLength);
            const val = dataArray[freqIdx] || avgVol;
            const h = Math.max(5, Math.min(26, Math.round(5 + (val / 255) * 21)));
            waveBars[i].style.height = `${h}px`;
            if (avgVol > 6) {
              waveBars[i].style.background = '#10b981';
              waveBars[i].style.boxShadow = '0 0 6px rgba(16, 185, 129, 0.7)';
            } else {
              waveBars[i].style.height = '6px';
              waveBars[i].style.background = '#ef4444';
              waveBars[i].style.boxShadow = 'none';
            }
          }
        }
      }

      drawWave();
      return true;
    } catch (err) {
      console.warn('Audio visualizer setup error:', err);
      return false;
    }
  }

  function stopMicrophoneHardware() {
    if (audioAnimFrame) {
      cancelAnimationFrame(audioAnimFrame);
      audioAnimFrame = null;
    }
    if (audioSource) {
      try { audioSource.disconnect(); } catch (e) {}
      audioSource = null;
    }
    if (audioAnalyser) {
      try { audioAnalyser.disconnect(); } catch (e) {}
      audioAnalyser = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      try { audioContext.close(); } catch (e) {}
      audioContext = null;
    }
    if (audioStream) {
      try {
        audioStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      audioStream = null;
    }
    // Prevent UI freeze: always reset VU meter bar to 0% so it never looks stuck
    if (elDiagVuFill) {
      elDiagVuFill.style.width = '0%';
    }
    if (elDiagVuLabel) {
      elDiagVuLabel.textContent = '0%';
    }
  }

  function setupMediaRecorder(stream) {
    if (typeof MediaRecorder === 'undefined' || !stream) return;
    try {
      let mimeType = '';
      const preferredMimes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg'
      ];
      for (const m of preferredMimes) {
        if (MediaRecorder.isTypeSupported(m)) {
          mimeType = m;
          break;
        }
      }

      mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordedAudioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedAudioChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (recordedAudioChunks.length > 0) {
          try {
            recordedAudioBlob = new Blob(recordedAudioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
            if (recordedAudioUrl) {
              URL.revokeObjectURL(recordedAudioUrl);
            }
            recordedAudioUrl = URL.createObjectURL(recordedAudioBlob);
            if (elVoiceRecordedAudio) {
              elVoiceRecordedAudio.src = recordedAudioUrl;
              elVoiceRecordedAudio.load();
            }
            if (elVoicePlaybackBox) {
              elVoicePlaybackBox.style.display = 'flex';
            }
          } catch (blobErr) {
            console.warn('Error creating audio blob:', blobErr);
          }
        }
        // Safely close audio stream tracks only after MediaRecorder has completely flushed data
        if (audioStream) {
          try {
            audioStream.getTracks().forEach(t => t.stop());
          } catch (e) {}
          audioStream = null;
        }
      };

      mediaRecorder.start(250);
    } catch (e) {
      console.warn('MediaRecorder setup error:', e);
    }
  }

  function createSpeechRecognizerInstance() {
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechAPI) return null;

    try {
      const rec = new SpeechAPI();
      rec.lang = speechRecognitionLang;
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        isRecordingVoice = true;
        updateRecordingUIState(true);
        if (elVoiceMicHint) {
          elVoiceMicHint.textContent = speechRecognitionLang.startsWith('tr')
            ? `🎙️ ${currentMicDeviceName}: Dinleniyor... (Lütfen konuşun veya yazın)`
            : `🎙️ ${currentMicDeviceName}: Höre zu... (Sprechen Sie frei oder tippen Sie)`;
        }
      };

      rec.onaudiostart = () => {
        if (elAudioWaveVisualizer) {
          elAudioWaveVisualizer.style.display = 'inline-flex';
        }
      };

      rec.onspeechstart = () => {
        hasDetectedSoundInSession = true;
        hideMicWarning();
        if (elAudioWaveVisualizer) {
          elAudioWaveVisualizer.classList.add('audio-detected');
        }
        if (elVoiceMicHint) {
          elVoiceMicHint.textContent = speechRecognitionLang.startsWith('tr')
            ? '🗣️ Ses algılandı – Yazıya dönüştürülüyor...'
            : '🗣️ Sprache erkannt – Transkription läuft...';
        }
      };

      rec.onspeechend = () => {
        if (elAudioWaveVisualizer) {
          elAudioWaveVisualizer.classList.remove('audio-detected');
        }
      };

      rec.onresult = (event) => {
        hasDetectedSoundInSession = true;
        hideMicWarning();

        let interim = '';
        let finalInSession = '';
        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res && res[0]) {
            if (res.isFinal) {
              finalInSession += res[0].transcript + ' ';
            } else {
              interim += res[0].transcript;
            }
          }
        }

        const fullSpoken = (baseRecordedText + finalInSession + interim).trim();
        if (elSpeechTranscriptInput) {
          elSpeechTranscriptInput.value = fullSpoken;
          elSpeechTranscriptInput.scrollTop = elSpeechTranscriptInput.scrollHeight;
        }
        if (elSpeechTranscriptText) {
          elSpeechTranscriptText.textContent = fullSpoken || 'Sprechen Sie jetzt frei Ihre Antwort ein...';
        }
        if (elVoiceMicHint) {
          const preview = (interim || finalInSession).trim();
          if (preview) {
            elVoiceMicHint.textContent = `✍️ "${preview.length > 35 ? '...' + preview.slice(-35) : preview}"`;
          }
        }
      };

      rec.onerror = (e) => {
        console.warn('[Speech Recognition] Error:', e.error, e.message);
        if (e.error === 'aborted') {
          // Normal during stop/restart or instance switch - do not show error banner
          return;
        }
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          showToast('🎙️ Mikrofonzugriff verweigert. Bitte in den Browsereinstellungen (Schloss-Symbol) freigeben.', 'warning', 6000);
          if (elVoiceMicHint) elVoiceMicHint.textContent = '❌ Mikrofonzugriff verweigert (Schloss-Symbol in Adressleiste prüfen)';
          showMicWarning(
            'Mikrofonzugriff verweigert',
            'Der Browser hat den Zugriff auf das Mikrofon verweigert. Bitte Schloss-Symbol in der Adressleiste anklicken und freigeben.'
          );
          stopVoiceRecording();
        } else if (e.error === 'network') {
          showMicWarning(
            'Google-Sprachdienst nicht erreichbar (VPN / AdBlocker / Brave)',
            'Der Cloud-Sprachdienst antwortet nicht. Ihre lokale Audioaufnahme läuft weiter! Sie können Stichpunkte auch direkt tippen.'
          );
        } else if (e.error === 'audio-capture') {
          showToast('🎙️ Kein Audiosignal erfasst. Bitte Systemeinstellungen / Standardmikrofon prüfen.', 'warning', 6000);
          if (elVoiceMicHint) elVoiceMicHint.textContent = '❌ Kein Audiosignal (Mikrofon prüfen)';
          showMicWarning(
            'Kein Audiosignal erfasst',
            'Es konnte kein Audiosignal empfangen werden. Bitte prüfen Sie Ihr Standardmikrofon in den Systemeinstellungen.'
          );
          stopVoiceRecording();
        } else if (e.error === 'no-speech') {
          if (elVoiceMicHint && !hasDetectedSoundInSession) {
            elVoiceMicHint.textContent = speechRecognitionLang.startsWith('tr')
              ? '⏳ Ses bekleniyor... (Lütfen konuşun veya yazın)'
              : '⏳ Höre zu... (Sprechen Sie frei oder tippen Sie)';
          }
        }
      };

      rec.onend = () => {
        speechRecognizer = null;
        if (isRecordingVoice) {
          // Commit current text in input so recognizer restart does not lose or duplicate words
          if (elSpeechTranscriptInput) {
            const currentVal = elSpeechTranscriptInput.value.trim();
            baseRecordedText = currentVal ? currentVal + ' ' : '';
          }
          if (speechRestartTimer) clearTimeout(speechRestartTimer);
          speechRestartTimer = setTimeout(() => {
            if (isRecordingVoice) {
              startSpeechRecognizerLoop();
            }
          }, 250);
        } else {
          updateRecordingUIState(false);
        }
      };

      return rec;
    } catch (e) {
      console.warn('Speech API creation error:', e);
      return null;
    }
  }

  function startSpeechRecognizerLoop() {
    if (!isRecordingVoice) return;
    if (speechRecognizer) {
      // Instance is already active, avoid collision
      return;
    }

    speechRecognizer = createSpeechRecognizerInstance();
    if (!speechRecognizer) return;

    try {
      speechRecognizer.start();
    } catch (startErr) {
      console.warn('Speech recognition start error:', startErr);
      speechRecognizer = null;
      if (speechRestartTimer) clearTimeout(speechRestartTimer);
      speechRestartTimer = setTimeout(() => {
        if (isRecordingVoice) {
          startSpeechRecognizerLoop();
        }
      }, 400);
    }
  }

  function updateRecordingUIState(isRec) {
    if (isRec) {
      if (elBtnToggleMic) elBtnToggleMic.classList.add('recording');
      if (elMicStatusText) elMicStatusText.innerHTML = '🔴 Aufnahme läuft... <kbd class="kbd-hint">V</kbd>';
      if (elSpeechTranscriptBox) elSpeechTranscriptBox.style.display = 'block';
      if (elVoiceMicIndicator) elVoiceMicIndicator.style.display = 'flex';
      if (elAudioWaveVisualizer) {
        elAudioWaveVisualizer.style.display = 'inline-flex';
        elAudioWaveVisualizer.classList.add('pulsing');
      }
    } else {
      if (elBtnToggleMic) elBtnToggleMic.classList.remove('recording');
      if (elMicStatusText) elMicStatusText.innerHTML = 'Antwort einsprechen <kbd class="kbd-hint">V</kbd>';
      if (elVoiceMicIndicator) elVoiceMicIndicator.style.display = 'none';
      if (elAudioWaveVisualizer) {
        elAudioWaveVisualizer.classList.remove('pulsing');
        elAudioWaveVisualizer.classList.remove('audio-detected');
        elAudioWaveVisualizer.style.display = 'none';
        const waveBars = elAudioWaveVisualizer.querySelectorAll('.wave-bar');
        waveBars.forEach(bar => {
          bar.style.height = '6px';
          bar.style.background = '#ef4444';
          bar.style.boxShadow = 'none';
        });
      }
    }
  }

  function startVoiceRecording() {
    isRecordingVoice = true;
    hasDetectedSoundInSession = false;
    silenceFrameCounter = 0;
    hideMicWarning();

    baseRecordedText = elSpeechTranscriptInput ? elSpeechTranscriptInput.value.trim() : '';
    if (baseRecordedText && !baseRecordedText.endsWith(' ')) {
      baseRecordedText += ' ';
    }

    updateRecordingUIState(true);
    if (elSpeechTranscriptInput) elSpeechTranscriptInput.focus();

    // 1. Release any test recognizer instance
    if (diagSpeechTestRecognizer) {
      const oldRec = diagSpeechTestRecognizer;
      diagSpeechTestRecognizer = null;
      oldRec.onstart = null;
      oldRec.onaudiostart = null;
      oldRec.onsoundstart = null;
      oldRec.onspeechstart = null;
      oldRec.onspeechend = null;
      oldRec.onsoundend = null;
      oldRec.onresult = null;
      oldRec.onerror = null;
      oldRec.onend = null;
      try { oldRec.abort(); } catch (e) {}
    }

    // 2. Start hardware audio stream first (fixes macOS Chrome mic conflict)
    initMicrophoneHardware(selectedAudioDeviceId).then((stream) => {
      if (stream && isRecordingVoice) {
        setupAudioVisualizer(stream);
        setupMediaRecorder(stream);
      }
      
      // 3. Start Speech Recognition AFTER hardware is ready
      const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechAPI) {
        startSpeechRecognizerLoop();
      } else {
        showToast('ℹ️ Spracherkennung in diesem Browser nicht nativ verfügbar. Lokale Audioaufnahme läuft – Sie können Stichpunkte auch direkt tippen!', 'info', 5000);
        if (elVoiceMicHint) {
          elVoiceMicHint.textContent = '🎙️ Lokale Audioaufnahme aktiv (Stichworte können direkt getippt werden)';
        }
      }
    }).catch((micErr) => {
      console.warn('Hardware microphone error:', micErr);
      if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
        showToast('🎙️ Mikrofonzugriff verweigert.', 'warning', 7000);
        stopVoiceRecording();
      }
    });

    // Duration timer for recording
    recordingStartTime = Date.now();
    if (recordingDurationInterval) clearInterval(recordingDurationInterval);
    recordingDurationInterval = setInterval(() => {
      if (!isRecordingVoice) {
        clearInterval(recordingDurationInterval);
        return;
      }
      const elapsedSec = Math.floor((Date.now() - recordingStartTime) / 1000);
      const m = Math.floor(elapsedSec / 60);
      const s = String(elapsedSec % 60).padStart(2, '0');
      if (elVoiceRecordingDuration) elVoiceRecordingDuration.textContent = `${m}:${s}`;
    }, 1000);
  }

  function stopVoiceRecording() {
    isRecordingVoice = false;
    if (speechRestartTimer) {
      clearTimeout(speechRestartTimer);
      speechRestartTimer = null;
    }

    if (recordingDurationInterval) {
      clearInterval(recordingDurationInterval);
      recordingDurationInterval = null;
    }

    if (speechRecognizer) {
      try {
        speechRecognizer.onstart = null;
        speechRecognizer.onaudiostart = null;
        speechRecognizer.onsoundstart = null;
        speechRecognizer.onspeechstart = null;
        speechRecognizer.onspeechend = null;
        speechRecognizer.onsoundend = null;
        speechRecognizer.onresult = null;
        speechRecognizer.onerror = null;
        speechRecognizer.onend = null;
        speechRecognizer.stop();
      } catch (err) {}
      speechRecognizer = null;
    }

    // Stop MediaRecorder and flush final buffer
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        if (typeof mediaRecorder.requestData === 'function') {
          mediaRecorder.requestData();
        }
        mediaRecorder.stop();
      } catch (e) {
        console.warn('MediaRecorder stop error:', e);
      }
    }

    stopMicrophoneHardware();
    updateRecordingUIState(false);
  }

  function toggleVoiceRecording() {
    if (isRecordingVoice) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  }

  function setSpeechLanguage(lang) {
    speechRecognitionLang = lang;
    if (elBtnVoiceLangDe && elBtnVoiceLangTr) {
      if (lang.startsWith('de')) {
        elBtnVoiceLangDe.classList.add('active');
        elBtnVoiceLangTr.classList.remove('active');
        showToast('🇩🇪 Spracherkennung: Deutsch (de-DE) aktiv', 'info', 3000);
      } else {
        elBtnVoiceLangTr.classList.add('active');
        elBtnVoiceLangDe.classList.remove('active');
        showToast('🇹🇷 Ses tanıma: Türkçe (tr-TR) aktif', 'info', 3000);
      }
    }
    if (isRecordingVoice) {
      if (speechRecognizer) {
        try { speechRecognizer.stop(); } catch (e) {}
        // onend will handle the restart with the new language
      } else {
        startSpeechRecognizerLoop();
      }
    }
  }

  async function runMicrophoneDiagnostics() {
    if (!elMicDiagPanel) return;
    const isVisible = (elMicDiagPanel.style.display !== 'none');
    if (isVisible) {
      stopMicrophoneHardware();
      if (diagSpeechTestRecognizer) {
        try { diagSpeechTestRecognizer.abort(); } catch (e) {}
        diagSpeechTestRecognizer = null;
      }
      elMicDiagPanel.style.display = 'none';
      return;
    }

    elMicDiagPanel.style.display = 'block';

    // 1. Web Speech API
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (elDiagSpeechStatus) {
      if (SpeechAPI) {
        elDiagSpeechStatus.textContent = '✅ Verfügbar (Web Speech API)';
        elDiagSpeechStatus.className = 'diag-val success';
      } else {
        elDiagSpeechStatus.textContent = '⚠️ Nicht nativ verfügbar (Nur lokale Audioaufnahme)';
        elDiagSpeechStatus.className = 'diag-val warning';
      }
    }

    // 2. Microphone Permissions API
    if (elDiagPermStatus) {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const p = await navigator.permissions.query({ name: 'microphone' });
          if (p.state === 'granted') {
            elDiagPermStatus.textContent = '✅ Erteilt (Mikrofonzugriff aktiv)';
            elDiagPermStatus.className = 'diag-val success';
          } else if (p.state === 'prompt') {
            elDiagPermStatus.textContent = '⏳ Wird abgefragt (Klicken Sie auf Zulassen)';
            elDiagPermStatus.className = 'diag-val warning';
          } else {
            elDiagPermStatus.textContent = '❌ Verweigert (In Browsereinstellungen gesperrt)';
            elDiagPermStatus.className = 'diag-val error';
          }
        } catch (e) {
          elDiagPermStatus.textContent = '✅ Standard (Bereit)';
          elDiagPermStatus.className = 'diag-val';
        }
      } else {
        elDiagPermStatus.textContent = '✅ Standard (Bereit)';
        elDiagPermStatus.className = 'diag-val';
      }
    }

    // 3. Audio Device Check & Real VU Meter Live Probe
    try {
      const probeStream = await initMicrophoneHardware(selectedAudioDeviceId);
      if (probeStream) {
        const track = probeStream.getAudioTracks()[0];
        if (track && elDiagDeviceName) {
          currentMicDeviceName = track.label || 'MacBook Air Mikrofonu';
          elDiagDeviceName.textContent = currentMicDeviceName;
        }
        setupAudioVisualizer(probeStream);
        refreshAudioDevicesList();
      }
    } catch (probeErr) {
      if (elDiagPermStatus) {
        elDiagPermStatus.textContent = '❌ Fehler: ' + probeErr.message;
        elDiagPermStatus.className = 'diag-val error';
      }
    }
  }

  let diagSpeechTestRecognizer = null;
  let diagSpeechTestTimer = null;
  function runDiagSpeechTest() {
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const elDiagTestBtn = document.getElementById('btn-diag-speech-test');
    const elDiagTestRes = document.getElementById('diag-speech-test-result');
    if (!SpeechAPI) {
      if (elDiagTestRes) elDiagTestRes.textContent = '⚠️ Web Speech API bu tarayıcıda desteklenmiyor.';
      return;
    }

    if (diagSpeechTestTimer) {
      clearTimeout(diagSpeechTestTimer);
      diagSpeechTestTimer = null;
    }

    // 1. If test is currently active, clicking again gracefully finalizes / stops it
    if (diagSpeechTestRecognizer) {
      try { diagSpeechTestRecognizer.stop(); } catch (e) {}
      diagSpeechTestRecognizer = null;
      if (elDiagTestBtn) elDiagTestBtn.textContent = '🗣️ Yeniden Test Et';
      if (elDiagTestRes && elDiagTestRes.textContent.includes('Dinleniyor')) {
        elDiagTestRes.innerHTML = '⏹️ Test durduruldu.';
      }
      return;
    }

    // 2. Stop any ongoing voice recording session to avoid recognition collision
    if (isRecordingVoice) {
      stopVoiceRecording();
    }

    const startTest = () => {
      const isGerman = !speechRecognitionLang || speechRecognitionLang.startsWith('de');
      const promptWord = isGerman ? '"Hallo"' : '"Merhaba"';
      let hasDetectedResult = false;

      try {
        const rec = new SpeechAPI();
        diagSpeechTestRecognizer = rec;
        rec.lang = speechRecognitionLang || 'de-DE';
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;

        rec.onstart = () => {
          if (elDiagTestBtn) elDiagTestBtn.textContent = '🔴 Dinleniyor... (Durdurmak için tıkla)';
          if (elDiagTestRes) {
            elDiagTestRes.style.color = '#38bdf8';
            elDiagTestRes.innerHTML = `🎙️ <strong>Mikrofon dinliyor!</strong> Lütfen şimdi sesli olarak ${promptWord} deyin...`;
          }
        };

        rec.onaudiostart = () => {
          if (elDiagTestRes && elDiagTestRes.textContent.includes('dinliyor')) {
            elDiagTestRes.style.color = '#10b981';
            elDiagTestRes.innerHTML = `👂 Ses sinyali alınıyor... Lütfen şimdi konuşun: ${promptWord}`;
          }
        };

        rec.onspeechstart = () => {
          if (elDiagTestRes) {
            elDiagTestRes.style.color = '#10b981';
            elDiagTestRes.innerHTML = '🗣️ Konuşma algılandı, çözümleniyor...';
          }
        };

        rec.onspeechend = () => {
          if (elDiagTestRes && !hasDetectedResult) {
            elDiagTestRes.innerHTML = '⏳ Ses tamamlandı, metin oluşturuluyor...';
          }
        };

        rec.onresult = (evt) => {
          let text = '';
          for (let i = 0; i < evt.results.length; i++) {
            if (evt.results[i] && evt.results[i][0]) {
              text += evt.results[i][0].transcript;
            }
          }
          text = text.trim();
          if (text) {
            hasDetectedResult = true;
            if (elDiagTestRes) {
              elDiagTestRes.style.color = '#10b981';
              elDiagTestRes.innerHTML = `✅ <strong>Algılandı:</strong> "${escapeHtml(text)}" (Ses tanıma başarıyla çalışıyor!)`;
            }
            if (elSpeechTranscriptInput && !elSpeechTranscriptInput.value.trim()) {
              elSpeechTranscriptInput.value = text;
            }
            if (elDiagTestBtn) elDiagTestBtn.textContent = '🗣️ Yeniden Test Et';

            if (diagSpeechTestTimer) clearTimeout(diagSpeechTestTimer);
            diagSpeechTestTimer = setTimeout(() => {
              if (diagSpeechTestRecognizer) {
                try { diagSpeechTestRecognizer.stop(); } catch (e) {}
                diagSpeechTestRecognizer = null;
              }
            }, 1500);
          }
        };

        rec.onerror = (err) => {
          console.warn('Diag speech test error:', err.error);
          if (err.error === 'aborted') return;
          if (elDiagTestBtn) elDiagTestBtn.textContent = '🗣️ Yeniden Test Et';
          if (elDiagTestRes) {
            elDiagTestRes.style.color = '#ef4444';
            if (err.error === 'not-allowed') {
              elDiagTestRes.innerHTML = '❌ <strong>İzin Verilmedi:</strong> Chrome bu adres için mikrofonu engelledi.';
            } else if (err.error === 'no-speech') {
              elDiagTestRes.innerHTML = `⏳ <strong>Ses çevrilemedi:</strong> Mikrofona biraz daha yakın ve net ${promptWord} deyin.`;
            } else if (err.error === 'network') {
              elDiagTestRes.innerHTML = '🌐 <strong>Ağ Hatası:</strong> Google konuşma sunucusuna erişilemedi.';
            } else {
              elDiagTestRes.innerHTML = `⚠️ <strong>Hata (${escapeHtml(err.error)}):</strong> Lütfen tekrar deneyin.`;
            }
          }
        };

        rec.onend = () => {
          diagSpeechTestRecognizer = null;
          if (diagSpeechTestTimer) {
            clearTimeout(diagSpeechTestTimer);
            diagSpeechTestTimer = null;
          }
          if (elDiagTestBtn) elDiagTestBtn.textContent = '🗣️ Yeniden Test Et';
          if (!hasDetectedResult) {
            if (elDiagTestRes && !elDiagTestRes.textContent.includes('❌') && !elDiagTestRes.textContent.includes('✅')) {
              elDiagTestRes.style.color = '#f59e0b';
              elDiagTestRes.innerHTML = `⏳ <strong>Kelime çözümlenemedi.</strong> Mikrofona daha yakın ve net şekilde ${promptWord} deyin.`;
            }
          }
        };

        diagSpeechTestTimer = setTimeout(() => {
          if (diagSpeechTestRecognizer && !hasDetectedResult) {
            try { diagSpeechTestRecognizer.stop(); } catch (e) {}
          }
        }, 8500);

        rec.start();
      } catch (e) {
        if (elDiagTestRes) elDiagTestRes.textContent = 'Başlatma hatası: ' + e.message;
        if (elDiagTestBtn) elDiagTestBtn.textContent = '🗣️ Yeniden Test Et';
      }
    };

    if (!audioStream) {
      initMicrophoneHardware(selectedAudioDeviceId).then((stream) => {
        if (stream) setupAudioVisualizer(stream);
        startTest();
      }).catch(() => {
        startTest();
      });
    } else {
      startTest();
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
      if (evalResult.matchRatio < 0.4 && parsedCase.checklistTR && parsedCase.checklistTR.length) {
        const evalTr = VoiceExamEngine.evaluateSpokenAnswer(spokenText, parsedCase.checklistTR);
        if (evalTr.matchRatio > evalResult.matchRatio) {
          evalResult = evalTr;
        }
      }
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

  if (elBtnVoiceLangDe) {
    elBtnVoiceLangDe.addEventListener('click', () => setSpeechLanguage('de-DE'));
  }
  if (elBtnVoiceLangTr) {
    elBtnVoiceLangTr.addEventListener('click', () => setSpeechLanguage('tr-TR'));
  }

  if (elBtnMicDiagnosis) {
    elBtnMicDiagnosis.addEventListener('click', runMicrophoneDiagnostics);
  }
  if (elBtnCloseMicDiag) {
    elBtnCloseMicDiag.addEventListener('click', () => {
      stopMicrophoneHardware();
      if (diagSpeechTestRecognizer) {
        try { diagSpeechTestRecognizer.abort(); } catch (e) {}
        diagSpeechTestRecognizer = null;
      }
      if (elMicDiagPanel) elMicDiagPanel.style.display = 'none';
    });
  }
  const elBtnDiagSpeechTest = document.getElementById('btn-diag-speech-test');
  if (elBtnDiagSpeechTest) {
    elBtnDiagSpeechTest.addEventListener('click', runDiagSpeechTest);
  }
  if (elBtnCloseMicWarning) {
    elBtnCloseMicWarning.addEventListener('click', hideMicWarning);
  }
  if (elMicDeviceSelect) {
    elMicDeviceSelect.addEventListener('change', async (e) => {
      selectedAudioDeviceId = e.target.value;
      if (isRecordingVoice) {
        stopVoiceRecording();
        startVoiceRecording();
      }
    });
  }
  if (elBtnReRecordVoice) {
    elBtnReRecordVoice.addEventListener('click', () => {
      if (elVoicePlaybackBox) elVoicePlaybackBox.style.display = 'none';
      if (elSpeechTranscriptInput) elSpeechTranscriptInput.value = '';
      startVoiceRecording();
    });
  }

  if (elBtnSampleVoice) {
    elBtnSampleVoice.addEventListener('click', () => {
      filteredQuestions = getFilteredQuestions();
      const currentQ = filteredQuestions[state.currentIndex];
      if (!currentQ) return;
      const parsedCase = parseOralExamCase(currentQ);
      
      let sampleText = '';
      if (speechRecognitionLang.startsWith('tr')) {
        if (parsedCase.checklistTR && parsedCase.checklistTR.length) {
          sampleText = parsedCase.checklistTR.slice(0, 3).join('. ') + '.';
        } else {
          sampleText = currentQ.answer_tr ? currentQ.answer_tr.slice(0, 150) + '...' : '';
        }
      } else {
        if (parsedCase.checklist && parsedCase.checklist.length) {
          sampleText = parsedCase.checklist.slice(0, 3).join('. ') + '.';
        } else if (parsedCase.verbalFramework) {
          sampleText = parsedCase.verbalFramework;
        } else {
          sampleText = currentQ.answer_de ? currentQ.answer_de.slice(0, 150) + '...' : '';
        }
      }
      
      if (elSpeechTranscriptInput && sampleText) {
        const existing = elSpeechTranscriptInput.value.trim();
        elSpeechTranscriptInput.value = existing ? `${existing} ${sampleText}` : sampleText;
        elSpeechTranscriptInput.focus();
        showToast('💡 Beispiel-Stichpunkte eingefügt!', 'info', 3000);
      }
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

    if (elSimCrisisSolutionCard) {
      elSimCrisisSolutionCard.style.display = 'none';
    }
    if (elBtnSimToggleCrisisSolution) {
      elBtnSimToggleCrisisSolution.innerHTML = '<span>💡</span> Sofort-Lösung & Übersetzung anzeigen / Acil Çözümü Gör';
    }
    if (elSimCrisisSolutionText) {
      elSimCrisisSolutionText.innerHTML = renderDualLanguageText(
        highlightDosagesAndUnits(reg.crisis.targetAction),
        highlightDosagesAndUnits(reg.crisis.targetAction_tr)
      );
    }
    if (elSimCrisisKoText) {
      const koDE = (reg.koCriteria && reg.koCriteria.failureReason) ? reg.koCriteria.failureReason : 'Vitale Kontraindikationen beachten!';
      const koTR = (reg.koCriteria && reg.koCriteria.failureReason_tr) ? reg.koCriteria.failureReason_tr : 'Hayati kontrendikasyonlara dikkat edilmelidir!';
      elSimCrisisKoText.innerHTML = renderDualLanguageText(koDE, koTR);
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

  if (elBtnSimToggleCrisisSolution) {
    elBtnSimToggleCrisisSolution.addEventListener('click', () => {
      if (!elSimCrisisSolutionCard) return;
      const isHidden = (elSimCrisisSolutionCard.style.display === 'none');
      elSimCrisisSolutionCard.style.display = isHidden ? 'block' : 'none';
      if (elBtnSimToggleCrisisSolution) {
        elBtnSimToggleCrisisSolution.innerHTML = isHidden
          ? '<span>✕</span> Sofort-Lösung verbergen / Çözümü Gizle'
          : '<span>💡</span> Sofort-Lösung & Übersetzung anzeigen / Acil Çözümü Gör';
      }
    });
  }

  if (elBtnAudioSpeakCrisisSolution) {
    elBtnAudioSpeakCrisisSolution.addEventListener('click', () => {
      filteredQuestions = getFilteredQuestions();
      const currentQ = filteredQuestions[state.currentIndex];
      if (!currentQ) return;
      const reg = (typeof MockExamSimulation !== 'undefined' && MockExamSimulation.getRegistry)
        ? MockExamSimulation.getRegistry(currentQ.id)
        : null;
      if (reg && reg.crisis && reg.crisis.targetAction) {
        speakText(getCleanSpeechText(reg.crisis.targetAction));
      }
    });
  }

  function toggleSimExaminerDrawer() {
    if (!elSimExaminerDrawer) return;
    const isHidden = (elSimExaminerDrawer.style.display === 'none' || !elSimExaminerDrawer.style.display);
    elSimExaminerDrawer.style.display = isHidden ? 'block' : 'none';
    if (elSimProfileBtnLabel) {
      elSimProfileBtnLabel.textContent = isHidden ? 'Profil Schließen / Kapat' : 'Jüri Profili / Prüfer-Profil';
    }
  }

  if (elBtnSimToggleExaminerProfile) {
    elBtnSimToggleExaminerProfile.addEventListener('click', toggleSimExaminerDrawer);
  }
  if (elSimExaminerAvatarBox) {
    elSimExaminerAvatarBox.addEventListener('click', toggleSimExaminerDrawer);
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

    // 5. Clinical Findings & Vitals Interpretation (Schritt 2)
    const vitalsInterpretation = generateVitalsInterpretation(category, stem, answer, vitals, q);

    return {
      clinicalContext,
      stem,
      vitals,
      vitalsInterpretationDE: vitalsInterpretation.de,
      vitalsInterpretationTR: vitalsInterpretation.tr,
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
    const text = ((q.stem_de || '') + ' ' + (q.question_de || '') + ' ' + (q.answer_de || '') + ' ' + (q.source_book || '') + ' ' + (q.category || '')).toLowerCase();

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
    } else if (text.includes('sugammadex') || text.includes('relaxometrie') || text.includes('tof') || text.includes('hohn') || text.includes('aufwachraum') || text.includes('rocuronium')) {
      return {
        name: 'Prof. Dr. med. Andreas Hohn',
        hospital: 'Chefarzt Ev. Krankenhaus Köln-Kalk / ehem. UK Köln · ÄKNO Fachprüfer',
        focus: 'Quantitative Relaxometrie (TOF-Ratio ≥ 0.9), Sugammadex-Dosierungen (2 vs. 4 vs. 16 mg/kg), ZAS vs. Überhang',
        focus_tr: 'Kantitatif Relaksometri (TOF oranı >= 0.9), Sugammadeks dozları (2 vs 4 vs 16 mg/kg), ZAS vs Kas gevşetici kalıntısı',
        trap: 'Extubation ohne Relaxometrie-Nachweis oder Verwechslung von NPPE mit Muskelrelaxanzien-Überhang',
        trap_tr: 'Relaksometri kanıtı olmadan ekstübe etmek veya NPPE ile gevşetici kalıntısını karıştırmak',
        keywords: 'TOF-Ratio ≥ 0.9, Sugammadex 16 mg/kg Notfall-Rescue, Posttetanic Count (PTC), Physostigmin bei ZAS',
        keywords_tr: "TOF oranı >= 0.9, Sugammadeks 16 mg/kg acil kurtarma, Posttetanik sayım (PTC), ZAS'ta Fizostigmin"
      };
    } else if (text.includes('kienbaum') || text.includes('polytrauma') || text.includes('rotem') || text.includes('schädel-hirn') || text.includes('massivtransfusion') || text.includes('tee') || text.includes('picco') || text.includes('blutung') || text.includes('gerinnung')) {
      return {
        name: 'Prof. Dr. med. Peter Kienbaum',
        hospital: 'Direktor der Klinik für Anästhesiologie, Universitätsklinikum Düsseldorf (UKD)',
        focus: 'Hämodynamik & PiCCO/TEE, Schockraum-Algorithmus, Ziel-CPP ≥ 60–70 mmHg bei SHT, ROTEM-gezielte Gerinnung',
        focus_tr: 'Hemodinami & PiCCO/TEE, Şok odası algoritması, SHT\'de hedef CPP >= 60-70 mmHg, ROTEM kılavuzluğunda hemostaz',
        trap: 'Permissive Hypotonie bei Schädel-Hirn-Trauma (absolutes K.O.-Kriterium!) oder ungezielte FFP-Gabe ohne ROTEM',
        trap_tr: 'Kafa travmasında permissif hipotansiyon uygulamak (kesin K.O. kriteri!) veya ROTEM\'siz körlemesine FFP vermek',
        keywords: 'CPP = MAP - ICP, kein PEEP-Überdruck bei Spannungspneu, Fibrinogen bei FIBTEM A10 < 10 mm, TXA vor 3h',
        keywords_tr: "CPP = MAP - ICP, Tansiyon pnömotoraksta PEEP'ten kaçın, FIBTEM A10 < 10 mm ise Fibrinojen, İlk 3 saatte TXA"
      };
    } else if (text.includes('wappler') || text.includes('maligne hyperthermie') || text.includes('dantrolen') || text.includes('last') || text.includes('intralipid') || text.includes('lokalanästhetika')) {
      return {
        name: 'Prof. Dr. med. Frank Wappler',
        hospital: 'Kliniken der Stadt Köln / Universität Witten/Herdecke · Nationales MH-Referenzzentrum',
        focus: 'Maligne Hyperthermie (EtCO₂-Anstieg, Dantrolen 2.5 mg/kg), Lokalanästhetika-Intoxikation (Intralipid 20%)',
        focus_tr: 'Malign Hipertermi (EtCO2 fırlaması, Dantrolen 2.5 mg/kg), Lokal Anestezik Sistemik Toksisitesi (İntralipid %20)',
        trap: 'Kalziumantagonisten bei V.a. MH oder Vasopressin/Lidocain bei LAST (sofortiges Durchfallen!)',
        trap_tr: 'Malign hipertermide kalsiyum kanal blokeri veya LAST\'ta Vazopressin/Lidokain vermek (anında sınavdan kalma!)',
        keywords: 'Trigger STOP, 100% O₂ High Flow, Dantrolen 2.5 mg/kg i.v., Intralipid 1.5 ml/kg Bolus, Kühlung bis 38.5°C',
        keywords_tr: "Tetikleyiciyi DERHAL KES, %100 O2 High Flow, Dantrolen 2.5 mg/kg i.v., İntralipid 1.5 ml/kg bolus, 38.5°C'ye soğutma"
      };
    } else if (text.includes('sectio') || text.includes('eklampsie') || text.includes('hellp') || text.includes('schwanger') || text.includes('geburt') || text.includes('partus') || text.includes('pph')) {
      return {
        name: 'ÄKNO Spezialkommission Geburtshilfe (Düsseldorf)',
        hospital: 'Ärztekammer Nordrhein (Düsseldorf) · Fachprüfer für Notfallsektio & Risikoschwangerschaft',
        focus: 'Notsectio EEZ ≤ 20 min, Linksseitenkippung 15–30°, Magnesiumsulfat 4–6 g, PPH-Stufenkonzept',
        focus_tr: 'Acil sezaryen EEZ <= 20 dk, Sol yan eğim 15-30°, Magnezyum sülfat 4-6 g, Postpartum kanama basamakları',
        trap: 'Vergessen der Linksseitenkippung (Vena-cava-Kompression) oder Spinalanästhesie bei Thrombozytopenie < 50.000/µl',
        trap_tr: 'Sol yan eğimi unutmak (Vena kava basısı) veya Trombosit < 50.000/µl iken spinal anestezi yapmak',
        keywords: '15–30° Linksseitenkippung, RSI mit Krikoiddruck (Sellick), Oxytocin/Sulproston, Magnesiumsulfat',
        keywords_tr: '15-30° Sol yan eğim, Sellick manevrasıyla RSI, Oksitosin/Sulproston, Magnezyum sülfat'
      };
    } else if (text.includes('pädiatr') || text.includes('kind') || text.includes('säugling') || text.includes('neonat') || text.includes('laryngospasmus')) {
      return {
        name: 'ÄKNO Pädiatrie- & Notfallkommission (Düsseldorf)',
        hospital: 'Universitätsklinikum Düsseldorf (UKD) · Sektion Pädiatrische Anästhesiologie',
        focus: 'Kindlicher Atemweg, Larson-Punkt bei Laryngospasmus, Tubusberechnung (Alter/4 + 3.5 mit Cuff), Bradykardie-Therapie',
        focus_tr: 'Çocuk havayolu anatomisi, Laringospazmda Larson noktası, Kaf\'lı tüp hesabı (Yaş/4 + 3.5), Bradikardi tedavisi',
        trap: 'Hypoxie-bedingte Bradykardie ignorieren oder blinde Überdruckbeatmung bei Fremdkörperaspiration',
        trap_tr: 'Hipoksiye bağlı gelişen bradikardiyi görmezden gelmek veya yabancı cisim aspirasyonunda kör basınca zorlamak',
        keywords: 'Tubus ID = Alter/4 + 3.5, Larson-Handgriff, 100% O₂ CPAP, Atropin 0.02 mg/kg, Hypoxie sofort beheben',
        keywords_tr: 'Tüp ID = Yaş/4 + 3.5, Larson manevrası, %100 O2 CPAP, Atropin 0.02 mg/kg, Hipoksiyi derhal çöz'
      };
    } else if (text.includes('elektrolyt') || text.includes('hyponatriämie') || text.includes('hyperkaliämie') || text.includes('säure-basen') || text.includes('bga') || text.includes('blutgas') || text.includes('natrium') || text.includes('kalium') || text.includes('osmolar') || text.includes('kalzium') || text.includes('chemie')) {
      return {
        name: 'Prof. Dr. med. Thorsten Annecke',
        hospital: 'Klinikum Leverkusen / ÄKNO Prüfungsvorsitzender · Intensiv- & Stoffwechselmonitoring',
        focus: 'Hyponatriämie & ODS-Prävention (max. 8–10 mmol/l/24h), Hyperkaliämie-Notfallstufen (Kalzium, Glukose-Insulin, Dialyse), BGA-Interpretation',
        focus_tr: 'Hiponatremi & Osmotik Demyelinizasyon önleme (maks. 8-10 mmol/l/24sa), Hiperkalemi acil basamakları (Kalsiyum, Glukoz-İnsülin, Diyaliz), BGA analizi',
        trap: 'Zu rascher Natriumausgleich (> 10 mmol/l/24h -> Pontine Myelinolyse) oder Kalziumgabe bei Digitalis-Intoxikation',
        trap_tr: 'Çok hızlı sodyum düzeltilmesi (> 10 mmol/l/24sa -> Santral Pontin Miyelinoliz) veya digital intoksikasyonunda kalsiyum vermek',
        keywords: 'NaCl 3% hyperton, max. 8–10 mmol/l/24h, Kalziumglukonat 10%, Glukose 20% + Alt-Insulin, Salbutamol, Stewart-Konzept',
        keywords_tr: 'Hipertonik %3 NaCl, maks. 8-10 mmol/l/24sa, %10 Kalsiyum glukonat, %20 Glukoz + Regüler İnsülin, Salbutamol, Stewart yaklaşımı'
      };
    } else if (text.includes('sepsis') || text.includes('intensiv') || text.includes('ards') || text.includes('schock') || text.includes('noradrenalin') || text.includes('vasopressor')) {
      return {
        name: 'ÄKNO Intensivkommission (DIVI / UK Düsseldorf)',
        hospital: 'Universitätsklinikum Düsseldorf / Klinikum Leverkusen · Operative Intensivmedizin',
        focus: 'Surviving Sepsis Campaign 1-Hour-Bundle, Laktat-Clearance, differenzierte Katecholamintherapie (MAP ≥ 65 mmHg), ARDS-Netzwerk',
        focus_tr: 'Surviving Sepsis 1 Saat Paketi, Laktat klirensi, hedefe yönelik vazopressör titrasyonu (MAP >= 65 mmHg), ARDS koruyucu ventilasyon',
        trap: 'Verzögerte Antibiosegabe (> 1h nach Sepsis-Erkennung) oder exzessive Hypervolämie bei septischer Kardiomyopathie',
        trap_tr: 'Antibiyotik uygulamasının gecikmesi (> 1 saat) veya septik kardiyomiyopatide kontrolsüz aşırı sıvı yüklemesi',
        keywords: '1-Hour-Bundle, Blutkulturen VOR Antibiotika, Noradrenalin Ziel-MAP ≥ 65, Vasopressin als Second-Line, Hydrocortison',
        keywords_tr: '1 Saat Paketi, Antibiyotikten ÖNCE kan kültürü, Noradrenalin hedef MAP >= 65, İkinci basamak Vazopressin, Hidrokortizon'
      };
    } else if (text.includes('regional') || text.includes('spinal') || text.includes('peridural') || text.includes('pda') || text.includes('plexus') || text.includes('block') || text.includes('schmerz')) {
      return {
        name: 'DGAI / ÄKNO Kommission Regionalanästhesie',
        hospital: 'Ärztekammer Nordrhein (Düsseldorf) · Sektion Regionalanästhesie & Akutschmerz',
        focus: 'Ultraschallgezielte Regionalanästhesie, DGAI-Empfehlungen zur Rückenmarknahen Regionalanästhesie unter Antikoagulation, LAST-Rescue',
        focus_tr: 'Ultrason kılavuzluğunda bölgesel anestezi, Antikoagülan kullanan hastada santral blok kılavuzları, LAST kurtarma protokolü',
        trap: 'Rückenmarksnahe Punktion ohne Abwarten der gerinnungshemmenden Zeitintervalle oder fehlende Aspiration vor LA-Injektion',
        trap_tr: 'Antikoagülan ilaçların güvenlik aralıkları beklenmeden santral blok yapmak veya enjeksiyondan önce aspirasyon yapmamak',
        keywords: 'Ultraschall-Visualisierung, Fraktionierte Injektion mit Aspiration, Zeitabstände NMH/DOAK, Intralipid 20% griffbereit',
        keywords_tr: 'Ultrason görselleştirmesi, Aspirasyon ile fraksiyone enjeksiyon, DMAH/DOAK bekleme süreleri, %20 İntralipid el altında'
      };
    } else if (text.includes('atemweg') || text.includes('intubation') || text.includes('cormack') || text.includes('koniotomie') || text.includes('videolaryngoskop') || text.includes('beatmung')) {
      return {
        name: 'Prof. Dr. med. Thorsten Annecke & Prof. Dr. med. Andreas Hohn',
        hospital: 'DGAI Kommission Atemwegsmanagement / ÄKNO Düsseldorf',
        focus: 'DGAI-Stufenplan schwieriger Atemweg, Videolaryngoskopie als Primärverfahren, eFONA / Skalpell-Koniotomie bei CICO',
        focus_tr: 'DGAI zor havayolu basamaklı planı, Birinci seçenek olarak videolaringoskopi, CICO durumunda skalpel koniyotomi (eFONA)',
        trap: 'Mehr als 3 Intubationsversuche ohne Planwechsel oder Zögern bei eFONA im Can-not-intubate-can-not-oxygenate-Szenario',
        trap_tr: 'Plan değiştirmeden 3\'ten fazla başarısız entübasyon denemesi veya CICO durumunda koniyotomide tereddüt etmek',
        keywords: 'DGAI-Stufenplan, Videolaryngoskopie, Larynxmaske Plan B, eFONA Skalpell-Bougie-Tubus Plan D, 100% O₂',
        keywords_tr: 'DGAI basamaklı planı, Videolaringoskopi, Plan B Laringeal Maske, Plan D Skalpel-buji-tüp eFONA, %100 O2'
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

    // Universal Authentic ÄKNO Düsseldorf Board Profile Fallback
    return {
      name: 'Prof. Dr. med. Thorsten Annecke / Prof. Dr. med. Peter Kienbaum',
      hospital: 'ÄKNO Prüfungskommission Düsseldorf · Haus der Ärzteschaft, Tersteegenstr. 9',
      focus: 'Strukturierte Priorisierung nach ABCDE, Patientensicherheit vor Detailwissen, evidenzbasierte DGAI/ESAIC-Leitlinien & klare Team-Kommunikation',
      focus_tr: 'ABCDE\'ye göre yapılandırılmış önceliklendirme, Teorik ayrıntıdan önce hasta güvenliği, Kanıta dayalı DGAI/ESAIC kılavuzları & net ekip komutları',
      trap: 'Zögern bei vitaler Bedrohung, unstrukturiertes Aufzählen von Medikamenten ohne Indikation, Missachten von K.O.-Kriterien',
      trap_tr: 'Hayati tehlikede tereddüt etmek, endikasyonsuz ilaç sıralamak, K.O. kriterlerine (kontrendikasyonlara) dikkat etmemek',
      keywords: 'ABCDE-Schema, Vitalfunktionen sichern, zielgerichtete Kausaltherapie, K.O.-Kriterien vermeiden, Team-Ressource-Management (CRM)',
      keywords_tr: 'ABCDE algoritması, Hayati fonksiyonları güvenceye alma, Hedefe yönelik nedensel tedavi, K.O. kriterlerinden kaçınma, CRM iletişimi'
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
        notes: 'Auskultation: Beidseits vesikulär, verlängertes Exspirium, Mallampati IV, thyromentaler Abstand 5,5 cm.',
        notes_tr: 'Oskültasyon: İki taraflı veziküler solunum sesleri, uzamış ekspiryum, Mallampati IV, tiromental mesafe 5,5 cm.'
      };
    } else if (category.includes('Herz') || category.includes('Hämo')) {
      return {
        spo2: '93%', bp: '78/44', map: '55 mmHg', hr: '126 /min', rhythm: 'Sinustachykardie',
        etco2: '24 mmHg', vent: 'Pmax 22 mbar', temp: '35,9 °C',
        ph: '7,21', po2: '78 mmHg', pco2: '34 mmHg', hco3: '14 mmol/l', be: '-10,2 mmol/l', lactate: '4,8 mmol/l',
        k: '4,8 mmol/l', na: '136 mmol/l', ca: '0,96 mmol/l', hb: '7,9 g/dl',
        notes: 'FATE-Echokardiographie: Linker Ventrikel hyperdynam, VCI atemkollaptisch (< 1,2 cm), ScvO2 56%.',
        notes_tr: 'FATE Odaklı Ekokardiyografi: Sol ventrikül hiperdinamik, VCI solunumla kollabe (< 1,2 cm), ScvO2 %56.'
      };
    } else if (category.includes('Chemie') || category.includes('Elektrolyt') || category.includes('Säure')) {
      const isAlkalosis = text.includes('alkalose') || text.includes('hypokaliämie');
      return {
        spo2: '98%', bp: '118/72', map: '87 mmHg', hr: isAlkalosis ? '88 /min' : '52 /min', rhythm: isAlkalosis ? 'Sinusrhythmus' : 'Sinusbradykardie',
        etco2: '36 mmHg', vent: 'Pmax 19 mbar', temp: '36,6 °C',
        ph: isAlkalosis ? '7,49' : '7,19', po2: '88 mmHg', pco2: isAlkalosis ? '44 mmHg' : '32 mmHg',
        hco3: isAlkalosis ? '32 mmol/l' : '13 mmol/l', be: isAlkalosis ? '+7,8 mmol/l' : '-13,5 mmol/l',
        lactate: '2,8 mmol/l', k: isAlkalosis ? '2,9 mmol/l' : '6,4 mmol/l', na: '128 mmol/l', ca: '0,94 mmol/l', hb: '11,4 g/dl',
        notes: isAlkalosis ? 'EKG: Abgeflachte T-Welle, U-Welle sichtbar; Tetanieneigung.' : 'EKG: Hohe zeltförmige T-Wellen, QRS-Verbreiterung (125 ms), AV-Block I°.',
        notes_tr: isAlkalosis ? 'EKG: Düzleşmiş T dalgası, belirgin U dalgası; tetani eğilimi.' : 'EKG: Sivri çadır T dalgaları, QRS genişlemesi (125 ms), 1. derece AV blok.'
      };
    } else if (category.includes('Pharmakologie') || category.includes('Notfall')) {
      return {
        spo2: '91%', bp: '65/35', map: '45 mmHg', hr: '140 /min', rhythm: 'Tachyarrhythmie',
        etco2: '19 mmHg', vent: 'Pmax 30 mbar', temp: '38,8 °C',
        ph: '7,14', po2: '72 mmHg', pco2: '56 mmHg', hco3: '17 mmol/l', be: '-11,2 mmol/l', lactate: '5,6 mmol/l',
        k: '5,9 mmol/l', na: '141 mmol/l', ca: '1,02 mmol/l', hb: '12,0 g/dl',
        notes: 'Monitoring: Rasch progrediente Hyperkapnie, Rigor und Temperaturanstieg (V.a. MH / LAST).',
        notes_tr: 'Monitörizasyon: Hızla ilerleyen hiperkapni, kas rijiditesi ve vücut sıcaklığında artış (MH / LAST şüphesi).'
      };
    } else {
      return {
        spo2: '96%', bp: '125/75', map: '91 mmHg', hr: '82 /min', rhythm: 'Sinusrhythmus',
        etco2: '38 mmHg', vent: 'Pmax 21 mbar', temp: '36,7 °C',
        ph: '7,38', po2: '92 mmHg', pco2: '41 mmHg', hco3: '24 mmol/l', be: '-0,5 mmol/l', lactate: '1,4 mmol/l',
        k: '4,3 mmol/l', na: '139 mmol/l', ca: '1,20 mmol/l', hb: '12,8 g/dl',
        notes: 'Vitalparameter und Monitoring im perioperativen Normbereich; Narkosetiefe adäquat.',
        notes_tr: 'Vital bulgular ve monitörizasyon perioperatif normal sınırlarda; anestezi derinliği yeterli.'
      };
    }
  }

  function generateVitalsInterpretation(category, stem, answer, vitals, q) {
    const text = ((stem || '') + ' ' + (answer || '') + ' ' + (category || '')).toLowerCase();
    const qId = q ? q.id : '';

    // Check 1: Authentic ÄKNO Düsseldorf Protocol Registry specific cases
    if (qId === 'q_dus_01' || text.includes('aortenklappen') || text.includes('stenose')) {
      return {
        de: `1. BEFUNDANALYSE (VITALPARAMETER & BGA):
• Hämodynamik: Fragile Ausgangslage bei schwerer Aortenklappenstenose. Fester Stenosequerschnitt begrenzt das maximale Schlagvolumen (RR ${vitals.bp}, MAP ${vitals.map}, HF ${vitals.hr}); die Koronarperfusion ist strikt abhängig von einem hohen systemvaskulären Widerstand (SVR) und ausreichend langer Diastole.
• BGA & Stoffwechsel: Aktuell kompensiert (pH ${vitals.ph}, Laktat ${vitals.lactate}, BE ${vitals.be}), jedoch droht unter Narkoseeinleitung ein schlagartiger Perfusionszusammenbruch.
• Diagnostik: ${vitals.notes}
2. THERAPEUTISCHE KONSEQUENZ & SOFORTMASSNAHMEN:
• ARTERIELLE BLUTDRUCKMESSUNG ZWINGEND VOR NARKOSEEINLEITUNG etablieren!
• Hämodynamische Zieltriade: 1. Sinusrhythmus 60–80/min streng wahren (keine Tachykardie!), 2. Vorlast sichern (kein Volumenmangel), 3. SVR hochhalten mit Noradrenalin / Phenylephrin.
• K.O.-KRITERIUM: Spinalanästhesie ist absolut kontraindiziert (akuter SVR-Abfall führt zum irreversiblen Kreislaufstillstand)!`,
        tr: `1. BULGULARIN ANALİZİ (VİTALLER & KAN GAZI):
• Hemodinamik: Ağır aort darlığında son derece kırılgan başlangıç durumu. Sabit kapak alanı atım hacmini sınırlar (Tansiyon ${vitals.bp}, MAP ${vitals.map}, Nabız ${vitals.hr}); koroner perfüzyon yüksek sistemik vasküler dirence (SVR) ve yeterli diyastol süresine bağımlıdır.
• Kan Gazı & Metabolizma: Şu an kompanse (pH ${vitals.ph}, Laktat ${vitals.lactate}, BE ${vitals.be}), ancak anestezi indüksiyonunda ani perfüzyon çöküşü riski mevcuttur.
• Tanısal Not: ${vitals.notes_tr}
2. TERAPÖTİK YAKLAŞIM & ACİL ÖNLEMLER:
• İNDÜKSİYONDAN ÖNCE İNVAZİV ARTERİYEL TANSİYON HATTI ZORUNLUDUR!
• Hemodinamik Hedef Triadı: 1. 60-80/dk sinüs ritmini koru (taşikardi yasak!), 2. Ön yükü garantiye al (hipovolemi yok), 3. Noradrenalin/Fenilefrin ile SVR'yi yüksek tut.
• K.O. KRİTERİ: Spinal anestezi kesinlikle kontrendikedir (ani SVR düşüşü geri dönüşümsüz kardiyak arreste yol açar)!`
      };
    }

    if (qId === 'q_dus_02' || text.includes('einlungenventilation') || text.includes('dlt') || text.includes('doppellumentubus')) {
      return {
        de: `1. BEFUNDANALYSE (VITALPARAMETER & BGA):
• Oxygenierung & Ventilation: Abfall der SpO2 (${vitals.spo2}) und pO2 (${vitals.po2}) unter Einlungenventilation (OLV) als Folge eines großen intrapulmonalen Rechts-Links-Shunts (nicht-ventilierte Lunge wird weiter perfundiert).
• Beatmungsmechanik: Pmax ${vitals.vent}, etCO2 ${vitals.etco2}; Gefahr der Tubusdislokation oder Sekretverlegung des DLT.
• Diagnostik: ${vitals.notes}
2. THERAPEUTISCHE KONSEQUENZ & STRUKTURIERTER 5-STUFEN-ALGORITHMUS:
• Stufe 1: FiO2 sofort auf 1,0 an der abhängigen, ventilierten Lunge erhöhen.
• Stufe 2: BRONCHOSKOPISCHE DLT-LAGEKONTROLLE! Ausschluss von Verrutschen, Abknicken oder Sekretobstruktion.
• Stufe 3: PEEP (4–8 cmH2O) an der ventilierten Lunge optimieren (Atelektasenprophylaxe).
• Stufe 4: CPAP (2–5 cmH2O mit O2-Flow) an die kollabierte OP-Lunge applizieren (stärkste Shuntreduktion).
• Stufe 5: Bei refraktärer Hypoxie: OP unterbrechen und sofortige Re-Ventilation beider Lungen mit 100% O2!`,
        tr: `1. BULGULARIN ANALİZİ (VİTALLER & KAN GAZI):
• Oksijenasyon: Tek akciğer ventilasyonunda (OLV) SpO2 (${vitals.spo2}) ve pO2 (${vitals.po2}) düşüşü; havalandırılmayan akciğerin perfüzyonuna bağlı masif intrapulmoner sağ-sol şantını gösterir.
• Havayolu Basıncı: Pmax ${vitals.vent}, etCO2 ${vitals.etco2}; çift lümenli tüpün (DLT) yerinden oynaması veya sekresyon tıkacı riski.
• Klinik Not: ${vitals.notes_tr}
2. TERAPÖTİK YAKLAŞIM & 5 BASAMAKLI KURTARMA ALGORİTMASI:
• Basamak 1: Havalandırılan akciğere derhal %100 FiO2 verin.
• Basamak 2: BRONKOSKOP İLE DLT TÜPÜNÜN YERİNİ KONTROL EDİN! Tüp kaymasını dışlayın.
• Basamak 3: Bağımlı akciğerde PEEP'i (4-8 cmH2O) optimize edin (atelektazi önleme).
• Basamak 4: Kollabe akciğere 2-5 cmH2O CPAP uygulayın (%100 O2 akımıyla).
• Basamak 5: Dirençli hipoksemide ameliyatı durdurup her iki akciğeri %100 O2 ile yeniden havalandırın!`
      };
    }

    if (qId === 'q_dus_03' || text.includes('schädel-hirn') || text.includes('sht') || text.includes('polytrauma')) {
      return {
        de: `1. BEFUNDANALYSE (VITALPARAMETER & BGA):
• Hämodynamik: Hämorrhagischer Schock (RR ${vitals.bp}, MAP ${vitals.map}, HF ${vitals.hr} ${vitals.rhythm}) bei instabilem Becken und Blutverlust.
• BGA: Schwere metabolische Azidose (pH ${vitals.ph}, BE ${vitals.be}, Laktat ${vitals.lactate}) mit Anämie (Hb ${vitals.hb}) und drohender Gerinnungsentgleisung.
• Neurologie: GCS 6, Anisokorie -> Akute intrakranielle Druckerhöhung mit Einklemmungsgefahr!
2. THERAPEUTISCHE KONSEQUENZ & LEBENSRETTENDE MASSNAHMEN:
• KONTRAINDIKATION PERMISSIVE HYPOTONIE: Bei begleitendem schwerem SHT ist permissive Hypotonie streng verboten!
• Ziel-Hämodynamik: MAP sofort auf ≥ 80–90 mmHg mittels Noradrenalin anheben, um einen zerebralen Perfusionsdruck (CPP = MAP - ICP) von ≥ 60–70 mmHg zu sichern!
• Mechanische Blutstillung: Beckenschlinge ('Pelvic Binder') sofort anlegen.
• Gerinnung: Tranexamsäure 1 g i.v. Bolus; ROTEM-gesteuertes Fibrinogenkonzentrat und Massivtransfusion.`,
        tr: `1. BULGULARIN ANALİZİ (VİTALLER & KAN GAZI):
• Hemodinamik: İnstabil pelvis ve kanamaya bağlı hemorajik şok (Tansiyon ${vitals.bp}, MAP ${vitals.map}, Nabız ${vitals.hr} ${vitals.rhythm}).
• Kan Gazı: Ağır metabolik asidoz (pH ${vitals.ph}, BE ${vitals.be}, Laktat ${vitals.lactate}, Hb ${vitals.hb}) ve koagülopati tehdidi.
• Nöroloji: GKS 6, anizokori -> Akut intrakraniyal basınç artışı ve herniasyon riski!
2. TERAPÖTİK YAKLAŞIM & HAYAT KURTARICI MÜDAHALELER:
• PERMİSSİF HİPOTANSİYON KESİNLİKLE YASAKTIR: Ağır kafa travmasında permissif hipotansiyon ölümcüldür!
• Hedef Hemodinamik: Noradrenalin ile MAP derhal ≥ 80-90 mmHg'ye yükseltilerek Serebral Perfüzyon Basıncı (CPP = MAP - ICP) ≥ 60-70 mmHg sağlanmalıdır.
• Mekanik Kanama Kontrolü: Pelvik korse (Pelvic Binder) anında takılmalıdır.
• Pıhtılaşma: 1 g Traneksamik asit i.v. bolus; ROTEM kılavuzluğunda fibrinojen ve masif transfüzyon.`
      };
    }

    // Check 2: Domain-specific clinical interpretation
    if (category.includes('Atemweg')) {
      return {
        de: `1. BEFUNDANALYSE (VITALPARAMETER & BGA):
• Ventilation & Oxygenierung: SpO2 ${vitals.spo2}, pO2 ${vitals.po2}, etCO2 ${vitals.etco2}, Pmax ${vitals.vent}. Respiratorische Partial- oder Globalinsuffizienz mit kompensatorischer Sinustachykardie (HF ${vitals.hr}).
• BGA & Säure-Basen-Status: pH ${vitals.ph}, pCO2 ${vitals.pco2}, BE ${vitals.be}, Laktat ${vitals.lactate}. Akute respiratorische Azidose infolge alveolärer Hypoventilation oder Obstruktion.
• Klinischer Befund: ${vitals.notes}
2. THERAPEUTISCHE KONSEQUENZ & SOFORTMASSNAHMEN:
• Präoxygenierung: Sofortige 100% O2-Gabe über dichte Maske mit Reservoir (High-Flow, Ziel-etO2 ≥ 90%).
• DGAI-Stufenplan schwieriger Atemweg: Videolaryngoskopie als Primärverfahren; Larynxmaske (Plan B) und Skalpell-Koniotomieset / eFONA (Plan D) unmittelbar bereitstellen.
• Beatmungsoptimierung: Druckkontrollierte Beatmung, PEEP vorsichtig titrieren, kontinuierliche Kapnographie (etCO2) zwingend zur Lagebestätigung.`,
        tr: `1. BULGULARIN ANALİZİ (VİTALLER & KAN GAZI):
• Ventilasyon & Oksijenasyon: SpO2 ${vitals.spo2}, pO2 ${vitals.po2}, etCO2 ${vitals.etco2}, Pmax ${vitals.vent}. Kompansatuar sinüs taşikardisi (Nabız ${vitals.hr}) ile birlikte solunum yetmezliği tablosu.
• Kan Gazı & Asit-Baz: pH ${vitals.ph}, pCO2 ${vitals.pco2}, BE ${vitals.be}, Laktat ${vitals.lactate}. Alveoler hipoventilasyona veya hava yolu obstrüksiyonuna bağlı akut respiratuar asidoz.
• Muayene / Bulgular: ${vitals.notes_tr}
2. TERAPÖTİK YAKLAŞIM & ACİL ÖNLEMLER:
• Preoksijenasyon: Rezervuarlı maske ile %100 O2 preoksijenasyonu (High-flow, hedef etO2 ≥ %90).
• Zor Havayolu Kılavuzu: DGAI basamaklı planı devreye sokulur; 1. tercih olarak videolaringoskopi, Plan B (LMA) ve Plan D (skalpel koniyotomi) hazır bulundurulmalıdır.
• Ventilasyon Desteği: Basınç kontrollü ventilasyon, PEEP titrasyonu, tüp yerleşimi için sürekli kapnografi takibi.`
      };
    }

    if (category.includes('Herz') || category.includes('Hämo')) {
      return {
        de: `1. BEFUNDANALYSE (VITALPARAMETER & BGA):
• Hämodynamik: Schwere hämodynamische Instabilität / Schock (RR ${vitals.bp}, MAP ${vitals.map}, HF ${vitals.hr} ${vitals.rhythm}).
• Perfusion & Sauerstofftransport: Schwere metabolische Laktatazidose (pH ${vitals.ph}, BE ${vitals.be}, Laktat ${vitals.lactate}, Hb ${vitals.hb}) zeigt eine kritische Sauerstoffschuld und Organdysfunktion an.
• Echokardiographie & Monitoring: ${vitals.notes}
2. THERAPEUTISCHE KONSEQUENZ & SOFORTMASSNAHMEN:
• Hämodynamisches Primärziel: Rasche MAP-Anhebung auf ≥ 65 mmHg mittels titrierter Noradrenalin-Gabe (2–10 µg/min bzw. 0,05–0,3 µg/kg/min).
• Gezielte Volumentherapie: Balancierte Vollelektrolytlösung (20–30 ml/kg Bolus) unter dynamischem Vorlastmonitoring (VCI-Kollapsibilität / SVV).
• Myokardschutz & Inotropie: Bei kardialer Pumpfunktionsstörung zusätzlich Dobutamin (2,5–10 µg/kg/min) titrieren; frühzeitige arterielle Kanülierung und ZVK-Anlage.`,
        tr: `1. BULGULARIN ANALİZİ (VİTALLER & KAN GAZI):
• Hemodinamik: Ciddi hemodinamik instabilite / şok tablosu (Tansiyon ${vitals.bp}, MAP ${vitals.map}, Nabız ${vitals.hr} ${vitals.rhythm}).
• Perfüzyon & Oksijen Taşınması: Ağır metabolik laktik asidoz (pH ${vitals.ph}, BE ${vitals.be}, Laktat ${vitals.lactate}, Hb ${vitals.hb}) kritik doku hipoksisini ve organ yetmezliğini yansıtır.
• Ekokardiyografi & Monitörizasyon: ${vitals.notes_tr}
2. TERAPÖTİK YAKLAŞIM & ACİL ÖNLEMLER:
• Primer Hemodinamik Hedef: Noradrenalin titrasyonu ile derhal hedef MAP ≥ 65 mmHg sağlanmalıdır.
• Hacim Replasmanı: Dinamik ön yük takibi altında balanse kristaloid (20-30 ml/kg bolus).
• İnotropi & İnvaziv Hat: Pompa yetmezliğinde Dobutamin (2.5-10 µg/kg/dk) eklenmesi, invaziv arter ve CVP hattı açılması.`
      };
    }

    if (category.includes('Chemie') || category.includes('Elektrolyt') || category.includes('Säure') || category.includes('Blutgas')) {
      return {
        de: `1. BEFUNDANALYSE (VITALPARAMETER & BGA):
• Säure-Basen-Status: pH ${vitals.ph}, pCO2 ${vitals.pco2}, HCO3- ${vitals.hco3}, BE ${vitals.be}, Laktat ${vitals.lactate}. Ausgeprägte Störung der Säure-Basen-Homöostase.
• Elektrolyte: K+ ${vitals.k}, Na+ ${vitals.na}, Ca2+ ${vitals.ca}. Arrhythmogene Verschiebung mit kardialer Gefährdung.
• Diagnostik & EKG: ${vitals.notes}
2. THERAPEUTISCHE KONSEQUENZ & STUFENPLAN:
• Stufe 1 (Kardiale Membranstabilisierung): Bei Hyperkaliämie oder EKG-Auffälligkeiten sofort Kalziumglukonat 10% (10 ml i.v. über 2–3 Min) applizieren.
• Stufe 2 (Shift nach intrazellulär): Glukose-Insulin-Infusion (500 ml G20% + 10 IE Normalinsulin) und Salbutamol inhalativ/i.v.
• Stufe 3 (Elimination & Kausaltherapie): Forcierte Diurese mit Furosemid, Kationenaustauscher, bei refraktärem Verlauf sofortige Notfall-Hämodialyse.`,
        tr: `1. BULGULARIN ANALİZİ (VİTALLER & KAN GAZI):
• Asit-Baz Dengesi: pH ${vitals.ph}, pCO2 ${vitals.pco2}, HCO3- ${vitals.hco3}, BE ${vitals.be}, Laktat ${vitals.lactate}. Belirgin asit-baz dengesizliği.
• Elektrolitler: K+ ${vitals.k}, Na+ ${vitals.na}, Ca2+ ${vitals.ca}. Ciddi aritmi riski taşıyan elektrolit dengesizliği.
• EKG & Monitörizasyon: ${vitals.notes_tr}
2. TERAPÖTİK YAKLAŞIM & BASAMAKLI TEDAVİ:
• Basamak 1 (Membran Stabilizasyonu): Aritmi ve arresti önlemek için derhal %10 Kalsiyum glukonat (10 ml i.v. 2-3 dakikada).
• Basamak 2 (Hücre İçine Kaydırma): Glukoz-İnsülin infüzyonu (%20 500 ml dekstroz + 10 Ü insülin) ve Salbutamol uygulaması.
• Basamak 3 (Eliminasyon): Furosemid ile zorlu diürez, reçineler veya dirençli olgularda acil hemodiyaliz.`
      };
    }

    if (category.includes('Pharmakologie') || category.includes('Notfall') || category.includes('Reanimation')) {
      return {
        de: `1. BEFUNDANALYSE (VITALPARAMETER & BGA):
• Vitalzeichen & Monitoring: RR ${vitals.bp}, HF ${vitals.hr} ${vitals.rhythm}, etCO2 ${vitals.etco2}, Temperatur ${vitals.temp}. Akuter anästhesiologischer Zwischenfall mit vitaler Gefährdung.
• BGA & Laktat: pH ${vitals.ph}, pCO2 ${vitals.pco2}, Laktat ${vitals.lactate}. Schwere metabolisch-respiratorische Azidose.
• Alarmbefund: ${vitals.notes}
2. THERAPEUTISCHE KONSEQUENZ & PROTOKOLLMASSNAHMEN:
• Zufuhr aller potenziellen Trigger unverzüglich stoppen (Volatila, Relaxanzien, Lokalanästhetika, Antibiotika)!
• 100% Sauerstoff mit maximalem Flow, Notfallalarm im Saal auslösen.
• Spezifische Antidottherapie abrufen: Dantrolen bei MH, Intralipid 20% bei LAST, Adrenalin bei Anaphylaxie/CPR, Sugammadex bei Muskelrelaxanz-Überhang.`,
        tr: `1. BULGULARIN ANALİZİ (VİTALLER & KAN GAZI):
• Hayati Bulgular: Tansiyon ${vitals.bp}, Nabız ${vitals.hr} ${vitals.rhythm}, etCO2 ${vitals.etco2}, Sıcaklık ${vitals.temp}. Hayatı tehdit eden akut anesteziyolojik kriz.
• Kan Gazı: pH ${vitals.ph}, pCO2 ${vitals.pco2}, Laktat ${vitals.lactate}. Ağır asidoz ve doku hipoksisi.
• Kritik İpucu: ${vitals.notes_tr}
2. TERAPÖTİK YAKLAŞIM & PROTOKOL ADIMLARI:
• Olası tüm tetikleyicileri derhal durdurun (Gazlar, kas gevşeticiler, lokal anestezikler, antibiyotikler)!
• %100 Oksijen yüksek akım ile verilir, ameliyathanede acil ekip alarmı verilir.
• Spesifik antidot uygulanır: MH'de Dantrolen, LAST'ta %20 İntralipid, Anafilakside Adrenalin, Relaksan bloğunda Sugammadeks.`
      };
    }

    // Default Fallback
    return {
      de: `1. BEFUNDANALYSE (VITALPARAMETER & BGA):
• Hämodynamik: RR ${vitals.bp} (MAP ${vitals.map}), Herzfrequenz ${vitals.hr} (${vitals.rhythm}).
• Respiration & Gasaustausch: SpO2 ${vitals.spo2}, etCO2 ${vitals.etco2}, Pmax ${vitals.vent}.
• BGA & Labor: pH ${vitals.ph}, pO2 ${vitals.po2}, pCO2 ${vitals.pco2}, BE ${vitals.be}, Laktat ${vitals.lactate}, Hb ${vitals.hb}.
• Monitoring & Befunde: ${vitals.notes}
2. THERAPEUTISCHE KONSEQUENZ & PRIORITÄTEN:
• Sicherung der Vitalfunktionen nach dem ABCDE-Schema (Atemwegskontrolle, adäquate Oxygenierung, Ziel-MAP ≥ 65 mmHg).
• Engmaschige Verlaufsbeurteilung von BGA und Hämodynamik; frühzeitige Kausaltherapie zur Vermeidung perioperativer Komplikationen.`,
      tr: `1. BULGULARIN ANALİZİ (VİTALLER & KAN GAZI):
• Hemodinamik: Tansiyon ${vitals.bp} (MAP ${vitals.map}), Kalp Hızı ${vitals.hr} (${vitals.rhythm}).
• Solunum & Gaz Değişimi: SpO2 ${vitals.spo2}, etCO2 ${vitals.etco2}, Pmax ${vitals.vent}.
• Kan Gazı & Laboratuvar: pH ${vitals.ph}, pO2 ${vitals.po2}, pCO2 ${vitals.pco2}, BE ${vitals.be}, Laktat ${vitals.lactate}, Hb ${vitals.hb}.
• Klinik Notlar: ${vitals.notes_tr}
2. TERAPÖTİK YAKLAŞIM & ÖNCELİKLER:
• ABCDE şemasına göre hayati fonksiyonların güvenceye alınması (havayolu, yeterli oksijenasyon, hedef MAP ≥ 65 mmHg).
• Kan gazı ve hemodinaminin yakın takibi; perioperatif komplikasyonları önlemek için zamanında nedensel tedavi.`
    };
  }

  function renderStep1InlineAnswer(parsedCase, currentQ) {
    if (!parsedCase) return '';
    let html = '';

    // 1. Structured Verbal Framework
    if (parsedCase.verbalFramework) {
      html += `
        <div class="inline-ans-section">
          <div class="inline-ans-title">🗣️ Strukturierte Erstbeurteilung / Yapılandırılmış Giriş & İlk Yaklaşım:</div>
          <div class="inline-ans-quote">${renderDualLanguageText(parsedCase.verbalFramework, parsedCase.verbalFrameworkTR)}</div>
        </div>
      `;
    }

    // 2. Full Model Solution
    html += `
      <div class="inline-ans-section" style="margin-top: 0.85rem;">
        <div class="inline-ans-title">📋 Ausführliche Facharzt-Musterantwort / Ayrıntılı Uzmanlık Model Cevabı:</div>
        <div class="inline-ans-body">${renderDualLanguageText(highlightDosagesAndUnits(parsedCase.fullTextDE), highlightDosagesAndUnits(parsedCase.fullTextTR))}</div>
      </div>
    `;

    // 3. If MCQ options exist, show option evaluation
    if (currentQ && currentQ.options && currentQ.options.length > 0) {
      html += `
        <div class="inline-ans-section" style="margin-top: 0.85rem;">
          <div class="inline-ans-title">🎯 Antwortbewertung der Aussagen / Şıkların Değerlendirmesi:</div>
          <div class="inline-ans-options-list">
      `;
      currentQ.options.forEach(opt => {
        const isCor = opt.is_correct;
        const badge = isCor ? '<span style="color:#10b981;font-weight:700;">✅ Richtig / Doğru:</span>' : '<span style="color:#ef4444;font-weight:700;">❌ Falsch / Yanlış:</span>';
        const explDE = opt.explanation_de || opt.text_de;
        const explTR = opt.explanation_tr || opt.text_tr || '';
        html += `
          <div class="inline-ans-opt-row" style="margin: 0.35rem 0; padding: 0.4rem 0.6rem; border-left: 3px solid ${isCor ? '#10b981' : '#ef4444'}; background: ${isCor ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)'}; border-radius: 4px;">
            <strong>(${opt.key.toUpperCase()})</strong> ${badge} ${renderDualLanguageText(explDE, explTR)}
          </div>
        `;
      });
      html += `</div></div>`;
    }

    return html;
  }

  function renderStep2InlineAnswer(parsedCase) {
    if (!parsedCase) return '';
    return `
      <div class="inline-ans-section">
        <div class="inline-ans-title">📊 Klinische Befund- & BGA-Interpretation / Bulguların ve Kan Gazının Analizi:</div>
        <div class="inline-ans-body">${renderDualLanguageText(highlightDosagesAndUnits(parsedCase.vitalsInterpretationDE), highlightDosagesAndUnits(parsedCase.vitalsInterpretationTR))}</div>
      </div>
    `;
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

  function renderExaminerCardContent(examinerProfile, q) {
    if (!examinerProfile || !elExaminerRevealCard) return;
    const targetQ = q || (filteredQuestions && filteredQuestions[state.currentIndex]);
    const reg = (typeof MockExamSimulation !== 'undefined' && MockExamSimulation.getRegistry && targetQ)
      ? MockExamSimulation.getRegistry(targetQ.id)
      : null;

    const profKeywordsDE = examinerProfile.keywords 
      || (reg && reg.koCriteria && reg.koCriteria.mandatoryKeywords ? reg.koCriteria.mandatoryKeywords.join(', ') : '') 
      || '';
    const profKeywordsTR = examinerProfile.keywords_tr 
      || (reg && reg.koCriteria && reg.koCriteria.mandatoryKeywords_tr ? reg.koCriteria.mandatoryKeywords_tr.join(', ') : profKeywordsDE) 
      || '';

    elExaminerRevealCard.innerHTML = `
      <div class="examiner-reveal-header">
        <div class="examiner-reveal-name">👨‍⚕️ ${examinerProfile.name || 'ÄKNO Prüfer'}</div>
        <div class="examiner-reveal-clinic">📍 ${examinerProfile.hospital || 'Ärztekammer Nordrhein (Düsseldorf)'}</div>
      </div>
      <div class="examiner-profile-grid">
        <div class="examiner-profile-item">
          <strong>🎯 Prüfungsschwerpunkt / Sınav Odak Noktası</strong>
          <div>${renderDualLanguageText(examinerProfile.focus || 'Klinische Entscheidungsfindung und Leitlinienkompetenz', examinerProfile.focus_tr || 'Klinik karar verme ve kılavuz yetkinliği')}</div>
        </div>
        <div class="examiner-profile-item alert-trap">
          <strong>⚠️ Typische Prüfungsfalle / Sınav Tuzağı</strong>
          <div>${renderDualLanguageText(examinerProfile.trap || 'Unsicherheit bei Dosierungen oder mangelhafte Priorisierung', examinerProfile.trap_tr || 'Dozlarda kararsızlık veya yetersiz önceliklendirme')}</div>
        </div>
        ${profKeywordsDE ? `
        <div class="examiner-profile-item alert-pass">
          <strong>⭐ Signalwörter für Bestnote / Başarı Anahtarları</strong>
          <div>${renderDualLanguageText(profKeywordsDE, profKeywordsTR)}</div>
        </div>` : ''}
      </div>
    `;
  }

  if (elBadgeExaminerToggle && elExaminerRevealCard) {
    elBadgeExaminerToggle.addEventListener('click', () => {
      const isExpanded = elExaminerRevealCard.style.display !== 'none';
      if (!isExpanded && (!elExaminerRevealCard.innerHTML || elExaminerRevealCard.innerHTML.trim() === '')) {
        const curQ = filteredQuestions && filteredQuestions[state.currentIndex];
        const prof = getExaminerProfileForCase(curQ);
        if (prof) {
          renderExaminerCardContent(prof, curQ);
        }
      }
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

    // Escape: Interrupt and stop speech playback immediately
    if (e.key === 'Escape' && isSpeakingMedical) {
      e.preventDefault();
      stopMedicalSpeech();
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
    const reg = (typeof MockExamSimulation !== 'undefined' && MockExamSimulation.getRegistry)
      ? MockExamSimulation.getRegistry(currentQ.id)
      : null;
    const prof = reg ? reg.examiner : getExaminerProfileForCase(currentQ);

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
        if (prof) {
          if (elSimExaminerName) elSimExaminerName.textContent = prof.name;
          if (elSimExaminerClinic) elSimExaminerClinic.textContent = prof.hospital;

          if (elSimExaminerDrawer) elSimExaminerDrawer.style.display = 'none';
          if (elSimProfileBtnLabel) elSimProfileBtnLabel.textContent = 'Jüri Profili / Prüfer-Profil';
          if (elSimExaminerDrawerContent) {
            const profKeywordsDE = prof.keywords || (reg && reg.koCriteria && reg.koCriteria.mandatoryKeywords ? reg.koCriteria.mandatoryKeywords.join(', ') : '');
            const profKeywordsTR = prof.keywords_tr || profKeywordsDE;
            elSimExaminerDrawerContent.innerHTML = `
              <div class="examiner-drawer-header">
                <div class="examiner-drawer-title">
                  <span class="examiner-drawer-badge">🏛️ ÄKNO Düsseldorf Fachprüfer / Sınav Jürisi</span>
                  <h4 class="examiner-drawer-name">👨‍⚕️ ${prof.name}</h4>
                  <p class="examiner-drawer-clinic">📍 ${prof.hospital}</p>
                </div>
              </div>
              <div class="examiner-drawer-grid">
                <div class="examiner-profile-item">
                  <strong>🎯 Prüfungsschwerpunkt / Sınav Odak Noktası</strong>
                  <div>${renderDualLanguageText(prof.focus, prof.focus_tr)}</div>
                </div>
                <div class="examiner-profile-item alert-trap">
                  <strong>⚠️ Typische Prüfungsfalle / Sınav Tuzağı (K.O.-Kriterium)</strong>
                  <div>${renderDualLanguageText(prof.trap, prof.trap_tr)}</div>
                </div>
                ${profKeywordsDE ? `
                <div class="examiner-profile-item alert-pass">
                  <strong>⭐ Signalwörter für Bestnote / Başarı Anahtarları</strong>
                  <div>${renderDualLanguageText(profKeywordsDE, profKeywordsTR)}</div>
                </div>` : ''}
              </div>
            `;
          }
        }
        if (elSimCrisisBanner) elSimCrisisBanner.style.display = 'none';
        if (elSimCrisisSolutionCard) elSimCrisisSolutionCard.style.display = 'none';
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

    // Step 1: Populate Inline Answer & Reset Toggle
    if (elStep1InlineAnswerBox) {
      elStep1InlineAnswerBox.style.display = 'none';
    }
    if (elBtnToggleStep1Answer) {
      elBtnToggleStep1Answer.innerHTML = '<span>💡</span> Musterantwort anzeigen / Cevabı Gör';
    }
    if (elStep1InlineAnswerText) {
      elStep1InlineAnswerText.innerHTML = renderStep1InlineAnswer(parsedCase, currentQ);
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
    if (elDiagNotes) elDiagNotes.innerHTML = renderDualLanguageText(v.notes, v.notes_tr);

    // Step 2: Populate Inline Answer & Reset Toggle
    if (elStep2InlineAnswerBox) {
      elStep2InlineAnswerBox.style.display = 'none';
    }
    if (elBtnToggleStep2Answer) {
      elBtnToggleStep2Answer.innerHTML = '<span>💡</span> Befund-Auswertung & Sofortmaßnahmen anzeigen / Bulguları & Tedaviyi Gör';
    }
    if (elStep2InlineAnswerText) {
      elStep2InlineAnswerText.innerHTML = renderStep2InlineAnswer(parsedCase);
    }

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
        elExaminerBadgeTitle.textContent = `ÄKNO Düsseldorf: Prüfer-Profil (${shortName}) / Jüri Profili`;
      }
      renderExaminerCardContent(examinerProfile, currentQ);
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
          const trBullets = parsedCase.fullTextTR.split(/(?:^[0-9]+\.\s*|[•\n–-])/m).map(s => s.trim()).filter(s => s.length > 12);
          itemTR = trBullets[idx] || (trBullets.length > 0 ? trBullets[idx % trBullets.length] : parsedCase.fullTextTR.substring(0, 140));
        }

        const row = document.createElement('div');
        row.className = 'checklist-item-row translatable-box';
        if (itemTR) row.setAttribute('data-tr', itemTR);
        row.title = 'Antippen zum Abhaken / Çeviri için dokunun';
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
      const cloudState = (typeof StorageSync !== 'undefined' && typeof StorageSync.fetchFromCloud === 'function')
        ? await StorageSync.fetchFromCloud(CLOUD_SYNC_ENDPOINT)
        : null;

      if (cloudState) {
        // Field-by-field union merge: prevent overwriting newer bookmarks, notes, or answers
        if (typeof StorageSync !== 'undefined' && typeof StorageSync.mergeCloudState === 'function') {
          state = StorageSync.mergeCloudState(state, cloudState);
        } else {
          // Fallback robustAnswers & robustSm2 union merge
          const cloudAnswers = cloudState.answers || {};
          const localAnswers = state.answers || {};
          const allQIds = new Set([...Object.keys(cloudAnswers), ...Object.keys(localAnswers)]);
          const robustAnswers = {};
          allQIds.forEach(id => {
            const cAns = cloudAnswers[id];
            const lAns = localAnswers[id];
            robustAnswers[id] = (cAns && lAns) ? ((lAns.submitted || lAns.revealed) ? lAns : cAns) : (lAns || cAns);
          });
          const cloudSm2 = cloudState.sm2Cards || {};
          const localSm2 = state.sm2Cards || {};
          const allSm2Ids = new Set([...Object.keys(cloudSm2), ...Object.keys(localSm2)]);
          const robustSm2 = {};
          allSm2Ids.forEach(id => {
            const cCard = cloudSm2[id];
            const lCard = localSm2[id];
            robustSm2[id] = (cCard && lCard) ? ((new Date(lCard.lastReviewed || 0).getTime() >= new Date(cCard.lastReviewed || 0).getTime()) ? lCard : cCard) : (lCard || cCard);
          });
          state.answers = robustAnswers;
          state.sm2Cards = robustSm2;
        }

        saveStateLocalOnly();
        updateAnalytics();
        renderCurrentQuestion();
        pushToCloudDebounced();
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
      const ok = (typeof StorageSync !== 'undefined' && typeof StorageSync.pushToCloud === 'function')
        ? await StorageSync.pushToCloud(state, CLOUD_SYNC_ENDPOINT)
        : false;
      updateCloudSyncBadge(ok ? 'synced' : 'offline');
    } catch (e) {
      updateCloudSyncBadge('offline');
    }
  }

  function saveStateLocalOnly() {
    if (typeof StorageSync !== 'undefined' && typeof StorageSync.saveLocal === 'function') {
      StorageSync.saveLocal(state, STORAGE_KEY);
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {}
    }
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

  // --- Clinical Anesthesia Calculator Modal (Modularized in js/calculators.js) ---
  if (typeof ClinicalCalculators !== 'undefined' && typeof ClinicalCalculators.init === 'function') {
    ClinicalCalculators.init(closeModal);
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
    const engine = (typeof MedicalSpeechEngine !== 'undefined') ? MedicalSpeechEngine : (typeof require !== 'undefined' ? require('./js/speech_engine.js') : null);
    if (engine && typeof engine.prepareMedicalTextForSpeech === 'function') {
      return engine.prepareMedicalTextForSpeech(rawText);
    }
    return String(rawText || '');
  }

  // --- Clean German Speech Text Extractor (Filters out Turkish collapsibles & buttons) ---
  function getCleanSpeechText(elementOrText) {
    const engine = (typeof MedicalSpeechEngine !== 'undefined') ? MedicalSpeechEngine : (typeof require !== 'undefined' ? require('./js/speech_engine.js') : null);
    if (engine && typeof engine.getCleanSpeechText === 'function') {
      return engine.getCleanSpeechText(elementOrText);
    }
    return prepareMedicalTextForSpeech(elementOrText);
  }

  // --- Smart German Voice Ranking & Selection Engine ---
  let preferredGermanVoice = null;
  let availableGermanVoices = [];

  function scoreGermanVoice(v) {
    const engine = (typeof MedicalSpeechEngine !== 'undefined') ? MedicalSpeechEngine : (typeof require !== 'undefined' ? require('./js/speech_engine.js') : null);
    return engine ? engine.scoreGermanVoice(v) : 0;
  }

  function rankGermanVoices(voices) {
    const engine = (typeof MedicalSpeechEngine !== 'undefined') ? MedicalSpeechEngine : (typeof require !== 'undefined' ? require('./js/speech_engine.js') : null);
    return engine ? engine.rankGermanVoices(voices) : (voices || []);
  }

  function getVoiceQualityBadge(v) {
    const engine = (typeof MedicalSpeechEngine !== 'undefined') ? MedicalSpeechEngine : (typeof require !== 'undefined' ? require('./js/speech_engine.js') : null);
    return engine ? engine.getVoiceQualityBadge(v) : '<span class="voice-badge-system">System</span>';
  }

  function getCleanVoiceDisplayName(name) {
    const engine = (typeof MedicalSpeechEngine !== 'undefined') ? MedicalSpeechEngine : (typeof require !== 'undefined' ? require('./js/speech_engine.js') : null);
    return engine ? engine.getCleanVoiceDisplayName(name) : (name || 'Stimme');
  }

  // --- Natural Neural Stream Player (Zero-Configuration for Mac & iPhone) ---
  let naturalAudioPlayer = null;
  let naturalAudioQueue = [];
  let currentChunkIndex = 0;
  let isSpeakingMedical = false;
  let activeMedicalTriggerBtn = null;
  let onSpeechCompleteCallback = null;
  let _speakSessionId = 0;
  let isFallbackSpeaking = false;
  let activeFallbackSession = 0;

  function initNaturalAudioPlayer() {
    // No-op: each chunk now gets its own fresh Audio() instance in playCurrentAudioChunk().
    // Kept for backwards compatibility in case it's referenced elsewhere.
  }

  function chunkTextForTTS(text, maxLen = 160) {
    const engine = (typeof MedicalSpeechEngine !== 'undefined') ? MedicalSpeechEngine : (typeof require !== 'undefined' ? require('./js/speech_engine.js') : null);
    if (engine && typeof engine.chunkTextForTTS === 'function') {
      return engine.chunkTextForTTS(text, maxLen);
    }
    return [text];
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

    // Completely silence previous player before creating a fresh one
    if (naturalAudioPlayer) {
      try {
        naturalAudioPlayer.onended = null;
        naturalAudioPlayer.onerror = null;
        naturalAudioPlayer.pause();
      } catch (e) {}
      naturalAudioPlayer = null;
    }

    // Atomic fallback guard: ensure fallbackToWebSpeech is triggered AT MOST ONCE per chunk
    let fallbackTriggered = false;
    function triggerFallback() {
      if (fallbackTriggered) return;
      fallbackTriggered = true;
      if (!isSpeakingMedical || _speakSessionId !== capturedSession || currentChunkIndex !== capturedIndex) return;
      if (naturalAudioPlayer) {
        try {
          naturalAudioPlayer.onended = null;
          naturalAudioPlayer.onerror = null;
          naturalAudioPlayer.pause();
        } catch (e) {}
        naturalAudioPlayer = null;
      }
      fallbackToWebSpeech();
    }

    naturalAudioPlayer = new Audio();
    try {
      naturalAudioPlayer.referrerPolicy = 'no-referrer';
    } catch (e) {}

    naturalAudioPlayer.onended = () => {
      if (!isSpeakingMedical || _speakSessionId !== capturedSession || currentChunkIndex !== capturedIndex) {
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
      triggerFallback();
    };

    const encoded = encodeURIComponent(chunkText.trim());
    naturalAudioPlayer.src = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=de&client=tw-ob`;
    naturalAudioPlayer.playbackRate = state.speechRate || 0.95;

    const playPromise = naturalAudioPlayer.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        triggerFallback();
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
    isFallbackSpeaking = false;

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
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    document.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'));
    activeMedicalTriggerBtn = null;
    naturalAudioQueue = [];
    currentChunkIndex = 0;

    // Reset Stop Button and Vorlesen text
    const elBtnAudioStop = document.getElementById('btn-audio-stop');
    if (elBtnAudioStop) {
      elBtnAudioStop.style.display = 'none';
    }
    const elAudioSpeakText = document.getElementById('audio-speak-text');
    if (elAudioSpeakText) {
      elAudioSpeakText.textContent = 'Vorlesen';
    }

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

    // STRICT MUTEX: If a fallback loop is ALREADY active for this session, never start another one!
    if (isFallbackSpeaking && activeFallbackSession === _speakSessionId) {
      return;
    }
    isFallbackSpeaking = true;
    activeFallbackSession = _speakSessionId;
    const capturedSession = _speakSessionId;

    try {
      window.speechSynthesis.cancel();
    } catch (e) {}

    const textToSpeak = remainingText || (naturalAudioQueue.slice(currentChunkIndex).join(' '));
    if (!textToSpeak || !textToSpeak.trim()) {
      stopMedicalSpeech();
      return;
    }

    const rawChunks = textToSpeak.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9])/g).filter(s => s.trim().length > 0);
    const chunks = rawChunks.length ? rawChunks : [textToSpeak];
    let chunkIdx = 0;

    function speakNextFallbackChunk() {
      if (!isSpeakingMedical || _speakSessionId !== capturedSession || chunkIdx >= chunks.length) {
        if (_speakSessionId === capturedSession) {
          stopMedicalSpeech();
        }
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
        if (isSpeakingMedical && _speakSessionId === capturedSession) {
          setTimeout(speakNextFallbackChunk, 40);
        }
      };

      utterance.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        if (isSpeakingMedical && _speakSessionId === capturedSession) {
          speakNextFallbackChunk();
        }
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

    // Show dedicated stop button whenever speech begins
    const elBtnAudioStop = document.getElementById('btn-audio-stop');
    if (elBtnAudioStop) {
      elBtnAudioStop.style.display = 'inline-flex';
    }
    const elAudioSpeakText = document.getElementById('audio-speak-text');
    if (elAudioSpeakText && triggerBtn && triggerBtn.id === 'btn-audio-speak') {
      elAudioSpeakText.textContent = 'Stoppen';
    }

    const isOnline = (typeof navigator !== 'undefined' && navigator.onLine !== false);

    if (isOnline) {
      naturalAudioQueue = chunkTextForTTS(cleanText, 160);
      currentChunkIndex = 0;
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

  // --- Audio Pronunciation Interrupter / Stop Button ---
  const elBtnAudioStop = document.getElementById('btn-audio-stop');
  if (elBtnAudioStop) {
    elBtnAudioStop.addEventListener('click', (e) => {
      e.stopPropagation();
      stopMedicalSpeech();
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

  // --- Inline Step 1 Answer Toggle ---
  if (elBtnToggleStep1Answer) {
    elBtnToggleStep1Answer.addEventListener('click', () => {
      if (!elStep1InlineAnswerBox) return;
      const isVisible = (elStep1InlineAnswerBox.style.display !== 'none');
      elStep1InlineAnswerBox.style.display = isVisible ? 'none' : 'block';
      elBtnToggleStep1Answer.innerHTML = isVisible
        ? '<span>💡</span> Musterantwort anzeigen / Cevabı Gör'
        : '<span>💡</span> Musterantwort verbergen / Cevabı Gizle';
    });
  }

  // --- Audio Pronunciation: Step 1 Model Answer ---
  const speakStep1 = () => {
    filteredQuestions = getFilteredQuestions();
    const currentQ = filteredQuestions[state.currentIndex];
    if (!currentQ) return;
    const parsedCase = parseOralExamCase(currentQ);
    const textToSpeak = parsedCase.fullTextDE || parsedCase.verbalFramework;
    if (textToSpeak) {
      speakMedicalText(textToSpeak, elBtnAudioSpeakStep1Ans);
    }
  };
  if (elBtnAudioSpeakStep1Ans) elBtnAudioSpeakStep1Ans.addEventListener('click', speakStep1);
  if (elBtnAudioSpeakStep1Box) elBtnAudioSpeakStep1Box.addEventListener('click', speakStep1);

  // --- Inline Step 2 Answer Toggle ---
  if (elBtnToggleStep2Answer) {
    elBtnToggleStep2Answer.addEventListener('click', () => {
      if (!elStep2InlineAnswerBox) return;
      toggleStep2(true);
      const isVisible = (elStep2InlineAnswerBox.style.display !== 'none');
      elStep2InlineAnswerBox.style.display = isVisible ? 'none' : 'block';
      elBtnToggleStep2Answer.innerHTML = isVisible
        ? '<span>💡</span> Befund-Auswertung & Sofortmaßnahmen anzeigen / Bulguları & Tedaviyi Gör'
        : '<span>💡</span> Befund-Auswertung verbergen / Analizi Gizle';
    });
  }

  // --- Audio Pronunciation: Step 2 Findings & Measures ---
  const speakStep2 = () => {
    filteredQuestions = getFilteredQuestions();
    const currentQ = filteredQuestions[state.currentIndex];
    if (!currentQ) return;
    const parsedCase = parseOralExamCase(currentQ);
    if (parsedCase && parsedCase.vitalsInterpretationDE) {
      speakMedicalText(parsedCase.vitalsInterpretationDE, elBtnAudioSpeakStep2Ans);
    }
  };
  if (elBtnAudioSpeakStep2Ans) elBtnAudioSpeakStep2Ans.addEventListener('click', speakStep2);
  if (elBtnAudioSpeakStep2Box) elBtnAudioSpeakStep2Box.addEventListener('click', speakStep2);

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
    const mockExaminer = getExaminerProfileForCase(activeQ);

    elMockExamBodyContent.innerHTML = `
      <div class="mock-case-view" style="background: var(--bg-secondary); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span style="font-weight: 700; font-size: 0.85rem; color: var(--accent-color); text-transform: uppercase;">
            Fall ${mockExamEngine.currentCaseIndex + 1} von 4 &bull; ${parsed.clinicalContext}
          </span>
          <span style="font-size: 0.8rem; color: var(--text-muted);">${activeQ.category}</span>
        </div>

        ${mockExaminer ? `
        <div class="mock-examiner-profile-card">
          <div style="font-weight: 700; color: var(--primary); margin-bottom: 0.2rem;">🏛️ ÄKNO Düsseldorf Prüfer / Jüri: ${mockExaminer.name}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.4rem;">📍 ${mockExaminer.hospital}</div>
          <div style="font-size: 0.85rem; line-height: 1.4; margin-bottom: 0.25rem;"><strong>🎯 Schwerpunkt / Odak:</strong> ${renderDualLanguageText(mockExaminer.focus, mockExaminer.focus_tr)}</div>
          <div style="font-size: 0.85rem; line-height: 1.4; color: var(--danger);"><strong>⚠️ Prüfungsfalle / Sınav Tuzağı:</strong> ${renderDualLanguageText(mockExaminer.trap, mockExaminer.trap_tr)}</div>
        </div>
        ` : ''}

        <div style="margin-bottom: 1rem; font-size: 1.1rem; line-height: 1.5;">${renderDualLanguageText(parsed.stem, activeQ.stem_tr || activeQ.question_tr)}</div>

        <div style="background: var(--bg-tertiary); padding: 0.85rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.88rem; border: 1px solid var(--border-color);">
          <strong style="display: block; margin-bottom: 0.25rem;">📊 Vitalparameter & Befunde:</strong>
          <div style="color: var(--text-main); margin-bottom: 0.5rem; line-height: 1.4;">${renderDualLanguageText(parsed.vitals.notes, parsed.vitals.notes_tr)}</div>
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

        <div style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; padding: 0.75rem; border-radius: 4px; margin-bottom: 0.85rem; font-size: 0.88rem;">
          <strong>💡 Musterantwort zur Prüfer-Intervention:</strong><br>
          <div style="margin-top: 0.35rem; line-height: 1.5; white-space: pre-line;">${renderDualLanguageText(highlightDosagesAndUnits(parsed.examinerAnswer), highlightDosagesAndUnits(parsed.examinerAnswerTR))}</div>
        </div>

        <!-- Comprehensive Dual-Language Case Model Answer & Verbal Framework -->
        <details class="mock-case-full-solution" style="margin-bottom: 1.25rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.85rem;">
          <summary style="font-weight: 700; cursor: pointer; color: var(--primary);">📖 Vollständige Fall-Musterantwort, Redemittel & Checkliste / Vaka Model Çözümü & İfadeler</summary>
          <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
            <div style="margin-bottom: 0.75rem;">
              <strong style="display: block; margin-bottom: 0.25rem; color: var(--accent-color);">🗣️ Formulierungshilfe & Redemittel (Wie sage ich es?):</strong>
              <div>${renderDualLanguageText(parsed.verbalFramework, parsed.verbalFrameworkTR)}</div>
            </div>
            <div style="margin-bottom: 0.75rem;">
              <strong style="display: block; margin-bottom: 0.25rem; color: var(--primary);">🎯 Vollständige Leitlinien-Musterantwort / Kılavuz Çözümü:</strong>
              <div style="line-height: 1.5;">${renderDualLanguageText(highlightDosagesAndUnits(parsed.fullTextDE), highlightDosagesAndUnits(parsed.fullTextTR))}</div>
            </div>
            <div style="margin-bottom: 0.5rem;">
              <strong style="display: block; margin-bottom: 0.25rem; color: var(--danger);">⚠️ Kritische Prüfungsfalle (K.O.-Kriterium):</strong>
              <div>${renderDualLanguageText(parsed.pitfalls, parsed.pitfallsTR)}</div>
            </div>
          </div>
        </details>

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
  refreshAudioDevicesList();
});


