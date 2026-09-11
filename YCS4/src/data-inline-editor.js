const TYPE_OPTIONS = [
  { label: 'Number', value: 'double' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Text', value: 'string' },
];

const field = (label, input) => {
  const wrapper = document.createElement('label');
  wrapper.className = 'data-inline-field';
  const caption = document.createElement('span');
  caption.className = 'data-inline-field-label';
  caption.textContent = label;
  wrapper.append(caption, input);
  return wrapper;
};

const textInput = (value, label, className = '') => {
  const input = document.createElement('input');
  input.className = `pixel-text-box data-inline-input ${className}`.trim();
  input.type = 'text';
  input.value = value ?? '';
  input.setAttribute('aria-label', label);
  return input;
};

const checkbox = (checked, label) => {
  const button = document.createElement('button');
  button.className = 'pixel-checkbox data-inline-checkbox';
  button.type = 'button';
  button.setAttribute('role', 'checkbox');
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-checked', String(checked));
  button.addEventListener('click', () => {
    button.setAttribute('aria-checked', String(button.getAttribute('aria-checked') !== 'true'));
    button.dispatchEvent(new Event('change'));
  });
  return button;
};

const binaryToggle = (checked, label) => {
  const group = document.createElement('div');
  group.className = 'data-inline-boolean-toggle';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', label);
  const buttons = [
    { text: 'True', value: true },
    { text: 'False', value: false },
  ].map(entry => {
    const button = document.createElement('button');
    button.className = 'pixel-button data-inline-boolean-button';
    button.type = 'button';
    button.textContent = entry.text;
    button.dataset.value = String(entry.value);
    button.setAttribute('aria-pressed', String(checked === entry.value));
    button.addEventListener('click', () => {
      for (const peer of group.children) peer.setAttribute('aria-pressed', String(peer === button));
      group.dispatchEvent(new Event('change'));
    });
    return button;
  });
  group.append(...buttons);
  group._value = () => group.querySelector('[aria-pressed="true"]')?.dataset.value === 'true';
  return group;
};

export const attachDataTypeAddMenu = (button, onSelect) => {
  const root = document.createElement('div');
  root.className = 'workspace-create-dropdown data-inline-add-dropdown';
  const options = document.createElement('div');
  options.className = 'preferences-scale-options pixel-option-stack workspace-create-options data-inline-add-options';
  options.setAttribute('role', 'menu');
  options.hidden = true;
  for (const entry of TYPE_OPTIONS) {
    const option = document.createElement('button');
    option.className = 'pixel-option';
    option.type = 'button';
    option.setAttribute('role', 'menuitem');
    option.dataset.value = entry.value;
    option.textContent = entry.label;
    option.addEventListener('click', () => {
      options.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      onSelect(entry.value);
      button.focus();
    });
    options.append(option);
  }
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');
  button.parentElement.insertBefore(root, button);
  root.append(button, options);
  button.addEventListener('click', () => {
    options.hidden = !options.hidden;
    button.setAttribute('aria-expanded', String(!options.hidden));
    if (!options.hidden) options.firstElementChild?.focus();
  });
  options.addEventListener('keydown', event => {
    const entries = [...options.children];
    const current = entries.indexOf(event.target);
    if (event.key === 'Escape') {
      options.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      button.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      entries[(current + (event.key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length]?.focus();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (root.contains(event.target)) return;
    options.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  });
  return root;
};

export const attachDataSortMenu = (button, onSelect) => {
  const entries = [
    ['added-ascending', 'Added: Oldest First'],
    ['added-descending', 'Added: Newest First'],
    ['alphabetical-ascending', 'Alphabetical: A-Z'],
    ['alphabetical-descending', 'Alphabetical: Z-A'],
  ];
  const root = document.createElement('div');
  root.className = 'workspace-create-dropdown data-workspace-filter-dropdown data-inline-sort-dropdown';
  const options = document.createElement('div');
  options.className = 'preferences-scale-options pixel-option-stack workspace-create-options data-workspace-filter-options data-inline-sort-options';
  options.role = 'menu';
  options.hidden = true;
  let selected = entries[0][0];
  const sync = () => {
    for (const option of options.children) option.setAttribute('aria-checked', String(option.dataset.value === selected));
  };
  for (const [value, label] of entries) {
    const option = document.createElement('button');
    option.className = 'pixel-option workspace-create-option';
    option.type = 'button';
    option.role = 'menuitemradio';
    option.dataset.value = value;
    option.textContent = label;
    option.addEventListener('click', () => {
      selected = value;
      sync();
      options.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      onSelect(value);
      button.focus();
    });
    options.append(option);
  }
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');
  button.parentElement.insertBefore(root, button);
  root.append(button, options);
  button.addEventListener('click', () => {
    options.hidden = !options.hidden;
    button.setAttribute('aria-expanded', String(!options.hidden));
    if (!options.hidden) options.querySelector('[aria-checked="true"]')?.focus();
  });
  options.addEventListener('keydown', event => {
    const optionButtons = [...options.children];
    const index = optionButtons.indexOf(event.target);
    if (event.key === 'Escape') {
      options.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      button.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      optionButtons[(index + (event.key === 'ArrowDown' ? 1 : -1) + optionButtons.length) % optionButtons.length]?.focus();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (root.contains(event.target)) return;
    options.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  });
  sync();
  return root;
};

const setStatus = (row, message, isError = false) => {
  const status = row.querySelector('.data-inline-status');
  status.textContent = message;
  status.classList.toggle('data-inline-status-error', isError);
};

export const createEditableDataRow = ({ category, id = '', data = {}, addedOrder, deleteVisible, invoke, onSaved }) => {
  const row = document.createElement('div');
  row.className = 'pixel-button object-container row_container data-inline-row';
  row.dataset.addedOrder = String(addedOrder);
  row.dataset.dataId = id;
  row.dataset.sortName = String(data.name || data.titleText || id);
  row.dataset.dataType = category === 'attributes' ? 'attribute' : (data.type || 'double');

  const fields = document.createElement('div');
  fields.className = 'data-inline-fields';
  const leftFields = document.createElement('div');
  leftFields.className = 'data-inline-fields-left';
  const rightFields = document.createElement('div');
  rightFields.className = 'data-inline-fields-right';
  const name = textInput(data.name || id, 'Name', 'data-inline-name');
  leftFields.append(field('Name', name));

  if (category === 'attributes') {
    const display = textInput(data.titleText || '', 'Display Text', 'data-inline-display');
    const minimum = textInput(String(data.min ?? 0), 'Minimum', 'data-inline-number');
    const base = textInput(String(data.base ?? 0), 'Base', 'data-inline-number');
    const maximum = textInput(String(data.max ?? 100), 'Maximum', 'data-inline-number');
    const sync = checkbox(data.syncToClient !== false, 'Sync to Client');
    leftFields.append(field('Display', display));
    rightFields.append(field('Min', minimum), field('Base', base), field('Max', maximum), field('Sync', sync));
    row._readData = () => ({
      name: name.value,
      titleText: display.value,
      min: minimum.value,
      base: base.value,
      max: maximum.value,
      syncToClient: sync.getAttribute('aria-checked') === 'true',
    });
  } else {
    const type = data.type || 'double';
    const defaultText = textInput(String(data.defaultValue ?? ''), 'Default Value', 'data-inline-default');
    const defaultBoolean = binaryToggle(Boolean(data.defaultValue), 'Default Value');
    const defaultControl = document.createElement('div');
    defaultControl.className = 'data-inline-default-control';
    defaultControl.append(defaultText, defaultBoolean);
    defaultText.hidden = type === 'boolean';
    defaultBoolean.hidden = type !== 'boolean';
    if (type === 'boolean') rightFields.append(defaultControl);
    else rightFields.append(field(type === 'double' ? 'Number value' : 'Text value', defaultControl));
    row._readData = () => ({
      name: name.value,
      type,
      defaultValue: type === 'boolean'
        ? defaultBoolean._value()
        : defaultText.value,
    });
  }
  fields.append(leftFields, rightFields);

  const status = document.createElement('span');
  status.className = 'data-inline-status';
  status.setAttribute('role', 'status');
  let saveTimer = null;
  let saving = false;
  let pendingSave = false;
  const saveRow = async () => {
    if (!name.value.trim()) {
      setStatus(row, '');
      return;
    }
    if (saving) {
      pendingSave = true;
      return;
    }
    saving = true;
    setStatus(row, 'Saving…');
    try {
      const savedId = await invoke('save_data_definition', {
        category,
        previousId: row.dataset.dataId || null,
        content: JSON.stringify(row._readData()),
      });
      row.dataset.dataId = savedId;
      row.dataset.sortName = name.value.trim();
      setStatus(row, '');
      onSaved?.(row, savedId);
    } catch (error) {
      setStatus(row, String(error), true);
    } finally {
      saving = false;
      if (pendingSave) {
        pendingSave = false;
        saveRow();
      }
    }
  };
  const scheduleSave = event => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveRow, event.type === 'input' ? 450 : 0);
  };
  for (const input of fields.querySelectorAll('input')) {
    input.addEventListener('input', scheduleSave);
    input.addEventListener('change', scheduleSave);
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      clearTimeout(saveTimer);
      saveRow();
    });
  }
  for (const control of fields.querySelectorAll('.data-inline-boolean-toggle')) control.addEventListener('change', scheduleSave);
  for (const control of fields.querySelectorAll('.data-inline-checkbox')) control.addEventListener('change', scheduleSave);

  const remove = document.createElement('button');
  remove.className = 'pixel-button data-variable-delete-button';
  remove.type = 'button';
  remove.hidden = !deleteVisible;
  remove.setAttribute('aria-label', `Delete ${data.name || id || category}`);
  const icon = document.createElement('img');
  icon.className = 'data-row-delete-icon';
  icon.src = './assets/sprite/generated/dialogue_icon_2x.png';
  icon.alt = '';
  icon.draggable = false;
  remove.append(icon);
  row.append(fields, status, remove);
  return row;
};

export const deleteEditableDataRow = async (row, category, invoke) => {
  const id = row.dataset.dataId;
  if (id) await invoke('delete_data_definition', { category, id });
  row.remove();
};
