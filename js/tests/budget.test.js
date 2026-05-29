import { calculateBudgetStats, calculateMultiYearStats } from '../views/budget.js';

const { expect } = chai;

describe('ComicVault Budget & Kostenanalyse Berechnungs-Tests', () => {
    let mockComics = [];
    let mockBudgets = {};
    const defaultTypes = ['Comic', 'Manga', 'Graphic Novel', 'Artbook'];

    beforeEach(() => {
        // Mock-Comics für das Jahr 2026 und 2025 erstellen
        mockComics = [
            // 2026
            { id: 'c1', titel: 'Batman', typ: 'Comic', preis: '15,00', kaufdatum: '2026-01-10' },
            { id: 'c2', titel: 'Naruto', typ: 'Manga', preis: 10.00, kaufdatum: '15.01.2026' },
            { id: 'c3', titel: 'Saga', typ: 'Graphic Novel', preis: '25.00', kaufdatum: '2026-02-05' },
            { id: 'c4', titel: 'Artbook', typ: 'Artbook', preis: 40.00, kaufdatum: '2026-02-28' },
            { id: 'c5', titel: 'Unbekanntes Medium', typ: 'Sonstiges Medium', preis: 12.50, kaufdatum: '2026-02-15' },
            { id: 'c6', titel: 'Weihnachts-Special', typ: 'Comic', preis: 50.00, kaufdatum: '24.12.2026' },
            
            // 2025
            { id: 'c7', titel: 'Spawn 2025', typ: 'Comic', preis: 8.00, kaufdatum: '10.11.2025' },
            { id: 'c8', titel: 'One Piece 2025', typ: 'Manga', preis: 6.50, kaufdatum: '15.11.2025' }
        ];

        // Budgets mocken (2026: Jan 200, Feb 150. 2025: Alle standardmäßig 200 €)
        mockBudgets = {
            2026: {
                "01": 200.00,
                "02": 150.00
            },
            2025: {
                "11": 180.00
            }
        };
    });

    describe('Monats-Statistiken (calculateBudgetStats)', () => {
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

        it('sollte Comics ohne kaufdatum NICHT in die Ausgaben einrechnen (Regressionstest Bug #created_at-fallback)', () => {
            // Comics ohne Kaufdatum aber mit created_at – diese dürfen NICHT im Budget erscheinen!
            const comicsWithCreatedAt = [
                { id: 'ca1', titel: 'Ohne Kaufdatum 1', typ: 'Comic', preis: '99,00', created_at: '2026-05-01T10:00:00Z' },
                { id: 'ca2', titel: 'Ohne Kaufdatum 2', typ: 'Manga', preis: 50.00, created_at: '2026-05-15T12:00:00Z' },
                // Ein Comic MIT Kaufdatum zur Kontrollprüfung
                { id: 'ca3', titel: 'Mit Kaufdatum', typ: 'Comic', preis: '10,00', kaufdatum: '2026-05-10' }
            ];
            const stats = calculateBudgetStats(comicsWithCreatedAt, {}, defaultTypes, 2026);
            
            // Mai (Index 4): Nur das Comic MIT kaufdatum soll zählen (10 €), nicht die anderen (149 €)!
            expect(stats[4].totalExpenses).to.equal(10.00);
            expect(stats[4].expensesByType['Comic']).to.equal(10.00);
            expect(stats[4].expensesByType['Manga']).to.equal(0.00);
        });
    });

    describe('Historische Jahres-Statistiken (calculateMultiYearStats)', () => {
        it('sollte Summen über mehrere Jahre korrekt berechnen', () => {
            const sortedYears = [2026, 2025];
            const multiYearStats = calculateMultiYearStats(mockComics, mockBudgets, defaultTypes, sortedYears);
            
            expect(multiYearStats.length).to.equal(2);
            
            // 2026 prüfen
            const yr2026 = multiYearStats[0];
            expect(yr2026.year).to.equal(2026);
            expect(yr2026.totalExpenses).to.equal(152.50); // 25 + 77.50 + 50
            expect(yr2026.totalBudget).to.equal(2350.00); // 200 + 150 + 10 * 200
            expect(yr2026.delta).to.equal(2197.50); // 2350.00 - 152.50
            expect(yr2026.expensesByType['Comic']).to.equal(65.00); // 15 + 50
            
            // 2025 prüfen
            const yr2025 = multiYearStats[1];
            expect(yr2025.year).to.equal(2025);
            expect(yr2025.totalExpenses).to.equal(14.50); // 8 + 6.50
            expect(yr2025.totalBudget).to.equal(2380.00); // 11 * 200 + 180
            expect(yr2025.delta).to.equal(2365.50); // 2380.00 - 14.50
            expect(yr2025.expensesByType['Comic']).to.equal(8.00);
            expect(yr2025.expensesByType['Manga']).to.equal(6.50);
        });
    });
});
