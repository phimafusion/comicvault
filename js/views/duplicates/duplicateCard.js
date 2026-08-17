import { escapeHTML, formatCurrency } from '../../utils.js';

export function renderDuplicatePairCard(pair, index) {
    const { primary, duplicate, reason, confidence } = pair;
    const badgeColor = confidence === 'high' ? 'var(--danger)' : 'var(--warning)';
    
    return `
        <div class="details-card duplicate-pair-card" data-pair-index="${index}" style="flex-direction: column; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 16px;">
                <div>
                    <span class="badge" style="background: ${badgeColor}; color: #fff; font-weight: bold; margin-right: 8px;">
                        ${confidence === 'high' ? 'Hohe Wahrscheinlichkeit' : 'Mögliches Duplikat'}
                    </span>
                    <span style="color: var(--text-secondary); font-size: 0.85rem;">Grund: ${escapeHTML(reason)}</span>
                </div>
                <button class="btn btn-secondary btn-sm btn-merge-pair" data-pair-index="${index}">
                    <i class="fa-solid fa-code-merge"></i> Zusammenführen
                </button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="duplicate-item-box" style="padding: 12px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color);">
                    <div style="font-weight: bold; color: var(--primary-color); margin-bottom: 4px;">Eintrag A</div>
                    <div style="font-size: 1rem; font-weight: 600;">${escapeHTML(primary.serie || '')} #${primary.nummer || ''}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHTML(primary.titel || 'Kein Titel')}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 6px;">Format: ${escapeHTML(primary.format || '-')} | Preis: ${formatCurrency(primary.preis)}</div>
                </div>
                <div class="duplicate-item-box" style="padding: 12px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color);">
                    <div style="font-weight: bold; color: var(--secondary-color); margin-bottom: 4px;">Eintrag B</div>
                    <div style="font-size: 1rem; font-weight: 600;">${escapeHTML(duplicate.serie || '')} #${duplicate.nummer || ''}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHTML(duplicate.titel || 'Kein Titel')}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 6px;">Format: ${escapeHTML(duplicate.format || '-')} | Preis: ${formatCurrency(duplicate.preis)}</div>
                </div>
            </div>
        </div>
    `;
}
