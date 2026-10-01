// platforms/web/web.js — Version 1.2

import { createNavigation } from "../../source/application/navigation/navigation.js";
import { createFinanceScreen } from "../../source/application/finance/finance.js";

const APP_ROOT_ID = "app";

function startWeb() {
    const appRoot = document.getElementById(APP_ROOT_ID);
    if (!appRoot) {
        throw new Error("LifeGame Web: application root \"#" + APP_ROOT_ID + "\" was not found.");
    }
    createFinanceScreen(appRoot);
    createNavigation(appRoot);
}

startWeb();
