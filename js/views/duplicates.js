import { db } from '../db.js';
import { escapeHTML, displayDate, renderStars, getPlaceholderImage } from '../utils.js';
import { openModal } from './form.js';

let activeTab = 'candidates'; // 'candidates' oder 'ignored'
let activeMatchTypeFilter = 'exact'; // Standardmäßig auf 'exact' gefiltert!
let eventsAttached = false;
let currentDuplicateGroups = [];
let activeMergePair = null;

// Hilfsfunktion zum Normalisieren von Texten für den Vergleich
export function normalizeText(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .replace(/[^\w\säöüß]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Prüft, ob zwei Texte ähnlich sind (z. B. Substrings oder hoher Überlappungsgrad)
export function isSimilarText(str1, str2) {
    const s1 = normalizeText(str1);
    const s2 = normalizeText(str2);
    if (!s1 || !s2) return false;
    if (s1 === s2) return true;
    if (s1.length > 4 && s2.length > 4) {
        if (s1.includes(s2) || s2.includes(s1)) return true;
    }
    return false;
}

// Liest die Ignorier-Liste (Whitelist) aus den Einstellungen
export function getIgnoredDuplicatesList() {
    const settings = db.getSettings();
    return settings.ignoredDuplicates || JSON.parse(localStorage.getItem('comicvault_ignored_duplicates') || '[]');
}

// Speichert die Ignorier-Liste (Whitelist)
export async function saveIgnoredDuplicatesList(list) {
    const settings = db.getSettings();
    settings.ignoredDuplicates = list;
    localStorage.setItem('comicvault_ignored_duplicates', JSON.stringify(list));
    await db.saveSettings(settings);
}

// Erzeugt einen eindeutigen Schlüssel für ein Comic-Paar (unabhängig von der Reihenfolge)
export function getPairKey(id1, id2) {
    return [String(id1), String(id2)].sort().join('___');
}

// Erkennt Duplikate in einer Liste von Comics
export function findDuplicates(comics, ignoredList = []) {
    const ignoredSet = new Set(ignoredList);
    const pairs = [];
    const seenPairs = new Set();

    for (let i = 0; i < comics.length; i++) {
        for (let j = i + 1; j < comics.length; j++) {
            const cA = comics[i];
            const cB = comics[j];

            const pairKey = getPairKey(cA.id, cB.id);
            if (seenPairs.has(pairKey)) continue;

            const isIgnored = ignoredSet.has(pairKey);

            const normTitleA = normalizeText(cA.titel);
            const normTitleB = normalizeText(cB.titel);
            const normSerieA = normalizeText(cA.serie);
            const normSerieB = normalizeText(cB.serie);

            const numA = (cA.nummer !== null && cA.nummer !== undefined) ? String(cA.nummer).trim() : '';
            const numB = (cB.nummer !== null && cB.nummer !== undefined) ? String(cB.nummer).trim() : '';

            const verlagA = normalizeText(cA.verlag);
            const verlagB = normalizeText(cB.verlag);
            const formatA = normalizeText(cA.format);
            const formatB = normalizeText(cB.format);

            const titlesMatch = normTitleA === normTitleB;
            const seriesMatch = normSerieA === normSerieB;
            const numbersMatch = numA === numB;
            const publishersMatch = verlagA === verlagB;
            const formatsMatch = formatA === formatB;

            let matchType = null;

            // Exaktes Duplikat: Titel, Serie, Nummer, Verlag und Format sind identisch
            if (titlesMatch && seriesMatch && numbersMatch && publishersMatch && formatsMatch) {
                matchType = 'exact';
            }
            // Gleicher Band: Serie, Nummer und Titel passen überein
            else if (titlesMatch && seriesMatch && numbersMatch) {
                matchType = 'issue';
            }
            // Ähnlicher Titel/Serie mit gleicher Heftnummer
            else if (numbersMatch && (isSimilarText(cA.titel, cB.titel) || isSimilarText(cA.serie, cB.serie))) {
                matchType = 'similar';
            }

            if (matchType) {
                seenPairs.add(pairKey);
                pairs.push({
                    key: pairKey,
                    comicA: cA,
                    comicB: cB,
                    matchType,
                    isIgnored
                });
            }
        }
    }

    return pairs;
}

export async function renderDuplicates(container) {
    const allComics = await db.getAllComics();
    const ignoredList = getIgnoredDuplicatesList();
    const allPairs = findDuplicates(allComics, ignoredList);

    const candidates = allPairs.filter(p => !p.isIgnored);
    const ignoredPairs = allPairs.filter(p => p.isIgnored);

    currentDuplicateGroups = allPairs;

    const exactCount = candidates.filter(p => p.matchType === 'exact').length;
    const issueCount = candidates.filter(p => p.matchType === 'issue').length;
    const similarCount = candidates.filter(p => p.matchType === 'similar').length;

    const html = `
        <div class="duplicates-view" style="padding-bottom: 40px;">
            <!-- Header & KPIs -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 24px;">
                <div>
                    <h2 style="margin: 0; font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 700; color: var(--text-main);">
                        <i class="fa-solid fa-copy" style="color: var(--primary-color); margin-right: 10px;"></i>Duplikat-Finder
                    </h2>
                    <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">
                        Durchsuche deine Sammlung nach exakten oder ähnlichen Mehrfacheinträgen und bereinige sie.
                    </p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-secondary" id="btn-refresh-duplicates" title="Erneuten Scan durchführen">
                        <i class="fa-solid fa-rotate-right"></i> Scan neu starten
                    </button>
                    ${exactCount > 0 ? `
                        <button class="btn btn-primary" id="btn-auto-clean-exact" style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> Exakte Duplikate bereinigen (${exactCount})
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- KPI Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 24px;">
                <div class="stats-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px;">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600;">Mögliche Duplikate</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary-color); margin-top: 4px;">${candidates.length}</div>
                </div>
                <div class="stats-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px;">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600;">Exakte Treffer</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: var(--success); margin-top: 4px;">${exactCount}</div>
                </div>
                <div class="stats-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px;">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600;">Ähnliche Bände</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: var(--warning); margin-top: 4px;">${issueCount + similarCount}</div>
                </div>
                <div class="stats-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px;">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600;">Ignorierte Paare (Kein Duplikat)</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: var(--text-secondary); margin-top: 4px;">${ignoredPairs.length}</div>
                </div>
            </div>

            <!-- Tabs -->
            <div style="display: flex; gap: 10px; border-bottom: 1px solid var(--border-color); margin-bottom: 20px; padding-bottom: 10px;">
                <button class="btn ${activeTab === 'candidates' ? 'btn-primary' : 'btn-secondary'}" id="tab-duplicates-candidates">
                    <i class="fa-solid fa-list-check"></i> Mögliche Duplikate (${candidates.length})
                </button>
                <button class="btn ${activeTab === 'ignored' ? 'btn-primary' : 'btn-secondary'}" id="tab-duplicates-ignored">
                    <i class="fa-solid fa-shield-halved"></i> Ignorierte Paare (${ignoredPairs.length})
                </button>
            </div>

            <!-- Tab Content -->
            <div id="duplicates-content-area">
                ${activeTab === 'candidates' ? renderCandidatesTab(candidates) : renderIgnoredTab(ignoredPairs)}
            </div>
        </div>

        <!-- Merge Modal Overlay -->
        <div class="modal-overlay" id="duplicate-merge-modal" style="display: none; z-index: 2000;">
            <div class="modal-content" style="max-width: 850px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2><i class="fa-solid fa-code-merge" style="color: var(--primary-color); margin-right: 8px;"></i>Comics zusammenführen</h2>
                    <button class="close-btn" id="btn-close-merge-modal"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div id="merge-modal-body" style="padding: 16px 0;">
                    <!-- Interaktive Zusammenführungs-Tabelle wird hier injiziert -->
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    attachDuplicatesEvents(container);
}

function renderCandidatesTab(candidates) {
    let filtered = candidates;
    if (activeMatchTypeFilter !== 'all') {
        filtered = candidates.filter(p => p.matchType === activeMatchTypeFilter);
    }

    const exactCount = candidates.filter(p => p.matchType === 'exact').length;
    const issueCount = candidates.filter(p => p.matchType === 'issue').length;
    const similarCount = candidates.filter(p => p.matchType === 'similar').length;

    const filterBarHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; background: var(--bg-card); padding: 12px 16px; border-radius: 10px; border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">
                    <i class="fa-solid fa-filter" style="margin-right: 6px; color: var(--primary-color);"></i>Gefiltert nach:
                </span>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button class="btn ${activeMatchTypeFilter === 'exact' ? 'btn-primary' : 'btn-secondary'} btn-filter-match" data-match="exact" style="font-size: 0.8rem; padding: 5px 12px;">
                        Exakte Treffer (${exactCount})
                    </button>
                    <button class="btn ${activeMatchTypeFilter === 'issue' ? 'btn-primary' : 'btn-secondary'} btn-filter-match" data-match="issue" style="font-size: 0.8rem; padding: 5px 12px;">
                        Gleiche Bände (${issueCount})
                    </button>
                    <button class="btn ${activeMatchTypeFilter === 'similar' ? 'btn-primary' : 'btn-secondary'} btn-filter-match" data-match="similar" style="font-size: 0.8rem; padding: 5px 12px;">
                        Ähnliche Titel (${similarCount})
                    </button>
                    <button class="btn ${activeMatchTypeFilter === 'all' ? 'btn-primary' : 'btn-secondary'} btn-filter-match" data-match="all" style="font-size: 0.8rem; padding: 5px 12px;">
                        Alle Treffer (${candidates.length})
                    </button>
                </div>
            </div>
        </div>
    `;

    if (filtered.length === 0) {
        let emptyMsg = 'Keine Duplikate gefunden';
        let emptyDesc = 'Deine Sammlung ist sauber und enthält keine potenziellen doppelten Einträge.';
        if (activeMatchTypeFilter === 'exact') {
            emptyMsg = 'Keine exakten Duplikate gefunden';
            emptyDesc = 'Es wurden keine 100% identischen Einträge gefunden. Klicke oben auf "Gleiche Bände" oder "Alle Treffer", um weitere Kandidaten zu prüfen.';
        } else if (activeMatchTypeFilter === 'issue') {
            emptyMsg = 'Keine gleichen Bände gefunden';
            emptyDesc = 'Es wurden keine gleichen Bände mit abweichendem Format/Verlag gefunden.';
        } else if (activeMatchTypeFilter === 'similar') {
            emptyMsg = 'Keine ähnlichen Titel gefunden';
            emptyDesc = 'Es wurden keine Titel mit ähnlicher Schreibweise gefunden.';
        }

        return `
            ${filterBarHtml}
            <div style="text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border-color);">
                <i class="fa-solid fa-circle-check" style="font-size: 3rem; color: var(--success); margin-bottom: 16px;"></i>
                <h3 style="margin: 0 0 8px 0; color: var(--text-main);">${emptyMsg}</h3>
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">${emptyDesc}</p>
            </div>
        `;
    }

    return filterBarHtml + filtered.map(pair => renderPairCard(pair, false)).join('');
}

function renderIgnoredTab(ignoredPairs) {
    if (ignoredPairs.length === 0) {
        return `
            <div style="text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border-color);">
                <i class="fa-solid fa-shield-halved" style="font-size: 3rem; color: var(--text-secondary); opacity: 0.5; margin-bottom: 16px;"></i>
                <h3 style="margin: 0 0 8px 0; color: var(--text-main);">Keine ignorierten Paare</h3>
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">Du hast bisher keine Duplikat-Kandidaten als "Kein Duplikat" markiert.</p>
            </div>
        `;
    }

    return ignoredPairs.map(pair => renderPairCard(pair, true)).join('');
}

function renderPairCard(pair, isIgnoredView) {
    const { key, comicA, comicB, matchType } = pair;

    let badgeLabel = 'Exakt';
    let badgeClass = 'background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3);';

    if (matchType === 'issue') {
        badgeLabel = 'Gleicher Band';
        badgeClass = 'background: rgba(6, 182, 212, 0.15); color: var(--primary-color); border: 1px solid rgba(6, 182, 212, 0.3);';
    } else if (matchType === 'similar') {
        badgeLabel = 'Ähnlicher Titel';
        badgeClass = 'background: rgba(245, 158, 11, 0.15); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.3);';
    }

    return `
        <div class="duplicate-pair-card" data-key="${key}" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; ${badgeClass}">
                        ${badgeLabel}
                    </span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">
                        Match: ${escapeHTML(comicA.serie || comicA.titel || '')} ${comicA.nummer ? '#' + comicA.nummer : ''}
                    </span>
                </div>
                <div style="display: flex; gap: 8px;">
                    ${isIgnoredView ? `
                        <button class="btn btn-secondary btn-unignore-pair" data-key="${key}" style="font-size: 0.8rem; padding: 6px 12px;">
                            <i class="fa-solid fa-rotate-left"></i> Wieder als Duplikat aktivieren
                        </button>
                    ` : `
                        <button class="btn btn-secondary btn-ignore-pair" data-key="${key}" style="font-size: 0.8rem; padding: 6px 12px;" title="Als gewollt unterschiedlich markieren">
                            <i class="fa-solid fa-eye-slash"></i> Kein Duplikat
                        </button>
                        <button class="btn btn-primary btn-open-merge-pair" data-key="${key}" style="font-size: 0.8rem; padding: 6px 12px;" title="Feld für Feld zusammenführen">
                            <i class="fa-solid fa-code-merge"></i> Zusammenführen
                        </button>
                    `}
                </div>
            </div>

            <!-- Comparison Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; @media (max-width: 768px) { grid-template-columns: 1fr; }">
                ${renderComicComparisonBox(comicA, comicB, 'A', isIgnoredView, key)}
                ${renderComicComparisonBox(comicB, comicA, 'B', isIgnoredView, key)}
            </div>
        </div>
    `;
}

function renderComicComparisonBox(comic, otherComic, label, isIgnoredView, pairKey) {
    const imgUrl = comic.bild || getPlaceholderImage();

    const diffTitle = normalizeText(comic.titel) !== normalizeText(otherComic.titel);
    const diffSerie = normalizeText(comic.serie) !== normalizeText(otherComic.serie);
    const diffFormat = normalizeText(comic.format) !== normalizeText(otherComic.format);
    const diffBestand = comic.bestand !== otherComic.bestand;

    return `
        <div style="background: rgba(0, 0, 0, 0.2); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; display: flex; flex-direction: column;">
            <div style="display: flex; gap: 14px; margin-bottom: 12px;">
                <img src="${imgUrl}" alt="${escapeHTML(comic.titel)}" style="width: 70px; height: 95px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color);" onerror="this.onerror=null; this.src='${getPlaceholderImage()}';">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 0.7rem; color: var(--primary-color); font-weight: 700;">EINTRAG ${label}</div>
                    <h4 style="margin: 2px 0; font-size: 0.95rem; color: ${diffTitle ? 'var(--warning)' : 'var(--text-main)'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${escapeHTML(comic.titel || 'Ohne Titel')}
                    </h4>
                    <div style="font-size: 0.8rem; color: ${diffSerie ? 'var(--warning)' : 'var(--text-secondary)'};">
                        ${escapeHTML(comic.serie || '')} ${comic.nummer ? '#' + comic.nummer : ''}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">
                        ${escapeHTML(comic.verlag || '-')} ${comic.jahr ? '(' + comic.jahr + ')' : ''}
                    </div>
                </div>
            </div>

            <!-- Details -->
            <div style="font-size: 0.78rem; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; color: var(--text-secondary); background: rgba(255, 255, 255, 0.02); padding: 10px; border-radius: 6px; margin-bottom: 12px; flex: 1;">
                <div><strong>Format:</strong> <span style="${diffFormat ? 'color: var(--warning);' : ''}">${escapeHTML(comic.format || '-')}</span></div>
                <div><strong>Bestand:</strong> <span style="${diffBestand ? 'color: var(--warning);' : ''}">${escapeHTML(comic.bestand || '-')}</span></div>
                <div><strong>Gekauft:</strong> ${displayDate(comic.kaufdatum) || '-'}</div>
                <div><strong>Gelesen:</strong> ${displayDate(comic.gelesen_am) || '-'}</div>
                <div><strong>Preis:</strong> ${comic.preis ? Number(comic.preis).toFixed(2) + ' ' + (db.getSettings().currency || '€') : '-'}</div>
                <div><strong>Bewertung:</strong> ${comic.bewertung ? renderStars(comic.bewertung) : '-'}</div>
            </div>

            <!-- Actions per item -->
            ${!isIgnoredView ? `
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-secondary btn-delete-single-duplicate" data-delete-id="${comic.id}" data-keep-id="${otherComic.id}" style="flex: 1; font-size: 0.78rem; padding: 6px 8px; color: var(--danger); border-color: rgba(239, 68, 68, 0.3);" title="Diesen Eintrag löschen und den anderen behalten">
                        <i class="fa-solid fa-trash"></i> Eintrag ${label} löschen
                    </button>
                    <button class="btn btn-secondary btn-edit-duplicate" data-id="${comic.id}" style="font-size: 0.78rem; padding: 6px 10px;" title="Bearbeiten">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// Öffnet das Feld-für-Feld Zusammenführungs-Modal
export function openMergeModal(pair) {
    const { comicA, comicB } = pair;
    activeMergePair = pair;

    const fields = [
        { key: 'titel', label: 'Titel' },
        { key: 'serie', label: 'Serie' },
        { key: 'nummer', label: 'Heftnummer' },
        { key: 'verlag', label: 'Verlag' },
        { key: 'jahr', label: 'Erscheinungsjahr' },
        { key: 'format', label: 'Format' },
        { key: 'typ', label: 'Typ' },
        { key: 'bestand', label: 'Bestand' },
        { key: 'kaufdatum', label: 'Kaufdatum' },
        { key: 'gelesen_am', label: 'Gelesen-Datum' },
        { key: 'preis', label: 'Preis' },
        { key: 'bewertung', label: 'Bewertung' },
        { key: 'bezugsquelle', label: 'Bezugsquelle' },
        { key: 'sprache', label: 'Sprache' },
        { key: 'zustand', label: 'Zustand' },
        { key: 'bemerkung', label: 'Bemerkung' },
        { key: 'bild', label: 'Cover-Bild' }
    ];

    const modalBody = document.getElementById('merge-modal-body');
    if (!modalBody) return;

    let rowsHtml = fields.map(f => {
        const valA = comicA[f.key] !== undefined && comicA[f.key] !== null ? comicA[f.key] : '';
        const valB = comicB[f.key] !== undefined && comicB[f.key] !== null ? comicB[f.key] : '';

        // Automatische Vorauswahl: Bevorzuge gefüllten Wert, sonst Wert A
        const defaultChoice = (valA !== '' && valA !== null) ? 'A' : ((valB !== '' && valB !== null) ? 'B' : 'A');

        let displayA = escapeHTML(String(valA));
        let displayB = escapeHTML(String(valB));

        if (f.key === 'gelesen_am' || f.key === 'kaufdatum') {
            displayA = displayDate(valA) || '-';
            displayB = displayDate(valB) || '-';
        } else if (f.key === 'bewertung') {
            displayA = valA ? renderStars(valA) : '-';
            displayB = valB ? renderStars(valB) : '-';
        } else if (f.key === 'bild') {
            displayA = valA ? `<img src="${valA}" style="height: 35px; border-radius: 4px;">` : '-';
            displayB = valB ? `<img src="${valB}" style="height: 35px; border-radius: 4px;">` : '-';
        }

        const isDifferent = String(valA) !== String(valB);

        return `
            <tr style="${isDifferent ? 'background: rgba(245, 158, 11, 0.08);' : ''}">
                <td style="padding: 10px; font-weight: 600; font-size: 0.85rem; border-bottom: 1px solid var(--border-color); color: var(--text-main);">
                    ${f.label}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem;">
                        <input type="radio" name="merge_${f.key}" value="A" ${defaultChoice === 'A' ? 'checked' : ''} style="accent-color: var(--primary-color);">
                        <span>${displayA || '<em style="opacity: 0.5;">Leer</em>'}</span>
                    </label>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem;">
                        <input type="radio" name="merge_${f.key}" value="B" ${defaultChoice === 'B' ? 'checked' : ''} style="accent-color: var(--primary-color);">
                        <span>${displayB || '<em style="opacity: 0.5;">Leer</em>'}</span>
                    </label>
                </td>
            </tr>
        `;
    }).join('');

    modalBody.innerHTML = `
        <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 16px;">
            Wähle für jedes Feld, welcher Wert im finalen Comic gespeichert werden soll. Der nicht gewählte Comic wird anschließend gelöscht.
        </p>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; background: var(--bg-main); padding: 8px 14px; border-radius: 8px;">
            <div style="font-weight: 600; font-size: 0.85rem;">Schnellauswahl:</div>
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary" id="btn-select-all-merge-a" style="font-size: 0.78rem; padding: 4px 10px;">Alle von Eintrag A</button>
                <button class="btn btn-secondary" id="btn-select-all-merge-b" style="font-size: 0.78rem; padding: 4px 10px;">Alle von Eintrag B</button>
            </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="text-align: left; background: rgba(255, 255, 255, 0.05); font-size: 0.85rem;">
                    <th style="padding: 10px; border-bottom: 1px solid var(--border-color);">Feld</th>
                    <th style="padding: 10px; border-bottom: 1px solid var(--border-color);">Eintrag A</th>
                    <th style="padding: 10px; border-bottom: 1px solid var(--border-color);">Eintrag B</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <button class="btn btn-secondary" id="btn-cancel-merge">Abbrechen</button>
            <button class="btn btn-primary" id="btn-confirm-merge" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                <i class="fa-solid fa-check"></i> Zusammenführung speichern & Duplikat löschen
            </button>
        </div>
    `;

    const modal = document.getElementById('duplicate-merge-modal');
    if (modal) modal.style.display = 'flex';
}

export function attachDuplicatesEvents(container) {
    if (!container) return;

    // Tabs
    const tabCandidates = container.querySelector('#tab-duplicates-candidates');
    const tabIgnored = container.querySelector('#tab-duplicates-ignored');

    if (tabCandidates) {
        tabCandidates.onclick = () => {
            activeTab = 'candidates';
            renderDuplicates(container);
        };
    }
    if (tabIgnored) {
        tabIgnored.onclick = () => {
            activeTab = 'ignored';
            renderDuplicates(container);
        };
    }

    // Match Type Filter Buttons
    container.querySelectorAll('.btn-filter-match').forEach(btn => {
        btn.onclick = () => {
            activeMatchTypeFilter = btn.dataset.match;
            renderDuplicates(container);
        };
    });

    // Refresh Scan Button
    const btnRefresh = container.querySelector('#btn-refresh-duplicates');
    if (btnRefresh) {
        btnRefresh.onclick = () => renderDuplicates(container);
    }

    // Auto-clean exact duplicates
    const btnAutoClean = container.querySelector('#btn-auto-clean-exact');
    if (btnAutoClean) {
        btnAutoClean.onclick = async () => {
            const candidates = currentDuplicateGroups.filter(p => !p.isIgnored && p.matchType === 'exact');
            if (candidates.length === 0) return;

            if (confirm(`${candidates.length} exakte Duplikate automatisch bereinigen? Dabei wird jeweils ein Eintrag behalten und das Duplikat gelöscht.`)) {
                for (const pair of candidates) {
                    // Lösche comicB, behalte comicA
                    await db.deleteComic(pair.comicB.id);
                }
                alert(`${candidates.length} exakte Duplikate wurden erfolgreich bereinigt.`);
                renderDuplicates(container);
            }
        };
    }

    // Single item delete click
    container.querySelectorAll('.btn-delete-single-duplicate').forEach(btn => {
        btn.onclick = async (e) => {
            const deleteId = btn.dataset.deleteId;
            if (confirm('Diesen doppelten Comic-Eintrag wirklich löschen?')) {
                await db.deleteComic(deleteId);
                renderDuplicates(container);
            }
        };
    });

    // Edit comic click
    container.querySelectorAll('.btn-edit-duplicate').forEach(btn => {
        btn.onclick = async (e) => {
            const id = btn.dataset.id;
            const comics = await db.getAllComics();
            const comic = comics.find(c => c.id === id);
            if (comic) openModal(comic);
        };
    });

    // Mark as "Kein Duplikat" (Ignore Pair)
    container.querySelectorAll('.btn-ignore-pair').forEach(btn => {
        btn.onclick = async (e) => {
            const key = btn.dataset.key;
            const ignoredList = getIgnoredDuplicatesList();
            if (!ignoredList.includes(key)) {
                ignoredList.push(key);
                await saveIgnoredDuplicatesList(ignoredList);
            }
            renderDuplicates(container);
        };
    });

    // Un-ignore pair ("Wieder als Duplikat aktivieren")
    container.querySelectorAll('.btn-unignore-pair').forEach(btn => {
        btn.onclick = async (e) => {
            const key = btn.dataset.key;
            let ignoredList = getIgnoredDuplicatesList();
            ignoredList = ignoredList.filter(k => k !== key);
            await saveIgnoredDuplicatesList(ignoredList);
            renderDuplicates(container);
        };
    });

    // Open Merge Modal
    container.querySelectorAll('.btn-open-merge-pair').forEach(btn => {
        btn.onclick = (e) => {
            const key = btn.dataset.key;
            const pair = currentDuplicateGroups.find(p => p.key === key);
            if (pair) openMergeModal(pair);
        };
    });

    // Modal Events
    const mergeModal = document.getElementById('duplicate-merge-modal');
    if (mergeModal && !eventsAttached) {
        eventsAttached = true;

        document.addEventListener('click', async (e) => {
            if (e.target.closest('#btn-close-merge-modal') || e.target.closest('#btn-cancel-merge')) {
                mergeModal.style.display = 'none';
                return;
            }

            if (e.target.closest('#btn-select-all-merge-a')) {
                mergeModal.querySelectorAll('input[type="radio"][value="A"]').forEach(r => r.checked = true);
                return;
            }

            if (e.target.closest('#btn-select-all-merge-b')) {
                mergeModal.querySelectorAll('input[type="radio"][value="B"]').forEach(r => r.checked = true);
                return;
            }

            if (e.target.closest('#btn-confirm-merge')) {
                if (!activeMergePair) return;
                const { comicA, comicB } = activeMergePair;

                const fields = [
                    'titel', 'serie', 'nummer', 'verlag', 'jahr', 'format', 'typ',
                    'bestand', 'kaufdatum', 'gelesen_am', 'preis', 'bewertung',
                    'bezugsquelle', 'sprache', 'zustand', 'bemerkung', 'bild'
                ];

                const mergedData = { ...comicA }; // Behalte ID von Comic A

                fields.forEach(f => {
                    const selected = mergeModal.querySelector(`input[name="merge_${f}"]:checked`);
                    if (selected && selected.value === 'B') {
                        mergedData[f] = comicB[f];
                    }
                });

                // Speichere zusammengeführten Comic A und lösche Comic B
                await db.saveComic(mergedData);
                await db.deleteComic(comicB.id);

                mergeModal.style.display = 'none';
                activeMergePair = null;

                const viewContainer = document.getElementById('view-container');
                if (viewContainer) renderDuplicates(viewContainer);
            }
        });
    }
}

export function cleanupDuplicates() {
    activeTab = 'candidates';
    activeMatchTypeFilter = 'exact';
    activeMergePair = null;
    const mergeModal = document.getElementById('duplicate-merge-modal');
    if (mergeModal) mergeModal.style.display = 'none';
}
