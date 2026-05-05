import { firebaseConfig } from './firebase-config.js';

// Firebase initialisieren (Compat Modus)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

export const login = async (email, password) => {
    try {
        // Wir versuchen uns anzumelden, wenn der User nicht existiert, registrieren wir ihn (vereinfacht für den Start)
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                await auth.createUserWithEmailAndPassword(email, password);
            } else {
                throw error;
            }
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const logout = () => auth.signOut();

export const loginWithGoogle = async () => {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
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
