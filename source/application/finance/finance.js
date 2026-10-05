// finance.js — Version 3.4

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

import {
    createAsset,
    updateAsset,
    removeAsset,
    calculateAssetsTotal
} from "../../domain/finance/assets/assets.js";

import { calculateFinancialStabilityIndex } from "../../index/finance/finance.index.js";
import { trace } from "../../core/diagnostics/lifecycle.trace.js";

const FINANCE_OPERATIONS = Object.freeze({
    "actual-earnings": {
        list: listActualEarnings,
        add: addActualEarning,
        remove: removeActualEarning,
        update: updateActualEarning
    },
    "financial-burden": {
        list: listFinancialBurden,
        add: addFinancialBurden,
        remove: removeFinancialBurden,
        update: updateFinancialBurden
    },
    "mandatory-expenses": {
        list: listMandatoryExpenses,
        add: addMandatoryExpense,
        remove: removeMandatoryExpense,
        update: updateMandatoryExpense
    },
    "financial-cushion": {
        list: listFinancialCushion,
        add: addFinancialCushion,
        remove: removeFinancialCushion,
        update: updateFinancialCushion
    }
});

let assetsMemory = null;

function configureAssetsMemory({ memory }) {
    if (!memory) {
        throw new Error("LifeGame Finance: Assets memory is required.");
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
                "LifeGame Finance: Assets memory method is required: " + method
            );
        }
    }

    assetsMemory = memory;
}

function requireAssetsMemory() {
    if (!assetsMemory) {
        throw new Error("LifeGame Finance: Assets memory is not configured.");
    }

    return assetsMemory;
}

function getFinanceOperations(subblockId) {
    const operations = FINANCE_OPERATIONS[subblockId];

    if (!operations) {
        throw new Error("LifeGame Finance: неизвестный подблок.");
    }

    return operations;
}

function listFinanceEntries(subblockId) {
    if (subblockId === "assets") {
        return assetsMemory ? assetsMemory.listAssets() : [];
    }

    return getFinanceOperations(subblockId).list();
}

function addFinanceEntry(subblockId, label, amount, liquidity) {
    if (subblockId === "assets") {
        const memory = requireAssetsMemory();
        const result = createAsset({ label, amount, liquidity });
        const savedEntry = memory.saveAsset(result.entry);

        memory.saveAssetsSnapshot({
            occurredAt: result.event.occurredAt,
            total: calculateAssetsTotal(memory.listAssets()),
            entries: memory.listAssets()
        });

        return savedEntry;
    }

    return getFinanceOperations(subblockId).add(label, amount);
}

function addFinancialBurdenEntry(label, debt, payment) {
    return addFinancialBurden(label, debt, payment);
}

function updateFinanceEntry(
    subblockId,
    entryId,
    label,
    amount,
    liquidity,
    payment = null
) {
    if (subblockId === "assets") {
        const memory = requireAssetsMemory();
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

        const savedEntry = memory.updateAsset(entryId, result.entry);

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

    const operations = getFinanceOperations(subblockId);

    if (typeof operations.update !== "function") {
        throw new Error(
            "LifeGame Finance: редактирование этого подблока не поддерживается."
        );
    }

    trace("application", "finance.update.begin", { subblockId, entryId });

    const result = subblockId === "financial-burden"
        ? operations.update(entryId, label, amount, payment)
        : operations.update(entryId, label, amount, liquidity);

    trace("application", "finance.update.completed", {
        subblockId,
        entryId,
        result: Boolean(result)
    });

    return result;
}

function removeFinanceEntry(subblockId, entryId) {
    if (subblockId === "assets") {
        const memory = requireAssetsMemory();
        const existingAsset = memory
            .listAssets()
            .find((entry) => entry.id === entryId);

        const result = removeAsset(existingAsset);

        if (!result) {
            return false;
        }

        const deleted = memory.deleteAsset(entryId);

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
    const financialBurden = listFinancialBurden();
    const assetEntries = assetsMemory ? assetsMemory.listAssets() : [];

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
        actualEarnings: listActualEarnings(),
        financialBurden,
        mandatoryExpenses: listMandatoryExpenses(),
        financialCushion: listFinancialCushion()
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
