// =============================================================
// Firebase Auth Helpers
// =============================================================
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';

// ---- Auth -------------------------------------------------------

/** Sign in the admin user */
export async function loginAdmin(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Sign in a regular user.
 * Same Firebase Auth, distinction is the redirect destination.
 */
export async function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/** Sign out (shared for admin and regular users) */
export async function logoutAdmin() {
  return signOut(auth);
}
export const logoutUser = logoutAdmin;

/** Subscribe to auth state changes */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ---- Admin check ------------------------------------------------

/**
 * Check if an email is in the `admins` collection.
 * Document ID = lowercase email address.
 */
export async function checkIsAdmin(email) {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  try {
    const snap = await getDoc(doc(db, 'admins', normalized));
    return snap.exists();
  } catch {
    return false;
  }
}

// ---- User registry ----------------------------------------------

/**
 * Upsert the signed-in user's profile into the `users` collection.
 * Called from AuthContext after every successful sign-in.
 * Document ID = uid (stable, even if email changes).
 */
export async function registerUserProfile(firebaseUser) {
  if (!firebaseUser) return;
  try {
    await setDoc(
      doc(db, 'users', firebaseUser.uid),
      {
        uid:         firebaseUser.uid,
        email:       firebaseUser.email?.toLowerCase().trim() || '',
        displayName: firebaseUser.displayName || '',
        lastSeen:    serverTimestamp(),
      },
      { merge: true }   // merge so we don't overwrite createdAt on re-login
    );
  } catch (err) {
    console.warn('[CybrStudy] registerUserProfile failed:', err.message);
  }
}

/**
 * Fetch all users from the `users` collection (admin only).
 * Returns array of { uid, email, displayName, lastSeen, isAdmin }.
 */
export async function getAllUsers() {
  const [usersSnap, adminsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'admins')),
  ]);
  const adminEmails = new Set(adminsSnap.docs.map((d) => d.id.toLowerCase().trim()));
  return usersSnap.docs.map((d) => {
    const data = d.data();
    const userEmail = (data.email || '').toLowerCase().trim();
    return {
      ...data,
      isAdmin: adminEmails.has(userEmail),
    };
  });
}

// ---- Role management --------------------------------------------

/**
 * Promote a user to admin — creates `admins/<email>` document.
 * @param {string} email
 */
export async function promoteToAdmin(email) {
  if (!email) return;
  const normalized = email.toLowerCase().trim();
  await setDoc(doc(db, 'admins', normalized), { email: normalized, grantedAt: serverTimestamp() });
}

/**
 * Demote a user from admin — deletes `admins/<email>` document.
 * @param {string} email
 */
export async function demoteFromAdmin(email) {
  if (!email) return;
  const normalized = email.toLowerCase().trim();
  await deleteDoc(doc(db, 'admins', normalized));
}

/**
 * Create a real Firebase Auth account for a new user (admin only).
 * Uses the Firebase Auth REST API so the admin's own session is NOT affected.
 * Returns the new user's uid.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 */
export async function createUserAccount(email, password, displayName = '') {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Firebase API key is missing in environment variables.');
  const normalizedEmail = email.toLowerCase().trim();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password, returnSecureToken: false }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    // Surface a friendly message for common errors
    const code = data?.error?.message ?? 'UNKNOWN';
    if (code === 'EMAIL_EXISTS') throw new Error('An account with this email already exists.');
    if (code.includes('WEAK_PASSWORD')) {
      throw new Error('Password must be at least 6 characters.');
    }
    if (code === 'INVALID_EMAIL') throw new Error('Please enter a valid email address.');
    if (code === 'OPERATION_NOT_ALLOWED') throw new Error('Email/password accounts are not enabled in Firebase Auth console.');
    throw new Error(data?.error?.message ?? 'Failed to create account.');
  }
  // Write their profile into Firestore immediately with the given displayName
  await setDoc(
    doc(db, 'users', data.localId),
    { uid: data.localId, email: normalizedEmail, displayName: displayName || '', lastSeen: null },
    { merge: true }
  );
  return data.localId;
}

/**
 * Remove a user record from the `users` collection and revoke admin if set.
 * @param {{ uid: string, email: string }} userRecord
 */
export async function removeUserRecord({ uid, email }) {
  const normalized = (email || '').toLowerCase().trim();
  await Promise.all([
    deleteDoc(doc(db, 'users', uid)),
    // Also remove from admins if they had it — safe to attempt even if doc doesn't exist
    normalized ? deleteDoc(doc(db, 'admins', normalized)).catch(() => {}) : Promise.resolve(),
  ]);
}

