/**
 * advanced_combat_animator.js
 * Blockbench Plugin — yebisu RPG Combat Animation Suite
 *
 * Single-file standalone addon. Drop into:
 *   %APPDATA%/Blockbench/plugins/advanced_combat_animator.js
 * or load via File → Plugins → Load Plugin from File.
 *
 * ─── What this plugin does ────────────────────────────────────────────────────
 *
 *  A. SIDEBAR PANEL  (Animation mode)
 *     "YebisuRPG Animator" panel with four collapsible sections:
 *       1. First-Person Ghost Hands
 *       2. Custom 3D Armor Rigging
 *       3. Non-Humanoid Bone Registry
 *       4. Hurtbox Painter
 *
 *  B. FIRST-PERSON GHOST HANDS
 *     Injects a semi-transparent, unrenderable arm mesh group ("_ghost_hands")
 *     that mirrors default player skin UV layout.  Used as a visual anchor when
 *     positioning first-person item models and keyframing hand/arm movements.
 *
 *  C. CUSTOM 3D ARMOR RIGGING
 *     Auto-generates an outliner group tree:
 *       armor_rig → head / body / right_arm / left_arm / right_leg / left_leg / boots
 *     Each slot is a named group ready to receive imported geometry as sub-joints
 *     for independent keyframing (visor, exhaust fan, etc.).
 *
 *  D. NON-HUMANOID GENERIC BONE REGISTRY
 *     A string-based name→animState registry for custom quadrupeds, bosses, etc.
 *     Lets you declare abstract bone names ("wing_left_joint_2", "tail_segment_b")
 *     and tag them with mod-specific animation state IDs for the Java engine.
 *
 *  E. BEZIER / STEP SPEED RAMP EXPORTER
 *     Reads every keyframe channel (position, rotation, scale) and serialises the
 *     interpolation mode and bezier control-point data into a "_curves.json"
 *     sidecar alongside the main Bedrock animation export.
 *
 *  F. HURTBOX PAINTER
 *     Timeline tool that lets you mark a start-tick / end-tick window and
 *     optionally select a bone whose world-space arc is computed in real time.
 *     Exports a "<animId>_hurtbox.json" sidecar directly into
 *     src/main/resources/assets/yebisurpg/animations/ so the Java server
 *     reads it without any manual file copy step.
 *
 * ─── Blockbench API version ───────────────────────────────────────────────────
 *   Targets Blockbench 4.9+  (plugin API v2, Vue 3 reactive data).
 * ─────────────────────────────────────────────────────────────────────────────
 */

(() => {

// ═══════════════════════════════════════════════════════════════════════════════
// 0.  PLUGIN MANIFEST
// ═══════════════════════════════════════════════════════════════════════════════

const PLUGIN_ID      = 'advanced_combat_animator'
const PLUGIN_VERSION = '1.0.0'

// Absolute path to the mod's animation asset directory.
// Matches the path the Java loader reads from the JAR resource stream.
const ASSET_ANIM_DIR =
  'D:/Projects/Mods/yebisu-RPG/src/main/resources/assets/yebisurpg/animations'

// ═══════════════════════════════════════════════════════════════════════════════
// 1.  PLUGIN LIFECYCLE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Collect everything created so unload() can tear it all down cleanly. */
const _disposables = []

function addDisposable(d) { _disposables.push(d) }

/** Write a JSON file to disk (Electron / Node fs shim). */
function writeJson(absPath, data) {
  const fs = require('fs')
  const path = require('path')
  fs.mkdirSync(path.dirname(absPath), { recursive: true })
  fs.writeFileSync(absPath, JSON.stringify(data, null, 2), 'utf8')
}

/** Resolve the current animation's base name from the open model file path
 *  or fall back to the model identifier. */
function currentAnimId() {
  const anim = Animation.selected
  if (anim && anim.name) return anim.name.replace(/\s+/g, '_').toLowerCase()
  if (ModelMeta.name)    return ModelMeta.name.replace(/\s+/g, '_').toLowerCase()
  return 'unnamed_animation'
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2.  GHOST HANDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Injects a "_ghost_hands" outliner group containing two arm cube stubs
 * textured to the default Steve/Alex UV layout.  The group is marked with
 * a custom property so exporters can strip it from the final Bedrock JSON.
 */
function injectGhostHands() {
  if (Group.all.find(g => g.name === '_ghost_hands')) {
    Blockbench.showQuickMessage('Ghost hands already present.', 1500)
    return
  }

  Blockbench.createAction && void 0   // ensure action system is ready

  const group = new Group({ name: '_ghost_hands', visibility: true })
  group.extend({ yebisu_ghost: true })   // marker for export filter
  group.init()

  // Right arm stub  (Steve UV: x=40,y=16 on a 64×64 sheet)
  const rArm = new Cube({
    name:       '_ghost_right_arm',
    from:       [-3, 12, -2],
    to:         [-1, 24, 2],
    uv_offset:  [40, 16],
    visibility: true,
    color:      8                        // Blockbench slot colour (grey)
  })
  rArm.extend({ yebisu_ghost: true })
  rArm.addTo(group)
  rArm.init()

  // Left arm stub  (Steve UV: x=32,y=48)
  const lArm = new Cube({
    name:       '_ghost_left_arm',
    from:       [1, 12, -2],
    to:         [3, 24, 2],
    uv_offset:  [32, 48],
    visibility: true,
    color:      8
  })
  lArm.extend({ yebisu_ghost: true })
  lArm.addTo(group)
  lArm.init()

  // Make the group semi-transparent so it reads as a ghost overlay.
  // Blockbench does not expose per-group opacity natively; we tint via
  // the material colour which is visually distinct without blocking selection.
  group.color = 4    // light blue tint slot

  Canvas.updateAll()
  Blockbench.showQuickMessage('Ghost hands injected — keyframe against them!', 2500)
}

function removeGhostHands() {
  const ghosts = [...Group.all, ...Cube.all].filter(e => e.yebisu_ghost)
  if (!ghosts.length) { Blockbench.showQuickMessage('No ghost hands found.', 1500); return }
  Undo.initEdit({ elements: ghosts, outliner: true })
  ghosts.forEach(e => e.remove())
  Undo.finishEdit('Remove Ghost Hands')
  Canvas.updateAll()
  Blockbench.showQuickMessage('Ghost hands removed.', 1500)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3.  ARMOR RIGGING
// ═══════════════════════════════════════════════════════════════════════════════

const ARMOR_SLOTS = ['head', 'body', 'right_arm', 'left_arm', 'right_leg', 'left_leg', 'boots']

/**
 * Creates an "armor_rig" group tree in the outliner.
 * Each slot group is empty and ready for the user to import / paste their
 * custom armor geometry as a child.
 */
function buildArmorRig() {
  if (Group.all.find(g => g.name === 'armor_rig')) {
    Blockbench.showQuickMessage('"armor_rig" already exists — expand it in the outliner.', 2000)
    return
  }

  Undo.initEdit({ outliner: true })

  const root = new Group({ name: 'armor_rig' })
  root.extend({ yebisu_armor_rig: true })
  root.init()

  for (const slot of ARMOR_SLOTS) {
    const child = new Group({ name: slot })
    child.extend({ yebisu_armor_slot: slot })
    child.addTo(root)
    child.init()
  }

  Undo.finishEdit('Build Armor Rig')
  Canvas.updateAll()
  Blockbench.showQuickMessage('Armor rig created — import geometry into each slot group.', 2500)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4.  GENERIC BONE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * In-memory registry: Map<boneName, { animStateId, description }>
 * Persisted to model meta via a custom property so it survives save/reload.
 */
function getBoneRegistry() {
  if (!ModelMeta.yebisu_bone_registry) ModelMeta.yebisu_bone_registry = {}
  return ModelMeta.yebisu_bone_registry
}

function registerBone(boneName, animStateId, description = '') {
  const reg = getBoneRegistry()
  reg[boneName] = { animStateId, description, registeredAt: Date.now() }
  Blockbench.showQuickMessage(`Registered: ${boneName} → ${animStateId}`, 1800)
}

function unregisterBone(boneName) {
  const reg = getBoneRegistry()
  delete reg[boneName]
}

/** Opens a dialog to register the currently selected bone. */
function openRegisterBoneDialog() {
  const selected = Group.selected || Cube.selected[0]
  const defaultName = selected ? selected.name : ''

  new Dialog({
    id:    'yebisu_register_bone',
    title: 'Register Bone — Generic Bone Registry',
    form: {
      bone_name: {
        label:   'Bone Name',
        type:    'input',
        value:   defaultName,
        placeholder: 'e.g. wing_left_joint_2'
      },
      anim_state_id: {
        label:   'Animation State ID',
        type:    'input',
        value:   '',
        placeholder: 'e.g. WING_FLAP_LEFT'
      },
      description: {
        label:   'Description (optional)',
        type:    'input',
        value:   ''
      }
    },
    onConfirm(form) {
      const name = form.bone_name.trim()
      const id   = form.anim_state_id.trim()
      if (!name || !id) {
        Blockbench.showMessage('Both Bone Name and Animation State ID are required.', 'error')
        return
      }
      registerBone(name, id, form.description.trim())
    }
  }).show()
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5.  BEZIER / STEP CURVE EXPORTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interpolation mode string → our canonical key.
 * Blockbench stores interpolation as 'linear', 'catmullrom', 'bezier', or 'step'.
 */
function mapInterp(raw) {
  if (!raw) return 'linear'
  const r = raw.toLowerCase()
  if (r === 'step')        return 'step'
  if (r.includes('bezier')) return 'bezier'
  return 'linear'
}

/**
 * Reads every keyframe in every animator of the selected animation and
 * serialises position / rotation / scale channels with their interpolation
 * type and, for bezier frames, the control-point vectors.
 *
 * Output: "<animId>_curves.json" written to ASSET_ANIM_DIR.
 *
 * Schema per channel entry:
 * {
 *   "bone":    "right_arm",
 *   "channel": "rotation",          // "position" | "rotation" | "scale"
 *   "frames": [
 *     { "time": 0.0,  "interp": "linear",  "value": [rx, ry, rz] },
 *     { "time": 0.25, "interp": "bezier",
 *       "value":       [rx, ry, rz],
 *       "left_handle":  [lx, ly, lz],
 *       "right_handle": [rx2, ry2, rz2] },
 *     { "time": 0.5,  "interp": "step",   "value": [rx, ry, rz] }
 *   ]
 * }
 */
function exportCurves() {
  const anim = Animation.selected
  if (!anim) { Blockbench.showMessage('Select an animation first.', 'error'); return }

  const channels = []

  for (const [boneName, animator] of Object.entries(anim.animators)) {
    for (const channel of ['position', 'rotation', 'scale']) {
      const kfs = animator[channel]
      if (!kfs || !kfs.length) continue

      const frames = kfs.map(kf => {
        const entry = {
          time:   Math.round(kf.time * 1000) / 1000,   // 3-decimal seconds
          interp: mapInterp(kf.interpolation),
          value:  Array.isArray(kf.data_points[0])
                    ? kf.data_points[0].map(Number)
                    : Object.values(kf.data_points[0] || {}).map(Number)
        }
        // Bezier handles — stored by Blockbench as kf.bezier_left_time/value etc.
        if (entry.interp === 'bezier' && kf.bezier_left_time !== undefined) {
          entry.left_handle_time  = kf.bezier_left_time
          entry.left_handle       = Array.isArray(kf.bezier_left_value)
                                      ? kf.bezier_left_value.map(Number)
                                      : [0, 0, 0]
          entry.right_handle_time = kf.bezier_right_time
          entry.right_handle      = Array.isArray(kf.bezier_right_value)
                                      ? kf.bezier_right_value.map(Number)
                                      : [0, 0, 0]
        }
        return entry
      })

      if (frames.length) channels.push({ bone: boneName, channel, frames })
    }
  }

  if (!channels.length) { Blockbench.showMessage('No keyframe data found.', 'error'); return }

  const animId = currentAnimId()
  const output = {
    animation_id: animId,
    exported_at:  new Date().toISOString(),
    channels
  }

  const dest = `${ASSET_ANIM_DIR}/${animId}_curves.json`
  try {
    writeJson(dest, output)
    Blockbench.showQuickMessage(`Curves exported → ${animId}_curves.json`, 3000)
  } catch (e) {
    Blockbench.showMessage(`Write failed: ${e.message}`, 'error')
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6.  HURTBOX PAINTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Per-session hurtbox window list.  Each entry:
 * {
 *   id:         number          (monotonic, for list key)
 *   startTick:  number
 *   endTick:    number
 *   damage:     number          (half-hearts)
 *   boneName:   string          (bone whose tip is traced for path points)
 *   pathPoints: [{x,y,z}, ...]  (computed or manually entered)
 *   label:      string          (optional human note)
 * }
 */
const hurtboxWindows = []
let   hbNextId = 1

/**
 * Compute the world-space tip position of a named bone at a given animation
 * time by evaluating the bone's rotation/position keyframes at that time.
 *
 * This is a simplified linear-interpolation sampler — enough to produce
 * representative path points for most melee arcs.  For high-accuracy Bezier
 * curves the user should manually adjust the emitted path_points array in
 * the exported JSON.
 *
 * @param  {Animation} anim
 * @param  {string}    boneName
 * @param  {number}    timeSec   animation time in seconds
 * @returns {THREE.Vector3|null}
 */
function sampleBoneTipAtTime(anim, boneName, timeSec) {
  const animator = anim.animators[boneName]
  if (!animator) return null

  function sampleChannel(channel) {
    const kfs = animator[channel]
    if (!kfs || !kfs.length) return [0, 0, 0]
    // Find surrounding keyframes
    let prev = kfs[0], next = kfs[kfs.length - 1]
    for (let i = 0; i < kfs.length - 1; i++) {
      if (kfs[i].time <= timeSec && kfs[i + 1].time >= timeSec) {
        prev = kfs[i]; next = kfs[i + 1]; break
      }
    }
    const span = next.time - prev.time
    const t    = span < 0.0001 ? 0 : (timeSec - prev.time) / span
    const pv   = Object.values(prev.data_points[0] || {}).map(Number)
    const nv   = Object.values(next.data_points[0] || {}).map(Number)
    return pv.map((v, i) => v + (nv[i] - v) * t)
  }

  const rot = sampleChannel('rotation')
  const pos = sampleChannel('position')

  // Approximate tip offset: assume the bone group has a bounding box and
  // offset in +Y by half its height.  Users can edit the JSON for precision.
  const group = Group.all.find(g => g.name === boneName)
  const tipOffset = group ? group.size(true) * 0.5 : 8

  // Rotate the tip vector by the sampled rotation (simplified Y-axis only
  // for horizontal weapon arcs — the most common case).
  const yRad = (rot[1] || 0) * Math.PI / 180
  const tx   = Math.sin(yRad) * tipOffset / 16  // convert Blockbench px→blocks
  const ty   = (pos[1] || 0) / 16 + tipOffset / 16
  const tz   = Math.cos(yRad) * tipOffset / 16

  return { x: +tx.toFixed(4), y: +ty.toFixed(4), z: +tz.toFixed(4) }
}

/**
 * Compute path points for a hurtbox window by sampling the named bone's tip
 * at each integer tick between startTick and endTick.
 */
function computePathPoints(anim, boneName, startTick, endTick) {
  const FPS   = 20                          // server tick rate
  const points = []
  for (let tick = startTick; tick <= endTick; tick++) {
    const timeSec = tick / FPS
    const pt = sampleBoneTipAtTime(anim, boneName, timeSec)
    if (pt) points.push(pt)
  }
  // Deduplicate consecutive identical points to keep the sidecar compact.
  return points.filter((p, i) =>
    i === 0 ||
    p.x !== points[i - 1].x ||
    p.y !== points[i - 1].y ||
    p.z !== points[i - 1].z
  )
}

/** Opens the "Add Hurtbox Window" dialog. */
function openAddHurtboxDialog() {
  const anim = Animation.selected
  if (!anim) { Blockbench.showMessage('Select an animation first.', 'error'); return }

  const boneNames = Object.keys(anim.animators)
  const boneOptions = Object.fromEntries(boneNames.map(n => [n, n]))

  new Dialog({
    id:    'yebisu_add_hurtbox',
    title: 'Add Hurtbox Window',
    form: {
      startTick: {
        label:       'Start Tick',
        type:        'number',
        value:       0,
        min:         0,
        description: 'First animation-relative server tick (20 TPS) where the hitbox is active.'
      },
      endTick: {
        label:       'End Tick',
        type:        'number',
        value:       4,
        min:         1,
        description: 'Last tick (inclusive) where the hitbox is active.'
      },
      damage: {
        label:       'Damage (half-hearts)',
        type:        'number',
        value:       4,
        min:         0.5,
        step:        0.5,
        description: 'Flat damage applied to each struck entity.'
      },
      boneName: {
        label:       'Weapon Bone (tip tracing)',
        type:        'select',
        options:     { '': '— Manual path points only —', ...boneOptions },
        value:       '',
        description: 'The bone whose world-space arc is sampled for path points.'
      },
      label: {
        label:       'Label (optional)',
        type:        'input',
        value:       '',
        placeholder: 'e.g. "heavy swing phase"'
      }
    },
    onConfirm(form) {
      const start  = Math.round(form.startTick)
      const end    = Math.round(form.endTick)
      const dmg    = form.damage

      if (end <= start) {
        Blockbench.showMessage('End Tick must be greater than Start Tick.', 'error')
        return
      }

      const points = form.boneName
        ? computePathPoints(anim, form.boneName, start, end)
        : []

      if (form.boneName && !points.length) {
        Blockbench.showMessage(
          `No keyframe data found for bone "${form.boneName}". ` +
          'The window will be created with empty path_points — edit the JSON manually.',
          'info'
        )
      }

      hurtboxWindows.push({
        id:         hbNextId++,
        startTick:  start,
        endTick:    end,
        damage:     dmg,
        boneName:   form.boneName || '',
        pathPoints: points,
        label:      form.label.trim()
      })

      Blockbench.showQuickMessage(
        `Window added: ticks ${start}–${end}, ${dmg} dmg${points.length ? `, ${points.length} path pts` : ''}`,
        2500
      )
    }
  }).show()
}

function removeHurtboxWindow(id) {
  const idx = hurtboxWindows.findIndex(w => w.id === id)
  if (idx !== -1) {
    hurtboxWindows.splice(idx, 1)
    Blockbench.showQuickMessage('Hurtbox window removed.', 1500)
  }
}

/**
 * Writes the _hurtbox.json sidecar to ASSET_ANIM_DIR.
 *
 * Output schema (matches AnimationEventHooks.parseHurtboxWindows):
 * {
 *   "animation_id": "attack_slash",
 *   "exported_at":  "2026-06-09T...",
 *   "windows": [
 *     {
 *       "start_tick":  4,
 *       "end_tick":    9,
 *       "damage":      4.0,
 *       "bone_source": "right_arm_weapon",
 *       "label":       "heavy swing phase",
 *       "path_points": [ {"x":0.3,"y":1.2,"z":0.0}, ... ]
 *     }
 *   ]
 * }
 */
function exportHurtboxSidecar() {
  if (!hurtboxWindows.length) {
    Blockbench.showMessage('No hurtbox windows defined — add at least one first.', 'error')
    return
  }

  const animId = currentAnimId()

  const output = {
    animation_id: animId,
    exported_at:  new Date().toISOString(),
    windows: hurtboxWindows.map(w => ({
      start_tick:  w.startTick,
      end_tick:    w.endTick,
      damage:      w.damage,
      bone_source: w.boneName || null,
      label:       w.label    || null,
      path_points: w.pathPoints
    }))
  }

  const dest = `${ASSET_ANIM_DIR}/${animId}_hurtbox.json`
  try {
    writeJson(dest, output)
    Blockbench.showQuickMessage(
      `Hurtbox sidecar exported → ${animId}_hurtbox.json  (${hurtboxWindows.length} window${hurtboxWindows.length > 1 ? 's' : ''})`,
      3500
    )
  } catch (e) {
    Blockbench.showMessage(`Write failed: ${e.message}\n\nEnsure the asset directory exists.`, 'error')
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7.  SIDEBAR PANEL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds the reactive HTML content rendered inside the panel.
 * Blockbench sidebar panels accept a Vue SFC-style options object; we use the
 * template string approach which is the most widely compatible across BB 4.x.
 */
function buildPanelComponent() {
  // Vue.defineComponent() is required by BB 4.9's Panel validator.
  // A raw options object passes syntax checks but fails the runtime
  // component identity assertion that fires before onload completes.
  return Vue.defineComponent({
    template: `
      <div class="yebisu-panel">

        <!-- ── Section: Ghost Hands ─────────────────────────────────────── -->
        <div class="yebisu-section">
          <div class="yebisu-section-header" @click="toggle('ghost')">
            <label>👻 First-Person Ghost Hands</label>
            <span>{{ open.ghost ? '▲' : '▼' }}</span>
          </div>
          <div v-if="open.ghost" class="yebisu-section-body">
            <p class="yebisu-hint">
              Injects a semi-transparent arm mesh aligned to the default player skin UV.
              Use it as an anchor when positioning first-person item models.
            </p>
            <div class="yebisu-row">
              <bb-button @click="injectGhost">Inject Ghost Hands</bb-button>
              <bb-button @click="removeGhost" color="danger">Remove</bb-button>
            </div>
          </div>
        </div>

        <!-- ── Section: Armor Rigging ────────────────────────────────────── -->
        <div class="yebisu-section">
          <div class="yebisu-section-header" @click="toggle('armor')">
            <label>🛡️ Custom 3D Armor Rigging</label>
            <span>{{ open.armor ? '▲' : '▼' }}</span>
          </div>
          <div v-if="open.armor" class="yebisu-section-body">
            <p class="yebisu-hint">
              Generates an <strong>armor_rig</strong> outliner group with slots for
              head / body / arms / legs / boots. Import your geometry into each slot
              for independent keyframing.
            </p>
            <bb-button @click="buildArmor" wide>Build Armor Rig</bb-button>
            <div v-if="armorSlotInfo" class="yebisu-info">
              Slots: {{ armorSlots.join(', ') }}
            </div>
          </div>
        </div>

        <!-- ── Section: Bone Registry ────────────────────────────────────── -->
        <div class="yebisu-section">
          <div class="yebisu-section-header" @click="toggle('bones')">
            <label>🦴 Non-Humanoid Bone Registry</label>
            <span>{{ open.bones ? '▲' : '▼' }}</span>
          </div>
          <div v-if="open.bones" class="yebisu-section-body">
            <p class="yebisu-hint">
              Map custom bone names to mod animation state IDs for quadrupeds,
              bosses, and multi-jointed entities.
            </p>
            <bb-button @click="openRegisterDialog" wide>Register Selected Bone</bb-button>
            <div class="yebisu-registry-list" v-if="registryEntries.length">
              <div
                v-for="entry in registryEntries"
                :key="entry.bone"
                class="yebisu-registry-row"
              >
                <span class="yebisu-bone-name">{{ entry.bone }}</span>
                <span class="yebisu-arrow">→</span>
                <span class="yebisu-state-id">{{ entry.animStateId }}</span>
                <button class="yebisu-remove-btn" @click="removeReg(entry.bone)">✕</button>
              </div>
            </div>
            <p v-else class="yebisu-empty">No bones registered yet.</p>
          </div>
        </div>

        <!-- ── Section: Hurtbox Painter ─────────────────────────────────── -->
        <div class="yebisu-section">
          <div class="yebisu-section-header" @click="toggle('hurtbox')">
            <label>⚔️ Hurtbox Painter</label>
            <span>{{ open.hurtbox ? '▲' : '▼' }}</span>
          </div>
          <div v-if="open.hurtbox" class="yebisu-section-body">
            <p class="yebisu-hint">
              Define damage windows tied to animation ticks.  The plugin traces
              the selected bone's world-space arc and embeds path points directly
              into the <code>_hurtbox.json</code> sidecar your Java server reads.
            </p>
            <div class="yebisu-row">
              <bb-button @click="addWindow">+ Add Window</bb-button>
              <bb-button @click="exportHurtbox" color="primary">Export Sidecar</bb-button>
            </div>

            <!-- Window list -->
            <div v-if="windows.length" class="yebisu-hb-list">
              <div
                v-for="w in windows"
                :key="w.id"
                class="yebisu-hb-row"
              >
                <div class="yebisu-hb-meta">
                  <span class="yebisu-hb-ticks">⏱ {{ w.startTick }}–{{ w.endTick }}</span>
                  <span class="yebisu-hb-dmg">⚔ {{ w.damage }} hp</span>
                  <span v-if="w.boneName" class="yebisu-hb-bone">🦴 {{ w.boneName }}</span>
                  <span class="yebisu-hb-pts">{{ w.pathPoints.length }} pts</span>
                </div>
                <div v-if="w.label" class="yebisu-hb-label">{{ w.label }}</div>
                <button class="yebisu-remove-btn" @click="removeWindow(w.id)">✕</button>
              </div>
            </div>
            <p v-else class="yebisu-empty">No hurtbox windows defined.</p>

            <!-- Curve exporter lives here too as a logical grouping -->
            <div class="yebisu-subsection">
              <label>Keyframe Curve Data</label>
              <bb-button @click="exportCurveData" wide>Export _curves.json</bb-button>
              <p class="yebisu-hint" style="margin-top:4px">
                Serialises linear / step / bezier interpolation data for every
                keyframe channel into a sidecar the Java engine can reference.
              </p>
            </div>
          </div>
        </div>

      </div>
    `,

    // ── Reactive state ─────────────────────────────────────────────────────
    data() {
      return {
        open: { ghost: true, armor: false, bones: false, hurtbox: false },
        armorSlotInfo: false,
        armorSlots:    ARMOR_SLOTS,
        registryEntries: [],
        windows:       hurtboxWindows     // direct reference — reactive via Vue
      }
    },

    mounted() {
      this.refreshRegistry()
    },

    beforeUnmount() {},

    methods: {
      toggle(section) {
        this.open[section] = !this.open[section]
      },

      // Ghost hands
      injectGhost()  { injectGhostHands() },
      removeGhost()  { removeGhostHands() },

      // Armor rig
      buildArmor() {
        buildArmorRig()
        this.armorSlotInfo = true
      },

      // Bone registry
      openRegisterDialog() {
        openRegisterBoneDialog()
        this.$nextTick(() => this.refreshRegistry())
      },
      removeReg(bone) {
        unregisterBone(bone)
        this.refreshRegistry()
      },
      refreshRegistry() {
        const reg = getBoneRegistry()
        this.registryEntries = Object.entries(reg).map(([bone, v]) => ({
          bone,
          animStateId: v.animStateId,
          description: v.description
        }))
      },

      // Hurtbox painter
      addWindow() {
        openAddHurtboxDialog()
        // windows array is the same reference as hurtboxWindows — Vue sees updates
        // after the dialog closes because we push() into it.
        this.$nextTick(() => this.$forceUpdate())
      },
      removeWindow(id) {
        removeHurtboxWindow(id)
        this.$forceUpdate()
      },
      exportHurtbox() { exportHurtboxSidecar() },

      // Curve exporter
      exportCurveData() { exportCurves() }
    }
  })  // end Vue.defineComponent
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8.  PANEL STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const PANEL_CSS = `
  .yebisu-panel               { padding: 4px 0; }
  .yebisu-section             { margin-bottom: 6px; border: 1px solid var(--color-border); border-radius: 4px; overflow: hidden; }
  .yebisu-section-header      { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--color-back); cursor: pointer; user-select: none; }
  .yebisu-section-header:hover{ background: var(--color-selected); }
  .yebisu-section-header label{ font-weight: 600; font-size: 12px; cursor: pointer; }
  .yebisu-section-body        { padding: 8px 10px; }
  .yebisu-hint                { font-size: 11px; color: var(--color-subtle); margin: 0 0 6px; line-height: 1.4; }
  .yebisu-row                 { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
  .yebisu-subsection          { margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--color-border); }
  .yebisu-subsection > label  { font-size: 11px; font-weight: 600; display: block; margin-bottom: 4px; }
  .yebisu-empty               { font-size: 11px; color: var(--color-subtle); font-style: italic; margin: 4px 0 0; }
  .yebisu-info                { font-size: 10px; color: var(--color-subtle); margin-top: 4px; }

  .yebisu-registry-list       { margin-top: 6px; display: flex; flex-direction: column; gap: 3px; }
  .yebisu-registry-row        { display: flex; align-items: center; gap: 4px; font-size: 11px; background: var(--color-back); padding: 3px 6px; border-radius: 3px; }
  .yebisu-bone-name           { color: var(--color-accent); font-family: monospace; }
  .yebisu-arrow               { color: var(--color-subtle); }
  .yebisu-state-id            { flex: 1; color: var(--color-text); font-family: monospace; font-size: 10px; }

  .yebisu-hb-list             { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }
  .yebisu-hb-row              { background: var(--color-back); border: 1px solid var(--color-border); border-radius: 3px; padding: 5px 8px; position: relative; }
  .yebisu-hb-meta             { display: flex; gap: 8px; font-size: 11px; flex-wrap: wrap; }
  .yebisu-hb-ticks            { color: var(--color-accent); }
  .yebisu-hb-dmg              { color: #e06c75; }
  .yebisu-hb-bone             { color: #61afef; }
  .yebisu-hb-pts              { color: var(--color-subtle); }
  .yebisu-hb-label            { font-size: 10px; color: var(--color-subtle); margin-top: 2px; font-style: italic; }

  .yebisu-remove-btn          { margin-left: auto; background: none; border: none; color: var(--color-subtle); cursor: pointer; font-size: 12px; padding: 0 2px; }
  .yebisu-remove-btn:hover    { color: #e06c75; }
`

// ═══════════════════════════════════════════════════════════════════════════════
// 9.  PLUGIN REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

BBPlugin.register(PLUGIN_ID, {
  title:       'YebisuRPG Combat Animator',
  author:      'yebisu',
  description: 'Unified workspace suite for custom mob animations, 3D armor rigging, ' +
               'multi-part item rigs, Bezier/step curve export, and server-authoritative ' +
               'hurtbox sidecar generation.',
  version:     PLUGIN_VERSION,
  variant:     'desktop',             // requires Electron (file system access)
  min_version: '4.9.0',

  onload() {
    // ── Inject panel stylesheet ─────────────────────────────────────────────
    const style = document.createElement('style')
    style.id    = `${PLUGIN_ID}_styles`
    style.textContent = PANEL_CSS
    document.head.appendChild(style)
    addDisposable({ dispose: () => style.remove() })

    // ── Register sidebar panel ───────────────────────────────────────────────
    const panel = new Panel('yebisu_combat_animator', {
      name:         'YebisuRPG Animator',
      icon:         'sports_martial_arts',
      condition:    { modes: ['animate'] },   // visible only in Animation mode
      default_side: 'left',
      component:    buildPanelComponent()
    })
    addDisposable(panel)

    // ── Register menu actions (also accessible via right-click / menu bar) ──
    const actionGhostInject = new Action(`${PLUGIN_ID}_ghost_inject`, {
      name:    'Inject Ghost Hands',
      icon:    'visibility',
      category: 'yebisu_rpg',
      click:   injectGhostHands
    })
    const actionGhostRemove = new Action(`${PLUGIN_ID}_ghost_remove`, {
      name:    'Remove Ghost Hands',
      icon:    'visibility_off',
      category: 'yebisu_rpg',
      click:   removeGhostHands
    })
    const actionArmorRig = new Action(`${PLUGIN_ID}_armor_rig`, {
      name:    'Build Armor Rig',
      icon:    'shield',
      category: 'yebisu_rpg',
      click:   buildArmorRig
    })
    const actionRegBone = new Action(`${PLUGIN_ID}_reg_bone`, {
      name:    'Register Selected Bone',
      icon:    'linear_scale',
      category: 'yebisu_rpg',
      click:   openRegisterBoneDialog
    })
    const actionAddHurtbox = new Action(`${PLUGIN_ID}_add_hurtbox`, {
      name:    'Add Hurtbox Window',
      icon:    'crop_square',
      category: 'yebisu_rpg',
      click:   openAddHurtboxDialog
    })
    const actionExportHurtbox = new Action(`${PLUGIN_ID}_export_hurtbox`, {
      name:    'Export Hurtbox Sidecar',
      icon:    'save',
      category: 'yebisu_rpg',
      click:   exportHurtboxSidecar
    })
    const actionExportCurves = new Action(`${PLUGIN_ID}_export_curves`, {
      name:    'Export Curve Data',
      icon:    'timeline',
      category: 'yebisu_rpg',
      click:   exportCurves
    })

    const actions = [
      actionGhostInject, actionGhostRemove, actionArmorRig,
      actionRegBone, actionAddHurtbox, actionExportHurtbox, actionExportCurves
    ]
    actions.forEach(a => addDisposable(a))

    // ── Top-level menu entry ─────────────────────────────────────────────────
    // BB 5.x Menu() requires instantiated Action objects, not ID strings.
    // Build the children array from the already-instantiated action variables,
    // then register the menu entry using the documented MenuBar structure.
    const pluginMenu = new Menu(actions)
    pluginMenu.addAction(actionExportHurtbox, 'action')

    MenuBar.menus['yebisu_rpg'] = {
      id:        'yebisu_rpg',
      name:      'YebisuRPG',
      label:     'YebisuRPG',
      menu:      pluginMenu,
      conditionMet() { return true }
    }
    MenuBar.update()
    addDisposable({
      dispose() {
        delete MenuBar.menus['yebisu_rpg']
        MenuBar.update()
      }
    })

    console.log(`[${PLUGIN_ID}] v${PLUGIN_VERSION} loaded.`)
  },

  onunload() {
    _disposables.reverse().forEach(d => {
      if (typeof d.dispose  === 'function') d.dispose()
      else if (typeof d.delete === 'function') d.delete()
      else if (typeof d.remove === 'function') d.remove()
    })
    _disposables.length = 0
    hurtboxWindows.length = 0
    hbNextId = 1
    console.log(`[${PLUGIN_ID}] unloaded.`)
  }
})

})() // end IIFE
