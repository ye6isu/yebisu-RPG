/**
 * yebisu_fp_camera.js — First-Person Preview Utility
 * Load via File → Plugins → Load Plugin from File.
 */

(() => {

const PLUGIN_ID    = 'yebisu_fp_camera'
const EYE_POS      = new THREE.Vector3(0, 27, 4)
const LOOK_AT      = new THREE.Vector3(0, 27, -96)
const FIXED_ASPECT = 16 / 9
const FIXED_VFOV   = 2 * Math.atan(Math.tan((70 * Math.PI / 180) / 2) * (9 / 16)) * (180 / Math.PI)

let _fpWin = null   // floating popup state
const _disposables = []

function getPreview() { return Preview.selected || Preview.all[0] }

// ── Floating 16:9 popup ───────────────────────────────────────────────────────

function openFPWindow() {
  if (_fpWin) { _fpWin.wrap.style.display = 'flex'; return }

  const scene = Canvas.scene
  if (!scene) { Blockbench.showQuickMessage('Canvas.scene not ready.', 1500); return }

  // ── Wrapper ──
  const wrap = document.createElement('div')
  wrap.id = `${PLUGIN_ID}_popup`
  wrap.style.cssText = `
    position: fixed;
    top: 60px; left: 50%; transform: translateX(-50%);
    width: 960px; height: 568px;
    background: #111;
    border: none;
    border-radius: 0;
    overflow: hidden;
    z-index: 99999;
    box-shadow: 0 8px 32px rgba(0,0,0,0.8);
    display: flex;
    flex-direction: column;
    user-select: none;
  `

  // ── Title bar ──
  const bar = document.createElement('div')
  bar.style.cssText = `
    height: 28px; flex-shrink: 0;
    background: rgba(0,0,0,0.7);
    border-bottom: 1px solid #333;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 8px; cursor: move;
  `
  const lbl = document.createElement('span')
  lbl.textContent = '👁  FP Preview — 16:9'
  lbl.style.cssText = `font-size:11px; font-family:monospace; color:#ccc;`

  const closeBtn = document.createElement('button')
  closeBtn.textContent = '✕'
  closeBtn.style.cssText = `
    background: none; border: none; color: #aaa;
    cursor: pointer; font-size: 14px; line-height: 1;
    padding: 2px 4px; border-radius: 3px;
  `
  closeBtn.onmouseenter = () => closeBtn.style.color = '#fff'
  closeBtn.onmouseleave = () => closeBtn.style.color = '#aaa'
  closeBtn.onclick = closeFPWindow

  bar.appendChild(lbl)
  bar.appendChild(closeBtn)

  // ── Canvas ──
  const canvas = document.createElement('canvas')
  canvas.style.cssText = `display: block; width: 100%; flex: 1;`

  // ── Resize handle ──
  const handle = document.createElement('div')
  handle.style.cssText = `
    position: absolute; right: 0; bottom: 0;
    width: 16px; height: 16px; cursor: se-resize;
    background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.2) 50%);
  `

  wrap.appendChild(bar)
  wrap.appendChild(canvas)
  wrap.appendChild(handle)
  document.body.appendChild(wrap)

  // ── Three.js renderer ──
  const popRenderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  popRenderer.setPixelRatio(window.devicePixelRatio)

  const popCam = new THREE.PerspectiveCamera(FIXED_VFOV, FIXED_ASPECT, 0.1, 10000)
  popCam.position.copy(EYE_POS)
  popCam.lookAt(LOOK_AT)

  function sizeRenderer() {
    const w = wrap.clientWidth
    const h = Math.round(w / FIXED_ASPECT)
    canvas.width  = Math.round(w * window.devicePixelRatio)
    canvas.height = Math.round(h * window.devicePixelRatio)
    popRenderer.setSize(w, h, false)
    popCam.aspect = FIXED_ASPECT
    popCam.updateProjectionMatrix()
  }
  sizeRenderer()

  // ── Render loop ──
  let rafId = null
  function loop() {
    if (!_fpWin) return
    popCam.position.copy(EYE_POS)
    popCam.lookAt(LOOK_AT)
    popRenderer.render(scene, popCam)
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)

  // ── Drag via title bar ──
  bar.addEventListener('mousedown', e => {
    if (e.target === closeBtn) return
    const rect = wrap.getBoundingClientRect()
    let ox = e.clientX - rect.left
    let oy = e.clientY - rect.top
    wrap.style.transform = 'none'
    const onMove = e => {
      wrap.style.left = (e.clientX - ox) + 'px'
      wrap.style.top  = (e.clientY - oy) + 'px'
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  })

  // ── Resize handle — enforces 16:9 ──
  handle.addEventListener('mousedown', e => {
    e.preventDefault()
    const startX = e.clientX
    const startW = wrap.clientWidth
    const onMove = e => {
      const newW = Math.max(320, startW + (e.clientX - startX))
      const newH = Math.round(newW / FIXED_ASPECT) + 28  // +28 for title bar
      wrap.style.width  = newW + 'px'
      wrap.style.height = newH + 'px'
      sizeRenderer()
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  })

  _fpWin = { wrap, popRenderer, rafId }
}

function closeFPWindow() {
  if (!_fpWin) return
  cancelAnimationFrame(_fpWin.rafId)
  _fpWin.popRenderer.dispose()
  _fpWin.wrap.remove()
  _fpWin = null
}

function toggleFPWindow() {
  if (_fpWin) closeFPWindow()
  else        openFPWindow()
}

// ── Plugin ────────────────────────────────────────────────────────────────────

BBPlugin.register(PLUGIN_ID, {
  title: 'FP Preview', author: 'yebisu',
  description: 'Floating 16:9 first-person preview window.',
  version: '4.0.0', min_version: '4.9.0', variant: 'desktop',

  onload() {
    const style = document.createElement('style')
    style.id = `${PLUGIN_ID}_style`
    style.textContent = `
      .yfp-panel       { padding: 8px }
      .yfp-hint        { font-size:11px; color:var(--color-subtle); margin:0 0 10px; line-height:1.5 }
      .yfp-hint code   { background:var(--color-back); padding:1px 4px; border-radius:3px; font-size:10px }
      .yfp-btn         { width:100%; padding:7px; cursor:pointer; font-weight:600; font-size:12px; border-radius:4px; border:none }
      .yfp-btn.off     { background:var(--color-accent); color:#fff }
      .yfp-btn.on      { background:#e06c75; color:#fff }
      .yfp-btn:hover   { opacity:.85 }
      .yfp-meta        { margin-top:10px; font-size:10px; color:var(--color-subtle); line-height:1.8 }
      .yfp-meta strong { color:var(--color-text) }
    `
    document.head.appendChild(style)
    _disposables.push({ dispose: () => style.remove() })

    const panel = new Panel(`${PLUGIN_ID}_panel`, {
      name: 'FP Preview', icon: 'visibility',
      condition: { modes: ['animate'] },
      default_side: 'left',
      component: Vue.defineComponent({
        template: `
          <div class="yfp-panel">
            <p class="yfp-hint">
              Opens a floating 16:9 window rendering Minecraft's exact
              first-person hand camera.<br>
              Eye at <code>root</code> [0,27,4] · 70° hFOV · –Z direction.
            </p>
            <button class="yfp-btn" :class="open ? 'on' : 'off'" @click="doToggle">
              {{ open ? '🔴 Close FP Window' : '👁 Open FP Window' }}
            </button>
            <div class="yfp-meta">
              <strong>Eye:</strong> [0, 27, 4]<br>
              <strong>Direction:</strong> –Z (forward)<br>
              <strong>FOV:</strong> 70° H · 16:9 locked<br>
              <strong>Resize:</strong> drag corner handle
            </div>
          </div>
        `,
        data()   { return { open: !!_fpWin } },
        methods: {
          doToggle() {
            toggleFPWindow()
            this.open = !!_fpWin
          }
        }
      })
    })
    _disposables.push(panel)
    console.log(`[${PLUGIN_ID}] v4.0.0 loaded`)
  },

  onunload() {
    if (_fpWin) closeFPWindow()
    _disposables.reverse().forEach(d => {
      if (d.dispose) d.dispose()
      else if (d.delete) d.delete()
      else if (d.remove) d.remove()
    })
    _disposables.length = 0
  }
})

})()
