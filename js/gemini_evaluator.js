/**
 * FACHARZTPRÜFUNG ANÄSTHESIOLOGIE - GEMINI AI ORAL EXAM EVALUATOR
 * Direct integration with Google Gemini Flash API for ÄKNO Oral Board Exam Evaluation
 */

(function (global) {
  'use strict';

  class GeminiAIEvaluator {
    constructor() {
      this.storageKey = 'gemini_api_key';
      this.model = 'gemini-3.5-flash';
      this.fallbackModel = 'gemini-3.1-flash-lite';
    }

    getApiKey() {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const stored = (window.localStorage.getItem(this.storageKey) || '').trim();
          if (stored) return stored;
        }
      } catch (e) {
        console.warn('[GeminiAI] Error reading localStorage:', e);
      }
      if (typeof globalThis !== 'undefined' && globalThis.GEMINI_LOCAL_KEY) {
        return globalThis.GEMINI_LOCAL_KEY;
      }
      return '';
    }

    setApiKey(key) {
      try {
        if (typeof localStorage !== 'undefined') {
          if (!key) {
            localStorage.removeItem(this.storageKey);
          } else {
            localStorage.setItem(this.storageKey, key.trim());
          }
          return true;
        }
      } catch (e) {
        console.warn('[GeminiAI] Failed to store API key:', e);
      }
      return false;
    }

    hasApiKey() {
      const key = this.getApiKey();
      return Boolean(key && key.length >= 20);
    }

    /**
     * Builds medical prompt and evaluates candidate's spoken answer via Gemini
     */
    async evaluateAnswer({
      questionId,
      category,
      questionText,
      officialAnswer,
      rubricList,
      spokenTranscript,
      examinerName,
      examinerHospital,
      examinerFocus,
      examinerTrap
    }) {
      const apiKey = this.getApiKey();
      if (!apiKey) {
        throw new Error('MISSING_API_KEY');
      }

      const prompt = `
Du bist ein erfahrener Facharztprüfer für Anästhesiologie der Ärztekammer Nordrhein (ÄKNO Düsseldorf), namentlich ${examinerName || 'Prof. Dr. med. Andreas Hohn'} (${examinerHospital || 'Kliniken der Stadt Köln / Universität zu Köln · Leitender Thoraxanästhesist'}).
Dein Prüfungsschwerpunkt: ${examinerFocus || 'Thoraxanästhesie, Notfallmanagement, DGAI-Leitlinien'}.
Besondere Prüfungsfalle / K.O.-Kriterium: ${examinerTrap || 'Hektisches Reagieren ohne strukturiertes 5-Stufen-Rettungskonzept'}.

PRÜFUNGSFRAGE / FALL:
"${questionText || ''}"

KLINISCHE MUSTERANTWORT & LEITLINIEN-CHECKLISTE:
${officialAnswer || (rubricList || []).join('\n')}

VOM PRÜFLING GESPROCHENE ANTWORT (Erfasst via Speech-to-Text / Spracherkennung):
"${spokenTranscript || ''}"

WICHTIGE HINWEISE FÜR DIE BEWERTUNG:
1. Die Antwort wurde mündlich eingesprochen und automatisiert transkribiert. Phonetische Spracherkennungsfehler sind unvermeidbar und DÜRFEN NICHT ALS FACHLICHE FEHLER GEWERTET WERDEN!
   Typische Beispiele:
   - "Vier auf 100%" oder "Vier 100" = "FiO2 auf 1,0 / 100% O2"
   - "Fieberoptik" / "Fieber Optik" = "Fiberoptik / Fiberoptische Bronchoskopie"
   - "Doppelposition" / "Doppellumen" = "DLT / Doppellumentubus-Lagekontrolle"
   - "See Pap" / "C Pop" = "CPAP (2–5 cmH2O an die nicht-ventilierte Lunge)"
   - "Piep" = "PEEP (Beatmungsdruck)"
   - "OP unterbrechen" / "Chirurg besprechen" = "Unterbrechung der Einlungenventilation / Wiederaufnahme der 2-Lungen-Ventilation"
   - "Suga Madex" = "Sugammadex"
   - "Dan Trowlen" = "Dantrolen"
   - "Kiko" = "CICO / Koniotomie"
2. Bewerte die KLINISCHE LOGIK, Prioritätensetzung und Algorithmentreue. Wenn der Prüfling die richtige Maßnahme mit eigenen Worten beschreibt, werte den Punkt als VOLL ERFÜLLT.
3. Beurteile, ob ein vitales K.O.-Kriterium verletzt wurde (z.B. Gabe falscher Kontraindikationen).
4. Berechne:
   - Einen Score von 0 bis 100%.
   - Eine realistische deutsche Prüfungsnote (z.B. "Note 1.0 (Sehr gut)", "Note 2.0 (Gut)", "Note 3.0 (Befriedigend)", "Note 4.0 (Ausreichend)", "Note 5.0 (Nicht bestanden)").
   - Ausführliches, professionelles Feedback aus Prüfersicht (verdictDE) mit konkretem Lob und didaktischer Anleitung.
   - Eine prägnante türkische Zusammenfassung (verdictTR), die dem lernenden Arzt auf einen Blick zeigt, was klinisch stark war und welcher Schritt noch fehlte.
   - Eine Liste erfüllter Kriterien (matchedCriteria) und fehlender Kriterien (missedCriteria).

Antworte AUSSCHLIESSLICH als valides JSON-Objekt ohne Markdown-Codeblöcke (\`\`\`json):
{
  "score": 85,
  "grade": "Note 2.0 (Gut / Bestanden)",
  "passed": true,
  "verdictDE": "...",
  "verdictTR": "...",
  "matchedCriteria": ["...", "..."],
  "missedCriteria": ["..."],
  "koViolated": false,
  "koReason": ""
}
`;

      return await this._callGeminiWithFallback(apiKey, prompt);
    }

    async _callGeminiWithFallback(apiKey, prompt) {
      try {
        return await this._callGeminiModel(this.model, apiKey, prompt);
      } catch (err) {
        console.warn(`[GeminiAI] ${this.model} failed, trying fallback ${this.fallbackModel}:`, err);
        return await this._callGeminiModel(this.fallbackModel, apiKey, prompt);
      }
    }

    async _callGeminiModel(model, apiKey, prompt) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('EMPTY_GEMINI_RESPONSE');

      let jsonString = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      }
      return JSON.parse(jsonString);
    }

    // --- Cloud Speech-to-Text (fallback when the browser's Web Speech API is blocked, e.g. macOS Chrome) ---

    /**
     * Transcribes a recorded audio blob (MediaRecorder output) via Gemini.
     * @param {Blob} audioBlob - audio/webm (Chrome), audio/mp4 (Safari), ...
     * @param {string} lang - BCP-47 language, e.g. 'de-DE' or 'tr-TR'
     * @returns {Promise<string>} plain transcript ('' if no speech)
     */
    async transcribeAudio(audioBlob, lang = 'de-DE') {
      const apiKey = this.getApiKey();
      if (!apiKey) throw new Error('MISSING_API_KEY');
      if (!audioBlob || !audioBlob.size) return '';

      // Gemini officially supports WAV/MP3/AAC/OGG/FLAC -> convert MediaRecorder output to 16 kHz mono WAV.
      let uploadBlob = audioBlob;
      let mimeType = (audioBlob.type || 'audio/webm').split(';')[0];
      try {
        const wav = await GeminiAIEvaluator.audioBlobToWav16k(audioBlob);
        // Inline request limit is ~20 MB; keep compressed original for very long answers.
        if (wav && wav.size < 15 * 1024 * 1024) {
          uploadBlob = wav;
          mimeType = 'audio/wav';
        }
      } catch (convErr) {
        console.warn('[GeminiAI] WAV conversion failed, sending original audio:', convErr);
      }

      const base64 = await GeminiAIEvaluator.blobToBase64(uploadBlob);
      const isTr = String(lang || '').toLowerCase().startsWith('tr');
      const prompt = isTr
        ? 'Bu ses kaydını kelimesi kelimesine Türkçe olarak yazıya dök. Konuşmacı anesteziyoloji uzmanlık sınavına hazırlanan bir hekimdir; tıbbi terimleri, ilaç adlarını ve kısaltmaları (ör. FiO2, PEEP, Sugammadeks) doğru yaz. YALNIZCA transkripti döndür, yorum ekleme. Kayıtta konuşma yoksa boş yanıt döndür.'
        : 'Transkribiere diese Audioaufnahme wortgetreu auf Deutsch. Es handelt sich um eine mündliche Antwort in der Facharztprüfung Anästhesiologie: Schreibe medizinische Fachbegriffe, Medikamentennamen, Dosierungen und Abkürzungen korrekt (z. B. FiO2, PEEP, Sugammadex, Rocuronium, CICO, DLT). Gib AUSSCHLIESSLICH den transkribierten Text zurück, ohne Kommentar oder Anführungszeichen. Wenn keine Sprache hörbar ist, gib eine leere Antwort zurück.';

      const payload = {
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64 } }
          ]
        }],
        generationConfig: {
          temperature: 0,
          thinkingConfig: { thinkingLevel: 'minimal' }
        }
      };

      let text;
      try {
        text = await this._callGeminiText(this.model, apiKey, payload);
      } catch (err) {
        console.warn(`[GeminiAI] STT with ${this.model} failed, trying ${this.fallbackModel}:`, err);
        text = await this._callGeminiText(this.fallbackModel, apiKey, payload);
      }
      return GeminiAIEvaluator.cleanTranscript(text);
    }

    async _callGeminiText(model, apiKey, payload) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      return parts.filter(p => typeof p.text === 'string' && !p.thought).map(p => p.text).join(' ').trim();
    }

    static cleanTranscript(text) {
      let t = String(text || '').trim();
      t = t.replace(/^["„“'`]+|["“”'`]+$/g, '').trim();
      // Model sometimes answers "no speech" in words instead of returning empty text
      if (/^(\[|\()?\s*(keine sprache|kein(e)? (ton|audio)|stille|no speech|silence|konuşma yok|ses yok)/i.test(t)) return '';
      return t;
    }

    static blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = String(reader.result || '');
          const comma = result.indexOf(',');
          resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    }

    /** Decodes any browser-recorded audio and re-encodes it as 16-bit PCM WAV, 16 kHz, mono. */
    static async audioBlobToWav16k(blob) {
      const AudioCtx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
      const OfflineCtx = (typeof window !== 'undefined') && (window.OfflineAudioContext || window.webkitOfflineAudioContext);
      if (!AudioCtx || !OfflineCtx) throw new Error('NO_WEB_AUDIO');

      const arrayBuf = await blob.arrayBuffer();
      const decodeCtx = new AudioCtx();
      let decoded;
      try {
        decoded = await decodeCtx.decodeAudioData(arrayBuf.slice(0));
      } finally {
        try { decodeCtx.close(); } catch (e) {}
      }

      const targetRate = 16000;
      const frameCount = Math.max(1, Math.ceil(decoded.duration * targetRate));
      const offline = new OfflineCtx(1, frameCount, targetRate);
      const src = offline.createBufferSource();
      src.buffer = decoded;
      src.connect(offline.destination);
      src.start(0);
      const rendered = await offline.startRendering();
      const pcm = rendered.getChannelData(0);

      const buffer = new ArrayBuffer(44 + pcm.length * 2);
      const view = new DataView(buffer);
      const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + pcm.length * 2, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);         // PCM chunk size
      view.setUint16(20, 1, true);          // PCM format
      view.setUint16(22, 1, true);          // mono
      view.setUint32(24, targetRate, true);
      view.setUint32(28, targetRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeStr(36, 'data');
      view.setUint32(40, pcm.length * 2, true);
      let off = 44;
      for (let i = 0; i < pcm.length; i++, off += 2) {
        const s = Math.max(-1, Math.min(1, pcm[i]));
        view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
      return new Blob([view], { type: 'audio/wav' });
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeminiAIEvaluator;
  } else {
    global.GeminiAIEvaluator = GeminiAIEvaluator;
  }
})(typeof window !== 'undefined' ? window : this);
