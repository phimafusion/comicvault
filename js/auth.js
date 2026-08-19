import { firebaseConfig } from './firebase-config.js';
import { storageService, STORAGE_KEYS } from './services/storageService.js';

// Firebase initialisieren (Compat Modus)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

let mockUser = null;
let authCallback = null;

const checkUrlForMock = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mock') === 'true' || storageService.getString(STORAGE_KEYS.MOCK_MODE) === 'true') {
        setMockMode(true);
    }
};

export const setMockMode = (active) => {
    if (active) {
        storageService.setString(STORAGE_KEYS.MOCK_MODE, 'true');
        mockUser = {
            uid: 'mock-user-123',
            displayName: 'Mock User',
            email: 'mock@example.com',
            photoURL: ''
        };
        if (authCallback) authCallback(mockUser);
    } else {
        storageService.removeItem(STORAGE_KEYS.MOCK_MODE);
        mockUser = null;
        if (authCallback) authCallback(auth.currentUser);
    }
};

export const logout = () => {
    if (mockUser) {
        setMockMode(false);
        return Promise.resolve();
    }
    return auth.signOut();
};

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
    authCallback = callback;
    auth.onAuthStateChanged((user) => {
        if (mockUser) {
            callback(mockUser);
        } else {
            callback(user);
        }
    });
};

export const getCurrentUser = () => mockUser || auth.currentUser;

checkUrlForMock();
