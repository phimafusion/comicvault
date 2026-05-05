import { getCurrentUser } from './auth.js';

// Firebase Firestore initialisieren
const dbFirestore = firebase.firestore();
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

        if (id) {
            await col.doc(id).set(data, { merge: true });
        } else {
            await col.add(data);
        }
    }

    async deleteComic(id) {
        const col = this.getCollection();
        if (col) {
            await col.doc(id).delete();
        }
    }

    getSettings() {
        return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{"theme": "dark"}');
    }

    saveSettings(settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
}

export const db = new Database();
