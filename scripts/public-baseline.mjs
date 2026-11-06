import {isSectionWall} from '../public-view/section-height.mjs';
import {APP_REVISION,BASELINE_REVISION} from '../public-view/revision.mjs';
import {buildGardenTerraces} from '../src/garden-terraces-scene.js';
import {addRoomCornerOcclusion} from '../src/room-corner-occlusion.mjs';
// Build-time only: publish approved baseline geometry, never owner modules/data.
import * as THREE from 'three';
import {compactRenderAttributes} from '../public-view/compact-attributes.mjs';
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
import {extractFloorMap} from '../public-view/floor-map-geometry.mjs';
import {createPublicRoomMaps} from './public-room-map.mjs';
import {serviceFloorHeight,SERVICE_DOOR_IDS} from '../src/service-access.mjs';
import {publicMasterBedAdjustment} from './public-master-bed.mjs';

export async function createPublicBaseline(directory){
 const resources=[],picks=[],root=new THREE.Group(),settings={...normalizeHomeSettings(),openDoors:[],openParts:[],closedBuildingDoors:[...SERVICE_DOOR_IDS],cutaway:false,furniture:true,apartmentFurnishing:false,showLighting:true,buildingLevel:9,tourDestination:'unit:1:0'};
 buildBuildingContext({group:root,resources,settings,mode:'walk',picks,interactiveDoors:true});
 // Identity placement of the SAME base-plan template used for the neighbours.
 const temp=new THREE.Group(),bases=buildGroundApartments({root:temp,resources,picks:[],settings,mode:'walk',interactiveDoors:true,units:[4]}),own=bases.get(4).clone(true);
 own.traverse(o=>{if(o.userData.doorId?.startsWith('ground:1:')){o.userData.doorId=o.userData.doorId.replace('ground:1:','ground:4:');if(o.userData.tourDoor){o.userData.tourDoor.id=o.userData.doorId;o.userData.tourMotionId='public:'+o.userData.doorId;}}});
 own.matrix.identity();own.name='public-base-apartment-4';own.userData={level:0,variantSlot:4};root.add(own);
 buildGardenTerraces({parent:root,resources,units:[4],variantSlot:4});
 // Replicate generic neighbour furnishing, never FURNITURE or owner layouts.
 const furniture=new THREE.Group();buildApartmentFurniture({parent:furniture,resources,level:0,base:0,settings});
 const t=groundTransform(1),[a,b,c,d]=t.matrix,inverse=new THREE.Matrix4().set(a,0,b,t.offset[0],0,1,0,0,c,0,d,t.offset[1],0,0,0,1).invert(),m=new THREE.Matrix4();
 const master=publicMasterBedAdjustment();
 for(const mesh of furniture.children){const indices=mesh.userData.placements.map((v,i)=>v.unit===1?i:-1).filter(i=>i>=0);if(!indices.length)continue;const clone=new THREE.InstancedMesh(mesh.geometry,mesh.material,indices.length);indices.forEach((i,j)=>{mesh.getMatrixAt(i,m);m.premultiply(inverse);if(mesh.userData.placements[i].id===master.id)m.premultiply(master.delta);clone.setMatrixAt(j,m);});clone.userData={level:0,variantSlot:4,part:mesh.userData.part,...(mesh.userData.furnitureAsset?{furnitureAsset:mesh.userData.furnitureAsset}:{}),...(mesh.userData.visualOnly?{visualOnly:true}:{})};clone.castShadow=mesh.castShadow;clone.receiveShadow=mesh.receiveShadow;root.add(clone);}
 // Development is rendered once for the whole district. Remove the old
 // unrotated site surfaces and partial fences before sanitising the building.
 // Entrance doors, lintels and service-room geometry remain in the building.
 const siteParts=new Set(['building-garden-ground','building-garden-fence','building-site-base','site-drive-lane','site-sidewalk','site-parking-bay','site-parking-number','site-raised-curb','site-illustrative-cars','site-car-glass','site-car-tyres','site-illustrative-planting','site-main-meter-cabinet']);
 const obsolete=[];root.traverse(o=>{if(siteParts.has(o.userData.part))obsolete.push(o);});obsolete.forEach(o=>o.removeFromParent());
 refinePublicFacade(root,resources);
 const roomMaps=createPublicRoomMaps();
 for(const floor of BUILDING_FLOORS){const rooms=roomMaps.get(floor.level)||[];if(floor.level===0){for(const unit of floor.units){const ao=addRoomCornerOcclusion(root,rooms.filter(r=>r.unit===unit.number),resources,{level:0,height:2.75});if(ao&&unit.number===4)ao.userData.variantSlot=4;}}else addRoomCornerOcclusion(root,rooms,resources,{level:floor.level,base:floor.elevation,height:BUILDING.storey});}
 // Export the actual wall openings and furnishing footprints as compact 2D
 // data. No plan images, inspection notes or owner layouts enter the public map.
 const maps=new Map(BUILDING_FLOORS.map(f=>[f.level,extractFloorMap(root,{elevation:f.elevation})]));
 // Strict metadata allowlist, no inspection descriptions, product IDs or sources.
 function clean(o,inherited=0,doorId=null,sectionWall=false){
  sectionWall=sectionWall||isSectionWall(o);
  const data=o.userData,f=data.level??data.buildingFloor??inherited,part=data.part||o.name||'',ceiling=/ceiling/.test(part)||(o.geometry?.type==='ShapeGeometry'&&Math.abs(o.position.y-2.75)<.01),roof=/roof|lift-stair-head/.test(part),exterior=f===0||f===9||ceiling||roof||/building-(facade|window|glazing|rail|laundry|balcony|stone-sill|floor-slab|unit-finish|fascia)|public-curtain/.test(part),motion=data.tourDoor;
  const id=motion?.id||(data.action==='district-door'?data.doorId:doorId);
  o.userData={level:f,ceiling,roof,exterior,...(sectionWall?{sectionWall:true}:{}),...(data.mirrorSurface?{mirrorSurface:true}:{}),...(data.furnitureAsset?{furnitureAsset:data.furnitureAsset}:{}),...(o.geometry?.userData.softFurnishing?{furnitureMesh:o.geometry.userData.softFurnishing}:{}),...(data.tourNonPhysical?{tourNonPhysical:true}:{}),...(data.visualOnly?{visualOnly:true}:{}),...(data.variantSlot===4?{variantSlot:4}:{}),...(id?{action:'district-door',doorId:id}:{}),...(/^elevator-(call|controls|ride)$/.test(data.action)?{action:data.action,elevatorId:data.elevatorId,...(Number.isInteger(data.landing)?{landing:data.landing}:{}),...(Number.isInteger(data.target)?{target:data.target}:{})}:{}),...(motion?{tourMotionId:'public:'+motion.id,tourDoor:{id:motion.id,axis:motion.axis,property:motion.property,closed:motion.closed,open:motion.open,defaultOpen:motion.defaultOpen,kind:motion.kind}}:{})};
  o.name='';for(const child of o.children)clean(child,f,id,sectionWall);
 }
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
    compactRenderAttributes(g);
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
 const seen=new Set(),textureCache=new Map();root.traverse(o=>{if(o.geometry)o.geometry.userData={};for(const mat of [o.material].flat().filter(Boolean)){if(seen.has(mat))continue;seen.add(mat);mat.userData={...(mat.userData.architecturalGlass?{architecturalGlass:true}:{}),...(mat.userData.architecturalInterior?{architecturalInterior:true}:{}),...(mat.userData.floorCourses?{floorCourses:{...mat.userData.floorCourses}}:{}),...(mat.userData.wallCavity?{wallCavity:{...mat.userData.wallCavity}}:{}),...(mat.userData.metricInstancedUVs?{metricInstancedUVs:true}:{}),...(['limestone','cement','porcelain','plaster','paint','door','wood','fabric','ceramic','stone'].includes(mat.userData.surfaceKind)?{surfaceKind:mat.userData.surfaceKind}:{}),...(["stone","floor","render"].includes(mat.userData.publicFinish)?{publicFinish:mat.userData.publicFinish}:{})};mat.name='';for(const [key,value] of Object.entries(mat))if(value?.isTexture&&!value.image?.data)mat[key]=null;for(const key of ['map','bumpMap','roughnessMap','normalMap']){const tex=mat[key];if(tex){
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
 const floors=BUILDING_FLOORS.map(f=>({level:f.level,elevation:f.elevation,label:f.he,elevators:BUILDING_INTERIORS.floors[f.level].lifts.map(l=>({id:l.id,position:[l.doorCenter[0]+.95,l.doorCenter[1]]})),map:{...maps.get(f.level),rooms:roomMaps.get(f.level)},units:f.units.map(u=>({number:u.number,polygon:u.polygon,displayPolygons:display.get(f.level).get(u.number),displayTriangles:displayTriangles(display.get(f.level).get(u.number))})),core:f.core}));
 const destinations=[];
 for(const f of BUILDING_FLOORS)for(const u of f.units){const duplex=duplexForUnit(u.number,f.level);if(duplex&&f.level!==duplex.entryFloor)continue;const source=BUILDING_INTERIORS.floors[f.level],entry=source.entries.find(e=>e.unit===u.number),door=source.doors.find(d=>d.id===entry?.doorId);let position,yaw=0;if(u.number===4){position=[6.1,2.8];yaw=Math.PI;}else if(door){const normal=door.opened.map((n,i)=>(n-door.hinge[i])/(Math.hypot(...door.opened.map((x,k)=>x-door.hinge[k]))||1));position=door.hinge.map((n,i)=>(n+door.closed[i])/2+normal[i]*.85);yaw=Math.atan2(-normal[0],-normal[1]);}else{position=[...u.polygon[0]];}destinations.push({id:`unit:${u.number}:${f.level}`,label:`דירה ${u.number}`,floor:f.level,unit:u.number,position,yaw,polygon:u.polygon});}
 for(const c of COMMON_SPACES)destinations.push({id:c.id,label:c.he||c.nameHe||c.id,floor:0,position:c.walk,elevation:serviceFloorHeight(c.walk,0)??0,yaw:c.yaw||0,polygon:c.polygon});
 const assets={'building.json':JSON.stringify(root.toJSON()),'site.json':JSON.stringify(publicSiteData()),'navigation.json':JSON.stringify({revision:BASELINE_REVISION,center:BUILDING_CENTER,storey:BUILDING.storey,floors,destinations})};
 await mkdir(directory,{recursive:true});for(const [name,body] of Object.entries(assets))await writeFile(directory+'/'+name,body);
 await writeFile(directory+'/loading.json',JSON.stringify({revision:APP_REVISION,bytes:Object.fromEntries(Object.entries(assets).map(([name,body])=>[name,Buffer.byteLength(body)]))}));
 console.log('Public baseline: 43 unfurnished apartments; sanitary fixtures and standard gardens; resident furniture only.');
 return {root,floors,destinations};
}
