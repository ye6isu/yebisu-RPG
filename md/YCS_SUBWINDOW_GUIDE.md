# YCS Subwindow & Tile Architecture Guide

## Overview
This guide dictates the architectural standard for creating any new UI component (like Preferences, Timelines, Previewers, etc.) inside the YCS App. 

All new subwindows MUST follow the **Write Once, Run Anywhere** philosophy. You do not need to create duplicate files (e.g., `PreferencesPage` vs `PreferencesPageNew`). A single component must be designed to seamlessly adapt to both being an independent Popout Window AND a docked Workspace Tile.

---

## 1. The Component Registry
Whenever you create a new subwindow component, it must be registered in the `COMPONENT_REGISTRY` located inside `Workspace.jsx`.

```jsx
// src/components/Workspace/Workspace.jsx
import MyNewComponent from '../MyNewComponent';

export const COMPONENT_REGISTRY = {
  'Preferences': PreferencesPageNew,
  'MyNewTab': MyNewComponent,
};
```
By adding it here, the YCS App dynamically knows how to instantiate it whether the user clicks a button to pop it out, or drags it into a workspace tile.

---

## 2. Adaptive Layouts & Props
Your component will automatically receive the following props:
- `isTile` (boolean): True if rendering inside the workspace, False if in a native popout window.
- `onClose` (function): A standardized callback you can call to close the component (which safely handles closing the tab or the OS window contextually).
- `nodeId` (string): The UUID of the workspace tile it lives in (if `isTile` is true).
- `tree` (object): The full workspace state tree (if `isTile` is true).

```jsx
export default function MyNewComponent({ isTile, onClose, nodeId, tree }) {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      // Always use transparent background so it inherits from 
      // the tile or the native OS Acrylic blur!
      backgroundColor: 'transparent',
      color: 'var(--ycs-text)'
    }}>
      {/* Component contents */}
    </div>
  );
}
```
**CRITICAL:** Do NOT render custom drag titlebars in your components. The parent `PopoutWindow` globally provides the native drag title bar when `isTile` is false.

---

## 3. The "Absolute Flow Trick" (Squish & Scroll)
When a tile is compressed horizontally or vertically (by resizing the main window or dragging splitters), flexbox layouts naturally try to "eat" space from neighboring tabs or awkwardly wrap elements.

**The Rule:** To prevent a component from eating space or wrapping its elements (like a top-bar of tabs), you must wrap the inner scrollable region in an absolute container.

```jsx
{/* Outer container */}
<div style={{ flexGrow: 1, position: 'relative', minHeight: 0, minWidth: 0 }}>
  {/* The Absolute Flow Trick Container */}
  <div style={{
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex',
    overflow: 'auto' // Adds scrollbars natively without breaking flex boundaries
  }}>
    {/* Inner content (Sidebars, lists, etc) */}
  </div>
</div>
```
- **Tabs/Lists:** For top tab bars or lists, never wrap them (`flexWrap: 'nowrap'`). If they run out of space, they should simply disappear behind the edge, and the absolute container will provide a horizontal/vertical scrollbar.
- **Sidebars:** If your window uses a left sidebar (like Preferences), the sidebar should maintain its width. When the tile shrinks, the right content area should just gain a scrollbar without shrinking the sidebar completely or destroying the flex layout.

---

## 4. Footer Behavior
If your subwindow requires a footer (e.g., `[OK]`, `[Cancel]`, `[Apply]`), it must be firmly attached to the bottom and right-aligned.

```jsx
{/* Footer Area */}
<div style={{
  padding: '8px',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  borderTop: '1px solid var(--ycs-foreground)'
}}>
  <button onClick={() => { handleApply(); onClose(); }}>OK</button>
  <button onClick={onClose}>Cancel</button>
</div>
```
**Closing logic:** 
You should almost always wire your close/cancel buttons directly to the `onClose` prop passed into your component. The `WorkspaceLeaf` (or the native window wrapper) handles the actual destruction of the UI automatically.

---

## 5. Dragging & Docking Engine Rules
The system natively handles drag-and-drop based on the "Chrome-style" philosophy:
1. **Native OS Drag:** Dragging the titlebar of a popout window natively moves the OS window instantly and flawlessly.
2. **Docking Drag:** If the user holds `Ctrl` and drags the titlebar, the window physically stays in place, and a "ghost tab" is ripped out. Dragging this ghost tab over the main workspace highlights the tiles, and dropping it instantly docks the component and vaporizes the popout window.

---

## 6. Field Alignment
When laying out simple inline fields (like text inputs and dropdowns side-by-side), ensure they gracefully handle the tile shrinking horizontally.
- Rely on native flex box alignment (`justifyContent: 'flex-start'`) to keep them cleanly left-aligned.
- Use `gap` (e.g., `gap: '10px'`) for consistent spacing between elements.

```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
  <input type="text" className="ycs-input inline" style={{ width: '120px' }} />
  <div style={{ width: '140px' }}><DropdownField /></div>
</div>
```
