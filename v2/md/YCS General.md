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





## ?? CRITICAL: Workspace & Flexbox Architecture
It is ABSOLUTELY VITAL that you understand the underlying flexbox and native mathematical constraints that power the workspace tiles before editing any layouts. Please refer to **[YCS Workspace Architecture.md](./YCS%20Workspace%20Architecture.md)** for the complete set of rules preventing tile overlap, recursive resizing drift, and min-content bubbling.
