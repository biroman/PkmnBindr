import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * Hook to track real user activity and update lastSeen timestamp
 * Tracks: page visibility, mouse movement, keyboard input, clicks
 */
export const useActivityTracking = () => {
  const { user } = useAuth();
  const lastUpdateRef = useRef(0);
  const timeoutRef = useRef(null);

  // Update lastSeen in Firebase (throttled to prevent excessive writes)
  const updateLastSeen = async () => {
    if (!user?.uid) return;

    const now = Date.now();
    // Only update if last update was more than 2 minutes ago
    if (now - lastUpdateRef.current < 2 * 60 * 1000) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        lastSeen: serverTimestamp(),
        lastActivity: new Date().toISOString(),
      });
      lastUpdateRef.current = now;
    } catch (error) {
      console.warn("Failed to update lastSeen:", error);
    }
  };

  // Debounced activity update
  const debouncedUpdate = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(updateLastSeen, 1000); // 1 second delay
  };

  useEffect(() => {
    if (!user) return;

    // Activity event handlers
    const handleActivity = () => {
      debouncedUpdate();
    };

    // Page visibility change (user switches tabs/minimizes)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User returned to tab
        debouncedUpdate();
      }
    };

    // Track various user activities
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initial activity update on mount
    debouncedUpdate();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user]);

  return null;
};
