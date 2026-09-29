import { useEffect, useState } from 'react';
import { subscribeToSections } from '../services/firebase';

/**
 * Returns all sections as a flat array, and a tree structure for rendering.
 * Updates in real-time via Firestore onSnapshot.
 */
export function useSections() {
  const [sections, setSections] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const unsub = subscribeToSections((data) => {
      setSections(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  /** Build a tree from the flat array — supports infinite depth */
  const tree = buildTree(sections);

  return { sections, tree, loading };
}

/**
 * Build an infinite-depth tree from a flat parentId-linked list.
 * @param {Array} nodes - Flat array of { id, name, parentId, order }
 * @returns {Array} - Root-level nodes with `children` arrays recursively populated
 */
export function buildTree(nodes) {
  const map = {};
  nodes.forEach((n) => {
    map[n.id] = { ...n, children: [] };
  });

  const roots = [];
  nodes.forEach((n) => {
    if (n.parentId && map[n.parentId] && n.parentId !== n.id) {
      map[n.parentId].children.push(map[n.id]);
    } else {
      roots.push(map[n.id]);
    }
  });

  // Sort each level by order, protecting against cycles
  const visited = new Set();
  const sortByOrder = (arr) => {
    arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    arr.forEach((n) => {
      if (n && !visited.has(n.id)) {
        visited.add(n.id);
        sortByOrder(n.children);
      }
    });
    return arr;
  };

  return sortByOrder(roots);
}
