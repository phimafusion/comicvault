import { db } from '../db.js';
import { parseToDate } from '../services/statsService.js';
import { parseCurrency } from '../utils.js';

// Hilfsfunktion zum Formatieren von Währungen im deutschen Format
function formatCurrency(amount, currencySymbol) {
    return amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currencySymbol;
}

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
            delta: 0
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
    
    // Kumulierte Deltas über das Jahr hinweg berechnen
    let cumulativeDelta = 0;
    for (let i = 0; i < 12; i++) {
        const m = months[i];
        const monthlyDelta = m.budget - m.totalExpenses;
        cumulativeDelta += monthlyDelta;
        m.delta = cumulativeDelta;
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

// Haupt-Renderfunktion der View
export async function renderBudget(container) {
    const comics = await db.getAllComics();
    const settings = db.getSettings();
    const currency = settings.currency || '€';
    const types = settings.customSuggestions?.typ || ['Comic', 'Manga', 'Graphic Novel', 'Artbook'];
    
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
        
        const html = `
            <div class="view-controls" style="padding-top: 32px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
                <h2 class="view-title" style="margin: 0;">Budgets & Kostenanalyse</h2>
                
                <!-- Tab-Steuerung oben rechts am Tabellenkopf -->
                <div class="view-toggles" id="budget-years-tabs" style="display: inline-flex;">
                    ${sortedYears.map(y => `
                        <button class="view-toggle-btn ${y === selectedYear ? 'active' : ''}" data-year="${y}">
                            ${y}
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <div id="budget-success-message" style="display: none; background-color: var(--success); color: white; padding: 12px 20px; border-radius: var(--radius-md); margin-bottom: 20px; font-weight: 600; align-items: center; gap: 8px; animation: fadeIn 0.3s ease;">
                <i class="fa-solid fa-circle-check"></i> Budgets erfolgreich gespeichert!
            </div>
            
            <!-- 1. Card: Monats-Planung des ausgewählten Jahres -->
            <div class="details-card" style="flex-direction: column; padding: 24px; background-color: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); margin-bottom: 32px;">
                <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 0.95rem; line-height: 1.5;">
                    Hier kannst du deine monatlichen Budgets für das ausgewählte Jahr <strong style="color: var(--text-primary);">${selectedYear}</strong> anpassen. Die Deltas werden innerhalb des Jahres fortlaufend kumuliert.
                </p>
                
                <div style="margin-bottom: 24px; display: flex; gap: 16px; align-items: center; background: rgba(var(--primary-rgb), 0.05); padding: 16px 20px; border-radius: var(--radius-md); border: 1px solid var(--border-color); flex-wrap: wrap;">
                    <span style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">Standard-Budget für alle Monate in ${selectedYear} festlegen:</span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="number" id="global-budget-input" class="form-control" value="200" min="0" style="width: 100px; text-align: right; padding: 6px 12px; font-weight: 500;">
                        <span style="font-weight: 600; color: var(--text-secondary);">${currency}</span>
                    </div>
                    <button id="btn-apply-global-budget" class="btn btn-secondary" style="padding: 8px 16px; font-size: 0.9rem; font-weight: 600;">Anwenden</button>
                </div>
                
                <div style="overflow-x: auto; width: 100%; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 20px;">
                    <table class="budget-table" style="width: 100%; border-collapse: collapse; text-align: left; min-width: 800px;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--border-color); background-color: var(--bg-main);">
                                <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">Monat</th>
                                ${types.map(t => `<th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">${t}</th>`).join('')}
                                <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">Sonstige</th>
                                <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">Gesamt</th>
                                <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem; width: 150px;">Budget</th>
                                <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">Delta Jahr</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${monthsData.map(m => `
                                <tr style="border-bottom: 1px solid var(--border-color); transition: var(--transition);" class="budget-row">
                                    <td style="padding: 14px 16px; font-weight: 600; color: var(--text-primary);">${m.monthLabel}</td>
                                    ${types.map(t => `<td style="padding: 14px 16px; text-align: right; color: var(--text-secondary);">${formatCurrency(m.expensesByType[t], currency)}</td>`).join('')}
                                    <td style="padding: 14px 16px; text-align: right; color: var(--text-secondary);">${formatCurrency(m.expensesByType["Sonstige"], currency)}</td>
                                    <td style="padding: 14px 16px; text-align: right; font-weight: 600; color: var(--text-primary);">${formatCurrency(m.totalExpenses, currency)}</td>
                                    <td style="padding: 8px 16px; text-align: right;">
                                        <div style="display: inline-flex; align-items: center; gap: 4px; justify-content: flex-end; width: 100%;">
                                            <input type="number" step="any" min="0" class="form-control budget-input" data-month-key="${m.monthKey}" value="${m.budget.toFixed(2)}" style="width: 90px; text-align: right; padding: 6px 12px; font-family: var(--font-primary); font-weight: 500;">
                                            <span style="font-size: 0.9rem; color: var(--text-secondary); font-weight: 500;">${currency}</span>
                                        </div>
                                    </td>
                                    <td class="delta-jahr-cell" data-month-key="${m.monthKey}" style="padding: 14px 16px; text-align: right; font-weight: 700; transition: var(--transition);"></td>
                                </tr>
                            `).join('')}
                            
                            <tr style="background-color: var(--bg-main); border-top: 2px solid var(--border-color); font-weight: 700;" id="sum-row">
                                <td style="padding: 14px 16px; color: var(--text-primary);">Gesamt ${selectedYear}</td>
                                ${types.map(t => `<td style="padding: 14px 16px; text-align: right; color: var(--text-primary);">${formatCurrency(totalByType[t], currency)}</td>`).join('')}
                                <td style="padding: 14px 16px; text-align: right; color: var(--text-primary);">${formatCurrency(totalByType["Sonstige"], currency)}</td>
                                <td style="padding: 14px 16px; text-align: right; color: var(--text-primary);">${formatCurrency(overallExpenses, currency)}</td>
                                <td id="total-budget-cell" style="padding: 14px 16px; text-align: right; color: var(--text-primary); font-family: var(--font-primary);"></td>
                                <td id="total-delta-cell" style="padding: 14px 16px; text-align: right; font-weight: 700; transition: var(--transition);"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 12px; align-items: center;">
                    <button id="btn-save-budgets" class="btn btn-primary" style="font-weight: 600;"><i class="fa-solid fa-floppy-disk"></i> Änderungen speichern</button>
                </div>
            </div>
            
            <!-- 2. Card: Historische Jahres-Zusammenfassung (Jahresaggregation für alle Jahre auf einmal) -->
            <div class="view-controls" style="margin-bottom: 16px;">
                <h3 class="view-subtitle" style="font-family: var(--font-display); font-size: 1.8rem; color: var(--text-primary); margin: 0;">Historische Jahresübersicht</h3>
            </div>
            
            <div class="details-card" style="flex-direction: column; padding: 24px; background-color: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
                <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 0.95rem; line-height: 1.5;">
                    Vergleichende Übersicht über deine jährlichen Budgets und Ausgaben. Das Jahresdelta zeigt den Endwert zum 31. Dezember des jeweiligen Jahres.
                </p>
                
                <div style="overflow-x: auto; width: 100%; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                    <table class="budget-table" style="width: 100%; border-collapse: collapse; text-align: left; min-width: 800px;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--border-color); background-color: var(--bg-main);">
                                <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">Jahr</th>
                                ${types.map(t => `<th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">${t}</th>`).join('')}
                                <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">Sonstige</th>
                                <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">Gesamtausgaben</th>
                                <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">Gesamtbudget</th>
                                <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">Delta Jahr</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${yearsSummaryData.map(y => `
                                <tr style="border-bottom: 1px solid var(--border-color); transition: var(--transition);" class="budget-row">
                                    <td style="padding: 14px 16px; font-weight: 600; color: var(--text-primary);">${y.year}</td>
                                    ${types.map(t => `<td style="padding: 14px 16px; text-align: right; color: var(--text-secondary);">${formatCurrency(y.expensesByType[t], currency)}</td>`).join('')}
                                    <td style="padding: 14px 16px; text-align: right; color: var(--text-secondary);">${formatCurrency(y.expensesByType["Sonstige"], currency)}</td>
                                    <td style="padding: 14px 16px; text-align: right; font-weight: 600; color: var(--text-primary);">${formatCurrency(y.totalExpenses, currency)}</td>
                                    <td style="padding: 14px 16px; text-align: right; font-weight: 600; color: var(--text-primary);">${formatCurrency(y.totalBudget, currency)}</td>
                                    <td style="padding: 14px 16px; text-align: right; font-weight: 700; color: ${y.delta < 0 ? 'var(--danger)' : 'var(--success)'}; background-color: ${y.delta < 0 ? 'rgba(239, 68, 68, 0.15)' : 'transparent'};">${formatCurrency(y.delta, currency)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Live-Berechnung initialisieren
        updateLiveCalculations();
        
        // Event-Listener registrieren
        bindUIEvents();
    }
    
    // Live-Update der Deltas und Gesamtsummen bei Änderungen
    function updateLiveCalculations() {
        let cumulativeDelta = 0;
        let totalBudget = 0;
        
        for (let i = 0; i < 12; i++) {
            const monthKey = String(i + 1).padStart(2, '0');
            const input = container.querySelector(`.budget-input[data-month-key="${monthKey}"]`);
            const budgetValue = parseFloat(input.value) || 0;
            totalBudget += budgetValue;
            
            const totalExpenses = monthlyExpensesData[i];
            const deltaCell = container.querySelector(`.delta-jahr-cell[data-month-key="${monthKey}"]`);
            
            const monthlyDelta = budgetValue - totalExpenses;
            cumulativeDelta += monthlyDelta;
            
            // Delta-Jahr aktualisieren
            deltaCell.textContent = formatCurrency(cumulativeDelta, currency);
            
            // Farbcodierung anwenden (hellrot bei negativem Delta)
            if (cumulativeDelta < 0) {
                deltaCell.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                deltaCell.style.color = 'var(--danger)';
            } else {
                deltaCell.style.backgroundColor = 'transparent';
                deltaCell.style.color = 'var(--success)';
            }
        }
        
        // Summenzeile aktualisieren
        const totalBudgetCell = container.querySelector('#total-budget-cell');
        totalBudgetCell.textContent = formatCurrency(totalBudget, currency);
        
        const totalDeltaCell = container.querySelector('#total-delta-cell');
        totalDeltaCell.textContent = formatCurrency(cumulativeDelta, currency);
        if (cumulativeDelta < 0) {
            totalDeltaCell.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            totalDeltaCell.style.color = 'var(--danger)';
        } else {
            totalDeltaCell.style.backgroundColor = 'transparent';
            totalDeltaCell.style.color = 'var(--success)';
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
        
        // Live-Berechnung bei Tastendruck/Eingabe
        const inputs = container.querySelectorAll('.budget-input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                updateLiveCalculations();
            });
        });
        
        // Standard-Budget anwenden
        const btnApplyGlobal = container.querySelector('#btn-apply-global-budget');
        btnApplyGlobal.addEventListener('click', () => {
            const globalValue = parseFloat(container.querySelector('#global-budget-input').value);
            if (!isNaN(globalValue) && globalValue >= 0) {
                inputs.forEach(input => {
                    input.value = globalValue.toFixed(2);
                });
                updateLiveCalculations();
            }
        });
        
        // Budgets speichern
        const btnSave = container.querySelector('#btn-save-budgets');
        btnSave.addEventListener('click', async () => {
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
            
            // Ansicht komplett neu zeichnen, damit sich auch die historische Jahrestabelle unten aktualisiert!
            drawView();
            
            // Feedback anzeigen
            const msg = container.querySelector('#budget-success-message');
            msg.style.display = 'flex';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            setTimeout(() => {
                if (msg) msg.style.display = 'none';
            }, 3000);
        });
    }
    
    // Initiales Zeichnen
    drawView();
}
