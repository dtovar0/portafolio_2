// Requests Management Module - Nexus Premium
let currentRequests = [...REQUESTS_DATA];
let filteredRequests = [...REQUESTS_DATA];
let selectedRequests = [];

document.addEventListener('DOMContentLoaded', () => {
    renderRequestsTable();
    initCharts();

    // Global Search
    document.getElementById('requestSearch')?.addEventListener('input', () => {
        applyFiltersFromUI();
    });

    // Select All
    document.getElementById('selectAll')?.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.request-cb');
        checkboxes.forEach(cb => {
            if (!cb.disabled) {
                cb.checked = e.target.checked;
                toggleSelection(parseInt(cb.dataset.id), e.target.checked);
            }
        });
    });
});

function applyFilters(searchTerm = '', status = 'all') {
    filteredRequests = currentRequests.filter(r => {
        const matchesSearch = r.user_name.toLowerCase().includes(searchTerm) || 
                              r.user_email.toLowerCase().includes(searchTerm) ||
                              r.platform_name.toLowerCase().includes(searchTerm);
        
        let matchesStatus = true;
        if (status === 'rejected') {
            matchesStatus = r.status === 'Rechazado' || r.status === 'Denegado';
        } else if (status !== 'all') {
            matchesStatus = r.status === status;
        }
        
        return matchesSearch && matchesStatus;
    });
    
    currentPage = 1;
    renderRequestsTable();
}

function filterByStatus(status) {
    const selector = document.getElementById('statusFilter');
    if (selector) selector.value = status;
    
    const searchTerm = document.getElementById('requestSearch')?.value.toLowerCase() || '';
    applyFilters(searchTerm, status);
    
    // Switch Views
    document.getElementById('dashboardView')?.classList.add('hidden');
    document.getElementById('dashboardView')?.classList.remove('flex');
    document.getElementById('tableView')?.classList.remove('hidden');
    document.getElementById('tableView')?.classList.add('flex');
}

function showDashboard() {
    document.getElementById('tableView')?.classList.add('hidden');
    document.getElementById('tableView')?.classList.remove('flex');
    document.getElementById('dashboardView')?.classList.remove('hidden');
    document.getElementById('dashboardView')?.classList.add('flex');
}

function applyFiltersFromUI() {
    const status = document.getElementById('statusFilter')?.value || 'all';
    const searchTerm = document.getElementById('requestSearch')?.value.toLowerCase() || '';
    applyFilters(searchTerm, status);
}

let currentPage = 1;

/**
 * Returns optimal pageLength based on viewport height.
 */
function getPageLength() {
    const h = window.innerHeight;
    if (h < 900) return 9;
    return 10;
}

function renderRequestsTable() {
    const tbody = document.getElementById('requestsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const recordsPerPage = getPageLength();
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const pageData = filteredRequests.slice(start, end);

    pageData.forEach(r => {
        const isPending = r.status === 'Pendiente';
        const statusBadge = {
            'Pendiente': 'nx-badge-warning',
            'Aprobado': 'nx-badge-success',
            'Rechazado': 'nx-badge-error',
            'Denegado': 'nx-badge-error'
        }[r.status] || 'bg-label/10 text-label/40';

        tbody.innerHTML += `
            <tr class="group hover:bg-primary/5 transition-all border-b border-panel-border/30 last:border-none h-16">
                <td class="text-center" style="border-left:3px solid transparent;padding-left:0.5rem;">
                    <div class="flex items-center justify-center">
                        <input type="checkbox" data-id="${r.id}" class="request-cb w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary ${!isPending ? 'opacity-0 pointer-events-none' : ''}" 
                            ${!isPending ? 'disabled' : ''} 
                            ${selectedRequests.includes(r.id) ? 'checked' : ''}
                            onchange="toggleSelection(${r.id}, this.checked)">
                    </div>
                </td>
                <td>
                    <div class="flex flex-col justify-center">
                        <p class="text-xs font-black text-label uppercase tracking-tight leading-none">${r.user_name}</p>
                        <p class="text-[10px] font-bold text-label/30 italic mt-1 leading-none">${r.user_email}</p>
                    </div>
                </td>
                <td class="text-center">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-surface-container border border-panel-border text-label/40">Regular</span>
                </td>
                <td>
                    <span class="text-[11px] font-black text-primary uppercase tracking-tight">${r.platform_name}</span>
                </td>
                <td class="text-center">
                     <p class="text-[10px] font-bold text-label/40 tabular-nums uppercase leading-none">${r.created_at}</p>
                </td>
                <td class="text-center">
                     <p class="text-[10px] font-bold text-label/20 tabular-nums uppercase leading-none">${r.processed_at}</p>
                </td>
                <td class="text-center">
                    <div class="flex items-center justify-center">
                        <span class="nx-badge ${statusBadge}">${r.status.toUpperCase()}</span>
                    </div>
                </td>
                <td class="text-right pr-5">
                    <div class="flex items-center justify-end gap-2 pr-2">
                        ${isPending ? `
                        <button onclick="quickAction(${r.id}, 'approve')" class="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="Aprobar Solicitud">
                            <i class="fas fa-check text-[10px]"></i>
                        </button>
                        <button onclick="quickAction(${r.id}, 'reject')" class="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-sm" title="Denegar Solicitud">
                            <i class="fas fa-times text-[10px]"></i>
                        </button>
                        ` : `
                        <span class="text-[10px] font-black text-label/10 uppercase italic tracking-widest">---</span>
                        `}
                    </div>
                </td>
            </tr>
        `;
    });

    renderGhostRows(8);
    renderPagination();
}

function renderGhostRows(columns) {
    const tbody = document.getElementById('requestsTableBody');
    const recordsPerPage = getPageLength();
    const currentRows = tbody.children.length;
    const ghostCount = recordsPerPage - currentRows;

    if (ghostCount <= 0) return;

    for (let i = 0; i < ghostCount; i++) {
        const tr = document.createElement('tr');
        tr.className = 'ghost-row pointer-events-none select-none';
        tr.innerHTML = `
            <td style="border-left:3px solid transparent;"></td>
            ${'<td></td>'.repeat(columns - 1)}
        `;
        tbody.appendChild(tr);
    }
}

function renderPagination() {
    const container = document.getElementById('requestsPagination');
    if (!container) return;
    
    const rowsPerPage = getPageLength();
    const totalPages = Math.ceil(filteredRequests.length / rowsPerPage);
    const start = filteredRequests.length ? (currentPage - 1) * rowsPerPage + 1 : 0;
    const end = Math.min(filteredRequests.length, currentPage * rowsPerPage);

    container.innerHTML = `
        <div class="dt-layout-row" style="display: flex !important; align-items: center; justify-content: space-between; height: 52px !important; padding: 0 1.25rem !important; border-top: 1px solid rgb(var(--color-panel-border) / 0.4) !important;">
            <div class="dt-layout-cell dt-layout-start">
                <div class="dt-info" style="font-size: 13px !important; font-weight: 800 !important; color: rgb(var(--color-text-body)) !important; text-transform: none !important; letter-spacing: normal !important;">
                    Mostrando ${start}-${end} de ${filteredRequests.length} registros
                </div>
            </div>
            <div class="dt-layout-cell dt-layout-end">
                <div class="dt-paging paging_simple">
                    <button class="dt-paging-button previous ${currentPage === 1 ? 'disabled' : ''}" 
                        onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <button class="dt-paging-button next ${currentPage >= totalPages ? 'disabled' : ''}" 
                        onclick="changePage(1)" ${currentPage >= totalPages ? 'disabled' : ''}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function changePage(offset) {
    const rowsPerPage = getPageLength();
    const totalPages = Math.ceil(filteredRequests.length / rowsPerPage);
    const newPage = currentPage + offset;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderRequestsTable();
    }
}

function toggleSelection(id, checked) {
    if (checked) {
        if (!selectedRequests.includes(id)) selectedRequests.push(id);
    } else {
        selectedRequests = selectedRequests.filter(x => x !== id);
    }
    
    const bulkBar = document.getElementById('bulkActions');
    if (selectedRequests.length > 0) {
        bulkBar.classList.remove('hidden');
        bulkBar.classList.add('flex');
    } else {
        bulkBar.classList.add('hidden');
        bulkBar.classList.remove('flex');
    }
}

async function quickAction(id, action) {
    processRequests([id], action);
}

async function processSelected(action) {
    if (selectedRequests.length === 0) return;
    const confirmMsg = action === 'approve' ? '¿Aprobar todas las solicitudes seleccionadas?' : '¿Rechazar todas las solicitudes seleccionadas?';
    if (!confirm(confirmMsg)) return;
    
    processRequests(selectedRequests, action);
}

async function processRequests(ids, action) {
    showToast('Procesando...', 'info');
    try {
        const res = await fetch('/admin/requests/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, action })
        });
        const result = await res.json();
        
        if (result.status === 'success') {
            showToast(result.message, 'success');
            setTimeout(() => location.reload(), 800);
        } else {
            showToast(result.message, 'error');
        }
    } catch (e) {
        showToast('Error de conexión', 'error');
    }
}

function initCharts() {
    // 1. Status Doughnut
    const statusDiv = document.getElementById('statusChart');
    if (statusDiv) {
        statusDiv.innerHTML = '';
        const optionsStatus = {
            series: [COUNTS_DATA.pending, COUNTS_DATA.approved, COUNTS_DATA.rejected],
            chart: {
                type: 'donut',
                height: 280,
                fontFamily: 'Inter, sans-serif',
                background: 'transparent'
            },
            labels: ['Pendientes', 'Aprobadas', 'Rechazadas'],
            colors: ['#f59e0b', '#10b981', '#ef4444'],
            plotOptions: {
                pie: {
                    donut: { size: '75%' }
                }
            },
            dataLabels: { enabled: false },
            stroke: { width: 0 },
            legend: {
                position: 'bottom',
                markers: { radius: 12 },
                itemMargin: { horizontal: 10, vertical: 5 },
                labels: { colors: 'rgb(var(--color-label))' }
            },
            theme: {
                mode: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
            }
        };
        new ApexCharts(statusDiv, optionsStatus).render();
    }

    // 2. Platform Ranking Bar
    const platformCounts = {};
    currentRequests.forEach(r => {
        platformCounts[r.platform_name] = (platformCounts[r.platform_name] || 0) + 1;
    });

    const sortedPlatforms = Object.entries(platformCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const platformDiv = document.getElementById('platformChart');
    if (platformDiv) {
        platformDiv.innerHTML = '';
        const optionsPlatform = {
            series: [{
                name: 'Solicitudes',
                data: sortedPlatforms.map(p => p[1])
            }],
            chart: {
                type: 'bar',
                height: 250,
                toolbar: { show: false },
                fontFamily: 'Inter, sans-serif',
                background: 'transparent'
            },
            colors: ['#6366f1'],
            plotOptions: {
                bar: {
                    borderRadius: 6,
                    columnWidth: '40%',
                    distributed: false
                }
            },
            dataLabels: { enabled: false },
            xaxis: {
                categories: sortedPlatforms.map(p => p[0]),
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: 'rgb(var(--color-label) / 0.5)', fontWeight: 600 } }
            },
            yaxis: {
                labels: { style: { colors: 'rgb(var(--color-label) / 0.5)', fontWeight: 600 } }
            },
            grid: {
                borderColor: 'rgb(var(--color-panel-border) / 0.5)',
                strokeDashArray: 4,
                yaxis: { lines: { show: true } }
            },
            theme: {
                mode: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
            }
        };
        new ApexCharts(platformDiv, optionsPlatform).render();
    }
}
