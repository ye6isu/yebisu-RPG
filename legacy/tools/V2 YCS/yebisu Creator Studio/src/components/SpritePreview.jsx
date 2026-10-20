import React, { useState, useEffect } from 'react';

export default function SpritePreview({ url, size = 24, frames = 1, isAnimated = false, isSpritesheet = false, ticksPerFrame = 4, defaultFrame = 0 }) {
  const [f, setF] = useState(0);
  const effectiveFrames = isSpritesheet ? (frames || 1) : 1;

  useEffect(() => {
    if (!isAnimated || effectiveFrames <= 1) return;
    const id = setInterval(() => setF(p => (p + 1) % effectiveFrames), (ticksPerFrame || 4) * 50);
    return () => clearInterval(id);
  }, [isAnimated, effectiveFrames, ticksPerFrame]);

  if (!url) return null;

  if (effectiveFrames > 1) {
    const idx = isAnimated ? f : (defaultFrame || 0);
    const pct = (idx / effectiveFrames) * 100;
    return (
      <div style={{ width: size, height: size, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
        <img
          src={url} alt=""
          style={{
            width: size,
            height: size * effectiveFrames,
            imageRendering: 'pixelated',
            display: 'block',
            transform: `translateY(-${pct}%)`,
          }}
        />
      </div>
    );
  }

  return (
    <img
      src={url} alt=""
      style={{ width: size, height: size, imageRendering: 'pixelated', objectFit: 'contain', flexShrink: 0 }}
    />
  );
}
