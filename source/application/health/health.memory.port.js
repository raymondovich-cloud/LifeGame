// source/application/health/health.memory.port.js — Version 1.0

const REQUIRED_METHODS = Object.freeze([
    "listFacts",
    "saveFact",
    "replaceFacts",
    "getFactsBetween",
    "getLatestFact",
    "getLatestFacts"
]);

function createHealthMemoryPort(implementation) {
    if (!implementation) throw new Error("LifeGame Health Memory Port: implementation is required.");

    for (const method of REQUIRED_METHODS) {
        if (typeof implementation[method] !== "function") {
            throw new Error("LifeGame Health Memory Port: method is required: " + method);
        }
    }

    const port = {};
    for (const method of REQUIRED_METHODS) port[method] = implementation[method];
    return Object.freeze(port);
}

export { REQUIRED_METHODS, createHealthMemoryPort };
