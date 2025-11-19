
export function showError(message, loginError) {
    loginError.textContent = message;
    loginError.style.display = 'block';
}

export function hideError(loginError) {
    loginError.style.display = 'none';
}

