import { modalService } from '../services/modalService.js';
import { setupTestEnv, cleanup, tick } from './testHelper.js';

const { expect } = chai;

describe('Zentraler Modal-Manager (modalService.js)', () => {
    let testModal1;
    let testModal2;

    beforeEach(() => {
        setupTestEnv();
        document.body.classList.remove('modal-open');

        // Erstes Test-Modal erstellen
        testModal1 = document.createElement('div');
        testModal1.id = 'test-modal-1';
        testModal1.className = 'modal-overlay';
        testModal1.style.display = 'none';
        testModal1.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Test Modal 1</h2>
                    <button class="close-btn" id="btn-close-test-1">X</button>
                </div>
                <div class="modal-body">
                    <input type="text" id="input-test-1" placeholder="Input 1">
                    <button id="btn-action-test-1">Aktion 1</button>
                </div>
            </div>
        `;
        document.body.appendChild(testModal1);

        // Zweites Test-Modal erstellen (für Stacking/Nesting)
        testModal2 = document.createElement('div');
        testModal2.id = 'test-modal-2';
        testModal2.className = 'modal-overlay';
        testModal2.style.display = 'none';
        testModal2.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Test Modal 2</h2>
                    <button class="close-btn" id="btn-close-test-2">X</button>
                </div>
                <div class="modal-body">
                    <input type="text" id="input-test-2" placeholder="Input 2">
                </div>
            </div>
        `;
        document.body.appendChild(testModal2);
    });

    afterEach(() => {
        modalService.closeAll();
        if (testModal1 && testModal1.parentNode) testModal1.remove();
        if (testModal2 && testModal2.parentNode) testModal2.remove();
        cleanup();
    });

    describe('Öffnen und Schließen (open & close)', () => {
        it('sollte ein Modal anhand der ID oder des HTML-Elements öffnen', () => {
            expect(testModal1.style.display).to.equal('none');
            expect(document.body.classList.contains('modal-open')).to.be.false;

            modalService.open('test-modal-1');

            expect(testModal1.style.display).to.equal('flex');
            expect(testModal1.classList.contains('active')).to.be.true;
            expect(document.body.classList.contains('modal-open')).to.be.true;
            expect(modalService.isOpen('test-modal-1')).to.be.true;
        });

        it('sollte ein geöffnetes Modal sauber schließen und den Body-Scroll wieder freigeben', () => {
            modalService.open(testModal1);
            expect(modalService.isOpen()).to.be.true;

            modalService.close(testModal1);

            expect(testModal1.style.display).to.equal('none');
            expect(testModal1.classList.contains('active')).to.be.false;
            expect(document.body.classList.contains('modal-open')).to.be.false;
            expect(modalService.isOpen()).to.be.false;
        });

        it('sollte onClose-Callbacks beim Schließen aufrufen', () => {
            let closedWith = null;
            modalService.open(testModal1, {
                onClose: (data) => {
                    closedWith = data;
                }
            });

            modalService.close(testModal1, { saved: true });
            expect(closedWith).to.deep.equal({ saved: true });
        });
    });

    describe('Backdrop-Klick & Escape-Tastenbehandlung', () => {
        it('sollte das Modal schließen, wenn auf den Backdrop geklickt wird', () => {
            modalService.open(testModal1, { closeOnBackdrop: true });
            expect(modalService.isOpen(testModal1)).to.be.true;

            // Klick direkt auf das Overlay (Backdrop)
            testModal1.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(modalService.isOpen(testModal1)).to.be.false;
        });

        it('sollte das Modal NICHT schließen, wenn closeOnBackdrop auf false steht', () => {
            modalService.open(testModal1, { closeOnBackdrop: false });
            testModal1.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(modalService.isOpen(testModal1)).to.be.true;
        });

        it('sollte das oberste Modal bei Escape schließen', () => {
            modalService.open(testModal1);
            expect(modalService.isOpen(testModal1)).to.be.true;

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            expect(modalService.isOpen(testModal1)).to.be.false;
        });
    });

    describe('Modal-Stacking (Verschachtelte Modals)', () => {
        it('sollte bei mehreren geöffneten Modals nur das oberste bei Escape schließen', () => {
            modalService.open(testModal1);
            modalService.open(testModal2);

            expect(modalService.isOpen(testModal1)).to.be.true;
            expect(modalService.isOpen(testModal2)).to.be.true;
            expect(document.body.classList.contains('modal-open')).to.be.true;

            // Erstes ESC schließt nur Modal 2
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            expect(modalService.isOpen(testModal2)).to.be.false;
            expect(modalService.isOpen(testModal1)).to.be.true;
            expect(document.body.classList.contains('modal-open')).to.be.true;

            // Zweites ESC schließt Modal 1
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            expect(modalService.isOpen(testModal1)).to.be.false;
            expect(document.body.classList.contains('modal-open')).to.be.false;
        });
    });

    describe('Universelle Dialoge (confirm & alert)', () => {
        it('sollte einen dynamischen Confirm-Dialog mit Bestätigung (true) auflösen', async () => {
            const confirmPromise = modalService.confirm({
                title: 'Löschen bestätigen',
                message: 'Wirklich löschen?'
            });

            const okBtn = document.getElementById('dynamic-confirm-modal-ok');
            expect(okBtn).to.exist;

            okBtn.click();
            const result = await confirmPromise;
            expect(result).to.be.true;
        });

        it('sollte einen dynamischen Confirm-Dialog bei Abbrechen mit false auflösen', async () => {
            const confirmPromise = modalService.confirm({
                title: 'Abbrechen Test',
                message: 'Testnachricht'
            });

            const cancelBtn = document.getElementById('dynamic-confirm-modal-cancel');
            expect(cancelBtn).to.exist;

            cancelBtn.click();
            const result = await confirmPromise;
            expect(result).to.be.false;
        });

        it('sollte einen Info-Alert-Dialog bereitstellen und auflösen', async () => {
            const alertPromise = modalService.alert({
                title: 'Hinweis',
                message: 'Vorgang erfolgreich!'
            });

            const okBtn = document.getElementById('dynamic-alert-modal-ok');
            expect(okBtn).to.exist;

            okBtn.click();
            await alertPromise;
            expect(document.getElementById('dynamic-alert-modal')).to.be.null;
        });
    });
});
