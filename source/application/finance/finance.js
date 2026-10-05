// finance.js — Version 2.0

import {
    listAssets,
    calculateAssetsTotal,
    addAsset,
    removeAsset
} from "../../domain/finance/assets/assets.js";

import {
    listActualEarnings,
    addActualEarning,
    removeActualEarning
} from "../../domain/finance/actual.earnings/actual.earnings.js";

import {
    listFinancialBurden,
    addFinancialBurden,
    removeFinancialBurden
} from "../../domain/finance/financial.burden/financial.burden.js";

import {
    listMandatoryExpenses,
    addMandatoryExpense,
    removeMandatoryExpense
} from "../../domain/finance/mandatory.expenses/mandatory.expenses.js";

import {
    listFinancialCushion,
    addFinancialCushion,
    removeFinancialCushion
} from "../../domain/finance/financial.cushion/financial.cushion.js";

import { calculateFinancialStabilityIndex } from "../../index/finance/finance.index.js";

const FINANCE_OPERATIONS = Object.freeze({
    "assets": {
        list: listAssets,
        add: addAsset,
        remove: removeAsset
    },
    "actual-earnings": {
        list: listActualEarnings,
        add: addActualEarning,
        remove: removeActualEarning
    },
    "financial-burden": {
        list: listFinancialBurden,
        add: addFinancialBurden,
        remove: removeFinancialBurden
    },
    "mandatory-expenses": {
        list: listMandatoryExpenses,
        add: addMandatoryExpense,
        remove: removeMandatoryExpense
    },
    "financial-cushion": {
        list: listFinancialCushion,
        add: addFinancialCushion,
        remove: removeFinancialCushion
    }
});

let assetsSnapshotReader = () => null;

function configureAssetsMemory({ getSnapshotAtOrBefore }) {
    if (typeof getSnapshotAtOrBefore !== "function") {
        throw new Error("LifeGame Finance: Assets memory reader is required.");
    }

    assetsSnapshotReader = getSnapshotAtOrBefore;
}

function getFinanceOperations(subblockId) {
    const operations = FINANCE_OPERATIONS[subblockId];

    if (!operations) {
        throw new Error("LifeGame Finance: неизвестный подблок.");
    }

    return operations;
}

function listFinanceEntries(subblockId) {
    return getFinanceOperations(subblockId).list();
}

function addFinanceEntry(subblockId, label, amount) {
    return getFinanceOperations(subblockId).add(label, amount);
}

function addFinancialBurdenEntry(label, debt, payment) {
    return addFinancialBurden(label, debt, payment);
}

function removeFinanceEntry(subblockId, entryId) {
    return getFinanceOperations(subblockId).remove(entryId);
}

function getFinancialStabilityIndex() {
    const financialBurden = listFinancialBurden();

    return calculateFinancialStabilityIndex({
        liquidFunds: listAssets(),
        actualEarnings: listActualEarnings(),
        financialBurden,
        mandatoryExpenses: listMandatoryExpenses(),
        financialCushion: listFinancialCushion()
    });
}

function getAssetsTotal() {
    return calculateAssetsTotal();
}

function getPeriodStart(period, now) {
    const date = new Date(now);

    if (period === "week") {
        date.setDate(date.getDate() - 7);
        return date.getTime();
    }

    if (period === "month") {
        date.setMonth(date.getMonth() - 1);
        return date.getTime();
    }

    if (period === "year") {
        date.setFullYear(date.getFullYear() - 1);
        return date.getTime();
    }

    throw new Error("LifeGame Finance: неизвестный период.");
}

function getAssetsStatistics(period = "week") {
    const now = Date.now();
    const periodStart = getPeriodStart(period, now);
    const currentSnapshot = assetsSnapshotReader(now);
    const baselineSnapshot = assetsSnapshotReader(periodStart);

    const currentTotal = calculateAssetsTotal();
    const currentEntries = listAssets();

    const currentOccurredAt = currentSnapshot?.occurredAt || now;
    const baselineTotal = baselineSnapshot?.total ?? null;

    const hasComparison =
        baselineTotal !== null &&
        baselineTotal > 0 &&
        Number.isFinite(currentTotal);

    const changeAmount = hasComparison
        ? currentTotal - baselineTotal
        : null;

    const changePercent = hasComparison
        ? Math.round(((changeAmount / baselineTotal) * 100) * 10) / 10
        : null;

    return {
        period,
        periodStart,
        currentOccurredAt,
        currentTotal,
        currentEntries: currentEntries.map((entry) => ({ ...entry })),
        baselineOccurredAt: baselineSnapshot?.occurredAt || null,
        baselineTotal,
        changeAmount,
        changePercent,
        hasComparison
    };
}

export {
    configureAssetsMemory,
    listFinanceEntries,
    addFinanceEntry,
    addFinancialBurdenEntry,
    removeFinanceEntry,
    getAssetsTotal,
    getAssetsStatistics,
    getFinancialStabilityIndex
};
