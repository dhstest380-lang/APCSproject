// Tab switching
const tabBtns = document.querySelectorAll('.tab-btn');
const authForms = document.querySelectorAll('.auth-form');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        
        // Remove active class from all tabs and forms
        tabBtns.forEach(b => b.classList.remove('active'));
        authForms.forEach(form => form.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding form
        btn.classList.add('active');
        document.getElementById(`${tabName}Form`).classList.add('active');
    });
});

// Signup form validation
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const terms = document.getElementById('terms').checked;

        // Validation
        if (!name || !email || !password) {
            showAlert('Please fill in all fields', 'error');
            return;
        }

        if (password.length < 8) {
            showAlert('Password must be at least 8 characters', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Passwords do not match', 'error');
            return;
        }

        if (!terms) {
            showAlert('You must agree to the Terms of Service', 'error');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Please enter a valid email address', 'error');
            return;
        }

        // Submit form
        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                showAlert(data.error || 'Registration failed', 'error');
                return;
            }

            showAlert(data.message, 'success');
            signupForm.reset();
            
            // Redirect to login tab after 2 seconds
            setTimeout(() => {
                tabBtns[0].click();
            }, 2000);
        } catch (error) {
            console.error('Error:', error);
            showAlert('An error occurred. Please try again.', 'error');
        }
    });
}

// Login form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            showAlert('Please fill in all fields', 'error');
            return;
        }

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                showAlert(data.error || 'Invalid email or password', 'error');
                return;
            }

            window.location.href = '/dashboard';
        } catch (error) {
            console.error('Login error:', error);
            showAlert('Unable to sign in right now. Please try again.', 'error');
        }
    });
}

// Show password toggles
const loginShowPassword = document.getElementById('login-show-password');
const signupShowPassword = document.getElementById('signup-show-password');

if (loginShowPassword) {
    loginShowPassword.addEventListener('change', () => {
        const passwordInput = document.getElementById('login-password');
        passwordInput.type = loginShowPassword.checked ? 'text' : 'password';
    });
}

if (signupShowPassword) {
    signupShowPassword.addEventListener('change', () => {
        const passwordInput = document.getElementById('signup-password');
        const confirmInput = document.getElementById('signup-confirm-password');
        const show = signupShowPassword.checked;
        passwordInput.type = show ? 'text' : 'password';
        confirmInput.type = show ? 'text' : 'password';
    });
}

// Alert helper
function showAlert(message, type = 'error') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    const authBox = document.querySelector('.auth-box');
    authBox.insertBefore(alert, authBox.firstChild);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Check for URL parameters (errors only used server-side)
window.addEventListener('load', () => {
    // Keep this event for future client-side features if needed.
});
