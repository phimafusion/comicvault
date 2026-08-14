import { escapeHTML, formatCurrency } from '../../utils.js';
import { formatGermanDate } from '../../services/stats/statsUtils.js';

export function renderRandomPickLayout({ activeStack = 'unread', selectedVerlag = 'all', selectedTyp = 'all', sequentialOnly = true }, publishers = [], types = [], totalEligible = 0, smartInsightHtml = '') {
    return `
        <div class="random-pick-container" style="max-width: 900px; margin: 0 auto; padding: 20px 16px;">
            <!-- Compact Header -->
            <div class="view-header-block" style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px; position: relative;">
                <div style="display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 100%); box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4); border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;">
                    <i class="fa-solid fa-dice-d20" style="font-size: 1.8rem; color: #ffffff;"></i>
                </div>
                <div>
                    <h2 style="font-family: var(--font-display); font-size: 2rem; font-weight: 800; margin: 0 0 4px 0; background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Comic Roulette</h2>
                    <p style="font-size: 0.95rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">Finde dein nächstes Abenteuer aus dem Lesestapel.</p>
                </div>
            </div>

            <!-- Smart Insight Badge (Compact) -->
            <div id="pick-smart-insight-badge" style="background: rgba(99, 102, 241, 0.1); backdrop-filter: blur(10px); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; color: var(--text-primary); font-size: 0.95rem; display: flex; align-items: center; gap: 10px;">
                <i class="fa-solid fa-lightbulb" style="color: #f59e0b;"></i>
                <div>${smartInsightHtml}</div>
            </div>

            <!-- Filter-Panel (Compact) -->
            <div class="details-card" style="padding: 20px; border-radius: 16px; margin-bottom: 24px; background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); box-shadow: 0 10px 30px -10px rgba(0,0,0,0.3);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px;">
                    <span style="font-weight: 700; font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-sliders" style="color: var(--primary-color);"></i> Filter
                    </span>
                    <span id="eligible-count-badge" class="badge" style="background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.3); padding: 4px 12px; border-radius: 16px; font-size: 0.85rem; font-weight: 600;">
                        ${totalEligible} Bände im Topf
                    </span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 16px;">
                    <div>
                        <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px; text-transform: uppercase;">Kategorie</label>
                        <select id="pick-stack-select" class="form-control" style="width: 100%; border-radius: 8px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1); padding: 8px 12px; font-size: 0.9rem;">
                            <option value="unread" ${activeStack === 'unread' ? 'selected' : ''}>⏳ Lesestapel</option>
                            <option value="vorhanden" ${activeStack === 'vorhanden' ? 'selected' : ''}>📦 Gesamter Bestand</option>
                            <option value="wunschliste" ${activeStack === 'wunschliste' ? 'selected' : ''}>⭐ Wunschliste</option>
                            <option value="read" ${activeStack === 'read' ? 'selected' : ''}>📜 Bereits gelesen</option>
                            <option value="all" ${activeStack === 'all' ? 'selected' : ''}>🌐 Alle Comics</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px; text-transform: uppercase;">Verlag</label>
                        <select id="pick-verlag-select" class="form-control" style="width: 100%; border-radius: 8px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1); padding: 8px 12px; font-size: 0.9rem;">
                            <option value="all" ${selectedVerlag === 'all' ? 'selected' : ''}>Alle Verlage</option>
                            ${publishers.map(v => `<option value="${escapeHTML(v)}" ${selectedVerlag === v ? 'selected' : ''}>${escapeHTML(v)}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px; text-transform: uppercase;">Format</label>
                        <select id="pick-typ-select" class="form-control" style="width: 100%; border-radius: 8px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1); padding: 8px 12px; font-size: 0.9rem;">
                            <option value="all" ${selectedTyp === 'all' ? 'selected' : ''}>Alle Formate</option>
                            ${types.map(t => `<option value="${escapeHTML(t)}" ${selectedTyp === t ? 'selected' : ''}>${escapeHTML(t)}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <!-- Checkbox Option -->
                <div style="background: rgba(0, 0, 0, 0.15); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.03); margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" id="pick-sequential-checkbox" style="width: 18px; height: 18px; accent-color: var(--primary-color); cursor: pointer;" ${sequentialOnly ? 'checked' : ''}>
                    <label for="pick-sequential-checkbox" style="font-size: 0.9rem; color: var(--text-primary); cursor: pointer; user-select: none;">
                        <strong>Logische Reihenfolge:</strong> Nur jeweils den <u>nächsten ungelesenen Band</u> einer Serie in den Topf werfen
                    </label>
                </div>

                <!-- Spin Button -->
                <div style="text-align: center;">
                    <button id="btn-draw-random-comic" class="btn" style="
                        background: linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 100%);
                        color: #ffffff;
                        font-weight: 800;
                        font-size: 1.1rem;
                        padding: 12px 36px;
                        border-radius: 100px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 8px 20px -4px rgba(99, 102, 241, 0.4);
                        cursor: pointer;
                        display: inline-flex;
                        align-items: center;
                        gap: 12px;
                        text-transform: uppercase;
                    " ${totalEligible === 0 ? 'disabled' : ''}>
                        <i class="fa-solid fa-dice-five"></i> ZIEHEN
                    </button>
                </div>
            </div>

            <!-- Result Container -->
            <div id="random-pick-result-container">
                ${renderInitialSlotState(totalEligible)}
            </div>
        </div>
    `;
}

export function renderInitialSlotState(totalEligible) {
    if (totalEligible === 0) {
        return `
            <div style="padding: 40px 24px; text-align: center; border-radius: 16px; border: 1px dashed rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05);">
                <i class="fa-solid fa-ghost" style="font-size: 2rem; color: #ef4444; margin-bottom: 12px;"></i>
                <h3 style="font-size: 1.2rem; margin-bottom: 8px; color: var(--text-primary);">Topf ist leer!</h3>
                <p style="color: var(--text-secondary); margin: 0; font-size: 0.9rem;">Passe die Filter an, um Bände aufzunehmen.</p>
            </div>
        `;
    }

    return `
        <div style="padding: 40px 24px; text-align: center; border-radius: 16px; border: 1px dashed rgba(99, 102, 241, 0.3); background: rgba(99, 102, 241, 0.03);">
            <div style="font-size: 3rem; margin-bottom: 12px; opacity: 0.8;">🎰</div>
            <h3 style="font-family: var(--font-display); font-size: 1.3rem; margin-bottom: 8px; color: var(--text-primary);">Zieh dein nächstes Comic!</h3>
            <p style="color: var(--text-secondary); margin: 0; font-size: 0.95rem;">Klicke auf Ziehen, um das Roulette zu starten.</p>
        </div>
    `;
}

export function renderWinnerCard(comic, currencySymbol = '€') {
    if (!comic) return renderInitialSlotState(0);

    const title = escapeHTML(comic.titel || 'Unbenannt');
    const serie = comic.serie ? escapeHTML(comic.serie) : '';
    const numStr = (comic.nummer !== undefined && comic.nummer !== null && comic.nummer !== '') ? `#${escapeHTML(String(comic.nummer))}` : '';
    const verlag = comic.verlag ? escapeHTML(comic.verlag) : '-';
    const typ = escapeHTML(comic.typ || comic.format || '-');
    const kaufdatum = formatGermanDate(comic.kaufdatum);
    const displayPrice = !isNaN(Number(comic.preis)) && comic.preis !== null ? formatCurrency(Number(comic.preis), currencySymbol) : '-';
    const isRead = comic.gelesen === true || !!comic.gelesen_am;

    const coverHtml = comic.cover_url 
        ? `<img src="${escapeHTML(comic.cover_url)}" alt="${title}" style="width: 100%; height: 260px; object-fit: cover; border-radius: 12px; box-shadow: 0 10px 20px rgba(0,0,0,0.4);">`
        : `<div style="width: 100%; height: 260px; border-radius: 12px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: inset 0 0 20px rgba(0,0,0,0.5);">
            <i class="fa-solid fa-book-open" style="font-size: 2rem; color: var(--primary-color);"></i>
            <div style="font-weight: 700; font-size: 1.1rem; color: #fff; margin-top: 12px; text-align: center; padding: 0 10px;">${title}</div>
          </div>`;

    return `
        <div class="winner-card" style="
            background: linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(99, 102, 241, 0.4);
            border-radius: 20px;
            padding: 24px;
            box-shadow: 0 15px 30px -10px rgba(0,0,0,0.4);
            animation: slideUpFade 0.4s ease forwards;
        ">
            <style>
                @keyframes slideUpFade { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
            </style>

            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px;">
                <span class="badge" style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: #fff; font-weight: 700; padding: 6px 12px; border-radius: 100px; font-size: 0.8rem; text-transform: uppercase;">
                    <i class="fa-solid fa-trophy"></i> Dein Pick
                </span>
                
                ${isRead ? `
                    <span style="color: #10b981; font-size: 0.85rem; font-weight: 700;"><i class="fa-solid fa-check"></i> Gelesen</span>
                ` : `
                    <span style="color: #f59e0b; font-size: 0.85rem; font-weight: 700;"><i class="fa-solid fa-clock"></i> Ungelesen</span>
                `}
            </div>

            <div style="display: grid; grid-template-columns: 180px 1fr; gap: 24px; align-items: start;">
                ${coverHtml}

                <div style="display: flex; flex-direction: column; height: 100%;">
                    <div style="margin-bottom: auto;">
                        ${serie ? `<div style="font-size: 1rem; color: var(--primary-color); font-weight: 700; text-transform: uppercase;">${serie}</div>` : ''}
                        <h3 style="font-family: var(--font-display); font-size: 1.8rem; margin: 4px 0 16px 0; color: #ffffff; line-height: 1.2;">
                            ${title} ${numStr ? `<span style="color: rgba(255,255,255,0.5);">${numStr}</span>` : ''}
                        </h3>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; background: rgba(0, 0, 0, 0.2); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                        <div>
                            <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase;">Verlag</div>
                            <div style="font-weight: 600; color: #fff; font-size: 0.95rem;">${verlag}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase;">Format</div>
                            <div style="font-weight: 600; color: #fff; font-size: 0.95rem;">${typ}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase;">Gekauft</div>
                            <div style="font-weight: 600; color: #fff; font-size: 0.95rem;">${kaufdatum}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase;">Preis</div>
                            <div style="font-weight: 600; color: #fff; font-size: 0.95rem;">${displayPrice}</div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${!isRead ? `
                            <button id="btn-pick-mark-read" data-id="${escapeHTML(comic.id)}" class="btn" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 10px 16px; border-radius: 8px; font-weight: 600; border: none;">
                                <i class="fa-solid fa-check"></i> Als gelesen markieren
                            </button>
                        ` : ''}
                        <button id="btn-pick-view-in-collection" data-query="${escapeHTML(comic.titel || comic.serie || '')}" class="btn" style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 10px 16px; border-radius: 8px; font-weight: 600;">
                            <i class="fa-solid fa-search"></i> In Sammlung
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}
