import React, { useRef, useEffect, useState, useCallback } from 'react';

const STORAGE_PREFIX = 'ycs-blocky::';

const BLOCK_COLORS = {
  start: '#1e293b',
  animation: '#3a5c3a',
  logic: '#6494a4',
  effects: '#c46c94',
  text: '#5ba558',
  entity: '#30e1b9',
  number: '#4d65b4',
  itemstack: '#945d66',
  disconnected: '#4a4a5a',
  default: '#5a9a6a',
};

const BLOCK_H = 50;
const BLOCK_MIN_W = 120;
const BLOCK_RADIUS = 10;
const SNAP_THRESHOLD = 60;

const PALETTE_BLOCKS = [
  { category: 'Logic', sub: 'actions', items: [
    { opcode: 'control.if', label: 'If', isAction: true, color: BLOCK_COLORS.logic },
    { opcode: 'control.delay', label: 'Delay', isAction: true, color: BLOCK_COLORS.logic },
  ]},
  { category: 'Effects', sub: 'actions', items: [
    { opcode: 'effect.apply', label: 'Add Effect', isAction: true, color: BLOCK_COLORS.effects },
  ]},
  { category: 'Animation', sub: 'actions', items: [
    { opcode: 'anim.firstperson.play', label: 'Play FP Anim', isAction: true, color: BLOCK_COLORS.animation },
    { opcode: 'anim.firstperson.stop', label: 'Stop FP Anim', isAction: true, color: BLOCK_COLORS.animation },
    { opcode: 'anim.thirdperson.play', label: 'Play TP Anim', isAction: true, color: BLOCK_COLORS.animation },
    { opcode: 'anim.thirdperson.stop', label: 'Stop TP Anim', isAction: true, color: BLOCK_COLORS.animation },
  ]},
  { category: 'Entity', sub: 'data', items: [
    { opcode: 'entity.event', label: 'Event Entity', linkType: 'entity', color: BLOCK_COLORS.entity },
    { opcode: 'entity.target', label: 'Target Entity', linkType: 'entity', color: BLOCK_COLORS.entity },
    { opcode: 'entity.pos_x', label: 'Pos X', linkType: 'number', color: BLOCK_COLORS.number },
    { opcode: 'entity.pos_y', label: 'Pos Y', linkType: 'number', color: BLOCK_COLORS.number },
    { opcode: 'entity.pos_z', label: 'Pos Z', linkType: 'number', color: BLOCK_COLORS.number },
  ]},
  { category: 'Numbers', sub: 'data', items: [
    { opcode: 'number.literal', label: '0', linkType: 'number', color: BLOCK_COLORS.number },
    { opcode: 'number.math', label: 'Math', linkType: 'number', color: BLOCK_COLORS.number },
  ]},
  { category: 'Text', sub: 'data', items: [
    { opcode: 'text.literal', label: '"text"', linkType: 'text', color: BLOCK_COLORS.text },
  ]},
  { category: 'Logic', sub: 'data', items: [
    { opcode: 'logic.true', label: 'True', linkType: 'logic', color: BLOCK_COLORS.logic },
    { opcode: 'logic.false', label: 'False', linkType: 'logic', color: BLOCK_COLORS.logic },
    { opcode: 'logic.compare', label: 'Compare', linkType: 'logic', color: BLOCK_COLORS.logic },
  ]},
  { category: 'Variables', sub: 'actions', items: [
    { opcode: 'variable.set', label: 'Set Variable', isAction: true, color: BLOCK_COLORS.default },
  ]},
  { category: 'Variables', sub: 'data', items: [
    { opcode: 'variable.get', label: 'Get Variable', linkType: 'number', color: BLOCK_COLORS.number },
  ]},
  { category: 'Attributes', sub: 'actions', items: [
    { opcode: 'attribute.modifier.add', label: 'Set Attr Modifier', isAction: true, color: BLOCK_COLORS.default },
    { opcode: 'attribute.modifier.remove', label: 'Remove Attr Modifier', isAction: true, color: BLOCK_COLORS.default },
    { opcode: 'attribute.base.reset', label: 'Reset Attr Base', isAction: true, color: BLOCK_COLORS.default },
  ]},
  { category: 'Attributes', sub: 'data', items: [
    { opcode: 'attribute.get', label: 'Get Attribute', linkType: 'number', color: BLOCK_COLORS.number },
  ]},
  { category: 'Chat', sub: 'actions', items: [
    { opcode: 'chat.send', label: 'Send Message', isAction: true, color: BLOCK_COLORS.default },
  ]},
  { category: 'Data Components', sub: 'actions', items: [
    { opcode: 'datacomp.set', label: 'Set Data Component', isAction: true, color: BLOCK_COLORS.default },
  ]},
  { category: 'Data Components', sub: 'data', items: [
    { opcode: 'datacomp.get', label: 'Get Data Component', linkType: 'number', color: BLOCK_COLORS.number },
  ]},
];

function makeId() { return 'n' + Math.random().toString(36).slice(2, 9); }


// ── Block Palette (child tile, spawns on the left) ──────────────────────
export function BlockPalettePage() {
  const [openCats, setOpenCats] = useState({});
  const toggle = (cat) => setOpenCats(p => ({ ...p, [cat]: !p[cat] }));

  const grouped = {};
  PALETTE_BLOCKS.forEach(pg => {
    if (!grouped[pg.category]) grouped[pg.category] = { data: [], actions: [] };
    grouped[pg.category][pg.sub].push(...pg.items);
  });

  const onItemMouseDown = (e, block) => {
    e.preventDefault();
    window.__blockyDragBlock = { block, startX: e.clientX, startY: e.clientY };
    const onMove = (me) => {
      const d = window.__blockyDragBlock;
      if (!d) return;
      if (!d.ghost) {
        if (Math.abs(me.clientX - d.startX) + Math.abs(me.clientY - d.startY) < 5) return;
        const ghost = document.createElement('div');
        ghost.textContent = d.block.label;
        ghost.style.cssText = `position:fixed;pointer-events:none;z-index:99999;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;color:#fff;background:${d.block.color || '#5a9a6a'};opacity:0.85;white-space:nowrap;`;
        document.body.appendChild(ghost);
        d.ghost = ghost;
      }
      d.ghost.style.left = me.clientX + 8 + 'px';
      d.ghost.style.top = me.clientY + 8 + 'px';
    };
    const onUp = (ue) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const d = window.__blockyDragBlock;
      if (d?.ghost) {
        d.ghost.remove();
        window.dispatchEvent(new CustomEvent('ycs-blocky-drop', {
          detail: { block: d.block, clientX: ue.clientX, clientY: ue.clientY }
        }));
      }
      window.__blockyDragBlock = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'transparent', color: 'var(--ycs-text)',
      }}>
        <div style={{ padding: '8px 12px', flexShrink: 0, borderBottom: '1px solid var(--ycs-foreground)' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>Palette</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '4px 0' }}>
          {Object.entries(grouped).map(([cat, { data, actions }]) => (
            <div key={cat}>
              <div onClick={() => toggle(cat)} style={{
                padding: '5px 12px', fontSize: '11px', fontWeight: 600, opacity: 0.7,
                cursor: 'pointer', userSelect: 'none', display: 'flex', justifyContent: 'space-between',
              }}>
                {cat} <span style={{ fontSize: '9px' }}>{openCats[cat] ? '▾' : '▸'}</span>
              </div>
              {openCats[cat] && (
                <div style={{ padding: '0 8px 4px' }}>
                  {actions.length > 0 && (
                    <>
                      <div style={{ fontSize: '9px', opacity: 0.35, padding: '2px 4px', fontWeight: 700 }}>ACTIONS</div>
                      {actions.map(b => (
                        <div
                          key={b.opcode}
                          onMouseDown={e => onItemMouseDown(e, b)}
                          style={{
                            padding: '4px 8px', margin: '1px 0', borderRadius: 6, fontSize: '11px',
                            fontWeight: 600, color: '#fff', cursor: 'grab', userSelect: 'none',
                            background: b.color || BLOCK_COLORS.default,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}
                        >
                          {b.label}
                        </div>
                      ))}
                    </>
                  )}
                  {data.length > 0 && (
                    <>
                      <div style={{ fontSize: '9px', opacity: 0.35, padding: '2px 4px', fontWeight: 700 }}>DATA</div>
                      {data.map(b => (
                        <div
                          key={b.opcode}
                          onMouseDown={e => onItemMouseDown(e, b)}
                          style={{
                            padding: '4px 8px', margin: '1px 0', borderRadius: 6, fontSize: '11px',
                            fontWeight: 600, color: '#fff', cursor: 'grab', userSelect: 'none',
                            background: b.color || BLOCK_COLORS.default,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}
                        >
                          {b.label}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Connection Lines ────────────────────────────────────────────────────
function ConnectionLines({ nodes, panX, panY, zoom }) {
  const lines = [];
  nodes.forEach(node => {
    if (node.nextId) {
      const next = nodes.find(n => n.id === node.nextId);
      if (next) {
        const w1 = node._w || BLOCK_MIN_W;
        const x1 = (node.x + w1 / 2) * zoom + panX;
        const y1 = (node.y + BLOCK_H) * zoom + panY;
        const x2 = (next.x + (next._w || BLOCK_MIN_W) / 2) * zoom + panX;
        const y2 = next.y * zoom + panY;
        lines.push(
          <line key={node.id + '->' + next.id} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(255,255,255,0.15)" strokeWidth={2} strokeDasharray="6,3" />
        );
      }
    }
  });
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
      {lines}
    </svg>
  );
}

// ── Block Editor Canvas (main tile) ─────────────────────────────────────
export default function BlockEditorPage({ isTile = false, onClose, nodeId, tree, tabId }) {
  const stableId = tabId || nodeId;
  const canvasAreaRef = useRef(null);
  const panRef = useRef(null);
  const zoomRef = useRef(1);
  const [pan, setPan] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [nodes, setNodes] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + stableId);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [{ id: 'start', opcode: 'start', isAction: true, x: 0, y: 0, nextId: null, fields: {}, slots: {} }];
  });
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null);
  const panningRef = useRef(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  panRef.current = pan;
  zoomRef.current = zoom;

  // Spawn palette child tile on the left whenever it's missing
  const spawnGuard = useRef(false);
  useEffect(() => {
    if (!nodeId) return;
    const hasPalette = tree && JSON.stringify(tree).includes('"Block Palette"');
    if (hasPalette) { spawnGuard.current = false; return; }
    if (spawnGuard.current) return;
    spawnGuard.current = true;
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ycs-replace-and-split', {
        detail: {
          nodeId,
          replaceTabId: 'Block Editor',
          splitTabId: 'Block Palette',
          direction: 'left'
        }
      }));
    }, 50);
  });

  // Listen for palette drops
  useEffect(() => {
    const handler = (e) => {
      const { block, clientX, clientY } = e.detail;
      const el = canvasAreaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
      const z = zoomRef.current;
      const p = panRef.current;
      if (!p) return;
      const wx = (clientX - rect.left) / z - p.x;
      const wy = (clientY - rect.top) / z - p.y;
      const newNode = {
        id: makeId(),
        opcode: block.opcode,
        label: block.label,
        isAction: !!block.isAction,
        linkType: block.linkType || null,
        color: block.color || BLOCK_COLORS.default,
        x: wx, y: wy,
        nextId: null, fields: {}, slots: {},
      };
      setNodes(ns => [...ns, newNode]);
      setSelected(newNode.id);
    };
    window.addEventListener('ycs-blocky-drop', handler);
    return () => window.removeEventListener('ycs-blocky-drop', handler);
  }, []);

  // Center the start block on first mount
  useEffect(() => {
    if (pan !== null) return;
    const el = canvasAreaRef.current;
    if (!el) return;
    const startNode = nodesRef.current.find(n => n.id === 'start');
    if (!startNode) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    setPan({
      x: w / 2 - startNode.x - BLOCK_MIN_W / 2,
      y: h / 2 - startNode.y - BLOCK_H / 2,
    });
  }, [pan]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + stableId, JSON.stringify(nodes));
  }, [nodes, stableId]);

  // Zoom: the screen position of a world point is (world + pan) * zoom
  // To keep the point under the mouse fixed: (world + newPan) * newZoom = mouseScreen
  // world = mouseScreen / oldZoom - oldPan
  // newPan = mouseScreen / newZoom - world
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const el = canvasAreaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const oldZ = zoomRef.current;
    const nz = Math.min(Math.max(0.4, oldZ + delta), 2);
    if (nz === oldZ) return;
    setPan(p => {
      const worldX = mx / oldZ - p.x;
      const worldY = my / oldZ - p.y;
      return {
        x: mx / nz - worldX,
        y: my / nz - worldY,
      };
    });
    setZoom(nz);
  }, []);

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.button === 1 || (e.button === 0 && !e.target.closest('[data-blockid]'))) {
      panningRef.current = { startX: e.clientX, startY: e.clientY, startPan: { ...panRef.current } };
      setSelected(null);
    }
  }, []);

  const handleCanvasMouseMove = useCallback((e) => {
    if (panningRef.current) {
      const dx = e.clientX - panningRef.current.startX;
      const dy = e.clientY - panningRef.current.startY;
      const z = zoomRef.current;
      setPan({
        x: panningRef.current.startPan.x + dx / z,
        y: panningRef.current.startPan.y + dy / z,
      });
    }
    if (dragging) {
      const rect = canvasAreaRef.current.getBoundingClientRect();
      const z = zoomRef.current;
      const p = panRef.current;
      const wx = (e.clientX - rect.left) / z - p.x - dragging.offX;
      const wy = (e.clientY - rect.top) / z - p.y - dragging.offY;
      setNodes(ns => ns.map(n => n.id === dragging.id ? { ...n, x: wx, y: wy } : n));
    }
  }, [dragging]);

  const handleCanvasMouseUp = useCallback(() => {
    if (dragging) {
      const dragNode = nodesRef.current.find(n => n.id === dragging.id);
      if (dragNode && (dragNode.isAction || dragNode.id === 'start')) {
        setNodes(ns => {
          let updated = [...ns];
          updated = updated.map(n => n.nextId === dragging.id ? { ...n, nextId: null } : n);
          let bestDist = SNAP_THRESHOLD;
          let bestId = null;
          for (const n of updated) {
            if (n.id === dragging.id) continue;
            if (!n.isAction && n.id !== 'start') continue;
            const bx = n.x + (n._w || BLOCK_MIN_W) / 2;
            const by = n.y + BLOCK_H;
            const tx = dragNode.x + (dragNode._w || BLOCK_MIN_W) / 2;
            const ty = dragNode.y;
            const dist = Math.sqrt((bx - tx) ** 2 + (by - ty) ** 2);
            if (dist < bestDist && !n.nextId) {
              bestDist = dist;
              bestId = n.id;
            }
          }
          if (bestId) {
            updated = updated.map(n => n.id === bestId ? { ...n, nextId: dragging.id } : n);
            const parent = updated.find(n => n.id === bestId);
            if (parent) {
              const snapX = parent.x;
              const snapY = parent.y + BLOCK_H + 4;
              updated = updated.map(n => n.id === dragging.id ? { ...n, x: snapX, y: snapY } : n);
            }
          }
          return updated;
        });
      }
    }
    panningRef.current = null;
    setDragging(null);
  }, [dragging]);

  const handleBlockMouseDown = useCallback((e, nid) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setSelected(nid);
    const rect = e.currentTarget.getBoundingClientRect();
    const z = zoomRef.current;
    const offX = (e.clientX - rect.left) / z;
    const offY = (e.clientY - rect.top) / z;
    setDragging({ id: nid, offX, offY });
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('block');
    if (!data) return;
    const bd = JSON.parse(data);
    const rect = canvasAreaRef.current.getBoundingClientRect();
    const z = zoomRef.current;
    const p = panRef.current;
    const wx = (e.clientX - rect.left) / z - p.x;
    const wy = (e.clientY - rect.top) / z - p.y;
    const newNode = {
      id: makeId(),
      opcode: bd.opcode,
      label: bd.label,
      isAction: !!bd.isAction,
      linkType: bd.linkType || null,
      color: bd.color || BLOCK_COLORS.default,
      x: wx, y: wy,
      nextId: null, fields: {}, slots: {},
    };
    setNodes(ns => [...ns, newNode]);
    setSelected(newNode.id);
  }, []);

  const handleDelete = useCallback((nid) => {
    if (nid === 'start') return;
    setNodes(ns => {
      const target = ns.find(n => n.id === nid);
      return ns.filter(n => n.id !== nid).map(n => {
        if (n.nextId === nid) return { ...n, nextId: target?.nextId || null };
        const newSlots = { ...n.slots };
        let changed = false;
        for (const k in newSlots) {
          if (newSlots[k] === nid) { newSlots[k] = null; changed = true; }
        }
        return changed ? { ...n, slots: newSlots } : n;
      });
    });
    setSelected(null);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && selected !== 'start') {
        handleDelete(selected);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, handleDelete]);

  const getChain = useCallback(() => {
    const chain = new Set();
    let cur = 'start';
    while (cur) {
      chain.add(cur);
      const node = nodesRef.current.find(n => n.id === cur);
      cur = node?.nextId || null;
    }
    return chain;
  }, []);

  const chain = getChain();

  if (pan === null) {
    return <div ref={canvasAreaRef} style={{ position: 'relative', width: '100%', height: '100%' }} />;
  }

  return (
    <div ref={canvasAreaRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: 'transparent' }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onWheel={handleWheel}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
    >
      <ConnectionLines nodes={nodes} panX={pan.x * zoom} panY={pan.y * zoom} zoom={zoom} />

      <div style={{
        position: 'absolute', top: 0, left: 0, width: 0, height: 0, zIndex: 3,
        transform: `scale(${zoom})`, transformOrigin: '0 0',
      }}>
        <div style={{ position: 'absolute', left: pan.x, top: pan.y }}>
          {nodes.map(node => {
            const isStart = node.id === 'start';
            const isAct = node.isAction || isStart;
            const isVal = !!node.linkType;
            const inChain = chain.has(node.id);
            const bg = isStart ? BLOCK_COLORS.start
              : (!inChain && isAct) ? BLOCK_COLORS.disconnected
              : node.color || BLOCK_COLORS.default;
            const label = isStart ? 'Start' : (node.label || node.opcode);

            return (
              <div
                key={node.id}
                data-blockid={node.id}
                onMouseDown={e => handleBlockMouseDown(e, node.id)}
                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  minWidth: isVal ? 50 : BLOCK_MIN_W,
                  width: isVal ? undefined : 'fit-content',
                  height: isVal ? 'auto' : BLOCK_H,
                  display: 'flex',
                  alignItems: 'center',
                  padding: isVal ? '8px 10px' : '0 10px',
                  gap: 10,
                  background: bg,
                  borderRadius: BLOCK_RADIUS,
                  cursor: dragging?.id === node.id ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  opacity: (!inChain && isAct && !isStart) ? 0.6 : 1,
                  border: selected === node.id ? '2px solid #fff' : '2px solid transparent',
                  boxSizing: 'border-box',
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
                  zIndex: isVal ? 100 : (!inChain ? 50 : (node.depth || 1)),
                }}
              >
                {isVal && (
                  <div style={{
                    position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)',
                    width: 10, height: 20, borderRadius: '10px 0 0 10px', background: bg,
                  }} />
                )}
                {!inChain && isAct && !isStart && (
                  <div style={{
                    position: 'absolute', top: -6, right: -6, width: 14, height: 14,
                    borderRadius: '50%', background: '#e11d48', fontSize: '9px',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700,
                  }}>!</div>
                )}
                <span style={{
                  fontFamily: 'sans-serif', fontSize: 14, fontWeight: 700,
                  color: isStart ? '#38bdf8' : '#fff', whiteSpace: 'nowrap',
                }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 8, right: 8, fontSize: '10px',
        color: 'var(--ycs-text)', opacity: 0.3, pointerEvents: 'none', zIndex: 4,
      }}>
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
