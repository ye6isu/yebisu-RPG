import React, { useState, useRef, useCallback, useEffect } from 'react';
import SpritePreview from './SpritePreview';
import { loadTexturesFile, saveTexturesFile } from '../entityFiles';

const TEX_DEFAULT = {
  label: '',
  dataUrl: null, dataFileName: null,
  hasEmissive: false, emissiveUrl: null, emissiveFileName: null,
  hasShape: false, shapeUrl: null, shapeFileName: null,
  isSpritesheet: false, frames: 4, defaultFrame: 0,
  isAnimated: false, ticksPerFrame: 4,
};

function useTexForm(stableId) {
  const key = `ycs-texture-editor::${stableId}`;
  const [form, setForm] = useState(() => {
    const seed = localStorage.getItem('ycs-texture-editor-seed');
    if (seed) {
      try {
        const parsed = JSON.parse(seed);
        if (parsed.form) {
          localStorage.removeItem('ycs-texture-editor-seed');
          const merged = { ...TEX_DEFAULT, ...parsed.form };
          localStorage.setItem(key, JSON.stringify(merged));
          return merged;
        }
      } catch {}
    }
    const stored = localStorage.getItem(key);
    if (stored) { try { return { ...TEX_DEFAULT, ...JSON.parse(stored) }; } catch {} }
    return { ...TEX_DEFAULT };
  });

  const F = useCallback((k, v) => {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  return [form, F];
}

const CheckboxRow = ({ label, checked, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => onChange(!checked)}>
    <input type="checkbox" className="ycs-checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    <span style={{ fontSize: '13px', color: 'var(--ycs-text)', userSelect: 'none' }}>{label}</span>
  </div>
);

const FieldRow = ({ label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
    <div className="ycs-field-label">{label}</div>
    {children}
  </div>
);

const DualRow = ({ label1, children1, label2, children2 }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', minHeight: '24px' }}>
    <div className="ycs-field-label">{label1}</div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0, maxWidth: '40%' }}>
      {children1}
    </div>
    <div className="ycs-field-label" style={{ minWidth: 'auto', paddingLeft: '16px' }}>{label2}</div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
      {children2}
    </div>
  </div>
);

function TextureFileRow({ label, form, F, urlKey, nameKey, checkboxKey, showAnim = false }) {
  const ref = useRef();
  const hasFile = !!form[urlKey];
  const isEnabled = checkboxKey ? form[checkboxKey] : true;

  const handleFile = async () => {
    const fe = window.electronAPI?.fileEngine;
    if (fe) {
      const pickResult = await fe.files.pickFiles([{ name: 'Images', extensions: ['png'] }], false);
      if (!pickResult?.ok || !pickResult.data || pickResult.data.length === 0) return;
      const filePath = pickResult.data[0];
      const fileName = filePath.split(/[\\/]/).pop();
      const result = await fe.files.readAbsolute(filePath, 'base64');
      if (!result?.ok || !result.data) return;
      F(urlKey, `data:image/png;base64,${result.data}`);
      F(nameKey, fileName);
      if (urlKey === 'dataUrl' && !form.label) {
        const base = fileName.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (base) F('label', base);
      }
      return;
    }
    const f = ref.current.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = e => {
      F(urlKey, e.target.result);
      F(nameKey, f.name);
      if (urlKey === 'dataUrl' && !form.label) {
        const base = f.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (base) F('label', base);
      }
    };
    reader.readAsDataURL(f);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      {checkboxKey !== undefined && (
        <input
          type="checkbox" className="ycs-checkbox"
          checked={isEnabled}
          onChange={e => {
            F(checkboxKey, e.target.checked);
            if (!e.target.checked) { F(urlKey, null); F(nameKey, null); }
          }}
        />
      )}
      <div className="ycs-field-label">{label}</div>
      <div style={{
        width: 24, height: 24,
        background: 'var(--ycs-foreground)',
        borderRadius: 'var(--ycs-radius, 4px)',
        border: hasFile ? 'none' : '1px dashed var(--ycs-foreground)',
        flexShrink: 0, imageRendering: 'pixelated', overflow: 'hidden',
        opacity: isEnabled ? 1 : 0.3,
      }}>
        {hasFile && isEnabled && (
          showAnim ? (
            <SpritePreview
              url={form[urlKey]} size={24}
              isSpritesheet={form.isSpritesheet} frames={form.frames}
              isAnimated={form.isAnimated} ticksPerFrame={form.ticksPerFrame}
              defaultFrame={form.defaultFrame}
            />
          ) : (
            <img src={form[urlKey]} alt="" style={{ width: 24, height: 24, imageRendering: 'pixelated', objectFit: 'contain' }} />
          )
        )}
      </div>
      <div style={{
        flex: 1, padding: '4px 8px', backgroundColor: 'transparent', color: 'var(--ycs-text)',
        border: '1px solid var(--ycs-foreground)', borderRadius: 'var(--ycs-radius, 4px)',
        fontSize: '12px', fontFamily: 'inherit', height: '24px',
        display: 'flex', alignItems: 'center', boxSizing: 'border-box',
        opacity: (hasFile && isEnabled) ? 1 : 0.5,
        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      }}>
        {(isEnabled && form[nameKey]) || 'none selected'}
      </div>
      {hasFile && isEnabled && (
        <button className="ycs-button inline" onClick={() => { F(urlKey, null); F(nameKey, null); }} style={{ flexShrink: 0 }}>
          remove
        </button>
      )}
      <button className="ycs-button inline" onClick={() => {
        if (!isEnabled) return;
        if (window.electronAPI?.fileEngine) handleFile();
        else ref.current.click();
      }} style={{ flexShrink: 0, opacity: isEnabled ? 1 : 0.3, pointerEvents: isEnabled ? 'auto' : 'none' }}>
        {hasFile && isEnabled ? 'edit' : 'set'}
      </button>
      <input ref={ref} type="file" accept="image/png" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

async function saveTextureToList(form) {
  const list = await loadTexturesFile();
  const idx = list.findIndex(t => t.label === form.label);
  if (idx >= 0) {
    list[idx] = { ...form };
  } else {
    list.push({ ...form });
  }
  await saveTexturesFile(list);
  window.dispatchEvent(new CustomEvent('ycs-textures-changed'));
}

export default function TextureEditorPage({ isTile = false, onClose, nodeId, tree, tabId }) {
  const stableId = tabId || nodeId;
  const [form, F] = useTexForm(stableId);
  const [previewOpen, setPreviewOpen] = useState(false);

  const canSave = !!(form.label.trim() && form.dataUrl);

  const handleSave = async () => {
    if (!canSave) return;
    await saveTextureToList(form);
  };

  const closePreview = () => {
    const findNode = (n, tid) => {
      if (!n) return null;
      if (n.type === 'leaf' && n.tabId === tid) return n;
      if (n.type === 'split') for (const c of n.children) { const r = findNode(c, tid); if (r) return r; }
      return null;
    };
    const previewTab = previewChildTabId;
    if (tree) {
      const node = findNode(tree, previewTab);
      if (node) window.dispatchEvent(new CustomEvent('ycs-close-tab-recursive', { detail: { targetId: node.id } }));
    } else {
      window.electronAPI?.closePopout(previewTab);
    }
  };

  const handleSaveAndClose = async () => {
    if (!canSave) return;
    await saveTextureToList(form);
    closePreview();
    if (onClose) onClose();
  };

  const handleCancel = () => {
    closePreview();
    if (onClose) onClose();
  };

  const previewChildTabId = `Preview::${tabId || nodeId}::preview`;

  const isPreviewInTree = () => {
    const findNode = (n, tid) => {
      if (!n) return null;
      if (n.type === 'leaf' && n.tabId === tid) return n;
      if (n.type === 'split') for (const c of n.children) { const r = findNode(c, tid); if (r) return r; }
      return null;
    };
    return tree ? !!findNode(tree, previewChildTabId) : false;
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

  useEffect(() => {
    const previewData = {
      targetNodeId: previewChildTabId,
      previewId: previewChildTabId,
      type: 'texture',
      dataUrl: form.dataUrl,
      label: form.label,
      isSpritesheet: form.isSpritesheet,
      isAnimated: form.isAnimated,
      frames: form.frames,
      defaultFrame: form.defaultFrame,
      ticksPerFrame: form.ticksPerFrame,
    };
    localStorage.setItem(`ycs-preview::${previewChildTabId}`, JSON.stringify(previewData));
    window.dispatchEvent(new CustomEvent('ycs-preview-update', { detail: previewData }));
  }, [form.dataUrl, form.label, form.isSpritesheet, form.isAnimated, form.frames, form.defaultFrame, form.ticksPerFrame, previewChildTabId]);

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
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
            {form.label ? `Texture — ${form.label}` : 'New Texture'}
          </h2>
        </div>

        <div style={{ height: 1, backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            <FieldRow label="Name">
              <input
                className="ycs-string-input"
                value={form.label}
                onChange={e => F('label', e.target.value)}
                style={{ flex: 1 }}
              />
            </FieldRow>

            <TextureFileRow label="Normal" form={form} F={F} urlKey="dataUrl" nameKey="dataFileName" showAnim />
            <TextureFileRow label="Emissive" form={form} F={F} urlKey="emissiveUrl" nameKey="emissiveFileName" checkboxKey="hasEmissive" />
            <TextureFileRow label="Shape" form={form} F={F} urlKey="shapeUrl" nameKey="shapeFileName" checkboxKey="hasShape" />

            {/* Spritesheet Properties */}
            <div style={{ marginBottom: 10 }}>
              <CheckboxRow label="Spritesheet Properties" checked={form.isSpritesheet} onChange={v => {
                F('isSpritesheet', v);
                if (!v) F('isAnimated', false);
              }} />
            </div>

            {form.isSpritesheet && (
              <div style={{ paddingLeft: '16px', borderLeft: '2px solid var(--ycs-foreground)', marginBottom: 10 }}>
                <DualRow
                  label1="Frames"
                  children1={
                    <input
                      className="ycs-string-input"
                      type="text" inputMode="numeric"
                      value={form.frames}
                      onChange={e => F('frames', parseInt(e.target.value) || 1)}
                      style={{ width: '100%' }}
                    />
                  }
                  label2="Default Frame"
                  children2={
                    <input
                      className="ycs-string-input"
                      type="text" inputMode="numeric"
                      value={form.defaultFrame ?? 0}
                      onChange={e => {
                        const n = Math.max(0, Math.min((form.frames || 1) - 1, parseInt(e.target.value) || 0));
                        F('defaultFrame', n);
                      }}
                      style={{ width: '100%' }}
                    />
                  }
                />

                {/* Animated — inline: [Checkbox] Animated [Ticks/Frame input] */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="checkbox" className="ycs-checkbox"
                    checked={form.isAnimated}
                    onChange={e => F('isAnimated', e.target.checked)}
                  />
                  <div className="ycs-field-label">Animated</div>
                  <input
                    className="ycs-string-input"
                    type="text" inputMode="numeric"
                    value={form.ticksPerFrame}
                    onChange={e => F('ticksPerFrame', parseInt(e.target.value) || 1)}
                    style={{ width: 60, opacity: form.isAnimated ? 1 : 0.3, pointerEvents: form.isAnimated ? 'auto' : 'none' }}
                  />
                  <span style={{ fontSize: 12, opacity: form.isAnimated ? 0.6 : 0.3 }}>ticks/frame</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px',
          borderTop: '1px solid var(--ycs-foreground)',
          backgroundColor: 'transparent',
          flexShrink: 0,
        }}>
          <button className={`ycs-button${previewOpen ? ' active' : ''}`} onClick={togglePreview}>Preview</button>
          <div style={{ flex: 1 }} />
          <button className="ycs-button" onClick={handleSaveAndClose} style={{ opacity: canSave ? 1 : 0.4, pointerEvents: canSave ? 'auto' : 'none' }}>Save & Close</button>
          <button className="ycs-button" onClick={handleCancel}>Cancel</button>
          <button className="ycs-button" onClick={handleSave} style={{ opacity: canSave ? 1 : 0.4, pointerEvents: canSave ? 'auto' : 'none' }}>Save</button>
        </div>
      </div>
    </div>
  );
}
