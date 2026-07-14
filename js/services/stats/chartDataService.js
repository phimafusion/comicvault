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
