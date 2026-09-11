package net.ye6isu.yebisuRPG.vfx.client;

import net.minecraft.resources.ResourceLocation;

import java.util.List;

public record VfxDefinition(String id, int durationTicks, List<Plane> planes) {

    public record Plane(
            String id,
            ResourceLocation texture,
            double x,
            double y,
            double z,
            double pivotX,
            double pivotY,
            double pivotZ,
            float rotationX,
            float rotationY,
            float rotationZ,
            float scaleX,
            float scaleY,
            float scaleZ,
            float width,
            float height,
            boolean billboard,
            boolean fullBright,
            int color,
            int rows,
            int ticksPerFrame,
            boolean textureLoop,
            int startTick,
            int endTick,
            boolean separatePositionDimensions,
            List<PositionKeyframe> positionKeyframes,
            List<ScalarKeyframe> positionXKeyframes,
            List<ScalarKeyframe> positionYKeyframes,
            List<ScalarKeyframe> positionZKeyframes,
            boolean separateRotationDimensions,
            List<VectorKeyframe> rotationKeyframes,
            List<ScalarKeyframe> rotationXKeyframes,
            List<ScalarKeyframe> rotationYKeyframes,
            List<ScalarKeyframe> rotationZKeyframes,
            boolean separateScaleDimensions,
            List<VectorKeyframe> scaleKeyframes,
            List<ScalarKeyframe> scaleXKeyframes,
            List<ScalarKeyframe> scaleYKeyframes,
            List<ScalarKeyframe> scaleZKeyframes,
            List<OpacityKeyframe> opacityKeyframes
    ) {
        public Position positionAt(double tick) {
            if (separatePositionDimensions) {
                return new Position(
                        scalarAt(positionXKeyframes, x, tick),
                        scalarAt(positionYKeyframes, y, tick),
                        scalarAt(positionZKeyframes, z, tick));
            }
            return vectorAt(positionKeyframes, new Position(x, y, z), tick);
        }

        public Position rotationAt(double tick) {
            if (separateRotationDimensions) {
                return new Position(
                        scalarAt(rotationXKeyframes, rotationX, tick),
                        scalarAt(rotationYKeyframes, rotationY, tick),
                        scalarAt(rotationZKeyframes, rotationZ, tick));
            }
            return vectorAt(rotationKeyframes, new Position(rotationX, rotationY, rotationZ), tick);
        }

        public Position scaleAt(double tick) {
            if (separateScaleDimensions) {
                return new Position(
                        scalarAt(scaleXKeyframes, scaleX, tick),
                        scalarAt(scaleYKeyframes, scaleY, tick),
                        scalarAt(scaleZKeyframes, scaleZ, tick));
            }
            return vectorAt(scaleKeyframes, new Position(scaleX, scaleY, scaleZ), tick);
        }

        public float opacityAt(double tick) {
            if (opacityKeyframes.isEmpty()) return (float)(color >>> 24 & 255) / 255.0f;

            OpacityKeyframe first = opacityKeyframes.getFirst();
            if (tick <= first.tick()) return first.value();
            OpacityKeyframe last = opacityKeyframes.getLast();
            if (tick >= last.tick()) return last.value();

            for (int index = 1; index < opacityKeyframes.size(); index++) {
                OpacityKeyframe next = opacityKeyframes.get(index);
                if (tick > next.tick()) continue;
                OpacityKeyframe previous = opacityKeyframes.get(index - 1);
                double progress = easedProgress(
                        (tick - previous.tick()) / (next.tick() - previous.tick()),
                        previous.easing());
                return (float)lerp(previous.value(), next.value(), progress);
            }
            return last.value();
        }

        private static <T extends VectorFrame> Position vectorAt(List<T> keyframes, Position fallback, double tick) {
            if (keyframes.isEmpty()) return fallback;
            T first = keyframes.getFirst();
            if (tick <= first.tick()) return first.position();
            T last = keyframes.getLast();
            if (tick >= last.tick()) return last.position();
            for (int index = 1; index < keyframes.size(); index++) {
                T next = keyframes.get(index);
                if (tick > next.tick()) continue;
                T previous = keyframes.get(index - 1);
                double progress = easedProgress(
                        (tick - previous.tick()) / (next.tick() - previous.tick()),
                        previous.easing());
                return new Position(
                        lerp(previous.x(), next.x(), progress),
                        lerp(previous.y(), next.y(), progress),
                        lerp(previous.z(), next.z(), progress));
            }
            return last.position();
        }

        private static double scalarAt(List<ScalarKeyframe> keyframes, double fallback, double tick) {
            if (keyframes.isEmpty()) return fallback;
            ScalarKeyframe first = keyframes.getFirst();
            if (tick <= first.tick()) return first.value();
            ScalarKeyframe last = keyframes.getLast();
            if (tick >= last.tick()) return last.value();
            for (int index = 1; index < keyframes.size(); index++) {
                ScalarKeyframe next = keyframes.get(index);
                if (tick > next.tick()) continue;
                ScalarKeyframe previous = keyframes.get(index - 1);
                double progress = easedProgress(
                        (tick - previous.tick()) / (next.tick() - previous.tick()),
                        previous.easing());
                return lerp(previous.value(), next.value(), progress);
            }
            return last.value();
        }

        private static double easedProgress(double progress, Easing easing) {
            if ("step".equals(easing.type())) {
                double steps = Math.max(2.0, Math.rint(easing.amount()));
                return progress < 1.0 ? Math.floor(progress * steps) / steps : 1.0;
            }
            if ("sine".equals(easing.type())) {
                if ("in".equals(easing.mode())) return 1.0 - Math.cos(progress * Math.PI / 2.0);
                if ("out".equals(easing.mode())) return Math.sin(progress * Math.PI / 2.0);
                return -(Math.cos(Math.PI * progress) - 1.0) / 2.0;
            }
            if ("quad".equals(easing.type())) return powerProgress(progress, easing.mode(), 2);
            if ("cubicPower".equals(easing.type())) return powerProgress(progress, easing.mode(), 3);
            if ("quart".equals(easing.type())) return powerProgress(progress, easing.mode(), 4);
            if ("quint".equals(easing.type())) return powerProgress(progress, easing.mode(), 5);
            if ("expo".equals(easing.type())) {
                if (progress == 0.0 || progress == 1.0) return progress;
                if ("in".equals(easing.mode())) return Math.pow(2.0, 10.0 * progress - 10.0);
                if ("out".equals(easing.mode())) return 1.0 - Math.pow(2.0, -10.0 * progress);
                return progress < 0.5
                        ? Math.pow(2.0, 20.0 * progress - 10.0) / 2.0
                        : (2.0 - Math.pow(2.0, -20.0 * progress + 10.0)) / 2.0;
            }
            if ("circ".equals(easing.type())) {
                if ("in".equals(easing.mode())) {
                    return 1.0 - Math.sqrt(Math.max(0.0, 1.0 - progress * progress));
                }
                if ("out".equals(easing.mode())) {
                    return Math.sqrt(Math.max(0.0, 1.0 - Math.pow(progress - 1.0, 2.0)));
                }
                return progress < 0.5
                        ? (1.0 - Math.sqrt(Math.max(0.0, 1.0 - Math.pow(2.0 * progress, 2.0)))) / 2.0
                        : (Math.sqrt(Math.max(0.0, 1.0 - Math.pow(-2.0 * progress + 2.0, 2.0))) + 1.0) / 2.0;
            }
            if ("back".equals(easing.type())) {
                return backProgress(progress, easing.mode(), easing.amount());
            }
            if ("bounce".equals(easing.type())) {
                double bounce = bounceProgress(progress, easing.mode());
                return progress + (bounce - progress) * easing.amount();
            }
            if ("elastic".equals(easing.type())) {
                return elasticProgress(progress, easing.mode(), easing.amount());
            }
            double low = 0.0;
            double high = 1.0;
            for (int index = 0; index < 16; index++) {
                double amount = (low + high) * 0.5;
                if (cubic(0.0, easing.x1(), easing.x2(), 1.0, amount) < progress) low = amount;
                else high = amount;
            }
            return cubic(0.0, easing.y1(), easing.y2(), 1.0, (low + high) * 0.5);
        }

        private static double powerProgress(double progress, String mode, int power) {
            if ("in".equals(mode)) return Math.pow(progress, power);
            if ("out".equals(mode)) return 1.0 - Math.pow(1.0 - progress, power);
            return progress < 0.5
                    ? Math.pow(2.0, power - 1.0) * Math.pow(progress, power)
                    : 1.0 - Math.pow(-2.0 * progress + 2.0, power) / 2.0;
        }

        private static double backProgress(double progress, String mode, double amount) {
            double overshoot = amount == 0.0 ? 1.70158 : amount;
            if ("in".equals(mode)) {
                return (overshoot + 1.0) * Math.pow(progress, 3.0) - overshoot * progress * progress;
            }
            if ("out".equals(mode)) {
                return 1.0 + (overshoot + 1.0) * Math.pow(progress - 1.0, 3.0)
                        + overshoot * Math.pow(progress - 1.0, 2.0);
            }
            double scaled = overshoot * 1.525;
            return progress < 0.5
                    ? Math.pow(2.0 * progress, 2.0)
                    * ((scaled + 1.0) * 2.0 * progress - scaled) / 2.0
                    : (Math.pow(2.0 * progress - 2.0, 2.0)
                    * ((scaled + 1.0) * (2.0 * progress - 2.0) + scaled) + 2.0) / 2.0;
        }

        private static double bounceOut(double progress) {
            double coefficient = 7.5625;
            double divisor = 2.75;
            if (progress < 1.0 / divisor) return coefficient * progress * progress;
            if (progress < 2.0 / divisor) {
                double shifted = progress - 1.5 / divisor;
                return coefficient * shifted * shifted + 0.75;
            }
            if (progress < 2.5 / divisor) {
                double shifted = progress - 2.25 / divisor;
                return coefficient * shifted * shifted + 0.9375;
            }
            double shifted = progress - 2.625 / divisor;
            return coefficient * shifted * shifted + 0.984375;
        }

        private static double bounceProgress(double progress, String mode) {
            if ("in".equals(mode)) return 1.0 - bounceOut(1.0 - progress);
            if ("inOut".equals(mode)) {
                return progress < 0.5
                        ? (1.0 - bounceOut(1.0 - 2.0 * progress)) / 2.0
                        : (1.0 + bounceOut(2.0 * progress - 1.0)) / 2.0;
            }
            return bounceOut(progress);
        }

        private static double elasticProgress(double progress, String mode, double amount) {
            if (progress == 0.0 || progress == 1.0) return progress;
            double multiplier = amount == 0.0 ? 1.0 : amount;
            if ("in".equals(mode)) {
                double period = 2.0 * Math.PI / 3.0;
                return -Math.pow(2.0, 10.0 * progress - 10.0)
                        * Math.sin((10.0 * progress - 10.75) * period * multiplier);
            }
            if ("inOut".equals(mode)) {
                double period = 2.0 * Math.PI / 4.5;
                return progress < 0.5
                        ? -(Math.pow(2.0, 20.0 * progress - 10.0)
                        * Math.sin((20.0 * progress - 11.125) * period * multiplier)) / 2.0
                        : (Math.pow(2.0, -20.0 * progress + 10.0)
                        * Math.sin((20.0 * progress - 11.125) * period * multiplier)) / 2.0 + 1.0;
            }
            double period = 2.0 * Math.PI / 3.0;
            return Math.pow(2.0, -10.0 * progress)
                    * Math.sin((10.0 * progress - 0.75) * period * multiplier) + 1.0;
        }

        private static double cubic(double start, double control1, double control2, double end, double amount) {
            double inverse = 1.0 - amount;
            return inverse * inverse * inverse * start
                    + 3.0 * inverse * inverse * amount * control1
                    + 3.0 * inverse * amount * amount * control2
                    + amount * amount * amount * end;
        }

        private static double lerp(double start, double end, double progress) {
            return start + (end - start) * progress;
        }
    }

    public interface VectorFrame {
        double tick();
        double x();
        double y();
        double z();
        Easing easing();
        default Position position() { return new Position(x(), y(), z()); }
    }

    public record PositionKeyframe(double tick, double x, double y, double z, Easing easing) implements VectorFrame {}
    public record VectorKeyframe(double tick, double x, double y, double z, Easing easing) implements VectorFrame {}
    public record ScalarKeyframe(double tick, double value, Easing easing) {}
    public record OpacityKeyframe(double tick, float value, Easing easing) {}
    public record Easing(String type, String mode, double amount, double x1, double y1, double x2, double y2) {
        public static final Easing LINEAR = new Easing(
                "cubic", "inOut", 1.0,
                1.0 / 3.0, 1.0 / 3.0, 2.0 / 3.0, 2.0 / 3.0);
    }

    public record Position(double x, double y, double z) {}
}
