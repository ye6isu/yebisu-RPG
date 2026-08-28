import { invoke } from '@tauri-apps/api/core';
import {
  CREATIVE_TAB_OPTIONS,
  loadCreativeTabOptions,
} from './data/creative-tabs.js';

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const textureMimeType = extension => extension === 'jpg' || extension === 'jpeg'
  ? 'image/jpeg'
  : `image/${extension}`;

const filterTextureOptions = combobox => {
  const query = combobox.querySelector('[data-item-texture-input]').value.trim().toLocaleLowerCase();
  for (const option of combobox.querySelectorAll('[data-item-texture-value]')) {
    option.hidden = Boolean(query)
      && !option.dataset.itemTextureLabel.toLocaleLowerCase().includes(query);
  }
};

const populateTextureOptions = async panel => {
  const options = panel.querySelector('[data-item-texture-options]');
  if (!options) return;
  const entries = [];
  try {
    const ids = await invoke('list_ycs_data', { category: 'textures' });
    for (const id of ids) {
      try {
        const [metadataText, extension, data] = await invoke('load_texture_bundle', { id });
        const metadata = JSON.parse(metadataText);
        const filterTo = String(metadata.filterTo || '').toLocaleLowerCase();
        if (filterTo && filterTo !== 'item') continue;
        const url = URL.createObjectURL(new Blob([new Uint8Array(data)], {
          type: textureMimeType(extension),
        }));
        entries.push({ id, label: String(metadata.label || id), url });
      } catch (error) {
        console.error(`Failed to load Item texture option ${id}.`, error);
      }
    }
  } catch (error) {
    console.error('Failed to list Item texture options.', error);
  }

  const noneOption = document.createElement('button');
  noneOption.className = 'pixel-option workspace-item-texture-option workspace-item-texture-option-none';
  noneOption.type = 'button';
  noneOption.setAttribute('role', 'option');
  noneOption.setAttribute('aria-selected', 'true');
  noneOption.dataset.itemTextureValue = '';
  noneOption.dataset.itemTextureLabel = '(None)';
  noneOption.textContent = '(None)';

  const textureOptions = entries.map(({ id, label, url }) => {
    const option = document.createElement('button');
    option.className = 'pixel-option workspace-item-texture-option';
    option.type = 'button';
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', 'false');
    option.dataset.itemTextureValue = id;
    option.dataset.itemTextureLabel = label;
    const image = document.createElement('img');
    image.className = 'workspace-item-texture-option-preview';
    image.src = url;
    image.alt = '';
    image.draggable = false;
    const text = document.createElement('span');
    text.textContent = label;
    option.append(image, text);
    return option;
  });
  options.replaceChildren(noneOption, ...textureOptions);
};

const populateCreativeTabOptions = (panel, creativeTabs = CREATIVE_TAB_OPTIONS) => {
  const dropdown = panel.querySelector('[data-item-dropdown="creativeTab"]');
  const options = dropdown?.querySelector('.workspace-item-dropdown-options');
  if (!options) return;
  const selectedValue = dropdown.querySelector('[data-item-dropdown-button]')?.dataset.value || '';

  options.replaceChildren(...creativeTabs.map(({ id, displayName }, index) => {
    const option = document.createElement('button');
    option.className = 'pixel-option';
    option.type = 'button';
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', String(id === selectedValue || (index === 0 && !selectedValue)));
    option.dataset.itemDropdownValue = id;
    option.textContent = displayName;
    return option;
  }));
};

const initializeOverlayScrollbars = panel => {
  const form = panel.querySelector('.workspace-item-editor-form');
  const viewport = document.createElement('div');
  viewport.className = 'workspace-item-scroll-viewport';
  form.before(viewport);
  viewport.append(form);

  const createAxis = axis => {
    const scrollbar = document.createElement('div');
    const thumb = document.createElement('div');
    scrollbar.className = `workspace-item-scrollbar workspace-item-scrollbar-${axis}`;
    scrollbar.hidden = true;
    scrollbar.setAttribute('aria-hidden', 'true');
    thumb.className = 'workspace-item-scrollbar-thumb';
    scrollbar.append(thumb);
    panel.append(scrollbar);
    return { scrollbar, thumb };
  };

  const vertical = createAxis('vertical');
  const horizontal = createAxis('horizontal');
  const axes = [
    {
      ...vertical,
      clientSize: 'clientHeight',
      scrollSize: 'scrollHeight',
      scrollOffset: 'scrollTop',
      trackSize: 'clientHeight',
      pointerPosition: 'clientY',
      rectStart: 'top',
      rectSize: 'height',
      thumbSize: 'height',
      thumbPosition: 'top',
    },
    {
      ...horizontal,
      clientSize: 'clientWidth',
      scrollSize: 'scrollWidth',
      scrollOffset: 'scrollLeft',
      trackSize: 'clientWidth',
      pointerPosition: 'clientX',
      rectStart: 'left',
      rectSize: 'width',
      thumbSize: 'width',
      thumbPosition: 'left',
    },
  ];

  const syncAxis = axis => {
    const viewportSize = viewport[axis.clientSize];
    const contentSize = viewport[axis.scrollSize];
    const hasOverflow = contentSize > viewportSize + 0.5;
    axis.scrollbar.hidden = !hasOverflow;
    if (!hasOverflow) return;

    const trackSize = axis.scrollbar[axis.trackSize];
    const artPixel = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--ycs-pixel-2x'),
    ) || 2;
    const thumbSize = Math.max(
      Math.min(trackSize, 6 * artPixel),
      trackSize * (viewportSize / contentSize),
    );
    const scrollRange = contentSize - viewportSize;
    const travel = Math.max(0, trackSize - thumbSize);
    const thumbPosition = scrollRange > 0
      ? (viewport[axis.scrollOffset] / scrollRange) * travel
      : 0;
    axis.thumb.style[axis.thumbSize] = `${thumbSize}px`;
    axis.thumb.style[axis.thumbPosition] = `${thumbPosition}px`;
  };

  const sync = () => {
    for (const axis of axes) syncAxis(axis);
  };

  for (const axis of axes) {
    let dragState = null;
    axis.scrollbar.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      syncAxis(axis);

      const trackBounds = axis.scrollbar.getBoundingClientRect();
      const thumbBounds = axis.thumb.getBoundingClientRect();
      const scrollRange = viewport[axis.scrollSize] - viewport[axis.clientSize];
      const travel = Math.max(0, trackBounds[axis.rectSize] - thumbBounds[axis.rectSize]);

      if (event.target !== axis.thumb) {
        const pointerInTrack = event[axis.pointerPosition] - trackBounds[axis.rectStart];
        const centeredPosition = pointerInTrack - (thumbBounds[axis.rectSize] / 2);
        viewport[axis.scrollOffset] = (travel > 0
          ? clamp(centeredPosition / travel, 0, 1)
          : 0) * scrollRange;
        syncAxis(axis);
        return;
      }

      dragState = {
        pointerId: event.pointerId,
        startPointer: event[axis.pointerPosition],
        startScroll: viewport[axis.scrollOffset],
        scrollRange,
        travel,
      };
      axis.scrollbar.setPointerCapture(event.pointerId);
    });

    axis.scrollbar.addEventListener('pointermove', event => {
      if (dragState?.pointerId !== event.pointerId) return;
      const pointerDelta = event[axis.pointerPosition] - dragState.startPointer;
      viewport[axis.scrollOffset] = dragState.startScroll + (dragState.travel > 0
        ? (pointerDelta / dragState.travel) * dragState.scrollRange
        : 0);
    });

    const stopDrag = event => {
      if (dragState?.pointerId === event.pointerId) dragState = null;
    };
    axis.scrollbar.addEventListener('pointerup', stopDrag);
    axis.scrollbar.addEventListener('pointercancel', stopDrag);
  }

  viewport.addEventListener('scroll', sync, { passive: true });
  const resizeObserver = new ResizeObserver(sync);
  resizeObserver.observe(panel);
  const mutationObserver = new MutationObserver(() => requestAnimationFrame(sync));
  mutationObserver.observe(form, { childList: true, subtree: true, attributes: true });
  requestAnimationFrame(sync);
  panel.syncItemEditorScrollbars = sync;
};

export const initializeItemEditorPage = ({
  host,
  template,
  workspaceTabs,
  createTab,
  removeTab,
  onItemSaved,
  onItemDeleted,
}) => {
  let nextItemNumber = 1;

  const closeDropdowns = exceptDropdown => {
    for (const dropdown of host.querySelectorAll('.workspace-item-dropdown')) {
      if (dropdown === exceptDropdown) continue;
      dropdown.querySelector('[data-item-dropdown-button]')
        ?.setAttribute('aria-expanded', 'false');
      const options = dropdown.querySelector('.workspace-item-dropdown-options');
      if (options) options.hidden = true;
    }
    for (const combobox of host.querySelectorAll('[data-item-texture-combobox]')) {
      if (combobox === exceptDropdown) continue;
      combobox.querySelector('[data-item-texture-button]')?.setAttribute('aria-expanded', 'false');
      const options = combobox.querySelector('[data-item-texture-options]');
      if (options) options.hidden = true;
    }
  };

  const checkboxState = (panel, key) => panel
    .querySelector(`[data-item-checkbox="${key}"]`)
    ?.getAttribute('aria-checked') === 'true';

  const syncConditionalFields = panel => {
    for (const row of panel.querySelectorAll('[data-item-condition]')) {
      const visible = row.dataset.itemCondition.split(',').every(rawCondition => {
        const condition = rawCondition.trim();
        const inverted = condition.startsWith('!');
        const key = inverted ? condition.slice(1) : condition;
        const checked = checkboxState(panel, key);
        return inverted ? !checked : checked;
      });
      row.hidden = !visible;
    }
    requestAnimationFrame(() => panel.syncItemEditorScrollbars?.());
  };

  const addItemWorkspace = (existingId = '') => {
    const number = nextItemNumber;
    nextItemNumber += 1;
    const panelId = `item-workspace-${number}`;
    const fragment = template.content.cloneNode(true);
    const panel = fragment.querySelector('.workspace-item-editor');
    panel.id = panelId;
    panel.dataset.dirty = 'false';
    populateCreativeTabOptions(panel);
    host.append(fragment);
    const texturesReady = populateTextureOptions(panel);
    const tabsReady = loadCreativeTabOptions().then(creativeTabs => {
      if (panel.isConnected) populateCreativeTabOptions(panel, creativeTabs);
    });
    initializeOverlayScrollbars(panel);

    const { tab, label, closeButton } = createTab({
      id: `item-workspace-tab-${number}`,
      labelText: 'New Item',
      panelId,
    });
    panel.setAttribute('aria-labelledby', tab.id);
    syncConditionalFields(panel);

    const displayNameInput = panel.querySelector('[data-item-field="displayName"]');
    displayNameInput.addEventListener('input', () => {
      const tabName = displayNameInput.value.trim() || 'New Item';
      label.textContent = tabName;
      closeButton.setAttribute('aria-label', `Close ${tabName}`);
    });
    const itemIdInput = panel.querySelector('[data-item-field="itemId"]');
    itemIdInput.addEventListener('input', () => {
      const selectionStart = itemIdInput.selectionStart;
      const valueBeforeCursor = itemIdInput.value.slice(0, selectionStart);
      const normalize = value => value
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      const normalizedValue = normalize(itemIdInput.value);
      const normalizedCursor = normalize(valueBeforeCursor).length;
      if (itemIdInput.value !== normalizedValue) {
        itemIdInput.value = normalizedValue;
        itemIdInput.setSelectionRange(normalizedCursor, normalizedCursor);
      }
    });
    if (existingId) {
      Promise.all([texturesReady, tabsReady, invoke('load_ycs_data', { category: 'items', id: existingId })])
        .then(([, , raw]) => {
          if (!panel.isConnected) return;
          const data = JSON.parse(raw);
          panel.dataset.created = 'true';
          panel.dataset.lastSavedId = existingId;
          panel.querySelector('[data-item-action="delete"]').hidden = false;
          itemIdInput.value = String(data.id || existingId);
          displayNameInput.value = String(data.displayName || '');
          displayNameInput.dispatchEvent(new Event('input', { bubbles: true }));
          panel.querySelector('[data-item-field="stackSize"]').value = String(data.stackSize ?? 64);
          const selectDropdown = (key, value) => {
            const dropdown = panel.querySelector(`[data-item-dropdown="${key}"]`);
            const option = dropdown?.querySelector(`[data-item-dropdown-value="${CSS.escape(String(value || ''))}"]`);
            const trigger = dropdown?.querySelector('[data-item-dropdown-button]');
            if (!option || !trigger) return;
            trigger.dataset.value = option.dataset.itemDropdownValue;
            trigger.querySelector('[data-item-dropdown-label]').textContent = option.textContent.trim();
            for (const sibling of option.parentElement.querySelectorAll('[role="option"]')) {
              sibling.setAttribute('aria-selected', String(sibling === option));
            }
          };
          selectDropdown('holdingMode', data.holdingMode || 'generated');
          selectDropdown('creativeTab', data.creativeTab || '');
          const textureOption = panel.querySelector(
            `[data-item-texture-value="${CSS.escape(String(data.texture || ''))}"]`,
          );
          if (textureOption) {
            const textureInput = panel.querySelector('[data-item-texture-input]');
            textureInput.value = textureOption.dataset.itemTextureLabel;
            textureInput.dataset.value = textureOption.dataset.itemTextureValue;
            textureInput.dataset.selectedLabel = textureOption.dataset.itemTextureLabel;
            textureOption.setAttribute('aria-selected', 'true');
          }
          panel.dataset.dirty = 'false';
        })
        .catch(error => {
          panel.querySelector('[data-item-status]').textContent = `Load failed: ${error}`;
        });
    }
    itemIdInput.focus();
    return tab;
  };

  const closeSavedItemWorkspaces = id => {
    if (!id) return;
    for (const panel of host.querySelectorAll('.workspace-item-editor')) {
      if (panel.dataset.lastSavedId !== id) continue;
      const tab = workspaceTabs.querySelector(`[data-workspace-panel-id="${panel.id}"]`);
      if (tab) removeTab(tab);
    }
  };

  host.addEventListener('click', async event => {
    const checkbox = event.target.closest('[data-item-checkbox]');
    if (checkbox) {
      checkbox.setAttribute(
        'aria-checked',
        String(checkbox.getAttribute('aria-checked') !== 'true'),
      );
      syncConditionalFields(checkbox.closest('.workspace-item-editor'));
      checkbox.closest('.workspace-item-editor').dataset.dirty = 'true';
      return;
    }

    const action = event.target.closest('[data-item-action]');
    if (action) {
      const panel = action.closest('.workspace-item-editor');
      const tab = workspaceTabs.querySelector(`[data-workspace-panel-id="${panel.id}"]`);
      if (action.dataset.itemAction === 'save') {
        const status = panel.querySelector('[data-item-status]');
        const itemId = panel.querySelector('[data-item-field="itemId"]').value.trim();
        const displayName = panel.querySelector('[data-item-field="displayName"]').value.trim();
        const textureInput = panel.querySelector('[data-item-texture-input]');
        const exactTextureOption = [...panel.querySelectorAll('[data-item-texture-value]')]
          .find(option => option.dataset.itemTextureLabel === textureInput.value.trim());
        const textureId = textureInput.dataset.value
          || exactTextureOption?.dataset.itemTextureValue
          || '';
        if (textureId && exactTextureOption) {
          textureInput.dataset.value = textureId;
          textureInput.dataset.selectedLabel = exactTextureOption.dataset.itemTextureLabel;
        }
        const holdingMode = panel.querySelector('[data-item-dropdown="holdingMode"] [data-item-dropdown-button]').dataset.value || 'generated';
        const creativeTab = panel.querySelector('[data-item-dropdown="creativeTab"] [data-item-dropdown-button]').dataset.value || '';
        const stackSize = Math.min(99, Math.max(1, Number.parseInt(
          panel.querySelector('[data-item-field="stackSize"]').value,
          10,
        ) || 64));
        if (!itemId || !textureId) {
          status.textContent = 'Item ID and Texture are required.';
          return;
        }
        action.disabled = true;
        status.textContent = 'Saving and injecting...';
        const previousId = panel.dataset.lastSavedId || '';
        try {
          await invoke('save_basic_item', {
            id: itemId,
            lastSavedId: panel.dataset.lastSavedId || null,
            displayName,
            textureId,
            holdingMode,
            stackSize,
            creativeTab,
          });
          panel.dataset.created = 'true';
          panel.dataset.lastSavedId = itemId;
          onItemSaved?.({
            id: itemId,
            previousId: previousId || itemId,
            displayName: displayName || itemId,
            textureId,
          });
          panel.querySelector('[data-item-action="delete"]').hidden = false;
          removeTab(tab);
        } catch (error) {
          status.textContent = `Save failed: ${error}`;
        } finally {
          action.disabled = false;
        }
        return;
      }
      if (action.dataset.itemAction === 'delete' && panel.dataset.lastSavedId) {
        const status = panel.querySelector('[data-item-status]');
        action.disabled = true;
        status.textContent = 'Removing injections...';
        try {
          await invoke('delete_basic_item', { id: panel.dataset.lastSavedId });
          onItemDeleted?.(panel.dataset.lastSavedId);
          removeTab(tab);
        } catch (error) {
          status.textContent = `Delete failed: ${error}`;
          action.disabled = false;
        }
        return;
      }
      removeTab(tab);
      return;
    }

    const textureOption = event.target.closest('[data-item-texture-value]');
    if (textureOption) {
      const combobox = textureOption.closest('[data-item-texture-combobox]');
      const input = combobox.querySelector('[data-item-texture-input]');
      const options = combobox.querySelector('[data-item-texture-options]');
      const button = combobox.querySelector('[data-item-texture-button]');
      input.value = textureOption.dataset.itemTextureLabel;
      input.dataset.value = textureOption.dataset.itemTextureValue;
      input.dataset.selectedLabel = textureOption.dataset.itemTextureLabel;
      for (const sibling of options.querySelectorAll('[role="option"]')) {
        sibling.setAttribute('aria-selected', String(sibling === textureOption));
      }
      options.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      input.focus();
      textureOption.closest('.workspace-item-editor').dataset.dirty = 'true';
      return;
    }

    const textureButton = event.target.closest('[data-item-texture-button]');
    if (textureButton) {
      const combobox = textureButton.closest('[data-item-texture-combobox]');
      const options = combobox.querySelector('[data-item-texture-options]');
      const opening = options.hidden;
      closeDropdowns(combobox);
      options.hidden = !opening;
      textureButton.setAttribute('aria-expanded', String(opening));
      if (opening) {
        filterTextureOptions(combobox);
        combobox.querySelector('[data-item-texture-input]').focus();
      }
      return;
    }

    const option = event.target.closest('[data-item-dropdown-value]');
    if (option) {
      const dropdown = option.closest('.workspace-item-dropdown');
      const trigger = dropdown.querySelector('[data-item-dropdown-button]');
      trigger.querySelector('[data-item-dropdown-label]').textContent = option.textContent.trim();
      trigger.dataset.value = option.dataset.itemDropdownValue;
      trigger.setAttribute('aria-expanded', 'false');
      option.parentElement.hidden = true;
      for (const sibling of option.parentElement.querySelectorAll('[role="option"]')) {
        sibling.setAttribute('aria-selected', String(sibling === option));
      }
      trigger.focus();
      option.closest('.workspace-item-editor').dataset.dirty = 'true';
      return;
    }

    const trigger = event.target.closest('[data-item-dropdown-button]');
    if (!trigger) return;
    const dropdown = trigger.closest('.workspace-item-dropdown');
    const options = dropdown.querySelector('.workspace-item-dropdown-options');
    const opening = options.hidden;
    closeDropdowns(dropdown);
    options.hidden = !opening;
    trigger.setAttribute('aria-expanded', String(opening));
  });

  host.addEventListener('input', event => {
    const panel = event.target.closest('.workspace-item-editor');
    if (panel) panel.dataset.dirty = 'true';
    const input = event.target.closest('[data-item-texture-input]');
    if (!input) return;
    if (input.value !== (input.dataset.selectedLabel || '')) {
      input.dataset.value = '';
      input.dataset.selectedLabel = '';
    }
    const combobox = input.closest('[data-item-texture-combobox]');
    const options = combobox.querySelector('[data-item-texture-options]');
    const button = combobox.querySelector('[data-item-texture-button]');
    options.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    filterTextureOptions(combobox);
  });

  host.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const dropdown = event.target.closest('.workspace-item-dropdown, [data-item-texture-combobox]');
    if (!dropdown) return;
    const trigger = dropdown.querySelector('[data-item-dropdown-button], [data-item-texture-input]');
    closeDropdowns();
    trigger.focus();
  });

  return { addItemWorkspace, closeSavedItemWorkspaces, closeDropdowns };
};
