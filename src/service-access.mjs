// Horizontal extents from page 3. Seven steps/depth follow the video as an
// illustrative reconstruction: no surveyed section/elevation was supplied.
export const SERVICE_ACCESS={minX:18.45,maxX:19.65,topZ:-5.65,bottomZ:-7.95,landingZ:-8.95,depth:1.05,steps:7};
export const SERVICE_ROOM_POLYGONS={pump:[[13.95,-8.05],[17.199,-8.05],[17.199,-8.9],[18.249,-8.9],[18.249,-5.35],[13.95,-5.35]],meters:[[19.85,-9.0996],[23.4484,-9.0996],[23.4484,-5.91],[19.85,-5.91]]};
const inside=([x,z],poly)=>{let v=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!=(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])v=!v;}return v;};
export function serviceFloorHeight(p,level=0){if(level!==0)return null;const a=SERVICE_ACCESS,[x,z]=p;
 if(x>=a.minX-.12&&x<=a.maxX+.25&&z<=a.topZ+.02&&z>=a.landingZ-.05)return -a.depth*Math.max(0,Math.min(1,(a.topZ-z)/(a.topZ-a.bottomZ)));
 if(Object.values(SERVICE_ROOM_POLYGONS).some(poly=>inside(p,poly))||x>=18.20&&x<=19.95&&z<=-7.9&&z>=-9.0)return -a.depth;
 return null;
}
export const serviceSlabHoles=()=>[...Object.values(SERVICE_ROOM_POLYGONS),[[18.449,-8.95],[19.751,-8.95],[19.751,-5.65],[18.449,-5.65]]];
export const serviceApproach={minX:18.45,maxX:19.75,minZ:-5.70,maxZ:-4.85};
