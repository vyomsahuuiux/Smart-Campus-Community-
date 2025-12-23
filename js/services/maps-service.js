// Google Maps Service - Handles all map-related operations
class MapsService {
    constructor() {
        this.map = null;
        this.markers = [];
        this.infoWindow = null;
        this.userMarker = null;
        this.userLocation = null;
        this.initialized = false;
    }

    // Load Google Maps API dynamically
    async loadMapsAPI() {
        return new Promise((resolve, reject) => {
            if (window.google && window.google.maps) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${window.APP_CONFIG.googleMapsApiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Google Maps API'));
            document.head.appendChild(script);
        });
    }

    // Initialize map
    async init(containerId, options = {}) {
        try {
            await this.loadMapsAPI();

            const defaultOptions = {
                center: { lat: 40.7128, lng: -74.0060 }, // Default to NYC
                zoom: 15,
                styles: this.getMapStyles(),
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true
            };

            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Map container "${containerId}" not found`);
            }

            this.map = new google.maps.Map(container, { ...defaultOptions, ...options });
            this.infoWindow = new google.maps.InfoWindow();
            this.initialized = true;

            return this.map;
        } catch (error) {
            console.error('Maps initialization error:', error);
            // Show fallback UI
            this.showMapFallback(containerId);
            throw error;
        }
    }

    // Show fallback when Maps API fails
    showMapFallback(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div style="
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #e8f0fe, #f8f9fa);
                    color: #5f6368;
                    text-align: center;
                    padding: 2rem;
                ">
                    <span class="material-icons" style="font-size: 64px; margin-bottom: 1rem; color: #9aa0a6;">map</span>
                    <h3 style="margin-bottom: 0.5rem; color: #202124;">Map Unavailable</h3>
                    <p style="font-size: 0.875rem;">Please configure your Google Maps API key to view the map.</p>
                    <p style="font-size: 0.75rem; margin-top: 1rem;">Check the README for setup instructions.</p>
                </div>
            `;
        }
    }

    // Get user's current location
    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    resolve(this.userLocation);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    reject(error);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    // Center map on user's location
    async centerOnUser() {
        try {
            const location = await this.getCurrentLocation();
            if (this.map) {
                this.map.setCenter(location);
                this.map.setZoom(16);
                this.updateUserMarker(location);
            }
            return location;
        } catch (error) {
            console.error('Failed to center on user:', error);
            throw error;
        }
    }

    // Update user's location marker
    updateUserMarker(location) {
        if (this.userMarker) {
            this.userMarker.setPosition(location);
        } else {
            this.userMarker = new google.maps.Marker({
                position: location,
                map: this.map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#4285f4',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3
                },
                title: 'Your Location',
                zIndex: 999
            });

            // Add pulsing effect
            const pulseCircle = new google.maps.Marker({
                position: location,
                map: this.map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 20,
                    fillColor: '#4285f4',
                    fillOpacity: 0.2,
                    strokeColor: '#4285f4',
                    strokeWeight: 1,
                    strokeOpacity: 0.5
                },
                zIndex: 998
            });
        }
    }

    // Add study space markers
    addStudySpaceMarkers(spaces, onMarkerClick) {
        // Clear existing markers
        this.clearMarkers();

        spaces.forEach(space => {
            if (!space.location || !space.location.lat || !space.location.lng) return;

            const marker = new google.maps.Marker({
                position: { lat: space.location.lat, lng: space.location.lng },
                map: this.map,
                icon: this.getMarkerIcon(space.type, space.currentOccupancy, space.capacity),
                title: space.name,
                animation: google.maps.Animation.DROP
            });

            marker.spaceId = space.id;
            marker.spaceData = space;

            marker.addListener('click', () => {
                this.showInfoWindow(marker, space);
                if (onMarkerClick) onMarkerClick(space);
            });

            this.markers.push(marker);
        });
    }

    // Get custom marker icon based on space type and occupancy
    getMarkerIcon(type, currentOccupancy, capacity) {
        const occupancyRate = capacity ? (currentOccupancy / capacity) : 0;
        let color;

        if (occupancyRate < 0.5) {
            color = '#34a853'; // Green - available
        } else if (occupancyRate < 0.8) {
            color = '#fbbc04'; // Yellow - moderately busy
        } else {
            color = '#ea4335'; // Red - busy
        }

        const icons = {
            library: 'M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 12.18L3.74 10 12 5.52 20.26 10 12 15.18zM12 21l-7-3.82V11l7 3.82 7-3.82v6.18L12 21z',
            cafe: 'M2 21v-2h18v2H2zm2-4v-6H2V9h2V3h14v6h2v2h-2v6h-2V9H6v8H4zm6-8h4V5h-4v4z',
            'study-room': 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z',
            outdoor: 'M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6z'
        };

        return {
            path: icons[type] || icons.library,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 1.5,
            anchor: new google.maps.Point(12, 12)
        };
    }

    // Show info window for a marker
    showInfoWindow(marker, space) {
        const occupancyPercent = space.capacity ? Math.round((space.currentOccupancy / space.capacity) * 100) : 0;
        let occupancyClass = 'low';
        if (occupancyPercent >= 50) occupancyClass = 'medium';
        if (occupancyPercent >= 80) occupancyClass = 'high';

        const content = `
            <div class="info-window">
                <h4>${space.name}</h4>
                <p>${space.address || 'Campus location'}</p>
                <div style="margin-bottom: 8px;">
                    <span style="font-size: 12px; color: #5f6368;">
                        Occupancy: ${space.currentOccupancy || 0}/${space.capacity || '?'} 
                        (${occupancyPercent}%)
                    </span>
                    <div class="occupancy-bar" style="margin-top: 4px;">
                        <div class="occupancy-fill ${occupancyClass}" style="width: ${occupancyPercent}%"></div>
                    </div>
                </div>
                ${space.amenities ? `
                    <div style="font-size: 12px; color: #80868b;">
                        ${space.amenities.map(a => `<span style="margin-right: 8px;">✓ ${a}</span>`).join('')}
                    </div>
                ` : ''}
                <button onclick="window.studySpacesModule.selectSpace('${space.id}')" 
                        class="btn btn-primary" style="margin-top: 8px; font-size: 12px; padding: 4px 12px;">
                    Get Directions
                </button>
            </div>
        `;

        this.infoWindow.setContent(content);
        this.infoWindow.open(this.map, marker);
    }

    // Clear all markers
    clearMarkers() {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
    }

    // Highlight a specific marker
    highlightMarker(spaceId) {
        this.markers.forEach(marker => {
            if (marker.spaceId === spaceId) {
                marker.setAnimation(google.maps.Animation.BOUNCE);
                setTimeout(() => marker.setAnimation(null), 1500);
                this.map.panTo(marker.getPosition());
                this.showInfoWindow(marker, marker.spaceData);
            }
        });
    }

    // Calculate distance between two points
    calculateDistance(from, to) {
        if (!window.google || !google.maps.geometry) return null;
        
        const fromLatLng = new google.maps.LatLng(from.lat, from.lng);
        const toLatLng = new google.maps.LatLng(to.lat, to.lng);
        
        return google.maps.geometry.spherical.computeDistanceBetween(fromLatLng, toLatLng);
    }

    // Get directions URL
    getDirectionsUrl(destination) {
        const destStr = `${destination.lat},${destination.lng}`;
        return `https://www.google.com/maps/dir/?api=1&destination=${destStr}&travelmode=walking`;
    }

    // Search for places nearby
    async searchNearby(location, type, radius = 1000) {
        return new Promise((resolve, reject) => {
            if (!this.map) {
                reject(new Error('Map not initialized'));
                return;
            }

            const service = new google.maps.places.PlacesService(this.map);
            const request = {
                location: location,
                radius: radius,
                type: type
            };

            service.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    resolve(results);
                } else {
                    reject(new Error(`Places search failed: ${status}`));
                }
            });
        });
    }

    // Custom map styles for a cleaner look
    getMapStyles() {
        return [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            },
            {
                featureType: 'transit',
                elementType: 'labels',
                stylers: [{ visibility: 'simplified' }]
            },
            {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#c9e9ff' }]
            },
            {
                featureType: 'landscape.man_made',
                elementType: 'geometry',
                stylers: [{ color: '#f5f5f5' }]
            },
            {
                featureType: 'road',
                elementType: 'geometry',
                stylers: [{ lightness: 50 }]
            }
        ];
    }
}

// Create global instance
window.mapsService = new MapsService();
