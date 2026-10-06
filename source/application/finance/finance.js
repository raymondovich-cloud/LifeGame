// finance.js — Version 5.4

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
    removeAsset
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

function validateFinanceMemory(memory) {
    if (!memory) {
        throw new Error("LifeGame Finance: Finance memory is required.");
    }

    const requiredMethods = [
        "listAssets", "saveAsset", "updateAsset", "deleteAsset", "mutateAsset",
        "listActualEarnings", "saveActualEarning", "updateActualEarning", "deleteActualEarning",
        "listFinancialBurden", "saveFinancialBurden", "updateFinancialBurden", "deleteFinancialBurden",
        "listMandatoryExpenses", "saveMandatoryExpense", "updateMandatoryExpense", "deleteMandatoryExpense",
        "listFinancialCushion", "saveFinancialCushion", "updateFinancialCushion", "deleteFinancialCushion",
        "getAssetsSnapshotAtOrBefore",
        "getAssetsSnapshotsBetween",
        "getFirstAssetsSnapshot",
        "getLatestAssetsSnapshot",
        "mutateFinanceCollection",
        "getCollectionSnapshotAtOrBefore",
        "getCollectionSnapshotsBetween",
        "getFirstCollectionSnapshot",
        "getLatestCollectionSnapshot"
    ];

    for (const method of requiredMethods) {
        if (typeof memory[method] !== "function") {
            throw new Error(
                "LifeGame Finance: Finance memory method is required: " + method
            );
        }
    }

    return memory;
}

function createFinanceApplication({ memory }) {
    const financeMemory = validateFinanceMemory(memory);

    function getCollectionConfig(subblockId) {
        const config = COLLECTION_CONFIG[subblockId];

        if (!config) {
            throw new Error("LifeGame Finance: неизвестный подблок.");
        }

        return config;
    }

    function getMemoryMethod(config, operation) {
        return financeMemory[config[operation]].bind(financeMemory);
    }

function listFinanceEntries(subblockId) {
    if (subblockId === "assets") {
        return financeMemory.listAssets();
    }

    const config = getCollectionConfig(subblockId);
    return getMemoryMethod(config, "list")();
}

async function addFinanceEntry(subblockId, label, amount, liquidity) {
    if (subblockId === "assets") {
        const memory = financeMemory;
        const result = createAsset({ label, amount, liquidity });
        const mutation = await memory.mutateAsset({
            operation: "create",
            entry: result.entry,
            occurredAt: result.event.occurredAt
        });

        return mutation ? mutation.entry : false;
    }

    const config = getCollectionConfig(subblockId);
    const result = subblockId === "financial-burden"
        ? config.create(label, amount, liquidity)
        : config.create(label, amount);

    const mutation = await financeMemory.mutateFinanceCollection({
        collection: subblockId,
        operation: "create",
        entry: result.entry,
        occurredAt: result.event?.occurredAt || Date.now()
    });

    return mutation ? mutation.entry : false;
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
        const memory = financeMemory;
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

        const mutation = await memory.mutateAsset({
            operation: "update",
            entryId,
            entry: result.entry,
            occurredAt: result.event.occurredAt
        });

        return mutation ? mutation.entry : false;
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

    const mutation = await financeMemory.mutateFinanceCollection({
        collection: subblockId,
        operation: "update",
        entryId,
        entry: result.entry,
        occurredAt: result.event?.occurredAt || Date.now()
    });
    const savedEntry = mutation ? mutation.entry : false;

    trace("application", "finance.update.completed", {
        subblockId,
        entryId,
        result: Boolean(savedEntry)
    });

    return savedEntry;
}

async function removeFinanceEntry(subblockId, entryId) {
    if (subblockId === "assets") {
        const memory = financeMemory;
        const existingAsset = memory
            .listAssets()
            .find((entry) => entry.id === entryId);

        const result = removeAsset(existingAsset);

        if (!result) {
            return false;
        }

        const mutation = await memory.mutateAsset({
            operation: "delete",
            entryId,
            occurredAt: result.event.occurredAt
        });

        return Boolean(mutation);
    }

    const config = getCollectionConfig(subblockId);
    const existingEntry = getMemoryMethod(config, "list")()
        .find((entry) => entry.id === entryId);

    const result = config.removeDomain(existingEntry);

    if (!result) {
        return false;
    }

    const mutation = await financeMemory.mutateFinanceCollection({
        collection: subblockId,
        operation: "delete",
        entryId,
        occurredAt: result.event?.occurredAt || Date.now()
    });
    const deleted = Boolean(mutation);

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


    return Object.freeze({
        listFinanceEntries,
        addFinanceEntry,
        addFinancialBurdenEntry,
        removeFinanceEntry,
        updateFinanceEntry,
        getFinancialStabilityIndex,
        getAssetsSnapshotAtOrBefore: financeMemory.getAssetsSnapshotAtOrBefore.bind(financeMemory),
        getAssetsSnapshotsBetween: financeMemory.getAssetsSnapshotsBetween.bind(financeMemory),
        getFirstAssetsSnapshot: financeMemory.getFirstAssetsSnapshot.bind(financeMemory),
        getLatestAssetsSnapshot: financeMemory.getLatestAssetsSnapshot.bind(financeMemory),
        getCollectionSnapshotAtOrBefore: financeMemory.getCollectionSnapshotAtOrBefore.bind(financeMemory),
        getCollectionSnapshotsBetween: financeMemory.getCollectionSnapshotsBetween.bind(financeMemory),
        getFirstCollectionSnapshot: financeMemory.getFirstCollectionSnapshot.bind(financeMemory),
        getLatestCollectionSnapshot: financeMemory.getLatestCollectionSnapshot.bind(financeMemory)
    });
}

export { createFinanceApplication };
