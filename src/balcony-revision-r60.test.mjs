import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {auditBalconyAccess} from '../qa/audit-balcony-access.mjs';
import {BUILDING,BUILDING_FLOORS} from './building-layout.mjs';
import {BUILDING_INTERIORS} from './building-interiors.mjs';
import {connectedWallRuns,wallFootprint,polygonContains,exposedBalconySegments} from './building-geometry.mjs';
import {buildBuildingContext} from './building-scene.js';
import {normalizeHomeSettings} from './home-model.mjs';
import {buildingBoxes,moveBuildingPlayer} from './building-navigation.mjs';
import {createElevators} from './elevator-model.mjs';
import {laundryScreens} from './laundry-screens.mjs';
test('all 58 balcony surfaces have a clear full-height access route, including contiguous terrace pieces',()=>{
 const r=auditBalconyAccess();assert.equal(r.summary.balconies,58);assert.equal(r.summary.reachable,58);assert(r.summary.portalCrossings>=61);assert.deepEqual(r.failures,[]);
});
test('recovered hinged balcony exits render as selectable glazed leaves and closed leaves block walking',()=>{
 const audit=auditBalconyAccess(),portal=audit.floors.find(f=>f.floor===2).portals.find(p=>p.kind==='hinged'),door=BUILDING_INTERIORS.floors[2].doors.find(d=>d.id===portal.id),settings=normalizeHomeSettings({furniture:false,closedBuildingDoors:[door.id]}),cars=createElevators(),root=new THREE.Group(),resources=[],picks=[];
 try{buildBuildingContext({group:root,resources,picks,settings:{...settings,buildingLevel:2},mode:'building'});const pane=picks.find(p=>p.userData.part==='building-balcony-door-glazing'&&p.userData.doorId===door.id);assert(pane);assert.equal(pane.userData.action,'building-door');assert(pane.material.transparent);const delta=portal.outside.map((v,i)=>v-portal.inside[i]),blocked=moveBuildingPlayer(portal.inside,delta,2,buildingBoxes(2,settings,cars),cars);assert(Math.hypot(...blocked.map((v,i)=>v-portal.outside[i]))>.2);const opened={...settings,closedBuildingDoors:[]},clear=moveBuildingPlayer(portal.inside,delta,2,buildingBoxes(2,opened,cars),cars);assert(Math.hypot(...clear.map((v,i)=>v-portal.outside[i]))<.04);
 }finally{resources.forEach(r=>r.dispose?.());}
});
test('the floor 6 corner sun terraces sit outside the apartment envelope and retain actual outer guards',()=>{
 const f=BUILDING_FLOORS[6];for(const index of [8,9]){const p=f.balconies[index].reduce((a,b)=>a.map((v,i)=>v+b[i]/4),[0,0]);assert(!f.envelope.some(e=>polygonContains(p,e.polygon)));assert(!f.units.some(u=>polygonContains(p,u.polygon)));assert(exposedBalconySegments(f).some(s=>s.balcony===index&&Math.hypot(...s.b.map((v,i)=>v-s.a[i]))>3));}
});
test('both southern laundry frames meet real walls at every storey rather than projecting past the recess',()=>{
 for(const f of BUILDING_FLOORS.filter(f=>f.level>0&&f.level<=6)){const walls=connectedWallRuns(BUILDING_INTERIORS.floors[f.level],f).map(wallFootprint);for(const s of laundryScreens(f.level).filter(s=>s.id.startsWith('south'))){assert.deepEqual(s.a,s.sourceA);assert.deepEqual(s.b,s.sourceB);for(const p of [s.a,s.b]){const gap=Math.min(...walls.map(b=>Math.hypot(Math.max(b.minX-p[0],0,p[0]-b.maxX),Math.max(b.minZ-p[1],0,p[1]-b.maxZ))));assert(gap<.01,`floor ${f.level} ${s.id} post detached by ${gap} m`);}}}
});
