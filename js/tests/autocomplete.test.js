import { initAutocomplete } from '../components/autocomplete.js';
import { renderSettings } from '../views/settings.js';
import { setupTestEnv, cleanup, tick } from './testHelper.js';
import { db } from '../db.js';

const { expect } = chai;

describe('Autocomplete Feature Tests', () => {
    let container;
    let input;
    let suggestions;

    beforeEach(() => {
        // Setup mock form container and input inside a form-group
        container = document.createElement('div');
        container.style.position = 'relative';
        
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        formGroup.style.position = 'relative';

        input = document.createElement('input');
        input.type = 'text';
        input.name = 'verlag';
        input.className = 'form-control';

        formGroup.appendChild(input);
        container.appendChild(formGroup);
        document.body.appendChild(container);

        suggestions = ['Panini', 'Carlsen', 'Splitter', 'Egmont', 'Marvel', 'DC'];
        initAutocomplete(input, suggestions);
    });

    afterEach(() => {
        if (container) {
            container.remove();
        }
    });

    it('sollte das native Browser-Autocomplete deaktivieren', () => {
        expect(input.getAttribute('autocomplete')).to.equal('off');
    });

    it('sollte alle Vorschläge anzeigen, wenn das Feld leer ist', () => {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        const dropdown = container.querySelector('.autocomplete-dropdown');
        expect(dropdown).to.not.be.null;

        const items = dropdown.querySelectorAll('.autocomplete-item');
        expect(items.length).to.equal(6);
    });

    it('sollte Vorschläge filtern und anzeigen, wenn getippt wird', () => {
        input.value = 'Pa';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        const dropdown = container.querySelector('.autocomplete-dropdown');
        expect(dropdown).to.not.be.null;

        const items = dropdown.querySelectorAll('.autocomplete-item');
        expect(items.length).to.equal(1);
        expect(items[0].textContent).to.equal('Panini');
    });

    it('sollte Groß-/Kleinschreibung ignorieren beim Filtern', () => {
        input.value = 'marvel';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        const dropdown = container.querySelector('.autocomplete-dropdown');
        expect(dropdown).to.not.be.null;

        const items = dropdown.querySelectorAll('.autocomplete-item');
        expect(items.length).to.equal(1);
        expect(items[0].textContent).to.equal('Marvel');
    });

    it('sollte Vorschläge filtern und anzeigen, wenn das Feld fokussiert wird und nicht leer ist', () => {
        input.value = 'c';
        input.dispatchEvent(new Event('focus', { bubbles: true }));

        const dropdown = container.querySelector('.autocomplete-dropdown');
        expect(dropdown).to.not.be.null;

        const items = dropdown.querySelectorAll('.autocomplete-item');
        // 'Carlsen' und 'DC' enthalten beide 'c' (case-insensitive)
        expect(items.length).to.equal(2);
        expect(items[0].textContent).to.equal('Carlsen');
        expect(items[1].textContent).to.equal('DC');
    });

    it('sollte den Wert übernehmen und Dropdown schließen, wenn auf ein Item geklickt wird', () => {
        input.value = 'Split';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        const dropdown = container.querySelector('.autocomplete-dropdown');
        const item = dropdown.querySelector('.autocomplete-item');
        
        // Mousedown simulieren (Klick auf den Eintrag)
        item.dispatchEvent(new Event('mousedown', { bubbles: true }));

        expect(input.value).to.equal('Splitter');
        expect(container.querySelector('.autocomplete-dropdown')).to.be.null;
    });

    it('sollte das Dropdown per Escape-Taste schließen', () => {
        input.value = 'M';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        let dropdown = container.querySelector('.autocomplete-dropdown');
        expect(dropdown).to.not.be.null;

        const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        input.dispatchEvent(escEvent);

        dropdown = container.querySelector('.autocomplete-dropdown');
        expect(dropdown).to.be.null;
    });

    it('sollte Tastaturnavigation mit Pfeiltasten und Enter unterstützen', () => {
        input.value = 'a'; // Findet 'Panini', 'Carlsen', 'Marvel'
        input.dispatchEvent(new Event('input', { bubbles: true }));

        const dropdown = container.querySelector('.autocomplete-dropdown');
        expect(dropdown).to.not.be.null;

        const items = dropdown.querySelectorAll('.autocomplete-item');
        expect(items.length).to.equal(3); // Panini, Carlsen, Marvel

        // Pfeil-Runter simulieren (wählt erstes Item: Panini)
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(items[0].classList.contains('active')).to.be.true;

        // Pfeil-Runter simulieren (wählt zweites Item: Carlsen)
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(items[1].classList.contains('active')).to.be.true;

        // Enter simulieren
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        expect(input.value).to.equal('Carlsen');
        expect(container.querySelector('.autocomplete-dropdown')).to.be.null;
    });

    it('sollte alle Vorschläge anzeigen, wenn das Feld fokussiert wird und leer ist', () => {
        input.value = '';
        input.dispatchEvent(new Event('focus', { bubbles: true }));

        const dropdown = container.querySelector('.autocomplete-dropdown');
        expect(dropdown).to.not.be.null;

        const items = dropdown.querySelectorAll('.autocomplete-item');
        expect(items.length).to.equal(6); // Panini, Carlsen, Marvel, DC, Splitter, Egmont
    });

    it('sollte das Dropdown schließen, wenn der Focus verloren geht (blur)', async () => {
        input.value = 'Pa';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(container.querySelector('.autocomplete-dropdown')).to.not.be.null;

        input.dispatchEvent(new Event('blur', { bubbles: true }));

        // Timeout abwarten (200ms in der Implementierung)
        await tick(250);
        expect(container.querySelector('.autocomplete-dropdown')).to.be.null;
    });
});

describe('Configurable Suggestions Settings Tests', () => {
    let testEnv;
    let settingsContainer;
    let originalAlert;
    let alertMessage = null;

    before(() => {
        originalAlert = window.alert;
        window.alert = (msg) => {
            alertMessage = msg;
        };
    });

    after(() => {
        window.alert = originalAlert;
    });

    beforeEach(() => {
        alertMessage = null;
        
        // Mock DB settings
        const mockSettings = {
            theme: 'dark',
            customSuggestions: {
                typ: ['Comic', 'Manga'],
                format: ['Softcover', 'Hardcover'],
                zustand: ['neu'],
                bestand: ['vorhanden']
            }
        };

        const mockComics = [
            { id: '1', verlag: 'Panini', typ: 'Comic' }
        ];

        testEnv = setupTestEnv({
            settings: mockSettings,
            mockComics: mockComics
        });
        
        settingsContainer = testEnv.viewContainer;
    });

    afterEach(() => {
        cleanup();
    });

    it('sollte die Vorschläge aus den Einstellungen rendern und Autocomplete für Standardwerte aktivieren', async () => {
        renderSettings(settingsContainer);
        
        const tagsDiv = settingsContainer.querySelector('#settings-suggestions-tags');
        expect(tagsDiv).to.not.be.null;
        
        // Sollte standardmäßig das erste Feld ("typ") anzeigen
        const fieldSelect = settingsContainer.querySelector('#settings-suggestion-field');
        expect(fieldSelect.value).to.equal('typ');

        const tags = tagsDiv.querySelectorAll('.suggestion-tag');
        expect(tags.length).to.equal(2);
        expect(tags[0].textContent).to.contain('Comic');
        expect(tags[1].textContent).to.contain('Manga');

        // Warten, bis die asynchronen Verlagsdaten geladen und das Autocomplete initialisiert ist
        await tick();

        // Autocomplete für Standard-Verlag testen
        const publisherInput = settingsContainer.querySelector('#settings-default-publisher');
        expect(publisherInput).to.not.be.null;

        publisherInput.value = 'Pan';
        publisherInput.dispatchEvent(new Event('input', { bubbles: true }));

        const publisherGroup = publisherInput.parentNode;
        const dropdown = publisherGroup.querySelector('.autocomplete-dropdown');
        expect(dropdown).to.not.be.null;

        const items = dropdown.querySelectorAll('.autocomplete-item');
        expect(items.length).to.equal(1);
        expect(items[0].textContent).to.equal('Panini');
    });

    it('sollte neue Vorschläge hinzufügen können', () => {
        renderSettings(settingsContainer);
        
        const input = settingsContainer.querySelector('#settings-new-suggestion');
        const addBtn = settingsContainer.querySelector('#btn-add-suggestion');
        
        input.value = 'Webtoon';
        addBtn.click();

        // Überprüfen, ob es den Einstellungen hinzugefügt wurde
        const s = db.getSettings();
        expect(s.customSuggestions.typ).to.include('Webtoon');

        // Überprüfen, ob das UI aktualisiert wurde
        const tagsDiv = settingsContainer.querySelector('#settings-suggestions-tags');
        const tags = tagsDiv.querySelectorAll('.suggestion-tag');
        expect(tags.length).to.equal(3);
        expect(tags[2].textContent).to.contain('Webtoon');
    });

    it('sollte einen ungenutzten Vorschlag löschen können', async () => {
        // Keine Comics/Wünsche vorhanden
        testEnv.setMockComics([]);
        testEnv.setMockWishes([]);

        renderSettings(settingsContainer);
        
        const tagsDiv = settingsContainer.querySelector('#settings-suggestions-tags');
        const firstTag = tagsDiv.querySelector('.suggestion-tag');
        expect(firstTag.textContent).to.contain('Comic');
        
        const removeBtn = firstTag.querySelector('.suggestion-tag-remove');
        
        // Click auslösen und asynchrones Event abwarten
        removeBtn.click();
        
        // Kurzer Delay für async DB query
        await tick();

        const s = db.getSettings();
        expect(s.customSuggestions.typ).to.not.include('Comic');
        expect(s.customSuggestions.typ.length).to.equal(1);
    });

    it('sollte das Löschen eines genutzten Vorschlags verhindern und eine Warnung anzeigen', async () => {
        // Comic verwendet "Comic"
        testEnv.setMockComics([{ id: '1', typ: 'Comic' }]);
        testEnv.setMockWishes([]);

        renderSettings(settingsContainer);
        
        const tagsDiv = settingsContainer.querySelector('#settings-suggestions-tags');
        const firstTag = tagsDiv.querySelector('.suggestion-tag');
        expect(firstTag.textContent).to.contain('Comic');
        
        const removeBtn = firstTag.querySelector('.suggestion-tag-remove');
        removeBtn.click();
        
        await tick();

        // Sollte nicht gelöscht sein
        const s = db.getSettings();
        expect(s.customSuggestions.typ).to.include('Comic');
        
        // Warnung sollte in der UI angezeigt werden
        const errorDiv = settingsContainer.querySelector('#settings-suggestions-error');
        expect(errorDiv.style.display).to.equal('flex');
        expect(errorDiv.textContent).to.contain('nicht gelöscht werden');
    });

    it('sollte bei vorhandenen Einstellungen "verliehen" migrieren, falls es fehlt', () => {
        // Original getSettings und saveSettings wiederherstellen für diesen Test
        cleanup();
        
        // Backup real localStorage settings
        const originalSettingsStr = localStorage.getItem('comicvault_settings');
        
        // Set up test data in real localStorage
        localStorage.setItem('comicvault_settings', JSON.stringify({
            theme: 'dark',
            customSuggestions: {
                typ: ['Comic'],
                format: ['Softcover'],
                verlag: ['Panini'],
                zustand: ['neu'],
                bestand: ['vorhanden', 'vorbestellt', 'verkauft', 'abgegeben']
            }
        }));
        
        try {
            const settings = db.getSettings();
            
            // Check returned settings
            expect(settings.customSuggestions.bestand).to.include('verliehen');
            expect(settings.customSuggestions.verlag).to.be.undefined;
            
            // Check that the migrated settings were actually saved back to localStorage
            const savedSettings = JSON.parse(localStorage.getItem('comicvault_settings'));
            expect(savedSettings).to.not.be.null;
            expect(savedSettings.customSuggestions.bestand).to.include('verliehen');
            expect(savedSettings.customSuggestions.verlag).to.be.undefined;
        } finally {
            // Restore original localStorage settings
            if (originalSettingsStr !== null) {
                localStorage.setItem('comicvault_settings', originalSettingsStr);
            } else {
                localStorage.removeItem('comicvault_settings');
            }
        }
    });

    it('sollte das Lösch-Modal anzeigen und erst bei Eingabe von "DELETE" die Datenbank leeren', async () => {
        window.__TESTING__ = true;
        let clearDataCalled = false;
        const originalClearAllData = db.clearAllData;
        db.clearAllData = async () => {
            clearDataCalled = true;
        };

        renderSettings(settingsContainer);

        const clearBtn = settingsContainer.querySelector('#btn-clear-database');
        expect(clearBtn).to.not.be.null;

        clearBtn.click();

        // Modal sollte im DOM existieren
        const modal = document.getElementById('db-clear-confirm-modal');
        expect(modal).to.not.be.null;

        const confirmBtn = document.getElementById('db-clear-modal-confirm');
        const confirmInput = document.getElementById('db-clear-confirm-input');
        expect(confirmBtn).to.not.be.null;
        expect(confirmInput).to.not.be.null;

        // Button sollte disabled sein
        expect(confirmBtn.disabled).to.be.true;

        // Falsche Eingabe eingeben
        confirmInput.value = 'DELET';
        confirmInput.dispatchEvent(new Event('input', { bubbles: true }));
        expect(confirmBtn.disabled).to.be.true;

        // Richtige Eingabe
        confirmInput.value = 'DELETE';
        confirmInput.dispatchEvent(new Event('input', { bubbles: true }));
        expect(confirmBtn.disabled).to.be.false;

        // Löschen auslösen
        confirmBtn.click();

        // Da clearAllData asynchron ist, warten wir kurz
        await tick();

        expect(clearDataCalled).to.be.true;

        // Cleanup modal
        const modalAfter = document.getElementById('db-clear-confirm-modal');
        if (modalAfter) modalAfter.remove();

        // Restore
        db.clearAllData = originalClearAllData;
        delete window.__TESTING__;
    });
});
