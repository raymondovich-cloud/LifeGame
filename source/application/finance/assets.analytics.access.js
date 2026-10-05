// assets.analytics.access.js — Version 1.1

const FREE_MAX_CUSTOM_RANGE_MONTHS = 6;

let entitlementReader = () => "free";

function configureAssetsAnalyticsAccess({ getEntitlement }) {
    if (typeof getEntitlement !== "function") {
        throw new Error(
            "LifeGame Assets Analytics: entitlement reader is required."
        );
    }

    entitlementReader = getEntitlement;
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

        const maximumEndDate = new Date(startTimestamp);
        maximumEndDate.setMonth(maximumEndDate.getMonth() + FREE_MAX_CUSTOM_RANGE_MONTHS);

        return endTimestamp <= maximumEndDate.getTime();
    }

    return false;
}

export {
    configureAssetsAnalyticsAccess,
    canAccessAssetsAnalyticsRange,
    FREE_MAX_CUSTOM_RANGE_MONTHS
};
