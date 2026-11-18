import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const effects=readFileSync(new URL('./webgl-effects.mjs',import.meta.url),'utf8');
const tone=readFileSync(new URL('./home-tone-mapping.mjs',import.meta.url),'utf8');

test('WebGL composer tone-maps in its own pass before FXAA', ()=>{
 assert.match(effects,/new HomeToneMappingEffect\(\)/);
 assert.match(effects,/new EffectPass\(camera,glow,tone\)/);
 assert.match(effects,/new EffectPass\(camera,aa\)/);
 assert.doesNotMatch(effects,/EffectPass\(camera,[^)]*tone[^)]*aa\)/,'FXAA in the tone pass re-reads raw HDR texels');
 assert.match(effects,/tone\.exposure=renderer\.toneMappingExposure/);
 assert.match(effects,/renderer\.toneMapping=NoToneMapping/);
});

test('home AgX shader is self-contained with an exposure uniform', ()=>{
 assert.match(tone,/uniform float homeExposure;/);
 assert.match(tone,/color \*= homeExposure;/);
 assert.match(tone,/void mainImage\(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor\)/);
 const glsl=tone.slice(tone.indexOf('HOME_AGX_GLSL=`'),tone.lastIndexOf('`;'));
 assert.doesNotMatch(glsl,/toneMappingExposure|AgXToneMapping/,'must not rely on three chunk uniforms');
});

test('furniture contact shadows render in the walk view with a rounded footprint', async ()=>{
 const {contactShadowAlpha}=await import('../src/contact-shadows.mjs');
 assert.ok(contactShadowAlpha(.5,.5)>.4,'dense under the piece');
 assert.ok(contactShadowAlpha(.5,.5)<=.5,'never a black slab');
 assert.equal(contactShadowAlpha(0,.5),0,'fades to nothing at the quad edge');
 assert.ok(contactShadowAlpha(.15,.5)>contactShadowAlpha(.05,.5),'monotonic falloff');
 assert.ok(contactShadowAlpha(.2,.2)>0,'rectangular, not a disc');
 const {createContactShadows}=await import('../src/contact-shadows.mjs');const owned=[],decal=createContactShadows(owned).mesh(2,1);
 assert.equal(decal.userData.renderFixture,true,'editor/home decals must survive the walk-view filter');
 owned.forEach(r=>r.dispose?.());
 const scene=readFileSync(new URL('../src/apartment-furniture-scene.js',import.meta.url),'utf8');
 assert.match(scene,/part:'furniture-contact-shadow',visualOnly:true,tourNonPhysical:true,renderFixture:true/);
});

test('daylight uses PBR Neutral tone mapping on both backends so white walls stay white', ()=>{
 const viewer=readFileSync(new URL('./DistrictViewer.jsx',import.meta.url),'utf8');
 assert.match(viewer,/renderer\.toneMapping=THREE\.NeutralToneMapping/);
 assert.doesNotMatch(viewer,/renderer\.toneMapping=THREE\.AgXToneMapping/);
 assert.match(tone,/vec3 homeNeutralCurve\(/);
 assert.match(effects,/tone\.neutral=mapping===NeutralToneMapping/);
});

test('legacy neutral-lighting preference is retired once; the new key is honoured', async ()=>{
 const {readReferenceLighting,saveReferenceLighting,LEGACY_REFERENCE_LIGHTING_KEY}=await import('./reference-lighting.mjs');
 const data=new Map([[LEGACY_REFERENCE_LIGHTING_KEY,'on']]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 assert.equal(readReferenceLighting(storage),false);
 assert.equal(data.has(LEGACY_REFERENCE_LIGHTING_KEY),false);
 saveReferenceLighting(storage,true);assert.equal(readReferenceLighting(storage),true);
});

test('fabric and wood scans keep full resolution on phones', async ()=>{
 const {MOBILE_FULL_RES_SCANS}=await import('./scanned-material-core.mjs');
 assert.deepEqual([...MOBILE_FULL_RES_SCANS],['fabric','wood']);
});

test('alpha glass drops its milky white body and restores it for transmission', async ()=>{
 const {createArchitecturalGlass,setArchitecturalGlassQuality}=await import('../src/architectural-glass.mjs');
 const resources=[],glass=createArchitecturalGlass(resources,{mobile:false});
 setArchitecturalGlassQuality(glass,{mobile:true});assert.equal(glass.color.getHexString(),'282a2a');assert.equal(glass.opacity,.075);
 setArchitecturalGlassQuality(glass,{});assert.equal(glass.color.getHexString(),'f6faf8');assert.equal(glass.transmission,.9);
 resources.forEach(r=>r.dispose());
});

test('legacy alpha panes lose the white body once; tinted or textured panes are untouched', async ()=>{
 const T=await import('three');const {dimAlphaGlazing}=await import('../src/architectural-glass.mjs');
 const pane=new T.MeshStandardMaterial({color:'#f6faf8',transparent:true,opacity:.08});
 assert.equal(dimAlphaGlazing(pane),true);assert.equal(pane.color.getHexString(),'282a2a');assert.equal(pane.opacity,.08);
 assert.equal(dimAlphaGlazing(pane),false);
 const tinted=new T.MeshStandardMaterial({color:'#9fb4c0',transparent:true,opacity:.08});assert.equal(dimAlphaGlazing(tinted),false);
 const solid=new T.MeshStandardMaterial({color:'#f6faf8'});assert.equal(dimAlphaGlazing(solid),false);
});

test('photo sky: lazy, daylight-only, sun-aligned', async ()=>{
 const src=readFileSync(new URL('./photo-sky.mjs',import.meta.url),'utf8');
 assert.match(src,/setTimeout\(/,'loaded lazily after the tour draws');
 const {photoSkyStrength,photoSkyYaw,PHOTO_SKY_SUN_U}=await import('./photo-sky-math.mjs');
 assert.equal(photoSkyStrength({dark:true,sun:{elevation:50}}),0);
 assert.equal(photoSkyStrength({sun:{elevation:60}}),1);
 assert.ok(photoSkyStrength({sun:{elevation:6}})>0&&photoSkyStrength({sun:{elevation:6}})<1);
 const a=2*Math.PI*PHOTO_SKY_SUN_U,yaw=photoSkyYaw([1,0,0]),x=Math.cos(a),z=Math.sin(a);
 assert.ok(Math.abs(x*Math.cos(yaw)+z*Math.sin(yaw)-1)<1e-9,'pano sun lands on the real sun azimuth');
});

test('lawn: CC0 photoscan, raster-only path, anti-tiled with macro breakup on both backends', ()=>{
 const scans=readFileSync(new URL('./scanned-materials.mjs',import.meta.url),'utf8');
 assert.match(scans,/assets\/grass-r180\/color\.jpg/);assert.match(scans,/technique:'photoscan'/);
 const src=JSON.parse(readFileSync(new URL('./assets/grass-r180/SOURCES.json',import.meta.url),'utf8'));assert.equal(src.license,'CC0-1.0');
 const loader=readFileSync(new URL('./ktx-material-loader.mjs',import.meta.url),'utf8');assert.match(loader,/ktx2.*return loadSurfaceTexture\(url,options\)/s);
 const site=readFileSync(new URL('./site-scene.mjs',import.meta.url),'utf8');assert.match(site,/LAWN_MAP_GLSL/);assert.match(site,/district-surface-r180-/);
 const gpu=readFileSync(new URL('./webgpu-finishes.mjs',import.meta.url),'utf8');assert.match(gpu,/R180 photographed lawn/);
});
test('lawn shading GLSL defines its noise and keeps a single extra map tap', async ()=>{
 const {LAWN_NOISE_GLSL,LAWN_MAP_GLSL,LAWN_MACRO_GLSL}=await import('./lawn-shading.mjs');
 assert.match(LAWN_NOISE_GLSL,/float lawnNoise\(vec2 p\)/);
 assert.equal((LAWN_MAP_GLSL.match(/texture2D\(map/g)||[]).length,2);
 assert.match(LAWN_MACRO_GLSL,/lawnPatch/);
});
