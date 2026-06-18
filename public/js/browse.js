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
const claimBtns = document.querySelectorAll('.btn-claim');
const messageBadge = document.getElementById('messageBadge');

let currentTaskId = null;

// Update message badge
async function updateMessageBadge() {
    try {
        const response = await fetch('/api/messages/unread');
        const data = await response.json();
        if (data.unread_count > 0) {
            messageBadge.textContent = data.unread_count;
            messageBadge.style.display = 'inline-block';
        } else {
            messageBadge.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching unread messages:', error);
    }
}

// Load claim counts and setup claim buttons
async function setupClaimButtons() {
    for (const btn of claimBtns) {
        const taskId = btn.getAttribute('data-task-id');
        try {
            const response = await fetch(`/api/tasks/${taskId}/claims`);
            const data = await response.json();
            const claimCountSpan = btn.querySelector('.claim-count');
            claimCountSpan.textContent = `${data.current_claims}/${data.people_needed}`;
            
            // Disable if full
            if (data.current_claims >= data.people_needed) {
                btn.disabled = true;
                btn.textContent = '❌ Full';
            }
            
            // Check if user has claimed
            const claimResponse = await fetch(`/api/tasks/${taskId}/user-claim`);
            const claimData = claimResponse.json();
            claimData.then(data => {
                if (data.has_claimed) {
                    const claimLabel = btn.querySelector('.claim-label');
                    if (claimLabel) {
                        claimLabel.textContent = 'Claimed';
                    }
                    btn.disabled = true;
                }
            });
        } catch (error) {
            console.error('Error fetching claim count:', error);
        }
    }
}

// Claim task button functionality
claimBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const taskId = btn.getAttribute('data-task-id');
        
        try {
            const response = await fetch(`/api/tasks/${taskId}/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Error claiming task');
                return;
            }

            // Update button
            btn.textContent = '✓ Claimed';
            btn.disabled = true;
            
            // Update message badge
            updateMessageBadge();
            
            alert(data.message);
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    });
});

// Initialize on page load
updateMessageBadge();
setupClaimButtons();

// Refresh message badge every 30 seconds
setInterval(updateMessageBadge, 30000);

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
