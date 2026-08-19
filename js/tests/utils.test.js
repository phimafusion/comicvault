import {
    displayDate,
    toInputDate,
    toGermanDate,
    parseDate,
    parseToDate,
    formatGermanDate,
    checkDateInRange,
    parseCurrency,
    parseStars,
    renderStars,
    getPlaceholderImage,
    escapeHTML,
    formatNumber,
    formatCurrency,
    getChangedFields,
    getWishlistChangedFields,
    showToast
} from '../utils.js';

import * as dateUtils from '../utils/dateUtils.js';
import * as formatUtils from '../utils/formatUtils.js';
import * as domUtils from '../utils/domUtils.js';

const { expect } = chai;

describe('ComicVault Utility- & Hilfsmodul Tests', () => {

    describe('Modulare Sub-Module (dateUtils, formatUtils, domUtils)', () => {
        it('sollte alle Funktionen über die fokussierten Module exportieren', () => {
            expect(dateUtils.parseToDate).to.be.a('function');
            expect(dateUtils.displayDate).to.be.a('function');
            expect(formatUtils.escapeHTML).to.be.a('function');
            expect(formatUtils.formatCurrency).to.be.a('function');
            expect(domUtils.getChangedFields).to.be.a('function');
            expect(domUtils.showToast).to.be.a('function');
        });
    });
    
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

    describe('parseToDate() & formatGermanDate()', () => {
        it('sollte ISO-Strings und deutsche Datumsangaben zu Date-Objekten parsen', () => {
            const d1 = parseToDate('2026-05-29');
            expect(d1).to.be.instanceOf(Date);
            expect(d1.getFullYear()).to.equal(2026);
            expect(d1.getMonth()).to.equal(4); // Mai = 4
            expect(d1.getDate()).to.equal(29);

            const d2 = parseToDate('15.01.2026');
            expect(d2.getFullYear()).to.equal(2026);
            expect(d2.getMonth()).to.equal(0); // Jan = 0
            expect(d2.getDate()).to.equal(15);
        });

        it('sollte 2-stellige Jahreszahlen korrekt zu 19xx / 20xx auflösen', () => {
            const dPast = parseToDate('10.05.95');
            expect(dPast.getFullYear()).to.equal(1995);

            const dFuture = parseToDate('10.05.24');
            expect(dFuture.getFullYear()).to.equal(2024);
        });

        it('sollte ungültige oder leere Werte als null bzw. "-" behandeln', () => {
            expect(parseToDate(null)).to.be.null;
            expect(parseToDate('')).to.be.null;
            expect(parseToDate('x')).to.be.null;
            expect(formatGermanDate(null)).to.equal('-');
            expect(formatGermanDate('2026-05-29')).to.equal('29.05.2026');
        });
    });

    describe('checkDateInRange()', () => {
        it('sollte Zeitraum-Filter (all, thisYear, currentAndLastYear) korrekt bewerten', () => {
            expect(checkDateInRange('2026-05-29', 'all')).to.be.true;
            expect(checkDateInRange(null, 'all')).to.be.false;

            const thisYear = new Date().getFullYear();
            expect(checkDateInRange(`${thisYear}-06-15`, 'thisYear')).to.be.true;
            expect(checkDateInRange(`${thisYear - 3}-06-15`, 'thisYear')).to.be.false;
            expect(checkDateInRange(`${thisYear - 1}-06-15`, 'currentAndLastYear')).to.be.true;
            expect(checkDateInRange(`${thisYear - 5}-06-15`, 'currentAndLastYear')).to.be.false;
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

    describe('formatNumber() & formatCurrency()', () => {
        it('sollte Tausendertrennzeichen mit Punkt und Kommazahlen mit Komma formatieren (de-DE)', () => {
            expect(formatNumber(1234.56)).to.equal('1.234,56');
            expect(formatNumber(1000000.5)).to.equal('1.000.000,50');
            expect(formatCurrency(1234.56, '€')).to.equal('1.234,56 €');
            expect(formatCurrency(99.9, '$')).to.equal('99,90 $');
            expect(formatCurrency(0)).to.equal('0,00 €');
        });
    });

    describe('getChangedFields() & getWishlistChangedFields()', () => {
        it('sollte veränderte Comic-Felder präzise identifizieren', () => {
            const oldComic = { titel: 'Spider-Man #1', preis: 10, bestand: 'vorhanden' };
            const newComic = { titel: 'Spider-Man #1', preis: 15, bestand: 'verkauft' };
            const diffs = getChangedFields(oldComic, newComic);
            expect(diffs).to.deep.equal(['preis', 'bestand']);
        });

        it('sollte veränderte Wunschlisten-Felder erfassen', () => {
            const oldWish = { titel: 'Batman Year One', vorbestellt: false };
            const newWish = { titel: 'Batman Year One', vorbestellt: true, bemerkung: 'Im Comicladen' };
            const diffs = getWishlistChangedFields(oldWish, newWish);
            expect(diffs).to.include('vorbestellt');
            expect(diffs).to.include('bemerkung');
        });
    });

    describe('showToast()', () => {
        it('sollte Toast-Benachrichtigung im DOM anzeigen', () => {
            const toast = document.createElement('div');
            toast.id = 'toast';
            document.body.appendChild(toast);

            showToast('Erfolgreich gespeichert', 'success');
            expect(toast.classList.contains('show')).to.be.true;
            expect(toast.textContent).to.contain('Erfolgreich gespeichert');

            toast.remove();
        });
    });
});
