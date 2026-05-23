package net.ye6isu.yebisuRPG.datagen;

import net.minecraft.data.PackOutput;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.Item;
import net.neoforged.neoforge.client.model.generators.ItemModelProvider;
import net.neoforged.neoforge.client.model.generators.ModelFile;
import net.neoforged.neoforge.common.data.ExistingFileHelper;
import net.ye6isu.yebisuRPG.item.ModItems;
import net.ye6isu.yebisuRPG.yebisuRPG;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/datagen/ModItemModelProvider.class */
public class ModItemModelProvider extends ItemModelProvider {
    public ModItemModelProvider(PackOutput output, ExistingFileHelper existingFileHelper) {
        super(output, yebisuRPG.MODID, existingFileHelper);
    }

    protected void registerModels() {
        withExistingParent(ModItems.YE6ISU.getId().getPath(), "minecraft:item/generated").texture("layer0", "yebisurpg:item/texture2");
        ResourceLocation frame0tex = ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "item/walkman_frame0");
        ResourceLocation frame1tex = ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "item/walkman_frame1");
        this.existingFileHelper.trackGenerated(frame0tex, TEXTURE);
        this.existingFileHelper.trackGenerated(frame1tex, TEXTURE);
        getBuilder("walkman_frame0").parent(new ModelFile.UncheckedModelFile("minecraft:item/generated")).texture("layer0", "yebisurpg:item/walkman_frame0");
        getBuilder("walkman_frame1").parent(new ModelFile.UncheckedModelFile("minecraft:item/generated")).texture("layer0", "yebisurpg:item/walkman_frame1");
        getBuilder(ModItems.WALKMAN.getId().getPath()).parent(new ModelFile.UncheckedModelFile("yebisurpg:item/walkman_frame0")).override().predicate(ResourceLocation.fromNamespaceAndPath("minecraft", "custom_model_data"), 1.0f).model(new ModelFile.UncheckedModelFile("yebisurpg:item/walkman_frame1")).end();
        basicItem((Item) ModItems.PLANK.get());
    }
}
