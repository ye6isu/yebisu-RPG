export const BLOCK_DEFS = [

  // ═══════════════════════════════════════════════════════════════════════════
  // HUD — a real, visible, chainable action block placed after Start in a HUD
  // widget's value-link graph. Whatever's plugged into its [value:number] slot
  // becomes the widget's bound value — HudLanding.jsx reads this node's `value`
  // slot directly at Save time (never actually compiled/executed as an action
  // the way normal chain blocks are, since a HUD value-link graph is only ever
  // evaluated for its single expression, not run as a statement sequence).
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "hud.return_value",
    category: "HUD", sub: "actions",
    isAction: true,
    paletteLabel: "Return Number",
    label: "Return Number [value:number]",
    hint: "The value this HUD widget reads — plug in any number-producing block (Get Entity Variable, Get Attribute, math, etc.)",
    color: "#4d65b4",
    codegen: {
      type: "action",
      template: "", // never actually compiled; HudLanding.jsx reads this node's `value` slot directly
      slotDefaults: { value: { opcode: "number.literal", fields: { value: "0" } } },
    },
  },
  {
    opcode: "hud.return_bool",
    category: "HUD", sub: "actions",
    isAction: true,
    paletteLabel: "Return Bool",
    label: "Return Bool [value:logic]",
    hint: "The true/false condition this HUD widget's visibility gate reads — plug in any boolean-producing block (Get Entity Variable, comparisons, etc.)",
    color: "#6494a4",
    codegen: {
      type: "action",
      template: "", // never actually compiled; HudLanding.jsx reads this node's `value` slot directly
      slotDefaults: { value: { opcode: "logic.true" } },
    },
  },
  {
    opcode: "hud.return_text",
    category: "HUD", sub: "actions",
    isAction: true,
    paletteLabel: "Return Text",
    label: "Return Text [value:text]",
    hint: "The literal text this HUD Text widget reads — plug in any text-producing block (Convert to Text, Get Entity Variable, string concat, etc.)",
    color: "#5ba558",
    codegen: {
      type: "action",
      template: "", // never actually compiled; HudLanding.jsx reads this node's `value` slot directly
      slotDefaults: { value: { opcode: "text.literal", fields: { value: "" } } },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTITY — Data
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "entity.event",
    category: "Entity", sub: "data",
    linkType: "entity",
    label: "Event Entity",
    hint: "Entity that triggered this method",
    color: "#30e1b9",
    codegen: {
      type: "value",
      methodVariants: {
        "useOn": "context.getPlayer()",
        "use": "player",
        "interactLivingEntity": "player",
        "continuousUse": "livingEntity",
        "finishUsingItem": "livingEntity",
        "releaseUsing": "livingEntity",
        "inventoryTick": "entity",
        "hurtEnemy": "attacker",
        "onEffectStarted": "livingEntity",
        "onEffectTick": "livingEntity",
        "onEffectEnd": "livingEntity",
        "*": "player",
      },
    },
  },
  {
    opcode: "entity.target",
    category: "Entity", sub: "data",
    linkType: "entity",
    label: "Target Entity",
    hint: "Target entity (hurtEnemy/interactLivingEntity)",
    color: "#30e1b9",
    codegen: {
      type: "value",
      methodVariants: {
        "hurtEnemy": "target",
        "interactLivingEntity": "interactionTarget",
        "*": "target",
      },
    },
  },
  {
    opcode: "entity.is_crouching",
    category: "Entity", sub: "data",
    linkType: "logic",
    label: "Is [entity:entity] Crouching?",
    hint: "True if the entity is crouching/sneaking",
    color: "#6494a4",
    codegen: {
      type: "value",
      expr: "({{entity}}.isCrouching())",
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "entity.position",
    category: "Entity", sub: "data",
    linkType: "number",
    paletteLabel: "Position",
    label: "Get [axis:dropdown] Position of [entity:entity]",
    hint: "Get X, Y, or Z position of an entity",
    color: "#4d65b4",
    transparent: true,
    fields: {
      axis: {
        type: "dropdown",
        compact: true,
        options: [
          { value: "x", label: "X" },
          { value: "y", label: "Y" },
          { value: "z", label: "Z" },
        ],
        default: "x",
      },
    },
    codegen: {
      type: "value",
      variants: {
        "axis == 'x'": { expr: "({{entity}}.getX())" },
        "axis == 'y'": { expr: "({{entity}}.getY())" },
        "axis == 'z'": { expr: "({{entity}}.getZ())" },
      },
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "entity.position_offset",
    category: "Entity", sub: "data",
    linkType: "number",
    paletteLabel: "Position Offset",
    label: "Get [axis:dropdown] Position offset by [distance:number] from [entity:entity]",
    hint: "Get position offset along look direction from entity",
    color: "#4d65b4",
    transparent: true,
    fields: {
      axis: {
        type: "dropdown",
        compact: true,
        options: [
          { value: "x", label: "X" },
          { value: "y", label: "Y" },
          { value: "z", label: "Z" },
        ],
        default: "x",
      },
    },
    codegen: {
      type: "value",
      variants: {
        "axis == 'x'": { expr: "({{entity}}.getX() + {{entity}}.getLookAngle().normalize().x * (double)({{distance}}))" },
        "axis == 'y'": { expr: "({{entity}}.getY() + {{entity}}.getEyeHeight() + {{entity}}.getLookAngle().normalize().y * (double)({{distance}}))" },
        "axis == 'z'": { expr: "({{entity}}.getZ() + {{entity}}.getLookAngle().normalize().z * (double)({{distance}}))" },
      },
      slotDefaults: {
        distance: { opcode: "number.literal", fields: { value: "0" } },
        entity: { opcode: "entity.event" },
      },
    },
  },
  {
    opcode: "entity.look_dir",
    category: "Entity", sub: "data",
    linkType: "number",
    paletteLabel: "Look Direction",
    label: "Get [axis:dropdown] Look Direction of [entity:entity]",
    hint: "Get X, Y, or Z component of look direction (server)",
    color: "#4d65b4",
    transparent: true,
    fields: {
      axis: {
        type: "dropdown",
        compact: true,
        options: [
          { value: "x", label: "X" },
          { value: "y", label: "Y" },
          { value: "z", label: "Z" },
        ],
        default: "x",
      },
    },
    codegen: {
      type: "value",
      variants: {
        "axis == 'x'": { expr: "({{entity}}.getLookAngle().x)" },
        "axis == 'y'": { expr: "({{entity}}.getLookAngle().y)" },
        "axis == 'z'": { expr: "({{entity}}.getLookAngle().z)" },
      },
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "vector.normalize",
    category: "Entity", sub: "data",
    linkType: "number",
    paletteLabel: "Direction",
    label: "Get Normalized Direction [axis:dropdown] from x1 [x1:number] y1 [y1:number] z1 [z1:number] to x2 [x2:number] y2 [y2:number] z2 [z2:number]",
    hint: "Component of normalized direction vector from point A to point B",
    color: "#4d65b4",
    transparent: true,
    fields: {
      axis: {
        type: "dropdown",
        compact: true,
        options: [
          { value: "x", label: "X" },
          { value: "y", label: "Y" },
          { value: "z", label: "Z" },
        ],
        default: "x",
      },
      multiline: { type: "hidden", default: false },
    },
    settings: {
      multiline: { type: "checkbox", label: "New Line per Link", default: false },
    },
    codegen: {
      type: "value",
      slotDefaults: {
        x1: { opcode: "number.literal", fields: { value: "0" } },
        y1: { opcode: "number.literal", fields: { value: "0" } },
        z1: { opcode: "number.literal", fields: { value: "0" } },
        x2: { opcode: "number.literal", fields: { value: "0" } },
        y2: { opcode: "number.literal", fields: { value: "0" } },
        z2: { opcode: "number.literal", fields: { value: "0" } },
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTITY — Actions
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "effect.apply",
    category: "Entity", sub: "actions",
    isAction: true,
    label: "Add Effect [effect:dropdown.effects] to [entity:entity] with duration [duration:number] with level [level:number] particles [showParticles:checkbox]",
    hint: "Apply a potion effect",
    color: "#c46c94",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof LivingEntity {{bind:livingTarget}}) { {{bind:livingTarget}}.addEffect(new MobEffectInstance({{effect}}, (int)({{duration}}), Math.max(0,(int)({{level}})-1), false, {{showParticles}})); }",
      imports: [
        "net.minecraft.world.entity.LivingEntity",
        "net.minecraft.world.effect.MobEffectInstance",
        "net.minecraft.world.effect.MobEffects",
      ],
      conditionalImports: {
        "effect contains 'ModEffects.'": ["net.ye6isu.yebisuRPG.effect.ModEffects"],
      },
      slotDefaults: {
        entity: { opcode: "entity.event" },
        duration: { opcode: "number.literal", fields: { value: "0" } },
        level: { opcode: "number.literal", fields: { value: "0" } },
      },
    },
    fields: {
      effect: { type: "dropdown", source: "effects", default: "MobEffects.REGENERATION" },
      showParticles: { type: "checkbox", default: true },
    },
  },
  {
    opcode: "entity.get_health",
    category: "Entity", sub: "data",
    linkType: "number",
    label: "Get Health of [entity:entity]",
    hint: "Get an entity's current health",
    color: "#4d65b4",
    codegen: {
      type: "value",
      expr: "({{entity}} instanceof LivingEntity {{bind:livingTarget}} ? {{bind:livingTarget}}.getHealth() : 0.0)",
      imports: [
        "net.minecraft.world.entity.LivingEntity",
      ],
      slotDefaults: {
        entity: { opcode: "entity.event" },
      },
    },
  },
  {
    opcode: "entity.set_health",
    category: "Entity", sub: "actions",
    isAction: true,
    label: "Set Health to [amount:number] for [entity:entity]",
    hint: "Set an entity's current health (clamped between 0 and its max health)",
    color: "#c46c94",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof LivingEntity {{bind:livingTarget}}) { {{bind:livingTarget}}.setHealth((float)Math.max(0.0, Math.min((double)({{bind:livingTarget}}.getMaxHealth()), (double)({{amount}})))); }",
      imports: [
        "net.minecraft.world.entity.LivingEntity",
      ],
      slotDefaults: {
        entity: { opcode: "entity.event" },
        amount: { opcode: "number.literal", fields: { value: "20" } },
      },
    },
  },
  {
    opcode: "entity.apply_motion",
    category: "Entity", sub: "actions",
    isAction: true,
    label: "Add Velocity X [x:number] Y [y:number] Z [z:number] to [entity:entity] [mode:dropdown]",
    hint: "Add velocity to an entity (X/Y/Z). Set mode: add=impulse, set=override velocity.",
    color: "#c46c94",
    fields: {
      mode: {
        type: "dropdown",
        options: [
          { value: "add", label: "Add (impulse)" },
          { value: "set", label: "Set (override)" },
        ],
        default: "add",
      },
    },
    codegen: {
      type: "action",
      variants: {
        // setDeltaMovement() alone only updates server-side state — unlike push() (which sets
        // NeoForge/vanilla's own hasImpulse flag internally), it does nothing to tell the
        // client the entity's velocity changed. Without hurtMarked = true right after it, a
        // client (authoritative over its own reported movement in normal gravity-affected
        // play) never receives the new velocity and the "launch" has no visible effect —
        // confirmed against DashUtil.java, the mod's own known-working velocity-based
        // movement, which sets hurtMarked = true on every tick it calls setDeltaMovement.
        "mode == 'set'": { template: "{{entity}}.setDeltaMovement((double)({{x}}), (double)({{y}}), (double)({{z}})); {{entity}}.hurtMarked = true;" },
        "mode == 'add'": { template: "{{entity}}.push((double)({{x}}), (double)({{y}}), (double)({{z}}));" },
      },
      slotDefaults: {
        entity: { opcode: "entity.event" },
        x: { opcode: "number.literal", fields: { value: "0" } },
        y: { opcode: "number.literal", fields: { value: "0" } },
        z: { opcode: "number.literal", fields: { value: "0" } },
      },
    },
  },
  {
    opcode: "entity.dash",
    category: "Entity", sub: "actions",
    isAction: true,
    label: "Dash [entity:entity] X [x:number] Y [y:number] Z [z:number] distance [distance:number] over [ticks:number] ticks [easing:dropdown]",
    hint: "Linear dash in a direction — no gravity, smooth velocity-based",
    color: "#c46c94",
    fields: {
      easing: {
        type: "dropdown",
        options: [
          { value: "LINEAR", label: "Linear" },
          { value: "EASE_IN", label: "Ease In" },
          { value: "EASE_OUT", label: "Ease Out" },
        ],
        default: "LINEAR",
      },
      hasCollision: { type: "hidden", default: false },
      hasThen: { type: "hidden", default: false },
      collisionShape: { type: "dropdown", options: [{ value: "sphere", label: "Sphere" }, { value: "box", label: "Box" }], default: "sphere" },
      showParticles: { type: "hidden", default: false },
    },
    settings: {
      showParticles: { type: "checkbox", label: "Visual Particles", default: false },
      _actions: [
        { label: "+ On Collision", labelOn: "− On Collision", labelOff: "+ On Collision", onClick: { field: "hasCollision", action: "toggle" } },
        { label: "+ Then", labelOn: "− Then", labelOff: "+ Then", onClick: { field: "hasThen", action: "toggle" } },
      ],
    },
    body: { do0: { label: null } },
    codegen: {
      type: "compound",
      imports: [
        "net.ye6isu.yebisuRPG.util.DashUtil",
        "net.minecraft.world.entity.LivingEntity",
      ],
      slotDefaults: {
        entity: { opcode: "entity.event" },
        x: { opcode: "number.literal", fields: { value: "0" } },
        y: { opcode: "number.literal", fields: { value: "0" } },
        z: { opcode: "number.literal", fields: { value: "0" } },
        distance: { opcode: "number.literal", fields: { value: "10" } },
        ticks: { opcode: "number.literal", fields: { value: "5" } },
        colRadius: { opcode: "number.literal", fields: { value: "1.5" } },
        colWidth: { opcode: "number.literal", fields: { value: "3" } },
        colHeight: { opcode: "number.literal", fields: { value: "3" } },
        colDepth: { opcode: "number.literal", fields: { value: "3" } },
      },
    },
  },
  {
    opcode: "entity.is_dashing",
    category: "Entity", sub: "data",
    linkType: "logic",
    paletteLabel: "Is Dashing?",
    label: "Is [entity:entity] Dashing?",
    hint: "True if the entity is currently mid-dash",
    color: "#6494a4",
    codegen: {
      type: "value",
      expr: "(net.ye6isu.yebisuRPG.util.DashUtil.isDashing({{entity}}))",
      imports: ["net.ye6isu.yebisuRPG.util.DashUtil"],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "entity.cancel_dash",
    category: "Entity", sub: "actions",
    isAction: true,
    label: "Cancel Dash [entity:entity] [stopVelocity:dropdown]",
    hint: "Stop the entity's current dash immediately. Stop Velocity = instant hard stop (Poppy W style). Keep Velocity = momentum carries through into normal falling/sliding.",
    color: "#c46c94",
    fields: {
      stopVelocity: {
        type: "dropdown",
        options: [
          { value: "true", label: "Stop Velocity" },
          { value: "false", label: "Keep Velocity" },
        ],
        default: "true",
      },
    },
    codegen: {
      type: "action",
      template: "net.ye6isu.yebisuRPG.util.DashUtil.cancel({{entity}}, {{stopVelocity}});",
      imports: ["net.ye6isu.yebisuRPG.util.DashUtil"],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "entity.deal_damage",
    category: "Entity", sub: "actions",
    isAction: true,
    label: "Deal [amount:number] [dmgType:dropdown] Damage to [target:entity] from [attacker:entity]",
    hint: "Deal damage to an entity. Attacker gets kill credit. Use 0/0/0 look direction blocks for no attacker.",
    color: "#c46c94",
    fields: {
      dmgType: {
        type: "dropdown",
        options: [
          { value: "mob", label: "Melee" },
          { value: "player", label: "Player" },
          { value: "magic", label: "Magic" },
          { value: "indirect_magic", label: "Indirect Magic" },
          { value: "thorns", label: "Thorns" },
          { value: "generic", label: "Generic" },
          { value: "fall", label: "Fall" },
          { value: "fire", label: "Fire" },
          { value: "lava", label: "Lava" },
          { value: "drown", label: "Drown" },
          { value: "freeze", label: "Freeze" },
          { value: "wither", label: "Wither" },
          { value: "starve", label: "Starve" },
        ],
        default: "mob",
      },
    },
    codegen: {
      type: "action",
      variants: {
        "dmgType == 'mob'": { template: "if ({{target}} instanceof LivingEntity {{bind:livingTarget}}) { {{bind:livingTarget}}.hurt({{bind:livingTarget}}.level().damageSources().mobAttack({{attacker}} instanceof LivingEntity {{bind:livingAttacker}} ? {{bind:livingAttacker}} : null), (float)({{amount}})); }" },
        "dmgType == 'player'": { template: "if ({{target}} instanceof LivingEntity {{bind:livingTarget}} && {{attacker}} instanceof net.minecraft.world.entity.player.Player {{bind:playerAttacker}}) { {{bind:livingTarget}}.hurt({{bind:livingTarget}}.level().damageSources().playerAttack({{bind:playerAttacker}}), (float)({{amount}})); }" },
        "dmgType == 'magic'": { template: "if ({{target}} instanceof LivingEntity {{bind:livingTarget}}) { {{bind:livingTarget}}.hurt({{bind:livingTarget}}.level().damageSources().magic(), (float)({{amount}})); }" },
        "dmgType == 'indirect_magic'": { template: "if ({{target}} instanceof LivingEntity {{bind:livingTarget}}) { {{bind:livingTarget}}.hurt({{bind:livingTarget}}.level().damageSources().indirectMagic({{attacker}}, {{attacker}}), (float)({{amount}})); }" },
        "dmgType == 'thorns'": { template: "if ({{target}} instanceof LivingEntity {{bind:livingTarget}}) { {{bind:livingTarget}}.hurt({{bind:livingTarget}}.level().damageSources().thorns({{attacker}}), (float)({{amount}})); }" },
        "dmgType == 'generic'": { template: "if ({{target}} instanceof LivingEntity {{bind:livingTarget}}) { {{bind:livingTarget}}.hurt({{bind:livingTarget}}.level().damageSources().generic(), (float)({{amount}})); }" },
        "dmgType == 'fall'": { template: "if ({{target}} instanceof LivingEntity {{bind:livingTarget}}) { {{bind:livingTarget}}.hurt({{bind:livingTarget}}.level().damageSources().fall(), (float)({{amount}})); }" },
        "dmgType == 'fire'": { template: "if ({{target}} instanceof LivingEntity {{bind:livingTarget}}) { {{bind:livingTarget}}.hurt({{bind:livingTarget}}.level().damageSources().onFire(), (float)({{amount}})); }" },
        "dmgType == 'lava'": { template: "if ({{target}} instanceof LivingEntity {{bind:livingTarget}}) { {{bind:livingTarget}}.hurt({{bind:livingTarget}}.level().damageSources().lava(), (float)({{amount}})); }" },
        "dmgType == 'drown'": { template: "if ({{target}} instanceof LivingEntity {{bind:livingTarget}}) { {{bind:livingTarget}}.hurt({{bind:livingTarget}}.level().damageSources().drown(), (float)({{amount}})); }" },
        "dmgType == 'freeze'": { template: "if ({{target}} instanceof LivingEntity {{bind:livingTarget}}) { {{bind:livingTarget}}.hurt({{bind:livingTarget}}.level().damageSources().freeze(), (float)({{amount}})); }" },
        "dmgType == 'wither'": { template: "if ({{target}} instanceof LivingEntity {{bind:livingTarget}}) { {{bind:livingTarget}}.hurt({{bind:livingTarget}}.level().damageSources().wither(), (float)({{amount}})); }" },
        "dmgType == 'starve'": { template: "if ({{target}} instanceof LivingEntity {{bind:livingTarget}}) { {{bind:livingTarget}}.hurt({{bind:livingTarget}}.level().damageSources().starve(), (float)({{amount}})); }" },
      },
      imports: [
        "net.minecraft.world.entity.LivingEntity",
      ],
      slotDefaults: {
        amount: { opcode: "number.literal", fields: { value: "1" } },
        target: { opcode: "entity.event" },
        attacker: { opcode: "entity.event" },
      },
    },
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // PLAYER — First Person Animations (Actions)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "anim.firstperson.play",
    category: "Player", sub: "First Person Animations",
    isAction: true,
    label: "Play First Person Animation [animName:text] speed [playbackSpeed:number] from file [filePath:text] for [entity:entity]",
    hint: "Play first person animation for entity with playback speed from file",
    color: "#3a5c3a",
    settings: {
      handMask: {
        type: "maskCheckboxGroup", default: 0,
        groups: [
          { bits: [
            { label: "Hand Skip Right", bit: 512 },
            { label: "Hand Skip Left", bit: 1024 },
          ] },
        ],
      },
    },
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity animEntity && !level.isClientSide()) {\n    AnimationAPI.triggerAnimation(animEntity,\n        AnimationCategory.ENTITY,\n        {{quote:animName}},\n        {{quote:filePath}},\n        {{float:playbackSpeed}}, 0, {{handMask}}, 0);\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.ye6isu.yebisuRPG.animation.AnimationCategory",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: {
        animName: { opcode: "text.literal", fields: { value: "" } },
        entity: { opcode: "entity.event" },
        playbackSpeed: { opcode: "number.literal", fields: { value: "1" } },
        filePath: { opcode: "text.literal", fields: { value: "" } },
      },
    },
  },
  {
    opcode: "anim.firstperson.stop",
    category: "Player", sub: "First Person Animations",
    isAction: true,
    label: "Stop First Person Animation for [entity:entity]",
    hint: "Stop any playing first-person animation on an entity",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity animEntity && !level.isClientSide()) {\n    AnimationAPI.stopFirstPersonAnimation(animEntity);\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "anim.firstperson.pause",
    category: "Player", sub: "First Person Animations",
    isAction: true,
    label: "Pause First Person Animation for [entity:entity]",
    hint: "Freeze the playing first-person animation at its current position",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity animEntity && !level.isClientSide()) {\n    AnimationAPI.pauseAnimation(animEntity,\n        AnimationCategory.ENTITY);\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.ye6isu.yebisuRPG.animation.AnimationCategory",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "anim.firstperson.resume",
    category: "Player", sub: "First Person Animations",
    isAction: true,
    label: "Resume First Person Animation for [entity:entity]",
    hint: "Resume a paused first-person animation",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity animEntity && !level.isClientSide()) {\n    AnimationAPI.resumeAnimation(animEntity,\n        AnimationCategory.ENTITY);\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.ye6isu.yebisuRPG.animation.AnimationCategory",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "anim.handpose.set",
    category: "Player", sub: "First Person Animations",
    isAction: true,
    label: "Set First Person Hand Pose [animName:text] from [filePath:text] for [entity:entity]",
    hint: "Set first person hand pose",
    color: "#3a5c3a",
    settings: {
      allowVanillaActions: { type: "checkbox", label: "Allow Vanilla Actions", default: false },
    },
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity animEntity && !level.isClientSide()) {\n    AnimationAPI.setFirstPersonHandPose(animEntity,\n        {{quote:animName}},\n        {{quote:filePath}}, {{allowVanillaActions}});\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: {
        animName: { opcode: "text.literal", fields: { value: "" } },
        entity: { opcode: "entity.event" },
        filePath: { opcode: "text.literal", fields: { value: "" } },
      },
    },
  },
  {
    opcode: "anim.handpose.reset",
    category: "Player", sub: "First Person Animations",
    isAction: true,
    label: "Reset First Person Hand Pose for [entity:entity]",
    hint: "Reset first person hand pose to vanilla default",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity animEntity && !level.isClientSide()) {\n    AnimationAPI.resetFirstPersonHandPose(animEntity);\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAYER — Third Person Animations (Actions)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "anim.thirdperson.play",
    category: "Player", sub: "Third Person Animations",
    isAction: true,
    label: "Play Third Person Animation [animName:text] speed [playbackSpeed:number] from file [filePath:text] for [entity:entity]",
    hint: "Play third person animation for entity with playback speed from file",
    color: "#3a5c3a",
    settings: {
      lookAtMask: {
        type: "maskCheckboxGroup", default: 0, label: "Look At (Camera)",
        groups: [
          { label: "Head", bits: [{ label: "Yaw", bit: 1 }, { label: "Pitch", bit: 2 }] },
          { label: "Torso", bits: [{ label: "Yaw", bit: 4 }, { label: "Pitch", bit: 8 }] },
          { label: "Right Arm", bits: [{ label: "Yaw", bit: 16 }, { label: "Pitch", bit: 32 }] },
          { label: "Left Arm", bits: [{ label: "Yaw", bit: 64 }, { label: "Pitch", bit: 128 }] },
          { label: "Right Leg", bits: [{ label: "Yaw", bit: 256 }, { label: "Pitch", bit: 512 }] },
          { label: "Left Leg", bits: [{ label: "Yaw", bit: 1024 }, { label: "Pitch", bit: 2048 }] },
          { label: "Root", bits: [{ label: "Yaw", bit: 4096 }, { label: "Pitch", bit: 8192 }] },
        ],
      },
      vanillaMask: {
        type: "maskCheckboxGroup", default: 0, label: "Let Vanilla Control",
        groups: [
          { label: "Body Parts", bits: [
            { label: "Head", bit: 1 }, { label: "Torso", bit: 2 },
            { label: "Right Arm", bit: 4 }, { label: "Left Arm", bit: 8 },
            { label: "Right Leg", bit: 16 }, { label: "Left Leg", bit: 32 },
          ] },
          { label: "Poses", bits: [
            { label: "Disable Custom Crouch", bit: 64 },
            { label: "Disable Prone", bit: 128 },
            { label: "Disable Custom Sitting", bit: 256 },
          ] },
        ],
      },
      handMask: {
        type: "maskCheckboxGroup", default: 0, label: "Hand Skip (Fall Back to TP Pose)",
        groups: [
          { bits: [
            { label: "Right Arm", bit: 512 },
            { label: "Left Arm", bit: 1024 },
          ] },
        ],
      },
      firstPersonLimbMask: {
        type: "maskCheckboxGroup", default: 0, label: "Show in First Person (camera-anchored mannequin, eye-pivoted)",
        groups: [
          { bits: [
            { label: "Right Arm", bit: 1 }, { label: "Left Arm", bit: 2 },
            { label: "Right Leg", bit: 4 }, { label: "Left Leg", bit: 8 },
          ] },
          { label: "Hide Vanilla Arm (First-Person Empty Hand)", bits: [
            { label: "Right Arm", bit: 16 }, { label: "Left Arm", bit: 32 },
          ] },
        ],
      },
    },
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity animEntity && !level.isClientSide()) {\n    AnimationAPI.triggerAnimation(animEntity,\n        AnimationCategory.ENTITY_THIRD_PERSON,\n        {{quote:animName}},\n        {{quote:filePath}},\n        {{float:playbackSpeed}}, {{lookAtMask}}, {{vanillaMask}} | {{handMask}}, {{firstPersonLimbMask}});\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",

        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: {
        animName: { opcode: "text.literal", fields: { value: "" } },
        entity: { opcode: "entity.event" },
        playbackSpeed: { opcode: "number.literal", fields: { value: "0" } },
        filePath: { opcode: "text.literal", fields: { value: "" } },
      },
    },
  },
  {
    opcode: "anim.thirdperson.stop",
    category: "Player", sub: "Third Person Animations",
    isAction: true,
    label: "Stop Third Person Animation for [entity:entity]",
    hint: "Stop any playing third-person animation on an entity",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity animEntity && !level.isClientSide()) {\n    AnimationAPI.stopThirdPersonAnimation(animEntity);\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",

        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "anim.thirdperson.pause",
    category: "Player", sub: "Third Person Animations",
    isAction: true,
    label: "Pause Third Person Animation for [entity:entity]",
    hint: "Freeze the playing third-person animation at its current position",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity animEntity && !level.isClientSide()) {\n    AnimationAPI.pauseThirdPersonAnimation(animEntity);\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",

        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "anim.thirdperson.resume",
    category: "Player", sub: "Third Person Animations",
    isAction: true,
    label: "Resume Third Person Animation for [entity:entity]",
    hint: "Resume a paused third-person animation",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity animEntity && !level.isClientSide()) {\n    AnimationAPI.resumeThirdPersonAnimation(animEntity);\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",

        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "anim.tppose.set",
    category: "Player", sub: "Third Person Animations",
    isAction: true,
    label: "Set Third Person Pose [animName:text] from [filePath:text] for [entity:entity]",
    hint: "Set third person pose",
    color: "#3a5c3a",
    settings: {
      lookAtMask: {
        type: "maskCheckboxGroup", default: 0, label: "Look At (Camera)",
        groups: [
          { label: "Head", bits: [{ label: "Yaw", bit: 1 }, { label: "Pitch", bit: 2 }] },
          { label: "Torso", bits: [{ label: "Yaw", bit: 4 }, { label: "Pitch", bit: 8 }] },
          { label: "Right Arm", bits: [{ label: "Yaw", bit: 16 }, { label: "Pitch", bit: 32 }] },
          { label: "Left Arm", bits: [{ label: "Yaw", bit: 64 }, { label: "Pitch", bit: 128 }] },
          { label: "Right Leg", bits: [{ label: "Yaw", bit: 256 }, { label: "Pitch", bit: 512 }] },
          { label: "Left Leg", bits: [{ label: "Yaw", bit: 1024 }, { label: "Pitch", bit: 2048 }] },
          { label: "Root", bits: [{ label: "Yaw", bit: 4096 }, { label: "Pitch", bit: 8192 }] },
        ],
      },
      vanillaMask: {
        type: "maskCheckboxGroup", default: 0, label: "Let Vanilla Control",
        groups: [
          { label: "Body Parts", bits: [
            { label: "Head", bit: 1 }, { label: "Torso", bit: 2 },
            { label: "Right Arm", bit: 4 }, { label: "Left Arm", bit: 8 },
            { label: "Right Leg", bit: 16 }, { label: "Left Leg", bit: 32 },
          ] },
          { label: "Poses", bits: [
            { label: "Disable Custom Crouch", bit: 64 },
            { label: "Disable Prone", bit: 128 },
            { label: "Disable Custom Sitting", bit: 256 },
          ] },
        ],
      },
      firstPersonLimbMask: {
        type: "maskCheckboxGroup", default: 0, label: "Show in First Person (camera-anchored mannequin, eye-pivoted)",
        groups: [
          { bits: [
            { label: "Right Arm", bit: 1 }, { label: "Left Arm", bit: 2 },
            { label: "Right Leg", bit: 4 }, { label: "Left Leg", bit: 8 },
          ] },
          { label: "Hide Vanilla Arm (First-Person Empty Hand)", bits: [
            { label: "Right Arm", bit: 16 }, { label: "Left Arm", bit: 32 },
          ] },
        ],
      },
      allowActionsMask: {
        type: "maskCheckboxGroup", default: 0, label: "Allow Vanilla Actions (e.g. eating, swinging)",
        groups: [
          { bits: [
            { label: "Head", bit: 1 }, { label: "Torso", bit: 2 },
            { label: "Right Arm", bit: 4 }, { label: "Left Arm", bit: 8 },
            { label: "Right Leg", bit: 16 }, { label: "Left Leg", bit: 32 },
          ] },
        ],
      },
      keepPosScaleMask: {
        type: "maskCheckboxGroup", default: 0, label: "Keep Pose+Scale During Vanilla Action",
        groups: [
          { bits: [
            { label: "Head", bit: 1 }, { label: "Torso", bit: 2 },
            { label: "Right Arm", bit: 4 }, { label: "Left Arm", bit: 8 },
            { label: "Right Leg", bit: 16 }, { label: "Left Leg", bit: 32 },
          ] },
        ],
      },
    },
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity animEntity && !level.isClientSide()) {\n    AnimationAPI.setThirdPersonPose(animEntity,\n        {{quote:animName}},\n        {{quote:filePath}},\n        {{lookAtMask}}, {{vanillaMask}}, {{firstPersonLimbMask}}, {{allowActionsMask}}, {{keepPosScaleMask}});\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",

        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: {
        animName: { opcode: "text.literal", fields: { value: "" } },
        entity: { opcode: "entity.event" },
        filePath: { opcode: "text.literal", fields: { value: "" } },
      },
    },
  },
  {
    opcode: "anim.tppose.reset",
    category: "Player", sub: "Third Person Animations",
    isAction: true,
    label: "Reset Third Person Pose for [entity:entity]",
    hint: "Reset third person pose to vanilla default",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity animEntity && !level.isClientSide()) {\n    AnimationAPI.resetThirdPersonPose(animEntity);\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",

        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },

  // ITEM — Item Animations (Actions)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "anim.item.play",
    category: "Item", sub: "Item Animations",
    isAction: true,
    label: "Play Item Animation [animName:text] speed [playbackSpeed:number] from file [filePath:text] for [stack:itemstack]",
    hint: "Play animation on the 3D item model held by entity",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      handler: "anim.item", genericRender: true,
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: {
        animName: { opcode: "text.literal", fields: { value: "" } },
        playbackSpeed: { opcode: "number.literal", fields: { value: "1" } },
        filePath: { opcode: "text.literal", fields: { value: "" } },
        stack: { opcode: "itemstack.hand_item", fields: { hand: "main" } },
      },
    },
  },
  {
    opcode: "anim.item.stop",
    category: "Item", sub: "Item Animations",
    isAction: true,
    label: "Stop Item Animation for [stack:itemstack]",
    hint: "Stop any playing animation on the held 3D item model",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      handler: "anim.item", genericRender: true,
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { stack: { opcode: "itemstack.hand_item", fields: { hand: "main" } } },
    },
  },
  {
    opcode: "anim.item.pause",
    category: "Item", sub: "Item Animations",
    isAction: true,
    label: "Pause Item Animation for [stack:itemstack]",
    hint: "Freeze the playing item animation at its current position",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      handler: "anim.item", genericRender: true,
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { stack: { opcode: "itemstack.hand_item", fields: { hand: "main" } } },
    },
  },
  {
    opcode: "anim.item.resume",
    category: "Item", sub: "Item Animations",
    isAction: true,
    label: "Resume Item Animation for [stack:itemstack]",
    hint: "Resume a paused item animation from where it was frozen",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      handler: "anim.item", genericRender: true,
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { stack: { opcode: "itemstack.hand_item", fields: { hand: "main" } } },
    },
  },
  {
    opcode: "anim.item.pose.set",
    category: "Item", sub: "Item Animations",
    isAction: true,
    label: "Set Item Pose [animName:text] speed [playbackSpeed:number] from [filePath:text] for [stack:itemstack]",
    hint: "Set a persistent idle animation on the held 3D item model",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      handler: "anim.item", genericRender: true,
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: {
        animName: { opcode: "text.literal", fields: { value: "" } },
        playbackSpeed: { opcode: "number.literal", fields: { value: "1" } },
        filePath: { opcode: "text.literal", fields: { value: "" } },
        stack: { opcode: "itemstack.hand_item", fields: { hand: "main" } },
      },
    },
  },
  {
    opcode: "anim.item.pose.reset",
    category: "Item", sub: "Item Animations",
    isAction: true,
    label: "Reset Item Pose for [stack:itemstack]",
    hint: "Clear the item pose back to default (no animation)",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      handler: "anim.item", genericRender: true,
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { stack: { opcode: "itemstack.hand_item", fields: { hand: "main" } } },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA — Variables, Attributes, Data Components
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "attribute.get",
    category: "Data", sub: "data",
    linkType: "number",
    paletteLabel: "Get Attribute",
    label: "Get Attribute [attrId:dropdown.attributes] [layer:dropdown] for [entity:entity]",
    hint: "Read an attribute value (total / base / bonus) for entity",
    color: "#4d65b4",
    fields: {
      attrId: { source: "attributes", searchable: true },
      layer: {
        type: "dropdown",
        options: [
          { value: "total", label: "Total" },
          { value: "base", label: "Base" },
          { value: "bonus", label: "Bonus (Total − Base)" },
        ],
        default: "total",
      },
    },
    codegen: {
      type: "value",
      handler: "attribute.get",
      imports: [
        "net.minecraft.world.entity.ai.attributes.Attributes",
        "net.minecraft.world.entity.LivingEntity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "attribute.modifier.add",
    category: "Data", sub: "actions",
    isAction: true,
    paletteLabel: "Set Attribute Modifier",
    label: "Set Attribute Modifier [attrId:dropdown.attributes] [operation:dropdown] [modifierName:input.text] to [value:number] for [entity:entity]",
    hint: "Add a named modifier to an attribute on entity",
    color: "#4d65b4",
    fields: {
      attrId: { source: "attributes", searchable: true },
      operation: {
        type: "dropdown",
        options: [
          { value: "flat", label: "Flat Bonus" },
          { value: "multiply", label: "% Multiplier" },
          { value: "base_set", label: "Set Base" },
        ],
        default: "flat",
      },
      modifierName: { type: "input", inputType: "text", default: "", showIf: "operation != 'base_set'" },
    },
    dynamicAccepts: {
      value: { field: "operation", map: { "*": "number" } },
    },
    codegen: {
      type: "action",
      handler: "attribute.modifier.add",
      imports: [
        "net.minecraft.world.entity.ai.attributes.Attributes",
        "net.minecraft.world.entity.ai.attributes.AttributeModifier",
        "net.minecraft.resources.ResourceLocation",
        "net.minecraft.world.entity.LivingEntity",
      ],
      slotDefaults: {
        value: { opcode: "number.literal", fields: { value: "0" } },
        entity: { opcode: "entity.event" },
      },
    },
  },
  {
    opcode: "attribute.modifier.remove",
    category: "Data", sub: "actions",
    isAction: true,
    paletteLabel: "Remove Attr Modifier",
    label: "Remove Attribute Modifier [attrId:dropdown.attributes] [modifierName:input.text] for [entity:entity]",
    hint: "Remove a named modifier from an attribute on entity",
    color: "#4d65b4",
    fields: {
      attrId: { source: "attributes", searchable: true },
      modifierName: { type: "input", inputType: "text", default: "" },
    },
    codegen: {
      type: "action",
      handler: "attribute.modifier.remove",
      imports: [
        "net.minecraft.world.entity.ai.attributes.Attributes",
        "net.minecraft.world.entity.ai.attributes.AttributeModifier",
        "net.minecraft.resources.ResourceLocation",
        "net.minecraft.world.entity.LivingEntity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "attribute.base.reset",
    category: "Data", sub: "actions",
    isAction: true,
    label: "Reset Attribute Base [attrId:dropdown.attributes] for [entity:entity]",
    hint: "Reset an attribute's base value back to its default on entity",
    color: "#4d65b4",
    fields: {
      attrId: { source: "attributes", searchable: true },
    },
    codegen: {
      type: "action",
      handler: "attribute.base.reset",
      imports: [
        "net.minecraft.world.entity.ai.attributes.Attributes",
        "net.minecraft.world.entity.LivingEntity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "datacomp.get",
    category: "Data", sub: "data",
    linkType: "number",
    paletteLabel: "Get Data Component",
    label: "Get Data Component [compName:dropdown.dataComponents]",
    hint: "Get a data component value from the item stack",
    color: "#4d65b4",
    fields: {
      compName: { source: "dataComponents", searchable: true },
    },
    dynamicLinkType: {
      field: "compType",
      map: { boolean: "logic", string: "text", "*": "number" },
    },
    codegen: {
      type: "value",
      handler: "datacomp.get",
      imports: ["net.ye6isu.yebisuRPG.component.ModDataComponents"],
    },
  },
  {
    opcode: "datacomp.set",
    category: "Data", sub: "actions",
    isAction: true,
    paletteLabel: "Set Data Component",
    label: "Set Data Component [compName:dropdown.dataComponents] to [value:number]",
    hint: "Set a data component value on the item stack",
    color: "#4d65b4",
    fields: {
      compName: { source: "dataComponents", searchable: true },
    },
    dynamicAccepts: {
      value: { field: "compType", map: { boolean: "logic", string: "text", "*": "number" } },
    },
    codegen: {
      type: "action",
      handler: "datacomp.set",
      imports: ["net.ye6isu.yebisuRPG.component.ModDataComponents"],
      slotDefaults: {
        value: { opcode: "number.literal", fields: { value: "0" } },
      },
    },
  },
  {
    opcode: "entityvar.get",
    category: "Data", sub: "data",
    linkType: "number",
    paletteLabel: "Get Entity Variable",
    label: "Get Entity Variable [varName:dropdown.entityVariables] for [entity:entity]",
    hint: "Get an entity variable's value",
    color: "#4d65b4",
    fields: {
      varName: { source: "entityVariables", searchable: true },
    },
    dynamicLinkType: {
      field: "varType",
      map: { boolean: "logic", string: "text", "*": "number" },
    },
    codegen: {
      type: "value",
      handler: "entityvar.get",
      imports: ["net.ye6isu.yebisuRPG.entityvar.ModAttachments"],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "entityvar.set",
    category: "Data", sub: "actions",
    isAction: true,
    paletteLabel: "Set Entity Variable",
    label: "Set Entity Variable [varName:dropdown.entityVariables] to [value:number] for [entity:entity]",
    hint: "Set an entity variable's value",
    color: "#4d65b4",
    fields: {
      varName: { source: "entityVariables", searchable: true },
    },
    dynamicAccepts: {
      value: { field: "varType", map: { boolean: "logic", string: "text", "*": "number" } },
    },
    codegen: {
      type: "action",
      handler: "entityvar.set",
      imports: ["net.ye6isu.yebisuRPG.entityvar.ModAttachments"],
      slotDefaults: {
        entity: { opcode: "entity.event" },
        value: { opcode: "number.literal", fields: { value: "0" } },
      },
    },
  },
  {
    opcode: "overlay.play",
    category: "Entity", sub: "actions",
    isAction: true,
    paletteLabel: "Play Overlay Animation",
    label: "Play Texture Overlay [loopMode:dropdown] Speed [speed:number] Ticks/Frame [ticksPerFrame:number] for [entity:entity]",
    hint: "Start playing entity's active spritesheet overlay layers — synced to every client (including late joiners) from one shared start point, like bone/pose animation triggers",
    color: "#c46c94",
    fields: {
      loopMode: {
        type: "dropdown",
        options: [
          { value: "loop", label: "Loop" },
          { value: "play_once", label: "Play Once" },
          { value: "hold", label: "Hold Last Frame" },
        ],
        default: "loop",
      },
    },
    codegen: {
      type: "action",
      handler: "overlay.play",
      imports: ["net.ye6isu.yebisuRPG.texture.TextureServerEvents", "net.ye6isu.yebisuRPG.texture.FrameLoopMode"],
      slotDefaults: {
        entity: { opcode: "entity.event" },
        speed: { opcode: "number.literal", fields: { value: "1" } },
        ticksPerFrame: { opcode: "number.literal", fields: { value: "4" } },
      },
    },
  },
  {
    opcode: "overlay.stop",
    category: "Entity", sub: "actions",
    isAction: true,
    paletteLabel: "Stop Overlay Animation",
    label: "Stop Texture Overlay at Frame [frame:number] for [entity:entity]",
    hint: "Stop entity's active spritesheet overlay layers, holding on the given frame — synced to every client",
    color: "#c46c94",
    codegen: {
      type: "action",
      handler: "overlay.stop",
      imports: ["net.ye6isu.yebisuRPG.texture.TextureServerEvents"],
      slotDefaults: {
        entity: { opcode: "entity.event" },
        frame: { opcode: "number.literal", fields: { value: "0" } },
      },
    },
  },
  {
    opcode: "overlay.set",
    category: "Entity", sub: "actions",
    isAction: true,
    paletteLabel: "Set Texture Overlay",
    label: "Set Texture Overlay [texture:dropdown.textures] Mask [maskMode:dropdown] at Layer [layer:number] for [entity:entity]",
    hint: "Attach a texture from the pool as an overlay layer on this entity, at the given layer number (z-index) — layer controls draw order and lets multiple independent overlays (e.g. a hat and a cape) coexist without overwriting each other. Mask decides how it blends: None just draws on top, Cutout Below erases everything beneath it (this layer and every layer below, including any prior Cutout Below shape) wherever the texture's attached mask image is opaque, Mask Over Base conforms to whatever's already opaque in the composited result so far (this layer + everything below it). If the picked texture is set to Animated in the Texture tab, this immediately starts the same server-synced looping playback overlay.play uses (correct for late joiners automatically) — no separate Play block needed. Setting the same layer number again replaces that layer only.",
    color: "#c46c94",
    fields: {
      texture: { source: "textures", searchable: true },
      maskMode: {
        type: "dropdown",
        options: [
          { value: "none", label: "None" },
          { value: "cutout", label: "Cutout Below" },
          { value: "alpha", label: "Mask Over Base" },
        ],
        default: "none",
      },
    },
    codegen: {
      type: "action",
      handler: "overlay.set",
      imports: ["net.ye6isu.yebisuRPG.texture.TextureServerEvents"],
      slotDefaults: {
        entity: { opcode: "entity.event" },
        layer: { opcode: "number.literal", fields: { value: "0" } },
      },
    },
  },
  {
    opcode: "overlay.remove",
    category: "Entity", sub: "actions",
    isAction: true,
    paletteLabel: "Remove Texture Overlay",
    label: "Remove Texture Overlay [texture:dropdown.textures] for [entity:entity]",
    hint: "Remove whichever overlay layer is currently showing this texture, regardless of which layer number it was set at — leaves all other layers untouched",
    color: "#c46c94",
    fields: {
      texture: { source: "textures", searchable: true },
    },
    codegen: {
      type: "action",
      handler: "overlay.remove",
      imports: ["net.ye6isu.yebisuRPG.texture.TextureServerEvents"],
      slotDefaults: {
        entity: { opcode: "entity.event" },
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ITEM — Data & Actions
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "itemstack.literal",
    category: "Item", sub: "data",
    linkType: "itemstack",
    paletteLabel: "Item Stack",
    label: "Item Stack",
    hint: "The current item stack (context-sensitive)",
    color: "#945d66",
    codegen: {
      type: "value",
      methodVariants: {
        "useOn": "context.getItemInHand()",
        "use": "player.getItemInHand(usedHand)",
        "continuousUse": "stack",
        "finishUsingItem": "stack",
        "releaseUsing": "stack",
        "inventoryTick": "stack",
        "hurtEnemy": "stack",
        "interactLivingEntity": "stack",
        "*": "stack",
      },
    },
  },
  {
    opcode: "itemstack.hand_item",
    category: "Item", sub: "data",
    linkType: "itemstack",
    label: "Get [hand:dropdown] Item of [entity:entity]",
    hint: "Get the item stack in the entity's main or off hand",
    color: "#945d66",
    fields: {
      hand: {
        type: "dropdown",
        options: [
          { value: "main", label: "Main Hand" },
          { value: "off", label: "Off Hand" },
        ],
        default: "main",
      },
    },
    codegen: {
      type: "value",
      variants: {
        "hand == 'off'": { expr: "(((net.minecraft.world.entity.LivingEntity){{entity}}).getOffhandItem())" },
        "hand == 'main'": { expr: "(((net.minecraft.world.entity.LivingEntity){{entity}}).getMainHandItem())" },
      },
      expr: "(((net.minecraft.world.entity.LivingEntity){{entity}}).getMainHandItem())",
      imports: ["net.minecraft.world.entity.LivingEntity"],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "itemstack.is_on_cooldown",
    category: "Item", sub: "data",
    linkType: "logic",
    paletteLabel: "On Cooldown?",
    label: "Is [stack:itemstack] on Cooldown?",
    hint: "Check if the item is currently on cooldown for the player",
    color: "#6494a4",
    codegen: {
      type: "value",
      slotDefaults: {
        stack: { opcode: "itemstack.literal" },
      },
    },
  },
  {
    opcode: "itemstack.use_duration",
    category: "Item", sub: "data",
    linkType: "number",
    paletteLabel: "Use Duration",
    label: "Get Use Duration of [stack:itemstack]",
    hint: "How many ticks the item has been used (bow charge, eating progress, etc.)",
    color: "#4d65b4",
    codegen: {
      type: "value",
      methodVariants: {
        "continuousUse": "(stack.getUseDuration(livingEntity) - remainingUseDuration)",
        "releaseUsing": "(stack.getUseDuration(livingEntity) - timeCharged)",
        "*": "0",
      },
      slotDefaults: { stack: { opcode: "itemstack.literal" } },
    },
  },
  {
    opcode: "itemstack.set_state",
    category: "Item", sub: "actions",
    isAction: true,
    label: "Set Item State to [state:number] for [stack:itemstack]",
    hint: "Set the visual state of an item (0 = default, 1 = second state, etc.)",
    color: "#c46c94",
    codegen: {
      type: "action",
      template: "{{stack}}.set(net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA, new net.minecraft.world.item.component.CustomModelData((int)((double)({{state}}))));",
      imports: [],
      slotDefaults: {
        stack: { opcode: "itemstack.literal" },
        state: { opcode: "number.literal", fields: { value: "0" } },
      },
    },
  },
  {
    opcode: "itemstack.reset_state",
    category: "Item", sub: "actions",
    isAction: true,
    label: "Reset Item State for [stack:itemstack]",
    hint: "Reset item back to default visual state (state 0)",
    color: "#c46c94",
    codegen: {
      type: "action",
      template: "{{stack}}.remove(net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA);",
      imports: [],
      slotDefaults: { stack: { opcode: "itemstack.literal" } },
    },
  },
  {
    opcode: "itemstack.get_state",
    category: "Item", sub: "data",
    linkType: "number",
    label: "Get Item State of [stack:itemstack]",
    hint: "Get the current visual state of an item (0 = default, 1 = second state, etc.)",
    color: "#4d65b4",
    codegen: {
      type: "value",
      expr: "({{stack}}.getOrDefault(net.minecraft.core.component.DataComponents.CUSTOM_MODEL_DATA, new net.minecraft.world.item.component.CustomModelData(0)).value())",
      imports: [],
      slotDefaults: { stack: { opcode: "itemstack.literal" } },
    },
  },
  {
    opcode: "itemstack.set_texture_frame",
    category: "Item", sub: "actions",
    isAction: true,
    label: "Set Item Texture Frame to [frame:number] for [stack:itemstack]",
    hint: "Set the visual frame of a spritesheet item — independent from Item State, so this works the same whether or not the item also uses multiple states",
    color: "#c46c94",
    codegen: {
      type: "action",
      template: "{{stack}}.set(net.ye6isu.yebisuRPG.component.ModDataComponents.ITEM_FRAME.get(), (int)((double)({{frame}})));",
      imports: [],
      slotDefaults: {
        stack: { opcode: "itemstack.literal" },
        frame: { opcode: "number.literal", fields: { value: "0" } },
      },
    },
  },
  {
    opcode: "itemstack.reset_texture_frame",
    category: "Item", sub: "actions",
    isAction: true,
    label: "Reset Item Texture Frame for [stack:itemstack]",
    hint: "Reset the item's visual frame back to its default texture",
    color: "#c46c94",
    codegen: {
      type: "action",
      template: "{{stack}}.remove(net.ye6isu.yebisuRPG.component.ModDataComponents.ITEM_FRAME.get());",
      imports: [],
      slotDefaults: {
        stack: { opcode: "itemstack.literal" },
      },
    },
  },
  {
    opcode: "itemstack.get_texture_frame",
    category: "Item", sub: "data",
    linkType: "number",
    label: "Get Item Texture Frame of [stack:itemstack]",
    hint: "Get the current texture frame of a spritesheet item (0 = default)",
    color: "#4d65b4",
    codegen: {
      type: "value",
      expr: "({{stack}}.getOrDefault(net.ye6isu.yebisuRPG.component.ModDataComponents.ITEM_FRAME.get(), 0))",
      imports: [],
      slotDefaults: { stack: { opcode: "itemstack.literal" } },
    },
  },
  {
    opcode: "itemstack.set_cooldown",
    category: "Item", sub: "actions",
    isAction: true,
    label: "Set Cooldown to [ticks:number] for [stack:itemstack]",
    hint: "Put the item on cooldown for the given number of ticks",
    color: "#c46c94",
    codegen: {
      type: "action",
      imports: ["net.minecraft.world.entity.player.Player"],
      slotDefaults: {
        stack: { opcode: "itemstack.literal" },
        ticks: { opcode: "number.literal", fields: { value: "20" } },
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NUMBER — Data
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "number.literal",
    category: "Number", sub: "data",
    linkType: "number",
    paletteLabel: "Number",
    label: "[value:input.number]",
    hint: "A literal number",
    color: "#4d65b4",
    fields: {
      value: { type: "input", inputType: "number", default: "0" },
    },
    codegen: { type: "value", expr: "{{value}}" },
  },
  {
    opcode: "number.math",
    category: "Number", sub: "data",
    linkType: "number",
    paletteLabel: "Math",
    label: "[a:number] [op:dropdown] [b:number]",
    hint: "Apply an operator to two numbers",
    color: "#4d65b4",
    transparent: true,
    fields: {
      op: {
        type: "dropdown",
        compact: true,
        options: [
          { value: "+", label: "+" },
          { value: "-", label: "−" },
          { value: "*", label: "×" },
          { value: "/", label: "÷" },
          { value: "%", label: "%" },
          { value: "min", label: "min" },
          { value: "max", label: "max" },
          { value: "pow", label: "pow" },
        ],
        default: "+",
      },
    },
    codegen: {
      type: "value",
      expr: "(({{a}}){{op}}({{b}}))",
      variants: {
        "op == 'min'": { expr: "(Math.min((double)({{a}}),(double)({{b}})))" },
        "op == 'max'": { expr: "(Math.max((double)({{a}}),(double)({{b}})))" },
        "op == 'pow'": { expr: "(Math.pow((double)({{a}}),(double)({{b}})))" },
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT — Data & Actions
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "text.literal",
    category: "Text", sub: "data",
    linkType: "text",
    paletteLabel: "Text",
    label: "[value:input.text]",
    hint: "A literal text/string value",
    color: "#5ba558",
    fields: {
      value: { type: "input", inputType: "text", default: "" },
    },
    codegen: { type: "value", expr: "{{value}}" },
  },
  {
    opcode: "convert.to_text",
    category: "Text", sub: "data",
    linkType: "text",
    paletteLabel: "Convert to Text",
    label: "Convert [value:number] to Text with [decimals:input.number] decimal places",
    hint: "Convert a number to text — 0 decimal places shows only the whole value, 1 shows one decimal place, and so on",
    color: "#5ba558",
    fields: {
      decimals: { default: "0" },
    },
    codegen: {
      type: "value",
      expr: "String.format(\"%.{{decimals}}f\", (double)({{value}}))",
      slotDefaults: {
        value: { opcode: "number.literal", fields: { value: "0" } },
      },
    },
  },
  {
    opcode: "text.combine",
    category: "Text", sub: "data",
    linkType: "text",
    paletteLabel: "Combine Text",
    label: "Combine Text",
    hint: "Concatenate multiple text links into one value — plug the result into any text slot (Send Chat, HUD Return Text, etc.)",
    color: "#5ba558",
    repeatableSlots: {
      key: "text",
      accepts: "text",
      countField: "textCount",
      default: 2,
      min: 1,
      max: 10,
      separator: "+",
    },
    settings: {
      _actions: [
        { label: "+ Text", onClick: { field: "textCount", action: "increment", max: 10 } },
        { label: "− Text", labelOn: "− Text", labelOff: "− Text", onClick: { field: "textCount", action: "decrement", min: 1 } },
      ],
    },
    fields: {
      textCount: { type: "hidden", default: 2 },
    },
    codegen: {
      type: "value",
      handler: "text.combine",
    },
  },
  {
    opcode: "chat.send",
    category: "Text", sub: "actions",
    isAction: true,
    label: "Send Message to [entity:entity]",
    hint: "Send a chat message to an entity (combine multiple text links)",
    color: "#5ba558",
    repeatableSlots: {
      key: "text",
      accepts: "text",
      countField: "textCount",
      default: 1,
      min: 1,
      max: 10,
      separator: "+",
    },
    settings: {
      _actions: [
        { label: "+ Text", onClick: { field: "textCount", action: "increment", max: 10 } },
        { label: "− Text", labelOn: "− Text", labelOff: "− Text", onClick: { field: "textCount", action: "decrement", min: 1 } },
      ],
    },
    fields: {
      textCount: { type: "hidden", default: 1 },
    },
    codegen: {
      type: "action",
      handler: "chat.send",
      imports: ["net.minecraft.network.chat.Component"],
      slotDefaults: {
        entity: { opcode: "entity.event" },
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIC — Data & Flow Control
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "logic.true",
    category: "Logic", sub: "data",
    linkType: "logic",
    label: "True",
    hint: "True value",
    color: "#6494a4",
    codegen: { type: "value", expr: "true" },
  },
  {
    opcode: "logic.false",
    category: "Logic", sub: "data",
    linkType: "logic",
    label: "False",
    hint: "False value",
    color: "#6494a4",
    codegen: { type: "value", expr: "false" },
  },
  {
    opcode: "logic.not",
    category: "Logic", sub: "data",
    linkType: "logic",
    paletteLabel: "Not",
    label: "Not [value:logic]",
    hint: "Negate a boolean value",
    color: "#6494a4",
    codegen: {
      type: "value",
      expr: "(!({{value}}))",
    },
  },
  {
    opcode: "itemstack.compare",
    category: "Logic", sub: "Flow Control",
    linkType: "logic",
    paletteLabel: "Item Compare",
    label: "[a:itemstack] [op:dropdown] [b:itemstack]",
    hint: "Compare two item stacks",
    color: "#945d66",
    transparent: true,
    fields: {
      op: {
        type: "dropdown",
        compact: true,
        options: [
          { value: "==", label: "＝" },
          { value: "!=", label: "≠" },
        ],
        default: "==",
      },
    },
    codegen: {
      type: "value",
      variants: {
        "op == '=='": { expr: "(net.minecraft.world.item.ItemStack.isSameItem({{a}}, {{b}}))" },
        "op == '!='": { expr: "(!net.minecraft.world.item.ItemStack.isSameItem({{a}}, {{b}}))" },
      },
      imports: ["net.minecraft.world.item.ItemStack"],
    },
  },
  {
    opcode: "logic.compare",
    category: "Logic", sub: "Flow Control",
    linkType: "logic",
    paletteLabel: "Num Compare",
    label: "[a:number] [op:dropdown] [b:number]",
    hint: "Compare two numbers",
    color: "#4d65b4",
    transparent: true,
    fields: {
      op: {
        type: "dropdown",
        compact: true,
        options: [
          { value: "==", label: "＝" },
          { value: "!=", label: "≠" },
          { value: "<",  label: "＜" },
          { value: ">",  label: "＞" },
          { value: "<=", label: "≤" },
          { value: ">=", label: "≥" },
        ],
        default: "==",
      },
    },
    codegen: {
      type: "value",
      expr: "((double)({{a}}){{op}}(double)({{b}}))",
    },
  },
  {
    opcode: "logic.compare_string",
    category: "Logic", sub: "Flow Control",
    linkType: "logic",
    paletteLabel: "Text Compare",
    label: "[a:text] [op:dropdown] [b:text]",
    hint: "Compare two text values",
    color: "#5ba558",
    transparent: true,
    fields: {
      op: {
        type: "dropdown",
        compact: true,
        options: [
          { value: "==", label: "＝" },
          { value: "!=", label: "≠" },
        ],
        default: "==",
      },
    },
    codegen: {
      type: "value",
      variants: {
        "op == '=='": { expr: "({{a}}.equals({{b}}))" },
        "op == '!='": { expr: "(!{{a}}.equals({{b}}))" },
      },
    },
  },
  {
    opcode: "logic.compare_bool",
    category: "Logic", sub: "Flow Control",
    linkType: "logic",
    paletteLabel: "Bool Compare",
    label: "[a:logic] [op:dropdown] [b:logic]",
    hint: "Compare two boolean values",
    color: "#6494a4",
    transparent: true,
    fields: {
      op: {
        type: "dropdown",
        compact: true,
        options: [
          { value: "==", label: "＝" },
          { value: "!=", label: "≠" },
          { value: "&&", label: "AND" },
          { value: "||", label: "OR" },
        ],
        default: "==",
      },
    },
    codegen: {
      type: "value",
      expr: "({{a}} {{op}} {{b}})",
    },
  },
  {
    opcode: "control.if",
    category: "Logic", sub: "Flow Control",
    isAction: true,
    label: "If [condition:logic]",
    hint: "If statement",
    color: "#6494a4",
    fields: {
      elseIfCount: { type: "hidden", default: 0 },
      hasElse: { type: "hidden", default: false },
    },
    settings: {
      _actions: [
        { label: "+ Else If", onClick: { field: "elseIfCount", action: "increment" } },
        { label: "− Else If", onClick: { field: "elseIfCount", action: "decrement", min: 0 } },
        { label: "+ Else", labelOn: "− Else", labelOff: "+ Else", onClick: { field: "hasElse", action: "toggle" } },
      ],
    },
    bodyConfig: { type: "if" },
    codegen: { type: "compound", handler: "control.if" },
  },
  {
    opcode: "control.delay",
    category: "Logic", sub: "Flow Control",
    isAction: true,
    label: "Delay [delayTicks:number] ticks",
    hint: "Run actions after a tick delay (server-side)",
    color: "#6494a4",
    body: { do0: { label: null } },
    codegen: {
      type: "compound",
      compoundTemplate: {
        before: "TickScheduler.INSTANCE.schedule((int)({{delayTicks}}), () -> {",
        after: "});",
      },
      imports: ["net.ye6isu.yebisuRPG.util.TickScheduler"],
      slotDefaults: {
        delayTicks: { opcode: "number.literal", fields: { value: "0" } },
      },
    },
  },
  {
    opcode: "aoe.iterator.entity",
    category: "Logic", sub: "Flow Control",
    linkType: "entity",
    label: "Iterator Entity",
    hint: "Current entity in a For Each Entity loop",
    color: "#30e1b9",
    codegen: { type: "value", expr: "hitEntity" },
  },
  {
    opcode: "aoe.each",
    category: "Logic", sub: "Flow Control",
    isAction: true,
    paletteLabel: "For Each in Shape",
    label: "For Each in [shape:dropdown] of [entity:entity]",
    hint: "Run actions for each entity in a shape area",
    color: "#3a5c3a",
    body: { do0: { label: null } },
    fields: {
      shape: {
        type: "dropdown",
        options: [
          { value: "sphere", label: "Sphere" },
          { value: "box", label: "Box" },
          { value: "cone", label: "Cone" },
          { value: "line", label: "Line" },
        ],
        default: "sphere",
      },
      los: { type: "hidden", default: false },
      losOrigin: { type: "hidden", default: "caller" },
      showParticles: { type: "hidden", default: false },
      copyPitch: { type: "hidden", default: true },
    },
    shapeSlots: {
      sphere: "radius [radius:number]",
      box: "width [width:number] height [height:number] depth [depth:number]",
      cone: "distance [distance:number] angle [angle:number]",
      line: "distance [distance:number] width [width:number]",
    },
    suffixLabel: "offset x [offX:number] y [offY:number] z [offZ:number]",
    settings: {
      los: { type: "checkbox", label: "Line of Sight", default: false },
      losOrigin: { type: "dropdown", label: "LOS Origin", options: [{ value: "caller", label: "Caller" }, { value: "center", label: "Shape Center" }], default: "caller", showIf: "los" },
      showParticles: { type: "checkbox", label: "Visual", default: false },
      copyPitch: { type: "checkbox", label: "Copy Pitch", default: true },
    },
    codegen: {
      type: "compound",
      imports: ["net.ye6isu.yebisuRPG.util.AoeShapes"],
      slotDefaults: {
        entity: { opcode: "entity.event" },
        radius: { opcode: "number.literal", fields: { value: "0" } },
        width: { opcode: "number.literal", fields: { value: "0" } },
        height: { opcode: "number.literal", fields: { value: "0" } },
        depth: { opcode: "number.literal", fields: { value: "0" } },
        distance: { opcode: "number.literal", fields: { value: "0" } },
        angle: { opcode: "number.literal", fields: { value: "0" } },
        offX: { opcode: "number.literal", fields: { value: "0" } },
        offY: { opcode: "number.literal", fields: { value: "0" } },
        offZ: { opcode: "number.literal", fields: { value: "0" } },
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL — Client
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "entity.look_dir_client",
    category: "Level", sub: "Client",
    linkType: "number",
    paletteLabel: "Look Direction (Client)",
    label: "Get [axis:dropdown] Look Direction of [entity:entity] 🖥",
    hint: "Get X, Y, or Z component of look direction (client interpolated)",
    color: "#4d65b4",
    transparent: true,
    fields: {
      axis: {
        type: "dropdown",
        compact: true,
        options: [
          { value: "x", label: "X" },
          { value: "y", label: "Y" },
          { value: "z", label: "Z" },
        ],
        default: "x",
      },
    },
    codegen: {
      type: "value",
      variants: {
        "axis == 'x'": { expr: "({{entity}}.getViewVector(1.0F).x)" },
        "axis == 'y'": { expr: "({{entity}}.getViewVector(1.0F).y)" },
        "axis == 'z'": { expr: "({{entity}}.getViewVector(1.0F).z)" },
      },
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
];

export const blockDefRegistry = new Map();
for (const def of BLOCK_DEFS) {
  blockDefRegistry.set(def.opcode, def);
}
