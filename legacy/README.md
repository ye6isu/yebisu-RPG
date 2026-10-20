# Legacy Prototypes & Tooling Archive (v1 – v3)

This directory preserves the historical iterations and exploratory prototypes of the **yebisu-RPG** project prior to the production **v4 (YCS4)** refactor.

---

## Architectural Evolution

The systems in this archive document the technical journey, architectural pain points, and prototyping milestones that informed the design of the current engine:

### 1. Version 1 & 2 Prototypes (`legacy/tools/V1 YCS/`, `legacy/tools/V2 YCS/`)
- **Focus:** Initial exploration of custom Minecraft combat mechanics, item state transitions, and early desktop GUI experiments for asset handling.
- **Learnings & Bottlenecks:** Direct coupling between tooling and hardcoded Java files proved brittle; manual file manipulation lacked transaction safety and atomic rollback capabilities.

### 2. Version 3 Exploration (`legacy/tools/V3 YCS/`, `legacy/main/`)
- **Focus:** Early desktop tooling (React/Vite with Tauri), Blocky-based visual logic authoring, player animation blending experiments, and preliminary textured-plane VFX rendering.
- **Architectural Shift:** Demonstrated the feasibility of external desktop tool suites for Minecraft modding, but highlighted the need for:
  - Strict decoupling between UI visual layout state and domain data authority.
  - A dedicated-server first networking model rather than client-only simulations.
  - Zero required runtime dependencies (eliminating reliance on third-party frameworks like GeckoLib).

### 3. Transition to YCS4 (Production)
The insights gained across v1–v3 culminated in the active architecture in the repository root:
- **Core Mod (`/src/main`):** Rebuilt with zero runtime dependencies, strict dedicated-server authority, shared game-time synchronization, and non-invasive Mixin rendering hooks.
- **Tooling (`/YCS4`):** Re-architected as a high-performance Tauri 2 (Rust + Vanilla JS) visual developer environment featuring:
  - Canonical JSON domain stores in `ycs-data/`.
  - Reversible AST-style marker injections (`_injections`) for safe, transactional code/resource generation.
  - A node-based visual gameplay scripting canvas with typed connections and contextual search.

---

> [!NOTE]
> Files in this directory are retained strictly as an engineering archive and reference case study. All active mod development and tooling reside in `/src` and `/YCS4`.
