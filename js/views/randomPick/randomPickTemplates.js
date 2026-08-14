import { escapeHTML, formatCurrency } from '../../utils.js';
import { formatGermanDate } from '../../services/stats/statsUtils.js';

export function renderRandomPickLayout({ activeStack = 'unread', selectedVerlag = 'all', selectedTyp = 'all' }, publishers = [], types = [], totalEligible = 0, smartInsightHtml = '') {
    return `
        <div class="random-pick-container" style="max-width: 960px; margin: 0 auto; padding: 40px 20px;">
            <!-- Premium Header -->
            <div class="view-header-block" style="text-align: center; margin-bottom: 40px; position: relative;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 200px; height: 200px; background: var(--primary-color); filter: blur(100px); opacity: 0.15; z-index: -1; pointer-events: none;"></div>
                
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; border-radius: 24px; background: linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 100%); margin-bottom: 20px; box-shadow: 0 15px 35px -10px rgba(99, 102, 241, 0.5); border: 1px solid rgba(255,255,255,0.1); position: relative;">
                    <i class="fa-solid fa-dice-d20" style="font-size: 2.5rem; color: #ffffff; text-shadow: 0 4px 15px rgba(0,0,0,0.3);"></i>
                </div>
                
                <h2 style="font-family: var(--font-display); font-size: 3.2rem; font-weight: 800; margin-bottom: 16px; background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -1px; text-shadow: 0 10px 30px rgba(99, 102, 241, 0.2);">Comic Roulette</h2>
                
                <p style="font-size: 1.15rem; color: var(--text-secondary); max-width: 550px; margin: 0 auto; line-height: 1.6; font-weight: 400;">
                    Lass das Schicksal entscheiden. Finde dein nächstes Abenteuer aus dem Lesestapel mit nur einem Klick.
                </p>
            </div>

            <!-- Smart Insight Badge (Glassmorphism) -->
            <div id="pick-smart-insight-badge" style="background: rgba(99, 102, 241, 0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 16px; padding: 16px 24px; text-align: center; margin-bottom: 32px; color: var(--text-primary); font-size: 1rem; box-shadow: 0 4px 20px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; gap: 12px; font-weight: 500;">
                <i class="fa-solid fa-lightbulb" style="color: #f59e0b; font-size: 1.2rem; filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.5));"></i>
                <div>${smartInsightHtml}</div>
            </div>

            <!-- Filter-Panel (Premium Glass) -->
            <div class="details-card" style="padding: 32px; border-radius: 24px; margin-bottom: 32px; background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.05); box-shadow: 0 20px 40px -15px rgba(0,0,0,0.3);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 16px;">
                    <span style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary); display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-sliders" style="color: var(--primary-color);"></i> Ziehungs-Kriterien
                    </span>
                    <span id="eligible-count-badge" class="badge" style="background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.3); padding: 6px 16px; border-radius: 20px; font-size: 0.9rem; font-weight: 600; box-shadow: inset 0 0 10px rgba(99,102,241,0.1);">
                        ${totalEligible} Comics im Topf
                    </span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
                    <!-- Stapel-Auswahl -->
                    <div>
                        <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Kategorie</label>
                        <select id="pick-stack-select" class="form-control" style="width: 100%; border-radius: 12px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1); color: var(--text-primary); padding: 12px 16px; font-size: 0.95rem; transition: all 0.2s; cursor: pointer;">
                            <option value="unread" ${activeStack === 'unread' ? 'selected' : ''}>⏳ Lesestapel (Ungelesene)</option>
                            <option value="vorhanden" ${activeStack === 'vorhanden' ? 'selected' : ''}>📦 Physischer Bestand (Alle)</option>
                            <option value="wunschliste" ${activeStack === 'wunschliste' ? 'selected' : ''}>⭐ Wunschliste</option>
                            <option value="read" ${activeStack === 'read' ? 'selected' : ''}>📜 Bereits gelesene Comics</option>
                            <option value="all" ${activeStack === 'all' ? 'selected' : ''}>🌐 Gesamte Datenbank</option>
                        </select>
                    </div>

                    <!-- Verlag-Auswahl -->
                    <div>
                        <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Verlag</label>
                        <select id="pick-verlag-select" class="form-control" style="width: 100%; border-radius: 12px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1); color: var(--text-primary); padding: 12px 16px; font-size: 0.95rem; transition: all 0.2s; cursor: pointer;">
                            <option value="all" ${selectedVerlag === 'all' ? 'selected' : ''}>Alle Verlage</option>
                            ${publishers.map(v => `<option value="${escapeHTML(v)}" ${selectedVerlag === v ? 'selected' : ''}>${escapeHTML(v)}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Typ-Auswahl -->
                    <div>
                        <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Format</label>
                        <select id="pick-typ-select" class="form-control" style="width: 100%; border-radius: 12px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1); color: var(--text-primary); padding: 12px 16px; font-size: 0.95rem; transition: all 0.2s; cursor: pointer;">
                            <option value="all" ${selectedTyp === 'all' ? 'selected' : ''}>Alle Formate</option>
                            ${types.map(t => `<option value="${escapeHTML(t)}" ${selectedTyp === t ? 'selected' : ''}>${escapeHTML(t)}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <!-- Big Spin Button (Pulsing, Massive Glow) -->
                <div style="text-align: center; margin-top: 36px; position: relative;">
                    <style>
                        @keyframes pulseGlow {
                            0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
                            70% { box-shadow: 0 0 0 20px rgba(99, 102, 241, 0); }
                            100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                        }
                        #btn-draw-random-comic:not(:disabled) {
                            animation: pulseGlow 2.5s infinite;
                        }
                        #btn-draw-random-comic:hover:not(:disabled) {
                            transform: translateY(-2px) scale(1.02);
                            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%) !important;
                            box-shadow: 0 12px 35px -5px rgba(99, 102, 241, 0.6) !important;
                        }
                        #btn-draw-random-comic:active:not(:disabled) {
                            transform: translateY(1px) scale(0.98);
                        }
                        #btn-draw-random-comic:disabled {
                            background: rgba(255,255,255,0.05) !important;
                            color: rgba(255,255,255,0.3) !important;
                            box-shadow: none !important;
                            border: 1px solid rgba(255,255,255,0.1) !important;
                            cursor: not-allowed;
                        }
                    </style>
                    <button id="btn-draw-random-comic" class="btn" style="
                        background: linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 100%);
                        color: #ffffff;
                        font-family: var(--font-display);
                        font-weight: 800;
                        font-size: 1.3rem;
                        padding: 18px 48px;
                        border-radius: 100px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.5);
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                        display: inline-flex;
                        align-items: center;
                        gap: 16px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    " ${totalEligible === 0 ? 'disabled' : ''}>
                        <i class="fa-solid fa-dice-five" style="font-size: 1.6rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>
                        <span>Zufälligen Band ziehen</span>
                    </button>
                </div>
            </div>

            <!-- Result Slot / Winner Container -->
            <div id="random-pick-result-container" style="min-height: 350px;">
                ${renderInitialSlotState(totalEligible)}
            </div>
        </div>
    `;
}

export function renderInitialSlotState(totalEligible) {
    if (totalEligible === 0) {
        return `
            <div style="padding: 60px 24px; text-align: center; border-radius: 24px; border: 2px dashed rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); backdrop-filter: blur(10px);">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); margin-bottom: 20px;">
                    <i class="fa-solid fa-ghost" style="font-size: 2.5rem; color: #ef4444;"></i>
                </div>
                <h3 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 12px; color: var(--text-primary);">Der Topf ist leer!</h3>
                <p style="color: var(--text-secondary); margin: 0 auto; font-size: 1rem; max-width: 400px; line-height: 1.5;">Passe die Filter oben an, um Bände in den Ziehungstopf aufzunehmen. Für diese Kriterien gibt es leider keine Treffer.</p>
            </div>
        `;
    }

    return `
        <div style="padding: 60px 24px; text-align: center; border-radius: 24px; border: 2px dashed rgba(99, 102, 241, 0.3); background: rgba(99, 102, 241, 0.03); backdrop-filter: blur(10px); transition: all 0.3s ease;">
            <div style="font-size: 4rem; margin-bottom: 20px; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.2));">🎰</div>
            <h3 style="font-family: var(--font-display); font-size: 1.8rem; margin-bottom: 12px; color: var(--text-primary); font-weight: 800;">Bereit für die Ziehung?</h3>
            <p style="color: var(--text-secondary); margin: 0 auto; font-size: 1.1rem; max-width: 450px; line-height: 1.6;">
                Klicke auf den Button oben, und das Comic-Roulette ermittelt dein nächstes Lese-Abenteuer!
            </p>
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
    const priceNum = Number(comic.preis);
    const displayPrice = !isNaN(priceNum) && comic.preis !== null ? formatCurrency(priceNum, currencySymbol) : '-';
    const isRead = comic.gelesen === true || !!comic.gelesen_am;

    const coverHtml = comic.cover_url 
        ? `<img src="${escapeHTML(comic.cover_url)}" alt="${title}" style="width: 100%; height: 320px; object-fit: cover; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1); transition: transform 0.3s ease;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">`
        : `<div style="width: 100%; height: 320px; border-radius: 16px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; box-shadow: inset 0 0 40px rgba(0,0,0,0.5), 0 20px 40px rgba(0,0,0,0.4);">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(99, 102, 241, 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <i class="fa-solid fa-book-open" style="font-size: 2.5rem; color: var(--primary-color);"></i>
            </div>
            <div style="font-family: var(--font-display); font-weight: 800; font-size: 1.3rem; color: #ffffff; line-height: 1.3;">${title}</div>
            ${numStr ? `<div style="color: var(--primary-color); font-weight: 700; font-size: 1.2rem; margin-top: 8px;">${numStr}</div>` : ''}
          </div>`;

    return `
        <div class="winner-card" style="
            background: linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(99, 102, 241, 0.4);
            border-radius: 24px;
            padding: 32px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1);
            animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            position: relative;
            overflow: hidden;
        ">
            <style>
                @keyframes slideUpFade {
                    0% { opacity: 0; transform: translateY(30px) scale(0.98); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
            </style>
            
            <!-- Deco Glow inside Card -->
            <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: var(--primary-color); filter: blur(70px); opacity: 0.2; pointer-events: none;"></div>

            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 16px;">
                <span class="badge" style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: #ffffff; font-weight: 800; padding: 8px 16px; border-radius: 100px; font-size: 0.85rem; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);">
                    <i class="fa-solid fa-trophy" style="margin-right: 6px;"></i> Dein Pick
                </span>
                
                <!-- Status Badge Top Right -->
                ${isRead ? `
                    <span style="color: #10b981; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; font-size: 0.9rem; background: rgba(16, 185, 129, 0.1); padding: 6px 14px; border-radius: 100px; border: 1px solid rgba(16, 185, 129, 0.2);">
                        <i class="fa-solid fa-check"></i> Gelesen
                    </span>
                ` : `
                    <span style="color: #f59e0b; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; font-size: 0.9rem; background: rgba(245, 158, 11, 0.1); padding: 6px 14px; border-radius: 100px; border: 1px solid rgba(245, 158, 11, 0.2);">
                        <i class="fa-solid fa-clock"></i> Ungelesen
                    </span>
                `}
            </div>

            <div style="display: grid; grid-template-columns: 220px 1fr; gap: 32px; align-items: start;">
                <!-- Cover -->
                <div style="position: relative;">
                    ${coverHtml}
                    <!-- Decorative shiny overlay -->
                    <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%); border-radius: 16px; pointer-events: none;"></div>
                </div>

                <!-- Comic Details -->
                <div style="display: flex; flex-direction: column; height: 100%;">
                    
                    <div style="margin-bottom: auto;">
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
                            ${serie ? `<span style="font-size: 1.1rem; color: var(--primary-color); font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">${serie}</span>` : ''}
                        </div>
                        
                        <h3 style="font-family: var(--font-display); font-size: 2.2rem; margin-bottom: 8px; color: #ffffff; line-height: 1.15; font-weight: 900; letter-spacing: -0.5px; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                            ${title} ${numStr ? `<span style="color: rgba(255,255,255,0.5); font-weight: 300;">${numStr}</span>` : ''}
                        </h3>
                    </div>

                    <!-- Specs Grid (Glassy) -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 16px; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 16px; margin: 24px 0;">
                        <div>
                            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Verlag</div>
                            <div style="font-weight: 700; color: #ffffff; font-size: 1rem;">${verlag}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Format</div>
                            <div style="font-weight: 700; color: #ffffff; font-size: 1rem;">${typ}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Gekauft</div>
                            <div style="font-weight: 700; color: #ffffff; font-size: 1rem;">${kaufdatum}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Preis</div>
                            <div style="font-weight: 700; color: #ffffff; font-size: 1rem;">${displayPrice}</div>
                        </div>
                    </div>

                    <!-- Quick Action Buttons -->
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        ${!isRead ? `
                            <button id="btn-pick-mark-read" data-id="${escapeHTML(comic.id)}" class="btn" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 24px; border-radius: 12px; font-weight: 700; gap: 10px; border: none; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); transition: all 0.2s;">
                                <i class="fa-solid fa-check-double"></i> Als gelesen markieren
                            </button>
                        ` : ''}

                        <button id="btn-pick-view-in-collection" data-query="${escapeHTML(comic.titel || comic.serie || '')}" class="btn" style="background: rgba(255,255,255,0.05); color: #ffffff; border: 1px solid rgba(255,255,255,0.1); padding: 12px 24px; border-radius: 12px; font-weight: 600; gap: 10px; transition: all 0.2s;">
                            <i class="fa-solid fa-magnifying-glass"></i> In Sammlung
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}
