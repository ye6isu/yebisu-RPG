# yebisuLib Networking System
**NeoForge 1.21.1 — dedicated-server safe — designed for 100+ players**

---

## File map

```
net.ye6isu.yebisulib.network/
├── BasePayload.java          Marker interface every payload record implements
├── PayloadHandler.java       Functional interface (T, IPayloadContext) → void
├── NetworkRegistry.java      @EventBusSubscriber — all playToServer / playToClient registrations
├── ClientHandlerProxy.java   Shared proxy that routes S2C payloads to @OnlyIn(CLIENT) handlers
└── util/
    ├── NetworkUtils.java     PacketDistributor wrappers + guidance on which to use
    └── NetworkThrottle.java  Per-player rate-limiter for high-frequency data (energy, stats)
```

---

## The dedicated-server safety rule

The JVM resolves method references (`Foo::bar`) **at class-load time**, not at
call time. Any class that contains a reference to a `@OnlyIn(CLIENT)` class —
even inside an `if` block — will crash with `BootstrapMethodError` on a
dedicated server when that class loads.

### The pattern that solves it

```
NetworkRegistry (loads on server)
  └─ playToClient(TYPE, CODEC, ClientHandlerProxy::onEnergySyncfromEnergy)

ClientHandlerProxy (loads on server — NO client imports)
  └─ onEnergySync(payload, ctx) {
         if (dist == CLIENT) {
             Runnable call = () -> EnergySyncClientHandler.handle(payload, ctx);
             call.run();   // lambda resolved at runtime ✓
         }
     }

EnergySyncClientHandler  @OnlyIn(CLIENT)  — imports Minecraft, LocalPlayer, etc.
```

A **local `Runnable` variable** is constructed at **runtime**.
A **method reference** in a field, parameter, or constant pool is resolved at
**class-load time**.
`ClientHandlerProxy` holds no client class in its constant pool → safe on server.

---

## Adding a packet — complete checklist

### C2S (client sends to server)

1. **Payload** — record implementing `BasePayload`:
```java
public record UseAbilityPayload(int abilityId) implements BasePayload {
    public static final CustomPacketPayload.Type<UseAbilityPayload> TYPE =
        new CustomPacketPayload.Type<>(
            ResourceLocation.fromNamespaceAndPath("yebisurpg", "use_ability"));

    public static final StreamCodec<ByteBuf, UseAbilityPayload> STREAM_CODEC =
        StreamCodec.composite(
            ByteBufCodecs.VAR_INT, UseAbilityPayload::abilityId,
            UseAbilityPayload::new);

    @Override
    public CustomPacketPayload.Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }
}
```

2. **Server handler** — no dist annotation, no client imports:
```java
public class UseAbilityServerHandler {
    public static void handle(UseAbilityPayload payload, IPayloadContext ctx) {
        ServerPlayer player = (ServerPlayer) ctx.player();
        // validate, then act
        int id = payload.abilityId();
        if (id < 0 || id > MAX_ABILITY_ID) return; // always validate C2S data
        player.getCapability(AbilityCapability.INSTANCE).use(id);
    }
}
```

3. **Register in `NetworkRegistry`**:
```java
registrar.playToServer(
    UseAbilityPayload.TYPE,
    UseAbilityPayload.STREAM_CODEC,
    UseAbilityServerHandler::handle);
```

4. **Send from client** (e.g. in a keybind tick handler):
```java
NetworkUtils.sendToServer(new UseAbilityPayload(selectedAbilityId));
```

---

### S2C (server sends to client)

1. **Payload** — same structure as above.

2. **Client handler** — must be `@OnlyIn(Dist.CLIENT)`:
```java
@OnlyIn(Dist.CLIENT)
public class EnergySyncClientHandler {
    public static void handle(EnergySyncPayload payload, IPayloadContext ctx) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null) return;
        ClientEnergyData.set(payload.energy(), payload.maxEnergy()); // update HUD data
    }
}
```

3. **Add proxy method in `ClientHandlerProxy`**:
```java
public static void onEnergySync(EnergySyncPayload payload, IPayloadContext ctx) {
    if (FMLEnvironment.dist == Dist.CLIENT) {
        Runnable call = () -> EnergySyncClientHandler.handle(payload, ctx);
        call.run();
    }
}
```

4. **Register in `NetworkRegistry`**:
```java
registrar.playToClient(
    EnergySyncPayload.TYPE,
    EnergySyncPayload.STREAM_CODEC,
    ClientHandlerProxy::onEnergySync);
```

5. **Send from server**:
```java
NetworkUtils.sendToPlayer(serverPlayer,
    new EnergySyncPayload(player.getEnergy(), player.getMaxEnergy()));
```

---

## High-frequency data (energy, cooldowns, stats)

At 100 players ticking every 50 ms:  
100 × 20 packets/s = **2 000 packets/s** per payload type — before any game logic.

Use `NetworkThrottle` to collapse repeated sends:

```java
// One throttle instance per payload type, stored statically or in your system:
private static final NetworkThrottle<EnergySyncPayload> ENERGY_THROTTLE =
    new NetworkThrottle<>(100); // at most once per 100 ms (2 ticks)

// Called every time energy changes — even every tick:
ENERGY_THROTTLE.send(serverPlayer,
    () -> new EnergySyncPayload(player.getEnergy(), player.getMaxEnergy()));
// Supplier only called when a packet will actually go out → zero allocation on suppressed ticks.

// On player disconnect — prevents the internal map growing forever:
ENERGY_THROTTLE.remove(serverPlayer);

// Force an immediate sync regardless of throttle (e.g. player levels up):
ENERGY_THROTTLE.invalidate(serverPlayer);
ENERGY_THROTTLE.send(serverPlayer, () -> new EnergySyncPayload(...));
```

### Throttle interval guidance

| Update rate | `intervalMs` | Ticks |
|-------------|--------------|-------|
| Every tick (debug/testing) | 50 | 1 |
| Smooth bar animation | 100 | 2 |
| Stats, cooldowns | 200 | 4 |
| Slow-changing values | 500 | 10 |

---

## `NetworkUtils` — which method to use

| Situation | Method |
|-----------|--------|
| Client → server | `sendToServer(payload)` `@OnlyIn(CLIENT)` |
| Server → one player | `sendToPlayer(player, payload)` |
| Entity animation / VFX | `sendToPlayersTracking(entity, payload)` |
| Actor also needs to see the effect | `sendToPlayersTrackingAndSelf(entity, payload)` |
| Block event in a chunk | `sendToPlayersTrackingChunk(level, chunkPos, payload)` |
| AOE ability without an entity | `sendToPlayersNear(level, x, y, z, radius, payload)` |
| Dimension-wide event | `sendToPlayersInDimension(level, payload)` |
| Global announcement | `sendToAllPlayers(payload)` — use sparingly |

---

## Codec cheat-sheet

```java
ByteBufCodecs.VAR_INT          // int   — efficient for small values
ByteBufCodecs.FLOAT            // float
ByteBufCodecs.BOOL             // boolean
ByteBufCodecs.stringUtf8(64)   // String capped at 64 chars
ByteBufCodecs.COMPOUND_TAG     // CompoundTag (NBT)
BlockPos.STREAM_CODEC          // BlockPos
// ItemStack needs RegistryFriendlyByteBuf:
ItemStack.STREAM_CODEC
// UUID as two longs (compact):
StreamCodec.composite(
    ByteBufCodecs.VAR_LONG, uuid -> uuid.getMostSignificantBits(),
    ByteBufCodecs.VAR_LONG, uuid -> uuid.getLeastSignificantBits(),
    UUID::new)
```

---

## Files to delete from disk

The following files were created during development and are now empty stubs.
Delete them manually:

```
src/main/java/net/ye6isu/yebisulib/network/test/          (entire folder)
src/main/java/net/ye6isu/yebisulib/network/handler/       (entire folder)
src/main/java/net/ye6isu/yebisulib/network/payload/       (entire folder)
src/main/java/net/ye6isu/yebisulib/network/ClientPayloadRegistrar.java
src/main/java/net/ye6isu/yebisulib/network/NETWORKING_GUIDE.md
src/main/java/net/ye6isu/yebisulib/network/package-info.java
NETWORKING_TEST_README.md
NETWORKING_TEST_SUMMARY.md
NETWORKING_TEST_FIXED.md
YEBISULIB_NETWORKING_IMPLEMENTATION.md
delete_networking_test.bat
delete_networking_test.sh
```

**One-liner (run from project root):**
```bat
rmdir /s /q "src\main\java\net\ye6isu\yebisulib\network\test"
rmdir /s /q "src\main\java\net\ye6isu\yebisulib\network\handler"
rmdir /s /q "src\main\java\net\ye6isu\yebisulib\network\payload"
del "src\main\java\net\ye6isu\yebisulib\network\ClientPayloadRegistrar.java"
del "src\main\java\net\ye6isu\yebisulib\network\NETWORKING_GUIDE.md"
del "src\main\java\net\ye6isu\yebisulib\network\package-info.java"
```
