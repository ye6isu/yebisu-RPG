import { useState, useEffect, useCallback, useRef, Children, cloneElement } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTitlebarActions } from './Titlebar/TitlebarActionsContext';
import { open } from '@tauri-apps/plugin-dialog';
import { FieldRow, StringField, StandardDropdownField } from './Field/Field';
import BlockEditor from './BlockEditor';
import { resolveSlotValue, collectBlockImports } from '../codegen/visual/compiler.js';

const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';
const RES_BASE = 'resources/assets/yebisurpg';

// Reference resolution the canvas preview represents — widget x/y/width/height are stored
// in these units (screen-relative, matching GuiGraphics.guiWidth()/guiHeight() at runtime,
// which is itself already GUI-Scale-adjusted logical space, not raw physical pixels — this
// is why a widget lands in the same visual spot regardless of physical resolution as long
// as GUI Scale is consistent). Both dimensions and the grid are user-adjustable per layout.
const DEFAULT_PREVIEW_W = 960;
const DEFAULT_PREVIEW_H = 540;
const DEFAULT_GRID_W = 10;
const DEFAULT_GRID_H = 10;

// Sidebar width (horizontal) and Inspector/Layers split (vertical) are remembered across
// sessions — shared by every HUD layout you edit, matching how the app's own main sidebar
// width is persisted (see ycs-sidebar-width in App.jsx).
const SIDEBAR_WIDTH_KEY = 'ycs-hud-sidebar-width';
const INSPECTOR_HEIGHT_KEY = 'ycs-hud-inspector-height';

// Resolution and GUI Scale are independent axes (matching vanilla's own Controls > Video
// Settings > GUI Scale, which is either "Auto" or a manual 1-4) — picking both computes the
// resulting logical guiWidth/guiHeight (physical / scale) the canvas preview should match.
const RESOLUTION_PRESETS = [
  { label: '1280×720', value: '1280x720' },
  { label: '1920×1080', value: '1920x1080' },
  { label: '2560×1440', value: '2560x1440' },
  { label: '3840×2160 (4K)', value: '3840x2160' },
];
const RESOLUTION_DIMS = {
  '1280x720': [1280, 720], '1920x1080': [1920, 1080],
  '2560x1440': [2560, 1440], '3840x2160': [3840, 2160],
};
const GUI_SCALES = [1, 2, 3, 4];

// Walks a stored Blocky graph (Start -> ... -> Return Value/Return Bool) and reads whatever's
// plugged into the return node's `value` slot, compiling it via the normal value-resolution
// path. Returns null if no matching return node exists in the chain.
function compileValueGraph(nodes, methodKey, opcode = 'hud.return_value', fallback = '0.0') {
  const returnNode = nodes.find(n => n.opcode === opcode);
  if (!returnNode) return null;
  return resolveSlotValue(returnNode.slots?.value, nodes, methodKey) ?? fallback;
}

const WIDGET_TYPES = [
  { label: 'Bar', value: 'bar' },
  { label: 'Text', value: 'text' },
  { label: 'Icon', value: 'icon' },
];

const ANCHORS = [
  { label: 'Top Left', value: 'top_left' }, { label: 'Top Center', value: 'top_center' }, { label: 'Top Right', value: 'top_right' },
  { label: 'Center Left', value: 'center_left' }, { label: 'Center', value: 'center' }, { label: 'Center Right', value: 'center_right' },
  { label: 'Bottom Left', value: 'bottom_left' }, { label: 'Bottom Center', value: 'bottom_center' }, { label: 'Bottom Right', value: 'bottom_right' },
];

const NO_TEXTURE = { id: '', rows: 1, animatedOnUse: false, ticksPerFrame: 4, defaultFrame: 0 };

// A blank Multi-State entry — mirrors the widget's own base texture slots (icon for Icon
// widgets, barFilled/barEmpty for Bar widgets) so every state is a fully independent look.
function blankStateEntry() {
  return { icon: { ...NO_TEXTURE }, barFilled: { ...NO_TEXTURE }, barEmpty: { ...NO_TEXTURE } };
}

// A compact 3x3 grid picker for any 9-way anchor/alignment value (screen anchor, text align
// within its own box, etc.) — one button per ANCHORS entry, laid out in the same row-major
// top-left..bottom-right order used everywhere else in this file.
function AnchorGrid({ value, onChange, title }) {
  return (
    <div title={title} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, width: 96 }}>
      {ANCHORS.map(a => (
        <button
          key={a.value}
          type="button"
          title={a.label}
          onClick={() => onChange(a.value)}
          style={{
            width: 28, height: 28, padding: 0, cursor: 'pointer',
            border: `1px solid ${value === a.value ? 'var(--ycs-highlight)' : 'var(--ycs-foreground)'}`,
            borderRadius: 'var(--ycs-radius, 4px)',
            background: value === a.value ? 'var(--ycs-highlight)' : 'var(--ycs-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: value === a.value ? 'var(--ycs-bg)' : 'var(--ycs-text)', opacity: value === a.value ? 1 : 0.6,
          }} />
        </button>
      ))}
    </div>
  );
}

// Computes a widget's anchor origin (top-left corner it's offset from) against an arbitrary
// container rect — the canvas itself (containerX/Y = 0, containerW/H = previewW/H) or another
// widget's own resolved rect, when anchorTarget points at it. Same 9-anchor math either way.
function anchorOrigin(anchor, containerW, containerH, width, height, containerX = 0, containerY = 0) {
  let ox = containerX, oy = containerY;
  // Horizontal: *_center (top_center/center/bottom_center) centers, *_right right-aligns,
  // otherwise (*_left) stays at the container's left edge.
  if (anchor === 'top_center' || anchor === 'center' || anchor === 'bottom_center') {
    ox = containerX + containerW / 2 - width / 2;
  } else if (anchor.endsWith('right')) {
    ox = containerX + containerW - width;
  }
  // Vertical: center_* (center_left/center/center_right) centers, bottom_* bottom-aligns,
  // otherwise (top_*) stays at the container's top edge.
  if (anchor === 'center_left' || anchor === 'center' || anchor === 'center_right') {
    oy = containerY + containerH / 2 - height / 2;
  } else if (anchor.startsWith('bottom')) {
    oy = containerY + containerH - height;
  }
  return { ox, oy };
}

// Resolves a widget's absolute screen rect {left, top, width, height}, following anchorTarget
// chains (widget-relative anchoring) when present. Guards against cycles (A anchored to B
// anchored back to A) by tracking visited ids and falling back to the canvas if one is hit.
function resolveWidgetRect(widget, allWidgets, previewW, previewH, visiting = new Set()) {
  const { width, height } = widget;
  let containerX = 0, containerY = 0, containerW = previewW, containerH = previewH;
  if (widget.anchorTarget && !visiting.has(widget.anchorTarget)) {
    const target = allWidgets.find(w => w.id === widget.anchorTarget);
    if (target) {
      const nextVisiting = new Set(visiting);
      nextVisiting.add(widget.id);
      const targetRect = resolveWidgetRect(target, allWidgets, previewW, previewH, nextVisiting);
      containerX = targetRect.left;
      containerY = targetRect.top;
      containerW = targetRect.width;
      containerH = targetRect.height;
    }
  }
  const { ox, oy } = anchorOrigin(widget.anchor, containerW, containerH, width, height, containerX, containerY);
  return { left: ox + widget.x, top: oy + widget.y, width, height };
}

function genWidgetId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `w${Date.now()}${Math.random().toString(36).slice(2)}`;
}

// Snaps `value` to the nearest multiple of `gridSize`, offset so the grid lines themselves
// start at `offset` (not always 0,0) — matches wherever the visual grid overlay is drawn.
function snap(value, gridSize, offset = 0) {
  if (!gridSize || gridSize <= 1) return value;
  return Math.round((value - offset) / gridSize) * gridSize + offset;
}

function widgetDefaults(type) {
  if (type === 'bar') return { width: 100, height: 10, color: '#33cc55' };
  if (type === 'text') return { width: 80, height: 10, color: '#ffffff', textFontScale: 1, textAlign: 'top_left' };
  return { width: 16, height: 16, color: '#ffffff' };
}

function widgetLabel(w, i) {
  return w.name || `${w.type} ${i + 1}`;
}

// ── Texture Picker (reuses the same shared texture pool used everywhere else in YCS) ──
// Slot is a texture ref field (icon/barFilled/barEmpty) — if the chosen texture is a
// spritesheet (rows > 1), an extra "Animated" checkbox appears below it: unchecked shows a
// hardcoded-frame-or-Blocky-link field (picks one static frame), checked shows a
// ticks-per-frame-or-Blocky-link field (drives the automatic cycling speed) instead.
function TexturePicker({ label, value, onChange, hasFrameLink, onEditFrameLink, onRemoveFrameLink }) {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const opts = [{ label: '(none)', value: '' }];
      try {
        const ids = await invoke('list_textures');
        for (const id of ids) {
          try {
            const raw = await invoke('load_texture', { id });
            const tex = JSON.parse(raw);
            opts.push({
              label: tex.label || id, value: tex.id || id,
              rows: tex.rows || 1, animatedOnUse: !!tex.animatedOnUse,
              ticksPerFrame: tex.ticksPerFrame || 4, defaultFrame: tex.defaultFrame || 0,
            });
          } catch {}
        }
      } catch {}
      if (!cancelled) setOptions(opts);
    })();
    return () => { cancelled = true; };
  }, []);

  const isSpritesheet = (value?.rows || 1) > 1;

  return (
    <>
      <FieldRow label={label}>
        <StandardDropdownField
          value={value?.id || ''}
          options={options}
          searchable
          onChange={v => {
            const opt = options.find(o => o.value === v);
            if (!opt || !opt.value) { onChange({ ...NO_TEXTURE }); return; }
            onChange({
              id: opt.value, rows: opt.rows, animatedOnUse: opt.animatedOnUse,
              ticksPerFrame: opt.ticksPerFrame, defaultFrame: opt.defaultFrame,
              frameLiteral: value?.frameLiteral ?? String(opt.animatedOnUse ? opt.ticksPerFrame : opt.defaultFrame),
            });
          }}
        />
      </FieldRow>
      {isSpritesheet && (
        <>
          <FieldRow label="Animated">
            <input
              type="checkbox"
              checked={!!value.animatedOnUse}
              onChange={e => onChange({ ...value, animatedOnUse: e.target.checked })}
            />
          </FieldRow>
          <LinkableValueField
            label={value.animatedOnUse ? 'Ticks/Frame' : 'Frame'}
            mode="number"
            literalValue={value.frameLiteral}
            onLiteralChange={v => onChange({ ...value, frameLiteral: v })}
            hasLink={hasFrameLink}
            onEditLink={onEditFrameLink}
            onRemoveLink={onRemoveFrameLink}
          />
        </>
      )}
    </>
  );
}

// ── Live texture preview image (loads the actual texture bytes via the same command TextureManager uses) ──
// Returns textureRef merged with its loaded image data URL (as `.url`), or null if unset —
// bundling the URL alongside rows/animatedOnUse/ticksPerFrame is what spriteStyle() needs
// to slice + animate the correct frame.
function useTextureRefWithUrl(textureRef) {
  const [url, setUrl] = useState(null);
  const [natural, setNatural] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!textureRef?.id) { setUrl(null); setNatural(null); return; }
    invoke('load_texture_image', { id: textureRef.id })
      .then(u => {
        if (cancelled) return;
        setUrl(u);
        const img = new Image();
        img.onload = () => { if (!cancelled) setNatural({ w: img.naturalWidth, h: img.naturalHeight }); };
        img.src = u;
      })
      .catch(() => { if (!cancelled) { setUrl(null); setNatural(null); } });
    return () => { cancelled = true; };
  }, [textureRef?.id]);
  if (!textureRef?.id || !url) return null;
  // naturalAspect is a single FRAME's width/height (spritesheet rows stack vertically, so
  // one frame's height is the full image height divided by row count).
  const rows = Math.max(1, textureRef.rows || 1);
  const naturalAspect = natural ? natural.w / (natural.h / rows) : null;
  return { ...textureRef, url, naturalAspect };
}

// Builds the CSS for a (possibly animated spritesheet) texture ref, matching the same
// rows/frame slicing HudOverlayRenderer does at runtime — one row = one frame, stacked
// vertically. Animated textures get a real ticking `steps()` keyframe animation so the
// canvas preview shows actual playback, not a single static frame.
function spriteStyle(ref, boxWidth, boxHeight) {
  if (!ref?.id || !ref.url) return {};
  const rows = Math.max(1, ref.rows || 1);
  const frameHeight = boxHeight;
  const textureHeight = frameHeight * rows;
  if (rows <= 1) {
    return {
      backgroundImage: `url(${ref.url})`,
      backgroundSize: `${boxWidth}px ${textureHeight}px`,
      backgroundPosition: '0 0',
      backgroundRepeat: 'no-repeat',
    };
  }
  // A bound Blocky link can't be evaluated live in this preview (it's compiled Java, not
  // runnable here) — but the hardcoded literal fallback CAN, so use it whenever no link is
  // set yet, matching what actually renders in-game in that case.
  const hasFrameLink = !!ref.frameSourceId;
  const literalFrame = ref.frameLiteral !== undefined && ref.frameLiteral !== '' ? parseFloat(ref.frameLiteral) : null;

  if (!ref.animatedOnUse) {
    const frame = !hasFrameLink && literalFrame !== null && !Number.isNaN(literalFrame)
      ? Math.max(0, Math.min(rows - 1, Math.round(literalFrame)))
      : Math.min(ref.defaultFrame || 0, rows - 1);
    return {
      backgroundImage: `url(${ref.url})`,
      backgroundSize: `${boxWidth}px ${textureHeight}px`,
      backgroundPosition: `0 -${frame * frameHeight}px`,
      backgroundRepeat: 'no-repeat',
    };
  }
  // Animated: a steps() keyframe animation walks background-position through every row.
  const animName = `ycs-hud-spin-${ref.id.replace(/[^a-zA-Z0-9]/g, '')}-${boxHeight}`;
  const effectiveTicksPerFrame = !hasFrameLink && literalFrame !== null && !Number.isNaN(literalFrame)
    ? Math.max(1, Math.round(literalFrame))
    : Math.max(1, ref.ticksPerFrame || 4);
  const durationMs = effectiveTicksPerFrame * rows * 50; // 1 tick ~= 50ms
  if (typeof document !== 'undefined' && !document.getElementById(animName)) {
    const style = document.createElement('style');
    style.id = animName;
    style.textContent = `@keyframes ${animName} { from { background-position: 0 0; } to { background-position: 0 -${textureHeight}px; } }`;
    document.head.appendChild(style);
  }
  return {
    backgroundImage: `url(${ref.url})`,
    backgroundSize: `${boxWidth}px ${textureHeight}px`,
    backgroundRepeat: 'no-repeat',
    animation: `${animName} ${durationMs}ms steps(${rows}) infinite`,
  };
}

function WidgetBox({ widget, allWidgets, previewW, previewH, gridW, gridH, gridOffsetX, gridOffsetY, snapEnabled, zoom, selected, onSelect, onDrag, onResize, layerIndex }) {
  const { left, top } = resolveWidgetRect(widget, allWidgets, previewW, previewH);

  // Canvas preview can't evaluate a bound State Index Blocky link (it's compiled Java, not
  // runnable here) — but the hardcoded literal fallback CAN, so show whichever state it
  // points at (clamped into range), same "unrunnable link, show the literal" convention the
  // texture-frame preview already uses in spriteStyle(). Falls back to State 0 only when no
  // literal is set yet (mirrors "unset -> first state" at render/compile time).
  const previewState = (() => {
    if (!widget.multiState || !widget.states?.length) return null;
    const literal = widget.stateLiteral !== undefined && widget.stateLiteral !== '' ? parseInt(widget.stateLiteral, 10) : null;
    const idx = literal !== null && !Number.isNaN(literal)
      ? Math.max(0, Math.min(widget.states.length - 1, literal))
      : 0;
    return widget.states[idx];
  })();
  const iconRef = useTextureRefWithUrl(previewState ? previewState.icon : widget.icon);
  const filledRef = useTextureRefWithUrl(previewState ? previewState.barFilled : widget.barFilled);
  const emptyRef = useTextureRefWithUrl(previewState ? previewState.barEmpty : widget.barEmpty);

  // Sample fill for a live preview — 65% full, purely illustrative (not the bound value).
  const sampleFrac = 0.65;
  const filledWidth = Math.round(widget.width * sampleFrac);

  const startDrag = e => {
    e.stopPropagation();
    onSelect();
    const startX = e.clientX, startY = e.clientY;
    const origX = widget.x, origY = widget.y;
    const onMove = ev => {
      const nx = origX + (ev.clientX - startX) / zoom;
      const ny = origY + (ev.clientY - startY) / zoom;
      onDrag(
        snapEnabled ? snap(nx, gridW, gridOffsetX) : nx,
        snapEnabled ? snap(ny, gridH, gridOffsetY) : ny,
      );
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // corner: 'nw' | 'ne' | 'sw' | 'se' — which corner is being dragged. The OPPOSITE corner
  // stays anchored in ABSOLUTE SCREEN position (Photoshop behavior): dragging the top-left
  // handle grows the box up/left while bottom-right stays visually fixed, and so on for
  // each corner. Computed in screen space (left/top, i.e. ox+x / oy+y) rather than the
  // widget's own anchor-relative x/y, since anchorOrigin() itself shifts with width/height
  // for center/right/bottom anchors — doing this math in screen space sidesteps having to
  // separately account for that shift.
  const startResize = (corner) => e => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const startX = e.clientX, startY = e.clientY;
    const origW = widget.width, origH = widget.height;
    const origLeft = left, origTop = top; // screen-space, already anchor-adjusted
    // Shift-lock uses the bound texture's own pixel aspect ratio (so the shape matches what
    // the art was actually drawn at), not the widget box's current width/height — falls back
    // to the box's current ratio when no texture is bound yet.
    const textureAspect = widget.type === 'icon' ? iconRef?.naturalAspect
      : widget.type === 'bar' ? (filledRef?.naturalAspect ?? emptyRef?.naturalAspect)
      : null;
    const aspect = textureAspect ?? (origW / origH);
    const growsLeft = corner === 'nw' || corner === 'sw';
    const growsUp = corner === 'nw' || corner === 'ne';
    // Resolve the anchor container (canvas, or another widget's rect) once up front — it
    // doesn't move mid-resize even if the widget itself is anchored to another widget.
    const anchorTargetWidget = widget.anchorTarget ? allWidgets.find(w => w.id === widget.anchorTarget) : null;
    const containerRect = anchorTargetWidget
      ? resolveWidgetRect(anchorTargetWidget, allWidgets, previewW, previewH)
      : null;
    const containerX = containerRect ? containerRect.left : 0;
    const containerY = containerRect ? containerRect.top : 0;
    const containerW = containerRect ? containerRect.width : previewW;
    const containerH = containerRect ? containerRect.height : previewH;

    const onMove = ev => {
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      let nw = Math.max(4, origW + (growsLeft ? -dx : dx));
      let nh = Math.max(4, origH + (growsUp ? -dy : dy));

      // Photoshop default: free (non-uniform) resize; hold Shift to lock aspect ratio.
      if (ev.shiftKey) {
        const dw = Math.abs(nw - origW), dh = Math.abs(nh - origH);
        if (dw >= dh) nh = Math.max(4, nw / aspect);
        else nw = Math.max(4, nh * aspect);
      }

      if (snapEnabled) {
        nw = Math.max(gridW, snap(nw, gridW, gridOffsetX));
        nh = Math.max(gridH, snap(nh, gridH, gridOffsetY));
      }

      // The fixed corner's screen position must stay put: compute the new screen-space
      // left/top so the anchored corner doesn't move, then re-derive anchor-relative x/y
      // for the new size via anchorOrigin (which may itself shift for non-top-left anchors).
      const newLeft = growsLeft ? origLeft + origW - nw : origLeft;
      const newTop = growsUp ? origTop + origH - nh : origTop;
      const { ox: newOx, oy: newOy } = anchorOrigin(widget.anchor, containerW, containerH, nw, nh, containerX, containerY);
      onResize({ width: nw, height: nh, x: newLeft - newOx, y: newTop - newOy });
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      onMouseDown={startDrag}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', left, top, width: widget.width, height: widget.height,
        outline: selected ? '1px solid var(--ycs-highlight)' : 'none',
        boxSizing: 'border-box', cursor: 'move', userSelect: 'none', overflow: 'hidden',
        zIndex: layerIndex,
      }}
    >
      {widget.type === 'bar' && (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div style={{
            position: 'absolute', inset: 0, imageRendering: 'pixelated',
            ...(emptyRef ? spriteStyle(emptyRef, widget.width, widget.height) : { backgroundColor: '#202020' }),
          }} />
          <div style={{ position: 'absolute', left: 0, top: 0, width: filledWidth, height: '100%', overflow: 'hidden' }}>
            <div style={{
              width: widget.width, height: '100%', imageRendering: 'pixelated',
              ...(filledRef ? spriteStyle(filledRef, widget.width, widget.height) : { backgroundColor: widget.color }),
            }} />
          </div>
        </div>
      )}
      {widget.type === 'text' && (() => {
        const align = widget.textAlign || 'top_left';
        const justifyContent = align.endsWith('right') ? 'flex-end' : (align.includes('center') && !align.startsWith('center')) || align === 'center' ? 'center' : 'flex-start';
        const alignItems = align.startsWith('bottom') ? 'flex-end' : align.startsWith('center') ? 'center' : 'flex-start';
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems, justifyContent, overflow: 'hidden',
          }}>
            <span style={{
              fontSize: `${9 * (widget.textFontScale ?? 1)}px`, color: widget.color,
              whiteSpace: 'nowrap', fontFamily: 'monospace', lineHeight: 1,
            }}>
              {widget.textMode === 'text'
                ? (widget.textSourceId ? 'Sample Text' : (widget.textLiteral || '(unbound)'))
                : (widget.valueSourceId ? '42' : (widget.valueLiteral || '(unbound)'))}
            </span>
          </div>
        );
      })()}
      {widget.type === 'icon' && (
        iconRef
          ? <div style={{ width: '100%', height: '100%', imageRendering: 'pixelated', ...spriteStyle(iconRef, widget.width, widget.height) }} />
          : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, opacity: 0.5 }}>icon</span>
            </div>
      )}
      {selected && (
        <>
          <div onMouseDown={startResize('nw')} title="Resize" style={{ position: 'absolute', left: -3, top: -3, width: 8, height: 8, background: 'var(--ycs-highlight)', cursor: 'nwse-resize', borderRadius: 2, zIndex: 2 }} />
          <div onMouseDown={startResize('ne')} title="Resize" style={{ position: 'absolute', right: -3, top: -3, width: 8, height: 8, background: 'var(--ycs-highlight)', cursor: 'nesw-resize', borderRadius: 2, zIndex: 2 }} />
          <div onMouseDown={startResize('sw')} title="Resize" style={{ position: 'absolute', left: -3, bottom: -3, width: 8, height: 8, background: 'var(--ycs-highlight)', cursor: 'nesw-resize', borderRadius: 2, zIndex: 2 }} />
          <div onMouseDown={startResize('se')} title="Resize" style={{ position: 'absolute', right: -3, bottom: -3, width: 8, height: 8, background: 'var(--ycs-highlight)', cursor: 'nwse-resize', borderRadius: 2, zIndex: 2 }} />
        </>
      )}
    </div>
  );
}

// ── Layer list panel (Photoshop-style) ──
function LayerList({ widgets, selected, onSelect, onReorder, onDelete, onAddWidget }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const dragIdxRef = useRef(null);
  const overIdxRef = useRef(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  // Native HTML5 drag-and-drop is unreliable inside the Tauri/WebView2 shell, so reordering
  // is done with plain mouse events instead (same approach used elsewhere in this editor for
  // dragging/resizing widgets): mousedown starts a drag, mouseenter on another row previews
  // the drop target, mouseup commits the reorder.
  const startRowDrag = (i) => e => {
    if (e.button !== 0) return;
    dragIdxRef.current = i;
    overIdxRef.current = null;
    setDragIdx(i);
    const onUp = () => {
      if (dragIdxRef.current !== null && overIdxRef.current !== null && overIdxRef.current !== dragIdxRef.current) {
        onReorder(dragIdxRef.current, overIdxRef.current);
      }
      dragIdxRef.current = null;
      overIdxRef.current = null;
      setDragIdx(null);
      setOverIdx(null);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mouseup', onUp);
  };
  const onRowEnter = (i) => () => {
    if (dragIdxRef.current === null) return;
    overIdxRef.current = i;
    setOverIdx(i);
  };
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <span style={{ opacity: 0.6 }}>Layers</span>
        <button
          className="ycs-tiny-button"
          title="Add Widget"
          onClick={() => setAddMenuOpen(v => !v)}
          style={{ border: '1px solid var(--ycs-foreground)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        {addMenuOpen && (
          <>
            <div onClick={() => setAddMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
            <div className="dropdown" style={{ top: '100%', left: 'unset', right: 10, minWidth: 90, textTransform: 'none' }}>
              {WIDGET_TYPES.map(t => (
                <div
                  key={t.value}
                  className="dropdown-item"
                  onClick={() => { onAddWidget(t.value); setAddMenuOpen(false); }}
                  style={{ height: 'unset', padding: '6px 10px', fontSize: 12 }}
                >
                  {t.label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {widgets.length === 0 && <div style={{ padding: '4px 10px', fontSize: 12, opacity: 0.4 }}>No widgets yet.</div>}
      {widgets.map((w, i) => (
        <div
          key={i}
          onMouseDown={startRowDrag(i)}
          onMouseEnter={e => { onRowEnter(i)(); if (dragIdx === null && selected !== i) e.currentTarget.style.backgroundColor = 'var(--ycs-highlight)'; const d = e.currentTarget.querySelector('.layer-del'); if (d) d.style.opacity = '1'; }}
          onMouseLeave={e => { if (dragIdx === null && selected !== i) e.currentTarget.style.backgroundColor = 'transparent'; const d = e.currentTarget.querySelector('.layer-del'); if (d) d.style.opacity = '0'; }}
          onClick={() => { if (dragIdx === null) onSelect(i); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', margin: '0 6px', cursor: dragIdx !== null ? 'grabbing' : 'pointer',
            borderRadius: 'var(--ycs-radius, 4px)',
            background: selected === i ? 'var(--ycs-highlight)' : 'transparent',
            outline: overIdx === i && dragIdx !== null && dragIdx !== i ? '1px dashed var(--ycs-highlight)' : 'none',
            opacity: dragIdx === i ? 0.5 : 1,
            transition: 'background-color 0.1s ease-in-out',
          }}
        >
          <span style={{ fontSize: 10, opacity: 0.5, width: 30, textTransform: 'uppercase' }}>{w.type}</span>
          <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{widgetLabel(w, i)}</span>
          <div className="layer-del" onClick={e => { e.stopPropagation(); onDelete(i); }} title="Delete" style={{ width: 18, height: 18, cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <circle cx="9" cy="9" r="9" fill="white"/>
              <line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Deselected-state panel: layout name, add-widget buttons, resolution/scale/grid
// controls — shown in the sidebar in place of WidgetInspector whenever nothing is selected.
// ── Image drag-drop/browse importer — mirrors ItemEditor.jsx's FileDropZone (used for 3D
// model imports there) so picking a HUD reference image behaves the same way: click to
// browse OR drag a file straight onto the zone, with a clear button once one's set.
function ImageDropZone({ hasFile, fileLabel, onImport, onClear }) {
  const [dragOver, setDragOver] = useState(false);
  const zoneRef = useRef(null);
  const dragOverRef = useRef(false);
  const onImportRef = useRef(onImport);
  onImportRef.current = onImport;
  const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

  useEffect(() => {
    let unlisten;
    import('@tauri-apps/api/webview').then(({ getCurrentWebview }) => {
      getCurrentWebview().onDragDropEvent((event) => {
        const dpr = window.devicePixelRatio || 1;
        if (event.payload.type === 'over') {
          if (!zoneRef.current) return;
          const rect = zoneRef.current.getBoundingClientRect();
          const x = event.payload.position.x / dpr;
          const y = event.payload.position.y / dpr;
          const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
          if (inside !== dragOverRef.current) {
            dragOverRef.current = inside;
            setDragOver(inside);
          }
        } else if (event.payload.type === 'drop') {
          if (dragOverRef.current && event.payload.paths?.length > 0) {
            const path = event.payload.paths[0];
            if (extensions.some(ext => path.toLowerCase().endsWith(`.${ext}`))) {
              onImportRef.current(path);
            }
          }
          dragOverRef.current = false;
          setDragOver(false);
        } else if (event.payload.type === 'leave') {
          dragOverRef.current = false;
          setDragOver(false);
        }
      }).then(fn => { unlisten = fn; });
    }).catch(() => {});
    return () => { if (unlisten) unlisten(); };
  }, []);

  const browse = async () => {
    const file = await open({ multiple: false, filters: [{ name: 'Images', extensions }] });
    if (!file) return;
    onImport(typeof file === 'string' ? file : file.path);
  };

  return (
    <div
      ref={zoneRef}
      onClick={browse}
      className="ycs-string-input"
      style={{
        flex: 1, height: '24px', minHeight: '24px', display: 'flex', alignItems: 'center',
        justifyContent: hasFile ? 'flex-start' : 'center', gap: '6px', cursor: 'pointer',
        fontSize: '12px', padding: '0 8px', boxSizing: 'border-box', width: '100%',
        borderColor: dragOver ? 'var(--ycs-highlight)' : undefined,
        backgroundColor: dragOver ? 'var(--ycs-accent)' : undefined,
      }}
    >
      {hasFile ? (
        <>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileLabel}</span>
          {onClear && (
            <svg
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, cursor: 'pointer' }}
            >
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
    </div>
  );
}

function LayoutPanel({
  name, setName,
  resolution, setResolution, guiScale, setGuiScale,
  setPreviewW, setPreviewH,
  gridW, setGridW, gridH, setGridH,
  gridOffsetX, setGridOffsetX, gridOffsetY, setGridOffsetY,
  showGrid, setShowGrid, snapEnabled, setSnapEnabled,
  previewImage, onPickPreviewImage, onClearPreviewImage,
  previewImageFit, setPreviewImageFit,
  previewImageOpacity, setPreviewImageOpacity,
  visibleLiteral, setVisibleLiteral, hasVisibleLink, onEditVisible, onRemoveVisibleLink,
}) {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1, minHeight: 0 }}>
      <FieldRow label="Name">
        <StringField value={name} onChange={v => setName(v.toLowerCase().replace(/\s/g, '_'))} style={{ width: '100%' }} />
      </FieldRow>
      <LinkableValueField
        label="Visibility" mode="bool"
        literalValue={visibleLiteral !== false} onLiteralChange={setVisibleLiteral}
        hasLink={hasVisibleLink} onEditLink={onEditVisible} onRemoveLink={onRemoveVisibleLink}
      />
      <CanvasToolbar
        resolution={resolution} setResolution={setResolution}
        guiScale={guiScale} setGuiScale={setGuiScale}
        setPreviewW={setPreviewW} setPreviewH={setPreviewH}
        gridW={gridW} setGridW={setGridW}
        gridH={gridH} setGridH={setGridH}
        gridOffsetX={gridOffsetX} setGridOffsetX={setGridOffsetX}
        gridOffsetY={gridOffsetY} setGridOffsetY={setGridOffsetY}
        showGrid={showGrid} setShowGrid={setShowGrid}
        snapEnabled={snapEnabled} setSnapEnabled={setSnapEnabled}
      />
      <FieldRow label="Reference Image">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          {previewImage && (
            <img src={previewImage} alt="Reference" style={{ width: '100%', maxHeight: 140, objectFit: 'contain', borderRadius: 'var(--ycs-radius, 4px)', border: '1px solid var(--ycs-foreground)', background: '#000' }} />
          )}
          <ImageDropZone
            hasFile={!!previewImage}
            fileLabel="Reference Image"
            onImport={onPickPreviewImage}
            onClear={onClearPreviewImage}
          />
          {previewImage && (
            <>
              <StandardDropdownField
                value={previewImageFit}
                options={[
                  { label: 'Fit', value: 'contain' },
                  { label: 'Fill', value: 'cover' },
                ]}
                onChange={setPreviewImageFit}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={previewImageOpacity}
                  onChange={e => setPreviewImageOpacity(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ width: 34, textAlign: 'right', fontSize: 11, opacity: 0.7 }}>
                  {Math.round(previewImageOpacity * 100)}%
                </span>
              </div>
            </>
          )}
        </div>
      </FieldRow>
    </div>
  );
}

// ── Toolbar: preview size + grid controls ──
function CanvasToolbar({
  resolution, setResolution, guiScale, setGuiScale,
  setPreviewW, setPreviewH,
  gridW, setGridW, gridH, setGridH,
  gridOffsetX, setGridOffsetX, gridOffsetY, setGridOffsetY,
  showGrid, setShowGrid, snapEnabled, setSnapEnabled,
}) {
  const applyResAndScale = (res, scale) => {
    const dims = RESOLUTION_DIMS[res];
    if (!dims) return;
    setPreviewW(Math.round(dims[0] / scale));
    setPreviewH(Math.round(dims[1] / scale));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', fontSize: 11 }}>
      <FieldRow label="Resolution">
        <StandardDropdownField
          value={resolution}
          options={RESOLUTION_PRESETS}
          onChange={v => { setResolution(v); applyResAndScale(v, guiScale); }}
        />
      </FieldRow>
      <FieldRow label="GUI Scale">
        <StandardDropdownField
          value={String(guiScale)}
          options={GUI_SCALES.map(s => ({ label: `${s}×`, value: String(s) }))}
          onChange={v => { const s = parseInt(v); setGuiScale(s); applyResAndScale(resolution, s); }}
        />
      </FieldRow>
      <FieldRow label="Show Grid">
        <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} />
      </FieldRow>
      <FieldRow label="Snap to Grid">
        <input type="checkbox" checked={snapEnabled} onChange={e => setSnapEnabled(e.target.checked)} />
      </FieldRow>
      <FieldRow label="Grid W/H">
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="ycs-string-input" type="number" value={gridW} onChange={e => setGridW(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: '100%' }} />
          <input className="ycs-string-input" type="number" value={gridH} onChange={e => setGridH(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: '100%' }} />
        </div>
      </FieldRow>
      <FieldRow label="Grid Offset">
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="ycs-string-input" type="number" value={gridOffsetX} onChange={e => setGridOffsetX(parseInt(e.target.value) || 0)} style={{ width: '100%' }} />
          <input className="ycs-string-input" type="number" value={gridOffsetY} onChange={e => setGridOffsetY(parseInt(e.target.value) || 0)} style={{ width: '100%' }} />
        </div>
      </FieldRow>
    </div>
  );
}

// ── Pannable/zoomable fixed-size viewport, mirroring BlockEditor's canvas interaction:
// scroll wheel zooms (centered on the cursor), middle-mouse or empty-space drag pans. The
// viewport box itself never changes size — only its content (the reference-resolution
// rectangle + widgets) pans/zooms within it via a CSS transform.
function PannableCanvas({ previewW, previewH, gridStyle, previewImage, previewImageFit, previewImageOpacity, onDeselect, children }) {
  const areaRef = useRef(null);
  const panRef = useRef({ x: 40, y: 40 });
  const zoomRef = useRef(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const panningRef = useRef(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  panRef.current = pan;
  zoomRef.current = zoom;

  // Space + drag to pan (Photoshop/Figma convention) — tracked globally so it still works
  // if focus is on an input elsewhere in the sidebar when Space is first pressed.
  useEffect(() => {
    const onKeyDown = e => { if (e.code === 'Space' && !e.repeat) setSpaceHeld(true); };
    const onKeyUp = e => { if (e.code === 'Space') setSpaceHeld(false); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  const handleWheel = useCallback(e => {
    e.preventDefault();
    const el = areaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Always zoom toward the viewport's own center, not the cursor position — so zooming
    // out consistently converges on the middle of the canvas rather than drifting toward
    // wherever the mouse happens to be.
    const mx = rect.width / 2, my = rect.height / 2;
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const oldZ = zoomRef.current;
    const nz = Math.min(Math.max(0.2, oldZ + delta), 3);
    if (nz === oldZ) return;
    setPan(p => ({ x: mx / nz - (mx / oldZ - p.x), y: my / nz - (my / oldZ - p.y) }));
    setZoom(nz);
  }, []);

  const handleMouseDown = useCallback(e => {
    if (e.button !== 0 || !spaceHeld) return;
    e.preventDefault();
    panningRef.current = { startX: e.clientX, startY: e.clientY, startPan: { ...panRef.current } };
    if (onDeselect) onDeselect();
  }, [onDeselect, spaceHeld]);

  const handleMouseMove = useCallback(e => {
    if (!panningRef.current) return;
    // Pan 1:1 with actual mouse movement on screen, regardless of zoom — dragging 100px
    // always shifts the view by 100 screen-pixels, whether zoomed in or out.
    const dx = e.clientX - panningRef.current.startX;
    const dy = e.clientY - panningRef.current.startY;
    setPan({ x: panningRef.current.startPan.x + dx, y: panningRef.current.startPan.y + dy });
  }, []);

  const handleMouseUp = useCallback(() => { panningRef.current = null; }, []);

  return (
    <div
      ref={areaRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => { if (onDeselect) onDeselect(); }}
      style={{
        flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden',
        background: '#161620', cursor: spaceHeld ? (panningRef.current ? 'grabbing' : 'grab') : 'default',
      }}
    >
      <div style={{
        position: 'absolute', left: 0, top: 0,
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: '0 0',
      }}>
        <div
          data-hud-widget
          style={{
            position: 'relative', width: previewW, height: previewH,
            background: 'linear-gradient(135deg, #2a2a3a, #1a1a24)',
            border: '1px solid var(--ycs-foreground)', overflow: 'hidden',
          }}
        >
          {previewImage && (
            <img
              src={previewImage}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: previewImageFit,
                opacity: previewImageOpacity,
                pointerEvents: 'none',
                userSelect: 'none',
                zIndex: 0,
              }}
            />
          )}
          {Object.keys(gridStyle).length > 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 1,
                ...gridStyle,
              }}
            />
          )}
          {Children.map(children, child => cloneElement(child, { zoom }))}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 10, opacity: 0.4, pointerEvents: 'none' }}>
        {Math.round(zoom * 100)}% — scroll to zoom, hold Space + drag to pan
      </div>
    </div>
  );
}

// A binding field that's either a typed literal (number/text/bool) or a full Blocky graph —
// the literal is a quick hardcode shortcut; the small "set"/"edit" button (matching Item's
// own compact per-method button) opens Blocky for a computed value instead. If a Blocky graph
// is bound, it always wins at render/compile time; the literal is only used as a fallback.
// Either a typed literal (number/text/bool) OR a bound Blocky link — never shown at once,
// so there's exactly one control per field. A link always wins at render/compile time; the
// literal is only a fallback used while no link is bound. The "set"/"edit"/"remove" button
// switches what's shown: unbound shows the literal input + a "set" button to open Blocky;
// bound shows only "edit"/"remove" (the literal underneath stays whatever it last was, but
// is hidden and inert until the link is removed again).

// The literal-input + set/edit/remove-button control on its own, with no FieldRow/label
// wrapper — used both as LinkableValueField's own body and standalone (e.g. inline next to
// the Multi-State checkbox, where a separate label row would be redundant).
function LinkableValueFieldInline({ mode = 'number', literalValue, onLiteralChange, hasLink, onEditLink, onRemoveLink, width }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: width ?? '100%' }}>
      <div style={{ flex: 1, opacity: hasLink ? 0.4 : 1, minWidth: 0 }}>
        {mode === 'bool' ? (
          <StandardDropdownField
            value={literalValue ? 'true' : 'false'}
            onChange={v => onLiteralChange(v === 'true')}
            options={[{ label: 'True', value: 'true' }, { label: 'False', value: 'false' }]}
            disabled={hasLink}
          />
        ) : (
          <StringField
            value={literalValue ?? ''}
            onChange={onLiteralChange}
            disabled={hasLink}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        )}
      </div>
      {/* Fixed-width (not auto-sized to "set" vs "edit" text) so the button never shifts
          left/right depending on label length — matches the Data Component row's tiny
          buttons, which are always a fixed 24x24 regardless of what's inside them. The
          parent flex's own `gap: 6` already spaces every child evenly, so no extra
          margin/padding is added here. */}
      <button
        className="ycs-button field"
        title={hasLink ? 'Edit Blocky Link' : 'Set Blocky Link'}
        onClick={onEditLink}
        style={{ flexShrink: 0, fontSize: '11px', padding: 0, width: '36px', height: '24px' }}
      >
        {hasLink ? 'edit' : 'set'}
      </button>
      {hasLink && onRemoveLink && (
        <button className="ycs-tiny-button" onClick={onRemoveLink} title="Remove Blocky Link" style={{ border: '1px solid var(--ycs-foreground)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

function LinkableValueField({ label, mode = 'number', literalValue, onLiteralChange, hasLink, onEditLink, onRemoveLink }) {
  return (
    <FieldRow label={label}>
      <LinkableValueFieldInline
        mode={mode} literalValue={literalValue} onLiteralChange={onLiteralChange}
        hasLink={hasLink} onEditLink={onEditLink} onRemoveLink={onRemoveLink}
      />
    </FieldRow>
  );
}

// ── Multi-State list editor — each entry is a fully independent set of textures (Bar's
// filled/empty, Icon's icon), selected as a whole by the widget's resolved State Index.
// Per-state texture frame links are keyed "state_<i>_icon"/"state_<i>_barFilled"/"state_<i>_barEmpty"
// so each state's own spritesheet frame binds independently, same pattern as the base
// (non-Multi-State) texture slots' "frame_<slot>" keys.
function StateList({ widget, onChange, hasLink, onEditFrame, onRemoveLink }) {
  const states = widget.states || [];
  const setState = (i, patch) => {
    const next = states.map((s, si) => si === i ? { ...s, ...patch } : s);
    onChange({ ...widget, states: next });
  };
  const addState = () => onChange({ ...widget, states: [...states, blankStateEntry()] });
  const removeState = (i) => onChange({ ...widget, states: states.filter((_, si) => si !== i) });

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 15 }}>
      <div style={{ width: 2, flexShrink: 0, background: 'var(--ycs-foreground)', borderRadius: 1 }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {states.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 2, flexShrink: 0, background: 'var(--ycs-foreground)', borderRadius: 1 }} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, opacity: 0.6 }}>State {i}</span>
                <button className="ycs-tiny-button" onClick={() => removeState(i)} title="Remove State" style={{ border: '1px solid var(--ycs-foreground)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {widget.type === 'icon' && (
                <TexturePicker
                  label="Icon Texture" value={s.icon} onChange={v => setState(i, { icon: v })}
                  hasFrameLink={hasLink(`state_${i}_icon`)} onEditFrameLink={() => onEditFrame(`state_${i}_icon`)}
                  onRemoveFrameLink={() => onRemoveLink(`state_${i}_icon`)}
                />
              )}
              {widget.type === 'bar' && (
                <>
                  <TexturePicker
                    label="Filled Texture" value={s.barFilled} onChange={v => setState(i, { barFilled: v })}
                    hasFrameLink={hasLink(`state_${i}_barFilled`)} onEditFrameLink={() => onEditFrame(`state_${i}_barFilled`)}
                    onRemoveFrameLink={() => onRemoveLink(`state_${i}_barFilled`)}
                  />
                  <TexturePicker
                    label="Empty Texture" value={s.barEmpty} onChange={v => setState(i, { barEmpty: v })}
                    hasFrameLink={hasLink(`state_${i}_barEmpty`)} onEditFrameLink={() => onEditFrame(`state_${i}_barEmpty`)}
                    onRemoveFrameLink={() => onRemoveLink(`state_${i}_barEmpty`)}
                  />
                </>
              )}
            </div>
          </div>
        ))}
        <button
          className="ycs-button field"
          title="Add State"
          onClick={addState}
          style={{ flexShrink: 0, fontSize: '11px', minWidth: 'unset', padding: '0 6px', width: '100%', height: '24px' }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function WidgetInspector({ widget, allWidgets, layoutId, widgetIndex, previewW, previewH, onChange, onEditValue, onEditMax, onEditVisible, onEditText, onEditState, onEditFrame, onRemoveLink }) {
  if (!widget) return <div style={{ padding: 16, opacity: 0.4, fontSize: 12 }}>Select a widget to edit its properties.</div>;
  const set = (key, value) => onChange({ ...widget, [key]: value });
  const hasLink = kind => !!localStorage.getItem(`ycs-blocky::hudwidget::${layoutId || 'new'}::${widgetIndex}::${kind}`);

  // Resolves the current anchor container (canvas, or the anchorTarget widget's own rect).
  const anchorContainer = () => {
    const targetWidget = widget.anchorTarget ? allWidgets.find(w => w.id === widget.anchorTarget) : null;
    if (!targetWidget) return { containerX: 0, containerY: 0, containerW: previewW, containerH: previewH };
    const rect = resolveWidgetRect(targetWidget, allWidgets, previewW, previewH);
    return { containerX: rect.left, containerY: rect.top, containerW: rect.width, containerH: rect.height };
  };

  // Changing anchor alone would otherwise teleport the widget, since its screen position is
  // origin(anchor) + (x, y) and origin jumps between anchors — recompute x/y so the widget's
  // actual on-screen position is preserved and only the anchor's reference point changes.
  const setAnchor = (newAnchor) => {
    const { containerX, containerY, containerW, containerH } = anchorContainer();
    const { ox: oldOx, oy: oldOy } = anchorOrigin(widget.anchor, containerW, containerH, widget.width, widget.height, containerX, containerY);
    const { ox: newOx, oy: newOy } = anchorOrigin(newAnchor, containerW, containerH, widget.width, widget.height, containerX, containerY);
    const absX = oldOx + widget.x;
    const absY = oldOy + widget.y;
    onChange({ ...widget, anchor: newAnchor, x: Math.round(absX - newOx), y: Math.round(absY - newOy) });
  };

  // Switching anchorTarget (canvas <-> another widget) should also preserve absolute position,
  // same reasoning as setAnchor above — the container rect jumps, so re-derive x/y against it.
  const setAnchorTarget = (newTarget) => {
    const { containerX: oldCX, containerY: oldCY, containerW: oldCW, containerH: oldCH } = anchorContainer();
    const { ox: oldOx, oy: oldOy } = anchorOrigin(widget.anchor, oldCW, oldCH, widget.width, widget.height, oldCX, oldCY);
    const absX = oldOx + widget.x;
    const absY = oldOy + widget.y;

    const targetWidget = newTarget ? allWidgets.find(w => w.id === newTarget) : null;
    let newCX = 0, newCY = 0, newCW = previewW, newCH = previewH;
    if (targetWidget) {
      const rect = resolveWidgetRect(targetWidget, allWidgets, previewW, previewH);
      newCX = rect.left; newCY = rect.top; newCW = rect.width; newCH = rect.height;
    }
    const { ox: newOx, oy: newOy } = anchorOrigin(widget.anchor, newCW, newCH, widget.width, widget.height, newCX, newCY);
    onChange({ ...widget, anchorTarget: newTarget, x: Math.round(absX - newOx), y: Math.round(absY - newOy) });
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1, minHeight: 0 }}>
      <FieldRow label="Name">
        <StringField value={widget.name || ''} onChange={v => set('name', v)} style={{ width: '100%' }} />
      </FieldRow>
      <FieldRow label="Anchor To">
        <StandardDropdownField
          value={widget.anchorTarget || ''}
          onChange={setAnchorTarget}
          options={[
            { label: 'Canvas', value: '' },
            ...allWidgets
              .map((w, i) => ({ w, i }))
              .filter(({ w }) => w.id && w.id !== widget.id)
              .map(({ w, i }) => ({ label: widgetLabel(w, i), value: w.id })),
          ]}
        />
      </FieldRow>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 15 }}>
        <div style={{ minWidth: 140, width: 'auto', paddingRight: 16, paddingTop: 4, fontSize: 13, color: 'var(--ycs-text)', userSelect: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>Anchor</div>
        <div style={{ flex: 1 }}>
          <AnchorGrid value={widget.anchor} onChange={setAnchor} title="Anchor" />
        </div>
      </div>
      <FieldRow label="Offset X">
        <StringField value={String(widget.x)} onChange={v => set('x', parseInt(v) || 0)} style={{ width: '100%' }} />
      </FieldRow>
      <FieldRow label="Offset Y">
        <StringField value={String(widget.y)} onChange={v => set('y', parseInt(v) || 0)} style={{ width: '100%' }} />
      </FieldRow>
      <FieldRow label="Width">
        <StringField value={String(widget.width)} onChange={v => set('width', Math.max(4, parseInt(v) || 4))} style={{ width: '100%' }} />
      </FieldRow>
      <FieldRow label="Height">
        <StringField value={String(widget.height)} onChange={v => set('height', Math.max(4, parseInt(v) || 4))} style={{ width: '100%' }} />
      </FieldRow>

      <LinkableValueField
        label="Visibility" mode="bool"
        literalValue={widget.visibleLiteral !== false} onLiteralChange={v => set('visibleLiteral', v)}
        hasLink={hasLink('visible')} onEditLink={onEditVisible} onRemoveLink={() => onRemoveLink('visible')}
      />

      {(widget.type === 'icon' || widget.type === 'bar') && (
        <FieldRow label="Multiple States">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
            <input
              type="checkbox"
              checked={!!widget.multiState}
              onChange={e => {
                const on = e.target.checked;
                set('multiState', on);
                if (on && (!widget.states || widget.states.length === 0)) {
                  onChange({ ...widget, multiState: on, states: [blankStateEntry()] });
                }
              }}
            />
            {widget.multiState && (
              <LinkableValueFieldInline
                mode="number"
                literalValue={widget.stateLiteral} onLiteralChange={v => set('stateLiteral', v)}
                hasLink={hasLink('state')} onEditLink={onEditState} onRemoveLink={() => onRemoveLink('state')}
              />
            )}
          </div>
        </FieldRow>
      )}

      {(widget.type === 'icon' || widget.type === 'bar') && widget.multiState ? (
        <>
          <StateList
            widget={widget}
            onChange={onChange}
            hasLink={hasLink}
            onEditFrame={onEditFrame}
            onRemoveLink={onRemoveLink}
          />
          {widget.type === 'bar' && (
            <FieldRow label="Fallback Color">
              <StringField value={widget.color} onChange={v => set('color', v)} style={{ width: '100%' }} />
            </FieldRow>
          )}
        </>
      ) : (
        <>
          {widget.type === 'icon' && (
            <TexturePicker
              label="Icon Texture" value={widget.icon} onChange={v => set('icon', v)}
              hasFrameLink={hasLink('frame_icon')} onEditFrameLink={() => onEditFrame('icon')}
              onRemoveFrameLink={() => onRemoveLink('frame_icon')}
            />
          )}

          {widget.type === 'bar' && (
            <>
              <TexturePicker
                label="Filled Texture" value={widget.barFilled} onChange={v => set('barFilled', v)}
                hasFrameLink={hasLink('frame_barFilled')} onEditFrameLink={() => onEditFrame('barFilled')}
                onRemoveFrameLink={() => onRemoveLink('frame_barFilled')}
              />
              <TexturePicker
                label="Empty Texture" value={widget.barEmpty} onChange={v => set('barEmpty', v)}
                hasFrameLink={hasLink('frame_barEmpty')} onEditFrameLink={() => onEditFrame('barEmpty')}
                onRemoveFrameLink={() => onRemoveLink('frame_barEmpty')}
              />
              <FieldRow label="Fallback Color">
                <StringField value={widget.color} onChange={v => set('color', v)} style={{ width: '100%' }} />
              </FieldRow>
            </>
          )}
        </>
      )}
      {widget.type === 'text' && (
        <FieldRow label="Color">
          <StringField value={widget.color} onChange={v => set('color', v)} style={{ width: '100%' }} />
        </FieldRow>
      )}
      {widget.type === 'text' && (
        <FieldRow label="Text Size">
          <StringField
            value={String(widget.textFontScale ?? 1)}
            onChange={v => set('textFontScale', Math.max(0.1, parseFloat(v) || 1))}
            style={{ width: '100%' }}
          />
        </FieldRow>
      )}
      {widget.type === 'text' && (
        <div className="ycs-field-row" style={{ alignItems: 'flex-start', marginBottom: 15 }}>
          <div className="ycs-field-label">Text Align</div>
          <div className="ycs-field-control" style={{ padding: '4px 0' }}>
            <AnchorGrid value={widget.textAlign || 'top_left'} onChange={v => set('textAlign', v)} title="Text Align" />
          </div>
        </div>
      )}

      {widget.type === 'text' && (
        <FieldRow label="Text Mode">
          <StandardDropdownField
            value={widget.textMode === 'text' ? 'text' : 'number'}
            onChange={v => set('textMode', v)}
            options={[{ label: 'Number', value: 'number' }, { label: 'Text', value: 'text' }]}
          />
        </FieldRow>
      )}
      {widget.type === 'bar' && (
        <LinkableValueField
          label="Value" mode="number"
          literalValue={widget.valueLiteral} onLiteralChange={v => set('valueLiteral', v)}
          hasLink={hasLink('value')} onEditLink={onEditValue} onRemoveLink={() => onRemoveLink('value')}
        />
      )}
      {widget.type === 'text' && widget.textMode !== 'text' && (
        <LinkableValueField
          label="Value" mode="number"
          literalValue={widget.valueLiteral} onLiteralChange={v => set('valueLiteral', v)}
          hasLink={hasLink('value')} onEditLink={onEditValue} onRemoveLink={() => onRemoveLink('value')}
        />
      )}
      {widget.type === 'text' && widget.textMode === 'text' && (
        <LinkableValueField
          label="Text" mode="text"
          literalValue={widget.textLiteral} onLiteralChange={v => set('textLiteral', v)}
          hasLink={hasLink('text')} onEditLink={onEditText} onRemoveLink={() => onRemoveLink('text')}
        />
      )}
      {widget.type === 'bar' && (
        <LinkableValueField
          label="Max" mode="number"
          literalValue={widget.maxLiteral} onLiteralChange={v => set('maxLiteral', v)}
          hasLink={hasLink('max')} onEditLink={onEditMax} onRemoveLink={() => onRemoveLink('max')}
        />
      )}
      {widget.type === 'bar' && (
        <FieldRow label="Fill Lerp">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <input
              type="checkbox"
              checked={!!widget.fillLerpEnabled}
              onChange={e => set('fillLerpEnabled', e.target.checked)}
            />
            {widget.fillLerpEnabled && (
              <input
                type="range" min="0.01" max="1" step="0.01"
                value={widget.fillLerpStrength ?? 0.2}
                onChange={e => set('fillLerpStrength', parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
            )}
          </div>
        </FieldRow>
      )}
    </div>
  );
}

function HudEditor({ layoutId, onBack }) {
  const [name, setName] = useState('');
  const [widgets, setWidgets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingBinding, setEditingBinding] = useState(null); // { index, kind: 'value'|'max'|'visible'|'text' } — index 'layout' for the whole-layout gate
  const [visibleLiteral, setVisibleLiteral] = useState(true); // layout-level gate literal fallback (used only when no Blocky link is bound)
  const [resolution, setResolution] = useState('1920x1080');
  const [guiScale, setGuiScale] = useState(2);
  const [previewW, setPreviewW] = useState(DEFAULT_PREVIEW_W);
  const [previewH, setPreviewH] = useState(DEFAULT_PREVIEW_H);
  const [gridW, setGridW] = useState(DEFAULT_GRID_W);
  const [gridH, setGridH] = useState(DEFAULT_GRID_H);
  const [gridOffsetX, setGridOffsetX] = useState(0);
  const [gridOffsetY, setGridOffsetY] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewImageFit, setPreviewImageFit] = useState('contain');
  const [previewImageOpacity, setPreviewImageOpacity] = useState(0.5);
  const [sidebarWidth, setSidebarWidth] = useState(() => parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || 280);
  const [inspectorHeight, setInspectorHeight] = useState(() => {
    const v = parseInt(localStorage.getItem(INSPECTOR_HEIGHT_KEY));
    return Number.isFinite(v) ? v : null; // null = flex-auto default
  });
  const sidebarResizingRef = useRef(false);
  const splitResizingRef = useRef(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const onMove = e => {
      if (sidebarResizingRef.current) {
        const w = Math.min(Math.max(200, window.innerWidth - e.clientX), 600);
        setSidebarWidth(w);
      }
      if (splitResizingRef.current && sidebarRef.current) {
        const rect = sidebarRef.current.getBoundingClientRect();
        const h = Math.min(Math.max(80, e.clientY - rect.top), rect.height - 80);
        setInspectorHeight(h);
      }
    };
    const onUp = () => {
      if (sidebarResizingRef.current) localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
      if (splitResizingRef.current && inspectorHeight != null) localStorage.setItem(INSPECTOR_HEIGHT_KEY, String(inspectorHeight));
      sidebarResizingRef.current = false;
      splitResizingRef.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [sidebarWidth, inspectorHeight]);

  useEffect(() => {
    if (!layoutId) return;
    invoke('load_ycs_data', { category: 'hud', id: layoutId })
      .then(raw => {
        const data = JSON.parse(raw);
        setName(data.name || layoutId);
        // Backfill stable ids for widgets saved before "Anchor To" existed — without this,
        // older layouts have no id for other widgets to reference until re-saved once.
        setWidgets((data.widgets || []).map(w => w.id ? w : { ...w, id: genWidgetId() }));
        if (data.previewW) setPreviewW(data.previewW);
        if (data.previewH) setPreviewH(data.previewH);
        if (data.gridW) setGridW(data.gridW);
        if (data.gridH) setGridH(data.gridH);
        if (data.gridOffsetX) setGridOffsetX(data.gridOffsetX);
        if (data.gridOffsetY) setGridOffsetY(data.gridOffsetY);
        if (data.previewImage) setPreviewImage(data.previewImage);
        if (data.previewImageFit) setPreviewImageFit(data.previewImageFit);
        if (typeof data.previewImageOpacity === 'number') setPreviewImageOpacity(data.previewImageOpacity);
        setVisibleLiteral(data.visibleLiteral !== false);
      })
      .catch(() => {});
  }, [layoutId]);

  const pickPreviewImage = async (path) => {
    try {
      const dataUrl = await invoke('read_image_base64', { path });
      setPreviewImage(dataUrl);
    } catch {}
  };

  const addWidget = type => {
    const defaults = widgetDefaults(type);
    const id = genWidgetId();
    setWidgets(w => {
      const next = [...w, {
        id, type, anchor: 'top_left', anchorTarget: '', x: 10, y: 10, ...defaults,
        valueSourceId: '', maxSourceId: '', valueLiteral: '0', maxLiteral: '100',
        visibleSourceId: '', visibleLiteral: true,
        fillLerpEnabled: false, fillLerpStrength: 0.2,
        textMode: 'number', textSourceId: '', textLiteral: '',
        icon: { ...NO_TEXTURE }, barFilled: { ...NO_TEXTURE }, barEmpty: { ...NO_TEXTURE },
        multiState: false, stateSourceId: '', stateLiteral: '0', states: [],
      }];
      setSelected(next.length - 1);
      return next;
    });
  };

  const updateWidget = (index, next) => setWidgets(w => w.map((x, i) => i === index ? next : x));
  const dragWidget = (index, x, y) => setWidgets(w => w.map((x0, i) => i === index ? { ...x0, x, y } : x0));
  const resizeWidget = (index, patch) => setWidgets(w => w.map((x0, i) => i === index ? { ...x0, ...patch } : x0));

  // Every localStorage kind-suffix a widget's Blocky bindings can live under — the fixed set
  // plus one frame_state_<i>_<slot> triple per Multi-State entry. Bindings are keyed by
  // ARRAY INDEX (ycs-blocky::hudwidget::<layoutId>::<index>::<kind>), not by the widget's own
  // stable id, so any operation that changes a widget's index (delete, reorder) must move its
  // bindings to the new index alongside it — otherwise the widget silently starts reading
  // whatever binding happens to already be under its new index (or nothing at all).
  const widgetBindingKinds = (w) => {
    const kinds = ['value', 'max', 'visible', 'text', 'state', 'frame_icon', 'frame_barFilled', 'frame_barEmpty'];
    for (let i = 0; i < (w?.states?.length || 0); i++) {
      kinds.push(`frame_state_${i}_icon`, `frame_state_${i}_barFilled`, `frame_state_${i}_barEmpty`);
    }
    return kinds;
  };
  const moveWidgetBindings = (w, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    for (const kind of widgetBindingKinds(w)) {
      const key = `ycs-blocky::hudwidget::${layoutId || 'new'}::${fromIndex}::${kind}`;
      const raw = localStorage.getItem(key);
      localStorage.removeItem(key);
      if (raw !== null) localStorage.setItem(`ycs-blocky::hudwidget::${layoutId || 'new'}::${toIndex}::${kind}`, raw);
    }
  };
  const deleteWidgetBindings = (w, index) => {
    for (const kind of widgetBindingKinds(w)) {
      localStorage.removeItem(`ycs-blocky::hudwidget::${layoutId || 'new'}::${index}::${kind}`);
    }
  };

  const deleteWidget = index => {
    // Every widget AFTER the deleted one shifts down by one index once it's removed from the
    // array — move each of their bindings down to match BEFORE deleting the target's own, so
    // nothing collides mid-shift (ascending order: each destination slot is only written after
    // being vacated by the previous step). The trailing slot is cleared using the LAST widget's
    // own kind list (not the deleted widget's) since that's whose bindings end up duplicated
    // there once everything above shifts down.
    for (let i = index + 1; i < widgets.length; i++) {
      moveWidgetBindings(widgets[i], i, i - 1);
    }
    deleteWidgetBindings(widgets[widgets.length - 1], widgets.length - 1);
    setWidgets(ws => ws.filter((_, i) => i !== index));
    setSelected(s => s === index ? null : (s > index ? s - 1 : s));
  };
  const reorderWidgets = (from, to) => {
    if (from === to) return;
    // Moving widget `from` to `to` shifts every widget strictly between the two positions by
    // one index (toward `from`), same as the array splice below — relocate their bindings
    // to match, then move `from`'s own bindings to its final resting place `to`.
    const movingBindings = widgets.map((w, i) => ({ w, i }));
    if (from < to) {
      for (let i = from + 1; i <= to; i++) moveWidgetBindings(movingBindings[i].w, i, i - 1);
    } else {
      // Shifting UP (to < from): must process in DESCENDING order so each destination slot
      // is vacated (already moved out) before something else is written into it — ascending
      // order here would overwrite a not-yet-moved neighbor's bindings.
      for (let i = from - 1; i >= to; i--) moveWidgetBindings(movingBindings[i].w, i, i + 1);
    }
    moveWidgetBindings(widgets[from], from, to);
    setWidgets(w => {
      const arr = [...w];
      const [m] = arr.splice(from, 1);
      arr.splice(to, 0, m);
      return arr;
    });
    setSelected(to);
  };

  const widgetBindingStorageId = (index, kind) => `${layoutId || 'new'}::${index}::${kind}`;

  // Clears a bound Blocky link so the widget/layout falls back to its typed literal again.
  // Forces a re-render (widgets/visibleLiteral state isn't otherwise touched) since hasLink
  // reads localStorage directly rather than through React state.
  const removeBindingLink = (index, kind) => {
    localStorage.removeItem(`ycs-blocky::hudwidget::${widgetBindingStorageId(index, kind)}`);
    if (index === 'layout') {
      setVisibleLiteral(v => v);
    } else {
      setWidgets(w => w.map((x, i) => i === index ? { ...x } : x));
    }
  };

  const compileBinding = async (widgetsOut, i, kind, trimmed, id, injections, allImports) => {
    const raw = localStorage.getItem(`ycs-blocky::hudwidget::${widgetBindingStorageId(i, kind)}`);
    if (!raw) return '';
    try {
      const nodes = JSON.parse(raw);
      const valueExpr = compileValueGraph(nodes, 'hudRender');
      if (valueExpr === null) return '';
      for (const imp of collectBlockImports(nodes)) allImports.add(imp);
      const sourceId = `${trimmed}_w${i}_${kind}`;
      const methodLine = `        register("${sourceId}", player -> (double)(${valueExpr}));`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/hud/client/HudValueSources.java`,
        marker: 'YCS_Hud_Value_Sources',
        content: methodLine,
      });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/hud/client/HudValueSources.java`, marker: 'YCS_Hud_Value_Sources', content: methodLine });
      if (widgetBindingStorageId(i, kind) !== `${id}::${i}::${kind}`) {
        localStorage.setItem(`ycs-blocky::hudwidget::${id}::${i}::${kind}`, raw);
      }
      return sourceId;
    } catch (e) {
      console.error(`HUD ${kind} compile error for widget`, i, e);
      return '';
    }
  };

  // Compiles a "visible" gate binding (per-widget index, or 'layout' for the whole-layout
  // gate) into HudBoolSources.java — the boolean counterpart to compileBinding above.
  const compileBoolBinding = async (index, trimmed, id, injections, allImports) => {
    const storageId = widgetBindingStorageId(index, 'visible');
    const raw = localStorage.getItem(`ycs-blocky::hudwidget::${storageId}`);
    if (!raw) return '';
    try {
      const nodes = JSON.parse(raw);
      const boolExpr = compileValueGraph(nodes, 'hudRender', 'hud.return_bool', 'true');
      if (boolExpr === null) return '';
      for (const imp of collectBlockImports(nodes)) allImports.add(imp);
      const sourceId = `${trimmed}_${index === 'layout' ? 'layout' : `w${index}`}_visible`;
      const methodLine = `        register("${sourceId}", player -> (boolean)(${boolExpr}));`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/hud/client/HudBoolSources.java`,
        marker: 'YCS_Hud_Bool_Sources',
        content: methodLine,
      });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/hud/client/HudBoolSources.java`, marker: 'YCS_Hud_Bool_Sources', content: methodLine });
      if (storageId !== `${id}::${index}::visible`) {
        localStorage.setItem(`ycs-blocky::hudwidget::${id}::${index}::visible`, raw);
      }
      return sourceId;
    } catch (e) {
      console.error('HUD visibility compile error for', index, e);
      return '';
    }
  };

  // Compiles a widget's Text link (Text-mode Text widgets only) into HudTextSources.java —
  // the string counterpart to compileBinding/compileBoolBinding above.
  const compileTextBinding = async (i, trimmed, id, injections, allImports) => {
    const storageId = widgetBindingStorageId(i, 'text');
    const raw = localStorage.getItem(`ycs-blocky::hudwidget::${storageId}`);
    if (!raw) return '';
    try {
      const nodes = JSON.parse(raw);
      const textExpr = compileValueGraph(nodes, 'hudRender', 'hud.return_text', '""');
      if (textExpr === null) return '';
      for (const imp of collectBlockImports(nodes)) allImports.add(imp);
      const sourceId = `${trimmed}_w${i}_text`;
      const methodLine = `        register("${sourceId}", player -> (String)(${textExpr}));`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/hud/client/HudTextSources.java`,
        marker: 'YCS_Hud_Text_Sources',
        content: methodLine,
      });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/hud/client/HudTextSources.java`, marker: 'YCS_Hud_Text_Sources', content: methodLine });
      if (storageId !== `${id}::${i}::text`) {
        localStorage.setItem(`ycs-blocky::hudwidget::${id}::${i}::text`, raw);
      }
      return sourceId;
    } catch (e) {
      console.error('HUD text compile error for widget', i, e);
      return '';
    }
  };

  const handleSave = async () => {
    const trimmed = name.trim().toLowerCase().replace(/\s/g, '_');
    if (!trimmed) { setStatus({ ok: false, msg: 'Name is required.' }); return; }
    setSaving(true);
    setStatus(null);
    try {
      const id = layoutId || trimmed;

      if (layoutId) {
        const prev = await invoke('load_ycs_data', { category: 'hud', id: layoutId }).then(r => JSON.parse(r)).catch(() => null);
        if (prev?._injections) {
          for (const inj of prev._injections) {
            if (inj.type === 'java-marker') {
              await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content }).catch(() => {});
            } else if (inj.type === 'created-file') {
              await invoke('delete_mod_file', { file: inj.file }).catch(() => {});
            }
          }
        }
      }

      const injections = [];

      // Copy any referenced textures into the mod's HUD texture folder
      const textureIds = new Set();
      for (const w of widgets) {
        for (const ref of [w.icon, w.barFilled, w.barEmpty]) {
          if (ref?.id) textureIds.add(ref.id);
        }
        for (const s of w.states || []) {
          for (const ref of [s.icon, s.barFilled, s.barEmpty]) {
            if (ref?.id) textureIds.add(ref.id);
          }
        }
      }
      for (const texId of textureIds) {
        const destFile = `${RES_BASE}/textures/hud/${texId}.png`;
        await invoke('copy_texture_to_mod', { textureId: texId, destFile }).catch(() => {});
        injections.push({ type: 'created-file', file: destFile });
      }

      // Compile each widget's value/max/text/visibility link graphs (if any — a link always
      // wins over the widget's own typed literal, which is only a fallback) into their
      // respective HudXSources.java. compileBinding/compileBoolBinding/compileTextBinding all
      // return '' when no Blocky graph is bound, in which case the literal is what's written.
      const widgetsOut = [];
      const allImports = new Set();
      const allBoolImports = new Set();
      const allTextImports = new Set();
      for (let i = 0; i < widgets.length; i++) {
        const w = widgets[i];
        let valueSourceId = '', maxSourceId = '', visibleSourceIdOut = '', textSourceIdOut = '';
        const textWidgetInTextMode = w.type === 'text' && w.textMode === 'text';
        if (w.type === 'bar' || (w.type === 'text' && !textWidgetInTextMode)) {
          valueSourceId = await compileBinding(widgetsOut, i, 'value', trimmed, id, injections, allImports);
        }
        if (w.type === 'bar') {
          maxSourceId = await compileBinding(widgetsOut, i, 'max', trimmed, id, injections, allImports);
        }
        if (textWidgetInTextMode) {
          textSourceIdOut = await compileTextBinding(i, trimmed, id, injections, allTextImports);
        }
        visibleSourceIdOut = await compileBoolBinding(i, trimmed, id, injections, allBoolImports);

        let stateSourceIdOut = '';
        if (w.multiState && (w.type === 'bar' || w.type === 'icon')) {
          stateSourceIdOut = await compileBinding(widgetsOut, i, 'state', trimmed, id, injections, allImports);
        }

        // Each texture slot's optional frame/ticks-per-frame Blocky link (spritesheets only)
        // compiles as just another numeric HudValueSources entry, same as Value/Max.
        let icon = w.icon, barFilled = w.barFilled, barEmpty = w.barEmpty;
        if (icon && (icon.rows || 1) > 1) {
          icon = { ...icon, frameSourceId: await compileBinding(widgetsOut, i, 'frame_icon', trimmed, id, injections, allImports) };
        }
        if (barFilled && (barFilled.rows || 1) > 1) {
          barFilled = { ...barFilled, frameSourceId: await compileBinding(widgetsOut, i, 'frame_barFilled', trimmed, id, injections, allImports) };
        }
        if (barEmpty && (barEmpty.rows || 1) > 1) {
          barEmpty = { ...barEmpty, frameSourceId: await compileBinding(widgetsOut, i, 'frame_barEmpty', trimmed, id, injections, allImports) };
        }

        // Multi-State entries mirror the same frame-link compilation per state, keyed
        // "state_<si>_<slot>" so each state's own spritesheet frame binds independently.
        let states = w.states || [];
        if (w.multiState) {
          const nextStates = [];
          for (let si = 0; si < states.length; si++) {
            let s = states[si];
            let sIcon = s.icon, sFilled = s.barFilled, sEmpty = s.barEmpty;
            if (sIcon && (sIcon.rows || 1) > 1) {
              sIcon = { ...sIcon, frameSourceId: await compileBinding(widgetsOut, i, `state_${si}_icon`, trimmed, id, injections, allImports) };
            }
            if (sFilled && (sFilled.rows || 1) > 1) {
              sFilled = { ...sFilled, frameSourceId: await compileBinding(widgetsOut, i, `state_${si}_barFilled`, trimmed, id, injections, allImports) };
            }
            if (sEmpty && (sEmpty.rows || 1) > 1) {
              sEmpty = { ...sEmpty, frameSourceId: await compileBinding(widgetsOut, i, `state_${si}_barEmpty`, trimmed, id, injections, allImports) };
            }
            nextStates.push({ icon: sIcon, barFilled: sFilled, barEmpty: sEmpty });
          }
          states = nextStates;
        }

        widgetsOut.push({ ...w, valueSourceId, maxSourceId, visibleSourceId: visibleSourceIdOut, textSourceId: textSourceIdOut, stateSourceId: stateSourceIdOut, icon, barFilled, barEmpty, states });
      }

      const layoutVisibleSourceId = await compileBoolBinding('layout', trimmed, id, injections, allBoolImports);

      for (const imp of allImports) {
        const importLine = `import ${imp};`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/hud/client/HudValueSources.java`,
          marker: 'YCS_Hud_Value_Source_Imports',
          content: importLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/hud/client/HudValueSources.java`, marker: 'YCS_Hud_Value_Source_Imports', content: importLine });
      }
      for (const imp of allBoolImports) {
        const importLine = `import ${imp};`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/hud/client/HudBoolSources.java`,
          marker: 'YCS_Hud_Bool_Source_Imports',
          content: importLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/hud/client/HudBoolSources.java`, marker: 'YCS_Hud_Bool_Source_Imports', content: importLine });
      }
      for (const imp of allTextImports) {
        const importLine = `import ${imp};`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/hud/client/HudTextSources.java`,
          marker: 'YCS_Hud_Text_Source_Imports',
          content: importLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/hud/client/HudTextSources.java`, marker: 'YCS_Hud_Text_Source_Imports', content: importLine });
      }

      // Write the layout JSON straight into the mod's resources (no codegen needed for layout/positions)
      // HudOverlayRenderer paints its widget list in order, last-painted-on-top. The editor's
      // Layers panel shows index 0 as the TOP layer (highest on-screen z-order), so the two
      // disagree unless reversed here: writing the layout with index 0 painted LAST is what
      // makes "top of the Layers list" actually render on top in-game too.
      const layoutFile = `${RES_BASE}/hud/${trimmed}.json`;
      await invoke('write_mod_file', { file: layoutFile, content: JSON.stringify([...widgetsOut].reverse(), null, 2) });
      injections.push({ type: 'created-file', file: layoutFile });

      // Register this layout name so HudOverlayRenderer picks it up
      const regLine = `        HudOverlayRenderer.registerLayout("${trimmed}");`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/hud/ModHud.java`,
        marker: 'YCS_Hud_Layouts',
        content: regLine,
      });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/hud/ModHud.java`, marker: 'YCS_Hud_Layouts', content: regLine });

      const visRegLine = `        HudOverlayRenderer.registerLayoutVisibility("${trimmed}", "${layoutVisibleSourceId}", ${visibleLiteral !== false});`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/hud/ModHud.java`,
        marker: 'YCS_Hud_Layouts',
        content: visRegLine,
      });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/hud/ModHud.java`, marker: 'YCS_Hud_Layouts', content: visRegLine });

      const payload = {
        name: trimmed, widgets: widgetsOut, previewW, previewH, gridW, gridH, gridOffsetX, gridOffsetY,
        previewImage, previewImageFit, previewImageOpacity,
        visibleLiteral, visibleSourceId: layoutVisibleSourceId, _injections: injections,
      };
      await invoke('save_ycs_data', { category: 'hud', id, content: JSON.stringify(payload, null, 2) });

      if (layoutId && layoutId !== id) {
        await invoke('delete_ycs_data', { category: 'hud', id: layoutId }).catch(() => {});
      }

      setStatus({ ok: true, msg: 'Saved.' });
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: String(err) });
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!layoutId) return;
    setSaving(true);
    try {
      const prev = await invoke('load_ycs_data', { category: 'hud', id: layoutId }).then(r => JSON.parse(r)).catch(() => null);
      if (prev?._injections) {
        for (const inj of prev._injections) {
          if (inj.type === 'java-marker') {
            await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content }).catch(() => {});
          } else if (inj.type === 'created-file') {
            await invoke('delete_mod_file', { file: inj.file }).catch(() => {});
          }
        }
      }
      await invoke('delete_ycs_data', { category: 'hud', id: layoutId });
      for (let i = 0; i < widgets.length; i++) {
        deleteWidgetBindings(widgets[i], i);
      }
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Remove failed: ' + err });
    }
    setSaving(false);
  };

  if (editingBinding !== null) {
    return (
      <BlockEditor
        hudWidgetId={widgetBindingStorageId(editingBinding.index, editingBinding.kind)}
        onBack={() => setEditingBinding(null)}
      />
    );
  }

  const gridStyle = showGrid ? {
    backgroundImage: `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`,
    backgroundSize: `${gridW}px ${gridH}px`,
    backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
  } : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
          {layoutId ? 'Edit HUD Layout' : 'New HUD Layout'}
        </h2>
        <div style={{ flex: 1 }} />
        {status && <span style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</span>}
        {layoutId && <button className="ycs-button" onClick={handleRemove} disabled={saving} style={{ color: '#e05252' }}>Remove</button>}
        <button className="ycs-button" onClick={onBack}>Cancel</button>
        <button className="ycs-button" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <PannableCanvas
          previewW={previewW} previewH={previewH}
          gridStyle={gridStyle}
          previewImage={previewImage}
          previewImageFit={previewImageFit}
          previewImageOpacity={previewImageOpacity}
          onDeselect={() => setSelected(null)}
        >
          {widgets.map((w, i) => (
            <WidgetBox
              key={i} widget={w} allWidgets={widgets} previewW={previewW} previewH={previewH}
              gridW={gridW} gridH={gridH} gridOffsetX={gridOffsetX} gridOffsetY={gridOffsetY}
              snapEnabled={snapEnabled}
              selected={selected === i} onSelect={() => setSelected(i)}
              onDrag={(x, y) => dragWidget(i, x, y)}
              onResize={patch => resizeWidget(i, patch)}
              layerIndex={widgets.length - i}
            />
          ))}
        </PannableCanvas>
        <div
          onMouseDown={e => { e.preventDefault(); sidebarResizingRef.current = true; }}
          style={{ width: 5, flexShrink: 0, cursor: 'col-resize', background: 'transparent' }}
        />
        <div ref={sidebarRef} style={{ width: sidebarWidth, flexShrink: 0, borderLeft: '1px solid var(--ycs-foreground)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ height: inspectorHeight ?? undefined, flex: inspectorHeight ? '0 0 auto' : '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selected !== null ? (
              <WidgetInspector
                widget={widgets[selected]}
                allWidgets={widgets}
                layoutId={layoutId} widgetIndex={selected}
                previewW={previewW} previewH={previewH}
                onChange={next => updateWidget(selected, next)}
                onEditValue={() => setEditingBinding({ index: selected, kind: 'value' })}
                onEditMax={() => setEditingBinding({ index: selected, kind: 'max' })}
                onEditVisible={() => setEditingBinding({ index: selected, kind: 'visible' })}
                onEditText={() => setEditingBinding({ index: selected, kind: 'text' })}
                onEditState={() => setEditingBinding({ index: selected, kind: 'state' })}
                onEditFrame={slot => setEditingBinding({ index: selected, kind: `frame_${slot}` })}
                onRemoveLink={kind => removeBindingLink(selected, kind)}
              />
            ) : (
              <LayoutPanel
                name={name} setName={setName}
                resolution={resolution} setResolution={setResolution}
                guiScale={guiScale} setGuiScale={setGuiScale}
                setPreviewW={setPreviewW} setPreviewH={setPreviewH}
                gridW={gridW} setGridW={setGridW}
                gridH={gridH} setGridH={setGridH}
                gridOffsetX={gridOffsetX} setGridOffsetX={setGridOffsetX}
                gridOffsetY={gridOffsetY} setGridOffsetY={setGridOffsetY}
                showGrid={showGrid} setShowGrid={setShowGrid}
                snapEnabled={snapEnabled} setSnapEnabled={setSnapEnabled}
                previewImage={previewImage} onPickPreviewImage={pickPreviewImage} onClearPreviewImage={() => setPreviewImage(null)}
                previewImageFit={previewImageFit} setPreviewImageFit={setPreviewImageFit}
                previewImageOpacity={previewImageOpacity} setPreviewImageOpacity={setPreviewImageOpacity}
                visibleLiteral={visibleLiteral} setVisibleLiteral={setVisibleLiteral}
                hasVisibleLink={!!localStorage.getItem(`ycs-blocky::hudwidget::${layoutId || 'new'}::layout::visible`)}
                onEditVisible={() => setEditingBinding({ index: 'layout', kind: 'visible' })}
                onRemoveVisibleLink={() => removeBindingLink('layout', 'visible')}
              />
            )}
          </div>
          <div
            onMouseDown={e => { e.preventDefault(); splitResizingRef.current = true; }}
            style={{ height: 5, flexShrink: 0, cursor: 'row-resize', background: 'var(--ycs-foreground)' }}
          />
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <LayerList widgets={widgets} selected={selected} onSelect={setSelected} onReorder={reorderWidgets} onDelete={deleteWidget} onAddWidget={addWidget} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HudLanding({ isActive = false }) {
  const [layouts, setLayouts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  useTitlebarActions({ active: isActive, search, onSearchChange: setSearch, onAdd: () => { setEditing(null); setCreating(true); } });

  const reload = useCallback(async () => {
    try {
      const ids = await invoke('list_ycs_data', { category: 'hud' });
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'hud', id });
          loaded.push({ id, ...JSON.parse(raw) });
        } catch {}
      }
      setLayouts(loaded);
    } catch { setLayouts([]); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const deleteLayout = async (layout, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete HUD layout "${layout.name || layout.id}"?`)) return;
    try {
      if (layout._injections) {
        for (const inj of layout._injections) {
          if (inj.type === 'java-marker') {
            await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content }).catch(() => {});
          } else if (inj.type === 'created-file') {
            await invoke('delete_mod_file', { file: inj.file }).catch(() => {});
          }
        }
      }
      await invoke('delete_ycs_data', { category: 'hud', id: layout.id });
      await reload();
    } catch {}
  };

  if (creating) return <HudEditor onBack={() => { setCreating(false); reload(); }} />;
  if (editing) return <HudEditor layoutId={editing} onBack={() => { setEditing(null); reload(); }} />;

  const protectedLayoutIds = new Set(['ability', 'alt_ability', 'resource']);
  const filtered = layouts
    .filter(l => !protectedLayoutIds.has(l.id || l.name))
    .filter(l => !search || (l.name || l.id).toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: 0 }}>
        {filtered.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filtered.map(layout => (
              <div
                key={layout.id}
                onClick={() => setEditing(layout.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', height: 40,
                  border: '1px solid var(--ycs-foreground)', borderRadius: 'var(--ycs-radius, 4px)', cursor: 'pointer', position: 'relative',
                  transition: 'background-color 0.1s, border-color 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--ycs-accent)'; e.currentTarget.style.borderColor = 'var(--ycs-highlight)'; const d = e.currentTarget.querySelector('.row-delete'); if (d) d.style.opacity = '1'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'var(--ycs-foreground)'; const d = e.currentTarget.querySelector('.row-delete'); if (d) d.style.opacity = '0'; }}
              >
                <span style={{ fontSize: 13, flex: 1 }}>{layout.name || layout.id}</span>
                <span style={{ fontSize: 11, opacity: 0.5 }}>{(layout.widgets || []).length} widget(s)</span>
                <div className="row-delete" onClick={e => deleteLayout(layout, e)} title="Delete" style={{ width: 18, height: 18, cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <circle cx="9" cy="9" r="9" fill="white"/>
                    <line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.3, fontSize: '13px', padding: '8px 0' }}>No HUD layouts yet. Click + to add one.</div>
        )}
      </div>
    </div>
  );
}
