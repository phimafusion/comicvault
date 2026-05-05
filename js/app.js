import { db } from './db.js';
import { onAuthStateChanged, login, loginWithGoogle, logout } from './auth.js';
import { renderCollection, attachCollectionEvents } from './views/collection.js';
import { renderStats } from './views/stats.js';
import { renderBudget } from './views/budget.js';
import { renderWishlist } from './views/wishlist.js';
import { renderImport } from './views/import.js';
import { openModal } from './views/form.js';

class App {
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
        this.loginForm = document.getElementById('login-form');
        this.btnGoogleLogin = document.getElementById('btn-google-login');
        this.loginError = document.getElementById('login-error');
        
        this.navItems = document.querySelectorAll('.nav-item');
        this.viewContainer = document.getElementById('view-container');
        this.themeToggle = document.getElementById('theme-toggle');
        this.btnAdd = document.getElementById('btn-add-new');
        this.btnLogout = document.getElementById('btn-logout');
        this.searchField = document.getElementById('global-search');
    }

    bindEvents() {
        // Login Event
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            this.loginError.style.display = 'none';
            login(email, password).then(result => {
                if (!result.success) {
                    this.loginError.textContent = "Fehler: " + result.error;
                    this.loginError.style.display = 'block';
                }
            });
        });

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
            });
        });

        this.themeToggle.addEventListener('click', () => this.toggleTheme());

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
            default:
                this.viewContainer.innerHTML = `<h2>${view}</h2><p>Befindet sich im Aufbau...</p>`;
        }
    }

    applyTheme() {
        const settings = db.getSettings();
        document.body.classList.toggle('dark-mode', settings.theme !== 'light');
        this.themeToggle.innerHTML = settings.theme === 'light' 
            ? '<i class="fa-solid fa-sun"></i><span>Light Mode</span>' 
            : '<i class="fa-solid fa-moon"></i><span>Dark Mode</span>';
    }

    toggleTheme() {
        const settings = db.getSettings();
        settings.theme = settings.theme === 'light' ? 'dark' : 'light';
        db.saveSettings(settings);
        this.applyTheme();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
