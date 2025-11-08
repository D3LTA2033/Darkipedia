document.addEventListener('DOMContentLoaded', () => {
    // Utility: Get or create container for pastes
    const getOrCreateContainer = () => {
        let c = document.getElementById('pastes-container');
        if (c) return c;
        const main = document.querySelector('main') || document.body;
        c = document.createElement('div');
        c.id = 'pastes-container';
        main.appendChild(c);
        return c;
    };
    const container = getOrCreateContainer();

    // Utility: Nicely format date/time (relative if recent)
    function formatDate(iso) {
        if (!iso) return '';
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return '';
        const now = new Date();
        const diffSec = Math.floor((now - date) / 1000);
        if (diffSec < 60 * 60 && date.toDateString() === now.toDateString()) {
            // Less than hour ago, show relative
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

    // Utility: Get a clean/short preview of content
    function getExcerpt(content, len = 90) {
        if (!content) return '';
        let text = content.trim()
            .replace(/^[#!>\-\* ]*/gm, '') // strip markdown/quotes
            .replace(/<\/?[^>]+(>|$)/g, "") // strip HTML if any
            .split('\n')
            .map(s => s.trim())
            .find(l => l.length > 0) || '';
        if (text.length > len) {
            // Try to break at a word
            let cut = text.slice(0, len - 3);
            let lastSpace = cut.lastIndexOf(' ');
            if (lastSpace > 25) cut = cut.slice(0, lastSpace);
            return cut + '...';
        }
        return text;
    }

    // Utility: Collect stats for categories (with zero-paste category color randomization)
    function categoryStats(pastes) {
        const freq = {};
        pastes.forEach(p => {
            const cat = (typeof p.category === 'string' ? p.category : 'Uncategorized') || 'Uncategorized';
            freq[cat] = (freq[cat] || 0) + 1;
        });
        return freq;
    }

    // Utility: Generate avatar emoji per paste/category
    function emojiAvatar(str) {
        // Quick hash to pick emoji
        const emojis = ['📝','📋','📄','📚','💡','🔒','👀','🌍','🗝️','💬','✒️','🔥','🌈','🌙','🔊','🔎','📢','🌿','🎉','🍀'];
        let sum = 0;
        for (let i = 0; i < str.length; ++i) sum += str.charCodeAt(i);
        return emojis[sum % emojis.length];
    }

    // Utility: Sanitize text for safe HTML display (in case)
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // --- Fetch all pastes from localStorage, robust against errors ---
    let pastes = [];
    try {
        const stored = localStorage.getItem('pastes');
        if (stored) pastes = JSON.parse(stored) || [];
        if (!Array.isArray(pastes)) pastes = [];
    } catch (e) {
        pastes = [];
    }

    // --- Main Listing Logic ---
    if (Array.isArray(pastes) && pastes.length > 0) {
        // Sort pastes by latest date (falling back to id for undated legacy ones)
        pastes.sort((a, b) => {
            const dA = a.date || '0', dB = b.date || '0';
            return dB.localeCompare(dA) || (b.id || '').localeCompare(a.id || '');
        });

        // Render category stats bar if variety of categories
        const categories = categoryStats(pastes);
        if (Object.keys(categories).length > 1) {
            const catBar = document.createElement('div');
            catBar.className = 'pastes-category-bar';
            catBar.style.cssText = 'margin:1.2em 0 2em 0;padding:0.7em 1em;background:rgba(32,34,48,.92);' +
                'border-radius:7px;font-size:.98em;color:#61f9bd;display:flex;flex-wrap:wrap;gap:1.3em;align-items:center;';

            const label = document.createElement('span');
            label.style.fontWeight = 'bold';
            label.style.marginRight = '.6em';
            label.textContent = 'Categories:';
            catBar.append(label);

            Object.entries(categories).sort(([a], [b]) => a.localeCompare(b)).forEach(([cat, count]) => {
                const c = document.createElement('span');
                c.style.cssText = `color:#39ff14;font-weight:500;margin-right:.2em;display:inline-flex;align-items:center;gap:.22em;`;
                c.innerHTML = `<span style="font-size:1em">${emojiAvatar(cat)}</span> ${escapeHTML(cat)}`;
                const cnt = document.createElement('span');
                cnt.style.cssText = 'color:#ff4ffe;margin-right:.9em;font-size:.95em;margin-left:.15em;';
                cnt.textContent = `(${count})`;
                catBar.appendChild(c);
                catBar.appendChild(cnt);
            });
            container.appendChild(catBar);
        }

        // Render all pastes!
        pastes.forEach(paste => {
            const card = document.createElement('a');
            card.className = 'paste-card';
            card.href = `pages/view.html?id=${encodeURIComponent(paste.id)}`;
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', paste.title ? `${paste.title} (view paste)` : 'Untitled paste');

            Object.assign(card.style, {
                display: 'block',
                marginBottom: '1.15em',
                background: 'var(--card-bg, #181b23)',
                borderRadius: '9px',
                boxShadow: '0 1px 10px #39ff1425, 0 1px 2px #fff1',
                padding: '1.15em 1.4em 1em 1.2em',
                color: 'inherit',
                textDecoration: 'none',
                transition: 'box-shadow .13s,border .13s',
                position: 'relative',
                minHeight: '85px'
            });

            card.onmouseover = () => { card.style.boxShadow = '0 2px 30px #39ff1660, 0 0 1px #fff8'; }
            card.onmouseout = () => { card.style.boxShadow = '0 1px 10px #39ff1425, 0 1px 2px #fff1'; }

            // Small left emoji/badge for category - add some more visual distinction
            const badge = document.createElement('span');
            badge.className = 'paste-card-badge';
            badge.style.cssText = 'position:absolute;left:.73em;top:.88em;font-size:1.18em;user-select:none;';
            badge.textContent = emojiAvatar(paste.category || '');
            card.appendChild(badge);

            // Title
            const title = document.createElement('h2');
            title.textContent = paste.title && paste.title.trim() ? paste.title : 'Untitled';
            title.style.margin = '0 0 .20em 2.1em';
            title.style.fontSize = '1.19em';
            title.style.color = 'var(--neon-green, #82fa2b)';
            title.style.letterSpacing = '0.04em';
            title.style.textShadow = '0 0 6px #82fa2b55';
            title.style.wordBreak = 'break-word';
            title.style.textOverflow = 'ellipsis';
            title.style.overflow = 'hidden';
            title.style.whiteSpace = 'nowrap';
            card.appendChild(title);

            // Excerpt of content
            const excerpt = document.createElement('div');
            excerpt.className = 'paste-excerpt';
            excerpt.textContent = getExcerpt(paste.content);
            excerpt.title = (paste.content || '').slice(0, 180);
            excerpt.style.color = 'var(--text-main, #cfd6db)';
            excerpt.style.opacity = '0.92';
            excerpt.style.fontSize = '1em';
            excerpt.style.marginBottom = '0.47em';
            excerpt.style.marginLeft = '2.1em';
            excerpt.style.whiteSpace = 'normal';
            excerpt.style.overflow = 'hidden';
            card.appendChild(excerpt);

            // Meta bar (category, date, length, line count)
            const meta = document.createElement('div');
            meta.className = 'paste-meta';
            meta.style.display = 'flex';
            meta.style.gap = '1.12em';
            meta.style.alignItems = 'center';
            meta.style.fontSize = '0.97em';
            meta.style.letterSpacing = '.01em';
            meta.style.opacity = '0.82';
            meta.style.marginLeft = '2.1em';

            // Category
            const category = document.createElement('span');
            category.className = 'paste-category';
            category.textContent = paste.category || 'Uncategorized';
            category.style.color = 'var(--neon-blue, #15ffe0)';
            category.style.fontWeight = '500';
            category.style.maxWidth = '104px';
            category.style.overflow = 'hidden';
            category.style.textOverflow = 'ellipsis';
            category.style.whiteSpace = 'nowrap';
            meta.appendChild(category);

            // Date
            const date = document.createElement('span');
            date.className = 'paste-date';
            date.textContent = formatDate(paste.date);
            meta.appendChild(date);

            // Content length (in chars)
            const len = document.createElement('span');
            len.className = 'paste-length';
            if (paste.content && typeof paste.content === 'string') {
                len.textContent = `${paste.content.length} chars`;
                len.style.color = '#ff4ffe';
                len.style.fontSize = '0.97em';
                meta.appendChild(len);
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

            card.appendChild(meta);

            // Thumbnail, e.g. if there were images (bonus: future proofing, or file attachments)
            if (paste.images && Array.isArray(paste.images) && paste.images.length) {
                const thumbWrap = document.createElement('div');
                thumbWrap.className = 'paste-imgs-thumb-row';
                thumbWrap.style.cssText = 'margin-top:.45em;display:flex;gap:.47em;margin-left:2.1em;';
                paste.images.slice(0, 3).forEach(img => {
                    const imgEl = document.createElement('img');
                    imgEl.src = img.thumb || img.url || '';
                    imgEl.alt = 'paste-image';
                    imgEl.style.cssText = 'max-width:54px;max-height:54px;border-radius:6px;background:#111;border:1.2px solid #242933;';
                    thumbWrap.appendChild(imgEl);
                });
                if (paste.images.length > 3) {
                    const more = document.createElement('span');
                    more.textContent = `+${paste.images.length - 3} more`;
                    more.style.cssText = 'font-size:.92em;color:#8ff2ec;margin-left:.42em;';
                    thumbWrap.appendChild(more);
                }
                card.appendChild(thumbWrap);
            }

            // Accessibility trick: allow keypress to open paste
            card.addEventListener('keydown', e => {
                if (e.key === "Enter" || e.key === " ") {
                    card.click();
                }
            });

            container.appendChild(card);
        });
    } else {
        // No pastes: Provide a stronger call-to-action with a friendly illustration and possible recovery
        const msg = document.createElement('div');
        msg.className = 'no-pastes-msg';
        msg.style.cssText = 'color:var(--text-dim,#8b949e);text-align:center;margin-top:2.5em;font-size:1.18em;font-weight:600;';
        msg.innerHTML = `
            <div style="font-size:3.4em;margin-bottom:0.11em;">🗒️</div>
            No pastes yet — <a href="pages/paste.html" style="color:#39ff14;text-underline-offset:3px;font-weight:bold;">create one</a>!
        `;

        // Try to recover "deleted" or temp pastes from sessionStorage
        let recoveredMsg = '';
        try {
            const ss = sessionStorage.getItem('pastes');
            if (ss) {
                let sp = [];
                try { sp = JSON.parse(ss) || []; } catch {}
                if (sp.length) {
                    recoveredMsg = `You have <b>${sp.length}</b> paste${sp.length > 1 ? 's' : ''} temporarily stored in this browser session.<br>
                    <a href="pages/paste.html#import" style="color:#19e3c0;font-weight:600;">Import</a> them?`;
                }
            }
        } catch (e) {}

        if (recoveredMsg) {
            const rec = document.createElement('div');
            rec.innerHTML = `<div style="margin-top:1.4em;font-size:.98em;color:#9efcfa;">${recoveredMsg}</div>`;
            msg.appendChild(rec);
        }

        container.appendChild(msg);
    }
});
