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
const wf = (f, s) => fs.writeFileSync(f, s)
const rl = () => JSON.parse(rf(path.join(MOD_ROOT,'assets',MODID,'lang','en_us.json')).replace(/^\uFEFF/,''))
const wl = j => wf(path.join(MOD_ROOT,'assets',MODID,'lang','en_us.json'), JSON.stringify(j,null,2))
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
      const tabKey = tabs[id] || ''
      const creativeTab = TAB_KEY_TO_VALUE[tabKey] || ''
      items.push({ id, constName, displayName:lang[`item.${MODID}.${id}`]||id, itemType, toolType, tier, damage, speed, burnTime, hasTexture:fs.existsSync(texPath), creativeTab, source:'mod' })
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
      const tabKey = tabs[`block:${id}`] || ''
      const creativeTab = TAB_KEY_TO_VALUE[tabKey] || ''
      blocks.push({ id, constName:id.toUpperCase(), displayName:lang[`block.${MODID}.${id}`]||id, blockType, hasTexture:fs.existsSync(texPath), creativeTab, source:'mod' })
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
  const entries = Object.entries(json)
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
  // Sort each group alphabetically by key
  for (const g of Object.values(groups)) g.sort((a, b) => a[0].localeCompare(b[0]))
  other.sort((a, b) => a[0].localeCompare(b[0]))
  const sorted = []
  for (const prefix of LANG_PREFIX_ORDER) {
    if (groups[prefix]) sorted.push(...groups[prefix])
  }
  sorted.push(...other)
  return Object.fromEntries(sorted)
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
    const { oldConstName, oldId, newLine, newConstName, newId, langKey, langVal } = req.body
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
    if (oldId!==newId) delete lang[`item.${MODID}.${oldId}`]
    lang[langKey] = langVal
    wl(sortLang(lang))
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
    const lang = rl()
    for (const k of Object.keys(lang)) { if (k.startsWith(`item.${MODID}.${id}`) || k.startsWith(`tooltip.${MODID}.${id}`)) delete lang[k] }
    wl(lang)
    // Remove from ModItemModelProvider — handle multi-line getBuilder blocks
    const modelFile = jp(JAVA_ROOT,'datagen','ModItemModelProvider.java')
    let msrc = rf(modelFile)
    // Remove any line that directly references this item/constName
    // AND the following continuation lines (.parent, .texture, .trackGenerated etc) until next statement
    const modelLines = msrc.split('\n')
    const cleanedModel = []
    let skipNext = false
    for (let i = 0; i < modelLines.length; i++) {
      const l = modelLines[i]
      const refersToItem = l.includes(`ModItems.${constName}`) || l.includes(`"${id}"`)
      if (refersToItem) {
        skipNext = true
        continue
      }
      if (skipNext) {
        // Skip continuation lines (start with . or are closing ;)
        if (l.trim().startsWith('.') || l.trim() === ';') continue
        skipNext = false
      }
      cleanedModel.push(l)
    }
    wf(modelFile, cleanedModel.join('\n'))
    // Clean up ycs_tabs.json
    const tabs = readTabsJson()
    delete tabs[id]
    writeTabsJson(tabs)
    // Also clean ModCreativeTabEvents (vanilla tabs)
    removeLines(jp(JAVA_ROOT,'item','ModCreativeTabEvents.java'), l => l.includes(`ModItems.${constName}`))
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
  wf(TABS_JSON, JSON.stringify(obj, null, 2))
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

// ─── Blocks ────────────────────────────────────────────────────────────────────
app.post('/api/blocks/register', (req, res) => {
  try {
    const { entries } = req.body
    const blockFile = jp(JAVA_ROOT,'block','ModBlocks.java')
    const bspFile   = jp(JAVA_ROOT,'datagen','ModBlockStateProvider.java')
    const lootFile  = jp(JAVA_ROOT,'datagen','ModBlockLootTableProvider.java')
    const modelFile = jp(JAVA_ROOT,'datagen','ModItemModelProvider.java')
    const lang = rl()
    const results = []
    const bmarker   = '\n    private static <T extends Block> DeferredBlock<T> registerBlock('
    const bspMarker = '\n        // YCS_BSP_INSERT'
    const lootMarker = '\n        // YCS_LOOT_INSERT'
    const mmarker   = '\n        buttonItem('

    for (const entry of entries) {
      const { line, constName:eCN, bspLines, lootLine, modelLine, langKey, langVal } = entry
      if (!line) { results.push({constName:eCN, ok:false, reason:'empty line'}); continue }
      let bsrc = rf(blockFile)
      if (bsrc.includes(eCN+' =')) { results.push({constName:eCN, ok:false, reason:'already exists'}); continue }
      if (!bsrc.includes(bmarker)) { results.push({constName:eCN, ok:false, reason:'insertion point not found'}); continue }
      const bindented = line.split('\n').map((l,i) => i===0?'    '+l:'            '+l).join('\n')
      wf(blockFile, rf(blockFile).replace(bmarker, '\n'+bindented+'\n'+bmarker))
      if (bspLines) { const bsp=rf(bspFile); if(bsp.includes(bspMarker)) wf(bspFile, bsp.replace(bspMarker, '\n        '+bspLines+'\n'+bspMarker)) }
      if (lootLine) { const loot=rf(lootFile); if(loot.includes(lootMarker)) wf(lootFile, loot.replace(lootMarker, '\n        '+lootLine+'\n'+lootMarker)) }
      if (modelLine && !modelLine.startsWith('/*')) {
        let msrc = rf(modelFile)
        const mmarker2 = '\n        // YCS_MODEL_INSERT'
        const firstLine = modelLine.split('\n')[0].trim()
        if (msrc.includes(mmarker2) && !msrc.includes(firstLine)) {
          const indented2 = modelLine.split('\n').map(l => '        ' + l.trim()).join('\n')
          wf(modelFile, msrc.replace(mmarker2, '\n' + indented2 + '\n        // YCS_MODEL_INSERT'))
        }
      }
      if (langKey&&langVal) { const r=insertLangGrouped(lang,langKey,langVal); if(!r.exists) Object.assign(lang,r.result) }
      results.push({constName:eCN, ok:true})
    }
    wl(lang)
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
    if (oldId!==newId) delete lang[`block.${MODID}.${oldId}`]
    lang[langKey]=langVal; wl(lang)
    markDirty()
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
    wl(lang)
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
    ]) removeLines(f, l => l.includes(`ModBlocks.${constName}`))
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
})


