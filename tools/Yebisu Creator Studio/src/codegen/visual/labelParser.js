const TOKEN_RE = /\[([a-zA-Z0-9_]+):([a-zA-Z0-9_.]+)\]/g;

const SLOT_TYPES = new Set(["entity", "number", "text", "logic", "itemstack"]);

export function parseLabel(label) {
  if (!label) return [];
  const segments = [];
  let lastIndex = 0;

  for (const match of label.matchAll(TOKEN_RE)) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: label.slice(lastIndex, match.index) });
    }
    const key = match[1];
    const spec = match[2];

    if (SLOT_TYPES.has(spec)) {
      segments.push({ type: "slot", key, accepts: spec });
    } else if (spec === "dropdown") {
      segments.push({ type: "dropdown", key });
    } else if (spec.startsWith("dropdown.")) {
      segments.push({ type: "dropdown", key, source: spec.slice(9) });
    } else if (spec === "input.number") {
      segments.push({ type: "input", key, inputType: "number" });
    } else if (spec === "input.text") {
      segments.push({ type: "input", key, inputType: "text" });
    } else {
      segments.push({ type: "text", value: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < label.length) {
    segments.push({ type: "text", value: label.slice(lastIndex) });
  }

  return segments;
}

export function extractSlotDefs(segments) {
  return segments
    .filter(s => s.type === "slot")
    .map(s => ({ key: s.key, accepts: s.accepts }));
}
