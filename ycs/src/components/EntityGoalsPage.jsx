import { useState, useRef } from 'react';
import { StringField, StandardDropdownField } from './Field/Field';

const GOAL_TYPES = [
  { value: 'float', label: 'Float (swim)' },
  { value: 'wander', label: 'Wander' },
  { value: 'look_at_player', label: 'Look At Player' },
  { value: 'look_around', label: 'Look Around' },
  { value: 'avoid_entity', label: 'Avoid Entity' },
  { value: 'panic', label: 'Panic' },
  { value: 'tempt', label: 'Tempt' },
  { value: 'breed', label: 'Breed' },
  { value: 'ranged_attack', label: 'Ranged Attack' },
];

function defaultParams(type) {
  switch (type) {
    case 'wander': return { speedModifier: '1.0' };
    case 'look_at_player': return { maxDistance: '8' };
    case 'avoid_entity': return { speedModifier: '1.0', sprintSpeedModifier: '1.5', maxDistance: '8' };
    case 'panic': return { speedModifier: '1.25' };
    case 'tempt': return { speedModifier: '1.0', itemId: 'minecraft:wheat', canScare: false };
    case 'breed': return { speedModifier: '1.0', itemId: 'minecraft:wheat' };
    case 'ranged_attack': return { speedModifier: '1.0', attackInterval: '20', attackRadius: '10', damage: '3' };
    default: return {};
  }
}

function Checkbox({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0,
        border: `1px solid ${checked ? 'var(--ycs-highlight)' : 'var(--ycs-foreground)'}`,
        borderRadius: '3px', backgroundColor: checked ? 'var(--ycs-highlight)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {checked && (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  );
}

function GoalParamFields({ goal, onChangeParam }) {
  const p = goal.params || {};
  switch (goal.type) {
    case 'float':
      return null;
    case 'wander':
      return (
        <LabeledField label="Speed">
          <StringField value={p.speedModifier} onChange={v => onChangeParam('speedModifier', v)} style={{ width: '70px' }} />
        </LabeledField>
      );
    case 'look_at_player':
      return (
        <LabeledField label="Look Distance">
          <StringField value={p.maxDistance} onChange={v => onChangeParam('maxDistance', v)} style={{ width: '70px' }} />
        </LabeledField>
      );
    case 'look_around':
      return null;
    case 'avoid_entity':
      return (
        <>
          <LabeledField label="Speed">
            <StringField value={p.speedModifier} onChange={v => onChangeParam('speedModifier', v)} style={{ width: '70px' }} />
          </LabeledField>
          <LabeledField label="Sprint Speed">
            <StringField value={p.sprintSpeedModifier} onChange={v => onChangeParam('sprintSpeedModifier', v)} style={{ width: '70px' }} />
          </LabeledField>
          <LabeledField label="Max Distance">
            <StringField value={p.maxDistance} onChange={v => onChangeParam('maxDistance', v)} style={{ width: '70px' }} />
          </LabeledField>
        </>
      );
    case 'panic':
      return (
        <LabeledField label="Speed">
          <StringField value={p.speedModifier} onChange={v => onChangeParam('speedModifier', v)} style={{ width: '70px' }} />
        </LabeledField>
      );
    case 'tempt':
      return (
        <>
          <LabeledField label="Speed">
            <StringField value={p.speedModifier} onChange={v => onChangeParam('speedModifier', v)} style={{ width: '70px' }} />
          </LabeledField>
          <LabeledField label="Item">
            <StringField value={p.itemId} onChange={v => onChangeParam('itemId', v)} style={{ width: '140px' }} />
          </LabeledField>
          <LabeledField label="Can Scare">
            <Checkbox checked={!!p.canScare} onChange={v => onChangeParam('canScare', v)} />
          </LabeledField>
        </>
      );
    case 'breed':
      return (
        <>
          <LabeledField label="Speed">
            <StringField value={p.speedModifier} onChange={v => onChangeParam('speedModifier', v)} style={{ width: '70px' }} />
          </LabeledField>
          <LabeledField label="Breeding Item">
            <StringField value={p.itemId} onChange={v => onChangeParam('itemId', v)} style={{ width: '140px' }} />
          </LabeledField>
        </>
      );
    case 'ranged_attack':
      return (
        <>
          <LabeledField label="Speed">
            <StringField value={p.speedModifier} onChange={v => onChangeParam('speedModifier', v)} style={{ width: '70px' }} />
          </LabeledField>
          <LabeledField label="Attack Interval (ticks)">
            <StringField value={p.attackInterval} onChange={v => onChangeParam('attackInterval', v)} style={{ width: '90px' }} />
          </LabeledField>
          <LabeledField label="Attack Radius">
            <StringField value={p.attackRadius} onChange={v => onChangeParam('attackRadius', v)} style={{ width: '80px' }} />
          </LabeledField>
          <LabeledField label="Damage">
            <StringField value={p.damage} onChange={v => onChangeParam('damage', v)} style={{ width: '70px' }} />
          </LabeledField>
        </>
      );
    default:
      return null;
  }
}

function LabeledField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '10px', opacity: 0.5 }}>{label}</span>
      {children}
    </div>
  );
}

function GoalRow({ goal, index, onChangeParam, onDelete, onDragStart, onDragOver, onDrop }) {
  const label = GOAL_TYPES.find(g => g.value === goal.type)?.label || goal.type;
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index); }}
      onDrop={() => onDrop(index)}
      style={{
        display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '8px',
        borderRadius: 'var(--ycs-radius, 4px)', border: '1px solid var(--ycs-foreground)',
        cursor: 'grab',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '90px' }}>
        <span style={{ fontSize: '10px', opacity: 0.5 }}>Priority {index + 1}</span>
        <span style={{ fontSize: '13px', fontWeight: '500' }}>{label}</span>
      </div>
      <GoalParamFields goal={goal} onChangeParam={(k, v) => onChangeParam(index, k, v)} />
      <div style={{ flex: 1 }} />
      <div onClick={() => onDelete(index)} title="Remove" style={{ width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="9" fill="white" />
          <line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

export default function EntityGoalsPage({ entityId, goals, onChange, onBack }) {
  const [showAdd, setShowAdd] = useState(false);
  const dragIndex = useRef(null);

  const list = goals || [];

  const addGoal = (type) => {
    onChange([...list, { type, params: defaultParams(type) }]);
    setShowAdd(false);
  };

  const changeParam = (index, key, value) => {
    onChange(list.map((g, i) => i === index ? { ...g, params: { ...g.params, [key]: value } } : g));
  };

  const deleteGoal = (index) => {
    onChange(list.filter((_, i) => i !== index));
  };

  const handleDragStart = (index) => { dragIndex.current = index; };
  const handleDragOver = () => {};
  const handleDrop = (dropIndex) => {
    const from = dragIndex.current;
    if (from === null || from === dropIndex) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(dropIndex, 0, moved);
    dragIndex.current = null;
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="ycs-tiny-button" onClick={onBack} title="Back" style={{ border: '1px solid var(--ycs-foreground)' }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 12L6 8l4-4"/></svg>
        </button>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', flex: 1 }}>
          Entity Goals: {entityId || 'New Entity'}
        </h2>
        <div style={{ position: 'relative' }}>
          <button className="ycs-button" onClick={() => setShowAdd(v => !v)}>Add Goal</button>
          {showAdd && (
            <div className="dropdown" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', zIndex: 10, minWidth: '160px' }}>
              {GOAL_TYPES.map(g => (
                <div key={g.value} className="dropdown-item" onClick={() => addGoal(g.value)}>{g.label}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '11px', opacity: 0.4, marginBottom: '4px' }}>
          Nothing runs by default — add Float/Wander/Look At Player/Look Around explicitly if you want them. Look At Player uses the Head Bone Name set on the Animations page to actually turn the model's head. Melee Attack and targeting are driven by the Hostility field in Combat, not this list. Drag rows to reorder priority (top = highest).
        </div>
        <div style={{ fontSize: '11px', opacity: 0.4, marginBottom: '4px' }}>
          Note: Ranged Attack fires arrows, so it makes the most sense on a Hostile or Neutral entity — it isn't gated by Hostility, but a Passive entity with a Ranged Attack goal will still shoot at nearby players once one becomes its target another way.
        </div>
        {list.length === 0 && <div style={{ opacity: 0.3, fontSize: '13px', padding: '8px 0' }}>No goals yet — this entity will do nothing. Click Add Goal.</div>}
        {list.map((g, i) => (
          <GoalRow
            key={i}
            goal={g}
            index={i}
            onChangeParam={changeParam}
            onDelete={deleteGoal}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
}
