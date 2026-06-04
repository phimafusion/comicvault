import { db } from '../../db.js';
import { displayDate, renderStars, getPlaceholderImage } from '../../utils.js';

export const FIELD_CONFIG = {
    titel: { label: 'Titel / Serie', defaultList: true, defaultTiles: true, defaultDetails: true, listWidth: 'minmax(150px, 1.5fr)' },
    nummer: { label: 'Nr.', defaultList: true, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(40px, auto)' },
    verlag: { label: 'Verlag', defaultList: true, defaultTiles: false, defaultDetails: true, listWidth: 'minmax(100px, 1.2fr)' },
    jahr: { label: 'Jahr', defaultList: true, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(50px, auto)' },
    bestand: { label: 'Bestand', defaultList: true, defaultTiles: true, defaultDetails: true, listWidth: 'minmax(90px, auto)' },
    bezugsquelle: { label: 'Quelle', defaultList: true, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(80px, 0.8fr)' },
    bewertung: { label: 'Bewertung', defaultList: true, defaultTiles: true, defaultDetails: true, listWidth: 'minmax(100px, auto)' },
    kaufdatum: { label: 'Gekauft', defaultList: true, defaultTiles: false, defaultDetails: true, listWidth: 'minmax(85px, auto)' },
    preis: { label: 'Preis', defaultList: true, defaultTiles: false, defaultDetails: true, listWidth: 'minmax(75px, auto)', align: 'right' },
    gelesen_am: { label: 'Gelesen', defaultList: true, defaultTiles: false, defaultDetails: true, listWidth: 'minmax(85px, auto)', align: 'right' },
    updated_at: { label: 'Änderung', defaultList: false, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(85px, auto)', align: 'right' },
    typ: { label: 'Typ', defaultList: false, defaultTiles: false, defaultDetails: true, listWidth: 'minmax(100px, 1fr)' },
    format: { label: 'Format', defaultList: false, defaultTiles: false, defaultDetails: true, listWidth: 'minmax(100px, 1fr)' },
    sprache: { label: 'Sprache', defaultList: false, defaultTiles: false, defaultDetails: true, listWidth: 'minmax(80px, auto)' },
    limitierung: { label: 'Limitierung', defaultList: false, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(80px, auto)' },
    variant: { label: 'Variant', defaultList: false, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(80px, auto)' },
    variantname: { label: 'Variantname', defaultList: false, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(100px, 1fr)' },
    zustand: { label: 'Zustand', defaultList: false, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(100px, auto)' },
    bemerkung: { label: 'Bemerkung', defaultList: false, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(150px, 2fr)' },
    bild: { label: 'Cover-Bild', defaultList: false, defaultTiles: true, defaultDetails: true, listWidth: '0' }
};

export const defaultVisibleFields = {
    list: Object.keys(FIELD_CONFIG).filter(k => FIELD_CONFIG[k].defaultList),
    tiles: Object.keys(FIELD_CONFIG).filter(k => FIELD_CONFIG[k].defaultTiles),
    details: Object.keys(FIELD_CONFIG).filter(k => FIELD_CONFIG[k].defaultDetails)
};

export function renderTile(comic, visibleFields, isSelectModeActive, selectedComicIds) {
    const bestandClass = `badge-${String(comic.bestand || '').toLowerCase().replace(/\s+/g, '-')}`;
    
    let imgBlock = '';
    if (visibleFields.tiles.includes('bild')) {
        const imgUrl = comic.bild || getPlaceholderImage();
        imgBlock = `<img src="${imgUrl}" alt="${comic.titel}" class="comic-cover" onerror="this.onerror=null; this.src='${getPlaceholderImage()}';">`;
    }

    const stdFields = ['bild', 'serie', 'titel', 'bewertung', 'bestand'];
    
    let serieBlock = '';
    if (visibleFields.tiles.includes('serie')) {
        serieBlock = `<span class="comic-series">${comic.serie || comic.verlag || ''} ${comic.nummer ? '#' + comic.nummer : ''}</span>`;
    }

    let titelBlock = '';
    if (visibleFields.tiles.includes('titel')) {
        titelBlock = `<h3 class="comic-title">${comic.titel || 'Ohne Titel'}</h3>`;
    }

    let metaBlock = '';
    if (visibleFields.tiles.includes('bewertung') || visibleFields.tiles.includes('bestand')) {
        let bewertung = visibleFields.tiles.includes('bewertung') ? `<span>${renderStars(comic.bewertung)}</span>` : '';
        let bestand = visibleFields.tiles.includes('bestand') ? `<span class="badge ${bestandClass}">${comic.bestand}</span>` : '';
        metaBlock = `<div class="comic-meta">${bewertung}${bestand}</div>`;
    }

    let extraFields = '';
    visibleFields.tiles.forEach(key => {
        if (!stdFields.includes(key)) {
            let val = comic[key] || '-';
            if (key === 'preis') val = (comic.preis !== null && comic.preis !== undefined) ? Number(comic.preis).toFixed(2) + ' ' + (db.getSettings().currency || '€') : '-';
            if (key === 'kaufdatum' || key === 'gelesen_am' || key === 'updated_at' || key === 'created_at') val = displayDate(val);
            extraFields += `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;"><strong>${FIELD_CONFIG[key].label}:</strong> ${val}</div>`;
        }
    });

    const isSelected = selectedComicIds.has(comic.id);
    let selectBlock = '';
    if (isSelectModeActive) {
        selectBlock = `
            <div class="bulk-checkbox-container">
                <input type="checkbox" class="bulk-item-checkbox" data-id="${comic.id}" ${isSelected ? 'checked' : ''}>
            </div>
        `;
    }

    return `
        <div class="comic-card comic-item ${isSelected ? 'selected' : ''}" data-id="${comic.id}">
            ${selectBlock}
            <button class="btn-delete-item" data-id="${comic.id}" title="Löschen">
                <i class="fa-solid fa-trash"></i>
            </button>
            ${imgBlock}
            <div class="comic-info">
                ${serieBlock}
                ${titelBlock}
                ${extraFields}
                <div style="flex: 1;"></div>
                ${metaBlock}
            </div>
        </div>
    `;
}

export function renderListItem(comic, visibleFields, isSelectModeActive, selectedComicIds) {
    const isSelected = selectedComicIds.has(comic.id);
    const selectColumn = isSelectModeActive ? '40px ' : '';
    const gridTemplateColumns = selectColumn + visibleFields.list.map(key => `var(--col-width-${key})`).join(' ') + ' 40px';
    const listFields = visibleFields.list.map(key => ({ 
        key, 
        ...FIELD_CONFIG[key]
    }));
    const bestandClass = `badge-${String(comic.bestand || '').toLowerCase().replace(/\s+/g, '-')}`;

    const renderCell = (field) => {
        let val = comic[field.key];
        const align = field.align ? `text-align: ${field.align}; padding-right: 10px;` : '';
        
        switch (field.key) {
            case 'titel':
                return `
                <div data-col="${field.key}" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 10px;">
                    <h3 class="comic-title" style="margin:0; font-size:0.88rem; display: inline;">${comic.titel || 'Ohne Titel'}</h3>
                    <div class="comic-series" style="font-size:0.68rem; color: var(--text-secondary);">${comic.serie || ''}</div>
                </div>`;
            case 'nummer':
                return `<div data-col="${field.key}" style="font-weight: bold;">${val !== null && val !== undefined ? '#' + val : '-'}</div>`;
            case 'bestand':
                return `<div data-col="${field.key}"><span class="badge ${bestandClass}" style="font-size: 0.62rem; padding: 2px 6px;">${comic.bestand || '-'}</span></div>`;
            case 'preis':
                return `<div data-col="${field.key}" style="font-weight: bold; ${align}">${(val !== null && val !== undefined) ? Number(val).toFixed(2) + ' ' + (db.getSettings().currency || '€') : '-'}</div>`;
            case 'kaufdatum':
                return `<div data-col="${field.key}" style="font-size: 0.78rem;">${displayDate(val)}</div>`;
            case 'gelesen_am':
            case 'updated_at':
            case 'created_at':
                return `<div data-col="${field.key}" style="${align} font-size: 0.78rem;">${displayDate(val || (field.key === 'updated_at' ? comic.created_at : ''), true)}</div>`;
            case 'bewertung':
                return `<div data-col="${field.key}" style="${align}">${renderStars(val)}</div>`;
            case 'bild':
                const imgUrl = comic.bild || getPlaceholderImage();
                return `<div data-col="${field.key}"><img src="${imgUrl}" style="height: 30px; border-radius: 4px; object-fit: cover;"></div>`;
            default:
                return `<div data-col="${field.key}" style="color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${align}">${val || '-'}</div>`;
        }
    };

    const cells = listFields.map(renderCell).join('');

    const selectCell = isSelectModeActive ? `
        <div style="display: flex; align-items: center; justify-content: center;">
            <input type="checkbox" class="bulk-item-checkbox" data-id="${comic.id}" ${isSelected ? 'checked' : ''} style="accent-color: var(--primary-color); width: 16px; height: 16px; cursor: pointer;">
        </div>
    ` : '';

    return `
        <div class="list-item comic-item ${isSelected ? 'selected' : ''}" data-id="${comic.id}" style="display: grid; grid-template-columns: ${gridTemplateColumns}; padding: 12px 20px; align-items: center; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 10px; cursor: pointer; font-size: 0.82rem; background: var(--bg-surface);">
            ${selectCell}
            ${cells}
            <div style="display: flex; justify-content: flex-end;">
                <button class="btn-delete-item list-delete-btn" data-id="${comic.id}" title="Löschen" style="background: none; border: none; color: #ff4444; opacity: 0.7; cursor: pointer; padding: 4px; transition: all 0.2s;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

export function renderDetailsItem(comic, visibleFields, isSelectModeActive, selectedComicIds) {
    const isSelected = selectedComicIds.has(comic.id);
    const bestandClass = `badge-${String(comic.bestand || '').toLowerCase().replace(/\s+/g, '-')}`;
    
    let imgBlock = '';
    if (visibleFields.details.includes('bild')) {
        const imgUrl = comic.bild || getPlaceholderImage();
        imgBlock = `<img src="${imgUrl}" alt="${comic.titel}" class="details-cover" onerror="this.onerror=null; this.src='${getPlaceholderImage()}';">`;
    }

    let headerBlock = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            ${visibleFields.details.includes('serie') ? `<span class="comic-series">${comic.serie || comic.verlag || ''} ${comic.nummer ? '#' + comic.nummer : ''}</span>` : '<div></div>'}
            <button class="btn-delete-item" data-id="${comic.id}" title="Löschen" style="background: none; border: none; color: #ff4444; cursor: pointer; padding: 4px; transition: transform 0.2s;">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
        ${visibleFields.details.includes('titel') ? `<h3 class="comic-title" style="font-size: 1.4rem; margin-bottom: 12px;">${comic.titel || 'Ohne Titel'}</h3>` : ''}
    `;

    const stdNonGridFields = ['bild', 'serie', 'titel', 'bestand', 'bewertung'];
    let gridFieldsHtml = '';
    visibleFields.details.forEach(key => {
        if (!stdNonGridFields.includes(key)) {
            let val = comic[key] || '-';
            if (key === 'preis') val = (comic.preis !== null && comic.preis !== undefined) ? Number(comic.preis).toFixed(2) + ' ' + (db.getSettings().currency || '€') : '-';
            if (key === 'kaufdatum' || key === 'gelesen_am' || key === 'updated_at' || key === 'created_at') val = displayDate(val);
            gridFieldsHtml += `<div><strong>${FIELD_CONFIG[key].label}:</strong> <span style="color: var(--text-primary);">${val}</span></div>`;
        }
    });
    
    let footerBlock = '';
    if (visibleFields.details.includes('bestand') || visibleFields.details.includes('bewertung')) {
        let bestand = visibleFields.details.includes('bestand') ? `<span class="badge ${bestandClass}">${comic.bestand || '-'}</span>` : '';
        let bewertung = visibleFields.details.includes('bewertung') ? `<span style="font-size: 1.1rem; color: var(--warning)">${renderStars(comic.bewertung)}</span>` : '';
        footerBlock = `
            <div style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center;">
                ${bestand}${bewertung}
            </div>
        `;
    }

    let selectBlock = '';
    if (isSelectModeActive) {
        selectBlock = `
            <div class="bulk-checkbox-container">
                <input type="checkbox" class="bulk-item-checkbox" data-id="${comic.id}" ${isSelected ? 'checked' : ''}>
            </div>
        `;
    }

    return `
        <div class="details-card comic-item ${isSelected ? 'selected' : ''}" data-id="${comic.id}">
            ${selectBlock}
            ${imgBlock}
            <div class="details-info">
                ${headerBlock}
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: auto;">
                    ${gridFieldsHtml}
                </div>
                ${footerBlock}
            </div>
        </div>
    `;
}
