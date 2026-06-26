import React, { useState, useEffect, useCallback } from 'react';
import SpritePreview from './SpritePreview';

const CARD_SIZE = 120;
const popoutChildren = new Set();

export default function TextureManagerPage({ isTile = false, onClose, nodeId, tree }) {
  const [filter, setFilter] = useState('');
  const [textures, setTextures] = useState([]);

  const reload = useCallback(() => {
    const raw = localStorage.getItem('ycs-textures-list');
    try { setTextures(raw ? JSON.parse(raw) : []); } catch { setTextures([]); }
  }, []);

  useEffect(() => {
    reload();
    const handler = () => reload();
    window.addEventListener('ycs-textures-changed', handler);
    return () => window.removeEventListener('ycs-textures-changed', handler);
  }, [reload]);

  const findNodeByTabId = (tabId) => {
    let found = null;
    const search = (n) => {
      if (!n) return;
      if (n.type === 'leaf' && n.tabId === tabId) found = n;
      if (n.type === 'split') n.children.forEach(search);
    };
    if (tree) search(tree);
    return found;
  };

  const isPopout = !tree;

  const openEditor = (tex) => {
    const childTabId = tex
      ? `Texture Editor::${nodeId}::${tex.label}`
      : `Texture Editor::${nodeId}::${Date.now()}`;

    if (isPopout) {
      if (tex && popoutChildren.has(childTabId)) {
        window.electronAPI?.closePopout(childTabId);
        popoutChildren.delete(childTabId);
        return;
      }
      if (tex) localStorage.setItem('ycs-texture-editor-seed', JSON.stringify({ childTabId, form: tex }));
      window.electronAPI?.openPopout(childTabId);
      popoutChildren.add(childTabId);
      return;
    }

    const existing = findNodeByTabId(childTabId);
    if (existing) {
      window.dispatchEvent(new CustomEvent('ycs-close-tab-recursive', { detail: { targetId: existing.id } }));
      return;
    }

    if (tex) {
      localStorage.setItem('ycs-texture-editor-seed', JSON.stringify({ childTabId, form: tex }));
    }

    window.dispatchEvent(new CustomEvent('ycs-toggle-child', {
      detail: { parentId: nodeId, targetNodeId: nodeId, childTabId, direction: 'right', isOpen: true }
    }));
  };

  const deleteTexture = (tex, e) => {
    e.stopPropagation();
    const raw = localStorage.getItem('ycs-textures-list');
    let list = [];
    try { list = raw ? JSON.parse(raw) : []; } catch {}
    list = list.filter(t => t.label !== tex.label);
    localStorage.setItem('ycs-textures-list', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('ycs-textures-changed'));
  };

  const filtered = textures.filter(tex => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return tex.label.toLowerCase().includes(q) || (tex.dataFileName || '').toLowerCase().includes(q);
  });

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
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Textures</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              className="ycs-string-input"
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ width: '160px' }}
            />
            <button className="ycs-button icon" onClick={() => openEditor(null)} title="New Texture">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

        {/* Card Grid */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0, padding: '16px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.5, fontSize: '13px' }}>
              {filter ? 'No textures match your filter.' : ''}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {filtered.map(tex => (
                <div
                  key={tex.label}
                  onClick={() => openEditor(tex)}
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
                    e.currentTarget.querySelector('.card-delete').style.opacity = '1';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--ycs-foreground)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.querySelector('.card-delete').style.opacity = '0';
                  }}
                >
                  <div
                    className="card-delete"
                    onClick={(e) => deleteTexture(tex, e)}
                    title="Delete"
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 18, height: 18,
                      cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <defs>
                        <mask id={`del-${tex.label}`}>
                          <circle cx="9" cy="9" r="9" fill="white"/>
                          <line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                        </mask>
                      </defs>
                      <circle cx="9" cy="9" r="9" fill="white" mask={`url(#del-${tex.label})`}/>
                    </svg>
                  </div>

                  <div style={{
                    width: '64px', height: '64px',
                    backgroundColor: 'transparent',
                    borderRadius: 'var(--ycs-radius, 4px)',
                    imageRendering: 'pixelated',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '8px', flexShrink: 0,
                    overflow: 'hidden',
                  }}>
                    {tex.dataUrl ? (
                      <SpritePreview
                        url={tex.dataUrl} size={64}
                        isSpritesheet={tex.isSpritesheet} frames={tex.frames}
                        isAnimated={tex.isAnimated} ticksPerFrame={tex.ticksPerFrame}
                        defaultFrame={tex.defaultFrame}
                      />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25 }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    )}
                  </div>

                  <div style={{
                    fontSize: '12px', fontWeight: '500',
                    textAlign: 'center', width: '100%',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    marginBottom: '2px',
                  }}>
                    {tex.label}
                  </div>

                  <div style={{
                    fontSize: '10px', opacity: 0.5,
                    fontFamily: 'monospace',
                    textAlign: 'center', width: '100%',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {tex.dataFileName || ''}
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
