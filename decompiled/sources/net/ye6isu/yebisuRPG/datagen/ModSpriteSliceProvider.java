package net.ye6isu.yebisuRPG.datagen;

import com.google.common.hash.Hasher;
import com.google.common.hash.Hashing;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.runtime.ObjectMethods;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import javax.imageio.ImageIO;
import net.minecraft.data.CachedOutput;
import net.minecraft.data.DataProvider;
import net.minecraft.data.PackOutput;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/datagen/ModSpriteSliceProvider.class */
public class ModSpriteSliceProvider implements DataProvider {
    private final PackOutput output;
    private final Path sourceRoot;
    private final String namespace;
    private final List<SliceEntry> entries = new ArrayList();

    public ModSpriteSliceProvider(PackOutput output, Path sourceRoot, String namespace) {
        this.output = output;
        this.sourceRoot = sourceRoot;
        this.namespace = namespace;
    }

    public ModSpriteSliceProvider slice(String sourcePath, int frameWidth, int frameHeight, String... outputPaths) {
        this.entries.add(new SliceEntry(sourcePath, frameWidth, frameHeight, outputPaths));
        return this;
    }

    public CompletableFuture<?> run(CachedOutput cache) {
        List<CompletableFuture<?>> futures = new ArrayList<>();
        for (SliceEntry entry : this.entries) {
            Path sourcePng = this.sourceRoot.resolve("assets").resolve(this.namespace).resolve(entry.sourcePath());
            if (!Files.exists(sourcePng, new LinkOption[0])) {
                throw new RuntimeException("Source sprite not found: " + String.valueOf(sourcePng.toAbsolutePath()) + "\nJVM working dir: " + System.getProperty("user.dir") + "\nsourceRoot: " + String.valueOf(this.sourceRoot.toAbsolutePath()));
            }
            try {
                BufferedImage sheet = ImageIO.read(sourcePng.toFile());
                int cols = sheet.getWidth() / entry.frameWidth();
                int height = sheet.getHeight() / entry.frameHeight();
                for (int i = 0; i < entry.outputPaths().length; i++) {
                    int col = i % cols;
                    int row = i / cols;
                    BufferedImage frame = sheet.getSubimage(col * entry.frameWidth(), row * entry.frameHeight(), entry.frameWidth(), entry.frameHeight());
                    try {
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        try {
                            ImageIO.write(frame, "PNG", baos);
                            byte[] png = baos.toByteArray();
                            baos.close();
                            Path outPath = this.output.getOutputFolder(PackOutput.Target.RESOURCE_PACK).resolve(this.namespace).resolve(entry.outputPaths()[i]);
                            futures.add(CompletableFuture.runAsync(() -> {
                                try {
                                    Hasher hasher = Hashing.sha1().newHasher();
                                    hasher.putBytes(png);
                                    cache.writeIfNeeded(outPath, png, hasher.hash());
                                } catch (IOException e) {
                                    throw new RuntimeException("Failed to write " + String.valueOf(outPath), e);
                                }
                            }));
                        } finally {
                        }
                    } catch (IOException e) {
                        throw new RuntimeException("Cannot encode frame " + i, e);
                    }
                }
            } catch (IOException e2) {
                throw new RuntimeException("Cannot read: " + String.valueOf(sourcePng), e2);
            }
        }
        return CompletableFuture.allOf((CompletableFuture[]) futures.toArray(x$0 -> {
            return new CompletableFuture[x$0];
        }));
    }

    public String getName() {
        return "Sprite Slice Provider";
    }

    /* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/datagen/ModSpriteSliceProvider$SliceEntry.class */
    private static final class SliceEntry extends Record {
        private final String sourcePath;
        private final int frameWidth;
        private final int frameHeight;
        private final String[] outputPaths;

        private SliceEntry(String sourcePath, int frameWidth, int frameHeight, String[] outputPaths) {
            this.sourcePath = sourcePath;
            this.frameWidth = frameWidth;
            this.frameHeight = frameHeight;
            this.outputPaths = outputPaths;
        }

        @Override // java.lang.Record
        public final String toString() {
            return (String) ObjectMethods.bootstrap(MethodHandles.lookup(), "toString", MethodType.methodType(String.class, SliceEntry.class), SliceEntry.class, "sourcePath;frameWidth;frameHeight;outputPaths", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModSpriteSliceProvider$SliceEntry;->sourcePath:Ljava/lang/String;", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModSpriteSliceProvider$SliceEntry;->frameWidth:I", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModSpriteSliceProvider$SliceEntry;->frameHeight:I", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModSpriteSliceProvider$SliceEntry;->outputPaths:[Ljava/lang/String;").dynamicInvoker().invoke(this) /* invoke-custom */;
        }

        @Override // java.lang.Record
        public final int hashCode() {
            return (int) ObjectMethods.bootstrap(MethodHandles.lookup(), "hashCode", MethodType.methodType(Integer.TYPE, SliceEntry.class), SliceEntry.class, "sourcePath;frameWidth;frameHeight;outputPaths", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModSpriteSliceProvider$SliceEntry;->sourcePath:Ljava/lang/String;", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModSpriteSliceProvider$SliceEntry;->frameWidth:I", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModSpriteSliceProvider$SliceEntry;->frameHeight:I", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModSpriteSliceProvider$SliceEntry;->outputPaths:[Ljava/lang/String;").dynamicInvoker().invoke(this) /* invoke-custom */;
        }

        @Override // java.lang.Record
        public final boolean equals(Object o) {
            return (boolean) ObjectMethods.bootstrap(MethodHandles.lookup(), "equals", MethodType.methodType(Boolean.TYPE, SliceEntry.class, Object.class), SliceEntry.class, "sourcePath;frameWidth;frameHeight;outputPaths", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModSpriteSliceProvider$SliceEntry;->sourcePath:Ljava/lang/String;", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModSpriteSliceProvider$SliceEntry;->frameWidth:I", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModSpriteSliceProvider$SliceEntry;->frameHeight:I", "FIELD:Lnet/ye6isu/yebisuRPG/datagen/ModSpriteSliceProvider$SliceEntry;->outputPaths:[Ljava/lang/String;").dynamicInvoker().invoke(this, o) /* invoke-custom */;
        }

        public String sourcePath() {
            return this.sourcePath;
        }

        public int frameWidth() {
            return this.frameWidth;
        }

        public int frameHeight() {
            return this.frameHeight;
        }

        public String[] outputPaths() {
            return this.outputPaths;
        }
    }
}
