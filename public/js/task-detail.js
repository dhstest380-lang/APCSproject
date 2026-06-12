const closeTaskBtn = document.getElementById('closeTaskBtn');
const deleteTaskBtn = document.getElementById('deleteTaskBtn');
const reportTaskBtn = document.getElementById('reportTaskBtn');
const reportModal = document.getElementById('reportModal');
const closeReportModal = document.getElementById('closeReportModal');
const cancelReport = document.getElementById('cancelReport');
const submitReport = document.getElementById('submitReport');
const reportReason = document.getElementById('reportReason');
const reportDetails = document.getElementById('reportDetails');
const reportError = document.getElementById('reportError');
const reportSuccess = document.getElementById('reportSuccess');
const taskId = window.location.pathname.split('/').pop();

if (closeTaskBtn) {
    closeTaskBtn.addEventListener('click', async () => {
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
}

if (deleteTaskBtn) {
    deleteTaskBtn.addEventListener('click', async () => {
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
            window.location.href = '/my-tasks';
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    });
}

// Report button functionality
if (reportTaskBtn) {
    reportTaskBtn.addEventListener('click', () => {
        reportReason.value = '';
        reportDetails.value = '';
        reportError.style.display = 'none';
        reportSuccess.style.display = 'none';
        reportModal.classList.add('active');
    });
}

// Close modal
closeReportModal.addEventListener('click', () => {
    reportModal.classList.remove('active');
});

cancelReport.addEventListener('click', () => {
    reportModal.classList.remove('active');
});

// Close modal when clicking outside
reportModal.addEventListener('click', (e) => {
    if (e.target === reportModal) {
        reportModal.classList.remove('active');
    }
});

// Submit report
submitReport.addEventListener('click', async () => {
    if (!reportReason.value) {
        showReportError('Please select a reason');
        return;
    }

    const reason = `${reportReason.value}: ${reportDetails.value}`;

    try {
        const response = await fetch(`/api/tasks/${taskId}/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });

        const data = await response.json();

        if (!response.ok) {
            showReportError(data.error || 'Error submitting report');
            return;
        }

        showReportSuccess(data.message);
        setTimeout(() => {
            reportModal.classList.remove('active');
            location.reload();
        }, 2000);
    } catch (error) {
        console.error('Error:', error);
        showReportError('An error occurred. Please try again.');
    }
});

function showReportError(message) {
    reportError.textContent = message;
    reportError.style.display = 'block';
    reportSuccess.style.display = 'none';
}

function showReportSuccess(message) {
    reportSuccess.textContent = message;
    reportSuccess.style.display = 'block';
    reportError.style.display = 'none';
}
