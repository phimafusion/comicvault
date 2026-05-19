import { renderCollection, attachCollectionEvents, isSelectModeActive, selectedComicIds, toggleSelectMode } from '../views/collection.js';
import { db } from '../db.js';

const { expect } = chai;

describe('ComicVault Bulk Delete & Multi-Select Tests', () => {
    let container;
    let originalGetAllComics;
    let originalDeleteComics;
    let deleteComicsCalledWith = null;

    before(() => {
        // Attach event listeners
        attachCollectionEvents();

        // Backup database methods
        originalGetAllComics = db.getAllComics;
        originalDeleteComics = db.deleteComics;

        // Stub database methods
        db.getAllComics = async () => {
            return [
                { id: '1', titel: 'Spider-Man Classic 1', serie: 'Spider-Man', verlag: 'Marvel', bestand: 'vorhanden' },
                { id: '2', titel: 'Batman Year One', serie: 'Batman', verlag: 'DC', bestand: 'vorhanden' },
                { id: '3', titel: 'Superman Rebirth 5', serie: 'Superman', verlag: 'DC', bestand: 'vorbestellt' }
            ];
        };

        db.deleteComics = async (ids) => {
            deleteComicsCalledWith = ids;
        };

        // Create test view container
        container = document.createElement('div');
        container.id = 'view-container';
        document.body.appendChild(container);
    });

    after(() => {
        // Restore database methods
        db.getAllComics = originalGetAllComics;
        db.deleteComics = originalDeleteComics;

        // Clean up test view container
        if (container) {
            container.remove();
        }
    });

    beforeEach(async () => {
        deleteComicsCalledWith = null;
        selectedComicIds.clear();
        if (isSelectModeActive) {
            toggleSelectMode(); // Reset to inactive state
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        await renderCollection(container);
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(() => {
        const bar = document.getElementById('bulk-action-bar');
        if (bar) bar.remove();
        const modal = document.getElementById('bulk-delete-confirm-modal');
        if (modal) modal.remove();
        document.body.classList.remove('bulk-select-active');
    });

    it('sollte standardmäßig den Auswahlmodus deaktiviert haben', () => {
        expect(isSelectModeActive).to.be.false;
        expect(selectedComicIds.size).to.equal(0);
        
        const checkboxHeader = container.querySelector('#bulk-select-all-header');
        expect(checkboxHeader).to.be.null;

        const actionBar = document.getElementById('bulk-action-bar');
        expect(actionBar).to.be.null;
    });

    it('sollte den Auswahlmodus aktivieren und Checkboxen rendern, wenn der Toggle-Button geklickt wird', async () => {
        const toggleBtn = container.querySelector('#btn-toggle-select-mode');
        expect(toggleBtn).to.not.be.null;

        // Click selection mode toggle button
        toggleBtn.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(isSelectModeActive).to.be.true;
        
        // Check for floating action bar
        const actionBar = document.getElementById('bulk-action-bar');
        expect(actionBar).to.not.be.null;
        expect(actionBar.classList.contains('show')).to.be.true;

        // Check that body has active class
        expect(document.body.classList.contains('bulk-select-active')).to.be.true;
    });

    it('sollte Comics selektieren und visuell markieren, wenn im Auswahlmodus auf sie geklickt wird', async () => {
        const toggleBtn = container.querySelector('#btn-toggle-select-mode');
        toggleBtn.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        const items = container.querySelectorAll('.comic-item');
        expect(items.length).to.equal(3);

        const firstItem = items[0];
        const firstComicId = firstItem.dataset.id;

        // Click first item card
        firstItem.click();

        expect(selectedComicIds.has(firstComicId)).to.be.true;
        expect(firstItem.classList.contains('selected')).to.be.true;

        const checkbox = firstItem.querySelector('.bulk-item-checkbox');
        expect(checkbox).to.not.be.null;
        expect(checkbox.checked).to.be.true;

        // Click again to deselect
        firstItem.click();
        expect(selectedComicIds.has(firstComicId)).to.be.false;
        expect(firstItem.classList.contains('selected')).to.be.false;
        expect(checkbox.checked).to.be.false;
    });

    it('sollte alle sichtbaren Comics selektieren, wenn "Alle sichtbaren" geklickt wird', async () => {
        const toggleBtn = container.querySelector('#btn-toggle-select-mode');
        toggleBtn.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        const selectAllBtn = document.getElementById('bulk-action-select-all');
        expect(selectAllBtn).to.not.be.null;

        // Click select all
        selectAllBtn.click();

        expect(selectedComicIds.size).to.equal(3);
        
        const items = container.querySelectorAll('.comic-item');
        items.forEach(item => {
            expect(item.classList.contains('selected')).to.be.true;
            expect(item.querySelector('.bulk-item-checkbox').checked).to.be.true;
        });

        // Click select all again to deselect
        selectAllBtn.click();
        expect(selectedComicIds.size).to.equal(0);
        items.forEach(item => {
            expect(item.classList.contains('selected')).to.be.false;
            expect(item.querySelector('.bulk-item-checkbox').checked).to.be.false;
        });
    });

    it('sollte das Bestätigungsmodal anzeigen und die ausgewählten Comics löschen, wenn die Löschung bestätigt wird', async () => {
        const toggleBtn = container.querySelector('#btn-toggle-select-mode');
        toggleBtn.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Select first two comics
        const items = container.querySelectorAll('.comic-item');
        items[0].click();
        items[1].click();

        expect(selectedComicIds.size).to.equal(2);

        // Click delete on bulk action bar
        const deleteBtn = document.getElementById('bulk-action-delete');
        expect(deleteBtn.disabled).to.be.false;
        deleteBtn.click();

        // Check modal overlay exists
        const modal = document.getElementById('bulk-delete-confirm-modal');
        expect(modal).to.not.be.null;

        // Click confirm deletion inside modal
        const confirmBtn = document.getElementById('bulk-delete-modal-confirm');
        expect(confirmBtn).to.not.be.null;
        
        // Wait for asynchronous deletion and re-render
        confirmBtn.click();
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify database delete call (order independent)
        expect(deleteComicsCalledWith).to.have.members(['1', '2']);
        
        // Verify selection state is reset
        expect(isSelectModeActive).to.be.false;
        expect(selectedComicIds.size).to.equal(0);
        
        // Verify action bar and modal are removed
        expect(document.getElementById('bulk-action-bar')).to.be.null;
        expect(document.getElementById('bulk-delete-confirm-modal')).to.be.null;
    });

    it('sollte den Auswahlmodus beenden, wenn "Abbrechen" in der Aktionsleiste geklickt wird', async () => {
        const toggleBtn = container.querySelector('#btn-toggle-select-mode');
        toggleBtn.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Select first comic
        const items = container.querySelectorAll('.comic-item');
        items[0].click();

        // Click cancel on action bar
        const cancelBtn = document.getElementById('bulk-action-cancel');
        expect(cancelBtn).to.not.be.null;
        cancelBtn.click();

        expect(isSelectModeActive).to.be.false;
        expect(selectedComicIds.size).to.equal(0);

        // Wait for slide-out animation to complete (400ms) before checking bar removal
        await new Promise(resolve => setTimeout(resolve, 450));
        expect(document.getElementById('bulk-action-bar')).to.be.null;
    });
});
});
