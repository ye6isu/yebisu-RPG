import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FieldRow, StringField, NumberInput, StandardDropdownField, DropdownField } from './Field/Field';
import { VANILLA_ITEMS } from '../data/vanillaItems';
import { EMPTY_GRID, buildCharMap, gridToPattern, ShapedGrid, ShapelessIngredients } from './RecipeEditor';
import { compileChain, collectBlockImports } from '../codegen/visual/compiler.js';
import { DATA_COMPONENT_TYPES, componentConstName } from './ComponentsLanding';
import { SpritesheetPreview } from './TextureManager';
import { useTitlebarActions } from './Titlebar/TitlebarActionsContext';
import OverlayScrollArea from './OverlayScrollArea';

function FieldGroup({ label, headerExtra, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
        fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
        opacity: 0.4, padding: '4px 0', userSelect: 'none',
      }}>
        <span>{label}</span>
        {headerExtra}
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

function Checkbox({ checked, onChange, disabled = false }) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: '16px', height: '16px', cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
        border: `1px solid ${checked ? 'var(--ycs-highlight)' : 'var(--ycs-foreground)'}`,
        borderRadius: '3px',
        backgroundColor: checked ? 'var(--ycs-highlight)' : 'transparent',
        opacity: disabled ? 0.5 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background-color 0.1s, border-color 0.1s',
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

const TAG_CATEGORIES = [
  {
    label: 'Mod',
    tags: [], // populated dynamically from ycs-data items
  },
  {
    label: 'Vanilla',
    tags: [
      'minecraft:swords', 'minecraft:axes', 'minecraft:pickaxes', 'minecraft:shovels', 'minecraft:hoes',
      'minecraft:acacia_logs', 'minecraft:anvil', 'minecraft:armadillo_food', 'minecraft:arrows',
      'minecraft:axolotl_food', 'minecraft:bamboo_blocks', 'minecraft:banners',
      'minecraft:beacon_payment_items', 'minecraft:beds', 'minecraft:bee_food', 'minecraft:birch_logs',
      'minecraft:boats', 'minecraft:bookshelf_books', 'minecraft:breaks_decorated_pots',
      'minecraft:brewing_fuel', 'minecraft:buttons', 'minecraft:camel_food', 'minecraft:candles',
      'minecraft:cat_food', 'minecraft:chains', 'minecraft:cherry_logs', 'minecraft:chest_armor',
      'minecraft:chest_boats', 'minecraft:chicken_food', 'minecraft:coals', 'minecraft:compasses',
      'minecraft:copper_tool_materials', 'minecraft:cow_food', 'minecraft:creeper_drop_music_discs',
      'minecraft:creeper_igniters', 'minecraft:crimson_stems', 'minecraft:dampens_vibrations',
      'minecraft:dark_oak_logs', 'minecraft:decorated_pot_ingredients', 'minecraft:decorated_pot_sherds',
      'minecraft:diamond_tool_materials', 'minecraft:dirt', 'minecraft:doors', 'minecraft:dowses_campfires',
      'minecraft:drowned_preferred_weapons', 'minecraft:duplicates_allays', 'minecraft:dyes', 'minecraft:eggs',
      'minecraft:enchantable/armor', 'minecraft:enchantable/bow', 'minecraft:enchantable/chest_armor',
      'minecraft:enchantable/crossbow', 'minecraft:enchantable/durability', 'minecraft:enchantable/equippable',
      'minecraft:enchantable/fire_aspect', 'minecraft:enchantable/fishing', 'minecraft:enchantable/foot_armor',
      'minecraft:enchantable/head_armor', 'minecraft:enchantable/leg_armor', 'minecraft:enchantable/mace',
      'minecraft:enchantable/melee_weapon', 'minecraft:enchantable/mining', 'minecraft:enchantable/mining_loot',
      'minecraft:enchantable/sharp_weapon', 'minecraft:enchantable/sweeping', 'minecraft:enchantable/trident',
      'minecraft:enchantable/vanishing', 'minecraft:enchantable/weapon',
      'minecraft:fence_gates', 'minecraft:fences', 'minecraft:fishes', 'minecraft:flowers',
      'minecraft:foot_armor', 'minecraft:fox_food', 'minecraft:freeze_immune_wearables', 'minecraft:frog_food',
      'minecraft:furnace_minecart_fuel', 'minecraft:gaze_disguise_equipment', 'minecraft:goat_food',
      'minecraft:gold_tool_materials', 'minecraft:hanging_signs', 'minecraft:head_armor',
      'minecraft:hoglin_food', 'minecraft:horse_food', 'minecraft:horse_tempt_items',
      'minecraft:ignored_by_piglin_babies', 'minecraft:iron_tool_materials', 'minecraft:jungle_logs',
      'minecraft:lanterns', 'minecraft:leaves', 'minecraft:lectern_books', 'minecraft:leg_armor',
      'minecraft:llama_food', 'minecraft:llama_tempt_items', 'minecraft:logs', 'minecraft:logs_that_burn',
      'minecraft:loom_patterns', 'minecraft:mangrove_logs', 'minecraft:meat', 'minecraft:metal_nuggets',
      'minecraft:mushrooms', 'minecraft:netherite_tool_materials', 'minecraft:non_flammable_wood',
      'minecraft:noteblock_top_instruments', 'minecraft:oak_logs', 'minecraft:ocelot_food', 'minecraft:ores',
      'minecraft:pale_oak_logs', 'minecraft:panda_food', 'minecraft:parrot_food',
      'minecraft:parrot_poisonous_food', 'minecraft:piglin_food', 'minecraft:piglin_loved',
      'minecraft:piglin_preferred_weapons', 'minecraft:piglin_repellents', 'minecraft:piglin_safe_armor',
      'minecraft:pig_food', 'minecraft:pillager_preferred_weapons', 'minecraft:planks', 'minecraft:rabbit_food',
      'minecraft:rails', 'minecraft:repairs_copper_armor', 'minecraft:repairs_chain_armor',
      'minecraft:repairs_diamond_armor', 'minecraft:repairs_gold_armor', 'minecraft:repairs_iron_armor',
      'minecraft:repairs_leather_armor', 'minecraft:repairs_netherite_armor', 'minecraft:repairs_turtle_helmet',
      'minecraft:repairs_wolf_armor', 'minecraft:sand', 'minecraft:saplings', 'minecraft:sheep_food',
      'minecraft:shulker_boxes', 'minecraft:signs', 'minecraft:skeleton_preferred_weapons', 'minecraft:skulls',
      'minecraft:slabs', 'minecraft:small_flowers', 'minecraft:smelts_to_glass', 'minecraft:sniffer_food',
      'minecraft:spruce_logs', 'minecraft:stairs', 'minecraft:stone_bricks', 'minecraft:stone_buttons',
      'minecraft:stone_crafting_materials', 'minecraft:stone_tool_materials', 'minecraft:strider_food',
      'minecraft:strider_tempt_items', 'minecraft:terracotta', 'minecraft:trapdoors',
      'minecraft:trimmable_armor', 'minecraft:trim_materials', 'minecraft:turtle_food',
      'minecraft:villager_plantable_seeds', 'minecraft:walls', 'minecraft:warped_stems',
      'minecraft:wart_blocks', 'minecraft:wolf_food', 'minecraft:wooden_buttons', 'minecraft:wooden_doors',
      'minecraft:wooden_fences', 'minecraft:wooden_pressure_plates', 'minecraft:wooden_slabs',
      'minecraft:wooden_stairs', 'minecraft:wooden_tool_materials', 'minecraft:wooden_trapdoors',
      'minecraft:wool', 'minecraft:wool_carpets',
    ],
  },
  {
    label: 'NeoForge',
    tags: [
      'neoforge:armors', 'neoforge:barrels', 'neoforge:barrels/wooden', 'neoforge:bones',
      'neoforge:bookshelves', 'neoforge:bricks', 'neoforge:bricks/normal', 'neoforge:bricks/nether',
      'neoforge:buckets', 'neoforge:buckets/empty', 'neoforge:buckets/water', 'neoforge:buckets/lava',
      'neoforge:buckets/milk', 'neoforge:buckets/powder_snow', 'neoforge:buckets/entity_water',
      'neoforge:chains', 'neoforge:chests', 'neoforge:chests/ender', 'neoforge:chests/trapped',
      'neoforge:chests/wooden', 'neoforge:cobblestones', 'neoforge:cobblestones/normal',
      'neoforge:cobblestones/infested', 'neoforge:cobblestones/mossy', 'neoforge:cobblestones/deepslate',
      'neoforge:crops', 'neoforge:crops/beetroot', 'neoforge:crops/carrot', 'neoforge:crops/nether_wart',
      'neoforge:crops/potato', 'neoforge:crops/wheat',
      'neoforge:dusts', 'neoforge:dusts/redstone', 'neoforge:dusts/glowstone',
      'neoforge:dyes', 'neoforge:dyes/black', 'neoforge:dyes/red', 'neoforge:dyes/green',
      'neoforge:dyes/brown', 'neoforge:dyes/blue', 'neoforge:dyes/purple', 'neoforge:dyes/cyan',
      'neoforge:dyes/light_gray', 'neoforge:dyes/gray', 'neoforge:dyes/pink', 'neoforge:dyes/lime',
      'neoforge:dyes/yellow', 'neoforge:dyes/light_blue', 'neoforge:dyes/magenta',
      'neoforge:dyes/orange', 'neoforge:dyes/white',
      'neoforge:eggs', 'neoforge:enchantables', 'neoforge:enchanting_fuels', 'neoforge:end_stones',
      'neoforge:ender_pearls', 'neoforge:feathers', 'neoforge:fence_gates', 'neoforge:fence_gates/wooden',
      'neoforge:fences', 'neoforge:fences/nether_brick', 'neoforge:fences/wooden',
      'neoforge:foods', 'neoforge:foods/fruits', 'neoforge:foods/vegetables', 'neoforge:foods/berries',
      'neoforge:foods/breads', 'neoforge:foods/cookies', 'neoforge:foods/raw_meats',
      'neoforge:foods/cooked_meats', 'neoforge:foods/raw_fishes', 'neoforge:foods/cooked_fishes',
      'neoforge:foods/soups', 'neoforge:foods/food_poisoning',
      'neoforge:gems', 'neoforge:gems/diamond', 'neoforge:gems/emerald', 'neoforge:gems/amethyst',
      'neoforge:gems/lapis', 'neoforge:gems/prismarine', 'neoforge:gems/quartz',
      'neoforge:glass_blocks', 'neoforge:glass_blocks/colorless', 'neoforge:glass_blocks/cheap',
      'neoforge:glass_blocks/tinted', 'neoforge:glass_panes', 'neoforge:glass_panes/colorless',
      'neoforge:glazed_terracottas', 'neoforge:gravels', 'neoforge:gunpowders',
      'neoforge:ingots', 'neoforge:ingots/copper', 'neoforge:ingots/gold', 'neoforge:ingots/iron',
      'neoforge:ingots/netherite', 'neoforge:leathers', 'neoforge:mushrooms', 'neoforge:music_discs',
      'neoforge:nether_stars', 'neoforge:netherracks', 'neoforge:nuggets', 'neoforge:nuggets/gold',
      'neoforge:nuggets/iron', 'neoforge:obsidians',
      'neoforge:ore_bearing_ground/deepslate', 'neoforge:ore_bearing_ground/netherrack',
      'neoforge:ore_bearing_ground/stone', 'neoforge:ore_rates/dense', 'neoforge:ore_rates/singular',
      'neoforge:ore_rates/sparse',
      'neoforge:ores', 'neoforge:ores/coal', 'neoforge:ores/copper', 'neoforge:ores/diamond',
      'neoforge:ores/emerald', 'neoforge:ores/gold', 'neoforge:ores/iron', 'neoforge:ores/lapis',
      'neoforge:ores/netherite_scrap', 'neoforge:ores/quartz', 'neoforge:ores/redstone',
      'neoforge:ores_in_ground/deepslate', 'neoforge:ores_in_ground/netherrack', 'neoforge:ores_in_ground/stone',
      'neoforge:player_workstations/crafting_tables', 'neoforge:player_workstations/furnaces',
      'neoforge:raw_materials', 'neoforge:raw_materials/copper', 'neoforge:raw_materials/gold',
      'neoforge:raw_materials/iron',
      'neoforge:rods', 'neoforge:rods/blaze', 'neoforge:rods/breeze', 'neoforge:rods/wooden',
      'neoforge:ropes', 'neoforge:sands', 'neoforge:sands/colorless', 'neoforge:sands/red',
      'neoforge:seeds', 'neoforge:seeds/beetroot', 'neoforge:seeds/melon', 'neoforge:seeds/pumpkin',
      'neoforge:seeds/wheat', 'neoforge:shulker_boxes', 'neoforge:slimeballs', 'neoforge:stones',
      'neoforge:storage_blocks', 'neoforge:storage_blocks/bone_meal', 'neoforge:storage_blocks/coal',
      'neoforge:storage_blocks/copper', 'neoforge:storage_blocks/diamond', 'neoforge:storage_blocks/dried_kelp',
      'neoforge:storage_blocks/emerald', 'neoforge:storage_blocks/gold', 'neoforge:storage_blocks/iron',
      'neoforge:storage_blocks/lapis', 'neoforge:storage_blocks/netherite', 'neoforge:storage_blocks/raw_copper',
      'neoforge:storage_blocks/raw_gold', 'neoforge:storage_blocks/raw_iron', 'neoforge:storage_blocks/redstone',
      'neoforge:storage_blocks/slime', 'neoforge:storage_blocks/wheat',
      'neoforge:strings',
      'neoforge:tools', 'neoforge:tools/bow', 'neoforge:tools/brush', 'neoforge:tools/crossbow',
      'neoforge:tools/fishing_rod', 'neoforge:tools/shear', 'neoforge:tools/shield', 'neoforge:tools/spear',
      'neoforge:villager_job_sites',
    ],
  },
];

function TagPicker({ tags, onChange, onClose }) {
  const [filter, setFilter] = useState('');
  const [modTags, setModTags] = useState([]);
  const q = filter.toLowerCase();

  const loadModTags = useCallback(async () => {
    try {
      const ids = await invoke('list_ycs_data', { category: 'tags' });
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'tags', id });
          const data = JSON.parse(raw);
          if (data.tagName) loaded.push(data.tagName);
        } catch {}
      }
      setModTags(loaded);
    } catch {}
  }, []);

  useEffect(() => { loadModTags(); }, [loadModTags]);

  const toggle = (tag) => onChange(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]);

  const addCustom = () => {
    const v = filter.trim();
    if (!v) return;
    const tag = v.includes(':') ? v : `yebisurpg:${v}`;
    if (!tags.includes(tag)) onChange([...tags, tag]);
    setFilter('');
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      backgroundColor: 'var(--ycs-bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="ycs-button icon" onClick={onClose} title="Back">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M10 12L6 8l4-4"/></svg>
        </button>
        <span style={{ fontSize: '15px', fontWeight: '500', flex: 1 }}>Tags</span>
        <button className="ycs-button icon" onClick={loadModTags} title="Refresh">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M13.5 8A5.5 5.5 0 1 1 8 2.5"/><polyline points="11 1 13.5 3.5 11 6"/></svg>
        </button>
        <input
          className="ycs-string-input"
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          style={{ width: '160px' }}
          autoFocus
        />
        <button className="ycs-button icon" onClick={addCustom} title="Add custom tag">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', flexShrink: 0 }} />

      {/* Selected chips */}
      <div style={{
        padding: '10px 16px', flexShrink: 0, minHeight: '42px', maxHeight: '100px', overflowY: 'auto',
        display: 'flex', flexWrap: 'wrap', gap: '4px', alignContent: 'flex-start',
      }}>
        {tags.length === 0
          ? <span style={{ fontSize: '12px', opacity: 0.4 }}>No tags selected</span>
          : tags.map(t => (
            <div key={t} style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '2px 8px', fontSize: '11px',
              border: '1px solid var(--ycs-foreground)',
              borderRadius: 'var(--ycs-radius, 4px)', whiteSpace: 'nowrap',
            }}>
              <span>{t}</span>
              <span onClick={() => toggle(t)} style={{ cursor: 'pointer', opacity: 0.5, fontSize: '14px', lineHeight: 1 }}>×</span>
            </div>
          ))
        }
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', flexShrink: 0 }} />

      {/* Category list */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {TAG_CATEGORIES.map(cat => {
          const catTags = cat.label === 'Mod' ? modTags : cat.tags;
          const visible = catTags.filter(t => !q || t.includes(q));
          if (cat.label === 'Mod' && visible.length === 0) return null;
          if (visible.length === 0) return null;
          return (
            <div key={cat.label}>
              <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.5, padding: '8px 16px 4px' }}>
                {cat.label}
              </div>
              {visible.map(tag => {
                const sel = tags.includes(tag);
                return (
                  <div key={tag} onClick={() => toggle(tag)} style={{
                    padding: '6px 16px', fontSize: '13px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    backgroundColor: sel ? 'var(--ycs-highlight)' : 'transparent',
                    transition: 'background-color 0.1s',
                  }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.backgroundColor = 'var(--ycs-accent)'; }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <span>{tag}</span>
                    {sel && <span style={{ fontSize: '13px', opacity: 0.8 }}>✓</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FieldIconButton({ onClick, title, hasData }) {
  return (
    <button className="ycs-button field" onClick={onClick} title={title}
      style={{ flexShrink: 0, fontSize: '11px', minWidth: 'unset', padding: '0 6px', width: 'auto', height: '24px' }}>
      {hasData ? 'edit' : 'set'}
    </button>
  );
}

function RecipeSubGroup({ label, enabled, onToggle, children, disabled, inline }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', opacity: disabled ? 0.35 : 1 }}>
      <div className="ycs-field-row">
        <div className="ycs-field-label" style={{ fontSize: '13px' }}>{label}</div>
        <div className="ycs-field-control">
          <Checkbox checked={enabled} onChange={onToggle} disabled={disabled} />
        </div>
      </div>
      {enabled && !disabled && (
        <div style={{
          display: 'flex',
          flexDirection: inline ? 'row' : 'column',
          alignItems: inline ? 'center' : undefined,
          gap: inline ? '6px' : undefined,
          borderLeft: '1px solid var(--ycs-foreground)',
          paddingLeft: '12px', marginLeft: '4px',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function DataComponentRow({ dc, onChange, onRemove, globalOptions, globalComponents }) {
  const isRef = dc.kind === 'ref';
  const refComp = isRef ? globalComponents.find(c => c.name === dc.ref) : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {isRef ? (
        <div style={{ flex: 1 }}>
          <DropdownField value={dc.ref} onChange={v => onChange({ ref: v })} options={globalOptions.length ? globalOptions : [{ label: '(none defined)', value: '', disabled: true }]} />
        </div>
      ) : (
        <StringField value={dc.name} onChange={v => onChange({ name: v.toLowerCase().replace(/\s/g, '_') })} placeholder="name" style={{ flex: 1 }} />
      )}

      {!isRef && (
        <div style={{ flex: 1 }}>
          <StandardDropdownField value={dc.type} onChange={v => onChange({ type: v })} options={DATA_COMPONENT_TYPES} />
        </div>
      )}

      {isRef ? (
        refComp?.type === 'boolean' ? (
          <Checkbox checked={!!dc.overrideDefault} onChange={v => onChange({ overrideDefault: v })} />
        ) : (
          <StringField value={dc.overrideDefault ?? ''} onChange={v => onChange({ overrideDefault: v })} placeholder={String(refComp?.defaultValue ?? 'default')} style={{ width: '120px', flexShrink: 0 }} />
        )
      ) : (
        dc.type === 'boolean' ? (
          <Checkbox checked={!!dc.defaultValue} onChange={v => onChange({ defaultValue: v })} />
        ) : (
          <StringField value={dc.defaultValue ?? ''} onChange={v => onChange({ defaultValue: v })} placeholder="default" style={{ width: '120px', flexShrink: 0 }} />
        )
      )}

      <button className="ycs-tiny-button" onClick={onRemove} title="Remove" style={{ marginLeft: 'auto', flexShrink: 0, border: '1px solid var(--ycs-foreground)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function DataComponentsPage({ components, onChange, globalComponents, onBack }) {
  const update = (i, patch) => onChange(components.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  const remove = (i) => onChange(components.filter((_, idx) => idx !== i));
  const addInline = () => onChange([...components, { kind: 'inline', name: '', type: 'double', defaultValue: '' }]);
  const addRef = () => onChange([...components, { kind: 'ref', ref: globalComponents[0]?.name || '', overrideDefault: '' }]);

  const globalOptions = globalComponents.map(c => ({ label: `${c.name} (${DATA_COMPONENT_TYPES.find(t => t.value === c.type)?.label || c.type})`, value: c.name }));

  const refRows = components.map((dc, i) => ({ dc, i })).filter(({ dc }) => dc.kind === 'ref');
  const inlineRows = components.map((dc, i) => ({ dc, i })).filter(({ dc }) => dc.kind !== 'ref');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="ycs-tiny-button" onClick={onBack} title="Back" style={{ border: '1px solid var(--ycs-foreground)' }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 12L6 8l4-4"/></svg>
        </button>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', flex: 1 }}>Data Components</h2>
        <button className="ycs-button" onClick={addRef}>+ Attach Global</button>
        <button className="ycs-button" onClick={addInline}>+ New Item-Specific</button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <OverlayScrollArea
        vertical
        horizontal
        style={{ flex: 1, minHeight: 0, minWidth: 0 }}
        contentStyle={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <FieldGroup label="Global">
          {refRows.length === 0 && <span style={{ fontSize: '12px', opacity: 0.3 }}>None attached</span>}
          {refRows.map(({ dc, i }) => (
            <DataComponentRow
              key={i}
              dc={dc}
              onChange={patch => update(i, patch)}
              onRemove={() => remove(i)}
              globalOptions={globalOptions}
              globalComponents={globalComponents}
            />
          ))}
        </FieldGroup>

        <FieldGroup label="Item-Specific">
          {inlineRows.length === 0 && <span style={{ fontSize: '12px', opacity: 0.3 }}>None defined</span>}
          {inlineRows.map(({ dc, i }) => (
            <DataComponentRow
              key={i}
              dc={dc}
              onChange={patch => update(i, patch)}
              onRemove={() => remove(i)}
              globalOptions={globalOptions}
              globalComponents={globalComponents}
            />
          ))}
        </FieldGroup>
      </OverlayScrollArea>
    </div>
  );
}

const MODID = 'yebisurpg';

const ITEM_METHODS = [
  { key: 'useOn',               label: 'Block Interaction',   sig: 'useOn(UseOnContext context)' },
  { key: 'use',                 label: 'Interaction',          sig: 'use(Level, Player, InteractionHand)' },
  { key: 'continuousUse',       label: 'Continuous Use',       sig: 'onUseTick(Level, LivingEntity, ItemStack, int)', requires: 'use' },
  { key: 'finishUsingItem',     label: 'Finished Using',       sig: 'finishUsingItem(ItemStack, Level, LivingEntity)' },
  { key: 'inventoryTick',       label: 'Inventory Tick',       sig: 'inventoryTick(ItemStack, Level, Entity, int, boolean)' },
  { key: 'hurtEnemy',           label: 'Hurt Entity',          sig: 'hurtEnemy(ItemStack, LivingEntity, LivingEntity)' },
  { key: 'interactLivingEntity',label: 'Entity Interaction',   sig: 'interactLivingEntity(ItemStack, Player, LivingEntity, InteractionHand)' },
];
const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';
const RES_BASE = 'resources/assets/yebisurpg';

function FileDropZone({ hasFile, fileName, onImport, onClear }) {
  const [dragOver, setDragOver] = useState(false);
  const zoneRef = useRef(null);
  const dragOverRef = useRef(false);
  const onImportRef = useRef(onImport);
  onImportRef.current = onImport;

  useEffect(() => {
    let unlisten;
    import('@tauri-apps/api/webview').then(({ getCurrentWebview }) => {
      getCurrentWebview().onDragDropEvent((event) => {
        const dpr = window.devicePixelRatio || 1;
        if (event.payload.type === 'over') {
          if (!zoneRef.current) return;
          const rect = zoneRef.current.getBoundingClientRect();
          const x = event.payload.position.x / dpr;
          const y = event.payload.position.y / dpr;
          const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
          if (inside !== dragOverRef.current) {
            dragOverRef.current = inside;
            setDragOver(inside);
          }
        } else if (event.payload.type === 'drop') {
          if (dragOverRef.current && event.payload.paths?.length > 0) {
            const path = event.payload.paths[0];
            if (path.endsWith('.json')) {
              onImportRef.current(path);
            }
          }
          dragOverRef.current = false;
          setDragOver(false);
        } else if (event.payload.type === 'leave') {
          dragOverRef.current = false;
          setDragOver(false);
        }
      }).then(fn => { unlisten = fn; });
    }).catch(() => {});
    return () => { if (unlisten) unlisten(); };
  }, []);

  return (
    <div
      ref={zoneRef}
      onClick={() => onImport()}
      className="ycs-string-input"
      style={{
        flex: 1,
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: hasFile ? 'flex-start' : 'center',
        gap: '6px',
        cursor: 'pointer',
        fontSize: '12px',
        padding: '0 8px',
        boxSizing: 'border-box',
        borderColor: dragOver ? 'var(--ycs-highlight)' : undefined,
        backgroundColor: dragOver ? 'var(--ycs-accent)' : undefined,
      }}
    >
      {hasFile ? (
        <>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
          {onClear && (
            <svg
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, cursor: 'pointer' }}
            >
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
    </div>
  );
}

/**
 * Repeatable list of item states, switchable in-game via CustomModelData (see Set/Get/Reset Item
 * State Blocky blocks). Each state independently picks kind = 3D geo model or flat icon, modeled
 * on RecipeEditor.jsx's ShapelessIngredients pattern (controlled array, add/set/remove by index).
 */
function ItemStates({ itemId, states, onChange, textureOptions, max = 16 }) {
  const add = () => {
    if (states.length < max) {
      onChange([...states, { holdingMode: 'generated', texture: '', geoModel: '', geoTexture: '', displayModel: '' }]);
    }
  };
  const set = (i, patch) => {
    const next = [...states];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i) => onChange(states.filter((_, idx) => idx !== i));

  const importStateGeoModel = async (i, droppedPath) => {
    if (!itemId) return;
    let filePath = droppedPath;
    if (!filePath) {
      const file = await open({ multiple: false, filters: [{ name: 'Bedrock Geo', extensions: ['json'] }] });
      if (!file) return;
      filePath = typeof file === 'string' ? file : file.path;
    }
    const stateModelId = `${itemId}_state${i}`;
    try {
      await invoke('import_geo_model', { kind: 'items', id: stateModelId, sourcePath: filePath });
      set(i, { geoModel: stateModelId });
    } catch {}
  };

  const importStateDisplayModel = async (i, droppedPath) => {
    if (!itemId) return;
    let filePath = droppedPath;
    if (!filePath) {
      const file = await open({ multiple: false, filters: [{ name: 'Display Model JSON', extensions: ['json'] }] });
      if (!file) return;
      filePath = typeof file === 'string' ? file : file.path;
    }
    const stateModelId = `${itemId}_state${i}`;
    try {
      await invoke('import_display_model', { kind: 'items', id: stateModelId, sourcePath: filePath });
      set(i, { displayModel: stateModelId });
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {states.map((state, i) => {
        const is3DState = state.holdingMode === '3d';
        return (
          // Same vertical-line grouping as HUD's Multi-State StateList: the "State {i}"
          // label + remove button sit INSIDE the bordered/lined box (as its first row),
          // not above/outside it — matches HudLanding.jsx's StateList structure exactly.
          <div key={i} style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 2, flexShrink: 0, background: 'var(--ycs-foreground)', borderRadius: 1 }} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 2 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
                fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
                opacity: 0.4, padding: '4px 0', userSelect: 'none',
              }}>
                <span>State {i}</span>
                <button className="ycs-tiny-button" onClick={() => remove(i)} title="Remove State" style={{ border: '1px solid var(--ycs-foreground)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <FieldRow label="Holding Mode">
                <StandardDropdownField
                  value={state.holdingMode}
                  onChange={(v) => set(i, { holdingMode: v })}
                  options={[
                    { label: 'Generated', value: 'generated' },
                    { label: 'Handheld', value: 'handheld' },
                    { label: '3D Model', value: '3d' },
                  ]}
                />
              </FieldRow>

              {is3DState ? (
                <>
                  <FieldRow label="Texture">
                    <DropdownField
                      value={state.geoTexture}
                      onChange={(v) => set(i, { geoTexture: v })}
                      options={[{ label: '(None)', value: '' }, ...textureOptions]}
                    />
                  </FieldRow>
                  <FieldRow label="Model">
                    <FileDropZone
                      hasFile={!!state.geoModel}
                      fileName={`${state.geoModel}.geo.json`}
                      onImport={(path) => importStateGeoModel(i, path)}
                      onClear={() => set(i, { geoModel: '' })}
                    />
                  </FieldRow>
                  <FieldRow label="Display Model">
                    <FileDropZone
                      hasFile={!!state.displayModel}
                      fileName={`${state.displayModel}.display.json`}
                      onImport={(path) => importStateDisplayModel(i, path)}
                      onClear={() => set(i, { displayModel: '' })}
                    />
                  </FieldRow>
                </>
              ) : (
                <FieldRow label="Texture">
                  <DropdownField
                    value={state.texture}
                    onChange={(v) => set(i, { texture: v })}
                    options={[{ label: '(None)', value: '' }, ...textureOptions]}
                  />
                </FieldRow>
              )}
            </div>
          </div>
        );
      })}
      {states.length < max && (
        <button
          className="ycs-button field"
          title="Add State"
          onClick={add}
          style={{ flexShrink: 0, fontSize: '11px', minWidth: 'unset', padding: '0 6px', width: '100%', height: '24px' }}
        >
          +
        </button>
      )}
    </div>
  );
}

export default function ItemEditor({ isActive = false, itemId: existingId, onBack, onOpenBlockEditor }) {
  const [itemId, setItemId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [texture, setTexture] = useState('');
  const [holdingMode, setHoldingMode] = useState('generated');
  const [stackSize, setStackSize] = useState('64');
  const [useDuration, setUseDuration] = useState(false);
  const [useDurationValue, setUseDurationValue] = useState('32');
  const [useAnim, setUseAnim] = useState('NONE');
  const [tags, setTags] = useState([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [geoModel, setGeoModel] = useState('');
  const [geoTexture, setGeoTexture] = useState('');
  const [displayModel, setDisplayModel] = useState('');
  const [multiState, setMultiState] = useState(false);
  const [states, setStates] = useState([]);
  const [textures, setTextures] = useState([]);
  const [availableTabs, setAvailableTabs] = useState([]);
  const [creativeTab, setCreativeTab] = useState('');
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [injected, setInjected] = useState(false);
  const [currentInjections, setCurrentInjections] = useState([]);
  const [lastSavedId, setLastSavedId] = useState(existingId || null);
  const [customClass, setCustomClass] = useState(false);
  const [enabledMethods, setEnabledMethods] = useState([]);
  const [editingDataComponents, setEditingDataComponents] = useState(false);

  // Data Components
  const [dataComponents, setDataComponents] = useState([]);
  const [globalComponents, setGlobalComponents] = useState([]);

  // Item ability defaults
  const [itemAbilitiesEnabled, setItemAbilitiesEnabled] = useState(false);
  const [itemAbilitySlots, setItemAbilitySlots] = useState(Array(9).fill(''));

  // Combat
  const [attackDamage, setAttackDamage] = useState('');
  const [attackSpeed, setAttackSpeed] = useState('');

  // Food
  const [foodEnabled, setFoodEnabled] = useState(false);
  const [nutrition, setNutrition] = useState('4');
  const [saturation, setSaturation] = useState('0.3');
  const [canAlwaysEat, setCanAlwaysEat] = useState(false);
  const [fastFood, setFastFood] = useState(false);

  // Fuel
  const [fuelEnabled, setFuelEnabled] = useState(false);
  const [fuel, setFuel] = useState('');

  // Tool
  const [toolEnabled, setToolEnabled] = useState(false);
  const [toolType, setToolType] = useState('sword');
  const [toolTier, setToolTier] = useState('iron');

  // Tooltip
  const [tooltipEnabled, setTooltipEnabled] = useState(false);
  const [tooltipNormal, setTooltipNormal] = useState('');
  const [tooltipShift, setTooltipShift] = useState(false);
  const [tooltipUseDefaultHint, setTooltipUseDefaultHint] = useState(true);
  const [tooltipShiftHint, setTooltipShiftHint] = useState('');
  const [tooltipHidden, setTooltipHidden] = useState('');

  // Recipes
  const [recipeItemOptions, setRecipeItemOptions] = useState([]);
  const [shapedEnabled, setShapedEnabled] = useState(false);
  const [shapedGrid, setShapedGrid] = useState(EMPTY_GRID);
  const [shapedCount, setShapedCount] = useState('1');
  const [shapelessEnabled, setShapelessEnabled] = useState(false);
  const [shapelessIngredients, setShapelessIngredients] = useState(['']);
  const [shapelessCount, setShapelessCount] = useState('1');
  const [smeltingEnabled, setSmeltingEnabled] = useState(false);
  const [smeltingIngredient, setSmeltingIngredient] = useState('');
  const [smeltingExp, setSmeltingExp] = useState('0.7');
  const [smeltingTime, setSmeltingTime] = useState('200');
  const [blastingEnabled, setBlastingEnabled] = useState(false);
  const [blastingIngredient, setBlastingIngredient] = useState('');
  const [blastingExp, setBlastingExp] = useState('0.7');
  const [blastingTime, setBlastingTime] = useState('100');
  const [smokingEnabled, setSmokingEnabled] = useState(false);
  const [smokingIngredient, setSmokingIngredient] = useState('');
  const [smokingExp, setSmokingExp] = useState('0.35');
  const [smokingTime, setSmokingTime] = useState('100');
  const [campfireEnabled, setCampfireEnabled] = useState(false);
  const [campfireIngredient, setCampfireIngredient] = useState('');
  const [campfireExp, setCampfireExp] = useState('0.35');
  const [campfireTime, setCampfireTime] = useState('600');
  const [stonecutEnabled, setStonecutEnabled] = useState(false);
  const [stonecutIngredient, setStonecutIngredient] = useState('');
  const [stonecutCount, setStonecutCount] = useState('1');

  const is3D = holdingMode === '3d';

  const toPascalCase = (s) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

  const handleIdChange = (val) => {
    setItemId(val.toLowerCase().replace(/\s/g, '_'));
  };

  const loadGlobalComponents = useCallback(async () => {
    try {
      const ids = await invoke('list_ycs_data', { category: 'components' });
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'components', id });
          loaded.push(JSON.parse(raw));
        } catch {}
      }
      setGlobalComponents(loaded);
    } catch {}
  }, []);

  const loadTextures = useCallback(async () => {
    try {
      const ids = await invoke('list_textures');
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_texture', { id });
          const tex = JSON.parse(raw);
          tex._url = await invoke('load_texture_image', { id }).catch(() => null);
          loaded.push(tex);
        } catch {}
      }
      setTextures(loaded);
    } catch {}
  }, []);

  const VANILLA_TABS = [
    { id: 'minecraft:building_blocks', displayName: 'Building Blocks' },
    { id: 'minecraft:colored_blocks', displayName: 'Colored Blocks' },
    { id: 'minecraft:natural_blocks', displayName: 'Natural Blocks' },
    { id: 'minecraft:functional_blocks', displayName: 'Functional Blocks' },
    { id: 'minecraft:redstone_blocks', displayName: 'Redstone Blocks' },
    { id: 'minecraft:tools_and_utilities', displayName: 'Tools & Utilities' },
    { id: 'minecraft:combat', displayName: 'Combat' },
    { id: 'minecraft:food_and_drinks', displayName: 'Food & Drinks' },
    { id: 'minecraft:ingredients', displayName: 'Ingredients' },
    { id: 'minecraft:spawn_eggs', displayName: 'Spawn Eggs' },
    { id: 'minecraft:op_blocks', displayName: 'Operator Utilities' },
  ];

  const [allTabOptions, setAllTabOptions] = useState([]);

  const loadTabs = useCallback(async () => {
    try {
      const ids = await invoke('list_ycs_data', { category: 'tabs' });
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'tabs', id });
          loaded.push(JSON.parse(raw));
        } catch {}
      }
      setAvailableTabs(loaded);
      setAllTabOptions([
        { label: '(None)', value: '' },
        ...loaded.map(t => ({ label: `${t.displayName || t.id} — ${MODID}:${t.id}`, value: t.id })),
        ...VANILLA_TABS.map(t => ({ label: `${t.displayName} — ${t.id}`, value: t.id })),
      ]);
    } catch {}
  }, []);

  const loadRecipeItemOptions = useCallback(async () => {
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
    setRecipeItemOptions([
      ...modItems,
      ...VANILLA_ITEMS.map(i => ({ label: `${i.displayName} — ${i.id}`, value: i.id })),
    ]);
  }, []);

  useEffect(() => {
    loadTextures();
    loadTabs();
    loadRecipeItemOptions();
    loadGlobalComponents();
    if (existingId) {
      invoke('load_ycs_data', { category: 'items', id: existingId })
        .then(raw => {
          const data = JSON.parse(raw);
          setItemId(data.id || '');
          setDisplayName(data.displayName || '');
          setTexture(data.texture || '');
          setHoldingMode(data.holdingMode || 'generated');
          setStackSize(String(data.stackSize ?? '64'));
          setUseDuration(data.useDuration || false);
          setUseDurationValue(String(data.useDurationValue ?? '32'));
          setUseAnim(data.useAnim || 'NONE');
          setTags(data.tags || []);
          setGeoModel(data.geoModel || '');
          setGeoTexture(data.geoTexture || '');
          setDisplayModel(data.displayModel || '');
          setMultiState(!!data.states?.length);
          setStates(data.states || []);
          setCustomClass(data.customClass || false);
          setEnabledMethods(data.enabledMethods || []);
          setDataComponents(data.dataComponents || []);
          setItemAbilitiesEnabled(!!data.itemAbilitiesEnabled);
          setItemAbilitySlots(Array.from({ length: 9 }, (_, i) => data.itemAbilitySlots?.[i] || ''));
          setAttackDamage(data.attackDamage != null ? String(data.attackDamage) : '');
          setAttackSpeed(data.attackSpeed != null ? String(data.attackSpeed) : '');
          setFoodEnabled(data.foodEnabled || false);
          setNutrition(data.nutrition != null ? String(data.nutrition) : '4');
          setSaturation(data.saturation != null ? String(data.saturation) : '0.3');
          setCanAlwaysEat(data.canAlwaysEat || false);
          setFastFood(data.fastFood || false);
          setFuelEnabled(data.fuelEnabled || false);
          setFuel(data.fuel != null ? String(data.fuel) : '');
          setToolEnabled(data.toolEnabled || false);
          setToolType(data.toolType || 'sword');
          setToolTier(data.toolTier || 'iron');
          setTooltipEnabled(data.tooltipEnabled || false);
          setTooltipNormal(data.tooltipNormal || '');
          setTooltipShift(data.tooltipShift || false);
          setTooltipUseDefaultHint(data.tooltipUseDefaultHint ?? true);
          setTooltipShiftHint(data.tooltipShiftHint || '');
          setTooltipHidden(data.tooltipHidden || '');
          setCreativeTab(data.creativeTab || '');
          // Recipes
          const r = data.recipes || {};
          setShapedEnabled(!!r.shaped);
          setShapedGrid(r.shaped?.grid || EMPTY_GRID);
          setShapedCount(String(r.shaped?.count ?? 1));
          setShapelessEnabled(!!r.shapeless);
          setShapelessIngredients(r.shapeless?.ingredients || ['']);
          setShapelessCount(String(r.shapeless?.count ?? 1));
          setSmeltingEnabled(!!r.smelting);
          setSmeltingIngredient(r.smelting?.ingredient || '');
          setSmeltingExp(String(r.smelting?.experience ?? 0.7));
          setSmeltingTime(String(r.smelting?.cookingTime ?? 200));
          setBlastingEnabled(!!r.blasting);
          setBlastingIngredient(r.blasting?.ingredient || '');
          setBlastingExp(String(r.blasting?.experience ?? 0.7));
          setBlastingTime(String(r.blasting?.cookingTime ?? 100));
          setSmokingEnabled(!!r.smoking);
          setSmokingIngredient(r.smoking?.ingredient || '');
          setSmokingExp(String(r.smoking?.experience ?? 0.35));
          setSmokingTime(String(r.smoking?.cookingTime ?? 100));
          setCampfireEnabled(!!r.campfire);
          setCampfireIngredient(r.campfire?.ingredient || '');
          setCampfireExp(String(r.campfire?.experience ?? 0.35));
          setCampfireTime(String(r.campfire?.cookingTime ?? 600));
          setStonecutEnabled(!!r.stonecutting);
          setStonecutIngredient(r.stonecutting?.ingredient || '');
          setStonecutCount(String(r.stonecutting?.count ?? 1));
          const inj = Array.isArray(data._injections) ? data._injections : [];
          setCurrentInjections(inj);
          setInjected(inj.length > 0);
        })
        .catch(() => {});
    }
  }, [existingId, loadTextures, loadTabs, loadRecipeItemOptions, loadGlobalComponents]);

  const needsCustomClass = customClass || useDuration;

  const buildPayload = () => ({
    id: itemId,
    displayName,
    texture,
    holdingMode,
    stackSize: parseInt(stackSize) || 64,
    useDuration,
    useDurationValue: parseInt(useDurationValue) || 32,
    useAnim,
    tags,
    geoModel: is3D && geoModel ? itemId : '',
    geoTexture: is3D ? geoTexture : '',
    displayModel: is3D && displayModel ? itemId : '',
    states: multiState ? states : [],
    customClass,
    enabledMethods,
    dataComponents,
    itemAbilitiesEnabled,
    itemAbilitySlots: itemAbilitiesEnabled ? itemAbilitySlots.map(v => (v || '').trim()) : [],
    attackDamage: attackDamage !== '' ? parseFloat(attackDamage) : null,
    attackSpeed: attackSpeed !== '' ? parseFloat(attackSpeed) : null,
    foodEnabled,
    nutrition: foodEnabled ? (parseInt(nutrition) || 4) : null,
    saturation: foodEnabled ? (parseFloat(saturation) || 0.3) : null,
    canAlwaysEat: foodEnabled ? canAlwaysEat : false,
    fastFood: foodEnabled ? fastFood : false,
    fuelEnabled,
    fuel: fuelEnabled && fuel !== '' ? (parseInt(fuel) || null) : null,
    toolEnabled,
    toolType: toolEnabled ? toolType : '',
    toolTier: toolEnabled ? toolTier : '',
    tooltipEnabled,
    tooltipNormal: tooltipEnabled ? tooltipNormal : '',
    tooltipShift: tooltipEnabled ? tooltipShift : false,
    tooltipUseDefaultHint: tooltipEnabled && tooltipShift ? tooltipUseDefaultHint : true,
    tooltipShiftHint: tooltipEnabled && tooltipShift && !tooltipUseDefaultHint ? tooltipShiftHint : '',
    tooltipHidden: tooltipEnabled && tooltipShift ? tooltipHidden : '',
    creativeTab,
    recipes: {
      ...(shapedEnabled ? { shaped: { grid: shapedGrid, count: parseInt(shapedCount) || 1 } } : {}),
      ...(shapelessEnabled ? { shapeless: { ingredients: shapelessIngredients.filter(Boolean), count: parseInt(shapelessCount) || 1 } } : {}),
      ...(smeltingEnabled ? { smelting: { ingredient: smeltingIngredient, experience: parseFloat(smeltingExp) || 0.7, cookingTime: parseInt(smeltingTime) || 200 } } : {}),
      ...(blastingEnabled ? { blasting: { ingredient: blastingIngredient, experience: parseFloat(blastingExp) || 0.7, cookingTime: parseInt(blastingTime) || 100 } } : {}),
      ...(smokingEnabled ? { smoking: { ingredient: smokingIngredient, experience: parseFloat(smokingExp) || 0.35, cookingTime: parseInt(smokingTime) || 100 } } : {}),
      ...(campfireEnabled ? { campfire: { ingredient: campfireIngredient, experience: parseFloat(campfireExp) || 0.35, cookingTime: parseInt(campfireTime) || 600 } } : {}),
      ...(stonecutEnabled ? { stonecutting: { ingredient: stonecutIngredient, count: parseInt(stonecutCount) || 1 } } : {}),
    },
    type: 'item',
  });

  const removeExistingInjections = async () => {
    for (let i = currentInjections.length - 1; i >= 0; i--) {
      const inj = currentInjections[i];
      try {
        if (inj.type === 'java-marker') {
          await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content });
        } else if (inj.type === 'json-key') {
          await invoke('delete_json_key', { file: inj.file, key: inj.key });
        } else if (inj.type === 'created-file') {
          await invoke('delete_mod_file', { file: inj.file });
        }
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }
    setCurrentInjections([]);
  };

  const importGeoModel = async (droppedPath) => {
    if (!itemId) { setStatus({ ok: false, msg: 'Set an Item ID first.' }); return; }
    let filePath = droppedPath;
    if (!filePath) {
      const file = await open({
        multiple: false,
        filters: [{ name: 'Bedrock Geo', extensions: ['json'] }],
      });
      if (!file) return;
      filePath = typeof file === 'string' ? file : file.path;
    }
    try {
      await invoke('import_geo_model', { kind: 'items', id: itemId, sourcePath: filePath });
      setGeoModel(itemId);
      setStatus({ ok: true, msg: 'Geo model imported.' });
    } catch (err) {
      setStatus({ ok: false, msg: 'Failed to import model: ' + err });
    }
  };

  const importDisplayModel = async (droppedPath) => {
    if (!itemId) { setStatus({ ok: false, msg: 'Set an Item ID first.' }); return; }
    let filePath = droppedPath;
    if (!filePath) {
      const file = await open({
        multiple: false,
        filters: [{ name: 'Display Model JSON', extensions: ['json'] }],
      });
      if (!file) return;
      filePath = typeof file === 'string' ? file : file.path;
    }
    try {
      await invoke('import_display_model', { kind: 'items', id: itemId, sourcePath: filePath });
      setDisplayModel(itemId);
      setStatus({ ok: true, msg: 'Display model imported.' });
    } catch (err) {
      setStatus({ ok: false, msg: 'Failed to import display model: ' + err });
    }
  };

  const handleSaveAndInject = async () => {
    if (!itemId) { setStatus({ ok: false, msg: 'Item ID is required.' }); return; }
    setSaving(true);
    try {
      await removeExistingInjections();
      if (lastSavedId && lastSavedId !== itemId) {
        await invoke('delete_ycs_data', { category: 'items', id: lastSavedId }).catch(() => {});
        await invoke('delete_geo_model', { kind: 'items', id: lastSavedId }).catch(() => {});
      }

      const payload = buildPayload();
      const injections = [];
      const CN = itemId.toUpperCase();
      const className = toPascalCase(itemId) + 'Item';

      // Build Item.Properties() chain
      // Determine base class for registration and custom class extends
      const toolBaseClass = {
        sword: 'SwordItem',
        pickaxe: 'PickaxeItem',
        axe: 'AxeItem',
        shovel: 'ShovelItem',
        hoe: 'HoeItem',
      }[toolType];
      const isTool = toolEnabled && !!toolBaseClass;

      const parsedStack = parseInt(stackSize) || 64;
      let propsChain = (!isTool && parsedStack !== 64) ? `.stacksTo(${parsedStack})` : '';
      if (itemAbilitiesEnabled) {
        propsChain += `.component(ModDataComponents.ITEM_HAS_ABILITIES.get(), true)`;
        itemAbilitySlots.forEach((abilityId, index) => {
          const trimmedAbilityId = (abilityId || '').trim();
          if (trimmedAbilityId) {
            propsChain += `.component(ModDataComponents.ITEM_ABILITY_SLOT_${index + 1}.get(), "${trimmedAbilityId.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
          }
        });
      }
      if (foodEnabled) {
        let foodBuilder = `new FoodProperties.Builder().nutrition(${parseInt(nutrition) || 4}).saturationModifier(${parseFloat(saturation) || 0.3}f)`;
        if (canAlwaysEat) foodBuilder += '.alwaysEdible()';
        if (fastFood) foodBuilder += '.fast()';
        propsChain += `.food(${foodBuilder}.build())`;
      }

      const tierConst = {
        wood: 'Tiers.WOOD', stone: 'Tiers.STONE', iron: 'Tiers.IRON',
        gold: 'Tiers.GOLD', diamond: 'Tiers.DIAMOND', netherite: 'Tiers.NETHERITE',
      }[toolTier] || 'Tiers.IRON';

      const defaultDamage = { sword: 3, axe: 5, pickaxe: 1, shovel: 1.5, hoe: 0 };
      const defaultSpeed  = { sword: -2.4, axe: -3.1, pickaxe: -2.8, shovel: -3.0, hoe: -3.0 };
      const toolDamageBonus = attackDamage !== '' ? parseFloat(attackDamage) : (defaultDamage[toolType] ?? 0);
      const toolSpeedBonus  = attackSpeed  !== '' ? parseFloat(attackSpeed)  : (defaultSpeed[toolType]  ?? 0);

      // Attach attack/speed via .attributes() — all tool constructors in 1.21.1 are (Tier, Properties) only
      const hasCustomAttrs = attackDamage !== '' || attackSpeed !== '';
      if (isTool && hasCustomAttrs) {
        const helper = toolType === 'sword'
          ? `SwordItem.createAttributes(${tierConst}, ${toolDamageBonus}f, ${toolSpeedBonus}f)`
          : `DiggerItem.createAttributes(${tierConst}, ${toolDamageBonus}f, ${toolSpeedBonus}f)`;
        propsChain += `.attributes(${helper})`;
      } else if (!isTool && hasCustomAttrs) {
        const parts = [];
        if (attackDamage !== '') parts.push(`                .add(Attributes.ATTACK_DAMAGE, new AttributeModifier(Item.BASE_ATTACK_DAMAGE_ID, ${parseFloat(attackDamage)}, AttributeModifier.Operation.ADD_VALUE), EquipmentSlotGroup.MAINHAND)`);
        if (attackSpeed !== '')  parts.push(`                .add(Attributes.ATTACK_SPEED, new AttributeModifier(Item.BASE_ATTACK_SPEED_ID, ${parseFloat(attackSpeed)}, AttributeModifier.Operation.ADD_VALUE), EquipmentSlotGroup.MAINHAND)`);
        propsChain += `.attributes(ItemAttributeModifiers.builder()\n${parts.join('\n')}\n                .build())`;
      }

      // Build tooltip body (used both for inline anon class and custom class method)
      const buildTooltipLines = (indent) => {
        const i = `${indent}    `;
        const lines = [];
        if (tooltipNormal) lines.push(`${i}tooltipData.add(Component.translatable("tooltip.${MODID}.${itemId}.normal"));`);
        if (tooltipShift) {
          const hintKey = tooltipUseDefaultHint
            ? `"tooltip.${MODID}.shift_hint"`
            : tooltipShiftHint ? `"tooltip.${MODID}.${itemId}.shift_hint"` : null;
          if (hintKey) lines.push(`${i}if (!flag.hasShiftDown()) tooltipData.add(Component.translatable(${hintKey}).withStyle(net.minecraft.ChatFormatting.GRAY));`);
          if (tooltipHidden) lines.push(`${i}if (flag.hasShiftDown()) tooltipData.add(Component.translatable("tooltip.${MODID}.${itemId}.hidden"));`);
        }
        lines.push(`${i}super.appendHoverText(stack, context, tooltipData, flag);`);
        return lines.join('\n');
      };

      const tooltipImportsNeeded = tooltipEnabled
        ? ['import java.util.List;', 'import net.minecraft.network.chat.Component;', 'import net.minecraft.world.item.TooltipFlag;', 'import net.minecraft.world.item.Item.TooltipContext;', 'import net.minecraft.world.item.ItemStack;']
        : [];

      let baseClass, constructorArgs;
      if (isTool) {
        baseClass = toolBaseClass;
        constructorArgs = needsCustomClass
          ? `${tierConst}, new Item.Properties()${propsChain}`
          : `${tierConst}, new Item.Properties()${propsChain}`;
      } else {
        baseClass = 'Item';
        constructorArgs = `new Item.Properties()${propsChain}`;
      }

      const instanceClass = needsCustomClass ? className : baseClass;
      const baseConstructor = `new ${instanceClass}(${constructorArgs})`;
      const constructor = (tooltipEnabled && !needsCustomClass)
        ? `new ${baseClass}(${constructorArgs}) {\n            @Override\n            public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltipData, TooltipFlag flag) {\n${buildTooltipLines('            ')}\n            }\n        }`
        : baseConstructor;
      const registeredType = isTool ? baseClass : 'Item';

      const regLine = `    public static final DeferredItem<${registeredType}> ${CN} = ITEMS.register("${itemId}",\n            () -> ${constructor});`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/item/ModItems.java`,
        marker: 'YCS_Mod_Items',
        content: regLine,
      });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/item/ModItems.java`, marker: 'YCS_Mod_Items', content: regLine });

      if (needsCustomClass) {
        const classFile = `${JAVA_BASE}/item/custom/${className}.java`;

        // Compile block editor bodies for all enabled methods
        const METHOD_DEFS = [
          { key: 'useOn',                returnType: 'InteractionResult',            sig: 'useOn(UseOnContext context)',                                                             superCall: 'return super.useOn(context);',                                        imports: ['net.minecraft.world.item.context.UseOnContext', 'net.minecraft.world.InteractionResult'] },
          { key: 'use',                  returnType: 'InteractionResultHolder<ItemStack>', sig: 'use(Level level, Player player, InteractionHand usedHand)',                    preBody: 'player.startUsingItem(usedHand);', superCall: 'return InteractionResultHolder.consume(player.getItemInHand(usedHand));', imports: ['net.minecraft.world.InteractionResultHolder', 'net.minecraft.world.InteractionHand', 'net.minecraft.world.entity.player.Player'] },
          { key: 'continuousUse',        returnType: 'void',                          sig: 'onUseTick(Level level, LivingEntity livingEntity, ItemStack stack, int remainingUseDuration)', imports: ['net.minecraft.world.entity.LivingEntity'] },
          { key: 'releaseUsing',         returnType: 'void',                          sig: 'releaseUsing(ItemStack stack, Level level, LivingEntity livingEntity, int timeCharged)',       imports: ['net.minecraft.world.entity.LivingEntity'] },
          { key: 'finishUsingItem',      returnType: 'ItemStack',                     sig: 'finishUsingItem(ItemStack stack, Level level, LivingEntity livingEntity)',           superCall: 'return super.finishUsingItem(stack, level, livingEntity);',           imports: ['net.minecraft.world.entity.LivingEntity'] },
          { key: 'inventoryTick',        returnType: 'void',                          sig: 'inventoryTick(ItemStack stack, Level level, Entity entity, int slotId, boolean isSelected)', imports: ['net.minecraft.world.entity.Entity'] },
          { key: 'hurtEnemy',            returnType: 'boolean',                       sig: 'hurtEnemy(ItemStack stack, LivingEntity target, LivingEntity attacker)',             superCall: 'return super.hurtEnemy(stack, target, attacker);',                    imports: ['net.minecraft.world.entity.LivingEntity'] },
          { key: 'interactLivingEntity', returnType: 'InteractionResult',             sig: 'interactLivingEntity(ItemStack stack, Player player, LivingEntity interactionTarget, InteractionHand usedHand)', superCall: 'return super.interactLivingEntity(stack, player, interactionTarget, usedHand);', imports: ['net.minecraft.world.InteractionResult', 'net.minecraft.world.InteractionHand', 'net.minecraft.world.entity.player.Player', 'net.minecraft.world.entity.LivingEntity'] },
        ];

        const blockImports = new Set();
        const compiledMethods = {};
        const overlayTextureIds = new Set();
        for (const mdef of METHOD_DEFS) {
          if (!enabledMethods.includes(mdef.key)) continue;
          const raw = localStorage.getItem(`ycs-blocky::item::${itemId}::${mdef.key}`);
          if (!raw) continue;
          try {
            const nodes = JSON.parse(raw);
            // Re-derive mask/emissive/rows/animation from the live texture pool at Save time rather
            // than trusting whatever was cached on the node when the dropdown was last touched in
            // the Blocky editor — avoids silently falling back to stale behavior if the texture's
            // mask/emissive/Animated setting was changed after this block's texture was first picked.
            for (const n of nodes) {
              if (n.opcode !== 'overlay.set' || !n.fields?.texture) continue;
              const texMeta = textures.find(t => t.id === n.fields.texture);
              n.fields.textureRows = String(texMeta?.rows || 1);
              n.fields.textureHasMask = texMeta?.hasMask ? '1' : '0';
              n.fields.textureHasEmissive = texMeta?.hasEmissive ? '1' : '0';
              n.fields.textureAnimatedOnUse = texMeta?.animatedOnUse ? '1' : '0';
              n.fields.textureTicksPerFrame = String(texMeta?.ticksPerFrame || 4);
              overlayTextureIds.add(n.fields.texture);
            }
            const startNode = nodes.find(n => n.id === 'start');
            if (startNode?.nextId) {
              compiledMethods[mdef.key] = compileChain(startNode.nextId, nodes, mdef.key);
              const nodeImports = collectBlockImports(nodes);
              for (const imp of nodeImports) blockImports.add(imp);
            }
          } catch (e) {
            console.error('Block compile error for', mdef.key, e);
          }
        }

        // Any texture picked via a "Set Texture Overlay" Blocky block must physically exist in the
        // mod at a fixed, well-known path (compiler.js hardcodes "textures/overlay/<id>.png" since it
        // can't do async file I/O during codegen) — copy it (+ mask/emissive if attached) here.
        for (const texId of overlayTextureIds) {
          const texMeta = textures.find(t => t.id === texId);
          if (!texMeta) continue;
          const overlayTexPath = `${RES_BASE}/textures/overlay/${texId}.png`;
          await invoke('copy_texture_to_mod', { textureId: texId, destFile: overlayTexPath }).catch(() => {});
          injections.push({ type: 'created-file', file: overlayTexPath });
          if (texMeta.hasMask) {
            const maskPath = `${RES_BASE}/textures/overlay/${texId}_mask.png`;
            await invoke('copy_texture_to_mod', { textureId: `${texId}_mask`, destFile: maskPath }).catch(() => {});
            injections.push({ type: 'created-file', file: maskPath });
          }
          if (texMeta.hasEmissive) {
            const emissivePath = `${RES_BASE}/textures/overlay/${texId}_emissive.png`;
            await invoke('copy_texture_to_mod', { textureId: `${texId}_emissive`, destFile: emissivePath }).catch(() => {});
            injections.push({ type: 'created-file', file: emissivePath });
          }
        }

        // Build method stubs
        const buildMethodStub = (mdef) => {
          const lines = compiledMethods[mdef.key] || [];
          const bodyLines = [
            ...(mdef.preBody ? [`        ${mdef.preBody}`] : []),
            ...lines.map(l => `        ${l}`),
            ...(mdef.superCall ? [`        ${mdef.superCall}`] : []),
          ];
          return `\n    @Override\n    public ${mdef.returnType} ${mdef.sig} {\n${bodyLines.join('\n')}\n    }`;
        };

        const tooltipMethod = tooltipEnabled ? `\n    @Override\n    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltipData, TooltipFlag flag) {\n${buildTooltipLines('    ')}\n    }` : '';
        const useDurationMethod = useDuration ? `\n    @Override\n    public int getUseDuration(ItemStack stack, net.minecraft.world.level.Level level) {\n        return ${parseInt(useDurationValue) || 32};\n    }` : '';
        const useAnimMethod = useAnim !== 'NONE' ? `\n    @Override\n    public net.minecraft.world.item.UseAnim getUseAnimation(ItemStack stack) {\n        return net.minecraft.world.item.UseAnim.${useAnim};\n    }` : '';
        const enabledMethodStubs = METHOD_DEFS.filter(m => enabledMethods.includes(m.key)).map(buildMethodStub).join('');

        // Collect all imports
        const allImports = new Set([
          'net.minecraft.world.item.Item',
          ...(isTool ? [`net.minecraft.world.item.${baseClass}`, 'net.minecraft.world.item.Tiers'] : []),
          ...((useDuration || useAnim !== 'NONE' || enabledMethods.length > 0) ? ['net.minecraft.world.item.ItemStack'] : []),
          ...(tooltipEnabled ? ['java.util.List', 'net.minecraft.network.chat.Component', 'net.minecraft.world.item.TooltipFlag', 'net.minecraft.world.item.Item.TooltipContext', 'net.minecraft.world.item.ItemStack'] : []),
          ...(enabledMethods.length > 0 ? ['net.minecraft.world.level.Level'] : []),
          ...METHOD_DEFS.filter(m => enabledMethods.includes(m.key)).flatMap(m => m.imports || []),
          ...blockImports,
        ]);
        const importBlock = [...allImports].sort().map(i => `import ${i};`).join('\n');

        const classContent = `package net.ye6isu.yebisuRPG.item.custom;\n\n${importBlock}\n\npublic class ${className} extends ${baseClass} {\n    public ${className}(${isTool ? `Tiers tier, Properties properties` : `Properties properties`}) {\n        super(${isTool ? `tier, properties` : `properties`});\n    }${useDurationMethod}${useAnimMethod}${tooltipMethod}${enabledMethodStubs}\n}\n`;

        await invoke('write_mod_file', { file: classFile, content: classContent });
        injections.push({ type: 'created-file', file: classFile });

        const importLine = `import net.ye6isu.yebisuRPG.item.custom.${className};`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/item/ModItems.java`,
          marker: 'YCS_Mod_Item_Imports',
          content: importLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/item/ModItems.java`, marker: 'YCS_Mod_Item_Imports', content: importLine });
      }

      // Tooltip imports for inline anonymous class (when no custom class)
      if (tooltipEnabled && !needsCustomClass) {
        for (const importLine of tooltipImportsNeeded) {
          await invoke('inject_marker', { file: `${JAVA_BASE}/item/ModItems.java`, marker: 'YCS_Mod_Item_Imports', content: importLine });
          injections.push({ type: 'java-marker', file: `${JAVA_BASE}/item/ModItems.java`, marker: 'YCS_Mod_Item_Imports', content: importLine });
        }
      }

      if (itemAbilitiesEnabled) {
        const importLine = 'import net.ye6isu.yebisuRPG.component.ModDataComponents;';
        await invoke('inject_marker', { file: `${JAVA_BASE}/item/ModItems.java`, marker: 'YCS_Mod_Item_Imports', content: importLine });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/item/ModItems.java`, marker: 'YCS_Mod_Item_Imports', content: importLine });
      }

      // Attribute modifier imports (both tool and non-tool paths use .attributes())
      if (hasCustomAttrs) {
        const attrImports = isTool
          ? [
              toolType === 'sword'
                ? 'import net.minecraft.world.item.SwordItem;'
                : 'import net.minecraft.world.item.DiggerItem;',
            ]
          : [
              'import net.minecraft.world.item.component.ItemAttributeModifiers;',
              'import net.minecraft.world.entity.ai.attributes.AttributeModifier;',
              'import net.minecraft.world.entity.ai.attributes.Attributes;',
              'import net.minecraft.world.entity.EquipmentSlotGroup;',
            ];
        for (const importLine of attrImports) {
          await invoke('inject_marker', { file: `${JAVA_BASE}/item/ModItems.java`, marker: 'YCS_Mod_Item_Imports', content: importLine });
          injections.push({ type: 'java-marker', file: `${JAVA_BASE}/item/ModItems.java`, marker: 'YCS_Mod_Item_Imports', content: importLine });
        }
      }

      // Tooltip lang keys
      if (tooltipEnabled) {
        const ttLangEntries = [];
        if (tooltipNormal) ttLangEntries.push([`tooltip.${MODID}.${itemId}.normal`, tooltipNormal]);
        if (tooltipShift && !tooltipUseDefaultHint && tooltipShiftHint) ttLangEntries.push([`tooltip.${MODID}.${itemId}.shift_hint`, tooltipShiftHint]);
        if (tooltipShift && tooltipHidden) ttLangEntries.push([`tooltip.${MODID}.${itemId}.hidden`, tooltipHidden]);
        for (const [key, value] of ttLangEntries) {
          await invoke('set_json_key', { file: `${RES_BASE}/lang/en_us.json`, key, value });
          injections.push({ type: 'json-key', file: `${RES_BASE}/lang/en_us.json`, key });
        }
      }

      // Fuel registration
      if (fuelEnabled && fuel !== '' && parseInt(fuel)) {
        const fuelLine = `        if (event.getItemStack().is(ModItems.${CN}.get())) { event.setBurnTime(${parseInt(fuel)}); }`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/item/ModFuelEvents.java`,
          marker: 'YCS_Mod_Fuel',
          content: fuelLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/item/ModFuelEvents.java`, marker: 'YCS_Mod_Fuel', content: fuelLine });
      }

      const langKey = `item.${MODID}.${itemId}`;
      await invoke('set_json_key', {
        file: `${RES_BASE}/lang/en_us.json`,
        key: langKey,
        value: displayName || itemId,
      });
      injections.push({ type: 'json-key', file: `${RES_BASE}/lang/en_us.json`, key: langKey });

      // Creative tab assignment
      if (creativeTab) {
        let tabContentLine;
        if (creativeTab.startsWith('minecraft:')) {
          const [ns, path] = creativeTab.split(':');
          tabContentLine = `        if (event.getTabKey() == net.minecraft.world.item.CreativeModeTabs.${path.toUpperCase()}) event.accept(ModItems.${CN}.get());`;
        } else {
          tabContentLine = `        if (event.getTabKey() == ModCreativeModeTabs.${creativeTab.toUpperCase()}.getKey()) event.accept(ModItems.${CN}.get());`;
        }
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/item/ModCreativeTabContents.java`,
          marker: 'YCS_Tab_Contents',
          content: tabContentLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/item/ModCreativeTabContents.java`, marker: 'YCS_Tab_Contents', content: tabContentLine });
      }

      if (multiState) {
        // Each state gets its own namespaced files (`${itemId}_state${i}`). Every multi-state item —
        // whether it mixes 3D/flat or is flat-only — registers through tryRegisterMixedStates; Java
        // decides internally whether the custom renderer is actually needed (only for geo states, or
        // flat states that are themselves non-animated frame-sheets needing ITEM_FRAME-driven swapping).
        const specs = [];
        for (let i = 0; i < states.length; i++) {
          const state = states[i];
          const stateId = `${itemId}_state${i}`;

          if (state.holdingMode === '3d') {
            const modelSourceId = state.geoModel || state.displayModel;
            if (modelSourceId && modelSourceId !== stateId) {
              await invoke('rename_geo_model', { kind: 'items', oldId: modelSourceId, newId: stateId }).catch(() => {});
            }

            const hasGeo = await invoke('load_geo_model_path', { kind: 'items', id: stateId }).then(() => true).catch(() => false);
            if (hasGeo) {
              const geoDestPath = `${RES_BASE}/geo/item/${stateId}.geo.json`;
              await invoke('copy_geo_model_to_mod', { kind: 'items', modelId: stateId, destFile: geoDestPath });
              injections.push({ type: 'created-file', file: geoDestPath });
            }

            if (state.geoTexture) {
              const geoTexPath = `${RES_BASE}/textures/geo/item/${stateId}.png`;
              await invoke('copy_texture_to_mod', { textureId: state.geoTexture, destFile: geoTexPath });
              injections.push({ type: 'created-file', file: geoTexPath });
            }

            const stateTexMeta = state.geoTexture ? textures.find(t => t.id === state.geoTexture) : null;
            const stateIsFrameSheet = stateTexMeta?.rows > 1;
            const stateDefaultFrame = stateIsFrameSheet
              ? Math.min(Math.max(parseInt(stateTexMeta.defaultFrame) || 0, 0), stateTexMeta.rows - 1)
              : 0;
            specs.push(`new GeoItemRegistry.StateSpec("geo", "${stateId}", ${stateIsFrameSheet ? stateTexMeta.rows : 0}, ${stateIsFrameSheet ? !!stateTexMeta.animatedOnUse : false}, ${stateIsFrameSheet ? (parseInt(stateTexMeta.ticksPerFrame) || 4) : 0}, ${stateDefaultFrame})`);

            const displayModelPath = `${RES_BASE}/models/item/${stateId}.json`;
            const hasDisplay = await invoke('load_display_model', { kind: 'items', id: stateId }).then(() => true).catch(() => false);
            if (hasDisplay) {
              await invoke('copy_display_model_to_mod', { kind: 'items', modelId: stateId, destFile: displayModelPath });
            } else {
              const fallbackModel = JSON.stringify({ parent: "minecraft:builtin/entity" }, null, 2);
              await invoke('write_mod_file', { file: displayModelPath, content: fallbackModel });
            }
            injections.push({ type: 'created-file', file: displayModelPath });
          } else {
            const isHandheld = state.holdingMode === 'handheld';
            const parent = isHandheld ? 'minecraft:item/handheld' : 'minecraft:item/generated';
            const stateTexMeta = state.texture ? textures.find(t => t.id === state.texture) : null;
            const stateIsFrameSheet = stateTexMeta?.rows > 1 && !stateTexMeta.animatedOnUse;
            const stateDefaultFrame = stateTexMeta?.rows > 1
              ? Math.min(Math.max(parseInt(stateTexMeta.defaultFrame) || 0, 0), stateTexMeta.rows - 1)
              : 0;

            if (stateIsFrameSheet) {
              // Static (non-animated) spritesheet on a flat state: slice into per-row textures and
              // per-frame models, selected via ITEM_FRAME (not CustomModelData, which this state
              // machinery already uses to pick the active STATE).
              const rows = stateTexMeta.rows;
              const framePaths = await invoke('write_item_frame_textures', {
                textureId: state.texture, rows, destDir: `${RES_BASE}/textures/item`, destStem: stateId,
              });
              framePaths.forEach(p => injections.push({ type: 'created-file', file: p }));

              for (let row = 0; row < rows; row++) {
                const frameModelPath = `${RES_BASE}/models/item/${stateId}_frame${row}.json`;
                const frameModel = { parent, textures: { layer0: `${MODID}:item/${stateId}_frame${row}` } };
                await invoke('write_mod_file', { file: frameModelPath, content: JSON.stringify(frameModel, null, 2) });
                injections.push({ type: 'created-file', file: frameModelPath });
              }

              const flatModelPath = `${RES_BASE}/models/item/${stateId}.json`;
              const flatModel = { parent, textures: { layer0: `${MODID}:item/${stateId}_frame${stateDefaultFrame}` } };
              await invoke('write_mod_file', { file: flatModelPath, content: JSON.stringify(flatModel, null, 2) });
              injections.push({ type: 'created-file', file: flatModelPath });

              specs.push(`new GeoItemRegistry.StateSpec("flat", "${stateId}", ${rows}, false, 0, ${stateDefaultFrame})`);
            } else {
              const flatModelPath = `${RES_BASE}/models/item/${stateId}.json`;
              const flatModel = { parent, textures: { layer0: state.texture ? `${MODID}:item/${stateId}` : `${MODID}:item/missing` } };
              await invoke('write_mod_file', { file: flatModelPath, content: JSON.stringify(flatModel, null, 2) });
              injections.push({ type: 'created-file', file: flatModelPath });

              if (state.texture) {
                const texPath = `${RES_BASE}/textures/item/${stateId}.png`;
                await invoke('copy_texture_to_mod', { textureId: state.texture, destFile: texPath });
                injections.push({ type: 'created-file', file: texPath });

                if (stateTexMeta?.rows > 1 && stateTexMeta.animatedOnUse) {
                  const mcmetaPath = `${texPath}.mcmeta`;
                  const mcmeta = { animation: { frametime: parseInt(stateTexMeta.ticksPerFrame) || 4 } };
                  await invoke('write_mod_file', { file: mcmetaPath, content: JSON.stringify(mcmeta, null, 2) });
                  injections.push({ type: 'created-file', file: mcmetaPath });
                }
              }

              specs.push(`new GeoItemRegistry.StateSpec("flat", "${stateId}", 0, false, 0, 0)`);
            }
          }
        }

        const collectLine = `        tryRegisterMixedStates(items, ModItems.${CN}, java.util.List.of(${specs.join(', ')}));`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/client/renderer/GeoItemRegistry.java`,
          marker: 'YCS_Geo_Collect',
          content: collectLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/client/renderer/GeoItemRegistry.java`, marker: 'YCS_Geo_Collect', content: collectLine });

        // The Item's own base model routes to each state's OWN model via real custom_model_data
        // overrides — vanilla resolves the override BEFORE applying any display transform or
        // deciding custom-render-or-not (ItemRenderer.getModel -> BakedModel.getOverrides().resolve),
        // so each state's resolved model independently supplies its own display block (or none) and
        // its own isCustomRenderer() — exactly like a normal single-state item, no special-casing
        // needed in GeoItemRenderer. State 0's own model is also the base model's own fallback look.
        const baseParent = states[0]?.holdingMode === 'handheld' ? 'minecraft:item/handheld'
          : states[0]?.holdingMode === '3d' ? 'minecraft:builtin/entity' : 'minecraft:item/generated';
        const baseModelPath = `${RES_BASE}/models/item/${itemId}.json`;
        const baseModel = {
          parent: baseParent,
          overrides: states.map((_, i) => ({
            predicate: { custom_model_data: i },
            model: `${MODID}:item/${itemId}_state${i}`,
          })),
        };
        await invoke('write_mod_file', { file: baseModelPath, content: JSON.stringify(baseModel, null, 2) });
        injections.push({ type: 'created-file', file: baseModelPath });
      } else if (is3D) {
        // If ID changed since last import, rename stored model files to match new ID
        const modelSourceId = geoModel || displayModel;
        if (modelSourceId && modelSourceId !== itemId) {
          await invoke('rename_geo_model', { kind: 'items', oldId: modelSourceId, newId: itemId }).catch(() => {});
        }

        // Copy geo model to mod
        const hasGeo = await invoke('load_geo_model_path', { kind: 'items', id: itemId }).then(() => true).catch(() => false);
        if (hasGeo) {
          const geoDestPath = `${RES_BASE}/geo/item/${itemId}.geo.json`;
          await invoke('copy_geo_model_to_mod', { kind: 'items', modelId: itemId, destFile: geoDestPath });
          injections.push({ type: 'created-file', file: geoDestPath });
        }

        if (geoTexture) {
          const geoTexPath = `${RES_BASE}/textures/geo/item/${itemId}.png`;
          await invoke('copy_texture_to_mod', { textureId: geoTexture, destFile: geoTexPath });
          injections.push({ type: 'created-file', file: geoTexPath });
        }

        const geoTexMeta = geoTexture ? textures.find(t => t.id === geoTexture) : null;
        const geoIsFrameSheet = geoTexMeta?.rows > 1;
        const geoDefaultFrame = geoIsFrameSheet
          ? Math.min(Math.max(parseInt(geoTexMeta.defaultFrame) || 0, 0), geoTexMeta.rows - 1)
          : 0;
        const collectLine = geoIsFrameSheet
          ? `        tryRegister(items, ModItems.${CN}, "${itemId}", ${geoTexMeta.rows}, ${!!geoTexMeta.animatedOnUse}, ${parseInt(geoTexMeta.ticksPerFrame) || 4}, ${geoDefaultFrame});`
          : `        tryRegister(items, ModItems.${CN}, "${itemId}");`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/client/renderer/GeoItemRegistry.java`,
          marker: 'YCS_Geo_Collect',
          content: collectLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/client/renderer/GeoItemRegistry.java`, marker: 'YCS_Geo_Collect', content: collectLine });

        // Copy display model to mod (or write fallback)
        const displayModelPath = `${RES_BASE}/models/item/${itemId}.json`;
        const hasDisplay = await invoke('load_display_model', { kind: 'items', id: itemId }).then(() => true).catch(() => false);
        if (hasDisplay) {
          await invoke('copy_display_model_to_mod', { kind: 'items', modelId: itemId, destFile: displayModelPath });
        } else {
          const fallbackModel = JSON.stringify({ parent: "minecraft:builtin/entity" }, null, 2);
          await invoke('write_mod_file', { file: displayModelPath, content: fallbackModel });
        }
        injections.push({ type: 'created-file', file: displayModelPath });

      } else {
        const isHandheld = holdingMode === 'handheld';
        const texMeta = texture ? textures.find(t => t.id === texture) : null;
        const isFrameSheet = texMeta?.rows > 1 && !texMeta.animatedOnUse;

        if (isFrameSheet) {
          // Static (non-animated) spritesheet: slice into per-row textures and register as a single
          // flat "state" through GeoItemRegistry, so Set/Get/Reset Item Texture Frame (which reads/
          // writes the dedicated ITEM_FRAME component, independent of CustomModelData/Item State)
          // works identically here as it does on multi-state items — one consistent mechanism.
          const rows = texMeta.rows;
          const defaultFrame = Math.min(Math.max(parseInt(texMeta.defaultFrame) || 0, 0), rows - 1);
          const frameDestDir = `${RES_BASE}/textures/item`;
          const framePaths = await invoke('write_item_frame_textures', {
            textureId: texture, rows, destDir: frameDestDir, destStem: itemId,
          });
          framePaths.forEach(p => injections.push({ type: 'created-file', file: p }));

          const parent = isHandheld ? 'minecraft:item/handheld' : 'minecraft:item/generated';
          for (let row = 0; row < rows; row++) {
            const frameModelPath = `${RES_BASE}/models/item/${itemId}_frame${row}.json`;
            const frameModel = { parent, textures: { layer0: `${MODID}:item/${itemId}_frame${row}` } };
            await invoke('write_mod_file', { file: frameModelPath, content: JSON.stringify(frameModel, null, 2) });
            injections.push({ type: 'created-file', file: frameModelPath });
          }

          const baseModelPath = `${RES_BASE}/models/item/${itemId}.json`;
          const baseModel = { parent, textures: { layer0: `${MODID}:item/${itemId}_frame${defaultFrame}` } };
          await invoke('write_mod_file', { file: baseModelPath, content: JSON.stringify(baseModel, null, 2) });
          injections.push({ type: 'created-file', file: baseModelPath });

          const collectLine = `        tryRegisterMixedStates(items, ModItems.${CN}, java.util.List.of(new GeoItemRegistry.StateSpec("flat", "${itemId}", ${rows}, false, 0, ${defaultFrame})));`;
          await invoke('inject_marker', {
            file: `${JAVA_BASE}/client/renderer/GeoItemRegistry.java`,
            marker: 'YCS_Geo_Collect',
            content: collectLine,
          });
          injections.push({ type: 'java-marker', file: `${JAVA_BASE}/client/renderer/GeoItemRegistry.java`, marker: 'YCS_Geo_Collect', content: collectLine });
        } else {
          const modelLine = isHandheld
            ? `        handheldItem(ModItems.${CN});`
            : `        basicItem(ModItems.${CN}.get());`;
          await invoke('inject_marker', {
            file: `${JAVA_BASE}/datagen/ModItemModelProvider.java`,
            marker: 'YCS_Mod_Item_Model',
            content: modelLine,
          });
          injections.push({ type: 'java-marker', file: `${JAVA_BASE}/datagen/ModItemModelProvider.java`, marker: 'YCS_Mod_Item_Model', content: modelLine });
        }

        if (texture) {
          const texPath = `${RES_BASE}/textures/item/${itemId}.png`;
          await invoke('copy_texture_to_mod', { textureId: texture, destFile: texPath });
          injections.push({ type: 'created-file', file: texPath });

          if (texMeta?.rows > 1 && texMeta.animatedOnUse) {
            const mcmetaPath = `${texPath}.mcmeta`;
            const mcmeta = { animation: { frametime: parseInt(texMeta.ticksPerFrame) || 4 } };
            await invoke('write_mod_file', { file: mcmetaPath, content: JSON.stringify(mcmeta, null, 2) });
            injections.push({ type: 'created-file', file: mcmetaPath });
          }
        }
      }

      // Recipe file injection
      const resultId = `${MODID}:${itemId}`;
      const writeRecipe = async (recipeId, json) => {
        const file = `resources/data/${MODID}/recipe/${recipeId}.json`;
        await invoke('write_mod_file', { file, content: JSON.stringify(json, null, 2) });
        injections.push({ type: 'created-file', file });
      };

      if (shapedEnabled) {
        const charMap = buildCharMap(shapedGrid);
        const pattern = gridToPattern(shapedGrid, charMap);
        const key = {};
        for (const [item, ch] of Object.entries(charMap)) if (item) key[ch] = { item };
        await writeRecipe(`${itemId}_shaped`, { type: 'minecraft:crafting_shaped', pattern, key, result: { id: resultId, count: parseInt(shapedCount) || 1 } });
      }
      if (shapelessEnabled) {
        await writeRecipe(`${itemId}_shapeless`, { type: 'minecraft:crafting_shapeless', ingredients: shapelessIngredients.filter(Boolean).map(i => ({ item: i })), result: { id: resultId, count: parseInt(shapelessCount) || 1 } });
      }
      if (smeltingEnabled && smeltingIngredient) {
        await writeRecipe(`${itemId}_smelting`, { type: 'minecraft:smelting', ingredient: { item: smeltingIngredient }, result: { id: resultId }, experience: parseFloat(smeltingExp) || 0.7, cookingtime: parseInt(smeltingTime) || 200 });
      }
      if (blastingEnabled && blastingIngredient) {
        await writeRecipe(`${itemId}_blasting`, { type: 'minecraft:blasting', ingredient: { item: blastingIngredient }, result: { id: resultId }, experience: parseFloat(blastingExp) || 0.7, cookingtime: parseInt(blastingTime) || 100 });
      }
      if (smokingEnabled && smokingIngredient) {
        await writeRecipe(`${itemId}_smoking`, { type: 'minecraft:smoking', ingredient: { item: smokingIngredient }, result: { id: resultId }, experience: parseFloat(smokingExp) || 0.35, cookingtime: parseInt(smokingTime) || 100 });
      }
      if (campfireEnabled && campfireIngredient) {
        await writeRecipe(`${itemId}_campfire_cooking`, { type: 'minecraft:campfire_cooking', ingredient: { item: campfireIngredient }, result: { id: resultId }, experience: parseFloat(campfireExp) || 0.35, cookingtime: parseInt(campfireTime) || 600 });
      }
      if (stonecutEnabled && stonecutIngredient) {
        await writeRecipe(`${itemId}_stonecutting`, { type: 'minecraft:stonecutting', ingredient: { item: stonecutIngredient }, result: { id: resultId, count: parseInt(stonecutCount) || 1 } });
      }

      // Data component registrations — only item-specific ("inline") components need a fresh
      // Java registration here. "ref" components point at an existing global component
      // (registered via the Data Components page) and are just stored by reference below.
      const DC_REGISTER_METHOD = { double: 'registerDouble', boolean: 'registerBoolean', string: 'registerString' };
      const DC_JAVA_TYPE = { double: 'Double', boolean: 'Boolean', string: 'String' };
      for (const dc of dataComponents) {
        if (dc.kind === 'ref' || !dc.name) continue;
        const compId = `${itemId}_${dc.name}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const constName = componentConstName(compId);
        const method = DC_REGISTER_METHOD[dc.type] || 'registerDouble';
        const javaType = DC_JAVA_TYPE[dc.type] || 'Double';
        const line = `    public static final DeferredHolder<DataComponentType<?>, DataComponentType<${javaType}>> ${constName} = ${method}("${compId}");`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/component/ModDataComponents.java`,
          marker: 'YCS_Data_Components',
          content: line,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/component/ModDataComponents.java`, marker: 'YCS_Data_Components', content: line });
      }

      // Tag files — one JSON per tag, appending this item
      for (const tag of tags) {
        if (!tag) continue;
        // tags look like "minecraft:swords" or "forge:tools/swords"
        const [ns, ...rest] = tag.split(':');
        const tagPath = rest.join(':').replace(/:/g, '/');
        const file = `resources/data/${ns}/tags/item/${tagPath}.json`;
        const tagJson = { replace: false, values: [`${MODID}:${itemId}`] };
        await invoke('write_mod_file', { file, content: JSON.stringify(tagJson, null, 2) });
        injections.push({ type: 'created-file', file });
      }

      payload._injections = injections;
      await invoke('save_ycs_data', {
        category: 'items',
        id: itemId,
        content: JSON.stringify(payload, null, 2),
      });

      setCurrentInjections(injections);
      setInjected(true);
      setLastSavedId(itemId);
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Injection failed: ' + err });
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!existingId && !itemId) return;
    const targetId = existingId || itemId;
    setSaving(true);
    try {
      await removeExistingInjections();
      await invoke('delete_geo_model', { kind: 'items', id: targetId }).catch(() => {});
      await invoke('delete_ycs_data', { category: 'items', id: targetId });
      setStatus({ ok: true, msg: 'Removed and cleaned up.' });
      setInjected(false);
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Remove failed: ' + err });
    }
    setSaving(false);
  };

  useTitlebarActions({
    active: isActive,
    buttons: [
      ...(injected ? [{ id: 'delete', icon: 'delete', title: 'Delete item', danger: true, disabled: saving, onClick: handleRemove }] : []),
      { id: 'cancel', icon: 'cancel', title: 'Cancel', disabled: saving, onClick: onBack },
      { id: 'save', icon: 'save', title: saving ? 'Saving item' : 'Save item', disabled: saving || !itemId, onClick: handleSaveAndInject },
    ],
  });

  const textureOptions = textures.map(t => ({
    label: t.label,
    value: t.id,
    img: t._url,
    thumb: t._url && t.rows > 1 ? (
      <SpritesheetPreview
        dataUrl={t._url}
        rows={t.rows}
        defaultFrame={t.defaultFrame || 0}
        ticksPerFrame={t.ticksPerFrame || 4}
        autoPlay={!!t.animatedOnUse}
        size={16}
        bare
      />
    ) : undefined,
  }));

  if (editingDataComponents) {
    return (
      <DataComponentsPage
        components={dataComponents}
        onChange={setDataComponents}
        globalComponents={globalComponents}
        onBack={() => setEditingDataComponents(false)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {showTagPicker && <TagPicker tags={tags} onChange={setTags} onClose={() => setShowTagPicker(false)} />}
      <OverlayScrollArea
        vertical
        horizontal
        style={{ flex: 1, minHeight: 0, minWidth: 0 }}
        contentStyle={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        {status && <div style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</div>}
        <FieldGroup label="Identity">
          <FieldRow label="Item ID">
            <StringField value={itemId} onChange={handleIdChange} style={{ width: '100%' }} />
          </FieldRow>
          <FieldRow label="Display Name">
            <StringField value={displayName} onChange={setDisplayName} style={{ width: '100%' }} />
          </FieldRow>
          <FieldRow label="Creative Tab">
            <DropdownField
              value={creativeTab}
              onChange={(v) => v !== '__sep__' && setCreativeTab(v)}
              options={allTabOptions}
            />
          </FieldRow>
        </FieldGroup>

        <FieldGroup label="Appearance">
          <FieldRow label="Multiple States">
            <Checkbox checked={multiState} onChange={setMultiState} />
          </FieldRow>

          {multiState ? (
            <ItemStates itemId={itemId} states={states} onChange={setStates} textureOptions={textureOptions} />
          ) : (
            <>
              <FieldRow label="Holding Mode">
                <StandardDropdownField
                  value={holdingMode}
                  onChange={setHoldingMode}
                  options={[
                    { label: 'Generated', value: 'generated' },
                    { label: 'Handheld', value: 'handheld' },
                    { label: '3D Model', value: '3d' },
                  ]}
                />
              </FieldRow>

              {is3D ? (
                <>
                  <FieldRow label="Texture">
                    <DropdownField
                      value={geoTexture}
                      onChange={setGeoTexture}
                      options={[{ label: '(None)', value: '' }, ...textureOptions]}
                    />
                  </FieldRow>
                  <FieldRow label="Model">
                    <FileDropZone
                      hasFile={!!geoModel}
                      fileName={`${geoModel}.geo.json`}
                      onImport={(path) => importGeoModel(path)}
                      onClear={() => setGeoModel('')}
                    />
                  </FieldRow>
                  <FieldRow label="Display Model">
                    <FileDropZone
                      hasFile={!!displayModel}
                      fileName={`${displayModel}.display.json`}
                      onImport={(path) => importDisplayModel(path)}
                      onClear={() => setDisplayModel('')}
                    />
                  </FieldRow>
                </>
              ) : (
                <FieldRow label="Texture">
                  <DropdownField
                    value={texture}
                    onChange={setTexture}
                    options={[{ label: '(None)', value: '' }, ...textureOptions]}
                  />
                </FieldRow>
              )}
            </>
          )}
        </FieldGroup>

        <FieldGroup label="Properties">
          {!toolEnabled && (
            <FieldRow label="Stack Size">
              <NumberInput value={stackSize} onChange={setStackSize} style={{ width: '80px' }} />
            </FieldRow>
          )}
          <FieldRow label="Tool">
            <Checkbox checked={toolEnabled} onChange={setToolEnabled} />
          </FieldRow>
          {toolEnabled && <>
            <FieldRow label="Tool Type">
              <StandardDropdownField
                value={toolType}
                onChange={setToolType}
                options={[
                  { label: 'Sword', value: 'sword' },
                  { label: 'Pickaxe', value: 'pickaxe' },
                  { label: 'Axe', value: 'axe' },
                  { label: 'Shovel', value: 'shovel' },
                  { label: 'Hoe', value: 'hoe' },
                ]}
              />
            </FieldRow>
            <FieldRow label="Tier">
              <StandardDropdownField
                value={toolTier}
                onChange={setToolTier}
                options={[
                  { label: 'Wood', value: 'wood' },
                  { label: 'Stone', value: 'stone' },
                  { label: 'Iron', value: 'iron' },
                  { label: 'Gold', value: 'gold' },
                  { label: 'Diamond', value: 'diamond' },
                  { label: 'Netherite', value: 'netherite' },
                ]}
              />
            </FieldRow>
          </>}
        </FieldGroup>

        <FieldGroup label="Tags">
          <FieldRow label="Tags">
            <div
              onClick={() => setShowTagPicker(true)}
              className="ycs-string-input"
              style={{
                flex: 1, height: '24px', display: 'flex', alignItems: 'center',
                gap: '6px', cursor: 'pointer', fontSize: '12px', padding: '0 8px',
                boxSizing: 'border-box', overflow: 'hidden',
                justifyContent: tags.length === 0 ? 'center' : 'flex-start',
              }}
            >
              {tags.length === 0 ? (
                <span style={{ opacity: 0.35, fontSize: '12px' }}>+</span>
              ) : (
                <>
                  {tags.slice(0, 3).map(t => (
                    <span key={t} style={{
                      fontSize: '11px', padding: '1px 5px',
                      border: '1px solid var(--ycs-foreground)',
                      borderRadius: 'var(--ycs-radius, 4px)', whiteSpace: 'nowrap', flexShrink: 0,
                    }}>{t}</span>
                  ))}
                  {tags.length > 3 && <span style={{ opacity: 0.4, fontSize: '11px', flexShrink: 0 }}>+{tags.length - 3}</span>}
                </>
              )}
            </div>
          </FieldRow>
        </FieldGroup>

        <FieldGroup label="Data Components">
          <FieldRow label="Data Components">
            <FieldIconButton title="Data Components" onClick={() => setEditingDataComponents(true)} hasData={dataComponents.length > 0} />
          </FieldRow>
          <FieldRow label="Item Abilities">
            <Checkbox checked={itemAbilitiesEnabled} onChange={setItemAbilitiesEnabled} />
          </FieldRow>
          {itemAbilitiesEnabled && itemAbilitySlots.map((abilityId, index) => (
            <FieldRow key={index} label={`Ability Slot ${index + 1}`}>
              <StringField
                value={abilityId}
                onChange={v => setItemAbilitySlots(slots => slots.map((slot, i) => i === index ? v.trim().toLowerCase().replace(/\s+/g, '_') : slot))}
                placeholder="empty"
                style={{ width: '100%' }}
              />
            </FieldRow>
          ))}
        </FieldGroup>

        <FieldGroup label="Combat">
          <FieldRow label="Attack Damage">
            <NumberInput value={attackDamage} onChange={setAttackDamage} style={{ width: '80px' }} />
          </FieldRow>
          <FieldRow label="Attack Speed">
            <NumberInput value={attackSpeed} onChange={setAttackSpeed} style={{ width: '80px' }} />
          </FieldRow>
        </FieldGroup>

        <FieldGroup label="Food">
          <FieldRow label="Food">
            <Checkbox checked={foodEnabled} onChange={setFoodEnabled} />
          </FieldRow>
          {foodEnabled && <>
            <FieldRow label="Nutrition">
              <NumberInput value={nutrition} onChange={setNutrition} style={{ width: '80px' }} />
            </FieldRow>
            <FieldRow label="Saturation">
              <NumberInput value={saturation} onChange={setSaturation} style={{ width: '80px' }} />
            </FieldRow>
            <FieldRow label="Can Always Eat">
              <Checkbox checked={canAlwaysEat} onChange={setCanAlwaysEat} />
            </FieldRow>
            <FieldRow label="Fast Food">
              <Checkbox checked={fastFood} onChange={setFastFood} />
            </FieldRow>
          </>}
        </FieldGroup>

        <FieldGroup label="Fuel">
          <FieldRow label="Fuel">
            <Checkbox checked={fuelEnabled} onChange={setFuelEnabled} />
          </FieldRow>
          {fuelEnabled && (
            <FieldRow label="Burn Time (ticks)">
              <NumberInput value={fuel} onChange={setFuel} style={{ width: '80px' }} />
            </FieldRow>
          )}
        </FieldGroup>

        <FieldGroup label="Tooltip">
          <FieldRow label="Tooltip">
            <Checkbox checked={tooltipEnabled} onChange={setTooltipEnabled} />
          </FieldRow>
          {tooltipEnabled && <>
            <FieldRow label="Normal Text">
              <StringField value={tooltipNormal} onChange={setTooltipNormal} style={{ width: '100%' }} />
            </FieldRow>
            <FieldRow label="Shift to Reveal">
              <Checkbox checked={tooltipShift} onChange={setTooltipShift} />
            </FieldRow>
            {tooltipShift && <>
              <FieldRow label="Default Hint">
                <Checkbox checked={tooltipUseDefaultHint} onChange={setTooltipUseDefaultHint} />
              </FieldRow>
              {!tooltipUseDefaultHint && (
                <FieldRow label="Custom Hint">
                  <StringField value={tooltipShiftHint} onChange={setTooltipShiftHint} style={{ width: '100%' }} />
                </FieldRow>
              )}
              <FieldRow label="Hidden Text">
                <StringField value={tooltipHidden} onChange={setTooltipHidden} style={{ width: '100%' }} />
              </FieldRow>
            </>}
          </>}
        </FieldGroup>

        <FieldGroup label="Recipes">

          {/* Crafting Table */}
          <RecipeSubGroup label="Crafting" enabled={shapedEnabled || shapelessEnabled} onToggle={v => { if (!v) { setShapedEnabled(false); setShapelessEnabled(false); } else setShapedEnabled(true); }}>
            {shapedEnabled && <>
              <ShapedGrid grid={shapedGrid} onGridChange={setShapedGrid} itemOptions={recipeItemOptions} />
            </>}
            {shapelessEnabled && <>
              <ShapelessIngredients ingredients={shapelessIngredients} onChange={setShapelessIngredients} itemOptions={recipeItemOptions} />
            </>}
            <FieldRow label="Type">
              <StandardDropdownField
                value={shapedEnabled ? 'shaped' : 'shapeless'}
                onChange={v => { setShapedEnabled(v === 'shaped'); setShapelessEnabled(v === 'shapeless'); }}
                options={[
                  { label: 'Shaped', value: 'shaped' },
                  { label: 'Shapeless', value: 'shapeless' },
                ]}
              />
            </FieldRow>
            <FieldRow label="Count">
              <NumberInput value={shapedEnabled ? shapedCount : shapelessCount} onChange={shapedEnabled ? setShapedCount : setShapelessCount} style={{ width: '64px' }} />
            </FieldRow>
          </RecipeSubGroup>

          <RecipeSubGroup label="Smelting" enabled={smeltingEnabled} onToggle={setSmeltingEnabled}>
            <FieldRow label="Ingredient">
              <DropdownField value={smeltingIngredient} onChange={setSmeltingIngredient} options={recipeItemOptions} />
            </FieldRow>
            <FieldRow label="Experience">
              <NumberInput value={smeltingExp} onChange={setSmeltingExp} style={{ width: '80px' }} />
            </FieldRow>
            <FieldRow label="Cook Time">
              <NumberInput value={smeltingTime} onChange={setSmeltingTime} style={{ width: '80px' }} />
            </FieldRow>
          </RecipeSubGroup>

          <RecipeSubGroup label="Blasting" enabled={blastingEnabled} onToggle={setBlastingEnabled}>
            <FieldRow label="Ingredient">
              <DropdownField value={blastingIngredient} onChange={setBlastingIngredient} options={recipeItemOptions} />
            </FieldRow>
            <FieldRow label="Experience">
              <NumberInput value={blastingExp} onChange={setBlastingExp} style={{ width: '80px' }} />
            </FieldRow>
            <FieldRow label="Cook Time">
              <NumberInput value={blastingTime} onChange={setBlastingTime} style={{ width: '80px' }} />
            </FieldRow>
          </RecipeSubGroup>

          <RecipeSubGroup label="Smoking" enabled={smokingEnabled} onToggle={setSmokingEnabled}>
            <FieldRow label="Ingredient">
              <DropdownField value={smokingIngredient} onChange={setSmokingIngredient} options={recipeItemOptions} />
            </FieldRow>
            <FieldRow label="Experience">
              <NumberInput value={smokingExp} onChange={setSmokingExp} style={{ width: '80px' }} />
            </FieldRow>
            <FieldRow label="Cook Time">
              <NumberInput value={smokingTime} onChange={setSmokingTime} style={{ width: '80px' }} />
            </FieldRow>
          </RecipeSubGroup>

          <RecipeSubGroup label="Campfire" enabled={campfireEnabled} onToggle={setCampfireEnabled}>
            <FieldRow label="Ingredient">
              <DropdownField value={campfireIngredient} onChange={setCampfireIngredient} options={recipeItemOptions} />
            </FieldRow>
            <FieldRow label="Experience">
              <NumberInput value={campfireExp} onChange={setCampfireExp} style={{ width: '80px' }} />
            </FieldRow>
            <FieldRow label="Cook Time">
              <NumberInput value={campfireTime} onChange={setCampfireTime} style={{ width: '80px' }} />
            </FieldRow>
          </RecipeSubGroup>

          <RecipeSubGroup label="Stonecutting" enabled={stonecutEnabled} onToggle={setStonecutEnabled}>
            <FieldRow label="Ingredient">
              <DropdownField value={stonecutIngredient} onChange={setStonecutIngredient} options={recipeItemOptions} />
            </FieldRow>
            <FieldRow label="Count">
              <NumberInput value={stonecutCount} onChange={setStonecutCount} style={{ width: '64px' }} />
            </FieldRow>
          </RecipeSubGroup>

        </FieldGroup>

        <FieldGroup label="Advanced">
          <FieldRow label="Custom Class">
            <Checkbox checked={customClass} onChange={setCustomClass} />
            {customClass && itemId && (
              <span style={{ fontSize: '11px', opacity: 0.5, fontFamily: 'monospace' }}>
                {toPascalCase(itemId)}Item.java
              </span>
            )}
          </FieldRow>
          {customClass && ITEM_METHODS.map(m => {
            const gated = m.requires && !enabledMethods.includes(m.requires);
            const on = enabledMethods.includes(m.key) && !gated;
            const toggle = (checked) => {
              if (checked) {
                setEnabledMethods(prev => [...prev, m.key]);
              } else {
                const toRemove = m.key === 'use' ? [m.key, 'continuousUse'] : [m.key];
                setEnabledMethods(prev => prev.filter(k => !toRemove.includes(k)));
              }
            };
            return (
              <FieldRow key={m.key} label={m.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: gated ? 0.35 : 1 }}>
                  <Checkbox checked={on} onChange={toggle} disabled={gated} />
                  {on && (m.key === 'continuousUse' ? (
                    <>
                      <NumberInput value={useDurationValue} onChange={setUseDurationValue} style={{ width: '48px' }} />
                      <span style={{ fontSize: '11px', opacity: 0.4 }}>ticks</span>
                      <StandardDropdownField
                        value={useAnim}
                        onChange={setUseAnim}
                        options={[
                          { label: 'None',      value: 'NONE' },
                          { label: 'Eat',       value: 'EAT' },
                          { label: 'Drink',     value: 'DRINK' },
                          { label: 'Block',     value: 'BLOCK' },
                          { label: 'Bow',       value: 'BOW' },
                          { label: 'Spear',     value: 'SPEAR' },
                          { label: 'Crossbow',  value: 'CROSSBOW' },
                          { label: 'Spyglass',  value: 'SPYGLASS' },
                          { label: 'Toot Horn', value: 'TOOT_HORN' },
                          { label: 'Brush',     value: 'BRUSH' },
                        ]}
                      />
                      <FieldIconButton title="onUseTick" onClick={() => onOpenBlockEditor && onOpenBlockEditor(itemId, 'continuousUse')} hasData={!!localStorage.getItem(`ycs-blocky::item::${itemId}::continuousUse`)} />
                      <span style={{ fontSize: '11px', opacity: 0.4 }}>onUseTick</span>
                      <FieldIconButton title="releaseUsing" onClick={() => onOpenBlockEditor && onOpenBlockEditor(itemId, 'releaseUsing')} hasData={!!localStorage.getItem(`ycs-blocky::item::${itemId}::releaseUsing`)} />
                      <span style={{ fontSize: '11px', opacity: 0.4 }}>releaseUsing</span>
                    </>

                  ) : (
                    <FieldIconButton title={m.label} onClick={() => onOpenBlockEditor && onOpenBlockEditor(itemId, m.key)} hasData={!!localStorage.getItem(`ycs-blocky::item::${itemId}::${m.key}`)} />
                  ))}
                  {gated && (
                    <span style={{ fontSize: '10px', color: '#e8a868', background: '#3a2010', padding: '1px 5px', borderRadius: '3px' }}>
                      requires Interaction
                    </span>
                  )}
                </div>
              </FieldRow>
            );
          })}
        </FieldGroup>
      </OverlayScrollArea>

    </div>
  );
}
