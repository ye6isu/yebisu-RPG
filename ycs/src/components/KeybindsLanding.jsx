import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FieldRow, StringField } from './Field/Field';
import BlockEditor from './BlockEditor';
import { compileChain, collectBlockImports } from '../codegen/visual/compiler.js';

const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';

const CODE_TO_GLFW_KEY = { Backquote: 'GRAVE_ACCENT', Minus: 'MINUS', Equal: 'EQUAL', BracketLeft: 'LEFT_BRACKET', BracketRight: 'RIGHT_BRACKET', Semicolon: 'SEMICOLON', Quote: 'APOSTROPHE', Comma: 'COMMA', Period: 'PERIOD', Slash: 'SLASH', Backslash: 'BACKSLASH', Space: 'SPACE', Tab: 'TAB', Enter: 'ENTER', Backspace: 'BACKSPACE', CapsLock: 'CAPS_LOCK', ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Insert: 'INSERT', Delete: 'DELETE', Home: 'HOME', End: 'END', PageUp: 'PAGE_UP', PageDown: 'PAGE_DOWN' };
const MODIFIER_CODES = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight']);
const KEY_OPTIONS = (() => {
  const opts = [];
  for (let i = 0; i < 26; i++) opts.push({ value: 'KEY_' + String.fromCharCode(65 + i), label: String.fromCharCode(65 + i) });
  for (let i = 0; i <= 9; i++) opts.push({ value: 'KEY_' + i, label: String(i) });
  for (let i = 1; i <= 25; i++) opts.push({ value: 'KEY_F' + i, label: 'F' + i });
  Object.values(CODE_TO_GLFW_KEY).forEach(name => { if (!opts.some(o => o.value === 'KEY_' + name)) opts.push({ value: 'KEY_' + name, label: name.replace(/_/g, ' ') }); });
  opts.push({ value: 'MOUSE_0', label: 'Mouse 1' }, { value: 'MOUSE_1', label: 'Mouse 2' }, { value: 'MOUSE_2', label: 'Mouse 3' }, { value: 'MOUSE_3', label: 'Mouse 4' }, { value: 'MOUSE_4', label: 'Mouse 5' });
  return opts;
})();

function splitBindCode(code) {
  if (!code || code === 'NONE') return { base: 'NONE', mod: 'NONE' };
  const [base, mod] = code.split('+');
  return { base, mod: mod || 'NONE' };
}
function joinBindCode(base, mod) {
  if (!base || base === 'NONE') return 'NONE';
  return mod && mod !== 'NONE' ? `${base}+${mod}` : base;
}
function domEventToBindCode(e) {
  let base = null;
  if (e.code?.startsWith('Key')) base = 'KEY_' + e.code.slice(3).toUpperCase();
  else if (e.code?.startsWith('Digit')) base = 'KEY_' + e.code.slice(5);
  else if (e.code?.startsWith('F') && /^F\d+$/.test(e.code)) base = 'KEY_' + e.code;
  else if (CODE_TO_GLFW_KEY[e.code]) base = 'KEY_' + CODE_TO_GLFW_KEY[e.code];
  if (!base) return null;
  const mod = e.ctrlKey ? 'CTRL' : e.altKey ? 'ALT' : e.shiftKey ? 'SHIFT' : 'NONE';
  return joinBindCode(base, mod);
}
export function bindCodeLabel(code) {
  const { base, mod } = splitBindCode(code);
  if (base === 'NONE') return '(none)';
  const baseLabel = base.startsWith('MOUSE_') ? 'Mouse ' + (parseInt(base.slice(6)) + 1) : base.slice(4).replace(/_/g, ' ');
  const modLabel = mod === 'CTRL' ? 'Ctrl' : mod === 'ALT' ? 'Alt' : mod === 'SHIFT' ? 'Shift' : null;
  return modLabel ? `${modLabel} + ${baseLabel}` : baseLabel;
}

// Java-side mapping: base key -> { type: InputConstants.Type, code: GLFW constant }
function bindCodeToJava(bindCode) {
  const { base, mod } = splitBindCode(bindCode);
  if (base === 'NONE') return null;
  const modJava = { NONE: 'NONE', CTRL: 'CONTROL', ALT: 'ALT', SHIFT: 'SHIFT' }[mod] || 'NONE';
  if (base.startsWith('MOUSE_')) {
    const idx = parseInt(base.slice(6));
    return { type: 'InputConstants.Type.MOUSE', code: String(idx), modifier: modJava };
  }
  const name = base.slice(4);
  const glfw = /^[0-9]$/.test(name) ? `GLFW.GLFW_KEY_${name}`
    : /^F[0-9]+$/.test(name) ? `GLFW.GLFW_KEY_${name}`
    : `GLFW.GLFW_KEY_${name}`;
  return { type: 'InputConstants.Type.KEYSYM', code: glfw, modifier: modJava };
}

export function keybindConstName(name) {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

const OWN_CATEGORY = 'CATEGORY'; // resolves to ModKeybinds.CATEGORY ("yebisu RPG") in generated Java
const VANILLA_CATEGORIES = [
  { value: 'key.categories.movement', label: 'Movement' },
  { value: 'key.categories.gameplay', label: 'Gameplay' },
  { value: 'key.categories.inventory', label: 'Inventory' },
  { value: 'key.categories.creative', label: 'Creative' },
  { value: 'key.categories.multiplayer', label: 'Multiplayer' },
  { value: 'key.categories.ui', label: 'Interface' },
  { value: 'key.categories.misc', label: 'Misc' },
];

function categoryToJava(category) {
  return category === OWN_CATEGORY ? 'CATEGORY' : `"${category}"`;
}

function CategoryPicker({ value, onChange }) {
  const known = [OWN_CATEGORY, ...VANILLA_CATEGORIES.map(c => c.value)];
  const isCustom = value && !known.includes(value);
  const [customMode, setCustomMode] = useState(isCustom);
  const options = [
    { value: OWN_CATEGORY, label: 'yebisu RPG' },
    ...VANILLA_CATEGORIES,
    { value: '__custom__', label: '+ New custom category…' },
  ];
  if (customMode) {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="ycs-string-input"
          value={value}
          onChange={e => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
          style={{ flex: 1 }}
        />
        <button className="ycs-button" onClick={() => { setCustomMode(false); onChange(OWN_CATEGORY); }}>Cancel</button>
      </div>
    );
  }
  return (
    <select
      className="ycs-string-input"
      value={known.includes(value) ? value : OWN_CATEGORY}
      onChange={e => {
        if (e.target.value === '__custom__') { setCustomMode(true); onChange(''); }
        else onChange(e.target.value);
      }}
      style={{ width: '100%' }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function RecordKeyButton({ value, onChange }) {
  const [recording, setRecording] = useState(false);
  const { base, mod } = splitBindCode(value);
  useEffect(() => {
    if (!recording) return;
    const onKey = e => {
      if (MODIFIER_CODES.has(e.code)) return;
      e.preventDefault();
      const code = domEventToBindCode(e);
      if (code) { onChange(code); setRecording(false); }
    };
    const MOUSE_REMAP = { 0: 0, 1: 2, 2: 1 };
    const onMouse = e => {
      e.preventDefault();
      const m = e.ctrlKey ? 'CTRL' : e.altKey ? 'ALT' : e.shiftKey ? 'SHIFT' : 'NONE';
      onChange(joinBindCode('MOUSE_' + (MOUSE_REMAP[e.button] ?? e.button), m));
      setRecording(false);
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('mousedown', onMouse, true);
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('mousedown', onMouse, true); };
  }, [recording, onChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="ycs-button" onClick={() => setRecording(v => !v)}>
          {recording ? 'Press a key or mouse button…' : 'Record'}
        </button>
        <select className="ycs-string-input" value={base} onChange={e => onChange(joinBindCode(e.target.value, mod))} style={{ width: 180 }}>
          <option value="NONE">(none)</option>
          {KEY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <select className="ycs-string-input" value={mod} onChange={e => onChange(joinBindCode(base, e.target.value))} style={{ width: 120 }}>
          <option value="NONE">No modifier</option>
          <option value="CTRL">Ctrl</option>
          <option value="ALT">Alt</option>
          <option value="SHIFT">Shift</option>
        </select>
        <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 'var(--ycs-radius, 4px)', background: 'var(--ycs-foreground)' }}>{bindCodeLabel(value)}</span>
        {base !== 'NONE' && !recording && <button className="ycs-button" onClick={() => onChange('NONE')}>Clear</button>}
      </div>
    </div>
  );
}

function KeybindRow({ keybind, onClick, onDelete }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 10px', height: 40,
        background: 'transparent', border: '1px solid var(--ycs-foreground)',
        borderRadius: 'var(--ycs-radius, 4px)', cursor: 'pointer', position: 'relative',
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
      <span style={{ fontSize: 13, flex: 1 }}>{keybind.titleText || keybind.name || keybind.id}</span>
      <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 'var(--ycs-radius, 4px)', background: 'var(--ycs-foreground)' }}>{bindCodeLabel(keybind.bindCode)}</span>
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

function KeybindEditor({ keybindId, onBack, onOpenBlockEditor }) {
  const [name, setName] = useState('');
  const [titleText, setTitleText] = useState('');
  const [bindCode, setBindCode] = useState('NONE');
  const [category, setCategory] = useState(OWN_CATEGORY);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!keybindId) return;
    invoke('load_ycs_data', { category: 'keybinds', id: keybindId })
      .then(raw => {
        const data = JSON.parse(raw);
        setName(data.name || keybindId);
        setTitleText(data.titleText || '');
        setBindCode(data.bindCode || 'NONE');
        setCategory(data.category || OWN_CATEGORY);
      })
      .catch(() => {});
  }, [keybindId]);

  const handleSave = async () => {
    const trimmed = name.trim().toLowerCase().replace(/\s/g, '_');
    if (!trimmed) { setStatus({ ok: false, msg: 'Name is required.' }); return; }
    setSaving(true);
    setStatus(null);
    try {
      const id = keybindId || trimmed;
      const constName = keybindConstName(trimmed);

      // Remove old injections if renaming/re-saving (idempotent re-inject)
      if (keybindId) {
        const prev = await invoke('load_ycs_data', { category: 'keybinds', id: keybindId }).then(r => JSON.parse(r)).catch(() => null);
        if (prev?._injections) {
          for (const inj of prev._injections) {
            await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content }).catch(() => {});
          }
        }
      }

      const injections = [];
      const javaBind = bindCodeToJava(bindCode);
      const javaCategory = categoryToJava(category || OWN_CATEGORY);

      // Field: public static final KeyMapping <NAME> = bind(...)
      const fieldLine = javaBind
        ? `    public static final KeyMapping ${constName} = bind("${trimmed}", ${javaBind.type}, ${javaBind.code}, KeyModifier.${javaBind.modifier}, ${javaCategory});`
        : `    public static final KeyMapping ${constName} = bind("${trimmed}", InputConstants.Type.KEYSYM, InputConstants.UNKNOWN.getValue(), KeyModifier.NONE, ${javaCategory});`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/client/ModKeybinds.java`,
        marker: 'YCS_Mod_Keybinds',
        content: fieldLine,
      });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/client/ModKeybinds.java`, marker: 'YCS_Mod_Keybinds', content: fieldLine });

      // Registration: event.register(FIELD)
      const regLine = `        event.register(${constName});`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/client/ModKeybinds.java`,
        marker: 'YCS_Mod_Keybinds_Register',
        content: regLine,
      });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/client/ModKeybinds.java`, marker: 'YCS_Mod_Keybinds_Register', content: regLine });

      // Client-side registry: ClientKeybindRegistry.register(id, ModKeybinds.FIELD)
      const clientRegLine = `        ClientKeybindRegistry.register("${trimmed}", ModKeybinds.${constName});`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/keybind/client/ClientKeybindRegistry.java`,
        marker: 'YCS_Keybind_Register',
        content: clientRegLine,
      });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/keybind/client/ClientKeybindRegistry.java`, marker: 'YCS_Keybind_Register', content: clientRegLine });

      // Lang key
      await invoke('set_json_key', {
        file: `resources/assets/yebisurpg/lang/en_us.json`,
        key: `key.yebisurpg.${trimmed}`,
        value: titleText || trimmed,
      });
      injections.push({ type: 'json-key', file: `resources/assets/yebisurpg/lang/en_us.json`, key: `key.yebisurpg.${trimmed}` });

      // Carry over any Blocky graphs from the old id if renamed
      if (keybindId && keybindId !== id) {
        for (const methodKey of ['keybindPress', 'keybindRelease']) {
          const raw = localStorage.getItem(`ycs-blocky::keybind::${keybindId}::${methodKey}`);
          if (raw) {
            localStorage.setItem(`ycs-blocky::keybind::${id}::${methodKey}`, raw);
            localStorage.removeItem(`ycs-blocky::keybind::${keybindId}::${methodKey}`);
          }
        }
      }

      // Compile On Press / On Release Blocky graphs into KeybindHandlers.java
      const dispatchMarkers = { keybindPress: 'YCS_Keybind_Press_Dispatch', keybindRelease: 'YCS_Keybind_Release_Dispatch' };
      const allImports = new Set();
      for (const [methodKey, marker] of Object.entries(dispatchMarkers)) {
        const raw = localStorage.getItem(`ycs-blocky::keybind::${id}::${methodKey}`);
        if (!raw) continue;
        try {
          const nodes = JSON.parse(raw);
          const startNode = nodes.find(n => n.id === 'start');
          if (!startNode?.nextId) continue;
          const lines = compileChain(startNode.nextId, nodes, methodKey);
          for (const imp of collectBlockImports(nodes)) allImports.add(imp);
          const caseLine = `            case "${trimmed}" -> { ${lines.join(' ')} }`;
          await invoke('inject_marker', {
            file: `${JAVA_BASE}/keybind/KeybindHandlers.java`,
            marker,
            content: caseLine,
          });
          injections.push({ type: 'java-marker', file: `${JAVA_BASE}/keybind/KeybindHandlers.java`, marker, content: caseLine });
        } catch (e) {
          console.error('Block compile error for', methodKey, e);
        }
      }

      for (const imp of allImports) {
        const importLine = `import ${imp};`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/keybind/KeybindHandlers.java`,
          marker: 'YCS_Keybind_Handler_Imports',
          content: importLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/keybind/KeybindHandlers.java`, marker: 'YCS_Keybind_Handler_Imports', content: importLine });
      }

      const payload = { name: trimmed, titleText, bindCode, category: category || OWN_CATEGORY, _injections: injections };
      await invoke('save_ycs_data', { category: 'keybinds', id, content: JSON.stringify(payload, null, 2) });

      if (keybindId && keybindId !== id) {
        await invoke('delete_ycs_data', { category: 'keybinds', id: keybindId }).catch(() => {});
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
    if (!keybindId) return;
    setSaving(true);
    try {
      const prev = await invoke('load_ycs_data', { category: 'keybinds', id: keybindId }).then(r => JSON.parse(r)).catch(() => null);
      if (prev?._injections) {
        for (const inj of prev._injections) {
          if (inj.type === 'java-marker') {
            await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content }).catch(() => {});
          } else if (inj.type === 'json-key') {
            await invoke('delete_json_key', { file: inj.file, key: inj.key }).catch(() => {});
          }
        }
      }
      await invoke('delete_ycs_data', { category: 'keybinds', id: keybindId });
      localStorage.removeItem(`ycs-blocky::keybind::${keybindId}::keybindPress`);
      localStorage.removeItem(`ycs-blocky::keybind::${keybindId}::keybindRelease`);
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
          {keybindId ? `Edit Keybind: ${keybindId}` : 'New Keybind'}
        </h2>
        {status && <span style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</span>}
        {keybindId && <button className="ycs-button" onClick={handleRemove} disabled={saving} style={{ color: '#e05252' }}>Remove</button>}
        <button className="ycs-button" onClick={onBack}>Cancel</button>
        <button className="ycs-button" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <FieldRow label="Name">
          <StringField value={name} onChange={v => setName(v.toLowerCase().replace(/\s/g, '_'))} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Display Text">
          <StringField value={titleText} onChange={setTitleText} style={{ width: '100%' }} />
        </FieldRow>
        <FieldRow label="Default Binding">
          <RecordKeyButton value={bindCode} onChange={setBindCode} />
        </FieldRow>
        <FieldRow label="Category">
          <CategoryPicker value={category} onChange={setCategory} />
        </FieldRow>
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>
          This is how the binding will appear in the vanilla Controls screen. Players can rebind it there like any other keybind.
        </div>
        <FieldRow label="On Press">
          <FieldIconButton
            title="On Press"
            disabled={!keybindId}
            hasData={!!keybindId && !!localStorage.getItem(`ycs-blocky::keybind::${keybindId}::keybindPress`)}
            onClick={() => onOpenBlockEditor && onOpenBlockEditor(keybindId, 'keybindPress')}
          />
        </FieldRow>
        <FieldRow label="On Release">
          <FieldIconButton
            title="On Release"
            disabled={!keybindId}
            hasData={!!keybindId && !!localStorage.getItem(`ycs-blocky::keybind::${keybindId}::keybindRelease`)}
            onClick={() => onOpenBlockEditor && onOpenBlockEditor(keybindId, 'keybindRelease')}
          />
        </FieldRow>
        {!keybindId && (
          <div style={{ fontSize: 11, opacity: 0.5 }}>
            Save this keybind first to attach On Press / On Release behavior.
          </div>
        )}
      </div>
    </div>
  );
}

export default function KeybindsLanding() {
  const [keybinds, setKeybinds] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [blockEditing, setBlockEditing] = useState(null); // { keybindId, methodKey }

  const reload = useCallback(async () => {
    try {
      const ids = await invoke('list_ycs_data', { category: 'keybinds' });
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'keybinds', id });
          loaded.push({ id, ...JSON.parse(raw) });
        } catch {}
      }
      setKeybinds(loaded);
    } catch { setKeybinds([]); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const deleteKeybind = async (keybind, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete keybind "${keybind.titleText || keybind.name || keybind.id}"? Any Blocky graphs referencing it will go stale.`)) {
      return;
    }
    try {
      if (keybind._injections) {
        for (const inj of keybind._injections) {
          if (inj.type === 'java-marker') {
            await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content }).catch(() => {});
          } else if (inj.type === 'json-key') {
            await invoke('delete_json_key', { file: inj.file, key: inj.key }).catch(() => {});
          }
        }
      }
      await invoke('delete_ycs_data', { category: 'keybinds', id: keybind.id });
      await reload();
    } catch {}
  };

  if (creating || editing) {
    return (
      <div style={{ position: 'relative', height: '100%' }}>
        <div style={{ height: '100%', visibility: blockEditing ? 'hidden' : 'visible', pointerEvents: blockEditing ? 'none' : 'auto' }}>
          <KeybindEditor
            keybindId={editing || undefined}
            onBack={() => { setCreating(false); setEditing(null); reload(); }}
            onOpenBlockEditor={(keybindId, methodKey) => setBlockEditing({ keybindId, methodKey })}
          />
        </div>
        {blockEditing && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <BlockEditor keybindId={blockEditing.keybindId} methodKey={blockEditing.methodKey} onBack={() => setBlockEditing(null)} />
          </div>
        )}
      </div>
    );
  }

  const filtered = keybinds.filter(k => !search || (k.titleText || k.name || k.id).toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Keybinds</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            className="ycs-string-input"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '160px' }}
          />
          <button className="ycs-button icon" onClick={() => setCreating(true)} title="New Keybind">
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
            {filtered.map(keybind => (
              <KeybindRow
                key={keybind.id}
                keybind={keybind}
                onClick={() => setEditing(keybind.id)}
                onDelete={e => deleteKeybind(keybind, e)}
              />
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.3, fontSize: '13px', padding: '8px 0' }}>No keybinds yet. Click + to add one.</div>
        )}
      </div>
    </div>
  );
}
