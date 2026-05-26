import { db } from './db.js';
import { onAuthStateChanged, loginWithGoogle, logout } from './auth.js';
import { renderCollection, attachCollectionEvents, cleanupCollection } from './views/collection.js';
import { renderStats, cleanupStats } from './views/stats.js';
import { renderBudget } from './views/budget.js';
import { renderWishlist } from './views/wishlist.js';
import { renderImport } from './views/import.js';
import { renderSettings } from './views/settings.js';
import { renderChangelog } from './views/changelog.js';
import { openModal } from './views/form.js';

export class App {
    constructor() {
        this.currentView = 'collection';
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.applyTheme();
        
        // Firebase Auth Listener
        onAuthStateChanged((user) => {
            if (user) {
                this.showApp();
            } else {
                this.showLogin();
            }
        });
    }

    cacheDOM() {
        this.appContainer = document.getElementById('app-container');
        this.loginScreen = document.getElementById('login-screen');
        this.btnGoogleLogin = document.getElementById('btn-google-login');
        this.loginError = document.getElementById('login-error');
        
        this.navItems = document.querySelectorAll('.nav-item');
        this.viewContainer = document.getElementById('view-container');
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeSelect = document.getElementById('theme-select');
        this.btnAdd = document.getElementById('btn-add-new');
        this.btnLogout = document.getElementById('btn-logout');
        this.searchField = document.getElementById('global-search');
        this.btnMenuToggle = document.getElementById('btn-menu-toggle');
        this.sidebarOverlay = document.getElementById('sidebar-overlay');
        this.sidebar = document.querySelector('.sidebar');
    }

    bindEvents() {
        // Google Login Event
        this.btnGoogleLogin.addEventListener('click', () => {
            this.loginError.style.display = 'none';
            loginWithGoogle().then(result => {
                if (!result.success) {
                    this.loginError.textContent = "Fehler: " + result.error;
                    this.loginError.style.display = 'block';
                }
            });
        });

        // Logout Event
        this.btnLogout.addEventListener('click', () => logout());

        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                if (view) this.navigate(view);
                
                // Close sidebar on mobile navigation
                if (this.sidebar) this.sidebar.classList.remove('open');
                if (this.sidebarOverlay) this.sidebarOverlay.classList.remove('open');
            });
        });

        if (this.btnMenuToggle) {
            this.btnMenuToggle.addEventListener('click', () => {
                if (this.sidebar) this.sidebar.classList.toggle('open');
                if (this.sidebarOverlay) this.sidebarOverlay.classList.toggle('open');
            });
        }

        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', () => {
                if (this.sidebar) this.sidebar.classList.remove('open');
                if (this.sidebarOverlay) this.sidebarOverlay.classList.remove('open');
            });
        }

        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        if (this.themeSelect) {
            this.themeSelect.addEventListener('change', (e) => this.setColorScheme(e.target.value));
        }

        this.btnAdd.addEventListener('click', () => {
            openModal();
        });

        this.searchField.addEventListener('input', (e) => {
            if (this.currentView !== 'collection') {
                this.navigate('collection');
            }
            const event = new CustomEvent('global-search', { detail: { query: e.target.value } });
            document.dispatchEvent(event);
        });
    }

    showApp() {
        this.loginScreen.style.display = 'none';
        this.appContainer.style.display = 'flex';
        this.navigate('collection');
    }

    showLogin() {
        this.appContainer.style.display = 'none';
        this.loginScreen.style.display = 'flex';
    }

    navigate(view) {
        // Clean up previous view before navigating
        if (this.currentView === 'collection') {
            cleanupCollection();
        } else if (this.currentView === 'stats') {
            cleanupStats();
        }

        this.currentView = view;
        
        this.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        this.viewContainer.innerHTML = '<div style="display:flex; justify-content:center; padding:50px;"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>';
        
        switch (view) {
            case 'collection':
                renderCollection(this.viewContainer);
                attachCollectionEvents();
                break;
            case 'stats':
                renderStats(this.viewContainer);
                break;
            case 'budget':
                renderBudget(this.viewContainer);
                break;
            case 'wishlist':
                renderWishlist(this.viewContainer);
                break;
            case 'import':
                renderImport(this.viewContainer);
                break;
            case 'settings':
                renderSettings(this.viewContainer);
                break;
            case 'changelog':
                renderChangelog(this.viewContainer);
                break;
            default:
                this.viewContainer.innerHTML = `<h2>${view}</h2><p>Befindet sich im Aufbau...</p>`;
        }
    }

    applyTheme() {
        const settings = db.getSettings();
        
        // Light/Dark Mode
        document.body.classList.toggle('dark-mode', settings.theme !== 'light');
        this.themeToggle.innerHTML = settings.theme === 'light' 
            ? '<i class="fa-solid fa-sun"></i><span>Light Mode</span>' 
            : '<i class="fa-solid fa-moon"></i><span>Dark Mode</span>';
            
        // Color Scheme
        const colorScheme = settings.colorScheme || 'default';
        document.body.setAttribute('data-theme', colorScheme);
        if (this.themeSelect) {
            this.themeSelect.value = colorScheme;
        }
    }

    toggleTheme() {
        const settings = db.getSettings();
        settings.theme = settings.theme === 'light' ? 'dark' : 'light';
        db.saveSettings(settings);
        this.applyTheme();
    }

    setColorScheme(scheme) {
        const settings = db.getSettings();
        settings.colorScheme = scheme;
        db.saveSettings(settings);
        this.applyTheme();
    }
}

if (typeof window !== 'undefined' && !window.mocha) {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new App();
    });
}
