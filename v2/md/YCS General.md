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

1. **Global `dropdown` Component**: Defined in `index.css`. The `.dropdown`, `.dropdown-item`, and `.dropdown-separator` classes mathematically lock to a 28px height, automatically inherit the Accent color, and can be used ANYWHERE in the UI (not just the title bar).
2. **`Titlebar` Component (`Titlebar.jsx`)**: Handles native Windows OS snapping/dragging. Uses the global `.dropdown` class for its menus.
3. **Global Theme Engine**: DO NOT hardcode hex colors (like `#252526` or `#0078d7`) for UI panels or highlights. Always use the globally synced CSS variables: `var(--ycs-bg)` for backgrounds/panels, `var(--ycs-accent)` for active states/menus, `var(--ycs-text)` for typography, and `var(--ycs-highlight)` for borders.
4. **Sub-Window Architecture (`electron/main.js`)**: Sub-windows (like Preferences) are true OS-level modals (`parent: mainWindow, modal: true`). They are frameless. To open Preferences, call `window.electronAPI.openPreferences()`.
5. **Native Color Picker Pattern**: When building color pickers, do not use the default HTML color swatch or the `window.EyeDropper` API (it gets trapped in window bounds). Instead, copy the pattern from `PreferencesPage.jsx`: Use a `0 opacity` `<input type="color">` positioned exactly over an SVG icon to force the native OS color dialog to open.
6. **Searchable Combobox Standard**: When building Dropdown menus for UI fields (not the Titlebar), the standard behavior is to implement a **Searchable Combobox**. Wrap an invisible `<input type="text">` inside the clickable control box so users can type to instantly filter the popup options.
7. **Inline Control Alignment**: All inline form controls (Buttons, Previews, Dropdowns, Text Inputs) must be perfectly horizontally vertically-centered and aligned with each other. If a **checkbox** is used inline with other controls, it must ALWAYS be placed at the very front (the leftmost position) of the line.
8. **Field Label Expansion**: All UI field labels must use `white-space: nowrap`. Do not use fixed widths that clip text. Instead, use a `min-width` (e.g. 140px) with `padding-right`. If a label is exceptionally long, it is perfectly acceptable for the label column to auto-expand and push the inline components further to the right.
9. **Standard UI Dividers**: Whenever placing horizontal dividers between sections or action bars, they must be strictly uniform: `<div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%' }}></div>`. Do not add custom opacities or side margins; dividers should perfectly span the container block using the raw foreground color.
10. **Button System**: Always use the global CSS classes for buttons rather than hardcoding styles:
    - `.ycs-button`: Standard rectangular text button. Can be combined with `.primary` for the main call-to-action or `.active` for a lit-up toggle state.
    - `.ycs-button.inline`: A variation that locks the button to exactly 24px height with reduced padding, designed to sit perfectly inline alongside dropdowns and text fields.
    - `.ycs-tiny-button`: A perfect 24x24px square button designed exclusively to hold small 16x16px SVG icons (e.g., the eyedropper tool).
11. **Close Icon Asset**: We have a global `close-icon.svg` in `/public`. Always reuse it.
