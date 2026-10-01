/**
 * FACHARZTPRÜFUNG ANÄSTHESIOLOGIE - STORAGE & CLOUD SYNCHRONIZATION ENGINE
 * Manages:
 * 1. LocalStorage persistence & backward compatibility
 * 2. RESTful Cloud KV Store Auto-Sync
 * 3. Bidirectional union-merge resolution (answers, flagged, notes, SM-2 cards)
 * 4. JSON backup import & export
 */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'facharzt_anaesthesie_state_v2';
  const LEGACY_STORAGE_KEY = 'facharzt_anaesthesie_state_v1';
  const DEFAULT_CLOUD_ENDPOINT = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fdab2880b07e2';

  /**
   * Field-by-field union merge: prevents overwriting newer bookmarks, notes, or answers
   * @param {object} localState 
   * @param {object} cloudState 
   * @returns {object} merged state
   */
  function mergeCloudState(localState, cloudState) {
    if (!cloudState) return { ...localState };

    const merged = { ...localState };

    // 1. Answers union merge (robustAnswers)
    const cloudAnswers = cloudState.answers || {};
    const localAnswers = localState.answers || {};
    const allQIds = new Set([...Object.keys(cloudAnswers), ...Object.keys(localAnswers)]);
    const robustAnswers = {};
    allQIds.forEach(id => {
      const cAns = cloudAnswers[id];
      const lAns = localAnswers[id];
      if (cAns && lAns) {
        robustAnswers[id] = (lAns.submitted || lAns.revealed) ? lAns : cAns;
      } else {
        robustAnswers[id] = lAns || cAns;
      }
    });

    // 2. Flags union: if flagged on either device, keep flagged
    const robustFlagged = { ...(cloudState.flagged || {}) };
    Object.keys(localState.flagged || {}).forEach(id => {
      if (localState.flagged[id]) robustFlagged[id] = true;
    });

    // 3. Notes union: preserve whichever note is present or longer
    const robustNotes = { ...(cloudState.notes || {}) };
    Object.keys(localState.notes || {}).forEach(id => {
      const lNote = localState.notes[id];
      const cNote = robustNotes[id];
      if (!cNote || (lNote && lNote.length >= cNote.length)) {
        robustNotes[id] = lNote;
      }
    });

    // 4. SM-2 Spaced Repetition cards (robustSm2): preserve latest review timestamp
    const cloudSm2 = cloudState.sm2Cards || {};
    const localSm2 = localState.sm2Cards || {};
    const allSm2Ids = new Set([...Object.keys(cloudSm2), ...Object.keys(localSm2)]);
    const robustSm2 = {};
    allSm2Ids.forEach(id => {
      const cCard = cloudSm2[id];
      const lCard = localSm2[id];
      if (cCard && lCard) {
        const cTime = new Date(cCard.lastReviewed || 0).getTime();
        const lTime = new Date(lCard.lastReviewed || 0).getTime();
        robustSm2[id] = (lTime >= cTime) ? lCard : cCard;
      } else {
        robustSm2[id] = lCard || cCard;
      }
    });

    // 5. Daily reviews union
    const robustDaily = { ...(cloudState.dailyReviews || {}) };
    Object.keys(localState.dailyReviews || {}).forEach(dateStr => {
      robustDaily[dateStr] = Math.max(robustDaily[dateStr] || 0, localState.dailyReviews[dateStr] || 0);
    });

    merged.answers = robustAnswers;
    merged.flagged = robustFlagged;
    merged.notes = robustNotes;
    merged.sm2Cards = robustSm2;
    merged.dailyReviews = robustDaily;
    merged.streak = Math.max(cloudState.streak || 0, localState.streak || 0);

    return merged;
  }

  /**
   * Save state directly to localStorage
   */
  function saveLocal(state, key = STORAGE_KEY) {
    try {
      localStorage.setItem(key, JSON.stringify(state));
      return true;
    } catch (e) {
      console.warn('[StorageSync] LocalStorage write failed:', e);
      return false;
    }
  }

  /**
   * Load state from localStorage with legacy fallback
   */
  function loadLocal(defaultState = {}, key = STORAGE_KEY) {
    try {
      let saved = localStorage.getItem(key);
      if (!saved) {
        saved = localStorage.getItem(LEGACY_STORAGE_KEY);
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultState, ...parsed };
      }
    } catch (e) {
      console.error('[StorageSync] LocalStorage read failed:', e);
    }
    return { ...defaultState };
  }

  /**
   * Push current state to Cloud KV endpoint
   */
  async function pushToCloud(state, endpoint = DEFAULT_CLOUD_ENDPOINT) {
    try {
      const payload = {
        name: 'facharzt_sync_egemelis',
        data: {
          version: '2.0',
          updatedAt: new Date().toISOString(),
          state: state
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      return res.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * Fetch latest state from Cloud KV endpoint
   */
  async function fetchFromCloud(endpoint = DEFAULT_CLOUD_ENDPOINT) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json && json.data && json.data.state) {
          return json.data.state;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Generates a downloadable JSON backup blob
   */
  function createBackupData(state) {
    return {
      version: '2.0',
      timestamp: new Date().toISOString(),
      state: state
    };
  }

  const StorageSync = {
    STORAGE_KEY,
    LEGACY_STORAGE_KEY,
    DEFAULT_CLOUD_ENDPOINT,
    mergeCloudState,
    saveLocal,
    loadLocal,
    pushToCloud,
    fetchFromCloud,
    createBackupData
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageSync;
  } else {
    global.StorageSync = StorageSync;
  }
})(typeof window !== 'undefined' ? window : this);
