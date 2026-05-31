import express from 'express'
import fs from 'fs'
import path from 'path'
import cors from 'cors'
import { spawn } from 'child_process'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const MOD_ROOT  = 'D:/Projects/Mods/yebisu-RPG/src/main/resources'
const JAVA_ROOT = 'D:/Projects/Mods/yebisu-RPG/src/main/java/net/ye6isu/yebisuRPG'
const PROJ_ROOT = 'D:/Projects/Mods/yebisu-RPG'
const MODID     = 'yebisurpg'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rf = f => fs.readFileSync(f, 'utf8')
const wf = (f, s) => { fs.writeFileSync(f, s); triggerIdeaReload(f); }
// Trigger IntelliJ to reload changed files via the file system watcher
function triggerIdeaReload(filePath) {
  try {
    // Touch the file's mtime so IntelliJ FS watcher detects the change
    const now = new Date();
    fs.utimesSync(filePath, now, now);
  } catch {}
}
const rl = () => {
  const raw = rf(path.join(MOD_ROOT,'assets',MODID,'lang','en_us.json')).replace(/^\uFEFF/,'')
  // Strip blank lines before parsing, then filter out any __BLANK__ keys
  const stripped = raw.split('\n').filter(l => l.trim() !== '').join('\n')
  const parsed = JSON.parse(stripped)
  // Remove any __BLANK__ sentinel keys that may have been written
  for (const k of Object.keys(parsed)) if (k === '__BLANK__') delete parsed[k]
  return parsed
}
const wl = arr => wf(path.join(MOD_ROOT,'assets',MODID,'lang','en_us.json'), writeLangJson(arr))
const jp = (...p) => path.join(...p)

function removeLines(file, pred) {
  wf(file, rf(file).split('\n').filter(l => !pred(l)).join('\n'))
}

function insertLangGrouped(json, key, value) {
  if (json[key] !== undefined) return { exists: true }
  const prefix = key.split('.').slice(0,2).join('.')
  const entries = Object.entries(json)
  let insertAfter = -1
  for (let i = entries.length-1; i >= 0; i--) {
    if (entries[i][0].startsWith(prefix)) { insertAfter = i; break }
  }
  const ne = [...entries]
  if (insertAfter >= 0) ne.splice(insertAfter+1, 0, [key, value])
  else ne.push([key, value])
  return { exists: false, result: Object.fromEntries(ne) }
}

// ─── Gradle run state ─────────────────────────────────────────────────────────
let datagenDirty = false
let runState = 'idle'
let runLog = []
const markDirty = () => { datagenDirty = true }

app.get('/api/run/state', (_req, res) => res.json({ dirty: datagenDirty, state: runState, log: runLog.slice(-60) }))

function runGradle(task, label) {
  return new Promise(resolve => {
    runState = `running-${label}`
    runLog = []
    const proc = spawn('cmd', ['/c', `gradlew.bat ${task}`], { cwd: PROJ_ROOT, shell: true })
    proc.stdout.on('data', d => { runLog.push(...d.toString().split('\n')); if (runLog.length > 200) runLog = runLog.slice(-200) })
    proc.stderr.on('data', d => { runLog.push('[err] ' + d.toString()) })
    proc.on('close', code => {
      runState = code === 0 ? 'idle' : 'error'
      if (label === 'data' && code === 0) datagenDirty = false
      resolve({ ok: code === 0, code })
    })
  })
}

app.post('/api/run/data', async (_req, res) => {
  if (runState !== 'idle') return res.json({ ok: false, reason: 'already running' })
  res.json(await runGradle('runData', 'data'))
})
app.post('/api/run/client', async (_req, res) => {
  if (runState !== 'idle') return res.json({ ok: false, reason: 'already running' })
  if (datagenDirty) { const r = await runGradle('runData', 'data'); if (!r.ok) return res.json({ ok: false, reason: 'runData failed' }) }
  res.json(await runGradle('runClient', 'client'))
})

// ─── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// ─── Read items ────────────────────────────────────────────────────────────────
app.get('/api/items/read', (_req, res) => {
  try {
    const src  = rf(jp(JAVA_ROOT,'item','ModItems.java'))
    const lang = rl()
    const tabs = readTabsJson()  // { "tess": "yebisurpg_blocks_tab", ... }

    const re = /public static final DeferredItem<(\w+)>\s+(\w+)\s*=\s*ITEMS\.register\("([^"]+)"/g
    const items = []
    let m
    while ((m = re.exec(src)) !== null) {
      const javaType = m[1], constName = m[2], id = m[3]
      let itemType='None', toolType='Sword', tier='Iron', damage='3', speed='-2.4', burnTime='1600'
      if (['SwordItem','PickaxeItem','AxeItem','ShovelItem','HoeItem'].includes(javaType)) { itemType='Tool'; toolType=javaType.replace('Item','') }
      const attrM = new RegExp(`"${id}"[\\s\\S]{0,400}createAttributes\\([^,]+,\\s*([\\d.]+)f,\\s*(-?[\\d.]+)f\\)`).exec(src)
      if (attrM) { damage=attrM[1]; speed=attrM[2] }
      const tierM = new RegExp(`"${id}"[\\s\\S]{0,200}(ModToolTiers\\.\\w+|Tiers\\.\\w+)`).exec(src)
      if (tierM) { const r=tierM[1]; tier=r.includes('YE6ISU')?'YE6ISU':r.includes('NETHERITE')?'Netherite':r.includes('DIAMOND')?'Diamond':r.includes('IRON')?'Iron':r.includes('STONE')?'Stone':'Wood' }
      const burnM = new RegExp(`"${id}"[\\s\\S]{0,200}new FuelItem[^,]+,\\s*(\\d+)`).exec(src)
      if (burnM) { itemType='Fuel'; burnTime=burnM[1] }
      const texPath = jp(MOD_ROOT,'assets',MODID,'textures','item',`${id}.png`)
      const hasTexture = fs.existsSync(texPath)
      let textureDataUrl = null
      if (hasTexture) {
        try { textureDataUrl = 'data:image/png;base64,' + fs.readFileSync(texPath).toString('base64') } catch {}
      }
      const tabKey = tabs[id] || ''
      const creativeTab = TAB_KEY_TO_VALUE[tabKey] || ''
      items.push({ id, constName, displayName:lang[`item.${MODID}.${id}`]||id, itemType, toolType, tier, damage, speed, burnTime, hasTexture, textureDataUrl, creativeTab, source:'mod' })
    }
    res.json({ ok:true, items })
  } catch(e) { res.json({ ok:false, reason:e.message, items:[] }) }
})

// ─── Read blocks ───────────────────────────────────────────────────────────────
app.get('/api/blocks/read', (_req, res) => {
  try {
    const src  = rf(jp(JAVA_ROOT,'block','ModBlocks.java'))
    const lang = rl()
    const tabs = readTabsJson()

    const re = /registerBlock\("([^"]+)"/g
    const blocks = []
    let m
    while ((m = re.exec(src)) !== null) {
      const id = m[1]
      const ctx = src.slice(Math.max(0,m.index-20), m.index+400)
      let blockType='simple'
      if (ctx.includes('StairBlock')) blockType='stairs'
      else if (ctx.includes('SlabBlock')) blockType='slab'
      else if (ctx.includes('FenceGateBlock')) blockType='fence_gate'
      else if (ctx.includes('FenceBlock')) blockType='fence'
      else if (ctx.includes('WallBlock')) blockType='wall'
      else if (ctx.includes('DoorBlock') && !ctx.includes('TrapDoor')) blockType='door'
      else if (ctx.includes('TrapDoorBlock')) blockType='trapdoor'
      else if (ctx.includes('PressurePlate')) blockType='pressure_plate'
      else if (ctx.includes('ButtonBlock')) blockType='button'
      const texPath = jp(MOD_ROOT,'assets',MODID,'textures','block',`${id}.png`)
      const hasTexture = fs.existsSync(texPath)
      let textureDataUrl = null
      if (hasTexture) {
        try { textureDataUrl = 'data:image/png;base64,' + fs.readFileSync(texPath).toString('base64') } catch {}
      }
      const tabKey = tabs[`block:${id}`] || ''
      const creativeTab = TAB_KEY_TO_VALUE[tabKey] || ''
      blocks.push({ id, constName:id.toUpperCase(), displayName:lang[`block.${MODID}.${id}`]||id, blockType, hasTexture, textureDataUrl, creativeTab, source:'mod' })
    }
    res.json({ ok:true, blocks })
  } catch(e) { res.json({ ok:false, reason:e.message, blocks:[] }) }
})

// ─── Texture ───────────────────────────────────────────────────────────────────
app.post('/api/texture', (req, res) => {
  try {
    const { filename, dataUrl, folder='item' } = req.body
    wf(jp(MOD_ROOT,'assets',MODID,'textures',folder,filename), Buffer.from(dataUrl.replace(/^data:image\/\w+;base64,/,''),'base64'))
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})
app.post('/api/texture/delete', (req, res) => {
  try {
    const { filename, folder='item' } = req.body
    const p = jp(MOD_ROOT,'assets',MODID,'textures',folder,filename)
    if (fs.existsSync(p)) fs.unlinkSync(p)
    const m = p+'.mcmeta'
    if (fs.existsSync(m)) fs.unlinkSync(m)
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})
app.post('/api/texture/mcmeta', (req, res) => {
  try {
    const { filename, frametime, folder='item' } = req.body
    wf(jp(MOD_ROOT,'assets',MODID,'textures',folder,filename+'.mcmeta'), JSON.stringify({animation:{frametime}},null,2))
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

// ─── Lang ──────────────────────────────────────────────────────────────────────

// Prefix order for sorted lang output
const LANG_PREFIX_ORDER = ['item.','block.','tooltip.','creativetab.','key.','enchantment.','entity.']

function sortLang(json) {
  const entries = Object.entries(json).filter(([k]) => k !== '__BLANK__')
  const groups = {}
  const other = []
  for (const [k, v] of entries) {
    const prefix = LANG_PREFIX_ORDER.find(p => k.startsWith(p))
    if (prefix) {
      if (!groups[prefix]) groups[prefix] = []
      groups[prefix].push([k, v])
    } else {
      other.push([k, v])
    }
  }
  for (const g of Object.values(groups)) g.sort((a, b) => a[0].localeCompare(b[0]))
  other.sort((a, b) => a[0].localeCompare(b[0]))
  // Return a plain array (not an object) so we preserve blank line positions
  const sorted = []
  for (const prefix of LANG_PREFIX_ORDER) {
    if (groups[prefix]) {
      if (sorted.length > 0) sorted.push(null) // null = blank line
      sorted.push(...groups[prefix])
    }
  }
  if (other.length) {
    if (sorted.length > 0) sorted.push(null)
    sorted.push(...other)
  }
  return sorted
}

function writeLangJson(entries) {
  const lines = ['{']
  const realEntries = entries.filter(e => e !== null)
  let realIdx = 0
  for (const entry of entries) {
    if (entry === null) {
      lines.push('')
    } else {
      const [k, v] = entry
      const isLast = realIdx === realEntries.length - 1
      lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)}${isLast ? '' : ','}`)
      realIdx++
    }
  }
  lines.push('}')
  return lines.join('\n')
}

app.post('/api/lang/set', (req, res) => {
  try {
    const { key, value, update=false } = req.body
    let json = rl()
    if (!update && json[key] !== undefined) return res.json({ ok:false, reason:'already exists' })
    json[key] = value
    wl(sortLang(json))
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})
app.post('/api/lang/delete', (req, res) => {
  try {
    const { keys } = req.body
    const json = rl()
    for (const k of keys) delete json[k]
    wl(sortLang(json))
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

// ─── Items ─────────────────────────────────────────────────────────────────────
app.post('/api/items/register', (req, res) => {
  try {
    const { line, constName } = req.body
    const file = jp(JAVA_ROOT,'item','ModItems.java')
    let src = rf(file)
    if (src.includes(constName+' =')) return res.json({ ok:false, reason:'already exists' })
    const marker = '\n    public static void register('
    if (!src.includes(marker)) return res.json({ ok:false, reason:'insertion point not found' })
    const indented = line.split('\n').map((l,i) => i===0?'    '+l:'        '+l).join('\n')
    wf(file, src.replace(marker, '\n'+indented+'\n'+marker))
    markDirty()
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

app.post('/api/items/update', (req, res) => {
  try {
    const { oldConstName, oldId, newLine, newConstName, newId, langKey, langVal, newModelLine } = req.body
    const file = jp(JAVA_ROOT,'item','ModItems.java')
    let src = rf(file)
    const startMarker = `ITEMS.register("${oldId}"`
    const startIdx = src.indexOf(startMarker)
    if (startIdx === -1) return res.json({ ok:false, reason:`ITEMS.register("${oldId}") not found` })
    const fieldStart = src.lastIndexOf('\n    public static final ', startIdx)
    if (fieldStart === -1) return res.json({ ok:false, reason:'field declaration not found' })
    let depth = 0, end = -1
    for (let i = startIdx; i < src.length; i++) {
      if (src[i]==='('||src[i]==='{') depth++
      else if (src[i]===')'||src[i]==='}') {
        depth--
        if (depth===0) { const semi=src.indexOf(';',i); if(semi!==-1){end=semi+1;break} }
      }
    }
    if (end===-1) return res.json({ ok:false, reason:'end of statement not found' })
    const indented = '\n    '+newLine.split('\n').map((l,i)=>i===0?l:'        '+l).join('\n')
    wf(file, src.slice(0,fieldStart)+indented+src.slice(end))
    const lang = rl()
    if (oldId!==newId) {
      delete lang[`item.${MODID}.${oldId}`]
      for (const k of Object.keys(lang)) {
        if (k.startsWith(`tooltip.${MODID}.${oldId}.`)) delete lang[k]
      }
    }
    lang[langKey] = langVal
    wl(sortLang(lang))
    // Update model line in ModItemModelProvider if newModelLine provided
    if (newModelLine) {
      const modelFile = jp(JAVA_ROOT,'datagen','ModItemModelProvider.java')
      let msrc = rf(modelFile)
      const CN = newConstName || (newId||'').toUpperCase()
      const oldCN = oldConstName || (oldId||'').toUpperCase()
      // Find and replace any existing line referencing this item's const name
      const mlines = msrc.split('\n')
      let replaced = false
      const newMlines = mlines.map(l => {
        if ((l.includes(`ModItems.${oldCN}`) || l.includes(`ModItems.${CN}`)) &&
            (l.trim().startsWith('basicItem') || l.trim().startsWith('handheldItem'))) {
          replaced = true
          return '        ' + newModelLine.trim()
        }
        return l
      })
      if (replaced) {
        wf(modelFile, newMlines.join('\n'))
      } else {
        // Not found — insert at marker
        const marker = '\n        // YCS_MODEL_INSERT'
        if (msrc.includes(marker)) {
          const indentedModel = '        ' + newModelLine.trim()
          wf(modelFile, msrc.replace(marker, '\n' + indentedModel + '\n        // YCS_MODEL_INSERT'))
        }
      }
    }
    if (oldId && oldId !== newId) {
      const tabs = readTabsJson()
      if (tabs[oldId]) {
        tabs[newId] = tabs[oldId]
        delete tabs[oldId]
        writeTabsJson(tabs)
      }
      if (oldConstName) deleteRecipeFromProvider(oldConstName)
      try {
        const tPath = path.join(MOD_ROOT,'assets',MODID,'textures','item',`${oldId}.png`)
        if (fs.existsSync(tPath)) { fs.unlinkSync(tPath); triggerIdeaReload(tPath); }
      } catch {}
    }
    markDirty()
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

app.post('/api/items/delete', (req, res) => {
  try {
    const { id, constName } = req.body
    const modItemsFile = jp(JAVA_ROOT,'item','ModItems.java')
    let src = rf(modItemsFile)
    const startIdx = src.indexOf(`ITEMS.register("${id}"`)
    if (startIdx !== -1) {
      const fieldStart = src.lastIndexOf('\n    public static final ', startIdx)
      let depth=0, end=-1
      for (let i=startIdx; i<src.length; i++) {
        if(src[i]==='('||src[i]==='{') depth++
        else if(src[i]===')'||src[i]==='}') { depth--; if(depth===0){const semi=src.indexOf(';',i);if(semi!==-1){end=semi+1;break}} }
      }
      if (fieldStart!==-1 && end!==-1) wf(modItemsFile, src.slice(0,fieldStart)+src.slice(end))
    }
    // Clean lang: item.* and tooltip.*
    const lang = rl()
    for (const k of Object.keys(lang)) {
      if (k.startsWith(`item.${MODID}.${id}`) || k.startsWith(`tooltip.${MODID}.${id}`)) delete lang[k]
    }
    wl(sortLang(lang))
    // Clean model provider (multi-line safe)
    const modelFile = jp(JAVA_ROOT,'datagen','ModItemModelProvider.java')
    const modelLines = rf(modelFile).split('\n')
    const cleanedModel = []
    let skipNext = false
    for (let i = 0; i < modelLines.length; i++) {
      const l = modelLines[i]
      if (l.includes(`ModItems.${constName}`) || l.includes(`"${id}"`)) { skipNext = true; continue }
      if (skipNext) {
        if (l.trim().startsWith('.') || l.trim() === ';') continue
        skipNext = false
      }
      cleanedModel.push(l)
    }
    wf(modelFile, cleanedModel.join('\n'))
    // Clean tags from ModItemTagProvider
    removeLines(jp(JAVA_ROOT,'datagen','ModItemTagProvider.java'), l => l.includes(`ModItems.${constName}.get()`))
    // Clean recipes from ModRecipeProvider
    deleteRecipeFromProvider(constName)
    // Clean ycs_tabs.json
    const tabs = readTabsJson()
    delete tabs[id]
    writeTabsJson(tabs)
    // Clean ModCreativeTabEvents (vanilla tabs)
    try { removeLines(jp(JAVA_ROOT,'item','ModCreativeTabEvents.java'), l => l.includes(`ModItems.${constName}`)) } catch {}
    markDirty()
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

app.post('/api/items/model', (req, res) => {
  try {
    const { line } = req.body
    const file = jp(JAVA_ROOT,'datagen','ModItemModelProvider.java')
    let src = rf(file)
    const firstLine = line.split('\n')[0].trim()
    if (src.includes(firstLine)) return res.json({ ok:false, reason:'already exists' })
    const marker = '\n        // YCS_MODEL_INSERT'
    if (!src.includes(marker)) return res.json({ ok:false, reason:'YCS_MODEL_INSERT marker not found' })
    const indented = line.split('\n').map(l => '        ' + l.trim()).join('\n')
    wf(file, src.replace(marker, '\n' + indented + '\n        // YCS_MODEL_INSERT'))
    markDirty()
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

// ─── Creative tab — JSON-based via ycs_tabs.json ──────────────────────────────

const TABS_JSON = 'D:/Projects/Mods/yebisu-RPG/src/main/resources/assets/yebisurpg/ycs_tabs.json'

// Map from UI tab const value to the tab key string used in ycs_tabs.json
const TAB_VALUE_TO_KEY = {
  'ModCreativeModeTabs.YEBISURPG_ITEMS_TAB':  'yebisurpg_items_tab',
  'ModCreativeModeTabs.YEBISURPG_BLOCK_TAB':  'yebisurpg_blocks_tab',
  'vanilla:combat':              'combat',
  'vanilla:tools_and_utilities': 'tools_and_utilities',
  'vanilla:food_and_drinks':     'food_and_drinks',
  'vanilla:ingredients':         'ingredients',
  'vanilla:building_blocks':     'building_blocks',
  'vanilla:redstone':            'redstone_blocks',
  'vanilla:natural_blocks':      'natural_blocks',
}
// Reverse: tab key -> UI tab const value (for items/read)
const TAB_KEY_TO_VALUE = Object.fromEntries(Object.entries(TAB_VALUE_TO_KEY).map(([k,v])=>[v,k]))

function readTabsJson() {
  try { return JSON.parse(rf(TABS_JSON)) } catch { return {} }
}
function writeTabsJson(obj) {
  const entries = Object.entries(obj).sort((a,b) => {
    if (a[1] !== b[1]) return a[1].localeCompare(b[1])
    return a[0].localeCompare(b[0])
  })
  let out = "{\n"
  let lastTab = null
  for (let i = 0; i < entries.length; i++) {
    const [k, v] = entries[i]
    if (lastTab !== null && lastTab !== v) out += "\n"
    lastTab = v
    const isLast = (i === entries.length - 1)
    out += `  "${k}": "${v}"${isLast ? "" : ","}\n`
  }
  out += "}"
  wf(TABS_JSON, out)
}

app.post('/api/creativetab', (req, res) => {
  try {
    const { ref, tabConst, itemId, blockId } = req.body
    if (!tabConst) return res.json({ ok:false, reason:'no tab selected' })
    const tabKey = TAB_VALUE_TO_KEY[tabConst]
    if (!tabKey) return res.json({ ok:false, reason:`unknown tab: ${tabConst}` })

    let entryKey
    if (blockId) {
      // Block ID passed directly — most reliable
      entryKey = `block:${blockId}`
    } else if (itemId) {
      // Item ID passed directly
      entryKey = itemId
    } else if (ref.startsWith('ModBlocks.')) {
      // Fall back to regex lookup
      const cn = ref.replace('ModBlocks.','')
      const bsrc = rf(jp(JAVA_ROOT,'block','ModBlocks.java'))
      const idM = new RegExp(`${cn}\\s*=\\s*registerBlock\\("([^"]+)"`).exec(bsrc)
      if (!idM) return res.json({ ok:false, reason:`could not find block ${cn} in ModBlocks.java` })
      entryKey = `block:${idM[1]}`
    } else {
      const cn = ref.replace('ModItems.','')
      const isrc = rf(jp(JAVA_ROOT,'item','ModItems.java'))
      const idM = new RegExp(`${cn}\\s*=\\s*ITEMS\\.register\\("([^"]+)"`).exec(isrc)
      if (!idM) return res.json({ ok:false, reason:`could not find item ${cn} in ModItems.java` })
      entryKey = idM[1]
    }

    const tabs = readTabsJson()
    tabs[entryKey] = tabKey
    writeTabsJson(tabs)
    console.log(`[creativetab] ${entryKey} -> ${tabKey}`)
    res.json({ ok:true })
  } catch(e) { console.error(e); res.json({ ok:false, reason:e.message }) }
})

app.post('/api/creativetab/remove', (req, res) => {
  try {
    const { ref } = req.body
    let entryKey
    if (ref.startsWith('ModBlocks.')) {
      const cn = ref.replace('ModBlocks.','')
      const bsrc = rf(jp(JAVA_ROOT,'block','ModBlocks.java'))
      const idM = new RegExp(`${cn}\\s*=\\s*registerBlock\\("([^"]+)"`).exec(bsrc)
      if (idM) entryKey = `block:${idM[1]}`
    } else {
      const cn = ref.replace('ModItems.','')
      const isrc = rf(jp(JAVA_ROOT,'item','ModItems.java'))
      const idM = new RegExp(`${cn}\\s*=\\s*ITEMS\\.register\\("([^"]+)"`).exec(isrc)
      if (idM) entryKey = idM[1]
    }
    if (entryKey) {
      const tabs = readTabsJson()
      delete tabs[entryKey]
      writeTabsJson(tabs)
    }
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

// ─── Tags ──────────────────────────────────────────────────────────────────────
// Writes tag entries directly into ModItemTagProvider.java / ModBlockTagProvider.java
// Uses a simple marker: // YCS_ITEM_TAGS_INSERT and // YCS_BLOCK_TAGS_INSERT

app.post('/api/tags/set', (req, res) => {
  try {
    const { id, constName, tags, isBlock=false } = req.body
    if (!tags || !tags.length) return res.json({ ok:true, skipped:true })

    const file = isBlock
      ? jp(JAVA_ROOT,'datagen','ModBlockTagProvider.java')
      : jp(JAVA_ROOT,'datagen','ModItemTagProvider.java')
    let src = rf(file)
    const marker = isBlock ? '    // YCS_BLOCK_TAGS_INSERT' : '    // YCS_ITEM_TAGS_INSERT'

    if (!src.includes(marker)) {
      // Insert marker before closing brace of addTags method
      const addTagsEnd = src.lastIndexOf('}', src.lastIndexOf('}') - 1)
      if (addTagsEnd === -1) return res.json({ ok:false, reason:'could not find addTags closing brace' })
      src = src.slice(0, addTagsEnd) + '        ' + marker + '\n    ' + src.slice(addTagsEnd)
      wf(file, src)
      src = rf(file)
    }

    const ref = isBlock ? `ModBlocks.${constName}.get()` : `ModItems.${constName}.get()`
    const lines = []

    for (const tag of tags) {
      const [ns, path] = tag.includes(':') ? tag.split(':') : [MODID, tag]
      const tagConst = resolveTagConst(ns, path, isBlock)
      const line = `        tag(${tagConst}).add(${ref});`
      // Skip if already present
      if (!src.includes(`tag(${tagConst}).add(${ref})`)) lines.push(line)
    }

    if (lines.length) {
      wf(file, src.replace(marker, lines.join('\n') + '\n        ' + marker))
    }
    markDirty()
    res.json({ ok:true, added:lines.length })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

function resolveTagConst(ns, path, isBlock) {
  // Map common tags to their Java constant
  const itemTagMap = {
    'minecraft:axes':'ItemTags.AXES','minecraft:hoes':'ItemTags.HOES',
    'minecraft:pickaxes':'ItemTags.PICKAXES','minecraft:shovels':'ItemTags.SHOVELS',
    'minecraft:swords':'ItemTags.SWORDS','minecraft:tools':'ItemTags.TOOLS',
    'minecraft:logs':'ItemTags.LOGS','minecraft:planks':'ItemTags.PLANKS',
    'minecraft:slabs':'ItemTags.SLABS','minecraft:stairs':'ItemTags.STAIRS',
    'minecraft:doors':'ItemTags.DOORS','minecraft:flowers':'ItemTags.FLOWERS',
  }
  const blockTagMap = {
    'minecraft:mineable/pickaxe':'BlockTags.MINEABLE_WITH_PICKAXE',
    'minecraft:mineable/axe':'BlockTags.MINEABLE_WITH_AXE',
    'minecraft:mineable/shovel':'BlockTags.MINEABLE_WITH_SHOVEL',
    'minecraft:mineable/hoe':'BlockTags.MINEABLE_WITH_HOE',
    'minecraft:needs_stone_tool':'BlockTags.NEEDS_STONE_TOOL',
    'minecraft:needs_iron_tool':'BlockTags.NEEDS_IRON_TOOL',
    'minecraft:needs_diamond_tool':'BlockTags.NEEDS_DIAMOND_TOOL',
    'minecraft:logs':'BlockTags.LOGS',
    'minecraft:planks':'BlockTags.PLANKS',
    'minecraft:slabs':'BlockTags.SLABS',
    'minecraft:stairs':'BlockTags.STAIRS',
    'minecraft:fences':'BlockTags.FENCES',
    'minecraft:fence_gates':'BlockTags.FENCE_GATES',
    'minecraft:walls':'BlockTags.WALLS',
    'minecraft:buttons':'BlockTags.BUTTONS',
    'minecraft:pressure_plates':'BlockTags.PRESSURE_PLATES',
    'minecraft:doors':'BlockTags.DOORS',
    'minecraft:trapdoors':'BlockTags.TRAPDOORS',
  }
  const key = `${ns}:${path}`
  const map = isBlock ? blockTagMap : itemTagMap
  if (map[key]) return map[key]
  return `TagKey.create(${isBlock?'Registries.BLOCK':'Registries.ITEM'}, ResourceLocation.fromNamespaceAndPath("${ns}", "${path}"))`
}

app.post('/api/tags/delete', (req, res) => {
  try {
    const { constName, isBlock=false } = req.body
    const file = isBlock
      ? jp(JAVA_ROOT,'datagen','ModBlockTagProvider.java')
      : jp(JAVA_ROOT,'datagen','ModItemTagProvider.java')
    const ref = isBlock ? `ModBlocks.${constName}.get()` : `ModItems.${constName}.get()`
    removeLines(file, l => l.includes(`.add(${ref})`))
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

// ─── Recipes ───────────────────────────────────────────────────────────────────
app.post('/api/recipes/set', (req, res) => {
  try {
    const { id, constName, recipeCode } = req.body
    if (!recipeCode) return res.json({ ok:true, skipped:true })

    // Delete any existing recipe for this item first so we don't duplicate
    deleteRecipeFromProvider(constName)

    const file = jp(JAVA_ROOT,'datagen','ModRecipeProvider.java')
    let src = rf(file)
    const marker = '        // YCS_RECIPE_INSERT'

    if (!src.includes(marker)) {
      // Insert marker before closing brace of buildRecipes method
      const buildRecipesStart = src.indexOf('protected void buildRecipes')
      if (buildRecipesStart === -1) return res.json({ ok:false, reason:'could not find buildRecipes' })
      let depth = 0, endIdx = -1
      for (let i = src.indexOf('{', buildRecipesStart); i < src.length; i++) {
        if (src[i] === '{') depth++
        else if (src[i] === '}') { depth--; if (depth === 0) { endIdx = i; break } }
      }
      if (endIdx === -1) return res.json({ ok:false, reason:'could not find buildRecipes closing brace' })
      src = src.slice(0, endIdx) + marker + '\n    ' + src.slice(endIdx)
      wf(file, src)
      src = rf(file)
    }

    const lines = recipeCode.split('\n').map(l => '        ' + l).join('\n')
    wf(file, src.replace(marker, lines + '\n' + marker))
    markDirty()
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})
function deleteRecipeFromProvider(constName) {
  const file = jp(JAVA_ROOT,'datagen','ModRecipeProvider.java')
  try {
    let src = rf(file)
    const lines = src.split('\n')
    let out = []
    let skip = false
    for (let i=0; i<lines.length; i++) {
      if (lines[i].includes(`ModItems.${constName}.get(),`) || lines[i].includes(`ModBlocks.${constName}.get(),`)) {
        skip = true
        while(out.length && out[out.length-1].trim().length > 0 && !out[out.length-1].includes('save(') && !out[out.length-1].includes('// YCS')) {
           out.pop()
        }
        continue
      }
      if (skip) {
        if (lines[i].includes('.save(')) skip = false
        continue
      }
      out.push(lines[i])
    }
    wf(file, out.join('\n'))
  } catch(e) {}
}

app.post('/api/recipes/delete', (req, res) => {
  try {
    const { constName } = req.body
    deleteRecipeFromProvider(constName)
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})
// ─── Blocks ────────────────────────────────────────────────────────────────────
app.post('/api/blocks/register', (req, res) => {
  try {
    const { entries, creativeTab } = req.body
    const blockFile = jp(JAVA_ROOT,'block','ModBlocks.java')
    const bspFile   = jp(JAVA_ROOT,'datagen','ModBlockStateProvider.java')
    const lootFile  = jp(JAVA_ROOT,'datagen','ModBlockLootTableProvider.java')
    const modelFile = jp(JAVA_ROOT,'datagen','ModItemModelProvider.java')
    const lang = rl()
    const results = []
    const bmarker    = '\n    private static <T extends Block> DeferredBlock<T> registerBlock('
    const bspMarker  = '\n        // YCS_BSP_INSERT'
    const lootMarker = '\n        // YCS_LOOT_INSERT'
    const modelMarker = '\n        // YCS_MODEL_INSERT'
    const tabs = readTabsJson()

    for (const entry of entries) {
      const { line, constName:eCN, bspLines, lootLine, modelLine, langKey, langVal, blockId } = entry
      if (!line) { results.push({constName:eCN, ok:false, reason:'empty line'}); continue }
      let bsrc = rf(blockFile)
      if (bsrc.includes(eCN+' =')) { results.push({constName:eCN, ok:false, reason:'already exists'}); continue }
      if (!bsrc.includes(bmarker)) { results.push({constName:eCN, ok:false, reason:'insertion point not found'}); continue }

      // Insert block registration
      const bindented = line.split('\n').map((l,i) => i===0?'    '+l:'            '+l).join('\n')
      wf(blockFile, rf(blockFile).replace(bmarker, '\n'+bindented+'\n'+bmarker))

      // Insert blockstate
      if (bspLines) {
        const bsp = rf(bspFile)
        if (bsp.includes(bspMarker)) wf(bspFile, bsp.replace(bspMarker, '\n        '+bspLines+'\n'+bspMarker))
      }

      // Insert loot
      if (lootLine) {
        const loot = rf(lootFile)
        if (loot.includes(lootMarker)) wf(lootFile, loot.replace(lootMarker, '\n        '+lootLine+'\n'+lootMarker))
      }

      // Insert model — use YCS_MODEL_INSERT marker, not buttonItem
      if (modelLine && !modelLine.startsWith('/*')) {
        let msrc = rf(modelFile)
        const firstLine = modelLine.split('\n')[0].trim()
        if (msrc.includes(modelMarker) && !msrc.includes(firstLine)) {
          const indented = modelLine.split('\n').map(l => '        ' + l.trim()).join('\n')
          wf(modelFile, msrc.replace(modelMarker, '\n' + indented + '\n        // YCS_MODEL_INSERT'))
        }
      }

      // Write lang
      if (langKey && langVal) {
        const r = insertLangGrouped(lang, langKey, langVal)
        if (!r.exists) Object.assign(lang, r.result)
      }

      // Write creative tab for this variant too (uses same tab as base block)
      if (creativeTab && blockId) {
        const tabKey = TAB_VALUE_TO_KEY[creativeTab]
        if (tabKey) tabs[`block:${blockId}`] = tabKey
      }

      results.push({constName:eCN, ok:true})
    }

    wl(sortLang(lang))
    writeTabsJson(tabs)
    markDirty()
    res.json({ ok:true, results })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

app.post('/api/blocks/update', (req, res) => {
  try {
    const { oldConstName, oldId, newLine, newConstName, newId, langKey, langVal } = req.body
    const file = jp(JAVA_ROOT,'block','ModBlocks.java')
    let src = rf(file)
    const startIdx = src.indexOf(`registerBlock("${oldId}"`)
    if (startIdx===-1) return res.json({ ok:false, reason:`registerBlock("${oldId}") not found` })
    const fieldStart = src.lastIndexOf('\n    public static final ', startIdx)
    if (fieldStart===-1) return res.json({ ok:false, reason:'field declaration not found' })
    let depth=0, end=-1
    for (let i=startIdx; i<src.length; i++) {
      if(src[i]==='('||src[i]==='{') depth++
      else if(src[i]===')'||src[i]==='}') { depth--; if(depth===0){const semi=src.indexOf(';',i);if(semi!==-1){end=semi+1;break}} }
    }
    if (end===-1) return res.json({ ok:false, reason:'end not found' })
    const indented = '\n    '+newLine.split('\n').map((l,i)=>i===0?l:'            '+l).join('\n')
    wf(file, src.slice(0,fieldStart)+indented+src.slice(end))
    const lang=rl()
    if (oldId!==newId) {
      delete lang[`block.${MODID}.${oldId}`]
      for (const k of Object.keys(lang)) {
        if (k.startsWith(`tooltip.${MODID}.${oldId}.`)) delete lang[k]
      }
    }
    lang[langKey]=langVal
    wl(sortLang(lang))
    
    if (oldId && oldId !== newId) {
      const tabs = readTabsJson()
      if (tabs[`block:${oldId}`]) {
        tabs[`block:${newId}`] = tabs[`block:${oldId}`]
        delete tabs[`block:${oldId}`]
        writeTabsJson(tabs)
      }
      if (oldConstName) deleteRecipeFromProvider(oldConstName)
      try {
        const tryDel = f => { try { if (fs.existsSync(f)) { fs.unlinkSync(f); triggerIdeaReload(f); } } catch {} }
        tryDel(path.join(MOD_ROOT,'assets',MODID,'textures','block',`${oldId}.png`))
        tryDel(path.join(MOD_ROOT,'assets',MODID,'textures','block',`${oldId}_top.png`))
        tryDel(path.join(MOD_ROOT,'assets',MODID,'textures','block',`${oldId}_bottom.png`))
        tryDel(path.join(MOD_ROOT,'assets',MODID,'textures','block',`${oldId}_side.png`))
        tryDel(path.join(MOD_ROOT,'assets',MODID,'textures','block',`${oldId}_front.png`))
        tryDel(path.join(MOD_ROOT,'assets',MODID,'textures','block',`${oldId}_back.png`))
        tryDel(path.join(MOD_ROOT,'assets',MODID,'textures','block',`${oldId}_door_top.png`))
        tryDel(path.join(MOD_ROOT,'assets',MODID,'textures','block',`${oldId}_door_bottom.png`))
        tryDel(path.join(MOD_ROOT,'assets',MODID,'textures','item',`${oldId}_door.png`))
        tryDel(path.join(MOD_ROOT,'assets',MODID,'textures','block',`${oldId}_trapdoor.png`))
      } catch {}
    }

    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

app.post('/api/blocks/delete', (req, res) => {
  try {
    const { id, constName } = req.body
    const blockFile = jp(JAVA_ROOT,'block','ModBlocks.java')
    let src = rf(blockFile)
    const startIdx = src.indexOf(`registerBlock("${id}"`)
    if (startIdx !== -1) {
      const fieldStart = src.lastIndexOf('\n    public static final ', startIdx)
      let depth=0, end=-1
      for (let i=startIdx; i<src.length; i++) {
        if(src[i]==='('||src[i]==='{') depth++
        else if(src[i]===')'||src[i]==='}') { depth--; if(depth===0){const semi=src.indexOf(';',i);if(semi!==-1){end=semi+1;break}} }
      }
      if (fieldStart!==-1&&end!==-1) wf(blockFile, src.slice(0,fieldStart)+src.slice(end))
    }
    const lang=rl()
    for (const k of Object.keys(lang)) { if (k===`block.${MODID}.${id}`) delete lang[k] }
    wl(sortLang(lang))
    // Remove from ModItemModelProvider — handle both single-line and multi-line getBuilder blocks
    const modelFile = jp(JAVA_ROOT,'datagen','ModItemModelProvider.java')
    let msrc = rf(modelFile)
    const modelLines = msrc.split('\n')
    const cleanedModel = []
    let skipContinuation = false
    for (let i = 0; i < modelLines.length; i++) {
      const l = modelLines[i]
      const refersToBlock = l.includes(`ModBlocks.${constName}`) || l.includes(`"${id}"`)
      if (refersToBlock) {
        skipContinuation = true
        continue
      }
      if (skipContinuation) {
        if (l.trim().startsWith('.') || l.trim() === ';') continue
        skipContinuation = false
      }
      cleanedModel.push(l)
    }
    wf(modelFile, cleanedModel.join('\n'))

    for (const f of [
      jp(JAVA_ROOT,'datagen','ModBlockStateProvider.java'),
      jp(JAVA_ROOT,'datagen','ModBlockLootTableProvider.java'),
      jp(JAVA_ROOT,'item','ModCreativeModeTabs.java'),
    ]) { try { removeLines(f, l => l.includes(`ModBlocks.${constName}`)) } catch {} }
    // Clean tags from ModBlockTagProvider and ModItemTagProvider (BlockItem tags)
    try { removeLines(jp(JAVA_ROOT,'datagen','ModBlockTagProvider.java'), l => l.includes(`ModBlocks.${constName}.get()`)) } catch {}
    deleteRecipeFromProvider(constName)
    try { removeLines(jp(JAVA_ROOT,'datagen','ModItemTagProvider.java'), l => l.includes(`ModBlocks.${constName}`)) } catch {}
    // Clean up ycs_tabs.json
    const tabs2 = readTabsJson()
    delete tabs2[`block:${id}`]
    writeTabsJson(tabs2)
    markDirty()
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

app.listen(3001, () => {
  console.log('ycs backend :3001  mod:', MOD_ROOT)
  // On startup: auto-write missing model JSONs for all items that have textures
  autoWriteMissingModelJsons()
})

// ─── Auto-write missing model JSONs ────────────────────────────────────────────
const GEN_ROOT = 'D:/Projects/Mods/yebisu-RPG/src/generated/resources'

function writeModelJson(id, isHandheld=false) {
  const modelDir = jp(GEN_ROOT,'assets',MODID,'models','item')
  const modelPath = jp(modelDir,`${id}.json`)
  if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir, { recursive:true })
  if (fs.existsSync(modelPath)) return // don't overwrite existing
  const parent = isHandheld ? 'minecraft:item/handheld' : 'minecraft:item/generated'
  fs.writeFileSync(modelPath, JSON.stringify({
    parent,
    textures: { layer0: `${MODID}:item/${id}` }
  }, null, 2))
}

function writeBlockStateJson(id) {
  const bsDir = jp(GEN_ROOT,'assets',MODID,'blockstates')
  const bsPath = jp(bsDir,`${id}.json`)
  if (!fs.existsSync(bsDir)) fs.mkdirSync(bsDir, { recursive:true })
  if (fs.existsSync(bsPath)) return
  fs.writeFileSync(bsPath, JSON.stringify({
    variants: { "": { model: `${MODID}:block/${id}` } }
  }, null, 2))
}

function writeBlockModelJsons(id) {
  const blockModelDir = jp(GEN_ROOT,'assets',MODID,'models','block')
  const itemModelDir  = jp(GEN_ROOT,'assets',MODID,'models','item')
  if (!fs.existsSync(blockModelDir)) fs.mkdirSync(blockModelDir, { recursive:true })
  if (!fs.existsSync(itemModelDir))  fs.mkdirSync(itemModelDir,  { recursive:true })
  const blockModel = jp(blockModelDir,`${id}.json`)
  const itemModel  = jp(itemModelDir,`${id}.json`)
  if (!fs.existsSync(blockModel)) {
    fs.writeFileSync(blockModel, JSON.stringify({
      parent: 'minecraft:block/cube_all',
      textures: { all: `${MODID}:block/${id}` }
    }, null, 2))
  }
  if (!fs.existsSync(itemModel)) {
    fs.writeFileSync(itemModel, JSON.stringify({
      parent: `${MODID}:block/${id}`
    }, null, 2))
  }
}

function autoWriteMissingModelJsons() {
  try {
    // Items
    const itemTexDir = jp(MOD_ROOT,'assets',MODID,'textures','item')
    const modelProvSrc = fs.existsSync(jp(JAVA_ROOT,'datagen','ModItemModelProvider.java'))
      ? rf(jp(JAVA_ROOT,'datagen','ModItemModelProvider.java')) : ''
    if (fs.existsSync(itemTexDir)) {
      for (const f of fs.readdirSync(itemTexDir)) {
        if (!f.endsWith('.png')) continue
        const id = f.replace('.png','')
        const isHandheld = modelProvSrc.includes(`handheldItem(ModItems.${id.toUpperCase()})`)
          || modelProvSrc.includes(`handheldItem(ModItems.${id.toUpperCase()};`)
        writeModelJson(id, isHandheld)
      }
    }
    // Blocks
    const blockTexDir = jp(MOD_ROOT,'assets',MODID,'textures','block')
    if (fs.existsSync(blockTexDir)) {
      for (const f of fs.readdirSync(blockTexDir)) {
        if (!f.endsWith('.png')) continue
        const id = f.replace('.png','')
        writeBlockModelJsons(id)
        writeBlockStateJson(id)
      }
    }
    console.log('[ycs] auto-generated missing model/blockstate JSONs')
  } catch(e) {
    console.error('[ycs] autoWriteMissingModelJsons error:', e.message)
  }
}

// Also expose as an API endpoint so YCS can trigger it after saving textures
app.post('/api/models/sync', (_req, res) => {
  try { autoWriteMissingModelJsons(); res.json({ ok:true }) }
  catch(e) { res.json({ ok:false, reason:e.message }) }
})


