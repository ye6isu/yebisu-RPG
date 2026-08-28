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

On startup YCS4 restores the visual hierarchy, then reconciles Item references against `list_ycs_data("items")`:

- duplicate visual references for one saved Item ID are collapsed;
- a saved Item with no visual reference is restored at the Home root;
- restored references load their display label and preview when possible;
- malformed optional display metadata does not make the reference unusable.

This repair pass reinforces that `ycs-data` is authoritative and `localStorage` is only navigation layout.

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
- Deleting an unsaved container removes only that visual container.
- Deleting a folder unwraps children and does not invoke object deletion.

## Current Item lifecycle

`save_basic_item` currently supports Generated and Handheld Items with:

- Item ID and display name;
- one shared PNG Texture;
- holding mode;
- stack size clamped to 1–99;
- optional project or vanilla creative tab.

It generates and owns:

- the `ModItems.java` registration above `YCS_Mod_Items`;
- `item.yebisurpg.<id>` in `en_us.json`;
- optional creative-tab content registration;
- `textures/item/<id>.png`;
- `models/item/<id>.json` using the generated or handheld parent.

The 3D Model option remains visible for compatibility but save rejects it until V4 exposes the geo model, geo texture, and display-model inputs.

`delete_basic_item` removes the complete manifest and then the Item JSON. It is idempotent when the Item is already absent.

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

- Only the reduced Item lifecycle uses the full V4 injection path today.
- Texture bundle deletion is not yet a domain cleanup lifecycle equivalent to Item deletion; removing a Texture container is visual organization only.
- Workspace hierarchy is local browser state and is not portable project metadata.
- Folder deletion contains an unused confirmation-dialog path; actual removal currently unwraps children directly.
- General transactional rollback is not implemented if generation fails after some old outputs were removed.
- Unsupported V3 fields are preserved, but most do not yet have V4 editors.

## Synchronization boundary

YCS editor state and generated-file cleanup are tooling concerns and do not themselves require game networking. Every generated gameplay or cross-client visual feature must still be classified independently as either:

- rides on vanilla synchronization, with the actual vanilla mechanism identified; or
- needs explicit server authority and synchronization, including late-observer handling where applicable.

Do not place server-authoritative behavior in client-only generated code.
