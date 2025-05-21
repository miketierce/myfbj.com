// Explicit Firebase configuration
// This ensures we have a centralized place to define the Firebase config
// which can be used across the application

export default {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCmy3GWGS87lG-DPPi_Zvos2DoUEgcS9ME",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "dev-our-fbj.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "dev-our-fbj",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "dev-our-fbj.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "914399023591",
  appId: process.env.FIREBASE_APP_ID || "1:914399023591:web:ec5a51bbc6894c122a2d42",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-YJ1WDSRLJM"
}