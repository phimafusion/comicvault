import { db } from '../db.js';
import { renderChangelog } from '../views/changelog.js';

const { expect } = chai;

describe('Changelog Feature Tests', () => {
    let originalGetCollection;
    let originalGetChangelogCollection;
    let container;

    let mockComics = [];
    let mockChangelog = [];

    beforeEach(() => {
        mockComics = [];
        mockChangelog = [];

        // Backup
        originalGetCollection = db.getCollection;
        originalGetChangelogCollection = db.getChangelogCollection;

        // Mock DB Collections
        db.getCollection = () => {
            return {
                doc: (id) => ({
                    get: async () => ({
                        exists: !!mockComics.find(c => c.id === id),
                        data: () => {
                            const found = mockComics.find(c => c.id === id);
                            if (!found) return null;
                            const copy = { ...found };
                            delete copy.id;
                            return copy;
                        }
                    }),
                    set: async (data) => {
                        const index = mockComics.findIndex(c => c.id === id);
                        if (index !== -1) {
                            mockComics[index] = { ...mockComics[index], ...data };
                        } else {
                            mockComics.push({ id, ...data });
                        }
                    },
                    delete: async () => {
                        mockComics = mockComics.filter(c => c.id !== id);
                    }
                }),
                add: async (data) => {
                    const id = 'mock-comic-' + Math.random();
                    mockComics.push({ id, ...data });
                    return { id };
                }
            };
        };

        db.getChangelogCollection = () => {
            return {
                add: async (data) => {
                    const id = 'mock-log-' + Math.random();
                    mockChangelog.push({ id, ...data });
                    return { id };
                },
                get: async () => ({
                    docs: mockChangelog.map(log => ({
                        ref: {
                            delete: async () => {
                                mockChangelog = mockChangelog.filter(l => l.id !== log.id);
                            }
                        }
                    }))
                }),
                orderBy: (field, direction) => ({
                    limit: (n) => ({
                        get: async () => ({
                            docs: [...mockChangelog]
                                .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                                .slice(0, n)
                                .map(item => ({
                                    id: item.id,
                                    data: () => {
                                        const copy = { ...item };
                                        delete copy.id;
                                        return copy;
                                    }
                                }))
                        })
                    })
                })
            };
        };

        // DOM setup
        container = document.createElement('div');
        container.id = 'view-container';
        document.body.appendChild(container);
    });

    afterEach(() => {
        // Restore
        db.getCollection = originalGetCollection;
        db.getChangelogCollection = originalGetChangelogCollection;

        // Cleanup DOM
        if (container) {
            container.remove();
        }
        const modal = document.getElementById('changelog-clear-confirm-modal');
        if (modal) modal.remove();
    });

    it('sollte beim Erstellen eines neuen Comics automatisch einen changelog-Eintrag schreiben', async () => {
        const comic = {
            titel: 'Watchmen Deluxe',
            serie: 'Watchmen',
            nummer: 1,
            verlag: 'DC Comics',
            preis: 49.99
        };

        await db.saveComic(comic);

        expect(mockChangelog.length).to.equal(1);
        expect(mockChangelog[0].action).to.equal('create');
        expect(mockChangelog[0].titel).to.equal('Watchmen Deluxe');
        expect(mockChangelog[0].serie).to.equal('Watchmen');
        expect(mockChangelog[0].nummer).to.equal(1);
        expect(mockChangelog[0].changes.length).to.equal(0);
    });

    it('sollte beim Aktualisieren eines Comics automatisch Änderungen protokollieren', async () => {
        // Initialer Comic
        const initial = {
            id: 'comic-to-update',
            titel: 'Spawn #1',
            serie: 'Spawn',
            nummer: 1,
            verlag: 'Image',
            preis: 4.99,
            format: 'Heft'
        };
        mockComics.push(initial);

        // Update
        const updated = {
            id: 'comic-to-update',
            titel: 'Spawn #1',
            serie: 'Spawn',
            nummer: 1,
            verlag: 'Image',
            preis: 9.99, // Geändert
            format: 'Hardcover' // Geändert
        };

        await db.saveComic(updated);

        // Erster Changelog-Eintrag für Save (nicht die Erstellung, da mockComics manuell befüllt wurde)
        expect(mockChangelog.length).to.equal(1);
        const log = mockChangelog[0];
        expect(log.action).to.equal('update');
        expect(log.comicId).to.equal('comic-to-update');
        expect(log.changes.length).to.equal(2);

        const preisChange = log.changes.find(c => c.field === 'preis');
        expect(preisChange).to.not.be.undefined;
        expect(preisChange.old).to.equal(4.99);
        expect(preisChange.new).to.equal(9.99);

        const formatChange = log.changes.find(c => c.field === 'format');
        expect(formatChange).to.not.be.undefined;
        expect(formatChange.old).to.equal('Heft');
        expect(formatChange.new).to.equal('Hardcover');
    });

    it('sollte beim Löschen eines Comics ein delete-Event schreiben', async () => {
        const initial = {
            id: 'comic-to-delete',
            titel: 'Sandman #1',
            serie: 'Sandman',
            nummer: 1,
            verlag: 'Vertigo'
        };
        mockComics.push(initial);

        await db.deleteComic('comic-to-delete');

        expect(mockChangelog.length).to.equal(1);
        const log = mockChangelog[0];
        expect(log.action).to.equal('delete');
        expect(log.comicId).to.equal('comic-to-delete');
        expect(log.titel).to.equal('Sandman #1');
        expect(log.verlag).to.equal('Vertigo');
    });

    it('sollte den Verlauf über die UI leeren können', async () => {
        mockChangelog.push({
            timestamp: new Date().toISOString(),
            action: 'create',
            comicId: 'any',
            titel: 'Any',
            changes: []
        });

        renderChangelog(container);

        // Warten auf das asynchrone Laden der Einträge
        await new Promise(resolve => setTimeout(resolve, 50));

        const clearBtn = container.querySelector('#btn-clear-changelog');
        expect(clearBtn).to.not.be.null;

        clearBtn.click();

        // Modal sollte im DOM sein
        const modal = document.getElementById('changelog-clear-confirm-modal');
        expect(modal).to.not.be.null;

        const confirmBtn = document.getElementById('changelog-clear-modal-confirm');
        expect(confirmBtn).to.not.be.null;

        confirmBtn.click();

        // Kurz warten auf DB-Löschung
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockChangelog.length).to.equal(0);
        
        // Modal sollte geschlossen sein
        expect(document.getElementById('changelog-clear-confirm-modal')).to.be.null;
    });
});
