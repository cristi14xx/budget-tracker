// ============================================
// BUDGET PRO - AI ASSISTANT
// Gemini API Integration (Data stays local!)
// ============================================

class BudgetAI {
    constructor() {
        this.apiKey = localStorage.getItem('geminiApiKey') || '';
        this.conversationHistory = [];
        this.systemPrompt = this.buildSystemPrompt();
    }

    buildSystemPrompt() {
        return `Ești un asistent financiar personal inteligent și prietenos. Numele tău este Budget Pro AI.

REGULI IMPORTANTE:
1. Răspunzi DOAR în limba română
2. Ești specializat în finanțe personale, bugetare și economisire
3. Nu ceri niciodată informații personale sensibile
4. Oferi sfaturi practice și acționabile
5. Ești încurajator dar realist
6. Folosești emoji-uri pentru a face conversația mai prietenoasă

CAPABILITĂȚI:
- Analizezi cheltuielile și veniturile utilizatorului
- Oferi sfaturi de economisire personalizate
- Identifici tendințe în obiceiurile de cheltuieli
- Sugerezi bugete realiste
- Ajuți la stabilirea obiectivelor financiare
- Răspunzi la întrebări despre finanțe personale

CONTEXT: Vei primi date despre tranzacțiile utilizatorului. Analizează-le și oferă insights utile.`;
    }

    getFinancialContext() {
        const transactions = window.state?.transactions || [];
        const currentMonth = window.state?.month;
        const currentYear = window.state?.year;
        
        // Filter current month transactions
        const filtered = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const income = filtered.filter(t => t.type === 'Venit').reduce((s, t) => s + Math.abs(t.amount), 0);
        const expenses = filtered.filter(t => t.type === 'Cheltuială').reduce((s, t) => s + Math.abs(t.amount), 0);
        const balance = income - expenses;

        // Category breakdown
        const byCategory = {};
        filtered.filter(t => t.type === 'Cheltuială').forEach(t => {
            if (!byCategory[t.category]) byCategory[t.category] = 0;
            byCategory[t.category] += Math.abs(t.amount);
        });

        const topCategories = Object.entries(byCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([cat, amount]) => `${cat}: ${amount} RON`);

        // Last 6 months trend
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
            let m = currentMonth - i;
            let y = currentYear;
            if (m < 0) { m += 12; y--; }
            
            const monthTrans = transactions.filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === m && d.getFullYear() === y;
            });
            
            const monthExpenses = monthTrans.filter(t => t.type === 'Cheltuială').reduce((s, t) => s + Math.abs(t.amount), 0);
            const monthIncome = monthTrans.filter(t => t.type === 'Venit').reduce((s, t) => s + Math.abs(t.amount), 0);
            
            monthlyData.push({
                month: ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m],
                expenses: monthExpenses,
                income: monthIncome
            });
        }

        return `
SITUAȚIA FINANCIARĂ CURENTĂ (${['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'][currentMonth]} ${currentYear}):

📊 Sumar lunar:
- Venituri totale: ${income} RON
- Cheltuieli totale: ${expenses} RON
- Balanță: ${balance} RON
- Număr tranzacții: ${filtered.length}

📈 Top 5 categorii cheltuieli:
${topCategories.length > 0 ? topCategories.join('\n') : 'Nicio cheltuială înregistrată'}

📅 Evoluție ultimele 6 luni:
${monthlyData.map(m => `${m.month}: Venituri ${m.income} RON, Cheltuieli ${m.expenses} RON`).join('\n')}

Obiective active: ${window.state?.goals?.length || 0}
Plăți recurente: ${window.state?.recurring?.length || 0}
`;
    }

    async sendMessage(userMessage) {
        if (!this.apiKey) {
            return this.generateLocalResponse(userMessage);
        }

        const financialContext = this.getFinancialContext();
        
        // Build messages array for Gemini
        const messages = [
            {
                role: 'user',
                parts: [{ text: this.systemPrompt + '\n\n' + financialContext }]
            },
            {
                role: 'model',
                parts: [{ text: 'Am înțeles contextul financiar. Sunt gata să te ajut! Cu ce te pot ajuta?' }]
            },
            ...this.conversationHistory,
            {
                role: 'user',
                parts: [{ text: userMessage }]
            }
        ];

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: messages,
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    },
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nu am putut genera un răspuns.';

            // Store in conversation history
            this.conversationHistory.push(
                { role: 'user', parts: [{ text: userMessage }] },
                { role: 'model', parts: [{ text: aiResponse }] }
            );

            // Keep only last 10 exchanges
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }

            return aiResponse;

        } catch (error) {
            console.error('Gemini API error:', error);
            return this.generateLocalResponse(userMessage);
        }
    }

    generateLocalResponse(userMessage) {
        const message = userMessage.toLowerCase();
        const context = this.getFinancialContext();
        
        // Parse context for data
        const incomeMatch = context.match(/Venituri totale: (\d+)/);
        const expenseMatch = context.match(/Cheltuieli totale: (\d+)/);
        const income = incomeMatch ? parseInt(incomeMatch[1]) : 0;
        const expenses = expenseMatch ? parseInt(expenseMatch[1]) : 0;
        const balance = income - expenses;

        // Pattern matching for common questions
        if (message.includes('cheltuieli') || message.includes('cheltuit')) {
            if (expenses === 0) {
                return '📊 Nu ai înregistrat cheltuieli luna aceasta. Începe să adaugi tranzacții pentru a vedea analiza!';
            }
            return `📊 Luna aceasta ai cheltuit **${expenses} RON**.\n\n${balance >= 0 ? '✅ Ești pe plus!' : '⚠️ Atenție, cheltuielile depășesc veniturile!'}\n\nPentru o analiză mai detaliată, verifică graficul de categorii din aplicație.`;
        }

        if (message.includes('economisi') || message.includes('economii') || message.includes('salvez')) {
            if (balance > 0) {
                const savingRate = Math.round((balance / income) * 100);
                return `💰 Felicitări! Luna aceasta ai economisit **${balance} RON** (${savingRate}% din venituri).\n\n💡 **Sfat**: Încearcă să economisești cel puțin 20% din venituri. ${savingRate >= 20 ? 'Ești pe drumul cel bun!' : 'Mai ai puțin de lucrat, dar ești pe direcția bună!'}`;
            } else {
                return `⚠️ Luna aceasta cheltuielile depășesc veniturile cu **${Math.abs(balance)} RON**.\n\n💡 **Sfaturi pentru economisire**:\n1. Identifică cheltuielile neesențiale\n2. Stabilește un buget pentru fiecare categorie\n3. Folosește regula 50/30/20 (nevoi/dorințe/economii)`;
            }
        }

        if (message.includes('buget') || message.includes('planifica')) {
            return `📋 **Recomandare buget lunar** bazată pe veniturile tale de ${income} RON:\n\n• 🏠 Locuință: ${Math.round(income * 0.3)} RON (30%)\n• 🍽️ Mâncare: ${Math.round(income * 0.15)} RON (15%)\n• 🚗 Transport: ${Math.round(income * 0.1)} RON (10%)\n• 💊 Sănătate: ${Math.round(income * 0.05)} RON (5%)\n• 🎬 Divertisment: ${Math.round(income * 0.1)} RON (10%)\n• 💰 Economii: ${Math.round(income * 0.2)} RON (20%)\n• 📦 Altele: ${Math.round(income * 0.1)} RON (10%)`;
        }

        if (message.includes('trend') || message.includes('evoluție') || message.includes('analiză')) {
            return `📈 **Analiză financiară**\n\n• Venituri luna aceasta: ${income} RON\n• Cheltuieli luna aceasta: ${expenses} RON\n• Balanță: ${balance >= 0 ? '+' : ''}${balance} RON\n\n${balance >= 0 ? '✅ Situație financiară bună! Continuă așa.' : '⚠️ Cheltuielile depășesc veniturile. Revizuiește bugetul.'}`;
        }

        if (message.includes('sfat') || message.includes('recomand') || message.includes('ajut')) {
            const tips = [
                '💡 Stabilește obiective financiare SMART (Specifice, Măsurabile, Accesibile, Relevante, Temporale)',
                '💡 Folosește regula 24 de ore înainte de cumpărături mari',
                '💡 Automatizează economiile - transferă automat 10-20% din salariu',
                '💡 Verifică abonamentele lunare și elimină-le pe cele nefolosite',
                '💡 Pregătește mâncare acasă mai des pentru a economisi',
                '💡 Creează un fond de urgență de 3-6 luni de cheltuieli'
            ];
            return tips[Math.floor(Math.random() * tips.length)];
        }

        if (message.includes('obiectiv') || message.includes('țintă') || message.includes('goal')) {
            return `🎯 **Cum să stabilești obiective financiare**\n\n1. **Pe termen scurt** (1-3 luni): Fond de urgență mic\n2. **Pe termen mediu** (3-12 luni): Vacanță, electronice\n3. **Pe termen lung** (1+ ani): Avans casă, mașină\n\n💡 Folosește funcția "Obiective" din aplicație pentru a urmări progresul!`;
        }

        // Default response
        return `👋 Salut! Sunt asistentul tău financiar.\n\nPot să te ajut cu:\n• 📊 Analiza cheltuielilor\n• 💡 Sfaturi de economisire\n• 📋 Planificarea bugetului\n• 🎯 Stabilirea obiectivelor\n\n${this.apiKey ? '' : '⚠️ Pentru răspunsuri mai detaliate, configurează API-ul Gemini în Setări.'}`;
    }

    clearHistory() {
        this.conversationHistory = [];
    }

    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('geminiApiKey', key);
    }
}

// Initialize AI
const budgetAI = new BudgetAI();

// Override sendAIMessage function
window.sendAIMessage = async function(message) {
    const messagesContainer = document.getElementById('ai-messages');
    if (!messagesContainer) return;

    // Add user message
    const userMessageEl = document.createElement('div');
    userMessageEl.className = 'ai-message user';
    userMessageEl.innerHTML = `
        <div class="message-avatar">👤</div>
        <div class="message-content"><p>${escapeHtml(message)}</p></div>
    `;
    messagesContainer.appendChild(userMessageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Show typing indicator
    const typingEl = document.createElement('div');
    typingEl.className = 'ai-message bot typing';
    typingEl.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content"><p>Se gândește...</p></div>
    `;
    messagesContainer.appendChild(typingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Get AI response
    const response = await budgetAI.sendMessage(message);

    // Remove typing indicator
    typingEl.remove();

    // Add AI response
    const aiMessageEl = document.createElement('div');
    aiMessageEl.className = 'ai-message bot';
    aiMessageEl.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">${formatAIResponse(response)}</div>
    `;
    messagesContainer.appendChild(aiMessageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatAIResponse(text) {
    // Convert markdown-like formatting to HTML
    return text
        .split('\n\n')
        .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
        .join('')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/• /g, '&bull; ');
}

// Refresh AI insights with actual data
window.refreshAIInsights = async function() {
    const btn = document.getElementById('refresh-insights');
    const content = document.getElementById('ai-insights-content');
    
    if (btn) btn.classList.add('spinning');

    // Get data
    const transactions = window.state?.transactions || [];
    const currentMonth = window.state?.month;
    const currentYear = window.state?.year;
    
    const filtered = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const expenses = filtered.filter(t => t.type === 'Cheltuială');
    const income = filtered.filter(t => t.type === 'Venit');
    const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalIncome = income.reduce((s, t) => s + Math.abs(t.amount), 0);

    // Category analysis
    const byCategory = {};
    expenses.forEach(t => {
        if (!byCategory[t.category]) byCategory[t.category] = 0;
        byCategory[t.category] += Math.abs(t.amount);
    });
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

    // Daily average
    const today = new Date();
    const currentDay = (today.getMonth() === currentMonth && today.getFullYear() === currentYear) 
        ? today.getDate() : new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyAvg = currentDay > 0 ? totalExpenses / currentDay : 0;

    // Generate insights
    const insights = [];

    if (topCategory) {
        const percentage = Math.round((topCategory[1] / totalExpenses) * 100);
        insights.push({
            icon: '📊',
            text: `<strong>${topCategory[0]}</strong> reprezintă ${percentage}% din cheltuielile tale (${formatMoney(topCategory[1])})`
        });
    }

    if (dailyAvg > 0) {
        const daysLeft = new Date(currentYear, currentMonth + 1, 0).getDate() - currentDay;
        const prediction = totalExpenses + (dailyAvg * daysLeft);
        insights.push({
            icon: '🔮',
            text: `La ritmul actual, vei cheltui aproximativ <strong>${formatMoney(prediction)}</strong> luna aceasta`
        });
    }

    const balance = totalIncome - totalExpenses;
    if (balance > 0) {
        const savingRate = Math.round((balance / totalIncome) * 100);
        insights.push({
            icon: '💰',
            text: `Economisești <strong>${savingRate}%</strong> din venituri. ${savingRate >= 20 ? 'Excelent!' : 'Încearcă să ajungi la 20%!'}`
        });
    } else if (balance < 0) {
        insights.push({
            icon: '⚠️',
            text: `Atenție! Cheltuielile depășesc veniturile cu <strong>${formatMoney(Math.abs(balance))}</strong>`
        });
    }

    if (insights.length === 0) {
        insights.push({
            icon: '💡',
            text: 'Adaugă tranzacții pentru a primi insights personalizate!'
        });
    }

    // Simulate delay for effect
    await new Promise(resolve => setTimeout(resolve, 800));

    if (content) {
        content.innerHTML = insights.map(i => `
            <div class="ai-insight-card animate-fade-in">
                <div class="insight-icon">${i.icon}</div>
                <div class="insight-text">${i.text}</div>
            </div>
        `).join('');
    }

    if (btn) btn.classList.remove('spinning');
};

function formatMoney(amount) {
    return new Intl.NumberFormat('ro-RO').format(Math.abs(amount)) + ' RON';
}

// Export for use
window.budgetAI = budgetAI;
