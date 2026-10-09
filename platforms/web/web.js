// platforms/web/web.js — Version 5.7
// Responsibility: start the browser runtime without rendering temporary module previews.

const APP_ROOT_ID="app";

function registerServiceWorker(){
 if(!("serviceWorker" in navigator)||!window.isSecureContext)return;

 navigator.serviceWorker
  .register(new URL("./service-worker.js",import.meta.url))
  .catch(error=>{
   console.warn("LifeGame offline asset caching is unavailable.",error);
  });
}

function boot(){
 const appRoot=document.getElementById(APP_ROOT_ID);
 if(!appRoot)return;

 const shell=appRoot.querySelector("#application-shell");
 if(!shell)return;

 shell.hidden=false;
 appRoot.dataset.access="public";

 import("./web.runtime.js?v=20261008-2140")
  .then(({startWeb})=>startWeb())
  .catch(error=>{
   console.error("LifeGame Web runtime failed to load.",error);
  });
}

registerServiceWorker();
boot();
