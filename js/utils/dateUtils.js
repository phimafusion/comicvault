/**
 * ComicVault - Date Utilities
 * Zentrale Funktionen zum Parsen, Validieren und Formatieren von Datumsangaben
 * (ISO, Deutsches Format, Zeitstempel, Zeitraum-Checks).
 */

/**
 * Parst einen Datumsstring oder ein Date-Objekt in ein natives JavaScript Date-Objekt.
 * Unterstützt ISO (YYYY-MM-DD), Deutsches Format (DD.MM.YYYY, DD.MM.YY, DD.MM.), Timestamps und Date-Instanzen.
 * 
 * @param {string|number|Date} dateStr
 * @returns {Date|null}
 */
export function parseToDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
    
    const s = String(dateStr).trim();
    if (!s || s.toLowerCase() === 'x' || s.toLowerCase() === 'nein') return null;

    // 1. ISO-Format (YYYY-MM-DD...)
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
    }

    // 2. Deutsches Format (DD.MM.YYYY)
    const gerMatch = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    if (gerMatch) {
        return new Date(parseInt(gerMatch[3], 10), parseInt(gerMatch[2], 10) - 1, parseInt(gerMatch[1], 10));
    }

    // 3. Deutsches Format mit 2-stelligem Jahr (DD.MM.YY)
    const gerShortMatch = s.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    if (gerShortMatch) {
        let yr = parseInt(gerShortMatch[3], 10);
        yr = (yr >= 50 ? 1900 : 2000) + yr;
        return new Date(yr, parseInt(gerShortMatch[2], 10) - 1, parseInt(gerShortMatch[1], 10));
    }

    // 4. Nur Tag und Monat (DD.MM. / DD.MM) -> aktuelles Jahr annehmen
    const dayMonthMatch = s.match(/^(\d{2})\.(\d{2})\.?$/);
    if (dayMonthMatch) {
        const now = new Date();
        return new Date(now.getFullYear(), parseInt(dayMonthMatch[2], 10) - 1, parseInt(dayMonthMatch[1], 10));
    }

    // 5. Flexibles Trennzeichen Format (DD-MM-YYYY, DD/MM/YY etc.)
    const flexMatch = s.match(/^(\d{1,4})[\.\-\/\s]+(\d{1,2})[\.\-\/\s]+(\d{1,4})/);
    if (flexMatch) {
        let [_, p1, p2, p3] = flexMatch;
        let y, m, d;
        if (p1.length === 4) {
            y = parseInt(p1, 10); m = parseInt(p2, 10); d = parseInt(p3, 10);
        } else {
            d = parseInt(p1, 10); m = parseInt(p2, 10); y = parseInt(p3, 10);
            if (y < 100) y = (y >= 50 ? 1900 : 2000) + y;
        }
        return new Date(y, m - 1, d);
    }

    // 6. Fallback: Natives JS Parsing
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Parst verschiedene Eingabeformate und gibt einen standardisierten deutschen Datumsstring (DD.MM.YYYY) zurück.
 * 
 * @param {*} val
 * @returns {string}
 */
export function parseDate(val) {
    if (val === undefined || val === null || val === '') return '';
    if (typeof val === 'string') {
        const trimmed = val.trim().toLowerCase();
        if (trimmed === 'x' || trimmed === 'nein') return '';
    }

    const d = parseToDate(val);
    if (d) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    }

    return String(val);
}

/**
 * Formatiert einen Datumsstring für die Anzeige im UI (z. B. '15.01.2026' oder mit shorten=true '15.01.26').
 * 
 * @param {string|Date} dateStr
 * @param {boolean} [shorten=false]
 * @returns {string}
 */
export function displayDate(dateStr, shorten = false) {
    if (!dateStr) return '-';
    
    // ISO (YYYY-MM-DD...)
    const matchIso = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchIso) {
        const y = shorten ? matchIso[1].slice(-2) : matchIso[1];
        return `${matchIso[3]}.${matchIso[2]}.${y}`;
    }
    
    // DD.MM.YYYY
    const matchGer = String(dateStr).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (matchGer) {
        const y = shorten ? matchGer[3].slice(-2) : matchGer[3];
        return `${matchGer[1]}.${matchGer[2]}.${y}`;
    }
    
    // Date Parsing Fallback
    const d = parseToDate(dateStr);
    if (d) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear());
        const y = shorten ? year.slice(-2) : year;
        return `${day}.${month}.${y}`;
    }
    
    return String(dateStr);
}

/**
 * Konvertiert ein deutsches Datum oder ISO-Datum in das HTML-Formularformat (YYYY-MM-DD).
 * 
 * @param {string} dateStr
 * @returns {string}
 */
export function toInputDate(dateStr) {
    if (!dateStr) return '';
    if (String(dateStr).match(/^\d{4}-\d{2}-\d{2}$/)) return String(dateStr);
    
    const parts = String(dateStr).split('.');
    if (parts.length === 3) {
        let [d, m, y] = parts;
        if (d.length === 1) d = '0' + d;
        if (m.length === 1) m = '0' + m;
        if (y.length === 2) {
            const yr = parseInt(y, 10);
            y = (yr > 50 ? '19' : '20') + y;
        }
        return `${y}-${m}-${d}`;
    }
    return String(dateStr);
}

/**
 * Konvertiert einen ISO-Datumsstring (YYYY-MM-DD) in ein deutsches Format (DD.MM.YYYY).
 * 
 * @param {string} dateStr
 * @returns {string}
 */
export function toGermanDate(dateStr) {
    if (!dateStr) return '';
    if (String(dateStr).match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = String(dateStr).split('-');
        return `${d}.${m}.${y}`;
    }
    return String(dateStr);
}

/**
 * Formatiert einen Datumsstring robust in deutsches Format (DD.MM.YYYY).
 * 
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatGermanDate(dateStr) {
    if (!dateStr) return '-';
    const d = parseToDate(dateStr);
    if (!d) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

/**
 * Prüft, ob ein Datum in einem definierten Zeitraum liegt (z. B. 'thisYear', 'last12', 'all').
 * 
 * @param {string|Date} dateStr
 * @param {string} timeframe
 * @returns {boolean}
 */
export function checkDateInRange(dateStr, timeframe) {
    const d = parseToDate(dateStr);
    if (!d) return false;
    if (timeframe === 'all') return true;
    
    const now = new Date();
    let minDate = null;
    let maxDate = null;
    
    if (timeframe === 'last6') {
        minDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    } else if (timeframe === 'last12') {
        minDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    } else if (timeframe === 'thisYear') {
        minDate = new Date(now.getFullYear(), 0, 1);
        maxDate = new Date(now.getFullYear(), 11, 31);
    } else if (timeframe === 'currentAndLastYear') {
        minDate = new Date(now.getFullYear() - 1, 0, 1);
        maxDate = new Date(now.getFullYear(), 11, 31);
    } else if (timeframe === 'lastYear') {
        minDate = new Date(now.getFullYear() - 1, 0, 1);
        maxDate = new Date(now.getFullYear() - 1, 11, 31);
    } else if (timeframe.startsWith('year-')) {
        const yr = parseInt(timeframe.split('-')[1], 10);
        minDate = new Date(yr, 0, 1);
        maxDate = new Date(yr, 11, 31);
    }
    
    if (minDate && d < minDate) return false;
    if (maxDate && d > maxDate) return false;
    return true;
}
