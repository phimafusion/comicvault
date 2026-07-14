import { parseToDate } from './statsUtils.js';

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

// Suche nach ungewöhnlich frühen Kaufdaten (vor 2020)
export function getEarlyComics(filteredComics) {
    return filteredComics.filter(c => {
        if (!c.kaufdatum) return false;
        const d = parseToDate(c.kaufdatum);
        return d && d.getFullYear() < 2020;
    });
}
