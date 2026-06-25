# yebisu Creator Studio

> **AI META-INSTRUCTION FOR UPDATING THIS DOCUMENT:** 
> When adding new rules or guidelines to this file:
> 1. **Categorize:** Always place new rules into an appropriate existing category (e.g., `## Architecture Guidelines`), or create a clearly defined new category if one doesn't exist. Prevent this file from becoming a mixed, disorganized mess.
> 2. **Integrate Harmoniously:** **DO NOT** simply append a new line to the bottom of lists. Carefully read the existing content and integrate your new rule. Rephrase or restructure sections if necessary to keep the document clean, highly readable, and logically organized.

## Architecture Guidelines

**Asset Modularity & Grouping**
Assets (such as images, SVGs, and ICOs) must be stored directly alongside the components that use them, rather than in a global assets folder. This guarantees that components remain modular and fully self-contained. 

*Exception for Shared Assets:* If an asset is used repeatedly across multiple, distinct components, you should abstract it into a dedicated `public` or `shared` directory to strictly avoid file duplication.

*Asset Reuse Rule:* **ALWAYS** search the project directories (specifically `public` and existing components) to check if an asset (like a close 'X' icon or a logo) already exists before generating or creating a new one!

**Window State Preservation**
Any new `BrowserWindow` created in the Electron main process MUST be wrapped with `electron-window-state`. You must provide a unique `file` identifier (e.g., `file: 'preferences-window-state.json'`) for secondary windows so every distinct window type perfectly remembers its size and position across application sessions!

**Reasonable Window Constraints**
All new `BrowserWindow` instances must have reasonable `minWidth` and `minHeight` boundaries explicitly defined to prevent the UI layout from breaking when resized, unless the window is intentionally designed as a tiny, fixed-size dialog.

## Development Philosophy

**Efficiency and Performance**
Performance is a top priority. Code should be highly optimized, and we value execution efficiency at every tier of the application. 

**Avoid Bloat**
Keep the codebase strictly lean. Over-engineering (like redundant IPC relays when native APIs suffice) or pulling in heavy third-party dependencies for simple tasks is strictly prohibited. Always seek the simplest, most lightweight solution possible.

## Reusable Components & Systems

Future AI agents MUST read this list to understand what already exists in the codebase and **reuse these systems** rather than reinventing them from scratch:

1. **Global `dropdown` Component**: Defined in `index.css`. The `.dropdown`, `.dropdown-item`, and `.dropdown-separator` classes mathematically lock to a 28px height, automatically inherit the Accent color, feature a sleek `backdrop-filter: blur(10px)`, and can be used ANYWHERE in the UI (not just the title bar).
2. **`Titlebar` Component (`Titlebar.jsx`)**: Handles native Windows OS snapping/dragging. Uses the global `.dropdown` class for its menus.
3. **Global Theme Engine**: DO NOT hardcode hex colors (like `#252526`) or border radii (like `4px`). Always use the globally synced CSS variables: `var(--ycs-bg)` for backgrounds, `var(--ycs-accent)` for active states/menus, `var(--ycs-text)` for typography, `var(--ycs-highlight)` for borders, and `var(--ycs-radius, 4px)` for all border radii (buttons, inputs, dropdowns, panels).
4. **Sub-Window Architecture (`electron/main.js`)**: Sub-windows (like Preferences) are true OS-level frameless windows. There are two explicit types:
   - **Modal**: Blocks the main application entirely until closed (e.g., `parent: mainWindow, modal: true`). Use this when the user MUST resolve the window before continuing.
   - **Non-Modal / Floating**: Can be left open while interacting with the main app (e.g., `parent: mainWindow, modal: false` or independent). Use this for floating tools or reference panels.
5. **Native Color Picker Pattern**: When building color pickers, do not use the default HTML color swatch or the `window.EyeDropper` API (it gets trapped in window bounds). Instead, copy the pattern from `PreferencesPage.jsx`: Use a `0 opacity` `<input type="color">` positioned exactly over an SVG icon to force the native OS color dialog to open.
6. **Searchable Combobox Standard**: When building Dropdown menus for UI fields (not the Titlebar), the standard behavior is to implement a **Searchable Combobox**. Wrap an invisible `<input type="text">` inside the clickable control box so users can type to instantly filter the popup options.
7. **Inline Control Alignment**: All inline form controls (Buttons, Previews, Dropdowns, Text Inputs, Checkboxes, Toggles) must be perfectly horizontally vertically-centered and aligned with each other. They MUST all share a strict fixed height (24px) using the `.inline` modifier (or equivalent height definition) so they sit perfectly flush on the same baseline. If a **checkbox** is used inline with other controls, it must ALWAYS be placed at the very front (the leftmost position) of the line.
8. **Field Label Expansion**: All UI field labels must use `white-space: nowrap`. Do not use fixed widths that clip text. Instead, use a `min-width` (e.g. 140px) with `padding-right`. If a label is exceptionally long, it is perfectly acceptable for the label column to auto-expand and push the inline components further to the right.
9. **Standard UI Dividers**: Whenever placing horizontal dividers between sections or action bars, they must be strictly uniform: `<div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%' }}></div>`. Do not add custom opacities or side margins; dividers should perfectly span the container block using the raw foreground color.
10. **Button System**: Always use the global CSS classes for buttons rather than hardcoding styles:
    - `.ycs-button`: Standard rectangular text button. Can be combined with `.primary` for the main call-to-action or `.active` for a lit-up toggle state.
    - `.ycs-button.inline`: A variation that locks the button to exactly 24px height with reduced padding, designed to sit perfectly inline alongside dropdowns and text fields.
    - `.ycs-tiny-button`: A perfect 24x24px square button designed exclusively to hold small 16x16px SVG icons (e.g., the eyedropper tool).
11. **Close Icon Asset**: We have a global `close-icon.svg` in `/public`. Always reuse it.
12. **Transparent Style & Window Materials**: The application uses Windows 11 native `Acrylic` material (`backgroundMaterial: 'acrylic'`) for its background in frameless windows, forcing dark mode via `nativeTheme.themeSource = 'dark'` to suppress the bright luminosity layer. 
13. **Opacity Stacking Rules**: To avoid double-stacking alpha channels and darkening the glass effect, UI containers, title bars, sidebars, action bars, inputs, and standard buttons must use `backgroundColor: 'transparent'`. The global `var(--ycs-bg)` and `var(--ycs-accent)` variables dynamically inherit alpha transparency from user preferences. The `var(--ycs-highlight)` and `var(--ycs-foreground)` variables **DO NOT** inherit transparency; they remain purely solid at all times. Primary buttons and active tabs use pure `var(--ycs-highlight)` to stand out.
14. **Global Slider & Scrollbar Standards**:
    - **Sliders**: A global preset for `<input type="range">` exists in `index.css`. It automatically styles standard HTML range sliders to use the solid, non-transparent variables: `var(--ycs-highlight)` for the thumb knob and `var(--ycs-accent-solid)` for the track. This ensures control elements stay opaque even if the global window transparency is dialed up.
    - **Scrollbars**: Native scrollbars are globally overridden via `::-webkit-scrollbar`. The background track is strictly `transparent`, and the floating thumb uses `var(--ycs-foreground-solid)` bounded by a transparent border (`background-clip: padding-box`) for a sleek, detached look. There is no hover highlight on scroll thumbs. Never introduce third-party scrollbar libraries.
15. **Frameless Dragging**: Because the main window is frameless without a visual titlebar, there is an invisible `8px` high drag region (`WebkitAppRegion: 'drag'`) permanently anchored to the top edge of `WindowFrame.jsx` to allow window movement.
16. **Universal Base Button & Icon Modifiers**:
    - **Global Base Class**: `.ycs-button` is the single, unified base class for ALL buttons in the application. It guarantees total visual consistency. Every button—whether it's a standard text button, an action popup, or a tab—MUST use `.ycs-button`. It provides standard padding, sizing, and the universal hover behavior (where both the background and border instantly transition to a solid `var(--ycs-highlight)` fill). DO NOT create custom button classes or ghost hovers.
    - **Icon-Only Buttons**: If a button solely contains an icon (e.g., an SVG or a single glyph) and no text, it MUST use `.ycs-button icon`. This `.icon` modifier dynamically overrides the padding and width to create a perfect `28x28` square that exactly matches the vertical height of adjacent text buttons. Examples include the eyedropper button, workspace reset icons, and settings toggles.
17. **N-ary Tree Tiling Workspace Manager**: The main editor layout (`App.jsx` and `Workspace.jsx`) uses a highly optimized recursive N-ary tree data structure (`{ type: 'split'|'leaf', direction: 'horizontal'|'vertical', children: [...] }`) to manage a fluid, customizable tiling window system. 
    - **Flex-Based Resizing**: Window resizing uses purely absolute math based on `clientX/Y` mapped to `flex: <size> 1 0%`. It strictly **DOES NOT** use CSS `transition: all` on layout properties (`width`/`height`/`flex`) because that causes severe lag/rubber-banding during 60FPS mouse tracking.
    - **Corner Rendering & Gap Illusion**: The 6px gaps between tiles are not transparent empty space; they are visual illusions. To prevent double-stacking alpha layers at the intersections of multiple tiles, the windows use a highly specific `backgroundClip: 'padding-box'` combined with a solid radial gradient (`radial-gradient(circle at center, var(--ycs-accent) 0%, var(--ycs-accent) 100%)`). 
    - **Alt-Key Drag Lock**: All tab reorganizing, dragging, and workspace splitting operations require the user to hold the `Alt` key. HTML5 drag-and-drop operations explicitly append a `ycs-tab` payload; the drop zones (side zones, gap dividers, global edges) will instantly abort if they don't detect `ycs-tab`, ensuring users can drag normal text/images inside the editor without triggering massive layout shifts.
    - **Drop Zone Separation**: To prevent overlapping, the system has three perfectly distinct drop zones: 1. A razor-thin `15px` "Global Edge" zone on the absolute outer perimeter of the app, 2. A massive `80px` "Side Zone" on the inner edges of each window tile, and 3. A `30px` "Divider Zone" located precisely in the gaps between tiles.
    - **Child Tile Unlinking on Move**: When a user manually drags a linked child tile to a new position, the `linkedParentId` is cleared. The swap (center-drop) path also clears `linkedParentId` on both tiles. However, the parent still tracks the child by scanning the **entire tree** for tiles with a matching `tabId` (not just linked children). Clicking "set/edit" will close any existing tile with that `tabId` anywhere in the tree, or open a fresh linked child if none exists. This prevents duplicate child tiles from accumulating regardless of where the user moved the original.
    - **Active Node Priority**: The system uses a `mainNodeId` tracking system. The "Active Tab" automatically updates to whichever tile the user last interacted with (e.g., by clicking on it, dragging a tab into it, or instantiating a new tile). All subsequent tab clicks from the sidebar will prioritize swapping into this newly designated "Active Tab" first.
    - **Global Keymaps**: A global event listener tracks mouse `X/Y` and parses custom string hotkeys (like `Alt+W` and `Alt+R`) from `localStorage`. `Alt+W` dynamically uses `document.elementFromPoint` to identify and instantly close the specific `.workspace-leaf` currently sitting under the cursor, bypassing the need for state-heavy React hover tracking.

## Master UI Component Library
Future AI agents MUST refer to this canonical list and reuse these systems rather than reinventing UI elements from scratch.

### 1. Buttons (`.ycs-button`)
- **Standard**: Default rectangular button.
- **Primary (`.primary`)**: Filled with the highlight color for main calls-to-action.
- **Active (`.active`)**: Locked highlight state for toggled tools/tabs.
- **Inline (`.inline`)**: Squashed to a strict `24px` height so it sits perfectly flush with form fields.
- **Icon (`.icon`)**: A perfectly calculated `28x28px` square designed exclusively to house small SVG icons (like the Eyedropper or Settings gear).

### 2. Tabs (`.ycs-tab`)
- **Standard**: A variant of `.ycs-button` specifically for tabs. Uses no border/outline and no border radius to sit flush against edges.
- **Active (`.active`)**: Locked highlight state for toggled tabs.
- **Icon (`.icon`)**: Expands to fill the container width, designed for sidebars.

### 2. Inline Form Controls (Strict 24px Baseline)
- **Text Input (`.ycs-input.inline`)**: A clean, border-lined text box that glows with the highlight color on focus. Uses `background-color: transparent`.
- **Checkbox (`.ycs-checkbox`)**: A custom `16x16px` box that perfectly aligns to the far-left of form rows, rendering a clean `✓` when active.
- **Toggle Switch (`.ycs-toggle`)**: A custom `36x20px` pill-shaped toggle switch with a smooth CSS sliding animation.
- **Searchable Combobox (`DropdownField`)**: A React component (in `Field.jsx`) that wraps an invisible text input, allowing instant filtering of dropdown options.
- **Standard Dropdown (`StandardDropdownField`)**: A classic "click to select" React component (in `Field.jsx`). It mimics a native HTML select element but builds its popup using the global `.dropdown` architecture for 1:1 visual parity with comboboxes.

### 3. System Controls
- **Range Sliders (`<input type="range">`)**: Native sliders styled with solid `--ycs-accent-solid` tracks and solid `--ycs-highlight` thumbs.
- **Scrollbars (`::-webkit-scrollbar`)**: Hidden background tracks with floating padding-box thumbs using the foreground color.
- **Dividers**: Strict `1px` high horizontal lines using `var(--ycs-foreground)` and `width: 100%`.

### 4. Spacing Standards
- **Series Spacing**: Any tightly grouped series of adjacent, functionally related inline components (such as an OK/Cancel/Apply button row, the hex box + color preview + eyedropper cluster, or window controls) MUST strictly use gap: 8px for separation, while the outer padding of the group container should use a constant `8px`. This ensures UI padding is fully decoupled from the workspace's tile sizing, avoiding `var(--ycs-gap)`.



### 5. Tiled Subwindows
When a subwindow (like the Preferences/Settings menu) is dropped into the workspace to act as a tiled leaf, it must completely drop its native OS-level title bar, and it should NOT use a dedicated workspace-tab-header. Instead, it completely fills the tile (100% width/height), and users simply use the global Ctrl + Drag mechanism on the inner content to move the tile around.

Furthermore, all internal subwindows must proactively confine themselves. They must utilize CSS rules like min-width: 0 and overflow: auto on their internal flex columns so they do not block the parent tile from shrinking. The docked subwindow should NEVER dictate the tile's size; the workspace tile dictates the size, and the subwindow's layout adjusts internally or overflows.

To completely prevent flexbox "min-content bubbling" (which causes adjacent tiles to be forcefully pushed), developers MUST:
- Apply min-width: 0; min-height: 0; to ALL internal flex containers and wrappers inside the subwindow.
- Prevent ugly text wrapping when the tile is squished by using white-space: nowrap and overflow-x: auto on content blocks.
- Cap any internal resizable columns (like sidebars) using dynamic limits (e.g., max-width: calc(100% - 50px)) so their drag handles are never permanently clipped off-screen when the tile is shrunk.





## Manifest & Injection Engine
YCS uses a **master manifest** (`ycs-manifest.json` in the mod root) to track every entry it creates, every file it touches, and every asset dependency. This is the backbone of the creation/deletion pipeline — it eliminates the need to manually specify cleanup steps.

**Key principles:**
- **Marker-based Java injection:** All registry classes use `//YCS_<Name>_START` / `//YCS_<Name>_END` comment markers. YCS injects between them and tracks the exact content for reliable removal.
- **Asset dependency tracking:** Textures, models, and sounds register their consumers. Deletion of an in-use asset is blocked with a warning.
- **Atomic operations:** Every create/delete updates both the mod files and the manifest in one pass.

For the complete schema, injection types, marker format, and operation flows, refer to **[YCS_MANIFEST.md](./YCS_MANIFEST.md)**.

## Sidebar Tab Groups & Component Registry

The left sidebar organizes tabs into collapsible groups. Each group has an arrow chevron and a label; child tabs are indented underneath. To add a new tab:
1. Create a React component (e.g., `ItemPageNew.jsx`).
2. Register it in `COMPONENT_REGISTRY` in `Workspace.jsx` with a string key (e.g., `'Item': ItemPageNew`).
3. Add a sidebar entry in `App.jsx` inside the appropriate group, following the existing `ycs-tab` pattern with Ctrl+Drag popout support.

**Current groups:**
- **Reference** — Test tabs (Tab 1, Tab 2, Tab 3 Group)
- **Gameplay** — Item, Item (Old)

## Form Layout Rules

### Dual-Column Row Pattern
Forms support two layout modes for field rows:

- **Full-width row:** `[Label] [Control ────────────────────]` — Label on the left, control fills remaining width. Use `FieldRow` from `Field.jsx`.
- **Dual-column row:** `[Label1] [Control1] [Label2] [Control2]` — Two label+control pairs on one line. The first control is capped at `40%` width; the second flexes to fill remaining space. Both second-column controls align vertically across rows.

Use dual-column rows when a field has a related secondary option (e.g., ID + Custom Const Name). Do not use them for unrelated fields.

### Form State Persistence Across Tree Changes
When a tile splits (e.g., opening a child tile to the right), React may unmount and remount the parent component with the same `nodeId`. To prevent form state from resetting:
- Store form state in a **module-level `Map`** keyed by `nodeId` (not in React `useState` alone).
- On mount, read from the store; on every update, write back to the store.
- See `usePersistedForm()` in `ItemPageNew.jsx` for the canonical pattern.

### Minimum Content Width
Form pages must set a `minWidth` on their scrollable content area (e.g., `450px`) so that inline controls never squish below their usable size. The tile provides horizontal scrollbars when narrower than the minimum — controls retain their designed dimensions.

### Sub-Sections with Side Border
When grouping related fields under a toggle or multi-state expansion, wrap them in a left-bordered container: `paddingLeft: 16px; borderLeft: 2px solid var(--ycs-foreground)`. Give each group a bold title label above it (e.g., "Default State", "State 2").

### Texture Field Pattern
Texture selection fields use a three-part inline layout: `[Preview Square] [Read-only Name] [set/edit Button]`. The preview is a 24x24 square with `imageRendering: pixelated`. The name area is a bordered read-only box styled like the keybind/shortcut input (not an editable text field). Clicking set/edit opens a child tile to the right using the `ycs-toggle-child` event pattern.

### Child Tile Field Pattern
For fields that open a child editor tile (Tags, Recipe, Methods, Data Components), use the `ChildTileField` component: `[Read-only bordered text] [set/edit Button]`. No preview square — only a bordered summary box and the action button. The set/edit button uses the `.active` class to stay highlighted while the child tile is open, reflecting toggle state.

### Toggle State on Child Tile Buttons
Any button that opens a child tile (TextureField, ChildTileField) must pass an `isOpen` prop. When `true`, the button receives the `.ycs-button.active` class to visually indicate the linked child tile is open. Use the `isChildOpen(prefix, key)` helper to check tree state.

### Child Tile Stacking
When multiple child tiles are opened from the same parent on the same side, they stack in the perpendicular direction:
- **Right/Left children** stack **top-to-bottom** (vertical split).
- **Top/Bottom children** stack **left-to-right** (horizontal split).

The second child splits the first child tile (not the parent) in the perpendicular direction.

### Child Tiles in Popout Mode
When the parent component is in a popout window (no workspace tree available), clicking set/edit opens the child as a **new popout window** via `electronAPI.openPopout(tabId)`. Clicking again closes it via `electronAPI.closePopout(tabId)`. Open popout children are tracked in a module-level `Set`. The `resolveComponent()` function (exported from Workspace.jsx) handles `::` prefixed tab IDs for both workspace tiles and popout windows.

### Number Inputs
Use `type="text"` with `inputMode="numeric"` and manual regex validation (`/^-?\d*\.?\d*$/`) instead of `type="number"` to avoid browser-native spinner buttons. See `NumberInput` in `ItemPageNew.jsx`.

### Item Form Section Order
The item editor form follows this top-to-bottom structure:
1. **Identity** — Display Name, ID + Custom Const
2. **Appearance** — Multiple States toggle, Model, Texture
3. **Properties** — Stack Size, Tool/Food/Fuel/Durability/Use Duration checkboxes with sub-fields, Tooltip with Hidden Text + Custom Shift Hint
4. **Creative Tab** — Searchable dropdown for creative menu tab
5. **Tags** — Child tile field (opens tag editor)
6. **Recipe** — Child tile field (opens recipe editor)
7. **Methods** — Child tile field (opens method editor)
8. **Data Components** — Child tile field (opens data component editor, shared across item/block contexts)

### Shared Components Across Editors
Components like `Data Components` that serve the same conceptual purpose across different editors (items, blocks) should use a single registry key without an editor prefix (e.g., `'Data Components'` not `'Item Data Components'`). The child tile receives context from its scoped tab ID (`Data Components::${nodeId}::data-components`).

### Form Footer
Item editor forms include a pinned footer with three actions: `[Save & Close] [Cancel] [Save]`. The footer is `flexShrink: 0` with a `borderTop: 1px solid var(--ycs-foreground)` separator, matching the Preferences page footer pattern.

## CRITICAL: Workspace & Flexbox Architecture
It is ABSOLUTELY VITAL that you understand the underlying flexbox and native mathematical constraints that power the workspace tiles before editing any layouts. Please refer to **[YCS Workspace Architecture.md](./YCS%20Workspace%20Architecture.md)** for the complete set of rules preventing tile overlap, recursive resizing drift, and min-content bubbling.
