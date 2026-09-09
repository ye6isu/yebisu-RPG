import { invoke } from '@tauri-apps/api/core';
import { VANILLA_ITEMS } from './data/vanilla-items.js';
import { ITEM_TAG_OPTIONS } from './data/item-tags.js';

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const ingredientTagDisplayName = tag => String(tag)
  .split(':').pop()
  .split(/[\/_]/)
  .filter(Boolean)
  .map(word => word.charAt(0).toLocaleUpperCase() + word.slice(1))
  .join(' ');

export const loadIngredientOptions = async () => {
  const projectItems = [];
  const projectTags = [];
  try {
    const ids = await invoke('list_ycs_data', { category: 'items' });
    for (const id of ids) {
      try {
        const data = JSON.parse(await invoke('load_ycs_data', { category: 'items', id }));
        const displayName = data.displayName || data.id;
        projectItems.push({ displayName, label: `${displayName} - yebisurpg:${data.id}`, value: `yebisurpg:${data.id}` });
      } catch {}
    }
  } catch {}
  try {
    const ids = await invoke('list_ycs_data', { category: 'tags' });
    for (const id of ids) {
      try {
        const data = JSON.parse(await invoke('load_ycs_data', { category: 'tags', id }));
        const tag = String(data.tagName || data.id || id).replace(/^#/, '');
        const displayName = String(data.displayName || ingredientTagDisplayName(tag));
        projectTags.push({ displayName, label: `${displayName} (Tag) - #${tag}`, value: `#${tag}` });
      } catch {}
    }
  } catch {}
  const catalogTags = ITEM_TAG_OPTIONS.map(tag => {
    const displayName = ingredientTagDisplayName(tag);
    return { displayName, label: `${displayName} (Tag) - #${tag}`, value: `#${tag}` };
  });
  const combined = [...projectItems, ...VANILLA_ITEMS.map(item => ({
    displayName: item.displayName,
    label: `${item.displayName} - ${item.id}`,
    value: item.id,
  })), ...projectTags, ...catalogTags];
  return [...new Map(combined.map(option => [option.value, option])).values()];
};

export const closeIngredientComboboxes = (root, except = null) => {
  for (const combobox of root.querySelectorAll('.ingredient-combobox')) {
    if (combobox === except) continue;
    combobox.closeIngredientOptions?.();
  }
};

export const createIngredientCombobox = ({
  options: itemOptions,
  value = '',
  ariaLabel = 'Ingredient',
  optionHostClass = '',
  onChange,
}) => {
  const combobox = document.createElement('div');
  combobox.className = 'pixel-combobox ingredient-combobox';
  const control = document.createElement('div');
  control.className = 'pixel-combobox-control';
  const input = document.createElement('input');
  input.className = 'pixel-text-box pixel-combobox-input';
  input.type = 'text';
  input.spellcheck = false;
  input.placeholder = 'Select an item';
  input.setAttribute('aria-label', ariaLabel);
  const selected = itemOptions.find(option => option.value === value);
  input.value = selected?.displayName || value;
  input.dataset.value = value;
  const trigger = document.createElement('button');
  trigger.className = 'pixel-button pixel-combobox-button';
  trigger.type = 'button';
  trigger.setAttribute('aria-label', `Open ${ariaLabel} options`);
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  const direction = document.createElement('span');
  direction.className = 'pixel-direction-icon pixel-direction-down';
  direction.setAttribute('aria-hidden', 'true');
  trigger.append(direction);
  const host = document.createElement('div');
  host.className = `ingredient-combobox-options-host ${optionHostClass}`.trim();
  const list = document.createElement('div');
  list.className = 'pixel-option-stack pixel-combobox-options ingredient-combobox-options';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  const scrollbar = document.createElement('div');
  scrollbar.className = 'dialog-overlay-scrollbar dialog-overlay-scrollbar-vertical';
  scrollbar.setAttribute('aria-hidden', 'true');
  const thumb = document.createElement('div');
  thumb.className = 'dialog-overlay-scrollbar-thumb';
  scrollbar.append(thumb);

  const visible = () => [...list.children].filter(option => !option.hidden);
  let firstVisibleIndex = 0;
  const syncFrames = (requestedIndex = firstVisibleIndex) => {
    const rows = visible();
    firstVisibleIndex = clamp(requestedIndex, 0, Math.max(0, rows.length - Math.min(6, rows.length)));
    const shown = rows.slice(firstVisibleIndex, firstVisibleIndex + 6);
    [...list.children].forEach(row => { delete row.dataset.stackPosition; });
    rows.forEach(row => { row.dataset.stackPosition = 'middle'; });
    if (shown.length === 1) shown[0].dataset.stackPosition = 'only';
    else if (shown.length) { shown[0].dataset.stackPosition = 'first'; shown[shown.length - 1].dataset.stackPosition = 'last'; }
    host.style.setProperty('--ingredient-visible-options', String(Math.max(1, Math.min(6, rows.length))));
    requestAnimationFrame(() => {
      if (!list.hidden && shown[0]) {
        list.scrollTop = shown[0].offsetTop;
        syncScrollbar();
      }
    });
  };
  const snap = target => {
    const rows = visible();
    if (!rows.length) return;
    const row = rows.reduce((best, candidate) => Math.abs(candidate.offsetTop - target) < Math.abs(best.offsetTop - target) ? candidate : best);
    syncFrames(rows.indexOf(row));
  };
  const syncScrollbar = () => {
    const overflow = list.scrollHeight > list.clientHeight + 0.5;
    scrollbar.hidden = !overflow;
    if (!overflow) return;
    const track = scrollbar.clientHeight;
    const artPixel = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ycs-pixel-2x')) || 2;
    const size = Math.min(track, Math.max(6 * artPixel, track * list.clientHeight / list.scrollHeight));
    const range = list.scrollHeight - list.clientHeight;
    const travel = track - size;
    thumb.style.height = `${size}px`;
    thumb.style.top = `${range ? list.scrollTop / range * travel : 0}px`;
  };
  const open = () => {
    closeIngredientComboboxes(document, combobox);
    list.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    direction.className = 'pixel-direction-icon pixel-direction-up';
    requestAnimationFrame(() => { syncFrames(); syncScrollbar(); });
  };
  const close = () => {
    list.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    direction.className = 'pixel-direction-icon pixel-direction-down';
  };
  combobox.closeIngredientOptions = close;

  for (const itemOption of itemOptions) {
    const option = document.createElement('button');
    option.className = 'pixel-option';
    option.type = 'button';
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', String(itemOption.value === value));
    option.dataset.searchText = `${itemOption.label} ${itemOption.value}`.toLocaleLowerCase();
    option.textContent = itemOption.label;
    option.title = itemOption.label;
    option.addEventListener('click', () => {
      input.value = itemOption.displayName;
      input.dataset.value = itemOption.value;
      onChange?.(itemOption.value);
      close();
    });
    list.append(option);
  }
  input.addEventListener('input', () => {
    const query = input.value.trim().toLocaleLowerCase();
    if (!query) { input.dataset.value = ''; onChange?.(''); }
    for (const option of list.children) option.hidden = Boolean(query) && !option.dataset.searchText.includes(query);
    list.scrollTop = 0;
    firstVisibleIndex = 0;
    open();
  });
  input.addEventListener('focus', open);
  trigger.addEventListener('click', () => list.hidden ? open() : close());
  list.addEventListener('scroll', syncScrollbar, { passive: true });
  list.addEventListener('wheel', event => {
    if (!event.deltaY) return;
    event.preventDefault();
    const rows = visible();
    syncFrames(firstVisibleIndex + Math.sign(event.deltaY));
  }, { passive: false });
  let drag = null;
  scrollbar.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); syncScrollbar();
    const track = scrollbar.getBoundingClientRect(); const knob = thumb.getBoundingClientRect();
    const range = list.scrollHeight - list.clientHeight; const travel = track.height - knob.height;
    if (event.target !== thumb) { snap((travel ? clamp(event.clientY - track.top - knob.height / 2, 0, travel) / travel : 0) * range); return; }
    drag = { id: event.pointerId, y: event.clientY, scroll: list.scrollTop, range, travel }; scrollbar.setPointerCapture(event.pointerId);
  });
  scrollbar.addEventListener('pointermove', event => { if (drag?.id === event.pointerId) snap(drag.scroll + (drag.travel ? (event.clientY - drag.y) / drag.travel * drag.range : 0)); });
  scrollbar.addEventListener('pointerup', () => { drag = null; });
  scrollbar.addEventListener('pointercancel', () => { drag = null; });
  control.append(input, trigger); host.append(list, scrollbar); combobox.append(control, host);
  return combobox;
};
