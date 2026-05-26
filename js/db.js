import { getCurrentUser } from './auth.js';
import { getChangedFields } from './utils.js';

// Firebase Firestore initialisieren
const dbFirestore = firebase.firestore();
const storage = firebase.storage();
const SETTINGS_KEY = 'comicvault_settings';

class Database {
    constructor() {}

    getCollection() {
        const user = getCurrentUser();
        if (!user) return null;
        // Wir speichern Comics in einer Unter-Kollektion pro User
        return dbFirestore.collection('users').doc(user.uid).collection('comics');
    }

    async getAllComics() {
        const col = this.getCollection();
        if (!col) return [];
        const snapshot = await col.orderBy('serie', 'asc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async saveComic(comic) {
        const col = this.getCollection();
        if (!col) return;

        const data = { ...comic };
        const id = data.id;
        delete data.id;

        const now = new Date().toISOString();
        data.updated_at = now;

        if (id) {
            let oldData = null;
            try {
                const oldDoc = await col.doc(id).get();
                if (oldDoc.exists) {
                    oldData = oldDoc.data();
                }
            } catch (err) {
                console.error("Fehler beim Abrufen des alten Comics für Changelog:", err);
            }

            await col.doc(id).set(data, { merge: true });

            if (oldData) {
                await this.addChangelogEntry('update', id, oldData, data);
            }
            return id;
        } else {
            data.created_at = now;
            const ref = await col.add(data);
            await this.addChangelogEntry('create', ref.id, null, data);
            return ref.id;
        }
    }

    async deleteComic(id) {
        const col = this.getCollection();
        if (col) {
            let oldData = null;
            try {
                const oldDoc = await col.doc(id).get();
                if (oldDoc.exists) {
                    oldData = oldDoc.data();
                }
            } catch (err) {
                console.error("Fehler beim Abrufen des gelöschten Comics für Changelog:", err);
            }

            await col.doc(id).delete();

            if (oldData) {
                await this.addChangelogEntry('delete', id, oldData, null);
            }
        }
    }

    async deleteComics(ids) {
        const col = this.getCollection();
        if (!col || !ids || ids.length === 0) return;

        const oldDocs = await Promise.all(ids.map(id => col.doc(id).get()));
        const oldDataMap = new Map();
        oldDocs.forEach(doc => {
            if (doc.exists) oldDataMap.set(doc.id, doc.data());
        });

        const batch = dbFirestore.batch();
        ids.forEach(id => {
            batch.delete(col.doc(id));
        });
        await batch.commit();

        await Promise.all(ids.map(id => {
            const oldData = oldDataMap.get(id);
            if (oldData) {
                return this.addChangelogEntry('delete', id, oldData, null);
            }
            return Promise.resolve();
        }));
    }

    async updateComics(ids, updates) {
        const col = this.getCollection();
        if (!col || !ids || ids.length === 0 || Object.keys(updates).length === 0) return;

        const oldDocs = await Promise.all(ids.map(id => col.doc(id).get()));
        const oldDataMap = new Map();
        oldDocs.forEach(doc => {
            if (doc.exists) oldDataMap.set(doc.id, doc.data());
        });

        const batch = dbFirestore.batch();
        const now = new Date().toISOString();
        const data = { ...updates, updated_at: now };

        ids.forEach(id => {
            batch.update(col.doc(id), data);
        });
        await batch.commit();

        await Promise.all(ids.map(id => {
            const oldData = oldDataMap.get(id);
            if (oldData) {
                const newData = { ...oldData, ...data };
                return this.addChangelogEntry('update', id, oldData, newData);
            }
            return Promise.resolve();
        }));
    }

    // Wunschliste
    getWishlistCollection() {
        const user = getCurrentUser();
        if (!user) return null;
        return dbFirestore.collection('users').doc(user.uid).collection('wishlist');
    }

    async getWishlist() {
        const col = this.getWishlistCollection();
        if (!col) return [];
        const snapshot = await col.orderBy('titel', 'asc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async saveWish(wish) {
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
        const snapshot = await col.orderBy('timestamp', 'desc').limit(limit).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
}

export const db = new Database();
