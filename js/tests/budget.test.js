import { calculateBudgetStats } from '../views/budget.js';

const { expect } = chai;

describe('ComicVault Budget & Kostenanalyse Berechnungs-Tests', () => {
    let mockComics = [];
    let mockBudgets = {};
    const defaultTypes = ['Comic', 'Manga', 'Graphic Novel', 'Artbook'];

    beforeEach(() => {
        // Mock-Comics für das Jahr 2026 erstellen
        // Jan: 1 Comic (15.00 €), 1 Manga (10.00 €) = 25.00 €
        // Feb: 1 Graphic Novel (25.00 €), 1 Artbook (40.00 €), 1 Sonstiges (12.50 €) = 77.50 €
        // Mär: Keine Käufe = 0.00 €
        // Dez: 1 Comic (50.00 €) mit deutschem Datumsformat = 50.00 €
        // Plus ein Comic aus 2025 (sollte ignoriert werden)
        mockComics = [
            { id: 'c1', titel: 'Batman', typ: 'Comic', preis: '15,00', kaufdatum: '2026-01-10' },
            { id: 'c2', titel: 'Naruto', typ: 'Manga', preis: 10.00, kaufdatum: '15.01.2026' },
            { id: 'c3', titel: 'Saga', typ: 'Graphic Novel', preis: '25.00', kaufdatum: '2026-02-05' },
            { id: 'c4', titel: 'Artbook', typ: 'Artbook', preis: 40.00, kaufdatum: '2026-02-28' },
            { id: 'c5', titel: 'Unbekanntes Medium', typ: 'Sonstiges Medium', preis: 12.50, kaufdatum: '2026-02-15' },
            { id: 'c6', titel: 'Weihnachts-Special', typ: 'Comic', preis: 50.00, kaufdatum: '24.12.2026' },
            { id: 'c7', titel: 'Spawn 2025', typ: 'Comic', preis: 8.00, kaufdatum: '10.11.2025' } // Anderes Jahr
        ];

        // Budgets für 2026 mocken (Jan: 200 €, Feb: 150 €, Rest standardmäßig 200 €)
        mockBudgets = {
            2026: {
                "01": 200.00,
                "02": 150.00
            }
        };
    });

    it('sollte 12 Monate initialisieren', () => {
        const stats = calculateBudgetStats(mockComics, mockBudgets, defaultTypes, 2026);
        expect(stats).to.be.an('array');
        expect(stats.length).to.equal(12);
        
        expect(stats[0].monthLabel).to.equal('2026.01');
        expect(stats[11].monthLabel).to.equal('2026.12');
    });

    it('sollte Ausgaben korrekt nach Typ aggregieren', () => {
        const stats = calculateBudgetStats(mockComics, mockBudgets, defaultTypes, 2026);
        
        // Januar Ausgaben prüfen
        const jan = stats[0];
        expect(jan.totalExpenses).to.equal(25.00);
        expect(jan.expensesByType['Comic']).to.equal(15.00);
        expect(jan.expensesByType['Manga']).to.equal(10.00);
        expect(jan.expensesByType['Graphic Novel']).to.equal(0);
        
        // Februar Ausgaben prüfen (inkl. 'Sonstige')
        const feb = stats[1];
        expect(feb.totalExpenses).to.equal(77.50);
        expect(feb.expensesByType['Graphic Novel']).to.equal(25.00);
        expect(feb.expensesByType['Artbook']).to.equal(40.00);
        expect(feb.expensesByType['Sonstige']).to.equal(12.50); // Unbekanntes Medium fließt in Sonstige
    });

    it('sollte Comics aus anderen Jahren ignorieren', () => {
        const stats = calculateBudgetStats(mockComics, mockBudgets, defaultTypes, 2026);
        
        // November Ausgaben prüfen (Spawn 2025 aus 2025 sollte ignoriert werden)
        const nov = stats[10];
        expect(nov.totalExpenses).to.equal(0);
    });

    it('sollte das monatliche Budget aus den Einstellungen laden und Standardwert 200 € anwenden', () => {
        const stats = calculateBudgetStats(mockComics, mockBudgets, defaultTypes, 2026);
        
        expect(stats[0].budget).to.equal(200.00); // Gemockt
        expect(stats[1].budget).to.equal(150.00); // Gemockt
        expect(stats[2].budget).to.equal(200.00); // Standardwert, da nicht gemockt
    });

    it('sollte das kumulierte Delta über das Kalenderjahr hinweg korrekt berechnen', () => {
        const stats = calculateBudgetStats(mockComics, mockBudgets, defaultTypes, 2026);
        
        // Jan: Budget 200, Ausgaben 25 -> Delta = +175
        expect(stats[0].delta).to.equal(175.00);
        
        // Feb: Budget 150, Ausgaben 77.50 -> Monatsdelta = +72.50 -> Kumuliert = 175 + 72.50 = 247.50
        expect(stats[1].delta).to.equal(247.50);
        
        // Mär: Budget 200, Ausgaben 0 -> Monatsdelta = +200 -> Kumuliert = 247.50 + 200 = 447.50
        expect(stats[2].delta).to.equal(447.50);
        
        // Dez: Budget 200, Ausgaben 50 -> Monatsdelta = +150 -> Kumuliert (nach vorangegangenen Monaten)
        // Nov-Delta = 447.50 + 8 * 200 = 2047.50
        // Dez-Delta = 2047.50 + 150 = 2197.50
        expect(stats[11].delta).to.equal(2197.50);
    });
});
