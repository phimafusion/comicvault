import { renderCollection, attachCollectionEvents } from '../views/collection.js';
import { db } from '../db.js';

const { expect } = chai;

describe('ComicVault UI Integration Tests (Collection View)', () => {
    let container;
    let originalGetAllComics;

    before(() => {
        // Event-Listener der Collection-View anbinden
        attachCollectionEvents();

        // Backup der originalen DB-Methode
        originalGetAllComics = db.getAllComics;

        // Mock-Daten für Comics bereitstellen
        db.getAllComics = async () => {
            return [
                { 
                    id: '1', 
                    titel: 'Spider-Man Classic 1', 
                    serie: 'Spider-Man', 
                    verlag: 'Marvel', 
                    bestand: 'vorhanden', 
                    gelesen_am: '2023-05-19', 
                    bewertung: 10, 
                    preis: 5.99,
                    format: 'Heft',
                    bezugsquelle: 'Comicladen'
                },
                { 
                    id: '2', 
                    titel: 'Batman Year One', 
                    serie: 'Batman', 
                    verlag: 'DC', 
                    bestand: 'vorhanden', 
                    gelesen_am: '', 
                    bewertung: 8, 
                    preis: 12.50,
                    format: 'Hardcover',
                    bezugsquelle: 'Online'
                },
                { 
                    id: '3', 
                    titel: 'Superman Rebirth 5', 
                    serie: 'Superman', 
                    verlag: 'DC', 
                    bestand: 'vorbestellt', 
                    gelesen_am: '2023-05-20', 
                    bewertung: 0, 
                    preis: 9.99,
                    format: 'Softcover',
                    bezugsquelle: 'Comicladen'
                }
            ];
        };

        // Test-Container erstellen und in den DOM einhängen
        container = document.createElement('div');
        container.id = 'view-container';
        document.body.appendChild(container);
    });

    after(() => {
        // Mock wiederherstellen
        db.getAllComics = originalGetAllComics;
        // Test-Container entfernen
        if (container) {
            container.remove();
        }
    });

    afterEach(() => {
        // Filter nach jedem Test zurücksetzen durch Klicken des Reset-Buttons
        const resetBtn = container.querySelector('#btn-reset-filters-direct');
        if (resetBtn) {
            resetBtn.click();
        }
    });

    it('sollte die Collection-View rendern und alle Comics anzeigen', async () => {
        await renderCollection(container);
        
        const grid = container.querySelector('#collection-grid');
        expect(grid).to.not.be.null;

        const html = grid.innerHTML;
        expect(html).to.contain('Spider-Man Classic 1');
        expect(html).to.contain('Batman Year One');
        expect(html).to.contain('Superman Rebirth 5');
    });

    it('sollte nach Verlag filtern, wenn die Checkbox aktiviert wird', async () => {
        await renderCollection(container);

        // Finden des Verlags-Dropdowns und der Checkbox
        const checkbox = container.querySelector('.filter-checkbox[data-key="verlag"][value="Marvel"]');
        expect(checkbox).to.not.be.null;

        // Checkbox aktivieren und Change-Event auslösen
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));

        // Kurz warten, bis der asynchrone DOM-Update-Schritt (updateGrid) ausgeführt wurde
        await new Promise(resolve => setTimeout(resolve, 50));

        const grid = container.querySelector('#collection-grid');
        const html = grid.innerHTML;

        // Marvel Comic muss da sein, DC Comics müssen ausgeblendet sein
        expect(html).to.contain('Spider-Man Classic 1');
        expect(html).to.not.contain('Batman Year One');
        expect(html).to.not.contain('Superman Rebirth 5');
    });

    it('sollte den Zähler für gefilterte Comics korrekt aktualisieren', async () => {
        await renderCollection(container);

        const countEl = container.querySelector('#filter-count');
        expect(countEl).to.not.be.null;

        // Anfangs: 3 von 3 Comics sichtbar
        expect(countEl.textContent).to.equal('3 / 3');

        // Filter anwenden (nur Marvel)
        const checkbox = container.querySelector('.filter-checkbox[data-key="verlag"][value="Marvel"]');
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise(resolve => setTimeout(resolve, 50));

        // Nach Filter: 1 von 3 Comics sichtbar
        expect(countEl.textContent).to.equal('1 / 3');
    });

    it('sollte data-col Attribute für Spalten in der Listenansicht rendern', async () => {
        await renderCollection(container);
        
        // Listenansicht aktivieren (falls nicht aktiv)
        const listToggle = container.querySelector('.view-toggle-btn[data-type="list"]');
        if (listToggle) {
            listToggle.click();
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const titleCells = Array.from(container.querySelectorAll('[data-col="titel"]'));
        expect(titleCells.length).to.equal(3);
        const titles = titleCells.map(c => c.textContent);
        expect(titles.some(t => t.includes('Spider-Man Classic 1'))).to.be.true;
    });

    it('sollte Spaltenbreite automatisch anpassen, wenn Doppelklick auf Resizer ausgelöst wird', async () => {
        await renderCollection(container);
        
        // Listenansicht aktivieren
        const listToggle = container.querySelector('.view-toggle-btn[data-type="list"]');
        if (listToggle) {
            listToggle.click();
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const verlagResizer = container.querySelector('.col-resizer[data-key="verlag"]');
        expect(verlagResizer).to.not.be.null;

        // Doppelklick simulieren
        verlagResizer.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));

        // Prüfen, ob die Breite im localStorage und im Style gesetzt wurde
        const visibleFields = JSON.parse(localStorage.getItem('comicvault_visible_fields') || '{}');
        expect(visibleFields.columnWidths).to.not.be.undefined;
        expect(visibleFields.columnWidths.verlag).to.not.be.undefined;
        expect(visibleFields.columnWidths.verlag).to.contain('px');

        const grid = container.querySelector('#collection-grid');
        expect(grid.style.getPropertyValue('--col-width-verlag')).to.equal(visibleFields.columnWidths.verlag);
    });
});

describe('ComicVault Database Caching Tests', () => {
    let originalCollection;
    let originalCurrentUserDescriptor;
    let mockComicsData;
    let mockWishlistData;
    let getComicsCount;
    let getWishlistCount;
    let mockUid = 'user1';

    before(() => {
        // Original-Getter für currentUser sichern
        const auth = firebase.auth();
        originalCurrentUserDescriptor = Object.getOwnPropertyDescriptor(auth, 'currentUser');
        
        // currentUser mocken
        Object.defineProperty(auth, 'currentUser', {
            get: () => {
                if (mockUid === null) return null;
                return { uid: mockUid };
            },
            configurable: true
        });

        // firestore.collection mocken
        const firestore = firebase.firestore();
        originalCollection = firestore.collection;

        firestore.collection = function(path) {
            if (path === 'users') {
                return {
                    doc: (uid) => ({
                        collection: (subpath) => {
                            if (subpath === 'comics') {
                                return {
                                    orderBy: () => ({
                                        get: async () => {
                                            getComicsCount++;
                                            return {
                                                docs: mockComicsData.map(c => ({
                                                    id: c.id,
                                                    data: () => {
                                                        const copy = { ...c };
                                                        delete copy.id;
                                                        return copy;
                                                    }
                                                }))
                                            };
                                        }
                                    }),
                                    doc: (id) => ({
                                        get: async () => ({
                                            exists: true,
                                            data: () => mockComicsData.find(c => c.id === id) || {}
                                        }),
                                        set: async () => {},
                                        delete: async () => {}
                                    }),
                                    add: async () => ({ id: 'new-id' })
                                };
                            }
                            if (subpath === 'wishlist') {
                                return {
                                    orderBy: () => ({
                                        get: async () => {
                                            getWishlistCount++;
                                            return {
                                                docs: mockWishlistData.map(w => ({
                                                    id: w.id,
                                                    data: () => {
                                                        const copy = { ...w };
                                                        delete copy.id;
                                                        return copy;
                                                    }
                                                }))
                                            };
                                        }
                                    }),
                                    doc: () => ({
                                        set: async () => {},
                                        delete: async () => {}
                                    }),
                                    add: async () => ({ id: 'new-wish-id' })
                                };
                            }
                            if (subpath === 'changelog') {
                                return {
                                    add: async () => {}
                                };
                            }
                        }
                    })
                };
            }
            return originalCollection.call(firestore, path);
        };
    });

    after(() => {
        // Restore firestore collection
        const firestore = firebase.firestore();
        firestore.collection = originalCollection;

        // Restore auth currentUser
        const auth = firebase.auth();
        if (originalCurrentUserDescriptor) {
            Object.defineProperty(auth, 'currentUser', originalCurrentUserDescriptor);
        } else {
            delete auth.currentUser;
        }
    });

    beforeEach(() => {
        // Cache zurücksetzen
        db.comicsCache = null;
        db.wishlistCache = null;
        db.cachedUid = null;

        mockUid = 'user1';
        mockComicsData = [
            { id: '1', titel: 'Comic 1', serie: 'A', verlag: 'Publisher' }
        ];
        mockWishlistData = [
            { id: 'w1', titel: 'Wish 1', serie: 'B' }
        ];

        getComicsCount = 0;
        getWishlistCount = 0;
    });

    afterEach(() => {
        // Cache zurücksetzen
        db.comicsCache = null;
        db.wishlistCache = null;
        db.cachedUid = null;
    });

    it('sollte getAllComics beim ersten Aufruf aus der DB laden und danach cachen', async () => {
        const first = await db.getAllComics();
        expect(first.length).to.equal(1);
        expect(getComicsCount).to.equal(1);
        expect(db.cachedUid).to.equal('user1');

        const second = await db.getAllComics();
        expect(second.length).to.equal(1);
        // Sollte aus dem Cache geladen werden, d.h. Count bleibt bei 1
        expect(getComicsCount).to.equal(1);
    });

    it('sollte den Comics-Cache beim Speichern eines Comics invalidieren', async () => {
        await db.getAllComics();
        expect(getComicsCount).to.equal(1);

        await db.saveComic({ titel: 'Comic 2' });
        expect(db.comicsCache).to.be.null;

        await db.getAllComics();
        expect(getComicsCount).to.equal(2);
    });

    it('sollte den Comics-Cache beim Löschen eines Comics invalidieren', async () => {
        await db.getAllComics();
        expect(getComicsCount).to.equal(1);

        await db.deleteComic('1');
        expect(db.comicsCache).to.be.null;

        await db.getAllComics();
        expect(getComicsCount).to.equal(2);
    });

    it('sollte getWishlist beim ersten Aufruf laden und danach cachen', async () => {
        const first = await db.getWishlist();
        expect(first.length).to.equal(1);
        expect(getWishlistCount).to.equal(1);
        expect(db.cachedUid).to.equal('user1');

        const second = await db.getWishlist();
        expect(second.length).to.equal(1);
        expect(getWishlistCount).to.equal(1);
    });

    it('sollte den Wunschlisten-Cache bei saveWish invalidieren', async () => {
        await db.getWishlist();
        expect(getWishlistCount).to.equal(1);

        await db.saveWish({ titel: 'Wish 2' });
        expect(db.wishlistCache).to.be.null;

        await db.getWishlist();
        expect(getWishlistCount).to.equal(2);
    });

    it('sollte den Wunschlisten-Cache bei deleteWish invalidieren', async () => {
        await db.getWishlist();
        expect(getWishlistCount).to.equal(1);

        await db.deleteWish('w1');
        expect(db.wishlistCache).to.be.null;

        await db.getWishlist();
        expect(getWishlistCount).to.equal(2);
    });

    it('sollte den Cache leeren, wenn sich der angemeldete Benutzer ändert', async () => {
        // Caches befüllen unter user1
        await db.getAllComics();
        await db.getWishlist();
        expect(db.cachedUid).to.equal('user1');
        expect(db.comicsCache).to.not.be.null;
        expect(db.wishlistCache).to.not.be.null;

        // User ID ändern
        mockUid = 'user2';

        // getCollection aufrufen, was die caches leert
        db.getCollection();

        expect(db.comicsCache).to.be.null;
        expect(db.wishlistCache).to.be.null;
        expect(db.cachedUid).to.equal('user2');
    });
});

