import { parseToDate } from './statsUtils.js';
import { parseCurrency } from '../../utils.js';

// Berechnung der Top-10 Listen für die Sammelbox im Statistiken-Bereich
// Bezieht sich AUSSCHLIESSLICH auf den physisch vorhandenen Bestand (bestand === 'vorhanden')
export function calculateTop10Lists(allComics) {
    const vorhandenComics = (allComics || []).filter(c => 
        c && c.bestand && String(c.bestand).toLowerCase() === 'vorhanden'
    );

    // 1. 10 Älteste ungelesene Comics (TBR-Klassiker)
    // Filter: ungelesen (!gelesen_am), sortiert nach Kaufdatum aufsteigend
    const unreadComics = vorhandenComics.filter(c => !c.gelesen_am);
    const oldestUnread = [...unreadComics].sort((a, b) => {
        const dateA = parseToDate(a.kaufdatum || a.created_at) || new Date(0);
        const dateB = parseToDate(b.kaufdatum || b.created_at) || new Date(0);
        return dateA - dateB;
    }).slice(0, 10);

    // 2. 10 Zuletzt gekaufte Comics
    // Sortiert nach Kaufdatum absteigend
    const recentPurchases = [...vorhandenComics].sort((a, b) => {
        const dateA = parseToDate(a.kaufdatum || a.created_at) || new Date(0);
        const dateB = parseToDate(b.kaufdatum || b.created_at) || new Date(0);
        return dateB - dateA;
    }).slice(0, 10);

    // 3. 10 Teuerste Comics
    // Sortiert nach Preis absteigend
    const mostExpensive = [...vorhandenComics].sort((a, b) => {
        const priceA = parseCurrency(a.preis) || 0;
        const priceB = parseCurrency(b.preis) || 0;
        return priceB - priceA;
    }).slice(0, 10);

    // 4. 10 Bestbewertete Comics
    // Filter: c.bewertung vorhanden, sortiert nach Bewertung absteigend
    const ratedComics = vorhandenComics.filter(c => c.bewertung !== null && c.bewertung !== undefined && c.bewertung !== '' && Number(c.bewertung) > 0);
    const topRated = [...ratedComics].sort((a, b) => {
        const ratingA = Number(a.bewertung) || 0;
        const ratingB = Number(b.bewertung) || 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        // Zweites Kriterium: Kaufdatum (neueste zuerst)
        const dateA = parseToDate(a.kaufdatum || a.created_at) || new Date(0);
        const dateB = parseToDate(b.kaufdatum || b.created_at) || new Date(0);
        return dateB - dateA;
    }).slice(0, 10);

    // 5. 10 Älteste gelesene Comics im Bestand
    // Filter: gelesen_am vorhanden, sortiert nach Kaufdatum aufsteigend
    const readComics = vorhandenComics.filter(c => c.gelesen_am);
    const oldestRead = [...readComics].sort((a, b) => {
        const dateA = parseToDate(a.kaufdatum || a.created_at) || new Date(0);
        const dateB = parseToDate(b.kaufdatum || b.created_at) || new Date(0);
        return dateA - dateB;
    }).slice(0, 10);

    return {
        oldestUnread,
        recentPurchases,
        mostExpensive,
        topRated,
        oldestRead
    };
}
