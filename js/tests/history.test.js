import { db } from '../db.js';

const { expect } = chai;

describe('ComicVault Database History Logging Tests', () => {
    let mockComics;
    let mockWishlist;
    let mockHistory;
    
    let originalGetCollection;
    let originalGetWishlistCollection;
    let originalGetHistoryCollection;
    let originalBatch;
    let originalAuth;

    class MockDocRef {
        constructor(id, store) {
            this.id = id;
            this.store = store;
        }
        async get() {
            return {
                exists: this.id in this.store,
                data: () => this.store[this.id]
            };
        }
        async set(data, options) {
            if (options && options.merge) {
                this.store[this.id] = { ...this.store[this.id], ...data };
            } else {
                this.store[this.id] = { ...data };
            }
        }
        async delete() {
            delete this.store[this.id];
        }
        async update(data) {
            this.store[this.id] = { ...this.store[this.id], ...data };
        }
    }

    class MockCollection {
        constructor(store) {
            this.store = store;
        }
        doc(id) {
            return new MockDocRef(id, this.store);
        }
        async add(data) {
            const id = 'mock-id-' + Math.random().toString(36).substring(7);
            this.store[id] = { ...data };
            return { id };
        }
        async get() {
            return {
                docs: Object.keys(this.store).map(id => ({
                    id,
                    ref: this.doc(id),
                    data: () => this.store[id]
                }))
            };
        }
        orderBy(field, dir) {
            return this;
        }
    }

    before(() => {
        // Backups
        originalGetCollection = db.getCollection;
        originalGetWishlistCollection = db.getWishlistCollection;
        originalGetHistoryCollection = db.getHistoryCollection;
        originalBatch = firebase.firestore().batch;
        
        if (firebase.auth) {
            originalAuth = firebase.auth;
        }

        // Mock Auth
        firebase.auth = () => ({
            currentUser: { uid: 'test-user-uid' }
        });

        // Mock Batch
        firebase.firestore().batch = () => ({
            delete: (docRef) => docRef.delete(),
            update: (docRef, data) => docRef.update(data),
            commit: async () => {}
        });
    });

    after(() => {
        // Restore
        db.getCollection = originalGetCollection;
        db.getWishlistCollection = originalGetWishlistCollection;
        db.getHistoryCollection = originalGetHistoryCollection;
        firebase.firestore().batch = originalBatch;
        
        if (originalAuth) {
            firebase.auth = originalAuth;
        }
    });

    beforeEach(() => {
        mockComics = {};
        mockWishlist = {};
        mockHistory = {};

        db.getCollection = () => new MockCollection(mockComics);
        db.getWishlistCollection = () => new MockCollection(mockWishlist);
        db.getHistoryCollection = () => new MockCollection(mockHistory);
    });

    it('sollte einen Verlaufseintrag beim Erstellen eines neuen Comics anlegen', async () => {
        const comic = {
            titel: 'Batman #1',
            serie: 'Batman',
            nummer: 1,
            verlag: 'DC'
        };

        const id = await db.saveComic(comic);
        expect(id).to.not.be.null;

        const history = await db.getHistory();
        expect(history.length).to.equal(1);
        
        const entry = history[0];
        expect(entry.action).to.equal('create');
        expect(entry.target).to.equal('collection');
        expect(entry.itemId).to.equal(id);
        expect(entry.itemTitle).to.equal('Batman #1');
    });

    it('sollte einen Verlaufseintrag beim Aktualisieren eines Comics mit geänderten Feldern anlegen', async () => {
        // Vorhandenen Comic anlegen
        const comicId = 'existing-comic-id';
        mockComics[comicId] = {
            titel: 'Spidey classic',
            serie: 'Spider-Man',
            verlag: 'Marvel',
            preis: 5.99
        };

        // Update mit geänderten Feldern (Titel und Preis)
        const updatedComic = {
            id: comicId,
            titel: 'Spider-Man Classic #1',
            serie: 'Spider-Man',
            verlag: 'Marvel',
            preis: 6.99
        };

        await db.saveComic(updatedComic);

        const history = await db.getHistory();
        expect(history.length).to.equal(1);

        const entry = history[0];
        expect(entry.action).to.equal('update');
        expect(entry.target).to.equal('collection');
        expect(entry.itemId).to.equal(comicId);
        expect(entry.changes).to.have.property('titel');
        expect(entry.changes.titel.old).to.equal('Spidey classic');
        expect(entry.changes.titel.new).to.equal('Spider-Man Classic #1');
        expect(entry.changes).to.have.property('preis');
        expect(entry.changes.preis.old).to.equal(5.99);
        expect(entry.changes.preis.new).to.equal(6.99);
    });

    it('sollte KEINEN Verlaufseintrag anlegen, wenn sich beim Comic-Update nichts ändert', async () => {
        const comicId = 'existing-comic-id';
        mockComics[comicId] = {
            titel: 'Batman',
            serie: 'Batman',
            preis: 10.00
        };

        const updatedComic = {
            id: comicId,
            titel: 'Batman',
            serie: 'Batman',
            preis: 10.00
        };

        await db.saveComic(updatedComic);

        const history = await db.getHistory();
        expect(history.length).to.equal(0);
    });

    it('sollte einen Verlaufseintrag beim Löschen eines Comics anlegen', async () => {
        const comicId = 'comic-to-delete';
        mockComics[comicId] = {
            titel: 'The Watchmen',
            serie: 'Watchmen',
            verlag: 'DC'
        };

        await db.deleteComic(comicId);

        // Der Comic sollte gelöscht sein
        expect(mockComics[comicId]).to.be.undefined;

        const history = await db.getHistory();
        expect(history.length).to.equal(1);

        const entry = history[0];
        expect(entry.action).to.equal('delete');
        expect(entry.itemId).to.equal(comicId);
        expect(entry.itemTitle).to.equal('Watchmen'); // Aus serie geladen
        expect(entry.itemSnapshot.titel).to.equal('The Watchmen');
    });

    it('sollte Verlaufseinträge bei Bulk-Operationen (Bearbeiten & Löschen) anlegen', async () => {
        // 1. Bulk-Löschen testen
        mockComics['c1'] = { titel: 'Comic 1', serie: 'Reihe 1' };
        mockComics['c2'] = { titel: 'Comic 2', serie: 'Reihe 2' };

        await db.deleteComics(['c1', 'c2']);
        
        let history = await db.getHistory();
        expect(history.length).to.equal(2);
        expect(history[0].action).to.equal('delete');
        expect(history[1].action).to.equal('delete');

        // Verlauf leeren
        await db.clearHistory();

        // 2. Bulk-Update testen
        mockComics['c3'] = { titel: 'Comic 3', verlag: 'Panini', preis: 10 };
        mockComics['c4'] = { titel: 'Comic 4', verlag: 'Carlsen', preis: 12 };

        await db.updateComics(['c3', 'c4'], { preis: 15 });

        history = await db.getHistory();
        expect(history.length).to.equal(2);
        
        expect(history[0].action).to.equal('update');
        expect(history[0].changes.preis.old).to.equal(12);
        expect(history[0].changes.preis.new).to.equal(15);

        expect(history[1].action).to.equal('update');
        expect(history[1].changes.preis.old).to.equal(10);
        expect(history[1].changes.preis.new).to.equal(15);
    });

    it('sollte Verlaufseinträge für die Wunschliste (Erstellen, Update, Löschen) anlegen', async () => {
        // Erstellen
        const wish = { titel: 'Wunsch 1', preis: 10 };
        const id = await db.saveWish(wish);
        
        let history = await db.getHistory();
        expect(history.length).to.equal(1);
        expect(history[0].action).to.equal('create');
        expect(history[0].target).to.equal('wishlist');

        // Update
        const updatedWish = { id, titel: 'Wunsch 1', preis: 12 };
        await db.saveWish(updatedWish);

        history = await db.getHistory();
        expect(history.length).to.equal(2);
        expect(history[0].action).to.equal('update');
        expect(history[0].changes.preis.old).to.equal(10);
        expect(history[0].changes.preis.new).to.equal(12);

        // Löschen
        await db.deleteWish(id);
        history = await db.getHistory();
        expect(history.length).to.equal(3);
        expect(history[0].action).to.equal('delete');
    });
});
