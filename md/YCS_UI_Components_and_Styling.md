# Yebisu Creator Studio (YCS) UI Masterlist

> **AI META-INSTRUCTION FOR UPDATING THIS DOCUMENT:** 
> When adding new rules or guidelines to this file:
> 1. **Categorize:** Always place new rules into an appropriate existing category, or create a clearly defined new category if one doesn't exist. Prevent this file from becoming a mixed, disorganized mess.
> 2. **Integrate Harmoniously:** **DO NOT** simply append a new line to the bottom of lists. Carefully read the existing content and integrate your new rule. Rephrase or restructure sections if necessary to keep the document clean, highly readable, and logically organized.

This document serves as the masterlist for the standard UI components, classes, and styles used throughout the YCS application.

## CSS Variables (Colors & Theming)
YCS uses the following CSS variables for theming, which map directly to user preferences:
- `--ycs-bg`: The main background color (usually dark/black).
- `--ycs-foreground`: Secondary background elements (panels, borders, standard control backgrounds).
- `--ycs-accent`: The primary accent color (used for titlebars, selected states).
- `--ycs-highlight`: Lighter variant for hover states.
- `--ycs-text`: Primary text color.
- `--ycs-font`: Default application font.
- `--ycs-radius`: Standard border-radius (default: 4px).

## Form Fields & Controls

### Textboxes (String / Number Inputs)
- **Class**: `.ycs-string-input`
- **Usage**: Used on standard `<input type="text">` or `<input type="number">` to represent typed fields.
- **Default width**: String fields are fixed at `180px`; number fields are fixed at half that width (`90px`). Vector properties keep one fixed `90px` number field per axis rather than stretching with their panel. Specialized compact controls such as color values, timeline time fields, or controls intentionally filling a constrained parent may override these widths explicitly.
- **Style**: Solid dark background (`--ycs-bg`), thin border, smooth focus ring.

### Buttons
- **Standard Button**: 
  - **Class**: `.ycs-button`
  - **Usage**: Default clickable action button with padding.
- **Icon Button (Inline)**: 
  - **Class**: `.ycs-button.icon`
  - **Usage**: Compact square button specifically sized for SVG icons (28x28px). Ideal for placing adjacent to text inputs in a single row without breaking the layout height.
- **Icon Button (Titlebar)**:
  - **Classes**: `.menu-button.titlebar-icon-button`, plus an action-specific positioning class such as `.titlebar-add-button`.
  - **Usage**: Use for icon-only actions placed in the main titlebar. The shared component is 24x24px, centers its SVG with no inherited menu padding, and retains the File menu's transparent idle and hover styling.
  - **Icon spacing**: The standard titlebar glyph is 12x12px, producing a 6px gap on every side. Keep the button dimensions fixed and adjust only the SVG dimensions when a different visual weight is required.
  - **Accessibility**: Always provide both `title` and `aria-label` attributes describing the action.
- **Inline Row Layout**: 
  - **Class**: `.ycs-inline-group` or standard flex wrappers (`display: flex`, `gap: 4px`, `alignItems: center`)
  - **Usage**: To group standard `.ycs-string-input` elements alongside `.ycs-button.icon` components seamlessly.

### Comboboxes & Dropdowns (Custom)
Custom comboboxes and dropdowns avoid the native OS `<select>` styling to fully integrate with the YCS color scheme, supporting both readonly selection and typed entry.
- **Components**: `DropdownField`, `StandardDropdownField`, `FontComboField` (found in `Field.jsx`).
- **Default width**: Custom dropdowns, font selectors, and native `<select>` controls use a fixed `180px` width and do not grow or shrink with their parent row.
- **Options popup**: The opened options panel is fixed at `360px`, twice the closed control width. Option labels remain on one line; labels wider than the panel produce a horizontal scrollbar instead of wrapping.
- **Optional thumbnails**: Render thumbnail spacing only for options that actually provide an image or thumbnail. Text-only options start at the popup's normal left padding without an empty image placeholder.
- **Inner Classes**:
  - `.dropdown`: The floating popup container for options.
  - `.ycs-field-dropdown`: The shared 360px, horizontally scrollable field-options popup variant.
  - `.dropdown-item`: Individual clickable options inside the dropdown.
  - `.dropdown-separator`: 1px divider line between grouped items.

### JSON File Selectors
- **Default width**: File-drop selectors for JSON-backed fields, including entity/item model and animation JSON files, use a fixed `180px` width and truncate long filenames within that width.
- **Exception**: Large media drop zones and canvas-oriented import surfaces may retain a purpose-built size.

### Tag Selectors
- **Default width**: Inline tag-picker controls use a fixed `180px` width and clip overflowing tag chips within the control.

### Sliders (Range Inputs)
- **Class**: `.ycs-slider`
- **Usage**: Used on standard `<input type="range">` elements. Requires inline style for the `background` property using a `linear-gradient` to dynamically color the filled portion based on the current value.
- **Style**:
  - **Thumb**: Solid circle using `--ycs-highlight`.
  - **Filled Track**: Uses `--ycs-highlight` via inline linear-gradient.
  - **Unfilled Track**: Uses `--ycs-foreground` via inline linear-gradient.

## Layout Components

### Sidebar Navigation State
The main sidebar persists both the selected page (`ycs-active-tab`) and each parent group's expanded/collapsed state in local storage. When the parent containing the selected page is collapsed, apply `.active` to that parent so the user's current location remains visible even though its child row is hidden.
- Parent and child tabs use matching left/right padding at their respective hierarchy depth. VFX object-tab lists likewise keep equal outer gutters on both sides.
- The sidebar's `6px` divider is also its resize rail. While expanded, overlap the divider into the sidebar's existing right gutter so the divider does not make the right-side spacing appear wider than the left; the collapsed divider remains in normal flow. Center the borderless collapse control inside that rail at the rail's full width and do not give it a separate button outline or footprint.
- Persist the collapsed state under `ycs-sidebar-collapsed`. While collapsed, hide the sidebar and expose the same control as a narrow `16px` reopening notch. Keep the workspace's `6px` right and bottom accent borders so its outer padding remains visually balanced with the collapsed left rail.

### Sidebar Run Actions
Two `.ycs-button.icon` controls sit in a fixed bottom bar below the scrollable navigation: Run Client and Run Data. They use the same transparent, text-colored idle state and highlight-colored hover/active state as `.ycs-tab`. Each starts its matching Gradle wrapper task in a separate console, changes its icon from Play to Stop while active, and closes the current task process tree when clicked again. Tooltips and accessible labels expose the full action names.

### Landing Page Empty States
When a landing page has no saved objects or its search has no matches, leave the list area blank. Do not render instructional placeholder copy such as `No <object> yet. Click + to add one.`; the shared titlebar Add action already communicates how to create an object.

### Field Rows
- **Component**: `<FieldRow label="My Label"> {children} </FieldRow>`
- **Classes**:
  - `.ycs-field-row`: Flex container that horizontally aligns a label and a control.
  - `.ycs-field-label`: The text label for the field.
  - `.ycs-field-control`: The wrapper for the actual input/dropdown control.

## Global Elements

### Scrollbars
YCS uses two scrollbar implementations with the same visual language:
- **Overlay component**: Use `OverlayScrollArea.jsx` for editor panels, navigation lists, and any scroll region where a native scrollbar would consume layout space. It supports vertical and horizontal axes, hides the native scrollbar, and renders its 8px tracks over the content instead of beside or below it.
- **Native fallback**: Global Webkit scrollbar CSS in `App.css` remains available for legacy scroll regions that have not yet migrated.
- **Track**: `--ycs-bg` (Tile Workspace Color).
- **Thumb**: A rounded `--ycs-text` mix at 30% opacity, increasing to 50% on hover, with a minimum length of 24px.

### Titlebar
The application uses a custom, frameless titlebar (`Titlebar.jsx`). 
- Features custom SVG window controls (Minimize, Maximize, Close).
- Handles custom routing and layout for Subwindows (like Preferences).
- Features the `data-tauri-drag-region` integrated with `startDragging()` API to enforce OS-level window dragging.
- Landing pages register their search value, filter callback, and create/import action through `TitlebarActionsContext.jsx`. The centered 180px pill-shaped search field and adjacent File-style Add icon are the shared search/add controls; landing pages must not duplicate these controls in local page headers.
- Search/add controls remain visible throughout the main YCS window. The active page owns their behavior, including while one of its nested editors is open; during the brief absence of a registered page action, the controls remain visible but inert.
- Editors replace the centered search/Add pair with a centered group of `.titlebar-icon-button` actions registered through `TitlebarActionsContext.jsx`. Arrange editor-level actions as Save, Cancel, then Delete from left to right, remove the duplicated local editor header, and give Delete the red danger hover treatment. Keep Delete present but disabled when a newly created object has not been saved yet.
