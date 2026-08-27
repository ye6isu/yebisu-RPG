import { invoke } from '@tauri-apps/api/core';

export const MOD_CREATIVE_TABS = [
  { id: 'yebisurpg', displayName: 'yebisu RPG' },
];

export const VANILLA_CREATIVE_TABS = [
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

export const CREATIVE_TAB_OPTIONS = [
  { id: '', displayName: '(None)' },
  ...MOD_CREATIVE_TABS,
  ...VANILLA_CREATIVE_TABS,
];

export const loadCreativeTabOptions = async () => {
  try {
    const ids = await invoke('list_ycs_data', { category: 'tabs' });
    const loadedTabs = (await Promise.all(ids.map(async id => {
      try {
        const raw = await invoke('load_ycs_data', { category: 'tabs', id });
        const tab = JSON.parse(raw);
        return {
          id: tab.id || id,
          displayName: tab.displayName || tab.id || id,
        };
      } catch {
        return null;
      }
    }))).filter(Boolean);

    return [
      { id: '', displayName: '(None)' },
      ...loadedTabs,
      ...VANILLA_CREATIVE_TABS,
    ];
  } catch {
    return CREATIVE_TAB_OPTIONS;
  }
};
