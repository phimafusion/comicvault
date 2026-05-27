import { db } from '../db.js';
import { toInputDate, toGermanDate } from '../utils.js';
import { initAutocomplete } from '../components/autocomplete.js';
import { initStarRating } from '../components/star-rating.js';
import { generateFormHtml, generateBulkFormHtml } from './form/templates.js';

const modal = document.getElementById('comic-modal');
const form = document.getElementById('comic-form');
const btnClose = document.getElementById('btn-close-modal');
const btnCancel = document.getElementById('btn-cancel-modal');
const btnSave = document.getElementById('btn-save-comic');
const btnDelete = document.getElementById('btn-delete-comic');
const modalTitle = document.getElementById('modal-title');

let currentEditingId = null;
let isBulkEditing = false;
let bulkEditIds = [];
const dirtyFields = new Set();
let transferFromWishId = null;

export async function openModal(comic = null, isWishlist = false, options = {}) {
    transferFromWishId = options.transferFromWishId || null;
    currentEditingId = (comic && !transferFromWishId) ? comic.id : null;
    
    if (transferFromWishId) {
        modalTitle.textContent = 'Aus Wunschliste in Sammlung verschieben';
    } else {
        modalTitle.textContent = comic ? (isWishlist ? 'Wunsch bearbeiten' : 'Comic bearbeiten') : (isWishlist ? 'Neuer Wunsch' : 'Neuer Comic');
    }
    
    // Bestehende Werte für Autovervollständigung laden
    const suggestions = await getSuggestions();
    const settings = db.getSettings();
    
    // Standardwerte für neue Comics
    const defaults = !comic ? {
        sprache: settings.defaultLanguage || 'Deutsch',
        zustand: settings.defaultCondition || 'neu',
        verlag: settings.defaultPublisher || ''
    } : {};
    
    let comicDataPrefill = comic;
    if (transferFromWishId && comic) {
        comicDataPrefill = { ...comic };
        delete comicDataPrefill.bemerkung;
    }

    form.dataset.isWishlist = isWishlist;
    form.innerHTML = generateFormHtml(comicDataPrefill, isWishlist, suggestions, defaults);
    
    if (!isWishlist) {
        initStarRating(comic ? (comic.bewertung || 0) : 0);
    }
    
    // Autocomplete initialisieren
    Object.keys(suggestions).forEach(field => {
        const input = form.querySelector(`input[name="${field}"]`);
        if (input) {
            initAutocomplete(input, suggestions[field]);
        }
    });
    
    // Löschen-Button nur beim Bearbeiten zeigen
    btnDelete.style.display = comic ? 'flex' : 'none';
    
    modal.style.display = 'flex';
    setTimeout(() => modal.style.opacity = '1', 10);
}

async function getSuggestions() {
    const [comics, wishes] = await Promise.all([
        db.getAllComics(),
        db.getWishlist()
    ]);
    
    const allItems = [...comics, ...wishes];
    const fields = ['titel', 'typ', 'format', 'verlag', 'zustand', 'bestand', 'serie', 'sprache', 'bezugsquelle', 'besonderheit', 'variantname'];
    const suggestions = {};
    fields.forEach(f => suggestions[f] = new Set());

    // Standardwerte aus Einstellungen hinzufügen
    const settings = db.getSettings();
    const customSugs = settings.customSuggestions || {};
    
    Object.keys(customSugs).forEach(field => {
        if (suggestions[field] && Array.isArray(customSugs[field])) {
            customSugs[field].forEach(v => suggestions[field].add(v));
        }
    });

    allItems.forEach(item => {
        fields.forEach(f => {
            if (item[f]) suggestions[f].add(String(item[f]));
        });
    });

    // In Arrays umwandeln
    Object.keys(suggestions).forEach(f => {
        suggestions[f] = Array.from(suggestions[f]).sort();
    });

    return suggestions;
}

function closeModal() {
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        form.reset();
        isBulkEditing = false;
        bulkEditIds = [];
        dirtyFields.clear();
    }, 300);
}

btnClose.addEventListener('click', closeModal);
btnCancel.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
});

btnDelete.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!currentEditingId) return;

    if (confirm('Möchtest du diesen Eintrag wirklich unwiderruflich löschen?')) {
        const isWishlist = form.dataset.isWishlist === 'true';
        if (isWishlist) {
            await db.deleteWish(currentEditingId);
        } else {
            await db.deleteComic(currentEditingId);
        }
        
        closeModal();
        if (window.app) {
            window.app.navigate(isWishlist ? 'wishlist' : 'collection');
        }
    }
});

btnSave.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    if (isBulkEditing) {
        if (dirtyFields.size === 0) {
            closeModal();
            return;
        }

        const formData = new FormData(form);
        const updates = {};

        const parseValue = (name, val) => {
            if (name === 'preis') return val ? parseFloat(val) : null;
            if (name === 'jahr' || name === 'nummer' || name === 'limitiert_auf') return val ? parseInt(val) : null;
            if (name === 'bewertung') return val ? parseInt(val) : 0;
            if (name === 'limitierung' || name === 'variant') return val === 'true';
            if (name === 'kaufdatum' || name === 'gelesen_am') return toGermanDate(val);
            return val;
        };

        dirtyFields.forEach(name => {
            const rawVal = formData.get(name);
            updates[name] = parseValue(name, rawVal);
        });

        await db.updateComics(bulkEditIds, updates);
        
        isBulkEditing = false;
        bulkEditIds = [];
        dirtyFields.clear();
        closeModal();
        if (window.app) {
            window.app.navigate('collection');
        }
        return;
    }

    const formData = new FormData(form);
    const comicData = {
        id: currentEditingId,
        titel: formData.get('titel'),
        typ: formData.get('typ'),
        format: formData.get('format'),
        preis: formData.get('preis') ? parseFloat(formData.get('preis')) : null,
        jahr: formData.get('jahr') ? parseInt(formData.get('jahr')) : null,
        bemerkung: formData.get('bemerkung')
    };

    const isWishlist = form.dataset.isWishlist === 'true';

    if (isWishlist) {
        comicData.vorbestellt = formData.get('vorbestellt') === 'true';
        await db.saveWish(comicData);
    } else {
        // Bild-Verarbeitung vorerst deaktiviert, bestehendes Bild beibehalten falls vorhanden
        let finalImageUrl = '';
        if (currentEditingId) {
            const allComics = await db.getAllComics();
            const existingComic = allComics.find(c => c.id === currentEditingId);
            if (existingComic) {
                finalImageUrl = existingComic.bild || '';
                if (existingComic.created_at) comicData.created_at = existingComic.created_at;
            }
        }

        Object.assign(comicData, {
            verlag: formData.get('verlag'),
            serie: formData.get('serie'),
            nummer: formData.get('nummer') ? parseInt(formData.get('nummer')) : null,
            zustand: formData.get('zustand'),
            bezugsquelle: formData.get('bezugsquelle'),
            sprache: formData.get('sprache'),
            limitierung: formData.get('limitierung') === 'true',
            limitiert_auf: formData.get('limitiert_auf') ? parseInt(formData.get('limitiert_auf')) : null,
            variant: formData.get('variant') === 'true',
            variantname: formData.get('variantname'),
            kaufdatum: toGermanDate(formData.get('kaufdatum')),
            bestand: formData.get('bestand'),
            gelesen_am: toGermanDate(formData.get('gelesen_am')),
            bewertung: formData.get('bewertung') ? parseInt(formData.get('bewertung')) : 0,
            bild: finalImageUrl
        });
        await db.saveComic(comicData);

        if (transferFromWishId) {
            await db.deleteWish(transferFromWishId);
            transferFromWishId = null;
        }
    }

    closeModal();
    
    if (window.app) {
        window.app.navigate(isWishlist ? 'wishlist' : 'collection');
    }
});







export async function openBulkEditModal(ids) {
    isBulkEditing = true;
    bulkEditIds = ids;
    dirtyFields.clear();
    
    modalTitle.textContent = 'Mehrere Comics bearbeiten';
    
    // Hide delete button in bulk mode
    btnDelete.style.display = 'none';
    
    const allComics = await db.getAllComics();
    const selectedComics = allComics.filter(c => ids.includes(c.id));
    
    if (selectedComics.length === 0) {
        closeModal();
        return;
    }
    
    const suggestions = await getSuggestions();
    
    const fields = [
        'titel', 'verlag', 'typ', 'serie', 'nummer', 'format', 'jahr', 'zustand',
        'bezugsquelle', 'sprache', 'preis', 'bestand', 'kaufdatum',
        'gelesen_am', 'bewertung', 'limitierung', 'limitiert_auf',
        'variant', 'variantname', 'bemerkung'
    ];
    
    const aggregated = {};
    const diffFields = new Set();
    
    fields.forEach(field => {
        const firstVal = selectedComics[0][field];
        const allSame = selectedComics.every(c => {
            const val = c[field];
            const isEmptyA = firstVal === undefined || firstVal === null || firstVal === '';
            const isEmptyB = val === undefined || val === null || val === '';
            if (isEmptyA && isEmptyB) return true;
            if (isEmptyA || isEmptyB) return false;
            return String(val) === String(firstVal);
        });
        
        if (allSame) {
            const isEmpty = firstVal === undefined || firstVal === null || firstVal === '';
            aggregated[field] = isEmpty ? '' : firstVal;
        } else {
            aggregated[field] = null;
            diffFields.add(field);
        }
    });
    
    form.innerHTML = generateBulkFormHtml(aggregated, diffFields, suggestions);
    
    initStarRating(aggregated.bewertung || 0);
    
    if (diffFields.has('bewertung')) {
        const starContainer = form.querySelector('.star-rating');
        if (starContainer) {
            const note = document.createElement('span');
            note.id = 'bulk-bewertung-note';
            note.style.fontSize = '0.8rem';
            note.style.color = 'var(--text-secondary)';
            note.style.marginLeft = '8px';
            note.textContent = '(verschiedene Bewertungen)';
            starContainer.parentNode.appendChild(note);
        }
    }
    
    // Autocomplete for standard input fields
    Object.keys(suggestions).forEach(field => {
        const input = form.querySelector(`input[name="${field}"]`);
        if (input) {
            initAutocomplete(input, suggestions[field]);
        }
    });
    
    // Watch modifications to track dirty fields
    const formControls = form.querySelectorAll('input, select, textarea');
    formControls.forEach(ctrl => {
        const name = ctrl.name;
        if (!name) return;
        
        const handleDirty = () => {
            dirtyFields.add(name);
            if (diffFields.has(name)) {
                ctrl.classList.remove('bulk-different-value');
            }
        };
        
        ctrl.addEventListener('input', handleDirty);
        ctrl.addEventListener('change', handleDirty);
    });
    
    const ratingInput = form.querySelector('input[name="bewertung"]');
    if (ratingInput) {
        ratingInput.addEventListener('change', () => {
            dirtyFields.add('bewertung');
            const note = document.getElementById('bulk-bewertung-note');
            if (note) note.remove();
        });
    }
    
    modal.style.display = 'flex';
    setTimeout(() => modal.style.opacity = '1', 10);
}


