/**
 * FACHARZTPRÜFUNG ANÄSTHESIOLOGIE - 45-MINUTE MOCK ORAL EXAM SIMULATION ENGINE
 * Simulates a realistic ÄKNO oral examination with 4 cases across mandatory pillars
 */

(function (global) {
  'use strict';

  const EXAM_DURATION_SECONDS = 45 * 60; // 45 Minutes = 2700 Seconds

  class MockExamSimulation {
    constructor(allQuestions) {
      this.allQuestions = allQuestions || [];
      this.activeCases = [];
      this.currentCaseIndex = 0;
      this.secondsRemaining = EXAM_DURATION_SECONDS;
      this.timerId = null;
      this.isFinished = false;
      this.isActive = false;
      this.scores = [null, null, null, null]; // { caseId, rating: 1-5, coveredPearls: N, totalPearls: M }
      this.onTickCallback = null;
      this.onFinishCallback = null;
    }

    /**
     * Selects 4 representative cases for the mock examination across key domains
     */
    startNewExam() {
      if (!this.allQuestions.length) return false;

      // Group questions by 4 pillar domains:
      // 1. Allgemeinanästhesie
      // 2. Regionalanästhesie & Schmerz
      // 3. Intensivmedizin & Sepsis
      // 4. Notfallmedizin & Reanimation / Pädiatrie / Geburtshilfe
      const cat1 = this.allQuestions.filter(q => q.category.includes('Allgemein') || q.category.includes('Atemweg'));
      const cat2 = this.allQuestions.filter(q => q.category.includes('Regional') || q.category.includes('Schmerz') || q.category.includes('Lokalanästhetika'));
      const cat3 = this.allQuestions.filter(q => q.category.includes('Intensiv') || q.category.includes('Beatmung') || q.category.includes('Sepsis'));
      const cat4 = this.allQuestions.filter(q => q.category.includes('Notfall') || q.category.includes('Kinder') || q.category.includes('Geburtshilfe') || q.category.includes('Neuro'));

      const pickRandom = (arr) => arr.length ? arr[Math.floor(Math.random() * arr.length)] : this.allQuestions[Math.floor(Math.random() * this.allQuestions.length)];

      this.activeCases = [
        pickRandom(cat1),
        pickRandom(cat2),
        pickRandom(cat3),
        pickRandom(cat4)
      ];

      this.currentCaseIndex = 0;
      this.secondsRemaining = EXAM_DURATION_SECONDS;
      this.isFinished = false;
      this.isActive = true;
      this.scores = [null, null, null, null];

      this.startTimer();
      return true;
    }

    startTimer() {
      this.stopTimer();
      this.timerId = setInterval(() => {
        if (this.secondsRemaining > 0) {
          this.secondsRemaining--;
          if (this.onTickCallback) {
            this.onTickCallback(this.secondsRemaining, this.formatTime());
          }
        } else {
          this.finishExam();
        }
      }, 1000);
    }

    stopTimer() {
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    }

    formatTime() {
      const mins = Math.floor(this.secondsRemaining / 60);
      const secs = this.secondsRemaining % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    recordCaseScore(caseIndex, rating, coveredPearls, totalPearls) {
      if (caseIndex >= 0 && caseIndex < 4) {
        this.scores[caseIndex] = {
          caseId: this.activeCases[caseIndex].id,
          title: this.activeCases[caseIndex].stem_de || this.activeCases[caseIndex].question_de,
          rating,
          coveredPearls,
          totalPearls
        };
      }
    }

    nextCase() {
      if (this.currentCaseIndex < 3) {
        this.currentCaseIndex++;
        return true;
      }
      return false;
    }

    finishExam() {
      this.stopTimer();
      this.isFinished = true;
      this.isActive = false;

      // Compute aggregate result
      let totalRating = 0;
      let ratedCases = 0;
      this.scores.forEach(s => {
        if (s && s.rating) {
          totalRating += s.rating;
          ratedCases++;
        }
      });

      const avgRating = ratedCases ? (totalRating / ratedCases) : 0;
      let statusText = 'Nicht bestanden';
      let grade = 'Note 5.0 (Ungenügend)';

      if (avgRating >= 4.5) {
        statusText = '🎉 MIT AUSZEICHNUNG BESTANDEN';
        grade = 'Note 1.0 (Sehr Gut)';
      } else if (avgRating >= 3.8) {
        statusText = '✅ SOUVERÄN BESTANDEN';
        grade = 'Note 2.0 (Gut)';
      } else if (avgRating >= 3.0) {
        statusText = '✅ BESTANDEN';
        grade = 'Note 3.0 (Befriedigend)';
      } else if (avgRating >= 2.5) {
        statusText = '⚠️ KNAPP BESTANDEN';
        grade = 'Note 4.0 (Ausreichend)';
      }

      const summary = {
        avgRating: parseFloat(avgRating.toFixed(2)),
        statusText,
        grade,
        timeSpentSeconds: EXAM_DURATION_SECONDS - this.secondsRemaining,
        scores: this.scores
      };

      if (this.onFinishCallback) {
        this.onFinishCallback(summary);
      }

      return summary;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MockExamSimulation;
  } else {
    global.MockExamSimulation = MockExamSimulation;
  }
})(typeof window !== 'undefined' ? window : this);
