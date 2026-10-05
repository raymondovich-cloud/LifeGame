// source/core/diagnostics/lifecycle.trace.js — Version 1.1
//
// Responsibility: diagnostic tracing for lifecycle investigations.
// Diagnostic data is non-sensitive and excludes auth tokens, passwords,
// session payloads and personal financial values.

const STORAGE_KEY = "lifegame.lifecycle.trace";
const MAX_ENTRIES = 250;
let activeOperationId = null;

function isEnabled() {
    if (typeof globalThis === "undefined") return false;

    return (
        globalThis.__LIFEGAME_TRACE__ === true ||
        new URLSearchParams(globalThis.location?.search ?? "").get("trace") === "1"
    );
}

function readEntries() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        const entries = raw ? JSON.parse(raw) : [];
        return Array.isArray(entries) ? entries : [];
    } catch {
        return [];
    }
}

function writeEntries(entries) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
    } catch {
        // Diagnostics must never affect application behavior.
    }
}

function createOperationId() {
    return "op-" + Date.now().toString(36) + "-" +
        Math.random().toString(36).slice(2, 7);
}

function trace(stage, event, details = {}) {
    if (!isEnabled()) return;

    const entry = {
        timestamp: new Date().toISOString(),
        stage,
        event,
        operationId: details.operationId ?? activeOperationId,
        details: { ...details }
    };

    delete entry.details.operationId;

    const entries = readEntries();
    entries.push(entry);
    writeEntries(entries);
    console.debug("[LifeGame trace]", entry);
}

function beginOperation(name, details = {}) {
    const operationId = createOperationId();
    activeOperationId = operationId;

    trace("lifecycle", "operation.begin", {
        operationId,
        name,
        ...details
    });

    return operationId;
}

function endOperation(operationId, outcome = "completed") {
    trace("lifecycle", "operation.end", {
        operationId,
        outcome
    });

    if (activeOperationId === operationId) {
        activeOperationId = null;
    }
}

function getTrace() {
    return readEntries();
}

function clearTrace() {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // Diagnostics must never affect application behavior.
    }
}

function installGlobalApi() {
    if (!isEnabled()) return;

    window.LifeGameTrace = Object.freeze({
        get: getTrace,
        clear: clearTrace
    });
}

export {
    beginOperation,
    endOperation,
    trace,
    installGlobalApi
};
