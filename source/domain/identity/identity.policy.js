// LifeGame 3.0 — Identity Domain Policy
// Version: 1.0
// Responsibility: identity business rules only.

import { ACCOUNT_STATUS } from './identity.js';

export function canAuthenticate(identity) {
    return Boolean(identity)
        && identity.status !== ACCOUNT_STATUS.DELETED
        && identity.status !== ACCOUNT_STATUS.SUSPENDED;
}

export function canUseApplication(identity) {
    return Boolean(identity)
        && identity.status === ACCOUNT_STATUS.ACTIVE;
}
