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
    const isAuthed = localStorage.getItem(AUTH_KEY) === 'true';
    if (isAuthed) {
      elAuthModal.style.display = 'none';
    } else {
      elAuthModal.style.display = 'flex';
      elAuthPassword.focus();
    }
  }

  elAuthForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const enteredPass = elAuthPassword.value.trim();
    if (enteredPass === CORRECT_PASS) {
      localStorage.setItem(AUTH_KEY, 'true');
      elAuthError.style.display = 'none';
      elAuthModal.style.display = 'none';
    } else {
      elAuthError.style.display = 'block';
      elAuthCardBox.classList.add('shake');
      setTimeout(() => elAuthCardBox.classList.remove('shake'), 450);
    }
  });

  elLockTrigger.addEventListener('click', () => {
    localStorage.removeItem(AUTH_KEY);
    elAuthPassword.value = '';
    elAuthError.style.display = 'none';
    checkAuthentication();
  });

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

  // --- Filtering Question Bank ---
  function getFilteredQuestions() {
    return EXAM_QUESTIONS.filter(q => {
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

  if (elTypeFilter) {
    elTypeFilter.addEventListener('change', (e) => {
      state.typeFilter = e.target.value;
      state.currentIndex = 0;
      saveState();
      renderCurrentQuestion();
    });
    elTypeFilter.value = state.typeFilter || 'all';
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
            <div class="option-key">${opt.key}.</div>
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

    elStatTotal.textContent = total;
    elStatAnswered.textContent = answeredCount;
    elStatAccuracy.textContent = `${accuracyPct}%`;
    elStatReview.textContent = reviewCount;
    elProgressBar.style.width = `${progressPct}%`;
  }

  // --- Render Direct Jump Modal Grid ---
  function openQuestionGridModal() {
    elQuestionGrid.innerHTML = '';
    
    EXAM_QUESTIONS.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.className = 'q-grid-btn';
      btn.textContent = idx + 1;

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

      elQuestionGrid.appendChild(btn);
    });

    elJumpModal.classList.add('active');
  }

  function closeModal(modalEl) {
    modalEl.classList.remove('active');
  }

  // --- LocalStorage & Device Synchronization Engine ---
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }
  }

  function loadState() {
    try {
      // Try loading v2 state first, then fall back to v1
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
    state.randomOrder = (e.target.value === 'random');
    if (state.randomOrder) {
      filteredQuestions.sort(() => Math.random() - 0.5);
    }
    state.currentIndex = 0;
    saveState();
    renderCurrentQuestion();
  });

  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    if (elAuthModal.style.display !== 'none' || elJumpModal.classList.contains('active') || elSettingsModal.classList.contains('active')) return;
    
    if (e.key === 'ArrowRight') {
      elBtnNext.click();
    } else if (e.key === 'ArrowLeft') {
      elBtnPrev.click();
    } else if (e.key === ' ') {
      e.preventDefault();
      // For open questions: reveal answer on space
      const currentQ = filteredQuestions[state.currentIndex];
      if (currentQ && isOpenQuestion(currentQ)) {
        const qState = state.answers[currentQ.id] || {};
        if (!qState.revealed && !qState.submitted) {
          revealAnswer();
        }
      } else {
        elBtnCheck.click();
      }
    } else if (e.key.toLowerCase() === 'r') {
      elBtnReview.click();
    } else if (e.key === '1' || e.key === 'j') {
      // Quick self-assess: 1 or J = knew it
      const currentQ = filteredQuestions[state.currentIndex];
      if (currentQ && isOpenQuestion(currentQ)) {
        const qState = state.answers[currentQ.id] || {};
        if (qState.revealed && !qState.submitted) {
          selfAssess(true);
        }
      }
    } else if (e.key === '2' || e.key === 'n') {
      // Quick self-assess: 2 or N = didn't know
      const currentQ = filteredQuestions[state.currentIndex];
      if (currentQ && isOpenQuestion(currentQ)) {
        const qState = state.answers[currentQ.id] || {};
        if (qState.revealed && !qState.submitted) {
          selfAssess(false);
        }
      }
    }
  });

  // Initializing App
  initCategoryDropdown();
  renderCurrentQuestion();
});
