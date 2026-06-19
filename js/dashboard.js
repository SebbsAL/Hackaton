// js/dashboard.js
// ============================================================
// WEB COMPONENT: <dashboard-view>
// ============================================================

class DashboardView extends HTMLElement {
    constructor() {
        super();
        
        // Estado
        this.tickets = [];
        this.filteredTickets = [];
        this.selectedTicketId = localStorage.getItem('db_selected_ticket_id') || null;
        this.activeTab = localStorage.getItem('db_active_tab') || 'tab1';
        this.filterPriority = 'all';
        this.filterDanger = 'all';
        this.searchQuery = '';
        
        // URL del Webhook de n8n fija (Modo Producción)
        this.n8nUrl = 'https://hackaton2026.app.n8n.cloud/webhook-test/gestion';

        // Referencias de Mapa Leaflet
        this.detailMap = null;
        this.manualMarker = null;
        this.apiMarker = null;
    }

    connectedCallback() {
        this.render();
        this.attachEvents();
        this.fetchTickets(); // Carga inicial automática desde n8n
    }

    render() {
        this.innerHTML = `
            <!-- Cabecera del Dashboard -->
            <div class="db-header">
                <div class="db-title">
                    <h1>📊 Dashboard de Gestión de Reportes</h1>
                    <p>Monitoreo en tiempo real de afectaciones y daños reportados</p>
                </div>
                <div class="api-actions" style="display: flex; gap: 0.8rem; align-items: center;">
                    <button class="btn btn-ghost toggle-contrast" id="toggleContrast" aria-label="Alternar modo alto contraste" title="Modo alto contraste">
                        ◐ Contraste
                    </button>
                    <button class="btn btn-primary" id="btnSync">
                        🔄 Sincronizar Datos
                    </button>
                </div>
            </div>

            <!-- Tarjetas de Estadísticas -->
            <div class="stats-grid">
                <div class="stat-card" id="statTotal">
                    <div class="stat-icon">📂</div>
                    <div class="stat-info">
                        <span class="stat-value" id="valTotal">0</span>
                        <span class="stat-label">Total Reportes</span>
                    </div>
                </div>
                <div class="stat-card" id="statAlta">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-info">
                        <span class="stat-value" id="valAlta" style="color:var(--error);">0</span>
                        <span class="stat-label">Prioridad Alta</span>
                    </div>
                </div>
                <div class="stat-card" id="statPeligro">
                    <div class="stat-icon">🚨</div>
                    <div class="stat-info">
                        <span class="stat-value" id="valPeligro" style="color:var(--error);">0</span>
                        <span class="stat-label">Peligro Inminente</span>
                    </div>
                </div>
                <div class="stat-card" id="statCoords">
                    <div class="stat-icon">📍</div>
                    <div class="stat-info">
                        <span class="stat-value" id="valCoords" style="color:var(--success);">0</span>
                        <span class="stat-label">Coords Validadas</span>
                    </div>
                </div>
            </div>

            <!-- Navegación por Pestañas (Tabs) -->
            <div class="db-tabs">
                <button class="tab-btn ${this.activeTab === 'tab1' ? 'active' : ''}" id="tab1Btn">
                    📋 Resumen de Casos
                </button>
                <button class="tab-btn ${this.activeTab === 'tab2' ? 'active' : ''}" id="tab2Btn">
                    🔍 Detalle del Ticket
                </button>
            </div>

            <!-- PESTAÑA 1: TABLA DE RESUMEN -->
            <div class="tab-content ${this.activeTab === 'tab1' ? 'active' : ''}" id="tab1Content">
                <div class="table-controls">
                    <div class="search-wrapper">
                        <input type="text" id="dbSearch" placeholder="Buscar por ID de Ticket, nombre o descripción..." value="${this.searchQuery}">
                    </div>
                    <div class="filter-wrapper">
                        <button class="filter-btn active" data-filter="priority" data-value="all">Todos</button>
                        <button class="filter-btn" data-filter="priority" data-value="Alta">⚠️ Alta Prioridad</button>
                        <button class="filter-btn" data-filter="danger" data-value="Sí">🚨 Peligro Inminente</button>
                    </div>
                </div>
                <div class="table-container">
                    <table class="db-table" id="ticketsTable">
                        <thead>
                            <tr>
                                <th>Ticket ID</th>
                                <th>Fecha Reporte</th>
                                <th>Nombre Solicitante</th>
                                <th>Prioridad</th>
                                <th>Peligro Inminente</th>
                                <th>Validación Coords</th>
                                <th>Chat ID</th>
                                <th style="text-align:center;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="ticketsTableBody">
                            <tr>
                                <td colspan="8" style="text-align:center; padding: 2rem; color:var(--text-muted);">
                                    Cargando información del sistema...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- PESTAÑA 2: DETALLES DEL TICKET -->
            <div class="tab-content ${this.activeTab === 'tab2' ? 'active' : ''}" id="tab2Content">
                <!-- Buscador rápido en Detalle -->
                <div class="detail-search-bar">
                    <label for="detailSearchInput">Consultar Ticket:</label>
                    <input type="text" id="detailSearchInput" placeholder="Ingrese Ticket ID (ej: TKT-20260604-4829)">
                    <button class="btn btn-primary" id="btnGoToDetail">Buscar</button>
                    <button class="btn btn-ghost" id="btnBackToSummary">← Volver al Resumen</button>
                </div>

                <div id="ticketDetailContainer">
                    <!-- El detalle del ticket seleccionado se inyectará dinámicamente aquí -->
                    <div class="empty-detail-state">
                        <div class="icon">🔍</div>
                        <h2>Ningún Ticket Seleccionado</h2>
                        <p>Por favor, seleccione un ticket en la pestaña "Resumen de Casos" o busque un ID de ticket arriba para visualizar sus detalles completos.</p>
                    </div>
                </div>
            </div>

            <!-- LIGHTBOX PARA FOTOGRAFÍAS -->
            <div class="lightbox" id="photoLightbox">
                <button class="lightbox-close" id="lightboxClose" aria-label="Cerrar">&times;</button>
                <img class="lightbox-content" id="lightboxImg" src="" alt="Imagen ampliada">
                <div class="lightbox-caption" id="lightboxCaption"></div>
            </div>

            <!-- Toast -->
            <div class="toast" id="dbToast" role="status" aria-live="polite"></div>
        `;
    }

    attachEvents() {
        // Modo Alto Contraste
        const toggleHC = this.querySelector('#toggleContrast');
        toggleHC.addEventListener('click', () => {
            document.body.classList.toggle('high-contrast');
            const isHC = document.body.classList.contains('high-contrast');
            toggleHC.textContent = isHC ? '◑ Contraste normal' : '◐ Contraste';
            localStorage.setItem('highContrast', isHC ? '1' : '0');
        });
        if (localStorage.getItem('highContrast') === '1') {
            document.body.classList.add('high-contrast');
            toggleHC.textContent = '◑ Contraste normal';
        }

        // Sincronizar desde Webhook de n8n
        const btnSync = this.querySelector('#btnSync');
        btnSync.addEventListener('click', () => {
            this.fetchTickets(true);
        });

        // Tabs de navegación
        const tab1Btn = this.querySelector('#tab1Btn');
        const tab2Btn = this.querySelector('#tab2Btn');
        
        tab1Btn.addEventListener('click', () => this.switchTab('tab1'));
        tab2Btn.addEventListener('click', () => this.switchTab('tab2'));

        // Controladores de búsqueda y filtros
        const dbSearch = this.querySelector('#dbSearch');
        dbSearch.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.applyFilters();
        });

        const filterBtns = this.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filterType = btn.dataset.filter;
                const filterVal = btn.dataset.value;

                if (filterType === 'priority') {
                    this.filterPriority = filterVal;
                    this.filterDanger = 'all';
                } else if (filterType === 'danger') {
                    this.filterDanger = filterVal;
                    this.filterPriority = 'all';
                } else {
                    this.filterPriority = 'all';
                    this.filterDanger = 'all';
                }

                this.applyFilters();
            });
        });

        // Controles de búsqueda en Pestaña 2 (Detalles)
        const detailSearchInput = this.querySelector('#detailSearchInput');
        const btnGoToDetail = this.querySelector('#btnGoToDetail');
        const btnBackToSummary = this.querySelector('#btnBackToSummary');

        btnGoToDetail.addEventListener('click', () => {
            const id = detailSearchInput.value.trim();
            if (id) {
                const found = this.tickets.find(t => t.ticketId.toLowerCase() === id.toLowerCase());
                if (found) {
                    this.selectTicket(found.ticketId);
                } else {
                    this.showToast('No se encontró ningún ticket con el ID ingresado.', 'error');
                }
            }
        });

        detailSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') btnGoToDetail.click();
        });

        btnBackToSummary.addEventListener('click', () => {
            this.switchTab('tab1');
        });

        // Lightbox
        const lightbox = this.querySelector('#photoLightbox');
        const lightboxClose = this.querySelector('#lightboxClose');
        
        lightboxClose.addEventListener('click', () => lightbox.classList.remove('active'));
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) lightbox.classList.remove('active');
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                lightbox.classList.remove('active');
            }
        });
    }

    switchTab(tabId) {
        this.activeTab = tabId;
        localStorage.setItem('db_active_tab', tabId);

        const tab1Btn = this.querySelector('#tab1Btn');
        const tab2Btn = this.querySelector('#tab2Btn');
        const tab1Content = this.querySelector('#tab1Content');
        const tab2Content = this.querySelector('#tab2Content');

        if (tabId === 'tab1') {
            tab1Btn.classList.add('active');
            tab2Btn.classList.remove('active');
            tab1Content.classList.add('active');
            tab2Content.classList.remove('active');
        } else {
            tab1Btn.classList.remove('active');
            tab2Btn.classList.add('active');
            tab1Content.classList.remove('active');
            tab2Content.classList.add('active');
            
            // Si hay un ticket seleccionado, actualizar el detalle y renderizar el mapa
            if (this.selectedTicketId) {
                this.renderTicketDetail();
            }
        }
    }

    async loadInitialData() {
        // Inicializa la lectura del webhook
        await this.fetchTickets();
    }

    async fetchTickets(isManualSync = false) {
        const tableBody = this.querySelector('#ticketsTableBody');
        const btnSync = this.querySelector('#btnSync');
        
        if (isManualSync) {
            btnSync.disabled = true;
            btnSync.innerHTML = '<span class="spinner"></span> Sincronizando...';
        }
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding: 2rem; color:var(--text-muted);">
                    <span class="spinner"></span> Consultando origen de datos...
                </td>
            </tr>
        `;

        // Funciones de mapeo robustas para columnas de Google Sheets e n8n
        const getVal = (item, keys) => {
            if (!item) return '';
            for (const key of keys) {
                if (item[key] !== undefined && item[key] !== null) return item[key];
            }
            return '';
        };

        const getBoolVal = (item, keys) => {
            const val = getVal(item, keys);
            if (val === undefined || val === null || val === '') return false;
            if (typeof val === 'boolean') return val;
            const s = String(val).toLowerCase();
            return s === 'true' || s === '1' || s === 'sí' || s === 'si';
        };

        // Modo API real
        try {
            // Intentar primero cargar desde archivo JSON local de automatización si existe
            let data = null;
            try {
                const fileResponse = await fetch('./dashboard_data.json');
                if (fileResponse.ok) {
                    data = await fileResponse.json();
                    console.log('Datos cargados exitosamente de dashboard_data.json local');
                }
            } catch (fileErr) {
                // Silencioso, pasamos a n8n
            }

            // Si no se pudo leer localmente, hacer fetch al Webhook de n8n
            if (!data) {
                const apiResponse = await fetch(this.n8nUrl, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                     }
                });
                if (!apiResponse.ok) throw new Error(`HTTP ${apiResponse.status}: ${apiResponse.statusText}`);
                data = await apiResponse.json();
            }

            // Validar que tengamos un arreglo
            if (data) {
                const items = Array.isArray(data) ? data : [data];
                // Sanitizar y mapear campos faltantes con valores por defecto
                this.tickets = items.map(rawItem => {
                    // Si el objeto viene con la envoltura 'json' típica de n8n, la desenvolvemos defensivamente
                    const item = (rawItem && rawItem.json) ? rawItem.json : rawItem;
                    
                    // Procesar fotografías
                    let photos = [];
                    const photosRaw = getVal(item, ['fotografias', 'Fotografías', 'fotografías', 'fotos', 'Fotos']);
                    if (Array.isArray(photosRaw)) {
                        photos = photosRaw;
                    } else if (typeof photosRaw === 'string' && photosRaw.trim()) {
                        try {
                            if (photosRaw.startsWith('[')) {
                                photos = JSON.parse(photosRaw);
                            } else {
                                photos = photosRaw.split(',').map(url => {
                                    const u = url.trim();
                                    if (u.startsWith('data:')) {
                                        return { base64: u, nombre: 'foto' };
                                    } else {
                                        return { url: u, nombre: u.split('/').pop() || 'foto' };
                                    }
                                });
                            }
                        } catch (e) {
                            photos = [{ url: photosRaw, nombre: 'evidencia' }];
                        }
                    }

                    // --- Mapeo de severidad a prioridad ---
                    const severidadRaw = getVal(item, ['severidad', 'Severidad']) || '';
                    let prioridadMapeada = 'Media';
                    const sev = severidadRaw.toLowerCase();
                    if (sev === 'crítica' || sev === 'critica' || sev === 'alta') prioridadMapeada = 'Alta';
                    else if (sev === 'media') prioridadMapeada = 'Media';
                    else if (sev === 'baja' || sev === 'ninguno') prioridadMapeada = 'Baja';

                    // --- Mapeo de inseguridad/riesgo como "peligro inminente" ---
                    const inseguridadVal = getBoolVal(item, ['Inseguridad y riesgo público', 'inseguridadRiesgoPublico', 'Inseguridad y riesgo público – Hurtos, robos, riñas o presencia de vendedores no autorizados en buses o estaciones.']);
                    const peligroMapeado = inseguridadVal ? 'Sí' : 'No';

                    // --- Validación de coordenadas: verificar que ambas existan y sean similares ---
                    const coordManualRaw = getVal(item, ['Coordenadas (ingreso manual)', 'coordenadasManual', 'coordenadas_manual']) || '';
                    const coordAPIRaw   = getVal(item, ['Coordenadas por API (teléfono)', 'coordenadasAPI', 'coordenadas_api']) || '';
                    const validacionCoords = (coordManualRaw && coordAPIRaw) ? 'Validada' : (coordManualRaw || coordAPIRaw ? 'Parcial' : 'No verificada');

                    return {
                        ticketId: getVal(item, ['ticketId', 'ticketID', 'Ticket ID']),
                        prioridad: prioridadMapeada,
                        peligro_inminente: peligroMapeado,
                        validacion_coordenadas: validacionCoords,
                        chat_id: getVal(item, ['chat_id', 'chatId', 'Chat ID']) || 'N/A',
                        fechaReporte: getVal(item, ['Fecha de reporte', 'fechaReporte', 'fecha_reporte']) || new Date().toISOString(),
                        nombreCompleto: getVal(item, ['Nombre completo', 'nombreCompleto', 'nombre_completo']) || 'Desconocido',
                        documentoIdentidad: getVal(item, ['Documento de identidad', 'documentoIdentidad']) || 'N/A',
                        direccionFisica: getVal(item, ['Dirección física (contacto)', 'direccionFisica']) || 'No provista',
                        telefono: getVal(item, ['Teléfono', 'telefono']) || 'N/A',
                        correoElectronico: getVal(item, ['Correo electrónico', 'correoElectronico']) || 'N/A',
                        ubicacionExactaSuceso: getVal(item, ['Ubicación exacta del suceso', 'ubicacionExactaSuceso']) || 'No provista',
                        fechaHoraSuceso: getVal(item, ['Fecha y hora del suceso', 'fechaHoraSuceso']) || '',
                        descripcionBreve: getVal(item, ['Descripción breve del hecho', 'descripcionBreve']) || 'Sin descripción',

                        andenesDestruidos: getBoolVal(item, ['Andenes destruidos', 'andenesDestruidos', 'Daños en infraestructura física – Puertas corredizas, barandas, taquillas o baldosas rotas en estaciones/portales.']),
                        alcantarilladoColapsado: getBoolVal(item, ['Alcantarillado colapsado o sin tapas', 'alcantarilladoColapsado', 'Fallas en iluminación o servicios – Estaciones sin luz, tableros informativos apagados o falta de energía.']),
                        senalizacionVialBorrosa: getBoolVal(item, ['Señalización vial borrosa', 'senalizacionVialBorrosa', 'Fallas en torniquetes y validadores – Problemas para recargar tarjetas o pasar por el torniquete.']),
                        acumulacionBasuras: getBoolVal(item, ['Acumulación de basuras', 'acumulacionBasuras', 'Problemas de aseo o ventilación – Buses sucios, acumulación de basura o aire acondicionado apagado/dañado.']),
                        contaminacionVisual: getBoolVal(item, ['Contaminación visual', 'contaminacionVisual', 'Fallas mecánicas o técnicas en ruta – Bus articulado, padrón o alimentador varado o con fallas visibles.']),
                        deficitZonasVerdes: getBoolVal(item, ['Déficit de zonas verdes', 'deficitZonasVerdes', 'Vandalismo o daños internos en buses – Vidrios rotos, sillas rayadas, sueltas o timbres dañados.']),
                        inseguridadRiesgoPublico: inseguridadVal,
                        contaminacionAcustica: getBoolVal(item, ['Contaminación acústica', 'contaminacionAcustica', 'Invasión del carril exclusivo – Vehículos particulares, motos o taxis transitando por la vía del Metrolínea.']),
                        viviendasRuinas: getBoolVal(item, ['Viviendas o edificaciones en ruinas', 'viviendasRuinas', 'Accidentes o imprudencias viales – Choques, frenazos bruscos o incidentes en cruces peatonales de la ruta.']),

                        descripcionAdicional: getVal(item, ['Descripción adicional del daño y pretensiones', 'descripcionAdicional']),
                        coordenadasManual: coordManualRaw,
                        coordenadasAPI: coordAPIRaw,
                        observacionesAdicionales: getVal(item, ['Observaciones adicionales', 'observacionesAdicionales']),
                        fotografias: photos,
                        rowNumber: getVal(item, ['row_number', 'rowNumber']),
                        categoriaIa: getVal(item, ['categoriaDano', 'categoriaIa', 'categoria_ia']),
                        confianza: getVal(item, ['confianzaIA', 'confianza', 'confianza_ia']),
                        resumenIa: getVal(item, ['justificacion', 'resumenIa', 'resumen_ia']),
                        estadoTicket: getVal(item, ['estadoTicket', 'estado_ticket']) || 'Pendiente',
                        severidad: severidadRaw
                    };
                });
                this.onDataLoaded(isManualSync, 'API');
            } else {
                throw new Error('Formato de datos no válido');
            }

        } catch (err) {
            console.error('Error al obtener datos reales:', err);
            this.showToast(`Error de conexión con n8n. Verifique que el Webhook GET esté activo.`, 'error');
            
            // En caso de fallo de carga limpia
            this.tickets = [];
            this.filteredTickets = [];
            this.updateStats();
            
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding: 2rem; color:var(--error); font-weight: 500;">
                        ⚠️ Error al cargar datos. Verifique la conexión con la API de n8n.
                    </td>
                </tr>
            `;
        } finally {
            if (isManualSync) {
                btnSync.disabled = false;
                btnSync.innerHTML = '🔄 Sincronizar Datos';
            }
        }
    }

    onDataLoaded(isSyncAlert = false, source = '') {
        this.updateStats();
        this.applyFilters();
        
        // Si hay un ticket preseleccionado, verificar si sigue existiendo en el nuevo dataset
        if (this.selectedTicketId) {
            const stillExists = this.tickets.some(t => t.ticketId === this.selectedTicketId);
            if (!stillExists) {
                this.selectedTicketId = this.tickets.length > 0 ? this.tickets[0].ticketId : null;
                if (this.selectedTicketId) {
                    localStorage.setItem('db_selected_ticket_id', this.selectedTicketId);
                } else {
                    localStorage.removeItem('db_selected_ticket_id');
                }
            }
        } else if (this.tickets.length > 0) {
            // Por defecto seleccionar el primero si no hay ninguno seleccionado
            this.selectedTicketId = this.tickets[0].ticketId;
            localStorage.setItem('db_selected_ticket_id', this.selectedTicketId);
        }

        if (this.activeTab === 'tab2') {
            this.renderTicketDetail();
        }

        if (isSyncAlert) {
            this.showToast(`Datos actualizados correctamente desde n8n`, 'success');
        }
    }

    updateStats() {
        const total = this.tickets.length;
        const alta = this.tickets.filter(t => t.prioridad.toLowerCase() === 'alta').length;
        const peligro = this.tickets.filter(t => t.peligro_inminente.toLowerCase() === 'sí' || t.peligro_inminente.toLowerCase() === 'si').length;
        const coords = this.tickets.filter(t => {
            const val = t.validacion_coordenadas.toLowerCase();
            return val.includes('válida') || val.includes('valida') || val.includes('coincide');
        }).length;

        this.querySelector('#valTotal').textContent = total;
        this.querySelector('#valAlta').textContent = alta;
        this.querySelector('#valPeligro').textContent = peligro;
        this.querySelector('#valCoords').textContent = coords;
    }

    applyFilters() {
        this.filteredTickets = this.tickets.filter(t => {
            // Filtro por prioridad
            if (this.filterPriority !== 'all' && t.prioridad !== this.filterPriority) {
                return false;
            }
            
            // Filtro por peligro inminente
            if (this.filterDanger !== 'all') {
                const dangerText = t.peligro_inminente.toLowerCase();
                const targetText = this.filterDanger.toLowerCase();
                if (targetText === 'sí' || targetText === 'si') {
                    if (dangerText !== 'sí' && dangerText !== 'si') return false;
                } else {
                    if (dangerText === 'sí' || dangerText === 'si') return false;
                }
            }

            // Filtro de búsqueda textual (Ticket ID, nombre solicitante, descripción corta)
            if (this.searchQuery.trim()) {
                const query = this.searchQuery.toLowerCase();
                const id = t.ticketId.toLowerCase();
                const name = t.nombreCompleto.toLowerCase();
                const desc = t.descripcionBreve.toLowerCase();
                if (!id.includes(query) && !name.includes(query) && !desc.includes(query)) {
                    return false;
                }
            }

            return true;
        });

        this.renderTable();
    }

    renderTable() {
        const tableBody = this.querySelector('#ticketsTableBody');
        
        if (this.filteredTickets.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding: 2rem; color:var(--text-muted);">
                        No hay reportes cargados en la lista.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.filteredTickets.map(t => {
            // Formatear la fecha
            let formattedDate = 'N/A';
            try {
                if (t.fechaReporte) {
                    const date = new Date(t.fechaReporte);
                    formattedDate = date.toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    }) + ' ' + date.toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            } catch (e) {
                formattedDate = t.fechaReporte;
            }

            // Badge de prioridad
            let pClass = 'badge-baja';
            if (t.prioridad.toLowerCase() === 'alta') pClass = 'badge-alta';
            if (t.prioridad.toLowerCase() === 'media') pClass = 'badge-media';
            const badgePrioridad = `<span class="badge ${pClass}">${t.prioridad}</span>`;

            // Badge de peligro inminente
            const isDanger = t.peligro_inminente.toLowerCase() === 'sí' || t.peligro_inminente.toLowerCase() === 'si';
            const badgePeligro = `<span class="badge ${isDanger ? 'badge-peligro-si' : 'badge-peligro-no'}">${t.peligro_inminente}</span>`;

            // Badge de validacion coordenadas
            const valCoords = t.validacion_coordenadas.toLowerCase();
            let cClass = 'badge-warning';
            if (valCoords.includes('válida') || valCoords.includes('valida') || valCoords.includes('coincide')) cClass = 'badge-valida';
            if (valCoords.includes('discrepancia') || valCoords.includes('inválida') || valCoords.includes('invalida')) cClass = 'badge-invalida';
            const badgeCoords = `<span class="badge ${cClass}">${t.validacion_coordenadas}</span>`;

            // Fila seleccionada
            const isSelected = t.ticketId === this.selectedTicketId;

            return `
                <tr class="${isSelected ? 'selected-row' : ''}" style="cursor:pointer;" data-id="${t.ticketId}">
                    <td class="info-value mono" style="font-weight:600; color:var(--accent);">${t.ticketId}</td>
                    <td>${formattedDate}</td>
                    <td>${t.nombreCompleto}</td>
                    <td>${badgePrioridad}</td>
                    <td>${badgePeligro}</td>
                    <td>${badgeCoords}</td>
                    <td class="info-value mono">${t.chat_id}</td>
                    <td style="text-align:center;">
                        <button class="btn btn-secondary btn-sm btn-action" data-id="${t.ticketId}" style="padding: 0.35rem 0.7rem; font-size: 0.8rem; height: 30px;">
                            👁️ Ver Detalle
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Adjuntar eventos de clic en filas y botones de acción
        tableBody.querySelectorAll('tr').forEach(row => {
            row.addEventListener('click', (e) => {
                // Si hizo clic en el botón de acción, ya tiene su propio listener
                if (e.target.closest('.btn-action')) return;
                
                const id = row.dataset.id;
                if (id) {
                    this.selectTicket(id);
                }
            });
        });

        tableBody.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                if (id) {
                    this.selectTicket(id);
                }
            });
        });
    }

    selectTicket(id) {
        this.selectedTicketId = id;
        localStorage.setItem('db_selected_ticket_id', id);
        
        // Actualizar la fila seleccionada visualmente en la pestaña 1
        this.renderTable();

        // Ir a la pestaña 2 y renderizar
        this.switchTab('tab2');
        
        // Poner el ID en el input del buscador de la pestaña 2
        this.querySelector('#detailSearchInput').value = id;
    }

    renderTicketDetail() {
        const container = this.querySelector('#ticketDetailContainer');
        const ticket = this.tickets.find(t => t.ticketId === this.selectedTicketId);

        if (!ticket) {
            container.innerHTML = `
                <div class="empty-detail-state">
                    <div class="icon">🔍</div>
                    <h2>Ticket No Encontrado</h2>
                    <p>No se pudieron recuperar los detalles del ticket con ID: <strong>${this.selectedTicketId}</strong>.</p>
                    <button class="btn btn-primary" id="btnResetDetailSearch">Volver a Selección</button>
                </div>
            `;
            const btnReset = container.querySelector('#btnResetDetailSearch');
            btnReset.addEventListener('click', () => {
                this.selectedTicketId = null;
                localStorage.removeItem('db_selected_ticket_id');
                this.switchTab('tab1');
            });
            return;
        }

        // Formatear fechas
        const formatDate = (dateStr) => {
            if (!dateStr) return 'N/A';
            try {
                const date = new Date(dateStr);
                return date.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                }) + ' a las ' + date.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                return dateStr;
            }
        };

        const formatSucesoDate = (dateStr) => {
            if (!dateStr) return 'N/A';
            // datetime-local retorna YYYY-MM-DDTHH:MM
            try {
                const date = new Date(dateStr);
                return date.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }) + ' - ' + date.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                return dateStr;
            }
        };

        // Crear badges para detalles
        let pClass = 'badge-baja';
        if (ticket.prioridad.toLowerCase() === 'alta') pClass = 'badge-alta';
        if (ticket.prioridad.toLowerCase() === 'media') pClass = 'badge-media';
        const badgePrioridad = `<span class="badge ${pClass}">${ticket.prioridad}</span>`;

        const isDanger = ticket.peligro_inminente.toLowerCase() === 'sí' || ticket.peligro_inminente.toLowerCase() === 'si';
        const badgePeligro = `<span class="badge ${isDanger ? 'badge-peligro-si' : 'badge-peligro-no'}">Peligro Inminente: ${ticket.peligro_inminente}</span>`;

        // Generar lista de checkboxes de afectaciones
        const renderCheckboxesList = () => {
            const categories = [
                { id: 'andenesDestruidos', label: 'Daños en estaciones/portales', val: ticket.andenesDestruidos },
                { id: 'alcantarilladoColapsado', label: 'Fallas de iluminación/energía', val: ticket.alcantarilladoColapsado },
                { id: 'senalizacionVialBorrosa', label: 'Fallas en validadores/torniquetes', val: ticket.senalizacionVialBorrosa },
                { id: 'acumulacionBasuras', label: 'Problemas de aseo/ventilación en bus', val: ticket.acumulacionBasuras },
                { id: 'contaminacionVisual', label: 'Falla mecánica/técnica en ruta', val: ticket.contaminacionVisual },
                { id: 'deficitZonasVerdes', label: 'Vandalismo/daños internos en bus', val: ticket.deficitZonasVerdes },
                { id: 'inseguridadRiesgoPublico', label: 'Inseguridad en bus o estación', val: ticket.inseguridadRiesgoPublico },
                { id: 'contaminacionAcustica', label: 'Invasión de carril exclusivo', val: ticket.contaminacionAcustica },
                { id: 'viviendasRuinas', label: 'Accidente o imprudencia vial', val: ticket.viviendasRuinas },
            ];

            return categories.map(cat => {
                return `
                    <div class="damage-check-card ${cat.val ? 'checked' : ''}">
                        <span class="status-icon">${cat.val ? '❌' : '✅'}</span>
                        <span>${cat.label}</span>
                    </div>
                `;
            }).join('');
        };

        // Renderizar Fotografías
        const renderPhotosList = () => {
            if (!ticket.fotografias || ticket.fotografias.length === 0) {
                return `<p style="grid-column: 1 / -1; text-align:center; padding: 1.5rem; color:var(--text-muted); background:var(--bg-primary); border: 1px dashed var(--border); border-radius:var(--radius);">No se adjuntaron fotografías en este reporte.</p>`;
            }

            return ticket.fotografias.map((foto, index) => {
                // Soporta 'base64', 'url' o 'data'
                let src = '';
                if (foto.base64) {
                    src = foto.base64;
                } else if (foto.url) {
                    src = foto.url;
                } else if (foto.data) {
                    src = foto.data;
                } else {
                    // Si no tiene datos binarios, dibujar un fallback visual de Leaflet/Foto
                    src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%237c8088" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                }

                return `
                    <div class="photo-card" data-index="${index}">
                        <img src="${src}" alt="${foto.nombre || 'Fotografía ' + (index+1)}" title="Hacer clic para ampliar">
                        <div class="photo-caption">${foto.nombre || 'Prueba ' + (index + 1)}</div>
                    </div>
                `;
            }).join('');
        };

        // Crear badge de estado del ticket
        let eClass = 'badge-warning';
        if (ticket.estadoTicket && (ticket.estadoTicket.toLowerCase().includes('resuelto') || ticket.estadoTicket.toLowerCase().includes('solucionado') || ticket.estadoTicket.toLowerCase().includes('cerrado'))) {
            eClass = 'badge-valida';
        } else if (ticket.estadoTicket && (ticket.estadoTicket.toLowerCase().includes('proceso') || ticket.estadoTicket.toLowerCase().includes('pendiente') || ticket.estadoTicket.toLowerCase().includes('abierto'))) {
            eClass = 'badge-warning';
        } else if (ticket.estadoTicket && (ticket.estadoTicket.toLowerCase().includes('rechazado') || ticket.estadoTicket.toLowerCase().includes('cancelado') || ticket.estadoTicket.toLowerCase().includes('invalido'))) {
            eClass = 'badge-invalida';
        }
        const badgeEstado = ticket.estadoTicket ? `<span class="badge ${eClass}">Estado: ${ticket.estadoTicket}</span>` : '';

        // Calcular discrepancia de coordenadas
        let coordsManual = ticket.coordenadasManual || '';
        let coordsAPI = ticket.coordenadasAPI || '';
        let matchText = 'No verificado';
        let matchClass = 'badge-warning';
        let matchDetails = '';

        const parseCoords = (str) => {
            if (!str) return null;
            const parts = str.split(',').map(s => parseFloat(s.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                return { lat: parts[0], lng: parts[1] };
            }
            return null;
        };

        const locManual = parseCoords(coordsManual);
        const locAPI = parseCoords(coordsAPI);

        if (locManual && locAPI) {
            const distance = this.calculateDistance(locManual.lat, locManual.lng, locAPI.lat, locAPI.lng);
            if (distance < 15) {
                matchText = 'Coinciden';
                matchClass = 'badge-valida';
                matchDetails = '📍 Coordenadas de ingreso manual y GPS coinciden exactamente.';
            } else {
                matchText = `Discrepancia (${Math.round(distance)}m)`;
                matchClass = 'badge-invalida';
                matchDetails = `⚠️ Alerta: Existe una discrepancia de ${Math.round(distance)} metros entre el GPS y lo marcado.`;
            }
        } else if (locManual) {
            matchText = 'Solo Manual';
            matchClass = 'badge-warning';
            matchDetails = 'ℹ️ El ticket solo contiene coordenadas ingresadas manualmente. No hay reporte GPS.';
        } else {
            matchText = 'Sin coordenadas';
            matchClass = 'badge-invalida';
            matchDetails = '❌ Este reporte no cuenta con coordenadas válidas registradas.';
        }

        container.innerHTML = `
            <!-- Encabezado de detalles -->
            <div class="detail-header">
                <div class="detail-ticket-info">
                    <h2>${ticket.ticketId}</h2>
                    <p>Reportado el: ${formatDate(ticket.fechaReporte)}</p>
                </div>
                <div class="detail-meta-badges">
                    ${badgeEstado}
                    ${badgePrioridad}
                    ${badgePeligro}
                    <span class="badge ${matchClass}">Validación: ${matchText}</span>
                </div>
            </div>

            <!-- Grilla Principal -->
            <div class="detail-grid">
                <!-- Columna 1: Solicitante e Información general -->
                <div class="detail-section">
                    <h3>👤 Datos del Solicitante</h3>
                    <div class="info-list">
                        <div class="info-item">
                            <span class="info-label">Nombre completo:</span>
                            <span class="info-value" style="font-weight:600;">${ticket.nombreCompleto}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Documento de identidad:</span>
                            <span class="info-value">${ticket.documentoIdentidad}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Dirección física (contacto):</span>
                            <span class="info-value">${ticket.direccionFisica}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Teléfono:</span>
                            <span class="info-value">${ticket.telefono}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Correo electrónico:</span>
                            <span class="info-value">${ticket.correoElectronico}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Telegram / WhatsApp Chat ID:</span>
                            <span class="info-value mono">${ticket.chat_id}</span>
                        </div>
                    </div>
                </div>

                <!-- Columna 2: Suceso y Afectaciones -->
                <div class="detail-section">
                    <h3>📝 Información del Suceso</h3>
                    <div class="info-list">
                        <div class="info-item">
                            <span class="info-label">Ubicación exacta del suceso:</span>
                            <span class="info-value" style="font-weight:500;">${ticket.ubicacionExactaSuceso}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Fecha y hora del suceso (DD/MM/AAAA - HH:MM):</span>
                            <span class="info-value">${formatSucesoDate(ticket.fechaHoraSuceso)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Descripción breve del hecho:</span>
                            <span class="info-value" style="font-style:italic; border-left:3px solid var(--accent); padding-left:0.6rem; color:var(--text-primary);">${ticket.descripcionBreve}</span>
                        </div>
                    </div>
                </div>

                <!-- Fila Completa: Afectaciones Registradas -->
                <div class="detail-section" style="grid-column: 1 / -1;">
                    <h3>🛠️ Afectaciones e Infraestructura Urbana (Exclusivos)</h3>
                    <div class="damages-summary-grid">
                        ${renderCheckboxesList()}
                    </div>
                    <div class="info-list" style="margin-top: 1.5rem; gap: 1rem;">
                        <div class="info-item">
                            <span class="info-label">Descripción adicional del daño y pretensiones:</span>
                            <p class="info-value" style="background:var(--bg-primary); padding: 0.9rem 1.2rem; border-radius:var(--radius-sm); border:1px solid var(--border); white-space:pre-wrap;">${ticket.descripcionAdicional || 'Sin observaciones adicionales sobre el daño.'}</p>
                        </div>
                        ${ticket.observacionesAdicionales ? `
                        <div class="info-item">
                            <span class="info-label">Observaciones adicionales:</span>
                            <p class="info-value" style="background:var(--bg-primary); padding: 0.9rem 1.2rem; border-radius:var(--radius-sm); border:1px solid var(--border); border-left: 3px solid var(--warning); white-space:pre-wrap;">${ticket.observacionesAdicionales}</p>
                        </div>` : ''}
                    </div>
                </div>

                <!-- Fila Completa: Análisis de IA (AI Insights) -->
                <div class="detail-section AI-section" style="grid-column: 1 / -1; ${ticket.resumenIa || ticket.categoriaIa ? '' : 'display:none;'}">
                    <h3>🤖 Análisis de Inteligencia Artificial (AI Insights)</h3>
                    <div class="info-list" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.2rem;">
                        <div class="info-item">
                            <span class="info-label">Categoría asignada:</span>
                            <span class="info-value" style="font-weight:600; color:var(--accent);">${ticket.categoriaIa || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Nivel de Confianza:</span>
                            <span class="info-value" style="font-weight:600;">${ticket.confianza ? `${(parseFloat(ticket.confianza) * 100).toFixed(0)}%` : 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Coherencia Texto-Imagen:</span>
                            <span class="info-value">${ticket.coherenciaTextoImagen || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Fecha de Procesamiento:</span>
                            <span class="info-value mono">${ticket.timestampProcesamiento ? formatDate(ticket.timestampProcesamiento) : 'N/A'}</span>
                        </div>
                        <div class="info-item" style="grid-column: 1 / -1;">
                            <span class="info-label">Palabras clave detectadas:</span>
                            <span class="info-value">${ticket.palabrasClave || 'N/A'}</span>
                        </div>
                        <div class="info-item" style="grid-column: 1 / -1;">
                            <span class="info-label">Resumen Ejecutivo de IA:</span>
                            <p class="info-value" style="background:var(--accent-subtle); padding: 0.9rem 1.2rem; border-radius:var(--radius-sm); border:1px solid var(--accent); color:var(--text-primary); font-style:italic; line-height:1.5;">"${ticket.resumenIa || 'Sin resumen disponible'}"</p>
                        </div>
                    </div>
                </div>

                <!-- Fila Completa: Galería de Fotos -->
                <div class="detail-section photos-section">
                    <h3>📷 Pruebas Fotográficas (Evidencia)</h3>
                    <div class="photos-gallery">
                        ${renderPhotosList()}
                    </div>
                </div>

                <!-- Fila Completa: Geolocalización en Mapa -->
                <div class="detail-section geo-section">
                    <h3>🗺️ Validación Geográfica (Manual vs GPS)</h3>
                    
                    <div class="coords-comparison-box">
                        <div class="coord-indicator manual">
                            <span class="pin-symbol">📍</span>
                            <div class="coord-indicator-text">
                                <h4>Coordenadas Manuales (Rojo)</h4>
                                <p>${coordsManual || 'No registradas'}</p>
                            </div>
                        </div>
                        <div class="coord-indicator api">
                            <span class="pin-symbol">📍</span>
                            <div class="coord-indicator-text">
                                <h4>Coordenadas GPS / API (Azul)</h4>
                                <p>${coordsAPI || 'No registradas'}</p>
                            </div>
                        </div>
                        <div class="coords-match-alert">
                            <span>💡</span>
                            <span>${matchDetails}</span>
                        </div>
                    </div>

                    <div class="map-container" id="detailMapContainer" style="margin: 0; height: 400px;">
                        <div class="map-placeholder" id="detailMapPlaceholder">
                            Cargando mapa interactivo...
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Añadir eventos a las fotos para el Lightbox
        const gallery = container.querySelectorAll('.photo-card');
        gallery.forEach(card => {
            card.addEventListener('click', () => {
                const idx = parseInt(card.dataset.index);
                const foto = ticket.fotografias[idx];
                const lightbox = this.querySelector('#photoLightbox');
                const lightboxImg = this.querySelector('#lightboxImg');
                const lightboxCaption = this.querySelector('#lightboxCaption');

                let src = foto.base64 || foto.url || foto.data || '';
                lightboxImg.src = src;
                lightboxCaption.textContent = foto.nombre || `Prueba Fotográfica ${idx+1}`;
                lightbox.classList.add('active');
            });
        });

        // Inicializar el mapa de Leaflet en el ticket
        // Usar setTimeout para garantizar que el DOM esté renderizado completamente
        setTimeout(() => {
            this.initDetailMap(locManual, locAPI, ticket.ticketId);
        }, 150);
    }

    initDetailMap(locManual, locAPI, ticketId) {
        const mapContainer = this.querySelector('#detailMapContainer');
        const placeholder = this.querySelector('#detailMapPlaceholder');
        const defaultCenter = [4.711, -74.0721]; // Bogotá por defecto

        // Destruir mapa anterior si existía para evitar colisiones
        if (this.detailMap) {
            try {
                this.detailMap.remove();
            } catch (e) {
                console.warn('Error al destruir el mapa anterior:', e);
            }
            this.detailMap = null;
            this.manualMarker = null;
            this.apiMarker = null;
        }

        if (typeof L === 'undefined') {
            if (placeholder) {
                placeholder.innerHTML = '⚠️ Biblioteca Leaflet no disponible. No se puede cargar el mapa.';
            }
            return;
        }

        // Crear mapa
        this.detailMap = L.map(mapContainer).setView(defaultCenter, 14);

        // Capa de OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.detailMap);

        if (placeholder) placeholder.style.display = 'none';

        // Pines SVG personalizados
        const manualIcon = L.divIcon({
            html: `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#e05d5d" stroke="#ffffff" stroke-width="1.5"/>
                </svg>
            `,
            className: 'custom-pin-manual',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });

        const apiIcon = L.divIcon({
            html: `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#5b8cce" stroke="#ffffff" stroke-width="1.5"/>
                </svg>
            `,
            className: 'custom-pin-api',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });

        const group = [];

        // Colocar marcador Manual (Rojo)
        if (locManual) {
            this.manualMarker = L.marker([locManual.lat, locManual.lng], { icon: manualIcon })
                .addTo(this.detailMap)
                .bindPopup(`<b>Ubicación Marcada (Manual)</b><br>Ticket: ${ticketId}`);
            group.push([locManual.lat, locManual.lng]);
        }

        // Colocar marcador API/GPS (Azul)
        if (locAPI) {
            this.apiMarker = L.marker([locAPI.lat, locAPI.lng], { icon: apiIcon })
                .addTo(this.detailMap)
                .bindPopup(`<b>Coordenadas GPS (Teléfono)</b><br>Ticket: ${ticketId}`);
            group.push([locAPI.lat, locAPI.lng]);
        }

        // Si hay una discrepancia y existen ambos, trazar una línea discontinua entre ellos
        if (locManual && locAPI) {
            const distance = this.calculateDistance(locManual.lat, locManual.lng, locAPI.lat, locAPI.lng);
            if (distance >= 5) {
                const line = L.polyline([[locManual.lat, locManual.lng], [locAPI.lat, locAPI.lng]], {
                    color: 'var(--accent)',
                    dashArray: '5, 10',
                    weight: 2
                }).addTo(this.detailMap);
                
                line.bindTooltip(`Distancia: ${Math.round(distance)}m`, { permanent: true, direction: 'center', className: 'map-line-tooltip' });
            }
        }

        // Ajustar vista de mapa para encajar los marcadores
        if (group.length > 0) {
            if (group.length === 1) {
                this.detailMap.setView(group[0], 16);
            } else {
                const bounds = L.latLngBounds(group);
                this.detailMap.fitBounds(bounds, { padding: [40, 40] });
            }
        } else {
            this.detailMap.setView(defaultCenter, 13);
        }

        // Forzar actualización de tamaño para renderizado correcto en Web Component
        setTimeout(() => {
            if (this.detailMap) this.detailMap.invalidateSize();
        }, 150);
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Radio de la tierra en metros
        const phi1 = lat1 * Math.PI/180;
        const phi2 = lat2 * Math.PI/180;
        const deltaPhi = (lat2-lat1) * Math.PI/180;
        const deltaLambda = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // en metros
    }

    showToast(message, type = '') {
        const toast = this.querySelector('#dbToast');
        if (!toast) return;
        toast.className = 'toast ' + type;
        toast.textContent = message;
        toast.classList.add('visible');
        clearTimeout(this._toastTimeout);
        this._toastTimeout = setTimeout(() => {
            toast.classList.remove('visible');
        }, 3500);
    }
}

// Registrar el Web Component
customElements.define('dashboard-view', DashboardView);

// Inicialización de la consola
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard de Reportes y Afectaciones inicializado en dashboard.html.');
});