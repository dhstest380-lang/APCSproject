const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const taskCards = document.querySelectorAll('.task-card');
const reportBtns = document.querySelectorAll('.report-btn');
const reportModal = document.getElementById('reportModal');
const closeReportModal = document.getElementById('closeReportModal');
const cancelReport = document.getElementById('cancelReport');
const submitReport = document.getElementById('submitReport');
const reportReason = document.getElementById('reportReason');
const reportDetails = document.getElementById('reportDetails');
const reportError = document.getElementById('reportError');
const reportSuccess = document.getElementById('reportSuccess');

let currentTaskId = null;

// Search and filter tasks
function filterTasks() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;

    taskCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('.task-description').textContent.toLowerCase();
        const category = card.getAttribute('data-category');

        const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm);
        const matchesCategory = !selectedCategory || category === selectedCategory;

        if (matchesSearch && matchesCategory) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
}

searchInput.addEventListener('input', filterTasks);
categoryFilter.addEventListener('change', filterTasks);

// Report button functionality
reportBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentTaskId = btn.getAttribute('data-task-id');
        reportReason.value = '';
        reportDetails.value = '';
        reportError.style.display = 'none';
        reportSuccess.style.display = 'none';
        reportModal.classList.add('active');
    });
});

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
        const response = await fetch(`/api/tasks/${currentTaskId}/report`, {
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
