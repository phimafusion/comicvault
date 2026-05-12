// Simple Budget View Prototype
export function renderBudget(container) {
    const html = `
        <div class="view-controls" style="padding-top: 32px;">
            <h2 class="view-title">Budgets & Kostenanalyse</h2>
        </div>
        
        <div class="details-card" style="flex-direction: column;">
            <p style="color: var(--text-secondary); margin-bottom: 24px;">Hier können monatliche Budgets gepflegt werden. Die Daten werden automatisch fortgeschrieben.</p>
            
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color);">
                            <th style="padding: 12px;">Monat</th>
                            <th style="padding: 12px;">Budget</th>
                            <th style="padding: 12px;">Ausgaben</th>
                            <th style="padding: 12px;">Delta Monat</th>
                            <th style="padding: 12px;">Delta Jahr</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 12px;">01-2024</td>
                            <td style="padding: 12px;">100,00 ${db.getSettings().currency || '€'}</td>
                            <td style="padding: 12px;">45,50 ${db.getSettings().currency || '€'}</td>
                            <td style="padding: 12px; color: var(--success);">+54,50 ${db.getSettings().currency || '€'}</td>
                            <td style="padding: 12px; color: var(--success);">+54,50 ${db.getSettings().currency || '€'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 12px;">02-2024</td>
                            <td style="padding: 12px;">100,00 ${db.getSettings().currency || '€'}</td>
                            <td style="padding: 12px;">120,00 ${db.getSettings().currency || '€'}</td>
                            <td style="padding: 12px; color: var(--danger);">-20,00 ${db.getSettings().currency || '€'}</td>
                            <td style="padding: 12px; color: var(--success);">+34,50 ${db.getSettings().currency || '€'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 12px;">03-2024</td>
                            <td style="padding: 12px;">
                                <input type="number" class="form-control" value="100" style="width: 100px; padding: 4px 8px;"> ${db.getSettings().currency || '€'}
                            </td>
                            <td style="padding: 12px;">0,00 ${db.getSettings().currency || '€'}</td>
                            <td style="padding: 12px;">0,00 ${db.getSettings().currency || '€'}</td>
                            <td style="padding: 12px;">+34,50 ${db.getSettings().currency || '€'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 24px; display: flex; justify-content: flex-end;">
                <button class="btn btn-primary">Änderungen speichern</button>
            </div>
        </div>
    `;
    container.innerHTML = html;
}
