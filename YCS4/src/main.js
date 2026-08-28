import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { emitTo, listen } from '@tauri-apps/api/event';
import { initializeItemEditorPage } from './item-editor.js';
import { initializeFolderPage } from './folder-page.js';
import './styles.css';

const detachedWindowType = new URLSearchParams(window.location.search).get('window');
const detachedTextureId = new URLSearchParams(window.location.search).get('textureId') || '';
const detachedTextureVisualId = new URLSearchParams(window.location.search).get('visualId') || '';
const detachedWarningSummary = new URLSearchParams(window.location.search).get('summary') || '';
const detachedWarningPanelId = new URLSearchParams(window.location.search).get('panelId') || '';
const detachedWarningUsages = (() => {
  try {
    return JSON.parse(new URLSearchParams(window.location.search).get('usages') || '[]');
  } catch {
    return [];
  }
})();
const isDetachedTestWindow = detachedWindowType === 'test';
const isDetachedPreferencesWindow = detachedWindowType === 'preferences';
const isDetachedTextureWindow = detachedWindowType === 'texture';
const isDetachedWarningWindow = detachedWindowType === 'warning';
const isDetachedFloatingWindow = isDetachedTestWindow
  || isDetachedPreferencesWindow
  || isDetachedTextureWindow
  || isDetachedWarningWindow;
document.body.classList.toggle('detached-floating-window', isDetachedFloatingWindow);
const appWindow = getCurrentWindow();
const uiShell = document.getElementById('ui-shell');
const titlebar = document.getElementById('titlebar');
const fileMenuButton = document.getElementById('file-menu-button');
const fileMenu = document.getElementById('file-menu');
const exitOption = document.getElementById('exit-option');
const editMenuButton = document.getElementById('edit-menu-button');
const editMenu = document.getElementById('edit-menu');
const preferencesOption = document.getElementById('preferences-option');
const testOption = document.getElementById('test-option');
const dialogLayer = document.getElementById('dialog-layer');
const preferencesDialog = document.getElementById('preferences-dialog');
const preferencesTitlebar = document.getElementById('preferences-titlebar');
const preferencesDialogTitle = document.getElementById('preferences-dialog-title');
const preferencesClose = document.getElementById('preferences-close');
const preferencesBody = document.getElementById('preferences-body');
const testBody = document.getElementById('test-body');
const uiScaleDropdown = document.getElementById('ui-scale');
const uiScaleButton = document.getElementById('ui-scale-button');
const uiScaleValue = document.getElementById('ui-scale-value');
const uiScaleOptions = document.getElementById('ui-scale-options');
const uiScaleOptionButtons = [...uiScaleOptions.querySelectorAll('[data-scale]')];
const testDropdown = document.getElementById('test-dropdown');
const testDropdownButton = document.getElementById('test-dropdown-button');
const testDropdownValue = document.getElementById('test-dropdown-value');
const testDropdownOptions = document.getElementById('test-dropdown-options');
const testDropdownOptionButtons = [
  ...testDropdownOptions.querySelectorAll('[data-test-option]'),
];
const testCombobox = document.getElementById('test-combobox');
const testComboboxInput = document.getElementById('test-combobox-input');
const testComboboxButton = document.getElementById('test-combobox-button');
const testComboboxOptions = document.getElementById('test-combobox-options');
const testComboboxOptionButtons = [
  ...testComboboxOptions.querySelectorAll('[data-combobox-option]'),
];
const testValueSlider = document.getElementById('test-value-slider');
const testHexControl = document.getElementById('test-hex');
const testHexInput = document.getElementById('test-hex-input');
const hexColorDialog = document.getElementById('hex-color-dialog');
const hexColorDialogPreview = hexColorDialog.querySelector('.hex-color-dialog-preview');
const hexColorDialogValue = document.getElementById('hex-color-dialog-value');
const hexColorPicker = document.getElementById('hex-color-picker');
const hexHueSliderInput = document.getElementById('hex-hue-slider-input');
const hexHueSlider = hexHueSliderInput.closest('.hex-hue-slider');
const hexChannelInputs = [...hexColorDialog.querySelectorAll('[data-hex-channel]')];
const testCheckbox = document.getElementById('test-checkbox');
const testToggleButton = document.getElementById('test-toggle-button');
const testAddTabButton = document.getElementById('test-add-tab-button');
const workspaceTabs = document.getElementById('workspace-tabs');
const homeTab = document.getElementById('home-tab');
const homeWorkspace = document.getElementById('home-workspace');
const primaryWorkspaceTabLabel = document.getElementById('primary-workspace-tab-label');
const workspaceTabsPrevious = document.getElementById('workspace-tabs-previous');
const workspaceTabsNext = document.getElementById('workspace-tabs-next');
const workspaceTabDirectionsLeft = document.getElementById('workspace-tab-directions-left');
const workspaceTabDirectionsRight = document.getElementById('workspace-tab-directions-right');
const workspaceCreateButton = document.getElementById('workspace-create-button');
const workspaceCreateOptions = document.getElementById('workspace-create-options');
const workspaceTopControls = document.querySelector('.workspace-top-controls');
const workspaceSearchInput = document.getElementById('workspace-search-input');
const workspaceSearchButton = document.getElementById('workspace-search-button');
const workspaceCreateOptionButtons = [
  ...workspaceCreateOptions.querySelectorAll('[data-workspace-create-option]'),
];
const workspaceCreateModeItems = [
  ...workspaceCreateOptions.querySelectorAll('[data-workspace-create-mode]'),
];
const workspaceObjectGrid = document.getElementById('workspace-object-grid');
const workspaceInnerContainer = document.querySelector('.workspace-inner-container');
const workspaceItemEditors = document.getElementById('workspace-item-editors');
const itemEditorTemplate = document.getElementById('item-editor-template');
const workspaceObjectScrollbar = document.getElementById('workspace-object-scrollbar');
const workspaceObjectScrollbarThumb = document.getElementById('workspace-object-scrollbar-thumb');
const runClientTaskButton = document.getElementById('run-client-task-button');
const runDataTaskButton = document.getElementById('run-data-task-button');
const taskOutputButton = document.getElementById('task-output-button');
const workspaceTaskTerminal = document.getElementById('workspace-task-terminal');
const workspaceTaskTerminalTitle = document.getElementById('workspace-task-terminal-title');
const workspaceTaskTerminalOutput = document.getElementById('workspace-task-terminal-output');
const workspaceTaskTerminalResizeHandle = document.getElementById('workspace-task-terminal-resize-handle');
const workspaceObjectContextMenu = document.getElementById('workspace-object-context-menu');
const workspaceObjectCutOption = document.getElementById('workspace-object-cut-option');
const workspaceObjectPasteOption = document.getElementById('workspace-object-paste-option');
const workspaceObjectContextDivider = document.getElementById('workspace-object-context-divider');
const workspaceObjectNewMenu = document.getElementById('workspace-object-new-menu');
const workspaceObjectNewOption = document.getElementById('workspace-object-new-option');
const workspaceObjectNewOptions = document.getElementById('workspace-object-new-options');
const workspaceObjectDeleteOption = document.getElementById('workspace-object-delete-option');
const workspaceObjectRenameOption = document.getElementById('workspace-object-rename-option');
const textureImportDialog = document.getElementById('texture-import-dialog');
const textureImportTitlebar = document.getElementById('texture-import-titlebar');
const textureImportClose = document.getElementById('texture-import-close');
const textureImportName = document.getElementById('texture-import-name');
const textureImportId = document.getElementById('texture-import-id');
const textureImportFilterButton = document.getElementById('texture-import-filter-button');
const textureFilterDialog = document.getElementById('texture-filter-dialog');
const textureFilterPreview = document.getElementById('texture-filter-preview');
const textureFilterSearchInput = document.getElementById('texture-filter-search-input');
const textureFilterSearchButton = document.getElementById('texture-filter-search-button');
const textureFilterOptions = document.getElementById('texture-filter-options');
const textureFilterOptionButtons = [...textureFilterOptions.querySelectorAll('[data-texture-filter-value]')];
const textureFilterSelectedValues = new Set();
const textureImportSpritesheet = document.getElementById('texture-import-spritesheet');
const textureImportSpritesheetFields = document.getElementById('texture-import-spritesheet-fields');
const textureImportRows = document.getElementById('texture-import-rows');
const textureImportDefaultFrame = document.getElementById('texture-import-default-frame');
const textureImportAnimated = document.getElementById('texture-import-animated');
const textureImportAnimationFields = document.getElementById('texture-import-animation-fields');
const textureImportTicksPerFrame = document.getElementById('texture-import-ticks-per-frame');
const textureImportStatus = document.getElementById('texture-import-status');
const textureImportPreviewCanvas = document.getElementById('texture-import-preview-canvas');
const textureImportSave = document.getElementById('texture-import-save');
const textureImportCancel = document.getElementById('texture-import-cancel');
const textureImportFileButtons = [...document.querySelectorAll('[data-texture-file]')];
const textureImportFileInputs = [...document.querySelectorAll('[data-texture-file-input]')];
const warningDialog = document.getElementById('warning-dialog');
const warningTitlebar = document.getElementById('warning-titlebar');
const warningDialogBody = warningDialog.querySelector('.warning-dialog-body');
const warningDialogSummary = document.getElementById('warning-dialog-summary');
const warningDialogUsageList = document.getElementById('warning-dialog-usage-list');
const warningDialogOkay = document.getElementById('warning-dialog-okay');
const warningDialogSave = document.getElementById('warning-dialog-save');
const warningDialogCancel = document.getElementById('warning-dialog-cancel');
const warningClose = document.getElementById('warning-close');
const confirmDialog = document.getElementById('confirm-dialog');
const confirmTitlebar = document.getElementById('confirm-titlebar');
const confirmDialogTitle = document.getElementById('confirm-dialog-title');
const confirmDialogMessage = document.getElementById('confirm-dialog-message');
const confirmDialogYes = document.getElementById('confirm-dialog-yes');
const confirmDialogNo = document.getElementById('confirm-dialog-no');
const confirmClose = document.getElementById('confirm-close');
let pendingFolderDeleteShell = null;
let cutWorkspaceObjectShell = null;
let contextTargetGrid = null;
const dialogSizeStorageKey = 'ycs4.preferences-dialog-size';
const uiScaleStorageKey = 'ycs4.ui-scale-percent';
const taskTerminalHeightStorageKey = 'ycs4.task-terminal-height';
const workspaceLayoutStorageKey = 'ycs4.workspace-layout';
const allowedUiScalePercentages = new Set([100, 200, 300, 400, 500]);
const minimumDialogWidth = 180;
const minimumDialogHeight = 120;
let dialogDragState = null;
let confirmDialogDragState = null;
let warningDialogDragState = null;
let warningSaveAction = null;
let warningCancelAction = null;
let textureImportTargetGrid = null;
let textureImportEditingShell = null;
let dialogResizeState = null;
let testDropdownSelection = 'Option 1';
let testComboboxSelection = 'Option 1';
let testHexValue = '7C5CFC';
let hexPickerPointerId = null;
let testColorHue = 255;
let detachedTestWindowOpening = false;
let detachedPreferencesWindowOpening = false;
let detachedTextureWindowOpening = false;
let detachedWarningWindowOpening = false;
let preferencesModalOwnerLabels = [];
let textureModalOwnerLabels = [];
let warningModalOwnerLabels = [];
let nextWorkspaceTabNumber = 1;
let nextObjectContainerNumber = 1;
let draggedWorkspaceTab = null;
let draggedWorkspaceObjectShell = null;
let suppressWorkspaceObjectClick = false;
let taskTerminalResizeState = null;
let contextObjectShell = null;
let isRestoringWorkspaceLayout = false;
const workspaceObjectFolderParents = new WeakMap();
const testColor = { r: 124, g: 92, b: 252, a: 128 };
const textureImportFiles = new Map();
let textureImportPreviewUrl = '';
let textureImportPreviewImage = null;
const textureShellPreviewUrls = new WeakMap();

const readStoredUiScale = () => {
  try {
    const storedScale = Number.parseInt(localStorage.getItem(uiScaleStorageKey), 10);
    return allowedUiScalePercentages.has(storedScale) ? storedScale : 200;
  } catch {
    return 200;
  }
};

let uiScalePercent = readStoredUiScale();

const syncUiScaleControl = () => {
  uiScaleValue.textContent = `${uiScalePercent}%`;
  for (const option of uiScaleOptionButtons) {
    option.setAttribute('aria-selected', String(Number(option.dataset.scale) === uiScalePercent));
  }
};

syncUiScaleControl();

const getUiScaleFactor = () => uiScalePercent / 200;

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const syncWorkspaceObjectScrollbar = () => {
  const viewportSize = workspaceObjectGrid.clientHeight;
  const contentSize = workspaceObjectGrid.scrollHeight;
  const hasOverflow = !workspaceObjectGrid.hidden && contentSize > viewportSize + 0.5;
  workspaceObjectScrollbar.hidden = !hasOverflow;
  if (!hasOverflow) return;

  const trackSize = workspaceObjectScrollbar.clientHeight;
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
    ? (workspaceObjectGrid.scrollTop / scrollRange) * travel
    : 0;
  workspaceObjectScrollbarThumb.style.height = `${thumbSize}px`;
  workspaceObjectScrollbarThumb.style.top = `${thumbPosition}px`;
};

let workspaceObjectScrollbarDragState = null;

workspaceObjectScrollbar.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  syncWorkspaceObjectScrollbar();

  const trackBounds = workspaceObjectScrollbar.getBoundingClientRect();
  const thumbBounds = workspaceObjectScrollbarThumb.getBoundingClientRect();
  const scrollRange = workspaceObjectGrid.scrollHeight - workspaceObjectGrid.clientHeight;
  const travel = Math.max(0, trackBounds.height - thumbBounds.height);

  if (event.target !== workspaceObjectScrollbarThumb) {
    const centeredPosition = event.clientY - trackBounds.top - (thumbBounds.height / 2);
    workspaceObjectGrid.scrollTop = (travel > 0 ? clamp(centeredPosition / travel, 0, 1) : 0)
      * scrollRange;
    syncWorkspaceObjectScrollbar();
    return;
  }

  workspaceObjectScrollbarDragState = {
    pointerId: event.pointerId,
    startPointer: event.clientY,
    startScroll: workspaceObjectGrid.scrollTop,
    scrollRange,
    travel,
  };
  workspaceObjectScrollbar.setPointerCapture(event.pointerId);
});

workspaceObjectScrollbar.addEventListener('pointermove', event => {
  if (workspaceObjectScrollbarDragState?.pointerId !== event.pointerId) return;
  const pointerDelta = event.clientY - workspaceObjectScrollbarDragState.startPointer;
  const scrollDelta = workspaceObjectScrollbarDragState.travel > 0
    ? (pointerDelta / workspaceObjectScrollbarDragState.travel)
      * workspaceObjectScrollbarDragState.scrollRange
    : 0;
  workspaceObjectGrid.scrollTop = workspaceObjectScrollbarDragState.startScroll + scrollDelta;
});

const stopWorkspaceObjectScrollbarDrag = event => {
  if (workspaceObjectScrollbarDragState?.pointerId !== event.pointerId) return;
  workspaceObjectScrollbarDragState = null;
};

workspaceObjectScrollbar.addEventListener('pointerup', stopWorkspaceObjectScrollbarDrag);
workspaceObjectScrollbar.addEventListener('pointercancel', stopWorkspaceObjectScrollbarDrag);
workspaceObjectGrid.addEventListener('scroll', syncWorkspaceObjectScrollbar, { passive: true });

const workspaceObjectResizeObserver = new ResizeObserver(syncWorkspaceObjectScrollbar);
workspaceObjectResizeObserver.observe(workspaceObjectGrid);
const workspaceObjectMutationObserver = new MutationObserver(
  () => requestAnimationFrame(syncWorkspaceObjectScrollbar),
);
workspaceObjectMutationObserver.observe(workspaceObjectGrid, { childList: true, subtree: true });
requestAnimationFrame(syncWorkspaceObjectScrollbar);

const snapCssValueToPhysicalPixel = value => {
  const displayScale = (window.devicePixelRatio || 1) * getUiScaleFactor();
  return Math.round(value * displayScale) / displayScale;
};

const dialogScrollbarSyncers = [];
const dialogScrollbarObservers = [];

const initializeDialogOverlayScrollbars = () => {
  for (const scroller of document.querySelectorAll('.floating-dialog-body, [data-dialog-overlay-scroller]')) {
    const host = document.createElement('div');
    host.className = 'floating-dialog-body-scroll-host';
    if (scroller.hasAttribute('data-dialog-overlay-scroller')) {
      host.classList.add('dialog-overlay-scroll-host-inline');
    }
    scroller.before(host);
    host.append(scroller);

    const createScrollbar = axis => {
      const scrollbar = document.createElement('div');
      const thumb = document.createElement('div');
      scrollbar.className = `dialog-overlay-scrollbar dialog-overlay-scrollbar-${axis}`;
      scrollbar.setAttribute('aria-hidden', 'true');
      thumb.className = 'dialog-overlay-scrollbar-thumb';
      scrollbar.append(thumb);
      host.append(scrollbar);
      return { scrollbar, thumb };
    };

    const vertical = createScrollbar('vertical');
    const horizontal = createScrollbar('horizontal');
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
      const viewportSize = scroller[axis.clientSize];
      const contentSize = scroller[axis.scrollSize];
      const hasOverflow = contentSize > viewportSize + 0.5;
      axis.scrollbar.hidden = !hasOverflow;
      if (!hasOverflow) return;

      const trackSize = axis.scrollbar[axis.trackSize];
      const artPixel = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--ycs-pixel-2x'),
      ) || 2;
      const minimumThumbSize = Math.min(trackSize, 6 * artPixel);
      const thumbSize = Math.min(
        trackSize,
        Math.max(minimumThumbSize, trackSize * (viewportSize / Math.max(1, contentSize))),
      );
      const scrollRange = Math.max(0, contentSize - viewportSize);
      const travel = Math.max(0, trackSize - thumbSize);
      const thumbPosition = scrollRange > 0
        ? (scroller[axis.scrollOffset] / scrollRange) * travel
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
        const scrollRange = Math.max(0, scroller[axis.scrollSize] - scroller[axis.clientSize]);
        const travel = Math.max(0, trackBounds[axis.rectSize] - thumbBounds[axis.rectSize]);

        if (event.target !== axis.thumb) {
          const pointerInTrack = event[axis.pointerPosition] - trackBounds[axis.rectStart];
          const centeredPosition = pointerInTrack - (thumbBounds[axis.rectSize] / 2);
          const fraction = travel > 0 ? clamp(centeredPosition / travel, 0, 1) : 0;
          scroller[axis.scrollOffset] = fraction * scrollRange;
          syncAxis(axis);
          return;
        }

        dragState = {
          pointerId: event.pointerId,
          startPointer: event[axis.pointerPosition],
          startScroll: scroller[axis.scrollOffset],
          scrollRange,
          travel,
        };
        axis.scrollbar.setPointerCapture(event.pointerId);
      });

      axis.scrollbar.addEventListener('pointermove', event => {
        if (dragState?.pointerId !== event.pointerId) return;
        const pointerDelta = event[axis.pointerPosition] - dragState.startPointer;
        const scrollDelta = dragState.travel > 0
          ? (pointerDelta / dragState.travel) * dragState.scrollRange
          : 0;
        scroller[axis.scrollOffset] = dragState.startScroll + scrollDelta;
      });

      const stopDrag = event => {
        if (dragState?.pointerId !== event.pointerId) return;
        dragState = null;
      };
      axis.scrollbar.addEventListener('pointerup', stopDrag);
      axis.scrollbar.addEventListener('pointercancel', stopDrag);
    }

    scroller.addEventListener('scroll', sync, { passive: true });
    const resizeObserver = new ResizeObserver(sync);
    resizeObserver.observe(host);
    const mutationObserver = new MutationObserver(() => requestAnimationFrame(sync));
    mutationObserver.observe(scroller, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    dialogScrollbarObservers.push(resizeObserver, mutationObserver);
    dialogScrollbarSyncers.push(sync);
    requestAnimationFrame(sync);
  }
};

const syncDialogOverlayScrollbars = () => {
  for (const sync of dialogScrollbarSyncers) sync();
};

initializeDialogOverlayScrollbars();

const syncPixelArtScale = () => {
  const displayScale = window.devicePixelRatio || 1;
  const uiScaleFactor = getUiScaleFactor();
  const requestedCssPixelsPerArtPixel = uiScalePercent / 100;
  const physicalPixelsPer2xPixel = Math.max(
    1,
    Math.floor(requestedCssPixelsPerArtPixel * displayScale + 0.0001),
  );
  const cssPixelsPer2xPixel = physicalPixelsPer2xPixel / (displayScale * uiScaleFactor);
  const rootStyle = document.documentElement.style;
  uiShell.style.width = '100%';
  uiShell.style.height = '100%';
  uiShell.style.zoom = String(uiScaleFactor);
  rootStyle.setProperty('--ycs-pixel-2x', `${cssPixelsPer2xPixel}px`);
  rootStyle.setProperty('--ycs-button-border-side', `${cssPixelsPer2xPixel * 2}px`);
  rootStyle.setProperty('--ycs-button-border-bottom', `${cssPixelsPer2xPixel * 4}px`);
  rootStyle.setProperty('--ycs-button-toggled-border-top', `${cssPixelsPer2xPixel * 4}px`);
  rootStyle.setProperty('--ycs-button-toggled-border-bottom', `${cssPixelsPer2xPixel * 2}px`);
  rootStyle.setProperty('--ycs-button-min-height', `${cssPixelsPer2xPixel * 16}px`);
  rootStyle.setProperty('--ycs-text-box-border', `${cssPixelsPer2xPixel * 3}px`);
  rootStyle.setProperty('--ycs-checkbox-size', `${cssPixelsPer2xPixel * 9}px`);
  rootStyle.setProperty('--ycs-option-border-side', `${cssPixelsPer2xPixel * 2}px`);
  rootStyle.setProperty('--ycs-option-border-bottom', `${cssPixelsPer2xPixel * 4}px`);
  rootStyle.setProperty('--ycs-tab-border', `${cssPixelsPer2xPixel * 2}px`);
  rootStyle.setProperty('--ycs-workspace-border-top', `${cssPixelsPer2xPixel * 2}px`);
  rootStyle.setProperty('--ycs-workspace-border-left', `${cssPixelsPer2xPixel * 2}px`);
  rootStyle.setProperty('--ycs-window-border-side', `${cssPixelsPer2xPixel * 2}px`);
  rootStyle.setProperty('--ycs-window-border-bottom', `${cssPixelsPer2xPixel * 4}px`);
  rootStyle.setProperty('--ycs-window-title-border-top', `${cssPixelsPer2xPixel * 3}px`);
  rootStyle.setProperty('--ycs-window-title-border-right', `${cssPixelsPer2xPixel * 2}px`);
  rootStyle.setProperty('--ycs-window-title-border-bottom', `${cssPixelsPer2xPixel}px`);
  rootStyle.setProperty('--ycs-window-title-border-left', `${cssPixelsPer2xPixel * 2}px`);
  rootStyle.setProperty('--ycs-dialog-title-height', `${cssPixelsPer2xPixel * 16}px`);
  rootStyle.setProperty('--ycs-dialog-title-padding', `${cssPixelsPer2xPixel}px`);
  rootStyle.setProperty('--ycs-dialog-title-margin', `${cssPixelsPer2xPixel * 2}px`);
  rootStyle.setProperty('--ycs-dialog-button-width', `${cssPixelsPer2xPixel * 11}px`);
  rootStyle.setProperty('--ycs-dialog-button-height', `${cssPixelsPer2xPixel * 12}px`);
  rootStyle.setProperty('--ycs-dialog-button-padding', `${cssPixelsPer2xPixel}px`);
  rootStyle.setProperty('--ycs-dialog-button-border-side', `${cssPixelsPer2xPixel * 2}px`);
  rootStyle.setProperty('--ycs-dialog-button-border-bottom', `${cssPixelsPer2xPixel * 3}px`);
  rootStyle.setProperty('--ycs-dialog-icon-size', `${cssPixelsPer2xPixel * 5}px`);
};

const setUiScaleOptionsOpen = (open, focusSelected = false) => {
  uiScaleOptions.hidden = !open;
  uiScaleButton.setAttribute('aria-expanded', String(open));
  if (!open || !focusSelected) return;
  const selectedOption = uiScaleOptionButtons.find(
    option => Number(option.dataset.scale) === uiScalePercent,
  );
  (selectedOption || uiScaleOptionButtons[0])?.focus();
};

const syncTestDropdownControl = () => {
  testDropdownValue.textContent = testDropdownSelection;
  for (const option of testDropdownOptionButtons) {
    option.setAttribute(
      'aria-selected',
      String(option.dataset.testOption === testDropdownSelection),
    );
  }
};

const setTestDropdownOpen = (open, focusSelected = false) => {
  testDropdownOptions.hidden = !open;
  testDropdownButton.setAttribute('aria-expanded', String(open));
  if (!open || !focusSelected) return;
  const selectedOption = testDropdownOptionButtons.find(
    option => option.dataset.testOption === testDropdownSelection,
  );
  (selectedOption || testDropdownOptionButtons[0])?.focus();
};

const syncTestComboboxControl = () => {
  testComboboxInput.value = testComboboxSelection;
  for (const option of testComboboxOptionButtons) {
    option.setAttribute(
      'aria-selected',
      String(option.dataset.comboboxOption === testComboboxSelection),
    );
  }
};

const filterTestComboboxOptions = query => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleOptions = [];

  for (const option of testComboboxOptionButtons) {
    const matches = !normalizedQuery
      || option.dataset.comboboxOption.toLocaleLowerCase().includes(normalizedQuery);
    option.hidden = !matches;
    delete option.dataset.stackPosition;
    if (matches) visibleOptions.push(option);
  }

  for (const [index, option] of visibleOptions.entries()) {
    if (visibleOptions.length === 1) option.dataset.stackPosition = 'only';
    else if (index === 0) option.dataset.stackPosition = 'first';
    else if (index === visibleOptions.length - 1) option.dataset.stackPosition = 'last';
    else option.dataset.stackPosition = 'middle';
  }

  return visibleOptions;
};

const setTestComboboxOpen = (open, focusSelected = false) => {
  testComboboxOptions.hidden = !open;
  testComboboxButton.setAttribute('aria-expanded', String(open));
  if (!open || !focusSelected) return;
  const selectedOption = testComboboxOptionButtons.find(
    option => !option.hidden && option.dataset.comboboxOption === testComboboxSelection,
  );
  (selectedOption || testComboboxOptionButtons.find(option => !option.hidden))?.focus();
};

const setWorkspaceCreateOptionsOpen = (open, focusFirst = false) => {
  workspaceCreateOptions.hidden = !open;
  workspaceCreateButton.setAttribute('aria-expanded', String(open));
  if (open && focusFirst) {
    workspaceCreateOptionButtons.find(option => !option.hidden)?.focus();
  }
};

const setWorkspaceCreateMode = mode => {
  setWorkspaceCreateOptionsOpen(false);
  for (const item of workspaceCreateModeItems) {
    const modes = (item.dataset.workspaceCreateMode || '').split(/\s+/);
    item.hidden = !modes.includes(mode);
  }
  const visibleOptions = workspaceCreateOptionButtons.filter(option => !option.hidden);
  for (const option of workspaceCreateOptionButtons) delete option.dataset.stackPosition;
  for (const [index, option] of visibleOptions.entries()) {
    option.dataset.stackPosition = visibleOptions.length === 1
      ? 'only'
      : index === 0
        ? 'first'
        : index === visibleOptions.length - 1
          ? 'last'
          : 'middle';
  }
  workspaceCreateButton.setAttribute('aria-label', 'Create');
};

const getNextFolderName = (grid = workspaceObjectGrid) => {
  const targetGrid = grid || workspaceObjectGrid;
  const existingLabels = [...targetGrid.querySelectorAll(':scope > .workspace-object-shell[data-object-type="Folder"] > .workspace-object-label')]
    .map(el => el.textContent.trim());
  if (!existingLabels.includes('Folder')) return 'Folder';
  let num = 2;
  while (existingLabels.includes(`Folder ${num}`)) {
    num += 1;
  }
  return `Folder ${num}`;
};

const getNextContainerName = (prefix = 'Container', grid = workspaceObjectGrid) => {
  const targetGrid = grid || workspaceObjectGrid;
  const existingLabels = [...targetGrid.querySelectorAll(':scope > .workspace-object-shell:not([data-object-type="Folder"]) > .workspace-object-label')]
    .map(el => el.textContent.trim());
  let count = 1;
  let name = `${prefix} ${count}`;
  while (existingLabels.includes(name)) {
    count += 1;
    name = `${prefix} ${count}`;
  }
  return name;
};

const addObjectContainer = (type = 'Item', mode = 'home', targetGrid = workspaceObjectGrid, customLabel = null) => {
  const number = nextObjectContainerNumber;
  nextObjectContainerNumber += 1;

  const grid = targetGrid || workspaceObjectGrid;
  let labelText = customLabel;
  if (!labelText) {
    if (type === 'Folder') {
      labelText = getNextFolderName(grid);
    } else if (type === 'Test') {
      labelText = getNextContainerName('Container', grid);
    } else {
      labelText = getNextContainerName(type, grid);
    }
  }

  const shell = document.createElement('div');
  shell.className = 'workspace-object-shell';
  shell.dataset.workspaceMode = mode;
  shell.dataset.workspaceObjectNumber = String(number);
  shell.dataset.workspaceVisualId = `visual-${Date.now()}-${number}`;
  shell.dataset.objectType = type;
  shell.setAttribute('draggable', 'true');
  shell.hidden = mode !== (homeTab.dataset.workspaceMode || 'home');

  const button = document.createElement('button');
  button.className = type === 'Folder'
    ? 'workspace-object folder-object'
    : 'pixel-button workspace-object object-container';
  button.type = 'button';
  button.setAttribute('draggable', 'true');
  button.dataset.objectType = type;
  button.setAttribute('aria-label', labelText);

  if (type === 'Folder') {
    const folderVisual = document.createElement('span');
    folderVisual.className = 'object-folder-visual';
    folderVisual.setAttribute('aria-hidden', 'true');

    const folderBackground = document.createElement('span');
    folderBackground.className = 'object-folder-layer object-folder-background';

    const folderContent = document.createElement('span');
    folderContent.className = 'object-folder-content';

    const folderFront = document.createElement('span');
    folderFront.className = 'object-folder-layer object-folder-front';

    folderVisual.append(folderBackground, folderContent, folderFront);
    button.append(folderVisual);
  } else if (type === 'Texture' || type === 'Item') {
    const preview = document.createElement('img');
    preview.className = 'object-container-texture-preview';
    preview.alt = '';
    preview.draggable = false;
    button.append(preview);
  }

  const label = document.createElement('span');
  label.className = 'workspace-object-label';
  label.textContent = labelText;
  label.title = labelText;

  shell.append(button, label);
  grid.append(shell);
  if (grid.workspaceFolderOwner) {
    workspaceObjectFolderParents.set(shell, grid.workspaceFolderOwner);
    refreshFolderPreview(grid.workspaceFolderOwner);
  }
  persistWorkspaceLayout();
  return button;
};

let isSearchingPrimaryWorkspace = false;
const primarySearchResultSources = new WeakMap();
const resolvePrimarySearchResult = shell => primarySearchResultSources.get(shell) || shell;

const clearPrimarySearchResults = () => {
  for (const result of workspaceObjectGrid.querySelectorAll(':scope > .workspace-search-result')) {
    result.remove();
  }
};

const collectWorkspaceHierarchyShells = (grid = workspaceObjectGrid, results = []) => {
  for (const shell of grid.querySelectorAll(':scope > .workspace-object-shell')) {
    if (shell.classList.contains('workspace-search-result')) continue;
    results.push(shell);
    if (shell.dataset.objectType === 'Folder') {
      collectWorkspaceHierarchyShells(getFolderContentHost(shell), results);
    }
  }
  return results;
};

function syncPrimaryWorkspaceObjects() {
  const mode = homeTab.dataset.workspaceMode || 'home';
  const query = workspaceSearchInput.value.trim().toLocaleLowerCase();

  if (query) {
    isSearchingPrimaryWorkspace = true;
    clearPrimarySearchResults();

    const allShells = collectWorkspaceHierarchyShells();
    for (const shell of allShells) {
      if (
        shell.closest('.object-folder-preview')
        || shell.classList.contains('object-folder-preview')
      ) continue;

      const label = shell.querySelector('.workspace-object-label')?.textContent || '';
      const objectButton = shell.querySelector('.workspace-object');
      const matchesMode = shell.dataset.workspaceMode === mode;
      const matchesQuery = label.toLocaleLowerCase().includes(query)
        || objectButton?.getAttribute('aria-label')?.toLocaleLowerCase().includes(query)
        || shell.dataset.workspaceReferenceId?.toLocaleLowerCase().includes(query)
        || (shell.dataset.objectType && shell.dataset.objectType.toLocaleLowerCase().includes(query));

      if (matchesMode && matchesQuery) {
        if (shell.parentElement === workspaceObjectGrid) {
          shell.hidden = false;
        } else {
          const result = shell.cloneNode(true);
          result.classList.add('workspace-search-result');
          result.removeAttribute('draggable');
          result.querySelectorAll('[draggable]').forEach(element => element.removeAttribute('draggable'));
          result.hidden = false;
          primarySearchResultSources.set(result, shell);
          workspaceObjectGrid.append(result);
        }
      } else if (shell.parentElement === workspaceObjectGrid) {
        shell.hidden = true;
      }
    }
  } else {
    if (isSearchingPrimaryWorkspace) {
      clearPrimarySearchResults();
      isSearchingPrimaryWorkspace = false;
    }

    for (const shell of workspaceObjectGrid.querySelectorAll(':scope > .workspace-object-shell')) {
      const matchesMode = shell.dataset.workspaceMode === mode;
      shell.hidden = !matchesMode;
    }
  }

  requestAnimationFrame(syncWorkspaceObjectScrollbar);
}

workspaceSearchInput.value = '';
workspaceSearchInput.setAttribute('autocomplete', 'off');
workspaceSearchInput.setAttribute('autocorrect', 'off');
workspaceSearchInput.setAttribute('autocapitalize', 'off');
workspaceSearchInput.setAttribute('spellcheck', 'false');
workspaceSearchInput.addEventListener('input', syncPrimaryWorkspaceObjects);
workspaceSearchButton.addEventListener('click', syncPrimaryWorkspaceObjects);
setWorkspaceCreateMode(homeTab.dataset.workspaceMode || 'home');
syncPrimaryWorkspaceObjects();

const configureDetachedDialog = mode => {
  const showingPreferences = mode === 'preferences';
  const showingTexture = mode === 'texture';
  const showingWarning = mode === 'warning';
  preferencesDialog.hidden = showingTexture || showingWarning;
  textureImportDialog.hidden = !showingTexture;
  warningDialog.hidden = !showingWarning;
  if (showingWarning) {
    showInlineWarningDialog({
      summary: detachedWarningSummary,
      usages: Array.isArray(detachedWarningUsages) ? detachedWarningUsages : [],
      saveAction: detachedWarningPanelId
        ? () => emitTo('main', 'ycs4:warning-save', { panelId: detachedWarningPanelId })
        : null,
      cancelAction: detachedWarningPanelId
        ? () => emitTo('main', 'ycs4:warning-discard', { panelId: detachedWarningPanelId })
        : null,
    });
    return;
  }
  if (showingTexture) {
    openTextureImportDialog();
    requestAnimationFrame(syncDialogOverlayScrollbars);
    return;
  }
  preferencesBody.hidden = !showingPreferences;
  testBody.hidden = showingPreferences;
  preferencesDialogTitle.textContent = showingPreferences ? 'Preferences' : 'Test';
  preferencesClose.setAttribute(
    'aria-label',
    showingPreferences ? 'Close Preferences' : 'Close Test',
  );
  setUiScaleOptionsOpen(false);
  setTestDropdownOpen(false);
  setTestComboboxOpen(false);
  hexColorDialog.hidden = true;
  requestAnimationFrame(syncDialogOverlayScrollbars);
};

syncTestDropdownControl();
syncTestComboboxControl();
filterTestComboboxOptions('');

const syncPixelValueSlider = input => {
  const control = input.closest('.pixel-value-slider');
  const minimum = Number(input.min);
  const maximum = Number(input.max);
  const value = Number(input.value);
  const percentage = ((value - minimum) / (maximum - minimum)) * 100;
  control.style.setProperty('--ycs-value-slider-fill', `${percentage}%`);
  for (const valueLabel of control.querySelectorAll('.pixel-value-slider-value')) {
    valueLabel.textContent = String(value);
  }
};

syncPixelValueSlider(testValueSlider);

const isCompleteHex = value => [3, 6].includes(value.length);

const channelToHex = value => Math.round(value).toString(16).padStart(2, '0').toUpperCase();

const parseHexRgb = value => {
  const expanded = value.length === 3
    ? [...value].map(character => character.repeat(2)).join('')
    : value;
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
};

const rgbToHsv = ({ r, g, b }) => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const difference = maximum - minimum;
  let hue = 0;

  if (difference !== 0) {
    if (maximum === red) hue = 60 * (((green - blue) / difference) % 6);
    else if (maximum === green) hue = 60 * (((blue - red) / difference) + 2);
    else hue = 60 * (((red - green) / difference) + 4);
  }

  if (hue < 0) hue += 360;
  return {
    h: hue,
    s: maximum === 0 ? 0 : difference / maximum,
    v: maximum,
  };
};

const hsvToRgb = (hue, saturation, value) => {
  const chroma = value * saturation;
  const section = hue / 60;
  const secondary = chroma * (1 - Math.abs((section % 2) - 1));
  let channels = [0, 0, 0];

  if (section < 1) channels = [chroma, secondary, 0];
  else if (section < 2) channels = [secondary, chroma, 0];
  else if (section < 3) channels = [0, chroma, secondary];
  else if (section < 4) channels = [0, secondary, chroma];
  else if (section < 5) channels = [secondary, 0, chroma];
  else channels = [chroma, 0, secondary];

  const match = value - chroma;
  return {
    r: Math.round((channels[0] + match) * 255),
    g: Math.round((channels[1] + match) * 255),
    b: Math.round((channels[2] + match) * 255),
  };
};

const syncHexColorPicker = () => {
  const { s, v } = rgbToHsv(testColor);
  hexColorPicker.style.setProperty(
    '--ycs-color-picker-hue',
    `hsl(${testColorHue} 100% 50%)`,
  );
  hexColorPicker.style.setProperty('--ycs-color-picker-x', `${s * 100}%`);
  hexColorPicker.style.setProperty('--ycs-color-picker-y', `${(1 - v) * 100}%`);
  hexHueSliderInput.value = String(testColorHue);
  hexHueSlider.style.setProperty(
    '--ycs-hue-slider-position',
    `${(testColorHue / 360) * 100}%`,
  );
  hexColorPicker.setAttribute(
    'aria-valuetext',
    `Saturation ${Math.round(s * 100)} percent, value ${Math.round(v * 100)} percent`,
  );
};

const syncHueFromRgb = () => {
  const { h, s, v } = rgbToHsv(testColor);
  if (s > 0 && v > 0) testColorHue = h;
};

const syncTestHexColor = () => {
  testHexValue = `${channelToHex(testColor.r)}${channelToHex(testColor.g)}${channelToHex(testColor.b)}`;
  const cssColor = `rgb(${testColor.r} ${testColor.g} ${testColor.b} / ${testColor.a / 255})`;
  const textColor = rgbToHsv(testColor).v >= 0.5
    ? 'var(--ycs-text-option-hover)'
    : 'var(--ycs-text-normal)';
  testHexControl.style.setProperty('--ycs-hex-color', cssColor);
  testHexControl.style.setProperty('--ycs-hex-text-color', textColor);
  hexColorDialogPreview.style.setProperty('--ycs-hex-color', cssColor);
  hexColorDialogPreview.style.setProperty('--ycs-hex-text-color', textColor);
  hexColorDialogValue.value = `#${testHexValue}`;
  if (document.activeElement !== testHexInput) testHexInput.value = `#${testHexValue}`;
  for (const input of hexChannelInputs) {
    input.value = String(testColor[input.dataset.hexChannel]);
    syncPixelValueSlider(input);
  }
  syncHexColorPicker();
};

const closeHexColorDialog = () => {
  hexColorDialog.hidden = true;
};

const positionHexColorDialog = () => {
  if (hexColorDialog.hidden || !testHexControl.isConnected) return;
  const fieldBounds = testHexControl.getBoundingClientRect();
  const layerBounds = dialogLayer.getBoundingClientRect();
  const uiScaleFactor = getUiScaleFactor();
  const preferredLeft = (fieldBounds.right - layerBounds.left) / uiScaleFactor
    + (2 * Number.parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--ycs-pixel-2x')));
  const preferredTop = (fieldBounds.top - layerBounds.top) / uiScaleFactor;
  hexColorDialog.style.left = `${snapCssValueToPhysicalPixel(clamp(
    preferredLeft,
    0,
    Math.max(0, dialogLayer.clientWidth - hexColorDialog.offsetWidth),
  ))}px`;
  hexColorDialog.style.top = `${snapCssValueToPhysicalPixel(clamp(
    preferredTop,
    0,
    Math.max(0, dialogLayer.clientHeight - hexColorDialog.offsetHeight),
  ))}px`;
};

const openHexColorDialog = () => {
  testHexInput.blur();
  syncTestHexColor();
  hexColorDialog.hidden = false;
  positionHexColorDialog();
  requestAnimationFrame(syncDialogOverlayScrollbars);
};

document.addEventListener('scroll', event => {
  if (event.target instanceof Node && hexColorDialog.contains(event.target)) return;
  if (!hexColorDialog.hidden) closeHexColorDialog();
}, { capture: true, passive: true });
window.addEventListener('resize', positionHexColorDialog, { passive: true });

syncTestHexColor();

const applyUiScale = requestedScale => {
  uiScalePercent = allowedUiScalePercentages.has(requestedScale) ? requestedScale : 200;
  syncUiScaleControl();
  try {
    localStorage.setItem(uiScaleStorageKey, String(uiScalePercent));
  } catch {
    // Scale persistence is optional when storage is unavailable.
  }
  syncPixelArtScale();
  if (!fileMenu.hidden) snapMenuToPhysicalPixels(fileMenu);
  if (!editMenu.hidden) snapMenuToPhysicalPixels(editMenu);
  if (!dialogLayer.hidden) constrainDialogToWorkspace();
};

const snapMenuToPhysicalPixels = menu => {
  menu.style.marginLeft = '0px';
  menu.style.marginTop = '0px';
  const scale = window.devicePixelRatio || 1;
  const bounds = menu.getBoundingClientRect();
  const snappedLeft = Math.round(bounds.left * scale) / scale;
  const snappedTop = Math.round(bounds.top * scale) / scale;
  const uiScaleFactor = getUiScaleFactor();
  menu.style.marginLeft = `${(snappedLeft - bounds.left) / uiScaleFactor}px`;
  menu.style.marginTop = `${(snappedTop - bounds.top) / uiScaleFactor}px`;
};

const setFileMenuOpen = open => {
  fileMenu.hidden = !open;
  fileMenuButton.setAttribute('aria-expanded', String(open));
  if (open) snapMenuToPhysicalPixels(fileMenu);
};

const setEditMenuOpen = open => {
  editMenu.hidden = !open;
  editMenuButton.setAttribute('aria-expanded', String(open));
  if (open) snapMenuToPhysicalPixels(editMenu);
};

const hasOpenApplicationMenu = () => !fileMenu.hidden || !editMenu.hidden;

const readStoredDialogSize = () => {
  try {
    const size = JSON.parse(localStorage.getItem(dialogSizeStorageKey));
    if (!Number.isFinite(size?.width) || !Number.isFinite(size?.height)) return null;
    return size;
  } catch {
    return null;
  }
};

const saveDialogSize = () => {
  try {
    localStorage.setItem(dialogSizeStorageKey, JSON.stringify({
      width: Math.round(preferencesDialog.offsetWidth),
      height: Math.round(preferencesDialog.offsetHeight),
    }));
  } catch {
    // Size persistence is optional when storage is unavailable.
  }
};

const normalizeDialogPosition = () => {
  const dialogRect = preferencesDialog.getBoundingClientRect();
  const layerRect = dialogLayer.getBoundingClientRect();
  const uiScaleFactor = getUiScaleFactor();
  preferencesDialog.style.transform = 'none';
  preferencesDialog.style.left = `${snapCssValueToPhysicalPixel(
    (dialogRect.left - layerRect.left) / uiScaleFactor,
  )}px`;
  preferencesDialog.style.top = `${snapCssValueToPhysicalPixel(
    (dialogRect.top - layerRect.top) / uiScaleFactor,
  )}px`;
};

const constrainDialogToWorkspace = () => {
  normalizeDialogPosition();
  const maximumWidth = Math.max(1, dialogLayer.clientWidth - 16);
  const maximumHeight = Math.max(1, dialogLayer.clientHeight - 16);
  const effectiveMinimumWidth = Math.min(minimumDialogWidth, maximumWidth);
  const effectiveMinimumHeight = Math.min(minimumDialogHeight, maximumHeight);
  const width = clamp(preferencesDialog.offsetWidth, effectiveMinimumWidth, maximumWidth);
  const height = clamp(preferencesDialog.offsetHeight, effectiveMinimumHeight, maximumHeight);

  preferencesDialog.style.width = `${snapCssValueToPhysicalPixel(width)}px`;
  preferencesDialog.style.height = `${snapCssValueToPhysicalPixel(height)}px`;
  preferencesDialog.style.left = `${snapCssValueToPhysicalPixel(clamp(
    Number.parseFloat(preferencesDialog.style.left) || 0,
    0,
    Math.max(0, dialogLayer.clientWidth - width),
  ))}px`;
  preferencesDialog.style.top = `${snapCssValueToPhysicalPixel(clamp(
    Number.parseFloat(preferencesDialog.style.top) || 0,
    0,
    Math.max(0, dialogLayer.clientHeight - height),
  ))}px`;
};

const applyStoredDialogSize = () => {
  const size = readStoredDialogSize();
  if (!size) return;
  preferencesDialog.style.width = `${size.width}px`;
  preferencesDialog.style.height = `${size.height}px`;
};

const setPreferencesDialogOpen = open => {
  preferencesDialog.hidden = !open;
  dialogLayer.hidden = !open
    && (hexColorDialog ? hexColorDialog.hidden : true)
    && (confirmDialog ? confirmDialog.hidden : true)
    && (textureImportDialog ? textureImportDialog.hidden : true);
  if (!open) return;
  applyStoredDialogSize();
  constrainDialogToWorkspace();
  requestAnimationFrame(syncDialogOverlayScrollbars);
  preferencesClose.focus();
};

const openDetachedTestWindow = async () => {
  if (detachedTestWindowOpening) return;
  detachedTestWindowOpening = true;

  try {
    const existingWindow = await WebviewWindow.getByLabel('test');
    if (existingWindow) {
      await existingWindow.unminimize();
      await existingWindow.show();
      await existingWindow.setFocus();
      return;
    }

    const storedSize = readStoredDialogSize();
    const uiScaleFactor = getUiScaleFactor();
    const baseWidth = Math.max(minimumDialogWidth, storedSize?.width || 360);
    const baseHeight = Math.max(minimumDialogHeight, storedSize?.height || 220);
    const detachedWindow = new WebviewWindow('test', {
      url: '/?window=test',
      title: 'Test',
      width: Math.round(baseWidth * uiScaleFactor),
      height: Math.round(baseHeight * uiScaleFactor),
      minWidth: Math.round(minimumDialogWidth * uiScaleFactor),
      minHeight: Math.round(minimumDialogHeight * uiScaleFactor),
      parent: 'main',
      decorations: false,
      shadow: false,
      resizable: true,
      maximizable: false,
      minimizable: false,
      skipTaskbar: true,
      center: true,
      focus: true,
    });

    detachedWindow.once('tauri://error', event => {
      console.error('Unable to create detached Test window:', event.payload);
      configureDetachedDialog('test');
      setPreferencesDialogOpen(true);
    });
  } catch (error) {
    console.error('Unable to open detached Test window:', error);
    configureDetachedDialog('test');
    setPreferencesDialogOpen(true);
  } finally {
    detachedTestWindowOpening = false;
  }
};

const setPreferencesModalOwnersEnabled = async enabled => {
  if (!enabled) {
    const windows = await WebviewWindow.getAll();
    const ownerWindows = windows.filter(windowHandle => windowHandle.label !== 'preferences');
    preferencesModalOwnerLabels = ownerWindows.map(windowHandle => windowHandle.label);
    await Promise.allSettled(ownerWindows.map(windowHandle => windowHandle.setEnabled(false)));
    return;
  }

  const ownerLabels = preferencesModalOwnerLabels;
  preferencesModalOwnerLabels = [];
  await Promise.allSettled(ownerLabels.map(async label => {
    const windowHandle = await WebviewWindow.getByLabel(label);
    if (windowHandle) await windowHandle.setEnabled(true);
  }));
  const mainWindow = await WebviewWindow.getByLabel('main');
  if (mainWindow) await mainWindow.setFocus();
};

const openDetachedPreferencesWindow = async () => {
  if (detachedPreferencesWindowOpening) return;
  detachedPreferencesWindowOpening = true;

  try {
    const existingWindow = await WebviewWindow.getByLabel('preferences');
    await setPreferencesModalOwnersEnabled(false);
    if (existingWindow) {
      await existingWindow.unminimize();
      await existingWindow.show();
      await existingWindow.setFocus();
      return;
    }

    const storedSize = readStoredDialogSize();
    const uiScaleFactor = getUiScaleFactor();
    const baseWidth = Math.max(minimumDialogWidth, storedSize?.width || 360);
    const baseHeight = Math.max(minimumDialogHeight, storedSize?.height || 220);
    const detachedWindow = new WebviewWindow('preferences', {
      url: '/?window=preferences',
      title: 'Preferences',
      width: Math.round(baseWidth * uiScaleFactor),
      height: Math.round(baseHeight * uiScaleFactor),
      minWidth: Math.round(minimumDialogWidth * uiScaleFactor),
      minHeight: Math.round(minimumDialogHeight * uiScaleFactor),
      parent: 'main',
      decorations: false,
      shadow: false,
      resizable: true,
      maximizable: false,
      minimizable: false,
      skipTaskbar: true,
      center: true,
      focus: true,
    });

    detachedWindow.once('tauri://destroyed', () => {
      setPreferencesModalOwnersEnabled(true).catch(console.error);
    });
    detachedWindow.once('tauri://error', event => {
      console.error('Unable to create detached Preferences window:', event.payload);
      configureDetachedDialog('preferences');
      setPreferencesDialogOpen(true);
    });
  } catch (error) {
    console.error('Unable to open detached Preferences window:', error);
    configureDetachedDialog('preferences');
    setPreferencesDialogOpen(true);
  } finally {
    detachedPreferencesWindowOpening = false;
  }
};

const setTextureModalOwnersEnabled = async enabled => {
  if (!enabled) {
    const windows = await WebviewWindow.getAll();
    const ownerWindows = windows.filter(windowHandle => windowHandle.label !== 'texture');
    textureModalOwnerLabels = ownerWindows.map(windowHandle => windowHandle.label);
    await Promise.allSettled(ownerWindows.map(windowHandle => windowHandle.setEnabled(false)));
    return;
  }

  const ownerLabels = textureModalOwnerLabels;
  textureModalOwnerLabels = [];
  await Promise.allSettled(ownerLabels.map(async label => {
    const windowHandle = await WebviewWindow.getByLabel(label);
    if (windowHandle) await windowHandle.setEnabled(true);
  }));
  const mainWindow = await WebviewWindow.getByLabel('main');
  if (mainWindow) await mainWindow.setFocus();
};

const openDetachedTextureWindow = async () => {
  if (detachedTextureWindowOpening) return;
  detachedTextureWindowOpening = true;
  try {
    const existingWindow = await WebviewWindow.getByLabel('texture');
    await setTextureModalOwnersEnabled(false);
    if (existingWindow) {
      await existingWindow.show();
      await existingWindow.setFocus();
      return;
    }

    const uiScaleFactor = getUiScaleFactor();
    const width = Math.round(612 * uiScaleFactor);
    const height = Math.round(440 * uiScaleFactor);
    const textureId = textureImportEditingShell?.dataset.workspaceReferenceId || '';
    const visualId = textureImportEditingShell?.dataset.workspaceVisualId || '';
    const parameters = new URLSearchParams({ window: 'texture' });
    if (textureId) parameters.set('textureId', textureId);
    if (visualId) parameters.set('visualId', visualId);
    const detachedWindow = new WebviewWindow('texture', {
      url: `/?${parameters}`,
      title: 'Texture',
      width,
      height,
      minWidth: width,
      minHeight: height,
      maxWidth: width,
      maxHeight: height,
      parent: 'main',
      decorations: false,
      shadow: false,
      resizable: false,
      maximizable: false,
      minimizable: false,
      skipTaskbar: true,
      center: true,
      focus: true,
    });
    detachedWindow.once('tauri://destroyed', () => {
      setTextureModalOwnersEnabled(true).catch(console.error);
    });
    detachedWindow.once('tauri://error', event => {
      console.error('Unable to create detached Texture window:', event.payload);
      setTextureModalOwnersEnabled(true).catch(console.error);
    });
  } catch (error) {
    console.error('Unable to open detached Texture window:', error);
    await setTextureModalOwnersEnabled(true);
  } finally {
    detachedTextureWindowOpening = false;
  }
};

const openDetachedWarningWindow = async ({ summary, usages = [], panelId = '' }) => {
  if (detachedWarningWindowOpening) return;
  detachedWarningWindowOpening = true;
  try {
    const existingWindow = await WebviewWindow.getByLabel('warning');
    if (existingWindow) await existingWindow.close();
    await setWarningModalOwnersEnabled(false);
    const uiScaleFactor = getUiScaleFactor();
    const baseHeight = 120 + (Math.min(usages.length, 10) * 15);
    const parameters = new URLSearchParams({
      window: 'warning',
      summary,
      usages: JSON.stringify(usages),
    });
    if (panelId) parameters.set('panelId', panelId);
    const width = Math.round(320 * uiScaleFactor);
    const height = Math.round(baseHeight * uiScaleFactor);
    const detachedWindow = new WebviewWindow('warning', {
      url: `/?${parameters}`,
      title: 'Warning',
      width,
      height,
      minWidth: width,
      minHeight: height,
      maxWidth: width,
      maxHeight: height,
      parent: 'main',
      alwaysOnTop: true,
      decorations: false,
      shadow: false,
      resizable: false,
      maximizable: false,
      minimizable: false,
      center: true,
      focus: true,
    });
    detachedWindow.once('tauri://destroyed', () => {
      setWarningModalOwnersEnabled(true).catch(console.error);
    });
    detachedWindow.once('tauri://error', event => {
      console.error('Unable to create detached Warning window:', event.payload);
      setWarningModalOwnersEnabled(true).catch(console.error);
      showInlineWarningDialog({
        summary,
        usages,
        saveAction: panelId
          ? () => document.getElementById(panelId)?.querySelector('[data-item-action="save"]')?.click()
          : null,
        cancelAction: panelId
          ? () => {
            const tab = workspaceTabs.querySelector(`[data-workspace-panel-id="${CSS.escape(panelId)}"]`);
            if (tab) removeWorkspaceTab(tab);
          }
          : null,
      });
    });
  } catch (error) {
    console.error('Unable to open detached Warning window:', error);
    await setWarningModalOwnersEnabled(true);
    showInlineWarningDialog({
      summary,
      usages,
      saveAction: panelId
        ? () => document.getElementById(panelId)?.querySelector('[data-item-action="save"]')?.click()
        : null,
      cancelAction: panelId
        ? () => {
          const tab = workspaceTabs.querySelector(`[data-workspace-panel-id="${CSS.escape(panelId)}"]`);
          if (tab) removeWorkspaceTab(tab);
        }
        : null,
    });
  } finally {
    detachedWarningWindowOpening = false;
  }
};

const setWarningModalOwnersEnabled = async enabled => {
  if (!enabled) {
    const windows = await WebviewWindow.getAll();
    const ownerWindows = windows.filter(windowHandle => windowHandle.label !== 'warning');
    warningModalOwnerLabels = ownerWindows.map(windowHandle => windowHandle.label);
    await Promise.allSettled(ownerWindows.map(windowHandle => windowHandle.setEnabled(false)));
    return;
  }

  const ownerLabels = warningModalOwnerLabels;
  warningModalOwnerLabels = [];
  await Promise.allSettled(ownerLabels.map(async label => {
    const windowHandle = await WebviewWindow.getByLabel(label);
    if (windowHandle) await windowHandle.setEnabled(true);
  }));
  const mainWindow = await WebviewWindow.getByLabel('main');
  if (mainWindow) await mainWindow.setFocus();
};

document.getElementById('minimize').addEventListener('click', () => {
  appWindow.minimize().catch(console.error);
});

document.getElementById('maximize').addEventListener('click', () => {
  appWindow.toggleMaximize().catch(console.error);
});

document.getElementById('close').addEventListener('click', () => {
  appWindow.close().catch(console.error);
});

titlebar.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('.window-control')) return;
  appWindow.startDragging().catch(console.error);
});

titlebar.addEventListener('dblclick', event => {
  if (event.target.closest('.window-control')) return;
  appWindow.toggleMaximize().catch(console.error);
});

editMenuButton.addEventListener('click', () => {
  setFileMenuOpen(false);
  setEditMenuOpen(editMenu.hidden);
});

fileMenuButton.addEventListener('click', () => {
  setEditMenuOpen(false);
  setFileMenuOpen(fileMenu.hidden);
});

fileMenuButton.addEventListener('pointerenter', () => {
  if (!hasOpenApplicationMenu() || !fileMenu.hidden) return;
  setEditMenuOpen(false);
  setFileMenuOpen(true);
});

editMenuButton.addEventListener('pointerenter', () => {
  if (!hasOpenApplicationMenu() || !editMenu.hidden) return;
  setFileMenuOpen(false);
  setEditMenuOpen(true);
});

fileMenuButton.addEventListener('keydown', event => {
  if (event.key !== 'ArrowDown') return;
  event.preventDefault();
  setEditMenuOpen(false);
  setFileMenuOpen(true);
  exitOption.focus();
});

editMenuButton.addEventListener('keydown', event => {
  if (event.key !== 'ArrowDown') return;
  event.preventDefault();
  setFileMenuOpen(false);
  setEditMenuOpen(true);
  preferencesOption.focus();
});

exitOption.addEventListener('click', () => {
  appWindow.close().catch(console.error);
});

preferencesOption.addEventListener('click', () => {
  setEditMenuOpen(false);
  openDetachedPreferencesWindow();
});

testOption.addEventListener('click', () => {
  setEditMenuOpen(false);
  openDetachedTestWindow();
});

preferencesClose.addEventListener('click', () => {
  if (isDetachedFloatingWindow) {
    appWindow.close().catch(console.error);
    return;
  }
  setUiScaleOptionsOpen(false);
  setTestDropdownOpen(false);
  setTestComboboxOpen(false);
  closeHexColorDialog();
  setPreferencesDialogOpen(false);
  editMenuButton.focus();
});

testToggleButton.addEventListener('click', () => {
  const toggled = testToggleButton.getAttribute('aria-pressed') !== 'true';
  testToggleButton.setAttribute('aria-pressed', String(toggled));
});

const setActiveWorkspaceTab = activeTab => {
  for (const tab of workspaceTabs.querySelectorAll('.workspace-tab')) {
    const active = tab === activeTab;
    tab.classList.toggle('workspace-tab-active', active);
    tab.setAttribute('aria-selected', String(active));
  }

  const activePanelId = activeTab.dataset.workspacePanelId || '';
  const showingPrimaryWorkspace = activePanelId === '';
  workspaceTopControls.hidden = !showingPrimaryWorkspace;
  workspaceInnerContainer.hidden = !showingPrimaryWorkspace;
  workspaceObjectGrid.hidden = !showingPrimaryWorkspace;
  for (const panel of workspaceItemEditors.querySelectorAll('.workspace-item-editor')) {
    panel.hidden = panel.id !== activePanelId;
  }
  if (showingPrimaryWorkspace) syncPrimaryWorkspaceObjects();
  requestAnimationFrame(syncWorkspaceObjectScrollbar);
};

const workspaceToggleButtons = [...document.querySelectorAll('[data-workspace-toggle]')];
const setPrimaryWorkspaceMode = mode => {
  const label = mode === 'assets' ? 'Assets' : 'Home';
  homeTab.dataset.workspaceMode = mode;
  primaryWorkspaceTabLabel.textContent = label;
  homeTab.setAttribute('aria-label', label);
  workspaceSearchInput.value = '';
  setWorkspaceCreateMode(mode);
  syncPrimaryWorkspaceObjects();
};

for (const button of workspaceToggleButtons) {
  button.addEventListener('click', () => {
    const alreadyPressed = button.getAttribute('aria-pressed') === 'true';
    const primaryTabIsActive = homeTab.classList.contains('workspace-tab-active');

    if (alreadyPressed) {
      if (!primaryTabIsActive) {
        setActiveWorkspaceTab(homeTab);
        homeTab.focus();
      }
      return;
    }

    for (const sibling of workspaceToggleButtons) sibling.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-pressed', 'true');
    setPrimaryWorkspaceMode(button.dataset.workspaceMode);
    setActiveWorkspaceTab(homeTab);
    homeTab.focus();
  });
}

const getTaskTerminalHeightBounds = () => {
  const styles = getComputedStyle(document.documentElement);
  const lineHeight = Number.parseFloat(styles.getPropertyValue('--ycs-dialog-line-height')) || 36;
  const sideInset = Number.parseFloat(
    styles.getPropertyValue('--ycs-workspace-inner-side-inset'),
  ) || 12;
  const topInset = Number.parseFloat(
    styles.getPropertyValue('--ycs-workspace-two-button-stack-height'),
  ) || 66;
  const minimum = 3 * lineHeight;
  const maximum = Math.max(
    minimum,
    homeWorkspace.clientHeight - topInset - (2 * sideInset) - lineHeight,
  );
  return { minimum, maximum };
};

const setTaskTerminalHeight = height => {
  const { minimum, maximum } = getTaskTerminalHeightBounds();
  const constrained = snapCssValueToPhysicalPixel(clamp(height, minimum, maximum));
  homeWorkspace.style.setProperty('--ycs-task-terminal-height', `${constrained}px`);
  requestAnimationFrame(syncWorkspaceObjectScrollbar);
  return constrained;
};

const constrainTaskTerminalHeight = () => {
  const inlineHeight = Number.parseFloat(
    homeWorkspace.style.getPropertyValue('--ycs-task-terminal-height'),
  );
  const currentHeight = Number.isFinite(inlineHeight)
    ? inlineHeight
    : homeWorkspace.clientHeight * 0.45;
  setTaskTerminalHeight(currentHeight);
};

try {
  const storedHeight = Number.parseFloat(localStorage.getItem(taskTerminalHeightStorageKey));
  if (Number.isFinite(storedHeight)) setTaskTerminalHeight(storedHeight);
} catch {
  // Console-height persistence is optional when storage is unavailable.
}

workspaceTaskTerminalResizeHandle.addEventListener('pointerdown', event => {
  if (event.button !== 0 || workspaceTaskTerminal.hidden) return;
  event.preventDefault();
  taskTerminalResizeState = {
    pointerId: event.pointerId,
    startPointerY: event.clientY,
    startHeight: workspaceTaskTerminal.offsetHeight,
  };
  workspaceTaskTerminalResizeHandle.setPointerCapture(event.pointerId);
});

window.addEventListener('pointermove', event => {
  if (taskTerminalResizeState?.pointerId !== event.pointerId) return;
  const pointerDelta = (
    taskTerminalResizeState.startPointerY - event.clientY
  ) / getUiScaleFactor();
  setTaskTerminalHeight(taskTerminalResizeState.startHeight + pointerDelta);
});

const stopTaskTerminalResize = event => {
  if (taskTerminalResizeState?.pointerId !== event.pointerId) return;
  taskTerminalResizeState = null;
  try {
    localStorage.setItem(
      taskTerminalHeightStorageKey,
      String(Math.round(workspaceTaskTerminal.offsetHeight)),
    );
  } catch {
    // Console-height persistence is optional when storage is unavailable.
  }
};

window.addEventListener('pointerup', stopTaskTerminalResize);
window.addEventListener('pointercancel', stopTaskTerminalResize);

const taskButtons = {
  runClient: runClientTaskButton,
  runData: runDataTaskButton,
};
const terminalControlCodePattern = new RegExp(
  '\\x1B(?:[@-_]|\\[[0-?]*[ -/]*[@-~])',
  'g',
);
let selectedTaskOutput = 'runClient';
let refreshingTaskState = false;
let activeConsoleMode = null;
let runConsoleError = '';

const outputHasSelection = () => {
  const selection = window.getSelection();
  return Boolean(
    selection
    && !selection.isCollapsed
    && selection.anchorNode
    && workspaceTaskTerminalOutput.contains(selection.anchorNode),
  );
};

const renderConsoleOutput = output => {
  const renderedOutput = output.replace(terminalControlCodePattern, '');
  if (workspaceTaskTerminalOutput.textContent === renderedOutput || outputHasSelection()) return;
  const wasAtBottom = workspaceTaskTerminalOutput.scrollHeight
    - workspaceTaskTerminalOutput.scrollTop
    - workspaceTaskTerminalOutput.clientHeight < 4;
  workspaceTaskTerminalOutput.textContent = renderedOutput;
  if (wasAtBottom) requestAnimationFrame(() => {
    workspaceTaskTerminalOutput.scrollTop = workspaceTaskTerminalOutput.scrollHeight;
  });
};

const setConsoleMode = mode => {
  activeConsoleMode = mode;
  const open = mode !== null;
  workspaceTaskTerminal.hidden = !open;
  homeWorkspace.classList.toggle('task-terminal-open', open);
  taskOutputButton.setAttribute('aria-pressed', String(mode === 'run'));

  if (mode === 'run') {
    workspaceTaskTerminalTitle.textContent = selectedTaskOutput === 'runClient'
      ? 'Run Client'
      : 'Run Data';
    refreshTaskStates();
  }

  if (open) requestAnimationFrame(() => {
    workspaceTaskTerminalOutput.scrollTop = workspaceTaskTerminalOutput.scrollHeight;
  });
};

const renderTaskSnapshot = (task, snapshot) => {
  const [running, output] = snapshot;
  const taskName = task === 'runClient' ? 'Client' : 'Data';
  taskButtons[task].setAttribute('aria-pressed', String(running));
  taskButtons[task].setAttribute('aria-label', `${running ? 'Stop' : 'Run'} ${taskName}`);
  if (activeConsoleMode !== 'run' || task !== selectedTaskOutput) return;
  workspaceTaskTerminalTitle.textContent = `Run ${taskName}`;
  renderConsoleOutput(runConsoleError || output || `No Run ${taskName} output yet.`);
};

const refreshTaskStates = async () => {
  if (refreshingTaskState || isDetachedFloatingWindow) return;
  refreshingTaskState = true;
  try {
    const snapshots = await Promise.all([
      invoke('gradle_task_snapshot', { task: 'runClient' }),
      invoke('gradle_task_snapshot', { task: 'runData' }),
    ]);
    renderTaskSnapshot('runClient', snapshots[0]);
    renderTaskSnapshot('runData', snapshots[1]);
  } catch (error) {
    workspaceTaskTerminalOutput.textContent = String(error);
  } finally {
    refreshingTaskState = false;
  }
};

const toggleGradleTask = async task => {
  selectedTaskOutput = task;
  runConsoleError = '';
  try {
    const running = await invoke('toggle_gradle_task', { task });
    taskButtons[task].setAttribute('aria-pressed', String(running));
    await refreshTaskStates();
  } catch (error) {
    runConsoleError = String(error);
    if (activeConsoleMode === 'run') renderConsoleOutput(runConsoleError);
  }
};

if (!isDetachedFloatingWindow) {
  runClientTaskButton.addEventListener('click', () => toggleGradleTask('runClient'));
  runDataTaskButton.addEventListener('click', () => toggleGradleTask('runData'));
  taskOutputButton.addEventListener('click', () => {
    setConsoleMode(activeConsoleMode === 'run' ? null : 'run');
  });
  refreshTaskStates();
  window.setInterval(refreshTaskStates, 500);
}

const createClosableWorkspaceTab = ({ id, labelText, panelId = '' }) => {
  const tab = document.createElement('div');
  tab.id = id;
  tab.className = 'workspace-tab workspace-tab-closable';
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-selected', 'false');
  tab.setAttribute('tabindex', '0');
  tab.setAttribute('draggable', 'true');
  if (panelId) {
    tab.dataset.workspacePanelId = panelId;
    tab.setAttribute('aria-controls', panelId);
  }

  const label = document.createElement('span');
  label.className = 'workspace-tab-label';
  label.textContent = labelText;

  const closeButton = document.createElement('button');
  closeButton.className = 'workspace-tab-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', `Close ${labelText}`);

  const closeIcon = document.createElement('img');
  closeIcon.src = './assets/sprite/generated/tab_icon_2x.png';
  closeIcon.alt = '';
  closeIcon.draggable = false;
  closeButton.append(closeIcon);
  tab.append(label, closeButton);
  workspaceTabs.append(tab);
  setActiveWorkspaceTab(tab);
  tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  requestAnimationFrame(syncWorkspaceTabScrollControls);
  return { tab, label, closeButton };
};

const removeWorkspaceTab = tab => {
  if (!tab || tab === homeTab) return;
  const wasActive = tab.classList.contains('workspace-tab-active');
  const replacement = tab.previousElementSibling || tab.nextElementSibling || homeTab;
  const panelId = tab.dataset.workspacePanelId;
  if (panelId) document.getElementById(panelId)?.remove();
  tab.remove();
  if (wasActive) setActiveWorkspaceTab(replacement);
  requestAnimationFrame(syncWorkspaceTabScrollControls);
};

const addWorkspaceTab = () => {
  const tabNumber = nextWorkspaceTabNumber;
  nextWorkspaceTabNumber += 1;
  createClosableWorkspaceTab({
    id: `test-workspace-tab-${tabNumber}`,
    labelText: `Test ${tabNumber}`,
  });
};

const itemEditorPage = initializeItemEditorPage({
  host: workspaceItemEditors,
  template: itemEditorTemplate,
  workspaceTabs,
  createTab: createClosableWorkspaceTab,
  removeTab: removeWorkspaceTab,
  onItemSaved: ({ id, previousId, displayName, textureId }) => {
    const escapedPreviousId = CSS.escape(previousId);
    let shell = document.querySelector(
      `.workspace-object-shell[data-object-type="Item"][data-workspace-reference-id="${escapedPreviousId}"]`,
    );
    if (!shell) {
      const button = addObjectContainer('Item', 'home', workspaceObjectGrid, displayName);
      shell = button.closest('.workspace-object-shell');
    }
    if (!shell) return;
    shell.dataset.workspaceReferenceId = id;
    const label = shell.querySelector(':scope > .workspace-object-label');
    const button = shell.querySelector(':scope > .workspace-object');
    if (label) {
      label.textContent = displayName;
      label.title = displayName;
    }
    button?.setAttribute('aria-label', displayName);
    if (textureId) loadTexturePreviewForShell(shell, textureId);
    refreshFolderPreview(workspaceObjectFolderParents.get(shell));
    persistWorkspaceLayout();
  },
  onItemDeleted: id => {
    const shells = collectWorkspaceHierarchyShells().filter(candidate => (
      candidate.dataset.objectType === 'Item'
      && candidate.dataset.workspaceReferenceId === id
    ));
    for (const shell of shells) removeObjectContainerShell(shell);
  },
});
const { addItemWorkspace, closeDropdowns: closeItemEditorDropdowns } = itemEditorPage;
const folderPage = initializeFolderPage({
  host: workspaceItemEditors,
  createTab: createClosableWorkspaceTab,
  setActiveTab: setActiveWorkspaceTab,
  removeTab: removeWorkspaceTab,
  createObject: (type, mode, grid) => addObjectContainer(type, mode, grid),
});
const {
  getFolderContentHost,
  openFolder: openFolderPage,
  renameFolder: renameFolderPage,
  removeFolder: removeFolderPage,
} = folderPage;

function serializeWorkspaceShell(shell) {
  const type = shell.dataset.objectType || 'Item';
  const entry = {
    visualId: shell.dataset.workspaceVisualId || '',
    type,
    label: shell.querySelector(':scope > .workspace-object-label')?.textContent?.trim() || type,
    mode: shell.dataset.workspaceMode || 'home',
  };
  if (shell.dataset.workspaceReferenceId) {
    entry.referenceId = shell.dataset.workspaceReferenceId;
  }
  if (type === 'Folder') {
    entry.children = [...getFolderContentHost(shell).querySelectorAll(':scope > .workspace-object-shell')]
      .map(serializeWorkspaceShell);
  }
  return entry;
}

function persistWorkspaceLayout() {
  if (isRestoringWorkspaceLayout || isSearchingPrimaryWorkspace) return;
  try {
    const roots = [...workspaceObjectGrid.querySelectorAll(':scope > .workspace-object-shell')];
    const layout = {
      version: 1,
      home: roots.filter(shell => shell.dataset.workspaceMode === 'home').map(serializeWorkspaceShell),
      assets: roots.filter(shell => shell.dataset.workspaceMode === 'assets').map(serializeWorkspaceShell),
    };
    localStorage.setItem(workspaceLayoutStorageKey, JSON.stringify(layout));
  } catch (error) {
    console.error('Failed to persist the YCS4 visual workspace layout.', error);
  }
}

function restoreWorkspaceLayout() {
  let layout;
  try {
    layout = JSON.parse(localStorage.getItem(workspaceLayoutStorageKey) || 'null');
  } catch (error) {
    console.error('Failed to read the YCS4 visual workspace layout.', error);
    return;
  }
  if (!layout || layout.version !== 1) return;

  const restoreEntries = (entries, mode, grid) => {
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const type = typeof entry.type === 'string' && entry.type ? entry.type : 'Item';
      const label = typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : type;
      const button = addObjectContainer(type, mode, grid, label);
      const shell = button.closest('.workspace-object-shell');
      if (!shell) continue;
      if (typeof entry.visualId === 'string' && entry.visualId) {
        shell.dataset.workspaceVisualId = entry.visualId;
      }
      if (typeof entry.referenceId === 'string' && entry.referenceId) {
        shell.dataset.workspaceReferenceId = entry.referenceId;
        if (type === 'Texture') loadTexturePreviewForShell(shell);
        if (type === 'Item') loadItemPreviewForShell(shell);
      }
      if (type === 'Folder') {
        restoreEntries(entry.children, mode, getFolderContentHost(shell));
        refreshFolderPreview(shell);
      }
    }
  };

  isRestoringWorkspaceLayout = true;
  try {
    workspaceObjectGrid.replaceChildren();
    restoreEntries(layout.home, 'home', workspaceObjectGrid);
    restoreEntries(layout.assets, 'assets', workspaceObjectGrid);
  } finally {
    isRestoringWorkspaceLayout = false;
  }
  syncPrimaryWorkspaceObjects();
}

restoreWorkspaceLayout();

const reconcileSavedWorkspaceReferences = async ({
  category,
  objectType,
  mode,
  loadLabel,
  loadPreview,
}) => {
  if (isDetachedFloatingWindow) return;
  try {
    const ids = await invoke('list_ycs_data', { category });
    const savedIds = new Set(ids);
    const seenReferences = new Set();
    for (const shell of collectWorkspaceHierarchyShells()) {
      const referenceId = shell.dataset.objectType === objectType
        ? shell.dataset.workspaceReferenceId
        : '';
      if (!referenceId) continue;
      if (savedIds.has(referenceId) && !seenReferences.has(referenceId)) {
        seenReferences.add(referenceId);
        continue;
      }
      const parentFolder = workspaceObjectFolderParents.get(shell) || null;
      shell.remove();
      workspaceObjectFolderParents.delete(shell);
      refreshFolderPreview(parentFolder);
    }
    for (const id of ids) {
      const existing = collectWorkspaceHierarchyShells().find(shell => (
        shell.dataset.objectType === objectType
        && shell.dataset.workspaceReferenceId === id
      ));
      if (existing) continue;
      const label = await loadLabel(id);
      const button = addObjectContainer(objectType, mode, workspaceObjectGrid, label);
      const shell = button.closest('.workspace-object-shell');
      if (shell) {
        shell.dataset.workspaceReferenceId = id;
        loadPreview(shell);
      }
    }
    persistWorkspaceLayout();
    syncPrimaryWorkspaceObjects();
  } catch (error) {
    console.error(`Failed to reconcile saved ${objectType} references.`, error);
  }
};

const loadSavedItemLabel = async id => {
  try {
    const raw = await invoke('load_ycs_data', { category: 'items', id });
    const data = JSON.parse(raw);
    return String(data.displayName || data.id || id);
  } catch {
    return id;
  }
};

const loadSavedTextureLabel = async id => {
  try {
    const [metadata] = await invoke('load_texture_bundle', { id });
    const data = JSON.parse(metadata);
    return String(data.label || data.id || id);
  } catch {
    return id;
  }
};

const savedWorkspaceLifecycles = new Map([
  ['Item', {
    category: 'items',
    mode: 'home',
    deleteCommand: 'delete_basic_item',
    loadLabel: loadSavedItemLabel,
    loadPreview: loadItemPreviewForShell,
    onDeleted: id => itemEditorPage.closeSavedItemWorkspaces(id),
  }],
  ['Texture', {
    category: 'textures',
    mode: 'assets',
    deleteCommand: 'delete_texture_bundle',
    usageCommand: 'find_texture_usage',
    loadLabel: loadSavedTextureLabel,
    loadPreview: loadTexturePreviewForShell,
  }],
]);

for (const [objectType, lifecycle] of savedWorkspaceLifecycles) {
  reconcileSavedWorkspaceReferences({ objectType, ...lifecycle });
}

testAddTabButton.addEventListener('click', () => {
  if (isDetachedTestWindow) {
    emitTo('main', 'ycs4:add-test-tab').catch(console.error);
    return;
  }
  addWorkspaceTab();
});

if (!isDetachedFloatingWindow) {
  listen('ycs4:add-test-tab', addWorkspaceTab).catch(console.error);
  listen('ycs4:warning-save', event => {
    const panelId = String(event.payload?.panelId || '');
    document.getElementById(panelId)?.querySelector('[data-item-action="save"]')?.click();
  }).catch(console.error);
  listen('ycs4:warning-discard', event => {
    const panelId = String(event.payload?.panelId || '');
    const tab = workspaceTabs.querySelector(`[data-workspace-panel-id="${CSS.escape(panelId)}"]`);
    if (tab) removeWorkspaceTab(tab);
  }).catch(console.error);
  listen('ycs4:texture-saved', event => {
    const id = String(event.payload?.id || '').trim();
    const name = String(event.payload?.name || id || 'Texture').trim();
    const visualId = String(event.payload?.visualId || '').trim();
    const affectedItemIds = Array.isArray(event.payload?.affectedItemIds)
      ? event.payload.affectedItemIds.map(value => String(value))
      : [];
    const existingShell = visualId
      ? document.querySelector(`.workspace-object-shell[data-workspace-visual-id="${CSS.escape(visualId)}"]`)
      : null;
    const targetGrid = textureImportTargetGrid?.isConnected ? textureImportTargetGrid : workspaceObjectGrid;
    textureImportTargetGrid = null;
    textureImportEditingShell = null;
    const button = existingShell?.querySelector(':scope > .object-container')
      || addObjectContainer('Texture', 'assets', targetGrid, name);
    const shell = existingShell || button.closest('.workspace-object-shell');
    if (shell && id) shell.dataset.workspaceReferenceId = id;
    const label = shell?.querySelector(':scope > .workspace-object-label');
    if (label) {
      label.textContent = name;
      label.title = name;
    }
    if (button) button.setAttribute('aria-label', name);
    if (shell) loadTexturePreviewForShell(shell);
    for (const itemId of affectedItemIds) {
      for (const itemShell of collectWorkspaceHierarchyShells().filter(candidate => (
        candidate.dataset.objectType === 'Item'
        && candidate.dataset.workspaceReferenceId === itemId
      ))) {
        loadItemPreviewForShell(itemShell);
      }
    }
    persistWorkspaceLayout();
    syncPrimaryWorkspaceObjects();
  }).catch(console.error);
}

let workspaceTabPointerDrag = null;

workspaceTabs.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  const tab = event.target.closest('.workspace-tab');
  if (!tab || event.target.closest('.workspace-tab-close')) return;

  if (tab === homeTab) {
    setActiveWorkspaceTab(homeTab);
    return;
  }

  workspaceTabPointerDrag = {
    tab,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    ghost: null,
    isDragging: false,
  };
});

document.addEventListener('pointermove', event => {
  if (!workspaceTabPointerDrag || workspaceTabPointerDrag.pointerId !== event.pointerId) return;
  const drag = workspaceTabPointerDrag;

  if (!drag.isDragging) {
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.hypot(dx, dy) < 4) return;

    drag.isDragging = true;
    drag.tab.classList.add('workspace-tab-dragging');

    const ghost = drag.tab.cloneNode(true);
    ghost.classList.add('workspace-tab-ghost');
    ghost.classList.remove('workspace-tab-dragging', 'workspace-tab-active');
    ghost.removeAttribute('id');
    document.body.append(ghost);
    drag.ghost = ghost;
  }

  if (drag.ghost) {
    drag.ghost.style.left = `${event.clientX}px`;
    drag.ghost.style.top = `${event.clientY}px`;
  }

  if (drag.isDragging) {
    const draggedTab = drag.tab;
    const allTabs = [...workspaceTabs.querySelectorAll('.workspace-tab')]
      .filter(tab => tab !== draggedTab && tab !== homeTab);
    let placed = false;

    for (const sibling of allTabs) {
      const rect = sibling.getBoundingClientRect();
      if (event.clientX < rect.left + rect.width / 2) {
        workspaceTabs.insertBefore(draggedTab, sibling);
        placed = true;
        break;
      }
    }
    if (!placed) workspaceTabs.append(draggedTab);
  }
});

const finishWorkspaceTabPointerDrag = event => {
  if (!workspaceTabPointerDrag || workspaceTabPointerDrag.pointerId !== event.pointerId) return;
  const drag = workspaceTabPointerDrag;
  workspaceTabPointerDrag = null;

  if (drag.ghost) {
    drag.ghost.remove();
    drag.ghost = null;
  }

  drag.tab.classList.remove('workspace-tab-dragging');
  requestAnimationFrame(syncWorkspaceTabScrollControls);

  if (!drag.isDragging) {
    setActiveWorkspaceTab(drag.tab);
  }
};

document.addEventListener('pointerup', finishWorkspaceTabPointerDrag);
document.addEventListener('pointercancel', finishWorkspaceTabPointerDrag);

workspaceTabs.addEventListener('click', event => {
  const closeButton = event.target.closest('.workspace-tab-close');
  if (!closeButton) return;
  const tab = closeButton.closest('.workspace-tab');
  if (tab) {
    event.stopPropagation();
    const panel = tab.dataset.workspacePanelId
      ? document.getElementById(tab.dataset.workspacePanelId)
      : null;
    if (panel?.classList.contains('workspace-item-editor') && panel.dataset.dirty === 'true') {
      showUnsavedChangesWarning(panel);
      return;
    }
    removeWorkspaceTab(tab);
  }
});

workspaceTabs.addEventListener('keydown', event => {
  const tab = event.target.closest('.workspace-tab');
  if (!tab || event.target.closest('.workspace-tab-close')) return;
  if (!['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  setActiveWorkspaceTab(tab);
});

const syncWorkspaceTabScrollControls = () => {
  const maximumScroll = Math.max(0, workspaceTabs.scrollWidth - workspaceTabs.clientWidth);
  const hasOverflow = maximumScroll > 0.5;
  workspaceTabDirectionsLeft.hidden = !hasOverflow || workspaceTabs.scrollLeft <= 0.5;
  workspaceTabDirectionsRight.hidden = !hasOverflow
    || workspaceTabs.scrollLeft >= maximumScroll - 0.5;
};

const scrollWorkspaceTabs = direction => {
  const referenceTab = workspaceTabs.querySelector('.workspace-tab');
  const tabGap = Number.parseFloat(getComputedStyle(workspaceTabs).columnGap) || 0;
  const amount = (referenceTab?.offsetWidth || 135) + tabGap;
  workspaceTabs.scrollBy({ left: direction * amount, behavior: 'auto' });
  requestAnimationFrame(syncWorkspaceTabScrollControls);
};

workspaceTabsPrevious.addEventListener('click', () => scrollWorkspaceTabs(-1));
workspaceTabsNext.addEventListener('click', () => scrollWorkspaceTabs(1));
workspaceTabs.addEventListener('scroll', syncWorkspaceTabScrollControls, { passive: true });
workspaceTabs.addEventListener('wheel', event => {
  if (workspaceTabs.scrollWidth <= workspaceTabs.clientWidth) return;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (delta === 0) return;
  event.preventDefault();
  workspaceTabs.scrollLeft += delta;
}, { passive: false });

const workspaceTabsResizeObserver = new ResizeObserver(syncWorkspaceTabScrollControls);
workspaceTabsResizeObserver.observe(workspaceTabs);
const workspaceTabsMutationObserver = new MutationObserver(syncWorkspaceTabScrollControls);
workspaceTabsMutationObserver.observe(workspaceTabs, { childList: true });
requestAnimationFrame(syncWorkspaceTabScrollControls);

function refreshFolderPreview(folderShell) {
  if (!folderShell?.querySelector('.folder-object')) return;
  const contentLayer = folderShell.querySelector('.object-folder-content');
  if (!contentLayer) return;
  const folderGrid = getFolderContentHost(folderShell);
  const source = folderGrid.querySelector(':scope > .workspace-object-shell[data-object-type]:not([data-object-type="Folder"]) > .object-container');
  contentLayer.replaceChildren();
  if (!source) return;
  const preview = source.cloneNode(true);
  preview.classList.add('object-folder-preview');
  preview.removeAttribute('aria-label');
  preview.removeAttribute('draggable');
  preview.setAttribute('aria-hidden', 'true');
  preview.tabIndex = -1;
  for (const child of preview.querySelectorAll('[draggable]')) child.removeAttribute('draggable');
  contentLayer.append(preview);
};

function textureMimeType(extension) {
  return extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : `image/${extension}`;
}

function applyTexturePreviewToShell(shell, extension, data) {
  const image = shell?.querySelector(':scope > .object-container > .object-container-texture-preview');
  if (!image || !extension || !data) return;
  const previousUrl = textureShellPreviewUrls.get(shell);
  if (previousUrl) URL.revokeObjectURL(previousUrl);
  const url = URL.createObjectURL(new Blob([new Uint8Array(data)], {
    type: textureMimeType(extension),
  }));
  textureShellPreviewUrls.set(shell, url);
  image.src = url;
  const parentFolder = workspaceObjectFolderParents.get(shell);
  if (parentFolder) refreshFolderPreview(parentFolder);
}

async function loadTexturePreviewForShell(shell, textureId = '') {
  const id = textureId || shell?.dataset.workspaceReferenceId;
  if (!id || !shell) return;
  try {
    const [, extension, data] = await invoke('load_texture_bundle', { id });
    applyTexturePreviewToShell(shell, extension, data);
  } catch (error) {
    console.error(`Failed to load texture preview for ${id}.`, error);
  }
}

async function loadItemPreviewForShell(shell) {
  const id = shell?.dataset.workspaceReferenceId;
  if (!id || shell.dataset.objectType !== 'Item') return;
  try {
    const raw = await invoke('load_ycs_data', { category: 'items', id });
    const item = JSON.parse(raw);
    if (!['generated', 'handheld'].includes(item.holdingMode || 'generated') || !item.texture) return;
    await loadTexturePreviewForShell(shell, item.texture);
  } catch (error) {
    console.error(`Failed to load Item preview for ${id}.`, error);
  }
}

const folderWouldCreateCycle = (movingShell, targetFolderShell) => {
  let folder = targetFolderShell;
  while (folder) {
    if (folder === movingShell) return true;
    folder = workspaceObjectFolderParents.get(folder) || null;
  }
  return false;
};

function moveWorkspaceObjectShell(shell, grid, before = null) {
  if (!shell || !grid) return;
  const targetBefore = before && before.parentElement === grid ? before : null;
  if (shell.parentElement === grid && shell.nextElementSibling === targetBefore) {
    return;
  }
  const previousFolder = workspaceObjectFolderParents.get(shell) || null;
  const nextFolder = grid.workspaceFolderOwner || null;
  grid.insertBefore(shell, targetBefore);
  if (nextFolder) workspaceObjectFolderParents.set(shell, nextFolder);
  else workspaceObjectFolderParents.delete(shell);
  refreshFolderPreview(previousFolder);
  refreshFolderPreview(nextFolder);
  persistWorkspaceLayout();
  requestAnimationFrame(syncWorkspaceObjectScrollbar);
};

const clearWorkspaceObjectDropTargets = () => {
  for (const folder of document.querySelectorAll('.folder-object-drag-target')) {
    folder.classList.remove('folder-object-drag-target');
  }
};

let workspaceObjectPointerDrag = null;

document.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  const shell = event.target.closest('.workspace-object-shell');
  if (
    !shell
    || shell.classList.contains('object-folder-preview')
    || shell.classList.contains('workspace-search-result')
  ) return;
  const object = shell.querySelector('.workspace-object');
  if (!object) return;
  if (event.target.closest('#workspace-object-context-menu') || event.target.closest('.workspace-object-context-menu')) return;

  workspaceObjectPointerDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    draggedShell: shell,
    ghost: null,
    isDragging: false,
    hoveredFolder: null,
  };
});

document.addEventListener('pointermove', event => {
  if (!workspaceObjectPointerDrag || workspaceObjectPointerDrag.pointerId !== event.pointerId) return;
  const drag = workspaceObjectPointerDrag;

  if (!drag.isDragging) {
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.hypot(deltaX, deltaY) < 4) return;

    drag.isDragging = true;
    draggedWorkspaceObjectShell = drag.draggedShell;
    suppressWorkspaceObjectClick = true;
    drag.draggedShell.classList.add('workspace-object-dragging');

    const ghost = drag.draggedShell.cloneNode(true);
    ghost.classList.add('workspace-object-ghost');
    ghost.classList.remove('workspace-object-dragging');
    ghost.removeAttribute('id');
    document.body.append(ghost);
    drag.ghost = ghost;
  }

  if (drag.ghost) {
    drag.ghost.style.left = `${event.clientX}px`;
    drag.ghost.style.top = `${event.clientY}px`;
  }

  clearWorkspaceObjectDropTargets();
  drag.hoveredFolder = null;

  const elementUnder = document.elementFromPoint(event.clientX, event.clientY);
  if (!elementUnder) return;

  const targetFolderObject = elementUnder.closest('.folder-object:not(.object-folder-preview)');
  const targetFolderShell = targetFolderObject?.closest('.workspace-object-shell');
  if (
    targetFolderShell
    && targetFolderShell !== drag.draggedShell
    && !folderWouldCreateCycle(drag.draggedShell, targetFolderShell)
  ) {
    const bounds = targetFolderShell.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) / bounds.width;

    // Center zone (25% to 75%) is the drop-into-folder zone
    if (relativeX >= 0.25 && relativeX <= 0.75) {
      targetFolderObject.classList.add('folder-object-drag-target');
      drag.hoveredFolder = targetFolderShell;
      return;
    }

    // Outer 25% on either side reorders next to the folder in the grid
    const grid = targetFolderShell.parentElement;
    if (grid && (!grid.workspaceFolderOwner || !folderWouldCreateCycle(drag.draggedShell, grid.workspaceFolderOwner))) {
      const pointerIsBefore = relativeX < 0.25;
      const beforeTarget = pointerIsBefore ? targetFolderShell : targetFolderShell.nextElementSibling;
      moveWorkspaceObjectShell(drag.draggedShell, grid, beforeTarget);
      return;
    }
  }

  const grid = elementUnder.closest('.workspace-object-grid')
    || elementUnder.closest('.workspace-inner-container')?.querySelector('.workspace-object-grid');
  if (!grid) return;
  if (grid.workspaceFolderOwner && folderWouldCreateCycle(drag.draggedShell, grid.workspaceFolderOwner)) {
    return;
  }

  const targetShell = elementUnder.closest('.workspace-object-shell');
  if (!targetShell || targetShell === drag.draggedShell) {
    // Moving through empty space or gaps between items
    const shells = [...grid.querySelectorAll(':scope > .workspace-object-shell:not(.workspace-object-dragging)')];
    if (shells.length === 0) {
      moveWorkspaceObjectShell(drag.draggedShell, grid);
    } else {
      let before = null;
      for (const s of shells) {
        const b = s.getBoundingClientRect();
        if (event.clientY < b.bottom && event.clientX < b.left + b.width / 2) {
          before = s;
          break;
        }
        if (event.clientY < b.top) {
          before = s;
          break;
        }
      }
      moveWorkspaceObjectShell(drag.draggedShell, grid, before);
    }
    return;
  }

  if (targetShell.parentElement === grid) {
    const bounds = targetShell.getBoundingClientRect();
    const pointerIsBefore = event.clientX < bounds.left + (bounds.width / 2);
    const beforeTarget = pointerIsBefore ? targetShell : targetShell.nextElementSibling;
    moveWorkspaceObjectShell(drag.draggedShell, grid, beforeTarget);
  }
});

const endWorkspaceObjectPointerDrag = event => {
  if (!workspaceObjectPointerDrag || (event && workspaceObjectPointerDrag.pointerId !== event.pointerId)) return;
  const drag = workspaceObjectPointerDrag;
  workspaceObjectPointerDrag = null;

  if (drag.ghost) {
    drag.ghost.remove();
    drag.ghost = null;
  }

  if (drag.isDragging) {
    if (drag.hoveredFolder && !folderWouldCreateCycle(drag.draggedShell, drag.hoveredFolder)) {
      moveWorkspaceObjectShell(
        drag.draggedShell,
        getFolderContentHost(drag.hoveredFolder),
      );
    }

    drag.draggedShell.classList.remove('workspace-object-dragging');
    draggedWorkspaceObjectShell = null;
    clearWorkspaceObjectDropTargets();

    window.setTimeout(() => {
      suppressWorkspaceObjectClick = false;
    }, 50);
  } else {
    suppressWorkspaceObjectClick = false;
  }
};

document.addEventListener('pointerup', endWorkspaceObjectPointerDrag);
document.addEventListener('pointercancel', endWorkspaceObjectPointerDrag);

document.addEventListener('dragstart', event => {
  if (
    event.target.closest('.workspace-tab-closable')
    || event.target.closest('.workspace-object-shell')
    || event.target.closest('.workspace-object')
  ) {
    event.preventDefault();
  }
});

document.addEventListener('click', event => {
  const textureObject = event.target.closest('.object-container[data-object-type="Texture"]');
  if (textureObject && !draggedWorkspaceObjectShell && !suppressWorkspaceObjectClick) {
    const resultShell = textureObject.closest('.workspace-object-shell');
    const shell = resolvePrimarySearchResult(resultShell);
    openTextureImportDialog(shell.parentElement || workspaceObjectGrid, shell);
    return;
  }
  const itemObject = event.target.closest('.object-container[data-object-type="Item"]');
  if (itemObject && !draggedWorkspaceObjectShell && !suppressWorkspaceObjectClick) {
    const resultShell = itemObject.closest('.workspace-object-shell');
    const shell = resolvePrimarySearchResult(resultShell);
    const id = shell.dataset.workspaceReferenceId;
    if (id) addItemWorkspace(id);
    return;
  }
  const folderObject = event.target.closest('.folder-object:not(.object-folder-preview)');
  if (!folderObject || draggedWorkspaceObjectShell || suppressWorkspaceObjectClick) return;
  const shell = folderObject.closest('.workspace-object-shell');
  openFolderPage(resolvePrimarySearchResult(shell));
});

const closeWorkspaceObjectContextMenu = () => {
  workspaceObjectContextMenu.hidden = true;
  if (workspaceObjectNewOptions) workspaceObjectNewOptions.hidden = true;
  if (workspaceObjectNewOption) {
    workspaceObjectNewOption.classList.remove('workspace-context-option-active');
    workspaceObjectNewOption.setAttribute('aria-expanded', 'false');
  }
  contextObjectShell = null;
};

const removeObjectContainerShell = shell => {
  if (!shell) return;
  if (cutWorkspaceObjectShell === shell) {
    cutWorkspaceObjectShell = null;
  }
  const previousFolder = workspaceObjectFolderParents.get(shell) || null;
  const isFolder = Boolean(shell.querySelector('.folder-object'));
  const focusTarget = shell.nextElementSibling?.querySelector('.workspace-object')
    || shell.previousElementSibling?.querySelector('.workspace-object');
  if (isFolder) {
    const targetGrid = shell.parentElement;
    const nextParentFolder = targetGrid?.workspaceFolderOwner || null;
    const folderGrid = getFolderContentHost(shell);
    const children = folderGrid
      ? [...folderGrid.querySelectorAll(':scope > .workspace-object-shell')]
      : [];
    for (const child of children) {
      targetGrid.insertBefore(child, shell);
      if (nextParentFolder) workspaceObjectFolderParents.set(child, nextParentFolder);
      else workspaceObjectFolderParents.delete(child);
    }
    removeFolderPage(shell);
  }
  shell.remove();
  workspaceObjectFolderParents.delete(shell);
  refreshFolderPreview(previousFolder);
  persistWorkspaceLayout();
  closeWorkspaceObjectContextMenu();
  (focusTarget || workspaceCreateButton).focus();
};

const removeWorkspaceObjectWithLifecycle = async shell => {
  const canonicalShell = resolvePrimarySearchResult(shell);
  if (!canonicalShell) return false;

  const objectType = canonicalShell.dataset.objectType || '';
  const referenceId = canonicalShell.dataset.workspaceReferenceId || '';
  if (referenceId) {
    const lifecycle = savedWorkspaceLifecycles.get(objectType);
    if (!lifecycle) {
      console.error(`Refusing visual-only deletion for unregistered saved ${objectType} '${referenceId}'.`);
      return false;
    }
    try {
      if (lifecycle.usageCommand) {
        const usages = await invoke(lifecycle.usageCommand, { textureId: referenceId });
        if (usages.length > 0) {
          showTextureUsageWarning(referenceId, usages);
          return false;
        }
      }
      await invoke(lifecycle.deleteCommand, { id: referenceId });
    } catch (error) {
      console.error(`Failed to delete saved ${objectType} '${referenceId}'.`, error);
      if (lifecycle.usageCommand) {
        try {
          const usages = await invoke(lifecycle.usageCommand, { textureId: referenceId });
          if (usages.length > 0) showTextureUsageWarning(referenceId, usages);
        } catch (usageError) {
          console.error(`Failed to inspect ${objectType} usage for '${referenceId}'.`, usageError);
        }
      }
      return false;
    }

    const matchingReferences = collectWorkspaceHierarchyShells().filter(candidate => (
      candidate.dataset.objectType === objectType
      && candidate.dataset.workspaceReferenceId === referenceId
    ));
    for (const reference of matchingReferences) removeObjectContainerShell(reference);
    lifecycle.onDeleted?.(referenceId);
    return true;
  }

  removeObjectContainerShell(canonicalShell);
  return true;
};

const syncContextMenuStackPositions = () => {
  const options = [...workspaceObjectContextMenu.querySelectorAll(':scope > .workspace-object-context-option:not([hidden])')];
  for (const [index, option] of options.entries()) {
    option.dataset.stackPosition = options.length === 1
      ? 'only'
      : index === 0
        ? 'first'
        : index === options.length - 1
          ? 'last'
          : 'middle';
  }
};

const startInlineRename = shell => {
  if (!shell) return;
  const labelEl = shell.querySelector('.workspace-object-label');
  if (!labelEl) return;

  const currentName = labelEl.textContent.trim();
  const input = document.createElement('textarea');
  input.className = 'workspace-object-rename-input';
  input.rows = 1;
  input.value = currentName;

  const autoResize = () => {
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  };
  input.addEventListener('input', autoResize);

  labelEl.replaceWith(input);
  input.focus();
  input.select();
  requestAnimationFrame(autoResize);

  let committed = false;
  const commit = () => {
    if (committed) return;
    committed = true;
    const newName = input.value.trim() || currentName;
    labelEl.textContent = newName;
    labelEl.title = newName;
    input.replaceWith(labelEl);

    const btn = shell.querySelector('.workspace-object');
    if (btn) btn.setAttribute('aria-label', newName);

    if (shell.querySelector('.folder-object')) {
      renameFolderPage(shell, newName);
    }
    persistWorkspaceLayout();
    syncPrimaryWorkspaceObjects();
  };

  const cancel = () => {
    if (committed) return;
    committed = true;
    labelEl.textContent = currentName;
    labelEl.title = currentName;
    input.replaceWith(labelEl);
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  });

  input.addEventListener('blur', commit);
};

const positionContextMenu = (clientX, clientY) => {
  const workspaceBounds = homeWorkspace.getBoundingClientRect();
  const uiScaleFactor = getUiScaleFactor();
  const desiredLeft = (clientX - workspaceBounds.left) / uiScaleFactor;
  const desiredTop = (clientY - workspaceBounds.top) / uiScaleFactor;
  workspaceObjectContextMenu.style.left = `${snapCssValueToPhysicalPixel(clamp(
    desiredLeft,
    0,
    Math.max(0, homeWorkspace.clientWidth - workspaceObjectContextMenu.offsetWidth),
  ))}px`;
  workspaceObjectContextMenu.style.top = `${snapCssValueToPhysicalPixel(clamp(
    desiredTop,
    0,
    Math.max(0, homeWorkspace.clientHeight - workspaceObjectContextMenu.offsetHeight),
  ))}px`;
};

const openEmptySpaceContextMenu = (grid, clientX, clientY) => {
  contextObjectShell = null;
  contextTargetGrid = grid || workspaceObjectGrid;

  const isFolderSearching = Boolean(contextTargetGrid.parentElement?.querySelector('.workspace-search-input')?.value.trim());
  const isPrimarySearching = !contextTargetGrid.workspaceFolderOwner && Boolean(workspaceSearchInput.value.trim());
  const isSearching = isPrimarySearching || isFolderSearching;

  workspaceObjectCutOption.hidden = true;
  workspaceObjectDeleteOption.hidden = true;
  workspaceObjectRenameOption.hidden = true;
  workspaceObjectNewOption.hidden = isSearching;
  workspaceObjectNewOptions.hidden = true;
  workspaceObjectNewOption.setAttribute('aria-expanded', 'false');
  workspaceObjectContextDivider.hidden = isSearching;

  if (workspaceObjectPasteOption) {
    workspaceObjectPasteOption.hidden = false;
    workspaceObjectPasteOption.disabled = !cutWorkspaceObjectShell || !cutWorkspaceObjectShell.isConnected;
  }

  const currentMode = contextTargetGrid.workspaceFolderOwner
    ? 'home'
    : (homeTab.dataset.workspaceMode || 'home');

  for (const item of workspaceObjectNewOptions.querySelectorAll('[data-workspace-new-mode]')) {
    const modes = (item.dataset.workspaceNewMode || '').split(/\s+/);
    item.hidden = !modes.includes(currentMode);
  }

  const visibleNewOptions = [...workspaceObjectNewOptions.querySelectorAll(':scope > .workspace-object-context-option:not([hidden])')];
  for (const [index, option] of visibleNewOptions.entries()) {
    option.dataset.stackPosition = visibleNewOptions.length === 1
      ? 'only'
      : index === 0
        ? 'first'
        : index === visibleNewOptions.length - 1
          ? 'last'
          : 'middle';
  }

  syncContextMenuStackPositions();
  workspaceObjectContextMenu.hidden = false;

  positionContextMenu(clientX, clientY);
  if (!workspaceObjectPasteOption.disabled) {
    workspaceObjectPasteOption.focus();
  } else if (!workspaceObjectNewOption.hidden) {
    workspaceObjectNewOption.focus();
  } else {
    workspaceObjectPasteOption.focus();
  }
};

const openWorkspaceObjectContextMenu = (shell, clientX, clientY) => {
  contextObjectShell = shell;
  contextTargetGrid = shell.parentElement || workspaceObjectGrid;
  const isFolder = Boolean(shell.querySelector('.folder-object'));

  workspaceObjectCutOption.hidden = false;
  workspaceObjectPasteOption.hidden = false;
  workspaceObjectPasteOption.disabled = !cutWorkspaceObjectShell || !cutWorkspaceObjectShell.isConnected;
  workspaceObjectNewOption.hidden = true;
  workspaceObjectNewOptions.hidden = true;
  workspaceObjectDeleteOption.hidden = false;
  workspaceObjectRenameOption.hidden = !isFolder;

  syncContextMenuStackPositions();
  workspaceObjectContextMenu.hidden = false;

  positionContextMenu(clientX, clientY);
  workspaceObjectCutOption.focus();
};

workspaceCreateButton.addEventListener('click', () => {
  setWorkspaceCreateOptionsOpen(workspaceCreateOptions.hidden);
});

workspaceCreateButton.addEventListener('keydown', event => {
  if (!['ArrowDown', 'Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  setWorkspaceCreateOptionsOpen(true, true);
});

workspaceCreateOptions.addEventListener('click', event => {
  const option = event.target.closest('[data-workspace-create-option]');
  if (!option) return;
  const objectType = option.dataset.workspaceCreateOption;
  setWorkspaceCreateOptionsOpen(false);
  if (objectType === 'Item') {
    addItemWorkspace();
    return;
  }
  if (objectType === 'Texture') {
    openTextureImportDialog();
    return;
  }
  addObjectContainer(objectType, homeTab.dataset.workspaceMode || 'home').focus();
  syncPrimaryWorkspaceObjects();
});

workspaceObjectGrid.addEventListener('keydown', async event => {
  if (!['Delete', 'Backspace'].includes(event.key)) return;
  const objectButton = event.target.closest('.workspace-object');
  if (!objectButton) return;
  event.preventDefault();
  await removeWorkspaceObjectWithLifecycle(objectButton.closest('.workspace-object-shell'));
});

if (workspaceObjectCutOption) {
  workspaceObjectCutOption.addEventListener('click', () => {
    if (cutWorkspaceObjectShell && cutWorkspaceObjectShell !== contextObjectShell) {
      cutWorkspaceObjectShell.classList.remove('workspace-object-cut');
    }
    cutWorkspaceObjectShell = contextObjectShell;
    if (cutWorkspaceObjectShell) {
      cutWorkspaceObjectShell.classList.add('workspace-object-cut');
    }
    closeWorkspaceObjectContextMenu();
  });
}

if (workspaceObjectPasteOption) {
  workspaceObjectPasteOption.addEventListener('click', () => {
    if (cutWorkspaceObjectShell && cutWorkspaceObjectShell.isConnected) {
      const targetShell = contextObjectShell;
      const targetGrid = contextTargetGrid || workspaceObjectGrid;

      if (targetShell) {
        const isFolder = Boolean(targetShell.querySelector('.folder-object'));
        if (isFolder && targetShell !== cutWorkspaceObjectShell && !folderWouldCreateCycle(cutWorkspaceObjectShell, targetShell)) {
          moveWorkspaceObjectShell(cutWorkspaceObjectShell, getFolderContentHost(targetShell));
        } else if (targetShell.parentElement) {
          moveWorkspaceObjectShell(cutWorkspaceObjectShell, targetShell.parentElement, targetShell.nextElementSibling);
        }
      } else if (targetGrid) {
        if (!targetGrid.workspaceFolderOwner || !folderWouldCreateCycle(cutWorkspaceObjectShell, targetGrid.workspaceFolderOwner)) {
          moveWorkspaceObjectShell(cutWorkspaceObjectShell, targetGrid);
        }
      }

      cutWorkspaceObjectShell.classList.remove('workspace-object-cut');
      cutWorkspaceObjectShell = null;
    }
    closeWorkspaceObjectContextMenu();
  });
}

let newSubmenuCloseTimeout = null;

const showNewSubmenu = () => {
  if (workspaceObjectNewOption.hidden) return;
  workspaceObjectNewOptions.hidden = false;
  workspaceObjectNewOption.classList.add('workspace-context-option-active');
  workspaceObjectNewOption.setAttribute('aria-expanded', 'true');
  workspaceObjectNewOptions.style.top = `${workspaceObjectNewOption.offsetTop}px`;
  const menuRect = workspaceObjectContextMenu.getBoundingClientRect();
  const submenuWidth = workspaceObjectNewOptions.offsetWidth || 120;
  if (menuRect.right + submenuWidth > window.innerWidth) {
    workspaceObjectNewOptions.style.left = 'auto';
    workspaceObjectNewOptions.style.right = '100%';
  } else {
    workspaceObjectNewOptions.style.left = '100%';
    workspaceObjectNewOptions.style.right = 'auto';
  }
};

const scheduleCloseNewSubmenu = () => {
  if (newSubmenuCloseTimeout) clearTimeout(newSubmenuCloseTimeout);
  newSubmenuCloseTimeout = setTimeout(() => {
    workspaceObjectNewOptions.hidden = true;
    workspaceObjectNewOption.classList.remove('workspace-context-option-active');
    workspaceObjectNewOption.setAttribute('aria-expanded', 'false');
  }, 140);
};

const cancelCloseNewSubmenu = () => {
  if (newSubmenuCloseTimeout) {
    clearTimeout(newSubmenuCloseTimeout);
    newSubmenuCloseTimeout = null;
  }
};

if (workspaceObjectNewOption) {
  workspaceObjectNewOption.addEventListener('mouseenter', () => {
    cancelCloseNewSubmenu();
    showNewSubmenu();
  });

  workspaceObjectNewOption.addEventListener('mouseleave', () => {
    scheduleCloseNewSubmenu();
  });

  workspaceObjectNewOption.addEventListener('focus', () => {
    cancelCloseNewSubmenu();
    showNewSubmenu();
  });
}

if (workspaceObjectNewOptions) {
  workspaceObjectNewOptions.addEventListener('mouseenter', () => {
    cancelCloseNewSubmenu();
  });

  workspaceObjectNewOptions.addEventListener('mouseleave', () => {
    scheduleCloseNewSubmenu();
  });

  for (const option of workspaceObjectNewOptions.querySelectorAll('.workspace-context-new-option')) {
    option.addEventListener('click', event => {
      event.stopPropagation();
      const objectType = option.dataset.workspaceNewOption;
      const grid = contextTargetGrid || workspaceObjectGrid;
      const mode = grid.workspaceFolderOwner
        ? 'home'
        : (homeTab.dataset.workspaceMode || 'home');

      closeWorkspaceObjectContextMenu();

      if (objectType === 'Item') {
        addItemWorkspace();
        return;
      }
      if (objectType === 'Texture') {
        openTextureImportDialog(grid);
        return;
      }

      addObjectContainer(objectType, mode, grid).focus();
      if (!grid.workspaceFolderOwner) {
        syncPrimaryWorkspaceObjects();
      }
    });
  }
}

if (workspaceObjectRenameOption) {
  workspaceObjectRenameOption.addEventListener('click', () => {
    const shell = contextObjectShell;
    closeWorkspaceObjectContextMenu();
    startInlineRename(shell);
  });
}

function getFolderItemCounts(folderShell) {
  const grid = getFolderContentHost(folderShell);
  if (!grid) return { totalItems: 0, hasNonEmptyContent: false };

  let totalItems = 0;
  let hasNonEmptyContent = false;

  const directShells = grid.querySelectorAll(':scope > .workspace-object-shell');
  for (const childShell of directShells) {
    if (childShell.classList.contains('object-folder-preview')) continue;
    const isChildFolder = Boolean(childShell.querySelector('.folder-object'));
    if (isChildFolder) {
      const subCounts = getFolderItemCounts(childShell);
      totalItems += subCounts.totalItems;
      if (subCounts.hasNonEmptyContent) {
        hasNonEmptyContent = true;
      }
    } else {
      totalItems += 1;
      hasNonEmptyContent = true;
    }
  }

  return { totalItems, hasNonEmptyContent };
}

const setTextureImportChecked = (button, checked) => {
  button?.setAttribute('aria-checked', String(checked));
};

const resetTextureImportDialog = () => {
  textureImportName.value = '';
  textureImportId.value = '';
  textureImportId.disabled = false;
  setTextureImportFilter('');
  textureImportRows.value = '1';
  textureImportDefaultFrame.value = '0';
  textureImportTicksPerFrame.value = '4';
  setTextureImportChecked(textureImportSpritesheet, false);
  setTextureImportChecked(textureImportAnimated, false);
  textureImportSpritesheetFields.hidden = true;
  textureImportAnimationFields.hidden = true;
  textureImportStatus.textContent = '';
  textureImportFiles.clear();
  if (textureImportPreviewUrl) URL.revokeObjectURL(textureImportPreviewUrl);
  textureImportPreviewUrl = '';
  textureImportPreviewImage = null;
  for (const input of textureImportFileInputs) input.value = '';
  for (const button of textureImportFileButtons) {
    const label = button.querySelector('span');
    if (label) label.textContent = 'Add';
    button.removeAttribute('title');
  }
};

const fileFromTextureBundle = (id, suffix, extension, data) => data
  ? new File([new Uint8Array(data)], `${id}${suffix}.${extension}`, {
    type: textureMimeType(extension),
  })
  : null;

const setTextureImportFile = (kind, file) => {
  if (!file) return;
  textureImportFiles.set(kind, file);
  const button = document.querySelector(`[data-texture-file="${kind}"]`);
  const label = button?.querySelector('span');
  if (label) label.textContent = file.name;
  button?.setAttribute('title', file.name);
};

const loadTextureBundleIntoDialog = async id => {
  textureImportStatus.textContent = 'Loading...';
  try {
    const [metadataText, textureExt, textureData, maskExt, maskData, emissiveExt, emissiveData]
      = await invoke('load_texture_bundle', { id });
    const metadata = JSON.parse(metadataText);
    textureImportName.value = String(metadata.label || id);
    textureImportId.value = id;
    textureImportId.disabled = true;
    setTextureImportFilter(String(metadata.filterTo || ''));
    textureImportRows.value = String(Math.max(1, Number(metadata.rows) || 1));
    textureImportDefaultFrame.value = String(Math.max(0, Number(metadata.defaultFrame) || 0));
    textureImportTicksPerFrame.value = String(Math.max(1, Number(metadata.ticksPerFrame) || 4));
    const spritesheet = Number(metadata.rows) > 1 || metadata.defaultFrame !== undefined;
    const animated = spritesheet && Boolean(metadata.animatedOnUse);
    setTextureImportChecked(textureImportSpritesheet, spritesheet);
    setTextureImportChecked(textureImportAnimated, animated);
    textureImportSpritesheetFields.hidden = !spritesheet;
    textureImportAnimationFields.hidden = !animated;
    const textureFile = fileFromTextureBundle(id, '', textureExt, textureData);
    setTextureImportFile('texture', textureFile);
    setTextureImportFile('mask', fileFromTextureBundle(id, '_mask', maskExt, maskData));
    setTextureImportFile('emissive', fileFromTextureBundle(id, '_emissive', emissiveExt, emissiveData));
    textureImportPreviewImage = new Image();
    textureImportPreviewUrl = URL.createObjectURL(textureFile);
    textureImportPreviewImage.src = textureImportPreviewUrl;
    textureImportStatus.textContent = '';
  } catch (error) {
    textureImportStatus.textContent = `Load failed: ${error}`;
  }
};

function openTextureImportDialog(targetGrid = workspaceObjectGrid, editingShell = null) {
  if (!isDetachedTextureWindow) {
    textureImportTargetGrid = targetGrid || workspaceObjectGrid;
    textureImportEditingShell = editingShell;
    openDetachedTextureWindow().catch(console.error);
    return;
  }
  resetTextureImportDialog();
  if (preferencesDialog) preferencesDialog.hidden = true;
  if (confirmDialog) confirmDialog.hidden = true;
  textureImportDialog.hidden = false;
  dialogLayer.classList.add('dialog-layer-modal');
  dialogLayer.hidden = false;
  if (detachedTextureId) loadTextureBundleIntoDialog(detachedTextureId).then(() => textureImportName.focus());
  else textureImportName.focus();
}

const closeTextureImportDialog = () => {
  setTextureImportFilterOpen(false);
  if (isDetachedTextureWindow) {
    appWindow.close().catch(console.error);
    return;
  }
  textureImportDialog.hidden = true;
  textureImportTargetGrid = null;
  dialogLayer.classList.remove('dialog-layer-modal');
  if (
    (!preferencesDialog || preferencesDialog.hidden)
    && (!hexColorDialog || hexColorDialog.hidden)
    && (!confirmDialog || confirmDialog.hidden)
  ) {
    dialogLayer.hidden = true;
  }
};

const textureFileExtension = file => {
  const extension = file?.name?.split('.').pop()?.toLocaleLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension) ? extension : 'png';
};

const renderTextureImportPreview = timestamp => {
  const canvas = textureImportPreviewCanvas;
  const context = canvas?.getContext('2d');
  if (canvas && context) {
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const image = textureImportPreviewImage;
    if (image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
      const spritesheet = textureImportSpritesheet.getAttribute('aria-checked') === 'true';
      const rows = spritesheet ? Math.max(1, Number.parseInt(textureImportRows.value, 10) || 1) : 1;
      const animated = spritesheet && textureImportAnimated.getAttribute('aria-checked') === 'true';
      const defaultFrame = Math.min(rows - 1, Math.max(0, Number.parseInt(textureImportDefaultFrame.value, 10) || 0));
      const ticksPerFrame = Math.max(1, Number.parseInt(textureImportTicksPerFrame.value, 10) || 1);
      const frame = animated ? Math.floor(timestamp / (ticksPerFrame * 50)) % rows : defaultFrame;
      const sourceHeight = image.naturalHeight / rows;
      const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / sourceHeight);
      const width = image.naturalWidth * scale;
      const height = sourceHeight * scale;
      context.drawImage(
        image,
        0,
        frame * sourceHeight,
        image.naturalWidth,
        sourceHeight,
        (canvas.width - width) / 2,
        (canvas.height - height) / 2,
        width,
        height,
      );
    }
  }
  window.requestAnimationFrame(renderTextureImportPreview);
};

window.requestAnimationFrame(renderTextureImportPreview);

for (const button of textureImportFileButtons) {
  button.addEventListener('click', () => {
    const kind = button.dataset.textureFile;
    document.querySelector(`[data-texture-file-input="${kind}"]`)?.click();
  });
}

for (const input of textureImportFileInputs) {
  input.addEventListener('change', () => {
    const kind = input.dataset.textureFileInput;
    const file = input.files?.[0];
    if (!kind || !file) return;
    textureImportFiles.set(kind, file);
    if (kind === 'texture') {
      if (textureImportPreviewUrl) URL.revokeObjectURL(textureImportPreviewUrl);
      textureImportPreviewUrl = URL.createObjectURL(file);
      textureImportPreviewImage = new Image();
      textureImportPreviewImage.src = textureImportPreviewUrl;
    }
    const button = document.querySelector(`[data-texture-file="${kind}"]`);
    const label = button?.querySelector('span');
    if (label) label.textContent = file.name;
    button?.setAttribute('title', file.name);
  });
}

textureImportId.addEventListener('input', () => {
  const start = textureImportId.selectionStart;
  const normalized = textureImportId.value.toLocaleLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  if (normalized === textureImportId.value) return;
  textureImportId.value = normalized;
  textureImportId.setSelectionRange(Math.min(start, normalized.length), Math.min(start, normalized.length));
});

textureImportSpritesheet.addEventListener('click', () => {
  const checked = textureImportSpritesheet.getAttribute('aria-checked') !== 'true';
  setTextureImportChecked(textureImportSpritesheet, checked);
  textureImportSpritesheetFields.hidden = !checked;
  if (!checked) {
    setTextureImportChecked(textureImportAnimated, false);
    textureImportAnimationFields.hidden = true;
  }
  requestAnimationFrame(syncDialogOverlayScrollbars);
});

textureImportAnimated.addEventListener('click', () => {
  const checked = textureImportAnimated.getAttribute('aria-checked') !== 'true';
  setTextureImportChecked(textureImportAnimated, checked);
  textureImportAnimationFields.hidden = !checked;
  requestAnimationFrame(syncDialogOverlayScrollbars);
});

const setTextureImportFilter = value => {
  const normalizedValue = value === 'item' ? 'item' : '';
  textureFilterSelectedValues.clear();
  if (normalizedValue) textureFilterSelectedValues.add(normalizedValue);
  syncTextureFilterSelection();
};

function syncTextureFilterSelection() {
  const normalizedValue = textureFilterSelectedValues.has('item') ? 'item' : '';
  textureImportFilterButton.dataset.value = normalizedValue;
  textureFilterPreview.replaceChildren();
  for (const option of textureFilterOptionButtons) {
    const selected = textureFilterSelectedValues.has(option.dataset.textureFilterValue);
    option.setAttribute('aria-selected', String(selected));
    option.setAttribute('aria-pressed', String(selected));
  }
  for (const value of textureFilterSelectedValues) {
    const option = textureFilterOptionButtons.find(candidate => (
      candidate.dataset.textureFilterValue === value
    ));
    if (!option) continue;
    const preview = document.createElement('button');
    preview.className = 'pixel-option';
    preview.type = 'button';
    preview.textContent = option.dataset.textureFilterLabel;
    preview.setAttribute('aria-label', `Remove ${option.dataset.textureFilterLabel} filter`);
    preview.addEventListener('click', () => {
      textureFilterSelectedValues.delete(option.dataset.textureFilterValue);
      syncTextureFilterSelection();
    });
    textureFilterPreview.append(preview);
  }
  requestAnimationFrame(() => {
    textureFilterPreview.style.height = 'auto';
    const previewStyle = getComputedStyle(textureFilterPreview);
    const minimumPreviewHeight = Number.parseFloat(previewStyle.minHeight) || 0;
    const previewBorderHeight = (Number.parseFloat(previewStyle.borderTopWidth) || 0)
      + (Number.parseFloat(previewStyle.borderBottomWidth) || 0);
    const previewHeight = Math.max(
      minimumPreviewHeight,
      textureFilterPreview.scrollHeight + previewBorderHeight,
    );
    textureFilterPreview.style.height = `${previewHeight}px`;
    const previewExtraHeight = Math.max(0, previewHeight - minimumPreviewHeight);
    textureFilterDialog.style.height = `calc(240px + ${previewExtraHeight}px)`;
    syncDialogOverlayScrollbars();
  });
}

const filterTextureFilterOptions = () => {
  const query = textureFilterSearchInput.value.trim().toLocaleLowerCase();
  for (const option of textureFilterOptions.querySelectorAll('[data-texture-filter-label]')) {
    option.hidden = Boolean(query)
      && !option.dataset.textureFilterLabel.toLocaleLowerCase().includes(query);
  }
};

const setTextureImportFilterOpen = open => {
  textureFilterDialog.hidden = !open;
  textureImportFilterButton.setAttribute('aria-expanded', String(open));
  if (!open) return;
  const buttonBounds = textureImportFilterButton.getBoundingClientRect();
  const layerBounds = dialogLayer.getBoundingClientRect();
  const uiScaleFactor = getUiScaleFactor();
  textureFilterDialog.style.left = `${snapCssValueToPhysicalPixel(clamp(
    (buttonBounds.right - layerBounds.left) / uiScaleFactor + (2 * Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ycs-pixel-2x'))),
    0,
    Math.max(0, dialogLayer.clientWidth - textureFilterDialog.offsetWidth),
  ))}px`;
  textureFilterDialog.style.top = `${snapCssValueToPhysicalPixel(clamp(
    (buttonBounds.top - layerBounds.top) / uiScaleFactor,
    0,
    Math.max(0, dialogLayer.clientHeight - textureFilterDialog.offsetHeight),
  ))}px`;
};

textureImportFilterButton.addEventListener('click', () => {
  setTextureImportFilterOpen(textureFilterDialog.hidden);
});

textureFilterOptions.addEventListener('click', event => {
  const option = event.target.closest('[data-texture-filter-value]');
  if (!option) return;
  const value = option.dataset.textureFilterValue;
  if (textureFilterSelectedValues.has(value)) textureFilterSelectedValues.delete(value);
  else textureFilterSelectedValues.add(value);
  syncTextureFilterSelection();
});

textureFilterSearchInput.addEventListener('input', filterTextureFilterOptions);
textureFilterSearchButton.addEventListener('click', () => {
  filterTextureFilterOptions();
  textureFilterSearchInput.focus();
});

textureImportSave.addEventListener('click', async () => {
  const name = textureImportName.value.trim();
  const id = textureImportId.value.trim();
  const textureFile = textureImportFiles.get('texture');
  if (!name || !id || !textureFile) {
    textureImportStatus.textContent = 'Name, ID, and Texture are required.';
    return;
  }

  const spritesheet = textureImportSpritesheet.getAttribute('aria-checked') === 'true';
  const animated = spritesheet && textureImportAnimated.getAttribute('aria-checked') === 'true';
  const rows = spritesheet ? Math.max(1, Number.parseInt(textureImportRows.value, 10) || 1) : 1;
  const defaultFrame = spritesheet
    ? Math.min(rows - 1, Math.max(0, Number.parseInt(textureImportDefaultFrame.value, 10) || 0))
    : undefined;
  const ticksPerFrame = animated
    ? Math.max(1, Number.parseInt(textureImportTicksPerFrame.value, 10) || 1)
    : undefined;
  const maskFile = textureImportFiles.get('mask');
  const emissiveFile = textureImportFiles.get('emissive');
  const toBytes = async file => file ? [...new Uint8Array(await file.arrayBuffer())] : null;

  textureImportSave.disabled = true;
  textureImportStatus.textContent = 'Saving...';
  try {
    const metadata = {
      id,
      label: name,
      filterTo: textureImportFilterButton.dataset.value || undefined,
      fileName: textureFile.name,
      rows,
      defaultFrame,
      animatedOnUse: animated || undefined,
      ticksPerFrame,
      hasMask: Boolean(maskFile) || undefined,
      hasEmissive: Boolean(emissiveFile) || undefined,
    };
    const affectedItemIds = await invoke('save_texture_bundle', {
      id,
      metadata: JSON.stringify(metadata, null, 2),
      textureExt: textureFileExtension(textureFile),
      textureData: await toBytes(textureFile),
      maskExt: maskFile ? textureFileExtension(maskFile) : null,
      maskData: await toBytes(maskFile),
      emissiveExt: emissiveFile ? textureFileExtension(emissiveFile) : null,
      emissiveData: await toBytes(emissiveFile),
    });

    if (isDetachedTextureWindow) {
      await emitTo('main', 'ycs4:texture-saved', {
        id,
        name,
        visualId: detachedTextureVisualId,
        affectedItemIds,
      });
      await appWindow.close();
      return;
    }

    const targetGrid = textureImportTargetGrid?.isConnected ? textureImportTargetGrid : workspaceObjectGrid;
    closeTextureImportDialog();
    const button = addObjectContainer('Texture', 'assets', targetGrid, name);
    const shell = button.closest('.workspace-object-shell');
    if (shell) shell.dataset.workspaceReferenceId = id;
    for (const itemId of affectedItemIds) {
      for (const itemShell of collectWorkspaceHierarchyShells().filter(candidate => (
        candidate.dataset.objectType === 'Item'
        && candidate.dataset.workspaceReferenceId === itemId
      ))) {
        loadItemPreviewForShell(itemShell);
      }
    }
    persistWorkspaceLayout();
    syncPrimaryWorkspaceObjects();
  } catch (error) {
    textureImportStatus.textContent = `Save failed: ${error}`;
  } finally {
    textureImportSave.disabled = false;
  }
});

textureImportCancel.addEventListener('click', closeTextureImportDialog);
textureImportClose.addEventListener('click', closeTextureImportDialog);

const closeWarningDialog = () => {
  if (isDetachedWarningWindow) {
    appWindow.close().catch(console.error);
    return;
  }
  warningDialog.hidden = true;
  warningSaveAction = null;
  warningCancelAction = null;
  dialogLayer.classList.remove('dialog-layer-modal');
  if (
    (!preferencesDialog || preferencesDialog.hidden)
    && (!hexColorDialog || hexColorDialog.hidden)
    && (!confirmDialog || confirmDialog.hidden)
    && (!textureImportDialog || textureImportDialog.hidden)
  ) {
    dialogLayer.hidden = true;
  }
};

const measureWarningDialogHeight = () => {
  const bodyStyle = getComputedStyle(warningDialogBody);
  const visibleSections = [
    warningDialogSummary,
    warningDialogUsageList.hidden ? null : warningDialogUsageList,
    warningDialog.querySelector('.warning-dialog-actions'),
  ].filter(Boolean);
  const gap = Number.parseFloat(bodyStyle.rowGap) || 0;
  const bodyChrome = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth']
    .reduce((total, property) => total + (Number.parseFloat(bodyStyle[property]) || 0), 0);
  const contentHeight = visibleSections.reduce((total, section) => (
    total + (section === warningDialogUsageList ? section.scrollHeight : section.offsetHeight)
  ), 0);
  return warningTitlebar.offsetHeight
    + bodyChrome
    + contentHeight
    + (gap * Math.max(0, visibleSections.length - 1));
};

const sizeAndCenterWarningDialog = () => {
  const artPixel = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--ycs-pixel-2x'),
  ) || 2;
  const availableHeight = Math.max(1, dialogLayer.clientHeight - 16);
  const desiredHeight = measureWarningDialogHeight();
  const width = Math.round(warningDialog.offsetWidth / artPixel) * artPixel;
  const height = Math.round(Math.min(desiredHeight, availableHeight) / artPixel) * artPixel;
  warningDialog.style.width = `${width}px`;
  warningDialog.style.height = `${height}px`;
  warningDialog.style.transform = 'none';
  warningDialog.style.left = `${snapCssValueToPhysicalPixel(
    Math.max(0, (dialogLayer.clientWidth - width) / 2),
  )}px`;
  warningDialog.style.top = `${snapCssValueToPhysicalPixel(
    Math.max(0, (dialogLayer.clientHeight - height) / 2),
  )}px`;
};

const showInlineWarningDialog = ({
  summary,
  usages = [],
  saveAction = null,
  cancelAction = null,
}) => {
  warningDialogSummary.textContent = summary;
  warningDialogUsageList.replaceChildren(...usages.map(usage => {
    const item = document.createElement('li');
    item.textContent = usage;
    return item;
  }));
  warningDialogUsageList.hidden = usages.length === 0;
  warningSaveAction = saveAction;
  warningCancelAction = cancelAction;
  const hasSaveAction = typeof saveAction === 'function';
  warningDialogOkay.hidden = hasSaveAction;
  warningDialogSave.hidden = !hasSaveAction;
  warningDialogCancel.hidden = !hasSaveAction;
  warningDialog.style.left = '50%';
  warningDialog.style.top = '50%';
  warningDialog.style.transform = 'translate(-50%, -50%)';
  warningDialog.hidden = false;
  dialogLayer.classList.add('dialog-layer-modal');
  dialogLayer.hidden = false;
  requestAnimationFrame(async () => {
    sizeAndCenterWarningDialog();
    if (isDetachedWarningWindow) {
      const uiScaleFactor = getUiScaleFactor();
      const width = Math.round(320 * uiScaleFactor);
      const height = Math.round(Math.min(360, measureWarningDialogHeight()) * uiScaleFactor);
      try {
        await appWindow.setSize(new LogicalSize(width, height));
      } catch (error) {
        console.error('Unable to fit detached Warning window:', error);
      }
    }
  });
  (hasSaveAction ? warningDialogSave : warningDialogOkay).focus();
};

const showWarningDialog = ({
  summary,
  usages = [],
  saveAction = null,
  cancelAction = null,
  panelId = '',
}) => {
  if (isDetachedWarningWindow) {
    showInlineWarningDialog({ summary, usages, saveAction, cancelAction });
    return;
  }
  openDetachedWarningWindow({ summary, usages, panelId }).catch(() => {
    showInlineWarningDialog({ summary, usages, saveAction, cancelAction });
  });
};

const showTextureUsageWarning = (textureId, usages) => showWarningDialog({
  summary: `Cannot delete "${textureId}". This Texture is used by:`,
  usages,
});

const showUnsavedChangesWarning = panel => showWarningDialog({
  summary: 'Save changes before closing this Item?',
  saveAction: () => panel.querySelector('[data-item-action="save"]')?.click(),
  cancelAction: () => {
    const tab = workspaceTabs.querySelector(`[data-workspace-panel-id="${CSS.escape(panel.id)}"]`);
    if (tab) removeWorkspaceTab(tab);
  },
  panelId: panel.id,
});

warningDialogOkay.addEventListener('click', closeWarningDialog);
warningDialogSave.addEventListener('click', () => {
  const saveAction = warningSaveAction;
  Promise.resolve(saveAction?.()).finally(closeWarningDialog);
});
warningDialogCancel.addEventListener('click', () => {
  const cancelAction = warningCancelAction;
  Promise.resolve(cancelAction?.()).finally(closeWarningDialog);
});
warningClose.addEventListener('click', closeWarningDialog);

const closeConfirmDialog = () => {
  if (confirmDialog) confirmDialog.hidden = true;
  pendingFolderDeleteShell = null;
  dialogLayer.classList.remove('dialog-layer-modal');
  if (
    (!preferencesDialog || preferencesDialog.hidden)
    && (!hexColorDialog || hexColorDialog.hidden)
    && (!textureImportDialog || textureImportDialog.hidden)
  ) {
    dialogLayer.hidden = true;
  }
};

const showDeleteConfirmationDialog = (folderShell, itemCount) => {
  pendingFolderDeleteShell = folderShell;
  const message = itemCount === 1
    ? 'Folder has 1 item inside'
    : `Folder has ${itemCount} items inside`;
  if (confirmDialogMessage) confirmDialogMessage.textContent = message;
  if (preferencesDialog) preferencesDialog.hidden = true;
  if (confirmDialog) {
    confirmDialog.style.transform = 'translate(-50%, -50%)';
    confirmDialog.style.left = '50%';
    confirmDialog.style.top = '50%';
    confirmDialog.hidden = false;
  }
  dialogLayer.classList.add('dialog-layer-modal');
  dialogLayer.hidden = false;
  if (confirmDialogNo) confirmDialogNo.focus();
};

if (confirmDialogYes) {
  confirmDialogYes.addEventListener('click', () => {
    const shell = pendingFolderDeleteShell;
    closeConfirmDialog();
    if (shell) {
      removeObjectContainerShell(shell);
    }
  });
}

if (confirmDialogNo) {
  confirmDialogNo.addEventListener('click', closeConfirmDialog);
}

if (confirmClose) {
  confirmClose.addEventListener('click', closeConfirmDialog);
}

// The context menu listener is now handled globally on the document
workspaceObjectDeleteOption.addEventListener('click', async () => {
  const shell = contextObjectShell;
  closeWorkspaceObjectContextMenu();
  if (!shell) return;

  await removeWorkspaceObjectWithLifecycle(shell);
});

workspaceCreateOptions.addEventListener('keydown', event => {
  const visibleOptions = workspaceCreateOptionButtons.filter(option => !option.hidden);
  const currentIndex = visibleOptions.indexOf(
    event.target.closest('[data-workspace-create-option]'),
  );
  if (currentIndex < 0) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    setWorkspaceCreateOptionsOpen(false);
    workspaceCreateButton.focus();
    return;
  }
  const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
  if (direction === 0) return;
  event.preventDefault();
  visibleOptions[
    (currentIndex + direction + visibleOptions.length)
      % visibleOptions.length
  ].focus();
});

uiScaleButton.addEventListener('click', () => {
  setUiScaleOptionsOpen(uiScaleOptions.hidden);
});

uiScaleButton.addEventListener('keydown', event => {
  if (!['ArrowDown', 'Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  setUiScaleOptionsOpen(true, true);
});

uiScaleOptions.addEventListener('click', event => {
  const option = event.target.closest('[data-scale]');
  if (!option) return;
  setUiScaleOptionsOpen(false);
  applyUiScale(Number(option.dataset.scale));
  uiScaleButton.focus();
});

uiScaleOptions.addEventListener('keydown', event => {
  const currentIndex = uiScaleOptionButtons.indexOf(event.target.closest('[data-scale]'));
  if (currentIndex < 0) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    setUiScaleOptionsOpen(false);
    uiScaleButton.focus();
    return;
  }

  let nextIndex = null;
  if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % uiScaleOptionButtons.length;
  else if (event.key === 'ArrowUp') {
    nextIndex = (currentIndex - 1 + uiScaleOptionButtons.length) % uiScaleOptionButtons.length;
  } else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = uiScaleOptionButtons.length - 1;

  if (nextIndex === null) return;
  event.preventDefault();
  uiScaleOptionButtons[nextIndex].focus();
});

testDropdownButton.addEventListener('click', () => {
  setTestDropdownOpen(testDropdownOptions.hidden);
});

testDropdownButton.addEventListener('keydown', event => {
  if (!['ArrowDown', 'Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  setTestDropdownOpen(true, true);
});

testDropdownOptions.addEventListener('click', event => {
  const option = event.target.closest('[data-test-option]');
  if (!option) return;
  testDropdownSelection = option.dataset.testOption;
  syncTestDropdownControl();
  setTestDropdownOpen(false);
  testDropdownButton.focus();
});

testDropdownOptions.addEventListener('keydown', event => {
  const currentIndex = testDropdownOptionButtons.indexOf(
    event.target.closest('[data-test-option]'),
  );
  if (currentIndex < 0) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    setTestDropdownOpen(false);
    testDropdownButton.focus();
    return;
  }

  let nextIndex = null;
  if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % testDropdownOptionButtons.length;
  else if (event.key === 'ArrowUp') {
    nextIndex = (currentIndex - 1 + testDropdownOptionButtons.length)
      % testDropdownOptionButtons.length;
  } else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = testDropdownOptionButtons.length - 1;

  if (nextIndex === null) return;
  event.preventDefault();
  testDropdownOptionButtons[nextIndex].focus();
});

testComboboxButton.addEventListener('click', () => {
  filterTestComboboxOptions('');
  setTestComboboxOpen(testComboboxOptions.hidden);
});

testComboboxButton.addEventListener('keydown', event => {
  if (!['ArrowDown', 'Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  filterTestComboboxOptions('');
  setTestComboboxOpen(true, true);
});

testComboboxInput.addEventListener('input', () => {
  filterTestComboboxOptions(testComboboxInput.value);
  setTestComboboxOpen(true);
});

testComboboxInput.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    setTestComboboxOpen(false);
    return;
  }
  if (event.key !== 'ArrowDown') return;
  event.preventDefault();
  filterTestComboboxOptions(testComboboxInput.value);
  setTestComboboxOpen(true, true);
});

testComboboxOptions.addEventListener('click', event => {
  const option = event.target.closest('[data-combobox-option]');
  if (!option) return;
  testComboboxSelection = option.dataset.comboboxOption;
  syncTestComboboxControl();
  setTestComboboxOpen(false);
  testComboboxInput.focus();
});

testComboboxOptions.addEventListener('keydown', event => {
  const visibleOptions = testComboboxOptionButtons.filter(option => !option.hidden);
  const currentIndex = visibleOptions.indexOf(
    event.target.closest('[data-combobox-option]'),
  );
  if (currentIndex < 0) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    setTestComboboxOpen(false);
    testComboboxButton.focus();
    return;
  }

  let nextIndex = null;
  if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % visibleOptions.length;
  else if (event.key === 'ArrowUp') {
    nextIndex = (currentIndex - 1 + visibleOptions.length) % visibleOptions.length;
  } else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = visibleOptions.length - 1;

  if (nextIndex === null) return;
  event.preventDefault();
  visibleOptions[nextIndex].focus();
});

testCheckbox.addEventListener('click', () => {
  const checked = testCheckbox.getAttribute('aria-checked') === 'true';
  testCheckbox.setAttribute('aria-checked', String(!checked));
});

testValueSlider.addEventListener('input', () => syncPixelValueSlider(testValueSlider));

testHexInput.addEventListener('focus', () => {
  testHexInput.maxLength = 6;
  testHexInput.value = testHexValue;
  requestAnimationFrame(() => testHexInput.select());
});

testHexInput.addEventListener('input', () => {
  const sanitizedValue = testHexInput.value
    .replace(/^#/, '')
    .replace(/[^0-9a-f]/gi, '')
    .slice(0, 6)
    .toUpperCase();
  testHexInput.value = sanitizedValue;
  if (!isCompleteHex(sanitizedValue)) return;
  Object.assign(testColor, parseHexRgb(sanitizedValue));
  syncHueFromRgb();
  syncTestHexColor();
});

testHexInput.addEventListener('blur', () => {
  testHexInput.maxLength = 7;
  testHexInput.value = `#${testHexValue}`;
});

testHexInput.addEventListener('dblclick', event => {
  event.preventDefault();
  openHexColorDialog();
});

hexColorDialogValue.addEventListener('focus', () => {
  hexColorDialogValue.maxLength = 6;
  hexColorDialogValue.value = testHexValue;
  requestAnimationFrame(() => hexColorDialogValue.select());
});

hexColorDialogValue.addEventListener('input', () => {
  const sanitizedValue = hexColorDialogValue.value
    .replace(/^#/, '')
    .replace(/[^0-9a-f]/gi, '')
    .slice(0, 6)
    .toUpperCase();
  hexColorDialogValue.value = sanitizedValue;
  if (!isCompleteHex(sanitizedValue)) return;
  Object.assign(testColor, parseHexRgb(sanitizedValue));
  syncHueFromRgb();
  syncTestHexColor();
});

hexColorDialogValue.addEventListener('blur', () => {
  hexColorDialogValue.maxLength = 7;
  hexColorDialogValue.value = `#${testHexValue}`;
});

for (const input of hexChannelInputs) {
  input.addEventListener('input', () => {
    testColor[input.dataset.hexChannel] = Number(input.value);
    if (input.dataset.hexChannel !== 'a') syncHueFromRgb();
    syncTestHexColor();
  });
}

hexHueSliderInput.addEventListener('input', () => {
  testColorHue = Number(hexHueSliderInput.value);
  const current = rgbToHsv(testColor);
  const saturation = current.s === 0 ? 1 : current.s;
  const value = current.v === 0 ? 1 : current.v;
  Object.assign(testColor, hsvToRgb(testColorHue, saturation, value));
  syncTestHexColor();
});

const updateTestColorFromPicker = event => {
  const bounds = hexColorPicker.getBoundingClientRect();
  const horizontal = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
  const vertical = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
  Object.assign(testColor, hsvToRgb(testColorHue, horizontal, 1 - vertical));
  syncTestHexColor();
};

hexColorPicker.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  event.preventDefault();
  hexPickerPointerId = event.pointerId;
  hexColorPicker.setPointerCapture(event.pointerId);
  updateTestColorFromPicker(event);
});

hexColorPicker.addEventListener('pointermove', event => {
  if (hexPickerPointerId !== event.pointerId) return;
  updateTestColorFromPicker(event);
});

const stopHexPickerDrag = event => {
  if (hexPickerPointerId !== event.pointerId) return;
  hexPickerPointerId = null;
};

hexColorPicker.addEventListener('pointerup', stopHexPickerDrag);
hexColorPicker.addEventListener('pointercancel', stopHexPickerDrag);

hexColorPicker.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  const current = rgbToHsv(testColor);
  let saturation = current.s;
  let value = current.v;
  if (event.key === 'ArrowLeft') saturation = clamp(saturation - 0.01, 0, 1);
  else if (event.key === 'ArrowRight') saturation = clamp(saturation + 0.01, 0, 1);
  else if (event.key === 'ArrowUp') value = clamp(value + 0.01, 0, 1);
  else value = clamp(value - 0.01, 0, 1);
  Object.assign(testColor, hsvToRgb(testColorHue, saturation, value));
  syncTestHexColor();
});

preferencesTitlebar.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('button')) return;
  event.preventDefault();
  if (isDetachedFloatingWindow) {
    appWindow.startDragging().catch(console.error);
    return;
  }
  normalizeDialogPosition();
  dialogDragState = {
    pointerId: event.pointerId,
    startPointerX: event.clientX,
    startPointerY: event.clientY,
    startLeft: Number.parseFloat(preferencesDialog.style.left) || 0,
    startTop: Number.parseFloat(preferencesDialog.style.top) || 0,
  };
  preferencesTitlebar.setPointerCapture(event.pointerId);
});

preferencesTitlebar.addEventListener('pointermove', event => {
  if (dialogDragState?.pointerId !== event.pointerId) return;
  const uiScaleFactor = getUiScaleFactor();
  const left = dialogDragState.startLeft
    + (event.clientX - dialogDragState.startPointerX) / uiScaleFactor;
  const top = dialogDragState.startTop
    + (event.clientY - dialogDragState.startPointerY) / uiScaleFactor;
  preferencesDialog.style.left = `${snapCssValueToPhysicalPixel(clamp(
    left,
    0,
    Math.max(0, dialogLayer.clientWidth - preferencesDialog.offsetWidth),
  ))}px`;
  preferencesDialog.style.top = `${snapCssValueToPhysicalPixel(clamp(
    top,
    0,
    Math.max(0, dialogLayer.clientHeight - preferencesDialog.offsetHeight),
  ))}px`;
});

const stopDialogDrag = event => {
  if (dialogDragState?.pointerId !== event.pointerId) return;
  dialogDragState = null;
};

preferencesTitlebar.addEventListener('pointerup', stopDialogDrag);
preferencesTitlebar.addEventListener('pointercancel', stopDialogDrag);

const normalizeConfirmDialogPosition = () => {
  if (confirmDialog.style.transform === 'none') return;
  const rect = confirmDialog.getBoundingClientRect();
  const layerRect = dialogLayer.getBoundingClientRect();
  const uiScaleFactor = getUiScaleFactor();
  confirmDialog.style.transform = 'none';
  confirmDialog.style.left = `${snapCssValueToPhysicalPixel(
    (rect.left - layerRect.left) / uiScaleFactor,
  )}px`;
  confirmDialog.style.top = `${snapCssValueToPhysicalPixel(
    (rect.top - layerRect.top) / uiScaleFactor,
  )}px`;
};

if (textureImportTitlebar) {
  textureImportTitlebar.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    event.preventDefault();
    if (isDetachedTextureWindow) appWindow.startDragging().catch(console.error);
  });
}

if (confirmTitlebar) {
  confirmTitlebar.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    event.preventDefault();
    normalizeConfirmDialogPosition();
    confirmDialogDragState = {
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startLeft: Number.parseFloat(confirmDialog.style.left) || 0,
      startTop: Number.parseFloat(confirmDialog.style.top) || 0,
    };
    confirmTitlebar.setPointerCapture(event.pointerId);
  });

  confirmTitlebar.addEventListener('pointermove', event => {
    if (confirmDialogDragState?.pointerId !== event.pointerId) return;
    const uiScaleFactor = getUiScaleFactor();
    const left = confirmDialogDragState.startLeft
      + (event.clientX - confirmDialogDragState.startPointerX) / uiScaleFactor;
    const top = confirmDialogDragState.startTop
      + (event.clientY - confirmDialogDragState.startPointerY) / uiScaleFactor;
    confirmDialog.style.left = `${snapCssValueToPhysicalPixel(clamp(
      left,
      0,
      Math.max(0, dialogLayer.clientWidth - confirmDialog.offsetWidth),
    ))}px`;
    confirmDialog.style.top = `${snapCssValueToPhysicalPixel(clamp(
      top,
      0,
      Math.max(0, dialogLayer.clientHeight - confirmDialog.offsetHeight),
    ))}px`;
  });

  const stopConfirmDialogDrag = event => {
    if (confirmDialogDragState?.pointerId !== event.pointerId) return;
    confirmDialogDragState = null;
  };

  confirmTitlebar.addEventListener('pointerup', stopConfirmDialogDrag);
  confirmTitlebar.addEventListener('pointercancel', stopConfirmDialogDrag);
}

warningTitlebar.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('button')) return;
  event.preventDefault();
  if (isDetachedWarningWindow) {
    appWindow.startDragging().catch(console.error);
    return;
  }
  const rect = warningDialog.getBoundingClientRect();
  const layerRect = dialogLayer.getBoundingClientRect();
  const uiScaleFactor = getUiScaleFactor();
  warningDialog.style.transform = 'none';
  warningDialog.style.left = `${snapCssValueToPhysicalPixel(
    (rect.left - layerRect.left) / uiScaleFactor,
  )}px`;
  warningDialog.style.top = `${snapCssValueToPhysicalPixel(
    (rect.top - layerRect.top) / uiScaleFactor,
  )}px`;
  warningDialogDragState = {
    pointerId: event.pointerId,
    startPointerX: event.clientX,
    startPointerY: event.clientY,
    startLeft: Number.parseFloat(warningDialog.style.left) || 0,
    startTop: Number.parseFloat(warningDialog.style.top) || 0,
  };
  warningTitlebar.setPointerCapture(event.pointerId);
});

warningTitlebar.addEventListener('pointermove', event => {
  if (warningDialogDragState?.pointerId !== event.pointerId) return;
  const uiScaleFactor = getUiScaleFactor();
  const left = warningDialogDragState.startLeft
    + (event.clientX - warningDialogDragState.startPointerX) / uiScaleFactor;
  const top = warningDialogDragState.startTop
    + (event.clientY - warningDialogDragState.startPointerY) / uiScaleFactor;
  warningDialog.style.left = `${snapCssValueToPhysicalPixel(clamp(
    left,
    0,
    Math.max(0, dialogLayer.clientWidth - warningDialog.offsetWidth),
  ))}px`;
  warningDialog.style.top = `${snapCssValueToPhysicalPixel(clamp(
    top,
    0,
    Math.max(0, dialogLayer.clientHeight - warningDialog.offsetHeight),
  ))}px`;
});

const stopWarningDialogDrag = event => {
  if (warningDialogDragState?.pointerId !== event.pointerId) return;
  warningDialogDragState = null;
};

warningTitlebar.addEventListener('pointerup', stopWarningDialogDrag);
warningTitlebar.addEventListener('pointercancel', stopWarningDialogDrag);

preferencesDialog.addEventListener('pointerdown', event => {
  const handle = event.target.closest('[data-resize]');
  if (!handle || event.button !== 0) return;
  event.preventDefault();
  normalizeDialogPosition();
  dialogResizeState = {
    pointerId: event.pointerId,
    direction: handle.dataset.resize,
    startPointerX: event.clientX,
    startPointerY: event.clientY,
    startLeft: Number.parseFloat(preferencesDialog.style.left) || 0,
    startTop: Number.parseFloat(preferencesDialog.style.top) || 0,
    startWidth: preferencesDialog.offsetWidth,
    startHeight: preferencesDialog.offsetHeight,
  };
  handle.setPointerCapture(event.pointerId);
});

const updateDialogResize = event => {
  if (dialogResizeState?.pointerId !== event.pointerId) return;
  const state = dialogResizeState;
  const uiScaleFactor = getUiScaleFactor();
  const deltaX = (event.clientX - state.startPointerX) / uiScaleFactor;
  const deltaY = (event.clientY - state.startPointerY) / uiScaleFactor;
  let left = state.startLeft;
  let top = state.startTop;
  let width = state.startWidth;
  let height = state.startHeight;
  const effectiveMinimumWidth = Math.min(minimumDialogWidth, dialogLayer.clientWidth - 16);
  const effectiveMinimumHeight = Math.min(minimumDialogHeight, dialogLayer.clientHeight - 16);

  if (state.direction.includes('e')) {
    width = clamp(
      state.startWidth + deltaX,
      effectiveMinimumWidth,
      dialogLayer.clientWidth - state.startLeft,
    );
  }

  if (state.direction.includes('w')) {
    width = clamp(
      state.startWidth - deltaX,
      effectiveMinimumWidth,
      state.startLeft + state.startWidth,
    );
    left = state.startLeft + state.startWidth - width;
  }

  if (state.direction.includes('s')) {
    height = clamp(
      state.startHeight + deltaY,
      effectiveMinimumHeight,
      dialogLayer.clientHeight - state.startTop,
    );
  }

  if (state.direction.includes('n')) {
    height = clamp(
      state.startHeight - deltaY,
      effectiveMinimumHeight,
      state.startTop + state.startHeight,
    );
    top = state.startTop + state.startHeight - height;
  }

  preferencesDialog.style.left = `${snapCssValueToPhysicalPixel(left)}px`;
  preferencesDialog.style.top = `${snapCssValueToPhysicalPixel(top)}px`;
  preferencesDialog.style.width = `${snapCssValueToPhysicalPixel(width)}px`;
  preferencesDialog.style.height = `${snapCssValueToPhysicalPixel(height)}px`;
};

const stopDialogResize = event => {
  if (dialogResizeState?.pointerId !== event.pointerId) return;
  dialogResizeState = null;
  saveDialogSize();
};

window.addEventListener('pointermove', updateDialogResize);
window.addEventListener('pointerup', stopDialogResize);
window.addEventListener('pointercancel', stopDialogResize);

window.addEventListener('resize', () => {
  syncPixelArtScale();
  constrainTaskTerminalHeight();
  if (!fileMenu.hidden) snapMenuToPhysicalPixels(fileMenu);
  if (!editMenu.hidden) snapMenuToPhysicalPixels(editMenu);
  if (dialogLayer.hidden) return;
  if (isDetachedFloatingWindow) {
    requestAnimationFrame(syncDialogOverlayScrollbars);
    return;
  }
  applyStoredDialogSize();
  constrainDialogToWorkspace();
  if (!warningDialog.hidden) {
    warningDialog.style.left = `${snapCssValueToPhysicalPixel(clamp(
      Number.parseFloat(warningDialog.style.left) || 0,
      0,
      Math.max(0, dialogLayer.clientWidth - warningDialog.offsetWidth),
    ))}px`;
    warningDialog.style.top = `${snapCssValueToPhysicalPixel(clamp(
      Number.parseFloat(warningDialog.style.top) || 0,
      0,
      Math.max(0, dialogLayer.clientHeight - warningDialog.offsetHeight),
    ))}px`;
  }
});

window.addEventListener('storage', event => {
  if (event.key !== uiScaleStorageKey) return;
  const storedScale = Number.parseInt(event.newValue, 10);
  if (allowedUiScalePercentages.has(storedScale)) applyUiScale(storedScale);
});

syncPixelArtScale();

if (isDetachedFloatingWindow) {
  configureDetachedDialog(detachedWindowType);
  dialogLayer.hidden = false;
  requestAnimationFrame(syncDialogOverlayScrollbars);
}

document.addEventListener('contextmenu', event => {
  event.preventDefault();
  const shell = event.target.closest('.workspace-object-shell');
  if (shell) {
    openWorkspaceObjectContextMenu(
      resolvePrimarySearchResult(shell),
      event.clientX,
      event.clientY,
    );
    return;
  }

  const grid = event.target.closest('.workspace-object-grid')
    || event.target.closest('.workspace-folder-grid')
    || event.target.closest('.workspace-inner-container')?.querySelector('.workspace-object-grid');
  if (grid) {
    openEmptySpaceContextMenu(grid, event.clientX, event.clientY);
    return;
  }

  closeWorkspaceObjectContextMenu();
});

document.addEventListener('pointerdown', event => {
  if (
    textureImportDialog
    && !textureImportDialog.hidden
    && !event.target.closest('#texture-import-dialog, #texture-filter-dialog')
  ) {
    closeTextureImportDialog();
  }
  if (confirmDialog && !confirmDialog.hidden && !event.target.closest('#confirm-dialog')) {
    closeConfirmDialog();
  }
  if (!hexColorDialog.hidden && !event.target.closest('#hex-color-dialog')) {
    closeHexColorDialog();
  }
  if (!event.target.closest('.preferences-scale-dropdown')) setUiScaleOptionsOpen(false);
  if (!event.target.closest('#test-dropdown')) setTestDropdownOpen(false);
  if (!event.target.closest('#test-combobox')) setTestComboboxOpen(false);
  if (!event.target.closest('#workspace-create-dropdown')) setWorkspaceCreateOptionsOpen(false);
  if (!event.target.closest('#texture-import-filter-button, #texture-filter-dialog')) {
    setTextureImportFilterOpen(false);
  }
  if (!event.target.closest('#workspace-object-context-menu')) closeWorkspaceObjectContextMenu();
  if (!event.target.closest('.workspace-item-dropdown')) closeItemEditorDropdowns();
  if (event.target.closest('.menu-entry')) return;
  setFileMenuOpen(false);
  setEditMenuOpen(false);
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;

  if (!textureFilterDialog.hidden) {
    setTextureImportFilterOpen(false);
    textureImportFilterButton.focus();
    return;
  }

  if (textureImportDialog && !textureImportDialog.hidden) {
    closeTextureImportDialog();
    return;
  }

  if (!warningDialog.hidden) {
    closeWarningDialog();
    return;
  }

  if (confirmDialog && !confirmDialog.hidden) {
    closeConfirmDialog();
    return;
  }

  if (!workspaceObjectContextMenu.hidden) {
    closeWorkspaceObjectContextMenu();
    return;
  }

  if (!hexColorDialog.hidden) {
    closeHexColorDialog();
    testHexInput.focus();
    return;
  }

  if (!uiScaleOptions.hidden) {
    setUiScaleOptionsOpen(false);
    uiScaleButton.focus();
    return;
  }

  if (!testDropdownOptions.hidden) {
    setTestDropdownOpen(false);
    testDropdownButton.focus();
    return;
  }

  if (!testComboboxOptions.hidden) {
    setTestComboboxOpen(false);
    testComboboxButton.focus();
    return;
  }

  if (!workspaceCreateOptions.hidden) {
    setWorkspaceCreateOptionsOpen(false);
    workspaceCreateButton.focus();
    return;
  }

  if (!fileMenu.hidden || !editMenu.hidden) {
    const returnTarget = fileMenu.hidden ? editMenuButton : fileMenuButton;
    setFileMenuOpen(false);
    setEditMenuOpen(false);
    returnTarget.focus();
    return;
  }

  if (!dialogLayer.hidden) {
    if (isDetachedFloatingWindow) {
      appWindow.close().catch(console.error);
      return;
    }
    setPreferencesDialogOpen(false);
    editMenuButton.focus();
  }
});
