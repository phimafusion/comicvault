import { db } from './db.js';
import { onAuthStateChanged, loginWithGoogle, logout } from './auth.js';
import { renderCollection, attachCollectionEvents, cleanupCollection } from './views/collection.js';
import { renderStats, cleanupStats } from './views/stats.js';
import { renderBudget } from './views/budget.js';
import { renderWishlist, cleanupWishlist } from './views/wishlist.js';
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
        this.initMobileView();
        this.registerServiceWorker();
        
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
        this.btnReload = document.getElementById('btn-reload-subpage');
        this.themeSelect = document.getElementById('theme-select');
        this.btnMobileToggle = document.getElementById('btn-mobile-toggle');
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
        
        if (this.btnReload) {
            this.btnReload.addEventListener('click', async () => {
                const icon = this.btnReload.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-spin');
                }
                
                db.clearCache();
                
                try {
                    // Service Worker Caches löschen
                    if ('caches' in window) {
                        const keys = await caches.keys();
                        await Promise.all(keys.map(key => caches.delete(key)));
                    }
                    // Service Worker deinstallieren
                    if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        await Promise.all(registrations.map(reg => reg.unregister()));
                    }
                } catch (err) {
                    console.warn('Fehler beim Löschen des Caches / Service Workers:', err);
                }
                
                // Kurze Verzögerung für die visuelle Rückmeldung der Drehanimation vor dem Reload
                setTimeout(() => {
                    window.location.reload();
                }, 300);
            });
        }
        
        if (this.themeSelect) {
            this.themeSelect.addEventListener('change', (e) => this.setColorScheme(e.target.value));
        }

        if (this.btnMobileToggle) {
            this.btnMobileToggle.addEventListener('click', () => this.toggleMobileView());
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
        const savedView = sessionStorage.getItem('comicvault_current_view') || 'collection';
        this.navigate(savedView);
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
        } else if (this.currentView === 'wishlist') {
            cleanupWishlist();
        }

        this.currentView = view;
        sessionStorage.setItem('comicvault_current_view', view);
        
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

        // Clean previous font overrides
        const fontVars = ['--font-primary', '--font-display', '--font-typewriter', '--font-code'];
        fontVars.forEach(v => document.documentElement.style.removeProperty(v));

        // Apply customized theme fonts
        if (settings.themeFonts && settings.themeFonts[colorScheme]) {
            const fonts = settings.themeFonts[colorScheme];
            for (const [varName, fontVal] of Object.entries(fonts)) {
                if (fontVal) {
                    document.documentElement.style.setProperty(varName, fontVal);
                }
            }
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

    initMobileView() {
        this.checkMobileView();
        
        // Listen to window resizing to update mobile view class dynamically if not forced
        window.addEventListener('resize', () => {
            const isForced = localStorage.getItem('comicvault_force_mobile') === 'true';
            if (!isForced) {
                this.checkMobileView();
            }
        });
    }

    checkMobileView() {
        const isForced = localStorage.getItem('comicvault_force_mobile') === 'true';
        const isMobileScreen = window.matchMedia('(max-width: 768px)').matches;
        
        const isMobileView = isForced || isMobileScreen;
        document.body.classList.toggle('mobile-view', isMobileView);
        
        if (this.btnMobileToggle) {
            this.btnMobileToggle.classList.toggle('active', isForced);
            const icon = this.btnMobileToggle.querySelector('i');
            if (icon) {
                icon.className = isForced 
                    ? 'fa-solid fa-desktop' 
                    : 'fa-solid fa-mobile-screen-button';
            }
            this.btnMobileToggle.title = isForced 
                ? 'Standardansicht erzwingen' 
                : 'Mobilansicht erzwingen';
        }
    }

    toggleMobileView() {
        const isCurrentlyForced = localStorage.getItem('comicvault_force_mobile') === 'true';
        if (isCurrentlyForced) {
            localStorage.removeItem('comicvault_force_mobile');
        } else {
            localStorage.setItem('comicvault_force_mobile', 'true');
        }
        this.checkMobileView();
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator && !window.mocha) {
            const register = () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => console.log('ServiceWorker registered:', reg))
                    .catch(err => console.warn('ServiceWorker registration failed:', err));
            };

            if (document.readyState === 'complete') {
                register();
            } else {
                window.addEventListener('load', register);
            }
        }
    }
}

if (typeof window !== 'undefined' && !window.mocha) {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new App();
    });
}
