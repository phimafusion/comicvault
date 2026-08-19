import { storageService, STORAGE_KEYS } from '../services/storageService.js';

const { expect } = chai;

describe('StorageService Modultests', () => {
    beforeEach(() => {
        storageService.clear();
    });

    afterEach(() => {
        storageService.clear();
    });

    it('sollte prüfen können, ob Storage verfügbar ist', () => {
        expect(storageService.isAvailable()).to.be.true;
    });

    it('sollte STORAGE_KEYS Konstanten bereitstellen', () => {
        expect(STORAGE_KEYS.SETTINGS).to.equal('comicvault_settings');
        expect(STORAGE_KEYS.VISIBLE_FIELDS).to.equal('comicvault_visible_fields');
        expect(STORAGE_KEYS.MOCK_MODE).to.equal('mock_mode');
    });

    it('sollte Objekte und Arrays sicher speichern und als JSON abrufen', () => {
        const testObj = { theme: 'cyberpunk', volume: 42, active: true };
        const success = storageService.setItem(STORAGE_KEYS.SETTINGS, testObj);
        expect(success).to.be.true;

        const retrieved = storageService.getItem(STORAGE_KEYS.SETTINGS);
        expect(retrieved).to.deep.equal(testObj);
    });

    it('sollte bei nicht vorhandenen Keys den übergebenen Default-Wert zurückgeben', () => {
        const result = storageService.getItem('non_existent_key', { fallback: true });
        expect(result).to.deep.equal({ fallback: true });

        const nullResult = storageService.getItem('non_existent_key');
        expect(nullResult).to.be.null;
    });

    it('sollte bei korrupten JSON-Daten sicher den Rohstring zurückgeben anstatt zu werfen', () => {
        window.localStorage.setItem('corrupt_json_key', '{invalid_json');
        const result = storageService.getItem('corrupt_json_key');
        expect(result).to.equal('{invalid_json');
    });

    it('sollte reine Strings über getString und setString verarbeiten', () => {
        storageService.setString(STORAGE_KEYS.MOCK_MODE, 'true');
        expect(storageService.getString(STORAGE_KEYS.MOCK_MODE)).to.equal('true');

        expect(storageService.getString('non_existent_string', 'default_str')).to.equal('default_str');
    });

    it('sollte das Vorhandensein eines Keys mit hasItem prüfen', () => {
        expect(storageService.hasItem('test_key')).to.be.false;
        storageService.setString('test_key', 'hello');
        expect(storageService.hasItem('test_key')).to.be.true;
    });

    it('sollte einzelne Keys mit removeItem entfernen', () => {
        storageService.setItem('temp_key', { test: 123 });
        expect(storageService.hasItem('temp_key')).to.be.true;

        storageService.removeItem('temp_key');
        expect(storageService.hasItem('temp_key')).to.be.false;
        expect(storageService.getItem('temp_key')).to.be.null;
    });

    it('sollte mit clear() den gesamten Speicher leeren', () => {
        storageService.setItem('k1', 'v1');
        storageService.setItem('k2', 'v2');
        expect(storageService.hasItem('k1')).to.be.true;
        expect(storageService.hasItem('k2')).to.be.true;

        storageService.clear();
        expect(storageService.hasItem('k1')).to.be.false;
        expect(storageService.hasItem('k2')).to.be.false;
    });
});
