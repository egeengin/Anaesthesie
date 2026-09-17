/**
 * FACHARZTPRÜFUNG ANÄSTHESIOLOGIE - SPACED REPETITION ENGINE (SM-2 ALGORITHM)
 * SuperMemo-2 Spaced Repetition for Medical Board Examination Preparation
 */

(function (global) {
  'use strict';

  const SM2_DEFAULT_EASE = 2.5;

  /**
   * Calculates the next review interval using SuperMemo-2
   * @param {number} quality - 0 to 5 (0-2: Fail/Schwer, 3-4: Gut/Mittel, 5: Perfekt/Leicht)
   * @param {object} itemState - { repetition, interval, easeFactor }
   * @returns {object} { repetition, interval, easeFactor, dueDate }
   */
  function calculateSM2(quality, itemState) {
    let rep = (itemState && itemState.repetition) || 0;
    let interval = (itemState && itemState.interval) || 1;
    let ease = (itemState && itemState.easeFactor) || SM2_DEFAULT_EASE;

    // Constrain quality between 0 and 5
    quality = Math.max(0, Math.min(5, Math.round(quality)));

    if (quality >= 3) {
      if (rep === 0) {
        interval = 1;
      } else if (rep === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * ease);
      }
      rep += 1;
    } else {
      rep = 0;
      interval = 1;
    }

    // Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (ease < 1.3) ease = 1.3;

    const dueDate = Date.now() + interval * 24 * 60 * 60 * 1000;

    return {
      repetition: rep,
      interval: interval,
      easeFactor: parseFloat(ease.toFixed(2)),
      dueDate: dueDate,
      lastReviewed: Date.now()
    };
  }

  /**
   * Checks if a question is due for repetition today
   * @param {object} sm2Item - State stored for a question
   * @returns {boolean}
   */
  function isDueToday(sm2Item) {
    if (!sm2Item || !sm2Item.dueDate) return true; // New items are due
    return Date.now() >= sm2Item.dueDate;
  }

  /**
   * Filters a list of questions to those due for review under SM-2
   * @param {Array} questions - Array of question objects
   * @param {object} sm2Map - Map of questionId -> sm2Item
   * @returns {Array} Filtered due questions
   */
  function getDueQuestions(questions, sm2Map) {
    if (!questions || !Array.isArray(questions)) return [];
    sm2Map = sm2Map || {};
    return questions.filter(q => {
      const item = sm2Map[q.id];
      return isDueToday(item);
    });
  }

  /**
   * Formats remaining time until due date into human readable German text
   * @param {number} dueDateTimestamp 
   * @returns {string} e.g. "Heute fällig", "In 2 Tagen", "In 6 Tagen"
   */
  function formatDueDate(dueDateTimestamp) {
    if (!dueDateTimestamp) return 'Heute fällig';
    const diffMs = dueDateTimestamp - Date.now();
    if (diffMs <= 0) return 'Heute fällig';
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Morgen fällig';
    return `In ${diffDays} Tagen fällig`;
  }

  const SM2Engine = {
    calculateSM2,
    isDueToday,
    getDueQuestions,
    formatDueDate,
    DEFAULT_EASE: SM2_DEFAULT_EASE
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SM2Engine;
  } else {
    global.SM2Engine = SM2Engine;
  }
})(typeof window !== 'undefined' ? window : this);
