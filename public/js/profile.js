document.addEventListener('DOMContentLoaded', () => {
    const themeSelect = document.getElementById('theme-select');
    const saveButton = document.getElementById('save-theme-btn');

    if (!themeSelect || !saveButton) return;

    const applyTheme = (theme) => {
        document.body.dataset.theme = theme;
    };

    themeSelect.addEventListener('change', () => {
        applyTheme(themeSelect.value);
    });

    saveButton.addEventListener('click', async () => {
        const theme = themeSelect.value;

        try {
            const response = await fetch('/api/profile/theme', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ theme })
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || 'Unable to save theme.');
                return;
            }

            alert('Theme saved successfully!');
        } catch (error) {
            console.error(error);
            alert('Unable to save theme. Please try again.');
        }
    });
});
