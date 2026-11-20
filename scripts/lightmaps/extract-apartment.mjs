// R188 baked-lightmap pilot, step 1: extract one apartment's interior surfaces
// (receivers) plus nearby occluders from the public baseline into a plain JSON
// mesh list for Blender. Keys are geometry-derived (bbox in model space, cm,
// plus vertex count) so the runtime can find the same meshes without uuids.
// usage: node scripts/lightmaps/extract-apartment.mjs <dist/client/baseline> <floor> <unit> <out.json>
import fs from 'node:fs';import path from 'node:path';import * as THREE from 'three';
import {meshKey,isLightmapReceiver,insidePolygon} from '../../public-view/baked-lightmap-core.mjs';
const [dir,floorArg,unitArg,out]=process.argv.slice(2);const floor=+floorArg,unit=+unitArg;
const json=JSON.parse(fs.readFileSync(path.join(dir,'building.json'))),nav=JSON.parse(fs.readFileSync(path.join(dir,'navigation.json')));
const f=nav.floors.find(f=>f.level===floor),u=f.units.find(u=>u.number===unit),polygon=u.polygon,elevation=f.elevation;
const geometries=new Map(new THREE.BufferGeometryLoader().parse?[]:[]);const loader=new THREE.BufferGeometryLoader();
for(const g of json.geometries)if(g.type==='BufferGeometry')geometries.set(g.uuid,loader.parse(g));
const materials=new Map(json.materials.map(m=>[m.uuid,m]));
const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]),box={minX:Math.min(...xs)-1.2,maxX:Math.max(...xs)+1.2,minZ:Math.min(...zs)-1.2,maxZ:Math.max(...zs)+1.2};
const meshes=[];let receivers=0;
function walk(o,parent,level){
 const m=new THREE.Matrix4().fromArray(o.matrix||new THREE.Matrix4().toArray()),world=parent.clone().multiply(m),ud=o.userData||{};level=ud.level??level;
 if(o.type==='Mesh'&&level===floor&&geometries.has(o.geometry)){
  const g=geometries.get(o.geometry),mat=materials.get(Array.isArray(o.material)?o.material[0]:o.material)||{},md=mat.userData||{};
  if(!g.boundingBox)g.computeBoundingBox();const b=g.boundingBox.clone().applyMatrix4(world),c=b.getCenter(new THREE.Vector3());
  const near=c.x>box.minX&&c.x<box.maxX&&c.z>box.minZ&&c.z<box.maxZ&&c.y>elevation-.5&&c.y<elevation+3.4;
  const overlay=!!ud.tourNonPhysical,glass=overlay||md.architecturalGlass||md.architecturalRole==='glass'||mat.transparent&&mat.opacity<.9,door=!!ud.doorId||!!ud.action;
  if(near&&!glass&&!door&&g.attributes.position.count<20000){
   const receiver=isLightmapReceiver({userData:ud,material:{userData:md}},b,polygon,elevation);if(receiver)receivers++;
   const p=g.attributes.position.clone().applyMatrix4(world),idx=g.index?Array.from(g.index.array):null;
   meshes.push({key:meshKey(b,g.attributes.position.count),receiver,role:md.architecturalRole||md.surfaceKind||'',colour:mat.color??16777215,positions:Array.from(p.array,v=>+v.toFixed(4)),index:idx,uv:g.attributes.uv?Array.from(g.attributes.uv.array,v=>+v.toFixed(5)):null});
  }
 }
 for(const ch of o.children||[])walk(ch,world,level);
}
walk(json.object,new THREE.Matrix4(),undefined);
fs.writeFileSync(out,JSON.stringify({floor,unit,elevation,polygon,meshes}));
console.log(JSON.stringify({meshes:meshes.length,receivers,keys:new Set(meshes.filter(m=>m.receiver).map(m=>m.key)).size}));
