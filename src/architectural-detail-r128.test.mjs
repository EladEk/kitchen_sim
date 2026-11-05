import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {FACADE_COLOR,facadePixels} from './facade-finish.mjs';
import {wallExteriorFaces} from './wall-face-finishes.mjs';
import {wallFaceMaterials} from './wall-face-finishes.mjs';
import {splitWallReturnGeometry} from './wall-return-geometry.mjs';
import {doorFrameRows} from './door-frame.mjs';
import {addRoomCornerOcclusion} from './room-corner-occlusion.mjs';
import {createHomeScene} from './home-scene.js';
import {normalizeHomeSettings,ROOMS} from './home-model.mjs';
import {createSurfacePalette} from './surface-materials.mjs';
import {surfacePixels} from '../public-view/surface-detail.mjs';
test('convex exterior wall returns receive stone while jambs that lead into a room retain paint',()=>{
 const inside=([x,z])=>x>0&&x<3&&z>0&&z<3;
 const corner=wallExteriorFaces({centre:[1.5,0],normal:[0,1],thickness:.3,length:3,inside});assert(corner[0]&&corner[1]);assert(!corner[4]&&corner[5]);
 const opening=wallExteriorFaces({centre:[1.5,0],normal:[0,1],thickness:.3,length:1,inside});assert(!opening[0]&&!opening[1]);assert(!opening[4]&&opening[5]);
});
test('the real return geometry splits a window jamb into outside stone and inside paint without moving its bounds',()=>{
 const original=new T.BoxGeometry(1,2,.3),geometry=splitWallReturnGeometry(original),paint=new T.MeshStandardMaterial(),stone=new T.MeshStandardMaterial(),inside=([x,z])=>x>0&&x<3&&z>0&&z<3;
 const faces=wallExteriorFaces({centre:[1.5,0],normal:[0,1],thickness:.3,length:1,inside,splitReturns:true}),mesh=new T.Mesh(geometry,wallFaceMaterials(paint,stone,faces));mesh.position.set(1.5,1,0);mesh.updateMatrixWorld(true);
 for(const [z,expected]of [[-.075,stone],[.075,paint]]){const hit=new T.Raycaster(new T.Vector3(2.5,1,z),new T.Vector3(-1,0,0),0,1).intersectObject(mesh)[0];assert(hit);assert.equal(mesh.material[hit.face.materialIndex],expected);}
 original.computeBoundingBox();geometry.computeBoundingBox();assert(geometry.boundingBox.min.distanceTo(original.boundingBox.min)<1e-7);assert(geometry.boundingBox.max.distanceTo(original.boundingBox.max)<1e-7);original.dispose();geometry.dispose();paint.dispose();stone.dispose();
});
test('the private and public facade share the actual albedo grain and every building shell keeps the same colour',()=>{
 const resources=[],material=createSurfacePalette(resources)('limestone',FACADE_COLOR),pixels=facadePixels(),publicPixels=surfacePixels('limestone',256);assert.deepEqual(material.map.image.data,pixels.color);assert.deepEqual(publicPixels.color,pixels.color);resources.forEach(r=>r.dispose());
 const home=createHomeScene(normalizeHomeSettings({cutaway:false}),{mode:'walk',daylight:false});let count=0;
 try{home.group.traverse(o=>{if(!['architectural-wall','building-facade-wall','ground-base-wall','ground-exterior-cladding','building-facade-cladding','exterior-stone-skin'].includes(o.userData.part))return;for(const m of [o.material].flat().filter(Boolean))if(m.userData.surfaceKind==='limestone'){assert.equal(m.color.getHexString(),FACADE_COLOR.slice(1));count++;}});assert(count>50);}finally{home.dispose();}
});
test('door frames have separate deep jambs, stops and casing steps on both wall faces without a bottom obstruction',()=>{
 const rows=doorFrameRows({width:.8,height:2.1,depth:.14});assert(rows.some(r=>r.part==='door-jamb'&&r.box[5]===.14));assert(rows.some(r=>r.part==='door-stop'));assert(rows.some(r=>r.part==='door-casing-step'&&r.box[2]>0));assert(rows.some(r=>r.part==='door-casing-step'&&r.box[2]<0));assert(rows.every(r=>r.box[1]-r.box[4]/2>=-1e-9));assert(rows.every(r=>r.box[4]>.1||r.box[1]>2));
});
test('room-corner occlusion stays a transparent visual layer above the skirting and never participates in collision',()=>{
 const root=new T.Group(),resources=[],mesh=addRoomCornerOcclusion(root,ROOMS.filter(r=>!['garden','outdoor'].includes(r.kind)),resources);assert(mesh);assert(mesh.userData.tourNonPhysical&&mesh.userData.visualOnly);assert(mesh.material.transparent&&!mesh.material.depthWrite);assert(mesh.material.map.image.data.some((v,i)=>i%4===3&&v>0));assert(mesh.material.map.image.data.at(-1)===0);mesh.geometry.computeBoundingBox();assert(mesh.geometry.boundingBox.min.y>=.075);resources.forEach(r=>r.dispose());
});
