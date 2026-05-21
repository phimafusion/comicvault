import { renderImport } from '../views/import.js';
import { db } from '../db.js';

const { expect } = chai;

describe('JSON Import Feature Tests', () => {
    let container;
    let originalGetAllComics;
    let originalGetWishlist;
    let originalSaveComic;
    let originalSaveWish;
    let savedComics = [];
    let savedWishlist = [];

    beforeEach(() => {
        // Backup original methods
        originalGetAllComics = db.getAllComics;
        originalGetWishlist = db.getWishlist;
        originalSaveComic = db.saveComic;
        originalSaveWish = db.saveWish;

        savedComics = [];
        savedWishlist = [];

        // Mock DB Methods
        db.getAllComics = async () => [
            {
                id: 'existing-1',
                titel: 'Batman: The Dark Knight Returns',
                serie: 'Batman',
                nummer: 1,
                verlag: 'DC',
                format: 'Hardcover',
                sprache: 'Deutsch',
                preis: 19.99
            }
        ];

        db.getWishlist = async () => [
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

        db.saveComic = async (comic) => {
            savedComics.push(comic);
            return comic.id || 'new-id-' + Math.random();
        };

        db.saveWish = async (wish) => {
            savedWishlist.push(wish);
            return wish.id || 'new-wish-id-' + Math.random();
        };

        // DOM setup
        container = document.createElement('div');
        container.id = 'view-container';
        document.body.appendChild(container);
        renderImport(container);
    });

    afterEach(() => {
        // Restore DB methods
        db.getAllComics = originalGetAllComics;
        db.getWishlist = originalGetWishlist;
        db.saveComic = originalSaveComic;
        db.saveWish = originalSaveWish;

        // Cleanup DOM
        if (container) {
            container.remove();
        }
        
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
                id: 'existing-1',
                titel: 'Batman: The Dark Knight Returns',
                serie: 'Batman',
                nummer: 1,
                verlag: 'DC',
                format: 'Hardcover',
                sprache: 'Deutsch',
                preis: 19.99
            }
        ];

        const fileInput = container.querySelector('#import-json-file');
        const btnImport = container.querySelector('#btn-import-json');

        const mockFile = new File([JSON.stringify(importData)], 'comics.json', { type: 'application/json' });
        
        Object.defineProperty(fileInput, 'files', {
            value: [mockFile],
            writable: true
        });

        // Trigger click which starts reader
        btnImport.click();

        // Wait for async reader and import processing loops
        await new Promise(resolve => setTimeout(resolve, 100));

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

        btnImport.click();

        await new Promise(resolve => setTimeout(resolve, 100));

        const sumNew = document.getElementById('sum-new').textContent;
        const sumUpdated = document.getElementById('sum-updated').textContent;
        const sumSkipped = document.getElementById('sum-skipped').textContent;

        expect(sumNew).to.equal('2 neu'); // 1 comic, 1 wish
        expect(sumUpdated).to.equal('1 updates'); // 1 wish
        expect(sumSkipped).to.equal('0 übersprungen');

        expect(savedComics.length).to.equal(1);
        expect(savedComics[0].titel).to.equal('Watchmen');

        expect(savedWishlist.length).to.equal(2);
        expect(savedWishlist[0].titel).to.equal('Sandman Vol. 1');
        expect(savedWishlist[1].id).to.equal('wish-existing-1');
        expect(savedWishlist[1].preis).to.equal(17.99);
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

        btnImport.click();

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(statusDiv.style.display).to.equal('block');
        expect(statusDiv.textContent).to.contain('Fehler');
    });
});
