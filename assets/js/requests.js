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
        const statusClass = r.status === 'Pendiente' ? 'badge-warning' : (r.status === 'Aprobado' ? 'badge-success' : 'badge-danger');

        const tr = document.createElement('tr');
        tr.className = "animate-in fade-in duration-300";
        tr.innerHTML = `
            <td class="col-cb">
                <input type="checkbox" data-id="${r.id}" class="row-checkbox checkbox-compact ${!isPending ? 'opacity-0 pointer-events-none' : ''}" 
                    ${!isPending ? 'disabled' : ''} 
                    ${selectedRequests.includes(r.id) ? 'checked' : ''}
                    onchange="toggleSelection(${r.id}, this.checked)">
            </td>
            <td>
                <div>
                    <span class="request-user-primary">${r.user_name}</span>
                    <div class="request-user-secondary">${r.user_email}</div>
                </div>
            </td>
            <td class="text-center">
                <span class="request-type-pill">Regular</span>
            </td>
            <td>
                <div>
                    <span class="request-platform-primary">${r.platform_name}</span>
                    <div class="request-platform-secondary">Servicio</div>
                </div>
            </td>
            <td class="text-center request-date-cell">${r.created_at}</td>
            <td class="text-center request-date-cell">${r.processed_at}</td>
            <td class="text-center">
                <span class="badge ${statusClass}">
                    <span class="status-dot"></span> ${r.status.toUpperCase()}
                </span>
            </td>
            <td class="text-right pr-5">
                <div class="flex items-center justify-end gap-2">
                    ${isPending ? `
                    <button onclick="quickAction(${r.id}, 'approve')" class="btn-action-small approve" title="Aprobar">
                        <i class="fas fa-check"></i>
                    </button>
                    <button onclick="quickAction(${r.id}, 'reject')" class="btn-action-small reject" title="Denegar">
                        <i class="fas fa-times"></i>
                    </button>
                    ` : `
                    <span class="text-[10px] font-black text-label/10 uppercase italic tracking-widest">---</span>
                    `}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
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
        tr.className = 'ghost-row pointer-events-none select-none opacity-20';
        tr.innerHTML = `<td></td>`.repeat(columns);
        tbody.appendChild(tr);
    }
}

function renderPagination() {
    const container = document.getElementById('requestsPagination');
    if (!container) return;
    
    const rowsPerPage = getPageLength();
    const totalPages = Math.ceil(filteredRequests.length / rowsPerPage);
    const startCount = filteredRequests.length ? (currentPage - 1) * rowsPerPage + 1 : 0;
    const endCount = Math.min(filteredRequests.length, currentPage * rowsPerPage);

    container.innerHTML = `
        <div class="request-pagination-layout">
            <div class="request-pagination-summary">
                Mostrando <strong>${startCount}-${endCount}</strong> de <strong>${filteredRequests.length}</strong> registros
            </div>
            <div class="request-pagination-controls">
                <button type="button" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''} class="page-btn-modern">
                    <i class="fas fa-chevron-left text-[10px]"></i> Anterior
                </button>
                <div class="request-pagination-pill">
                    Página <strong class="current">${currentPage}</strong> de <strong>${totalPages || 1}</strong>
                </div>
                <button type="button" onclick="changePage(1)" ${currentPage >= totalPages ? 'disabled' : ''} class="page-btn-modern">
                    Siguiente <i class="fas fa-chevron-right text-[10px]"></i>
                </button>
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
