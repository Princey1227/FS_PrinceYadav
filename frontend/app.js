// Global variables
let map;
let currentUser = {
    id: 'user_123',
    username: 'SwiftFalcon2847',
    routes: [],
    matches: [],
    conversations: []
};
let markers = [];
let routePolyline;
let activeConversation = null;

// Mock data for development
const mockStudents = [
    {
        id: 'student_1',
        username: 'QuickEagle1234',
        startLocation: [19.0760, 72.8777],
        endLocation: [19.0176, 72.8562],
        departureTime: '08:30',
        overlapPercentage: 85,
        route: 'Andheri to Bandra'
    },
    {
        id: 'student_2',
        username: 'SmartTiger9876',
        startLocation: [19.0896, 72.8656],
        endLocation: [19.0144, 72.8479],
        departureTime: '08:45',
        overlapPercentage: 72,
        route: 'Jogeshwari to Kurla'
    },
    {
        id: 'student_3',
        username: 'BrightWolf4567',
        startLocation: [19.0728, 72.8826],
        endLocation: [19.0330, 72.8697],
        departureTime: '09:00',
        overlapPercentage: 68,
        route: 'Santacruz to Dadar'
    }
];

const mockMessages = {
    'student_1': [
        {
            id: 1,
            senderId: 'student_1',
            content: 'Hi! I saw we have a similar route. Are you interested in carpooling?',
            timestamp: new Date(Date.now() - 3600000),
            type: 'received'
        },
        {
            id: 2,
            senderId: 'user_123',
            content: 'Yes, that sounds great! What time do you usually leave?',
            timestamp: new Date(Date.now() - 3300000),
            type: 'sent'
        },
        {
            id: 3,
            senderId: 'student_1',
            content: 'I usually leave around 8:30 AM. We can share the fuel costs.',
            timestamp: new Date(Date.now() - 3000000),
            type: 'received'
        }
    ],
    'student_2': [
        {
            id: 4,
            senderId: 'student_2',
            content: 'Hey! Interested in sharing rides this week?',
            timestamp: new Date(Date.now() - 7200000),
            type: 'received'
        }
    ]
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadUserData();
});

function initializeApp() {
    // Set current username
    document.getElementById('currentUsername').textContent = currentUser.username;
    document.getElementById('profileUsername').textContent = currentUser.username;
    
    // Initialize map when map page is shown
    if (document.getElementById('mapPage')) {
        setTimeout(() => {
            initializeMap();
        }, 100);
    }
    
    // Load initial data
    loadMatches();
    loadConversations();
    loadUserRoutes();
    updateProfileStats();
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.getAttribute('data-page');
            showPage(page);
        });
    });

    // Message input
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    // Route input listeners
    const fromInput = document.getElementById('fromInput');
    const toInput = document.getElementById('toInput');
    
    if (fromInput && toInput) {
        fromInput.addEventListener('change', handleRouteInputChange);
        toInput.addEventListener('change', handleRouteInputChange);
    }
}

// Navigation system
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show target page
    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
    
    // Initialize page-specific content
    switch(pageId) {
        case 'map':
            setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                }
            }, 100);
            break;
        case 'matches':
            loadMatches();
            break;
        case 'messages':
            loadConversations();
            break;
        case 'profile':
            loadUserRoutes();
            updateProfileStats();
            break;
    }
}

// Map functionality
function initializeMap() {
    if (map) return;
    
    // Initialize Leaflet map centered on Mumbai
    map = L.map('map').setView([19.0760, 72.8777], 12);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    
    // Add location control
    map.on('click', function(e) {
        // Handle map clicks if needed
    });
}

function getCurrentLocation(inputType) {
    if (navigator.geolocation) {
        showLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Reverse geocoding (mock implementation)
                const address = `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
                
                if (inputType === 'from') {
                    document.getElementById('fromInput').value = address;
                } else {
                    document.getElementById('toInput').value = address;
                }
                
                showLoading(false);
                showToast('Location found successfully!', 'success');
            },
            (error) => {
                showLoading(false);
                showToast('Unable to get location. Please enter manually.', 'error');
            }
        );
    } else {
        showToast('Geolocation not supported by this browser.', 'error');
    }
}

function findRoute() {
    const fromInput = document.getElementById('fromInput').value;
    const toInput = document.getElementById('toInput').value;
    const departureTime = document.getElementById('departureTime').value;
    
    if (!fromInput || !toInput) {
        showToast('Please enter both starting location and destination.', 'warning');
        return;
    }
    
    showLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
        // Clear existing markers and routes
        clearMapData();
        
        // Add route polyline (mock)
        const routeCoordinates = [
            [19.0760, 72.8777], // Start point
            [19.0596, 72.8295], // Waypoint
            [19.0176, 72.8562]  // End point
        ];
        
        routePolyline = L.polyline(routeCoordinates, {
            color: '#667eea',
            weight: 4,
            opacity: 0.8
        }).addTo(map);
        
        // Fit map to route
        map.fitBounds(routePolyline.getBounds());
        
        // Find and display nearby students
        findNearbyStudents();
        
        showLoading(false);
        showToast('Route found! Check nearby students.', 'success');
    }, 2000);
}

function findNearbyStudents() {
    const nearbyStudents = mockStudents.filter(student => 
        student.overlapPercentage > 50
    );
    
    // Display in sidebar
    displayNearbyStudents(nearbyStudents);
    
    // Add markers to map
    nearbyStudents.forEach(student => {
        const marker = L.marker(student.startLocation)
            .addTo(map)
            .bindPopup(`
                <div class="popup-content">
                    <strong>${student.username}</strong><br>
                    Route: ${student.route}<br>
                    Time: ${student.departureTime}<br>
                    Overlap: ${student.overlapPercentage}%
                    <br><br>
                    <button class="btn btn-primary btn-sm" onclick="openStudentModal('${student.id}')">
                        View Details
                    </button>
                </div>
            `);
        
        markers.push(marker);
    });
}

function displayNearbyStudents(students) {
    const container = document.getElementById('nearbyStudents');
    const list = document.getElementById('studentsList');
    
    if (students.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    list.innerHTML = '';
    
    students.forEach(student => {
        const studentElement = document.createElement('div');
        studentElement.className = 'student-item';
        studentElement.onclick = () => openStudentModal(student.id);
        
        studentElement.innerHTML = `
            <div class="student-info">
                <div>
                    <div class="student-name">${student.username}</div>
                    <div class="student-route">${student.route}</div>
                    <div class="student-time">Departs: ${student.departureTime}</div>
                </div>
                <div class="overlap-badge">${student.overlapPercentage}%</div>
            </div>
        `;
        
        list.appendChild(studentElement);
    });
}

function clearMapData() {
    // Remove existing markers
    markers.forEach(marker => {
        map.removeLayer(marker);
    });
    markers = [];
    
    // Remove existing route
    if (routePolyline) {
        map.removeLayer(routePolyline);
    }
}

function centerMap() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            map.setView([lat, lng], 15);
        });
    }
}

function toggleFullscreen() {
    const mapElement = document.getElementById('map');
    if (!document.fullscreenElement) {
        mapElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// Student modal functionality
function openStudentModal(studentId) {
    const student = mockStudents.find(s => s.id === studentId);
    if (!student) return;
    
    const modal = document.getElementById('studentModal');
    const title = document.getElementById('studentModalTitle');
    const body = document.getElementById('studentModalBody');
    const chatButton = document.getElementById('chatButton');
    
    title.textContent = `${student.username} - Route Details`;
    
    body.innerHTML = `
        <div class="student-modal-info">
            <div class="info-item">
                <span class="info-label">Username:</span>
                <span class="info-value">${student.username}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Route:</span>
                <span class="info-value">${student.route}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Departure Time:</span>
                <span class="info-value">${student.departureTime}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Route Overlap:</span>
                <span class="info-value">${student.overlapPercentage}%</span>
            </div>
            <div class="info-item">
                <span class="info-label">Estimated Savings:</span>
                <span class="info-value">₹150-200 per week</span>
            </div>
        </div>
    `;
    
    chatButton.onclick = () => {
        closeStudentModal();
        startChat(studentId);
    };
    
    modal.classList.add('show');
}

function closeStudentModal() {
    const modal = document.getElementById('studentModal');
    modal.classList.remove('show');
}

// Matches page functionality
function loadMatches() {
    const container = document.getElementById('matchesGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    mockStudents.forEach(student => {
        const matchCard = document.createElement('div');
        matchCard.className = 'match-card';
        
        matchCard.innerHTML = `
            <div class="match-header">
                <div class="match-username">${student.username}</div>
                <div class="overlap-badge">${student.overlapPercentage}%</div>
            </div>
            <div class="match-details">
                <div class="match-route">
                    <i class="fas fa-route"></i> ${student.route}
                </div>
                <div class="match-time">
                    <i class="fas fa-clock"></i> Departs at ${student.departureTime}
                </div>
            </div>
            <div class="match-actions">
                <button class="btn btn-primary btn-sm" onclick="startChat('${student.id}')">
                    <i class="fas fa-comments"></i> Chat
                </button>
                <button class="btn btn-secondary btn-sm" onclick="viewOnMap('${student.id}')">
                    <i class="fas fa-map"></i> View Route
                </button>
            </div>
        `;
        
        container.appendChild(matchCard);
    });
}

function refreshMatches() {
    showToast('Refreshing matches...', 'info');
    setTimeout(() => {
        loadMatches();
        showToast('Matches updated!', 'success');
    }, 1000);
}

function viewOnMap(studentId) {
    showPage('map');
    setTimeout(() => {
        openStudentModal(studentId);
    }, 500);
}

// Messages functionality
function loadConversations() {
    const container = document.getElementById('conversationsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(mockMessages).forEach(studentId => {
        const student = mockStudents.find(s => s.id === studentId);
        const messages = mockMessages[studentId];
        const lastMessage = messages[messages.length - 1];
        
        const conversationElement = document.createElement('div');
        conversationElement.className = 'conversation-item';
        conversationElement.onclick = () => openConversation(studentId);
        
        conversationElement.innerHTML = `
            <div class="conversation-info">
                <div class="conversation-name">${student.username}</div>
                <div class="conversation-time">${formatTime(lastMessage.timestamp)}</div>
            </div>
            <div class="conversation-preview">
                ${lastMessage.content.substring(0, 50)}${lastMessage.content.length > 50 ? '...' : ''}
            </div>
        `;
        
        container.appendChild(conversationElement);
    });
}

function openConversation(studentId) {
    const student = mockStudents.find(s => s.id === studentId);
    const messages = mockMessages[studentId] || [];
    
    activeConversation = studentId;
    
    // Update conversation list active state
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.conversation-item').classList.add('active');
    
    // Hide placeholder and show chat
    document.getElementById('chatPlaceholder').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'flex';
    
    // Update chat header
    const chatHeader = document.getElementById('chatHeader');
    chatHeader.innerHTML = `
        <div class="chat-user-info">
            <div class="chat-avatar">${student.username.charAt(0)}</div>
            <div class="chat-user-details">
                <h4>${student.username}</h4>
                <div class="chat-user-route">${student.route}</div>
            </div>
        </div>
    `;
    
    // Load messages
    loadMessages(messages);
}

function loadMessages(messages) {
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.innerHTML = '';
    
    messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.type}`;
        
        messageElement.innerHTML = `
            <div class="message-content">${message.content}</div>
            <div class="message-time">${formatTime(message.timestamp)}</div>
        `;
        
        messagesArea.appendChild(messageElement);
    });
    
    // Scroll to bottom
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function startChat(studentId) {
    showPage('messages');
    setTimeout(() => {
        openConversation(studentId);
    }, 100);
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content || !activeConversation) return;
    
    const message = {
        id: Date.now(),
        senderId: currentUser.id,
        content: content,
        timestamp: new Date(),
        type: 'sent'
    };
    
    // Add to mock messages
    if (!mockMessages[activeConversation]) {
        mockMessages[activeConversation] = [];
    }
    mockMessages[activeConversation].push(message);
    
    // Clear input
    input.value = '';
    
    // Reload messages
    loadMessages(mockMessages[activeConversation]);
    
    // Simulate response (in real app, this would come from WebSocket)
    setTimeout(() => {
        const response = {
            id: Date.now(),
            senderId: activeConversation,
            content: generateAutoResponse(),
            timestamp: new Date(),
            type: 'received'
        };
        
        mockMessages[activeConversation].push(response);
        loadMessages(mockMessages[activeConversation]);
        
        // Update conversations list
        loadConversations();
    }, 2000);
}

function generateAutoResponse() {
    const responses = [
        "That sounds good! Let me know what you think.",
        "Sure, I'm flexible with the timing.",
        "Great! Looking forward to sharing the ride.",
        "Let's coordinate our schedules.",
        "Perfect! This will help save money for both of us."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// Profile page functionality
function loadUserRoutes() {
    const container = document.getElementById('userRoutes');
    if (!container) return;
    
    const mockRoutes = [
        {
            id: 1,
            path: 'Andheri West → Bandra Kurla Complex',
            time: '8:30 AM - 9:15 AM',
            status: 'active'
        },
        {
            id: 2,
            path: 'BKC → Andheri West',
            time: '6:30 PM - 7:15 PM',
            status: 'active'
        },
        {
            id: 3,
            path: 'Powai → Worli',
            time: '9:00 AM - 10:00 AM',
            status: 'inactive'
        }
    ];
    
    container.innerHTML = '';
    
    mockRoutes.forEach(route => {
        const routeElement = document.createElement('div');
        routeElement.className = 'route-item';
        
        routeElement.innerHTML = `
            <div class="route-details">
                <div class="route-path">${route.path}</div>
                <div class="route-time">${route.time}</div>
            </div>
            <div class="route-status ${route.status}">${route.status}</div>
        `;
        
        container.appendChild(routeElement);
    });
}

function updateProfileStats() {
    // Update stats with mock data
    const stats = {
        totalRides: Math.floor(Math.random() * 50) + 10,
        moneySaved: Math.floor(Math.random() * 5000) + 1000,
        co2Saved: Math.floor(Math.random() * 100) + 20,
        activeMatches: Math.floor(Math.random() * 15) + 5
    };
    
    document.getElementById('totalRides').textContent = stats.totalRides;
    document.getElementById('moneySaved').textContent = `₹${stats.moneySaved.toLocaleString()}`;
    document.getElementById('co2Saved').textContent = `${stats.co2Saved} kg`;
    document.getElementById('activeMatches').textContent = stats.activeMatches;
}

// Utility functions
function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString();
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const toastId = Date.now();
    toast.innerHTML = `
        <div class="toast-header">
            <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="toast-close" onclick="closeToast(${toastId})">&times;</div>
        </div>
        <div class="toast-message">${message}</div>
    `;
    
    toast.id = `toast_${toastId}`;
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        closeToast(toastId);
    }, 5000);
}

function closeToast(toastId) {
    const toast = document.getElementById(`toast_${toastId}`);
    if (toast) {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

function loadUserData() {
    // Simulate loading user data from API
    setTimeout(() => {
        showToast('Welcome back, ' + currentUser.username + '!', 'success');
    }, 1000);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        showToast('Logging out...', 'info');
        setTimeout(() => {
            // In real app, redirect to login page
            window.location.reload();
        }, 1500);
    }
}

// Route input change handler
function handleRouteInputChange() {
    const fromInput = document.getElementById('fromInput').value;
    const toInput = document.getElementById('toInput').value;
    
    if (fromInput && toInput) {
        // Auto-suggest departure time based on common patterns
        const departureInput = document.getElementById('departureTime');
        if (!departureInput.value) {
            departureInput.value = '08:00';
        }
    }
}

// Geolocation and route calculation functions
function calculateRouteDistance(route1, route2) {
    // Mock implementation - in real app, use proper geospatial calculations
    return Math.random() * 100;
}

function calculateOverlapPercentage(userRoute, otherRoute) {
    // Mock implementation - in real app, use proper route analysis
    return Math.floor(Math.random() * 40) + 60;
}

function geocodeAddress(address) {
    // Mock implementation - in real app, use geocoding service
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([19.0760 + Math.random() * 0.1, 72.8777 + Math.random() * 0.1]);
        }, 500);
    });
}

// Search and filter functions
function filterMatches() {
    const filter = document.getElementById('matchFilter').value;
    const matchCards = document.querySelectorAll('.match-card');
    
    matchCards.forEach(card => {
        const overlapText = card.querySelector('.overlap-badge').textContent;
        const overlapPercentage = parseInt(overlapText);
        
        let show = true;
        
        switch(filter) {
            case 'high':
                show = overlapPercentage > 70;
                break;
            case 'medium':
                show = overlapPercentage >= 40 && overlapPercentage <= 70;
                break;
            case 'recent':
                // Mock recent filter
                show = Math.random() > 0.5;
                break;
            default:
                show = true;
        }
        
        card.style.display = show ? 'block' : 'none';
    });
}

// Settings handlers
function toggleSetting(settingId) {
    const checkbox = document.getElementById(settingId);
    const isEnabled = checkbox.checked;
    
    let message = '';
    switch(settingId) {
        case 'locationSharing':
            message = `Location sharing ${isEnabled ? 'enabled' : 'disabled'}`;
            break;
        case 'messageNotifications':
            message = `Message notifications ${isEnabled ? 'enabled' : 'disabled'}`;
            break;
        case 'matchAlerts':
            message = `Route match alerts ${isEnabled ? 'enabled' : 'disabled'}`;
            break;
    }
    
    showToast(message, 'success');
}

// Event listeners for settings
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for toggle switches
    ['locationSharing', 'messageNotifications', 'matchAlerts'].forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', () => toggleSetting(id));
        }
    });
    
    // Add event listener for match filter
    const matchFilter = document.getElementById('matchFilter');
    if (matchFilter) {
        matchFilter.addEventListener('change', filterMatches);
    }
});

// Real-time simulation functions
function simulateRealTimeUpdates() {
    setInterval(() => {
        // Simulate new match notifications
        if (Math.random() > 0.95) {
            showToast('New route match found!', 'success');
        }
        
        // Simulate location updates
        if (Math.random() > 0.98) {
            updateUserLocation();
        }
    }, 5000);
}

function updateUserLocation() {
    // Mock location update
    const newLocation = [
        19.0760 + (Math.random() - 0.5) * 0.01,
        72.8777 + (Math.random() - 0.5) * 0.01
    ];
    
    // Update map if active
    if (map && markers.length > 0) {
        // Update user marker position
        console.log('Location updated:', newLocation);
    }
}

// Offline support functions
function checkOnlineStatus() {
    if (navigator.onLine) {
        showToast('Connection restored', 'success');
    } else {
        showToast('Working offline - some features may be limited', 'warning');
    }
}

window.addEventListener('online', () => checkOnlineStatus());
window.addEventListener('offline', () => checkOnlineStatus());

// Performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize real-time updates when app loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        simulateRealTimeUpdates();
    }, 3000);
});

// Export functions for global access
window.showPage = showPage;
window.getCurrentLocation = getCurrentLocation;
window.findRoute = findRoute;
window.centerMap = centerMap;
window.toggleFullscreen = toggleFullscreen;
window.openStudentModal = openStudentModal;
window.closeStudentModal = closeStudentModal;
window.startChat = startChat;
window.sendMessage = sendMessage;
window.refreshMatches = refreshMatches;
window.viewOnMap = viewOnMap;
window.logout = logout;
window.closeToast = closeToast;