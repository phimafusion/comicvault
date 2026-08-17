import { getCurrentUser } from '../auth.js';

let comicsCache = null;

export const comicRepository = {
    getFirestoreCollection() {
        if (typeof dbFirestore === 'undefined') return null;
        const user = getCurrentUser();
        if (!user) return null;
        return dbFirestore.collection('users').doc(user.uid).collection('comics');
    },

    invalidateCache() {
        comicsCache = null;
    },

    async getAllComics(options = { forceServer: false }) {
        if (comicsCache && !options.forceServer) {
            return [...comicsCache];
        }

        const collection = this.getFirestoreCollection();
        if (!collection) {
            comicsCache = [];
            return [];
        }

        try {
            const snapshot = await collection.orderBy('serie').get();
            const comics = [];
            snapshot.forEach(doc => {
                comics.push({ id: doc.id, ...doc.data() });
            });

            comics.sort((a, b) => {
                const serieA = (a.serie || '').toLowerCase();
                const serieB = (b.serie || '').toLowerCase();
                if (serieA !== serieB) return serieA.localeCompare(serieB);
                return (a.nummer || 0) - (b.nummer || 0);
            });

            comicsCache = comics;
            return [...comicsCache];
        } catch (err) {
            console.error('Fehler beim Laden der Comics aus Firestore:', err);
            return comicsCache ? [...comicsCache] : [];
        }
    },

    async getComic(id) {
        const comics = await this.getAllComics();
        return comics.find(c => c.id === id) || null;
    },

    async saveComic(comicData) {
        const collection = this.getFirestoreCollection();
        if (!collection) throw new Error('Nicht angemeldet');

        const cleanData = { ...comicData };
        delete cleanData.id;
        delete cleanData._importUsedTemp;

        if (comicData.id) {
            await collection.doc(comicData.id).set(cleanData, { merge: true });
            this.invalidateCache();
            return comicData.id;
        } else {
            cleanData.created_at = new Date().toISOString();
            const docRef = await collection.add(cleanData);
            this.invalidateCache();
            return docRef.id;
        }
    },

    async deleteComic(id) {
        const collection = this.getFirestoreCollection();
        if (!collection) throw new Error('Nicht angemeldet');
        await collection.doc(id).delete();
        this.invalidateCache();
    },

    async clearAllComics() {
        const collection = this.getFirestoreCollection();
        if (!collection) return;
        const snapshot = await collection.get();
        const batch = dbFirestore.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        this.invalidateCache();
    }
};
