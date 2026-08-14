import { parseToDate } from './stats/statsUtils.js';
import { formatCurrency } from '../utils.js';

/**
 * Filtert Comics basierend auf den Kriterien des Zufallspick-Generators.
 */
export function filterComicsForPick(allComics, { stack = 'unread', verlag = 'all', typ = 'all' } = {}) {
    if (!Array.isArray(allComics)) return [];

    return allComics.filter(c => {
        // 1. Stapel-Filter
        if (stack === 'unread') {
            if (c.bestand !== 'vorhanden' || c.gelesen === true || c.gelesen_am) return false;
        } else if (stack === 'vorhanden') {
            if (c.bestand !== 'vorhanden') return false;
        } else if (stack === 'wunschliste') {
            if (c.bestand !== 'wunschliste') return false;
        } else if (stack === 'read') {
            if (c.bestand !== 'vorhanden' || (!c.gelesen && !c.gelesen_am)) return false;
        }

        // 2. Verlag-Filter
        if (verlag && verlag !== 'all') {
            if (c.verlag !== verlag) return false;
        }

        // 3. Typ / Format-Filter
        if (typ && typ !== 'all') {
            const comicTyp = c.typ || c.format;
            if (comicTyp !== typ) return false;
        }

        return true;
    });
}

/**
 * Berechnet ein dynamisches Smart Insight Badge für die aktuelle Auswahl.
 */
export function calculatePickSmartInsight(comics, stack, currencySymbol = '€') {
    if (!Array.isArray(comics) || comics.length === 0) {
        return 'Keine Comics für die gewählten Kriterien verfügbar.';
    }

    const count = comics.length;

    if (stack === 'unread') {
        const now = new Date();
        let totalDays = 0;
        let validCount = 0;

        comics.forEach(c => {
            const buyDateStr = c.kaufdatum || c.created_at;
            const d = parseToDate(buyDateStr);
            if (d) {
                const diffTime = Math.max(0, now - d);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                totalDays += diffDays;
                validCount++;
            }
        });

        const avgDays = validCount > 0 ? Math.round(totalDays / validCount) : 0;
        return `⏳ Diese <strong>${count}</strong> ungelesenen Bände warten im Schnitt seit <strong>${avgDays} Tagen</strong> auf deinen Lesesessel.`;
    }

    if (stack === 'wunschliste') {
        const totalValue = comics.reduce((sum, c) => sum + (Number(c.preis) || 0), 0);
        return `⭐ Deine Wunschliste umfasst <strong>${count}</strong> Bände im Gesamtwert von <strong>${formatCurrency(totalValue, currencySymbol)}</strong>.`;
    }

    // Standard für vorhandene / gelesene / alle
    const totalValue = comics.reduce((sum, c) => sum + (Number(c.preis) || 0), 0);
    return `🛍️ <strong>${count} Comics</strong> im Gesamtwert von <strong>${formatCurrency(totalValue, currencySymbol)}</strong> im Ziehungstopf.`;
}

/**
 * Wählt zufällig ein Comic aus einer Liste aus.
 */
export function pickRandomComic(comics) {
    if (!Array.isArray(comics) || comics.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * comics.length);
    return comics[randomIndex];
}
