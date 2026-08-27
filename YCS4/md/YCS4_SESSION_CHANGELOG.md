# YCS4 Session Changelog & Architecture Updates

- Fixed saved Item references duplicating after being moved into a closed folder: startup reconciliation now traverses the canonical recursive hierarchy and collapses any duplicate references already persisted.
- Delete/Backspace and right-click Delete on a saved Item now invoke `delete_basic_item` before removing its visual container, cleaning the manifest-owned generated mod files and `ycs-data` JSON. Visual folder deletion remains non-destructive to nested saved Items.

## Overview
This document records all features, bug fixes, UI/UX refinements, and architectural enhancements implemented in YCS4 throughout this development session.

---

## 1. Drag-and-Drop & Workspace Object Lifecycle
- **Pointer-Based Drag System:**
  - Implemented pointer-capture dragging (`pointerdown`, `pointermove`, `pointerup`) replacing fragile HTML5 drag events.
  - Floating pixelated drag ghost follows the mouse cursor with center offset and drop shadow.
  - Dragging between folders and object containers allows precise reordering and reparenting.
  - Added cycle detection to prevent dragging a parent folder into any of its own nested subfolders.
  - Target folder highlights with a brightness filter and outline when hovering over a valid folder drop target.

---

## 2. Workspace Tab Dragging & Reordering
- **Pointer-Based Tab Rearranging with Ghost Preview:**
  - Implemented pointer-capture drag-and-drop on `.workspace-tab-closable` elements using global document-level pointer tracking.
  - Displays a floating pixel-perfect drag ghost (`.workspace-tab-ghost`) that follows the mouse cursor with drop shadow and opacity.
  - Fades the original tab in-place (`.workspace-tab-dragging`) and dynamically reorders sibling tabs (Folder, Item, Test tabs) in real-time as the pointer moves across the tab bar, keeping `Home`/`Assets` as the anchored primary tab at index 0.
  - Clicking a tab without dragging selects/activates the tab seamlessly, while clicking the `X` close button closes the tab.
  - Suppressed native HTML drag startup for closable tabs and hardened pointer placement at both ends of the closable-tab strip while keeping Home/Assets anchored first.

---

## 3. Object Naming & Inline Renaming
- **Default Auto-Numbering:**
  - Folders default to `Folder`, `Folder 2`, `Folder 3`, etc.
  - Containers default to `Container`, `Container 2`, etc. (or custom type names).
- **Two-Line Clamped Label Rendering:**
  - `.workspace-object-label` allows text wrapping up to 2 lines before applying `-webkit-line-clamp: 2` with `text-overflow: ellipsis`.
- **Auto-Expanding Inline Rename:**
  - Renaming folders replaces the label with an auto-expanding `<textarea class="workspace-object-rename-input">` styled with character-fit blue highlight background.
  - Automatically resizes downward to display the entire multiline text as it wraps past 2 lines.
  - Commits on <kbd>Enter</kbd> or blur; cancels on <kbd>Escape</kbd>.

---

## 4. Workspace Mode Separation (Home vs. Assets)
- **Isolated Object Pools:**
  - Every workspace shell is tagged with `data-workspace-mode="home"` or `data-workspace-mode="assets"`.
  - Resolved `[hidden]` CSS override with `display: none !important;`, ensuring Home and Assets items strictly remain in their respective modes.
  - Dynamic `+` Create dropdown and context menu `New` submenus display mode-specific object types (`Item` in Home, `Texture` in Assets).
  - Home/Assets object order and recursive folder placement persist in the YCS4-local `ycs4.workspace-layout` manifest and restore on startup. This manifest is visual-only and remains separate from authored `ycs-data` object JSON and mod injections.

---

## 5. Context Menu & Submenus
- **Menu Hierarchy & Target Resolution:**
  - Right-clicking an object/folder reliably opens the object context menu: **Cut**, **Paste**, **[Divider]**, **Delete**, and **Rename** (folders only).
  - Right-clicking empty space opens the workspace context menu: **Paste**, **[Divider]**, and **New** (with flyout submenu).
- **Inactive "Paste" State:**
  - When nothing is cut (or immediately after pasting), the **Paste** option text renders in dimmed text (`#64646a`) without reducing container opacity, and suppresses hover highlights.
  - Re-enables full brightness and hover when an item is cut.
- **Persistent `New` Flyout Hover Highlight:**
  - The `New` option trigger retains active hover styling (`.workspace-context-option-active`) while the mouse hovers over the submenu or its options.
- **Search-Aware Menu Suppression:**
  - When the workspace search input is not empty, the **New** option and separator divider are hidden on empty right-click.

---

## 6. Folder Thumbnail Previews
- **Container-Only Previews:**
  - `refreshFolderPreview()` inspects folder content hosts and clones contained `.object-container` elements into `.object-folder-content`.
  - Strictly filters with `:not([data-object-type="Folder"])` so nested folders are never cloned as previews inside folder icons.
  - Retains pixel-perfect 9-slice button proportions within the inner folder pocket.

---

## 7. Global Deep Search
- **Cross-Folder Deep Search:**
  - Typing in the primary search box finds matches across root items and nested folder contents.
  - Matching nested items are temporarily surfaced in the main grid during search and restored to their original parent folders when the search box is cleared.
- **Autocomplete & History Suppression:**
  - Disabled browser autocomplete, autofill, suggestions, and history on search inputs (`autocomplete="off"`, `autocorrect="off"`, `autocapitalize="off"`, `spellcheck="false"`).
  - Search inputs initialize empty on startup and reset on mode/tab switches.

---

## 8. Folder Deletion Unwrap Behavior
- Deleting a Folder no longer opens an **Are you sure?** dialog and never deletes the saved objects it visually groups.
- The Folder's direct children are dispersed into its parent grid at the deleted Folder's position, preserving sibling order.
- A nested Folder is moved as one complete subtree, so all of its own Items and nested Folders retain their structure.
  - Dismissible via **No**, **X**, or pressing <kbd>Escape</kbd>.

---

## 9. Fixed Folder Tab Sizing
- Constrained `.workspace-tab` to a fixed `135px` width (`max-width: 135px; flex: 0 0 135px;`).
- Added `text-overflow: ellipsis; overflow: hidden; white-space: nowrap;` to `.workspace-tab-label`, preventing tab bar overflow on long folder names.

---

## 10. Texture Creator Dialog
- Added an Assets > Texture modal using the canonical floating-dialog title/body textures and YCS4 line rhythm.
- Ported YCS3's Name, ID, Texture, Mask, Emissive, Spritesheet, Rows, Default Frame, Animated, and Ticks/Frame fields without adding a preview.
- Added the reusable `pixel-file-button`: it reads `Add` initially, switches to the selected base filename, retains the shared minimum control width, and truncates overflow with an ellipsis.
- Bottom-anchored Save/Cancel actions match the folder confirmation dialog. Save writes texture metadata and selected image sidecars under `ycs-data/textures`; YCS4 folder placement remains visual-only.
- Fixed the untickable Animated checkbox by removing the conditional wrapper's single-row grid box; its child controls now participate as separate rows instead of overflowing beneath an invisible status layer that intercepted clicks.
- Replaced the in-workspace resizable panel with a fixed 600x390 detached native modal. Its titlebar can move outside the main editor, and every other YCS4 window stays disabled until Texture Creator closes.
- Added a square right-side preview that displays a static texture, the selected spritesheet Default Frame, or live Animated playback at the configured Ticks/Frame.
- Kept Texture Creator at 600x390 and sized its square preview to the complete Name-through-Ticks/Frame form height. The preview uses `preview.png` for its nine-slice frame, while imported frames are aspect-preserved inside it.
- Made the Texture Creator preview scale-safe by capping its ten-row square target to the available right half; pixel snapping at 100%, 200%, 400%, and 500% can no longer force the fixed dialog wider.
- Removed 200%/400% preview-frame seams by stretching the `preview.png` nine-slice regions instead of repeating fractional tiles.
- Updated the revised 7x7 `preview.png` frame to use three original-art pixels per nine-slice side (six pixels in the generated 2x sprite).
- Added saved base-texture thumbnails to Texture object containers and their folder previews. Folder previews continue to select the first direct non-folder child.
- Added Texture Creator edit mode: clicking a Texture loads its metadata and base/mask/emissive files, locks its ID, and updates the existing visual reference and thumbnail on Save.
- Added a searchable Texture combobox to the reduced Item editor. It lists saved textures with a left-flush thumbnail in every option and keeps the selected texture ID as the internal value.
- Added Holding Mode with the complete V3 choices: Generated, Handheld, and 3D Model.
- Wired reduced Item Save to a scoped V3-compatible injector. Generated/Handheld items now write registration, language, optional creative-tab assignment, texture, direct model JSON, and a refreshed `ycs-data/items` manifest while preserving unsupported fields. 3D Save is gated until its required model fields are ported.
- Completed the reduced Item lifecycle foundation: saved Items reopen from visual references, edits track `lastSavedId`, ID renames clean old injections/JSON and reject collisions, Item-panel Delete cleans the manifest before deleting JSON, and startup restores missing saved references at the Home root.
- Made every saved Item its own draggable Home object container. Generated/Handheld containers show their selected texture in the middle, and the same image appears in a folder preview when that Item is the folder's first direct non-folder child.
- Fixed Item Save losing an apparently selected Texture by stabilizing the combobox's selected ID/label pair and resolving exact displayed-option matches during validation.
- Fixed Texture options being closed on `pointerdown` before selection by registering the combobox as an Item dropdown boundary. Home/Assets search now also matches each visual reference's saved object ID.
- Made Home/Assets search recursively traverse every canonical folder grid, including unopened folders with detached page hosts, so nested files and subfolders appear in results at any depth.
- Fixed primary Home/Assets searches emptying open folder tabs. Nested matches now use temporary non-draggable search representations, leaving their canonical objects visible in their owning folders throughout the query.
