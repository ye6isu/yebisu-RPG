import { FieldRow, StringField } from './Field/Field';

export default function EntityAnimationsPage({ entityId, headBone, idleAnim, walkAnim, onChangeHeadBone, onChangeIdleAnim, onChangeWalkAnim, onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="ycs-tiny-button" onClick={onBack} title="Back" style={{ border: '1px solid var(--ycs-foreground)' }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 12L6 8l4-4"/></svg>
        </button>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', flex: 1 }}>
          Entity Animations: {entityId || 'New Entity'}
        </h2>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <FieldRow label="Head Bone Name">
          <StringField value={headBone} onChange={onChangeHeadBone} placeholder="(none)" style={{ width: '100%' }} />
        </FieldRow>

        <FieldRow label="Idle Animation Name">
          <StringField value={idleAnim} onChange={onChangeIdleAnim} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Walk Animation Name">
          <StringField value={walkAnim} onChange={onChangeWalkAnim} placeholder="(none)" style={{ width: '100%' }} />
        </FieldRow>
      </div>
    </div>
  );
}
