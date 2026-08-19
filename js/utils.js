/**
 * ComicVault - Central Utilities Facade (Barrel Export)
 * Re-exportiert alle modularen Utility-Funktionen aus sub-modularen Dateien:
 * - ./utils/dateUtils.js (Datums-Parsing, Formatierung, Zeitraum-Checks)
 * - ./utils/formatUtils.js (XSS-Escaping, Währung, Zahlen, Sterne-Ratings, Platzhalter)
 * - ./utils/domUtils.js (Toasts, Diff-Berechnungen)
 */

export * from './utils/dateUtils.js';
export * from './utils/formatUtils.js';
export * from './utils/domUtils.js';
