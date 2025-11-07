document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('paste-form');
    if (!form) return;

    const titleInput = document.getElementById('paste-title');
    const contentInput = document.getElementById('paste-content');
    const categoryInput = document.getElementById('paste-category');

    // Utility: show a nice error message
    function showError(message) {
        // If there's a .form-error element, use it; otherwise, fall back to alert
        let errBox = document.querySelector('.form-error');
        if (errBox) {
            errBox.textContent = message;
            errBox.style.display = 'block';
        } else {
            alert(message);
        }
    }

    // Utility: clear error message
    function clearError() {
        let errBox = document.querySelector('.form-error');
        if (errBox) errBox.style.display = 'none';
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearError();

        const title = titleInput ? titleInput.value.trim() : '';
        const content = contentInput ? contentInput.value.trim() : '';
        const category = categoryInput ? categoryInput.value : '';

        // Validate required fields
        if (!content) {
            showError('Content cannot be empty.');
            if (contentInput) contentInput.focus();
            return;
        }
        if (!category) {
            showError('Please select a category.');
            if (categoryInput) categoryInput.focus();
            return;
        }

        // Load pastes from localStorage
        let pastes = [];
        try {
            const data = localStorage.getItem('pastes');
            if (data) pastes = JSON.parse(data) || [];
        } catch (e) {
            pastes = [];
        }

        // Generate a strong unique ID (time + random + 4-char checksum)
        function makeId() {
            const now = Date.now().toString(36);
            const rnd = Math.random().toString(36).slice(2, 10);
            const raw = now + rnd;
            // simple 4-char checksum hash
            let hash = 0;
            for (let i = 0; i < raw.length; ++i) hash = ((hash << 5) - hash) + raw.charCodeAt(i);
            let chksum = Math.abs(hash).toString(36).slice(0, 4);
            return raw + chksum;
        }

        // Create the paste object
        const paste = {
            id: makeId(),
            title: title || 'Untitled',
            content: content,
            category: category,
            date: new Date().toISOString()
        };

        // Save to localStorage (prevent accidental storing >100 pastes for performance)
        pastes.unshift(paste);
        if (pastes.length > 100) pastes = pastes.slice(0, 100);
        localStorage.setItem('pastes', JSON.stringify(pastes));

        // Optionally: Reset form before redirect (for UX on slow connections)
        form.reset();

        // Optionally: Visual feedback before redirect
        const submitBtn = form.querySelector('button[type="submit"],input[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
        }

        // Fast redirect (700ms delay for feedback or 0ms if not needed)
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 150); // short delay for perceived feedback
    });
});
