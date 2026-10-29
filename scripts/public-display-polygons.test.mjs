import test from 'node:test';import assert from 'node:assert/strict';import {BUILDING_FLOORS} from '../src/building-layout.mjs';import {unitDisplayPolygons,displayTriangles} from './public-display-polygons.mjs';import {inside} from '../public-view/navigation.mjs';
test('all source balconies and split penthouse terrace pieces remain covered by public display outlines',()=>{
 for(const f of BUILDING_FLOORS){const displays=unitDisplayPolygons(f),polys=[...displays.values()].flat(),triangles=[...displays.values()].flatMap(p=>displayTriangles(p));assert([...displays.values()].flat(2).every(p=>p.every(Number.isFinite)));
  for(const balcony of f.balconies){const xs=balcony.map(p=>p[0]),zs=balcony.map(p=>p[1]);let checked=0;for(let x=Math.min(...xs)+.19;x<Math.max(...xs);x+=.41)for(let z=Math.min(...zs)+.19;z<Math.max(...zs);z+=.41)if(inside([x,z],balcony)){assert(triangles.some(p=>inside([x,z],p)),`floor${f.level} loses balcony ${x},${z}`);checked++;}assert(checked>0);}
 }
 const p=unitDisplayPolygons(BUILDING_FLOORS[7]);assert(p.get(40).some(poly=>inside([0,-4],poly)));assert(p.get(41).some(poly=>inside([0,-3],poly)));
});
