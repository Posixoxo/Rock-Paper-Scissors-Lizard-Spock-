// ========================================
// FIREBASE CONFIGURATION
// ========================================
// Follow FIREBASE_SETUP.md to get your config values

const firebaseConfig = {
  apiKey: "AIzaSyCt8f0IxDTyAtJHzLm2b0_aaCGNSbjkQkc",
  authDomain: "rock-paper-scissors-500d1.firebaseapp.com",
  databaseURL: "https://rock-paper-scissors-500d1-default-rtdb.firebaseio.com",
  projectId: "rock-paper-scissors-500d1",
  storageBucket: "rock-paper-scissors-500d1.firebasestorage.app",
  messagingSenderId: "1020032397673",
  appId: "1:1020032397673:web:cdf919952622e56e290df8",
  measurementId: "G-KCXRN8QY95"
};

// Initialize Firebase
let database;

try {
  firebase.initializeApp(firebaseConfig);
  database = firebase.database();
  console.log('✅ Firebase connected successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  alert('Failed to connect to multiplayer server. Please refresh the page.');
}

// ========================================
// HELPER FUNCTIONS
// ========================================

// Generate random 6-character game code
function generateGameCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate unique player ID
function generatePlayerId() {
  return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Get timestamp
function getTimestamp() {
  return firebase.database.ServerValue.TIMESTAMP;
}

// ========================================
// EXPORTS (for multiplayer.js to use)
// ========================================
window.FirebaseHelper = {
  db: database,
  generateGameCode,
  generatePlayerId,
  getTimestamp
};