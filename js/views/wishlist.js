import { db } from '../db.js';
import { openModal } from './form.js';

export async function renderWishlist(container) {
    const html = `
        <div class="view-controls" style="padding-top: 32px;">
            <h2 class="view-title">Wunschliste</h2>
            <div class="header-actions">
                 <button class="btn btn-primary" id="btn-add-wish">
                    <i class="fa-solid fa-plus"></i> Wunsch hinzufügen
                </button>
            </div>
        </div>
        
        <div class="details-card" style="flex-direction: column;">
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-secondary); font-size: 0.85rem;">
                            <th style="padding: 12px;">Typ</th>
                            <th style="padding: 12px;">Name</th>
                            <th style="padding: 12px;">Format</th>
                            <th style="padding: 12px;">Preis</th>
                            <th style="padding: 12px;">Release</th>
                            <th style="padding: 12px;">ISBN</th>
                            <th style="padding: 12px;">Status</th>
                            <th style="padding: 12px;">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody id="wishlist-body">
                        <tr><td colspan="8" style="text-align:center; padding:20px;"><i class="fa-solid fa-circle-notch fa-spin"></i></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    container.innerHTML = html;
    
    document.getElementById('btn-add-wish').addEventListener('click', () => {
        openModal(null, true); // true markiert es als Wunschliste
    });
    
    updateWishlistTable();
}

async function updateWishlistTable() {
    const tbody = document.getElementById('wishlist-body');
    if (!tbody) return;

    const wishes = await db.getWishlist();
    
    if (wishes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:40px; color:var(--text-secondary);">Deine Wunschliste ist noch leer.</td></tr>';
        return;
    }

    tbody.innerHTML = wishes.map(wish => `
        <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.95rem;">
            <td style="padding: 12px;">${wish.typ}</td>
            <td style="padding: 12px; font-weight: 600;">${wish.titel}</td>
            <td style="padding: 12px;">${wish.format}</td>
            <td style="padding: 12px;">${wish.preis ? wish.preis.toFixed(2) + ' €' : '-'}</td>
            <td style="padding: 12px;">${wish.jahr || '-'}</td>
            <td style="padding: 12px;">${wish.isbn || '-'}</td>
            <td style="padding: 12px;">
                <span class="badge ${wish.vorbestellt ? 'badge-vorbestellt' : 'badge-abgegeben'}">
                    ${wish.vorbestellt ? 'Vorbestellt' : 'Geplant'}
                </span>
            </td>
            <td style="padding: 12px;">
                <button class="btn-edit-wish" data-id="${wish.id}" style="background:none; border:none; color:var(--secondary-color); cursor:pointer; margin-right:10px;">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-delete-wish" data-id="${wish.id}" style="background:none; border:none; color:var(--danger); cursor:pointer;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.btn-edit-wish').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const wish = wishes.find(w => w.id === id);
            openModal(wish, true);
        });
    });

    tbody.querySelectorAll('.btn-delete-wish').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Diesen Wunsch wirklich löschen?')) {
                await db.deleteWish(btn.dataset.id);
                updateWishlistTable();
            }
        });
    });
}
