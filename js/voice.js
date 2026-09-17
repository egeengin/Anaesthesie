/**
 * FACHARZTPRÜFUNG ANÄSTHESIOLOGIE - VOICE EXAM & KEYWORD PARSER ENGINE
 * Web Speech API integration for practicing verbal answers aloud in German (de-DE)
 */

(function (global) {
  'use strict';

  class VoiceExamEngine {
    constructor() {
      this.recognition = null;
      this.isListening = false;
      this.transcript = '';
      this.onResultCallback = null;
      this.onStatusCallback = null;
      this.supported = false;

      this.initRecognition();
    }

    initRecognition() {
      const SpeechRecognition = global.SpeechRecognition || global.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.supported = true;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'de-DE';

        this.recognition.onstart = () => {
          this.isListening = true;
          if (this.onStatusCallback) this.onStatusCallback('listening');
        };

        this.recognition.onresult = (event) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          this.transcript = currentTranscript.trim();
          if (this.onResultCallback) {
            this.onResultCallback(this.transcript);
          }
        };

        this.recognition.onerror = (event) => {
          console.warn('[VoiceExam] Speech recognition error:', event.error);
          this.isListening = false;
          if (this.onStatusCallback) this.onStatusCallback('error', event.error);
        };

        this.recognition.onend = () => {
          this.isListening = false;
          if (this.onStatusCallback) this.onStatusCallback('stopped');
        };
      } else {
        this.supported = false;
      }
    }

    startListening(onResult, onStatus) {
      if (!this.supported) {
        if (onStatus) onStatus('unsupported');
        return false;
      }

      this.onResultCallback = onResult;
      this.onStatusCallback = onStatus;
      this.transcript = '';

      try {
        this.recognition.start();
        return true;
      } catch (e) {
        console.warn('[VoiceExam] Failed to start recognition:', e);
        return false;
      }
    }

    stopListening() {
      if (this.recognition && this.isListening) {
        try {
          this.recognition.stop();
        } catch (e) {
          console.warn('[VoiceExam] Error stopping recognition:', e);
        }
      }
      this.isListening = false;
    }

    /**
     * Extracts key medical terms from text for matching
     * @param {string} text 
     * @returns {Array<string>} Array of normalized keywords
     */
    static extractKeywords(text) {
      if (!text) return [];
      // Clean HTML tags and special chars
      const cleanText = text.replace(/<[^>]*>/g, ' ').toLowerCase();
      // Split into words, filter out common German stop words
      const stopWords = new Set([
        'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'einem', 'einen', 'eines',
        'und', 'oder', 'aber', 'bei', 'mit', 'von', 'nach', 'zu', 'im', 'in', 'auf', 'für', 'um',
        'ist', 'sind', 'wird', 'werden', 'hat', 'haben', 'kann', 'können', 'muss', 'müssen', 'soll', 'sollte'
      ]);

      const words = cleanText.split(/[\s,.;:!?\-\/\(\)]+/);
      const keywords = new Set();

      words.forEach(w => {
        if (w.length >= 3 && !stopWords.has(w)) {
          keywords.add(w);
        }
      });

      return Array.from(keywords);
    }

    /**
     * Matches spoken transcript against key target pearls/rubric
     * @param {string} spokenText 
     * @param {Array<string>} targetPearls - List of rubric points or key phrases
     * @returns {object} { matchedIndices: Array<number>, matchRatio: number, keywordsMatched: Array<string> }
     */
    static evaluateSpokenAnswer(spokenText, targetPearls) {
      if (!spokenText || !targetPearls || !targetPearls.length) {
        return { matchedIndices: [], matchRatio: 0, keywordsMatched: [] };
      }

      const spokenKeywords = VoiceExamEngine.extractKeywords(spokenText);
      const matchedIndices = [];
      const keywordsMatched = [];

      targetPearls.forEach((pearl, idx) => {
        const pearlKeywords = VoiceExamEngine.extractKeywords(pearl);
        if (pearlKeywords.length === 0) return;

        let hits = 0;
        pearlKeywords.forEach(pk => {
          if (spokenKeywords.some(sk => sk.includes(pk) || pk.includes(sk))) {
            hits++;
            keywordsMatched.push(pk);
          }
        });

        // If at least 35% of keywords in a rubric item were mentioned, mark item as covered!
        if (hits / pearlKeywords.length >= 0.35 || hits >= 2) {
          matchedIndices.push(idx);
        }
      });

      const matchRatio = targetPearls.length ? matchedIndices.length / targetPearls.length : 0;

      return {
        matchedIndices,
        matchRatio: parseFloat(matchRatio.toFixed(2)),
        keywordsMatched: Array.from(new Set(keywordsMatched))
      };
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceExamEngine;
  } else {
    global.VoiceExamEngine = VoiceExamEngine;
  }
})(typeof window !== 'undefined' ? window : this);
