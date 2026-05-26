import { getCurrentUser } from './auth.js';
import { getChangedFields, getWishlistChangedFields } from './utils.js';

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
        delete data.id; // ID wird separat behandelt

        const now = new Date().toISOString();
        data.updated_at = now;

        if (id) {
            let oldData = null;
            try {
                const oldSnap = await col.doc(id).get();
                if (oldSnap.exists) {
                    oldData = oldSnap.data();
                }
            } catch (err) {
                console.error("Fehler beim Abrufen des alten Comic-Zustands für History:", err);
            }

            await col.doc(id).set(data, { merge: true });

            if (oldData) {
                const changedFields = getChangedFields(oldData, data);
                if (changedFields.length > 0) {
                    const changes = {};
                    changedFields.forEach(f => {
                        changes[f] = { old: oldData[f] ?? '', new: data[f] ?? '' };
                    });
                    await this.addHistoryEntry({
                        timestamp: now,
                        action: 'update',
                        target: 'collection',
                        itemId: id,
                        itemTitle: `${data.serie || ''} ${data.nummer ? '#' + data.nummer : ''}`.trim() || data.titel || 'Unbekannt',
                        changes
                    });
                }
            }
            return id;
        } else {
            data.created_at = now;
            const ref = await col.add(data);

            await this.addHistoryEntry({
                timestamp: now,
                action: 'create',
                target: 'collection',
                itemId: ref.id,
                itemTitle: `${data.serie || ''} ${data.nummer ? '#' + data.nummer : ''}`.trim() || data.titel || 'Unbekannt',
                changes: {}
            });
            return ref.id;
        }
    }

    async deleteComic(id) {
        const col = this.getCollection();
        if (col) {
            let oldData = null;
            try {
                const oldSnap = await col.doc(id).get();
                if (oldSnap.exists) {
                    oldData = oldSnap.data();
                }
            } catch (err) {
                console.error(err);
            }

            await col.doc(id).delete();

            if (oldData) {
                await this.addHistoryEntry({
                    timestamp: new Date().toISOString(),
                    action: 'delete',
                    target: 'collection',
                    itemId: id,
                    itemTitle: `${oldData.serie || ''} ${oldData.nummer ? '#' + oldData.nummer : ''}`.trim() || oldData.titel || 'Unbekannt',
                    changes: {},
                    itemSnapshot: oldData
                });
            }
        }
    }

    async deleteComics(ids) {
        const col = this.getCollection();
        if (!col || !ids || ids.length === 0) return;

        const oldSnapshots = await Promise.all(ids.map(id => col.doc(id).get()));
        const oldComics = oldSnapshots.filter(snap => snap.exists).map(snap => ({ id: snap.id, ...snap.data() }));

        const batch = dbFirestore.batch();
        ids.forEach(id => {
            batch.delete(col.doc(id));
        });
        await batch.commit();

        const now = new Date().toISOString();
        for (const oldData of oldComics) {
            await this.addHistoryEntry({
                timestamp: now,
                action: 'delete',
                target: 'collection',
                itemId: oldData.id,
                itemTitle: `${oldData.serie || ''} ${oldData.nummer ? '#' + oldData.nummer : ''}`.trim() || oldData.titel || 'Unbekannt',
                changes: {},
                itemSnapshot: oldData
            });
        }
    }

    async updateComics(ids, updates) {
        const col = this.getCollection();
        if (!col || !ids || ids.length === 0 || Object.keys(updates).length === 0) return;

        const oldSnapshots = await Promise.all(ids.map(id => col.doc(id).get()));
        const oldComics = oldSnapshots.filter(snap => snap.exists).map(snap => ({ id: snap.id, ...snap.data() }));

        const batch = dbFirestore.batch();
        const now = new Date().toISOString();
        const data = { ...updates, updated_at: now };

        ids.forEach(id => {
            batch.update(col.doc(id), data);
        });
        await batch.commit();

        for (const oldData of oldComics) {
            const changedFields = getChangedFields(oldData, { ...oldData, ...updates });
            if (changedFields.length > 0) {
                const changes = {};
                changedFields.forEach(f => {
                    changes[f] = { old: oldData[f] ?? '', new: updates[f] ?? '' };
                });
                await this.addHistoryEntry({
                    timestamp: now,
                    action: 'update',
                    target: 'collection',
                    itemId: oldData.id,
                    itemTitle: `${oldData.serie || ''} ${oldData.nummer ? '#' + oldData.nummer : ''}`.trim() || oldData.titel || 'Unbekannt',
                    changes
                });
            }
        }
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
            let oldData = null;
            try {
                const oldSnap = await col.doc(id).get();
                if (oldSnap.exists) {
                    oldData = oldSnap.data();
                }
            } catch (err) {
                console.error(err);
            }

            await col.doc(id).set(data, { merge: true });

            if (oldData) {
                const changedFields = getWishlistChangedFields(oldData, data);
                if (changedFields.length > 0) {
                    const changes = {};
                    changedFields.forEach(f => {
                        changes[f] = { old: oldData[f] ?? '', new: data[f] ?? '' };
                    });
                    await this.addHistoryEntry({
                        timestamp: now,
                        action: 'update',
                        target: 'wishlist',
                        itemId: id,
                        itemTitle: data.titel || 'Unbekannter Wunsch',
                        changes
                    });
                }
            }
            return id;
        } else {
            data.created_at = now;
            const ref = await col.add(data);

            await this.addHistoryEntry({
                timestamp: now,
                action: 'create',
                target: 'wishlist',
                itemId: ref.id,
                itemTitle: data.titel || 'Unbekannter Wunsch',
                changes: {}
            });
            return ref.id;
        }
    }

    async deleteWish(id) {
        const col = this.getWishlistCollection();
        if (col) {
            let oldData = null;
            try {
                const oldSnap = await col.doc(id).get();
                if (oldSnap.exists) {
                    oldData = oldSnap.data();
                }
            } catch (err) {
                console.error(err);
            }

            await col.doc(id).delete();

            if (oldData) {
                await this.addHistoryEntry({
                    timestamp: new Date().toISOString(),
                    action: 'delete',
                    target: 'wishlist',
                    itemId: id,
                    itemTitle: oldData.titel || 'Unbekannter Wunsch',
                    changes: {},
                    itemSnapshot: oldData
                });
            }
        }
    }

    getHistoryCollection() {
        const user = getCurrentUser();
        if (!user) return null;
        return dbFirestore.collection('users').doc(user.uid).collection('history');
    }

    async getHistory() {
        const col = this.getHistoryCollection();
        if (!col) return [];
        const snapshot = await col.orderBy('timestamp', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async addHistoryEntry(entry) {
        const col = this.getHistoryCollection();
        if (col) {
            await col.add(entry);
        }
    }

    async clearHistory() {
        const col = this.getHistoryCollection();
        if (!col) return;
        const snapshot = await col.get();
        const batch = dbFirestore.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
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

        const collections = [this.getCollection(), this.getWishlistCollection(), this.getHistoryCollection()];
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
}

export const db = new Database();
