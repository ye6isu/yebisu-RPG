import React, { useState, useEffect, useRef } from 'react';
import SpritePreview from './SpritePreview';
import ModelPreview3D from './ModelPreview3D';

function useContainerSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export default function PreviewPane({ isTile = false, onClose, nodeId, tree, tabId }) {
  const [previewData, setPreviewData] = useState(null);
  const key = tabId || nodeId;
  const containerRef = useRef(null);
  const { w, h } = useContainerSize(containerRef);

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail?.targetNodeId === key || e.detail?.previewId === key) {
        setPreviewData(e.detail);
      }
    };
    window.addEventListener('ycs-preview-update', handleUpdate);

    const stored = localStorage.getItem(`ycs-preview::${key}`);
    if (stored) {
      try { setPreviewData(JSON.parse(stored)); } catch {}
    }

    return () => window.removeEventListener('ycs-preview-update', handleUpdate);
  }, [key]);

  useEffect(() => {
    if (previewData) {
      localStorage.setItem(`ycs-preview::${key}`, JSON.stringify(previewData));
    }
  }, [previewData, key]);

  const d = previewData || {};
  const s = Math.min(w, h);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'transparent', color: 'var(--ycs-text)',
      }}>
        <div
          ref={containerRef}
          style={{
            flex: 1, minHeight: 0,
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {d.type === 'model' && d.modelJson && (
            <ModelPreview3D modelJson={d.modelJson} containerW={w} containerH={h} textureUrl={d.textureUrl} />
          )}
          {d.type !== 'model' && d.dataUrl && s > 0 && (
            <SpritePreview
              url={d.dataUrl}
              size={s}
              isSpritesheet={d.isSpritesheet}
              frames={d.frames}
              isAnimated={d.isAnimated}
              ticksPerFrame={d.ticksPerFrame}
              defaultFrame={d.defaultFrame}
            />
          )}
        </div>
      </div>
    </div>
  );
}
