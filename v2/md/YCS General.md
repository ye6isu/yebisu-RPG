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
4. **Native Color Picker Pattern**: When building color pickers, do not use the default HTML color swatch or the `window.EyeDropper` API (it gets trapped in window bounds). Instead, copy the pattern from `PreferencesPage.jsx`: Use a `0 opacity` `<input type="color">` positioned exactly over an SVG icon to force the native OS color dialog to open.
5. **Close Icon Asset**: We have a global `close-icon.svg` in `/public`. Always reuse it.
