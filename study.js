/**
 * Facharzt Anästhesie — Interaktive Mündliche Prüfungs-Lesemappe (study.js)
 * High-Performance Oral Exam Reader with Sentence-Level Hover/Tap Translations
 * Tailored for iPhone (iOS Safari) & Desktop
 * Self-Contained: Works both inside index.html and study.html
 */

(function () {
  'use strict';

  // --- State Management ---
  const STORAGE_KEY_PROGRESS = 'facharzt_melis_read_status_v1';
  const STORAGE_KEY_SETTINGS = 'facharzt_melis_study_settings_v1';
  const AUTH_KEY = 'facharzt_auth_logged_in';

  // Check auth
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
  if (localStorage.getItem(AUTH_KEY) !== 'true' && !isLocal && !document.getElementById('auth-modal')) {
    const entered = prompt('Giriş Şifresi (Standard-Passwort):', '');
    if (entered && (entered.trim().toLowerCase() === 'egemelis' || entered.trim() === '1234')) {
      localStorage.setItem(AUTH_KEY, 'true');
    } else {
      alert('Şifre hatalı veya giriş yapılmadı.');
      window.location.href = 'index.html';
      return;
    }
  }

  const savedSettings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS) || '{}');
  const readStatus = JSON.parse(localStorage.getItem(STORAGE_KEY_PROGRESS) || '{}');

  const state = {
    theme: (savedSettings.theme && savedSettings.theme !== 'light') ? savedSettings.theme : 'sepia', // Default to warm sepia, or user's explicit preference
    fontSize: savedSettings.fontSize || 17, // 15, 17, 19, 21
    viewMode: savedSettings.viewMode || 'hover', // 'hover', 'bilingual', 'german'
    activeRecallMode: !!savedSettings.activeRecallMode, // true = start with Vitals & First-3-Actions prompt hidden answer
    revealedCards: {}, // per-card reveal state when activeRecallMode is true
    activeCategory: 'all',
    activeType: 'all', // 'all', 'dus', 'open', 'options'
    activeStatusFilter: 'all', // 'all', 'unread', 'read'
    searchQuery: '',
    visibleCount: 25,
    pageSize: 25
  };

  // --- Dynamic DOM Injection for Tooltips & Modal if missing ---
  function ensureTooltipsAndModals() {
    if (!document.getElementById('desktop-trans-tooltip')) {
      const tt = document.createElement('div');
      tt.id = 'desktop-trans-tooltip';
      tt.setAttribute('role', 'tooltip');
      tt.setAttribute('aria-hidden', 'true');
      tt.innerHTML = `<div class="tooltip-tag">🇹🇷 Türkçe Çeviri</div><div id="tooltip-turkish-text"></div>`;
      document.body.appendChild(tt);
    }

    if (!document.getElementById('mobile-trans-sheet')) {
      const sheet = document.createElement('aside');
      sheet.id = 'mobile-trans-sheet';
      sheet.setAttribute('aria-label', 'Türkçe Çeviri Paneli');
      sheet.innerHTML = `
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div class="sheet-badge">🇹🇷 Türkçe Karşılığı & Telaffuz</div>
          <button id="btn-sheet-close" class="btn-sheet-close" title="Kapat">✕</button>
        </div>
        <div id="sheet-german-text" class="sheet-german-excerpt"></div>
        <div id="sheet-turkish-text" class="sheet-turkish-text"></div>
        <div class="sheet-actions">
          <button id="btn-sheet-pronounce" class="btn-sheet-action">
            <span>🔊</span> Almanca Dinle (Aussprache)
          </button>
        </div>
      `;
      document.body.appendChild(sheet);
    }

    if (!document.getElementById('modal-notebooklm')) {
      const modal = document.createElement('div');
      modal.id = 'modal-notebooklm';
      modal.className = 'study-modal-backdrop';
      modal.innerHTML = `
        <div class="study-modal-card">
          <div class="modal-header-row">
            <h3>🎙️ Google NotebookLM Entegrasyonu</h3>
            <button id="btn-close-notebook-modal" class="btn-modal-close">✕</button>
          </div>
          <p style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.55;">
            Tüm soru ve klinik vakaları Google NotebookLM'e tek tıkla yükleyebilmeniz için hazır Markdown dosyaları olarak derledik. 
            NotebookLM'e yükleyerek <strong>iki yapay zeka uzmanı arasında geçen sesli tıbbi podcast'ler (Audio Overview)</strong> üretebilir veya kendinize <strong>sözlü sınav simülatörü</strong> kurabilirsiniz.
          </p>
          <div class="modal-download-box">
            <a href="notebooklm_export/FACHARZT_KOMPLETT_NOTEBOOKLM.md" download="FACHARZT_KOMPLETT_NOTEBOOKLM.md" class="btn-download-file">
              <div>
                <div style="font-weight: 700;">📦 1. Tüm Sözlü Sınav Arşivi Tek Dosyada (669 Vaka)</div>
                <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">FACHARZT_KOMPLETT_NOTEBOOKLM.md</div>
              </div>
              <span style="font-size: 1.2rem;">📥</span>
            </a>
            <a href="notebooklm_export/01_Klinische_Faelle_und_Protokolle_NOTEBOOKLM.md" download="01_Klinische_Faelle_und_Protokolle_NOTEBOOKLM.md" class="btn-download-file">
              <div>
                <div style="font-weight: 700;">🏥 2. Klinik Kasuistikler & ÄKNO Protokolleri (344 Vaka)</div>
                <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">01_Klinische_Faelle_und_Protokolle_NOTEBOOKLM.md</div>
              </div>
              <span style="font-size: 1.2rem;">📥</span>
            </a>
            <a href="notebooklm_export/02_MCQ_und_Faktenwissen_NOTEBOOKLM.md" download="02_MCQ_und_Faktenwissen_NOTEBOOKLM.md" class="btn-download-file">
              <div>
                <div style="font-weight: 700;">📚 3. Konu Bazlı Sözlü Sınav Soru-Cevapları (325 Soru)</div>
                <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">02_MCQ_und_Faktenwissen_NOTEBOOKLM.md</div>
              </div>
              <span style="font-size: 1.2rem;">📥</span>
            </a>
            <a href="notebooklm_export/NOTEBOOKLM_REHBERI_VE_PROMPTLAR.md" download="NOTEBOOKLM_REHBERI_VE_PROMPTLAR.md" class="btn-download-file" style="background: var(--primary-light); border-color: var(--primary);">
              <div>
                <div style="font-weight: 700; color: var(--primary);">📋 4. Adım Adım Kurulum Rehberi & Sınav Prompts</div>
                <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">Kopyala-yapıştır yapay zeka sözlü sınav komutları</div>
              </div>
              <span style="font-size: 1.2rem;">📖</span>
            </a>
          </div>
          <div style="margin-top: 16px; text-align: center;">
            <a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" class="btn-header btn-header-primary" style="display: inline-flex; width: 100%; justify-content: center; padding: 12px;">
              <span>🌐</span> Google NotebookLM'i Aç (notebooklm.google.com)
            </a>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
  }

  ensureTooltipsAndModals();

  // --- DOM Elements ---
  const elFeed = document.getElementById('study-feed');
  if (!elFeed) return;

  const elSearchInput = document.getElementById('study-search-input') || document.getElementById('search-input');
  const elBtnClearSearch = document.getElementById('study-btn-clear-search') || document.getElementById('btn-clear-search');
  const elCategoryScroll = document.getElementById('study-category-filter-scroll') || document.getElementById('category-filter-scroll');
  const elTypeFilters = document.querySelectorAll('.btn-type-filter');
  const elModeTabs = document.querySelectorAll('.btn-mode-tab');
  const elActiveRecallToggle = document.getElementById('study-btn-active-recall-toggle') || document.getElementById('btn-active-recall-toggle');
  const elThemeToggle = document.getElementById('study-btn-theme-toggle') || document.getElementById('btn-theme-toggle');
  const elFontToggle = document.getElementById('study-btn-font-toggle') || document.getElementById('btn-font-toggle');
  const elFontDec = document.getElementById('study-btn-font-dec') || document.getElementById('btn-font-dec');
  const elFontInc = document.getElementById('study-btn-font-inc') || document.getElementById('btn-font-inc');
  const elProgressBarFill = document.getElementById('study-progress-bar-fill') || document.getElementById('progress-bar-fill');
  const elProgressText = document.getElementById('study-progress-status-text') || document.getElementById('progress-status-text');
  const elProgressPercentage = document.getElementById('study-progress-percentage') || document.getElementById('progress-percentage');
  const elStreakBadge = document.getElementById('study-progress-streak') || document.getElementById('progress-streak');
  const elBtnLoadMore = document.getElementById('study-btn-load-more') || document.getElementById('btn-load-more');
  const elLoadMoreWrapper = document.getElementById('study-load-more-wrapper') || document.getElementById('load-more-wrapper');
  
  // Translation Tooltip & Sheet elements
  const elDesktopTooltip = document.getElementById('desktop-trans-tooltip');
  const elTooltipText = document.getElementById('tooltip-turkish-text');
  const elMobileSheet = document.getElementById('mobile-trans-sheet');
  const elSheetGerman = document.getElementById('sheet-german-text');
  const elSheetTurkish = document.getElementById('sheet-turkish-text');
  const elBtnSheetClose = document.getElementById('btn-sheet-close');
  const elBtnSheetPronounce = document.getElementById('btn-sheet-pronounce');

  // NotebookLM Modal
  const elModalNotebook = document.getElementById('modal-notebooklm');
  const elBtnOpenNotebook = document.getElementById('study-btn-notebook-trigger') || document.getElementById('btn-notebooklm-trigger');
  const elBtnCloseNotebook = document.getElementById('btn-close-notebook-modal');

  // Bottom bar buttons (study.html)
  const elBtnBottomTop = document.getElementById('btn-bottom-top');
  const elBtnBottomSearch = document.getElementById('btn-bottom-search');
  const elBtnBottomUnread = document.getElementById('btn-bottom-unread');

  let currentActiveSentence = null;
  let activeUtteranceText = '';

  // --- Initialize Dataset (Ensure Priority Tier Sorting: Düsseldorf/AMBOSS -> Annecke & Hohn -> Kehl & Wilke) ---
  const rawQuestions = (typeof EXAM_QUESTIONS !== 'undefined' && Array.isArray(EXAM_QUESTIONS)) ? EXAM_QUESTIONS.slice() : [];
  function getQuestionPriorityWeight(q) {
    if (q.id && q.id.startsWith('q_dus_')) return 10;
    if (q.id && q.id.startsWith('q_amboss_')) return 20;
    if (q.study_tier === 1 || q.is_dus_protocol || q.is_amboss_curriculum) return 30;
    if (q.study_tier === 2 || q.question_type === 'open') return 40;
    return 50;
  }
  const allQuestions = rawQuestions.sort((a, b) => getQuestionPriorityWeight(a) - getQuestionPriorityWeight(b));

  // --- Sentence-Level Text Processing ---
  function splitIntoSentences(text) {
    if (!text) return [];
    const protectedText = text
      .replace(/z\.\s*B\./g, 'z_B_')
      .replace(/u\.\s*a\./g, 'u_a_')
      .replace(/bzw\./g, 'bzw_')
      .replace(/ca\./g, 'ca_')
      .replace(/ggf\./g, 'ggf_')
      .replace(/d\.\s*h\./g, 'd_h_')
      .replace(/i\.\s*d\.\s*R\./g, 'i_d_R_')
      .replace(/i\.\s*v\./g, 'i_v_')
      .replace(/s\.\s*c\./g, 's_c_')
      .replace(/p\.\s*o\./g, 'p_o_')
      .replace(/i\.\s*m\./g, 'i_m_')
      .replace(/V\.\s*a\./g, 'V_a_')
      .replace(/Z\.\s*n\./g, 'Z_n_')
      .replace(/M\.\s+/g, 'M_')
      .replace(/N\.\s+/g, 'N_')
      .replace(/A\.\s+/g, 'A_')
      .replace(/V\.\s+/g, 'V_')
      .replace(/(\d+)\.\s*(\d+)/g, '$1_DOT_$2');

    const rawSentences = protectedText.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [protectedText];

    return rawSentences.map(s => {
      return s
        .replace(/z_B_/g, 'z. B.')
        .replace(/u_a_/g, 'u. a.')
        .replace(/bzw_/g, 'bzw.')
        .replace(/ca_/g, 'ca.')
        .replace(/ggf_/g, 'ggf.')
        .replace(/d_h_/g, 'd. h.')
        .replace(/i_d_R_/g, 'i. d. R.')
        .replace(/i_v_/g, 'i.v.')
        .replace(/s_c_/g, 's.c.')
        .replace(/p_o_/g, 'p.o.')
        .replace(/i_m_/g, 'i.m.')
        .replace(/V_a_/g, 'V. a.')
        .replace(/Z_n_/g, 'Z. n.')
        .replace(/M_/g, 'M. ')
        .replace(/N_/g, 'N. ')
        .replace(/A_/g, 'A. ')
        .replace(/V_/g, 'V. ')
        .replace(/_DOT_/g, '.')
        .trim();
    }).filter(s => s.length > 0);
  }

  function renderInteractiveGerman(textDE, textTR) {
    if (!textDE) return '';
    if (!textTR || textTR.trim() === textDE.trim()) {
      return escapeHtml(textDE);
    }

    const sentencesDE = splitIntoSentences(textDE);
    const sentencesTR = splitIntoSentences(textTR);

    if (sentencesDE.length > 1 && Math.abs(sentencesDE.length - sentencesTR.length) <= 1) {
      return sentencesDE.map((sDe, idx) => {
        const sTr = sentencesTR[idx] || textTR;
        return `<span class="trans-interactive" data-tr="${escapeHtml(sTr)}" data-de="${escapeHtml(sDe)}">${escapeHtml(sDe)} </span>`;
      }).join('');
    }

    return `<span class="trans-interactive" data-tr="${escapeHtml(textTR)}" data-de="${escapeHtml(textDE)}">${escapeHtml(textDE)}</span>`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Filtering & Searching ---
  function getFilteredList() {
    let list = allQuestions;

    if (state.searchQuery && state.searchQuery.trim()) {
      const q = state.searchQuery.trim().toLowerCase();
      list = list.filter(item => {
        const stemDe = (item.stem_de || item.question_de || '').toLowerCase();
        const stemTr = (item.stem_tr || item.question_tr || '').toLowerCase();
        const ansDe = (item.answer_de || '').toLowerCase();
        const ansTr = (item.answer_tr || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        const oralQDe = (item.oral_question_de || '').toLowerCase();
        const oralQTr = (item.oral_question_tr || '').toLowerCase();
        const oralADe = (item.oral_answer_de || '').toLowerCase();
        const oralATr = (item.oral_answer_tr || '').toLowerCase();

        return stemDe.includes(q) || stemTr.includes(q) || ansDe.includes(q) || ansTr.includes(q) || 
               oralQDe.includes(q) || oralQTr.includes(q) || oralADe.includes(q) || oralATr.includes(q) || 
               cat.includes(q);
      });
    }

    if (state.activeCategory !== 'all') {
      list = list.filter(item => item.category === state.activeCategory);
    }

    if (state.activeType === 'dus') {
      list = list.filter(item => item.study_tier === 1 || item.is_dus_protocol || item.is_amboss_curriculum);
    } else if (state.activeType === 'open') {
      list = list.filter(item => item.question_type === 'open' || item.study_tier === 1 || item.study_tier === 2);
    } else if (state.activeType === 'options') {
      list = list.filter(item => item.question_type === 'options' || item.study_tier === 3);
    }

    if (state.activeStatusFilter === 'read') {
      list = list.filter(item => !!readStatus[item.id]);
    } else if (state.activeStatusFilter === 'unread') {
      list = list.filter(item => !readStatus[item.id]);
    }

    return list;
  }

  // --- Format Oral Question (Multi-line Case Vignette + Examiner Sub-Questions) ---
  function renderFormattedOralQuestion(qDe, qTr) {
    if (!qDe) return '';
    const linesDe = qDe.split('\n').map(l => l.trim()).filter(Boolean);
    const linesTr = (qTr || '').split('\n').map(l => l.trim()).filter(Boolean);

    if (linesDe.length === 1) {
      return `
        <h2 class="card-stem-title oral-stem-title">
          ${renderInteractiveGerman(linesDe[0], linesTr[0] || qTr)}
        </h2>
        ${linesTr[0] ? `<div class="inline-bilingual-tr oral-trans-sub" style="margin-top: 6px;">🇹🇷 ${escapeHtml(linesTr[0])}</div>` : ''}
      `;
    }

    let html = '';
    linesDe.forEach((lDe, idx) => {
      const lTr = linesTr[idx] || '';
      if (lDe.startsWith('👨‍⚕️') || /^\d+\.\s+/.test(lDe)) {
        html += `
          <div class="oral-subquestion-row" style="margin-top: 10px; padding: 10px 14px; background: rgba(2, 132, 199, 0.08); border-left: 3px solid var(--primary); border-radius: 8px;">
            <div style="font-weight: 700; font-size: var(--font-base); color: var(--text-primary); line-height: 1.55;">
              ${renderInteractiveGerman(lDe, lTr)}
            </div>
            ${lTr ? `<div class="inline-bilingual-tr" style="margin-top: 4px;">🇹🇷 ${escapeHtml(lTr)}</div>` : ''}
          </div>
        `;
      } else {
        html += `
          <div class="oral-vignette-para" style="${idx > 0 ? 'margin-top: 8px;' : ''}">
            <div class="card-stem-title oral-stem-title" style="font-size: var(--font-md); font-weight: 700;">
              ${renderInteractiveGerman(lDe, lTr)}
            </div>
            ${lTr ? `<div class="inline-bilingual-tr" style="margin-top: 4px;">🇹🇷 ${escapeHtml(lTr)}</div>` : ''}
          </div>
        `;
      }
    });
    return html;
  }

  // --- Format Structured Oral Exam Answers ---
  function renderFormattedOralAnswer(aDe, aTr) {
    if (!aDe) return '';

    const linesDe = aDe.split('\n').map(l => l.trim()).filter(Boolean);
    const linesTr = (aTr || '').split('\n').map(l => l.trim()).filter(Boolean);

    let html = '';
    linesDe.forEach((rawDe, idx) => {
      const rawTr = linesTr[idx] || '';

      // Follow-up question from examiner inside Annecke & Hohn case
      if (rawDe.startsWith('👨‍⚕️')) {
        html += `
          <div class="oral-followup-question-box" style="margin: 14px 0 8px 0; padding: 10px 14px; background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; border-radius: 8px;">
            <div style="font-weight: 700; color: #b45309; font-size: var(--font-base); line-height: 1.55;">
              ${renderInteractiveGerman(rawDe, rawTr)}
            </div>
            ${rawTr ? `<div class="inline-bilingual-tr" style="margin-top: 4px;">🇹🇷 ${escapeHtml(rawTr)}</div>` : ''}
          </div>
        `;
      } else if (rawDe.startsWith('•') || rawDe.startsWith('-') || rawDe.startsWith('–')) {
        const cleanDe = rawDe.replace(/^[•\-–]\s*/, '').trim();
        const cleanTr = rawTr.replace(/^[•\-–]\s*/, '').trim();
        html += `
          <div class="oral-answer-bullet-row">
            <span class="oral-bullet-icon">▸</span>
            <div class="oral-bullet-content">
              <div class="oral-bullet-de">${renderInteractiveGerman(cleanDe, cleanTr)}</div>
              ${cleanTr ? `<div class="inline-bilingual-tr" style="margin-top: 4px;">🇹🇷 ${escapeHtml(cleanTr)}</div>` : ''}
            </div>
          </div>
        `;
      } else if (/^\d+\.\s+/.test(rawDe) || /^MERKE\b/.test(rawDe)) {
        html += `
          <div class="oral-section-heading">
            <div class="oral-heading-de">${renderInteractiveGerman(rawDe, rawTr)}</div>
            ${rawTr ? `<div class="inline-bilingual-tr" style="margin-top: 4px;">🇹🇷 ${escapeHtml(rawTr)}</div>` : ''}
          </div>
        `;
      } else {
        html += `
          <div class="oral-paragraph-row">
            <div class="oral-para-de">${renderInteractiveGerman(rawDe, rawTr)}</div>
            ${rawTr ? `<div class="inline-bilingual-tr" style="margin-top: 4px;">🇹🇷 ${escapeHtml(rawTr)}</div>` : ''}
          </div>
        `;
      }
    });

    return html;
  }

  // --- Render Questions Feed ---
  function renderFeed(resetVisible = false) {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_PROGRESS) || "{}");
      Object.assign(readStatus, stored);
    } catch(e) {}
    if (resetVisible) state.visibleCount = state.pageSize;

    const filtered = getFilteredList();
    updateProgressBar();

    if (filtered.length === 0) {
      elFeed.innerHTML = `
        <div class="study-card empty-feed-card">
          <div style="font-size: 2.2rem; margin-bottom: 10px;">🔍</div>
          <h3>Aradığınız kriterlere uygun vaka veya soru bulunamadı</h3>
          <p style="margin-top: 6px; font-size: 0.9rem;">Lütfen filtreleri sıfırlayın veya farklı bir arama terimi deneyin.</p>
        </div>
      `;
      if (elLoadMoreWrapper) elLoadMoreWrapper.style.display = 'none';
      return;
    }

    const visibleItems = filtered.slice(0, state.visibleCount);
    let html = '';

    visibleItems.forEach((q, idx) => {
      const isRead = !!readStatus[q.id];
      const isDus = q.is_dus_protocol || (q.source_book && q.source_book.includes('Düsseldorf'));
      const isAnnecke = q.source_book && q.source_book.includes('Annecke');
      const globalIndex = allQuestions.findIndex(x => x.id === q.id) + 1;

      const questionDE = q.oral_question_de || q.question_de || q.stem_de || '';
      const questionTR = q.oral_question_tr || q.question_tr || q.stem_tr || '';
      const answerDE = q.oral_answer_de || q.answer_de || '';
      const answerTR = q.oral_answer_tr || q.answer_tr || '';

      // Melis Pedagogical Engine Enrichment (Data-First Monitor, First-3-Actions, First-Principles, Bedside Comm & 3-Tier Synthesis)
      let redeflussStep1 = null;
      let groundTruth = null;
      let monitorData = null;
      let threeActionsChallenge = null;
      let firstPrinciples = null;
      let bedsideComm = null;
      let examSynthesis = null;

      if (window.CurriculumEngine) {
        try {
          const rf = window.CurriculumEngine.getRedeflussBaukasten(q);
          if (rf && rf.step1) redeflussStep1 = rf.step1;
          const gt = window.CurriculumEngine.getMedicalGroundTruth(q);
          if (gt && gt.guideline && gt.guideline.awmf) {
            groundTruth = gt;
          }
          if (typeof window.CurriculumEngine.getDataFirstDiagnosticMonitor === 'function') {
            monitorData = window.CurriculumEngine.getDataFirstDiagnosticMonitor(q);
          }
          if (typeof window.CurriculumEngine.getImmediateThreeActionsChallenge === 'function') {
            threeActionsChallenge = window.CurriculumEngine.getImmediateThreeActionsChallenge(q);
          }
          if (typeof window.CurriculumEngine.getFirstPrinciplesPhysiology === 'function') {
            firstPrinciples = window.CurriculumEngine.getFirstPrinciplesPhysiology(q);
          }
          if (typeof window.CurriculumEngine.getBedsideCommunicationAndJargon === 'function') {
            bedsideComm = window.CurriculumEngine.getBedsideCommunicationAndJargon(q);
          }
          if (typeof window.CurriculumEngine.getThreeTierExamSynthesis === 'function') {
            examSynthesis = window.CurriculumEngine.getThreeTierExamSynthesis(q);
          }
        } catch (_) {}
      }

      const isTurnHidden = state.activeRecallMode && !state.revealedCards[q.id];

      html += `
        <article class="study-card ${isRead ? 'is-read' : ''}" id="card-${q.id}" data-id="${q.id}">
          <div class="card-header-bar">
            <div class="card-badges">
              <span class="badge-case-number">Frage #${globalIndex || (idx + 1)}</span>
              <span class="badge-category">${escapeHtml(q.category || 'Anästhesie')}</span>
              ${isDus ? `<span class="badge-dus-protocol">🏛️ ÄKNO Düsseldorf Protokoll</span>` : ''}
              ${q.is_amboss_curriculum ? `<span class="badge-category" style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0;">🩺 AMBOSS / DGAI Leitlinie</span>` : ''}
              ${isAnnecke ? `<span class="badge-pillar">🏥 Annecke &amp; Hohn Fall</span>` : ''}
              ${q.is_high_yield ? `<span class="badge-hy-star">⭐ High-Yield</span>` : ''}
            </div>

            <div class="card-actions-top">
              <button class="btn-card-action btn-pronounce-card" data-text="${escapeHtml(questionDE + '\n\n' + answerDE)}" title="Almanca Soru ve Model Cevabı Sesli Dinle">
                <span>🔊</span> Telaffuz
              </button>
              <button class="btn-card-action btn-toggle-read ${isRead ? 'active-read' : ''}" data-id="${q.id}">
                <span>${isRead ? '✓' : '○'}</span> ${isRead ? 'Gelesen' : 'Als gelesen'}
              </button>
            </div>
          </div>

          <!-- 👨‍⚕️ PRÜFER-FRAGE (Sözlü Sınav Sorusu & Fallvorstellung) -->
          <div class="oral-question-card-box">
            <div class="oral-role-badge examiner-role-badge" title="🇹🇷 Sözlü Sınav Sorusu">
              <span>👨‍⚕️</span> Prüfer-Frage / Fallvorstellung
            </div>
            <div class="oral-question-text">
              ${renderFormattedOralQuestion(questionDE, questionTR)}
            </div>
          </div>

          ${monitorData ? `
          <!-- 📟 1. DATA-FIRST KLINISCHER MONITOR, BGA, EKG & TREND-STRIP -->
          <div class="melis-monitor-strip">
            <div class="melis-monitor-header">
              <span>📟 ${renderInteractiveGerman(monitorData.scenarioBadgeDE, monitorData.scenarioBadgeTR)}</span>
              <span class="inline-bilingual-tr" style="color: #94a3b8; font-size: var(--font-xs); text-transform: none;">🇹🇷 ${escapeHtml(monitorData.scenarioBadgeTR)}</span>
            </div>
            <div class="melis-vitals-grid">
              <div class="melis-vital-tile">
                <div class="melis-vital-label">HF / Frequenz</div>
                <div class="melis-vital-value melis-val-hr">♥ ${escapeHtml(monitorData.vitals.hr)}</div>
              </div>
              <div class="melis-vital-tile">
                <div class="melis-vital-label">RR / MAP (Invasiv)</div>
                <div class="melis-vital-value melis-val-bp">${escapeHtml(monitorData.vitals.bp)} <small style="font-size: var(--font-xs); opacity:0.85;">(${escapeHtml(monitorData.vitals.map)})</small></div>
              </div>
              <div class="melis-vital-tile">
                <div class="melis-vital-label">SpO₂ (Pulsoxy)</div>
                <div class="melis-vital-value melis-val-spo2">${escapeHtml(monitorData.vitals.spo2)}</div>
              </div>
              <div class="melis-vital-tile">
                <div class="melis-vital-label">EtCO₂ (Kapno)</div>
                <div class="melis-vital-value melis-val-etco2">${escapeHtml(monitorData.vitals.etco2)}</div>
              </div>
              <div class="melis-vital-tile">
                <div class="melis-vital-label">Temperatur</div>
                <div class="melis-vital-value melis-val-temp">${escapeHtml(monitorData.vitals.temp)}</div>
              </div>
            </div>
            <div class="melis-bga-strip">
              <div><strong>📈 EKG &amp; Rhythmus:</strong> ${renderInteractiveGerman(monitorData.vitals.rhythmDE, monitorData.vitals.rhythmTR)}</div>
              <div style="margin-top: 4px;">
                <strong>🩸 Arterielle BGA:</strong>
                pH <strong>${escapeHtml(monitorData.bga.ph)}</strong> ·
                PaCO₂ <strong>${escapeHtml(monitorData.bga.pco2)}</strong> ·
                PaO₂ <strong>${escapeHtml(monitorData.bga.po2)}</strong> ·
                HCO₃⁻ <strong>${escapeHtml(monitorData.bga.hco3)}</strong> ·
                BE <strong>${escapeHtml(monitorData.bga.be)}</strong> ·
                Laktat <strong>${escapeHtml(monitorData.bga.lactate)}</strong> ·
                Hb <strong>${escapeHtml(monitorData.bga.hb)}</strong> ·
                ${escapeHtml(monitorData.bga.electrolytes)}
              </div>
              ${monitorData.advanced ? `
              <div style="margin-top: 4px;">
                <strong>🔬 ${escapeHtml(monitorData.advanced.labelDE)}:</strong>
                ${renderInteractiveGerman(monitorData.advanced.valuesDE, monitorData.advanced.valuesTR)}
              </div>
              ` : ''}
            </div>
            <div class="melis-monitor-pattern">
              <strong>⚡ Data-First Reflex:</strong> ${renderInteractiveGerman(monitorData.patternDE, monitorData.patternTR)}
              <div class="inline-bilingual-tr" style="color: #a7f3d0; margin-top: 3px;">🇹🇷 ${escapeHtml(monitorData.patternTR)}</div>
            </div>
          </div>
          ` : ''}

          ${threeActionsChallenge ? `
          <!-- ⚡ 2. PRÜFER-IMPULS: ERSTE 3 SOFORTMASSNAHMEN VOR DEM NÄCHSTEN TURN -->
          <div class="melis-three-actions-box">
            <div class="melis-three-actions-prompt">
              <div>
                <span>⚡ ${renderInteractiveGerman(threeActionsChallenge.vignetteTriggerDE, threeActionsChallenge.vignetteTriggerTR)}</span>
                <div class="inline-bilingual-tr" style="margin-top: 3px; font-weight: 500;">🇹🇷 ${escapeHtml(threeActionsChallenge.vignetteTriggerTR)}</div>
              </div>
              <button class="btn-card-action btn-pronounce-card" style="padding: 3px 9px; font-size: var(--font-xs);" data-text="${escapeHtml(threeActionsChallenge.vignetteTriggerDE)}">
                🔊 Prüfer
              </button>
            </div>
            <button type="button" class="btn-reveal-turn" data-card-id="${q.id}" title="${isTurnHidden ? '🇹🇷 İlk 3 Hamlemi Düşündüm — Uzman Cevabını & First-Principles Analizini Aç' : '🇹🇷 Kendimi Test Etmek İçin Cevabı Gizle'}">
              ${isTurnHidden
                ? '🎯 Erste 3 Maßnahmen &amp; Musterantwort aufdecken'
                : '🔒 Erste 3 Maßnahmen &amp; Musterantwort ausblenden'}
            </button>
          </div>
          ` : ''}

          <!-- REVEALABLE CLINICAL TURN CONTAINER -->
          <div id="turn-reveal-${q.id}" class="${isTurnHidden ? 'melis-hidden-turn' : ''}">

          ${threeActionsChallenge ? `
          <!-- ✅ ERSTE 3 SOFORTMASSNAHMEN & PRÜFER-NACHFRAGE (FIRST PRINCIPLES) -->
          <div style="margin-bottom: 14px; padding: 12px 15px; background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.28); border-radius: 12px;">
            <div style="font-size: var(--font-xs); font-weight: 800; text-transform: uppercase; color: #047857; letter-spacing: 0.03em; margin-bottom: 6px;" title="🇹🇷 İlk 3 Acil Hamle &amp; Fizyolojik Gerekçe">
              ✅ Erwartete Erste 3 Sofortmaßnahmen im OP / auf ITS
            </div>
            ${threeActionsChallenge.firstThreeActions.map(act => `
              <div class="melis-action-step-card">
                <div style="font-weight: 700; color: var(--text-primary);">
                  <span style="color: var(--primary);">#${act.step}:</span> ${renderInteractiveGerman(act.actionDE, act.actionTR)}
                </div>
                <div class="inline-bilingual-tr" style="margin-top: 3px;">🇹🇷 ${escapeHtml(act.actionTR)}</div>
                <div class="melis-action-rationale">
                  <strong>Warum (First Principle)?</strong> ${renderInteractiveGerman(act.whyDE, act.whyTR)}
                  <div class="inline-bilingual-tr" style="margin-top: 2px;">🇹🇷 ${escapeHtml(act.whyTR)}</div>
                </div>
              </div>
            `).join('')}

            <div class="melis-followup-probe">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <strong style="color: var(--primary);">👨‍⚕️ ${renderInteractiveGerman(threeActionsChallenge.examinerFollowupDE, threeActionsChallenge.examinerFollowupTR)}</strong>
                <button class="btn-card-action btn-pronounce-card" style="padding: 2px 8px; font-size: var(--font-xs);" data-text="${escapeHtml(threeActionsChallenge.examinerFollowupDE + ' ' + threeActionsChallenge.examinerJustificationDE)}">
                  🔊 Dinle
                </button>
              </div>
              <div class="inline-bilingual-tr" style="margin-top: 2px;">🇹🇷 ${escapeHtml(threeActionsChallenge.examinerFollowupTR)}</div>
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--border-subtle);">
                ${renderInteractiveGerman(threeActionsChallenge.examinerJustificationDE, threeActionsChallenge.examinerJustificationTR)}
                <div class="inline-bilingual-tr" style="margin-top: 3px;">🇹🇷 ${escapeHtml(threeActionsChallenge.examinerJustificationTR)}</div>
              </div>
            </div>
          </div>
          ` : ''}

          ${redeflussStep1 ? `
          <!-- 🗣️ REDEEINSTIEG (Sınavda Söze Başlama Kalıbı) -->
          <div class="oral-redeeinstieg-box" style="margin-bottom: 14px; padding: 10px 14px; background: rgba(16, 185, 129, 0.06); border: 1px dashed rgba(16, 185, 129, 0.35); border-radius: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
              <span style="font-size: var(--font-xs); font-weight: 700; text-transform: uppercase; color: #047857; letter-spacing: 0.03em;" title="🇹🇷 Sınavda Söze Başlama Kalıbı">
                🗣️ Empfohlener Redeeinstieg
              </span>
              <button class="btn-card-action btn-pronounce-card" style="padding: 2px 8px; font-size: var(--font-xs);" data-text="${escapeHtml(redeflussStep1.de || redeflussStep1.textDE || '')}">
                🔊 Dinle
              </button>
            </div>
            <div style="font-size: var(--font-base); font-style: italic; color: var(--text-primary); line-height: 1.55;">
              „${renderInteractiveGerman(redeflussStep1.de || redeflussStep1.textDE, redeflussStep1.tr || redeflussStep1.textTR)}“
            </div>
            <div class="inline-bilingual-tr" style="margin-top: 4px;">
              🇹🇷 "${escapeHtml(redeflussStep1.tr || redeflussStep1.textTR || '')}"
            </div>
          </div>
          ` : ''}

          <!-- 🩺 FACHARZT-MUSTERANTWORT (Doğrudan Model Uzman Yanıtı) -->
          <div class="oral-answer-card-box">
            <div class="oral-role-badge candidate-role-badge" title="🇹🇷 Doğrudan Model Uzman Cevabı">
              <span>🩺</span> Facharzt-Musterantwort &amp; Leitlinien
            </div>
            <div class="oral-answer-content">
              ${renderFormattedOralAnswer(answerDE, answerTR)}
            </div>
          </div>
      `;

      // Ground-Truth Dosages & Guideline Box (if high-yield emergency match)
      if (groundTruth && groundTruth.dosages && groundTruth.dosages.length > 0) {
        const gTitleDE = `${groundTruth.guideline.title} (${groundTruth.guideline.awmf}) — Wichtigste Prüfungs-Dosierungen:`;
        const gTitleTR = `${groundTruth.guideline.title_tr || groundTruth.guideline.title} (${groundTruth.guideline.awmf}) — En Önemli Sınav Dozları:`;
        html += `
          <div class="study-guideline-dosage-box" style="margin-top: 12px; padding: 12px 14px; background: rgba(2, 132, 199, 0.05); border: 1px solid rgba(2, 132, 199, 0.22); border-radius: 10px;">
            <div style="font-size: var(--font-xs); font-weight: 700; color: var(--primary); margin-bottom: 6px;">
              💊 ${renderInteractiveGerman(gTitleDE, gTitleTR)}
              <div class="inline-bilingual-tr" style="margin-top: 2px;">🇹🇷 ${escapeHtml(gTitleTR)}</div>
            </div>
            <div style="display: grid; gap: 6px; font-size: var(--font-base);">
              ${groundTruth.dosages.map(d => {
                const drugTr = d.drug_tr || d.drug;
                const doseTr = d.dose_tr || d.dose;
                const limDE = d.maxDose || d.limits || '';
                const limTr = d.maxDose_tr || d.limits_tr || limDE;
                const rowDE = `${d.drug}: ${d.dose}${limDE ? ` (${limDE})` : ''}`;
                const rowTR = `${drugTr}: ${doseTr}${limTr ? ` (${limTr})` : ''}`;
                return `
                <div style="padding: 6px 10px; background: var(--bg-card); border-radius: 6px; border: 1px solid var(--border-color);">
                  <div>
                    <strong style="color: var(--text-primary);">${renderInteractiveGerman(d.drug, drugTr)}:</strong>
                    <span style="color: var(--primary); font-weight: 700;"> ${renderInteractiveGerman(d.dose, doseTr)}</span>
                    ${limDE ? `<span style="color: var(--text-muted); font-size: var(--font-sm);"> (${renderInteractiveGerman(limDE, limTr)})</span>` : ''}
                  </div>
                  <div class="inline-bilingual-tr" style="margin-top: 3px;">🇹🇷 ${escapeHtml(rowTR)}</div>
                </div>
              `;
              }).join('')}
            </div>
          </div>
        `;
      }

      // Melis Deep-Dive Modules: 3) First-Principles Physiology & Pharmacology, 4) 3-Tier Exam Synthesis, 5) St. Antonius Eschweiler Bedside Communication & Klinik-Jargon
      if (firstPrinciples || examSynthesis || bedsideComm) {
        html += `<div class="melis-deep-dive-grid">`;

        if (firstPrinciples) {
          html += `
            <details class="melis-module-details">
              <summary class="melis-module-summary" title="🇹🇷 ${escapeHtml(firstPrinciples.titleTR)}">
                <span>🧠 ${escapeHtml(firstPrinciples.titleDE)}</span>
                <span style="font-size: var(--font-xs); color: var(--primary);">First-Principles ▼</span>
              </summary>
              <div class="melis-module-body">
                <div class="melis-formula-pill">📐 ${escapeHtml(firstPrinciples.formulaOrPrinciple)}</div>
                <div style="margin-bottom: 10px;">
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:3px;">
                    <strong style="color: var(--primary);">⚙️ Pathophysiologisches Prinzip (Warum im Körper?):</strong>
                    <button class="btn-card-action btn-pronounce-card" style="padding: 2px 8px; font-size: var(--font-xs);" data-text="${escapeHtml(firstPrinciples.mechanismDE)}">🔊 Dinle</button>
                  </div>
                  <div>${renderInteractiveGerman(firstPrinciples.mechanismDE, firstPrinciples.mechanismTR)}</div>
                  <div class="inline-bilingual-tr" style="margin-top: 3px;">🇹🇷 ${escapeHtml(firstPrinciples.mechanismTR)}</div>
                </div>
                <div style="padding-top: 8px; border-top: 1px dashed var(--border-color);">
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:3px;">
                    <strong style="color: var(--text-primary);">💊 Pharmakologische Kinetik &amp; Rezeptor-Logik (Warum genau dieses Medikament?):</strong>
                    <button class="btn-card-action btn-pronounce-card" style="padding: 2px 8px; font-size: var(--font-xs);" data-text="${escapeHtml(firstPrinciples.pharmacologyDE)}">🔊 Dinle</button>
                  </div>
                  <div>${renderInteractiveGerman(firstPrinciples.pharmacologyDE, firstPrinciples.pharmacologyTR)}</div>
                  <div class="inline-bilingual-tr" style="margin-top: 3px;">🇹🇷 ${escapeHtml(firstPrinciples.pharmacologyTR)}</div>
                </div>
              </div>
            </details>
          `;
        }

        if (examSynthesis) {
          const renderTierItem = (it) => {
            const plainDE = (it.de || '').replace(/<[^>]+>/g, '');
            const plainTR = (it.tr || '').replace(/<[^>]+>/g, '');
            return `<div style="margin-bottom:4px;">• <span class="trans-interactive" data-tr="${escapeHtml(plainTR)}" data-de="${escapeHtml(plainDE)}">${plainDE}</span><div class="inline-bilingual-tr" style="color:var(--text-muted); font-size:var(--font-sm);">🇹🇷 ${it.tr}</div></div>`;
          };
          html += `
            <details class="melis-module-details">
              <summary class="melis-module-summary" title="🇹🇷 Acil Müdahale · İkincil Tanı · Farmakolojik Nüanslar">
                <span>🎯 Strukturierte 3-Stufen Prüfungs-Synthese</span>
                <span style="font-size: var(--font-xs); color: var(--primary);">Prüfer-Bewertung ▼</span>
              </summary>
              <div class="melis-module-body">
                <div class="melis-tier-block" style="border-left: 3px solid var(--accent-rose);">
                  <div style="font-weight: 800; color: var(--accent-rose); margin-bottom: 4px;">🚨 ${renderInteractiveGerman(examSynthesis.tier1Immediate.titleDE, examSynthesis.tier1Immediate.titleTR)}</div>
                  ${examSynthesis.tier1Immediate.items.map(renderTierItem).join('')}
                </div>
                <div class="melis-tier-block" style="border-left: 3px solid var(--primary);">
                  <div style="font-weight: 800; color: var(--primary); margin-bottom: 4px;">🔬 ${renderInteractiveGerman(examSynthesis.tier2Diagnostics.titleDE, examSynthesis.tier2Diagnostics.titleTR)}</div>
                  ${examSynthesis.tier2Diagnostics.items.map(renderTierItem).join('')}
                </div>
                <div class="melis-tier-block" style="border-left: 3px solid var(--accent-emerald);">
                  <div style="font-weight: 800; color: var(--accent-emerald); margin-bottom: 4px;">💊 ${renderInteractiveGerman(examSynthesis.tier3Pharmacology.titleDE, examSynthesis.tier3Pharmacology.titleTR)}</div>
                  ${examSynthesis.tier3Pharmacology.items.map(renderTierItem).join('')}
                </div>
              </div>
            </details>
          `;
        }

        if (bedsideComm) {
          html += `
            <details class="melis-module-details">
              <summary class="melis-module-summary">
                <span>🗣️ St. Antonius-Hospital Eschweiler: Frühbesprechung, Prämedikationsgespräch &amp; Klinik-Jargon</span>
                <span style="font-size: var(--font-xs); color: var(--primary);">Klinik-Deutsch ▼</span>
              </summary>
              <div class="melis-module-body">
                <div style="margin-bottom: 10px;">
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:3px;">
                    <strong style="color: var(--primary);" title="🇹🇷 Sabah Toplantısı &amp; Kıdemli Devri">🏥 Morgen-Übergabe / Frühbesprechung:</strong>
                    <button class="btn-card-action btn-pronounce-card" style="padding: 2px 8px; font-size: var(--font-xs);" data-text="${escapeHtml(bedsideComm.fruehbesprechungDE)}">🔊 Dinle</button>
                  </div>
                  <div style="font-style: italic;">${renderInteractiveGerman(bedsideComm.fruehbesprechungDE, bedsideComm.fruehbesprechungTR)}</div>
                  <div class="inline-bilingual-tr" style="margin-top: 3px;">🇹🇷 ${escapeHtml(bedsideComm.fruehbesprechungTR)}</div>
                </div>
                <div style="margin-bottom: 10px; padding-top: 8px; border-top: 1px dashed var(--border-color);">
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:3px;">
                    <strong style="color: var(--accent-emerald);" title="🇹🇷 Hasta/Yakını Aydınlatma Cümlesi">🤝 Prämedikations- &amp; Aufklärungsgespräch:</strong>
                    <button class="btn-card-action btn-pronounce-card" style="padding: 2px 8px; font-size: var(--font-xs);" data-text="${escapeHtml(bedsideComm.praemedikationDE)}">🔊 Dinle</button>
                  </div>
                  <div style="font-style: italic;">${renderInteractiveGerman(bedsideComm.praemedikationDE, bedsideComm.praemedikationTR)}</div>
                  <div class="inline-bilingual-tr" style="margin-top: 3px;">🇹🇷 ${escapeHtml(bedsideComm.praemedikationTR)}</div>
                </div>
                <div style="padding-top: 8px; border-top: 1px dashed var(--border-color);">
                  <strong style="color: #b45309; font-size: var(--font-base);" title="🇹🇷 Hastane Kısaltmaları">🔤 Idiomatischer Klinik-Jargon &amp; Abkürzungen:</strong>
                  <div class="melis-jargon-grid">
                    ${(bedsideComm.jargonTerms || []).map(jt => `
                      <div class="melis-jargon-card">
                        <div><strong style="color: var(--primary);">${escapeHtml(jt.abbr)}</strong> — <strong>${escapeHtml(jt.termDE)}</strong></div>
                        <div style="margin-top: 2px; color: var(--text-secondary);">${renderInteractiveGerman(jt.meaningDE, jt.meaningTR)}</div>
                        <div class="inline-bilingual-tr" style="margin-top: 2px; color: var(--text-muted); font-size: var(--font-sm);">🇹🇷 ${escapeHtml(jt.meaningTR)}</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            </details>
          `;
        }

        html += `</div>`;
      }

      // Examiner Profile Box (if available)
      if (q.examiner_profile) {
        const ep = q.examiner_profile;
        html += `
          <div class="study-examiner-profile-box">
            <div class="study-examiner-profile-header">
              <span>🏛️</span> ÄKNO Düsseldorf Prüfer-Profil: ${escapeHtml(ep.name || 'Prüfungskommission')} (${escapeHtml(ep.hospital || 'Universitätsklinikum')})
            </div>
            <div style="font-size: var(--font-sm); color: var(--text-secondary); line-height: 1.55;">
              <div>
                <strong>🎯 Prüfungsschwerpunkt:</strong> ${renderInteractiveGerman(ep.focus || '', ep.focus_tr)}
                ${ep.focus_tr ? `<div class="inline-bilingual-tr" style="margin-top: 2px;">🇹🇷 ${escapeHtml(ep.focus_tr)}</div>` : ''}
              </div>
              ${ep.trap ? `
                <div style="margin-top: 2px; color: #b45309;">
                  <strong>⚠️ Typische Prüfungsfalle:</strong> ${renderInteractiveGerman(ep.trap, ep.trap_tr)}
                  ${ep.trap_tr ? `<div class="inline-bilingual-tr" style="margin-top: 2px;">🇹🇷 ${escapeHtml(ep.trap_tr)}</div>` : ''}
                </div>
              ` : ''}
              ${ep.keywords ? `
                <div style="margin-top: 2px; color: #047857;">
                  <strong>⭐ Signalwörter:</strong> ${renderInteractiveGerman(ep.keywords, ep.keywords_tr)}
                  ${ep.keywords_tr ? `<div class="inline-bilingual-tr" style="margin-top: 2px;">🇹🇷 ${escapeHtml(ep.keywords_tr)}</div>` : ''}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }

      // Examiner Intervention & Steering
      if (q.examiner_intervention) {
        html += `
          <div class="study-examiner-intervention-box">
            <div class="study-examiner-intervention-title">
              <span>⚡</span> Prüfer-Intervention &amp; Zwischenfrage im Saal (Akute Krise):
            </div>
            <div class="answer-body-text">
              ${renderInteractiveGerman(q.examiner_intervention, q.examiner_intervention_tr)}
            </div>
            <div class="inline-bilingual-tr">
              🇹🇷 ${escapeHtml(q.examiner_intervention_tr || '')}
            </div>
            ${q.examiner_answer ? `
              <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(245, 158, 11, 0.3);">
                <strong style="color: var(--text-primary); font-size: var(--font-base);">🎯 Optimale Sofort-Antwort auf die Zwischenfrage:</strong>
                <div class="answer-body-text" style="margin-top: 4px;">
                  ${renderInteractiveGerman(q.examiner_answer, q.examiner_answer_tr)}
                </div>
                <div class="inline-bilingual-tr">
                  🇹🇷 ${escapeHtml(q.examiner_answer_tr || '')}
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }

      // Examiner Tip & K.O. Traps
      if (q.examiner_tip) {
        html += `
          <div class="study-examiner-tip-box">
            <div class="study-examiner-tip-title">
              <span>💡</span> Prüfer-Tipp &amp; K.O.-Kriterium (Vermeidung von Durchfall-Fehlern):
            </div>
            <div class="answer-body-text">
              ${renderInteractiveGerman(q.examiner_tip, q.examiner_tip_tr)}
            </div>
            <div class="inline-bilingual-tr">
              🇹🇷 ${escapeHtml(q.examiner_tip_tr || '')}
            </div>
          </div>
        `;
      }

      html += `</div></article>`;
    });

    elFeed.innerHTML = html;

    if (elLoadMoreWrapper) {
      if (state.visibleCount < filtered.length) {
        elLoadMoreWrapper.style.display = 'block';
        elBtnLoadMore.textContent = `Daha Fazla Göster (${filtered.length - state.visibleCount} soru/vaka kaldı)`;
      } else {
        elLoadMoreWrapper.style.display = 'none';
      }
    }

    attachCardEventListeners();
  }

  // --- Attach Interactive Event Listeners to Rendered Cards ---
  function attachCardEventListeners() {
    document.querySelectorAll('.btn-toggle-read').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const card = document.getElementById(`card-${id}`);
        const current = !!readStatus[id];
        
        if (current) {
          delete readStatus[id];
          btn.classList.remove('active-read');
          btn.innerHTML = `<span>○</span> Als gelesen`;
          if (card) card.classList.remove('is-read');
        } else {
          readStatus[id] = true;
          btn.classList.add('active-read');
          btn.innerHTML = `<span>✓</span> Gelesen`;
          if (card) card.classList.add('is-read');
          triggerHapticFeedback();
        }

        localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(readStatus));
        updateProgressBar();
        try {
          const appState = JSON.parse(localStorage.getItem('facharzt_anaesthesie_state_v2') || '{}');
          appState.studyReadStatus = readStatus;
          localStorage.setItem('facharzt_anaesthesie_state_v2', JSON.stringify(appState));
          if (window.StorageSync && typeof window.StorageSync.pushToCloud === 'function') {
            window.StorageSync.pushToCloud(appState);
          }
        } catch (e) {
          console.warn('[StudySync] Background sync to appState failed:', e);
        }
      });
    });

    document.querySelectorAll('.btn-pronounce-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-text');
        speakGerman(text);
      });
    });

    document.querySelectorAll('.btn-reveal-turn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = btn.getAttribute('data-card-id');
        const turnBox = document.getElementById(`turn-reveal-${cardId}`);
        if (!turnBox) return;

        const isCurrentlyHidden = turnBox.classList.contains('melis-hidden-turn');
        if (isCurrentlyHidden) {
          turnBox.classList.remove('melis-hidden-turn');
          state.revealedCards[cardId] = true;
          btn.innerHTML = '🔒 Erste 3 Maßnahmen &amp; Musterantwort ausblenden';
          btn.title = '🇹🇷 Kendimi Test Etmek İçin Cevabı Gizle';
          triggerHapticFeedback();
        } else {
          turnBox.classList.add('melis-hidden-turn');
          delete state.revealedCards[cardId];
          btn.innerHTML = '🎯 Erste 3 Maßnahmen &amp; Musterantwort aufdecken';
          btn.title = '🇹🇷 İlk 3 Hamlemi Düşündüm — Uzman Cevabını & First-Principles Analizini Aç';
        }
      });
    });

    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    document.querySelectorAll('.trans-interactive').forEach(el => {
      el.addEventListener('mouseenter', () => {
        if (state.viewMode === 'german') return;
        if (isTouchDevice) return;
        const tr = el.getAttribute('data-tr');
        if (!tr) return;
        showDesktopTooltip(el, tr);
      });

      el.addEventListener('mouseleave', () => {
        if (!isTouchDevice) hideDesktopTooltip();
      });

      el.addEventListener('click', (e) => {
        if (state.viewMode === 'german') return;
        e.stopPropagation();

        const tr = el.getAttribute('data-tr');
        const de = el.getAttribute('data-de') || el.textContent;

        if (currentActiveSentence) {
          currentActiveSentence.classList.remove('active-tap');
        }
        el.classList.add('active-tap');
        currentActiveSentence = el;

        showMobileSheet(de, tr);
        triggerHapticFeedback();
      });
    });
  }

  function showDesktopTooltip(targetEl, textTR) {
    if (!elDesktopTooltip || !elTooltipText) return;
    elTooltipText.textContent = textTR;
    elDesktopTooltip.classList.add('visible');

    const rect = targetEl.getBoundingClientRect();
    const tooltipWidth = 340;
    let left = rect.left + (rect.width / 2);
    let top = rect.top;

    if (left - (tooltipWidth / 2) < 16) left = 16 + (tooltipWidth / 2);
    if (left + (tooltipWidth / 2) > window.innerWidth - 16) left = window.innerWidth - 16 - (tooltipWidth / 2);

    elDesktopTooltip.style.left = `${left}px`;
    elDesktopTooltip.style.top = `${top}px`;
  }

  function hideDesktopTooltip() {
    if (elDesktopTooltip) elDesktopTooltip.classList.remove('visible');
  }

  function showMobileSheet(textDE, textTR) {
    if (!elMobileSheet) return;
    activeUtteranceText = textDE;
    if (elSheetGerman) elSheetGerman.textContent = textDE;
    if (elSheetTurkish) elSheetTurkish.textContent = textTR;
    elMobileSheet.classList.add('open');
  }

  function hideMobileSheet() {
    if (elMobileSheet) elMobileSheet.classList.remove('open');
    if (currentActiveSentence) {
      currentActiveSentence.classList.remove('active-tap');
      currentActiveSentence = null;
    }
  }

  document.addEventListener('click', (e) => {
    if (elMobileSheet && elMobileSheet.classList.contains('open')) {
      if (!elMobileSheet.contains(e.target) && !e.target.classList.contains('trans-interactive')) {
        hideMobileSheet();
      }
    }
  });

  if (elBtnSheetClose) elBtnSheetClose.addEventListener('click', hideMobileSheet);

  if (elBtnSheetPronounce) {
    elBtnSheetPronounce.addEventListener('click', () => {
      if (activeUtteranceText) speakGerman(activeUtteranceText);
    });
  }

  function speakGerman(text) {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = 0.92;

    const voices = window.speechSynthesis.getVoices();
    const deVoice = voices.find(v => v.lang.startsWith('de') && (v.name.includes('Google') || v.name.includes('Anna') || v.name.includes('Martin') || v.name.includes('Natural')));
    if (deVoice) utterance.voice = deVoice;

    window.speechSynthesis.speak(utterance);
  }

  function triggerHapticFeedback() {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(12); } catch (_) {}
    }
  }

  function updateProgressBar() {
    const total = allQuestions.length;
    const readCount = Object.keys(readStatus).length;
    const percentage = total > 0 ? Math.round((readCount / total) * 100) : 0;

    if (elProgressBarFill) elProgressBarFill.style.width = `${percentage}%`;
    if (elProgressPercentage) elProgressPercentage.textContent = `%${percentage}`;
    if (elProgressText) elProgressText.textContent = `${readCount} / ${total} Vaka Okundu`;
    if (elStreakBadge) elStreakBadge.textContent = `🎯 ${readCount} Tamamlandı`;
  }

  function initCategories() {
    const cats = {};
    allQuestions.forEach(q => {
      const c = q.category || 'Allgemeine Anästhesie';
      cats[c] = (cats[c] || 0) + 1;
    });

    let html = `<button class="btn-cat-chip active" data-cat="all">Alle Themen (${allQuestions.length})</button>`;
    
    const sortedCats = Object.keys(cats).sort((a, b) => b.length - a.length);
    sortedCats.forEach(cat => {
      html += `<button class="btn-cat-chip" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)} (${cats[cat]})</button>`;
    });

    if (elCategoryScroll) {
      elCategoryScroll.innerHTML = html;
      elCategoryScroll.querySelectorAll('.btn-cat-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          elCategoryScroll.querySelectorAll('.btn-cat-chip').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.activeCategory = btn.getAttribute('data-cat');
          updateCategoryToggleLabel();
          renderFeed(true);
        });
      });
    }

    // Toggle button for category drawer (Clean Apple layout)
    const elToggleCats = document.getElementById('study-btn-toggle-categories') || document.getElementById('btn-toggle-categories');
    function updateCategoryToggleLabel() {
      if (!elToggleCats) return;
      const labelSpan = elToggleCats.querySelector('.category-drawer-label');
      if (!labelSpan) return;
      if (!state.activeCategory || state.activeCategory === 'all') {
        labelSpan.textContent = `Konular (${sortedCats.length})`;
      } else {
        const shortName = state.activeCategory.length > 18 ? state.activeCategory.slice(0, 16) + '…' : state.activeCategory;
        labelSpan.textContent = `${shortName} ✕`;
      }
    }

    if (elToggleCats && !elToggleCats.dataset.drawerBound) {
      elToggleCats.dataset.drawerBound = 'true';
      elToggleCats.addEventListener('click', (e) => {
        e.preventDefault();
        // If clicking when active category is selected, reset to all
        if (state.activeCategory && state.activeCategory !== 'all') {
          state.activeCategory = 'all';
          if (elCategoryScroll) {
            elCategoryScroll.querySelectorAll('.btn-cat-chip').forEach(b => {
              b.classList.toggle('active', b.getAttribute('data-cat') === 'all');
            });
          }
          updateCategoryToggleLabel();
          renderFeed(true);
          return;
        }

        if (!elCategoryScroll) return;
        const isCollapsed = elCategoryScroll.classList.contains('collapsed');
        if (isCollapsed) {
          elCategoryScroll.classList.remove('collapsed');
          elCategoryScroll.classList.add('expanded');
          elToggleCats.classList.add('active');
          elToggleCats.setAttribute('aria-expanded', 'true');
        } else {
          elCategoryScroll.classList.add('collapsed');
          elCategoryScroll.classList.remove('expanded');
          elToggleCats.classList.remove('active');
          elToggleCats.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  // --- Controls & Settings Listeners ---
  let searchTimer = null;
  if (elSearchInput) {
    elSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      const val = e.target.value;
      if (elBtnClearSearch) elBtnClearSearch.style.display = val ? 'block' : 'none';

      searchTimer = setTimeout(() => {
        state.searchQuery = val;
        renderFeed(true);
      }, 180);
    });
  }

  if (elBtnClearSearch) {
    elBtnClearSearch.addEventListener('click', () => {
      elSearchInput.value = '';
      elBtnClearSearch.style.display = 'none';
      state.searchQuery = '';
      renderFeed(true);
      elSearchInput.focus();
    });
  }

  if (elTypeFilters) {
    elTypeFilters.forEach(btn => {
      btn.addEventListener('click', () => {
        elTypeFilters.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeType = btn.getAttribute('data-type');
        renderFeed(true);
      });
    });
  }

  if (elModeTabs) {
    elModeTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        elModeTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-mode');
        state.viewMode = mode;
        saveSettings();

        document.body.classList.remove('mode-hover', 'mode-bilingual', 'mode-german-only');
        if (mode === 'bilingual') document.body.classList.add('mode-bilingual');
        if (mode === 'german') document.body.classList.add('mode-german-only');
        updateGermanOnlyButtonState();
      });
    });
  }

  function updateGermanOnlyButtonState() {
    const isGerman = document.body.classList.contains('mode-german-only') || state.viewMode === 'german';
    const allGermanBtns = document.querySelectorAll('#btn-quick-german-toggle, #btn-global-german-toggle, .pill-btn-german, .btn-header-german');
    allGermanBtns.forEach(b => {
      b.classList.toggle('active', isGerman);
      const label = b.querySelector('.btn-label') || b.querySelector('.pill-btn-text');
      if (label) {
        label.textContent = isGerman ? 'Nur Deutsch ✓' : 'Nur Deutsch';
      }
    });
  }

  function toggleGermanOnlyMode() {
    const isCurrentlyGerman = document.body.classList.contains('mode-german-only') || state.viewMode === 'german';
    const newMode = isCurrentlyGerman ? 'hover' : 'german';
    state.viewMode = newMode;
    saveSettings();

    document.body.classList.remove('mode-hover', 'mode-bilingual', 'mode-german-only');
    if (newMode === 'german') {
      document.body.classList.add('mode-german-only');
    } else {
      document.body.classList.add('mode-hover');
    }

    if (elModeTabs) {
      elModeTabs.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-mode') === newMode);
      });
    }

    updateGermanOnlyButtonState();
  }

  document.querySelectorAll('#btn-quick-german-toggle, #btn-global-german-toggle, .pill-btn-german, .btn-header-german').forEach(b => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      toggleGermanOnlyMode();
    });
  });

  if (elThemeToggle) {
    elThemeToggle.addEventListener('click', () => {
      const themes = ['sepia', 'light', 'dark'];
      const nextIdx = (themes.indexOf(state.theme) + 1) % themes.length;
      state.theme = themes[nextIdx];
      applyTheme(state.theme);
      saveSettings();
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icons = { sepia: '📜', light: '☀️', dark: '🌙' };
    const titles = { sepia: 'Sepia (Sıcak Sarımsı Okuma)', light: 'Heller Modus (Aydınlık)', dark: 'Dunkler Modus (Gece)' };
    if (elThemeToggle) {
      elThemeToggle.innerHTML = `<span>${icons[theme] || '📜'}</span>`;
      elThemeToggle.title = titles[theme] || 'Tema Değiştir';
    }
  }

  const FONT_LEVELS = [
    { size: 15, label: 'Kompakt' },
    { size: 17, label: 'Standart' },
    { size: 19, label: 'Rahat' },
    { size: 21, label: 'Geniş' }
  ];

  function stepFontSize(dir, isPillClick = false) {
    const sizes = [15, 17, 19, 21];
    let curIdx = sizes.indexOf(state.fontSize);
    if (curIdx === -1) curIdx = 1;

    let nextIdx;
    if (isPillClick) {
      nextIdx = (curIdx + 1) % sizes.length;
    } else {
      nextIdx = Math.max(0, Math.min(sizes.length - 1, curIdx + dir));
    }
    state.fontSize = sizes[nextIdx];
    applyFontSize(state.fontSize);
    saveSettings();
  }

  if (elFontToggle) {
    elFontToggle.addEventListener('click', (e) => {
      e.preventDefault();
      stepFontSize(1, true);
    });
  }

  if (elFontDec) {
    elFontDec.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      stepFontSize(-1, false);
    });
  }

  if (elFontInc) {
    elFontInc.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      stepFontSize(1, false);
    });
  }

  function applyFontSize(size) {
    document.documentElement.style.setProperty('--reading-font-size', `${size}px`);
    const match = FONT_LEVELS.find(l => l.size === size) || { size, label: 'Standart' };

    if (elFontToggle) {
      elFontToggle.title = `Okuma Boyutu: ${match.label} (Tıkla ve Değiştir)`;
      elFontToggle.innerHTML = `
        <span class="stepper-aa-icon"><span class="aa-s">a</span><span class="aa-l">A</span></span>
        <span class="stepper-label">${escapeHtml(match.label)}</span>
        <span class="stepper-dots" aria-hidden="true">
          <span class="step-dot ${size === 15 ? 'active' : ''}"></span>
          <span class="step-dot ${size === 17 ? 'active' : ''}"></span>
          <span class="step-dot ${size === 19 ? 'active' : ''}"></span>
          <span class="step-dot ${size === 21 ? 'active' : ''}"></span>
        </span>
      `;
    }

    if (elFontDec) {
      const isMin = size <= 15;
      elFontDec.disabled = isMin;
      elFontDec.classList.toggle('disabled', isMin);
    }
    if (elFontInc) {
      const isMax = size >= 21;
      elFontInc.disabled = isMax;
      elFontInc.classList.toggle('disabled', isMax);
    }
  }

  if (elBtnLoadMore) {
    elBtnLoadMore.addEventListener('click', () => {
      state.visibleCount += state.pageSize;
      renderFeed(false);
    });
  }

  if (elBtnOpenNotebook && elModalNotebook) {
    elBtnOpenNotebook.addEventListener('click', () => {
      elModalNotebook.style.display = 'flex';
    });
  }

  if (elBtnCloseNotebook && elModalNotebook) {
    elBtnCloseNotebook.addEventListener('click', () => {
      elModalNotebook.style.display = 'none';
    });
  }

  if (elModalNotebook) {
    elModalNotebook.addEventListener('click', (e) => {
      if (e.target === elModalNotebook) elModalNotebook.style.display = 'none';
    });
  }

  // Bottom quick bar handlers
  if (elBtnBottomTop) {
    elBtnBottomTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  if (elBtnBottomSearch && elSearchInput) {
    elBtnBottomSearch.addEventListener('click', () => {
      elSearchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => elSearchInput.focus(), 300);
    });
  }
  if (elBtnBottomUnread) {
    elBtnBottomUnread.addEventListener('click', () => {
      state.activeStatusFilter = state.activeStatusFilter === 'unread' ? 'all' : 'unread';
      elBtnBottomUnread.innerHTML = state.activeStatusFilter === 'unread'
        ? `<span class="nav-icon">🎯</span><span>Okunmayanlar</span>`
        : `<span class="nav-icon">📖</span><span>Tümü</span>`;
      renderFeed(true);
    });
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify({
      theme: state.theme,
      fontSize: state.fontSize,
      viewMode: state.viewMode,
      activeRecallMode: state.activeRecallMode
    }));
  }

  function applyActiveRecallMode(enabled) {
    if (!elActiveRecallToggle) return;
    if (enabled) {
      elActiveRecallToggle.classList.add('active');
      elActiveRecallToggle.innerHTML = '<span>⚡</span> İlk 3 Hamle Test Modu: AÇIK';
    } else {
      elActiveRecallToggle.classList.remove('active');
      elActiveRecallToggle.innerHTML = '<span>⚡</span> İlk 3 Hamle Test Modu';
    }
  }

  if (elActiveRecallToggle) {
    elActiveRecallToggle.addEventListener('click', () => {
      state.activeRecallMode = !state.activeRecallMode;
      state.revealedCards = {};
      applyActiveRecallMode(state.activeRecallMode);
      saveSettings();
      renderFeed(false);
    });
  }

  function updateDynamicQuestionCounts() {
    const totalCount = allQuestions.length;
    const dusCount = allQuestions.filter(item => item.study_tier === 1 || item.is_dus_protocol || item.is_amboss_curriculum).length;
    const openCount = allQuestions.filter(item => item.question_type === 'open' || item.study_tier === 1 || item.study_tier === 2).length;
    const optionsCount = allQuestions.filter(item => item.question_type === 'options' || item.study_tier === 3).length;

    document.querySelectorAll('.btn-type-filter').forEach(btn => {
      const t = btn.getAttribute('data-type');
      if (t === 'all') btn.textContent = `Tüm Sözlü Sınav Arşivi (${totalCount})`;
      else if (t === 'dus') btn.textContent = `🏛️ ÄKNO Düsseldorf & AMBOSS Vaka Protokolleri (${dusCount})`;
      else if (t === 'open') btn.textContent = `🏥 Klinik Vaka Soruları — Annecke & Hohn (${openCount})`;
      else if (t === 'options') btn.textContent = `📚 Konu Bazlı Sözlü Soru-Cevap (${optionsCount})`;
    });
  }

  // --- Initial Bootstrap ---
  applyTheme(state.theme);
  applyFontSize(state.fontSize);
  applyActiveRecallMode(state.activeRecallMode);
  if (state.viewMode === 'bilingual') document.body.classList.add('mode-bilingual');
  if (state.viewMode === 'german') document.body.classList.add('mode-german-only');
  updateGermanOnlyButtonState();

  updateDynamicQuestionCounts();
  initCategories();
  renderFeed(true);

  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }

  // Export refresh helper globally if needed
  window.refreshMelisStudyFeed = () => renderFeed(true);

})();
