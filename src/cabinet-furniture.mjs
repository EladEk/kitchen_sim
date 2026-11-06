// Cabinet bodies are hollow; fronts, rails, handles and glass use separated planes.
export const CABINET_KINDS=Object.freeze(['sliding_wardrobe','wardrobe_open','wardrobe_drawers','service_cabinet','wall_storage','cube_storage','kitchen_base_doors','kitchen_sink','kitchen_corner','kitchen_pantry','kitchen_oven_tower','kitchen_wall_glass','kitchen_hood_cabinet','kitchen_open_shelf']);
export function cabinetFurnitureParts({kind,w,d,h}){
 if(!CABINET_KINDS.includes(kind))return null;
 const parts=[],b=Math.min(.025,w*.07,d*.07,h*.06),gap=Math.min(.006,d*.025,h*.015),pull=Math.min(.032,d*.12),open=['wardrobe_open','cube_storage','kitchen_open_shelf'].includes(kind),reserve=open?0:pull+b+gap+(kind==='sliding_wardrobe'?b+gap:0),front=d/2-reserve,face=d/2-pull-b/2;
 const add=(part,material,x,y,z,W,H,D)=>{if(W>0&&H>0&&D>0)parts.push({part,material,box:[x,y,z,W,H,D]});};
 function shell(y0=0,y1=h,{x=0,W=w,edge=front}={}){const H=y1-y0,D=edge+d/2,z=(edge-d/2)/2;for(const s of [-1,1])add('side-'+s,'wood',x+s*(W-b)/2,(y0+y1)/2,z,b,H,D);for(const y of [y0+b/2,y1-b/2])add('case-horizontal-'+y,'wood',x,y,z,W-b*2,b,D);add('case-back','wood',x,(y0+y1)/2,-d/2+b/2,W-b*2,H-b*2,b);}
 function shelf(tag,y,{x=0,W=w}={}){add(tag,'wood',x,y,(front-d/2+b)/2,W-b*2,b,front+d/2-b);}
 function handle(tag,x,y,W,H,z=face+b/2){add(tag,'metal',x,y,z+pull/2,Math.min(.018,W*.08),Math.min(.22,H*.35),pull);}
 function door(tag,x,W,y0,y1){add(tag,'paint',x,(y0+y1)/2,face,W-gap*2,y1-y0-gap*2,b);handle(tag+'-handle',x+W*.31,(y0+y1)/2,W,y1-y0);}
 function doors(y0,y1,n=2,{x=0,W=w}={}){for(let i=0;i<n;i++){const dw=W/n;door('door-'+i,x-W/2+(i+.5)*dw,dw,y0,y1);}}
 function drawers(y0,y1,n=3){for(let i=0;i<n;i++){const H=(y1-y0)/n,y=y0+(i+.5)*H;add('drawer-'+i,'paint',0,y,face,w-gap*2,H-gap*2,b);add('drawer-handle-'+i,'metal',0,y,face+b/2+pull/2,w*.3,Math.min(.016,H*.1),pull);}}
 function toe(k){add('recessed-plinth','paint',0,k/2,-d*.10,w*.9,k,d*.7);}
 function counter(y=h,th=Math.min(.04,h*.08)){add('countertop','countertop',0,y-th/2,0,w,th,d);}
 if(kind==='sliding_wardrobe'){
  shell();const W=w*.54-gap;for(const [i,s]of [[0,-1],[1,1]]){const x=s*(w/2-W/2-gap),z=face-(i?0:b+gap);add('sliding-door-'+i,'paint',x,h/2,z,W,h*.9,b);add('sliding-grip-'+i,'metal',x+s*W*.36,h*.51,z+b/2+pull/2,Math.min(.014,W*.04),h*.24,pull);}
  for(const y of [h*.025,h*.975])add('sliding-track-'+y,'metal',0,y,face-(b+gap)/2,w-gap*2,Math.min(b,h*.025),b*2+gap);
 }else if(kind==='wardrobe_open'){
  shell();add('hanging-divider','wood',w*.18,h/2,0,b,h-b*2,d-b);add('hanging-rail','metal',-w*.16,h*.79,0,w*.60,b,b*1.2);shelf('upper-hat-shelf',h*.88);for(let i=1;i<=4;i++)shelf('folded-shelf-'+i,h*i/5,{x:w*.34,W:w*.28});
 }else if(kind==='wardrobe_drawers'){
  shell();drawers(b,h*.34,3);doors(h*.35,h-b,Math.max(2,Math.ceil(w/.75)));shelf('drawer-divider',h*.345);
 }else if(kind==='service_cabinet'){
  shell();doors(b,h-b,w>.95?2:1);for(const y of [.25,.5,.75])shelf('utility-shelf-'+y,h*y);for(let i=0;i<5;i++)add('vent-'+i,'metal',0,h*(.10+i*.018),face+b/2+gap+pull*.15,w*.38,Math.min(.01,h*.008),pull*.3);
 }else if(kind==='wall_storage'){
  shell();doors(b,h-b,Math.max(2,Math.ceil(w/.65)));shelf('wall-mid-shelf',h*.5);
 }else if(kind==='cube_storage'){
  shell();for(let i=1;i<3;i++){add('cube-divider-'+i,'wood',-w/2+b+(w-b*2)*i/3,h/2,0,b,h-b*2,d-b);shelf('cube-shelf-'+i,h*i/3);}
 }else if(kind==='kitchen_base_doors'||kind==='kitchen_sink'||kind==='kitchen_corner'){
  const k=Math.min(.12,h*.15),cap=Math.min(.04,h*.08),y1=h-cap-gap;toe(k);shell(k,y1,kind==='kitchen_corner'?{x:-reserve/2,W:w-reserve}:{});
  if(kind==='kitchen_corner'){door('corner-front-door',-w*.16,w*.6,k+b,y1-b);add('corner-side-door','paint',w/2-pull-b/2,(k+y1)/2,-d*.05,b,y1-k-b*2,d*.78);add('corner-side-handle','metal',w/2-pull/2,h*.52,-d*.18,pull,Math.min(.18,h*.22),Math.min(.018,d*.06));counter();}
  else if(kind==='kitchen_base_doors'){doors(k+b,y1-b,Math.max(2,Math.ceil(w/.65)));shelf('base-shelf',(k+y1)/2);counter();}
  else{
   doors(k+b,y1-b,2);const W=w*.58,D=d*.57,t=Math.min(.012,b*.6),depth=Math.min(.18,h*.2),Y=h-cap;
   for(const sign of [-1,1]){add('sink-counter-side-'+sign,'countertop',sign*(w+W)/4,h-cap/2,0,(w-W)/2,cap,d);add('sink-counter-edge-'+sign,'countertop',0,h-cap/2,sign*(d+D)/4,W,cap,(d-D)/2);add('sink-wall-x-'+sign,'metal',sign*(W-t)/2,Y-depth/2,0,t,depth,D);add('sink-wall-z-'+sign,'metal',0,Y-depth/2,sign*(D-t)/2,W-t*2,depth,t);add('sink-rim-x-'+sign,'metal',sign*(W-t)/2,h-t/2,0,t,t,D);add('sink-rim-z-'+sign,'metal',0,h-t/2,sign*(D-t)/2,W-t*2,t,t);}
   add('sink-basin-bottom','metal',0,Y-depth+t/2,0,W-t*2,t,D-t*2);add('sink-drain','screen',0,Y-depth+t+gap,0,Math.min(.06,W*.12),t*.3,Math.min(.06,D*.15));
  }
 }else if(kind==='kitchen_pantry'){
  const k=Math.min(.12,h*.06);toe(k);shell(k,h);drawers(k+b,h*.24,2);door('pantry-tall-front',0,w,h*.25,h-b);for(let i=1;i<=4;i++)shelf('pantry-shelf-'+i,h*(.25+i*.14));
 }else if(kind==='kitchen_oven_tower'){
  const k=Math.min(.12,h*.06);toe(k);shell(k,h);drawers(k+b,h*.24,1);doors(h*.80,h-b,1);
  for(const [tag,cy,H]of [['oven',h*.405,h*.25],['microwave',h*.68,h*.18]]){add(tag+'-frame','metal',0,cy,face,w*.88,H,b);const z=face+b/2+gap+b*.15;add(tag+'-glass','screen',0,cy-H*.08,z,w*.73,H*.65,b*.3);add(tag+'-control','metal',0,cy+H*.36,z,w*.72,H*.10,b*.3);add(tag+'-handle','metal',0,cy+H*.24,d/2-pull/2,w*.55,Math.min(.018,H*.08),pull);}
 }else if(kind==='kitchen_wall_glass'){
  shell();shelf('glass-mid-shelf',h*.5);const n=Math.max(2,Math.ceil(w/.65)),W=w/n,f=Math.min(b*1.4,W*.14),H=h-b*2;
  for(let i=0;i<n;i++){const x=-w/2+(i+.5)*W,ww=W-gap*2;for(const sign of [-1,1]){add('glass-door-vertical-'+i+'-'+sign,'paint',x+sign*(ww-f)/2,h/2,face,f,H,b);add('glass-door-horizontal-'+i+'-'+sign,'paint',x,h/2+sign*(H-f)/2,face,ww-f*2,f,b);}add('glass-pane-'+i,'glass',x,h/2,face,ww-f*2-gap*2,H-f*2-gap*2,b*.25);handle('glass-handle-'+i,x+(ww-f)/2,h/2,W,H);}
 }else if(kind==='kitchen_hood_cabinet'){
  shell(h*.25,h);doors(h*.25+b,h-b,2);add('hood-housing','metal',0,h*.13,0,w*.92,h*.10,d*.94);for(let i=0;i<5;i++)add('hood-filter-'+i,'screen',(i-2)*w*.15,h*.08-gap-b*.08,0,w*.1,b*.15,d*.65);
 }else if(kind==='kitchen_open_shelf'){
  shell();shelf('open-kitchen-mid-shelf',h*.5);add('open-kitchen-divider','wood',0,h*.75,0,b,h*.5-b,d-b);
 }
 return parts;
}
