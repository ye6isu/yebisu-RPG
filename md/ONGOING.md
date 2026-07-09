# Ongoing Work

## First-Person Mannequin (camera-anchored partial-body overlay)

**What it is:** When a player's `ENTITY_THIRD_PERSON` animation/pose has any of the 4
first-person limb bits set, a fake, untracked `RemotePlayer` ("mannequin") is rendered
fixed in front of the camera in first-person view, showing the third-person animation's
limbs even though the camera itself is first-person.

**Key files:**
- `client/renderer/ForceRenderCameraEntity.java` — spawns/positions/renders the mannequin
  each frame (`RenderLevelStageEvent.AFTER_ENTITIES`, first-person camera only).
- `mixin/MixinPlayerModel.java` — `yebisurpg$hideMannequinParts` (TAIL inject on
  `setupAnim`) hides head/torso unconditionally and hides any non-selected limb via
  `TorsoRotationHolder.RENDERING_MANNEQUIN` / `MANNEQUIN_LIMB_MASK`.
- `animation/client/AnimationPlayhead.java` — `FP_RIGHT_ARM` / `FP_LEFT_ARM` /
  `FP_RIGHT_LEG` / `FP_LEFT_LEG` bits (packed into `vanillaMoveMask`), replacing the old
  single `SHOW_IN_FIRST_PERSON` boolean.
- `network/animation/ThirdPersonPosePayload.java` — same bits, `firstPersonLimbMask()`.
- `ycs/src/codegen/visual/blockDefs.js` — Blocky block editor now exposes 4 checkboxes
  (Right Arm / Left Arm / Right Leg / Left Leg) instead of one "Show in First Person"
  checkbox, on both `anim.thirdperson.play` and `anim.tppose.set`.

**Done so far:**
- Mannequin renders pinned in front of camera, yaw-follows camera.
- Pitch now follows camera too, pivoting around the mannequin's eyes (not feet), rotated
  in the mannequin's own local yaw frame (was previously only correct facing south).
- Head + torso always hidden; per-limb visibility driven by the 4-checkbox mask.
- No shadow (mannequin is never added to the level's entity tracker, so vanilla's shadow
  pass — which only iterates tracked entities — skips it for free).
- Nametag suppression explicitly skipped for now (likely not visible in FP anyway once
  the pivot sits at the eyes — revisit if it turns out to peek through).
- `ANCHOR_DISTANCE` dropped from 2.0 to 0.0 so the mannequin's eyes sit at the camera
  position (was floating 2 blocks out front) — pulls the limbs back to align with where
  the real first-person body would be.
- Mannequin now mirrors the real player's main-hand/off-hand `ItemStack`s each frame
  (`setItemInHand`) so held items render on its arms via `ItemInHandLayer`, matching
  third person.

**Possibly still needs attention:**
- Verify in-game that `ANCHOR_DISTANCE = 0.0` actually aligns arm/leg position with where
  first-person hands/legs would visually sit — may need further tuning (a small negative
  pull-back isn't meaningful at the anchor level since 0 is already "at the camera"; if it
  still looks off, the fix is likely a translate offset applied post-pivot, not the anchor
  distance itself).
- Confirm nametag doesn't leak through in some edge case (e.g. spectator/other players
  seeing your mannequin — though this is local-only client-side rendering, so it should
  never be visible to other players in the first place; only the local viewer sees it).
- Dedicated-server multi-client check per `AGENTS.md` checklist: this feature is purely
  client-side cosmetic rendering (`Dist.CLIENT`-only, reads `Minecraft.getInstance()`),
  driven by the already-server-authoritative `ThirdPersonPosePayload`/animation trigger
  sync — no additional server authority/sync needed for the mannequin rendering itself.
