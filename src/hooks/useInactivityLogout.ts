import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

export function useInactivityLogout() {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (user) {
      timeoutRef.current = setTimeout(() => {
        console.log("User inactive for 10 minutes, logging out...");
        signOut();
      }, INACTIVITY_TIMEOUT);
    }
  }, [user, signOut]);

  useEffect(() => {
    if (!user) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    // Start the timer
    resetTimer();

    // Reset timer on user activity
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [user, resetTimer]);

  return null;
}
