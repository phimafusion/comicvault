import {
    displayDate,
    toInputDate,
    toGermanDate,
    parseDate,
    parseCurrency,
    parseStars,
    renderStars,
    getPlaceholderImage
} from '../utils.js';

const { expect } = chai;

describe('ComicVault Utility Module Tests', () => {
    
    describe('displayDate()', () => {
        it('sollte leere Werte als "-" formatieren', () => {
            expect(displayDate(null)).to.equal('-');
            expect(displayDate(undefined)).to.equal('-');
            expect(displayDate('')).to.equal('-');
        });

        it('sollte ISO-Datum (YYYY-MM-DD) korrekt formatieren', () => {
            expect(displayDate('2023-05-19')).to.equal('19.05.2023');
        });

        it('sollte deutsches Datum unverändert zurückgeben', () => {
            expect(displayDate('19.05.2023')).to.equal('19.05.2023');
        });

        it('sollte Zeitstempel (ISO) korrekt formatieren', () => {
            expect(displayDate('2023-05-19T18:25:31.000Z')).to.equal('19.05.2023');
        });

        it('sollte das Jahr bei Bedarf kürzen (shorten=true)', () => {
            expect(displayDate('19.05.2023', true)).to.equal('19.05.23');
            expect(displayDate('2023-05-19', true)).to.equal('19.05.23');
        });
    });

    describe('toInputDate()', () => {
        it('sollte leere Werte als leeren String zurückgeben', () => {
            expect(toInputDate(null)).to.equal('');
            expect(toInputDate('')).to.equal('');
        });

        it('sollte deutsches Datum (DD.MM.YYYY) in Input-Format (YYYY-MM-DD) umwandeln', () => {
            expect(toInputDate('19.05.2023')).to.equal('2023-05-19');
            expect(toInputDate('09.02.2023')).to.equal('2023-02-09');
        });

        it('sollte abgekürztes deutsches Datum (DD.MM.YY) umwandeln (zweistelliges Jahr)', () => {
            expect(toInputDate('19.05.23')).to.equal('2023-05-19');
            expect(toInputDate('19.05.99')).to.equal('1999-05-19');
        });

        it('sollte ein bereits korrektes Input-Datum unverändert lassen', () => {
            expect(toInputDate('2023-05-19')).to.equal('2023-05-19');
        });
    });

    describe('toGermanDate()', () => {
        it('sollte leere Werte als leeren String zurückgeben', () => {
            expect(toGermanDate(null)).to.equal('');
            expect(toGermanDate('')).to.equal('');
        });

        it('sollte Input-Datum (YYYY-MM-DD) in deutsches Format (DD.MM.YYYY) umwandeln', () => {
            expect(toGermanDate('2023-05-19')).to.equal('19.05.2023');
        });

        it('sollte andere Strings unverändert zurückgeben', () => {
            expect(toGermanDate('unbekannt')).to.equal('unbekannt');
        });
    });

    describe('parseDate()', () => {
        it('sollte leere Werte, "x" und "nein" als leeren String interpretieren', () => {
            expect(parseDate(null)).to.equal('');
            expect(parseDate('')).to.equal('');
            expect(parseDate('x')).to.equal('');
            expect(parseDate('nein')).to.equal('');
        });

        it('sollte JavaScript-Date-Objekte parsen', () => {
            const date = new Date(2023, 4, 19); // 19. Mai 2023 (Monat ist 0-basiert!)
            expect(parseDate(date)).to.equal('19.05.2023');
        });

        it('sollte flexible Datumsformate erkennen und in DD.MM.YYYY umwandeln', () => {
            expect(parseDate('19.05.2023')).to.equal('19.05.2023');
            expect(parseDate('19.05.23')).to.equal('19.05.2023');
            expect(parseDate('19/05/23')).to.equal('19.05.2023');
            expect(parseDate('19-05-2023')).to.equal('19.05.2023');
            expect(parseDate('2023-05-19')).to.equal('19.05.2023');
        });
    });

    describe('parseCurrency()', () => {
        it('sollte leere Werte als null zurückgeben', () => {
            expect(parseCurrency(null)).to.equal(null);
            expect(parseCurrency('')).to.equal(null);
        });

        it('sollte Zahlen unverändert zurückgeben', () => {
            expect(parseCurrency(29.99)).to.equal(29.99);
        });

        it('sollte deutsche Formatierungen parsen (Komma statt Punkt)', () => {
            expect(parseCurrency('29,99')).to.equal(29.99);
            expect(parseCurrency('29,99 €')).to.equal(29.99);
            expect(parseCurrency('1.299,50 €')).to.equal(1299.50);
        });

        it('sollte englische Formatierungen parsen', () => {
            expect(parseCurrency('29.99')).to.equal(29.99);
            expect(parseCurrency('$2,999.99')).to.equal(2999.99);
        });
    });

    describe('parseStars()', () => {
        it('sollte leere Werte als 0 werten', () => {
            expect(parseStars(null)).to.equal(0);
            expect(parseStars('')).to.equal(0);
        });

        it('sollte Sterne-Symbole in Wert von 0 bis 10 übersetzen (5 Sterne = 10)', () => {
            expect(parseStars('⭐⭐⭐⭐⭐')).to.equal(10);
            expect(parseStars('★★★')).to.equal(6);
        });

        it('sollte Zahlen <= 5 als 1-5 Skala interpretieren und verdoppeln', () => {
            expect(parseStars(5)).to.equal(10);
            expect(parseStars(3.5)).to.equal(7);
            expect(parseStars('4')).to.equal(8);
        });

        it('sollte Zahlen > 5 direkt als 0-10 Skala interpretieren', () => {
            expect(parseStars(8)).to.equal(8);
            expect(parseStars('9')).to.equal(9);
        });
    });

    describe('renderStars()', () => {
        it('sollte leere Werte als "-" ausgeben', () => {
            expect(renderStars(null)).to.equal('-');
            expect(renderStars(0)).to.equal('-');
        });

        it('sollte volle Sterne korrekt in HTML rendern', () => {
            const html = renderStars(10); // 5 Sterne
            expect(html).to.contain('stars-display');
            expect(html.split('class="fa-solid fa-star"').length - 1).to.equal(5);
        });

        it('sollte halbe Sterne korrekt in HTML rendern', () => {
            const html = renderStars(9); // 4.5 Sterne
            expect(html.split('class="fa-solid fa-star"').length - 1).to.equal(4);
            expect(html).to.contain('fa-star-half-stroke');
        });
    });

    describe('getPlaceholderImage()', () => {
        it('sollte eine gültige Bild-URL zurückgeben', () => {
            expect(getPlaceholderImage()).to.be.a('string');
            expect(getPlaceholderImage()).to.contain('data:image/svg+xml');
        });

        it('sollte als Image-Src erfolgreich laden', (done) => {
            const img = new Image();
            img.onload = () => {
                expect(img.width).to.be.greaterThan(0);
                done();
            };
            img.onerror = () => {
                done(new Error("SVG placeholder failed to load in browser"));
            };
            img.src = getPlaceholderImage();
        });
    });
});
