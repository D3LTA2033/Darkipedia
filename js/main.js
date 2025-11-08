document.addEventListener('DOMContentLoaded', async () => {
    // --- Utility functions (minimal, keep as needed for now, can enhance listing later) ---
    function formatDate(iso) {
        if (!iso) return '';
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return '';
        const now = new Date();
        const diffSec = Math.floor((now - date) / 1000);
        if (diffSec < 60 * 60 && date.toDateString() === now.toDateString()) {
            if (diffSec < 60) return `${diffSec}s ago`;
            return `${Math.floor(diffSec / 60)}m ago`;
        }
        if (date.toDateString() === now.toDateString()) {
            return 'Today ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if ((now - date) < 1000 * 60 * 60 * 24 * 2 &&
            now.getDate() - date.getDate() === 1 &&
            now.getMonth() === date.getMonth() &&
            now.getFullYear() === date.getFullYear()
        ) {
            return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
            " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    function getExcerpt(content, len = 90) {
        if (!content) return '';
        let text = content.trim()
            .replace(/^[#!>\-\* ]*/gm, '')
            .replace(/<\/?[^>]+(>|$)/g, "")
            .split('\n')
            .map(s => s.trim())
            .find(l => l.length > 0) || '';
        if (text.length > len) {
            let cut = text.slice(0, len - 3);
            let lastSpace = cut.lastIndexOf(' ');
            if (lastSpace > 25) cut = cut.slice(0, lastSpace);
            return cut + '...';
        }
        return text;
    }

    // --- Set up API base ---
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3000/api'
        : window.location.origin + '/api';

    // --- Get or create pastes container ---
    const container = document.getElementById('pastes-container') || (() => {
        const main = document.querySelector('main') || document.body;
        const c = document.createElement('div');
        c.id = 'pastes-container';
        main.appendChild(c);
        return c;
    })();

    // --- Fetch pastes from API ---
    let pastes = [];
    try {
        const res = await fetch(`${API_BASE}/pastes`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        pastes = await res.json();
    } catch (e) {
        console.error('Failed to fetch pastes:', e);
        pastes = [];
    }

    // --- Empty state ---
    if (!Array.isArray(pastes) || pastes.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;margin-top:2em;font-size:1.2em;color:#8b949e;">
                🗒️ No pastes yet — <a href="pages/paste.html" style="color:#39ff14;font-weight:bold;">create one</a>!
            </div>
        `;
        return;
    }

    // --- Main Listing: simple/unstyled + readable for further enhancement ---
    pastes.sort((a, b) => new Date(b.date) - new Date(a.date));
    pastes.forEach(paste => {
        const card = document.createElement('a');
        card.className = 'paste-card';
        card.href = `pages/view.html?id=${encodeURIComponent(paste.id)}`;
        card.style.display = 'block';
        card.style.marginBottom = '1.2em';
        card.textContent = paste.title && paste.title.trim() ? paste.title : 'Untitled';
        container.appendChild(card);
    });
});
