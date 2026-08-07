/**
 * FACHARZTPRÜFUNG ANÄSTHESIOLOGIE - APPLICATION LOGIC & SMART PRACTICE ENGINE
 * Supports: Open Q&A Flashcards (self-assessment) + Multi-Choice Questions
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check dataset availability
  if (typeof EXAM_QUESTIONS === 'undefined' || !EXAM_QUESTIONS.length) {
    console.error('EXAM_QUESTIONS data not loaded!');
    return;
  }

  // --- Storage Keys ---
  const STORAGE_KEY = 'facharzt_anaesthesie_state_v2';
  const AUTH_KEY = 'facharzt_auth_v1';
  const CORRECT_PASS = 'egemelis';

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
    randomOrder: false
  };

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
  
  const elStatTotal = document.getElementById('stat-total');
  const elStatAnswered = document.getElementById('stat-answered');
  const elStatAccuracy = document.getElementById('stat-accuracy');
  const elStatReview = document.getElementById('stat-review');
  const elProgressBar = document.getElementById('progress-bar-fill');
  
  const elTypeFilter = document.getElementById('type-filter');
  const elCategoryFilter = document.getElementById('category-filter');
  const elFilterChips = document.querySelectorAll('.filter-chip');
  const elModeSelect = document.getElementById('mode-select');
  
  const elBadgeType = document.getElementById('badge-type');
  const elBadgeCategory = document.getElementById('badge-category');
  const elBadgeSource = document.getElementById('badge-source');
  const elBadgeReview = document.getElementById('badge-review');
  const elQuestionNumber = document.getElementById('question-number');
  
  const elQuestionText = document.getElementById('question-text');
  const elOptionsContainer = document.getElementById('options-container');
  const elExplanationCard = document.getElementById('explanation-card');
  const elExplanationText = document.getElementById('explanation-text');

  // New flashcard elements
  const elQuestionImageContainer = document.getElementById('question-image-container');
  const elQuestionImage = document.getElementById('question-image');
  const elRevealContainer = document.getElementById('reveal-container');
  const elBtnReveal = document.getElementById('btn-reveal');
  const elAnswerCard = document.getElementById('answer-card');
  const elAnswerText = document.getElementById('answer-text');
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
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
    const isAuthed = localStorage.getItem(AUTH_KEY) === 'true' || isLocalhost;
    if (isAuthed) {
      if (elAuthModal) elAuthModal.style.display = 'none';
    } else {
      if (elAuthModal) elAuthModal.style.display = 'flex';
      if (elAuthPassword) elAuthPassword.focus();
    }
  }

  function handleAuthSubmit() {
    if (!elAuthPassword) return;
    const enteredPass = elAuthPassword.value.trim().toLowerCase();
    if (enteredPass === 'egemelis' || enteredPass === 'ege' || enteredPass === 'melis' || enteredPass === CORRECT_PASS) {
      localStorage.setItem(AUTH_KEY, 'true');
      if (elAuthError) elAuthError.style.display = 'none';
      if (elAuthModal) elAuthModal.style.display = 'none';
    } else {
      if (elAuthError) elAuthError.style.display = 'block';
      if (elAuthCardBox) {
        elAuthCardBox.classList.add('shake');
        setTimeout(() => elAuthCardBox.classList.remove('shake'), 450);
      }
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

  // Load state from LocalStorage
  loadState();
  checkAuthentication();

  // Active question pool based on filters
  let filteredQuestions = getFilteredQuestions();

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
      return `<div class="de-text-block">${formattedDE}</div><div class="tr-subtitle-block">🇹🇷 ${formattedTR}</div>`;
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

  // --- Exam Simulation State ---
  let examSimulation = {
    active: false,
    timerInterval: null,
    secondsLeft: 2700, // 45 minutes
    questions: []
  };

  // --- Keyboard Shortcuts Engine ---
  document.addEventListener('keydown', (e) => {
    // Ignore keypresses if user is typing in password input or modal
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }
    if (elAuthModal && elAuthModal.style.display !== 'none') {
      return;
    }

    const key = e.key.toLowerCase();
    
    // Space or Enter: Check answer or Reveal answer
    if (e.code === 'Space' || key === 'enter') {
      e.preventDefault();
      filteredQuestions = getFilteredQuestions();
      if (!filteredQuestions.length) return;
      const currentQ = filteredQuestions[state.currentIndex];
      const isOpen = isOpenQuestion(currentQ);
      if (isOpen) {
        const qAns = state.answers[currentQ.id] || {};
        if (!qAns.revealed) {
          revealAnswer();
        }
      } else {
        evaluateOptionAnswers();
      }
    }
    // 1 or R: Knew it or toggle Richtig
    else if (key === '1' || key === 'r') {
      filteredQuestions = getFilteredQuestions();
      if (!filteredQuestions.length) return;
      const currentQ = filteredQuestions[state.currentIndex];
      if (isOpenQuestion(currentQ)) {
        selfAssessAnswer(true);
      }
    }
    // 2 or F: Didn't know or toggle Falsch
    else if (key === '2' || key === 'f') {
      filteredQuestions = getFilteredQuestions();
      if (!filteredQuestions.length) return;
      const currentQ = filteredQuestions[state.currentIndex];
      if (isOpenQuestion(currentQ)) {
        selfAssessAnswer(false);
      }
    }
    // Right Arrow or D: Next Question
    else if (e.code === 'ArrowRight' || key === 'd') {
      e.preventDefault();
      filteredQuestions = getFilteredQuestions();
      if (state.currentIndex < filteredQuestions.length - 1) {
        state.currentIndex++;
        saveState();
        renderCurrentQuestion();
      }
    }
    // Left Arrow or A: Prev Question
    else if (e.code === 'ArrowLeft' || key === 'a') {
      e.preventDefault();
      if (state.currentIndex > 0) {
        state.currentIndex--;
        saveState();
        renderCurrentQuestion();
      }
    }
    // M or S: Flag for review
    else if (key === 'm' || key === 's') {
      toggleFlagForReview();
    }
  });

  // --- Medical Keyword Highlighting Engine ---
  function highlightMedicalKeywords(text) {
    if (!text) return '';
    // Pattern matching drug dosages, physiological units, and key medical abbreviations
    return text.replace(
      /\b(\d+(?:[\.,]\d+)?\s*(?:mg\/kg(?:KG)?|µg\/kg|µg\/ml|mg|g\/dl|ml\/kg|mosm\/l|mmHg|kPa|Hz|min|E\/h|E\/min|Vol\.-%|%))\b|\b(SpO2|PaO2|PaCO2|MAP|HZV|ICP|CPP|ROTEM|TEG|TOF|PTC|DBS|RSI|ARDS|ZNS|MSS|ZAS|MH|HIT|TUR|PDA|PDK|TEP|ACE|SCh|LA|FFP|TRALI|SIADH|ACTH)\b/gi,
      '<span class="kw-highlight">$1$2</span>'
    );
  }

  // --- Exam Simulation Engine ---
  const elExamSimulationBar = document.getElementById('exam-simulation-bar');
  const elExamTimer = document.getElementById('exam-timer');
  const elBtnStopExam = document.getElementById('btn-stop-exam');

  function startExamSimulation() {
    examSimulation.active = true;
    examSimulation.secondsLeft = 2700; // 45 minutes
    // Pick 10 random questions
    const shuffled = [...EXAM_QUESTIONS].sort(() => 0.5 - Math.random());
    examSimulation.questions = shuffled.slice(0, 10);
    
    if (elExamSimulationBar) elExamSimulationBar.style.display = 'flex';
    updateExamTimerDisplay();
    
    if (examSimulation.timerInterval) clearInterval(examSimulation.timerInterval);
    examSimulation.timerInterval = setInterval(() => {
      examSimulation.secondsLeft--;
      updateExamTimerDisplay();
      if (examSimulation.secondsLeft <= 0) {
        stopExamSimulation(true);
      }
    }, 1000);
  }

  function updateExamTimerDisplay() {
    if (!elExamTimer) return;
    const mins = Math.floor(examSimulation.secondsLeft / 60);
    const secs = examSimulation.secondsLeft % 60;
    elExamTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function stopExamSimulation(isTimeOut = false) {
    examSimulation.active = false;
    if (examSimulation.timerInterval) clearInterval(examSimulation.timerInterval);
    if (elExamSimulationBar) elExamSimulationBar.style.display = 'none';
    if (isTimeOut) {
      alert('⏱️ Die 45-minütige NRW Prüfungssimulation ist abgelaufen! Ihre Antworten wurden ausgewertet.');
    }
  }

  if (elBtnStopExam) {
    elBtnStopExam.addEventListener('click', () => {
      stopExamSimulation(false);
      state.modeSelect = 'sequential';
      if (elModeSelect) elModeSelect.value = 'sequential';
      renderCurrentQuestion();
    });
  }

  if (elTypeFilter) {
    elTypeFilter.addEventListener('change', (e) => {
      state.typeFilter = e.target.value;
      state.currentIndex = 0;
      saveState();
      renderCurrentQuestion();
    });
    elTypeFilter.value = state.typeFilter || 'all';
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
        } else if (q.question_type !== state.typeFilter) {
          return false;
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
      if (state.filterMode === 'weakness') {
        const qAns = state.answers[q.id];
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
    const categories = Array.from(new Set(EXAM_QUESTIONS.map(q => q.category)));
    elCategoryFilter.innerHTML = `<option value="all">Alle Kategorien (${EXAM_QUESTIONS.length})</option>`;
    categories.forEach(cat => {
      const count = EXAM_QUESTIONS.filter(q => q.category === cat).length;
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = `${cat} (${count})`;
      elCategoryFilter.appendChild(opt);
    });
    elCategoryFilter.value = state.categoryFilter;
  }

  // --- Determine question type ---
  function isOpenQuestion(q) {
    return q.question_type === 'open' || !q.options || q.options.length === 0;
  }

  // --- Render Question Card ---
  function renderCurrentQuestion() {
    filteredQuestions = getFilteredQuestions();

    if (!filteredQuestions.length) {
      elQuestionText.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-muted);">
        <h3>Keine Fragen in dieser Filterauswahl gefunden.</h3>
        <p style="margin-top: 0.5rem;">Bitte wählen Sie einen anderen Filter oder eine andere Kategorie.</p>
      </div>`;
      elOptionsContainer.innerHTML = '';
      elExplanationCard.classList.remove('visible');
      elAnswerCard.classList.remove('visible');
      elRevealContainer.style.display = 'none';
      elSelfAssessContainer.style.display = 'none';
      elQuestionImageContainer.style.display = 'none';
      elQuestionNumber.textContent = `0 von 0`;
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

    // Header badges
    const elBadgeHy = document.getElementById('badge-hy');
    if (elBadgeHy) {
      elBadgeHy.style.display = currentQ.is_high_yield ? 'inline-block' : 'none';
    }

    if (elBadgeType) {
      if (currentQ.image) {
        elBadgeType.textContent = '🖼️ Befunddiagnostik';
      } else if (currentQ.question_type === 'options') {
        elBadgeType.textContent = '✅ Aussagenbewertung';
      } else {
        elBadgeType.textContent = '📋 Fallbasierte Prüfung';
      }
    }
    elBadgeCategory.textContent = currentQ.category;
    elBadgeSource.textContent = currentQ.source_book ? currentQ.source_book.split(' - ')[0] : 'Facharzt';
    
    if (isFlagged) {
      elBadgeReview.style.display = 'inline-block';
      elBtnReview.classList.add('flagged');
      elBtnReview.innerHTML = `<span>★</span> Markiert`;
    } else {
      elBadgeReview.style.display = 'none';
      elBtnReview.classList.remove('flagged');
      elBtnReview.innerHTML = `<span>☆</span> Wiederholen`;
    }

    const globalIdx = EXAM_QUESTIONS.findIndex(q => q.id === currentQ.id) + 1;
    elQuestionNumber.textContent = `Frage ${globalIdx} von ${EXAM_QUESTIONS.length} (${state.currentIndex + 1}/${filteredQuestions.length})`;

    // Question text stem with translation
    const stemDe = currentQ.stem_de || currentQ.question_de || '';
    const stemTr = currentQ.stem_tr || currentQ.question_tr || '';
    elQuestionText.innerHTML = renderDualLanguageText(stemDe, stemTr);

    // Personal Medical Note
    const elUserNoteText = document.getElementById('user-note-text');
    if (elUserNoteText) {
      elUserNoteText.value = (state.userNotes && state.userNotes[currentQ.id]) ? state.userNotes[currentQ.id] : '';
    }

    // Question image
    if (currentQ.image) {
      elQuestionImageContainer.style.display = 'block';
      elQuestionImage.src = currentQ.image;
      elQuestionImage.alt = `Abbildung zu: ${stemDe.substring(0, 60)}...`;
    } else {
      elQuestionImageContainer.style.display = 'none';
    }

    // ──────────── OPEN Q&A FLASHCARD MODE (Clinical Cases) ────────────
    if (isOpen) {
      const elExaminerFormulaCard = document.getElementById('examiner-formula-card');
      if (elExaminerFormulaCard) elExaminerFormulaCard.style.display = 'block';

      elOptionsContainer.innerHTML = '';
      elOptionsContainer.style.display = 'none';
      elBtnCheck.style.display = 'none';
      elExplanationCard.classList.remove('visible');

      if (qState.submitted) {
        elRevealContainer.style.display = 'none';
        elAnswerCard.classList.add('visible');
        elAnswerText.innerHTML = renderDualLanguageText(
          currentQ.answer_de || currentQ.explanation_de || '',
          currentQ.answer_tr || currentQ.explanation_tr || ''
        );
        
        elSelfAssessContainer.style.display = 'flex';
        if (qState.isCorrect) {
          elBtnKnewIt.classList.add('selected');
          elBtnDidntKnow.classList.remove('selected');
        } else {
          elBtnKnewIt.classList.remove('selected');
          elBtnDidntKnow.classList.add('selected');
        }
      } else if (qState.revealed) {
        elRevealContainer.style.display = 'none';
        elAnswerCard.classList.add('visible');
        elAnswerText.innerHTML = renderDualLanguageText(
          currentQ.answer_de || currentQ.explanation_de || '',
          currentQ.answer_tr || currentQ.explanation_tr || ''
        );
        elSelfAssessContainer.style.display = 'flex';
        elBtnKnewIt.classList.remove('selected');
        elBtnDidntKnow.classList.remove('selected');
      } else {
        elRevealContainer.style.display = 'flex';
        elAnswerCard.classList.remove('visible');
        elSelfAssessContainer.style.display = 'none';
      }

    // ──────────── INTERACTIVE MULTI-STATEMENT OPTIONS MODE ────────────
    } else {
      const elExaminerFormulaCard = document.getElementById('examiner-formula-card');
      if (elExaminerFormulaCard) elExaminerFormulaCard.style.display = 'none';

      elOptionsContainer.style.display = 'block';
      elRevealContainer.style.display = 'none';
      elAnswerCard.classList.remove('visible');
      elSelfAssessContainer.style.display = 'none';

      elOptionsContainer.innerHTML = '';

      currentQ.options.forEach(opt => {
        const userChoice = qState.userChoices[opt.key]; // true (Richtig), false (Falsch), or undefined
        
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

      // Submit / Reset Button for Options Mode
      elBtnCheck.style.display = 'inline-flex';
      if (qState.submitted) {
        elBtnCheck.innerHTML = `<span>🔄</span> Erneut versuchen`;
        elBtnCheck.className = 'btn btn-secondary';
      } else {
        elBtnCheck.innerHTML = `<span>✅</span> Antworten Auswerten`;
        elBtnCheck.className = 'btn btn-primary';
      }

      // Show overall score card if submitted
      if (qState.submitted) {
        let correctCount = 0;
        currentQ.options.forEach(opt => {
          if (qState.userChoices[opt.key] === opt.is_correct) {
            correctCount++;
          }
        });
        const totalOpts = currentQ.options.length;
        const pct = Math.round((correctCount / totalOpts) * 100);

        elExplanationCard.classList.add('visible');
        elExplanationText.innerHTML = `
          <div class="score-summary-banner ${pct >= 80 ? 'pass' : 'fail'}">
            <h4>Ergebnis: ${correctCount} von ${totalOpts} Aussagen richtig bewertet (${pct}%)</h4>
            <p>${pct >= 80 ? '🎉 Sehr gut gewusst!' : '💡 Wiederholung empfohlen.'}</p>
          </div>
        `;
      } else {
        elExplanationCard.classList.remove('visible');
      }
    }

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
  function selfAssess(knewIt) {
    filteredQuestions = getFilteredQuestions();
    if (!filteredQuestions.length) return;

    const currentQ = filteredQuestions[state.currentIndex];
    let qState = state.answers[currentQ.id] || { userChoices: {}, submitted: false, revealed: false };

    qState.submitted = true;
    qState.isCorrect = knewIt;
    state.answers[currentQ.id] = qState;
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
  const CLOUD_SYNC_ENDPOINT = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fdab2880b07e2';
  const elCloudSyncStatus = document.getElementById('cloud-sync-status');
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
      const response = await fetch(CLOUD_SYNC_ENDPOINT);
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
      console.log('Cloud sync fallback to local:', e);
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

      const res = await fetch(CLOUD_SYNC_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        updateCloudSyncBadge('synced');
      } else {
        updateCloudSyncBadge('offline');
      }
    } catch (e) {
      console.log('Cloud push error:', e);
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
      state.answers = {};
      state.flagged = {};
      state.currentIndex = 0;
      saveState();
      renderCurrentQuestion();
      alert('✓ Lernfortschritt zurückgesetzt.');
      closeModal(elSettingsModal);
    }
  });

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

  elThemeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    saveState();
  });

  elSubToggle.addEventListener('click', () => {
    state.subtitleMode = !state.subtitleMode;
    elSubToggle.classList.toggle('active', state.subtitleMode);
    saveState();
    renderCurrentQuestion();
  });

  // Jump & Settings Modals
  elGridTrigger.addEventListener('click', openQuestionGridModal);
  elJumpModalClose.addEventListener('click', () => closeModal(elJumpModal));
  elJumpModal.addEventListener('click', (e) => {
    if (e.target === elJumpModal) closeModal(elJumpModal);
  });

  elSettingsTrigger.addEventListener('click', () => elSettingsModal.classList.add('active'));
  elSettingsModalClose.addEventListener('click', () => closeModal(elSettingsModal));
  elSettingsModal.addEventListener('click', (e) => {
    if (e.target === elSettingsModal) closeModal(elSettingsModal);
  });

  // Filter Chips
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

  // Category Filter Dropdown
  elCategoryFilter.addEventListener('change', (e) => {
    state.categoryFilter = e.target.value;
    state.currentIndex = 0;
    saveState();
    renderCurrentQuestion();
  });

  // Practice Mode Dropdown
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

  // Initializing App
  initCategoryDropdown();
  updateAnalytics();
  renderCurrentQuestion();
});
