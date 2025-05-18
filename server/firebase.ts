import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';
import admin from 'firebase-admin';

// Check if Firebase is properly configured
export const isFirebaseConfigured = () => {
  console.log('Checking Firebase configuration...');
  console.log('API_KEY:', !!process.env.FIREBASE_API_KEY);
  console.log('PROJECT_ID:', !!process.env.FIREBASE_PROJECT_ID);
  console.log('AUTH_DOMAIN:', !!process.env.FIREBASE_AUTH_DOMAIN);
  console.log('DATABASE_URL:', !!process.env.FIREBASE_DATABASE_URL);
  
  return process.env.FIREBASE_API_KEY && 
         process.env.FIREBASE_PROJECT_ID &&
         process.env.FIREBASE_AUTH_DOMAIN;
};

// Firebase client variables
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let rtdb: Database | null = null;
let auth: Auth | null = null;

// Initialize Firebase client only if properly configured
if (isFirebaseConfigured()) {
  try {
    console.log('Initializing Firebase...');
    // Firebase client configuration
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      databaseURL: process.env.FIREBASE_DATABASE_URL
    };

    // Initialize Firebase client
    app = initializeApp(firebaseConfig);

    // Initialize Firestore
    db = getFirestore(app);
    console.log('Firestore initialized');

    // Initialize Realtime Database only if database URL is provided
    if (process.env.FIREBASE_DATABASE_URL) {
      rtdb = getDatabase(app);
      console.log('Realtime Database initialized');
    }

    // Initialize Authentication
    auth = getAuth(app);
    console.log('Authentication initialized');
    
    console.log('Firebase client initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase client:', error);
  }
}

// Export Firebase services with null-checking
export const getFirestoreDb = () => db;
export const getRealtimeDb = () => rtdb;
export const getFirebaseAuth = () => auth;

// Initialize Firebase Admin SDK (for server-side operations)
// Using environment variables for service account credentials
let adminInitialized = false;
let adminFirestoreInstance: admin.firestore.Firestore | null = null;
let adminRtdbInstance: admin.database.Database | null = null;

export function initializeAdminSDK() {
  // Only initialize if Firebase is properly configured and not already initialized
  if (adminInitialized || !isFirebaseConfigured()) {
    return;
  }
  
  try {
    console.log('Initializing Firebase Admin SDK...');
    // Check if we have proper configuration
    if (!process.env.FIREBASE_PROJECT_ID) {
      console.warn('Firebase Admin SDK initialization skipped: No project ID provided');
      return;
    }
    
    let adminApp;
    
    // Check if we have service account credentials as environment variables
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        adminApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL,
          projectId: process.env.FIREBASE_PROJECT_ID
        });
        console.log('Firebase Admin SDK service account loaded');
      } catch (parseError) {
        console.error('Error parsing Firebase service account JSON:', parseError);
        return;
      }
    } else {
      // Skip initialization if we don't have service account or proper configuration
      console.warn('Firebase Admin SDK initialization skipped: No service account provided');
      return;
    }
    
    // Initialize Firestore
    try {
      adminFirestoreInstance = admin.firestore(adminApp);
      console.log('Admin Firestore initialized');
    } catch (firestoreError) {
      console.error('Error initializing Admin Firestore:', firestoreError);
    }
    
    // Initialize Realtime Database if URL is provided
    if (process.env.FIREBASE_DATABASE_URL) {
      try {
        adminRtdbInstance = admin.database(adminApp);
        console.log('Admin Realtime Database initialized');
      } catch (rtdbError) {
        console.error('Error initializing Admin Realtime Database:', rtdbError);
      }
    }
    
    adminInitialized = true;
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
  }
}

// Export admin SDK database references with safety checks
export const adminFirestore = () => {
  if (!adminInitialized && isFirebaseConfigured()) {
    initializeAdminSDK();
  }
  return adminFirestoreInstance;
};

export const adminRtdb = () => {
  if (!adminInitialized && isFirebaseConfigured()) {
    initializeAdminSDK();
  }
  return adminRtdbInstance;
};

// Safe default export
export default {
  getFirestoreDb,
  getRealtimeDb,
  getFirebaseAuth,
  adminFirestore,
  adminRtdb,
  isFirebaseConfigured
};