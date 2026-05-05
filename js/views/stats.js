import { db } from '../db.js';

export function renderStats(container) {
    const comics = db.getAllComics();
    
    // Calculate basic stats
    const totalComics = comics.length;
    const totalValue = comics.reduce((sum, c) => sum + (c.preis || 0), 0);
    const readComics = comics.filter(c => c.gelesen_am).length;
    const readPercent = totalComics > 0 ? Math.round((readComics / totalComics) * 100) : 0;
    
    // Type split
    const typeCount = {};
    comics.forEach(c => {
        typeCount[c.typ] = (typeCount[c.typ] || 0) + 1;
    });

    const html = `
        <div class="view-controls">
            <h2 class="view-title">Statistiken</h2>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 32px;">
            <div class="details-card" style="flex-direction: column; align-items: center; justify-content: center; padding: 32px 20px;">
                <div style="font-size: 2.5rem; font-family: var(--font-display); font-weight: 800; color: var(--primary-color)">${totalComics}</div>
                <div style="color: var(--text-secondary); text-transform: uppercase; font-size: 0.8rem; font-weight: 600; letter-spacing: 1px;">Comics in Sammlung</div>
            </div>
            <div class="details-card" style="flex-direction: column; align-items: center; justify-content: center; padding: 32px 20px;">
                <div style="font-size: 2.5rem; font-family: var(--font-display); font-weight: 800; color: var(--success)">${totalValue.toFixed(2)} €</div>
                <div style="color: var(--text-secondary); text-transform: uppercase; font-size: 0.8rem; font-weight: 600; letter-spacing: 1px;">Gesamtwert</div>
            </div>
            <div class="details-card" style="flex-direction: column; align-items: center; justify-content: center; padding: 32px 20px;">
                <div style="font-size: 2.5rem; font-family: var(--font-display); font-weight: 800; color: var(--secondary-color)">${readPercent}%</div>
                <div style="color: var(--text-secondary); text-transform: uppercase; font-size: 0.8rem; font-weight: 600; letter-spacing: 1px;">Gelesen</div>
            </div>
        </div>

        <div class="details-card" style="flex-direction: column;">
            <h3 style="margin-bottom: 20px;">Bestand vs. Gelesen (Lesestapel)</h3>
            <div style="position: relative; height: 300px; width: 100%;">
                <canvas id="statsChart"></canvas>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Draw chart
    setTimeout(() => {
        const ctx = document.getElementById('statsChart');
        if (!ctx) return;
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(typeCount),
                datasets: [{
                    label: 'Anzahl',
                    data: Object.values(typeCount),
                    backgroundColor: 'rgba(109, 40, 217, 0.6)',
                    borderColor: 'rgba(109, 40, 217, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: document.body.classList.contains('dark-mode') ? '#f8fafc' : '#0f172a' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: document.body.classList.contains('dark-mode') ? '#94a3b8' : '#64748b' },
                        grid: { color: document.body.classList.contains('dark-mode') ? '#334155' : '#e2e8f0' }
                    },
                    x: {
                        ticks: { color: document.body.classList.contains('dark-mode') ? '#94a3b8' : '#64748b' },
                        grid: { display: false }
                    }
                }
            }
        });
    }, 100);
}
