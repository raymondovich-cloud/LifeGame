/*
 * LifeGame
 * Web Platform Entry Point
 *
 * Responsibility:
 * - Start the Web platform.
 * - Verify the application mount point.
 *
 * This file contains no business logic, domain logic,
 * memory logic, user data, or index calculations.
 */

const APP_ROOT_ID = "app";

function startWeb() {
    const appRoot = document.getElementById(APP_ROOT_ID);

    if (!appRoot) {
        throw new Error(
            `LifeGame Web: application root "#${APP_ROOT_ID}" was not found.`
        );
    }

    // The HTML entry point owns the initial presentation shell.
    // The Web platform only verifies that the mount point exists.
}

startWeb();
