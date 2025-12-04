// ============================================
// BUDGET PRO - AI ASSISTANT
// Datele rămân 100% locale!
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // AI Modal elements
    const aiBtn = document.getElementById('ai-btn');
    const aiModal = document.getElementById('ai-modal');
    const aiClose = document.getElementById('ai-close');
    const aiBackdrop = aiModal?.querySelector('.modal-backdrop');
    const aiInput = document.getElementById('ai-input');
    const aiSend = document.getElementById('ai-send');
    const aiMessages = document.getElementById('ai-messages');
    const aiPrompts = document.querySelectorAll('.ai-prompt');

    // Open modal
    aiBtn?.addEventListener('click', () => {
        aiModal?.classList.add('open');
    });

    // Close modal
    aiClose?.addEventListener('click', () => {
        aiModal?.classList.remove('open');
    });

    aiBackdrop?.addEventListener('click', () => {
        aiModal?.classList.remove('open');
    });

    // Quick prompts
    aiPrompts.forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            if (prompt) {
                aiInput.value = prompt;
                sendMessage();
            }
        });
    });

    // Send on click
    aiSend?.addEventListener('click', sendMessage);

    // Send on Enter
    aiInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function sendMessage() {
        const message = aiInput?.value.trim();
        if (!message) return;

        // Add user message
        addMessage(message, 'user');
        aiInput.value = '';

        // Show typing
        const typingId = 'typing-' + Date.now();
        addMessage('Se gândește...', 'bot', typingId);

        // Generate response
        setTimeout(() => {
            const response = generateResponse(message);
            const typingEl = document.getElementById(typingId);
            if (typingEl) {
                typingEl.querySelector('.ai-msg-content').innerHTML = response;
            }
            aiMessages.scrollTop = aiMessages.scrollHeight;
        }, 600);
    }

    function addMessage(content, type, id = null) {
        const div = document.createElement('div');
        div.className = `ai-message ${type}`;
        if (id) div.id = id;
        
        const avatar = type === 'bot' ? '🤖' : '👤';
        div.innerHTML = `
            <div class="ai-msg-avatar">${avatar}</div>
            <div class="ai-msg-content">${escapeHtml(content)}</div>
        `;
        
        if (type === 'user') {
            div.innerHTML = `
                <div class="ai-msg-content">${escapeHtml(content)}</div>
                <div class="ai-msg-avatar">${avatar}</div>
            `;
        }
        
        aiMessages?.appendChild(div);
        aiMessages.scrollTop = aiMessages.scrollHeight;
    }

    function generateResponse(message) {
        const msg = message.toLowerCase();
        
        // Get data from global state
        const transactions = window.state?.transactions || [];
        const currentMonth = window.state?.month ?? new Date().getMonth();
        const currentYear = window.state?.year ?? new Date().getFullYear();
        
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
            .slice(0, 5);

        const fmt = (n) => new Intl.NumberFormat('ro-RO').format(Math.round(n)) + ' RON';

        // Response patterns
        if (msg.includes('cheltuieli') || msg.includes('cheltuit') || msg.includes('top') || msg.includes('mari')) {
            if (expenses === 0) {
                return '📊 Nu ai cheltuieli înregistrate luna aceasta.';
            }
            let r = `📊 <b>Cheltuieli: ${fmt(expenses)}</b><br><br>`;
            if (topCategories.length > 0) {
                r += '<b>Top categorii:</b><br>';
                topCategories.forEach(([cat, amount], i) => {
                    const pct = Math.round((amount / expenses) * 100);
                    r += `${i + 1}. ${cat}: ${fmt(amount)} (${pct}%)<br>`;
                });
            }
            return r;
        }
        
        if (msg.includes('economisi') || msg.includes('economii') || msg.includes('sfat') || msg.includes('salvez')) {
            if (income === 0) {
                return '💡 Adaugă veniturile pentru sfaturi personalizate!';
            }
            const rate = Math.round((balance / income) * 100);
            let r = `💰 <b>Analiză economii:</b><br><br>`;
            r += `Venituri: ${fmt(income)}<br>`;
            r += `Cheltuieli: ${fmt(expenses)}<br>`;
            r += `Balanță: <b>${fmt(balance)}</b><br><br>`;
            
            if (balance > 0) {
                r += `✅ Economisești ${rate}% din venituri.<br>`;
                r += rate >= 20 ? '🎉 Excelent!' : '💡 Țintește 20%!';
            } else {
                r += `⚠️ Cheltuielile depășesc veniturile!<br><br>`;
                r += `<b>Sfaturi:</b><br>`;
                r += `• Identifică cheltuielile neesențiale<br>`;
                r += `• Setează bugete pe categorii<br>`;
                r += `• Regula 50/30/20`;
            }
            return r;
        }
        
        if (msg.includes('trend') || msg.includes('analiză') || msg.includes('tendință') || msg.includes('evoluție')) {
            let r = `📈 <b>Analiză financiară:</b><br><br>`;
            r += `Venituri: ${fmt(income)}<br>`;
            r += `Cheltuieli: ${fmt(expenses)}<br>`;
            r += `Balanță: ${balance >= 0 ? '+' : ''}${fmt(balance)}<br><br>`;
            
            const today = new Date();
            const day = (today.getMonth() === currentMonth && today.getFullYear() === currentYear) 
                ? today.getDate() : new Date(currentYear, currentMonth + 1, 0).getDate();
            const avg = day > 0 ? expenses / day : 0;
            const daysLeft = new Date(currentYear, currentMonth + 1, 0).getDate() - day;
            const prediction = expenses + (avg * daysLeft);
            
            r += `📊 Media zilnică: ${fmt(avg)}<br>`;
            r += `🔮 Predicție lună: ${fmt(prediction)}`;
            return r;
        }
        
        if (msg.includes('buget') || msg.includes('plan')) {
            if (income === 0) return '📋 Adaugă veniturile pentru un plan de buget!';
            let r = `📋 <b>Plan buget recomandat</b><br>(din ${fmt(income)})<br><br>`;
            r += `🏠 Locuință: ${fmt(income * 0.3)} (30%)<br>`;
            r += `🍽️ Mâncare: ${fmt(income * 0.15)} (15%)<br>`;
            r += `🚗 Transport: ${fmt(income * 0.1)} (10%)<br>`;
            r += `💊 Sănătate: ${fmt(income * 0.05)} (5%)<br>`;
            r += `🎬 Distracție: ${fmt(income * 0.1)} (10%)<br>`;
            r += `💰 Economii: ${fmt(income * 0.2)} (20%)<br>`;
            r += `📦 Altele: ${fmt(income * 0.1)} (10%)`;
            return r;
        }
        
        // Default
        return `👋 Te pot ajuta cu:<br><br>
            • <b>"Top cheltuieli"</b> - vezi categoriile<br>
            • <b>"Cum economisesc?"</b> - sfaturi<br>
            • <b>"Analiză"</b> - statistici<br>
            • <b>"Plan buget"</b> - recomandări`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
