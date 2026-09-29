// =============================================================
// Firebase Initialization & Firestore Helpers
// =============================================================
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// All config values come from Vite env vars (injected at build time by GitHub Actions secrets)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check for missing config in dev — prevents blank screen crash
const isConfigured = Object.values(firebaseConfig).every(Boolean);
if (!isConfigured) {
  console.warn(
    '[CybrStudy] Firebase env vars not set. Copy .env.example to .env and fill in your values.\n' +
    'The app will render but Firestore and Auth will not work until you configure Firebase.'
  );
}

const app  = isConfigured ? initializeApp(firebaseConfig) : initializeApp({ apiKey: 'placeholder', projectId: 'placeholder', appId: 'placeholder' });
export const db   = getFirestore(app);
export const auth = getAuth(app);

// =============================================================
// Firestore Data Model
// =============================================================
// Collection: `sections`
// Document:
//   id          (auto)
//   name        string
//   parentId    string | null  (null = root section)
//   order       number
//   createdAt   Timestamp
//
// Collection: `files`
// Document:
//   id          (auto)
//   name        string
//   type        'pdf' | 'image'
//   sectionId   string         (which section it belongs to)
//   driveFileId string         (Google Drive file ID)
//   driveViewUrl string        (direct view/embed link)
//   driveDownloadUrl string    (direct download link)
//   size        number         (bytes)
//   createdAt   Timestamp
// =============================================================

// ---- Section helpers ----

export const sectionsRef = collection(db, 'sections');
export const filesRef    = collection(db, 'files');

/** Listen to all sections in real-time */
export function subscribeToSections(callback) {
  // No orderBy here — sort client-side to avoid needing a composite index
  const q = query(sectionsRef);
  return onSnapshot(q, (snapshot) => {
    const sections = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    callback(sections);
  }, (err) => {
    console.error('[CybrStudy] subscribeToSections error:', err);
    callback([]);
  });
}

/** Listen to files within a specific section */
export function subscribeToFiles(sectionId, callback) {
  // Only filter by sectionId — no orderBy to avoid requiring a composite index.
  // Files are sorted client-side by createdAt.
  const q = query(filesRef, where('sectionId', '==', sectionId));
  return onSnapshot(q, (snapshot) => {
    const files = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return ta - tb;
      });
    callback(files);
  }, (err) => {
    console.error('[CybrStudy] subscribeToFiles error:', err);
    callback([]);
  });
}

/** Get all files (for stats overview) */
export function subscribeToAllFiles(callback) {
  const q = query(filesRef);
  return onSnapshot(q, (snapshot) => {
    const files = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(files);
  }, (err) => {
    console.warn('[CybrStudy] subscribeToAllFiles notice:', err.message);
    callback([]);
  });
}

/** Create a new section */
export async function createSection(name, parentId = null, order = 0) {
  return addDoc(sectionsRef, {
    name,
    parentId,
    order,
    createdAt: serverTimestamp(),
  });
}

/** Rename a section */
export async function renameSection(sectionId, newName) {
  return updateDoc(doc(db, 'sections', sectionId), { name: newName });
}

/** Delete a section and all its children recursively */
export async function deleteSectionRecursive(sectionId) {
  // Delete all files in this section
  const filesSnap = await getDocs(query(filesRef, where('sectionId', '==', sectionId)));
  const fileDeletes = filesSnap.docs.map((d) => deleteDoc(d.ref));

  // Find all child sections
  const childSnap = await getDocs(query(sectionsRef, where('parentId', '==', sectionId)));
  const childDeletes = childSnap.docs.map((d) => deleteSectionRecursive(d.id));

  await Promise.all([...fileDeletes, ...childDeletes]);
  return deleteDoc(doc(db, 'sections', sectionId));
}

/** Add a file metadata record */
export async function addFileRecord(fileData) {
  return addDoc(filesRef, {
    ...fileData,
    createdAt: serverTimestamp(),
  });
}

/** Delete a file record */
export async function deleteFileRecord(fileId) {
  return deleteDoc(doc(db, 'files', fileId));
}

/** Rename a file (display name only — Drive filename is unchanged) */
export async function renameFile(fileId, newName) {
  return updateDoc(doc(db, 'files', fileId), { name: newName });
}

/** Move a file to a different section */
export async function moveFile(fileId, newSectionId) {
  return updateDoc(doc(db, 'files', fileId), { sectionId: newSectionId });
}

/** Get a single section */
export async function getSection(sectionId) {
  const snap = await getDoc(doc(db, 'sections', sectionId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
