// platforms/web/web.js — Version 5.4
// Responsibility: start the browser runtime without rendering temporary module previews.

const APP_ROOT_ID="app";

function boot(){
 const appRoot=document.getElementById(APP_ROOT_ID);
 if(!appRoot)return;

 const shell=appRoot.querySelector("#application-shell");
 if(!shell)return;

 shell.hidden=false;
 appRoot.dataset.access="public";

 import("./web.runtime.js?v=20261008-2100")
  .then(({startWeb})=>startWeb())
  .catch(error=>{
   console.error("LifeGame Web runtime failed to load.",error);
  });
}

boot();
