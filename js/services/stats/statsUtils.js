// ComicVault - Stats Utilities
// Nutzt die zentralen dateUtils für Datums-Parsing und Zeitraumprüfung
import { parseToDate, formatGermanDate, checkDateInRange } from '../../utils/dateUtils.js';

export { parseToDate, formatGermanDate, checkDateInRange };

// Hilfsfunktion zur Prüfung, ob ein Comic zum ausgewählten Zeitraum gehört
export function isComicInTimeframe(c, timeframe) {
    if (timeframe === 'all') return true;
    const buyDateStr = c.kaufdatum || c.created_at;
    return checkDateInRange(buyDateStr, timeframe) || (c.gelesen_am && checkDateInRange(c.gelesen_am, timeframe));
}

// Filterung der Comics nach Dropdown-Filterwerten
export function filterComicsByDropdowns(allComics, activeStatsFilters) {
    let filteredComics = [...allComics];
    if (activeStatsFilters.verlag && activeStatsFilters.verlag.length > 0) {
        filteredComics = filteredComics.filter(c => activeStatsFilters.verlag.includes(c.verlag));
    }
    if (activeStatsFilters.format && activeStatsFilters.format.length > 0) {
        filteredComics = filteredComics.filter(c => activeStatsFilters.format.includes(c.format));
    }
    if (activeStatsFilters.bestand && activeStatsFilters.bestand.length > 0) {
        filteredComics = filteredComics.filter(c => activeStatsFilters.bestand.includes(c.bestand));
    }
    if (activeStatsFilters.sprache && activeStatsFilters.sprache.length > 0) {
        filteredComics = filteredComics.filter(c => activeStatsFilters.sprache.includes(c.sprache));
    }
    if (activeStatsFilters.typ && activeStatsFilters.typ.length > 0) {
        filteredComics = filteredComics.filter(c => activeStatsFilters.typ.includes(c.typ));
    }
    if (activeStatsFilters.serie && activeStatsFilters.serie.length > 0) {
        filteredComics = filteredComics.filter(c => activeStatsFilters.serie.includes(c.serie));
    }
    return filteredComics;
}
