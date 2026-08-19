import { getCurrentUser } from '../auth.js';
import { storageService, STORAGE_KEYS } from '../services/storageService.js';

const DEFAULT_SETTINGS = {
    monthlyBudget: 50.00,
    theme: 'dark',
    testsuiteMode: 'console'
};

export const settingsRepository = {
    getFirestoreDoc() {
        if (typeof dbFirestore === 'undefined') return null;
        const user = getCurrentUser();
        if (!user) return null;
        return dbFirestore.collection('users').doc(user.uid).collection('settings').doc('general');
    },

    getSettings() {
        const data = storageService.getItem(STORAGE_KEYS.SETTINGS);
        if (!data) return { ...DEFAULT_SETTINGS };
        return { ...DEFAULT_SETTINGS, ...data };
    },

    async saveSettings(settings) {
        storageService.setItem(STORAGE_KEYS.SETTINGS, settings);
        const doc = this.getFirestoreDoc();
        if (doc) {
            try {
                await doc.set(settings, { merge: true });
            } catch (err) {
                console.warn('Fehler beim Speichern der Einstellungen in Firestore:', err);
            }
        }
    },

    async syncSettingsFromFirestore() {
        const doc = this.getFirestoreDoc();
        if (!doc) return;
        try {
            const snapshot = await doc.get();
            if (snapshot.exists) {
                const remoteSettings = snapshot.data();
                const localSettings = this.getSettings();
                const merged = { ...localSettings, ...remoteSettings };
                storageService.setItem(STORAGE_KEYS.SETTINGS, merged);
            } else {
                const localSettings = this.getSettings();
                await doc.set(localSettings);
            }
        } catch (err) {
            console.warn('Fehler beim Synchronisieren der Einstellungen aus Firestore:', err);
        }
    }
};
