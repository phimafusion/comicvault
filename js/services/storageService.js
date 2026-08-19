/**
 * ComicVault - Central Storage Service
 * Kapselt alle Zugriffe auf den Browser-LocalStorage mit Typsicherheit,
 * automatischem JSON-Parsing/Serializing und robuster Fehlerabfangung (z. B. Private Browsing).
 */

export const STORAGE_KEYS = {
    SETTINGS: 'comicvault_settings',
    VISIBLE_FIELDS: 'comicvault_visible_fields',
    IGNORED_DUPLICATES: 'comicvault_ignored_duplicates',
    AI_INSIGHTS: 'comicvault_ai_insights',
    AI_INSIGHTS_SOURCE: 'comicvault_ai_insights_source',
    AI_INSIGHTS_TIMESTAMP: 'comicvault_ai_insights_timestamp',
    FORCE_MOBILE: 'comicvault_force_mobile',
    THEME: 'comicvault_theme',
    MOCK_MODE: 'mock_mode',
    TESTSUITE_MODE: 'comicvault_testsuite_mode'
};

class StorageService {
    /**
     * Prüft, ob localStorage im aktuellen Kontext verfügbar und beschreibbar ist.
     * @returns {boolean}
     */
    isAvailable() {
        try {
            if (typeof window === 'undefined' || !('localStorage' in window)) {
                return false;
            }
            const testKey = '__cv_storage_test__';
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Liest ein Element und parst es automatisch als JSON.
     * Falls das Parsing fehlschlägt, wird der rohe String zurückgegeben.
     * @template T
     * @param {string} key
     * @param {T} [defaultValue=null]
     * @returns {T|null}
     */
    getItem(key, defaultValue = null) {
        try {
            if (!this.isAvailable()) return defaultValue;
            const item = window.localStorage.getItem(key);
            if (item === null || item === undefined) {
                return defaultValue;
            }
            try {
                return JSON.parse(item);
            } catch {
                return item;
            }
        } catch (err) {
            console.warn(`[StorageService] Fehler beim Lesen von '${key}':`, err);
            return defaultValue;
        }
    }

    /**
     * Speichert einen beliebigen Wert als JSON im localStorage.
     * @param {string} key
     * @param {any} value
     * @returns {boolean} true bei Erfolg
     */
    setItem(key, value) {
        try {
            if (!this.isAvailable()) return false;
            const serialized = typeof value === 'string' ? value : JSON.stringify(value);
            window.localStorage.setItem(key, serialized);
            return true;
        } catch (err) {
            console.warn(`[StorageService] Fehler beim Schreiben von '${key}':`, err);
            return false;
        }
    }

    /**
     * Liest einen reinen String ohne JSON-Parsing.
     * @param {string} key
     * @param {string} [defaultValue='']
     * @returns {string}
     */
    getString(key, defaultValue = '') {
        try {
            if (!this.isAvailable()) return defaultValue;
            const val = window.localStorage.getItem(key);
            return val !== null ? val : defaultValue;
        } catch (err) {
            console.warn(`[StorageService] Fehler beim Lesen von '${key}':`, err);
            return defaultValue;
        }
    }

    /**
     * Speichert einen reinen String.
     * @param {string} key
     * @param {string} value
     * @returns {boolean}
     */
    setString(key, value) {
        try {
            if (!this.isAvailable()) return false;
            window.localStorage.setItem(key, String(value));
            return true;
        } catch (err) {
            console.warn(`[StorageService] Fehler beim Schreiben von '${key}':`, err);
            return false;
        }
    }

    /**
     * Entfernt einen Key aus dem localStorage.
     * @param {string} key
     * @returns {boolean}
     */
    removeItem(key) {
        try {
            if (!this.isAvailable()) return false;
            window.localStorage.removeItem(key);
            return true;
        } catch (err) {
            console.warn(`[StorageService] Fehler beim Entfernen von '${key}':`, err);
            return false;
        }
    }

    /**
     * Prüft, ob ein Key im localStorage existiert.
     * @param {string} key
     * @returns {boolean}
     */
    hasItem(key) {
        try {
            if (!this.isAvailable()) return false;
            return window.localStorage.getItem(key) !== null;
        } catch {
            return false;
        }
    }

    /**
     * Löscht alle Daten aus dem localStorage.
     * @returns {boolean}
     */
    clear() {
        try {
            if (!this.isAvailable()) return false;
            window.localStorage.clear();
            return true;
        } catch (err) {
            console.warn(`[StorageService] Fehler beim Leeren des Speichers:`, err);
            return false;
        }
    }
}

export const storageService = new StorageService();
