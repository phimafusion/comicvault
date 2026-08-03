// Chart.js Diagramm Initialisierungshelfer für Statistiken

export function initTimelineChart(id, labels, purchasedData, readData, tbrData, statsCharts) {
    const ctx = document.getElementById(id);
    if (!ctx) return;

    if (statsCharts[id]) statsCharts[id].destroy();

    statsCharts[id] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Lesestapel (TBR)',
                    data: tbrData,
                    borderColor: 'rgba(139, 92, 246, 1)', // Violet
                    backgroundColor: 'rgba(139, 92, 246, 0.1)', // Light violet fill
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 2,
                    pointHoverRadius: 5
                },
                {
                    label: 'Käufe (kumuliert)',
                    data: purchasedData,
                    borderColor: 'rgba(6, 182, 212, 1)', // Cyan
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: 'Gelesen (kumuliert)',
                    data: readData,
                    borderColor: 'rgba(16, 185, 129, 1)', // Emerald/Green
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' } }
                },
                tooltip: {
                    padding: 12,
                    cornerRadius: 8,
                    bodySpacing: 4
                }
            },
            scales: {
                y: { 
                    ticks: { color: '#94a3b8', font: { family: 'Inter' } }, 
                    grid: { color: 'rgba(255,255,255,0.05)' } 
                },
                x: { 
                    ticks: { color: '#94a3b8', font: { size: 10, family: 'Inter' } }, 
                    grid: { display: false } 
                }
            }
        }
    });
}

export function initDoughnutChart(id, labels, data, title, statsCharts) {
    const ctx = document.getElementById(id);
    if (!ctx) return;

    if (statsCharts[id]) statsCharts[id].destroy();

    const colors = [
        'rgba(6, 182, 212, 0.75)',  // Primary
        'rgba(139, 92, 246, 0.75)', // Purple/Violet
        'rgba(16, 185, 129, 0.75)', // Success
        'rgba(244, 63, 94, 0.75)',  // Accent/Rose
        'rgba(245, 158, 11, 0.75)', // Warning
        'rgba(100, 116, 139, 0.75)', // Slate
        'rgba(236, 72, 153, 0.75)'  // Pink
    ];

    statsCharts[id] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Anzahl',
                data: data,
                backgroundColor: colors,
                borderColor: 'rgba(30, 41, 59, 0.5)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { 
                        color: '#94a3b8', 
                        font: { size: 11, family: 'Inter' },
                        boxWidth: 12
                    }
                }
            },
            cutout: '65%'
        }
    });
}

export function initHorizontalBarChart(id, labels, data, label, statsCharts) {
    const ctx = document.getElementById(id);
    if (!ctx) return;

    if (statsCharts[id]) statsCharts[id].destroy();

    statsCharts[id] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: 'rgba(6, 182, 212, 0.7)',
                hoverBackgroundColor: 'rgba(6, 182, 212, 0.9)',
                borderColor: 'rgba(6, 182, 212, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: { 
                    ticks: { color: '#94a3b8', font: { family: 'Inter' } }, 
                    grid: { color: 'rgba(255,255,255,0.05)' } 
                },
                y: { 
                    ticks: { color: '#94a3b8', font: { size: 11, family: 'Inter' } }, 
                    grid: { display: false } 
                }
            }
        }
    });
}
