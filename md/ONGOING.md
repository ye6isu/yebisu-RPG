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
- **Second skin layer (jacket/sleeves/pants) on the mannequin.** Real root cause (found
  after two wrong theories): `PlayerRenderer.setModelProperties` sets
  `playermodel.jacket.visible = clientPlayer.isModelPartShown(PlayerModelPart.JACKET)`
  (and the same for hat/sleeves/pants) every frame, reading a synced byte
  (`Player.DATA_PLAYER_MODE_CUSTOMISATION`, the "Cape/Jacket/Sleeves/..." skin-layer
  toggles) that a **freshly constructed `RemotePlayer` defaults to `0`** — meaning
  every second-layer part starts permanently `visible = false` regardless of any
  `ModelPart` scale zeroing. The earlier fix (zeroing `jacket`/`*Sleeve`/`*Pants` scale
  in `yebisurpg$hideMannequinParts` alongside the inner limbs, since vanilla's
  `leftPants.copyFrom(leftLeg)` etc. run before our `@At("TAIL")` inject) was real and is
  kept, but was never the actual blocker — a bone with `visible = false` never reaches
  the point where its scale matters.
  - **Fix:** `ForceRenderCameraEntity.copyModelPartCustomisation(mc.player, mannequin)`
    copies the real player's `DATA_PLAYER_MODE_CUSTOMISATION` byte onto the mannequin
    every frame, alongside the existing held-item mirroring. No public getter/setter
    exists for this byte (only the public per-part `isModelPartShown` query) — resolved
    via one cached reflective `Field` lookup of `Player.DATA_PLAYER_MODE_CUSTOMISATION`
    at class-init time, then plain `EntityDataAccessor` get/set per frame (no reflection
    in the hot path).
  - `mixin/MixinPlayerModel.java`'s `@Shadow` fields (`jacket`/`leftSleeve`/`rightSleeve`/
    `leftPants`/`rightPants`) and the corresponding scale-zeroing in
    `yebisurpg$hideMannequinParts` are unrelated to this bug but still correct/needed —
    they control the sub-part *shape* while `isModelPartShown` controls whether the part
    draws *at all*; both must cooperate for the layer to actually disappear when the mask
    says to hide a limb.

- **"Hide Vanilla Arm" gate.** Went through three iterations before landing on the right
  target:
  1. First attempt gated `MixinPlayerModel`'s third-person `setupAnim` — wrong entirely,
     that path isn't visible to the local player in first person. Reverted.
  2. Second attempt gated `PlayerRenderer.renderRightHand`/`renderLeftHand` (cancellable
     `@At("HEAD")` injects in `MixinPlayerRenderer`) — correct target, but
     `ItemInHandRenderer.renderArmWithItem` only calls those for the **empty**-hand
     branch (`stack.isEmpty()`); a non-empty stack instead falls through to
     `renderItem(player, stack, ..., ItemDisplayContext.FIRST_PERSON_*, ...)` directly —
     no arm mesh call at all in vanilla's own held-item path, so this fix never touched
     anything while holding an item, and the item kept rendering (with its normal
     first-person hand/grip look) even with the gate checked.
  3. **Fix that stuck:** `renderArmWithItem` is the single per-hand entry point regardless
     of whether the stack is empty (it's what `renderHandsWithItems` calls for both main
     and off hand every frame). `MixinItemInHandRenderer` already had a cancellable
     `@At("HEAD")` inject there (`yebisurpg$cancelAnimatedHand`, originally only for the
     custom-hand-animation takeover case) — extended it to also cancel the whole call
     (arm mesh **and** held-item render together, since both live inside this one method)
     whenever `yebisurpg$hideVanillaArm(entityId, armIsRight)` is true for that hand.
     `armIsRight` is derived from `hand == MAIN_HAND` XNOR `player.getMainArm() == RIGHT`
     (same left/right-handedness mapping vanilla itself uses in `renderArmWithItem`).
     `yebisurpg$hideVanillaArm` reads the `ENTITY_THIRD_PERSON` playhead/pose (the
     mannequin's own animation slot — distinct from the `ENTITY` first-person-hand slot
     this class otherwise reads from for its own custom-animation renderer) via
     `AnimationPlayhead.hideVanillaRightArm()`/`hideVanillaLeftArm()` or the
     `ThirdPersonPosePayload` equivalent.
  - Net effect: with the gate checked, vanilla's ENTIRE render for that hand — bare arm
    or held item, doesn't matter which — is suppressed, so a floating item with no arm
    (which would look just as broken as a duplicate arm) never happens; the mannequin's
    mirrored item + arm (see `ForceRenderCameraEntity`) is the only thing shown for that
    hand.
  - `MixinPlayerRenderer`'s `renderRightHand`/`renderLeftHand` gate from step 2 is now
    redundant for this scenario (its call site is unreachable once `renderArmWithItem`
    is cancelled first) but harmless to keep as defense-in-depth for any other future
    caller of those methods.
  - **Made the gate independent of the mannequin's own `FP_RIGHT_ARM`/`FP_LEFT_ARM`
    bits.** `hideVanillaRightArm()`/`hideVanillaLeftArm()` originally required
    `(vanillaMoveMask & FP_RIGHT_ARM) != 0` (etc.) in addition to the hide bit — i.e. the
    gate only worked for a limb the mannequin was *also* showing. Removed that `&&`: the
    hide checkbox now suppresses vanilla's arm/item for that hand regardless of whether
    the mannequin is drawing anything there at all (e.g. hiding vanilla's left
    arm/held-item while "Show in First Person" is only ticked for the right arm — the
    left hand just goes fully blank instead of needing a mannequin limb to "replace" it
    with).

## Third Person Pose / Animation Blocky Blocks — Settings Cleanup

Follow-up pass on `anim.thirdperson.play` and `anim.tppose.set` (`blockDefs.js`) plus
their Java consumers, tightening up settings that either didn't belong on one of the two
blocks or were silently dead.

- **`anim.handpose.set`'s "Keep Position/Scale" checkbox removed entirely.** This is the
  *first-person hand pose* block (`AnimationCategory.ENTITY`, `HandPosePayload`) — distinct
  from `anim.tppose.set`'s own per-part "Keep Pose+Scale During Vanilla Action" mask, which
  was correctly left alone. Audited every reader of `HandPosePayload.keepPosScale()` and
  found none — only `allowVanillaActions()` was ever consumed
  (`MixinItemInHandRenderer`'s hand-skip check) — so this was pure dead UI wired to a
  payload field nothing read. Removed the checkbox from `blockDefs.js`, the `keepPosScale`
  parameter from `AnimationAPI.setFirstPersonHandPose` (collapsing back to the 4-arg
  overload), and the field/flag from `HandPosePayload`.
- **"Hand Skip (Fall Back to This Pose)" removed from `anim.tppose.set`.** Hand Skip only
  makes sense on the *animation* block: it lets a played animation skip an arm and fall
  back to whatever the persistent pose has set for it (`MixinPlayerModel`'s
  `rArmPoseFallback`/`lArmPoseFallback`, reading `HAND_SKIP_RIGHT`/`HAND_SKIP_LEFT` off
  the **animation's own** `vanillaMask()` via `playhead.vanillaMask()`). The pose's own
  copy of this checkbox group set bits in the pose's `vanillaMask` that no code ever
  read — confirmed via full audit of `HAND_SKIP_RIGHT`/`HAND_SKIP_LEFT` consumers before
  removing. UI-only removal; no Java changes needed since nothing consumed it.
- **Added Root Yaw/Pitch to "Look At (Camera)" on both blocks.** `LOOK_ROOT_YAW`/
  `LOOK_ROOT_PITCH` (bits 12/13) already existed in `AnimationPlayhead` and were already
  consumed in `MixinPlayerRenderer` (`yebisurpg$cancelProneRotation`,
  `yebisurpg$applyRootLock`) — but only ever read from `playhead.lookAtMask()`, so Root
  look-at silently only worked for the *animation* block, never the *pose* block, since
  the UI never exposed a way to set it and the Java never fell back to the pose's own
  `lookAtMask()` when no playhead was active. Fixed both: added a `Root` group (`Yaw`
  bit 4096 / `Pitch` bit 8192) to both blocks' `lookAtMask` checkbox groups in
  `blockDefs.js`, and both `MixinPlayerRenderer` call sites now fall back to
  `engine.getThirdPersonPosePayload(entityId).lookAtMask()` when `playhead == null`. The
  animation's own sampled "root bone" keyframe track (a separate feature from root
  look-at — literal position/rotation/scale curves baked into the animation file) is
  intentionally left animation-only (`if (playhead == null) return;` in
  `yebisurpg$applyRootLock`), since that wasn't part of this request.
- **"Allow Vanilla Actions" (per-arm, on `anim.tppose.set`) now also stands down
  Show-in-First-Person/Hide-Vanilla-Arm for that arm while the action is actually
  happening.** Previously, Allow Vanilla Actions only affected the *real third-person*
  arm (`MixinPlayerModel`'s `allowActMask`/`isPerformingVanillaAction` branch) — the
  first-person mannequin kept showing a frozen limb, and Hide Vanilla Arm kept
  suppressing vanilla's own first-person hand, even while the third-person arm had
  already yielded to vanilla's eating/swinging/use-item animation. Added
  `ThirdPersonPosePayload.isArmYieldingToVanillaAction(entity, right)` — true only when
  that arm's `allowActionsMask` bit (`VAN_RIGHT_ARM`/`VAN_LEFT_ARM`, reused from
  `AnimationPlayhead`) is set AND `entity.isUsingItem() || entity.swinging` — plus three
  derived methods built on it: `effectiveFirstPersonLimbMask(entity)` (masks out
  `FP_RIGHT_ARM`/`FP_LEFT_ARM` for a yielding arm), `effectiveHideVanillaRightArm(entity)`
  / `effectiveHideVanillaLeftArm(entity)` (suppressed to `false` while yielding). Wired
  into all three pose-path consumers in place of the raw (non-"effective") methods:
  `ForceRenderCameraEntity` (mannequin limb visibility), `MixinItemInHandRenderer`'s
  `yebisurpg$hideVanillaArm` (now takes the `LivingEntity` instead of a bare `entityId` so
  it can check `isUsingItem`/`swinging`), and `MixinPlayerRenderer`'s
  `yebisurpg$shouldHideVanillaArm`. Per-part and temporary by design — only the specific
  arm with the checkbox ticked is affected, and only while the action is actively
  happening; it reverts the instant `isUsingItem()`/`swinging` goes false, matching how
  Allow Vanilla Actions already behaves on the third-person side. The **animation**
  block's `anim.thirdperson.play` has no Allow Vanilla Actions setting at all (that's
  `anim.tppose.set`-only, hence this whole change is pose-only) so nothing changed there.
- **Found and fixed the actual bug: Allow Vanilla Actions never worked on the real
  third-person arm either, unless Keep Pose+Scale was ALSO checked for at least one
  part.** The above first-person fix assumed the third-person side was already correct
  (per the surrounding code comments), but testing (`allowActionsMask` = Right Arm only,
  `keepPosScaleMask = 0`, swinging) showed the arm stayed frozen in the pose instead of
  showing vanilla's swing. Root cause in `MixinPlayerModel.yebisurpg$applyThirdPersonAnim`:
  the entire per-part Allow-Actions/Keep-Pos-Scale block was gated on
  `performingAction && (keepPSMask & 0x3F) != 0 && anim != null` — requiring at least one
  part to have Keep Pos/Scale checked just to *enter* the block at all. With
  `keepPSMask == 0`, the block was skipped entirely, control fell through to the normal
  pose-application path below (gated only by `vanillaMask`'s "Let Vanilla Control", a
  different mask from `allowActionsMask`), and the pose silently reapplied on top of
  vanilla's already-written swing, overwriting it. Fixed by dropping the
  `(keepPSMask & 0x3F) != 0` clause from the guard — the block now runs whenever
  `performingAction` is true, and its second inner loop (`if (partAct) continue;` — "vanilla
  handles it, don't reapply the pose") now actually executes for allow-actions-but-no-
  keep-pos-scale parts, which was previously dead code trapped behind the same
  over-tight guard.
  - Confirmed (checked `old_mod`'s `MixinPlayerModel`) this exact bug also exists in
    `old_mod` — this is a genuine fix, not a faithful port of prior behavior. Old_mod's
    own inline comments ("we can't easily fall through to the main path for just some
    parts") show the same gate was always known to be awkward, but nobody had actually
    hit the allow-actions-without-keep-pos-scale case to notice it silently did nothing.
- **Mannequin no longer occluded by world geometry (blocks) between the camera and the
  anchor point.** Standing with your back to (or inside) a wall used to hide the
  mannequin behind it, unlike vanilla's real first-person hand/held item, which is never
  occluded this way.
  - **Attempt 1 (no effect): `RenderSystem.disableDepthTest()`/`enableDepthTest()`
    wrapped around just the `dispatcher.render(...)` call**, still at
    `RenderLevelStageEvent.Stage.AFTER_ENTITIES`. `PlayerModel`/`PlayerRenderer` draw via
    `RenderType.entitySolid`/`entityTranslucent`, and every `RenderType` carries its own
    `DepthTestStateShard` that force-calls `RenderSystem.enableDepthTest()` as part of
    its `setupState`, run when the buffer batch actually flushes — silently overriding
    whatever global depth-test state was set beforehand.
  - **Attempt 2 (broke arm rendering AND still didn't fix occlusion): moved the whole
    render to `RenderLevelStageEvent.Stage.AFTER_WEATHER`** (the last world-render stage)
    **and cleared the depth buffer right before drawing**, mirroring `GameRenderer`'s own
    clear-then-draw-hand pattern. Still failed — root cause understood after digging
    further: **every `RenderLevelStageEvent.Stage` fires from inside
    `LevelRenderer.renderLevel`, which runs entirely BEFORE `GameRenderer.render`'s own
    depth clear** (that clear + `renderItemInHand` happen strictly AFTER
    `renderLevel(...)` returns, at `GameRenderer.render` line ~1180-1183). So no
    `RenderLevelStageEvent` stage — not even the very last one — can ever be "after" that
    depth clear; the whole approach of trying to reach depth-clear immunity from inside
    `renderLevel` was fundamentally the wrong call site, not just a tuning problem.
  - **Fix that stuck: moved the mannequin draw entirely out of `RenderLevelStageEvent`
    and into `ItemInHandRenderer.renderHandsWithItems` itself** — the exact method
    `GameRenderer.renderItemInHand` calls (which only runs AFTER the depth clear).
    `ForceRenderCameraEntity`'s per-frame `RenderLevelStageEvent` subscriber was replaced
    with a plain static `ForceRenderCameraEntity.render(Camera, PoseStack,
    MultiBufferSource.BufferSource, int packedLight)` method, called from a new
    `@Inject(method = "renderHandsWithItems", at = @At("HEAD"))` in
    `MixinItemInHandRenderer` (`yebisurpg$renderMannequin`) using
    `Minecraft.getInstance().gameRenderer.getMainCamera()` in place of
    `RenderLevelStageEvent.getCamera()`/`getPoseStack()` — the position/rotation math
    itself needed reworking, not just the trigger point — see next entry.
  - **Declaration-order subtlety:** `yebisurpg$renderMannequin` is declared BEFORE the
    pre-existing `yebisurpg$renderFirstPersonHands` injector (also `@At("HEAD")` on the
    same method) in `MixinItemInHandRenderer` — Mixin applies same-target/same-`@At`
    injectors in declaration order by default, and `yebisurpg$renderFirstPersonHands` is
    `cancellable` (it `ci.cancel()`s the whole method when a custom first-person hand
    animation takes over from vanilla). Had the mannequin injector been declared second,
    it would silently stop rendering the mannequin any time a custom FP hand animation
    was also active, since a cancelled injected method skips every injector ordered
    after the one that cancelled it.
- **Follow-up bug from the above move: mannequin only showed while facing world
  north.** Root cause: `renderHandsWithItems`'s `poseStack` parameter (built in
  `GameRenderer.renderItemInHand` from `projectionMatrix.invert(...)`) has **no world
  rotation baked into it at all** — "forward" in this space is permanently -Z, always
  aligned with wherever the camera happens to be looking, unlike
  `RenderLevelStageEvent`'s PoseStack (true world axes, only camera-relative in
  *position*). The original position/rotation math assumed the latter (computed a
  world-space direction vector from `camYaw`/`camPitch`, then did a whole
  rotate-into-facing / rotate-back PoseStack dance so pitch applied around the model's
  own yaw). Passing real `camYaw` into this fundamentally different, yaw-agnostic space
  only coincidentally lined up when facing north (yaw ≈ 0), and produced a
  wrongly-rotated (usually off-screen or backwards) model everywhere else.
  - **Fix:** removed all yaw-related math entirely — there is nothing to compute, since
    the mannequin is anchored directly at the camera (no distance offset) and this
    space's forward axis already IS the camera's forward by construction. Position is
    just `(0, -eyeHeight, 0)` (feet-relative origin, offset down by eye height so the
    eyes land at the space's origin).
  - **Follow-up: pitch came out reversed, and the request was simplified to "just fix
    it rigidly to the camera view" instead of debugging the sign.** Since this render
    space has no world rotation baked in at all (see above) — including no pitch — the
    initial pitch-follow attempt (`poseStack.mulPose(Axis.XP.rotationDegrees(camPitch))`
    pivoted at eye height, mirroring the old `AFTER_ENTITIES`-era pitch-follow behavior)
    was reading `camPitch` correctly but applying it with the wrong sign convention for
    this space, and rather than chase the exact sign/axis fix, the pitch rotation was
    removed entirely: the mannequin is now fixed rigidly to the camera's view with zero
    yaw or pitch tilt of its own, exactly like vanilla's own first-person hand/held item
    (which also never tilts as you look up/down — only the arm's own animation moves
    it, not the camera's pitch).
  - `mannequin.yBodyRot`/`yHeadRot`/`setYRot` etc. are still fixed at `180f` (not `0f`) —
    `LivingEntityRenderer.setupRotations` applies `mulPose(YP.rotationDegrees(180 -
    yBodyRot))`, so at `yBodyRot = 0` the model is rotated 180° and ends up facing the
    opposite of this space's forward axis; `180f` cancels that built-in flip so the
    mannequin faces the same way the camera/player is actually looking.
  - The now-dead `ANCHOR_DISTANCE` constant (previously `0.0`, a leftover "push the
    mannequin N blocks in front of the camera along its look direction" knob from the
    old direction-vector math) was removed — nothing computes a direction vector
    anymore, so it had no effect and no way to meaningfully change behavior even before
    removal.

- **Fixed: "Let Vanilla Control" parts went static during a vanilla action, even though
  they were never meant to be touched by Allow Vanilla Actions at all.** Example: Right
  Arm has Allow Vanilla Actions checked (so vanilla's swing/eat/use-item plays on it
  during an action), while Torso/Legs have "Let Vanilla Control" checked (meant to let
  vanilla's normal walk/idle sway continue at all times, action or not). Once an action
  started, the Torso/Legs would freeze into the pose's static values instead of
  continuing their normal vanilla movement.
  - Root cause in `yebisurpg$applyThirdPersonAnim`'s per-part vanilla-action handling
    block (the same block touched by the two Allow-Vanilla-Actions fixes above): its
    second loop ("no allowAct, no keepPS — apply pose normally for this part") only
    checked `partKeep`/`partAct` before deciding to forcibly reset+re-pose a bone —
    it never looked at `vanMask` (`AnimationPlayhead.VAN_HEAD`/`VAN_TORSO`/etc., the
    "Let Vanilla Control" bits) at all. So the moment `performingAction` was true (any
    part had Allow Vanilla Actions and an action was happening), EVERY part without
    Allow Vanilla Actions got force-reposed by this loop — including parts that were
    supposed to be fully vanilla-controlled all along, since that setting lives in a
    completely different mask that this particular code path was blind to.
  - **Fix:** added a third skip condition, `partVan = (vanMask & PART_BITS[i]) != 0`,
    checked alongside `partKeep`/`partAct` — a part with "Let Vanilla Control" set is now
    left alone by this loop too (bone keeps whatever `super.setupAnim()`/vanilla already
    wrote into it that frame), matching how the normal (non-action) code path already
    treats `vanMask` everywhere else in this class. `PART_BITS` (`1,2,4,8,16,32`) and
    `VAN_HEAD`/`VAN_TORSO`/`VAN_RIGHT_ARM`/`VAN_LEFT_ARM`/`VAN_RIGHT_LEG`/`VAN_LEFT_LEG`
    already share the exact same bit values/ordering, so no remapping was needed —
    `vanMask & PART_BITS[i]` is a direct, correct per-part check.

**Possibly still needs attention:**
- Confirm nametag doesn't leak through in some edge case (e.g. spectator/other players
  seeing your mannequin — though this is local-only client-side rendering, so it should
  never be visible to other players in the first place; only the local viewer sees it).
- Dedicated-server multi-client check per `AGENTS.md` checklist: this feature is purely
  client-side cosmetic rendering (`Dist.CLIENT`-only, reads `Minecraft.getInstance()`),
  driven by the already-server-authoritative `ThirdPersonPosePayload`/animation trigger
  sync — no additional server authority/sync needed for the mannequin rendering itself.
