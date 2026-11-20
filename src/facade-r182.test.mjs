import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {ARCHITECTURAL_MATERIALS,applyArchitecturalMaterials} from './architectural-materials.mjs';
import {ANTHRACITE,FACADE_COURSES,facadeCourseSample} from './facade-finish.mjs';
import {GREY_FACADE_COLOR} from './facade-accents.mjs';
import {restorePublicFinishes} from '../public-view/finishes.mjs';

test('balcony band: fascia, beams and returns share one anthracite; returns are render, not stone',()=>{
 assert.equal(GREY_FACADE_COLOR,ANTHRACITE);assert.equal(ARCHITECTURAL_MATERIALS.fascia.color,ANTHRACITE);assert.equal(ARCHITECTURAL_MATERIALS.secondary.color,ANTHRACITE);
 const root=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());mesh.userData.part='building-balcony-grey-returns';root.add(mesh);applyArchitecturalMaterials(root);
 assert.equal(mesh.material.userData.publicFinish,'render');assert.equal(mesh.material.userData.surfaceKind,undefined);
});

test('an older baseline that stored the returns as stone is restored as anthracite render without stone maps',()=>{
 const root=new T.Group(),m=new T.MeshPhysicalMaterial({map:new T.Texture()});m.userData={architecturalRole:'secondary',publicFinish:'stone',surfaceKind:'limestone'};root.add(new T.Mesh(new T.BoxGeometry(),m));
 const finish=restorePublicFinishes(root,{mobile:true});try{assert.equal(m.userData.publicFinish,'render');assert.equal(m.map,null);assert.equal(m.color.getHexString(),ANTHRACITE.slice(1));}finally{finish.dispose();}
});

test('limestone courses follow the photographed 60-80 x 30-40 cm slabs in a half-offset running bond',()=>{
 const c=FACADE_COURSES;assert(c.width>=.6&&c.width<=.8&&c.height>=.3&&c.height<=.4);assert(c.toneRange<=.07,'per-slab tone stays within about +-3%');
 assert(facadeCourseSample(c.width*.25,c.height*.5).shade>facadeCourseSample(0,c.height*.5).shade,'joint is darker than the stone');
 assert(facadeCourseSample(c.width*.5,c.height*1.5).shade<facadeCourseSample(c.width*.25,c.height*1.5).shade,'next course is offset by half a slab');
});
