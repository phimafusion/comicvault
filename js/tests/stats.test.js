import { renderStats, cleanupStats } from '../views/stats.js';
import { setupTestEnv, cleanup } from './testHelper.js';
import * as statsService from '../services/statsService.js';

const { expect } = chai;

describe('ComicVault Statistiken & Lesestapel Tests', () => {
    let testEnv;
    let container;
    let mockComics = [];

    beforeEach(async () => {
        // Mock-Daten mit definierten Kauf- und Lesedaten
        // Wir erstellen:
        // - c1: Gekauft Jan 2026, Vorhanden, Gelesen Feb 2026, Preis 12.50
        // - c2: Gekauft Feb 2026, Vorhanden, Ungelesen, Preis 20.00
        // - c3: Gekauft März 2026, Vorbestellt, Ungelesen, Preis 15.00
        // - c4: Gekauft 2025 (historisch), Verkauft, Gelesen 2025, Preis 8.00
        mockComics = [
            {
                id: 'c1',
                titel: 'Batman #1',
                serie: 'Batman',
                verlag: 'DC',
                format: 'Softcover',
                bestand: 'vorhanden',
                preis: 12.50,
                kaufdatum: '15.01.2026',
                gelesen_am: '10.02.2026',
                typ: 'Comic',
                sprache: 'Deutsch',
                bewertung: 8
            },
            {
                id: 'c2',
                titel: 'Spider-Man #1',
                serie: 'Spider-Man',
                verlag: 'Marvel',
                format: 'Hardcover',
                bestand: 'vorhanden',
                preis: 20.00,
                kaufdatum: '20.02.2026',
                gelesen_am: '',
                typ: 'Comic',
                sprache: 'Deutsch',
                bewertung: null
            },
            {
                id: 'c3',
                titel: 'Saga #1',
                serie: 'Saga',
                verlag: 'Image',
                format: 'Softcover',
                bestand: 'vorbestellt',
                preis: 15.00,
                kaufdatum: '05.03.2026',
                gelesen_am: '',
                typ: 'Graphic Novel',
                sprache: 'Englisch',
                bewertung: null
            },
            {
                id: 'c4',
                titel: 'Spawn #1',
                serie: 'Spawn',
                verlag: 'Image',
                format: 'Heft',
                bestand: 'verkauft',
                preis: 8.00,
                kaufdatum: '10.11.2025',
                gelesen_am: '12.11.2025',
                typ: 'Comic',
                sprache: 'Deutsch',
                bewertung: 10
            }
        ];

        testEnv = setupTestEnv({
            mockComics: mockComics
        });
        
        container = testEnv.viewContainer;

        // Render stats view
        await renderStats(container);
        
        // Standardmäßig den Bestand-Filter "vorhanden" deaktivieren, damit alle Tests
        // wie gewohnt mit dem gesamten Datensatz starten.
        const vorhandenCheckbox = container.querySelector('.stats-filter-checkbox[data-key="bestand"][value="vorhanden"]');
        if (vorhandenCheckbox && vorhandenCheckbox.checked) {
            vorhandenCheckbox.checked = false;
            vorhandenCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Kurze Pause, damit DOM und eventuelle Chart-Instanziierungen durchlaufen
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(() => {
        cleanupStats();
        cleanup();
    });

    it('sollte die Statistiken-View korrekt rendern (Filter, KPIs, Canvas-Container)', () => {
        console.log('DEBUG CONTAINER INNERHTML:', container.innerHTML);
        // Titel prüfen
        const title = container.querySelector('.view-title');
        expect(title.textContent).to.equal('Statistiken & Analysen');

        // Filter prüfen
        const filters = container.querySelectorAll('.stats-filter-trigger');
        expect(filters.length).to.equal(6); // Verlag, Serie, Format, Bestand, Sprache, Typ

        const timeframeSelect = container.querySelector('#select-stats-timeframe');
        expect(timeframeSelect).to.not.be.null;

        // KPIs prüfen
        const kpiCards = container.querySelectorAll('#stats-summary .details-card');
        expect(kpiCards.length).to.equal(5);

        // Canvas-Elemente für Charts prüfen
        expect(container.querySelector('#chartTimeline')).to.not.be.null;
        expect(container.querySelector('#chartFormat')).to.not.be.null;
        expect(container.querySelector('#chartBestand')).to.not.be.null;
        expect(container.querySelector('#chartQuellen')).to.not.be.null;
    });

    it('sollte die KPI-Werte (Größe, Sammlungswert, Gelesen-Quote, TBR) richtig berechnen', () => {
        const kpiCards = container.querySelectorAll('#stats-summary .details-card');
        
        // standardmäßig ist Zeitraum = "all" ausgewählt.
        // Alle 4 Comics werden berücksichtigt.
        // Gesamtanzahl: 4
        expect(kpiCards[0].firstElementChild.textContent).to.equal('4');
        
        // Sammlungswert: Nur Vorhanden, Vorbestellt, Verliehen.
        // c1 (12.50) + c2 (20.00) + c3 (15.00) = 47.50. c4 ist "verkauft" -> 0.
        expect(kpiCards[1].firstElementChild.textContent).to.contain('47.50');
        
        // Gelesen-Quote: c1 und c4 sind gelesen -> 2 von 4 = 50.00%
        expect(kpiCards[2].firstElementChild.textContent).to.equal('50.00%');

        // Lesestapel (TBR) Anzahl: c2 und c3 sind im Besitz/bestellt und ungelesen -> 2
        expect(kpiCards[3].firstElementChild.textContent).to.equal('2');

        // Lesestapel (TBR) Wert: c2 (20.00) + c3 (15.00) = 35.00
        expect(kpiCards[4].firstElementChild.textContent).to.contain('35.00');
    });

    it('sollte die Lese-Challenge (Jahresziel) anzeigen und aktualisieren können', async () => {
        const goalInput = container.querySelector('#input-reading-goal');
        expect(goalInput).to.not.be.null;
        expect(goalInput.value).to.equal('50'); // Default

        const ratioSpan = container.querySelector('#challenge-ratio');
        // Im Jahr 2026 (currentYear): c1 ist im Feb 2026 gelesen. c4 ist im Nov 2025 gelesen.
        // Also 1 gelesener Comic in 2026.
        expect(ratioSpan.textContent).to.equal('1 / 50');

        // Leseziel ändern auf 10
        goalInput.value = '10';
        goalInput.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 50));

        // Neues Ratio prüfen: 1 / 10
        expect(ratioSpan.textContent).to.equal('1 / 10');
        
        // Prüfen, ob das Ziel in den Settings gespeichert wurde
        const savedSettings = testEnv.getSavedSettings();
        expect(savedSettings.readingGoal).to.equal(10);
    });

    it('sollte die KPI-Werte bei Änderung des Zeitraum-Filters anpassen', async () => {
        const timeframeSelect = container.querySelector('#select-stats-timeframe');
        
        // Zeitraum auf "Dieses Jahr" (2026) stellen
        timeframeSelect.value = 'thisYear';
        timeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 50));

        const kpiCards = container.querySelectorAll('#stats-summary .details-card');
        
        // In 2026: c1, c2, c3 (Kaufdatum in 2026). c4 ist in 2025 gekauft/gelesen.
        // Comics gefiltert: 3
        expect(kpiCards[0].firstElementChild.textContent).to.equal('3');

        // Sammlungswert in 2026: c1 (12.50) + c2 (20.00) + c3 (15.00) = 47.50
        expect(kpiCards[1].firstElementChild.textContent).to.contain('47.50');

        // Gelesen-Quote in 2026: Nur c1 ist gelesen -> 1 von 3 = 33.33%
        expect(kpiCards[2].firstElementChild.textContent).to.equal('33.33%');

        // TBR-Anzahl in 2026: c2, c3 ungelesen -> 2
        expect(kpiCards[3].firstElementChild.textContent).to.equal('2');
    });

    it('sollte die KPI-Werte bei Auswahl eines Dropdown-Filters anpassen', async () => {
        // Image-Verlag filtern
        // Wir simulieren den Klick auf die Checkbox für "Image" im Dropdown "verlag"
        const imageCheckbox = container.querySelector('.stats-filter-checkbox[data-key="verlag"][value="Image"]');
        expect(imageCheckbox).to.not.be.null;

        imageCheckbox.checked = true;
        imageCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 50));

        const kpiCards = container.querySelectorAll('#stats-summary .details-card');
        
        // Nur c3 und c4 sind von Image.
        // Comics gefiltert: 2
        expect(kpiCards[0].firstElementChild.textContent).to.equal('2');

        // Sammlungswert für Image: c3 (15.00) ist vorbestellt. c4 (8.00) ist verkauft (nicht im Bestand).
        // Also 15.00
        expect(kpiCards[1].firstElementChild.textContent).to.contain('15.00');

        // Gelesen-Quote für Image: c4 ist gelesen, c3 nicht -> 1 von 2 = 50.00%
        expect(kpiCards[2].firstElementChild.textContent).to.equal('50.00%');
    });

    it('sollte die Highlights, Averages und Top Listen korrekt berechnen', () => {
        // Ø Preis berechnen: (12.50 + 20.00 + 15.00 + 8.00) / 4 = 55.50 / 4 = 13.88
        const avgPriceEl = container.querySelector('#stats-highlights').firstElementChild;
        expect(avgPriceEl.lastElementChild.textContent).to.contain('13.88');

        // Top Verlage überprüfen: Image hat 2 Comics (c3, c4). Marvel hat 1 (c2), DC hat 1 (c1).
        // Image sollte an Platz 1 stehen.
        const topPublishersRows = container.querySelectorAll('#table-top-publishers tbody tr');
        expect(topPublishersRows.length).to.be.greaterThan(0);
        expect(topPublishersRows[0].firstElementChild.textContent).to.equal('Image');
        expect(topPublishersRows[0].children[1].textContent).to.equal('2');
    });

    it('sollte die typ-spezifischen KPIs berechnen und bei Filterung aktualisieren', async () => {
        // Container prüfen
        const typeContainer = container.querySelector('#stats-by-type-container');
        expect(typeContainer).to.not.be.null;
        expect(typeContainer.style.display).to.not.equal('none');

        // Wir haben in mockComics:
        // c1 (Comic): DC, kaufdatum 15.01.2026, gelesen_am 10.02.2026, preis 12.50, bestand vorhanden
        // c2 (Comic): Marvel, kaufdatum 20.02.2026, gelesen_am '', preis 20.00, bestand vorhanden
        // c3 (Graphic Novel): Image, kaufdatum 05.03.2026, gelesen_am '', preis 15.00, bestand vorbestellt
        // c4 (Comic): Image, kaufdatum 10.11.2025, gelesen_am 12.11.2025, preis 8.00, bestand verkauft

        // Typen: "Comic" und "Graphic Novel"
        const rows = typeContainer.querySelectorAll('.stats-type-row');
        expect(rows.length).to.equal(2);

        // Prüfe Comic Reihe (sortiert: Comic, Graphic Novel)
        const comicRow = rows[0];
        expect(comicRow.dataset.type).to.equal('Comic');
        // Anzahl: c1, c2, c4 -> 3
        expect(comicRow.children[1].textContent).to.equal('3');
        // Sammlungswert: c1 (12.50) + c2 (20.00) = 32.50 (c4 ist verkauft)
        expect(comicRow.children[2].textContent).to.contain('32.50');
        // Gelesen Quote: c1 und c4 gelesen -> 2 von 3 = 66.67%
        expect(comicRow.children[3].textContent).to.contain('66.67%');
        // TBR count: c2 (c1 gelesen, c4 verkauft) -> 1
        expect(comicRow.children[4].textContent).to.equal('1');
        // TBR value: c2 -> 20.00
        expect(comicRow.children[5].textContent).to.contain('20.00');

        // Prüfe Graphic Novel Reihe
        const gnRow = rows[1];
        expect(gnRow.dataset.type).to.equal('Graphic Novel');
        // Anzahl: c3 -> 1
        expect(gnRow.children[1].textContent).to.equal('1');
        // Sammlungswert: c3 (15.00) = 15.00 (vorbestellt)
        expect(gnRow.children[2].textContent).to.contain('15.00');
        // Gelesen Quote: 0.00%
        expect(gnRow.children[3].textContent).to.contain('0.00%');
        // TBR count: c3 -> 1
        expect(gnRow.children[4].textContent).to.equal('1');
        // TBR value: c3 -> 15.00
        expect(gnRow.children[5].textContent).to.contain('15.00');

        // Jetzt filtern nach Verlag "Image"
        const imageCheckbox = container.querySelector('.stats-filter-checkbox[data-key="verlag"][value="Image"]');
        expect(imageCheckbox).to.not.be.null;

        imageCheckbox.checked = true;
        imageCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 50));

        // Nur c3 (Graphic Novel) und c4 (Comic) sind von Image.
        // Also immer noch 2 Typen-Zeilen
        const filteredRows = typeContainer.querySelectorAll('.stats-type-row');
        expect(filteredRows.length).to.equal(2);

        // Comic: c4 (Image, Comic, verkauft, gelesen, 8.00)
        const filteredComicRow = filteredRows[0];
        expect(filteredComicRow.children[1].textContent).to.equal('1'); // 1 Comic
        expect(filteredComicRow.children[2].textContent).to.contain('0.00'); // Wert 0 da verkauft
        expect(filteredComicRow.children[3].textContent).to.contain('100.00%'); // 1 von 1 gelesen
        expect(filteredComicRow.children[4].textContent).to.equal('0'); // TBR 0
        expect(filteredComicRow.children[5].textContent).to.contain('0.00'); // TBR wert 0

        // Graphic Novel: c3 (Image, Graphic Novel, vorbestellt, ungelesen, 15.00)
        const filteredGnRow = filteredRows[1];
        expect(filteredGnRow.children[1].textContent).to.equal('1');
        expect(filteredGnRow.children[2].textContent).to.contain('15.00');
        expect(filteredGnRow.children[3].textContent).to.contain('0.00%');
        expect(filteredGnRow.children[4].textContent).to.equal('1');
        expect(filteredGnRow.children[5].textContent).to.contain('15.00');
    });
});

describe('statsService Unit Tests', () => {
    describe('parseToDate', () => {
        it('sollte ISO-Format YYYY-MM-DD korrekt parsen', () => {
            const date = statsService.parseToDate('2026-05-29');
            expect(date).to.be.an.instanceOf(Date);
            expect(date.getFullYear()).to.equal(2026);
            expect(date.getMonth()).to.equal(4); // 0-indexed
            expect(date.getDate()).to.equal(29);
        });

        it('sollte deutsches Format DD.MM.YYYY korrekt parsen', () => {
            const date = statsService.parseToDate('15.01.2026');
            expect(date.getFullYear()).to.equal(2026);
            expect(date.getMonth()).to.equal(0);
            expect(date.getDate()).to.equal(15);
        });

        it('sollte deutsches Format mit 2-stelligem Jahr DD.MM.YY korrekt parsen', () => {
            const date1 = statsService.parseToDate('20.02.26');
            expect(date1.getFullYear()).to.equal(2026);
            expect(date1.getMonth()).to.equal(1);
            expect(date1.getDate()).to.equal(20);

            const date2 = statsService.parseToDate('10.11.99');
            expect(date2.getFullYear()).to.equal(1999);
            expect(date2.getMonth()).to.equal(10);
            expect(date2.getDate()).to.equal(10);
        });

        it('sollte DD.MM ohne Jahr als aktuelles Jahr parsen', () => {
            const date = statsService.parseToDate('05.03');
            expect(date.getFullYear()).to.equal(new Date().getFullYear());
            expect(date.getMonth()).to.equal(2);
            expect(date.getDate()).to.equal(5);
        });

        it('sollte null zurueckgeben bei leeren/ungueltigen Werten', () => {
            expect(statsService.parseToDate('')).to.be.null;
            expect(statsService.parseToDate(null)).to.be.null;
            expect(statsService.parseToDate('ungueltig')).to.be.null;
        });
    });

    describe('checkDateInRange', () => {
        it('sollte true fuer "all" zurueckgeben', () => {
            expect(statsService.checkDateInRange('2026-05-29', 'all')).to.be.true;
        });

        it('sollte Daten innerhalb des aktuellen Jahres fuer "thisYear" korrekt pruefen', () => {
            const currentYear = new Date().getFullYear();
            expect(statsService.checkDateInRange(`15.01.${currentYear}`, 'thisYear')).to.be.true;
            expect(statsService.checkDateInRange(`15.01.${currentYear - 1}`, 'thisYear')).to.be.false;
        });
    });

    describe('calculateKPIs', () => {
        it('sollte KPIs korrekt berechnen', () => {
            const mockData = [
                { preis: 10, bestand: 'vorhanden', gelesen_am: '15.01.2026' },
                { preis: 15, bestand: 'vorbestellt', gelesen_am: '' },
                { preis: 20, bestand: 'verkauft', gelesen_am: '20.02.2026' } // verkauft => nicht im Sammlungswert
            ];
            
            const kpis = statsService.calculateKPIs(mockData, 'all');
            expect(kpis.totalComics).to.equal(3);
            // Sammlungswert: vorhanden + vorbestellt = 10 + 15 = 25
            expect(kpis.totalValue).to.equal(25);
            // Gelesen: 2 gelesen in mockup (gelesen_am definiert)
            expect(kpis.readCount).to.equal(2);
            expect(kpis.readPercent).to.equal('66.67');
            // TBR (im Besitz und ungelesen): vorhanden/vorbestellt und ungelesen => nur das zweite Item (preis 15) => 1
            expect(kpis.tbrCount).to.equal(1);
            expect(kpis.tbrValue).to.equal(15);
        });
    });
});
