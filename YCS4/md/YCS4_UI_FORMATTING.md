# YCS4 UI Formatting

This file is the formatting check for all YCS4 interface work. Read it before adding or changing YCS4 UI elements, and verify the checklist before considering a UI change complete.

## Editable and generated sprites

- Assets directly inside `assets/sprite/` are editable source files supplied for YCS4 styling.
- Assets inside `assets/sprite/generated/` are produced by `npm run prepare:sprites`; do not edit them manually.
- Development, production-build, and Tauri scripts regenerate the generated directory automatically.

## DPI-aware pixel grid

All raster UI textures render through the same monitor-aware 2x physical-pixel grid. Do not assume that one CSS pixel equals one physical display pixel.

- The 2x grid is used by regular buttons, dialog title buttons, dialog icons, option containers, window title textures, and window body textures.
- JavaScript calculates the grid from `window.devicePixelRatio` and writes the resolved CSS measurements to the `--ycs-*` sizing tokens.
- Menu origins and floating-dialog position/size are snapped to physical pixels.
- Moving YCS4 between monitors recalculates the grids and resnaps visible menus/dialogs.
- Text sizes remain unchanged by monitor-DPI correction alone. The explicit Preferences Scale setting zooms text together with the rest of the interface.

Preferences exposes a persisted Scale dropdown with 100%, 200%, 300%, 400%, and 500% options. The original YCS4 appearance is the 200% baseline. Scale zooms the interface below the native-style titlebar: text, spacing, fixed middle dimensions, controls, tabs, workspaces, and dialogs all grow or shrink together, while the titlebar retains its normal dimensions. `ui-viewport` owns the unscaled available area beneath the titlebar; its absolutely positioned `ui-shell` uses layout-time CSS `zoom` and remains at 100% width and height. Chromium already accounts for CSS zoom while resolving those percentages; applying inverse percentages shrinks the shell twice and creates an increasingly large blank region above 200%. Do not replace layout-time zoom with `transform: scale(...)`: transforms enlarge an already-rasterized layer and produce uneven pixel-art edges at odd settings such as 300% and 500%.

`syncPixelArtScale()` multiplies the requested CSS scale by `window.devicePixelRatio`, snaps it down to at least one whole physical display pixel per original source-art pixel, and compensates the pre-zoom border measurements so the final zoomed result remains physically aligned. Selecting 200% therefore preserves the previous monitor behavior exactly: 1.6 CSS pixels per art pixel at 125% Windows scaling and 2 CSS pixels per art pixel at 150%. Menu snapping and floating-dialog drag/resize calculations convert between zoomed pointer coordinates and pre-zoom layout coordinates. The selection is stored under `ycs4.ui-scale-percent`.

Every new non-titlebar UI component must live inside `ui-shell` so Preferences Scale automatically affects its text, spacing, dimensions, and textures. Any JavaScript that converts viewport pointer/bounds coordinates into element style coordinates must divide by `getUiScaleFactor()`, and any physical-pixel snapping of pre-zoom CSS values must include that factor. Do not position scaled controls through an unscaled body-level portal unless the portal implements the same conversion.

At 125% Windows scaling, the 2x grid uses 1.6 CSS pixels per original art pixel, producing exactly 2 physical pixels. At 150%, it uses 2 CSS pixels per original art pixel, producing exactly 3 physical pixels.

## Workspace background

- The normal YCS4 workspace, application-menu bar, and blank content background use `var(--ycs-background)`, resolving to `#2c2c30`.
- Component textures may define their own internal colors, but uncovered workspace areas must use this shared background.

## Normal text color

- The normal text color is `#c0c0c0`.
- CSS must use `var(--ycs-text-normal)` instead of repeating the hexadecimal value.
- `--ycs-text-normal` is declared on `:root` in `src/styles.css`.
- A deliberate interaction state may use a different color, but normal idle text must return to `#c0c0c0`.

## Uniform UI text size

- All YCS4 interface text uses `var(--ycs-ui-font-size)`, resolving to `10px`.
- This size matches the File and Edit application-menu labels.
- Components should inherit this token instead of declaring another font size.
- The titlebar is the only exception. It keeps its existing system font and `12px` title size.

## Standard pixel button

Regular buttons in the YCS4 workspace must use the `pixel-button` CSS class. This class uses the sprite created for YCS4:

- Source sheet: `assets/sprite/button.png`
- Sheet size: 64x16 pixels
- Normal state: left 16x16 frame
- Hover state: second 16x16 frame
- Toggled/pressed state: third 16x16 frame, selected with `aria-pressed="true"`
- Toggled/pressed hover state: fourth 16x16 frame
- Generated state size: 32x32 pixels after exact 2x pixel duplication
- Normal/hover source nine-slice insets: 2px top, 2px right, 4px bottom, and 2px left
- Normal/hover generated nine-slice insets: 4px top, 4px right, 8px bottom, and 4px left
- Toggled and toggled-hover source nine-slice insets: 4px top, 2px right, 2px bottom, and 2px left
- Toggled and toggled-hover generated nine-slice insets: 8px top, 4px right, 4px bottom, and 4px left
- Scaling: use DPI-aware destination widths and `border-image-repeat: repeat`; do not stretch or smooth the sliced regions

The four generated button files are build artifacts derived from the source sheet. Run `npm run prepare:sprites` after changing the source sprite. Keep `button.png` as the only editable source. Both toggled frames keep the same combined top/bottom border depth as the normal frame, but move two source pixels from the bottom border to the top. This preserves the complete button height while naturally shifting text or icons downward with the pressed middle.

The button border color must remain transparent. This prevents the browser's default light border from appearing while the normal sprite is loading.

Example:

```html
<button class="pixel-button" type="button">Button text</button>
<button class="pixel-button" type="button" aria-pressed="true">Toggled button</button>
```

## Dropdown, option, and combobox styling

Dropdown entries, option rows, and combobox controls use the `pixel-option` CSS class. This is separate from `pixel-button` and must not reuse the button textures.

- Source texture: `assets/sprite/option_container.png`, 16x16 pixels
- Rendered texture: generated `assets/sprite/generated/option_container_2x.png`, 32x32 pixels
- Scaling method: exact 2x pixel duplication with no smoothing or filtered resampling
- Nine-slice repeat mode: `repeat`, so the 2x edge and middle pixels are repeated/cropped instead of unevenly stretched into the fixed 16px middle
- Open application menus are snapped to the physical display-pixel grid so their straight pixel-art lines do not begin on fractional device pixels
- File/Edit bar height: `var(--ycs-menu-bar-height)`, resolving to 16px
- Option middle height: `var(--ycs-option-middle-height)`, resolving to 16px so the stretchable center matches the File/Edit bar
- Option border sizes are DPI-aware so each original art pixel occupies a whole number of physical display pixels
- At 150% display scale, borders render at 4px top/sides and 8px bottom, producing a 28px complete option
- At 125% display scale, borders render at 3.2px top/sides and 6.4px bottom, producing a 25.6px complete option while remaining physically pixel-aligned
- Application-menu option bars have a minimum width of 135px; this does not change the width of the top-level File/Edit buttons
- Source nine-slice insets: 2px top, 2px right, 4px bottom, and 2px left
- Rendered 2x nine-slice insets: 4px top, 4px right, 8px bottom, and 4px left
- Normal text: `var(--ycs-text-normal)`, resolving to `#c0c0c0`
- Hover center fill: `var(--ycs-option-hover-fill)`, resolving to the normal text color `#c0c0c0`
- Hover text: `var(--ycs-text-option-hover)`, resolving to `#202125`

Example:

```html
<div class="pixel-option" role="option">Option text</div>
```

Do not use a native `<select>` when its opened option surface is visible: the operating-system popup can fall back to a white, unskinned menu. Build visible dropdowns from a `pixel-option` trigger plus a positioned listbox whose individual options also use `pixel-option`. Preferences > Scale is the reference implementation, including click-outside closing, Escape handling, arrow-key navigation, and `aria-selected` state.

Dropdown triggers and combobox buttons use the Down frame from the shared direction sprite rather than a font glyph. While the controlled option list is visible and the trigger has `aria-expanded="true"`, render the Up frame and the third pressed button frame; hovering in this open state uses the fourth pressed-hover frame. Closing the list restores the trigger's normal component texture and Down arrow. The direction icon inherits `currentColor`, so it uses `--ycs-text-normal` normally and follows `--ycs-text-option-hover` in highlighted controls.

Vertically connected option lists use `pixel-option-stack` on the parent. They divide the option texture without repeating horizontal seams:

- A single option renders the complete top, middle, and bottom container.
- The first of multiple options renders the top and middle bands but no bottom band.
- Options between the first and last render only the middle band, including its left and right edges.
- The last option renders the middle and bottom bands but no top band.

In a top-to-bottom numbered 3x3 texture grid, this corresponds to `123 + 456` for the first option, `456` for intermediate options, and `456 + 789` for the last option. File/Edit application menus and custom dropdown listboxes both use this shared parent class.

Controls inside a floating-dialog body must retain a left inset from the body texture. Preferences and Test use three original-art pixels on the left and one on the other sides, all through `--ycs-pixel-2x`, so the padding remains aligned and scales with the interface.

## Resizable-dialog overflow

The application viewport itself remains clipped and does not gain window-level scrollbars. Overflow belongs to resizable component containers such as Preferences, Test, the hex-color dialog, and future floating inspectors. Every `floating-dialog-body` is its own horizontal and vertical scroll container. When that dialog is resized below its content's intrinsic dimensions, preserve the selected UI scale and each component's minimum width and height; do not shrink, reflow, or squash the components to fit.

Do not simulate an overlay by making a native scrollbar track match or resemble the content background: native scrollbar lanes can still reserve space or prevent content beneath them from rendering. Hide the native scrollbar completely and place custom horizontal and vertical scrollbar layers as absolutely positioned siblings above the full-size scroll body. These overlay layers render no track, corner, button, or background at all; only the draggable thumb paints. The underlying components therefore remain genuinely rendered beneath the scrollbar area. Horizontal and vertical thumbs appear independently when their corresponding content axis overflows, synchronize during wheel/touchpad scrolling, support track clicks, and remain draggable.

Suppress the WebView/Tauri default context menu with a document-level `contextmenu` handler. Text selection and keyboard operations such as Ctrl+C remain available, including the read-only hex preview. Dialog X controls retain their accessible `aria-label` but do not use a `title` attribute, avoiding the native "Close" hover tooltip.

Separate control rows/new lines inside a floating dialog use a fixed `--ycs-dialog-line-height`, not independent margins or a shared edge-to-edge gap. The line height is the complete option-control height plus two original-art pixels: the original dropdown-to-textbox top-to-top distance plus one additional art pixel. Place rows in `dialog-line-stack` and apply `dialog-line` to every direct control row so buttons, dropdowns, textboxes, checkboxes, and dividers all begin on the same vertical rhythm despite their different component heights.

When a component has descriptive text on its left, apply `dialog-labeled-row`. The component begins at least `--ycs-labeled-control-start` (100px) from the row's left edge; this is an absolute row position, not 100px added after the label. The label column may grow when its text is wider. `--ycs-labeled-control-gap` then preserves three original-art pixels between the label and component, so long text never touches or overlaps a button, dropdown, textbox, combobox, checkbox, or divider. Unlabeled controls do not use this alignment rule.

Regular dialog buttons, dropdowns, textboxes, comboboxes, horizontal dividers, and value sliders share `--ycs-control-min-width`, currently 120px. Treat this as the minimum complete component width. A combobox includes both its textbox and unchanged square direction button inside that total; shrink the textbox's flexible middle instead of increasing the complete combobox width. Compact workspace and titlebar buttons remain intentional exceptions.

## Current reusable component catalog

| Component | Primary class or structure | Editable sprite | Current reference |
| --- | --- | --- | --- |
| Regular button | `pixel-button`; `aria-pressed="true"` for toggled | `button.png` | Edit > Test normal and toggled buttons |
| Dropdown trigger and option | `pixel-option` | `option_container.png` | Preferences Scale and Edit > Test dropdown |
| Connected option list | `pixel-option-stack` | `option_container.png` | File/Edit menus, dropdowns, and filtered combobox results |
| Textbox | `pixel-text-box` | `text_box.png` | Edit > Test textbox |
| File import button | `pixel-button pixel-file-button` containing one truncating label span | `button.png` | Texture Creator Texture/Mask/Emissive fields |
| Combobox | `pixel-combobox` containing `pixel-text-box`, `pixel-button`, and `pixel-option-stack` | `text_box.png`, `button.png`, `direction.png`, `option_container.png` | Edit > Test combobox |
| Checkbox | `pixel-checkbox` | `checkbox.png` | Edit > Test checkbox |
| Horizontal divider | `pixel-divider pixel-divider-horizontal` | `horizontal_divider.png` | Edit > Test divider |
| Vertical divider | `pixel-divider pixel-divider-vertical` | `vertical_divider.png` | Edit > Test divider |
| Direction icon | `pixel-direction-icon` plus one direction class | `direction.png` | Dropdown, combobox, and tab-overflow arrows |
| Tab close icon | `workspace-tab-close` | `tab_icon.png` | Dynamically added Test and Item tabs |
| Workspace inner container | `workspace-inner-container` | `container_1.png` | Primary Home/Assets workspace content panel |
| Object button | `workspace-object-shell` containing `pixel-button workspace-object object-container` | `button.png` | Dynamically created non-Folder workspace objects |
| Folder object | `workspace-object-shell` containing `folder-object` and its three visual layers | `folder.png` | Folder workspace entries without an object-button frame |
| Workspace object scrollbar | `workspace-object-scrollbar` and `workspace-object-scrollbar-thumb` | none | Vertical primary-workspace object overflow inside `workspace-inner-container` |
| Flat item editor | `workspace-item-editor-form` containing shared controls | shared component sprites | Item tabs created from the primary workspace's Item action |
| Item overlay scrollbars | runtime `workspace-item-scrollbar` and `workspace-item-scrollbar-thumb` | none | Horizontal and vertical Item-page overflow |
| File action icon | `workspace-file-icon` plus Save/Cancel/Delete frame class | `file.png` | Item editor action buttons |
| Value slider | `pixel-value-slider` with a transparent native range input | `value_slider.png` | Edit > Test slider and color-dialog RGBA sliders |
| Hex color field | `pixel-hex-field` | `hex.png` | Edit > Test hex field and color-dialog preview |
| Saturation/value picker | `hex-color-picker` | CSS color layers | Secondary hex-color dialog |
| Hue selector | `hex-hue-slider` | CSS rainbow layer plus `hex_frame_2x.png` | Secondary hex-color dialog |
| Workspace tab | `workspace-tab` | `tab_container.png` | Permanent Home/Assets tab and dynamic tabs |
| Workspace surface | `workspace-container` | `tab_workspace_container.png` | Primary workspace and Item pages |
| Floating dialog | `floating-dialog` with separate title and body regions | `window.png`, `dialogue_button.png`, `dialogue_icon.png` | Preferences, Test, and hex-color dialog |
| Dialog overlay scrollbar | runtime `dialog-overlay-scrollbar` and `dialog-overlay-scrollbar-thumb` siblings | none | Any overflowing `floating-dialog-body` |

Edit > Test is the live builder reference for buttons, dynamic tab creation, a custom dropdown, textbox, filtering combobox, 0-100 value slider, six-digit hex field, checkbox, and both divider orientations. Keep new reference controls on the shared `dialog-line-stack` rhythm and use `dialog-labeled-row` whenever a separate label appears on the left.

## Text boxes

Text inputs use `pixel-text-box` and the editable `assets/sprite/text_box.png` source texture. The source is 16x16 pixels with 3px nine-slice insets on every side; `npm run prepare:sprites` generates `text_box_2x.png` with 6px slices. Destination borders use the DPI-aware `--ycs-text-box-border` token.

The textbox middle height equals `--ycs-ui-font-size`, the normal 10px text height at the 200% baseline. The middle has no padding on any side: complete height is `top border + text-height middle + bottom border`, and text uses the same value for `line-height`. Edit > Test contains the reference textbox.

Number-valued `pixel-text-box` controls suppress the browser's native inner and outer spin buttons and use textfield appearance. Numeric values remain keyboard-editable, but operating-system arrow steppers must never appear over the pixel texture.

File-backed fields use a normal `pixel-button` plus `pixel-file-button`. The idle label is `Add`; after selection it becomes the imported file's base name. Keep the complete control at `--ycs-control-min-width`, place the label in one non-wrapping span, and truncate overflow with an ellipsis without expanding the button. Use this same control for images, masks, emissive maps, JSON models, animation JSON, and future single-file imports. The full filename may be exposed through the button's `title` after selection.

## Checkboxes

Checkboxes use the editable `assets/sprite/checkbox.png` 18x9 source sheet. The first 9x9 frame is empty and the second 9x9 frame is ticked. Sprite preparation generates separate 18x18 `checkbox_empty_2x.png` and `checkbox_ticked_2x.png` states through exact pixel duplication.

Use `pixel-checkbox` on a button with `role="checkbox"` and an `aria-checked` value. Its complete square size comes from the DPI-aware `--ycs-checkbox-size` token, with no native border, padding, or appearance. Toggle `aria-checked` rather than changing inline images so CSS and accessibility state remain synchronized. Edit > Test contains the reference checkbox.

## Dividers

Dividers use two orientation-specific editable textures:

- `horizontal_divider.png` is 3x1 pixels. Sprite preparation generates `horizontal_divider_2x.png` at 6x2; render it at one art pixel tall and repeat it only along the X axis.
- `vertical_divider.png` is 1x3 pixels. Sprite preparation generates `vertical_divider_2x.png` at 2x6; render it at one art pixel wide and repeat it only along the Y axis.

Use `pixel-divider` plus `pixel-divider-horizontal` or `pixel-divider-vertical`. Tile dimensions must derive from `--ycs-pixel-2x` so every three-pixel pattern and one-pixel thickness remain physically aligned at every UI scale. Divider elements use `role="separator"` with the matching `aria-orientation`. Edit > Test contains both reference orientations.

## Direction icons

Direction icons use the editable 28x9 `assets/sprite/direction.png` sheet in this order: 5x9 Left, 5x9 Right, 9x9 Down, and 9x9 Up. Sprite preparation generates one 2x file per direction. Use `pixel-direction-icon` plus exactly one of `pixel-direction-left`, `pixel-direction-right`, `pixel-direction-down`, or `pixel-direction-up`.

The source artwork is white and serves as an alpha mask. CSS supplies the visible tint through `currentColor`; do not create separately recolored raster files. This keeps icons synchronized with normal and highlighted text colors.

## Comboboxes

A combobox combines a normal-height `pixel-text-box` input with a `pixel-button` on its right and a connected `pixel-option-stack` listbox below. The complete combobox uses `--ycs-control-min-width`; its unchanged square button consumes part of that width and the textbox flexes into the remainder. The two controls touch with no gap and are vertically centered beside each other; do not increase the textbox height to match the taller button. The button's stretchable middle is a square ten original-art pixels wide and high, leaving one art pixel around the 9x9 Down direction icon.

Combobox listboxes follow the same connected first/middle/last option slicing, keyboard navigation, Escape, click-outside, and `aria-selected` rules as dropdowns. Typing filters options case-insensitively by contained text and opens the list immediately. Recalculate `data-stack-position` from only the visible matches so a filtered first, middle, last, or sole option keeps the correct container slices. Selecting an option writes its text into the editable input. Edit > Test contains the reference three-option combobox.

## Value sliders

Value sliders use the editable `assets/sprite/value_slider.png` 32x16 sheet. The left 16x16 frame is Filled and the right frame is Empty. Sprite preparation generates separate 2x frames. Both use source nine-slice insets of 2px on the top, left, and right and 3px on the bottom; generated slices are therefore `4 4 6 4` in top/right/bottom/left order.

Render the Empty frame across the complete slider and place an equally sized Filled frame above it, clipped horizontally to the current range percentage. The complete slider height uses `--ycs-value-slider-height`, which must equal the complete textbox and hex-field height; stretch only the nine-sliced middle to achieve this. Center two identical value labels above those surfaces: the complete label uses `--ycs-text-option-hover` for the unfilled region, while the copy using `--ycs-text-normal` is clipped to the same fill percentage. This shared mask lets individual text pixels change color exactly where the filled region crosses the value. Keep a native transparent `input[type="range"]` above the visual layers so pointer dragging and keyboard changes retain native behavior and accessibility. Edit > Test provides the 0–100 reference slider.

## Hex color fields

Hex color fields use the editable `assets/sprite/hex.png` 32x16 sheet. The left 16x16 frame is the field frame with 2px source nine-slice insets on every side. The right 16x16 frame is the transparency background tile. Sprite preparation generates `hex_frame_2x.png` and `hex_background_2x.png`; the frame uses generated `4 4 4 4` slices and the background repeats across the complete variable-width field.

Layer the repeating transparency background first, the selected CSS color above it, and the sliced frame last. Keep the color layer alpha intact so a fully transparent color exposes the background tile. The field uses `--ycs-control-min-width` as its minimum complete width and exactly the same complete height as `pixel-text-box`, despite the hex frame using 2px rather than 3px source insets. Both editable and preview hex text use `--ycs-text-normal` below 50% HSV value and switch to `--ycs-text-option-hover` at 50% or above so the text contrasts with the selected color.

When unfocused, display the normalized six-digit RGB color with its leading `#`. On focus or a single click, remove the prefix and select the hexadecimal digits for typing. Accept only hexadecimal characters and never accept more than six editable digits; three-digit RGB may be expanded, while incomplete edits retain the last complete color when focus leaves. Alpha is separate from the six-digit hex value.

A double click opens a secondary floating color dialog. Its square is a saturation/value picker: the horizontal axis blends from white into the currently selected hue, while the vertical black overlay increases toward the bottom. A separate rainbow hue bar directly below cycles through red, yellow/orange, green, cyan, blue, purple, and back to red. Below that are reusable 0–255 value sliders for R, G, B, and A, followed by the same checker-backed hex preview at textbox height.

Pointer dragging and arrow keys operate the square picker; native pointer and keyboard behavior operate the hue and RGBA sliders. Hue changes update the square's color edge, square changes update saturation/value, RGB changes synchronize the six-digit hex value, and A changes only the preview transparency. The square, hue bar, RGBA slider bars, and preview all use the normal shared 120px minimum width. Align those controls exactly; position each channel letter immediately outside the shared left edge so it does not offset its slider. Apply three original-art pixels of body padding around the complete group, including the RGBA letters. The secondary dialog is 165px wide and 308px high, the exact baseline height needed for the 120px square and six textbox-height rows without clipping or scrolling. Its compact content stack has no additional row gap. Render its preview value as a read-only text input so users can select and copy the complete `#RRGGBB` value. The dialog reuses the standard floating title/body textures and closes on Escape or any pointer press outside itself. Edit > Test contains the reference field and secondary dialog.

## Intentional exceptions

- The File/Edit application menu remains plain text and uses `menu-bar-button`; do not apply the pixel-button sprite to it.
- File/Edit hover and open states use the normal text color `#c0c0c0` as their fill with `#202125` text.
- Items opened by an application-menu button use `pixel-option`. File > Exit and Edit > Preferences are the current reference implementations.
- Hovering a closed top-level menu does not open it when no application menu is active.
- After File or Edit has been opened by clicking, hovering the other top-level menu immediately switches the open dropdown without requiring another click.
- The minimize, maximize, and close titlebar controls remain native-style window controls; do not apply the pixel-button sprite to them.
- The titlebar continues to use its existing system font.
- Standard `pixel-button` hover states do not use the option hover text color; buttons keep `#c0c0c0` text because their texture defines their own visual states.

## Workspace tabs and container

The workspace tab row sits immediately below the File/Edit menu bar. The tab's stretchable middle is `var(--ycs-tab-middle-height)`, which resolves to the same 16px height as `var(--ycs-menu-bar-height)`. The complete tab is taller: `top border + 16px middle + bottom border`, expressed by `var(--ycs-tab-height)`.

- Tab source sheet: `assets/sprite/tab_container.png`, 32x16 pixels.
- Active tab: left 16x16 frame; inactive tab: right 16x16 frame.
- Tab source nine-slice insets: 2px on every side. Generated insets remain `4 4 4 4`, while the destination border width uses the DPI-aware `--ycs-tab-border` token.
- Tabs have a minimum width of 135px. Tab text is left-aligned and vertically centered inside the 16px middle; the border slices do not consume that middle height.
- Consecutive tabs are separated by exactly one original-art pixel through the shared DPI-aware `--ycs-workspace-action-gap` token.
- The fixed primary tab begins exactly seven original-art pixels after the right edge of the action button: one art pixel separating the button rail, the 5px-wide Left direction icon, and one art pixel of padding between that icon and the tab. This fixed reservation prevents the primary tab from moving or shrinking when the overflow control becomes visible.
- Workspace source: `assets/sprite/tab_workspace_container.png`, 16x16 pixels.
- Workspace source nine-slice insets: 2px top, 0px right/bottom, and 2px left. Its generated top and left slices are 4px, while destination widths use the DPI-aware `--ycs-workspace-border-top` and `--ycs-workspace-border-left` tokens.
- The workspace is pulled upward by exactly `--ycs-workspace-border-top`, placing its textured top edge in the same area as the tab's bottom border.
- Only each tab is layered above that overlap. The full-width tab-strip background must not cover the workspace edge, or the workspace texture's authored top 2px will disappear.
- Generated tab assets are exact 2x pixel duplications and use `border-image-repeat: repeat`; do not smooth or stretch them.
- `assets/sprite/tab_icon.png` is the editable 8x8 close icon. Sprite preparation creates the 16x16 `generated/tab_icon_2x.png` through exact 2x duplication. The primary Home/Assets tab is permanent and has no close control; only dynamically created tabs own `workspace-tab-close`. Keep the close slot reserved so text does not move, but hide the X and disable its pointer target until its tab is hovered. Closable tabs reduce their right padding to one original-art pixel.
- The Test dialog's Add Tab button sends `ycs4:add-test-tab` directly to the `main` webview. Main creates a numbered Test tab, selects it, and scrolls it into view. Added tabs are draggable and may be reordered after the permanent primary tab; the Home/Assets primary tab remains first. Use the shared pointer-driven ghost interaction for every closable tab and suppress native HTML drag startup so tabs can be placed reliably before the first closable tab or after the last. Closing a selected tab returns selection to its previous neighbor, normally the primary tab.
- `assets/sprite/container_1.png` is a 3x3 inner-workspace texture with 1px source insets on all four sides. Sprite preparation generates a 6x6 exact-duplication asset with `2 2 2 2` slices; the destination border remains one DPI-aware original-art pixel and repeats rather than smoothing.
- The inner workspace panel is positioned from the workspace middle, not from the outer window. Its top inset is the exact complete height of two stacked workspace-action buttons including their one-art-pixel gap. Its left, right, and bottom insets are each half one complete workspace-action-button width. Use the shared calculated tokens so these DPI-aware insets track compact-button changes.
- An `object-container` is a normal `pixel-button`, so it uses the shared normal and hover `button.png` frames without a persistent toggled state. Its middle is exactly `3 * --ycs-workspace-action-middle-size` in both directions. At the default 200% UI scale this is a 48x48 middle and a 56x60 complete outer box: 4px left/right/top borders and an 8px bottom border. The complete outer width adds the normal button's left/right borders, and the complete outer height adds its top/bottom borders; the middle remains the required 3x square even though the asymmetric button borders make the complete box non-square. Objects never shrink.
- Folder entries do not use `object-container`, `pixel-button`, or the `button.png` frame. Their generic `workspace-object-shell` retains the same footprint as an object container so grid positions and gaps do not move, and the folder composite scales to fill that complete footprint rather than remaining at its smaller source dimensions. At the default 200% scale it therefore renders at 56x60. `assets/sprite/folder.png` is a 68x36 horizontal two-frame sheet: crop x=0..33 as the 34x36 background and x=34..67 as the 34x36 foreground, then scale each layer to the shell using nearest-neighbor pixel rendering. Layer order is background, `object-folder-content`, then foreground. Preserve the source 2px content inset proportionally as 5.88235294% horizontally and 5.55555556% vertically; the slot clips overflow and contains future object thumbnails with pixelated `object-fit: contain` rendering.
- Workspace entries are runtime content rather than authored placeholder markup. Main creates five Home objects on load; Folder appends a layered Folder entry, while Assets starts empty and Texture appends an Assets object. Every shell records its owning primary mode so switching Home/Assets filters the shared grid without mixing the two collections. Entries have no embedded remove control. A focused entry can be removed with Delete/Backspace, and right-clicking one opens the shared pixel option stack at the pointer with a single `Delete` option. Clicking elsewhere or pressing Escape closes that context menu. `workspace-object-grid` fills visible entries left-to-right and wraps only when necessary.
- Home/Assets ordering and folder nesting are persistent visual organization. Save the recursive workspace tree under the YCS4-local `ycs4.workspace-layout` browser-storage key, including only visual identity, display label, primary mode, sibling order, optional referenced-object ID, and folder children. Restore that tree on startup before showing the active mode. This manifest must never be embedded into an Item/Texture/object JSON or injected into mod resources: authored objects continue using the normal `ycs-data/<category>/<id>.json` lifecycle, while YCS4 remembers only where their visual references were arranged.
- `workspace-object-grid` uses `--ycs-workspace-action-button-width` as the panel-edge padding on all four sides, so the inner container's top and bottom padding now exactly match its side padding. The horizontal gap remains one complete compact-button width and the vertical gap remains one complete compact-button height.
- Primary-workspace object overflow is vertical only. `workspace-object-grid` hides native scrollbars and suppresses horizontal scrolling. A transparent, space-free `workspace-object-scrollbar` is positioned inside `workspace-inner-container` and appears only when the wrapped objects exceed the grid height. Its thumb overlays content without painting a track background or changing layout width; mutation, resize, wheel/native scrolling, track clicks, and thumb dragging keep it synchronized.
- Home/Assets search never reparents canonical workspace objects. It recursively traverses the canonical root grid and every folder content host, including detached hosts for folders whose tabs have never been opened, so nested files and nested folders are searchable at every depth. Root matches use their existing nodes, while matches nested in folders appear as temporary non-draggable `workspace-search-result` representations linked back to their sources. Open folder tabs therefore retain their contents throughout a primary-workspace query; clearing the query removes only the temporary results.
- A Texture object container renders its saved base texture, aspect-preserved and pixelated, inside the button's middle region. Texture thumbnails are rebuilt from `ycs-data/textures` on workspace restoration rather than being embedded in workspace layout or texture metadata. Folder previews clone the first direct non-folder child's visual, so a leading Texture child shows the same texture inside the folder layers. Moving or updating that child refreshes its owning folder preview.
- Every saved Item owns a normal draggable Home object container keyed by its Item ID. Generated and Handheld Item containers resolve the Item's selected shared texture and render it aspect-preserved and pixelated in the same middle region used by Texture containers. The preview is reconstructed from `ycs-data/items` plus `ycs-data/textures` after restoration and is never embedded in Item JSON or workspace layout. When an Item is the first direct non-folder child, the folder preview clones that same rendered texture.
- `workspace-top-controls` is shared by Home and Assets. It occupies the full top inset above the inner panel and vertically centers its controls inside that two-button-stack height. Its left group contains one normal `pixel-text-box` followed by a compact Search button with two original-art pixels between them. Search filters only the active primary mode's objects. Search and `+` use the exact same complete width, height, and 16x16 middle as the compact left-rail workspace buttons. The Search button displays `assets/sprite/home/home_icon.png` inside that middle without changing the button dimensions. The complete row uses the same half-button left/right insets as `workspace-inner-container`.
- The far-right top control is a compact, mode-aware `+` create dropdown. Its trigger uses the pressed/pressed-hover frames while expanded, while its connected `pixel-option-stack` remains the normal shared control width and aligns to the trigger's right edge. Home contains Item, a dedicated separator strip, then Folder. Assets contains one connected `Texture` option and no separator. The Home separator is exactly one original-art pixel high and renders only the `456` middle band of `option_container.png`: zero top/bottom border widths, normal left/right middle edges, and the filled center cropped to that one-pixel height. Center `horizontal_divider.png` inside the same strip. This adds exactly one pixel of textured separation without a floating transparent gap. Clicking outside or pressing Escape closes the menu.
- Assets > Texture opens a fixed 600x390 detached native Texture Creator window instead of immediately creating a placeholder. The left side uses the canonical shared line rhythm for Name, ID, Texture, Mask, Emissive, Spritesheet, Rows, Default Frame, Animated, and Ticks/Frame. The right side is a square pixelated texture preview targeting the height of those ten complete form rows and capped to half of the available content width so UI/display pixel snapping cannot overflow the fixed dialog at any supported scale. Its frame uses `assets/sprite/preview.png` as a stretched nine-slice with three original-art pixels on every side; do not repeat its regions because fractional repeat joins create seams at some UI/display scales. The imported image fills the available canvas while retaining its aspect ratio: a normal texture shows its static image, a spritesheet shows Default Frame while Animated is off, and plays at the configured Ticks/Frame while Animated is on. Texture is required; Mask and Emissive are optional. Save and Cancel are bottom-anchored regular buttons matching confirmation-dialog action placement. The window is fixed-size and frameless; dragging its textured titlebar uses operating-system window movement so it may leave the main editor bounds. Save writes the normal `ycs-data/textures/<id>.json` metadata and image sidecars, then adds a visual Assets reference whose folder placement remains owned only by `ycs4.workspace-layout`.
- Clicking a Texture object opens the same detached Texture Creator in edit mode. The dialog loads its metadata plus base, mask, and emissive sidecars from `ycs-data/textures`, locks the existing ID, and preserves all loaded sidecars unless the user replaces them. Save updates the existing visual reference and thumbnail instead of creating another object container. Search-result clicks resolve to the canonical Texture object before editing.
- Item creates a closable, draggable Item tab and selects it; it does not create a primary-workspace object button. Each Item tab owns an independent runtime editor panel. The tab begins as `New Item`, follows the trimmed Display Name live, and falls back to `New Item` whenever Display Name is blank. Closing the tab removes its matching editor panel.
- Item ID accepts only lowercase ASCII letters, digits, and underscores. Uppercase input normalizes to lowercase, whitespace normalizes to `_`, and all other characters are removed while preserving the caret position. Keep its `[a-z0-9_]*` input pattern and runtime normalization synchronized.
- Item editors do not use `workspace-inner-container` or its `container_1.png` frame. Selecting an Item tab hides both primary-workspace top controls and the complete inner container, then draws the flat editor directly on `workspace-container`. The editor background remains transparent so the outer `tab_workspace_container.png` fill/outline supplies the correct workspace color. Do not paint a second flat background over it.
- Every Item field uses the same `--ycs-dialog-line-height`. The form's top padding centers that first normal-height line within `--ycs-workspace-two-button-stack-height`, matching the vertical starting position of the primary workspace's Search controls without giving Item ID a different row height. Half-button left/right insets align the Item ID label with the Search textbox's starting edge.
- The Item ID row spans the available workspace. Item ID stays on the left, while three square buttons are right-aligned in the fixed order Delete, Cancel, Save. Their complete width equals their complete height; they do not use the normal 120px control width. Delete is hidden for a new unsaved item and appears after Save marks that runtime editor as created. Cancel closes the Item tab without marking it created; Delete closes an already-created runtime item tab. `assets/sprite/file.png` is a 48x16 icon strip: Save at x=0, Cancel at x=16, Delete at x=32. The buttons retain the shared `pixel-button` frame and display the matching 16x16 icon instead of text.
- The current reduced Item editor intentionally exposes only Item ID, Display Name, Texture, Holding Mode, Creative Tab, and Stack Size in one flat sequence. All six rows retain the shared label/control alignment, and the Item ID row continues to own the right-aligned Delete, Cancel, and Save buttons. Holding Mode uses the complete V3 option set in order: Generated (`generated`), Handheld (`handheld`), and 3D Model (`3d`).
- Item dropdown listboxes explicitly lay their `pixel-option` children in a top-to-bottom flex column. Options must never remain inline or form a horizontal row; every option occupies the shared full dropdown width and continues to receive the connected first/middle/last slices.
- Item-page code lives in `src/item-editor.js`, not in the application-level event file. The module owns Item-tab creation, live Display Name labels, conditional fields, dropdowns, Item actions, and page scrolling; `src/main.js` supplies only shared tab creation/removal and activates the returned page controller.
- YCS4 Item Save invokes the scoped `save_basic_item` backend command. For Generated and Handheld, it loads the panel's `lastSavedId` JSON, removes the basic-field injections YCS4 owns in reverse, preserves unsupported top-level fields plus their still-active manifest entries, rejects rename collisions, injects registration/lang/creative-tab content, copies the selected texture, writes the item model directly, and saves the refreshed combined JSON/manifest. ID rename is blocked while unsupported injections remain because their embedded IDs cannot be safely regenerated before their fields are ported; otherwise the old JSON is deleted during the transition. Clicking a saved Item visual reference reopens and populates these exposed fields. Delete in that Item panel, or Delete/Backspace/right-click Delete on its saved workspace reference, invokes `delete_basic_item`, cleans the complete manifest in reverse, removes the source JSON, closes any applicable editor tab, and removes its visual reference only after backend cleanup succeeds. It deliberately rejects 3D Model until geo/display inputs exist. Moving references and deleting visual folders remain visual organization only. Folder deletion has no confirmation dialog: it unwraps the Folder's direct children into the parent at the Folder's former position, preserving their order and retaining every nested Folder as a complete subtree.
- On startup, YCS4 compares `list_ycs_data("items")` with the complete recursive persisted workspace hierarchy, including the detached grids of closed folders. Each saved Item without a reference is restored at the Home root using its saved display name, while repeated references for one saved ID are collapsed to one canonical entry. This repairs missing or previously duplicated visual references without storing visual placement in Item JSON.
- Every new workspace page type must be implemented in its own page module, following `src/item-editor.js` as the reference. A page module owns its template hydration or DOM construction, page-local state, field events, conditional rows, dropdown contents, actions, scrolling, and cleanup. `src/main.js` remains the shared application shell and may coordinate tab creation, activation, ordering, and removal, but it must not accumulate page-specific field or interaction logic.
- The Item Creative Tab dropdown follows the V3 ordering: `(None)`, project/mod creative tabs, then vanilla creative tabs. `src/data/creative-tabs.js` owns the vanilla definitions and the loader. The loader uses YCS4's `list_ycs_data` and `load_ycs_data` Tauri commands to discover every JSON tab in `ycs-data/tabs`, with the current `yebisu RPG` entry as its non-Tauri preview fallback. Options render only `displayName`; registry IDs remain internal option values and must not be appended to the visible label. The vanilla entries are Building Blocks, Colored Blocks, Natural Blocks, Functional Blocks, Redstone Blocks, Tools & Utilities, Combat, Food & Drinks, Ingredients, Spawn Eggs, and Operator Utilities.
- Item Texture uses a searchable combobox because texture option counts may grow substantially. It discovers IDs with `list_ycs_data("textures")`, loads labels and base images through `load_texture_bundle`, and retains the texture ID as the internal value. Each real texture option renders a pixelated, aspect-preserved preview flush against the left edge of the option's textured middle band with no left content padding; the label follows after one shared art-pixel gap. `(None)` remains the first option. This is currently basic Item-editor UI state and does not yet persist an Item JSON.
- The Item Texture combobox retains both the selected ID and its exact displayed label. It must also carry the shared `.workspace-item-dropdown` boundary so the application-level `pointerdown` outside-click handler does not hide its options before their `click` selection event. Typing clears the ID only when the input differs from that selected label; Save may resolve an exact option-label match as a fallback before reporting a missing Texture. Merely focusing, closing, or saving the combobox must not clear a valid selection.
- Each Item panel wraps its form in `workspace-item-scroll-viewport`. Horizontal and vertical runtime overlay scrollbars appear independently when that axis overflows. Both tracks are transparent, consume no layout space, and sit over the workspace; native scrollbars remain hidden. Wheel/native scrolling, track clicks, thumb dragging, conditional-field mutations, and panel resizing resynchronize both thumbs.

Workspace action buttons use `pixel-button` and may be arranged in a vertical `.workspace-actions` group beside the tab/workspace area. The compact workspace action size describes its middle, not its complete border box:

The two buttons in `workspace-actions-top` are Home and Assets. They are a mandatory radio pair: Home is pressed by default when YCS opens, exactly one is always pressed, and neither can be untoggled without selecting the other. Activating the other button clears its sibling, changes the first tab label to the selected mode, and selects that tab. If a dynamic tab such as an Item editor is active, clicking the already-pressed mode button returns to the first tab while keeping that mode pressed. Both modes show the shared search/add row and inner object surface, but retain independent object collections; Home starts with its existing objects and Item/Folder actions, while Assets starts empty and exposes only Add > Texture. `assets/sprite/mode_icon.png` is a 32x16 two-frame sheet: its first 16x16 frame fills Home and its second 16x16 frame fills Assets. The icons do not change either button's complete dimensions.

The lower task stack contains three buttons: Run Client, Run Data, and Run Console. `assets/sprite/task_icon.png` remains a 64x16 four-frame sheet; the buttons use its first, second, and fourth frames respectively, leaving the former Regular Console frame unused. Run Client and Run Data are toggles backed by allowlisted Tauri commands; both launch the Gradle wrapper with `--console=plain`, pipe stdout/stderr, and use a hidden process instead of creating a native console window. Starting or stopping either task must not open the console automatically. Run Console toggles the single `workspace-task-terminal` panel and shows captured output for the last selected Run Client or Run Data task. YCS4 does not create or retain a general-purpose shell process.

`workspace-task-terminal` is docked at the bottom of the workspace rather than painted over page content. While Run Console is open, move the bottom of `workspace-inner-container` upward by the console height plus one complete half-button-width gap. Apply the same reserved bottom space to `workspace-item-editors`; Item pages have no inner container, so reducing their viewport must let their existing horizontal/vertical overlay scrollbar logic expose any newly overflowing content. The panel's transparent top-edge resize handle snaps its height to physical pixels, constrains it to the available workspace, and persists it in `ycs4.task-terminal-height` so reopening Run Console and restarting YCS4 restores the same size. Console output supports ordinary partial text selection and copying. Do not rewrite an unchanged output node during polling, and defer changed-output rendering while a selection exists inside it, because replacing its full text during a drag destroys the selection. Poll task state so completed processes release their pressed buttons, cap retained output, strip terminal control sequences before rendering, and terminate hidden Gradle process trees when the main YCS4 window is destroyed.

- Middle width and height: 16x16 CSS pixels through `--ycs-workspace-action-middle-size`.
- Complete width: 16px middle plus the DPI-aware left and right button borders.
- Complete height: 16px middle plus the DPI-aware top and bottom button borders.
- Consecutive buttons use one original-art pixel through `--ycs-workspace-action-gap`. The rail supplies one shared original-art pixel of outer left padding for all five buttons; individual stacks do not add another left inset.
- The action rail follows this horizontal order: one art pixel of outer padding, one complete button width, one art pixel of separation, then the workspace's textured left edge. The workspace begins at `--ycs-workspace-action-rail-width`, so its left border is outside rather than behind the buttons.
- The upper two-button mode stack begins directly below the File/Edit bar with no top padding. The lower three-button task stack is pushed to the bottom and retains one art pixel of bottom padding. Neither stack contains tab-direction icons.
- Tab overflow uses two separate six-art-pixel direction slots. The Left slot contains the 5x9 Left icon followed by one art pixel of right padding and appears only when content can scroll left. The far-right slot contains one art pixel of left padding followed by the 5x9 Right icon and appears only when content can scroll right. The actual tab viewport begins after the left slot and ends before the right slot, with `overflow-x: auto` clipping tab artwork at both boundaries; tabs must never paint underneath or overlap either direction area. Tabs use `flex: 0 0 auto`, retain their 135px minimum, and scroll by one tab width per arrow click. Wheel/touchpad movement also changes `scrollLeft` without compressing tabs.

## Floating dialogs

This section is the canonical style definition for every YCS4 floating dialog, including Preferences, save confirmation, import/export prompts, and similar secondary windows. New dialogs must reuse these classes and assets instead of defining a separate visual style.

Floating dialogs use `assets/sprite/window.png`, a 32x16 source sheet with two horizontal 16x16 frames. The sprite-preparation script enlarges each frame to 32x32 through exact pixel duplication with no smoothing or filtered resampling:

- `assets/sprite/generated/window_title.png`: 2x left frame, sliced 6px top, 4px right, 2px bottom, and 4px left
- `assets/sprite/generated/window_body.png`: 2x right frame, sliced 4px top/right/left and 8px bottom

The title and body must remain separate stacked regions so each can retain its own slice values. Preferences is the primary reference dialog: its title is aligned left, its body contains the Scale field, and its X control is aligned right.

Test and Preferences are independent native window instances, not content modes of one already-open floating window. The main webview creates separate owned, frameless, resizable Tauri `WebviewWindow` instances labeled `test` and `preferences` at `/?window=test` and `/?window=preferences`. Each route initializes its own title and body once, hides the main title/menu/tab/workspace chrome, and stretches its textured shell to its own native window edges. Both are hidden from the taskbar and may move beyond the main editor bounds onto the operating-system desktop. Test contains both normal and interactive toggled button references, followed by the custom dropdown, textbox, filtering combobox, value slider, six-digit hex field, checkbox, and horizontal/vertical dividers.

Keep native floating-window dimensions based on the stored floating-dialog size multiplied by the current custom UI scale. Each route reads the persisted scale, sprite assets, font, body texture, title texture, close control, and overlay-scroll implementation. Give every native floating window `main` as its owner so it remains above and minimizes/closes with the editor while still being freely movable outside the editor rectangle.

Dialogs are modal by default. Before a modal detached dialog opens, disable every existing YCS4 window except that dialog, including the main editor and an already-open Test window. The main window that created it owns destroyed/error lifecycle listeners and re-enables those exact windows when it closes or fails to open. Preferences and Texture Creator follow this rule. Test is an explicitly non-modal reference/tool window and can coexist as a genuinely separate instance; opening one type must never replace the contents of another type.

Use the following component structure:

- `dialog-layer`: workspace-relative layer that holds floating dialogs
- `floating-dialog`: draggable and resizable outer dialog, centered when first opened
- `floating-dialog-titlebar`: DPI-aware title region using `window_title.png`
- `floating-dialog-title`: left-aligned 10px UI text, vertically centered
- `dialogue-title-button`: dedicated titlebar-control button style
- `floating-dialog-body-scroll-host`: runtime wrapper that occupies the flexible content region and owns overlay scrollbar layers
- `floating-dialog-body`: full-size absolute scroll body using `window_body.png`; its native scrollbar is hidden
- `dialog-overlay-scrollbar`: backgroundless absolute horizontal or vertical interaction layer created at runtime
- `dialog-overlay-scrollbar-thumb`: the only painted part of a custom scrollbar
- `dialog-resize-handle`: invisible edge and corner resize targets

`initializeDialogOverlayScrollbars()` automatically wraps every authored `floating-dialog-body`, creates both overlay axes, and keeps thumb dimensions and positions synchronized through scroll, resize, and content-mutation observers. Do not hand-author native scrollbar tracks or add padding to reserve scrollbar lanes. New dialog bodies receive this behavior automatically when they use the canonical class.

The default dialog size is limited to 360x220 pixels or the available workspace minus 16px, whichever is smaller. The minimum size is 180x120 pixels.

Dialog titlebar height, horizontal padding, and title margin follow the 2x DPI grid. At 125% scale the titlebar is 25.6px tall; at 150% it is 32px tall. Its inner middle always has the exact scaled height needed by the dialog title controls.

The editable title frame uses source slices of 3px top, 2px right, 1px bottom, and 2px left. Its generated 2x slices are therefore `6 4 2 4` in top/right/bottom/left order. The 2px source right slice must remain intact so border pixels do not repeat as vertical lines across the titlebar.

Dialog title controls use their own 18x10 two-state source sheet, `dialogue_button.png`. The preparation script produces two 18x20 generated states through exact 2x pixel duplication. Their generated slices are 4px top/left/right and 6px bottom, leaving a 10x10 source middle.

The X control, its padding, and its icon all follow the 2x DPI grid. `dialogue_icon.png` generates `assets/sprite/generated/dialogue_icon_2x.png` at 10x10 pixels. At 125% display scale the control renders at 17.6x19.2px with an 8px icon; at 150% it renders at 22x24px with a 10px icon.

Floating-dialog title text uses the normal UI font but must be explicitly centered vertically within the title texture's middle.

In-workspace floating dialogs are draggable from their titlebar except when the pointer is over a titlebar control. They are resizable from every edge and corner. Resize tracking must use the window-level pointer stream so width and height continue updating after the pointer leaves the dialog. Persist dialog width and height locally after resizing; position only needs to remain stable for the current session. Preferences uses the local-storage key `ycs4.preferences-dialog-size`.

Detached floating routes send titlebar dragging to `getCurrentWindow().startDragging()`. Resizable dialogs let the operating system resize their frameless native window and hide authored HTML resize handles; fixed dialogs such as Texture Creator set identical minimum/maximum/native dimensions and disable resizing. The dialog X and Escape close only that native instance rather than hiding or repurposing another dialog. Required Tauri capabilities cover `test`, `preferences`, and `texture`, including creation/get-by-label, close/start-dragging/focus/show, and temporarily enabling/disabling owner windows for modal dialogs.

Keep `window.png` as the editable source sheet. `npm run prepare:sprites` regenerates its title and body frames inside `assets/sprite/generated/` automatically.

## Completion checklist

- Normal text resolves to `#c0c0c0`.
- Non-titlebar interface text resolves to the uniform `10px` size.
- Option and application-menu hover fill resolves to `#c0c0c0`, and hover text resolves to `#202125`.
- Every new regular workspace button uses `pixel-button`.
- Normal, hover, toggled, and toggled-hover button states use the correct four frames of the source sheet.
- Regular button generated nine-slice values remain `4 4 8 4` for normal/hover and `8 4 4 4` for toggled, in top/right/bottom/left order.
- Dropdown triggers and options are structured with `pixel-option`; an expanded trigger temporarily paints the pressed `button.png` frame. Combobox direction buttons use `pixel-button` directly.
- Option nine-slice values remain `4 4 8 4` for the generated 2x texture in top/right/bottom/left order.
- The option's rendered middle remains the same 16px height as the application menu bar; only border CSS sizes adapt to the monitor's device-pixel ratio.
- The option texture uses `border-image-repeat: repeat`; do not change it back to `stretch`, which makes the 20px source middle render unevenly at 16px.
- Application-menu dropdowns are aligned to physical display pixels when opened.
- At 125% and 150% Windows display scales, every original option-art pixel maps to an integer number of physical pixels.
- Every raster UI texture, including regular buttons, floating-window borders, dialog title controls, and dialog icons, uses the shared 2x DPI-aware grid.
- Floating-dialog position and resized dimensions resolve to physical-pixel boundaries.
- An option's center becomes `#c0c0c0` and its text becomes `#202125` on hover.
- Pixel art is not blurred by smoothing.
- File/Edit and titlebar window controls remain unskinned.
- Floating dialog title and body regions use the correct generated halves of `window.png`.
- Floating dialog title slices remain `6 4 2 4` in generated top/right/bottom/left order.
- Floating-dialog title contents retain horizontal padding inside the title texture's middle.
- A floating dialog can be dragged and resized, and its last width and height are restored.
- North/south resize handles change height reliably through window-level pointer tracking.
- A floating dialog's close control and generated icon use the shared 2x DPI-aware grid.
- Floating-dialog title text is centered vertically.
- `npm run build` passes.
