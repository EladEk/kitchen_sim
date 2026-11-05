// Narrow backport of r186's Instance.js capacity checks to pinned r185.
// r185 sizes its binding from the full array but selects its shader route from
// the live draw count. A reduced LOD count can therefore bind >64 KiB as a UBO.
// Keep the r185 public API; update both source and the exported WebGPU bundle.
import {readFile,writeFile,rename,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),three=resolve(root,'node_modules/three'),marker='HomeStudio R121 instance-capacity backport';
const {version}=JSON.parse(await readFile(resolve(three,'package.json'),'utf8'));
if(version!=='0.185.0')throw Error(`Instance-capacity backport expects pinned Three.js 0.185.0, found ${version}. Verify the upstream capacity fix before changing this patch.`);
const files=['src/nodes/accessors/Instance.js','build/three.webgpu.js'],pending=[];
for(const file of files){
 const path=resolve(three,file),source=await readFile(path,'utf8');
 if(source.includes(marker)){
  if(source.includes('const uniformBufferSize = count * 16 * 4;')||!source.includes('const uniformBufferSize = Math.max( matrices.count, 1 ) * 16 * 4;'))throw Error('Incomplete instance-capacity backport in '+file);
  continue;
 }
 const entry='function createInstanceMatrixNode( builder, instanceMatrix, count ) {',limits='const uniformBufferSize = count * 16 * 4;',uniform="buffer( instanceMatrix.array, 'mat4', Math.max( count, 1 ) )",storage="storage( instanceMatrix, 'mat4', Math.max( count, 1 ) )";
 if(source.split(entry).length!==2||source.split(limits).length!==3||!source.includes(uniform)||!source.includes(storage))throw Error('Three.js instance source differs from the reviewed r185 implementation: '+file);
 let updated=source.replace(entry,entry+'\n\n\t// '+marker+'\n\tconst matrixCount = Math.max( instanceMatrix.count, 1 );');
 updated=updated.replace(limits,'const uniformBufferSize = matrixCount * 16 * 4;').replace(limits,'const uniformBufferSize = Math.max( matrices.count, 1 ) * 16 * 4;').replace(uniform,"buffer( instanceMatrix.array, 'mat4', matrixCount )").replace(storage,"storage( instanceMatrix, 'mat4', matrixCount )");
 pending.push({path,updated});
}
// Validate every target before writing either one, and invalidate generated
// Vite prebundles so local dev cannot retain the previous WebGPU implementation.
for(const {path,updated} of pending){const temporary=path+'.homestudio-r121-'+process.pid;try{await writeFile(temporary,updated);await rename(temporary,path);}finally{await rm(temporary,{force:true});}}
if(pending.length)await rm(resolve(root,'node_modules/.vite'),{recursive:true,force:true});
console.log('Three.js r185 instance-capacity fix '+(pending.length?'applied':'ready')+'.');
