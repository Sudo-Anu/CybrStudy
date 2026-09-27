import { useState } from 'react';
import {
  createSection,
  renameSection,
  deleteSectionRecursive,
} from '../../services/firebase';
import { useToast } from '../../context/ToastContext';
import Modal from '../ui/Modal';

// ---- Recursive Node Component ----
function SectionNode({ node, depth = 0, onSelectSection, selectedSectionId }) {
  const [isOpen,   setIsOpen]   = useState(depth === 0);
  const [editing,  setEditing]  = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [loading,  setLoading]  = useState(false);
  const { addToast } = useToast();

  const isSelected = selectedSectionId === node.id;

  const handleRename = async (e) => {
    e.preventDefault();
    if (!editName.trim() || editName === node.name) { setEditing(false); return; }
    setLoading(true);
    try {
      await renameSection(node.id, editName.trim());
      addToast('Section renamed.', 'success');
    } catch (err) {
      addToast('Failed to rename: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${node.name}" and ALL its contents? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await deleteSectionRecursive(node.id);
      addToast(`"${node.name}" deleted.`, 'success');
    } catch (err) {
      addToast('Delete failed: ' + err.message, 'error');
      setLoading(false);
    }
  };

  const handleAddChild = async () => {
    const name = window.prompt(`New subsection inside "${node.name}":`);
    if (!name?.trim()) return;
    try {
      await createSection(name.trim(), node.id, node.children?.length ?? 0);
      setIsOpen(true);
      addToast(`"${name}" created.`, 'success');
    } catch (err) {
      addToast('Failed to create: ' + err.message, 'error');
    }
  };

  const indentPx = depth * 20;

  return (
    <li style={{ listStyle: 'none' }}>
      <div
        className="section-node"
        style={{ marginLeft: indentPx, borderColor: isSelected ? 'var(--color-accent)' : undefined }}
      >
        <div className="section-node-header">
          {/* Expand/Collapse toggle */}
          <button
            onClick={() => setIsOpen((v) => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-3)', padding: 2, flexShrink: 0,
              transform: isOpen ? 'rotate(90deg)' : 'none',
              transition: 'transform var(--transition-fast)',
            }}
            aria-label={isOpen ? 'Collapse section' : 'Expand section'}
            aria-expanded={isOpen}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          {/* Name / Edit */}
          {editing ? (
            <form onSubmit={handleRename} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <input
                className="input-field"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditName(node.name);
                    setEditing(false);
                  }
                }}
                style={{ padding: '2px 8px', height: 28, fontSize: 'var(--text-sm)', flex: 1 }}
                id={`rename-input-${node.id}`}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm btn-icon"
                disabled={loading || !editName.trim()}
                title="Save rename"
                style={{ padding: '2px 6px', height: 28 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-icon"
                onClick={() => { setEditName(node.name); setEditing(false); }}
                title="Cancel"
                style={{ padding: '2px 6px', height: 28 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </form>
          ) : (
            <button
              className="section-node-name"
              onClick={() => { onSelectSection(node.id); setIsOpen(true); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                color: isSelected ? 'var(--color-accent)' : 'var(--color-text)',
              }}
              id={`section-node-${node.id}`}
            >
              {node.name}
            </button>
          )}

          {/* Action buttons (show on hover via CSS) */}
          {!editing && (
            <div className="section-node-actions">
              <button
                title="Add subsection"
                onClick={handleAddChild}
                className="btn btn-ghost btn-sm btn-icon"
                aria-label={`Add subsection inside ${node.name}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
              <button
                title="Rename"
                onClick={() => { setEditing(true); setEditName(node.name); }}
                className="btn btn-ghost btn-sm btn-icon"
                aria-label={`Rename ${node.name}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                title="Delete"
                onClick={handleDelete}
                disabled={loading}
                className="btn btn-ghost btn-sm btn-icon"
                style={{ color: 'var(--color-error)' }}
                aria-label={`Delete ${node.name}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Children (recursive) */}
        {isOpen && node.children && node.children.length > 0 && (
          <div className="section-node-children">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {node.children.map((child) => (
                <SectionNode
                  key={child.id}
                  node={child}
                  depth={0} // children reset indent since we use marginLeft on parent
                  onSelectSection={onSelectSection}
                  selectedSectionId={selectedSectionId}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </li>
  );
}

// ---- Section Manager (top-level admin panel) ----
export default function SectionManager({ tree, onSelectSection, selectedSectionId }) {
  const [showAddRoot, setShowAddRoot] = useState(false);
  const [newName,     setNewName]     = useState('');
  const [creating,    setCreating]    = useState(false);
  const { addToast } = useToast();

  const handleAddRoot = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createSection(newName.trim(), null, tree.length);
      addToast(`"${newName}" section created.`, 'success');
      setNewName('');
      setShowAddRoot(false);
    } catch (err) {
      addToast('Failed to create: ' + err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)' }}>Sections</h3>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowAddRoot(true)}
          id="add-root-section-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Section
        </button>
      </div>

      {/* Root sections list */}
      {tree.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
          <p style={{ fontSize: 'var(--text-sm)' }}>No sections yet. Create your first one.</p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {tree.map((node) => (
            <SectionNode
              key={node.id}
              node={node}
              depth={0}
              onSelectSection={onSelectSection}
              selectedSectionId={selectedSectionId}
            />
          ))}
        </ul>
      )}

      {/* Add root section modal */}
      <Modal isOpen={showAddRoot} onClose={() => setShowAddRoot(false)} title="New Top-Level Section">
        <form onSubmit={handleAddRoot} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-section-name">Section name</label>
            <input
              id="new-section-name"
              className="input-field"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Semester 3, Mathematics, Computer Science"
              autoFocus
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddRoot(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={creating || !newName.trim()} id="create-section-submit-btn">
              {creating ? 'Creating…' : 'Create Section'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
