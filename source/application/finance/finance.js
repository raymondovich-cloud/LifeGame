// finance.js — Version 1.4

import {
    listLiquidFunds,
    calculateLiquidFundsTotal,
    addLiquidFund,
    removeLiquidFund
} from "../../domain/finance/liquid.funds/liquid.funds.js";

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
    "liquid-funds": {
        list: listLiquidFunds,
        add: addLiquidFund,
        remove: removeLiquidFund
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

let liquidFundsSnapshotReader = () => null;

function configureLiquidFundsMemory({ getSnapshotAtOrBefore }) {
    if (typeof getSnapshotAtOrBefore !== "function") {
        throw new Error("LifeGame Finance: Liquid Funds memory reader is required.");
    }

    liquidFundsSnapshotReader = getSnapshotAtOrBefore;
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
        liquidFunds: listLiquidFunds(),
        actualEarnings: listActualEarnings(),
        financialBurden,
        mandatoryExpenses: listMandatoryExpenses(),
        financialCushion: listFinancialCushion()
    });
}

function getLiquidFundsTotal() {
    return calculateLiquidFundsTotal();
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

function getLiquidFundsStatistics(period = "week") {
    const now = Date.now();
    const periodStart = getPeriodStart(period, now);
    const currentSnapshot = liquidFundsSnapshotReader(now);
    const baselineSnapshot = liquidFundsSnapshotReader(periodStart);

    const currentTotal = calculateLiquidFundsTotal();
    const currentEntries = listLiquidFunds();

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
    configureLiquidFundsMemory,
    listFinanceEntries,
    addFinanceEntry,
    addFinancialBurdenEntry,
    removeFinanceEntry,
    getLiquidFundsTotal,
    getLiquidFundsStatistics,
    getFinancialStabilityIndex
};
