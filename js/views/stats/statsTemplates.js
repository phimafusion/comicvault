import { escapeHTML, renderStars, formatCurrency, formatNumber } from '../../utils.js';
import { formatGermanDate } from '../../services/stats/statsUtils.js';

export function renderKPICards({ totalComics, totalValue, readPercent, tbrCount, tbrValue }, currencySymbol) {
    return `
        <div class="stats-kpi-card stats-kpi-primary">
            <div class="stats-kpi-value">${totalComics}</div>
            <div class="stats-kpi-label">Comics (gefiltert)</div>
        </div>
        <div class="stats-kpi-card stats-kpi-success">
            <div class="stats-kpi-value">${formatCurrency(totalValue, currencySymbol)}</div>
            <div class="stats-kpi-label">Sammlungswert</div>
        </div>
        <div class="stats-kpi-card stats-kpi-secondary">
            <div class="stats-kpi-value">${formatNumber(readPercent, 2)}%</div>
            <div class="stats-kpi-label">Gelesen Quote</div>
        </div>
        <div class="stats-kpi-card stats-kpi-warning">
            <div class="stats-kpi-value">${tbrCount}</div>
            <div class="stats-kpi-label">Lesestapel (TBR)</div>
        </div>
        <div class="stats-kpi-card stats-kpi-accent">
            <div class="stats-kpi-value">${formatCurrency(tbrValue, currencySymbol)}</div>
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
                            <td data-label="Sammlungswert" class="stats-td stats-text-right stats-color-success">${formatCurrency(stat.value, currencySymbol)}</td>
                            <td data-label="Gelesen Quote" class="stats-td stats-text-center">
                                <div class="stats-progress-container">
                                    <span class="stats-progress-label">${formatNumber(stat.readPercent, 2)}%</span>
                                    <div class="stats-progress-bar-bg">
                                        <div class="stats-progress-bar-fill" style="width: ${stat.readPercent}%;"></div>
                                    </div>
                                </div>
                            </td>
                            <td data-label="Lesestapel (TBR)" class="stats-td stats-text-center stats-color-warning">${stat.tbrCount}</td>
                            <td data-label="Ungelesener Wert" class="stats-td stats-text-right stats-color-accent">${formatCurrency(stat.tbrValue, currencySymbol)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

export function renderHighlightsCards({ avgPrice, speedText, topPurchaseMonth, topPurchaseVal, topReadMonth, topReadVal, maxPriceComic }, currencySymbol) {
    const teuersterText = maxPriceComic ? `${escapeHTML(maxPriceComic.titel)} (${formatCurrency(maxPriceComic.preis, currencySymbol)})` : '-';
    return `
        <div class="stats-highlight-item">
            <span class="stats-highlight-label">Ø Preis pro Comic</span>
            <span class="stats-highlight-value">${formatCurrency(avgPrice, currencySymbol)}</span>
        </div>
        <div class="stats-highlight-item">
            <span class="stats-highlight-label">Leseaktivität</span>
            <span class="stats-highlight-value">${speedText}</span>
        </div>
        <div class="stats-highlight-item">
            <span class="stats-highlight-label">Aktivster Kaufmonat</span>
            <span class="stats-highlight-value">${topPurchaseMonth} ${topPurchaseVal > 0 ? `(${formatCurrency(topPurchaseVal, currencySymbol)})` : ''}</span>
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
                        <td data-label="Verlag" class="stats-td stats-font-weight-600">${escapeHTML(p.name)}</td>
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
                        <td data-label="Serie" class="stats-td stats-font-weight-600">${escapeHTML(s.name)}</td>
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
                        <td class="stats-td stats-text-center">${formatCurrency(y.totalSpent, currencySymbol)}</td>
                        <td class="stats-td stats-text-center">${y.totalRead}</td>
                        <td class="stats-td stats-text-center stats-color-warning">${y.endTBR}</td>
                        <td class="stats-td stats-text-center">${yearTrendHtml}</td>
                    </tr>
                `;
                
                // Monats-Zeilen
                html += y.months.map(d => {
                    const monthLabel = monNames[d.date.getMonth()];
                    
                    let trendHtml = '';
                    let trendPercentStr = (d.trendPercent !== undefined && d.trend !== 0) ? ` (${d.trendPercent > 0 ? '+' : ''}${formatNumber(d.trendPercent, 1)}%)` : '';
                    if (d.trend > 0) {
                        trendHtml = `<span class="stats-color-danger" title="Lesestapel wächst"><i class="fa-solid fa-arrow-up"></i> +${d.trend}${trendPercentStr}</span>`;
                    } else if (d.trend < 0) {
                        trendHtml = `<span class="stats-color-success" title="Lesestapel schrumpft"><i class="fa-solid fa-arrow-down"></i> ${d.trend}${trendPercentStr}</span>`;
                    } else {
                        trendHtml = `<span class="stats-color-secondary" title="Keine Veränderung"><i class="fa-solid fa-minus"></i> 0 (0,0%)</span>`;
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
                            <td class="stats-td stats-text-center stats-color-secondary">${formatCurrency(d.spentThisMonth, currencySymbol)}</td>
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

export function renderStatsMultiSelect(key, label, options, activeStatsFilters) {
    const selected = activeStatsFilters[key] || [];
    const isActive = selected.length > 0;
    const displayText = isActive ? `${label} (${selected.length})` : label;
    
    return `
        <div class="multi-select-container" style="position: relative;">
            <button class="btn btn-secondary stats-filter-trigger ${isActive ? 'active-filter' : ''}" 
                    data-key="${key}" 
                    style="height: 36px; font-size: 0.85rem; border-radius: 8px; padding: 0 15px; background: ${isActive ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-card)'}; border: 1px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}; color: ${isActive ? 'var(--primary-color)' : 'inherit'}; min-width: 100px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <span>${displayText}</span>
                <i class="fa-solid fa-chevron-down" style="font-size: 0.7rem; opacity: 0.6;"></i>
            </button>
            <div class="multi-select-dropdown" id="dropdown-stats-${key}" style="display: none; position: absolute; top: 42px; left: 0; z-index: 1000; background: #1e293b; border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5); min-width: 240px; max-height: 400px; overflow-y: auto; padding: 8px;">
                ${options.length === 0 ? `
                    <div style="padding: 10px; color: var(--text-secondary); font-size: 0.85rem; text-align: center;">Keine Optionen verfügbar</div>
                ` : options.map(opt => `
                    <label style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; border-radius: 6px; transition: background 0.2s; margin-bottom: 2px;" class="filter-option">
                        <input type="checkbox" class="stats-filter-checkbox" data-key="${key}" value="${opt}" ${selected.includes(opt) ? 'checked' : ''} style="accent-color: var(--primary-color); width: 16px; height: 16px;">
                        <span style="flex: 1; color: var(--text-main);">${opt}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;
}

export function renderTimeframeSelect(years, activeTimeframe) {
    const options = [
        { value: 'all', label: 'Gesamter Zeitraum' },
        { value: 'last6', label: 'Letzte 6 Monate' },
        { value: 'last12', label: 'Letzte 12 Monate' },
        { value: 'thisYear', label: 'Dieses Jahr' },
        { value: 'lastYear', label: 'Letztes Jahr' }
    ];
    years.forEach(y => {
        options.push({ value: `year-${y}`, label: `Jahr ${y}` });
    });
    
    return `
        <div class="timeframe-select-container">
            <select id="select-stats-timeframe" class="btn btn-secondary" style="height: 36px; font-size: 0.85rem; border-radius: 8px; padding: 0 15px; background: var(--bg-card); border: 1px solid var(--border-color); color: inherit; min-width: 140px; text-align: left; cursor: pointer; outline: none;">
                ${options.map(opt => `<option value="${opt.value}" ${activeTimeframe === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
            </select>
        </div>
    `;
}

export function renderDebugContainerContent(earlyComics) {
    if (earlyComics.length === 0) return '';
    return `
        <div style="font-weight: 600; color: var(--warning); margin-bottom: 8px; font-family: var(--font-display);">
            <i class="fa-solid fa-triangle-exclamation"></i> Diagnose: Ungewöhnlich frühe Kaufdaten gefunden (vor 2020)
        </div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">
            Diese Einträge verschieben den Startpunkt deines zeitlichen Diagramms weit nach hinten. 
            Wenn dies Eingabefehler sind (z. B. "04.12" vom Browser als April 2012 anstatt 4. Dezember interpretiert), passe das Datum im Comic an:
            <ul style="margin-top: 8px; padding-left: 20px; color: var(--text-primary);">
                ${earlyComics.map(c => `<li><strong>${escapeHTML(c.titel)}</strong>: Eingetragenes Kaufdatum: <code>"${escapeHTML(c.kaufdatum)}"</code></li>`).join('')}
            </ul>
        </div>
    `;
}

// Renderfunktion für die Top-10 Sammelbox mit Excel-Style Reitern (Reine Bestands-Statistiken)
export function renderTop10Sammelbox(top10Data = {}, activeTabKey = 'oldestUnread', currencySymbol = '€') {
    const tabs = [
        { key: 'oldestUnread', label: '⏳ 10 Älteste ungelesene', subtitle: 'Die am längsten ungelesenen Bände in deinem physischen Bestand (TBR-Klassiker)' },
        { key: 'recentPurchases', label: '🛍️ 10 Zuletzt gekaufte', subtitle: 'Deine aktuellsten Neuzugänge im Regal' },
        { key: 'mostExpensive', label: '💸 10 Teuerste Comics', subtitle: 'Die wertvollsten Einzelbände deiner physischen Sammlung' },
        { key: 'topRated', label: '⭐ 10 Bestbewertete', subtitle: 'Deine persönlichen Top-Bewertungen und Highlights' },
        { key: 'oldestRead', label: '📜 10 Älteste gelesene', subtitle: 'Bände im Bestand, die du schon am längsten besitzt & gelesen hast' }
    ];

    const currentTab = tabs.find(t => t.key === activeTabKey) || tabs[0];
    const items = (top10Data && top10Data[activeTabKey]) ? top10Data[activeTabKey] : [];

    return `
        <div class="details-card table-card" style="flex-direction: column; padding: 24px; margin-bottom: 24px;" id="stats-top10-sammelbox">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;">
                <div>
                    <h3 style="font-family: var(--font-display); font-size: 1.3rem; margin-bottom: 6px; display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-table-cells" style="color: var(--primary-color);"></i>
                        <span>Top-10 Sammelbox (Physischer Bestand)</span>
                    </h3>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">
                        ${currentTab.subtitle} &nbsp;•&nbsp; <strong>Hinweis:</strong> Bezieht sich immer auf den vorhandenen Bestand und wird von oberen Filtern nicht beeinflusst.
                    </p>
                </div>
            </div>

            <!-- Glassmorphism Tab Bar Track -->
            <div style="display: inline-flex; gap: 6px; padding: 6px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; backdrop-filter: blur(10px); flex-wrap: wrap; margin-bottom: 20px; box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);">
                ${tabs.map(t => {
                    const isActive = t.key === activeTabKey;
                    return `
                        <button class="stats-top10-tab-btn ${isActive ? 'active' : ''}" data-tab="${t.key}" style="
                            font-family: var(--font-primary, 'Inter', sans-serif);
                            font-size: 0.85rem;
                            font-weight: ${isActive ? '700' : '500'};
                            padding: 9px 16px;
                            border-radius: 10px;
                            cursor: pointer;
                            outline: none;
                            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                            ${isActive ? `
                                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                                color: #ffffff;
                                border: 1px solid rgba(255, 255, 255, 0.25);
                                box-shadow: 0 4px 15px -1px rgba(99, 102, 241, 0.45), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
                                transform: translateY(0);
                            ` : `
                                background: transparent;
                                color: var(--text-secondary, #94a3b8);
                                border: 1px solid transparent;
                            `}
                        " onmouseover="if(!this.classList.contains('active')){this.style.background='rgba(255,255,255,0.06)';this.style.color='#f8fafc';}" onmouseout="if(!this.classList.contains('active')){this.style.background='transparent';this.style.color='var(--text-secondary, #94a3b8)';}">
                            ${t.label}
                        </button>
                    `;
                }).join('')}
            </div>

            <!-- Tabellen-Inhalt -->
            <div style="overflow-x: auto; width: 100%; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                <table class="stats-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; min-width: 700px;">
                    <thead>
                        <tr style="background-color: var(--bg-main); border-bottom: 2px solid var(--border-color);">
                            <th style="padding: 12px 16px; width: 50px; text-align: center;">#</th>
                            <th style="padding: 12px 16px;">Titel & Serie</th>
                            <th style="padding: 12px 16px; width: 70px; text-align: center;">Nr.</th>
                            <th style="padding: 12px 16px;">Verlag</th>
                            <th style="padding: 12px 16px;">Format / Typ</th>
                            <th style="padding: 12px 16px; text-align: center;">Kaufdatum</th>
                            <th style="padding: 12px 16px; text-align: right;">Preis</th>
                            <th style="padding: 12px 16px; text-align: right;">${activeTabKey === 'topRated' ? 'Bewertung' : (activeTabKey === 'oldestRead' ? 'Gelesen am' : 'Status')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.length === 0 ? `
                            <tr>
                                <td colspan="8" style="padding: 24px; text-align: center; color: var(--text-secondary);">
                                    Keine Comics für diese Kategorie im vorhandenen Bestand gefunden.
                                </td>
                            </tr>
                        ` : items.map((c, index) => {
                            const priceNum = Number(c.preis);
                            const displayPrice = !isNaN(priceNum) && c.preis !== null ? formatCurrency(priceNum, currencySymbol) : '-';
                            const title = escapeHTML(c.titel || 'Unbenannt');
                            const serie = c.serie ? escapeHTML(c.serie) : '';
                            const displayNum = (c.nummer !== undefined && c.nummer !== null && c.nummer !== '') ? `#${escapeHTML(String(c.nummer))}` : '-';

                            const verlag = c.verlag ? escapeHTML(c.verlag) : '-';
                            const typ = escapeHTML(c.typ || c.format || '-');
                            const kaufdatum = formatGermanDate(c.kaufdatum);

                            let extraInfo = '-';
                            if (activeTabKey === 'topRated') {
                                extraInfo = c.bewertung ? `<span style="color: var(--warning); font-weight: 700;">★ ${c.bewertung}/10</span>` : '-';
                            } else if (activeTabKey === 'oldestRead') {
                                extraInfo = c.gelesen_am ? formatGermanDate(c.gelesen_am) : '-';
                            } else {
                                extraInfo = c.gelesen_am 
                                    ? `<span style="color: var(--success); font-size: 0.8rem; font-weight: 600;">✓ Gelesen</span>` 
                                    : `<span style="color: var(--warning); font-size: 0.8rem; font-weight: 600;">Ungelesen</span>`;
                            }

                            return `
                                <tr style="border-bottom: 1px solid var(--border-color);" class="stats-tr">
                                    <td style="padding: 12px 16px; text-align: center; font-weight: 700; color: var(--primary-color);">${index + 1}</td>
                                    <td style="padding: 12px 16px;">
                                        <div style="font-weight: 600; color: var(--text-primary);">${title}</div>
                                        ${serie ? `<div style="font-size: 0.8rem; color: var(--text-secondary);">${serie}</div>` : ''}
                                    </td>
                                    <td style="padding: 12px 16px; text-align: center; font-weight: 600; color: var(--text-primary);">${displayNum}</td>
                                    <td style="padding: 12px 16px; color: var(--text-secondary);">${verlag}</td>
                                    <td style="padding: 12px 16px; color: var(--text-secondary);">${typ}</td>
                                    <td style="padding: 12px 16px; text-align: center; color: var(--text-secondary);">${kaufdatum}</td>
                                    <td style="padding: 12px 16px; text-align: right; font-weight: 600; color: var(--text-primary);">${displayPrice}</td>
                                    <td style="padding: 12px 16px; text-align: right;">${extraInfo}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}


