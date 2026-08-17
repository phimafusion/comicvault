import { getCurrentUser } from '../auth.js';

const SETTINGS_KEY = 'comicvault_settings';
const DEFAULT_SETTINGS = {
    monthlyBudget: 50.00,
    theme: 'dark'
};

export const settingsRepository = {
    getFirestoreDoc() {
        if (typeof dbFirestore === 'undefined') return null;
        const user = getCurrentUser();
        if (!user) return null;
        return dbFirestore.collection('users').doc(user.uid).collection('settings').doc('general');
    },

    getSettings() {
        const data = localStorage.getItem(SETTINGS_KEY);
        if (!data) return { ...DEFAULT_SETTINGS };
        try {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
        } catch (e) {
            return { ...DEFAULT_SETTINGS };
        }
    },

    async saveSettings(settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
            } else {
                const localSettings = this.getSettings();
                await doc.set(localSettings);
            }
        } catch (err) {
            console.warn('Fehler beim Synchronisieren der Einstellungen aus Firestore:', err);
        }
    }
};
