import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize App Check
try {
  if (import.meta.env.DEV && import.meta.env.VITE_APPCHECK_DEBUG_TOKEN) {
    // Development mode with debug token
    console.log("App Check: Using debug token for development");
    // Set the debug token globally for development
    self.FIREBASE_APPCHECK_DEBUG_TOKEN =
      import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;

    // Initialize App Check with ReCAPTCHA provider (required even in debug mode)
    if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(
          import.meta.env.VITE_RECAPTCHA_SITE_KEY
        ),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } else if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
    // Production mode with ReCAPTCHA
    console.log("App Check: Using ReCAPTCHA provider for production");
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(
        import.meta.env.VITE_RECAPTCHA_SITE_KEY
      ),
      isTokenAutoRefreshEnabled: true,
    });
  } else {
    console.warn(
      "App Check: No provider configured - add VITE_RECAPTCHA_SITE_KEY"
    );
  }
} catch (error) {
  console.error("App Check initialization failed:", error);
  // Don't throw - let the app continue without App Check
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
