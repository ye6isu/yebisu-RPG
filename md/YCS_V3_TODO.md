# YCS V3 TODO

## Ongoing
HUD editor built out this session, well beyond the original "read-only overlay" scope:
- Widget-to-widget anchoring (`anchorTarget`) — a widget can anchor to another widget's own resolved rect instead of only the canvas, with cycle-safe recursive resolution shared between the editor preview (`resolveWidgetRect` in `HudLanding.jsx`) and in-game rendering (`HudOverlayRenderer.resolveRect`).
- Full 9-way `AnchorGrid` picker (3x3 clickable grid) replacing the old anchor dropdown, reused for both a widget's screen anchor and Text's own alignment.
- Text widgets: Text Size (font scale) and independent 9-way Text Align (within the widget's own box, unrelated to the box's screen anchor) — mirrored in Java via `PoseStack` scale + `anchorOrigin` reused for in-box alignment.
- Text widgets: Number mode (existing) vs Text mode (new) — Text mode reads a literal string from a `hud.return_text` Blocky graph via new `HudTextSources.java`, instead of formatting a bound number.
- New standalone `text.combine` value block ("Combine Text") — the same expandable `[settings gear][text link]...` mechanism Send Chat already had, but reusable in any text slot (not hardcoded into Send Chat).
- Visibility gating: `hud.return_bool` Blocky block + per-widget and per-layout True/False-or-Blocky-link gate, backed by new `HudBoolSources.java`.
- Bar fill lerp/smoothing toward the target value instead of snapping, with a configurable per-frame catch-up strength.
- Animated spritesheet frame/ticks-per-frame can be overridden per texture slot (Icon/Filled/Empty) via a literal or Blocky link, on top of the texture's own stored defaults.
- Unified `LinkableValueField` pattern (typed literal OR Blocky link, never both shown at once, link always wins at render/compile time) applied everywhere a binding exists: Value, Max, Text, Visibility, and per-texture-slot Frame.
- Reference-image picker (drag-and-drop + browse, mirroring the 3D model importer), resizable/draggable layers list with real drag-reorder (native HTML5 DnD swapped for mouse-event-based dragging — unreliable inside the Tauri/WebView2 shell), searchable texture dropdowns.
- Real bugs found and fixed along the way: stale in-game HUD cache never invalidated on resource reload (`ResourceManagerReloadListener` added), a wrong center-anchor math bug in the editor (horizontal centering was accidentally excluded for the plain `"center"` anchor), and an animated-frame fallback that ignored the typed literal in both the Java renderer and the canvas preview.
- Not yet reconciled into the "HUD — Follow-up" section below — some of those bullets (e.g. "no per-widget always-show override", "canvas preview doesn't evaluate the real bound value") are now partially superseded by the above and worth revisiting/pruning next session.

## Chopping Block
- [ ] Interactive GUI/Screen (clickable menus — a custom inventory-like screen, ability-selection menu, shop UI; needs its own `Screen` class + likely an `AbstractContainerMenu` for server-authoritative slot sync). HUD overlay (the read-only, non-interactive half of "GUI/HUD") is done — see below.
- [ ] Ability Creator
  - [ ] **Prerequisite before any Kalista-E-style ability ("multiple simultaneous independently-trackable instances, each individually poppable/removable"):** Attributes and Entity Variables are both single-scalar-per-name-per-entity — neither can represent "a list of N independent active things" (e.g. each thrown spear needs its own id, owner, position, and "has this specific one been popped" state, tracked separately from every other active spear). This needs its own mechanism — likely either a small per-entity list/array data structure (closer to the earlier-descoped "spatial storage" idea) or real tracked marker entities (invisible entities carrying per-instance state) — not a bolt-on to Attributes/Entity Variables. Design this properly before attempting any ability with multiple concurrent independently-removable effect instances.
  - [ ] **Activation-mode state machines, deferred from Keybind:** an ability's actual trigger behavior — Simple (press → fire once), Hold (must stay held to remain active/channeling), Toggle (press to turn on, press again to turn off), Charge-and-Release (charge while held, fire on release, like a bow draw), and Multi-Phase Combo (press → hold phase 1 → auto-advances to phase 2 once phase 1 completes, cancels if phase 1 isn't finished in time) — all consume the raw "is this keybind currently down" signal as their input, but the mode logic itself belongs in Ability Creator, not in the Keybind system. Keybind only ever exposes the raw press/release signal (see `YCS_V3_Injection_and_Lifecycle.md`'s Keybinds section); build these five modes as part of Ability Creator's activation logic when that work starts.
- [ ] VFX Editor

## Keybinds — Follow-up
- [ ] True multi-key simultaneous combos (e.g. Ctrl+Shift+R) were attempted and abandoned — subclassing vanilla's package-private `KeyBindsList.Entry` from mod code to inject custom rows into the Controls screen crashes the game outright (Java module system split-package violation, confirmed live). Landed on single key + at most one modifier instead, matching NeoForge's own `KeyMapping` ceiling and what most other games use anyway. Revisit only with a fully separate custom screen (not touching vanilla's `KeyBindsList`) if true combos are ever needed.
- [ ] No duplicate-keybind or reserved-key validation in the editor (matches V1's own scope — V1 had none either).
- [ ] No usage-scanner before delete — same gap as Entity Variables/Attributes (Blocky refs live in `localStorage`, invisible to Rust-side checks).
- [ ] On Press/On Release Blocky editing requires saving the keybind once first (auto-close-on-save means there's no populated id to key the graph by until the row is reopened) — matches the existing "Save auto-closes" editor convention everywhere else in YCS, not a keybind-specific gap, but worth a UX pass if it proves annoying in practice.

## HUD — Follow-up
- [ ] No usage-scanner before delete — a widget's value/max-link Blocky graphs live in `localStorage` (`ycs-blocky::hudwidget::<layoutId>::<widgetIndex>::value` / `::max`), same invisible-to-Rust gap as every other Blocky-graph-owning object.
- [ ] Canvas preview shows real texture images and an illustrative fixed 65%-full sample bar fill, but doesn't evaluate the actual compiled value/max expression (that only exists as generated Java, not something the YCS frontend can run) — the sample fraction is always the same regardless of what's actually plugged into Value/Max.
- [ ] `hideGui` (F1) is respected, and is a separate concern from the new bool-gated visibility system (Return Bool block + Always Show/gated toggle, per-widget in WidgetInspector and per-layout in LayoutPanel, backed by `HudBoolSources.java`) — no per-widget override to stay visible even with GUI hidden exists yet (e.g. some games keep boss bars visible in cinematic mode).
- [ ] No usage-scanner before delete for visibility-gate Blocky graphs either (`ycs-blocky::hudwidget::<layoutId>::<widgetIndex|'layout'>::visible`), same gap as value/max links above.
- [ ] HUD bindings are local-player-only by design — binding to a looked-at/targeted entity (e.g. a boss health bar) was explicitly deferred, not built.
- [ ] Renaming a HUD layout (id changes on Save) does carry each widget's value/max-link graphs over to the new storage key, but only during that same save — if a widget is deleted then a *new* widget added at the same index before ever saving, the old graphs could theoretically leak under the reused index; low-risk edge case, not hardened against.
- [ ] Bar's clipped-fill rendering uses `GuiGraphics.enableScissor`/`disableScissor` — correct for rectangular bars, but would clip incorrectly if a future non-rectangular bar shape (e.g. rounded/diagonal) were ever added; fine for the current straightforward horizontal-fill bar.
- [ ] `previewW`/`previewH`/`gridSize` are saved per-layout but have no effect on anything at runtime (purely a YCS-editor convenience) — if a future layout wanted a genuinely different reference aspect ratio's anchor math (rather than just a bigger/smaller edit canvas), that's not what these fields do today.

## Entity Variables — Follow-up
- [ ] String component-style length cap: `ByteBufCodecs.STRING_UTF8` is unbounded, same latent hardening gap as Data Components' string type.
- [ ] No usage-scanner before delete (Blocky graph refs live in browser `localStorage`, not scannable from Rust) — deleting a variable only warns generically, doesn't check for stale references.
- [ ] Item-typed variable / spatial entity-storage (llama-style inventory without a physical item) was explicitly descoped from this pass — revisit as a separate feature if needed.

## Attributes — Follow-up
- [ ] `attribute.modifier.add`'s UI only exposes 3 of 5 compiler-supported operations (`base_add`/`base_multiply` are unreachable from the block's dropdown) — inherited as-is from old_mod, not fixed in this pass.
- [ ] No usage-scanner before delete — same gap as Entity Variables (Blocky refs live in `localStorage`, invisible to Rust-side checks).
- [ ] `yebisurpg:scale.*` Pehkui-style multiplier attributes and their mixin hooks (jump height, reach, attack/defense scaling, etc.) were explicitly descoped — remain hand-authored in old_mod, not ported or YCS-managed.
- [ ] `AttributeRangeFix`'s raised ceilings are a fixed hardcoded set (max_health/armor/armor_toughness/attack_damage/attack_knockback/movement_speed) — not user-configurable from the YCS tool; extending to other vanilla attributes requires a manual code change.
