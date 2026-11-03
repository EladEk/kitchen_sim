import clipping from 'polygon-clipping';
import {rectanglePolygon} from '../public-view/site-layout.mjs';
import {DISTRICT,districtPoint} from '../public-view/district-layout.mjs';
import {serviceSlabHoles} from '../src/service-access.mjs';
import {contextPolygon} from '../public-view/context-scene.mjs';

// Compile real holes in the grass, rather than stacking a whole green plane
// a few centimetres below every road and bay. No GPU depth precision is then
// needed to decide between grass and paving at the same map coordinate.
export function publicGroundCover(layout){
 const hardscape=clipping.union(...[
  ...layout.roadSurfaces.map(rectanglePolygon),
  ...layout.parking.map(b=>b.polygon),
  ...layout.context.parkingCourts.map(contextPolygon),
  ...layout.context.buildings.map(b=>contextPolygon(b.bounds))
 ].map(p=>[p]),...layout.sidewalks.map(w=>[w.polygon,...(w.holes||[])]));
 const publicBeds=layout.landscape.courtyards?.beds||[],beds=publicBeds.flatMap(b=>b.polygons);
 const gardens=layout.gardens.map(g=>[g.polygon]),islands=layout.islands.map(r=>[rectanglePolygon(r)]).concat(publicBeds.filter(b=>b.kind==='lawn').flatMap(b=>b.polygons));
 // The development is independent of the building slabs. Its old grass base
 // bridged the service-stair void at -9cm and caught the walker's floor ray.
 const serviceVoids=DISTRICT.flatMap(b=>serviceSlabHoles().map(poly=>[poly.map(p=>districtPoint(p,b))]));
 const {west,east,north,south}=layout.bounds;
 const base=rectanglePolygon({minX:west,maxX:east,minZ:north,maxZ:south});
 return {revision:110,grass:[
  {y:-.09,polygons:clipping.difference([base],hardscape,...gardens,...islands,...beds,...serviceVoids)},
  {y:-.032,polygons:clipping.difference(gardens,hardscape,...serviceVoids)},
  {y:-.01,polygons:islands.length?clipping.difference(islands,hardscape,...serviceVoids):[]}
 ]};
}
