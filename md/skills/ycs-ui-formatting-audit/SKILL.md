---
name: ycs-ui-formatting-audit
description: Audit and normalize Yebisu Creator Studio (YCS) React UI controls against the project's shared components, fixed-width field rules, titlebar landing/editor states, layout conventions, and styling masterlist. Use when creating a new YCS system, page, landing screen, editor, inspector, form section, or reusable control; when changing YCS JSX/CSS; or when reviewing inconsistent headers, titlebar actions, stretched fields, or one-off text, number, dropdown, combobox, tag, JSON-file, image-file, and other field selectors.
---

# YCS UI Formatting Audit

Apply this audit before and after changing a YCS interface. Treat `md/YCS_UI_Components_and_Styling.md` as the authoritative UI contract and prefer the shared components in `ycs/src/components/Field/Field.jsx` over local replacements.

## Audit workflow

1. Read `md/YCS_UI_Components_and_Styling.md` completely. If the task changes object creation, editing, saving, or deletion, also read the relevant sections of `md/YCS_V3_Injection_and_Lifecycle.md`.
2. Inspect only the YCS page/component and its directly related CSS or shared components. Do not recursively search the whole repository unless the user requests a global audit.
3. Identify every page state in scope: landing/list, new editor, saved-object editor, nested editor, or subwindow. Record which titlebar actions each state registers.
4. Inventory every visible control in scope and classify it as text, number, dropdown/combobox, JSON selector, image/file selector, tag selector, checkbox, slider, button, color control, or purpose-built canvas/media surface.
5. Compare each titlebar state and control against the rules below. Check the rendered outer container, not just its class name.
6. When implementation is requested, replace local one-off controls with shared components where practical and remove width/flex overrides that defeat the fixed size. Preserve behavior, accessibility, truncation, validation, and Tauri drag/drop handling.
7. Reinspect the changed JSX and CSS for competing rules. Run `npm run build` from `ycs/` when YCS code changed. Use `./gradlew build` only when Java or mod-side files also changed, following the project build rules.
8. Report which titlebar/page states and controls conform, which were corrected, and any intentional exception. Never silently introduce an exception.

## Titlebar state contract

Use `useTitlebarActions` from `TitlebarActionsContext.jsx` as the single owner of page-level actions. Do not duplicate these actions in a local page header.

### Landing/list state

- Register the page's search value and filter behavior so the shared centered 180px titlebar search field operates on that page.
- Register the page's create/import callback so the shared Add icon starts a new object or the page's equivalent primary creation flow.
- Keep Search/Add visible while the page is active. An empty list or no-match state stays blank instead of rendering instructions that duplicate the Add affordance.
- Do not render a local title, search box, New/Add button, or page-level toolbar that repeats the titlebar controls.

### Editor state

- Replace Search/Add with centered editor actions registered through the same context.
- Order the actions exactly as Save, Cancel, Delete from left to right.
- Use `.menu-button.titlebar-icon-button` plus the appropriate action class. Give every icon button both `title` and `aria-label`.
- Give Delete the danger hover treatment. Keep Delete visible but disabled for a new unsaved object; enable it for a saved object.
- Remove duplicated local editor headers and local Save/Cancel/Delete or Remove button rows. Status text may remain in the editor body only when it does not recreate a page toolbar.
- Ensure nested editors restore the correct parent editor actions when they close rather than falling back to landing Search/Add prematurely.

### Audit signals

Flag pages that never call `useTitlebarActions`, register only one state, leave landing Search/Add active while editing, or render local `<h1>`/`<h2>` headers beside Save, Cancel, Delete, Remove, New, Add, or search controls. Also flag action arrays whose visual order differs from Save, Cancel, Delete or whose Delete action disappears for unsaved objects instead of becoming disabled.

Guard against the historical `TagsLanding.jsx` regression: its landing component once registered Search/Add continuously while `TagEditor` rendered a separate Back/title/Save header. Keep the landing registration disabled during editing and register Save, Cancel, Delete through the titlebar, with Delete disabled for a new tag.

## Fixed control contract

Use these defaults in ordinary `FieldRow` form layouts:

- String/text field: `StringField` or `.ycs-string-input`, fixed at `180px`.
- Number field: `NumberInput` or `.ycs-string-input[type="number"]` / `[inputmode="numeric"]`, fixed at `90px`.
- Dropdown and combobox: `StandardDropdownField`, `DropdownField`, or `FontComboField`, fixed at `180px` when closed. Their opened options popup is fixed at `360px`; option rows stay on one line and scroll horizontally when their content is wider than the popup.
- Dropdown options reserve thumbnail space only when that specific option provides an image or thumbnail; text-only options must not render an empty spacer.
- Native `select`: fixed at `180px`; prefer a shared custom dropdown when it fits the interaction.
- JSON-backed file selector: fixed at `180px`, with long filenames truncated inside the control.
- Inline image/file selector: fixed at `180px`, with long filenames truncated inside the control. A large, purpose-built media import surface or canvas drop zone may use a documented custom size.
- Inline tag selector: fixed at `180px`, clipping or scrolling overflowing chips within the control.
- Vector field: one fixed `90px` number control per axis.

Use `FieldRow` for standard label/control alignment. Use the shared button, icon-button, slider, dropdown popup, titlebar action, scrollbar, and empty-state patterns from the styling masterlist rather than recreating their CSS locally.

## Width audit

Do not accept a control as conforming merely because it has `.ycs-string-input`. Inspect inline styles, wrapper styles, and page CSS for overrides including:

- `flex: 1` or `flex-grow: 1` on the field itself;
- `width: 100%` without a fixed-width outer wrapper;
- `min-width`, `max-width`, or `flex-basis` that conflicts with 180px/90px;
- grid columns such as `1fr` that stretch the control;
- selectors with greater specificity or `!important` that defeat `Field.css`;
- bespoke controls whose visible outer container has no fixed width;
- filenames or selected values that expand the control instead of using ellipsis, clipping, or an internal scroll treatment.

An inner element may use `width: 100%` when its outer component is explicitly fixed, such as the 180px wrappers in `StandardDropdownField` and `DropdownField`.

## Known regression example

Guard against the historical `TextureManager.jsx` failure this audit was created to catch: `ImageBarDropZone` used `.ycs-string-input` but also applied `flex: 1`, so Texture, Mask, and Emissive controls in the Images section expanded beyond the normal fixed field width.

The conforming pattern is a 180px outer drop zone (`width: 180px; flex: 0 0 180px`) with the filename span truncating through `overflow: hidden`, `text-overflow: ellipsis`, and `white-space: nowrap`. Keep browse, drag/drop, and clear-button behavior intact.

## Exceptions and documentation

Allow a different width only when the control is intrinsically canvas-oriented, timeline-specific, compact by design, or intentionally fills a constrained parent. State the reason in the implementation or audit result and keep the exception local.

If a new reusable component or a new general sizing rule is introduced, update `md/YCS_UI_Components_and_Styling.md` in the appropriate existing category. Obey that document's AI meta-instruction: integrate the rule harmoniously rather than appending an isolated note.
