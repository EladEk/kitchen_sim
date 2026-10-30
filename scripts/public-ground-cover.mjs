import clipping from 'polygon-clipping';
import {rectanglePolygon} from '../public-view/site-layout.mjs';

// Compile real holes in the grass, rather than stacking a whole green plane
// a few centimetres below every road and bay. No GPU depth precision is then
// needed to decide between grass and paving at the same map coordinate.
export function publicGroundCover(layout){
 const hardscape=clipping.union(...[
  ...layout.roadSurfaces.map(rectanglePolygon),
  ...layout.parking.map(b=>b.polygon),
  ...layout.sidewalks.map(w=>w.polygon)
 ].map(p=>[p]));
 const gardens=layout.gardens.map(g=>[g.polygon]),islands=layout.islands.map(r=>[rectanglePolygon(r)]);
 const {west,east,north,south}=layout.bounds;
 const base=rectanglePolygon({minX:west,maxX:east,minZ:north,maxZ:south});
 return {revision:100,grass:[
  {y:-.09,polygons:clipping.difference([base],hardscape,...gardens,...islands)},
  {y:-.032,polygons:clipping.difference(gardens,hardscape)},
  {y:-.01,polygons:islands.length?clipping.difference(islands,hardscape):[]}
 ]};
}
