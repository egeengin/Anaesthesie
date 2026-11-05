/**
 * Facharzt Anästhesie — Interaktive Lern- & Lesemappe (study.js)
 * High-Performance Reader with Sentence-Level Hover/Tap Translations
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
    theme: savedSettings.theme || 'light', // 'light', 'sepia', 'dark'
    fontSize: savedSettings.fontSize || 17, // 15, 17, 19, 21
    viewMode: savedSettings.viewMode || 'hover', // 'hover', 'bilingual', 'german'
    activeCategory: 'all',
    activeType: 'all', // 'all', 'open', 'options'
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
                <div style="font-weight: 700;">📦 1. Tüm Arşiv Tek Dosyada (636 Vaka)</div>
                <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">FACHARZT_KOMPLETT_NOTEBOOKLM.md (~1.8 MB)</div>
              </div>
              <span style="font-size: 1.2rem;">📥</span>
            </a>
            <a href="notebooklm_export/01_Klinische_Faelle_und_Protokolle_NOTEBOOKLM.md" download="01_Klinische_Faelle_und_Protokolle_NOTEBOOKLM.md" class="btn-download-file">
              <div>
                <div style="font-weight: 700;">🏥 2. Klinik Kasuistikler & ÄKNO Protokolleri (304 Vaka)</div>
                <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">01_Klinische_Faelle_und_Protokolle_NOTEBOOKLM.md (~780 KB)</div>
              </div>
              <span style="font-size: 1.2rem;">📥</span>
            </a>
            <a href="notebooklm_export/02_MCQ_und_Faktenwissen_NOTEBOOKLM.md" download="02_MCQ_und_Faktenwissen_NOTEBOOKLM.md" class="btn-download-file">
              <div>
                <div style="font-weight: 700;">📚 3. Yapılandırılmış MCQ & Hap Bilgiler (332 Soru)</div>
                <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">02_MCQ_und_Faktenwissen_NOTEBOOKLM.md (~1.1 MB)</div>
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
  if (!elFeed) return; // Exit gracefully if study view not in DOM

  const elSearchInput = document.getElementById('study-search-input') || document.getElementById('search-input');
  const elBtnClearSearch = document.getElementById('study-btn-clear-search') || document.getElementById('btn-clear-search');
  const elCategoryScroll = document.getElementById('study-category-filter-scroll') || document.getElementById('category-filter-scroll');
  const elTypeFilters = document.querySelectorAll('.btn-type-filter');
  const elModeTabs = document.querySelectorAll('.btn-mode-tab');
  const elThemeToggle = document.getElementById('study-btn-theme-toggle') || document.getElementById('btn-theme-toggle');
  const elFontToggle = document.getElementById('study-btn-font-toggle') || document.getElementById('btn-font-toggle');
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

  let currentActiveSentence = null;
  let activeUtteranceText = '';

  // --- Initialize Dataset ---
  const allQuestions = (typeof EXAM_QUESTIONS !== 'undefined' && Array.isArray(EXAM_QUESTIONS)) ? EXAM_QUESTIONS : [];

  // --- Sentence-Level Text Processing ---
  function splitIntoSentences(text) {
    if (!text) return [];
    const protectedText = text
      .replace(/z\.\s*B\./g, 'z_B_')
      .replace(/u\.\s*a\./g, 'u_a_')
      .replace(/bzw\./g, 'bzw_')
      .replace(/ca\./g, 'ca_')
      .replace(/(\d+)\.\s*(\d+)/g, '$1_DOT_$2');

    const rawSentences = protectedText.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [protectedText];

    return rawSentences.map(s => {
      return s
        .replace(/z_B_/g, 'z. B.')
        .replace(/u_a_/g, 'u. a.')
        .replace(/bzw_/g, 'bzw.')
        .replace(/ca_/g, 'ca.')
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

        let optMatch = false;
        if (item.options) {
          optMatch = item.options.some(o => 
            (o.text_de || '').toLowerCase().includes(q) ||
            (o.text_tr || '').toLowerCase().includes(q) ||
            (o.explanation_de || '').toLowerCase().includes(q) ||
            (o.explanation_tr || '').toLowerCase().includes(q)
          );
        }

        const oralQDe = (item.oral_question_de || '').toLowerCase();
        const oralQTr = (item.oral_question_tr || '').toLowerCase();
        const oralADe = (item.oral_answer_de || '').toLowerCase();
        const oralATr = (item.oral_answer_tr || '').toLowerCase();
        return stemDe.includes(q) || stemTr.includes(q) || ansDe.includes(q) || ansTr.includes(q) || 
               oralQDe.includes(q) || oralQTr.includes(q) || oralADe.includes(q) || oralATr.includes(q) || 
               cat.includes(q) || optMatch;
      });
    }

    if (state.activeCategory !== 'all') {
      list = list.filter(item => item.category === state.activeCategory);
    }

    if (state.activeType === 'options') {
      list = list.filter(item => item.question_type === 'options' || (item.options && item.options.length > 0));
    } else if (state.activeType === 'open') {
      list = list.filter(item => item.question_type === 'open' || !item.options || item.options.length === 0);
    }

    if (state.activeStatusFilter === 'read') {
      list = list.filter(item => !!readStatus[item.id]);
    } else if (state.activeStatusFilter === 'unread') {
      list = list.filter(item => !readStatus[item.id]);
    }

    return list;
  }

  // --- Render Questions Feed ---
  
  // Format structured oral exam answers into clear paragraphs, bullet items, and section headings
  function renderFormattedOralAnswer(aDe, aTr) {
    if (!aDe) return '';

    const linesDe = aDe.split('\n');
    const linesTr = (aTr || '').split('\n');

    let html = '';
    linesDe.forEach((lDe, idx) => {
      const rawDe = lDe.trim();
      if (!rawDe) return;
      const rawTr = (linesTr[idx] || '').trim();

      // Bullet points (e.g. • or -)
      if (rawDe.startsWith('•') || rawDe.startsWith('-')) {
        const cleanDe = rawDe.replace(/^[•\-]\s*/, '').trim();
        const cleanTr = rawTr.replace(/^[•\-]\s*/, '').trim();
        html += `
          <div class="oral-answer-bullet-row">
            <span class="oral-bullet-icon">▸</span>
            <div class="oral-bullet-content">
              <div class="oral-bullet-de">${renderInteractiveGerman(cleanDe, cleanTr)}</div>
              ${cleanTr ? `<div class="inline-bilingual-tr" style="margin-top: 4px;">🇹🇷 ${escapeHtml(cleanTr)}</div>` : ''}
            </div>
          </div>
        `;
      } else if (/^\d+\.\s+/.test(rawDe)) {
        // Section heading (e.g. 1. DIE 3 SÄULEN DER BÄK)
        html += `
          <div class="oral-section-heading">
            <div class="oral-heading-de">${renderInteractiveGerman(rawDe, rawTr)}</div>
            ${rawTr ? `<div class="inline-bilingual-tr" style="margin-top: 4px;">🇹🇷 ${escapeHtml(rawTr)}</div>` : ''}
          </div>
        `;
      } else {
        // Normal paragraph / intro sentence
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

  function renderFeed(resetVisible = false) {
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
      const isMcq = q.question_type === 'options' || (q.options && q.options.length > 0);
      const isDus = q.is_dus_protocol || (q.source_book && q.source_book.includes('Düsseldorf'));
      const globalIndex = allQuestions.findIndex(x => x.id === q.id) + 1;

      html += `
        <article class="study-card ${isRead ? 'is-read' : ''}" id="card-${q.id}" data-id="${q.id}">
          <div class="card-header-bar">
            <div class="card-badges">
              <span class="badge-case-number">Fall #${globalIndex || (idx + 1)}</span>
              <span class="badge-category">${escapeHtml(q.category || 'Anästhesie')}</span>
              ${q.amboss_pillar ? `<span class="badge-pillar">🏛️ ${escapeHtml(q.amboss_pillar)}</span>` : ''}
              ${isDus ? `<span class="badge-dus-protocol">🏛️ ÄKNO Düsseldorf</span>` : ''}
              ${q.is_high_yield ? `<span class="badge-hy-star">⭐ High-Yield</span>` : ''}
              ${q.is_amboss_curriculum ? `<span class="badge-category" style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0;">🩺 AMBOSS</span>` : ''}
            </div>

            <div class="card-actions-top">
              <button class="btn-card-action btn-pronounce-card" data-text="${escapeHtml((q.oral_question_de || q.stem_de || q.question_de || '') + '\n\n' + (q.oral_answer_de || q.answer_de || ''))}" title="Almanca Soru ve Model Cevabı Sesli Dinle">
                <span>🔊</span> Telaffuz
              </button>
              <button class="btn-card-action btn-toggle-read ${isRead ? 'active-read' : ''}" data-id="${q.id}">
                <span>${isRead ? '✓' : '○'}</span> ${isRead ? 'Gelesen' : 'Als gelesen'}
              </button>
            </div>
          </div>

          <!-- 👨‍⚕️ PRÜFER-FRAGE (Sözlü Sınav Sorusu) -->
          <div class="oral-question-card-box">
            <div class="oral-role-badge examiner-role-badge">
              <span>👨‍⚕️</span> Prüfer-Frage (Sözlü Sınav Sorusu)
            </div>
            <div class="oral-question-text">
              <h2 class="card-stem-title oral-stem-title">
                ${renderInteractiveGerman(q.oral_question_de || q.stem_de || q.question_de, q.oral_question_tr || q.stem_tr || q.question_tr)}
              </h2>
              <div class="inline-bilingual-tr oral-trans-sub" style="margin-top: 6px;">
                🇹🇷 ${escapeHtml(q.oral_question_tr || q.stem_tr || q.question_tr || '')}
              </div>
            </div>
          </div>

          <!-- 🩺 FACHARZT-MUSTERANTWORT (Doğrudan Model Uzman Yanıtı) -->
          <div class="oral-answer-card-box">
            <div class="oral-role-badge candidate-role-badge">
              <span>🩺</span> Facharzt-Musterantwort &amp; Leitlinien (Model Uzman Cevabı)
            </div>
            <div class="oral-answer-content">
              ${renderFormattedOralAnswer(q.oral_answer_de || q.answer_de || '', q.oral_answer_tr || q.answer_tr || '')}
            </div>
          </div>
        `;


      

      
      // Examiner Profile Box (if available)
      if (q.examiner_profile) {
        const ep = q.examiner_profile;
        html += `
          <div class="study-examiner-profile-box">
            <div class="study-examiner-profile-header">
              <span>🏛️</span> ÄKNO Düsseldorf Prüfer-Profil: ${escapeHtml(ep.name || 'Prüfungskommission')} (${escapeHtml(ep.hospital || 'Universitätsklinikum')})
            </div>
            <div style="font-size: 0.82rem; color: var(--text-secondary);">
              <div><strong>🎯 Prüfungsschwerpunkt:</strong> ${escapeHtml(ep.focus || '')}</div>
              ${ep.trap ? `<div style="margin-top: 2px; color: #b45309;"><strong>⚠️ Typische Prüfungsfalle:</strong> ${escapeHtml(ep.trap)}</div>` : ''}
              ${ep.keywords ? `<div style="margin-top: 2px; color: #047857;"><strong>⭐ Signalwörter:</strong> ${escapeHtml(ep.keywords)}</div>` : ''}
            </div>
          </div>
        `;
      }

      // Examiner Intervention & Steering
      if (q.examiner_intervention) {
        html += `
          <div class="study-examiner-intervention-box">
            <div class="study-examiner-intervention-title">
              <span>⚡</span> Prüfer-Intervention & Zwischenfrage (Akute Verschlechterung):
            </div>
            <div class="answer-body-text">
              ${renderInteractiveGerman(q.examiner_intervention, q.examiner_intervention_tr)}
            </div>
            <div class="inline-bilingual-tr">
              🇹🇷 ${escapeHtml(q.examiner_intervention_tr || '')}
            </div>
            ${q.examiner_answer ? `
              <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(245, 158, 11, 0.3);">
                <strong style="color: var(--text-primary); font-size: 0.88rem;">🎯 Prüfer-Erwartung & Leitlinien-Handeln:</strong>
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
              <span>💡</span> Prüfer-Tipp & K.O.-Kriterien (Vermeidung von Durchfall-Fehlern):
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

      html += `</article>`;
    });

    elFeed.innerHTML = html;

    if (elLoadMoreWrapper) {
      if (state.visibleCount < filtered.length) {
        elLoadMoreWrapper.style.display = 'block';
        elBtnLoadMore.textContent = `Daha Fazla Göster (${filtered.length - state.visibleCount} vaka kaldı)`;
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
      });
    });

    document.querySelectorAll('.btn-pronounce-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-text');
        speakGerman(text);
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
          renderFeed(true);
        });
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
      });
    });
  }

  if (elThemeToggle) {
    elThemeToggle.addEventListener('click', () => {
      const themes = ['light', 'sepia', 'dark'];
      const nextIdx = (themes.indexOf(state.theme) + 1) % themes.length;
      state.theme = themes[nextIdx];
      applyTheme(state.theme);
      saveSettings();
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icons = { light: '☀️', sepia: '📜', dark: '🌙' };
    const titles = { light: 'Heller Modus', sepia: 'Sepia (Lesemodus)', dark: 'Dunkler Modus' };
    if (elThemeToggle) {
      elThemeToggle.innerHTML = `<span>${icons[theme]}</span>`;
      elThemeToggle.title = titles[theme];
    }
  }

  if (elFontToggle) {
    elFontToggle.addEventListener('click', () => {
      const sizes = [15, 17, 19, 21];
      const nextIdx = (sizes.indexOf(state.fontSize) + 1) % sizes.length;
      state.fontSize = sizes[nextIdx];
      applyFontSize(state.fontSize);
      saveSettings();
    });
  }

  function applyFontSize(size) {
    document.documentElement.style.setProperty('--reading-font-size', `${size}px`);
    if (elFontToggle) elFontToggle.innerHTML = `<span>${size}px</span>`;
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

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify({
      theme: state.theme,
      fontSize: state.fontSize,
      viewMode: state.viewMode
    }));
  }

  // --- Initial Bootstrap ---
  applyTheme(state.theme);
  applyFontSize(state.fontSize);
  if (state.viewMode === 'bilingual') document.body.classList.add('mode-bilingual');
  if (state.viewMode === 'german') document.body.classList.add('mode-german-only');

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
