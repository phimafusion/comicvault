import { db } from '../db.js';
import { initAutocomplete } from '../components/autocomplete.js';

let selectedSubscriptionIds = new Set();
let sortBy = 'titel';
let sortOrder = 'asc';
let searchQuery = '';

export async function renderSubscriptions(container) {
    selectedSubscriptionIds.clear();
    searchQuery = '';

    const html = `
        <div class="view-controls" style="padding-top: 32px; margin-bottom: 15px;">
            <h2 class="view-title">Abonnements</h2>
        </div>

        <!-- Search & Control Actions Bar -->
        <div class="view-controls" style="display: flex; gap: 15px; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; padding-top: 0; background: transparent; border: none; box-shadow: none;">
            <div style="display: flex; gap: 10px; flex: 1; max-width: 400px; align-items: center;">
                <div style="position: relative; width: 100%;">
                    <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 0.9rem;"></i>
                    <input type="text" id="subscriptions-search" class="form-control" placeholder="Abos filtern..." style="padding-left: 36px; height: 38px; width: 100%;">
                </div>
            </div>
            <div class="header-actions">
                 <button class="btn btn-primary" id="btn-add-subscription" style="height: 38px;">
                    <i class="fa-solid fa-plus"></i> Abo hinzufügen
                </button>
            </div>
        </div>
        
        <div class="details-card" style="flex-direction: column; border-radius: 12px; border: 1px solid var(--border-color); overflow: hidden; padding: 0;">
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(0,0,0,0.15);">
                            <th class="sortable-sub-header" data-sort="titel" style="padding: 12px; cursor: pointer; user-select: none;">Serie / Titel <span class="sort-icon-container"></span></th>
                            <th class="sortable-sub-header" data-sort="verlag" style="padding: 12px; cursor: pointer; user-select: none;">Verlag <span class="sort-icon-container"></span></th>
                            <th class="sortable-sub-header" data-sort="haendler" style="padding: 12px; cursor: pointer; user-select: none;">Händler <span class="sort-icon-container"></span></th>
                            <th style="padding: 12px; text-align: right;">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody id="subscriptions-body">
                        <tr><td colspan="4" style="text-align:center; padding:20px;"><i class="fa-solid fa-circle-notch fa-spin"></i></td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <style>
            .sortable-sub-header:hover {
                color: var(--primary-color) !important;
            }
        </style>
    `;
    container.innerHTML = html;
    
    // Bind buttons
    document.getElementById('btn-add-subscription').addEventListener('click', () => {
        openSubscriptionModal();
    });

    const searchInput = document.getElementById('subscriptions-search');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        updateSubscriptionsTable();
    });

    // Header sort events
    container.querySelectorAll('.sortable-sub-header').forEach(header => {
        header.addEventListener('click', () => {
            const newSortBy = header.dataset.sort;
            if (sortBy === newSortBy) {
                sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                sortBy = newSortBy;
                sortOrder = 'asc';
            }
            updateSubscriptionsTable();
        });
    });

    window.addEventListener('subscriptions-updated-background', handleBackgroundSubscriptionsUpdate);

    updateSubscriptionsTable();
}

const handleBackgroundSubscriptionsUpdate = () => {
    updateSubscriptionsTable();
};

export function cleanupSubscriptions() {
    window.removeEventListener('subscriptions-updated-background', handleBackgroundSubscriptionsUpdate);
}

async function updateSubscriptionsTable() {
    const tbody = document.getElementById('subscriptions-body');
    if (!tbody) return;

    let subs = await db.getSubscriptions();

    // Update table header sorting icons
    const headers = document.querySelectorAll('.sortable-sub-header');
    headers.forEach(header => {
        const field = header.dataset.sort;
        const iconContainer = header.querySelector('.sort-icon-container');
        if (iconContainer) {
            if (sortBy !== field) {
                iconContainer.innerHTML = '<i class="fa-solid fa-sort" style="opacity: 0.2; margin-left: 5px; font-size: 0.8rem;"></i>';
            } else {
                iconContainer.innerHTML = sortOrder === 'asc' 
                    ? '<i class="fa-solid fa-caret-up" style="margin-left: 5px; color: var(--primary-color); font-size: 0.8rem;"></i>' 
                    : '<i class="fa-solid fa-caret-down" style="margin-left: 5px; color: var(--primary-color); font-size: 0.8rem;"></i>';
            }
        }
    });

    // 2. Filter subscriptions
    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        subs = subs.filter(s => 
            String(s.titel || '').toLowerCase().includes(query) ||
            String(s.verlag || '').toLowerCase().includes(query) ||
            String(s.haendler || '').toLowerCase().includes(query)
        );
    }

    // 3. Sort subscriptions
    subs.sort((a, b) => {
        let valA = String(a[sortBy] || '').toLowerCase();
        let valB = String(b[sortBy] || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    
    if (subs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px; color:var(--text-secondary); font-style: italic;">Keine Abonnements gefunden.</td></tr>`;
        return;
    }

    tbody.innerHTML = subs.map(sub => {
        return `
            <tr class="subscription-row" data-id="${sub.id}" style="border-bottom: 1px solid var(--border-color); font-size: 0.95rem; transition: background-color 0.2s;">
                <td data-label="Titel" style="padding: 12px; font-weight: 600; vertical-align: middle;">${sub.titel || '-'}</td>
                <td data-label="Verlag" style="padding: 12px; vertical-align: middle;">${sub.verlag || '-'}</td>
                <td data-label="Händler" style="padding: 12px; vertical-align: middle;">${sub.haendler || '-'}</td>
                <td data-label="Aktionen" style="padding: 12px; text-align: right; vertical-align: middle; white-space: nowrap;">
                    <button class="btn-edit-sub" data-id="${sub.id}" title="Bearbeiten" style="background:none; border:none; color:var(--secondary-color); cursor:pointer; margin-right:12px; font-size: 1rem;">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-delete-sub" data-id="${sub.id}" title="Löschen" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size: 1rem;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Bind item events
    tbody.querySelectorAll('.btn-edit-sub').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const sub = subs.find(s => s.id === id);
            if (sub) openSubscriptionModal(sub);
        });
    });

    tbody.querySelectorAll('.btn-delete-sub').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Dieses Abo wirklich löschen?')) {
                await db.deleteSubscription(btn.dataset.id);
                updateSubscriptionsTable();
            }
        });
    });
}

// Modal Logic
async function openSubscriptionModal(sub = null) {
    let modal = document.getElementById('subscription-modal');
    if (!modal) {
        const modalHtml = `
            <div class="modal-overlay" id="subscription-modal" style="display: flex; z-index: 9999;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="sub-modal-title">Neues Abo</h2>
                        <button class="close-btn" id="btn-close-sub-modal"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="modal-body" style="overflow: visible;">
                        <form id="subscription-form">
                            <input type="hidden" id="sub-id">
                            <div class="form-group">
                                <label for="sub-titel">Serie / Titel <span style="color:var(--danger);">*</span></label>
                                <input type="text" id="sub-titel" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label for="sub-verlag">Verlag</label>
                                <input type="text" id="sub-verlag" class="form-control">
                            </div>
                            <div class="form-group">
                                <label for="sub-haendler">Händler</label>
                                <input type="text" id="sub-haendler" class="form-control">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="btn-cancel-sub-modal">Abbrechen</button>
                        <button class="btn btn-primary" id="btn-save-sub">Speichern</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modal = document.getElementById('subscription-modal');

        document.getElementById('btn-close-sub-modal').addEventListener('click', closeSubscriptionModal);
        document.getElementById('btn-cancel-sub-modal').addEventListener('click', closeSubscriptionModal);
        
        document.getElementById('btn-save-sub').addEventListener('click', async () => {
            const form = document.getElementById('subscription-form');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const subData = {
                titel: document.getElementById('sub-titel').value.trim(),
                verlag: document.getElementById('sub-verlag').value.trim(),
                haendler: document.getElementById('sub-haendler').value.trim()
            };

            const id = document.getElementById('sub-id').value;
            if (id) {
                subData.id = id;
            }

            await db.saveSubscription(subData);
            closeSubscriptionModal();
            updateSubscriptionsTable();
        });
    } else {
        modal.style.display = 'flex';
    }

    if (sub) {
        document.getElementById('sub-modal-title').textContent = 'Abo bearbeiten';
        document.getElementById('sub-id').value = sub.id;
        document.getElementById('sub-titel').value = sub.titel || '';
        document.getElementById('sub-verlag').value = sub.verlag || '';
        document.getElementById('sub-haendler').value = sub.haendler || '';
    } else {
        document.getElementById('sub-modal-title').textContent = 'Neues Abo';
        document.getElementById('sub-id').value = '';
        document.getElementById('sub-titel').value = '';
        document.getElementById('sub-verlag').value = '';
        document.getElementById('sub-haendler').value = '';
    }

    // Lade Autocomplete-Vorschläge
    try {
        let allPublishers = [];
        let allVendors = [];
        let allSeries = [];
        
        const comics = await db.getAllComics();
        const publisherSet = new Set();
        const seriesSet = new Set();
        
        comics.forEach(c => {
            if (c.verlag && c.verlag.trim() !== '') {
                publisherSet.add(c.verlag.trim());
            }
            if (c.serie && c.serie.trim() !== '') {
                seriesSet.add(c.serie.trim());
            }
        });
        
        // Verlage aus Abos zusätzlich einbinden
        const subs = await db.getSubscriptions();
        const vendorSet = new Set();
        subs.forEach(s => {
            if (s.verlag && s.verlag.trim() !== '') {
                publisherSet.add(s.verlag.trim());
            }
            if (s.haendler && s.haendler.trim() !== '') {
                vendorSet.add(s.haendler.trim());
            }
        });
        
        allPublishers = Array.from(publisherSet).sort();
        allVendors = Array.from(vendorSet).sort();
        allSeries = Array.from(seriesSet).sort();
        
        initAutocomplete(document.getElementById('sub-titel'), allSeries);
        initAutocomplete(document.getElementById('sub-verlag'), allPublishers);
        initAutocomplete(document.getElementById('sub-haendler'), allVendors);
    } catch (err) {
        console.warn('Fehler beim Laden der Vorschläge für Autocomplete:', err);
    }
}

function closeSubscriptionModal() {
    const modal = document.getElementById('subscription-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}
