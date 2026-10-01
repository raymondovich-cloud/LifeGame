// finance.js — Version 1.0

import {
    listLiquidFunds,
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

function removeFinanceEntry(subblockId, entryId) {
    return getFinanceOperations(subblockId).remove(entryId);
}

export {
    listFinanceEntries,
    addFinanceEntry,
    removeFinanceEntry
};
