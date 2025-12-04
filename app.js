// ============================================
// BUDGET PRO v2 - PREMIUM APP
// Firebase + AI Assistant + Modern UI
// ============================================

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyB1WmFllcL533zhqG4ARD6Wx35YUksLmW4",
    authDomain: "budget-pro-7ea05.firebaseapp.com",
    projectId: "budget-pro-7ea05",
    storageBucket: "budget-pro-7ea05.firebasestorage.app",
    messagingSenderId: "789859338778",
    appId: "1:789859338778:web:a7046602a4d37cc5465fa3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence().catch(err => console.log('Persistence error:', err));

// ============================================
// CONSTANTS
// ============================================
const CATEGORIES = {
    expense: {
        'Locuință': { icon: '🏠', color: '#6366f1', subs: ['Chirie', 'Utilități', 'Întreținere', 'Mobilă'] },
        'Mâncare': { icon: '🍽️', color: '#f59e0b', subs: ['Supermarket', 'Restaurante', 'Livrări', 'Cafea', 'Gustări'] },
        'Transport': { icon: '🚗', color: '#10b981', subs: ['Benzină', 'Transport public', 'Taxi/Uber', 'Parcare', 'Service'] },
        'Abonamente': { icon: '📱', color: '#8b5cf6', subs: ['Netflix', 'Spotify', 'YouTube', 'Apple', 'Telefon', 'Internet', 'Altele'] },
        'Sport': { icon: '💪', color: '#ec4899', subs: ['Sala', 'Suplimente', 'Echipament', 'Cursuri'] },
        'Sănătate': { icon: '🏥', color: '#14b8a6', subs: ['Farmacie', 'Medic', 'Analize', 'Asigurare'] },
        'Divertisment': { icon: '🎬', color: '#f43f5e', subs: ['Cinema', 'Concerte', 'Jocuri', 'Ieșiri', 'Vacanțe'] },
        'Shopping': { icon: '🛍️', color: '#a855f7', subs: ['Haine', 'Încălțăminte', 'Accesorii', 'Electronice'] },
        'Educație': { icon: '📚', color: '#0ea5e9', subs: ['Cursuri', 'Cărți', 'Software'] },
        'Altele': { icon: '📦', color: '#64748b', subs: ['Cadouri', 'Donații', 'Diverse'] }
    },
    income: {
        'Salariu': { icon: '💼', color: '#10b981', subs: ['Salariu net', 'Bonusuri', 'Prime', 'Ore suplimentare'] },
        'Freelance': { icon: '💻', color: '#6366f1', subs: ['Proiecte', 'Consultanță', 'Servicii'] },
        'Investiții': { icon: '📈', color: '#f59e0b', subs: ['Dividende', 'Dobânzi', 'Crypto', 'Acțiuni'] },
        'Alte venituri': { icon: '💰', color: '#8b5cf6', subs: ['Vânzări', 'Rambursări', 'Cadouri', 'Diverse'] }
    }
};

const MONTHS = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 
                'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];

const MONTHS_SHORT = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ============================================
// STATE
// ============================================
const state = {
    transactions: [],
    budgets: [],
    recurring: [],
    goals: [],
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    type: 'expense',
    editId: null,
    theme: localStorage.getItem('theme') || 'dark',
    currency: localStorage.getItem('currency') || 'RON',
    geminiApiKey: localStorage.getItem('geminiApiKey') || '',
    isOnline: navigator.onLine,
    isLoading: true,
    charts: {
        pie: null,
        line: null,
        bar: null
    }
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initEventListeners();
    await loadData();
    hideLoadingScreen();
    initCharts();
    updateGreeting();
    startAutoRefresh();
});

function hideLoadingScreen() {
    setTimeout(() => {
        const loading = document.getElementById('loading-screen');
        if (loading) {
            loading.classList.add('hidden');
            setTimeout(() => loading.remove(), 500);
        }
        state.isLoading = false;
    }, 800);
}

function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcons();
}

function updateThemeIcons() {
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    if (sunIcon && moonIcon) {
        sunIcon.style.display = state.theme === 'dark' ? 'block' : 'none';
        moonIcon.style.display = state.theme === 'light' ? 'block' : 'none';
    }
}

function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Bună seara! 🌙';
    if (hour >= 5 && hour < 12) greeting = 'Bună dimineața! ☀️';
    else if (hour >= 12 && hour < 18) greeting = 'Bună ziua! 👋';
    
    const el = document.getElementById('hero-greeting');
    if (el) el.textContent = greeting;
}

// ============================================
// EVENT LISTENERS
// ============================================
function initEventListeners() {
    // Online/Offline status
    window.addEventListener('online', () => {
        state.isOnline = true;
        updateConnectionStatus();
        toast('Conectat! Se sincronizează...', 'success');
        loadData();
    });
    
    window.addEventListener('offline', () => {
        state.isOnline = false;
        updateConnectionStatus();
        toast('Ești offline. Datele se salvează local.', 'warning');
    });

    // Theme toggle
    document.getElementById('theme-btn')?.addEventListener('click', toggleTheme);
    
    // Sync button
    document.getElementById('sync-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('sync-btn');
        btn.classList.add('spinning');
        await loadData();
        btn.classList.remove('spinning');
        toast('Sincronizat!', 'success');
    });

    // Month navigation
    document.getElementById('prev-month')?.addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month')?.addEventListener('click', () => changeMonth(1));

    // Add transaction button
    document.getElementById('add-btn')?.addEventListener('click', () => openTransactionModal());
    document.getElementById('fab-btn')?.addEventListener('click', () => openTransactionModal());
    
    // Quick actions
    document.querySelectorAll('.quick-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action === 'expense' || action === 'income') {
                state.type = action;
                openTransactionModal();
            } else if (action === 'scan') {
                toast('Scanare bonuri - în curând!', 'info');
            } else if (action === 'transfer') {
                toast('Transfer între conturi - în curând!', 'info');
            }
        });
    });

    // Transaction modal
    document.getElementById('modal-close')?.addEventListener('click', closeTransactionModal);
    document.getElementById('cancel-btn')?.addEventListener('click', closeTransactionModal);
    document.querySelector('#transaction-modal .modal-backdrop')?.addEventListener('click', closeTransactionModal);
    document.getElementById('transaction-form')?.addEventListener('submit', handleTransactionSubmit);

    // Type pills
    document.querySelectorAll('.type-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            state.type = pill.dataset.type;
            document.querySelectorAll('.type-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            updateCategorySelect();
        });
    });

    // Category change
    document.getElementById('category')?.addEventListener('change', updateSubcategorySelect);

    // AI button
    document.getElementById('ai-btn')?.addEventListener('click', openAIModal);
    document.getElementById('ai-modal-close')?.addEventListener('click', closeAIModal);
    document.querySelector('#ai-modal .modal-backdrop')?.addEventListener('click', closeAIModal);

    // Settings
    document.getElementById('settings-btn')?.addEventListener('click', openSettingsModal);
    document.getElementById('settings-close')?.addEventListener('click', closeSettingsModal);
    document.querySelector('#settings-modal .modal-backdrop')?.addEventListener('click', closeSettingsModal);

    // See all transactions
    document.getElementById('see-all-transactions')?.addEventListener('click', openAllTransactionsModal);
    document.getElementById('back-from-transactions')?.addEventListener('click', closeAllTransactionsModal);
    document.querySelector('#all-transactions-modal .modal-backdrop')?.addEventListener('click', closeAllTransactionsModal);

    // Chart tabs
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const chartType = tab.dataset.chart;
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.chart-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${chartType}-panel`)?.classList.add('active');
        });
    });

    // Bottom navigation
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            // Handle view switching (simplified for now)
            if (view === 'transactions') {
                openAllTransactionsModal();
            }
        });
    });

    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            filterTransactions(chip.dataset.filter);
        });
    });

    // Search transactions
    document.getElementById('search-transactions')?.addEventListener('input', (e) => {
        searchTransactions(e.target.value);
    });

    // Add recurring
    document.getElementById('add-recurring-btn')?.addEventListener('click', () => {
        toast('Plăți recurente - în curând!', 'info');
    });

    // Add goal
    document.getElementById('add-goal-btn')?.addEventListener('click', () => {
        toast('Obiective - în curând!', 'info');
    });

    // Refresh insights
    document.getElementById('refresh-insights')?.addEventListener('click', refreshAIInsights);

    // AI quick prompts
    document.querySelectorAll('.quick-prompt').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            document.getElementById('ai-input').value = prompt;
            sendAIMessage(prompt);
        });
    });

    // AI send
    document.getElementById('ai-send')?.addEventListener('click', () => {
        const input = document.getElementById('ai-input');
        if (input.value.trim()) {
            sendAIMessage(input.value.trim());
            input.value = '';
        }
    });

    document.getElementById('ai-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const input = e.target;
            if (input.value.trim()) {
                sendAIMessage(input.value.trim());
                input.value = '';
            }
        }
    });

    // Settings
    document.getElementById('gemini-api-key')?.addEventListener('change', (e) => {
        state.geminiApiKey = e.target.value;
        localStorage.setItem('geminiApiKey', e.target.value);
        toast('API Key salvat!', 'success');
    });

    document.getElementById('theme-select')?.addEventListener('change', (e) => {
        state.theme = e.target.value;
        localStorage.setItem('theme', e.target.value);
        initTheme();
    });

    document.getElementById('export-data')?.addEventListener('click', exportData);
    document.getElementById('clear-data')?.addEventListener('click', clearAllData);
}

function updateConnectionStatus() {
    const status = document.getElementById('connection-status');
    if (status) {
        status.classList.toggle('offline', !state.isOnline);
    }
}

// ============================================
// DATA LOADING
// ============================================
async function loadData() {
    try {
        // Load transactions
        const transSnapshot = await db.collection('transactions')
            .orderBy('date', 'desc')
            .limit(500)
            .get();
        
        state.transactions = transSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Load budgets
        const budgetSnapshot = await db.collection('budgets').get();
        state.budgets = budgetSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Load recurring
        const recurringSnapshot = await db.collection('recurring').get();
        state.recurring = recurringSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Load goals
        const goalsSnapshot = await db.collection('goals').get();
        state.goals = goalsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Save to localStorage as backup
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        localStorage.setItem('budgets', JSON.stringify(state.budgets));
        
        render();
        updateCharts();
        
    } catch (error) {
        console.error('Firebase load error:', error);
        // Fallback to localStorage
        state.transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        state.budgets = JSON.parse(localStorage.getItem('budgets') || '[]');
        render();
        updateCharts();
    }
}

// ============================================
// THEME
// ============================================
function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', state.theme);
    initTheme();
    updateCharts();
}

// ============================================
// MONTH NAVIGATION
// ============================================
function changeMonth(delta) {
    state.month += delta;
    if (state.month > 11) { state.month = 0; state.year++; }
    if (state.month < 0) { state.month = 11; state.year--; }
    render();
    updateCharts();
}

// ============================================
// TRANSACTION MODAL
// ============================================
function openTransactionModal(transaction = null) {
    const modal = document.getElementById('transaction-modal');
    const form = document.getElementById('transaction-form');
    
    if (!modal || !form) return;
    
    form.reset();
    state.editId = null;

    if (transaction) {
        state.editId = transaction.id;
        document.getElementById('modal-title').textContent = 'Editează tranzacție';
        document.getElementById('submit-btn').querySelector('span').textContent = 'Salvează';
        
        state.type = transaction.type === 'Venit' ? 'income' : 'expense';
        document.querySelectorAll('.type-pill').forEach(p => {
            p.classList.toggle('active', p.dataset.type === state.type);
        });
        
        document.getElementById('amount').value = Math.abs(transaction.amount);
        updateCategorySelect();
        document.getElementById('category').value = transaction.category;
        updateSubcategorySelect();
        document.getElementById('subcategory').value = transaction.subcategory;
        document.getElementById('description').value = transaction.description || '';
        document.getElementById('date').value = transaction.date?.split('T')[0] || '';
    } else {
        document.getElementById('modal-title').textContent = 'Tranzacție nouă';
        document.getElementById('submit-btn').querySelector('span').textContent = 'Adaugă';
        
        document.querySelectorAll('.type-pill').forEach(p => {
            p.classList.toggle('active', p.dataset.type === state.type);
        });
        
        updateCategorySelect();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeTransactionModal() {
    const modal = document.getElementById('transaction-modal');
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

function updateCategorySelect() {
    const select = document.getElementById('category');
    if (!select) return;
    
    const cats = CATEGORIES[state.type];
    select.innerHTML = '<option value="">Alege categorie</option>';
    
    Object.entries(cats).forEach(([name, data]) => {
        select.innerHTML += `<option value="${name}">${data.icon} ${name}</option>`;
    });
    
    updateSubcategorySelect();
}

function updateSubcategorySelect() {
    const catSelect = document.getElementById('category');
    const subSelect = document.getElementById('subcategory');
    if (!catSelect || !subSelect) return;
    
    const category = catSelect.value;
    const cats = CATEGORIES[state.type];
    
    subSelect.innerHTML = '<option value="">Alege subcategorie</option>';
    
    if (category && cats[category]) {
        cats[category].subs.forEach(sub => {
            subSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
        });
    }
}

async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const subcategory = document.getElementById('subcategory').value;
    const description = document.getElementById('description').value;
    const date = document.getElementById('date').value;
    
    if (!amount || !category || !subcategory || !date) {
        toast('Completează toate câmpurile obligatorii', 'error');
        return;
    }
    
    const transaction = {
        date: date,
        type: state.type === 'income' ? 'Venit' : 'Cheltuială',
        category: category,
        subcategory: subcategory,
        description: description,
        amount: state.type === 'income' ? amount : -amount,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (state.editId) {
            await db.collection('transactions').doc(state.editId).update(transaction);
            const idx = state.transactions.findIndex(t => t.id === state.editId);
            if (idx !== -1) {
                state.transactions[idx] = { id: state.editId, ...transaction };
            }
            toast('Tranzacție actualizată!', 'success');
        } else {
            const docRef = await db.collection('transactions').add(transaction);
            state.transactions.unshift({ id: docRef.id, ...transaction });
            toast('Tranzacție adăugată!', 'success');
        }

        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        closeTransactionModal();
        render();
        updateCharts();
        
    } catch (error) {
        console.error('Save error:', error);
        toast('Eroare la salvare', 'error');
    }
}

async function deleteTransaction(id) {
    if (!confirm('Ștergi această tranzacție?')) return;
    
    try {
        await db.collection('transactions').doc(id).delete();
        state.transactions = state.transactions.filter(t => t.id !== id);
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        render();
        updateCharts();
        toast('Tranzacție ștearsă!', 'success');
    } catch (error) {
        console.error('Delete error:', error);
        toast('Eroare la ștergere', 'error');
    }
}

// ============================================
// RENDERING
// ============================================
function render() {
    updateMonthDisplay();
    updateStats();
    updateBudgetProgress();
    renderTransactions();
    renderCategories();
    renderRecurring();
    renderGoals();
    checkAlerts();
}

function updateMonthDisplay() {
    const monthEl = document.getElementById('current-month');
    const rangeEl = document.getElementById('month-range');
    
    if (monthEl) {
        monthEl.textContent = `${MONTHS[state.month]} ${state.year}`;
    }
    
    if (rangeEl) {
        const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
        rangeEl.textContent = `1 - ${daysInMonth} ${MONTHS_SHORT[state.month]}`;
    }
}

function updateStats() {
    const filtered = getFilteredTransactions();
    
    const income = filtered.filter(t => t.type === 'Venit').reduce((s, t) => s + Math.abs(t.amount), 0);
    const expenses = filtered.filter(t => t.type === 'Cheltuială').reduce((s, t) => s + Math.abs(t.amount), 0);
    const balance = income - expenses;
    
    // Update hero card
    document.getElementById('hero-balance').textContent = formatMoney(balance);
    document.getElementById('quick-income').textContent = formatMoney(income);
    document.getElementById('quick-expense').textContent = formatMoney(expenses);
    
    // Calculate trend
    const lastMonthData = getLastMonthData();
    const lastBalance = lastMonthData.income - lastMonthData.expenses;
    const trend = lastBalance !== 0 ? Math.round(((balance - lastBalance) / Math.abs(lastBalance)) * 100) : 0;
    
    const changeEl = document.getElementById('hero-balance-change');
    if (changeEl) {
        changeEl.className = 'hero-balance-change' + (trend < 0 ? ' negative' : '');
        changeEl.innerHTML = `
            <span class="change-icon">${trend >= 0 ? '↑' : '↓'}</span>
            <span class="change-text">${trend >= 0 ? '+' : ''}${trend}% față de luna trecută</span>
        `;
    }
    
    // Stats cards
    const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
    const today = new Date();
    const currentDay = (today.getMonth() === state.month && today.getFullYear() === state.year) 
        ? today.getDate() : daysInMonth;
    
    const dailyAvg = currentDay > 0 ? expenses / currentDay : 0;
    const prediction = dailyAvg * daysInMonth;
    const daysLeft = daysInMonth - currentDay;
    
    document.getElementById('daily-avg').textContent = formatMoney(dailyAvg);
    document.getElementById('prediction').textContent = formatMoney(prediction);
    document.getElementById('days-left').textContent = daysLeft;
    
    const biggestExpense = filtered
        .filter(t => t.type === 'Cheltuială')
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
    
    document.getElementById('biggest-expense').textContent = biggestExpense 
        ? formatMoney(Math.abs(biggestExpense.amount))
        : '-';
}

function updateBudgetProgress() {
    const filtered = getFilteredTransactions();
    const expenses = filtered.filter(t => t.type === 'Cheltuială').reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalBudget = state.budgets.reduce((s, b) => s + (b.budget || 0), 0) || 10000;
    const percent = Math.min(Math.round((expenses / totalBudget) * 100), 100);
    
    document.getElementById('budget-spent').textContent = formatNumber(expenses);
    document.getElementById('budget-total').textContent = formatNumber(totalBudget);
    
    const progress = document.getElementById('budget-progress');
    if (progress) {
        progress.style.width = `${percent}%`;
        progress.classList.remove('warning', 'danger');
        if (percent >= 100) progress.classList.add('danger');
        else if (percent >= 80) progress.classList.add('warning');
    }
}

function getFilteredTransactions() {
    return state.transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === state.month && d.getFullYear() === state.year;
    });
}

function getLastMonthData() {
    const lastMonth = state.month === 0 ? 11 : state.month - 1;
    const lastYear = state.month === 0 ? state.year - 1 : state.year;
    
    const filtered = state.transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
    });
    
    return {
        income: filtered.filter(t => t.type === 'Venit').reduce((s, t) => s + Math.abs(t.amount), 0),
        expenses: filtered.filter(t => t.type === 'Cheltuială').reduce((s, t) => s + Math.abs(t.amount), 0)
    };
}

function renderTransactions() {
    const container = document.getElementById('transactions-list');
    if (!container) return;
    
    const filtered = getFilteredTransactions().slice(0, 5);
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <div class="empty-text">Nicio tranzacție</div>
                <div class="empty-hint">Apasă + pentru a adăuga</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(t => createTransactionHTML(t)).join('');
}

function createTransactionHTML(t) {
    const isIncome = t.type === 'Venit';
    const cats = CATEGORIES[isIncome ? 'income' : 'expense'];
    const icon = cats[t.category]?.icon || '📦';
    const d = new Date(t.date);
    const dateStr = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
    
    return `
        <div class="transaction-item ${isIncome ? 'income' : 'expense'}" 
             onclick="openTransactionModal(state.transactions.find(x=>x.id==='${t.id}'))">
            <div class="transaction-icon">${icon}</div>
            <div class="transaction-info">
                <div class="transaction-title">${t.subcategory || t.category}</div>
                <div class="transaction-meta">${t.description || t.category} • ${dateStr}</div>
            </div>
            <div class="transaction-amount">${isIncome ? '+' : ''}${formatMoney(t.amount)}</div>
            <button class="transaction-delete" onclick="event.stopPropagation();deleteTransaction('${t.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
            </button>
        </div>
    `;
}

function renderCategories() {
    const container = document.getElementById('categories-grid');
    if (!container) return;
    
    const filtered = getFilteredTransactions().filter(t => t.type === 'Cheltuială');
    
    const byCategory = {};
    filtered.forEach(t => {
        if (!byCategory[t.category]) byCategory[t.category] = 0;
        byCategory[t.category] += Math.abs(t.amount);
    });
    
    const sorted = Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
    
    if (sorted.length === 0) {
        container.innerHTML = '<div class="empty-state small"><span>Nicio cheltuială</span></div>';
        return;
    }
    
    container.innerHTML = sorted.map(([cat, amount]) => {
        const icon = CATEGORIES.expense[cat]?.icon || '📦';
        return `
            <div class="category-chip">
                <div class="category-chip-icon">${icon}</div>
                <div class="category-chip-name">${cat}</div>
                <div class="category-chip-amount">${formatMoney(amount)}</div>
            </div>
        `;
    }).join('');
}

function renderRecurring() {
    const container = document.getElementById('recurring-list');
    const totalEl = document.getElementById('recurring-total');
    if (!container) return;
    
    if (state.recurring.length === 0) {
        container.innerHTML = '<div class="empty-state small"><span>Nicio plată recurentă</span></div>';
        if (totalEl) totalEl.textContent = '0 RON';
        return;
    }
    
    const total = state.recurring.reduce((s, r) => s + (r.amount || 0), 0);
    if (totalEl) totalEl.textContent = formatMoney(total);
    
    container.innerHTML = state.recurring.slice(0, 3).map(r => `
        <div class="recurring-item">
            <div class="recurring-icon">${CATEGORIES.expense[r.category]?.icon || '📦'}</div>
            <div class="recurring-info">
                <div class="recurring-name">${r.name}</div>
                <div class="recurring-date">În fiecare lună pe ${r.day}</div>
            </div>
            <div class="recurring-amount">${formatMoney(r.amount)}</div>
        </div>
    `).join('');
}

function renderGoals() {
    const container = document.getElementById('goals-list');
    if (!container) return;
    
    if (state.goals.length === 0) {
        container.innerHTML = '<div class="empty-state small"><span>Niciun obiectiv setat</span></div>';
        return;
    }
    
    container.innerHTML = state.goals.map(g => {
        const percent = Math.round((g.saved / g.target) * 100);
        const deadline = new Date(g.deadline);
        const dateStr = `${deadline.getDate()} ${MONTHS_SHORT[deadline.getMonth()]} ${deadline.getFullYear()}`;
        
        return `
            <div class="goal-card">
                <div class="goal-header">
                    <div class="goal-icon">${g.icon || '🎯'}</div>
                    <div>
                        <div class="goal-title">${g.name}</div>
                        <div class="goal-deadline">Până pe ${dateStr}</div>
                    </div>
                </div>
                <div class="goal-progress-bar">
                    <div class="goal-progress-fill" style="width: ${Math.min(percent, 100)}%"></div>
                </div>
                <div class="goal-stats">
                    <span>${formatMoney(g.saved)} economisiți</span>
                    <span class="goal-amount">${percent}%</span>
                </div>
            </div>
        `;
    }).join('');
}

function checkAlerts() {
    const section = document.getElementById('alerts-section');
    const container = document.getElementById('alerts-list');
    if (!section || !container) return;
    
    const filtered = getFilteredTransactions().filter(t => t.type === 'Cheltuială');
    const alerts = [];
    
    // Check budget alerts
    const byCategory = {};
    filtered.forEach(t => {
        if (!byCategory[t.category]) byCategory[t.category] = 0;
        byCategory[t.category] += Math.abs(t.amount);
    });
    
    state.budgets.forEach(b => {
        if (b.budget > 0) {
            const spent = byCategory[b.category] || 0;
            const percent = Math.round((spent / b.budget) * 100);
            
            if (percent >= 80) {
                alerts.push({
                    type: percent >= 100 ? 'danger' : 'warning',
                    icon: CATEGORIES.expense[b.category]?.icon || '📦',
                    title: b.category,
                    description: `${percent}% din buget folosit`,
                    percent: Math.min(percent, 100)
                });
            }
        }
    });
    
    if (alerts.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    container.innerHTML = alerts.map(a => `
        <div class="alert-item ${a.type}">
            <div class="alert-icon">${a.icon}</div>
            <div class="alert-info">
                <div class="alert-title">${a.title}</div>
                <div class="alert-description">${a.description}</div>
                <div class="alert-progress">
                    <div class="alert-progress-fill" style="width: ${a.percent}%"></div>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// CHARTS
// ============================================
function initCharts() {
    initPieChart();
    initLineChart();
    initBarChart();
}

function initPieChart() {
    const ctx = document.getElementById('pie-chart')?.getContext('2d');
    if (!ctx) return;
    
    state.charts.pie = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getChartTextColor(),
                        font: { size: 11 },
                        padding: 15,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

function initLineChart() {
    const ctx = document.getElementById('line-chart')?.getContext('2d');
    if (!ctx) return;
    
    state.charts.line = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Cheltuieli',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Venituri',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { color: getChartGridColor() },
                    ticks: { color: getChartTextColor() }
                },
                y: {
                    grid: { color: getChartGridColor() },
                    ticks: { color: getChartTextColor() }
                }
            },
            plugins: {
                legend: {
                    labels: { color: getChartTextColor() }
                }
            }
        }
    });
}

function initBarChart() {
    const ctx = document.getElementById('bar-chart')?.getContext('2d');
    if (!ctx) return;
    
    state.charts.bar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Cheltuieli',
                data: [],
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: getChartTextColor() }
                },
                y: {
                    grid: { color: getChartGridColor() },
                    ticks: { color: getChartTextColor() }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function getChartTextColor() {
    return state.theme === 'dark' ? '#9ca3af' : '#4b5563';
}

function getChartGridColor() {
    return state.theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
}

function updateCharts() {
    updatePieChart();
    updateLineChart();
    updateBarChart();
}

function updatePieChart() {
    if (!state.charts.pie) return;
    
    const filtered = getFilteredTransactions().filter(t => t.type === 'Cheltuială');
    const byCategory = {};
    
    filtered.forEach(t => {
        if (!byCategory[t.category]) byCategory[t.category] = 0;
        byCategory[t.category] += Math.abs(t.amount);
    });
    
    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    
    state.charts.pie.data.labels = sorted.map(([cat]) => cat);
    state.charts.pie.data.datasets[0].data = sorted.map(([, val]) => val);
    state.charts.pie.data.datasets[0].backgroundColor = sorted.map(([cat]) => 
        CATEGORIES.expense[cat]?.color || '#64748b'
    );
    state.charts.pie.options.plugins.legend.labels.color = getChartTextColor();
    state.charts.pie.update();
}

function updateLineChart() {
    if (!state.charts.line) return;
    
    const months = [];
    const expenseData = [];
    const incomeData = [];
    
    for (let i = 5; i >= 0; i--) {
        let m = state.month - i;
        let y = state.year;
        if (m < 0) { m += 12; y--; }
        
        months.push(MONTHS_SHORT[m]);
        
        const monthTrans = state.transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === m && d.getFullYear() === y;
        });
        
        expenseData.push(monthTrans.filter(t => t.type === 'Cheltuială').reduce((s, t) => s + Math.abs(t.amount), 0));
        incomeData.push(monthTrans.filter(t => t.type === 'Venit').reduce((s, t) => s + Math.abs(t.amount), 0));
    }
    
    state.charts.line.data.labels = months;
    state.charts.line.data.datasets[0].data = expenseData;
    state.charts.line.data.datasets[1].data = incomeData;
    state.charts.line.options.scales.x.grid.color = getChartGridColor();
    state.charts.line.options.scales.x.ticks.color = getChartTextColor();
    state.charts.line.options.scales.y.grid.color = getChartGridColor();
    state.charts.line.options.scales.y.ticks.color = getChartTextColor();
    state.charts.line.options.plugins.legend.labels.color = getChartTextColor();
    state.charts.line.update();
}

function updateBarChart() {
    if (!state.charts.bar) return;
    
    const filtered = getFilteredTransactions().filter(t => t.type === 'Cheltuială');
    const byCategory = {};
    
    filtered.forEach(t => {
        if (!byCategory[t.category]) byCategory[t.category] = 0;
        byCategory[t.category] += Math.abs(t.amount);
    });
    
    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6);
    
    state.charts.bar.data.labels = sorted.map(([cat]) => cat);
    state.charts.bar.data.datasets[0].data = sorted.map(([, val]) => val);
    state.charts.bar.options.scales.x.ticks.color = getChartTextColor();
    state.charts.bar.options.scales.y.grid.color = getChartGridColor();
    state.charts.bar.options.scales.y.ticks.color = getChartTextColor();
    state.charts.bar.update();
}

// ============================================
// MODALS
// ============================================
function openAIModal() {
    document.getElementById('ai-modal')?.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeAIModal() {
    document.getElementById('ai-modal')?.classList.remove('open');
    document.body.style.overflow = '';
}

function openSettingsModal() {
    document.getElementById('settings-modal')?.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    // Load current settings
    document.getElementById('gemini-api-key').value = state.geminiApiKey;
    document.getElementById('theme-select').value = state.theme;
}

function closeSettingsModal() {
    document.getElementById('settings-modal')?.classList.remove('open');
    document.body.style.overflow = '';
}

function openAllTransactionsModal() {
    document.getElementById('all-transactions-modal')?.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderAllTransactions();
}

function closeAllTransactionsModal() {
    document.getElementById('all-transactions-modal')?.classList.remove('open');
    document.body.style.overflow = '';
}

function renderAllTransactions(filter = 'all') {
    const container = document.getElementById('all-transactions-list');
    if (!container) return;
    
    let filtered = getFilteredTransactions();
    
    if (filter === 'expense') {
        filtered = filtered.filter(t => t.type === 'Cheltuială');
    } else if (filter === 'income') {
        filtered = filtered.filter(t => t.type === 'Venit');
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-text">Nicio tranzacție</div></div>';
        return;
    }
    
    container.innerHTML = filtered.map(t => createTransactionHTML(t)).join('');
}

function filterTransactions(filter) {
    renderAllTransactions(filter);
}

function searchTransactions(query) {
    const container = document.getElementById('all-transactions-list');
    if (!container) return;
    
    const q = query.toLowerCase();
    const filtered = getFilteredTransactions().filter(t => 
        t.category?.toLowerCase().includes(q) ||
        t.subcategory?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">Niciun rezultat</div></div>';
        return;
    }
    
    container.innerHTML = filtered.map(t => createTransactionHTML(t)).join('');
}

// ============================================
// HELPERS
// ============================================
function formatMoney(amount) {
    return new Intl.NumberFormat('ro-RO').format(Math.abs(amount)) + ' ' + state.currency;
}

function formatNumber(num) {
    return new Intl.NumberFormat('ro-RO').format(num);
}

function toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;
    toastEl.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toastEl);
    setTimeout(() => {
        toastEl.style.opacity = '0';
        toastEl.style.transform = 'translateY(-20px)';
        setTimeout(() => toastEl.remove(), 300);
    }, 3000);
}

function startAutoRefresh() {
    // Refresh data every 5 minutes
    setInterval(() => {
        if (state.isOnline && !document.hidden) {
            loadData();
        }
    }, 5 * 60 * 1000);
}

function exportData() {
    const data = {
        transactions: state.transactions,
        budgets: state.budgets,
        recurring: state.recurring,
        goals: state.goals,
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-pro-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast('Date exportate!', 'success');
}

function clearAllData() {
    if (!confirm('Ești sigur că vrei să ștergi toate datele? Această acțiune nu poate fi anulată.')) return;
    
    localStorage.clear();
    state.transactions = [];
    state.budgets = [];
    state.recurring = [];
    state.goals = [];
    render();
    updateCharts();
    toast('Toate datele au fost șterse', 'success');
}

// AI Functions placeholder
async function sendAIMessage(message) {
    const messagesContainer = document.getElementById('ai-messages');
    if (!messagesContainer) return;
    
    // Add user message
    messagesContainer.innerHTML += `
        <div class="ai-message user">
            <div class="message-avatar">👤</div>
            <div class="message-content"><p>${message}</p></div>
        </div>
    `;
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Simulate AI response (will be replaced with real Gemini API)
    setTimeout(() => {
        const response = generateLocalResponse(message);
        messagesContainer.innerHTML += `
            <div class="ai-message bot">
                <div class="message-avatar">🤖</div>
                <div class="message-content"><p>${response}</p></div>
            </div>
        `;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 1000);
}

function generateLocalResponse(message) {
    const filtered = getFilteredTransactions();
    const expenses = filtered.filter(t => t.type === 'Cheltuială').reduce((s, t) => s + Math.abs(t.amount), 0);
    const income = filtered.filter(t => t.type === 'Venit').reduce((s, t) => s + Math.abs(t.amount), 0);
    
    if (message.toLowerCase().includes('cheltuieli')) {
        return `Luna aceasta ai cheltuit ${formatMoney(expenses)}. Categoria cu cele mai mari cheltuieli poate fi văzută în graficul de categorii.`;
    }
    
    if (message.toLowerCase().includes('economisi')) {
        const balance = income - expenses;
        if (balance > 0) {
            return `Felicitări! Luna aceasta ai economisit ${formatMoney(balance)}. Continuă așa! 💪`;
        } else {
            return `Luna aceasta ai cheltuit mai mult decât ai câștigat cu ${formatMoney(Math.abs(balance))}. Încearcă să reduci cheltuielile neesențiale.`;
        }
    }
    
    if (message.toLowerCase().includes('trend') || message.toLowerCase().includes('analiză')) {
        return `Analizând datele tale, venituri: ${formatMoney(income)}, cheltuieli: ${formatMoney(expenses)}. Balanța: ${formatMoney(income - expenses)}.`;
    }
    
    return `Am înțeles întrebarea ta. Pentru analize detaliate, configurează API-ul Gemini în Setări. Între timp, pot să-ți ofer informații de bază despre cheltuielile și veniturile tale.`;
}

function refreshAIInsights() {
    const btn = document.getElementById('refresh-insights');
    const content = document.getElementById('ai-insights-content');
    
    if (btn) btn.classList.add('spinning');
    
    setTimeout(() => {
        const filtered = getFilteredTransactions();
        const expenses = filtered.filter(t => t.type === 'Cheltuială');
        const total = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
        
        const byCategory = {};
        expenses.forEach(t => {
            if (!byCategory[t.category]) byCategory[t.category] = 0;
            byCategory[t.category] += Math.abs(t.amount);
        });
        
        const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
        
        const insights = [];
        
        if (topCategory) {
            insights.push({
                icon: '📊',
                text: `Cea mai mare categorie de cheltuieli: ${topCategory[0]} (${formatMoney(topCategory[1])})`
            });
        }
        
        const dailyAvg = total / new Date().getDate();
        insights.push({
            icon: '💡',
            text: `Cheltuiești în medie ${formatMoney(dailyAvg)} pe zi`
        });
        
        if (content) {
            content.innerHTML = insights.map(i => `
                <div class="ai-insight-card">
                    <div class="insight-icon">${i.icon}</div>
                    <div class="insight-text">${i.text}</div>
                </div>
            `).join('');
        }
        
        if (btn) btn.classList.remove('spinning');
    }, 1000);
}

// Make functions global
window.state = state;
window.openTransactionModal = openTransactionModal;
window.deleteTransaction = deleteTransaction;
window.CATEGORIES = CATEGORIES;
window.formatMoney = formatMoney;
window.toast = toast;
