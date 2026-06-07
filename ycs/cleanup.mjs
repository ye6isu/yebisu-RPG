// Fix parse error: remove stale old VP body referencing BlockCard/nodes
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const appPath = join(__dirname, 'src/App.jsx');
let code = readFileSync(appPath, 'utf8');
const lines = code.split('\n');

// Show context around the problem
console.log('Before fix — lines 1260-1285:');
for (let i = 1259; i < Math.min(1285, lines.length); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

// The new VisualEditorPanel starts at line 962 and has the free-floating canvas.
// But there's a stale old VP return block starting around line 1150 that ends at 1279.
// It contains BlockCard/nodes/updateNode references.
// The new VP's return ends with </div>; then } at line 1279.
// The real new VP ends with the CanvasBlock component which starts at 1131.
// Between new VP's end and CanvasBlock is the stale old return.

// Strategy: find the new VP function body end by locating the real return statement
// The new VP has "const canvasRef=useRef()" — find where its return JSX ends
// and where the stale old return starts (which references BlockCard/nodes)

const NEW_VP_MARKER = 'const canvasRef=useRef();';
const STALE_RETURN = 'nodes.map((n,i)=><BlockCard';
const CANVAS_BLOCK_FN = '\nfunction CanvasBlock(';

const newVPStart = code.indexOf(NEW_VP_MARKER);
const staleReturnStart = code.indexOf(STALE_RETURN);
const canvasBlockStart = code.indexOf(CANVAS_BLOCK_FN);

console.log(`\nnewVPStart: ${newVPStart}`);
console.log(`staleReturnStart: ${staleReturnStart}`);
console.log(`canvasBlockStart: ${canvasBlockStart}`);

if (staleReturnStart > 0 && canvasBlockStart > 0 && staleReturnStart < canvasBlockStart) {
  // Find the end of the stale return — it's a closing </div>;\n}\n before CanvasBlock
  // Walk backwards from canvasBlockStart to find the enclosing }
  // The stale block starts from before STALE_RETURN going back to the previous return statement

  // Find the start of the stale return statement (the `return<div` before nodes.map)
  const staleReturnOpen = code.lastIndexOf('return<div', staleReturnStart);
  if (staleReturnOpen < 0) { console.log('Could not find stale return open'); process.exit(1); }

  // The stale block ends at canvasBlockStart - we want to cut from staleReturnOpen to canvasBlockStart
  // But we need to preserve the valid closing }; of the NEW VP
  // Find the valid VP close: the new VP's return ends at the } just before canvasBlockStart
  const vpCloseIdx = code.lastIndexOf('\n}', canvasBlockStart);

  // Cut: everything from staleReturnOpen to vpCloseIdx (exclusive) is stale
  code = code.slice(0, staleReturnOpen) + code.slice(vpCloseIdx);
  console.log(`\n✓ Removed stale VP return block (${vpCloseIdx - staleReturnOpen} chars)`);
} else {
  console.log('\nStale block not found — checking if parse error is elsewhere');
}

// Collapse excess blank lines
code = code.replace(/\n{3,}/g, '\n\n');

writeFileSync(appPath, code, 'utf8');

// Verify line count
const newLines = code.split('\n');
console.log(`\nTotal lines after fix: ${newLines.length}`);
console.log('\nLines 1270-1290 after fix:');
for (let i = 1269; i < Math.min(1291, newLines.length); i++) {
  console.log(`${i+1}: ${newLines[i]}`);
}





