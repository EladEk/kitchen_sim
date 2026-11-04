// Authored upholstery components, in metres in a normalized 1m envelope.
// No third-party model or owner layout enters this reusable public library.
import * as THREE from 'three';
import {mergeVertices,mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder} from 'meshoptimizer';
import {writeFile} from 'node:fs/promises';

export function authoredCloth(kind){
 const g=new THREE.BoxGeometry(1,1,1,14,4,12),p=g.attributes.position,v=new THREE.Vector3(),closest=new THREE.Vector3(),inner=new THREE.Vector3(.40,.30,.40),low=inner.clone().negate();
 for(let i=0;i<p.count;i++){
  v.fromBufferAttribute(p,i);closest.copy(v).clamp(low,inner);const delta=v.clone().sub(closest);if(delta.lengthSq())v.copy(closest).addScaledVector(delta.normalize(),.1);
  const u=v.x*2,t=v.z*2,envelope=Math.max(0,1-u*u)*Math.max(0,1-t*t),top=Math.max(0,v.y)*2;
  // Individually shaped diagonal folds, corner gathering and cushion sag.
  let folds=0;for(const [a,b,c,width,amp]of [[1,.4,-.6,.09,.055],[1,-.65,.25,.12,-.035],[.25,1,-.45,.07,.04],[-.8,1,.65,.11,.03]]){const distance=a*u+b*t-c;folds+=Math.exp(-distance*distance/width)*amp;}
  v.y=v.y*(kind==='duvet'?.80:.86)+(kind==='duvet'?folds:.10-folds*.7-.065*Math.exp(-(u*u+t*t)*8))*envelope*top;
  const seam=Math.exp(-Math.pow((Math.abs(v.y)-.26)/.035,2));v.x*=1-seam*.025;v.z*=1-seam*.025;
  p.setXYZ(i,v.x,v.y,v.z);
 }
 // Weld positions before normals to avoid hard rectangular face borders.
 g.deleteAttribute('normal');const smooth=mergeVertices(g,1e-5);g.dispose();smooth.computeVertexNormals();smooth.computeBoundingBox();const size=smooth.boundingBox.getSize(new THREE.Vector3()),centre=smooth.boundingBox.getCenter(new THREE.Vector3());smooth.translate(-centre.x,-centre.y,-centre.z);smooth.scale(1/size.x,1/size.y,1/size.z);return smooth;
}
const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('HomeStudio upholstery components');
for(const name of ['cushion','duvet']){const g=authoredCloth(name),primitive=doc.createPrimitive();for(const [key,attribute]of Object.entries(g.attributes)){const semantic={position:'POSITION',normal:'NORMAL',uv:'TEXCOORD_0'}[key];if(!semantic)continue;const a=doc.createAccessor().setType(attribute.itemSize===2?'VEC2':'VEC3').setArray(new Float32Array(attribute.array)).setBuffer(buffer);primitive.setAttribute(semantic,a);}primitive.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(g.index.array)).setBuffer(buffer));const mesh=doc.createMesh(name).addPrimitive(primitive);scene.addChild(doc.createNode(name).setMesh(mesh));g.dispose();}
await MeshoptEncoder.ready;await doc.transform(meshopt({encoder:MeshoptEncoder,level:'medium'}));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});const path='public-view/assets/furniture-r113/upholstery.glb';await io.write(path,doc);
const bytes=(await import('node:fs/promises')).stat(path);await writeFile('public-view/assets/furniture-r113/PROVENANCE.json',JSON.stringify({revision:113,author:'HomeStudio',type:'authored upholstery component meshes',source:'scripts/build-furniture-library.mjs',compression:'EXT_meshopt_compression',components:['cushion','duvet'],bytes:(await bytes).size,limits:'Illustrative geometry, not a scan or the exact purchased sofa. Structural and furniture footprints remain source-controlled.'},null,2));console.log('Wrote shared Meshopt GLB',path);
