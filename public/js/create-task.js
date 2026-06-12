const createTaskForm = document.getElementById('createTaskForm');
const alertBox = document.getElementById('alertBox');

createTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const category = document.getElementById('category').value.trim();
    const pay = document.getElementById('pay').value.trim();

    // Validation
    if (!title || !description) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    if (title.length < 5) {
        showAlert('Title must be at least 5 characters', 'error');
        return;
    }

    if (description.length < 20) {
        showAlert('Description must be at least 20 characters', 'error');
        return;
    }

    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description,
                category: category || 'General',
                pay: pay || null
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showAlert(data.error || 'Error creating task', 'error');
            return;
        }

        showAlert(data.message, 'success');
        
        // Redirect after 2 seconds
        setTimeout(() => {
            window.location.href = '/browse';
        }, 2000);
    } catch (error) {
        console.error('Error:', error);
        showAlert('An error occurred. Please try again.', 'error');
    }
});

function showAlert(message, type = 'error') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    alertBox.innerHTML = '';
    alertBox.appendChild(alert);

    if (type === 'success') {
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}
