import React from 'react';
import RegistryLandingPage from './RegistryLandingPage';
import { DEFAULT_FORM } from './ItemPageNew';
import { removeItem } from '../codegen/itemInjector';
import * as itemStore from '../store/itemStore';

const EXCLUDED_CLASSES = ['ArmorItem', 'SpawnEgg'];

function filterItem(item) {
  return !EXCLUDED_CLASSES.includes(item.itemClass);
}

function seedFormData(item) {
  if (!item) {
    return { ...DEFAULT_FORM, states: DEFAULT_FORM.states.map(s => ({ ...s })) };
  }
  // If item was loaded from JSON, _fullData holds the complete form
  if (item._fullData) {
    return { ...item._fullData };
  }
  // Fallback: sparse mapping for Java-scanned items (migration path)
  const p = item.properties || {};
  const form = {
    ...DEFAULT_FORM,
    states: DEFAULT_FORM.states.map(s => ({ ...s })),
    displayName: item.displayName || '',
    id: item.id || '',
    constName: item.constName || '',
    customConstName: item.constName !== item.id.toUpperCase(),
    customClass: (item.itemClass !== 'Item') ? item.itemClass : '',
  };
  if (p.stackSize) form.stackSize = p.stackSize;
  if (p.isTool) {
    form.isTool = true;
    form.holdingMode = 'handheld';
    if (p.tier) form.tier = p.tier;
    if (p.damage) form.damage = p.damage;
    if (p.speed) form.speed = p.speed;
  }
  if (p.durability) { form.hasDurability = true; form.durability = p.durability; }
  if (p.isFood) form.isFood = true;
  return form;
}

async function loadItems() {
  const ids = await itemStore.listItems();
  if (ids.length > 0) {
    const items = [];
    for (const id of ids) {
      const data = await itemStore.loadItem(id);
      if (data) {
        items.push({
          id: data.id || id,
          displayName: data.displayName || id,
          constName: data.constName || id.toUpperCase(),
          itemClass: data.customClass || 'Item',
          properties: {
            stackSize: data.stackSize,
            isTool: data.isTool,
            tier: data.tier,
            damage: data.damage,
            speed: data.speed,
            durability: data.durability,
            isFood: data.isFood,
          },
          _fullData: data,
        });
      }
    }
    return { ok: true, data: items };
  }
  // Fallback: scan Java files for items not yet saved as JSON
  return window.electronAPI?.fileEngine?.items?.scanAll();
}

async function handleDeleteEntry(itemId, reload) {
  try {
    await removeItem(itemId);
    await itemStore.deleteItemFile(itemId);
    reload();
    window.dispatchEvent(new CustomEvent('ycs-item-changed'));
  } catch (err) {
    console.error('Failed to delete item:', err);
  }
}

export default function ItemsLandingPage(props) {
  return (
    <RegistryLandingPage
      {...props}
      title="Items"
      loadEntries={loadItems}
      filterEntry={filterItem}
      editorPrefix="Item"
      seedFormData={seedFormData}
      entryKey={entry => entry.id}
      onDeleteEntry={handleDeleteEntry}
    />
  );
}
