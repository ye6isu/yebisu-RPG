package net.ye6isu.yebisuRPG.data;

/**
 * The supported types for entity variables in the RPG data system.
 *
 * <h2>Type → wire codec mapping</h2>
 * <ul>
 *   <li>{@link #INT}       — {@code VAR_INT}, fits mana pools, damage values, level, stacks</li>
 *   <li>{@link #FLOAT}     — {@code FLOAT}, fits percentages, multipliers, regen rates</li>
 *   <li>{@link #BOOL}      — {@code BOOL} (1 byte), fits flags like "is stunned", "has shield"</li>
 *   <li>{@link #STRING}    — {@code stringUtf8(256)}, fits status names, ability IDs</li>
 *   <li>{@link #ITEM_STACK} — {@code ItemStack.STREAM_CODEC}, fits inventory slots,
 *       ability catalysts, mob loot tables. Can be marked {@code dropOnDeath=true}.</li>
 * </ul>
 */
public enum EntityVarType {
    INT, FLOAT, BOOL, STRING, ITEM_STACK, DOUBLE;

    public static final byte ID_INT        = 0;
    public static final byte ID_FLOAT      = 1;
    public static final byte ID_BOOL       = 2;
    public static final byte ID_STRING     = 3;
    public static final byte ID_ITEM_STACK = 4;
    public static final byte ID_DOUBLE     = 5;

    public byte wireId() {
        return switch (this) {
            case INT        -> ID_INT;
            case FLOAT      -> ID_FLOAT;
            case BOOL       -> ID_BOOL;
            case STRING     -> ID_STRING;
            case ITEM_STACK -> ID_ITEM_STACK;
            case DOUBLE     -> ID_DOUBLE;
        };
    }

    public static EntityVarType fromWireId(byte id) {
        return switch (id) {
            case ID_FLOAT      -> FLOAT;
            case ID_BOOL       -> BOOL;
            case ID_STRING     -> STRING;
            case ID_ITEM_STACK -> ITEM_STACK;
            case ID_DOUBLE     -> DOUBLE;
            default            -> INT;
        };
    }
}
