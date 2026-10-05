// finance.js — Version 2.6

import {
    listAssets,
    calculateAssetsTotal,
    addAsset,
    removeAsset,
    updateAsset
} from "../../domain/finance/assets/assets.js";

import {
    listActualEarnings,
    addActualEarning,
    updateActualEarning,
    removeActualEarning
} from "../../domain/finance/actual.earnings/actual.earnings.js";

import {
    listFinancialBurden,
    addFinancialBurden,
    updateFinancialBurden,
    removeFinancialBurden
} from "../../domain/finance/financial.burden/financial.burden.js";

import {
    listMandatoryExpenses,
    addMandatoryExpense,
    updateMandatoryExpense,
    removeMandatoryExpense
} from "../../domain/finance/mandatory.expenses/mandatory.expenses.js";

import {
    listFinancialCushion,
    addFinancialCushion,
    updateFinancialCushion,
    removeFinancialCushion
} from "../../domain/finance/financial.cushion/financial.cushion.js";

import { calculateFinancialStabilityIndex } from "../../index/finance/finance.index.js";
import { trace } from "../../core/diagnostics/lifecycle.trace.js";

const FINANCE_OPERATIONS = Object.freeze({
    "assets": { list: listAssets, add: addAsset, remove: removeAsset, update: updateAsset },
    "actual-earnings": { list: listActualEarnings, add: addActualEarning, remove: removeActualEarning, update: updateActualEarning },
    "financial-burden": { list: listFinancialBurden, add: addFinancialBurden, remove: removeFinancialBurden, update: updateFinancialBurden },
    "mandatory-expenses": { list: listMandatoryExpenses, add: addMandatoryExpense, remove: removeMandatoryExpense, update: updateMandatoryExpense },
    "financial-cushion": { list: listFinancialCushion, add: addFinancialCushion, remove: removeFinancialCushion, update: updateFinancialCushion }
});

let assetsSnapshotReader = () => null;
let liquidAssetsReader = () => null;
let illiquidAssetsReader = () => null;

function configureAssetsMemory({
    getSnapshotAtOrBefore,
    getLiquidAssetsAtOrBefore,
    getIlliquidAssetsAtOrBefore
}) {
    if (
        typeof getSnapshotAtOrBefore !== "function" ||
        typeof getLiquidAssetsAtOrBefore !== "function" ||
        typeof getIlliquidAssetsAtOrBefore !== "function"
    ) {
        throw new Error("LifeGame Finance: Assets memory readers are required.");
    }

    assetsSnapshotReader = getSnapshotAtOrBefore;
    liquidAssetsReader = getLiquidAssetsAtOrBefore;
    illiquidAssetsReader = getIlliquidAssetsAtOrBefore;
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

function addFinanceEntry(subblockId, label, amount, liquidity) {
    return subblockId === "assets"
        ? getFinanceOperations(subblockId).add(label, amount, liquidity)
        : getFinanceOperations(subblockId).add(label, amount);
}

function addFinancialBurdenEntry(label, debt, payment) {
    return addFinancialBurden(label, debt, payment);
}

function updateFinanceEntry(subblockId, entryId, label, amount, liquidity, payment = null) {
    const operations = getFinanceOperations(subblockId);

    if (typeof operations.update !== "function") {
        throw new Error("LifeGame Finance: редактирование этого подблока не поддерживается.");
    }

    trace("application", "finance.update.begin", { subblockId, entryId });
    const result = subblockId === "financial-burden"
        ? operations.update(entryId, label, amount, payment)
        : operations.update(entryId, label, amount, liquidity);
    trace("application", "finance.update.completed", { subblockId, entryId, result: Boolean(result) });
    return result;
}

function removeFinanceEntry(subblockId, entryId) {
    trace("application", "finance.remove.begin", { subblockId, entryId });

    const result = getFinanceOperations(subblockId).remove(entryId);

    trace("application", "finance.remove.completed", {
        subblockId,
        entryId,
        result
    });

    return result;
}

function getFinancialStabilityIndex() {
    const now = Date.now();
    const financialBurden = listFinancialBurden();
    const assetsSnapshot = assetsSnapshotReader(now);
    const assetEntries = assetsSnapshot?.entries ?? listAssets();
    const liquidAssets = liquidAssetsReader(now) ??
        assetEntries.filter((entry) => entry?.liquidity !== "illiquid");
    const illiquidAssets = illiquidAssetsReader(now) ??
        assetEntries.filter((entry) => entry?.liquidity === "illiquid");

    return calculateFinancialStabilityIndex({
        assets: assetEntries,
        liquidAssets,
        illiquidAssets,
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

    const changeAmount = hasComparison ? currentTotal - baselineTotal : null;
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
    updateFinanceEntry,
    getAssetsTotal,
    getAssetsStatistics,
    getFinancialStabilityIndex
};
