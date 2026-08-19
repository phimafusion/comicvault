import { setupTestEnv, cleanup, tick } from './testHelper.js';
import { filterComicsForPick, pickRandomComic, calculatePickSmartInsight } from '../services/randomPickService.js';
import { renderRandomPick } from '../views/randomPick.js';
import { db } from '../db.js';

const { expect } = chai;

describe('Comic-Roulette & Zufallsauswahl Tests', () => {
    describe('randomPickService Unit-Tests', () => {
        const mockComics = [
            { id: '1', titel: 'Batman #1', verlag: 'Panini', format: 'Heft', bestand: 'vorhanden', gelesen: false, kaufdatum: '2026-01-01' },
            { id: '2', titel: 'Spider-Man #1', verlag: 'Panini', format: 'Trade Paperback', bestand: 'vorhanden', gelesen: true, gelesen_am: '2026-02-01', kaufdatum: '2026-01-02' },
            { id: '3', titel: 'Saga Vol 1', verlag: 'Cross Cult', format: 'Hardcover', bestand: 'wunschliste', gelesen: false },
            { id: '4', titel: 'X-Men #1', verlag: 'Marvel', format: 'Heft', bestand: 'vorhanden', gelesen: false, kaufdatum: '2026-03-01' }
        ];

        it('sollte nur ungelesene vorhandene Bände filtern (stack: "unread")', () => {
            const filtered = filterComicsForPick(mockComics, { stack: 'unread' });
            expect(filtered).to.have.lengthOf(2);
            expect(filtered.map(c => c.id)).to.deep.equal(['1', '4']);
        });

        it('sollte den gesamten physischen Bestand filtern (stack: "vorhanden")', () => {
            const filtered = filterComicsForPick(mockComics, { stack: 'vorhanden' });
            expect(filtered).to.have.lengthOf(3);
            expect(filtered.map(c => c.id)).to.deep.equal(['1', '2', '4']);
        });

        it('sollte nur die Wunschliste filtern (stack: "wunschliste")', () => {
            const filtered = filterComicsForPick(mockComics, { stack: 'wunschliste' });
            expect(filtered).to.have.lengthOf(1);
            expect(filtered[0].id).to.equal('3');
        });

        it('sollte nach Verlag und Typ filtern', () => {
            const filteredVerlag = filterComicsForPick(mockComics, { stack: 'all', verlag: 'Cross Cult' });
            expect(filteredVerlag).to.have.lengthOf(1);

            const filteredTyp = filterComicsForPick(mockComics, { stack: 'all', typ: 'Trade Paperback' });
            expect(filteredTyp).to.have.lengthOf(1);
        });

        it('sollte Smart Insights dynamisch berechnen', () => {
            const insightUnread = calculatePickSmartInsight(mockComics, 'unread', '€');
            expect(insightUnread).to.contain('warten im Schnitt');

            const insightWish = calculatePickSmartInsight([mockComics[2]], 'wunschliste', '€');
            expect(insightWish).to.contain('Wunschliste umfasst');
        });

        it('sollte zufällig ein Comic auswählen oder null bei leerer Liste zurückgeben', () => {
            expect(pickRandomComic([])).to.be.null;
            expect(pickRandomComic(null)).to.be.null;

            const picked = pickRandomComic(mockComics);
            expect(picked).to.not.be.null;
            expect(mockComics).to.deep.include(picked);
        });
    });

    describe('DOM- & Integrationstests', () => {
        let testEnv;
        let container;

        beforeEach(async () => {
            testEnv = setupTestEnv();
            container = testEnv.viewContainer;

            await db.saveComic({
                titel: 'Test Comic #1',
                serie: 'Test Serie',
                nummer: 1,
                verlag: 'Test Verlag',
                format: 'Heft',
                bestand: 'vorhanden',
                gelesen: false,
                kaufdatum: '2026-05-10'
            });
        });

        afterEach(() => {
            cleanup();
        });

        it('sollte die Random-Picker-View im DOM rendern', async () => {
            await renderRandomPick(container, testEnv.appInstance);

            const title = container.querySelector('h2');
            expect(title).to.not.be.null;
            expect(title.textContent).to.contain('Comic Roulette');

            const drawBtn = container.querySelector('#btn-draw-random-comic');
            expect(drawBtn).to.not.be.null;
            expect(drawBtn.textContent).to.contain('ROULETTE STARTEN');
        });

        it('sollte beim Klick auf den Ziehen-Button eine Gewinner-Karte rendern', async () => {
            await renderRandomPick(container, testEnv.appInstance);

            const drawBtn = container.querySelector('#btn-draw-random-comic');
            expect(drawBtn).to.not.be.null;

            drawBtn.click();
            await new Promise(resolve => setTimeout(resolve, 750));
            await tick();

            const winnerCard = container.querySelector('.winner-card');
            expect(winnerCard).to.not.be.null;
            expect(winnerCard.textContent).to.contain('Dein Pick');
            expect(winnerCard.textContent).to.contain('Test Comic #1');
            expect(winnerCard.textContent).to.contain('#1');
            expect(winnerCard.textContent).to.contain('10.05.2026');
        });
    });
});
