import { invoke } from '@tauri-apps/api/core';
import {
  CREATIVE_TAB_OPTIONS,
  loadCreativeTabOptions,
} from './data/creative-tabs.js';
import { ITEM_TAG_OPTIONS } from './data/item-tags.js';
import {
  createIngredientCombobox,
  loadIngredientOptions,
} from './ingredient-combobox.js';
import { NODE_DEFINITIONS, YCS3_TYPE_COLORS, nodeDefinitionFor } from './node-catalog.js';

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
  setActiveTab,
  removeTab,
  onItemSaved,
  onItemDeleted,
}) => {
  const dialogLayer = document.getElementById('dialog-layer');
  const tagsDialog = document.getElementById('item-tags-dialog');
  const tagsPreview = document.getElementById('item-tags-preview');
  const tagsSearchInput = document.getElementById('item-tags-search-input');
  const tagsOptions = document.getElementById('item-tags-options');
  const statesDialog = document.getElementById('item-states-dialog');
  const statesList = document.getElementById('item-states-list');
  const statesAdd = document.getElementById('item-states-add');
  const recipeDialog = document.getElementById('item-recipe-dialog');
  const recipeDialogContent = document.getElementById('item-recipe-dialog-content');
  const authoringDialog = document.getElementById('item-authoring-dialog');
  const authoringDialogTitle = document.getElementById('item-authoring-dialog-title');
  const authoringDialogContent = document.getElementById('item-authoring-dialog-content');
  const dataComponentsAddControl = document.getElementById('item-data-components-add-control');
  const dataComponentsDeleteToggle = document.getElementById('item-data-components-delete-toggle');
  const dataComponentsAddButton = document.getElementById('item-data-components-add');
  const dataComponentsAddOptions = document.getElementById('item-data-components-add-options');
  const dataComponentsLocalTrigger = dataComponentsAddOptions.querySelector('.item-data-components-local-trigger');
  const dataComponentsLocalOptions = dataComponentsAddOptions.querySelector('.item-data-components-local-options');
  const customMethodsAddControl = document.getElementById('item-custom-methods-add-control');
  const customMethodsAddButton = document.getElementById('item-custom-methods-add');
  const customMethodsAddOptions = document.getElementById('item-custom-methods-add-options');
  const recipeAddControl = document.getElementById('item-recipe-add-control');
  const recipeAddButton = document.getElementById('item-recipe-add');
  const recipeAddOptions = document.getElementById('item-recipe-add-options');
  let activeDialogPanel = null;
  let activeDialogAnchor = null;
  let activeAuthoringFields = null;
  let globalDataComponents = [];

  const closeItemDialog = dialog => {
    if (dialog === authoringDialog && activeAuthoringFields) {
      const { fields, parent, nextSibling } = activeAuthoringFields;
      fields.hidden = true;
      parent.insertBefore(fields, nextSibling);
      activeAuthoringFields = null;
    }
    if (dialog === authoringDialog) {
      authoringDialog.classList.remove('item-tooltip-dialog');
      authoringDialog.classList.remove('item-data-components-dialog');
      authoringDialog.classList.remove('item-custom-class-dialog');
      dataComponentsAddControl.hidden = true;
      dataComponentsAddOptions.hidden = true;
      dataComponentsLocalOptions.hidden = true;
      dataComponentsAddButton.setAttribute('aria-expanded', 'false');
      dataComponentsLocalTrigger.setAttribute('aria-expanded', 'false');
      dataComponentsDeleteToggle.setAttribute('aria-pressed', 'false');
      customMethodsAddControl.hidden = true;
      customMethodsAddOptions.hidden = true;
      customMethodsAddButton.setAttribute('aria-expanded', 'false');
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
    if (!authoringDialog.hidden) closeItemDialog(authoringDialog);
    const fields = panel.querySelector(`[data-item-dialog-fields="${key}"]`);
    if (!fields) return;
    activeAuthoringFields = { fields, parent: fields.parentNode, nextSibling: fields.nextSibling };
    openItemDialog(authoringDialog, panel, anchor);
    authoringDialogTitle.textContent = title;
    authoringDialog.classList.toggle('item-tooltip-dialog', key === 'tooltip');
    authoringDialog.classList.toggle('item-data-components-dialog', key === 'dataComponents');
    authoringDialog.classList.toggle('item-custom-class-dialog', key === 'customClass');
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

  const createItemComponentBoolean = (value, onChange) => {
    const group = document.createElement('div');
    group.className = 'item-data-component-boolean';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Boolean value');
    for (const optionValue of [true, false]) {
      const button = document.createElement('button');
      button.className = 'pixel-button item-data-component-boolean-button';
      button.type = 'button';
      button.textContent = optionValue ? 'True' : 'False';
      button.setAttribute('aria-pressed', String(Boolean(value) === optionValue));
      button.addEventListener('click', () => {
        for (const peer of group.children) peer.setAttribute('aria-pressed', String(peer === button));
        onChange(optionValue);
      });
      group.append(button);
    }
    return group;
  };

  const createItemComponentValue = (type, value, onChange) => {
    if (type === 'boolean') return createItemComponentBoolean(value, onChange);
    const field = document.createElement('label');
    field.className = 'item-data-component-value-field';
    const label = document.createElement('span');
    label.textContent = type === 'string' ? 'Text value' : 'Number value';
    const input = document.createElement('input');
    input.className = 'pixel-text-box';
    input.type = type === 'double' ? 'number' : 'text';
    input.value = value ?? '';
    input.addEventListener('input', () => onChange(input.value));
    field.append(label, input);
    return field;
  };

  const createGlobalComponentDropdown = (entry, rerender) => {
    const dropdown = document.createElement('div');
    dropdown.className = 'workspace-item-dropdown item-data-component-dropdown';
    const trigger = document.createElement('button');
    trigger.className = 'pixel-option preferences-scale-select workspace-item-dropdown-button';
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const label = document.createElement('span');
    const arrow = document.createElement('span');
    arrow.className = 'preferences-scale-arrow pixel-direction-icon pixel-direction-down';
    arrow.setAttribute('aria-hidden', 'true');
    const options = document.createElement('div');
    options.className = 'preferences-scale-options pixel-option-stack workspace-item-dropdown-options item-data-component-dropdown-options';
    options.role = 'listbox';
    options.hidden = true;
    const syncLabel = () => {
      label.textContent = globalDataComponents.find(component => component.id === entry.ref)?.name || entry.ref || '(None)';
    };
    for (const component of globalDataComponents) {
      const option = document.createElement('button');
      option.className = 'pixel-option';
      option.type = 'button';
      option.role = 'option';
      option.textContent = component.name || component.id;
      option.addEventListener('click', () => {
        entry.ref = component.id;
        entry.type = component.type || 'double';
        entry.value = component.defaultValue ?? (entry.type === 'boolean' ? false : '');
        activeDialogPanel.dataset.dirty = 'true';
        rerender();
      });
      options.append(option);
    }
    trigger.addEventListener('click', () => {
      options.hidden = !options.hidden;
      trigger.setAttribute('aria-expanded', String(!options.hidden));
    });
    trigger.append(label, arrow);
    dropdown.append(trigger, options);
    syncLabel();
    return dropdown;
  };

  const renderItemDataComponents = () => {
    if (!activeDialogPanel || !activeAuthoringFields) return;
    const preview = activeAuthoringFields.fields.querySelector('.item-data-components-preview');
    if (!preview) return;
    preview.replaceChildren();
    const entries = activeDialogPanel.itemDataComponents || [];
    entries.forEach((entry, index) => {
      const row = document.createElement('div');
      row.className = 'pixel-button object-container row_container item-data-component-row';
      if (entry.kind === 'global') {
        row.append(createGlobalComponentDropdown(entry, renderItemDataComponents));
      } else {
        const name = document.createElement('input');
        name.className = 'pixel-text-box item-data-component-name';
        name.type = 'text';
        name.value = entry.name || '';
        name.placeholder = 'Name';
        name.setAttribute('aria-label', 'Local data component name');
        name.addEventListener('input', () => {
          entry.name = name.value.toLowerCase().replace(/\s/g, '_');
          activeDialogPanel.dataset.dirty = 'true';
        });
        row.append(name);
      }
      row.append(createItemComponentValue(entry.type || 'double', entry.value, value => {
        entry.value = value;
        activeDialogPanel.dataset.dirty = 'true';
      }));
      const remove = document.createElement('button');
      remove.className = 'pixel-button item-data-component-remove';
      remove.type = 'button';
      remove.hidden = dataComponentsDeleteToggle.getAttribute('aria-pressed') !== 'true';
      remove.setAttribute('aria-label', 'Remove data component');
      remove.innerHTML = '<img class="item-data-component-remove-icon" src="./assets/sprite/generated/dialogue_icon_2x.png" alt="" draggable="false" />';
      remove.addEventListener('click', () => {
        activeDialogPanel.itemDataComponents.splice(index, 1);
        activeDialogPanel.dataset.dirty = 'true';
        renderItemDataComponents();
      });
      row.append(remove);
      preview.append(row);
    });
    requestAnimationFrame(() => positionDialogBeside(authoringDialog, activeDialogAnchor));
  };

  const loadGlobalDataComponents = async () => {
    const ids = await invoke('list_ycs_data', { category: 'components' });
    globalDataComponents = (await Promise.all(ids.map(async id => {
      try { return { id, ...JSON.parse(await invoke('load_ycs_data', { category: 'components', id })) }; }
      catch { return null; }
    }))).filter(Boolean);
  };

  dataComponentsAddButton.addEventListener('click', () => {
    dataComponentsAddOptions.hidden = !dataComponentsAddOptions.hidden;
    dataComponentsAddButton.setAttribute('aria-expanded', String(!dataComponentsAddOptions.hidden));
  });
  dataComponentsDeleteToggle.addEventListener('click', () => {
    const pressed = dataComponentsDeleteToggle.getAttribute('aria-pressed') !== 'true';
    dataComponentsDeleteToggle.setAttribute('aria-pressed', String(pressed));
    for (const button of authoringDialog.querySelectorAll('.item-data-component-remove')) button.hidden = !pressed;
  });
  const showLocalOptions = show => {
    dataComponentsLocalOptions.hidden = !show;
    dataComponentsLocalTrigger.setAttribute('aria-expanded', String(show));
  };
  dataComponentsLocalTrigger.addEventListener('pointerenter', () => showLocalOptions(true));
  dataComponentsLocalTrigger.addEventListener('focus', () => showLocalOptions(true));
  dataComponentsAddOptions.addEventListener('pointerleave', () => showLocalOptions(false));
  dataComponentsAddOptions.querySelector('[data-item-component-add="global"]').addEventListener('click', () => {
    const component = globalDataComponents[0];
    activeDialogPanel.itemDataComponents.push({
      kind: 'global', ref: component?.id || '', type: component?.type || 'double', value: component?.defaultValue ?? '',
    });
    activeDialogPanel.dataset.dirty = 'true';
    dataComponentsAddOptions.hidden = true;
    dataComponentsAddButton.setAttribute('aria-expanded', 'false');
    renderItemDataComponents();
  });
  dataComponentsLocalOptions.addEventListener('click', event => {
    const option = event.target.closest('[data-item-component-local-type]');
    if (!option) return;
    const type = option.dataset.itemComponentLocalType;
    activeDialogPanel.itemDataComponents.push({ kind: 'local', name: '', type, value: type === 'boolean' ? false : '' });
    activeDialogPanel.dataset.dirty = 'true';
    dataComponentsAddOptions.hidden = true;
    dataComponentsAddButton.setAttribute('aria-expanded', 'false');
    showLocalOptions(false);
    renderItemDataComponents();
  });
  document.addEventListener('pointerdown', event => {
    if (dataComponentsAddControl.contains(event.target)) return;
    dataComponentsAddOptions.hidden = true;
    showLocalOptions(false);
    dataComponentsAddButton.setAttribute('aria-expanded', 'false');
  });

  const customMethodLabels = {
    use: 'Interaction',
    finishUsingItem: 'Finished Using',
    inventoryTick: 'Inventory Tick',
    hurtEnemy: 'Hurt Entity',
    interactLivingEntity: 'Entity Interaction',
  };

  const compileMethodGraph = (graphState, methodKey) => {
    const graph = graphState?.content;
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.connections)) return [];
    const nodes = new Map(graph.nodes.map(node => [node.id, node]));
    const safeSuffix = node => String(node.id).replace(/[^a-zA-Z0-9]/g, '').slice(-12) || 'node';
    const eventEntity = {
      use: 'player', finishUsingItem: 'livingEntity', releaseUsing: 'livingEntity',
      inventoryTick: 'entity', hurtEnemy: 'attacker', interactLivingEntity: 'player',
    }[methodKey] || 'player';
    const targetEntity = methodKey === 'hurtEnemy' ? 'target'
      : methodKey === 'interactLivingEntity' ? 'interactionTarget' : eventEntity;
    const incoming = (nodeId, pinId, type = 'data') => graph.connections.find(connection => (
      connection.to === nodeId && connection.type === type && (connection.toPin || 'input') === pinId
    ));
    const outgoing = (nodeId, pinId) => graph.connections.find(connection => (
      connection.from === nodeId && connection.type === 'flow' && (connection.fromPin || 'output') === pinId
    ));
    const numberLiteral = (value, fallback) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? String(parsed) : fallback;
    };
    const stringLiteral = value => JSON.stringify(String(value ?? ''));
    const inputValue = (node, pinId, fallback = '0') => {
      const connection = incoming(node.id, pinId);
      if (connection) return expression(connection.from, connection.fromPin || 'output', new Set());
      const definition = nodeDefinitionFor(node.kind);
      const raw = pinId === (definition.inputId || 'input') ? node.value : node.values?.[pinId];
      return numberLiteral(raw, fallback);
    };
    const expression = (nodeId, outputPin, visiting) => {
      if (visiting.has(nodeId)) return '0';
      visiting.add(nodeId);
      const node = nodes.get(nodeId);
      if (!node) return '0';
      const suffix = safeSuffix(node);
      if (node.kind === 'entity.context') {
        const context = node.value || node.opcode;
        return context === 'entity.target' ? targetEntity : context === 'aoe.iterator.entity' ? 'iteratorEntity' : eventEntity;
      }
      if (node.kind === 'logic.boolean') return node.value === false ? 'false' : 'true';
      if (node.kind === 'logic.not') return `!(${inputValue(node, 'input', 'false')})`;
      if (node.kind === 'number.literal') return numberLiteral(node.value, '0');
      if (node.kind === 'text.literal') return stringLiteral(node.value);
      if (node.kind === 'number.math') {
        const a = inputValue(node, 'a');
        const b = inputValue(node, 'b');
        const operation = node.values?.operation || '+';
        if (operation === 'min') return `Math.min((double)(${a}), (double)(${b}))`;
        if (operation === 'max') return `Math.max((double)(${a}), (double)(${b}))`;
        if (operation === 'pow') return `Math.pow((double)(${a}), (double)(${b}))`;
        const operator = ['+', '-', '*', '/', '%'].includes(operation) ? operation : '+';
        return `((${a}) ${operator} (${b}))`;
      }
      if (node.kind === 'entity.position') {
        const entityValue = inputValue(node, 'input', eventEntity);
        return `${entityValue}.get${String(outputPin || 'x').toUpperCase()}()`;
      }
      if (node.kind === 'entity.look_dir') {
        const entityValue = inputValue(node, 'input', eventEntity);
        const axis = String(outputPin || 'x').toLowerCase();
        return `${entityValue}.getLookAngle().${axis}`;
      }
      if (node.kind === 'entity.get_health') {
        const entityValue = inputValue(node, 'input', eventEntity);
        return `(${entityValue} instanceof LivingEntity living_${suffix} ? living_${suffix}.getHealth() : 0.0)`;
      }
      if (node.kind === 'entity.is_crouching') return `${inputValue(node, 'input', eventEntity)}.isCrouching()`;
      if (node.kind === 'entity.is_dashing') return `DashUtil.isDashing(${inputValue(node, 'input', eventEntity)})`;
      return '0';
    };
    const compileFlow = (nodeId, visiting = new Set()) => {
      if (!nodeId || visiting.has(nodeId)) return [];
      const node = nodes.get(nodeId);
      if (!node || node.start) return [];
      const nextVisiting = new Set(visiting).add(nodeId);
      if (node.kind === 'control.if') {
        const count = Math.max(1, Number(node.conditionCount) || 1);
        const lines = [];
        for (let index = 0; index < count; index += 1) {
          const pinId = index === 0 ? 'condition' : `condition-${index}`;
          const condition = incoming(node.id, pinId);
          const conditionValue = condition ? expression(condition.from, condition.fromPin || 'output', new Set()) : 'false';
          lines.push(`${index === 0 ? 'if' : 'else if'} (${conditionValue}) {`);
          const branch = outgoing(node.id, `if-${index}`);
          lines.push(...compileFlow(branch?.to, nextVisiting).map(line => `    ${line}`));
          lines.push('}');
        }
        const elseBranch = outgoing(node.id, 'else');
        if (elseBranch) {
          lines[lines.length - 1] += ' else {';
          lines.push(...compileFlow(elseBranch.to, nextVisiting).map(line => `    ${line}`));
          lines.push('}');
        }
        const continuation = outgoing(node.id, 'then');
        return [...lines, ...compileFlow(continuation?.to, nextVisiting)];
      }
      const entityInput = pin => {
        const connection = incoming(node.id, pin);
        return connection ? expression(connection.from, connection.fromPin || 'output', new Set()) : eventEntity;
      };
      const suffix = safeSuffix(node);
      let lines = [];
      if (node.kind === 'effect.apply') {
        const entityValue = entityInput('entity');
        lines = [`if (!level.isClientSide() && ${entityValue} instanceof LivingEntity living_${suffix}) { living_${suffix}.addEffect(new MobEffectInstance(MobEffects.REGENERATION, (int)(${inputValue(node, 'duration', '0')}), Math.max(0, (int)(${inputValue(node, 'level', '0')}) - 1), false, true)); }`];
      } else if (node.kind === 'entity.set_health') {
        const entityValue = entityInput('entity');
        lines = [`if (!level.isClientSide() && ${entityValue} instanceof LivingEntity living_${suffix}) { living_${suffix}.setHealth((float)Math.max(0.0, Math.min(living_${suffix}.getMaxHealth(), ${inputValue(node, 'amount', '20')}))); }`];
      } else if (node.kind === 'entity.apply_motion') {
        const entityValue = entityInput('entity');
        const mode = node.values?.mode || node.settings?.mode || 'add';
        lines = mode === 'set'
          ? [`if (!level.isClientSide()) { ${entityValue}.setDeltaMovement(${inputValue(node, 'x')}, ${inputValue(node, 'y')}, ${inputValue(node, 'z')}); ${entityValue}.hurtMarked = true; }`]
          : [`if (!level.isClientSide()) { ${entityValue}.push(${inputValue(node, 'x')}, ${inputValue(node, 'y')}, ${inputValue(node, 'z')}); }`];
      } else if (node.kind === 'projectile.fire') {
        lines = [`ProjectileUtil.fire(${entityInput('entity')}, "minecraft:arrow", ${inputValue(node, 'x')}, ${inputValue(node, 'y')}, ${inputValue(node, 'z')}, (float)(${inputValue(node, 'power', '1.5')}));`];
      } else if (node.kind === 'entity.dash') {
        const easing = ['LINEAR', 'EASE_IN', 'EASE_OUT', 'EASE_IN_OUT'].includes(node.values?.easing)
          ? node.values.easing
          : 'LINEAR';
        lines = [`DashUtil.start(${entityInput('entity')}, ${inputValue(node, 'x')}, ${inputValue(node, 'y')}, ${inputValue(node, 'z')}, ${inputValue(node, 'distance', '10')}, (int)(${inputValue(node, 'ticks', '5')}), DashUtil.Easing.${easing}, null, null, "sphere", 1.5, 0, 0, false);`];
      } else if (node.kind === 'entity.deal_damage') {
        const target = entityInput('target');
        const attacker = entityInput('attacker');
        lines = [`if (!level.isClientSide() && ${target} instanceof LivingEntity target_${suffix} && ${attacker} instanceof LivingEntity attacker_${suffix}) { target_${suffix}.hurt(target_${suffix}.level().damageSources().mobAttack(attacker_${suffix}), (float)(${inputValue(node, 'amount', '1')})); }`];
      }
      const next = outgoing(node.id, 'output');
      return [...lines, ...compileFlow(next?.to, nextVisiting)];
    };
    const start = graph.nodes.find(node => node.start);
    return compileFlow(outgoing(start?.id, 'output')?.to);
  };
  const useAnimationOptions = ['NONE', 'EAT', 'DRINK', 'BLOCK', 'BOW', 'SPEAR', 'CROSSBOW', 'SPYGLASS', 'TOOT_HORN', 'BRUSH'];

  const closeCustomMethodEditor = panel => {
    panel.querySelector(':scope > .item-custom-method-editor')?.remove();
    const itemViewport = panel.querySelector(':scope > .workspace-item-scroll-viewport');
    if (itemViewport) itemViewport.hidden = false;
  };

  const openCustomMethodEditor = (panel, methodKey, label) => {
    closeItemDialog(authoringDialog);
    closeCustomMethodEditor(panel);
    const itemViewport = panel.querySelector(':scope > .workspace-item-scroll-viewport');
    if (itemViewport) itemViewport.hidden = true;
    const itemId = panel.dataset.lastSavedId
      || panel.querySelector('[data-item-field="itemId"]')?.value.trim()
      || panel.id;
    const storageKey = `ycs4.method-editor::item::${itemId}::${methodKey}`;
    let savedState = { version: 1, method: methodKey, content: null };
    const methodRecord = panel.itemCustomMethods?.find(method => method.key === methodKey)
      || (['continuousUse', 'releaseUsing'].includes(methodKey)
        ? panel.itemCustomMethods?.find(method => method.key === 'use')
        : null);
    try {
      savedState = {
        ...savedState,
        ...(methodRecord?.graphs?.[methodKey]
          || (methodRecord?.key === methodKey ? methodRecord?.graph : null)
          || JSON.parse(localStorage.getItem(storageKey) || '{}')),
      };
    } catch {}
    const draftState = structuredClone(savedState);

    const editor = document.createElement('section');
    editor.className = 'item-custom-method-editor';
    editor.dataset.methodKey = methodKey;
    const header = document.createElement('header');
    header.className = 'workspace-top-controls item-custom-method-editor-header';
    const title = document.createElement('span');
    title.className = 'workspace-top-controls-left item-custom-method-editor-title';
    title.textContent = label;
    const actions = document.createElement('div');
    actions.className = 'workspace-item-actions';
    const cancel = document.createElement('button');
    cancel.className = 'pixel-button workspace-item-action-button';
    cancel.type = 'button';
    cancel.setAttribute('aria-label', 'Cancel method');
    cancel.innerHTML = '<span class="workspace-file-icon workspace-file-icon-cancel" aria-hidden="true"></span>';
    const save = document.createElement('button');
    save.className = 'pixel-button workspace-item-action-button';
    save.type = 'button';
    save.setAttribute('aria-label', 'Save method');
    save.innerHTML = '<span class="workspace-file-icon workspace-file-icon-save" aria-hidden="true"></span>';
    cancel.addEventListener('click', () => closeCustomMethodEditor(panel));
    save.addEventListener('click', () => {
      if (methodRecord) {
        methodRecord.graphs = { ...(methodRecord.graphs || {}), [methodKey]: structuredClone(draftState) };
        if (methodRecord.key === methodKey) methodRecord.graph = structuredClone(draftState);
      }
      panel.dataset.dirty = 'true';
      closeCustomMethodEditor(panel);
    });
    actions.append(cancel, save);
    header.append(title, actions);
    const content = document.createElement('div');
    content.className = 'workspace-inner-container item-custom-method-editor-content';
    content.dataset.methodEditorContent = '';
    content.methodEditorDraft = draftState;
    const graph = draftState.content && typeof draftState.content === 'object'
      ? draftState.content
      : (draftState.content = { nodes: [] });
    if (!Array.isArray(graph.nodes)) graph.nodes = [];
    if (!graph.nodes.some(node => node.start)) {
      graph.nodes.unshift({ id: '__method_start__', start: true, x: 24, y: 24, color: '#7a7a7a' });
    }
    if (!Array.isArray(graph.connections)) graph.connections = [];
    graph.nodes = graph.nodes
      .filter(node => ![
        'get-number', 'test',
        'entity.part_hit_name', 'entity.part_hit_damage',
      ].includes(node.kind))
      .map(node => {
        if (['entity.event', 'entity.target', 'aoe.iterator.entity'].includes(node.kind)) {
          return { ...node, kind: 'entity.context', value: node.kind };
        }
        if (node.kind === 'logic.true' || node.kind === 'logic.false') {
          return { ...node, kind: 'logic.boolean', value: node.kind === 'logic.true' };
        }
        return node;
      });
    const existingNodeIds = new Set(graph.nodes.map(node => node.id));
    graph.connections = graph.connections.map(connection => ({ type: 'data', dataType: 'number', ...connection }));
    graph.connections = graph.connections.filter((connection, index, connections) => (
      existingNodeIds.has(connection.from)
      && existingNodeIds.has(connection.to)
      && connections.findIndex(candidate => candidate.to === connection.to && candidate.type === connection.type && (candidate.toPin || 'input') === (connection.toPin || 'input')) === index
      && (connection.type !== 'flow'
        || connections.findIndex(candidate => candidate.from === connection.from && candidate.type === 'flow' && (candidate.fromPin || 'output') === (connection.fromPin || 'output')) === index)
    ));
    let selectedNodeId = null;
    const selectedNodeIds = new Set();
    let selectedConnectionId = null;
    let selectedPin = null;
    let activeWireDrag = null;
    let nextNodeLayer = Math.max(0, ...graph.nodes.map(node => Number(node.layer) || 0)) + 1;
    let lastCanvasPoint = { x: 48, y: 48 };
    const graphView = { x: 0, y: 0, scale: 1 };
    const graphZoomLevels = [0.5, 1, 1.5, 2, 2.5];
    const snapScreenPixel = value => {
      const density = Math.max(1, window.devicePixelRatio || 1);
      return Math.round(value * density) / density;
    };
    const pinCenter = pin => {
      const pinBounds = pin.getBoundingClientRect();
      const contentBounds = content.getBoundingClientRect();
      return {
        x: (pinBounds.left + (pinBounds.width / 2) - contentBounds.left) * (content.clientWidth / contentBounds.width),
        y: (pinBounds.top + (pinBounds.height / 2) - contentBounds.top) * (content.clientHeight / contentBounds.height),
      };
    };
    const connectionPath = (start, end) => {
      const direction = end.x >= start.x ? 1 : -1;
      const bend = Math.max(24, Math.abs(end.x - start.x) * 0.5);
      return `M ${start.x} ${start.y} C ${start.x + (bend * direction)} ${start.y}, ${end.x - (bend * direction)} ${end.y}, ${end.x} ${end.y}`;
    };
    const nearestCompatiblePin = (sourcePin, clientX, clientY) => {
      let nearest = null;
      let nearestDistance = 28;
      for (const candidate of content.querySelectorAll('.method-test-node-pin')) {
        if (
          candidate === sourcePin
          || candidate.dataset.pinKind === sourcePin.dataset.pinKind
          || candidate.dataset.pinType !== sourcePin.dataset.pinType
          || (candidate.dataset.pinType === 'data' && candidate.dataset.pinDataType !== sourcePin.dataset.pinDataType)
          || candidate.closest('.method-test-node') === sourcePin.closest('.method-test-node')
        ) continue;
        const bounds = candidate.getBoundingClientRect();
        const distance = Math.hypot(clientX - (bounds.left + bounds.width / 2), clientY - (bounds.top + bounds.height / 2));
        if (distance < nearestDistance) {
          nearest = candidate;
          nearestDistance = distance;
        }
      }
      return nearest;
    };
    const updateTestConnections = () => {
      const wireLayer = content.querySelector('.method-test-node-wires');
      if (!wireLayer) return;
      for (const connection of graph.connections) {
        const output = content.querySelector(`[data-node-id="${connection.from}"] .method-test-node-pin-${connection.type}-output[data-pin-id="${connection.fromPin || 'output'}"]`);
        const input = content.querySelector(`[data-node-id="${connection.to}"] .method-test-node-pin-${connection.type}-input[data-pin-id="${connection.toPin || 'input'}"]`);
        const group = wireLayer.querySelector(`[data-connection-id="${connection.id}"]`);
        if (!output || !input || !group) continue;
        const path = connectionPath(pinCenter(output), pinCenter(input));
        for (const element of group.querySelectorAll('path')) element.setAttribute('d', path);
      }
    };
    const openConnectedNodeSearch = drag => {
      content.querySelector('.method-node-search')?.remove();
      drag.searchOpen = true;
      const search = document.createElement('section');
      search.className = 'floating-dialog method-node-search';
      const contentBounds = content.getBoundingClientRect();
      const layoutScale = content.clientWidth ? contentBounds.width / content.clientWidth : 1;
      const physicalScale = Math.max(1, window.devicePixelRatio * layoutScale);
      const snapPosition = value => Math.round(value * physicalScale) / physicalScale;
      search.style.left = `${snapPosition(drag.pointer.x)}px`;
      search.style.top = `${snapPosition(drag.pointer.y)}px`;
      const titlebar = document.createElement('header');
      titlebar.className = 'floating-dialog-titlebar method-node-search-titlebar';
      const input = document.createElement('input');
      input.className = 'pixel-text-box method-node-search-input';
      input.type = 'text';
      input.placeholder = 'Search nodes';
      input.setAttribute('aria-label', 'Search nodes');
      titlebar.append(input);
      const bodyHost = document.createElement('div');
      bodyHost.className = 'floating-dialog-body-scroll-host method-node-search-body-host';
      const options = document.createElement('div');
      options.className = 'floating-dialog-body pixel-option-stack method-node-search-options';
      const acceptsDefinition = definition => {
        if (drag.direction === 'standalone') return true;
        if (drag.direction === 'insert') {
          return drag.connection.type === 'flow'
            ? definition.flow
            : definition.inputType === drag.connection.dataType && definition.outputType === drag.connection.dataType;
        }
        if (drag.type === 'flow') return definition.flow;
        return drag.direction === 'outgoing'
          ? definition.inputType === drag.dataType || definition.inputs?.some(input => input.type === drag.dataType)
          : definition.outputType === drag.dataType;
      };
      let filteredDefinitions = [...NODE_DEFINITIONS];
      let resultOffset = 0;
      const optionButtons = Array.from({ length: 5 }, (_, index) => {
        const button = document.createElement('button');
        button.className = 'pixel-option preferences-scale-option';
        button.type = 'button';
        button.dataset.stackPosition = index === 0 ? 'first' : index === 4 ? 'last' : 'middle';
        return button;
      });
      const syncOption = () => {
        const query = input.value.trim().toLowerCase();
        filteredDefinitions = NODE_DEFINITIONS.filter(definition => definition.label.toLowerCase().includes(query));
        resultOffset = Math.min(resultOffset, Math.max(0, filteredDefinitions.length - 5));
        optionButtons.forEach((button, index) => {
          const definition = filteredDefinitions[resultOffset + index];
          button.textContent = definition?.label || '';
          button.disabled = !definition;
          button.dataset.definitionIndex = definition ? String(resultOffset + index) : '';
        });
      };
      syncOption();
      input.addEventListener('input', () => { resultOffset = 0; syncOption(); });
      input.addEventListener('keydown', event => {
        const firstVisibleOption = optionButtons.find(candidate => !candidate.disabled);
        if (event.key === 'Enter' && firstVisibleOption) {
          event.preventDefault();
          firstVisibleOption.click();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          activeWireDrag?.preview?.remove();
          activeWireDrag = null;
          search.remove();
          editor.focus({ preventScroll: true });
        }
      });
      for (const button of optionButtons) button.addEventListener('click', () => {
        const definition = filteredDefinitions[Number(button.dataset.definitionIndex)];
        if (!definition) return;
        const definitionInputPin = drag.type === 'flow'
          ? 'input'
          : (definition.inputType === drag.dataType
            ? (definition.inputId || 'input')
            : (definition.inputs?.find(input => input.type === drag.dataType)?.id || 'input'));
        const definitionOutputPin = definition.kind === 'control.if'
          ? 'then'
          : (definition.outputs?.[0]?.id || 'output');
        const node = {
          id: crypto.randomUUID(),
          kind: definition.kind,
          opcode: definition.opcode,
          x: (drag.pointer.x - graphView.x) / graphView.scale,
          y: (drag.pointer.y - graphView.y) / graphView.scale,
          color: definition.color,
          value: definition.field?.default,
          values: Object.fromEntries((definition.inputs || []).map(input => [input.id, input.default ?? ''])),
          settings: { ...(definition.defaults || {}) },
        };
        graph.nodes.push(node);
        const canAttach = acceptsDefinition(definition);
        if (canAttach && drag.direction === 'insert') {
          graph.connections = graph.connections.filter(connection => connection.id !== drag.connection.id);
          graph.connections.push(
            { id: crypto.randomUUID(), type: drag.connection.type, dataType: drag.connection.dataType, from: drag.connection.from, to: node.id, fromPin: drag.connection.fromPin || 'output', toPin: definitionInputPin },
            { id: crypto.randomUUID(), type: drag.connection.type, dataType: drag.connection.dataType, from: node.id, to: drag.connection.to, fromPin: definitionOutputPin, toPin: drag.connection.toPin || 'input' },
          );
        } else if (canAttach && drag.direction === 'outgoing') {
          if (drag.type === 'flow') graph.connections = graph.connections.filter(connection => connection.from !== drag.nodeId || connection.type !== drag.type || (connection.fromPin || 'output') !== (drag.pinId || 'output'));
          graph.connections.push({ id: crypto.randomUUID(), type: drag.type, dataType: drag.dataType, from: drag.nodeId, to: node.id, fromPin: drag.pinId || 'output', toPin: definitionInputPin });
        } else if (canAttach && drag.direction === 'incoming') {
          graph.connections = graph.connections.filter(connection => connection.to !== drag.nodeId || connection.type !== drag.type);
          graph.connections.push({ id: crypto.randomUUID(), type: drag.type, dataType: drag.dataType, from: node.id, to: drag.nodeId, fromPin: definitionOutputPin, toPin: drag.pinId || 'input' });
        }
        activeWireDrag = null;
        renderTestNodes();
        editor.focus({ preventScroll: true });
      });
      options.append(...optionButtons);
      options.addEventListener('wheel', event => {
        event.preventDefault();
        resultOffset = Math.max(0, Math.min(Math.max(0, filteredDefinitions.length - 5), resultOffset + Math.sign(event.deltaY)));
        syncOption();
      }, { passive: false });
      bodyHost.append(options);
      search.append(titlebar, bodyHost);
      content.append(search);
      const closeSearchOnOutside = event => {
        if (search.contains(event.target)) return;
        search.remove();
        activeWireDrag?.preview?.remove();
        activeWireDrag = null;
        document.removeEventListener('pointerdown', closeSearchOnOutside, true);
      };
      requestAnimationFrame(() => document.addEventListener('pointerdown', closeSearchOnOutside, true));
      input.focus({ preventScroll: true });
    };
    const renderTestNodes = () => {
      const activeNodeIds = new Set(graph.nodes.filter(node => node.start).map(node => node.id));
      let activatedAnotherNode = true;
      while (activatedAnotherNode) {
        activatedAnotherNode = false;
        for (const connection of graph.connections) {
          if (connection.type === 'flow' && activeNodeIds.has(connection.from) && !activeNodeIds.has(connection.to)) {
            activeNodeIds.add(connection.to);
            activatedAnotherNode = true;
          }
        }
      }
      const wireLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      wireLayer.classList.add('method-test-node-wires');
      for (const connection of graph.connections) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.dataset.connectionId = connection.id;
        group.classList.add(`method-test-connection-${connection.type}`);
        group.style.setProperty('--ycs-connection-color', connection.type === 'flow'
          ? 'white'
          : (YCS3_TYPE_COLORS[connection.dataType] || 'white'));
        group.classList.toggle('method-test-connection-selected', connection.id === selectedConnectionId);
        const visiblePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        visiblePath.classList.add('method-test-connection-line');
        const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hitPath.classList.add('method-test-connection-hit');
        hitPath.addEventListener('pointerdown', event => {
          event.stopPropagation();
          selectedNodeId = null;
          selectedPin = null;
          selectedConnectionId = connection.id;
          renderTestNodes();
          editor.focus({ preventScroll: true });
        });
        hitPath.addEventListener('contextmenu', event => {
          event.preventDefault();
          event.stopPropagation();
          graph.connections = graph.connections.filter(candidate => candidate.id !== connection.id);
          selectedConnectionId = null;
          renderTestNodes();
        });
        group.append(visiblePath, hitPath);
        wireLayer.append(group);
      }
      const nodeElements = graph.nodes.map(node => {
        const definition = node.start ? null : nodeDefinitionFor(node.kind);
        const element = document.createElement('article');
        element.className = 'method-test-node';
        element.classList.toggle('method-test-node-start', Boolean(node.start));
        element.classList.toggle('method-test-node-data-only', Boolean(definition && !definition.flow));
        element.classList.toggle('method-test-node-output-only', Boolean(definition && !definition.inputType));
        element.classList.toggle('method-test-node-compact', Boolean(node.start || definition?.compact));
        element.classList.toggle('method-test-node-inactive', Boolean(definition?.flow && !activeNodeIds.has(node.id)));
        element.dataset.nodeId = node.id;
        element.style.left = `${snapScreenPixel(graphView.x + (node.x * graphView.scale))}px`;
        element.style.top = `${snapScreenPixel(graphView.y + (node.y * graphView.scale))}px`;
        element.style.zIndex = String(Number(node.layer) || 1);
        element.style.transform = `scale(${graphView.scale})`;
        element.style.transformOrigin = 'top left';
        element.style.setProperty('--ycs-node-title-tint', definition?.color || node.color || '#687f9b');
        element.classList.toggle('method-test-node-selected', selectedNodeIds.has(node.id));
        const nodeTitle = document.createElement('header');
        nodeTitle.className = 'method-test-node-title';
        const nodeTitleText = document.createElement('span');
        nodeTitleText.className = 'floating-dialog-title';
        nodeTitleText.textContent = node.start ? 'Execute' : definition.label;
        nodeTitle.append(nodeTitleText);
        const nodeBody = document.createElement('div');
        nodeBody.className = 'method-test-node-body';
        const flowRow = document.createElement('div');
        flowRow.className = 'method-test-node-connection-row method-test-node-flow-row';
        const flowInput = document.createElement('span');
        flowInput.className = 'method-test-node-pin method-test-node-pin-input method-test-node-pin-flow-input';
        flowInput.dataset.pinKind = 'input';
        flowInput.dataset.pinType = 'flow';
        flowInput.dataset.pinId = 'input';
        const flowInputLabel = Object.assign(document.createElement('span'), { className: 'method-test-node-input-label', textContent: 'Execute' });
        const flowOutputLabel = Object.assign(document.createElement('span'), { className: 'method-test-node-output-label', textContent: 'Then' });
        const flowOutput = document.createElement('span');
        flowOutput.className = 'method-test-node-pin method-test-node-pin-output method-test-node-pin-flow-output';
        flowOutput.dataset.pinKind = 'output';
        flowOutput.dataset.pinType = 'flow';
        flowOutput.dataset.pinId = 'output';
        const flowLeft = document.createElement('div');
        flowLeft.className = 'method-test-node-row-side method-test-node-row-left';
        flowLeft.append(flowInputLabel);
        flowLeft.hidden = node.start;
        const flowRight = document.createElement('div');
        flowRight.className = 'method-test-node-row-side method-test-node-row-right';
        flowRight.append(flowOutputLabel);
        flowRow.append(flowInput, flowLeft, flowRight, flowOutput);
        const connectionRow = document.createElement('div');
        connectionRow.className = 'method-test-node-connection-row method-test-node-data-row';
        const inputPin = document.createElement('span');
        inputPin.className = 'method-test-node-pin method-test-node-pin-input method-test-node-pin-data-input';
        inputPin.dataset.pinKind = 'input';
        inputPin.dataset.pinType = 'data';
        inputPin.dataset.pinId = definition?.inputId || 'input';
        inputPin.dataset.pinDataType = definition?.inputType || '';
        inputPin.style.setProperty('--ycs-pin-color', YCS3_TYPE_COLORS[definition?.inputType] || 'white');
        const inputLabel = document.createElement('span');
        inputLabel.className = 'method-test-node-input-label';
        inputLabel.textContent = definition?.inputLabel || 'Input';
        const valueField = definition?.field?.type === 'boolean' || definition?.field?.type === 'select'
          ? document.createElement('div')
          : document.createElement('input');
        valueField.className = definition?.field?.type === 'boolean'
          ? 'data-inline-boolean-toggle method-test-node-boolean-toggle'
          : definition?.field?.type === 'select'
            ? 'workspace-item-dropdown method-test-node-dropdown'
            : 'pixel-text-box method-test-node-value';
        if (valueField instanceof HTMLInputElement) valueField.type = definition?.field?.type || 'number';
        if (definition?.field?.type === 'select') {
          node.value = node.value ?? definition.field.default;
          const trigger = document.createElement('button');
          trigger.className = 'pixel-option preferences-scale-select workspace-item-dropdown-button method-test-node-dropdown-button';
          trigger.type = 'button';
          trigger.setAttribute('aria-expanded', 'false');
          const selectedLabel = document.createElement('span');
          const syncSelectedLabel = () => {
            selectedLabel.textContent = definition.field.options.find(choice => choice.value === node.value)?.label || '';
          };
          const arrow = document.createElement('span');
          arrow.className = 'preferences-scale-arrow pixel-direction-icon pixel-direction-down';
          const dropdownOptions = document.createElement('div');
          dropdownOptions.className = 'pixel-option-stack preferences-scale-options workspace-item-dropdown-options method-test-node-dropdown-options';
          dropdownOptions.hidden = true;
          for (const choice of definition.field.options) {
            const option = document.createElement('button');
            option.className = 'pixel-option preferences-scale-option';
            option.type = 'button';
            option.textContent = choice.label;
            option.addEventListener('click', event => {
              event.stopPropagation();
              node.value = choice.value;
              node.opcode = choice.value;
              syncSelectedLabel();
              dropdownOptions.hidden = true;
              trigger.setAttribute('aria-expanded', 'false');
              element.classList.remove('method-test-node-dropdown-open');
            });
            dropdownOptions.append(option);
          }
          trigger.addEventListener('click', event => {
            event.stopPropagation();
            dropdownOptions.hidden = !dropdownOptions.hidden;
            trigger.setAttribute('aria-expanded', String(!dropdownOptions.hidden));
            element.classList.toggle('method-test-node-dropdown-open', !dropdownOptions.hidden);
          });
          syncSelectedLabel();
          trigger.append(selectedLabel, arrow);
          valueField.append(trigger, dropdownOptions);
        }
        if (definition?.field?.type === 'boolean') {
          node.value = typeof node.value === 'boolean' ? node.value : definition.field.default;
          for (const booleanValue of [true, false]) {
            const toggle = document.createElement('button');
            toggle.className = 'pixel-button data-inline-boolean-button method-test-node-boolean-button';
            toggle.type = 'button';
            toggle.textContent = booleanValue ? 'True' : 'False';
            toggle.setAttribute('aria-pressed', String(node.value === booleanValue));
            toggle.addEventListener('click', event => {
              event.stopPropagation();
              node.value = booleanValue;
              node.opcode = booleanValue ? 'logic.true' : 'logic.false';
              for (const peer of valueField.children) peer.setAttribute('aria-pressed', String(peer === toggle));
            });
            valueField.append(toggle);
          }
        } else {
          valueField.value = String(node.value ?? definition?.field?.default ?? '');
        }
        valueField.hidden = !definition?.field
          || Boolean(definition?.field?.hideWhenConnected && graph.connections.some(connection => (
            connection.to === node.id
            && connection.type === 'data'
            && (connection.toPin || 'input') === (definition.inputId || 'input')
          )));
        valueField.setAttribute('aria-label', definition?.field?.type === 'select' ? 'Entity type' : definition?.field?.type === 'boolean' ? 'Boolean value' : definition?.field?.type === 'text' ? 'Text value' : 'Number value');
        valueField.addEventListener('input', () => {
          node.value = valueField.value;
          if (definition?.kind === 'entity.context') node.opcode = valueField.value;
        });
        valueField.addEventListener('pointerdown', event => event.stopPropagation());
        const outputLabel = document.createElement('span');
        outputLabel.className = 'method-test-node-output-label';
        const primaryOutput = definition?.outputs?.[0];
        outputLabel.textContent = primaryOutput?.label || definition?.outputLabel || 'Return';
        const outputPin = document.createElement('span');
        outputPin.className = 'method-test-node-pin method-test-node-pin-output method-test-node-pin-data-output';
        outputPin.dataset.pinKind = 'output';
        outputPin.dataset.pinType = 'data';
        outputPin.dataset.pinId = primaryOutput?.id || 'output';
        outputPin.dataset.pinDataType = primaryOutput?.type || definition?.outputType || '';
        outputPin.style.setProperty('--ycs-pin-color', YCS3_TYPE_COLORS[outputPin.dataset.pinDataType] || 'white');
        inputPin.hidden = !definition?.inputType;
        inputLabel.hidden = !definition?.inputType;
        outputPin.hidden = !definition?.outputType;
        outputLabel.hidden = !definition?.outputType;
        const dataLeft = document.createElement('div');
        dataLeft.className = 'method-test-node-row-side method-test-node-row-left';
        dataLeft.append(inputLabel, valueField);
        dataLeft.hidden = inputLabel.hidden && valueField.hidden;
        const dataRight = document.createElement('div');
        dataRight.className = 'method-test-node-row-side method-test-node-row-right';
        dataRight.append(outputLabel);
        dataRight.hidden = outputLabel.hidden;
        const ifInputPins = [];
        const ifOutputPins = [];
        const ifRows = [];
        let ifElseRow = null;
        if (definition?.kind === 'control.if') {
          node.conditionCount = Math.max(1, Number(node.conditionCount) || 1);
          flowOutput.dataset.pinId = 'then';
          const branchLabel = index => index === 0 ? 'If' : `If Else ${index + 1}`;
          const addBranchOutput = (row, right, index) => {
            const label = document.createElement('span');
            label.className = 'method-test-node-output-label';
            label.textContent = branchLabel(index);
            const pin = document.createElement('span');
            pin.className = 'method-test-node-pin method-test-node-pin-output method-test-node-pin-flow-output';
            pin.dataset.pinKind = 'output';
            pin.dataset.pinType = 'flow';
            pin.dataset.pinId = `if-${index}`;
            right.hidden = false;
            right.append(label);
            row.append(pin);
            ifOutputPins.push(pin);
          };
          addBranchOutput(connectionRow, dataRight, 0);
          for (let index = 1; index < node.conditionCount; index += 1) {
            const row = document.createElement('div');
            row.className = 'method-test-node-connection-row method-test-node-data-row';
            const pin = document.createElement('span');
            pin.className = 'method-test-node-pin method-test-node-pin-input method-test-node-pin-data-input';
            pin.dataset.pinKind = 'input';
            pin.dataset.pinType = 'data';
            pin.dataset.pinId = `condition-${index}`;
            pin.dataset.pinDataType = 'boolean';
            pin.style.setProperty('--ycs-pin-color', YCS3_TYPE_COLORS.boolean);
            const left = document.createElement('div');
            left.className = 'method-test-node-row-side method-test-node-row-left';
            const label = document.createElement('span');
            label.className = 'method-test-node-input-label';
            label.textContent = `Condition ${index + 1}`;
            left.append(label);
            const right = document.createElement('div');
            right.className = 'method-test-node-row-side method-test-node-row-right';
            right.hidden = true;
            row.append(pin, left, right);
            addBranchOutput(row, right, index);
            ifInputPins.push(pin);
            ifRows.push(row);
          }
          const titleActions = document.createElement('div');
          titleActions.className = 'method-test-node-title-actions';
          const removeCondition = document.createElement('button');
          removeCondition.className = 'dialogue-title-button method-test-node-if-condition-button';
          removeCondition.type = 'button';
          removeCondition.innerHTML = '<span class="method-test-node-if-button-icon method-test-node-if-button-minus" aria-hidden="true"></span>';
          removeCondition.disabled = node.conditionCount <= 1;
          removeCondition.setAttribute('aria-label', 'Remove last If Else condition');
          removeCondition.addEventListener('pointerdown', event => event.stopPropagation());
          removeCondition.addEventListener('click', event => {
            event.stopPropagation();
            if (node.conditionCount <= 1) return;
            const removedIndex = node.conditionCount - 1;
            graph.connections = graph.connections.filter(connection => !(
              (connection.to === node.id && connection.type === 'data' && (connection.toPin || 'input') === `condition-${removedIndex}`)
              || (connection.from === node.id && connection.type === 'flow' && (connection.fromPin || 'output') === `if-${removedIndex}`)
            ));
            node.conditionCount -= 1;
            renderTestNodes();
          });
          const addCondition = document.createElement('button');
          addCondition.className = 'dialogue-title-button method-test-node-if-condition-button';
          addCondition.type = 'button';
          addCondition.innerHTML = '<span class="method-test-node-if-button-icon method-test-node-if-button-plus" aria-hidden="true"></span>';
          addCondition.setAttribute('aria-label', 'Add If Else condition');
          addCondition.addEventListener('pointerdown', event => event.stopPropagation());
          addCondition.addEventListener('click', event => {
            event.stopPropagation();
            node.conditionCount += 1;
            renderTestNodes();
          });
          titleActions.append(removeCondition, addCondition);
          nodeTitle.append(titleActions);
          ifElseRow = document.createElement('div');
          ifElseRow.className = 'method-test-node-connection-row method-test-node-output-row';
          const elseRight = document.createElement('div');
          elseRight.className = 'method-test-node-row-side method-test-node-row-right';
          const elseLabel = document.createElement('span');
          elseLabel.className = 'method-test-node-output-label';
          elseLabel.textContent = 'Else';
          const elsePin = document.createElement('span');
          elsePin.className = 'method-test-node-pin method-test-node-pin-output method-test-node-pin-flow-output';
          elsePin.dataset.pinKind = 'output';
          elsePin.dataset.pinType = 'flow';
          elsePin.dataset.pinId = 'else';
          elseRight.append(elseLabel);
          ifElseRow.append(elseRight, elsePin);
          ifOutputPins.push(elsePin);
        }
        const extraOutputRows = (definition?.outputs || []).slice(1).map(output => {
          const row = document.createElement('div');
          row.className = 'method-test-node-connection-row method-test-node-data-row method-test-node-output-row';
          const label = document.createElement('span');
          label.className = 'method-test-node-output-label';
          label.textContent = output.label;
          const pin = document.createElement('span');
          pin.className = 'method-test-node-pin method-test-node-pin-output method-test-node-pin-data-output';
          pin.dataset.pinKind = 'output';
          pin.dataset.pinType = 'data';
          pin.dataset.pinId = output.id;
          pin.dataset.pinDataType = output.type;
          pin.style.setProperty('--ycs-pin-color', YCS3_TYPE_COLORS[output.type] || 'white');
          row.append(label, pin);
          return { row, pin };
        });
        node.values = node.values && typeof node.values === 'object' ? node.values : {};
        const extraInputRows = (definition?.inputs || []).map(input => {
          const row = document.createElement('div');
          row.className = 'method-test-node-connection-row method-test-node-data-row method-test-node-input-row';
          const pin = document.createElement('span');
          pin.className = 'method-test-node-pin method-test-node-pin-input method-test-node-pin-data-input';
          pin.dataset.pinKind = 'input';
          pin.dataset.pinType = 'data';
          pin.dataset.pinId = input.id;
          pin.dataset.pinDataType = input.type;
          pin.style.setProperty('--ycs-pin-color', YCS3_TYPE_COLORS[input.type] || 'white');
          pin.hidden = input.connectable === false;
          const side = document.createElement('div');
          side.className = 'method-test-node-row-side method-test-node-row-left';
          const label = document.createElement('span');
          label.className = 'method-test-node-input-label';
          label.textContent = input.label;
          side.append(label);
          if (input.type === 'number' || input.type === 'string') {
            const field = document.createElement('input');
            field.className = 'pixel-text-box method-test-node-value';
            field.type = input.type === 'number' ? 'number' : 'text';
            node.values[input.id] = node.values[input.id] ?? input.default ?? '';
            field.value = String(node.values[input.id]);
            field.hidden = graph.connections.some(connection => connection.to === node.id && connection.type === 'data' && (connection.toPin || 'input') === input.id);
            field.setAttribute('aria-label', `${input.label} value`);
            field.addEventListener('input', () => { node.values[input.id] = field.value; });
            field.addEventListener('pointerdown', event => event.stopPropagation());
            side.append(field);
          } else if (input.type === 'select') {
            const dropdown = document.createElement('div');
            dropdown.className = 'workspace-item-dropdown method-test-node-dropdown';
            dropdown.addEventListener('pointerdown', event => event.stopPropagation());
            const trigger = document.createElement('button');
            trigger.className = 'pixel-option preferences-scale-select workspace-item-dropdown-button method-test-node-dropdown-button';
            trigger.type = 'button';
            trigger.setAttribute('aria-haspopup', 'listbox');
            trigger.setAttribute('aria-expanded', 'false');
            const selectedLabel = document.createElement('span');
            const arrow = document.createElement('span');
            arrow.className = 'preferences-scale-arrow pixel-direction-icon pixel-direction-down';
            const options = document.createElement('div');
            options.className = 'pixel-option-stack preferences-scale-options workspace-item-dropdown-options method-test-node-dropdown-options';
            options.hidden = true;
            node.values[input.id] = node.values[input.id] ?? input.default ?? '';
            const syncLabel = () => {
              selectedLabel.textContent = input.options?.find(choice => choice.value === node.values[input.id])?.label || '';
            };
            for (const choice of input.options || []) {
              const option = document.createElement('button');
              option.className = 'pixel-option preferences-scale-option';
              option.type = 'button';
              option.textContent = choice.label;
              option.addEventListener('click', event => {
                event.stopPropagation();
                node.values[input.id] = choice.value;
                syncLabel();
                options.hidden = true;
                trigger.setAttribute('aria-expanded', 'false');
                element.classList.remove('method-test-node-dropdown-open');
              });
              options.append(option);
            }
            trigger.addEventListener('click', event => {
              event.stopPropagation();
              options.hidden = !options.hidden;
              trigger.setAttribute('aria-expanded', String(!options.hidden));
              element.classList.toggle('method-test-node-dropdown-open', !options.hidden);
            });
            syncLabel();
            trigger.append(selectedLabel, arrow);
            dropdown.append(trigger, options);
            side.append(dropdown);
          }
          row.append(pin, side);
          return { row, pin };
        });
        const nodePins = [flowInput, flowOutput, inputPin, outputPin, ...ifInputPins, ...ifOutputPins, ...extraInputRows.map(entry => entry.pin), ...extraOutputRows.map(entry => entry.pin)]
          .filter(candidate => !candidate.hidden);
        for (const pin of nodePins) {
          pin.classList.toggle('method-test-node-pin-selected', selectedPin?.nodeId === node.id && selectedPin.kind === pin.dataset.pinKind && selectedPin.type === pin.dataset.pinType && selectedPin.pinId === pin.dataset.pinId);
          pin.addEventListener('pointerdown', event => {
            event.stopPropagation();
            event.preventDefault();
            content.querySelector('.method-node-search')?.remove();
            activeWireDrag?.preview?.remove();
            activeWireDrag = null;
            selectedNodeId = null;
            selectedConnectionId = null;
            selectedPin = { nodeId: node.id, kind: pin.dataset.pinKind, type: pin.dataset.pinType, pinId: pin.dataset.pinId };
            for (const candidate of content.querySelectorAll('.method-test-node-pin')) candidate.classList.remove('method-test-node-pin-selected');
            pin.classList.add('method-test-node-pin-selected');
            const reroutedConnection = pin.dataset.pinKind === 'input'
              ? graph.connections.find(connection => connection.to === node.id && connection.type === pin.dataset.pinType && (connection.toPin || 'input') === pin.dataset.pinId)
              : null;
            const dragPin = reroutedConnection
              ? content.querySelector(`[data-node-id="${reroutedConnection.from}"] .method-test-node-pin-${pin.dataset.pinType}-output[data-pin-id="${reroutedConnection.fromPin || 'output'}"]`)
              : pin;
            if (!dragPin) return;
            const preview = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            preview.classList.add('method-test-connection-line', 'method-test-connection-preview');
            wireLayer.append(preview);
            pin.setPointerCapture(event.pointerId);
            const start = pinCenter(dragPin);
            const fromNodeId = dragPin.closest('.method-test-node')?.dataset.nodeId;
            activeWireDrag = {
              nodeId: pin.dataset.pinKind === 'input' ? node.id : fromNodeId,
              type: pin.dataset.pinType,
              dataType: pin.dataset.pinDataType || undefined,
              pinId: pin.dataset.pinId,
              direction: pin.dataset.pinKind === 'input' ? 'incoming' : 'outgoing',
              pointer: { ...start },
              preview,
              allowSearch: true,
              searchOpen: false,
            };
            const moveWire = moveEvent => {
              const bounds = content.getBoundingClientRect();
              const snapTarget = nearestCompatiblePin(dragPin, moveEvent.clientX, moveEvent.clientY);
              for (const candidate of content.querySelectorAll('.method-test-node-pin-snap')) candidate.classList.remove('method-test-node-pin-snap');
              snapTarget?.classList.add('method-test-node-pin-snap');
              const pointer = snapTarget ? pinCenter(snapTarget) : {
                x: (moveEvent.clientX - bounds.left) * (content.clientWidth / bounds.width),
                y: (moveEvent.clientY - bounds.top) * (content.clientHeight / bounds.height),
              };
              if (activeWireDrag) activeWireDrag.pointer = pointer;
              preview.setAttribute('d', connectionPath(start, pointer));
            };
            const finishWire = finishEvent => {
              if (finishEvent.pointerId !== event.pointerId) return;
              const target = activeWireDrag?.searchOpen
                ? null
                : nearestCompatiblePin(dragPin, finishEvent.clientX, finishEvent.clientY);
              const targetNode = target?.closest('.method-test-node')?.dataset.nodeId;
              const from = dragPin.closest('.method-test-node')?.dataset.nodeId;
              if (target && targetNode && from && targetNode !== from) {
                const to = targetNode;
                graph.connections = graph.connections.filter(connection => connection.to !== to || connection.type !== dragPin.dataset.pinType || (connection.toPin || 'input') !== target.dataset.pinId);
                if (dragPin.dataset.pinType === 'flow') {
                  graph.connections = graph.connections.filter(connection => connection.from !== from || connection.type !== 'flow' || (connection.fromPin || 'output') !== dragPin.dataset.pinId);
                }
                if (reroutedConnection) graph.connections = graph.connections.filter(connection => connection.id !== reroutedConnection.id);
                if (!graph.connections.some(connection => connection.from === from && connection.to === to && connection.type === dragPin.dataset.pinType && (connection.fromPin || 'output') === dragPin.dataset.pinId && (connection.toPin || 'input') === target.dataset.pinId)) {
                  graph.connections.push({ id: crypto.randomUUID(), type: dragPin.dataset.pinType, dataType: dragPin.dataset.pinDataType || undefined, from, to, fromPin: dragPin.dataset.pinId, toPin: target.dataset.pinId });
                }
              }
              for (const candidate of content.querySelectorAll('.method-test-node-pin-snap')) candidate.classList.remove('method-test-node-pin-snap');
              pin.removeEventListener('pointermove', moveWire);
              pin.removeEventListener('pointerup', finishWire);
              pin.removeEventListener('pointercancel', finishWire);
              if (activeWireDrag?.searchOpen) {
                // Keep the preview visible behind the search to show that the
                // selected node will be connected when it is created.
              } else {
                activeWireDrag = null;
                renderTestNodes();
              }
            };
            pin.addEventListener('pointermove', moveWire);
            pin.addEventListener('pointerup', finishWire);
            pin.addEventListener('pointercancel', finishWire);
            editor.focus({ preventScroll: true });
          });
          pin.addEventListener('contextmenu', event => {
            event.preventDefault();
            event.stopPropagation();
            graph.connections = graph.connections.filter(connection => (
              pin.dataset.pinKind === 'input'
                ? connection.to !== node.id || connection.type !== pin.dataset.pinType || (connection.toPin || 'input') !== pin.dataset.pinId
                : connection.from !== node.id || connection.type !== pin.dataset.pinType || (connection.fromPin || 'output') !== pin.dataset.pinId
            ));
            selectedPin = null;
            renderTestNodes();
          });
        }
        connectionRow.append(inputPin, dataLeft, dataRight, outputPin);
        nodeBody.append(
          flowRow,
          connectionRow,
          ...ifRows,
          ...(ifElseRow ? [ifElseRow] : []),
          ...extraInputRows.map(entry => entry.row),
          ...extraOutputRows.map(entry => entry.row),
        );
        element.append(nodeTitle, nodeBody);
        element.addEventListener('pointerdown', () => {
          node.layer = nextNodeLayer;
          nextNodeLayer += 1;
          element.style.zIndex = String(node.layer);
        }, { capture: true });
        element.addEventListener('pointerdown', event => {
          event.stopPropagation();
          if (spaceHeld) {
            beginCanvasPan(event);
            return;
          }
          if (node.start) {
            selectedNodeId = null;
            editor.focus({ preventScroll: true });
            return;
          }
          selectedNodeId = node.id;
          if (!selectedNodeIds.has(node.id)) selectedNodeIds.clear();
          selectedNodeIds.add(node.id);
          selectedConnectionId = null;
          selectedPin = null;
          for (const candidate of content.querySelectorAll('.method-test-node')) candidate.classList.toggle('method-test-node-selected', selectedNodeIds.has(candidate.dataset.nodeId));
          const selectedElement = element;
          const contentBounds = content.getBoundingClientRect();
          const scaleX = (contentBounds.width ? content.clientWidth / contentBounds.width : 1) / graphView.scale;
          const scaleY = (contentBounds.height ? content.clientHeight / contentBounds.height : 1) / graphView.scale;
          const drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: node.x, top: node.y };
          const movingNodes = graph.nodes
            .filter(candidate => selectedNodeIds.has(candidate.id) && !candidate.start)
            .map(candidate => ({ node: candidate, x: candidate.x, y: candidate.y }));
          selectedElement.setPointerCapture(event.pointerId);
          const moveNode = moveEvent => {
            if (moveEvent.pointerId !== drag.pointerId) return;
            const dx = (moveEvent.clientX - drag.x) * scaleX;
            const dy = (moveEvent.clientY - drag.y) * scaleY;
            for (const moving of movingNodes) {
              moving.node.x = moving.x + dx;
              moving.node.y = moving.y + dy;
              const movingElement = content.querySelector(`[data-node-id="${moving.node.id}"]`);
              if (movingElement) {
                movingElement.style.left = `${snapScreenPixel(graphView.x + (moving.node.x * graphView.scale))}px`;
                movingElement.style.top = `${snapScreenPixel(graphView.y + (moving.node.y * graphView.scale))}px`;
              }
            }
            updateTestConnections();
          };
          const stopDragging = stopEvent => {
            if (stopEvent.pointerId !== drag.pointerId) return;
            selectedElement.removeEventListener('pointermove', moveNode);
            selectedElement.removeEventListener('pointerup', stopDragging);
            selectedElement.removeEventListener('pointercancel', stopDragging);
          };
          selectedElement.addEventListener('pointermove', moveNode);
          selectedElement.addEventListener('pointerup', stopDragging);
          selectedElement.addEventListener('pointercancel', stopDragging);
          editor.focus({ preventScroll: true });
        });
        return element;
      });
      content.replaceChildren(wireLayer, ...nodeElements);
      updateTestConnections();
    };
    editor.tabIndex = -1;
    let spaceHeld = false;
    editor.addEventListener('pointerdown', event => {
      const activeDropdown = event.target.closest('.method-test-node-dropdown');
      for (const dropdown of content.querySelectorAll('.method-test-node-dropdown')) {
        if (dropdown === activeDropdown) continue;
        dropdown.querySelector('.method-test-node-dropdown-options').hidden = true;
        dropdown.querySelector('.method-test-node-dropdown-button').setAttribute('aria-expanded', 'false');
        dropdown.closest('.method-test-node')?.classList.remove('method-test-node-dropdown-open');
      }
    }, { capture: true });
    const beginCanvasPan = event => {
      event.preventDefault();
      const start = { x: event.clientX, y: event.clientY, viewX: graphView.x, viewY: graphView.y };
      editor.setPointerCapture(event.pointerId);
      const pan = moveEvent => {
        const bounds = content.getBoundingClientRect();
        graphView.x = snapScreenPixel(start.viewX + ((moveEvent.clientX - start.x) * (content.clientWidth / bounds.width)));
        graphView.y = snapScreenPixel(start.viewY + ((moveEvent.clientY - start.y) * (content.clientHeight / bounds.height)));
        renderTestNodes();
      };
      const stop = stopEvent => {
        if (stopEvent.pointerId !== event.pointerId) return;
        editor.removeEventListener('pointermove', pan);
        editor.removeEventListener('pointerup', stop);
        editor.removeEventListener('pointercancel', stop);
      };
      editor.addEventListener('pointermove', pan);
      editor.addEventListener('pointerup', stop);
      editor.addEventListener('pointercancel', stop);
    };
    editor.addEventListener('pointerdown', event => {
      if (!spaceHeld || !content.contains(event.target)) return;
      event.stopImmediatePropagation();
      beginCanvasPan(event);
    }, { capture: true });
    editor.addEventListener('pointerdown', event => {
      if (event.target.closest('.method-test-node, .method-node-search, .method-test-connection-hit')) return;
      selectedNodeId = null;
      selectedNodeIds.clear();
      selectedConnectionId = null;
      selectedPin = null;
      for (const candidate of content.querySelectorAll('.method-test-node-selected')) {
        candidate.classList.remove('method-test-node-selected');
      }
      if (content.contains(event.target)) {
        editor.focus({ preventScroll: true });
        const bounds = content.getBoundingClientRect();
        const scaleX = content.clientWidth / bounds.width;
        const scaleY = content.clientHeight / bounds.height;
        const start = { x: event.clientX, y: event.clientY };
        content.setPointerCapture(event.pointerId);
        if (spaceHeld) {
          beginCanvasPan(event);
        } else {
          const marquee = document.createElement('div');
          marquee.className = 'method-node-selection-marquee';
          content.append(marquee);
          const select = moveEvent => {
            const left = Math.min(start.x, moveEvent.clientX);
            const top = Math.min(start.y, moveEvent.clientY);
            const right = Math.max(start.x, moveEvent.clientX);
            const bottom = Math.max(start.y, moveEvent.clientY);
            marquee.style.left = `${(left - bounds.left) * scaleX}px`;
            marquee.style.top = `${(top - bounds.top) * scaleY}px`;
            marquee.style.width = `${(right - left) * scaleX}px`;
            marquee.style.height = `${(bottom - top) * scaleY}px`;
            selectedNodeIds.clear();
            for (const candidate of content.querySelectorAll('.method-test-node:not(.method-test-node-start)')) {
              const box = candidate.getBoundingClientRect();
              if (box.right >= left && box.left <= right && box.bottom >= top && box.top <= bottom) selectedNodeIds.add(candidate.dataset.nodeId);
              candidate.classList.toggle('method-test-node-selected', selectedNodeIds.has(candidate.dataset.nodeId));
            }
          };
          const finish = () => {
            marquee.remove();
            content.removeEventListener('pointermove', select);
          };
          content.addEventListener('pointermove', select);
          content.addEventListener('pointerup', finish, { once: true });
        }
      }
    });
    content.addEventListener('pointermove', event => {
      const bounds = content.getBoundingClientRect();
      lastCanvasPoint = {
        x: (event.clientX - bounds.left) * (content.clientWidth / bounds.width),
        y: (event.clientY - bounds.top) * (content.clientHeight / bounds.height),
      };
    });
    content.addEventListener('wheel', event => {
      if (event.target.closest('.method-node-search')) return;
      event.preventDefault();
      const bounds = content.getBoundingClientRect();
      const mouseX = (event.clientX - bounds.left) * (content.clientWidth / bounds.width);
      const mouseY = (event.clientY - bounds.top) * (content.clientHeight / bounds.height);
      const worldX = (mouseX - graphView.x) / graphView.scale;
      const worldY = (mouseY - graphView.y) / graphView.scale;
      const currentZoomIndex = graphZoomLevels.reduce((best, level, index) => (
        Math.abs(level - graphView.scale) < Math.abs(graphZoomLevels[best] - graphView.scale) ? index : best
      ), 0);
      const nextZoomIndex = clamp(currentZoomIndex + (event.deltaY < 0 ? 1 : -1), 0, graphZoomLevels.length - 1);
      graphView.scale = graphZoomLevels[nextZoomIndex];
      graphView.x = snapScreenPixel(mouseX - (worldX * graphView.scale));
      graphView.y = snapScreenPixel(mouseY - (worldY * graphView.scale));
      renderTestNodes();
    }, { passive: false });
    editor.addEventListener('keydown', event => {
      if (event.code === 'Space' && !event.ctrlKey) {
        spaceHeld = true;
        event.preventDefault();
        return;
      }
      if (event.ctrlKey && event.code === 'Space' && activeWireDrag?.allowSearch) {
        event.preventDefault();
        if (!activeWireDrag.searchOpen) openConnectedNodeSearch(activeWireDrag);
      } else if (event.ctrlKey && event.code === 'Space') {
        event.preventDefault();
        const selectedConnection = graph.connections.find(connection => connection.id === selectedConnectionId);
        openConnectedNodeSearch(selectedConnection
          ? { direction: 'insert', connection: { ...selectedConnection }, pointer: { ...lastCanvasPoint }, searchOpen: false }
          : { direction: 'standalone', pointer: { ...lastCanvasPoint }, searchOpen: false });
      } else if (event.key === 'Delete' && (selectedNodeId || selectedNodeIds.size || selectedConnectionId || selectedPin)) {
        event.preventDefault();
        if (selectedNodeId || selectedNodeIds.size) {
          const removedIds = new Set(selectedNodeIds);
          if (selectedNodeId) removedIds.add(selectedNodeId);
          graph.nodes = graph.nodes.filter(node => !removedIds.has(node.id) || node.start);
          graph.connections = graph.connections.filter(connection => !removedIds.has(connection.from) && !removedIds.has(connection.to));
        } else if (selectedConnectionId) {
          graph.connections = graph.connections.filter(connection => connection.id !== selectedConnectionId);
        } else if (selectedPin) {
          graph.connections = graph.connections.filter(connection => (
            selectedPin.kind === 'input'
              ? connection.to !== selectedPin.nodeId || connection.type !== selectedPin.type || (connection.toPin || 'input') !== selectedPin.pinId
              : connection.from !== selectedPin.nodeId || connection.type !== selectedPin.type || (connection.fromPin || 'output') !== selectedPin.pinId
          ));
        }
        selectedNodeId = null;
        selectedNodeIds.clear();
        selectedConnectionId = null;
        selectedPin = null;
        renderTestNodes();
      }
    });
    window.addEventListener('keyup', event => { if (event.code === 'Space') spaceHeld = false; });
    editor.append(header, content);
    panel.append(editor);
    renderTestNodes();
    requestAnimationFrame(() => {
      const startNode = graph.nodes.find(node => node.start);
      if (!startNode) return;
      graphView.x = (content.clientWidth / 2) - ((startNode.x + 50) * graphView.scale);
      graphView.y = (content.clientHeight / 2) - ((startNode.y + 28) * graphView.scale);
      renderTestNodes();
    });
    editor.focus({ preventScroll: true });
  };

  const createCustomMethodEditButton = (methodKey, label) => {
    const button = document.createElement('button');
    button.className = 'pixel-button item-custom-method-edit';
    button.type = 'button';
    button.textContent = 'Edit';
    button.setAttribute('aria-label', `Edit ${label}`);
    button.addEventListener('click', () => openCustomMethodEditor(activeDialogPanel, methodKey, label));
    return button;
  };

  const createUseAnimationDropdown = method => {
    const dropdown = document.createElement('div');
    dropdown.className = 'workspace-item-dropdown item-custom-method-animation';
    const trigger = document.createElement('button');
    trigger.className = 'pixel-option preferences-scale-select workspace-item-dropdown-button';
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const label = document.createElement('span');
    label.textContent = useAnimationOptions.includes(method.useAnimation) ? method.useAnimation : 'NONE';
    const arrow = document.createElement('span');
    arrow.className = 'preferences-scale-arrow pixel-direction-icon pixel-direction-down';
    arrow.setAttribute('aria-hidden', 'true');
    const options = document.createElement('div');
    options.className = 'preferences-scale-options pixel-option-stack workspace-item-dropdown-options';
    options.role = 'listbox';
    options.hidden = true;
    for (const value of useAnimationOptions) {
      const option = document.createElement('button');
      option.className = 'pixel-option';
      option.type = 'button';
      option.role = 'option';
      option.textContent = value === 'TOOT_HORN' ? 'Toot Horn' : value[0] + value.slice(1).toLowerCase();
      option.addEventListener('click', () => {
        method.useAnimation = value;
        activeDialogPanel.dataset.dirty = 'true';
        renderCustomMethods();
      });
      options.append(option);
    }
    trigger.addEventListener('click', () => {
      options.hidden = !options.hidden;
      trigger.setAttribute('aria-expanded', String(!options.hidden));
    });
    trigger.append(label, arrow);
    dropdown.append(trigger, options);
    return dropdown;
  };

  const renderCustomMethods = () => {
    if (!activeDialogPanel || !activeAuthoringFields) return;
    const list = activeAuthoringFields.fields.querySelector('.item-custom-methods-list');
    if (!list) return;
    const methods = activeDialogPanel.itemCustomMethods || [];
    list.replaceChildren(...methods.map((method, index) => {
      const entry = document.createElement('section');
      entry.className = 'item-state-entry item-custom-method-entry';
      const titlebar = document.createElement('header');
      titlebar.className = 'floating-dialog-titlebar item-state-entry-titlebar';
      const title = document.createElement('span');
      title.className = 'floating-dialog-title';
      title.textContent = customMethodLabels[method.key];
      const remove = document.createElement('button');
      remove.className = 'dialogue-title-button floating-dialog-close';
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${customMethodLabels[method.key]}`);
      remove.innerHTML = '<img src="./assets/sprite/generated/dialogue_icon_2x.png" alt="" draggable="false" />';
      remove.addEventListener('click', () => {
        methods.splice(index, 1);
        activeDialogPanel.dataset.dirty = 'true';
        renderCustomMethods();
      });
      titlebar.append(title, remove);
      const body = document.createElement('div');
      body.className = 'item-state-entry-body item-custom-method-body';
      const editRow = document.createElement('div');
      editRow.className = 'workspace-item-field-row';
      editRow.append(Object.assign(document.createElement('span'), { textContent: 'Method' }), createCustomMethodEditButton(method.key, customMethodLabels[method.key]));
      body.append(editRow);
      if (method.key === 'use') {
        const continuousRow = document.createElement('div');
        continuousRow.className = 'workspace-item-field-row';
        const continuous = document.createElement('button');
        continuous.className = 'pixel-checkbox';
        continuous.type = 'button';
        continuous.role = 'checkbox';
        continuous.setAttribute('aria-checked', String(Boolean(method.continuousUse)));
        continuous.addEventListener('click', () => {
          method.continuousUse = continuous.getAttribute('aria-checked') !== 'true';
          activeDialogPanel.dataset.dirty = 'true';
          renderCustomMethods();
        });
        continuousRow.append(Object.assign(document.createElement('span'), { textContent: 'Continuous Use' }), continuous);
        body.append(continuousRow);
        if (method.continuousUse) {
          const ticksRow = document.createElement('label');
          ticksRow.className = 'workspace-item-field-row';
          const ticks = document.createElement('input');
          ticks.className = 'pixel-text-box'; ticks.type = 'number'; ticks.min = '1'; ticks.value = String(method.ticks || 32);
          ticks.addEventListener('input', () => { method.ticks = Math.max(1, Number.parseInt(ticks.value, 10) || 1); activeDialogPanel.dataset.dirty = 'true'; });
          ticksRow.append(Object.assign(document.createElement('span'), { textContent: 'Ticks' }), ticks);
          const animationRow = document.createElement('div');
          animationRow.className = 'workspace-item-field-row';
          animationRow.append(Object.assign(document.createElement('span'), { textContent: 'Use Animation' }), createUseAnimationDropdown(method));
          const onUseRow = document.createElement('div'); onUseRow.className = 'workspace-item-field-row';
          onUseRow.append(Object.assign(document.createElement('span'), { textContent: 'On Use' }), createCustomMethodEditButton('continuousUse', 'On Use'));
          const releaseRow = document.createElement('div'); releaseRow.className = 'workspace-item-field-row';
          releaseRow.append(Object.assign(document.createElement('span'), { textContent: 'Release Using' }), createCustomMethodEditButton('releaseUsing', 'Release Using'));
          body.append(ticksRow, animationRow, onUseRow, releaseRow);
        }
      }
      entry.append(titlebar, body);
      return entry;
    }));
    for (const option of customMethodsAddOptions.querySelectorAll('[data-item-custom-method]')) {
      option.hidden = methods.some(method => method.key === option.dataset.itemCustomMethod);
    }
    const visibleOptions = [...customMethodsAddOptions.querySelectorAll('[data-item-custom-method]:not([hidden])')];
    visibleOptions.forEach((option, index) => {
      option.dataset.stackPosition = visibleOptions.length === 1 ? 'only'
        : index === 0 ? 'first'
          : index === visibleOptions.length - 1 ? 'last' : 'middle';
    });
    requestAnimationFrame(() => positionDialogBeside(authoringDialog, activeDialogAnchor));
  };

  customMethodsAddButton.addEventListener('click', () => {
    customMethodsAddOptions.hidden = !customMethodsAddOptions.hidden;
    customMethodsAddButton.setAttribute('aria-expanded', String(!customMethodsAddOptions.hidden));
  });
  customMethodsAddOptions.addEventListener('click', event => {
    const option = event.target.closest('[data-item-custom-method]');
    if (!option) return;
    activeDialogPanel.itemCustomMethods.push({ key: option.dataset.itemCustomMethod, continuousUse: false, ticks: 32, useAnimation: 'NONE' });
    activeDialogPanel.dataset.dirty = 'true';
    customMethodsAddOptions.hidden = true;
    customMethodsAddButton.setAttribute('aria-expanded', 'false');
    renderCustomMethods();
  });
  document.addEventListener('pointerdown', event => {
    if (customMethodsAddControl.contains(event.target)) return;
    customMethodsAddOptions.hidden = true;
    customMethodsAddButton.setAttribute('aria-expanded', 'false');
  });

  const recipeLabels = {
    shaped: 'Shaped Crafting', shapeless: 'Shapeless Crafting', smelting: 'Smelting',
    blasting: 'Blasting', smoking: 'Smoking', campfire: 'Campfire', stonecutting: 'Stonecutting',
  };
  const activeShapedRecipeBrushes = new WeakMap();
  let recipeItemOptions = [];
  const loadRecipeItemOptions = async () => {
    recipeItemOptions = await loadIngredientOptions();
  };

  const closeShapedIngredientComboboxes = exceptCombobox => {
    for (const combobox of recipeDialog.querySelectorAll('.item-shaped-recipe-combobox')) {
      if (combobox === exceptCombobox) continue;
      combobox.querySelector('.pixel-combobox-options').hidden = true;
      combobox.querySelector('.pixel-combobox-button').setAttribute('aria-expanded', 'false');
      combobox.querySelector('.pixel-direction-icon').className = 'pixel-direction-icon pixel-direction-down';
    }
  };

  const addShapedOptionsOverlayScrollbar = (host, options) => {
    const scrollbar = document.createElement('div');
    scrollbar.className = 'dialog-overlay-scrollbar dialog-overlay-scrollbar-vertical';
    scrollbar.setAttribute('aria-hidden', 'true');
    const thumb = document.createElement('div');
    thumb.className = 'dialog-overlay-scrollbar-thumb';
    scrollbar.append(thumb);
    host.append(scrollbar);

    const visibleOptions = () => [...options.children].filter(option => !option.hidden);
    const setSnappedScroll = target => {
      const candidates = visibleOptions();
      if (!candidates.length) return;
      const nearest = candidates.reduce((best, option) => (
        Math.abs(option.offsetTop - target) < Math.abs(best.offsetTop - target) ? option : best
      ));
      options.scrollTop = nearest.offsetTop;
    };

    const sync = () => {
      const viewportSize = options.clientHeight;
      const contentSize = options.scrollHeight;
      const hasOverflow = contentSize > viewportSize + 0.5;
      scrollbar.hidden = !hasOverflow;
      if (!hasOverflow) return;
      const artPixel = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--ycs-pixel-2x'),
      ) || 2;
      const trackSize = scrollbar.clientHeight;
      const thumbSize = Math.min(trackSize, Math.max(6 * artPixel, trackSize * (viewportSize / contentSize)));
      const scrollRange = Math.max(0, contentSize - viewportSize);
      const travel = Math.max(0, trackSize - thumbSize);
      thumb.style.height = `${thumbSize}px`;
      thumb.style.top = `${scrollRange ? (options.scrollTop / scrollRange) * travel : 0}px`;
    };
    let dragState = null;
    scrollbar.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      sync();
      const trackBounds = scrollbar.getBoundingClientRect();
      const thumbBounds = thumb.getBoundingClientRect();
      const scrollRange = Math.max(0, options.scrollHeight - options.clientHeight);
      const travel = Math.max(0, trackBounds.height - thumbBounds.height);
      if (event.target !== thumb) {
        const target = (travel
          ? clamp(event.clientY - trackBounds.top - (thumbBounds.height / 2), 0, travel) / travel
          : 0) * scrollRange;
        setSnappedScroll(target);
        sync();
        return;
      }
      dragState = { pointerId: event.pointerId, startY: event.clientY, startScroll: options.scrollTop, scrollRange, travel };
      scrollbar.setPointerCapture(event.pointerId);
    });
    scrollbar.addEventListener('pointermove', event => {
      if (dragState?.pointerId !== event.pointerId) return;
      const target = dragState.startScroll + (dragState.travel
        ? ((event.clientY - dragState.startY) / dragState.travel) * dragState.scrollRange
        : 0);
      setSnappedScroll(target);
    });
    const stopDrag = event => {
      if (dragState?.pointerId === event.pointerId) dragState = null;
    };
    scrollbar.addEventListener('pointerup', stopDrag);
    scrollbar.addEventListener('pointercancel', stopDrag);
    options.addEventListener('scroll', sync, { passive: true });
    options.addEventListener('wheel', event => {
      if (!event.deltaY) return;
      event.preventDefault();
      const candidates = visibleOptions();
      if (!candidates.length) return;
      const currentIndex = candidates.reduce((bestIndex, option, index) => (
        Math.abs(option.offsetTop - options.scrollTop)
          < Math.abs(candidates[bestIndex].offsetTop - options.scrollTop)
          ? index
          : bestIndex
      ), 0);
      const nextIndex = clamp(currentIndex + Math.sign(event.deltaY), 0, candidates.length - 1);
      setSnappedScroll(candidates[nextIndex].offsetTop);
      sync();
    }, { passive: false });
    options.snapToOption = option => setSnappedScroll(option.offsetTop);
    options.syncOverlayScrollbar = () => requestAnimationFrame(sync);
  };

  const normalizeShapedRecipe = recipe => {
    recipe.yield = Math.min(99, Math.max(1, Number.parseInt(recipe.yield, 10) || 1));
    recipe.ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map(ingredient => String(ingredient || ''))
      : [];
    recipe.pattern = Array.from({ length: 9 }, (_, index) => {
      const ingredientIndex = Number.parseInt(recipe.pattern?.[index], 10);
      return Number.isInteger(ingredientIndex)
        && ingredientIndex >= 0
        && ingredientIndex < recipe.ingredients.length
        ? ingredientIndex
        : null;
    });
  };

  const syncShapedOptionStackPositions = options => {
    const allOptions = [...options.children];
    const visibleOptions = allOptions.filter(option => !option.hidden);
    for (const option of allOptions) delete option.dataset.stackPosition;
    visibleOptions.forEach((option, index) => {
      option.dataset.stackPosition = visibleOptions.length === 1
        ? 'only'
        : index === 0
          ? 'first'
          : index === visibleOptions.length - 1
            ? 'last'
            : 'middle';
    });
    options.parentElement?.style.setProperty(
      '--item-shaped-visible-options',
      String(Math.max(1, Math.min(6, visibleOptions.length))),
    );
  };

  const syncShapedScrolledOptionStackPositions = options => {
    if (options.hidden || !options.clientHeight) return;
    const allOptions = [...options.children];
    const filteredOptions = allOptions.filter(option => !option.hidden);
    if (!filteredOptions.length) return;
    const firstIndex = filteredOptions.reduce((bestIndex, option, index) => (
      Math.abs(option.offsetTop - options.scrollTop)
        < Math.abs(filteredOptions[bestIndex].offsetTop - options.scrollTop)
        ? index
        : bestIndex
    ), 0);
    const viewportOptions = filteredOptions.slice(firstIndex, firstIndex + 6);
    if (!viewportOptions.length) return;
    for (const option of allOptions) delete option.dataset.stackPosition;
    filteredOptions.forEach(option => { option.dataset.stackPosition = 'middle'; });
    const first = viewportOptions[0];
    const last = viewportOptions[viewportOptions.length - 1];
    if (first === last) {
      first.dataset.stackPosition = 'only';
    } else {
      first.dataset.stackPosition = 'first';
      last.dataset.stackPosition = 'last';
    }
    requestAnimationFrame(() => {
      if (!options.hidden) options.scrollTop = first.offsetTop;
    });
  };

  const renderShapedRecipe = (body, recipe) => {
    normalizeShapedRecipe(recipe);
    let activeBrush = activeShapedRecipeBrushes.get(recipe);
    if (!Number.isInteger(activeBrush) || activeBrush < 0 || activeBrush >= recipe.ingredients.length) {
      activeBrush = recipe.ingredients.length ? 0 : null;
      activeShapedRecipeBrushes.set(recipe, activeBrush);
    }

    const controls = document.createElement('div');
    controls.className = 'item-shaped-recipe-controls';
    const yieldRow = document.createElement('div');
    yieldRow.className = 'item-shaped-recipe-yield dialog-labeled-row';
    const yieldLabel = document.createElement('span');
    yieldLabel.textContent = 'Yield';
    const yieldInput = document.createElement('input');
    yieldInput.className = 'pixel-text-box';
    yieldInput.type = 'number';
    yieldInput.min = '1';
    yieldInput.max = '99';
    yieldInput.value = String(recipe.yield);
    yieldInput.setAttribute('aria-label', 'Recipe yield');
    yieldInput.addEventListener('input', () => {
      recipe.yield = Math.min(99, Math.max(1, Number.parseInt(yieldInput.value, 10) || 1));
      activeDialogPanel.dataset.dirty = 'true';
    });
    const ingredientLabel = document.createElement('span');
    ingredientLabel.textContent = 'Ingredients';
    const addIngredient = document.createElement('button');
    addIngredient.className = 'pixel-button pixel-combobox-button item-shaped-recipe-add-ingredient';
    addIngredient.type = 'button';
    addIngredient.setAttribute('aria-label', 'Add ingredient');
    const addIcon = document.createElement('span');
    addIcon.className = 'item-recipe-add-icon';
    addIcon.setAttribute('aria-hidden', 'true');
    addIngredient.append(addIcon);
    addIngredient.addEventListener('click', () => {
      recipe.ingredients.push('');
      activeShapedRecipeBrushes.set(recipe, recipe.ingredients.length - 1);
      activeDialogPanel.dataset.dirty = 'true';
      renderItemRecipes();
    });
    yieldRow.append(yieldLabel, yieldInput, ingredientLabel, addIngredient);

    const ingredientList = document.createElement('div');
    ingredientList.className = 'item-shaped-recipe-ingredients';
    recipe.ingredients.forEach((ingredient, ingredientIndex) => {
      const row = document.createElement('div');
      row.className = 'item-shaped-recipe-ingredient';
      const combobox = createIngredientCombobox({
        options: recipeItemOptions,
        value: ingredient,
        ariaLabel: `Ingredient ${ingredientIndex + 1}`,
        optionHostClass: 'item-shaped-recipe-options-host',
        onChange: value => {
          recipe.ingredients[ingredientIndex] = value;
          activeDialogPanel.dataset.dirty = 'true';
        },
      });
      combobox.classList.add('item-shaped-recipe-combobox');
      const brush = document.createElement('button');
      brush.className = 'pixel-button pixel-combobox-button item-shaped-recipe-brush';
      brush.type = 'button';
      brush.textContent = String(ingredientIndex + 1);
      brush.setAttribute('aria-label', `Select ingredient brush ${ingredientIndex + 1}`);
      brush.setAttribute('aria-pressed', String(activeBrush === ingredientIndex));
      brush.addEventListener('click', () => {
        activeShapedRecipeBrushes.set(recipe, ingredientIndex);
        renderItemRecipes();
      });
      const remove = document.createElement('button');
      remove.className = 'pixel-button pixel-combobox-button item-shaped-recipe-remove-ingredient';
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ingredient ${ingredientIndex + 1}`);
      const removeIcon = document.createElement('img');
      removeIcon.src = './assets/sprite/generated/dialogue_icon_2x.png';
      removeIcon.alt = '';
      removeIcon.draggable = false;
      remove.append(removeIcon);
      remove.addEventListener('click', () => {
        recipe.ingredients.splice(ingredientIndex, 1);
        recipe.pattern = recipe.pattern.map(value => value === ingredientIndex
          ? null
          : value > ingredientIndex ? value - 1 : value);
        activeShapedRecipeBrushes.set(recipe, recipe.ingredients.length ? 0 : null);
        activeDialogPanel.dataset.dirty = 'true';
        renderItemRecipes();
      });
      row.append(combobox, brush, remove);
      ingredientList.append(row);
    });
    controls.append(yieldRow, ingredientList);

    const grid = document.createElement('div');
    grid.className = 'item-shaped-recipe-grid';
    grid.setAttribute('aria-label', '3 by 3 crafting grid');
    recipe.pattern.forEach((ingredientIndex, cellIndex) => {
      const cell = document.createElement('button');
      cell.className = 'pixel-button pixel-combobox-button item-shaped-recipe-cell';
      cell.type = 'button';
      const syncCell = () => {
        const value = recipe.pattern[cellIndex];
        const ingredientId = value === null ? '' : recipe.ingredients[value] || `Ingredient ${value + 1}`;
        cell.textContent = value === null ? '' : String(value + 1);
        cell.setAttribute('aria-label', value === null
          ? `Empty crafting slot ${cellIndex + 1}`
          : `Crafting slot ${cellIndex + 1}: ${ingredientId}`);
        cell.dataset.filled = String(value !== null);
      };
      syncCell();
      cell.addEventListener('click', () => {
        const brushIndex = activeShapedRecipeBrushes.get(recipe);
        recipe.pattern[cellIndex] = Number.isInteger(brushIndex) ? brushIndex : null;
        activeDialogPanel.dataset.dirty = 'true';
        syncCell();
      });
      cell.addEventListener('contextmenu', event => {
        event.preventDefault();
        recipe.pattern[cellIndex] = null;
        activeDialogPanel.dataset.dirty = 'true';
        syncCell();
      });
      grid.append(cell);
    });
    body.append(controls, grid);
  };

  const renderShapelessRecipe = (body, recipe) => {
    recipe.yield = Math.min(99, Math.max(1, Number.parseInt(recipe.yield, 10) || 1));
    recipe.ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map(ingredient => typeof ingredient === 'string'
        ? { value: ingredient, count: 1 }
        : { value: String(ingredient?.value || ''), count: Math.min(9, Math.max(1, Number.parseInt(ingredient?.count, 10) || 1)) })
      : [];
    const controls = document.createElement('div');
    controls.className = 'item-shaped-recipe-controls';
    const heading = document.createElement('div');
    heading.className = 'item-shaped-recipe-yield item-shapeless-recipe-heading dialog-labeled-row';
    const yieldLabel = document.createElement('span');
    yieldLabel.textContent = 'Yield';
    const yieldInput = document.createElement('input');
    yieldInput.className = 'pixel-text-box';
    yieldInput.type = 'number'; yieldInput.min = '1'; yieldInput.max = '99'; yieldInput.value = String(recipe.yield);
    yieldInput.setAttribute('aria-label', 'Recipe yield');
    yieldInput.addEventListener('input', () => {
      recipe.yield = Math.min(99, Math.max(1, Number.parseInt(yieldInput.value, 10) || 1));
      activeDialogPanel.dataset.dirty = 'true';
    });
    const ingredientsLabel = document.createElement('span');
    ingredientsLabel.textContent = 'Ingredients';
    const add = document.createElement('button');
    add.className = 'pixel-button pixel-combobox-button item-shaped-recipe-add-ingredient';
    add.type = 'button'; add.setAttribute('aria-label', 'Add ingredient');
    const addIcon = document.createElement('span');
    addIcon.className = 'item-recipe-add-icon'; addIcon.setAttribute('aria-hidden', 'true'); add.append(addIcon);
    add.addEventListener('click', () => {
      recipe.ingredients.push({ value: '', count: 1 });
      activeDialogPanel.dataset.dirty = 'true'; renderItemRecipes();
    });
    heading.append(yieldLabel, yieldInput, ingredientsLabel, add);
    const list = document.createElement('div');
    list.className = 'item-shaped-recipe-ingredients';
    recipe.ingredients.forEach((ingredient, index) => {
      const row = document.createElement('div');
      row.className = 'item-shaped-recipe-ingredient';
      const combobox = createIngredientCombobox({
        options: recipeItemOptions, value: ingredient.value,
        ariaLabel: `Ingredient ${index + 1}`,
        optionHostClass: 'item-shaped-recipe-options-host',
        onChange: value => { ingredient.value = value; activeDialogPanel.dataset.dirty = 'true'; },
      });
      combobox.classList.add('item-shaped-recipe-combobox');
      const count = document.createElement('input');
      count.className = 'pixel-text-box item-shapeless-ingredient-count';
      count.type = 'number'; count.min = '1'; count.max = '9'; count.value = String(ingredient.count);
      count.setAttribute('aria-label', `Ingredient ${index + 1} quantity`);
      count.addEventListener('input', () => {
        ingredient.count = Math.min(9, Math.max(1, Number.parseInt(count.value, 10) || 1));
        activeDialogPanel.dataset.dirty = 'true';
      });
      const remove = document.createElement('button');
      remove.className = 'pixel-button pixel-combobox-button item-shaped-recipe-remove-ingredient';
      remove.type = 'button'; remove.setAttribute('aria-label', `Remove ingredient ${index + 1}`);
      const icon = document.createElement('img');
      icon.src = './assets/sprite/generated/dialogue_icon_2x.png'; icon.alt = ''; icon.draggable = false; remove.append(icon);
      remove.addEventListener('click', () => {
        recipe.ingredients.splice(index, 1); activeDialogPanel.dataset.dirty = 'true'; renderItemRecipes();
      });
      row.append(combobox, count, remove); list.append(row);
    });
    controls.append(heading, list); body.append(controls);
  };

  const renderProcessingRecipe = (body, recipe) => {
    const isStonecutting = recipe.type === 'stonecutting';
    recipe.yield = recipe.yield === '' || recipe.yield === null || recipe.yield === undefined
      ? ''
      : Math.min(99, Math.max(1, Number.parseInt(recipe.yield, 10) || 1));
    recipe.ingredient = String(recipe.ingredient || '');
    if (!isStonecutting) recipe.cookingTime = recipe.cookingTime === '' || recipe.cookingTime === null || recipe.cookingTime === undefined
      ? ''
      : Math.max(1, Number.parseInt(recipe.cookingTime, 10) || 1);
    const controls = document.createElement('div');
    controls.className = 'item-processing-recipe-controls';
    const addRow = (labelText, control) => {
      const row = document.createElement('div');
      row.className = 'item-processing-recipe-row dialog-labeled-row';
      const label = document.createElement('span'); label.textContent = labelText;
      row.append(label, control); controls.append(row);
    };
    const yieldInput = document.createElement('input');
    yieldInput.className = 'pixel-text-box'; yieldInput.type = 'number'; yieldInput.min = '1'; yieldInput.max = '99'; yieldInput.value = String(recipe.yield);
    yieldInput.setAttribute('aria-label', 'Recipe yield');
    yieldInput.addEventListener('input', () => { recipe.yield = yieldInput.value === '' ? '' : Math.min(99, Math.max(1, Number.parseInt(yieldInput.value, 10) || 1)); activeDialogPanel.dataset.dirty = 'true'; });
    addRow('Yield', yieldInput);
    const ingredient = createIngredientCombobox({
      options: recipeItemOptions, value: recipe.ingredient, ariaLabel: 'Input ingredient',
      optionHostClass: 'item-shaped-recipe-options-host',
      onChange: value => { recipe.ingredient = value; activeDialogPanel.dataset.dirty = 'true'; },
    });
    ingredient.classList.add('item-processing-recipe-ingredient');
    addRow('Ingredient', ingredient);
    if (!isStonecutting) {
      const time = document.createElement('input');
      time.className = 'pixel-text-box'; time.type = 'number'; time.min = '1'; time.value = String(recipe.cookingTime);
      time.setAttribute('aria-label', 'Cooking time in ticks');
      time.addEventListener('input', () => { recipe.cookingTime = time.value === '' ? '' : Math.max(1, Number.parseInt(time.value, 10) || 1); activeDialogPanel.dataset.dirty = 'true'; });
      addRow('Cooking Time', time);
    }
    body.append(controls);
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
        if (type === 'shaped') renderShapedRecipe(body, recipe);
        if (type === 'shapeless') renderShapelessRecipe(body, recipe);
        if (['smelting', 'blasting', 'smoking', 'campfire', 'stonecutting'].includes(type)) renderProcessingRecipe(body, recipe);
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
    const recipe = { type: option.dataset.itemRecipeType };
    if (recipe.type === 'shaped') Object.assign(recipe, { yield: 1, ingredients: [], pattern: Array(9).fill(null) });
    if (recipe.type === 'shapeless') Object.assign(recipe, { yield: 1, ingredients: [] });
    if (['smelting', 'blasting', 'smoking', 'campfire'].includes(recipe.type)) {
      Object.assign(recipe, { yield: '', ingredient: '', cookingTime: '' });
    }
    if (recipe.type === 'stonecutting') Object.assign(recipe, { yield: '', ingredient: '' });
    activeDialogPanel.itemRecipes.push(recipe);
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
          input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (!file) return;
            state[key] = file.name;
            state[`${key}Data`] = [...new Uint8Array(await file.arrayBuffer())];
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
    if (existingId) {
      const existingPanel = [...host.querySelectorAll('.workspace-item-editor')]
        .find(panel => panel.dataset.lastSavedId === existingId);
      if (existingPanel) {
        const existingTab = workspaceTabs.querySelector(
          `[data-workspace-panel-id="${CSS.escape(existingPanel.id)}"]`,
        );
        if (existingTab) setActiveTab(existingTab);
        return existingTab;
      }
    }
    const number = nextItemNumber;
    nextItemNumber += 1;
    const panelId = `item-workspace-${number}`;
    const fragment = template.content.cloneNode(true);
    const panel = fragment.querySelector('.workspace-item-editor');
    panel.id = panelId;
    panel.dataset.dirty = 'false';
    if (existingId) panel.dataset.lastSavedId = existingId;
    panel.itemTags = [];
    panel.itemAbilitySlots = [];
    panel.itemAbilitiesEnabled = false;
    panel.itemRecipes = [];
    panel.itemDataComponents = [];
    panel.itemCustomMethods = [];
    panel.itemFileData = {};
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
          panel.itemDataComponents = Array.isArray(data.dataComponents)
            ? data.dataComponents.map(component => ({ ...component }))
            : [];
          const enabledMethods = new Set(Array.isArray(data.enabledMethods) ? data.enabledMethods : []);
          const savedCustomMethods = Array.isArray(data.customMethods) ? data.customMethods : [];
          panel.itemCustomMethods = Object.keys(customMethodLabels)
            .filter(key => enabledMethods.has(key))
            .map(key => ({
              ...(savedCustomMethods.find(method => method.key === key) || {}),
              key,
              continuousUse: key === 'use' && enabledMethods.has('continuousUse'),
              ticks: Number(data.useDurationValue) || 32,
              useAnimation: String(data.useAnim || 'NONE'),
            }));
          for (const method of panel.querySelectorAll('[data-item-method]')) {
            method.setAttribute('aria-checked', String(enabledMethods.has(method.dataset.itemMethod)));
          }
          panel.itemTags = Array.isArray(data.tags) ? [...data.tags] : [];
          panel.itemStates = Array.isArray(data.states) && data.states.length
            ? [...data.states]
            : [];
          panel.itemFileData = {
            geoModel: Array.isArray(data.geoModelData) ? [...data.geoModelData] : null,
            displayModel: Array.isArray(data.displayModelData) ? [...data.displayModelData] : null,
          };
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
        await loadRecipeItemOptions();
        renderItemRecipes();
        positionDialogBeside(recipeDialog, dialogAction);
      } else if (dialogAction.dataset.itemDialogAction === 'tooltip') {
        openAuthoringDialog(panel, dialogAction, 'tooltip', 'Tooltip');
      } else if (dialogAction.dataset.itemDialogAction === 'dataComponents') {
        openAuthoringDialog(panel, dialogAction, 'dataComponents', 'Data Components');
        dataComponentsAddControl.hidden = false;
        await loadGlobalDataComponents();
        if (
          activeDialogPanel !== panel
          || activeAuthoringFields?.fields.dataset.itemDialogFields !== 'dataComponents'
        ) return;
        renderItemDataComponents();
        positionDialogBeside(authoringDialog, dialogAction);
      } else if (dialogAction.dataset.itemDialogAction === 'customClass') {
        openAuthoringDialog(panel, dialogAction, 'customClass', 'Custom Class');
        customMethodsAddControl.hidden = false;
        renderCustomMethods();
        positionDialogBeside(authoringDialog, dialogAction);
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
        authoringFields.dataComponents = (panel.itemDataComponents || []).map(component => ({ ...component }));
        authoringFields.tooltipUseDefaultHint = !authoringFields.tooltipCustomHint;
        if (!authoringFields.tooltipCustomHint) authoringFields.tooltipShiftHint = '';
        delete authoringFields.tooltipCustomHint;
        authoringFields.tooltipEnabled = Boolean(
          String(authoringFields.tooltipNormal || '').trim()
          || String(authoringFields.tooltipHidden || '').trim()
          || String(authoringFields.tooltipShiftHint || '').trim(),
        );
        authoringFields.customMethods = (panel.itemCustomMethods || []).map(method => ({ ...method }));
        authoringFields.enabledMethods = (panel.itemCustomMethods || []).flatMap(method => method.key === 'use' && method.continuousUse
          ? ['use', 'continuousUse', 'releaseUsing']
          : [method.key]);
        authoringFields.compiledMethods = Object.fromEntries(authoringFields.enabledMethods.map(methodKey => {
          const owner = (panel.itemCustomMethods || []).find(method => method.key === methodKey)
            || (['continuousUse', 'releaseUsing'].includes(methodKey)
              ? (panel.itemCustomMethods || []).find(method => method.key === 'use')
              : null);
          const graph = owner?.graphs?.[methodKey] || (owner?.key === methodKey ? owner?.graph : null);
          return [methodKey, compileMethodGraph(graph, methodKey)];
        }));
        const interactionMethod = (panel.itemCustomMethods || []).find(method => method.key === 'use');
        authoringFields.useDurationValue = interactionMethod?.ticks || 32;
        authoringFields.useAnim = interactionMethod?.useAnimation || 'NONE';
        authoringFields.geoTexture = holdingMode === '3d' ? textureId : String(authoringFields.geoTexture || '');
        authoringFields.geoModelData = panel.itemFileData?.geoModel || null;
        authoringFields.displayModelData = panel.itemFileData?.displayModel || null;
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

  host.addEventListener('change', async event => {
    const fileInput = event.target.closest('[data-item-file-input]');
    const file = fileInput?.files?.[0];
    if (!fileInput || !file) return;
    const panel = fileInput.closest('.workspace-item-editor');
    const key = fileInput.dataset.itemFileInput;
    panel.itemFileData ||= {};
    panel.itemFileData[key] = [...new Uint8Array(await file.arrayBuffer())];
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
    if (!recipeDialog.hidden) {
      const recipeCombobox = event.target.closest('#item-recipe-dialog .item-shaped-recipe-combobox');
      closeShapedIngredientComboboxes(recipeCombobox);
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
    if (!authoringDialog.hidden && !event.target.closest('#item-authoring-dialog, [data-item-dialog-action="tooltip"], [data-item-dialog-action="dataComponents"], [data-item-dialog-action="customClass"]')) {
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
