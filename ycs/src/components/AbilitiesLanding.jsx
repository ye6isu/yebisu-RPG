import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FieldRow, NumberInput, StandardDropdownField, StringField } from './Field/Field';
import BlockEditor from './BlockEditor';
import { compileChain, collectBlockImports } from '../codegen/visual/compiler.js';

const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';

const DEFAULT_ABILITY = {
  name: '',
  titleText: '',
  icon: '',
  cooldownSeconds: '0',
};

function sanitizeId(value) {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function javaString(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function removeInjections(injections) {
  if (!Array.isArray(injections)) return;
  for (const inj of [...injections].reverse()) {
    if (inj.type === 'java-marker') {
      await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content }).catch(() => {});
    } else if (inj.type === 'json-key') {
      await invoke('delete_json_key', { file: inj.file, key: inj.key }).catch(() => {});
    } else if (inj.type === 'created-file') {
      await invoke('delete_mod_file', { file: inj.file }).catch(() => {});
    }
  }
}

function AbilityRow({ ability, onClick, onDelete }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 10px',
        height: 40,
        background: 'transparent',
        border: '1px solid var(--ycs-foreground)',
        borderRadius: 'var(--ycs-radius, 4px)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background-color 0.1s, border-color 0.1s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = 'var(--ycs-accent)';
        e.currentTarget.style.borderColor = 'var(--ycs-highlight)';
        const del = e.currentTarget.querySelector('.row-delete');
        if (del) del.style.opacity = '1';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.borderColor = 'var(--ycs-foreground)';
        const del = e.currentTarget.querySelector('.row-delete');
        if (del) del.style.opacity = '0';
      }}
    >
      <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {ability.titleText || ability.name || ability.id}
      </span>
      <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 'var(--ycs-radius, 4px)', background: 'var(--ycs-foreground)', whiteSpace: 'nowrap' }}>
        {ability.cooldownSeconds ?? 0}s
      </span>
      <div
        className="row-delete"
        onClick={onDelete}
        title="Delete"
        style={{ width: 18, height: 18, cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s', flexShrink: 0 }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="9" fill="white"/>
          <line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
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

function AbilityEditor({ abilityId, onBack, onOpenBlockEditor }) {
  const [form, setForm] = useState(DEFAULT_ABILITY);
  const [textureOptions, setTextureOptions] = useState([{ value: '', label: '(none)' }]);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    invoke('list_textures')
      .then(async ids => {
        const loaded = [{ value: '', label: '(none)' }];
        for (const id of ids) {
          try {
            const raw = await invoke('load_texture', { id });
            const data = JSON.parse(raw);
            loaded.push({ value: id, label: data.label || data.id || id });
          } catch {}
        }
        if (!cancelled) setTextureOptions(loaded);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!abilityId) return;
    invoke('load_ycs_data', { category: 'abilities', id: abilityId })
      .then(raw => {
        const data = JSON.parse(raw);
        setForm({
          ...DEFAULT_ABILITY,
          ...data,
          name: data.name || abilityId,
          cooldownSeconds: String(data.cooldownSeconds ?? (data.cooldownTicks != null ? Number(data.cooldownTicks) / 20 : DEFAULT_ABILITY.cooldownSeconds)),
        });
      })
      .catch(() => {});
  }, [abilityId]);

  const setField = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const handleSave = async () => {
    const id = sanitizeId(form.name);
    if (!id) {
      setStatus({ ok: false, msg: 'Name is required.' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const prev = abilityId
        ? await invoke('load_ycs_data', { category: 'abilities', id: abilityId }).then(r => JSON.parse(r)).catch(() => null)
        : null;
      await removeInjections(prev?._injections);

      if (abilityId && abilityId !== id) {
        const oldKey = `ycs-blocky::ability::${abilityId}::abilityUse`;
        const raw = localStorage.getItem(oldKey);
        if (raw) {
          localStorage.setItem(`ycs-blocky::ability::${id}::abilityUse`, raw);
          localStorage.removeItem(oldKey);
        }
      }

      const cooldownSeconds = Math.max(0, parseFloat(form.cooldownSeconds || '0') || 0);
      const registryLine = `        AbilityRegistry.register("${javaString(id)}", "${javaString(form.icon)}", ${cooldownSeconds});`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/keybind/AbilityRegistry.java`,
        marker: 'YCS_Abilities',
        content: registryLine,
      });

      const injections = [
        { type: 'java-marker', file: `${JAVA_BASE}/keybind/AbilityRegistry.java`, marker: 'YCS_Abilities', content: registryLine },
      ];
      if (form.icon) {
        const iconFile = `resources/assets/yebisurpg/textures/hud/${form.icon}.png`;
        await invoke('copy_texture_to_mod', { textureId: form.icon, destFile: iconFile });
        injections.push({ type: 'created-file', file: iconFile });
      }

      const useRaw = localStorage.getItem(`ycs-blocky::ability::${id}::abilityUse`);
      if (useRaw) {
        try {
          const nodes = JSON.parse(useRaw);
          const startNode = nodes.find(n => n.id === 'start');
          if (startNode?.nextId) {
            const lines = compileChain(startNode.nextId, nodes, 'abilityUse');
            const caseLine = `            case "${javaString(id)}" -> { ${lines.join(' ')} }`;
            await invoke('inject_marker', {
              file: `${JAVA_BASE}/keybind/AbilityHandlers.java`,
              marker: 'YCS_Ability_Use_Dispatch',
              content: caseLine,
            });
            injections.push({ type: 'java-marker', file: `${JAVA_BASE}/keybind/AbilityHandlers.java`, marker: 'YCS_Ability_Use_Dispatch', content: caseLine });

            for (const imp of collectBlockImports(nodes)) {
              const importLine = `import ${imp};`;
              await invoke('inject_marker', {
                file: `${JAVA_BASE}/keybind/AbilityHandlers.java`,
                marker: 'YCS_Ability_Handler_Imports',
                content: importLine,
              });
              injections.push({ type: 'java-marker', file: `${JAVA_BASE}/keybind/AbilityHandlers.java`, marker: 'YCS_Ability_Handler_Imports', content: importLine });
            }
          }
        } catch (e) {
          console.error('Block compile error for abilityUse', e);
        }
      }

      const payload = {
        name: id,
        titleText: form.titleText.trim(),
        icon: form.icon,
        cooldownSeconds,
        _injections: injections,
      };

      await invoke('save_ycs_data', { category: 'abilities', id, content: JSON.stringify(payload, null, 2) });
      if (abilityId && abilityId !== id) {
        await invoke('delete_ycs_data', { category: 'abilities', id: abilityId }).catch(() => {});
      }
      setStatus({ ok: true, msg: 'Saved.' });
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: String(err) });
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!abilityId) return;
    if (!window.confirm(`Delete ability "${form.titleText || form.name || abilityId}"?`)) return;
    setSaving(true);
    try {
      const prev = await invoke('load_ycs_data', { category: 'abilities', id: abilityId }).then(r => JSON.parse(r)).catch(() => null);
      await removeInjections(prev?._injections);
      localStorage.removeItem(`ycs-blocky::ability::${abilityId}::abilityUse`);
      await invoke('delete_ycs_data', { category: 'abilities', id: abilityId });
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Remove failed: ' + err });
    }
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', flex: 1 }}>
          {abilityId ? `Edit Ability: ${abilityId}` : 'New Ability'}
        </h2>
        {status && <span style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</span>}
        {abilityId && <button className="ycs-button" onClick={handleRemove} disabled={saving} style={{ color: '#e05252' }}>Remove</button>}
        <button className="ycs-button" onClick={onBack}>Cancel</button>
        <button className="ycs-button" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <FieldRow label="Name">
          <StringField value={form.name} onChange={v => setField('name', sanitizeId(v))} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Display Text">
          <StringField value={form.titleText} onChange={v => setField('titleText', v)} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Icon">
          <StandardDropdownField value={form.icon} onChange={v => setField('icon', v)} options={textureOptions} searchable />
        </FieldRow>
        <FieldRow label="Cooldown Seconds">
          <NumberInput value={form.cooldownSeconds} onChange={v => setField('cooldownSeconds', v)} style={{ width: '120px' }} />
        </FieldRow>
        <FieldRow label="On Use">
          <FieldIconButton
            title="On Use"
            disabled={!abilityId}
            hasData={!!abilityId && !!localStorage.getItem(`ycs-blocky::ability::${abilityId}::abilityUse`)}
            onClick={() => onOpenBlockEditor && onOpenBlockEditor(abilityId, 'abilityUse')}
          />
        </FieldRow>
        {!abilityId && (
          <div style={{ fontSize: 11, opacity: 0.5 }}>
            Save this ability first to attach On Use behavior.
          </div>
        )}
      </div>
    </div>
  );
}

export default function AbilitiesLanding() {
  const [abilities, setAbilities] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [blockEditing, setBlockEditing] = useState(null);

  const reload = useCallback(async () => {
    try {
      const ids = await invoke('list_ycs_data', { category: 'abilities' });
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'abilities', id });
          loaded.push({ id, ...JSON.parse(raw) });
        } catch {}
      }
      setAbilities(loaded);
    } catch {
      setAbilities([]);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const deleteAbility = async (ability, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ability "${ability.titleText || ability.name || ability.id}"?`)) return;
    try {
      await removeInjections(ability._injections);
      localStorage.removeItem(`ycs-blocky::ability::${ability.id}::abilityUse`);
      await invoke('delete_ycs_data', { category: 'abilities', id: ability.id });
      await reload();
    } catch {}
  };

  if (creating || editing) {
    return (
      <div style={{ position: 'relative', height: '100%' }}>
        <div style={{ height: '100%', visibility: blockEditing ? 'hidden' : 'visible', pointerEvents: blockEditing ? 'none' : 'auto' }}>
          <AbilityEditor
            abilityId={editing || undefined}
            onBack={() => { setCreating(false); setEditing(null); reload(); }}
            onOpenBlockEditor={(abilityId, methodKey) => setBlockEditing({ abilityId, methodKey })}
          />
        </div>
        {blockEditing && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <BlockEditor abilityId={blockEditing.abilityId} methodKey={blockEditing.methodKey} onBack={() => setBlockEditing(null)} />
          </div>
        )}
      </div>
    );
  }

  const filtered = abilities.filter(ability => {
    const label = ability.titleText || ability.name || ability.id;
    return !search || label.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Abilities</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            className="ycs-string-input"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '160px' }}
          />
          <button className="ycs-button icon" onClick={() => setCreating(true)} title="New Ability">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: 0 }}>
        {filtered.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filtered.map(ability => (
              <AbilityRow
                key={ability.id}
                ability={ability}
                onClick={() => setEditing(ability.id)}
                onDelete={e => deleteAbility(ability, e)}
              />
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.3, fontSize: '13px', padding: '8px 0' }}>No abilities yet. Click + to add one.</div>
        )}
      </div>
    </div>
  );
}
