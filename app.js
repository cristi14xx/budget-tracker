// ============================================
// BUDGET PRO - APP.JS
// ============================================

// CONFIG - Înlocuiește cu URL-ul tău de la Google Apps Script
const API_URL = 'YOUR_GOOGLE_SCRIPT_URL_HERE';

const CATEGORIES = {
    expense: {
        'Locuință': { icon: '🏠', subs: ['Chirie', 'Utilități', 'Întreținere'] },
        'Abonamente': { icon: '📱', subs: ['YouTube Premium', 'Apple Music', 'Netflix', 'Spotify', 'Vodafone', 'Comedy Box', 'Abonament Solo', 'Alte abonamente'] },
        'Mâncare': { icon: '🍽️', subs: ['Supermarket', 'Restaurante', 'Livrări', 'Cafea'] },
        'Transport': { icon: '🚗', subs: ['Benzină', 'Transport public', 'Taxi/Uber', 'Parcare'] },
        'Sport': { icon: '💪', subs: ['Sala', 'Suplimente', 'Dansuri', 'Echipament'] },
        'Sănătate': { icon: '🏥', subs: ['Farmacie', 'Medic', 'Analize'] },
        'Divertisment': { icon: '🎬', subs: ['Cinema', 'Concerte', 'Jocuri', 'Ieșiri'] },
        'Investiții': { icon: '📈', subs: ['Bursă', 'Crypto', 'Economii'] },
        'Îmbrăcăminte': { icon: '👕', subs: ['Haine', 'Încălțăminte', 'Accesorii'] },
        'Altele': { icon: '📦', subs: ['Cadouri', 'Diverse'] }
    },
    income: {
        'Salariu': { icon: '💼', subs: ['Salariu net', 'Bonusuri', 'Prime'] },
        'Freelance': { icon: '💻', subs: ['Proiecte', 'Consultanță'] },
        'Investiții': { icon: '📊', subs: ['Dividende', 'Dobânzi', 'Câștiguri'] },
        'Alte venituri': { icon: '💰', subs: ['Vânzări', 'Rambursări', 'Diverse'] }
    }
};

const MONTHS = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 
                'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];

// ============================================
// STATE
// ============================================
let state = {
    transactions: JSON.parse(localStorage.getItem('transactions') || '[]'),
    budgets: JSON.parse(localStorage.getItem('budgets') || '[]'),
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    type: 'expense',
    editId: null,
    theme: localStorage.getItem('theme') || 'dark',
    pieChart: null,
    lineChart: null
};

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    initListeners();
    render();
    initCharts();
});

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    if (sunIcon && moonIcon) {
        if (state.theme === 'light') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    }
}

function initListeners() {
    // Theme
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.onclick = () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', state.theme);
            applyTheme();
            updateCharts();
        };
    }

    // Sync
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) {
        syncBtn.onclick = syncData;
    }

    // Month nav
    const prevMonth = document.getElementById('prev-month');
    const nextMonth = document.getElementById('next-month');
    if (prevMonth) prevMonth.onclick = () => changeMonth(-1);
    if (nextMonth) nextMonth.onclick = () => changeMonth(1);

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const tabPanel = document.getElementById(`${tab.dataset.tab}-tab`);
            if (tabPanel) tabPanel.classList.add('active');
        };
    });

    // Add button
    const addBtn = document.getElementById('add-btn');
    if (addBtn) {
        addBtn.onclick = () => openModal();
    }

    // Modal backdrop
    const modal = document.getElementById('modal');
    if (modal) {
        const backdrop = modal.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.onclick = closeModal;
        }
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
        cancelBtn.onclick = closeModal;
    }

    // Type buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.onclick = () => {
            state.type = btn.dataset.type;
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateCategoryOptions();
        };
    });

    // Category change
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
        categorySelect.onchange = updateSubcategoryOptions;
    }

    // Form submit
    const form = document.getElementById('transaction-form');
    if (form) {
        form.onsubmit = handleSubmit;
    }
}

// ============================================
// DATA
// ============================================
async function syncData() {
    if (API_URL === 'YOUR_GOOGLE_SCRIPT_URL_HERE') {
        toast('Configurează API URL în app.js pentru sincronizare', 'error');
        return;
    }

    const btn = document.getElementById('sync-btn');
    if (btn) btn.style.animation = 'spin 1s linear infinite';

    try {
        const res = await fetch(`${API_URL}?action=getTransactions`);
        const data = await res.json();
        if (data.success) {
            state.transactions = data.data.map(t => ({
                ...t,
                amount: parseFloat(t.amount)
            }));
            localStorage.setItem('transactions', JSON.stringify(state.transactions));
            render();
            updateCharts();
            toast('Sincronizat cu succes!', 'success');
        }
    } catch (e) {
        console.log('Sync error:', e);
        toast('Eroare la sincronizare', 'error');
    }

    if (btn) btn.style.animation = '';
}

function saveLocal() {
    localStorage.setItem('transactions', JSON.stringify(state.transactions));
    localStorage.setItem('budgets', JSON.stringify(state.budgets));
}

// ============================================
// NAVIGATION
// ============================================
function changeMonth(delta) {
    state.month += delta;
    if (state.month > 11) { state.month = 0; state.year++; }
    if (state.month < 0) { state.month = 11; state.year--; }
    render();
    updateCharts();
    
    // Update features if available
    if (typeof checkBudgetAlerts === 'function') {
        checkBudgetAlerts();
    }
}

// ============================================
// MODAL
// ============================================
function openModal(trans = null) {
    const modal = document.getElementById('modal');
    const form = document.getElementById('transaction-form');
    if (!modal || !form) return;
    
    form.reset();
    state.editId = null;

    const modalTitle = document.getElementById('modal-title');
    const submitBtn = document.getElementById('submit-btn');

    if (trans) {
        state.editId = trans.id;
        if (modalTitle) modalTitle.textContent = 'Editează tranzacție';
        if (submitBtn) submitBtn.textContent = 'Salvează';
        
        state.type = trans.type === 'Venit' ? 'income' : 'expense';
        document.querySelectorAll('.type-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.type === state.type);
        });
        
        const amountInput = document.getElementById('amount');
        if (amountInput) amountInput.value = Math.abs(trans.amount);
        
        updateCategoryOptions();
        
        const categorySelect = document.getElementById('category');
        if (categorySelect) categorySelect.value = trans.category;
        
        updateSubcategoryOptions();
        
        const subcategorySelect = document.getElementById('subcategory');
        if (subcategorySelect) subcategorySelect.value = trans.subcategory;
        
        const descInput = document.getElementById('description');
        if (descInput) descInput.value = trans.description || '';
        
        const dateInput = document.getElementById('date');
        if (dateInput && trans.date) {
            dateInput.value = trans.date.split('T')[0];
        }
    } else {
        if (modalTitle) modalTitle.textContent = 'Adaugă tranzacție';
        if (submitBtn) submitBtn.textContent = 'Adaugă';
        
        state.type = 'expense';
        document.querySelectorAll('.type-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.type === 'expense');
        });
        updateCategoryOptions();
        
        const dateInput = document.getElementById('date');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    }

    modal.classList.add('open');
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('open');
}

function updateCategoryOptions() {
    const sel = document.getElementById('category');
    if (!sel) return;
    
    const cats = CATEGORIES[state.type];
    sel.innerHTML = '<option value="">Selectează...</option>';
    Object.entries(cats).forEach(([name, data]) => {
        sel.innerHTML += `<option value="${name}">${data.icon} ${name}</option>`;
    });
    
    const subSel = document.getElementById('subcategory');
    if (subSel) subSel.innerHTML = '<option value="">Selectează...</option>';
}

function updateSubcategoryOptions() {
    const cat = document.getElementById('category')?.value;
    const sel = document.getElementById('subcategory');
    if (!sel) return;
    
    const cats = CATEGORIES[state.type];
    sel.innerHTML = '<option value="">Selectează...</option>';
    if (cat && cats[cat]) {
        cats[cat].subs.forEach(sub => {
            sel.innerHTML += `<option value="${sub}">${sub}</option>`;
        });
    }
}

function handleSubmit(e) {
    e.preventDefault();
    
    const amountInput = document.getElementById('amount');
    const categorySelect = document.getElementById('category');
    const subcategorySelect = document.getElementById('subcategory');
    const descInput = document.getElementById('description');
    const dateInput = document.getElementById('date');
    
    if (!amountInput || !categorySelect || !subcategorySelect || !dateInput) return;
    
    const amount = parseFloat(amountInput.value);
    const trans = {
        id: state.editId || 'local_' + Date.now(),
        date: dateInput.value,
        type: state.type === 'income' ? 'Venit' : 'Cheltuială',
        category: categorySelect.value,
        subcategory: subcategorySelect.value,
        description: descInput?.value || '',
        amount: state.type === 'income' ? amount : -amount
    };

    if (state.editId) {
        const idx = state.transactions.findIndex(t => t.id === state.editId);
        if (idx !== -1) state.transactions[idx] = trans;
        toast('Tranzacție actualizată!', 'success');
    } else {
        state.transactions.push(trans);
        toast('Tranzacție adăugată!', 'success');
    }

    saveLocal();
    closeModal();
    render();
    updateCharts();
    
    // Update features if available
    if (typeof checkBudgetAlerts === 'function') {
        checkBudgetAlerts();
    }

    // Sync if configured
    if (API_URL !== 'YOUR_GOOGLE_SCRIPT_URL_HERE') {
        syncToServer(trans, state.editId ? 'update' : 'add');
    }
}

async function syncToServer(trans, action) {
    try {
        const params = new URLSearchParams({
            action: action === 'add' ? 'addTransaction' : 'updateTransaction',
            id: trans.id,
            date: trans.date,
            type: trans.type,
            category: trans.category,
            subcategory: trans.subcategory,
            description: trans.description,
            amount: trans.amount
        });
        await fetch(`${API_URL}?${params}`);
    } catch (e) {
        console.log('Sync error:', e);
    }
}

function deleteTransaction(id) {
    if (!confirm('Ștergi această tranzacție?')) return;
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveLocal();
    render();
    updateCharts();
    toast('Tranzacție ștearsă!', 'success');
    
    // Sync delete if configured
    if (API_URL !== 'YOUR_GOOGLE_SCRIPT_URL_HERE') {
        fetch(`${API_URL}?action=deleteTransaction&id=${id}`).catch(e => console.log(e));
    }
}

// ============================================
// RENDER
// ============================================
function render() {
    const currentMonthEl = document.getElementById('current-month');
    if (currentMonthEl) {
        currentMonthEl.textContent = `${MONTHS[state.month]} ${state.year}`;
    }
    
    const filtered = state.transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === state.month && d.getFullYear() === state.year;
    });

    const income = filtered.filter(t => t.type === 'Venit').reduce((s, t) => s + Math.abs(t.amount), 0);
    const expenses = filtered.filter(t => t.type === 'Cheltuială').reduce((s, t) => s + Math.abs(t.amount), 0);
    const balance = income - expenses;
    const totalBudget = state.budgets.reduce((s, b) => s + (b.budget || 0), 0) || 10000;
    const budgetPercent = Math.round((expenses / totalBudget) * 100);

    const totalIncomeEl = document.getElementById('total-income');
    const totalExpensesEl = document.getElementById('total-expenses');
    const balanceEl = document.getElementById('balance');
    const budgetPercentEl = document.getElementById('budget-percent');
    
    if (totalIncomeEl) totalIncomeEl.textContent = formatMoney(income);
    if (totalExpensesEl) totalExpensesEl.textContent = formatMoney(expenses);
    if (balanceEl) balanceEl.textContent = formatMoney(balance);
    if (budgetPercentEl) budgetPercentEl.textContent = `${budgetPercent}%`;

    const fill = document.getElementById('budget-fill');
    if (fill) {
        fill.style.width = `${Math.min(budgetPercent, 100)}%`;
        fill.className = 'budget-fill' + (budgetPercent > 100 ? ' danger' : budgetPercent > 80 ? ' warning' : '');
    }

    // Insights
    const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
    const today = new Date();
    const currentDay = (today.getMonth() === state.month && today.getFullYear() === state.year) 
        ? today.getDate() : daysInMonth;
    const dailyAvg = currentDay > 0 ? expenses / currentDay : 0;
    const prediction = dailyAvg * daysInMonth;

    const dailyAvgEl = document.getElementById('daily-avg');
    const predictionEl = document.getElementById('prediction');
    const biggestExpenseEl = document.getElementById('biggest-expense');
    
    if (dailyAvgEl) dailyAvgEl.textContent = formatMoney(dailyAvg);
    if (predictionEl) {
        predictionEl.textContent = formatMoney(prediction);
        predictionEl.className = 'insight-value' + 
            (prediction > totalBudget ? ' danger' : prediction > totalBudget * 0.8 ? ' warning' : ' success');
    }

    const biggestExpense = filtered
        .filter(t => t.type === 'Cheltuială')
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
    
    if (biggestExpenseEl) {
        biggestExpenseEl.textContent = biggestExpense 
            ? `${biggestExpense.subcategory || biggestExpense.category} (${formatMoney(Math.abs(biggestExpense.amount))})`
            : '-';
    }

    // Trends
    const lastMonth = state.month === 0 ? 11 : state.month - 1;
    const lastYear = state.month === 0 ? state.year - 1 : state.year;
    const lastFiltered = state.transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
    });
    const lastExpenses = lastFiltered.filter(t => t.type === 'Cheltuială').reduce((s, t) => s + Math.abs(t.amount), 0);
    
    const expenseTrendEl = document.getElementById('expense-trend');
    if (lastExpenses > 0 && expenseTrendEl) {
        const expenseTrend = Math.round(((expenses - lastExpenses) / lastExpenses) * 100);
        expenseTrendEl.style.display = 'inline-flex';
        expenseTrendEl.className = 'stat-trend ' + (expenseTrend > 0 ? 'down' : 'up');
        expenseTrendEl.innerHTML = `<span>${expenseTrend > 0 ? '↑' : '↓'}</span> <span>${Math.abs(expenseTrend)}%</span>`;
    }

    renderTransactions(filtered);
    renderCategories(filtered);
    renderBudgets();
}

function renderTransactions(filtered) {
    const container = document.getElementById('transactions-tab');
    if (!container) return;
    
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <div class="empty-text">Nicio tranzacție în această lună</div>
                <div class="empty-hint">Apasă + pentru a adăuga</div>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(t => {
        const isIncome = t.type === 'Venit';
        const cats = CATEGORIES[isIncome ? 'income' : 'expense'];
        const icon = cats[t.category]?.icon || '📦';
        const d = new Date(t.date);
        const dateStr = `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;

        return `
            <div class="transaction-item ${isIncome ? 'income' : 'expense'}" onclick="openModal(state.transactions.find(x=>x.id==='${t.id}'))">
                <div class="transaction-icon">${icon}</div>
                <div class="transaction-info">
                    <div class="transaction-category">${t.subcategory || t.category}</div>
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
    }).join('');
}

function renderCategories(filtered) {
    const container = document.getElementById('categories-tab');
    if (!container) return;
    
    const expenses = filtered.filter(t => t.type === 'Cheltuială');

    const byCategory = {};
    expenses.forEach(t => {
        if (!byCategory[t.category]) byCategory[t.category] = { total: 0, subs: {} };
        byCategory[t.category].total += Math.abs(t.amount);
        if (!byCategory[t.category].subs[t.subcategory]) byCategory[t.category].subs[t.subcategory] = 0;
        byCategory[t.category].subs[t.subcategory] += Math.abs(t.amount);
    });

    const budgetByCat = {};
    state.budgets.forEach(b => {
        if (!budgetByCat[b.category]) budgetByCat[b.category] = 0;
        budgetByCat[b.category] += b.budget || 0;
    });

    if (Object.keys(byCategory).length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">Nicio cheltuială de afișat</div></div>';
        return;
    }

    container.innerHTML = Object.entries(byCategory)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([cat, data]) => {
            const icon = CATEGORIES.expense[cat]?.icon || '📦';
            const budget = budgetByCat[cat] || 0;
            const pct = budget > 0 ? Math.round((data.total / budget) * 100) : 0;
            const pctClass = pct > 100 ? 'danger' : pct > 80 ? 'warning' : '';

            const subsHtml = Object.entries(data.subs)
                .sort((a, b) => b[1] - a[1])
                .map(([sub, amt]) => `
                    <div class="subcat-item">
                        <span class="subcat-name">${sub}</span>
                        <span class="subcat-amount">${formatMoney(amt)}</span>
                    </div>
                `).join('');

            return `
                <div class="category-card" onclick="this.classList.toggle('expanded')">
                    <div class="category-header">
                        <div class="category-main">
                            <div class="category-icon">${icon}</div>
                            <span class="category-name">${cat}</span>
                        </div>
                        <div class="category-stats">
                            <div class="category-spent">${formatMoney(data.total)}</div>
                            ${budget ? `<div class="category-budget">din ${formatMoney(budget)}</div>` : ''}
                        </div>
                        <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 18l6-6-6-6"/>
                        </svg>
                    </div>
                    <div class="category-progress">
                        <div class="category-progress-fill ${pctClass}" style="width:${Math.min(pct, 100)}%"></div>
                    </div>
                    <div class="category-subcats">${subsHtml}</div>
                </div>
            `;
        }).join('');
}

function renderBudgets() {
    const container = document.getElementById('budgets-tab');
    if (!container) return;
    
    const allBudgets = [];

    Object.entries(CATEGORIES.expense).forEach(([cat, data]) => {
        data.subs.forEach(sub => {
            const existing = state.budgets.find(b => b.category === cat && b.subcategory === sub);
            allBudgets.push({
                category: cat,
                subcategory: sub,
                budget: existing?.budget || 0,
                icon: data.icon
            });
        });
    });

    container.innerHTML = allBudgets.map(b => `
        <div class="budget-item">
            <div class="budget-info">
                <div class="budget-category">${b.icon} ${b.category}</div>
                <div class="budget-subcategory">${b.subcategory}</div>
            </div>
            <input type="number" class="budget-input" value="${b.budget}" 
                onchange="updateBudget('${b.category}','${b.subcategory}',this.value)">
            <span class="budget-currency">RON</span>
        </div>
    `).join('');
}

function updateBudget(cat, sub, val) {
    const idx = state.budgets.findIndex(b => b.category === cat && b.subcategory === sub);
    if (idx !== -1) {
        state.budgets[idx].budget = parseFloat(val) || 0;
    } else {
        state.budgets.push({ category: cat, subcategory: sub, budget: parseFloat(val) || 0 });
    }
    saveLocal();
    render();
    
    // Update alerts if available
    if (typeof checkBudgetAlerts === 'function') {
        checkBudgetAlerts();
    }
}

// ============================================
// CHARTS
// ============================================
function initCharts() {
    const pieCtx = document.getElementById('pie-chart')?.getContext('2d');
    const lineCtx = document.getElementById('line-chart')?.getContext('2d');
    
    if (!pieCtx || !lineCtx) return;
    
    const isDark = state.theme === 'dark';
    const textColor = isDark ? '#9ca3af' : '#4b5563';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    // Pie Chart
    state.pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
                    '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#64748b'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: textColor, font: { size: 11 }, padding: 10 }
                }
            }
        }
    });

    // Line Chart
    state.lineChart = new Chart(lineCtx, {
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
                    tension: 0.4
                },
                {
                    label: 'Venituri',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: textColor } },
                y: { grid: { color: gridColor }, ticks: { color: textColor } }
            },
            plugins: {
                legend: { labels: { color: textColor } }
            }
        }
    });

    updateCharts();
}

function updateCharts() {
    if (!state.pieChart || !state.lineChart) return;
    
    const isDark = state.theme === 'dark';
    const textColor = isDark ? '#9ca3af' : '#4b5563';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    // Update chart colors for theme
    state.pieChart.options.plugins.legend.labels.color = textColor;
    state.lineChart.options.scales.x.grid.color = gridColor;
    state.lineChart.options.scales.x.ticks.color = textColor;
    state.lineChart.options.scales.y.grid.color = gridColor;
    state.lineChart.options.scales.y.ticks.color = textColor;
    state.lineChart.options.plugins.legend.labels.color = textColor;

    // Pie Chart Data
    const filtered = state.transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === state.month && d.getFullYear() === state.year && t.type === 'Cheltuială';
    });

    const byCategory = {};
    filtered.forEach(t => {
        if (!byCategory[t.category]) byCategory[t.category] = 0;
        byCategory[t.category] += Math.abs(t.amount);
    });

    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    state.pieChart.data.labels = sorted.map(([cat]) => cat);
    state.pieChart.data.datasets[0].data = sorted.map(([, val]) => val);
    state.pieChart.update();

    // Line Chart Data - last 6 months
    const months = [];
    const expenseData = [];
    const incomeData = [];

    for (let i = 5; i >= 0; i--) {
        let m = state.month - i;
        let y = state.year;
        if (m < 0) { m += 12; y--; }
        
        months.push(MONTHS[m].slice(0, 3));
        
        const monthTrans = state.transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === m && d.getFullYear() === y;
        });
        
        expenseData.push(monthTrans.filter(t => t.type === 'Cheltuială').reduce((s, t) => s + Math.abs(t.amount), 0));
        incomeData.push(monthTrans.filter(t => t.type === 'Venit').reduce((s, t) => s + Math.abs(t.amount), 0));
    }

    state.lineChart.data.labels = months;
    state.lineChart.data.datasets[0].data = expenseData;
    state.lineChart.data.datasets[1].data = incomeData;
    state.lineChart.update();
}

// ============================================
// HELPERS
// ============================================
function formatMoney(amount) {
    return new Intl.NumberFormat('ro-RO').format(Math.abs(amount)) + ' RON';
}

function toast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;
    toastEl.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span>
        <span class="toast-message">${msg}</span>
    `;
    container.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
}

// Make functions global
window.state = state;
window.openModal = openModal;
window.closeModal = closeModal;
window.deleteTransaction = deleteTransaction;
window.updateBudget = updateBudget;
window.CATEGORIES = CATEGORIES;
window.formatMoney = formatMoney;
window.toast = toast;
