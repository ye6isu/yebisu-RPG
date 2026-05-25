package net.ye6isu.yebisuRPG.texture;

import io.netty.buffer.Unpooled;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.Tag;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.saveddata.SavedData;
import net.ye6isu.yebisuRPG.texture.network.TextureSyncPayload;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public final class TextureAuthority extends SavedData {

    private static final String DATA_KEY = "yebisurpg_textures";
    private final Map<UUID, List<TextureSyncPayload.LayerData>> stacks = new ConcurrentHashMap<>();

    private static final SavedData.Factory<TextureAuthority> FACTORY =
        new SavedData.Factory<>(TextureAuthority::new, TextureAuthority::load, null);

    public static TextureAuthority get(ServerLevel level) {
        return level.getServer().overworld().getDataStorage().computeIfAbsent(FACTORY, DATA_KEY);
    }

    private TextureAuthority() {}

    public void put(UUID uuid, List<TextureSyncPayload.LayerData> layers) {
        if (layers.isEmpty()) stacks.remove(uuid);
        else stacks.put(uuid, List.copyOf(layers));
        setDirty();
    }

    public void remove(UUID uuid) { if (stacks.remove(uuid) != null) setDirty(); }
    public Map<UUID, List<TextureSyncPayload.LayerData>> getAll() { return Collections.unmodifiableMap(stacks); }
    public void clearAll() { stacks.clear(); setDirty(); }

    @Override
    public CompoundTag save(CompoundTag tag, net.minecraft.core.HolderLookup.Provider registries) {
        ListTag list = new ListTag();
        for (var entry : stacks.entrySet()) {
            CompoundTag entryTag = new CompoundTag();
            entryTag.putUUID("uuid", entry.getKey());
            ListTag layersTag = new ListTag();
            for (TextureSyncPayload.LayerData layer : entry.getValue()) {
                FriendlyByteBuf buf = new FriendlyByteBuf(Unpooled.buffer());
                TextureSyncPayload.LayerData.STREAM_CODEC.encode(buf, layer);
                byte[] bytes = new byte[buf.readableBytes()];
                buf.readBytes(bytes);
                buf.release();
                CompoundTag layerTag = new CompoundTag();
                layerTag.putByteArray("d", bytes);
                layersTag.add(layerTag);
            }
            entryTag.put("layers", layersTag);
            list.add(entryTag);
        }
        tag.put("entries", list);
        return tag;
    }

    private static TextureAuthority load(CompoundTag tag, net.minecraft.core.HolderLookup.Provider registries) {
        TextureAuthority auth = new TextureAuthority();
        ListTag list = tag.getList("entries", Tag.TAG_COMPOUND);
        for (int i = 0; i < list.size(); i++) {
            CompoundTag entryTag = list.getCompound(i);
            UUID uuid = entryTag.getUUID("uuid");
            ListTag layersTag = entryTag.getList("layers", Tag.TAG_COMPOUND);
            List<TextureSyncPayload.LayerData> layers = new ArrayList<>(layersTag.size());
            for (int j = 0; j < layersTag.size(); j++) {
                byte[] bytes = layersTag.getCompound(j).getByteArray("d");
                FriendlyByteBuf buf = new FriendlyByteBuf(Unpooled.wrappedBuffer(bytes));
                try { layers.add(TextureSyncPayload.LayerData.STREAM_CODEC.decode(buf)); }
                finally { buf.release(); }
            }
            if (!layers.isEmpty()) auth.stacks.put(uuid, List.copyOf(layers));
        }
        return auth;
    }
}
