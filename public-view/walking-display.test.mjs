import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createWalkingDisplay,walkingInstanceCapacity} from './walking-display.mjs';
import {createSelectionController} from './selection-view.mjs';
import {buildingTransform,DISTRICT} from './district.mjs';
import {createSpatialCollisionIndex} from './walking-world.mjs';

test('zero-opacity service markers are absent from the display without changing their original source',()=>{
 const source=new T.Group(),geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial({transparent:true,opacity:0}),marker=new T.InstancedMesh(geometry,material,2);source.add(marker);const display=createWalkingDisplay(source);let meshes=0;display.group.traverse(o=>{if(o.isMesh)meshes++;});assert.equal(meshes,0);assert.equal(source.children[0],marker);assert(marker.visible);assert.equal(marker.count,2);display.dispose();marker.dispose();geometry.dispose();material.dispose();
});

test('walking batches keep exact transformed surfaces, material UVs, shadows and original collision identities',()=>{
 const source=new T.Group(),geometry=new T.BoxGeometry(1,2,.2),material=new T.MeshStandardMaterial(),objects=[];
 for(let i=0;i<6;i++){const mesh=new T.Mesh(geometry,material);mesh.position.set(1+i,1,-2);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={level:0,exterior:false};source.add(mesh);objects.push(mesh);}
 const collision=createSpatialCollisionIndex(source),display=createWalkingDisplay(source);display.update(0);let meshes=0,triangles=0;
 display.group.traverseVisible(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert.equal(o.material,material);assert(o.castShadow&&o.receiveShadow);assert(o.geometry.attributes.uv);assert(o.geometry.attributes.normal);});
 assert.equal(meshes,1);assert.equal(triangles,72);source.updateMatrixWorld(true);display.group.updateMatrixWorld(true);
 const ray=new T.Raycaster(new T.Vector3(2,1,0),new T.Vector3(0,0,-1),0,10),hit=collision.firstHit(ray),rendered=ray.intersectObject(display.group,true)[0];assert.equal(hit.object,objects[1]);assert(Math.abs(hit.distance-rendered.distance)<1e-5);
 const before=material.version;display.dispose();assert.equal(material.version,before);assert.equal(source.children.length,6);collision.dispose();geometry.dispose();material.dispose();
});

test('GLB primitives stay instanced, floor masks restore, and moved branches sync without rebuilding buffers',()=>{
 const source=new T.Group(),geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial(),furniture=new T.InstancedMesh(geometry,material,3),motion=new T.Group();
 furniture.userData={level:2,exterior:false,furnitureRender:'sofa'};for(let i=0;i<3;i++)furniture.setMatrixAt(i,new T.Matrix4().makeTranslation(i,7,0));source.add(furniture);
 motion.userData={level:0,exterior:false,tourMotionId:'cabinet'};motion.add(new T.Mesh(geometry,material));source.add(motion);const display=createWalkingDisplay(source);display.update(0);let copy;display.group.traverse(o=>{if(o.isInstancedMesh)copy=o;});assert.equal(copy.count,3);assert.equal(copy.geometry,geometry);assert.equal(copy.material,material);assert(!copy.parent.visible);display.update(2);assert(copy.parent.visible);display.update(0);motion.rotation.y=1;display.sync();const clone=display.group.children.find(o=>o.children[0]?.userData.tourMotionId==='cabinet');assert.equal(clone.children[0].rotation.y,1);assert.equal(copy.count,3);display.dispose();furniture.dispose();geometry.dispose();material.dispose();
});

test('entering walking from a focused section restores the complete source before building once',()=>{
 const root=new T.Group(),source=new T.Group(),geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial(),mesh=new T.Mesh(geometry,material);mesh.userData={level:0,exterior:false};source.add(mesh);
 const nav={storey:3,floors:[{level:0,units:[]}],destinations:[]},district={group:new T.Group(),setActiveBuilding(){}},controller=createSelectionController({root,model:source,nav,district});controller.update({building:'4102',level:0,target:''});assert(!source.visible);
 const position=new T.Vector3(1,1.62,1).applyMatrix4(buildingTransform(DISTRICT[0])),first=controller.update({building:'4102',level:9},{walking:true,position});assert(first.content.children.length>0);assert(!source.visible);assert(first.content.visible);const next=controller.update({building:'4102',level:9},{walking:true,position});assert.equal(next.content,first.content);controller.update({building:'4102',level:9});assert(source.visible);assert(!first.content.visible);controller.dispose();geometry.dispose();material.dispose();
});

test('small instanced cells share a buffer layout while keeping exact draw counts and independent matrices',()=>{assert.equal(walkingInstanceCapacity(1),32);assert.equal(walkingInstanceCapacity(24),32);assert.equal(walkingInstanceCapacity(33),64);const source=new T.Group(),g=new T.BoxGeometry(),m=new T.MeshStandardMaterial();for(const [x,count]of [[1,2],[18,3]]){const mesh=new T.InstancedMesh(g,m,count);mesh.userData={level:0,exterior:false,furnitureRender:'sofa'};for(let i=0;i<count;i++)mesh.setMatrixAt(i,new T.Matrix4().makeTranslation(x+i,0,0));source.add(mesh);}const display=createWalkingDisplay(source),batches=[];display.group.traverse(o=>{if(o.isInstancedMesh)batches.push(o);});assert.deepEqual(batches.map(m=>m.count),[2,3]);assert(batches.every(m=>m.instanceMatrix.count===32));assert.notEqual(batches[0].instanceMatrix.array,batches[1].instanceMatrix.array);const matrix=new T.Matrix4();batches[1].getMatrixAt(0,matrix);assert.equal(matrix.elements[12],18);display.dispose();for(const mesh of source.children)mesh.dispose();g.dispose();m.dispose();});
