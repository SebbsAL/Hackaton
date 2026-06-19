// js/app.js
// ============================================================
// WEB COMPONENT: <report-form>
// ============================================================
class ReportForm extends HTMLElement {
    constructor() {
        super();
        this.map = null;
        this.marker = null;
        this.attachedPhotos = [];
        this.n8nWebhookUrl = 'https://hackaton2026.app.n8n.cloud/webhook/reporte';
    }

    connectedCallback() {
        this.render();
        this.attachEvents();
        this.initMap();
        this.initDateConstraints();
        this.loadFormState();
    }

    render() {
        this.innerHTML = `
            <div class="toolbar">
                <button class="btn btn-ghost toggle-contrast" id="toggleContrast" aria-label="Alternar modo alto contraste" title="Modo alto contraste">
                    ◐ Contraste
                </button>
            </div>
            <div class="form-header">
                <h1>📋 Reporte de Daños o Afectaciones en Metrolínea</h1>
                <p>Todos los campos son obligatorios. Complete la información con precisión.</p>
            </div>
            <form id="reportForm" novalidate>
                <!-- Sección 1: Datos del Solicitante -->
                <fieldset>
                    <legend>1. Datos del Solicitante</legend>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="nombreCompleto">Nombre completo <span class="required">*</span></label>
                            <input type="text" id="nombreCompleto" name="nombreCompleto" placeholder="Ej. Juan Pérez García" required autocomplete="name">
                            <span class="error-msg" role="alert">Campo obligatorio</span>
                        </div>
                        <div class="form-group">
                            <label for="documentoIdentidad">Documento de identidad <span class="required">*</span></label>
                            <input type="text" id="documentoIdentidad" name="documentoIdentidad" placeholder="Número de identificación" required autocomplete="off">
                            <span class="error-msg" role="alert">Campo obligatorio</span>
                        </div>
                        <div class="form-group">
                            <label for="direccionFisica">Dirección física (contacto) <span class="required">*</span></label>
                            <input type="text" id="direccionFisica" name="direccionFisica" placeholder="Para notificaciones" required autocomplete="street-address">
                            <span class="error-msg" role="alert">Campo obligatorio</span>
                        </div>
                        <div class="form-group">
                            <label for="telefono">Teléfono <span class="required">*</span></label>
                            <input type="tel" id="telefono" name="telefono" placeholder="Número de contacto" required autocomplete="tel">
                            <span class="error-msg" role="alert">Campo obligatorio</span>
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label for="correoElectronico">Correo electrónico <span class="required">*</span></label>
                            <input type="email" id="correoElectronico" name="correoElectronico" placeholder="correo@ejemplo.com" required autocomplete="email">
                            <span class="error-msg" role="alert">Correo electrónico válido obligatorio</span>
                        </div>
                    </div>
                </fieldset>

                <!-- Sección 2: Información del Suceso -->
                <fieldset>
                    <legend>2. Información del Suceso</legend>
                    <div class="form-grid">
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label for="ubicacionExactaSuceso">Ubicación exacta del suceso <span class="required">*</span></label>
                            <input type="text" id="ubicacionExactaSuceso" name="ubicacionExactaSuceso" placeholder="Dirección, barrio, localidad o puntos de referencia" required>
                            <span class="error-msg" role="alert">Campo obligatorio</span>
                        </div>
                        <div class="form-group">
                            <label for="fechaHoraSuceso">Fecha y hora del suceso <span class="required">*</span></label>
                            <span class="field-convention" style="display:block; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.3rem;">
                                Convención: DD/MM/AAAA - HH:MM (Día/Mes/Año - Hora:Minutos. Año de 4 dígitos, no del futuro).
                            </span>
                            <input type="datetime-local" id="fechaHoraSuceso" name="fechaHoraSuceso" required>
                            <span class="error-msg" role="alert">Campo obligatorio</span>
                        </div>
                        <div class="form-group">
                            <label for="descripcionBreve">Descripción breve del hecho <span class="required">*</span></label>
                            <textarea id="descripcionBreve" name="descripcionBreve" placeholder="Ej. caída en un hueco, daño al vehículo por bache..." required></textarea>
                            <span class="error-msg" role="alert">Campo obligatorio</span>
                        </div>
                    </div>
                </fieldset>

                <!-- Sección 3: Pretensiones y Daños -->
                <fieldset>
                    <legend>3. Pretensiones y Daños</legend>
                    <div class="form-grid col-1">
                        <div class="form-group">
                            <label style="font-weight:700;color:var(--text-primary);">Infraestructura de Estaciones y Portales Metrolínea</label>
                            <div class="checkbox-group" id="infraestructuraVial"></div>
                        </div>
                        <div class="form-group">
                            <label style="font-weight:700;color:var(--text-primary);">Estado y Funcionamiento de los Buses</label>
                            <div class="checkbox-group" id="medioAmbiente"></div>
                        </div>
                        <div class="form-group">
                            <label style="font-weight:700;color:var(--text-primary);">Operación en Vía y Seguridad</label>
                            <div class="checkbox-group" id="riesgosUrbanos"></div>
                        </div>
                        <div class="form-group">
                            <label for="descripcionAdicional">Descripción adicional del daño y pretensiones <span class="required">*</span></label>
                            <textarea id="descripcionAdicional" name="descripcionAdicional" placeholder="Amplíe la información o indique reparación, compensación o acción solicitada" required></textarea>
                            <span class="error-msg" role="alert">Campo obligatorio</span>
                        </div>
                    </div>
                </fieldset>

                <!-- Sección 4: Pruebas y Soportes -->
                <fieldset>
                    <legend>4. Pruebas y Soportes (Evidencia)</legend>
                    <div class="form-grid col-1">
                        <div class="form-group">
                            <label>Fotografías del lugar exacto <span class="required">*</span></label>
                            <div class="file-upload-area" id="fileUploadArea" role="button" tabindex="0" aria-label="Subir fotografías">
                                <div class="icon">📸</div>
                                <p>Haga clic o arrastre imágenes aquí</p>
                                <p style="font-size:0.8rem;color:var(--text-muted);">Máx. 5 imágenes. Formatos: JPG, PNG, WebP</p>
                                <input type="file" id="fotografias" name="fotografias" accept="image/*" multiple>
                            </div>
                            <div class="file-preview" id="filePreview"></div>
                            <span class="error-msg" role="alert" id="fotoError">Debe adjuntar al menos una fotografía</span>
                        </div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="coordenadasManual">Coordenadas (ingreso manual)</label>
                                <div style="display: flex; gap: 0.5rem;">
                                    <input type="text" id="coordenadasManual" name="coordenadasManual" placeholder="Latitud, Longitud (ej. 4.7110, -74.0721)" style="flex: 1; min-width: 0;">
                                    <button type="button" class="btn btn-secondary" id="btnUbicarManual" style="padding: 0 1rem; height: 42px; margin-top: 0; display: flex; align-items: center; justify-content: center;" title="Ubicar coordenadas en el mapa">📍 Ubicar</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="coordenadasAPI">Coordenadas por API (teléfono/GPS)</label>
                                <input type="text" id="coordenadasAPI" name="coordenadasAPI" placeholder="Se obtendrán automáticamente" readonly>
                            </div>
                        </div>
                        <div class="coord-buttons">
                            <button type="button" class="btn btn-secondary" id="btnUbicacionAuto">📍 Usar mi ubicación (GPS)</button>
                            <button type="button" class="btn btn-ghost" id="btnLimpiarMapa">✕ Limpiar marcador</button>
                        </div>
                        <div class="map-container" id="mapContainer">
                            <div class="map-placeholder" id="mapPlaceholder">Cargando mapa... Asegúrese de configurar la API Key de Google Maps.</div>
                        </div>
                        <div class="form-group">
                            <label for="observacionesAdicionales">Observaciones adicionales</label>
                            <textarea id="observacionesAdicionales" name="observacionesAdicionales" placeholder="Cualquier información complementaria"></textarea>
                        </div>
                    </div>
                </fieldset>

                <button type="submit" class="btn btn-primary btn-full btn-lg" id="btnSubmit">
                    🚀 Enviar reporte
                </button>
                <div id="submitStatus" style="text-align:center;margin-top:0.8rem;min-height:1.5em;"></div>
            </form>
        `;
    }

    attachEvents() {
        const form = this.querySelector('#reportForm');
        const toggleBtn = this.querySelector('#toggleContrast');
        const fileArea = this.querySelector('#fileUploadArea');
        const fileInput = this.querySelector('#fotografias');
        const btnUbicacion = this.querySelector('#btnUbicacionAuto');
        const btnLimpiar = this.querySelector('#btnLimpiarMapa');
        const coordManual = this.querySelector('#coordenadasManual');
        const btnUbicarManual = this.querySelector('#btnUbicarManual');

        // Modo alto contraste
        toggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('high-contrast');
            const isHC = document.body.classList.contains('high-contrast');
            toggleBtn.textContent = isHC ? '◑ Contraste normal' : '◐ Contraste';
            localStorage.setItem('highContrast', isHC ? '1' : '0');
        });

        // Restaurar preferencia
        if (localStorage.getItem('highContrast') === '1') {
            document.body.classList.add('high-contrast');
            toggleBtn.textContent = '◑ Contraste normal';
        }

        // File upload
        fileArea.addEventListener('click', () => fileInput.click());
        fileArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // Drag & drop
        fileArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileArea.classList.add('drag-over');
        });
        fileArea.addEventListener('dragleave', () => fileArea.classList.remove('drag-over'));
        fileArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileArea.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });

        // Botones de ubicación
        btnUbicacion.addEventListener('click', () => this.getCurrentPosition());
        btnLimpiar.addEventListener('click', () => this.clearMarker());

        // Coordenadas manuales -> actualizar mapa
        coordManual.addEventListener('change', () => this.updateMarkerFromCoords(coordManual.value));
        coordManual.addEventListener('input', () => this.updateMarkerFromCoords(coordManual.value));
        btnUbicarManual.addEventListener('click', () => this.updateMarkerFromCoords(coordManual.value));

        // Submit
        form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Validación en tiempo real
        form.querySelectorAll('input, textarea, select').forEach(el => {
            el.addEventListener('blur', () => this.validateField(el));
            el.addEventListener('input', () => {
                if (el.closest('.form-group.error')) this.validateField(el);
            });
        });

        // Guardado automático en localStorage al escribir o cambiar
        form.querySelectorAll('input:not([type="file"]), textarea, select').forEach(el => {
            el.addEventListener('input', () => this.saveFormState());
            el.addEventListener('change', () => this.saveFormState());
        });

        // Exclusión mutua de checkboxes (sólo permitir una opción seleccionada a la vez)
        const checkboxSelector = '#infraestructuraVial input[type="checkbox"], #medioAmbiente input[type="checkbox"], #riesgosUrbanos input[type="checkbox"]';
        form.addEventListener('change', (e) => {
            if (e.target && e.target.matches(checkboxSelector) && e.target.checked) {
                const allCheckboxes = this.querySelectorAll(checkboxSelector);
                allCheckboxes.forEach(cb => {
                    if (cb !== e.target) {
                        cb.checked = false;
                    }
                });
            }
        });

        // Poblar checkboxes
        this.populateCheckboxes();
    }

    populateCheckboxes() {
        const infraestructura = [
            { id: 'andenesDestruidos', label: 'Daños en infraestructura física – Puertas corredizas, barandas, taquillas o baldosas rotas en estaciones/portales.' },
            { id: 'alcantarilladoColapsado', label: 'Fallas en iluminación o servicios – Estaciones sin luz, tableros informativos apagados o falta de energía.' },
            { id: 'senalizacionVialBorrosa', label: 'Fallas en torniquetes y validadores – Problemas para recargar tarjetas o pasar por el torniquete.' },
        ];
        const medioAmbiente = [
            { id: 'acumulacionBasuras', label: 'Problemas de aseo o ventilación – Buses sucios, acumulación de basura o aire acondicionado apagado/dañado.' },
            { id: 'contaminacionVisual', label: 'Fallas mecánicas o técnicas en ruta – Bus articulado, padrón o alimentador varado o con fallas visibles.' },
            { id: 'deficitZonasVerdes', label: 'Vandalismo o daños internos en buses – Vidrios rotos, sillas rayadas, sueltas o timbres dañados.' },
        ];
        const riesgos = [
            { id: 'inseguridadRiesgoPublico', label: 'Inseguridad y riesgo público – Hurtos, robos, riñas o presencia de vendedores no autorizados en buses o estaciones.' },
            { id: 'contaminacionAcustica', label: 'Invasión del carril exclusivo – Vehículos particulares, motos o taxis transitando por la vía del Metrolínea.' },
            { id: 'viviendasRuinas', label: 'Accidentes o imprudencias viales – Choques, frenazos bruscos o incidentes en cruces peatonales de la ruta.' },
        ];

        this.renderCheckboxGroup('infraestructuraVial', infraestructura);
        this.renderCheckboxGroup('medioAmbiente', medioAmbiente);
        this.renderCheckboxGroup('riesgosUrbanos', riesgos);
    }

    renderCheckboxGroup(containerId, items) {
        const container = this.querySelector(`#${containerId}`);
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            div.innerHTML = `
                <input type="checkbox" id="${item.id}" name="${item.id}">
                <label for="${item.id}">${item.label}</label>
            `;
            container.appendChild(div);
        });
    }

    handleFiles(files) {
        const maxFiles = 5;
        const maxSize = 8 * 1024 * 1024; // 8 MB por imagen
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

        this.attachedPhotos = [];
        const preview = this.querySelector('#filePreview');
        preview.innerHTML = '';

        const fileArray = Array.from(files).slice(0, maxFiles);
        fileArray.forEach((file, index) => {
            if (!validTypes.includes(file.type)) {
                this.showToast('Formato no válido: ' + file.name, 'error');
                return;
            }
            if (file.size > maxSize) {
                this.showToast('Imagen demasiado grande (máx 8MB): ' + file.name, 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                this.attachedPhotos.push({ name: file.name, data: e.target.result, file: file, type: file.type });
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = 'Vista previa ' + (index + 1);
                img.title = file.name;
                preview.appendChild(img);
                this.validateField(this.querySelector('#fotografias'));
            };
            reader.readAsDataURL(file);
        });
        if (fileArray.length === 0 && files.length > 0) {
            this.showToast('No se pudo cargar ninguna imagen. Verifique formatos y tamaños.', 'error');
        }
    }

    initMap() {
        const mapContainer = this.querySelector('#mapContainer');
        const placeholder = this.querySelector('#mapPlaceholder');
        const defaultCenter = [4.711, -74.0721]; // Bogotá [lat, lng]

        if (typeof L !== 'undefined') {
            this.map = L.map(mapContainer).setView(defaultCenter, 14);

            // Capa a color estándar de OpenStreetMap (totalmente gratuita y sin API key)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(this.map);

            if (placeholder) placeholder.style.display = 'none';

            // Forzar actualización de tamaño para renderizado correcto en Web Components
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);

            this.map.on('click', (e) => {
                this.placeMarker(e.latlng);
                const coords = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
                this.querySelector('#coordenadasManual').value = coords;
                this.querySelector('#coordenadasAPI').value = coords;
            });
        } else {
            if (placeholder) placeholder.textContent =
                '⚠️ Mapa no disponible. Asegúrese de cargar la librería de Leaflet.';
        }
    }

    initDateConstraints() {
        const input = this.querySelector('#fechaHoraSuceso');
        if (input) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            input.max = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
    }

    placeMarker(latLng) {
        if (this.marker) {
            this.map.removeLayer(this.marker);
        }

        // Icono SVG personalizado para combinar con la estética oscura y evitar problemas de CDN assets
        const customPinIcon = L.divIcon({
            html: `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#5b8cce" stroke="#ffffff" stroke-width="1.5"/>
                </svg>
            `,
            className: 'custom-pin-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });

        this.marker = L.marker(latLng, {
            draggable: true,
            icon: customPinIcon
        }).addTo(this.map);

        this.marker.on('dragend', () => {
            const pos = this.marker.getLatLng();
            const coords = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
            this.querySelector('#coordenadasManual').value = coords;
            this.querySelector('#coordenadasAPI').value = coords;
        });

        this.map.panTo(latLng);
    }

    updateMarkerFromCoords(coordStr) {
        if (!coordStr || !this.map) return;
        const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const latLng = [parts[0], parts[1]];
            this.placeMarker(latLng);
            this.querySelector('#coordenadasAPI').value = coordStr;
        }
    }

    clearMarker() {
        if (this.marker) {
            this.map.removeLayer(this.marker);
        }
        this.marker = null;
        this.querySelector('#coordenadasManual').value = '';
        this.querySelector('#coordenadasAPI').value = '';
    }

    getCurrentPosition() {
        if (!navigator.geolocation) {
            this.showToast('Geolocalización no soportada en este dispositivo.', 'error');
            return;
        }
        this.showToast('Obteniendo ubicación GPS...', '');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                this.querySelector('#coordenadasAPI').value = coords;
                this.querySelector('#coordenadasManual').value = coords;
                if (this.map) {
                    const latLng = [lat, lng];
                    this.placeMarker(latLng);
                }
                this.showToast('✅ Ubicación GPS obtenida correctamente.', 'success');
            },
            (error) => {
                let msg = 'Error al obtener ubicación.';
                if (error.code === 1) msg = 'Permiso de ubicación denegado. Active el GPS.';
                if (error.code === 2) msg = 'Ubicación no disponible.';
                if (error.code === 3) msg = 'Tiempo agotado. Intente de nuevo.';
                this.showToast(msg, 'error');
            }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
        );
    }

    validateField(el) {
        const group = el.closest('.form-group');
        if (!group) return true;
        let valid = true;
        let errorMessage = 'Campo obligatorio';

        if (el.required && !el.value.trim()) {
            valid = false;
            errorMessage = 'Campo obligatorio';
        }
        if (el.type === 'email' && el.value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(el.value.trim())) {
                valid = false;
                errorMessage = 'Correo electrónico válido obligatorio';
            }
        }
        if (el.type === 'tel' && el.value.trim()) {
            if (!/^[\d\s\-\+\(\)]{7,20}$/.test(el.value.trim())) {
                valid = false;
                errorMessage = 'Teléfono no válido';
            }
        }
        if (el.id === 'fechaHoraSuceso' && el.value.trim()) {
            const inputDate = new Date(el.value);
            const currentDate = new Date();

            const yearStr = el.value.split('-')[0];
            const inputYear = inputDate.getFullYear();
            const currentYear = currentDate.getFullYear();

            if (yearStr.length !== 4 || isNaN(inputYear)) {
                valid = false;
                errorMessage = 'El año debe tener exactamente 4 dígitos (ej. 2026)';
            } else if (inputYear > currentYear) {
                valid = false;
                errorMessage = 'El año no puede ser posterior al año actual del sistema';
            } else if (inputDate > currentDate) {
                valid = false;
                errorMessage = 'La fecha y hora no puede ser superior a la actual del sistema';
            }
        }
        if (el.id === 'fotografias' && this.attachedPhotos.length === 0) {
            valid = false;
            errorMessage = 'Debe adjuntar al menos una fotografía';
        }

        const errorMsgEl = group.querySelector('.error-msg');
        if (errorMsgEl) {
            errorMsgEl.textContent = errorMessage;
        }

        if (!valid) {
            group.classList.add('error');
        } else {
            group.classList.remove('error');
        }
        return valid;
    }

    validateAll() {
        const form = this.querySelector('#reportForm');
        const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
        let allValid = true;
        inputs.forEach(el => {
            if (!this.validateField(el)) allValid = false;
        });
        // Validar fotos
        if (this.attachedPhotos.length === 0) {
            this.querySelector('#fotografias').closest('.form-group').classList.add('error');
            allValid = false;
        } else {
            this.querySelector('#fotografias').closest('.form-group').classList.remove('error');
        }
        return allValid;
    }

    buildJSON() {
        const form = this.querySelector('#reportForm');
        const fd = new FormData(form);
        const data = {};

        // Fecha de reporte (actual del sistema)
        data.fechaReporte = new Date().toISOString();

        // Datos del solicitante
        data.nombreCompleto = fd.get('nombreCompleto')?.trim() || '';
        data.documentoIdentidad = fd.get('documentoIdentidad')?.trim() || '';
        data.direccionFisica = fd.get('direccionFisica')?.trim() || '';
        data.telefono = fd.get('telefono')?.trim() || '';
        data.correoElectronico = fd.get('correoElectronico')?.trim() || '';

        // Información del suceso
        data.ubicacionExactaSuceso = fd.get('ubicacionExactaSuceso')?.trim() || '';
        data.fechaHoraSuceso = fd.get('fechaHoraSuceso') || '';
        data.descripcionBreve = fd.get('descripcionBreve')?.trim() || '';

        // Daños (booleanos)
        data.andenesDestruidos = !!fd.get('andenesDestruidos');
        data.alcantarilladoColapsado = !!fd.get('alcantarilladoColapsado');
        data.senalizacionVialBorrosa = !!fd.get('senalizacionVialBorrosa');
        data.acumulacionBasuras = !!fd.get('acumulacionBasuras');
        data.contaminacionVisual = !!fd.get('contaminacionVisual');
        data.deficitZonasVerdes = !!fd.get('deficitZonasVerdes');
        data.inseguridadRiesgoPublico = !!fd.get('inseguridadRiesgoPublico');
        data.contaminacionAcustica = !!fd.get('contaminacionAcustica');
        data.viviendasRuinas = !!fd.get('viviendasRuinas');

        // Descripción adicional
        data.descripcionAdicional = fd.get('descripcionAdicional')?.trim() || '';

        // Fotografías (binario)
        data.fotografias = this.attachedPhotos.map(p => {
            return { nombre: p.name, binario: p.file };
        });

        // Coordenadas
        data.coordenadasManual = fd.get('coordenadasManual')?.trim() || '';
        data.coordenadasAPI = fd.get('coordenadasAPI')?.trim() || '';

        // Observaciones
        data.observacionesAdicionales = fd.get('observacionesAdicionales')?.trim() || '';

        // Generar ID de ticket único
        data.ticketId = this.generateTicketId();

        return data;
    }

    generateTicketId() {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        return `TKT-${datePart}-${randomPart}`;
    }

    saveFormState() {
        const form = this.querySelector('#reportForm');
        if (!form) return;
        const state = {};

        // Inputs y textareas normales
        form.querySelectorAll('input:not([type="file"]):not([type="checkbox"]), textarea, select').forEach(el => {
            if (el.name) {
                state[el.name] = el.value;
            }
        });

        // Checkboxes (afectaciones)
        form.querySelectorAll('input[type="checkbox"]').forEach(el => {
            if (el.name) {
                state[el.name] = el.checked;
            }
        });

        localStorage.setItem('report_form_state', JSON.stringify(state));
    }

    loadFormState() {
        try {
            const saved = localStorage.getItem('report_form_state');
            if (!saved) return;
            const state = JSON.parse(saved);

            // Restaurar campos de texto y textareas
            this.querySelectorAll('input:not([type="file"]):not([type="checkbox"]), textarea, select').forEach(el => {
                if (el.name && state[el.name] !== undefined) {
                    el.value = state[el.name];
                }
            });

            // Restaurar checkboxes
            this.querySelectorAll('input[type="checkbox"]').forEach(el => {
                if (el.name && state[el.name] !== undefined) {
                    el.checked = state[el.name];
                }
            });

            // Restaurar pin de mapa si hay coordenadas manuales guardadas
            const coordManualVal = this.querySelector('#coordenadasManual')?.value;
            if (coordManualVal) {
                setTimeout(() => {
                    this.updateMarkerFromCoords(coordManualVal);
                }, 200);
            }
        } catch (e) {
            console.error('Error al cargar datos desde localStorage:', e);
        }
    }

    checkIdempotency() {
        const lastSubmissionStr = localStorage.getItem('last_submitted_report');
        if (!lastSubmissionStr) return true;

        try {
            const lastSubmission = JSON.parse(lastSubmissionStr);
            const now = Date.now();

            // Si pasaron más de 30 segundos, limpiar y permitir
            if (now - lastSubmission.timestamp > 30000) {
                localStorage.removeItem('last_submitted_report');
                return true;
            }

            // Comparar descripciones
            const currentDescBreve = this.querySelector('#descripcionBreve')?.value.trim() || '';
            const currentDescAdic = this.querySelector('#descripcionAdicional')?.value.trim() || '';

            if (currentDescBreve === lastSubmission.descripcionBreve && currentDescAdic === lastSubmission.descripcionAdicional) {
                return false; // Duplicado detectado
            }
        } catch (e) {
            console.error('Error al verificar la idempotencia:', e);
        }
        return true;
    }

    clearFormState() {
        localStorage.removeItem('report_form_state');
    }

    async handleSubmit(e) {
        e.preventDefault();
        const statusEl = this.querySelector('#submitStatus');
        const btnSubmit = this.querySelector('#btnSubmit');

        // Verificar la simulación de idempotencia antes de proceder
        if (!this.checkIdempotency()) {
            alert('No se pueden enviar solicitudes con la misma información. Modifique los espacios para generar una nueva solicitud.');
            this.showToast('No se pueden enviar solicitudes con la misma información.', 'error');
            statusEl.innerHTML = '<span style="color:var(--error);">No se pueden enviar solicitudes con la misma información. Modifique los espacios para generar una nueva solicitud.</span>';
            return;
        }

        if (!this.validateAll()) {
            this.showToast('Complete todos los campos obligatorios.', 'error');
            statusEl.innerHTML =
                '<span style="color:var(--error);">Complete todos los campos obligatorios antes de enviar.</span>';
            // Scroll al primer error
            const firstError = this.querySelector('.form-group.error');
            if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const jsonData = this.buildJSON();
        console.log('Objeto JSON generado:', jsonData);

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner"></span> Enviando...';
        statusEl.innerHTML = '';

        // Convertir el objeto JSON con datos binarios a FormData para la transmisión
        const formData = new FormData();
        for (const key in jsonData) {
            if (key === 'fotografias') {
                jsonData.fotografias.forEach(p => {
                    formData.append('fotografias', p.binario, p.nombre);
                });
            } else {
                formData.append(key, jsonData[key]);
            }
        }

        try {
            const response = await fetch(this.n8nWebhookUrl, {
                method: 'POST',
                // Al enviar FormData, el navegador establece automáticamente el Content-Type multipart/form-data con boundary
                body: formData,
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            this.showToast(`Reporte enviado exitosamente. Ticket: ${jsonData.ticketId}`, 'success');
            statusEl.innerHTML = `<span style="color:var(--success);">Reporte enviado correctamente.<br><strong>Número de Ticket: ${jsonData.ticketId}</strong></span>`;

            // Guardar datos en localStorage para simulación de idempotencia (expira en 30s)
            const submissionToSave = {
                descripcionBreve: jsonData.descripcionBreve,
                descripcionAdicional: jsonData.descripcionAdicional,
                timestamp: Date.now()
            };
            localStorage.setItem('last_submitted_report', JSON.stringify(submissionToSave));
            setTimeout(() => {
                localStorage.removeItem('last_submitted_report');
            }, 30000);

            // Limpiar el estado de localStorage al enviar correctamente
            this.clearFormState();

            // Resetear formulario
            this.querySelector('#reportForm').reset();
            this.attachedPhotos = [];
            this.querySelector('#filePreview').innerHTML = '';
            this.clearMarker();
        } catch (err) {
            console.error('Error al enviar:', err);
            this.showToast('Error al enviar el reporte. Revise la consola.', 'error');
            statusEl.innerHTML =
                `<span style="color:var(--error);">Error: ${err.message}. Verifique conexión o webhook.</span>`;
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '🚀 Enviar reporte';
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
        }, 3500);
    }
}

// Registrar el web component
customElements.define('report-form', ReportForm);

// ============================================================
// Inicialización
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Formulario de Reporte de Daños inicializado.');
    console.log('Configure la API Key de Google Maps en el <script> del HTML.');
    console.log('Configure la URL del webhook de n8n en la propiedad n8nWebhookUrl del componente.');
});