// js/driver-report.js
// ============================================================
// WEB COMPONENT: <driver-report-form>
// ============================================================

class DriverReportForm extends HTMLElement {
    constructor() {
        super();
        this.driverName = "Juan Diego León";
        this.driverId = this.generateDeterministicDriverId(this.driverName);
        this.currentCoords = null;
        this.n8nWebhookUrl = 'https://emperor-visa-jigsaw.ngrok-free.dev/webhook-test/reporte';
    }

    connectedCallback() {
        this.render();
        this.attachEvents();
        this.autoCaptureDateTime();
        this.autoCaptureGPS();
    }

    // Generate a stable, deterministic but random-looking ID for the name
    generateDeterministicDriverId(name) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        // Normalize hash to a 4 digit number
        const numericPart = Math.abs(hash) % 9000 + 1000;
        return `DRV-${numericPart}`;
    }

    generateTicketId() {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        return `TKT-${datePart}-${randomPart}`;
    }

    render() {
        this.innerHTML = `
            <div class="back-btn-container">
                <a href="index.html" class="back-btn">← Volver al Portal</a>
            </div>
            
            <div class="toolbar">
                <button class="btn btn-ghost toggle-contrast" id="toggleContrast" aria-label="Alternar modo alto contraste" title="Modo alto contraste">
                    ◐ Contraste
                </button>
            </div>

            <div class="form-header driver-header">
                <h1>🚍 Reporte Rápido de Conductores</h1>
                <p>Canal exclusivo de seguridad en ruta de Metrolínea. Captura automática activa.</p>
            </div>

            <form id="driverForm" novalidate>
                <!-- Sección 1: Datos del Conductor (Autocompletados y Protegidos) -->
                <fieldset>
                    <legend>1. Credenciales del Conductor</legend>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="driverNameDisplay">Nombre del Conductor <span class="readonly-indicator">Solo lectura</span></label>
                            <input type="text" id="driverNameDisplay" value="${this.driverName}" readonly class="input-readonly">
                        </div>
                        <div class="form-group">
                            <label for="driverIdDisplay">ID Conductor <span class="readonly-indicator">Solo lectura</span></label>
                            <input type="text" id="driverIdDisplay" value="${this.driverId}" readonly class="input-readonly">
                        </div>
                    </div>
                </fieldset>

                <!-- Sección 2: Captura de Ubicación y Tiempo (Automática) -->
                <fieldset>
                    <legend>2. Registro de Ruta y Tiempo (Automático)</legend>
                    <div class="form-grid">
                        <div class="gps-status-box" id="gpsStatusBox">
                            <div class="status-indicator" id="gpsIndicator">
                                <span class="spinner" style="border-top-color: var(--accent); width: 18px; height: 18px;"></span>
                            </div>
                            <div class="status-text">
                                <h4 id="gpsStatusTitle">Buscando señal GPS...</h4>
                                <p id="gpsStatusDesc">Capturando coordenadas satelitales en tiempo real para seguridad en ruta.</p>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="fechaHoraCaptura">Fecha y Hora de Novedad <span class="readonly-indicator">Automático</span></label>
                            <input type="datetime-local" id="fechaHoraCaptura" readonly class="input-readonly">
                        </div>

                        <div class="form-group">
                            <label for="coordenadasCaptura">Ubicación GPS (Latitud, Longitud) <span class="readonly-indicator">Automático</span></label>
                            <input type="text" id="coordenadasCaptura" placeholder="Esperando GPS..." readonly class="input-readonly">
                        </div>
                    </div>
                </fieldset>

                <!-- Sección 3: Selección de Incidencias en Ruta -->
                <fieldset>
                    <legend>3. Seleccione las Novedades de la Ruta (Multi-selección)</legend>
                    <div class="driver-options-grid" id="driverOptionsContainer">
                        <!-- Creados dinámicamente -->
                    </div>
                    <span class="error-msg" id="optionsError" role="alert" style="display:block; margin-top:0.8rem; color:var(--error); font-size:0.85rem; font-weight:600; text-align:center;"></span>
                </fieldset>

                <!-- Sección 4: Observaciones Rápidas (Opcional) -->
                <fieldset>
                    <legend>4. Detalles Adicionales (Opcional)</legend>
                    <div class="form-grid col-1">
                        <div class="form-group">
                            <label for="observaciones">Observaciones cortas de la novedad</label>
                            <textarea id="observaciones" name="observaciones" placeholder="Escriba aquí si desea añadir algún detalle extra del suceso (ej. número de bus, calle cerrada...)"></textarea>
                        </div>
                    </div>
                </fieldset>

                <button type="submit" class="btn btn-primary btn-full btn-submit-giant" id="btnSubmit">
                    🚀 Enviar Reporte de Inmediato
                </button>
                <div id="submitStatus" style="text-align:center; margin-top:1.2rem; min-height:1.5em; font-weight:600; font-size:1.1rem;"></div>
            </form>
        `;
    }

    attachEvents() {
        const form = this.querySelector('#driverForm');
        const toggleBtn = this.querySelector('#toggleContrast');

        // Toggle alto contraste
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                document.body.classList.toggle('high-contrast');
                const isHC = document.body.classList.contains('high-contrast');
                toggleBtn.textContent = isHC ? '◑ Contraste normal' : '◐ Contraste';
                localStorage.setItem('highContrast', isHC ? '1' : '0');
            });
        }

        // Restaurar modo contraste
        if (localStorage.getItem('highContrast') === '1') {
            document.body.classList.add('high-contrast');
            if (toggleBtn) toggleBtn.textContent = '◑ Contraste normal';
        }

        // Renderizar opciones de conductor
        this.renderDriverOptions();

        // Submit del formulario
        form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    renderDriverOptions() {
        const container = this.querySelector('#driverOptionsContainer');
        const options = [
            { id: 'retrasoVias', title: 'Congestión / Retraso', desc: 'Tráfico pesado, embotellamiento o retrasos en vía', icon: '⏳' },
            { id: 'fallaMecanica', title: 'Falla Mecánica', desc: 'Problemas de motor, llantas o sistema del bus', icon: '🔧' },
            { id: 'accidenteColision', title: 'Choque / Accidente', desc: 'Colisión menor o incidente de tráfico en ruta', icon: '💥' },
            { id: 'altercadoPasajero', title: 'Altercado Pasajero', desc: 'Disputas o problemas de orden público dentro del bus', icon: '🗣️' },
            { id: 'viaBloqueada', title: 'Vía Bloqueada', desc: 'Obras, protestas o desvíos inesperados en el carril', icon: '🚧' },
            { id: 'emergenciaMedica', title: 'Emergencia Médica', desc: 'Pasajero enfermo o requiere asistencia médica', icon: '🚑' },
            { id: 'fallaElectrica', title: 'Falla Eléctrica', desc: 'Problemas de luces, aire acondicionado o pantallas', icon: '⚡' },
            { id: 'validadorDanado', title: 'Validador Dañado', desc: 'El lector de tarjetas o torniquete no responde', icon: '💳' },
            { id: 'vandalismoBus', title: 'Vandalismo en Bus', desc: 'Grafitis, vidrios rotos o sillas dañadas en el interior', icon: '🎨' },
            { id: 'climaAdverso', title: 'Clima Adverso', desc: 'Lluvia intensa, neblina o inundación en la calzada', icon: '🌧️' }
        ];

        options.forEach(opt => {
            const card = document.createElement('div');
            card.className = 'driver-option-card';
            card.id = `card_${opt.id}`;
            card.innerHTML = `
                <input type="checkbox" id="${opt.id}" name="${opt.id}">
                <span class="option-icon">${opt.icon}</span>
                <div class="option-content">
                    <span class="option-title">${opt.title}</span>
                    <span class="option-desc">${opt.desc}</span>
                </div>
            `;

            // Toggle checkbox when card is clicked
            card.addEventListener('click', (e) => {
                const cb = card.querySelector('input[type="checkbox"]');
                if (e.target !== cb) {
                    cb.checked = !cb.checked;
                }
                if (cb.checked) {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
                // Clear validation error if any option is checked
                this.querySelector('#optionsError').textContent = '';
            });

            container.appendChild(card);
        });
    }

    autoCaptureDateTime() {
        const input = this.querySelector('#fechaHoraCaptura');
        if (input) {
            const now = new Date();
            // Format to local ISO-like string: YYYY-MM-DDTHH:MM
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            input.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
    }

    autoCaptureGPS() {
        const statusBox = this.querySelector('#gpsStatusBox');
        const statusTitle = this.querySelector('#gpsStatusTitle');
        const statusDesc = this.querySelector('#gpsStatusDesc');
        const gpsIndicator = this.querySelector('#gpsIndicator');
        const coordInput = this.querySelector('#coordenadasCaptura');

        if (!navigator.geolocation) {
            statusBox.className = 'gps-status-box error';
            statusTitle.textContent = 'GPS no compatible';
            statusDesc.textContent = 'Su navegador o dispositivo no soporta geolocalización automática.';
            gpsIndicator.innerHTML = '⚠️';
            coordInput.value = 'No disponible';
            return;
        }

        // Request geolocation immediately
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                this.currentCoords = { lat, lng };

                statusBox.className = 'gps-status-box success';
                statusTitle.textContent = '📍 GPS Listo (Ubicación Asegurada)';
                statusDesc.textContent = `Coordenadas capturadas con precisión de ${position.coords.accuracy.toFixed(1)}m.`;
                gpsIndicator.innerHTML = '✅';
                coordInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            },
            (error) => {
                console.error('Error al capturar GPS del conductor:', error);
                statusBox.className = 'gps-status-box error';
                statusTitle.textContent = '⚠️ Sin Señal GPS';
                
                let detailMsg = 'Active la ubicación o permita el acceso en su navegador.';
                if (error.code === 1) detailMsg = 'Permiso denegado por el navegador. Habilite permisos GPS.';
                else if (error.code === 2) detailMsg = 'Posición no disponible. Verifique cobertura GPS.';
                else if (error.code === 3) detailMsg = 'Tiempo de espera agotado al conectar al satélite.';

                statusDesc.textContent = `${detailMsg} Puede enviar el reporte sin coordenadas.`;
                gpsIndicator.innerHTML = '❌';
                coordInput.value = 'No disponible';
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
    }

    validateForm() {
        // Must select at least one incident checkbox
        const checked = this.querySelectorAll('.driver-options-grid input[type="checkbox"]:checked');
        const errSpan = this.querySelector('#optionsError');
        if (checked.length === 0) {
            errSpan.textContent = '⚠️ Debe seleccionar al menos una novedad de la lista para poder enviar el reporte.';
            return false;
        }
        errSpan.textContent = '';
        return true;
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            this.showToast('Seleccione al menos una novedad.', 'error');
            return;
        }

        const btnSubmit = this.querySelector('#btnSubmit');
        const statusEl = this.querySelector('#submitStatus');
        
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner"></span> Enviando Reporte de Inmediato...';
        statusEl.innerHTML = '';

        // Build Payload
        const ticketId = this.generateTicketId();
        const dateInput = this.querySelector('#fechaHoraCaptura').value;
        const observations = this.querySelector('#observaciones').value.trim();
        const coordsInput = this.querySelector('#coordenadasCaptura').value;

        // Collect all checkboxes states
        const incidentData = {};
        const checkboxes = this.querySelectorAll('.driver-options-grid input[type="checkbox"]');
        checkboxes.forEach(cb => {
            incidentData[cb.id] = cb.checked;
        });

        const payload = {
            ticketId: ticketId,
            fechaReporte: new Date().toISOString(),
            tipoUsuario: 'Conductor',
            nombreCompleto: this.driverName,
            idConductor: this.driverId,
            fechaHoraSuceso: dateInput,
            coordenadasAPI: coordsInput === 'No disponible' ? '' : coordsInput,
            observacionesAdicionales: observations,
            ...incidentData
        };

        console.log('Enviando reporte de conductor:', payload);

        try {
            // Immediate POST request using fetch
            const response = await fetch(this.n8nWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.showToast(`✅ Reporte enviado con éxito. Ticket: ${ticketId}`, 'success');
            statusEl.innerHTML = `<span style="color:var(--success);">¡Reporte Enviado con Éxito!<br>Ticket ID: ${ticketId}</span>`;

            // Reset form
            this.querySelector('#driverForm').reset();
            // Reset visual selections
            this.querySelectorAll('.driver-option-card').forEach(card => card.classList.remove('selected'));
            
            // Recapture date/time and GPS for subsequent entries
            this.autoCaptureDateTime();
            this.autoCaptureGPS();
        } catch (err) {
            console.error('Error al enviar reporte de conductor:', err);
            this.showToast('Error al enviar. Revise su conexión.', 'error');
            statusEl.innerHTML = `<span style="color:var(--error);">Error de envío: ${err.message}. Revise el webhook de n8n.</span>`;
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '🚀 Enviar Reporte de Inmediato';
        }
    }

    showToast(message, type = '') {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }
        toast.className = 'toast ' + type;
        toast.textContent = message;
        toast.classList.add('visible');
        clearTimeout(this._toastTimeout);
        this._toastTimeout = setTimeout(() => {
            toast.classList.remove('visible');
        }, 4000);
    }
}

// Registrar el componente
customElements.define('driver-report-form', DriverReportForm);

// Inicializar en DOMContentLoaded si es necesario
document.addEventListener('DOMContentLoaded', () => {
    console.log('Módulo de reportes rápidos de conductor inicializado.');
});
