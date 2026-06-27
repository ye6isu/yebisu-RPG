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
1. **No Wrapping:** Apply `white-space: nowrap` to dynamic content areas and inline input groups (e.g., rows of dropdowns/inputs like in `Tab 1`). Elements must rigidly stay on a single line and must never aggressively line-break into vertical towers.
2. **Bi-Directional Scrollbars Are Expected:** It is perfectly acceptable (and intended) for squished tiles to spawn both horizontal and vertical scrollbars (`overflow: auto`) when all elements are no longer visible. The tile should act like a viewport into the content, rather than forcing the content to reorganize itself uncomfortably.
3. **Proportional Scaling (Canvas/3D):** For specialized visual components like a 3D Preview or a Timeline that MUST remain fully in frame without cropping, do not use scrollbars. Instead, use proportional scaling (e.g., `width: 100%; height: 100%`, canvas resize observers, or `object-fit`) so the content dynamically squishes and scales to fit the tile bounds perfectly.
4. **Dynamic Drag Limits:** Any internal resizable columns (e.g., sidebars inside subwindows) MUST be capped with dynamic CSS limits like `maxWidth: calc(100% - 50px)`. This mathematically guarantees that no matter how small the user shrinks the tile, or how aggressively they drag the column, the drag handle (resizer) is never pushed entirely off-screen and trapped inside the clipping mask.

## 5. Global Resizer Clamping
Global draggable UI elements (like the main application's Left Tab Column) must respect the workspace limits. If a global sidebar is dragged blindly, it can squeeze the workspace so much that the native OS window is forced to violently expand outwards to maintain the 200px tile minimums.
**The Rule:** The `resize` algorithm for global sidebars dynamically computes a `maxWidth` restriction based on the mathematical bounds of the workspace:
`maxWidth = window.innerWidth - (wsSize.width + gap)`
**The Benefit:** When dragging the main app's sidebar, it will gracefully squish the right workspace down until the tiles reach their exact `200x150` limits. At that exact millisecond, the mouse drag mathematically locks up and refuses to drag wider, perfectly matching the internal tile divider behaviors.

## 5.5. Dynamic Split Rebalancing (`rebalanceSizes`)
When child tiles are opened or closed programmatically (via `ycs-toggle-child` or `handleCloseTab`), the tree is passed through `rebalanceSizes(node, parentPx)` before being committed to state.

**Why it exists:** A narrow column (e.g., a palette at 20% width) may contain a vertical split. If a child tile is opened horizontally inside that column (e.g., `[texture][child]`), the column's min-width jumps from 200px to 400px+gap. Without rebalancing, the children overflow and overlap adjacent tiles.

**How it works:**
1. Receives the **actual pixel width** of the workspace container (from a `ref` on `.workspace-container`), not a worst-case estimate.
2. Recursively walks the tree. For each split, computes the minimum size-units each child needs at the current container width: `minSizeUnits = (childMinPx / availablePx) * totalSize`.
3. If a child's current size already ≥ its `minSizeUnits` → **no-op** (the column already fits).
4. If a child is under-sized, bumps it to exactly `minSizeUnits` (one extra min-width, not more). The deficit is taken proportionally from siblings that have surplus above their own minimums.

**Key constraints for future work:**
- **Conservative expansion only**: never grow a column beyond what its contents need. A palette gaining one child tile grows by exactly one tile's min-width worth at the current window size.
- **No-op at large window sizes**: if the window is wide enough that all children fit at their current proportions, rebalancing does nothing. This prevents unwanted layout shifts when the user has manually resized columns.
- **Symmetric shrinkage on close**: when a child tile is closed and the nested split collapses, the child's min-px drops, so rebalancing naturally allows the column to shrink back. The space reclamation system (`handleCloseTab`) adds the closed tile's size to its nearest sibling, and rebalancing then confirms whether the parent column can shrink.
- **Custom initial proportions**: the `ycs-replace-and-split` event accepts an optional `splitSize` parameter (0–100) to set the new tile's initial share (e.g., `splitSize: 20` for a 20/80 palette/editor split).

## 6. Standardized Subwindow Components
If you are building a complex subwindow (like Preferences), you MUST follow this standardized DOM structure:

**A. Left-Bar / Right-Content Layouts**
If the subwindow uses a left sidebar navigation to switch content on the right:
1. Wrap them in a shared flex container (e.g., .subwindow-content) with display: flex; flex-grow: 1; overflow: hidden; min-width: 0; min-height: 0;.
2. The left sidebar must have flex-shrink: 0 so it doesn't arbitrarily collapse, paired with the maxWidth: calc(100% - 50px) safety clamp mentioned above.
3. The right main area must have flex-grow: 1; min-width: 0; overflow: auto; white-space: nowrap; so it flawlessly yields to scrollbars.

**B. Persistent Footers**
If the subwindow requires a bottom footer (e.g., for 'Save', 'Apply', or 'Close' buttons):
1. The footer must be a direct child of the root flex-column container (placed *after* the .subwindow-content wrapper).
2. It MUST have `flex-shrink: 0` applied to it. This guarantees that no matter how intensely the workspace shrinks vertically, the footer will never be squished out of existence by the main content area.
3. Use `justify-content: flex-end;` for standard right-aligned button placement, and include a subtle top border (e.g.,  `border-top: 1px solid var(--ycs-foreground)`) to separate it from scrolling content.
4. **Tile Closing Behavior:** Action buttons like 'Cancel' or 'OK' must trigger the `onClose` prop (passed automatically to registered components) to visually close and clear the tile when the interaction is finished.

## 7. Component Registry & The Absolute Flow Trick
To avoid a massive, unscalable ternary operator in `Workspace.jsx`, we enforce a strict **Component Registry** decoupling, combined with the **Absolute Flow Trick**.

1. **The Registry (`COMPONENT_REGISTRY`)**: All available subwindows (like `PreferencesPage`, `Timeline`, `3D Preview`) are mapped in a global object at the top of `Workspace.jsx`. When the workspace encounters a `tabId`, it dynamically invokes the component.
2. **The Absolute Flow Trick (CRITICAL)**: Any complex subwindow containing internal UI elements (like inputs, buttons, sidebars) will inherently demand more than `200px` of intrinsic space. Even if wrapped in `min-width: 0`, flexbox limits will mathematically favor its intrinsic width and break proportional squishing. 
   - **The Rule:** You **MUST** wrap the entire root render of your registered component in a `position: absolute` div:
     ```jsx
     <div style={{ position: 'relative', width: '100%', height: '100%' }}>
       <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
         {/* Your complex timeline, preview, or preference UI goes here */}
       </div>
     </div>
     ```
   - **The Benefit:** Because the absolute container is removed from the normal HTML flow, the component perfectly reports an intrinsic minimum width of `0px` to the tile engine. This guarantees that your complex Timeline or Node Editor will symmetrically and flawlessly squish exactly like an empty text string, smoothly yielding to scrollbars or clipping bounds without locking up the layout!
