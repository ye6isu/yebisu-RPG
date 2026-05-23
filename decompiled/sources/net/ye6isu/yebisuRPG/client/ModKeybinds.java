package net.ye6isu.yebisuRPG.client;

import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.client.KeyMapping;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.RegisterKeyMappingsEvent;
import net.neoforged.neoforge.client.settings.KeyConflictContext;
import net.ye6isu.yebisuRPG.yebisuRPG;

/* JADX INFO: loaded from: yebisurpg-0.0.0.jar:net/ye6isu/yebisuRPG/client/ModKeybinds.class */
@EventBusSubscriber(modid = yebisuRPG.MODID, value = {Dist.CLIENT})
public final class ModKeybinds {
    public static final String CATEGORY = "key.categories.yebisurpg";

    private ModKeybinds() {
    }

    @SubscribeEvent
    public static void register(RegisterKeyMappingsEvent event) {
    }

    private static KeyMapping bind(String name, int glfwKey) {
        return new KeyMapping("key.yebisurpg." + name, KeyConflictContext.IN_GAME, InputConstants.Type.KEYSYM, glfwKey, CATEGORY);
    }

    private static KeyMapping bindGui(String name, int glfwKey) {
        return new KeyMapping("key.yebisurpg." + name, KeyConflictContext.GUI, InputConstants.Type.KEYSYM, glfwKey, CATEGORY);
    }
}
