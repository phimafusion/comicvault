import { db } from '../db.js';
import { openModal } from './form.js';

let currentViewType = 'tiles'; // 'tiles', 'list', 'details'
let searchTerm = '';

export function renderCollection(container) {
    const html = `
        <div class="view-controls">
            <h2 class="view-title">Sammlung</h2>
            <div class="view-toggles">
                <button class="view-toggle-btn ${currentViewType === 'list' ? 'active' : ''}" data-type="list" title="Listenansicht">
                    <i class="fa-solid fa-list"></i>
                </button>
                <button class="view-toggle-btn ${currentViewType === 'tiles' ? 'active' : ''}" data-type="tiles" title="Kachelansicht">
                    <i class="fa-solid fa-border-all"></i>
                </button>
                <button class="view-toggle-btn ${currentViewType === 'details' ? 'active' : ''}" data-type="details" title="Detailansicht">
                    <i class="fa-solid fa-table-cells-large"></i>
                </button>
            </div>
        </div>
        <div id="collection-grid" class="cards-grid">
            <!-- Items injected here -->
        </div>
    `;
    container.innerHTML = html;
    updateGrid();
}

export function attachCollectionEvents() {
    const toggleBtns = document.querySelectorAll('.view-toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            const targetBtn = e.currentTarget;
            targetBtn.classList.add('active');
            currentViewType = targetBtn.dataset.type;
            updateGrid();
        });
    });

    document.addEventListener('global-search', (e) => {
        searchTerm = e.detail.query.toLowerCase();
        updateGrid();
    });
}

async function updateGrid() {
    const grid = document.getElementById('collection-grid');
    if (!grid) return;

    let comics = await db.getAllComics();
    
    // Filter
    if (searchTerm) {
        comics = comics.filter(c => {
            return Object.values(c).some(val => 
                String(val).toLowerCase().includes(searchTerm)
            );
        });
    }

    grid.className = ''; // reset classes
    
    if (comics.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">Keine Comics gefunden.</p>';
        return;
    }

    if (currentViewType === 'tiles') {
        grid.classList.add('cards-grid');
        grid.innerHTML = comics.map(comic => renderTile(comic)).join('');
    } else if (currentViewType === 'list') {
        grid.classList.add('list-view');
        grid.innerHTML = comics.map(comic => renderListItem(comic)).join('');
    } else if (currentViewType === 'details') {
        grid.classList.add('details-grid');
        grid.innerHTML = comics.map(comic => renderDetailsItem(comic)).join('');
    }

    // Attach click events for editing
    grid.querySelectorAll('.comic-item').forEach(item => {
        item.addEventListener('click', async () => {
            const id = item.dataset.id;
            const allComics = await db.getAllComics();
            const comic = allComics.find(c => c.id === id);
            if (comic) {
                openModal(comic);
            }
        });
    });
}

function getPlaceholderImage() {
    // Generate a cool comic style placeholder if no image exists
    return `https://placehold.co/400x600/1e293b/06b6d4?text=POW!\\nBANG!&font=impact`;
}

function renderTile(comic) {
    const imgUrl = comic.bild || getPlaceholderImage();
    const bestandClass = `badge-${comic.bestand.toLowerCase()}`;
    return `
        <div class="comic-card comic-item" data-id="${comic.id}">
            <img src="${imgUrl}" alt="${comic.titel}" class="comic-cover" onerror="this.src='${getPlaceholderImage()}'">
            <div class="comic-info">
                <span class="comic-series">${comic.serie || comic.verlag} ${comic.nummer ? '#' + comic.nummer : ''}</span>
                <h3 class="comic-title">${comic.titel || 'Ohne Titel'}</h3>
                <div class="comic-meta">
                    <span><i class="fa-solid fa-star" style="color: var(--warning)"></i> ${comic.bewertung / 2}/5</span>
                    <span class="badge ${bestandClass}">${comic.bestand}</span>
                </div>
            </div>
        </div>
    `;
}

function renderListItem(comic) {
    const imgUrl = comic.bild || getPlaceholderImage();
    const bestandClass = `badge-${comic.bestand.toLowerCase()}`;
    return `
        <div class="list-item comic-item" data-id="${comic.id}">
            <img src="${imgUrl}" alt="${comic.titel}" class="list-cover" onerror="this.src='${getPlaceholderImage()}'">
            <div>
                <h3 class="comic-title" style="margin:0; font-size:1rem;">${comic.titel || 'Ohne Titel'}</h3>
                <span class="comic-series" style="font-size:0.75rem;">${comic.serie || comic.verlag} ${comic.nummer ? '#' + comic.nummer : ''}</span>
            </div>
            <div>${comic.verlag} • ${comic.jahr || '-'}</div>
            <div><span class="badge ${bestandClass}">${comic.bestand}</span></div>
            <div style="text-align: right; font-weight: bold;">${comic.preis ? comic.preis.toFixed(2) + ' €' : '-'}</div>
        </div>
    `;
}

function renderDetailsItem(comic) {
    const imgUrl = comic.bild || getPlaceholderImage();
    const bestandClass = `badge-${comic.bestand.toLowerCase()}`;
    return `
        <div class="details-card comic-item" data-id="${comic.id}">
            <img src="${imgUrl}" alt="${comic.titel}" class="details-cover" onerror="this.src='${getPlaceholderImage()}'">
            <div class="details-info">
                <span class="comic-series">${comic.serie || comic.verlag} ${comic.nummer ? '#' + comic.nummer : ''}</span>
                <h3 class="comic-title" style="font-size: 1.4rem; margin-bottom: 12px;">${comic.titel || 'Ohne Titel'}</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: auto;">
                    <div><strong>Typ:</strong> ${comic.typ}</div>
                    <div><strong>Format:</strong> ${comic.format}</div>
                    <div><strong>Verlag:</strong> ${comic.verlag}</div>
                    <div><strong>Sprache:</strong> ${comic.sprache}</div>
                    <div><strong>Kaufdatum:</strong> ${comic.kaufdatum || '-'}</div>
                    <div><strong>Preis:</strong> ${comic.preis ? comic.preis.toFixed(2) + ' €' : '-'}</div>
                </div>
                
                <div style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center;">
                    <span class="badge ${bestandClass}">${comic.bestand}</span>
                    <span style="font-size: 1.1rem; color: var(--warning)"><i class="fa-solid fa-star"></i> ${comic.bewertung / 2}</span>
                </div>
            </div>
        </div>
    `;
}
