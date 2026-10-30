import * as THREE from 'three';
import {MeshBVH, CENTER} from 'three-mesh-bvh';
import {inVariantSlot,hasVariantSlot} from './model-variants.mjs';
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
 const inverseRoot = root.matrixWorld.clone().invert(), sources = [], counts = [];
 let count = 0;
 (visibleOnly?root.traverseVisible:root.traverse).call(root,object => {
  if (!object.isMesh || !object.geometry?.attributes.position || !include(object)) return;
  if (![object.material].flat().some(m => m && m.visible !== false && m.opacity !== 0)) return;
  const n = object.isInstancedMesh ? object.count : 1;
  if (n) { sources.push(object); counts.push(n); count += n; }
 });
 let matrices = new Float32Array(count * 16), boxes = new Float32Array(count * 6);
 let sourceIds = new Uint32Array(count), visited = new Uint32Array(count), stamp = 0;
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
 const hits = [], normal = new THREE.Matrix3(), faceNormal = new THREE.Vector3(), endpoint = new THREE.Vector3();
 const stats = {records: count, cells: grid.size, bufferBytes: matrices.byteLength + boxes.byteLength + sourceIds.byteLength + visited.byteLength + overflow.byteLength + cellBytes, queries: 0, candidates: 0, narrowTests: 0};
 return {
  bounds: envelope, stats,
  firstHit(raycaster, {floor = false, any = false} = {}) {
   if (disposed || !proxy || !Number.isFinite(raycaster.far)) return null;
   stats.queries++; stats.candidates = stats.narrowTests = 0;
   if (++stamp >= 0xffffffff) { visited.fill(0); stamp = 1; }
   let closest = null;
   const test = id => {
    if (visited[id] === stamp) return false; visited[id] = stamp; stats.candidates++;
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
     if (!closest || hit.distance < closest.distance) { hit.object = source; closest = hit; }
    }
    return any && !!closest;
   };
   endpoint.copy(raycaster.ray.direction).multiplyScalar(raycaster.far).add(raycaster.ray.origin);
   const origin = raycaster.ray.origin;
   const x0 = Math.max(min[0], Math.floor((Math.min(origin.x, endpoint.x) - EPS) / CELL)), x1 = Math.min(max[0], Math.floor((Math.max(origin.x, endpoint.x) + EPS) / CELL));
   const y0 = Math.max(min[1], Math.floor((Math.min(origin.y, endpoint.y) - EPS) / CELL)), y1 = Math.min(max[1], Math.floor((Math.max(origin.y, endpoint.y) + EPS) / CELL));
   const z0 = Math.max(min[2], Math.floor((Math.min(origin.z, endpoint.z) - EPS) / CELL)), z1 = Math.min(max[2], Math.floor((Math.max(origin.z, endpoint.z) + EPS) / CELL));
   outer: for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const ids = grid.get(cellKey(x, y, z)); if (!ids) continue;
    for (const id of ids) if (test(id)) break outer;
   }
   if (!any || !closest) for (const id of overflow) if (test(id)) break;
   hits.length = 0;
   return closest;
  },
  dispose() {
   if (disposed) return; disposed = true;
   sources.length = counts.length = hits.length = global.length = 0; grid.clear();
   matrices = boxes = sourceIds = visited = overflow = null; stats.bufferBytes = 0;
   if (proxy) proxy.geometry = proxy.material = null;
  }
 };
}

// Moving between buildings transforms the query into ONE canonical building
// index. The eight buildings do not own eight collision models or BVHs.
export function createWalkingWorld({model, site, buildings = DISTRICT, variants = new Map()}) {
 const partitioned=variants.size>0&&hasVariantSlot(model)&&[...variants.values()].every(hasVariantSlot);
 const trees = new Map(), building = createSpatialCollisionIndex(model, {trees,include:partitioned?o=>!inVariantSlot(o):()=>true});
 const standardSlot=partitioned?createSpatialCollisionIndex(model,{trees,include:inVariantSlot}):null;
 const outside = createSpatialCollisionIndex(site, {trees, include: object => {
  const p = object.userData;
  if (p.propType) return p.detailTier === 2 && ['body', 'branches'].includes(p.propPart);
  return ![object.material].flat().some(m => m?.polygonOffset || m?.transparent && m.opacity < .5);
 }});
 const variantIndexes=new Map();
 const include=o=>(!partitioned||inVariantSlot(o))&&!o.userData.tourNonPhysical&&!o.userData.securityOverlay&&!o.userData.sceneUi&&!o.userData.vrHelper;
 for(const [id,source] of variants)variantIndexes.set(id,createSpatialCollisionIndex(source,{trees,include,visibleOnly:false}));
 const copies = buildings.map(b => {
  const matrix = buildingTransform(b), index=variantIndexes.get(b.id)||(partitioned?standardSlot:building), box = (partitioned?building.bounds.clone().union(index.bounds):index.bounds.clone()).applyMatrix4(matrix);
  return {id:b.id,index,matrix, inverse: matrix.clone().invert(), bounds: [...box.min.toArray(), ...box.max.toArray()]};
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
    if (hit && (!closest || hit.distance < closest.distance)) { hit.point.applyMatrix4(copy.matrix); closest = hit; }
    if (options.any && closest) break;
   }
   return closest;
  },
  refreshVariant(id){if(disposed||!variants.has(id))return false;const previous=variantIndexes.get(id);previous?.dispose();const index=createSpatialCollisionIndex(variants.get(id),{trees,include,visibleOnly:false});variantIndexes.set(id,index);const copy=copies.find(c=>c.id===id);if(copy){copy.index=index;const box=(partitioned?building.bounds.clone().union(index.bounds):index.bounds.clone()).applyMatrix4(copy.matrix);copy.bounds=[...box.min.toArray(),...box.max.toArray()];}return true;},
  get memory() { return {indexBytes: building.stats.bufferBytes + outside.stats.bufferBytes + (standardSlot?.stats.bufferBytes||0) + [...variantIndexes.values()].reduce((n,index)=>n+index.stats.bufferBytes,0), sharedBVHs: trees.size}; },
  dispose() { if (disposed) return; disposed = true; building.dispose(); outside.dispose();standardSlot?.dispose(); for(const index of variantIndexes.values())index.dispose();variantIndexes.clear();copies.length = 0; trees.clear(); }
 };
}
