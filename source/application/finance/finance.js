// finance.js — Version 1.3

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
        const day = date.getDay() || 7;
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - day + 1);
        return date.getTime();
    }

    if (period === "month") {
        date.setHours(0, 0, 0, 0);
        date.setDate(1);
        return date.getTime();
    }

    if (period === "year") {
        date.setHours(0, 0, 0, 0);
        date.setMonth(0, 1);
        return date.getTime();
    }

    throw new Error("LifeGame Finance: неизвестный период.");
}

function getLiquidFundsStatistics(period = "week") {
    const now = Date.now();
    const periodStart = getPeriodStart(period, now);
    const snapshot = liquidFundsSnapshotReader(now);

    if (!snapshot) {
        return {
            period,
            periodStart,
            occurredAt: null,
            total: 0,
            entries: []
        };
    }

    return {
        period,
        periodStart,
        occurredAt: snapshot.occurredAt,
        total: snapshot.total,
        entries: snapshot.entries.map((entry) => ({ ...entry }))
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
