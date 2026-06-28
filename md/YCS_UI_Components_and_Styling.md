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
- **Style**: Solid dark background (`--ycs-bg`), thin border, smooth focus ring.

### Buttons
- **Standard Button**: 
  - **Class**: `.ycs-button`
  - **Usage**: Default clickable action button with padding.
- **Icon Button (Inline)**: 
  - **Class**: `.ycs-button.icon`
  - **Usage**: Compact square button specifically sized for SVG icons (28x28px). Ideal for placing adjacent to text inputs in a single row without breaking the layout height.
- **Inline Row Layout**: 
  - **Class**: `.ycs-inline-group` or standard flex wrappers (`display: flex`, `gap: 4px`, `alignItems: center`)
  - **Usage**: To group standard `.ycs-string-input` elements alongside `.ycs-button.icon` components seamlessly.

### Comboboxes & Dropdowns (Custom)
Custom comboboxes and dropdowns avoid the native OS `<select>` styling to fully integrate with the YCS color scheme, supporting both readonly selection and typed entry.
- **Components**: `DropdownField`, `StandardDropdownField`, `FontComboField` (found in `Field.jsx`).
- **Inner Classes**:
  - `.dropdown`: The floating popup container for options.
  - `.dropdown-item`: Individual clickable options inside the dropdown.
  - `.dropdown-separator`: 1px divider line between grouped items.

### Sliders (Range Inputs)
- **Class**: `.ycs-slider`
- **Usage**: Used on standard `<input type="range">` elements. Requires inline style for the `background` property using a `linear-gradient` to dynamically color the filled portion based on the current value.
- **Style**:
  - **Thumb**: Solid circle using `--ycs-highlight`.
  - **Filled Track**: Uses `--ycs-highlight` via inline linear-gradient.
  - **Unfilled Track**: Uses `--ycs-foreground` via inline linear-gradient.

## Layout Components

### Field Rows
- **Component**: `<FieldRow label="My Label"> {children} </FieldRow>`
- **Classes**:
  - `.ycs-field-row`: Flex container that horizontally aligns a label and a control.
  - `.ycs-field-label`: The text label for the field.
  - `.ycs-field-control`: The wrapper for the actual input/dropdown control.

## Global Elements

### Scrollbars
YCS uses custom Webkit scrollbar CSS (located in `App.css`) to match the app's theme instead of defaulting to the glaring white/grey OS scrollbars.
- **Track**: `--ycs-bg`
- **Thumb**: `--ycs-foreground` (rounded). Note: Hover states intentionally retain the exact same color to maintain UI consistency.

### Titlebar
The application uses a custom, frameless titlebar (`Titlebar.jsx`). 
- Features custom SVG window controls (Minimize, Maximize, Close).
- Handles custom routing and layout for Subwindows (like Preferences).
- Features the `data-tauri-drag-region` integrated with `startDragging()` API to enforce OS-level window dragging.
