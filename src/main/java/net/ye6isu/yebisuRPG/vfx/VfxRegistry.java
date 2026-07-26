package net.ye6isu.yebisuRPG.vfx;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/** Common-side registry used to validate YCS-authored effects before broadcasting them. */
public final class VfxRegistry {

    private static final Map<String, Integer> DURATIONS = new LinkedHashMap<>();

    private VfxRegistry() {}

    public static void register(String id, int durationTicks) {
        String normalized = normalize(id);
        if (!normalized.isEmpty()) {
            DURATIONS.put(normalized, Math.clamp(durationTicks, 1, 12_000));
        }
    }

    public static int durationTicks(String id) {
        return DURATIONS.getOrDefault(normalize(id), 0);
    }

    public static boolean contains(String id) {
        return DURATIONS.containsKey(normalize(id));
    }

    public static String normalize(String id) {
        if (id == null) return "";
        String normalized = id.trim().toLowerCase(Locale.ROOT);
        return normalized.matches("[a-z0-9_./-]{1,128}") ? normalized : "";
    }

    public static void bootstrap() {
        VfxRegistry.register("yesss", 20);
        // YCS_Vfx_Definitions
    }
}
