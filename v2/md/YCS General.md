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
9. **No Placeholder Text in Inputs**: Text input fields must NOT use `placeholder` attributes. Leave inputs empty when no value is set. The field label already communicates purpose — placeholder text is redundant and clutters the UI.
10. **Standard UI Dividers**: Whenever placing horizontal dividers between sections or action bars, they must be strictly uniform: `<div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%' }}></div>`. Do not add custom opacities or side margins; dividers should perfectly span the container block using the raw foreground color.
10. **Button System**: Always use the global CSS classes for buttons rather than hardcoding styles:
    - `.ycs-button`: Standard rectangular text button. Can be combined with `.primary` for the main call-to-action or `.active` for a lit-up toggle state.
    - `.ycs-button.inline`: A variation that locks the button to exactly 24px height with reduced padding, designed to sit perfectly inline alongside dropdowns and text fields.
    - `.ycs-tiny-button`: A perfect 24x24px square button designed exclusively to hold small 16x16px SVG icons (e.g., the eyedropper tool).
    - All buttons enforce `white-space: nowrap` globally via CSS — button text must never wrap to a second line, even when tiles are shrunk very small.
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
- **Gameplay** — Items, Item (Old)

**Current `COMPONENT_REGISTRY` keys:** `Preferences`, `Tab 1`, `Tab 2`, `Tab 3.3`, `Items` (landing page), `Item (Old)`, `Item` (ItemPageNew), `Item Texture` (TextureSelectorPage), `Item Tags` (TagEditorPage), `Item Recipe` (RecipeEditorPage), `Item Methods` (MethodEditorPage), `Item Model JSON` (ModelJsonPage), `Data Components` (DataComponentEditorPage), `Textures` (TextureManagerPage), `Texture Editor` (TextureEditorPage), `Preview` (PreviewPane).

## Registry Landing Pages

Every entry type that produces a list of mod entries (Items, Blocks, etc.) uses a **Landing Page → Editor** flow powered by the reusable `RegistryLandingPage` component (`RegistryLandingPage.jsx`).

**Architecture:**
- `RegistryLandingPage` is a generic card-grid component. It receives props for: `title`, `loadEntries` (async data fetch), `filterEntry` (exclude irrelevant entries), `editorPrefix` (the `COMPONENT_REGISTRY` key for the editor, e.g. `'Item'`), `seedFormData` (maps a scanned entry to editor form state), and `entryKey` (unique ID extractor).
- Each entry type creates a thin wrapper (e.g., `ItemsLandingPage.jsx`) that passes type-specific config to `RegistryLandingPage`.
- The sidebar tab opens the **landing page** (e.g., `'Items'`), not the editor directly.

**Card Layout:**
Each card displays: `[64x64 Texture/3D Preview] [Display Name] [ID]`. Cards are arranged in a wrapping flex grid with `gap: 12px`. On hover, a **delete button** appears at the top-right corner — a white opaque circle with a transparent minus sign cut out via SVG mask.

**Opening Editors:**
- Clicking a **card** toggles its editor: if the editor for that entry is already open (matched by stable `tabId` using the entry's label/key), it closes; if not, it opens. The `tabId` for card-opened editors uses the entry's label as identifier (e.g., `Texture Editor::${nodeId}::${tex.label}`).
- Clicking the **`+` button** always creates a new blank independent instance with a unique `tabId` using `Date.now()`. Multiple blank editors can coexist without affecting each other.
- In **popout mode** (no workspace tree), the same toggle/new behavior applies via `electronAPI.openPopout/closePopout`.
- Before opening, the landing page seeds the editor's form data into `localStorage` under the appropriate seed key so the form hook picks it up on mount.

**Header Controls:**
- Filter input (text search by ID and display name).
- Refresh button: `.ycs-button icon` (28x28, 16x16 SVG refresh icon).
- Add button: `.ycs-button icon` (28x28, 16x16 SVG plus icon).

**Entry Filtering:**
Landing pages may exclude certain item classes from display. For example, the Items landing page filters out `ArmorItem` and `SpawnEgg` since those will have dedicated tabs.

## Form Layout Rules

### Dual-Column Row Pattern
Forms support two layout modes for field rows:

- **Full-width row:** `[Label] [Control ────────────────────]` — Label on the left, control fills remaining width. Use `FieldRow` from `Field.jsx`.
- **Dual-column row:** `[Label1] [Control1] [Label2] [Control2]` — Two label+control pairs on one line. The first control is capped at `40%` width; the second flexes to fill remaining space. Both second-column controls align vertically across rows.

Use dual-column rows when a field has a related secondary option (e.g., ID + Custom Const Name). Do not use them for unrelated fields.

### Tile Independence
Every editor tile is an independent instance. Opening the same entry multiple times creates separate copies that do not affect each other. Users can fill out, move, and resize each instance freely. Moving a tile to a new position preserves its data — like moving a filled-out paper to a different desk.

### Form State Persistence via `tabId`
All form persistence must key on `tabId` (stable across moves), **not** `nodeId` (workspace UUID that changes when a tile is dragged to a new split position). When a tile is moved, the old node is destroyed and a new one is created with a fresh `nodeId`, but `tabId` stays the same. Keying localStorage on `tabId` ensures data survives repositioning.

Pattern: `const stableId = tabId || nodeId;` then use `stableId` for all localStorage keys and event matching.

See `usePersistedForm()` in `ItemPageNew.jsx` and `useTexForm()` in `TextureEditorPage.jsx` for the canonical patterns.

### Minimum Content Width
Form pages must set a `minWidth` on their scrollable content area (e.g., `450px`) so that inline controls never squish below their usable size. The tile provides horizontal scrollbars when narrower than the minimum — controls retain their designed dimensions.

### Sub-Sections with Side Border
When grouping related fields under a toggle or multi-state expansion, wrap them in a left-bordered container: `paddingLeft: 16px; borderLeft: 2px solid var(--ycs-foreground)`. Give each group a bold title label above it (e.g., "Default State", "State 2").

### SpritePreview Component
`SpritePreview.jsx` is a shared component for rendering texture previews at any size. Props: `url`, `size`, `frames`, `isAnimated`, `isSpritesheet`, `ticksPerFrame`, `defaultFrame`. For spritesheets: animated ones cycle frames via `setInterval`; non-animated show `defaultFrame`. Uses CSS `translateY` on a vertically-stacked spritesheet image. Used in: landing page cards (64px), inline texture file rows (24px), and PreviewPane (panel-fit).

### Texture Field Pattern
Texture selection fields use a single inline row: `[24x24 SpritePreview] [Read-only Name Box] [remove Button (if set)] [set/edit Button]`. The preview uses `SpritePreview` so spritesheets animate or show the default frame inline. The name area is a bordered read-only box — it displays the filename or `"none selected"` at 0.5 opacity. The remove button only appears when a file is set.

For optional texture layers (Emissive, Shape), the row is checkbox-gated: `[Checkbox] [Label] [Preview] [Name] [Button]`. The checkbox comes first (per rule 7). When unchecked, the preview/name/button are dimmed (opacity 0.3) and non-interactive, and the file data is cleared. One row — no sub-sections.

### Texture Editor Layout
The Texture Editor child tile (`TextureEditorPage.jsx`) uses standard `FieldRow` layout for all fields:
- **Name**: `FieldRow` with `ycs-string-input`
- **Normal**: `TextureFileRow` with `showAnim` (uses SpritePreview, no checkbox)
- **Emissive**: `TextureFileRow` with `checkboxKey` (checkbox-gated)
- **Shape**: `TextureFileRow` with `checkboxKey` (checkbox-gated)
- **Spritesheet Properties**: `CheckboxRow`, expands a bordered sub-section. Frames and Default Frame use `DualRow` (2-column). Animated: `[Checkbox] Animated [ticks/frame input] [ticks/frame label]` — single inline row.
- **Footer**: Save & Close, Cancel, Save buttons. Save & Close and Cancel also close the Preview child tile.

### Landing Page Card Previews
Card previews in landing pages (Items, Textures) use `backgroundColor: 'transparent'` — no gray box behind the preview image, allowing texture transparency to show through. Spritesheet textures render animated or at default frame via `SpritePreview`.

### Preview Pane
`PreviewPane.jsx` is a reusable child tile for live asset preview. Supports two preview types determined by `d.type`:
- **`'texture'`** (default): Uses `SpritePreview` sized to `min(containerWidth, containerHeight)` via `ResizeObserver`. Shows static, default-frame, or animated spritesheet textures.
- **`'model'`**: Uses `ModelPreview3D` for interactive Three.js WebGL rendering of Blockbench geometry JSON. Supports left-click orbit, right-click/middle-click pan, and scroll zoom. Renders textured 3D models with proper bone hierarchy, per-face UV mapping, and zero-size axis z-fighting fix. A 3D wireframe grid (three intersecting grid planes at origin with X=red/Y=green/Z=blue axis lines) rotates with the model for spatial reference. Extracts elements from both Minecraft (`elements` with `from`/`to`) and Bedrock (`minecraft:geometry` with `bones[].cubes`) formats.

Listens for `ycs-preview-update` events and reads from `localStorage` key `ycs-preview::${tabId}`. No text/labels — just the visual.

Preview is **not auto-spawned**. The user toggles it via a "Preview" button in the editor footer. The button uses `.ycs-button.active` when open. Preview can be freely closed. Save & Close and Cancel also close the preview when closing the editor.

### Model JSON Page
`ModelJsonPage.jsx` is a child tile for importing 3D model files. It has two `JsonFileRow` fields:
- **Geometry** (`.geo.json`) — the Blockbench geometry with elements/cubes/bones
- **Item Model** (`.json`) — the Minecraft item model with `parent`, `display` transforms, `textures`, `overrides`

Both fields support native file picker and drag-and-drop (the entire content area is a drop zone). Dropped `.geo.json` files auto-route to the Geometry field; other `.json` files go to Item Model.

The footer has only a Preview toggle button (no Save/Cancel — this is a direct file importer). Changes dispatch `ycs-model-json-changed` to update the parent item editor. Preview pushes `type: 'model'` data to `PreviewPane` for 3D wireframe rendering.

### Child Tile Repositioning
All tiles are freely movable. Moving a tile does not lose its data (keyed on `tabId`) and does not affect other tiles. The `linkedParentId` is cleared on move, but communication continues via `tabId` matching. Preview tiles spawned by an editor stay connected via the editor's `tabId`-derived preview key, regardless of where either tile is dragged.

When spawning a preview or companion tile, always check if one already exists in the tree (by `tabId`) before creating a new one — this prevents duplication when a tile remounts after being moved.

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

### Item Selector (Floating Popover)
`ItemSelector.jsx` is a reusable floating panel for picking items, blocks, and tags. It appears anchored next to whatever element triggered it (via `anchorRect` prop) and auto-positions to avoid overflow. Contains the complete Minecraft 1.21.1 vanilla item registry, common item/block tags, and mod items from `fileEngine.items.scanAll()`. Features: search bar (type any `namespace:id` and press Enter), tab filters (All/Vanilla/Tags/Mod), click-outside/Escape to close. Used by `RecipeEditorPage` for slot filling.

### Recipe Editor
`RecipeEditorPage.jsx` is a child tile for defining recipes. The output is always the item being edited — no output slot is shown. Layout:
- **Crafting**: Checkbox toggle → 3x3 ingredient grid (with brush painting: pick an item from the floating selector, hover other slots to paint, right-click to clear) + shape dropdown (Shaped/Shapeless).
- **Smelting/Blasting/Smoking/Campfire Cooking**: Checkbox toggle → inline ingredient slot + cook time (ticks) + XP, all on one compact row.
- **Stonecutting**: Checkbox toggle → full-size ingredient input slot + count (no XP, no cook time).

Slots open the `ItemSelector` floating popover anchored to the clicked slot. Multiple recipe types can be enabled simultaneously (checkboxes, not exclusive dropdown).

### Method Editor
`MethodEditorPage.jsx` is a child tile for enabling Java method overrides on the item's custom class. Uses the same method definitions as the old YCS v1 visual block editor (`tools/Yebisu Creator Studio/src/codegen/visual/methods.js`). Each method is a checkbox with its label, Java signature, and description. Enabled methods: `useOn` (block interaction), `use` (right-click), `continuousUse` (onUseTick), `releaseUsing`, `finishUsingItem`, `inventoryTick`, `hurtEnemy` (combat), `interactLivingEntity` (entity right-click). Enabling a method generates the corresponding `@Override` stub in the custom item class.

### Child Tile Space Reclamation
When a child tile is closed, the workspace automatically collapses the split and the remaining sibling reclaims the full space. This is handled by `removeNodes` in `App.jsx` and `handleCloseTab` in `Workspace.jsx` — both collapse single-child splits: `if (newChildren.length === 1) return { ...newChildren[0], size: node.size }`.

### Texture Selector (Item Texture)
`TextureSelectorPage.jsx` is a child tile opened from the item editor's Texture field. It shows saved textures as a card grid (same style as the Textures landing page) without the `+` button. An **upload card** appears first — a dashed-border card with an upload icon that opens the native file explorer or accepts drag-and-drop from the desktop. Uploading saves the texture to `ycs-textures-list` and auto-selects it.

Clicking a texture card dispatches `ycs-texture-selected` with `{ selectorTabId, textureName, textureData }`. The item editor listens for this event and maps the `selectorTabId` back to the correct field (`main` or `state-N`).

The `TextureField` in `ItemPageNew.jsx` shows a 24x24 `SpritePreview` (animated if spritesheet) by looking up the texture data from `ycs-textures-list` by label.

### Landing Page Card Delete
Cards in landing pages show a **delete button** on hover at the top-right corner. The button is a white opaque circle (18x18) with a transparent minus sign cut out via SVG mask. Clicking it removes the entry from localStorage and dispatches the relevant change event. `stopPropagation()` prevents the card click handler from firing.

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
Editor forms include a pinned footer. Layout: `[Preview (toggle)] [spacer] [Save & Close] [Cancel] [Save]`. The Preview button sits on the left with `.active` class when preview is open; the save/cancel actions sit on the right. The footer is `flexShrink: 0` with a `borderTop: 1px solid var(--ycs-foreground)` separator. Footer buttons must never wrap text — `white-space: nowrap` is enforced globally on `.ycs-button`.

## CRITICAL: Workspace & Flexbox Architecture
It is ABSOLUTELY VITAL that you understand the underlying flexbox and native mathematical constraints that power the workspace tiles before editing any layouts. Please refer to **[YCS Workspace Architecture.md](./YCS%20Workspace%20Architecture.md)** for the complete set of rules preventing tile overlap, recursive resizing drift, and min-content bubbling.
