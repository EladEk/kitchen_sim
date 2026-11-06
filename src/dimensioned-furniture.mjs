import {cabinetFurnitureParts} from './cabinet-furniture.mjs';
import {withDrawerTrays} from './cabinet-motion.mjs';
import {cornerSofaSpec} from './furniture-shape.mjs';
// All boxes are in metres, local X=width, Z=depth; the base is Y=0.
// The declared envelope includes handles, chair backs and bed headboards.
export function dimensionedFurnitureParts(item){
 const cabinet=cabinetFurnitureParts(item);if(cabinet)return withDrawerTrays(item,cabinet);
 const {kind,w,d,h}=item;
 const parts=[],add=(part,material,x,y,z,W,H,D)=>{if(W>0&&H>0&&D>0)parts.push({part,material,box:[x,y,z,W,H,D]});},board=Math.min(.025,w*.08,d*.08,h*.08),feet=Math.min(.06,w*.08,d*.08),top=()=>add('top','wood',0,h-board/2,0,w,board,d),legs=(height,spread=.82)=>{for(const x of [-1,1])for(const z of [-1,1])add(`leg-${x}-${z}`,'metal',x*(w-feet)*spread/2,height/2,z*(d-feet)*spread/2,feet,height,feet);};
 const carcass=(tag,H,D,z)=>{add(tag,'wood',0,H/2,-d/2+board/2,w-board*2,H,board);for(const sign of [-1,1])add('case-side-'+sign,'wood',sign*(w-board)/2,H/2,z,board,H,D);for(const y of [board/2,H-board/2])add('case-horizontal-'+y,'wood',0,y,z,w-board*2,board,D);};
 if(['wardrobe','shoe_cabinet','kitchen_tall','kitchen_wall'].includes(kind)){const handle=Math.min(.035,d*.12),gap=Math.min(.006,d*.02),bodyD=d-handle-board-gap,z=-(handle+board+gap)/2;carcass('body',h,bodyD,z);for(const y of [.25,.5,.75])add('interior-shelf-'+y,'wood',0,h*y,z,w-board*2,board,bodyD-board);for(let i=0,n=Math.max(1,Math.ceil(w/.65));i<n;i++){const W=w/n,x=-w/2+(i+.5)*W;add(`door-${i}`,'paint',x,h*.51,d/2-handle-board/2,W-board*.3,h*.96,board);add(`handle-${i}`,'metal',x+W*.33,h*.52,d/2-handle/2,Math.min(.018,W*.06),Math.min(.24,h*.22),handle);}}
 else if(['desk','dining','console_table'].includes(kind)){top();legs(h-board);if(kind==='desk')add('drawers','paint',w*.29,h*.62,-d*.04,w*.32,h*.66,d*.8);}
 else if(kind==='chair'||kind==='bar_stool'){const seat=h*.49,th=Math.min(.08,h*.11);add('seat','fabric',0,seat,0,w,th,d*.88);add('back','fabric',0,(h+seat)/2,-d/2+board*2,w,h-seat,board*4);legs(seat-th/2);}
 else if(['bed','double_bed','daybed'].includes(kind)){const head=Math.min(.09,d*.08),platform=h*.22,baseD=d-head;add('frame','wood',0,platform*.7,head/2,w,platform,baseD);add('headboard','wood',0,h/2,-d/2+head/2,w,h,head);if(kind==='daybed'){add('back-rail','wood',-w/2+board,h*.65,head/2,board*2,h*.7,baseD);add('footboard','wood',0,h*.38,d/2-head/2,w,h*.76,head);}add('mattress','linen',0,h*.34,head/2,w*.97,h*.24,baseD*.98);add('duvet','linen',0,h*.48,d*.10,w*.98,h*.08,baseD*.76);const n=w>1.25?2:1;for(let i=0;i<n;i++)add('pillow-'+i,'fabric',n===1?0:(i?1:-1)*w*.24,h*.50,-d*.30,w/(n+1.1),h*.10,d*.17);}
 else if(['sofa','armchair','loveseat'].includes(kind)){const arm=Math.min(.16,w*.12);add('base','wood',0,h*.22,0,w,h*.30,d);add('seat','fabric',0,h*.46,d*.04,w-arm*2,h*.20,d*.8);add('back','fabric',0,h*.70,-d*.39,w-arm*2,h*.60,d*.22);for(const s of [-1,1])add('arm-'+s,'fabric',s*(w-arm)/2,h*.51,0,arm,h*.48,d);}
 else if(['coffee','side_table','bench'].includes(kind)){top();legs(h-board);}
 else if(kind==='corner_sofa'){
  const {depth:q,side}=cornerSofaSpec(item),a=Math.min(.15,q*.18),back=Math.min(.18,q*.22),z=(-d+q)/2,x=side*(w-q)/2;
  add('base-main','wood',0,h*.20,z,w,h*.28,q);add('base-return','wood',x,h*.20,q/2,q,h*.28,d-q);
  add('seat-main','fabric',0,h*.44,z+back/2,w-a*2,h*.20,q-back);add('seat-return','fabric',x-side*back/2,h*.44,q/2,(q-back),h*.20,d-q-a);
  add('back-main','fabric',0,h*.68,-d/2+back/2,w,h*.64,back);add('back-return','fabric',side*(w-back)/2,h*.68,q/2,back,h*.64,d-q);
  add('arm-main','fabric',-side*(w-a)/2,h*.49,z+back/2,a,h*.42,q-back);add('arm-return','fabric',x-side*back/2,h*.49,(d-a)/2,q-back,h*.42,a);
 }
 else if(kind==='chaise_longue'){
  add('base','wood',0,h*.20,0,w,h*.28,d);add('seat','fabric',0,h*.44,d*.04,w*.92,h*.20,d*.89);add('back','fabric',0,h*.68,-d*.44,w,h*.64,d*.12);add('arm','fabric',-w*.44,h*.48,0,w*.12,h*.38,d*.85);
 }
 else if(kind==='ottoman'){
  legs(h*.22);add('base','wood',0,h*.36,0,w*.96,h*.36,d*.96);add('seat','fabric',0,h*.74,0,w,h*.52,d);
 }
 else if(kind==='office_chair'){
  add('foot-x','metal',0,h*.04,0,w,h*.08,d*.14);add('foot-z','metal',0,h*.04,0,w*.14,h*.08,d);add('stem','metal',0,h*.25,0,w*.12,h*.42,d*.12);add('seat','fabric',0,h*.48,d*.03,w*.86,h*.10,d*.82);add('back','fabric',0,h*.74,-d*.40,w*.82,h*.52,d*.16);for(const x of [-1,1]){add('arm-'+x,'metal',x*w*.45,h*.61,d*.05,w*.1,h*.07,d*.65);add('arm-post-'+x,'metal',x*w*.45,h*.53,0,w*.07,h*.16,d*.07);}
 }
 else if(kind==='kitchen_island'){
  const q=Math.min(.05,h*.06);add('body','wood',0,(h-q)/2,-d*.1,w*.94,h-q,d*.76);for(const side of [-1,1])add('drawer-'+side,'paint',side*w*.24,h*.56,d*.29,w*.45,h*.74,q);add('worktop','paint',0,h-q/2,0,w,q,d);
 }
 else if(kind==='media'){add('console','wood',0,h*.17,0,w,h*.34,d);add('screen','screen',0,h*.69,-d*.1,w*.86,h*.62,Math.min(.05,d*.12));}
 else if(['nightstand','dresser','tv_console','kitchen_base','sideboard','storage_bench'].includes(kind)){
  const gap=Math.min(.006,d*.02),caseH=kind==='storage_bench'?h*.86:h-(kind==='kitchen_base'?board+gap:0),caseD=d-board-gap;carcass('cabinet',caseH,caseD,-(board+gap)/2);for(let i=0;i<3;i++){add('drawer-'+i,'paint',0,(i+.5)*caseH/3,d/2-board/2,w*.97,caseH/3*.94,board);add('handle-'+i,'metal',0,(i+.5)*caseH/3,d/2-board*.25,w*.3,board*.7,board*.5);}if(kind==='storage_bench')add('seat','fabric',0,h*.93,0,w,h*.14,d);if(kind==='kitchen_base')add('worktop','paint',0,h-board/2,0,w,board,d);
 }
 else if(kind==='bookcase'){for(const x of [-w/2+board/2,w/2-board/2])add('upright-'+x,'wood',x,h/2,0,board,h,d);add('back','paint',0,h/2,-d/2+board/2,w,h,board);for(let i=0;i<5;i++)add('shelf-'+i,'wood',0,board/2+(h-board)*i/4,0,w,board,d);}
 else if(kind==='bunk_bed'){
  for(const x of [-w/2+board,w/2-board])for(const z of [-d/2+board,d/2-board])add('post-'+x+'-'+z,'wood',x,h/2,z,board*2,h,board*2);
  for(const y of [h*.18,h*.73]){add('frame-'+y,'wood',0,y,0,w*.96,h*.07,d*.96);add('mattress-'+y,'linen',0,y+h*.07,0,w*.94,h*.07,d*.94);}
  for(const x of [-w/2+board,w/2-board])add('rail-'+x,'wood',x,h*.94,0,board*2,h*.06,d);
  for(let i=0;i<5;i++)add('ladder-'+i,'metal',w*.32,h*.14+i*h*.15,d/2-board,w*.25,board*1.4,board*2);
 }
 else if(kind==='tv_wall'||kind==='tv_stand'){
  const stand=kind==='tv_stand',screenH=h*(stand?.83:1),screenY=stand?h-screenH/2:h/2,depth=Math.min(d*.6,.06);
  add('frame','metal',0,screenY,stand?-d*.15:0,w,screenH,depth);
  add('screen','screen',0,screenY,(stand?-d*.15:0)+depth/2,w*.96,screenH*.94,Math.min(.008,d*.05));
  if(stand){add('stem','metal',0,h*.11,-d*.15,w*.08,h*.22,d*.15);add('foot','metal',0,h*.025,0,w*.5,h*.05,d);}
 }
 else if(['fridge','oven','washer','dishwasher'].includes(kind)){
  add('body','paint',0,h/2,-board/2,w,h,d-board);add('front','metal',0,h/2,d/2-board,w*.96,h*.96,board);
  if(kind==='fridge'){add('seam','metal',0,h*.38,d/2-board/2,w,board*.4,board);add('handle','metal',w*.35,h*.65,d/2-board/4,board,h*.25,board/2);}
  else{add('panel','metal',0,h*.88,d/2-board/2,w*.85,h*.10,board);add(kind==='dishwasher'?'handle':'screen','screen',0,h*(kind==='dishwasher'?.70:.45),d/2-board/4,w*.68,h*(kind==='dishwasher'?.03:.48),board/2);}
 }
 return withDrawerTrays(item,parts);
}
