// event.bus.js — Version 1.0

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

    const current = listeners.get(event.type);
    if (!current) return;

    [...current].forEach((listener) => listener(event));
}

export { subscribe, publish };
