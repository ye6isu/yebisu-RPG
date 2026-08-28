import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

function formatNumber(value) {
  return Number.parseFloat(value.toFixed(4)).toString();
}

function readVec3(obj, key) {
  const arr = obj?.[key];
  return Array.isArray(arr) ? [
    Number(arr[0]) || 0,
    Number(arr[1]) || 0,
    Number(arr[2]) || 0,
  ] : [0, 0, 0];
}

function modelHitboxPartsFromGeo(raw) {
  const parsed = JSON.parse(raw);
  const geometry = parsed?.['minecraft:geometry'];
  const bones = Array.isArray(geometry?.[0]?.bones) ? geometry[0].bones : [];
  return bones
    .filter(bone => typeof bone?.name === 'string' && bone.name.startsWith('hb_'))
    .map((bone) => {
      const cube = Array.isArray(bone.cubes) ? bone.cubes[0] : null;
      const pivot = readVec3(bone, 'pivot');
      const origin = readVec3(cube, 'origin');
      const size = readVec3(cube, 'size').map(v => Math.abs(v));
      const center = [
        origin[0] + size[0] / 2,
        origin[1] + size[1] / 2,
        origin[2] + size[2] / 2,
      ];
      return {
        name: bone.name,
        boneName: bone.name,
        width: formatNumber(Math.max(size[0], size[2]) / 16 || 1),
        height: formatNumber(size[1] / 16 || 1),
        offsetX: formatNumber(center[0] - pivot[0]),
        offsetY: formatNumber(origin[1] - pivot[1]),
        offsetZ: formatNumber(center[2] - pivot[2]),
        source: 'model',
      };
    });
}

function LabeledField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '10px', opacity: 0.5 }}>{label}</span>
      {children}
    </div>
  );
}

function FieldIconButton({ onClick, title, hasData, disabled }) {
  return (
    <button className="ycs-button field" onClick={onClick} title={title} disabled={disabled}
      style={{ flexShrink: 0, fontSize: '11px', minWidth: 'unset', padding: '0 6px', width: 'auto', height: '24px' }}>
      {hasData ? 'edit' : 'set'}
    </button>
  );
}

function PartRow({ part }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '8px',
        borderRadius: 'var(--ycs-radius, 4px)', border: '1px solid var(--ycs-foreground)',
      }}
    >
      <LabeledField label="Part Name">
        <span style={{ fontSize: '13px', minWidth: '110px' }}>{part.name}</span>
      </LabeledField>
      <LabeledField label="Bone Name">
        <span style={{ fontSize: '13px', minWidth: '110px' }}>{part.boneName}</span>
      </LabeledField>
      <LabeledField label="Width">
        <span style={{ fontSize: '13px', minWidth: '70px' }}>{part.width}</span>
      </LabeledField>
      <LabeledField label="Height">
        <span style={{ fontSize: '13px', minWidth: '70px' }}>{part.height}</span>
      </LabeledField>
      <LabeledField label="Offset X">
        <span style={{ fontSize: '13px', minWidth: '70px' }}>{part.offsetX ?? '0'}</span>
      </LabeledField>
      <LabeledField label="Offset Y">
        <span style={{ fontSize: '13px', minWidth: '70px' }}>{part.offsetY ?? '0'}</span>
      </LabeledField>
      <LabeledField label="Offset Z">
        <span style={{ fontSize: '13px', minWidth: '70px' }}>{part.offsetZ ?? '0'}</span>
      </LabeledField>
    </div>
  );
}

export default function EntityPartsPage({ entityId, parts, onChange, onOpenPartHitEditor, onBack }) {
  const list = parts || [];
  const [modelParts, setModelParts] = useState([]);
  const [modelStatus, setModelStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!entityId) {
      setModelParts([]);
      setModelStatus('');
      return;
    }
    invoke('load_geo_model_content', { kind: 'entities', id: entityId })
      .then(raw => {
        if (cancelled) return;
        const detected = modelHitboxPartsFromGeo(raw);
        setModelParts(detected);
        setModelStatus(detected.length > 0 ? `Found ${detected.length} model hitbox part${detected.length === 1 ? '' : 's'}.` : 'No hb_ model hitboxes found.');
        if ((parts || []).length === 0 && detected.length > 0) {
          onChange(detected);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setModelParts([]);
        setModelStatus('Import a geo model to scan hb_ hitboxes.');
      });
    return () => { cancelled = true; };
  }, [entityId]);

  const partHitStorageKey = entityId ? `ycs-blocky::entity::${entityId}::entityPartHit` : null;
  const hasPartHitGraph = partHitStorageKey ? !!localStorage.getItem(partHitStorageKey) : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="ycs-tiny-button" onClick={onBack} title="Back" style={{ border: '1px solid var(--ycs-foreground)' }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 12L6 8l4-4"/></svg>
        </button>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', flex: 1 }}>
          Hitbox Parts: {entityId || 'New Entity'}
        </h2>
        <button className="ycs-button" onClick={() => onChange(modelParts)} disabled={modelParts.length === 0}>Refresh From Model</button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '11px', opacity: 0.4 }}>
          Each part is an extra, independently-hittable hitbox that tracks a named bone from
          this entity's geo model every tick (a boss's tail, head, or wing, for example).
          Bone Name must exactly match a bone in the imported {'.geo.json'}. Hitting a part
          counts as damaging the whole entity (same as vanilla's Ender Dragon), and also
          fires the On Part Hit graph below with the struck part's name — useful for
          ability logic that only cares about one specific part (e.g. a tailswipe ability
          checking for a hit on the "tail" part).
        </div>
        <div style={{ fontSize: '11px', opacity: 0.55 }}>
          Model scan: {modelStatus}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FieldIconButton
            title="On Part Hit"
            disabled={!entityId}
            hasData={hasPartHitGraph}
            onClick={() => onOpenPartHitEditor && onOpenPartHitEditor(entityId, 'entityPartHit')}
          />
          <span style={{ fontSize: '13px' }}>On Part Hit</span>
          {!entityId && <span style={{ fontSize: '11px', opacity: 0.4 }}>(save the entity once first)</span>}
        </div>

        {list.length === 0 && <div style={{ opacity: 0.3, fontSize: '13px', padding: '8px 0' }}>No extra hitbox parts — this entity only has its normal single hitbox. Click Add Part.</div>}
        {list.map((p, i) => (
          <PartRow
            key={i}
            part={p}
          />
        ))}
      </div>
    </div>
  );
}
