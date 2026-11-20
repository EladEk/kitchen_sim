import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as THREE from 'three';
import {createContactShadows,contactShadowAlpha} from '../src/contact-shadows.mjs';
import {hasContactShadow,FLOOR_TOP,PLACEMENT_LIFT} from './apartment-editor-scene.mjs';
test('footprint decals hug the real footprint with a fixed soft rim, at any size',()=>{
 const owned=[],c=createContactShadows(owned,{inset:0,peak:.5});
 for(const [w,d] of [[2.2,.9],[.48,.52],[1.6,.9]]){const m=c.footprint(w,d),b=m.geometry.boundingBox;
  assert(Math.abs(b.max.x-(w/2+.14))<1e-6&&Math.abs(b.min.z+(d/2+.14))<1e-6,'rim is 14 cm, not 18% of the size');assert.equal(b.max.y,0);
  const n=m.geometry.attributes.normal;for(let i=0;i<n.count;i++)assert.equal(n.getY(i),1);
  const p=m.geometry.attributes.position,uv=m.geometry.attributes.uv,i=m.geometry.index.array;const a=new THREE.Vector3(),bb=new THREE.Vector3(),cc=new THREE.Vector3();

  for(let k=0;k<uv.count;k++){const x=Math.abs(p.getX(k)),u=uv.getX(k);if(x<w/2)assert.equal(u,.5);else assert(u===0||u===1);}
 }
 assert.equal(c.footprint(2,1).geometry,c.footprint(2,1).geometry,'geometry cached per size');
 assert(contactShadowAlpha(.5,.5,{inset:0,peak:.5})<=.5&&contactShadowAlpha(.2,.5,{inset:0,peak:.5})<contactShadowAlpha(.4,.5,{inset:0,peak:.5}),'soft monotone rim');
 owned.forEach(r=>r.dispose?.());
});
test('rugs, curtains, lamps and stacked decor never get a floor contact; pieces stand on the floor top',()=>{
 for(const kind of ['rug','curtain','ceiling_lamp','cushions','plant','succulent','tv'])assert(!hasContactShadow({kind}),kind);
 for(const kind of ['sofa','armchair','bed','coffee','dining','chair','bookcase'])assert(hasContactShadow({kind}),kind);
 assert(!hasContactShadow({kind:'side_table',y:.75}));assert(FLOOR_TOP<PLACEMENT_LIFT);
 const src=fs.readFileSync(new URL('./apartment-editor-scene.mjs',import.meta.url),'utf8');
 assert.match(src,/contacts\.footprint\(item\.w,item\.d\)/);assert.match(src,/position\.y=context\.elevation\+FLOOR_TOP\+\.003/);assert.doesNotMatch(src,/contacts\.mesh\(/);
});
