// ComicVault - Central Validation Service (validationService.js)
// Zentraler Validierungs- und Plausibilitäts-Service für Comics, Wunschliste, Abos, ISBN/EAN, Preise und Datumsangaben

/**
 * Bereinigt eine ISBN/EAN-Zeichenkette von Bindestrichen, Leerzeichen und Steuerzeichen
 * @param {string|number} isbn 
 * @returns {string}
 */
export function normalizeISBN(isbn) {
    if (isbn === null || isbn === undefined) return '';
    return String(isbn).replace(/[^0-9X]/gi, '').toUpperCase();
}

/**
 * Validiert eine 10-stellige ISBN anhand der offiziellen Modulo-11 Prüfziffer
 * @param {string|number} isbn 
 * @returns {boolean}
 */
export function isValidISBN10(isbn) {
    const clean = normalizeISBN(isbn);
    if (clean.length !== 10) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
        const digit = parseInt(clean[i], 10);
        if (isNaN(digit)) return false;
        sum += digit * (10 - i);
    }

    const lastChar = clean[9];
    const checkDigit = lastChar === 'X' ? 10 : parseInt(lastChar, 10);
    if (isNaN(checkDigit)) return false;
    sum += checkDigit;

    return sum % 11 === 0;
}

/**
 * Validiert eine 13-stellige ISBN oder EAN-13 anhand der offiziellen Modulo-10 Prüfziffer
 * @param {string|number} isbnOrEan 
 * @returns {boolean}
 */
export function isValidISBN13(isbnOrEan) {
    const clean = normalizeISBN(isbnOrEan);
    if (clean.length !== 13) return false;
    if (!/^\d{13}$/.test(clean)) return false;

    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(clean[i], 10);
        sum += digit * (i % 2 === 0 ? 1 : 3);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(clean[12], 10);
}

/**
 * Validiert, ob eine Zeichenkette eine gültige ISBN-10, ISBN-13 oder EAN-13 ist
 * @param {string|number} val 
 * @returns {boolean}
 */
export function isValidISBN(val) {
    if (!val) return false;
    const clean = normalizeISBN(val);
    if (clean.length === 10) return isValidISBN10(clean);
    if (clean.length === 13) return isValidISBN13(clean);
    return false;
}

/**
 * Prüft, ob ein Preis gültig und plausibel ist (nicht negativ, numerisch)
 * @param {*} val 
 * @returns {boolean}
 */
export function isValidPrice(val) {
    if (val === null || val === undefined || val === '') return true; // Leerer Preis ist optional
    if (typeof val === 'number') {
        return !isNaN(val) && isFinite(val) && val >= 0 && val <= 1000000;
    }
    if (typeof val === 'string') {
        const clean = val.replace(/\s+/g, '').replace('€', '').replace('EUR', '').replace(',', '.');
        const num = parseFloat(clean);
        return !isNaN(num) && isFinite(num) && num >= 0 && num <= 1000000 && /^\d+(\.\d{1,2})?$/.test(clean);
    }
    return false;
}

/**
 * Bereinigt und parst einen Preis sicher zu einer Zahl mit 2 Nachkommastellen
 * @param {*} val 
 * @returns {number|null}
 */
export function sanitizePrice(val) {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') {
        if (isNaN(val) || !isFinite(val) || val < 0) return 0;
        return Math.round(val * 100) / 100;
    }
    const clean = String(val).replace(/\s+/g, '').replace('€', '').replace('EUR', '').replace(',', '.');
    const num = parseFloat(clean);
    if (isNaN(num) || !isFinite(num) || num < 0) return 0;
    return Math.round(num * 100) / 100;
}

/**
 * Prüft, ob eine Jahreszahl historisch und plausibel ist (1800 bis aktuelles Jahr + 2)
 * @param {*} val 
 * @param {number} [minYear=1800]
 * @param {number} [maxOffset=2]
 * @returns {boolean}
 */
export function isValidYear(val, minYear = 1800, maxOffset = 2) {
    if (val === null || val === undefined || val === '') return true;
    const year = parseInt(val, 10);
    if (isNaN(year)) return false;
    const currentYear = new Date().getFullYear();
    return year >= minYear && year <= (currentYear + maxOffset);
}

/**
 * Prüft, ob ein Kalenderdatum existiert und ein echtes Datum darstellt (YYYY-MM-DD oder DD.MM.YYYY)
 * @param {*} val 
 * @returns {boolean}
 */
export function isValidDate(val) {
    if (!val) return true; // Optionales Feld
    const str = String(val).trim();

    // ISO Format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, d] = str.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    }

    // Deutsches Format DD.MM.YYYY
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(str)) {
        const [d, m, y] = str.split('.').map(Number);
        const date = new Date(y, m - 1, d);
        return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    }

    return false;
}

/**
 * Prüft eine Comic-Bewertung (0 bis 10 Sterne / Punkte)
 * @param {*} val 
 * @returns {boolean}
 */
export function isValidRating(val) {
    if (val === null || val === undefined || val === '') return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0 && num <= 10;
}

/**
 * Vollständige Validierung eines Comic-Datensatzes
 * @param {Object} comic 
 * @param {Object} [options]
 * @param {boolean} [options.isWishlist=false]
 * @returns {{ isValid: boolean, errors: Object.<string, string>, warnings: Object.<string, string> }}
 */
export function validateComic(comic = {}, { isWishlist = false } = {}) {
    const errors = {};
    const warnings = {};

    if (!comic || typeof comic !== 'object') {
        return { isValid: false, errors: { general: 'Ungültiges Datenobjekt.' }, warnings };
    }

    // 1. Pflichtfeld-Prüfung: Entweder Titel oder Serie muss vorhanden sein
    const titel = String(comic.titel || '').trim();
    const serie = String(comic.serie || '').trim();

    if (!titel && !serie) {
        errors.titel = 'Bitte gib mindestens einen Titel oder eine Serie an.';
    }

    // 2. Preis-Validierung
    if (comic.preis !== undefined && comic.preis !== null && comic.preis !== '') {
        if (!isValidPrice(comic.preis)) {
            errors.preis = 'Der Preis muss eine gültige, positive Zahl sein (z. B. 4.99).';
        }
    }

    // 3. Jahres-Validierung
    if (comic.jahr !== undefined && comic.jahr !== null && comic.jahr !== '') {
        if (!isValidYear(comic.jahr)) {
            errors.jahr = `Das Erscheinungsjahr muss zwischen 1800 und ${new Date().getFullYear() + 2} liegen.`;
        }
    }

    // 4. Kaufdatum-Validierung
    if (comic.kaufdatum) {
        if (!isValidDate(comic.kaufdatum)) {
            errors.kaufdatum = 'Das Kaufdatum ist ungültig (Format: TT.MM.JJJJ oder JJJJ-MM-TT).';
        }
    }

    // 5. Gelesen-am-Validierung
    if (comic.gelesen_am) {
        if (!isValidDate(comic.gelesen_am)) {
            errors.gelesen_am = 'Das Gelesen-Datum ist ungültig (Format: TT.MM.JJJJ oder JJJJ-MM-TT).';
        }
    }

    // 6. Bewertung
    if (comic.bewertung !== undefined && comic.bewertung !== null && comic.bewertung !== '') {
        if (!isValidRating(comic.bewertung)) {
            errors.bewertung = 'Die Bewertung muss zwischen 0 und 10 liegen.';
        }
    }

    // 7. ISBN / EAN (Warnung bei fehlerhafter Prüfziffer, falls angegeben)
    if (comic.isbn) {
        const cleanIsbn = normalizeISBN(comic.isbn);
        if (cleanIsbn.length > 0 && !isValidISBN(cleanIsbn)) {
            warnings.isbn = 'Die eingegebene ISBN/EAN besitzt eine ungültige Prüfziffer.';
        }
    }

    // 8. Limitierung
    if (comic.limitierung && comic.limitiert_auf) {
        const limNum = Number(comic.limitiert_auf);
        if (isNaN(limNum) || limNum <= 0) {
            errors.limitiert_auf = 'Die Limitierungsauflage muss eine positive Zahl sein.';
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        warnings
    };
}

/**
 * Validierung eines Wunschlisten-Eintrags
 * @param {Object} wish 
 * @returns {{ isValid: boolean, errors: Object.<string, string>, warnings: Object.<string, string> }}
 */
export function validateWishlist(wish = {}) {
    const errors = {};
    const warnings = {};

    if (!wish || typeof wish !== 'object') {
        return { isValid: false, errors: { general: 'Ungültiges Datenobjekt.' }, warnings };
    }

    const titel = String(wish.titel || '').trim();
    if (!titel) {
        errors.titel = 'Der Titel des Wunsch-Comics darf nicht leer sein.';
    }

    if (wish.preis !== undefined && wish.preis !== null && wish.preis !== '') {
        if (!isValidPrice(wish.preis)) {
            errors.preis = 'Der Preis muss eine gültige, positive Zahl sein.';
        }
    }

    if (wish.jahr !== undefined && wish.jahr !== null && wish.jahr !== '') {
        if (!isValidYear(wish.jahr)) {
            errors.jahr = 'Das Erscheinungsjahr ist ungültig.';
        }
    }

    if (wish.isbn) {
        const cleanIsbn = normalizeISBN(wish.isbn);
        if (cleanIsbn.length > 0 && !isValidISBN(cleanIsbn)) {
            warnings.isbn = 'Die ISBN besitzt eine ungültige Prüfziffer.';
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        warnings
    };
}

/**
 * Validierung eines Abonnements
 * @param {Object} sub 
 * @returns {{ isValid: boolean, errors: Object.<string, string> }}
 */
export function validateSubscription(sub = {}) {
    const errors = {};

    if (!sub || typeof sub !== 'object') {
        return { isValid: false, errors: { general: 'Ungültiges Datenobjekt.' } };
    }

    const titel = String(sub.titel || '').trim();
    if (!titel) {
        errors.titel = 'Der Serien- oder Comic-Titel für das Abo darf nicht leer sein.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

export const validationService = {
    normalizeISBN,
    isValidISBN10,
    isValidISBN13,
    isValidISBN,
    isValidPrice,
    sanitizePrice,
    isValidYear,
    isValidDate,
    isValidRating,
    validateComic,
    validateWishlist,
    validateSubscription
};
