// Reconstruct solid junctions from paired wall-face runs without mutating the
// original PDF traces. Portal masks are deliberately conservative.
const wallCache=new WeakMap(),guardCache=new WeakMap();
export function polygonContains([x,y],poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const bounds=(a,b,pad=0)=>({minX:Math.min(a[0],b[0])-pad,maxX:Math.max(a[0],b[0])+pad,minZ:Math.min(a[1],b[1])-pad,maxZ:Math.max(a[1],b[1])+pad});
const overlaps=(a,b)=>a.minX<b.maxX-.001&&a.maxX>b.minX+.001&&a.minZ<b.maxZ-.001&&a.maxZ>b.minZ+.001;
export function wallFootprint(w){const vertical=Math.abs(w.a[0]-w.b[0])<.01,b=bounds(w.a,w.b);if(vertical){b.minX-=w.width/2;b.maxX+=w.width/2;}else{b.minZ-=w.width/2;b.maxZ+=w.width/2;}return b;}
export function connectedWallRuns(source,floor,extraDoors=[]){
 if(wallCache.has(source))return wallCache.get(source);
 const originals=source.walls,adjusted=originals.map((w,i)=>({...w,a:[...w.a],b:[...w.b],sourceWallIndex:i}));
 const portals=[...source.doors,...extraDoors].map(d=>bounds(d.hinge,d.closed,.065));for(const e of source.entries||[])if(e.threshold)portals.push(bounds(...e.threshold,.065));
 for(const l of source.lifts||[]){const [x,z]=l.doorCenter;portals.push({minX:x-.2,maxX:x+.2,minZ:z-l.width/2-.08,maxZ:z+l.width/2+.08});}
 for(const path of floor.envelope)for(const o of path.openings)portals.push(bounds(o.a,o.b,.055));
 for(let i=0;i<originals.length;i++)for(let j=i+1;j<originals.length;j++){
  const a=originals[i],b=originals[j],av=Math.abs(a.a[0]-a.b[0])<.01,bv=Math.abs(b.a[0]-b.b[0])<.01;if(av===bv)continue;
  const q=[av?a.a[0]:b.a[0],av?b.a[1]:a.a[1]],limit=(a.width+b.width)/2+.012,candidates=[];let invalid=false;
  for(const [w,index,vertical] of [[a,i,av],[b,j,bv]]){const axis=vertical?1:0,lo=Math.min(w.a[axis],w.b[axis]),hi=Math.max(w.a[axis],w.b[axis]),value=q[axis];if(value>=lo-.001&&value<=hi+.001)continue;const endpoint=Math.abs(w.a[axis]-value)<Math.abs(w.b[axis]-value)?'a':'b',distance=Math.min(Math.abs(value-lo),Math.abs(value-hi));if(distance>limit){invalid=true;break;}const end=w[endpoint],toward=value<lo?-1:1,next=[...end];next[axis]=value+toward*.002;const extension=wallFootprint({...w,a:end,b:next});if(portals.some(p=>overlaps(p,extension))){invalid=true;break;}candidates.push({index,endpoint,next,axis});}
  if(invalid||!candidates.length)continue;
  for(const c of candidates){const target=adjusted[c.index][c.endpoint],w=originals[c.index],direction=w[c.endpoint][c.axis]-w[c.endpoint==='a'?'b':'a'][c.axis];if((c.next[c.axis]-target[c.axis])*direction>0){adjusted[c.index][c.endpoint]=c.next;adjusted[c.index].junctionReconstructed=true;}}
 }
 wallCache.set(source,adjusted);return adjusted;
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
