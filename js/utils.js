// ComicVault Utilities

export function displayDate(dateStr, shorten = false) {
    if (!dateStr) return '-';
    
    // YYYY-MM-DD (Fallback für alte Einträge)
    const matchIso = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchIso) {
        const y = shorten ? matchIso[1].slice(-2) : matchIso[1];
        return `${matchIso[3]}.${matchIso[2]}.${y}`;
    }
    
    // DD.MM.YYYY (Aktuelles Standard-Format)
    const matchGer = String(dateStr).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (matchGer) {
        const y = shorten ? matchGer[3].slice(-2) : matchGer[3];
        return `${matchGer[1]}.${matchGer[2]}.${y}`;
    }
    
    // Langes Format (z.B. Zeitstempel)
    if (String(dateStr).length > 15) {
        const d = new Date(dateStr);
        if (!isNaN(d)) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = String(d.getFullYear());
            const y = shorten ? year.slice(-2) : year;
            return `${day}.${month}.${y}`;
        }
    }
    
    return dateStr;
}

export function toInputDate(dateStr) {
    if (!dateStr) return '';
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    const parts = dateStr.split('.');
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
    return dateStr;
}

export function toGermanDate(dateStr) {
    if (!dateStr) return '';
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = dateStr.split('-');
        return `${d}.${m}.${y}`;
    }
    return dateStr;
}

export function parseDate(val) {
    if (val === undefined || val === null || val === "") return '';

    let dateObj = null;

    // 1. Falls es bereits ein Date-Objekt ist
    if (val instanceof Date) {
        dateObj = val;
    }
    // 2. Falls es ein langer String ist (z.B. Zeitstempel)
    else if (typeof val === 'string' && val.length > 15) {
        const d = new Date(val);
        if (!isNaN(d)) dateObj = d;
    }

    if (dateObj) {
        // Zeitverschiebung ausgleichen für lokales Datum
        const d = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000));
        const iso = d.toISOString().split('T')[0];
        const [y, m, day] = iso.split('-');
        return `${day}.${m}.${y}`;
    }

    let str = String(val).toLowerCase().trim();
    if (str === 'x' || str === 'nein') return '';

    // Flexibles Format: DD.MM.YYYY, DD.MM.YY, DD/MM/YY, DD-MM-YYYY, YYYY-MM-DD etc.
    const dateMatch = str.match(/(\d{1,4})[\.\-\/\s]+(\d{1,2})[\.\-\/\s]+(\d{1,4})/);
    if (dateMatch) {
        let [_, p1, p2, p3] = dateMatch;
        
        let y, m, d;
        // Wenn der erste Teil 4 Ziffern hat, gehen wir von YYYY-MM-DD aus
        if (p1.length === 4) {
            y = p1; m = p2; d = p3;
        } else {
            // Ansonsten DD-MM-YYYY oder DD-MM-YY
            d = p1; m = p2; y = p3;
            if (y.length === 2) {
                const yearNum = parseInt(y, 10);
                y = (yearNum >= 50 ? '19' : '20') + y;
            } else if (y.length === 1) {
                y = '200' + y;
            }
        }
        
        return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
    }

    return str;
}

export function parseCurrency(val) {
    if (val === undefined || val === null || val === "") return null;
    if (typeof val === 'number') return val;
    let str = String(val);
    let clean = str.replace(/[^\d,.]/g, '');
    if (!clean) return null;
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) clean = clean.replace(/\./g, '').replace(',', '.');
    else if (lastDot > lastComma) clean = clean.replace(/,/g, '');
    else if (lastComma !== -1) clean = clean.replace(',', '.');
    return parseFloat(clean);
}

export function parseStars(val) {
    if (val === undefined || val === null || val === "") return 0;
    if (typeof val === 'number') return val <= 5 ? val * 2 : Math.min(val, 10);
    let str = String(val);
    const stars = (str.match(/[★⭐*]/g) || []).length;
    if (stars > 0) return stars * 2;
    
    const digitsOnly = str.replace(/[^\d.]/g, '');
    if (!digitsOnly) return 0;
    
    const num = parseFloat(digitsOnly);
    if (!isNaN(num)) return num <= 5 ? num * 2 : Math.min(num, 10);
    return 0;
}

export function renderStars(rating) {
    if (!rating) return '-';
    let starsHtml = '<div class="stars-display">';
    for (let i = 1; i <= 5; i++) {
        const val = i * 2;
        if (rating >= val) {
            starsHtml += '<i class="fa-solid fa-star"></i>';
        } else if (rating === val - 1) {
            starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
        } else {
            starsHtml += '<i class="fa-regular fa-star" style="opacity: 0.3;"></i>';
        }
    }
    starsHtml += '</div>';
    return starsHtml;
}

export function getPlaceholderImage() {
    // Ein cooles, lokales SVG als Data-URI: Dunkelgrauer Hintergrund mit einem coolen "POW!"-Design.
    // Das ist 100% offline-fähig, lädt ohne Latenz und kann nicht von AdBlockern blockiert werden.
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><rect width="100%" height="100%" fill="%231e293b"/><g transform="translate(200, 300)"><path d="M-80,-50 L-30,-70 L0,-40 L40,-80 L60,-30 L100,-40 L70,10 L90,50 L40,30 L20,70 L-20,40 L-60,70 L-40,20 L-90,10 Z" fill="%2306b6d4" stroke="%230891b2" stroke-width="6"/><text x="0" y="15" font-family="Impact, Arial Black, sans-serif" font-size="48" font-weight="bold" fill="%23ffffff" text-anchor="middle" transform="rotate(-15)">POW!</text></g></svg>`;
}

// Comparison Helpers
export function getChangedFields(oldData, newData) {
    const fields = [
        'titel', 'typ', 'serie', 'nummer', 'verlag', 'format', 'jahr', 
        'zustand', 'bezugsquelle', 'preis', 'sprache', 'limitierung', 
        'limitiert_auf', 'variant', 'variantname', 'bemerkung', 
        'kaufdatum', 'bestand', 'gelesen_am', 'bewertung'
    ];
    const diffs = [];
    fields.forEach(f => {
        let v1 = oldData[f];
        let v2 = newData[f];

        // Normalize
        if (v1 === null || v1 === undefined) v1 = '';
        if (v2 === null || v2 === undefined) v2 = '';
        
        // Special case for numbers
        if (typeof v1 === 'number' || typeof v2 === 'number') {
            if (Number(v1) !== Number(v2)) diffs.push(f);
            return;
        }

        if (String(v1).trim() !== String(v2).trim()) {
            diffs.push(f);
        }
    });
    return diffs;
}

export function getWishlistChangedFields(oldData, newData) {
    const fields = [
        'titel', 'typ', 'format', 'preis', 'jahr', 'bemerkung',
        'isbn', 'vorbestellt', 'besonderheit'
    ];
    const diffs = [];
    fields.forEach(f => {
        let v1 = oldData[f];
        let v2 = newData[f];

        // Normalize
        if (v1 === null || v1 === undefined) v1 = '';
        if (v2 === null || v2 === undefined) v2 = '';
        
        // Special case for numbers
        if (typeof v1 === 'number' || typeof v2 === 'number') {
            if (Number(v1) !== Number(v2)) diffs.push(f);
            return;
        }

        // Special case for booleans
        if (typeof v1 === 'boolean' || typeof v2 === 'boolean') {
            if (Boolean(v1) !== Boolean(v2)) diffs.push(f);
            return;
        }

        if (String(v1).trim() !== String(v2).trim()) {
            diffs.push(f);
        }
    });
    return diffs;
}
