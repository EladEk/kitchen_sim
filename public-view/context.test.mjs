import test from 'node:test';
import assert from 'node:assert/strict';
import clipping from 'polygon-clipping';
import * as THREE from 'three';
import {publicSiteData} from '../scripts/public-site.mjs';
import {SITE_TRACE} from '../src/building-site-trace.mjs';
import {siteMainMeterFeature} from '../src/site-utility-layout.mjs';
import {siteFeature,siteCollisionBoxes} from '../src/building-site.mjs';
import {createSiteLayout,rectanglePolygon} from './site-layout.mjs';
import {createDistrictContext,contextPolygon,contextParking} from './context-scene.mjs';

const source=publicSiteData(),layout=createSiteLayout(source);
const area=polygons=>polygons.reduce((n,rings)=>n+rings.reduce((s,r,i)=>s+(i?-1:1)*Math.abs(r.reduce((a,p,j)=>{const q=r[(j+1)%r.length];return a+p[0]*q[1]-q[0]*p[1];},0)/2),0),0);
test('one shared main meter replaces per-building copies, reconciles outside private plots and keeps inspection/collision data consistent',()=>{
 assert.equal(source.utilities.length,1);const u=source.utilities[0],original=SITE_TRACE.features.find(f=>f.id==='site-main-water-meter'),meter=siteMainMeterFeature();
 assert.deepEqual(meter.sourcePosition,original.position);assert.notDeepEqual(meter.position,original.position);assert.equal(meter.scope,'shared-plot-1410');assert.deepEqual(siteFeature(meter.id).position,meter.position);
 const obstacle=siteCollisionBoxes().filter(o=>o.siteObstacle===meter.id);assert.equal(obstacle.length,1);assert.equal(obstacle[0].minZ,Math.min(...meter.polygon.map(p=>p[1])));
 const [w,,d]=u.size,poly=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z])=>[u.position[0]+x*Math.cos(u.angle)+z*Math.sin(u.angle),u.position[1]-x*Math.sin(u.angle)+z*Math.cos(u.angle)]);
 const blocked=clipping.union(...layout.gardens.map(g=>[g.plot]),...layout.parking.map(p=>[p.polygon]),...layout.roadSurfaces.map(r=>[rectanglePolygon(r)]));assert(area(clipping.intersection([poly],blocked))<1e-6);assert.equal(u.scope,'plot1410');
});
test('education context lies across the street behind4092/4091, with the source shapes and no claimed institution identity',()=>{
 const c=source.context;assert.deepEqual(c.near,['4092','4091']);assert.equal(c.verifiedAsBuilt,false);assert.equal(c.institutionNamesVerified,false);assert.equal(c.buildings.length,6);
 for(const b of c.buildings){assert(b.bounds[2]>190);assert(b.height>6&&b.height<11);assert(area(clipping.intersection([contextPolygon(b.bounds)],source.groundCover.grass.flatMap(l=>l.polygons)))<1e-6);}
 assert.equal(c.buildings.filter(b=>b.id.includes('wing')).length,2);assert.equal(c.buildings.filter(b=>b.id.includes('low-block')).length,3);
 assert.equal(layout.parking.filter(p=>p.traced).length,209);assert.equal(layout.parking.length,452);assert(layout.bounds.south>=290);
 for(const bay of contextParking(c)){assert(bay.length<bay.w);assert(bay.d>1.9);}
});
test('context geometry is batched, finite, shaded and disposed without duplicating the shared utility',()=>{
 const context=createDistrictContext(source.context,source.utilities),resources=new Set(),events=new Map();
 context.group.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of [o.material].flat().filter(Boolean))resources.add(m);if(o.isInstancedMesh){const matrix=new THREE.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);assert(matrix.elements.every(Number.isFinite));assert(matrix.determinant()>0);}}});
 for(const r of resources)r.addEventListener('dispose',()=>events.set(r,(events.get(r)||0)+1));
 assert(context.stats.drawCalls<=12);assert.equal(context.group.children.filter(o=>o.name==='shared-main-water-meter').length,1);
 context.dispose();context.dispose();assert.equal(context.group.children.length,0);for(const r of resources)assert.equal(events.get(r),1);
});
