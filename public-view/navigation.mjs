export function inside([x,z],poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!=(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export function locationAt(position,data){const floor=Math.max(0,Math.min(8,Math.floor((position.y-1.62+.35)/data.storey))),f=data.floors[floor],unit=f.units.find(u=>inside([position.x,position.z],u.polygon))?.number;return {floor,unit};}
export function visibleAt(data,mode,level){return mode==='walk'||(data.level??0)<=level&&!data.ceiling&&(!data.roof||level===9);}
