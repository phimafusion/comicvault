import { checkDateInRange, parseToDate } from './statsUtils.js';

// Berechnung der KPI-Zähler
export function calculateKPIs(kpiComics, timeframe) {
    const totalComics = kpiComics.length;
    const valueComics = kpiComics.filter(c => ['vorhanden', 'vorbestellt', 'verliehen'].includes(String(c.bestand).toLowerCase()));
    const totalValue = valueComics.reduce((sum, c) => sum + (Number(c.preis) || 0), 0);
    
    const readCount = kpiComics.filter(c => c.gelesen_am && checkDateInRange(c.gelesen_am, timeframe)).length;
    const readPercent = totalComics > 0 ? ((readCount / totalComics) * 100).toFixed(2) : '0.00';
    
    const tbrComics = kpiComics.filter(c => !c.gelesen_am && ['vorhanden', 'vorbestellt', 'verliehen'].includes(String(c.bestand).toLowerCase()));
    const tbrCount = tbrComics.length;
    const tbrValue = tbrComics.reduce((sum, c) => sum + (Number(c.preis) || 0), 0);

    return {
        totalComics,
        totalValue,
        readCount,
        readPercent,
        tbrCount,
        tbrValue
    };
}

// Berechnung der Kennzahlen nach Typ
export function calculateTypeStats(kpiComics, timeframe) {
    const uniqueTypes = [...new Set(kpiComics.map(c => c.typ || 'Unbekannt'))].sort();
    return uniqueTypes.map(type => {
        const typeComics = kpiComics.filter(c => (c.typ || 'Unbekannt') === type);
        const tComics = typeComics.length;
        
        const valComics = typeComics.filter(c => ['vorhanden', 'vorbestellt', 'verliehen'].includes(String(c.bestand).toLowerCase()));
        const valSum = valComics.reduce((sum, c) => sum + (Number(c.preis) || 0), 0);
        
        const rCount = typeComics.filter(c => c.gelesen_am && checkDateInRange(c.gelesen_am, timeframe)).length;
        const rPercent = tComics > 0 ? ((rCount / tComics) * 100).toFixed(2) : '0.00';
        
        const tbrC = typeComics.filter(c => !c.gelesen_am && ['vorhanden', 'vorbestellt', 'verliehen'].includes(String(c.bestand).toLowerCase()));
        const tbrCCount = tbrC.length;
        const tbrCValue = tbrC.reduce((sum, c) => sum + (Number(c.preis) || 0), 0);
        
        return {
            type,
            total: tComics,
            value: valSum,
            readPercent: rPercent,
            tbrCount: tbrCCount,
            tbrValue: tbrCValue
        };
    });
}

// Berechnung der Lese-Challenge
export function calculateReadingChallenge(allComics, readingGoal) {
    const readThisYearCount = allComics.filter(c => c.gelesen_am && checkDateInRange(c.gelesen_am, 'thisYear')).length;
    const challengePercent = Math.min(100, Math.round((readThisYearCount / readingGoal) * 100));
    return {
        readThisYearCount,
        challengePercent
    };
}

// Berechnung der Highlights (Durchschnitte & Rekorde)
export function calculateHighlights(kpiComics, allComics, timeframe) {
    const purchaseMonths = {};
    const readMonths = {};
    let maxPriceComic = null;
    let pricedCount = 0;
    let priceSum = 0;

    kpiComics.forEach(c => {
        // Kaufmonat tracken
        const buyDate = parseToDate(c.kaufdatum || c.created_at);
        if (buyDate) {
            const mKey = `${buyDate.getFullYear()}-${String(buyDate.getMonth() + 1).padStart(2, '0')}`;
            purchaseMonths[mKey] = (purchaseMonths[mKey] || 0) + 1;
        }

        // Lesemonat tracken
        if (c.gelesen_am) {
            const readDate = parseToDate(c.gelesen_am);
            if (readDate) {
                const yr = readDate.getFullYear();
                const mon = readDate.getMonth();
                // Januar 2023 als Platzhalter ignorieren
                if (!(yr === 2023 && mon === 0)) {
                    const mKey = `${yr}-${String(mon + 1).padStart(2, '0')}`;
                    readMonths[mKey] = (readMonths[mKey] || 0) + 1;
                }
            }
        }

        // Teuerster Comic
        const price = Number(c.preis);
        if (!isNaN(price) && c.preis !== null) {
            pricedCount++;
            priceSum += price;
            if (!maxPriceComic || price > Number(maxPriceComic.preis)) {
                maxPriceComic = c;
            }
        }
    });

    const MONATE_MAP = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
    const formatKeyToDisplay = (key) => {
        if (!key) return '-';
        const [y, m] = key.split('-');
        return `${MONATE_MAP[parseInt(m, 10) - 1]} ${y}`;
    };

    let topPurchaseMonth = '-';
    let topPurchaseVal = 0;
    Object.entries(purchaseMonths).forEach(([key, val]) => {
        if (val > topPurchaseVal) {
            topPurchaseVal = val;
            topPurchaseMonth = formatKeyToDisplay(key);
        }
    });

    let topReadMonth = '-';
    let topReadVal = 0;
    Object.entries(readMonths).forEach(([key, val]) => {
        if (val > topReadVal) {
            topReadVal = val;
            topReadMonth = formatKeyToDisplay(key);
        }
    });

    // Lese-Geschwindigkeit
    let speedText = '-';
    if (timeframe === 'all') {
        const totalRead = allComics.filter(c => c.gelesen_am).length;
        // Zeitraum in Monaten berechnen
        let earliestDate = new Date();
        allComics.forEach(c => {
            const d = parseToDate(c.kaufdatum || c.created_at);
            if (d && d < earliestDate && d.getFullYear() >= 2000) earliestDate = d;
        });
        const monthDiff = Math.max(1, (new Date().getFullYear() - earliestDate.getFullYear()) * 12 + (new Date().getMonth() - earliestDate.getMonth()) + 1);
        speedText = `${(totalRead / monthDiff).toFixed(1)} / Monat`;
    } else {
        const readInPeriod = kpiComics.filter(c => c.gelesen_am && checkDateInRange(c.gelesen_am, timeframe)).length;
        let months = 1;
        if (timeframe === 'last6') months = 6;
        else if (timeframe === 'last12') months = 12;
        else if (timeframe === 'thisYear') months = new Date().getMonth() + 1;
        else if (timeframe === 'lastYear') months = 12;
        else if (timeframe.startsWith('year-')) months = 12;
        speedText = `${(readInPeriod / months).toFixed(1)} / Monat`;
    }

    const avgPrice = pricedCount > 0 ? (priceSum / pricedCount).toFixed(2) : '0.00';

    return {
        avgPrice,
        speedText,
        topPurchaseMonth,
        topPurchaseVal,
        topReadMonth,
        topReadVal,
        maxPriceComic
    };
}
