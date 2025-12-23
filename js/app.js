// Main App Controller
class App {
    constructor() {
        this.currentSection = 'home';
        this.initialized = false;
        this.settingsInitialized = false;
    }

    async init() {
        try {
            // Apply saved theme immediately (before anything else renders)
            this.loadAndApplyTheme();
            
            // Initialize Firebase first (required)
            await window.firebaseService.init();
            
            // Set up auth state listener immediately
            this.setupAuthListener();
            
            // Set up navigation and modals immediately (no async needed)
            this.setupNavigation();
            this.setupModals();
            
            // Hide loading screen immediately - don't wait for modules
            this.hideLoadingScreen();
            
            this.initialized = true;
            
            // Initialize notifications for everyone (demo for non-logged in)
            this.initNotifications(null);
            
            // Initialize modules in background (non-blocking)
            this.initModulesAsync();
            
        } catch (error) {
            console.error('App initialization error:', error);
            this.hideLoadingScreen();
            this.showToast('Some features may not be available', 'warning');
        }
    }

    loadAndApplyTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(savedTheme);
    }

    // Non-blocking module initialization
    async initModulesAsync() {
        // Initialize modules in parallel for faster loading
        const modulePromises = [];
        
        // Mentorship module (fast, no map)
        modulePromises.push(
            window.mentorshipModule?.init().catch(err => {
                console.error('Mentorship module error:', err);
            })
        );
        
        // Reading Curator module (fast, no heavy resources)
        modulePromises.push(
            window.readingCuratorModule?.init().catch(err => {
                console.error('Reading curator module error:', err);
            })
        );
        
        // Chat module (fast)
        modulePromises.push(
            Promise.resolve(window.chatModule?.init()).catch(err => {
                console.error('Chat module error:', err);
            })
        );
        
        // Study Spaces module - defer map loading
        modulePromises.push(
            window.studySpacesModule?.initDeferred().catch(err => {
                console.error('Study spaces module error:', err);
            })
        );
        
        await Promise.all(modulePromises);
    }

    setupAuthListener() {
        window.addEventListener('authStateChanged', (event) => {
            this.updateAuthUI(event.detail.user);
        });

        // Auth buttons
        document.getElementById('login-btn')?.addEventListener('click', () => {
            this.openModal('auth-modal');
            this.showAuthTab('login');
        });

        document.getElementById('signup-btn')?.addEventListener('click', () => {
            this.openModal('auth-modal');
            this.showAuthTab('signup');
        });

        document.getElementById('logout-btn')?.addEventListener('click', async () => {
            await window.firebaseService.signOut();
            this.showToast('Signed out successfully', 'success');
            this.closeUserDropdown();
        });

        // User menu dropdown toggle
        document.getElementById('user-menu-trigger')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleUserDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#user-menu')) {
                this.closeUserDropdown();
            }
            if (!e.target.closest('#notification-container')) {
                this.closeNotificationPanel();
            }
        });

        // Profile settings button
        document.getElementById('profile-settings-btn')?.addEventListener('click', () => {
            this.closeUserDropdown();
            this.openProfileSettings();
        });

        // My activity button
        document.getElementById('my-activity-btn')?.addEventListener('click', () => {
            this.closeUserDropdown();
            this.showToast('Activity page coming soon!', 'info');
        });

        // Messages button
        document.getElementById('messages-btn')?.addEventListener('click', () => {
            window.chatModule?.openConversationsModal();
        });

        // Notification bell
        document.getElementById('notification-bell')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleNotificationPanel();
        });

        // Mark all notifications as read
        document.getElementById('mark-all-read')?.addEventListener('click', () => {
            this.markAllNotificationsRead();
        });
        // Notification tabs
        document.querySelectorAll('.notification-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.notification-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.filterNotifications(tab.dataset.tab);
            });
        });

        // View all notifications
        document.getElementById('view-all-notifications')?.addEventListener('click', () => {
            this.closeNotificationPanel();
            this.showToast('Full notifications page coming soon!', 'info');
        });

        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.showAuthTab(tab.dataset.tab);
            });
        });

        // Login form
        document.getElementById('login-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin(e.target);
        });

        // Signup form
        document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSignup(e.target);
        });

        // Google auth buttons
        document.getElementById('google-login')?.addEventListener('click', () => this.handleGoogleAuth());
        document.getElementById('google-signup')?.addEventListener('click', () => this.handleGoogleAuth());
    }

    updateAuthUI(user) {
        const authButtons = document.getElementById('auth-buttons');
        const userMenu = document.getElementById('user-menu');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');

        if (user) {
            authButtons?.classList.add('hidden');
            userMenu?.classList.remove('hidden');
            
            if (userAvatar) {
                userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=4285f4&color=fff`;
            }
            if (userName) {
                userName.textContent = user.displayName || user.email?.split('@')[0] || 'User';
            }

            // Update modules that depend on auth
            window.mentorshipModule?.loadConnections();
            window.readingCuratorModule?.loadSavedLists();
            
            // Initialize notifications with user's real notifications
            this.initNotifications(user.uid);
            
            // Initialize chat/messages
            window.chatModule?.initConversationsListener(user.uid);
            document.getElementById('messages-container')?.classList.remove('hidden');
            
            // Update user roles display
            this.updateUserRoles();
            
            // Update home page for logged in user
            this.updateHomePageUI(true, user);
        } else {
            authButtons?.classList.remove('hidden');
            userMenu?.classList.add('hidden');
            document.getElementById('messages-container')?.classList.add('hidden');
            this.stopNotificationListener();
            window.chatModule?.stopConversationsListener();
            
            // Reset role badges
            this.resetUserRoles();
            
            // Update home page for logged out user
            this.updateHomePageUI(false);
        }
    }

    // Update user role badges in the UI
    async updateUserRoles() {
        const user = window.firebaseService.currentUser;
        if (!user) return;

        try {
            const stats = await window.firebaseService.getUserStats(user.uid);
            
            // Update header role badges
            const userRolesContainer = document.getElementById('user-roles');
            const dropdownRolesContainer = document.getElementById('dropdown-user-roles');
            
            let badgesHtml = '';
            let dropdownHtml = '';
            
            // Student badge (always shown)
            badgesHtml += `<span class="role-badge student" title="Student"><span class="material-icons">school</span></span>`;
            dropdownHtml += `
                <div class="dropdown-role-item">
                    <span class="material-icons">school</span>
                    <span>Student</span>
                </div>
            `;
            
            // Mentor badge
            if (stats.isMentor) {
                badgesHtml += `<span class="role-badge mentor" title="Mentor"><span class="material-icons">psychology</span></span>`;
                dropdownHtml += `
                    <div class="dropdown-role-item mentor">
                        <span class="material-icons">psychology</span>
                        <span>Mentor${stats.mentorRating ? ` (${stats.mentorRating.toFixed(1)}★)` : ''}</span>
                    </div>
                `;
            }
            
            // Contributor badge
            if (stats.spacesContributed > 0) {
                badgesHtml += `<span class="role-badge contributor" title="Contributor - ${stats.spacesContributed} spaces"><span class="material-icons">place</span></span>`;
                dropdownHtml += `
                    <div class="dropdown-role-item contributor">
                        <span class="material-icons">place</span>
                        <span>Contributor (${stats.spacesContributed} spaces)</span>
                    </div>
                `;
            }
            
            if (userRolesContainer) {
                userRolesContainer.innerHTML = badgesHtml;
            }
            
            if (dropdownRolesContainer) {
                dropdownRolesContainer.innerHTML = dropdownHtml;
            }
            
            // Update settings role badges if visible
            this.updateSettingsRoleBadges(stats);
            
        } catch (error) {
            console.error('Error updating user roles:', error);
        }
    }

    // Update settings page role badges
    updateSettingsRoleBadges(stats) {
        const rolesBadgesDisplay = document.getElementById('settings-role-badges');
        const statSpaces = document.getElementById('stat-spaces');
        const statMentees = document.getElementById('stat-mentees');
        
        if (rolesBadgesDisplay) {
            let html = `
                <div class="role-badge-card student">
                    <span class="material-icons">school</span>
                    <div class="role-badge-info">
                        <span class="role-badge-title">Student</span>
                        <span class="role-badge-desc">Campus community member</span>
                    </div>
                </div>
            `;
            
            if (stats.isMentor) {
                html += `
                    <div class="role-badge-card mentor">
                        <span class="material-icons">psychology</span>
                        <div class="role-badge-info">
                            <span class="role-badge-title">Mentor</span>
                            <span class="role-badge-desc">Helping other students succeed${stats.mentorRating ? ` • ${stats.mentorRating.toFixed(1)}★ rating` : ''}</span>
                        </div>
                    </div>
                `;
            }
            
            if (stats.spacesContributed > 0) {
                html += `
                    <div class="role-badge-card contributor">
                        <span class="material-icons">place</span>
                        <div class="role-badge-info">
                            <span class="role-badge-title">Contributor</span>
                            <span class="role-badge-desc">Suggested ${stats.spacesContributed} study space${stats.spacesContributed > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                `;
            }
            
            rolesBadgesDisplay.innerHTML = html;
        }
        
        if (statSpaces) statSpaces.textContent = stats.spacesContributed || 0;
        if (statMentees) statMentees.textContent = stats.menteesCount || 0;
    }

    // Reset role badges when logged out
    resetUserRoles() {
        const userRolesContainer = document.getElementById('user-roles');
        const dropdownRolesContainer = document.getElementById('dropdown-user-roles');
        
        if (userRolesContainer) {
            userRolesContainer.innerHTML = `<span class="role-badge student"><span class="material-icons">school</span> Student</span>`;
        }
        if (dropdownRolesContainer) {
            dropdownRolesContainer.innerHTML = '';
        }
    }

    updateHomePageUI(isLoggedIn, user = null) {
        const quickActions = document.getElementById('home-quick-actions');
        const gettingStarted = document.getElementById('home-getting-started');
        const activitySection = document.getElementById('home-activity');

        if (isLoggedIn) {
            quickActions?.classList.remove('hidden');
            gettingStarted?.classList.add('hidden');
            activitySection?.classList.remove('hidden');
            
            // Update hero greeting if user is logged in
            const heroContent = document.querySelector('.home-hero .hero-content h1');
            if (heroContent && user) {
                const firstName = user.displayName?.split(' ')[0] || 'there';
                heroContent.innerHTML = `Welcome back, <span class="gradient-text">${firstName}</span>!`;
            }
            
            // Load recent activity
            this.loadRecentActivity();
        } else {
            quickActions?.classList.add('hidden');
            gettingStarted?.classList.remove('hidden');
            activitySection?.classList.add('hidden');
            
            // Reset hero
            const heroContent = document.querySelector('.home-hero .hero-content h1');
            if (heroContent) {
                heroContent.innerHTML = 'Welcome to <span class="gradient-text">Smart Campus</span>';
            }
        }
    }

    async loadRecentActivity() {
        const activityList = document.getElementById('activity-list');
        if (!activityList || !window.firebaseService.currentUser) return;

        // Get recent notifications as activity
        const activities = this.notifications?.slice(0, 5) || [];
        
        if (activities.length === 0) {
            activityList.innerHTML = `
                <div class="activity-empty">
                    <span class="material-icons">history</span>
                    <p>No recent activity. Start exploring to see your activity here!</p>
                </div>
            `;
            return;
        }

        activityList.innerHTML = activities.map(activity => {
            const timeAgo = this.getTimeAgo(activity.createdAt?.toDate?.() || new Date());
            const icons = {
                mentorship: 'people',
                mentorship_accepted: 'how_to_reg',
                mentorship_declined: 'person_off',
                study_space: 'library_books',
                reading: 'auto_stories',
                system: 'info',
                welcome: 'celebration'
            };
            const icon = icons[activity.type] || 'notifications';
            
            return `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type || 'system'}">
                        <span class="material-icons">${icon}</span>
                    </div>
                    <div class="activity-content">
                        <p class="activity-title">${activity.title}</p>
                        <span class="activity-time">${timeAgo}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    showAuthTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tab}-form`);
        });
    }

    async handleLogin(form) {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            await window.firebaseService.signInWithEmail(email, password);
            this.closeModal('auth-modal');
            this.showToast('Welcome back!', 'success');
            form.reset();
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(this.getAuthErrorMessage(error.code), 'error');
        }
    }

    async handleSignup(form) {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        try {
            const user = await window.firebaseService.signUpWithEmail(email, password, name);
            
            // Send welcome notification
            await this.createNotification(
                user.uid,
                'welcome',
                'Welcome to Smart Campus! 🎉',
                'Explore study spaces, connect with mentors, and discover reading recommendations.',
                '#study-spaces'
            );
            
            this.closeModal('auth-modal');
            this.showToast('Account created successfully!', 'success');
            form.reset();
        } catch (error) {
            console.error('Signup error:', error);
            this.showToast(this.getAuthErrorMessage(error.code), 'error');
        }
    }

    async handleGoogleAuth() {
        try {
            await window.firebaseService.signInWithGoogle();
            this.closeModal('auth-modal');
            this.showToast('Signed in with Google!', 'success');
        } catch (error) {
            console.error('Google auth error:', error);
            if (error.code !== 'auth/popup-closed-by-user') {
                this.showToast(this.getAuthErrorMessage(error.code), 'error');
            }
        }
    }

    getAuthErrorMessage(code) {
        const messages = {
            'auth/email-already-in-use': 'This email is already registered',
            'auth/invalid-email': 'Invalid email address',
            'auth/operation-not-allowed': 'This operation is not allowed',
            'auth/weak-password': 'Password should be at least 6 characters',
            'auth/user-disabled': 'This account has been disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/too-many-requests': 'Too many attempts. Please try again later',
            'auth/network-request-failed': 'Network error. Please check your connection'
        };
        return messages[code] || 'An error occurred. Please try again.';
    }

    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                this.navigateToSection(section);
            });
        });

        // Home page navigation buttons
        document.querySelectorAll('[data-navigate]').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.navigate;
                this.navigateToSection(section);
            });
        });

        // Home page quick actions
        document.getElementById('quick-become-mentor')?.addEventListener('click', () => {
            if (!window.firebaseService.currentUser) {
                window.app.showToast('Please sign in to become a mentor', 'warning');
                this.openModal('auth-modal');
                return;
            }
            this.openModal('mentor-modal');
        });

        document.getElementById('quick-profile-settings')?.addEventListener('click', () => {
            if (!window.firebaseService.currentUser) {
                window.app.showToast('Please sign in to edit profile', 'warning');
                this.openModal('auth-modal');
                return;
            }
            this.openProfileSettings();
        });

        document.getElementById('step-signup-btn')?.addEventListener('click', () => {
            this.openModal('auth-modal');
            this.showAuthTab('signup');
        });
    }

    navigateToSection(section) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });

        // Update content sections
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === section);
        });

        this.currentSection = section;

        // Trigger any section-specific updates
        if (section === 'study-spaces') {
            // Make sure spaces are rendered when viewing study spaces
            window.studySpacesModule?.renderSpacesList();
            
            // Resize map on section change
            if (window.mapsService?.map) {
                google.maps.event.trigger(window.mapsService.map, 'resize');
            }
        }
    }

    setupModals() {
        // Close modal on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Close modal on X button
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    this.closeModal(modal.id);
                });
            }
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        if (app) {
            app.classList.remove('hidden');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        toast.innerHTML = `
            <span class="material-icons">${icons[type]}</span>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.25s ease reverse';
            setTimeout(() => toast.remove(), 250);
        }, 4000);
    }

    // User Dropdown Methods
    toggleUserDropdown() {
        const dropdown = document.getElementById('user-dropdown');
        dropdown?.classList.toggle('active');
    }

    closeUserDropdown() {
        const dropdown = document.getElementById('user-dropdown');
        dropdown?.classList.remove('active');
    }

    // =====================================================
    // Notification System Methods
    // =====================================================

    notifications = [];
    unsubscribeNotifications = null;
    currentNotificationFilter = 'all';

    // Demo notifications for when there are none from Firebase
    getDemoNotifications() {
        const now = new Date();
        return [
            {
                id: 'demo-1',
                type: 'welcome',
                title: 'Welcome to Smart Campus! 🎉',
                message: 'Start by exploring study spaces, connecting with mentors, or chatting with our AI curator.',
                read: false,
                createdAt: { toDate: () => new Date(now - 60000) } // 1 min ago
            },
            {
                id: 'demo-2',
                type: 'system',
                title: 'Tip: Find Study Spaces',
                message: 'Click on "Study Spaces" in the menu to discover quiet places to study on campus.',
                read: false,
                createdAt: { toDate: () => new Date(now - 3600000) } // 1 hour ago
            },
            {
                id: 'demo-3',
                type: 'system',
                title: 'Sign in for more features',
                message: 'Create an account to connect with mentors, save reading lists, and receive personalized notifications.',
                read: true,
                createdAt: { toDate: () => new Date(now - 86400000) } // 1 day ago
            }
        ];
    }

    initNotifications(userId) {
        // Immediately show demo notifications
        this.notifications = this.getDemoNotifications();
        this.updateNotificationBadge();
        this.renderNotifications();
        
        // If no user ID, just show demo notifications
        if (!userId) {
            return;
        }
        
        // Set up real-time listener for notifications (only for logged in users)
        try {
            this.unsubscribeNotifications = window.firebaseService.onNotificationsUpdate(
                userId,
                (notifications) => {
                    // Update with Firebase notifications if available, otherwise keep demo
                    this.notifications = notifications.length > 0 ? notifications : this.getDemoNotifications();
                    this.updateNotificationBadge();
                    this.renderNotifications();
                },
                (error) => {
                    // Error callback - Firebase query failed (likely missing index)
                    console.warn('Notification listener error, using demo notifications:', error.message);
                    // Keep showing demo notifications (already set above)
                }
            );
        } catch (error) {
            console.error('Error initializing notifications:', error);
            // Demo notifications already showing
        }
    }

    stopNotificationListener() {
        if (this.unsubscribeNotifications) {
            this.unsubscribeNotifications();
            this.unsubscribeNotifications = null;
        }
        // Reset to demo notifications when logged out
        this.notifications = this.getDemoNotifications();
        this.updateNotificationBadge();
        this.renderNotifications();
    }

    toggleNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        panel?.classList.toggle('active');
        
        // Close user dropdown if open
        this.closeUserDropdown();
    }

    closeNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        panel?.classList.remove('active');
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notification-badge');
        const unreadCount = this.notifications.filter(n => !n.read).length;
        
        if (badge) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.classList.toggle('hidden', unreadCount === 0);
        }
    }

    renderNotifications() {
        const container = document.getElementById('notification-list');
        if (!container) return;

        let filteredNotifications = this.notifications;
        if (this.currentNotificationFilter === 'unread') {
            filteredNotifications = this.notifications.filter(n => !n.read);
        }

        if (filteredNotifications.length === 0) {
            container.innerHTML = `
                <div class="notification-empty">
                    <span class="material-icons">notifications_none</span>
                    <p>${this.currentNotificationFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredNotifications.map(notification => 
            this.renderNotificationItem(notification)
        ).join('');

        // Add click handlers
        container.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                this.handleNotificationClick(item.dataset.id);
            });
        });

        container.querySelectorAll('.notification-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteNotification(btn.dataset.id);
            });
        });
    }

    renderNotificationItem(notification) {
        const timeAgo = this.getTimeAgo(notification.createdAt?.toDate?.() || new Date());
        const icons = {
            mentorship: 'people',
            mentorship_accepted: 'how_to_reg',
            mentorship_declined: 'person_off',
            study_space: 'library_books',
            reading: 'auto_stories',
            system: 'info',
            welcome: 'celebration'
        };

        const icon = icons[notification.type] || 'notifications';

        return `
            <div class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}">
                <div class="notification-icon ${notification.type || 'system'}">
                    <span class="material-icons">${icon}</span>
                </div>
                <div class="notification-content">
                    <p class="notification-title">${notification.title}</p>
                    <p class="notification-message">${notification.message}</p>
                    <span class="notification-time">${timeAgo}</span>
                </div>
                <button class="notification-delete" data-id="${notification.id}" title="Delete">
                    <span class="material-icons">close</span>
                </button>
            </div>
        `;
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
            }
        }
        return 'Just now';
    }

    filterNotifications(filter) {
        this.currentNotificationFilter = filter;
        this.renderNotifications();
    }

    async handleNotificationClick(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification) return;

        // Mark as read if unread
        if (!notification.read) {
            try {
                await window.firebaseService.markNotificationRead(notificationId);
            } catch (error) {
                console.error('Error marking notification read:', error);
            }
        }

        // Handle notification action based on type
        if (notification.actionUrl) {
            // Navigate to action URL or section
            if (notification.actionUrl.startsWith('#')) {
                const section = notification.actionUrl.slice(1);
                this.navigateToSection(section);
                this.closeNotificationPanel();
            }
        } else if (notification.type === 'mentorship' || notification.type === 'mentorship_accepted') {
            this.navigateToSection('mentorship');
            this.closeNotificationPanel();
        } else if (notification.type === 'study_space') {
            this.navigateToSection('study-spaces');
            this.closeNotificationPanel();
        } else if (notification.type === 'reading') {
            this.navigateToSection('reading-curator');
            this.closeNotificationPanel();
        }
    }

    async markAllNotificationsRead() {
        const user = window.firebaseService.currentUser;
        if (!user) return;

        try {
            await window.firebaseService.markAllNotificationsRead(user.uid);
            this.showToast('All notifications marked as read', 'success');
        } catch (error) {
            console.error('Error marking all as read:', error);
            this.showToast('Failed to mark notifications as read', 'error');
        }
    }

    async deleteNotification(notificationId) {
        try {
            await window.firebaseService.deleteNotification(notificationId);
        } catch (error) {
            console.error('Error deleting notification:', error);
            this.showToast('Failed to delete notification', 'error');
        }
    }

    // Helper method to create notifications from other modules
    async createNotification(userId, type, title, message, actionUrl = null) {
        try {
            await window.firebaseService.createNotification(userId, {
                type,
                title,
                message,
                actionUrl
            });
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    }

    // Profile Settings Methods
    async openProfileSettings() {
        if (!window.firebaseService.currentUser) {
            this.showToast('Please sign in to access settings', 'warning');
            return;
        }

        this.openModal('settings-modal');
        this.setupSettingsTabs();
        await this.loadUserSettings();
    }

    setupSettingsTabs() {
        document.querySelectorAll('.settings-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.settingsTab;
                this.switchSettingsTab(tab);
            });
        });

        // Only setup form listeners once
        if (this.settingsInitialized) return;
        this.settingsInitialized = true;

        // Profile form submission
        document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProfileSettings();
        });

        // Password form submission
        document.getElementById('password-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.changePassword();
        });

        // Photo upload
        document.getElementById('profile-photo-input')?.addEventListener('change', (e) => {
            this.handlePhotoUpload(e.target.files[0]);
        });

        // Remove photo
        document.getElementById('remove-photo-btn')?.addEventListener('click', () => {
            this.removeProfilePhoto();
        });

        // Save buttons for other tabs
        document.getElementById('save-notifications-btn')?.addEventListener('click', () => {
            this.saveNotificationSettings();
        });

        document.getElementById('save-preferences-btn')?.addEventListener('click', () => {
            this.savePreferences();
        });

        document.getElementById('save-privacy-btn')?.addEventListener('click', () => {
            this.savePrivacySettings();
        });

        document.getElementById('delete-account-btn')?.addEventListener('click', () => {
            this.confirmDeleteAccount();
        });

        document.getElementById('download-data-btn')?.addEventListener('click', () => {
            this.downloadUserData();
        });

        // Connect Google button
        document.getElementById('connect-google-btn')?.addEventListener('click', () => {
            this.connectGoogleAccount();
        });

        // Live theme preview when changing dropdown
        document.getElementById('theme-preference')?.addEventListener('change', (e) => {
            this.applyTheme(e.target.value);
        });
    }

    async connectGoogleAccount() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const user = window.firebaseService.currentUser;
            
            // Check if already linked
            const isLinked = user.providerData?.some(p => p.providerId === 'google.com');
            
            if (isLinked) {
                // Unlink
                await user.unlink('google.com');
                document.getElementById('google-status').textContent = 'Not connected';
                document.getElementById('google-status').classList.remove('connected');
                document.getElementById('connect-google-btn').textContent = 'Connect';
                this.showToast('Google account disconnected', 'success');
            } else {
                // Link
                await user.linkWithPopup(provider);
                document.getElementById('google-status').textContent = 'Connected';
                document.getElementById('google-status').classList.add('connected');
                document.getElementById('connect-google-btn').textContent = 'Disconnect';
                this.showToast('Google account connected!', 'success');
            }
        } catch (error) {
            console.error('Google connect error:', error);
            if (error.code === 'auth/credential-already-in-use') {
                this.showToast('This Google account is already linked to another user', 'error');
            } else {
                this.showToast('Failed to connect Google account', 'error');
            }
        }
    }

    switchSettingsTab(tab) {
        document.querySelectorAll('.settings-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.settingsTab === tab);
        });
        document.querySelectorAll('.settings-tab').forEach(t => {
            t.classList.toggle('active', t.id === `settings-${tab}`);
        });
    }

    async loadUserSettings() {
        const user = window.firebaseService.currentUser;
        if (!user) return;

        // Load basic profile info
        document.getElementById('settings-display-name').value = user.displayName || '';
        document.getElementById('settings-email').value = user.email || '';

        // Load extended profile from Firestore
        try {
            const profile = await window.firebaseService.getUserProfile(user.uid);
            
            // Update profile photo preview (check Firestore first, then Auth)
            const photoPreview = document.getElementById('profile-photo-preview');
            if (photoPreview) {
                const photoURL = profile?.photoURL || user.photoURL;
                if (photoURL) {
                    photoPreview.innerHTML = `<img src="${photoURL}" alt="Profile">`;
                } else {
                    photoPreview.innerHTML = `<span class="material-icons">person</span>`;
                }
            }
            
            if (profile) {
                document.getElementById('settings-bio').value = profile.bio || '';
                document.getElementById('settings-major').value = profile.major || '';
                document.getElementById('settings-year').value = profile.year || '';
                document.getElementById('settings-interests').value = (profile.interests || []).join(', ');

                // Load notification settings
                if (profile.notifications) {
                    document.getElementById('notify-mentorship').checked = profile.notifications.mentorship !== false;
                    document.getElementById('notify-spaces').checked = profile.notifications.spaces !== false;
                    document.getElementById('notify-reading').checked = profile.notifications.reading || false;
                    document.getElementById('notify-email-digest').checked = profile.notifications.emailDigest || false;
                }

                // Load preferences
                if (profile.preferences) {
                    document.getElementById('theme-preference').value = profile.preferences.theme || 'light';
                    document.getElementById('default-section').value = profile.preferences.defaultSection || 'study-spaces';
                    document.getElementById('distance-unit').value = profile.preferences.distanceUnit || 'miles';
                    
                    // Apply theme from profile
                    this.applyTheme(profile.preferences.theme || 'light');
                    localStorage.setItem('theme', profile.preferences.theme || 'light');
                }

                // Load privacy settings
                if (profile.privacy) {
                    document.getElementById('profile-visibility').value = profile.privacy.profileVisibility || 'public';
                    document.getElementById('show-online-status').checked = profile.privacy.showOnlineStatus !== false;
                    document.getElementById('allow-mentorship-requests').checked = profile.privacy.allowMentorshipRequests !== false;
                    document.getElementById('share-activity-data').checked = profile.privacy.shareActivityData || false;
                }
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            // Fallback to Auth photo if Firestore fails
            const photoPreview = document.getElementById('profile-photo-preview');
            if (photoPreview) {
                if (user.photoURL) {
                    photoPreview.innerHTML = `<img src="${user.photoURL}" alt="Profile">`;
                } else {
                    photoPreview.innerHTML = `<span class="material-icons">person</span>`;
                }
            }
        }

        // Check Google connection status
        const isGoogleConnected = user.providerData?.some(p => p.providerId === 'google.com');
        const googleStatus = document.getElementById('google-status');
        const connectGoogleBtn = document.getElementById('connect-google-btn');
        if (isGoogleConnected) {
            googleStatus.textContent = 'Connected';
            googleStatus.classList.add('connected');
            connectGoogleBtn.textContent = 'Disconnect';
        }
    }

    async saveProfileSettings() {
        const user = window.firebaseService.currentUser;
        if (!user) return;

        const displayName = document.getElementById('settings-display-name').value;
        const bio = document.getElementById('settings-bio').value;
        const major = document.getElementById('settings-major').value;
        const year = document.getElementById('settings-year').value;
        const interests = document.getElementById('settings-interests').value
            .split(',')
            .map(i => i.trim())
            .filter(i => i);

        // Get profile photo if uploaded
        const photoPreview = document.getElementById('profile-photo-preview');
        const photoImg = photoPreview.querySelector('img');
        let photoURL = photoImg ? photoImg.src : null;

        // Compress image if it's a base64 data URL (to reduce size for Firestore)
        if (photoURL && photoURL.startsWith('data:image')) {
            try {
                photoURL = await this.compressImage(photoURL, 200, 0.7);
            } catch (e) {
                console.warn('Could not compress image:', e);
            }
        }

        try {
            // Update Firebase Auth display name only (not photo - Auth requires actual URL)
            if (displayName !== user.displayName) {
                await user.updateProfile({ displayName });
            }

            // Update Firestore profile (can store base64)
            const profileData = {
                displayName,
                bio,
                major,
                year,
                interests,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Add photo URL if exists
            if (photoURL) {
                profileData.photoURL = photoURL;
            } else {
                profileData.photoURL = null;
            }

            await window.firebaseService.updateUserProfile(user.uid, profileData);

            // Update UI elements
            document.getElementById('user-name').textContent = displayName || user.email?.split('@')[0];
            
            // Update avatar in header
            const userAvatar = document.getElementById('user-avatar');
            if (userAvatar) {
                if (photoURL) {
                    userAvatar.innerHTML = `<img src="${photoURL}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                } else {
                    userAvatar.innerHTML = `<span class="material-icons">person</span>`;
                }
            }

            this.showToast('Profile updated successfully!', 'success');
        } catch (error) {
            console.error('Error saving profile:', error);
            this.showToast('Failed to update profile', 'error');
        }
    }

    // Compress image to reduce size for Firestore storage
    compressImage(base64, maxSize, quality) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale down if larger than maxSize
                if (width > height) {
                    if (width > maxSize) {
                        height = Math.round((height * maxSize) / width);
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = Math.round((width * maxSize) / height);
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = base64;
        });
    }

    async changePassword() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            const user = window.firebaseService.currentUser;
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);
            
            document.getElementById('password-form').reset();
            this.showToast('Password updated successfully!', 'success');
        } catch (error) {
            console.error('Error changing password:', error);
            if (error.code === 'auth/wrong-password') {
                this.showToast('Current password is incorrect', 'error');
            } else {
                this.showToast('Failed to change password', 'error');
            }
        }
    }

    handlePhotoUpload(file) {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showToast('Image must be less than 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const photoPreview = document.getElementById('profile-photo-preview');
            photoPreview.innerHTML = `<img src="${e.target.result}" alt="Profile">`;
            this.showToast('Photo uploaded! Click Save Changes to apply.', 'info');
        };
        reader.readAsDataURL(file);
    }

    removeProfilePhoto() {
        const photoPreview = document.getElementById('profile-photo-preview');
        photoPreview.innerHTML = `<span class="material-icons">person</span>`;
        document.getElementById('profile-photo-input').value = '';
        this.showToast('Photo removed. Click Save Changes to apply.', 'info');
    }

    async saveNotificationSettings() {
        const user = window.firebaseService.currentUser;
        if (!user) return;

        const notifications = {
            mentorship: document.getElementById('notify-mentorship').checked,
            spaces: document.getElementById('notify-spaces').checked,
            reading: document.getElementById('notify-reading').checked,
            emailDigest: document.getElementById('notify-email-digest').checked
        };

        try {
            await window.firebaseService.updateUserProfile(user.uid, { notifications });
            this.showToast('Notification preferences saved!', 'success');
        } catch (error) {
            console.error('Error saving notifications:', error);
            this.showToast('Failed to save preferences', 'error');
        }
    }

    async savePreferences() {
        const user = window.firebaseService.currentUser;
        if (!user) return;

        const preferences = {
            theme: document.getElementById('theme-preference').value,
            defaultSection: document.getElementById('default-section').value,
            distanceUnit: document.getElementById('distance-unit').value
        };

        try {
            await window.firebaseService.updateUserProfile(user.uid, { preferences });
            
            // Apply theme immediately
            this.applyTheme(preferences.theme);
            
            // Store in localStorage for non-logged in state
            localStorage.setItem('theme', preferences.theme);
            localStorage.setItem('defaultSection', preferences.defaultSection);
            localStorage.setItem('distanceUnit', preferences.distanceUnit);
            
            this.showToast('Preferences saved!', 'success');
        } catch (error) {
            console.error('Error saving preferences:', error);
            this.showToast('Failed to save preferences', 'error');
        }
    }

    applyTheme(theme) {
        const root = document.documentElement;
        
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        
        if (theme === 'dark') {
            root.setAttribute('data-theme', 'dark');
            document.body.classList.add('dark-theme');
        } else {
            root.removeAttribute('data-theme');
            document.body.classList.remove('dark-theme');
        }
    }

    async savePrivacySettings() {
        const user = window.firebaseService.currentUser;
        if (!user) return;

        const privacy = {
            profileVisibility: document.getElementById('profile-visibility').value,
            showOnlineStatus: document.getElementById('show-online-status').checked,
            allowMentorshipRequests: document.getElementById('allow-mentorship-requests').checked,
            shareActivityData: document.getElementById('share-activity-data').checked
        };

        try {
            await window.firebaseService.updateUserProfile(user.uid, { privacy });
            this.showToast('Privacy settings saved!', 'success');
        } catch (error) {
            console.error('Error saving privacy settings:', error);
            this.showToast('Failed to save settings', 'error');
        }
    }

    confirmDeleteAccount() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            if (confirm('This will permanently delete all your data. Type DELETE to confirm.')) {
                this.deleteAccount();
            }
        }
    }

    async deleteAccount() {
        try {
            const user = window.firebaseService.currentUser;
            await window.firebaseService.db.collection('users').doc(user.uid).delete();
            await user.delete();
            this.closeModal('settings-modal');
            this.showToast('Account deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting account:', error);
            if (error.code === 'auth/requires-recent-login') {
                this.showToast('Please sign out and sign in again before deleting your account', 'error');
            } else {
                this.showToast('Failed to delete account', 'error');
            }
        }
    }

    async downloadUserData() {
        const user = window.firebaseService.currentUser;
        if (!user) return;

        try {
            const profile = await window.firebaseService.getUserProfile(user.uid);
            const data = {
                profile: {
                    displayName: user.displayName,
                    email: user.email,
                    ...profile
                },
                exportedAt: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'smart-campus-data.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showToast('Data downloaded successfully!', 'success');
        } catch (error) {
            console.error('Error downloading data:', error);
            this.showToast('Failed to download data', 'error');
        }
    }
}

// Create global app instance and initialize on DOM ready
window.app = new App();

document.addEventListener('DOMContentLoaded', () => {
    // Set a maximum loading time of 3 seconds
    const loadingTimeout = setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
            loadingScreen.classList.add('hidden');
            document.getElementById('app')?.classList.remove('hidden');
            console.warn('Loading timeout - showing app anyway');
        }
    }, 3000);
    
    window.app.init().finally(() => {
        clearTimeout(loadingTimeout);
    });
});

// Handle visibility change (pause/resume real-time updates)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Refresh data when tab becomes visible
        if (window.app.initialized) {
            window.studySpacesModule?.loadSpaces();
        }
    }
});

// Service Worker registration for PWA (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment to enable PWA support
        // navigator.serviceWorker.register('/sw.js')
        //     .then(reg => console.log('Service Worker registered'))
        //     .catch(err => console.error('Service Worker registration failed:', err));
    });
}
