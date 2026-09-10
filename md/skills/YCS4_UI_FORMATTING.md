# YCS4 UI Formatting

This is the prescriptive visual and component standard for YCS4. Read it before creating or changing YCS4 UI. Review the affected page for existing violations and use the shared components and tokens described here instead of introducing page-local variants.

Keep this document limited to durable design-system rules. Page behavior, implementation history, completed work, and session notes belong elsewhere when they remain useful.

## Source of truth

- Editable raster sources live directly in `YCS4/assets/sprite/`.
- `YCS4/assets/sprite/generated/` contains build output. Never edit generated sprites directly.
- Run `npm run prepare:sprites` after changing a source sprite. Development, production, and Tauri scripts also prepare sprites automatically.
- Shared UI styling lives in `YCS4/src/styles.css`. Reuse existing classes and CSS variables before adding new ones.
- Reusable page-specific behavior belongs in that page's module. Do not accumulate page implementation inside the application shell.

## Visual foundation

### Color and type

- Workspace, menu-bar, and uncovered content backgrounds use `var(--ycs-background)` (`#2c2c30`).
- Normal text uses `var(--ycs-text-normal)` (`#c0c0c0`). Do not repeat the literal color in component rules.
- Non-titlebar UI text inherits `var(--ycs-ui-font-size)` (`10px`).
- The native-style titlebar is the sole standard exception and retains its system font and `12px` title.
- Interaction colors must return to the shared normal tokens when the interaction ends.

### Pixel rendering and DPI

- Raster UI uses the shared monitor-aware 2x physical-pixel grid. Never assume one CSS pixel equals one physical pixel.
- Use the existing `--ycs-*` DPI sizing tokens and sprite-preparation output. Do not introduce independently rounded borders or filtered sprite scaling.
- Pixel-art images use nearest-neighbor rendering and whole-source-pixel slices. Nine-slice centers and edges repeat or crop; they do not blur or stretch unevenly.
- Menu origins and floating-dialog position and size remain snapped to physical pixels.
- Monitor changes must recalculate the pixel grid and resnap open menus and dialogs.

### Interface scale

- Preferences Scale supports 100%, 200%, 300%, 400%, and 500%; 200% is the visual baseline.
- All non-titlebar UI belongs inside `ui-shell`, whose layout-time CSS `zoom` scales text, spacing, components, and textures together.
- Do not replace layout-time zoom with `transform: scale(...)` or apply inverse width/height percentages.
- Pointer or bounds calculations that cross between viewport and scaled layout coordinates use `getUiScaleFactor()`.
- Avoid unscaled body-level portals. A necessary portal must implement the same scale and coordinate conversion.

## Shared component rules

Use semantic state attributes such as `aria-pressed`, `aria-expanded`, `aria-selected`, and `aria-checked`. Shared CSS must derive visuals from those states rather than page-local inline images.

| Component | Required class or structure | Editable sprite |
| --- | --- | --- |
| Button | `pixel-button` | `button.png` |
| Dropdown trigger or option | `pixel-option` | `option_container.png` |
| Connected option list | `pixel-option-stack` | `option_container.png` |
| Textbox | `pixel-text-box` | `text_box.png` |
| File field | `pixel-button pixel-file-button` | `button.png` |
| Combobox | `pixel-combobox` containing a textbox, button, and option stack | shared sprites |
| Ingredient combobox | reusable `ingredient-combobox.js` component | shared textbox, button, option, and scrollbar sprites |
| Checkbox | `pixel-checkbox` | `checkbox.png` |
| Divider | `pixel-divider` plus its orientation class | divider sprite |
| Direction icon | `pixel-direction-icon` plus direction class | `direction.png` |
| Value slider | `pixel-value-slider` | `value_slider.png` |
| Hex field | `pixel-hex-field` | `hex.png` |
| Workspace tab | `workspace-tab` | `tab_container.png` |
| Workspace surface | `workspace-container` | `tab_workspace_container.png` |
| Floating dialog | canonical `floating-dialog` structure | `window.png` and dialog sprites |

Edit > Test is the live component reference. Add genuinely reusable controls there and to this catalog; do not use it as a changelog.

### Buttons

- Regular workspace buttons use `pixel-button`.
- `button.png` contains normal, hover, pressed, and pressed-hover frames. Pressed state is selected with `aria-pressed="true"`.
- Keep the border transparent while textures load.
- Compact titlebar and workspace-rail controls are intentional size exceptions but still reuse the appropriate shared visuals.

### Dropdowns and comboboxes

- Do not use native `<select>` for visible dropdown surfaces; operating-system menus cannot follow the YCS4 skin.
- A custom dropdown provides a trigger, positioned listbox, `pixel-option` rows, keyboard navigation, Escape handling, click-outside closing, and correct ARIA state.
- Vertically connected options use `pixel-option-stack` so only the outer top and bottom edges are drawn.
- Expanded triggers show the pressed button treatment and an Up direction icon; closed triggers show Down.
- Searchable or large sets use the shared combobox pattern. Options remain vertical and use the full dropdown width.
- Item-valued fields use `createIngredientCombobox()` from `ingredient-combobox.js`. Its shared catalog includes project and vanilla Items plus project, vanilla, and NeoForge item tags; tag values carry a leading `#`. Its default field, dropdown button, connected option textures, filtering, six-row stepped scrolling, keyboard behavior, and overlay scrollbar are one reusable component; page-specific layouts may provide only a narrowly scoped option-host sizing class.

### Text, numeric, and file fields

- Text inputs use `pixel-text-box` and the shared font-size/line-height rhythm.
- Numeric inputs remain keyboard-editable but suppress native browser spin buttons.
- File inputs use `pixel-file-button`; show `Add` before selection and the truncated base filename afterward.
- File controls keep the shared minimum width and may expose the complete selected name through `title`.

### Checkboxes, sliders, color, and dividers

- Checkboxes are buttons with `role="checkbox"`, `aria-checked`, and `pixel-checkbox`; do not use native checkbox appearance.
- Sliders use the shared pixel slider frame with a transparent native range input for interaction.
- Hex fields and color dialogs reuse the shared hex, saturation/value, hue, and RGBA controls.
- Dividers use their orientation-specific repeating sprite and must not stretch along their one-pixel axis.

### Direction and action icons

- Use frames from the shared direction and action sprite sheets instead of Unicode arrows, font glyphs, or unrelated SVGs.
- Icons inherit `currentColor` where supported so hover and disabled states remain synchronized with their control.
- Icon-only buttons require an accessible label.
- Editor action groups use the shared Item-editor order: Delete, Cancel, Save. A conditionally unavailable action stays hidden without reordering the remaining actions, so equivalent actions retain predictable positions across editors.

## Layout rules

### Control rhythm

- Dialog controls use `--ycs-control-min-width` unless the component is an explicit compact exception.
- Rows inside dialogs use `dialog-line-stack` and `dialog-line` for a consistent vertical rhythm.
- Labeled controls use `dialog-labeled-row`; the control column begins at the shared start position and retains the shared label gap.
- Preserve component intrinsic minimum sizes. A narrow container scrolls rather than squashing or silently reflowing pixel components.

### Workspace and tabs

- `workspace-container` owns the textured page surface; `workspace-inner-container` owns the normal inset content region.
- Workspace objects reuse the established object or folder structures. Folder visuals are not wrapped in the normal object-button frame.
- Tabs have stable minimum widths, do not shrink, and scroll within the tab viewport when they overflow.
- Tab overflow controls occupy dedicated slots; tab art must never render beneath them.
- Home and Assets remain a radio pair: exactly one mode is pressed, while selecting an already-active mode returns to its first tab.
- Page modules own their form state, fields, dropdowns, actions, scrolling, and cleanup. The application shell owns shared tab and window coordination only.

### Overflow and overlay scrollbars

- The application viewport remains clipped. Scroll responsibility belongs to the component that overflows.
- Hide native scrollbar chrome and use the existing overlay scrollbar implementation.
- Overlay scrollbars paint only their thumbs; tracks and corners remain transparent so content is visible underneath.
- Horizontal and vertical axes appear independently and synchronize with wheel, touchpad, track-click, drag, resize, and content mutations.
- Do not add padding merely to reserve a scrollbar lane.

### Nested content-sized dialogs

- A collection dialog containing repeatable inner dialog-style panels uses a fixed width sized for its populated panel, and keeps that exact width while empty. Adding or removing entries must never resize the outer dialog.
- Calculate the fixed width from the complete largest supported inner layout: label column, labeled-control gap, complete compound-control width, inner padding and borders, outer padding and borders. Connected arrow buttons and combobox triggers are part of the control width; never count only the textbox portion.
- Apply the resulting shared width to both `width` and `min-width`, subject only to the normal viewport maximum. Do not use `max-content` on the outer collection dialog, because an empty collection would collapse.
- The inner body may remain in normal flow to report height and prevent clipping, but it does not determine whether the empty outer dialog shrinks.
- Overflow menus may escape the inner panel when required. Opening a dropdown must not enlarge its parent dialog or create a scrollbar from the temporary option list.

## Floating dialogs

- All YCS4 dialogs reuse the canonical floating-dialog structure and shared window sprites.
- Keep title and body as separate textured regions because their slice geometry differs.
- The titlebar contains left-aligned title text and shared dialog controls. Dialog close controls use `aria-label` and omit native `title` tooltips.
- Dialog bodies own their scrolling through `floating-dialog-body-scroll-host`, `floating-dialog-body`, and the shared overlay-scrollbar initializer.
- Dialogs are modal unless explicitly designated as tools. Modal opening disables the other YCS4 windows and restores them on close or open failure.
- Detached Tauri dialogs use owned frameless windows, scale their native dimensions with the current UI scale, and close only their own instance.
- In-workspace dialogs drag from their titlebar except over controls and resize from edges and corners using window-level pointer tracking.
- Persist dialog size where returning to the previous size benefits the user; position only needs session persistence unless a page specifies otherwise.
- Escape and the close control perform the same cancellation behavior.
- Warning dialogs use the canonical floating-dialog structure and open as owned frameless Tauri windows so their titlebars can move them beyond the main YCS4 window. Their geometry remains physical-pixel snapped. Size the window to its measured message, blocker list, action row, and shared body padding; cap long lists and scroll them. Do not leave filler space between the final blocker and the bottom action row.
- Warning action rows stay bottom-anchored and use the same bottom body padding as Texture Import actions.
- Warning windows are owner-modal and remain above their owner. Disable every other YCS window while a Warning is open, then restore those windows only after the Warning closes or window creation fails.
- The Texture editor uses a fixed window and preview size large enough for every conditional Texture field to be visible simultaneously. Toggling Spritesheet or Animated must not resize the window or introduce normal-form scrolling.
- A blocked destructive action uses `Warning`, a concise reason, a readable list of blockers when applicable, and one centered `Okay` button.
- Closing a dirty editor tab uses `Warning` with an unsaved-changes message and `Save` and `Cancel` buttons. `Save` runs the editor's normal validated save lifecycle. `Cancel` discards the editor state and closes the tab; X and Escape dismiss the warning while keeping the tab open.

## Interaction and accessibility

- Controls must be keyboard reachable and show the same logical state for pointer and keyboard interaction.
- Custom listboxes support arrow navigation, selection, Escape, and focus restoration.
- Use native semantic elements where their visible surface can be fully styled; otherwise provide the correct role and ARIA state.
- Do not use color as the only state indicator.
- Suppress the WebView context menu at the application level without disabling text selection or keyboard copy.
- Avoid rewriting selectable text nodes while a selection exists; DOM replacement destroys the user's selection.

## Exceptions and updates

An exception must be required by the component's role, not introduced for convenience. Keep it narrow and document it in the relevant section only when future work could otherwise mistake it for a violation.

When the design system changes, update the existing rule and shared implementation together. Remove the superseded rule instead of retaining a history of the transition in this file.
