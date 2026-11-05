// r185 queues transparent front/back passes, then restores material.side before
// processing that queue. Retain the side for each work item, with the original
// material identity and per-object buffers. Scoped to the pinned reviewed API.
import {readFile,writeFile,rename,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),three=resolve(root,'node_modules/three'),marker='HomeStudio R124 transparent preparation';
if(JSON.parse(await readFile(resolve(three,'package.json'),'utf8')).version!=='0.185.0')throw Error('Transparent preparation fix requires pinned Three.js 0.185.0');
const replace=(source,before,after)=>{if(source.split(before).length!==2)throw Error('Unexpected Three.js transparent preparation source: '+before.slice(0,90));return source.replace(before,after);};
const pending=[];
for(const file of ['src/renderers/common/Renderer.js','build/three.webgpu.js']){
 const path=resolve(three,file),source=await readFile(path,'utf8');if(source.includes(marker))continue;let updated=source;
 updated=replace(updated,'this._compilationPromises.push( {\n\t\t\t\tobject,\n\t\t\t\tmaterial,','this._compilationPromises.push( {\n\t\t\t\tobject,\n\t\t\t\tmaterial,\n\t\t\t\tside: material.side,');
 const before='\t\t\t\tconst renderObject = this._objects.get( item.object, item.material, item.scene, item.camera, item.lightsNode, item.renderContext, item.clippingContext, item.passId );';
 updated=replace(updated,before,`\t\t\t\t// ${marker}\n\t\t\t\tconst previousSide = item.material.side;\n\t\t\t\titem.material.side = item.side;\n\t\t\t\ttry {\n${before}`);
 updated=replace(updated,'\t\t\t\tawait yieldWork();\n\t\t\t}\n\t\t\tawait Promise.all( compiling );','\t\t\t\t} finally { item.material.side = previousSide; }\n\t\t\t\tawait yieldWork();\n\t\t\t}\n\t\t\tawait Promise.all( compiling );');
 pending.push({path,updated});
}
for(const {path,updated}of pending){const temporary=path+'.homestudio-r124-'+process.pid;try{await writeFile(temporary,updated);await rename(temporary,path);}finally{await rm(temporary,{force:true});}}
if(pending.length)await rm(resolve(root,'node_modules/.vite'),{recursive:true,force:true});
console.log('Three.js r185 transparent preparation '+(pending.length?'applied':'ready')+'.');
