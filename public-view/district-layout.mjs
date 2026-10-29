// Positions are relative to 4102 in metres. The drawing provides plot-1410
// anchors; the remaining centres are fitted to the same-height roofs in the
// official labelled aerial (1920 x 1080), with perspective correction.
// This is a reference-image reconstruction, not a surveyed development plan.
// Calibration controls and assumptions: scripts/district-layout-calibration.json.
export const DISTRICT=[
 {id:'4102',x:0,z:0,angle:0},
 {id:'4101',x:-5.1,z:54,angle:0},
 {id:'4093',x:-4,z:103.5,angle:0},
 {id:'4092',x:0,z:149.1,angle:0},
 {id:'4103',x:69.4,z:1.9,angle:Math.PI/2},
 {id:'3461',x:140.9,z:22.9,angle:0,mirror:true},
 {id:'3471',x:138.5,z:106,angle:0,mirror:true},
 {id:'4091',x:69.4,z:149.1,angle:Math.PI/2}
];
export const PLAN_CENTER=[11.7114,-3.9885];
export const PLAN_ROTATION=Math.PI/2;
export function districtPoint([x,z],building){
 const dx=(x-PLAN_CENTER[0])*(building.mirror?-1:1),dz=z-PLAN_CENTER[1],a=building.angle+PLAN_ROTATION,c=Math.cos(a),s=Math.sin(a);
 return [PLAN_CENTER[0]+building.x+dx*c+dz*s,PLAN_CENTER[1]+building.z-dx*s+dz*c];
}
export const PLAN_BOUNDS={minX:-4.0547,maxX:27.4775,minZ:-23.5998,maxZ:15.6228};
export const DISTRICT_GROUND={west:-34,east:186,north:-43,south:184,promenadeX:112,parkingAisleX:46.5};
// All copies are quarter turns/reflections, so these bounds are exact for the
// rectangular envelope and are also used to keep paths/trees out of buildings.
export function districtFootprint(building,padding=0){
 const halfX=(PLAN_BOUNDS.maxZ-PLAN_BOUNDS.minZ)/2,halfZ=(PLAN_BOUNDS.maxX-PLAN_BOUNDS.minX)/2;
 const rotated=Math.abs(Math.sin(building.angle))>.5,x=PLAN_CENTER[0]+building.x,z=PLAN_CENTER[1]+building.z;
 const hx=(rotated?halfZ:halfX)+padding,hz=(rotated?halfX:halfZ)+padding;
 return {minX:x-hx,maxX:x+hx,minZ:z-hz,maxZ:z+hz};
}
export function overlapsDistrictBuilding({x,z,w=0,d=0},padding=0){
 return DISTRICT.some(b=>{const f=districtFootprint(b,padding);return x+w/2>f.minX&&x-w/2<f.maxX&&z+d/2>f.minZ&&z-d/2<f.maxZ;});
}
