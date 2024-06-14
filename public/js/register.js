function validateForm() {
    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;
    var confirmPassword = document.getElementById('confirmPassword').value;

    // Check if passwords match
    if (password !== confirmPassword) {
        alert('Passwords do not match.');
        return false;
    }

    // Check if the email follows the standard syntax
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Invalid email address.');
        return false;
    }

    // Check if the password meets the criteria
    var passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(.{8,})$/;
    if (!passwordRegex.test(password)) {
        alert('Password should have at least 1 capital letter, a special symbol, and a minimum of 8 characters.');
        return false;
    }

    // TODO: Add backend check for existing email

    // If all checks pass, the form will be submitted
    return true;
}