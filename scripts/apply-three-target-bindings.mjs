// Adapt the target/resize observer checks from Three PRs #34612 and #34968
// to r185's boolean refresh API. Render contexts are shared by attachment
// layout; equal-size replacement targets still require fresh object bindings.
// https://github.com/mrdoob/three.js/pull/34968
import {readFile,writeFile,rename,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),three=resolve(root,'node_modules/three'),marker='HomeStudio R126 output bindings';
if(JSON.parse(await readFile(resolve(three,'package.json'),'utf8')).version!=='0.185.0')throw Error('Output binding backport requires pinned Three.js 0.185.0');
const before='\tneedsRefresh( renderObject, nodeFrame ) {\n\n\t\tif ( this.hasNode || this.hasAnimation || this.firstInitialization( renderObject ) || this.needsVelocity( nodeFrame.renderer ) )';
const after=`\tneedsRefresh( renderObject, nodeFrame ) {

\t\t// ${marker}: check per-target resources before static/bundle exits.
\t\tconst renderer = nodeFrame.renderer;
\t\tconst data = this.getRenderObjectData( renderObject );
\t\tconst target = renderer.getRenderTarget() || renderer.getCanvasTarget();
\t\tconst { width, height } = renderObject.context;
\t\tif ( data.outputTarget !== target || data.outputWidth !== width || data.outputHeight !== height ) {
\t\t\tdata.outputTarget = target;
\t\t\tdata.outputWidth = width;
\t\t\tdata.outputHeight = height;
\t\t\treturn true;
\t\t}

\t\tif ( this.hasNode || this.hasAnimation || this.firstInitialization( renderObject ) || this.needsVelocity( nodeFrame.renderer ) )`;
const pending=[];
for(const file of ['src/materials/nodes/manager/NodeMaterialObserver.js','build/three.webgpu.js']){
 const path=resolve(three,file),source=await readFile(path,'utf8');if(source.includes(marker))continue;if(source.split(before).length!==2)throw Error('Unexpected r185 output binding observer source');pending.push({path,updated:source.replace(before,after)});
}
for(const {path,updated}of pending){const temporary=path+'.homestudio-r126-'+process.pid;try{await writeFile(temporary,updated);await rename(temporary,path);}finally{await rm(temporary,{force:true});}}
if(pending.length)await rm(resolve(root,'node_modules/.vite'),{recursive:true,force:true});
console.log('Three.js r185 output binding observer '+(pending.length?'applied':'ready')+'.');
