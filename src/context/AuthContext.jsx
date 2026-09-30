import { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  onAuthChange,
  checkIsAdmin,
  registerUserProfile,
  getOrCreateSessionId,
  logoutUser,
} from '../services/authService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(undefined); // undefined = loading, null = logged out
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const sessionListenerUnsubRef = useRef(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthChange(async (firebaseUser) => {
      // Detach any previous Firestore session listener
      if (sessionListenerUnsubRef.current) {
        sessionListenerUnsubRef.current();
        sessionListenerUnsubRef.current = null;
      }

      setUser(firebaseUser);

      if (firebaseUser?.uid) {
        // Register/refresh profile lastSeen
        registerUserProfile(firebaseUser);

        // Check if admin
        const adminStatus = await checkIsAdmin(firebaseUser.email);
        setIsAdmin(adminStatus);

        // Ensure this browser has a persistent session identifier in localStorage
        const localSessionId = getOrCreateSessionId();

        // Real-time listener for single active device enforcement
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        sessionListenerUnsubRef.current = onSnapshot(userDocRef, (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          const serverSessionId = data?.currentSessionId;

          // If no session is recorded in Firestore yet (e.g. existing user before update), stamp it
          if (!serverSessionId) {
            registerUserProfile(firebaseUser, localSessionId);
            return;
          }

          // If the session in Firestore changed to another device, terminate this session
          if (serverSessionId !== localSessionId) {
            console.warn('[CybrStudy] Account was logged in from another device. Terminating this session.');
            sessionStorage.setItem('cybrstudy_kicked_reason', 'another_device');
            logoutUser().finally(() => {
              setUser(null);
              setIsAdmin(false);
            });
          }
        }, (err) => {
          console.warn('[CybrStudy] Session listener warning:', err.message);
        });
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (sessionListenerUnsubRef.current) {
        sessionListenerUnsubRef.current();
        sessionListenerUnsubRef.current = null;
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

