import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {selectionBounds} from './selection-view.mjs';import{createSelection}from'./selection.mjs';
test('camera framing ignores hidden helpers and scene overlays while retaining actual visible geometry',()=>{
 const root=new THREE.Group(),g=new THREE.BoxGeometry(2,2,2),m=new THREE.MeshStandardMaterial(),house=new THREE.Mesh(g,m);root.add(house);const hidden=new THREE.Group();hidden.visible=false;const far=new THREE.Mesh(g,m);far.position.x=10000;hidden.add(far);root.add(hidden);const helper=new THREE.Mesh(g,m);helper.position.z=20000;helper.userData.tourNonPhysical=true;root.add(helper);assert.deepEqual(selectionBounds(root).min.toArray(),[-1,-1,-1]);assert.deepEqual(selectionBounds(root).max.toArray(),[1,1,1]);g.dispose();m.dispose();
});
test('apartment crop omits hidden planning overlays even while its source is hidden for selection',()=>{
 const root=new THREE.Group(),g=new THREE.BoxGeometry(2,2,2),m=new THREE.MeshStandardMaterial(),physical=new THREE.Mesh(g,m),overlay=new THREE.Mesh(g,m);physical.userData.level=0;overlay.userData={level:0,securityOverlay:true,tourNonPhysical:true};root.add(physical,overlay);root.visible=false;const section=createSelection(root,{destinations:[],floors:[]},{level:0});assert.equal(section.group.children.length,1);assert.equal(section.group.children[0].geometry,g);section.dispose();g.dispose();m.dispose();
});
