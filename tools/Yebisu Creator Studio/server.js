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
  ['//YCS_Mod_Item_Model_START', '//YCS_Mod_Item_Model_END'],
  ['//YCS_Mod_Creative_Tabs_START', '//YCS_Mod_Creative_Tabs_END'],
  ['//YCS_Mod_Keybinds_START', '//YCS_Mod_Keybinds_END'],
  ['//YCS_Mod_Keybinds_Register_START', '//YCS_Mod_Keybinds_Register_END']
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
      const creativeTab = tabKeyToValueMap()[tabKey] || ''
      items.push({ id, constName, displayName:lang[`item.${MODID}.${id}`]||id, itemType, customItemClass, toolType, tier, damage, speed, burnTime, hasTexture, textureDataUrl, creativeTab, source:'mod' })
    }
    res.json({ ok:true, items })
  } catch(e) { res.json({ ok:false, reason:e.message, items:[] }) }
})

// ─── Vanilla item registry (for item pickers) ──────────────────────────────────
// Generated once via RunData -> YCSVanillaItemDumpProvider (see that class for why
// this is a static file rather than a live JVM query). Re-run RunData if the
// target Minecraft version changes and the vanilla item list needs updating.
const VANILLA_ITEMS_JSON = jp(MOD_ROOT, 'assets', MODID, 'ycs', 'ycs_vanilla_items.json')
app.get('/api/items/vanilla', (_req, res) => {
  try {
    const ids = JSON.parse(rf(VANILLA_ITEMS_JSON))
    const items = ids.map(rl_id => {
      const path = rl_id.split(':')[1] || rl_id
      const displayName = path.split('_').map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ')
      return { id: rl_id, displayName, source: 'vanilla' }
    })
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
      const creativeTab = tabKeyToValueMap()[tabKey] || ''
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

      // Step 1: Remove ALL existing YCS-managed lines for this item inside the YCS model block
      // This covers basicItem, handheldItem, existingFileHelper.trackGenerated, getBuilder — everything
      const ycsStart = msrc.indexOf('//YCS_Mod_Item_Model_START')
      const ycsEnd   = msrc.indexOf('//YCS_Mod_Item_Model_END')
      if (ycsStart !== -1 && ycsEnd !== -1) {
        const before  = msrc.slice(0, ycsStart + '//YCS_Mod_Item_Model_START'.length)
        const section = msrc.slice(ycsStart + '//YCS_Mod_Item_Model_START'.length, ycsEnd)
        const after   = msrc.slice(ycsEnd)
        // Remove any line that references ModItems.CN or ModItems.oldCN
        const cleanedSection = section.split('\n').filter(l => {
          if (l.includes(`ModItems.${CN}`) || l.includes(`ModItems.${oldCN}`)) return false
          // Also remove getBuilder lines that reference the item id
          if (l.includes(`"item/${newId}"`) || l.includes(`"item/${oldId}"`)) return false
          if (l.includes(`"${newId}"`     ) || l.includes(`"${oldId}"`     )) {
            // Only remove if it's a model/texture line (contains getBuilder or trackGenerated)
            if (l.includes('getBuilder') || l.includes('trackGenerated')) return false
          }
          return true
        }).join('\n')
        msrc = before + cleanedSection + after
      }
      msrc = msrc.replace(/\n{3,}/g, '\n\n')

      // Step 2: Insert the new model line
      const modelMarker = '\n        //YCS_Mod_Item_Model_END'
      if (msrc.includes(modelMarker)) {
        const indentedModel = newModelLine.split('\n').map(l => '        ' + l.trim()).join('\n')
        wf(modelFile, msrc.replace(modelMarker, '\n' + indentedModel + '\n        //YCS_Mod_Item_Model_END'))
      } else {
        wf(modelFile, msrc)
      }
    }
    if (oldId && oldId !== newId) {
      const tabs = readTabsJson()
      if (tabs[oldId]) { tabs[newId] = tabs[oldId]; delete tabs[oldId]; writeTabsJson(tabs) }
      if (oldConstName) deleteRecipeFromProvider(oldConstName)
      try {
        const tPath = path.join(MOD_ROOT,'assets',MODID,'textures','item',`${oldId}.png`)
        if (fs.existsSync(tPath)) { fs.unlinkSync(tPath); triggerIdeaReload(tPath); }
        const mPath = tPath + '.mcmeta'
        if (fs.existsSync(mPath)) { fs.unlinkSync(mPath); triggerIdeaReload(mPath); }
      } catch {}
    } else {
      // Same id — check if animated→static or static→animated: clean up stale mcmeta or irrelevant files
      try {
        const texBase = path.join(MOD_ROOT,'assets',MODID,'textures','item',`${newId}.png`)
        const mcmeta  = texBase + '.mcmeta'
        const isNowAnimated = (req.body.isAnimated === true || req.body.isAnimated === 'true')
        if (!isNowAnimated && fs.existsSync(mcmeta)) {
          fs.unlinkSync(mcmeta); triggerIdeaReload(mcmeta)
        }
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
    const { line, constName, id } = req.body
    const file = jp(JAVA_ROOT,'datagen','ModItemModelProvider.java')
    let src = rf(file)

    // Remove any existing YCS-managed lines for this item inside the YCS block before inserting
    const ycsStart = src.indexOf('//YCS_Mod_Item_Model_START')
    const ycsEnd   = src.indexOf('//YCS_Mod_Item_Model_END')
    if (ycsStart !== -1 && ycsEnd !== -1 && (constName || id)) {
      const before  = src.slice(0, ycsStart + '//YCS_Mod_Item_Model_START'.length)
      const section = src.slice(ycsStart + '//YCS_Mod_Item_Model_START'.length, ycsEnd)
      const after   = src.slice(ycsEnd)
      const cleaned = section.split('\n').filter(l => {
        if (constName && l.includes(`ModItems.${constName}`)) return false
        if (id && (l.includes(`"item/${id}"`) || (l.includes(`"${id}"`) && (l.includes('getBuilder') || l.includes('trackGenerated'))))) return false
        return true
      }).join('\n')
      src = before + cleaned + after
      src = src.replace(/\n{3,}/g, '\n\n')
    }

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
const TABS_JSON = 'D:/Projects/Mods/yebisu-RPG/src/main/resources/assets/yebisurpg/ycs/ycs_tabs.json'

const STATIC_TAB_VALUE_TO_KEY = {
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
// Custom tabs (added via the Creative Tabs editor) extend the static map dynamically.
function tabValueToKeyMap() {
  const map = { ...STATIC_TAB_VALUE_TO_KEY }
  for (const t of readCustomTabs()) map[`ModCreativeModeTabs.${t.key.toUpperCase()}`] = t.key
  return map
}
function tabKeyToValueMap() {
  return Object.fromEntries(Object.entries(tabValueToKeyMap()).map(([k,v])=>[v,k]))
}

function readTabsJson() { try { return JSON.parse(rf(TABS_JSON)) } catch { return {} } }
function writeTabsJson(obj) {
  // Group by tab, preserving insertion order within each tab and the order
  // tabs were first seen — new items append at the bottom of their tab's
  // group instead of being re-sorted alphabetically.
  const order = []
  const groups = new Map()
  for (const entry of Object.entries(obj)) {
    const [, v] = entry
    if (!groups.has(v)) { groups.set(v, []); order.push(v) }
    groups.get(v).push(entry)
  }
  const entries = order.flatMap(v => groups.get(v))
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
    const tabKey = tabValueToKeyMap()[tabConst]
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
    if (readCustomTabs().some(t => t.iconRef && t.iconRef.startsWith('cycle:'))) regenerateCustomTabsBlock()
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
    if (entryKey) { const tabs = readTabsJson(); delete tabs[entryKey]; writeTabsJson(tabs); if (readCustomTabs().some(t => t.iconRef && t.iconRef.startsWith('cycle:'))) regenerateCustomTabsBlock() }
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

// ─── Custom creative tabs (add / edit / delete / reorder) ──────────────────────
// Stored as an ordered list in CUSTOM_TABS_JSON; each tab is codegen'd into
// ModCreativeModeTabs.java between the YCS_Mod_Creative_Tabs markers, in list order
// (display order in-game follows withTabsBefore chaining built from this order).
const CUSTOM_TABS_JSON = 'D:/Projects/Mods/yebisu-RPG/src/main/resources/assets/yebisurpg/ycs/ycs_custom_tabs.json'
const CMT_FILE = jp(JAVA_ROOT,'item','ModCreativeModeTabs.java')

function readCustomTabs() { try { return JSON.parse(rf(CUSTOM_TABS_JSON)) } catch { return [] } }
function writeCustomTabs(list) { wf(CUSTOM_TABS_JSON, JSON.stringify(list, null, 2)) }

// iconRef: "item:<id>" or "block:<id>" (mod-registered only)
function iconRefToJava(iconRef) {
  if (!iconRef) return null
  const [kind, id] = iconRef.split(':')
  if (kind === 'block') {
    const bsrc = rf(jp(JAVA_ROOT,'block','ModBlocks.java'))
    const m = new RegExp(`(\\w+)\\s*=\\s*registerBlock\\("${id}"`).exec(bsrc)
    return m ? `new ItemStack(ModBlocks.${m[1]}.get())` : null
  }
  if (kind === 'item') {
    const isrc = rf(jp(JAVA_ROOT,'item','ModItems.java'))
    const m = new RegExp(`(\\w+)\\s*=\\s*ITEMS\\.register\\("${id}"`).exec(isrc)
    return m ? `new ItemStack(ModItems.${m[1]}.get())` : null
  }
  // legacy: no prefix, assume item
  const isrc = rf(jp(JAVA_ROOT,'item','ModItems.java'))
  const m = new RegExp(`(\\w+)\\s*=\\s*ITEMS\\.register\\("${iconRef}"`).exec(isrc)
  return m ? `new ItemStack(ModItems.${m[1]}.get())` : null
}

function tabItemStacks(tabKey) {
  const tabs = readTabsJson()
  const bsrc = rf(jp(JAVA_ROOT,'block','ModBlocks.java'))
  const isrc = rf(jp(JAVA_ROOT,'item','ModItems.java'))
  const stacks = []
  for (const [entryId, tk] of Object.entries(tabs)) {
    if (tk !== tabKey) continue
    if (entryId.startsWith('block:')) {
      const bid = entryId.slice(6)
      const m = new RegExp(`(\\w+)\\s*=\\s*registerBlock\\("${bid}"`).exec(bsrc)
      if (m) stacks.push(`new ItemStack(ModBlocks.${m[1]}.get())`)
    } else {
      const m = new RegExp(`(\\w+)\\s*=\\s*ITEMS\\.register\\("${entryId}"`).exec(isrc)
      if (m) stacks.push(`new ItemStack(ModItems.${m[1]}.get())`)
    }
  }
  return stacks
}

function regenerateCustomTabsBlock() {
  const list = readCustomTabs()
  const lines = []
  for (let i = 0; i < list.length; i++) {
    const t = list[i]
    let iconLambda
    if (t.iconRef && t.iconRef.startsWith('cycle:')) {
      const stacks = tabItemStacks(t.key)
      const first = stacks.length > 0 ? stacks[0] : 'new ItemStack(net.minecraft.world.item.Items.BARRIER)'
      iconLambda = `() -> ${first}`
    } else {
      const iconJava = iconRefToJava(t.iconRef) || 'new ItemStack(net.minecraft.world.item.Items.BARRIER)'
      iconLambda = `() -> ${iconJava}`
    }
    lines.push(`    public static final Supplier<CreativeModeTab> ${t.key.toUpperCase()} = CREATIVE_MODE_TAB_DEFERRED_REGISTER.register("${t.key}", () -> CreativeModeTab.builder()`)
    lines.push(`            .icon(${iconLambda})`)
    if (i > 0) lines.push(`            .withTabsBefore(ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID,"${list[i-1].key}"))`)
    lines.push(`            .title(Component.translatable("creativetab.${MODID}.${t.key}"))`)
    lines.push(`            .build());`)
    if (i < list.length-1) lines.push('')
  }
  let src = rf(CMT_FILE)
  const startMarker = '//YCS_Mod_Creative_Tabs_START', endMarker = '//YCS_Mod_Creative_Tabs_END'
  const sIdx = src.indexOf(startMarker), eIdx = src.indexOf(endMarker)
  if (sIdx === -1 || eIdx === -1) throw new Error('YCS_Mod_Creative_Tabs markers not found')
  src = src.slice(0, sIdx + startMarker.length) + '\n\n' + (lines.length ? lines.join('\n') + '\n\n    ' : '    ') + src.slice(eIdx)
  wf(CMT_FILE, formatYCSSection(src, startMarker, endMarker))
}

app.get('/api/creativetabs/list', (_req, res) => {
  try {
    const lang = rl()
    const list = readCustomTabs().map(t => ({ ...t, titleText: lang[`creativetab.${MODID}.${t.key}`] || t.key }))
    res.json({ ok:true, tabs:list })
  } catch(e) { res.json({ ok:false, reason:e.message, tabs:[] }) }
})

app.post('/api/creativetabs/save', (req, res) => {
  // Full rewrite: list of {key, titleText, iconRef} in display order. Covers
  // add (new key), edit (same key, changed titleText/iconRef), delete (omitted),
  // and reorder (list order) in one call.
  try {
    const { tabs } = req.body
    if (!Array.isArray(tabs)) return res.json({ ok:false, reason:'tabs must be an array' })
    for (const t of tabs) {
      if (!/^[a-z][a-z0-9_]*$/.test(t.key)) return res.json({ ok:false, reason:`invalid tab key: ${t.key}` })
    }
    const prev = readCustomTabs()
    const prevKeys = new Set(prev.map(t => t.key))
    const newKeys = new Set(tabs.map(t => t.key))

    writeCustomTabs(tabs.map(t => ({ key:t.key, iconRef:t.iconRef||'' })))
    regenerateCustomTabsBlock()

    const lang = rl()
    for (const t of tabs) lang[`creativetab.${MODID}.${t.key}`] = t.titleText || t.key
    for (const k of prevKeys) if (!newKeys.has(k)) delete lang[`creativetab.${MODID}.${k}`]
    wl(sortLang(lang))

    // Reassign items pointed at a deleted tab back to (none) so they aren't orphaned.
    const removedKeys = [...prevKeys].filter(k => !newKeys.has(k))
    if (removedKeys.length) {
      const itemTabs = readTabsJson()
      let changed = false
      for (const [entryId, tabKey] of Object.entries(itemTabs)) {
        if (removedKeys.includes(tabKey)) { delete itemTabs[entryId]; changed = true }
      }
      if (changed) writeTabsJson(itemTabs)
    }

    markDirty()
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

// Reorders the mod items/blocks within one tab. order = array of entry keys
// (item id, or "block:<id>") in the desired display order for that tab.
app.post('/api/creativetabs/reorder-items', (req, res) => {
  try {
    const { tabKey, order } = req.body
    if (!tabKey || !Array.isArray(order)) return res.json({ ok:false, reason:'tabKey and order required' })
    const tabs = readTabsJson()
    // Pull out entries for this tab, in the new order, then splice back in
    // place of where they previously sat relative to other tabs.
    const others = Object.entries(tabs).filter(([k,v]) => v !== tabKey)
    const reordered = order.filter(k => tabs[k] === tabKey).map(k => [k, tabKey])
    const merged = Object.fromEntries([...others, ...reordered])
    writeTabsJson(merged)
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

// ─── Keybinds (add / edit / delete / reorder) ───────────────────────────────────
// Stored as an ordered list in KEYBINDS_JSON; each bind is codegen'd as a
// `public static final KeyMapping NAME = bind("name", InputConstants.Type.X, code);` field
// inside //YCS_Mod_Keybinds_START..END, and an `event.register(NAME);` line inside
// //YCS_Mod_Keybinds_Register_START..END, both in ModKeybinds.java.
// What a keybind *does* is intentionally left unimplemented — only the
// declaration/registration/lang plumbing exists until the action design is decided.
//
// bindCode formats: "NONE" (no default — InputConstants.UNKNOWN), "KEY_<glfw name>"
// (keyboard, e.g. "KEY_K" -> GLFW.GLFW_KEY_K), "MOUSE_<n>" (mouse button, e.g.
// "MOUSE_0" -> GLFW.GLFW_MOUSE_BUTTON_0).
const KEYBINDS_JSON = 'D:/Projects/Mods/yebisu-RPG/src/main/resources/assets/yebisurpg/ycs/ycs_keybinds.json'
const KEYBINDS_FILE = jp(JAVA_ROOT,'client','ModKeybinds.java')

function readKeybinds() { try { return JSON.parse(rf(KEYBINDS_JSON)) } catch { return [] } }
function writeKeybinds(list) { wf(KEYBINDS_JSON, JSON.stringify(list, null, 2)) }

function bindCodeToJava(bindCode) {
  const parts = (bindCode || 'NONE').split('+')
  const base = parts[0]
  const modifier = parts.includes('CTRL') ? 'KeyModifier.CONTROL' : parts.includes('ALT') ? 'KeyModifier.ALT' : parts.includes('SHIFT') ? 'KeyModifier.SHIFT' : 'KeyModifier.NONE'
  if (base === 'NONE') return ['InputConstants.Type.KEYSYM', 'InputConstants.UNKNOWN.getValue()', modifier]
  if (base.startsWith('MOUSE_')) return ['InputConstants.Type.MOUSE', `GLFW.GLFW_MOUSE_BUTTON_${base.slice(6)}`, modifier]
  return ['InputConstants.Type.KEYSYM', `GLFW.GLFW_${base}`, modifier]
}

function regenerateKeybindsBlock() {
  const list = readKeybinds()
  const fieldLines = list.map(k => {
    const [type, code, modifier] = bindCodeToJava(k.bindCode || 'NONE')
    const category = (!k.category || k.category === 'CATEGORY') ? 'CATEGORY' : `"${k.category}"`
    return `    public static final KeyMapping ${k.key.toUpperCase()} = bind("${k.key}", ${type}, ${code}, ${modifier}, ${category});`
  })
  let src = rf(KEYBINDS_FILE)
  const fStart = '//YCS_Mod_Keybinds_START', fEnd = '//YCS_Mod_Keybinds_END'
  let sIdx = src.indexOf(fStart), eIdx = src.indexOf(fEnd)
  if (sIdx === -1 || eIdx === -1) throw new Error('YCS_Mod_Keybinds markers not found')
  src = src.slice(0, sIdx + fStart.length) + '\n\n' + (fieldLines.length ? fieldLines.join('\n') + '\n\n    ' : '    ') + src.slice(eIdx)

  const regLines = list.map(k => `        event.register(${k.key.toUpperCase()});`)
  const rStart = '//YCS_Mod_Keybinds_Register_START', rEnd = '//YCS_Mod_Keybinds_Register_END'
  sIdx = src.indexOf(rStart); eIdx = src.indexOf(rEnd)
  if (sIdx === -1 || eIdx === -1) throw new Error('YCS_Mod_Keybinds_Register markers not found')
  src = src.slice(0, sIdx + rStart.length) + '\n\n' + (regLines.length ? regLines.join('\n') + '\n\n        ' : '        ') + src.slice(eIdx)

  wf(KEYBINDS_FILE, src)
}

const VANILLA_KEY_CATEGORIES = ['key.categories.movement','key.categories.gameplay','key.categories.inventory','key.categories.creative','key.categories.multiplayer','key.categories.ui','key.categories.misc']

app.get('/api/keybinds/list', (_req, res) => {
  try {
    const lang = rl()
    const list = readKeybinds().map(k => ({ ...k, titleText: lang[`key.${MODID}.${k.key}`] || k.key, category: k.category || 'CATEGORY' }))
    const customCats = [...new Set(list.map(k => k.category).filter(c => c !== 'CATEGORY' && !VANILLA_KEY_CATEGORIES.includes(c)))]
    res.json({ ok:true, keybinds:list, categories:{ own:'CATEGORY', ownLabel:'yebisu RPG (this mod)', vanilla:VANILLA_KEY_CATEGORIES, custom:customCats } })
  } catch(e) { res.json({ ok:false, reason:e.message, keybinds:[] }) }
})

app.post('/api/keybinds/save', (req, res) => {
  // Full rewrite: list of {key, titleText, bindCode} in declaration order.
  // Covers add (new key), edit (changed titleText/bindCode), delete (omitted),
  // and reorder (list order) in one call.
  try {
    const { keybinds } = req.body
    if (!Array.isArray(keybinds)) return res.json({ ok:false, reason:'keybinds must be an array' })
    for (const k of keybinds) {
      if (!/^[a-z][a-z0-9_]*$/.test(k.key)) return res.json({ ok:false, reason:`invalid keybind key: ${k.key}` })
      if (!/^(NONE|(KEY_[A-Z0-9_]+|MOUSE_[0-9]+)(\+(CTRL|ALT|SHIFT))?)$/.test(k.bindCode || '')) return res.json({ ok:false, reason:`invalid bindCode for ${k.key}` })
      if (k.category && !/^(CATEGORY|key\.categories\.[a-z0-9_.]+)$/.test(k.category)) return res.json({ ok:false, reason:`invalid category for ${k.key}` })
    }
    const prev = readKeybinds()
    const prevKeys = new Set(prev.map(k => k.key))
    const newKeys = new Set(keybinds.map(k => k.key))

    writeKeybinds(keybinds.map(k => ({ key:k.key, bindCode:k.bindCode, category:k.category||'CATEGORY' })))
    regenerateKeybindsBlock()

    const lang = rl()
    for (const k of keybinds) lang[`key.${MODID}.${k.key}`] = k.titleText || k.key
    for (const k of prevKeys) if (!newKeys.has(k)) delete lang[`key.${MODID}.${k}`]
    wl(sortLang(lang))

    markDirty()
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

// ─── Interfaces (GUI/HUD screens — add / edit / delete / reorder) ──────────
// Stored as an ordered list in INTERFACES_JSON. Each entry only has an id,
// display name, and a kind (gui|hud) — what the interface actually renders
// is intentionally left unimplemented until that design is decided, the
// same deferral pattern used for keybind actions (see YCS_GUIDELINES.md).
const INTERFACES_JSON = 'D:/Projects/Mods/yebisu-RPG/src/main/resources/assets/yebisurpg/ycs/ycs_interfaces.json'

function readInterfaces() { try { return JSON.parse(rf(INTERFACES_JSON)) } catch { return [] } }
function writeInterfaces(list) { wf(INTERFACES_JSON, JSON.stringify(list, null, 2)) }

app.get('/api/interfaces/list', (_req, res) => {
  try {
    const lang = rl()
    const list = readInterfaces().map(i => ({ ...i, titleText: lang[`screen.${MODID}.${i.id}`] || i.id }))
    res.json({ ok:true, interfaces:list })
  } catch(e) { res.json({ ok:false, reason:e.message, interfaces:[] }) }
})

app.post('/api/interfaces/save', (req, res) => {
  // Full rewrite: list of {id, titleText, kind} in declaration order.
  // Covers add, edit, delete (omitted), and reorder (list order) in one call.
  try {
    const { interfaces } = req.body
    if (!Array.isArray(interfaces)) return res.json({ ok:false, reason:'interfaces must be an array' })
    for (const i of interfaces) {
      if (!/^[a-z][a-z0-9_]*$/.test(i.id)) return res.json({ ok:false, reason:`invalid interface id: ${i.id}` })
      if (!['gui','hud'].includes(i.kind)) return res.json({ ok:false, reason:`invalid kind for ${i.id}` })
    }
    const prev = readInterfaces()
    const prevIds = new Set(prev.map(i => i.id))
    const newIds = new Set(interfaces.map(i => i.id))

    writeInterfaces(interfaces.map(i => ({ id:i.id, kind:i.kind })))

    const lang = rl()
    for (const i of interfaces) lang[`screen.${MODID}.${i.id}`] = i.titleText || i.id
    for (const id of prevIds) if (!newIds.has(id)) delete lang[`screen.${MODID}.${id}`]
    wl(sortLang(lang))

    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

// ─── Variables (EntityVar declarations — add / edit / delete / reorder) ───
// Stored as an ordered list in VARIABLES_JSON. Mirrors net.ye6isu.yebisuRPG.data.EntityVar:
// type is one of int|float|bool|string|item, with a default value and an
// item-only dropOnDeath flag. This only manages the declaration list — it does
// not yet generate the vars.define(...) call-sites in Java; where/when each
// var actually gets defined on an entity is intentionally left unimplemented
// until that design is decided (see YCS_GUIDELINES.md).
const VARIABLES_JSON = 'D:/Projects/Mods/yebisu-RPG/src/main/resources/assets/yebisurpg/ycs/ycs_variables.json'

function readVariables() { try { return JSON.parse(rf(VARIABLES_JSON)) } catch { return [] } }
function writeVariables(list) { wf(VARIABLES_JSON, JSON.stringify(list, null, 2)) }

app.get('/api/variables/list', (_req, res) => {
  try {
    res.json({ ok:true, variables: readVariables() })
  } catch(e) { res.json({ ok:false, reason:e.message, variables:[] }) }
})

app.post('/api/variables/save', (req, res) => {
  // Full rewrite: list of {name, type, default, dropOnDeath} in declaration order.
  // Covers add, edit, delete (omitted), and reorder (list order) in one call.
  try {
    const { variables } = req.body
    if (!Array.isArray(variables)) return res.json({ ok:false, reason:'variables must be an array' })
    const VAR_TYPES = ['int','float','bool','string','item']
    for (const v of variables) {
      if (!/^[a-z][a-z0-9_]*$/.test(v.name)) return res.json({ ok:false, reason:`invalid variable name: ${v.name}` })
      if (!VAR_TYPES.includes(v.type)) return res.json({ ok:false, reason:`invalid type for ${v.name}` })
      if (v.type === 'item' && v.default != null && typeof v.default !== 'object') return res.json({ ok:false, reason:`invalid default item stack for ${v.name}` })
    }
    writeVariables(variables.map(v => ({
      name: v.name,
      type: v.type,
      default: v.type === 'item'
        ? { itemId: v.default?.itemId ?? null, count: Math.max(1, parseInt(v.default?.count) || 1) }
        : (v.default ?? (v.type === 'bool' ? false : v.type === 'string' ? '' : 0)),
      dropOnDeath: v.type === 'item' ? !!v.dropOnDeath : undefined
    })))
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

// ─── Attributes ───────────────────────────────────────────────────────────────
// Stored as an ordered list in ATTRIBUTES_JSON.
// Each entry: { id, constName, titleText, min, base, max, syncToClient }
// Server writes DeferredHolder declarations between //YCS_Attributes_START and //YCS_Attributes_END
// in ModAttributes.java.

const ATTRIBUTES_JSON = 'D:/Projects/Mods/yebisu-RPG/src/main/resources/assets/yebisurpg/ycs/ycs_attributes.json'
const MOD_ATTRIBUTES_JAVA = jp(JAVA_ROOT, 'attribute', 'ModAttributes.java')

function readAttributes() { try { return JSON.parse(rf(ATTRIBUTES_JSON)) } catch { return [] } }
function writeAttributes(list) { wf(ATTRIBUTES_JSON, JSON.stringify(list, null, 2)) }

function writeAttributesJava(list) {
  let src = rf(MOD_ATTRIBUTES_JAVA)
  const lines = list.map(a => {
    const syncStr = a.syncToClient ? ', true' : ', false'
    return `    public static final DeferredHolder<Attribute, Attribute> ${a.constName} =\n` +
           `        ATTRIBUTES.register("${a.id}", () -> new RangedAttribute(\n` +
           `            "${yebisuRPG_MODID}:${a.id}", ${a.base}D, ${a.min}D, ${a.max}D)${syncStr === ', true' ? '.setSyncable(true)' : ''});\n`
  })
  src = src.replace(
    /(\/\/YCS_Attributes_START\n)[\s\S]*?(\/\/YCS_Attributes_END)/,
    `$1${lines.join('\n')}    $2`
  )
  wf(MOD_ATTRIBUTES_JAVA, src)
  markDirty()
}

const yebisuRPG_MODID = 'yebisurpg'

app.get('/api/attributes/list', (_req, res) => {
  try {
    res.json({ ok:true, attributes: readAttributes() })
  } catch(e) { res.json({ ok:false, reason:e.message, attributes:[] }) }
})

app.post('/api/attributes/save', (req, res) => {
  try {
    const { attributes } = req.body
    if (!Array.isArray(attributes)) return res.json({ ok:false, reason:'attributes must be an array' })
    for (const a of attributes) {
      if (!/^[a-z][a-z0-9_]*$/.test(a.id)) return res.json({ ok:false, reason:`invalid attribute id: ${a.id}` })
      if (!/^[A-Z][A-Z0-9_]*$/.test(a.constName)) return res.json({ ok:false, reason:`invalid constName: ${a.constName}` })
      if (typeof a.min !== 'number' || typeof a.base !== 'number' || typeof a.max !== 'number')
        return res.json({ ok:false, reason:`min/base/max must be numbers for ${a.id}` })
      if (a.min > a.base || a.base > a.max)
        return res.json({ ok:false, reason:`must satisfy min <= base <= max for ${a.id}` })
    }
    writeAttributes(attributes)
    writeAttributesJava(attributes)
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

// ─── Effects ──────────────────────────────────────────────────────────────────
// Stored as an ordered list in EFFECTS_JSON.
// Each entry: { id, constName, titleText, category, color, hasTexture, textureDataUrl }
// Server writes Holder declarations between //YCS_Effects_START and //YCS_Effects_END
// in ModEffects.java.

const EFFECTS_JSON = 'D:/Projects/Mods/yebisu-RPG/src/main/resources/assets/yebisurpg/ycs/ycs_effects.json'
const MOD_EFFECTS_JAVA = jp(JAVA_ROOT, 'effect', 'ModEffects.java')
const EFFECT_TEXTURE_DIR = jp(MOD_ROOT, 'assets', MODID, 'textures', 'mob_effect')

function readEffects() { try { return JSON.parse(rf(EFFECTS_JSON)) } catch { return [] } }
function writeEffects(list) { wf(EFFECTS_JSON, JSON.stringify(list, null, 2)) }

function effectClassName(id) {
  return id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'Effect'
}

function writeEffectsJava(list) {
  let src = rf(MOD_EFFECTS_JAVA)
  const needsCustomImport = list.some(e => e.enabledMethods?.length)
  const lines = list.map(e => {
    const cat = e.category || 'NEUTRAL'
    const colorHex = e.color ? `0x${parseInt(e.color, 10).toString(16)}` : '0xffffff'
    if (e.enabledMethods?.length) {
      const cls = effectClassName(e.id)
      return `    public static final Holder<MobEffect> ${e.constName} =\n` +
             `        MOB_EFFECTS.register("${e.id}", () -> new ${cls}(MobEffectCategory.${cat}, ${colorHex}));\n`
    }
    return `    public static final Holder<MobEffect> ${e.constName} =\n` +
           `        MOB_EFFECTS.register("${e.id}", () -> new MobEffect(MobEffectCategory.${cat}, ${colorHex}) {});\n`
  })
  src = src.replace(
    /(\/\/YCS_Effects_START\n)[\s\S]*?(\/\/YCS_Effects_END)/,
    `$1${lines.join('\n')}    $2`
  )
  // Manage imports for custom effect classes
  const customImportMarker = '//YCS_Effects_Import_START'
  const customImportEnd = '//YCS_Effects_Import_END'
  if (src.includes(customImportMarker)) {
    src = src.replace(
      new RegExp(`${customImportMarker}[\\s\\S]*?${customImportEnd}\\n?`),
      needsCustomImport
        ? `${customImportMarker}\n${list.filter(e=>e.enabledMethods?.length).map(e=>`import net.ye6isu.yebisuRPG.effect.custom.${effectClassName(e.id)};`).join('\n')}\n${customImportEnd}\n`
        : ''
    )
  } else if (needsCustomImport) {
    const importBlock = `${customImportMarker}\n${list.filter(e=>e.enabledMethods?.length).map(e=>`import net.ye6isu.yebisuRPG.effect.custom.${effectClassName(e.id)};`).join('\n')}\n${customImportEnd}\n`
    src = src.replace(/(import [^;]+;\n)(\n*public class)/, `$1\n${importBlock}\n$2`)
  }
  wf(MOD_EFFECTS_JAVA, src)
  markDirty()
}

function writeEffectTexture(id, dataUrl, isAnimated, frametime) {
  if (!dataUrl) return
  if (!fs.existsSync(EFFECT_TEXTURE_DIR)) fs.mkdirSync(EFFECT_TEXTURE_DIR, { recursive: true })
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  fs.writeFileSync(jp(EFFECT_TEXTURE_DIR, `${id}.png`), Buffer.from(base64, 'base64'))
  const mcmetaPath = jp(EFFECT_TEXTURE_DIR, `${id}.png.mcmeta`)
  if (isAnimated) {
    fs.writeFileSync(mcmetaPath, JSON.stringify({ animation: { frametime: frametime || 4 } }, null, 2))
  } else if (fs.existsSync(mcmetaPath)) {
    fs.unlinkSync(mcmetaPath)
  }
}

function deleteEffectTexture(id) {
  const p = jp(EFFECT_TEXTURE_DIR, `${id}.png`)
  if (fs.existsSync(p)) fs.unlinkSync(p)
  const m = p + '.mcmeta'
  if (fs.existsSync(m)) fs.unlinkSync(m)
}

app.get('/api/effects/list', (_req, res) => {
  try {
    res.json({ ok:true, effects: readEffects() })
  } catch(e) { res.json({ ok:false, reason:e.message, effects:[] }) }
})

app.post('/api/effects/save', (req, res) => {
  try {
    const { effects } = req.body
    if (!Array.isArray(effects)) return res.json({ ok:false, reason:'effects must be an array' })
    for (const e of effects) {
      if (!/^[a-z][a-z0-9_]*$/.test(e.id)) return res.json({ ok:false, reason:`invalid effect id: ${e.id}` })
      if (!/^[A-Z][A-Z0-9_]*$/.test(e.constName)) return res.json({ ok:false, reason:`invalid constName: ${e.constName}` })
      if (!['BENEFICIAL','HARMFUL','NEUTRAL'].includes(e.category))
        return res.json({ ok:false, reason:`invalid category: ${e.category}` })
    }
    // Detect deleted effects and clean up textures + custom classes
    const old = readEffects()
    const newIds = new Set(effects.map(e => e.id))
    for (const o of old) {
      if (!newIds.has(o.id)) {
        deleteEffectTexture(o.id)
        // Delete custom effect class if it exists
        const cls = o.id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'Effect'
        const clsFile = jp(EFFECT_CLASS_DIR, `${cls}.java`)
        if (fs.existsSync(clsFile)) fs.unlinkSync(clsFile)
      }
    }
    // Strip textureDataUrl from JSON (texture files written by client via /api/texture)
    // Clean up stale mcmeta when animated→static
    for (const e of effects) {
      delete e.textureDataUrl
      if (e.hasTexture && !e.textureAnimated) {
        const mcmeta = jp(EFFECT_TEXTURE_DIR, `${e.id}.png.mcmeta`)
        if (fs.existsSync(mcmeta)) { fs.unlinkSync(mcmeta); triggerIdeaReload(mcmeta) }
      }
    }
    // Update lang entries for effects
    const lang = rl()
    // Remove old effect lang entries
    for (const o of old) { delete lang[`effect.${MODID}.${o.id}`] }
    // Add current effect lang entries
    for (const e of effects) {
      if (e.titleText) lang[`effect.${MODID}.${e.id}`] = e.titleText
    }
    wl(sortLang(lang))
    writeEffects(effects)
    writeEffectsJava(effects)
    res.json({ ok:true })
  } catch(e) { res.json({ ok:false, reason:e.message }) }
})

app.get('/api/textures/mob_effect/:name', (req, res) => {
  const p = jp(EFFECT_TEXTURE_DIR, req.params.name)
  if (fs.existsSync(p)) res.sendFile(p)
  else res.status(404).end()
})

// ─── Effect Custom Classes ────────────────────────────────────────────────────
const EFFECT_CLASS_DIR = jp(JAVA_ROOT, 'effect', 'custom')
const EFFECT_PKG = 'net.ye6isu.yebisuRPG.effect.custom'

app.post('/api/effects/custom-class', (req, res) => {
  try {
    const { className } = req.body
    if (!fs.existsSync(EFFECT_CLASS_DIR)) fs.mkdirSync(EFFECT_CLASS_DIR, { recursive: true })
    const file = jp(EFFECT_CLASS_DIR, `${className}.java`)
    if (fs.existsSync(file)) return res.json({ ok: true, existed: true })
    const content = `package ${EFFECT_PKG};\n\nimport net.minecraft.world.effect.MobEffectCategory;\nimport net.minecraft.world.entity.LivingEntity;\n\npublic class ${className} extends YCSEffect {\n    public ${className}(MobEffectCategory category, int color) {\n        super(category, color);\n    }\n}\n`
    wf(file, content)
    res.json({ ok: true, existed: false })
  } catch (e) { res.json({ ok: false, reason: e.message }) }
})

app.post('/api/effects/custom-class/read', (req, res) => {
  try {
    const { className } = req.body
    const file = jp(EFFECT_CLASS_DIR, `${className}.java`)
    if (!fs.existsSync(file)) return res.json({ ok: false, reason: 'not found' })
    res.json({ ok: true, code: rf(file) })
  } catch (e) { res.json({ ok: false, reason: e.message }) }
})

app.post('/api/effects/custom-class/write', (req, res) => {
  try {
    const { className, code } = req.body
    if (!className || typeof code !== 'string') return res.json({ ok: false, reason: 'missing className or code' })
    const file = jp(EFFECT_CLASS_DIR, `${className}.java`)
    if (!fs.existsSync(file)) return res.json({ ok: false, reason: 'file not found — create it first' })
    wf(file, code)
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false, reason: e.message }) }
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
      if (creativeTab && blockId) { const tabKey = tabValueToKeyMap()[creativeTab]; if (tabKey) tabs[`block:${blockId}`] = tabKey }
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
      if (creativeTab && blockId) { const tabKey = tabValueToKeyMap()[creativeTab]; if (tabKey) tabs[`block:${blockId}`] = tabKey }
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
