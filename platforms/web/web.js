/*

* LifeGame
* Web Platform Entry Point
* Responsibility:
* ●	Start the Web platform.
* ●	Provide the initial application mount point.
* This file must NOT contain:
* ●	business logic
* ●	domain logic
* ●	memory logic
* ●	user data
* ●	index calculations
        */

const APP_ROOT_ID = “app”;

function startWeb() {
const appRoot = document.getElementById(APP_ROOT_ID);

if (!appRoot) {
    throw new Error(
        `LifeGame Web: application root "#${APP_ROOT_ID}" was not found.`
    );
}
appRoot.textContent = "LifeGame";

}

startWeb();