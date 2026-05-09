import { db } from '../db.js';

export function renderSettings(container) {
    const html = `
        <div class="view-controls" style="padding-top: 32px;">
            <h2 class="view-title">Einstellungen</h2>
        </div>
        
        <div class="details-grid">
            <div class="details-card" style="flex-direction: column; border: 1px solid var(--danger); background: rgba(231, 76, 60, 0.05);">
                <h3 style="color: var(--danger); margin-top: 0;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Gefahrenzone
                </h3>
                <p style="color: var(--text-secondary); margin-bottom: 24px;">
                    Hier kannst du alle Daten in deiner ComicVault-Datenbank unwiderruflich löschen. 
                    Dies umfasst deine gesamte Sammlung und deine Wunschliste.
                </p>
                
                <button class="btn btn-danger" id="btn-clear-database" style="align-self: flex-start;">
                    <i class="fa-solid fa-trash-can"></i> Datenbank vollständig leeren
                </button>
            </div>
            
            <div class="details-card" style="flex-direction: column;">
                <h3>Info</h3>
                <p style="color: var(--text-secondary);">
                    ComicVault v1.2<br>
                    Alle Daten werden sicher in der Google Cloud (Firestore) gespeichert.
                </p>
            </div>
        </div>
    `;
    container.innerHTML = html;
    
    document.getElementById('btn-clear-database').addEventListener('click', async () => {
        const confirm1 = confirm('Möchtest du wirklich ALLE Daten (Sammlung & Wunschliste) löschen? Dies kann nicht rückgängig gemacht werden!');
        if (confirm1) {
            const confirm2 = confirm('Bist du dir ABSOLUT sicher? Alle 900+ Einträge werden entfernt.');
            if (confirm2) {
                const btn = document.getElementById('btn-clear-database');
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Lösche Datenbank...';
                
                try {
                    await db.clearAllData();
                    alert('Datenbank wurde erfolgreich geleert.');
                    window.location.reload(); // Reload to clear caches and UI
                } catch (e) {
                    alert('Fehler beim Löschen der Daten: ' + e.message);
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Datenbank vollständig leeren';
                }
            }
        }
    });
}
