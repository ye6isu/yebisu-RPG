package net.ye6isu.yebisuRPG.util;

import java.util.ArrayList;
import java.util.List;

/**
 * Lightweight server-side tick scheduler for delayed actions.
 *
 * Call {@link #schedule(int, Runnable)} to queue a task that fires after N ticks.
 * Call {@link #tick()} once per server tick from the tick event handler.
 *
 * Performance: O(N) per tick where N = number of pending tasks. With typical
 * usage (ability delays, mob cooldowns) N stays under ~100, making this
 * negligible compared to entity ticking.
 */
public final class TickScheduler {

    public static final TickScheduler INSTANCE = new TickScheduler();

    private record Entry(int remaining, Runnable action) {}

    private final List<Entry> pending = new ArrayList<>();
    private final List<Entry> toAdd = new ArrayList<>();

    private TickScheduler() {}

    public void schedule(int delayTicks, Runnable action) {
        if (delayTicks <= 0) {
            action.run();
            return;
        }
        toAdd.add(new Entry(delayTicks, action));
    }

    public void tick() {
        if (!toAdd.isEmpty()) {
            pending.addAll(toAdd);
            toAdd.clear();
        }
        if (pending.isEmpty()) return;

        List<Runnable> fire = null;
        for (int i = pending.size() - 1; i >= 0; i--) {
            Entry e = pending.get(i);
            int left = e.remaining - 1;
            if (left <= 0) {
                pending.remove(i);
                if (fire == null) fire = new ArrayList<>();
                fire.add(e.action);
            } else {
                pending.set(i, new Entry(left, e.action));
            }
        }
        if (fire != null) {
            for (Runnable r : fire) {
                try {
                    r.run();
                } catch (Exception ex) {
                    net.ye6isu.yebisuRPG.yebisuRPG.LOGGER.error("[TickScheduler] Delayed task threw", ex);
                }
            }
        }
    }

    public void clear() {
        pending.clear();
        toAdd.clear();
    }
}
