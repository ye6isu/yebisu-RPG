package net.ye6isu.yebisuRPG.animation.client;

import com.google.gson.*;
import net.minecraft.client.Minecraft;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.resources.Resource;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.api.distmarker.OnlyIn;
import net.ye6isu.yebisuRPG.yebisuRPG;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@OnlyIn(Dist.CLIENT)
public final class HandAnimationLoader {

    public static final HandAnimationLoader INSTANCE = new HandAnimationLoader();

    // ── Easing ───────────────────────────────────────────────────────────────

    /** All supported easing IDs (lowercase, matching Blockbench/AzureLib output). */
    public enum Easing {
        NONE, LINEAR, STEP,
        EASEINSINE, EASEOUTSINE, EASEINOUTSINE,
        EASEINQUAD, EASEOUTQUAD, EASEINOUTQUAD,
        EASEINCUBIC, EASEOUTCUBIC, EASEINOUTCUBIC,
        EASEINQUART, EASEOUTQUART, EASEINOUTQUART,
        EASEINQUINT, EASEOUTQUINT, EASEINOUTQUINT,
        EASEINEXPO, EASEOUTEXPO, EASEINOUTEXPO,
        EASEINCIRC, EASEOUTCIRC, EASEINOUTCIRC,
        EASEINBACK, EASEOUTBACK, EASEINOUTBACK,
        EASEINELASTIC, EASEOUTELASTIC, EASEINOUTELASTIC,
        EASEINBOUNCE, EASEOUTBOUNCE, EASEINOUTBOUNCE,
        CATMULLROM, BEZIER, BEZIER_AFTER;

        static Easing from(String s) {
            if (s == null) return LINEAR;
            // normalise: strip underscores/spaces, lowercase
            String key = s.toLowerCase(Locale.ROOT).replace("_", "").replace(" ", "");
            return switch (key) {
                case "none"            -> NONE;
                case "step"            -> STEP;
                case "easeinsine"      -> EASEINSINE;
                case "easeoutsine"     -> EASEOUTSINE;
                case "easeinoutsine"   -> EASEINOUTSINE;
                case "easeinquad"      -> EASEINQUAD;
                case "easeoutquad"     -> EASEOUTQUAD;
                case "easeinoutquad"   -> EASEINOUTQUAD;
                case "easeincubic"     -> EASEINCUBIC;
                case "easeoutcubic"    -> EASEOUTCUBIC;
                case "easeinoutcubic"  -> EASEINOUTCUBIC;
                case "easeinquart"     -> EASEINQUART;
                case "easeoutquart"    -> EASEOUTQUART;
                case "easeinoutquart"  -> EASEINOUTQUART;
                case "easeinquint"     -> EASEINQUINT;
                case "easeoutquint"    -> EASEOUTQUINT;
                case "easeinoutquint"  -> EASEINOUTQUINT;
                case "easeinexpo"      -> EASEINEXPO;
                case "easeoutexpo"     -> EASEOUTEXPO;
                case "easeinoutexpo"   -> EASEINOUTEXPO;
                case "easeincirc"      -> EASEINCIRC;
                case "easeoutcirc"     -> EASEOUTCIRC;
                case "easeinoutcirc"   -> EASEINOUTCIRC;
                case "easeinback"      -> EASEINBACK;
                case "easeoutback"     -> EASEOUTBACK;
                case "easeinoutback"   -> EASEINOUTBACK;
                case "easeinelastic"   -> EASEINELASTIC;
                case "easeoutelastic"  -> EASEOUTELASTIC;
                case "easeinoutelastic"-> EASEINOUTELASTIC;
                case "easeinbounce"    -> EASEINBOUNCE;
                case "easeoutbounce"   -> EASEOUTBOUNCE;
                case "easeinoutbounce" -> EASEINOUTBOUNCE;
                case "catmullrom"      -> CATMULLROM;
                case "bezier"          -> BEZIER;
                case "bezierafter"     -> BEZIER_AFTER;
                default                -> LINEAR;
            };
        }
    }

    // ── Standard easings.net formulas — matches Blockbench's preview exactly ──

    private static double applyEasing(Easing e, double t, double arg) {
        // clamp to avoid NaN at boundaries
        t = Math.max(0.0, Math.min(1.0, t));
        return switch (e) {
            case NONE, LINEAR       -> t;
            case STEP               -> t < 1.0 ? Math.floor(t * (arg < 2 ? 2 : arg)) / (arg < 2 ? 2 : arg) : 1.0;

            case EASEINSINE         -> 1.0 - Math.cos(t * Math.PI / 2.0);
            case EASEOUTSINE        -> Math.sin(t * Math.PI / 2.0);
            case EASEINOUTSINE      -> -(Math.cos(Math.PI * t) - 1.0) / 2.0;

            case EASEINQUAD         -> t * t;
            case EASEOUTQUAD        -> 1.0 - (1.0 - t) * (1.0 - t);
            case EASEINOUTQUAD      -> t < 0.5 ? 2.0*t*t : 1.0 - Math.pow(-2.0*t+2.0,2.0)/2.0;

            case EASEINCUBIC        -> t * t * t;
            case EASEOUTCUBIC       -> 1.0 - Math.pow(1.0-t, 3.0);
            case EASEINOUTCUBIC     -> t < 0.5 ? 4.0*t*t*t : 1.0 - Math.pow(-2.0*t+2.0,3.0)/2.0;

            case EASEINQUART        -> t * t * t * t;
            case EASEOUTQUART       -> 1.0 - Math.pow(1.0-t, 4.0);
            case EASEINOUTQUART     -> t < 0.5 ? 8.0*t*t*t*t : 1.0 - Math.pow(-2.0*t+2.0,4.0)/2.0;

            case EASEINQUINT        -> t * t * t * t * t;
            case EASEOUTQUINT       -> 1.0 - Math.pow(1.0-t, 5.0);
            case EASEINOUTQUINT     -> t < 0.5 ? 16.0*t*t*t*t*t : 1.0 - Math.pow(-2.0*t+2.0,5.0)/2.0;

            case EASEINEXPO         -> t == 0.0 ? 0.0 : Math.pow(2.0, 10.0*t - 10.0);
            case EASEOUTEXPO        -> t == 1.0 ? 1.0 : 1.0 - Math.pow(2.0, -10.0*t);
            case EASEINOUTEXPO      -> t == 0.0 ? 0.0 : t == 1.0 ? 1.0
                                        : t < 0.5 ? Math.pow(2.0, 20.0*t-10.0)/2.0
                                                  : (2.0 - Math.pow(2.0,-20.0*t+10.0))/2.0;

            case EASEINCIRC         -> 1.0 - Math.sqrt(1.0 - t*t);
            case EASEOUTCIRC        -> Math.sqrt(1.0 - Math.pow(t-1.0, 2.0));
            case EASEINOUTCIRC      -> t < 0.5 ? (1.0 - Math.sqrt(1.0 - Math.pow(2.0*t,2.0)))/2.0
                                               : (Math.sqrt(1.0 - Math.pow(-2.0*t+2.0,2.0))+1.0)/2.0;

            case EASEINBACK         -> { double s = arg == 0 ? 1.70158 : arg; double d = s+1.0; yield d*t*t*t - s*t*t; }
            case EASEOUTBACK        -> { double s = arg == 0 ? 1.70158 : arg; double d = s+1.0; yield 1.0 + d*Math.pow(t-1.0,3.0) + s*Math.pow(t-1.0,2.0); }
            case EASEINOUTBACK      -> { double s = arg == 0 ? 1.70158 : arg; double h = s*1.525;
                                         yield t < 0.5 ? (Math.pow(2.0*t,2.0)*(7.189819*t - h))/2.0
                                                       : (Math.pow(2.0*t-2.0,2.0)*((h+1.0)*(2.0*t-2.0)+h)+2.0)/2.0; }

            case EASEINELASTIC      -> { if (t==0.0) yield 0.0; if (t==1.0) yield 1.0;
                                         double em = arg == 0 ? 1.0 : arg, v1 = (2.0*Math.PI)/3.0;
                                         yield -Math.pow(2.0,10.0*t-10.0) * Math.sin((10.0*t-10.75)*v1*em); }
            case EASEOUTELASTIC     -> { if (t==0.0) yield 0.0; if (t==1.0) yield 1.0;
                                         double em = arg == 0 ? 1.0 : arg, v2 = (2.0*Math.PI)/3.0;
                                         yield Math.pow(2.0,-10.0*t) * Math.sin((10.0*t-0.75)*v2*em) + 1.0; }
            case EASEINOUTELASTIC   -> { if (t==0.0) yield 0.0; if (t==1.0) yield 1.0;
                                         double em = arg == 0 ? 1.0 : arg, gm = (2.0*Math.PI)/4.5;
                                         yield t < 0.5
                                             ? -(Math.pow(2.0, 20.0*t-10.0) * Math.sin((20.0*t-11.125)*gm*em)) / 2.0
                                             :  (Math.pow(2.0,-20.0*t+10.0) * Math.sin((20.0*t-11.125)*gm*em)) / 2.0 + 1.0; }

            case EASEINBOUNCE       -> 1.0 - easeOutBounce(1.0 - t);
            case EASEOUTBOUNCE      -> easeOutBounce(t);
            case EASEINOUTBOUNCE    -> t < 0.5 ? (1.0 - easeOutBounce(1.0-2.0*t))/2.0
                                               : (1.0 + easeOutBounce(2.0*t-1.0))/2.0;

            case CATMULLROM         -> catmullRom(t, 0.0, 0.0, 1.0, 1.0);
            case BEZIER, BEZIER_AFTER -> t;
        };
    }

    private static double easeOutBounce(double t) {
        double n1 = 7.5625, d1 = 2.75;
        if (t < 1.0/d1)         return n1*t*t;
        if (t < 2.0/d1)         return n1*(t -= 1.5/d1)*t + 0.75;
        if (t < 2.5/d1)         return n1*(t -= 2.25/d1)*t + 0.9375;
                                 return n1*(t -= 2.625/d1)*t + 0.984375;
    }

    private static double catmullRom(double t, double p0, double p1, double p2, double p3) {
        return 0.5 * ((2.0*p1) + (p2-p0)*t + (2.0*p0 - 5.0*p1 + 4.0*p2 - p3)*t*t
                                            + (3.0*p1 - p0 - 3.0*p2 + p3)*t*t*t);
    }

    // ── Keyframe ─────────────────────────────────────────────────────────────

    /** One keyframe: time, values[3], easing for the segment after this key, optional arg. */
    record Keyframe(float time, float x, float y, float z,
                    Easing easing, float easingArg, float[] easingArgs) {}

    // ── BoneChannel ──────────────────────────────────────────────────────────

    public record BoneChannel(Keyframe[] keys) {
        public float evalX(float t) { return eval(0, t); }
        public float evalY(float t) { return eval(1, t); }
        public float evalZ(float t) { return eval(2, t); }

        private float eval(int axis, float t) {
            if (keys.length == 0) return 0f;
            if (t <= keys[0].time()) return axisVal(keys[0], axis);
            for (int i = 1; i < keys.length; i++) {
                Keyframe prev = keys[i - 1];
                Keyframe curr = keys[i];
                if (t <= curr.time()) {
                    float span  = curr.time() - prev.time();
                    float alpha = span == 0f ? 1f : (t - prev.time()) / span;
                    float start = axisVal(prev, axis);
                    float end   = axisVal(curr, axis);
                    Easing easing = curr.easing();

                    if (easing == Easing.CATMULLROM) {
                        // Need neighbours for catmull-rom
                        float p0 = i >= 2               ? axisVal(keys[i - 2], axis) : start;
                        float p3 = i + 1 < keys.length  ? axisVal(keys[i + 1], axis) : end;
                        return (float) catmullRom(alpha, p0, start, end, p3);
                    }

                    if (easing == Easing.BEZIER || easing == Easing.BEZIER_AFTER) {
                        return evalBezier(easing, curr, alpha, span, start, end, axis);
                    }

                    double a = applyEasing(easing, alpha, curr.easingArg());
                    return start + (end - start) * (float) a;
                }
            }
            return axisVal(keys[keys.length - 1], axis);
        }

        private static float axisVal(Keyframe k, int axis) {
            return axis == 0 ? k.x() : axis == 1 ? k.y() : k.z();
        }

        /** Cubic bezier curve eval matching AzureLib BezierEasing logic. */
        private static float evalBezier(Easing type, Keyframe prev,
                                        float alpha, float span,
                                        float start, float end, int axis) {
            float[] args = prev.easingArgs();
            boolean before = type == Easing.BEZIER;
            double rightVal, rightTime, leftVal, leftTime;
            if (args == null || args.length == 0) {
                rightVal = 0; rightTime = 0.1; leftVal = 0; leftTime = -0.1;
            } else {
                rightVal  = before ? 0              : args[0];
                rightTime = before ? 0.1            : (args.length > 1 ? args[1] : 0.1);
                leftVal   = before ? args[0]        : 0;
                leftTime  = before ? (args.length > 1 ? args[1] : -0.1) : -0.1;
                if (args.length > 3) {
                    rightVal  = args[2];
                    rightTime = args[3];
                }
            }
            double dur = span; // seconds
            double clampedRight = Math.max(0, Math.min(rightTime, dur));
            double clampedLeft  = Math.max(-dur, Math.min(leftTime, 0));
            // Control points (time, value)
            double p0t = 0,   p0v = start;
            double p1t = clampedRight, p1v = start + rightVal;
            double p2t = clampedLeft + dur, p2v = end + leftVal;
            double p3t = dur, p3v = end;
            double time = dur * alpha;
            // Sample cubic bezier at 200 points, find closest to our time
            double bestT = alpha;
            double bestDist = Double.MAX_VALUE;
            double prevPt = 0, prevPv = p0v;
            for (int s = 1; s <= 200; s++) {
                double u = s / 200.0;
                double u2 = u * u, u3 = u2 * u, v = 1 - u, v2 = v * v, v3 = v2 * v;
                double pt = v3*p0t + 3*v2*u*p1t + 3*v*u2*p2t + u3*p3t;
                double pv = v3*p0v + 3*v2*u*p1v + 3*v*u2*p2v + u3*p3v;
                double dist = Math.abs(pt - time);
                if (dist < bestDist) { bestDist = dist; bestT = u; }
                if (pt >= time && s > 1) {
                    // linear interpolate between previous and current sample
                    double frac = (bestDist < Math.abs(prevPt - time)) ? 0 :
                            (time - prevPt) / Math.max(1e-10, pt - prevPt);
                    return (float)(prevPv + (pv - prevPv) * frac);
                }
                prevPt = pt; prevPv = pv;
            }
            return end;
        }
    }

    public record BonePose(BoneChannel rotation, BoneChannel position) {}

    public record AnimData(float length, Map<String, BonePose> bones) {
        public BonePose bone(String name) { return bones.getOrDefault(name, EMPTY_POSE); }
    }

    private static final BoneChannel EMPTY_CHANNEL = new BoneChannel(new Keyframe[0]);
    private static final BonePose    EMPTY_POSE    = new BonePose(EMPTY_CHANNEL, EMPTY_CHANNEL);
    public  static final BonePose    EMPTY_POSE_PUBLIC = EMPTY_POSE;

    // ── Cache / loading ───────────────────────────────────────────────────────

    private final Map<String, AnimData> cache = new HashMap<>();
    private boolean loaded = false;

    private HandAnimationLoader() {}

    public void invalidate() { cache.clear(); loaded = false; }

    public AnimData get(String animName) { if (!loaded) load(); return cache.get(animName); }

    private void load() {
        loaded = true;
        ResourceLocation loc = ResourceLocation.fromNamespaceAndPath(yebisuRPG.MODID, "animations/animations.json");
        try {
            Optional<Resource> res = Minecraft.getInstance().getResourceManager().getResource(loc);
            if (res.isEmpty()) { yebisuRPG.LOGGER.warn("[HandAnimationLoader] {} not found", loc); return; }
            try (InputStream is = res.get().open()) {
                JsonObject root  = JsonParser.parseReader(new InputStreamReader(is, StandardCharsets.UTF_8)).getAsJsonObject();
                JsonObject anims = root.getAsJsonObject("animations");
                for (Map.Entry<String, JsonElement> animEntry : anims.entrySet()) {
                    String animName  = animEntry.getKey();
                    JsonObject animObj = animEntry.getValue().getAsJsonObject();
                    float length = animObj.has("animation_length") ? animObj.get("animation_length").getAsFloat() : 1f;
                    Map<String, BonePose> bones = new HashMap<>();
                    if (animObj.has("bones")) {
                        for (Map.Entry<String, JsonElement> boneEntry : animObj.getAsJsonObject("bones").entrySet()) {
                            JsonObject boneObj = boneEntry.getValue().getAsJsonObject();
                            BoneChannel rot = boneObj.has("rotation") ? parseChannel(boneObj.getAsJsonObject("rotation")) : EMPTY_CHANNEL;
                            BoneChannel pos = boneObj.has("position") ? parseChannel(boneObj.getAsJsonObject("position")) : EMPTY_CHANNEL;
                            bones.put(boneEntry.getKey(), new BonePose(rot, pos));
                        }
                    }
                    cache.put(animName, new AnimData(length, bones));
                }
                yebisuRPG.LOGGER.info("[HandAnimationLoader] Loaded {} animation(s)", cache.size());
            }
        } catch (Exception e) {
            yebisuRPG.LOGGER.error("[HandAnimationLoader] Failed to load {}: {}", loc, e.getMessage());
        }
    }

    private static BoneChannel parseChannel(JsonObject obj) {
        // Constant form: { "vector": [x,y,z] }
        if (obj.has("vector")) {
            JsonArray v = obj.getAsJsonArray("vector");
            return new BoneChannel(new Keyframe[]{ new Keyframe(0f,
                v.get(0).getAsFloat(), v.get(1).getAsFloat(), v.get(2).getAsFloat(),
                Easing.LINEAR, 0f, null) });
        }

        // Keyframe form — collect numeric-keyed entries only
        List<Map.Entry<String, JsonElement>> entries = new ArrayList<>(obj.entrySet());
        entries.removeIf(e -> { try { Double.parseDouble(e.getKey()); return false; } catch (NumberFormatException ex) { return true; } });
        entries.sort(Comparator.comparingDouble(e -> Double.parseDouble(e.getKey())));

        Keyframe[] keys = new Keyframe[entries.size()];
        for (int i = 0; i < entries.size(); i++) {
            float time = Float.parseFloat(entries.get(i).getKey());
            JsonElement val = entries.get(i).getValue();
            float x, y, z;
            Easing easing = Easing.LINEAR;
            float easingArg = 0f;
            float[] easingArgs = null;

            if (val.isJsonObject()) {
                JsonObject kf = val.getAsJsonObject();
                // Support both "lerp_mode" (Bedrock) and "easing" (AzureLib)
                String easingStr = kf.has("easing")     ? kf.get("easing").getAsString()
                                 : kf.has("lerp_mode")  ? kf.get("lerp_mode").getAsString()
                                 : null;
                easing = Easing.from(easingStr);

                if (kf.has("easingArgs")) {
                    JsonArray arr = kf.getAsJsonArray("easingArgs");
                    easingArgs = new float[arr.size()];
                    for (int j = 0; j < arr.size(); j++) easingArgs[j] = arr.get(j).getAsFloat();
                    if (easingArgs.length > 0) easingArg = easingArgs[0];
                }

                JsonArray vec = kf.has("vector") ? kf.getAsJsonArray("vector") : null;
                if (vec != null) {
                    x = vec.get(0).getAsFloat(); y = vec.get(1).getAsFloat(); z = vec.get(2).getAsFloat();
                } else { x = y = z = 0f; }
            } else if (val.isJsonArray()) {
                JsonArray vec = val.getAsJsonArray();
                x = vec.get(0).getAsFloat(); y = vec.get(1).getAsFloat(); z = vec.get(2).getAsFloat();
            } else { x = y = z = 0f; }

            keys[i] = new Keyframe(time, x, y, z, easing, easingArg, easingArgs);
        }
        return new BoneChannel(keys);
    }
}
