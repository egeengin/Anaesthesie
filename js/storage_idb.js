/**
 * FACHARZTPRÜFUNG ANÄSTHESIOLOGIE - INDEXEDDB STORAGE PERSISTENCE ENGINE
 * Provides robust asynchronous storage with automatic fallback to LocalStorage
 */

(function (global) {
  'use strict';

  const DB_NAME = 'FacharztAnaesthesieDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'app_state';

  class IDBStorageEngine {
    constructor() {
      this.db = null;
      this.supported = typeof window !== 'undefined' && 'indexedDB' in window;
    }

    async initDB() {
      if (!this.supported) return false;

      return new Promise((resolve) => {
        try {
          const request = window.indexedDB.open(DB_NAME, DB_VERSION);

          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME);
            }
          };

          request.onsuccess = (event) => {
            this.db = event.target.result;
            resolve(true);
          };

          request.onerror = (err) => {
            console.warn('[IDBStorage] IndexedDB open error, falling back to LocalStorage:', err);
            resolve(false);
          };
        } catch (e) {
          console.warn('[IDBStorage] Exception opening IndexedDB:', e);
          resolve(false);
        }
      });
    }

    async setItem(key, value) {
      if (!this.db) {
        const initialized = await this.initDB();
        if (!initialized) {
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch (e) {
            console.warn('[IDBStorage] LocalStorage set error:', e);
          }
          return;
        }
      }

      return new Promise((resolve) => {
        try {
          const tx = this.db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(value, key);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          console.warn('[IDBStorage] IDB setItem error:', e);
          resolve(false);
        }
      });
    }

    async getItem(key) {
      if (!this.db) {
        const initialized = await this.initDB();
        if (!initialized) {
          try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
          } catch (e) {
            return null;
          }
        }
      }

      return new Promise((resolve) => {
        try {
          const tx = this.db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(key);

          req.onsuccess = () => {
            if (req.result !== undefined) {
              resolve(req.result);
            } else {
              // Try LocalStorage fallback
              try {
                const raw = localStorage.getItem(key);
                resolve(raw ? JSON.parse(raw) : null);
              } catch (e) {
                resolve(null);
              }
            }
          };

          req.onerror = () => {
            resolve(null);
          };
        } catch (e) {
          resolve(null);
        }
      });
    }
  }

  const IDBEngine = new IDBStorageEngine();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = IDBStorageEngine;
  } else {
    global.IDBStorageEngine = IDBEngine;
  }
})(typeof window !== 'undefined' ? window : this);
