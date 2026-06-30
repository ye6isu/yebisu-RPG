import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FieldRow, StringField, NumberInput, StandardDropdownField } from './Field/Field';

function FieldGroup({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{
        fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
        opacity: 0.4, padding: '4px 0', userSelect: 'none',
      }}>
        {label}
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '4px',
        borderLeft: '1px solid var(--ycs-foreground)',
        paddingLeft: '12px', marginLeft: '4px',
      }}>
        {children}
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange, disabled = false }) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: '16px', height: '16px', cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
        border: `1px solid ${checked ? 'var(--ycs-highlight)' : 'var(--ycs-foreground)'}`,
        borderRadius: '3px',
        backgroundColor: checked ? 'var(--ycs-highlight)' : 'transparent',
        opacity: disabled ? 0.5 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background-color 0.1s, border-color 0.1s',
      }}
    >
      {checked && (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  );
}

const MODID = 'yebisurpg';
const JAVA_BASE = 'java/net/ye6isu/yebisuRPG';
const RES_BASE = 'resources/assets/yebisurpg';

function FileDropZone({ hasFile, fileName, onImport, onClear }) {
  const [dragOver, setDragOver] = useState(false);
  const zoneRef = useRef(null);
  const dragOverRef = useRef(false);
  const onImportRef = useRef(onImport);
  onImportRef.current = onImport;

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
            if (path.endsWith('.json')) {
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

  return (
    <div
      ref={zoneRef}
      onClick={() => onImport()}
      className="ycs-string-input"
      style={{
        flex: 1,
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: hasFile ? 'flex-start' : 'center',
        gap: '6px',
        cursor: 'pointer',
        fontSize: '12px',
        padding: '0 8px',
        boxSizing: 'border-box',
        borderColor: dragOver ? 'var(--ycs-highlight)' : undefined,
        backgroundColor: dragOver ? 'var(--ycs-accent)' : undefined,
      }}
    >
      {hasFile ? (
        <>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
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

export default function ItemEditor({ itemId: existingId, onBack }) {
  const [itemId, setItemId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [texture, setTexture] = useState('');
  const [holdingMode, setHoldingMode] = useState('generated');
  const [stackSize, setStackSize] = useState('64');
  const [geoModel, setGeoModel] = useState('');
  const [geoTexture, setGeoTexture] = useState('');
  const [displayModel, setDisplayModel] = useState('');
  const [textures, setTextures] = useState([]);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [injected, setInjected] = useState(false);
  const [currentInjections, setCurrentInjections] = useState([]);
  const [lastSavedId, setLastSavedId] = useState(existingId || null);
  const [customClass, setCustomClass] = useState(false);

  // Combat
  const [attackDamage, setAttackDamage] = useState('');
  const [attackSpeed, setAttackSpeed] = useState('');

  // Food
  const [foodEnabled, setFoodEnabled] = useState(false);
  const [nutrition, setNutrition] = useState('4');
  const [saturation, setSaturation] = useState('0.3');
  const [canAlwaysEat, setCanAlwaysEat] = useState(false);
  const [fastFood, setFastFood] = useState(false);

  // Fuel
  const [fuelEnabled, setFuelEnabled] = useState(false);
  const [fuel, setFuel] = useState('');

  // Tool
  const [toolEnabled, setToolEnabled] = useState(false);
  const [toolType, setToolType] = useState('sword');
  const [toolTier, setToolTier] = useState('iron');

  // Tooltip
  const [tooltipEnabled, setTooltipEnabled] = useState(false);
  const [tooltipNormal, setTooltipNormal] = useState('');
  const [tooltipShift, setTooltipShift] = useState(false);
  const [tooltipUseDefaultHint, setTooltipUseDefaultHint] = useState(true);
  const [tooltipShiftHint, setTooltipShiftHint] = useState('');
  const [tooltipHidden, setTooltipHidden] = useState('');

  const is3D = holdingMode === '3d';

  const toPascalCase = (s) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

  const handleIdChange = (val) => {
    setItemId(val.toLowerCase().replace(/\s/g, '_'));
  };

  const loadTextures = useCallback(async () => {
    try {
      const ids = await invoke('list_textures');
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_texture', { id });
          loaded.push(JSON.parse(raw));
        } catch {}
      }
      setTextures(loaded);
    } catch {}
  }, []);

  useEffect(() => {
    loadTextures();
    if (existingId) {
      invoke('load_ycs_data', { category: 'items', id: existingId })
        .then(raw => {
          const data = JSON.parse(raw);
          setItemId(data.id || '');
          setDisplayName(data.displayName || '');
          setTexture(data.texture || '');
          setHoldingMode(data.holdingMode || 'generated');
          setStackSize(String(data.stackSize ?? '64'));
          setGeoModel(data.geoModel || '');
          setGeoTexture(data.geoTexture || '');
          setDisplayModel(data.displayModel || '');
          setCustomClass(data.customClass || false);
          setAttackDamage(data.attackDamage != null ? String(data.attackDamage) : '');
          setAttackSpeed(data.attackSpeed != null ? String(data.attackSpeed) : '');
          setFoodEnabled(data.foodEnabled || false);
          setNutrition(data.nutrition != null ? String(data.nutrition) : '4');
          setSaturation(data.saturation != null ? String(data.saturation) : '0.3');
          setCanAlwaysEat(data.canAlwaysEat || false);
          setFastFood(data.fastFood || false);
          setFuelEnabled(data.fuelEnabled || false);
          setFuel(data.fuel != null ? String(data.fuel) : '');
          setToolEnabled(data.toolEnabled || false);
          setToolType(data.toolType || 'sword');
          setToolTier(data.toolTier || 'iron');
          setTooltipEnabled(data.tooltipEnabled || false);
          setTooltipNormal(data.tooltipNormal || '');
          setTooltipShift(data.tooltipShift || false);
          setTooltipUseDefaultHint(data.tooltipUseDefaultHint ?? true);
          setTooltipShiftHint(data.tooltipShiftHint || '');
          setTooltipHidden(data.tooltipHidden || '');
          const inj = Array.isArray(data._injections) ? data._injections : [];
          setCurrentInjections(inj);
          setInjected(inj.length > 0);
        })
        .catch(() => {});
    }
  }, [existingId, loadTextures]);

  const needsCustomClass = customClass;

  const buildPayload = () => ({
    id: itemId,
    displayName,
    texture,
    holdingMode,
    stackSize: parseInt(stackSize) || 64,
    geoModel: is3D && geoModel ? itemId : '',
    geoTexture: is3D ? geoTexture : '',
    displayModel: is3D && displayModel ? itemId : '',
    customClass,
    attackDamage: attackDamage !== '' ? parseFloat(attackDamage) : null,
    attackSpeed: attackSpeed !== '' ? parseFloat(attackSpeed) : null,
    foodEnabled,
    nutrition: foodEnabled ? (parseInt(nutrition) || 4) : null,
    saturation: foodEnabled ? (parseFloat(saturation) || 0.3) : null,
    canAlwaysEat: foodEnabled ? canAlwaysEat : false,
    fastFood: foodEnabled ? fastFood : false,
    fuelEnabled,
    fuel: fuelEnabled && fuel !== '' ? (parseInt(fuel) || null) : null,
    toolEnabled,
    toolType: toolEnabled ? toolType : '',
    toolTier: toolEnabled ? toolTier : '',
    tooltipEnabled,
    tooltipNormal: tooltipEnabled ? tooltipNormal : '',
    tooltipShift: tooltipEnabled ? tooltipShift : false,
    tooltipUseDefaultHint: tooltipEnabled && tooltipShift ? tooltipUseDefaultHint : true,
    tooltipShiftHint: tooltipEnabled && tooltipShift && !tooltipUseDefaultHint ? tooltipShiftHint : '',
    tooltipHidden: tooltipEnabled && tooltipShift ? tooltipHidden : '',
    type: 'item',
  });

  const removeExistingInjections = async () => {
    for (let i = currentInjections.length - 1; i >= 0; i--) {
      const inj = currentInjections[i];
      try {
        if (inj.type === 'java-marker') {
          await invoke('remove_marker_content', { file: inj.file, marker: inj.marker, content: inj.content });
        } else if (inj.type === 'json-key') {
          await invoke('delete_json_key', { file: inj.file, key: inj.key });
        } else if (inj.type === 'created-file') {
          await invoke('delete_mod_file', { file: inj.file });
        }
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }
    setCurrentInjections([]);
  };

  const importGeoModel = async (droppedPath) => {
    if (!itemId) { setStatus({ ok: false, msg: 'Set an Item ID first.' }); return; }
    let filePath = droppedPath;
    if (!filePath) {
      const file = await open({
        multiple: false,
        filters: [{ name: 'Bedrock Geo', extensions: ['json'] }],
      });
      if (!file) return;
      filePath = typeof file === 'string' ? file : file.path;
    }
    try {
      await invoke('import_geo_model', { id: itemId, sourcePath: filePath });
      setGeoModel(itemId);
      setStatus({ ok: true, msg: 'Geo model imported.' });
    } catch (err) {
      setStatus({ ok: false, msg: 'Failed to import model: ' + err });
    }
  };

  const importDisplayModel = async (droppedPath) => {
    if (!itemId) { setStatus({ ok: false, msg: 'Set an Item ID first.' }); return; }
    let filePath = droppedPath;
    if (!filePath) {
      const file = await open({
        multiple: false,
        filters: [{ name: 'Display Model JSON', extensions: ['json'] }],
      });
      if (!file) return;
      filePath = typeof file === 'string' ? file : file.path;
    }
    try {
      await invoke('import_display_model', { id: itemId, sourcePath: filePath });
      setDisplayModel(itemId);
      setStatus({ ok: true, msg: 'Display model imported.' });
    } catch (err) {
      setStatus({ ok: false, msg: 'Failed to import display model: ' + err });
    }
  };

  const handleSaveAndInject = async () => {
    if (!itemId) { setStatus({ ok: false, msg: 'Item ID is required.' }); return; }
    setSaving(true);
    try {
      await removeExistingInjections();
      if (lastSavedId && lastSavedId !== itemId) {
        await invoke('delete_ycs_data', { category: 'items', id: lastSavedId }).catch(() => {});
        await invoke('delete_geo_model', { id: lastSavedId }).catch(() => {});
      }

      const payload = buildPayload();
      const injections = [];
      const CN = itemId.toUpperCase();
      const className = toPascalCase(itemId) + 'Item';

      // Build Item.Properties() chain
      const parsedStack = parseInt(stackSize) || 64;
      let propsChain = parsedStack !== 64 ? `.stacksTo(${parsedStack})` : '';
      if (foodEnabled) {
        let foodBuilder = `new FoodProperties.Builder().nutrition(${parseInt(nutrition) || 4}).saturationModifier(${parseFloat(saturation) || 0.3}f)`;
        if (canAlwaysEat) foodBuilder += '.alwaysEdible()';
        if (fastFood) foodBuilder += '.fast()';
        propsChain += `.food(${foodBuilder}.build())`;
      }

      // Determine base class for registration and custom class extends
      const toolBaseClass = {
        sword: 'SwordItem',
        pickaxe: 'PickaxeItem',
        axe: 'AxeItem',
        shovel: 'ShovelItem',
        hoe: 'HoeItem',
      }[toolType];
      const isTool = toolEnabled && !!toolBaseClass;

      const tierConst = {
        wood: 'Tiers.WOOD', stone: 'Tiers.STONE', iron: 'Tiers.IRON',
        gold: 'Tiers.GOLD', diamond: 'Tiers.DIAMOND', netherite: 'Tiers.NETHERITE',
      }[toolTier] || 'Tiers.IRON';

      const defaultDamage = { sword: 3, axe: 5, pickaxe: 1, shovel: 1.5, hoe: 0 };
      const defaultSpeed  = { sword: -2.4, axe: -3.1, pickaxe: -2.8, shovel: -3.0, hoe: -3.0 };
      const toolDamageBonus = attackDamage !== '' ? parseFloat(attackDamage) : (defaultDamage[toolType] ?? 0);
      const toolSpeedBonus  = attackSpeed  !== '' ? parseFloat(attackSpeed)  : (defaultSpeed[toolType]  ?? 0);

      // Attach attack/speed via .attributes() — all tool constructors in 1.21.1 are (Tier, Properties) only
      const hasCustomAttrs = attackDamage !== '' || attackSpeed !== '';
      if (isTool && hasCustomAttrs) {
        const helper = toolType === 'sword'
          ? `SwordItem.createAttributes(${tierConst}, ${toolDamageBonus}f, ${toolSpeedBonus}f)`
          : `DiggerItem.createAttributes(${tierConst}, ${toolDamageBonus}f, ${toolSpeedBonus}f)`;
        propsChain += `.attributes(${helper})`;
      } else if (!isTool && hasCustomAttrs) {
        const parts = [];
        if (attackDamage !== '') parts.push(`                .add(Attributes.ATTACK_DAMAGE, new AttributeModifier(Item.BASE_ATTACK_DAMAGE_ID, ${parseFloat(attackDamage)}, AttributeModifier.Operation.ADD_VALUE), EquipmentSlotGroup.MAINHAND)`);
        if (attackSpeed !== '')  parts.push(`                .add(Attributes.ATTACK_SPEED, new AttributeModifier(Item.BASE_ATTACK_SPEED_ID, ${parseFloat(attackSpeed)}, AttributeModifier.Operation.ADD_VALUE), EquipmentSlotGroup.MAINHAND)`);
        propsChain += `.attributes(ItemAttributeModifiers.builder()\n${parts.join('\n')}\n                .build())`;
      }

      // Build tooltip body (used both for inline anon class and custom class method)
      const buildTooltipLines = (indent) => {
        const i = `${indent}    `;
        const lines = [];
        if (tooltipNormal) lines.push(`${i}tooltipData.add(Component.translatable("tooltip.${MODID}.${itemId}.normal"));`);
        if (tooltipShift) {
          const hintKey = tooltipUseDefaultHint
            ? `"tooltip.${MODID}.shift_hint"`
            : tooltipShiftHint ? `"tooltip.${MODID}.${itemId}.shift_hint"` : null;
          if (hintKey) lines.push(`${i}if (!flag.hasShiftDown()) tooltipData.add(Component.translatable(${hintKey}).withStyle(net.minecraft.ChatFormatting.GRAY));`);
          if (tooltipHidden) lines.push(`${i}if (flag.hasShiftDown()) tooltipData.add(Component.translatable("tooltip.${MODID}.${itemId}.hidden"));`);
        }
        lines.push(`${i}super.appendHoverText(stack, context, tooltipData, flag);`);
        return lines.join('\n');
      };

      const tooltipImportsNeeded = tooltipEnabled
        ? ['import java.util.List;', 'import net.minecraft.network.chat.Component;', 'import net.minecraft.world.item.TooltipFlag;', 'import net.minecraft.world.item.Item.TooltipContext;', 'import net.minecraft.world.item.ItemStack;']
        : [];

      let baseClass, constructorArgs;
      if (isTool) {
        baseClass = toolBaseClass;
        constructorArgs = needsCustomClass
          ? `${tierConst}, new Item.Properties()${propsChain}`
          : `${tierConst}, new Item.Properties()${propsChain}`;
      } else {
        baseClass = 'Item';
        constructorArgs = `new Item.Properties()${propsChain}`;
      }

      const instanceClass = needsCustomClass ? className : baseClass;
      const baseConstructor = `new ${instanceClass}(${constructorArgs})`;
      const constructor = (tooltipEnabled && !needsCustomClass)
        ? `new ${baseClass}(${constructorArgs}) {\n            @Override\n            public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltipData, TooltipFlag flag) {\n${buildTooltipLines('            ')}\n            }\n        }`
        : baseConstructor;
      const registeredType = isTool ? baseClass : 'Item';

      const regLine = `    public static final DeferredItem<${registeredType}> ${CN} = ITEMS.register("${itemId}",\n            () -> ${constructor});`;
      await invoke('inject_marker', {
        file: `${JAVA_BASE}/item/ModItems.java`,
        marker: 'YCS_Mod_Items',
        content: regLine,
      });
      injections.push({ type: 'java-marker', file: `${JAVA_BASE}/item/ModItems.java`, marker: 'YCS_Mod_Items', content: regLine });

      if (needsCustomClass) {
        const classFile = `${JAVA_BASE}/item/custom/${className}.java`;
        const exists = await invoke('mod_file_exists', { file: classFile });
        if (!exists) {
          const tooltipMethod = tooltipEnabled ? `

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltipData, TooltipFlag flag) {
${buildTooltipLines('    ')}
    }` : '';

          const tooltipImports = tooltipImportsNeeded.map(i => i + '\n').join('');

          const toolImport = isTool ? `import net.minecraft.world.item.${baseClass};\nimport net.minecraft.world.item.Tiers;\n` : '';
          const baseImport = `import net.minecraft.world.item.Item;\n`;

          const classContent = `package net.ye6isu.yebisuRPG.item.custom;

${baseImport}${toolImport}${tooltipImports}
public class ${className} extends ${baseClass} {
    public ${className}(${isTool ? `Tiers tier, Properties properties` : `Properties properties`}) {
        super(${isTool ? `tier, properties` : `properties`});
    }${tooltipMethod}
}
`;
          await invoke('write_mod_file', { file: classFile, content: classContent });
        }
        injections.push({ type: 'created-file', file: classFile });

        const importLine = `import net.ye6isu.yebisuRPG.item.custom.${className};`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/item/ModItems.java`,
          marker: 'YCS_Mod_Item_Imports',
          content: importLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/item/ModItems.java`, marker: 'YCS_Mod_Item_Imports', content: importLine });
      }

      // Tooltip imports for inline anonymous class (when no custom class)
      if (tooltipEnabled && !needsCustomClass) {
        for (const importLine of tooltipImportsNeeded) {
          await invoke('inject_marker', { file: `${JAVA_BASE}/item/ModItems.java`, marker: 'YCS_Mod_Item_Imports', content: importLine });
          injections.push({ type: 'java-marker', file: `${JAVA_BASE}/item/ModItems.java`, marker: 'YCS_Mod_Item_Imports', content: importLine });
        }
      }

      // Attribute modifier imports (both tool and non-tool paths use .attributes())
      if (hasCustomAttrs) {
        const attrImports = isTool
          ? [
              toolType === 'sword'
                ? 'import net.minecraft.world.item.SwordItem;'
                : 'import net.minecraft.world.item.DiggerItem;',
            ]
          : [
              'import net.minecraft.world.item.component.ItemAttributeModifiers;',
              'import net.minecraft.world.entity.ai.attributes.AttributeModifier;',
              'import net.minecraft.world.entity.ai.attributes.Attributes;',
              'import net.minecraft.world.entity.EquipmentSlotGroup;',
            ];
        for (const importLine of attrImports) {
          await invoke('inject_marker', { file: `${JAVA_BASE}/item/ModItems.java`, marker: 'YCS_Mod_Item_Imports', content: importLine });
          injections.push({ type: 'java-marker', file: `${JAVA_BASE}/item/ModItems.java`, marker: 'YCS_Mod_Item_Imports', content: importLine });
        }
      }

      // Tooltip lang keys
      if (tooltipEnabled) {
        const ttLangEntries = [];
        if (tooltipNormal) ttLangEntries.push([`tooltip.${MODID}.${itemId}.normal`, tooltipNormal]);
        if (tooltipShift && !tooltipUseDefaultHint && tooltipShiftHint) ttLangEntries.push([`tooltip.${MODID}.${itemId}.shift_hint`, tooltipShiftHint]);
        if (tooltipShift && tooltipHidden) ttLangEntries.push([`tooltip.${MODID}.${itemId}.hidden`, tooltipHidden]);
        for (const [key, value] of ttLangEntries) {
          await invoke('set_json_key', { file: `${RES_BASE}/lang/en_us.json`, key, value });
          injections.push({ type: 'json-key', file: `${RES_BASE}/lang/en_us.json`, key });
        }
      }

      // Fuel registration
      if (fuelEnabled && fuel !== '' && parseInt(fuel)) {
        const fuelLine = `        if (event.getItemStack().is(ModItems.${CN}.get())) { event.setBurnTime(${parseInt(fuel)}); }`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/item/ModFuelEvents.java`,
          marker: 'YCS_Mod_Fuel',
          content: fuelLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/item/ModFuelEvents.java`, marker: 'YCS_Mod_Fuel', content: fuelLine });
      }

      const langKey = `item.${MODID}.${itemId}`;
      await invoke('set_json_key', {
        file: `${RES_BASE}/lang/en_us.json`,
        key: langKey,
        value: displayName || itemId,
      });
      injections.push({ type: 'json-key', file: `${RES_BASE}/lang/en_us.json`, key: langKey });

      if (is3D) {
        // If ID changed since last import, rename stored model files to match new ID
        const modelSourceId = geoModel || displayModel;
        if (modelSourceId && modelSourceId !== itemId) {
          await invoke('rename_geo_model', { oldId: modelSourceId, newId: itemId }).catch(() => {});
        }

        // Copy geo model to mod
        const hasGeo = await invoke('load_geo_model_path', { id: itemId }).then(() => true).catch(() => false);
        if (hasGeo) {
          const geoDestPath = `${RES_BASE}/geo/item/${itemId}.geo.json`;
          await invoke('copy_geo_model_to_mod', { modelId: itemId, destFile: geoDestPath });
          injections.push({ type: 'created-file', file: geoDestPath });
        }

        if (geoTexture) {
          const geoTexPath = `${RES_BASE}/textures/geo/item/${itemId}.png`;
          await invoke('copy_texture_to_mod', { textureId: geoTexture, destFile: geoTexPath });
          injections.push({ type: 'created-file', file: geoTexPath });
        }

        const collectLine = `        tryRegister(items, ModItems.${CN}, "${itemId}");`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/client/renderer/GeoItemRegistry.java`,
          marker: 'YCS_Geo_Collect',
          content: collectLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/client/renderer/GeoItemRegistry.java`, marker: 'YCS_Geo_Collect', content: collectLine });

        // Copy display model to mod (or write fallback)
        const displayModelPath = `${RES_BASE}/models/item/${itemId}.json`;
        const hasDisplay = await invoke('load_display_model', { id: itemId }).then(() => true).catch(() => false);
        if (hasDisplay) {
          await invoke('copy_display_model_to_mod', { modelId: itemId, destFile: displayModelPath });
        } else {
          const fallbackModel = JSON.stringify({ parent: "minecraft:builtin/entity" }, null, 2);
          await invoke('write_mod_file', { file: displayModelPath, content: fallbackModel });
        }
        injections.push({ type: 'created-file', file: displayModelPath });

      } else {
        const isHandheld = holdingMode === 'handheld';
        const modelLine = isHandheld
          ? `        handheldItem(ModItems.${CN});`
          : `        basicItem(ModItems.${CN}.get());`;
        await invoke('inject_marker', {
          file: `${JAVA_BASE}/datagen/ModItemModelProvider.java`,
          marker: 'YCS_Mod_Item_Model',
          content: modelLine,
        });
        injections.push({ type: 'java-marker', file: `${JAVA_BASE}/datagen/ModItemModelProvider.java`, marker: 'YCS_Mod_Item_Model', content: modelLine });

        if (texture) {
          const texPath = `${RES_BASE}/textures/item/${itemId}.png`;
          await invoke('copy_texture_to_mod', { textureId: texture, destFile: texPath });
          injections.push({ type: 'created-file', file: texPath });
        }
      }

      payload._injections = injections;
      await invoke('save_ycs_data', {
        category: 'items',
        id: itemId,
        content: JSON.stringify(payload, null, 2),
      });

      setCurrentInjections(injections);
      setInjected(true);
      setLastSavedId(itemId);
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Injection failed: ' + err });
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!existingId && !itemId) return;
    const targetId = existingId || itemId;
    setSaving(true);
    try {
      await removeExistingInjections();
      await invoke('delete_geo_model', { id: targetId }).catch(() => {});
      await invoke('delete_ycs_data', { category: 'items', id: targetId });
      setStatus({ ok: true, msg: 'Removed and cleaned up.' });
      setInjected(false);
      if (onBack) onBack();
    } catch (err) {
      setStatus({ ok: false, msg: 'Remove failed: ' + err });
    }
    setSaving(false);
  };

  const textureOptions = textures.map(t => ({ label: t.label, value: t.id }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500', flex: 1 }}>
          {existingId ? `Edit Item: ${existingId}` : 'New Item'}
        </h2>
        {status && <span style={{ fontSize: 11, color: status.ok ? '#5ba558' : '#e05252' }}>{status.msg}</span>}
        {injected && <button className="ycs-button" onClick={handleRemove} style={{ color: '#e05252' }}>Remove</button>}
        <button className="ycs-button" onClick={onBack}>Cancel</button>
        <button className="ycs-button" onClick={handleSaveAndInject} disabled={saving || !itemId}>{saving ? 'Saving...' : 'Save'}</button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <FieldGroup label="Identity">
          <FieldRow label="Item ID">
            <StringField value={itemId} onChange={handleIdChange} style={{ width: '100%' }} />
          </FieldRow>
          <FieldRow label="Display Name">
            <StringField value={displayName} onChange={setDisplayName} style={{ width: '100%' }} />
          </FieldRow>
        </FieldGroup>

        <FieldGroup label="Appearance">
          <FieldRow label="Holding Mode">
            <StandardDropdownField
              value={holdingMode}
              onChange={setHoldingMode}
              options={[
                { label: 'Generated', value: 'generated' },
                { label: 'Handheld', value: 'handheld' },
                { label: '3D Model', value: '3d' },
              ]}
            />
          </FieldRow>

          {is3D ? (
            <>
              <FieldRow label="Texture">
                <StandardDropdownField
                  value={geoTexture}
                  onChange={setGeoTexture}
                  options={[{ label: '(None)', value: '' }, ...textureOptions]}
                />
              </FieldRow>
              <FieldRow label="Model">
                <FileDropZone
                  hasFile={!!geoModel}
                  fileName={`${geoModel}.geo.json`}
                  onImport={(path) => importGeoModel(path)}
                  onClear={() => setGeoModel('')}
                />
              </FieldRow>
              <FieldRow label="Display Model">
                <FileDropZone
                  hasFile={!!displayModel}
                  fileName={`${displayModel}.display.json`}
                  onImport={(path) => importDisplayModel(path)}
                  onClear={() => setDisplayModel('')}
                />
              </FieldRow>
            </>
          ) : (
            <FieldRow label="Texture">
              <StandardDropdownField
                value={texture}
                onChange={setTexture}
                options={[{ label: '(None)', value: '' }, ...textureOptions]}
              />
            </FieldRow>
          )}
        </FieldGroup>

        <FieldGroup label="Properties">
          <FieldRow label="Stack Size">
            <NumberInput value={stackSize} onChange={setStackSize} style={{ width: '80px' }} />
          </FieldRow>
          <FieldRow label="Tool">
            <Checkbox checked={toolEnabled} onChange={setToolEnabled} />
          </FieldRow>
          {toolEnabled && <>
            <FieldRow label="Tool Type">
              <StandardDropdownField
                value={toolType}
                onChange={setToolType}
                options={[
                  { label: 'Sword', value: 'sword' },
                  { label: 'Pickaxe', value: 'pickaxe' },
                  { label: 'Axe', value: 'axe' },
                  { label: 'Shovel', value: 'shovel' },
                  { label: 'Hoe', value: 'hoe' },
                ]}
              />
            </FieldRow>
            <FieldRow label="Tier">
              <StandardDropdownField
                value={toolTier}
                onChange={setToolTier}
                options={[
                  { label: 'Wood', value: 'wood' },
                  { label: 'Stone', value: 'stone' },
                  { label: 'Iron', value: 'iron' },
                  { label: 'Gold', value: 'gold' },
                  { label: 'Diamond', value: 'diamond' },
                  { label: 'Netherite', value: 'netherite' },
                ]}
              />
            </FieldRow>
          </>}
        </FieldGroup>

        <FieldGroup label="Combat">
          <FieldRow label="Attack Damage">
            <NumberInput value={attackDamage} onChange={setAttackDamage} style={{ width: '80px' }} />
          </FieldRow>
          <FieldRow label="Attack Speed">
            <NumberInput value={attackSpeed} onChange={setAttackSpeed} style={{ width: '80px' }} />
          </FieldRow>
        </FieldGroup>

        <FieldGroup label="Food">
          <FieldRow label="Food">
            <Checkbox checked={foodEnabled} onChange={setFoodEnabled} />
          </FieldRow>
          {foodEnabled && <>
            <FieldRow label="Nutrition">
              <NumberInput value={nutrition} onChange={setNutrition} style={{ width: '80px' }} />
            </FieldRow>
            <FieldRow label="Saturation">
              <NumberInput value={saturation} onChange={setSaturation} style={{ width: '80px' }} />
            </FieldRow>
            <FieldRow label="Can Always Eat">
              <Checkbox checked={canAlwaysEat} onChange={setCanAlwaysEat} />
            </FieldRow>
            <FieldRow label="Fast Food">
              <Checkbox checked={fastFood} onChange={setFastFood} />
            </FieldRow>
          </>}
        </FieldGroup>

        <FieldGroup label="Fuel">
          <FieldRow label="Fuel">
            <Checkbox checked={fuelEnabled} onChange={setFuelEnabled} />
          </FieldRow>
          {fuelEnabled && (
            <FieldRow label="Burn Time (ticks)">
              <NumberInput value={fuel} onChange={setFuel} style={{ width: '80px' }} />
            </FieldRow>
          )}
        </FieldGroup>

        <FieldGroup label="Tooltip">
          <FieldRow label="Tooltip">
            <Checkbox checked={tooltipEnabled} onChange={setTooltipEnabled} />
          </FieldRow>
          {tooltipEnabled && <>
            <FieldRow label="Normal Text">
              <StringField value={tooltipNormal} onChange={setTooltipNormal} style={{ width: '100%' }} />
            </FieldRow>
            <FieldRow label="Shift to Reveal">
              <Checkbox checked={tooltipShift} onChange={setTooltipShift} />
            </FieldRow>
            {tooltipShift && <>
              <FieldRow label="Default Hint">
                <Checkbox checked={tooltipUseDefaultHint} onChange={setTooltipUseDefaultHint} />
              </FieldRow>
              {!tooltipUseDefaultHint && (
                <FieldRow label="Custom Hint">
                  <StringField value={tooltipShiftHint} onChange={setTooltipShiftHint} style={{ width: '100%' }} />
                </FieldRow>
              )}
              <FieldRow label="Hidden Text">
                <StringField value={tooltipHidden} onChange={setTooltipHidden} style={{ width: '100%' }} />
              </FieldRow>
            </>}
          </>}
        </FieldGroup>

        <FieldGroup label="Advanced">
          <FieldRow label="Custom Class">
            <Checkbox checked={customClass} onChange={setCustomClass} />
            {customClass && itemId && (
              <span style={{ fontSize: '11px', opacity: 0.5, fontFamily: 'monospace' }}>
                {toPascalCase(itemId)}Item.java
              </span>
            )}
          </FieldRow>
        </FieldGroup>
      </div>

    </div>
  );
}
