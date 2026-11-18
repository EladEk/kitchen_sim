import * as THREE from 'three';
import {MeshBVH, CENTER} from 'three-mesh-bvh';
import {inVariantSlot,hasVariantSlot} from './model-variants.mjs';
import {publicDoorAncestor} from './district-doors.mjs';
import {DISTRICT, buildingTransform} from './district.mjs';

const CELL = 3, EPS = .0001;

// Test a finite ray segment, including rays which start inside the bounds.
function overlapsRay(ray, far, bounds, offset = 0) {
 let near = 0, end = far;
 for (let axis = 0; axis < 3; axis++) {
  const key = axis === 0 ? 'x' : axis === 1 ? 'y' : 'z';
  const origin = ray.origin[key], direction = ray.direction[key];
  const low = bounds[offset + axis] - EPS, high = bounds[offset + axis + 3] + EPS;
  if (Math.abs(direction) < 1e-12) { if (origin < low || origin > high) return false; }
  else {
   let a = (low - origin) / direction, b = (high - origin) / direction;
   if (a > b) { const swap = a; a = b; b = swap; }
   near = Math.max(near, a); end = Math.min(end, b);
   if (near > end) return false;
  }
 }
 return true;
}

/** One static collision index, sharing render attributes. Instance transforms
 * and bounds are packed buffers; no cloned geometry or mesh per instance. */
export function createSpatialCollisionIndex(root, {trees = new Map(), include = () => true, visibleOnly = true} = {}) {
 root.updateWorldMatrix(true, true);
 const inverseRoot = root.matrixWorld.clone().invert(), sources = [], counts = [], starts = [];
 let count = 0;
 (visibleOnly?root.traverseVisible:root.traverse).call(root,object => {
  if (!object.isMesh || !object.geometry?.attributes.position || object.userData.tourNonPhysical || !include(object)) return;
  if (![object.material].flat().some(m => m && m.visible !== false && m.opacity !== 0)) return;
  const n = object.isInstancedMesh ? object.count : 1;
  if (n) { sources.push(object); counts.push(n); starts.push(count); count += n; }
 });
 let matrices = new Float32Array(count * 16), boxes = new Float32Array(count * 6);
 let sourceIds = new Uint32Array(count), seenStamp = new Int32Array(count), stamp = 0;
 const matrix = new THREE.Matrix4(), instance = new THREE.Matrix4(), box = new THREE.Box3();
 const envelope = new THREE.Box3(), grid = new Map(), global = [];
 let at = 0;
 for (let s = 0; s < sources.length; s++) {
  const object = sources[s], geometry = object.geometry;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  if (!trees.has(geometry)) {
   const triangles = (geometry.index?.count ?? geometry.attributes.position.count) / 3;
   trees.set(geometry, triangles > 64 ? new MeshBVH(geometry, {strategy: CENTER, indirect: true, targetLeafSize: 12}) : null);
  }
  const base = inverseRoot.clone().multiply(object.matrixWorld);
  for (let i = 0; i < counts[s]; i++, at++) {
   matrix.copy(base);
   if (object.isInstancedMesh) { object.getMatrixAt(i, instance); matrix.multiply(instance); }
   matrix.toArray(matrices, at * 16); sourceIds[at] = s;
   box.copy(geometry.boundingBox).applyMatrix4(matrix); envelope.union(box);
   boxes.set([box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z], at * 6);
  }
 }
 const min = envelope.isEmpty() ? [0, 0, 0] : envelope.min.toArray().map(v => Math.floor((v - EPS) / CELL));
 const max = envelope.isEmpty() ? [0, 0, 0] : envelope.max.toArray().map(v => Math.floor((v + EPS) / CELL));
 const nx = max[0] - min[0] + 1, ny = max[1] - min[1] + 1;
 const cellKey = (x, y, z) => x - min[0] + nx * (y - min[1] + ny * (z - min[2]));
 for (let i = 0; i < count; i++) {
  const b = i * 6, x0 = Math.floor((boxes[b] - EPS) / CELL), x1 = Math.floor((boxes[b + 3] + EPS) / CELL);
  const y0 = Math.floor((boxes[b + 1] - EPS) / CELL), y1 = Math.floor((boxes[b + 4] + EPS) / CELL);
  const z0 = Math.floor((boxes[b + 2] - EPS) / CELL), z1 = Math.floor((boxes[b + 5] + EPS) / CELL);
  // Broad slabs belong in one short overflow list, not hundreds of cells.
  if ((x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1) > 128) { global.push(i); continue; }
  for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
   const key = cellKey(x, y, z); if (!grid.has(key)) grid.set(key, []); grid.get(key).push(i);
  }
 }
 let cellBytes = 0;
 for (const [key, values] of grid) { const ids = new Uint32Array(values); grid.set(key, ids); cellBytes += ids.byteLength; }
 let overflow = new Uint32Array(global), disposed = false;
 const proxy = sources.length ? new THREE.Mesh(sources[0].geometry, sources[0].material) : null;
 const hits = [], normal = new THREE.Matrix3(), faceNormal = new THREE.Vector3();
 const stats = {records: count, cells: grid.size, bufferBytes: matrices.byteLength + boxes.byteLength + sourceIds.byteLength + seenStamp.byteLength + overflow.byteLength + cellBytes, queries: 0, candidates: 0, narrowTests: 0, visitedCells: 0, ddaLimit: 0};
 return {
  bounds: envelope, stats,
  firstHit(raycaster, {floor = false, any = false} = {}) {
   if (disposed || !proxy || !Number.isFinite(raycaster.far)) return null;
   stats.queries++; stats.candidates = stats.narrowTests = stats.visitedCells = 0;
   if (++stamp >= 0x7fffffff) { seenStamp.fill(0); stamp = 1; }
   let closest = null;
   const test = id => {
    if (seenStamp[id] === stamp) return false; seenStamp[id] = stamp; stats.candidates++;
    if (!overlapsRay(raycaster.ray, closest?.distance ?? raycaster.far, boxes, id * 6)) return false;
    stats.narrowTests++;
    const source = sources[sourceIds[id]];
    proxy.geometry = source.geometry; proxy.material = source.material; proxy.matrixWorld.fromArray(matrices, id * 16);
    hits.length = 0;
    const tree = trees.get(proxy.geometry);
    if (tree) tree.raycastObject3D(proxy, raycaster, hits); else proxy.raycast(raycaster, hits);
    if (floor) normal.getNormalMatrix(proxy.matrixWorld);
    for (const hit of hits) {
     if (floor && (!hit.face || Math.abs(faceNormal.copy(hit.face.normal).applyNormalMatrix(normal).y) <= .65)) continue;
     if (!closest || hit.distance < closest.distance) { hit.object = source;if(source.isInstancedMesh)hit.instanceId=id-starts[sourceIds[id]]; closest = hit; }
    }
    return any && !!closest;
   };
   const {origin,direction}=raycaster.ray;
   if(!Number.isFinite(origin.x+origin.y+origin.z+direction.x+direction.y+direction.z)||direction.lengthSq()<1e-20)return null;
   let entry=Math.max(0,raycaster.near),exit=raycaster.far;
   for(let axis=0;axis<3;axis++){
    const key=axis===0?'x':axis===1?'y':'z',o=origin[key],d=direction[key],low=min[axis]*CELL,high=(max[axis]+1)*CELL;
    if(Math.abs(d)<1e-12){if(o<low||o>high)return null;}
    else{let a=(low-o)/d,b=(high-o)/d;if(a>b){const t=a;a=b;b=t;}entry=Math.max(entry,a);exit=Math.min(exit,b);if(entry>exit)return null;}
   }
   // Large spanning slabs are tested once, before grid traversal so their hit
   // distance can bound all later work. Integer stamps deduplicate candidates.
   for(const id of overflow)if(test(id)){hits.length=0;return closest;}
   let ix=Math.max(min[0],Math.min(max[0],Math.floor((origin.x+direction.x*entry)/CELL))),
       iy=Math.max(min[1],Math.min(max[1],Math.floor((origin.y+direction.y*entry)/CELL))),
       iz=Math.max(min[2],Math.min(max[2],Math.floor((origin.z+direction.z*entry)/CELL)));
   const sx=Math.sign(direction.x),sy=Math.sign(direction.y),sz=Math.sign(direction.z),
         dx=sx?CELL/Math.abs(direction.x):Infinity,dy=sy?CELL/Math.abs(direction.y):Infinity,dz=sz?CELL/Math.abs(direction.z):Infinity;
   let tx=sx?((ix+(sx>0?1:0))*CELL-origin.x)/direction.x:Infinity,
       ty=sy?((iy+(sy>0?1:0))*CELL-origin.y)/direction.y:Infinity,
       tz=sz?((iz+(sz>0?1:0))*CELL-origin.z)/direction.z:Infinity,steps=0;
   for(;steps<256;steps++){
    stats.visitedCells++;
    const bucket=grid.get(cellKey(ix,iy,iz));if(bucket)for(const id of bucket)if(test(id)){hits.length=0;return closest;}
    const next=Math.min(tx,ty,tz);
    if(next>exit||closest&&next>closest.distance)break;
    // Advance every tied axis: objects on boundaries occupy adjacent cells
    // with EPS padding, so edge/corner crossings cannot skip a surface.
    if(tx<=next+1e-10){ix+=sx;tx+=dx;}if(ty<=next+1e-10){iy+=sy;ty+=dy;}if(tz<=next+1e-10){iz+=sz;tz+=dz;}
    if(ix<min[0]||ix>max[0]||iy<min[1]||iy>max[1]||iz<min[2]||iz>max[2])break;
   }
   // Extremely long rays use a bounded linear safety fallback, never silently
   // miss collisions beyond the DDA guard. Normal walking uses a few cells.
   if(steps===256){stats.ddaLimit++;for(let id=0;id<count;id++)if(test(id))break;}
   hits.length = 0;
   return closest;
  },
  dispose() {
   if (disposed) return; disposed = true;
   sources.length = counts.length = starts.length = hits.length = global.length = 0; grid.clear();
   matrices = boxes = sourceIds = seenStamp = overflow = null; stats.bufferBytes = 0;
   if (proxy) proxy.geometry = proxy.material = null;
  }
 };
}

// Moving between buildings transforms the query into ONE canonical building
// index. The eight buildings do not own eight collision models or BVHs.
export function createWalkingWorld({model, site, buildings = DISTRICT, variants = new Map()}) {
 const partitioned=variants.size>0&&hasVariantSlot(model)&&[...variants.values()].every(hasVariantSlot);
 const staticObject=o=>!o.userData.tourNonPhysical&&o.userData.part!=='furniture-contact-shadow'&&!o.userData.visualOnly&&!publicDoorAncestor(o);
 const trees = new Map(), building = createSpatialCollisionIndex(model, {trees,include:o=>staticObject(o)&&(!partitioned||!inVariantSlot(o))});
 const standardSlot=partitioned?createSpatialCollisionIndex(model,{trees,include:o=>staticObject(o)&&inVariantSlot(o)}):null;
 const doorInclude=o=>!!publicDoorAncestor(o),defaultDoors=createSpatialCollisionIndex(model,{trees,include:doorInclude,visibleOnly:false}),doorIndexes=new Map();
 const outside = createSpatialCollisionIndex(site, {trees, include: object => {
  const p = object.userData;
  if(p.tourNonPhysical)return false;
  if (p.propType) return p.detailTier === 2 && ['body', 'branches'].includes(p.propPart);
  return ![object.material].flat().some(m => m?.polygonOffset || m?.transparent && m.opacity < .5);
 }});
 const variantIndexes=new Map();
 const include=o=>staticObject(o)&&(!partitioned||inVariantSlot(o))&&!o.userData.tourNonPhysical&&!o.userData.securityOverlay&&!o.userData.sceneUi&&!o.userData.vrHelper;
 for(const [id,source] of variants)variantIndexes.set(id,createSpatialCollisionIndex(source,{trees,include,visibleOnly:false}));
 for(const [id,source] of variants)doorIndexes.set(id,createSpatialCollisionIndex(source,{trees,include:doorInclude,visibleOnly:false}));
 const copies = buildings.map(b => {
  const matrix = buildingTransform(b), index=variantIndexes.get(b.id)||(partitioned?standardSlot:building),doors=doorIndexes.get(b.id)||defaultDoors,box=(partitioned?building.bounds.clone().union(index.bounds):index.bounds.clone()).union(doors.bounds).applyMatrix4(matrix);
  return {id:b.id,index,doors,matrix, inverse: matrix.clone().invert(), bounds: [...box.min.toArray(), ...box.max.toArray()]};
 });
 const local = new THREE.Raycaster(); local.firstHitOnly = true;
 let disposed = false;
 const stats = {queries: 0, buildingQueries: 0, narrowTests: 0, collisionCopies: 1+variantIndexes.size};
 return {
  stats, building, outside,
  firstHit(raycaster, options = {}) {
   if (disposed) return null;
   stats.queries++; stats.buildingQueries = stats.narrowTests = 0;
   local.ray.copy(raycaster.ray); local.near = raycaster.near; local.far = raycaster.far;
   let closest = outside.firstHit(local, options); stats.narrowTests += outside.stats.narrowTests;
   if (options.any && closest) return closest;
   for (const copy of copies) {
    if (!overlapsRay(raycaster.ray, closest?.distance ?? raycaster.far, copy.bounds)) continue;
    stats.buildingQueries++;
    local.ray.copy(raycaster.ray).applyMatrix4(copy.inverse); local.far = closest?.distance ?? raycaster.far;
    let hit=partitioned?building.firstHit(local,options):null;if(partitioned)stats.narrowTests+=building.stats.narrowTests;
    if(!(options.any&&hit)){local.far=hit?.distance??local.far;const variantHit=copy.index.firstHit(local,options);stats.narrowTests+=copy.index.stats.narrowTests;if(variantHit&&(!hit||variantHit.distance<hit.distance))hit=variantHit;}
    if(!(options.any&&hit)){local.far=hit?.distance??local.far;const doorHit=copy.doors.firstHit(local,options);stats.narrowTests+=copy.doors.stats.narrowTests;if(doorHit&&(!hit||doorHit.distance<hit.distance))hit=doorHit;}
    if (hit && (!closest || hit.distance < closest.distance)) { hit.point.applyMatrix4(copy.matrix);hit.buildingId=copy.id;closest = hit; }
    if (options.any && closest) break;
   }
   return closest;
  },
  refreshVariant(id){if(disposed||!variants.has(id))return false;const previous=variantIndexes.get(id);previous?.dispose();const index=createSpatialCollisionIndex(variants.get(id),{trees,include,visibleOnly:false});variantIndexes.set(id,index);const copy=copies.find(c=>c.id===id);if(copy){copy.index=index;const box=(partitioned?building.bounds.clone().union(index.bounds):index.bounds.clone()).union(copy.doors.bounds).applyMatrix4(copy.matrix);copy.bounds=[...box.min.toArray(),...box.max.toArray()];}return true;},
  refreshDoors(id,source=variants.get(id)||model){if(disposed)return false;const copy=copies.find(c=>c.id===id);if(!copy)return false;const next=createSpatialCollisionIndex(source,{trees,include:doorInclude,visibleOnly:false});doorIndexes.get(id)?.dispose();doorIndexes.set(id,next);copy.doors=next;const box=(partitioned?building.bounds.clone().union(copy.index.bounds):copy.index.bounds.clone()).union(next.bounds).applyMatrix4(copy.matrix);copy.bounds=[...box.min.toArray(),...box.max.toArray()];return true;},
  get memory() { return {indexBytes: building.stats.bufferBytes + outside.stats.bufferBytes + defaultDoors.stats.bufferBytes + (standardSlot?.stats.bufferBytes||0) + [...variantIndexes.values(),...doorIndexes.values()].reduce((n,index)=>n+index.stats.bufferBytes,0), sharedBVHs: trees.size,doorIndexes:1+doorIndexes.size}; },
  dispose() { if (disposed) return; disposed = true; building.dispose(); outside.dispose();standardSlot?.dispose();defaultDoors.dispose();for(const index of doorIndexes.values())index.dispose();doorIndexes.clear();for(const index of variantIndexes.values())index.dispose();variantIndexes.clear();copies.length = 0; trees.clear(); }
 };
}
