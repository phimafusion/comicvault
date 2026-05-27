import { db } from '../../db.js';
import { toInputDate } from '../../utils.js';

export function generateFormHtml(comic = {}, isWishlist = false, s = {}, defaults = {}) {
    const c = comic || {};
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
                    <label class="form-label">Vorbestellt?</label>
                    <select name="vorbestellt" class="form-control">
                        <option value="false" ${!c.vorbestellt ? 'selected' : ''}>Nein</option>
                        <option value="true" ${c.vorbestellt ? 'selected' : ''}>Ja</option>
                    </select>
                </div>
                <div class="form-group full-width">
                    <label class="form-label">Bemerkung (Wunschliste)</label>
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

export function generateBulkFormHtml(c = {}, diffFields = new Set(), s = {}) {
    const settings = db.getSettings();
    const currency = settings.currency || '€';
    
    const fieldAttrs = (name, val) => {
        if (diffFields.has(name)) {
            return `value="" placeholder="<verschiedene Werte>" class="form-control bulk-different-value"`;
        }
        return `value="${val !== undefined && val !== null ? val : ''}" class="form-control"`;
    };
    
    const dateAttrs = (name, val) => {
        if (diffFields.has(name)) {
            return `value="" class="form-control bulk-different-value" data-placeholder="<verschiedene Werte>"`;
        }
        return `value="${toInputDate(val)}" class="form-control"`;
    };
    
    const selectOptions = (name, val) => {
        const hasDiff = diffFields.has(name);
        const isTrue = val === true || val === 'true';
        const isFalse = val === false || val === 'false';
        
        return `
            ${hasDiff ? '<option value="" disabled selected>&lt;verschiedene Werte&gt;</option>' : ''}
            <option value="false" ${!hasDiff && isFalse ? 'selected' : ''}>Nein</option>
            <option value="true" ${!hasDiff && isTrue ? 'selected' : ''}>Ja</option>
        `;
    };

    return `
        <div class="form-grid">
            <div class="form-group full-width">
                <label class="form-label">Titel</label>
                <input type="text" name="titel" ${fieldAttrs('titel', c.titel)}>
            </div>
            
            <div class="form-group">
                <label class="form-label">Verlag</label>
                <input type="text" name="verlag" ${fieldAttrs('verlag', c.verlag)}>
            </div>
            <div class="form-group">
                <label class="form-label">Typ</label>
                <input type="text" name="typ" ${fieldAttrs('typ', c.typ)}>
            </div>
            
            <div class="form-group">
                <label class="form-label">Serie</label>
                <input type="text" name="serie" ${fieldAttrs('serie', c.serie)}>
            </div>
            <div class="form-group">
                <label class="form-label">Nummer</label>
                <input type="number" name="nummer" ${fieldAttrs('nummer', c.nummer)}>
            </div>

            <div class="form-group">
                <label class="form-label">Format</label>
                <input type="text" name="format" ${fieldAttrs('format', c.format)}>
            </div>
            <div class="form-group">
                <label class="form-label">Jahr (Serie/Release)</label>
                <input type="number" name="jahr" ${fieldAttrs('jahr', c.jahr)} min="1900" max="2100">
            </div>

            <div class="form-group">
                <label class="form-label">Zustand bei Kauf</label>
                <input type="text" name="zustand" ${fieldAttrs('zustand', c.zustand)}>
            </div>
            <div class="form-group">
                <label class="form-label">Bezugsquelle</label>
                <input type="text" name="bezugsquelle" ${fieldAttrs('bezugsquelle', c.bezugsquelle)}>
            </div>

            <div class="form-group">
                <label class="form-label">Sprache</label>
                <input type="text" name="sprache" ${fieldAttrs('sprache', c.sprache)}>
            </div>
            <div class="form-group">
                <label class="form-label">Preis (${currency})</label>
                <input type="number" step="0.01" name="preis" ${fieldAttrs('preis', c.preis)}>
            </div>

            <div class="form-group">
                <label class="form-label">Bestand</label>
                <input type="text" name="bestand" ${fieldAttrs('bestand', c.bestand)}>
            </div>
            <div class="form-group">
                <label class="form-label">Kaufdatum</label>
                <input type="date" name="kaufdatum" ${dateAttrs('kaufdatum', c.kaufdatum)}>
            </div>
            <div class="form-group">
                <label class="form-label">Gelesen am</label>
                <input type="date" name="gelesen_am" ${dateAttrs('gelesen_am', c.gelesen_am)}>
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
                    <input type="hidden" name="bewertung" value="${c.bewertung !== undefined && c.bewertung !== null ? c.bewertung : 0}">
                </div>
            </div>

            <div class="form-group full-width">
                <div style="display: grid; grid-template-columns: 0.7fr 0.7fr 0.7fr 1.9fr; gap: 20px;">
                    <div class="form-group">
                        <label class="form-label">Limitierung</label>
                        <select name="limitierung" class="form-control">
                            ${selectOptions('limitierung', c.limitierung)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Limitiert auf (Stück)</label>
                        <input type="number" name="limitiert_auf" ${fieldAttrs('limitiert_auf', c.limitiert_auf)}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Variant-Cover</label>
                        <select name="variant" class="form-control">
                            ${selectOptions('variant', c.variant)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Variantname</label>
                        <input type="text" name="variantname" ${fieldAttrs('variantname', c.variantname)}>
                    </div>
                </div>
            </div>

            <div class="form-group full-width">
                <label class="form-label">Bemerkung</label>
                <textarea name="bemerkung" class="form-control" rows="3" placeholder="${diffFields.has('bemerkung') ? '<verschiedene Werte>' : ''}">${!diffFields.has('bemerkung') && c.bemerkung !== undefined && c.bemerkung !== null ? c.bemerkung : ''}</textarea>
            </div>
        </div>
    `;
}
