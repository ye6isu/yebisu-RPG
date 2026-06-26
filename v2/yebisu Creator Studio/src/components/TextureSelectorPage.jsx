import React, { useState, useEffect, useCallback, useRef } from 'react';
import SpritePreview from './SpritePreview';

const CARD_SIZE = 120;

export default function TextureSelectorPage({ isTile = false, onClose, nodeId, tree, tabId }) {
  const [filter, setFilter] = useState('');
  const [textures, setTextures] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

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

  const selectTexture = (tex) => {
    window.dispatchEvent(new CustomEvent('ycs-texture-selected', {
      detail: { selectorTabId: tabId || nodeId, textureName: tex.label, textureData: tex }
    }));
  };

  const saveAndSelect = (name, dataUrl) => {
    const label = name.replace(/\.[^.]+$/, '');
    const tex = {
      label, dataUrl, dataFileName: name,
      hasEmissive: false, emissiveUrl: null, emissiveFileName: null,
      hasShape: false, shapeUrl: null, shapeFileName: null,
      isSpritesheet: false, frames: 4, defaultFrame: 0,
      isAnimated: false, ticksPerFrame: 4,
    };
    const raw = localStorage.getItem('ycs-textures-list');
    let list = [];
    try { list = raw ? JSON.parse(raw) : []; } catch {}
    const idx = list.findIndex(t => t.label === label);
    if (idx >= 0) list[idx] = tex;
    else list.push(tex);
    localStorage.setItem('ycs-textures-list', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('ycs-textures-changed'));
    selectTexture(tex);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => saveAndSelect(file.name, reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const img = files.find(f => /\.(png|jpg|jpeg|gif)$/i.test(f.name));
    if (img) {
      const reader = new FileReader();
      reader.onload = () => saveAndSelect(img.name, reader.result);
      reader.readAsDataURL(img);
    }
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
        <div style={{
          padding: '12px 16px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', whiteSpace: 'nowrap' }}>Select Texture</h2>
          <input
            className="ycs-string-input"
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ width: '160px' }}
          />
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0, padding: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {/* Upload card */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.gif"
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                width: `${CARD_SIZE}px`,
                height: `${CARD_SIZE}px`,
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--ycs-radius, 4px)',
                border: `2px dashed ${dragOver ? 'var(--ycs-highlight)' : 'var(--ycs-foreground)'}`,
                backgroundColor: dragOver ? 'var(--ycs-accent)' : 'transparent',
                transition: 'border-color 0.1s, background-color 0.1s',
                gap: '8px',
              }}
              onMouseEnter={e => {
                if (!dragOver) {
                  e.currentTarget.style.borderColor = 'var(--ycs-highlight)';
                  e.currentTarget.style.backgroundColor = 'var(--ycs-accent)';
                }
              }}
              onMouseLeave={e => {
                if (!dragOver) {
                  e.currentTarget.style.borderColor = 'var(--ycs-foreground)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span style={{ fontSize: '10px', opacity: 0.5, whiteSpace: 'nowrap' }}>Upload / Drop</span>
            </div>

            {filtered.map(tex => (
              <div
                key={tex.label}
                onClick={() => selectTexture(tex)}
                style={{
                  width: `${CARD_SIZE}px`,
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '10px 8px 8px',
                  borderRadius: 'var(--ycs-radius, 4px)',
                  border: '1px solid var(--ycs-foreground)',
                  backgroundColor: 'transparent',
                  transition: 'border-color 0.1s, background-color 0.1s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--ycs-highlight)';
                  e.currentTarget.style.backgroundColor = 'var(--ycs-accent)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--ycs-foreground)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
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
        </div>
      </div>
    </div>
  );
}
