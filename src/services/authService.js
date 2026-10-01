// =============================================================
// Firebase Auth Helpers
// =============================================================
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';

// ---- Device Session Tracking (Single Device Enforcement) --------
const SESSION_KEY = 'cybrstudy_session_id';

/** Get current session ID from localStorage */
export function getCurrentSessionId() {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

/** Generate and save a new random session ID */
export function createNewSessionId() {
  const sid = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  try {
    localStorage.setItem(SESSION_KEY, sid);
  } catch (err) {
    console.warn('[CybrStudy] localStorage access failed:', err);
  }
  return sid;
}

/** Ensure a session ID exists locally */
export function getOrCreateSessionId() {
  let sid = getCurrentSessionId();
  if (!sid) {
    sid = createNewSessionId();
  }
  return sid;
}

/** Clear local session ID */
export function clearSessionId() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

// ---- Auth -------------------------------------------------------

/** Sign in the admin user */
export async function loginUser(email, password) {
  const newSid = createNewSessionId();
  const credential = await signInWithEmailAndPassword(auth, email, password);

  // Check if account has been disabled/deactivated by admin
  try {
    const userDocSnap = await getDoc(doc(db, 'users', credential.user.uid));
    if (userDocSnap.exists() && userDocSnap.data()?.disabled) {
      clearSessionId();
      await signOut(auth);
      throw new Error('This account has been deactivated by an administrator.');
    }
  } catch (err) {
    if (err.message?.includes('deactivated') || err.message?.includes('disabled')) {
      throw err;
    }
  }

  await registerUserProfile(credential.user, newSid);
  return credential;
}
export const loginAdmin = loginUser;

/** Sign out (shared for admin and regular users) */
export async function logoutAdmin() {
  clearSessionId();
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
 * If explicitSessionId is provided, currentSessionId is updated.
 */
export async function registerUserProfile(firebaseUser, explicitSessionId = null) {
  if (!firebaseUser) return;
  try {
    const updateData = {
      uid:         firebaseUser.uid,
      email:       firebaseUser.email?.toLowerCase().trim() || '',
      displayName: firebaseUser.displayName || '',
      lastSeen:    serverTimestamp(),
    };
    if (explicitSessionId) {
      updateData.currentSessionId = explicitSessionId;
      updateData.sessionUpdatedAt = serverTimestamp();
    }
    await setDoc(
      doc(db, 'users', firebaseUser.uid),
      updateData,
      { merge: true }   // merge so we don't overwrite createdAt on re-login
    );
  } catch (err) {
    console.warn('[CybrStudy] registerUserProfile failed:', err.message);
  }
}

/**
 * Fetch all users from the `users` and `admins` collections (admin only).
 * Merges both collections so admins with or without existing user docs are always included.
 * Returns array of { uid, email, displayName, lastSeen, isAdmin, disabled }.
 */
export async function getAllUsers() {
  const adminEmails = new Set();
  const userMap = new Map();

  // 1. Fetch admins collection
  try {
    const adminsSnap = await getDocs(collection(db, 'admins'));
    adminsSnap.docs.forEach((d) => {
      const email = (d.data()?.email || d.id || '').toLowerCase().trim();
      if (email) adminEmails.add(email);
    });
  } catch (err) {
    console.warn('[CybrStudy] Could not query admins collection:', err);
  }

  // 2. Fetch users collection
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    usersSnap.docs.forEach((d) => {
      const data = d.data() || {};
      const userEmail = (data.email || '').toLowerCase().trim();
      if (!userEmail) return;
      userMap.set(userEmail, {
        uid: d.id,
        email: userEmail,
        displayName: data.displayName || userEmail.split('@')[0],
        lastSeen: data.lastSeen || null,
        createdAt: data.createdAt || null,
        disabled: Boolean(data.disabled),
        isAdmin: adminEmails.has(userEmail) || data.isAdmin === true,
      });
    });
  } catch (err) {
    console.warn('[CybrStudy] Could not query users collection:', err);
  }

  // 3. Ensure any admin not present in `users` collection is still listed
  for (const adminEmail of adminEmails) {
    if (!userMap.has(adminEmail)) {
      userMap.set(adminEmail, {
        uid: `admin_${adminEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: adminEmail,
        displayName: adminEmail.split('@')[0],
        lastSeen: null,
        createdAt: null,
        disabled: false,
        isAdmin: true,
      });
    }
  }

  return Array.from(userMap.values());
}

// ---- Role & Status management -----------------------------------

/**
 * Promote a user to admin — creates `admins/<email>` document
 * and sets isAdmin: true on users/<uid> if known.
 * @param {string} email
 * @param {string} [uid]
 */
export async function promoteToAdmin(email, uid = null) {
  if (!email) return;
  const normalized = email.toLowerCase().trim();
  await setDoc(doc(db, 'admins', normalized), { email: normalized, grantedAt: serverTimestamp() });
  if (uid && !uid.startsWith('admin_')) {
    await setDoc(doc(db, 'users', uid), { isAdmin: true }, { merge: true }).catch(() => {});
  }
}

/**
 * Demote a user from admin — deletes `admins/<email>` document
 * and sets isAdmin: false on users/<uid> if known.
 * @param {string} email
 * @param {string} [uid]
 */
export async function demoteFromAdmin(email, uid = null) {
  if (!email) return;
  const normalized = email.toLowerCase().trim();
  await deleteDoc(doc(db, 'admins', normalized));
  if (uid && !uid.startsWith('admin_')) {
    await setDoc(doc(db, 'users', uid), { isAdmin: false }, { merge: true }).catch(() => {});
  }
}

/**
 * Enable or disable a user account.
 * When disabled, the user is immediately kicked from active sessions and barred from login.
 * @param {string} uid
 * @param {string} email
 * @param {boolean} disabled
 */
export async function setUserDisabledStatus(uid, email, disabled) {
  const normalized = (email || '').toLowerCase().trim();
  if (uid && !uid.startsWith('admin_')) {
    await setDoc(
      doc(db, 'users', uid),
      { disabled, statusUpdatedAt: serverTimestamp() },
      { merge: true }
    );
  } else if (normalized) {
    // If no existing Firestore user doc, create a stub to block login
    const stubId = `user_${normalized.replace(/[^a-zA-Z0-9]/g, '_')}`;
    await setDoc(
      doc(db, 'users', stubId),
      { uid: stubId, email: normalized, disabled, statusUpdatedAt: serverTimestamp() },
      { merge: true }
    );
  }
}

/**
 * Create a Firebase Auth account for a user (admin only).
 * If the account already exists in Firebase Auth, links them to Firestore gracefully.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 * @param {boolean} makeAdmin
 */
export async function createUserAccount(email, password, displayName = '', makeAdmin = false) {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Firebase API key is missing in environment variables.');
  const normalizedEmail = email.toLowerCase().trim();

  let localId = null;
  let alreadyExists = false;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password, returnSecureToken: false }),
    }
  );
  const data = await res.json();
  if (res.ok) {
    localId = data.localId;
  } else {
    const code = data?.error?.message ?? 'UNKNOWN';
    if (code === 'EMAIL_EXISTS') {
      alreadyExists = true;
    } else if (code.includes('WEAK_PASSWORD')) {
      throw new Error('Password must be at least 6 characters.');
    } else if (code === 'INVALID_EMAIL') {
      throw new Error('Please enter a valid email address.');
    } else if (code === 'OPERATION_NOT_ALLOWED') {
      throw new Error('Email/password accounts are not enabled in Firebase Auth console.');
    } else {
      throw new Error(data?.error?.message ?? 'Failed to create account.');
    }
  }

  const docId = localId || `user_${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // Write profile into Firestore
  await setDoc(
    doc(db, 'users', docId),
    {
      uid: docId,
      email: normalizedEmail,
      displayName: displayName || normalizedEmail.split('@')[0],
      isAdmin: makeAdmin,
      disabled: false,
      lastSeen: null,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  // If designated as admin, register in admins collection
  if (makeAdmin) {
    await promoteToAdmin(normalizedEmail, docId);
  }

  return { uid: docId, alreadyExists };
}

/**
 * Remove a user record from Firestore and revoke admin if set.
 * Also marks disabled: true to prevent future logins even if auth record lingers.
 * @param {{ uid: string, email: string }} userRecord
 */
export async function removeUserRecord({ uid, email }) {
  const normalized = (email || '').toLowerCase().trim();
  const ops = [];

  if (uid && !uid.startsWith('admin_')) {
    ops.push(deleteDoc(doc(db, 'users', uid)).catch(() => {}));
  }
  if (normalized) {
    ops.push(deleteDoc(doc(db, 'admins', normalized)).catch(() => {}));
  }

  await Promise.all(ops);
}

