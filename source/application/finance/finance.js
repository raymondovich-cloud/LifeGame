// finance.js — Version 3.0

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

export {
    configureAssetsMemory,
    listFinanceEntries,
    addFinanceEntry,
    addFinancialBurdenEntry,
    removeFinanceEntry,
    updateFinanceEntry,
    getAssetsTotal,
    getFinancialStabilityIndex
};
