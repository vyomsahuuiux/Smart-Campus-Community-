// Chat Module - Handles real-time messaging between students and mentors
class ChatModule {
    constructor() {
        this.conversations = [];
        this.currentConversation = null;
        this.messages = [];
        this.unsubscribeMessages = null;
        this.unsubscribeConversations = null;
        this.currentChatUser = null;
        this.totalUnreadCount = 0;
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Chat send button
        document.getElementById('chat-send-btn')?.addEventListener('click', () => {
            this.sendMessage();
        });

        // Chat input enter key
        document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Chat info button
        document.getElementById('chat-info-btn')?.addEventListener('click', () => {
            if (this.currentChatUser) {
                window.app.closeModal('chat-modal');
                // Open mentor profile if available
                if (window.mentorshipModule) {
                    const mentor = window.mentorshipModule.mentors.find(m => m.id === this.currentChatUser.id);
                    if (mentor) {
                        window.mentorshipModule.showMentorProfile(mentor);
                    }
                }
            }
        });

        // Conversations search
        document.getElementById('conversations-search')?.addEventListener('input', (e) => {
            this.filterConversations(e.target.value);
        });

        // Close chat modal
        document.querySelector('#chat-modal .modal-close')?.addEventListener('click', () => {
            this.closeChatModal();
        });
    }

    // Initialize conversations listener for logged-in user
    initConversationsListener(userId) {
        if (this.unsubscribeConversations) {
            this.unsubscribeConversations();
        }

        this.unsubscribeConversations = window.firebaseService.onConversationsUpdate(
            userId,
            (conversations) => {
                this.conversations = conversations;
                this.updateUnreadBadge();
                this.renderConversationsList();
            }
        );
    }

    // Stop listening to conversations
    stopConversationsListener() {
        if (this.unsubscribeConversations) {
            this.unsubscribeConversations();
            this.unsubscribeConversations = null;
        }
        if (this.unsubscribeMessages) {
            this.unsubscribeMessages();
            this.unsubscribeMessages = null;
        }
        this.conversations = [];
        this.currentConversation = null;
        this.messages = [];
        this.updateUnreadBadge();
    }

    // Open conversations list modal
    openConversationsModal() {
        if (!window.firebaseService.currentUser) {
            window.app.showToast('Please sign in to view messages', 'warning');
            window.app.openModal('auth-modal');
            return;
        }
        window.app.openModal('conversations-modal');
        this.renderConversationsList();
    }

    // Start a chat with a specific user (mentor or student)
    async startChat(otherUser) {
        if (!window.firebaseService.currentUser) {
            window.app.showToast('Please sign in to send messages', 'warning');
            window.app.openModal('auth-modal');
            return;
        }

        const currentUser = window.firebaseService.currentUser;
        
        // Set up current chat user
        this.currentChatUser = otherUser;
        
        // Create a default local conversation immediately (will be replaced if Firebase succeeds)
        this.currentConversation = {
            id: `local_${currentUser.uid}_${otherUser.id || otherUser.userId}`,
            participants: [currentUser.uid, otherUser.id || otherUser.userId],
            isDemo: true
        };
        
        // Reset messages
        this.messages = [];
        
        // Open chat modal immediately
        this.openChatModal(otherUser);
        
        try {
            // Try to get or create conversation in Firebase
            const conversation = await window.firebaseService.getOrCreateConversation(
                currentUser.uid,
                otherUser.id || otherUser.userId,
                {
                    name: currentUser.displayName || 'Student',
                    photoURL: currentUser.photoURL
                },
                {
                    name: otherUser.name,
                    photoURL: otherUser.photoURL
                }
            );

            // Success! Use the Firebase conversation
            this.currentConversation = conversation;
            
            // Close conversations modal if open
            window.app.closeModal('conversations-modal');
            
            // Start listening for messages
            this.startMessagesListener(conversation.id);
            
            // Mark as read
            await window.firebaseService.markConversationRead(conversation.id, currentUser.uid);
            
        } catch (error) {
            console.error('Error starting chat:', error);
            // Keep using the local demo conversation already set
            // Show empty state
            this.renderMessages();
        }
    }

    // Open chat modal with user info
    openChatModal(user) {
        const avatarEl = document.getElementById('chat-user-avatar');
        const nameEl = document.getElementById('chat-user-name');
        const statusEl = document.getElementById('chat-user-status');

        if (avatarEl) {
            avatarEl.src = user.photoURL || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4285f4&color=fff`;
        }
        if (nameEl) {
            nameEl.textContent = user.name;
        }
        if (statusEl) {
            // For now, just show as available
            statusEl.innerHTML = `<span class="status-dot online"></span> Available`;
        }

        // Show loading state
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="chat-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading messages...</p>
                </div>
            `;
        }

        window.app.openModal('chat-modal');
        
        // Focus input
        setTimeout(() => {
            document.getElementById('chat-input')?.focus();
        }, 100);
    }

    // Close chat modal and cleanup
    closeChatModal() {
        if (this.unsubscribeMessages) {
            this.unsubscribeMessages();
            this.unsubscribeMessages = null;
        }
        this.currentConversation = null;
        this.messages = [];
        window.app.closeModal('chat-modal');
    }

    // Start listening for messages in current conversation
    startMessagesListener(conversationId) {
        if (this.unsubscribeMessages) {
            this.unsubscribeMessages();
        }

        try {
            this.unsubscribeMessages = window.firebaseService.onMessagesUpdate(
                conversationId,
                (messages) => {
                    this.messages = messages;
                    this.renderMessages();
                    
                    // Mark as read when viewing
                    if (window.firebaseService.currentUser) {
                        window.firebaseService.markConversationRead(
                            conversationId, 
                            window.firebaseService.currentUser.uid
                        );
                    }
                }
            );
        } catch (error) {
            console.error('Error starting messages listener:', error);
            // Show empty state on error
            this.messages = [];
            this.renderMessages();
        }

        // Fallback: if no messages loaded after 3 seconds, show empty state
        setTimeout(() => {
            const container = document.getElementById('chat-messages');
            if (container && container.querySelector('.chat-loading')) {
                this.messages = [];
                this.renderMessages();
            }
        }, 3000);
    }

    // Send a message
    async sendMessage() {
        const input = document.getElementById('chat-input');
        const text = input?.value?.trim();

        if (!text) return;
        
        if (!this.currentConversation) {
            window.app.showToast('Unable to send message. Please try reopening the chat.', 'error');
            return;
        }

        const currentUser = window.firebaseService.currentUser;
        if (!currentUser) {
            window.app.showToast('Please sign in to send messages', 'warning');
            return;
        }

        // Clear input immediately
        input.value = '';

        // Handle demo conversations locally
        if (this.currentConversation.isDemo) {
            // Add message locally
            const newMessage = {
                id: `local_${Date.now()}`,
                senderId: currentUser.uid,
                text: text,
                createdAt: { toDate: () => new Date() }
            };
            this.messages.push(newMessage);
            this.renderMessages();

            // Simulate mentor response after a short delay
            setTimeout(() => {
                this.simulateMentorResponse(text);
            }, 1000 + Math.random() * 2000);
            return;
        }

        try {
            await window.firebaseService.sendMessage(
                this.currentConversation.id,
                currentUser.uid,
                text
            );
        } catch (error) {
            console.error('Error sending message:', error);
            // If Firebase fails, fall back to local mode
            const newMessage = {
                id: `local_${Date.now()}`,
                senderId: currentUser.uid,
                text: text,
                createdAt: { toDate: () => new Date() }
            };
            this.messages.push(newMessage);
            this.renderMessages();
            
            // Simulate mentor response
            setTimeout(() => {
                this.simulateMentorResponse(text);
            }, 1000 + Math.random() * 2000);
        }
    }

    // Simulate mentor response for demo conversations
    simulateMentorResponse(userMessage) {
        if (!this.currentChatUser) return;

        const responses = [
            `Thanks for reaching out! I'd be happy to help you with that.`,
            `Great question! Let me share some thoughts on this.`,
            `I appreciate you contacting me. That's definitely something I can help with.`,
            `Thanks for your message! I'll do my best to assist you.`,
            `Hello! I'm glad you're interested. Let me know what specific area you'd like to focus on.`,
            `That's a really interesting topic! I have some experience with this.`,
            `Sure, I can definitely provide some guidance on that.`,
            `Thanks for the message! What specific aspects would you like to discuss?`
        ];

        const response = responses[Math.floor(Math.random() * responses.length)];
        
        const mentorMessage = {
            id: `local_${Date.now()}`,
            senderId: this.currentChatUser.id,
            text: response,
            createdAt: { toDate: () => new Date() }
        };
        
        this.messages.push(mentorMessage);
        this.renderMessages();
    }

    // Render messages in chat
    renderMessages() {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        const currentUserId = window.firebaseService.currentUser?.uid;

        if (this.messages.length === 0) {
            container.innerHTML = `
                <div class="chat-empty">
                    <span class="material-icons">chat</span>
                    <p>No messages yet</p>
                    <span class="empty-hint">Send a message to start the conversation</span>
                </div>
            `;
            return;
        }

        let lastDate = null;
        let html = '';

        this.messages.forEach(message => {
            const messageDate = message.createdAt?.toDate?.() || new Date();
            const dateStr = this.formatDateSeparator(messageDate);
            
            // Add date separator if new day
            if (dateStr !== lastDate) {
                html += `
                    <div class="chat-date-separator">
                        <span>${dateStr}</span>
                    </div>
                `;
                lastDate = dateStr;
            }

            const isSent = message.senderId === currentUserId;
            const timeStr = this.formatMessageTime(messageDate);
            
            // Get sender avatar
            let avatar = '';
            if (!isSent && this.currentChatUser) {
                const avatarUrl = this.currentChatUser.photoURL || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentChatUser.name)}&background=4285f4&color=fff&size=36`;
                avatar = `<img src="${avatarUrl}" alt="" class="message-avatar">`;
            }

            html += `
                <div class="chat-message ${isSent ? 'sent' : 'received'}">
                    ${avatar}
                    <div class="message-bubble">
                        <p class="message-text">${this.escapeHtml(message.text)}</p>
                        <span class="message-time">${timeStr}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    // Render conversations list
    renderConversationsList() {
        const container = document.getElementById('conversations-list');
        if (!container) return;

        const currentUserId = window.firebaseService.currentUser?.uid;

        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div class="conversations-empty">
                    <span class="material-icons">chat_bubble_outline</span>
                    <p>No conversations yet</p>
                    <span class="empty-hint">Connect with a mentor to start chatting</span>
                </div>
            `;
            return;
        }

        const html = this.conversations.map(conv => {
            // Get other participant's info
            const otherUserId = conv.participants.find(p => p !== currentUserId);
            const otherUser = conv.participantData?.[otherUserId] || { name: 'Unknown' };
            const unreadCount = conv.unreadCount?.[currentUserId] || 0;
            const isUnread = unreadCount > 0;

            const avatarUrl = otherUser.photoURL || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=4285f4&color=fff&size=50`;
            
            const timeStr = conv.lastMessageTime ? 
                this.formatConversationTime(conv.lastMessageTime.toDate?.() || new Date()) : '';

            return `
                <div class="conversation-item ${isUnread ? 'unread' : ''}" 
                     data-conversation-id="${conv.id}" 
                     data-other-user-id="${otherUserId}">
                    <div class="conversation-avatar">
                        <img src="${avatarUrl}" alt="${otherUser.name}">
                        <span class="status-dot online"></span>
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-top">
                            <span class="conversation-name">${this.escapeHtml(otherUser.name)}</span>
                            <span class="conversation-time">${timeStr}</span>
                        </div>
                        <div class="conversation-bottom">
                            <span class="conversation-preview">${conv.lastMessage ? this.escapeHtml(conv.lastMessage) : 'No messages yet'}</span>
                            ${isUnread ? `<span class="unread-badge">${unreadCount}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        // Add click handlers
        container.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const conversationId = item.dataset.conversationId;
                const otherUserId = item.dataset.otherUserId;
                this.openConversationById(conversationId, otherUserId);
            });
        });
    }

    // Open a conversation by ID
    async openConversationById(conversationId, otherUserId) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) return;

        const currentUserId = window.firebaseService.currentUser?.uid;
        const otherUser = conversation.participantData?.[otherUserId] || { name: 'Unknown' };

        this.currentConversation = conversation;
        this.currentChatUser = {
            id: otherUserId,
            name: otherUser.name,
            photoURL: otherUser.photoURL
        };

        window.app.closeModal('conversations-modal');
        this.openChatModal(this.currentChatUser);
        this.startMessagesListener(conversationId);

        // Mark as read
        await window.firebaseService.markConversationRead(conversationId, currentUserId);
    }

    // Filter conversations by search
    filterConversations(query) {
        const items = document.querySelectorAll('.conversation-item');
        const searchTerm = query.toLowerCase().trim();

        items.forEach(item => {
            const name = item.querySelector('.conversation-name')?.textContent?.toLowerCase() || '';
            const preview = item.querySelector('.conversation-preview')?.textContent?.toLowerCase() || '';
            
            if (name.includes(searchTerm) || preview.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Update unread badge in header
    updateUnreadBadge() {
        const currentUserId = window.firebaseService.currentUser?.uid;
        if (!currentUserId) {
            this.totalUnreadCount = 0;
            return;
        }

        this.totalUnreadCount = this.conversations.reduce((total, conv) => {
            return total + (conv.unreadCount?.[currentUserId] || 0);
        }, 0);

        const badge = document.getElementById('messages-badge');
        if (badge) {
            badge.textContent = this.totalUnreadCount > 99 ? '99+' : this.totalUnreadCount;
            badge.classList.toggle('hidden', this.totalUnreadCount === 0);
        }
    }

    // Format date separator
    formatDateSeparator(date) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (this.isSameDay(date, today)) {
            return 'Today';
        } else if (this.isSameDay(date, yesterday)) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
            });
        }
    }

    // Format message time
    formatMessageTime(date) {
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    }

    // Format conversation time
    formatConversationTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'now';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Check if two dates are the same day
    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global instance
window.chatModule = new ChatModule();
