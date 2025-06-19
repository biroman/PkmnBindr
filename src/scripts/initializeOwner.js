import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { UserRoleService } from "../services/UserRoleService.js";

// Firebase config (same as your main config)
const firebaseConfig = {
  // Add your config here - this should match your main firebase config
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/**
 * Script to initialize the first owner
 * Usage: node src/scripts/initializeOwner.js [email] [password]
 */
async function initializeOwner() {
  try {
    // Get email and password from command line arguments
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
      console.error("❌ Usage: node initializeOwner.js [email] [password]");
      process.exit(1);
    }

    console.log("🔄 Initializing owner for:", email);

    // Sign in with the provided credentials
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    console.log("✅ Successfully authenticated user:", user.uid);

    // Check if user already has owner role
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.role === "owner") {
        console.log("⚠️  User already has owner role");
        return;
      }
    }

    // Initialize as owner
    await UserRoleService.initializeFirstOwner(user.uid);

    console.log("🎉 Successfully initialized owner role!");
    console.log("📧 Email:", email);
    console.log("🆔 User ID:", user.uid);
    console.log("");
    console.log("⚠️  IMPORTANT: Delete this script after use for security!");
    console.log("🔒 Remove hardcoded credentials and update Firestore rules");
  } catch (error) {
    console.error("❌ Error initializing owner:", error.message);
    process.exit(1);
  }
}

// Run the script
initializeOwner();
