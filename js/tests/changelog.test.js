import { db } from '../db.js';
import { renderChangelog } from '../views/changelog.js';
import { setupTestEnv, cleanup, tick } from './testHelper.js';

const { expect } = chai;

describe('Changelog Feature Tests', () => {
    let testEnv;
    let originalGetCollection;
    let originalGetChangelogCollection;
    let originalBatch;
    let container;

    let mockComics = [];
    let mockChangelog = [];

    before(() => {
        const firestoreInstance = firebase.firestore();
        originalBatch = firestoreInstance.batch;
    });

    after(() => {
        const firestoreInstance = firebase.firestore();
        firestoreInstance.batch = originalBatch;
    });

    beforeEach(() => {
        mockComics = [];
        mockChangelog = [];

        testEnv = setupTestEnv();
        container = testEnv.viewContainer;

        // Restore real mutator methods so they write to the mock collections
        const proto = Object.getPrototypeOf(db);
        db.saveComic = proto.saveComic;
        db.deleteComic = proto.deleteComic;
        db.saveWish = proto.saveWish;
        db.deleteWish = proto.deleteWish;
        db.updateComics = proto.updateComics;
        db.deleteComics = proto.deleteComics;
        db.revertChangelogEntry = proto.revertChangelogEntry;
        db.clearAllData = proto.clearAllData;

        // Backup
        originalGetCollection = db.getCollection;
        originalGetChangelogCollection = db.getChangelogCollection;

        // Mock firestore batch
        const firestoreInstance = firebase.firestore();
        let deletedRefs = [];
        firestoreInstance.batch = () => {
            return {
                delete: (ref) => {
                    deletedRefs.push(ref);
                },
                update: (ref, data) => {},
                commit: async () => {
                    deletedRefs.forEach(ref => {
                        if (ref && typeof ref.delete === 'function') {
                            ref.delete();
                        }
                    });
                    deletedRefs = [];
                }
            };
        };

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
                doc: (id) => ({
                    get: async () => {
                        const found = mockChangelog.find(l => l.id === id);
                        return {
                            exists: !!found,
                            data: () => {
                                if (!found) return null;
                                const copy = { ...found };
                                delete copy.id;
                                return copy;
                            }
                        };
                    },
                    delete: async () => {
                        mockChangelog = mockChangelog.filter(l => l.id !== id);
                    }
                }),
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
                        get: async () => {
                            const sorted = [...mockChangelog].sort((a, b) => {
                                return direction === 'asc' 
                                    ? a.timestamp.localeCompare(b.timestamp) 
                                    : b.timestamp.localeCompare(a.timestamp);
                            });
                            return {
                                docs: sorted.slice(0, n).map(item => ({
                                    id: item.id,
                                    ref: {
                                        delete: async () => {
                                            mockChangelog = mockChangelog.filter(l => l.id !== item.id);
                                        }
                                    },
                                    data: () => {
                                        const copy = { ...item };
                                        delete copy.id;
                                        return copy;
                                    }
                                }))
                            };
                        }
                    }),
                    get: async () => {
                        const sorted = [...mockChangelog].sort((a, b) => {
                            return direction === 'asc' 
                                ? a.timestamp.localeCompare(b.timestamp) 
                                : b.timestamp.localeCompare(a.timestamp);
                        });
                        return {
                            docs: sorted.map(item => ({
                                id: item.id,
                                ref: {
                                    delete: async () => {
                                        mockChangelog = mockChangelog.filter(l => l.id !== item.id);
                                    }
                                },
                                data: () => {
                                    const copy = { ...item };
                                    delete copy.id;
                                    return copy;
                                }
                            }))
                        };
                    }
                }),
                count: () => ({
                    get: async () => ({
                        data: () => ({
                            count: mockChangelog.length
                        })
                    })
                })
            };
        };
    });

    afterEach(() => {
        cleanup();
        db.getCollection = originalGetCollection;
        db.getChangelogCollection = originalGetChangelogCollection;

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
        await tick();

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
        await tick();

        expect(mockChangelog.length).to.equal(0);
        
        // Modal sollte geschlossen sein
        expect(document.getElementById('changelog-clear-confirm-modal')).to.be.null;
    });

    it('sollte das Rückgängigmachen (Revert) einer Erstellung (create) unterstützen', async () => {
        // Comic erstellen
        const comic = {
            id: 'comic-to-revert-create',
            titel: 'Black Panther',
            serie: 'Black Panther',
            nummer: 1
        };
        mockComics.push(comic);

        // Entsprechender Changelog-Eintrag
        const logId = 'log-create-revert';
        mockChangelog.push({
            id: logId,
            timestamp: new Date().toISOString(),
            action: 'create',
            comicId: 'comic-to-revert-create',
            titel: 'Black Panther',
            serie: 'Black Panther',
            nummer: 1,
            changes: []
        });

        // Revert ausführen
        await db.revertChangelogEntry(logId);

        // Der Comic sollte gelöscht sein
        expect(mockComics.find(c => c.id === 'comic-to-revert-create')).to.be.undefined;
        // Der Changelog-Eintrag selbst sollte gelöscht sein
        expect(mockChangelog.find(l => l.id === logId)).to.be.undefined;
    });

    it('sollte das Rückgängigmachen (Revert) einer Löschung (delete) unterstützen', async () => {
        // Gelöschter Comic Snapshot
        const deletedSnapshot = {
            titel: 'Iron Man #1',
            serie: 'Iron Man',
            nummer: 1,
            verlag: 'Marvel',
            preis: 3.99,
            format: 'Heft'
        };

        const logId = 'log-delete-revert';
        mockChangelog.push({
            id: logId,
            timestamp: new Date().toISOString(),
            action: 'delete',
            comicId: 'ironman-deleted-id',
            titel: 'Iron Man #1',
            serie: 'Iron Man',
            nummer: 1,
            deletedSnapshot: deletedSnapshot,
            changes: []
        });

        // Revert ausführen
        await db.revertChangelogEntry(logId);

        // Der Comic sollte wieder da sein
        const restored = mockComics.find(c => c.id === 'ironman-deleted-id');
        expect(restored).to.not.be.undefined;
        expect(restored.titel).to.equal('Iron Man #1');
        expect(restored.preis).to.equal(3.99);
        expect(restored.format).to.equal('Heft');
        // Der Changelog-Eintrag selbst sollte gelöscht sein
        expect(mockChangelog.find(l => l.id === logId)).to.be.undefined;
    });

    it('sollte das Rückgängigmachen (Revert) eines Updates unterstützen', async () => {
        // Aktueller Zustand des Comics in der DB (nach dem Update)
        const currentComic = {
            id: 'comic-to-revert-update',
            titel: 'Thor #1 (Neu)',
            serie: 'Thor',
            nummer: 1,
            preis: 5.99, // Geändert
            format: 'Hardcover' // Geändert
        };
        mockComics.push(currentComic);

        // Update Log Eintrag
        const logId = 'log-update-revert';
        mockChangelog.push({
            id: logId,
            timestamp: new Date().toISOString(),
            action: 'update',
            comicId: 'comic-to-revert-update',
            titel: 'Thor #1 (Neu)',
            serie: 'Thor',
            nummer: 1,
            changes: [
                { field: 'titel', old: 'Thor #1', new: 'Thor #1 (Neu)' },
                { field: 'preis', old: 3.99, new: 5.99 },
                { field: 'format', old: 'Heft', new: 'Hardcover' }
            ]
        });

        // Revert ausführen
        await db.revertChangelogEntry(logId);

        // Der Comic sollte wieder auf den alten Werten stehen
        const reverted = mockComics.find(c => c.id === 'comic-to-revert-update');
        expect(reverted).to.not.be.undefined;
        expect(reverted.titel).to.equal('Thor #1');
        expect(reverted.preis).to.equal(3.99);
        expect(reverted.format).to.equal('Heft');
        // Der Changelog-Eintrag selbst sollte gelöscht sein
        expect(mockChangelog.find(l => l.id === logId)).to.be.undefined;
    });

    it('sollte das rollierende Limit von 5000 Einträgen bei getChangelog einhalten (lazy cleanup)', async () => {
        // Wir füllen mockChangelog mit 5005 Einträgen mit aufsteigenden Timestamps
        mockChangelog = [];
        const baseTime = new Date('2026-05-01T00:00:00Z').getTime();
        for (let i = 0; i < 5005; i++) {
            mockChangelog.push({
                id: `log-${i}`,
                timestamp: new Date(baseTime + i * 1000).toISOString(),
                action: 'create',
                comicId: `comic-${i}`,
                changes: []
            });
        }

        // Wir rufen getChangelog auf, was die Bereinigung auslösen sollte
        await db.getChangelog(50);

        // Die ältesten 5 Einträge (log-0 bis log-4) sollten gelöscht worden sein.
        expect(mockChangelog.length).to.equal(5000);
        expect(mockChangelog.find(l => l.id === 'log-0')).to.be.undefined;
        expect(mockChangelog.find(l => l.id === 'log-4')).to.be.undefined;
        // Der 6. Eintrag (log-5) sollte noch da sein
        expect(mockChangelog.find(l => l.id === 'log-5')).to.not.be.undefined;
    });
});
