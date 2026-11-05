// Backport the bounded compilation scheduling/error-scope changes from
// https://github.com/mrdoob/three.js/pull/34816 to our pinned r185 API.
// Four in-flight pipelines bound mobile memory; node building stays sequential.
// Also allow NodeBuilder's upstream yield callback without upgrading Three.js.
import {readFile,writeFile,rename,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),three=resolve(root,'node_modules/three'),marker='HomeStudio R122 bounded compilation';
if(JSON.parse(await readFile(resolve(three,'package.json'),'utf8')).version!=='0.185.0')throw Error('Compilation backport requires pinned Three.js 0.185.0');
const replace=(source,before,after,count=1)=>{if(source.split(before).length!==count+1)throw Error('Three.js compilation source differs from the reviewed r185 implementation: '+before.slice(0,100));return source.split(before).join(after);};
const loop=`		// ${marker}
		const compiling = new Set();
		let failure = null;
		let lastYield = performance.now();
		const yieldWork = async () => {
			if ( performance.now() - lastYield < 8 ) return;
			await new Promise( resolve => {
				let done = false;
				const finish = () => { if ( ! done ) { done = true; resolve(); } };
				if ( typeof requestAnimationFrame !== 'undefined' ) requestAnimationFrame( () => setTimeout( finish, 0 ) );
				setTimeout( finish, 100 );
			} );
			lastYield = performance.now();
		};
		try {
			for ( const item of compilationPromises ) {
				if ( failure ) throw failure;
				if ( this._isDeviceLost ) throw Object.assign( new Error( 'WebGPU device lost during preparation' ), { code: 'WEBGPU_DEVICE_LOST' } );
				const renderObject = this._objects.get( item.object, item.material, item.scene, item.camera, item.lightsNode, item.renderContext, item.clippingContext, item.passId );
				renderObject.drawRange = item.object.geometry.drawRange;
				renderObject.group = item.group;
				await this._nodes.getForRenderAsync( renderObject, yieldWork );
				this._nodes.updateBefore( renderObject );
				this._geometries.updateForRender( renderObject );
				this._nodes.updateForRender( renderObject );
				this._bindings.updateForRender( renderObject );
				const promises = [];
				this._pipelines.getForRender( renderObject, promises );
				this._nodes.updateAfter( renderObject );
				const check = () => {
					if ( this._isDeviceLost ) throw Object.assign( new Error( 'WebGPU device lost during preparation' ), { code: 'WEBGPU_DEVICE_LOST' } );
					if ( this.backend.get( renderObject.pipeline ).error ) throw Object.assign( new Error( 'WebGPU shader pipeline failed during preparation' ), { name: 'SceneDrawError', code: 'WEBGPU_PIPELINE_ERROR' } );
				};
				if ( promises.length ) {
					let pending;
					pending = Promise.all( promises ).then( check ).catch( error => { failure = error; throw error; } ).finally( () => compiling.delete( pending ) );
					compiling.add( pending );
					// Observe every rejection immediately, even while a node is yielding.
					pending.catch( () => {} );
					if ( compiling.size >= 4 ) await Promise.race( compiling );
				} else check();
				await yieldWork();
			}
			await Promise.all( compiling );
			if ( failure ) throw failure;
		} finally {
			await Promise.allSettled( compiling );
		}
`;
function patch(source,kind){
 if(source.includes(marker))return source;
 if(kind==='builder'||kind==='bundle'){
  source=replace(source,'async buildAsync() {','async buildAsync( yieldFn = yieldToMain ) {');
  source=replace(source,'// Yield to main thread after each shader stage to prevent blocking\n\t\t\t\tawait yieldToMain();','// '+marker+'\n\t\t\t\tawait yieldFn();');
 }
 if(kind==='manager'||kind==='bundle'){
  if(kind==='manager')source=replace(source,"import { error } from '../../../utils.js';","import { error, yieldToMain } from '../../../utils.js';");
  source=replace(source,'getForRender( renderObject, useAsync = false ) {','getForRender( renderObject, useAsync = false, yieldFn = yieldToMain ) {');
  source=replace(source,'await nodeBuilder.buildAsync();','await nodeBuilder.buildAsync( yieldFn );',2);
  source=replace(source,'getForRenderAsync( renderObject ) {','getForRenderAsync( renderObject, yieldFn = yieldToMain ) {');
  source=replace(source,'this.getForRender( renderObject, true )','this.getForRender( renderObject, true, yieldFn )');
  if(kind==='manager')source='// '+marker+'\n'+source;
 }
 if(kind==='renderer'||kind==='bundle'){
  const start=source.indexOf('\t\t// Process compilation work items sequentially to avoid freezing'),end=source.indexOf('\n\t}\n',start);
  if(start<0||end<start||!source.slice(start,end).includes('await this._nodes.getForRenderAsync( renderObject );'))throw Error('Unexpected r185 compileAsync loop');
  source=source.slice(0,start)+loop+source.slice(end);
 }
 if(kind==='pipeline'||kind==='bundle'){
  for(const descriptor of ['_renderPipelineDescriptor']){
   const before=descriptor+'.reset();\n\n\t\t\t\t\tif ( pipelinePromise !== null )';
   source=replace(source,before,descriptor+'.reset();\n\n\t\t\t\t\t// '+marker+': scopes must not span an await.\n\t\t\t\t\tconst errorScopePromise = device.popErrorScope();\n\n\t\t\t\t\tif ( pipelinePromise !== null )');
  }
  source=replace(source,'const errorScope = await device.popErrorScope();','const errorScope = await errorScopePromise;',1);
 }
 return source;
}
const files=[['src/nodes/core/NodeBuilder.js','builder'],['src/renderers/common/nodes/NodeManager.js','manager'],['src/renderers/common/Renderer.js','renderer'],['src/renderers/webgpu/utils/WebGPUPipelineUtils.js','pipeline'],['build/three.webgpu.js','bundle']],pending=[];
for(const [file,kind]of files){const path=resolve(three,file),source=await readFile(path,'utf8'),updated=patch(source,kind);if(source!==updated)pending.push({path,updated});}
for(const {path,updated}of pending){const temporary=path+'.homestudio-r122-'+process.pid;try{await writeFile(temporary,updated);await rename(temporary,path);}finally{await rm(temporary,{force:true});}}
if(pending.length)await rm(resolve(root,'node_modules/.vite'),{recursive:true,force:true});
console.log('Three.js r185 bounded compilation '+(pending.length?'applied':'ready')+'.');
