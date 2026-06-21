export const BLOCK_DEFS = [

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
    opcode: "aoe.iterator.entity",
    category: "Entity", sub: "data",
    linkType: "entity",
    label: "Iterator Entity",
    hint: "Current entity in a For Each Entity loop",
    color: "#30e1b9",
    codegen: { type: "value", expr: "_iterEnt" },
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
    paletteLabel: "Parse Text",
    label: "Parse Text from [value:number]",
    hint: "Convert a number to text",
    color: "#5ba558",
    codegen: {
      type: "value",
      expr: "String.valueOf((double)({{value}}))",
      slotDefaults: {
        value: { opcode: "number.literal", fields: { value: "0" } },
      },
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
  // NUMBERS — Data
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "number.literal",
    category: "Numbers", sub: "data",
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
    category: "Math", sub: "data",
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
  {
    opcode: "entity.pos_x",
    category: "Numbers", sub: "data",
    linkType: "number",
    label: "Pos X of [entity:entity]",
    hint: "X position of an entity",
    color: "#4d65b4",
    codegen: {
      type: "value",
      expr: "({{entity}}.getX())",
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "entity.pos_y",
    category: "Numbers", sub: "data",
    linkType: "number",
    label: "Pos Y of [entity:entity]",
    hint: "Y position of an entity",
    color: "#4d65b4",
    codegen: {
      type: "value",
      expr: "({{entity}}.getY())",
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "entity.pos_z",
    category: "Numbers", sub: "data",
    linkType: "number",
    label: "Pos Z of [entity:entity]",
    hint: "Z position of an entity",
    color: "#4d65b4",
    codegen: {
      type: "value",
      expr: "({{entity}}.getZ())",
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "entity.cam_x",
    category: "Numbers", sub: "data",
    linkType: "number",
    label: "X at [distance:number] from [entity:entity]",
    hint: "X at distance along look direction from entity",
    color: "#4d65b4",
    codegen: {
      type: "value",
      expr: "({{entity}}.getX() + {{entity}}.getLookAngle().normalize().x * (double)({{distance}}))",
      slotDefaults: {
        distance: { opcode: "number.literal", fields: { value: "0" } },
        entity: { opcode: "entity.event" },
      },
    },
  },
  {
    opcode: "entity.cam_y",
    category: "Numbers", sub: "data",
    linkType: "number",
    label: "Y at [distance:number] from [entity:entity]",
    hint: "Y at distance along look direction from entity",
    color: "#4d65b4",
    codegen: {
      type: "value",
      expr: "({{entity}}.getY() + {{entity}}.getEyeHeight() + {{entity}}.getLookAngle().normalize().y * (double)({{distance}}))",
      slotDefaults: {
        distance: { opcode: "number.literal", fields: { value: "0" } },
        entity: { opcode: "entity.event" },
      },
    },
  },
  {
    opcode: "entity.cam_z",
    category: "Numbers", sub: "data",
    linkType: "number",
    label: "Z at [distance:number] from [entity:entity]",
    hint: "Z at distance along look direction from entity",
    color: "#4d65b4",
    codegen: {
      type: "value",
      expr: "({{entity}}.getZ() + {{entity}}.getLookAngle().normalize().z * (double)({{distance}}))",
      slotDefaults: {
        distance: { opcode: "number.literal", fields: { value: "0" } },
        entity: { opcode: "entity.event" },
      },
    },
  },
  {
    opcode: "entity.look_x",
    category: "Numbers", sub: "data",
    linkType: "number",
    label: "Look Dir X of [entity:entity]",
    hint: "X component of look direction (server)",
    color: "#4d65b4",
    codegen: {
      type: "value",
      expr: "({{entity}}.getLookAngle().x)",
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "entity.look_y",
    category: "Numbers", sub: "data",
    linkType: "number",
    label: "Look Dir Y of [entity:entity]",
    hint: "Y component of look direction (server)",
    color: "#4d65b4",
    codegen: {
      type: "value",
      expr: "({{entity}}.getLookAngle().y)",
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "entity.look_z",
    category: "Numbers", sub: "data",
    linkType: "number",
    label: "Look Dir Z of [entity:entity]",
    hint: "Z component of look direction (server)",
    color: "#4d65b4",
    codegen: {
      type: "value",
      expr: "({{entity}}.getLookAngle().z)",
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "entity.look_client_x",
    category: "Numbers", sub: "data",
    linkType: "number",
    label: "Look Dir X (Client) of [entity:entity]",
    hint: "X component of look direction (client interpolated)",
    color: "#4d65b4",
    codegen: {
      type: "value",
      expr: "({{entity}}.getViewVector(1.0F).x)",
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "entity.look_client_y",
    category: "Numbers", sub: "data",
    linkType: "number",
    label: "Look Dir Y (Client) of [entity:entity]",
    hint: "Y component of look direction (client interpolated)",
    color: "#4d65b4",
    codegen: {
      type: "value",
      expr: "({{entity}}.getViewVector(1.0F).y)",
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "entity.look_client_z",
    category: "Numbers", sub: "data",
    linkType: "number",
    label: "Look Dir Z (Client) of [entity:entity]",
    hint: "Z component of look direction (client interpolated)",
    color: "#4d65b4",
    codegen: {
      type: "value",
      expr: "({{entity}}.getViewVector(1.0F).z)",
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "vector.normalize",
    category: "Numbers", sub: "data",
    linkType: "number",
    paletteLabel: "Direction",
    label: "Dir [axis:dropdown] from x1 [x1:number] y1 [y1:number] z1 [z1:number] to x2 [x2:number] y2 [y2:number] z2 [z2:number]",
    hint: "Component of normalized direction vector from point A to point B",
    color: "#4d65b4",
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
  // LOGIC — Data & Actions
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
    opcode: "logic.compare",
    category: "Flow Control", sub: "data",
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
    category: "Flow Control", sub: "data",
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
    category: "Flow Control", sub: "data",
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
    opcode: "entity.is_crouching",
    category: "Flow Control", sub: "data",
    linkType: "logic",
    label: "Is Crouching? [entity:entity]",
    hint: "True if the entity is crouching/sneaking",
    color: "#6494a4",
    codegen: {
      type: "value",
      expr: "({{entity}}.isCrouching())",
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "control.if",
    category: "Flow Control", sub: "actions",
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
    category: "Flow Control", sub: "actions",
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

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS — Actions
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "effect.apply",
    category: "Effects", sub: "actions",
    isAction: true,
    label: "Add Effect to [entity:entity] [effect:dropdown.effects] Duration [duration:number] Level [level:number]",
    hint: "Apply a potion effect",
    color: "#c46c94",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof LivingEntity _et) { _et.addEffect(new MobEffectInstance({{effect}}, (int)({{duration}}), Math.max(0,(int)({{level}})-1))); }",
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
    },
  },
  {
    opcode: "entity.apply_motion",
    category: "Effects", sub: "actions",
    isAction: true,
    label: "Apply Motion to [entity:entity] X [x:number] Y [y:number] Z [z:number] [mode:dropdown]",
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
        "mode == 'set'": { template: "{{entity}}.setDeltaMovement((double)({{x}}), (double)({{y}}), (double)({{z}}));" },
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

  // ═══════════════════════════════════════════════════════════════════════════
  // AoE — Actions (compound, hardcoded codegen)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "aoe.each",
    category: "AoE", sub: "actions",
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
      copyPitch: { type: "hidden", default: false },
      multiline: { type: "hidden", default: false },
    },
    shapeSlots: {
      sphere: "radius [radius:number]",
      box: "width [width:number] height [height:number] depth [depth:number]",
      cone: "distance [distance:number] angle [angle:number]",
      line: "distance [distance:number] width [width:number]",
    },
    suffixLabel: "offset x [offX:number] y [offY:number] z [offZ:number]",
    settings: {
      multiline: { type: "checkbox", label: "New Line per Link", default: false },
      los: { type: "checkbox", label: "Line of Sight", default: false },
      losOrigin: { type: "dropdown", label: "LOS Origin", options: [{ value: "caller", label: "Caller" }, { value: "center", label: "Shape Center" }], default: "caller", showIf: "los" },
      showParticles: { type: "checkbox", label: "Visual", default: false },
      copyPitch: { type: "checkbox", label: "Copy Pitch", default: false },
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
  // ANIM — First Person (Actions)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "anim.firstperson.play",
    category: "Anim — First Person", sub: "actions",
    isAction: true,
    label: "Play FP Anim [animName:text] for [entity:entity] speed [playbackSpeed:number] from file [filePath:text]",
    hint: "Play FP Anim for entity with playback speed from file",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity _ae && !level.isClientSide()) {\n    AnimationAPI.triggerAnimation(_ae,\n        AnimationCategory.ENTITY,\n        {{quote:animName}},\n        {{quote:filePath}},\n        {{float:playbackSpeed}});\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.ye6isu.yebisuRPG.animation.AnimationCategory",
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
    opcode: "anim.firstperson.stop",
    category: "Anim — First Person", sub: "actions",
    isAction: true,
    label: "Stop FP Anim on [entity:entity]",
    hint: "Stop any playing first-person animation on an entity",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity _se && !level.isClientSide()) {\n    AnimationAPI.stopFirstPersonAnimation(_se);\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.ye6isu.yebisuRPG.animation.AnimationCategory",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "anim.firstperson.pause",
    category: "Anim — First Person", sub: "actions",
    isAction: true,
    label: "Pause FP Anim on [entity:entity]",
    hint: "Freeze the playing first-person animation at its current position",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity _pe && !level.isClientSide()) {\n    AnimationAPI.pauseAnimation(_pe,\n        AnimationCategory.ENTITY);\n}",
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
    category: "Anim — First Person", sub: "actions",
    isAction: true,
    label: "Resume FP Anim on [entity:entity]",
    hint: "Resume a paused first-person animation",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity _re && !level.isClientSide()) {\n    AnimationAPI.resumeAnimation(_re,\n        AnimationCategory.ENTITY);\n}",
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
    category: "Anim — First Person", sub: "actions",
    isAction: true,
    label: "Set FP Hand Pose [animName:text] for [entity:entity] from [filePath:text]",
    hint: "Set FP hand pose",
    color: "#3a5c3a",
    settings: {
      allowVanillaActions: { type: "checkbox", label: "Allow Vanilla Actions", default: false },
    },
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity _hp && !level.isClientSide()) {\n    AnimationAPI.setFirstPersonHandPose(_hp,\n        {{quote:animName}},\n        {{quote:filePath}}, {{allowVanillaActions}}, false);\n}",
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
    category: "Anim — First Person", sub: "actions",
    isAction: true,
    label: "Reset FP Hand Pose on [entity:entity]",
    hint: "Reset FP hand pose to vanilla default",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity _hr && !level.isClientSide()) {\n    AnimationAPI.resetFirstPersonHandPose(_hr);\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ANIM — Third Person (Actions)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "anim.thirdperson.play",
    category: "Anim — Third Person", sub: "actions",
    isAction: true,
    label: "Play TP Anim [animName:text] for [entity:entity] speed [playbackSpeed:number] from file [filePath:text]",
    hint: "Play TP Anim for entity with playback speed from file",
    color: "#3a5c3a",
    settings: {
      lookAtMask: { type: "hidden", default: 0 },
      vanillaMask: { type: "hidden", default: 0 },
      vanillaMoveMask: { type: "hidden", default: 0 },
      fpViewMask: { type: "hidden", default: 0 },
    },
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity _tpa && !level.isClientSide()) {\n    AnimationAPI.triggerAnimation(_tpa,\n        AnimationCategory.ENTITY_THIRD_PERSON,\n        {{quote:animName}},\n        {{quote:filePath}},\n        {{float:playbackSpeed}}, {{lookAtMask}}, {{vanillaMask}}, {{vanillaMoveMask}}, {{fpViewMask}});\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.ye6isu.yebisuRPG.animation.AnimationCategory",
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
    category: "Anim — Third Person", sub: "actions",
    isAction: true,
    label: "Stop TP Anim on [entity:entity]",
    hint: "Stop any playing third-person animation on an entity",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity _tps && !level.isClientSide()) {\n    AnimationAPI.stopThirdPersonAnimation(_tps);\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.ye6isu.yebisuRPG.animation.AnimationCategory",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "anim.thirdperson.pause",
    category: "Anim — Third Person", sub: "actions",
    isAction: true,
    label: "Pause TP Anim on [entity:entity]",
    hint: "Freeze the playing third-person animation at its current position",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity _tpp && !level.isClientSide()) {\n    AnimationAPI.pauseThirdPersonAnimation(_tpp);\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.ye6isu.yebisuRPG.animation.AnimationCategory",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "anim.thirdperson.resume",
    category: "Anim — Third Person", sub: "actions",
    isAction: true,
    label: "Resume TP Anim on [entity:entity]",
    hint: "Resume a paused third-person animation",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity _tpr && !level.isClientSide()) {\n    AnimationAPI.resumeThirdPersonAnimation(_tpr);\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.ye6isu.yebisuRPG.animation.AnimationCategory",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "anim.tppose.set",
    category: "Anim — Third Person", sub: "actions",
    isAction: true,
    label: "Set TP Pose [animName:text] for [entity:entity] from [filePath:text]",
    hint: "Set TP pose",
    color: "#3a5c3a",
    settings: {
      lookAtMask: { type: "hidden", default: 0 },
      vanillaMask: { type: "hidden", default: 0 },
      vanillaMoveMask: { type: "hidden", default: 0 },
      allowActionsMask: { type: "hidden", default: 0 },
      keepPosScaleMask: { type: "hidden", default: 0 },
      fpViewMask: { type: "hidden", default: 0 },
    },
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity _tps && !level.isClientSide()) {\n    AnimationAPI.setThirdPersonPose(_tps,\n        {{quote:animName}},\n        {{quote:filePath}},\n        {{lookAtMask}}, {{vanillaMask}}, {{vanillaMoveMask}}, {{allowActionsMask}}, {{keepPosScaleMask}}, {{fpViewMask}});\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.ye6isu.yebisuRPG.animation.AnimationCategory",
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
    category: "Anim — Third Person", sub: "actions",
    isAction: true,
    label: "Reset TP Pose on [entity:entity]",
    hint: "Reset TP pose to vanilla default",
    color: "#3a5c3a",
    codegen: {
      type: "action",
      template: "if ({{entity}} instanceof Entity _tpr && !level.isClientSide()) {\n    AnimationAPI.resetThirdPersonPose(_tpr);\n}",
      imports: [
        "net.ye6isu.yebisuRPG.animation.AnimationAPI",
        "net.ye6isu.yebisuRPG.animation.AnimationCategory",
        "net.minecraft.world.entity.Entity",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIABLES — Data & Actions (dynamic, hardcoded codegen)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "variable.get",
    category: "Variables", sub: "data",
    linkType: "number",
    paletteLabel: "Get Variable",
    label: "Get Variable [varName:dropdown.variables] for [entity:entity]",
    hint: "Get a declared variable for entity — pick the variable inline on the canvas",
    color: "#4d65b4",
    dynamicLinkType: {
      field: "varType",
      map: { bool: "logic", string: "text", "*": "number" },
    },
    codegen: {
      type: "value",
      handler: "variable.get",
      imports: [
        "net.ye6isu.yebisuRPG.data.EntityVarCapability",
        "net.ye6isu.yebisuRPG.data.EntityVar",
      ],
      slotDefaults: { entity: { opcode: "entity.event" } },
    },
  },
  {
    opcode: "variable.set",
    category: "Variables", sub: "actions",
    isAction: true,
    paletteLabel: "Set Variable",
    label: "Set Variable [varName:dropdown.variables] to [value:number] for [entity:entity]",
    hint: "Set a declared variable for entity — pick the variable inline on the canvas",
    color: "#4d65b4",
    dynamicAccepts: {
      value: { field: "varType", map: { bool: "logic", string: "text", "*": "number" } },
    },
    codegen: {
      type: "action",
      handler: "variable.set",
      imports: [
        "net.ye6isu.yebisuRPG.data.EntityVarCapability",
        "net.ye6isu.yebisuRPG.data.EntityVar",
      ],
      slotDefaults: {
        value: { opcode: "number.literal", fields: { value: "0" } },
        entity: { opcode: "entity.event" },
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ATTRIBUTES — Data & Actions (hardcoded codegen)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "attribute.get",
    category: "Attributes", sub: "data",
    linkType: "number",
    paletteLabel: "Get Attribute",
    label: "Get Attribute [attrId:dropdown.attributes] [layer:dropdown] for [entity:entity]",
    hint: "Read an attribute value (total / base / bonus) for entity",
    color: "#4d65b4",
    fields: {
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
    category: "Attributes", sub: "actions",
    isAction: true,
    paletteLabel: "Set Attribute Modifier",
    label: "Set Attribute Modifier [attrId:dropdown.attributes] [operation:dropdown] [modifierName:input.text] to [value:number] for [entity:entity]",
    hint: "Add a named modifier to an attribute on entity",
    color: "#4d65b4",
    fields: {
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
    category: "Attributes", sub: "actions",
    isAction: true,
    paletteLabel: "Remove Attr Modifier",
    label: "Remove Attribute Modifier [attrId:dropdown.attributes] [modifierName:input.text] for [entity:entity]",
    hint: "Remove a named modifier from an attribute on entity",
    color: "#4d65b4",
    fields: {
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
    category: "Attributes", sub: "actions",
    isAction: true,
    label: "Reset Attribute Base [attrId:dropdown.attributes] for [entity:entity]",
    hint: "Reset an attribute's base value back to its default on entity",
    color: "#4d65b4",
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

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA COMPONENTS — Data & Actions (hardcoded codegen)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    opcode: "datacomp.get",
    category: "Data Components", sub: "data",
    linkType: "number",
    paletteLabel: "Get Data Component",
    label: "Get Data Component [compName:dropdown.dataComponents]",
    hint: "Get a data component value from the item stack",
    color: "#4d65b4",
    dynamicLinkType: {
      field: "compType",
      map: { bool: "logic", string: "text", "*": "number" },
    },
    codegen: {
      type: "value",
      handler: "datacomp.get",
      imports: ["net.ye6isu.yebisuRPG.component.ModDataComponents"],
    },
  },
  {
    opcode: "datacomp.set",
    category: "Data Components", sub: "actions",
    isAction: true,
    paletteLabel: "Set Data Component",
    label: "Set Data Component [compName:dropdown.dataComponents] to [value:number]",
    hint: "Set a data component value on the item stack",
    color: "#4d65b4",
    dynamicAccepts: {
      value: { field: "compType", map: { bool: "logic", string: "text", "*": "number" } },
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
];

export const blockDefRegistry = new Map();
for (const def of BLOCK_DEFS) {
  blockDefRegistry.set(def.opcode, def);
}
