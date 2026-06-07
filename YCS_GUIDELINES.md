# YCS (Yebisu Creator Studio) — Guidelines

## Overview

YCS is a visual mod creator for NeoForge. It manages items and blocks by generating and patching Java source files using sentinel comment markers. Everything YCS touches is delimited by `//YCS_*` sentinels so it never corrupts hand-written code.

---

## Sentinel Format

### ModItems.java / ModBlocks.java registration block
```java
//YCS_Mod_Items_START

public static final DeferredItem<Item> MY_ITEM = ITEMS.register("my_item",
        () -> new MyItemItem(new Item.Properties()));

//YCS_Mod_Items_END
```

- One blank line inside the block on both sides when populated.
- YCS only touches the region between `_START` and `_END`.
- Never place hand-written items inside the YCS block.

### Custom class import block
```java
//YCS_Import_START
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.entity.player.Player;
// ... other imports
//YCS_Import_END
```

- Always injected right after the `package` declaration.
- YCS rebuilds this block entirely on every save/toggle.
- Base imports (`Item`, `ItemStack`, `Level`, `Player`) are always included.

### Method override block (inside custom class)
```java
//YCS:hurtEnemy:start
    @Override
    public boolean hurtEnemy(ItemStack stack, LivingEntity target, LivingEntity attacker) {
        //YCS:hurtEnemy:body   ← replaced with compiled blocks on Save
        return super.hurtEnemy(stack, target, attacker);
    }
//YCS:hurtEnemy:end
```

- The `//YCS:methodKey:body` marker is replaced with compiled block code on every Save.
- If the body marker is missing (previous save compiled it), YCS strips and re-injects the stub before compiling.

### Feature override block (food / fuel / tooltip)
```java
//YCS:food:start
    @Override
    public FoodProperties getFoodProperties(ItemStack stack, LivingEntity entity) {
        return new FoodProperties.Builder().nutrition(3).saturationModifier(0.3f).build();
    }
//YCS:food:end
```

Feature keys: `food`, `fuel`, `tooltip`

---

## Item Architecture

### Registration (ModItems.java)
- All YCS-managed items are registered with `new MyItemClass(new Item.Properties())`.
- No `FuelItem` wrapper class, no `ModFoodProperties` — everything lives in the custom class.
- When no custom class exists, food/fuel/tooltip are inlined as anonymous overrides in ModItems.

### Custom class (e.g. SukunaFingerItem.java)
- Extends `Item` (or `SwordItem` etc. for tools).
- All YCS features (food, fuel, tooltip, method overrides) are injected/removed via sentinels.
- The file is auto-created when you click "edit methods" on an item with an ID set.

### Properties flags (in YCS form)
| Flag | Effect |
|------|--------|
| `isTool` | Uses `SwordItem`/`PickaxeItem` etc. with `.createAttributes(tier, dmg, spd)` |
| `isFood` | Injects `getFoodProperties()` override into custom class (or inline `.food()` if no class) |
| `isFuel` | Injects `getBurnTime()` override into custom class (or inline anonymous class if no class) |
| `hasDurability` | Adds `.durability(N)` to `Item.Properties()`. Hidden when `isTool` is checked. |
| `hasTooltip` | Injects `appendHoverText()` override into custom class (or inline anonymous class if no class) |

---

## Available Override Methods

| Key | Java signature |
|-----|----------------|
| `useOn` | `InteractionResult useOn(UseOnContext context)` |
| `use` | `InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand usedHand)` |
| `continuousUse` | `void onUseTick(Level, LivingEntity, ItemStack, int)` + `void releaseUsing(ItemStack, Level, LivingEntity, int)` |
| `finishUsingItem` | `ItemStack finishUsingItem(ItemStack stack, Level level, LivingEntity livingEntity)` |
| `inventoryTick` | `void inventoryTick(ItemStack stack, Level level, Entity entity, int slotId, boolean isSelected)` |
| `hurtEnemy` | `boolean hurtEnemy(ItemStack stack, LivingEntity target, LivingEntity attacker)` |
| `interactLivingEntity` | `InteractionResult interactLivingEntity(ItemStack stack, Player player, LivingEntity interactionTarget, InteractionHand usedHand)` |

---

## Visual Block Editor (Canvas)

- Free-floating 2D canvas. Drag blocks from the left palette onto the canvas.
- Pan by dragging on empty canvas space.
- Move placed blocks by dragging them.
- Edit field values directly on the block.
- `$param` chips (blue) come from the Parameters section — drag them into block field slots.
- Click **Save** to compile all canvas blocks into the method body on disk.

### Block palette categories
- **Universal Flow & Logic** — If/Do, Repeat, Math, Logic, Boolean, Return
- **Context Data Blocks** — Get Level, Get Player, Get Entity, Get Item (dynamic getters)
- **World Actions** — set block, get block, spawn particle, play sound, strike lightning
- **Entity & Movement** — deal damage, apply effect, set velocity, get health
- **Item Actions** — damage stack, shrink stack, return interaction result

---

## Cleanup Rules

When you delete an item or block, YCS:
1. Removes its line from the `//YCS_Mod_Items_START ... //YCS_Mod_Items_END` block.
2. Deletes its custom class file (if one exists).
3. Deletes its texture file from `resources/assets/yebisurpg/textures/item/`.
4. Rebuilds lang, model, and loot table files.

When you uncheck a feature (Food / Fuel / Tooltip) on an item with a custom class:
- The corresponding `//YCS:featureKey:start ... //YCS:featureKey:end` block is removed from the class file.
- Imports are re-synced to remove unused ones.

When you disable a method override:
- The `//YCS:methodKey:start ... //YCS:methodKey:end` block is removed.
- Imports are re-synced.

---

## Server Compatibility

- Always wrap world-mutation code in `if (!level.isClientSide)` — use the **Server Side Only** block.
- Particle spawning uses `ServerLevel.sendParticles()` — already server-side safe.
- Never access client-only classes (anything in `net.minecraft.client.*`) in item method overrides — these will crash dedicated servers. The `appendHoverText` tooltip method is `@OnlyIn(Dist.CLIENT)` implicitly; NeoForge handles this correctly for `Item` subclasses.
- The existing `NetworkingClass` should be used for any custom data sync — do not create new packet types without confirming with the project owner.

---

## Naming Conventions

| Thing | Convention |
|-------|------------|
| Item ID | `snake_case`, e.g. `sukuna_finger` |
| Const name | `UPPER_SNAKE`, e.g. `SUKUNA_FINGER` |
| Custom class | `PascalCase` + `Item` suffix, e.g. `SukunaFingerItem` |
| Method key | `camelCase`, matches Java method name |
| Feature key | `food`, `fuel`, `tooltip` (fixed) |

---

## Files YCS Manages

| File | What YCS touches |
|------|-----------------|
| `item/ModItems.java` | `//YCS_Mod_Items_START ... END` block |
| `item/custom/MyItemItem.java` | Entire file (auto-created), sentinel blocks inside |
| `resources/assets/.../textures/item/` | Texture PNG files |
| `resources/assets/.../lang/en_us.json` | Item display name keys |
| `resources/assets/.../models/item/` | Model JSON files |
| `resources/data/.../loot_table/` | Loot table JSON files |
| `resources/data/.../tags/` | Tag JSON files |

YCS never touches files outside these paths.
