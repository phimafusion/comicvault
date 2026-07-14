import { escapeHTML } from '../../utils.js';
import { renderStars } from '../../utils.js';

export function renderKPICards({ totalComics, totalValue, readPercent, tbrCount, tbrValue }, currencySymbol) {
    return `
        <div class="stats-kpi-card stats-kpi-primary">
            <div class="stats-kpi-value">${totalComics}</div>
            <div class="stats-kpi-label">Comics (gefiltert)</div>
        </div>
        <div class="stats-kpi-card stats-kpi-success">
            <div class="stats-kpi-value">${totalValue.toFixed(2)} ${currencySymbol}</div>
            <div class="stats-kpi-label">Sammlungswert</div>
        </div>
        <div class="stats-kpi-card stats-kpi-secondary">
            <div class="stats-kpi-value">${readPercent}%</div>
            <div class="stats-kpi-label">Gelesen Quote</div>
        </div>
        <div class="stats-kpi-card stats-kpi-warning">
            <div class="stats-kpi-value">${tbrCount}</div>
            <div class="stats-kpi-label">Lesestapel (TBR)</div>
        </div>
        <div class="stats-kpi-card stats-kpi-accent">
            <div class="stats-kpi-value">${tbrValue.toFixed(2)} ${currencySymbol}</div>
            <div class="stats-kpi-label">Ungelesener Wert</div>
        </div>
    `;
}

export function renderTypeStatsTable(typeStats, currencySymbol) {
    if (typeStats.length === 0) return '';
    return `
        <div class="stats-table-wrapper">
            <h3 class="stats-table-header">
                <i class="fa-solid fa-layer-group stats-icon-primary"></i>
                <span>Kennzahlen nach Typ</span>
            </h3>
            <table class="stats-table">
                <thead>
                    <tr>
                        <th class="stats-th">Typ</th>
                        <th class="stats-th stats-text-center">Anzahl</th>
                        <th class="stats-th stats-text-right">Sammlungswert</th>
                        <th class="stats-th stats-text-center">Gelesen Quote</th>
                        <th class="stats-th stats-text-center">Lesestapel (TBR)</th>
                        <th class="stats-th stats-text-right">Ungelesener Wert</th>
                    </tr>
                </thead>
                <tbody>
                    ${typeStats.map(stat => `
                        <tr class="stats-tr" data-type="${stat.type}">
                            <td data-label="Typ" class="stats-td stats-font-display">${escapeHTML(stat.type)}</td>
                            <td data-label="Anzahl" class="stats-td stats-text-center stats-color-primary">${stat.total}</td>
                            <td data-label="Sammlungswert" class="stats-td stats-text-right stats-color-success">${stat.value.toFixed(2)} ${currencySymbol}</td>
                            <td data-label="Gelesen Quote" class="stats-td stats-text-center">
                                <div class="stats-progress-container">
                                    <span class="stats-progress-label">${stat.readPercent}%</span>
                                    <div class="stats-progress-bar-bg">
                                        <div class="stats-progress-bar-fill" style="width: ${stat.readPercent}%;"></div>
                                    </div>
                                </div>
                            </td>
                            <td data-label="Lesestapel (TBR)" class="stats-td stats-text-center stats-color-warning">${stat.tbrCount}</td>
                            <td data-label="Ungelesener Wert" class="stats-td stats-text-right stats-color-accent">${stat.tbrValue.toFixed(2)} ${currencySymbol}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

export function renderHighlightsCards({ avgPrice, speedText, topPurchaseMonth, topPurchaseVal, topReadMonth, topReadVal, maxPriceComic }, currencySymbol) {
    const teuersterText = maxPriceComic ? `${escapeHTML(maxPriceComic.titel)} (${Number(maxPriceComic.preis).toFixed(2)} ${currencySymbol})` : '-';
    return `
        <div class="stats-highlight-item">
            <span class="stats-highlight-label">Ø Preis pro Comic</span>
            <span class="stats-highlight-value">${avgPrice} ${currencySymbol}</span>
        </div>
        <div class="stats-highlight-item">
            <span class="stats-highlight-label">Leseaktivität</span>
            <span class="stats-highlight-value">${speedText}</span>
        </div>
        <div class="stats-highlight-item">
            <span class="stats-highlight-label">Aktivster Kaufmonat</span>
            <span class="stats-highlight-value">${topPurchaseMonth} ${topPurchaseVal > 0 ? `(${topPurchaseVal} Käufe)` : ''}</span>
        </div>
        <div class="stats-highlight-item">
            <span class="stats-highlight-label">Aktivster Lesemonat</span>
            <span class="stats-highlight-value">${topReadMonth} ${topReadVal > 0 ? `(${topReadVal} gelesen)` : ''}</span>
        </div>
        <div class="stats-highlight-item stats-highlight-fullwidth">
            <span class="stats-highlight-label">Teuerster Comic</span>
            <span class="stats-highlight-value stats-color-accent stats-text-truncate" title="${teuersterText}">${teuersterText}</span>
        </div>
    `;
}

export function renderTopPublishersTable(topPublishers) {
    if (topPublishers.length === 0) {
        return `<tr><td class="stats-td-empty">Keine Verlagsdaten vorhanden.</td></tr>`;
    }
    return `
        <thead>
            <tr>
                <th class="stats-th">Verlag</th>
                <th class="stats-th stats-text-center">Comics</th>
                <th class="stats-th stats-text-center">Gelesen</th>
                <th class="stats-th stats-text-right">Ø Bewertung</th>
            </tr>
        </thead>
        <tbody>
            ${topPublishers.map(p => {
                const avgRate = p.ratedCount > 0 ? (p.ratingSum / p.ratedCount) : 0;
                return `
                    <tr class="stats-tr">
                        <td data-label="Verlag" class="stats-td stats-font-weight-600">${p.name}</td>
                        <td data-label="Comics" class="stats-td stats-text-center stats-font-weight-600">${p.total}</td>
                        <td data-label="Gelesen" class="stats-td stats-text-center stats-color-secondary">${p.read}</td>
                        <td data-label="Ø Bewertung" class="stats-td stats-text-right">${avgRate > 0 ? renderStars(avgRate) : '-'}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
}

export function renderTopSeriesTable(topSeries) {
    if (topSeries.length === 0) {
        return `<tr><td class="stats-td-empty">Keine Seriendaten vorhanden.</td></tr>`;
    }
    return `
        <thead>
            <tr>
                <th class="stats-th">Serie</th>
                <th class="stats-th stats-text-center">Comics</th>
                <th class="stats-th stats-text-center">Gelesen</th>
                <th class="stats-th stats-text-right">Ø Bewertung</th>
            </tr>
        </thead>
        <tbody>
            ${topSeries.map(s => {
                const avgRate = s.ratedCount > 0 ? (s.ratingSum / s.ratedCount) : 0;
                return `
                    <tr class="stats-tr">
                        <td data-label="Serie" class="stats-td stats-font-weight-600">${s.name}</td>
                        <td data-label="Comics" class="stats-td stats-text-center stats-font-weight-600">${s.total}</td>
                        <td data-label="Gelesen" class="stats-td stats-text-center stats-color-secondary">${s.read}</td>
                        <td data-label="Ø Bewertung" class="stats-td stats-text-right">${avgRate > 0 ? renderStars(avgRate) : '-'}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
}

export function renderInventoryTBRTable(yearlyData, currentYear, currencySymbol) {
    if (yearlyData.length === 0) {
        return `<tr><td class="stats-td-empty">Keine Daten vorhanden.</td></tr>`;
    }
    const monNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    return `
        <thead class="stats-thead-sticky">
            <tr>
                <th class="stats-th">Monat / Jahr</th>
                <th class="stats-th stats-text-center">Gekauft</th>
                <th class="stats-th stats-text-center">Ausgaben</th>
                <th class="stats-th stats-text-center">Gelesen</th>
                <th class="stats-th stats-text-center">Lesestapel (TBR)</th>
                <th class="stats-th stats-text-center">Trend</th>
            </tr>
        </thead>
        <tbody>
            ${yearlyData.map(y => {
                const isCurrentYear = y.year === currentYear;
                
                // Jahres-Zeile
                let yearTrendHtml = '';
                if (y.trend > 0) yearTrendHtml = `<span class="stats-color-danger"><i class="fa-solid fa-arrow-up"></i> +${y.trend}</span>`;
                else if (y.trend < 0) yearTrendHtml = `<span class="stats-color-success"><i class="fa-solid fa-arrow-down"></i> ${y.trend}</span>`;
                else yearTrendHtml = `<span class="stats-color-secondary"><i class="fa-solid fa-minus"></i> 0</span>`;

                let html = `
                    <tr class="tbr-year-row stats-tbr-year" data-year="${y.year}">
                        <td class="stats-td stats-flex-center-gap">
                            <i class="fa-solid fa-chevron-${isCurrentYear ? 'down' : 'right'} tbr-icon-year-${y.year} stats-accordion-icon"></i>
                            ${y.year}
                        </td>
                        <td class="stats-td stats-text-center">${y.totalPurchased}</td>
                        <td class="stats-td stats-text-center">${y.totalSpent.toFixed(2)} ${currencySymbol}</td>
                        <td class="stats-td stats-text-center">${y.totalRead}</td>
                        <td class="stats-td stats-text-center stats-color-warning">${y.endTBR}</td>
                        <td class="stats-td stats-text-center">${yearTrendHtml}</td>
                    </tr>
                `;
                
                // Monats-Zeilen
                html += y.months.map(d => {
                    const monthLabel = monNames[d.date.getMonth()];
                    
                    let trendHtml = '';
                    let trendPercentStr = (d.trendPercent !== undefined && d.trend !== 0) ? ` (${d.trendPercent > 0 ? '+' : ''}${d.trendPercent.toFixed(1)}%)` : '';
                    if (d.trend > 0) {
                        trendHtml = `<span class="stats-color-danger" title="Lesestapel wächst"><i class="fa-solid fa-arrow-up"></i> +${d.trend}${trendPercentStr}</span>`;
                    } else if (d.trend < 0) {
                        trendHtml = `<span class="stats-color-success" title="Lesestapel schrumpft"><i class="fa-solid fa-arrow-down"></i> ${d.trend}${trendPercentStr}</span>`;
                    } else {
                        trendHtml = `<span class="stats-color-secondary" title="Keine Veränderung"><i class="fa-solid fa-minus"></i> 0 (0.0%)</span>`;
                    }
                    
                    // Sparklines & Icons
                    const maxSpark = Math.max(d.purchasedThisMonth, d.readThisMonth);
                    const pWidth = maxSpark > 0 ? (d.purchasedThisMonth/maxSpark)*100 : 0;
                    const rWidth = maxSpark > 0 ? (d.readThisMonth/maxSpark)*100 : 0;
                    
                    const pIcon = d.isMaxPurchased ? ' <span title="Kaufstärkster Monat">💸</span>' : '';
                    const rIcon = d.isMaxRead ? ' <span title="Lesestärkster Monat">🏆</span>' : '';

                    return `
                        <tr class="tbr-month-row tbr-year-${y.year} stats-tbr-month" style="display: ${isCurrentYear ? 'table-row' : 'none'};">
                            <td class="stats-td stats-pl-32 stats-color-secondary">${monthLabel}</td>
                            <td class="stats-td stats-text-center stats-color-secondary">
                                <div>${d.purchasedThisMonth}${pIcon}</div>
                                <div class="stats-sparkline-bg"><div class="stats-sparkline-fill stats-bg-danger" style="width: ${pWidth}%;"></div></div>
                            </td>
                            <td class="stats-td stats-text-center stats-color-secondary">${d.spentThisMonth.toFixed(2)} ${currencySymbol}</td>
                            <td class="stats-td stats-text-center stats-color-secondary">
                                <div>${d.readThisMonth}${rIcon}</div>
                                <div class="stats-sparkline-bg"><div class="stats-sparkline-fill stats-bg-success" style="width: ${rWidth}%;"></div></div>
                            </td>
                            <td class="stats-td stats-text-center stats-font-weight-600 stats-color-warning">${d.tbrAtEnd}</td>
                            <td class="stats-td stats-text-center">${trendHtml}</td>
                        </tr>
                    `;
                }).join('');
                
                return html;
            }).join('')}
        </tbody>
    `;
}
