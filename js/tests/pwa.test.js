import { setupTestEnv, cleanup } from './testHelper.js';

const { expect } = chai;

describe('PWA (Progressive Web App) Integration Tests', () => {
    let testEnv;
    let appInstance;

    beforeEach(() => {
        testEnv = setupTestEnv();
        appInstance = testEnv.appInstance;
    });

    afterEach(() => {
        cleanup();
    });

    it('sollte manifest.json in index.html verlinkt haben', async () => {
        const response = await fetch('./index.html');
        expect(response.ok).to.be.true;
        const htmlText = await response.text();
        
        // Parsen der HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        
        const manifestLink = doc.querySelector('link[rel="manifest"]');
        expect(manifestLink).to.not.be.null;
        expect(manifestLink.getAttribute('href')).to.equal('manifest.json');
    });

    it('sollte ein meta-Tag fuer die Theme-Farbe in index.html haben', async () => {
        const response = await fetch('./index.html');
        expect(response.ok).to.be.true;
        const htmlText = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        
        const themeMeta = doc.querySelector('meta[name="theme-color"]');
        expect(themeMeta).to.not.be.null;
        expect(themeMeta.getAttribute('content')).to.equal('#6d28d9');
    });

    it('sollte eine valide manifest.json Datei bereitstellen', async () => {
        const response = await fetch('./manifest.json');
        expect(response.ok).to.be.true;
        
        const manifest = await response.json();
        
        expect(manifest.name).to.equal('ComicVault');
        expect(manifest.short_name).to.equal('ComicVault');
        expect(manifest.display).to.equal('standalone');
        expect(manifest.start_url).to.equal('./index.html');
        expect(manifest.background_color).to.equal('#0f172a');
        expect(manifest.theme_color).to.equal('#6d28d9');
        expect(manifest.icons).to.be.an('array').that.is.not.empty;
        
        // Prüfen, ob die referenzierten Icons vorhanden sind
        const hasFavicon = manifest.icons.some(icon => icon.src.includes('favicon.png'));
        const hasLogo = manifest.icons.some(icon => icon.src.includes('comicvault_logo.png'));
        expect(hasFavicon || hasLogo).to.be.true;
    });

    it('sollte den Service Worker registrieren, wenn "serviceWorker" in navigator vorhanden ist', async () => {
        let registerCalled = false;
        let registeredScript = '';
        
        // Mock Navigator.prototype.serviceWorker via getter
        const swMock = {
            register: (script) => {
                registerCalled = true;
                registeredScript = script;
                return Promise.resolve({ scope: './' });
            }
        };
        
        const originalDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'serviceWorker');
        
        Object.defineProperty(Navigator.prototype, 'serviceWorker', {
            get() { return swMock; },
            configurable: true
        });
        
        const originalMocha = window.mocha;
        
        try {
            // Set window.mocha to undefined temporarily to trigger SW registration
            window.mocha = undefined;
            
            // Registrierung aufrufen
            appInstance.registerServiceWorker();
            
            // Wenn das Dokument bereits geladen ist, wird die Registrierung sofort ausgeführt
            if (document.readyState === 'complete') {
                expect(registerCalled).to.be.true;
                expect(registeredScript).to.equal('./sw.js');
            } else {
                // Ansonsten feuern wir das load Event
                window.dispatchEvent(new Event('load'));
                expect(registerCalled).to.be.true;
                expect(registeredScript).to.equal('./sw.js');
            }
        } finally {
            // Original-Zustand wiederherstellen
            if (originalDescriptor) {
                Object.defineProperty(Navigator.prototype, 'serviceWorker', originalDescriptor);
            } else {
                delete Navigator.prototype.serviceWorker;
            }
            window.mocha = originalMocha;
        }
    });

    it('sollte den Service Worker NICHT registrieren, wenn window.mocha definiert ist', () => {
        let registerCalled = false;

        const swMock = {
            register: () => {
                registerCalled = true;
                return Promise.resolve({});
            }
        };

        const originalDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'serviceWorker');

        Object.defineProperty(Navigator.prototype, 'serviceWorker', {
            get() { return swMock; },
            configurable: true
        });

        try {
            // registerServiceWorker aufrufen ohne window.mocha zu löschen (ist hier aktiv)
            appInstance.registerServiceWorker();
            window.dispatchEvent(new Event('load'));
            
            expect(registerCalled).to.be.false;
        } finally {
            if (originalDescriptor) {
                Object.defineProperty(Navigator.prototype, 'serviceWorker', originalDescriptor);
            } else {
                delete Navigator.prototype.serviceWorker;
            }
        }
    });

    it('sollte den meta-Tag fuer theme-color dynamisch anpassen, wenn das Theme gewechselt wird', (done) => {
        let themeMeta = document.querySelector('meta[name="theme-color"]');
        let createdMeta = false;
        if (!themeMeta) {
            themeMeta = document.createElement('meta');
            themeMeta.name = 'theme-color';
            themeMeta.content = '#6d28d9';
            document.head.appendChild(themeMeta);
            createdMeta = true;
        }
        
        // Mock CSS Variable --bg-surface am body setzen
        const originalBg = document.body.style.getPropertyValue('--bg-surface');
        document.body.style.setProperty('--bg-surface', '#112233');
        
        appInstance.applyTheme();
        
        setTimeout(() => {
            try {
                expect(themeMeta.getAttribute('content')).to.equal('#112233');
                done();
            } catch (err) {
                done(err);
            } finally {
                if (originalBg) {
                    document.body.style.setProperty('--bg-surface', originalBg);
                } else {
                    document.body.style.removeProperty('--bg-surface');
                }
                if (createdMeta) {
                    themeMeta.remove();
                }
            }
        }, 100);
    });

    it('sollte einen Update-Toast anzeigen und auf Klick neu laden', () => {
        let reloadCalled = false;
        const originalReload = appInstance.reloadPage;
        
        // stub reloadPage
        appInstance.reloadPage = () => {
            reloadCalled = true;
        };
        
        try {
            appInstance.showUpdateToast();
            
            const toast = document.getElementById('pwa-update-toast');
            expect(toast).to.not.be.null;
            expect(toast.classList.contains('pwa-toast')).to.be.true;
            
            const btn = document.getElementById('btn-pwa-update-reload');
            expect(btn).to.not.be.null;
            
            btn.click();
            expect(reloadCalled).to.be.true;
            
            toast.remove();
        } finally {
            appInstance.reloadPage = originalReload;
        }
    });

    it('sollte die PWA-Installationskarte in den Einstellungen anzeigen, wenn deferredPrompt verfuegbar ist', async () => {
        let promptCalled = false;
        const mockPromptEvent = {
            prompt: () => { promptCalled = true; },
            userChoice: Promise.resolve({ outcome: 'accepted' })
        };
        window.deferredPrompt = mockPromptEvent;
        
        const container = document.createElement('div');
        container.id = 'test-settings-container';
        document.body.appendChild(container);
        
        try {
            const { renderSettings } = await import('../views/settings.js');
            renderSettings(container);
            
            const installCard = container.querySelector('#pwa-install-card');
            expect(installCard).to.not.be.null;
            expect(installCard.style.display).to.equal('flex');
            
            const installBtn = container.querySelector('#btn-pwa-install');
            expect(installBtn).to.not.be.null;
            
            await installBtn.click();
            expect(promptCalled).to.be.true;
            expect(window.deferredPrompt).to.be.null;
            expect(installCard.style.display).to.equal('none');
        } finally {
            container.remove();
            window.deferredPrompt = null;
        }
    });
});
