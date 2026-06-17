package net.ye6isu.yebisuRPG.datagen;

import com.google.gson.GsonBuilder;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.data.CachedOutput;
import net.minecraft.data.DataProvider;
import net.minecraft.resources.ResourceLocation;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * One-off datagen provider that dumps every vanilla item id to
 * {@code ycs_vanilla_items.json} (next to YCS's other managed JSON files) so YCS's
 * item pickers (icon picker, variable default item stack, recipe ingredients) can
 * offer the full vanilla item registry without needing a live game connection at
 * edit time — server.js reads this static file directly.
 *
 * <p>Vanilla's item registry is stable for a given Minecraft version, so this only
 * needs to be re-run (via RunData) if the target MC version changes — it is not
 * part of the mod's normal build output and is not registered for {@code includeServer}/
 * {@code includeClient} packs, only invoked directly from {@link DataGenerators}.</p>
 */
public class YCSVanillaItemDumpProvider implements DataProvider {

    @Override
    public CompletableFuture<?> run(CachedOutput cache) {
        List<String> ids = new ArrayList<>();
        for (ResourceLocation id : BuiltInRegistries.ITEM.keySet()) {
            ids.add(id.toString());
        }
        ids.sort(Comparator.naturalOrder());

        String sourceResourcesProp = System.getProperty("yebisurpg.sourceResources");
        if (sourceResourcesProp == null) {
            throw new IllegalStateException(
                "System property 'yebisurpg.sourceResources' is not set. " +
                "Make sure it is defined in the 'data' run config in build.gradle.");
        }
        Path target = Path.of(sourceResourcesProp, "assets", "yebisurpg", "ycs_vanilla_items.json");
        String json = new GsonBuilder().setPrettyPrinting().create().toJson(ids);
        return DataProvider.saveStable(cache, com.google.gson.JsonParser.parseString(json), target);
    }

    @Override
    public String getName() {
        return "YCS Vanilla Item Dump";
    }
}
