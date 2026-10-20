package net.ye6isu.yebisuRPG.datagen;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import net.minecraft.data.DataGenerator;
import net.minecraft.data.DataProvider;
import net.minecraft.data.PackOutput;
import net.minecraft.resources.ResourceLocation;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Data provider that generates {@code .mcmeta} animation files for textures.
 *
 * <h2>Usage</h2>
 * <pre>{@code
 * // In DataGenerators.getherData():
 * generator.addProvider(event.includeClient(),
 *     new ModAnimationProvider(packOutput)
 *         .animate("yebisurpg:item/texture2", 20, false)   // 20 ticks/frame, no interpolation
 *         .animate("yebisurpg:item/fire",      3, true));   // 3 ticks/frame, interpolated
 * }</pre>
 *
 * <h2>Output</h2>
 * <p>Each call to {@link #animate} produces a file at:</p>
 * <pre>assets/{namespace}/textures/{path}.png.mcmeta</pre>
 *
 * <h2>Frame control</h2>
 * <p>By default all frames play in order (0, 1, 2 …). Use
 * {@link #animate(ResourceLocation, int, boolean, int...)} to specify a custom
 * frame sequence, e.g. {@code 0, 1, 0, 2} for a non-linear animation.</p>
 */
public class ModAnimationProvider implements DataProvider {

    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    private final PackOutput output;
    private final List<AnimationEntry> entries = new ArrayList<>();

    public ModAnimationProvider(PackOutput output) {
        this.output = output;
    }

    // ---------------------------------------------------------------------------------
    // Builder methods
    // ---------------------------------------------------------------------------------

    /**
     * Adds an animation for {@code texture} using all frames in order.
     *
     * @param texture       namespaced texture path, e.g. {@code "yebisurpg:item/texture2"}
     * @param frametime     ticks per frame (20 = 1 second)
     * @param interpolate   whether Minecraft should interpolate between frames
     * @return {@code this} for chaining
     */
    public ModAnimationProvider animate(String texture, int frametime, boolean interpolate) {
        return animate(ResourceLocation.parse(texture), frametime, interpolate);
    }

    /** @see #animate(String, int, boolean) */
    public ModAnimationProvider animate(ResourceLocation texture, int frametime, boolean interpolate) {
        entries.add(new AnimationEntry(texture, frametime, interpolate, new int[0]));
        return this;
    }

    /**
     * Adds an animation with a custom frame sequence.
     *
     * @param texture     namespaced texture path
     * @param frametime   ticks per frame
     * @param interpolate whether to interpolate between frames
     * @param frames      explicit frame indices, e.g. {@code 0, 1, 0, 2}
     * @return {@code this} for chaining
     */
    public ModAnimationProvider animate(ResourceLocation texture, int frametime,
                                        boolean interpolate, int... frames) {
        entries.add(new AnimationEntry(texture, frametime, interpolate, frames));
        return this;
    }

    // ---------------------------------------------------------------------------------
    // DataProvider impl
    // ---------------------------------------------------------------------------------

    @Override
    public CompletableFuture<?> run(net.minecraft.data.CachedOutput cache) {
        List<CompletableFuture<?>> futures = new ArrayList<>();

        for (AnimationEntry entry : entries) {
            Path path = output.getOutputFolder(PackOutput.Target.RESOURCE_PACK)
                .resolve(entry.texture().getNamespace())
                .resolve("textures")
                .resolve(entry.texture().getPath() + ".png.mcmeta");

            JsonObject root       = new JsonObject();
            JsonObject animation  = new JsonObject();
            animation.addProperty("frametime",  entry.frametime());
            animation.addProperty("interpolate", entry.interpolate());

            if (entry.frames().length > 0) {
                JsonArray framesArray = new JsonArray();
                for (int f : entry.frames()) framesArray.add(f);
                animation.add("frames", framesArray);
            }

            root.add("animation", animation);

            futures.add(DataProvider.saveStable(cache, GSON.toJsonTree(root), path));
        }

        return CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new));
    }

    @Override
    public String getName() { return "Animation Metadata (.mcmeta)"; }

    // ---------------------------------------------------------------------------------
    // Internal record
    // ---------------------------------------------------------------------------------

    private record AnimationEntry(
        ResourceLocation texture,
        int frametime,
        boolean interpolate,
        int[] frames) {}
}
