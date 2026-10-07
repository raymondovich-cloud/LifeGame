// finance.js — Version 6.3

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
    createAsset,
    updateAsset,
    removeAsset
} from "../../domain/finance/assets/assets.js";

import { calculateFinancialStabilityIndex } from "../../index/finance/finance.index.js";
import { buildFinancialStabilityDiagnosis } from "./finance.diagnosis.js";
import { trace } from "../../core/diagnostics/lifecycle.trace.js";
import { calculateCreditProduct } from "../../domain/finance/credit.product/credit.product.js";

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
    const entries = getMemoryMethod(config, "list")();
    if (entries.length > 0) return entries;
    const snapshot = financeMemory.getLatestCollectionSnapshot(subblockId);
    return Array.isArray(snapshot?.entries) ? snapshot.entries : [];
}

async function addFinanceEntry(subblockId, label, amount, liquidity, options = null) {
    if (subblockId === "assets") {
        const memory = financeMemory;
        const result = createAsset({
            label,
            amount,
            liquidity,
            ...(options || {})
        });
        const mutation = await memory.mutateAsset({
            operation: "create",
            entry: result.entry,
            occurredAt: result.event.occurredAt
        });

        return mutation ? mutation.entry : false;
    }

    const config = getCollectionConfig(subblockId);
    const result = subblockId === "financial-burden"
        ? config.create(label, amount, options?.payment ?? null, options?.isCreditProduct ?? false, options?.interestRate ?? null)
        : config.create(label, amount);

    const mutation = await financeMemory.mutateFinanceCollection({
        collection: subblockId,
        operation: "create",
        entry: result.entry,
        occurredAt: result.event?.occurredAt || Date.now()
    });

    return mutation ? mutation.entry : false;
}

async function addFinancialBurdenEntry(label, debt, payment, isCreditProduct = false, interestRate = null) {
    return addFinanceEntry("financial-burden", label, debt, null, {
        payment,
        isCreditProduct,
        interestRate
    });
}

async function updateFinanceEntry(
    subblockId,
    entryId,
    label,
    amount,
    liquidity,
    payment = null,
    isCreditProduct = false,
    interestRate = null,
    assetOptions = null
) {
    if (subblockId === "assets") {
        const memory = financeMemory;
        const existingAsset = memory
            .listAssets()
            .find((entry) => entry.id === entryId);

        const result = updateAsset(existingAsset, {
            label,
            amount,
            liquidity,
            ...(assetOptions || {})
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
        ? config.updateDomain(existingEntry, label, amount, payment, isCreditProduct, interestRate)
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

function calculateCreditProductAnalytics(entry) {
    if (!entry?.isCreditProduct) return null;

    return calculateCreditProduct(
        entry.debt,
        entry.payment,
        entry.interestRate
    );
}

function getFinancialStabilityIndex() {
    const financialBurden = financeMemory.listFinancialBurden();
    const assetEntries = financeMemory.listAssets();
    const actualEarnings = financeMemory.listActualEarnings();
    const mandatoryExpenses = financeMemory.listMandatoryExpenses();

    function collectionSnapshot(collection, timestamp) {
        return financeMemory.getCollectionSnapshotAtOrBefore(collection, timestamp);
    }

    function entriesFromSnapshot(snapshot) {
        return Array.isArray(snapshot?.entries) ? snapshot.entries : [];
    }

    function historyUntil(collection, timestamp, resolver) {
        const first = financeMemory.getFirstCollectionSnapshot(collection);
        if (!first || first.occurredAt > timestamp) return [];

        return financeMemory
            .getCollectionSnapshotsBetween(collection, first.occurredAt, timestamp)
            .map(resolver);
    }

    function buildStateAt(timestamp, useLiveState = false) {
        const assetsSnapshot = collectionSnapshot("assets", timestamp);
        const earningsSnapshot = collectionSnapshot("actual-earnings", timestamp);
        const burdenSnapshot = collectionSnapshot("financial-burden", timestamp);
        const expensesSnapshot = collectionSnapshot("mandatory-expenses", timestamp);

        const assets = useLiveState
            ? assetEntries
            : entriesFromSnapshot(assetsSnapshot);
        const actualEarnings = useLiveState
            ? financeMemory.listActualEarnings()
            : entriesFromSnapshot(earningsSnapshot);
        const financialBurden = useLiveState
            ? financeMemory.listFinancialBurden()
            : entriesFromSnapshot(burdenSnapshot);
        const mandatoryExpenses = useLiveState
            ? financeMemory.listMandatoryExpenses()
            : entriesFromSnapshot(expensesSnapshot);

        const liquidAssets = assets.filter((entry) => entry?.liquidity !== "illiquid");
        const illiquidAssets = assets.filter((entry) => entry?.liquidity === "illiquid");
        const reserveTotal = assets
            .filter((entry) => entry?.isReserve)
            .reduce((total, entry) => total + Number(entry?.amount || 0), 0);

        const history = {
            incomeHistory: historyUntil(
                "actual-earnings",
                timestamp,
                (snapshot) => Number(snapshot.total) || 0
            ),
            debtHistory: historyUntil(
                "financial-burden",
                timestamp,
                (snapshot) => Array.isArray(snapshot.entries)
                    ? snapshot.entries.reduce((total, entry) => total + Number(entry?.debt || 0), 0)
                    : Number(snapshot.total) || 0
            ),
            liquidityHistory: historyUntil(
                "assets",
                timestamp,
                (snapshot) => entriesFromSnapshot(snapshot).reduce(
                    (total, entry) => entry?.liquidity === "illiquid"
                        ? total
                        : total + Number(entry?.amount || 0),
                    0
                )
            ),
            reserveHistory: historyUntil(
                "assets",
                timestamp,
                (snapshot) => entriesFromSnapshot(snapshot).reduce(
                    (total, entry) => entry?.isReserve
                        ? total + Number(entry?.amount || 0)
                        : total,
                    0
                )
            )
        };

        return {
            assets,
            liquidAssets,
            illiquidAssets,
            actualEarnings,
            financialBurden,
            mandatoryExpenses,
            financialCushion: reserveTotal,
            ...history
        };
    }

    const now = Date.now();
    const currentState = buildStateAt(now, true);
    const currentResult = calculateFinancialStabilityIndex(currentState);

    const comparisonDate = new Date(now);
    comparisonDate.setMonth(comparisonDate.getMonth() - 1);
    const comparisonTimestamp = comparisonDate.getTime();

    const historicalCollections = [
        "assets",
        "actual-earnings",
        "financial-burden",
        "mandatory-expenses"
    ];

    const hasHistoricalBaseline = historicalCollections.some(
        (collection) => Boolean(collectionSnapshot(collection, comparisonTimestamp))
    );

    let previousResult = null;

    if (hasHistoricalBaseline) {
        const previousState = buildStateAt(comparisonTimestamp, false);
        const hasAnyPreviousData =
            previousState.assets.length > 0 ||
            previousState.actualEarnings.length > 0 ||
            previousState.financialBurden.length > 0 ||
            previousState.mandatoryExpenses.length > 0;

        if (hasAnyPreviousData) {
            previousResult = calculateFinancialStabilityIndex(previousState);
        }
    }

    return {
        ...currentResult,
        previousResult,
        diagnosis: buildFinancialStabilityDiagnosis(currentResult, previousResult)
    };
}


    return Object.freeze({
        listFinanceEntries,
        addFinanceEntry,
        addFinancialBurdenEntry,
        removeFinanceEntry,
        updateFinanceEntry,
        getFinancialStabilityIndex,
        calculateCreditProductAnalytics,
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
