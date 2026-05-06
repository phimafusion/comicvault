import { firebaseConfig } from './firebase-config.js';

// Firebase initialisieren (Compat Modus)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

export const logout = () => auth.signOut();

export const loginWithGoogle = async () => {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        // Redirect ist stabiler als Popup auf gehosteten Seiten
        await auth.signInWithRedirect(provider);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const onAuthStateChanged = (callback) => {
    auth.onAuthStateChanged(callback);
};

export const getCurrentUser = () => auth.currentUser;
