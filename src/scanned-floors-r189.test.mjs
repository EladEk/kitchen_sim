import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {scanKindFor} from '../public-view/scanned-material-core.mjs';
const scans={wallPaint:{},worktop:{},wood:{},door:{},porcelainFinish:{}};
test('R189 interior floors and porcelain wall tiles take the porcelain relief, other kinds are unchanged',()=>{
 assert.equal(scanKindFor({architecturalRole:'floor',surfaceKind:'porcelain',publicFinish:'floor',floorCourses:{tile:[1,1]}},scans),'porcelainFinish');
 assert.equal(scanKindFor({surfaceKind:'cement',publicFinish:'floor',floorCourses:{tile:[.6,.6]}},scans),'porcelainFinish');
 assert.equal(scanKindFor({surfaceKind:'porcelain',physicalFinishRevision:165},scans),'porcelainFinish');
 assert.equal(scanKindFor({surfaceKind:'cement'},scans),null,'outdoor cement keeps its own detail');
 assert.equal(scanKindFor({architecturalRole:'worktop',surfaceKind:'porcelain'},scans),'worktop');
 assert.equal(scanKindFor({surfaceKind:'door'},scans),'door');
});
test('R189 porcelain scan is CC0, compressed with fallbacks, small, and keeps the finish',()=>{
 const dir=new URL('../public-view/assets/pbr-r189/',import.meta.url),sources=JSON.parse(fs.readFileSync(new URL('SOURCES.json',dir)));
 let bytes=0;for(const a of sources.assets){assert.equal(a.license,'CC0-1.0');for(const f of a.files){assert.ok(fs.existsSync(new URL(f,dir)),f);if(f.endsWith('.ktx2'))bytes+=fs.statSync(new URL(f,dir)).size;}}
 assert.ok(bytes<300000,'phone budget: '+bytes);
 const src=fs.readFileSync(new URL('../public-view/scanned-materials.mjs',import.meta.url),'utf8');
 assert.match(src,/porcelainFinish:\{normal:porcelainNormal,roughness:porcelainRough,[^}]*keepFinish:true/);
 assert.doesNotMatch(src,/porcelainFinish:\{[^}]*color:/,'selected colour stays the albedo');
 for(const n of ['porcelainNormal','porcelainRough'])assert.match(src,new RegExp(`\\[${n},${n}Fallback\\]`));
});
