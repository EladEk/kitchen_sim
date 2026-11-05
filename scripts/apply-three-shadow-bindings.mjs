// Backport the shadow-size observer from Three PR #34361 to pinned r185.
// A material shared by many meshes must refresh every object's bindings after
// resize. Keep shader/cache keys unchanged: resolution does not change WGSL.
// https://github.com/mrdoob/three.js/pull/34361
import {readFile,writeFile,rename,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),three=resolve(root,'node_modules/three'),marker='HomeStudio R126 shadow bindings';
if(JSON.parse(await readFile(resolve(three,'package.json'),'utf8')).version!=='0.185.0')throw Error('Shadow binding backport requires pinned Three.js 0.185.0');
const replace=(source,before,after)=>{if(source.split(before).length!==2)throw Error('Unexpected r185 shadow observer source: '+before.slice(0,100));return source.replace(before,after);};
const pending=[];
for(const file of ['src/materials/nodes/manager/NodeMaterialObserver.js','build/three.webgpu.js']){
 const path=resolve(three,file),source=await readFile(path,'utf8');if(source.includes(marker))continue;let updated=source;
 updated=replace(updated,'\t\t\t\tif ( renderObjectData.lights[ i ].map !== lightsData[ i ].map ) {\n\n\t\t\t\t\treturn false;',`\t\t\t\t// ${marker}: refresh each object's shared shadow bindings.\n\t\t\t\tconst previousLight = renderObjectData.lights[ i ];\n\t\t\t\tconst currentLight = lightsData[ i ];\n\t\t\t\tif ( previousLight.map !== currentLight.map || previousLight.shadowMapWidth !== currentLight.shadowMapWidth || previousLight.shadowMapHeight !== currentLight.shadowMapHeight ) {\n\n\t\t\t\t\tpreviousLight.map = currentLight.map;\n\t\t\t\t\tpreviousLight.shadowMapWidth = currentLight.shadowMapWidth;\n\t\t\t\t\tpreviousLight.shadowMapHeight = currentLight.shadowMapHeight;\n\t\t\t\t\treturn false;`);
 updated=replace(updated,'\t\tfor ( const light of materialLights ) {\n\n\t\t\tif ( light.isSpotLight === true && light.map !== null ) {',`\t\tfor ( const light of materialLights ) {\n\n\t\t\tlet data = null;\n\n\t\t\tif ( light.isSpotLight === true && light.map !== null ) {`);
 updated=replace(updated,'\t\t\t\tlights.push( { map: light.map.version } );\n\n\t\t\t}\n\n\t\t}\n\n\t\treturn lights;',`\t\t\t\tdata = { map: light.map.version };\n\n\t\t\t}\n\n\t\t\tif ( light.castShadow === true && light.shadow !== undefined ) {\n\n\t\t\t\tif ( data === null ) data = {};\n\t\t\t\tdata.shadowMapWidth = light.shadow.mapSize.width;\n\t\t\t\tdata.shadowMapHeight = light.shadow.mapSize.height;\n\n\t\t\t}\n\n\t\t\tif ( data !== null ) lights.push( data );\n\n\t\t}\n\n\t\treturn lights;`);
 pending.push({path,updated});
}
for(const {path,updated}of pending){const temporary=path+'.homestudio-r126-'+process.pid;try{await writeFile(temporary,updated);await rename(temporary,path);}finally{await rm(temporary,{force:true});}}
if(pending.length)await rm(resolve(root,'node_modules/.vite'),{recursive:true,force:true});
console.log('Three.js r185 shadow binding observer '+(pending.length?'applied':'ready')+'.');
