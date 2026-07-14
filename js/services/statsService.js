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

// Berechnung der Timeline-Daten (Käufe, Gelesen und TBR kumuliert pro Monat)
export function calculateTimelineData(filteredComics, timeframe) {
    let earliestDate = new Date();
    let hasPurchase = false;
    filteredComics.forEach(c => {
        if (c.kaufdatum) {
            const d = parseToDate(c.kaufdatum);
            if (d && d.getFullYear() >= 2000) {
                if (!hasPurchase || d < earliestDate) {
                    earliestDate = d;
                    hasPurchase = true;
                }
            }
        }
    });
    // Fallback falls kein Comic ein Kaufdatum besitzt
    if (!hasPurchase) {
        filteredComics.forEach(c => {
            const d = parseToDate(c.created_at);
            if (d && d < earliestDate && d.getFullYear() >= 2000) {
                earliestDate = d;
            }
        });
    }

    const now = new Date();
    let startDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    let endDate = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Falls das Startdatum in der Zukunft liegt oder ungültig ist
    if (startDate > endDate) startDate = new Date(endDate);

    const months = [];
    let curr = new Date(startDate);
    while (curr <= endDate) {
        months.push(new Date(curr));
        curr.setMonth(curr.getMonth() + 1);
    }

    const timelineData = [];
    months.forEach(m => {
        const endOfMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59, 999);
        
        const purchased = filteredComics.filter(c => {
            const pDate = parseToDate(c.kaufdatum || c.created_at);
            return pDate && pDate <= endOfMonth;
        }).length;
        
        const read = filteredComics.filter(c => {
            const rDate = parseToDate(c.gelesen_am);
            // Januar 2023 als Platzhalter beim gelesenen Verlauf ignorieren
            if (rDate && rDate.getFullYear() === 2023 && rDate.getMonth() === 0) {
                return false;
            }
            return rDate && rDate <= endOfMonth;
        }).length;
        
        const tbr = Math.max(0, purchased - read);
        
        timelineData.push({
            date: m,
            purchased,
            read,
            tbr
        });
    });

    // Zeitraumfilter auf die Timeline-Anzeige anwenden
    let displayTimeline = [...timelineData];
    if (timeframe !== 'all') {
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
        
        displayTimeline = displayTimeline.filter(d => {
            if (minDate && d.date < minDate) return false;
            if (maxDate && d.date > maxDate) return false;
            return true;
        });
    }

    if (displayTimeline.length === 0) {
        displayTimeline.push({
            date: new Date(),
            purchased: 0,
            read: 0,
            tbr: 0
        });
    }

    return displayTimeline;
}

// Berechnung der Verteilungsdaten für Diagramme (Format, Bestand, Bezugsquellen Ausgaben)
export function calculateDistributionData(kpiComics) {
    const formatData = {};
    const bestandData = {};
    const quellenSpend = {};

    kpiComics.forEach(c => {
        // Format
        const f = c.format || 'Unbekannt';
        formatData[f] = (formatData[f] || 0) + 1;

        // Bestand
        const b = c.bestand || 'Unbekannt';
        const normalizedBestand = b.charAt(0).toUpperCase() + b.slice(1).toLowerCase();
        bestandData[normalizedBestand] = (bestandData[normalizedBestand] || 0) + 1;

        // Bezugsquellen Ausgaben
        if (c.bezugsquelle && c.preis) {
            quellenSpend[c.bezugsquelle] = (quellenSpend[c.bezugsquelle] || 0) + Number(c.preis);
        }
    });

    return {
        formatData,
        bestandData,
        quellenSpend
    };
}

// Berechnung der Top-Listen (Top 5 Verlage und Top 5 Serien)
export function calculateTopLists(kpiComics) {
    const publishersMap = {};
    const seriesMap = {};

    kpiComics.forEach(c => {
        // Verlage
        if (c.verlag) {
            if (!publishersMap[c.verlag]) {
                publishersMap[c.verlag] = { name: c.verlag, total: 0, read: 0, ratingSum: 0, ratedCount: 0 };
            }
            publishersMap[c.verlag].total++;
            if (c.gelesen_am) publishersMap[c.verlag].read++;
            if (c.bewertung) {
                publishersMap[c.verlag].ratingSum += Number(c.bewertung);
                publishersMap[c.verlag].ratedCount++;
            }
        }

        // Serien
        if (c.serie) {
            if (!seriesMap[c.serie]) {
                seriesMap[c.serie] = { name: c.serie, total: 0, read: 0, ratingSum: 0, ratedCount: 0 };
            }
            seriesMap[c.serie].total++;
            if (c.gelesen_am) seriesMap[c.serie].read++;
            if (c.bewertung) {
                seriesMap[c.serie].ratingSum += Number(c.bewertung);
                seriesMap[c.serie].ratedCount++;
            }
        }
    });

    const topPublishers = Object.values(publishersMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    const topSeries = Object.values(seriesMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    return {
        topPublishers,
        topSeries
    };
}

// Suche nach ungewöhnlich frühen Kaufdaten (vor 2020)
export function getEarlyComics(filteredComics) {
    return filteredComics.filter(c => {
        if (!c.kaufdatum) return false;
        const d = parseToDate(c.kaufdatum);
        return d && d.getFullYear() < 2020;
    });
}

// Berechnung der Lesestapel-Entwicklung exklusiv für "vorhanden"
export function calculateInventoryTBRDevelopment(allComics) {
    // Nur Comics betrachten, die "vorhanden" sind
    const inventoryComics = allComics.filter(c => c.bestand === 'vorhanden');
    
    let earliestDate = new Date();
    let hasPurchase = false;
    
    inventoryComics.forEach(c => {
        if (c.kaufdatum) {
            const d = parseToDate(c.kaufdatum);
            if (d && d.getFullYear() >= 2000) {
                if (!hasPurchase || d < earliestDate) {
                    earliestDate = d;
                    hasPurchase = true;
                }
            }
        }
    });
    
    if (!hasPurchase) {
        inventoryComics.forEach(c => {
            const d = parseToDate(c.created_at);
            if (d && d < earliestDate && d.getFullYear() >= 2000) {
                earliestDate = d;
            }
        });
    }

    const now = new Date();
    let startDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    let endDate = new Date(now.getFullYear(), now.getMonth(), 1);
    
    if (startDate > endDate) startDate = new Date(endDate);

    const months = [];
    let curr = new Date(startDate);
    while (curr <= endDate) {
        months.push(new Date(curr));
        curr.setMonth(curr.getMonth() + 1);
    }

    const timelineData = [];
    months.forEach(m => {
        const startOfMonth = new Date(m.getFullYear(), m.getMonth(), 1);
        const endOfMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59, 999);
        
        // Gelesen in diesem spezifischen Monat (nur aus dem "vorhanden" Bestand)
        const readThisMonth = inventoryComics.filter(c => {
            const rDate = parseToDate(c.gelesen_am);
            if (rDate && rDate.getFullYear() === 2023 && rDate.getMonth() === 0) return false;
            return rDate && rDate >= startOfMonth && rDate <= endOfMonth;
        }).length;

        // Gekauft in diesem spezifischen Monat (nur aus dem "vorhanden" Bestand)
        let spentThisMonth = 0;
        const purchasedThisMonth = inventoryComics.filter(c => {
            const pDate = parseToDate(c.kaufdatum || c.created_at);
            const isPurchased = pDate && pDate >= startOfMonth && pDate <= endOfMonth;
            if (isPurchased && c.preis) {
                spentThisMonth += Number(c.preis);
            }
            return isPurchased;
        }).length;

        // Kumulierte Käufe bis Ende des Monats (nur aus dem "vorhanden" Bestand)
        const purchasedTotal = inventoryComics.filter(c => {
            const pDate = parseToDate(c.kaufdatum || c.created_at);
            return pDate && pDate <= endOfMonth;
        }).length;
        
        // Kumuliert Gelesen bis Ende des Monats (nur aus dem "vorhanden" Bestand)
        const readTotal = inventoryComics.filter(c => {
            const rDate = parseToDate(c.gelesen_am);
            if (rDate && rDate.getFullYear() === 2023 && rDate.getMonth() === 0) return false;
            return rDate && rDate <= endOfMonth;
        }).length;
        
        const tbrAtEnd = Math.max(0, purchasedTotal - readTotal);
        
        // Trend im Vergleich zum Vormonat berechnen (wird im nächsten Schritt gefüllt)
        timelineData.push({
            date: m,
            purchasedThisMonth,
            spentThisMonth,
            readThisMonth,
            tbrAtEnd,
            trend: 0,
            trendPercent: 0,
            isMaxRead: false,
            isMaxPurchased: false
        });
    });

    // Trend berechnen
    for (let i = 0; i < timelineData.length; i++) {
        if (i > 0) {
            timelineData[i].trend = timelineData[i].tbrAtEnd - timelineData[i - 1].tbrAtEnd;
            if (timelineData[i - 1].tbrAtEnd > 0) {
                timelineData[i].trendPercent = (timelineData[i].trend / timelineData[i - 1].tbrAtEnd) * 100;
            } else if (timelineData[i].trend > 0) {
                timelineData[i].trendPercent = 100;
            }
        }
    }
    
    // Für den allerersten Monat ist der Trend gleich dem TBR am Ende
    if (timelineData.length > 0) {
        timelineData[0].trend = timelineData[0].tbrAtEnd;
        timelineData[0].trendPercent = timelineData[0].tbrAtEnd > 0 ? 100 : 0;
    }

    // Für die Anzeige drehen wir die Reihenfolge um (neuester zuerst)
    return timelineData.reverse();
}

// Gruppiert die TBR-Daten nach Jahren
export function groupTBRDataByYear(timelineData) {
    const yearsMap = {};
    
    timelineData.forEach(monthData => {
        const year = monthData.date.getFullYear();
        if (!yearsMap[year]) {
            yearsMap[year] = {
                year: year,
                months: [],
                totalRead: 0,
                totalPurchased: 0,
                totalSpent: 0,
                startTBR: 0, // Wird später berechnet
                endTBR: 0    // Wird später berechnet
            };
        }
        
        yearsMap[year].months.push(monthData);
        yearsMap[year].totalRead += monthData.readThisMonth;
        yearsMap[year].totalPurchased += monthData.purchasedThisMonth;
        yearsMap[year].totalSpent += monthData.spentThisMonth;
    });
    
    // Konvertiere zu Array und sortiere nach Jahr absteigend
    const yearsArray = Object.values(yearsMap).sort((a, b) => b.year - a.year);
    
    // Berechne Jahres-Trend und markiere die Maximums pro Jahr
    yearsArray.forEach(y => {
        // Jahres-Trend
        y.endTBR = y.months[0].tbrAtEnd;
        y.startTBR = y.endTBR - y.totalPurchased + y.totalRead;
        y.trend = y.endTBR - y.startTBR;
        
        // Maximums für das jeweilige Jahr berechnen
        let yearMaxRead = -1;
        let yearMaxPurchased = -1;
        
        y.months.forEach(m => {
            // Zuerst bestehende (globale) Flags zurücksetzen, falls sie noch dran hängen
            m.isMaxRead = false;
            m.isMaxPurchased = false;
            
            if (m.readThisMonth > yearMaxRead) yearMaxRead = m.readThisMonth;
            if (m.purchasedThisMonth > yearMaxPurchased) yearMaxPurchased = m.purchasedThisMonth;
        });
        
        // Flags für die Rekordmonate dieses Jahres setzen
        if (yearMaxRead > 0 || yearMaxPurchased > 0) {
            y.months.forEach(m => {
                if (yearMaxRead > 0 && m.readThisMonth === yearMaxRead) m.isMaxRead = true;
                if (yearMaxPurchased > 0 && m.purchasedThisMonth === yearMaxPurchased) m.isMaxPurchased = true;
            });
        }
    });
    
    return yearsArray;
}
