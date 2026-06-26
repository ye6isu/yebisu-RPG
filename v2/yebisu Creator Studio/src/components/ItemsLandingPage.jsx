import React from 'react';
import RegistryLandingPage from './RegistryLandingPage';
import { DEFAULT_FORM } from './ItemPageNew';

const EXCLUDED_CLASSES = ['ArmorItem', 'SpawnEgg'];

function filterItem(item) {
  return !EXCLUDED_CLASSES.includes(item.itemClass);
}

function seedFormData(item) {
  if (!item) {
    return { ...DEFAULT_FORM, states: DEFAULT_FORM.states.map(s => ({ ...s })) };
  }
  const p = item.properties;
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

function loadItems() {
  return window.electronAPI?.fileEngine?.items?.scanAll();
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
    />
  );
}
