// =============================================================
// Firebase Auth Helpers
// =============================================================
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

/** Sign in the admin user */
export async function loginAdmin(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/** Sign out */
export async function logoutAdmin() {
  return signOut(auth);
}

/** Subscribe to auth state changes */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
