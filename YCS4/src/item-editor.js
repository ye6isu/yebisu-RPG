import { invoke } from '@tauri-apps/api/core';
import {
  CREATIVE_TAB_OPTIONS,
  loadCreativeTabOptions,
} from './data/creative-tabs.js';
import { ITEM_TAG_OPTIONS } from './data/item-tags.js';

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const ITEM_NUMERIC_FIELDS = new Set([
  'attackDamage', 'attackSpeed', 'nutrition', 'saturation', 'fuel',
  'craftingCount', 'smeltingExp', 'smeltingTime', 'blastingExp', 'blastingTime',
  'smokingExp', 'smokingTime', 'campfireExp', 'campfireTime', 'stonecutCount',
]);

const textureMimeType = extension => extension === 'jpg' || extension === 'jpeg'
  ? 'image/jpeg'
  : `image/${extension}`;

const filterTextureOptions = (combobox, showAll = false) => {
  const query = combobox.querySelector('[data-item-texture-input]').value.trim().toLocaleLowerCase();
  for (const option of combobox.querySelectorAll('[data-item-texture-value]')) {
    option.hidden = !showAll && Boolean(query)
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
  const dialogLayer = document.getElementById('dialog-layer');
  const tagsDialog = document.getElementById('item-tags-dialog');
  const tagsPreview = document.getElementById('item-tags-preview');
  const tagsSearchInput = document.getElementById('item-tags-search-input');
  const tagsSearchButton = document.getElementById('item-tags-search-button');
  const tagsOptions = document.getElementById('item-tags-options');
  const statesDialog = document.getElementById('item-states-dialog');
  const statesList = document.getElementById('item-states-list');
  const statesAdd = document.getElementById('item-states-add');
  const recipeDialog = document.getElementById('item-recipe-dialog');
  const recipeDialogContent = document.getElementById('item-recipe-dialog-content');
  const authoringDialog = document.getElementById('item-authoring-dialog');
  const authoringDialogTitle = document.getElementById('item-authoring-dialog-title');
  const authoringDialogContent = document.getElementById('item-authoring-dialog-content');
  const recipeAddControl = document.getElementById('item-recipe-add-control');
  const recipeAddButton = document.getElementById('item-recipe-add');
  const recipeAddOptions = document.getElementById('item-recipe-add-options');
  let activeDialogPanel = null;
  let activeDialogAnchor = null;
  let activeAuthoringFields = null;

  const closeItemDialog = dialog => {
    if (dialog === authoringDialog && activeAuthoringFields) {
      const { fields, parent, nextSibling } = activeAuthoringFields;
      fields.hidden = true;
      parent.insertBefore(fields, nextSibling);
      activeAuthoringFields = null;
    }
    if (dialog === authoringDialog) {
      authoringDialog.classList.remove('item-tooltip-dialog');
    }
    if (dialog === recipeDialog) {
      recipeAddControl.hidden = true;
      recipeAddOptions.hidden = true;
      recipeAddButton.setAttribute('aria-expanded', 'false');
    }
    dialog.hidden = true;
    activeDialogPanel = null;
    activeDialogAnchor = null;
    if (![...dialogLayer.querySelectorAll('.floating-dialog')].some(candidate => !candidate.hidden)) {
      dialogLayer.hidden = true;
    }
  };

  const openAuthoringDialog = (panel, anchor, key, title) => {
    const fields = panel.querySelector(`[data-item-dialog-fields="${key}"]`);
    if (!fields) return;
    activeAuthoringFields = { fields, parent: fields.parentNode, nextSibling: fields.nextSibling };
    openItemDialog(authoringDialog, panel, anchor);
    authoringDialogTitle.textContent = title;
    authoringDialog.classList.toggle('item-tooltip-dialog', key === 'tooltip');
    fields.hidden = false;
    authoringDialogContent.replaceChildren(fields);
    syncConditionalFields(panel);
    positionDialogBeside(authoringDialog, anchor);
    if (key === 'tooltip') requestAnimationFrame(() => {
      resizeTooltipTextareas(fields);
      positionDialogBeside(authoringDialog, anchor);
    });
  };

  const resizeTooltipTextarea = textarea => {
    textarea.style.height = '';
    const styles = getComputedStyle(textarea);
    const borderHeight = Number.parseFloat(styles.borderTopWidth) + Number.parseFloat(styles.borderBottomWidth);
    const minimumHeight = Number.parseFloat(styles.minHeight) || 0;
    textarea.style.height = `${Math.max(minimumHeight, textarea.scrollHeight + borderHeight)}px`;
  };

  const resizeTooltipTextareas = root => {
    for (const textarea of root.querySelectorAll('.item-tooltip-textarea:not([hidden])')) {
      resizeTooltipTextarea(textarea);
    }
  };

  const recipeLabels = {
    shaped: 'Shaped Crafting', shapeless: 'Shapeless Crafting', smelting: 'Smelting',
    blasting: 'Blasting', smoking: 'Smoking', campfire: 'Campfire', stonecutting: 'Stonecutting',
  };

  const normalizeItemRecipes = value => {
    if (Array.isArray(value)) {
      return value
        .filter(recipe => recipe && typeof recipe === 'object' && typeof recipe.type === 'string')
        .map(recipe => ({ ...recipe }));
    }
    if (!value || typeof value !== 'object') return [];
    return Object.entries(value)
      .map(([type, recipe]) => ({
        ...(recipe && typeof recipe === 'object' ? recipe : {}),
        type,
      }));
  };

  const syncRecipeOptionStackPositions = () => {
    const options = [...recipeAddOptions.querySelectorAll('[data-item-recipe-type]')];
    const visibleOptions = options.filter(option => !option.hidden);
    for (const option of options) delete option.dataset.stackPosition;
    for (const [index, option] of visibleOptions.entries()) {
      option.dataset.stackPosition = visibleOptions.length === 1
        ? 'only'
        : index === 0
          ? 'first'
          : index === visibleOptions.length - 1
            ? 'last'
            : 'middle';
    }
  };

  const renderItemRecipes = () => {
    if (!activeDialogPanel || recipeDialog.hidden) return;
    const recipes = activeDialogPanel.itemRecipes || [];
    const typeNumbers = new Map();
    recipeDialogContent.replaceChildren(...recipes
      .map((recipe, index) => ({ recipe, index }))
      .filter(({ recipe }) => recipeLabels[recipe.type])
      .map(({ recipe, index }) => {
        const type = recipe.type;
        const typeNumber = (typeNumbers.get(type) || 0) + 1;
        typeNumbers.set(type, typeNumber);
        const entry = document.createElement('section');
        entry.className = 'item-recipe-entry';
        const titlebar = document.createElement('header');
        titlebar.className = 'floating-dialog-titlebar item-recipe-entry-titlebar';
        const title = document.createElement('span');
        title.className = 'floating-dialog-title';
        title.textContent = `${recipeLabels[type]} ${typeNumber}`;
        const remove = document.createElement('button');
        remove.className = 'dialogue-title-button floating-dialog-close';
        remove.type = 'button';
        remove.setAttribute('aria-label', `Remove ${recipeLabels[type]} recipe`);
        const removeIcon = document.createElement('img');
        removeIcon.src = './assets/sprite/generated/dialogue_icon_2x.png';
        removeIcon.alt = '';
        removeIcon.draggable = false;
        remove.append(removeIcon);
        remove.addEventListener('click', () => {
          activeDialogPanel.itemRecipes.splice(index, 1);
          activeDialogPanel.dataset.dirty = 'true';
          renderItemRecipes();
        });
        const body = document.createElement('div');
        body.className = 'item-recipe-entry-body';
        titlebar.append(title, remove);
        entry.append(titlebar, body);
        return entry;
      }));
    for (const option of recipeAddOptions.querySelectorAll('[data-item-recipe-type]')) option.hidden = false;
    syncRecipeOptionStackPositions();
    requestAnimationFrame(() => positionDialogBeside(recipeDialog, activeDialogAnchor));
  };

  recipeAddButton.addEventListener('click', () => {
    const open = recipeAddOptions.hidden;
    recipeAddOptions.hidden = !open;
    recipeAddButton.setAttribute('aria-expanded', String(open));
  });

  recipeAddOptions.addEventListener('click', event => {
    const option = event.target.closest('[data-item-recipe-type]');
    if (!option || !activeDialogPanel) return;
    activeDialogPanel.itemRecipes.push({ type: option.dataset.itemRecipeType });
    activeDialogPanel.dataset.dirty = 'true';
    recipeAddOptions.hidden = true;
    recipeAddButton.setAttribute('aria-expanded', 'false');
    renderItemRecipes();
  });

  const renderItemTags = () => {
    if (!activeDialogPanel) return;
    const selectedTags = activeDialogPanel.itemTags || [];
    tagsPreview.replaceChildren();
    for (const tag of selectedTags) {
      const preview = document.createElement('button');
      preview.className = 'pixel-option';
      preview.type = 'button';
      preview.textContent = tag;
      preview.setAttribute('aria-label', `Remove ${tag}`);
      preview.addEventListener('click', () => {
        activeDialogPanel.itemTags = selectedTags.filter(value => value !== tag);
        activeDialogPanel.dataset.dirty = 'true';
        renderItemTags();
      });
      tagsPreview.append(preview);
    }
    for (const option of tagsOptions.querySelectorAll('[data-item-tag-value]')) {
      const selected = selectedTags.includes(option.dataset.itemTagValue);
      option.setAttribute('aria-selected', String(selected));
      option.setAttribute('aria-pressed', String(selected));
    }
    requestAnimationFrame(() => {
      if (!tagsDialog.hidden && activeDialogAnchor) positionDialogBeside(tagsDialog, activeDialogAnchor);
    });
  };

  const loadItemTagOptions = async () => {
    const values = new Set(ITEM_TAG_OPTIONS);
    try {
      const ids = await invoke('list_ycs_data', { category: 'tags' });
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'tags', id });
          const data = JSON.parse(raw);
          values.add(String(data.tagName || data.id || id));
        } catch {}
      }
    } catch {}
    tagsOptions.replaceChildren(...[...values].sort().map(tag => {
      const option = document.createElement('button');
      option.className = 'pixel-button';
      option.type = 'button';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.setAttribute('aria-pressed', 'false');
      option.dataset.itemTagValue = tag;
      option.textContent = tag;
      return option;
    }));
    renderItemTags();
  };

  const openItemDialog = (dialog, panel, anchor) => {
    activeDialogPanel = panel;
    activeDialogAnchor = anchor;
    dialogLayer.hidden = false;
    dialog.hidden = false;
  };

  const positionDialogBeside = (dialog, anchor) => {
    if (!anchor?.isConnected || dialog.hidden) return;
    const anchorBounds = anchor.getBoundingClientRect();
    const layerBounds = dialogLayer.getBoundingClientRect();
    const uiScale = Number.parseFloat(getComputedStyle(document.getElementById('ui-shell')).zoom) || 1;
    const artPixel = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--ycs-pixel-2x'),
    ) || 1;
    const left = clamp(
      (anchorBounds.right - layerBounds.left) / uiScale + (2 * artPixel),
      0,
      Math.max(0, dialogLayer.clientWidth - dialog.offsetWidth),
    );
    const top = clamp(
      (anchorBounds.top - layerBounds.top) / uiScale,
      0,
      Math.max(0, dialogLayer.clientHeight - dialog.offsetHeight),
    );
    dialog.style.left = `${left}px`;
    dialog.style.top = `${top}px`;
    dialog.style.transform = 'none';
  };

  const closeItemDialogsOnScroll = event => {
    if (event.target instanceof Node && dialogLayer.contains(event.target)) return;
    if (!tagsDialog.hidden) closeItemDialog(tagsDialog);
    if (!statesDialog.hidden) closeItemDialog(statesDialog);
    if (!recipeDialog.hidden) closeItemDialog(recipeDialog);
    if (!authoringDialog.hidden) closeItemDialog(authoringDialog);
  };

  document.addEventListener('scroll', closeItemDialogsOnScroll, { capture: true, passive: true });
  window.addEventListener('resize', () => {
    if (!tagsDialog.hidden && activeDialogAnchor) positionDialogBeside(tagsDialog, activeDialogAnchor);
    if (!statesDialog.hidden && activeDialogAnchor) positionDialogBeside(statesDialog, activeDialogAnchor);
    if (!recipeDialog.hidden && activeDialogAnchor) positionDialogBeside(recipeDialog, activeDialogAnchor);
    if (!authoringDialog.hidden && activeDialogAnchor) positionDialogBeside(authoringDialog, activeDialogAnchor);
  }, { passive: true });

  const renderItemStates = () => {
    if (!activeDialogPanel) return;
    const states = activeDialogPanel.itemStates || [];
    statesList.replaceChildren(...states.map((state, index) => {
      const entry = document.createElement('section');
      entry.className = 'item-state-entry';
      const titlebar = document.createElement('header');
      titlebar.className = 'floating-dialog-titlebar item-state-entry-titlebar';
      const title = document.createElement('span');
      title.className = 'floating-dialog-title';
      title.textContent = `State ${index + 2}`;
      titlebar.append(title);
      const remove = document.createElement('button');
      remove.className = 'dialogue-title-button floating-dialog-close';
      remove.type = 'button';
      remove.setAttribute('aria-label', `Delete State ${index + 2}`);
      const removeIcon = document.createElement('img');
      removeIcon.src = './assets/sprite/generated/dialogue_icon_2x.png';
      removeIcon.alt = '';
      removeIcon.draggable = false;
      remove.append(removeIcon);
      remove.addEventListener('click', () => {
        activeDialogPanel.itemStates.splice(index, 1);
        activeDialogPanel.dataset.dirty = 'true';
        renderItemStates();
      });
      titlebar.append(remove);

      const body = document.createElement('div');
      body.className = 'item-state-entry-body';
      const holdingRow = document.createElement('div');
      holdingRow.className = 'workspace-item-field-row';
      const holdingLabel = document.createElement('span');
      holdingLabel.textContent = 'Holding Mode';
      const holdingDropdown = activeDialogPanel
        .querySelector('[data-item-dropdown="holdingMode"]')
        .cloneNode(true);
      holdingRow.append(holdingLabel, holdingDropdown);
      const holdingTrigger = holdingDropdown.querySelector('.workspace-item-dropdown-button');
      const holdingOptions = holdingDropdown.querySelector('.workspace-item-dropdown-options');
      const selectedHolding = holdingOptions.querySelector(
        `[data-item-dropdown-value="${CSS.escape(state.holdingMode || 'generated')}"]`,
      ) || holdingOptions.querySelector('[data-item-dropdown-value="generated"]');
      state.holdingMode = selectedHolding.dataset.itemDropdownValue;
      holdingTrigger.dataset.value = state.holdingMode;
      holdingTrigger.querySelector('[data-item-dropdown-label]').textContent = selectedHolding.textContent.trim();
      for (const option of holdingOptions.querySelectorAll('[data-item-dropdown-value]')) {
        option.setAttribute('aria-selected', String(option === selectedHolding));
        option.addEventListener('click', () => {
          state.holdingMode = option.dataset.itemDropdownValue;
          activeDialogPanel.dataset.dirty = 'true';
          renderItemStates();
        });
      }
      holdingTrigger.addEventListener('click', () => {
        const open = holdingOptions.hidden;
        for (const sibling of statesList.querySelectorAll('.item-state-entry-dropdown-open')) {
          sibling.classList.remove('item-state-entry-dropdown-open');
          sibling.querySelectorAll('[aria-expanded="true"]').forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
          sibling.querySelectorAll('.workspace-item-dropdown-options, .pixel-combobox-options').forEach(options => { options.hidden = true; });
        }
        holdingOptions.hidden = !open;
        holdingTrigger.setAttribute('aria-expanded', String(open));
        entry.classList.toggle('item-state-entry-dropdown-open', open);
      });

      const textureRow = document.createElement('div');
      textureRow.className = 'workspace-item-field-row';
      const textureLabel = document.createElement('span');
      textureLabel.textContent = 'Texture';
      const textureCombobox = activeDialogPanel
        .querySelector('[data-item-texture-combobox]')
        .cloneNode(true);
      textureRow.append(textureLabel, textureCombobox);
      const textureInput = textureCombobox.querySelector('[data-item-texture-input]');
      const textureButton = textureCombobox.querySelector('[data-item-texture-button]');
      const textureOptions = textureCombobox.querySelector('[data-item-texture-options]');
      const textureKey = state.holdingMode === '3d' ? 'geoTexture' : 'texture';
      textureInput.value = '';
      textureInput.dataset.value = '';
      textureInput.dataset.selectedLabel = '';
      for (const option of textureOptions.querySelectorAll('[data-item-texture-value]')) {
        option.hidden = false;
        const selected = option.dataset.itemTextureValue === state[textureKey];
        option.setAttribute('aria-selected', String(selected));
        option.addEventListener('click', () => {
          state[textureKey] = option.dataset.itemTextureValue;
          activeDialogPanel.dataset.dirty = 'true';
          renderItemStates();
        });
        if (selected) {
          textureInput.value = option.dataset.itemTextureLabel;
          textureInput.dataset.value = option.dataset.itemTextureValue;
          textureInput.dataset.selectedLabel = option.dataset.itemTextureLabel;
        }
      }
      textureButton.addEventListener('click', () => {
        const open = textureOptions.hidden;
        for (const sibling of statesList.querySelectorAll('.item-state-entry-dropdown-open')) {
          sibling.classList.remove('item-state-entry-dropdown-open');
          sibling.querySelectorAll('[aria-expanded="true"]').forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
          sibling.querySelectorAll('.workspace-item-dropdown-options, .pixel-combobox-options').forEach(options => { options.hidden = true; });
        }
        textureOptions.hidden = !open;
        textureButton.setAttribute('aria-expanded', String(open));
        entry.classList.toggle('item-state-entry-dropdown-open', open);
        if (open) for (const option of textureOptions.children) option.hidden = false;
      });
      textureInput.addEventListener('input', () => {
        const query = textureInput.value.trim().toLocaleLowerCase();
        textureOptions.hidden = false;
        textureButton.setAttribute('aria-expanded', 'true');
        for (const option of textureOptions.children) {
          option.hidden = Boolean(query)
            && !option.dataset.itemTextureLabel.toLocaleLowerCase().includes(query);
        }
      });
      body.append(holdingRow, textureRow);
      if (state.holdingMode === '3d') {
        const createModelRow = (label, key, accept) => {
          const row = document.createElement('div');
          row.className = 'workspace-item-field-row';
          const rowLabel = document.createElement('span');
          rowLabel.textContent = label;
          const button = document.createElement('button');
          button.className = 'pixel-button pixel-file-button';
          button.type = 'button';
          const buttonLabel = document.createElement('span');
          buttonLabel.textContent = state[key] || 'Add';
          button.append(buttonLabel);
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = accept;
          input.hidden = true;
          button.addEventListener('click', () => input.click());
          input.addEventListener('change', () => {
            const file = input.files?.[0];
            if (!file) return;
            state[key] = file.name;
            activeDialogPanel.dataset.dirty = 'true';
            renderItemStates();
          });
          row.append(rowLabel, button, input);
          return row;
        };
        body.append(
          createModelRow('Model', 'geoModel', '.json,application/json'),
          createModelRow('Display Model', 'displayModel', '.json,application/json'),
        );
      }
      entry.append(titlebar, body);
      return entry;
    }));
  };

  const closeItemStateDropdowns = exceptControl => {
    for (const entry of statesList.querySelectorAll('.item-state-entry-dropdown-open')) {
      const openControl = entry.querySelector('[aria-expanded="true"]')
        ?.closest('.workspace-item-dropdown, .pixel-combobox');
      if (exceptControl && openControl === exceptControl) continue;
      entry.classList.remove('item-state-entry-dropdown-open');
      entry.querySelectorAll('[aria-expanded="true"]').forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
      entry.querySelectorAll('.workspace-item-dropdown-options, .pixel-combobox-options').forEach(options => { options.hidden = true; });
    }
  };

  statesAdd.addEventListener('click', () => {
    if (!activeDialogPanel) return;
    activeDialogPanel.itemStates.push({
      holdingMode: 'generated', texture: '', geoTexture: '', geoModel: '', displayModel: '',
    });
    activeDialogPanel.dataset.dirty = 'true';
    renderItemStates();
  });

  tagsOptions.addEventListener('click', event => {
    const option = event.target.closest('[data-item-tag-value]');
    if (!option || !activeDialogPanel) return;
    const selectedTags = activeDialogPanel.itemTags || [];
    const tag = option.dataset.itemTagValue;
    activeDialogPanel.itemTags = selectedTags.includes(tag)
      ? selectedTags.filter(value => value !== tag)
      : [...selectedTags, tag];
    activeDialogPanel.dataset.dirty = 'true';
    renderItemTags();
  });

  const filterItemTags = () => {
    const query = tagsSearchInput.value.trim().toLocaleLowerCase();
    for (const option of tagsOptions.querySelectorAll('[data-item-tag-value]')) {
      option.hidden = Boolean(query) && !option.dataset.itemTagValue.toLocaleLowerCase().includes(query);
    }
  };
  tagsSearchInput.addEventListener('input', filterItemTags);
  tagsSearchButton.addEventListener('click', () => {
    filterItemTags();
    tagsSearchInput.focus();
  });
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

  const findItemControl = (panel, selector) => panel.querySelector(selector)
    || (activeDialogPanel === panel ? authoringDialogContent.querySelector(selector) : null);

  const checkboxState = (panel, key) => findItemControl(panel, `[data-item-checkbox="${key}"]`)
    ?.getAttribute('aria-checked') === 'true';

  const syncConditionalFields = panel => {
    const rows = [...panel.querySelectorAll('[data-item-condition]')];
    if (activeDialogPanel === panel) rows.push(...authoringDialogContent.querySelectorAll('[data-item-condition]'));
    for (const row of rows) {
      const visible = row.dataset.itemCondition.split(',').every(rawCondition => {
        const condition = rawCondition.trim();
        const inverted = condition.startsWith('!');
        const expression = inverted ? condition.slice(1) : condition;
        const [key, expectedValue] = expression.split('=', 2);
        const matches = expectedValue === undefined
          ? checkboxState(panel, key)
          : findItemControl(panel, `[data-item-dropdown="${key}"] [data-item-dropdown-button]`)
            ?.dataset.value === expectedValue;
        return inverted ? !matches : matches;
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
    panel.itemTags = [];
    panel.itemAbilitySlots = [];
    panel.itemAbilitiesEnabled = false;
    panel.itemRecipes = [];
    panel.itemStates = [];
    populateCreativeTabOptions(panel);
    host.append(fragment);
    const texturesReady = populateTextureOptions(panel);
    panel.textureOptionsReady = texturesReady;
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
          selectDropdown('toolType', data.toolType || 'sword');
          selectDropdown('toolTier', data.toolTier || 'iron');
          const savedTextureId = data.holdingMode === '3d'
            ? String(data.geoTexture || data.texture || '')
            : String(data.texture || '');
          const textureOption = panel.querySelector(
            `[data-item-texture-value="${CSS.escape(savedTextureId)}"]`,
          );
          if (textureOption) {
            const textureInput = panel.querySelector('[data-item-texture-input]');
            textureInput.value = textureOption.dataset.itemTextureLabel;
            textureInput.dataset.value = textureOption.dataset.itemTextureValue;
            textureInput.dataset.selectedLabel = textureOption.dataset.itemTextureLabel;
            textureOption.setAttribute('aria-selected', 'true');
          }
          for (const input of panel.querySelectorAll('[data-item-field]')) {
            const key = input.dataset.itemField;
            if (['itemId', 'displayName', 'stackSize'].includes(key) || data[key] === undefined || data[key] === null) continue;
            input.value = String(data[key]);
          }
          for (const key of ['geoModel', 'displayModel']) {
            const value = String(data[key] || '');
            const button = panel.querySelector(`[data-item-file-button="${key}"]`);
            const label = button?.querySelector('span');
            if (label) label.textContent = value || 'Add';
            if (value) button?.setAttribute('title', value);
          }
          for (const checkbox of panel.querySelectorAll('[data-item-checkbox]')) {
            const key = checkbox.dataset.itemCheckbox;
            checkbox.setAttribute('aria-checked', String(Boolean(data[key])));
          }
          const setField = (key, value) => {
            const input = panel.querySelector(`[data-item-field="${key}"]`);
            if (input && value !== undefined && value !== null) input.value = String(value);
          };
          const setCheckbox = (key, checked) => panel
            .querySelector(`[data-item-checkbox="${key}"]`)
            ?.setAttribute('aria-checked', String(Boolean(checked)));
          setCheckbox(
            'tooltipCustomHint',
            data.tooltipUseDefaultHint === false || Boolean(String(data.tooltipShiftHint || '').trim()),
          );
          panel.itemAbilitySlots = Array.isArray(data.itemAbilitySlots) ? [...data.itemAbilitySlots] : [];
          panel.itemAbilitiesEnabled = Boolean(data.itemAbilitiesEnabled);
          panel.itemRecipes = normalizeItemRecipes(data.recipes);
          const enabledMethods = new Set(Array.isArray(data.enabledMethods) ? data.enabledMethods : []);
          for (const method of panel.querySelectorAll('[data-item-method]')) {
            method.setAttribute('aria-checked', String(enabledMethods.has(method.dataset.itemMethod)));
          }
          panel.itemTags = Array.isArray(data.tags) ? [...data.tags] : [];
          panel.itemStates = Array.isArray(data.states) && data.states.length
            ? [...data.states]
            : [];
          syncConditionalFields(panel);
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
    const method = event.target.closest('[data-item-method]');
    if (method) {
      method.setAttribute('aria-checked', String(method.getAttribute('aria-checked') !== 'true'));
      method.closest('.workspace-item-editor').dataset.dirty = 'true';
      return;
    }
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

    const fileButton = event.target.closest('[data-item-file-button]');
    if (fileButton) {
      const panel = fileButton.closest('.workspace-item-editor');
      panel.querySelector(`[data-item-file-input="${fileButton.dataset.itemFileButton}"]`)?.click();
      return;
    }

    const dialogAction = event.target.closest('[data-item-dialog-action]');
    if (dialogAction) {
      const panel = dialogAction.closest('.workspace-item-editor');
      if (dialogAction.dataset.itemDialogAction === 'tags') {
        openItemDialog(tagsDialog, panel, dialogAction);
        tagsSearchInput.value = '';
        await loadItemTagOptions();
        filterItemTags();
        positionDialogBeside(tagsDialog, dialogAction);
        tagsSearchInput.focus();
      } else if (dialogAction.dataset.itemDialogAction === 'states') {
        openItemDialog(statesDialog, panel, dialogAction);
        await panel.textureOptionsReady;
        renderItemStates();
        positionDialogBeside(statesDialog, dialogAction);
      } else if (dialogAction.dataset.itemDialogAction === 'recipes') {
        recipeAddControl.hidden = false;
        openItemDialog(recipeDialog, panel, dialogAction);
        renderItemRecipes();
        positionDialogBeside(recipeDialog, dialogAction);
      } else if (dialogAction.dataset.itemDialogAction === 'tooltip') {
        openAuthoringDialog(panel, dialogAction, 'tooltip', 'Tooltip');
      } else if (dialogAction.dataset.itemDialogAction === 'customClass') {
        openAuthoringDialog(panel, dialogAction, 'customClass', 'Custom Class');
      }
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
        const authoringFields = {};
        for (const input of panel.querySelectorAll('[data-item-field]')) {
          const key = input.dataset.itemField;
          if (['itemId', 'displayName', 'stackSize'].includes(key)) continue;
          const rawValue = input.value.trim();
          authoringFields[key] = ITEM_NUMERIC_FIELDS.has(key)
            ? (rawValue === '' ? null : Number(rawValue))
            : rawValue;
        }
        for (const key of ['toolType', 'toolTier']) {
          const trigger = panel.querySelector(`[data-item-dropdown="${key}"] [data-item-dropdown-button]`);
          authoringFields[key] = trigger?.dataset.value || (key === 'toolType' ? 'sword' : 'iron');
        }
        for (const checkbox of panel.querySelectorAll('[data-item-checkbox]')) {
          const key = checkbox.dataset.itemCheckbox;
          if (key === 'multiState') continue;
          authoringFields[key] = checkbox.getAttribute('aria-checked') === 'true';
        }
        authoringFields.itemAbilitySlots = [...(panel.itemAbilitySlots || [])];
        authoringFields.itemAbilitiesEnabled = Boolean(panel.itemAbilitiesEnabled);
        authoringFields.recipes = (panel.itemRecipes || []).map(recipe => ({ ...recipe }));
        authoringFields.tooltipUseDefaultHint = !authoringFields.tooltipCustomHint;
        if (!authoringFields.tooltipCustomHint) authoringFields.tooltipShiftHint = '';
        delete authoringFields.tooltipCustomHint;
        authoringFields.tooltipEnabled = Boolean(
          String(authoringFields.tooltipNormal || '').trim()
          || String(authoringFields.tooltipHidden || '').trim()
          || String(authoringFields.tooltipShiftHint || '').trim(),
        );
        authoringFields.enabledMethods = [...panel.querySelectorAll('[data-item-method][aria-checked="true"]')]
          .map(methodButton => methodButton.dataset.itemMethod);
        authoringFields.geoTexture = holdingMode === '3d' ? textureId : String(authoringFields.geoTexture || '');
        authoringFields.tags = [...(panel.itemTags || [])];
        authoringFields.states = [...(panel.itemStates || [])];
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
            authoringFields,
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
        filterTextureOptions(combobox, true);
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
      syncConditionalFields(option.closest('.workspace-item-editor'));
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

  host.addEventListener('change', event => {
    const fileInput = event.target.closest('[data-item-file-input]');
    const file = fileInput?.files?.[0];
    if (!fileInput || !file) return;
    const panel = fileInput.closest('.workspace-item-editor');
    const key = fileInput.dataset.itemFileInput;
    const valueInput = panel.querySelector(`[data-item-field="${key}"]`);
    const button = panel.querySelector(`[data-item-file-button="${key}"]`);
    if (valueInput) valueInput.value = file.name;
    const label = button?.querySelector('span');
    if (label) label.textContent = file.name;
    button?.setAttribute('title', file.name);
    panel.dataset.dirty = 'true';
  });

  authoringDialog.addEventListener('click', event => {
    const method = event.target.closest('[data-item-method]');
    if (method && activeDialogPanel) {
      method.setAttribute('aria-checked', String(method.getAttribute('aria-checked') !== 'true'));
      activeDialogPanel.dataset.dirty = 'true';
      return;
    }
    const checkbox = event.target.closest('[data-item-checkbox]');
    if (!checkbox || !activeDialogPanel) return;
    checkbox.setAttribute('aria-checked', String(checkbox.getAttribute('aria-checked') !== 'true'));
    activeDialogPanel.dataset.dirty = 'true';
    syncConditionalFields(activeDialogPanel);
    requestAnimationFrame(() => {
      resizeTooltipTextareas(authoringDialog);
      if (activeDialogAnchor) positionDialogBeside(authoringDialog, activeDialogAnchor);
    });
  });

  authoringDialog.addEventListener('input', event => {
    const textarea = event.target.closest('.item-tooltip-textarea');
    if (!textarea || !activeDialogPanel) return;
    activeDialogPanel.dataset.dirty = 'true';
    resizeTooltipTextarea(textarea);
    if (activeDialogAnchor) positionDialogBeside(authoringDialog, activeDialogAnchor);
  });

  host.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const dropdown = event.target.closest('.workspace-item-dropdown, [data-item-texture-combobox]');
    if (!dropdown) return;
    const trigger = dropdown.querySelector('[data-item-dropdown-button], [data-item-texture-input]');
    closeDropdowns();
    trigger.focus();
  });

  document.addEventListener('pointerdown', event => {
    if (!statesDialog.hidden) {
      const stateControl = event.target.closest('#item-states-dialog .workspace-item-dropdown, #item-states-dialog .pixel-combobox');
      closeItemStateDropdowns(stateControl);
    }
    if (!recipeAddOptions.hidden && !event.target.closest('#item-recipe-add-control')) {
      recipeAddOptions.hidden = true;
      recipeAddButton.setAttribute('aria-expanded', 'false');
    }
    if (!tagsDialog.hidden && !event.target.closest('#item-tags-dialog, [data-item-dialog-action="tags"]')) {
      closeItemDialog(tagsDialog);
    }
    if (!statesDialog.hidden && !event.target.closest('#item-states-dialog, [data-item-dialog-action="states"]')) {
      closeItemDialog(statesDialog);
    }
    if (!recipeDialog.hidden && !event.target.closest('#item-recipe-dialog, [data-item-dialog-action="recipes"]')) {
      closeItemDialog(recipeDialog);
    }
    if (!authoringDialog.hidden && !event.target.closest('#item-authoring-dialog, [data-item-dialog-action="tooltip"], [data-item-dialog-action="customClass"]')) {
      closeItemDialog(authoringDialog);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!tagsDialog.hidden) {
      closeItemDialog(tagsDialog);
      event.stopImmediatePropagation();
    } else if (!statesDialog.hidden) {
      closeItemDialog(statesDialog);
      event.stopImmediatePropagation();
    } else if (!recipeAddOptions.hidden) {
      recipeAddOptions.hidden = true;
      recipeAddButton.setAttribute('aria-expanded', 'false');
      recipeAddButton.focus();
      event.stopImmediatePropagation();
    } else if (!recipeDialog.hidden) {
      closeItemDialog(recipeDialog);
      event.stopImmediatePropagation();
    } else if (!authoringDialog.hidden) {
      closeItemDialog(authoringDialog);
      event.stopImmediatePropagation();
    }
  });

  return { addItemWorkspace, closeSavedItemWorkspaces, closeDropdowns };
};
