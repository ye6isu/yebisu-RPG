# Yebisu Creator Studio (YCS): Subwindow Component Guide

When creating a new subwindow (like a new Inspector, Preferences, Timeline, or 3D Preview) to be docked into the workspace tile engine, you MUST follow this guide to ensure it gracefully squishes, scales, and closes according to the engine's strict rules.

## 1. Registering the Subwindow
Every new subwindow must be registered in the workspace engine so it can be dynamically loaded and spawned.
1. Open `src/components/Workspace/Workspace.jsx`.
2. Import your new component at the top.
3. Add it to the `COMPONENT_REGISTRY` object with a unique string key (this key is used by the layout engine and the drag-and-drop system):
   ```jsx
   export const COMPONENT_REGISTRY = {
     'Preferences': PreferencesPageNew,
     'My New Window': MyNewWindowComponent
   };
   ```

## 2. The Absolute Flow Trick (CRITICAL)
Your component will be rendered inside a rigid flexbox tile wrapper. If your component is complex (contains inputs, sidebars, long text), it will inherently demand more intrinsic space than the `200x150` safe zone, causing the entire layout to break and overflow.

**Rule:** You **MUST** wrap the entire root render of your component in an absolutely positioned `div` to isolate it from the layout flow. This guarantees your complex component reports `0px` of intrinsic size to the tile engine.

```jsx
export default function MyNewWindowComponent({ isTile = false, onClose }) {
  return (
    // Outer Relative Wrapper
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      
      // Inner Absolute Wrapper (The Absolute Flow Trick)
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--ycs-bg)' }}>
        
        {/* Your content goes here! */}

      </div>
    </div>
  );
}
```

## 3. Standard Layout Patterns

### A. Generic Content & Inputs (The Viewport Pattern)
If your subwindow contains rows of inputs or generic data (like the Inspector):
- Apply `overflow: auto` to your inner absolute wrapper or main content div. 
- Apply `white-space: nowrap` to any inline input groups.
- **Why?** The tile will act as a viewport. When squished, elements will not line-break or wrap; instead, the tile will simply spawn horizontal and vertical scrollbars.

### B. Sidebars & Main Content Areas
If your subwindow has an internal layout with a left sidebar (like Preferences):
1. Give the left sidebar `flex-shrink: 0`.
2. Give the right content area `flex-grow: 1; min-width: 0; overflow: auto;`.
3. Add a dynamic drag limit to your sidebar so the user can't resize it past the tile's minimum bounds: `maxWidth: calc(100% - 50px)`.

### C. Visual Canvas (Timelines / 3D Previews)
If your subwindow displays a Timeline or 3D Preview:
- **Do not use scrollbars.**
- Use proportional scaling (`width: 100%; height: 100%;` or `object-fit: contain`).
- Ensure the canvas automatically resizes to its parent container dynamically. The Absolute Flow Trick provides a perfectly constrained box for your canvas to track.

## 4. Tile Closing & Footers
If your subwindow has persistent action buttons (e.g., OK, Cancel, Apply):
1. Wrap them in a footer div with `flex-shrink: 0`, placed at the bottom of your flex column.
2. Use `justify-content: flex-end` to align the buttons to the right.
3. If the user completes an action that should visually "close" the subwindow, you must trigger the `onClose()` prop provided by the registry.

```jsx
  const handleClose = () => {
    // If it's a native OS window, close via IPC
    if (!isTile) {
      window.electronAPI?.controlWindow('close');
    } 
    // If it's docked in a tile, clear the tile via the engine prop
    else if (onClose) {
      onClose();
    }
  };

  return (
    // ... inside the absolute wrapper ...
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px', flexShrink: 0 }}>
      <button onClick={handleClose}>Cancel</button>
    </div>
  );
```

By following these rules, your new subwindow will seamlessly integrate with the drag-and-drop workspace, perfectly obey proportional resizing mathematics, cleanly yield to squishing limits, and pop out into native OS windows without breaking!
