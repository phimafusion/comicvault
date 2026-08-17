import { getCurrentUser } from '../auth.js';

let wishlistCache = null;

export const wishlistRepository = {
    getFirestoreCollection() {
        if (typeof dbFirestore === 'undefined') return null;
        const user = getCurrentUser();
        if (!user) return null;
        return dbFirestore.collection('users').doc(user.uid).collection('wishlist');
    },

    invalidateCache() {
        wishlistCache = null;
    },

    async getWishlist(options = { forceServer: false }) {
        if (wishlistCache && !options.forceServer) {
            return [...wishlistCache];
        }

        const collection = this.getFirestoreCollection();
        if (!collection) {
            wishlistCache = [];
            return [];
        }

        try {
            const snapshot = await collection.get();
            const wishes = [];
            snapshot.forEach(doc => {
                wishes.push({ id: doc.id, ...doc.data() });
            });

            wishes.sort((a, b) => {
                const titleA = (a.titel || a.serie || '').toLowerCase();
                const titleB = (b.titel || b.serie || '').toLowerCase();
                return titleA.localeCompare(titleB);
            });

            wishlistCache = wishes;
            return [...wishlistCache];
        } catch (err) {
            console.error('Fehler beim Laden der Wunschliste aus Firestore:', err);
            return wishlistCache ? [...wishlistCache] : [];
        }
    },

    async getWish(id) {
        const wishes = await this.getWishlist();
        return wishes.find(w => w.id === id) || null;
    },

    async saveWish(wishData) {
        const collection = this.getFirestoreCollection();
        if (!collection) throw new Error('Nicht angemeldet');

        const cleanData = { ...wishData };
        delete cleanData.id;
        delete cleanData._importUsedTemp;

        if (wishData.id) {
            await collection.doc(wishData.id).set(cleanData, { merge: true });
            this.invalidateCache();
            return wishData.id;
        } else {
            cleanData.created_at = new Date().toISOString();
            const docRef = await collection.add(cleanData);
            this.invalidateCache();
            return docRef.id;
        }
    },

    async deleteWish(id) {
        const collection = this.getFirestoreCollection();
        if (!collection) throw new Error('Nicht angemeldet');
        await collection.doc(id).delete();
        this.invalidateCache();
    },

    async clearWishlist() {
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
