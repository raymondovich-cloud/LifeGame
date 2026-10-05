// user.context.js — Version 1.0

function createUserContext(userId) {
    const normalizedUserId = String(userId ?? "").trim();

    if (!normalizedUserId) {
        throw new Error("LifeGame UserContext: userId is required.");
    }

    return Object.freeze({
        userId: normalizedUserId
    });
}

export { createUserContext };
