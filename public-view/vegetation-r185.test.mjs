import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as THREE from 'three';
import {createRealisticProps,impostorCards} from './realistic-props.mjs';
const dir=new URL('./assets/vegetation-r185/',import.meta.url);
test('impostor atlases are CC0, compressed, phone-sized and recorded in SOURCES.json',()=>{
 const sources=JSON.parse(fs.readFileSync(new URL('SOURCES.json',dir))),manifest=JSON.parse(fs.readFileSync(new URL('MANIFEST.json',dir)));
 assert.equal(sources.license,'CC0-1.0');assert(sources.assets.every(a=>a.license==='CC0-1.0'&&/polyhaven\.com\/a\//.test(a.official_page)));
 for(const a of manifest.atlases){assert(a.size[0]<=1024&&a.size[1]<=1024&&a.size[0]%4===0&&a.size[1]%4===0);const k=fs.readFileSync(new URL(a.ktx2,dir));assert.equal(k.subarray(1,7).toString(),'KTX 20');assert(k.length<400e3);assert(fs.statSync(new URL(a.webp,dir)).size<400e3);assert(fs.existsSync(new URL(a.source+'-LICENSE.txt',dir)));}
});
test('impostor cards stay inside their atlas tile, double-wound with outward crown normals',()=>{
 const g=impostorCards({R:2,H:5},{sides:[0,1,2],tops:[.7]}),uv=g.attributes.uv,n=g.attributes.normal,p=g.attributes.position;
 assert.equal(g.index.count,4*12);for(let i=0;i<uv.count;i++){assert(uv.getX(i)>0&&uv.getX(i)<1&&uv.getY(i)>0&&uv.getY(i)<1);assert(n.getY(i)>-.2);assert(p.getY(i)>=0&&p.getY(i)<=5);}
 const box=g.boundingBox;assert(box.max.x<=2.0001&&box.min.z>=-2.0001);
});
test('hedges and the distant tree belt are single static batches that never collide',()=>{
 const hedges=Array.from({length:50},(_,i)=>({x:i,z:0,angle:0,height:1.1})),backdrop=Array.from({length:30},(_,i)=>({x:300+i*10,z:0,angle:i,scale:[1.4,1.4,1.4]}));
 const props=createRealisticProps({trees:[[0,10]],hedges,backdrop,mobile:true});
 try{const h=props.group.children.find(o=>o.name==='hedge'),b=props.group.children.find(o=>o.name==='backdrop');
  assert.equal(h.count,50);assert.equal(b.count,30);assert(h.userData.visualOnly&&b.userData.visualOnly);assert(!b.castShadow);assert(!h.castShadow,'phones skip hedge shadows');
  assert.equal(h.material.userData.scanKind,'hedgeFoliage');assert.equal(b.material.userData.scanKind,'treeImpostor');
  const m=new THREE.Matrix4();h.getMatrixAt(0,m);const s=new THREE.Vector3();m.decompose(new THREE.Vector3(),new THREE.Quaternion(),s);assert(s.y*1.05>1&&s.y*1.05<1.3,'R190 module height 1.1 m');
  props.update(new THREE.Vector3(0,1.7,0),1000);assert.equal(h.count,50);
  const far=props.group.children.find(o=>o.name==='tree-far-branches');assert(far,'far trunks remain the walking collider');
 }finally{props.dispose();}
});
