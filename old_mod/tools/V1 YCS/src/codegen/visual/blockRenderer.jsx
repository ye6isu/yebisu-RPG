import React, { useState, useMemo } from "react";
import { SlotConn, AttrDropdown, EffectDropdown, VarDropdown, DataCompDropdown, PortalSelect, SettingsPortal } from '../../components/VisualEditor.jsx';
import { parseLabel } from './labelParser.js';
import { evalCondition } from './blockCompiler.js';
import { C } from '../../theme.js';

function Segments({ segments, def, node, nodes, methodKey, onDragStart, onFieldChange, nodeId, onSelect, selectedNodeId }) {
  const transp = def.transparent;
  return segments.map((seg, i) => {
    if (seg.type === "text") {
      return <span key={i} style={{ fontSize: 16, fontFamily: "sans-serif", color: "#fff", fontWeight: 700, whiteSpace: "nowrap", lineHeight: "20px" }}>{seg.value}</span>;
    }
    if (seg.type === "slot") {
      return <SlotConn key={i} sk={seg.key} sc="rgba(0,0,0,0.3)" connId={node.slots?.[seg.key]} nodes={nodes} mk={methodKey}
        onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={nodeId} onSelect={onSelect} selectedNodeId={selectedNodeId} />;
    }
    if (seg.type === "input") {
      const fieldDef = def.fields?.[seg.key];
      if (fieldDef?.showIf && !evalCondition(fieldDef.showIf, node.fields)) return null;
      const val = node.fields?.[seg.key] ?? fieldDef?.default ?? (seg.inputType === "number" ? "0" : "");
      const isNum = seg.inputType === "number";
      return <input key={i} value={val}
        onChange={e => { e.stopPropagation(); onFieldChange && onFieldChange(nodeId, seg.key, e.target.value); }}
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: isNum ? Math.max(50, (String(val).length * 10) + 20) : Math.max(80, (String(val).length * 8) + 24),
          height: 30, background: transp ? "transparent" : "rgba(0,0,0,0.3)", border: "none", borderRadius: 0,
          padding: "5px 10px", color: "#fff", fontSize: isNum ? 16 : 14,
          fontFamily: "sans-serif", fontWeight: 700, outline: "none",
          textAlign: "center", boxSizing: "border-box"
        }} />;
    }
    if (seg.type === "dropdown") {
      const fieldDef = def.fields?.[seg.key];
      if (fieldDef?.showIf && !evalCondition(fieldDef.showIf, node.fields)) return null;

      if (seg.source === "effects") {
        return <EffectDropdown key={i} nodeId={nodeId} value={node.fields?.[seg.key]}
          onChange={v => onFieldChange && onFieldChange(nodeId, seg.key, v)} />;
      }
      if (seg.source === "attributes") {
        return <AttrDropdown key={i} nodeId={nodeId} value={node.fields?.[seg.key]}
          onChange={v => onFieldChange && onFieldChange(nodeId, seg.key, v)} />;
      }
      if (seg.source === "variables") {
        return <VarDropdown key={i} nodeId={nodeId} varName={node.fields?.varName} varType={node.fields?.varType}
          onChange={(n, t, d) => {
            if (onFieldChange) {
              onFieldChange(nodeId, "varName", n);
              onFieldChange(nodeId, "varType", t);
              onFieldChange(nodeId, "varDefault", d);
              if (def.dynamicLinkType) {
                const map = def.dynamicLinkType.map;
                onFieldChange(nodeId, "__linkType", map[t] ?? map["*"] ?? "number");
              }
            }
          }} />;
      }
      if (seg.source === "dataComponents") {
        return <DataCompDropdown key={i} nodeId={nodeId} compName={node.fields?.compName} compType={node.fields?.compType}
          onChange={(n, t) => {
            if (onFieldChange) {
              const oldType = node.fields?.compType || "double";
              onFieldChange(nodeId, "compName", n);
              onFieldChange(nodeId, "compType", t);
              if (def.dynamicLinkType) {
                const map = def.dynamicLinkType.map;
                onFieldChange(nodeId, "__linkType", map[t] ?? map["*"] ?? "number");
              }
              if (t !== oldType && def.dynamicAccepts) {
                for (const sk in def.dynamicAccepts) onFieldChange(nodeId, "__clearSlot", sk);
              }
            }
          }} />;
      }
      const options = fieldDef?.options || [];
      return <PortalSelect key={i} value={node.fields?.[seg.key] ?? fieldDef?.default ?? ""}
        onChange={v => onFieldChange && onFieldChange(nodeId, seg.key, v)}
        compact={fieldDef?.compact} transparent={transp} minWidth={fieldDef?.minWidth || 60} options={options}/>;
    }
    if (seg.type === "checkbox") {
      const fieldDef = def.fields?.[seg.key];
      const checked = !!(node.fields?.[seg.key] ?? fieldDef?.default ?? false);
      return <div key={i} onClick={e => { e.stopPropagation(); onFieldChange && onFieldChange(nodeId, seg.key, !checked); }}
        onMouseDown={e => e.stopPropagation()}
        style={{ width: 16, height: 16, border: `1px solid ${checked ? "#5a9fd4" : "rgba(255,255,255,0.3)"}`, borderRadius: 3,
          background: checked ? "#5a9fd4" : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0 }}>
        {checked && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-5" stroke="#04060c" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
      </div>;
    }
    return null;
  });
}

function RepeatableSlots({ def, node, nodes, methodKey, onDragStart, onFieldChange, nodeId, onSelect, selectedNodeId }) {
  const rs = def.repeatableSlots;
  if (!rs) return null;
  const count = node.fields?.[rs.countField] ?? rs.default ?? 1;
  const slots = [];
  for (let i = 0; i < count; i++) {
    if (i > 0 && rs.separator) {
      slots.push(<span key={`sep-${i}`} style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{rs.separator}</span>);
    }
    slots.push(<SlotConn key={`rs-${i}`} sk={rs.key + i} sc="rgba(0,0,0,0.3)" connId={node.slots?.[rs.key + i]} nodes={nodes} mk={methodKey}
      onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={nodeId} onSelect={onSelect} selectedNodeId={selectedNodeId} />);
  }
  return <>{slots}</>;
}

export function GenericDataContent({ def, node, nodes, methodKey, onDragStart, onFieldChange, nodeId, onSelect, selectedNodeId, showSettings, setShowSettings, settingsAnchorRef, inline }) {
  const segments = useMemo(() => parseLabel(def.label), [def.label]);
  const isMultiline = !inline && (node.fields?.multiline || def.multiline);
  const hasSettings = def.settings && Object.keys(def.settings).length > 0;
  const segProps = { def, node, nodes, methodKey, onDragStart, onFieldChange, nodeId, onSelect, selectedNodeId };

  if (isMultiline) {
    const lines = [];
    let current = [];
    for (const seg of segments) {
      current.push(seg);
      if (seg.type === "slot") { lines.push(current); current = []; }
    }
    if (current.length) lines.push(current);
    return <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 30, padding: "4px 0" }}>
          {li === 0 && hasSettings && <span ref={settingsAnchorRef} style={{ cursor: "pointer", opacity: 0.6, fontSize: 14 }}
            onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setShowSettings(s => !s); }}>⚙</span>}
          <Segments segments={line} {...segProps} />
        </div>
      ))}
    </div>;
  }

  return <>
    {hasSettings && <span ref={settingsAnchorRef} style={{ cursor: "pointer", opacity: 0.6, fontSize: 14 }}
      onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setShowSettings(s => !s); }}>⚙</span>}
    <Segments segments={segments} {...segProps} />
    <RepeatableSlots def={def} node={node} nodes={nodes} methodKey={methodKey}
      onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={nodeId}
      onSelect={onSelect} selectedNodeId={selectedNodeId} />
  </>;
}

export function GenericActionContent({ def, node, nodes, methodKey, onDragStart, onFieldChange, nodeId, onSelect, selectedNodeId, showSettings, setShowSettings, settingsAnchorRef }) {
  const segments = useMemo(() => parseLabel(def.label), [def.label]);
  const hasSettings = def.settings && Object.keys(def.settings).length > 0;
  const isMultiline = node.fields?.multiline || def.multiline;

  const shapeKey = node.fields?.shape;
  const shapeSegs = useMemo(() => {
    if (!def.shapeSlots || !shapeKey) return [];
    return parseLabel(def.shapeSlots[shapeKey] || "");
  }, [def.shapeSlots, shapeKey]);
  const suffixSegs = useMemo(() => def.suffixLabel ? parseLabel(def.suffixLabel) : [], [def.suffixLabel]);

  const segProps = { def, node, nodes, methodKey, onDragStart, onFieldChange, nodeId, onSelect, selectedNodeId };

  const allSegs = useMemo(() => {
    const s = [...segments, ...shapeSegs, ...suffixSegs];
    return s;
  }, [segments, shapeSegs, suffixSegs]);

  if (isMultiline) {
    const lines = [];
    let current = [];
    for (const seg of allSegs) {
      current.push(seg);
      if (seg.type === "slot") { lines.push(current); current = []; }
    }
    if (current.length) lines.push(current);

    return <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1 }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 50, padding: "0 10px" }}>
          {li === 0 && hasSettings && <span ref={settingsAnchorRef} style={{ cursor: "pointer", opacity: 0.6, fontSize: 14 }}
            onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setShowSettings(s => !s); }}>⚙</span>}
          <Segments segments={line} {...segProps} />
        </div>
      ))}
    </div>;
  }

  return <>
    {hasSettings && <span ref={settingsAnchorRef} style={{ cursor: "pointer", opacity: 0.6, fontSize: 14 }}
      onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setShowSettings(s => !s); }}>⚙</span>}
    <span style={{ fontFamily: "sans-serif", fontSize: 16, lineHeight: "20px", color: "#fff", fontWeight: 700, whiteSpace: "nowrap", display: "contents" }}>
      <Segments segments={allSegs} {...segProps} />
      <RepeatableSlots def={def} node={node} nodes={nodes} methodKey={methodKey}
        onDragStart={onDragStart} onFieldChange={onFieldChange} nodeId={nodeId}
        onSelect={onSelect} selectedNodeId={selectedNodeId} />
    </span>
  </>;
}

export function GenericSettingsPopup({ def, node, onFieldChange, showSettings, setShowSettings, anchorRef }) {
  if (!def.settings) return null;
  const entries = Object.entries(def.settings).filter(([k]) => !k.startsWith("_"));
  const actions = def.settings._actions || [];
  if (!entries.length && !actions.length) return null;

  return <SettingsPortal open={showSettings} onClose={() => setShowSettings(false)} anchorRef={anchorRef}>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {entries.map(([key, s]) => {
        if (s.showIf && !evalCondition(s.showIf, node.fields)) return null;
        if (s.type === "checkbox") {
          return <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, color: "#ccc", fontSize: 12, cursor: "pointer" }}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onFieldChange && onFieldChange(node.id, key, !node.fields?.[key]); }}>
            <input type="checkbox" checked={!!(node.fields?.[key] ?? s.default)} onChange={() => { }} style={{ cursor: "pointer", margin: 0 }} />
            {s.label}
          </label>;
        }
        if (s.type === "number") {
          return <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "#ccc", fontSize: 12 }}>{s.label}</span>
            <input type="number" value={node.fields?.[key] ?? s.default ?? 0}
              min={s.min} max={s.max}
              onChange={e => { e.stopPropagation(); onFieldChange && onFieldChange(node.id, key, parseInt(e.target.value) || 0); }}
              onMouseDown={e => e.stopPropagation()}
              style={{ width: 50, height: 24, background: "#333", border: "1px solid #555", borderRadius: 4, color: "#fff", fontSize: 12, padding: "0 6px", outline: "none" }} />
          </div>;
        }
        if (s.type === "dropdown") {
          return <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "#ccc", fontSize: 12 }}>{s.label}</span>
            <PortalSelect value={node.fields?.[key] ?? s.default ?? ""} onChange={v => onFieldChange && onFieldChange(node.id, key, v)}
              minWidth={s.minWidth || 100} options={s.options || []} />
          </div>;
        }
        return null;
      })}
      {actions.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {actions.map((act, i) => {
          let label = act.label;
          if (act.onClick?.action === "toggle") {
            const cur = !!(node.fields?.[act.onClick.field]);
            label = cur ? (act.labelOff || `− ${act.onClick.field}`) : (act.labelOn || `+ ${act.onClick.field}`);
          }
          return <div key={i} style={{ color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", background: "#2a2a2a", padding: "4px 10px", borderRadius: 4 }}
            onClick={e => {
              e.stopPropagation();
              if (!onFieldChange || !act.onClick) return;
              const { field, action, min, max } = act.onClick;
              const cur = node.fields?.[field] ?? 0;
              if (action === "increment") onFieldChange(node.id, field, max !== undefined ? Math.min(cur + 1, max) : cur + 1);
              else if (action === "decrement") {
                const newVal = min !== undefined ? Math.max(cur - 1, min) : cur - 1;
                if (def.repeatableSlots && field === def.repeatableSlots.countField && newVal < cur) {
                  for (let ri = newVal; ri < cur; ri++) onFieldChange(node.id, "__clearSlot", def.repeatableSlots.key + ri);
                }
                onFieldChange(node.id, field, newVal);
              }
              else if (action === "toggle") onFieldChange(node.id, field, !cur);
            }}>{label}</div>;
        })}
      </div>}
    </div>
  </SettingsPortal>;
}
