// Firebase Configuration
// Replace these values with your actual Firebase project configuration
// Get these from: Firebase Console > Project Settings > General > Your apps > Firebase SDK snippet

const firebaseConfig = {
    apiKey: "AIzaSyDgQu5f24OeQDII3aoAJpbqgz0jqk9S9UI",
    authDomain: "smart-campus-community.firebaseapp.com",
    projectId: "smart-campus-community",
    storageBucket: "smart-campus-community.firebasestorage.app",
    messagingSenderId: "349107511950",
    appId: "1:349107511950:web:a6e28f87d0691c5e0cdfdf",
    measurementId: "G-1CSKNM80C0"
};

// Google Maps API Key  
// Get this from: Google Cloud Console > APIs & Services > Credentials
const GOOGLE_MAPS_API_KEY = "AIzaSyDz1zL32QqUOAE4jlPJ4R8p2ZXm0g1kM8w";

// Gemini API Key (for AI Reading Curator)
// Get this from: Google AI Studio > API Keys
const GEMINI_API_KEY = "AIzaSyBugRPAohY0KR6hQ8FjWt_5J9D_S_if4EA";

// Export configurations
window.APP_CONFIG = {
    firebase: firebaseConfig,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    geminiApiKey: GEMINI_API_KEY
};
