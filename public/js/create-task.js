// Get the form and alert box elements from HTML
const createTaskForm = document.getElementById('createTaskForm');
const alertBox = document.getElementById('alertBox');

// Listen for form submission
createTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page reload on submit

    // Get all form field values and trim whitespace
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const category = document.getElementById('category').value.trim();
    const pay = document.getElementById('pay').value.trim();
    const address = document.getElementById('address').value.trim();
    const peopleNeeded = document.getElementById('peopleNeeded').value.trim();

    // Validate that all required fields are filled
    if (!title || !description || !address || !peopleNeeded) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    // Validate title length
    if (title.length < 5) {
        showAlert('Title must be at least 5 characters', 'error');
        return;
    }

    // Validate description length
    if (description.length < 20) {
        showAlert('Description must be at least 20 characters', 'error');
        return;
    }

    // Validate that at least 1 person is needed
    if (parseInt(peopleNeeded) < 1) {
        showAlert('Must need at least 1 person for the task', 'error');
        return;
    }

    try {
        // Send the form data to the server via API
        const response = await fetch('/api/tasks', {
            method: 'POST', // POST request to create new task
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description,
                category: category || 'General', // Default to 'General' if empty
                pay: pay || null, // null if no pay specified
                address,
                peopleNeeded: parseInt(peopleNeeded) // Convert to number
            })
        });

        // Parse response from server
        const data = await response.json();

        // Check if request was not successful
        if (!response.ok) {
            showAlert(data.error || 'Error creating task', 'error');
            return;
        }

        // Show success message
        showAlert(data.message, 'success');
        
        // Redirect to browse page after 2 seconds
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
