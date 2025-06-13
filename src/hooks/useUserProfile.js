import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

const useUserProfile = (user) => {
  const [userProfile, setUserProfile] = useState(user);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setUserProfile(user);
      return;
    }

    setIsLoading(true);

    // Set up real-time listener for user profile updates
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          // Merge with current user data from auth
          setUserProfile({
            ...user,
            ...userData,
            // Ensure we keep essential auth data
            uid: user.uid,
            email: user.email || userData.email,
          });
        } else {
          setUserProfile(user);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Error listening to user profile:", error);
        setUserProfile(user);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const updateUserProfile = (updates) => {
    setUserProfile((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  return {
    userProfile,
    isLoading,
    updateUserProfile,
  };
};

export default useUserProfile;
