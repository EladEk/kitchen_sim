// Independent source-to-mesh audit: every storey, every wall, every door.
// Run with `node qa/audit-building-walls.mjs [report.json]`.
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import * as THREE from 'three';
import {BUILDING,BUILDING_FLOORS,BUILDING_ROOF} from '../src/building-layout.mjs';
import {BUILDING_INTERIORS} from '../src/building-interiors.mjs';
import {connectedWallRuns,wallFootprint,doorWallOpening,sourceFaceCovers,wallPortals,polygonContains} from '../src/building-geometry.mjs';
import {buildBuildingContext} from '../src/building-scene.js';
import {normalizeHomeSettings,WALLS,CONSTRUCTION_WALLS,DOORS,WINDOWS} from '../src/home-model.mjs';
import {createHomeScene} from '../src/home-scene.js';
import {onDetailedGround,segmentDistance} from '../src/building-navigation.mjs';
import {COMMON_ENTRY_DOORS} from '../src/building-site.mjs';
import {groundPoint} from '../src/ground-apartments.mjs';

const contains=(b,p,eps=.0002)=>p[0]>=b.minX-eps&&p[0]<=b.maxX+eps&&p[1]>=b.minZ-eps&&p[1]<=b.maxZ+eps;
function meshBoxes(node,parts){
 const boxes=[],m=new THREE.Matrix4();node.updateMatrixWorld(true);
 node.traverse(o=>{if(!o.isMesh||!parts.includes(o.userData.part))return;
  o.geometry.computeBoundingBox();if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);m.premultiply(o.matrixWorld);boxes.push(o.geometry.boundingBox.clone().applyMatrix4(m));}}
  else boxes.push(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
 });return boxes;
}
const has=(boxes,[x,z],y)=>boxes.some(b=>x>=b.min.x-.0002&&x<=b.max.x+.0002&&z>=b.min.z-.0002&&z<=b.max.z+.0002&&y>=b.min.y-.0002&&y<=b.max.y+.0002);
const sampleWall=w=>{const v=Math.abs(w.a[0]-w.b[0])<.01;return [.04,.5,.96].flatMap(t=>[-.28,0,.28].map(n=>[w.a[0]+(w.b[0]-w.a[0])*t+(v?n*w.width:0),w.a[1]+(w.b[1]-w.a[1])*t+(v?0:n*w.width)]));};
const sourceProfile=(walls,doors,windows)=>({walls:walls.map(w=>({...w,width:w.thickness})),doors:doors.map(o=>{const w=walls.find(w=>w.id===o.wallId);return {...o,hinge:o.vertical?[w.a[0],o.start]:[o.start,w.a[1]],closed:o.vertical?[w.a[0],o.end]:[o.end,w.a[1]]};}),entries:[],lifts:[]});

export function auditBuildingWalls(){
 const failures=[],resources=[],root=new THREE.Group(),settings=normalizeHomeSettings({cutaway:false,buildingLevel:9,openDoors:DOORS.map(d=>d.id),furniture:false}),model=buildBuildingContext({group:root,resources,settings,mode:'walk'}),result={revision:50,source:BUILDING.source,sourceSha256:BUILDING_INTERIORS.sourceSha256,coverage:'all source wall runs, all floors 0–8, four ground profiles, source-supported outer corners and inline seams, door clear spans',floors:[],groundProfiles:[]};
 const addFailure=(kind,level,detail)=>failures.push({kind,level,...detail});
 try{
 for(const f of BUILDING_FLOORS){
  const s=BUILDING_INTERIORS.floors[f.level],runs=connectedWallRuns(s,f,f.level===0?COMMON_ENTRY_DOORS:[]),boxes=meshBoxes(model.floors.get(f.level),['building-interior-wall','building-facade-wall','ground-base-wall']),portals=wallPortals(s,f,f.level===0?COMMON_ENTRY_DOORS:[]),footprints=runs.map(wallFootprint),row={level:f.level,page:f.page,sourceWalls:s.walls.length,inlineConnectors:runs.filter(w=>w.joinedWalls).length,sourceCornerChecks:0,doorClearanceChecks:0,lintelChecks:0,wallSamples:0,walls:[],doors:[]};
  const replica=p=>f.level===0&&f.units.some(u=>u.number!==4&&(polygonContains(p,u.polygon)||u.polygon.some((a,i)=>segmentDistance(p,a,u.polygon[(i+1)%u.polygon.length])<.24)));
  for(let i=0;i<s.walls.length;i++){
   const original=s.walls[i],w=runs[i],mid=original.a.map((n,k)=>(n+original.b[k])/2),delegated=f.level===0&&(onDetailedGround(mid)||replica(mid)),record={id:`F${f.level}-W${i}`,sourceA:original.a,sourceB:original.b,width:original.width,renderA:w.a,renderB:w.b,capCompleted:!!w.cornerFaceCompleted,renderer:delegated?'detailed-ground-profile':'building-wall'};row.walls.push(record);
   if(delegated)continue;
   for(const p of sampleWall(original))for(const height of [.25,1.45,2.6]){row.wallSamples++;if(!has(boxes,p,f.elevation+height))addFailure('missing-rendered-wall',f.level,{wall:i,point:p,height});}
   if((s.annotationFrames||[]).some(poly=>polygonContains(mid,poly)))addFailure('annotation-became-wall',f.level,{wall:i,point:mid});
  }
  // Confirm the outside quarter of every source-supported L corner is filled,
  // rather than merely checking that its two centre lines intersect.
  for(let i=0;i<s.walls.length;i++)for(let j=i+1;j<s.walls.length;j++){
   let a=s.walls[i],b=s.walls[j];if(Math.abs(a.a[0]-a.b[0])<.01){[a,b]=[b,a];}
   if(Math.abs(a.a[1]-a.b[1])>.01||Math.abs(b.a[0]-b.b[0])>.01)continue;
   const q=[b.a[0],a.a[1]],ae=Math.abs(a.a[0]-q[0])<Math.abs(a.b[0]-q[0])?'a':'b',be=Math.abs(b.a[1]-q[1])<Math.abs(b.b[1]-q[1])?'a':'b',dx=Math.sign(a[ae][0]-a[ae==='a'?'b':'a'][0]),dz=Math.sign(b[be][1]-b[be==='a'?'b':'a'][1]),limit=(a.width+b.width)/2+.012;
   if(Math.abs(q[0]-a[ae][0])>limit||Math.abs(q[1]-b[be][1])>limit)continue;
   const x=q[0]+dx*b.width/2,z=q[1]+dz*a.width/2;
   if(!sourceFaceCovers(s,1,z,Math.min(a[ae][0],x),Math.max(a[ae][0],x))||!sourceFaceCovers(s,0,x,Math.min(b[be][1],z),Math.max(b[be][1],z)))continue;
   for(const tx of [.25,.75])for(const tz of [.25,.75]){const p=[q[0]+dx*b.width/2*tx,q[1]+dz*a.width/2*tz];if(portals.some(b=>contains(b,p)))continue;row.sourceCornerChecks++;if(!footprints.some(b=>contains(b,p)))addFailure('incomplete-source-corner',f.level,{walls:[i,j],point:p});}
  }
  for(const d of s.doors){const opening=doorWallOpening(s,d);row.doors.push({id:d.id,construction:opening});if(opening.basis==='door-fallback')addFailure('unsupported-door-lintel',f.level,{door:d.id});if(f.level===0&&(onDetailedGround(d.hinge)||replica(d.hinge)))continue;for(const t of [.15,.35,.5,.65,.85]){const p=d.hinge.map((n,k)=>n+(d.closed[k]-n)*t);row.doorClearanceChecks++;if(has(boxes,p,f.elevation+1.4))addFailure('wall-in-doorway',f.level,{door:d.id,point:p});}
   const vertical=Math.abs(opening.a[0]-opening.b[0])<.01;for(const t of [.06,.5,.94])for(const n of [-.35,0,.35]){const p=opening.a.map((v,k)=>v+(opening.b[k]-v)*t);p[vertical?0:1]+=n*opening.width;row.lintelChecks++;if(!has(boxes,p,f.elevation+2.7))addFailure('incomplete-door-lintel',f.level,{door:d.id,point:p});}
  }
  result.floors.push(row);
 }
 const home=createHomeScene(settings,{mode:'walk'});
 try{
  const own=meshBoxes(home.group,['architectural-wall']),profile=sourceProfile(WALLS,DOORS.filter(d=>!d.hostDoorId),WINDOWS);
  for(const unit of [1,2,3,4]){const boxes=unit===4?own:meshBoxes(model.floors.get(0).getObjectByName(`garden-apartment-${unit}-base`),['ground-base-wall']),row={unit,walls:CONSTRUCTION_WALLS.length,wallSamples:0,doorChecks:0};
   for(const w of CONSTRUCTION_WALLS){const v=Math.abs(w.a[0]-w.b[0])<.01;for(const p of sampleWall(w))for(const height of [.3,1.4,2.5]){const axis=p[v?1:0],opening=[...DOORS.filter(d=>!d.hostDoorId),...WINDOWS].some(o=>o.wallId===w.id&&axis>o.start-.001&&axis<o.end+.001&&height>(o.sill||0)&&height<(o.sill||0)+o.height);if(opening)continue;row.wallSamples++;const at=groundPoint(unit,p);if(!has(boxes,at,height))addFailure('missing-ground-wall',0,{unit,wall:w.id,point:at,height});}}
   for(const d of profile.doors)for(const t of [.2,.5,.8]){const p=groundPoint(unit,d.hinge.map((n,k)=>n+(d.closed[k]-n)*t));row.doorChecks++;if(has(boxes,p,1.4))addFailure('ground-wall-in-doorway',0,{unit,door:d.id,point:p});}
   result.groundProfiles.push(row);
  }
 }finally{home.dispose();}
 const roofBoxes=meshBoxes(model.floors.get(9),['building-roof-parapet','building-lift-stair-head']);result.roof={cornerSamples:0};
 for(const [poly,width,height] of [[BUILDING_ROOF.polygon,.16,.19],...BUILDING_ROOF.heads.map(poly=>[poly,.2,1.2])])for(const vertex of poly)for(const x of [-.7,.7])for(const z of [-.7,.7]){const p=[vertex[0]+x*width/2,vertex[1]+z*width/2];result.roof.cornerSamples++;if(!has(roofBoxes,p,BUILDING_ROOF.elevation+height))addFailure('incomplete-roof-corner',9,{point:p});}
 }finally{resources.forEach(r=>r.dispose?.());}
 result.summary={floors:result.floors.length,sourceWalls:result.floors.reduce((n,f)=>n+f.sourceWalls,0),groundProfileWalls:result.groundProfiles.reduce((n,f)=>n+f.walls,0),wallSamples:result.floors.reduce((n,f)=>n+f.wallSamples,0)+result.groundProfiles.reduce((n,f)=>n+f.wallSamples,0),sourceCornerSamples:result.floors.reduce((n,f)=>n+f.sourceCornerChecks,0),doorSamples:result.floors.reduce((n,f)=>n+f.doorClearanceChecks,0)+result.groundProfiles.reduce((n,f)=>n+f.doorChecks,0),lintelSamples:result.floors.reduce((n,f)=>n+f.lintelChecks,0),roofCornerSamples:result.roof.cornerSamples,failures:failures.length};result.failures=failures;return result;
}
if(process.argv[1]?.endsWith('audit-building-walls.mjs')){const result=auditBuildingWalls(),path=process.argv[2]||'tmp/wall-audit/report.json';await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.summary));if(result.failures.length){console.log(JSON.stringify(result.failures.slice(0,20),null,2));process.exitCode=1;}}
