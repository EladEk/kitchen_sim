import test from 'node:test';
import assert from 'node:assert/strict';
import {Color} from 'three';
import {interiorProbePixels,CEILING_BOUNCE} from './interior-probe.mjs';
import {ARCHITECTURAL_MATERIALS} from './architectural-materials.mjs';
import {CEILING_COLOR} from './ceiling-finish.mjs';

// Owner photos: a matte, neutral white ceiling that reads almost as bright as the walls.
test('R177 ceiling is neutral white and receives enough floor bounce',()=>{
 for(const hex of [CEILING_COLOR,ARCHITECTURAL_MATERIALS.ceiling.color]){const c=new Color(hex);assert(c.r>.9&&c.g>.9&&c.b>.9);assert(c.r-c.b<.02,'ceiling paint must not read cream');}
 assert.equal(ARCHITECTURAL_MATERIALS.ceiling.envMapIntensity,CEILING_BOUNCE);assert(CEILING_BOUNCE>ARCHITECTURAL_MATERIALS.wall.envMapIntensity);
 const {width,height,data}=interiorProbePixels({width:64,height:32});
 // Mean radiance of the lower hemisphere (what a downward-facing ceiling integrates).
 let sum=[0,0,0],n=0;for(let y=0;y<height/2;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;for(let k=0;k<3;k++)sum[k]+=data[i+k];n++;}
 const [r,g,b]=sum.map(v=>v/n);
 assert(g>.5,'floor/wall bounce too dim for a white ceiling: '+g.toFixed(3));
 assert(r/b<1.07,'bounce light too warm; ceiling would read beige: '+(r/b).toFixed(3));
});
