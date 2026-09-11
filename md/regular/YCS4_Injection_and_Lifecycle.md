# YCS4 Injection and Object Lifecycle

This document defines the active YCS4 ownership model: authoring data, visual workspace containers, folders, generated mod artifacts, and reversible injection cleanup. It describes the current implementation and the contract new object types must follow.

## Current architecture

YCS4 is a Tauri 2 application with a vanilla JavaScript frontend under `YCS4/src/` and a Rust backend in `YCS4/src-tauri/src/lib.rs`. It currently targets NeoForge 1.21.1 and Java 21.

The important storage boundaries are:

| State | Location | Authority |
| --- | --- | --- |
| Complete saved object data | `ycs-data/<category>/<id>.json` | Source of truth for authored objects |
| Shared source assets | `ycs-data/textures/` and related category storage | Source assets referenced by objects |
| Generated Java/resources | `src/main/` | Derived mod output owned through `_injections` |
| Workspace arrangement | `localStorage` key `ycs4.workspace-layout` | Visual organization only |
| Open tabs, dialogs, search, selection | Runtime DOM state | Ephemeral UI state |

YCS4 must not confuse a visual workspace reference with the saved object it points to. Moving or reorganizing a container does not mutate its object JSON or generated mod output.

## Domain objects and visual containers

A domain object is durable authored content such as an Item or Texture. A visual container is the workspace representation used to find and open that object.

`addObjectContainer()` creates a `.workspace-object-shell` with:

- `data-object-type` for the visual/object type;
- `data-workspace-mode` for Home or Assets;
- `data-workspace-visual-id` for the individual visual reference;
- optional `data-workspace-reference-id` for the saved object's ID;
- a `.workspace-object-label`;
- either a normal `.object-container` button or a special `.folder-object` visual.

Normal Item and Texture containers can display a texture preview. A container without a reference ID is only an unsaved visual entry. A saved object's ID, not its label or visual ID, is its durable identity.

### Current object coverage

- Items have a V4 editor and backend save/delete lifecycle.
- Textures are stored as metadata plus image sidecars in `ycs-data/textures/` and can be referenced by Items.
- Folders are visual organization and are not domain objects.
- Data is a top-level workspace mode whose Variable, Attribute, Data Component, and Resources sections load their existing `ycs-data` categories into five-row stepped lists with shared overlay scrolling. Variable, Attribute, and Data Component rows are edited and saved automatically in place rather than opening tabs or exposing row-level Save buttons. Variable and Data Component Add controls reuse the Home Add dropdown dimensions and first select Number, Boolean, or Text; the selected type remains fixed and is represented by its group rather than repeated inside every row. Type groups retain the Number, Boolean, Text order, use the shared horizontal divider with a two-pixel gap on each side, and sort only within their group. Every section's Filter control opens the same four-option sort menu, and floating Add/Filter menus close on outside interaction. Name, display-name, and value fields use the shared Test-dialog textbox width. Name and Attribute display-name controls stay on the left while value controls align right. Boolean Variable and Data Component values use an exclusive True/False pressed-button pair; Attribute Sync to Client retains the shared checkbox. Attribute Add creates its single attribute row type directly, while Resource Add opens a blank Resource editor. Delete mode reserves action-button space only while active, so ordinary inline fields and Resource previews fill the available row otherwise. Save and delete use category-scoped backend commands that update the authoring JSON and owned Java-marker injection. Resource-managed entity variables and attributes remain owned and presented by their Resource rather than being duplicated in the Variable or Attribute lists. Resource rows include sampled HUD previews and open a YCS3-field-compatible preview editor with a shared texture combobox; the preview itself is the draggable zero-to-maximum amount control, and its in-session amount is shared with the corresponding Data-row preview. Resource HUD text remains white to match the runtime renderer. Editor action buttons use the Item editor's Delete, Cancel, Save order; transactional Resource persistence is still pending.
- Other V3 object creators are not automatically part of V4. Each must be ported through this lifecycle deliberately.

## Workspace hierarchy and folders

The workspace layout is a recursive version-1 structure stored under `ycs4.workspace-layout`:

```json
{
  "version": 1,
  "home": [],
  "assets": []
}
```

Each serialized entry contains `visualId`, `type`, `label`, and `mode`; saved references also contain `referenceId`. Folder entries additionally contain a recursive `children` array.

### Folder behavior

- A folder owns a detached child `.workspace-object-grid` supplied by `folder-page.js`.
- Opening a folder creates or activates a closable folder workspace tab backed by that grid.
- `workspaceObjectFolderParents` tracks the runtime parent relationship.
- Drag/drop and Cut/Paste can reorder entries or move them between roots and folders.
- `folderWouldCreateCycle()` rejects moving a folder into itself or one of its descendants.
- Search traverses the complete hierarchy. Nested matches are represented by temporary clones and resolve back to their canonical shells.
- A folder preview clones the first direct non-folder child container. It is presentation only and is excluded from hierarchy operations.
- Renaming a folder changes its visual label and open tab label; it does not rename any contained object.
- Deleting a folder removes only the folder. Its direct children are inserted into the folder's parent at the folder's former position, retaining order; nested folder subtrees remain intact.

Folders must remain non-owning. Deleting, renaming, or moving a folder must never delete or rename the saved objects it contains.

### Reconciliation with saved data

On startup YCS4 restores the visual hierarchy, then reconciles Item and Texture references against their `ycs-data` categories:

- duplicate visual references for one saved object ID are collapsed;
- a visual reference whose saved object no longer exists is removed;
- a saved Item with no visual reference is restored at the Home root;
- a saved Texture with no visual reference is restored at the Assets root;
- restored references load their display label and preview when possible;
- malformed optional display metadata does not make the reference unusable.

This repair pass reinforces that `ycs-data` is authoritative and `localStorage` is only navigation layout.

Every persisted workspace type must be registered in `savedWorkspaceLifecycles` with its `ycs-data` category, root mode, backend delete command, label/preview loaders, and optional editor cleanup. A shell with `data-workspace-reference-id` but no registered lifecycle is refused visual-only deletion. This makes persistence cleanup an explicit requirement when future V4 object types are added.

## Object JSON contract

Every generated object type uses one complete JSON object at `ycs-data/<category>/<id>.json`. Its editor-visible state and generated ownership manifest live together.

```json
{
  "id": "ruby_sword",
  "displayName": "Ruby Sword",
  "texture": "ruby",
  "_injections": []
}
```

Rules:

1. Load editor fields from the JSON rather than reconstructing them from generated Java or resources.
2. Preserve fields the current editor does not yet understand.
3. Treat the JSON ID as durable identity and validate rename collisions before cleanup.
4. Save complete current editor state together with the refreshed manifest.
5. Keep workspace placement out of the object JSON unless placement becomes a real domain property.

## Injection manifest

`_injections` records every derived change owned by an object.

| Type | Required fields | Cleanup behavior |
| --- | --- | --- |
| `java-marker` | `file`, `marker`, `content` | Remove the exact injected content |
| `json-key` | `file`, `key` | Delete the owned key |
| `created-file` | `file` | Delete the generated file if present |

Paths are relative to `src/main/` and pass through `safe_source_path()`, which rejects absolute paths and traversal components.

Cleanup walks the manifest in reverse. This preserves dependency order when later outputs depend on earlier registrations or files. Missing generated files/content are treated idempotently where safe; malformed authoring JSON is an error because ownership cannot be trusted.

## Save, edit, rename, and delete

### New object

1. Validate normalized ID, required references, values, and collisions.
2. Generate every Java/resource output.
3. Record each successful output in the new `_injections` manifest.
4. Save the complete authoring JSON.
5. Bind or create the visual container only after backend success.
6. Close the object editor tab after the successful save; failed saves keep it open with the error state intact.

Closing an Item tab with editor changes opens the canonical Warning dialog. Save delegates to the Item editor's normal save action and closes only after backend success. Cancel discards the editor state and closes the tab; X and Escape dismiss the warning without closing the tab. A saved Item ID owns at most one open editor panel; reopening its workspace object activates that existing tab, including while its initial data load is still pending.

### Existing object

1. Load the previous JSON using `lastSavedId`.
2. Determine which injections this V4 editor owns.
3. Remove those owned injections in reverse.
4. Preserve unsupported fields and still-active injections.
5. Generate the current outputs and append their manifest entries.
6. Save the refreshed complete JSON.
7. Update the canonical visual reference after backend success.

The current Item editor uses scoped ownership because V4 exposes fewer fields than V3. `is_basic_item_injection()` identifies the registration, language, creative-tab, base texture/model, and legacy frame artifacts the reduced editor can safely rebuild. Other manifest entries survive the save.

### ID rename

- Reject the rename if the destination JSON already exists.
- Remove old owned outputs before writing new-ID outputs.
- Delete the old authoring JSON only as part of the successful transition.
- The current reduced Item editor blocks a rename when unsupported injections remain, because it cannot safely rewrite their embedded old ID.
- Update `data-workspace-reference-id` and the visual label only after backend success.

### Delete

- A saved-object delete loads its JSON, removes the complete manifest in reverse, then deletes the JSON.
- The visual reference remains when backend cleanup fails.
- After successful Item deletion, YCS4 removes every visual reference with the same saved ID and closes the applicable editor tab.
- Texture deletion refuses while any non-Texture authoring JSON still references that Texture. The workspace opens the canonical Warning dialog with the Texture ID and a list of the objects using it. After successful cleanup, YCS4 removes every matching Texture reference.
- Right-click, Delete, Backspace, and editor Delete must converge on the same backend lifecycle for saved objects. No interaction may remove only the visual reference of a persisted object.
- Deleting an unsaved container removes only that visual container.
- Deleting a folder unwraps children and does not invoke object deletion.

## Current Item lifecycle

`save_basic_item` currently supports Generated and Handheld Items with:

- Item ID and display name;
- one shared PNG Texture;
- holding mode;
- stack size clamped to 1–99;
- optional project or vanilla creative tab.

The V4 Item editor exposes the durable V3 authoring fields for tags, multiple states, tool settings, combat, food, fuel, tooltip, recipes, and custom-class method selection. Tags, multiple states, tool settings, combat, food, fuel, tooltip, and recipes now generate runtime artifacts through the reversible manifest lifecycle. Tool Type and Tier use the bounded V3 option sets. The tag selector includes the complete V3 Vanilla and NeoForge catalog plus dynamically authored project tags; saving edits only this Item's membership in each shared tag JSON rather than overwriting other values. Tooltip uses a direct Edit row, generates translatable hover text and owned language keys, and empty tooltip text disables generation. Multiple States treats the main Appearance fields as State 1 and its dialog entries as State 2 onward; flat states generate copied textures/models and state selection uses vanilla `CUSTOM_MODEL_DATA`, while geo states additionally generate geo/display assets and register with the existing renderer. Imported model bytes are persisted in the Item authoring JSON so reopen, rename, and regeneration remain possible. Recipe uses direct Edit and owns a dedicated dialog. It stores an ordered recipe-entry array and supports every exposed type. Ingredient comboboxes reproduce the YCS3 item-and-tag catalog and the Recipe dialog-width floating list. Item Abilities remain hidden but preserved. Custom Class remains authoring-only, and Data Components remain deliberately excluded from the V4 save payload.

It generates and owns:

- the `ModItems.java` registration above `YCS_Mod_Items`;
- `item.yebisurpg.<id>` in `en_us.json`;
- optional creative-tab content registration;
- `textures/item/<id>.png`;
- `models/item/<id>.json` using the generated or handheld parent.
- one `data/yebisurpg/recipe/<id>_shaped_<n>.json` file per authored Shaped Crafting entry, including item or `#tag` ingredients and its yield.
- one `data/yebisurpg/recipe/<id>_shapeless_<n>.json` file per authored Shapeless Crafting entry; ingredient quantities expand into repeated recipe inputs and are limited to nine total slots.
- numbered Smelting, Blasting, Smoking, Campfire, and Stonecutting recipe JSON files. Cooking entries require an explicitly entered yield, item-or-tag input, and cooking time; Stonecutting requires an explicitly entered yield and input without an inapplicable time field. Their ingredient comboboxes use the same control width as the numeric fields.
- optional Item properties for food and attack attributes, or the selected vanilla tool class/tier and its attributes;
- optional translated normal/Shift tooltip behavior and owned language keys;
- optional furnace fuel registration in `ModFuelEvents.java`;
- ownership-safe membership entries in selected item-tag JSON files;
- optional flat/geo state textures and models plus `GeoItemRegistry` registration when a custom renderer is required.

The 3D Model option requires an imported geo model and PNG texture. A display model is optional and falls back to `minecraft:builtin/entity`.

`delete_basic_item` removes the complete manifest and then the Item JSON. It is idempotent when the Item is already absent.

## Current Texture lifecycle

`save_texture_bundle` writes the complete Texture metadata JSON, base image, and optional `_mask` and `_emissive` image sidecars under `ycs-data/textures/`.

Texture metadata may include the optional `filterTo` selector scope. An absent value means the Texture appears in every compatible Texture combobox. The current `item` value restricts it to Item Texture selectors; future editor types must apply their own scope at the option-loading boundary.

Texture import validates the actual PNG, JPEG, GIF, or WebP file signature against the declared extension for the base image and both optional sidecars. Item generation additionally requires genuine PNG data, not merely a `.png` filename, so Minecraft cannot receive a renamed JPEG or other invalid PNG.

Texture Save resolves every Item whose `texture` field matches the saved Texture ID. If that Item's manifest owns `textures/item/<item-id>.png`, YCS4 refreshes the generated copy from the new source bytes without requiring the Item editor to be reopened or saved. The backend returns the affected Item IDs, and the main window reloads every matching Item container preview immediately. A Texture used by an Item must remain a genuine PNG.

`find_texture_usage` and `delete_texture_bundle` scan non-Texture authoring categories recursively for fields whose names contain `texture` and whose value equals the Texture ID. The UI preflights deletion so it can display every usage in the Warning dialog, while the delete command repeats the check to keep the backend authoritative. If no usages remain, deletion removes the metadata, base image, mask, and emissive sidecars before YCS4 removes the visual references.

## Adding another object type

1. Define the complete authoring schema and category under `ycs-data/`.
2. Decide whether the workspace representation is a reference to saved data or only ephemeral UI.
3. Add a dedicated page module for its editor; keep page-specific logic out of `main.js`.
4. Add backend validation and safe source-path handling.
5. Define exact injection ownership and reverse cleanup before implementing generation.
6. Preserve unsupported fields during incremental V4 ports.
7. Handle new, edit, rename collision, failed save, delete, and already-removed cases.
8. Bind visual containers only after persistence succeeds.
9. Reconcile missing and duplicate saved references at startup if the type participates in the workspace.
10. Evaluate dedicated-server synchronization separately for any generated runtime behavior.

## Current limitations

- Basic Item fields, Tags, Tooltip, Multiple States, Tool, Combat, Food, Fuel, and all exposed Recipe types use the full V4 injection path. The Item Data Components dialog stores Global references and typed Local definitions in Item authoring JSON; runtime component generation remains pending. Multiple State controls fill the available state-row control column. Custom Class uses an Add-driven collection for Interaction, Finished Using, Inventory Tick, Hurt Entity, and Entity Interaction. Selected methods become state-style panels and leave the Add list; Interaction additionally owns Continuous Use, duration ticks, Use Animation, On Use, and Release Using controls. Method graph editors and runtime generation remain pending.
- Workspace hierarchy is local browser state and is not portable project metadata.
- Folder deletion contains an unused confirmation-dialog path; actual removal currently unwraps children directly.
- General transactional rollback is not implemented if generation fails after some old outputs were removed.
- Unsupported V3 fields are preserved, but most do not yet have V4 editors.

## Synchronization boundary

YCS editor state and generated-file cleanup are tooling concerns and do not themselves require game networking. Every generated gameplay or cross-client visual feature must still be classified independently as either:

- rides on vanilla synchronization, with the actual vanilla mechanism identified; or
- needs explicit server authority and synchronization, including late-observer handling where applicable.

Do not place server-authoritative behavior in client-only generated code.
