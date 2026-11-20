import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {scanKindFor} from '../public-view/scanned-material-core.mjs';
const scans={wallPaint:{},worktop:{},wood:{},door:{}};
test('R183 painted walls and ceilings take the plaster scan, stone worktops the marble scan',()=>{
 assert.equal(scanKindFor({surfaceKind:'plaster',physicalFinishRevision:165,wallCavity:{}},scans),'wallPaint');
 assert.equal(scanKindFor({surfaceKind:'paint',physicalFinishRevision:165},scans),'wallPaint');
 assert.equal(scanKindFor({surfaceKind:'stone'},scans),'worktop');
 assert.equal(scanKindFor({architecturalRole:'worktop',surfaceKind:'porcelain'},scans),'worktop');
 assert.equal(scanKindFor({surfaceKind:'wood'},scans),'wood');
 assert.equal(scanKindFor({surfaceKind:'porcelain'},scans),null,'without the R189 scan porcelain keeps its procedural detail');
 assert.equal(scanKindFor({surfaceKind:'plaster',physicalFinishRevision:165},{}),null);
});
test('R183 scans are CC0 with recorded provenance, compressed with raster fallbacks, and keep the finish',()=>{
 const sources=JSON.parse(fs.readFileSync(new URL('../public-view/assets/pbr-r183/SOURCES.json',import.meta.url)));
 for(const a of sources.assets){assert.equal(a.license,'CC0-1.0');for(const f of a.files)assert.ok(fs.existsSync(new URL('../public-view/assets/pbr-r183/'+f,import.meta.url)),f);}
 const src=fs.readFileSync(new URL('../public-view/scanned-materials.mjs',import.meta.url),'utf8');
 assert.match(src,/wallPaint:\{normal:plasterNormal,roughness:plasterRough,metres:2,[^}]*keepFinish:true,replaceDetail:true/);
 for(const n of ['plasterNormal','plasterRough','worktopColor','worktopNormal','worktopRough'])assert.match(src,new RegExp(`\\[${n},${n}Fallback\\]`));
});
