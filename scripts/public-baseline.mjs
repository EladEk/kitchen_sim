// Build-time only: publish approved baseline geometry, never owner modules/data.
import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {createHash} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
import {buildBuildingContext} from '../src/building-scene.js';
import {buildGroundApartments} from '../src/ground-apartments-scene.js';
import {buildApartmentFurniture} from '../src/apartment-furniture-scene.js';
import {BUILDING_FLOORS,BUILDING,BUILDING_CENTER} from '../src/building-layout.mjs';
import {BUILDING_INTERIORS} from '../src/building-interiors.mjs';
import {groundTransform} from '../src/ground-apartments.mjs';
import {COMMON_SPACES} from '../src/common-spaces.mjs';
import {duplexForUnit} from '../src/building-duplexes.mjs';
import {normalizeHomeSettings} from '../src/home-model.mjs';
import {publicSiteData} from './public-site.mjs';
import {unitDisplayPolygons,displayTriangles} from './public-display-polygons.mjs';
import {refinePublicFacade} from './public-facade-details.mjs';

export async function createPublicBaseline(directory){
 const resources=[],picks=[],root=new THREE.Group(),settings={...normalizeHomeSettings(),openDoors:[],openParts:[],closedBuildingDoors:[],cutaway:false,furniture:true,showLighting:true,buildingLevel:9,tourDestination:'unit:1:0'};
 buildBuildingContext({group:root,resources,settings,mode:'walk',picks});
 // Identity placement of the SAME base-plan template used for the neighbours.
 const temp=new THREE.Group(),bases=buildGroundApartments({root:temp,resources,picks:[],settings,mode:'walk'}),own=bases.get(1).clone(true);
 own.matrix.identity();own.name='public-base-apartment-4';own.userData={level:0};root.add(own);
 // Replicate generic neighbour furnishing, never FURNITURE or owner layouts.
 const furniture=new THREE.Group();buildApartmentFurniture({parent:furniture,resources,level:0,base:0,settings});
 const t=groundTransform(1),[a,b,c,d]=t.matrix,inverse=new THREE.Matrix4().set(a,0,b,t.offset[0],0,1,0,0,c,0,d,t.offset[1],0,0,0,1).invert(),m=new THREE.Matrix4();
 for(const mesh of furniture.children){const indices=mesh.userData.placements.map((v,i)=>v.unit===1?i:-1).filter(i=>i>=0);if(!indices.length)continue;const clone=new THREE.InstancedMesh(mesh.geometry,mesh.material,indices.length);indices.forEach((i,j)=>{mesh.getMatrixAt(i,m);m.premultiply(inverse);clone.setMatrixAt(j,m);});clone.userData={level:0};clone.castShadow=clone.receiveShadow=true;root.add(clone);}
 // Development is rendered once for the whole district. Remove the old
 // unrotated site surfaces and partial fences before sanitising the building.
 // Entrance doors, lintels and service-room geometry remain in the building.
 const siteParts=new Set(['building-garden-ground','building-garden-fence','building-site-base','site-drive-lane','site-sidewalk','site-parking-bay','site-parking-number','site-raised-curb','site-illustrative-cars','site-car-glass','site-car-tyres','site-illustrative-planting']);
 const obsolete=[];root.traverse(o=>{if(siteParts.has(o.userData.part))obsolete.push(o);});obsolete.forEach(o=>o.removeFromParent());
 refinePublicFacade(root,resources);
 // Strict metadata allowlist, no inspection descriptions, product IDs or sources.
 function clean(o,inherited=0){const f=o.userData.level??o.userData.buildingFloor??inherited;const part=o.userData.part||o.name||'';const ceiling=/ceiling/.test(part)||(o.geometry?.type==='ShapeGeometry'&&Math.abs(o.position.y-2.75)<.01),roof=/roof|lift-stair-head/.test(part),exterior=f===0||f===9||ceiling||roof||/building-(facade|window|glazing|rail|laundry|balcony|stone-sill|floor-slab|unit-finish|fascia)|public-curtain/.test(part);o.userData={level:f,ceiling,roof,exterior};o.name='';for(const child of o.children)clean(child,f);}
 clean(root);root.updateMatrixWorld(true);
 const geometryCache=new Map(),geometryByContent=new Map();root.traverse(o=>{
  // Parametric toJSON rebuilds constructor defaults and loses baked transforms.
  // Export the actual buffers; deduplicate equal buffers to keep downloads small.
  if(o.geometry){
   if(!geometryCache.has(o.geometry)){
    let g=new THREE.BufferGeometry().copy(o.geometry);
    // Rounded source primitives often repeat all three corners of every
    // triangle. Compact once at build time, preserving UV and normal seams.
    if(!g.index){const compact=mergeVertices(g,1e-6),bytes=v=>Object.values(v.attributes).reduce((n,a)=>n+a.array.byteLength,v.index?.array.byteLength||0);if(bytes(compact)<bytes(g)){g.dispose();g=compact;}else compact.dispose();}
    const hash=createHash('sha256');
    for(const [name,attribute] of [...Object.entries(g.attributes),['index',g.index]]){if(!attribute)continue;hash.update(JSON.stringify([name,attribute.itemSize,attribute.normalized,attribute.array.constructor.name]));hash.update(Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));}
    hash.update(JSON.stringify([g.groups,g.drawRange]));const key=hash.digest('hex');
    if(!geometryByContent.has(key))geometryByContent.set(key,g);
    geometryCache.set(o.geometry,geometryByContent.get(key));
   }
   o.geometry=geometryCache.get(o.geometry);
  }
  if(o.isMesh&&!o.isInstancedMesh)o.type='Mesh';
  if(o.material?.isShaderMaterial)o.material=new THREE.MeshStandardMaterial({color:'#9daaa7',metalness:.75,roughness:.16});
 });
 const seen=new Set(),textureCache=new Map();root.traverse(o=>{if(o.geometry)o.geometry.userData={};for(const mat of [o.material].flat().filter(Boolean)){if(seen.has(mat))continue;seen.add(mat);mat.userData={...(mat.userData.metricInstancedUVs?{metricInstancedUVs:true}:{}),...(['limestone','cement','porcelain','plaster','paint','wood','fabric'].includes(mat.userData.surfaceKind)?{surfaceKind:mat.userData.surfaceKind}:{}),...(["stone","floor"].includes(mat.userData.publicFinish)?{publicFinish:mat.userData.publicFinish}:{})};mat.name='';for(const [key,value] of Object.entries(mat))if(value?.isTexture&&!value.image?.data)mat[key]=null;for(const key of ['map','bumpMap','roughnessMap','normalMap']){const tex=mat[key];if(tex){
     // Compact procedural colours; external images and render-target mirrors
     // are never copied into the public snapshot.
     if(!tex.image?.data||!['map','bumpMap','roughnessMap'].includes(key)){mat[key]=null;continue;}
     const image=tex.image,size=64,bytes=new Uint8Array(size*size*4);
     for(let y=0;y<size;y++)for(let x=0;x<size;x++){const from=(Math.floor(y*image.height/size)*image.width+Math.floor(x*image.width/size))*4;bytes.set(image.data.subarray(from,from+4),(y*size+x)*4);}
     const fingerprint=createHash('sha256').update(bytes).update(JSON.stringify([tex.repeat.x,tex.repeat.y,tex.colorSpace,tex.wrapS,tex.wrapT])).digest('hex');
     if(!textureCache.has(fingerprint)){const compact=tex.clone();compact.image={data:bytes,width:size,height:size};compact.userData={};compact.name='';textureCache.set(fingerprint,compact);}
     mat[key]=textureCache.get(fingerprint);
    }}}});
 // Material equality includes every serialized property, texture and allowed
 // finish flag. Sharing equal public materials also combines district batches.
 const materialCache=new Map(),canonicalMaterials=new Map();
 root.traverse(o=>{if(!o.material)return;const canonical=mat=>{if(canonicalMaterials.has(mat))return canonicalMaterials.get(mat);const json=mat.toJSON();delete json.uuid;delete json.metadata;delete json.name;const key=JSON.stringify(json);if(!materialCache.has(key))materialCache.set(key,mat);const shared=materialCache.get(key);canonicalMaterials.set(mat,shared);return shared;};o.material=Array.isArray(o.material)?o.material.map(canonical):canonical(o.material);});
 const display=new Map(BUILDING_FLOORS.map(f=>[f.level,unitDisplayPolygons(f)]));
 const floors=BUILDING_FLOORS.map(f=>({level:f.level,elevation:f.elevation,label:f.he,units:f.units.map(u=>({number:u.number,polygon:u.polygon,displayPolygons:display.get(f.level).get(u.number),displayTriangles:displayTriangles(display.get(f.level).get(u.number))})),core:f.core}));
 const destinations=[];
 for(const f of BUILDING_FLOORS)for(const u of f.units){const duplex=duplexForUnit(u.number,f.level);if(duplex&&f.level!==duplex.entryFloor)continue;const source=BUILDING_INTERIORS.floors[f.level],entry=source.entries.find(e=>e.unit===u.number),door=source.doors.find(d=>d.id===entry?.doorId);let position,yaw=0;if(u.number===4){position=[6.1,2.8];yaw=Math.PI;}else if(door){const normal=door.opened.map((n,i)=>(n-door.hinge[i])/(Math.hypot(...door.opened.map((x,k)=>x-door.hinge[k]))||1));position=door.hinge.map((n,i)=>(n+door.closed[i])/2+normal[i]*.85);yaw=Math.atan2(-normal[0],-normal[1]);}else{position=[...u.polygon[0]];}destinations.push({id:`unit:${u.number}:${f.level}`,label:`דירה ${u.number}`,floor:f.level,unit:u.number,position,yaw,polygon:u.polygon});}
 for(const c of COMMON_SPACES)destinations.push({id:c.id,label:c.he||c.nameHe||c.id,floor:0,position:c.walk,yaw:c.yaw||0,polygon:c.polygon});
 await mkdir(directory,{recursive:true});await writeFile(directory+'/building.json',JSON.stringify(root.toJSON()));await writeFile(directory+'/site.json',JSON.stringify(publicSiteData()));await writeFile(directory+'/navigation.json',JSON.stringify({revision:97,center:BUILDING_CENTER,storey:BUILDING.storey,floors,destinations}));
 console.log('Public baseline: 43 apartments; original unit-4 kitchen and standard garden; owner geometry excluded.');
 return {root,floors,destinations};
}
