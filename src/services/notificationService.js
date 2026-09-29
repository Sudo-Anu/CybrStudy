// =============================================================
// Notification Service — Firestore CRUD for `notifications`
// =============================================================
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export const notificationsRef = collection(db, 'notifications');

// ---- Firestore document shape ----
// id          (auto)
// title       string        — short headline
// body        string        — optional description / sub-text
// type        'info' | 'warning' | 'success' | 'urgent'
// linkUrl     string | ''   — external URL (blank = no link)
// linkLabel   string | ''   — CTA button label, e.g. "Learn more"
// active      boolean       — visible on homepage only when true
// order       number        — lower = higher on page
// createdAt   Timestamp
// updatedAt   Timestamp

/** Subscribe to all notifications in real-time, sorted by order asc */
export function subscribeToNotifications(callback, onError) {
  const q = query(notificationsRef, orderBy('order', 'asc'));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.error('[CybrStudy] subscribeToNotifications:', err);
      if (onError) onError(err);
      else callback([]);
    }
  );
}

/** Subscribe to only active notifications (for homepage) */
export function subscribeToActiveNotifications(callback, onError) {
  // We filter client-side to avoid needing a composite index on (active + order).
  const q = query(notificationsRef, orderBy('order', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(all.filter((n) => n.active !== false));
    },
    (err) => {
      console.error('[CybrStudy] subscribeToActiveNotifications:', err);
      if (onError) onError(err);
      else callback([]);
    }
  );
}

/** Create a new notification */
export async function createNotification(data) {
  return addDoc(notificationsRef, {
    title:      data.title || '',
    body:       data.body || '',
    type:       data.type || 'info',
    linkUrl:    data.linkUrl || '',
    linkLabel:  data.linkLabel || '',
    active:     data.active !== false,
    order:      typeof data.order === 'number' ? data.order : 0,
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp(),
  });
}

/** Update an existing notification */
export async function updateNotification(id, data) {
  return updateDoc(doc(db, 'notifications', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Delete a notification */
export async function deleteNotification(id) {
  return deleteDoc(doc(db, 'notifications', id));
}

/** Toggle active flag */
export async function toggleNotificationActive(id, currentActive) {
  return updateDoc(doc(db, 'notifications', id), {
    active:    !currentActive,
    updatedAt: serverTimestamp(),
  });
}
