import { escapeHTML, formatNumber } from '../utils.js';

// Hilfsfunktion zum Formatieren von Währungen im deutschen Format
export function formatCurrency(amount, currencySymbol) {
    return amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currencySymbol;
}

// Hilfsfunktion zum Rendern einer einzelnen Zeile in der historischen Tabelle
export function renderHistoricalRow(y, types, currency) {
    return `
        <tr style="border-bottom: 1px solid var(--border-color); transition: var(--transition);" class="budget-row">
            <td style="padding: 14px 16px; font-weight: 600; color: var(--text-primary);">${y.year}</td>
            ${types.map(t => `<td style="padding: 14px 16px; text-align: right; color: var(--text-secondary);">${formatCurrency(y.expensesByType[t], currency)}</td>`).join('')}
            <td style="padding: 14px 16px; text-align: right; color: var(--text-secondary);">${formatCurrency(y.expensesByType["Sonstige"], currency)}</td>
            <td style="padding: 14px 16px; text-align: right; font-weight: 600; color: var(--text-primary);">${formatCurrency(y.totalExpenses, currency)}</td>
            <td style="padding: 14px 16px; text-align: right; font-weight: 600; color: var(--text-primary);">${formatCurrency(y.totalBudget, currency)}</td>
            <td style="padding: 14px 16px; text-align: right; font-weight: 700; color: ${y.delta < 0 ? 'var(--danger)' : 'var(--success)'};">${formatCurrency(y.delta, currency)}</td>
        </tr>
    `;
}

// Generiert das gesamte HTML-Grid für die Budget-Ansicht
export function getBudgetViewHtml({ sortedYears, selectedYear, types, currency, monthsData, yearsSummaryData, prognosisData, totalByType, overallExpenses }) {
    return `
        <div class="view-controls" style="padding-top: 32px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                <h2 class="view-title" style="margin: 0;">Budgets & Kostenanalyse</h2>
                <span id="budget-save-status" style="font-size: 0.85rem; color: var(--success); opacity: 0; transition: opacity 0.3s ease; display: inline-flex; align-items: center; gap: 6px; font-weight: 500;">
                    <i class="fa-solid fa-circle-check"></i> Automatisch gespeichert
                </span>
            </div>
            
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
        <div class="details-card table-card" style="flex-direction: column; padding: 24px; background-color: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); margin-bottom: 32px;">
            <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 0.95rem; line-height: 1.5;">
                Hier kannst du deine monatlichen Budgets für das ausgewählte Jahr <strong style="color: var(--text-primary);">${selectedYear}</strong> anpassen. Die Deltas werden innerhalb des Jahres fortlaufend kumuliert.
            </p>
            
            <div style="overflow-x: auto; width: 100%; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 20px;">
                <table class="budget-table" style="width: 100%; border-collapse: collapse; text-align: left; min-width: 950px;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color); background-color: var(--bg-main);">
                            <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">Jahr</th>
                            <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">Monat</th>
                            ${types.map(t => `<th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">${escapeHTML(t)}</th>`).join('')}
                            <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">Sonstige</th>
                            <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">Gesamt</th>
                            <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem; width: 140px;">Budget</th>
                            <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem; width: 140px;">Aufstockung (+)</th>
                            <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">Delta Monat</th>
                            <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem; width: 150px;">Budget Jahr</th>
                            <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">Delta Jahr</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${monthsData.map(m => `
                            <tr style="border-bottom: 1px solid var(--border-color); transition: var(--transition);" class="budget-row">
                                <td style="padding: 14px 16px; font-weight: 600; color: var(--text-secondary);">${selectedYear}</td>
                                <td style="padding: 14px 16px; font-weight: 600; color: var(--text-primary);">${m.monthKey}</td>
                                ${types.map(t => `<td style="padding: 14px 16px; text-align: right; color: var(--text-secondary);">${formatCurrency(m.expensesByType[t], currency)}</td>`).join('')}
                                <td style="padding: 14px 16px; text-align: right; color: var(--text-secondary);">${formatCurrency(m.expensesByType["Sonstige"], currency)}</td>
                                <td style="padding: 14px 16px; text-align: right; font-weight: 600; color: var(--text-primary);">${formatCurrency(m.totalExpenses, currency)}</td>
                                <td style="padding: 8px 16px; text-align: right;">
                                    <div style="display: inline-flex; align-items: center; gap: 4px; justify-content: flex-end; width: 100%;">
                                        <input type="text" inputmode="decimal" class="form-control budget-input" data-month-key="${m.monthKey}" value="${formatNumber(m.baseBudget !== undefined ? m.baseBudget : m.budget, 2)}" style="width: 80px; text-align: right; padding: 6px 10px; font-family: var(--font-primary); font-weight: 500;">
                                        <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">${currency}</span>
                                    </div>
                                </td>
                                <td style="padding: 8px 16px; text-align: right;">
                                    <div style="display: inline-flex; align-items: center; gap: 4px; justify-content: flex-end; width: 100%;">
                                        <input type="text" inputmode="decimal" class="form-control topup-input" data-month-key="${m.monthKey}" value="${formatNumber(m.topUp || 0, 2)}" style="width: 80px; text-align: right; padding: 6px 10px; font-family: var(--font-primary); font-weight: 500;">
                                        <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">${currency}</span>
                                    </div>
                                </td>
                                <td class="delta-monat-cell" data-month-key="${m.monthKey}" style="padding: 14px 16px; text-align: right; font-weight: 600; transition: var(--transition);"></td>
                                <td class="cumulative-budget-cell" data-month-key="${m.monthKey}" style="padding: 14px 16px; text-align: right; color: var(--text-secondary); font-weight: 600;"></td>
                                <td class="delta-jahr-cell" data-month-key="${m.monthKey}" style="padding: 14px 16px; text-align: right; font-weight: 700; transition: var(--transition);"></td>
                            </tr>
                        `).join('')}
                        
                        <tr style="background-color: var(--bg-main); border-top: 2px solid var(--border-color); font-weight: 700;" id="sum-row">
                            <td colspan="2" style="padding: 14px 16px; color: var(--text-primary);">Gesamt ${selectedYear}</td>
                            ${types.map(t => `<td style="padding: 14px 16px; text-align: right; color: var(--text-primary);">${formatCurrency(totalByType[t], currency)}</td>`).join('')}
                            <td style="padding: 14px 16px; text-align: right; color: var(--text-primary);">${formatCurrency(totalByType["Sonstige"], currency)}</td>
                            <td style="padding: 14px 16px; text-align: right; color: var(--text-primary);">${formatCurrency(overallExpenses, currency)}</td>
                            <td id="total-base-budget-cell" style="padding: 14px 16px; text-align: right; color: var(--text-primary); font-family: var(--font-primary);"></td>
                            <td id="total-topup-cell" style="padding: 14px 16px; text-align: right; color: var(--text-primary); font-family: var(--font-primary);"></td>
                            <td id="total-delta-monat-cell" style="padding: 14px 16px; text-align: right; font-weight: 700; transition: var(--transition);"></td>
                            <td id="total-cumulative-budget-cell" style="padding: 14px 16px; text-align: right; color: var(--text-primary); font-family: var(--font-primary); font-weight: 700;"></td>
                            <td id="total-delta-cell" style="padding: 14px 16px; text-align: right; font-weight: 700; transition: var(--transition);"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- 2. Card: Historische Jahres-Zusammenfassung (Jahresaggregation für alle Jahre auf einmal) -->
        <div class="view-controls" style="margin-bottom: 16px;">
            <h3 class="view-subtitle" style="font-family: var(--font-display); font-size: 1.8rem; color: var(--text-primary); margin: 0;">Historische Jahresübersicht</h3>
        </div>
        
        <div class="details-card table-card" style="flex-direction: column; padding: 24px; background-color: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); margin-bottom: 32px;">
            <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 0.95rem; line-height: 1.5;">
                Vergleichende Übersicht über deine jährlichen Budgets und Ausgaben. Das Jahresdelta zeigt den Endwert zum 31. Dezember des jeweiligen Jahres.
            </p>
            
            <div style="overflow-x: auto; width: 100%; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <table class="budget-table" style="width: 100%; border-collapse: collapse; text-align: left; min-width: 800px;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color); background-color: var(--bg-main);">
                            <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">Jahr</th>
                            ${types.map(t => `<th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">${escapeHTML(t)}</th>`).join('')}
                            <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">Sonstige</th>
                            <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">Gesamtausgaben</th>
                            <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">Gesamtbudget</th>
                            <th style="padding: 14px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); text-align: right; font-size: 0.95rem;">Delta Jahr</th>
                        </tr>
                    </thead>
                    <tbody id="historical-budget-tbody">
                        ${yearsSummaryData.map(y => renderHistoricalRow(y, types, currency)).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        ${renderPrognosisSection(prognosisData, currency)}
    `;
}

// Renderfunktion für die Prognose- & Trendkarte am Ende der Budget-Ansicht
export function renderPrognosisSection(prognosisData, currency) {
    if (!prognosisData) return '';

    const {
        targetYear,
        elapsedMonthsCount,
        spentYTD,
        avgMonthlySpend,
        prevSpentYTD,
        yoyDiff,
        yoyPercent,
        totalYearBudget,
        projectedTotalExpenses,
        projectedDelta,
        monthlyTrend
    } = prognosisData;

    const prevYear = targetYear - 1;
    const isPastYear = elapsedMonthsCount === 12 && targetYear < new Date().getFullYear();

    const yoySign = yoyDiff > 0 ? '+' : '';
    const yoyClass = yoyDiff > 0 ? 'color: var(--danger);' : (yoyDiff < 0 ? 'color: var(--success);' : 'color: var(--text-secondary);');
    const yoyIcon = yoyDiff > 0 ? 'fa-arrow-trend-up' : (yoyDiff < 0 ? 'fa-arrow-trend-down' : 'fa-minus');

    const deltaClass = projectedDelta >= 0 ? 'color: var(--success);' : 'color: var(--danger);';
    const deltaSign = projectedDelta >= 0 ? '+' : '';

    return `
        <!-- 3. Card: Prognose & Trend-Analyse -->
        <div class="view-controls" style="margin-top: 32px; margin-bottom: 16px;">
            <h3 class="view-subtitle" style="font-family: var(--font-display); font-size: 1.8rem; color: var(--text-primary); margin: 0;">
                <i class="fa-solid fa-chart-line" style="color: var(--primary-color); margin-right: 8px;"></i>Budget-Prognose & Trends (${targetYear})
            </h3>
        </div>

        <div class="details-card table-card" style="flex-direction: column; padding: 24px; background-color: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); margin-bottom: 32px;">
            <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 0.95rem; line-height: 1.5;">
                Hochrechnung deiner Jahressumme auf Basis des bisherigen Kauftempos (${elapsedMonthsCount} ${elapsedMonthsCount === 1 ? 'Monat' : 'Monate'}) sowie Entwicklungsvergleich zum Vorjahr <strong style="color: var(--text-primary);">${prevYear}</strong>.
            </p>

            <!-- KPI Cards Row -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <!-- KPI 1: Hochrechnung Jahresausgaben -->
                <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 12px; padding: 18px;">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${isPastYear ? 'Tatsächliche Ausgaben' : 'Prognose Jahresausgaben'}
                    </div>
                    <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-primary); margin-top: 6px;">
                        ${formatCurrency(projectedTotalExpenses, currency)}
                    </div>
                    <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 6px;">
                        ${isPastYear ? 'Abgeschlossenes Jahr' : `Bisher ausgegeben: ${formatCurrency(spentYTD, currency)}`}
                    </div>
                </div>

                <!-- KPI 2: Prognostiziertes Delta -->
                <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 12px; padding: 18px;">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        Erwartetes Jahres-Delta
                    </div>
                    <div style="font-size: 1.6rem; font-weight: 800; ${deltaClass} margin-top: 6px;">
                        ${deltaSign}${formatCurrency(projectedDelta, currency)}
                    </div>
                    <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 6px;">
                        Plan-Budget: ${formatCurrency(totalYearBudget, currency)}
                    </div>
                </div>

                <!-- KPI 3: Ø Ausgaben / Monat -->
                <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 12px; padding: 18px;">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        Ø Ausgaben pro Monat
                    </div>
                    <div style="font-size: 1.6rem; font-weight: 800; color: var(--primary-color); margin-top: 6px;">
                        ${formatCurrency(avgMonthlySpend, currency)}
                    </div>
                    <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 6px;">
                        Basis: ${elapsedMonthsCount} ${elapsedMonthsCount === 1 ? 'Monat' : 'Monate'} ${targetYear}
                    </div>
                </div>

                <!-- KPI 4: Vorjahresvergleich YTD -->
                <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 12px; padding: 18px;">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        Vergleich zu ${prevYear} (YTD)
                    </div>
                    <div style="font-size: 1.6rem; font-weight: 800; ${yoyClass} margin-top: 6px;">
                        <i class="fa-solid ${yoyIcon}" style="font-size: 1.2rem; margin-right: 4px;"></i>
                        ${yoySign}${formatCurrency(yoyDiff, currency)}
                    </div>
                    <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 6px;">
                        ${prevSpentYTD > 0 ? `${yoySign}${yoyPercent.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% ggü. Vorjahr (${formatCurrency(prevSpentYTD, currency)})` : 'Vorjahr: 0,00 ' + currency}
                    </div>
                </div>
            </div>

            <!-- Monatlicher Trend & Prognose-Verlauf Tabelle -->
            <div style="overflow-x: auto; width: 100%; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <table class="budget-table" style="width: 100%; border-collapse: collapse; text-align: left; min-width: 750px;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color); background-color: var(--bg-main);">
                            <th style="padding: 12px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); font-size: 0.9rem;">Monat</th>
                            <th style="padding: 12px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); font-size: 0.9rem; text-align: right;">Status</th>
                            <th style="padding: 12px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); font-size: 0.9rem; text-align: right;">Ist-Ausgaben</th>
                            <th style="padding: 12px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); font-size: 0.9rem; text-align: right;">Hochrechnung</th>
                            <th style="padding: 12px 16px; font-family: var(--font-display); font-weight: 700; color: var(--text-primary); font-size: 0.9rem; text-align: right;">Budget</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${monthlyTrend.map(m => `
                            <tr style="border-bottom: 1px solid var(--border-color); ${m.isCurrent ? 'background: rgba(109, 40, 217, 0.12);' : ''}">
                                <td style="padding: 12px 16px; font-weight: 600; color: var(--text-primary);">
                                    ${m.monthLabel} ${m.isCurrent ? '<span style="font-size: 0.75rem; background: var(--primary-color); color: white; padding: 2px 8px; border-radius: 10px; margin-left: 6px;">Aktuell</span>' : ''}
                                </td>
                                <td style="padding: 12px 16px; text-align: right; font-size: 0.85rem;">
                                    ${m.isCurrent
                                        ? `<span style="color: var(--secondary-color); font-weight: 600;"><i class="fa-solid fa-spinner fa-spin"></i> Läuft (${m.currentDay}/${m.daysInMonth} Tage)</span>`
                                        : (m.isElapsed 
                                            ? '<span style="color: var(--success); font-weight: 600;"><i class="fa-solid fa-check"></i> Erfasst</span>' 
                                            : '<span style="color: var(--warning); font-weight: 600;"><i class="fa-solid fa-clock"></i> Prognostiziert</span>')}
                                </td>
                                <td style="padding: 12px 16px; text-align: right; color: ${(m.isElapsed || m.isCurrent) ? 'var(--text-primary)' : 'var(--text-secondary)'};">
                                    ${(m.isElapsed || m.isCurrent) ? formatCurrency(m.actualExpenses, currency) : '-'}
                                </td>
                                <td style="padding: 12px 16px; text-align: right; font-weight: 600; color: ${m.isProjected ? 'var(--warning)' : 'var(--text-primary)'};">
                                    ${formatCurrency(m.projectedExpense, currency)}
                                </td>
                                <td style="padding: 12px 16px; text-align: right; color: var(--text-secondary);">
                                    ${formatCurrency(m.budget, currency)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
