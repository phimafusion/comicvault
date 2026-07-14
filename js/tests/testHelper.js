import { App } from '../app.js';
import { db } from '../db.js';

let backups = {};
let container = null;
let savedSettings = null;
let mockWishes = [];
let mockComics = [];
let mockSubscriptions = [];

const defaultSettings = {
    theme: 'dark',
    colorScheme: 'default',
    themeFonts: {},
    customSuggestions: {
        typ: [],
        format: [],
        zustand: [],
        bestand: []
    }
};

/**
 * Sets up a clean test environment with mocked firebase auth, database, and navigation.
 * 
 * @param {Object} options Configuration options
 * @param {Object} [options.settings] Custom settings override
 * @param {Array} [options.mockWishes] Initial wishes array
 * @param {Array} [options.mockComics] Initial comics array
 * @param {Function} [options.navigate] Custom navigation function override
 * @returns {Object} References to environment elements and state helpers
 */
export function setupTestEnv(options = {}) {
    // 1. Backup original functions if not already backed up
    if (!backups.auth) backups.auth = firebase.auth;
    if (!backups.getSettings) backups.getSettings = db.getSettings;
    if (!backups.saveSettings) backups.saveSettings = db.saveSettings;
    if (!backups.getAllComics) backups.getAllComics = db.getAllComics;
    if (!backups.getWishlist) backups.getWishlist = db.getWishlist;
    if (!backups.saveWish) backups.saveWish = db.saveWish;
    if (!backups.deleteWish) backups.deleteWish = db.deleteWish;
    if (!backups.saveComic) backups.saveComic = db.saveComic;
    if (!backups.updateComics) backups.updateComics = db.updateComics;
    if (!backups.deleteComics) backups.deleteComics = db.deleteComics;
    if (!backups.getSubscriptions) backups.getSubscriptions = db.getSubscriptions;
    if (!backups.saveSubscription) backups.saveSubscription = db.saveSubscription;
    if (!backups.deleteSubscription) backups.deleteSubscription = db.deleteSubscription;
    if (!backups.clearDatabase) backups.clearDatabase = db.clearDatabase;
    if (!backups.clearAllData) backups.clearAllData = db.clearAllData;
    if (!backups.navigate) backups.navigate = App.prototype.navigate;

    // 2. Setup standard settings mock
    savedSettings = options.settings || JSON.parse(JSON.stringify(defaultSettings));
    db.getSettings = () => JSON.parse(JSON.stringify(savedSettings));
    db.saveSettings = (newSettings) => {
        savedSettings = newSettings;
    };

    // 3. Mock Auth
    firebase.auth = () => ({
        onAuthStateChanged: (callback) => {
            callback({ uid: 'mock-user-id' });
        },
        currentUser: { uid: 'mock-user-id' }
    });

    // 4. Mock DB data fetching/mutating
    mockWishes = options.mockWishes || [];
    mockComics = options.mockComics || [];
    mockSubscriptions = options.mockSubscriptions || [];
    
    let lastUpdateComicsCall = null;
    let lastDeleteComicsCall = null;
    let lastClearDatabaseCall = false;

    db.getWishlist = async () => [...mockWishes];
    db.getAllComics = async () => [...mockComics];
    db.getSubscriptions = async () => [...mockSubscriptions];

    db.saveWish = async (wish) => {
        const index = mockWishes.findIndex(w => w.id === wish.id);
        if (index !== -1) {
            mockWishes[index] = { ...mockWishes[index], ...wish };
        } else {
            mockWishes.push({ id: wish.id || 'mock-' + Math.random(), ...wish });
        }
    };
    db.deleteWish = async (id) => {
        const index = mockWishes.findIndex(w => w.id === id);
        if (index !== -1) {
            mockWishes.splice(index, 1);
        }
    };
    db.saveComic = async (comic) => {
        mockComics.push(comic);
        return comic.id || 'comic-' + Math.random();
    };
    db.updateComics = async (ids, updates) => {
        lastUpdateComicsCall = { ids, updates };
        ids.forEach(id => {
            const comic = mockComics.find(c => c.id === id);
            if (comic) {
                Object.assign(comic, updates);
            }
        });
    };
    db.deleteComics = async (ids) => {
        lastDeleteComicsCall = ids;
        ids.forEach(id => {
            const index = mockComics.findIndex(c => c.id === id);
            if (index !== -1) {
                mockComics.splice(index, 1);
            }
        });
    };
    db.saveSubscription = async (sub) => {
        const index = mockSubscriptions.findIndex(s => s.id === sub.id);
        if (index !== -1) {
            mockSubscriptions[index] = { ...mockSubscriptions[index], ...sub };
        } else {
            mockSubscriptions.push({ id: sub.id || 'mock-sub-' + Math.random(), ...sub });
        }
    };
    db.deleteSubscription = async (id) => {
        const index = mockSubscriptions.findIndex(s => s.id === id);
        if (index !== -1) {
            mockSubscriptions.splice(index, 1);
        }
    };
    db.clearDatabase = async () => {
        lastClearDatabaseCall = true;
        mockComics.splice(0, mockComics.length);
        mockWishes.splice(0, mockWishes.length);
        mockSubscriptions.splice(0, mockSubscriptions.length);
    };
    db.clearAllData = async () => {
        return db.clearDatabase();
    };

    // 5. Override App.prototype.navigate to prevent real loading unless specified
    if (options.navigate) {
        App.prototype.navigate = options.navigate;
    } else {
        App.prototype.navigate = () => {};
    }

    // 6. Set up DOM container
    container = document.createElement('div');
    container.id = 'test-environment-container';
    container.innerHTML = `
        <div id="login-screen" style="display:none;">
            <button id="btn-google-login"></button>
            <div id="login-error"></div>
        </div>
        <div id="app-container" style="display:none;">
            <aside class="sidebar">
                <button class="nav-item" data-view="collection">Collection</button>
                <button class="nav-item" data-view="settings">Settings</button>
                <button id="theme-toggle"></button>
                <button id="btn-reload-subpage"></button>
                <button id="btn-logout"></button>
            </aside>
            <div id="sidebar-overlay"></div>
            <main class="main-content">
                <header class="top-header">
                    <button id="btn-menu-toggle"></button>
                    <input type="text" id="global-search">
                    <select id="theme-select"></select>
                    <button id="btn-mobile-toggle"></button>
                    <button id="btn-add-new"></button>
                </header>
                <div id="view-container"></div>
            </main>
        </div>
    `;
    document.body.appendChild(container);

    // 7. Clear root font variables
    const fontVars = ['--font-primary', '--font-display', '--font-typewriter', '--font-code'];
    fontVars.forEach(v => document.body.style.removeProperty(v));

    // 8. Instantiate App and attach to window
    window.app = new App();

    return {
        container,
        viewContainer: container.querySelector('#view-container'),
        appInstance: window.app,
        getSavedSettings: () => savedSettings,
        setSavedSettings: (s) => { savedSettings = s; },
        getMockWishes: () => mockWishes,
        setMockWishes: (w) => { mockWishes = w; },
        getMockComics: () => mockComics,
        setMockComics: (c) => { mockComics = c; },
        getLastUpdateComicsCall: () => lastUpdateComicsCall,
        getLastDeleteComicsCall: () => lastDeleteComicsCall,
        getLastClearDatabaseCall: () => lastClearDatabaseCall,
        resetCalls: () => {
            lastUpdateComicsCall = null;
            lastDeleteComicsCall = null;
            lastClearDatabaseCall = false;
        }
    };
}

/**
 * Restores original function definitions and cleans up any modifications made to the DOM.
 */
export function cleanup() {
    // 1. Restore original functions
    if (backups.auth) firebase.auth = backups.auth;
    if (backups.getSettings) db.getSettings = backups.getSettings;
    if (backups.saveSettings) db.saveSettings = backups.saveSettings;
    if (backups.getAllComics) db.getAllComics = backups.getAllComics;
    if (backups.getWishlist) db.getWishlist = backups.getWishlist;
    if (backups.saveWish) db.saveWish = backups.saveWish;
    if (backups.deleteWish) db.deleteWish = backups.deleteWish;
    if (backups.saveComic) db.saveComic = backups.saveComic;
    if (backups.updateComics) db.updateComics = backups.updateComics;
    if (backups.deleteComics) db.deleteComics = backups.deleteComics;
    if (backups.getSubscriptions) db.getSubscriptions = backups.getSubscriptions;
    if (backups.saveSubscription) db.saveSubscription = backups.saveSubscription;
    if (backups.deleteSubscription) db.deleteSubscription = backups.deleteSubscription;
    if (backups.clearDatabase) db.clearDatabase = backups.clearDatabase;
    if (backups.clearAllData) db.clearAllData = backups.clearAllData;
    if (backups.navigate) App.prototype.navigate = backups.navigate;
    backups = {};

    // 2. Remove DOM container
    if (container) {
        container.remove();
        container = null;
    }

    // 3. Clear window app instance
    window.app = null;

    // 4. Remove floating widgets and leaked DOM components
    const idsToRemove = [
        'wishlist-bulk-bar',
        'db-clear-confirm-modal',
        'bulk-action-bar',
        'bulk-delete-confirm-modal'
    ];
    idsToRemove.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });

    // 5. Reset statically defined modals if they exist
    const modal = document.getElementById('comic-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.opacity = '0';
    }

    // 6. Clean up root style properties and body classes
    document.body.classList.remove('bulk-select-active');
    document.body.classList.remove('mobile-view');
    const fontVars = ['--font-primary', '--font-display', '--font-typewriter', '--font-code'];
    fontVars.forEach(v => document.body.style.removeProperty(v));
}

/**
 * Resolves a promise after a delay (default 0ms), allowing the browser event loop to process micro/macro tasks.
 * 
 * @param {number} [ms=0] Delay in milliseconds
 * @returns {Promise<void>}
 */
export function tick(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

