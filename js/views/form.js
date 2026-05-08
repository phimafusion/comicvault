import { db } from '../db.js';

const modal = document.getElementById('comic-modal');
const form = document.getElementById('comic-form');
const btnClose = document.getElementById('btn-close-modal');
const btnCancel = document.getElementById('btn-cancel-modal');
const btnSave = document.getElementById('btn-save-comic');
const btnDelete = document.getElementById('btn-delete-comic');
const modalTitle = document.getElementById('modal-title');

let currentEditingId = null;

function toInputDate(dateStr) {
    if (!dateStr) return '';
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    const parts = dateStr.split('.');
    if (parts.length === 3) {
        let [d, m, y] = parts;
        if (d.length === 1) d = '0' + d;
        if (m.length === 1) m = '0' + m;
        if (y.length === 2) {
            const yr = parseInt(y);
            y = (yr > 50 ? '19' : '20') + y;
        }
        return `${y}-${m}-${d}`;
    }
    return dateStr;
}

function toGermanDate(dateStr) {
    if (!dateStr) return '';
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = dateStr.split('-');
        return `${d}.${m}.${y}`;
    }
    return dateStr;
}

export async function openModal(comic = null, isWishlist = false) {
    currentEditingId = comic ? comic.id : null;
    modalTitle.textContent = comic ? 'Comic bearbeiten' : 'Neuer Comic';
    
    // Bestehende Werte für Autovervollständigung laden
    const suggestions = await getSuggestions();
    
    form.innerHTML = generateFormHtml(comic, isWishlist, suggestions);
    
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
    const fields = ['typ', 'format', 'verlag', 'zustand', 'bestand', 'serie', 'sprache', 'bezugsquelle', 'besonderheit'];
    const suggestions = {};
    fields.forEach(f => suggestions[f] = new Set());

    // Standardwerte hinzufügen
    ['Comic', 'Manga', 'Graphic Novel', 'Artbook'].forEach(v => suggestions.typ.add(v));
    ['Softcover', 'Hardcover', 'Heft', 'Album', 'Omnibus', 'Absolute'].forEach(v => suggestions.format.add(v));
    ['Panini', 'Carlsen', 'Splitter', 'Egmont', 'Manga Cult', 'Kazé', 'Altraverse', 'Cross Cult', 'Marvel', 'DC'].forEach(v => suggestions.verlag.add(v));
    ['neu', 'gebraucht'].forEach(v => suggestions.zustand.add(v));
    ['vorhanden', 'vorbestellt', 'verkauft', 'abgegeben'].forEach(v => suggestions.bestand.add(v));

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

function generateFormHtml(comic = {}, isWishlist = false, s = {}) {
    const c = comic || {};
    form.dataset.isWishlist = isWishlist;
    
    const renderDatalist = (id, options) => `
        <datalist id="${id}">
            ${(options || []).map(v => `<option value="${v}">`).join('')}
        </datalist>
    `;

    if (isWishlist) {
        return `
            <div class="form-grid">
                <div class="form-group full-width">
                    <label class="form-label required">Name / Titel</label>
                    <input type="text" name="titel" class="form-control" required value="${c.titel || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Typ</label>
                    <input type="text" name="typ" list="typ-list" class="form-control" value="${c.typ || ''}">
                    ${renderDatalist('typ-list', s.typ)}
                </div>
                <div class="form-group">
                    <label class="form-label">Format</label>
                    <input type="text" name="format" list="format-list" class="form-control" value="${c.format || ''}">
                    ${renderDatalist('format-list', s.format)}
                </div>
                <div class="form-group">
                    <label class="form-label">Preis (€)</label>
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
                    <input type="text" name="besonderheit" list="besonderheit-list" class="form-control" value="${c.besonderheit || ''}" placeholder="z.B. Signiert, Erstauflage">
                    ${renderDatalist('besonderheit-list', s.besonderheit)}
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
                <input type="text" name="verlag" list="verlag-list" class="form-control" value="${c.verlag || ''}">
                ${renderDatalist('verlag-list', s.verlag)}
            </div>
            <div class="form-group">
                <label class="form-label">Typ</label>
                <input type="text" name="typ" list="typ-list" class="form-control" value="${c.typ || ''}">
                ${renderDatalist('typ-list', s.typ)}
            </div>
            
            <div class="form-group">
                <label class="form-label">Serie</label>
                <input type="text" name="serie" list="serie-list" class="form-control" value="${c.serie || ''}">
                ${renderDatalist('serie-list', s.serie)}
            </div>
            <div class="form-group">
                <label class="form-label">Nummer</label>
                <input type="number" name="nummer" class="form-control" value="${(c.nummer !== undefined && c.nummer !== null) ? c.nummer : ''}">
            </div>

            <div class="form-group">
                <label class="form-label">Format</label>
                <input type="text" name="format" list="format-list" class="form-control" value="${c.format || ''}">
                ${renderDatalist('format-list', s.format)}
            </div>
            <div class="form-group">
                <label class="form-label">Jahr (Serie/Release)</label>
                <input type="number" name="jahr" class="form-control" value="${c.jahr || ''}" min="1900" max="2100">
            </div>

            <div class="form-group">
                <label class="form-label">Zustand bei Kauf</label>
                <input type="text" name="zustand" list="zustand-list" class="form-control" value="${c.zustand || ''}">
                ${renderDatalist('zustand-list', s.zustand)}
            </div>
            <div class="form-group">
                <label class="form-label">Bezugsquelle</label>
                <input type="text" name="bezugsquelle" list="bezugsquelle-list" class="form-control" value="${c.bezugsquelle || ''}">
                ${renderDatalist('bezugsquelle-list', s.bezugsquelle)}
            </div>

            <div class="form-group">
                <label class="form-label">Sprache</label>
                <input type="text" name="sprache" list="sprache-list" class="form-control" value="${c.sprache || 'Deutsch'}">
                ${renderDatalist('sprache-list', s.sprache)}
            </div>
            <div class="form-group">
                <label class="form-label">Preis (€)</label>
                <input type="number" step="0.01" name="preis" class="form-control" value="${(c.preis !== undefined && c.preis !== null) ? c.preis : ''}">
            </div>

            <div class="form-group">
                <label class="form-label">Bestand</label>
                <input type="text" name="bestand" list="bestand-list" class="form-control" value="${c.bestand || ''}">
                ${renderDatalist('bestand-list', s.bestand)}
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
                <label class="form-label">Bewertung (1-10)</label>
                <input type="number" name="bewertung" class="form-control" min="0" max="10" value="${c.bewertung || 0}" title="1-10 (10 = 5 Sterne)">
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
