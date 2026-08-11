import { db } from '../db.js';
import { parseToDate } from '../services/stats/statsUtils.js';
import { parseCurrency } from '../utils.js';
import { formatCurrency, renderHistoricalRow, getBudgetViewHtml } from './budgetTemplates.js';

// Reine Berechnungsfunktion für Budgetstatistiken (isoliert testbar)
export function calculateBudgetStats(comics, budgets, types, selectedYear) {
    const targetYear = parseInt(selectedYear, 10);
    const months = [];
    
    // 12 Monate initialisieren
    for (let i = 0; i < 12; i++) {
        const monthKey = String(i + 1).padStart(2, '0');
        const monthLabel = `${targetYear}.${monthKey}`;
        const expensesByType = {};
        
        types.forEach(t => {
            expensesByType[t] = 0;
        });
        expensesByType["Sonstige"] = 0;
        
        let monthBudget = 200.00; // Standardbudget
        if (budgets && budgets[targetYear] && budgets[targetYear][monthKey] !== undefined) {
            monthBudget = Number(budgets[targetYear][monthKey]);
        }
        
        months.push({
            monthIndex: i,
            monthKey,
            monthLabel,
            expensesByType,
            totalExpenses: 0,
            budget: monthBudget,
            delta: 0,
            monthlyDelta: 0,
            cumulativeBudget: 0
        });
    }
    
    // Ausgaben der Comics auf Monate und Typen verteilen
    // WICHTIG: Nur kaufdatum verwenden, KEIN created_at als Fallback!
    // created_at ist der Zeitstempel des Datenbankeintrags und hat nichts
    // mit dem Kaufdatum zu tun – würde sonst alle Comics ohne Kaufdatum
    // im Monat des Eintrags zählen und die Summe aufblähen.
    comics.forEach(c => {
        const buyDate = c.kaufdatum ? parseToDate(c.kaufdatum) : null;
        if (buyDate && buyDate.getFullYear() === targetYear) {
            const m = buyDate.getMonth(); // 0 bis 11
            const price = parseCurrency(c.preis) || 0;
            const typ = c.typ || 'Sonstige';
            
            if (months[m]) {
                if (months[m].expensesByType.hasOwnProperty(typ)) {
                    months[m].expensesByType[typ] += price;
                } else {
                    months[m].expensesByType["Sonstige"] += price;
                }
                months[m].totalExpenses += price;
            }
        }
    });
    
    // Kumulierte Deltas und Budgets über das Jahr hinweg berechnen
    let cumulativeDelta = 0;
    let cumulativeBudget = 0;
    for (let i = 0; i < 12; i++) {
        const m = months[i];
        const monthlyDelta = m.budget - m.totalExpenses;
        m.monthlyDelta = monthlyDelta;
        cumulativeDelta += monthlyDelta;
        m.delta = cumulativeDelta;
        cumulativeBudget += m.budget;
        m.cumulativeBudget = cumulativeBudget;
    }
    
    return months;
}

// Reine Berechnungsfunktion für die historische Jahresübersicht (isoliert testbar)
export function calculateMultiYearStats(comics, budgets, types, sortedYears) {
    return sortedYears.map(year => {
        const monthsData = calculateBudgetStats(comics, budgets, types, year);
        
        const expensesByType = {};
        types.forEach(t => { expensesByType[t] = 0; });
        expensesByType["Sonstige"] = 0;
        
        let totalExpenses = 0;
        let totalBudget = 0;
        
        monthsData.forEach(m => {
            types.forEach(t => {
                expensesByType[t] += m.expensesByType[t];
            });
            expensesByType["Sonstige"] += m.expensesByType["Sonstige"];
            totalExpenses += m.totalExpenses;
            totalBudget += m.budget;
        });
        
        // Das Delta am Jahresende entspricht dem Delta des Monats Dezember (Index 11)
        const delta = monthsData[11].delta;
        
        return {
            year,
            expensesByType,
            totalExpenses,
            totalBudget,
            delta
        };
    });
}

// Reine Berechnungsfunktion für Budget-Prognosen & Trends (isoliert testbar)
export function calculatePrognosisStats(comics, budgets, types, selectedYear, referenceDate = new Date()) {
    const targetYear = parseInt(selectedYear, 10);
    const monthsData = calculateBudgetStats(comics, budgets, types, targetYear);
    const prevYearMonthsData = calculateBudgetStats(comics, budgets, types, targetYear - 1);

    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth(); // 0-11
    const currentDay = referenceDate.getDate();
    const daysInMonth = new Date(refYear, refMonth + 1, 0).getDate();
    const remainingDays = Math.max(0, daysInMonth - currentDay);
    const remainingRatio = remainingDays / daysInMonth;

    let elapsedMonthsCount = 12;
    if (targetYear === refYear) {
        elapsedMonthsCount = refMonth; // Vollendete Vormonate
    } else if (targetYear > refYear) {
        elapsedMonthsCount = 0;
    }

    let spentYTD = 0;
    let budgetYTD = 0;
    const pastMonthsCount = targetYear === refYear ? refMonth + 1 : elapsedMonthsCount;
    for (let i = 0; i < pastMonthsCount; i++) {
        spentYTD += monthsData[i].totalExpenses;
        budgetYTD += monthsData[i].budget;
    }

    // Effektive Anzahl abgelaufener Monate inkl. bisher abgelaufener Tage im aktuellen Monat
    const effectiveElapsedMonths = targetYear === refYear 
        ? (refMonth + (currentDay / daysInMonth))
        : (targetYear < refYear ? 12 : 0);

    const avgMonthlySpend = effectiveElapsedMonths > 0 ? (spentYTD / effectiveElapsedMonths) : 0;

    // Gewichteter aktueller Monatstrend
    let recentTrendAvg = avgMonthlySpend;
    if (targetYear === refYear && refMonth >= 2) {
        const currentMonthExtrapolated = monthsData[refMonth].totalExpenses * (daysInMonth / Math.max(1, currentDay));
        const last3Expenses = [
            currentMonthExtrapolated,
            monthsData[refMonth - 1].totalExpenses,
            monthsData[refMonth - 2].totalExpenses
        ];
        const avg3 = (last3Expenses[0] + last3Expenses[1] + last3Expenses[2]) / 3;
        recentTrendAvg = (avg3 * 0.5) + (avgMonthlySpend * 0.5);
    }

    // Vorjahres-Saison-Faktoren für einzelne Monate ermitteln
    const prevYearTotalExpenses = prevYearMonthsData.reduce((acc, m) => acc + m.totalExpenses, 0);
    const prevYearMonthlyAvg = prevYearTotalExpenses > 0 ? (prevYearTotalExpenses / 12) : 0;

    let prevSpentYTD = 0;
    for (let i = 0; i < pastMonthsCount; i++) {
        prevSpentYTD += prevYearMonthsData[i].totalExpenses;
    }

    const yoyDiff = spentYTD - prevSpentYTD;
    const yoyPercent = prevSpentYTD > 0 ? ((yoyDiff / prevSpentYTD) * 100) : 0;

    const totalYearBudget = monthsData.reduce((acc, m) => acc + m.budget, 0);

    // Monatlicher Trend & dynamische Kaufverhaltens-Prognose
    let projectedRemainingExpenses = 0;
    const monthlyTrend = monthsData.map((m, i) => {
        const isElapsed = targetYear < refYear || (targetYear === refYear && i < refMonth);
        const isCurrent = targetYear === refYear && i === refMonth;
        const isProjected = targetYear > refYear || (targetYear === refYear && i > refMonth);

        let projectedExpense = m.totalExpenses;

        if (isCurrent) {
            let seasonalFactor = 1.0;
            if (prevYearMonthlyAvg > 0 && prevYearMonthsData[i]) {
                seasonalFactor = prevYearMonthsData[i].totalExpenses / prevYearMonthlyAvg;
                seasonalFactor = Math.max(0.3, Math.min(2.5, seasonalFactor));
            }
            const projectedRemainingForCurrent = Math.round((recentTrendAvg * seasonalFactor * remainingRatio) * 100) / 100;
            projectedExpense = Math.round((m.totalExpenses + projectedRemainingForCurrent) * 100) / 100;
            projectedRemainingExpenses += projectedRemainingForCurrent;
        } else if (isProjected) {
            let seasonalFactor = 1.0;
            if (prevYearMonthlyAvg > 0 && prevYearMonthsData[i]) {
                seasonalFactor = prevYearMonthsData[i].totalExpenses / prevYearMonthlyAvg;
                seasonalFactor = Math.max(0.3, Math.min(2.5, seasonalFactor));
            }
            projectedExpense = Math.round((recentTrendAvg * seasonalFactor) * 100) / 100;
            projectedRemainingExpenses += projectedExpense;
        }

        return {
            monthKey: m.monthKey,
            monthLabel: m.monthLabel,
            actualExpenses: m.totalExpenses,
            projectedExpense,
            budget: m.budget,
            isElapsed,
            isCurrent,
            isProjected,
            currentDay,
            daysInMonth
        };
    });

    let projectedTotalExpenses = 0;
    if (targetYear < refYear) {
        projectedTotalExpenses = monthsData.reduce((acc, m) => acc + m.totalExpenses, 0);
    } else if (targetYear === refYear) {
        projectedTotalExpenses = Math.round((spentYTD + projectedRemainingExpenses) * 100) / 100;
    } else {
        projectedTotalExpenses = totalYearBudget;
    }

    const projectedDelta = totalYearBudget - projectedTotalExpenses;

    return {
        targetYear,
        elapsedMonthsCount: targetYear === refYear ? refMonth + 1 : 12,
        spentYTD,
        budgetYTD,
        avgMonthlySpend,
        prevSpentYTD,
        yoyDiff,
        yoyPercent,
        totalYearBudget,
        projectedTotalExpenses,
        projectedDelta,
        monthlyTrend
    };
}

// Haupt-Renderfunktion der View
export async function renderBudget(container) {
    try {
        const comics = (await db.getAllComics()) || [];
        const settings = db.getSettings() || {};
        const currency = settings.currency || '€';
        const dbTypes = Array.from(new Set(
            comics
                .map(c => c.typ)
                .filter(typ => typ && typeof typ === 'string' && typ.trim() !== '')
        )).sort();
        const types = dbTypes.length > 0 ? dbTypes : ['Comic', 'Manga', 'Graphic Novel', 'Artbook'];
        
        // Ermitteln aller verfügbaren Jahre
        const yearsSet = new Set();
        const currentYear = new Date().getFullYear();
        yearsSet.add(currentYear);
        yearsSet.add(currentYear - 1);
        
        comics.forEach(c => {
            // Nur echte Kaufdaten für die Jahres-Tabs verwenden
            if (c.kaufdatum) {
                const buyDate = parseToDate(c.kaufdatum);
                if (buyDate) {
                    yearsSet.add(buyDate.getFullYear());
                }
            }
        });
        
        const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
        
        // Neue Jahre initialisieren (falls noch keine Budgets in den Einstellungen existieren)
        if (!settings.budgets) {
            settings.budgets = {};
        }
        let budgetsChanged = false;
        sortedYears.forEach(year => {
            if (!settings.budgets[year]) {
                settings.budgets[year] = {};
                for (let i = 1; i <= 12; i++) {
                    const monthKey = String(i).padStart(2, '0');
                    settings.budgets[year][monthKey] = 200.00;
                }
                budgetsChanged = true;
            }
        });
        if (budgetsChanged) {
            db.saveSettings(settings);
        }
        let selectedYear = currentYear;
        let monthlyExpensesData = []; // Cache für Live-Kalkulationen
        
        // Struktur rendern
        function drawView() {
            const monthsData = calculateBudgetStats(comics, settings.budgets, types, selectedYear);
            monthlyExpensesData = monthsData.map(m => m.totalExpenses);
            
            // Jahressummen für das ausgewählte Jahr berechnen
            const totalByType = {};
            types.forEach(t => { totalByType[t] = 0; });
            totalByType["Sonstige"] = 0;
            
            let overallExpenses = 0;
            let overallBudget = 0;
            
            monthsData.forEach(m => {
                types.forEach(t => {
                    totalByType[t] += m.expensesByType[t];
                });
                totalByType["Sonstige"] += m.expensesByType["Sonstige"];
                overallExpenses += m.totalExpenses;
                overallBudget += m.budget;
            });
            
            // Daten für die historische Jahresübersicht berechnen
            const yearsSummaryData = calculateMultiYearStats(comics, settings.budgets, types, sortedYears);
            
            // Prognose-Daten berechnen
            const prognosisData = calculatePrognosisStats(comics, settings.budgets, types, selectedYear);

            container.innerHTML = getBudgetViewHtml({
                sortedYears,
                selectedYear,
                types,
                currency,
                monthsData,
                yearsSummaryData,
                prognosisData,
                totalByType,
                overallExpenses,
                overallBudget
            });
            
            // Live-Berechnung initialisieren
            updateLiveCalculations();
            
            // Event-Listener registrieren
            bindUIEvents();
        }
        
        // Live-Update der Deltas und Gesamtsummen bei Änderungen
        function updateLiveCalculations() {
            let cumulativeDelta = 0;
            let cumulativeBudget = 0;
            let totalBudget = 0;
            
            for (let i = 0; i < 12; i++) {
                const monthKey = String(i + 1).padStart(2, '0');
                const input = container.querySelector(`.budget-input[data-month-key="${monthKey}"]`);
                if (!input) continue;

                const budgetValue = parseFloat(input.value) || 0;
                totalBudget += budgetValue;
                
                const totalExpenses = (monthlyExpensesData && monthlyExpensesData[i]) ? monthlyExpensesData[i] : 0;
                const cumulativeBudgetCell = container.querySelector(`.cumulative-budget-cell[data-month-key="${monthKey}"]`);
                const deltaMonatCell = container.querySelector(`.delta-monat-cell[data-month-key="${monthKey}"]`);
                const deltaCell = container.querySelector(`.delta-jahr-cell[data-month-key="${monthKey}"]`);
                
                const monthlyDelta = budgetValue - totalExpenses;
                cumulativeDelta += monthlyDelta;
                cumulativeBudget += budgetValue;
                
                if (cumulativeBudgetCell) {
                    cumulativeBudgetCell.textContent = formatCurrency(cumulativeBudget, currency);
                }

                if (deltaMonatCell) {
                    deltaMonatCell.textContent = formatCurrency(monthlyDelta, currency);
                    deltaMonatCell.style.backgroundColor = 'transparent';
                    if (monthlyDelta < 0) {
                        deltaMonatCell.style.color = 'var(--danger)';
                    } else {
                        deltaMonatCell.style.color = 'var(--success)';
                    }
                }

                if (deltaCell) {
                    deltaCell.textContent = formatCurrency(cumulativeDelta, currency);
                    deltaCell.style.backgroundColor = 'transparent';
                    if (cumulativeDelta < 0) {
                        deltaCell.style.color = 'var(--danger)';
                    } else {
                        deltaCell.style.color = 'var(--success)';
                    }
                }
            }
            
            const totalBudgetCell = container.querySelector('#total-budget-cell');
            if (totalBudgetCell) {
                totalBudgetCell.textContent = formatCurrency(totalBudget, currency);
            }
            
            const totalCumulativeBudgetCell = container.querySelector('#total-cumulative-budget-cell');
            if (totalCumulativeBudgetCell) {
                totalCumulativeBudgetCell.textContent = formatCurrency(totalBudget, currency);
            }
            
            const totalExpensesSum = (monthlyExpensesData || []).reduce((a, b) => a + b, 0);
            const totalDeltaMonat = totalBudget - totalExpensesSum;
            const totalDeltaMonatCell = container.querySelector('#total-delta-monat-cell');
            if (totalDeltaMonatCell) {
                totalDeltaMonatCell.textContent = formatCurrency(totalDeltaMonat, currency);
                totalDeltaMonatCell.style.backgroundColor = 'transparent';
                if (totalDeltaMonat < 0) {
                    totalDeltaMonatCell.style.color = 'var(--danger)';
                } else {
                    totalDeltaMonatCell.style.color = 'var(--success)';
                }
            }

            const totalDeltaCell = container.querySelector('#total-delta-cell');
            if (totalDeltaCell) {
                totalDeltaCell.textContent = formatCurrency(cumulativeDelta, currency);
                totalDeltaCell.style.backgroundColor = 'transparent';
                if (cumulativeDelta < 0) {
                    totalDeltaCell.style.color = 'var(--danger)';
                } else {
                    totalDeltaCell.style.color = 'var(--success)';
                }
            }
        }
        
        // Bindet Events an UI-Elemente
        function bindUIEvents() {
            // Jahr wechseln über Reiter (Tabs)
            const tabsContainer = container.querySelector('#budget-years-tabs');
            if (tabsContainer) {
                tabsContainer.addEventListener('click', (e) => {
                    const btn = e.target.closest('.view-toggle-btn');
                    if (btn) {
                        selectedYear = parseInt(btn.dataset.year, 10);
                        drawView();
                    }
                });
            }
            
            // Budgets speichern
            async function saveAllBudgets() {
                const currentSettings = db.getSettings();
                if (!currentSettings.budgets) {
                    currentSettings.budgets = {};
                }
                if (!currentSettings.budgets[selectedYear]) {
                    currentSettings.budgets[selectedYear] = {};
                }
                
                inputs.forEach(input => {
                    const monthKey = input.dataset.monthKey;
                    const val = parseFloat(input.value) || 0;
                    currentSettings.budgets[selectedYear][monthKey] = val;
                });
                
                db.saveSettings(currentSettings);
                
                // Historische Tabelle aktualisieren, ohne das Haupt-DOM neu aufzubauen (um Focus-Verlust zu vermeiden)
                const updatedSettings = db.getSettings();
                const yearsSummaryData = calculateMultiYearStats(comics, updatedSettings.budgets, types, sortedYears);
                
                const tbody = container.querySelector('#historical-budget-tbody');
                if (tbody) {
                    tbody.innerHTML = yearsSummaryData.map(y => renderHistoricalRow(y, types, currency)).join('');
                }
                
                // Feedback anzeigen
                const statusEl = container.querySelector('#budget-save-status');
                if (statusEl) {
                    statusEl.style.opacity = '1';
                    if (statusEl.timeoutId) {
                        clearTimeout(statusEl.timeoutId);
                    }
                    statusEl.timeoutId = setTimeout(() => {
                        statusEl.style.opacity = '0';
                    }, 2000);
                }
            }

            // Live-Berechnung bei Tastendruck/Eingabe und Auto-Save bei Fokus-Verlust/Änderung
            const inputs = container.querySelectorAll('.budget-input');
            inputs.forEach(input => {
                input.addEventListener('input', () => {
                    updateLiveCalculations();
                });
                input.addEventListener('change', () => {
                    saveAllBudgets();
                });
            });
        }
        
        // Initiales Zeichnen
        drawView();
    } catch (err) {
        console.error('Fehler beim Laden des Budgets:', err);
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--danger);">
                <i class="fa-solid fa-triangle-exclamation fa-2x"></i>
                <h3 style="margin-top: 12px; font-family: var(--font-display);">Fehler beim Laden der Budget-Ansicht</h3>
                <p style="color: var(--text-secondary); margin-top: 8px;">${err.message || err}</p>
            </div>
        `;
    }
}
