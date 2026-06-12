const closeButtons = document.querySelectorAll('.btn-close');
const deleteButtons = document.querySelectorAll('.btn-delete');

// Close task
closeButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        const taskId = btn.getAttribute('data-task-id');

        if (!confirm('Are you sure you want to close this task?')) {
            return;
        }

        try {
            const response = await fetch(`/api/tasks/${taskId}/close`, {
                method: 'POST'
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Error closing task');
                return;
            }

            alert(data.message);
            window.location.reload();
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    });
});

// Delete task
deleteButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        const taskId = btn.getAttribute('data-task-id');

        if (!confirm('Are you sure you want to delete this task? This cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/tasks/${taskId}/delete`, {
                method: 'POST'
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Error deleting task');
                return;
            }

            alert(data.message);
            window.location.reload();
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    });
});
