import { db } from '../db.js';
import { parseCurrency } from '../utils.js';

// Aggregiert statistische Daten über die Comicsammlung für das KI-Prompt
export function compileCollectionStatsPromptData(comics = [], wishes = []) {
    const totalComics = comics.length;
    
    let readCount = 0;
    let totalValue = 0;
    const publishersMap = {};
    const formatsMap = {};
    const topRated = [];
    const recentPurchases = [];

    comics.forEach(c => {
        // Gelesen-Zähler
        if (c.gelesen_am && String(c.gelesen_am).trim() !== '') {
            readCount++;
        }
        
        // Preis-Summe
        const price = parseCurrency(c.preis) || 0;
        totalValue += price;

        // Verlage
        if (c.verlag) {
            publishersMap[c.verlag] = (publishersMap[c.verlag] || 0) + 1;
        }

        // Formate
        if (c.format) {
            formatsMap[c.format] = (formatsMap[c.format] || 0) + 1;
        }

        // Top-Bewertungen (Bewertung ab 8 von 10 Sternen)
        const rating = parseInt(c.bewertung, 10) || 0;
        if (rating >= 8) {
            topRated.push({ titel: c.titel, verlag: c.verlag, bewertung: rating });
        }

        // Neueste Käufe
        if (c.kaufdatum) {
            recentPurchases.push({ titel: c.titel, kaufdatum: c.kaufdatum });
        }
    });

    const unreadCount = totalComics - readCount;

    // Verlage & Formate sortieren nach Häufigkeit
    const publishers = Object.entries(publishersMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const formats = Object.entries(formatsMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    // Top rated limitieren auf 10
    topRated.sort((a, b) => b.bewertung - a.bewertung);
    const topRatedSlice = topRated.slice(0, 10);

    // Neueste Käufe sortieren und limitieren auf 5
    recentPurchases.sort((a, b) => new Date(b.kaufdatum) - new Date(a.kaufdatum));
    const recentPurchasesSlice = recentPurchases.slice(0, 5);

    return {
        totalComics,
        readCount,
        unreadCount,
        totalValue,
        publishers,
        formats,
        topRated: topRatedSlice,
        recentPurchases: recentPurchasesSlice,
        wishlistCount: wishes.length,
        wishlistItems: wishes.slice(0, 10).map(w => ({ titel: w.titel, preis: w.preis }))
    };
}

// Ruft die Gemini API mit den Sammlungsdaten auf
export async function generateAiInsightsFromGemini(apiKey, promptData) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const systemInstruction = 
        "Du bist ein leidenschaftlicher, humorvoller und kompetenter Comic-Experte und Sammler. " +
        "Du erhältst strukturierte Daten über die Comicsammlung des Nutzers (Verlage, gelesene/ungelesene Comics, Werte, Wunschliste). " +
        "Erstelle eine lebendige, persönliche, auf Deutsch verfasste Sammlungs-Rezension und Analyse. " +
        "Verwende Markdown für Überschriften, Fettungen und Bulletpoints. " +
        "Bringe Humor ein (z.B. über den 'Stapel des Glücks / Pile of Joy' bei ungelesenen Comics) und ziehe interessante Schlüsse. " +
        "Erstelle gerne auch eine kleine Markdown-Tabelle für die wichtigsten Verlagsschwerpunkte. " +
        "Gib der Analyse einen coolen Titel als Hauptüberschrift (z.B. 'Der Zustand deines Comic-Universums' oder ähnlich). " +
        "Schreibe als Du-Anrede und halte den Ton kollegial unter Comic-Fans.";

    const promptText = `
Hier sind die aggregierten statistischen Daten meiner Comicsammlung:
- Gesamtanzahl Comics: ${promptData.totalComics}
- Bereits gelesene Comics: ${promptData.readCount}
- Ungelesene Comics: ${promptData.unreadCount} (Lesestapel)
- Geschätzter Gesamtwert der Sammlung: ${promptData.totalValue.toFixed(2)} €
- Haupt-Verlage in der Sammlung:
${promptData.publishers.map(p => `  * ${p.name}: ${p.count} Titel`).join('\n')}
- Haupt-Formate:
${promptData.formats.map(f => `  * ${f.name}: ${f.count} Titel`).join('\n')}
- Meine am besten bewerteten Comics:
${promptData.topRated.map(c => `  * ${c.titel} (${c.verlag}) - Bewertung: ${c.bewertung}/10`).join('\n')}
- Letzte Käufe:
${promptData.recentPurchases.map(c => `  * ${c.titel} (Kaufdatum: ${c.kaufdatum})`).join('\n')}
- Meine Wunschliste (${promptData.wishlistCount} Einträge):
${promptData.wishlistItems.map(w => `  * ${w.titel} (ca. ${w.preis} €)`).join('\n')}

Bitte schreibe mir basierend darauf ein Review!
`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: promptText }]
            }],
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || response.statusText;
        throw new Error(errMsg);
    }

    const resJson = await response.json();
    const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error("Keine Textantwort von Gemini erhalten.");
    }
    return text;
}

// Generiert ein detailliertes lokales Mock-Review, falls kein API-Key hinterlegt ist
export function generateLocalMockInsights(stats) {
    const hasComics = stats.totalComics > 0;
    
    let title = "Dein persönliches Comic-Sammlungsporträt";
    let intro = "Es wurden noch keine Comics erfasst. Starte damit, Comics in deine Sammlung einzutragen, um spannende Einblicke zu erhalten!";
    let strengthSection = "";
    let readSection = "";
    let wishlistSection = "";
    
    if (hasComics) {
        title = `Die Chroniken von ComicVault: Analyse deiner ${stats.totalComics} Schätze`;
        intro = `Deine Sammlung umfasst aktuell **${stats.totalComics} Comics** mit einem Gesamtwert von **${stats.totalValue.toFixed(2)} €**. Ein Blick auf deine Regale verrät eine sorgfältig kuratierte Auswahl mit klaren Schwerpunkten!`;
        
        const topPub = stats.publishers[0] ? `${stats.publishers[0].name} (${stats.publishers[0].count} Titel)` : "unbekannten Verlagen";
        const secondPub = stats.publishers[1] ? ` gefolgt von ${stats.publishers[1].name} (${stats.publishers[1].count} Titel)` : "";
        
        // Kleine Verlagstabelle erzeugen
        let tableRows = "| Verlag | Anzahl Titel |\n|---|---|\n";
        stats.publishers.slice(0, 5).forEach(p => {
            tableRows += `| ${p.name} | ${p.count} |\n`;
        });

        strengthSection = `
## Stärken & Ausrichtung deiner Sammlung
* **Verlagsschwerpunkt**: Deine stärkste Säule bildet **${topPub}**${secondPub}. Das zeigt eine klare Verbundenheit zu diesen Universen!
* **Verlagsverteilung**:
${tableRows}
* **Lieblingsformate**: Du bevorzugst vor allem **${stats.formats[0] ? stats.formats[0].name : 'kein bestimmtes'}** für das perfekte Leseerlebnis.
* **Deine Kronjuwelen**: Titel wie ${stats.topRated.slice(0, 3).map(c => `*${c.titel}* (Bewertung: ${c.bewertung}/10)`).join(', ') || 'noch keine bewerteten Comics'} stechen als absolute Highlights deiner Sammlung hervor.
`;
        
        const unreadPercent = ((stats.unreadCount / stats.totalComics) * 100).toFixed(1);
        const unreadText = stats.unreadCount > 0 
            ? `Du hast aktuell noch **${stats.unreadCount} ungelesene Comics** (${unreadPercent}% deines Bestands). Das ist dein persönlicher Lesestapel des Glücks (Pile of Joy) – da wartet noch viel Lesespaß in deinen Regalen!`
            : "Wahnsinn! Du hast tatsächlich alle Comics in deiner Sammlung gelesen. Ein wahrer Vollblut-Leser!";
        
        readSection = `
## Lesestatus & Fortschritt
* **Gelesene Bände**: Du hast bereits **${stats.readCount}** deiner Comics komplett durchgeschmökert.
* **Lesestapel (Pile of Joy)**: ${unreadText}
`;
        
        const wishText = stats.wishlistCount > 0
            ? `Auf deiner Wunschliste stehen aktuell **${stats.wishlistCount} Bände** (z. B. ${stats.wishlistItems.slice(0, 3).map(w => `*${w.titel}*`).join(', ')}). Es gibt also reichlich Nachschub, auf den du dich freuen kannst!`
            : "Deine Wunschliste ist aktuell leer. Zeit, neue Comics zu entdecken!";
        
        wishlistSection = `
## Ausblick & Empfehlungen
* **Wunschliste**: ${wishText}
* **Tipp**: Behalte dein Monatsbudget im Auge, um geplante Anschaffungen schrittweise zu finanzieren. Der monatliche Initialwert von 200 € ist eine hervorragende Basis für gesunden Sammlungszuwachs!
`;
    }
    
    return `
# ${title}

${intro}

${strengthSection}

${readSection}

${wishlistSection}
    `.trim();
}

// Hilfsfunktion zum Parsen von Inline-Markdown (Fett, Kursiv, Inline-Code)
export function parseInlineMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary); font-weight: 700;">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 4px; font-family: var(--font-code, monospace); font-size: 0.85rem;">$1</code>');
}

// Wandelt Markdown-Tabellenzeilen in HTML um
function convertTable(rows) {
    if (rows.length === 0) return '';
    const filteredRows = rows.filter(r => !r.match(/^[|\s:\-]+$/));
    if (filteredRows.length === 0) return '';

    let tableHtml = '<div style="overflow-x: auto; margin: 16px 0; border: 1px solid var(--border-color); border-radius: var(--radius-md);"><table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">';
    
    filteredRows.forEach((row, idx) => {
        const cols = row.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
        const isHeader = idx === 0;
        tableHtml += `<tr style="border-bottom: 1px solid var(--border-color); background-color: ${isHeader ? 'var(--bg-main)' : 'transparent'}; font-weight: ${isHeader ? '700' : 'normal'};">`;
        cols.forEach(col => {
            const cellContent = parseInlineMarkdown(col);
            tableHtml += `<td style="padding: 10px 14px; color: ${isHeader ? 'var(--text-primary)' : 'var(--text-main)'};">${cellContent}</td>`;
        });
        tableHtml += '</tr>';
    });
    tableHtml += '</table></div>';
    return tableHtml;
}

// Einfacher Markdown-Parser für Überschriften, Listen, Absätze und Tabellen
export function parseMarkdown(md) {
    if (!md) return '';
    let html = md
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const lines = html.split('\n');
    let inList = false;
    let inTable = false;
    let tableRows = [];
    let resultLines = [];

    for (let line of lines) {
        const trimmed = line.trim();

        // Tabellen-Erkennung
        if (trimmed.startsWith('|')) {
            if (!inTable) {
                inTable = true;
                tableRows = [];
            }
            tableRows.push(line);
            continue;
        } else {
            if (inTable) {
                inTable = false;
                resultLines.push(convertTable(tableRows));
                tableRows = [];
            }
        }

        // Überschriften-Erkennung
        if (trimmed.startsWith('### ')) {
            resultLines.push(`<h4 style="color: var(--primary-color); margin-top: 16px; margin-bottom: 8px; font-family: var(--font-display); font-size: 1.2rem;">${trimmed.slice(4)}</h4>`);
        } else if (trimmed.startsWith('## ')) {
            resultLines.push(`<h3 style="color: var(--primary-color); margin-top: 20px; margin-bottom: 10px; font-family: var(--font-display); font-size: 1.4rem;">${trimmed.slice(3)}</h3>`);
        } else if (trimmed.startsWith('# ')) {
            resultLines.push(`<h2 style="color: var(--primary-color); margin-top: 24px; margin-bottom: 12px; font-family: var(--font-display); font-size: 1.7rem;">${trimmed.slice(2)}</h2>`);
        }
        // Listen-Erkennung (Bulletpoints)
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            if (!inList) {
                inList = true;
                resultLines.push('<ul style="margin: 8px 0 16px 0; padding-left: 20px; list-style-type: disc;">');
            }
            resultLines.push(`<li style="margin-bottom: 6px; color: var(--text-main); font-size: 0.95rem; line-height: 1.5;">${parseInlineMarkdown(trimmed.slice(2))}</li>`);
        } else {
            if (inList) {
                inList = false;
                resultLines.push('</ul>');
            }
            if (trimmed === '') {
                resultLines.push('<br>');
            } else {
                resultLines.push(`<p style="margin-bottom: 12px; line-height: 1.6; color: var(--text-main); font-size: 0.95rem;">${parseInlineMarkdown(line)}</p>`);
            }
        }
    }

    if (inTable) {
        resultLines.push(convertTable(tableRows));
    }
    if (inList) {
        resultLines.push('</ul>');
    }

    return resultLines.join('\n');
}

// Haupt-Renderfunktion für die KI Insights Ansicht
export async function renderAiInsights(container) {
    const settings = db.getSettings();
    const apiKey = settings.geminiApiKey || '';
    
    // Gespeicherte Insights laden
    let savedInsights = localStorage.getItem('comicvault_ai_insights') || '';
    let savedSource = localStorage.getItem('comicvault_ai_insights_source') || 'local'; // 'gemini' oder 'local'
    let savedTimestamp = localStorage.getItem('comicvault_ai_insights_timestamp') || '';
    
    // Falls noch nie Insights generiert wurden, laden wir ein initiales lokales Mock-Review
    if (!savedInsights) {
        const comics = await db.getAllComics();
        const wishes = await db.getWishlist();
        const stats = compileCollectionStatsPromptData(comics, wishes);
        savedInsights = generateLocalMockInsights(stats);
        savedSource = 'local';
        savedTimestamp = new Date().toLocaleString('de-DE');
        
        localStorage.setItem('comicvault_ai_insights', savedInsights);
        localStorage.setItem('comicvault_ai_insights_source', savedSource);
        localStorage.setItem('comicvault_ai_insights_timestamp', savedTimestamp);
    }

    function drawView() {
        const isGemini = savedSource === 'gemini';
        
        const badgeStyle = isGemini 
            ? 'background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%); border: 1px solid rgba(139, 92, 246, 0.4); color: #c084fc;'
            : 'background: rgba(30, 41, 59, 0.5); border: 1px solid var(--border-color); color: var(--text-secondary);';
        
        const badgeLabel = isGemini 
            ? '<i class="fa-solid fa-sparkles"></i> KI-generiert (Gemini 2.5 Flash)'
            : '<i class="fa-solid fa-code"></i> System-generiert (Lokaler Algorithmus)';

        const html = `
            <div class="view-controls" style="padding-top: 32px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                    <h2 class="view-title" style="margin: 0;">KI Insights</h2>
                    <span id="insights-source-badge" style="font-size: 0.75rem; padding: 6px 12px; border-radius: 20px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; letter-spacing: 0.5px; text-transform: uppercase; ${badgeStyle}">
                        ${badgeLabel}
                    </span>
                    ${savedTimestamp ? `<span style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 500;">Generiert am: ${savedTimestamp}</span>` : ''}
                </div>
                
                <button class="btn btn-primary" id="btn-generate-insights" style="display: inline-flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-brain"></i> Insights generieren
                </button>
            </div>

            <!-- Warnung falls kein API-Key eingetragen ist -->
            ${!apiKey ? `
                <div class="details-card" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: var(--radius-lg); padding: 20px; display: flex; align-items: center; gap: 20px; margin-bottom: 24px; animation: fadeIn 0.3s ease;">
                    <div style="background: rgba(245, 158, 11, 0.1); width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--warning); flex-shrink: 0;">
                        <i class="fa-solid fa-circle-info fa-lg"></i>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 6px 0; color: var(--text-primary); font-family: var(--font-display);">Lokale Vorschau aktiv</h4>
                        <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">
                            Die untenstehende Analyse wurde lokal von deinem Browser berechnet. Um echte, dynamische und tiefgehende KI-Analysen direkt von **Gemini** zu erhalten, hinterlege einfach deinen kostenlosen API-Schlüssel in den Einstellungen.
                        </p>
                    </div>
                    <button class="btn btn-secondary" id="btn-go-to-settings-key" style="white-space: nowrap; font-size: 0.85rem; border-radius: 8px;">
                        <i class="fa-solid fa-arrow-right-long"></i> Zu den Einstellungen
                    </button>
                </div>
            ` : ''}

            <!-- Haupt-Anzeige der Insights -->
            <div class="details-card" id="insights-content-card" style="flex-direction: column; padding: 32px; background-color: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); min-height: 300px; position: relative;">
                
                <!-- Lade-Overlay (wird während des Generierens eingeblendet) -->
                <div id="insights-loading-overlay" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-radius: var(--radius-lg); z-index: 10; flex-direction: column; align-items: center; justify-content: center; gap: 16px; animation: fadeIn 0.2s ease;">
                    <i class="fa-solid fa-brain fa-spin fa-3x" style="color: var(--primary-color);"></i>
                    <h3 id="insights-loading-status" style="margin: 0; font-family: var(--font-display); color: var(--text-primary);">Analysiere deine Sammlung...</h3>
                    <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">Dies kann einen kurzen Moment dauern.</p>
                </div>

                <!-- Text-Inhalt -->
                <div class="markdown-body" id="insights-text-container" style="line-height: 1.7; color: var(--text-main); font-family: var(--font-primary);">
                    ${parseMarkdown(savedInsights)}
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Event-Listener anbinden
        bindEvents();
    }

    function bindEvents() {
        // Link zu den Einstellungen
        const settingsBtn = container.querySelector('#btn-go-to-settings-key');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                if (window.app) {
                    window.app.navigate('settings');
                }
            });
        }

        // Insights generieren
        const generateBtn = container.querySelector('#btn-generate-insights');
        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                const overlay = container.querySelector('#insights-loading-overlay');
                const statusEl = container.querySelector('#insights-loading-status');
                
                if (overlay) {
                    overlay.style.display = 'flex';
                }

                try {
                    // 1. Daten holen
                    const [comics, wishes] = await Promise.all([
                        db.getAllComics(),
                        db.getWishlist()
                    ]);
                    
                    if (statusEl) statusEl.textContent = "Aggregiere Sammlungsdaten...";
                    const stats = compileCollectionStatsPromptData(comics, wishes);

                    let resultText = '';
                    let source = 'local';

                    // 2. Generieren
                    if (apiKey) {
                        if (statusEl) statusEl.textContent = "Sende Daten an Gemini...";
                        resultText = await generateAiInsightsFromGemini(apiKey, stats);
                        source = 'gemini';
                    } else {
                        if (statusEl) statusEl.textContent = "Berechne lokale Insights...";
                        // Kleiner künstlicher Delay für bessere UX bei lokaler Generierung
                        await new Promise(resolve => setTimeout(resolve, 800));
                        resultText = generateLocalMockInsights(stats);
                        source = 'local';
                    }

                    // 3. Speichern
                    savedInsights = resultText;
                    savedSource = source;
                    savedTimestamp = new Date().toLocaleString('de-DE');

                    localStorage.setItem('comicvault_ai_insights', savedInsights);
                    localStorage.setItem('comicvault_ai_insights_source', savedSource);
                    localStorage.setItem('comicvault_ai_insights_timestamp', savedTimestamp);

                    // 4. View neu zeichnen
                    drawView();

                } catch (err) {
                    console.error("Fehler bei der Insight-Generierung:", err);
                    alert("Fehler bei der Generierung: " + err.message);
                } finally {
                    if (overlay) {
                        overlay.style.display = 'none';
                    }
                }
            });
        }
    }

    // Erstes Zeichnen der View
    drawView();
}
