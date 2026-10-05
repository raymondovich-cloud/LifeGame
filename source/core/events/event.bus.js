// event.bus.js — Version 1.1

import { trace } from "../diagnostics/lifecycle.trace.js";

const listeners = new Map();

function subscribe(eventType, listener) {
    if (!eventType || typeof listener !== "function") {
        throw new Error("LifeGame Event Bus: invalid subscription.");
    }

    const current = listeners.get(eventType) ?? new Set();
    current.add(listener);
    listeners.set(eventType, current);

    return () => {
        current.delete(listener);

        if (current.size === 0) {
            listeners.delete(eventType);
        }
    };
}

function publish(event) {
    if (!event || !event.type) {
        throw new Error("LifeGame Event Bus: invalid event.");
    }

    trace("event-bus", "publish.begin", { eventType: event.type });

    const current = listeners.get(event.type);
    if (!current) {
        trace("event-bus", "publish.no_listeners", { eventType: event.type });
        return;
    }

    trace("event-bus", "publish.dispatch", {
        eventType: event.type,
        listenerCount: current.size
    });

    [...current].forEach((listener) => listener(event));

    trace("event-bus", "publish.completed", { eventType: event.type });
}

export { subscribe, publish };
