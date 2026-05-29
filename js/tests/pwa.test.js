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
            // Delete window.mocha temporär, um die SW-Registrierung zu triggern
            delete window.mocha;
            
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
});
