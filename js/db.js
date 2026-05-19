import { getCurrentUser } from './auth.js';

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
            await col.doc(id).set(data, { merge: true });
            return id;
        } else {
            data.created_at = now;
            const ref = await col.add(data);
            return ref.id;
        }
    }

    async deleteComic(id) {
        const col = this.getCollection();
        if (col) {
            await col.doc(id).delete();
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
}

export const db = new Database();
