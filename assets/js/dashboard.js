/**
 * Dashboard Module - Charts & Real-time Info
 */
document.addEventListener('DOMContentLoaded', () => {
    const datos = window.__datos || {};
    const chartData = datos.charts || {};

    /* ─── UI Helpers ─── */
    const ui = {
        updateClock() {
            const clockElement = document.getElementById('realtime-clock');
            if (clockElement) {
                const now = new Date();
                const time = now.toLocaleTimeString('es-ES', { 
                    hour: '2-digit', minute: '2-digit', second: '2-digit' 
                });
                clockElement.textContent = time;
            }
        },

        createChartEmpty(title, text, iconClass = 'fa-chart-pie') {
            return `
                <div class="premium-empty-state-chart">
                    <div class="chart-empty-icon">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <p class="chart-empty-title">${title}</p>
                    <p class="chart-empty-text">${text}</p>
                </div>
            `;
        },

        isEmpty(arr) {
            return !arr || arr.length === 0 || arr.every(v => v === 0);
        },

        initCharts() {
            const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
            const accentColor = chartData.accentColor || '#6366f1';

            // Chart: Users per Platform
            this.renderBarChart('usersPlatformChart', chartData.usersPlatform, {
                color: accentColor,
                emptyTitle: "Ranking Vacío",
                emptyText: "No hay datos de uso para generar un ranking de plataformas.",
                emptyIcon: "fa-trophy"
            });

            // Chart: Users per Area
            this.renderBarChart('usersAreaBarChart', chartData.usersArea, {
                color: (chartData.usersArea?.colors || []).map(c => {
                    if (c && c.includes('gradient')) {
                        const match = c.match(/#[0-9a-fA-F]{3,6}/);
                        return match ? match[0] : '#10b981';
                    }
                    return c || '#10b981';
                }),
                emptyTitle: "Distribución TI",
                emptyText: "Registra áreas para visualizar la distribución de servicios.",
                emptyIcon: "fa-chart-pie"
            });

            // Chart: Pending Requests
            this.renderBarChart('pendingRequestsChart', chartData.pendingRequests, {
                color: '#f59e0b',
                emptyTitle: "Todo al día",
                emptyText: "No hay solicitudes de acceso pendientes.",
                emptyIcon: "fa-clipboard-check"
            });

            // Chart: Most Visited
            this.renderBarChart('mostVisitedChart', chartData.mostVisited, {
                color: '#3b82f6',
                emptyTitle: "Sin Tráfico",
                emptyText: "Las visitas aparecerán aquí conforme se use el portal.",
                emptyIcon: "fa-chart-line"
            });
        },

        renderBarChart(canvasId, data, config) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            if (this.isEmpty(data?.values)) {
                canvas.parentElement.innerHTML = this.createChartEmpty(config.emptyTitle, config.emptyText, config.emptyIcon);
                return;
            }

            const ctx = canvas.getContext('2d');
            const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Cantidad',
                        data: data.values,
                        backgroundColor: config.color,
                        borderRadius: 6,
                        barThickness: 32
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false, drawBorder: false }, ticks: { color: textColor, font: { size: 9 } } },
                        y: { beginAtZero: true, grid: { display: false }, ticks: { color: textColor, stepSize: 1, font: { size: 9 } } }
                    }
                }
            });
        }
    };

    // Initialize
    setInterval(() => ui.updateClock(), 1000);
    ui.updateClock();
    ui.initCharts();
});
