import React, { useState, useEffect, useRef } from 'react';
import * as itemStore from '../store/itemStore';

function JsonFileRow({ label, jsonData, fileName, onSet, onRemove }) {
  const hasFile = !!jsonData;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      <div className="ycs-field-label">{label}</div>
      <div style={{
        width: 24, height: 24,
        background: hasFile ? '#1a2a1a' : 'var(--ycs-foreground)',
        borderRadius: 'var(--ycs-radius, 4px)',
        border: hasFile ? '1px solid #3a5a3a' : '1px dashed var(--ycs-foreground)',
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '10px', color: hasFile ? '#6a8' : 'var(--ycs-text)',
        fontFamily: 'monospace',
      }}>
        {hasFile ? '{ }' : ''}
      </div>
      <div style={{
        flex: 1, padding: '4px 8px', backgroundColor: 'transparent', color: 'var(--ycs-text)',
        border: '1px solid var(--ycs-foreground)', borderRadius: 'var(--ycs-radius, 4px)',
        fontSize: '12px', fontFamily: 'inherit', height: '24px',
        display: 'flex', alignItems: 'center', boxSizing: 'border-box',
        opacity: hasFile ? 1 : 0.5, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      }}>
        {fileName || 'none selected'}
      </div>
      {hasFile && (
        <button className="ycs-button inline" onClick={onRemove} style={{ flexShrink: 0 }}>remove</button>
      )}
      <button className="ycs-button inline" onClick={onSet} style={{ flexShrink: 0 }}>
        {hasFile ? 'replace' : 'set'}
      </button>
    </div>
  );
}

function resolveItemId(tabId, nodeId) {
  const stableId = tabId || nodeId;
  const seeded = localStorage.getItem('ycs-child-item-id::' + stableId);
  if (seeded) return seeded;
  const parts = (stableId || '').split('::');
  if (parts.length >= 3) {
    return parts[parts.length - 2];
  }
  return '';
}

function resolveModelKey(tabId, nodeId) {
  const stableId = tabId || nodeId;
  const parts = (stableId || '').split('::');
  return parts[parts.length - 1] || 'model-json';
}

const DEFAULT_STATE = {
  geoModelJson: null, geoModelFileName: null,
  itemModelJson: null, itemModelFileName: null,
};

export default function ModelJsonPage({ isTile = false, onClose, nodeId, tree, tabId }) {
  const stableId = tabId || nodeId;
  const itemId = resolveItemId(tabId, nodeId);
  const modelKey = resolveModelKey(tabId, nodeId);

  const [state, setStateRaw] = useState(() => {
    if (itemId) {
      const allModels = itemStore.getSection(itemId, 'modelJsonData');
      if (allModels && allModels[modelKey]) return allModels[modelKey];
    }
    return { ...DEFAULT_STATE };
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const geoRef = useRef(null);
  const itemRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    const allModels = itemStore.getSection(itemId, 'modelJsonData');
    if (allModels && allModels[modelKey]) setStateRaw(allModels[modelKey]);
  }, [itemId, modelKey]);

  const set = (updates) => {
    setStateRaw(prev => {
      const next = { ...prev, ...updates };
      if (itemId) {
        const allModels = itemStore.getSection(itemId, 'modelJsonData') || {};
        itemStore.updateSection(itemId, 'modelJsonData', { ...allModels, [modelKey]: next });
      }
      return next;
    });
  };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ycs-model-json-changed', {
      detail: { selectorTabId: stableId, ...state }
    }));
  }, [state.geoModelJson, state.itemModelJson, stableId]);

  const [textureUrl, setTextureUrl] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const { modelTabId, textureUrl: url } = e.detail || {};
      if (modelTabId === stableId && url) setTextureUrl(url);
    };
    window.addEventListener('ycs-model-texture-update', handler);

    const seeded = localStorage.getItem(`ycs-model-texture::${stableId}`);
    if (seeded) setTextureUrl(seeded);

    return () => window.removeEventListener('ycs-model-texture-update', handler);
  }, [stableId]);

  const previewChildTabId = `Preview::${stableId}::model-preview`;

  useEffect(() => {
    if (!state.geoModelJson) return;
    const previewData = {
      targetNodeId: previewChildTabId,
      previewId: previewChildTabId,
      type: 'model',
      modelJson: state.geoModelJson,
      itemModelJson: state.itemModelJson,
      textureUrl,
    };
    localStorage.setItem(`ycs-preview::${previewChildTabId}`, JSON.stringify(previewData));
    window.dispatchEvent(new CustomEvent('ycs-preview-update', { detail: previewData }));
  }, [state.geoModelJson, state.itemModelJson, textureUrl]);

  const loadJsonFile = (file, jsonKey, nameKey) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        set({ [jsonKey]: parsed, [nameKey]: file.name });
      } catch {
        set({ [jsonKey]: null, [nameKey]: null });
      }
    };
    reader.readAsText(file);
  };

  const pickFile = (jsonKey, nameKey, inputRef) => {
    if (inputRef.current) inputRef.current.click();
  };

  const handleFileInput = (e, jsonKey, nameKey) => {
    const file = e.target.files[0];
    if (file) loadJsonFile(file, jsonKey, nameKey);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.json'));
    for (const file of files) {
      if (file.name.includes('.geo.') || file.name.includes('geometry')) {
        loadJsonFile(file, 'geoModelJson', 'geoModelFileName');
      } else {
        loadJsonFile(file, 'itemModelJson', 'itemModelFileName');
      }
    }
  };

  const findNode = (n, tid) => {
    if (!n) return null;
    if (n.type === 'leaf' && n.tabId === tid) return n;
    if (n.type === 'split') for (const c of n.children) { const r = findNode(c, tid); if (r) return r; }
    return null;
  };

  const isPreviewInTree = () => tree ? !!findNode(tree, previewChildTabId) : false;

  const closePreview = () => {
    if (tree) {
      const node = findNode(tree, previewChildTabId);
      if (node) window.dispatchEvent(new CustomEvent('ycs-close-tab-recursive', { detail: { targetId: node.id } }));
    } else {
      window.electronAPI?.closePopout(previewChildTabId);
    }
  };

  const togglePreview = () => {
    if (isPreviewInTree()) {
      closePreview();
      setPreviewOpen(false);
    } else {
      const isPopout = !tree;
      if (isPopout) {
        window.electronAPI?.openPopout(previewChildTabId);
      } else {
        window.dispatchEvent(new CustomEvent('ycs-toggle-child', {
          detail: { parentId: nodeId, targetNodeId: nodeId, childTabId: previewChildTabId, direction: 'bottom', isOpen: true }
        }));
      }
      setPreviewOpen(true);
    }
  };

  useEffect(() => {
    setPreviewOpen(isPreviewInTree());
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
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', whiteSpace: 'nowrap' }}>3D Model Files</h2>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

        <div
          style={{
            flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0,
            padding: '16px 20px', minWidth: '350px',
            border: dragOver ? '2px dashed var(--ycs-highlight)' : '2px dashed transparent',
            backgroundColor: dragOver ? 'var(--ycs-accent)' : 'transparent',
            transition: 'border-color 0.1s, background-color 0.1s',
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <JsonFileRow
            label="Geometry"
            jsonData={state.geoModelJson}
            fileName={state.geoModelFileName}
            onSet={() => pickFile('geoModelJson', 'geoModelFileName', geoRef)}
            onRemove={() => set({ geoModelJson: null, geoModelFileName: null })}
          />
          <input ref={geoRef} type="file" accept=".json,.geo.json" style={{ display: 'none' }}
            onChange={(e) => handleFileInput(e, 'geoModelJson', 'geoModelFileName')} />

          <JsonFileRow
            label="Item Model"
            jsonData={state.itemModelJson}
            fileName={state.itemModelFileName}
            onSet={() => pickFile('itemModelJson', 'itemModelFileName', itemRef)}
            onRemove={() => set({ itemModelJson: null, itemModelFileName: null })}
          />
          <input ref={itemRef} type="file" accept=".json" style={{ display: 'none' }}
            onChange={(e) => handleFileInput(e, 'itemModelJson', 'itemModelFileName')} />

          {dragOver && (
            <div style={{ textAlign: 'center', padding: '20px', opacity: 0.5, fontSize: '12px' }}>
              Drop .json files here
            </div>
          )}
        </div>

        <div style={{
          padding: '8px',
          display: 'flex', alignItems: 'center', gap: '8px',
          borderTop: '1px solid var(--ycs-foreground)',
          backgroundColor: 'transparent', flexShrink: 0,
        }}>
          <button className={`ycs-button${previewOpen ? ' active' : ''}`} onClick={togglePreview}>Preview</button>
        </div>
      </div>
    </div>
  );
}
