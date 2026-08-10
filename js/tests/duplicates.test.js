import { setupTestEnv, cleanup, tick } from './testHelper.js';
import { 
    normalizeText, 
    isSimilarText, 
    getPairKey, 
    findDuplicates, 
    getIgnoredDuplicatesList, 
    saveIgnoredDuplicatesList, 
    renderDuplicates 
} from '../views/duplicates.js';
import { db } from '../db.js';

const { expect } = chai;

describe('ComicVault Duplicate Finder Tests', () => {
    let testEnv;
    let container;

    beforeEach(() => {
        localStorage.removeItem('comicvault_ignored_duplicates');
    });

    afterEach(() => {
        localStorage.removeItem('comicvault_ignored_duplicates');
        cleanup();
    });

    describe('Duplicate Helper & Matching Logic', () => {
        it('sollte Texte korrekt normalisieren (Kleinschreibung, Sonderzeichen entfernen)', () => {
            expect(normalizeText('Spider-Man: Blue!')).to.equal('spider man blue');
            expect(normalizeText('Batman (Vol. 2)')).to.equal('batman vol 2');
            expect(normalizeText('')).to.equal('');
        });

        it('sollte ähnliche Texte erkennen', () => {
            expect(isSimilarText('Spider-Man Classic', 'Spider-Man')).to.be.true;
            expect(isSimilarText('Batman Year One', 'Superman Rebirth')).to.be.false;
        });

        it('sollte Paarschlüssel unabhängig von der Reihenfolge der IDs erzeugen', () => {
            const key1 = getPairKey('abc', 'xyz');
            const key2 = getPairKey('xyz', 'abc');
            expect(key1).to.equal(key2);
            expect(key1).to.equal('abc___xyz');
        });

        it('sollte exakte Duplikate und Band-Duplikate in Comics erkennen', () => {
            const mockComics = [
                { id: '1', titel: 'Spider-Man #1', serie: 'Spider-Man', nummer: '1', verlag: 'Marvel', format: 'Heft' },
                { id: '2', titel: 'Spider-Man #1', serie: 'Spider-Man', nummer: '1', verlag: 'Marvel', format: 'Heft' }, // Exakt 1 & 2
                { id: '3', titel: 'Spider-Man #1', serie: 'Spider-Man', nummer: '1', verlag: 'Marvel', format: 'Hardcover' }, // Gleicher Band 1 & 3 (gleicher Verlag)
                { id: '4', titel: 'Batman #10', serie: 'Batman', nummer: '10', verlag: 'DC', format: 'Heft' }
            ];

            const duplicates = findDuplicates(mockComics, []);
            expect(duplicates.length).to.be.at.least(2);

            const exactMatch = duplicates.find(p => p.matchType === 'exact');
            expect(exactMatch).to.not.be.undefined;
            expect([exactMatch.comicA.id, exactMatch.comicB.id]).to.include.members(['1', '2']);
        });

        it('sollte verschiedene Verlage (z. B. Marvel vs. DC) nicht als Duplikate werten', () => {
            const mockComics = [
                { id: '10', titel: 'Crossover #1', serie: 'Crossover', nummer: '1', verlag: 'Marvel', format: 'Heft' },
                { id: '11', titel: 'Crossover #1', serie: 'Crossover', nummer: '1', verlag: 'DC', format: 'Heft' }
            ];

            const duplicates = findDuplicates(mockComics, []);
            expect(duplicates.length).to.equal(0);
        });

        it('sollte ignorierten Paaren (Kein Duplikat) das Flag isIgnored setzen', () => {
            const mockComics = [
                { id: '1', titel: 'Spider-Man #1', serie: 'Spider-Man', nummer: '1', verlag: 'Marvel', format: 'Heft' },
                { id: '2', titel: 'Spider-Man #1', serie: 'Spider-Man', nummer: '1', verlag: 'Marvel', format: 'Heft' }
            ];

            const ignoredKey = getPairKey('1', '2');
            const duplicates = findDuplicates(mockComics, [ignoredKey]);

            expect(duplicates.length).to.equal(1);
            expect(duplicates[0].isIgnored).to.be.true;
        });
    });

    describe('Duplicate Finder UI & Interactions', () => {
        it('sollte die Duplikat-Finder Ansicht rendern und Duplikate anzeigen', async () => {
            const mockComics = [
                { id: '101', titel: 'Batman Year One', serie: 'Batman', nummer: '1', verlag: 'DC', format: 'Hardcover', me: 1 },
                { id: '102', titel: 'Batman Year One', serie: 'Batman', nummer: '1', verlag: 'DC', format: 'Hardcover', me: 1 }
            ];

            testEnv = setupTestEnv({ mockComics });
            container = testEnv.viewContainer;

            await renderDuplicates(container);
            await tick();

            const title = container.querySelector('h2');
            expect(title.textContent).to.contain('Duplikat-Finder');

            const cards = container.querySelectorAll('.duplicate-pair-card');
            expect(cards.length).to.equal(1);
            expect(container.innerHTML).to.contain('Exakt');
        });

        it('sollte ein Paar als "Kein Duplikat" markieren können', async () => {
            const mockComics = [
                { id: '201', titel: 'Superman #1', serie: 'Superman', nummer: '1', verlag: 'DC', format: 'Heft' },
                { id: '202', titel: 'Superman #1', serie: 'Superman', nummer: '1', verlag: 'DC', format: 'Heft' }
            ];

            testEnv = setupTestEnv({ mockComics });
            container = testEnv.viewContainer;

            await renderDuplicates(container);
            await tick();

            const btnIgnore = container.querySelector('.btn-ignore-pair');
            expect(btnIgnore).to.not.be.null;

            btnIgnore.click();
            await tick();

            const ignoredList = getIgnoredDuplicatesList();
            const pairKey = getPairKey('201', '202');
            expect(ignoredList).to.include(pairKey);
        });

        it('sollte standardmäßig auf exakte Duplikate filtern', async () => {
            const mockComics = [
                // Exakt
                { id: '301', titel: 'Spawn #1', serie: 'Spawn', nummer: '1', verlag: 'Image', format: 'Heft' },
                { id: '302', titel: 'Spawn #1', serie: 'Spawn', nummer: '1', verlag: 'Image', format: 'Heft' },
                // Nur gleiche Bände (abweichendes Format)
                { id: '303', titel: 'Spawn #1', serie: 'Spawn', nummer: '1', verlag: 'Panini', format: 'Hardcover' }
            ];

            testEnv = setupTestEnv({ mockComics });
            container = testEnv.viewContainer;

            await renderDuplicates(container);
            await tick();

            // Der aktive Filter-Button sollte "Exakte Treffer" sein
            const activeFilterBtn = container.querySelector('.btn-filter-match.btn-primary');
            expect(activeFilterBtn).to.not.be.null;
            expect(activeFilterBtn.dataset.match).to.equal('exact');

            // Es sollte 1 Karte (exaktes Paar 301 & 302) gerendert werden
            const cards = container.querySelectorAll('.duplicate-pair-card');
            expect(cards.length).to.equal(1);
        });
    });
});
