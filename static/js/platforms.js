// Nexus Premium - Platforms Module (Modernized Legacy 1:1)
(function() {
    'use strict';

    // Global Data State
    let currentArea = null;
    let currentAreaId = null;
    let currentStep = 1;
    let selectedUserIds = [];
    let areaPage = 1;
    const areasPerPage = 8;

    const iconsMap = {
        'server': '<i class="fas fa-server"></i>',
        'cloud': '<i class="fas fa-cloud"></i>',
        'cpu': '<i class="fas fa-microchip"></i>',
        'database': '<i class="fas fa-database"></i>',
        'lock': '<i class="fas fa-lock"></i>',
        'code': '<i class="fas fa-code"></i>',
        'terminal': '<i class="fas fa-terminal"></i>',
        'monitor': '<i class="fas fa-desktop"></i>',
        'shield': '<i class="fas fa-shield-alt"></i>',
        'globe': '<i class="fas fa-globe"></i>',
        'box': '<i class="fas fa-box"></i>',
        'layers': '<i class="fas fa-layer-group"></i>',
        'users': '<i class="fas fa-users"></i>',
        'settings': '<i class="fas fa-cog"></i>',
        'tool': '<i class="fas fa-tools"></i>',
        'key': '<i class="fas fa-key"></i>',
        'hard-drive': '<i class="fas fa-hdd"></i>',
        'network': '<i class="fas fa-network-wired"></i>',
        'wifi': '<i class="fas fa-wifi"></i>',
        'bolt': '<i class="fas fa-bolt"></i>',
        'fire': '<i class="fas fa-fire"></i>',
        'rocket': '<i class="fas fa-rocket"></i>',
        'plug': '<i class="fas fa-plug"></i>',
        'sync': '<i class="fas fa-sync"></i>',
        'save': '<i class="fas fa-save"></i>',
        'print': '<i class="fas fa-print"></i>',
        'share': '<i class="fas fa-share-alt"></i>',
        'sitemap': '<i class="fas fa-sitemap"></i>',
        'project': '<i class="fas fa-project-diagram"></i>',
        'chart': '<i class="fas fa-chart-bar"></i>',
        'pie': '<i class="fas fa-chart-pie"></i>',
        'line': '<i class="fas fa-chart-line"></i>',
        'at': '<i class="fas fa-at"></i>',
        'envelope': '<i class="fas fa-envelope"></i>',
        'phone': '<i class="fas fa-phone"></i>',
        'video': '<i class="fas fa-video"></i>',
        'camera': '<i class="fas fa-camera"></i>',
        'image': '<i class="fas fa-image"></i>',
        'folder': '<i class="fas fa-folder"></i>'
    };

    const colorsPalette = [
        '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f97316', '#475569', '#065f46', '#7c2d12',
        '#1e3a8a', '#581c87', '#991b1b', '#166534', '#115e59', '#4c1d95',
        '#134e4a', '#0f172a'
    ];

    function renderPlatformColors() {
        const grid = document.getElementById('colorIdentityGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        colorsPalette.forEach(color => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'w-full aspect-square border-r border-b border-panel-border transition-all hover:scale-110 active:scale-95';
            btn.style.backgroundColor = color;
            
            if (document.getElementById('bgColorInput').value === color) {
                btn.classList.add('ring-2', 'ring-inset', 'ring-white/40', 'shadow-inner');
            }
            
            btn.onclick = () => {
                grid.querySelectorAll('button').forEach(b => b.classList.remove('ring-2', 'ring-inset', 'ring-white/40', 'shadow-inner'));
                btn.classList.add('ring-2', 'ring-inset', 'ring-white/40', 'shadow-inner');
                document.getElementById('bgColorInput').value = color;
                updateLivePreview();
            };
            grid.appendChild(btn);
        });
    }

    function renderPlatformIcons() {
        const grid = document.getElementById('platformIconGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        Object.keys(iconsMap).forEach(key => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'flex items-center justify-center h-12 hover:bg-primary/10 text-label transition-all border-r border-b border-panel-border';
            btn.dataset.icon = key;
            btn.innerHTML = iconsMap[key];
            
            if (document.getElementById('selectedIconInput').value === key) {
                btn.classList.add('bg-primary', 'text-white');
            }
            
            btn.onclick = () => {
                document.getElementById('platformIconGrid').querySelectorAll('button').forEach(b => b.classList.remove('bg-primary', 'text-white'));
                btn.classList.add('bg-primary', 'text-white');
                document.getElementById('selectedIconInput').value = key;
                updateLivePreview();
            };
            grid.appendChild(btn);
        });
    }

    let currentFilterArea = 'all';
    let searchQuery = '';

    window.initHeader = function() {
        const totalCountEl = document.getElementById('totalPlatformsCount');
        const totalItemsCountEl = document.getElementById('totalItemsCount');
        if (totalCountEl && window.__areaData) {
            totalCountEl.textContent = window.__areaData.length;
        }
        if (totalItemsCountEl && window.__areaData) {
            totalItemsCountEl.textContent = window.__areaData.length;
        }

        const searchInp = document.getElementById('platformSearch');
        if (searchInp) {
            searchInp.oninput = (e) => {
                searchQuery = e.target.value.toLowerCase();
                areaPage = 1; // Reset to first page on search
                renderPlatformGrid();
            };
        }

        // Pagination Listeners
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        if (prevBtn) prevBtn.onclick = () => { if (areaPage > 1) { areaPage--; renderPlatformGrid(); } };
        if (nextBtn) nextBtn.onclick = () => { 
            const areas = window.__areaData || [];
            const totalPages = Math.ceil(areas.length / areasPerPage);
            if (areaPage < totalPages) { areaPage++; renderPlatformGrid(); } 
        };

        const areaSelect = document.getElementById('modalAreaSelect');
        if (areaSelect && window.__areaData) {
            const currentVal = areaSelect.value;
            areaSelect.innerHTML = '<option value="" disabled selected>Seleccione un área...</option>';
            window.__areaData.forEach(area => {
                areaSelect.innerHTML += `<option value="${area.id}">${area.name.toUpperCase()}</option>`;
            });
            if (currentVal) areaSelect.value = currentVal;
        }
    }

    window.renderPlatformGrid = function() {
        const grid = document.getElementById('platformGrid');
        const emptyState = document.getElementById('emptyState');
        if (!grid) return;
        grid.innerHTML = '';

        // Data Source
        const areas = window.__areaData || [];
        
        // Filter Areas by search
        let filtered = areas.filter(a => {
            return !searchQuery || 
                   a.name.toLowerCase().includes(searchQuery) || 
                   (a.description && a.description.toLowerCase().includes(searchQuery));
        });

        // Pagination Logic
        const totalItems = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / areasPerPage));
        if (areaPage > totalPages) areaPage = totalPages;

        const start = (areaPage - 1) * areasPerPage;
        const end = start + areasPerPage;
        const paginatedAreas = filtered.slice(start, end);

        // Update Footer
        const itemsShownEl = document.getElementById('itemsShown');
        const totalItemsCountEl = document.getElementById('totalItemsCount');
        const currentPageNumEl = document.getElementById('currentPageNum');
        const totalPagesNumEl = document.getElementById('totalPagesNum');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');

        if (itemsShownEl) itemsShownEl.textContent = paginatedAreas.length;
        if (totalItemsCountEl) totalItemsCountEl.textContent = totalItems;
        if (currentPageNumEl) currentPageNumEl.textContent = areaPage;
        if (totalPagesNumEl) totalPagesNumEl.textContent = totalPages;
        
        if (prevBtn) prevBtn.disabled = (areaPage === 1);
        if (nextBtn) nextBtn.disabled = (areaPage === totalPages);

        if (totalItems === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }
        if (emptyState) emptyState.classList.add('hidden');
        paginatedAreas.forEach((area, idx) => {
            const card = document.createElement('div');
            const areaColor = area.color || '#6366f1';
            const areaPlatforms = window.__platformData[area.id] || [];
            const platCount = areaPlatforms.length;
            const userCount = areaPlatforms.reduce((acc, p) => acc + (p.users_count || 0), 0);
            const status = area.status || 'Activo';
            const statusColor = status === 'Activo' ? 'emerald' : 'rose';
            const areaIcon = iconsMap[area.icon] || '<i class="fas fa-folder"></i>';
            
            card.className = "group relative flex flex-col h-full bg-panel-fill border border-panel-border rounded-2xl overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 p-8";
            
            card.innerHTML = `
                <!-- Sobrio Top Border -->
                <div class="absolute top-0 left-0 w-full h-0.5 bg-panel-border/30">
                    <div class="h-full bg-primary/40 opacity-0 group-hover:opacity-100 transition-all duration-500" style="width: 100%"></div>
                </div>

                <div class="relative z-10 flex items-center gap-6 mb-8">
                    <!-- Icon with Subtle Area Accent -->
                    <div class="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center text-3xl transition-all duration-500 group-hover:scale-110 shadow-sm" 
                         style="background: ${areaColor}10; color: ${areaColor}; border: 1px solid ${areaColor}20">
                        ${areaIcon}
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="text-xl font-black text-label uppercase tracking-tighter group-hover:text-primary transition-colors leading-tight truncate">
                            ${area.name}
                        </h3>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="w-2.5 h-2.5 rounded-full bg-${statusColor}-500"></span>
                            <span class="text-[11px] font-black uppercase tracking-widest text-label/70">${status}</span>
                        </div>
                    </div>
                </div>

                <div class="relative z-10 flex-1 space-y-6">
                    <!-- Metrics Badges -->
                    <div class="flex flex-wrap items-center gap-3">
                        <div class="flex-1 min-w-[130px] px-3 py-2 rounded-xl bg-surface-container/50 border border-panel-border flex items-center gap-2">
                            <i class="fas fa-layer-group text-[10px] text-primary/60"></i>
                            <span class="text-[11px] font-bold uppercase tracking-tight text-label/80">${platCount} <span class="opacity-60">Unidades</span></span>
                        </div>
                        <div class="flex-1 min-w-[130px] px-3 py-2 rounded-xl bg-surface-container/50 border border-panel-border flex items-center gap-2">
                            <i class="fas fa-users text-[10px] text-primary/60"></i>
                            <span class="text-[11px] font-bold uppercase tracking-tight text-label/80">${userCount} <span class="opacity-60">Usuarios</span></span>
                        </div>
                    </div>
                    
                    <p class="text-base text-label/80 leading-relaxed font-bold line-clamp-2 italic border-l-4 border-panel-border/50 pl-5">
                        ${area.description || 'Gestión centralizada de servicios digitales.'}
                    </p>
                </div>

                <div class="relative z-10 mt-8 pt-6 border-t border-panel-border/30">
                    <button class="w-full h-14 rounded-xl flex items-center justify-center gap-4 text-xs font-black uppercase tracking-[0.2em] bg-surface-container/40 border border-panel-border text-label/60 hover:bg-primary hover:text-white hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300" 
                            onclick="drillDown('${area.name}', ${area.id})">
                        <span>Gestionar Área</span>
                        <i class="fas fa-chevron-right text-xs opacity-50 group-hover:translate-x-1 transition-transform"></i>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    function hexToRGB(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `${r}, ${g}, ${b}`;
    }

    window.drillDown = function(areaName, areaId) {
        currentArea = areaName;
        currentAreaId = areaId;

        const platforms = (window.__platformData && (window.__platformData[areaId] || window.__platformData[String(areaId)])) || [];

        const gridView = document.getElementById('gridView');
        const drillDownView = document.getElementById('drillDownView');
        
        if (gridView) gridView.classList.add('hidden');
        if (drillDownView) {
            drillDownView.classList.remove('hidden');
            drillDownView.style.display = 'flex';
        }
        
        const breadcrumb = document.getElementById('breadcrumbDrilldown');
        const breadcrumbArea = document.getElementById('breadcrumbArea');
        if (breadcrumb) breadcrumb.classList.remove('hidden');
        if (breadcrumbArea) breadcrumbArea.textContent = areaName;

        // Force a micro-tick to ensure the container is visible and has height before rendering
        setTimeout(() => {
            renderPlatformsTable(platforms);
        }, 50);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.showCatalog = function() {
        document.getElementById('gridView').classList.remove('hidden');
        document.getElementById('drillDownView').classList.add('hidden');
        document.getElementById('breadcrumbDrilldown').classList.add('hidden');
        initHeader();
        renderPlatformGrid();
    };



    let platformsDataTable;

    function initPlatformsDataTable() {
        const tableEl = $('#modern-table');
        if (!tableEl.length || $.fn.dataTable.isDataTable('#modern-table')) return;

        platformsDataTable = tableEl.DataTable({
            data: [],
            columns: [
                { 
                    data: 'id', 
                    width: '35px', 
                    orderable: false,
                    className: 'text-center',
                    render: (data) => `
                        <div class="flex items-center justify-center">
                            <input type="checkbox" class="platform-checkbox w-4 h-4 rounded border-panel-border text-primary focus:ring-primary/20 cursor-pointer" data-id="${data}" onchange="updateActionButtons()">
                        </div>` 
                },
                { 
                    data: null, 
                    width: '45px',
                    orderable: false,
                    className: 'text-left pl-2',
                    render: (data) => {
                        const style = `background: ${data.bg_color || '#6366f1'}; color: ${data.text_color || '#ffffff'}`;
                        return `
                            <div class="flex items-center justify-center h-full">
                                <div class="w-8 h-8 min-w-[32px] min-h-[32px] aspect-square flex-shrink-0 rounded-[8px] flex items-center justify-center transition-all group-hover:scale-110 shadow-sm border border-white/5" style="${style}">
                                    <div class="text-[14px] flex items-center justify-center leading-none">
                                        ${data.logo_url ? `<img src="${data.logo_url}" class="w-full h-full object-cover rounded-[8px]">` : (iconsMap[data.icon] || iconsMap['box'])}
                                    </div>
                                </div>
                            </div>`;
                    }
                },
                { 
                    data: 'name', 
                    width: '30%',
                    className: 'text-left',
                    render: (data) => `
                        <div class="flex flex-col">
                            <span class="text-sm font-black text-primary uppercase italic leading-none">${data}</span>
                        </div>` 
                },
                { 
                    data: 'description', 
                    width: '35%',
                    className: 'text-left',
                    render: (data) => `<div class="text-[12px] text-label/60 font-bold line-clamp-2">${data || '-'}</div>` 
                },
                { 
                    data: 'users_count', 
                    width: '80px',
                    className: 'text-left pl-4',
                    render: (data) => `
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-container text-label/60 font-black text-[10px] uppercase">
                            <i class="fas fa-users opacity-40"></i> ${data || 0}
                        </div>` 
                },
                { 
                    data: 'status', 
                    width: '100px',
                    className: 'text-left pl-4',
                    render: (data) => {
                        const cls = data === 'Activo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500';
                        return `<span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cls}">${data}</span>`;
                    }
                },
                { 
                    data: null, 
                    width: '120px',
                    orderable: false,
                    className: 'text-center',
                    render: (data) => {
                        const iconCls = "w-7 h-7 rounded-lg flex items-center justify-center transition-all";
                        const activeD = data.can_download ? 'bg-primary/10 text-primary' : 'text-label/20';
                        const activeU = data.can_upload ? 'bg-primary/10 text-primary' : 'text-label/20';
                        const activeE = data.is_encrypted ? 'bg-amber-500/10 text-amber-500' : 'text-label/20';

                        return `
                        <div class="flex items-center justify-center gap-1.5">
                            <div class="${iconCls} ${activeD}" title="Descarga: ${data.can_download ? 'Habilitada' : 'Restringida'}">
                                <i class="fas fa-cloud-arrow-down text-[10px]"></i>
                            </div>
                            <div class="${iconCls} ${activeU}" title="Subida: ${data.can_upload ? 'Habilitada' : 'Restringida'}">
                                <i class="fas fa-cloud-arrow-up text-[10px]"></i>
                            </div>
                            <div class="${iconCls} ${activeE}" title="Cifrado: ${data.is_encrypted ? 'Activo' : 'Inactivo'}">
                                <i class="fas fa-shield-halved text-[10px]"></i>
                            </div>
                        </div>`;
                    }
                }
            ],
            autoWidth: false,
            pageLength: getPageLength(),
            pagingType: 'simple',
            order: [[2, 'asc']],
            layout: {
                topStart: null,
                topEnd: null,
                bottomStart: 'info',
                bottomEnd: 'paging'
            },
            language: {
                zeroRecords: "No se encontraron registros",
                info: "Mostrando _START_-_END_ de _TOTAL_",
                infoEmpty: "Mostrando 0-0 de 0",
                paginate: {
                    previous: '<i class="fas fa-chevron-left text-[10px]"></i>',
                    next: '<i class="fas fa-chevron-right text-[10px]"></i>'
                }
            },
            drawCallback: function(settings) {
                renderGhostRows(settings, 7);
            }
        });

        // Event listeners for inline actions
        $('#modern-table tbody').on('click', '.btn-edit-row', function(e) {
            e.stopPropagation();
            const id = $(this).data('id');
            const cb = $(`.platform-checkbox[data-id="${id}"]`);
            $('.platform-checkbox').prop('checked', false);
            cb.prop('checked', true);
            updateActionButtons();
            $('[data-action="platforms-edit-selected"]').trigger('click');
        });

        $('#modern-table tbody').on('click', '.btn-delete-row', function(e) {
            e.stopPropagation();
            const id = $(this).data('id');
            const cb = $(`.platform-checkbox[data-id="${id}"]`);
            $('.platform-checkbox').prop('checked', false);
            cb.prop('checked', true);
            updateActionButtons();
            $('[data-action="platforms-delete-selected"]').trigger('click');
        });

        // Row Click Edit Integration
        $('#modern-table tbody').on('click', 'tr', function(e) {
            // Ignore if clicking on checkbox or its container
            if ($(e.target).closest('.platform-checkbox').length || $(e.target).is('input[type="checkbox"]')) {
                return;
            }
            
            // Ignore ghost rows
            if ($(this).hasClass('ghost-row')) return;

            const cb = $(this).find('.platform-checkbox');
            if (cb.length) {
                // Clear other selections for single-edit clarity
                $('.platform-checkbox').prop('checked', false);
                cb.prop('checked', true);
                window.updateActionButtons();
                
                // Trigger the edit modal
                $('[data-action="platforms-edit-selected"]').trigger('click');
            }
        });

        // Add visual cue for interactivity
        $('#modern-table').addClass('cursor-pointer');

        window.activeNexusTable = platformsDataTable;
    }

    function renderPlatformsTable(data) {
        if (!platformsDataTable) initPlatformsDataTable();
        
        platformsDataTable.clear();
        platformsDataTable.rows.add(data);
        platformsDataTable.draw();
        
        updateActionButtons();
    }

    function getPageLength() {
        return 10;
    }

    function renderGhostRows(settings, columns) {
        const api = new $.fn.dataTable.Api(settings);
        const info = api.page.info();
        const tbody = $(settings.nTBody);
        const pageLen = api.page.len();

        // Calculate dynamic row height (Standard Nexus Standard)
        const container = api.table().container();
        const gridH = $(container).height();
        let rowH = 52;
        
        if (gridH > 0) {
            // Header ~52px, Footer ~52px. We use pageLen to fill exactly 10 slots
            rowH = Math.max(48, Math.floor((gridH - 105) / pageLen));
        }
        $(container).css('--row-h', rowH + 'px');

        tbody.find('.ghost-row').remove();
        
        const realRows = info.end - info.start;
        const ghostCount = pageLen - realRows;
        if (ghostCount <= 0) return;

        let ghostHtml = '';
        for (let i = 0; i < ghostCount; i++) {
            // Zebra striping is handled by global CSS nth-child
            ghostHtml += `
                <tr class="ghost-row pointer-events-none select-none">
                    <td class="text-center"><div></div></td>
                    <td class="text-center"><div></div></td>
                    <td class="text-left"><div></div></td>
                    <td class="text-left"><div></div></td>
                    <td class="text-center"><div></div></td>
                    <td class="text-center"><div></div></td>
                    <td class="text-center"><div></div></td>
                </tr>`;
        }
        tbody.append(ghostHtml);
    }

    window.updateActionButtons = function() {
        const selected = document.querySelectorAll('.platform-checkbox:checked');
        const btnEdit = document.getElementById('btnEditPlatform');
        const btnDelete = document.getElementById('btnDeletePlatform');
        const selectAll = document.getElementById('selectAllPlatforms');
        
        if (btnEdit) {
            const isDisabled = selected.length !== 1;
            btnEdit.disabled = isDisabled;
            btnEdit.classList.toggle('text-slate-400', isDisabled);
            btnEdit.classList.toggle('text-slate-700', !isDisabled);
            btnEdit.classList.toggle('opacity-40', isDisabled);
            btnEdit.classList.toggle('opacity-100', !isDisabled);
        }

        if (btnDelete) {
            const isDisabled = selected.length === 0;
            btnDelete.disabled = isDisabled;
            btnDelete.classList.toggle('text-rose-300', isDisabled);
            btnDelete.classList.toggle('text-rose-600', !isDisabled);
            btnDelete.classList.toggle('opacity-40', isDisabled);
            btnDelete.classList.toggle('opacity-100', !isDisabled);
        }

        if (selectAll) {
            const allCheckboxes = document.querySelectorAll('.platform-checkbox');
            selectAll.checked = allCheckboxes.length > 0 && selected.length === allCheckboxes.length;
            selectAll.indeterminate = selected.length > 0 && selected.length < allCheckboxes.length;
        }
    };

    // Modal Wizard Logic
    function changeStep(step) {
        const form = document.getElementById('createPlatformForm');
        currentStep = step;
        const totalSteps = 2;
        
        // Sections
        document.querySelectorAll('.modal-step').forEach(s => s.classList.add('hidden'));
        document.getElementById(`step${step}`).classList.remove('hidden');
        
        // Indicator
        document.getElementById('platformStepIndicator').classList.remove('hidden');
        document.querySelectorAll('#platformStepIndicator .step-item').forEach(item => {
            const s = parseInt(item.dataset.step);
            const dot = item.querySelector('div');
            const label = item.querySelector('span');
            
            if (s < step) {
                dot.className = 'w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-sm ring-4 ring-panel-fill transition-all';
                dot.innerHTML = '✓';
                label.className = 'text-[9px] font-black uppercase tracking-widest text-emerald-500';
            } else if (s === step) {
                dot.className = 'w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm shadow-lg shadow-primary/20 ring-4 ring-panel-fill transition-all';
                dot.innerHTML = s;
                label.className = 'text-[9px] font-black uppercase tracking-widest text-primary';
            } else {
                dot.className = 'w-10 h-10 rounded-full bg-panel-border text-label/40 flex items-center justify-center font-black text-sm ring-4 ring-panel-fill transition-all';
                dot.innerHTML = s;
                label.className = 'text-[9px] font-black uppercase tracking-widest text-label/40';
            }
        });
        
        const progress = ((step - 1) / (totalSteps - 1)) * 100;
        const progressEl = document.getElementById('platformStepProgress');
        if (progressEl) progressEl.style.width = `${progress}%`;
        
        // Buttons
        document.getElementById('btnCancel').classList.toggle('hidden', step !== 1);
        document.getElementById('btnBack').classList.toggle('hidden', step === 1);
        document.getElementById('btnNext').classList.toggle('hidden', step === totalSteps);
        document.getElementById('btnSubmit').classList.toggle('hidden', step !== totalSteps);

        if (step === 2) {
            renderPlatformIcons();
            renderPlatformColors();
        }
        updateLivePreview();
    }

    // URL Premium Validation
    const urlInput = document.getElementById('directLinkInput');
    urlInput?.addEventListener('input', function() {
        const url = this.value;
        const isValid = /^(https?:\/\/)/.test(url);
        if (url.length > 0 && !isValid) {
            this.classList.add('border-rose-500', 'bg-rose-50');
            this.classList.remove('border-panel-border', 'bg-input-bg');
        } else {
            this.classList.remove('border-rose-500', 'bg-rose-50');
            this.classList.add('border-panel-border', 'bg-input-bg');
        }
    });

    window.handleStepNext = function() {
        const nameInp = document.querySelector('input[name="name"]');
        if (currentStep === 1) {
            if (!nameInp || !nameInp.value.trim()) {
                nameInp?.classList.add('border-rose-500', 'bg-rose-50', 'animate-shake');
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'bottom-end',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });
                Toast.fire({ icon: 'error', title: 'Campo Requerido', text: 'Por favor, ingrese el nombre del recurso.' });
                return;
            } else {
                nameInp?.classList.remove('border-rose-500', 'bg-rose-50', 'animate-shake');
            }
            changeStep(2);
        }
    };

    window.handleStepBack = function() {
        if (currentStep > 1) changeStep(currentStep - 1);
    };

    function populateIconGrid() {
        const grid = document.getElementById('iconSelectorZone');
        if (!grid) return;
        grid.innerHTML = '';
        Object.entries(iconsMap).forEach(([key, svg]) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = "w-full aspect-square flex items-center justify-center text-base text-label/40 hover:bg-primary/10 hover:text-primary transition-all border-b border-r border-panel-border/50";
            btn.innerHTML = svg;
            btn.onclick = () => {
                document.querySelectorAll('#iconSelectorZone button').forEach(b => b.classList.remove('bg-primary', 'text-white'));
                btn.classList.add('bg-primary', 'text-white');
                document.getElementById('selectedIconInput').value = key;
                updateLivePreview();
            };
            grid.appendChild(btn);
        });
    }

    window.setVisualMode = function(mode) {
        const logoZone = document.getElementById('logoUploadZone');
        const iconZone = document.getElementById('iconSelectorZone');
        const btnImage = document.getElementById('btnModeImage');
        const btnIcon = document.getElementById('btnModeIcon');
        const textColorCtrl = document.getElementById('textColorControl');
        const bgColorCtrl = document.getElementById('bgColorControl');

        if (logoZone) logoZone.classList.toggle('hidden', mode !== 'image');
        if (iconZone) iconZone.classList.toggle('hidden', mode !== 'icon');
        
        const isIconMode = mode === 'icon';
        [textColorCtrl, bgColorCtrl].forEach(ctrl => {
            if (ctrl) {
                ctrl.style.opacity = isIconMode ? '1' : '0.4';
                ctrl.querySelectorAll('input').forEach(i => i.disabled = !isIconMode);
            }
        });

        if (btnImage) {
            btnImage.classList.toggle('bg-white', mode === 'image');
            btnImage.classList.toggle('text-label/40', mode !== 'image');
        }
        if (btnIcon) {
            btnIcon.classList.toggle('bg-white', mode === 'icon');
            btnIcon.classList.toggle('text-label/40', mode !== 'icon');
        }
        
        if (mode === 'icon') populateIconGrid();
        updateLivePreview();
    };

    function updateLivePreview() {
        const colorInp = document.getElementById('bgColorInput');
        const iconInp = document.getElementById('selectedIconInput');
        const textColorInp = document.getElementById('textColorInput');
        
        // Forced Defaults if values are missing or suspicious
        let color = colorInp ? colorInp.value : '#000000';
        let textColor = textColorInp ? textColorInp.value : '#ffffff';
        const iconKey = iconInp ? iconInp.value : 'box';
        
        // If it's a new form and values are both black (browser reset bug), force Nexus defaults
        if (color === '#000000' && textColor === '#000000') {
            textColor = '#ffffff';
            if (textColorInp) textColorInp.value = '#ffffff';
        }

        const bgColorText = document.getElementById('bgColorText');
        const textColorText = document.getElementById('textColorText');
        
        if (bgColorText) bgColorText.value = color.toUpperCase();
        if (textColorText) textColorText.value = textColor.toUpperCase();

        const logoPreview = document.getElementById('logoPreview');
        const logoInput = document.getElementById('logoInput');

        if (logoPreview && logoInput && logoInput.files && logoInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                logoPreview.classList.remove('hidden');
                logoPreview.querySelector('img').src = e.target.result;
            };
            reader.readAsDataURL(logoInput.files[0]);
        }
    }

    window.resetLogo = function() {
        const logoInput = document.getElementById('logoInput');
        const logoPreview = document.getElementById('logoPreview');
        if (logoInput) logoInput.value = '';
        if (logoPreview) logoPreview.classList.add('hidden');
        updateLivePreview();
    };

    // Hex sync listeners
    ['bgColor', 'textColor'].forEach(prefix => {
        const picker = document.getElementById(`${prefix}Input`);
        const text = document.getElementById(`${prefix}Text`);
        if (picker && text) {
            picker.addEventListener('input', () => {
                text.value = picker.value.toUpperCase();
                updateLivePreview();
            });
            text.addEventListener('change', () => {
                if (/^#[0-9A-F]{6}$/i.test(text.value)) {
                    picker.value = text.value;
                    updateLivePreview();
                }
            });
        }
    });

    // Picklist logic
    function updatePicklist() {
        const availableList = document.getElementById('availableList');
        const assignedList = document.getElementById('assignedList');
        if (!availableList || !assignedList) return;
        
        availableList.innerHTML = '';
        assignedList.innerHTML = '';
        
        window.__allUsers.forEach(u => {
            const isActive = selectedUserIds.includes(u.id);
            const item = document.createElement('div');
            item.className = `p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${isActive ? 'bg-primary/10 border-primary/20 hover:bg-primary/20' : 'bg-panel-fill border-panel-border hover:border-primary/40'}`;
            item.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg ${isActive ? 'bg-primary text-white' : 'bg-surface-container text-label/40'} flex items-center justify-center text-[10px] font-black uppercase">
                        ${u.name.substring(0, 2)}
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-text">${u.name}</span>
                        <span class="text-[10px] text-label/40 font-bold uppercase">${u.email}</span>
                    </div>
                </div>
                <i class="fas ${isActive ? 'fa-minus-circle text-rose-500' : 'fa-plus-circle text-primary opacity-20 group-hover:opacity-100'} transition-opacity"></i>
            `;
            item.onclick = () => {
                if (isActive) selectedUserIds = selectedUserIds.filter(id => id !== u.id);
                else selectedUserIds.push(u.id);
                updatePicklist();
            };
            
            if (isActive) assignedList.appendChild(item);
            else availableList.appendChild(item);
        });
        document.getElementById('selectedUsersInput').value = JSON.stringify(selectedUserIds);
    }

    // Init
    document.addEventListener('DOMContentLoaded', () => {
        initHeader();
        renderPlatformGrid();

        // Search Integration
        $('#platformSearchSub').on('input', function() {
            if (platformsDataTable) {
                platformsDataTable.search(this.value).draw();
            }
        });

        // Bindings
        document.querySelectorAll('[data-action="platforms-step-next"]').forEach(b => b.onclick = handleStepNext);
        document.querySelectorAll('[data-action="platforms-step-back"]').forEach(b => b.onclick = handleStepBack);
        document.querySelectorAll('[data-action="platforms-close-modal"]').forEach(b => b.onclick = () => window.closeModal('platformModal'));
        function resetIdentity() {
            const bgI = document.getElementById('bgColorInput');
            const txI = document.getElementById('textColorInput');
            const bgT = document.getElementById('bgColorText');
            const txT = document.getElementById('textColorText');
            if (bgI) bgI.value = '#000000';
            if (txI) txI.value = '#ffffff';
            if (bgT) bgT.value = '#000000';
            if (txT) txT.value = '#FFFFFF';
            setVisualMode('image');
        }

        // Global Delegation for Modal Creation (fixes lost bindings)
        $(document).on('click', '[data-action="platforms-open-create-modal"]', function() {
            const form = document.getElementById('createPlatformForm');
            if (!form) return;
            form.reset();
            resetIdentity();
            form.dataset.mode = 'create';
            $('#createPlatformForm [name="name"]').prop('readonly', false).removeClass('bg-surface-container/50 opacity-60');
            console.log("Nexus Creation Mode - Identity Unlocked");
            
            const isDrive = !!form.querySelector('[name="drive_context"]');
            document.getElementById('platformModalTitle').textContent = isDrive ? "Registrar Nueva Unidad Drive" : "Registrar Nueva Plataforma";
            
            // Reset Drive Checkboxes with default states
            if (document.getElementById('can_upload')) document.getElementById('can_upload').checked = true;
            if (document.getElementById('can_download')) document.getElementById('can_download').checked = true;
            if (document.getElementById('is_encrypted')) document.getElementById('is_encrypted').checked = false;

            const passCont = document.getElementById('passwordContainer');
            if (passCont) passCont.classList.add('hidden');
            const passField = document.getElementById('encryptionPasswordField');
            if (passField) passField.value = '';

            const areaSelect = document.getElementById('modalAreaSelect');
            if (areaSelect) {
                areaSelect.value = currentAreaId || "";
            }
            
            selectedUserIds = [];
            
            if (isDrive) {
                document.querySelectorAll('.platform-only-fields').forEach(el => el.classList.add('hidden'));
                document.querySelectorAll('.drive-only-fields').forEach(el => el.classList.remove('hidden'));
            } else {
                document.querySelectorAll('.platform-only-fields').forEach(el => el.classList.remove('hidden'));
                document.querySelectorAll('.drive-only-fields').forEach(el => el.classList.add('hidden'));
            }

            changeStep(1);
            window.openModal('platformModal');
        });

        // Global Delegation for Edit
        $(document).on('click', '[data-action="platforms-edit-selected"]', function() {
            const selected = document.querySelector('.platform-checkbox:checked');
            if (!selected) return;
            
            const platId = selected.dataset.id;
            let palt = null;

            if (platformsDataTable) {
                palt = platformsDataTable.row($(selected).closest('tr')).data();
            }

            if (!palt) {
                const areaPlats = window.__platformData[currentAreaId] || window.__platformData[String(currentAreaId)] || [];
                palt = areaPlats.find(p => p.id == platId);
            }
            
            if (!palt) {
                Swal.fire('Error', 'No se pudieron recuperar los datos.', 'error');
                return;
            }

            const form = document.getElementById('createPlatformForm');
            if (!form) return;
            
            const isDrive = !!form.querySelector('[name="drive_context"]');

            // TITULO INMEDIATO
            document.getElementById('platformModalTitle').textContent = isDrive ? "Modificar Unidad Drive" : "Modificar Plataforma";
            
            form.reset();
            resetIdentity();
            form.dataset.mode = 'edit';
            form.dataset.editId = palt.id;
            
            // FILL DATA WITH MICRO-DELAY TO OVERRIDE ANY MODAL RESET
            setTimeout(() => {
                console.log("Nexus Population - Data:", palt);
                
                $('#createPlatformForm [name="name"]').val(palt.name || '').prop('readonly', true).addClass('bg-surface-container/50 opacity-60');
                console.log("Nexus Edit Mode - Identity Locked (Readonly)");
                $('#createPlatformForm [name="description"]').val(palt.description || '');
                $('#createPlatformForm [name="area_id"]').val(palt.area_id || currentAreaId);

                const statusToggle = document.getElementById('platformStatusToggle');
                if (statusToggle) {
                    statusToggle.checked = (palt.status === 'Activo');
                    statusToggle.dispatchEvent(new Event('change'));
                }

                // Drive Specific Fields
                const upToggle = document.getElementById('can_upload');
                if (upToggle) upToggle.checked = !!palt.can_upload;
                
                const downToggle = document.getElementById('can_download');
                if (downToggle) downToggle.checked = !!palt.can_download;

                const encToggle = document.getElementById('is_encrypted');
                if (encToggle) encToggle.checked = !!palt.is_encrypted;

                // Identity Sync
                $('#bgColorInput').val(palt.bg_color || '#000000');
                $('#textColorInput').val(palt.text_color || '#ffffff');
                $('#selectedIconInput').val(palt.icon || 'box');
                
                const passCont = document.getElementById('passwordContainer');
                if (passCont) passCont.classList.toggle('hidden', !palt.is_encrypted);

                if (palt.logo_url) setVisualMode('image');
                else setVisualMode('icon');

                if (isDrive) {
                    document.querySelectorAll('.platform-only-fields').forEach(el => el.classList.add('hidden'));
                    document.querySelectorAll('.drive-only-fields').forEach(el => el.classList.remove('hidden'));
                } else {
                    document.querySelectorAll('.platform-only-fields').forEach(el => el.classList.remove('hidden'));
                    document.querySelectorAll('.drive-only-fields').forEach(el => el.classList.add('hidden'));
                    selectedUserIds = palt.user_ids || [];
                    updatePicklist();
                }
                updateLivePreview();
                console.log("Nexus Population - Complete");
            }, 50);

            changeStep(1);
            window.openModal('platformModal');
        });

        // Encryption Password Toggle
        $(document).on('change', '#is_encrypted', function() {
            const container = document.getElementById('passwordContainer');
            if (container) {
                container.classList.toggle('hidden', !this.checked);
                if (this.checked) {
                    document.getElementById('encryptionPasswordField')?.focus();
                }
            }
        });

        // Global Delegation for Delete with Block Validation
        $(document).on('click', '[data-action="platforms-delete-selected"]', async function() {
            const selected = document.querySelectorAll('.platform-checkbox:checked');
            if (selected.length === 0) return;

            // Detect Context: Drive vs Platforms
            const form = document.getElementById('createPlatformForm');
            const isDrive = form && !!form.querySelector('[name="drive_context"]');
            const deleteBaseUrl = isDrive ? '/admin/drive-platforms/delete' : '/admin/platforms/delete';

            let totalUsersAffected = 0;
            selected.forEach(cb => {
                const row = platformsDataTable.row($(cb).closest('tr')).data();
                if (row) totalUsersAffected += (row.users_count || 0);
            });

            // BLOCK LOGIC: Cannot delete if has users
            if (totalUsersAffected > 0) {
                return Swal.fire({
                    title: '<span class="text-rose-500 uppercase italic font-black tracking-tighter">Acción Bloqueada</span>',
                    html: `<div class="text-xs font-bold text-slate-300 leading-relaxed uppercase tracking-widest">
                            No es posible eliminar ${isDrive ? 'unidades' : 'plataformas'} con usuarios activos.<br><br>
                            Se detectaron <span class="text-rose-500 font-black">${totalUsersAffected} accesos vinculados</span>.<br>
                            Por favor, remueva los accesos de los usuarios antes de intentar dar de baja el servicio.
                           </div>`,
                    icon: 'error',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#6366f1',
                    background: '#1e293b',
                    color: '#ffffff',
                    backdrop: 'rgba(15, 23, 42, 0.75)'
                });
            }

            // Standard Confirmation for empty platforms
            const confirm = await Swal.fire({
                title: `<span class="text-white uppercase italic font-black tracking-tighter">¿Confirmar Baja?</span>`,
                html: `<div class="text-xs font-bold text-slate-300 uppercase tracking-widest">Se eliminarán ${selected.length} ${isDrive ? 'unidades' : 'servicios'} de forma permanente.</div>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#f43f5e',
                confirmButtonText: 'Sí, Ejecutar Baja',
                cancelButtonText: 'Cancelar',
                background: '#1e293b',
                color: '#ffffff',
                backdrop: 'rgba(15, 23, 42, 0.75)'
            });

            if (confirm.isConfirmed) {
                const procModal = document.getElementById('processingModal');
                if (procModal) {
                    procModal.classList.remove('hidden');
                    procModal.classList.add('flex');
                    setTimeout(() => procModal.classList.add('show'), 50);
                }

                try {
                    // Drive uses POST, platforms uses GET (based on existing logic)
                    const method = isDrive ? 'POST' : 'GET';
                    await Promise.all(Array.from(selected).map(cb => fetch(`${deleteBaseUrl}/${cb.dataset.id}`, { method: method })));
                    startSuccessCountdown(isDrive ? "Las unidades han sido desconectadas del sistema." : "Los servicios han sido purgados permanentemente del catálogo.", refreshPlatforms);
                } catch (e) {
                    if (procModal) procModal.classList.add('hidden');
                    Swal.fire('Error', 'Fallo técnico al procesar la baja.', 'error');
                }
            }
        });

        // Select All Handler
        document.getElementById('selectAllPlatforms')?.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.platform-checkbox');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            updateActionButtons();
        });

        // Visual Mode Switcher (Icon vs Image)
        $(document).on('click', '[data-action="platforms-visual-mode"]', function() {
            window.setVisualMode(this.dataset.mode);
        });

        document.getElementById('logoInput')?.addEventListener('change', updateLivePreview);
        document.querySelector('input[name="name"]')?.addEventListener('input', updateLivePreview);
        
        // Status Toggle Handler
        document.getElementById('platformStatusToggle')?.addEventListener('change', function() {
            const label = document.getElementById('platformStatusLabel');
            if (this.checked) {
                label.textContent = "Activo / Disponible";
                label.className = "text-xs font-black text-emerald-500 uppercase";
            } else {
                label.textContent = "Inactivo / Deshabilitado";
                label.className = "text-xs font-black text-slate-400 uppercase";
            }
        });

        document.getElementById('createPlatformForm').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const isEdit = form.dataset.mode === 'edit';
            
            // Context Detection
            const isDrive = !!form.querySelector('[name="drive_context"]');
            let url = '';
            
            if (isDrive) {
                url = isEdit ? `/admin/drive-platforms/edit/${form.dataset.editId}` : '/admin/drive-platforms/add';
            } else {
                url = isEdit ? `/admin/platforms/edit-platform/${form.dataset.editId}` : '/admin/platforms/add-platform';
            }
            
            const formData = new FormData(form);
            
            // Critical Fail-safe for area_id
            if (!formData.get('area_id') || formData.get('area_id') === '') {
                formData.set('area_id', currentAreaId);
            }

            if (!formData.get('area_id')) {
                Swal.fire('Error de Contexto', 'No se ha detectado el Área de origen. Por favor, reintente.', 'error');
                return;
            }

            if (!isDrive) {
                formData.append('users', JSON.stringify(selectedUserIds));
            }
            
            if (isDrive) {
                // Correct boolean strings for Drive Backend
                formData.set('can_upload', document.getElementById('can_upload').checked ? 'true' : 'false');
                formData.set('can_download', document.getElementById('can_download').checked ? 'true' : 'false');
                formData.set('is_encrypted', document.getElementById('is_encrypted').checked ? 'true' : 'false');
            } else {
                const isChecked = document.getElementById('platformStatusToggle').checked;
                formData.append('status', isChecked ? 'Activo' : 'Inactivo');
            }

            const procModal = document.getElementById('processingModal');
            if (procModal) {
                procModal.classList.remove('hidden');
                procModal.classList.add('flex');
                setTimeout(() => procModal.classList.add('show'), 50);
            }

            try {
                const res = await fetch(url, { method: 'POST', body: formData });
                const result = await res.json();
                
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'bottom-end',
                    showConfirmButton: false,
                    timer: 4000,
                    timerProgressBar: true
                });

                if (result.success) {
                    startSuccessCountdown("La plataforma y sus parámetros de acceso han sido actualizados correctamente.", refreshPlatforms);
                } else {
                    console.error("Backend Error:", result.error);
                    Toast.fire({ 
                        icon: 'error', 
                        title: 'Error de Procesamiento',
                        text: 'No pudimos guardar los cambios. Verifique los datos e intente de nuevo.'
                    });
                }
            } catch (err) {
                console.error("Connection Error:", err);
                Swal.fire({
                    toast: true,
                    position: 'bottom-end',
                    icon: 'error',
                    title: 'Error de Red',
                    text: 'Fallo técnico en la conexión con el servidor.',
                    showConfirmButton: false,
                    timer: 4000
                });
            }
        };

        async function refreshPlatforms() {
            if (!currentAreaId) return;
            try {
                const res = await fetch(`/admin/drive-platforms/api/list/${currentAreaId}`);
                const result = await res.json();
                if (result.success) {
                    // Update Global State
                    if (!window.__platformData) window.__platformData = {};
                    window.__platformData[currentAreaId] = result.platforms;
                    
                    // Force Table Refresh (for drill-down)
                    renderPlatformsTable(result.platforms);

                    // Force Grid Refresh (for areas view)
                    if (typeof renderPlatformGrid === 'function') {
                        renderPlatformGrid();
                    }
                }
            } catch (e) {
                console.error("Error refreshing platforms:", e);
            }
        }

        // Picklist Search Logic
        $(document).on('input', '.js-picklist-filter', function() {
            const query = this.value.toLowerCase();
            const targetListId = this.dataset.listId;
            const items = document.querySelectorAll(`#${targetListId} > div`);
            
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.classList.toggle('hidden', !text.includes(query));
            });
        });

        // Force Identity Reset to Nexus Standards
        const bgI = document.getElementById('bgColorInput');
        const txI = document.getElementById('textColorInput');
        const bgT = document.getElementById('bgColorText');
        const txT = document.getElementById('textColorText');

        if (bgI) bgI.value = '#000000';
        if (txI) txI.value = '#ffffff';
        if (bgT) bgT.value = '#000000';
        if (txT) txT.value = '#FFFFFF';

        // --- GUARDIÁN DE INTEGRIDAD DE NOMBRES (SEGURIDAD DE ARCHIVOS) ---
        const unitNameInput = document.getElementById('unitNameInput');
        if (unitNameInput) {
            unitNameInput.addEventListener('input', function(e) {
                const originalValue = this.value;
                // Regex estricta: Solo alfanuméricos, guiones, guiones bajos y espacios (que luego se limpian)
                // Prohibidos: / \ . * ? : " < > | # % & { } + @ ! ` =
                let sanitizedValue = originalValue.replace(/[/*?:"<>|#%&{}+@!`=]/g, '-');
                sanitizedValue = sanitizedValue.replace(/\.\./g, ''); // Evitar Path Traversal
                
                if (originalValue !== sanitizedValue) {
                    this.value = sanitizedValue;
                    
                    // Notificación Toast de Seguridad (Nexus Style)
                    const Toast = Swal.mixin({
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000,
                        timerProgressBar: true,
                        didOpen: (toast) => {
                            toast.addEventListener('mouseenter', Swal.stopTimer)
                            toast.addEventListener('mouseleave', Swal.resumeTimer)
                        }
                    });

                    Toast.fire({
                        icon: 'warning',
                        title: 'Seguridad Nexus',
                        text: 'Caracteres prohibidos detectados. El nombre ha sido corregido para mantener la integridad del sistema.',
                        background: 'rgba(15, 23, 42, 0.95)',
                        color: '#fff'
                    });
                }
            });
        }

        // Responsive Redraw
        window.addEventListener('resize', () => {
            if (platformsDataTable) platformsDataTable.draw();
        });

        // Initial state
        setVisualMode('image');
        updateLivePreview();
    });

})();
