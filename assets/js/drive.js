/**
 * Nexus Drive v8 - Premium File Management Engine
 * Tailwind Optimized & Production Ready
 */

const DriveAPI = {
    async post(url, body) {
        const csrfToken = window.CSRF_TOKEN || document.querySelector('meta[name="csrf-token"]')?.content;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error en la petición');
            return data;
        } catch (error) {
            console.error(`DriveAPI Error (${url}):`, error);
            throw error;
        }
    },
    async get(url) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Error en la petición');
            return data;
        } catch (error) {
            console.error(`DriveAPI Error (${url}):`, error);
            throw error;
        }
    }
};

const UI = {
    showToast(title, icon = 'success') {
        const isDark = document.documentElement.classList.contains('dark');
        console.log(`[UI] Showing Toast: "${title}" at bottom-end`);
        const Toast = Swal.mixin({
            toast: true,
            position: 'bottom-end',
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f8fafc' : '#1e293b',
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer)
                toast.addEventListener('mouseleave', Swal.resumeTimer)
            }
        });

        Toast.fire({
            icon: icon,
            title: title,
            customClass: {
                popup: 'rounded-2xl border border-panel-border/50 shadow-2xl'
            }
        });
    },
    toggleView(viewId) {
        // En esta versión simplificada, solo existe view-files
        const el = document.getElementById('view-files');
        if (el) el.classList.remove('hidden');
        
        // El botón de atrás solo se muestra si no estamos en la raíz absoluta del área
        const backBtn = document.getElementById('btn-view-back');
        if (backBtn) {
            const isRoot = !window.nexusDrive.currentPlatform && window.nexusDrive.currentPath === '/';
            backBtn.classList.toggle('hidden', isRoot);
        }
    }
};

const FileIcons = {
    map: {
        'png': { type: 'Imagen PNG', icon: 'fa-file-image', color: 'text-indigo-500' },
        'jpg': { type: 'Imagen JPG', icon: 'fa-file-image', color: 'text-indigo-500' },
        'jpeg': { type: 'Imagen JPEG', icon: 'fa-file-image', color: 'text-indigo-500' },
        'pdf': { type: 'Documento PDF', icon: 'fa-file-pdf', color: 'text-rose-500' },
        'doc': { type: 'Documento Word', icon: 'fa-file-word', color: 'text-blue-500' },
        'docx': { type: 'Documento Word', icon: 'fa-file-word', color: 'text-blue-500' },
        'xls': { type: 'Hoja de Cálculo', icon: 'fa-file-excel', color: 'text-emerald-500' },
        'xlsx': { type: 'Hoja de Cálculo', icon: 'fa-file-excel', color: 'text-emerald-500' },
        'zip': { type: 'Comprimido', icon: 'fa-file-zipper', color: 'text-amber-500' },
        'rar': { type: 'Comprimido', icon: 'fa-file-zipper', color: 'text-amber-500' },
        'txt': { type: 'Texto Plano', icon: 'fa-file-lines', color: 'text-slate-500' }
    },
    getInfo(name, is_dir) {
        if (is_dir) return { type: 'Carpeta', icon: 'fa-folder', color: 'text-amber-400' };
        const ext = name.split('.').pop().toLowerCase();
        return this.map[ext] || { type: 'Archivo', icon: 'fa-file-alt', color: 'text-primary' };
    }
};

class NexusDrive {
    constructor() {
        this.currentArea = null;
        this.currentPlatform = null;
        this.currentPath = '/';
        this.platforms = window.PLATFORMS_DATA || [];
        this.lastPassword = null;
        this.currentPerms = { can_download: true, can_upload: true, protected: false };
        this.init();
    }

    init() {
        // Event Listeners con Binding Seguro
        document.getElementById('btn-view-back')?.addEventListener('click', () => this.goBack());
        document.getElementById('btn-sync-drive')?.addEventListener('click', () => this.refresh());
        document.getElementById('file-search')?.addEventListener('input', (e) => this.filterItems(e.target.value));
        
        // Activity Monitor Initialization
        this.loadStats();
        this.updateLayout();

        // Modal Events (Unificado)
        document.getElementById('confirm-new-folder')?.addEventListener('click', () => {
            if (window.nexusDrive) window.nexusDrive.createFolder();
        });

        // Context Menu Events
        document.getElementById('ctx-download')?.addEventListener('click', () => this.downloadSelected());
        document.getElementById('ctx-download-folder')?.addEventListener('click', () => this.downloadFolder());
        document.getElementById('ctx-delete')?.addEventListener('click', () => this.deleteSelected());

        window.addEventListener('contextmenu', (e) => {
            const item = e.target.closest('.explorer-item');
            if (item) {
                e.preventDefault();
                this.showContextMenu(e, item);
            } else {
                this.hideContextMenu();
            }
        });

        window.addEventListener('click', () => this.hideContextMenu());

        // Upload Trigger (Refactorizado para pedir clave ANTES)
        document.getElementById('trigger-upload')?.addEventListener('click', async () => {
            if (!this.currentPlatform) {
                UI.showToast('Selecciona una unidad primero', 'warning');
                return;
            }
            
            // 1. Validar Permisos Primero
            if (!this.checkPermissions('upload')) return;

            // 2. Validar Contraseña ANTES de abrir el selector de archivos
            const password = await this.getPassIfProtected();
            if (this.currentPerms?.protected && !password) return;

            // 3. Abrir selector solo si pasó las validaciones
            const input = document.createElement('input'); 
            input.type = 'file'; 
            input.multiple = true;
            input.onchange = () => this.uploadFiles(input.files, password);
            input.click();
        });

        // Auto-open platform from URL
        const urlParams = new URLSearchParams(window.location.search);
        const platformName = urlParams.get('platform');
        if (platformName) {
            setTimeout(() => {
                const plat = this.platforms.find(p => p.name.toLowerCase() === platformName.toLowerCase());
                if (plat) this.openPlatform(plat);
            }, 500);
        }

        console.log("Nexus Drive Engine v8.4 (Context Safe) Initialized");
    }

    showContextMenu(e, el) {
        const name = el.getAttribute('data-name') || el.querySelector('span').innerText;
        this.selectFile(name);
        
        const menu = document.getElementById('drive-context-menu');
        const item = this.selectedFile;
        
        // Mostrar/Ocultar opciones según tipo
        document.getElementById('ctx-download-folder')?.classList.toggle('hidden', !item.is_dir);
        document.getElementById('ctx-download')?.classList.toggle('hidden', item.is_dir);

        menu.style.display = 'block';
        menu.classList.remove('hidden');
        
        // Posicionamiento inteligente
        let x = e.clientX;
        let y = e.clientY;
        
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        if (x + menuWidth > windowWidth) x -= menuWidth;
        if (y + menuHeight > windowHeight) y -= menuHeight;
        
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    }

    hideContextMenu() {
        const menu = document.getElementById('drive-context-menu');
        if (menu) menu.classList.add('hidden');
    }

    async loadStats() {
        try {
            const data = await DriveAPI.get('/drive/api/drive/stats');
            if (data.success) {
                const kpiDown = document.getElementById('kpi-downloads');
                const kpiUp = document.getElementById('kpi-uploads');
                if (kpiDown) kpiDown.innerText = data.kpis.downloads;
                if (kpiUp) kpiUp.innerText = data.kpis.uploads;
                
                // Cargar logs reales
                const logsData = await DriveAPI.get('/drive/api/drive/logs');
                if (logsData.success) {
                    this.renderActivityLogs(logsData.logs || []);
                }
            }
        } catch (e) { console.error("Stats Error:", e); }
    }

    renderActivityLogs(logs) {
        const container = document.getElementById('activity-log-monitor');
        if (!container) return;
        
        if (logs.length === 0) {
            container.innerHTML = `<div class="p-8 text-center opacity-20 text-[10px] font-black uppercase tracking-widest">Sin Actividad Reciente</div>`;
            return;
        }

        container.innerHTML = logs.map(log => `
            <div class="flex items-start gap-4 p-4 bg-label/5 rounded-2xl border border-panel-border/40 mb-3 animate-in fade-in slide-in-from-right-4 duration-500">
                <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs">
                    <i class="fas ${this.getActionIcon(log.action)}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-[10px] font-black text-label uppercase tracking-widest">${log.user_name}</span>
                        <span class="text-[9px] text-label/40 font-bold">${log.created_at}</span>
                    </div>
                    <p class="text-[11px] text-label/60 font-bold truncate" title="${log.target_name}">${log.action}: ${log.target_name}</p>
                </div>
            </div>
        `).join('');
    }

    getActionIcon(action) {
        const icons = { 'Alta': 'fa-cloud-upload-alt', 'Descarga': 'fa-cloud-download-alt', 'Baja': 'fa-trash-alt', 'Carpeta': 'fa-folder-plus' };
        return icons[action] || 'fa-bolt';
    }

    refresh() {
        if (this.currentPlatform) this.loadFiles(this.currentPath);
        else if (this.currentArea) this.openArea(this.currentArea);
        else location.reload();
        UI.showToast("Sincronizando datos...");
        this.loadStats();
    }

    goBack() {
        if (this.currentPath !== '/' && this.currentPath !== '' && this.currentPath !== this.currentPlatform?.storage_path) {
            const parts = this.currentPath.split('/').filter(p => p !== '');
            parts.pop();
            this.currentPath = parts.join('/') || '/';
            this.loadFiles(this.currentPath);
        } else if (this.currentPlatform) {
            this.currentPlatform = null;
            this.currentPath = '/';
            this.openArea(this.currentArea);
        }
        this.updateLayout();
    }

    openArea(areaName) {
        this.currentArea = areaName;
        this.currentPlatform = null;
        this.currentPath = '/';
        
        const target = areaName.toLowerCase().trim();
        const areaPlatforms = this.platforms.filter(p => {
            const pArea = (p.area_name || p.area?.name || '').toLowerCase().trim();
            return pArea === target;
        });

        const container = document.getElementById('explorer-container');
        
        if (areaPlatforms.length === 0) {
            container.innerHTML = this.emptyState('No hay unidades en esta área');
        } else {
            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                    ${areaPlatforms.map(plat => {
                        const iconClass = plat.icon ? (plat.icon.startsWith('fa-') ? plat.icon : `fa-${plat.icon}`) : 'fa-hdd';
                        return `
                        <div onclick="window.nexusDrive.openPlatform(${JSON.stringify(plat).replace(/"/g, '&quot;')})" 
                             class="explorer-item relative bg-label/5 border border-panel-border p-6 rounded-3xl cursor-pointer hover:border-primary/40 group transition-all text-center flex flex-col items-center">
                            
                            <div class="absolute top-4 right-4 z-10">
                                <button onclick="event.stopPropagation(); window.nexusDrive.toggleFavorite(${plat.id}, this)" 
                                        class="fav-btn w-8 h-8 rounded-lg flex items-center justify-center transition-all ${plat.is_favorite ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-label/10 text-label/40 hover:bg-primary/20 hover:text-primary'}">
                                    <i class="fas fa-star text-[10px]"></i>
                                </button>
                            </div>

                            <div class="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                                 style="background: ${plat.bg_color || '#6366f1'}15; color: ${plat.bg_color || '#6366f1'}; border: 1px solid ${plat.bg_color || '#6366f1'}20;">
                                <i class="fas ${iconClass} text-3xl"></i>
                            </div>
                            <span class="text-sm font-black text-label uppercase tracking-widest truncate w-full">${plat.name}</span>
                            <span class="text-[10px] text-label/40 font-black mt-1 uppercase">Unidad de Red</span>
                        </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        UI.toggleView('view-files');
        document.getElementById('view-title').innerText = `Área: ${areaName}`;
        this.updateLayout();
    }

    async openPlatform(platform) {
        this.currentPlatform = platform;
        this.lastPassword = null; // Reset password on new platform
        
        // 1. Si la plataforma está encriptada, pedir password ANTES de listar
        if (platform.is_encrypted) {
            const pass = await this.getPassIfProtected();
            if (!pass) {
                UI.showToast('Acceso cancelado: Unidad protegida', 'warning');
                return;
            }
            await this.loadFiles(platform.storage_path || platform.name, pass);
        } else {
            await this.loadFiles(platform.storage_path || platform.name);
        }

        UI.toggleView('view-files');
        document.getElementById('view-title').innerText = `Plataforma: ${platform.name}`;
        this.updateLayout();
    }

    async createFolder() {
        const nameInput = document.getElementById('newFolderName');
        const name = nameInput?.value.trim();
        
        if (!name) {
            UI.showToast('Ingresa un nombre válido', 'warning');
            return;
        }

        // 1. Validar Permisos Primero
        if (!this.checkPermissions('upload')) return;

        // 2. Validar Contraseña
        const password = await this.getPassIfProtected();
        if (this.currentPerms?.protected && !password) return;

        try {
            const data = await DriveAPI.post('/drive/api/create-folder', {
                path: this.currentPath,
                name: name,
                password: password || ''
            });
            
            if (data.success) {
                UI.showToast(data.was_sanitized ? `Carpeta creada como: ${data.sanitized_name}` : 'Carpeta creada');
                window.closeModal('modal-folder');
                this.loadFiles(this.currentPath);
                this.loadStats();
            } else {
                if (data.error?.includes('Contraseña')) this.lastPassword = null;
                throw new Error(data.error);
            }
        } catch (e) { UI.showToast(e.message, 'error'); }
    }

    async uploadFiles(files, password = null) {
        if (!files || files.length === 0) return;
        
        // Si no se pasó password, intentar obtenerlo (por si se llama desde otro lado)
        if (!password) {
            password = await this.getPassIfProtected();
            if (this.currentPerms?.protected && !password) return;
        }

        const manager = document.getElementById('nexusUploadManager');
        const container = document.getElementById('uploadItemsContainer');
        if (manager) manager.classList.remove('hidden');

        for (const file of Array.from(files)) {
            const fileId = 'up-' + Math.random().toString(36).substr(2, 9);
            const itemHtml = `
                <div class="bg-label/5 p-4 rounded-2xl border border-panel-border/40" id="${fileId}">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[10px] font-black text-label uppercase truncate max-w-[200px]">${file.name}</span>
                        <span class="upload-perc text-[9px] font-black text-primary">0%</span>
                    </div>
                    <div class="h-1.5 bg-label/10 rounded-full overflow-hidden">
                        <div class="progress-bar-inner h-full bg-primary transition-all duration-300" style="width: 0%"></div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('afterbegin', itemHtml);
            
            const itemRow = document.getElementById(fileId);
            const progressBar = itemRow.querySelector('.progress-bar-inner');
            const percText = itemRow.querySelector('.upload-perc');

            const fd = new FormData();
            fd.append('file', file);
            fd.append('path', this.currentPath);
            fd.append('csrf_token', window.CSRF_TOKEN || '');
            if (password) fd.append('password', password);

            $.ajax({
                url: '/drive/api/v8/upload',
                type: 'POST',
                data: fd,
                processData: false,
                contentType: false,
                headers: {
                    'X-CSRFToken': window.CSRF_TOKEN || document.querySelector('meta[name="csrf-token"]')?.content
                },
                xhr: () => {
                    const xhr = new window.XMLHttpRequest();
                    xhr.upload.addEventListener('progress', (ev) => {
                        if (ev.lengthComputable) {
                            const percent = Math.round((ev.loaded / ev.total) * 100);
                            progressBar.style.width = percent + '%';
                            percText.innerText = percent + '%';
                        }
                    }, false);
                    return xhr;
                },
                success: (resp) => {
                    if (resp.success) {
                        percText.innerHTML = '<i class="fas fa-check-circle text-emerald-500"></i>';
                        progressBar.classList.replace('bg-primary', 'bg-emerald-500');
                        this.loadFiles(this.currentPath);
                        this.loadStats();
                    } else {
                        if (resp.error?.includes('Contraseña')) this.lastPassword = null;
                        percText.innerHTML = '<i class="fas fa-exclamation-circle text-rose-500"></i>';
                        progressBar.classList.replace('bg-primary', 'bg-rose-500');
                        UI.showToast(resp.error || 'Error en la subida', 'error');
                    }
                },
                error: (xhr) => {
                    percText.innerHTML = '<i class="fas fa-times-circle text-rose-500"></i>';
                    progressBar.classList.replace('bg-primary', 'bg-rose-500');
                    try {
                        const resp = JSON.parse(xhr.responseText);
                        if (resp.error?.includes('Contraseña')) this.lastPassword = null;
                        UI.showToast(resp.error || 'Error en el servidor', 'error');
                    } catch(e) { 
                        UI.showToast('Error de comunicación (Status: ' + xhr.status + ')', 'error'); 
                    }
                },
                complete: () => {
                    setTimeout(() => {
                        itemRow.style.opacity = '0';
                        setTimeout(() => {
                            itemRow.remove();
                            if (container.children.length === 0) manager.classList.add('hidden');
                        }, 500);
                    }, 4000);
                }
            });
        }
    }

    async toggleFavorite(id, btn) {
        try {
            const data = await DriveAPI.post('/drive/api/favorites/toggle', { platform_id: id });
            if (data.success) {
                const isAdded = data.status === 'added';
                btn.className = `fav-btn w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isAdded ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-label/10 text-label/40 hover:bg-primary/20 hover:text-primary'}`;
                const plat = this.platforms.find(p => p.id === id);
                if (plat) plat.is_favorite = isAdded;
                UI.showToast(isAdded ? 'Agregado a favoritos' : 'Eliminado de favoritos');
            }
        } catch (e) { UI.showToast(e.message, 'error'); }
    }

    async loadFiles(path, password = null) {
        this.currentPath = path;
        try {
            const data = await DriveAPI.post('/drive/api/drive/list', { path, password });
            if (data.success) {
                this.lastPassword = password;
                this.currentPerms = data.permissions;
                this.renderFiles(data.items || []);
            }
        } catch (e) {
            if (e.message.includes('Contraseña')) {
                const { value: pass } = await Swal.fire({
                    title: 'Acceso Protegido',
                    text: 'Se requiere clave para esta unidad',
                    input: 'password',
                    confirmButtonColor: '#6366f1'
                });
                if (pass) this.loadFiles(path, pass);
            } else { UI.showToast(e.message, 'error'); }
        }
    }

    renderFiles(items) {
        this.currentItems = items;
        const container = document.getElementById('explorer-container');
        if (items.length === 0) {
            container.innerHTML = this.emptyState('Directorio Vacío', 'fa-ghost');
            this.updateDetails(null);
            return;
        }

        container.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
                ${items.map(item => {
                    const info = FileIcons.getInfo(item.name, item.is_dir);
                    return `
                        <div onclick="window.nexusDrive.selectFile('${item.name.replace(/'/g, "\\'")}')" 
                             ondblclick="${item.is_dir ? `window.nexusDrive.loadFiles('${item.path}')` : ''}"
                             data-name="${item.name}"
                             class="explorer-item bg-label/5 border border-panel-border p-6 rounded-3xl cursor-pointer hover:border-primary/40 group transition-all text-center flex flex-col items-center">
                            <div class="w-16 h-16 rounded-2xl bg-label/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${info.color}">
                                <i class="fas ${info.icon} text-3xl"></i>
                            </div>
                            <span class="text-xs font-black text-label uppercase tracking-widest truncate w-full" title="${item.name}">${item.name}</span>
                            <span class="text-[9px] text-label/40 font-bold mt-1 uppercase tracking-widest">${item.is_dir ? 'Carpeta' : item.size}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        this.updateDetails(null);
    }

    selectFile(name) {
        const items = document.querySelectorAll('.explorer-item');
        let selectedItem = null;

        items.forEach(el => {
            const itemName = el.getAttribute('data-name') || el.querySelector('span').innerText;
            const isTarget = itemName === name;
            el.classList.toggle('border-primary/60', isTarget);
            el.classList.toggle('bg-primary/5', isTarget);
            
            if (isTarget) {
                selectedItem = this.currentItems.find(i => i.name === name);
            }
        });

        if (selectedItem) this.updateDetails(selectedItem);
    }

    updateDetails(item) {
        const empty = document.getElementById('details-empty');
        const content = document.getElementById('details-content');
        this.selectedFile = item;
        
        if (!item) {
            empty?.classList.remove('hidden');
            content?.classList.add('hidden');
            return;
        }

        empty?.classList.add('hidden');
        content?.classList.remove('hidden');

        const info = FileIcons.getInfo(item.name, item.is_dir);
        const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(item.name.split('.').pop().toLowerCase());

        content.innerHTML = `
            <div class="w-full flex flex-col items-center text-center space-y-6">
                <div id="preview-frame" class="w-full aspect-video rounded-[2.5rem] bg-black/20 flex items-center justify-center text-5xl ${info.color} shadow-inner overflow-hidden border border-panel-border/50">
                    ${isImage ? `<img src="/drive/api/download?path=${encodeURIComponent(item.path)}${this.lastPassword ? `&password=${this.lastPassword}` : ''}" class="w-full h-full object-cover">` : `<i class="fas ${info.icon}"></i>`}
                </div>
                
                <div class="space-y-2 w-full">
                    <h4 class="text-lg font-black text-label uppercase tracking-tighter break-all">${item.name}</h4>
                    <span class="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-[0.2em]">${info.type}</span>
                </div>

                <div class="w-full grid grid-cols-1 gap-3 pt-6 border-t border-panel-border/40">
                    <div class="flex items-center justify-between px-5 py-4 bg-label/5 rounded-2xl border border-panel-border/20">
                        <span class="text-[9px] font-black text-label/30 uppercase tracking-[0.2em]">Tamaño</span>
                        <span class="text-xs font-bold text-label">${item.size || '--'}</span>
                    </div>
                    <div class="flex items-center justify-between px-5 py-4 bg-label/5 rounded-2xl border border-panel-border/20">
                        <span class="text-[9px] font-black text-label/30 uppercase tracking-[0.2em]">Modificado</span>
                        <span class="text-xs font-bold text-label">${item.mtime ? new Date(item.mtime * 1000).toLocaleDateString() : '--'}</span>
                    </div>
                </div>

                <div class="w-full pt-6 flex flex-col gap-3">
                    <button onclick="window.nexusDrive.downloadSelected()" class="w-full h-14 bg-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                        Descargar Activo
                    </button>
                    <button onclick="window.nexusDrive.deleteSelected()" class="w-full h-12 bg-rose-500/10 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all">
                        Eliminar Permanente
                    </button>
                </div>
            </div>
        `;
    }

    checkPermissions(action) {
        if (action === 'upload' && !this.currentPerms?.can_upload) {
            Swal.fire({
                title: 'Acceso Restringido',
                text: 'La subida de archivos está deshabilitada en esta unidad.',
                icon: 'warning',
                confirmButtonColor: '#6366f1'
            });
            return false;
        }
        if (action === 'download' && !this.currentPerms?.can_download) {
            Swal.fire({
                title: 'Acceso Restringido',
                text: 'La descarga de activos está deshabilitada en esta unidad.',
                icon: 'warning',
                confirmButtonColor: '#6366f1'
            });
            return false;
        }
        if (action === 'delete' && !this.currentPerms?.can_download) {
            Swal.fire({
                title: 'Acceso Restringido',
                text: 'No tienes permisos para eliminar elementos en esta ubicación (Modo Lectura).',
                icon: 'warning',
                confirmButtonColor: '#6366f1'
            });
            return false;
        }
        return true;
    }

    async getPassIfProtected() {
        // Usar is_encrypted de la plataforma actual como fuente de verdad primaria
        const isProtected = this.currentPlatform?.is_encrypted || this.currentPerms?.protected;
        if (!isProtected) return this.lastPassword || null;
        
        // Si ya tenemos una password guardada, la devolvemos
        if (this.lastPassword) return this.lastPassword;

        const { value: pass } = await Swal.fire({
            title: 'Unidad Protegida',
            text: 'Esta plataforma requiere una clave de seguridad para el acceso y gestión de archivos.',
            input: 'password',
            inputPlaceholder: 'Ingresa la contraseña...',
            confirmButtonColor: '#6366f1',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b',
            customClass: {
                popup: 'rounded-[2rem] border border-panel-border/50 shadow-2xl',
                input: 'bg-label/5 border-panel-border rounded-xl font-bold'
            }
        });
        
        if (pass) this.lastPassword = pass;
        return pass;
    }

    async downloadSelected() {
        if (!this.selectedFile) return;
        
        // 1. Validar Permisos Primero
        if (!this.checkPermissions('download')) return;

        const item = this.selectedFile;
        if (item.is_dir) {
            this.downloadFolder(item.path);
            return;
        }

        // 2. Validar Contraseña
        const password = await this.getPassIfProtected();
        if (this.currentPerms?.protected && !password) return;

        try {
            const response = await fetch('/drive/api/download', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.CSRF_TOKEN || document.querySelector('meta[name="csrf-token"]')?.content 
                },
                body: JSON.stringify({ path: item.path, password: password || '' })
            });
            
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                if (err.error?.includes('Contraseña')) this.lastPassword = null; // Limpiar si falló
                throw new Error(err.error || 'No se pudo descargar el archivo');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = item.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            UI.showToast('Descarga iniciada');
        } catch (e) { UI.showToast(e.message, 'error'); }
    }

    async downloadFolder(path = null) {
        const targetPath = path || this.selectedFile?.path;
        if (!targetPath) return;

        // 1. Validar Permisos Primero
        if (!this.checkPermissions('download')) return;

        // 2. Validar Contraseña
        const password = await this.getPassIfProtected();
        if (this.currentPerms?.protected && !password) return;

        try {
            UI.showToast('Comprimiendo carpeta...', 'info');
            const response = await fetch('/drive/api/download-folder', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.CSRF_TOKEN || document.querySelector('meta[name="csrf-token"]')?.content 
                },
                body: JSON.stringify({ path: targetPath, password: password || '' })
            });
            
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                if (err.error?.includes('Contraseña')) this.lastPassword = null;
                throw new Error(err.error || 'Error al comprimir');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${targetPath.split('/').pop()}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            UI.showToast('Carpeta descargada');
        } catch (e) { UI.showToast(e.message, 'error'); }
    }

    async deleteSelected() {
        if (!this.selectedFile) return;
        
        // 1. Validar Permisos Primero
        if (!this.checkPermissions('delete')) return;

        const item = this.selectedFile;

        const result = await Swal.fire({
            title: '¿Confirmar eliminación?',
            text: `Se borrará permanentemente: ${item.name}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
            color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b'
        });

        if (result.isConfirmed) {
            // 2. Validar Contraseña
            const password = await this.getPassIfProtected();
            if (this.currentPerms?.protected && !password) return;

            try {
                const data = await DriveAPI.post('/drive/api/delete-item', { 
                    path: item.path, 
                    password: password || '' 
                });
                if (data.success) {
                    UI.showToast('Elemento eliminado');
                    this.loadFiles(this.currentPath);
                    this.loadStats();
                } else {
                    if (data.error?.includes('Contraseña')) this.lastPassword = null;
                    throw new Error(data.error);
                }
            } catch (e) { UI.showToast(e.message, 'error'); }
        }
    }

    updateLayout() {
        const explorerCol = document.getElementById('main-explorer-col');
        const utilityCol = document.getElementById('right-utility-col');
        
        if (!explorerCol || !utilityCol) return;

        if (this.currentPlatform) {
            explorerCol.classList.replace('col-span-12', 'col-span-9');
            utilityCol.classList.remove('hidden');
            setTimeout(() => {
                utilityCol.classList.remove('opacity-0', 'translate-x-12');
            }, 50);
        } else {
            utilityCol.classList.add('opacity-0', 'translate-x-12');
            explorerCol.classList.replace('col-span-9', 'col-span-12');
            setTimeout(() => {
                if (!this.currentPlatform) utilityCol.classList.add('hidden');
            }, 500);
        }
    }

    emptyState(text, icon = 'fa-folder-open') {
        return `
            <div class="flex flex-col items-center justify-center py-20 opacity-20 col-span-4 w-full">
                <i class="fas ${icon} text-6xl mb-4"></i>
                <p class="font-black uppercase tracking-[0.3em]">${text}</p>
            </div>
        `;
    }

    filterItems(query) {
        const q = query.toLowerCase().trim();
        const items = document.querySelectorAll('.explorer-item');
        items.forEach(item => {
            const text = item.getAttribute('data-name')?.toLowerCase() || item.querySelector('span').innerText.toLowerCase();
            const isVisible = text.includes(q);
            item.classList.toggle('hidden', !isVisible);
        });
    }
}

// Global functions for HTML access
window.openArea = (name) => window.nexusDrive.openArea(name);
window.openFolderModal = () => {
    const el = document.getElementById('modal-folder');
    if (el) {
        el.classList.remove('hidden');
        setTimeout(() => el.classList.remove('opacity-0', 'pointer-events-none'), 10);
        const input = document.getElementById('newFolderName');
        if (input) {
            input.value = '';
            input.focus();
        }
    }
};

window.closeModal = (id) => {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => el.classList.add('hidden'), 300);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.nexusDrive = new NexusDrive();

    // Listener para el buscador rápido
    document.getElementById('file-search')?.addEventListener('input', (e) => {
        window.nexusDrive.filterItems(e.target.value);
    });

    // Listener para subida de archivos
    document.getElementById('file-upload')?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            window.nexusDrive.uploadFiles(e.target.files);
        }
    });
});
