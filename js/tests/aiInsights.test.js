import { 
    compileCollectionStatsPromptData, 
    parseMarkdown, 
    parseInlineMarkdown, 
    generateLocalMockInsights 
} from '../views/aiInsights.js';

const { expect } = chai;

describe('ComicVault KI Insights Tests', () => {
    let mockComics = [];
    let mockWishes = [];

    beforeEach(() => {
        mockComics = [
            { id: '1', titel: 'Batman 1', verlag: 'Panini', format: 'Softcover', preis: '12,99', gelesen_am: '2023-01-01', bewertung: 9 },
            { id: '2', titel: 'Batman 2', verlag: 'Panini', format: 'Softcover', preis: '12.99', gelesen_am: '', bewertung: 8 },
            { id: '3', titel: 'Spider-Man 1', verlag: 'Marvel', format: 'Hardcover', preis: '25,00', gelesen_am: '2023-02-01', bewertung: 10 },
            { id: '4', titel: 'Spider-Man 2', verlag: 'Marvel', format: 'Hardcover', preis: 25.00, gelesen_am: '', bewertung: 5 },
            { id: '5', titel: 'One Piece 1', verlag: 'Carlsen', format: 'Taschenbuch', preis: '7,00', gelesen_am: '2023-03-01', bewertung: 0 }
        ];

        mockWishes = [
            { id: 'w1', titel: 'Batman 3', preis: '14,99' },
            { id: 'w2', titel: 'Spider-Man 3', preis: '29.99' }
        ];
    });

    describe('Daten-Aggregation (compileCollectionStatsPromptData)', () => {
        it('sollte Gesamtanzahl, Gelesen und Ungelesen korrekt zählen', () => {
            const stats = compileCollectionStatsPromptData(mockComics, mockWishes);
            expect(stats.totalComics).to.equal(5);
            expect(stats.readCount).to.equal(3); // 1, 3, 5
            expect(stats.unreadCount).to.equal(2); // 2, 4
        });

        it('sollte den Gesamtwert korrekt berechnen', () => {
            const stats = compileCollectionStatsPromptData(mockComics, mockWishes);
            // 12.99 + 12.99 + 25.00 + 25.00 + 7.00 = 82.98
            expect(stats.totalValue).to.be.closeTo(82.98, 0.01);
        });

        it('sollte Verlage nach Häufigkeit sortieren', () => {
            const stats = compileCollectionStatsPromptData(mockComics, mockWishes);
            expect(stats.publishers.length).to.equal(3);
            expect(stats.publishers[0].name).to.equal('Panini'); // oder 'Marvel' (beide 2)
            expect(stats.publishers[0].count).to.equal(2);
            expect(stats.publishers[2].name).to.equal('Carlsen');
            expect(stats.publishers[2].count).to.equal(1);
        });

        it('sollte Top-Bewertungen filtern (ab 8 Sterne)', () => {
            const stats = compileCollectionStatsPromptData(mockComics, mockWishes);
            expect(stats.topRated.length).to.equal(3); // Batman 1 (9), Batman 2 (8), Spider-Man 1 (10)
            expect(stats.topRated[0].titel).to.equal('Spider-Man 1'); // Am besten bewertet zuerst
        });

        it('sollte die Wunschliste korrekt zusammenfassen', () => {
            const stats = compileCollectionStatsPromptData(mockComics, mockWishes);
            expect(stats.wishlistCount).to.equal(2);
            expect(stats.wishlistItems[0].titel).to.equal('Batman 3');
        });
    });

    describe('Markdown Parser (parseMarkdown & parseInlineMarkdown)', () => {
        it('sollte Überschriften in entsprechende HTML-Tags umwandeln', () => {
            const h1 = parseMarkdown('# Hauptüberschrift');
            expect(h1).to.contain('<h2');
            expect(h1).to.contain('Hauptüberschrift</h2>');

            const h2 = parseMarkdown('## Unterüberschrift');
            expect(h2).to.contain('<h3');
            expect(h2).to.contain('Unterüberschrift</h3>');
        });

        it('sollte fettgedruckten Text umwandeln', () => {
            const parsed = parseInlineMarkdown('Das ist **wichtig**.');
            expect(parsed).to.contain('<strong');
            expect(parsed).to.contain('wichtig</strong>');
        });

        it('sollte kursiven Text und Inline-Code umwandeln', () => {
            const parsed = parseInlineMarkdown('Lies *Saga* oder `Batman`.');
            expect(parsed).to.contain('<em>Saga</em>');
            expect(parsed).to.contain('<code');
            expect(parsed).to.contain('Batman</code>');
        });

        it('sollte Listenpunkte in HTML-Listen umwandeln', () => {
            const markdown = '- Punkt 1\n- Punkt 2';
            const parsed = parseMarkdown(markdown);
            expect(parsed).to.contain('<ul');
            expect(parsed).to.contain('<li');
            expect(parsed).to.contain('Punkt 1</li>');
            expect(parsed).to.contain('</ul>');
        });

        it('sollte Tabellen korrekt in HTML-Tabellen umwandeln', () => {
            const markdown = '| Spalte A | Spalte B |\n|---|---|\n| Wert 1 | Wert 2 |';
            const parsed = parseMarkdown(markdown);
            expect(parsed).to.contain('<table');
            expect(parsed).to.contain('Spalte A</td>');
            expect(parsed).to.contain('Wert 1</td>');
        });
    });

    describe('Lokale Mock-Insights (generateLocalMockInsights)', () => {
        it('sollte ein valides Review generieren', () => {
            const stats = compileCollectionStatsPromptData(mockComics, mockWishes);
            const review = generateLocalMockInsights(stats);
            
            expect(review).to.be.a('string');
            expect(review).to.contain('ComicVault');
            expect(review).to.contain('5 Comics');
            expect(review).to.contain('82.98 €');
        });
    });
});
