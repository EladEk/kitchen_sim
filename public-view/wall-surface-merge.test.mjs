import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {mergeWallSurfaces} from './wall-surface-merge.mjs';
function part(w,h,x,y,z){const geometry=new T.PlaneGeometry(w,h);return {geometry,matrix:new T.Matrix4().makeTranslation(x,y,z)};}
function area(geometry){const p=geometry.attributes.position,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();let sum=0;for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);sum+=b.sub(a).cross(c.sub(a)).length()/2;}return sum;}
test('overlapping core faces and twelve-millimetre stone skins render once at the outer surface',()=>{
 const parts=[part(4,3,0,1.5,0),part(2,3,1,1.5,.0005),part(4,3,0,1.5,.012)],original=parts.map(p=>Array.from(p.geometry.attributes.position.array)),merged=mergeWallSurfaces(parts);
 try{assert(Math.abs(area(merged)-12)<1e-5);assert.equal(merged.userData.surfaceConsolidation.outputRectangles,1);assert(merged.userData.surfaceConsolidation.removedArea>17);for(let i=0;i<merged.attributes.position.count;i++)assert(Math.abs(merged.attributes.position.getZ(i)-.012)<1e-6);assert.deepEqual(parts.map(p=>Array.from(p.geometry.attributes.position.array)),original);}finally{merged.dispose();parts.forEach(p=>p.geometry.dispose());}
});
test('render consolidation retains a real doorway, its lintel and reflected winding',()=>{
 for(const mirror of [false,true]){const parts=[part(1,2,-1.5,1,0),part(1,2,1.5,1,0),part(4,1,0,2.5,0),part(1,2,-1.5,1,.012)];if(mirror)for(const p of parts)p.matrix.premultiply(new T.Matrix4().makeScale(-1,1,1));const g=mergeWallSurfaces(parts),m=new T.MeshBasicMaterial(),mesh=new T.Mesh(g,m);mesh.updateMatrixWorld(true);
  try{assert(Math.abs(area(g)-8)<1e-5);assert.equal(new T.Raycaster(new T.Vector3(0,1,2),new T.Vector3(0,0,-1)).intersectObject(mesh).length,0);for(const [x,y]of [[-1.5,1],[1.5,1],[0,2.5]])assert(new T.Raycaster(new T.Vector3(x,y,2),new T.Vector3(0,0,-1)).intersectObject(mesh).length>0);}finally{g.dispose();m.dispose();parts.forEach(p=>p.geometry.dispose());}}
});
test('nonrectangular and horizontal faces retain their geometry instead of acquiring filled bounding boxes',()=>{
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,2,0,0,0,2,0],3));g.computeVertexNormals();const merged=mergeWallSurfaces([{geometry:g,matrix:new T.Matrix4()}]);try{assert.equal(merged.userData.surfaceConsolidation.inputRectangles,0);assert.equal(area(merged),2);assert.equal(merged.attributes.position.count,3);}finally{g.dispose();merged.dispose();}
});
