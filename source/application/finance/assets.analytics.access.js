// assets.analytics.access.js — Version 1.0

const FREE_MAX_CUSTOM_RANGE_DAYS = 183;

let entitlementReader = () => "free";

function configureAssetsAnalyticsAccess({ getEntitlement }) {
    if (typeof getEntitlement !== "function") {
        throw new Error(
            "LifeGame Assets Analytics: entitlement reader is required."
        );
    }

    entitlementReader = getEntitlement;
}

function getDaysBetween(startTimestamp, endTimestamp) {
    return (endTimestamp - startTimestamp) / (24 * 60 * 60 * 1000);
}

function canAccessAssetsAnalyticsRange({
    startDate,
    endDate,
    allTime = false
}) {
    const entitlement = entitlementReader();
    const isPro = entitlement === "pro";

    if (isPro || allTime === false) {
        if (isPro) return true;

        const startTimestamp = new Date(startDate).getTime();
        const endTimestamp = new Date(endDate).getTime();

        if (
            !Number.isFinite(startTimestamp) ||
            !Number.isFinite(endTimestamp)
        ) {
            return false;
        }

        return getDaysBetween(startTimestamp, endTimestamp) <=
            FREE_MAX_CUSTOM_RANGE_DAYS;
    }

    return false;
}

export {
    configureAssetsAnalyticsAccess,
    canAccessAssetsAnalyticsRange,
    FREE_MAX_CUSTOM_RANGE_DAYS
};
