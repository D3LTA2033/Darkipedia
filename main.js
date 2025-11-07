document.addEventListener('DOMContentLoaded', () => {
    // Utility: Create or get container for pastes
    const container = document.getElementById('pastes-container') || (() => {
        const main = document.querySelector('main') || document.body;
        const div = document.createElement('div');
        div.id = 'pastes-container';
        main.appendChild(div);
        return div;
    })();

    // Utility: Format date in a nicer way
    function formatDate(iso) {
        if (!iso) return '';
        const date = new Date(iso);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            // Show only time if today
            return date.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });
        }
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
            " " + date.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });
    }

    // Utility: Short preview of content
    function getExcerpt(content, len = 90) {
        if (!content) return '';
        const line = content.trim().split('\n')[0];
        return line.length > len ? line.slice(0, len - 3) + '...' : line;
    }

    // Utility: Count category frequencies (for extra UI enrichment)
    function categoryStats(pastes) {
        const freq = {};
        pastes.forEach(p => {
            const cat = p.category || 'Uncategorized';
            freq[cat] = (freq[cat] || 0) + 1;
        });
        return freq;
    }

    // Fetch all pastes from localStorage
    let pastes = [];
    try {
        const stored = localStorage.getItem('pastes');
        if (stored) pastes = JSON.parse(stored) || [];
    } catch (e) {
        pastes = [];
    }

    if (Array.isArray(pastes) && pastes.length > 0) {
        // Sort by latest first
        pastes.sort((a, b) => (b.date || 0).localeCompare(a.date || 0));

        // Show category stats if more than one category
        const catMap = categoryStats(pastes);
        if (Object.keys(catMap).length > 1) {
            const catBar = document.createElement('div');
            catBar.className = 'pastes-category-bar';
            catBar.style.cssText = 'margin:1.2em 0 2em 0;padding:0.7em 1em;background:rgba(32,34,48,.92);border-radius:7px;font-size:.98em;color:#61f9bd;display:flex;flex-wrap:wrap;gap:1.3em;align-items:center;';
            catBar.append('Categories: ');
            Object.entries(catMap).forEach(([cat, count]) => {
                const c = document.createElement('span');
                c.style.cssText = 'color:#39ff14;font-weight:500;margin-right:.2em;';
                c.textContent = cat;
                const cnt = document.createElement('span');
                cnt.style.cssText = 'color:#ff4ffe;margin-right:.9em;font-size:.95em;margin-left:.3em;';
                cnt.textContent = `(${count})`;
                catBar.appendChild(c);
                catBar.appendChild(cnt);
            });
            container.appendChild(catBar);
        }

        pastes.forEach(paste => {
            const card = document.createElement('a');
            card.className = 'paste-card';
            card.href = `pages/view.html?id=${encodeURIComponent(paste.id)}`;
            card.style.display = 'block';
            card.style.marginBottom = '1.15em';
            card.style.background = 'var(--card-bg, #181b23)';
            card.style.borderRadius = '9px';
            card.style.boxShadow = '0 1px 10px #39ff1425, 0 1px 2px #fff1'; 
            card.style.padding = '1.15em 1.4em 1em 1.2em';
            card.style.color = 'inherit';
            card.style.textDecoration = 'none';
            card.style.transition = 'box-shadow .13s,border .13s';

            card.onmouseover = () => {card.style.boxShadow = '0 2px 30px #39ff1660, 0 0 1px #fff8';}
            card.onmouseout = () => {card.style.boxShadow = '0 1px 10px #39ff1425, 0 1px 2px #fff1';}

            // Title
            const title = document.createElement('h2');
            title.textContent = paste.title || 'Untitled';
            title.style.margin = '0 0 .25em 0';
            title.style.fontSize = '1.3em';
            title.style.color = 'var(--neon-green,#82fa2b)';
            title.style.letterSpacing = '0.04em';
            title.style.textShadow = '0 0 6px #82fa2b55';
            title.style.wordBreak = 'break-word';

            // Excerpt of content
            const excerpt = document.createElement('div');
            excerpt.className = 'paste-excerpt';
            excerpt.textContent = getExcerpt(paste.content);
            excerpt.style.color = 'var(--text-main, #cfd6db)';
            excerpt.style.opacity = '0.92';
            excerpt.style.fontSize = '1em';
            excerpt.style.marginBottom = '0.47em';

            // Meta bar
            const meta = document.createElement('div');
            meta.className = 'paste-meta';
            meta.style.display = 'flex';
            meta.style.gap = '1em';
            meta.style.alignItems = 'center';
            meta.style.fontSize = '0.97em';
            meta.style.letterSpacing = '.01em';
            meta.style.opacity = '0.85';

            // Category
            const category = document.createElement('span');
            category.className = 'paste-category';
            category.textContent = paste.category || 'Uncategorized';
            category.style.color = 'var(--neon-blue, #15ffe0)';
            category.style.fontWeight = '500';

            // Date
            const date = document.createElement('span');
            date.className = 'paste-date';
            date.textContent = formatDate(paste.date);

            // Content length (in chars)
            const len = document.createElement('span');
            len.className = 'paste-length';
            if (paste.content && typeof paste.content === 'string') {
                len.textContent = `${paste.content.length} chars`;
                len.style.color = '#ff4ffe';
                len.style.fontSize = '0.97em';
            }

            // If paste has multiple lines
            let lines = 1;
            if (paste.content && typeof paste.content === 'string') {
                lines = paste.content.split('\n').length;
            }
            if (lines > 1) {
                const linespan = document.createElement('span');
                linespan.className = 'paste-lines';
                linespan.style.color = '#1ed2fd';
                linespan.textContent = `${lines} lines`;
                meta.appendChild(linespan);
            }

            meta.appendChild(category);
            meta.appendChild(date);
            if (len.textContent) meta.appendChild(len);

            card.appendChild(title);
            card.appendChild(excerpt);
            card.appendChild(meta);

            container.appendChild(card);
        });
    } else {
        // Nothing found: suggest creating a paste, and try to look for deleted/archived pastes
        const msg = document.createElement('div');
        msg.className = 'no-pastes-msg';
        msg.style.cssText = 'color:var(--text-dim,#8b949e);text-align:center;margin-top:2.1em;font-size:1.1em;font-weight:500;';
        msg.innerHTML = `No pastes yet — <a href="pages/paste.html" style="color:#39ff14;text-underline-offset:3px;">create one</a>!`;

        // Try to find pastes in sessionStorage, as a rare recovery hack
        try {
            const ss = sessionStorage.getItem('pastes');
            if (ss) {
                let sp = [];
                try { sp = JSON.parse(ss) || []; } catch {}
                if (sp.length) {
                    const rec = document.createElement('div');
                    rec.style.cssText = 'margin-top:1.5em;font-size:.95em;color:#9efcfa;';
                    rec.textContent = `You have ${sp.length} pastes temporarily stored in this browser session. Try importing.`;
                    msg.appendChild(document.createElement('br'));
                    msg.appendChild(rec);
                }
            }
        } catch (e) {}

        container.appendChild(msg);
    }
});
