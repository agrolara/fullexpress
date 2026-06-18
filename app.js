// On-screen error debugger for remote troubleshooting
window.addEventListener('error', function(e) {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '10px';
    errorDiv.style.right = '10px';
    errorDiv.style.backgroundColor = '#ef4444';
    errorDiv.style.color = '#fff';
    errorDiv.style.padding = '12px 20px';
    errorDiv.style.borderRadius = '8px';
    errorDiv.style.zIndex = '99999';
    errorDiv.style.fontSize = '0.85rem';
    errorDiv.style.fontFamily = 'monospace';
    errorDiv.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.5)';
    errorDiv.style.maxWidth = '400px';
    errorDiv.innerHTML = '<strong>Error de JS:</strong> ' + e.message + '<br><small>en ' + e.filename.split('/').pop() + ':' + e.lineno + '</small>';
    document.body.appendChild(errorDiv);
});

// Application State
let state = {
    transactions: [],
    mileage: {}, // Format: { "YYYY-MM-DD": { km_inicial: X, km_final: Y } }
    settings: {
        valor_litro_bencina: 1300,
        rendimiento_promedio: 12
    },
    calculatedFuel: {} // Cache de cálculos de combustible en tiempo de ejecución
};

// Calendar Navigation State
let calendarCurrentMonth = new Date().getMonth();
let calendarCurrentYear = new Date().getFullYear();
let calendarSelectedDateStr = "";

// Spanish month names helper
const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Available categories based on transaction type
const categories = {
    ingreso: ['Viaje', 'Otros'],
    gasto: ['Bencina', 'Mantenimiento', 'Comida', 'Otros']
};

// Chart instances
let weeklyFinanceChart = null;
let expenseCategoryChart = null;
let fuelPerformanceChart = null;

// Period & PWA Global States
let deferredPrompt = null;
let statsActivePeriod = 'semana'; // 'semana', 'mes', 'historico'
let editingTxId = null;
let dashboardChartPeriod = 'week'; // 'week', 'month'

// DOM Elements
// DOM Elements (evaluated dynamically using getters to prevent null reference bugs)
const elements = {
    // Navigation
    get tabs() { return document.querySelectorAll('.nav-links li'); },
    get tabContents() { return document.querySelectorAll('.tab-content'); },
    
    // Calendar DOM
    get calendarMonthYear() { return document.getElementById('calendar-month-year'); },
    get calendarDaysGrid() { return document.getElementById('calendar-days-grid'); },
    get prevMonthBtn() { return document.getElementById('prev-month-btn'); },
    get nextMonthBtn() { return document.getElementById('next-month-btn'); },
    get selectedDayTitle() { return document.getElementById('selected-day-title'); },
    get selectedDayBadge() { return document.getElementById('selected-day-badge'); },
    get selectedDayBody() { return document.getElementById('selected-day-body'); },
    
    // Header
    get welcomeText() { return document.getElementById('welcome-text'); },
    get currentDateText() { return document.getElementById('current-date'); },
    get btnCustomTx() { return document.getElementById('btn-custom-tx'); },
    
    // KPIs
    get kpiIncome() { return document.getElementById('kpi-today-income'); },
    get kpiIncomeCount() { return document.getElementById('kpi-income-count'); },
    get kpiExpense() { return document.getElementById('kpi-today-expense'); },
    get kpiExpenseCount() { return document.getElementById('kpi-expense-count'); },
    get kpiBalance() { return document.getElementById('kpi-today-balance'); },
    get kpiBalanceStatus() { return document.getElementById('kpi-balance-status'); },
    get kpiFuelPerf() { return document.getElementById('kpi-fuel-performance'); },
    get kpiFuelSubtext() { return document.getElementById('kpi-fuel-subtext'); },
    
    // Mileage Form
    get mileageForm() { return document.getElementById('mileage-form'); },
    get kmInitialInput() { return document.getElementById('km-initial'); },
    get kmFinalInput() { return document.getElementById('km-final'); },
    get summaryDistance() { return document.getElementById('summary-distance'); },
    get summaryFuelCost() { return document.getElementById('summary-fuel-cost'); },
    get summaryFuelCarryover() { return document.getElementById('summary-fuel-carryover'); },
    get summaryFuelPurchased() { return document.getElementById('summary-fuel-purchased'); },
    get summaryFuelSurplus() { return document.getElementById('summary-fuel-surplus'); },
    get summaryCostPerKm() { return document.getElementById('summary-cost-per-km'); },
    
    // Quick Buttons
    get quickIncomeBtns() { return document.querySelectorAll('.btn-quick-income'); },
    get quickExpenseBtns() { return document.querySelectorAll('.btn-quick-expense'); },
    
    // Recent & Full Transactions
    get recentList() { return document.getElementById('recent-transactions-list'); },
    get fullTableBody() { return document.getElementById('full-transactions-table-body'); },
    get viewAllTxBtn() { return document.getElementById('view-all-tx'); },
    get filterType() { return document.getElementById('filter-type'); },
    get filterCategory() { return document.getElementById('filter-category'); },
    get btnClearData() { return document.getElementById('btn-clear-data'); },
    
    // Mileage History
    get mileageTableBody() { return document.getElementById('mileage-history-table-body'); },
    
    // Fuel Settings
    get fuelSettingsForm() { return document.getElementById('fuel-settings-form'); },
    get fuelPriceLiterInput() { return document.getElementById('fuel-price-liter'); },
    get fuelEfficiencyInput() { return document.getElementById('fuel-efficiency'); },
    get settingsSound() { return document.getElementById('settings-sound'); },
    get settingsVibration() { return document.getElementById('settings-vibration'); },
    
    // Stats Globals
    get statTotalIncome() { return document.getElementById('stat-total-income'); },
    get statTotalExpense() { return document.getElementById('stat-total-expense'); },
    get statTotalBalance() { return document.getElementById('stat-total-balance'); },
    get statTotalKm() { return document.getElementById('stat-total-km'); },
    get statAvgPerf() { return document.getElementById('stat-avg-performance'); },
    get statsGlobalTitle() { return document.getElementById('stats-global-title'); },
    get btnFilterPeriods() { return document.querySelectorAll('.btn-filter-period'); },
    
    // Modal
    get txModal() { return document.getElementById('tx-modal'); },
    get btnCloseModal() { return document.getElementById('btn-close-modal'); },
    get customTxForm() { return document.getElementById('custom-tx-form'); },
    get modalTxCategory() { return document.getElementById('tx-category'); },
    get modalTxDate() { return document.getElementById('tx-date'); },

    // Theme & Installation
    get btnThemeToggle() { return document.getElementById('btn-theme-toggle'); },
    get btnInstallApp() { return document.getElementById('btn-install-app'); },
    get sidebarInstallLi() { return document.getElementById('sidebar-install-li'); },

    // Period Summaries (Dashboard)
    get weekIncome() { return document.getElementById('week-income'); },
    get weekExpense() { return document.getElementById('week-expense'); },
    get weekBalance() { return document.getElementById('week-balance'); },
    get weekDistance() { return document.getElementById('week-distance'); },
    get weekFuelCost() { return document.getElementById('week-fuel-cost'); },
    get monthIncome() { return document.getElementById('month-income'); },
    get monthExpense() { return document.getElementById('month-expense'); },
    get monthBalance() { return document.getElementById('month-balance'); },
    get monthDistance() { return document.getElementById('month-distance'); },
    get monthFuelCost() { return document.getElementById('month-fuel-cost'); },

    // Chart Toggles (Dashboard)
    get btnChartWeek() { return document.getElementById('btn-chart-week'); },
    get btnChartMonth() { return document.getElementById('btn-chart-month'); },
    get chartTitleText() { return document.getElementById('chart-title-text'); },
    get kmDateInput() { return document.getElementById('km-date'); },
    get modalTitleText() { return document.getElementById('modal-title-text'); }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    // Set current date in header
    updateHeaderDate();
    
    // Load data from LocalStorage or seed with mockup data
    loadState();

    // Apply last selected theme
    initTheme();
    
    // Initialize icons
    lucide.createIcons();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set modal date default to today
    elements.modalTxDate.value = getTodayString();
    
    // Set mileage form date default to today
    if (elements.kmDateInput) {
        elements.kmDateInput.value = getTodayString();
    }
    
    // Sync settings UI checkboxes
    initSettingsUI();
    
    // Register Service Worker
    registerServiceWorker();

    // Render everything
    updateUI();
});

// Sound synthesis using Web Audio API (Zero network calls, 100% offline)
function playAudio(type) {
    if (!state.settings || state.settings.sound_enabled === false) return;
    
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        if (type === 'income') {
            // Success/Coin sound (Double upward chime)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            
            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            osc.start(ctx.currentTime);
            
            osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
            osc.stop(ctx.currentTime + 0.35);
        } else if (type === 'expense') {
            // Expense sound (Swoosh/descending sound)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'triangle';
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            
            osc.frequency.setValueAtTime(350, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.25);
        } else if (type === 'click') {
            // Very short tick/pop
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.03, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
            
            osc.frequency.setValueAtTime(950, ctx.currentTime);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.04);
        } else if (type === 'error') {
            // Double low beep
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.type = 'sawtooth';
            gain1.gain.setValueAtTime(0.06, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
            osc1.frequency.setValueAtTime(180, ctx.currentTime);
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.12);
            
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.type = 'sawtooth';
            gain2.gain.setValueAtTime(0.06, ctx.currentTime + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.27);
            osc2.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
            osc2.start(ctx.currentTime + 0.15);
            osc2.stop(ctx.currentTime + 0.27);
        }
    } catch (e) {
        console.error('Error playing audio:', e);
    }
}

// Vibration helper (Vibrates only if supported and enabled)
function vibrate(pattern) {
    if (!state.settings || state.settings.vibration_enabled === false) return;
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            console.warn('Vibration failed:', e);
        }
    }
}

// Register Service Worker for PWA
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('Service Worker registrado con éxito', reg.scope))
                .catch(err => console.error('Error al registrar Service Worker', err));
        });
    }
}

// Initialize theme from saved settings or system preferences
function initTheme() {
    let currentTheme = localStorage.getItem('radiotaxi_theme') || 'dark';
    
    // If no preference is set, check system preferences
    if (!localStorage.getItem('radiotaxi_theme')) {
        const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        currentTheme = prefersLight ? 'light' : 'dark';
    }
    
    setTheme(currentTheme);
}

// Helper to set theme
function setTheme(theme) {
    const isLight = theme === 'light';
    if (isLight) {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
    
    // Update theme toggle icon
    const themeBtn = elements.btnThemeToggle;
    if (themeBtn) {
        themeBtn.innerHTML = isLight ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
        lucide.createIcons();
    }
    
    localStorage.setItem('radiotaxi_theme', theme);
}

// Toggle theme on button click
function toggleTheme() {
    const isCurrentlyLight = document.body.classList.contains('light-theme');
    const newTheme = isCurrentlyLight ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Update active chart colors
    updateCharts();
    
    playAudio('click');
}

// Sync settings checkboxes with current state
function initSettingsUI() {
    if (elements.settingsSound) {
        elements.settingsSound.checked = state.settings.sound_enabled !== false;
    }
    if (elements.settingsVibration) {
        elements.settingsVibration.checked = state.settings.vibration_enabled !== false;
    }
}

// Listen for standard PWA beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent standard browser banner from showing
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show our custom install promotion elements
    if (elements.btnInstallApp) elements.btnInstallApp.style.display = 'flex';
    if (elements.sidebarInstallLi) elements.sidebarInstallLi.style.display = 'flex';
});

// Trigger the installation process
function installPWA() {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('El conductor aceptó instalar la app');
        } else {
            console.log('El conductor rechazó la instalación');
        }
        // Reset deferredPrompt
        deferredPrompt = null;
        
        // Hide promotion buttons
        if (elements.btnInstallApp) elements.btnInstallApp.style.display = 'none';
        if (elements.sidebarInstallLi) elements.sidebarInstallLi.style.display = 'none';
    });
}

// Hide install elements when app is installed
window.addEventListener('appinstalled', (evt) => {
    console.log('Radio Taxi Full Express instalado correctamente');
    deferredPrompt = null;
    if (elements.btnInstallApp) elements.btnInstallApp.style.display = 'none';
    if (elements.sidebarInstallLi) elements.sidebarInstallLi.style.display = 'none';
    showToast('¡Aplicación instalada con éxito!', 'success');
});

// Actualiza el saludo dinámico según la hora local del dispositivo del conductor
function updateHeaderDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elements.currentDateText.innerText = today.toLocaleDateString('es-CL', options);
    
    const hour = today.getHours();
    let welcome = 'Buenas noches, Conductor';
    if (hour >= 6 && hour < 12) {
        welcome = 'Buenos días, Conductor'; // De 6:00 AM a 11:59 AM
    } else if (hour >= 12 && hour < 20) {
        welcome = 'Buenas tardes, Conductor'; // De 12:00 PM a 7:59 PM
    } else {
        welcome = 'Buenas noches, Conductor'; // De 8:00 PM a 5:59 AM (o madrugada)
    }
    
    elements.welcomeText.innerText = welcome;
}

// Generate Date string in local YYYY-MM-DD format
function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format number to local currency (Chilean Peso style)
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(amount);
}

// Format number with thousands separators (Chilean style)
function formatNumberWithDots(amount) {
    return new Intl.NumberFormat('es-CL').format(amount);
}

// Helper to format date strings nicely
function formatDateString(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year.substring(2)}`;
}

// Get raw time string
function getCurrentTimeStr() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// Show feedback toasts
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'danger') icon = 'alert-triangle';
    if (type === 'warning') icon = 'alert-circle';
    
    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons({ attrs: { class: 'lucide-toast-icon' } });
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

// Load state from local storage or start fresh
function loadState() {
    const savedState = localStorage.getItem('radiotaxi_state');
    if (savedState) {
        state = JSON.parse(savedState);
    } else {
        // Estado completamente vacío para empezar limpio
        state.transactions = [];
        state.mileage = {};
    }
    
    // Garantizar que existan las configuraciones válidas para evitar NaN o errores
    const s = state.settings;
    if (!s || !s.valor_litro_bencina || !s.rendimiento_promedio ||
        isNaN(Number(s.valor_litro_bencina)) || isNaN(Number(s.rendimiento_promedio)) ||
        Number(s.valor_litro_bencina) <= 0 || Number(s.rendimiento_promedio) <= 0) {
        state.settings = {
            valor_litro_bencina: 1300,
            rendimiento_promedio: 12
        };
    } else {
        // Forzar a número limpio
        state.settings.valor_litro_bencina = Number(state.settings.valor_litro_bencina);
        state.settings.rendimiento_promedio = Number(state.settings.rendimiento_promedio);
    }
    state.calculatedFuel = {};
    
    // Limpiar datos de prueba/mock de días que no son hoy
    // Se ejecuta en CADA carga para garantizar limpieza total
    const todayStr = getTodayString();
    const hadOldData = state.transactions.some(t => t.fecha !== todayStr) ||
                       Object.keys(state.mileage).some(d => d !== todayStr);
    if (hadOldData) {
        // Eliminar transacciones de días anteriores que sean datos de prueba (IDs con 'mock' o 'today-')
        state.transactions = state.transactions.filter(t => {
            // Mantener solo transacciones de hoy, o transacciones reales de otros días
            if (t.fecha === todayStr) return true;
            // Eliminar datos mock/prueba de cualquier día
            if (t.id && (t.id.includes('mock') || t.id.includes('tx-today-'))) return false;
            // Mantener datos reales de otros días
            return true;
        });
        // Eliminar kilometraje de días pasados que tengan valores de prueba (km_inicial de 120500-121520)
        for (const date in state.mileage) {
            if (date !== todayStr) {
                const log = state.mileage[date];
                const isMock = log.km_inicial >= 120500 && log.km_inicial <= 121520;
                if (isMock) delete state.mileage[date];
            }
        }
        saveState();
    }
}

// Save state to local storage
function saveState() {
    localStorage.setItem('radiotaxi_state', JSON.stringify(state));
}

// Restablecer el estado a un punto limpio (sin datos de prueba)
function generateMockupData() {
    state.transactions = [];
    state.mileage = {};
    // Mantener las configuraciones de combustible actuales si existen
    if (!state.settings || !state.settings.valor_litro_bencina || !state.settings.rendimiento_promedio) {
        state.settings = {
            valor_litro_bencina: 1300,
            rendimiento_promedio: 12
        };
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Navigation Tabs
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Toggle nav active class
            elements.tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Toggle content visibility
            elements.tabContents.forEach(content => {
                if (content.id === `tab-${targetTab}`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
            
            // Refresh charts if stats tab selected
            if (targetTab === 'statistics' || targetTab === 'dashboard') {
                updateCharts();
            }
            if (targetTab === 'calendar') {
                if (!calendarSelectedDateStr) calendarSelectedDateStr = getTodayString();
                renderCalendar();
                selectCalendarDay(calendarSelectedDateStr);
            }
            
            // Audiovisual feedback
            playAudio('click');
            vibrate(15);
        });
    });

    // Calendar month control buttons
    elements.prevMonthBtn.addEventListener('click', () => {
        calendarCurrentMonth--;
        if (calendarCurrentMonth < 0) {
            calendarCurrentMonth = 11;
            calendarCurrentYear--;
        }
        renderCalendar();
    });

    elements.nextMonthBtn.addEventListener('click', () => {
        calendarCurrentMonth++;
        if (calendarCurrentMonth > 11) {
            calendarCurrentMonth = 0;
            calendarCurrentYear++;
        }
        renderCalendar();
    });

    // View all transactions redirect
    elements.viewAllTxBtn.addEventListener('click', () => {
        const txTab = document.querySelector('[data-tab="transactions"]');
        if (txTab) txTab.click();
    });

    // Quick Income Buttons
    elements.quickIncomeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseInt(btn.getAttribute('data-amount'), 10);
            addQuickTransaction('ingreso', 'Viaje', amount, 'Viaje rápido');
        });
    });

    // Quick Expense Buttons
    elements.quickExpenseBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseInt(btn.getAttribute('data-amount'), 10);
            addQuickTransaction('gasto', 'Bencina', amount, 'Carga rápida bencina');
        });
    });

    // Mileage Form Submit
    elements.mileageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveMileageLog();
    });

    // Recalculate mileage totals on input keyup
    elements.kmInitialInput.addEventListener('input', calculateActiveMileagePerformance);
    elements.kmFinalInput.addEventListener('input', calculateActiveMileagePerformance);
    
    // Recalculate when fuel settings inputs are typed in real-time
    elements.fuelPriceLiterInput.addEventListener('input', calculateActiveMileagePerformance);
    elements.fuelEfficiencyInput.addEventListener('input', calculateActiveMileagePerformance);

    // Mileage date change event listener
    if (elements.kmDateInput) {
        elements.kmDateInput.addEventListener('change', () => {
            const selectedKmDate = elements.kmDateInput.value || getTodayString();
            
            // Update title text dynamically
            const isToday = (selectedKmDate === getTodayString());
            const cardTitle = document.getElementById('mileage-card-title');
            if (cardTitle) {
                cardTitle.innerText = isToday ? 'Control de Kilometraje de Hoy' : `Control de Kilometraje: ${formatDateString(selectedKmDate)}`;
            }
            
            // Load mileage log for selected date
            const log = state.mileage[selectedKmDate];
            if (log) {
                elements.kmInitialInput.value = log.km_inicial || '';
                elements.kmFinalInput.value = log.km_final || '';
            } else {
                elements.kmInitialInput.value = '';
                elements.kmFinalInput.value = '';
                
                // Auto fill starting mileage with closing mileage of latest log before that date
                const dates = Object.keys(state.mileage).filter(d => d < selectedKmDate).sort();
                if (dates.length > 0) {
                    const lastDate = dates[dates.length - 1];
                    const lastLog = state.mileage[lastDate];
                    if (lastLog && lastLog.km_final > 0) {
                        elements.kmInitialInput.value = lastLog.km_final;
                    }
                }
            }
            calculateActiveMileagePerformance();
            playAudio('click');
        });
    }

    // Custom Transaction Modal triggers
    elements.btnCustomTx.addEventListener('click', () => {
        editingTxId = null;
        if (elements.modalTitleText) {
            elements.modalTitleText.innerText = 'Nueva Transacción';
        }
        populateModalCategories('ingreso');
        document.getElementById('type-income').checked = true;
        elements.txModal.classList.add('active');
    });

    elements.btnCloseModal.addEventListener('click', () => {
        elements.txModal.classList.remove('active');
        elements.customTxForm.reset();
        elements.modalTxDate.value = getTodayString();
        editingTxId = null;
        if (elements.modalTitleText) {
            elements.modalTitleText.innerText = 'Nueva Transacción';
        }
    });

    // Toggle categories when switching type in modal
    document.getElementById('type-income').addEventListener('change', () => populateModalCategories('ingreso'));
    document.getElementById('type-expense').addEventListener('change', () => populateModalCategories('gasto'));

    // Custom Transaction Submit
    elements.customTxForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveCustomTransaction();
    });

    // Filters on transaction tab
    elements.filterType.addEventListener('change', () => {
        renderFullTransactionsTable();
        playAudio('click');
    });
    elements.filterCategory.addEventListener('change', () => {
        renderFullTransactionsTable();
        playAudio('click');
    });

    // Fuel Settings Form Submit
    elements.fuelSettingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveFuelSettings();
    });

    // Reset Data Button
    elements.btnClearData.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas borrar TODOS los datos? Se eliminarán todas las transacciones y el historial de kilometraje.')) {
            generateMockupData();
            saveState();
            updateUI();
            showToast('Datos restablecidos a los valores iniciales de prueba.', 'warning');
            playAudio('error');
            vibrate([100, 50, 100]);
        }
    });

    // PWA Install Button Triggers
    if (elements.btnInstallApp) {
        elements.btnInstallApp.addEventListener('click', () => {
            installPWA();
            playAudio('click');
        });
    }
    if (elements.sidebarInstallLi) {
        elements.sidebarInstallLi.addEventListener('click', () => {
            installPWA();
            playAudio('click');
        });
    }

    // Theme Toggle Button Trigger
    if (elements.btnThemeToggle) {
        elements.btnThemeToggle.addEventListener('click', () => {
            toggleTheme();
        });
    }

    // System Settings Checkboxes (Sound & Vibration)
    if (elements.settingsSound) {
        elements.settingsSound.addEventListener('change', (e) => {
            state.settings.sound_enabled = e.target.checked;
            saveState();
            if (state.settings.sound_enabled) {
                playAudio('income');
            }
        });
    }
    if (elements.settingsVibration) {
        elements.settingsVibration.addEventListener('change', (e) => {
            state.settings.vibration_enabled = e.target.checked;
            saveState();
            if (state.settings.vibration_enabled) {
                vibrate(50);
            }
        });
    }

    // Statistics Period Filter Buttons
    if (elements.btnFilterPeriods) {
        elements.btnFilterPeriods.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.btnFilterPeriods.forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                
                statsActivePeriod = btn.getAttribute('data-period');
                renderGlobalStatsTable();
                updateCharts();
                
                playAudio('click');
                vibrate(15);
            });
        });
    }

    // Dashboard Finance Chart Toggle Buttons
    if (elements.btnChartWeek && elements.btnChartMonth) {
        elements.btnChartWeek.addEventListener('click', () => {
            elements.btnChartWeek.classList.add('active');
            elements.btnChartMonth.classList.remove('active');
            dashboardChartPeriod = 'week';
            if (elements.chartTitleText) elements.chartTitleText.innerText = 'Resumen de la Semana';
            updateCharts();
            playAudio('click');
            vibrate(15);
        });

        elements.btnChartMonth.addEventListener('click', () => {
            elements.btnChartMonth.classList.add('active');
            elements.btnChartWeek.classList.remove('active');
            dashboardChartPeriod = 'month';
            if (elements.chartTitleText) elements.chartTitleText.innerText = 'Resumen del Mes';
            updateCharts();
            playAudio('click');
            vibrate(15);
        });
    }
}

// Add transaction from quick buttons
function addQuickTransaction(tipo, categoria, monto, descripcion) {
    const todayStr = getTodayString();
    const newTx = {
        id: 'tx-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        fecha: todayStr,
        hora: getCurrentTimeStr(),
        tipo: tipo,
        categoria: categoria,
        monto: monto,
        descripcion: descripcion
    };
    
    state.transactions.unshift(newTx);
    saveState();
    updateUI();
    
    const moneyFormatted = formatCurrency(monto);
    showToast(`Registrado ${tipo === 'ingreso' ? 'ingreso' : 'gasto'} de ${moneyFormatted} correctamente`, 'success');
    
    // Audiovisual feedback
    if (tipo === 'ingreso') {
        playAudio('income');
        vibrate([30, 30, 30]);
    } else {
        playAudio('expense');
        vibrate(40);
    }
}

// Update categories in Modal selection based on transaction type
function populateModalCategories(type) {
    elements.modalTxCategory.innerHTML = '';
    categories[type].forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.text = cat;
        elements.modalTxCategory.appendChild(option);
    });
}

// Save transaction from custom modal form
function saveCustomTransaction() {
    const type = document.querySelector('input[name="tx-type"]:checked').value;
    const amount = parseInt(elements.customTxForm.querySelector('#tx-amount').value, 10);
    const category = elements.modalTxCategory.value;
    const date = elements.modalTxDate.value;
    const desc = elements.customTxForm.querySelector('#tx-desc').value || (type === 'ingreso' ? 'Ingreso' : 'Gasto');
    
    let isEditing = false;
    if (editingTxId) {
        const txIndex = state.transactions.findIndex(t => t.id === editingTxId);
        if (txIndex !== -1) {
            state.transactions[txIndex].fecha = date;
            state.transactions[txIndex].tipo = type;
            state.transactions[txIndex].categoria = category;
            state.transactions[txIndex].monto = amount;
            state.transactions[txIndex].descripcion = desc;
            isEditing = true;
        }
        editingTxId = null;
        if (elements.modalTitleText) {
            elements.modalTitleText.innerText = 'Nueva Transacción';
        }
    } else {
        const newTx = {
            id: 'tx-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            fecha: date,
            hora: getCurrentTimeStr(),
            tipo: type,
            categoria: category,
            monto: amount,
            descripcion: desc
        };
        state.transactions.unshift(newTx);
    }
    
    saveState();
    
    // Close modal
    elements.txModal.classList.remove('active');
    elements.customTxForm.reset();
    elements.modalTxDate.value = getTodayString();
    
    updateUI();
    
    if (isEditing) {
        showToast('Transacción actualizada con éxito', 'success');
    } else {
        showToast(`Transacción por ${formatCurrency(amount)} guardada`, 'success');
    }
    
    // Audiovisual feedback
    if (type === 'ingreso') {
        playAudio('income');
        vibrate([50, 40, 50]);
    } else {
        playAudio('expense');
        vibrate(50);
    }
}

// Open Modal to Edit an Existing Transaction
function openEditTransactionModal(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;
    
    editingTxId = id;
    
    // Set modal title to "Editar Transacción"
    if (elements.modalTitleText) {
        elements.modalTitleText.innerText = 'Editar Transacción';
    }
    
    // Set type radio button
    if (tx.tipo === 'ingreso') {
        document.getElementById('type-income').checked = true;
    } else {
        document.getElementById('type-expense').checked = true;
    }
    
    // Populate categories based on type
    populateModalCategories(tx.tipo);
    
    // Pre-fill inputs
    elements.modalTxCategory.value = tx.categoria;
    document.getElementById('tx-amount').value = tx.monto;
    elements.modalTxDate.value = tx.fecha;
    document.getElementById('tx-desc').value = tx.descripcion || '';
    
    // Open modal
    elements.txModal.classList.add('active');
    
    playAudio('click');
    vibrate(15);
}

// Save Fuel Settings from form
function saveFuelSettings() {
    let price = parseInt(elements.fuelPriceLiterInput.value, 10);
    let efficiency = parseFloat(elements.fuelEfficiencyInput.value);
    
    if (isNaN(price) || price <= 0) price = 1300;
    if (isNaN(efficiency) || efficiency <= 0) efficiency = 12;
    
    const soundEnabled = elements.settingsSound ? elements.settingsSound.checked : true;
    const vibrationEnabled = elements.settingsVibration ? elements.settingsVibration.checked : true;
    
    state.settings = {
        valor_litro_bencina: price,
        rendimiento_promedio: efficiency,
        sound_enabled: soundEnabled,
        vibration_enabled: vibrationEnabled
    };
    
    saveState();
    updateUI();
    showToast('Configuraciones guardadas correctamente.', 'success');
    
    // Audiovisual feedback
    playAudio('income');
    vibrate([40, 40, 40]);
}

// Get all unique active dates sorted chronologically
function getSortedActivityDates() {
    const dates = new Set();
    state.transactions.forEach(t => dates.add(t.fecha));
    Object.keys(state.mileage).forEach(d => dates.add(d));
    return Array.from(dates).sort();
}

// Chronological sweep calculation for fuel inventory and carryover surplus
function updateFuelCalculations() {
    const sortedDates = getSortedActivityDates();
    let carryover = 0;
    state.calculatedFuel = {}; // reset runtime cache
    
    const valorLitro = state.settings.valor_litro_bencina;
    const rendimiento = state.settings.rendimiento_promedio;
    
    sortedDates.forEach(dateStr => {
        // 1. Get actual fuel purchased (transactions)
        const dayTxs = state.transactions.filter(t => t.fecha === dateStr);
        const purchased = dayTxs
            .filter(t => t.tipo === 'gasto' && t.categoria === 'Bencina')
            .reduce((sum, t) => sum + t.monto, 0);
            
        // 2. Get mileage log
        const dayMileage = state.mileage[dateStr];
        let distance = 0;
        if (dayMileage && dayMileage.km_final > dayMileage.km_inicial) {
            distance = dayMileage.km_final - dayMileage.km_inicial;
        }
        
        // 3. Calculated consumption
        const consumed = rendimiento > 0 ? (distance / rendimiento) * valorLitro : 0;
        
        // 4. Available fuel
        const available = purchased + carryover;
        
        // 5. Surplus to carry over
        const surplusNext = Math.max(0, available - consumed);
        
        // Save to runtime cache
        state.calculatedFuel[dateStr] = {
            purchased,
            distance,
            consumed: Math.round(consumed),
            surplusPrevious: Math.round(carryover),
            surplusNext: Math.round(surplusNext)
        };
        
        // Carry over to next day
        carryover = surplusNext;
    });
}

// Save or Update Daily Mileage
function saveMileageLog() {
    const selectedKmDate = (elements.kmDateInput && elements.kmDateInput.value) || getTodayString();
    const kmInitial = parseInt(elements.kmInitialInput.value, 10) || 0;
    const kmFinal = parseInt(elements.kmFinalInput.value, 10) || 0;
    
    if (kmFinal > 0 && kmFinal < kmInitial) {
        showToast('El kilometraje final no puede ser menor al inicial.', 'danger');
        playAudio('error');
        vibrate(120);
        return;
    }
    
    state.mileage[selectedKmDate] = {
        fecha: selectedKmDate,
        km_inicial: kmInitial,
        km_final: kmFinal
    };
    
    saveState();
    updateUI();
    showToast('Kilometraje guardado correctamente.', 'success');
    
    // Audiovisual feedback
    playAudio('income');
    vibrate(60);
}

// Helper to get carryover fuel surplus from the latest active date before the target date
function getCarryoverForDate(dateStr) {
    const sortedDates = getSortedActivityDates().filter(d => d < dateStr);
    if (sortedDates.length === 0) return 0;
    const lastActiveDate = sortedDates[sortedDates.length - 1];
    const fuelCalc = state.calculatedFuel[lastActiveDate];
    return fuelCalc ? fuelCalc.surplusNext : 0;
}

// Calculate mileage and performance dynamically (before saving)
function calculateActiveMileagePerformance() {
    const selectedKmDate = (elements.kmDateInput && elements.kmDateInput.value) || getTodayString();
    const kmInitial = parseInt(elements.kmInitialInput.value, 10) || 0;
    const kmFinal = parseInt(elements.kmFinalInput.value, 10) || 0;
    
    const distance = kmFinal > kmInitial ? (kmFinal - kmInitial) : 0;
    elements.summaryDistance.innerText = `${distance} km`;
    
    // Get carryover from previous active days
    const carryover = getCarryoverForDate(selectedKmDate);
    elements.summaryFuelCarryover.innerText = formatCurrency(carryover);
    
    // Get actual fuel purchased (transactions of that day)
    const dayTxs = state.transactions.filter(t => t.fecha === selectedKmDate);
    const purchased = dayTxs
        .filter(t => t.tipo === 'gasto' && t.categoria === 'Bencina')
        .reduce((sum, t) => sum + t.monto, 0);
    elements.summaryFuelPurchased.innerText = formatCurrency(purchased);
    
    // Read price and efficiency directly from UI inputs for real-time responsiveness, falling back to state settings
    const price = (elements.fuelPriceLiterInput && parseInt(elements.fuelPriceLiterInput.value, 10)) || state.settings.valor_litro_bencina || 1300;
    const efficiency = (elements.fuelEfficiencyInput && parseFloat(elements.fuelEfficiencyInput.value)) || state.settings.rendimiento_promedio || 12;
    
    // Calculate consumption
    const consumed = efficiency > 0 ? (distance / efficiency) * price : 0;
    elements.summaryFuelCost.innerText = formatCurrency(Math.round(consumed));
    
    // Calculate projected surplus for tomorrow
    const surplusNext = Math.max(0, carryover + purchased - consumed);
    elements.summaryFuelSurplus.innerText = formatCurrency(Math.round(surplusNext));
    
    // Calculate Cost per Km
    if (distance > 0 && efficiency > 0) {
        const costPerKm = Math.round(price / efficiency);
        elements.summaryCostPerKm.innerText = `${formatCurrency(costPerKm)}/km`;
    } else {
        elements.summaryCostPerKm.innerText = '$0/km';
    }
}

// Check if a date string falls in the current week (Monday-Sunday local time)
function isDateInCurrentWeek(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    
    // Get Monday of current week
    const todayDay = today.getDay();
    const diffToMonday = todayDay === 0 ? -6 : 1 - todayDay;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return d >= monday && d <= sunday;
}

// Check if a date string falls in the current month (local time)
function isDateInCurrentMonth(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

// Update Weekly and Monthly summary widgets on Dashboard
function updatePeriodSummaries() {
    let weekInc = 0;
    let weekExp = 0;
    let weekDist = 0;
    let weekFuel = 0;
    
    let monthInc = 0;
    let monthExp = 0;
    let monthDist = 0;
    let monthFuel = 0;
    
    // 1. Transactions
    state.transactions.forEach(t => {
        if (isDateInCurrentWeek(t.fecha)) {
            if (t.tipo === 'ingreso') weekInc += t.monto;
            else {
                weekExp += t.monto;
                if (t.categoria === 'Bencina') weekFuel += t.monto;
            }
        }
        if (isDateInCurrentMonth(t.fecha)) {
            if (t.tipo === 'ingreso') monthInc += t.monto;
            else {
                monthExp += t.monto;
                if (t.categoria === 'Bencina') monthFuel += t.monto;
            }
        }
    });
    
    // 2. Mileage logs
    Object.keys(state.mileage).forEach(date => {
        const log = state.mileage[date];
        const dist = log.km_final > log.km_inicial ? (log.km_final - log.km_inicial) : 0;
        
        if (isDateInCurrentWeek(date)) {
            weekDist += dist;
        }
        if (isDateInCurrentMonth(date)) {
            monthDist += dist;
        }
    });
    
    // Update elements
    if (elements.weekIncome) elements.weekIncome.innerText = formatCurrency(weekInc);
    if (elements.weekExpense) elements.weekExpense.innerText = formatCurrency(weekExp);
    const weekBal = weekInc - weekExp;
    if (elements.weekBalance) {
        elements.weekBalance.innerText = formatCurrency(weekBal);
        elements.weekBalance.className = `item-value ${weekBal >= 0 ? 'text-success' : 'text-danger'}`;
    }
    if (elements.weekDistance) elements.weekDistance.innerText = `${weekDist.toLocaleString('es-CL')} km`;
    if (elements.weekFuelCost) elements.weekFuelCost.innerText = formatCurrency(weekFuel);
    
    if (elements.monthIncome) elements.monthIncome.innerText = formatCurrency(monthInc);
    if (elements.monthExpense) elements.monthExpense.innerText = formatCurrency(monthExp);
    const monthBal = monthInc - monthExp;
    if (elements.monthBalance) {
        elements.monthBalance.innerText = formatCurrency(monthBal);
        elements.monthBalance.className = `item-value ${monthBal >= 0 ? 'text-success' : 'text-danger'}`;
    }
    if (elements.monthDistance) elements.monthDistance.innerText = `${monthDist.toLocaleString('es-CL')} km`;
    if (elements.monthFuelCost) elements.monthFuelCost.innerText = formatCurrency(monthFuel);
}

// Recalculate all numbers and redraw UI elements
function updateUI() {
    // 1. Recalcular balances de combustible cronológicamente
    updateFuelCalculations();
    
    // 2. Actualizar el panel de resumen semanal y mensual
    updatePeriodSummaries();
    
    // 3. Cargar configuraciones de bencina en los inputs del formulario
    if (elements.fuelPriceLiterInput && elements.fuelEfficiencyInput) {
        elements.fuelPriceLiterInput.value = state.settings.valor_litro_bencina;
        elements.fuelEfficiencyInput.value = state.settings.rendimiento_promedio;
    }
    
    const selectedKmDate = (elements.kmDateInput && elements.kmDateInput.value) || getTodayString();
    if (elements.kmDateInput && !elements.kmDateInput.value) {
        elements.kmDateInput.value = selectedKmDate;
    }
    
    // Update title text dynamically
    const isToday = (selectedKmDate === getTodayString());
    const cardTitle = document.getElementById('mileage-card-title');
    if (cardTitle) {
        cardTitle.innerText = isToday ? 'Control de Kilometraje de Hoy' : `Control de Kilometraje: ${formatDateString(selectedKmDate)}`;
    }
    
    // Load selected date's mileage log into form
    const currentMileage = state.mileage[selectedKmDate];
    if (currentMileage) {
        elements.kmInitialInput.value = currentMileage.km_inicial || '';
        elements.kmFinalInput.value = currentMileage.km_final || '';
    } else {
        elements.kmInitialInput.value = '';
        elements.kmFinalInput.value = '';
        // Auto fill starting mileage with the closing mileage of the latest recorded activity date prior to the selected date.
        const dates = Object.keys(state.mileage).filter(d => d < selectedKmDate).sort();
        if (dates.length > 0) {
            const lastDate = dates[dates.length - 1];
            const lastLog = state.mileage[lastDate];
            if (lastLog && lastLog.km_final > 0) {
                elements.kmInitialInput.value = lastLog.km_final;
            }
        }
    }
    
    // Compute stats
    const todayStr = getTodayString();
    const todayTxs = state.transactions.filter(t => t.fecha === todayStr);
    
    // Income KPI
    const todayIncomeTxs = todayTxs.filter(t => t.tipo === 'ingreso');
    const todayIncome = todayIncomeTxs.reduce((sum, t) => sum + t.monto, 0);
    elements.kpiIncome.innerText = formatCurrency(todayIncome);
    elements.kpiIncomeCount.innerText = `${todayIncomeTxs.length} viajes registrados`;
    
    // Expense KPI
    const todayExpenseTxs = todayTxs.filter(t => t.tipo === 'gasto');
    const todayExpense = todayExpenseTxs.reduce((sum, t) => sum + t.monto, 0);
    elements.kpiExpense.innerText = formatCurrency(todayExpense);
    elements.kpiExpenseCount.innerText = `${todayExpenseTxs.length} gastos registrados`;
    
    // Balance KPI
    const todayBalance = todayIncome - todayExpense;
    elements.kpiBalance.innerText = formatCurrency(todayBalance);
    if (todayBalance >= 0) {
        elements.kpiBalanceStatus.innerText = 'Balance en positivo';
        elements.kpiBalanceStatus.style.color = 'var(--success)';
    } else {
        elements.kpiBalanceStatus.innerText = 'Balance en negativo';
        elements.kpiBalanceStatus.style.color = 'var(--danger)';
    }
    
    // Fuel Performance KPI for today
    const fuelCalcToday = state.calculatedFuel[todayStr] || {
        purchased: 0,
        consumed: 0,
        surplusPrevious: 0,
        surplusNext: 0
    };
    
    const kpiFuelTitle = document.querySelector('.kpi-card.fuel-perf h3');
    if (kpiFuelTitle) kpiFuelTitle.innerText = 'Saldo Combustible';
    
    elements.kpiFuelPerf.innerText = formatCurrency(fuelCalcToday.surplusNext);
    elements.kpiFuelSubtext.innerText = `Consumo: ${formatCurrency(fuelCalcToday.consumed)} | Heredado: ${formatCurrency(fuelCalcToday.surplusPrevious)}`;
    
    // Refresh calculations inside mileage card box
    calculateActiveMileagePerformance();
    
    // Render tables and lists
    renderRecentTransactions();
    renderFullTransactionsTable();
    renderMileageTable();
    renderGlobalStatsTable();
    
    // Redraw charts
    updateCharts();
    
    // Refresh Calendar if active
    const calendarTab = document.querySelector('[data-tab="calendar"]');
    if (calendarTab && calendarTab.classList.contains('active')) {
        renderCalendar();
        if (calendarSelectedDateStr) selectCalendarDay(calendarSelectedDateStr);
    }
}

// Render the 5 most recent transactions of today on the dashboard
function renderRecentTransactions() {
    const todayStr = getTodayString();
    const todayTxs = state.transactions.filter(t => t.fecha === todayStr);
    
    if (todayTxs.length === 0) {
        elements.recentList.innerHTML = `
            <div class="empty-state">
                <i data-lucide="receipt"></i>
                <p>No hay transacciones registradas hoy</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    elements.recentList.innerHTML = '';
    // Show top 5
    todayTxs.slice(0, 5).forEach(tx => {
        const card = document.createElement('div');
        card.className = `tx-item ${tx.tipo}`;
        
        let icon = tx.tipo === 'ingreso' ? 'arrow-up-right' : 'arrow-down-left';
        if (tx.categoria === 'Bencina') icon = 'fuel';
        if (tx.categoria === 'Comida') icon = 'utensils';
        if (tx.categoria === 'Mantenimiento') icon = 'wrench';
        
        card.innerHTML = `
            <div class="tx-icon-group">
                <div class="tx-item-icon">
                    <i data-lucide="${icon}"></i>
                </div>
                <div class="tx-info-details">
                    <h4>${tx.categoria}</h4>
                    <p>${tx.hora} - ${tx.descripcion}</p>
                </div>
            </div>
            <div class="tx-amount-group">
                <span class="tx-amount">${tx.tipo === 'ingreso' ? '+' : '-'}${formatCurrency(tx.monto)}</span>
                <div class="tx-actions-row" style="display: flex; gap: 0.5rem; margin-top: 0.2rem; align-items: center;">
                    <button class="tx-edit-btn" data-id="${tx.id}" title="Editar registro">
                        <i data-lucide="edit-3"></i>
                    </button>
                    <button class="tx-delete-btn" data-id="${tx.id}" title="Eliminar registro" style="margin-top: 0;">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
        
        elements.recentList.appendChild(card);
    });
    
    // Add delete & edit listeners
    elements.recentList.querySelectorAll('.tx-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            deleteTransaction(id);
        });
    });
    elements.recentList.querySelectorAll('.tx-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            openEditTransactionModal(id);
        });
    });
    
    lucide.createIcons();
}

// Delete transaction helper
function deleteTransaction(id) {
    if (confirm('¿Estás seguro de que deseas eliminar esta transacción?')) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        saveState();
        updateUI();
        showToast('Transacción eliminada con éxito', 'warning');
        playAudio('error');
        vibrate([100, 50, 100]);
    }
}

// Render full history transactions table
function renderFullTransactionsTable() {
    const typeVal = elements.filterType.value;
    const catVal = elements.filterCategory.value;
    
    let filtered = [...state.transactions];
    
    if (typeVal !== 'all') {
        filtered = filtered.filter(t => t.tipo === typeVal);
    }
    if (catVal !== 'all') {
        filtered = filtered.filter(t => t.categoria === catVal);
    }
    
    if (filtered.length === 0) {
        elements.fullTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                    No se encontraron transacciones en base a los filtros.
                </td>
            </tr>
        `;
        return;
    }
    
    elements.fullTableBody.innerHTML = '';
    filtered.forEach(tx => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDateString(tx.fecha)} ${tx.hora || ''}</td>
            <td><span class="badge ${tx.tipo}">${tx.tipo}</span></td>
            <td><strong>${tx.categoria}</strong></td>
            <td><span class="text-muted">${tx.descripcion}</span></td>
            <td class="${tx.tipo === 'ingreso' ? 'text-success' : 'text-danger'}" style="font-weight: 700;">
                ${tx.tipo === 'ingreso' ? '+' : '-'}${formatCurrency(tx.monto)}
            </td>
            <td>
                <button class="tx-edit-btn" data-id="${tx.id}" title="Editar registro" style="margin-right: 0.5rem;">
                    <i data-lucide="edit-3"></i>
                </button>
                <button class="tx-delete-btn" data-id="${tx.id}" title="Eliminar registro">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
        elements.fullTableBody.appendChild(row);
    });
    
    elements.fullTableBody.querySelectorAll('.tx-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            deleteTransaction(id);
        });
    });
    
    elements.fullTableBody.querySelectorAll('.tx-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            openEditTransactionModal(id);
        });
    });
    
    lucide.createIcons();
}

// Edit mileage for date programmatically
function editMileageForDate(dateStr) {
    const dashTab = document.querySelector('[data-tab="dashboard"]');
    if (dashTab) dashTab.click();
    
    if (elements.kmDateInput) {
        elements.kmDateInput.value = dateStr;
        elements.kmDateInput.dispatchEvent(new Event('change'));
    }
    
    if (elements.mileageForm) {
        elements.mileageForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Delete mileage log
function deleteMileageLog(dateStr) {
    if (confirm(`¿Estás seguro de que deseas eliminar el registro de kilometraje del día ${formatDateString(dateStr)}?`)) {
        if (state.mileage[dateStr]) {
            delete state.mileage[dateStr];
            saveState();
            updateUI();
            showToast('Registro de kilometraje eliminado.', 'warning');
            playAudio('error');
            vibrate([100, 50, 100]);
        }
    }
}

// Render mileage history table
function renderMileageTable() {
    elements.mileageTableBody.innerHTML = '';
    
    // Sort dates descending
    const dates = Object.keys(state.mileage).sort().reverse();
    
    if (dates.length === 0) {
        elements.mileageTableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                    No hay registros de kilometraje guardados.
                </td>
            </tr>
        `;
        return;
    }
    
    dates.forEach(dateStr => {
        const log = state.mileage[dateStr];
        const kmIn = log.km_inicial || 0;
        const kmFin = log.km_final || 0;
        const dist = kmFin > kmIn ? (kmFin - kmIn) : 0;
        
        // Get calculations from chronological fuel sweep
        const fuelCalc = state.calculatedFuel[dateStr] || {
            purchased: 0,
            consumed: 0,
            surplusPrevious: 0,
            surplusNext: 0
        };
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${formatDateString(dateStr)}</strong></td>
            <td>${kmIn.toLocaleString('es-CL')} km</td>
            <td>${kmFin > 0 ? kmFin.toLocaleString('es-CL') + ' km' : '<span class="text-muted">No cerrado</span>'}</td>
            <td><span class="badge ${dist > 0 ? 'income' : 'expense'}">${dist} km</span></td>
            <td>${formatCurrency(fuelCalc.purchased)}</td>
            <td style="color: var(--warning); font-weight: 500;">${formatCurrency(fuelCalc.consumed)}</td>
            <td style="color: var(--primary);">${formatCurrency(fuelCalc.surplusPrevious)}</td>
            <td style="color: var(--success); font-weight: 600;">${formatCurrency(fuelCalc.surplusNext)}</td>
            <td>
                <button class="mileage-edit-btn" data-date="${dateStr}" title="Editar kilometraje" style="margin-right: 0.5rem;">
                    <i data-lucide="edit-3"></i>
                </button>
                <button class="tx-delete-btn mileage-delete-btn" data-date="${dateStr}" title="Eliminar kilometraje" style="margin-top: 0;">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
        
        elements.mileageTableBody.appendChild(row);
    });
    
    elements.mileageTableBody.querySelectorAll('.mileage-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const dateStr = btn.getAttribute('data-date');
            editMileageForDate(dateStr);
        });
    });
    
    elements.mileageTableBody.querySelectorAll('.mileage-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const dateStr = btn.getAttribute('data-date');
            deleteMileageLog(dateStr);
        });
    });
    
    lucide.createIcons();
}

// Calculate global metrics and render stats page details
function renderGlobalStatsTable() {
    let filteredTxs = [...state.transactions];
    let filteredMileageDates = Object.keys(state.mileage);
    
    // Update Stats Title based on period
    if (elements.statsGlobalTitle) {
        if (statsActivePeriod === 'semana') {
            elements.statsGlobalTitle.innerText = 'Estadísticas Financieras: Esta Semana';
        } else if (statsActivePeriod === 'mes') {
            elements.statsGlobalTitle.innerText = 'Estadísticas Financieras: Este Mes';
        } else {
            elements.statsGlobalTitle.innerText = 'Estadísticas Financieras Históricas';
        }
    }
    
    // Apply filters
    if (statsActivePeriod === 'semana') {
        filteredTxs = state.transactions.filter(t => isDateInCurrentWeek(t.fecha));
        filteredMileageDates = Object.keys(state.mileage).filter(d => isDateInCurrentWeek(d));
    } else if (statsActivePeriod === 'mes') {
        filteredTxs = state.transactions.filter(t => isDateInCurrentMonth(t.fecha));
        filteredMileageDates = Object.keys(state.mileage).filter(d => isDateInCurrentMonth(d));
    }
    
    let totalIncome = 0;
    let totalExpense = 0;
    
    filteredTxs.forEach(t => {
        if (t.tipo === 'ingreso') totalIncome += t.monto;
        else totalExpense += t.monto;
    });
    
    elements.statTotalIncome.innerText = formatCurrency(totalIncome);
    elements.statTotalExpense.innerText = formatCurrency(totalExpense);
    
    const balance = totalIncome - totalExpense;
    elements.statTotalBalance.innerText = formatCurrency(balance);
    elements.statTotalBalance.className = `stat-number ${balance >= 0 ? 'text-success' : 'text-danger'}`;
    
    // Calculate total kilometers
    let totalKm = 0;
    let daysWithPerf = 0;
    let totalPerfSum = 0;
    
    filteredMileageDates.forEach(date => {
        const log = state.mileage[date];
        const dist = log.km_final > log.km_inicial ? (log.km_final - log.km_inicial) : 0;
        totalKm += dist;
        
        // Compute day performance
        const fuel = state.transactions
            .filter(t => t.fecha === date && t.tipo === 'gasto' && t.categoria === 'Bencina')
            .reduce((sum, t) => sum + t.monto, 0);
            
        if (dist > 0 && fuel > 0) {
            totalPerfSum += (fuel / dist);
            daysWithPerf++;
        }
    });
    
    elements.statTotalKm.innerText = `${totalKm.toLocaleString('es-CL')} km`;
    
    const avgPerf = daysWithPerf > 0 ? Math.round(totalPerfSum / daysWithPerf) : 0;
    elements.statAvgPerf.innerText = `${formatCurrency(avgPerf)}/km`;
}

// Chart.js updates
function updateCharts() {
    const isLight = document.body.classList.contains('light-theme');
    const tickColor = isLight ? '#475569' : '#94a3b8';
    const gridColor = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.05)';
    const legendColor = isLight ? '#0f172a' : '#f8fafc';

    // ==========================================
    // 1. Dashboard Finance Chart (Income vs Expenses)
    // ==========================================
    const ctxFinance = document.getElementById('weeklyFinanceChart');
    if (ctxFinance) {
        // Generate dates list based on selected dashboard chart period
        const dates = [];
        const daysToInclude = dashboardChartPeriod === 'week' ? 7 : 30;
        
        for (let i = daysToInclude - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
        }
        
        const dailyIncome = [];
        const dailyExpense = [];
        const labels = dates.map(d => {
            if (daysToInclude === 7) {
                return formatDateString(d);
            } else {
                // Return shorter label for 30-day view: "10 Jun"
                const dateObj = new Date(d + 'T00:00:00');
                return `${dateObj.getDate()} ${MONTH_NAMES[dateObj.getMonth()].substring(0, 3)}`;
            }
        });
        
        dates.forEach(date => {
            const dayTxs = state.transactions.filter(t => t.fecha === date);
            const inc = dayTxs.filter(t => t.tipo === 'ingreso').reduce((sum, t) => sum + t.monto, 0);
            const exp = dayTxs.filter(t => t.tipo === 'gasto').reduce((sum, t) => sum + t.monto, 0);
            dailyIncome.push(inc);
            dailyExpense.push(exp);
        });
        
        if (weeklyFinanceChart) weeklyFinanceChart.destroy();
        
        weeklyFinanceChart = new Chart(ctxFinance, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Ingresos',
                        data: dailyIncome,
                        backgroundColor: '#10b981',
                        borderRadius: 6,
                        borderWidth: 0
                    },
                    {
                        label: 'Gastos',
                        data: dailyExpense,
                        backgroundColor: '#f43f5e',
                        borderRadius: 6,
                        borderWidth: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        grid: { color: gridColor },
                        ticks: { color: tickColor, font: { family: 'Plus Jakarta Sans' } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: tickColor, font: { family: 'Plus Jakarta Sans' } }
                    }
                }
            }
        });
    }
    
    // ==========================================
    // 2. Expense Category Distribution Chart (Doughnut)
    // ==========================================
    const ctxCategory = document.getElementById('expenseCategoryChart');
    if (ctxCategory) {
        // Sum expenses by category, filtered by statsActivePeriod
        const expenseCategorySums = {
            'Bencina': 0,
            'Mantenimiento': 0,
            'Comida': 0,
            'Otros': 0
        };
        
        let filteredTxs = state.transactions.filter(t => t.tipo === 'gasto');
        if (statsActivePeriod === 'semana') {
            filteredTxs = filteredTxs.filter(t => isDateInCurrentWeek(t.fecha));
        } else if (statsActivePeriod === 'mes') {
            filteredTxs = filteredTxs.filter(t => isDateInCurrentMonth(t.fecha));
        }
        
        filteredTxs.forEach(t => {
            if (expenseCategorySums.hasOwnProperty(t.categoria)) {
                expenseCategorySums[t.categoria] += t.monto;
            } else {
                expenseCategorySums['Otros'] += t.monto;
            }
        });
            
        const categoriesList = Object.keys(expenseCategorySums);
        const categoriesValues = Object.values(expenseCategorySums);
        const hasExpenses = categoriesValues.some(val => val > 0);
        
        if (expenseCategoryChart) expenseCategoryChart.destroy();
        
        expenseCategoryChart = new Chart(ctxCategory, {
            type: 'doughnut',
            data: {
                labels: categoriesList,
                datasets: [{
                    data: hasExpenses ? categoriesValues : [1],
                    backgroundColor: hasExpenses ? ['#f59e0b', '#6366f1', '#0ea5e9', '#64748b'] : [isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.05)'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: legendColor,
                            font: { family: 'Plus Jakarta Sans', size: 11 },
                            padding: 15
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }
    
    // ==========================================
    // 3. Fuel Performance Line Chart ($/km)
    // ==========================================
    const ctxPerformance = document.getElementById('fuelPerformanceChart');
    if (ctxPerformance) {
        let datesForPerf = [];
        if (statsActivePeriod === 'semana') {
            const today = new Date();
            const todayDay = today.getDay();
            const diffToMonday = todayDay === 0 ? -6 : 1 - todayDay;
            const monday = new Date(today);
            monday.setDate(today.getDate() + diffToMonday);
            
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                datesForPerf.push(d.toISOString().split('T')[0]);
            }
        } else if (statsActivePeriod === 'mes') {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                datesForPerf.push(dateStr);
            }
        } else {
            datesForPerf = getSortedActivityDates();
        }
        
        const perfData = [];
        const perfLabels = [];
        
        datesForPerf.forEach(date => {
            const log = state.mileage[date];
            const dist = log && log.km_final > log.km_inicial ? (log.km_final - log.km_inicial) : 0;
            
            // Calculate actual fuel spent on that date from transactions
            const dayTxs = state.transactions.filter(t => t.fecha === date);
            const fuel = dayTxs.filter(t => t.tipo === 'gasto' && t.categoria === 'Bencina').reduce((sum, t) => sum + t.monto, 0);
            
            if (dist > 0 && fuel > 0) {
                const perf = Math.round(fuel / dist);
                perfData.push(perf);
                
                const dateObj = new Date(date + 'T00:00:00');
                const label = statsActivePeriod === 'semana' 
                    ? formatDateString(date).substring(0, 3)
                    : `${dateObj.getDate()} ${MONTH_NAMES[dateObj.getMonth()].substring(0, 3)}`;
                perfLabels.push(label);
            }
        });
        
        if (fuelPerformanceChart) fuelPerformanceChart.destroy();
        
        fuelPerformanceChart = new Chart(ctxPerformance, {
            type: 'line',
            data: {
                labels: perfLabels.length > 0 ? perfLabels : (statsActivePeriod === 'semana' ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] : ['Sin registros']),
                datasets: [{
                    label: 'Costo por Km ($/km)',
                    data: perfData.length > 0 ? perfData : [0],
                    borderColor: '#f59e0b',
                    backgroundColor: isLight ? 'rgba(245, 158, 11, 0.06)' : 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#f59e0b',
                    pointRadius: perfData.length > 0 ? 4 : 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        grid: { color: gridColor },
                        ticks: { color: tickColor, font: { family: 'Plus Jakarta Sans' } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: tickColor, font: { family: 'Plus Jakarta Sans' } }
                    }
                }
            }
        });
    }
}

// Spanish month names helper (Moved to top)

// Dynamically render calendar grid cells
// Dynamically render calendar grid cells
function renderCalendar() {
    elements.calendarMonthYear.innerText = `${MONTH_NAMES[calendarCurrentMonth]} ${calendarCurrentYear}`;
    elements.calendarDaysGrid.innerHTML = '';
    
    // First day of the month
    const firstDay = new Date(calendarCurrentYear, calendarCurrentMonth, 1);
    // Number of days in the month
    const numDays = new Date(calendarCurrentYear, calendarCurrentMonth + 1, 0).getDate();
    
    // Day of the week of the first day adjusted for Monday start (0 = Monday, ..., 6 = Sunday)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) {
        startDayOfWeek = 6;
    }
    
    // Fill previous month empty spaces
    const prevMonthNumDays = new Date(calendarCurrentYear, calendarCurrentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell different-month';
        const dayNum = prevMonthNumDays - i;
        cell.innerHTML = `
            <div class="cell-header">
                <span class="cell-num">${dayNum}</span>
            </div>
        `;
        elements.calendarDaysGrid.appendChild(cell);
    }
    
    // Fill current month cells
    const todayStr = getTodayString();
    for (let day = 1; day <= numDays; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        
        const monthStr = String(calendarCurrentMonth + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateKey = `${calendarCurrentYear}-${monthStr}-${dayStr}`;
        
        // Mark today
        if (dateKey === todayStr) {
            cell.classList.add('today');
        }
        
        // Mark selected
        if (dateKey === calendarSelectedDateStr) {
            cell.classList.add('selected');
        }
        
        // Compute daily summary
        const dayTxs = state.transactions.filter(t => t.fecha === dateKey);
        const dayIncome = dayTxs.filter(t => t.tipo === 'ingreso').reduce((sum, t) => sum + t.monto, 0);
        const dayExpense = dayTxs.filter(t => t.tipo === 'gasto').reduce((sum, t) => sum + t.monto, 0);
        
        const dayMileage = state.mileage[dateKey];
        const kmIn = dayMileage ? (dayMileage.km_inicial || 0) : 0;
        const kmFin = dayMileage ? (dayMileage.km_final || 0) : 0;
        const distance = kmFin > kmIn ? (kmFin - kmIn) : 0;
        
        const fuelCost = dayTxs.filter(t => t.tipo === 'gasto' && t.categoria === 'Bencina').reduce((sum, t) => sum + t.monto, 0);
        const hasMileage = kmIn > 0 || kmFin > 0;
        
        // HTML contents
        let cellHTML = `
            <div class="cell-header">
                <span class="cell-num">${day}</span>
            </div>
            <div class="cell-details">
        `;
        
        // Show financial balance and performance in cell
        if (dayIncome > 0) {
            cellHTML += `<span class="cell-metric income">+${formatNumberWithDots(dayIncome)}</span>`;
        }
        if (dayExpense > 0) {
            cellHTML += `<span class="cell-metric expense">-${formatNumberWithDots(dayExpense)}</span>`;
        }
        if (dayIncome > 0 || dayExpense > 0) {
            const netBalance = dayIncome - dayExpense;
            const sign = netBalance >= 0 ? '+' : '-';
            cellHTML += `<span class="cell-metric difference">${sign}${formatNumberWithDots(Math.abs(netBalance))}</span>`;
        }
        if (distance > 0 && fuelCost > 0) {
            const perf = Math.round(fuelCost / distance);
            cellHTML += `<span class="cell-metric performance">$${formatNumberWithDots(perf)}/k</span>`;
        }
        
        cellHTML += `</div>`;
        
        // Dot indicators (used for mobile view fallback)
        let dotsHTML = '<div class="cell-indicator-dots">';
        if (dayIncome > 0) dotsHTML += '<span class="dot-indicator income"></span>';
        if (dayExpense > 0) dotsHTML += '<span class="dot-indicator expense"></span>';
        if (hasMileage) dotsHTML += '<span class="dot-indicator mileage"></span>';
        dotsHTML += '</div>';
        
        cellHTML += dotsHTML;
        cell.innerHTML = cellHTML;
        
        // Event listener
        cell.addEventListener('click', () => {
            // Remove previous selected class
            document.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            
            calendarSelectedDateStr = dateKey;
            selectCalendarDay(dateKey);
        });
        
        elements.calendarDaysGrid.appendChild(cell);
    }
}

// Format short currencies like 2500 -> 2.5K
function formatShortNumber(amount) {
    if (amount >= 1000) {
        return (amount / 1000).toFixed(1).replace('.0', '') + 'K';
    }
    return amount;
}

// Render selected day's detail summary in panel
function selectCalendarDay(dateStr) {
    const [year, month, day] = dateStr.split('-');
    
    // Set badge
    elements.selectedDayBadge.innerText = `${day}/${month}/${year}`;
    
    // Get financial stats for day
    const dayTxs = state.transactions.filter(t => t.fecha === dateStr);
    const dayIncome = dayTxs.filter(t => t.tipo === 'ingreso').reduce((sum, t) => sum + t.monto, 0);
    const dayExpense = dayTxs.filter(t => t.tipo === 'gasto').reduce((sum, t) => sum + t.monto, 0);
    const netBalance = dayIncome - dayExpense;
    
    const dayMileage = state.mileage[dateStr];
    const kmIn = dayMileage ? (dayMileage.km_inicial || 0) : 0;
    const kmFin = dayMileage ? (dayMileage.km_final || 0) : 0;
    const distance = kmFin > kmIn ? (kmFin - kmIn) : 0;
    
    const fuelCost = dayTxs.filter(t => t.tipo === 'gasto' && t.categoria === 'Bencina').reduce((sum, t) => sum + t.monto, 0);
    let perfStr = '$0/km';
    if (distance > 0 && fuelCost > 0) {
        perfStr = `${formatCurrency(Math.round(fuelCost / distance))}/km`;
    }
    
    if (dayTxs.length === 0 && kmIn === 0 && kmFin === 0) {
        elements.selectedDayBody.innerHTML = `
            <div class="empty-state">
                <i data-lucide="calendar-x"></i>
                <p>Sin actividad registrada para este día</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    let htmlContent = `
        <div class="details-metrics">
            <div class="stat-box">
                <span class="stat-label">Ingresos</span>
                <span class="stat-number text-success">${formatCurrency(dayIncome)}</span>
            </div>
            <div class="stat-box">
                <span class="stat-label">Gastos</span>
                <span class="stat-number text-danger">${formatCurrency(dayExpense)}</span>
            </div>
            <div class="stat-box ${distance > 0 ? '' : 'metric-row-full'}">
                <span class="stat-label">Balance Neto</span>
                <span class="stat-number ${netBalance >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(netBalance)}</span>
            </div>
    `;
    
    const fuelCalc = state.calculatedFuel[dateStr] || {
        purchased: 0,
        consumed: 0,
        surplusPrevious: 0,
        surplusNext: 0
    };
    
    if (distance > 0) {
        htmlContent += `
            <div class="stat-box">
                <span class="stat-label">Km Recorridos</span>
                <span class="stat-number text-primary">${distance} km</span>
            </div>
            <div class="stat-box">
                <span class="stat-label">Costo por Km</span>
                <span class="stat-number text-warning">${state.settings.rendimiento_promedio > 0 ? formatCurrency(Math.round(state.settings.valor_litro_bencina / state.settings.rendimiento_promedio)) : '$0'}/km</span>
            </div>
        `;
    } else if (kmIn > 0) {
        htmlContent += `
            <div class="stat-box metric-row-full" style="background: rgba(245, 158, 11, 0.05); border-color: rgba(245, 158, 11, 0.2);">
                <span class="stat-label" style="color: var(--warning);">Kilometraje Incompleto</span>
                <span class="stat-number" style="font-size: 1.1rem; color: var(--text-primary);">Iniciado en ${kmIn.toLocaleString('es-CL')} km. Falta registrar cierre.</span>
            </div>
        `;
    }

    // Agregar sección de balance de combustible si hubo actividad
    if (fuelCalc.purchased > 0 || fuelCalc.surplusPrevious > 0 || distance > 0) {
        htmlContent += `
            <div class="stat-box metric-row-full" style="background: rgba(16, 185, 129, 0.04); border-color: rgba(16, 185, 129, 0.15); display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; padding: 1rem; margin-top: 0.5rem; text-align: left;">
                <h4 style="grid-column: span 2; margin: 0; font-size: 0.85rem; font-weight: 700; color: var(--success); display: flex; align-items: center; gap: 0.35rem;">
                    <i data-lucide="fuel" style="width: 14px; height: 14px; color: var(--success);"></i> BALANCE DE COMBUSTIBLE
                </h4>
                <div>
                    <span class="stat-label" style="font-size: 0.7rem; display: block; margin-bottom: 0.15rem;">Saldo Inicial (Heredado):</span>
                    <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-primary);">${formatCurrency(fuelCalc.surplusPrevious)}</span>
                </div>
                <div>
                    <span class="stat-label" style="font-size: 0.7rem; display: block; margin-bottom: 0.15rem;">Compra del Día (Real):</span>
                    <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-primary);">${formatCurrency(fuelCalc.purchased)}</span>
                </div>
                <div>
                    <span class="stat-label" style="font-size: 0.7rem; display: block; margin-bottom: 0.15rem;">Consumo Estimado (Hoy):</span>
                    <span style="font-size: 0.95rem; font-weight: 500; color: var(--warning);">${formatCurrency(fuelCalc.consumed)}</span>
                </div>
                <div>
                    <span class="stat-label" style="font-size: 0.7rem; display: block; margin-bottom: 0.15rem; color: var(--success); font-weight: 600;">Saldo Proyectado Mañana:</span>
                    <span style="font-size: 0.95rem; font-weight: 700; color: var(--success);">${formatCurrency(fuelCalc.surplusNext)}</span>
                </div>
            </div>
        `;
    }
    
    htmlContent += `</div>`; // Close details-metrics
    
    if (dayTxs.length > 0) {
        htmlContent += `
            <h3 class="details-list-title">Transacciones del Día</h3>
            <div class="details-tx-scroll">
        `;
        
        dayTxs.forEach(tx => {
            let icon = tx.tipo === 'ingreso' ? 'arrow-up-right' : 'arrow-down-left';
            if (tx.categoria === 'Bencina') icon = 'fuel';
            if (tx.categoria === 'Comida') icon = 'utensils';
            if (tx.categoria === 'Mantenimiento') icon = 'wrench';
            
            htmlContent += `
                <div class="tx-item ${tx.tipo}">
                    <div class="tx-icon-group">
                        <div class="tx-item-icon">
                            <i data-lucide="${icon}"></i>
                        </div>
                        <div class="tx-info-details">
                            <h4>${tx.categoria}</h4>
                            <p>${tx.hora} - ${tx.descripcion}</p>
                        </div>
                    </div>
                    <div class="tx-amount-group">
                        <span class="tx-amount">${tx.tipo === 'ingreso' ? '+' : '-'}${formatCurrency(tx.monto)}</span>
                        <div class="tx-actions-row" style="display: flex; gap: 0.5rem; margin-top: 0.2rem; align-items: center;">
                            <button class="tx-edit-btn" data-id="${tx.id}" title="Editar registro">
                                <i data-lucide="edit-3"></i>
                            </button>
                            <button class="tx-delete-btn" data-id="${tx.id}" title="Eliminar registro" style="margin-top: 0;">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        htmlContent += `</div>`;
    }
    
    elements.selectedDayBody.innerHTML = htmlContent;
    
    // Add delete & edit action to list buttons
    elements.selectedDayBody.querySelectorAll('.tx-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            deleteTransaction(id);
        });
    });
    elements.selectedDayBody.querySelectorAll('.tx-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            openEditTransactionModal(id);
        });
    });
    
    lucide.createIcons();
    
    // Auto-scroll to summary details on mobile screens
    if (window.innerWidth <= 991) {
        const summaryCard = document.getElementById('calendar-day-summary-card');
        if (summaryCard) {
            summaryCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}
