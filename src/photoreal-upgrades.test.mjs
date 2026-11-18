import test from 'node:test';
import assert from 'node:assert/strict';
import {Color,Group,Mesh,BoxGeometry,MeshPhysicalMaterial} from 'three';
import {analyticSkyState,sampleAnalyticSky,architecturalSkyPixels} from './daylight.js';
import {daylightEnvironmentPixels} from './daylight-environment.mjs';
import {ARCHITECTURAL_MATERIALS,porcelainProfile,applyArchitecturalMaterials} from './architectural-materials.mjs';
import {createArchitecturalGlass,setArchitecturalGlassQuality} from './architectural-glass.mjs';
import {warmDimColor} from './photometric-lighting.mjs';
import {computeTargetExposure,stepExposure} from '../public-view/photoreal-quality.mjs';
import {coveredInteriorAt} from '../public-view/interior-lighting.mjs';

test('analytic HDR follows solar altitude, warms sunset and balances the lower ground hemisphere',()=>{
 const noon=analyticSkyState({sunDirection:[0,.8,.6]}),sunset=analyticSkyState({sunDirection:[1,.08,0]}),night=analyticSkyState({sunDirection:[1,-.4,0]});
 assert(noon.altitude>sunset.altitude&&sunset.altitude>night.altitude);
 const a=sampleAnalyticSky(noon,0,1,0),b=sampleAnalyticSky(sunset,0,.01,-1),c=sampleAnalyticSky(night,0,1,0);
 assert(a[2]>a[0]);assert(b[0]>b[2]);assert(c.reduce((a,b)=>a+b)<a.reduce((a,b)=>a+b)*.2);
 const ground=sampleAnalyticSky(noon,0,-1,0);assert(ground[0]>ground[1]&&ground[1]>ground[2]);
 const pixels=architecturalSkyPixels({hour:13.5},{width:32,height:16}),late=architecturalSkyPixels({hour:19},{width:32,height:16});
 assert.notDeepEqual(pixels.data,late.data);assert(pixels.data.every(v=>Number.isFinite(v)&&v>=0));
 const balanced=daylightEnvironmentPixels(pixels,{warmGround:true}),bottom=0,top=15*32*4;
 assert(balanced.data[bottom]>balanced.data[bottom+2]);assert.notEqual(balanced.data[top],balanced.data[top+2]);assert(balanced.data[top]/balanced.data[top+2]>pixels.data[top]/pixels.data[top+2]);
 const fromVector=analyticSkyState({sunDirection:{isVector3:true,toArray:()=>[0,2,0]}});assert.equal(fromVector.elevation,1);
});

test('porcelain uses the surveyed metre grid and preserves explicit exterior plank layouts',()=>{
 assert.deepEqual(porcelainProfile(),{tile:[1,1],joint:.004,satin:true});
 assert.deepEqual(porcelainProfile({productId:'dry-floor',tile:[.8,.8]}).tile,[1,1]);
 assert.deepEqual(porcelainProfile({productId:'terrace-floor',tile:[.2,1.2],floorRendering:{jointMetres:.003}}),{tile:[.2,1.2],joint:.003,satin:false});
 assert.deepEqual(porcelainProfile({architecturalRole:'entranceFloor',floorCourses:{tile:[.2,1.2],joint:.003}}).tile,[.2,1.2]);
});

test('architectural glazing and coated metals retain physical optical properties and safe mobile glass',()=>{
 const resources=[],glass=createArchitecturalGlass(resources,{mobile:false});
 assert.equal(glass.transmission,.9);assert.equal(glass.thickness,.024);assert.equal(glass.ior,1.52);assert.equal(glass.attenuationDistance,.65);assert.equal(glass.attenuationColor.getHexString(),'dff0ec');
 setArchitecturalGlassQuality(glass,{mobile:true});assert.equal(glass.transmission,0);assert.equal(glass.opacity,.075);
 setArchitecturalGlassQuality(glass,{});assert.equal(glass.transmission,.9);
 const root=new Group(),mesh=new Mesh(new BoxGeometry(),new MeshPhysicalMaterial());mesh.userData.part='door-handle';root.add(mesh);
 applyArchitecturalMaterials(root);assert.equal(mesh.material.anisotropy,.65);assert.equal(mesh.material.metalness,.96);
 for(const role of ['frame','fence'])assert.equal(ARCHITECTURAL_MATERIALS[role].clearcoatRoughness,.42);
 assert.equal(ARCHITECTURAL_MATERIALS.wall.color,'#f2efe9');assert.equal(ARCHITECTURAL_MATERIALS.ceiling.color,'#f8f8f6');
 resources.forEach(m=>m.dispose());mesh.geometry.dispose();mesh.material.dispose();
});

test('warm dimming preserves full power and becomes amber monotonically without mutating the base colour',()=>{
 const base=new Color('#fff1e0'),ratio=c=>c.r/Math.max(c.b,.0001),full=warmDimColor(base,1),half=warmDimColor(base,.5),low=warmDimColor(base,0);
 assert(full.equals(base));assert(ratio(low)>ratio(half)&&ratio(half)>ratio(full));assert(warmDimColor(base,0).getHexString()==='ffbe7b');
 assert(ratio(warmDimColor(base,1,true))>ratio(full));assert.equal(base.getHexString(),'fff1e0');
});

test('exposure targets are bounded, frame-rate independent and distinguish covered upper floors from gardens',()=>{
 assert.equal(computeTargetExposure(),.94);assert.equal(computeTargetExposure({insideUnit:true}),1.16);assert(Math.abs(computeTargetExposure({insideUnit:true,nightMode:true})-1.28)<1e-12);
 let sixty=.94,thirty=.94;for(let i=0;i<60;i++)sixty=stepExposure(sixty,1.16,1/60);for(let i=0;i<30;i++)thirty=stepExposure(thirty,1.16,1/30);
 assert(Math.abs(sixty-thirty)<1e-10);assert(sixty>.94&&sixty<1.16);assert.equal(stepExposure(sixty,1.16,-1),sixty);
 const polygon=[[0,0],[4,0],[4,4],[0,4]],data={storey:3,floors:[{level:2,units:[{polygon}],core:[]}],destinations:[]};
 const at={building:'4102',floor:2,position:{x:2,y:7.62,z:2}};
 assert(coveredInteriorAt(data,at));assert(!coveredInteriorAt(data,{...at,position:{x:2,y:9.1,z:2}}));assert(!coveredInteriorAt(data,{...at,position:{x:6,y:7.62,z:2}}));
});
