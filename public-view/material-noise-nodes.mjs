import {floor,fract,vec2,float,mix,sin,dot} from 'three/tsl';

export const cellHash=p=>fract(sin(dot(p,vec2(127.1,311.7))).mul(43758.5453));
// C1-continuous value noise, with no repeating UV texture or grid waves.
export function valueNoise2(p){
 const cell=floor(p),f=fract(p),w=f.mul(f).mul(float(3).sub(f.mul(2)));
 return mix(mix(cellHash(cell),cellHash(cell.add(vec2(1,0))),w.x),mix(cellHash(cell.add(vec2(0,1))),cellHash(cell.add(vec2(1,1))),w.x),w.y);
}
export function noiseGradient(p){
 const e=.025;
 return vec2(valueNoise2(p.add(vec2(e,0))).sub(valueNoise2(p.sub(vec2(e,0)))),valueNoise2(p.add(vec2(0,e))).sub(valueNoise2(p.sub(vec2(0,e))))).div(2*e);
}
