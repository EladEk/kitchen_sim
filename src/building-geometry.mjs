// Reconstruct solid junctions from paired wall-face runs without mutating the
// original PDF traces. Portal masks are deliberately conservative.
const wallCache=new WeakMap(),guardCache=new WeakMap();
export function polygonContains([x,y],poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const bounds=(a,b,pad=0)=>({minX:Math.min(a[0],b[0])-pad,maxX:Math.max(a[0],b[0])+pad,minZ:Math.min(a[1],b[1])-pad,maxZ:Math.max(a[1],b[1])+pad});
const overlaps=(a,b)=>a.minX<b.maxX-.001&&a.maxX>b.minX+.001&&a.minZ<b.maxZ-.001&&a.maxZ>b.minZ+.001;
export function wallFootprint(w){const vertical=Math.abs(w.a[0]-w.b[0])<.01,b=bounds(w.a,w.b);if(vertical){b.minX-=w.width/2;b.maxX+=w.width/2;}else{b.minZ-=w.width/2;b.maxZ+=w.width/2;}return b;}
function openingFootprint(a,b,normal=.025,inset=.015){
 const vertical=Math.abs(a[0]-b[0])<Math.abs(a[1]-b[1]),box=bounds(a,b),axis=vertical?'Z':'X',other=vertical?'X':'Z';
 box['min'+axis]+=inset;box['max'+axis]-=inset;box['min'+other]-=normal;box['max'+other]+=normal;return box;
}
export function wallPortals(source,floor,extraDoors=[]){
 const portals=[...source.doors,...extraDoors].map(d=>({...openingFootprint(d.hinge,d.closed),kind:'door',id:d.id}));
 for(const e of source.entries||[])if(e.threshold)portals.push({...openingFootprint(...e.threshold),kind:'entry',id:e.doorId});
 for(const l of source.lifts||[]){const [x,z]=l.doorCenter;portals.push({minX:x-.2,maxX:x+.2,minZ:z-l.width/2+.015,maxZ:z+l.width/2-.015,kind:'lift',id:l.id});}
 for(const path of floor.envelope)for(const o of path.openings)portals.push({...openingFootprint(o.a,o.b),kind:o.kind});
 return portals;
}
// A short inline gap is closed only when a continuous black architectural
// face in the source PDF crosses it. Proximity alone never fills a doorway.
export function sourceFaceCovers(source,axis,coordinate,lo,hi){
 const spans=(source.wallFaces||[]).filter(f=>f[0]===axis&&Math.abs(f[1]-coordinate)<.0045&&f[3]>=lo-.0045&&f[2]<=hi+.0045).sort((a,b)=>a[2]-b[2]);
 let cursor=lo;for(const f of spans){if(f[2]>cursor+.0045)break;cursor=Math.max(cursor,f[3]);if(cursor>=hi-.0045)return true;}return false;
}
function supportedEnd(source,w,from,to){const v=Math.abs(w.a[0]-w.b[0])<.01,axis=v?1:0,normal=v?0:1;return [-1,1].some(sign=>sourceFaceCovers(source,normal,w.a[normal]+sign*w.width/2,Math.min(from[axis],to[axis]),Math.max(from[axis],to[axis])));}
export function doorWallOpening(source,door){
 const vertical=Math.abs(door.hinge[0]-door.closed[0])<.01,axis=vertical?1:0,normal=vertical?0:1,lo=Math.min(door.hinge[axis],door.closed[axis]),hi=Math.max(door.hinge[axis],door.closed[axis]),line=(door.hinge[normal]+door.closed[normal])/2,sides=[],jambs=[];
 for(const endpoint of [lo,hi]){const candidates=(source.wallFaces||[]).filter(f=>f[0]===axis&&Math.abs(f[1]-endpoint)<.16&&f[3]-f[2]>=.072&&f[3]-f[2]<=.425&&line>=f[2]-.035&&line<=f[3]+.035).sort((a,b)=>Math.abs(a[1]-endpoint)-Math.abs(b[1]-endpoint));if(candidates.length)jambs.push(candidates[0]);}
 for(const side of [-1,1]){
  let best=null;for(let i=0;i<source.walls.length;i++){
   const w=source.walls[i];if((Math.abs(w.a[0]-w.b[0])<.01)!==vertical)continue;
   const a=Math.min(w.a[axis],w.b[axis]),b=Math.max(w.a[axis],w.b[axis]),end=side<0?b:a,gap=side<0?lo-end:end-hi,offset=Math.abs(w.a[normal]-line);
   if(gap<-.035||gap>.25||offset>w.width/2+.035)continue;const score=Math.abs(gap)+offset*.2;
   if(!best||score<best.score)best={w,index:i,end,score};
  }if(best)sides.push(best);
 }
 const useJambs=jambs.length&&Math.max(...jambs.map(f=>f[3]))-Math.min(...jambs.map(f=>f[2]))<=.425,alignedHost=sides.length===2&&Math.abs(sides[0].w.a[normal]-sides[1].w.a[normal])<.012&&Math.abs(sides[0].w.width-sides[1].w.width)<.012,useJambWidth=useJambs&&!alignedHost;
 // Short jamb strokes may describe the frame rebate. Where two aligned wall
 // faces establish the host, its full thickness also continues above the door.
 const min=useJambWidth?Math.min(...jambs.map(f=>f[2])):sides.length?Math.min(...sides.map(s=>s.w.a[normal]-s.w.width/2)):line-.065,max=useJambWidth?Math.max(...jambs.map(f=>f[3])):sides.length?Math.max(...sides.map(s=>s.w.a[normal]+s.w.width/2)):line+.065,start=Math.min(lo,...(useJambs?jambs.filter(f=>f[1]<=(lo+hi)/2).map(f=>f[1]):sides.filter(s=>s.end<=lo+.035).map(s=>s.end)))-.002,end=Math.max(hi,...(useJambs?jambs.filter(f=>f[1]>=(lo+hi)/2).map(f=>f[1]):sides.filter(s=>s.end>=hi-.035).map(s=>s.end)))+.002,c=(min+max)/2;
 return {a:vertical?[c,start]:[start,c],b:vertical?[c,end]:[end,c],width:max-min,hostWalls:sides.map(s=>s.index),jambFaces:useJambs?jambs:[],basis:useJambWidth?'pdf-jamb-caps':sides.length?'adjacent-pdf-wall-faces':'door-fallback'};
}
export function connectedWallRuns(source,floor,extraDoors=[]){
 let byFloor=wallCache.get(source);if(!byFloor){byFloor=new WeakMap();wallCache.set(source,byFloor);}let byDoors=byFloor.get(floor);if(!byDoors){byDoors=new Map();byFloor.set(floor,byDoors);}const doorKey=extraDoors.map(d=>d.id||JSON.stringify([d.hinge,d.closed])).join('|');if(byDoors.has(doorKey))return byDoors.get(doorKey);
 const originals=source.walls,adjusted=originals.map((w,i)=>({...w,a:[...w.a],b:[...w.b],sourceWallIndex:i}));
 const portals=wallPortals(source,floor,extraDoors);
 for(let i=0;i<originals.length;i++)for(let j=i+1;j<originals.length;j++){
  const a=originals[i],b=originals[j],av=Math.abs(a.a[0]-a.b[0])<.01,bv=Math.abs(b.a[0]-b.b[0])<.01;if(av===bv)continue;
  const q=[av?a.a[0]:b.a[0],av?b.a[1]:a.a[1]],limit=(a.width+b.width)/2+.012,candidates=[];let invalid=false;
  for(const [w,other,index,vertical] of [[a,b,i,av],[b,a,j,bv]]){
   const axis=vertical?1:0,lo=Math.min(w.a[axis],w.b[axis]),hi=Math.max(w.a[axis],w.b[axis]),value=q[axis],outside=value<lo-.001||value>hi+.001;
   if(!outside&&Math.min(value-lo,hi-value)>other.width/2+.012)continue;
   const endpoint=Math.abs(w.a[axis]-value)<Math.abs(w.b[axis]-value)?'a':'b',end=w[endpoint],toward=end[axis]>w[endpoint==='a'?'b':'a'][axis]?1:-1,distance=outside?Math.min(Math.abs(value-lo),Math.abs(value-hi)):0;
   if(distance>limit){invalid=true;break;}
   const next=[...end],outer=[...end];outer[axis]=value+toward*(other.width/2+.002);
   // Meeting centre lines leaves the outside quarter of an L corner empty.
   // Continue to the opposite face when the PDF actually carries that face.
   const complete=!source.wallFaces||supportedEnd(source,w,end,outer);next[axis]=value+toward*(complete?other.width/2+.002:.002);
   if((next[axis]-end[axis])*toward<=.0005)continue;
   let extension=wallFootprint({...w,a:end,b:next});
   if(portals.some(p=>overlaps(p,extension))){next[axis]=value+toward*.002;if((next[axis]-end[axis])*toward<=.0005){invalid=true;break;}extension=wallFootprint({...w,a:end,b:next});if(portals.some(p=>overlaps(p,extension))){invalid=true;break;}}
   candidates.push({index,endpoint,next,axis,complete});
  }
  if(invalid||!candidates.length)continue;
  for(const c of candidates){const target=adjusted[c.index][c.endpoint],w=originals[c.index],direction=w[c.endpoint][c.axis]-w[c.endpoint==='a'?'b':'a'][c.axis];if((c.next[c.axis]-target[c.axis])*direction>0){adjusted[c.index][c.endpoint]=c.next;adjusted[c.index].junctionReconstructed=true;adjusted[c.index].cornerFaceCompleted||=c.complete;}}
 }
 const connectors=[],seen=new Set();
 for(let i=0;i<adjusted.length;i++)for(let j=i+1;j<adjusted.length;j++){
  const a=adjusted[i],b=adjusted[j],av=Math.abs(a.a[0]-a.b[0])<.01,bv=Math.abs(b.a[0]-b.b[0])<.01;if(av!==bv)continue;
  const axis=av?1:0,normal=av?0:1,af=wallFootprint(a),bf=wallFootprint(b),low=Math.max(av?af.minX:af.minZ,av?bf.minX:bf.minZ),high=Math.min(av?af.maxX:af.maxZ,av?bf.maxX:bf.maxZ);if(high-low<.07)continue;
  const alo=Math.min(a.a[axis],a.b[axis]),ahi=Math.max(a.a[axis],a.b[axis]),blo=Math.min(b.a[axis],b.b[axis]),bhi=Math.max(b.a[axis],b.b[axis]);let start,end;
  if(ahi<blo){start=ahi;end=blo;}else if(bhi<alo){start=bhi;end=alo;}else continue;
  if(end-start<.003||end-start>.425||![low,high].some(c=>sourceFaceCovers(source,normal,c,start,end)))continue;
  const aa=av?[(low+high)/2,start-.002]:[start-.002,(low+high)/2],bb=av?[(low+high)/2,end+.002]:[end+.002,(low+high)/2],w={a:aa,b:bb,width:high-low,basis:'pdf-continuous-wall-face',sourceWallIndex:null,joinedWalls:[i,j],junctionReconstructed:true};
  if(portals.some(p=>overlaps(p,wallFootprint(w))))continue;const key=[...aa,...bb,w.width].map(n=>n.toFixed(4)).join(',');if(seen.has(key))continue;seen.add(key);connectors.push(w);
 }
 adjusted.push(...connectors);byDoors.set(doorKey,adjusted);return adjusted;
}
// A balcony edge can be partly behind a wall and partly exposed. Classify
// intervals, not whole edges, and share this exact result with collision.
export function exposedBalconySegments(floor){
 if(guardCache.has(floor))return guardCache.get(floor);const result=[],probe=.13;
 floor.balconies.forEach((poly,balcony)=>poly.forEach((a,edge)=>{const b=poly[(edge+1)%poly.length],r=[b[0]-a[0],b[1]-a[1]],length=Math.hypot(...r);if(length<.01)return;const n=[r[1]/length,-r[0]/length],cuts=[0,1];
  for(const sign of [-1,1]){const origin=[a[0]+n[0]*probe*sign,a[1]+n[1]*probe*sign];for(const p of floor.envelope)for(let i=0;i<p.polygon.length;i++){const c=p.polygon[i],d=p.polygon[(i+1)%p.polygon.length],s=[d[0]-c[0],d[1]-c[1]],den=cross(r,s);if(Math.abs(den)<1e-9)continue;const delta=[c[0]-origin[0],c[1]-origin[1]],t=cross(delta,s)/den,u=cross(delta,r)/den;if(t>0&&t<1&&u>=-1e-8&&u<=1+1e-8)cuts.push(t);}}
  const sorted=[...new Set(cuts.map(t=>Math.round(t*1e8)/1e8))].sort((x,y)=>x-y),at=t=>[a[0]+r[0]*t,a[1]+r[1]*t];
  for(let i=1;i<sorted.length;i++){const start=sorted[i-1],end=sorted[i];if((end-start)*length<.012)continue;const middle=at((start+end)/2),covered=floor.envelope.some(p=>[-1,1].some(sign=>polygonContains([middle[0]+n[0]*probe*sign,middle[1]+n[1]*probe*sign],p.polygon)));if(!covered)result.push({a:at(start),b:at(end),balcony,edge,span:[start,end]});}
 }));guardCache.set(floor,result);return result;
}
export function commonStairRails(source,storey){
 const [a,b]=source.stairs.rect,mx=(a[0]+b[0])/2,n=a[1]+1.55,s=b[1]-1.14;
 return [{a:[mx-.075,0,n],b:[mx-.075,storey/2,s]},{a:[mx+.075,storey,n],b:[mx+.075,storey/2,s]}];
}
export function duplexFlightRails(d,storey){
 if(!d)return [];const [a,b]=d.longFlightRect,[c,e]=d.shortFlightRect,[la,lb]=d.cornerLandingRect,out=[];
 for(const x of [a[0]+.035,b[0]-.035])out.push({a:[x,0,b[1]],b:[x,storey*.75,a[1]]});
 for(const z of [c[1]+.035,e[1]-.035])out.push({a:[e[0],storey*.75,z],b:[c[0],storey,z]});
 out.push({a:[lb[0]-.035,storey*.75,la[1]+.035],b:[lb[0]-.035,storey*.75,lb[1]]},{a:[la[0],storey*.75,la[1]+.035],b:[lb[0]-.035,storey*.75,la[1]+.035]});return out;
}

export function duplexLandingGuards(d){if(!d)return [];const [a,b]=d.longFlightRect,[c,e]=d.shortFlightRect,poly=[[c[0],c[1]],[b[0],c[1]],[b[0],b[1]],[a[0],b[1]],[a[0],e[1]],[c[0],e[1]]];return poly.slice(0,-1).map((a,i)=>({a,b:poly[i+1]}));}
