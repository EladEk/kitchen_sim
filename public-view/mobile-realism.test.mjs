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
