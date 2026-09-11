export const YCS3_TYPE_COLORS = Object.freeze({
  number: '#4d65b4',
  string: '#5ba558',
  boolean: '#6494a4',
  entity: '#30e1b9',
});

export const NODE_DEFINITIONS = Object.freeze([
  {
    kind: 'test',
    opcode: 'prototype.test',
    label: 'Test Node',
    color: '#687f9b',
    flow: true,
    inputType: 'number',
    outputType: 'number',
    inputLabel: 'Input',
    outputLabel: 'Return',
    field: { type: 'number', default: '0', hideWhenConnected: true },
  },
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
    kind: 'entity.part_hit_name', opcode: 'entity.part_hit_name', label: 'Hit Part Name',
    color: YCS3_TYPE_COLORS.string, outputType: 'string', outputLabel: 'Return', compact: true,
  },
  {
    kind: 'entity.part_hit_damage', opcode: 'entity.part_hit_damage', label: 'Hit Part Damage',
    color: YCS3_TYPE_COLORS.number, outputType: 'number', outputLabel: 'Return', compact: true,
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
]);

export const nodeDefinitionFor = kind => NODE_DEFINITIONS.find(definition => definition.kind === kind)
  || NODE_DEFINITIONS[0];
