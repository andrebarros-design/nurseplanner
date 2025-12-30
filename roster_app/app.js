const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// DEFINITIONS
const CONSULTA_EXTERNA_MEMBERS = [
    "Joselin Freitas",
    "Joana Cardoso",
    "Sara Fernandes",
    "Sofia Abreu",
    "Carolina Diogo",
    "Mariana Costa",
    "Joana Miranda"
];

function isWeekend(day, monthIdx, year) {
    const date = new Date(year, monthIdx, day);
    const d = date.getDay();
    return d === 0 || d === 6; // 0=Sun, 6=Sat
}

// STATE
let state = {
    selectedDate: new Date(2026, 0, 1),
    currentMonth: 'Janeiro',
    year: 2026,
    view: 'monthly',
    search: '',
    currentUser: null, // New State
    filters: {
        morning: true,
        interim: true,
        afternoon: true,
        saturday: true, // "Sábados" specific filter
        teamConsulta: true,
        teamGastro: true
    },
    managementMode: false // New Toggle
};

document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    // Load Filters from LocalStorage if available
    const savedFilters = localStorage.getItem('appFilters');
    if (savedFilters) {
        try {
            state.filters = JSON.parse(savedFilters);
        } catch (e) { console.error("Error loading filters", e); }
    }

    const savedUser = localStorage.getItem('appCurrentUser');
    if (savedUser) state.currentUser = savedUser;

    syncStateWithDate();
    updateGreeting();
    renderMiniCalendar();
    setupEventListeners();

    // Sync UI Checkboxes with Loaded State
    updateFilterCheckboxes();

    // Default checked state in HTML matches our JS default
    const saved = localStorage.getItem('yearData');
    if (saved) {
        window.yearData = JSON.parse(saved);
        render();
    } else {
        if (typeof rosterData !== 'undefined') {
            window.yearData = { 'Janeiro': rosterData };
            render();
        } else if (typeof initialData !== 'undefined') {
            window.yearData = initialData;
            render();
        }
    }
}

function updateFilterCheckboxes() {
    const map = {
        'filter-morning': 'morning',
        'filter-interim': 'interim',
        'filter-afternoon': 'afternoon',
        'filter-saturday': 'saturday',
        'filter-team-consulta': 'teamConsulta',
        'filter-team-gastro': 'teamGastro'
    };

    Object.keys(map).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = state.filters[map[id]];
    });
}

function syncStateWithDate() {
    state.currentMonth = MONTHS[state.selectedDate.getMonth()];
    state.year = state.selectedDate.getFullYear();
    const miniCalMonth = document.getElementById('miniCalMonth');
    if (miniCalMonth) {
        miniCalMonth.textContent = `${state.currentMonth} ${state.year}`;
    }
}

function updateGreeting() {
    const greetingEl = document.getElementById("dynamicGreeting");
    if (!greetingEl) return;

    // Always show current real date
    const now = new Date();
    const day = now.getDate();
    const month = MONTHS[now.getMonth()];
    const year = now.getFullYear();

    let info = `hoje é dia ${day} de ${month} de ${year}`;

    if (state.view === 'weekly') {
        const d = state.selectedDate;
        const start = getWeekStart(d);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        info = `Semana de ${start.getDate()} a ${end.getDate()} de ${MONTHS[end.getMonth()]}`;
    }

    greetingEl.textContent = `Bem vindo/a, ${info}`;
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function renderMiniCalendar() {
    const grid = document.getElementById('miniCalendarGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    weekDays.forEach(day => {
        const el = document.createElement('div');
        el.className = 'mini-weekday-header';
        el.textContent = day;
        el.style.fontSize = '0.7rem';
        el.style.color = 'var(--text-secondary)';
        grid.appendChild(el);
    });

    const year = state.year;
    const month = state.selectedDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        grid.appendChild(empty);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'mini-day';
        dayEl.textContent = i;

        if (i === state.selectedDate.getDate()) {
            dayEl.classList.add('active');
        }

        dayEl.addEventListener('click', () => {
            state.selectedDate = new Date(year, month, i);

            // Switch to Daily View
            state.view = 'daily';

            // Update View Buttons UI
            const viewBtns = document.querySelectorAll('.view-btn');
            viewBtns.forEach(b => {
                b.classList.remove('active');
                if (b.textContent === 'Dia') b.classList.add('active');
            });

            syncStateWithDate();
            updateGreeting();
            renderMiniCalendar();
            render();
        });

        grid.appendChild(dayEl);
    }
}

function setupEventListeners() {
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener("click", () => {
            document.querySelector(".sidebar").classList.toggle("open");
        });
    }

    const brandTitle = document.querySelector('.brand h1');
    if (brandTitle) {
        brandTitle.addEventListener('click', () => {
            // Reset to default state
            state.selectedDate = new Date(2026, 0, 1);
            state.view = 'monthly';
            state.search = '';

            const searchInput = document.getElementById('globalSearch');
            if (searchInput) searchInput.value = '';

            // Update View Buttons
            const viewBtns = document.querySelectorAll('.view-btn');
            viewBtns.forEach(b => {
                b.classList.remove('active');
                if (b.textContent === 'Mês') b.classList.add('active'); // Default
            });

            syncStateWithDate();
            updateGreeting();
            renderMiniCalendar();
            render();
        });
    }

    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.search = e.target.value.toLowerCase();
            render();
        });
    }

    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const closePanelBtn = document.querySelector('.close-panel');

    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('hidden');
        });
    }

    if (closePanelBtn && settingsPanel) {
        closePanelBtn.addEventListener('click', () => {
            settingsPanel.classList.add('hidden');
        });
    }

    const prevBtn = document.querySelector('.mini-cal-nav .fa-chevron-left');
    const nextBtn = document.querySelector('.mini-cal-nav .fa-chevron-right');
    if (prevBtn) prevBtn.addEventListener('click', () => changeMonth(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeMonth(1));

    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            state.selectedDate = new Date();
            syncStateWithDate();
            updateGreeting();
            renderMiniCalendar();
            render();
        });
    }

    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    const importSheetBtn = document.getElementById('importSheetBtn');
    if (importSheetBtn) {
        importSheetBtn.addEventListener('click', handleGoogleSheetImport);
    }

    // Setup Filter Listeners
    setupFilterListener('filter-morning', 'morning');
    setupFilterListener('filter-interim', 'interim');
    setupFilterListener('filter-afternoon', 'afternoon');
    setupFilterListener('filter-saturday', 'saturday');
    setupFilterListener('filter-team-consulta', 'teamConsulta');
    setupFilterListener('filter-team-gastro', 'teamGastro');

    // User Select Listener
    const userSelect = document.getElementById('userSelect');
    if (userSelect) {
        userSelect.addEventListener('change', (e) => {
            let val = e.target.value;

            if (val === '__CLEAR__' || val === '') {
                state.currentUser = null;
                localStorage.removeItem('appCurrentUser');
                val = null;
                // Reset Dropdown
                userSelect.value = "";
            } else {
                state.currentUser = val;
                localStorage.setItem('appCurrentUser', state.currentUser);
            }

            updateStatsAndUI();
            render();
        });
    }

    const userIdentityName = document.getElementById('userIdentityName');
    if (userIdentityName) {
        userIdentityName.addEventListener('click', () => {
            const settingsPanel = document.getElementById('settingsPanel');
            if (settingsPanel) settingsPanel.classList.remove('hidden');
        });
    }

    // Export Button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportCalendar);
    }

    // Management Toggle
    const mgmtToggle = document.getElementById('managementModeToggle');
    if (mgmtToggle) {
        mgmtToggle.addEventListener('change', (e) => {
            state.managementMode = e.target.checked;

            const legend = document.getElementById('heatmapLegend');
            if (legend) legend.style.display = state.managementMode ? 'block' : 'none';

            render();
        });
    }
}

function setupFilterListener(id, key) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('change', (e) => {
            state.filters[key] = e.target.checked;
            localStorage.setItem('appFilters', JSON.stringify(state.filters));
            render();
        });
    }

    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const txt = btn.textContent;
            if (txt === 'Ano') state.view = 'yearly';
            else if (txt === 'Mês') state.view = 'monthly';
            else if (txt === 'Semana') state.view = 'weekly';
            else if (txt === 'Dia') state.view = 'daily';

            updateGreeting();
            render();
        });
    });

    // Filters
    const checkboxes = document.querySelectorAll('.checkbox-filter input');
    // 0: Morning, 1: Afternoon, 2: Weekend
    if (checkboxes[0]) {
        checkboxes[0].addEventListener('change', (e) => {
            state.filters.morning = e.target.checked;
            render();
        });
    }
    if (checkboxes[1]) {
        checkboxes[1].addEventListener('change', (e) => {
            state.filters.afternoon = e.target.checked;
            render();
        });
    }
    if (checkboxes[2]) {
        checkboxes[2].addEventListener('change', (e) => {
            state.filters.weekend = e.target.checked;
            render();
        });
    }
}

function changeMonth(delta) {
    const d = state.selectedDate;
    d.setMonth(d.getMonth() + delta);
    state.selectedDate = new Date(d);
    syncStateWithDate();
    updateGreeting();
    renderMiniCalendar();
    render();
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
        const data = new Uint8Array(evt.target.result);
        processWorkbook(data, file.name);
        // Reset input so change event triggers again if needed
        e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}

async function handleGoogleSheetImport() {
    const urlInput = document.getElementById('googleSheetUrl');
    const url = urlInput.value.trim();

    if (!url) {
        alert("Por favor insira um link válido do Google Sheets.");
        return;
    }

    // Extract ID
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
        alert("ID da folha não encontrado. Certifique-se que o link está correto.");
        return;
    }

    const spreadsheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

    const btn = document.getElementById('importSheetBtn');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const response = await fetch(exportUrl);
        if (!response.ok) {
            throw new Error(`Erro ao descarregar: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        processWorkbook(data, `GoogleSheet_${spreadsheetId}`);

        urlInput.value = '';
    } catch (err) {
        console.error(err);
        alert("Erro ao importar do Google Sheets.\nVerifique se a folha está Partilhada como 'Qualquer pessoa com o link' (Pública) e se o acesso não está bloqueado.");
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

function processWorkbook(data, filenameSource) {
    const workbook = XLSX.read(data, { type: 'array' });

    // CLONE existing data to avoid wiping
    const newYearData = { ...window.yearData };

    let overwrittenMonths = [];
    const incomingData = {};

    // Parse all sheets first
    workbook.SheetNames.forEach(sheetName => {
        // Case-insensitive match for the month name
        const foundMonth = MONTHS.find(m => sheetName.toLowerCase().includes(m.toLowerCase()));

        if (foundMonth) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const roster = parseRoster(jsonData);

            if (roster && roster.length > 0) {
                if (newYearData[foundMonth] && newYearData[foundMonth].length > 0) {
                    overwrittenMonths.push(foundMonth);
                }
                incomingData[foundMonth] = roster;
            }
        }
    });

    // FALLBACK: If no data found via Sheet Names, check Filename
    if (Object.keys(incomingData).length === 0) {
        const filenameMonth = MONTHS.find(m => filenameSource.toLowerCase().includes(m.toLowerCase()));

        if (filenameMonth) {
            // Assume the first sheet belongs to this month
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const roster = parseRoster(jsonData);

            if (roster && roster.length > 0) {
                if (newYearData[filenameMonth] && newYearData[filenameMonth].length > 0) {
                    overwrittenMonths.push(filenameMonth);
                }
                incomingData[filenameMonth] = roster;
            }
        }
    }

    // If STILL no valid data found
    if (Object.keys(incomingData).length === 0) {
        alert("Não foram encontrados dados válidos. \nCertifique-se que o nome do Mês está no nome do ficheiro (ex: 'Dezembro.xlsx') ou no nome da folha.");
        return;
    }

    // Warn user if overwriting
    if (overwrittenMonths.length > 0) {
        const msg = `Atenção: Já existem dados importados para:\n${overwrittenMonths.join(', ')}\n\nDeseja substituir por estes novos dados?`;
        if (!confirm(msg)) {
            return;
        }
    }

    // Apply Merge
    Object.keys(incomingData).forEach(m => {
        newYearData[m] = incomingData[m];
    });

    window.yearData = newYearData;
    localStorage.setItem('yearData', JSON.stringify(newYearData));

    // Auto-navigate to the first imported month
    const firstImported = Object.keys(incomingData)[0];
    if (firstImported) {
        const monthIdx = MONTHS.indexOf(firstImported);
        // Keep year (assuming same year context for now)
        state.selectedDate = new Date(state.year, monthIdx, 1);
        syncStateWithDate();
        updateGreeting();
        renderMiniCalendar();
    }

    render();
    document.getElementById('settingsPanel').classList.add('hidden');
    alert("Dados importados com sucesso!");
}

function parseRoster(rows) {
    let dayRowIndex = -1;
    let dayIndices = {};

    // 1. Find the Date Header Row (Search up to 50 rows)
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const row = rows[i];
        let foundDates = 0;
        let tempIndices = {};

        if (!row) continue;

        row.forEach((cell, idx) => {
            // Allow numbers OR numeric strings (e.g. "1")
            let val = parseInt(cell);
            if (!isNaN(val) && val >= 1 && val <= 31) {
                // strict match to cell content to avoid "13.5" being parsed as 13
                // Check if cell is exactly just that number representation
                const strVal = String(cell).trim();
                if (strVal == String(val)) {
                    foundDates++;
                    // ONLY set if not set yet (Left-to-Right priority)
                    // This prevents "Next Month" preview dates (on the right) from overwriting "Current Month" dates
                    if (tempIndices[val] === undefined) {
                        tempIndices[val] = idx;
                    }
                }
            }
        });

        // Threshold: at least 10 valid date numbers in a row
        if (foundDates > 10) {
            dayRowIndex = i;
            dayIndices = tempIndices;
            break;
        }
    }

    if (dayRowIndex === -1) return [];

    const newRoster = [];
    const minDateCol = Math.min(...Object.values(dayIndices));

    for (let i = dayRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 1) continue;

        // 2. Intellectual Name Detection
        // Look for a valid string in columns BEFORE the first date column.
        // Usually idx 0, 1, or 2.
        let staffName = null;
        let staffId = row[0] || 'Unknown';
        let staffIsLead = false;
        let staffIsSupport = false;

        // Check columns 0 to minDateCol-1
        for (let col = 0; col < minDateCol; col++) {
            const cell = row[col];
            if (typeof cell === 'string' && cell.length > 2) {
                const clean = cell.trim();
                // Ignore headers/metadata keywords
                const ignoreKeywords = [
                    'NAME', 'NOME', 'TURNO', 'CATEGORIA',
                    'TOTAL', 'HORAS', 'BANCO', 'SOMA', 'SALDO', 'RUBRICA', 'RACIO', 'RÁCIO', 'INTERMÉDIO',
                    'RESP.', 'RATIO', 'STAFF'
                ];

                // Treat these as "Support/Info" rows
                const supportKeywords = [
                    'MANHÃ', 'TARDE', 'NOITE', '9T38', 'GASTRO HPM', 'GASTROHPM', 'UROLOGIA', 'BLOCO', 'CONSULTA', 'CARDIO', 'SERVIÇO', 'COLEGA', 'APOIO', 'IR', 'PISO -1'
                ];

                if (!ignoreKeywords.includes(clean.toUpperCase())) {
                    // Check for Lead tag (*)
                    let isLead = false;
                    if (clean.includes('*')) {
                        isLead = true;
                    }

                    staffName = clean.replace(/\*/g, '').trim();

                    // Capture ID if available (usually Col 0)
                    if (col > 0 && row[0]) {
                        staffId = row[0];
                    }

                    // Attach metadata to the temporary object? 
                    // We need to pass this out. 
                    // We'll rely on the existing scope variables 'staffName' and 'staffId', 
                    // plus a new 'staffIsLead' variable.
                    staffIsLead = isLead;

                    if (supportKeywords.includes(clean.toUpperCase())) {
                        staffIsSupport = true;
                    }

                    break; // stop at first valid name found
                }
            }
        }

        if (staffName) {
            const shifts = {};
            let hasData = false;

            for (let d = 1; d <= 31; d++) {
                const colIdx = dayIndices[d];
                if (colIdx !== undefined && row[colIdx] !== undefined) {
                    let val = row[colIdx];

                    // FIX: Convert Excel Serial Date numbers (e.g. 45885) back to text
                    // If user typed "8-16", Excel creates a Date ~Aug 16th.
                    if (typeof val === 'number' && val > 40000) {
                        try {
                            // Excel base: Dec 30 1899. 
                            // Convert serial to JS Date
                            const date = new Date((val - 25569) * 86400 * 1000);

                            // Extract likely components (Month and Day)
                            // "8-16" usually becomes Aug 16 (Mo=8, Dy=16) in US/Intl excel,
                            // OR "16-8" might become Aug 16 depending on locale.
                            // We assume standard Shift Format "Start-End".
                            // If user typed '8-16', Excel sees Month=8, Day=16.

                            const m = date.getMonth() + 1; // 1-12
                            const dNum = date.getDate();   // 1-31

                            // Reconstruct the likely shift string
                            // NOTE: This assumes the input was "Month-Day" interpretation.
                            val = `${m}-${dNum}`;
                        } catch (e) {
                            val = String(val);
                        }
                    }

                    let sVal = String(val);
                    shifts[d] = sVal;
                    hasData = true;
                } else {
                    shifts[d] = "";
                }
            }

            // Only add if there's at least one piece of shift data or it looks like a valid line
            if (hasData) {
                newRoster.push({
                    id: staffId,
                    name: staffName,
                    isLead: staffIsLead,
                    isSupport: staffIsSupport,
                    shifts: shifts
                });
            }
        }
    }
    return newRoster;
}

function render() {
    const gridContainer = document.getElementById('scheduleGrid');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';

    if (state.view === 'yearly') {
        renderYearlyView(gridContainer);
        return;
    }

    // Populate user select
    populateUserSelect();

    updateStatsAndUI();

    const rosterData = window.yearData ? window.yearData[state.currentMonth] : [];
    if (!rosterData || rosterData.length === 0) {
        gridContainer.innerHTML = `<div style="text-align:center; padding:3rem; color:var(--text-secondary)">
            Sem dados para ${state.currentMonth}.<br>Carregue um ficheiro Excel.
          </div>`;
        return;
    }

    let filtered = rosterData.filter(staff => {
        if (!staff.name.toLowerCase().includes(state.search)) return false;
        return true;
    });

    const teamConsulta = [];
    const teamGastro = [];

    filtered.forEach(staff => {
        const nameClean = staff.name.trim();
        if (CONSULTA_EXTERNA_MEMBERS.some(member => nameClean === member)) {
            teamConsulta.push(staff);
        } else if (!staff.isSupport) {
            teamGastro.push(staff);
        }
    });

    const sortAlpha = (a, b) => a.name.localeCompare(b.name);
    teamConsulta.sort(sortAlpha);
    teamGastro.sort(sortAlpha);

    // Filter Groups
    if (state.filters.teamConsulta) {
        renderGroup(gridContainer, "Consulta Externa", teamConsulta);
    }

    if (state.filters.teamGastro) {
        renderGroup(gridContainer, "Gastroenterologia", teamGastro);
    }
}

// Assuming Interim is something like 10h-19h, 11h-20h, while Morning is 8h-16h.
function getShiftType(shift) {
    if (!shift || ['F', 'Fr', 'Lf', 'Hol', 'Aniv', '', '-'].includes(shift)) return 'other';
    // Clean string (e.g. "9,5" -> "9.5")
    let startStr = shift.split('-')[0].replace(',', '.');
    // Remove non-numeric (like "h")
    startStr = startStr.replace(/[^\d.]/g, '');
    let start = parseFloat(startStr);

    if (isNaN(start)) return 'other';

    // Logic for Shift Categories based on Start Time
    if (start < 10) return 'morning';    // Starts 8, 9
    if (start >= 10 && start < 13) return 'interim'; // Starts 10, 11, 12
    if (start >= 13) return 'afternoon'; // Starts 13, 14...

    return 'morning'; // Fallback
}

function renderGroup(container, title, staffList) {
    if (staffList.length === 0) return;

    const section = document.createElement('div');
    section.className = 'team-section';
    if (state.view === "daily") {
        section.classList.add("daily-mode");
    }

    // Highlight Section if User belongs to it? 
    // Maybe not necessary, but highlight the ROW.

    section.innerHTML = `<h2 class="team-title">${title}</h2>`;
    container.appendChild(section);

    let startDay = 1;
    let endDay = 1;

    const monthIdx = MONTHS.indexOf(state.currentMonth);
    const daysInMonth = new Date(state.year, monthIdx + 1, 0).getDate();

    if (state.view === 'monthly') {
        startDay = 1;
        endDay = daysInMonth;
    } else if (state.view === 'daily') {
        startDay = state.selectedDate.getDate();
        endDay = startDay;
    } else if (state.view === 'weekly') {
        const d = state.selectedDate;
        const currentDay = d.getDay();
        let s = d.getDate() - currentDay; // simple sun logic
        let e = s + 6;
        if (s < 1) s = 1;
        if (e > daysInMonth) e = daysInMonth;
        startDay = s;
        endDay = e;
    }

    // Determine valid days
    let validDays = [];
    for (let d = startDay; d <= endDay; d++) {
        const isWe = isWeekend(d, monthIdx, state.year);
        // Using 'saturday' filter as the general Weekend toggle based on UI request structure
        if (!state.filters.saturday && isWe) continue;
        validDays.push(d);
    }

    // START: Specific Rendering for Daily View
    if (state.view === 'daily') {
        const day = validDays[0];

        // Buckets
        // Buckets
        const morningStaff = [];
        const interimStaff = [];
        const afternoonStaff = [];
        const offStaff = []; // Not displayed usually, but for tracking

        staffList.forEach(staff => {
            const shiftOriginal = staff.shifts[String(day)] || "";
            const type = getShiftType(shiftOriginal);
            const isOff = ['F', 'Fr', 'Hol', '', 'Folga', '-', 'Lf'].includes(shiftOriginal);

            if (isOff) {
                offStaff.push(staff);
            } else if (type === 'morning') {
                morningStaff.push(staff);
            } else if (type === 'interim') {
                interimStaff.push(staff);
            } else if (type === 'afternoon') {
                afternoonStaff.push(staff);
            } else {
                offStaff.push(staff);
            }
        });

        // Wrapper for the side-by-side columns
        const columnsWrapper = document.createElement('div');
        columnsWrapper.className = 'daily-columns-wrapper';
        section.appendChild(columnsWrapper);


        const renderColumn = (title, list, iconClass, wrapper) => {
            const col = document.createElement('div');
            col.className = 'daily-column';

            // Split Main vs Support
            const mainStaff = list.filter(s => !s.isSupport);
            const supportStaff = list.filter(s => s.isSupport);

            // User requested explicitly "Turno da manhã Turno da tarde". So let's always show the headers even if empty?
            // "Below the names with paddings..."

            col.innerHTML = `
                <div class="daily-column-header">
                    <i class="${iconClass}"></i> ${title} <span class="count-pill">${mainStaff.length}</span>
                </div>
            `;

            const grid = document.createElement('div');
            grid.className = 'daily-column-grid';

            if (mainStaff.length === 0 && supportStaff.length === 0) {
                grid.innerHTML = '<div class="empty-state-text">Ninguém escalado</div>';
            } else {
                // Render Main Staff
                mainStaff.forEach(staff => {
                    const card = document.createElement('div');
                    card.className = 'staff-card daily-card compact';

                    // Highlight if me
                    if (staff.name === state.currentUser) {
                        card.classList.add('highlight-row');
                        card.style.borderColor = 'var(--accent)'; // explicit override
                        card.style.background = 'rgba(38, 198, 218, 0.05)';
                    }

                    if (staff.isLead) card.classList.add('lead-card');

                    const shiftRaw = staff.shifts[String(day)] || "Folga";
                    let isDailyLead = shiftRaw.includes('*');

                    let displayShift = shiftRaw.replace(/\*/g, '').trim();
                    if (displayShift === 'Fr') displayShift = 'Hol';
                    if (displayShift === '') displayShift = 'Folga';

                    const showStar = isDailyLead || staff.isLead;
                    const leadBadge = showStar ? '<i class="fas fa-star" style="color:var(--highlight); margin-left:6px;" title="Responsável de Turno"></i>' : '';

                    card.innerHTML = `
                        <div class="staff-row">
                            <span class="staff-name-small">${staff.name}${leadBadge}</span>
                            <span class="shift-tag">${displayShift}</span>
                        </div>
                    `;
                    grid.appendChild(card);
                });

                // Render Support Section
                if (supportStaff.length > 0) {
                    const sep = document.createElement('div');
                    sep.style.cssText = 'margin-top:15px; margin-bottom:5px; padding-top:10px; border-top:1px solid var(--card-border); color:var(--text-secondary); font-size:0.75rem; text-transform:uppercase; font-weight:600;';
                    sep.innerText = 'Apoio / Informação';
                    grid.appendChild(sep);

                    supportStaff.forEach(staff => {
                        const card = document.createElement('div');
                        card.className = 'staff-card daily-card compact support-card';

                        // Highlight if me
                        if (staff.name === state.currentUser) {
                            card.classList.add('highlight-row');
                            card.style.borderColor = 'var(--accent)';
                        }

                        card.style.opacity = '0.9';
                        card.style.borderLeft = '2px solid var(--highlight)';

                        const shiftRaw = staff.shifts[String(day)] || "Folga";
                        let displayShift = shiftRaw.replace(/\*/g, '').trim();

                        card.innerHTML = `
                            <div class="staff-row">
                                <span class="staff-name-small" style="color:var(--highlight);">${staff.name}</span>
                                <span class="shift-tag">${displayShift}</span>
                            </div>
                        `;
                        grid.appendChild(card);
                    });
                }
            }
            col.appendChild(grid);
            wrapper.appendChild(col);
        };

        renderColumn("Manhã", morningStaff, "fas fa-sun", columnsWrapper);
        renderColumn("Intermédio", interimStaff, "fas fa-cloud-sun", columnsWrapper);
        renderColumn("Tarde", afternoonStaff, "fas fa-moon", columnsWrapper);

        // Absent Section for Daily View
        if (offStaff.length > 0) {
            const absentSection = document.createElement('div');
            absentSection.className = 'daily-absent-section';

            absentSection.innerHTML = `
                <div class="absent-header">
                    <i class="fas fa-bed"></i> Folgas / Ausências <span class="count-pill" style="background:var(--text-secondary);">${offStaff.length}</span>
                </div>
            `;

            const absentGrid = document.createElement('div');
            absentGrid.className = 'daily-absent-grid';

            offStaff.forEach(staff => {
                const card = document.createElement('div');
                card.className = 'staff-card daily-card absent';
                // Highlight if me
                if (staff.name === state.currentUser) {
                    card.classList.add('highlight-row');
                    card.style.borderColor = 'var(--accent)';
                    card.style.opacity = '1';
                }

                const shiftRaw = staff.shifts[String(day)] || "Folga";
                let displayShift = shiftRaw.replace(/\*/g, '').trim();
                if (displayShift === '') displayShift = 'Folga';

                card.innerHTML = `
                    <span class="staff-name-muted">${staff.name}</span>
                    <span class="shift-muted">${displayShift}</span>
                `;
                absentGrid.appendChild(card);
            });

            absentSection.appendChild(absentGrid);
            section.appendChild(absentSection);
        }

    } else {
        // MONTHLY / WEEKLY VIEW
        const grid = document.createElement('div');
        grid.className = 'staff-grid';

        staffList.forEach(staff => {
            const card = document.createElement('div');
            card.className = 'staff-card';

            // Current User Highlight
            if (staff.name === state.currentUser) {
                card.classList.add('highlight-row');
            }

            const header = document.createElement('div');
            header.className = 'staff-header';

            const nameEl = document.createElement('div');
            nameEl.className = 'staff-name';
            nameEl.textContent = staff.name;
            if (staff.isLead) {
                nameEl.innerHTML += ' <i class="fas fa-star" style="font-size:0.8rem; color:var(--highlight)" title="Responsável"></i>';
            }

            header.appendChild(nameEl);
            card.appendChild(header);

            const calGrid = document.createElement('div');
            calGrid.className = 'calendar-grid';

            // Headers
            for (let d = startDay; d <= endDay; d++) {
                // Header (optional in rows, but good for context if scrolling)
                // Leaving empty for now as standard roster usually just has cells
                // But we need to ensure alignment.
            }

            for (let d = startDay; d <= endDay; d++) {
                const cell = document.createElement('div');
                cell.className = 'day-cell';

                if (isWeekend(d, monthIdx, state.year)) {
                    cell.classList.add('weekend');
                }

                const shift = staff.shifts[d] || "";
                if (shift) {
                    cell.classList.add('has-shift');
                    // Check for Off Duty status
                    if (['F', 'Fr', 'Lf', 'Hol', 'Folga', '-', 'fv'].includes(shift) || shift.toLowerCase().includes('folga')) {
                        cell.classList.add('is-off-duty');
                    }
                }

                // Add Day Number (small)
                const dayNum = document.createElement('span');
                dayNum.style.cssText = 'font-size:0.6rem; color:var(--text-secondary); margin-bottom:2px; display:block; opacity:0.7;';
                dayNum.textContent = d;

                const shiftContent = document.createElement('div');
                shiftContent.style.fontWeight = 'bold';
                shiftContent.textContent = shift;

                cell.appendChild(dayNum);
                cell.appendChild(shiftContent);

                // Click to Daily View
                cell.addEventListener('click', () => {
                    state.selectedDate = new Date(state.year, monthIdx, d);
                    state.view = 'daily';
                    // Update View Buttons UI
                    const viewBtns = document.querySelectorAll('.view-btn');
                    viewBtns.forEach(b => {
                        b.classList.remove('active');
                        if (b.textContent === 'Dia') b.classList.add('active');
                    });
                    syncStateWithDate();
                    updateGreeting();
                    renderMiniCalendar();
                    render();
                });

                // --- HEATMAP INDICATOR (Management Mode) ---
                if (state.managementMode && !isWeekend(d, monthIdx, state.year)) {
                    // Calculate coverage for this specific day
                    // We need to look at the ENTIRE roster for this day, not just this group
                    // But 'rosterData' variable is local to 'render' function, not passed here.
                    // We can access 'window.yearData[state.currentMonth]' again.
                    const allStaff = window.yearData[state.currentMonth] || [];
                    const activeCount = allStaff.filter(s => {
                        const sh = s.shifts[d];
                        // Count if working (not off)
                        return sh && !['F', 'Fr', 'Lf', 'Hol', 'Folga', '-'].includes(sh);
                    }).length;

                    // Thresholds (Customize as needed)
                    // Low < 15, Med < 20, High >= 20 (Example for whole department)
                    // Or relative to team size? Let's use simple absolute numbers for now.
                    let level = 'low';
                    if (activeCount >= 20) level = 'high';
                    else if (activeCount >= 15) level = 'med';

                    const indicator = document.createElement('div');
                    indicator.className = `coverage-indicator coverage-${level}`;
                    indicator.title = `Staff: ${activeCount}`;
                    cell.appendChild(indicator);
                }

                calGrid.appendChild(cell);
            }
            card.appendChild(calGrid);
            grid.appendChild(card);
        });
        section.appendChild(grid);
    }
}

// ---------------------------------------------------------
// NEW FEATURES IMPLEMENTATION
// ---------------------------------------------------------

function populateUserSelect() {
    const userSelect = document.getElementById('userSelect');
    if (!userSelect) return;

    // Unique names across all months? Or just current month?
    // Let's use current month data effectively, or scan all if available.
    // For simplicity, current loaded month data.
    const rosterData = window.yearData ? window.yearData[state.currentMonth] : [];
    if (!rosterData) return;

    // Filter Logic to remove noise
    const ignoredNames = [
        'TOTAL', 'SOMA', 'SALDO', 'RÁCIO', 'RACIO', 'MANHÃ', 'TARDE', 'NOITE',
        'COLEGAS', 'APOIO', 'CARDIO', 'UROLOGIA', 'BLOCO', 'CONSULTA', 'GASTRO',
        'GASTRO HPM', 'GASTROHPM', 'SERVIÇO', 'PISO', 'IR', 'STAFF', '9T38'
    ];

    const names = rosterData
        .map(s => s.name)
        .filter(n => {
            if (!n || n.length <= 3) return false;

            // Check Whitelist first
            // If name matches a known member (exact or close), keep it!
            if (CONSULTA_EXTERNA_MEMBERS.includes(n)) return true;

            const upper = n.toUpperCase();

            // Reject exact matches or partial matches for some keywords
            if (ignoredNames.some(ignored => upper.includes(ignored))) return false;
            // Reject names with digits (e.g. "9T38", "Piso -1")
            if (/\d/.test(n)) return false;
            return true;
        })
        .sort();

    const uniqueNames = [...new Set(names)];

    // Preserve selection
    const current = state.currentUser;

    userSelect.innerHTML = '<option value="">-- Selecionar Enfermeiro --</option>';
    userSelect.innerHTML += '<option value="__CLEAR__" style="color:var(--highlight); font-weight:bold;">❌ Limpar Perfil</option>';

    uniqueNames.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (name === current) opt.selected = true;
        userSelect.appendChild(opt);
    });

    // Update stats if we have a user
    if (current) updateStatsAndUI();


}

function updateStatsAndUI() {
    const section = document.getElementById('myStatsSection');
    const widget = document.getElementById('identityWidget');

    if (!state.currentUser) {
        if (section) section.style.display = 'none';
        if (widget) widget.style.display = 'none';
        return;
    }
    if (section) section.style.display = 'block';

    const rosterData = window.yearData ? window.yearData[state.currentMonth] : [];
    if (!rosterData) return;

    const staff = rosterData.find(s => s.name === state.currentUser);

    let hours = 0;
    let shifts = 0;
    let weekends = 0;
    let nights = 0;

    if (staff) {
        const monthIdx = MONTHS.indexOf(state.currentMonth);

        Object.keys(staff.shifts).forEach(d => {
            const shift = staff.shifts[d];
            if (!shift || ['F', 'Fr', 'Lf', 'Hol', 'Folga', '-'].includes(shift)) return;

            shifts++;

            // Est. Hours
            // M=8, T=8, N=10? 
            // Simple heuristics
            if (shift.toUpperCase().includes('N')) {
                hours += 10;
                nights++;
            } else {
                hours += 8; // Default
            }

            // Weekend?
            if (isWeekend(parseInt(d), monthIdx, state.year)) {
                weekends++;
            }
        });
    }

    // Update Side Panel Stats
    const elStatHours = document.getElementById('statHours');
    if (elStatHours) elStatHours.innerText = hours;
    const elStatShifts = document.getElementById('statShifts');
    if (elStatShifts) elStatShifts.innerText = shifts;
    const elStatNights = document.getElementById('statNights');
    if (elStatNights) elStatNights.innerText = nights;
    const elStatWeekends = document.getElementById('statWeekends');
    if (elStatWeekends) elStatWeekends.innerText = weekends;

    // Update Top Bar Identity Widget (Option 1)
    if (widget) widget.style.display = 'flex';

    document.getElementById('userNameDisplay').textContent = state.currentUser;
    document.getElementById('kpiHours').innerText = hours;
    document.getElementById('kpiShifts').innerText = shifts + ((nights > 0) ? ` (${nights}N)` : '');
    document.getElementById('kpiWeekends').innerText = weekends;
}

function exportCalendar() {
    if (!state.currentUser) return;

    const rosterData = window.yearData ? window.yearData[state.currentMonth] : [];
    const staff = rosterData.find(s => s.name === state.currentUser);
    if (!staff) {
        alert("Erro: Dados não encontrados para este utilizador neste mês.");
        return;
    }

    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//HPA//NursePlanner//PT\n";
    const monthIdx = MONTHS.indexOf(state.currentMonth);
    const year = state.year; // 2026

    Object.keys(staff.shifts).forEach(d => {
        const shift = staff.shifts[d];
        if (!shift || ['F', 'Fr', 'Lf', 'Hol', 'Folga', '-'].includes(shift)) return;

        const dateStr = `${year}${String(monthIdx + 1).padStart(2, '0')}${String(d).padStart(2, '0')}`;

        // Define Times
        let startTime = "080000";
        let endTime = "160000";

        // Simple classifier
        const s = shift.toLowerCase();
        if (s.includes('t') || (parseInt(s) >= 13)) {
            startTime = "140000";
            endTime = "220000";
        } else if (s.includes('n')) {
            startTime = "220000";
            // Next day logic for end time is complex in simple text ics, assume +1 day?
            // Let's keep it simple: 22h - 08h
            // We usually just set start.
            endTime = "080000";
        } else if (s.includes('i') || (parseInt(s) >= 10 && parseInt(s) <= 12)) {
            startTime = "100000";
            endTime = "190000";
        }

        // Logic check: if night, end date is next day.
        let endDateStr = dateStr;
        if (s.includes('n')) {
            // quick hack date add
            const nextD = new Date(year, monthIdx, parseInt(d) + 1);
            endDateStr = `${nextD.getFullYear()}${String(nextD.getMonth() + 1).padStart(2, '0')}${String(nextD.getDate()).padStart(2, '0')}`;
        }

        icsContent += "BEGIN:VEVENT\n";
        icsContent += `SUMMARY:Turno ${shift}\n`;
        icsContent += `DTSTART:${dateStr}T${startTime}\n`;
        icsContent += `DTEND:${endDateStr}T${endTime}\n`;
        icsContent += `DESCRIPTION:Turno HPA - ${state.currentMonth}\n`;
        icsContent += "END:VEVENT\n";
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Escala_${state.currentUser}_${state.currentMonth}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}


function renderYearlyView(container) {
    if (!window.yearData) {
        container.innerHTML = '<div class="empty-state-text">Sem dados carregados.</div>';
        return;
    }

    const monthsAvailable = Object.keys(window.yearData);
    let totalShifts = 0;
    let totalStaffUnique = new Set();
    let shiftDist = { morning: 0, interim: 0, afternoon: 0, night: 0 };
    let monthlyCoverage = {}; // month -> avg active staff per day

    monthsAvailable.forEach(month => {
        const staffList = window.yearData[month];
        let dailyCounts = {};

        staffList.forEach(staff => {
            totalStaffUnique.add(staff.name);

            Object.values(staff.shifts).forEach(sh => {
                if (!sh || ['F', 'Fr', 'Lf', 'Hol', 'Folga', '-'].includes(sh)) return;
                totalShifts++;

                // Classify
                const s = sh.toLowerCase();
                if (s.includes('n')) shiftDist.night++;
                else {
                    // Numeric check
                    const val = parseInt(s); // '9' -> 9
                    if (!isNaN(val)) {
                        if (val < 10) shiftDist.morning++;
                        else if (val >= 10 && val < 13) shiftDist.interim++;
                        else shiftDist.afternoon++;
                    } else {
                        // Fallback text matching
                        if (s.includes('t')) shiftDist.afternoon++;
                        else shiftDist.morning++;
                    }
                }
            });

            // Coverage calc logic (simplified)
            // Iterate keys of shifts to map to days
            Object.keys(staff.shifts).forEach(d => {
                const sh = staff.shifts[d];
                if (sh && !['F', 'Fr', 'Lf', 'Hol', 'Folga', '-'].includes(sh)) {
                    dailyCounts[d] = (dailyCounts[d] || 0) + 1;
                }
            });
        });

        // Avg for this month
        const days = Object.values(dailyCounts);
        if (days.length > 0) {
            const avg = days.reduce((a, b) => a + b, 0) / days.length;
            monthlyCoverage[month] = avg.toFixed(1);
        } else {
            monthlyCoverage[month] = 0;
        }
    });

    const maxShiftVal = Math.max(shiftDist.morning, shiftDist.interim, shiftDist.afternoon, shiftDist.night) || 1;

    // HTML Construction
    let html = `
    <div class="analytics-dashboard">
        <div class="analytics-header">
            <div>
                <div class="analytics-title">Dashboard Anual</div>
                <div class="analytics-period">${state.year}</div>
            </div>
            <div style="text-align:right">
                <span class="staff-name-muted">${monthsAvailable.length} meses carregados</span>
            </div>
        </div>

        <div class="kpi-grid">
            <div class="kpi-card">
                <span class="kpi-caption">Total Turnos</span>
                <span class="kpi-number" style="color:#00b0ff">${totalShifts}</span>
            </div>
             <div class="kpi-card">
                <span class="kpi-caption">Equipa Ativa</span>
                <span class="kpi-number" style="color:#00e676">${totalStaffUnique.size}</span>
            </div>
             <div class="kpi-card">
                <span class="kpi-caption">Média Staff / Dia</span>
                <span class="kpi-number" style="color:#ffca28">${monthlyCoverage[state.currentMonth] || '-'}</span>
                <span style="font-size:0.7rem; color:var(--text-secondary)">Em ${state.currentMonth}</span>
            </div>
        </div>

        <div class="add-chart-section">
            <h3 class="chart-title">Distribuição de Turnos (Global)</h3>
            <div class="bar-chart-container">
                ${createBar('Manhã', shiftDist.morning, maxShiftVal)}
                ${createBar('Intermédio', shiftDist.interim, maxShiftVal)}
                ${createBar('Tarde', shiftDist.afternoon, maxShiftVal)}
                ${createBar('Noite', shiftDist.night, maxShiftVal)}
            </div>
        </div>

        <!-- Future: Heatmap Grid per month? -->
    </div>
    `;

    container.innerHTML = html;
}

function createBar(label, value, max) {
    const heightPct = (value / max) * 100;
    return `
    <div class="bar-group">
        <div class="bar-value">${value}</div>
        <div class="bar" style="height: ${heightPct}%;"></div>
        <span class="bar-label">${label}</span>
    </div>
    `;
}

