import { useEffect, useState } from 'react';
import { subscribeToFiles, subscribeToAllFiles } from '../services/firebase';

/**
 * Real-time subscription to files in a given section.
 * @param {string|null} sectionId
 */
export function useFiles(sectionId) {
  const [files,   setFiles]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sectionId) {
      setFiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToFiles(sectionId, (data) => {
      setFiles(data);
      setLoading(false);
    });
    return unsub;
  }, [sectionId]);

  return { files, loading };
}

/**
 * Real-time subscription to all files across all sections.
 */
export function useAllFiles() {
  const [files,   setFiles]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAllFiles((data) => {
      setFiles(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { files, loading };
}

