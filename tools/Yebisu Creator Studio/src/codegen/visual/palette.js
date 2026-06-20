import { LINK_ENTITY, LINK_NUMBER, LINK_TEXT, LINK_LOGIC } from './compiler.js';
import { BLOCK_DEFS } from './blockDefs.js';

export const PEHKUI_SCALES = [
  { id:"yebisurpg:scale.base",                    label:"Base Scale" },
  { id:"yebisurpg:scale.width",                   label:"Width Scale" },
  { id:"yebisurpg:scale.height",                  label:"Height Scale" },
  { id:"yebisurpg:scale.eye_height",              label:"Eye Height Scale" },
  { id:"yebisurpg:scale.hitbox_width",            label:"Hitbox Width" },
  { id:"yebisurpg:scale.hitbox_height",           label:"Hitbox Height" },
  { id:"yebisurpg:scale.model_width",             label:"Model Width" },
  { id:"yebisurpg:scale.model_height",            label:"Model Height" },
  { id:"yebisurpg:scale.third_person",            label:"Third-Person Distance" },
  { id:"yebisurpg:scale.motion",                  label:"Motion Scale" },
  { id:"yebisurpg:scale.falling",                 label:"Falling Speed Scale" },
  { id:"yebisurpg:scale.step_height",             label:"Step Height Scale" },
  { id:"yebisurpg:scale.view_bobbing",            label:"View Bobbing Scale" },
  { id:"yebisurpg:scale.visibility",              label:"Visibility Scale" },
  { id:"yebisurpg:scale.jump_height",             label:"Jump Height Scale" },
  { id:"yebisurpg:scale.flight",                  label:"Flight Speed Scale" },
  { id:"yebisurpg:scale.reach",                   label:"Reach Scale" },
  { id:"yebisurpg:scale.block_reach",             label:"Block Reach Scale" },
  { id:"yebisurpg:scale.entity_reach",            label:"Entity Reach Scale" },
  { id:"yebisurpg:scale.mining_speed",            label:"Mining Speed Scale" },
  { id:"yebisurpg:scale.attack_speed",            label:"Attack Speed Scale" },
  { id:"yebisurpg:scale.knockback",               label:"Knockback Scale" },
  { id:"yebisurpg:scale.attack",                  label:"Attack Scale" },
  { id:"yebisurpg:scale.defense",                 label:"Defense Scale" },
  { id:"yebisurpg:scale.health",                  label:"Health Scale" },
  { id:"yebisurpg:scale.drops",                   label:"Drops Scale" },
  { id:"yebisurpg:scale.held_item",               label:"Held Item Scale" },
  { id:"yebisurpg:scale.projectiles",             label:"Projectile Scale" },
  { id:"yebisurpg:scale.explosions",              label:"Explosion Scale" },
];

export const VANILLA_ATTRIBUTES = [
  { id:"generic.max_health",                    label:"Max Health" },
  { id:"generic.max_absorption",                label:"Max Absorption" },
  { id:"generic.attack_damage",                 label:"Attack Damage" },
  { id:"generic.attack_speed",                  label:"Attack Speed" },
  { id:"generic.attack_knockback",              label:"Attack Knockback" },
  { id:"generic.armor",                         label:"Armor" },
  { id:"generic.armor_toughness",               label:"Armor Toughness" },
  { id:"generic.knockback_resistance",          label:"Knockback Resistance" },
  { id:"generic.movement_speed",                label:"Movement Speed" },
  { id:"generic.flying_speed",                  label:"Flying Speed" },
  { id:"generic.follow_range",                  label:"Follow Range" },
  { id:"generic.luck",                          label:"Luck" },
  { id:"generic.gravity",                       label:"Gravity" },
  { id:"generic.jump_strength",                 label:"Jump Strength" },
  { id:"generic.scale",                         label:"Scale" },
  { id:"generic.step_height",                   label:"Step Height" },
  { id:"generic.safe_fall_distance",            label:"Safe Fall Distance" },
  { id:"generic.fall_damage_multiplier",        label:"Fall Damage Multiplier" },
  { id:"generic.burning_time",                  label:"Burning Time" },
  { id:"generic.explosion_knockback_resistance",label:"Explosion Knockback Resistance" },
  { id:"generic.movement_efficiency",           label:"Movement Efficiency" },
  { id:"generic.oxygen_bonus",                  label:"Oxygen Bonus" },
  { id:"generic.water_movement_efficiency",     label:"Water Movement Efficiency" },
  { id:"player.block_break_speed",              label:"Block Break Speed" },
  { id:"player.block_interaction_range",        label:"Block Interaction Range" },
  { id:"player.entity_interaction_range",       label:"Entity Interaction Range" },
  { id:"player.mining_efficiency",              label:"Mining Efficiency" },
  { id:"player.sneaking_speed",                 label:"Sneaking Speed" },
  { id:"player.submerged_mining_speed",         label:"Submerged Mining Speed" },
  { id:"player.sweeping_damage_ratio",          label:"Sweeping Damage Ratio" },
  { id:"zombie.spawn_reinforcements",           label:"Spawn Reinforcements Chance" },
];

export const PALETTE_BLOCKS = [];

export function buildPalette(variables, modAttributes) {
  const result = [...PALETTE_BLOCKS];

  const existingOpcodes = new Set(result.flatMap(c => [...(c.data||[]), ...(c.actions||[])]).map(b => b.opcode));
  const jsonCats = {};
  for (const bdef of BLOCK_DEFS) {
    if (existingOpcodes.has(bdef.opcode)) continue;
    if (!jsonCats[bdef.category]) jsonCats[bdef.category] = { data: [], actions: [] };
    const entry = {
      opcode: bdef.opcode,
      label: bdef.paletteLabel || bdef.label.replace(/\[[\w:.]+\]/g, '').trim() || bdef.opcode,
      linkType: bdef.linkType || undefined,
      isAction: bdef.isAction || false,
      hint: bdef.hint,
      slotDefs: [],
    };
    if (bdef.sub === "data") jsonCats[bdef.category].data.push(entry);
    else jsonCats[bdef.category].actions.push(entry);
  }
  for (const [cat, items] of Object.entries(jsonCats)) {
    const existing = result.find(c => c.category === cat);
    if (existing) {
      existing.data.push(...items.data);
      existing.actions.push(...items.actions);
    } else {
      result.push({ category: cat, data: items.data, actions: items.actions });
    }
  }

  const merged = [];
  for (const cat of result) {
    const existing = merged.find(c => c.category === cat.category);
    if (existing) {
      existing.data.push(...(cat.data||[]));
      existing.actions.push(...(cat.actions||[]));
    } else {
      merged.push({ category: cat.category, data: [...(cat.data||[])], actions: [...(cat.actions||[])] });
    }
  }
  return merged;
}
