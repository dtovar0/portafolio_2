// Platforms Management Module - Nexus Premium
let currentPlatforms = [...PLATFORMS_DATA];
let filteredPlatforms = [...PLATFORMS_DATA];
let selectedPlatforms = [];
let currentPage = 1;

function getPageLength() {
    const h = window.innerHeight;
    return h < 900 ? 9 : 10;
}

document.addEventListener('DOMContentLoaded', () => {
    initTable();
    initFilters();
    initForm();
    renderAreaGrid(); 
});

function initTable() {
    renderPlatforms();
    
    document.getElementById('selectAll')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            selectedPlatforms = filteredPlatforms.map(p => p.id);
        } else {
            selectedPlatforms = [];
        }
        renderPlatforms();
    });
}

function initFilters() {
    const search = document.getElementById('platformSearch');

    const apply = () => {
        const term = search.value.toLowerCase();
        const areaId = window.currentDrilldownAreaId || 'all';

        filteredPlatforms = currentPlatforms.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(term) || 
                                  (p.description && p.description.toLowerCase().includes(term));
            const matchesArea = areaId === 'all' || p.area_id == areaId;
            return matchesSearch && matchesArea;
        });
        currentPage = 1;
        selectedPlatforms = [];
        renderPlatforms();
    };

    search?.addEventListener('input', apply);
}

function togglePlatformSelection(id, checked) {
    if (checked) {
        if (!selectedPlatforms.includes(id)) selectedPlatforms.push(id);
    } else {
        selectedPlatforms = selectedPlatforms.filter(pId => pId !== id);
    }
    renderPlatforms();
}

function renderPlatforms() {
    const tbody = document.getElementById('platformsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const recordsPerPage = getPageLength();
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const pageData = filteredPlatforms.slice(start, end);

    pageData.forEach(p => {
        const isSelected = selectedPlatforms.includes(p.id);
        const isActive = p.status === 'Activo' || p.status === 'activo' || p.status === true;

        tbody.innerHTML += `
            <tr class="group hover:bg-primary/5 transition-all cursor-pointer border-b border-panel-border/30 last:border-none ${isSelected ? 'bg-primary/5' : ''}" onclick="togglePlatformSelection(${p.id}, ${!isSelected})">
                <td class="text-center" style="border-left:3px solid ${isSelected ? 'rgb(var(--color-primary))' : 'transparent'};padding:0 0.5rem;" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-center">
                        <input type="checkbox" class="platform-cb w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" 
                            ${isSelected ? 'checked' : ''} onchange="togglePlatformSelection(${p.id}, this.checked)">
                    </div>
                </td>
                <td class="text-center">
                    <div class="flex items-center justify-center">
                        <div class="w-10 h-10 rounded-xl bg-surface border border-panel-border flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                            <i class="fas fa-${p.icon || 'box'} text-lg"></i>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="text-xs font-black text-label uppercase tracking-tight">${p.name}</span>
                    <p class="text-[9px] font-bold text-label/20 italic truncate max-w-[200px] mt-0.5">${p.direct_link || 'Sin enlace'}</p>
                </td>
                <td>
                    <div class="text-[11px] font-bold text-label/50 truncate max-w-[280px]" title="${p.description || ''}">
                        ${p.description || '-'}
                    </div>
                </td>
                <td class="text-center">
                    <div class="flex items-center justify-center gap-1">
                        <span class="text-[11px] font-black text-label/80">${p.users_count || 0}</span>
                        <i class="fas fa-users text-[10px] text-label/20"></i>
                    </div>
                </td>
                <td class="text-center">
                    <div class="flex items-center justify-center">
                        <span class="nx-badge ${isActive ? 'nx-badge-success' : 'nx-badge-error'}">${isActive ? 'ACTIVO' : 'INACTIVO'}</span>
                    </div>
                </td>
            </tr>
        `;
    });

    renderGhostRows(6);
    renderPagination();
    updateActionButtonsPlatforms();
}

/**
 * Standard Ghost Row Logic (Ref: Users/Audit)
 */
function renderGhostRows(columns) {
    const tbody = document.getElementById('platformsTableBody');
    if (!tbody) return;
    
    const pageLen = getPageLength();
    const realRows = tbody.children.length;
    const ghostCount = pageLen - realRows;
    
    if (ghostCount <= 0) return;

    for (let i = 0; i < ghostCount; i++) {
        const tr = document.createElement('tr');
        tr.className = "ghost-row pointer-events-none select-none border-b border-panel-border/10";
        tr.style.height = "var(--row-h, 60px)";
        tr.innerHTML = `<td><div style="border-left:3px solid transparent;"></div></td>${Array(columns - 1).fill('<td><div></div></td>').join('')}`;
        tbody.appendChild(tr);
    }
}

/**
 * Standard DataTables-Style Pagination Logic (Ref: Audit/Users)
 */
function renderPagination() {
    const container = document.getElementById('platformsPagination');
    if (!container) return;
    
    const rowsPerPage = getPageLength();
    const totalPages = Math.ceil(filteredPlatforms.length / rowsPerPage);
    const start = filteredPlatforms.length ? (currentPage - 1) * rowsPerPage + 1 : 0;
    const end = Math.min(filteredPlatforms.length, currentPage * rowsPerPage);

    container.innerHTML = `
        <div class="dt-layout-row" style="display: flex !important; align-items: center; justify-content: space-between; height: 52px !important; padding: 0 1.25rem !important; border-top: 1px solid rgb(var(--color-panel-border) / 0.4) !important;">
            <div class="dt-layout-cell dt-layout-start">
                <div class="dt-info" style="font-size: 13px !important; font-weight: 800 !important; color: rgb(var(--color-text-body)) !important; text-transform: none !important; letter-spacing: normal !important;">
                    Mostrando ${start}-${end} de ${filteredPlatforms.length} registros
                </div>
            </div>
            <div class="dt-layout-cell dt-layout-end">
                <div class="dt-paging paging_simple">
                    <button class="dt-paging-button previous ${currentPage === 1 ? 'disabled' : ''}" 
                        onclick="changePage(currentPage - 1)" ${currentPage === 1 ? 'disabled' : ''}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <button class="dt-paging-button next ${currentPage >= totalPages || totalPages === 0 ? 'disabled' : ''}" 
                        onclick="changePage(currentPage + 1)" ${currentPage >= totalPages || totalPages === 0 ? 'disabled' : ''}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function changePage(page) {
    const rowsPerPage = getPageLength();
    const totalPages = Math.ceil(filteredPlatforms.length / rowsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderPlatforms();
    }
}

function updateActionButtonsPlatforms() {
    const btnEdit = document.getElementById('btnEditPlatform');
    const btnDelete = document.getElementById('btnDeletePlatform');
    
    if (btnEdit) btnEdit.disabled = selectedPlatforms.length !== 1;
    if (btnDelete) btnDelete.disabled = selectedPlatforms.length === 0;
}

// ========== DRILL-DOWN LOGIC (Grid -> Table) ==========

function renderAreaGrid() {
    const grid = document.getElementById('areaGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    AREAS_DATA.forEach(area => {
        const pCount = PLATFORMS_DATA.filter(p => p.area_id == area.id).length;
        
        grid.innerHTML += `
            <div onclick="openAreaPlatforms(${area.id}, '${area.name}')" class="group p-6 bg-surface-container border border-surface-container-border rounded-3xl cursor-pointer hover:border-primary/50 transition-all hover:-translate-y-1 relative overflow-hidden shadow-xl" style="min-height: 140px;">
                <div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div class="relative z-10">
                    <div class="w-12 h-12 rounded-xl bg-surface border border-panel-border flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform shadow-sm">
                        <i class="fas fa-${area.icon || 'sitemap'} text-xl"></i>
                    </div>
                    <h3 class="text-xs font-black text-label uppercase tracking-widest leading-tight">${area.name}</h3>
                    <p class="text-[9px] font-bold text-label/40 tracking-[0.2em] mt-1">${pCount} PLATAFORMAS</p>
                </div>
                <div class="absolute bottom-4 right-4 group-hover:translate-x-1 transition-transform">
                    <i class="fas fa-arrow-right text-label/20 group-hover:text-primary text-[10px]"></i>
                </div>
            </div>
        `;
    });
}

function generatePaginationPills(totalPages) {
    // Deprecated for simple pagination parity
    return '';
}

window.currentDrilldownAreaId = 'all';

function openAreaPlatforms(areaId, areaName) {
    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('tableView').classList.remove('hidden');
    document.getElementById('tableView').classList.add('flex');
    
    document.getElementById('tableAreaTitle').textContent = areaName;
    window.currentDrilldownAreaId = areaId;
    
    // Auto-select area in modal
    const mArea = document.getElementById('modalAreaSelect');
    if(mArea) mArea.value = areaId;
    
    // Reset search
    document.getElementById('platformSearch').value = '';
    
    // Trigger Filtering
    filteredPlatforms = currentPlatforms.filter(p => p.area_id == areaId);
    currentPage = 1;
    selectedPlatforms = [];
    renderPlatforms();
}

function showDashboard() {
    document.getElementById('tableView').classList.add('hidden');
    document.getElementById('tableView').classList.remove('flex');
    document.getElementById('dashboardView').classList.remove('hidden');
    window.currentDrilldownAreaId = 'all';
}

// ========== SIMPLE MODAL LOGIC ==========

function openCreateModal() {
    openModal('platformModal');
    const form = document.getElementById('platformForm');
    form.reset();
    document.getElementById('platformId').value = '';
    document.getElementById('modalTitle').textContent = 'Nueva Plataforma';
    
    if (window.currentDrilldownAreaId !== 'all') {
        const mArea = document.getElementById('modalAreaSelect');
        if(mArea) mArea.value = window.currentDrilldownAreaId;
    }
}

function closePlatformModal() {
    closeModal('platformModal');
}

function initForm() {
    document.getElementById('platformForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        savePlatform();
    });

    document.getElementById('btnEditPlatform')?.addEventListener('click', () => {
        if (selectedPlatforms.length === 1) {
            editPlatform(selectedPlatforms[0]);
        }
    });
}

function editPlatform(id) {
    const p = currentPlatforms.find(x => x.id == id);
    if (!p) return;

    openModal('platformModal');
    
    document.getElementById('platformId').value = p.id;
    document.getElementById('modalTitle').textContent = 'Editar Plataforma';
    
    const form = document.getElementById('platformForm');
    form.name.value = p.name;
    form.area_id.value = p.area_id;
    form.direct_link.value = p.direct_link || '';
    form.description.value = p.description || '';
    form.status.value = p.status || 'Activo';
}

// Removed local showToastMsg to use global showToast

async function savePlatform() {
    const form = document.getElementById('platformForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.user_ids = []; 
    
    const id = document.getElementById('platformId').value;
    const method = id ? 'PUT' : 'POST';
    const url = id ? '/admin/platforms/edit/' + id : '/admin/platforms/add';

    showToast('Guardando...', 'info');
    
    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if (result.status === 'success') {
            showToast(result.message, 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast(result.message, 'error');
        }
    } catch (e) {
        showToast('Error al conectar con servidor', 'error');
    }
}

async function deleteSelected() {
    const ids = selectedPlatforms;
    if (ids.length === 0) return;
    
    Swal.fire({
        title: 'Confirmar Eliminación',
        text: `¿Seguro que deseas eliminar ${ids.length} plataforma(s)? Esta acción es irreversible.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#334155',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: 'var(--color-body-bg)',
        color: 'var(--color-body-text)'
    }).then(async (result) => {
        if (result.isConfirmed) {
            showToast('Eliminando...', 'info');
            try {
                const res = await fetch('/admin/platforms/delete-bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids })
                });
                const response = await res.json();
                if (response.status === 'success') {
                    showToast(response.message, 'success');
                    setTimeout(() => location.reload(), 800);
                }
            } catch (e) {
                showToast('Error crítico en el servidor', 'error');
            }
        }
    });
}
