// Study Spaces Module - Handles study space finder functionality
class StudySpacesModule {
    constructor() {
        this.spaces = [];
        this.filteredSpaces = [];
        this.selectedSpace = null;
        this.currentFilter = 'all';
        this.currentAvailability = 'any';
        this.unsubscribe = null;
        this.mapInitialized = false;
    }

    // Original init - kept for compatibility
    async init() {
        this.bindEvents();
        await this.initMap();
        await this.loadSpaces();
        this.setupRealtimeUpdates();
    }

    // Deferred initialization - faster initial load
    async initDeferred() {
        console.log('StudySpacesModule: Initializing...');
        this.bindEvents();
        
        // Load spaces data immediately (fast)
        await this.loadSpaces();
        console.log('StudySpacesModule: Loaded', this.spaces.length, 'spaces');
        
        // Defer map initialization until Study Spaces section is viewed
        this.setupLazyMapInit();
    }

    setupLazyMapInit() {
        // Initialize map when section becomes visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.mapInitialized) {
                    this.initMapLazy();
                    observer.disconnect();
                }
            });
        });
        
        const studySection = document.getElementById('study-spaces');
        if (studySection) {
            observer.observe(studySection);
        }
        
        // Also init map if user navigates to study spaces
        document.querySelector('[data-section="study-spaces"]')?.addEventListener('click', () => {
            if (!this.mapInitialized) {
                this.initMapLazy();
            }
        });
    }

    async initMapLazy() {
        if (this.mapInitialized) return;
        
        try {
            await this.initMap();
            this.mapInitialized = true;
            this.updateMapMarkers();
            this.setupRealtimeUpdates();
        } catch (error) {
            console.error('Lazy map init error:', error);
        }
    }

    async initMap() {
        try {
            await window.mapsService.init('study-map');
            
            // Try to center on user's location
            try {
                await window.mapsService.centerOnUser();
            } catch (error) {
                console.log('Could not get user location, using default');
            }
        } catch (error) {
            console.error('Failed to initialize map:', error);
        }
    }

    async loadSpaces() {
        // Immediately show demo data while loading
        this.spaces = this.getDemoSpaces();
        this.filteredSpaces = [...this.spaces];
        this.renderSpacesList();
        
        try {
            // Try to load from Firebase
            const spaces = await window.firebaseService.getStudySpaces();
            
            if (spaces && spaces.length > 0) {
                this.spaces = [...this.getDemoSpaces(), ...spaces];
                this.filteredSpaces = [...this.spaces];
                this.renderSpacesList();
            }
            this.updateMapMarkers();
        } catch (error) {
            console.error('Error loading spaces from Firebase:', error);
            // Demo data already showing
            this.updateMapMarkers();
        }
    }

    getDemoSpaces() {
        return [
            {
                id: 'space-1',
                name: 'Central Library - Quiet Zone',
                type: 'library',
                address: 'Main Campus, Building A',
                location: { lat: 40.7128, lng: -74.0060 },
                capacity: 50,
                currentOccupancy: 15,
                noiseLevel: 'quiet',
                amenities: ['wifi', 'power', 'printing'],
                hours: '7:00 AM - 11:00 PM',
                rating: 4.8,
                description: 'A serene, quiet study environment perfect for focused individual work and exam preparation.'
            },
            {
                id: 'space-2',
                name: 'The Study Café',
                type: 'cafe',
                address: 'Student Center, Ground Floor',
                location: { lat: 40.7138, lng: -74.0070 },
                capacity: 30,
                currentOccupancy: 22,
                noiseLevel: 'moderate',
                amenities: ['wifi', 'power', 'coffee'],
                hours: '6:30 AM - 10:00 PM',
                rating: 4.5,
                description: 'Cozy café atmosphere with great coffee and snacks. Perfect for casual study sessions.'
            },
            {
                id: 'space-3',
                name: 'Engineering Study Room 201',
                type: 'study-room',
                address: 'Engineering Building, 2nd Floor',
                location: { lat: 40.7118, lng: -74.0050 },
                capacity: 12,
                currentOccupancy: 8,
                noiseLevel: 'quiet',
                amenities: ['wifi', 'power', 'whiteboard'],
                hours: '8:00 AM - 9:00 PM',
                rating: 4.6,
                description: 'Dedicated study room with whiteboard for group discussions and problem-solving sessions.'
            },
            {
                id: 'space-4',
                name: 'Science Library',
                type: 'library',
                address: 'Science Complex, West Wing',
                location: { lat: 40.7148, lng: -74.0080 },
                capacity: 80,
                currentOccupancy: 35,
                noiseLevel: 'quiet',
                amenities: ['wifi', 'power', 'printing'],
                hours: '7:00 AM - 12:00 AM',
                rating: 4.7,
                description: 'Extensive science resources and quiet study areas. Open late for night owl students.'
            },
            {
                id: 'space-5',
                name: 'Quad Garden Area',
                type: 'outdoor',
                address: 'Central Quad',
                location: { lat: 40.7135, lng: -74.0055 },
                capacity: 40,
                currentOccupancy: 10,
                noiseLevel: 'moderate',
                amenities: ['wifi'],
                hours: 'Sunrise - Sunset',
                rating: 4.3,
                description: 'Beautiful outdoor space with benches and tables. Great for reading on sunny days.'
            },
            {
                id: 'space-6',
                name: 'Business School Commons',
                type: 'study-room',
                address: 'Business Building, 1st Floor',
                location: { lat: 40.7125, lng: -74.0045 },
                capacity: 25,
                currentOccupancy: 20,
                noiseLevel: 'moderate',
                amenities: ['wifi', 'power', 'whiteboard', 'coffee'],
                hours: '7:00 AM - 10:00 PM',
                rating: 4.4,
                description: 'Modern collaborative space with coffee bar. Popular for group projects and networking.'
            },
            {
                id: 'space-7',
                name: 'Medical Library',
                type: 'library',
                address: 'Health Sciences Building, 3rd Floor',
                location: { lat: 40.7155, lng: -74.0065 },
                capacity: 60,
                currentOccupancy: 28,
                noiseLevel: 'quiet',
                amenities: ['wifi', 'power', 'printing', 'computers'],
                hours: '6:00 AM - 11:00 PM',
                rating: 4.9,
                description: 'Specialized medical resources and anatomy models. 24/7 during exam weeks.'
            },
            {
                id: 'space-8',
                name: 'Art Studio Lounge',
                type: 'study-room',
                address: 'Fine Arts Building, Room 105',
                location: { lat: 40.7112, lng: -74.0075 },
                capacity: 20,
                currentOccupancy: 5,
                noiseLevel: 'moderate',
                amenities: ['wifi', 'power', 'natural-light'],
                hours: '8:00 AM - 8:00 PM',
                rating: 4.6,
                description: 'Creative space with lots of natural light. Great for design work and artistic projects.'
            },
            {
                id: 'space-9',
                name: 'Tech Hub Co-working',
                type: 'study-room',
                address: 'Innovation Center, 2nd Floor',
                location: { lat: 40.7142, lng: -74.0042 },
                capacity: 35,
                currentOccupancy: 18,
                noiseLevel: 'moderate',
                amenities: ['wifi', 'power', 'monitors', 'whiteboard'],
                hours: '7:00 AM - 11:00 PM',
                rating: 4.7,
                description: 'Modern co-working space with external monitors available. Perfect for coding and tech projects.'
            },
            {
                id: 'space-10',
                name: 'Rooftop Study Terrace',
                type: 'outdoor',
                address: 'Student Union, 5th Floor',
                location: { lat: 40.7132, lng: -74.0068 },
                capacity: 25,
                currentOccupancy: 8,
                noiseLevel: 'quiet',
                amenities: ['wifi', 'power', 'shade'],
                hours: '9:00 AM - 9:00 PM',
                rating: 4.8,
                description: 'Scenic rooftop terrace with city views. Covered seating and heaters for cooler days.'
            }
        ];
    }

    setupRealtimeUpdates() {
        // Listen for real-time updates from Firebase
        if (window.firebaseService.initialized) {
            this.unsubscribe = window.firebaseService.onStudySpacesUpdate((spaces) => {
                if (spaces.length > 0) {
                    this.spaces = spaces;
                    this.applyFilters();
                }
            });
        }
    }

    bindEvents() {
        // Filter chips - Type
        document.querySelectorAll('[data-filter]').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('[data-filter]').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.currentFilter = chip.dataset.filter;
                this.applyFilters();
            });
        });

        // Filter chips - Availability
        document.querySelectorAll('[data-availability]').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('[data-availability]').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.currentAvailability = chip.dataset.availability;
                this.applyFilters();
            });
        });

        // Locate me button
        document.getElementById('locate-me')?.addEventListener('click', async () => {
            try {
                window.app.showToast('Finding your location...', 'info');
                await window.mapsService.centerOnUser();
                window.app.showToast('Location found!', 'success');
            } catch (error) {
                window.app.showToast('Could not get your location', 'error');
            }
        });

        // Refresh button
        document.getElementById('refresh-spaces')?.addEventListener('click', () => {
            this.loadSpaces();
            window.app.showToast('Refreshing study spaces...', 'info');
        });

        // Add space button
        document.getElementById('add-space-btn')?.addEventListener('click', () => {
            if (!window.firebaseService.currentUser) {
                window.app.showToast('Please sign in to suggest a study space', 'warning');
                window.app.openModal('auth-modal');
                return;
            }
            window.app.openModal('add-space-modal');
        });

        // Add space form
        document.getElementById('add-space-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitNewSpace(e.target);
        });
    }

    applyFilters() {
        this.filteredSpaces = this.spaces.filter(space => {
            // Type filter
            if (this.currentFilter !== 'all' && space.type !== this.currentFilter) {
                return false;
            }

            // Availability filter
            if (this.currentAvailability === 'available') {
                const occupancyRate = space.currentOccupancy / space.capacity;
                if (occupancyRate >= 0.8) return false;
            } else if (this.currentAvailability === 'quiet') {
                if (space.noiseLevel !== 'quiet') return false;
            }

            return true;
        });

        this.renderSpacesList();
        this.updateMapMarkers();
    }

    renderSpacesList() {
        const container = document.getElementById('spaces-list');
        if (!container) return;

        if (this.filteredSpaces.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">search_off</span>
                    <p>No study spaces match your filters</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredSpaces.map(space => this.renderSpaceCard(space)).join('');

        // Add click handlers to cards
        container.querySelectorAll('.space-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectSpace(card.dataset.id);
            });
        });
    }

    renderSpaceCard(space) {
        const occupancyPercent = space.capacity ? Math.round((space.currentOccupancy / space.capacity) * 100) : 0;
        let occupancyClass = 'low';
        let occupancyText = 'Available';
        
        if (occupancyPercent >= 50) {
            occupancyClass = 'medium';
            occupancyText = 'Moderate';
        }
        if (occupancyPercent >= 80) {
            occupancyClass = 'high';
            occupancyText = 'Busy';
        }

        const amenityIcons = {
            wifi: 'wifi',
            power: 'power',
            coffee: 'local_cafe',
            printing: 'print',
            whiteboard: 'edit_note'
        };

        return `
            <div class="space-card ${this.selectedSpace === space.id ? 'selected' : ''}" data-id="${space.id}">
                <div class="space-card-header">
                    <h4>${space.name}</h4>
                    <span class="space-type-badge ${space.type}">${space.type.replace('-', ' ')}</span>
                </div>
                <div class="space-card-info">
                    <div class="info-row">
                        <span class="material-icons">location_on</span>
                        <span>${space.address}</span>
                    </div>
                    <div class="info-row">
                        <span class="material-icons">schedule</span>
                        <span>${space.hours || 'Hours vary'}</span>
                    </div>
                    <div class="info-row">
                        <span class="material-icons">groups</span>
                        <span>${space.currentOccupancy}/${space.capacity} - ${occupancyText}</span>
                    </div>
                </div>
                <div class="occupancy-bar">
                    <div class="occupancy-fill ${occupancyClass}" style="width: ${occupancyPercent}%"></div>
                </div>
                ${space.amenities ? `
                    <div class="space-amenities">
                        ${space.amenities.map(amenity => `
                            <div class="amenity-icon" title="${amenity}">
                                <span class="material-icons">${amenityIcons[amenity] || 'check'}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    updateMapMarkers() {
        if (window.mapsService.initialized) {
            window.mapsService.addStudySpaceMarkers(this.filteredSpaces, (space) => {
                this.highlightSpaceCard(space.id);
            });
        }
    }

    selectSpace(spaceId) {
        this.selectedSpace = spaceId;
        const space = this.spaces.find(s => s.id === spaceId);
        
        if (space) {
            // Highlight on map
            if (window.mapsService.initialized) {
                window.mapsService.highlightMarker(spaceId);
            }

            // Update card selection
            document.querySelectorAll('.space-card').forEach(card => {
                card.classList.toggle('selected', card.dataset.id === spaceId);
            });

            // Open directions in new tab
            if (space.location) {
                const directionsUrl = window.mapsService.getDirectionsUrl(space.location);
                window.open(directionsUrl, '_blank');
            }
        }
    }

    highlightSpaceCard(spaceId) {
        document.querySelectorAll('.space-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.id === spaceId);
        });

        // Scroll card into view
        const selectedCard = document.querySelector(`.space-card[data-id="${spaceId}"]`);
        if (selectedCard) {
            selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    async submitNewSpace(form) {
        const formData = new FormData(form);
        
        const spaceData = {
            name: document.getElementById('space-name').value,
            type: document.getElementById('space-type').value,
            address: document.getElementById('space-address').value,
            capacity: parseInt(document.getElementById('space-capacity').value) || 20,
            noiseLevel: document.getElementById('noise-level').value,
            amenities: Array.from(form.querySelectorAll('input[name="amenities"]:checked'))
                .map(input => input.value),
            currentOccupancy: 0,
            status: 'pending' // Pending approval
        };

        try {
            // Geocode the address to get coordinates
            if (window.mapsService.initialized && spaceData.address) {
                // For demo, use random offset from current map center
                const center = window.mapsService.map.getCenter();
                spaceData.location = {
                    lat: center.lat() + (Math.random() - 0.5) * 0.01,
                    lng: center.lng() + (Math.random() - 0.5) * 0.01
                };
            }

            await window.firebaseService.addStudySpace(spaceData);
            
            // Track this contribution - add contributor role
            if (window.firebaseService.currentUser) {
                await window.firebaseService.incrementSpaceContribution(
                    window.firebaseService.currentUser.uid
                );
            }
            
            window.app.closeModal('add-space-modal');
            window.app.showToast('Study space suggestion submitted! 🎉', 'success');
            form.reset();
            await this.loadSpaces();
            
            // Update user roles display
            window.app.updateUserRoles();
        } catch (error) {
            console.error('Error submitting space:', error);
            window.app.showToast('Failed to submit suggestion', 'error');
        }
    }

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

// Create global instance
window.studySpacesModule = new StudySpacesModule();
