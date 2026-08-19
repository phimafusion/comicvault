import {
    exportService,
    sanitizeFormulaValue,
    buildJSONBackup,
    generateCSV,
    generateXLSX,
    triggerDownload,
    executeExport
} from '../services/exportService.js';
import { setupTestEnv, cleanup, tick } from './testHelper.js';
import { db } from '../db.js';

const { expect } = chai;

describe('Zentraler Export-Service (exportService.js)', () => {
    let mockComics = [];
    let mockWishes = [];

    beforeEach(() => {
        mockComics = [
            {
                id: 'c1',
                titel: 'Spider-Man #1',
                serie: 'Spider-Man',
                nummer: 1,
                verlag: 'Marvel',
                format: 'Heft',
                typ: 'Comic',
                jahr: 2023,
                preis: 4.99,
                kaufdatum: '2023-05-19',
                bestand: 'vorhanden',
                gelesen: true,
                gelesen_am: '2023-05-20',
                bewertung: 10,
                limitierung: true,
                variant: false
            },
            {
                id: 'c2',
                titel: 'Batman: The Long Halloween',
                serie: 'Batman',
                nummer: 1,
                verlag: 'DC',
                format: 'Hardcover',
                typ: 'Comic',
                jahr: 2021,
                preis: 29.99,
                kaufdatum: '2023-06-01',
                bestand: 'vorhanden',
                gelesen: false,
                bewertung: 0,
                limitierung: false,
                variant: true
            }
        ];

        mockWishes = [
            {
                id: 'w1',
                titel: 'Saga Vol 1',
                typ: 'Graphic Novel',
                format: 'Softcover',
                preis: 14.99,
                jahr: 2012,
                vorbestellt: false,
                isbn: '978-1607066019'
            },
            {
                id: 'w2',
                titel: 'Spawn Deluxe 1',
                typ: 'Comic',
                format: 'Hardcover',
                preis: 49.99,
                jahr: 2024,
                vorbestellt: true,
                isbn: '978-1534320000'
            }
        ];
    });

    describe('Schutz vor Formel-Injection (sanitizeFormulaValue)', () => {
        it('sollte gefaehrliche Zeichen (=, +, -, @, Tab, CR) mit einem Hochkomma maskieren', () => {
            expect(sanitizeFormulaValue('=SUM(A1:A10)')).to.equal("'=SUM(A1:A10)");
            expect(sanitizeFormulaValue('+12345')).to.equal("'+12345");
            expect(sanitizeFormulaValue('-50.00')).to.equal("'-50.00");
            expect(sanitizeFormulaValue('@HYPERLINK("http://evil.com")')).to.equal("'@HYPERLINK(\"http://evil.com\")");
            expect(sanitizeFormulaValue('\tCMD')).to.equal("'\tCMD");
            expect(sanitizeFormulaValue('\rcalc.exe')).to.equal("'\rcalc.exe");
        });

        it('sollte normale Werte unberührt lassen', () => {
            expect(sanitizeFormulaValue('Spider-Man #1')).to.equal('Spider-Man #1');
            expect(sanitizeFormulaValue(29.99)).to.equal(29.99);
            expect(sanitizeFormulaValue(null)).to.be.null;
            expect(sanitizeFormulaValue(undefined)).to.be.undefined;
        });
    });

    describe('Strukturiertes JSON-Backup (buildJSONBackup)', () => {
        it('sollte ein vollständiges Backup-Objekt mit Metadaten, Comics, Wunschliste und Settings erstellen', () => {
            const settings = { theme: 'cyberpunk', testsuiteMode: 'console' };
            const subscriptions = [{ id: 's1', titel: 'Batman', verlag: 'Panini' }];
            const budgets = { '2026': { total: 500 } };

            const backup = buildJSONBackup({
                comics: mockComics,
                wishlist: mockWishes,
                subscriptions,
                settings,
                budgets
            });

            expect(backup.version).to.equal('2.4');
            expect(backup.app).to.equal('ComicVault');
            expect(backup.exportDate).to.be.a('string');
            expect(backup.summary.comicsCount).to.equal(2);
            expect(backup.summary.wishlistCount).to.equal(2);
            expect(backup.summary.subscriptionsCount).to.equal(1);
            expect(backup.comics).to.deep.equal(mockComics);
            expect(backup.wishlist).to.deep.equal(mockWishes);
            expect(backup.subscriptions).to.deep.equal(subscriptions);
            expect(backup.settings).to.deep.equal(settings);
            expect(backup.budgets).to.deep.equal(budgets);
        });

        it('sollte mit Standardwerten (leere Arrays) problemlos umgehen', () => {
            const backup = buildJSONBackup();
            expect(backup.comics).to.deep.equal([]);
            expect(backup.wishlist).to.deep.equal([]);
            expect(backup.subscriptions).to.deep.equal([]);
            expect(backup.settings).to.deep.equal({});
            expect(backup.budgets).to.deep.equal({});
        });
    });

    describe('CSV-Generierung (generateCSV)', () => {
        it('sollte Comics im Semikolon-getrennten CSV-Format mit Header exportieren', () => {
            const csv = generateCSV(mockComics, false);
            const lines = csv.split('\n');

            expect(lines[0]).to.include('id;titel;typ;serie;nummer;verlag;format;jahr');
            expect(lines.length).to.equal(3); // Header + 2 Zeilen
            expect(lines[1]).to.include('Spider-Man #1');
            expect(lines[1]).to.include('Ja'); // limitierung: true -> 'Ja'
            expect(lines[2]).to.include('Batman: The Long Halloween');
        });

        it('sollte Wunschlisten-Einträge im CSV-Format mit vorbestellt-Übersetzung exportieren', () => {
            const csv = generateCSV(mockWishes, true);
            const lines = csv.split('\n');

            expect(lines[0]).to.equal('id;titel;typ;format;preis;jahr;vorbestellt;isbn;besonderheit;bemerkung');
            expect(lines[1]).to.include('Saga Vol 1;Graphic Novel;Softcover;14.99;2012;Nein;978-1607066019');
            expect(lines[2]).to.include('Spawn Deluxe 1;Comic;Hardcover;49.99;2024;Ja;978-1534320000');
        });

        it('sollte Formeln in Feldern beim CSV-Export automatisch sanitisieren', () => {
            const evilComic = [{ titel: '=1+1', serie: '+EVIL', preis: 10 }];
            const csv = generateCSV(evilComic, false);
            expect(csv).to.include("'=1+1");
            expect(csv).to.include("'+EVIL");
        });
    });

    describe('Excel-Generierung (generateXLSX)', () => {
        it('sollte ein XLSX-Workbook mit Sheet "Sammlung" und "Wunschliste" generieren', () => {
            const buffer = generateXLSX(mockComics, mockWishes);
            expect(buffer).to.exist;

            const wb = XLSX.read(buffer, { type: 'array' });
            expect(wb.SheetNames).to.include('Sammlung');
            expect(wb.SheetNames).to.include('Wunschliste');

            const comicsData = XLSX.utils.sheet_to_json(wb.Sheets['Sammlung']);
            expect(comicsData).to.have.lengthOf(2);
            expect(comicsData[0].titel).to.equal('Spider-Man #1');
            expect(comicsData[0].limitierung).to.equal('Ja');

            const wishesData = XLSX.utils.sheet_to_json(wb.Sheets['Wunschliste']);
            expect(wishesData).to.have.lengthOf(2);
            expect(wishesData[0].titel).to.equal('Saga Vol 1');
            expect(wishesData[1].vorbestellt).to.equal('Ja');
        });

        it('sollte bei leeren Daten ein valides "Leer"-Sheet erzeugen', () => {
            const buffer = generateXLSX([], []);
            const wb = XLSX.read(buffer, { type: 'array' });
            expect(wb.SheetNames).to.include('Leer');
        });
    });

    describe('Export-Ausführung (executeExport & triggerDownload)', () => {
        let testEnv;
        let downloadedFiles = [];
        let originalCreateElement;

        beforeEach(() => {
            downloadedFiles = [];
            testEnv = setupTestEnv({
                mockComics: mockComics,
                mockWishes: mockWishes
            });

            // Mock Download
            originalCreateElement = document.createElement;
            document.createElement = function(tagName) {
                const el = originalCreateElement.call(document, tagName);
                if (tagName.toLowerCase() === 'a') {
                    el.click = function() {
                        downloadedFiles.push({
                            href: el.href,
                            download: el.download
                        });
                    };
                }
                return el;
            };
        });

        afterEach(() => {
            document.createElement = originalCreateElement;
            cleanup();
        });

        it('sollte einen JSON-Backup-Export ausführen und den Download starten', async () => {
            const result = await executeExport('json');
            expect(result.success).to.be.true;
            expect(result.filename).to.match(/^ComicVault_Backup_\d{4}-\d{2}-\d{2}\.json$/);
            expect(downloadedFiles).to.have.lengthOf(1);
            expect(downloadedFiles[0].download).to.equal(result.filename);
            expect(decodeURIComponent(downloadedFiles[0].href)).to.include('"version": "2.4"');
            expect(decodeURIComponent(downloadedFiles[0].href)).to.include('Spider-Man #1');
        });

        it('sollte einen CSV-Export der Comics ausführen', async () => {
            const result = await executeExport('csv');
            expect(result.success).to.be.true;
            expect(result.filename).to.match(/^ComicVault_Sammlung_\d{4}-\d{2}-\d{2}\.csv$/);
            expect(downloadedFiles).to.have.lengthOf(1);
            expect(decodeURIComponent(downloadedFiles[0].href)).to.include('Spider-Man #1');
        });

        it('sollte einen XLSX-Export mit Sammlung und Wunschliste ausführen', async () => {
            const result = await executeExport('xlsx');
            expect(result.success).to.be.true;
            expect(result.filename).to.match(/^ComicVault_Sammlung_\d{4}-\d{2}-\d{2}\.xlsx$/);
            expect(downloadedFiles).to.have.lengthOf(1);
            expect(downloadedFiles[0].href).to.include('blob:');
        });

        it('sollte einen Fehler werfen, wenn keine Daten zum Exportieren vorhanden sind', async () => {
            testEnv.setMockComics([]);
            testEnv.setMockWishes([]);

            try {
                await executeExport('json');
                expect.fail('Hätte werfen müssen');
            } catch (err) {
                expect(err.message).to.contain('leer');
            }
        });
    });
});
