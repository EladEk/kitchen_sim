import {setPatchTarget} from './three-patch-diagnostics.mjs';
// r185 gives every shadow-casting light (and every CSM cascade) its own depth
// material with a fresh vec4 colour node. Node ids are part of the material
// cache key, so the same caster needed one node build per light: ~720 builds
// during the first phone frame for 2 cascades + 3 interior spot shadows.
// Equivalent shadow-pass materials now share one colour node, hence one key.
import {readFile,writeFile,rename,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),three=resolve(root,'node_modules/three'),marker='HomeStudio R182 shared shadow material key';
if(JSON.parse(await readFile(setPatchTarget(resolve(three,'package.json')),'utf8')).version!=='0.185.0')throw Error('Shadow material key patch requires pinned Three.js 0.185.0');
const replace=(source,before,after)=>{if(source.split(before).length!==2)throw Error('Unexpected r185 shadow material source: '+before.slice(0,100));return source.replace(before,after);};
const pending=[];
for(const [file,declaration] of [['src/nodes/lighting/ShadowFilterNode.js','export const getShadowMaterial = ( light ) => {'],['build/three.webgpu.js','const getShadowMaterial = ( light ) => {']]){
 const path=setPatchTarget(resolve(three,file)),source=await readFile(path,'utf8');if(source.includes(marker))continue;let updated=source;
 updated=replace(updated,'\n'+declaration,`\n// ${marker}\nlet _sharedShadowPassColor = null;\n\n${declaration}`);
 updated=replace(updated,'\t\tmaterial = new NodeMaterial();\n\t\tmaterial.colorNode = vec4( 0, 0, 0, 1 );\n\t\tmaterial.isShadowPassMaterial = true;','\t\tmaterial = new NodeMaterial();\n\t\tif ( _sharedShadowPassColor === null ) _sharedShadowPassColor = vec4( 0, 0, 0, 1 );\n\t\tmaterial.colorNode = _sharedShadowPassColor;\n\t\tmaterial.isShadowPassMaterial = true;');
 pending.push({path,updated});
}
for(const {path,updated}of pending){const temporary=path+'.homestudio-r182-'+process.pid;try{await writeFile(temporary,updated);await rename(temporary,path);}finally{await rm(temporary,{force:true});}}
if(pending.length)await rm(resolve(root,'node_modules/.vite'),{recursive:true,force:true});
console.log('Three.js r185 shared shadow material key '+(pending.length?'applied':'ready')+'.');
