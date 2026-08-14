import { db } from '../db.js';
import { filterComicsForPick, pickRandomComic, calculatePickSmartInsight } from '../services/randomPickService.js';
import { renderRandomPickLayout, renderWinnerCard, renderInitialSlotState } from './randomPick/randomPickTemplates.js';
import { showToast } from '../utils.js';

let currentStack = 'unread';
let currentVerlag = 'all';
let currentTyp = 'all';
let lastPickedComic = null;

/**
 * Initialisiert und rendert die Random-Picker-View.
 */
export async function renderRandomPick(container, appInstance) {
    if (!container) return;

    const allComics = await db.getAllComics() || [];

    // Verlage & Formate für Filter extrahieren
    const publishers = [...new Set(allComics.map(c => c.verlag).filter(Boolean))].sort();
    const types = [...new Set(allComics.map(c => c.typ || c.format).filter(Boolean))].sort();
    const currencySymbol = db.getSettings()?.currency || '€';

    // Initiale Filterung & Smart Insight
    let eligibleComics = filterComicsForPick(allComics, {
        stack: currentStack,
        verlag: currentVerlag,
        typ: currentTyp
    });
    let smartInsightHtml = calculatePickSmartInsight(eligibleComics, currentStack, currencySymbol);

    // Layout in Container injizieren
    container.innerHTML = renderRandomPickLayout({
        activeStack: currentStack,
        selectedVerlag: currentVerlag,
        selectedTyp: currentTyp
    }, publishers, types, eligibleComics.length, smartInsightHtml);

    // DOM-Elemente cachen
    const stackSelect = container.querySelector('#pick-stack-select');
    const verlagSelect = container.querySelector('#pick-verlag-select');
    const typSelect = container.querySelector('#pick-typ-select');
    const drawBtn = container.querySelector('#btn-draw-random-comic');
    const resultContainer = container.querySelector('#random-pick-result-container');
    const countBadge = container.querySelector('#eligible-count-badge');
    const insightBadge = container.querySelector('#pick-smart-insight-badge');

    // Filter-Update Funktion
    const updateEligible = async () => {
        currentStack = stackSelect ? stackSelect.value : 'unread';
        currentVerlag = verlagSelect ? verlagSelect.value : 'all';
        currentTyp = typSelect ? typSelect.value : 'all';

        const comics = await db.getAllComics() || [];
        eligibleComics = filterComicsForPick(comics, {
            stack: currentStack,
            verlag: currentVerlag,
            typ: currentTyp
        });

        smartInsightHtml = calculatePickSmartInsight(eligibleComics, currentStack, currencySymbol);

        if (insightBadge) {
            insightBadge.innerHTML = smartInsightHtml;
        }

        if (countBadge) {
            countBadge.textContent = `${eligibleComics.length} Comics im Topf`;
        }

        if (drawBtn) {
            drawBtn.disabled = eligibleComics.length === 0;
        }

        if (!lastPickedComic) {
            resultContainer.innerHTML = renderInitialSlotState(eligibleComics.length);
        }
    };

    stackSelect?.addEventListener('change', updateEligible);
    verlagSelect?.addEventListener('change', updateEligible);
    typSelect?.addEventListener('change', updateEligible);

    // Ziehungs-Funktion mit Slot-Machine Animation
    const executeDraw = () => {
        if (eligibleComics.length === 0) return;

        drawBtn.disabled = true;
        drawBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Mischen...</span>';

        let flashes = 0;
        const interval = setInterval(() => {
            const tempComic = eligibleComics[Math.floor(Math.random() * eligibleComics.length)];
            resultContainer.innerHTML = `
                <div style="padding: 48px 24px; text-align: center; border-radius: 24px; border: 2px solid rgba(99, 102, 241, 0.5); background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%); backdrop-filter: blur(12px); box-shadow: 0 10px 40px rgba(99, 102, 241, 0.2), inset 0 0 20px rgba(99, 102, 241, 0.1); transition: all 0.05s;">
                    <div style="font-size: 3.5rem; margin-bottom: 16px; filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.5)); animation: spin 0.2s linear infinite;">🎲</div>
                    <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
                    <h3 style="font-size: 1.8rem; font-weight: 900; color: #ffffff; font-family: var(--font-display); letter-spacing: -0.5px;">${tempComic.titel || 'Comic'}</h3>
                    <div style="color: var(--primary-color); font-weight: 700; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px;">${tempComic.serie || ''} ${tempComic.nummer ? '#' + tempComic.nummer : ''}</div>
                </div>
            `;
            flashes++;
            if (flashes >= 6) {
                clearInterval(interval);
                lastPickedComic = pickRandomComic(eligibleComics);
                resultContainer.innerHTML = renderWinnerCard(lastPickedComic, currencySymbol);

                drawBtn.disabled = false;
                drawBtn.innerHTML = '<i class="fa-solid fa-dice-five" style="font-size: 1.3rem;"></i> <span>NOCH EINEN ZIEHEN</span>';
            }
        }, 80);
    };

    drawBtn?.addEventListener('click', executeDraw);

    resultContainer?.addEventListener('click', async (e) => {
        if (e.target.closest('#btn-pick-again')) {
            executeDraw();
            return;
        }

        const markReadBtn = e.target.closest('#btn-pick-mark-read');
        if (markReadBtn) {
            const comicId = markReadBtn.dataset.id;
            if (!comicId) return;

            const todayISO = new Date().toISOString().split('T')[0];
            await db.updateComic(comicId, {
                gelesen: true,
                gelesen_am: todayISO
            });

            showToast('Comic als gelesen markiert!', 'success');

            if (lastPickedComic && lastPickedComic.id === comicId) {
                lastPickedComic.gelesen = true;
                lastPickedComic.gelesen_am = todayISO;
                resultContainer.innerHTML = renderWinnerCard(lastPickedComic, currencySymbol);
            }
            updateEligible();
            return;
        }

        const viewInCollectionBtn = e.target.closest('#btn-pick-view-in-collection');
        if (viewInCollectionBtn) {
            const query = viewInCollectionBtn.dataset.query;
            if (appInstance && typeof appInstance.navigateTo === 'function') {
                appInstance.navigateTo('collection');
                setTimeout(() => {
                    const searchInput = document.getElementById('search-input');
                    if (searchInput && query) {
                        searchInput.value = query;
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }, 150);
            }
            return;
        }
    });
}
