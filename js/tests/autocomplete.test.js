import { initAutocomplete } from '../views/form.js';
import { renderSettings } from '../views/settings.js';
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

    it('sollte das Dropdown schließen, wenn der Focus verloren geht (blur)', (done) => {
        input.value = 'Pa';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(container.querySelector('.autocomplete-dropdown')).to.not.be.null;

        input.dispatchEvent(new Event('blur', { bubbles: true }));

        // Timeout abwarten (200ms in der Implementierung)
        setTimeout(() => {
            expect(container.querySelector('.autocomplete-dropdown')).to.be.null;
            done();
        }, 250);
    });
});

describe('Configurable Suggestions Settings Tests', () => {
    let settingsContainer;
    let originalGetSettings;
    let originalSaveSettings;
    let originalGetAllComics;
    let originalGetWishlist;
    let originalAlert;
    let alertMessage = null;

    before(() => {
        // Backup
        originalGetSettings = db.getSettings;
        originalSaveSettings = db.saveSettings;
        originalGetAllComics = db.getAllComics;
        originalGetWishlist = db.getWishlist;
        originalAlert = window.alert;
        
        window.alert = (msg) => {
            alertMessage = msg;
        };
    });

    after(() => {
        // Restore
        db.getSettings = originalGetSettings;
        db.saveSettings = originalSaveSettings;
        db.getAllComics = originalGetAllComics;
        db.getWishlist = originalGetWishlist;
        window.alert = originalAlert;
    });

    beforeEach(() => {
        alertMessage = null;
        settingsContainer = document.createElement('div');
        document.body.appendChild(settingsContainer);
        
        // Mock DB settings
        let mockSettings = {
            theme: 'dark',
            customSuggestions: {
                typ: ['Comic', 'Manga'],
                format: ['Softcover', 'Hardcover'],
                zustand: ['neu'],
                bestand: ['vorhanden']
            }
        };

        db.getSettings = () => JSON.parse(JSON.stringify(mockSettings));
        db.saveSettings = (s) => {
            mockSettings = JSON.parse(JSON.stringify(s));
        };
        db.getAllComics = async () => [
            { id: '1', verlag: 'Panini', typ: 'Comic' }
        ];
        db.getWishlist = async () => [];
    });

    afterEach(() => {
        if (settingsContainer) {
            settingsContainer.remove();
        }
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
        await new Promise(resolve => setTimeout(resolve, 10));

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
        db.getAllComics = async () => [];
        db.getWishlist = async () => [];

        renderSettings(settingsContainer);
        
        const tagsDiv = settingsContainer.querySelector('#settings-suggestions-tags');
        const firstTag = tagsDiv.querySelector('.suggestion-tag');
        expect(firstTag.textContent).to.contain('Comic');
        
        const removeBtn = firstTag.querySelector('.suggestion-tag-remove');
        
        // Click auslösen und asynchrones Event abwarten
        removeBtn.click();
        
        // Kurzer Delay für async DB query
        await new Promise(resolve => setTimeout(resolve, 50));

        const s = db.getSettings();
        expect(s.customSuggestions.typ).to.not.include('Comic');
        expect(s.customSuggestions.typ.length).to.equal(1);
    });

    it('sollte das Löschen eines genutzten Vorschlags verhindern und eine Warnung anzeigen', async () => {
        // Comic verwendet "Comic"
        db.getAllComics = async () => [{ id: '1', typ: 'Comic' }];
        db.getWishlist = async () => [];

        renderSettings(settingsContainer);
        
        const tagsDiv = settingsContainer.querySelector('#settings-suggestions-tags');
        const firstTag = tagsDiv.querySelector('.suggestion-tag');
        expect(firstTag.textContent).to.contain('Comic');
        
        const removeBtn = firstTag.querySelector('.suggestion-tag-remove');
        removeBtn.click();
        
        await new Promise(resolve => setTimeout(resolve, 50));

        // Sollte nicht gelöscht sein
        const s = db.getSettings();
        expect(s.customSuggestions.typ).to.include('Comic');
        
        // Warnung sollte in der UI angezeigt werden
        const errorDiv = settingsContainer.querySelector('#settings-suggestions-error');
        expect(errorDiv.style.display).to.equal('flex');
        expect(errorDiv.textContent).to.contain('nicht gelöscht werden');
    });

    it('sollte bei vorhandenen Einstellungen "verliehen" migrieren, falls es fehlt', () => {
        // Original getSettings wiederherstellen für diesen Test
        db.getSettings = originalGetSettings;
        db.saveSettings = originalSaveSettings;
        
        const originalGetItem = Storage.prototype.getItem;
        const originalSetItem = Storage.prototype.setItem;
        
        let savedValue = null;
        Storage.prototype.getItem = function(key) {
            return JSON.stringify({
                theme: 'dark',
                customSuggestions: {
                    typ: ['Comic'],
                    format: ['Softcover'],
                    verlag: ['Panini'],
                    zustand: ['neu'],
                    bestand: ['vorhanden', 'vorbestellt', 'verkauft', 'abgegeben']
                }
            });
        };
        Storage.prototype.setItem = function(key, val) {
            savedValue = JSON.parse(val);
        };
        
        try {
            const settings = db.getSettings();
            expect(settings.customSuggestions.bestand).to.include('verliehen');
            expect(settings.customSuggestions.verlag).to.be.undefined;
            expect(savedValue).to.not.be.null;
            expect(savedValue.customSuggestions.bestand).to.include('verliehen');
            expect(savedValue.customSuggestions.verlag).to.be.undefined;
        } finally {
            Storage.prototype.getItem = originalGetItem;
            Storage.prototype.setItem = originalSetItem;
        }
    });
});
