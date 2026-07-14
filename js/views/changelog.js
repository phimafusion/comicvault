import { db } from '../db.js';
import { escapeHTML } from '../utils.js';

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

export function renderChangelog(container) {
    const html = `
        <style>
            .btn-revert {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 0.78rem !important;
                font-weight: 600 !important;
                padding: 6px 12px !important;
                border-radius: var(--radius-sm) !important;
                border: 1px solid var(--border-color) !important;
                background: rgba(255, 255, 255, 0.02) !important;
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                color: var(--text-secondary) !important;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .btn-revert:hover {
                background: rgba(6, 182, 212, 0.1) !important;
                border-color: var(--primary-color) !important;
                color: var(--text-primary) !important;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(6, 182, 212, 0.15);
            }
            .btn-revert:active {
                transform: translateY(0);
            }
            .btn-revert:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                pointer-events: none;
            }
            
            .changelog-toast {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 2200;
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px 24px;
                border-radius: var(--radius-md);
                background: rgba(30, 41, 59, 0.85);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: var(--text-primary);
                box-shadow: var(--shadow-lg);
                transform: translateY(100px);
                opacity: 0;
                transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
            }
            .changelog-toast.show {
                transform: translateY(0);
                opacity: 1;
            }
            .changelog-toast.success {
                border-left: 4px solid var(--success);
            }
            .changelog-toast.error {
                border-left: 4px solid var(--danger);
            }
        </style>
        <div class="view-controls" style="padding-top: 32px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
            <h2 class="view-title" style="margin: 0;">Änderungsverlauf</h2>
            <button class="btn btn-secondary" id="btn-clear-changelog" style="color: var(--danger); border-color: var(--border-color); display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-trash-can"></i> Verlauf leeren
            </button>
        </div>
        
        <div id="changelog-list" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
            <!-- Entries will be loaded here -->
        </div>

        <div id="changelog-footer" style="display: flex; justify-content: center; padding: 20px 0; display: none;">
            <button class="btn btn-secondary" id="btn-changelog-load-more">Mehr anzeigen</button>
        </div>
    `;
    container.innerHTML = html;

    let currentLimit = 50;

    // Load initial entries
    loadEntries(currentLimit);

    // Event listener for clear changelog
    document.getElementById('btn-clear-changelog').addEventListener('click', showClearConfirmationModal);

    // Event listener for load more
    document.getElementById('btn-changelog-load-more').addEventListener('click', () => {
        currentLimit += 50;
        loadEntries(currentLimit);
    });

    // Event listener for revert action
    const listContainer = document.getElementById('changelog-list');
    listContainer.addEventListener('click', async (e) => {
        const revertBtn = e.target.closest('.btn-revert');
        if (!revertBtn) return;

        const entryId = revertBtn.dataset.entryId;
        if (!entryId) return;

        revertBtn.disabled = true;
        const originalContent = revertBtn.innerHTML;
        revertBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Rückgängig...';

        try {
            await db.revertChangelogEntry(entryId);
            showToast('Änderung erfolgreich rückgängig gemacht.');
            setTimeout(() => {
                loadEntries(currentLimit);
            }, 800);
        } catch (error) {
            console.error("Fehler beim Rückgängig machen:", error);
            showToast(error.message || 'Fehler beim Rückgängig machen.', 'error');
            revertBtn.disabled = false;
            revertBtn.innerHTML = originalContent;
        }
    });
}

async function loadEntries(limit) {
    const listContainer = document.getElementById('changelog-list');
    const footerContainer = document.getElementById('changelog-footer');
    if (!listContainer) return;

    listContainer.innerHTML = '<div style="display:flex; justify-content:center; padding:50px;"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>';

    try {
        const entries = await db.getChangelog(limit);

        if (entries.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary); padding: 80px 20px; border-radius: var(--radius-lg); background: var(--bg-surface); border: 1px dashed var(--border-color);">
                    <i class="fa-solid fa-clock-rotate-left fa-3x" style="opacity: 0.3; margin-bottom: 16px;"></i>
                    <p style="font-size: 1.1rem; font-weight: 500; margin: 0;">Keine Einträge im Änderungsverlauf.</p>
                    <p style="font-size: 0.88rem; opacity: 0.7; margin-top: 8px;">Alle zukünftigen Änderungen an deiner Sammlung werden hier protokolliert.</p>
                </div>
            `;
            footerContainer.style.display = 'none';
            return;
        }

        let html = '';
        entries.forEach(entry => {
            let borderColor = 'var(--text-secondary)';
            let badgeBg = 'rgba(255, 255, 255, 0.05)';
            let badgeColor = 'var(--text-secondary)';
            let actionIcon = 'fa-solid fa-info-circle';
            let actionLabel = 'Aktion';

            if (entry.action === 'create') {
                borderColor = 'var(--success)';
                badgeBg = 'rgba(16, 185, 129, 0.1)';
                badgeColor = 'var(--success)';
                actionIcon = 'fa-solid fa-plus-circle';
                actionLabel = 'Neu erstellt';
            } else if (entry.action === 'delete') {
                borderColor = 'var(--danger)';
                badgeBg = 'rgba(239, 68, 68, 0.1)';
                badgeColor = 'var(--danger)';
                actionIcon = 'fa-solid fa-trash';
                actionLabel = 'Gelöscht';
            } else if (entry.action === 'update') {
                borderColor = 'var(--warning)';
                badgeBg = 'rgba(245, 158, 11, 0.1)';
                badgeColor = 'var(--warning)';
                actionIcon = 'fa-solid fa-pen-to-square';
                actionLabel = 'Bearbeitet';
            }

            let diffHtml = '';
            if (entry.action === 'update' && Array.isArray(entry.changes) && entry.changes.length > 0) {
                diffHtml = formatDiff(entry.changes);
            }

            let revertBtnHtml = '';
            if (entry.action !== 'delete' || entry.deletedSnapshot) {
                revertBtnHtml = `
                    <button class="btn-revert" data-entry-id="${entry.id}">
                        <i class="fa-solid fa-arrow-rotate-left"></i> Rückgängig
                    </button>
                `;
            } else {
                revertBtnHtml = `
                    <span style="align-self: flex-end; font-size: 0.75rem; color: var(--text-secondary); opacity: 0.5; font-style: italic;">
                        Kein Snapshot zum Wiederherstellen
                    </span>
                `;
            }

            html += `
                <div class="changelog-card fade-in" style="background: var(--bg-surface); border-left: 4px solid ${borderColor}; border-radius: var(--radius-md); padding: 16px 20px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--border-color); border-left-width: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <span style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary); font-family: var(--font-display);">
                            ${entry.serie || 'Unbekannt'} ${entry.nummer !== undefined && entry.nummer !== null ? '#' + entry.nummer : ''}
                            ${entry.titel ? `<span style="font-weight: 500; font-size: 0.9rem; color: var(--text-secondary); margin-left: 8px;">(${entry.titel})</span>` : ''}
                        </span>
                        <span style="font-size: 0.78rem; color: var(--text-secondary); font-weight: 600;">
                            <i class="fa-regular fa-clock" style="margin-right: 4px;"></i> ${displayDateTime(entry.timestamp)}
                        </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <span class="badge" style="background-color: ${badgeBg}; color: ${badgeColor}; font-weight: bold; font-size: 0.75rem; padding: 4px 10px; border-radius: var(--radius-full); text-transform: uppercase; letter-spacing: 0.5px;">
                            <i class="${actionIcon}"></i> ${actionLabel}
                        </span>
                        ${entry.verlag ? `<span style="font-size: 0.8rem; color: var(--text-secondary);"><i class="fa-solid fa-building" style="opacity:0.6; margin-right:4px;"></i>${escapeHTML(entry.verlag)}</span>` : ''}
                        <span style="font-size: 0.8rem; color: var(--text-secondary); opacity: 0.7;">ID: ${entry.comicId}</span>
                    </div>
                    ${diffHtml ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-color); font-size: 0.85rem; line-height: 1.5; color: var(--text-secondary);">${diffHtml}</div>` : ''}
                    <div style="display: flex; justify-content: flex-end; margin-top: 4px; border-top: 1px solid rgba(255, 255, 255, 0.03); padding-top: 8px;">
                        ${revertBtnHtml}
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;

        // Show/hide load more footer
        if (entries.length === limit) {
            footerContainer.style.display = 'flex';
        } else {
            footerContainer.style.display = 'none';
        }

    } catch (error) {
        console.error("Fehler beim Laden des Änderungsverlaufs:", error);
        listContainer.innerHTML = `
            <div style="text-align: center; color: var(--danger); padding: 50px 20px;">
                <i class="fa-solid fa-triangle-exclamation fa-2x" style="margin-bottom: 12px;"></i>
                <p style="font-weight: bold; margin: 0;">Fehler beim Laden des Änderungsverlaufs.</p>
                <p style="font-size: 0.85rem; margin-top: 4px;">${error.message}</p>
            </div>
        `;
        footerContainer.style.display = 'none';
    }
}

function displayDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

function formatDiff(changes) {
    return changes.map(ch => {
        const label = FIELD_LABELS[ch.field] || ch.field;
        let oldVal = ch.old;
        let newVal = ch.new;

        if (ch.field === 'preis' && oldVal !== '' && oldVal !== null && oldVal !== undefined) oldVal = Number(oldVal).toFixed(2) + ' €';
        if (ch.field === 'preis' && newVal !== '' && newVal !== null && newVal !== undefined) newVal = Number(newVal).toFixed(2) + ' €';
        if (ch.field === 'limitierung' || ch.field === 'variant' || ch.field === 'vorbestellt') {
            oldVal = oldVal ? 'Ja' : 'Nein';
            newVal = newVal ? 'Ja' : 'Nein';
        }

        const oldDisplay = oldVal !== '' && oldVal !== null && oldVal !== undefined ? escapeHTML(oldVal) : 'leer';
        const newDisplay = newVal !== '' && newVal !== null && newVal !== undefined ? escapeHTML(newVal) : 'leer';
        return `<div style="padding-left: 10px; margin-top: 4px;">• ${escapeHTML(label)}: <span style="text-decoration: line-through; opacity: 0.6;">${oldDisplay}</span> ➔ <span style="color: var(--success); font-weight: bold;">${newDisplay}</span></div>`;
    }).join('');
}

function showClearConfirmationModal() {
    const existing = document.getElementById('changelog-clear-confirm-modal');
    if (existing) existing.remove();

    const modalHtml = `
        <div id="changelog-clear-confirm-modal" class="modal-overlay" style="display: flex; z-index: 2100;">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h2>Änderungsverlauf leeren</h2>
                    <button class="close-btn" id="changelog-clear-modal-close"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="modal-body" style="padding: 24px;">
                    <p style="margin: 0 0 12px 0; font-size: 1rem; color: var(--text-main); line-height: 1.5;">
                        Möchtest du den gesamten Änderungsverlauf wirklich unwiderruflich leeren?
                    </p>
                    <p style="margin: 0; font-size: 0.85rem; color: var(--danger); font-weight: 500;">
                        <i class="fa-solid fa-triangle-exclamation"></i> Dies wirkt sich nicht auf deine Comics-Sammlung aus, löscht aber das gesamte Protokoll.
                    </p>
                </div>
                <div class="modal-footer" style="padding: 16px 24px;">
                    <button class="btn btn-secondary" id="changelog-clear-modal-cancel">Abbrechen</button>
                    <button class="btn btn-danger" id="changelog-clear-modal-confirm" style="background-color: var(--danger); border-color: var(--danger); color: white;">
                        <i class="fa-solid fa-trash-can"></i> Verlauf unwiderruflich leeren
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('changelog-clear-confirm-modal');
    
    const closeModal = () => {
        modal.remove();
    };

    document.getElementById('changelog-clear-modal-close').addEventListener('click', closeModal);
    document.getElementById('changelog-clear-modal-cancel').addEventListener('click', closeModal);
    
    document.getElementById('changelog-clear-modal-confirm').addEventListener('click', async () => {
        const confirmBtn = document.getElementById('changelog-clear-modal-confirm');
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Leere Verlauf...';

        try {
            await db.clearChangelog();
            closeModal();
            loadEntries(50);
        } catch (error) {
            console.error("Fehler beim Leeren des Changelogs:", error);
            alert("Fehler beim Leeren des Verlaufs.");
            closeModal();
        }
    });
}

function showToast(message, type = 'success') {
    const existing = document.querySelector('.changelog-toast');
    if (existing) existing.remove();

    const icon = type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark';
    const iconColor = type === 'success' ? 'var(--success)' : 'var(--danger)';

    const toastHtml = `
        <div class="changelog-toast ${type}">
            <i class="${icon}" style="color: ${iconColor}; font-size: 1.2rem;"></i>
            <span style="font-weight: 500; font-size: 0.9rem;">${message}</span>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', toastHtml);
    const toast = document.querySelector('.changelog-toast');
    
    setTimeout(() => {
        if (toast) toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast && toast.parentNode) toast.remove();
            }, 300);
        }
    }, 3500);
}
