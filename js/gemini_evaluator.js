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
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeminiAIEvaluator;
  } else {
    global.GeminiAIEvaluator = GeminiAIEvaluator;
  }
})(typeof window !== 'undefined' ? window : this);
