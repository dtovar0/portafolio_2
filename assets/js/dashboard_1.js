/**
 * Dashboard 1: ApexCharts High Fidelity Logic (GENERIC VERSION)
 * Driven by AuditLogs and Platform Metrics
 */

async function changeActivityPage(page) {
    const container = document.getElementById('activityLogsContainer');
    if (!container) return;

    container.style.opacity = '0.5';
    container.style.pointerEvents = 'none';

    try {
        const response = await fetch(`/?page=${page}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        
        if (response.ok) {
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const newLogs = doc.getElementById('activityLogsContainer');
            const newFooter = doc.getElementById('activityPaginationFooter');
            
            if (newLogs) container.innerHTML = newLogs.innerHTML;
            const footer = document.getElementById('activityPaginationFooter');
            if (footer && newFooter) footer.innerHTML = newFooter.innerHTML;
        }
    } catch (err) {
        console.error("Error updating activity:", err);
    } finally {
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Line Chart: Activity Volume
    const optionsVolume = {
        series: [{
            name: 'Eventos',
            data: [0, 0, 0, 0, 0, 0, 0]
        }],
        chart: {
            height: 200,
            type: 'area',
            sparkline: { enabled: false },
            toolbar: { show: false },
            animations: { enabled: true, easing: 'easeinout', speed: 1000 }
        },
        fill: {
            type: 'gradient',
            gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1, stops: [0, 90, 100] }
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        xaxis: {
            categories: ['', '', '', '', '', '', ''],
            labels: { style: { colors: 'rgb(var(--color-label-text))', fontSize: '10px' } }
        },
        yaxis: { show: false },
        grid: { show: false },
        tooltip: { theme: 'dark' },
        colors: ['#6366f1']
    };

    const volumeChart = new ApexCharts(document.querySelector("#bookingSparkline"), optionsVolume);
    if (document.querySelector("#bookingSparkline")) volumeChart.render();

    // 2. Bar Chart: Daily Breakdown (Mock for now, showing history)
    const optionsHistory = {
        series: [{
            name: 'Interacciones',
            data: [0, 0, 0, 0, 0, 0, 0]
        }],
        chart: {
            height: 200,
            type: 'bar',
            toolbar: { show: false }
        },
        plotOptions: {
            bar: { columnWidth: '50%', borderRadius: 6, distributed: true }
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories: ['', '', '', '', '', '', ''],
            labels: { style: { colors: 'rgb(var(--color-label-text))', fontSize: '10px' } }
        },
        yaxis: { show: false },
        grid: { show: false },
        legend: { show: false },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4']
    };

    const historyChart = new ApexCharts(document.querySelector("#onTimeRadial"), optionsHistory);
    if (document.querySelector("#onTimeRadial")) historyChart.render();

    // 3. Platform Stats Integration
    async function loadPlatformStats() {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            
            if (data.status === 'success') {
                const s = data.stats;
                
                // Update KPIs
                const totalEl = document.getElementById('kpiTotalTasks');
                const pendingEl = document.getElementById('kpiPendingTasks');
                const scheduledEl = document.getElementById('kpiScheduledTasks');
                const volumeEl = document.getElementById('kpiOperationalVolume');

                if (totalEl) totalEl.textContent = s.total_events.toLocaleString();
                if (pendingEl) pendingEl.textContent = s.critical_alerts.toLocaleString();
                if (scheduledEl) scheduledEl.textContent = s.active_users.toLocaleString();
                if (volumeEl) volumeEl.textContent = s.volume_today.toLocaleString();

                // Handle Empty States
                const hasData = s.total_events > 0;
                const volumeContent = document.getElementById('volumeContent');
                const emptyMessage = document.getElementById('noDataVolume');
                const historyContent = document.getElementById('historyContent');
                const emptyHistory = document.getElementById('noDataHistory');

                if (hasData) {
                    if (volumeContent) volumeContent.classList.remove('opacity-0', 'pointer-events-none');
                    if (emptyMessage) emptyMessage.classList.add('hidden');
                    if (historyContent) historyContent.classList.remove('opacity-0', 'pointer-events-none');
                    if (emptyHistory) emptyHistory.classList.add('hidden');

                    // Update Volume Chart (Area)
                    const volumes = s.history.map(h => h.count);
                    const categories = s.history.map(h => h.day);

                    volumeChart.updateSeries([{ name: 'Eventos', data: volumes }]);
                    volumeChart.updateOptions({ xaxis: { categories: categories } });

                    // Update History Chart (Bars)
                    historyChart.updateSeries([{ name: 'Interacciones', data: volumes.slice().reverse() }]);
                    historyChart.updateOptions({ xaxis: { categories: categories.slice().reverse() } });
                } else {
                    if (volumeContent) volumeContent.classList.add('opacity-0', 'pointer-events-none');
                    if (emptyMessage) emptyMessage.classList.remove('hidden');
                    if (historyContent) historyContent.classList.add('opacity-0', 'pointer-events-none');
                    if (emptyHistory) emptyHistory.classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error('Error loading platform stats:', error);
        }
    }

    loadPlatformStats();
    setInterval(loadPlatformStats, 60000);
});
