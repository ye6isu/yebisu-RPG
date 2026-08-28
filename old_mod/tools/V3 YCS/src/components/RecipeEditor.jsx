import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FieldRow, StringField, NumberInput, StandardDropdownField, DropdownField } from './Field/Field';
import { VANILLA_ITEMS } from '../data/vanillaItems';

const MODID = 'yebisurpg';
const RECIPE_DIR = `resources/data/${MODID}/recipe`;

const RECIPE_TYPES = [
  { label: 'Shaped Crafting', value: 'shaped' },
  { label: 'Shapeless Crafting', value: 'shapeless' },
  { label: 'Smelting', value: 'smelting' },
  { label: 'Blasting', value: 'blasting' },
  { label: 'Smoking', value: 'smoking' },
  { label: 'Campfire Cooking', value: 'campfire_cooking' },
  { label: 'Stonecutting', value: 'stonecutting' },
];

const RECIPE_TYPE_MAP = {
  shaped: 'minecraft:crafting_shaped',
  shapeless: 'minecraft:crafting_shapeless',
  smelting: 'minecraft:smelting',
  blasting: 'minecraft:blasting',
  smoking: 'minecraft:smoking',
  campfire_cooking: 'minecraft:campfire_cooking',
  stonecutting: 'minecraft:stonecutting',
};

export const CHAR_POOL = 'ABCDEFGHI';

export const EMPTY_GRID = Array(9).fill('');

function FieldGroup({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{
        fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
        opacity: 0.4, padding: '4px 0', userSelect: 'none',
      }}>
        {label}
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '4px',
        borderLeft: '1px solid var(--ycs-foreground)',
        paddingLeft: '12px', marginLeft: '4px',
      }}>
        {children}
      </div>
    </div>
  );
}

// grid: array of 9 item-id strings (index 0-8 = row0col0..row2col2), '' = empty
export function gridToPattern(grid, charMap) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    let row = '';
    for (let c = 0; c < 3; c++) {
      const item = grid[r * 3 + c];
      row += item ? (charMap[item] || ' ') : ' ';
    }
    rows.push(row);
  }
  // trim trailing empty rows
  while (rows.length > 1 && rows[rows.length - 1].trim() === '') rows.pop();
  // trim trailing spaces from each row — keep rows same length
  const maxUsed = Math.max(...rows.map(r => {
    let last = 0;
    for (let i = 0; i < r.length; i++) if (r[i] !== ' ') last = i + 1;
    return last;
  }));
  return rows.map(r => r.slice(0, maxUsed || 1));
}

export function buildCharMap(grid) {
  // item -> char, assigned in order of first appearance
  const map = {};
  let charIdx = 0;
  for (const item of grid) {
    if (item && !map[item]) {
      map[item] = CHAR_POOL[charIdx++];
    }
  }
  return map;
}

export function ShapedGrid({ grid, onGridChange, itemOptions }) {
  const [selectedItem, setSelectedItem] = useState('');
  const charMap = buildCharMap(grid);

  const itemLabel = (id) => {
    if (!id) return null;
    const opt = itemOptions.find(o => o.value === id);
    return opt ? opt.label.split(' — ')[0] : id;
  };

  const handleCellClick = (e, idx) => {
    e.preventDefault();
    const next = [...grid];
    next[idx] = selectedItem;
    onGridChange(next);
  };

  const handleCellRightClick = (e, idx) => {
    e.preventDefault();
    const next = [...grid];
    next[idx] = '';
    onGridChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {[0, 1, 2].map(row => (
          <div key={row} style={{ display: 'flex', gap: '2px' }}>
            {[0, 1, 2].map(col => {
              const idx = row * 3 + col;
              const item = grid[idx];
              const ch = item ? charMap[item] : null;
              return (
                <div
                  key={col}
                  onClick={e => handleCellClick(e, idx)}
                  onContextMenu={e => handleCellRightClick(e, idx)}
                  title={item ? `${itemLabel(item)} (right-click to clear)` : 'Empty (left-click to place)'}
                  style={{
                    width: '56px', height: '56px', flexShrink: 0,
                    border: `1px solid ${item ? 'var(--ycs-highlight)' : 'var(--ycs-foreground)'}`,
                    borderRadius: 'var(--ycs-radius, 4px)',
                    backgroundColor: item ? 'var(--ycs-accent)' : 'transparent',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', userSelect: 'none', gap: '2px',
                    transition: 'border-color 0.1s, background-color 0.1s',
                    overflow: 'hidden', padding: '2px', boxSizing: 'border-box',
                  }}
                >
                  {item ? (
                    <>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--ycs-highlight)' }}>{ch}</span>
                      <span style={{ fontSize: '8px', opacity: 0.6, textAlign: 'center', lineHeight: 1.1, wordBreak: 'break-all' }}>
                        {itemLabel(item)?.slice(0, 12)}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '18px', opacity: 0.15 }}>·</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <FieldRow label="Ingredient">
        <DropdownField
          value={selectedItem}
          onChange={setSelectedItem}
          options={itemOptions}
        />
      </FieldRow>
    </div>
  );
}

export function ShapelessIngredients({ ingredients, onChange, itemOptions, max = 9 }) {
  const add = () => {
    if (ingredients.length < max) onChange([...ingredients, '']);
  };
  const set = (i, v) => {
    const next = [...ingredients];
    next[i] = v;
    onChange(next);
  };
  const remove = (i) => onChange(ingredients.filter((_, idx) => idx !== i));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {ingredients.map((ing, i) => (
        <div key={i} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <DropdownField value={ing} onChange={(v) => set(i, v)} options={itemOptions} />
          </div>
          <button className="ycs-button icon" onClick={() => remove(i)} title="Remove" style={{ flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
      {ingredients.length < max && (
        <button className="ycs-button" style={{ alignSelf: 'flex-start', minWidth: 0, padding: '4px 10px', fontSize: '12px' }} onClick={add}>
          + Add Ingredient
        </button>
      )}
    </div>
  );
}

export default function RecipeEditor({ recipeId: existingId, onBack }) {
  const [recipeId, setRecipeId] = useState('');
  const [recipeType, setRecipeType] = useState('shaped');
  const [result, setResult] = useState('');
  const [resultCount, setResultCount] = useState('1');
  // shaped
  const [grid, setGrid] = useState(EMPTY_GRID);
  // shapeless
  const [ingredients, setIngredients] = useState(['']);
  // cooking / stonecutting
  const [ingredient, setIngredient] = useState('');
  const [experience, setExperience] = useState('0.0');
  const [cookingTime, setCookingTime] = useState('200');

  const [itemOptions, setItemOptions] = useState([]);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [injected, setInjected] = useState(false);
  const [currentInjections, setCurrentInjections] = useState([]);
  const [lastSavedId, setLastSavedId] = useState(existingId || null);

  const loadItemOptions = useCallback(async () => {
    const modItems = [];
    try {
      const ids = await invoke('list_ycs_data', { category: 'items' });
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'items', id });
          const data = JSON.parse(raw);
          modItems.push({ label: `${data.displayName || data.id} — ${MODID}:${data.id}`, value: `${MODID}:${data.id}` });
        } catch {}
      }
    } catch {}
    setItemOptions([
      ...modItems,
      ...VANILLA_ITEMS.map(i => ({ label: `${i.displayName} — ${i.id}`, value: i.id })),
    ]);
  }, []);

  useEffect(() => {
    loadItemOptions();
    if (existingId) {
      invoke('load_ycs_data', { category: 'recipes', id: existingId })
        .then(raw => {
          const data = JSON.parse(raw);
          setRecipeId(data.id || '');
          setRecipeType(data.recipeType || 'shaped');
          setResult(data.result || '');
          setResultCount(String(data.resultCount ?? 1));
          setGrid(data.grid || EMPTY_GRID);
          setIngredients(data.ingredients || ['']);
          setIngredient(data.ingredient || '');
          setExperience(String(data.experience ?? 0.0));
          setCookingTime(String(data.cookingTime ?? 200));
          const inj = Array.isArray(data._injections) ? data._injections : [];
          setCurrentInjections(inj);
          setInjected(inj.length > 0);
        })
        .catch(() => {});
    }
  }, [existingId, loadItemOptions]);

  const handleIdChange = (v) => setRecipeId(v.toLowerCase().replace(/\s/g, '_'));

  const removeExistingInjections = async () => {
    for (const inj of currentInjections) {
      try {
        if (inj.type === 'created-file') {
          await invoke('delete_mod_file', { file: inj.file });
        }
      } catch {}
    }
    setCurrentInjections([]);
  };

  const buildRecipeJson = () => {
    const type = RECIPE_TYPE_MAP[recipeType];
    const resultObj = { id: result, count: parseInt(resultCount) || 1 };
    if (recipeType === 'shaped') {
      const charMap = buildCharMap(grid);
      const pattern = gridToPattern(grid, charMap);
      const key = {};
      for (const [item, ch] of Object.entries(charMap)) {
        if (item) key[ch] = { item };
      }
      return { type, pattern, key, result: resultObj };
    }
    if (recipeType === 'shapeless') {
      return {
        type,
        ingredients: ingredients.filter(Boolean).map(item => ({ item })),
        result: resultObj,
      };
    }
    if (recipeType === 'stonecutting') {
      return { type, ingredient: { item: ingredient }, result: resultObj };
    }
    // cooking
    return {
      type,
      ingredient: { item: ingredient },
      result: { id: result },
      experience: parseFloat(experience) || 0.0,
      cookingtime: parseInt(cookingTime) || 200,
    };
  };

  const handleSave = async () => {
    if (!recipeId) { setStatus({ ok: false, msg: 'Recipe ID is required.' }); return; }
    if (!result) { setStatus({ ok: false, msg: 'Result item is required.' }); return; }
    setSaving(true);
    setStatus(null);
    try {
      await removeExistingInjections();

      if (lastSavedId && lastSavedId !== recipeId) {
        await invoke('delete_ycs_data', { category: 'recipes', id: lastSavedId }).catch(() => {});
      }

      const recipeJson = buildRecipeJson();
      const recipeFile = `${RECIPE_DIR}/${recipeId}.json`;
      await invoke('write_mod_file', { file: recipeFile, content: JSON.stringify(recipeJson, null, 2) });

      const injections = [{ type: 'created-file', file: recipeFile }];

      const payload = {
        id: recipeId, recipeType, result, resultCount: parseInt(resultCount) || 1,
        grid, ingredients, ingredient, experience: parseFloat(experience) || 0.0,
        cookingTime: parseInt(cookingTime) || 200,
        _injections: injections,
      };
      await invoke('save_ycs_data', { category: 'recipes', id: recipeId, content: JSON.stringify(payload, null, 2) });

      setCurrentInjections(injections);
      setInjected(true);
      setLastSavedId(recipeId);
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Save failed: ' + err });
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    const targetId = existingId || recipeId;
    if (!targetId) return;
    setSaving(true);
    try {
      await removeExistingInjections();
      await invoke('delete_ycs_data', { category: 'recipes', id: targetId });
      setInjected(false);
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Remove failed: ' + err });
    }
    setSaving(false);
  };

  const isCooking = ['smelting', 'blasting', 'smoking', 'campfire_cooking'].includes(recipeType);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', flex: 1 }}>
          {existingId ? `Edit Recipe: ${existingId}` : 'New Recipe'}
        </h2>
        {status && <span style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</span>}
        {injected && <button className="ycs-button" onClick={handleRemove} style={{ color: '#e05252' }}>Remove</button>}
        <button className="ycs-button" onClick={onBack}>Cancel</button>
        <button className="ycs-button" onClick={handleSave} disabled={saving || !recipeId}>{saving ? 'Saving...' : 'Save'}</button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <FieldGroup label="Identity">
          <FieldRow label="Recipe ID">
              <StringField value={recipeId} onChange={handleIdChange} />
          </FieldRow>
          <FieldRow label="Type">
            <StandardDropdownField
              value={recipeType}
              onChange={setRecipeType}
              options={RECIPE_TYPES}
            />
          </FieldRow>
        </FieldGroup>

        {recipeType === 'shaped' && (
          <FieldGroup label="Crafting Grid">
            <ShapedGrid grid={grid} onGridChange={setGrid} itemOptions={itemOptions} />
          </FieldGroup>
        )}

        {recipeType === 'shapeless' && (
          <FieldGroup label="Ingredients">
            <ShapelessIngredients ingredients={ingredients} onChange={setIngredients} itemOptions={itemOptions} />
          </FieldGroup>
        )}

        {isCooking && (
          <FieldGroup label="Input">
            <FieldRow label="Ingredient">
              <DropdownField value={ingredient} onChange={setIngredient} options={itemOptions} />
            </FieldRow>
          </FieldGroup>
        )}

        {recipeType === 'stonecutting' && (
          <FieldGroup label="Input">
            <FieldRow label="Ingredient">
              <DropdownField value={ingredient} onChange={setIngredient} options={itemOptions} />
            </FieldRow>
          </FieldGroup>
        )}

        <FieldGroup label="Result">
          <FieldRow label="Result Item">
            <DropdownField value={result} onChange={setResult} options={itemOptions} />
          </FieldRow>
          {recipeType !== 'smelting' && recipeType !== 'blasting' && recipeType !== 'smoking' && recipeType !== 'campfire_cooking' && (
            <FieldRow label="Count">
              <NumberInput value={resultCount} onChange={setResultCount} />
            </FieldRow>
          )}
        </FieldGroup>

        {isCooking && (
          <FieldGroup label="Cooking">
            <FieldRow label="Experience">
              <NumberInput value={experience} onChange={setExperience} />
            </FieldRow>
            <FieldRow label="Cook Time (ticks)">
              <NumberInput value={cookingTime} onChange={setCookingTime} />
            </FieldRow>
          </FieldGroup>
        )}
      </div>
    </div>
  );
}
