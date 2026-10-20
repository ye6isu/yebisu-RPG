package net.ye6isu.yebisuRPG.datagen;

import net.minecraft.data.CachedOutput;
import net.minecraft.data.DataProvider;
import net.minecraft.data.PackOutput;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Data provider that slices a spritesheet PNG into individual frame PNGs at build time.
 *
 * <p>The source spritesheet lives in {@code src/main/resources} and is read at build
 * time. The sliced frames are written to {@code src/generated/resources} and included
 * in the final JAR automatically — no manual PNG editing required.</p>
 *
 * <h2>Usage — in DataGenerators</h2>
 * <pre>{@code
 * generator.addProvider(event.includeClient(),
 *     new ModSpriteSliceProvider(packOutput, sourceRoot, "yebisurpg")
 *         .slice("textures/item/texture2.png", 16, 16,
 *                "textures/item/walkman_frame0.png",
 *                "textures/item/walkman_frame1.png"));
 * }</pre>
 *
 * <p>Frames are read left-to-right, top-to-bottom from the source sheet.</p>
 */
public class ModSpriteSliceProvider implements DataProvider {

    private final PackOutput output;
    private final Path sourceRoot;
    private final String namespace;
    private final List<SliceEntry> entries = new ArrayList<>();

    /**
     * @param output     datagen pack output
     * @param sourceRoot absolute path to {@code src/main/resources}
     * @param namespace  mod namespace, e.g. {@code "yebisurpg"}
     */
    public ModSpriteSliceProvider(PackOutput output, Path sourceRoot, String namespace) {
        this.output     = output;
        this.sourceRoot = sourceRoot;
        this.namespace  = namespace;
    }

    /**
     * Registers a spritesheet slice job.
     *
     * @param sourcePath   path under {@code assets/{namespace}/} in src/main/resources,
     *                     e.g. {@code "textures/item/texture2.png"}
     * @param frameWidth   frame width in pixels
     * @param frameHeight  frame height in pixels
     * @param outputPaths  one output path per frame under {@code assets/{namespace}/},
     *                     e.g. {@code "textures/item/walkman_frame0.png"}
     */
    public ModSpriteSliceProvider slice(String sourcePath, int frameWidth, int frameHeight,
                                        String... outputPaths) {
        entries.add(new SliceEntry(sourcePath, frameWidth, frameHeight, outputPaths));
        return this;
    }

    @Override
    public CompletableFuture<?> run(CachedOutput cache) {
        List<CompletableFuture<?>> futures = new ArrayList<>();

        for (SliceEntry entry : entries) {
            Path sourcePng = sourceRoot
                .resolve("assets").resolve(namespace).resolve(entry.sourcePath());

            if (!Files.exists(sourcePng)) {
                throw new RuntimeException(
                    "Source sprite not found: " + sourcePng.toAbsolutePath() +
                    "\nJVM working dir: " + System.getProperty("user.dir") +
                    "\nsourceRoot: " + sourceRoot.toAbsolutePath());
            }

            BufferedImage sheet;
            try { sheet = ImageIO.read(sourcePng.toFile()); }
            catch (IOException e) { throw new RuntimeException("Cannot read: " + sourcePng, e); }

            int cols = sheet.getWidth()  / entry.frameWidth();
            int rows = sheet.getHeight() / entry.frameHeight();

            for (int i = 0; i < entry.outputPaths().length; i++) {
                int col = i % cols;
                int row = i / cols;

                BufferedImage frame = sheet.getSubimage(
                    col * entry.frameWidth(), row * entry.frameHeight(),
                    entry.frameWidth(), entry.frameHeight());

                byte[] png;
                try (var baos = new ByteArrayOutputStream()) {
                    ImageIO.write(frame, "PNG", baos);
                    png = baos.toByteArray();
                } catch (IOException e) { throw new RuntimeException("Cannot encode frame " + i, e); }

                Path outPath = output.getOutputFolder(PackOutput.Target.RESOURCE_PACK)
                    .resolve(namespace).resolve(entry.outputPaths()[i]);

                futures.add(CompletableFuture.runAsync(() -> {
                    try {
                        // Compute hash manually for CachedOutput deduplication
                        var hasher = com.google.common.hash.Hashing.sha1().newHasher();
                        hasher.putBytes(png);
                        cache.writeIfNeeded(outPath, png, hasher.hash());
                    } catch (IOException e) {
                        throw new RuntimeException("Failed to write " + outPath, e);
                    }
                }));
            }
        }

        return CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new));
    }

    @Override
    public String getName() { return "Sprite Slice Provider"; }

    private record SliceEntry(String sourcePath, int frameWidth, int frameHeight,
                               String[] outputPaths) {}
}
