import React, { useState, useEffect, useCallback } from 'react';
import { findNodeByTabId as findNodeByTabIdUtil } from './Field/Field';

const CARD_SIZE = 120;
const popoutChildren = new Set();

export default function RegistryLandingPage({
  isTile = false, onClose, nodeId, tree,
  title,
  loadEntries,
  filterEntry,
  editorPrefix,
  seedFormData,
  entryKey,
  onDeleteEntry,
}) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadEntries();
      if (result?.ok) {
        const filtered = filterEntry ? result.data.filter(filterEntry) : result.data;
        setEntries(filtered);
      } else {
        setError(result?.error || 'Failed to load entries');
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [loadEntries, filterEntry]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const handler = () => reload();
    window.addEventListener('ycs-item-changed', handler);
    return () => window.removeEventListener('ycs-item-changed', handler);
  }, [reload]);

  const textFiltered = entries.filter(entry => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    const id = entryKey(entry);
    return id.includes(q) || (entry.displayName || '').toLowerCase().includes(q);
  });

  const findNodeByTabId = (tabId) => findNodeByTabIdUtil(tree, tabId);

  const isPopout = !tree;

  const openEditor = (entry) => {
    const key = entry ? entryKey(entry) : null;
    const childTabId = key
      ? `${editorPrefix}::${nodeId}::${key}`
      : `${editorPrefix}::${nodeId}::${Date.now()}`;

    if (isPopout) {
      if (key && popoutChildren.has(childTabId)) {
        window.electronAPI?.closePopout(childTabId);
        popoutChildren.delete(childTabId);
        return;
      }
      if (seedFormData && entry) {
        localStorage.setItem('ycs-item-editor-seed', JSON.stringify({ childTabId, form: seedFormData(entry) }));
      }
      window.electronAPI?.openPopout(childTabId);
      popoutChildren.add(childTabId);
      return;
    }

    const existing = findNodeByTabId(childTabId);
    if (existing) {
      window.dispatchEvent(new CustomEvent('ycs-close-tab-recursive', { detail: { targetId: existing.id } }));
      return;
    }

    if (seedFormData && entry) {
      localStorage.setItem('ycs-item-editor-seed', JSON.stringify({ childTabId, form: seedFormData(entry) }));
    }

    window.dispatchEvent(new CustomEvent('ycs-toggle-child', {
      detail: { parentId: nodeId, targetNodeId: nodeId, childTabId, direction: 'right', isOpen: true }
    }));
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', backgroundColor: 'transparent',
        color: 'var(--ycs-text)',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>{title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              className="ycs-string-input"
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ width: '160px' }}
            />
            <button className="ycs-button icon" onClick={reload} title="Refresh">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
              </svg>
            </button>
            <button className="ycs-button icon" onClick={() => openEditor(null)} title={`New ${title.replace(/s$/, '')}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

        {/* Card Grid */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0, padding: '16px' }}>
          {loading && (
            <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.5, fontSize: '13px' }}>
              Loading...
            </div>
          )}

          {error && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ color: '#ff5555', fontSize: '13px', marginBottom: '8px' }}>{error}</div>
              <div style={{ opacity: 0.5, fontSize: '12px' }}>
                Make sure the mod root is configured in Settings.
              </div>
            </div>
          )}

          {!loading && !error && textFiltered.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.5, fontSize: '13px' }}>
              {filter ? 'No entries match your filter.' : 'No entries found.'}
            </div>
          )}

          {!loading && !error && textFiltered.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {textFiltered.map(entry => (
                <div
                  key={entryKey(entry)}
                  onClick={() => openEditor(entry)}
                  style={{
                    width: `${CARD_SIZE}px`,
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '10px 8px 8px',
                    borderRadius: 'var(--ycs-radius, 4px)',
                    border: '1px solid var(--ycs-foreground)',
                    backgroundColor: 'transparent',
                    transition: 'border-color 0.1s, background-color 0.1s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--ycs-highlight)';
                    e.currentTarget.style.backgroundColor = 'var(--ycs-accent)';
                    const del = e.currentTarget.querySelector('.card-delete');
                    if (del) del.style.opacity = '1';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--ycs-foreground)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                    const del = e.currentTarget.querySelector('.card-delete');
                    if (del) del.style.opacity = '0';
                  }}
                >
                  {onDeleteEntry && (
                    <div
                      className="card-delete"
                      onClick={e => { e.stopPropagation(); onDeleteEntry(entryKey(entry), reload); }}
                      title="Delete"
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 18, height: 18,
                        cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18">
                        <defs>
                          <mask id={`del-${entryKey(entry)}`}>
                            <circle cx="9" cy="9" r="9" fill="white"/>
                            <line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                          </mask>
                        </defs>
                        <circle cx="9" cy="9" r="9" fill="white" mask={`url(#del-${entryKey(entry)})`}/>
                      </svg>
                    </div>
                  )}
                  {/* Texture / 3D Preview */}
                  <div style={{
                    width: '64px', height: '64px',
                    backgroundColor: 'var(--ycs-foreground)',
                    borderRadius: 'var(--ycs-radius, 4px)',
                    imageRendering: 'pixelated',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '8px', flexShrink: 0,
                    overflow: 'hidden',
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>

                  {/* Display Name */}
                  <div style={{
                    fontSize: '12px', fontWeight: '500',
                    textAlign: 'center', width: '100%',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    marginBottom: '2px',
                  }}>
                    {entry.displayName}
                  </div>

                  {/* ID */}
                  <div style={{
                    fontSize: '10px', opacity: 0.5,
                    fontFamily: 'monospace',
                    textAlign: 'center', width: '100%',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {entryKey(entry)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
