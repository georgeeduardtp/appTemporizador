class WorkoutTimer {
    constructor() {
        this.initializeElements();
        this.initializeState();
        this.initializeEventListeners();
        this.initializeProgressCircle();
        this.loadSavedTimers();
        this.requestNotificationPermission();
        this.initializeTheme();
        this.initializeTabs();
    }

    initializeElements() {
        // Elementos del temporizador
        this.timeDisplay = document.querySelector('.time');
        this.phaseDisplay = document.querySelector('.phase');
        this.progressRing = document.querySelector('.progress-ring');
        this.currentIntervalDisplay = document.querySelector('.current-interval');
        this.currentRepetitionDisplay = document.querySelector('.current-repetition');
        
        // Botones de control
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.saveTimerBtn = document.getElementById('saveTimer');
        this.themeToggleBtn = document.getElementById('themeToggle');
        this.addIntervalBtn = document.getElementById('addIntervalBtn');
        
        // Controles de secuencia
        this.sequenceRepsInput = document.getElementById('sequenceReps');
        
        // Contenedor de intervalos
        this.intervalsList = document.getElementById('intervalsList');
        
        // Lista de temporizadores guardados
        this.timersList = document.getElementById('timersList');
        
        // Sonido de alerta
        this.alertSound = document.getElementById('alertSound');
        
        // Elementos del círculo de progreso
        this.progressCircle = document.querySelector('.progress-circle-path');
        this.progressCircleLength = this.progressCircle?.getTotalLength() || 942.478; // 2 * π * 150
        
        // Inicializar el círculo
        if (this.progressCircle) {
            this.progressCircle.style.strokeDasharray = this.progressCircleLength;
            this.progressCircle.style.strokeDashoffset = this.progressCircleLength;
        }
        
        // Agregar el gradiente SVG
        this.addProgressGradient();

        // Nuevos elementos
        this.activeSequence = document.querySelector('.active-sequence');
        this.sequencePreview = document.querySelector('.sequence-preview');
        this.editSequenceBtn = document.getElementById('editSequenceBtn');
        this.useSequenceBtn = document.getElementById('useSequenceBtn');
        
        // Elementos de pestañas
        this.savedSequencesTab = document.getElementById('savedSequencesTab');
        this.newSequenceTab = document.getElementById('newSequenceTab');
        this.savedSequencesPanel = document.getElementById('savedSequencesPanel');
        this.newSequencePanel = document.getElementById('newSequencePanel');
        this.closeNewSequenceBtn = document.getElementById('closeNewSequence');
        this.closeSavedSequencesBtn = document.getElementById('closeSavedSequences');
        this.closeActiveSequenceBtn = document.getElementById('closeActiveSequence');

        // Agregar contenedor de alertas
        this.alertContainer = document.createElement('div');
        this.alertContainer.className = 'alert-container';
        document.body.appendChild(this.alertContainer);
    }

    initializeState() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentTime = 0;
        this.currentIntervalIndex = 0;
        this.currentSequenceRep = 1;
        this.intervals = [];
        this.intervalId = null;
        this.notificationPermission = false;
        this.nextIntervalId = 2;
        this.activeTimerConfig = null;
        this.isSequenceActive = false;
        this.editingTimerIndex = undefined;
    }

    initializeEventListeners() {
        // Eventos principales
        this.startBtn?.addEventListener('click', () => this.startTimer());
        this.pauseBtn?.addEventListener('click', () => this.pauseTimer());
        this.resetBtn?.addEventListener('click', () => this.resetTimer());
        this.themeToggleBtn?.addEventListener('click', () => this.toggleTheme());
        this.addIntervalBtn?.addEventListener('click', () => this.addNewInterval());
        
        // Eventos de guardado
        this.saveTimerBtn?.addEventListener('click', () => this.saveCurrentTimer());
        this.useSequenceBtn?.addEventListener('click', () => this.useActiveSequence());
        
        // Eventos del documento
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
        
        // Configurar listeners del intervalo inicial
        const initialInterval = document.querySelector('.interval-item');
        if (initialInterval) {
            this.setupIntervalListeners(initialInterval);
        }
        
        // Validar inputs de tiempo
        document.querySelectorAll('.interval-minutes, .interval-seconds').forEach(input => {
            input.addEventListener('input', () => this.validateTimeInput(input));
        });

        // Eventos para pestañas
        this.savedSequencesTab?.addEventListener('click', () => this.switchTab('saved'));
        this.newSequenceTab?.addEventListener('click', () => this.switchTab('new'));
        this.closeNewSequenceBtn?.addEventListener('click', () => this.closeNewSequence());
        this.closeSavedSequencesBtn?.addEventListener('click', () => this.closeSavedSequences());
        this.closeActiveSequenceBtn?.addEventListener('click', () => this.closeActiveSequence());

        // Eventos para secuencia activa
        this.editSequenceBtn?.addEventListener('click', () => this.editActiveSequence());
    }

    validateTimeInput(input) {
        let value = parseInt(input.value);
        const max = parseInt(input.getAttribute('max'));
        const min = parseInt(input.getAttribute('min'));
        
        if (isNaN(value)) value = 0;
        if (value > max) value = max;
        if (value < min) value = min;
        
        input.value = value;
    }

    setupIntervalListeners(intervalElement) {
        const deleteBtn = intervalElement.querySelector('.delete-interval');
        deleteBtn.addEventListener('click', () => this.deleteInterval(intervalElement));

        // Actualizar los intervalos cuando se modifiquen los inputs
        intervalElement.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => this.updateIntervalsFromInputs());
            if (input.classList.contains('interval-minutes') || 
                input.classList.contains('interval-seconds')) {
                input.addEventListener('input', () => this.validateTimeInput(input));
            }
        });
    }

    addNewInterval() {
        const newInterval = document.createElement('div');
        newInterval.className = 'interval-item new';
        newInterval.dataset.intervalId = this.nextIntervalId;
        
        newInterval.innerHTML = `
            <div class="interval-header">
                <h3>Intervalo ${this.nextIntervalId}</h3>
                <button class="btn-icon delete-interval">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="interval-inputs">
                <div class="input-group">
                    <label for="intervalName-${this.nextIntervalId}">Nombre</label>
                    <input type="text" id="intervalName-${this.nextIntervalId}" class="interval-name" 
                           value="Intervalo ${this.nextIntervalId}" placeholder="Ej: Calentamiento">
                </div>
                <div class="input-group time-input">
                    <label>Duración</label>
                    <div class="time-controls">
                        <div class="minutes-input">
                            <input type="number" id="intervalMinutes-${this.nextIntervalId}" 
                                   class="interval-minutes" value="0" min="0" max="59">
                            <span>min</span>
                        </div>
                        <div class="seconds-input">
                            <input type="number" id="intervalSeconds-${this.nextIntervalId}" 
                                   class="interval-seconds" value="30" min="0" max="59">
                            <span>seg</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.intervalsList.appendChild(newInterval);
        this.setupIntervalListeners(newInterval);
        this.nextIntervalId++;
        
        setTimeout(() => newInterval.classList.remove('new'), 300);
    }

    deleteInterval(intervalElement) {
        if (this.intervalsList.children.length <= 1) {
            this.showAlert('Debe haber al menos un intervalo', 'error');
            return;
        }

        intervalElement.classList.add('removing');
        setTimeout(() => {
            intervalElement.remove();
            this.updateIntervalsFromInputs();
        }, 300);
    }

    updateIntervalsFromInputs() {
        this.intervals = [];
        this.intervalsList.querySelectorAll('.interval-item').forEach(intervalElement => {
            const name = intervalElement.querySelector('.interval-name').value;
            const minutes = parseInt(intervalElement.querySelector('.interval-minutes').value) || 0;
            const seconds = parseInt(intervalElement.querySelector('.interval-seconds').value) || 0;
            const totalSeconds = (minutes * 60) + seconds;
            
            if (totalSeconds > 0) {
                this.intervals.push({
                    name,
                    time: totalSeconds
                });
            }
        });
    }

    initializeProgressCircle() {
        // Crear el elemento SVG para el gradiente
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "progress-gradient");
        
        // Crear el elemento defs
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        
        // Crear el elemento linearGradient
        const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        gradient.setAttribute("id", "progress-gradient");
        gradient.setAttribute("gradientTransform", "rotate(90)");
        
        // Crear los stops del gradiente
        const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop1.setAttribute("offset", "0%");
        stop1.setAttribute("stop-color", "#6366f1");
        
        const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop2.setAttribute("offset", "100%");
        stop2.setAttribute("stop-color", "#ec4899");
        
        // Agregar los stops al gradiente
        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        
        // Agregar el gradiente al defs
        defs.appendChild(gradient);
        
        // Agregar el defs al svg
        svg.appendChild(defs);
        
        // Agregar el svg al body
        document.body.appendChild(svg);
    }

    addProgressGradient() {
        // Crear el elemento SVG para el gradiente
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "progress-gradient");
        
        // Crear el elemento defs
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        
        // Crear el elemento linearGradient
        const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        gradient.setAttribute("id", "progress-gradient");
        gradient.setAttribute("gradientTransform", "rotate(90)");
        
        // Crear los stops del gradiente
        const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop1.setAttribute("offset", "0%");
        stop1.setAttribute("stop-color", "#6366f1");
        
        const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop2.setAttribute("offset", "100%");
        stop2.setAttribute("stop-color", "#ec4899");
        
        // Agregar los stops al gradiente
        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        
        // Agregar el gradiente al defs
        defs.appendChild(gradient);
        
        // Agregar el defs al svg
        svg.appendChild(defs);
        
        // Agregar el svg al body
        document.body.appendChild(svg);
    }

    updateProgressCircle(currentTime, totalTime) {
        if (!this.progressCircle) return;
        
        const progress = currentTime / totalTime;
        const dashOffset = this.progressCircleLength * (1 - progress);
        this.progressCircle.style.strokeDashoffset = dashOffset;
    }

    startTimer() {
        if (!this.isSequenceActive) {
            this.showAlert('Por favor, selecciona una secuencia antes de iniciar', 'error');
            return;
        }

        if (!this.isRunning) {
            this.updateIntervalsFromInputs();
            
            if (this.intervals.length === 0) {
                this.showAlert('Por favor, configura al menos un intervalo', 'error');
                return;
            }

            this.isRunning = true;
            this.isPaused = false;
            this.updateButtonStates();
            
            if (!this.intervalId) {
                if (this.currentTime === 0) {
                    this.currentIntervalIndex = 0;
                    this.currentSequenceRep = 1;
                    this.currentTime = this.intervals[0].time;
                }
                this.totalTime = this.intervals[this.currentIntervalIndex].time;
                this.startInterval();
            }
        }
    }

    pauseTimer() {
        if (this.isRunning) {
            this.isPaused = true;
            this.isRunning = false;
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.updateButtonStates();
        }
    }

    resetTimer() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentTime = 0;
        this.currentIntervalIndex = 0;
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.updateDisplay();
        this.updateProgressCircle(0, 1);
        this.updateButtonStates();
    }

    startInterval() {
        this.intervalId = setInterval(() => {
            if (this.currentTime > 0) {
                this.currentTime--;
                this.updateDisplay();
                this.updateProgressCircle(this.currentTime, this.totalTime);
            } else {
                this.handleIntervalComplete();
            }
        }, 1000);
    }

    handleIntervalComplete() {
        this.playAlertSound();
        this.showNotification();

        this.currentIntervalIndex++;
        
        if (this.currentIntervalIndex >= this.intervals.length) {
            const totalReps = parseInt(this.sequenceRepsInput.value) || 1;
            
            if (this.currentSequenceRep < totalReps) {
                this.currentSequenceRep++;
                this.currentIntervalIndex = 0;
                this.currentTime = this.intervals[0].time;
                this.totalTime = this.intervals[0].time;
                this.updateDisplay();
                this.updateProgressCircle(this.currentTime, this.totalTime);
            } else {
                this.completeWorkout();
                return;
            }
        } else {
            this.currentTime = this.intervals[this.currentIntervalIndex].time;
            this.totalTime = this.intervals[this.currentIntervalIndex].time;
            this.updateDisplay();
            this.updateProgressCircle(this.currentTime, this.totalTime);
        }
    }

    completeWorkout() {
        this.resetTimer();
        this.showNotification('¡Entrenamiento completado!');
        this.showAlert('¡Entrenamiento completado!', 'success');
    }

    updateDisplay() {
        this.timeDisplay.textContent = this.formatTime(this.currentTime);
        
        if (this.intervals.length > 0 && this.currentIntervalIndex < this.intervals.length) {
            const currentInterval = this.intervals[this.currentIntervalIndex];
            this.phaseDisplay.textContent = currentInterval.name;
            
            const totalIntervals = this.intervals.length;
            const totalReps = parseInt(this.sequenceRepsInput.value) || 1;
            
            this.currentIntervalDisplay.textContent = 
                `Intervalo: ${this.currentIntervalIndex + 1}/${totalIntervals}`;
            this.currentRepetitionDisplay.textContent = 
                `Vuelta: ${this.currentSequenceRep}/${totalReps}`;
        } else {
            this.phaseDisplay.textContent = 'Preparado';
            this.currentIntervalDisplay.textContent = 'Intervalo: 0/0';
            this.currentRepetitionDisplay.textContent = 'Vuelta: 0/0';
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    updateButtonStates() {
        // Botones de control del temporizador
        this.startBtn.disabled = this.isRunning || !this.isSequenceActive;
        this.pauseBtn.disabled = !this.isRunning;
        this.resetBtn.disabled = !this.isRunning && !this.isPaused;
        
        // Botones de edición
        if (this.addIntervalBtn) {
            this.addIntervalBtn.disabled = this.isRunning;
        }
        
        // Actualizar estilos visuales
        this.startBtn.classList.toggle('disabled', !this.isSequenceActive);
    }

    playAlertSound() {
        this.alertSound.play().catch(error => console.log('Error al reproducir sonido:', error));
    }

    showNotification(message = 'Cambio de intervalo') {
        if (this.notificationPermission) {
            const currentInterval = this.intervals[this.currentIntervalIndex];
            const nextInterval = this.intervals[this.currentIntervalIndex + 1];
            
            const options = {
                icon: '/assets/icon.png',
                body: nextInterval ? 
                    `Siguiente: ${nextInterval.name}` : 
                    '¡Entrenamiento completado!',
                badge: '/assets/badge.png',
                tag: 'workout-timer',
                silent: false,
                requireInteraction: false,
                vibrate: [200, 100, 200],
                actions: [
                    {
                        action: 'focus',
                        title: 'Ver temporizador'
                    }
                ],
                dir: 'auto',
                timestamp: Date.now(),
                data: {
                    currentTime: this.currentTime,
                    totalIntervals: this.intervals.length,
                    currentInterval: this.currentIntervalIndex + 1
                }
            };

            // Personalizar el estilo de la notificación según el tema actual
            const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDarkTheme) {
                options.image = '/assets/notification-dark.png';
            } else {
                options.image = '/assets/notification-light.png';
            }

            const notification = new Notification(message, options);

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // Cerrar automáticamente después de 5 segundos
            setTimeout(() => notification.close(), 5000);
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            document.title = `(${this.formatTime(this.currentTime)}) Temporizador`;
        } else {
            document.title = 'Temporizador de Entrenamiento';
        }
    }

    switchTab(tab) {
        // Actualizar clases activas de las pestañas
        this.savedSequencesTab.classList.toggle('active', tab === 'saved');
        this.newSequenceTab.classList.toggle('active', tab === 'new');

        // Mostrar/ocultar paneles
        this.savedSequencesPanel.style.display = tab === 'saved' ? 'block' : 'none';
        this.newSequencePanel.style.display = tab === 'new' ? 'block' : 'none';

        // Si estamos en la pestaña de secuencias guardadas, ocultar la secuencia activa
        this.activeSequence.style.display = tab === 'saved' && this.activeTimerConfig ? 'block' : 'none';
    }

    saveCurrentTimer() {
        let name;
        
        // Si estamos editando, usar el nombre existente
        if (this.editingTimerIndex !== undefined && this.activeTimerConfig) {
            name = this.activeTimerConfig.name;
        } else {
            name = prompt('Nombre para esta secuencia:');
            if (!name) return;
        }

        // Recopilar los intervalos actuales
        const intervals = [];
        this.intervalsList.querySelectorAll('.interval-item').forEach(intervalElement => {
            const minutes = parseInt(intervalElement.querySelector('.interval-minutes').value) || 0;
            const seconds = parseInt(intervalElement.querySelector('.interval-seconds').value) || 0;
            
            intervals.push({
                name: intervalElement.querySelector('.interval-name').value,
                minutes,
                seconds,
            });
        });

        const timer = {
            name,
            intervals,
            sequenceReps: parseInt(this.sequenceRepsInput.value) || 1
        };

        // Guardar en localStorage
        const savedTimers = JSON.parse(localStorage.getItem('savedTimers') || '[]');
        
        if (this.editingTimerIndex !== undefined) {
            // Actualizar la secuencia existente
            savedTimers[this.editingTimerIndex] = timer;
            this.showAlert('Secuencia actualizada correctamente', 'success');
        } else {
            // Agregar nueva secuencia
            savedTimers.push(timer);
            this.showAlert('Nueva secuencia guardada correctamente', 'success');
        }
        
        localStorage.setItem('savedTimers', JSON.stringify(savedTimers));

        // Resetear el estado de edición
        this.editingTimerIndex = undefined;
        if (this.saveTimerBtn) {
            this.saveTimerBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Secuencia';
        }

        // Actualizar la lista y mostrar la pestaña de secuencias guardadas
        this.loadSavedTimers();
        this.switchTab('saved');
        
        // Actualizar la secuencia activa si estábamos editando
        if (this.activeTimerConfig && this.activeTimerConfig.name === timer.name) {
            this.activeTimerConfig = timer;
            this.showActiveSequence(timer);
        }
    }

    loadSavedTimers() {
        const savedTimers = JSON.parse(localStorage.getItem('savedTimers') || '[]');
        this.timersList.innerHTML = '';

        if (savedTimers.length === 0) {
            this.timersList.innerHTML = `
                <div class="saved-timer empty-state">
                    <h3>No hay secuencias guardadas</h3>
                    <p>Crea una nueva secuencia y guárdala para verla aquí.</p>
                </div>
            `;
            return;
        }

        savedTimers.forEach((timer, index) => {
            const timerElement = document.createElement('div');
            timerElement.className = 'saved-timer';
            
            let intervalsText = timer.intervals.map(interval => {
                const timeStr = [];
                if (interval.minutes > 0) timeStr.push(`${interval.minutes}min`);
                if (interval.seconds > 0) timeStr.push(`${interval.seconds}seg`);
                return `${interval.name}: ${timeStr.join(' ')}`;
            }).join(' → ');

            if (timer.sequenceReps > 1) {
                intervalsText += ` (${timer.sequenceReps} repeticiones)`;
            }

            timerElement.innerHTML = `
                <h3>${timer.name}</h3>
                <p>${intervalsText}</p>
                <div class="btn-group">
                    <button class="btn secondary load-timer">
                        <i class="fas fa-clock"></i> Cargar
                    </button>
                    <button class="btn secondary delete-timer">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            `;

            // Agregar event listeners
            timerElement.querySelector('.load-timer').addEventListener('click', () => this.loadTimer(index));
            timerElement.querySelector('.delete-timer').addEventListener('click', () => this.deleteTimer(index));
            
            this.timersList.appendChild(timerElement);
        });
    }

    loadTimer(index) {
        const savedTimers = JSON.parse(localStorage.getItem('savedTimers') || '[]');
        const timer = savedTimers[index];
        this.activeTimerConfig = timer;
        
        // Limpiar intervalos existentes
        this.intervalsList.innerHTML = '';
        
        // Cargar intervalos guardados
        timer.intervals.forEach((interval, i) => {
            const intervalElement = document.createElement('div');
            intervalElement.className = 'interval-item';
            intervalElement.dataset.intervalId = i + 1;
            
            intervalElement.innerHTML = `
                <div class="interval-header">
                    <h3>Intervalo ${i + 1}</h3>
                    <button class="btn-icon delete-interval">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="interval-inputs">
                    <div class="input-group">
                        <label for="intervalName-${i + 1}">Nombre</label>
                        <input type="text" id="intervalName-${i + 1}" class="interval-name" 
                               value="${interval.name}" placeholder="Ej: Calentamiento">
                    </div>
                    <div class="input-group time-input">
                        <label>Duración</label>
                        <div class="time-controls">
                            <div class="minutes-input">
                                <input type="number" id="intervalMinutes-${i + 1}" 
                                       class="interval-minutes" value="${interval.minutes}" min="0" max="59">
                                <span>min</span>
                            </div>
                            <div class="seconds-input">
                                <input type="number" id="intervalSeconds-${i + 1}" 
                                       class="interval-seconds" value="${interval.seconds}" min="0" max="59">
                                <span>seg</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            this.intervalsList.appendChild(intervalElement);
            this.setupIntervalListeners(intervalElement);
        });
        
        this.sequenceRepsInput.value = timer.sequenceReps || 1;
        this.updateIntervalsFromInputs();

        // Remover la clase minimized y mostrar la secuencia activa
        this.activeSequence.classList.remove('minimized');
        this.showActiveSequence(timer);
        
        // Resetear el estado de activación
        this.isSequenceActive = false;
        this.updateButtonStates();
        
        this.switchTab('saved');
    }

    deleteTimer(index) {
        if (!confirm('¿Estás seguro de que quieres eliminar este temporizador?')) return;
        
        const savedTimers = JSON.parse(localStorage.getItem('savedTimers') || '[]');
        savedTimers.splice(index, 1);
        localStorage.setItem('savedTimers', JSON.stringify(savedTimers));
        this.loadSavedTimers();
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission === 'granted';
        }
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        const icon = this.themeToggleBtn.querySelector('i');
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }

    initializeTabs() {
        this.switchTab('saved');
    }

    showActiveSequence(timer) {
        this.activeSequence.style.display = 'block';
        
        // Crear resumen de la secuencia
        const totalTime = timer.intervals.reduce((total, interval) => {
            return total + (interval.minutes * 60) + interval.seconds;
        }, 0) * timer.sequenceReps;
        
        const minutes = Math.floor(totalTime / 60);
        const seconds = totalTime % 60;
        const timeStr = `${minutes}min ${seconds}seg`;
        
        // Actualizar el título con el resumen
        const sequenceTitle = this.activeSequence.querySelector('h2');
        sequenceTitle.setAttribute('data-summary', `${timer.intervals.length} intervalos · ${timeStr} · ${timer.sequenceReps} repeticiones`);
        
        // Agregar botón de cerrar a la secuencia minimizada
        const sequenceHeader = this.activeSequence.querySelector('.sequence-header');
        if (!sequenceHeader.querySelector('.close-sequence')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-sequence';
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.setAttribute('aria-label', 'Cerrar secuencia activa');
            closeBtn.addEventListener('click', () => this.closeActiveSequence());
            sequenceHeader.appendChild(closeBtn);
        }
        
        // Vista previa detallada (se ocultará al minimizar)
        let previewHTML = '<div class="sequence-intervals">';
        timer.intervals.forEach((interval, index) => {
            previewHTML += `
                <div class="preview-interval">
                    <span class="interval-name">${interval.name}</span>
                    <span class="interval-time">${interval.minutes}:${interval.seconds.toString().padStart(2, '0')}</span>
                </div>
                ${index < timer.intervals.length - 1 ? '<i class="fas fa-arrow-right"></i>' : ''}
            `;
        });
        previewHTML += '</div>';
        if (timer.sequenceReps > 1) {
            previewHTML += `<div class="sequence-reps">${timer.sequenceReps} repeticiones</div>`;
        }
        
        this.sequencePreview.innerHTML = previewHTML;
    }

    closeActiveSequence() {
        if (this.isRunning) {
            this.showAlert('No puedes cerrar una secuencia mientras está en ejecución', 'error');
            return;
        }
        
        this.activeSequence.style.display = 'none';
        this.activeTimerConfig = null;
        this.isSequenceActive = false;
        this.updateButtonStates();
        
        // Resetear el temporizador
        this.resetTimer();
    }

    editActiveSequence() {
        if (this.activeTimerConfig) {
            // Guardar el índice de la secuencia activa para edición
            const savedTimers = JSON.parse(localStorage.getItem('savedTimers') || '[]');
            this.editingTimerIndex = savedTimers.findIndex(timer => 
                timer.name === this.activeTimerConfig.name &&
                timer.intervals.length === this.activeTimerConfig.intervals.length
            );
            
            // Restaurar vista completa al editar
            this.activeSequence.classList.remove('minimized');
            this.switchTab('new');

            // Cambiar el texto del botón de guardar
            if (this.saveTimerBtn) {
                this.saveTimerBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Secuencia';
            }
        }
    }

    closeNewSequence() {
        // Restaurar el intervalo inicial
        this.intervalsList.innerHTML = `
            <div class="interval-item" data-interval-id="1">
                <div class="interval-header">
                    <h3>Intervalo 1</h3>
                    <button class="btn-icon delete-interval" aria-label="Eliminar intervalo">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="interval-inputs">
                    <div class="input-group">
                        <label for="intervalName-1">Nombre del intervalo</label>
                        <input type="text" id="intervalName-1" class="interval-name" 
                               value="Ejercicio" placeholder="Ej: Calentamiento">
                    </div>
                    <div class="input-group time-input">
                        <label>Duración del intervalo</label>
                        <div class="time-controls">
                            <div class="minutes-input">
                                <input type="number" id="intervalMinutes-1" class="interval-minutes" 
                                       value="0" min="0" max="59" aria-label="Minutos">
                                <span>min</span>
                            </div>
                            <div class="seconds-input">
                                <input type="number" id="intervalSeconds-1" class="interval-seconds" 
                                       value="30" min="0" max="59" aria-label="Segundos">
                                <span>seg</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Restaurar valores por defecto
        this.nextIntervalId = 2;
        this.sequenceRepsInput.value = 1;
        
        // Configurar listeners para el intervalo inicial
        const initialInterval = this.intervalsList.querySelector('.interval-item');
        if (initialInterval) {
            this.setupIntervalListeners(initialInterval);
        }
        
        // Resetear el estado de activación si estábamos editando
        if (this.isSequenceActive) {
            this.isSequenceActive = false;
            this.updateButtonStates();
        }
        
        // Ocultar el panel sin cambiar a otro
        this.newSequencePanel.style.display = 'none';
        this.newSequenceTab.classList.remove('active');
    }

    useActiveSequence() {
        if (!this.activeTimerConfig) {
            this.showAlert('No hay una secuencia seleccionada', 'error');
            return;
        }

        this.isSequenceActive = true;
        this.updateButtonStates();
        this.switchTab('saved');

        // Minimizar la secuencia activa
        this.activeSequence.classList.add('minimized');

        // Mostrar feedback visual en el botón de inicio
        this.startBtn.classList.add('pulse');
        setTimeout(() => this.startBtn.classList.remove('pulse'), 1000);
    }

    closeSavedSequences() {
        // Ocultar el panel sin cambiar a otro
        this.savedSequencesPanel.style.display = 'none';
        this.savedSequencesTab.classList.remove('active');
        
        // Ocultar también la secuencia activa si está visible
        if (this.activeSequence) {
            this.activeSequence.style.display = 'none';
        }
    }

    showAlert(message, type = 'info') {
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type}`;
        alertElement.innerHTML = `
            <div class="alert-content">
                <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 
                               type === 'success' ? 'fa-check-circle' : 
                               'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="alert-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Agregar al contenedor
        this.alertContainer.appendChild(alertElement);

        // Configurar el botón de cerrar
        const closeBtn = alertElement.querySelector('.alert-close');
        closeBtn.addEventListener('click', () => {
            alertElement.classList.add('alert-hiding');
            setTimeout(() => alertElement.remove(), 300);
        });

        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.classList.add('alert-hiding');
                setTimeout(() => alertElement.remove(), 300);
            }
        }, 5000);
    }
}

// Inicializar el temporizador
const workoutTimer = new WorkoutTimer(); 