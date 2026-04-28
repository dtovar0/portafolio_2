let requestsDataTable;
let selectedRequests = [];

$(document).ready(function() {
    initRequestsDataTable();
    initCharts();

    // Universal Search Integration
    $('#requestSearch').on('input', function() {
        if (requestsDataTable) requestsDataTable.search(this.value).draw();
    });

    // Select All Integration
    $('#tableView').on('change', '#selectAll', function() {
        const checked = $(this).prop('checked');
        $('.row-checkbox:not(:disabled)').prop('checked', checked);
        updateSelectionStatus();
    });

    // Row Checkbox Integration (using delegation)
    $('#requestsDT').on('change', '.row-checkbox', function() {
        updateSelectionStatus();
    });
});

function updateSelectionStatus() {
    selectedRequests = [];
    $('.row-checkbox:checked').each(function() {
        selectedRequests.push(parseInt($(this).data('id')));
    });

    const count = selectedRequests.length;
    // Table Buttons
    $('#bulkBtnApprove').prop('disabled', count === 0);
    $('#bulkBtnReject').prop('disabled', count === 0);
    // Dashboard Buttons
    $('#bulkBtnApproveDash').prop('disabled', count === 0);
    $('#bulkBtnRejectDash').prop('disabled', count === 0);
}

/**
 * ADAPTIVE TABLE ENGINE (Audit Clone 1:1)
 */
function getPageLength() {
    const h = window.innerHeight;
    return h < 900 ? 9 : 10;
}

function initRequestsDataTable() {
    requestsDataTable = $('#requestsDT').DataTable({
        data: REQUESTS_DATA,
        columns: [
            { 
                data: 'id', 
                render: (data, type, row) => {
                    const isPending = row.status === 'Pendiente';
                    return `<div class="flex items-center justify-center p-1">
                        <input type="checkbox" data-id="${data}" class="row-checkbox w-4 h-4 rounded border-2 border-primary/30 text-primary ${!isPending ? 'opacity-20 grayscale pointer-events-none' : ''}" ${!isPending ? 'disabled' : ''}>
                    </div>`;
                }
            },
            { 
                data: 'user_name',
                render: (data, type, row) => `
                    <div class="flex flex-col">
                        <span class="font-black text-label leading-none mb-1">${data}</span>
                        <span class="text-[9px] font-bold text-label/40 uppercase tracking-tighter">${row.user_email}</span>
                    </div>`
            },
            { 
                data: 'platform_name',
                render: (data, type, row) => `
                    <div class="flex flex-col">
                        <span class="font-black text-primary leading-none mb-1 uppercase tracking-tighter">${data}</span>
                        <span class="text-[9px] font-bold text-label/30 uppercase tracking-widest italic">${row.area_name}</span>
                    </div>`
            },
            { 
                data: 'status', 
                render: (data) => {
                    const status = String(data).toLowerCase();
                    let cls = 'nx-badge-primary';
                    if (status.includes('aprobado')) cls = 'nx-badge-success text-emerald-500';
                    else if (status.includes('pendiente')) cls = 'nx-badge-warning text-amber-500';
                    else cls = 'nx-badge-error text-rose-500';
                    return `<div class="flex items-center justify-center h-full"><span class="nx-badge ${cls} text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">${data}</span></div>`;
                }
            },
            { 
                data: 'created_at',
                render: (data) => `<div class="text-[11px] font-bold text-label/50 text-center flex items-center justify-center h-full">${data}</div>`
            }
        ],
        autoWidth: false,
        pageLength: getPageLength(),
        pagingType: 'simple',
        order: [[4, 'desc']],
        layout: { topStart: null, topEnd: null, bottomStart: 'info', bottomEnd: 'paging' },
        language: {
            info: "Mostrando _START_-_END_ de _TOTAL_",
            paginate: {
                previous: '<i class="fas fa-chevron-left"></i>',
                next: '<i class="fas fa-chevron-right"></i>'
            }
        },
        drawCallback: function(settings) {
            renderGhostRows(settings, 5);
        }
    });

    // Alias for global search in top bar if needed
    window.activeNexusTable = requestsDataTable;
}

function renderGhostRows(settings, columns) {
    const api = new $.fn.dataTable.Api(settings);
    const tbody = $(settings.nTBody);
    const pageLen = api.page.len();
    const info = api.page.info();

    tbody.find('.ghost-row').remove();
    const container = api.table().container();
    const gridH = $(container).height();
    const rowH = gridH > 0 ? Math.max(45, Math.floor((gridH - 65) / (pageLen + 1))) : 50;
    $(container).css('--row-h', rowH + 'px');

    const ghostCount = pageLen - (info.end - info.start);
    if (ghostCount <= 0) return;

    let ghostHtml = '';
    for (let i = 0; i < ghostCount; i++) {
        ghostHtml += `<tr class="ghost-row pointer-events-none select-none opacity-5">${'<td></td>'.repeat(columns)}</tr>`;
    }
    tbody.append(ghostHtml);
}

function filterByStatus(status) {
    if (!requestsDataTable) return;
    if (status === 'all') requestsDataTable.search('').columns().search('').draw();
    else if (status === 'rejected') requestsDataTable.column(3).search('Denegado|Rechazado', true, false).draw();
    else requestsDataTable.column(3).search(status).draw();
    
    // Switch View
    $('#dashboardView').addClass('hidden').removeClass('flex');
    $('#tableView').removeClass('hidden').addClass('flex');
}

function showDashboard() {
    $('#tableView').addClass('hidden').removeClass('flex');
    $('#dashboardView').removeClass('hidden').addClass('flex');
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
    // Current Chart Logic (ApexCharts)
    const statusDiv = document.getElementById('statusChart');
    if (statusDiv) {
        statusDiv.innerHTML = '';
        new ApexCharts(statusDiv, {
            series: [COUNTS_DATA.pending, COUNTS_DATA.approved, COUNTS_DATA.rejected],
            chart: { type: 'donut', height: 320, fontFamily: 'Inter', background: 'transparent' },
            labels: ['Pendientes', 'Aprobadas', 'Rechazadas'],
            colors: ['#f59e0b', '#10b981', '#ef4444'],
            plotOptions: { pie: { donut: { size: '75%' } } },
            dataLabels: { enabled: false },
            stroke: { width: 0 },
            legend: { position: 'bottom', labels: { colors: 'rgb(var(--color-label))' } }
        }).render();
    }

    const platformDiv = document.getElementById('platformChart');
    if (platformDiv) {
        platformDiv.innerHTML = '';
        const counts = {};
        REQUESTS_DATA.forEach(r => counts[r.platform_name] = (counts[r.platform_name] || 0) + 1);
        const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 5);

        new ApexCharts(platformDiv, {
            series: [{ name: 'Solicitudes', data: sorted.map(p => p[1]) }],
            chart: { type: 'bar', height: 320, toolbar: { show: false }, fontFamily: 'Inter' },
            colors: ['#6366f1'],
            plotOptions: { bar: { borderRadius: 8, columnWidth: '40%' } },
            xaxis: { categories: sorted.map(p => p[0]), labels: { style: { colors: 'rgba(148, 163, 184, 0.4)' } } },
            yaxis: { labels: { style: { colors: 'rgba(148, 163, 184, 0.4)' } } },
            grid: { borderColor: 'rgba(148, 163, 184, 0.05)', strokeDashArray: 4 }
        }).render();
    }
}
