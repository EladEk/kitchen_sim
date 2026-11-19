import {patchTarget} from './three-patch-diagnostics.mjs';
// Do not exit an importing build process: skipping patches must still build.
if(process.env.SKIP_THREE_PATCHES==='1')console.info('[three patches] Skipped (SKIP_THREE_PATCHES=1).');
else for(const script of ['apply-three-instance-capacity.mjs','apply-three-compilation.mjs','apply-three-shader-cache.mjs','apply-three-transparent-preparation.mjs','apply-three-shadow-bindings.mjs','apply-three-target-bindings.mjs','apply-three-shadow-material-key.mjs']){
 try{await import('./'+script);}catch(cause){throw new Error(`[three patches] ${script} failed for ${patchTarget()}: ${cause.message}`,{cause});}
}
