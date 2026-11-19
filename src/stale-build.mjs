// A page left open across a deployment still references the previous build's
// hashed chunks, which the new deployment no longer serves (404). Such a
// failure says nothing about the device or the graphics engine: reload once
// into the current build. Engine/quality choices and saved views already live
// in localStorage and the URL, so they survive the reload.
export const STALE_BUILD_RELOAD_KEY='homestudio-stale-build-reload';
export const STALE_BUILD_MESSAGE='גרסה חדשה נטענה…';
const CHUNK_PATTERNS=/Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|Loading (?:CSS )?chunk [\w-]+ failed|ChunkLoadError/i;
export function isChunkLoadError(error){
 for(let e=error,depth=0;e&&depth<6;e=e.cause,depth++){
  if(e.code==='STALE_BUILD_RELOAD'||e.name==='ChunkLoadError')return true;
  if(CHUNK_PATTERNS.test(String(e.message||e)))return true;
 }
 return false;
}
// Identifies this build: the page's hashed entry script, whose name changes
// whenever any chunk it references changes (fallback: this chunk's URL).
export const CURRENT_BUILD=(()=>{try{const entry=globalThis.document?.querySelector?.('script[type="module"][src]')?.src;return new URL(entry||import.meta.url).pathname;}catch{return 'unknown';}})();
export const STALE_BUILD_NOTE_KEY='homestudio-stale-build-note';
let pending=false,reported=false;
function showMessage(doc){try{if(!doc?.body||doc.getElementById('stale-build-reload'))return;const note=doc.createElement('div');note.id='stale-build-reload';note.setAttribute('role','status');note.dir='rtl';note.textContent=STALE_BUILD_MESSAGE;note.style.cssText='position:fixed;inset:auto 0 24px;margin:auto;width:max-content;max-width:90vw;padding:10px 18px;border-radius:999px;background:#354e3c;color:#fff;font:15px system-ui;z-index:2147483647;box-shadow:0 6px 24px rgba(0,0,0,.25)';doc.body.appendChild(note);}catch{}}
// Returns true when a reload into the current deployment has been started. A
// second chunk failure on the same build (the reload did not help) returns
// false so the caller reports the real error instead of looping.
export function reloadForStaleBuild(error,{build=CURRENT_BUILD,storage=globalThis.sessionStorage,location=globalThis.location,document:doc=globalThis.document,onDiagnostic=()=>{},delay=400}={}){
 if(!isChunkLoadError(error))return false;if(pending)return true;
 let previous=null;try{previous=storage?.getItem(STALE_BUILD_RELOAD_KEY);}catch{}
 if(previous===build){if(reported)return false;reported=true;try{onDiagnostic({event:'stale-build-reload',details:{build,reloaded:false,reason:'already-reloaded-for-this-build'}});}catch{}return false;}
 try{storage?.setItem(STALE_BUILD_RELOAD_KEY,build);}catch{return false;}
 pending=true;const details={build,reloaded:true,module:String(error?.message||error).slice(0,240),at:new Date().toISOString()};try{storage?.setItem(STALE_BUILD_NOTE_KEY,JSON.stringify(details));}catch{}try{onDiagnostic({event:'stale-build-reload',details});}catch{}
 showMessage(doc);setTimeout(()=>{try{location.reload();}catch{}},delay);return true;
}
// React.lazy wrapper: on a stale chunk, keep the Suspense fallback up while the
// page reloads instead of rendering an error boundary.
export function reloadingImport(load,options){return ()=>load().catch(error=>{if(reloadForStaleBuild(error,options))return new Promise(()=>{});throw error;});}
export function installStaleBuildRecovery(target=globalThis.window,options){
 if(!target?.addEventListener)return;
 // Do not preventDefault: Vite would then resolve the import with undefined
 // and the caller would misread it as its own failure. Let the import reject
 // (callers recognise the chunk error) while the reload is already scheduled.
 target.addEventListener('vite:preloadError',event=>{reloadForStaleBuild(event.payload||event,options);});
 target.addEventListener('unhandledrejection',event=>{if(isChunkLoadError(event.reason)&&reloadForStaleBuild(event.reason,options))event.preventDefault?.();});
}
// The reloaded page reads (once) why it was reloaded, for its diagnostic log.
export function takeStaleBuildNote(storage=globalThis.sessionStorage){try{const raw=storage?.getItem(STALE_BUILD_NOTE_KEY);if(!raw)return null;storage.removeItem?.(STALE_BUILD_NOTE_KEY);return JSON.parse(raw);}catch{return null;}}
export function resetStaleBuildState(){pending=false;reported=false;}
