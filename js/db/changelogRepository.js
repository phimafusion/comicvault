import { getCurrentUser } from '../auth.js';

export const changelogRepository = {
    getCollection() {
        if (typeof dbFirestore === 'undefined') return null;
        const user = getCurrentUser();
        if (!user) return null;
        return dbFirestore.collection('users').doc(user.uid).collection('changelog');
    },

    async getChangelog(limit = 50) {
        const col = this.getCollection();
        if (!col) return [];
        try {
            const snapshot = await col.orderBy('timestamp', 'desc').limit(limit).get();
            const list = [];
            snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            return list;
        } catch (err) {
            console.error('Fehler beim Laden des Changelogs:', err);
            return [];
        }
    },

    async logChange(action, comicData, details = {}) {
        const col = this.getCollection();
        if (!col) return;
        try {
            await col.add({
                action,
                comicId: comicData.id || null,
                comicTitle: comicData.titel || `${comicData.serie || ''} #${comicData.nummer || ''}`.trim(),
                details,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) {
            console.warn('Fehler beim Schreiben des Changelogs:', err);
        }
    }
};
