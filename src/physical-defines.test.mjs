import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {applyArchitecturalMaterials} from './architectural-materials.mjs';

// MeshStandardMaterial.copy() resets defines to {STANDARD}. A physical material
// without PHYSICAL has no IOR in WebGL2 and transmission glass fails to compile.
test('standard-to-physical conversions keep the PHYSICAL define (WebGL2 glass compiles)',async()=>{
 const root=new THREE.Group(),glass=new THREE.MeshStandardMaterial({color:'#dfe'}),mesh=new THREE.Mesh(new THREE.BoxGeometry(),glass);mesh.userData.part='building-glazing';root.add(mesh);
 applyArchitecturalMaterials(root);const m=mesh.material;
 if(m!==glass){assert(m.isMeshPhysicalMaterial);assert.equal(m.defines.PHYSICAL,'');assert.equal(m.defines.STANDARD,'');}
 for(const file of ['src/architectural-materials.mjs','src/physical-finishes.mjs'])assert.match(await readFile(file,'utf8'),/prototype\.copy\.call\([^)]*\);[^\n]*\n?\s*(\/\/[^\n]*\n\s*)?(material|m)\.defines=\{\.\.\.source\.defines,STANDARD:'',PHYSICAL:''\}/);
 mesh.geometry.dispose();
});
