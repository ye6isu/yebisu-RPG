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
const YCS_MARKERS = [
  ['//YCS_Mod_Items_START', '//YCS_Mod_Items_END'],
  ['//YCS_Mod_Item_Tags_START', '//YCS_Mod_Item_Tags_END'],
  ['//YCS_Mod_Block_Tags_START', '//YCS_Mod_Block_Tags_END'],
  ['//YCS_Mod_Recipe_Provider_START', '//YCS_Mod_Recipe_Provider_END'],
  ['//YCS_Mod_Blocks_START', '//YCS_Mod_Blocks_END'],
  ['//YCS_Mod_Block_State_START', '//YCS_Mod_Block_State_END'],
  ['//YCS_Mod_Block_Loot_START', '//YCS_Mod_Block_Loot_END'],
  ['//YCS_Mod_Item_Model_START', '//YCS_Mod_Item_Model_END']
]
const wf = (f, s) => {
  if (typeof s === 'string') {
    for (const [start, end] of YCS_MARKERS) {
      if (s.includes(start)) s = formatYCSSection(s, start, end);
    }
  }
  fs.writeFileSync(f, s);
  triggerIdeaReload(f);
}
function triggerIdeaReload(filePath) {
  try { const now = new Date(); fs.utimesSync(filePath, now, now); } catch {}
}
const rl = () => {
  const raw = rf(path.join(MOD_ROOT,'assets',MODID,'lang','en_us.json')).replace(/^\uFEFF/,'')
  const stripped = raw.split('\n').filter(l => l.trim() !== '').join('\n')
  const parsed = JSON.parse(stripped)
  for (const k of Object.keys(parsed)) if (k === '__BLANK__') delete parsed[k]
  return parsed
}
const wl = arr => wf(path.join(MOD_ROOT,'assets',MODID,'lang','en_us.json'), writeLangJson(arr))
const jp = (...p) => path.join(...p)

function removeLines(file, pred) {
  const lines = rf(file).split('\n');
  const keep = [];
  for (let i = 0; i < lines.length; i++) {
    if (pred(lines[i])) {
      if (lines[i].trim().endsWith(';')) {
         if (keep.length > 0) keep[keep.length - 1] += ';';
      }
    } else {
      keep.push(lines[i]);
    }
  }
  wf(file, keep.join('\n').replace(/\n\s*\n\s*\n/g, '\n\n'));
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
  if (runState.startsWith('running')) return res.json({ ok: false, reason: 'already running' })
  res.json(await runGradle('runData', 'data'))
})
app.post('/api/run/client', async (_req, res) => {
  if (runState.startsWith('running')) return res.json({ ok: false, reason: 'already running' })
  if (datagenDirty) { const r = await runGradle('runData', 'data'); if (!r.ok) return res.json({ ok: false, reason: 'runData failed' }) }
  res.json(await runGradle('runClient', 'client'))
})

// ─── Health & Refresh ─────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.post('/api/refresh', (_req, res) => {
  runState = 'idle'
  res.json({ ok: true })
})

// ─── Read items ────────────────────────────────────────────────────────────────
app.get('/api/items/read', (_req, res) => {
  try {
    const src  = rf(jp(JAVA_ROOT,'item','ModItems.java'))
    const lang = rl()
    const tabs = readTabsJson()
    const re = /public static final DeferredItem<(\w+)>\s+(\w+)\s*=\s*ITEMS\.register\("([^"]+)"/g
    const items = []
    let m
    while ((m = re.exec(src)) !== null) {
      const javaType = m[1], constName = m[2], id = m[3]
      let itemType='Generic', toolType='Sword', tier='Iron', damage='3', speed='-2.4', burnTime='1600', customItemClass=''
      if (['SwordItem','PickaxeItem','AxeItem','ShovelItem','HoeItem'].includes(javaType)) { itemType='Tool'; toolType=javaType.replace('Item','') }
      else if (javaType !== 'Item' && javaType !== 'FuelItem') { itemType='Custom'; customItemClass=javaType; }
      const attrM = new RegExp(`"${id}"[\\s\\S]{0,400}createAttributes\\([^,]+,\\s*([\\d.]+)f,\\s*(-?[\\d.]+)f\\)`).exec(src)
      if (attrM) { damage=attrM[1]; speed=attrM[2] }
      const tierM = new RegExp(`"${id}"[\\s\\S]{0,200}(ModToolTiers\\.\\w+|Tiers\\.\\w+)`).exec(src)
      if (tierM) { const r=tierM[1]; tier=r.includes('YE6ISU')?'YE6ISU':r.includes('NETHERITE')?'Netherite':r.includes('DIAMOND')?'Diamond':r.includes('IRON')?'Iron':r.includes('STONE')?'Stone':'Wood' }
      const burnM = new RegExp(`"${id}"[\\s\\S]{0,200}new FuelItem[^,]+,\\s*(\\d+)`).exec(src)
      if (burnM) { itemType='Fuel'; burnTime=burnM[1] }
      const texPath = jp(MOD_ROOT,'assets',MODID,'textures','item',`${id}.png`)
      const hasTexture = fs.existsSync(texPath)
      let textureDataUrl = null
      if (hasTexture) { try { textureDataUrl = 'data:image/png;base64,' + fs.readFileSync(texPath).toString('base64') } catch {} }
      const tabKey = tabs[id] || ''
      const creativeTab = TAB_KEY_TO_VALUE[tabKey] || ''
      items.push({ id, constName, displayName:lang[`item.${MODID}.${id}`]||id, itemType, customItemClass, toolType, tier, damage, speed, burnTime, hasTexture, textureDataUrl, creativeTab, source:'mod' })
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
      if (hasTexture) { try { textureDataUrl = 'data:image/png;base64,' + fs.readFileSync(texPath).toString('base64') } catch {} }
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
    } else { other.push([k, v]) }
  }
  for (const g of Object.values(groups)) g.sort((a, b) => a[0].localeCompare(b[0]))
  other.sort((a, b) => a[0].localeCompare(b[0]))
  const sorted = []
  for (const prefix of LANG_PREFIX_ORDER) {
    if (groups[prefix]) {
      if (sorted.length > 0) sorted.push(null)
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
    if (entry === null) { lines.push('') }
    else {
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

// Safe item field slicer: finds the field declaration start without consuming any YCS marker lines above it
function sliceItemField(src, oldId) {
  const startMarker = `ITEMS.register("${oldId}"`
  const startIdx = src.indexOf(startMarker)
  if (startIdx === -1) return null

  // Walk backward from startIdx line-by-line to find the `public static final` line,
  // but STOP if we hit a YCS marker — never cross it
  const before = src.slice(0, startIdx)
  const lines = before.split('\n')
  let fieldLineIdx = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i]
    if (l.includes('//YCS_')) break  // never eat a marker line
    if (/^\s*public static final /.test(l)) { fieldLineIdx = i; break }
  }
  if (fieldLineIdx === -1) return null

  // Reconstruct fieldStart as char offset — account for the newline before the line
  const fieldStart = lines.slice(0, fieldLineIdx).join('\n').length  // offset just before the \n that starts the field line

  // Find end of statement
  let depth = 0, end = -1
  for (let i = startIdx; i < src.length; i++) {
    if (src[i]==='('||src[i]==='{') depth++
    else if (src[i]===')'||src[i]==='}') {
      depth--
      if (depth===0) { const semi=src.indexOf(';',i); if(semi!==-1){end=semi+1;break} }
    }
  }
  if (end === -1) return null
  return { fieldStart, end }
}

function formatYCSSection(src, startMarker, endMarker) {
  const sIdx = src.indexOf(startMarker)
  const eIdx = src.indexOf(endMarker)
  if (sIdx === -1 || eIdx === -1) return src
  
  const lastNewline = src.lastIndexOf('\n', eIdx)
  const indent = lastNewline !== -1 ? src.slice(lastNewline + 1, eIdx).replace(/[^\s]/g, '') : '    '
  
  const before = src.slice(0, sIdx + startMarker.length)
  const after = src.slice(eIdx)
  let middle = src.slice(sIdx + startMarker.length, eIdx)
  
  middle = middle.replace(/\n\s*\n\s*\n+/g, '\n\n')
  
  if (!middle.trim()) {
    middle = '\n\n' + indent
  } else {
    if (!middle.startsWith('\n\n')) middle = '\n\n' + middle.trimStart()
    if (!middle.endsWith('\n\n' + indent)) middle = middle.trimEnd() + '\n\n' + indent
  }
  return before + middle + after
}

app.post('/api/items/register', (req, res) => {
  try {
    const { line, constName, fpReg } = req.body
    const file = jp(JAVA_ROOT,'item','ModItems.java')
    let src = rf(file)
    if (src.includes(constName+' =')) return res.json({ ok:false, reason:'already exists' })
    const startMarker = '//YCS_Mod_Items_START'
    const endMarker   = '//YCS_Mod_Items_END'
    if (!src.includes(startMarker) || !src.includes(endMarker)) return res.json({ ok:false, reason:'YCS_Mod_Items markers not found' })
    const indented = '    ' + line.split('\n').map((l,i) => i===0?l:'        '+l).join('\n')
    const insertPos = src.indexOf(endMarker)
    src = src.slice(0, insertPos) + indented + '\n\n    ' + src.slice(insertPos)
    wf(file, formatYCSSection(src, '//YCS_Mod_Items_START', '//YCS_Mod_Items_END'))
    if (fpReg) {
      const fpFile = jp(JAVA_ROOT, 'item', 'ModFoodProperties.java')
      if (fs.existsSync(fpFile)) {
        const fp = rf(fpFile)
        wf(fpFile, fp.replace('}', '    ' + fpReg + '\n}'))
      } else {
        const PKG = 'net.ye6isu.yebisuRPG'
        wf(fpFile, `package ${PKG}.item;\n\nimport net.minecraft.world.effect.MobEffectInstance;\nimport net.minecraft.world.effect.MobEffects;\nimport net.minecraft.world.food.FoodProperties;\n\npublic class ModFoodProperties {\n    ${fpReg}\n}\n`)
      }
    }
    markDirty()
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

app.post('/api/items/update', (req, res) => {
  try {
    const { oldConstName, oldId, newLine, newConstName, newId, langKey, langVal, newModelLine, fpReg } = req.body
    const file = jp(JAVA_ROOT,'item','ModItems.java')
    let src = rf(file)
    const startIdx = src.indexOf(`ITEMS.register("${oldId}"`)
    if (startIdx === -1) return res.json({ ok:false, reason:`ITEMS.register("${oldId}") not found` })
    const slice = sliceItemField(src, oldId)
    if (!slice) return res.json({ ok:false, reason:'field declaration not found' })
    const { fieldStart, end } = slice
    const indented = '\n    '+newLine.split('\n').map((l,i)=>i===0?l:'        '+l).join('\n')
    src = src.slice(0,fieldStart)+indented+src.slice(end)
    wf(file, formatYCSSection(src, '//YCS_Mod_Items_START', '//YCS_Mod_Items_END'))
    const lang = rl()
    if (oldId!==newId) {
      delete lang[`item.${MODID}.${oldId}`]
      for (const k of Object.keys(lang)) if (k.startsWith(`tooltip.${MODID}.${oldId}.`)) delete lang[k]
    }
    lang[langKey] = langVal
    wl(sortLang(lang))
    if (newModelLine) {
      const modelFile = jp(JAVA_ROOT,'datagen','ModItemModelProvider.java')
      let msrc = rf(modelFile)
      const CN = newConstName || (newId||'').toUpperCase()
      const oldCN = oldConstName || (oldId||'').toUpperCase()
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
        const modelMarker = '\n        //YCS_Mod_Item_Model_END'
        if (msrc.includes(modelMarker)) {
          const indentedModel = '        ' + newModelLine.trim()
          wf(modelFile, msrc.replace(modelMarker, '\n' + indentedModel + '\n        //YCS_Mod_Item_Model_END'))
        }
      }
    }
    if (oldId && oldId !== newId) {
      const tabs = readTabsJson()
      if (tabs[oldId]) { tabs[newId] = tabs[oldId]; delete tabs[oldId]; writeTabsJson(tabs) }
      if (oldConstName) deleteRecipeFromProvider(oldConstName)
      try {
        const tPath = path.join(MOD_ROOT,'assets',MODID,'textures','item',`${oldId}.png`)
        if (fs.existsSync(tPath)) { fs.unlinkSync(tPath); triggerIdeaReload(tPath); }
      } catch {}
    }
    const fpFile = jp(JAVA_ROOT, 'item', 'ModFoodProperties.java')
    const PKG = 'net.ye6isu.yebisuRPG'
    if (fpReg) {
      if (fs.existsSync(fpFile)) {
        try { removeLines(fpFile, l => l.includes(`public static final FoodProperties ${oldConstName || (oldId||'').toUpperCase()} =`)) } catch {}
        const fp = rf(fpFile)
        wf(fpFile, fp.replace('}', '    ' + fpReg + '\n}'))
      } else {
        wf(fpFile, `package ${PKG}.item;\n\nimport net.minecraft.world.effect.MobEffectInstance;\nimport net.minecraft.world.effect.MobEffects;\nimport net.minecraft.world.food.FoodProperties;\n\npublic class ModFoodProperties {\n    ${fpReg}\n}\n`)
      }
    } else if (oldConstName || oldId) {
      if (fs.existsSync(fpFile)) {
        try { removeLines(fpFile, l => l.includes(`public static final FoodProperties ${oldConstName || (oldId||'').toUpperCase()} =`)) } catch {}
      }
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
      const slice = sliceItemField(src, id)
      if (slice) {
        let { fieldStart, end } = slice
        // Remove trailing or leading blank lines cleanly
        let before = src.slice(0, fieldStart)
        let after = src.slice(end)
        src = before + after
        wf(modItemsFile, formatYCSSection(src, '//YCS_Mod_Items_START', '//YCS_Mod_Items_END'))
      }
    }
    const lang = rl()
    for (const k of Object.keys(lang)) {
      if (k.startsWith(`item.${MODID}.${id}`) || k.startsWith(`tooltip.${MODID}.${id}`)) delete lang[k]
    }
    wl(sortLang(lang))
    const modelFile = jp(JAVA_ROOT,'datagen','ModItemModelProvider.java')
    const modelLines = rf(modelFile).split('\n')
    const cleanedModel = []
    let skipNext = false
    for (let i = 0; i < modelLines.length; i++) {
      const l = modelLines[i]
      if (l.includes(`ModItems.${constName}`) || l.includes(`"${id}"`)) { skipNext = true; continue }
      if (skipNext) { if (l.trim().startsWith('.') || l.trim() === ';') continue; skipNext = false }
      cleanedModel.push(l)
    }
    wf(modelFile, cleanedModel.join('\n'))
    removeLines(jp(JAVA_ROOT,'datagen','ModItemTagProvider.java'), l => l.includes(`ModItems.${constName}.get()`))
    deleteRecipeFromProvider(constName)
    const tabs = readTabsJson()
    delete tabs[id]
    writeTabsJson(tabs)
    try { removeLines(jp(JAVA_ROOT,'item','ModCreativeTabEvents.java'), l => l.includes(`ModItems.${constName}`)) } catch {}
    const fpFile = jp(JAVA_ROOT, 'item', 'ModFoodProperties.java')
    if (fs.existsSync(fpFile)) {
      try { removeLines(fpFile, l => l.includes(`public static final FoodProperties ${constName} =`)) } catch {}
    }
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
    const marker = '\n        //YCS_Mod_Item_Model_END'
    if (!src.includes(marker)) return res.json({ ok:false, reason:'YCS_Mod_Item_Model_END marker not found' })
    const indented = line.split('\n').map(l => '        ' + l.trim()).join('\n')
    wf(file, src.replace(marker, '\n' + indented + '\n        //YCS_Mod_Item_Model_END'))
    markDirty()
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

// ─── Custom Item Class ─────────────────────────────────────────────────────────
// Creates/deletes/reads custom item class files under item/custom/

app.post('/api/items/custom-class', (req, res) => {
  try {
    const { className } = req.body
    const dir = jp(JAVA_ROOT,'item','custom')
    const file = jp(dir, `${className}.java`)
    const PKG2 = 'net.ye6isu.yebisuRPG'
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true })
    if (fs.existsSync(file)) return res.json({ ok:true, existed:true })
    const content = `package ${PKG2}.item.custom;\n\nimport net.minecraft.world.item.Item;\nimport net.minecraft.world.item.ItemStack;\n\npublic class ${className} extends Item {\n    public ${className}(Properties properties) {\n        super(properties);\n    }\n}\n`
    wf(file, content)
    res.json({ ok:true, existed:false })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

app.post('/api/items/custom-class/delete', (req, res) => {
  try {
    const { className } = req.body
    const file = jp(JAVA_ROOT,'item','custom', `${className}.java`)
    if (fs.existsSync(file)) fs.unlinkSync(file)
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

app.post('/api/items/custom-class/read', (req, res) => {
  try {
    const { className } = req.body
    const file = jp(JAVA_ROOT,'item','custom', `${className}.java`)
    if (!fs.existsSync(file)) return res.json({ ok:false, reason:'not found' })
    res.json({ ok:true, code: rf(file) })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

app.get('/api/items/custom-class/list', (req, res) => {
  try {
    const dir = jp(JAVA_ROOT,'item','custom')
    if (!fs.existsSync(dir)) return res.json({ ok:true, classes:[] })
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.java')).map(f => f.replace('.java',''))
    res.json({ ok:true, classes:files })
  } catch(e) { res.json({ ok:false, reason:e.message, classes:[] }) }
})

app.post('/api/items/custom-class/write', (req, res) => {
  try {
    const { className, code } = req.body
    if (!className || typeof code !== 'string') return res.json({ ok:false, reason:'missing className or code' })
    const file = jp(JAVA_ROOT,'item','custom', `${className}.java`)
    if (!fs.existsSync(file)) return res.json({ ok:false, reason:'file not found — create it first' })
    wf(file, code)
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

// ─── Creative tab — JSON-based via ycs_tabs.json ──────────────────────────────
const TABS_JSON = 'D:/Projects/Mods/yebisu-RPG/src/main/resources/assets/yebisurpg/ycs_tabs.json'

const TAB_VALUE_TO_KEY = {
  'ModCreativeModeTabs.YEBISURPG_ITEMS_TAB': 'yebisurpg_items_tab',
  'ModCreativeModeTabs.YEBISURPG_BLOCK_TAB': 'yebisurpg_blocks_tab',
  'vanilla:combat':              'combat',
  'vanilla:tools_and_utilities': 'tools_and_utilities',
  'vanilla:food_and_drinks':     'food_and_drinks',
  'vanilla:ingredients':         'ingredients',
  'vanilla:building_blocks':     'building_blocks',
  'vanilla:redstone':            'redstone_blocks',
  'vanilla:natural_blocks':      'natural_blocks',
}
const TAB_KEY_TO_VALUE = Object.fromEntries(Object.entries(TAB_VALUE_TO_KEY).map(([k,v])=>[v,k]))

function readTabsJson() { try { return JSON.parse(rf(TABS_JSON)) } catch { return {} } }
function writeTabsJson(obj) {
  const entries = Object.entries(obj).sort((a,b) => a[1]!==b[1]?a[1].localeCompare(b[1]):a[0].localeCompare(b[0]))
  let out = "{\n", lastTab = null
  for (let i = 0; i < entries.length; i++) {
    const [k, v] = entries[i]
    if (lastTab !== null && lastTab !== v) out += "\n"
    lastTab = v
    out += `  "${k}": "${v}"${i===entries.length-1?"":","}\n`
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
    if (blockId) { entryKey = `block:${blockId}` }
    else if (itemId) { entryKey = itemId }
    else if (ref.startsWith('ModBlocks.')) {
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
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
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
    if (entryKey) { const tabs = readTabsJson(); delete tabs[entryKey]; writeTabsJson(tabs) }
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

// ─── Tags ──────────────────────────────────────────────────────────────────────
// Markers: //YCS_Mod_Item_Tags_START / //YCS_Mod_Item_Tags_END in ModItemTagProvider.java
//          //YCS_Mod_Block_Tags_START / //YCS_Mod_Block_Tags_END in ModBlockTagProvider.java

app.post('/api/tags/set', (req, res) => {
  try {
    const { id, constName, tags, isBlock=false } = req.body
    if (!tags || !tags.length) return res.json({ ok:true, skipped:true })
    const file = isBlock ? jp(JAVA_ROOT,'datagen','ModBlockTagProvider.java') : jp(JAVA_ROOT,'datagen','ModItemTagProvider.java')
    let src = rf(file)
    const marker = isBlock ? '//YCS_Mod_Block_Tags_END' : '//YCS_Mod_Item_Tags_END'
    if (!src.includes(marker)) return res.json({ ok:false, reason:`${marker} not found in file` })
    const ref = isBlock ? `ModBlocks.${constName}.get()` : `ModItems.${constName}.get()`
    let modifiedSrc = src
    const escapedRef = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const removeRegex = new RegExp(`\\s*\\.add\\(\\s*${escapedRef}\\s*\\)`, 'g')
    modifiedSrc = modifiedSrc.replace(removeRegex, '')
    const emptyTagRegex = /[ \t]*(?:this\.)?tag\([\s\S]*?\)\s*;/g
    modifiedSrc = modifiedSrc.replace(emptyTagRegex, match => match.includes('.add(') ? match : '')
    const lines = []
    let addedCount = 0
    for (const tag of tags) {
      const [ns, path] = tag.includes(':') ? tag.split(':') : [MODID, tag]
      const tagConst = resolveTagConst(ns, path, isBlock)
      const tagStartIdx = modifiedSrc.indexOf(`tag(${tagConst})`)
      if (tagStartIdx !== -1) {
        const semiIdx = modifiedSrc.indexOf(';', tagStartIdx)
        if (semiIdx !== -1) {
          const statement = modifiedSrc.substring(tagStartIdx, semiIdx)
          if (!statement.includes(`.add(${ref})`)) {
            modifiedSrc = modifiedSrc.substring(0, semiIdx) + `\n                .add(${ref})` + modifiedSrc.substring(semiIdx)
            addedCount++
          }
        }
      } else {
        lines.push(`        tag(${tagConst})\n                .add(${ref});`)
        addedCount++
      }
    }
    if (lines.length) {
      const regex = new RegExp(`[ \\t]*${marker}`)
      modifiedSrc = modifiedSrc.replace(regex, '\n' + lines.join('\n\n') + '\n        ' + marker)
    }
    modifiedSrc = modifiedSrc.replace(/\n([ \t]*\n)+/g, '\n\n')
    if (modifiedSrc !== src) { wf(file, modifiedSrc); markDirty() }
    res.json({ ok:true, added:addedCount })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

function resolveTagConst(ns, path, isBlock) {
  const itemTagMap = {
    'minecraft:axes':'ItemTags.AXES','minecraft:hoes':'ItemTags.HOES','minecraft:pickaxes':'ItemTags.PICKAXES',
    'minecraft:shovels':'ItemTags.SHOVELS','minecraft:swords':'ItemTags.SWORDS','minecraft:tools':'ItemTags.TOOLS',
    'minecraft:logs':'ItemTags.LOGS','minecraft:planks':'ItemTags.PLANKS','minecraft:slabs':'ItemTags.SLABS',
    'minecraft:stairs':'ItemTags.STAIRS','minecraft:doors':'ItemTags.DOORS','minecraft:flowers':'ItemTags.FLOWERS',
  }
  const blockTagMap = {
    'minecraft:mineable/pickaxe':'BlockTags.MINEABLE_WITH_PICKAXE','minecraft:mineable/axe':'BlockTags.MINEABLE_WITH_AXE',
    'minecraft:mineable/shovel':'BlockTags.MINEABLE_WITH_SHOVEL','minecraft:mineable/hoe':'BlockTags.MINEABLE_WITH_HOE',
    'minecraft:needs_stone_tool':'BlockTags.NEEDS_STONE_TOOL','minecraft:needs_iron_tool':'BlockTags.NEEDS_IRON_TOOL',
    'minecraft:needs_diamond_tool':'BlockTags.NEEDS_DIAMOND_TOOL','minecraft:logs':'BlockTags.LOGS',
    'minecraft:planks':'BlockTags.PLANKS','minecraft:slabs':'BlockTags.SLABS','minecraft:stairs':'BlockTags.STAIRS',
    'minecraft:fences':'BlockTags.FENCES','minecraft:fence_gates':'BlockTags.FENCE_GATES','minecraft:walls':'BlockTags.WALLS',
    'minecraft:buttons':'BlockTags.BUTTONS','minecraft:pressure_plates':'BlockTags.PRESSURE_PLATES',
    'minecraft:doors':'BlockTags.DOORS','minecraft:trapdoors':'BlockTags.TRAPDOORS',
  }
  const key = `${ns}:${path}`
  const map = isBlock ? blockTagMap : itemTagMap
  if (map[key]) return map[key]
  return `TagKey.create(${isBlock?'Registries.BLOCK':'Registries.ITEM'}, ResourceLocation.fromNamespaceAndPath("${ns}", "${path}"))`
}

app.post('/api/tags/delete', (req, res) => {
  try {
    const { constName, isBlock=false } = req.body
    const file = isBlock ? jp(JAVA_ROOT,'datagen','ModBlockTagProvider.java') : jp(JAVA_ROOT,'datagen','ModItemTagProvider.java')
    const ref = isBlock ? `ModBlocks.${constName}.get()` : `ModItems.${constName}.get()`
    if (fs.existsSync(file)) {
      let src = rf(file)
      const escapedRef = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`\\s*\\.add\\(\\s*${escapedRef}\\s*\\)`, 'g')
      let modified = src.replace(regex, '')
      const emptyTagRegex = /[ \t]*(?:this\.)?tag\([\s\S]*?\)\s*;/g
      modified = modified.replace(emptyTagRegex, match => match.includes('.add(') ? match : '')
      modified = modified.replace(/\n([ \t]*\n)+/g, '\n\n')
      if (modified !== src) { wf(file, modified); markDirty() }
    }
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

// ─── Recipes ───────────────────────────────────────────────────────────────────
// Markers: //YCS_Mod_Recipe_Provider_START and //YCS_Mod_Recipe_Provider_END in ModRecipeProvider.java

app.post('/api/recipes/set', (req, res) => {
  try {
    const { id, constName, recipeCode } = req.body
    if (!recipeCode) return res.json({ ok:true, skipped:true })
    deleteRecipeFromProvider(constName)
    const file = jp(JAVA_ROOT,'datagen','ModRecipeProvider.java')
    let src = rf(file)
    const startMarker = '        //YCS_Mod_Recipe_Provider_START'
    const endMarker   = '        //YCS_Mod_Recipe_Provider_END'
    if (!src.includes(startMarker) || !src.includes(endMarker)) return res.json({ ok:false, reason:'YCS_Mod_Recipe_Provider markers not found' })
    const lines = recipeCode.split('\n').map(l => '        ' + l).join('\n')
    const insertPos = src.indexOf(endMarker)
    let newSrc = src.slice(0, insertPos) + lines + '\n\n' + src.slice(insertPos)
    wf(file, formatYCSSection(newSrc, '//YCS_Mod_Recipe_Provider_START', '//YCS_Mod_Recipe_Provider_END'))
    markDirty()
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

function hasExactBlock(line, constName) {
  const target = `ModBlocks.${constName}`;
  let idx = line.indexOf(target);
  while (idx !== -1) {
    const after = line[idx + target.length];
    if (!after || !/^[A-Z0-9]$/i.test(after)) return true;
    idx = line.indexOf(target, idx + target.length);
  }
  return false;
}

function cleanBuilderPatternProvider(file, constName, id) {
  if (!fs.existsSync(file)) return
  let src = rf(file)
  const lines = src.split('\n')
  const out = []
  let skip = false
  for (const l of lines) {
    if (hasExactBlock(l, constName) || l.includes(`"${id}"`) || l.includes(`${id}Model`)) { skip = true; continue }
    if (skip) { if (l.trim().startsWith('.') || l.trim() === ';' || l.includes(`${id}Model`)) continue; skip = false }
    out.push(l)
  }
  wf(file, out.join('\n').replace(/\n\s*\n\s*\n/g, '\n\n'))
}

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
        while(out.length && out[out.length-1].trim().length > 0 && !out[out.length-1].includes('save(') && !out[out.length-1].includes('YCS')) out.pop()
        continue
      }
      if (skip) { if (lines[i].includes('.save(')) skip = false; continue }
      out.push(lines[i])
    }
    let newSrc = out.join('\n')
    wf(file, formatYCSSection(newSrc, '//YCS_Mod_Recipe_Provider_START', '//YCS_Mod_Recipe_Provider_END'))
  } catch(e) {}
}

app.post('/api/recipes/delete', (req, res) => {
  try { deleteRecipeFromProvider(req.body.constName); res.json({ ok:true }) }
  catch(e) { res.json({ ok:false, reason:e.message }) }
})

// ─── Blocks ────────────────────────────────────────────────────────────────────
// Markers: //YCS_Mod_Blocks_START / //YCS_Mod_Blocks_END in ModBlocks.java
//          //YCS_Mod_Block_State_START / //YCS_Mod_Block_State_END in ModBlockStateProvider.java
//          //YCS_Mod_Block_Loot_START / //YCS_Mod_Block_Loot_END in ModBlockLootTableProvider.java
//          //YCS_Mod_Item_Model_START / //YCS_Mod_Item_Model_END in ModItemModelProvider.java

app.post('/api/blocks/register', (req, res) => {
  try {
    const { entries, creativeTab } = req.body
    const blockFile = jp(JAVA_ROOT,'block','ModBlocks.java')
    const bspFile   = jp(JAVA_ROOT,'datagen','ModBlockStateProvider.java')
    const lootFile  = jp(JAVA_ROOT,'datagen','ModBlockLootTableProvider.java')
    const modelFile = jp(JAVA_ROOT,'datagen','ModItemModelProvider.java')
    const lang = rl()
    const results = []
    const bmarker    = '//YCS_Mod_Blocks_END'
    const bspMarker  = '\n        //YCS_Mod_Block_State_END'
    const lootMarker = '\n        //YCS_Mod_Block_Loot_END'
    const modelMarker = '\n        //YCS_Mod_Item_Model_END'
    const tabs = readTabsJson()

    for (const entry of entries) {
      const { line, constName:eCN, bspLines, lootLine, modelLine, langKey, langVal, blockId } = entry
      if (!line) { results.push({constName:eCN, ok:false, reason:'empty line'}); continue }
      let bsrc = rf(blockFile)
      if (bsrc.includes(eCN+' =')) { results.push({constName:eCN, ok:false, reason:'already exists'}); continue }
      if (!bsrc.includes(bmarker)) { results.push({constName:eCN, ok:false, reason:'insertion point not found'}); continue }

      const bindented = line.split('\n').map((l,i) => i===0?'    '+l:'            '+l).join('\n')
      wf(blockFile, rf(blockFile).replace(bmarker, '\n'+bindented+'\n'+bmarker))

      if (bspLines) { const bsp = rf(bspFile); if (bsp.includes(bspMarker)) wf(bspFile, bsp.replace(bspMarker, '\n        '+bspLines+'\n'+bspMarker)) }
      if (lootLine) { const loot = rf(lootFile); if (loot.includes(lootMarker)) wf(lootFile, loot.replace(lootMarker, '\n        '+lootLine+'\n'+lootMarker)) }

      if (modelLine && !modelLine.startsWith('/*')) {
        let msrc = rf(modelFile)
        const firstLine = modelLine.split('\n')[0].trim()
        if (msrc.includes(modelMarker) && !msrc.includes(firstLine)) {
          const indented = modelLine.split('\n').map(l => '        ' + l.trim()).join('\n')
          wf(modelFile, msrc.replace(modelMarker, '\n' + indented + '\n        //YCS_Mod_Item_Model_END'))
        }
      }

      if (langKey && langVal) { const r = insertLangGrouped(lang, langKey, langVal); if (!r.exists) Object.assign(lang, r.result) }
      if (creativeTab && blockId) { const tabKey = TAB_VALUE_TO_KEY[creativeTab]; if (tabKey) tabs[`block:${blockId}`] = tabKey }
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
    const { oldConstName, oldId, entries, newConstName, newId, langKey, langVal, creativeTab } = req.body
    const blockFile = jp(JAVA_ROOT,'block','ModBlocks.java')
    const bspFile   = jp(JAVA_ROOT,'datagen','ModBlockStateProvider.java')
    const lootFile  = jp(JAVA_ROOT,'datagen','ModBlockLootTableProvider.java')
    const modelFile = jp(JAVA_ROOT,'datagen','ModItemModelProvider.java')

    let src = rf(blockFile)
    const startIdx = src.indexOf(`registerBlock("${oldId}"`)
    if (startIdx !== -1) {
      const fieldStart = src.lastIndexOf('\n    public static final ', startIdx)
      let depth=0, end=-1
      for (let i=startIdx; i<src.length; i++) {
        if(src[i]==='('||src[i]==='{') depth++
        else if(src[i]===')'||src[i]==='}') { depth--; if(depth===0){const semi=src.indexOf(';',i);if(semi!==-1){end=semi+1;break}} }
      }
      if (fieldStart!==-1&&end!==-1) wf(blockFile, src.slice(0,fieldStart)+src.slice(end))
    }
    try { removeLines(blockFile, l => l.includes(`public static final DeferredBlock<`) && l.includes(` ${oldConstName}_`)) } catch {}

    for (const f of [lootFile, jp(JAVA_ROOT,'item','ModCreativeModeTabs.java')]) { try { removeLines(f, l => hasExactBlock(l, oldConstName)) } catch {} }
    try { removeLines(jp(JAVA_ROOT,'datagen','ModBlockTagProvider.java'), l => l.includes(`ModBlocks.${oldConstName}.get()`)) } catch {}
    try { removeLines(jp(JAVA_ROOT,'datagen','ModItemTagProvider.java'), l => hasExactBlock(l, oldConstName)) } catch {}
    cleanBuilderPatternProvider(modelFile, oldConstName, oldId)
    cleanBuilderPatternProvider(bspFile, oldConstName, oldId)

    const lang=rl()
    if (oldId!==newId) {
      for (const k of Object.keys(lang)) {
        if (k === `block.${MODID}.${oldId}` || k.startsWith(`block.${MODID}.${oldId}_`) || k.startsWith(`tooltip.${MODID}.${oldId}.`)) delete lang[k]
      }
    }

    const bmarker    = '//YCS_Mod_Blocks_END'
    const bspMarker  = '\n        //YCS_Mod_Block_State_END'
    const lootMarker = '\n        //YCS_Mod_Block_Loot_END'
    const modelMarker = '\n        //YCS_Mod_Item_Model_END'
    const tabs = readTabsJson()

    for (const entry of entries) {
      const { line, constName:eCN, bspLines, lootLine, modelLine, langKey:eLangKey, langVal:eLangVal, blockId } = entry
      if (!line) continue
      let bsrc2 = rf(blockFile)
      if (!bsrc2.includes(eCN+' =') && bsrc2.includes(bmarker)) {
        const bindented = line.split('\n').map((l,i) => i===0?'    '+l:'            '+l).join('\n')
        wf(blockFile, rf(blockFile).replace(bmarker, '\n'+bindented+'\n'+bmarker))
      }
      if (bspLines) { const bsp = rf(bspFile); if (bsp.includes(bspMarker)) wf(bspFile, bsp.replace(bspMarker, '\n        '+bspLines+'\n'+bspMarker)) }
      if (lootLine) { const lp = rf(lootFile); if (lp.includes(lootMarker)) wf(lootFile, lp.replace(lootMarker, '\n        '+lootLine+'\n'+lootMarker)) }
      if (modelLine) { const mp = rf(modelFile); if (mp.includes(modelMarker)) wf(modelFile, mp.replace(modelMarker, '\n        '+modelLine+'\n'+modelMarker)) }
      if (eLangKey && eLangVal) { const r = insertLangGrouped(lang, eLangKey, eLangVal); if (!r.exists) Object.assign(lang, r.result) }
      if (creativeTab && blockId) { const tabKey = TAB_VALUE_TO_KEY[creativeTab]; if (tabKey) tabs[`block:${blockId}`] = tabKey }
    }
    wl(sortLang(lang))

    if (oldId && oldId !== newId) {
      if (tabs[`block:${oldId}`]) { tabs[`block:${newId}`] = tabs[`block:${oldId}`]; delete tabs[`block:${oldId}`] }
      writeTabsJson(tabs)
      if (oldConstName) deleteRecipeFromProvider(oldConstName)
      const tryDel = f => { try { if (fs.existsSync(f)) { fs.unlinkSync(f); triggerIdeaReload(f); } } catch {} }
      const btp = (n) => path.join(MOD_ROOT,'assets',MODID,'textures','block',n)
      const itp = (n) => path.join(MOD_ROOT,'assets',MODID,'textures','item',n)
      ;[btp(`${oldId}.png`),btp(`${oldId}_top.png`),btp(`${oldId}_bottom.png`),btp(`${oldId}_side.png`),
        btp(`${oldId}_front.png`),btp(`${oldId}_back.png`),btp(`${oldId}_left.png`),btp(`${oldId}_right.png`),
        btp(`${oldId}_door_top.png`),btp(`${oldId}_door_bottom.png`),itp(`${oldId}_door.png`),btp(`${oldId}_trapdoor.png`)
      ].forEach(tryDel)
    } else { writeTabsJson(tabs) }

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
    try { removeLines(blockFile, l => l.includes(`public static final DeferredBlock<`) && l.includes(` ${constName}_`)) } catch {}
    const lang=rl()
    for (const k of Object.keys(lang)) {
      if (k === `block.${MODID}.${id}` || k.startsWith(`block.${MODID}.${id}_`) || k.startsWith(`tooltip.${MODID}.${id}.`)) delete lang[k]
    }
    wl(sortLang(lang))
    const modelFile = jp(JAVA_ROOT,'datagen','ModItemModelProvider.java')
    const bspFile = jp(JAVA_ROOT,'datagen','ModBlockStateProvider.java')
    cleanBuilderPatternProvider(modelFile, constName, id)
    cleanBuilderPatternProvider(bspFile, constName, id)
    for (const f of [jp(JAVA_ROOT,'datagen','ModBlockLootTableProvider.java'),jp(JAVA_ROOT,'item','ModCreativeModeTabs.java')]) {
      try { removeLines(f, l => hasExactBlock(l, constName)) } catch {}
    }
    try { removeLines(jp(JAVA_ROOT,'datagen','ModBlockTagProvider.java'), l => l.includes(`ModBlocks.${constName}.get()`)) } catch {}
    deleteRecipeFromProvider(constName)
    try { removeLines(jp(JAVA_ROOT,'datagen','ModItemTagProvider.java'), l => hasExactBlock(l, constName)) } catch {}
    const tryDel = f => { try { if (fs.existsSync(f)) { fs.unlinkSync(f); triggerIdeaReload(f); } } catch {} }
    const btp = (n) => jp(MOD_ROOT,'assets',MODID,'textures','block',n)
    const itp = (n) => jp(MOD_ROOT,'assets',MODID,'textures','item',n)
    ;[btp(`${id}.png`),btp(`${id}_top.png`),btp(`${id}_bottom.png`),btp(`${id}_side.png`),
      btp(`${id}_front.png`),btp(`${id}_back.png`),btp(`${id}_left.png`),btp(`${id}_right.png`),
      btp(`${id}_door_top.png`),btp(`${id}_door_bottom.png`),itp(`${id}_door.png`),btp(`${id}_trapdoor.png`)
    ].forEach(tryDel)
    const tabs2 = readTabsJson(); delete tabs2[`block:${id}`]; writeTabsJson(tabs2)
    markDirty()
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

app.listen(3001, () => {
  console.log('ycs backend :3001  mod:', MOD_ROOT)
  autoWriteMissingModelJsons()
})

// ─── Auto-write missing model JSONs ────────────────────────────────────────────
const GEN_ROOT = 'D:/Projects/Mods/yebisu-RPG/src/generated/resources'

function writeModelJson(id, isHandheld=false) {
  const modelDir = jp(GEN_ROOT,'assets',MODID,'models','item')
  const modelPath = jp(modelDir,`${id}.json`)
  if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir, { recursive:true })
  if (fs.existsSync(modelPath)) return
  const parent = isHandheld ? 'minecraft:item/handheld' : 'minecraft:item/generated'
  fs.writeFileSync(modelPath, JSON.stringify({ parent, textures: { layer0: `${MODID}:item/${id}` } }, null, 2))
}

function writeBlockStateJson(id) {
  const bsDir = jp(GEN_ROOT,'assets',MODID,'blockstates')
  const bsPath = jp(bsDir,`${id}.json`)
  if (!fs.existsSync(bsDir)) fs.mkdirSync(bsDir, { recursive:true })
  if (fs.existsSync(bsPath)) return
  fs.writeFileSync(bsPath, JSON.stringify({ variants: { "": { model: `${MODID}:block/${id}` } } }, null, 2))
}

function writeBlockModelJsons(id) {
  const blockModelDir = jp(GEN_ROOT,'assets',MODID,'models','block')
  const itemModelDir  = jp(GEN_ROOT,'assets',MODID,'models','item')
  if (!fs.existsSync(blockModelDir)) fs.mkdirSync(blockModelDir, { recursive:true })
  if (!fs.existsSync(itemModelDir))  fs.mkdirSync(itemModelDir,  { recursive:true })
  const blockModel = jp(blockModelDir,`${id}.json`)
  const itemModel  = jp(itemModelDir,`${id}.json`)
  if (!fs.existsSync(blockModel)) fs.writeFileSync(blockModel, JSON.stringify({ parent: 'minecraft:block/cube_all', textures: { all: `${MODID}:block/${id}` } }, null, 2))
  if (!fs.existsSync(itemModel))  fs.writeFileSync(itemModel,  JSON.stringify({ parent: `${MODID}:block/${id}` }, null, 2))
}

function autoWriteMissingModelJsons() {
  try {
    const itemTexDir = jp(MOD_ROOT,'assets',MODID,'textures','item')
    const modelProvSrc = fs.existsSync(jp(JAVA_ROOT,'datagen','ModItemModelProvider.java')) ? rf(jp(JAVA_ROOT,'datagen','ModItemModelProvider.java')) : ''
    if (fs.existsSync(itemTexDir)) {
      for (const f of fs.readdirSync(itemTexDir)) {
        if (!f.endsWith('.png')) continue
        const id = f.replace('.png','')
        const isHandheld = modelProvSrc.includes(`handheldItem(ModItems.${id.toUpperCase()})`) || modelProvSrc.includes(`handheldItem(ModItems.${id.toUpperCase()};`)
        writeModelJson(id, isHandheld)
      }
    }
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
  } catch(e) { console.error('[ycs] autoWriteMissingModelJsons error:', e.message) }
}

app.post('/api/models/sync', (_req, res) => {
  try { autoWriteMissingModelJsons(); res.json({ ok:true }) }
  catch(e) { res.json({ ok:false, reason:e.message }) }
})
