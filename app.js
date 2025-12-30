// Global Application State
const state = {
    selectedDate: new Date(),
    view: 'year', // 'day', 'week', 'month', 'year'
    filters: {
        shifts: {
            morning: true,
            interim: true,
            afternoon: true,
            saturday: true
        },
        teams: {
            consulta: true,
            gastro: true
        }
    },
    currentUser: null, // For personal stats
    managementMode: false // Heatmap mode
};

// DOM Elements
const elements = {
    grid: document.getElementById('scheduleGrid'),
    miniCalGrid: document.getElementById('miniCalendarGrid'),
    miniCalMonth: document.getElementById('miniCalMonth'),
    todayBtn: document.getElementById('todayBtn'),
    viewBtns: document.querySelectorAll('.view-btn'),
    // Filters
    filterCheckboxes: document.querySelectorAll('.checkbox-filter input'),
    // Nav
    prevBtn: document.querySelector('.mini-cal-nav .fa-chevron-left'),
    nextBtn: document.querySelector('.mini-cal-nav .fa-chevron-right'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    sidebar: document.querySelector('.sidebar'),
    // Settings
    settingsBtn: document.getElementById('settingsBtn'),
    settingsPanel: document.getElementById('settingsPanel'),
    closePanelBtn: document.querySelector('.close-panel'),
    userSelect: document.getElementById('userSelect'),
    fileInput: document.getElementById('fileInput'),
    // Stats
    myStatsSection: document.getElementById('myStatsSection'),
    statHours: document.getElementById('statHours'),
    statShifts: document.getElementById('statShifts'),
    statNights: document.getElementById('statNights'),
    statWeekends: document.getElementById('statWeekends'),
    exportBtn: document.getElementById('exportBtn'),
    // Management
    managementModeToggle: document.getElementById('managementModeToggle'),
    heatmapLegend: document.getElementById('heatmapLegend'),
    // Greeting
    dynamicGreeting: document.getElementById('dynamicGreeting'),
    userIdentityName: document.getElementById('userIdentityName'),
    userNameDisplay: document.getElementById('userNameDisplay'),
    identityWidget: document.getElementById('identityWidget'),
    kpiHours: document.getElementById('kpiHours'),
    kpiShifts: document.getElementById('kpiShifts'),
    kpiWeekends: document.getElementById('kpiWeekends'),
    // Google Sheets
    googleSheetUrl: document.getElementById('googleSheetUrl'),
    importSheetBtn: document.getElementById('importSheetBtn')
};

// Constants
const SHIFT_TYPES = {
    '8-16': 'morning',
    '8,5-16,5': 'morning',
    '7,5-15,5': 'morning',
    '9-17': 'morning',
    '10-18': 'interim',
    '12-20': 'afternoon',
    '14-22': 'afternoon',
    'F': 'off',
    'Fr': 'off',
    'Aniv': 'holiday',
    'Lf': 'holiday',
    '46011.0': 'holiday' // Excel weirdness
};

const SHIFTS_CONFIG = {
    'Manhã': ['8-16', '8,5-16,5', '7,5-15,5', '9-17', '9-17h', '9,5-17,5'],
    'Intermédio': ['10-18'],
    'Tarde': ['12-20', '14-22'],
    'Noite': [], // No nights defined yet?
    'Folga': ['F', 'Fr', 'Aniv', 'Lf']
};

// Stats Calculation Helpers
const STATS = {
    calculateDuration: (shiftString) => {
        if (!shiftString || ['F', 'Fr', 'Aniv', 'Lf'].includes(shiftString)) return 0;
        // Handle "8-16"
        if (shiftString.includes('-')) {
            const parts = shiftString.replace('h', '').split('-');
            if (parts.length === 2) {
                const start = parseFloat(parts[0].replace(',', '.'));
                const end = parseFloat(parts[1].replace(',', '.'));
                return end - start;
            }
        }
        return 0; // Fallback
    },
    isNight: (shiftString) => {
        // Simple heuristic: starts after 18:00 or ends after 23:00?
        // Current data doesn't seem to have explicit nights, but let's assume 'Noite' if defined
        return false;
    },
    isWeekend: (year, month, day) => {
        const d = new Date(year, month - 1, day);
        const dayOfWeek = d.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6;
    }
};


// Initialization
function init() {
    setupEventListeners();
    populateUserSelect();
    loadFromLocalStorage();
    render();
    updateGreeting();
}

function setupEventListeners() {
    // View Switching
    elements.viewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            elements.viewBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            let text = e.target.textContent.toLowerCase();
            if (text === 'mês') text = 'month';
            if (text === 'ano') text = 'year';
            if (text === 'semana') text = 'week';
            if (text === 'dia') text = 'day';
            state.view = text;
            render();
        });
    });

    // Navigation (Mini Calendar)
    elements.prevBtn.addEventListener('click', () => {
        state.selectedDate.setMonth(state.selectedDate.getMonth() - 1);
        render();
    });
    elements.nextBtn.addEventListener('click', () => {
        state.selectedDate.setMonth(state.selectedDate.getMonth() + 1);
        render();
    });
    elements.todayBtn.addEventListener('click', () => {
        state.selectedDate = new Date();
        render();
    });

    // Filters
    elements.filterCheckboxes.forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = e.target.id;
            if (id.startsWith('filter-team')) {
                const team = id.replace('filter-team-', '');
                state.filters.teams[team] = e.target.checked;
            } else {
                const shift = id.replace('filter-', '');
                state.filters.shifts[shift] = e.target.checked;
            }
            render();
        });
    });

    // Sidebar Mobile
    elements.mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent closing immediately
        elements.sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            elements.sidebar.classList.contains('open') &&
            !elements.sidebar.contains(e.target) &&
            e.target !== elements.mobileMenuBtn) { // Ignore clicks on the button itself
            elements.sidebar.classList.remove('open');
        }
    });


    // Settings Panel
    elements.settingsBtn.addEventListener('click', () => {
        elements.settingsPanel.classList.toggle('hidden');
    });
    elements.closePanelBtn.addEventListener('click', () => {
        elements.settingsPanel.classList.add('hidden');
    });

    // User Select
    elements.userSelect.addEventListener('change', (e) => {
        state.currentUser = e.target.value;
        localStorage.setItem('currentUser', state.currentUser);
        updateStatsAndUI();
        render(); // Re-render to highlight
    });

    // File Upload
    elements.fileInput.addEventListener('change', handleFileUpload);

    // Export
    elements.exportBtn.addEventListener('click', exportCalendar);

    // Management Mode
    elements.managementModeToggle.addEventListener('change', (e) => {
        state.managementMode = e.target.checked;
        elements.heatmapLegend.style.display = state.managementMode ? 'block' : 'none';
        render();
    });

    // Identity Widget Trigger
    if (elements.userIdentityName) {
        elements.userIdentityName.addEventListener('click', () => {
            elements.settingsPanel.classList.remove('hidden');
            // elements.userSelect.focus(); // Optional
        });
    }

    // Google Sheets
    elements.importSheetBtn.addEventListener('click', handleGoogleSheetImport);
}

function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = "Bem vindo";
    if (hour >= 6 && hour < 13) greeting = "Bom dia";
    else if (hour >= 13 && hour < 20) greeting = "Boa tarde";
    else greeting = "Boa noite";

    if (state.currentUser) {
        // Try to get first name
        const nameParts = state.currentUser.split(' ');
        greeting += `, ${nameParts[0]}`;
    }

    elements.dynamicGreeting.textContent = greeting;
}

function loadFromLocalStorage() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        state.currentUser = savedUser;
        elements.userSelect.value = savedUser;
        updateStatsAndUI();
    }
}

function populateUserSelect() {
    elements.userSelect.innerHTML = '<option value="">Selecionar Enfermeiro...</option>';
    rosterData.forEach(nurse => {
        const option = document.createElement('option');
        option.value = nurse.name;
        option.textContent = nurse.name;
        elements.userSelect.appendChild(option);
    });
}


function render() {
    renderMiniCalendar();
    renderMainGrid();
}

/* --- Mini Calendar Logic --- */
function renderMiniCalendar() {
    const year = state.selectedDate.getFullYear();
    const month = state.selectedDate.getMonth();

    // Portuguese Month Names
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    elements.miniCalMonth.textContent = `${monthNames[month]} ${year}`;

    elements.miniCalGrid.innerHTML = '';

    // Headers
    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    weekDays.forEach(day => {
        const el = document.createElement('div');
        el.className = 'mini-weekday-header';
        el.textContent = day;
        elements.miniCalGrid.appendChild(el);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty slots
    for (let i = 0; i < firstDay; i++) {
        elements.miniCalGrid.appendChild(document.createElement('div'));
    }

    // Days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const el = document.createElement('div');
        el.className = 'mini-day';
        el.textContent = i;
        if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
            el.innerHTML = `<b>${i}</b>`; // Bold today
            // Note: styling handles 'active' class for selection, 'today' logic is visual
        }
        if (i === state.selectedDate.getDate()) {
            el.classList.add('active');
        }

        el.addEventListener('click', () => {
            state.selectedDate = new Date(year, month, i);
            state.view = 'daily'; // Switch to daily view on click? Optional preferences.
            // Let's keep view but update date
            render();
        });

        elements.miniCalGrid.appendChild(el);
    }
}

/* --- Main Grid Logic --- */
function renderMainGrid() {
    elements.grid.innerHTML = '';
    const year = state.selectedDate.getFullYear();
    const month = state.selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    if (state.view === 'year' || state.view === 'month') {
        // Yearly/Monthly View (Legacy Roster View)
        if (state.managementMode) {
            renderHeatmapView(year, month, daysInMonth);
        } else {
            renderRosterView(year, month, daysInMonth);
        }
    } else if (state.view === 'day' || state.view === 'daily' || state.view === 'dia') {
        renderDailyView(state.selectedDate);
    } else if (state.view === 'week') {
        // Just fallback to month for now or implement week
        renderRosterView(year, month, daysInMonth); // Placeholder
    }
}

function renderRosterView(year, month, daysInMonth) {
    rosterData.forEach(nurse => {
        // Filter Teams
        // Assuming we categorize by ID ranges or explicit 'team' field if available
        // For now, heuristic or skip filter:
        if (!state.filters.teams.consulta && nurse.id < 91100) return; // Fake logic
        // Better: just render all for now as 'team' isn't in data

        const card = document.createElement('div');
        card.className = 'staff-card';
        // Highlight current user
        if (state.currentUser === nurse.name) {
            card.classList.add('highlight-row');
        }

        // Header
        const header = document.createElement('div');
        header.className = 'staff-header';
        header.innerHTML = `
            <div class="staff-name">${nurse.name} <span class="text-xs text-zinc-500">#${nurse.id}</span></div>
            <div>
                 <!-- Could put monthly totals here -->
            </div>
        `;
        card.appendChild(header);

        // Grid
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const shift = nurse.shifts[i] || ''; // 'F', '8-16', etc.

            const cell = document.createElement('div');
            cell.className = `day-cell ${isWeekend ? 'weekend' : ''}`;

            if (shift && shift !== 'F' && shift !== 'Fr') {
                cell.classList.add('has-shift');
            }

            // Filter Check (Visual only? or hide card if no shifts match? complex)
            // Just displaying

            cell.innerHTML = `
                <span style="font-size:0.6rem; opacity:0.5; margin-bottom:2px;">${i}</span>
                <div style="font-weight:bold;">${shift}</div>
            `;
            grid.appendChild(cell);
        }

        card.appendChild(grid);
        elements.grid.appendChild(card);
    });
}

function renderDailyView(date) {
    const day = date.getDate();
    // New Split Layout:
    // Left: Working (Morning / Interim / Afternoon)
    // Right: Off / Holiday / Absent

    elements.grid.innerHTML = ''; // Specific clear

    const workingStaff = [];
    const offStaff = [];

    rosterData.forEach(nurse => {
        const shift = nurse.shifts[day];
        if (!shift) return; // Or treat as empty?

        const shiftClean = shift.trim();
        const isOff = ['F', 'Fr', 'Aniv', 'Lf'].some(s => shiftClean.startsWith(s)) || shiftClean === '';

        const staffObj = { ...nurse, shift: shiftClean };

        if (!isOff) {
            workingStaff.push(staffObj);
        } else {
            offStaff.push(staffObj);
        }
    });

    // Sort working staff by start time
    workingStaff.sort((a, b) => {
        const startA = parseFloat(a.shift.split('-')[0].replace(',', '.')) || 0;
        const startB = parseFloat(b.shift.split('-')[0].replace(',', '.')) || 0;
        return startA - startB;
    });

    // Grouping
    const groups = {
        'Manhã': [],
        'Intermédio': [],
        'Tarde': []
    };

    workingStaff.forEach(s => {
        const shift = s.shift;
        if (SHIFTS_CONFIG['Manhã'].includes(shift)) groups['Manhã'].push(s);
        else if (SHIFTS_CONFIG['Intermédio'].includes(shift)) groups['Intermédio'].push(s);
        else if (SHIFTS_CONFIG['Tarde'].includes(shift)) groups['Tarde'].push(s);
        else groups['Manhã'].push(s); // Fallback
    });

    // Create Layout
    const wrapper = document.createElement('div');
    wrapper.className = 'daily-columns-wrapper';

    // Col 1: Working
    const workingCol = document.createElement('div');
    workingCol.className = 'daily-column';
    workingCol.innerHTML = '<div class="daily-column-header"><i class="fas fa-briefcase"></i> Escala de Serviço</div>';
    const workingGrid = document.createElement('div');
    workingGrid.className = 'daily-column-grid';

    // Render groups
    ['Manhã', 'Intermédio', 'Tarde'].forEach(groupName => {
        const list = groups[groupName];
        if (list.length === 0) return;

        const groupDiv = document.createElement('div');
        groupDiv.style.marginBottom = '1.5rem';

        const title = document.createElement('div');
        title.className = 'daily-group-title';
        title.innerHTML = `${groupName} <span class="count-pill">${list.length}</span>`;
        groupDiv.appendChild(title);

        list.forEach(nurse => {
            const card = document.createElement('div');
            card.className = 'staff-card daily-card compact';
            card.innerHTML = `
                <div class="staff-row">
                    <span class="staff-name-small">${nurse.name}</span>
                    <span class="shift-tag">${nurse.shift}</span>
                </div>
            `;
            groupDiv.appendChild(card);
        });
        workingGrid.appendChild(groupDiv);
    });

    if (workingStaff.length === 0) {
        workingGrid.innerHTML += '<div class="empty-state-text">Ninguém escalado.</div>';
    }

    workingCol.appendChild(workingGrid);

    // Col 2: Off / Absent
    const offCol = document.createElement('div');
    offCol.className = 'daily-column';
    offCol.innerHTML = '<div class="daily-column-header"><i class="fas fa-bed"></i> Ausências / Folgas</div>';
    const offGrid = document.createElement('div');
    offGrid.className = 'daily-column-grid';

    // Simple list for Off
    if (offStaff.length > 0) {
        // Group by type (Folga vs Holiday) could be nice, but flat list fine
        const grid = document.createElement('div');
        grid.className = 'daily-absent-grid';

        offStaff.forEach(nurse => {
            const card = document.createElement('div');
            card.className = 'staff-card daily-card absent';
            let label = 'Folga';
            if (nurse.shift === 'Aniv') label = 'Aniversário';
            if (nurse.shift === 'Lf') label = 'Licença';
            card.innerHTML = `
                 <span class="staff-name-muted">${nurse.name}</span>
                 <span class="shift-muted">${label}</span>
            `;
            grid.appendChild(card);
        });
        offGrid.appendChild(grid);
    } else {
        offGrid.innerHTML = '<div class="empty-state-text">Todos ao serviço!</div>';
    }

    offCol.appendChild(offGrid);

    wrapper.appendChild(workingCol);
    wrapper.appendChild(offCol);

    elements.grid.appendChild(wrapper);
}

function renderHeatmapView(year, month, daysInMonth) {
    // Top Stats Dashboard for Management
    const dashboard = document.createElement('div');
    dashboard.className = 'analytics-dashboard';

    // 1. Calculate Daily Coverage
    const coverage = Array(daysInMonth + 1).fill(0); // 1-indexed
    rosterData.forEach(nurse => {
        for (let i = 1; i <= daysInMonth; i++) {
            const shift = nurse.shifts[i];
            if (shift && !['F', 'Fr', 'Aniv', 'Lf'].includes(shift)) {
                coverage[i]++;
            }
        }
    });

    // 2. Render Header
    dashboard.innerHTML = `
        <div class="analytics-header">
            <div class="analytics-title">Visão Geral da Equipa</div>
            <div class="analytics-period">${state.selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
        </div>
        
        <div class="kpi-grid">
            <div class="stat-card">
                 <div class="kpi-number">${rosterData.length}</div>
                 <div class="kpi-caption">Total Enfermeiros</div>
            </div>
            <div class="stat-card">
                 <div class="kpi-number">${(coverage.reduce((a, b) => a + b, 0) / daysInMonth).toFixed(1)}</div>
                 <div class="kpi-caption">Média Staff / Dia</div>
            </div>
        </div>

        <div class="add-chart-section">
            <div class="chart-title">Distribuição Mensal (Staff por Dia)</div>
            <div class="bar-chart-container">
                ${coverage.slice(1).map((val, idx) => `
                    <div class="bar-group">
                        <div class="bar" style="height: ${(val / 25) * 100}%;">
                            <span class="bar-value">${val}</span>
                        </div>
                        <span class="bar-label">${idx + 1}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="chart-title">Calendário de Calor</div>
        <div class="monthly-heatmap-grid">
             ${coverage.slice(1).map((val, idx) => {
        let level = 0;
        if (val < 15) level = 1; // Critical
        else if (val < 19) level = 2; // Warning
        else if (val < 22) level = 3; // Good
        else level = 4; // Excellent
        return `<div class="heatmap-cell level-${level}" title="Dia ${idx + 1}: ${val} Pessoas">${idx + 1}</div>`;
    }).join('')}
        </div>
    `;

    elements.grid.appendChild(dashboard);
}


/* --- File Upload Logic --- */
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        processExcelData(json);
    };
    reader.readAsArrayBuffer(file);
}

async function handleGoogleSheetImport() {
    const url = elements.googleSheetUrl.value;
    if (!url) {
        alert("Por favor, insira um link válido do Google Sheets.");
        return;
    }

    // Extract ID (naive regex)
    const match = url.match(/\/d\/(.*?)(\/|$)/);
    if (!match) {
        alert("ID da folha não encontrado. Verifique o link.");
        return;
    }
    const sheetId = match[1];

    // Using a public CSV export trick for read-only public sheets
    // Note: This requires the sheet to be "Published to Web" effectively or Public.
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    try {
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error("Falha ao aceder à folha. Verifique as permissões (Público).");
        const csvText = await response.text();
        
        // Parse CSV (Simplified)
        const rows = csvText.split('\n').map(row => row.split(','));
        processExcelData(rows); // Reuse logic
        alert("Importado com sucesso!");
    } catch (err) {
        console.error(err);
        alert("Erro ao importar: " + err.message);
    }
}


function processExcelData(rows) {
    // Heuristic parsing assuming the format matches the sample:
    // Row 6-ish headers. ID, Nome at indices.
    // Days start at some index.

    // THIS IS A PLACEHOLDER IMPLEMENTATION
    // Real parsing needs to match the specific Excel stricture provided by user.
    // Given the 'data.js' structure, we can map it back.

    // For now, let's just log it.
    console.log("Excel Data Loaded:", rows);
    alert("Funcionalidade de processamento completa a ser implementada com base no layout final do Excel.");
}

/* --- Stats Logic --- */
function updateStatsAndUI() {
    if (!state.currentUser) {
        elements.myStatsSection.style.display = 'none';
        elements.identityWidget.style.display = 'none';
        elements.dynamicGreeting.textContent = "Bem vindo"; // Reset
        return;
    }

    elements.myStatsSection.style.display = 'block';
    
    // Update Identity Widget
    elements.identityWidget.style.display = 'flex';
    elements.userNameDisplay.textContent = state.currentUser;
    updateGreeting();

    const nurse = rosterData.find(n => n.name === state.currentUser);
    if (!nurse) return;

    let totalHours = 0;
    let totalShifts = 0;
    let totalNights = 0; // Placeholder
    let weekendsWorked = 0;

    const daysInMonth = new Date().getDate(); // Should use selected month days?
    // Let's use all data available in the object
    Object.keys(nurse.shifts).forEach(day => {
        const shift = nurse.shifts[day];
        const duration = STATS.calculateDuration(shift);
        if (duration > 0) {
            totalHours += duration;
            totalShifts++;
            if (STATS.isNight(shift)) totalNights++;
            if (STATS.isWeekend(2026, 1, parseInt(day))) weekendsWorked++; // Hardcoded year/month for now? Data is jan 2026 according to sidebar
        }
    });

    // Update Main Stats Panel
    elements.statHours.textContent = totalHours;
    elements.statShifts.textContent = totalShifts;
    elements.statNights.textContent = totalNights;
    elements.statWeekends.textContent = weekendsWorked;

    // Update Header Widget
    elements.kpiHours.textContent = totalHours;
    elements.kpiShifts.textContent = totalShifts;
    elements.kpiWeekends.textContent = weekendsWorked;
}

function exportCalendar() {
    if (!state.currentUser) return;
    const nurse = rosterData.find(n => n.name === state.currentUser);
    if (!nurse) return;

    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//HPA Nurse Planner//PT\n";
    
    // Iterate shifts
    const year = 2026; // Hardcoded in data context
    const month = 0; // Jan (0-indexed for Date, but data is 1..31)
    
    Object.keys(nurse.shifts).forEach(dayStr => {
        const shift = nurse.shifts[dayStr];
        if (STATS.calculateDuration(shift) > 0) {
            const day = parseInt(dayStr);
            // Parse start/end
            // "8-16" -> 08:00 to 16:00
            const parts = shift.replace('h','').split('-');
            if (parts.length === 2) {
                const sH = parseInt(parts[0]);
                const eH = parseInt(parts[1]);
                
                // Format dates: YYYYMMDDTHHMMSS
                const startDt = new Date(year, month, day, sH, 0);
                const endDt = new Date(year, month, day, eH, 0);
                
                const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                
                icsContent += "BEGIN:VEVENT\n";
                icsContent += `SUMMARY:Turno HPA (${shift})\n`;
                icsContent += `DTSTART:${fmt(startDt)}\n`;
                icsContent += `DTEND:${fmt(endDt)}\n`;
                icsContent += "END:VEVENT\n";
            }
        }
    });
    
    icsContent += "END:VCALENDAR";
    
    // Download
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `escala_${state.currentUser.replace(/\s+/g, '_')}.ics`;
    link.click();
}


// Run
document.addEventListener('DOMContentLoaded', init);
