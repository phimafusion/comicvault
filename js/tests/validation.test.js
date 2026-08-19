import {
    validationService,
    normalizeISBN,
    isValidISBN10,
    isValidISBN13,
    isValidISBN,
    isValidPrice,
    sanitizePrice,
    isValidYear,
    isValidDate,
    isValidRating,
    validateComic,
    validateWishlist,
    validateSubscription
} from '../services/validationService.js';
import { setupTestEnv, cleanup } from './testHelper.js';

const { expect } = chai;

describe('Zentraler Validierungs-Service (validationService.js)', () => {
    beforeEach(() => {
        setupTestEnv();
    });

    afterEach(() => {
        cleanup();
    });

    describe('ISBN & EAN Normalisierung und Prüfziffern', () => {
        it('sollte ISBN-Zeichenketten von Bindestrichen und Leerzeichen bereinigen', () => {
            expect(normalizeISBN('978-3-16-148410-0')).to.equal('9783161484100');
            expect(normalizeISBN('3-598-21500-2')).to.equal('3598215002');
            expect(normalizeISBN(' 0-8044-2957-X ')).to.equal('080442957X');
            expect(normalizeISBN(null)).to.equal('');
        });

        it('sollte gültige ISBN-10 Nummern mit Modulo-11 Prüfziffer korrekt erkennen', () => {
            expect(isValidISBN10('3-598-21500-2')).to.be.true;
            expect(isValidISBN10('0-8044-2957-X')).to.be.true;
            expect(isValidISBN10('3598215002')).to.be.true;
            
            // Ungültige Prüfziffern
            expect(isValidISBN10('3-598-21500-3')).to.be.false;
            expect(isValidISBN10('1234567890')).to.be.false;
            expect(isValidISBN10('123')).to.be.false;
        });

        it('sollte gültige ISBN-13 und EAN-13 Nummern mit Modulo-10 Prüfziffer korrekt erkennen', () => {
            expect(isValidISBN13('978-3-16-148410-0')).to.be.true;
            expect(isValidISBN13('9783161484100')).to.be.true;
            expect(isValidISBN13('978-1-56619-909-4')).to.be.true;

            // Ungültige Prüfziffern
            expect(isValidISBN13('978-3-16-148410-1')).to.be.false;
            expect(isValidISBN13('9781234567890')).to.be.false;
            expect(isValidISBN13('12345')).to.be.false;
        });

        it('sollte mit isValidISBN sowohl ISBN-10 als auch ISBN-13 erkennen', () => {
            expect(isValidISBN('3-598-21500-2')).to.be.true;
            expect(isValidISBN('978-3-16-148410-0')).to.be.true;
            expect(isValidISBN('invalid-isbn')).to.be.false;
            expect(isValidISBN('')).to.be.false;
        });
    });

    describe('Preise & Währungs-Validierung', () => {
        it('sollte gültige Preise (Zahlen und Strings mit Komma/Punkt) erkennen', () => {
            expect(isValidPrice(0)).to.be.true;
            expect(isValidPrice(19.99)).to.be.true;
            expect(isValidPrice('19.99')).to.be.true;
            expect(isValidPrice('19,99 €')).to.be.true;
            expect(isValidPrice('100 EUR')).to.be.true;
            expect(isValidPrice('')).to.be.true; // Optionales Feld ist valide
            expect(isValidPrice(null)).to.be.true;

            // Ungültige Preise
            expect(isValidPrice(-5)).to.be.false;
            expect(isValidPrice('-10.00')).to.be.false;
            expect(isValidPrice('abc')).to.be.false;
            expect(isValidPrice('12,,50')).to.be.false;
        });

        it('sollte Preise mit sanitizePrice sicher in Float mit 2 Nachkommastellen umwandeln', () => {
            expect(sanitizePrice('19,99 €')).to.equal(19.99);
            expect(sanitizePrice('4.5')).to.equal(4.5);
            expect(sanitizePrice(29.999)).to.equal(30.00);
            expect(sanitizePrice('')).to.be.null;
            expect(sanitizePrice(-10)).to.equal(0);
        });
    });

    describe('Jahreszahlen & Kalenderdaten', () => {
        it('sollte historische und zukünftige Jahreszahlen plausibel prüfen', () => {
            const currentYear = new Date().getFullYear();
            expect(isValidYear(1963)).to.be.true; // Amazing Spider-Man #1
            expect(isValidYear(currentYear)).to.be.true;
            expect(isValidYear(currentYear + 1)).to.be.true; // Vorbestellungen
            expect(isValidYear('')).to.be.true;

            // Unplausibel
            expect(isValidYear(1500)).to.be.false;
            expect(isValidYear(currentYear + 10)).to.be.false;
            expect(isValidYear('abc')).to.be.false;
        });

        it('sollte echte Kalenderdaten validieren und unmögliche Tage abweisen', () => {
            expect(isValidDate('2023-05-19')).to.be.true;
            expect(isValidDate('19.05.2023')).to.be.true;
            expect(isValidDate('')).to.be.true;

            // Ungültige Kalenderdaten
            expect(isValidDate('2023-02-30')).to.be.false; // 30. Februar existiert nicht
            expect(isValidDate('32.01.2023')).to.be.false; // 32. Tag existiert nicht
            expect(isValidDate('2023-13-01')).to.be.false; // Monat 13 existiert nicht
            expect(isValidDate('ungueltig')).to.be.false;
        });
    });

    describe('Vollständige Comic- & Wunschlisten-Validierung', () => {
        it('sollte einen vollständigen und korrekten Comic als valide einstufen', () => {
            const validComic = {
                titel: 'Spider-Man #1',
                serie: 'The Amazing Spider-Man',
                nummer: 1,
                verlag: 'Marvel',
                preis: 4.99,
                jahr: 2023,
                kaufdatum: '2023-05-19',
                bewertung: 9
            };

            const result = validateComic(validComic);
            expect(result.isValid).to.be.true;
            expect(Object.keys(result.errors)).to.have.lengthOf(0);
        });

        it('sollte Fehler melden, wenn weder Titel noch Serie vorhanden sind', () => {
            const invalidComic = {
                nummer: 1,
                verlag: 'Marvel'
            };

            const result = validateComic(invalidComic);
            expect(result.isValid).to.be.false;
            expect(result.errors.titel).to.exist;
        });

        it('sollte Fehler melden bei ungültigem Preis oder Datum', () => {
            const comicWithErrors = {
                titel: 'Batman',
                preis: -10,
                kaufdatum: '2023-02-31',
                jahr: 9999
            };

            const result = validateComic(comicWithErrors);
            expect(result.isValid).to.be.false;
            expect(result.errors.preis).to.exist;
            expect(result.errors.kaufdatum).to.exist;
            expect(result.errors.jahr).to.exist;
        });

        it('sollte Wunschlisten-Einträge validieren', () => {
            const validWish = { titel: 'Saga Vol 1', preis: 14.99, jahr: 2012 };
            expect(validateWishlist(validWish).isValid).to.be.true;

            const emptyWish = { titel: '' };
            expect(validateWishlist(emptyWish).isValid).to.be.false;
        });

        it('sollte Abonnements validieren', () => {
            expect(validateSubscription({ titel: 'Batman' }).isValid).to.be.true;
            expect(validateSubscription({ titel: '' }).isValid).to.be.false;
        });
    });
});
