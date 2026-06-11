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
        imgBlock = `<div class="comic-cover-container"><img src="${imgUrl}" alt="${comic.titel}" class="comic-cover" onerror="this.onerror=null; this.src='${getPlaceholderImage()}';"></div>`;
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
            extraFields += `<div style="font-size: 0.72rem; color: rgba(255, 255, 255, 0.75); margin-top: 2px;"><strong>${FIELD_CONFIG[key].label}:</strong> ${val}</div>`;
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

    let badgesBlock = '';
    const unreadBadge = !comic.gelesen_am ? `<span class="comic-card-badge badge-unread">Ungelesen</span>` : '';
    const bestandLabel = comic.bestand || '';
    const bestandBadge = bestandLabel ? `<span class="comic-card-badge badge-bestand-${bestandLabel.toLowerCase().replace(/\s+/g, '-')}">${bestandLabel}</span>` : '';
    if (unreadBadge || bestandBadge) {
        badgesBlock = `<div class="comic-card-badges">${unreadBadge}${bestandBadge}</div>`;
    }

    return `
        <div class="comic-card comic-item ${isSelected ? 'selected' : ''}" data-id="${comic.id}">
            ${selectBlock}
            <button class="btn-delete-item" data-id="${comic.id}" title="Löschen">
                <i class="fa-solid fa-trash"></i>
            </button>
            ${badgesBlock}
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
    const gridTemplateColumns = selectColumn + visibleFields.list.map(key => `var(--col-width-${key})`).join(' ') + ' 70px';
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

    const readBtn = !comic.gelesen_am ? `
        <button class="btn-mark-read list-read-btn" data-id="${comic.id}" title="Als gelesen markieren">
            <i class="fa-solid fa-check"></i>
        </button>
    ` : '';

    return `
        <div class="list-item comic-item ${isSelected ? 'selected' : ''}" data-id="${comic.id}" style="display: grid; grid-template-columns: ${gridTemplateColumns}; padding: 12px 20px; align-items: center; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 10px; cursor: pointer; font-size: 0.82rem; background: var(--bg-surface);">
            ${selectCell}
            ${cells}
            <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
                ${readBtn}
                <button class="btn-delete-item list-delete-btn" data-id="${comic.id}" title="Löschen">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

function getConditionBadge(zustand) {
    if (!zustand) return '-';
    const z = zustand.toLowerCase().trim();
    let colorClass = 'badge-condition-default';
    
    if (z.includes('mint') || z.includes('nm') || z === 'neu' || z === '0-1' || z === '1' || z === '0.5' || z === '0') {
        colorClass = 'badge-condition-mint';
    } else if (z.includes('fine') || z.includes('vf') || z.includes('fn') || z === 'sehr gut' || z === 'sehr-gut' || z === '1-2' || z === '1.5') {
        colorClass = 'badge-condition-fine';
    } else if (z.includes('good') || z.includes('vg') || z.includes('gd') || z === 'gut' || z === '2' || z === '2-3') {
        colorClass = 'badge-condition-good';
    } else if (z.includes('fair') || z.includes('poor') || z.includes('fr') || z.includes('pr') || z === 'schlecht' || z === '3' || z === '4' || z === '5') {
        colorClass = 'badge-condition-poor';
    }
    
    return `<span class="badge ${colorClass}">${zustand}</span>`;
}

export function renderDetailsItem(comic, visibleFields, isSelectModeActive, selectedComicIds) {
    const isSelected = selectedComicIds.has(comic.id);
    const bestandClass = `badge-${String(comic.bestand || '').toLowerCase().replace(/\s+/g, '-')}`;
    
    let imgBlock = '';
    if (visibleFields.details.includes('bild')) {
        const imgUrl = comic.bild || getPlaceholderImage();
        imgBlock = `
            <div class="details-cover-wrapper">
                <img src="${imgUrl}" alt="${comic.titel}" class="details-cover" onerror="this.onerror=null; this.src='${getPlaceholderImage()}';">
            </div>
        `;
    }

    const serieVal = comic.serie ? `${comic.serie} ${comic.nummer ? '#' + comic.nummer : ''}` : '';
    const verlagVal = comic.verlag || '';
    const subVal = [serieVal, verlagVal].filter(Boolean).join(' • ');

    let headerBlock = '';
    if (visibleFields.details.includes('titel') || visibleFields.details.includes('serie')) {
        headerBlock = `
            ${visibleFields.details.includes('serie') && subVal ? `<span class="comic-series">${subVal}</span>` : ''}
            ${visibleFields.details.includes('titel') ? `<h3 class="comic-title">${comic.titel || 'Ohne Titel'}</h3>` : ''}
        `;
    }

    const stdNonGridFields = ['bild', 'serie', 'titel', 'bestand', 'bewertung', 'bemerkung'];
    let gridFieldsHtml = '';
    visibleFields.details.forEach(key => {
        if (!stdNonGridFields.includes(key)) {
            let val = comic[key];
            if (val === undefined || val === null || val === '') {
                val = '-';
            } else {
                if (key === 'preis') {
                    val = Number(comic.preis).toFixed(2) + ' ' + (db.getSettings().currency || '€');
                } else if (key === 'kaufdatum' || key === 'gelesen_am' || key === 'updated_at' || key === 'created_at') {
                    val = displayDate(val);
                } else if (key === 'zustand') {
                    val = getConditionBadge(val);
                }
            }
            gridFieldsHtml += `
                <div class="spec-item">
                    <span class="spec-label">${FIELD_CONFIG[key].label}</span>
                    <span class="spec-value">${val}</span>
                </div>
            `;
        }
    });
    
    let starsBlock = '';
    if (visibleFields.details.includes('bewertung') && comic.bewertung) {
        starsBlock = `<div style="margin-top: 8px;">${renderStars(comic.bewertung)}</div>`;
    }

    let statusBlock = '';
    if (visibleFields.details.includes('bestand')) {
        statusBlock = `
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 10px;">
                <span style="font-size: 0.72rem; color: var(--text-secondary); font-weight: 700; text-transform: uppercase;">Status:</span>
                <span class="badge ${bestandClass}">${comic.bestand || '-'}</span>
            </div>
        `;
    }

    let remarksHtml = '';
    if (comic.bemerkung) {
        remarksHtml = `
            <div class="remarks-notepad">
                <div class="notepad-header">
                    <i class="fa-solid fa-note-sticky"></i> Bemerkungen
                </div>
                <div class="notepad-body">${comic.bemerkung}</div>
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

    // Details Action Bar
    const actionButtons = `
        <div class="details-action-bar">
            <button class="btn btn-secondary btn-edit-item" data-id="${comic.id}" title="Bearbeiten">
                <i class="fa-solid fa-pen-to-square"></i> Bearbeiten
            </button>
            ${!comic.gelesen_am ? `
            <button class="btn btn-primary btn-mark-read" data-id="${comic.id}" title="Als gelesen markieren">
                <i class="fa-solid fa-check"></i> Gelesen
            </button>
            ` : ''}
            <button class="btn btn-danger btn-delete-item" data-id="${comic.id}" title="Löschen">
                <i class="fa-solid fa-trash"></i> Löschen
            </button>
        </div>
    `;

    return `
        <div class="details-card comic-item ${isSelected ? 'selected' : ''}" data-id="${comic.id}">
            ${selectBlock}
            ${imgBlock}
            <div class="details-info">
                ${headerBlock}
                ${starsBlock}
                <div class="details-specs-grid">
                    ${gridFieldsHtml}
                </div>
                ${statusBlock}
                ${remarksHtml}
                ${actionButtons}
            </div>
        </div>
    `;
}
