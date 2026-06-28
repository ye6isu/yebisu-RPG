# Item State System

Items can have multiple visual states, each with its own 3D model (geo), texture, and animation settings. States are switched at runtime via the `ITEM_STATE` data component.

## Architecture

### Data Component
- `ModDataComponents.ITEM_STATE` (int) — stored on the ItemStack, synced to client, persisted to world.
- Value `0` = state 0, `1` = state 1, etc.

### Per-State Resources
Each state `N` for item `<id>` expects:
- **Geo**: `assets/yebisurpg/geo/item/<id>_state_N.geo.json`
- **Texture**: `assets/yebisurpg/textures/geo/item/<id>_state_N.png`

### Registration (`GeoItemRegistry`)
States are registered via `tryRegisterStates`:

```java
// No animation on any state
tryRegisterStates(items, ModItems.MY_ITEM, "my_item",
    new String[]{"my_item_state_0", "my_item_state_1"});

// Per-state animation: int[][] where each int[] = {frames, animated(0/1), ticksPerFrame}
tryRegisterStates(items, ModItems.MY_ITEM, "my_item",
    new String[]{"my_item_state_0", "my_item_state_1"},
    new int[][]{{0, 0, 0}, {4, 1, 4}});
```

### Renderer (`GeoItemRenderer`)
- Stores `List<BakedGeoModel>` per item (one model per state).
- Stores `List<StateAnim>` per item (one animation config per state).
- At render time, reads `ITEM_STATE` from the stack and selects the matching model, texture, and animation params.
- Spritesheet detection runs independently per state texture.

## Animation Per State

Each state has independent animation behavior via `StateAnim(frames, animated, ticksPerFrame)`:

| `animated` | Spritesheet | Behavior |
|---|---|---|
| `false` | No | Static texture |
| `false` | Yes | Manual frame via `CustomModelData` (set item texture) |
| `true` | Yes | Auto-cycles frames based on game tick |

- `frames` override: if > 1, uses this instead of auto-detected spritesheet frame count.
- `ticksPerFrame`: game ticks per animation frame (default 4 if unset).
- Spritesheet detection: compares PNG dimensions to geo `texture_width`/`texture_height`. A spritesheet has a taller height ratio than width ratio vs the geo's declared UV space.

## UV Modes

Cubes in a geo model can use either UV format (or mix within one model):

- **Box UV**: `"uv": [x, y]` — standard Bedrock box unwrap layout.
- **Per-face UV**: `"uv": {"north": {"uv": [x,y], "uv_size": [w,h]}, ...}` — explicit UV per face. Negative `uv_size` flips the texture on that axis.

Both modes support spritesheet animation via `vFrameOffset`.

## Zero-Width Cubes

Cubes with a zero-size dimension (e.g. flat blade with `sizeX=0`) get a 0.001-unit nudge on the zero axis to prevent z-fighting between the two coplanar faces.

## Codegen (YCS)

The YCS tool generates the `tryRegisterStates` call between `//YCS_Geo_Collect_START` and `//YCS_Geo_Collect_END` sentinels. Each 3D state's `texMeta` (from the texture panel) provides `{frames, animated, ticksPerFrame}`. When any state has animation, the codegen emits the `int[][]` overload with per-state params.
