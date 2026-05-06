import { firebaseConfig } from './firebase-config.js';

// Firebase initialisieren (Compat Modus)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

export const logout = () => auth.signOut();

export const loginWithGoogle = async () => {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        // Popup ist kompatibler mit Firefox und Drittanbieter-Cookie-Blockern
        await auth.signInWithPopup(provider);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const onAuthStateChanged = (callback) => {
    auth.onAuthStateChanged(callback);
};

export const getCurrentUser = () => auth.currentUser;
