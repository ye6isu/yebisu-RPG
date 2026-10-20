import React, { useState } from 'react';
import { FieldRow, StringField, StandardDropdownField, DropdownField, NumberInput } from './Field/Field';

const TIERS = [
  { label: 'Wood', value: 'Wood' },
  { label: 'Stone', value: 'Stone' },
  { label: 'Iron', value: 'Iron' },
  { label: 'Gold', value: 'Gold' },
  { label: 'Diamond', value: 'Diamond' },
  { label: 'Netherite', value: 'Netherite' },
];

const TOOL_TYPES = [
  { label: 'Sword', value: 'Sword' },
  { label: 'Pickaxe', value: 'Pickaxe' },
  { label: 'Axe', value: 'Axe' },
  { label: 'Shovel', value: 'Shovel' },
  { label: 'Hoe', value: 'Hoe' },
];

const HOLDING_MODES = [
  { label: 'Default', value: 'none' },
  { label: 'Handheld', value: 'handheld' },
  { label: '3D Model', value: '3d' },
];

const VANILLA_EFFECTS = [
  { label: 'Regeneration', value: 'MobEffects.REGENERATION' },
  { label: 'Speed', value: 'MobEffects.MOVEMENT_SPEED' },
  { label: 'Slowness', value: 'MobEffects.MOVEMENT_SLOWDOWN' },
  { label: 'Haste', value: 'MobEffects.DIG_SPEED' },
  { label: 'Mining Fatigue', value: 'MobEffects.DIG_SLOWDOWN' },
  { label: 'Strength', value: 'MobEffects.DAMAGE_BOOST' },
  { label: 'Instant Health', value: 'MobEffects.HEAL' },
  { label: 'Instant Damage', value: 'MobEffects.HARM' },
  { label: 'Jump Boost', value: 'MobEffects.JUMP' },
  { label: 'Nausea', value: 'MobEffects.CONFUSION' },
  { label: 'Night Vision', value: 'MobEffects.NIGHT_VISION' },
  { label: 'Hunger', value: 'MobEffects.HUNGER' },
  { label: 'Weakness', value: 'MobEffects.WEAKNESS' },
  { label: 'Poison', value: 'MobEffects.POISON' },
  { label: 'Wither', value: 'MobEffects.WITHER' },
  { label: 'Health Boost', value: 'MobEffects.HEALTH_BOOST' },
  { label: 'Absorption', value: 'MobEffects.ABSORPTION' },
  { label: 'Saturation', value: 'MobEffects.SATURATION' },
  { label: 'Fire Resistance', value: 'MobEffects.FIRE_RESISTANCE' },
  { label: 'Water Breathing', value: 'MobEffects.WATER_BREATHING' },
  { label: 'Invisibility', value: 'MobEffects.INVISIBILITY' },
  { label: 'Resistance', value: 'MobEffects.DAMAGE_RESISTANCE' },
  { label: 'Slow Falling', value: 'MobEffects.SLOW_FALLING' },
];

const RECIPE_TYPES = [
  { label: 'Shaped', value: 'shaped' },
  { label: 'Shapeless', value: 'shapeless' },
];

const Section = ({ title, children }) => (
  <>
    <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', margin: '25px 0' }} />
    <h2 style={{ marginTop: 0, fontSize: '16px', fontWeight: '500', color: 'var(--ycs-text)', marginBottom: '15px' }}>{title}</h2>
    {children}
  </>
);

const CheckboxRow = ({ label, checked, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
    <input type="checkbox" className="ycs-checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    <span style={{ fontSize: '13px', color: 'var(--ycs-text)', userSelect: 'none' }}>{label}</span>
  </div>
);

const SubSection = ({ children }) => (
  <div style={{ paddingLeft: '16px', borderLeft: '2px solid var(--ycs-foreground)', marginBottom: '15px', marginTop: '5px' }}>
    {children}
  </div>
);


export default function ItemPage({ isTile = false }) {
  const [displayName, setDisplayName] = useState('');
  const [id, setId] = useState('');
  const [customConstName, setCustomConstName] = useState(false);
  const [constName, setConstName] = useState('');
  const [holdingMode, setHoldingMode] = useState('none');
  const [creativeTab, setCreativeTab] = useState('');
  const [maxStackSize, setMaxStackSize] = useState('64');

  const [isTool, setIsTool] = useState(false);
  const [toolType, setToolType] = useState('Sword');
  const [tier, setTier] = useState('Iron');
  const [damage, setDamage] = useState('3');
  const [speed, setSpeed] = useState('-2.4');

  const [isFood, setIsFood] = useState(false);
  const [foodNutrition, setFoodNutrition] = useState('3');
  const [foodSaturation, setFoodSaturation] = useState('0.3');
  const [foodAlwaysEdible, setFoodAlwaysEdible] = useState(false);
  const [foodEffects, setFoodEffects] = useState([]);

  const [isFuel, setIsFuel] = useState(false);
  const [burnTime, setBurnTime] = useState('1600');

  const [hasDurability, setHasDurability] = useState(false);
  const [durability, setDurability] = useState('100');

  const [hasUseDuration, setHasUseDuration] = useState(false);
  const [useDuration, setUseDuration] = useState('72000');

  const [hasTooltip, setHasTooltip] = useState(false);
  const [tooltipNormal, setTooltipNormal] = useState('');
  const [hasHiddenTooltip, setHasHiddenTooltip] = useState(false);
  const [tooltipShiftHint, setTooltipShiftHint] = useState('');
  const [tooltipHidden, setTooltipHidden] = useState('');
  const [useDefaultShiftHint, setUseDefaultShiftHint] = useState(true);

  const [hasRecipe, setHasRecipe] = useState(false);
  const [recipeType, setRecipeType] = useState('shaped');

  const [tags, setTags] = useState('');

  const [hasStates, setHasStates] = useState(false);
  const [stateCount, setStateCount] = useState(2);

  const handleIdChange = (v) => {
    const sanitized = v.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setId(sanitized);
    if (!customConstName) setConstName(sanitized.toUpperCase());
  };

  const addFoodEffect = () => {
    setFoodEffects([...foodEffects, { effect: 'MobEffects.REGENERATION', duration: '600', level: '1', probability: '1.0' }]);
  };

  const removeFoodEffect = (i) => {
    setFoodEffects(foodEffects.filter((_, idx) => idx !== i));
  };

  const updateFoodEffect = (i, key, val) => {
    setFoodEffects(foodEffects.map((e, idx) => idx === i ? { ...e, [key]: val } : e));
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'transparent', color: 'var(--ycs-text)' }}>
      <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', overflowX: 'auto', whiteSpace: 'nowrap' }}>

        <h2 style={{ marginTop: 0, fontSize: '16px', fontWeight: '500', color: 'var(--ycs-text)', marginBottom: '15px' }}>Identity</h2>

        <FieldRow label="Display Name">
          <StringField value={displayName} onChange={setDisplayName} placeholder="Ruby Sword" style={{ width: '100%' }} />
        </FieldRow>

        <FieldRow label="ID">
          <StringField value={id} onChange={handleIdChange} placeholder="ruby_sword" style={{ width: '100%' }} />
        </FieldRow>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
          <input type="checkbox" className="ycs-checkbox" checked={customConstName} onChange={e => setCustomConstName(e.target.checked)} />
          <span style={{ fontSize: '13px', color: 'var(--ycs-text)', userSelect: 'none', minWidth: '120px' }}>Custom Const Name</span>
          <StringField
            value={customConstName ? constName : id.toUpperCase()}
            onChange={v => { if (customConstName) setConstName(v); }}
            placeholder="RUBY_SWORD"
            style={{ width: '100%', opacity: customConstName ? 1 : 0.5 }}
          />
        </div>

        <Section title="Appearance">

          <FieldRow label="Model">
            <StandardDropdownField value={holdingMode} onChange={setHoldingMode} options={HOLDING_MODES} />
          </FieldRow>

          <FieldRow label="Texture">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              padding: '0 8px',
              background: 'transparent',
              border: '1px solid var(--ycs-foreground)',
              borderRadius: 'var(--ycs-radius, 4px)',
              height: '24px',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <div style={{ width: 16, height: 16, background: 'var(--ycs-foreground)', borderRadius: 3, border: '1px dashed var(--ycs-foreground)', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--ycs-text)', opacity: 0.5 }}>none selected</span>
              </div>
              <button className="ycs-button inline" style={{ height: '18px', fontSize: '11px', padding: '0 8px', minWidth: 'auto' }}>set</button>
            </div>
          </FieldRow>

          <CheckboxRow label="Has States" checked={hasStates} onChange={v => { setHasStates(v); if (v && stateCount < 2) setStateCount(2); }} />
          {hasStates && (
            <SubSection>
              <FieldRow label="State Count">
                <NumberInput value={stateCount} onChange={v => setStateCount(Math.max(2, Math.min(16, parseInt(v) || 2)))} />
              </FieldRow>
            </SubSection>
          )}

        </Section>

        <Section title="Properties">

          <CheckboxRow label="Tool" checked={isTool} onChange={v => { setIsTool(v); if (v) { setIsFood(false); setIsFuel(false); if (holdingMode === 'none') setHoldingMode('handheld'); } }} />
          {isTool && (
            <SubSection>
              <FieldRow label="Tool Type">
                <StandardDropdownField value={toolType} onChange={setToolType} options={TOOL_TYPES} />
              </FieldRow>
              <FieldRow label="Tier">
                <StandardDropdownField value={tier} onChange={setTier} options={TIERS} />
              </FieldRow>
              <FieldRow label="Damage">
                <NumberInput value={damage} onChange={setDamage} />
              </FieldRow>
              <FieldRow label="Speed">
                <NumberInput value={speed} onChange={setSpeed} />
              </FieldRow>
            </SubSection>
          )}

          {!isTool && (
            <>
              <CheckboxRow label="Food" checked={isFood} onChange={setIsFood} />
              {isFood && (
                <SubSection>
                  <FieldRow label="Nutrition">
                    <NumberInput value={foodNutrition} onChange={setFoodNutrition} />
                  </FieldRow>
                  <FieldRow label="Saturation">
                    <NumberInput value={foodSaturation} onChange={setFoodSaturation} />
                  </FieldRow>
                  <CheckboxRow label="Always Edible" checked={foodAlwaysEdible} onChange={setFoodAlwaysEdible} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--ycs-text)' }}>Status Effects</span>
                    <button className="ycs-button inline" onClick={addFoodEffect}>+ Add</button>
                  </div>
                  {foodEffects.map((eff, i) => (
                    <div key={i} style={{
                      border: '1px solid var(--ycs-foreground)',
                      borderRadius: 'var(--ycs-radius, 4px)',
                      padding: '10px',
                      marginBottom: '8px',
                      position: 'relative'
                    }}>
                      <button
                        className="ycs-button icon"
                        onClick={() => removeFoodEffect(i)}
                        style={{ position: 'absolute', top: '6px', right: '6px', width: '20px', height: '20px', minWidth: '20px' }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                      <FieldRow label="Effect">
                        <DropdownField value={eff.effect} onChange={v => updateFoodEffect(i, 'effect', v)} options={VANILLA_EFFECTS} />
                      </FieldRow>
                      <FieldRow label="Duration (ticks)">
                        <NumberInput value={eff.duration} onChange={v => updateFoodEffect(i, 'duration', v)} />
                      </FieldRow>
                      <FieldRow label="Level">
                        <NumberInput value={eff.level} onChange={v => updateFoodEffect(i, 'level', v)} />
                      </FieldRow>
                      <FieldRow label="Probability">
                        <NumberInput value={eff.probability} onChange={v => updateFoodEffect(i, 'probability', v)} />
                      </FieldRow>
                    </div>
                  ))}
                </SubSection>
              )}

              <CheckboxRow label="Fuel" checked={isFuel} onChange={setIsFuel} />
              {isFuel && (
                <SubSection>
                  <FieldRow label="Burn Time (ticks)">
                    <NumberInput value={burnTime} onChange={setBurnTime} />
                  </FieldRow>
                </SubSection>
              )}
            </>
          )}

          {!isTool && (
            <FieldRow label="Max Stack Size">
              <NumberInput value={maxStackSize} onChange={v => setMaxStackSize(String(Math.max(1, Math.min(99, parseInt(v) || 64))))} />
            </FieldRow>
          )}

          <CheckboxRow label="Has Durability" checked={hasDurability} onChange={setHasDurability} />
          {hasDurability && (
            <SubSection>
              <FieldRow label="Durability">
                <NumberInput value={durability} onChange={setDurability} />
              </FieldRow>
            </SubSection>
          )}

          <CheckboxRow label="Set Use Duration" checked={hasUseDuration} onChange={setHasUseDuration} />
          {hasUseDuration && (
            <SubSection>
              <FieldRow label="Duration (ticks)">
                <NumberInput value={useDuration} onChange={setUseDuration} />
              </FieldRow>
            </SubSection>
          )}

        </Section>

        <Section title="Creative Tab">
          <FieldRow label="Tab">
            <DropdownField value={creativeTab} onChange={setCreativeTab} options={[
              { label: 'None', value: '' },
              { label: 'COMBAT', value: 'COMBAT' },
              { label: 'TOOLS_AND_UTILITIES', value: 'TOOLS_AND_UTILITIES' },
              { label: 'INGREDIENTS', value: 'INGREDIENTS' },
              { label: 'FOOD_AND_DRINKS', value: 'FOOD_AND_DRINKS' },
              { label: 'BUILDING_BLOCKS', value: 'BUILDING_BLOCKS' },
              { label: 'NATURAL_BLOCKS', value: 'NATURAL_BLOCKS' },
              { label: 'FUNCTIONAL_BLOCKS', value: 'FUNCTIONAL_BLOCKS' },
              { label: 'REDSTONE_BLOCKS', value: 'REDSTONE_BLOCKS' },
              { label: 'COLORED_BLOCKS', value: 'COLORED_BLOCKS' },
              { label: 'SPAWN_EGGS', value: 'SPAWN_EGGS' },
              { label: 'OP_BLOCKS', value: 'OP_BLOCKS' },
            ]} />
          </FieldRow>
        </Section>

        <Section title="Tooltip">
          <CheckboxRow label="Has Tooltip" checked={hasTooltip} onChange={setHasTooltip} />
          {hasTooltip && (
            <SubSection>
              <FieldRow label="Normal Text">
                <StringField value={tooltipNormal} onChange={setTooltipNormal} placeholder="A legendary blade..." style={{ width: '100%' }} />
              </FieldRow>
              <CheckboxRow label="Has Hidden Tooltip" checked={hasHiddenTooltip} onChange={setHasHiddenTooltip} />
              {hasHiddenTooltip && (
                <>
                  <CheckboxRow label="Use Default Shift Hint" checked={useDefaultShiftHint} onChange={setUseDefaultShiftHint} />
                  {!useDefaultShiftHint && (
                    <FieldRow label="Shift Hint Text">
                      <StringField value={tooltipShiftHint} onChange={setTooltipShiftHint} placeholder="Hold Shift for more info" style={{ width: '100%' }} />
                    </FieldRow>
                  )}
                  <FieldRow label="Hidden Text">
                    <StringField value={tooltipHidden} onChange={setTooltipHidden} placeholder="Secret details..." style={{ width: '100%' }} />
                  </FieldRow>
                </>
              )}
            </SubSection>
          )}
        </Section>

        <Section title="Recipe">
          <CheckboxRow label="Has Recipe" checked={hasRecipe} onChange={setHasRecipe} />
          {hasRecipe && (
            <SubSection>
              <FieldRow label="Type">
                <StandardDropdownField value={recipeType} onChange={setRecipeType} options={RECIPE_TYPES} />
              </FieldRow>
              <div style={{ fontSize: '12px', color: 'var(--ycs-text)', opacity: 0.5, marginTop: '8px' }}>
                Recipe grid editor will be added here.
              </div>
            </SubSection>
          )}
        </Section>

        <Section title="Tags">
          <FieldRow label="Item Tags">
            <StringField value={tags} onChange={setTags} placeholder="minecraft:swords, yebisurpg:custom" style={{ width: '100%' }} />
          </FieldRow>
          <div style={{ fontSize: '12px', color: 'var(--ycs-text)', opacity: 0.5 }}>
            Comma-separated tag IDs. Tag picker will be added here.
          </div>
        </Section>

        <Section title="Methods">
          <FieldRow label="Custom Class">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              padding: '0 8px',
              background: 'transparent',
              border: '1px solid var(--ycs-foreground)',
              borderRadius: 'var(--ycs-radius, 4px)',
              height: '24px',
              boxSizing: 'border-box'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--ycs-text)', opacity: 0.5 }}>none added</span>
              <button className="ycs-button inline" style={{ height: '18px', fontSize: '11px', padding: '0 8px', minWidth: 'auto' }}>set</button>
            </div>
          </FieldRow>
        </Section>

        <Section title="Data Components">
          <FieldRow label="Components">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              padding: '0 8px',
              background: 'transparent',
              border: '1px solid var(--ycs-foreground)',
              borderRadius: 'var(--ycs-radius, 4px)',
              height: '24px',
              boxSizing: 'border-box'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--ycs-text)', opacity: 0.5 }}>none added</span>
              <button className="ycs-button inline" style={{ height: '18px', fontSize: '11px', padding: '0 8px', minWidth: 'auto' }}>set</button>
            </div>
          </FieldRow>
        </Section>

      </div>

      {/* Footer */}
      <div style={{
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '8px',
        borderTop: '1px solid var(--ycs-foreground)',
        backgroundColor: 'transparent',
        flexShrink: 0
      }}>
        <button className="ycs-button primary" disabled={!id.trim()}>Save</button>
        <button className="ycs-button">Cancel</button>
      </div>
    </div>
  );
}
