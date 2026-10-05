// finance.js — Version 5.0

import {
    createActualEarning,
    updateActualEarning,
    removeActualEarning
} from "../../domain/finance/actual.earnings/actual.earnings.js";

import {
    createFinancialBurden,
    updateFinancialBurden,
    removeFinancialBurden
} from "../../domain/finance/financial.burden/financial.burden.js";

import {
    createMandatoryExpense,
    updateMandatoryExpense,
    removeMandatoryExpense
} from "../../domain/finance/mandatory.expenses/mandatory.expenses.js";

import {
    createFinancialCushion,
    updateFinancialCushion,
    removeFinancialCushion
} from "../../domain/finance/financial.cushion/financial.cushion.js";

import {
    createAsset,
    updateAsset,
    removeAsset,
    calculateAssetsTotal
} from "../../domain/finance/assets/assets.js";

import { calculateFinancialStabilityIndex } from "../../index/finance/finance.index.js";
import { trace } from "../../core/diagnostics/lifecycle.trace.js";

const COLLECTION_CONFIG = Object.freeze({
    "actual-earnings": {
        list: "listActualEarnings",
        save: "saveActualEarning",
        update: "updateActualEarning",
        remove: "deleteActualEarning",
        create: createActualEarning,
        updateDomain: updateActualEarning,
        removeDomain: removeActualEarning
    },
    "financial-burden": {
        list: "listFinancialBurden",
        save: "saveFinancialBurden",
        update: "updateFinancialBurden",
        remove: "deleteFinancialBurden",
        create: createFinancialBurden,
        updateDomain: updateFinancialBurden,
        removeDomain: removeFinancialBurden
    },
    "mandatory-expenses": {
        list: "listMandatoryExpenses",
        save: "saveMandatoryExpense",
        update: "updateMandatoryExpense",
        remove: "deleteMandatoryExpense",
        create: createMandatoryExpense,
        updateDomain: updateMandatoryExpense,
        removeDomain: removeMandatoryExpense
    },
    "financial-cushion": {
        list: "listFinancialCushion",
        save: "saveFinancialCushion",
        update: "updateFinancialCushion",
        remove: "deleteFinancialCushion",
        create: createFinancialCushion,
        updateDomain: updateFinancialCushion,
        removeDomain: removeFinancialCushion
    }
});

let financeMemory = null;

function configureAssetsMemory({ memory }) {
    if (!memory) {
        throw new Error("LifeGame Finance: Finance memory is required.");
    }

    const requiredMethods = [
        "listAssets",
        "saveAsset",
        "updateAsset",
        "deleteAsset",
        "saveAssetsSnapshot"
    ];

    for (const method of requiredMethods) {
        if (typeof memory[method] !== "function") {
            throw new Error(
                "LifeGame Finance: Finance memory method is required: " + method
            );
        }
    }

    financeMemory = memory;
}

function requireFinanceMemory() {
    if (!financeMemory) {
        throw new Error("LifeGame Finance: Finance memory is not configured.");
    }

    return financeMemory;
}

function getCollectionConfig(subblockId) {
    const config = COLLECTION_CONFIG[subblockId];

    if (!config) {
        throw new Error("LifeGame Finance: неизвестный подблок.");
    }

    return config;
}

function getMemoryMethod(config, operation) {
    const memory = requireFinanceMemory();
    return memory[config[operation]].bind(memory);
}

function listFinanceEntries(subblockId) {
    if (subblockId === "assets") {
        return financeMemory ? financeMemory.listAssets() : [];
    }

    if (!financeMemory) {
        return [];
    }

    const config = getCollectionConfig(subblockId);
    return getMemoryMethod(config, "list")();
}

async function addFinanceEntry(subblockId, label, amount, liquidity) {
    if (subblockId === "assets") {
        const memory = requireFinanceMemory();
        const result = createAsset({ label, amount, liquidity });
        const savedEntry = await memory.saveAsset(result.entry);

        await memory.saveAssetsSnapshot({
            occurredAt: result.event.occurredAt,
            total: calculateAssetsTotal(memory.listAssets()),
            entries: memory.listAssets()
        });

        return savedEntry;
    }

    const config = getCollectionConfig(subblockId);
    const result = subblockId === "financial-burden"
        ? config.create(label, amount, liquidity)
        : config.create(label, amount);

    return await getMemoryMethod(config, "save")(result.entry);
}

async function addFinancialBurdenEntry(label, debt, payment) {
    return addFinanceEntry("financial-burden", label, debt, payment);
}

async function updateFinanceEntry(
    subblockId,
    entryId,
    label,
    amount,
    liquidity,
    payment = null
) {
    if (subblockId === "assets") {
        const memory = requireFinanceMemory();
        const existingAsset = memory
            .listAssets()
            .find((entry) => entry.id === entryId);

        const result = updateAsset(existingAsset, {
            label,
            amount,
            liquidity
        });

        if (!result) {
            return false;
        }

        const savedEntry = await memory.updateAsset(entryId, result.entry);

        if (!savedEntry) {
            return false;
        }

        memory.saveAssetsSnapshot({
            occurredAt: result.event.occurredAt,
            total: calculateAssetsTotal(memory.listAssets()),
            entries: memory.listAssets()
        });

        return savedEntry;
    }

    const config = getCollectionConfig(subblockId);
    const existingEntry = getMemoryMethod(config, "list")()
        .find((entry) => entry.id === entryId);

    const result = subblockId === "financial-burden"
        ? config.updateDomain(existingEntry, label, amount, payment)
        : config.updateDomain(existingEntry, label, amount);

    if (!result) {
        return false;
    }

    const savedEntry = await getMemoryMethod(config, "update")(entryId, result.entry);

    trace("application", "finance.update.completed", {
        subblockId,
        entryId,
        result: Boolean(savedEntry)
    });

    return savedEntry;
}

async function removeFinanceEntry(subblockId, entryId) {
    if (subblockId === "assets") {
        const memory = requireFinanceMemory();
        const existingAsset = memory
            .listAssets()
            .find((entry) => entry.id === entryId);

        const result = removeAsset(existingAsset);

        if (!result) {
            return false;
        }

        const deleted = await memory.deleteAsset(entryId);

        if (!deleted) {
            return false;
        }

        memory.saveAssetsSnapshot({
            occurredAt: result.event.occurredAt,
            total: calculateAssetsTotal(memory.listAssets()),
            entries: memory.listAssets()
        });

        return true;
    }

    const config = getCollectionConfig(subblockId);
    const existingEntry = getMemoryMethod(config, "list")()
        .find((entry) => entry.id === entryId);

    const result = config.removeDomain(existingEntry);

    if (!result) {
        return false;
    }

    const deleted = await getMemoryMethod(config, "remove")(entryId);

    trace("application", "finance.remove.completed", {
        subblockId,
        entryId,
        result: Boolean(deleted)
    });

    return deleted;
}

function getFinancialStabilityIndex() {
    const memory = financeMemory;
    const financialBurden = memory
        ? memory.listFinancialBurden()
        : [];
    const assetEntries = memory
        ? memory.listAssets()
        : [];

    const liquidAssets = assetEntries.filter(
        (entry) => entry?.liquidity !== "illiquid"
    );

    const illiquidAssets = assetEntries.filter(
        (entry) => entry?.liquidity === "illiquid"
    );

    return calculateFinancialStabilityIndex({
        assets: assetEntries,
        liquidAssets,
        illiquidAssets,
        actualEarnings: memory
            ? memory.listActualEarnings()
            : [],
        financialBurden,
        mandatoryExpenses: memory
            ? memory.listMandatoryExpenses()
            : [],
        financialCushion: memory
            ? memory.listFinancialCushion()
            : []
    });
}

export {
    configureAssetsMemory,
    listFinanceEntries,
    addFinanceEntry,
    addFinancialBurdenEntry,
    removeFinanceEntry,
    updateFinanceEntry,
    getFinancialStabilityIndex
};
