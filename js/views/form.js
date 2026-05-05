import { db } from '../db.js';

const modal = document.getElementById('comic-modal');
const form = document.getElementById('comic-form');
const btnClose = document.getElementById('btn-close-modal');
const btnCancel = document.getElementById('btn-cancel-modal');
const btnSave = document.getElementById('btn-save-comic');
const modalTitle = document.getElementById('modal-title');

let currentEditingId = null;

export function openModal(comic = null, isWishlist = false) {
    currentEditingId = comic ? comic.id : null;
    modalTitle.textContent = comic ? 'Comic bearbeiten' : 'Neuer Comic';
    
    form.innerHTML = generateFormHtml(comic, isWishlist);
    
    modal.style.display = 'flex';
    setTimeout(() => modal.style.opacity = '1', 10);
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
        // ... alle anderen Felder für normale Comics
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
            kaufdatum: formData.get('kaufdatum'),
            bestand: formData.get('bestand'),
            gelesen_am: formData.get('gelesen_am'),
            bewertung: formData.get('bewertung') ? parseInt(formData.get('bewertung')) : 0,
            bild: formData.get('bild')
        });
        await db.saveComic(comicData);
    }

    closeModal();
    
    if (window.app) {
        window.app.navigate(isWishlist ? 'wishlist' : 'collection');
    }
});

function generateFormHtml(comic = {}, isWishlist = false) {
    const c = comic || {};
    form.dataset.isWishlist = isWishlist;
    
    const typOptions = ['Comic', 'Manga', 'Graphic Novel', 'Artbook'].map(v => `<option value="${v}" ${c.typ === v ? 'selected' : ''}>${v}</option>`).join('');
    const formatOptions = ['Softcover', 'Hardcover', 'Heft', 'Album', 'Omnibus', 'Absolute'].map(v => `<option value="${v}" ${c.format === v ? 'selected' : ''}>${v}</option>`).join('');

    if (isWishlist) {
        return `
            <div class="form-grid">
                <div class="form-group full-width">
                    <label class="form-label required">Name / Titel</label>
                    <input type="text" name="titel" class="form-control" required value="${c.titel || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label required">Typ</label>
                    <select name="typ" class="form-control" required>${typOptions}</select>
                </div>
                <div class="form-group">
                    <label class="form-label required">Format</label>
                    <select name="format" class="form-control" required>${formatOptions}</select>
                </div>
                <div class="form-group">
                    <label class="form-label">Preis (€)</label>
                    <input type="number" step="0.01" name="preis" class="form-control" value="${c.preis || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Veröffentlichung (Jahr)</label>
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
    
    // Normaler Comic-Teil ...
    const verlagOptions = ['Panini', 'Carlsen', 'Splitter', 'Egmont', 'Manga Cult', 'Kazé', 'Altraverse', 'Cross Cult', 'Marvel', 'DC'].map(v => `<option value="${v}" ${c.verlag === v ? 'selected' : ''}>${v}</option>`).join('');
    const zustandOptions = ['neu', 'gebraucht'].map(v => `<option value="${v}" ${c.zustand === v ? 'selected' : ''}>${v}</option>`).join('');
    const bestandOptions = ['vorhanden', 'vorbestellt', 'verkauft', 'abgegeben'].map(v => `<option value="${v}" ${c.bestand === v ? 'selected' : ''}>${v}</option>`).join('');

    return `
        <div class="form-grid">
            <div class="form-group full-width">
                <label class="form-label required">Titel</label>
                <input type="text" name="titel" class="form-control" required value="${c.titel || ''}" placeholder="z.B. Batman: Year One">
            </div>
            
            <div class="form-group">
                <label class="form-label required">Verlag</label>
                <select name="verlag" class="form-control" required>
                    <option value="">Bitte wählen...</option>
                    ${verlagOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label required">Typ</label>
                <select name="typ" class="form-control" required>
                    <option value="">Bitte wählen...</option>
                    ${typOptions}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Serie</label>
                <input type="text" name="serie" class="form-control" value="${c.serie || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Nummer</label>
                <input type="number" name="nummer" class="form-control" value="${c.nummer || ''}">
            </div>

            <div class="form-group">
                <label class="form-label required">Format</label>
                <select name="format" class="form-control" required>
                    <option value="">Bitte wählen...</option>
                    ${formatOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Jahr</label>
                <input type="number" name="jahr" class="form-control" value="${c.jahr || ''}" min="1900" max="2100">
            </div>

            <div class="form-group">
                <label class="form-label required">Zustand bei Kauf</label>
                <select name="zustand" class="form-control" required>
                    ${zustandOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label required">Bezugsquelle</label>
                <input type="text" name="bezugsquelle" class="form-control" required value="${c.bezugsquelle || ''}">
            </div>

            <div class="form-group">
                <label class="form-label required">Sprache</label>
                <input type="text" name="sprache" class="form-control" required value="${c.sprache || 'Deutsch'}">
            </div>
            <div class="form-group">
                <label class="form-label">Preis (€)</label>
                <input type="number" step="0.01" name="preis" class="form-control" value="${c.preis || ''}">
            </div>

            <div class="form-group">
                <label class="form-label required">Bestand</label>
                <select name="bestand" class="form-control" required>
                    ${bestandOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Kaufdatum</label>
                <input type="date" name="kaufdatum" class="form-control" value="${c.kaufdatum || ''}">
            </div>

            <div class="form-group">
                <label class="form-label">Limitierung</label>
                <select name="limitierung" class="form-control">
                    <option value="false" ${c.limitierung === false ? 'selected' : ''}>Nein</option>
                    <option value="true" ${c.limitierung === true ? 'selected' : ''}>Ja</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Limitiert auf (Stück)</label>
                <input type="number" name="limitiert_auf" class="form-control" value="${c.limitiert_auf || ''}">
            </div>

            <div class="form-group">
                <label class="form-label">Variant-Cover</label>
                <select name="variant" class="form-control">
                    <option value="false" ${c.variant === false ? 'selected' : ''}>Nein</option>
                    <option value="true" ${c.variant === true ? 'selected' : ''}>Ja</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Variantname</label>
                <input type="text" name="variantname" class="form-control" value="${c.variantname || ''}">
            </div>

            <div class="form-group">
                <label class="form-label">Gelesen am</label>
                <input type="date" name="gelesen_am" class="form-control" value="${c.gelesen_am || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Bewertung (1-10)</label>
                <input type="number" name="bewertung" class="form-control" min="0" max="10" value="${c.bewertung || 0}" title="1-10 (10 = 5 Sterne)">
            </div>

            <div class="form-group full-width">
                <label class="form-label">Bild URL</label>
                <input type="url" name="bild" class="form-control" value="${c.bild || ''}" placeholder="https://...">
            </div>

            <div class="form-group full-width">
                <label class="form-label">Bemerkung</label>
                <textarea name="bemerkung" class="form-control" rows="3">${c.bemerkung || ''}</textarea>
            </div>
        </div>
    `;
}
