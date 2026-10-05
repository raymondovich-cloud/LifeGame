// finance.memory.port.js — Version 1.0

function createFinanceMemoryPort(implementation) {
    const requiredMethods = [
        "listAssets",
        "saveAsset",
        "updateAsset",
        "deleteAsset",
        "saveAssetsSnapshot",
        "getAssetsSnapshotAtOrBefore",
        "getAssetsSnapshotsBetween",
        "getFirstAssetsSnapshot",
        "getLatestAssetsSnapshot"
    ];

    for (const method of requiredMethods) {
        if (typeof implementation?.[method] !== "function") {
            throw new Error(
                "LifeGame Finance Memory Port: missing method " + method + "."
            );
        }
    }

    return Object.freeze({
        listAssets: implementation.listAssets,
        saveAsset: implementation.saveAsset,
        updateAsset: implementation.updateAsset,
        deleteAsset: implementation.deleteAsset,
        saveAssetsSnapshot: implementation.saveAssetsSnapshot,
        getAssetsSnapshotAtOrBefore: implementation.getAssetsSnapshotAtOrBefore,
        getAssetsSnapshotsBetween: implementation.getAssetsSnapshotsBetween,
        getFirstAssetsSnapshot: implementation.getFirstAssetsSnapshot,
        getLatestAssetsSnapshot: implementation.getLatestAssetsSnapshot
    });
}

export { createFinanceMemoryPort };
