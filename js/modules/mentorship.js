// Mentorship Module - Handles mentor-mentee connections
class MentorshipModule {
    constructor() {
        this.mentors = [];
        this.filteredMentors = [];
        this.currentExpertise = 'all';
        this.searchQuery = '';
        this.connections = [];
        this.isMentor = false;
        this.mentorProfile = null;
        this.mentorRequests = [];
        this.unsubscribeMentorRequests = null;
    }

    async init() {
        this.bindEvents();
        await this.loadMentors();
        this.loadConnections();
        await this.checkMentorStatus();
    }

    async loadMentors() {
        try {
            const firebaseMentors = await window.firebaseService.getMentors();
            this.mentors = [...firebaseMentors];
            this.filteredMentors = [...this.mentors];
            this.renderMentorsGrid();
        } catch (error) {
            console.error('Error loading mentors:', error);
            this.mentors = [];
            this.filteredMentors = [];
            this.renderMentorsGrid();
        }
    }

    async loadConnections() {
        if (!window.firebaseService.currentUser) {
            this.updateConnectionsUI([]);
            return;
        }

        try {
            const requests = await window.firebaseService.getMentorshipRequests(
                window.firebaseService.currentUser.uid
            );
            this.connections = requests;
            this.updateConnectionsUI(requests);
        } catch (error) {
            console.error('Error loading connections:', error);
            this.updateConnectionsUI([]);
        }
    }

    updateConnectionsUI(connections) {
        const mentorsContainer = document.getElementById('my-mentors-list');
        const pendingContainer = document.getElementById('pending-requests-list');
        
        if (!window.firebaseService.currentUser) {
            if (mentorsContainer) mentorsContainer.innerHTML = '<p class="empty-state">Sign in to see your mentors</p>';
            if (pendingContainer) pendingContainer.innerHTML = '<p class="empty-state">Sign in to see pending requests</p>';
            return;
        }

        // Filter by status
        const acceptedMentors = connections.filter(c => c.status === 'accepted');
        const pendingRequests = connections.filter(c => c.status === 'pending');

        // Render accepted mentors (My Mentors)
        if (mentorsContainer) {
            if (acceptedMentors.length === 0) {
                mentorsContainer.innerHTML = '<p class="empty-state">No mentors yet. Connect with mentors above!</p>';
            } else {
                mentorsContainer.innerHTML = acceptedMentors.map(conn => {
                    const mentor = this.mentors.find(m => m.id === conn.mentorId);
                    return `
                        <div class="connection-item accepted" data-mentor-id="${conn.mentorId}">
                            <div class="connection-avatar">
                                ${mentor?.photoURL 
                                    ? `<img src="${mentor.photoURL}" alt="${mentor?.name}">`
                                    : `<span class="material-icons">person</span>`
                                }
                            </div>
                            <div class="connection-info">
                                <h5>${mentor?.name || 'Mentor'}</h5>
                                <p class="connection-title">${mentor?.title || ''}</p>
                                <span class="connection-badge accepted">
                                    <span class="material-icons">check_circle</span> Connected
                                </span>
                            </div>
                            <button class="btn btn-icon btn-sm message-mentor-btn" data-mentor-id="${conn.mentorId}" title="Message">
                                <span class="material-icons">chat</span>
                            </button>
                        </div>
                    `;
                }).join('');
                
                // Add message button handlers
                mentorsContainer.querySelectorAll('.message-mentor-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const mentorId = btn.dataset.mentorId;
                        const mentor = this.mentors.find(m => m.id === mentorId);
                        if (mentor) {
                            window.chatModule?.startChat({
                                id: mentorId,
                                name: mentor.name,
                                photoURL: mentor.photoURL
                            });
                        }
                    });
                });
            }
        }

        // Render pending requests
        if (pendingContainer) {
            if (pendingRequests.length === 0) {
                pendingContainer.innerHTML = '<p class="empty-state">No pending requests</p>';
            } else {
                pendingContainer.innerHTML = pendingRequests.map(conn => {
                    const mentor = this.mentors.find(m => m.id === conn.mentorId);
                    const timeAgo = this.getTimeAgo(conn.createdAt?.toDate?.() || new Date());
                    return `
                        <div class="connection-item pending" data-mentor-id="${conn.mentorId}">
                            <div class="connection-avatar">
                                ${mentor?.photoURL 
                                    ? `<img src="${mentor.photoURL}" alt="${mentor?.name}">`
                                    : `<span class="material-icons">person</span>`
                                }
                            </div>
                            <div class="connection-info">
                                <h5>${mentor?.name || 'Mentor'}</h5>
                                <p class="connection-title">${mentor?.title || ''}</p>
                                <span class="connection-badge pending">
                                    <span class="material-icons">schedule</span> Pending • ${timeAgo}
                                </span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
        return 'Just now';
    }

    bindEvents() {
        // Search input
        const searchInput = document.getElementById('mentor-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        // Expertise filter chips
        document.querySelectorAll('[data-expertise]').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('[data-expertise]').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.currentExpertise = chip.dataset.expertise;
                this.applyFilters();
            });
        });

        // Become mentor button
        document.getElementById('become-mentor-btn')?.addEventListener('click', () => {
            if (!window.firebaseService.currentUser) {
                window.app.showToast('Please sign in to become a mentor', 'warning');
                window.app.openModal('auth-modal');
                return;
            }
            window.app.openModal('mentor-modal');
        });

        // Mentor registration form
        document.getElementById('mentor-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.registerAsMentor(e.target);
        });

        // Mentorship request form
        document.getElementById('request-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitMentorshipRequest(e.target);
        });

        // Mentor dashboard button
        document.getElementById('open-dashboard-btn')?.addEventListener('click', () => {
            this.openMentorDashboard();
        });

        // Dashboard tabs
        document.querySelectorAll('.dashboard-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.switchDashboardTab(tab.dataset.tab);
            });
        });

        // Listen for auth state changes
        window.addEventListener('authStateChanged', async (e) => {
            if (e.detail.user) {
                await this.checkMentorStatus();
                this.loadConnections();
            } else {
                this.isMentor = false;
                this.mentorProfile = null;
                this.updateMentorUI();
                if (this.unsubscribeMentorRequests) {
                    this.unsubscribeMentorRequests();
                    this.unsubscribeMentorRequests = null;
                }
            }
        });
    }

    // Check if current user is a mentor
    async checkMentorStatus() {
        if (!window.firebaseService.currentUser) {
            this.isMentor = false;
            this.mentorProfile = null;
            this.updateMentorUI();
            return;
        }

        try {
            const mentorData = await window.firebaseService.checkIfMentor(
                window.firebaseService.currentUser.uid
            );
            
            this.isMentor = !!mentorData;
            this.mentorProfile = mentorData;
            this.updateMentorUI();

            if (this.isMentor) {
                this.loadMentorRequests();
            }
        } catch (error) {
            console.error('Error checking mentor status:', error);
            this.isMentor = false;
            this.updateMentorUI();
        }
    }

    // Update UI based on mentor status
    updateMentorUI() {
        const becomeCard = document.getElementById('become-mentor-card');
        const dashboardCard = document.getElementById('mentor-dashboard-card');

        if (this.isMentor) {
            becomeCard?.classList.add('hidden');
            dashboardCard?.classList.remove('hidden');
        } else {
            becomeCard?.classList.remove('hidden');
            dashboardCard?.classList.add('hidden');
        }
    }

    // Load mentor requests
    async loadMentorRequests() {
        if (!this.isMentor || !window.firebaseService.currentUser) return;

        try {
            // Set up real-time listener
            if (this.unsubscribeMentorRequests) {
                this.unsubscribeMentorRequests();
            }

            this.unsubscribeMentorRequests = window.firebaseService.onMentorRequestsUpdate(
                window.firebaseService.currentUser.uid,
                (requests) => {
                    this.mentorRequests = requests;
                    this.updateDashboardStats();
                    this.renderDashboardRequests();
                }
            );
        } catch (error) {
            console.error('Error loading mentor requests:', error);
        }
    }

    // Update dashboard stats
    updateDashboardStats() {
        const pendingCount = this.mentorRequests.filter(r => r.status === 'pending').length;
        const acceptedCount = this.mentorRequests.filter(r => r.status === 'accepted').length;

        const pendingEl = document.getElementById('pending-count');
        const acceptedEl = document.getElementById('accepted-count');

        if (pendingEl) pendingEl.textContent = pendingCount;
        if (acceptedEl) acceptedEl.textContent = acceptedCount;
    }

    // Open mentor dashboard modal
    openMentorDashboard() {
        window.app.openModal('mentor-dashboard-modal');
        this.renderDashboardRequests();
    }

    // Switch dashboard tab
    switchDashboardTab(tab) {
        document.querySelectorAll('.requests-list').forEach(list => {
            list.classList.remove('active');
        });
        document.getElementById(`${tab}-requests`)?.classList.add('active');
    }

    // Render dashboard requests
    renderDashboardRequests() {
        const pendingContainer = document.getElementById('pending-requests');
        const acceptedContainer = document.getElementById('accepted-requests');
        const declinedContainer = document.getElementById('declined-requests');

        const pendingRequests = this.mentorRequests.filter(r => r.status === 'pending');
        const acceptedRequests = this.mentorRequests.filter(r => r.status === 'accepted');
        const declinedRequests = this.mentorRequests.filter(r => r.status === 'declined');

        // Render pending requests
        if (pendingContainer) {
            if (pendingRequests.length === 0) {
                pendingContainer.innerHTML = '<p class="empty-state">No pending requests</p>';
            } else {
                pendingContainer.innerHTML = pendingRequests.map(req => this.renderRequestCard(req, 'pending')).join('');
                this.bindRequestActions(pendingContainer);
            }
        }

        // Render accepted requests
        if (acceptedContainer) {
            if (acceptedRequests.length === 0) {
                acceptedContainer.innerHTML = '<p class="empty-state">No accepted students yet</p>';
            } else {
                acceptedContainer.innerHTML = `
                    <div class="accepted-students-header">
                        <h4><span class="material-icons">people</span> Your Connected Students (${acceptedRequests.length})</h4>
                    </div>
                    ${acceptedRequests.map(req => this.renderStudentCard(req, 'accepted')).join('')}
                `;
                // Add message handlers for accepted students
                acceptedContainer.querySelectorAll('.message-student-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const req = acceptedRequests.find(r => r.id === btn.dataset.requestId);
                        if (req) {
                            window.app.closeModal('mentor-dashboard-modal');
                            window.chatModule?.startChat({
                                id: req.menteeId,
                                name: req.menteeName || 'Student',
                                photoURL: null
                            });
                        }
                    });
                });
            }
        }

        // Render declined requests
        if (declinedContainer) {
            if (declinedRequests.length === 0) {
                declinedContainer.innerHTML = '<p class="empty-state">No declined requests</p>';
            } else {
                declinedContainer.innerHTML = declinedRequests.map(req => this.renderStudentCard(req, 'declined')).join('');
            }
        }
    }

    // Render student card for mentor dashboard (for accepted/declined)
    renderStudentCard(request, status) {
        const date = request.createdAt?.toDate ? 
            request.createdAt.toDate().toLocaleDateString() : 
            'Recently';
        
        const messageButton = status === 'accepted' ? `
            <button class="btn btn-primary btn-sm message-student-btn" data-request-id="${request.id}">
                <span class="material-icons">chat</span> Message
            </button>
        ` : '';

        return `
            <div class="student-card ${status}" data-id="${request.id}">
                <div class="student-avatar">
                    <span class="material-icons">person</span>
                </div>
                <div class="student-info">
                    <h4>${request.menteeName || 'Student'}</h4>
                    <p class="student-email">${request.menteeEmail || ''}</p>
                    <p class="student-date">
                        <span class="material-icons">event</span> Connected on ${date}
                    </p>
                </div>
                ${messageButton}
            </div>
        `;
    }

    // Render a single request card
    renderRequestCard(request, status) {
        const date = request.createdAt?.toDate ? 
            request.createdAt.toDate().toLocaleDateString() : 
            'Recently';
        
        const actionButtons = status === 'pending' ? `
            <div class="request-actions">
                <button class="btn btn-primary accept-btn" data-request-id="${request.id}">
                    <span class="material-icons">check</span> Accept
                </button>
                <button class="btn btn-outline decline-btn" data-request-id="${request.id}">
                    <span class="material-icons">close</span> Decline
                </button>
            </div>
        ` : '';

        const statusBadge = status !== 'pending' ? `
            <span class="status-badge ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
        ` : '';

        return `
            <div class="request-card" data-id="${request.id}">
                <div class="request-header">
                    <div class="request-avatar">
                        <span class="material-icons">person</span>
                    </div>
                    <div class="request-info">
                        <h4>${request.menteeName || 'Student'}</h4>
                        <p class="request-email">${request.menteeEmail || ''}</p>
                        <p class="request-date">
                            <span class="material-icons">schedule</span>
                            ${date}
                        </p>
                    </div>
                    ${statusBadge}
                </div>
                <div class="request-message">
                    <h5>Message:</h5>
                    <p>${request.message || 'No message provided'}</p>
                </div>
                ${actionButtons}
            </div>
        `;
    }

    // Bind accept/decline button actions
    bindRequestActions(container) {
        container.querySelectorAll('.accept-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.handleRequestAction(btn.dataset.requestId, 'accepted');
            });
        });

        container.querySelectorAll('.decline-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.handleRequestAction(btn.dataset.requestId, 'declined');
            });
        });
    }

    // Handle accept/decline action
    async handleRequestAction(requestId, status) {
        try {
            const request = this.mentorRequests.find(r => r.id === requestId);
            await window.firebaseService.updateMentorshipRequestStatus(requestId, status);

            // Send notification to the student
            if (request && request.menteeId) {
                const mentorName = this.mentorProfile?.name || window.firebaseService.currentUser?.displayName || 'A mentor';
                if (status === 'accepted') {
                    await window.app.createNotification(
                        request.menteeId,
                        'mentorship_accepted',
                        '🎉 Mentorship Request Accepted!',
                        `Great news! ${mentorName} has accepted your mentorship request. You can now message them directly!`,
                        '#mentorship'
                    );
                } else {
                    await window.app.createNotification(
                        request.menteeId,
                        'mentorship_declined',
                        'Mentorship Request Update',
                        `${mentorName} is unable to accept your request at this time. Feel free to connect with other mentors!`,
                        '#mentorship'
                    );
                }
            }

            window.app.showToast(
                status === 'accepted' ? 'Request accepted!' : 'Request declined',
                status === 'accepted' ? 'success' : 'info'
            );
        } catch (error) {
            console.error('Error updating request:', error);
            window.app.showToast('Failed to update request', 'error');
        }
    }

    applyFilters() {
        this.filteredMentors = this.mentors.filter(mentor => {
            // Expertise filter
            if (this.currentExpertise !== 'all') {
                if (!mentor.expertise || !mentor.expertise.includes(this.currentExpertise)) {
                    return false;
                }
            }

            // Search filter
            if (this.searchQuery) {
                const searchableText = `
                    ${mentor.name} 
                    ${mentor.title} 
                    ${mentor.bio} 
                    ${(mentor.skills || []).join(' ')}
                `.toLowerCase();
                
                if (!searchableText.includes(this.searchQuery)) {
                    return false;
                }
            }

            return true;
        });

        this.renderMentorsGrid();
    }

    renderMentorsGrid() {
        const container = document.getElementById('mentors-grid');
        if (!container) return;

        if (this.filteredMentors.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <span class="material-icons">person_search</span>
                    <p>No mentors match your search</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredMentors.map(mentor => this.renderMentorCard(mentor)).join('');

        // Add event listeners
        container.querySelectorAll('.connect-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openRequestModal(btn.dataset.mentorId);
            });
        });

        container.querySelectorAll('.view-profile-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewMentorProfile(btn.dataset.mentorId);
            });
        });
    }

    renderMentorCard(mentor) {
        const initials = mentor.name.split(' ').map(n => n[0]).join('');
        
        return `
            <div class="mentor-card" data-id="${mentor.id}">
                <div class="mentor-header">
                    <div class="mentor-avatar">
                        ${mentor.photoURL 
                            ? `<img src="${mentor.photoURL}" alt="${mentor.name}">`
                            : `<span class="material-icons">person</span>`
                        }
                    </div>
                    <div class="mentor-info">
                        <h4>${mentor.name}</h4>
                        <p class="mentor-title">${mentor.title}</p>
                        <div class="mentor-rating">
                            <span class="material-icons">star</span>
                            <span>${mentor.rating.toFixed(1)}</span>
                            <span style="color: var(--text-tertiary);">(${mentor.reviewCount} reviews)</span>
                        </div>
                    </div>
                </div>
                <p class="mentor-bio">${mentor.bio}</p>
                <div class="mentor-expertise">
                    ${(mentor.skills || []).slice(0, 4).map(skill => 
                        `<span class="expertise-tag">${skill}</span>`
                    ).join('')}
                </div>
                <div class="mentor-footer">
                    <span class="availability-badge ${mentor.isAvailable ? '' : 'unavailable'}">
                        ${mentor.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                    <button class="btn btn-outline view-profile-btn" data-mentor-id="${mentor.id}">
                        View Profile
                    </button>
                    <button class="btn btn-primary connect-btn" data-mentor-id="${mentor.id}" 
                            ${!mentor.isAvailable ? 'disabled' : ''}>
                        Connect
                    </button>
                </div>
            </div>
        `;
    }

    openRequestModal(mentorId) {
        if (!window.firebaseService.currentUser) {
            window.app.showToast('Please sign in to connect with mentors', 'warning');
            window.app.openModal('auth-modal');
            return;
        }

        const mentor = this.mentors.find(m => m.id === mentorId);
        if (!mentor) return;

        // Populate modal with mentor info
        const preview = document.getElementById('mentor-preview');
        if (preview) {
            preview.innerHTML = `
                <div class="mentor-avatar">
                    ${mentor.photoURL 
                        ? `<img src="${mentor.photoURL}" alt="${mentor.name}">`
                        : `<span class="material-icons">person</span>`
                    }
                </div>
                <div class="mentor-info">
                    <h4>${mentor.name}</h4>
                    <p class="mentor-title">${mentor.title}</p>
                </div>
            `;
        }

        document.getElementById('request-mentor-id').value = mentorId;
        window.app.openModal('request-modal');
    }

    viewMentorProfile(mentorId) {
        const mentor = this.mentors.find(m => m.id === mentorId);
        if (!mentor) return;

        // Populate profile modal
        const profileAvatar = document.querySelector('#profile-modal .profile-avatar');
        if (profileAvatar) {
            profileAvatar.innerHTML = mentor.photoURL 
                ? `<img src="${mentor.photoURL}" alt="${mentor.name}">`
                : `<span class="material-icons">person</span>`;
        }

        document.getElementById('profile-name').textContent = mentor.name;
        document.getElementById('profile-title').textContent = mentor.title;
        document.getElementById('profile-rating').textContent = mentor.rating?.toFixed(1) || '0.0';
        document.getElementById('profile-reviews').textContent = `(${mentor.reviewCount || 0} reviews)`;
        document.getElementById('profile-bio').textContent = mentor.bio || 'No bio provided.';
        
        // Availability badge
        const availBadge = document.getElementById('profile-availability');
        if (availBadge) {
            availBadge.textContent = mentor.isAvailable ? 'Available' : 'Unavailable';
            availBadge.className = `availability-badge ${mentor.isAvailable ? '' : 'unavailable'}`;
        }

        // Availability text
        const availText = document.getElementById('profile-availability-text');
        if (availText) {
            const availMap = {
                'weekdays': 'Weekdays',
                'weekends': 'Weekends',
                'evenings': 'Evenings Only',
                'flexible': 'Flexible Schedule'
            };
            availText.textContent = availMap[mentor.availability] || mentor.availability || 'Flexible';
        }

        // Skills
        const skillsContainer = document.getElementById('profile-skills');
        if (skillsContainer) {
            skillsContainer.innerHTML = (mentor.skills || []).map(skill => 
                `<span class="expertise-tag">${skill}</span>`
            ).join('');
        }

        // LinkedIn
        const linkedInSection = document.getElementById('profile-linkedin-section');
        const linkedInLink = document.getElementById('profile-linkedin');
        if (mentor.linkedIn) {
            linkedInSection?.classList.remove('hidden');
            if (linkedInLink) linkedInLink.href = mentor.linkedIn;
        } else {
            linkedInSection?.classList.add('hidden');
        }

        // Message button
        const messageBtn = document.getElementById('profile-message-btn');
        if (messageBtn) {
            messageBtn.dataset.mentorId = mentorId;
            messageBtn.onclick = () => {
                window.app.closeModal('profile-modal');
                // Start chat with mentor
                window.chatModule?.startChat({
                    id: mentorId,
                    name: mentor.name,
                    photoURL: mentor.photoURL
                });
            };
        }

        // Connect button
        const connectBtn = document.getElementById('profile-connect-btn');
        if (connectBtn) {
            connectBtn.dataset.mentorId = mentorId;
            connectBtn.disabled = !mentor.isAvailable;
            connectBtn.onclick = () => {
                window.app.closeModal('profile-modal');
                this.openRequestModal(mentorId);
            };
        }

        window.app.openModal('profile-modal');
    }

    async registerAsMentor(form) {
        const mentorData = {
            name: window.firebaseService.currentUser.displayName,
            title: document.getElementById('mentor-title').value,
            bio: document.getElementById('mentor-bio').value,
            expertise: document.getElementById('mentor-expertise').value
                .split(',')
                .map(e => e.trim().toLowerCase()),
            skills: document.getElementById('mentor-expertise').value
                .split(',')
                .map(e => e.trim()),
            linkedIn: document.getElementById('mentor-linkedin').value,
            availability: document.getElementById('mentor-availability').value,
            photoURL: window.firebaseService.currentUser.photoURL
        };

        try {
            await window.firebaseService.registerAsMentor(mentorData);
            
            // Add mentor role to user profile
            if (window.firebaseService.currentUser) {
                await window.firebaseService.addMentorRole(
                    window.firebaseService.currentUser.uid
                );
            }
            
            window.app.closeModal('mentor-modal');
            window.app.showToast('You are now registered as a mentor! 🎉', 'success');
            form.reset();
            await this.loadMentors();
            // Update mentor status to show dashboard
            await this.checkMentorStatus();
            // Update user roles display
            window.app.updateUserRoles();
        } catch (error) {
            console.error('Error registering as mentor:', error);
            window.app.showToast('Failed to register as mentor', 'error');
        }
    }

    async submitMentorshipRequest(form) {
        const mentorId = document.getElementById('request-mentor-id').value;
        const message = document.getElementById('request-message').value;
        const goals = document.getElementById('request-goals').value;
        const mentor = this.mentors.find(m => m.id === mentorId);

        try {
            await window.firebaseService.requestMentorship(mentorId, `${message}\n\nGoals: ${goals}`);
            
            // Send notification to mentor (use mentor's userId if available, otherwise mentorId)
            const mentorUserId = mentor?.userId || mentorId;
            if (mentorUserId) {
                const userName = window.firebaseService.currentUser?.displayName || 'A student';
                await window.app.createNotification(
                    mentorUserId,
                    'mentorship',
                    'New Mentorship Request 📩',
                    `${userName} has sent you a mentorship request. Check your mentor dashboard to respond!`,
                    '#mentorship'
                );
            }
            
            window.app.closeModal('request-modal');
            window.app.showToast('Mentorship request sent! The mentor will be notified.', 'success');
            form.reset();
            await this.loadConnections();
        } catch (error) {
            console.error('Error sending request:', error);
            window.app.showToast('Failed to send request', 'error');
        }
    }
}

// Create global instance
window.mentorshipModule = new MentorshipModule();
