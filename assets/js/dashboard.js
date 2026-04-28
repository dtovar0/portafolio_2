/**
 * Nexus Premium - Dashboard Analytics Engine (ApexCharts Version)
 * Author: Antigravity AI
 */

document.addEventListener('DOMContentLoaded', () => {
    const data = window.__datos || {};
    const accentColor = data.charts?.accentColor || '#6366f1';

    // Helper to check if data is completely empty (all zeros or empty array)
    const isDataEmpty = (labels, values) => {
        return !labels || labels.length === 0 || !values || values.length === 0 || values.every(v => v === 0);
    };

    // Helper to render PREMIUM empty state in chart container
    const renderEmptyState = (containerId, title, iconClass = 'fa-chart-bar') => {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = `
            <div class="h-full w-full flex flex-col items-center justify-center p-6 animate-fade-in">
                <div class="w-16 h-16 rounded-3xl bg-surface-container/20 border border-panel-border/40 flex items-center justify-center mb-4 relative">
                    <div class="absolute inset-0 bg-primary/5 blur-xl rounded-full"></div>
                    <i class="fas ${iconClass} text-2xl text-label/20 relative z-10"></i>
                </div>
                <h4 class="text-[10px] font-black text-label/40 uppercase tracking-[0.2em] mb-1">Métrica: ${title}</h4>
                <p class="text-[9px] text-label/20 font-bold uppercase tracking-widest text-center max-w-[200px] leading-relaxed">
                    Aún no hay registros suficientes para proyectar tendencias tácticas.
                </p>
                <div class="mt-4 px-3 py-1 rounded-full border border-primary/10 bg-primary/5">
                    <span class="text-[8px] font-black text-primary uppercase tracking-widest">Esperando Telemetría</span>
                </div>
            </div>
        `;
    };

    // === COMMON CHART OPTIONS (NEXUS STANDARD) ===
    const baseOptions = {
        chart: {
            toolbar: { show: false },
            zoom: { enabled: false },
            fontFamily: "'Inter', sans-serif",
            background: 'transparent',
            animations: { enabled: true, easing: 'easeinout', speed: 800 }
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        grid: {
            borderColor: 'rgba(148, 163, 184, 0.08)',
            strokeDashArray: 4,
            padding: { top: 10, right: 10, bottom: 0, left: 10 },
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } }
        },
        xaxis: {
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                style: { colors: 'rgba(148, 163, 184, 0.4)', fontSize: '10px', fontWeight: 800 }
            }
        },
        yaxis: {
            labels: {
                style: { colors: 'rgba(148, 163, 184, 0.4)', fontSize: '10px', fontWeight: 800 }
            }
        },
        tooltip: {
            theme: 'dark',
            x: { show: true },
            y: { title: { formatter: (name) => name + ':' } }
        },
        legend: { show: false }
    };

    // 1. Usuarios por Plataforma
    const up_l = data.charts?.usersPlatform?.labels || [];
    const up_v = data.charts?.usersPlatform?.values || [];
    if (isDataEmpty(up_l, up_v)) {
        renderEmptyState('usersPlatformChart', 'Distribución Access', 'fa-layer-group');
    } else {
        new ApexCharts(document.querySelector("#usersPlatformChart"), {
            ...baseOptions,
            series: [{ name: 'Usuarios', data: up_v }],
            chart: { ...baseOptions.chart, type: 'bar', height: 220 },
            plotOptions: { bar: { borderRadius: 6, columnWidth: '45%', distributed: true } },
            colors: [accentColor, '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'],
            xaxis: { ...baseOptions.xaxis, categories: up_l }
        }).render();
    }

    // 2. Usuarios por Área
    const ua_l = data.charts?.usersArea?.labels || [];
    const ua_v = data.charts?.usersArea?.values || [];
    if (isDataEmpty(ua_l, ua_v)) {
        renderEmptyState('usersAreaBarChart', 'Saturación por Área', 'fa-network-wired');
    } else {
        new ApexCharts(document.querySelector("#usersAreaBarChart"), {
            ...baseOptions,
            series: [{ name: 'Usuarios', data: ua_v }],
            chart: { ...baseOptions.chart, type: 'bar', height: 220 },
            plotOptions: { bar: { borderRadius: 6, horizontal: true, barHeight: '50%' } },
            colors: ['#8b5cf6'],
            xaxis: { ...baseOptions.xaxis, categories: ua_l }
        }).render();
    }

    // 3. Solicitudes Pendientes
    const pr_l = data.charts?.pendingRequests?.labels || [];
    const pr_v = data.charts?.pendingRequests?.values || [];
    if (isDataEmpty(pr_l, pr_v)) {
        renderEmptyState('pendingRequestsChart', 'Carga de Trabajo', 'fa-hourglass-half');
    } else {
        new ApexCharts(document.querySelector("#pendingRequestsChart"), {
            ...baseOptions,
            series: [{ name: 'Pendientes', data: pr_v }],
            chart: { ...baseOptions.chart, type: 'area', height: 220 },
            fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 90, 100] } },
            colors: ['#f59e0b'],
            xaxis: { ...baseOptions.xaxis, categories: pr_l },
            stroke: { curve: 'stepline', width: 3 }
        }).render();
    }

    // 4. Plataformas Más Visitadas
    const mv_l = data.charts?.mostVisited?.labels || [];
    const mv_v = data.charts?.mostVisited?.values || [];
    if (isDataEmpty(mv_l, mv_v)) {
        renderEmptyState('mostVisitedChart', 'Popularidad Catálogo', 'fa-fire');
    } else {
        new ApexCharts(document.querySelector("#mostVisitedChart"), {
            ...baseOptions,
            series: [{ name: 'Visitas', data: mv_v }],
            chart: { ...baseOptions.chart, type: 'line', height: 220 },
            colors: ['#3b82f6'],
            stroke: { curve: 'smooth', width: 5 },
            xaxis: { ...baseOptions.xaxis, categories: mv_l },
            markers: { size: 6, strokeColors: '#3b82f6', strokeWidth: 3, hover: { size: 8 } }
        }).render();
    }
});
