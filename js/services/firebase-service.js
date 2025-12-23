// Firebase Service - Handles all Firebase operations
class FirebaseService {
    constructor() {
        this.auth = null;
        this.db = null;
        this.currentUser = null;
        this.initialized = false;
    }

    // Initialize Firebase
    async init() {
        if (this.initialized) return;
        
        try {
            // Initialize Firebase app
            if (!firebase.apps.length) {
                firebase.initializeApp(window.APP_CONFIG.firebase);
            }
            
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            // Enable offline persistence for faster loads (non-blocking)
            this.db.enablePersistence({ synchronizeTabs: true }).catch(err => {
                if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
                    console.warn('Firestore persistence not available:', err);
                }
            });
            
            // Listen for auth state changes
            this.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user } }));
            });
            
            this.initialized = true;
        } catch (error) {
            console.error('Firebase initialization error:', error);
            // Don't throw - allow app to continue with limited functionality
            this.initialized = true;
        }
    }

    // Authentication Methods
    async signUpWithEmail(email, password, displayName) {
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName });
            
            // Create user profile in Firestore
            await this.createUserProfile(userCredential.user.uid, {
                email,
                displayName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return userCredential.user;
        } catch (error) {
            console.error('Sign up error:', error);
            throw error;
        }
    }

    async signInWithEmail(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            return userCredential.user;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const userCredential = await this.auth.signInWithPopup(provider);
            
            // Check if user profile exists, create if not
            const profile = await this.getUserProfile(userCredential.user.uid);
            if (!profile) {
                await this.createUserProfile(userCredential.user.uid, {
                    email: userCredential.user.email,
                    displayName: userCredential.user.displayName,
                    photoURL: userCredential.user.photoURL,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            return userCredential.user;
        } catch (error) {
            console.error('Google sign in error:', error);
            throw error;
        }
    }

    async signOut() {
        try {
            await this.auth.signOut();
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    // User Profile Methods
    async createUserProfile(uid, profileData) {
        try {
            // Add default role data
            const profileWithRoles = {
                ...profileData,
                roles: ['student'], // Everyone starts as a student
                spacesContributed: 0,
                isMentor: false,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await this.db.collection('users').doc(uid).set(profileWithRoles, { merge: true });
        } catch (error) {
            console.error('Create profile error:', error);
            throw error;
        }
    }

    async getUserProfile(uid) {
        try {
            const doc = await this.db.collection('users').doc(uid).get();
            if (doc.exists) {
                const data = doc.data();
                // Ensure roles array exists
                if (!data.roles) {
                    data.roles = ['student'];
                }
                return { id: doc.id, ...data };
            }
            return null;
        } catch (error) {
            console.error('Get profile error:', error);
            throw error;
        }
    }

    async updateUserProfile(uid, updates) {
        try {
            const docRef = this.db.collection('users').doc(uid);
            const doc = await docRef.get();
            
            if (doc.exists) {
                // Update existing profile
                await docRef.update(updates);
            } else {
                // Create new profile with updates
                await docRef.set({
                    ...updates,
                    roles: ['student'],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Update profile error:', error);
            throw error;
        }
    }

    // Add mentor role to user
    async addMentorRole(uid) {
        try {
            await this.db.collection('users').doc(uid).update({
                isMentor: true,
                roles: firebase.firestore.FieldValue.arrayUnion('mentor')
            });
        } catch (error) {
            console.error('Add mentor role error:', error);
            throw error;
        }
    }

    // Increment space contribution count
    async incrementSpaceContribution(uid) {
        try {
            await this.db.collection('users').doc(uid).update({
                spacesContributed: firebase.firestore.FieldValue.increment(1),
                roles: firebase.firestore.FieldValue.arrayUnion('contributor')
            });
        } catch (error) {
            console.error('Increment space contribution error:', error);
            throw error;
        }
    }

    // Get user stats for badges
    async getUserStats(uid) {
        try {
            const [profile, mentorProfile, spacesSnapshot] = await Promise.all([
                this.getUserProfile(uid),
                this.db.collection('mentors').where('userId', '==', uid).get(),
                this.db.collection('studySpaces').where('createdBy', '==', uid).get()
            ]);

            return {
                isMentor: !mentorProfile.empty,
                spacesContributed: spacesSnapshot.size,
                roles: profile?.roles || ['student'],
                mentorRating: mentorProfile.empty ? null : mentorProfile.docs[0].data().rating
            };
        } catch (error) {
            console.error('Get user stats error:', error);
            return { isMentor: false, spacesContributed: 0, roles: ['student'] };
        }
    }

    // Study Spaces Methods
    async getStudySpaces() {
        try {
            const snapshot = await this.db.collection('studySpaces').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Get study spaces error:', error);
            throw error;
        }
    }

    async addStudySpace(spaceData) {
        try {
            const docRef = await this.db.collection('studySpaces').add({
                ...spaceData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: this.currentUser?.uid
            });
            return docRef.id;
        } catch (error) {
            console.error('Add study space error:', error);
            throw error;
        }
    }

    async updateStudySpaceOccupancy(spaceId, occupancy) {
        try {
            await this.db.collection('studySpaces').doc(spaceId).update({
                currentOccupancy: occupancy,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Update occupancy error:', error);
            throw error;
        }
    }

    // Mentorship Methods
    async getMentors(filters = {}) {
        try {
            let query = this.db.collection('mentors');
            
            if (filters.expertise) {
                query = query.where('expertise', 'array-contains', filters.expertise);
            }
            if (filters.available) {
                query = query.where('isAvailable', '==', true);
            }
            
            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Get mentors error:', error);
            throw error;
        }
    }

    async registerAsMentor(mentorData) {
        try {
            const docRef = await this.db.collection('mentors').doc(this.currentUser.uid).set({
                ...mentorData,
                userId: this.currentUser.uid,
                email: this.currentUser.email,
                isAvailable: true,
                rating: 0,
                reviewCount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return this.currentUser.uid;
        } catch (error) {
            console.error('Register mentor error:', error);
            throw error;
        }
    }

    async requestMentorship(mentorId, message) {
        try {
            const docRef = await this.db.collection('mentorshipRequests').add({
                mentorId,
                menteeId: this.currentUser.uid,
                menteeName: this.currentUser.displayName,
                menteeEmail: this.currentUser.email,
                message,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error('Request mentorship error:', error);
            throw error;
        }
    }

    async getMentorshipRequests(userId, role = 'mentee') {
        try {
            const field = role === 'mentor' ? 'mentorId' : 'menteeId';
            const snapshot = await this.db.collection('mentorshipRequests')
                .where(field, '==', userId)
                .get();
            // Sort client-side to avoid composite index requirement
            const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return results.sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || 0;
                const timeB = b.createdAt?.toMillis?.() || 0;
                return timeB - timeA; // desc
            });
        } catch (error) {
            console.error('Get mentorship requests error:', error);
            throw error;
        }
    }

    // Reading List Methods
    async saveReadingList(listData) {
        try {
            const docRef = await this.db.collection('readingLists').add({
                ...listData,
                userId: this.currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error('Save reading list error:', error);
            throw error;
        }
    }

    async getUserReadingLists(userId) {
        try {
            const snapshot = await this.db.collection('readingLists')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Get reading lists error:', error);
            throw error;
        }
    }

    async deleteReadingList(userId, listId) {
        try {
            // Verify the list belongs to the user before deleting
            const doc = await this.db.collection('readingLists').doc(listId).get();
            if (!doc.exists) {
                throw new Error('Reading list not found');
            }
            if (doc.data().userId !== userId) {
                throw new Error('Unauthorized to delete this reading list');
            }
            
            await this.db.collection('readingLists').doc(listId).delete();
            return true;
        } catch (error) {
            console.error('Delete reading list error:', error);
            throw error;
        }
    }

    // Real-time listeners
    onStudySpacesUpdate(callback) {
        return this.db.collection('studySpaces').onSnapshot(snapshot => {
            const spaces = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(spaces);
        });
    }

    onMentorshipRequestsUpdate(userId, callback) {
        return this.db.collection('mentorshipRequests')
            .where('menteeId', '==', userId)
            .onSnapshot(snapshot => {
                const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(requests);
            });
    }

    // Check if current user is a mentor
    async checkIfMentor(userId) {
        try {
            const doc = await this.db.collection('mentors').doc(userId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (error) {
            console.error('Check mentor status error:', error);
            return null;
        }
    }

    // Get mentorship requests for mentor
    async getMentorRequests(mentorId) {
        try {
            const snapshot = await this.db.collection('mentorshipRequests')
                .where('mentorId', '==', mentorId)
                .orderBy('createdAt', 'desc')
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Get mentor requests error:', error);
            throw error;
        }
    }

    // Update mentorship request status
    async updateMentorshipRequestStatus(requestId, status, responseMessage = '') {
        try {
            await this.db.collection('mentorshipRequests').doc(requestId).update({
                status,
                responseMessage,
                respondedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Update request status error:', error);
            throw error;
        }
    }

    // Listen for mentor requests in real-time
    onMentorRequestsUpdate(mentorId, callback) {
        return this.db.collection('mentorshipRequests')
            .where('mentorId', '==', mentorId)
            .onSnapshot(snapshot => {
                const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(requests);
            });
    }

    // =====================================================
    // Notification Methods
    // =====================================================

    // Create a notification
    async createNotification(userId, notification) {
        try {
            const docRef = await this.db.collection('notifications').add({
                userId,
                ...notification,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error('Create notification error:', error);
            throw error;
        }
    }

    // Get user notifications
    async getNotifications(userId, limit = 20) {
        try {
            const snapshot = await this.db.collection('notifications')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Get notifications error:', error);
            throw error;
        }
    }

    // Get unread notification count
    async getUnreadNotificationCount(userId) {
        try {
            const snapshot = await this.db.collection('notifications')
                .where('userId', '==', userId)
                .where('read', '==', false)
                .get();
            return snapshot.size;
        } catch (error) {
            console.error('Get unread count error:', error);
            return 0;
        }
    }

    // Mark notification as read
    async markNotificationRead(notificationId) {
        try {
            await this.db.collection('notifications').doc(notificationId).update({
                read: true,
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Mark notification read error:', error);
            throw error;
        }
    }

    // Mark all notifications as read
    async markAllNotificationsRead(userId) {
        try {
            const snapshot = await this.db.collection('notifications')
                .where('userId', '==', userId)
                .where('read', '==', false)
                .get();
            
            const batch = this.db.batch();
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, { 
                    read: true, 
                    readAt: firebase.firestore.FieldValue.serverTimestamp() 
                });
            });
            await batch.commit();
        } catch (error) {
            console.error('Mark all read error:', error);
            throw error;
        }
    }

    // Delete a notification
    async deleteNotification(notificationId) {
        try {
            await this.db.collection('notifications').doc(notificationId).delete();
        } catch (error) {
            console.error('Delete notification error:', error);
            throw error;
        }
    }

    // Clear all notifications
    async clearAllNotifications(userId) {
        try {
            const snapshot = await this.db.collection('notifications')
                .where('userId', '==', userId)
                .get();
            
            const batch = this.db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        } catch (error) {
            console.error('Clear all notifications error:', error);
            throw error;
        }
    }

    // Listen for notifications in real-time
    onNotificationsUpdate(userId, callback, errorCallback) {
        return this.db.collection('notifications')
            .where('userId', '==', userId)
            .limit(100)
            .onSnapshot(
                snapshot => {
                    // Sort client-side to avoid composite index requirement
                    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    notifications.sort((a, b) => {
                        const timeA = a.createdAt?.toMillis?.() || 0;
                        const timeB = b.createdAt?.toMillis?.() || 0;
                        return timeB - timeA; // desc
                    });
                    callback(notifications.slice(0, 50));
                },
                error => {
                    console.error('Notification listener error:', error);
                    if (errorCallback) errorCallback(error);
                }
            );
    }

    // =====================================================
    // Chat / Messaging Methods
    // =====================================================

    // Create or get existing conversation between two users
    async getOrCreateConversation(userId1, userId2, userData1, userData2) {
        try {
            // Sort user IDs to create consistent conversation ID
            const participants = [userId1, userId2].sort();
            const conversationId = `${participants[0]}_${participants[1]}`;

            const conversationRef = this.db.collection('conversations').doc(conversationId);
            const doc = await conversationRef.get();

            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }

            // Create new conversation
            const conversationData = {
                participants,
                participantData: {
                    [userId1]: {
                        name: userData1.name || 'User',
                        photoURL: userData1.photoURL || null
                    },
                    [userId2]: {
                        name: userData2.name || 'User',
                        photoURL: userData2.photoURL || null
                    }
                },
                lastMessage: null,
                lastMessageTime: null,
                unreadCount: {
                    [userId1]: 0,
                    [userId2]: 0
                },
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await conversationRef.set(conversationData);
            return { id: conversationId, ...conversationData };
        } catch (error) {
            console.error('Get/create conversation error:', error);
            throw error;
        }
    }

    // Get all conversations for a user
    async getConversations(userId) {
        try {
            const snapshot = await this.db.collection('conversations')
                .where('participants', 'array-contains', userId)
                .get();

            // Sort client-side to avoid composite index requirement
            const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return results.sort((a, b) => {
                const timeA = a.lastMessageTime?.toMillis?.() || 0;
                const timeB = b.lastMessageTime?.toMillis?.() || 0;
                return timeB - timeA; // desc
            });
        } catch (error) {
            console.error('Get conversations error:', error);
            return [];
        }
    }

    // Listen for conversations updates in real-time
    onConversationsUpdate(userId, callback) {
        return this.db.collection('conversations')
            .where('participants', 'array-contains', userId)
            .onSnapshot(snapshot => {
                // Sort client-side to avoid composite index requirement
                const conversations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                conversations.sort((a, b) => {
                    const timeA = a.lastMessageTime?.toMillis?.() || 0;
                    const timeB = b.lastMessageTime?.toMillis?.() || 0;
                    return timeB - timeA; // desc
                });
                callback(conversations);
            }, error => {
                console.error('Conversations listener error:', error);
                callback([]);
            });
    }

    // Send a message
    async sendMessage(conversationId, senderId, text) {
        try {
            const messageData = {
                conversationId,
                senderId,
                text: text.trim(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                read: false
            };

            // Add message
            const messageRef = await this.db.collection('messages').add(messageData);

            // Update conversation with last message
            const conversationRef = this.db.collection('conversations').doc(conversationId);
            const conversation = await conversationRef.get();
            const conversationData = conversation.data();

            // Increment unread count for other participant
            const otherUserId = conversationData.participants.find(p => p !== senderId);
            const unreadCount = { ...conversationData.unreadCount };
            unreadCount[otherUserId] = (unreadCount[otherUserId] || 0) + 1;

            await conversationRef.update({
                lastMessage: text.trim(),
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                unreadCount
            });

            return { id: messageRef.id, ...messageData };
        } catch (error) {
            console.error('Send message error:', error);
            throw error;
        }
    }

    // Get messages for a conversation
    async getMessages(conversationId, limit = 50) {
        try {
            const snapshot = await this.db.collection('messages')
                .where('conversationId', '==', conversationId)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
        } catch (error) {
            console.error('Get messages error:', error);
            return [];
        }
    }

    // Listen for new messages in real-time
    onMessagesUpdate(conversationId, callback) {
        return this.db.collection('messages')
            .where('conversationId', '==', conversationId)
            .orderBy('createdAt', 'asc')
            .onSnapshot(snapshot => {
                const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(messages);
            }, error => {
                console.error('Messages listener error:', error);
                callback([]);
            });
    }

    // Mark conversation as read
    async markConversationRead(conversationId, userId) {
        try {
            const conversationRef = this.db.collection('conversations').doc(conversationId);
            const conversation = await conversationRef.get();
            
            if (!conversation.exists) return;
            
            const conversationData = conversation.data();
            const unreadCount = { ...conversationData.unreadCount };
            unreadCount[userId] = 0;

            await conversationRef.update({ unreadCount });

            // Also mark all messages as read
            const messagesSnapshot = await this.db.collection('messages')
                .where('conversationId', '==', conversationId)
                .where('read', '==', false)
                .get();

            const batch = this.db.batch();
            messagesSnapshot.docs.forEach(doc => {
                const message = doc.data();
                if (message.senderId !== userId) {
                    batch.update(doc.ref, { read: true });
                }
            });
            await batch.commit();
        } catch (error) {
            console.error('Mark conversation read error:', error);
        }
    }

    // Get total unread messages count for a user
    async getTotalUnreadCount(userId) {
        try {
            const snapshot = await this.db.collection('conversations')
                .where('participants', 'array-contains', userId)
                .get();

            let totalUnread = 0;
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                totalUnread += data.unreadCount?.[userId] || 0;
            });
            return totalUnread;
        } catch (error) {
            console.error('Get total unread count error:', error);
            return 0;
        }
    }

    // Delete a conversation and its messages
    async deleteConversation(conversationId) {
        try {
            // Delete all messages in conversation
            const messagesSnapshot = await this.db.collection('messages')
                .where('conversationId', '==', conversationId)
                .get();

            const batch = this.db.batch();
            messagesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Delete conversation
            batch.delete(this.db.collection('conversations').doc(conversationId));
            
            await batch.commit();
        } catch (error) {
            console.error('Delete conversation error:', error);
            throw error;
        }
    }
}

// Create global instance
window.firebaseService = new FirebaseService();
