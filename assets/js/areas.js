// Areas Management Module - Nexus Premium
let currentAreas = [...AREAS_DATA];
let filteredAreas = [...AREAS_DATA];
let selectedAreas = [];
let currentPage = 1;

function getPageLength() {
    const h = window.innerHeight;
    return h < 900 ? 9 : 10;
}

document.addEventListener('DOMContentLoaded', () => {
    initAreasModule();
});

function initAreasModule() {
    renderAreasTable();

    // Buscar
    document.getElementById('areaSearch')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        filteredAreas = currentAreas.filter(a => 
            a.name.toLowerCase().includes(term) || 
            (a.description && a.description.toLowerCase().includes(term))
        );
        currentPage = 1;
        selectedAreas = [];
        renderAreasTable();
    });

    // Checkbox Mestro
    document.getElementById('selectAllAreas')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            selectedAreas = filteredAreas.map(a => a.id);
        } else {
            selectedAreas = [];
        }
        renderAreasTable();
    });

    // Acción Global: Modificar
    document.getElementById('btnEditArea')?.addEventListener('click', () => {
        if (selectedAreas.length === 1) {
            const area = currentAreas.find(a => a.id === selectedAreas[0]);
            if (area) editArea(area.id);
        }
    });

    // Acción Global: Eliminar
    document.getElementById('btnDeleteArea')?.addEventListener('click', () => {
        if (selectedAreas.length > 0) {
            Swal.fire({
                title: '¿Confirmar eliminación?',
                text: `Se eliminarán ${selectedAreas.length} área(s). Esta acción no se puede deshacer.`,
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
                        const response = await fetch('/admin/areas/delete-bulk', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ids: selectedAreas })
                        });
                        const data = await response.json();
                        if (data.status === 'success') {
                            showToast(data.message, 'success');
                            setTimeout(() => location.reload(), 800);
                        } else {
                            showToast(data.message, 'error');
                        }
                    } catch (error) {
                        showToast('Error crítico al eliminar', 'error');
                    }
                }
            });
        }
    });

    // Validar status en UI modal
    const areaStatus = document.getElementById('areaStatus');
    const areaStatusLabel = document.getElementById('areaStatusLabel');
    if(areaStatus && areaStatusLabel) {
        areaStatus.addEventListener('change', (e) => {
            areaStatusLabel.textContent = e.target.checked ? 'ACTIVO' : 'INACTIVO';
            areaStatusLabel.className = e.target.checked ? 'text-xs font-black text-primary uppercase tracking-widest' : 'text-xs font-black text-label/40 uppercase tracking-widest';
        });
    }

    window.addEventListener('resize', renderAreasTable);
}

function updateActionButtonsAreas() {
    const btnEdit = document.getElementById('btnEditArea');
    const btnDelete = document.getElementById('btnDeleteArea');
    const count = selectedAreas.length;

    if (btnEdit) btnEdit.disabled = count !== 1;
    if (btnDelete) btnDelete.disabled = count === 0;

    const selectAllCheckbox = document.getElementById('selectAllAreas');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = count > 0 && count === filteredAreas.length;
        selectAllCheckbox.indeterminate = count > 0 && count < filteredAreas.length;
    }
}

function toggleAreaSelection(id, isSelected) {
    if (isSelected) {
        if (!selectedAreas.includes(id)) selectedAreas.push(id);
    } else {
        selectedAreas = selectedAreas.filter(areaId => areaId !== id);
    }
    renderAreasTable();
}

function renderAreasTable() {
    const tbody = document.getElementById('areasTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const recordsPerPage = getPageLength();
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const pageData = filteredAreas.slice(start, end);

    pageData.forEach((area, index) => {
        const isSelected = selectedAreas.includes(area.id);
        const isActive = area.status === 'Activo' || area.status === 'activo' || area.status === true;
        
        tbody.innerHTML += `
            <tr class="group hover:bg-primary/5 transition-all cursor-pointer border-b border-panel-border/30 last:border-none ${isSelected ? 'bg-primary/5' : ''}">
                <td class="text-center" style="border-left:3px solid ${isSelected ? 'rgb(var(--color-primary))' : 'transparent'};padding:0 0.5rem;">
                    <div class="flex items-center justify-center">
                        <input type="checkbox" class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" 
                            ${isSelected ? 'checked' : ''} onchange="toggleAreaSelection(${area.id}, this.checked)">
                    </div>
                </td>
                <td class="text-center">
                    <div class="flex items-center justify-center h-full text-primary/60 font-black">
                        #${area.id.toString().padStart(3, '0')}
                    </div>
                </td>
                <td>
                    <span class="text-xs font-black text-label uppercase tracking-tight">${area.name}</span>
                </td>
                <td>
                    <div class="text-[11px] font-bold text-label/50 truncate italic line-clamp-1 max-w-[280px]" title="${area.description || ''}">
                        ${area.description || '-'}
                    </div>
                </td>
                <td class="text-center">
                    <div class="flex items-center justify-center gap-1">
                         <span class="text-[11px] font-black text-label/80">${area.users_count || 0}</span>
                         <i class="fas fa-users text-[10px] text-label/20"></i>
                    </div>
                </td>
                <td class="text-center">
                    <div class="flex items-center justify-center gap-1">
                        <span class="text-[11px] font-black text-label/80">${area.platforms_count || 0}</span>
                        <i class="fas fa-layer-group text-[10px] text-label/20"></i>
                    </div>
                </td>
                <td class="text-center">
                    <div class="flex items-center justify-center">
                        <span class="nx-badge ${isActive ? 'nx-badge-success' : 'nx-badge-error'}">${isActive ? 'ACTIVO' : 'INACTIVO'}</span>
                    </div>
                </td>
                <td class="text-right" style="padding-right: 1.25rem;">
                    <div class="flex items-center justify-end gap-2 pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="editArea(${area.id}); event.stopPropagation();" class="w-8 h-8 flex items-center justify-center rounded-lg bg-label/5 hover:bg-primary/20 text-label/40 hover:text-primary transition-all shadow-sm" title="Edición Rápida">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    renderGhostRows(8);
    renderPagination();
    updateActionButtonsAreas();
}

function renderGhostRows(columns) {
    const tbody = document.getElementById('areasTableBody');
    const recordsPerPage = getPageLength();
    const currentRows = tbody.children.length;
    const ghostCount = recordsPerPage - currentRows;

    if (ghostCount <= 0) return;

    for (let i = 0; i < ghostCount; i++) {
        const tr = document.createElement('tr');
        tr.className = 'pointer-events-none select-none';
        tr.innerHTML = `
            <td style="border-left:3px solid transparent;"></td>
            ${'<td></td>'.repeat(columns - 1)}
        `;
        tbody.appendChild(tr);
    }
}

function renderPagination() {
    const container = document.getElementById('areasPagination');
    if (!container) return;
    
    const rowsPerPage = getPageLength();
    const totalPages = Math.ceil(filteredAreas.length / rowsPerPage);
    const start = filteredAreas.length ? (currentPage - 1) * rowsPerPage + 1 : 0;
    const end = Math.min(filteredAreas.length, currentPage * rowsPerPage);

    container.innerHTML = `
        <div class="dt-layout-row" style="display: flex !important; align-items: center; justify-content: space-between; height: 52px !important; padding: 0 1.25rem !important; border-top: 1px solid rgb(var(--color-panel-border) / 0.4) !important;">
            <div class="dt-layout-cell dt-layout-start">
                <div class="dt-info" style="font-size: 13px !important; font-weight: 800 !important; color: rgb(var(--color-text-body)) !important; text-transform: none !important; letter-spacing: normal !important;">
                    Mostrando ${start}-${end} de ${filteredAreas.length} registros
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

function generatePaginationPills(totalPages) {
    let pills = '';
    for (let i = 1; i <= totalPages; i++) {
        pills += `
            <button onclick="changePage(${i})" class="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-black transition-all ${currentPage === i ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-label/40 hover:bg-label/5 hover:text-label'}">
                ${i}
            </button>
        `;
    }
    return pills;
}

function changePage(page) {
    const rowsPerPage = getPageLength();
    const totalPages = Math.ceil(filteredAreas.length / rowsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderAreasTable();
    }
}

// Modal Logic
function openAreaModal() {
    openModal('areaModal');
    document.getElementById('areaForm').reset();
    document.getElementById('areaId').value = '';
    document.getElementById('modalTitle').textContent = 'Nueva Área';
    
    // Default Status
    document.getElementById('areaStatus').checked = true;
    document.getElementById('areaStatusLabel').textContent = 'ACTIVO';
    document.getElementById('areaStatusLabel').className = 'text-xs font-black text-primary uppercase tracking-widest';
}

function closeAreaModal() {
    closeModal('areaModal');
}

function editArea(id) {
    const area = currentAreas.find(a => a.id === id);
    if (!area) return;

    openModal('areaModal');
    
    document.getElementById('areaId').value = area.id;
    document.getElementById('areaName').value = area.name;
    document.getElementById('areaDescription').value = area.description || '';
    
    const isActive = area.status === 'Activo' || area.status === 'activo' || area.status === true;
    document.getElementById('areaStatus').checked = isActive;
    document.getElementById('areaStatusLabel').textContent = isActive ? 'ACTIVO' : 'INACTIVO';
    document.getElementById('areaStatusLabel').className = isActive ? 'text-xs font-black text-primary uppercase tracking-widest' : 'text-xs font-black text-label/40 uppercase tracking-widest';

    document.getElementById('modalTitle').textContent = 'Modificar Área';
}

async function saveArea() {
    const id = document.getElementById('areaId').value;
    const name = document.getElementById('areaName').value.trim();
    const description = document.getElementById('areaDescription').value.trim();
    const status = document.getElementById('areaStatus').checked ? 'Activo' : 'Inactivo';

    if (!name) {
        showToast('El nombre es obligatorio', 'error');
        return;
    }
    
    const url = id ? `/admin/areas/edit/${id}` : '/admin/areas/add';
    const method = 'POST'; // Backend supports POST for both add and edit/int:id

    showToast('Guardando...', 'info');

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, status, user_ids: [] })
        });
        const data = await response.json();
        
        if (data.status === 'success') {
            showToast(data.message, 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Error de conexión con el servidor', 'error');
    }
    closeAreaModal();
}
