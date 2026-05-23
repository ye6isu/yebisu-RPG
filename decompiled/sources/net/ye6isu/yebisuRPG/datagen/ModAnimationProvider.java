package net.ye6isu.yebisuRPG.datagen;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.runtime.ObjectMethods;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import net.minecraft.data.CachedOutput;
import net.minecraft.data.DataProvider;
import net.minecraft.data.PackOutput;
import net.minecraft.resources.ResourceLocation;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/datagen/ModAnimationProvider.class */
public class ModAnimationProvider implements DataProvider {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private final PackOutput output;
    private final List<AnimationEntry> entries = new ArrayList();

    public ModAnimationProvider(PackOutput output) {
        this.output = output;
    }

    public ModAnimationProvider animate(String texture, int frametime, boolean interpolate) {
        return animate(ResourceLocation.parse(texture), frametime, interpolate);
    }

    public ModAnimationProvider animate(ResourceLocation texture, int frametime, boolean interpolate) {
        this.entries.add(new AnimationEntry(texture, frametime, interpolate, new int[0]));
        return this;
    }

    public ModAnimationProvider animate(ResourceLocation texture, int frametime, boolean interpolate, int... frames) {
        this.entries.add(new AnimationEntry(texture, frametime, interpolate, frames));
        return this;
    }

    public CompletableFuture<?> run(CachedOutput cache) {
        List<CompletableFuture<?>> futures = new ArrayList<>();
        for (AnimationEntry entry : this.entries) {
            Path path = this.output.getOutputFolder(PackOutput.Target.RESOURCE_PACK).resolve(entry.texture().getNamespace()).resolve("textures").resolve(entry.texture().getPath() + ".png.mcmeta");
            JsonObject root = new JsonObject();
            JsonObject animation = new JsonObject();
            animation.addProperty("frametime", Integer.valueOf(entry.frametime()));
            animation.addProperty("interpolate", Boolean.valueOf(entry.interpolate()));
            if (entry.frames().length > 0) {
                JsonArray framesArray = new JsonArray();
                for (int f : entry.frames()) {
                    framesArray.add(Integer.valueOf(f));
                }
                animation.add("frames", framesArray);
            }
            root.add("animation", animation);
            futures.add(DataProvider.saveStable(cache, GSON.toJsonTree(root), path));
        }
        return CompletableFuture.allOf((CompletableFuture[]) futures.toArray(x$0 -> {
            return new CompletableFuture[x$0];
        }));
    }

    public String getName() {
        return "Animation Metadata (.mcmeta)";
    }

    /* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/datagen/ModAnimationProvider$AnimationEntry.class */
    private static final class AnimationEntry extends Record {
        private final ResourceLocation texture;
        private final int frametime;
        private final boolean interpolate;
        private final int[] frames;

        private AnimationEntry(ResourceLocation texture, int frametime, boolean interpolate, int[] frames) {
            this.texture = texture;
            this.frametime = frametime;
            this.interpolate = interpolate;
            this.frames = frames;
        }

        @Override // java.lang.Record
        public final String toString() {
            return (String) ObjectMethods.bootstrap(MethodHandles.lookup(), "toString", MethodType.methodType(String.class, AnimationEntry.class), AnimationEntry.class, "texture;frametime;interpolate;frames", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModAnimationProvider$AnimationEntry;->texture:Lnet/minecraft/resources/ResourceLocation;", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModAnimationProvider$AnimationEntry;->frametime:I", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModAnimationProvider$AnimationEntry;->interpolate:Z", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModAnimationProvider$AnimationEntry;->frames:[I").dynamicInvoker().invoke(this) /* invoke-custom */;
        }

        @Override // java.lang.Record
        public final int hashCode() {
            return (int) ObjectMethods.bootstrap(MethodHandles.lookup(), "hashCode", MethodType.methodType(Integer.TYPE, AnimationEntry.class), AnimationEntry.class, "texture;frametime;interpolate;frames", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModAnimationProvider$AnimationEntry;->texture:Lnet/minecraft/resources/ResourceLocation;", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModAnimationProvider$AnimationEntry;->frametime:I", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModAnimationProvider$AnimationEntry;->interpolate:Z", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModAnimationProvider$AnimationEntry;->frames:[I").dynamicInvoker().invoke(this) /* invoke-custom */;
        }

        @Override // java.lang.Record
        public final boolean equals(Object o) {
            return (boolean) ObjectMethods.bootstrap(MethodHandles.lookup(), "equals", MethodType.methodType(Boolean.TYPE, AnimationEntry.class, Object.class), AnimationEntry.class, "texture;frametime;interpolate;frames", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModAnimationProvider$AnimationEntry;->texture:Lnet/minecraft/resources/ResourceLocation;", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModAnimationProvider$AnimationEntry;->frametime:I", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModAnimationProvider$AnimationEntry;->interpolate:Z", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModAnimationProvider$AnimationEntry;->frames:[I").dynamicInvoker().invoke(this, o) /* invoke-custom */;
        }

        public ResourceLocation texture() {
            return this.texture;
        }

        public int frametime() {
            return this.frametime;
        }

        public boolean interpolate() {
            return this.interpolate;
        }

        public int[] frames() {
            return this.frames;
        }
    }
}
