import { renderImport } from '../views/import.js';
import { setupTestEnv, cleanup, tick } from './testHelper.js';
import { db } from '../db.js';

const { expect } = chai;

describe('JSON Import Feature Tests', () => {
    let testEnv;
    let container;
    let savedComics = [];
    let savedWishlist = [];

    beforeEach(() => {
        savedComics = [];
        savedWishlist = [];

        // Mock DB Methods
        const existingComics = [
            {
                id: 'existing-1',
                titel: 'Batman: The Dark Knight Returns',
                serie: 'Batman',
                nummer: 1,
                verlag: 'DC',
                format: 'Hardcover',
                sprache: 'Deutsch',
                preis: 19.99
            },
            {
                id: 'existing-2',
                titel: 'Superman: Red Son',
                serie: 'Superman',
                nummer: 1,
                verlag: 'DC',
                format: 'Softcover',
                sprache: 'Deutsch',
                preis: 14.99
            }
        ];

        const existingWishes = [
            {
                id: 'wish-existing-1',
                titel: 'Saga Vol. 1',
                typ: 'Comic',
                format: 'Softcover',
                preis: 14.99,
                jahr: 2012,
                isbn: '978-1607066019'
            }
        ];

        testEnv = setupTestEnv({
            mockComics: existingComics,
            mockWishes: existingWishes
        });
        container = testEnv.viewContainer;

        // Add spies to collect saved objects
        const originalSaveComic = db.saveComic;
        db.saveComic = async (comic) => {
            savedComics.push(comic);
            return originalSaveComic(comic);
        };

        const originalSaveWish = db.saveWish;
        db.saveWish = async (wish) => {
            savedWishlist.push(wish);
            return originalSaveWish(wish);
        };

        renderImport(container);
    });

    afterEach(() => {
        cleanup();
        const overlay = document.getElementById('import-log-overlay');
        if (overlay) overlay.remove();
    });

    it('sollte ein JSON-Array von Comics importieren (Neu, Update und Skip)', async () => {
        const importData = [
            // Neu
            {
                titel: 'Spider-Man Blue',
                serie: 'Spider-Man',
                nummer: 1,
                verlag: 'Marvel',
                format: 'Softcover',
                sprache: 'Deutsch',
                preis: 16.99
            },
            // Update (gleiche ID, aber anderer Preis)
            {
                id: 'existing-1',
                titel: 'Batman: The Dark Knight Returns',
                serie: 'Batman',
                nummer: 1,
                verlag: 'DC',
                format: 'Hardcover',
                sprache: 'Deutsch',
                preis: 24.99 // Geändert von 19.99
            },
            // Skip (keine Änderungen)
            {
                id: 'existing-2',
                titel: 'Superman: Red Son',
                serie: 'Superman',
                nummer: 1,
                verlag: 'DC',
                format: 'Softcover',
                sprache: 'Deutsch',
                preis: 14.99
            }
        ];

        const fileInput = container.querySelector('#import-json-file');
        const btnImport = container.querySelector('#btn-import-json');

        const mockFile = new File([JSON.stringify(importData)], 'comics.json', { type: 'application/json' });
        
        Object.defineProperty(fileInput, 'files', {
            value: [mockFile],
            writable: true
        });

        const importPromise = new Promise(resolve => container.addEventListener('import-completed', resolve, { once: true }));
        // Trigger click which starts reader
        btnImport.click();

        // Wait for async reader and import processing loops
        await importPromise;

        const sumNew = document.getElementById('sum-new').textContent;
        const sumUpdated = document.getElementById('sum-updated').textContent;
        const sumSkipped = document.getElementById('sum-skipped').textContent;

        expect(sumNew).to.equal('1 neu');
        expect(sumUpdated).to.equal('1 updates');
        expect(sumSkipped).to.equal('1 übersprungen');

        // Check DB saves
        expect(savedComics.length).to.equal(2); // 1 new, 1 update
        expect(savedComics[0].titel).to.equal('Spider-Man Blue');
        expect(savedComics[1].id).to.equal('existing-1');
        expect(savedComics[1].preis).to.equal(24.99);

        // Check detailed diff logs
        const logUpdated = document.getElementById('log-updated');
        expect(logUpdated.innerHTML).to.contain('Preis');
        expect(logUpdated.innerHTML).to.contain('19.99 €');
        expect(logUpdated.innerHTML).to.contain('24.99 €');
    });

    it('sollte ein JSON-Backup-Objekt mit Comics und Wunschliste importieren', async () => {
        const importData = {
            comics: [
                {
                    titel: 'Watchmen',
                    serie: 'Watchmen',
                    nummer: 1,
                    verlag: 'DC',
                    format: 'Hardcover',
                    sprache: 'Deutsch'
                }
            ],
            wishlist: [
                // Neu
                {
                    titel: 'Sandman Vol. 1',
                    typ: 'Comic',
                    format: 'Paperback',
                    isbn: '978-1401225759'
                },
                // Update (gleiche ID, geänderter Preis)
                {
                    id: 'wish-existing-1',
                    titel: 'Saga Vol. 1',
                    typ: 'Comic',
                    format: 'Softcover',
                    preis: 17.99, // Geändert von 14.99
                    jahr: 2012,
                    isbn: '978-1607066019'
                }
            ]
        };

        const fileInput = container.querySelector('#import-json-file');
        const btnImport = container.querySelector('#btn-import-json');

        const mockFile = new File([JSON.stringify(importData)], 'backup.json', { type: 'application/json' });
        
        Object.defineProperty(fileInput, 'files', {
            value: [mockFile],
            writable: true
        });

        const importPromise = new Promise(resolve => container.addEventListener('import-completed', resolve, { once: true }));
        btnImport.click();

        await importPromise;

        const sumNew = document.getElementById('sum-new').textContent;
        const sumUpdated = document.getElementById('sum-updated').textContent;
        const sumSkipped = document.getElementById('sum-skipped').textContent;

        expect(sumNew).to.equal('3 neu'); // 1 comic, 2 wishes
        expect(sumUpdated).to.equal('0 updates');
        expect(sumSkipped).to.equal('0 übersprungen');

        expect(savedComics.length).to.equal(1);
        expect(savedComics[0].titel).to.equal('Watchmen');

        expect(savedWishlist.length).to.equal(2);
        expect(savedWishlist[0].titel).to.equal('Sandman Vol. 1');
        expect(savedWishlist[1].id).to.equal('wish-existing-1');
        expect(savedWishlist[1].preis).to.equal(17.99);
    });

    it('sollte veraltete Comics löschen, wenn ein JSON-Backup importiert wird', async () => {
        const importData = {
            comics: [
                {
                    id: 'existing-2',
                    titel: 'Superman: Red Son',
                    serie: 'Superman',
                    nummer: 1,
                    verlag: 'DC',
                    format: 'Softcover',
                    sprache: 'Deutsch',
                    preis: 14.99
                }
            ],
            wishlist: []
        };

        const fileInput = container.querySelector('#import-json-file');
        const btnImport = container.querySelector('#btn-import-json');

        const mockFile = new File([JSON.stringify(importData)], 'backup.json', { type: 'application/json' });
        
        Object.defineProperty(fileInput, 'files', {
            value: [mockFile],
            writable: true
        });

        const importPromise = new Promise(resolve => container.addEventListener('import-completed', resolve, { once: true }));
        btnImport.click();

        await importPromise;

        // existing-1 sollte gelöscht worden sein (clearDatabase wurde aufgerufen)
        expect(testEnv.getLastClearDatabaseCall()).to.be.true;
        expect(testEnv.getMockComics().length).to.equal(1);
        expect(testEnv.getMockComics()[0].id).to.equal('existing-2');
    });

    it('sollte Fehler anzeigen, wenn das JSON-Format ungültig ist', async () => {
        const fileInput = container.querySelector('#import-json-file');
        const btnImport = container.querySelector('#btn-import-json');
        const statusDiv = container.querySelector('#json-import-status');

        const mockFile = new File(['{ invalid_json: '], 'error.json', { type: 'application/json' });
        
        Object.defineProperty(fileInput, 'files', {
            value: [mockFile],
            writable: true
        });

        const importPromise = new Promise(resolve => container.addEventListener('import-completed', resolve, { once: true }));
        btnImport.click();

        await importPromise;

        expect(statusDiv.style.display).to.equal('block');
        expect(statusDiv.textContent).to.contain('Fehler');
    });
});

describe('Excel (XLSX) Export Feature Tests', () => {
    let testEnv;
    let container;

    beforeEach(() => {
        // Mock DB Methods
        const existingComics = [
            {
                id: 'existing-1',
                titel: 'Batman: The Dark Knight Returns',
                serie: 'Batman',
                nummer: 1,
                verlag: 'DC',
                format: 'Hardcover',
                sprache: 'Deutsch',
                preis: 19.99
            },
            {
                id: 'existing-2',
                titel: 'Superman: Red Son',
                serie: 'Superman',
                nummer: 1,
                verlag: 'DC',
                format: 'Softcover',
                sprache: 'Deutsch',
                preis: 14.99
            }
        ];

        testEnv = setupTestEnv({
            mockComics: existingComics
        });
        container = testEnv.viewContainer;
        renderImport(container);
    });

    afterEach(() => {
        cleanup();
        const overlay = document.getElementById('import-log-overlay');
        if (overlay) overlay.remove();
    });

    it('sollte die Comics-Sammlung erfolgreich als XLSX exportieren', async () => {
        let createdBlob = null;
        let downloadedFilename = null;
        
        const originalCreateObjectURL = URL.createObjectURL;
        const originalRevokeObjectURL = URL.revokeObjectURL;
        
        URL.createObjectURL = (blob) => {
            createdBlob = blob;
            return 'blob:mock-url';
        };
        URL.revokeObjectURL = () => {};

        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
            const el = originalCreateElement.call(document, tagName);
            if (tagName === 'a') {
                el.click = function() {
                    downloadedFilename = el.download;
                };
            }
            return el;
        };

        try {
            const btnExportXlsx = container.querySelector('#btn-export-xlsx');
            expect(btnExportXlsx).to.not.be.null;
            
            btnExportXlsx.click();
            
            // Warten auf asynchrone DB/Export-Operationen
            await tick();
            
            expect(createdBlob).to.not.be.null;
            expect(downloadedFilename).to.equal('ComicVault_Backup.xlsx');
            
            // Blob einlesen und mit XLSX (SheetJS) analysieren
            const reader = new FileReader();
            const readPromise = new Promise((resolve) => {
                reader.onload = (e) => {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    resolve(workbook);
                };
            });
            reader.readAsArrayBuffer(createdBlob);
            const workbook = await readPromise;
            
            expect(workbook.SheetNames).to.include('Sammlung');
            const worksheet = workbook.Sheets['Sammlung'];
            const rows = XLSX.utils.sheet_to_json(worksheet);
            
            expect(rows.length).to.equal(2);
            expect(rows[0].titel).to.equal('Batman: The Dark Knight Returns');
            expect(rows[0].verlag).to.equal('DC');
            expect(rows[0].preis).to.equal(19.99);
            expect(rows[1].titel).to.equal('Superman: Red Son');
            expect(rows[1].verlag).to.equal('DC');
            expect(rows[1].preis).to.equal(14.99);
        } finally {
            URL.createObjectURL = originalCreateObjectURL;
            URL.revokeObjectURL = originalRevokeObjectURL;
            document.createElement = originalCreateElement;
        }
    });
});

describe('Excel (XLSX) Import Feature Tests', () => {
    let testEnv;
    let container;
    let savedComics = [];
    let savedWishlist = [];

    beforeEach(() => {
        savedComics = [];
        savedWishlist = [];

        testEnv = setupTestEnv();
        container = testEnv.viewContainer;

        // Add spies
        const originalSaveComic = db.saveComic;
        db.saveComic = async (comic) => {
            savedComics.push(comic);
            return originalSaveComic(comic);
        };

        const originalSaveWish = db.saveWish;
        db.saveWish = async (wish) => {
            savedWishlist.push(wish);
            return originalSaveWish(wish);
        };

        renderImport(container);
    });

    afterEach(() => {
        cleanup();
        const overlay = document.getElementById('import-log-overlay');
        if (overlay) overlay.remove();
    });

    it('sollte eine XLSX-Exportdatei wieder über die CSV/Excel-Importfunktion einlesen können', async () => {
        // 1. Erstelle Beispieldaten
        const testComics = [
            {
                id: 'excel-import-1',
                titel: 'Watchmen',
                serie: 'Watchmen',
                nummer: 1,
                verlag: 'DC Comics',
                format: 'Hardcover',
                jahr: 1987,
                preis: 39.99,
                limitierung: true,
                limitiert_auf: 999,
                variant: true,
                variantname: 'Comic-Con Edition',
                kaufdatum: '12.10.2023',
                bestand: 'vorhanden',
                gelesen_am: '15.10.2023',
                bewertung: 10,
                bemerkung: 'Klassiker!'
            }
        ];

        // 2. Erzeuge Excel Workbook (Buffer) über die SheetJS API wie im Export-Code
        const fields = [
            'id', 'titel', 'typ', 'serie', 'nummer', 'verlag', 'format', 'jahr', 
            'zustand', 'bezugsquelle', 'preis', 'sprache', 'limitierung', 
            'limitiert_auf', 'variant', 'variantname', 'kaufdatum', 'bestand', 
            'gelesen_am', 'bewertung', 'bemerkung'
        ];
        const data = testComics.map(c => {
            const row = {};
            fields.forEach(f => {
                row[f] = c[f] ?? '';
            });
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(data, { header: fields });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sammlung");
        const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

        // 3. Simuliere Dateiupload in #import-csv-file
        const fileInput = container.querySelector('#import-csv-file');
        const btnImport = container.querySelector('#btn-import-csv');

        const mockFile = new File([xlsxBuffer], 'ComicVault_Backup.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        Object.defineProperty(fileInput, 'files', {
            value: [mockFile],
            writable: true
        });

        const importPromise = new Promise(resolve => container.addEventListener('import-completed', resolve, { once: true }));
        btnImport.click();

        // Warte auf asynchrone Verarbeitung
        await importPromise;

        const sumNew = document.getElementById('sum-new').textContent;
        expect(sumNew).to.equal('1 neu');

        expect(savedComics.length).to.equal(1);
        const imported = savedComics[0];
        expect(imported.id).to.equal('excel-import-1');
        expect(imported.titel).to.equal('Watchmen');
        expect(imported.serie).to.equal('Watchmen');
        expect(imported.nummer).to.equal(1);
        expect(imported.verlag).to.equal('DC Comics');
        expect(imported.format).to.equal('Hardcover');
        expect(imported.jahr).to.equal(1987);
        expect(imported.preis).to.equal(39.99);
        expect(imported.limitierung).to.be.true;
        expect(imported.limitiert_auf).to.equal(999);
        expect(imported.variant).to.be.true;
        expect(imported.variantname).to.equal('Comic-Con Edition');
        expect(imported.kaufdatum).to.equal('12.10.2023');
        expect(imported.bestand).to.equal('vorhanden');
        expect(imported.gelesen_am).to.equal('15.10.2023');
        expect(imported.bewertung).to.equal(10);
        expect(imported.bemerkung).to.equal('Klassiker!');
    });
});
