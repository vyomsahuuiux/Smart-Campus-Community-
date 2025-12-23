// Reading Curator Module - AI-powered book recommendations
class ReadingCuratorModule {
    constructor() {
        this.messages = [];
        this.savedLists = [];
        this.isLoading = false;
    }

    async init() {
        window.geminiService.init();
        this.bindEvents();
        this.loadSavedLists();
    }

    bindEvents() {
        // Send message button
        const sendBtn = document.getElementById('send-message');
        if (sendBtn) {
            // Remove any existing listeners by cloning
            const newSendBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
            newSendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // Clear chat button
        const clearBtn = document.getElementById('clear-chat');
        if (clearBtn) {
            const newClearBtn = clearBtn.cloneNode(true);
            clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
            newClearBtn.addEventListener('click', () => {
                this.clearChat();
                window.app.showToast('Chat history cleared!', 'success');
            });
        }

        // Enter key in textarea
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            // Remove any existing listeners by cloning
            const newChatInput = chatInput.cloneNode(true);
            chatInput.parentNode.replaceChild(newChatInput, chatInput);
            
            newChatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Auto-resize textarea
            newChatInput.addEventListener('input', (e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                // Update character count
                this.updateCharCount(e.target.value.length);
            });
        }

        // Quick prompts - use event delegation on the chat messages container
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.addEventListener('click', (e) => {
                // Handle quick prompts
                const quickPrompt = e.target.closest('.quick-prompt');
                if (quickPrompt && quickPrompt.dataset.prompt) {
                    const input = document.getElementById('chat-input');
                    if (input) {
                        input.value = quickPrompt.dataset.prompt;
                        this.sendMessage();
                    }
                }
                
                // Handle quick action cards
                const actionCard = e.target.closest('.quick-action-card');
                if (actionCard && actionCard.dataset.prompt) {
                    const input = document.getElementById('chat-input');
                    if (input) {
                        input.value = actionCard.dataset.prompt;
                        this.sendMessage();
                    }
                }
            });
        }

        // Trending topics (new modern style)
        document.querySelectorAll('.topic-tags.modern-tags .topic-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const input = document.getElementById('chat-input');
                if (input && tag.dataset.prompt) {
                    input.value = tag.dataset.prompt;
                    this.sendMessage();
                }
            });
        });

        // Old style trending topics (fallback)
        document.querySelectorAll('.topic-tags .tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const input = document.getElementById('chat-input');
                if (input) {
                    input.value = `Recommend books about ${tag.textContent}`;
                    this.sendMessage();
                }
            });
        });

        // Suggestion chips
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const input = document.getElementById('chat-input');
                if (input && chip.dataset.prompt) {
                    input.value = chip.dataset.prompt;
                    this.sendMessage();
                }
            });
        });
    }

    updateCharCount(length) {
        const charCount = document.querySelector('.char-count');
        if (charCount) {
            charCount.textContent = `${length} / 1000`;
            if (length > 900) {
                charCount.style.color = 'var(--danger)';
            } else if (length > 700) {
                charCount.style.color = 'var(--warning)';
            } else {
                charCount.style.color = 'var(--text-tertiary)';
            }
        }
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        if (!input) return;
        
        const message = input.value.trim();
        
        if (!message || this.isLoading) return;

        // Clear input
        input.value = '';
        input.style.height = 'auto';

        // Add user message to chat
        this.addMessage('user', message);

        // Show loading indicator
        this.isLoading = true;
        const loadingId = this.addLoadingMessage();

        try {
            // Get user context if logged in
            const userContext = await this.getUserContext();
            
            // Get AI response
            const response = await window.geminiService.getReadingRecommendations(message, userContext);
            
            // Remove loading indicator
            this.removeLoadingMessage(loadingId);
            
            // Add AI response
            if (response && response.message) {
                this.addMessage('bot', response.message, response.books || []);
            } else {
                this.addMessage('bot', 'Sorry, I couldn\'t generate a response. Please try again.');
            }
            
        } catch (error) {
            console.error('Error getting recommendations:', error);
            this.removeLoadingMessage(loadingId);
            this.addMessage('bot', 'Sorry, I had trouble processing your request. Please try again.');
        } finally {
            // Always reset loading state
            this.isLoading = false;
        }
    }

    async getUserContext() {
        if (!window.firebaseService.currentUser) {
            return {};
        }

        try {
            const profile = await window.firebaseService.getUserProfile(
                window.firebaseService.currentUser.uid
            );
            return {
                major: profile?.major,
                year: profile?.year,
                interests: profile?.interests || []
            };
        } catch (error) {
            return {};
        }
    }

    addMessage(type, content, books = []) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        // Hide quick actions after first user message
        const quickActions = container.querySelector('.quick-actions-container');
        if (quickActions && type === 'user') {
            quickActions.style.display = 'none';
        }

        const messageId = `msg-${Date.now()}`;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message animate-in`;
        messageDiv.id = messageId;

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (type === 'user') {
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <span class="material-icons">person</span>
                </div>
                <div class="message-bubble">
                    <div class="message-content">
                        <p>${this.escapeHtml(content)}</p>
                    </div>
                    <div class="message-footer">
                        <span class="message-time">${timestamp}</span>
                    </div>
                </div>
            `;
        } else {
            const booksHtml = books.length > 0 ? this.renderBookRecommendations(books) : '';
            messageDiv.innerHTML = `
                <div class="message-avatar bot-avatar">
                    <span class="material-icons">psychology</span>
                </div>
                <div class="message-bubble">
                    <div class="message-content">
                        ${this.formatMessage(content)}
                        ${booksHtml}
                        ${books.length > 0 ? this.renderSaveButton(books) : ''}
                    </div>
                    <div class="message-footer">
                        <span class="message-time">${timestamp}</span>
                    </div>
                </div>
            `;
        }

        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;

        // Add event listeners for book actions
        if (type === 'bot' && books.length > 0) {
            messageDiv.querySelector('.save-list-btn')?.addEventListener('click', () => {
                this.saveReadingList(books);
            });
        }

        this.messages.push({ type, content, books, id: messageId });
        return messageId;
    }

    addLoadingMessage() {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        const loadingId = `loading-${Date.now()}`;
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot-message animate-in';
        loadingDiv.id = loadingId;
        loadingDiv.innerHTML = `
            <div class="message-avatar bot-avatar">
                <span class="material-icons">psychology</span>
            </div>
            <div class="message-bubble">
                <div class="message-content">
                    <div class="typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                    <p style="font-size: 0.875rem; color: var(--text-tertiary); margin: 0;">Thinking...</p>
                </div>
            </div>
        `;

        // Add typing indicator styles if not present
        if (!document.getElementById('typing-styles')) {
            const style = document.createElement('style');
            style.id = 'typing-styles';
            style.textContent = `
                .typing-indicator {
                    display: flex;
                    gap: 4px;
                    padding: 8px 0;
                }
                .typing-indicator span {
                    width: 8px;
                    height: 8px;
                    background: var(--primary-400);
                    border-radius: 50%;
                    animation: typing 1.4s infinite;
                }
                .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
                .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes typing {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-8px); }
                }
            `;
            document.head.appendChild(style);
        }

        container.appendChild(loadingDiv);
        container.scrollTop = container.scrollHeight;

        return loadingId;
    }

    removeLoadingMessage(loadingId) {
        const loadingDiv = document.getElementById(loadingId);
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    formatMessage(content) {
        // Convert markdown-like formatting to HTML
        let formatted = this.escapeHtml(content);
        
        // Bold text
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Italic text
        formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Headers (##)
        formatted = formatted.replace(/^##\s+(.+)$/gm, '<h4 style="margin: 12px 0 8px; color: var(--primary-600);">$1</h4>');
        
        // Bullet points
        formatted = formatted.replace(/^[•]\s+(.+)$/gm, '<li style="margin-left: 20px;">$1</li>');
        formatted = formatted.replace(/^[-]\s+(.+)$/gm, '<li style="margin-left: 20px;">$1</li>');
        
        // Numbered lists
        formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '<li style="margin-left: 20px;">$1</li>');
        
        // Emoji spacing
        formatted = formatted.replace(/(📚|📖|💼|✍️|❓|📌|💡|⏰|✏️|👋|😊)/g, '<span style="margin-right: 6px;">$1</span>');
        
        // Line breaks
        formatted = formatted.replace(/\n\n/g, '</p><p style="margin-top: 12px;">');
        formatted = formatted.replace(/\n/g, '<br>');
        
        return `<div style="line-height: 1.6;">${formatted}</div>`;
    }

    renderBookRecommendations(books) {
        if (!books || books.length === 0) return '';

        return `
            <div class="book-recommendations" style="margin-top: 16px;">
                ${books.map((book, index) => `
                    <div class="book-card" style="margin-bottom: 12px; ${index === 0 ? 'border: 2px solid var(--primary-500); background: var(--primary-50);' : ''}">
                        <div class="book-cover" style="${index === 0 ? 'background: var(--primary-500);' : ''}">
                            <span class="material-icons">${index === 0 ? 'star' : 'menu_book'}</span>
                        </div>
                        <div class="book-info">
                            <h4>${this.escapeHtml(book.title)} ${index === 0 ? '<span style="background: var(--primary-500); color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; margin-left: 8px;">TOP PICK</span>' : ''}</h4>
                            <p class="book-author">by ${this.escapeHtml(book.author)}</p>
                            ${book.rating ? `
                                <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
                                    <span style="color: #f59e0b; font-size: 12px;">★ ${book.rating}</span>
                                    ${book.difficulty ? `<span style="background: ${book.difficulty === 'Very Easy' || book.difficulty === 'Easy' ? '#10b981' : book.difficulty === 'Easy-Medium' ? '#f59e0b' : '#ef4444'}; color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px;">${book.difficulty}</span>` : ''}
                                </div>
                            ` : ''}
                            ${book.description ? `<p class="book-description" style="margin-top: 4px;">${book.description}</p>` : ''}
                            <div class="book-actions" style="margin-top: 8px;">
                                <a href="https://www.google.com/search?q=${encodeURIComponent(book.title + ' ' + book.author + ' book')}" 
                                   target="_blank" class="btn btn-ghost" style="font-size: 12px;">
                                    <span class="material-icons" style="font-size: 14px;">search</span>
                                    Find Book
                                </a>
                                <a href="https://www.amazon.com/s?k=${encodeURIComponent(book.title + ' ' + book.author)}" 
                                   target="_blank" class="btn btn-ghost" style="font-size: 12px;">
                                    <span class="material-icons" style="font-size: 14px;">shopping_cart</span>
                                    Buy
                                </a>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderSaveButton(books) {
        if (!window.firebaseService.currentUser) {
            return '';
        }

        return `
            <button class="btn btn-outline save-list-btn" style="margin-top: 12px; font-size: 13px;">
                <span class="material-icons" style="font-size: 16px;">bookmark_add</span>
                Save Reading List
            </button>
        `;
    }

    async saveReadingList(books) {
        if (!window.firebaseService.currentUser) {
            window.app.showToast('Please sign in to save reading lists', 'warning');
            return;
        }

        try {
            const listData = {
                title: `Reading List - ${new Date().toLocaleDateString()}`,
                books: books,
                source: 'ai-curator'
            };

            await window.firebaseService.saveReadingList(listData);
            window.app.showToast('Reading list saved!', 'success');
            this.loadSavedLists();
        } catch (error) {
            console.error('Error saving reading list:', error);
            window.app.showToast('Failed to save reading list', 'error');
        }
    }

    async loadSavedLists() {
        const container = document.getElementById('saved-lists');
        if (!container) return;

        if (!window.firebaseService.currentUser) {
            container.innerHTML = '<p class="empty-state">Sign in to save reading lists</p>';
            return;
        }

        try {
            const lists = await window.firebaseService.getUserReadingLists(
                window.firebaseService.currentUser.uid
            );
            this.savedLists = lists;
            this.renderSavedLists(container);
        } catch (error) {
            console.error('Error loading saved lists:', error);
            container.innerHTML = '<p class="empty-state">Could not load saved lists</p>';
        }
    }

    renderSavedLists(container) {
        if (this.savedLists.length === 0) {
            container.innerHTML = '<p class="empty-state">No saved reading lists yet</p>';
            return;
        }

        container.innerHTML = this.savedLists.slice(0, 5).map(list => {
            const date = list.createdAt?.toDate?.() || new Date();
            const bookCount = list.books?.length || 0;
            
            return `
                <div class="reading-list-item" data-id="${list.id}">
                    <div class="reading-list-content">
                        <h5>${this.escapeHtml(list.title)}</h5>
                        <p>${bookCount} book${bookCount !== 1 ? 's' : ''} • ${date.toLocaleDateString()}</p>
                    </div>
                    <button class="delete-list-btn" data-id="${list.id}" title="Delete list">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');

        // Add click handlers for viewing list
        container.querySelectorAll('.reading-list-content').forEach(item => {
            item.addEventListener('click', () => {
                const listId = item.parentElement.dataset.id;
                this.displaySavedList(listId);
            });
        });

        // Add click handlers for delete buttons
        container.querySelectorAll('.delete-list-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteReadingList(btn.dataset.id);
            });
        });
    }

    async deleteReadingList(listId) {
        if (!confirm('Are you sure you want to delete this reading list?')) {
            return;
        }

        try {
            await window.firebaseService.deleteReadingList(
                window.firebaseService.currentUser.uid,
                listId
            );
            
            // Remove from local array
            this.savedLists = this.savedLists.filter(l => l.id !== listId);
            
            // Re-render the list
            const container = document.getElementById('saved-lists');
            this.renderSavedLists(container);
            
            window.app.showToast('Reading list deleted!', 'success');
        } catch (error) {
            console.error('Error deleting reading list:', error);
            window.app.showToast('Failed to delete reading list', 'error');
        }
    }

    displaySavedList(listId) {
        const list = this.savedLists.find(l => l.id === listId);
        if (!list) return;

        // Display the saved list in the chat
        let message = `Here's your saved reading list "${list.title}":\n\n`;
        list.books.forEach((book, i) => {
            message += `${i + 1}. **${book.title}** by ${book.author}\n`;
        });

        this.addMessage('bot', message, list.books);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clearChat() {
        const container = document.getElementById('chat-messages');
        if (container) {
            // Keep only the initial welcome message
            container.innerHTML = `
                <div class="message bot-message">
                    <div class="message-avatar">
                        <span class="material-icons">smart_toy</span>
                    </div>
                    <div class="message-content">
                        <p>Hello! I'm your AI Reading Curator. Tell me about your courses, interests, or what you'd like to learn, and I'll suggest personalized reading materials for you.</p>
                        <div class="quick-prompts">
                            <button class="quick-prompt" data-prompt="I'm studying computer science and interested in AI">
                                CS & AI Books
                            </button>
                            <button class="quick-prompt" data-prompt="Recommend books for a business student">
                                Business Books
                            </button>
                            <button class="quick-prompt" data-prompt="I need textbooks for psychology courses">
                                Psychology Texts
                            </button>
                            <button class="quick-prompt" data-prompt="Suggest research papers on climate change">
                                Climate Research
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        this.messages = [];
        window.geminiService.clearHistory();

        // Re-bind quick prompt events
        this.bindEvents();
    }
}

// Create global instance
window.readingCuratorModule = new ReadingCuratorModule();
