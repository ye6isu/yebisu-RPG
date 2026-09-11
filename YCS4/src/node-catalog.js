export const YCS3_TYPE_COLORS = Object.freeze({
  number: '#4d65b4',
  string: '#5ba558',
  boolean: '#6494a4',
  entity: '#30e1b9',
});

export const NODE_DEFINITIONS = Object.freeze([
  {
    kind: 'entity.context',
    opcode: 'entity.event',
    label: 'Entity',
    color: YCS3_TYPE_COLORS.entity,
    outputType: 'entity',
    outputLabel: 'Return',
    compact: true,
    field: {
      type: 'select',
      default: 'entity.event',
      options: [
        { value: 'entity.event', label: 'Event Entity' },
        { value: 'entity.target', label: 'Target Entity' },
        { value: 'aoe.iterator.entity', label: 'Iterator Entity' },
      ],
    },
  },
  {
    kind: 'entity.position',
    opcode: 'entity.position',
    label: 'Get Position',
    color: YCS3_TYPE_COLORS.number,
    inputType: 'entity',
    inputLabel: 'Entity',
    outputType: 'number',
    outputs: [
      { id: 'x', label: 'X', type: 'number' },
      { id: 'y', label: 'Y', type: 'number' },
      { id: 'z', label: 'Z', type: 'number' },
    ],
  },
  {
    kind: 'entity.look_dir', opcode: 'entity.look_dir', label: 'Get Look Direction',
    color: YCS3_TYPE_COLORS.number, inputType: 'entity', inputLabel: 'Entity', outputType: 'number',
    outputs: [
      { id: 'x', label: 'X', type: 'number' },
      { id: 'y', label: 'Y', type: 'number' },
      { id: 'z', label: 'Z', type: 'number' },
    ],
  },
  {
    kind: 'entity.is_crouching', opcode: 'entity.is_crouching', label: 'Is Crouching',
    color: YCS3_TYPE_COLORS.boolean, inputType: 'entity', inputLabel: 'Entity', outputType: 'boolean', outputLabel: 'Return',
  },
  {
    kind: 'entity.get_health', opcode: 'entity.get_health', label: 'Get Health',
    color: YCS3_TYPE_COLORS.number, inputType: 'entity', inputLabel: 'Entity', outputType: 'number', outputLabel: 'Return',
  },
  {
    kind: 'entity.is_dashing', opcode: 'entity.is_dashing', label: 'Is Dashing',
    color: YCS3_TYPE_COLORS.boolean, inputType: 'entity', inputLabel: 'Entity', outputType: 'boolean', outputLabel: 'Return',
  },
  {
    kind: 'logic.boolean',
    opcode: 'logic.true',
    label: 'Boolean',
    color: YCS3_TYPE_COLORS.boolean,
    outputType: 'boolean',
    outputLabel: 'Return',
    field: { type: 'boolean', default: true },
    compact: true,
  },
  {
    kind: 'logic.not', opcode: 'logic.not', label: 'Not',
    color: YCS3_TYPE_COLORS.boolean, inputType: 'boolean', inputLabel: 'Boolean', outputType: 'boolean', outputLabel: 'Return',
  },
  {
    kind: 'effect.apply', opcode: 'effect.apply', label: 'Apply Effect', color: '#c46c94', flow: true,
    inputType: 'entity', inputId: 'entity', inputLabel: 'Entity',
    inputs: [
      { id: 'duration', label: 'Duration', type: 'number', default: '0' },
      { id: 'level', label: 'Level', type: 'number', default: '0' },
    ],
    defaults: { effect: 'MobEffects.REGENERATION', showParticles: true },
  },
  {
    kind: 'entity.set_health', opcode: 'entity.set_health', label: 'Set Health', color: '#c46c94', flow: true,
    inputType: 'number', inputId: 'amount', inputLabel: 'Health', field: { type: 'number', default: '20', hideWhenConnected: true },
    inputs: [{ id: 'entity', label: 'Entity', type: 'entity' }],
  },
  {
    kind: 'entity.apply_motion', opcode: 'entity.apply_motion', label: 'Apply Motion', color: '#c46c94', flow: true,
    inputType: 'number', inputId: 'x', inputLabel: 'X', field: { type: 'number', default: '0', hideWhenConnected: true },
    inputs: [
      { id: 'y', label: 'Y', type: 'number', default: '0' },
      { id: 'z', label: 'Z', type: 'number', default: '0' },
      { id: 'entity', label: 'Entity', type: 'entity' },
      {
        id: 'mode', label: 'Mode', type: 'select', default: 'add', connectable: false,
        options: [
          { value: 'add', label: 'Add (impulse)' },
          { value: 'set', label: 'Set (override)' },
        ],
      },
    ],
    defaults: { mode: 'add' },
  },
  {
    kind: 'projectile.fire', opcode: 'projectile.fire', label: 'Fire Projectile', color: '#c46c94', flow: true,
    inputType: 'entity', inputId: 'entity', inputLabel: 'Entity',
    inputs: [
      { id: 'x', label: 'X', type: 'number', default: '0' },
      { id: 'y', label: 'Y', type: 'number', default: '0' },
      { id: 'z', label: 'Z', type: 'number', default: '0' },
      { id: 'power', label: 'Power', type: 'number', default: '1.5' },
    ],
    defaults: { projectile: 'minecraft:arrow' },
  },
  {
    kind: 'entity.dash', opcode: 'entity.dash', label: 'Dash', color: '#c46c94', flow: true,
    inputType: 'entity', inputId: 'entity', inputLabel: 'Entity',
    inputs: [
      { id: 'x', label: 'X', type: 'number', default: '0' },
      { id: 'y', label: 'Y', type: 'number', default: '0' },
      { id: 'z', label: 'Z', type: 'number', default: '0' },
      { id: 'distance', label: 'Distance', type: 'number', default: '10' },
      { id: 'ticks', label: 'Ticks', type: 'number', default: '5' },
      {
        id: 'easing', label: 'Interpolation', type: 'select', default: 'LINEAR', connectable: false,
        options: [
          { value: 'LINEAR', label: 'Linear' },
          { value: 'EASE_IN', label: 'Ease In' },
          { value: 'EASE_OUT', label: 'Ease Out' },
          { value: 'EASE_IN_OUT', label: 'Ease In Out' },
        ],
      },
    ],
    defaults: { easing: 'LINEAR', hasCollision: false, hasThen: false, showParticles: false },
  },
  {
    kind: 'number.math', opcode: 'number.math', label: 'Math', color: YCS3_TYPE_COLORS.number,
    inputType: 'number', inputId: 'a', inputLabel: 'A',
    field: { type: 'number', default: '0', hideWhenConnected: true },
    outputType: 'number', outputLabel: 'Return',
    inputs: [
      { id: 'b', label: 'B', type: 'number', default: '0' },
      {
        id: 'operation', label: 'Operation', type: 'select', default: '+', connectable: false,
        options: [
          { value: '+', label: '+' },
          { value: '-', label: '-' },
          { value: '*', label: '×' },
          { value: '/', label: '÷' },
          { value: '%', label: '%' },
          { value: 'min', label: 'min' },
          { value: 'max', label: 'max' },
          { value: 'pow', label: 'pow' },
        ],
      },
    ],
  },
  {
    kind: 'number.literal', opcode: 'number.literal', label: 'Number', color: YCS3_TYPE_COLORS.number,
    outputType: 'number', outputLabel: 'Return',
    field: { type: 'number', default: '0' },
    compact: true,
  },
  {
    kind: 'text.literal', opcode: 'text.literal', label: 'Text', color: YCS3_TYPE_COLORS.string,
    outputType: 'string', outputLabel: 'Return',
    field: { type: 'text', default: '' },
    compact: true,
  },
  {
    kind: 'entity.deal_damage', opcode: 'entity.deal_damage', label: 'Deal Damage', color: '#c46c94', flow: true,
    inputType: 'number', inputId: 'amount', inputLabel: 'Amount', field: { type: 'number', default: '1', hideWhenConnected: true },
    inputs: [
      { id: 'target', label: 'Target', type: 'entity' },
      { id: 'attacker', label: 'Attacker', type: 'entity' },
    ],
    defaults: { dmgType: 'mob' },
  },
  {
    kind: 'control.if', opcode: 'control.if', label: 'If', color: YCS3_TYPE_COLORS.boolean, flow: true,
    inputType: 'boolean', inputId: 'condition', inputLabel: 'Condition 1',
    defaults: { elseIfCount: 0, hasElse: false },
  },
].sort((left, right) => left.label.localeCompare(right.label)));

export const nodeDefinitionFor = kind => NODE_DEFINITIONS.find(definition => definition.kind === kind)
  || NODE_DEFINITIONS[0];
