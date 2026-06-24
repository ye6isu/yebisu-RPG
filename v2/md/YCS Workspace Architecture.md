# Yebisu Creator Studio (YCS): Workspace Architecture & Layout Engine Rules

This document serves as the absolute source of truth for the intricate mechanics, Flexbox rules, and native constraints that power the YCS Workspace Engine. If you are touching the layout, creating a new subwindow, or modifying the window behavior, **you must read and adhere to these principles.** Failure to do so will result in overlapping tiles, infinite flexbox expanding, recursive resizing bugs, and layout chaos.

## 1. The N-Ary Flat Tree Topology
Previously, dropping a new tile into the workspace nested them recursively (e.g., `[A, [B, C]]`). This caused a "ratio drift" bug where dragging the divider between A and B would resize the *entire container* of `[B, C]`, throwing off the ratios of completely unrelated tiles.
**The Rule:** The `splitNode` logic now intercepts drops matching the parent's direction and flattens them into an N-ary array: `[A, B, C]`. 
**The Benefit:** Resizing the divider between A and B *strictly* only alters the flex-grow values of A and B. Tile C remains completely decoupled and perfectly locked in place without moving a single pixel.

## 2. Native Electron Window Constraints (The 200x150 Floor)
You cannot rely purely on CSS to prevent the UI from collapsing. 
**The Implementation:**
- A recursive layout parser (`getTreeMinSize` in `App.jsx`) continuously calculates the *exact* mathematical minimum width and height required to render the current workspace tree without collapsing any tiles below their `200x150` safe zones.
- This accounts for all active sidebars, titlebars, and dynamically mapped `gap` sizes.
- The React renderer dispatches these requirements via IPC (`window.electronAPI.setMinimumSize(totalMinWidth, totalMinHeight)`).
**The Result:** The native OS window manager (Windows/macOS) is instantly locked. The user physically cannot squish the application window past the safe boundaries.

## 3. Subwindow Flexbox Traps & Min-Content Bubbling
This is the most critical and sneaky layout issue we resolved. By default, flex items have `min-width: auto`, meaning they stubbornly refuse to shrink below the mathematical sum of their children's minimum widths. 
If a subwindow (like `PreferencesPage`) requires `340px` for an internal sidebar and paddings, that requirement will "bubble up" all the way to the top-level workspace container, forcing the tile to expand and push neighboring tiles away!

**The Golden Rules for Subwindows:**
1. **Burst the Bubble:** Apply `min-width: 0` and `min-height: 0` to all internal flex containers and root wrappers of your subwindow components to explicitly stop them from dictating the minimum size of the tile.
2. **Explicit Tile Enforcement:** In `Workspace.css`, `.workspace-leaf` explicitly possesses `min-width: 200px` and `min-height: 150px`, while the outer `.workspace-split` possesses `min-width: 0; min-height: 0;`. 
   * *Why?* Explicitly setting the min-width on `.workspace-leaf` overrides the default `auto` behavior. Flexbox ignores any bubbling sizes from the child component, cleanly stops exactly at `200px`, and allows the overflowing content to properly squish without overlapping adjacent tiles.

## 4. Internal Component Squishing & Clipping
When a tile is successfully squished down to `200px`, the internal content *must* gracefully squish out of view rather than breaking.
**The Rules:**
1. **No Wrapping:** Apply `white-space: nowrap` and `overflow-x: auto` to any dynamic content areas (like `.preferences-main`). Text must rigidly stay on a single line and trigger horizontal scrollbars rather than aggressively line-breaking into vertical towers.
2. **Dynamic Drag Limits:** Any internal resizable columns (e.g., sidebars inside subwindows) MUST be capped with dynamic CSS limits like `maxWidth: calc(100% - 50px)`. This mathematically guarantees that no matter how small the user shrinks the tile, or how aggressively they drag the column, the drag handle (resizer) is never pushed entirely off-screen and trapped inside the clipping mask.

## 5. Global Resizer Clamping
Global draggable UI elements (like the main application's Left Tab Column) must respect the workspace limits. If a global sidebar is dragged blindly, it can squeeze the workspace so much that the native OS window is forced to violently expand outwards to maintain the 200px tile minimums.
**The Rule:** The `resize` algorithm for global sidebars dynamically computes a `maxWidth` restriction based on the mathematical bounds of the workspace:
`maxWidth = window.innerWidth - (wsSize.width + gap)`
**The Benefit:** When dragging the main app's sidebar, it will gracefully squish the right workspace down until the tiles reach their exact `200x150` limits. At that exact millisecond, the mouse drag mathematically locks up and refuses to drag wider, perfectly matching the internal tile divider behaviors.

## 6. Standardized Subwindow Components
If you are building a complex subwindow (like Preferences), you MUST follow this standardized DOM structure:

**A. Left-Bar / Right-Content Layouts**
If the subwindow uses a left sidebar navigation to switch content on the right:
1. Wrap them in a shared flex container (e.g., .subwindow-content) with display: flex; flex-grow: 1; overflow: hidden; min-width: 0; min-height: 0;.
2. The left sidebar must have lex-shrink: 0 so it doesn't arbitrarily collapse, paired with the maxWidth: calc(100% - 50px) safety clamp mentioned above.
3. The right main area must have lex-grow: 1; min-width: 0; overflow: auto; white-space: nowrap; so it flawlessly yields to scrollbars.

**B. Persistent Footers**
If the subwindow requires a bottom footer (e.g., for 'Save', 'Apply', or 'Close' buttons):
1. The footer must be a direct child of the root flex-column container (placed *after* the .subwindow-content wrapper).
2. It MUST have lex-shrink: 0 applied to it. This guarantees that no matter how intensely the workspace shrinks vertically, the footer will never be squished out of existence by the main content area.
3. Use justify-content: flex-end; for standard right-aligned button placement, and include a subtle top border (e.g., order-top: 1px solid var(--ycs-foreground)) to separate it from scrolling content.
