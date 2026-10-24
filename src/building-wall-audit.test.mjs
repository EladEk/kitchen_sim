import test from 'node:test';
import assert from 'node:assert/strict';
import {auditBuildingWalls} from '../qa/audit-building-walls.mjs';
import {connectedWallRuns,wallFootprint,doorWallOpening,polygonContains} from './building-geometry.mjs';
import {BUILDING_INTERIORS} from './building-interiors.mjs';
const contains=(b,[x,z])=>x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ;
test('solid L corners include the outside quarter, rather than only the centre-line crossing',()=>{
 const source={walls:[{a:[0,0],b:[.85,0],width:.3},{a:[1,-1],b:[1,-.3],width:.3}],doors:[],entries:[],lifts:[]},runs=connectedWallRuns(source,{envelope:[]});
 for(const p of [[1.12,.12],[.88,.12],[1.12,-.12]])assert(runs.some(w=>contains(wallFootprint(w),p)),`solid corner ${p}`);
 assert.deepEqual(source.walls[0].b,[.85,0],'the surveyed source never moves');
});
test('an inline gap needs a continuous PDF face and stays open when it is a documented doorway',()=>{
 const walls=[{a:[0,0],b:[1,0],width:.2},{a:[1.1,0],b:[2,0],width:.2}],floor={envelope:[]},source={walls,doors:[],entries:[],lifts:[],wallFaces:[[1,-.1,0,2],[1,.1,0,2]]};
 assert(connectedWallRuns(source,floor).some(w=>contains(wallFootprint(w),[1.05,0])));
 assert(!connectedWallRuns({...source,wallFaces:[]},floor).some(w=>contains(wallFootprint(w),[1.05,0])));
 assert(!connectedWallRuns({...source,doors:[{id:'opening',hinge:[1,0],closed:[1.1,0]}]},floor).some(w=>contains(wallFootprint(w),[1.05,0])));
});
test('callout digits in every source sheet stay annotations and stepped doorway lintels use actual PDF jamb faces',()=>{
 for(const source of BUILDING_INTERIORS.floors){for(const w of source.walls){const midpoint=w.a.map((n,i)=>(n+w.b[i])/2);assert(!(source.annotationFrames||[]).some(poly=>polygonContains(midpoint,poly)));}for(const d of source.doors)assert.notEqual(doorWallOpening(source,d).basis,'door-fallback',d.id);}
 const source=BUILDING_INTERIORS.floors[5],door=source.doors.find(d=>d.id==='bd-5-2'),opening=doorWallOpening(source,door);assert.equal(opening.basis,'pdf-jamb-caps');assert(Math.abs(opening.width-.09948)<.0001);assert(opening.a[0]<door.hinge[0]-.04,'the hinge lies on the face, not the wall centre');
});
test('every wall on all nine floors, all four ground profiles, every opening and all roof corners pass the source-to-mesh audit',()=>{
 const r=auditBuildingWalls();assert.equal(r.summary.floors,9);assert.equal(r.summary.sourceWalls,3501);assert.equal(r.summary.groundProfileWalls,128);assert(r.summary.wallSamples>88000);assert(r.summary.sourceCornerSamples>3200);assert(r.summary.doorSamples>1800);assert(r.summary.lintelSamples>3000);assert.equal(r.summary.roofCornerSamples,96);assert.deepEqual(r.failures,[]);
});
