package net.ye6isu.yebisulib.texture;

import io.netty.buffer.Unpooled;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.datafix.DataFixTypes;
import net.minecraft.world.level.saveddata.SavedData;
import net.ye6isu.yebisulib.texture.network.TextureSyncPayload;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisulib/texture/TextureAuthority.class */
public final class TextureAuthority extends SavedData {
    private static final String DATA_KEY = "yebisurpg_textures";
    private final Map<UUID, List<TextureSyncPayload.LayerData>> stacks = new ConcurrentHashMap();
    private static final SavedData.Factory<TextureAuthority> FACTORY = new SavedData.Factory<>(TextureAuthority::new, TextureAuthority::load, (DataFixTypes) null);

    public static TextureAuthority get(ServerLevel level) {
        return (TextureAuthority) level.getServer().overworld().getDataStorage().computeIfAbsent(FACTORY, DATA_KEY);
    }

    private TextureAuthority() {
    }

    public void put(UUID uuid, List<TextureSyncPayload.LayerData> layers) {
        if (layers.isEmpty()) {
            this.stacks.remove(uuid);
        } else {
            this.stacks.put(uuid, List.copyOf(layers));
        }
        setDirty();
    }

    public void remove(UUID uuid) {
        if (this.stacks.remove(uuid) != null) {
            setDirty();
        }
    }

    public Map<UUID, List<TextureSyncPayload.LayerData>> getAll() {
        return Collections.unmodifiableMap(this.stacks);
    }

    public void clearAll() {
        this.stacks.clear();
        setDirty();
    }

    public CompoundTag save(CompoundTag tag, HolderLookup.Provider registries) {
        ListTag list = new ListTag();
        for (Map.Entry<UUID, List<TextureSyncPayload.LayerData>> entry : this.stacks.entrySet()) {
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

    private static TextureAuthority load(CompoundTag tag, HolderLookup.Provider registries) {
        TextureAuthority auth = new TextureAuthority();
        ListTag list = tag.getList("entries", 10);
        for (int i = 0; i < list.size(); i++) {
            CompoundTag entryTag = list.getCompound(i);
            UUID uuid = entryTag.getUUID("uuid");
            ListTag layersTag = entryTag.getList("layers", 10);
            List<TextureSyncPayload.LayerData> layers = new ArrayList<>(layersTag.size());
            for (int j = 0; j < layersTag.size(); j++) {
                byte[] bytes = layersTag.getCompound(j).getByteArray("d");
                FriendlyByteBuf buf = new FriendlyByteBuf(Unpooled.wrappedBuffer(bytes));
                try {
                    layers.add((TextureSyncPayload.LayerData) TextureSyncPayload.LayerData.STREAM_CODEC.decode(buf));
                    buf.release();
                } catch (Throwable th) {
                    buf.release();
                    throw th;
                }
            }
            if (!layers.isEmpty()) {
                auth.stacks.put(uuid, List.copyOf(layers));
            }
        }
        return auth;
    }
}
