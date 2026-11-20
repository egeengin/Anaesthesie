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
  const STORAGE_KEY_STARRED = 'facharzt_melis_starred_v1';
  const STORAGE_KEY_SETTINGS = 'facharzt_melis_study_settings_v1';
  const STORAGE_KEY_DAILY = 'facharzt_melis_daily_log_v1';
  const APP_STATE_KEY = 'facharzt_anaesthesie_state_v2';
  const AUTH_KEY = 'facharzt_auth_logged_in';

  // Check auth
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
  if (localStorage.getItem(AUTH_KEY) !== 'true' && !isLocal && !document.getElementById('auth-modal')) {
    const entered = prompt('Giriş Şifresi (Standard-Passwort):', '');
    if (entered && entered.trim().toLowerCase() === 'egemelis') {
      localStorage.setItem(AUTH_KEY, 'true');
    } else {
      alert('Şifre hatalı veya giriş yapılmadı.');
      window.location.href = 'index.html';
      return;
    }
  }

  const savedSettings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS) || '{}');
  const readStatus = JSON.parse(localStorage.getItem(STORAGE_KEY_PROGRESS) || '{}');
  const starredStatus = JSON.parse(localStorage.getItem(STORAGE_KEY_STARRED) || '{}');
  try {
    const appSaved = JSON.parse(localStorage.getItem(APP_STATE_KEY) || '{}');
    if (appSaved && appSaved.flagged && typeof appSaved.flagged === 'object') {
      Object.keys(appSaved.flagged).forEach(k => {
        if (appSaved.flagged[k]) starredStatus[k] = true;
      });
    }
  } catch (e) {}

  let dailyLog = { days: {}, lastDate: null, streakDays: 0 };
  try {
    const parsedDaily = JSON.parse(localStorage.getItem(STORAGE_KEY_DAILY) || '{}');
    if (parsedDaily && typeof parsedDaily === 'object') {
      dailyLog = {
        days: (parsedDaily.days && typeof parsedDaily.days === 'object') ? parsedDaily.days : {},
        lastDate: parsedDaily.lastDate || null,
        streakDays: Number.isFinite(parsedDaily.streakDays) ? parsedDaily.streakDays : 0
      };
    }
  } catch (e) {}

  function getLocalDateKey(dateObj = new Date()) {
    const yr = dateObj.getFullYear();
    const mo = String(dateObj.getMonth() + 1).padStart(2, '0');
    const da = String(dateObj.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  }

  function getYesterdayDateKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateKey(d);
  }

  function getTodayReadCount() {
    const list = dailyLog.days[getLocalDateKey()];
    return Array.isArray(list) ? list.length : 0;
  }

  function getCurrentStreakDays() {
    const todayKey = getLocalDateKey();
    const yesterdayKey = getYesterdayDateKey();
    const todayCount = getTodayReadCount();
    if (dailyLog.lastDate === todayKey) {
      return Math.max(dailyLog.streakDays || 0, todayCount > 0 ? 1 : 0);
    }
    if (dailyLog.lastDate === yesterdayKey) {
      return dailyLog.streakDays || 0;
    }
    return 0;
  }

  let toastHideTimer = null;
  function showStudyToast(message) {
    if (!message) return;
    let toastEl = document.getElementById('melis-study-toast');
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'melis-study-toast';
      toastEl.className = 'melis-study-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add('visible');
    clearTimeout(toastHideTimer);
    toastHideTimer = setTimeout(() => {
      toastEl.classList.remove('visible');
    }, 4500);
  }

  function isDusItem(item) {
    return item.study_tier === 1 || item.is_dus_protocol || item.is_amboss_curriculum;
  }
  function isOpenItem(item) {
    return item.question_type === 'open' || item.study_tier === 1 || item.study_tier === 2;
  }
  function isOptionItem(item) {
    return item.question_type === 'options' || item.study_tier === 3;
  }

  function recordDailyRead(id, isMarkingRead) {
    if (!id) return;
    const todayKey = getLocalDateKey();
    const yesterdayKey = getYesterdayDateKey();
    if (!Array.isArray(dailyLog.days[todayKey])) {
      dailyLog.days[todayKey] = [];
    }

    if (isMarkingRead) {
      if (!dailyLog.days[todayKey].includes(id)) {
        dailyLog.days[todayKey].push(id);
      }
      if (dailyLog.lastDate !== todayKey) {
        dailyLog.streakDays = (dailyLog.lastDate === yesterdayKey)
          ? (dailyLog.streakDays || 0) + 1
          : 1;
        dailyLog.lastDate = todayKey;
      } else if (!dailyLog.streakDays) {
        dailyLog.streakDays = 1;
      }

      const dayKeys = Object.keys(dailyLog.days).sort();
      if (dayKeys.length > 90) {
        dayKeys.slice(0, dayKeys.length - 90).forEach(k => delete dailyLog.days[k]);
      }

      try {
        localStorage.setItem(STORAGE_KEY_DAILY, JSON.stringify(dailyLog));
      } catch (e) {}

      const todayCount = dailyLog.days[todayKey].length;
      const dusItems = allQuestions.filter(isDusItem);
      const dusDone = dusItems.length > 0 && dusItems.every(item => !!readStatus[item.id]);
      if (dusDone && dusItems.some(item => item.id === id)) {
        showStudyToast('✅ Aşama 1 (91 ÄKNO Protokolü) %100 Tamam! Düsseldorf sınavına başvurabilirsin.');
      } else if (todayCount >= 5 && todayCount % 5 === 0) {
        const msg = todayCount === 5
          ? '☕ Bugünün 5 Vakası Tamam! ÄKNO Düsseldorf hazırlığın hızla ilerliyor.'
          : `🔥 Harika tempo! Bugün ${todayCount} vaka tamamladın — hedefin çok yakın.`;
        showStudyToast(msg);
      }
    } else {
      const idx = dailyLog.days[todayKey].indexOf(id);
      if (idx !== -1) {
        dailyLog.days[todayKey].splice(idx, 1);
      }
      try {
        localStorage.setItem(STORAGE_KEY_DAILY, JSON.stringify(dailyLog));
      } catch (e) {}
    }
  }

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
                <div style="font-weight: 700; color: var(--primary);">📋 4. Adım Adım Kurulum Rehberi ve Sınav Komutları</div>
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
  allQuestions.forEach(item => {
    item._searchIndex = [
      item.stem_de, item.question_de, item.stem_tr, item.question_tr,
      item.answer_de, item.answer_tr, item.category,
      item.oral_question_de, item.oral_question_tr,
      item.oral_answer_de, item.oral_answer_tr
    ].filter(Boolean).join('\n').toLowerCase();
  });

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
      list = list.filter(item => item._searchIndex && item._searchIndex.includes(q));
    }

    if (state.activeCategory !== 'all') {
      list = list.filter(item => item.category === state.activeCategory);
    }

    if (state.activeType === 'dus') {
      list = list.filter(isDusItem);
    } else if (state.activeType === 'open') {
      list = list.filter(isOpenItem);
    } else if (state.activeType === 'options') {
      list = list.filter(isOptionItem);
    }

    if (state.activeStatusFilter === 'read') {
      list = list.filter(item => !!readStatus[item.id]);
    } else if (state.activeStatusFilter === 'unread') {
      list = list.filter(item => !readStatus[item.id]);
    } else if (state.activeStatusFilter === 'starred') {
      list = list.filter(item => !!starredStatus[item.id]);
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
      const isStarred = !!starredStatus[q.id];
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
      const priorityBadge = isDus
        ? `<span class="badge-dus-protocol">🏛️ ÄKNO</span>`
        : (q.is_amboss_curriculum
            ? `<span class="badge-category" style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0;">🩺 AMBOSS</span>`
            : (q.is_high_yield ? `<span class="badge-hy-star">⭐ Kritik Vaka</span>` : ''));

      const splitVital = (raw) => {
        const str = String(raw || '').trim();
        const parenIdx = str.indexOf('(');
        const arrowIdx = str.indexOf('unter ');
        let cut = -1;
        if (parenIdx > 0) cut = parenIdx;
        else if (arrowIdx > 0) cut = arrowIdx;
        if (cut > 0) {
          const main = str.slice(0, cut).trim();
          const note = str.slice(cut).replace(/^\((.*)\)$/, '$1').trim();
          return { main, note, full: str };
        }
        return { main: str, note: '', full: str };
      };
      const vHr = monitorData ? splitVital(monitorData.vitals.hr) : null;
      const vBp = monitorData ? splitVital(monitorData.vitals.bp) : null;
      const vSpo2 = monitorData ? splitVital(monitorData.vitals.spo2) : null;
      const vEtco2 = monitorData ? splitVital(monitorData.vitals.etco2) : null;
      const vTemp = monitorData ? splitVital(monitorData.vitals.temp) : null;

      const formatBgaChip = (raw) => {
        const s = String(raw || '').trim();
        const m = s.match(/^([^\d\-+<>=]+?)\s+([\-+<>=]?\d.*)$/);
        if (m) {
          return `<span class="melis-bga-chip">${escapeHtml(m[1].trim())} <strong>${escapeHtml(m[2].trim())}</strong></span>`;
        }
        return `<span class="melis-bga-chip">${escapeHtml(s)}</span>`;
      };
      const electrolyteChipsHtml = String(monitorData && monitorData.bga && monitorData.bga.electrolytes || '')
        .split(/\s*·\s*/)
        .filter(Boolean)
        .map(formatBgaChip)
        .join('');
      const advancedStepsDE = String(monitorData && monitorData.advanced && monitorData.advanced.valuesDE || '')
        .split(/\s*·\s*/)
        .filter(Boolean);
      const advancedStepsTR = String(monitorData && monitorData.advanced && monitorData.advanced.valuesTR || '')
        .split(/\s*·\s*/)
        .filter(Boolean);
      const advancedStepsHtml = advancedStepsDE.length > 1
        ? `<ul class="melis-advanced-steps">${advancedStepsDE.map((step, i) => `<li>${renderInteractiveGerman(step, advancedStepsTR[i] || '')}</li>`).join('')}</ul>`
        : (monitorData && monitorData.advanced ? `<span>${renderInteractiveGerman(monitorData.advanced.valuesDE, monitorData.advanced.valuesTR)}</span>` : '');

      const monitorHtml = monitorData ? `
        <div class="melis-monitor-strip">
          <div class="melis-monitor-header">
            <span>📟 ${renderInteractiveGerman(monitorData.scenarioBadgeDE, monitorData.scenarioBadgeTR)}</span>
            <span class="inline-bilingual-tr" style="font-size: var(--font-xs); text-transform: none; opacity: 0.85;">🇹🇷 ${escapeHtml(monitorData.scenarioBadgeTR)}</span>
          </div>
          <div class="melis-vitals-grid">
            <div class="melis-vital-tile" title="${escapeHtml(vHr.full)}">
              <div class="melis-vital-label">HF / Frequenz</div>
              <div class="melis-vital-value melis-val-hr">♥ ${escapeHtml(vHr.main)}</div>
              ${vHr.note ? `<div class="melis-vital-note">${escapeHtml(vHr.note)}</div>` : ''}
            </div>
            <div class="melis-vital-tile" title="${escapeHtml(vBp.full)} (${escapeHtml(monitorData.vitals.map)})">
              <div class="melis-vital-label">RR / MAP</div>
              <div class="melis-vital-value melis-val-bp">${escapeHtml(vBp.main)}</div>
              ${vBp.note ? `<div class="melis-vital-note">${escapeHtml(vBp.note)}</div>` : ''}
            </div>
            <div class="melis-vital-tile" title="${escapeHtml(vSpo2.full)}">
              <div class="melis-vital-label">SpO₂</div>
              <div class="melis-vital-value melis-val-spo2">${escapeHtml(vSpo2.main)}</div>
              ${vSpo2.note ? `<div class="melis-vital-note">${escapeHtml(vSpo2.note)}</div>` : ''}
            </div>
            <div class="melis-vital-tile" title="${escapeHtml(vEtco2.full)}">
              <div class="melis-vital-label">EtCO₂</div>
              <div class="melis-vital-value melis-val-etco2">${escapeHtml(vEtco2.main)}</div>
              ${vEtco2.note ? `<div class="melis-vital-note">${escapeHtml(vEtco2.note)}</div>` : ''}
            </div>
            <div class="melis-vital-tile" title="${escapeHtml(vTemp.full)}">
              <div class="melis-vital-label">Temp.</div>
              <div class="melis-vital-value melis-val-temp">${escapeHtml(vTemp.main)}</div>
              ${vTemp.note ? `<div class="melis-vital-note">${escapeHtml(vTemp.note)}</div>` : ''}
            </div>
          </div>
          <div class="melis-bga-strip">
            <div><strong>EKG:</strong> ${renderInteractiveGerman(String(monitorData.vitals.rhythmDE || '').replace(/^EKG:\s*/i, ''), String(monitorData.vitals.rhythmTR || '').replace(/^EKG:\s*/i, ''))}</div>
            <div>
              <strong>BGA:</strong>
              <div class="melis-bga-chips">
                <span class="melis-bga-chip">pH <strong>${escapeHtml(monitorData.bga.ph)}</strong></span>
                <span class="melis-bga-chip">PaCO₂ <strong>${escapeHtml(monitorData.bga.pco2)}</strong></span>
                <span class="melis-bga-chip">PaO₂ <strong>${escapeHtml(monitorData.bga.po2)}</strong></span>
                <span class="melis-bga-chip">HCO₃⁻ <strong>${escapeHtml(monitorData.bga.hco3)}</strong></span>
                <span class="melis-bga-chip">BE <strong>${escapeHtml(monitorData.bga.be)}</strong></span>
                <span class="melis-bga-chip">Laktat <strong>${escapeHtml(monitorData.bga.lactate)}</strong></span>
                <span class="melis-bga-chip">Hb <strong>${escapeHtml(monitorData.bga.hb)}</strong></span>
                ${electrolyteChipsHtml}
              </div>
            </div>
            ${monitorData.advanced ? `
            <div>
              <strong>${escapeHtml(monitorData.advanced.labelDE)}:</strong>
              ${advancedStepsHtml}
            </div>
            ` : ''}
          </div>
          <div class="melis-monitor-pattern">
            <strong>⚡ Klinisches Muster:</strong> ${renderInteractiveGerman(String(monitorData.patternDE || '').replace(/^Mustererkennung:\s*/i, ''), String(monitorData.patternTR || '').replace(/^Örüntü Tanıma:\s*/i, ''))}
            <div class="inline-bilingual-tr" style="margin-top: 3px;">🇹🇷 ${escapeHtml(monitorData.patternTR)}</div>
          </div>
        </div>
      ` : '';

      const threeActionsHtml = threeActionsChallenge ? `
        <div class="melis-three-actions-detail" style="padding: 12px 14px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.22); border-radius: 12px;">
          <div style="font-size: var(--font-xs); font-weight: 800; text-transform: uppercase; color: #047857; letter-spacing: 0.03em; margin-bottom: 6px;" title="🇹🇷 İlk 3 Acil Hamle &amp; Fizyolojik Gerekçe">
            ✅ Erste 3 Sofortmaßnahmen
          </div>
          ${threeActionsChallenge.firstThreeActions.map(act => `
            <div class="melis-action-step-card">
              <div style="font-weight: 700; color: var(--text-primary);">
                <span style="color: var(--primary);">#${act.step}:</span> ${renderInteractiveGerman(act.actionDE, act.actionTR)}
              </div>
              <div class="inline-bilingual-tr" style="margin-top: 3px;">🇹🇷 ${escapeHtml(act.actionTR)}</div>
              <div class="melis-action-rationale">
                <strong>Warum?</strong> ${renderInteractiveGerman(act.whyDE, act.whyTR)}
                <div class="inline-bilingual-tr" style="margin-top: 2px;">🇹🇷 ${escapeHtml(act.whyTR)}</div>
              </div>
            </div>
          `).join('')}

          <div class="melis-followup-probe">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <strong style="color: var(--primary);">👨‍⚕️ ${renderInteractiveGerman(threeActionsChallenge.examinerFollowupDE, threeActionsChallenge.examinerFollowupTR)}</strong>
              <button class="btn-card-action btn-pronounce-card" style="padding: 2px 8px; font-size: var(--font-xs);" data-text="${escapeHtml(threeActionsChallenge.examinerFollowupDE + ' ' + threeActionsChallenge.examinerJustificationDE)}">
                🔊 ${state.viewMode === 'german' ? 'Anhören' : 'Dinle'}
              </button>
            </div>
            <div class="inline-bilingual-tr" style="margin-top: 2px;">🇹🇷 ${escapeHtml(threeActionsChallenge.examinerFollowupTR)}</div>
            <details class="melis-followup-details">
              <summary class="melis-followup-summary" title="First-Principles-Antwort aufdecken">
                <span>💡 ${state.viewMode === 'german' ? 'First-Principles-Antwort aufdecken' : 'First-Principles-Antwort aufdecken (Jüri Yanıtını Göster)'}</span>
                <span class="melis-drawer-caret">▾</span>
              </summary>
              <div class="melis-followup-answer-body">
                ${renderInteractiveGerman(threeActionsChallenge.examinerJustificationDE, threeActionsChallenge.examinerJustificationTR)}
                <div class="inline-bilingual-tr" style="margin-top: 3px;">🇹🇷 ${escapeHtml(threeActionsChallenge.examinerJustificationTR)}</div>
              </div>
            </details>
          </div>
        </div>
      ` : '';

      const dosagesHtml = (groundTruth && groundTruth.dosages && groundTruth.dosages.length > 0) ? (() => {
        const gTitleDE = `${groundTruth.guideline.title} (${groundTruth.guideline.awmf}) — Wichtigste Dosierungen:`;
        const gTitleTR = `${groundTruth.guideline.title_tr || groundTruth.guideline.title} (${groundTruth.guideline.awmf}) — En Önemli Dozlar:`;
        return `
          <div class="study-guideline-dosage-box" style="margin-top: 0;">
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
      })() : '';

      const interventionHtml = q.examiner_intervention ? `
        <div class="study-examiner-intervention-box">
          <div class="study-examiner-intervention-title">
            <span>⚡</span> Prüfer-Intervention (Akute Krise):
          </div>
          <div class="answer-body-text">
            ${renderInteractiveGerman(q.examiner_intervention, q.examiner_intervention_tr)}
          </div>
          <div class="inline-bilingual-tr">🇹🇷 ${escapeHtml(q.examiner_intervention_tr || '')}</div>
          ${q.examiner_answer ? `
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(245, 158, 11, 0.3);">
              <strong style="color: var(--text-primary); font-size: var(--font-base);">🎯 Sofort-Antwort:</strong>
              <div class="answer-body-text" style="margin-top: 4px;">
                ${renderInteractiveGerman(q.examiner_answer, q.examiner_answer_tr)}
              </div>
              <div class="inline-bilingual-tr">🇹🇷 ${escapeHtml(q.examiner_answer_tr || '')}</div>
            </div>
          ` : ''}
        </div>
      ` : '';

      const tipHtml = q.examiner_tip ? `
        <div class="study-examiner-tip-box">
          <div class="study-examiner-tip-title">
            <span>💡</span> Prüfer-Tipp &amp; K.O.-Kriterium:
          </div>
          <div class="answer-body-text">
            ${renderInteractiveGerman(q.examiner_tip, q.examiner_tip_tr)}
          </div>
          <div class="inline-bilingual-tr">🇹🇷 ${escapeHtml(q.examiner_tip_tr || '')}</div>
        </div>
      ` : '';

      const examinerProfileHtml = q.examiner_profile ? (() => {
        const ep = q.examiner_profile;
        return `
          <div class="study-examiner-profile-box">
            <div class="study-examiner-profile-header">
              <span>🏛️</span> ${escapeHtml(ep.name || 'Prüfungskommission')} (${escapeHtml(ep.hospital || 'Universitätsklinikum')})
            </div>
            <div style="font-size: var(--font-sm); color: var(--text-secondary); line-height: 1.55;">
              <div>
                <strong>🎯 Schwerpunkt:</strong> ${renderInteractiveGerman(ep.focus || '', ep.focus_tr)}
                ${ep.focus_tr ? `<div class="inline-bilingual-tr" style="margin-top: 2px;">🇹🇷 ${escapeHtml(ep.focus_tr)}</div>` : ''}
              </div>
              ${ep.trap ? `
                <div style="margin-top: 2px; color: #b45309;">
                  <strong>⚠️ Prüfungsfalle:</strong> ${renderInteractiveGerman(ep.trap, ep.trap_tr)}
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
      })() : '';

      const hasDrawer2 = !!(dosagesHtml || interventionHtml || tipHtml || examinerProfileHtml);
      const hasDrawer3 = !!(firstPrinciples || examSynthesis || bedsideComm);

      const hasQuickActions = !!(threeActionsChallenge && Array.isArray(threeActionsChallenge.firstThreeActions) && threeActionsChallenge.firstThreeActions.length > 0);
      const trapDE = (q.examiner_profile && q.examiner_profile.trap) ? q.examiner_profile.trap : (q.examiner_tip || '');
      const trapTR = (q.examiner_profile && q.examiner_profile.trap) ? (q.examiner_profile.trap_tr || '') : (q.examiner_tip_tr || '');

      const cheatStripHtml = (hasQuickActions || trapDE) ? `
        <div class="melis-30sec-cheat-strip">
          ${hasQuickActions ? `
            <div class="melis-30sec-actions-row">
              <span class="melis-30sec-tag">⚡ 30s-Fokus:</span>
              <span class="melis-30sec-actions-text">
                ${threeActionsChallenge.firstThreeActions.map((act, i) => `
                  <span class="melis-30sec-step"><strong>${i + 1}.</strong> ${renderInteractiveGerman(act.actionDE, act.actionTR)}</span>
                `).join('<span class="melis-30sec-sep"> · </span>')}
              </span>
            </div>
            <div class="inline-bilingual-tr melis-30sec-tr">
              🇹🇷 ${threeActionsChallenge.firstThreeActions.map((act, i) => `${i + 1}. ${escapeHtml(act.actionTR || act.actionDE)}`).join(' · ')}
            </div>
          ` : ''}
          ${trapDE ? `
            <div class="melis-30sec-ko-row">
              <span class="melis-30sec-ko-badge">⚠️ K.O.:</span>
              <span>${renderInteractiveGerman(trapDE, trapTR)}</span>
            </div>
            ${trapTR ? `<div class="inline-bilingual-tr melis-30sec-tr">🇹🇷 ${escapeHtml(trapTR)}</div>` : ''}
          ` : ''}
        </div>
      ` : '';

      const redTextDE = redeflussStep1 ? (redeflussStep1.de || redeflussStep1.textDE || '') : '';
      const mainCardAudioText = [
        questionDE ? `Prüferfrage: ${questionDE}` : '',
        redTextDE ? `Redeeinstieg: ${redTextDE}` : '',
        answerDE ? `Musterantwort: ${answerDE}` : '',
        trapDE ? `K.O.-Tipp: ${trapDE}` : ''
      ].filter(Boolean).join('\n\n');

      html += `
        <article class="study-card ${isRead ? 'is-read' : ''}" id="card-${q.id}" data-id="${q.id}">
          <div class="card-header-bar">
            <div class="card-badges">
              <span class="badge-case-number">#${globalIndex || (idx + 1)}</span>
              <span class="badge-category">${escapeHtml(q.category || 'Anästhesie')}</span>
              ${priorityBadge}
            </div>

            <div class="card-actions-top">
              <button class="btn-card-action btn-star-card ${isStarred ? 'starred' : ''}" data-id="${q.id}" title="Kritik Vaka Olarak Yıldızla">
                <span>⭐</span>
              </button>
              <button class="btn-card-action btn-pronounce-card" data-text="${escapeHtml(mainCardAudioText)}" title="Almanca Soru, Redeeinstieg, Model Cevap ve K.O.-İpucunu Sesli Dinle">
                <span>🔊</span> ${state.viewMode === 'german' ? 'Anhören' : 'Dinle'}
              </button>
              <button class="btn-card-action btn-toggle-read ${isRead ? 'active-read' : ''}" data-id="${q.id}">
                <span>${isRead ? '✓' : '○'}</span> ${state.viewMode === 'german' ? 'Gelesen' : 'Okundu'}
              </button>
            </div>
          </div>

          <!-- 👨‍⚕️ PRÜFER-FRAGE -->
          <div class="oral-question-card-box">
            <div class="oral-role-badge examiner-role-badge" title="🇹🇷 Sözlü Sınav Sorusu">
              <span>👨‍⚕️</span> Prüfer-Frage
            </div>
            <div class="oral-question-text">
              ${renderFormattedOralQuestion(questionDE, questionTR)}
            </div>
          </div>

          ${state.activeRecallMode && (monitorData || threeActionsChallenge) ? `
            ${monitorHtml}
            ${threeActionsChallenge ? `
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
                <details class="melis-self-check-details">
                  <summary class="melis-self-check-summary">✍️ Kendi İlk 3 Hamlemi Yaz / Kontrol Et (İsteğe Bağlı)</summary>
                  <div class="melis-self-check-inputs">
                    <input type="text" class="melis-step-input" placeholder="1. Acil Hamle (örn. 100% O₂, Kauter Stopp, ABCDE)..." />
                    <input type="text" class="melis-step-input" placeholder="2. Acil Hamle (örn. Nedensel ilaç / Doz)..." />
                    <input type="text" class="melis-step-input" placeholder="3. Acil Hamle (örn. Monitörizasyon / K.O. önlemi)..." />
                  </div>
                </details>
                <button type="button" class="btn-reveal-turn" data-card-id="${q.id}" title="${isTurnHidden ? '🇹🇷 İlk 3 Hamlemi Düşündüm — Uzman Cevabını Aç' : '🇹🇷 Kendimi Test Etmek İçin Cevabı Gizle'}">
                  ${isTurnHidden
                    ? '🎯 Erste 3 Maßnahmen &amp; Musterantwort aufdecken'
                    : '🔒 Erste 3 Maßnahmen &amp; Musterantwort ausblenden'}
                </button>
              </div>
            ` : ''}
          ` : ''}

          <!-- REVEALABLE CLINICAL TURN CONTAINER -->
          <div id="turn-reveal-${q.id}" class="${isTurnHidden ? 'melis-hidden-turn' : ''}">

            ${state.activeRecallMode && threeActionsHtml ? `<div style="margin-top: 12px;">${threeActionsHtml}</div>` : ''}

            <!-- 🩺 FACHARZT-MUSTERANTWORT -->
            <div class="oral-answer-card-box">
              <div class="oral-role-badge candidate-role-badge" title="🇹🇷 Örnek Uzman Cevabı">
                <span>🩺</span> Facharzt-Musterantwort
              </div>
              ${redeflussStep1 ? `
                <div class="melis-inline-redeeinstieg">
                  <span>🗣️ „${renderInteractiveGerman(redeflussStep1.de || redeflussStep1.textDE, redeflussStep1.tr || redeflussStep1.textTR)}“</span>
                  <button class="btn-card-action btn-pronounce-card" style="padding: 2px 7px; font-size: var(--font-xs); flex-shrink: 0;" data-text="${escapeHtml(redeflussStep1.de || redeflussStep1.textDE || '')}" title="Redeeinstieg dinle">🔊</button>
                </div>
                <div class="inline-bilingual-tr" style="margin-bottom: 10px;">
                  🇹🇷 "${escapeHtml(redeflussStep1.tr || redeflussStep1.textTR || '')}"
                </div>
              ` : ''}
              ${cheatStripHtml}
              <div class="oral-answer-content">
                ${renderFormattedOralAnswer(answerDE, answerTR)}
              </div>
            </div>

            ${((!state.activeRecallMode && (monitorData || threeActionsChallenge)) || hasDrawer2 || hasDrawer3) ? `
              <div class="melis-deep-dive-grid">
                ${!state.activeRecallMode && (monitorData || threeActionsChallenge) ? `
                  <details class="melis-module-details">
                    <summary class="melis-module-summary" title="🇹🇷 Monitör, Kan Gazı (BGA) ve İlk 3 Acil Hamle">
                      <span>📟 Monitor, BGA &amp; Erste 3 Maßnahmen</span>
                      <span class="melis-drawer-caret">▾</span>
                    </summary>
                    <div class="melis-module-body">
                      ${monitorHtml}
                      ${threeActionsHtml}
                    </div>
                  </details>
                ` : ''}

                ${hasDrawer2 ? `
                  <details class="melis-module-details">
                    <summary class="melis-module-summary" title="🇹🇷 Kılavuz Dozları, Jüri Müdahalesi & K.O. İpucu">
                      <span>💊 Dosierungen, K.O.-Tipp &amp; Prüfer-Profil</span>
                      <span class="melis-drawer-caret">▾</span>
                    </summary>
                    <div class="melis-module-body">
                      ${dosagesHtml}
                      ${interventionHtml}
                      ${tipHtml}
                      ${examinerProfileHtml}
                    </div>
                  </details>
                ` : ''}

                ${hasDrawer3 ? `
                  <details class="melis-module-details">
                    <summary class="melis-module-summary" title="🇹🇷 Patofizyoloji, 3 Kademeli Sınav Sentezi ve Klinik Almanca">
                      <span>🧠 First-Principles, 3-Stufen-Synthese &amp; Klinik-Deutsch</span>
                      <span class="melis-drawer-caret">▾</span>
                    </summary>
                    <div class="melis-module-body">
                      ${firstPrinciples ? `
                        <div class="melis-sub-section">
                          <div class="melis-formula-pill">📐 ${escapeHtml(firstPrinciples.formulaOrPrinciple)}</div>
                          <div style="margin-bottom: 10px;">
                            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:3px;">
                              <strong style="color: var(--primary);">⚙️ Pathophysiologisches Prinzip:</strong>
                              <button class="btn-card-action btn-pronounce-card" style="padding: 2px 8px; font-size: var(--font-xs);" data-text="${escapeHtml(firstPrinciples.mechanismDE)}">🔊 Dinle</button>
                            </div>
                            <div>${renderInteractiveGerman(firstPrinciples.mechanismDE, firstPrinciples.mechanismTR)}</div>
                            <div class="inline-bilingual-tr" style="margin-top: 3px;">🇹🇷 ${escapeHtml(firstPrinciples.mechanismTR)}</div>
                          </div>
                          <div style="padding-top: 8px; border-top: 1px dashed var(--border-color);">
                            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:3px;">
                              <strong style="color: var(--text-primary);">💊 Pharmakologische Kinetik:</strong>
                              <button class="btn-card-action btn-pronounce-card" style="padding: 2px 8px; font-size: var(--font-xs);" data-text="${escapeHtml(firstPrinciples.pharmacologyDE)}">🔊 Dinle</button>
                            </div>
                            <div>${renderInteractiveGerman(firstPrinciples.pharmacologyDE, firstPrinciples.pharmacologyTR)}</div>
                            <div class="inline-bilingual-tr" style="margin-top: 3px;">🇹🇷 ${escapeHtml(firstPrinciples.pharmacologyTR)}</div>
                          </div>
                        </div>
                      ` : ''}

                      ${examSynthesis ? (() => {
                        const renderTierItem = (it) => {
                          const plainDE = (it.de || '').replace(/<[^>]+>/g, '');
                          const plainTR = (it.tr || '').replace(/<[^>]+>/g, '');
                          return `<div style="margin-bottom:4px;">• <span class="trans-interactive" data-tr="${escapeHtml(plainTR)}" data-de="${escapeHtml(plainDE)}">${plainDE}</span><div class="inline-bilingual-tr" style="color:var(--text-muted); font-size:var(--font-sm);">🇹🇷 ${it.tr}</div></div>`;
                        };
                        return `
                          <div class="melis-sub-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-subtle);">
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
                        `;
                      })() : ''}

                      ${bedsideComm ? `
                        <div class="melis-sub-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-subtle);">
                          <div style="margin-bottom: 10px;">
                            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:3px;">
                              <strong style="color: var(--primary);" title="🇹🇷 Sabah Toplantısı &amp; Kıdemli Devri">🏥 Frühbesprechung:</strong>
                              <button class="btn-card-action btn-pronounce-card" style="padding: 2px 8px; font-size: var(--font-xs);" data-text="${escapeHtml(bedsideComm.fruehbesprechungDE)}">🔊 Dinle</button>
                            </div>
                            <div style="font-style: italic;">${renderInteractiveGerman(bedsideComm.fruehbesprechungDE, bedsideComm.fruehbesprechungTR)}</div>
                            <div class="inline-bilingual-tr" style="margin-top: 3px;">🇹🇷 ${escapeHtml(bedsideComm.fruehbesprechungTR)}</div>
                          </div>
                          <div style="margin-bottom: 10px; padding-top: 8px; border-top: 1px dashed var(--border-color);">
                            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:3px;">
                              <strong style="color: var(--accent-emerald);" title="🇹🇷 Hasta/Yakını Aydınlatma Cümlesi">🤝 Prämedikationsgespräch:</strong>
                              <button class="btn-card-action btn-pronounce-card" style="padding: 2px 8px; font-size: var(--font-xs);" data-text="${escapeHtml(bedsideComm.praemedikationDE)}">🔊 Dinle</button>
                            </div>
                            <div style="font-style: italic;">${renderInteractiveGerman(bedsideComm.praemedikationDE, bedsideComm.praemedikationTR)}</div>
                            <div class="inline-bilingual-tr" style="margin-top: 3px;">🇹🇷 ${escapeHtml(bedsideComm.praemedikationTR)}</div>
                          </div>
                          <div style="padding-top: 8px; border-top: 1px dashed var(--border-color);">
                            <strong style="color: #b45309; font-size: var(--font-base);" title="🇹🇷 Hastane Kısaltmaları">🔤 Klinik-Jargon &amp; Abkürzungen:</strong>
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
                      ` : ''}
                    </div>
                  </details>
                ` : ''}
              </div>
            ` : ''}

          </div>
        </article>
      `;
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

  let autoReadObserver = null;
  const autoReadTimers = new Map();

  function setCardReadStatus(id, isRead, opts = {}) {
    const card = document.getElementById(`card-${id}`);
    const btn = card ? card.querySelector('.btn-toggle-read') : document.querySelector(`.btn-toggle-read[data-id="${id}"]`);
    const label = state.viewMode === 'german' ? 'Gelesen' : 'Okundu';

    if (isRead) {
      readStatus[id] = true;
      if (btn) {
        btn.classList.add('active-read');
        btn.innerHTML = `<span>✓</span> ${label}`;
      }
      if (card) card.classList.add('is-read');
      recordDailyRead(id, true);
      if (opts.haptic) triggerHapticFeedback();
      if (opts.autoScroll && card) {
        const nextCard = card.nextElementSibling;
        if (nextCard && nextCard.classList && nextCard.classList.contains('study-card')) {
          setTimeout(() => {
            nextCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 220);
        }
      }
    } else {
      delete readStatus[id];
      if (btn) {
        btn.classList.remove('active-read');
        btn.innerHTML = `<span>○</span> ${label}`;
      }
      if (card) card.classList.remove('is-read');
      recordDailyRead(id, false);
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
  }

  function setupAutoReadObserver() {
    if (autoReadObserver) {
      autoReadObserver.disconnect();
      autoReadObserver = null;
    }
    autoReadTimers.forEach(t => clearTimeout(t));
    autoReadTimers.clear();

    if (typeof IntersectionObserver === 'undefined') return;
    const studyWrapper = document.getElementById('study-view-wrapper');

    autoReadObserver = new IntersectionObserver((entries) => {
      if (studyWrapper && studyWrapper.style.display === 'none') return;
      entries.forEach(entry => {
        const card = entry.target;
        const id = card.id ? card.id.replace(/^card-/, '') : '';
        if (!id || readStatus[id]) {
          autoReadObserver.unobserve(card);
          return;
        }
        if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
          if (!autoReadTimers.has(id)) {
            const timer = setTimeout(() => {
              autoReadTimers.delete(id);
              if (studyWrapper && studyWrapper.style.display === 'none') return;
              if (!readStatus[id] && document.body.contains(card)) {
                setCardReadStatus(id, true, { autoScroll: false, haptic: false });
                if (autoReadObserver) autoReadObserver.unobserve(card);
              }
            }, 2500);
            autoReadTimers.set(id, timer);
          }
        } else if (autoReadTimers.has(id)) {
          clearTimeout(autoReadTimers.get(id));
          autoReadTimers.delete(id);
        }
      });
    }, { threshold: [0.45] });

    document.querySelectorAll('.study-card').forEach(card => {
      const id = card.id ? card.id.replace(/^card-/, '') : '';
      if (id && !readStatus[id]) {
        autoReadObserver.observe(card);
      }
    });
  }

  // --- Attach Interactive Event Listeners to Rendered Cards ---
  function attachCardEventListeners() {
    document.querySelectorAll('.btn-toggle-read').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const nextRead = !readStatus[id];
        if (autoReadTimers.has(id)) {
          clearTimeout(autoReadTimers.get(id));
          autoReadTimers.delete(id);
        }
        if (!nextRead && autoReadObserver) {
          const card = document.getElementById(`card-${id}`);
          if (card) autoReadObserver.unobserve(card);
        }
        setCardReadStatus(id, nextRead, { autoScroll: nextRead, haptic: nextRead });
      });
    });
    setupAutoReadObserver();

    document.querySelectorAll('.btn-star-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const nextVal = !starredStatus[id];
        if (nextVal) {
          starredStatus[id] = true;
          btn.classList.add('starred');
          triggerHapticFeedback();
        } else {
          delete starredStatus[id];
          btn.classList.remove('starred');
        }
        localStorage.setItem(STORAGE_KEY_STARRED, JSON.stringify(starredStatus));
        try {
          const appState = JSON.parse(localStorage.getItem(APP_STATE_KEY) || '{}');
          appState.flagged = appState.flagged || {};
          appState.flagged[id] = nextVal;
          localStorage.setItem(APP_STATE_KEY, JSON.stringify(appState));
          if (window.StorageSync && typeof window.StorageSync.pushToCloud === 'function') {
            window.StorageSync.pushToCloud(appState);
          }
        } catch (err) {
          console.warn('[StudySync] Star sync failed:', err);
        }
        if (state.activeStatusFilter === 'starred') renderFeed(false);
      });
    });

    document.querySelectorAll('.btn-pronounce-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-text');
        speakGerman(text, btn);
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
        if (state.viewMode !== 'hover') return;
        if (isTouchDevice) return;
        const tr = el.getAttribute('data-tr');
        if (!tr) return;
        showDesktopTooltip(el, tr);
      });

      el.addEventListener('mouseleave', () => {
        if (!isTouchDevice) hideDesktopTooltip();
      });

      el.addEventListener('click', (e) => {
        if (state.viewMode !== 'hover') return;
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

    // Collapsible Turkish translation blocks (like Exam Mode)
    document.querySelectorAll('.study-card div.inline-bilingual-tr').forEach(trBox => {
      if (trBox.dataset.trCollapsibleInit) return;
      if (!trBox.textContent || !trBox.textContent.trim()) return;
      trBox.dataset.trCollapsibleInit = '1';

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'btn-toggle-tr-inline';
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.textContent = '🇹🇷 Türkçe Çeviri ▾';
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = trBox.classList.toggle('is-open');
        toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        toggleBtn.textContent = isOpen ? '🇹🇷 Çeviriyi Gizle ▴' : '🇹🇷 Türkçe Çeviri ▾';
      });
      trBox.parentNode.insertBefore(toggleBtn, trBox);
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
      if (activeUtteranceText) speakGerman(activeUtteranceText, elBtnSheetPronounce);
    });
  }

  function normalizeMedicalGermanForTTS(rawText) {
    if (!rawText) return '';
    let text = String(rawText);

    // Strip HTML, markdown, graphic symbols, and emojis
    text = text.replace(/<[^>]*>/g, ' ');
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/\*([^*]+)\*/g, '$1');
    text = text.replace(/__([^_]+)__/g, '$1');
    text = text.replace(/`([^`]+)`/g, '$1');
    text = text.replace(/->|→|=>|▸|•/g, ' ');
    text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ');

    // Normalize Unicode subscripts/superscripts & chemical ions
    text = text
      .replace(/SpO₂/g, 'SpO2')
      .replace(/SaO₂/g, 'SaO2')
      .replace(/[Ee]tCO₂/g, 'etCO2')
      .replace(/PaCO₂/g, 'PaCO2')
      .replace(/pCO₂/g, 'pCO2')
      .replace(/PaO₂/g, 'PaO2')
      .replace(/pO₂/g, 'pO2')
      .replace(/FiO₂/g, 'FiO2')
      .replace(/cmH₂O/g, 'cmH2O')
      .replace(/NaHCO₃/g, 'Natriumbikarbonat')
      .replace(/HCO₃⁻/g, 'Bikarbonat')
      .replace(/CO₂/g, 'CO2')
      .replace(/O₂/g, 'O2')
      .replace(/H₂O/g, 'H2O')
      .replace(/K⁺/g, 'Kalium')
      .replace(/Na⁺/g, 'Natrium')
      .replace(/Ca²⁺/g, 'Kalzium')
      .replace(/Mg²⁺/g, 'Magnesium')
      .replace(/Cl⁻/g, 'Chlorid')
      .replace(/H⁺/g, 'Wasserstoffionen');

    // Ratios, decimals, ranges
    text = text.replace(/\b1\s*:\s*10\.?000\b/g, 'eins zu zehntausend');
    text = text.replace(/\b1\s*:\s*100\.?000\b/g, 'eins zu einhunderttausend');
    text = text.replace(/\b1\s*:\s*200\.?000\b/g, 'eins zu zweihunderttausend');
    text = text.replace(/\b1\s*:\s*1\b/g, 'eins zu eins');
    text = text.replace(/(\d)\.(\d)/g, '$1,$2');
    text = text.replace(/(\d+(?:,\d+)?)\s*[–—-]\s*(\d+(?:,\d+)?)/g, '$1 bis $2');

    // Blood pressure & hemodynamics
    text = text.replace(/\b(?:RR|Blutdruck)\s*[:=]?\s*(\d{2,3})\s*[/\\]\s*(\d{2,3})\s*(?:mmHg)?\b/gi, 'Blutdruck $1 zu $2 Millimeter Quecksilbersäule');
    text = text.replace(/\bRR\s*[:=]?\s*(\d{2,3})\b/gi, 'Blutdruck $1');
    text = text.replace(/\bRR\b/g, 'Blutdruck');
    text = text.replace(/\bMAP\b/g, 'mittlerer arterieller Druck');
    text = text.replace(/\bZVD\b/g, 'zentraler Venendruck');
    text = text.replace(/\bSVR\b/g, 'systemischer Gefäßwiderstand');
    text = text.replace(/\bHZV\b/g, 'Herzzeitvolumen');
    text = text.replace(/\bHF\b/g, 'Herzfrequenz');
    text = text.replace(/(\d+)\s*\/\s*min\b/gi, '$1 pro Minute');

    // Ventilation & BGA
    text = text.replace(/\b(?:SpO2|SaO2)\b/gi, 'Sauerstoffsättigung');
    text = text.replace(/\betCO2\b/gi, 'endexspiratorisches CO2');
    text = text.replace(/\bFiO2\b/gi, 'F i O zwei');
    text = text.replace(/\b(?:PaCO2|pCO2)\b/gi, 'P C O zwei');
    text = text.replace(/\b(?:PaO2|pO2)\b/gi, 'P O zwei');
    text = text.replace(/\bBGA\b/gi, 'Blutgasanalyse');
    text = text.replace(/\bBE\b/g, 'Base Excess');
    text = text.replace(/\bAF\b/g, 'Atemfrequenz');

    // Dosages & units (longest patterns first)
    text = text.replace(/(\d+(?:,\d+)?)\s*(?:µg|mcg)\s*\/\s*kg\s*\/\s*min\b/gi, '$1 Mikrogramm pro Kilogramm pro Minute');
    text = text.replace(/(\d+(?:,\d+)?)\s*mg\s*\/\s*kg\s*\/\s*h\b/gi, '$1 Milligramm pro Kilogramm pro Stunde');
    text = text.replace(/(\d+(?:,\d+)?)\s*mg\s*\/\s*kg(?:\s*KG)?\b/gi, '$1 Milligramm pro Kilogramm Körpergewicht');
    text = text.replace(/(\d+(?:,\d+)?)\s*(?:µg|mcg)\s*\/\s*kg(?:\s*KG)?\b/gi, '$1 Mikrogramm pro Kilogramm Körpergewicht');
    text = text.replace(/(\d+(?:,\d+)?)\s*ml\s*\/\s*kg(?:\s*KG)?\b/gi, '$1 Milliliter pro Kilogramm Körpergewicht');
    text = text.replace(/\b(?:µg|mcg)\s*\/\s*kg\s*\/\s*min\b/gi, 'Mikrogramm pro Kilogramm pro Minute');
    text = text.replace(/\bmg\s*\/\s*kg\s*\/\s*h\b/gi, 'Milligramm pro Kilogramm pro Stunde');
    text = text.replace(/\bmg\s*\/\s*kg(?:\s*KG)?\b/gi, 'Milligramm pro Kilogramm');
    text = text.replace(/\b(?:µg|mcg)\s*\/\s*kg(?:\s*KG)?\b/gi, 'Mikrogramm pro Kilogramm');
    text = text.replace(/\bmmol\s*\/\s*l\b/gi, 'Millimol pro Liter');
    text = text.replace(/\bmg\s*\/\s*dl\b/gi, 'Milligramm pro Deziliter');
    text = text.replace(/\bg\s*\/\s*dl\b/gi, 'Gramm pro Deziliter');
    text = text.replace(/\bmmHg\b/gi, 'Millimeter Quecksilbersäule');
    text = text.replace(/\bcmH2O\b/gi, 'Zentimeter Wassersäule');
    text = text.replace(/(\d+(?:,\d+)?)\s*(?:µg|mcg)\b/gi, '$1 Mikrogramm');
    text = text.replace(/(\d+(?:,\d+)?)\s*mg\b/gi, '$1 Milligramm');
    text = text.replace(/(\d+(?:,\d+)?)\s*ml\b/gi, '$1 Milliliter');
    text = text.replace(/(\d+(?:,\d+)?)\s*kg(?:\s*KG)?\b/gi, '$1 Kilogramm');
    text = text.replace(/\b(?:µg|mcg)\b/gi, 'Mikrogramm');
    text = text.replace(/\bkg\s+KG\b/gi, 'Kilogramm Körpergewicht');
    text = text.replace(/\bIE\b/g, 'Internationale Einheiten');

    // Routes & clinical abbreviations
    text = text.replace(/\bi\.\s*v\./gi, 'intravenös');
    text = text.replace(/\bi\.\s*m\./gi, 'intramuskulär');
    text = text.replace(/\bs\.\s*c\./gi, 'subkutan');
    text = text.replace(/\bp\.\s*o\./gi, 'per os');
    text = text.replace(/\bi\.\s*a\./gi, 'intraarteriell');
    text = text.replace(/\bi\.\s*o\./gi, 'intraossär');
    text = text.replace(/\bz\.\s*B\./gi, 'zum Beispiel');
    text = text.replace(/\bu\.\s*a\./gi, 'unter anderem');
    text = text.replace(/\bd\.\s*h\./gi, 'das heißt');
    text = text.replace(/\bbzw\./gi, 'beziehungsweise');
    text = text.replace(/\bggf\./gi, 'gegebenenfalls');
    text = text.replace(/\bca\./gi, 'circa');
    text = text.replace(/\bV\.\s*a\./gi, 'Verdacht auf');
    text = text.replace(/\bZ\.\s*n\./gi, 'Zustand nach');
    text = text.replace(/\bSHT\b/g, 'Schädel-Hirn-Trauma');
    text = text.replace(/\bLAE\b/g, 'Lungenarterienembolie');
    text = text.replace(/\bLAST\b/g, 'Lokalanästhetika-Intoxikation');
    text = text.replace(/\bMH\b/g, 'Maligne Hyperthermie');
    text = text.replace(/\bCICO\b/g, 'Cannot Intubate Cannot Oxygenate');
    text = text.replace(/\bSPA\b/g, 'Spinalanästhesie');
    text = text.replace(/\bEDA\b/g, 'Epiduralanästhesie');
    text = text.replace(/\bPDK\b/g, 'Periduralkatheter');
    text = text.replace(/\bZVK\b/g, 'zentraler Venenkatheter');
    text = text.replace(/\bITN\b/g, 'Intubationsnarkose');
    text = text.replace(/\bKÖF\b/g, 'Klappenöffnungsfläche');

    // Smooth pauses & whitespace
    text = text.replace(/\n+/g, '. ');
    text = text.replace(/([A-Za-zÄÖÜäöüß])\/([A-Za-zÄÖÜäöüß])/g, '$1 oder $2');
    text = text.replace(/\.{2,}/g, '.');
    text = text.replace(/\s+/g, ' ');
    return text.trim();
  }

  function chunkGermanForTTS(text, maxLen = 220) {
    if (!text) return [];
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    const chunks = [];
    let current = '';
    for (const s of sentences) {
      if (!current) {
        current = s;
      } else if ((current + ' ' + s).length <= maxLen) {
        current += ' ' + s;
      } else {
        chunks.push(current);
        current = s;
      }
    }
    if (current) chunks.push(current);
    return chunks.length ? chunks : [text];
  }

  let currentSpeakingBtn = null;
  let speechSessionId = 0;

  function resetSpeakingButton(btn) {
    if (!btn) return;
    btn.classList.remove('is-speaking');
    if (btn.dataset.origHtml) {
      btn.innerHTML = btn.dataset.origHtml;
    }
  }

  function speakGerman(text, btnEl = null) {
    if (!('speechSynthesis' in window) || !text) return;

    const isSameBtnActive = !!(
      btnEl &&
      currentSpeakingBtn === btnEl &&
      (window.speechSynthesis.speaking || window.speechSynthesis.pending || btnEl.classList.contains('is-speaking'))
    );

    if (isSameBtnActive) {
      speechSessionId++;
      window.speechSynthesis.cancel();
      resetSpeakingButton(currentSpeakingBtn);
      currentSpeakingBtn = null;
      return;
    }

    const mySession = ++speechSessionId;
    window.speechSynthesis.cancel();
    if (currentSpeakingBtn) {
      resetSpeakingButton(currentSpeakingBtn);
      currentSpeakingBtn = null;
    }

    const normalized = normalizeMedicalGermanForTTS(text);
    const chunks = chunkGermanForTTS(normalized);
    if (!chunks.length) return;

    if (btnEl) {
      if (!btnEl.dataset.origHtml) {
        btnEl.dataset.origHtml = btnEl.innerHTML;
      }
      currentSpeakingBtn = btnEl;
      btnEl.classList.add('is-speaking');
      btnEl.innerHTML = '<span>🔊</span> Durdur';
    }

    const voices = window.speechSynthesis.getVoices();
    const deVoice = voices.find(v => v.lang.startsWith('de') && (v.name.includes('Google') || v.name.includes('Anna') || v.name.includes('Martin') || v.name.includes('Natural')));

    let chunkIdx = 0;
    const finishPlayback = () => {
      if (mySession !== speechSessionId) return;
      if (btnEl) resetSpeakingButton(btnEl);
      if (currentSpeakingBtn === btnEl) currentSpeakingBtn = null;
    };

    const speakNextChunk = () => {
      if (mySession !== speechSessionId) return;
      if (chunkIdx >= chunks.length) {
        finishPlayback();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[chunkIdx++]);
      utterance.lang = 'de-DE';
      utterance.rate = 0.94;
      if (deVoice) utterance.voice = deVoice;
      utterance.onend = speakNextChunk;
      utterance.onerror = finishPlayback;
      window.speechSynthesis.speak(utterance);
    };

    speakNextChunk();
  }

  function triggerHapticFeedback() {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(12); } catch (_) {}
    }
  }

  function updateProgressBar() {
    const total = allQuestions.length;
    const readCount = allQuestions.filter(item => !!readStatus[item.id]).length;

    const dusItems = allQuestions.filter(isDusItem);
    const dusTotal = dusItems.length;
    const dusRead = dusItems.filter(item => !!readStatus[item.id]).length;

    const openItems = allQuestions.filter(isOpenItem);
    const openTotal = openItems.length;
    const openRead = openItems.filter(item => !!readStatus[item.id]).length;

    const optItems = allQuestions.filter(isOptionItem);
    const optTotal = optItems.length;
    const optRead = optItems.filter(item => !!readStatus[item.id]).length;

    let percentage = 0;
    let statusText = `${readCount} / ${total} Vaka`;

    const isDe = document.body.classList.contains('mode-german-only') || state.viewMode === 'german';
    if (state.activeType === 'options') {
      percentage = optTotal > 0 ? Math.round((optRead / optTotal) * 100) : 0;
      statusText = isDe
        ? `📚 Stufe 3 Themen: ${optRead} / ${optTotal} · Gesamt: ${readCount}/${total}`
        : `📚 Aşama 3 Konu: ${optRead} / ${optTotal} · Toplam: ${readCount}/${total}`;
    } else if (state.activeType === 'open') {
      percentage = openTotal > 0 ? Math.round((openRead / openTotal) * 100) : 0;
      statusText = isDe
        ? `🏥 Kernfälle: ${openRead} / ${openTotal} · Gesamt: ${readCount}/${total}`
        : `🏥 Çekirdek Vakalar: ${openRead} / ${openTotal} · Toplam: ${readCount}/${total}`;
    } else if (state.activeType === 'dus' || dusRead < dusTotal) {
      percentage = dusTotal > 0 ? Math.round((dusRead / dusTotal) * 100) : 0;
      if (dusTotal > 0 && dusRead >= dusTotal) {
        statusText = isDe
          ? `✅ ÄKNO Stufe 1 Fertig (${dusRead}/${dusTotal}) · Prüfungsbereit!`
          : `✅ ÄKNO Aşama 1 Tamam (${dusRead}/${dusTotal}) · Sınav Başvurusuna Hazırsın!`;
      } else {
        statusText = isDe
          ? `🏛️ ÄKNO Stufe 1: ${dusRead} / ${dusTotal} · Gesamt: ${readCount}/${total}`
          : `🏛️ ÄKNO Aşama 1: ${dusRead} / ${dusTotal} · Toplam: ${readCount}/${total}`;
      }
    } else if (openRead < openTotal) {
      percentage = openTotal > 0 ? Math.round((openRead / openTotal) * 100) : 0;
      statusText = isDe
        ? `✅ ÄKNO Fertig · 🏥 Stufe 2 Fälle: ${openRead} / ${openTotal}`
        : `✅ ÄKNO Tamam · 🏥 Aşama 2 Vaka: ${openRead} / ${openTotal}`;
    } else {
      percentage = total > 0 ? Math.round((readCount / total) * 100) : 0;
      statusText = isDe
        ? `🎓 Alle Fälle & Themen: ${readCount} / ${total}`
        : `🎓 Tüm Vaka & Konular: ${readCount} / ${total}`;
    }

    if (elProgressBarFill) elProgressBarFill.style.width = `${percentage}%`;
    if (elProgressPercentage) elProgressPercentage.textContent = isDe ? `${percentage}%` : `%${percentage}`;
    if (elProgressText) elProgressText.textContent = statusText;

    if (elStreakBadge) {
      const todayCount = getTodayReadCount();
      const streakDays = getCurrentStreakDays();
      const remainingCore = Math.max(0, openTotal - openRead);
      const daysLeft = Math.ceil(remainingCore / 8);
      const goalPrefix = todayCount >= 5 ? '✅' : '☕';
      const etaText = remainingCore > 0
        ? (isDe ? `⏳ ~${daysLeft} Tage` : `⏳ ~${daysLeft} gün`)
        : (isDe ? '🎓 Prüfungsreif!' : '🎓 Sınav Hazır!');
      const streakText = streakDays >= 2 ? ` · 🔥 ${streakDays}${isDe ? 'T' : 'g'}` : '';
      elStreakBadge.style.display = 'inline-flex';
      elStreakBadge.classList.toggle('goal-met', todayCount >= 5);
      elStreakBadge.textContent = isDe
        ? `${goalPrefix} Heute: ${todayCount}/5 · ${etaText}${streakText}`
        : `${goalPrefix} Bugün: ${todayCount}/5 · ${etaText}${streakText}`;
      elStreakBadge.title = `Günlük mikro hedef: 5 vaka (Bugün: ${todayCount}). Çekirdek sözlü vakalar (${openRead}/${openTotal}) günde 8 vaka hızıyla tahmini kalan süre: ${remainingCore > 0 ? daysLeft + ' gün' : 'Tamamlandı'}.`;
    }
  }

  function initCategories() {
    const cats = {};
    allQuestions.forEach(q => {
      const c = q.category || 'Allgemeine Anästhesie';
      cats[c] = (cats[c] || 0) + 1;
    });

    const sortedCats = Object.keys(cats).sort((a, b) => cats[b] - cats[a] || a.localeCompare(b, 'de'));

    let chipsHtml = `<button class="btn-cat-chip cat-grid-item active" data-cat="all" data-search="tüm konular alle themen"><span class="cat-name">Tüm Konular</span><span class="cat-count">${allQuestions.length}</span></button>`;
    sortedCats.forEach(cat => {
      chipsHtml += `<button class="btn-cat-chip cat-grid-item" data-cat="${escapeHtml(cat)}" data-search="${escapeHtml(cat.toLowerCase())}"><span class="cat-name">${escapeHtml(cat)}</span><span class="cat-count">${cats[cat]}</span></button>`;
    });

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

    function collapseCategoryDrawer() {
      if (!elCategoryScroll) return;
      elCategoryScroll.classList.add('collapsed');
      elCategoryScroll.classList.remove('expanded');
      if (elToggleCats) {
        elToggleCats.classList.remove('active');
        elToggleCats.setAttribute('aria-expanded', 'false');
      }
    }

    if (elCategoryScroll) {
      elCategoryScroll.innerHTML = `
        <div class="cat-drawer-search-row">
          <input type="search" class="cat-drawer-search-input" placeholder="🔍 Konu ara (${sortedCats.length} konu)..." aria-label="Konu ara" autocomplete="off" />
        </div>
        <div class="cat-drawer-grid">${chipsHtml}</div>
      `;

      const catSearchInput = elCategoryScroll.querySelector('.cat-drawer-search-input');
      const catChips = elCategoryScroll.querySelectorAll('.btn-cat-chip');

      if (catSearchInput) {
        catSearchInput.addEventListener('input', (e) => {
          const term = e.target.value.trim().toLowerCase();
          catChips.forEach(chip => {
            const hay = chip.getAttribute('data-search') || '';
            chip.style.display = (!term || hay.includes(term)) ? '' : 'none';
          });
        });
      }

      catChips.forEach(btn => {
        btn.addEventListener('click', () => {
          catChips.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.activeCategory = btn.getAttribute('data-cat');
          updateCategoryToggleLabel();
          collapseCategoryDrawer();
          renderFeed(true);
        });
      });
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
          const searchInp = elCategoryScroll.querySelector('.cat-drawer-search-input');
          if (searchInp) setTimeout(() => searchInp.focus(), 60);
        } else {
          collapseCategoryDrawer();
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

  const elQuickFilters = document.querySelectorAll('.btn-study-quick-filter');
  function syncQuickFilterButtons() {
    elQuickFilters.forEach(b => {
      const target = b.getAttribute('data-quick-filter');
      b.classList.toggle('active', state.activeStatusFilter === target);
    });
    if (elBtnBottomUnread) {
      elBtnBottomUnread.innerHTML = state.activeStatusFilter === 'unread'
        ? `<span class="nav-icon">🎯</span><span>Okunmayanlar</span>`
        : `<span class="nav-icon">📖</span><span>Tümü</span>`;
    }
  }
  if (elQuickFilters.length > 0) {
    elQuickFilters.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-quick-filter');
        state.activeStatusFilter = (state.activeStatusFilter === target) ? 'all' : target;
        syncQuickFilterButtons();
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
        syncUILanguage(mode === 'german');
        renderFeed(true);
      });
    });
  }

  function syncUILanguage(isGerman) {
    const setText = (sel, de, tr) => {
      const el = document.querySelector(sel);
      if (el) el.textContent = isGerman ? de : tr;
    };
    const setHtml = (sel, de, tr) => {
      const el = document.querySelector(sel);
      if (el) el.innerHTML = isGerman ? de : tr;
    };

    setText('#master-btn-study strong', 'Lernen & Lesen', 'Çalışma & Okuma');
    setText('#master-btn-exam strong', 'Prüfungssimulator', 'Sınav Simülatörü');
    setText('#nav-tools-menu-btn .pill-btn-text', 'Werkzeuge', 'Araçlar');
    setHtml('#study-btn-active-recall-toggle', '<span>🙈</span> Antworten ausblenden', '<span>🙈</span> Cevapları Gizle');
    setText('#study-aa-dropdown .aa-popover-label', 'Schriftgröße', 'Yazı Boyutu');

    const searchInp = document.getElementById('study-search-input');
    if (searchInp) searchInp.placeholder = isGerman ? 'Fall oder Medikament suchen...' : 'Vaka veya ilaç ara...';

    setText('#study-btn-toggle-categories', isGerman ? '📂 Themen ▾' : '📂 Konular ▾', '📂 Konular ▾');
    setText('#study-view-wrapper .btn-study-quick-filter[data-quick-filter="unread"]', '○ Ungelesen', '○ Okunmamış');
    setText('#study-view-wrapper .btn-study-quick-filter[data-quick-filter="starred"]', '⭐ Markiert', '⭐ Yıldızlı');
    setText('#study-btn-prev-bottom', '← Zurück', '← Önceki');
    setText('#study-btn-next-bottom', 'Weiter →', 'Sonraki →');

    if (typeof updateDynamicQuestionCounts === 'function') updateDynamicQuestionCounts();
    if (typeof updateProgressBar === 'function') updateProgressBar();
  }
  window.syncUILanguage = syncUILanguage;

  function updateGermanOnlyButtonState() {
    const mode = document.body.classList.contains('mode-german-only')
      ? 'german'
      : (document.body.classList.contains('mode-bilingual') ? 'bilingual' : (state.viewMode || 'hover'));
    const isGerman = mode === 'german';
    const flagText = mode === 'german' ? '🇩🇪' : (mode === 'bilingual' ? '🇩🇪 · 🇹🇷' : '🇩🇪💡');
    const titleText = mode === 'german'
      ? 'Nur Deutsch (Sadece Almanca)'
      : (mode === 'bilingual' ? 'Zweisprachig (Almanca + Türkçe)' : 'Hover Çeviri (Dokununca Türkçe)');
    const allGermanBtns = document.querySelectorAll('#btn-quick-german-toggle, #btn-global-german-toggle, .pill-btn-german, .btn-header-german');
    allGermanBtns.forEach(b => {
      b.classList.toggle('active', isGerman);
      b.title = titleText;
      const flagEl = b.querySelector('.pill-btn-flag');
      if (flagEl) {
        flagEl.textContent = flagText;
        return;
      }
      const label = b.querySelector('.btn-label') || b.querySelector('.pill-btn-text');
      if (label) {
        label.textContent = flagText;
      }
    });
  }

  function toggleGermanOnlyMode() {
    const modes = ['hover', 'bilingual', 'german'];
    const curMode = document.body.classList.contains('mode-german-only')
      ? 'german'
      : (document.body.classList.contains('mode-bilingual') ? 'bilingual' : (state.viewMode || 'hover'));
    const newMode = modes[(modes.indexOf(curMode) + 1) % modes.length];
    state.viewMode = newMode;
    saveSettings();

    document.body.classList.remove('mode-hover', 'mode-bilingual', 'mode-german-only');
    if (newMode === 'german') {
      document.body.classList.add('mode-german-only');
    } else if (newMode === 'bilingual') {
      document.body.classList.add('mode-bilingual');
    } else {
      document.body.classList.add('mode-hover');
    }

    if (elModeTabs) {
      elModeTabs.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-mode') === newMode);
      });
    }

    updateGermanOnlyButtonState();
    syncUILanguage(newMode === 'german');
    renderFeed(true);
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
      syncQuickFilterButtons();
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
      elActiveRecallToggle.innerHTML = '<span>⚡</span> Test Modu';
      elActiveRecallToggle.title = 'İlk 3 Hamle Test Modu: AÇIK (Tıkla ve Kapat)';
    } else {
      elActiveRecallToggle.classList.remove('active');
      elActiveRecallToggle.innerHTML = '<span>⚡</span> Test Modu';
      elActiveRecallToggle.title = 'Önce Vitals & Senaryoyu Gör, İlk 3 Acil Hamleni Düşün, Sonra Uzman Cevabını Aç';
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
    const isDe = document.body.classList.contains('mode-german-only') || state.viewMode === 'german';
    const totalCount = allQuestions.length;
    const dusCount = allQuestions.filter(isDusItem).length;
    const openCount = allQuestions.filter(isOpenItem).length;
    const optionsCount = allQuestions.filter(isOptionItem).length;

    document.querySelectorAll('.btn-type-filter').forEach(btn => {
      const t = btn.getAttribute('data-type');
      if (t === 'all') {
        btn.textContent = isDe ? `Alle (${totalCount})` : `Tümü (${totalCount})`;
        btn.title = isDe ? `Gesamtes Prüfungsarchiv (${totalCount})` : `Tüm Sözlü Sınav Arşivi (${totalCount})`;
      } else if (t === 'dus') {
        btn.textContent = `🏛️ ÄKNO (${dusCount})`;
        btn.title = isDe ? `ÄKNO Düsseldorf & AMBOSS Fallprotokolle (${dusCount})` : `ÄKNO Düsseldorf & AMBOSS Vaka Protokolleri (${dusCount})`;
      } else if (t === 'open') {
        btn.textContent = isDe ? `🏥 Fälle (${openCount})` : `🏥 Vaka (${openCount})`;
        btn.title = isDe ? `Klinische Fallfragen — Annecke & Hohn (${openCount})` : `Klinik Vaka Soruları — Annecke & Hohn (${openCount})`;
      } else if (t === 'options') {
        btn.textContent = isDe ? `📚 Themen (${optionsCount})` : `📚 Konu (${optionsCount})`;
        btn.title = isDe ? `Themenbasierte Prüfungsfragen (${optionsCount})` : `Konu Bazlı Sözlü Soru-Cevap (${optionsCount})`;
      }
    });
  }

  // --- Initial Bootstrap ---
  applyTheme(state.theme);
  applyFontSize(state.fontSize);
  applyActiveRecallMode(state.activeRecallMode);
  if (state.viewMode === 'bilingual') document.body.classList.add('mode-bilingual');
  if (state.viewMode === 'german') document.body.classList.add('mode-german-only');
  updateGermanOnlyButtonState();
  syncUILanguage(state.viewMode === 'german');

  updateDynamicQuestionCounts();
  initCategories();
  renderFeed(true);

  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }

  // Study view search keyboard UX: '/' focuses search, 'Escape' clears & blurs search
  document.addEventListener('keydown', (e) => {
    const studyWrapper = document.getElementById('study-view-wrapper');
    if (studyWrapper && studyWrapper.style.display === 'none') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const activeEl = document.activeElement;
    if (e.key === '/' && elSearchInput && (!activeEl || !['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName))) {
      e.preventDefault();
      elSearchInput.focus();
      elSearchInput.select();
    } else if (e.key === 'Escape') {
      if (elAaDropdown && elAaDropdown.classList.contains('open')) {
        elAaDropdown.classList.remove('open');
        if (elAaBtn) elAaBtn.setAttribute('aria-expanded', 'false');
        return;
      }
      if (elModalNotebook && elModalNotebook.style.display === 'flex') {
        elModalNotebook.style.display = 'none';
        return;
      }
      if (elMobileSheet && elMobileSheet.classList.contains('open')) {
        elMobileSheet.classList.remove('open');
        return;
      }
      if (elSearchInput && activeEl === elSearchInput) {
        if (elSearchInput.value) {
          elSearchInput.value = '';
          state.searchQuery = '';
          if (elBtnClearSearch) elBtnClearSearch.style.display = 'none';
          renderFeed(true);
        }
        elSearchInput.blur();
      }
    }
  });

  // Minimalist "Aa" Reader Settings Popover Controller
  const elAaBtn = document.getElementById('study-aa-menu-btn');
  const elAaDropdown = document.getElementById('study-aa-dropdown');
  if (elAaBtn && elAaDropdown) {
    elAaBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = elAaDropdown.classList.toggle('open');
      elAaBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (elAaDropdown.classList.contains('open') && !elAaDropdown.contains(e.target) && !elAaBtn.contains(e.target)) {
        elAaDropdown.classList.remove('open');
        elAaBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Export refresh helper globally if needed
  window.refreshMelisStudyFeed = () => renderFeed(true);

})();
