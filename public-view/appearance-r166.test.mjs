import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {restorePublicFinishes} from './finishes.mjs';
import {applyFurnitureColours,FURNITURE_COLOURS} from '../src/furniture-colours.mjs';
import {createScanMaterialController} from './scanned-material-core.mjs';
import {FURNITURE_PALETTE} from './furniture-palette.mjs';

test('actual public build preserves paint and ceiling normals through serialization and runtime restoration',async()=>{
 const json=JSON.parse(await readFile(new URL('../dist/client/baseline/building.json',import.meta.url),'utf8'));
 const root=await new T.ObjectLoader().parseAsync(json),paints=new Set();
 root.traverse(o=>{for(const m of [o.material].flat().filter(Boolean))if(m.userData.physicalFinishRevision>=165&&['paint','plaster'].includes(m.userData.surfaceKind))paints.add(m);});
 assert(paints.size>0);assert([...paints].some(m=>m.userData.architecturalCeiling));
 const before=new Map([...paints].map(m=>[m,{normal:m.normalMap,roughness:m.roughness,color:m.color.getHex()}]));
 for(const [m,v]of before){assert(v.normal?.image?.data);const d=v.normal.image.data;for(let i=2;i<d.length;i+=4)assert(d[i]>=250,'paint normal must point outward');assert(m.color.r>0&&m.color.g>0&&m.color.b>0);}
 const finishes=restorePublicFinishes(root,{mobile:true});
 const scans=createScanMaterialController({scans:{paint:{normal:'unused'},plaster:{normal:'unused'}},loader:()=>{throw Error('paint must not be replaced by legacy scans');}});
 // Restrict scan verification to revised paint, since older generic materials
 // legitimately still use the scan fallback.
 const revised=new T.Group();for(const m of paints)revised.add(new T.Mesh(new T.BoxGeometry(),m));await scans.apply(revised);
 for(const[m,v]of before){assert.equal(m.normalMap,v.normal);assert.equal(m.roughness,v.roughness);assert.equal(m.color.getHex(),v.color);}
 scans.dispose();finishes.dispose();
});

test('imported sofa and bedding retain selected colours after scan integration',async()=>{
 const root=new T.Group();for(const [name,color,kind]of [['Derived linen upholstery','#ffffff',null],['HomeStudio fabric','#e8e4d9','fabric']]){const m=new T.MeshPhysicalMaterial({name,color});if(kind)m.userData.surfaceKind=kind;root.add(new T.Mesh(new T.BoxGeometry(),m));}
 applyFurnitureColours(root);
 const scan=createScanMaterialController({scans:{fabric:{color:'cloth',colorMean:[.5,.4,.3],metres:.3,rough:.88,environment:.4}},loader:async()=>new T.DataTexture(new Uint8Array([128,128,128,255]),1,1)});
 await scan.apply(root);
 assert.equal(root.children[0].material.color.getHexString(),FURNITURE_COLOURS.upholstery.slice(1));assert.equal(root.children[1].material.color.getHexString(),FURNITURE_COLOURS.bedding.slice(1));
 for(const o of root.children){assert.equal(o.material.userData.surfaceKind,'fabric');assert.deepEqual(o.material.userData.scanAlbedoGain,[2,2.5,1/.3]);}
 assert.equal(FURNITURE_PALETTE.fabric,FURNITURE_COLOURS.upholstery);assert.equal(FURNITURE_PALETTE.linen,FURNITURE_COLOURS.bedding);scan.dispose();
});
