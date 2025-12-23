# 🎓 Smart Campus Community App

A comprehensive web application that helps students find study spaces, connect with mentors, and get AI-powered reading recommendations. Built with Google Cloud technologies including Firebase, Google Maps API, and Gemini AI.

![Smart Campus Banner](https://via.placeholder.com/1200x400/4285f4/ffffff?text=Smart+Campus+Community)

## ✨ Features

### 📚 Study Space Finder
- **Real-time availability** - See which study spots are available right now
- **Interactive map** - Powered by Google Maps API with custom markers
- **Smart filtering** - Filter by type (library, café, study room) and availability
- **Amenity tracking** - Know what each space offers (WiFi, power outlets, coffee, etc.)
- **Occupancy indicators** - Color-coded availability status
- **Geolocation** - Find spaces nearest to you
- **Directions** - One-click navigation to any study space

### 🤝 Mentor-Mentee Connector
- **Expert network** - Connect with alumni and industry professionals
- **Field filtering** - Find mentors in Technology, Business, Science, Arts, Engineering, Healthcare
- **Search functionality** - Search by name, title, or skills
- **Rating system** - See mentor ratings and reviews
- **Connection requests** - Send personalized mentorship requests
- **Availability status** - Know when mentors are available
- **Become a mentor** - Register to help fellow students

### 📖 AI Reading Curator
- **Personalized recommendations** - AI-powered book and article suggestions
- **Conversational interface** - Natural language chat with Gemini AI
- **Quick prompts** - Pre-built queries for common topics
- **Book cards** - Structured recommendations with author info
- **Save lists** - Store reading lists to your profile
- **Trending topics** - Explore popular academic subjects

## 🛠️ Technology Stack

| Technology | Purpose |
|------------|---------|
| **Firebase Auth** | User authentication (Email + Google) |
| **Cloud Firestore** | Real-time database for all data |
| **Google Maps API** | Interactive maps and geolocation |
| **Gemini AI** | AI-powered reading recommendations |
| **Vanilla JavaScript** | Modern ES6+ with modular architecture |
| **CSS3** | Custom properties, Grid, Flexbox |

## 🚀 Getting Started

### Prerequisites
- A Google Cloud Platform account
- Firebase project
- Node.js (optional, for local development server)

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" and follow the setup wizard
3. Enable **Authentication** with Email/Password and Google providers
4. Enable **Cloud Firestore** and create a database
5. Go to Project Settings > General > Your apps > Add web app
6. Copy your Firebase configuration

### Step 2: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select your Firebase project
3. Enable the **Maps JavaScript API** and **Places API**
4. Go to APIs & Services > Credentials > Create Credentials > API Key
5. Restrict the API key to your domains for security

### Step 3: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click "Get API Key"
3. Create a new API key or use an existing one

### Step 4: Configure the App

Open `js/config/firebase-config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
```

### Step 5: Set Up Firestore Security Rules

In Firebase Console > Firestore > Rules, add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Study spaces - readable by all, writable by authenticated users
    match /studySpaces/{spaceId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        get(/databases/$(database)/documents/studySpaces/$(spaceId)).data.createdBy == request.auth.uid;
    }
    
    // Mentors
    match /mentors/{mentorId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == mentorId;
    }
    
    // Mentorship requests
    match /mentorshipRequests/{requestId} {
      allow read: if request.auth != null && 
        (resource.data.mentorId == request.auth.uid || resource.data.menteeId == request.auth.uid);
      allow create: if request.auth != null;
      allow update: if request.auth != null && resource.data.mentorId == request.auth.uid;
    }
    
    // Reading lists
    match /readingLists/{listId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
  }
}
```

### Step 6: Run the Application

**Option A: Using npm (recommended)**
```bash
npm install
npm start
```

**Option B: Using Python**
```bash
python -m http.server 3000
```

**Option C: Using VS Code Live Server**
- Install the "Live Server" extension
- Right-click `index.html` > "Open with Live Server"

Open your browser to `http://localhost:3000`

## 📁 Project Structure

```
smart-campus-community/
├── index.html              # Main HTML file
├── package.json            # npm configuration
├── README.md               # This file
├── css/
│   ├── styles.css          # Main styles
│   └── components.css      # Component styles
└── js/
    ├── app.js              # Main app controller
    ├── config/
    │   └── firebase-config.js  # API keys and config
    ├── services/
    │   ├── firebase-service.js # Firebase operations
    │   ├── maps-service.js     # Google Maps operations
    │   └── gemini-service.js   # Gemini AI operations
    └── modules/
        ├── study-spaces.js     # Study space finder
        ├── mentorship.js       # Mentor-mentee connector
        └── reading-curator.js  # AI reading curator
```

## 🗄️ Database Schema

### Collections

**users**
```json
{
  "uid": "string",
  "email": "string",
  "displayName": "string",
  "photoURL": "string",
  "major": "string",
  "year": "number",
  "interests": ["string"],
  "createdAt": "timestamp"
}
```

**studySpaces**
```json
{
  "name": "string",
  "type": "library | cafe | study-room | outdoor",
  "address": "string",
  "location": { "lat": "number", "lng": "number" },
  "capacity": "number",
  "currentOccupancy": "number",
  "noiseLevel": "quiet | moderate | lively",
  "amenities": ["wifi", "power", "coffee", "printing", "whiteboard"],
  "hours": "string",
  "createdBy": "uid",
  "createdAt": "timestamp"
}
```

**mentors**
```json
{
  "userId": "uid",
  "name": "string",
  "title": "string",
  "bio": "string",
  "expertise": ["string"],
  "skills": ["string"],
  "availability": "weekdays | weekends | evenings | flexible",
  "isAvailable": "boolean",
  "rating": "number",
  "reviewCount": "number",
  "linkedIn": "string",
  "photoURL": "string"
}
```

**mentorshipRequests**
```json
{
  "mentorId": "uid",
  "menteeId": "uid",
  "menteeName": "string",
  "message": "string",
  "status": "pending | accepted | declined",
  "createdAt": "timestamp"
}
```

**readingLists**
```json
{
  "userId": "uid",
  "title": "string",
  "books": [
    {
      "title": "string",
      "author": "string",
      "description": "string"
    }
  ],
  "source": "ai-curator",
  "createdAt": "timestamp"
}
```

## 🎨 Customization

### Theme Colors
Edit CSS variables in `css/styles.css`:

```css
:root {
    --primary-500: #4285f4;  /* Main brand color */
    --primary-600: #1a73e8;  /* Darker variant */
    --secondary-500: #34a853; /* Success/secondary */
    --accent-yellow: #fbbc04; /* Warning */
    --accent-red: #ea4335;    /* Error */
}
```

### Adding New Study Spaces
Spaces can be added through the UI (requires sign-in) or directly in Firestore.

### Adding Demo Data
The app includes demo data that loads when Firestore is empty. Modify the `getDemoSpaces()` and `getDemoMentors()` methods in their respective modules.

## 🔒 Security Best Practices

1. **Restrict API keys** to specific domains in Google Cloud Console
2. **Enable App Check** in Firebase for additional security
3. **Use Firestore rules** to protect user data
4. **Never commit** API keys to version control
5. **Enable reCAPTCHA** for authentication

## 📱 Mobile Support

The app is fully responsive and works on:
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Tablets
- Mobile devices (iOS Safari, Android Chrome)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Cloud Platform for the amazing services
- Firebase team for the real-time database
- Google Maps Platform for mapping services
- Google AI for Gemini API

## 📧 Support

For questions or issues, please open a GitHub issue or contact the development team.

---

Built with ❤️ for students, by students. Powered by Google Cloud.
