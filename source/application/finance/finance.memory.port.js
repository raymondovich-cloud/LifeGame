// finance.memory.port.js — Version 2.0

const REQUIRED_METHODS = Object.freeze([
    "listAssets",
    "saveAsset",
    "updateAsset",
    "deleteAsset",
    "listActualEarnings",
    "saveActualEarning",
    "updateActualEarning",
    "deleteActualEarning",
    "listFinancialBurden",
    "saveFinancialBurden",
    "updateFinancialBurden",
    "deleteFinancialBurden",
    "listMandatoryExpenses",
    "saveMandatoryExpense",
    "updateMandatoryExpense",
    "deleteMandatoryExpense",
    "listFinancialCushion",
    "saveFinancialCushion",
    "updateFinancialCushion",
    "deleteFinancialCushion",
    "saveAssetsSnapshot",
    "getAssetsSnapshotAtOrBefore",
    "getAssetsSnapshotsBetween",
    "getFirstAssetsSnapshot",
    "getLatestAssetsSnapshot"
]);

function createFinanceMemoryPort(implementation) {
    if (!implementation) {
        throw new Error("LifeGame Finance Memory Port: implementation is required.");
    }

    for (const method of REQUIRED_METHODS) {
        if (typeof implementation[method] !== "function") {
            throw new Error(
                "LifeGame Finance Memory Port: method is required: " + method
            );
        }
    }

    const port = {};

    for (const method of REQUIRED_METHODS) {
        port[method] = implementation[method];
    }

    return Object.freeze(port);
}

export { createFinanceMemoryPort };
