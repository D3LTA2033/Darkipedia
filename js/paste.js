document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('paste-form');
    if (!form) return;

    const titleInput = document.getElementById('paste-title');
    const contentInput = document.getElementById('paste-content');
    const categoryInput = document.getElementById('paste-category');
    const errorBox = document.querySelector('.form-error');
    const submitBtn = form.querySelector('button[type="submit"],input[type="submit"]');

    // --- Utility Functions ---

    function showError(message) {
        if (errorBox) {
            errorBox.textContent = message;
            errorBox.style.display = 'block';
        } else {
            alert(message);
        }
    }

    function clearError() {
        if (errorBox) errorBox.style.display = 'none';
    }

    function getFieldValue(input) {
        return input ? input.value.trim() : '';
    }

    function focusOn(input) {
        if (input && typeof input.focus === 'function') input.focus();
    }

    // Fix API base URL
    let API_BASE;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        API_BASE = 'http://localhost:3000/api';
    } else {
        API_BASE = window.location.origin + '/api';
    }
    
    // Legacy functions kept for compatibility but not used for storage
    function getPastes() {
        return [];
    }

    function setPastes(arr) {
        // No longer needed - saving is done via API
    }

    // Generate a strong, collision-resistant unique ID.
    function makeId() {
        if (window.crypto && crypto.getRandomValues) {
            // Use cryptographically strong random values
            const array = new Uint8Array(8);
            crypto.getRandomValues(array);
            return (
                Date.now().toString(36) +
                Array.from(array).map(b => b.toString(36).padStart(2, '0')).join('') +
                Math.random().toString(36).slice(2, 6)
            );
        } else {
            // Fallback (not as strong)
            const now = Date.now().toString(36);
            const rnd = Math.random().toString(36).slice(2, 10);
            let hash = 0, raw = now + rnd;
            for (let i = 0; i < raw.length; ++i) hash = ((hash << 5) - hash) + raw.charCodeAt(i);
            let chksum = Math.abs(hash).toString(36).slice(0, 4);
            return raw + chksum;
        }
    }

    // --- Form submission handler ---
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearError();

        const title = getFieldValue(titleInput);
        const content = getFieldValue(contentInput);
        const category = categoryInput ? categoryInput.value : '';

        // Validate
        if (!content) {
            showError('Please enter some content.');
            focusOn(contentInput);
            return;
        }
        if (!category) {
            showError('Please select a category.');
            focusOn(categoryInput);
            return;
        }

        // Get current user from localStorage
        let currentUser = null;
        try {
            const userStr = localStorage.getItem('currentUser');
            if (userStr) {
                currentUser = JSON.parse(userStr);
            }
        } catch (e) {}
        
        // Prepare paste object
        const paste = {
            id: makeId(),
            title: title || 'Untitled',
            content,
            category,
            date: new Date().toISOString(),
            user_id: currentUser ? currentUser.id : null,
            role: currentUser ? currentUser.role : 'user'
        };

        // UX: Reset and disable submit during feedback
        form.reset();
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
        }

        // Fade out visual error or extra feedback if any
        if (errorBox) {
            errorBox.style.transition = "opacity 0.25s";
            errorBox.style.opacity = "0";
        }

        // Save to API
        try {
            console.log('Saving paste:', paste);
            const response = await fetch(`${API_BASE}/pastes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paste)
            });

            const responseData = await response.json().catch(() => ({ error: 'Unknown error' }));

            if (!response.ok) {
                throw new Error(responseData.error || `HTTP ${response.status}: Failed to save paste`);
            }

            console.log('Paste saved successfully:', responseData);
            
            // Redirect to home page after successful save
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 500);
        } catch (error) {
            console.error('Error saving paste:', error);
            showError(`Failed to save paste: ${error.message}. Make sure the server is running: npm start`);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Publish';
            }
        }
    });

    // Optional: Dismiss error on input (smoother UX)
    [titleInput, contentInput, categoryInput].forEach(input => {
        if (input) {
            input.addEventListener('input', clearError);
        }
    });
});
