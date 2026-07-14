// Hilfsfunktion zum Parsen von Datumswerten
export function parseToDate(dateStr) {
    if (!dateStr) return null;
    const s = String(dateStr).trim();
    // 1. ISO-Format checken (YYYY-MM-DD...)
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
    }
    // 2. Deutsches Format checken (DD.MM.YYYY)
    const gerMatch = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    if (gerMatch) {
        return new Date(parseInt(gerMatch[3], 10), parseInt(gerMatch[2], 10) - 1, parseInt(gerMatch[1], 10));
    }
    // 3. Deutsches Format mit 2-stelligem Jahr checken (DD.MM.YY)
    const gerShortMatch = s.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    if (gerShortMatch) {
        let yr = parseInt(gerShortMatch[3], 10);
        yr = (yr >= 50 ? 1900 : 2000) + yr;
        return new Date(yr, parseInt(gerShortMatch[2], 10) - 1, parseInt(gerShortMatch[1], 10));
    }
    // 4. Nur DD.MM checken (ohne Jahr -> aktuelles Jahr annehmen)
    const dayMonthMatch = s.match(/^(\d{2})\.(\d{2})\.?$/);
    if (dayMonthMatch) {
        const now = new Date();
        return new Date(now.getFullYear(), parseInt(dayMonthMatch[2], 10) - 1, parseInt(dayMonthMatch[1], 10));
    }
    // Fallback: Natives JS Parsing
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

// Hilfsfunktion zur Überprüfung, ob ein Datum in einem Zeitraum liegt
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
