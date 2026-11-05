// Narrow r185 cache fixes. Keep per-object matrix bindings and per-context
// camera/render uniform buffers independent; do not remove context IDs.
// Naming: https://github.com/mrdoob/three.js/pull/34872
// Pass depth regression: https://github.com/mrdoob/three.js/issues/34681
import {readFile,writeFile,rename,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),three=resolve(root,'node_modules/three'),marker='HomeStudio R123 shader cache';
if(JSON.parse(await readFile(resolve(three,'package.json'),'utf8')).version!=='0.185.0')throw Error('Shader-cache backport requires pinned Three.js 0.185.0');
const replace=(source,before,after,count=1)=>{if(source.split(before).length!==count+1)throw Error('Unexpected r185 shader-cache source: '+before.slice(0,100));return source.split(before).join(after);};
function patch(source,kind){
 if(source.includes(marker))return source;
 if(kind==='builder'||kind==='bundle'){
  const start=source.indexOf('\tregisterDeclaration( node ) {'),end=source.indexOf('\n\t}\n',start);
  if(start<0||end<start)throw Error('r185 declaration registration missing');
  const declaration=source.slice(start,end);if(declaration.split('this.getPropertyName( node )').length!==3)throw Error('Unexpected r185 declaration registration');
  source=source.slice(0,start)+declaration.replaceAll('this.getPropertyName( node )','this.getDeclarationName( node )')+source.slice(end);
  source=replace(source,'\tregisterDeclaration( node ) {',`\t// ${marker}: check declared identifiers, not buffer.value expressions.
\tgetDeclarationName( node ) { return this.getPropertyName( node ); }

\tregisterDeclaration( node ) {`);
 }
 if(kind==='wgsl'||kind==='bundle'){
  source=replace(source,"\t\t\t\tuniformNode.name = name ? name : 'NodeBuffer_' + uniformNode.id;",'\t\t\t\t// '+marker+': retain the deterministic builder-local uniform name.');
  const before='\tgetPropertyName( node, shaderStage = this.shaderStage ) {';
  const at=source.indexOf(before,source.indexOf('class WGSLNodeBuilder extends NodeBuilder'));if(at<0)throw Error('WGSL declaration method missing');
  source=source.slice(0,at)+`\t// ${marker}: buffers declare name, although their values use name.value.
\tgetDeclarationName( node ) {
\t\tif ( node.isNodeUniform === true && ( node.type === 'buffer' || node.type === 'storageBuffer' || node.type === 'indirectStorageBuffer' ) ) return node.name;
\t\treturn super.getDeclarationName( node );
\t}

`+source.slice(at);
 }
 if(kind==='renderer'||kind==='bundle'){
  const signature='async compileAsync( scene, camera, targetScene = null ) {',start=source.indexOf(signature),end=source.indexOf('\n\t}\n',start);
  if(start<0||end<start)throw Error('r185 compileAsync missing');
  let method=source.slice(start,end);method=replace(method,signature,'async compileAsync( scene, camera, targetScene = null, renderDepth = this._callDepth + 1 ) {');
  method=replace(method,'this._renderContexts.get( renderTarget, this._mrt )','this._renderContexts.get( renderTarget, this._mrt, renderDepth )');
  source=source.slice(0,start)+'// '+marker+': precompile for the depth the pass actually renders at.\n\t'+method+source.slice(end);
 }
 return source;
}
const files=[['src/nodes/core/NodeBuilder.js','builder'],['src/renderers/webgpu/nodes/WGSLNodeBuilder.js','wgsl'],['src/renderers/common/Renderer.js','renderer'],['build/three.webgpu.js','bundle']],pending=[];
for(const [file,kind]of files){const path=resolve(three,file),source=await readFile(path,'utf8'),updated=patch(source,kind);if(source!==updated)pending.push({path,updated});}
for(const {path,updated}of pending){const temporary=path+'.homestudio-r123-'+process.pid;try{await writeFile(temporary,updated);await rename(temporary,path);}finally{await rm(temporary,{force:true});}}
if(pending.length)await rm(resolve(root,'node_modules/.vite'),{recursive:true,force:true});
console.log('Three.js r185 shader-cache fixes '+(pending.length?'applied':'ready')+'.');
