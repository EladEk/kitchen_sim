import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as T from 'three';
import {restorePublicFinishes} from '../public-view/finishes.mjs';
import {createDistrict} from '../public-view/district.mjs';
import {createWalkingDisplay} from '../public-view/walking-display.mjs';

function inspect(root){
 const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh&&o.material?.userData.publicFinish==='stone'){geometries.add(o.geometry);materials.add(o.material);}});
 let inputs=0,outputs=0,removedArea=0,overlaps=0;
 for(const g of geometries){const s=g.userData.surfaceConsolidation;assert(s,'stone render geometry must be consolidated');inputs+=s.inputRectangles;outputs+=s.outputRectangles;removedArea+=s.removedArea;
  const p=g.attributes.position,n=g.attributes.normal,start=p.count-s.outputRectangles*6,rects=[];
  for(let i=start;i<p.count;i+=6){const nx=n.getX(i),nz=n.getZ(i),r={nx,nz,plane:nx*p.getX(i)+nz*p.getZ(i),u0:Infinity,u1:-Infinity,y0:Infinity,y1:-Infinity};for(let k=0;k<6;k++){const u=nz*p.getX(i+k)-nx*p.getZ(i+k),y=p.getY(i+k);r.u0=Math.min(r.u0,u);r.u1=Math.max(r.u1,u);r.y0=Math.min(r.y0,y);r.y1=Math.max(r.y1,y);}rects.push(r);}
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];if(Math.abs(a.nx-b.nx)+Math.abs(a.nz-b.nz)>1e-4||Math.abs(a.plane-b.plane)>.0159)continue;if(Math.min(a.u1,b.u1)-Math.max(a.u0,b.u0)>2e-5&&Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0)>2e-5)overlaps++;}
 }
 assert.equal(overlaps,0,'no overlapping rectangular stone layers in displayed geometry');
 const maps=new Set(),normals=new Set(),roughness=new Set();for(const m of materials){maps.add(m.map);normals.add(m.normalMap);roughness.add(m.roughnessMap);assert.equal(m.bumpMap,null);}
 assert.equal(maps.size,1);assert.equal(normals.size,1);assert.equal(roughness.size,1);assert.notEqual([...maps][0],[...normals][0]);assert(removedArea>10);
 return {inputRectangles:inputs,outputRectangles:outputs,removedSquareMetres:Math.round(removedArea*100)/100,overlappingStoneRectangles:overlaps,albedoTextures:maps.size,normalTextures:normals.size,roughnessTextures:roughness.size};
}
test('actual district and walking facades contain one layer per stone face and one shared texture per channel',async()=>{
 const model=await new T.ObjectLoader().parseAsync(JSON.parse(await readFile('dist/client/baseline/building.json','utf8'))),site=JSON.parse(await readFile('dist/client/baseline/site.json','utf8')),finish=restorePublicFinishes(model,{mobile:true}),district=createDistrict(model,site,{mobile:true}),walking=createWalkingDisplay(model),sourcePositions=new Map();model.traverse(o=>{if(o.geometry&&!sourcePositions.has(o.geometry))sourcePositions.set(o.geometry,o.geometry.attributes.position.array.slice());});
 try{const report={district:inspect(district.group),walking:inspect(walking.group)};for(const [g,positions]of sourcePositions)assert.deepEqual(g.attributes.position.array,positions,'collision source buffers stay intact');console.log(JSON.stringify(report));if(process.env.WRITE_SURFACE_REPORT)await writeFile(process.env.WRITE_SURFACE_REPORT,JSON.stringify(report,null,2)+'\n');}finally{district.dispose();walking.dispose();finish.dispose();}
});
