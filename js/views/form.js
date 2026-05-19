import { db } from '../db.js';
import { toInputDate, toGermanDate } from '../utils.js';

const modal = document.getElementById('comic-modal');
const form = document.getElementById('comic-form');
const btnClose = document.getElementById('btn-close-modal');
const btnCancel = document.getElementById('btn-cancel-modal');
const btnSave = document.getElementById('btn-save-comic');
const btnDelete = document.getElementById('btn-delete-comic');
const modalTitle = document.getElementById('modal-title');

let currentEditingId = null;

export async function openModal(comic = null, isWishlist = false) {
    currentEditingId = comic ? comic.id : null;
    modalTitle.textContent = comic ? 'Comic bearbeiten' : 'Neuer Comic';
    
    // Bestehende Werte für Autovervollständigung laden
    const suggestions = await getSuggestions();
    const settings = db.getSettings();
    
    // Standardwerte für neue Comics
    const defaults = !comic ? {
        sprache: settings.defaultLanguage || 'Deutsch',
        zustand: settings.defaultCondition || 'neu',
        verlag: settings.defaultPublisher || ''
    } : {};
    
    form.innerHTML = generateFormHtml(comic, isWishlist, suggestions, defaults);
    
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
        comicData.isbn = formData.get('isbn');
        comicData.vorbestellt = formData.get('vorbestellt') === 'true';
        comicData.besonderheit = formData.get('besonderheit');
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
    }

    closeModal();
    
    if (window.app) {
        window.app.navigate(isWishlist ? 'wishlist' : 'collection');
    }
});

function initStarRating(currentValue) {
    const starRatingContainer = document.querySelector('.star-rating');
    if (!starRatingContainer) return;

    const stars = starRatingContainer.querySelectorAll('.star');
    const input = document.querySelector('input[name="bewertung"]');
    
    const updateStarsUI = (val) => {
        stars.forEach(star => {
            const index = parseInt(star.dataset.index);
            star.classList.remove('full', 'half');
            star.querySelector('i').className = 'fa-regular fa-star';
            
            if (val >= index * 2) {
                star.classList.add('full');
                star.querySelector('i').className = 'fa-solid fa-star';
            } else if (val === index * 2 - 1) {
                star.classList.add('half');
                star.querySelector('i').className = 'fa-regular fa-star'; // CSS handles the half star
            } else {
                star.querySelector('i').style.opacity = '0.3';
            }
            
            if (val >= index * 2 - 1) {
                star.querySelector('i').style.opacity = '1';
            }
        });
    };

    stars.forEach(star => {
        star.addEventListener('click', () => {
            const index = parseInt(star.dataset.index);
            let newVal;
            const currentVal = parseInt(input.value) || 0;
            
            if (currentVal === index * 2) {
                newVal = index * 2 - 1; // Halber Stern
            } else {
                newVal = index * 2; // Ganzer Stern
            }
            
            input.value = newVal;
            updateStarsUI(newVal);
        });
    });
    
    document.getElementById('btn-clear-rating')?.addEventListener('click', (e) => {
        e.preventDefault();
        input.value = 0;
        updateStarsUI(0);
    });

    updateStarsUI(currentValue);
}

function generateFormHtml(comic = {}, isWishlist = false, s = {}, defaults = {}) {
    const c = comic || {};
    form.dataset.isWishlist = isWishlist;
    const settings = db.getSettings();
    const currency = settings.currency || '€';
    
    if (isWishlist) {
        return `
            <div class="form-grid">
                <div class="form-group full-width">
                    <label class="form-label required">Name / Titel</label>
                    <input type="text" name="titel" class="form-control" required value="${c.titel || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Typ</label>
                    <input type="text" name="typ" class="form-control" value="${c.typ || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Format</label>
                    <input type="text" name="format" class="form-control" value="${c.format || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Preis (${currency})</label>
                    <input type="number" step="0.01" name="preis" class="form-control" value="${(c.preis !== undefined && c.preis !== null) ? c.preis : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Jahr (Serie/Release)</label>
                    <input type="number" name="jahr" class="form-control" value="${c.jahr || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">ISBN</label>
                    <input type="text" name="isbn" class="form-control" value="${c.isbn || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Vorbestellt?</label>
                    <select name="vorbestellt" class="form-control">
                        <option value="false" ${!c.vorbestellt ? 'selected' : ''}>Nein</option>
                        <option value="true" ${c.vorbestellt ? 'selected' : ''}>Ja</option>
                    </select>
                </div>
                <div class="form-group full-width">
                    <label class="form-label">Besonderheit</label>
                    <input type="text" name="besonderheit" class="form-control" value="${c.besonderheit || ''}" placeholder="z.B. Signiert, Erstauflage">
                </div>
                <div class="form-group full-width">
                    <label class="form-label">Bemerkung</label>
                    <textarea name="bemerkung" class="form-control" rows="3">${c.bemerkung || ''}</textarea>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="form-grid">
            <div class="form-group full-width">
                <label class="form-label required">Titel</label>
                <input type="text" name="titel" class="form-control" required value="${c.titel || ''}" placeholder="z.B. Batman: Year One">
            </div>
            
            <div class="form-group">
                <label class="form-label">Verlag</label>
                <input type="text" name="verlag" class="form-control" value="${c.verlag || defaults.verlag || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Typ</label>
                <input type="text" name="typ" class="form-control" value="${c.typ || ''}">
            </div>
            
            <div class="form-group">
                <label class="form-label">Serie</label>
                <input type="text" name="serie" class="form-control" value="${c.serie || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Nummer</label>
                <input type="number" name="nummer" class="form-control" value="${(c.nummer !== undefined && c.nummer !== null) ? c.nummer : ''}">
            </div>

            <div class="form-group">
                <label class="form-label">Format</label>
                <input type="text" name="format" class="form-control" value="${c.format || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Jahr (Serie/Release)</label>
                <input type="number" name="jahr" class="form-control" value="${c.jahr || ''}" min="1900" max="2100">
            </div>

            <div class="form-group">
                <label class="form-label">Zustand bei Kauf</label>
                <input type="text" name="zustand" class="form-control" value="${c.zustand || defaults.zustand || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Bezugsquelle</label>
                <input type="text" name="bezugsquelle" class="form-control" value="${c.bezugsquelle || ''}">
            </div>

            <div class="form-group">
                <label class="form-label">Sprache</label>
                <input type="text" name="sprache" class="form-control" value="${c.sprache || defaults.sprache || 'Deutsch'}">
            </div>
            <div class="form-group">
                <label class="form-label">Preis (${currency})</label>
                <input type="number" step="0.01" name="preis" class="form-control" value="${(c.preis !== undefined && c.preis !== null) ? c.preis : ''}">
            </div>

            <div class="form-group">
                <label class="form-label">Bestand</label>
                <input type="text" name="bestand" class="form-control" value="${c.bestand || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Kaufdatum</label>
                <input type="date" name="kaufdatum" class="form-control" value="${toInputDate(c.kaufdatum)}">
            </div>
            <div class="form-group">
                <label class="form-label">Gelesen am</label>
                <input type="date" name="gelesen_am" class="form-control" value="${toInputDate(c.gelesen_am)}">
            </div>
            <div class="form-group">
                <label class="form-label">Bewertung</label>
                <div style="display: flex; align-items: center; height: 38px;">
                    <div class="star-rating">
                        <span class="star" data-index="1"><i class="fa-regular fa-star"></i></span>
                        <span class="star" data-index="2"><i class="fa-regular fa-star"></i></span>
                        <span class="star" data-index="3"><i class="fa-regular fa-star"></i></span>
                        <span class="star" data-index="4"><i class="fa-regular fa-star"></i></span>
                        <span class="star" data-index="5"><i class="fa-regular fa-star"></i></span>
                    </div>
                    <button id="btn-clear-rating" class="btn-clear-rating" title="Bewertung löschen">
                        <i class="fa-solid fa-circle-xmark"></i>
                    </button>
                    <input type="hidden" name="bewertung" value="${c.bewertung || 0}">
                </div>
            </div>

            <div class="form-group full-width">
                <div style="display: grid; grid-template-columns: 0.7fr 0.7fr 0.7fr 1.9fr; gap: 20px;">
                    <div class="form-group">
                        <label class="form-label">Limitierung</label>
                        <select name="limitierung" class="form-control">
                            <option value="false" ${!c.limitierung ? 'selected' : ''}>Nein</option>
                            <option value="true" ${c.limitierung ? 'selected' : ''}>Ja</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Limitiert auf (Stück)</label>
                        <input type="number" name="limitiert_auf" class="form-control" value="${(c.limitiert_auf !== undefined && c.limitiert_auf !== null) ? c.limitiert_auf : ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Variant-Cover</label>
                        <select name="variant" class="form-control">
                            <option value="false" ${!c.variant ? 'selected' : ''}>Nein</option>
                            <option value="true" ${c.variant ? 'selected' : ''}>Ja</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Variantname</label>
                        <input type="text" name="variantname" class="form-control" value="${c.variantname || ''}">
                    </div>
                </div>
            </div>

            <div class="form-group full-width">
                <label class="form-label">Bemerkung</label>
                <textarea name="bemerkung" class="form-control" rows="3">${c.bemerkung || ''}</textarea>
            </div>
        </div>
    `;
}

export function initAutocomplete(input, suggestionsList) {
    if (!input || !suggestionsList || suggestionsList.length === 0) return;

    // Browser-eigenes Autocomplete deaktivieren, um doppelte Overlays zu verhindern
    input.setAttribute('autocomplete', 'off');

    let activeIndex = -1;
    let dropdown = null;
    let isSelecting = false;

    const removeDropdown = () => {
        if (dropdown) {
            dropdown.remove();
            dropdown = null;
        }
        activeIndex = -1;
    };

    const renderDropdown = (items) => {
        removeDropdown();
        if (items.length === 0) return;

        dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';

        items.forEach((item) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'autocomplete-item';
            itemDiv.textContent = item;
            
            itemDiv.addEventListener('mousedown', (e) => {
                // Prevent input blur before click finishes
                e.preventDefault();
                isSelecting = true;
                input.value = item;
                removeDropdown();
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                isSelecting = false;
            });

            dropdown.appendChild(itemDiv);
        });

        // Append to parent form-group
        input.parentNode.appendChild(dropdown);
    };

    const updateSelection = () => {
        if (!dropdown) return;
        const items = dropdown.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            if (index === activeIndex) {
                item.classList.add('active');
                // Scroll into view if needed
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    };

    const handleInput = () => {
        if (isSelecting) return;
        const val = input.value.trim().toLowerCase();
        if (!val) {
            renderDropdown(suggestionsList);
            return;
        }

        const filtered = suggestionsList.filter(item => 
            item.toLowerCase().includes(val)
        );

        renderDropdown(filtered);
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('focus', handleInput);

    input.addEventListener('blur', () => {
        // We use setTimeout so mousedown events on items can fire first
        setTimeout(removeDropdown, 200);
    });

    input.addEventListener('keydown', (e) => {
        if (!dropdown) return;
        const items = dropdown.querySelectorAll('.autocomplete-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % items.length;
            updateSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + items.length) % items.length;
            updateSelection();
        } else if (e.key === 'Enter') {
            if (activeIndex > -1 && items[activeIndex]) {
                e.preventDefault();
                isSelecting = true;
                input.value = items[activeIndex].textContent;
                removeDropdown();
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                isSelecting = false;
            }
        } else if (e.key === 'Escape') {
            removeDropdown();
        }
    });
}
