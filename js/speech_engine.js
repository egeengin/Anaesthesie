/**
 * FACHARZTPRÜFUNG ANÄSTHESIOLOGIE - MEDICAL SPEECH & TTS ENGINE
 * Features:
 * 1. Medical Text Preprocessor (phonetic expansions for abbreviations, units, dosages, BGA)
 * 2. Clean Text Extractor (strips Turkish collapsibles, buttons, markdown, and emojis)
 * 3. Text Chunking for natural sentence-by-sentence TTS streaming
 * 4. German Neural Voice Ranking & Selection (Google Deutsch, Siri, Natural)
 * 5. Google Natural TTS audio stream generator with zero-configuration fallback
 */

(function (global) {
  'use strict';

  /**
   * Prepares medical text for natural speech synthesis
   * Expands medical abbreviations, ratios, dosages, and vital parameters phonetically into German
   * @param {string} rawText 
   * @returns {string} phonetically expanded text
   */
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

  /**
   * Extracts clean German text from a DOM element or string, removing Turkish translations
   * @param {string|HTMLElement} elementOrText 
   * @returns {string} cleaned speech text
   */
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

  /**
   * Chunks long texts at punctuation boundaries for audio synthesis
   * @param {string} text 
   * @param {number} maxLen 
   * @returns {Array<string>} chunks
   */
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

  /**
   * Scores German speech synthesis voices based on natural fidelity
   */
  function scoreGermanVoice(v) {
    let score = 0;
    const name = (v.name || '').toLowerCase();
    const lang = (v.lang || '').toLowerCase();

    if (!lang.startsWith('de')) return -100;

    if (lang === 'de-de') score += 10;
    else if (lang.startsWith('de')) score += 5;

    if (name.includes('natural') || name.includes('neural') || name.includes('online')) score += 100;
    if (name.includes('siri')) score += 95;
    if (name.includes('enhanced') || name.includes('premium') || name.includes('verbessert')) score += 85;
    if (name.includes('google')) score += 60;

    if (name.includes('katja') || name.includes('conrad') || name.includes('amala') || name.includes('killian')) score += 45;
    if (name.includes('helena') || name.includes('markus') || name.includes('petra') || name.includes('viktor') || name.includes('yannick')) score += 35;

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

  /**
   * Creates a Google Natural TTS audio stream URL
   */
  function createGoogleTtsUrl(text) {
    const encoded = encodeURIComponent(text.trim());
    return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=de&client=tw-ob`;
  }

  const MedicalSpeechEngine = {
    prepareMedicalTextForSpeech,
    getCleanSpeechText,
    chunkTextForTTS,
    scoreGermanVoice,
    rankGermanVoices,
    getVoiceQualityBadge,
    getCleanVoiceDisplayName,
    createGoogleTtsUrl
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MedicalSpeechEngine;
  } else {
    global.MedicalSpeechEngine = MedicalSpeechEngine;
  }
})(typeof window !== 'undefined' ? window : this);
