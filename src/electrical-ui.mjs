// Screen-space annotations never change the underlying survey coordinates.
export const ELECTRICAL_TARGET={width:44,height:44,gap:6};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function nearestElectricalAnchors(pointer,anchors,radius=22){
 return anchors.filter(p=>p.visible!==false).map(p=>({...p,distance:Math.hypot(p.x-pointer.x,p.y-pointer.y)})).filter(p=>p.distance<=radius).sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));
}

export function layoutElectricalCallouts(anchors,{width,height,top=8,bottom=8,padding=8,selectedId}={}){
 const w=Math.min(ELECTRICAL_TARGET.width,Math.max(44,width-padding*2)),h=44,gap=ELECTRICAL_TARGET.gap;
 const left=padding+w/2,right=Math.max(left,width-padding-w/2),upper=top+h/2,lower=Math.max(upper,height-bottom-h/2),placed=[];
 const candidates=anchors.filter(p=>p.visible!==false&&Number.isFinite(p.x)&&Number.isFinite(p.y));
 candidates.sort((a,b)=>(b.id===selectedId)-(a.id===selectedId)||a.id.localeCompare(b.id));
 for(const p of candidates){
  const ax=clamp(p.x,left,right),ay=clamp(p.y,upper,lower),choices=[{x:ax,y:ay-36},{x:ax,y:ay+36}];
  for(let y=upper;y<=lower+.1;y+=h+gap)for(let x=left;x<=right+.1;x+=w+gap)choices.push({x,y});
  choices.push({x:right,y:lower});
  const free=choices.map(c=>({x:clamp(c.x,left,right),y:clamp(c.y,upper,lower)})).filter(c=>placed.every(q=>Math.abs(q.x-c.x)>=w+gap||Math.abs(q.y-c.y)>=h+gap));
  free.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
  // A compact viewport may have fewer slots. The point selector still lists all IDs.
  if(free[0])placed.push({...p,...free[0],anchorX:p.x,anchorY:p.y,width:w,height:h});
 }
 return placed;
}

export function electricalPhotoCrop(rect,zoomed){
 if(!rect||!zoomed)return {x:0,y:0,width:1,height:1};
 const [x,y,w,h]=rect,size=Math.min(1,Math.max(.24,w*3.5,h*3.5));
 return {x:clamp(x+w/2-size/2,0,1-size),y:clamp(y+h/2-size/2,0,1-size),width:size,height:size};
}

export function electricalPhotoAnchors(entries,crop,width,height){
 return entries.map(({point:p,rect:[x,y,w,h]})=>({id:p.id,x:((x+w/2-crop.x)/crop.width)*width,y:((y+h/2-crop.y)/crop.height)*height,visible:x+w/2>=crop.x&&x+w/2<=crop.x+crop.width&&y+h/2>=crop.y&&y+h/2<=crop.y+crop.height}));
}
