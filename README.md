# yebisu RPG

A NeoForge 1.21.1 RPG mod adding abilities, energy systems, and custom gameplay mechanics.

## Requirements

| Dependency | Version |
|------------|---------|
| Minecraft  | 1.21.1  |
| NeoForge   | 21.1.x  |
| Java       | 21      |

## Project structure

```
src/main/java/net/ye6isu/
├── yebisuRPG/          Main mod — items, blocks, keybinds, gameplay
│   ├── block/          ModBlocks.java
│   ├── client/         ModKeybinds.java  (Dist.CLIENT only)
│   ├── datagen/        Data generators
│   ├── item/           ModItems.java, ModCreativeModeTabs.java
│   └── yebisuRPG.java  @Mod entry point
└── yebisulib/          Internal library — networking foundation
    └── network/        See NETWORKING.md for full reference
```

## Building

```bash
./gradlew build
# Output: build/libs/yebisurpg-<version>.jar
```

## Development setup

```bash
./gradlew genEclipseRuns   # Eclipse
./gradlew genIntellijRuns  # IntelliJ (usually auto-detected)
```

## Networking

See [`NETWORKING.md`](NETWORKING.md) for the full guide covering:
- How to add C2S and S2C packets
- Dedicated-server safety rules
- High-frequency data (energy, stats) with `NetworkThrottle`
- Codec cheat-sheet

## License

MIT
