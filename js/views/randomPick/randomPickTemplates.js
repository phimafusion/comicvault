import { escapeHTML, formatCurrency } from '../../utils.js';
import { formatGermanDate } from '../../services/stats/statsUtils.js';

/**
 * Rendert das Haupt-Layout des Random Pickers inkl. Smart Insights & Filtern.
 */
export function renderRandomPickLayout({ activeStack = 'unread', selectedVerlag = 'all', selectedTyp = 'all' }, publishers = [], types = [], totalEligible = 0, smartInsightHtml = '') {
    return `
        <div class="random-pick-container" style="max-width: 900px; margin: 0 auto; padding: 24px 16px;">
            <!-- Header -->
            <div class="view-header-block" style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 20px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%); border: 1px solid rgba(99, 102, 241, 0.3); margin-bottom: 16px; box-shadow: 0 8px 24px -6px rgba(99, 102, 241, 0.3);">
                    <i class="fa-solid fa-dice" style="font-size: 2rem; color: var(--primary-color);"></i>
                </div>
                <h2 style="font-family: var(--font-display); font-size: 2rem; margin-bottom: 8px; color: var(--text-primary);">Comic Roulette & Random Picker</h2>
                <p style="font-size: 0.95rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto 16px auto;">
                    Lass den Zufall entscheiden! Perfekt für die Frage: <em>„Welches Comic soll ich als Nächstes aus meinem Lesestapel nehmen?“</em>
                </p>
            </div>

            <!-- Smart Insight Badge -->
            <div id="pick-smart-insight-badge" style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 12px; padding: 12px 20px; text-align: center; margin-bottom: 24px; color: var(--text-primary); font-size: 0.9rem;">
                ${smartInsightHtml}
            </div>

            <!-- Filter-Panel -->
            <div class="details-card" style="padding: 24px; border-radius: 16px; margin-bottom: 24px; background: var(--bg-card); border: 1px solid var(--border-color);">
                <div style="font-weight: 700; font-size: 1rem; margin-bottom: 16px; color: var(--text-primary); display: flex; align-items: center; justify-content: space-between;">
                    <span><i class="fa-solid fa-sliders" style="margin-right: 8px; color: var(--primary-color);"></i> Ziehungs-Kriterien</span>
                    <span id="eligible-count-badge" class="badge" style="background: rgba(99, 102, 241, 0.15); color: var(--primary-color); border: 1px solid rgba(99, 102, 241, 0.3); padding: 4px 12px; border-radius: 20px; font-size: 0.85rem;">
                        ${totalEligible} Comics im Topf
                    </span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
                    <!-- Stapel-Auswahl -->
                    <div>
                        <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px;">Stapel / Kategorie</label>
                        <select id="pick-stack-select" class="form-control" style="width: 100%; border-radius: 10px; background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px 12px;">
                            <option value="unread" ${activeStack === 'unread' ? 'selected' : ''}>⏳ Lesestapel (Ungelesene)</option>
                            <option value="vorhanden" ${activeStack === 'vorhanden' ? 'selected' : ''}>📦 Physischer Bestand (Alle)</option>
                            <option value="wunschliste" ${activeStack === 'wunschliste' ? 'selected' : ''}>⭐ Wunschliste</option>
                            <option value="read" ${activeStack === 'read' ? 'selected' : ''}>📜 Bereits gelesene Comics</option>
                            <option value="all" ${activeStack === 'all' ? 'selected' : ''}>🌐 Gesamte Datenbank</option>
                        </select>
                    </div>

                    <!-- Verlag-Auswahl -->
                    <div>
                        <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px;">Verlag</label>
                        <select id="pick-verlag-select" class="form-control" style="width: 100%; border-radius: 10px; background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px 12px;">
                            <option value="all" ${selectedVerlag === 'all' ? 'selected' : ''}>Alle Verlage</option>
                            ${publishers.map(v => `<option value="${escapeHTML(v)}" ${selectedVerlag === v ? 'selected' : ''}>${escapeHTML(v)}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Typ-Auswahl -->
                    <div>
                        <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px;">Format / Typ</label>
                        <select id="pick-typ-select" class="form-control" style="width: 100%; border-radius: 10px; background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px 12px;">
                            <option value="all" ${selectedTyp === 'all' ? 'selected' : ''}>Alle Formate</option>
                            ${types.map(t => `<option value="${escapeHTML(t)}" ${selectedTyp === t ? 'selected' : ''}>${escapeHTML(t)}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <!-- Big Spin Button -->
                <div style="text-align: center; margin-top: 24px;">
                    <button id="btn-draw-random-comic" class="btn" style="
                        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                        color: #ffffff;
                        font-weight: 700;
                        font-size: 1.1rem;
                        padding: 14px 32px;
                        border-radius: 14px;
                        border: 1px solid rgba(255, 255, 255, 0.25);
                        box-shadow: 0 8px 25px -4px rgba(99, 102, 241, 0.5);
                        cursor: pointer;
                        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                        display: inline-flex;
                        align-items: center;
                        gap: 12px;
                    " ${totalEligible === 0 ? 'disabled' : ''}>
                        <i class="fa-solid fa-dice-five" style="font-size: 1.3rem;"></i>
                        <span>ZUFÄLLIGEN BAND ZIEHEN</span>
                    </button>
                </div>
            </div>

            <!-- Result Slot / Winner Container -->
            <div id="random-pick-result-container">
                ${renderInitialSlotState(totalEligible)}
            </div>
        </div>
    `;
}

/**
 * Rendert den Initial-Zustand vor der ersten Ziehung.
 */
export function renderInitialSlotState(totalEligible) {
    if (totalEligible === 0) {
        return `
            <div class="details-card" style="padding: 40px 24px; text-align: center; border-radius: 16px; border: 1px dashed var(--border-color); background: rgba(15, 23, 42, 0.4);">
                <i class="fa-solid fa-circle-exclamation" style="font-size: 2.5rem; color: var(--warning); margin-bottom: 12px;"></i>
                <h3 style="font-size: 1.2rem; margin-bottom: 8px; color: var(--text-primary);">Keine Comics für diese Kriterien gefunden</h3>
                <p style="color: var(--text-secondary); margin: 0; font-size: 0.9rem;">Passe die Filtereinstellungen oben an, um Bände in den Ziehungstopf aufzunehmen.</p>
            </div>
        `;
    }

    return `
        <div class="details-card" style="padding: 48px 24px; text-align: center; border-radius: 16px; border: 1px dashed rgba(99, 102, 241, 0.3); background: rgba(99, 102, 241, 0.03);">
            <div style="font-size: 3rem; margin-bottom: 12px;">🎰</div>
            <h3 style="font-family: var(--font-display); font-size: 1.3rem; margin-bottom: 8px; color: var(--text-primary);">Bereit für die Ziehung?</h3>
            <p style="color: var(--text-secondary); margin: 0; font-size: 0.95rem;">Klicke oben auf <strong>„ZUFÄLLIGEN BAND ZIEHEN“</strong>, um einen zufälligen Comic auszuwählen.</p>
        </div>
    `;
}

/**
 * Rendert das gewählte Comic in einer edlen Hero-Highlight-Karte.
 */
export function renderWinnerCard(comic, currencySymbol = '€') {
    if (!comic) return renderInitialSlotState(0);

    const title = escapeHTML(comic.titel || 'Unbenannt');
    const serie = comic.serie ? escapeHTML(comic.serie) : '';
    const numStr = (comic.nummer !== undefined && comic.nummer !== null && comic.nummer !== '') ? `#${escapeHTML(String(comic.nummer))}` : '';
    const verlag = comic.verlag ? escapeHTML(comic.verlag) : '-';
    const typ = escapeHTML(comic.typ || comic.format || '-');
    const kaufdatum = formatGermanDate(comic.kaufdatum);
    const priceNum = Number(comic.preis);
    const displayPrice = !isNaN(priceNum) && comic.preis !== null ? formatCurrency(priceNum, currencySymbol) : '-';
    const isRead = comic.gelesen === true || !!comic.gelesen_am;

    const coverHtml = comic.cover_url 
        ? `<img src="${escapeHTML(comic.cover_url)}" alt="${title}" style="width: 100%; height: 260px; object-fit: cover; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">`
        : `<div style="width: 100%; height: 260px; border-radius: 12px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid var(--border-color); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
            <i class="fa-solid fa-book-open" style="font-size: 3rem; color: var(--primary-color); opacity: 0.8; margin-bottom: 12px;"></i>
            <div style="font-weight: 700; font-size: 1.1rem; color: #ffffff;">${title}</div>
            ${numStr ? `<div style="color: var(--text-primary); font-weight: 700; margin-top: 4px;">${numStr}</div>` : ''}
          </div>`;

    return `
        <div class="winner-card" style="
            background: var(--bg-card);
            border: 2px solid var(--primary-color);
            border-radius: 20px;
            padding: 28px;
            box-shadow: 0 16px 40px -10px rgba(99, 102, 241, 0.35);
        ">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                <span class="badge" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; font-weight: 800; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; letter-spacing: 0.5px; text-transform: uppercase;">
                    🎉 DEIN ZUFALLSPICK
                </span>
            </div>

            <div style="display: grid; grid-template-columns: 180px 1fr; gap: 24px; align-items: start;">
                <!-- Cover -->
                <div>
                    ${coverHtml}
                </div>

                <!-- Comic Details -->
                <div>
                    <h3 style="font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 4px; color: var(--text-primary); line-height: 1.2;">
                        ${title}
                    </h3>
                    
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;">
                        ${serie ? `<span style="font-size: 1rem; color: var(--text-secondary); font-weight: 600;">${serie}</span>` : ''}
                        ${numStr ? `<span style="font-size: 1rem; font-weight: 700; color: var(--text-primary); background: rgba(255, 255, 255, 0.08); border: 1px solid var(--border-color); padding: 2px 10px; border-radius: 8px;">${numStr}</span>` : ''}
                    </div>

                    <!-- Specs Grid -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border-color); padding: 14px; border-radius: 12px; margin-bottom: 20px;">
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">Verlag</div>
                            <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">${verlag}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">Format</div>
                            <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">${typ}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">Kaufdatum</div>
                            <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">${kaufdatum}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">Preis</div>
                            <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">${displayPrice}</div>
                        </div>
                    </div>

                    <!-- Status Indicator -->
                    <div style="margin-bottom: 20px;">
                        ${isRead ? `
                            <span style="color: var(--success); font-weight: 700; display: inline-flex; align-items: center; gap: 6px; font-size: 0.95rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 6px 14px; border-radius: 10px;">
                                <i class="fa-solid fa-circle-check"></i> Bereits gelesen ${comic.gelesen_am ? `(${formatGermanDate(comic.gelesen_am)})` : ''}
                            </span>
                        ` : `
                            <span style="color: var(--warning); font-weight: 700; display: inline-flex; align-items: center; gap: 6px; font-size: 0.95rem; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 6px 14px; border-radius: 10px;">
                                <i class="fa-solid fa-book"></i> Ungelesen auf deinem Lesestapel
                            </span>
                        `}
                    </div>

                    <!-- Quick Action Buttons -->
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        ${!isRead ? `
                            <button id="btn-pick-mark-read" data-id="${escapeHTML(comic.id)}" class="btn btn-success" style="padding: 10px 18px; border-radius: 10px; font-weight: 600; gap: 8px;">
                                <i class="fa-solid fa-check"></i> Als gelesen markieren
                            </button>
                        ` : ''}

                        <button id="btn-pick-view-in-collection" data-query="${escapeHTML(comic.titel || comic.serie || '')}" class="btn btn-secondary" style="padding: 10px 18px; border-radius: 10px; font-weight: 600; gap: 8px;">
                            <i class="fa-solid fa-magnifying-glass"></i> In Sammlung anzeigen
                        </button>

                        <button id="btn-pick-again" class="btn" style="padding: 10px 18px; border-radius: 10px; font-weight: 600; gap: 8px; background: rgba(99, 102, 241, 0.15); color: var(--primary-color); border: 1px solid rgba(99, 102, 241, 0.3);">
                            <i class="fa-solid fa-dice"></i> Noch einen ziehen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}
