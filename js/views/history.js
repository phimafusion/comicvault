import { db } from '../db.js';
import { displayDate } from '../utils.js';

const FIELD_LABELS = {
    titel: 'Titel',
    typ: 'Typ',
    serie: 'Serie',
    nummer: 'Nummer',
    verlag: 'Verlag',
    format: 'Format',
    jahr: 'Jahr',
    zustand: 'Zustand',
    bezugsquelle: 'Quelle',
    preis: 'Preis',
    sprache: 'Sprache',
    limitierung: 'Limitierung',
    limitiert_auf: 'Limitiert auf',
    variant: 'Variant',
    variantname: 'Variantname',
    bemerkung: 'Bemerkung',
    kaufdatum: 'Kaufdatum',
    bestand: 'Bestand',
    gelesen_am: 'Gelesen am',
    bewertung: 'Bewertung',
    isbn: 'ISBN',
    vorbestellt: 'Vorbestellt',
    besonderheit: 'Besonderheit'
};

export async function renderHistory(container) {
    const html = `
        <div class="view-controls" style="padding-top: 32px; justify-content: space-between; flex-wrap: wrap; gap: 15px;">
            <h2 class="view-title" style="margin: 0;">Änderungsverlauf (Historie)</h2>
            <button class="btn btn-danger" id="btn-clear-history" style="display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-trash-can"></i> Verlauf leeren
            </button>
        </div>
        
        <!-- Filters -->
        <div class="details-card" style="margin-bottom: 25px; display: flex; gap: 15px; flex-wrap: wrap; align-items: flex-end; padding: 16px 20px;">
            <div class="form-group" style="flex: 2; min-width: 200px; margin: 0;">
                <label class="form-label">Suche nach Comic / Wunsch</label>
                <input type="text" id="history-search" class="form-control" placeholder="Titel oder Reihe suchen...">
            </div>
            <div class="form-group" style="flex: 1; min-width: 150px; margin: 0;">
                <label class="form-label">Aktion</label>
                <select id="history-filter-action" class="form-control">
                    <option value="all">Alle Aktionen</option>
                    <option value="create">Hinzugefügt</option>
                    <option value="update">Geändert</option>
                    <option value="delete">Gelöscht</option>
                </select>
            </div>
            <div class="form-group" style="flex: 1; min-width: 150px; margin: 0;">
                <label class="form-label">Bereich</label>
                <select id="history-filter-target" class="form-control">
                    <option value="all">Alle Bereiche</option>
                    <option value="collection">Sammlung</option>
                    <option value="wishlist">Wunschliste</option>
                </select>
            </div>
        </div>

        <div id="history-timeline-container" style="position: relative; padding: 10px 0;">
            <!-- History entries injected here -->
        </div>
    `;
    container.innerHTML = html;

    // Load and render history entries
    await updateHistoryList();

    // Event Listeners
    document.getElementById('history-search').addEventListener('input', () => updateHistoryList());
    document.getElementById('history-filter-action').addEventListener('change', () => updateHistoryList());
    document.getElementById('history-filter-target').addEventListener('change', () => updateHistoryList());
    
    document.getElementById('btn-clear-history').addEventListener('click', async () => {
        if (confirm('Möchtest du den gesamten Änderungsverlauf wirklich unwiderruflich leeren?')) {
            await db.clearHistory();
            await updateHistoryList();
        }
    });
}

async function updateHistoryList() {
    const container = document.getElementById('history-timeline-container');
    if (!container) return;

    container.innerHTML = '<div style="display:flex; justify-content:center; padding:50px;"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>';

    const history = await db.getHistory();
    const query = document.getElementById('history-search').value.toLowerCase().trim();
    const actionFilter = document.getElementById('history-filter-action').value;
    const targetFilter = document.getElementById('history-filter-target').value;

    let filtered = history;

    // Search filter
    if (query) {
        filtered = filtered.filter(entry => 
            (entry.itemTitle || '').toLowerCase().includes(query)
        );
    }

    // Action filter
    if (actionFilter !== 'all') {
        filtered = filtered.filter(entry => entry.action === actionFilter);
    }

    // Target filter
    if (targetFilter !== 'all') {
        filtered = filtered.filter(entry => entry.target === targetFilter);
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--text-secondary); font-style: italic; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color);">
                Keine Verlaufseinträge mit diesen Filtern gefunden.
            </div>
        `;
        return;
    }

    // CSS styling injected locally for premium timeline look
    const style = `
        <style>
            .timeline-item {
                position: relative;
                padding-left: 50px;
                margin-bottom: 25px;
                animation: fadeIn 0.3s ease;
            }
            .timeline-item::before {
                content: '';
                position: absolute;
                left: 20px;
                top: 36px;
                bottom: -29px;
                width: 2px;
                background: var(--border-color);
                opacity: 0.5;
            }
            .timeline-item:last-child::before {
                display: none;
            }
            .timeline-badge {
                position: absolute;
                left: 5px;
                top: 2px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                z-index: 5;
            }
            .badge-create { background: var(--success); }
            .badge-update { background: var(--secondary-color); }
            .badge-delete { background: var(--danger); }
            
            .timeline-card {
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: 10px;
                padding: 16px 20px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            }
            .timeline-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8px;
                gap: 10px;
            }
            .timeline-time {
                font-size: 0.78rem;
                color: var(--text-secondary);
                white-space: nowrap;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(5px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
    `;

    const entriesHtml = filtered.map(entry => {
        let badgeIcon = '';
        let badgeClass = '';
        let actionLabel = '';
        let actionColor = '';

        if (entry.action === 'create') {
            badgeIcon = '<i class="fa-solid fa-plus-circle" style="font-size: 0.9rem;"></i>';
            badgeClass = 'badge-create';
            actionLabel = 'Hinzugefügt';
            actionColor = 'var(--success)';
        } else if (entry.action === 'update') {
            badgeIcon = '<i class="fa-solid fa-pen-to-square" style="font-size: 0.8rem;"></i>';
            badgeClass = 'badge-update';
            actionLabel = 'Geändert';
            actionColor = 'var(--secondary-color)';
        } else if (entry.action === 'delete') {
            badgeIcon = '<i class="fa-solid fa-trash-can" style="font-size: 0.8rem;"></i>';
            badgeClass = 'badge-delete';
            actionLabel = 'Gelöscht';
            actionColor = 'var(--danger)';
        }

        const date = new Date(entry.timestamp);
        const timeStr = isNaN(date.getTime()) ? entry.timestamp : date.toLocaleString('de-DE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        const targetLabel = entry.target === 'wishlist' ? 'Wunschliste' : 'Sammlung';
        
        let detailsHtml = '';
        if (entry.action === 'update' && entry.changes && Object.keys(entry.changes).length > 0) {
            detailsHtml = Object.keys(entry.changes).map(f => {
                const label = FIELD_LABELS[f] || f;
                let oldVal = entry.changes[f].old;
                let newVal = entry.changes[f].new;

                if (f === 'preis' && oldVal !== null && oldVal !== undefined && oldVal !== '') oldVal = Number(oldVal).toFixed(2) + ' €';
                if (f === 'preis' && newVal !== null && newVal !== undefined && newVal !== '') newVal = Number(newVal).toFixed(2) + ' €';
                if (f === 'limitierung' || f === 'variant' || f === 'vorbestellt') {
                    oldVal = oldVal ? 'Ja' : 'Nein';
                    newVal = newVal ? 'Ja' : 'Nein';
                }

                const oldDisplay = oldVal !== undefined && oldVal !== null && oldVal !== '' ? oldVal : 'leer';
                const newDisplay = newVal !== undefined && newVal !== null && newVal !== '' ? newVal : 'leer';

                return `
                    <div style="margin-top: 4px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 600; min-width: 100px; display: inline-block;">${label}:</span>
                        <span style="text-decoration: line-through; opacity: 0.6;">${oldDisplay}</span>
                        <span style="opacity: 0.6; font-size: 0.8rem;">➔</span>
                        <span style="color: var(--success); font-weight: bold;">${newDisplay}</span>
                    </div>
                `;
            }).join('');
            
            detailsHtml = `
                <div style="font-size: 0.82rem; margin-top: 10px; padding: 10px 14px; background: rgba(0,0,0,0.15); border-radius: 8px; border: 1px solid var(--border-color);">
                    ${detailsHtml}
                </div>
            `;
        } else if (entry.action === 'delete' && entry.itemSnapshot) {
            const snap = entry.itemSnapshot;
            const extra = entry.target === 'wishlist' 
                ? `Format: ${snap.format || '-'} | Preis: ${snap.preis ? snap.preis + ' €' : '-'}` 
                : `Verlag: ${snap.verlag || '-'} | Format: ${snap.format || '-'} | Preis: ${snap.preis ? snap.preis + ' €' : '-'}`;
            detailsHtml = `
                <div style="font-size: 0.78rem; margin-top: 6px; color: var(--text-secondary); font-style: italic;">
                    Snapshot vor dem Löschen: ${extra}
                </div>
            `;
        }

        return `
            <div class="timeline-item">
                <div class="timeline-badge ${badgeClass}">
                    ${badgeIcon}
                </div>
                <div class="timeline-card">
                    <div class="timeline-header">
                        <div>
                            <span class="badge" style="background: ${actionColor}; color: white; padding: 2px 8px; font-size: 0.65rem; text-transform: uppercase; font-weight: bold; margin-right: 8px;">${actionLabel}</span>
                            <span class="badge" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-secondary); padding: 2px 8px; font-size: 0.65rem; text-transform: uppercase; font-weight: bold;">${targetLabel}</span>
                            <h3 style="margin: 8px 0 0 0; font-size: 1.1rem; font-family: 'Outfit', sans-serif; font-weight: 600; color: var(--text-main);">${entry.itemTitle}</h3>
                        </div>
                        <span class="timeline-time">${timeStr}</span>
                    </div>
                    ${detailsHtml}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = style + entriesHtml;
}
