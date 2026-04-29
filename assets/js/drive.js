/**
 * Nexus Drive v8 - Premium File Management Engine
 */

const DriveAPI = {
    async post(url, body) {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
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
        Swal.fire({
            title: title,
            icon: icon,
            toast: true,
            position: 'bottom-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f8fafc' : '#1e293b'
        });
    },
    toggleView(viewId) {
        ['view-areas', 'view-platforms', 'view-files'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('hidden', id !== viewId);
        });
        
        // Show/Hide back button
        const backBtn = document.getElementById('btn-view-back');
        if (backBtn) backBtn.classList.toggle('hidden', viewId === 'view-areas');
        
        // Update title
        const titles = {
            'view-areas': 'Explorador de Áreas',
            'view-platforms': 'Plataformas Disponibles',
            'view-files': 'Explorador de Archivos'
        };
        document.getElementById('view-title').innerText = titles[viewId] || 'Drive';
    }
};

class NexusDrive {
    constructor() {
        this.currentArea = null;
        this.currentPlatform = null;
        this.currentPath = '/';
        this.platforms = window.PLATFORMS_DATA || [];
        this.init();
    }

    init() {
        // Event Listeners
        document.getElementById('btn-view-back')?.addEventListener('click', () => this.goBack());
        document.getElementById('btn-sync-drive')?.addEventListener('click', () => this.refresh());
        
        // Search filter
        document.getElementById('file-search')?.addEventListener('input', (e) => this.filterItems(e.target.value));

        console.log("Nexus Drive Engine v8 Initialized");
    }

    refresh() {
        if (this.currentPlatform) {
            this.loadFiles(this.currentPath);
        } else if (this.currentArea) {
            this.openArea(this.currentArea);
        } else {
            location.reload();
        }
        UI.showToast("Sincronizando datos...");
    }

    goBack() {
        if (this.currentPath !== '/' && this.currentPath !== '') {
            const parts = this.currentPath.split('/').filter(p => p !== '');
            parts.pop();
            this.currentPath = '/' + parts.join('/');
            this.loadFiles(this.currentPath);
        } else if (this.currentPlatform) {
            this.currentPlatform = null;
            UI.toggleView('view-platforms');
        } else if (this.currentArea) {
            this.currentArea = null;
            UI.toggleView('view-areas');
        }
    }

    openArea(areaName) {
        this.currentArea = areaName;
        const areaPlatforms = this.platforms.filter(p => p.area_name === areaName || p.area?.name === areaName);
        
        const container = document.getElementById('view-platforms');
        container.innerHTML = '';
        
        if (areaPlatforms.length === 0) {
            container.innerHTML = `
                <div class="col-span-4 py-20 text-center opacity-40">
                    <i class="fas fa-folder-open text-6xl mb-4"></i>
                    <p class="font-black uppercase tracking-widest italic">No hay plataformas en esta área</p>
                </div>
            `;
        } else {
            areaPlatforms.forEach(plat => {
                const card = document.createElement('div');
                card.className = "bg-label/5 border border-panel-border p-6 rounded-2xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 group transition-all flex items-center gap-5";
                card.onclick = () => this.openPlatform(plat);
                
                card.innerHTML = `
                    <div class="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-all group-hover:scale-110" 
                         style="background: ${plat.bg_color || '#6366f1'}20; color: ${plat.bg_color || '#6366f1'};">
                        <i class="fas ${plat.icon || 'fa-layer-group'} text-xl"></i>
                    </div>
                    <div>
                        <h4 class="text-sm font-black text-label uppercase tracking-widest">${plat.name}</h4>
                        <p class="text-[9px] text-label/40 font-bold uppercase tracking-tighter">Acceso Directo</p>
                    </div>
                `;
                container.appendChild(card);
            });
        }
        
        UI.toggleView('view-platforms');
        document.getElementById('view-title').innerText = `Área: ${areaName}`;
    }

    async openPlatform(platform) {
        this.currentPlatform = platform;
        this.currentPath = '/';
        await this.loadFiles('/');
        UI.toggleView('view-files');
        document.getElementById('view-title').innerText = `Plataforma: ${platform.name}`;
    }

    async loadFiles(path) {
        this.currentPath = path;
        try {
            // Simulated list for initial integration
            const data = await DriveAPI.get(`/drive/api/files?platform_id=${this.currentPlatform?.id}&path=${path}`);
            this.renderFiles(data.files || []);
        } catch (e) {
            UI.showToast(e.message, 'error');
        }
    }

    renderFiles(files) {
        const container = document.getElementById('explorer-container');
        container.innerHTML = '';
        
        if (files.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 opacity-20">
                    <i class="fas fa-ghost text-6xl mb-4"></i>
                    <p class="font-black uppercase tracking-[0.3em]">Directorio Vacío</p>
                </div>
            `;
            return;
        }

        // Render logic for files...
    }

    filterItems(query) {
        const q = query.toLowerCase().trim();
        const items = document.querySelectorAll('.explorer-item, #view-areas > div, #view-platforms > div');
        items.forEach(item => {
            const text = item.innerText.toLowerCase();
            item.classList.toggle('hidden', !text.includes(q));
        });
    }
}

// Global scope functions for template onclicks
window.openArea = (name) => window.nexusDrive.openArea(name);
window.closeModal = (id) => {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('opacity-0');
        setTimeout(() => el.classList.add('hidden'), 300);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.nexusDrive = new NexusDrive();
});
