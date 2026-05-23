package net.ye6isu.yebisuRPG.data;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/data/EntityVarType.class */
public enum EntityVarType {
    INT,
    FLOAT,
    BOOL,
    STRING,
    ITEM_STACK;

    public static final byte ID_INT = 0;
    public static final byte ID_FLOAT = 1;
    public static final byte ID_BOOL = 2;
    public static final byte ID_STRING = 3;
    public static final byte ID_ITEM_STACK = 4;

    public byte wireId() throws MatchException {
        switch (ordinal()) {
            case ID_INT:
                return (byte) 0;
            case ID_FLOAT:
                return (byte) 1;
            case ID_BOOL:
                return (byte) 2;
            case ID_STRING:
                return (byte) 3;
            case ID_ITEM_STACK:
                return (byte) 4;
            default:
                throw new MatchException((String) null, (Throwable) null);
        }
    }

    public static EntityVarType fromWireId(byte id) {
        switch (id) {
            case ID_FLOAT:
                return FLOAT;
            case ID_BOOL:
                return BOOL;
            case ID_STRING:
                return STRING;
            case ID_ITEM_STACK:
                return ITEM_STACK;
            default:
                return INT;
        }
    }
}
