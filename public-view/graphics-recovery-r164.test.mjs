import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {daylightEnvironmentPixels} from '../src/daylight-environment.mjs';
import {facadeCourseSample,FACADE_COURSES} from '../src/facade-finish.mjs';
import {stoneMaps,createPhotoScene} from '../src/photoreal-scene.mjs';
import {celestialState,skyPixels} from '../src/celestial-sky.mjs';
import {createPhysicalAtmosphere} from './webgpu-atmosphere.mjs';
import {createAdaptiveQuality} from './adaptive-quality.mjs';
import {createArchitecturalPresentation} from './presentation.mjs';
import {createCascadedSun} from './webgpu-shadows.mjs';

test('daylight HDR preserves radiance but limits blue casts without desaturating the visible sky',()=>{
 const source=skyPixels(celestialState({solar:{date:'2026-06-21',minutes:720}}),{width:64,height:32}),original=source.data.slice(),balanced=daylightEnvironmentPixels(source);
 assert.deepEqual(source.data,original);let blue=0;
 for(let i=0;i<source.data.length;i+=4){
  const luminance=a=>a[i]*.2126+a[i+1]*.7152+a[i+2]*.0722;
  assert(Math.abs(luminance(source.data)-luminance(balanced.data))<1e-6);
  if(source.data[i+2]>source.data[i]*2){blue++;assert(balanced.data[i+2]<balanced.data[i]*1.2);}
 }
 assert(blue>20);
});

test('physical sky never replaces the calibrated environment and near-building fog is negligible',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),environment=new T.Texture(),originalFog=new T.Fog('white',10,1000);scene.environment=environment;scene.environmentIntensity=.8;scene.fog=originalFog;
 const sky=createPhysicalAtmosphere({},scene,camera),state=celestialState({solar:{date:'2026-06-21',minutes:720}});
 for(let i=0;i<20;i++){sky.update(state,{interior:i/20});assert.equal(scene.environment,environment);assert.equal(scene.environmentIntensity,.8);}
 assert(1-Math.exp(-((scene.fog.density*150)**2))<.002,'150m facade keeps contrast');sky.dispose();assert.equal(scene.fog,originalFog);assert.equal(scene.environment,environment);environment.dispose();
});

test('individual limestone courses retain visible joints, stagger and relief in photo materials',()=>{
 const c=FACADE_COURSES,face=facadeCourseSample(.22,.2),joint=facadeCourseSample(0,.2),stagger=facadeCourseSample(c.width/2,c.height+.2);
 assert(joint.shade<face.shade*.65);assert.equal(joint.height,0);assert.equal(face.height,c.recess);assert.equal(stagger.height,0);
 const maps=stoneMaps();try{
  const pixel=(x,y)=>maps.map.image.data[(y*maps.map.image.width+x)*4];
  assert(pixel(0,100)<pixel(100,100)-30);assert(maps.normalMap.image.data.some((n,i)=>i%4===0&&Math.abs(n-128)>10));
  assert.equal(maps.map.repeat.x,1/(2*c.width));assert.equal(maps.map.anisotropy,16);
 }finally{Object.values(maps).forEach(m=>m.dispose());}
 const scene=new T.Scene(),m=new T.MeshStandardMaterial({color:'#e2ddd3'}),g=new T.PlaneGeometry(2,3);m.userData.publicFinish='stone';scene.add(new T.Mesh(g,m));const snapshot=createPhotoScene(scene);
 try{const photo=snapshot.scene.children[0].material;assert(photo.normalMap);assert.equal(photo.bumpScale,c.recess);assert(photo.roughness>=.78&&photo.roughness<=.86);assert(photo.color.equals(m.color));}finally{snapshot.dispose();m.dispose();g.dispose();}
});

test('automatic mobile quality starts balanced, tolerates steady 30fps and ignores photo workload',()=>{
 const q=createAdaptiveQuality({mobile:true,pixelRatio:3.25});assert.equal(q.profile.tier,1);const initial=q.profile;
 let now=1;for(let i=0;i<700;i++)q.sample(now+=1000/30);assert.deepEqual(q.profile,initial);
 for(let i=0;i<700;i++)q.sample(now+=110,{paused:true});assert.deepEqual(q.profile,initial);
 for(let i=0;i<400;i++)q.sample(now+=65);assert.equal(q.profile.tier,1);assert(q.profile.scale<initial.scale);
});

test('automatic quality keeps one native pipeline through reductions, room changes and effects-off',()=>{
 const profiles=[];let draws=0,disposed=0;
 const renderer={isWebGPURenderer:true,xr:{isPresenting:false},getPixelRatio:()=>1,setRenderTarget(){},render(){throw Error('unexpected direct draw');}};
 const p=createArchitecturalPresentation(renderer,{}, {},{mobile:true,pipelineFactory:()=>({resize(){},setQuality:q=>profiles.push(q),prepare:()=>true,render(){draws++;},dispose(){disposed++;}})});
 p.setQuality({tier:1});p.resize(394,721);for(const tier of [1,2,3,2,1]){p.setQuality({tier});p.render(tier*40,{effects:tier<2,enhanced:true});}
 assert.equal(p.stats.created,1);assert.equal(disposed,0);assert.equal(draws,5);assert(profiles.some(p=>p.effects===false));p.dispose();assert.equal(disposed,1);
});

test('cascaded shadow maps reuse stationary frames, throttle movement and invalidate edits immediately',()=>{
 let now=0;const scene=new T.Scene(),camera=new T.PerspectiveCamera(48,1,.06,500),sun=new T.DirectionalLight();sun.position.set(5,8,3);sun.castShadow=true;scene.add(sun,sun.target);scene.updateMatrixWorld(true);
 const renderer={coordinateSystem:T.WebGPUCoordinateSystem,reversedDepthBuffer:false,isWebGPURenderer:true},shadows=createCascadedSun(renderer,sun,camera,{mobile:true,clock:()=>now}),csm=sun.shadow.shadowNode;
 csm._init({camera,renderer});shadows.update({focus:new T.Vector3(),shadowRadius:20});csm.updateBefore({});assert.equal(shadows.cascades.length,2);
 for(const l of shadows.cascades){assert.equal(l.shadow.autoUpdate,false);l.shadow.needsUpdate=false;}
 now=100;csm.updateBefore({});assert(shadows.cascades.every(l=>!l.shadow.needsUpdate));
 camera.position.x=.2;camera.updateMatrixWorld();now=101;csm.updateBefore({});assert(shadows.cascades.every(l=>l.shadow.needsUpdate));for(const l of shadows.cascades)l.shadow.needsUpdate=false;
 camera.position.x=.4;camera.updateMatrixWorld();now=120;csm.updateBefore({});assert(shadows.cascades.every(l=>!l.shadow.needsUpdate));
 shadows.invalidate();csm.updateBefore({});assert(shadows.cascades.every(l=>l.shadow.needsUpdate));shadows.dispose();
});
