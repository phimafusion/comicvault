import { getCurrentUser } from './auth.js';
import { getChangedFields } from './utils.js';

// Firebase Firestore initialisieren
const dbFirestore = firebase.firestore();
const storage = firebase.storage();
const SETTINGS_KEY = 'comicvault_settings';

// Offline Persistence aktivieren: Daten werden in IndexedDB gecacht.
// Ab dem 2. App-Start erscheint die Sammlung sofort, Firebase sync läuft im Hintergrund.
dbFirestore.enablePersistence({ synchronizeTabs: true }).catch(err => {
    if (err.code === 'failed-precondition') {
        console.warn('Firestore Offline-Cache: Mehrere Tabs offen, Cache deaktiviert.');
    } else if (err.code === 'unimplemented') {
        console.warn('Firestore Offline-Cache: Browser unterstützt IndexedDB nicht.');
    }
});


class Database {
    constructor() {
        this.comicsCache = null;
        this.wishlistCache = null;
        this.cachedUid = null;
    }

    getCollection() {
        const user = getCurrentUser();
        if (!user) {
            this.comicsCache = null;
            this.wishlistCache = null;
            this.cachedUid = null;
            return null;
        }
        if (this.cachedUid !== user.uid) {
            this.comicsCache = null;
            this.wishlistCache = null;
            this.cachedUid = user.uid;
        }
        // Wir speichern Comics in einer Unter-Kollektion pro User
        return dbFirestore.collection('users').doc(user.uid).collection('comics');
    }

    async getAllComics() {
        if (this.comicsCache) {
            return [...this.comicsCache];
        }
        const col = this.getCollection();
        if (!col) return [];
        const snapshot = await col.orderBy('serie', 'asc').get();
        this.comicsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return [...this.comicsCache];
    }

    async saveComic(comic, options = {}) {
        this.comicsCache = null;
        const col = this.getCollection();
        if (!col) return;

        const data = { ...comic };
        const id = data.id;
        delete data.id;

        const now = new Date().toISOString();
        data.updated_at = now;

        if (id) {
            let oldData = null;
            if (!options.skipChangelog) {
                try {
                    const oldDoc = await col.doc(id).get();
                    if (oldDoc.exists) {
                        oldData = oldDoc.data();
                    }
                } catch (err) {
                    console.error("Fehler beim Abrufen des alten Comics für Changelog:", err);
                }
            }

            await col.doc(id).set(data, { merge: true });

            if (!options.skipChangelog && oldData) {
                await this.addChangelogEntry('update', id, oldData, data);
            }
            return id;
        } else {
            data.created_at = now;
            const ref = await col.add(data);
            if (!options.skipChangelog) {
                await this.addChangelogEntry('create', ref.id, null, data);
            }
            return ref.id;
        }
    }

    async deleteComic(id, options = {}) {
        this.comicsCache = null;
        const col = this.getCollection();
        if (col) {
            let oldData = null;
            if (!options.skipChangelog) {
                try {
                    const oldDoc = await col.doc(id).get();
                    if (oldDoc.exists) {
                        oldData = oldDoc.data();
                    }
                } catch (err) {
                    console.error("Fehler beim Abrufen des gelöschten Comics für Changelog:", err);
                }
            }

            await col.doc(id).delete();

            if (!options.skipChangelog && oldData) {
                await this.addChangelogEntry('delete', id, oldData, null);
            }
        }
    }

    async deleteComics(ids, options = {}) {
        this.comicsCache = null;
        const col = this.getCollection();
        if (!col || !ids || ids.length === 0) return;

        let oldDataMap = new Map();
        if (!options.skipChangelog) {
            const oldDocs = await Promise.all(ids.map(id => col.doc(id).get()));
            oldDocs.forEach(doc => {
                if (doc.exists) oldDataMap.set(doc.id, doc.data());
            });
        }

        const batch = dbFirestore.batch();
        ids.forEach(id => {
            batch.delete(col.doc(id));
        });
        await batch.commit();

        if (!options.skipChangelog) {
            await Promise.all(ids.map(id => {
                const oldData = oldDataMap.get(id);
                if (oldData) {
                    return this.addChangelogEntry('delete', id, oldData, null);
                }
                return Promise.resolve();
            }));
        }
    }

    async updateComics(ids, updates, options = {}) {
        this.comicsCache = null;
        const col = this.getCollection();
        if (!col || !ids || ids.length === 0 || Object.keys(updates).length === 0) return;

        let oldDataMap = new Map();
        if (!options.skipChangelog) {
            const oldDocs = await Promise.all(ids.map(id => col.doc(id).get()));
            oldDocs.forEach(doc => {
                if (doc.exists) oldDataMap.set(doc.id, doc.data());
            });
        }

        const batch = dbFirestore.batch();
        const now = new Date().toISOString();
        const data = { ...updates, updated_at: now };

        ids.forEach(id => {
            batch.update(col.doc(id), data);
        });
        await batch.commit();

        if (!options.skipChangelog) {
            await Promise.all(ids.map(id => {
                const oldData = oldDataMap.get(id);
                if (oldData) {
                    const newData = { ...oldData, ...data };
                    return this.addChangelogEntry('update', id, oldData, newData);
                }
                return Promise.resolve();
            }));
        }
    }

    // Wunschliste
    getWishlistCollection() {
        const user = getCurrentUser();
        if (!user) {
            this.comicsCache = null;
            this.wishlistCache = null;
            this.cachedUid = null;
            return null;
        }
        if (this.cachedUid !== user.uid) {
            this.comicsCache = null;
            this.wishlistCache = null;
            this.cachedUid = user.uid;
        }
        return dbFirestore.collection('users').doc(user.uid).collection('wishlist');
    }

    async getWishlist() {
        if (this.wishlistCache) {
            return [...this.wishlistCache];
        }
        const col = this.getWishlistCollection();
        if (!col) return [];
        const snapshot = await col.orderBy('titel', 'asc').get();
        this.wishlistCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return [...this.wishlistCache];
    }

    async saveWish(wish) {
        this.wishlistCache = null;
        const col = this.getWishlistCollection();
        if (!col) return;
        const data = { ...wish };
        const id = data.id;
        delete data.id;
        const now = new Date().toISOString();
        data.updated_at = now;

        if (id) {
            await col.doc(id).set(data, { merge: true });
        } else {
            data.created_at = now;
            await col.add(data);
        }
    }

    async deleteWish(id) {
        this.wishlistCache = null;
        const col = this.getWishlistCollection();
        if (col) await col.doc(id).delete();
    }

    async uploadImage(file) {
        const user = getCurrentUser();
        if (!user || !file) return null;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `users/${user.uid}/images/${fileName}`;
        
        const storageRef = storage.ref().child(filePath);
        await storageRef.put(file);
        const downloadUrl = await storageRef.getDownloadURL();
        return downloadUrl;
    }

    async clearAllData() {
        this.comicsCache = null;
        this.wishlistCache = null;
        const user = getCurrentUser();
        if (!user) return;

        const collections = [this.getCollection(), this.getWishlistCollection()];
        for (const col of collections) {
            if (!col) continue;
            const snapshot = await col.get();
            const batch = dbFirestore.batch();
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
    }

    getSettings() {
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{"theme": "dark"}');
        if (!settings.customSuggestions) {
            settings.customSuggestions = {
                typ: ['Comic', 'Manga', 'Graphic Novel', 'Artbook'],
                format: ['Softcover', 'Hardcover', 'Heft', 'Album', 'Omnibus', 'Absolute'],
                zustand: ['neu', 'gebraucht'],
                bestand: ['vorhanden', 'vorbestellt', 'verkauft', 'abgegeben', 'verliehen']
            };
        } else {
            // Migration: Stellen wir sicher, dass 'verliehen' in den Bestand-Vorschlägen existiert
            let changed = false;
            if (settings.customSuggestions.bestand && !settings.customSuggestions.bestand.includes('verliehen')) {
                settings.customSuggestions.bestand.push('verliehen');
                changed = true;
            }
            // Migration: 'verlag' aus den customSuggestions entfernen, da kein Enum
            if (settings.customSuggestions.verlag) {
                delete settings.customSuggestions.verlag;
                changed = true;
            }
            if (changed) {
                this.saveSettings(settings);
            }
        }
        return settings;
    }

    saveSettings(settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    // Changelog helper methods
    getChangelogCollection() {
        const user = getCurrentUser();
        if (!user) return null;
        return dbFirestore.collection('users').doc(user.uid).collection('changelog');
    }

    async getChangelog(limit = 50) {
        const col = this.getChangelogCollection();
        if (!col) return [];
        
        // Lazy cleanup for rolling cap of 5,000 entries
        await this.cleanOldChangelogEntries();

        const snapshot = await col.orderBy('timestamp', 'desc').limit(limit).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async cleanOldChangelogEntries() {
        const col = this.getChangelogCollection();
        if (!col) return;
        try {
            let total = 0;
            if (typeof col.count === 'function') {
                const countSnapshot = await col.count().get();
                total = countSnapshot.data().count;
            } else {
                // Fallback in case of mock/unsupported environment
                const snapshot = await col.get();
                total = snapshot.size;
            }

            if (total > 5000) {
                const toDeleteCount = total - 5000;
                const snapshot = await col.orderBy('timestamp', 'asc').limit(toDeleteCount).get();
                if (snapshot.docs.length > 0) {
                    const batch = dbFirestore.batch();
                    snapshot.docs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    console.log(`Changelog bereinigt: ${snapshot.docs.length} alte Einträge gelöscht.`);
                }
            }
        } catch (err) {
            console.error("Fehler bei der Changelog-Bereinigung:", err);
        }
    }

    async clearChangelog() {
        const col = this.getChangelogCollection();
        if (!col) return;
        const snapshot = await col.get();
        const batch = dbFirestore.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    }

    async addChangelogEntry(action, comicId, oldData, newData) {
        const col = this.getChangelogCollection();
        if (!col) return;

        const now = new Date().toISOString();
        const entry = {
            timestamp: now,
            action,
            comicId
        };

        if (action === 'create') {
            entry.serie = newData.serie || '';
            entry.nummer = newData.nummer ?? null;
            entry.titel = newData.titel || '';
            entry.verlag = newData.verlag || '';
            entry.changes = [];
        } else if (action === 'delete') {
            entry.serie = oldData.serie || '';
            entry.nummer = oldData.nummer ?? null;
            entry.titel = oldData.titel || '';
            entry.verlag = oldData.verlag || '';
            entry.changes = [];
            entry.deletedSnapshot = oldData; // Save full original data for reverts
        } else if (action === 'update') {
            const diffs = getChangedFields(oldData, newData);
            if (diffs.length === 0) return; // Nichts zu protokollieren
            
            entry.serie = newData.serie || oldData.serie || '';
            entry.nummer = newData.nummer ?? oldData.nummer ?? null;
            entry.titel = newData.titel || oldData.titel || '';
            entry.verlag = newData.verlag || oldData.verlag || '';
            entry.changes = diffs.map(f => ({
                field: f,
                old: oldData[f] ?? '',
                new: newData[f] ?? ''
            }));
        }

        await col.add(entry);
    }

    async revertChangelogEntry(entryId) {
        const col = this.getChangelogCollection();
        if (!col) throw new Error("Nicht angemeldet.");

        const logDoc = await col.doc(entryId).get();
        if (!logDoc.exists) {
            throw new Error("Protokolleintrag existiert nicht.");
        }

        const entry = logDoc.data();
        const action = entry.action;
        const comicId = entry.comicId;

        const comicsCol = this.getCollection();
        if (!comicsCol) throw new Error("Nicht angemeldet.");

        if (action === 'create') {
            // Revert create => delete the comic without adding to log
            await this.deleteComic(comicId, { skipChangelog: true });
        } else if (action === 'delete') {
            // Revert delete => recreate comic from snapshot without adding to log
            if (!entry.deletedSnapshot) {
                throw new Error("Dieser gelöschte Comic kann nicht wiederhergestellt werden, da kein Snapshot vorhanden ist.");
            }
            const restoredComic = { id: comicId, ...entry.deletedSnapshot };
            await this.saveComic(restoredComic, { skipChangelog: true });
        } else if (action === 'update') {
            // Revert update => restore old values for modified fields without adding to log
            const doc = await comicsCol.doc(comicId).get();
            if (!doc.exists) {
                throw new Error("Der Comic existiert nicht mehr und kann nicht aktualisiert werden.");
            }
            const currentData = doc.data();
            const revertedData = { ...currentData };
            
            if (Array.isArray(entry.changes)) {
                entry.changes.forEach(change => {
                    revertedData[change.field] = change.old;
                });
            }
            revertedData.id = comicId;
            await this.saveComic(revertedData, { skipChangelog: true });
        } else {
            throw new Error(`Unbekannte Aktion: ${action}`);
        }

        // Remove the reverted entry from history to avoid confusion / pollution
        await col.doc(entryId).delete();
    }
}

export const db = new Database();
