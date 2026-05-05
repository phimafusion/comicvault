import { openModal } from './form.js';

export function renderImport(container) {
    const html = `
        <div class="view-controls">
            <h2 class="view-title">Import Feature</h2>
        </div>
        
        <div class="details-card" style="flex-direction: column; max-width: 600px; margin: 0 auto;">
            <p style="color: var(--text-secondary); margin-bottom: 24px;">
                Gib eine URL von einer Comic-Seite ein (z.B. Panini, Thalia, Amazon), um die Daten automatisch zu erfassen.
            </p>
            
            <div class="form-group">
                <label class="form-label">Ziel-Speicherort</label>
                <select id="import-target" class="form-control">
                    <option value="collection">Meine Sammlung</option>
                    <option value="wishlist">Wunschliste</option>
                </select>
            </div>
            
            <div class="form-group" style="margin-top: 20px;">
                <label class="form-label">URL zum Comic / Manga</label>
                <div style="display: flex; gap: 10px;">
                    <input type="url" id="import-url" class="form-control" placeholder="https://www.paninishop.de/..." style="flex: 1;">
                    <button class="btn btn-primary" id="btn-start-import">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Daten laden
                    </button>
                </div>
            </div>
            
            <div id="import-status" style="margin-top: 20px; display: none;">
                <div style="display: flex; align-items: center; gap: 10px; color: var(--secondary-color);">
                    <i class="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Analysiere Webseite...</span>
                </div>
            </div>
            
            <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-secondary);">
                <p><strong>Hinweis:</strong> Für den automatischen Import nutzen wir aktuell einen Test-Parser. Sollten Daten fehlen, kannst du sie im nächsten Schritt manuell ergänzen.</p>
            </div>
        </div>
    `;
    container.innerHTML = html;
    
    document.getElementById('btn-start-import').addEventListener('click', () => {
        handleImport();
    });
}

async function handleImport() {
    const url = document.getElementById('import-url').value;
    const target = document.getElementById('import-target').value;
    const status = document.getElementById('import-status');
    
    if (!url) {
        alert('Bitte gib eine gültige URL ein.');
        return;
    }
    
    status.style.display = 'block';
    
    // In einer echten Umgebung würden wir hier einen Server-Endpunkt anfragen,
    // der die URL per Web-Scraping ausliest.
    // Für diesen Prototyp simulieren wir den Erfolg nach 2 Sekunden.
    
    setTimeout(() => {
        status.style.display = 'none';
        
        // Mock-Daten basierend auf einer fiktiven Analyse
        const mockData = {
            titel: "Batman: Die Drei Joker (Deluxe Edition)",
            verlag: "Panini",
            typ: "Comic",
            serie: "Batman",
            nummer: 1,
            format: "Hardcover",
            jahr: 2021,
            sprache: "Deutsch",
            preis: 29.00,
            isbn: "978-3741621215",
            bild: "https://m.media-amazon.com/images/I/81I5S+184pL.jpg",
            bemerkung: "Importiert von URL: " + url
        };
        
        // Öffnet die Maske mit den vorausgefüllten Daten
        openModal(mockData, target === 'wishlist');
        
    }, 2000);
}
