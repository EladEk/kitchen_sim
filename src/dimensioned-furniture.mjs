// All boxes are in metres, local X=width, Z=depth; the base is Y=0.
// The declared envelope includes handles, chair backs and bed headboards.
export function dimensionedFurnitureParts({kind,w,d,h}){
 const parts=[],add=(part,material,x,y,z,W,H,D)=>{if(W>0&&H>0&&D>0)parts.push({part,material,box:[x,y,z,W,H,D]});},board=Math.min(.025,w*.08,d*.08,h*.08),feet=Math.min(.06,w*.08,d*.08),top=()=>add('top','wood',0,h-board/2,0,w,board,d),legs=(height,spread=.82)=>{for(const x of [-1,1])for(const z of [-1,1])add(`leg-${x}-${z}`,'metal',x*(w-feet)*spread/2,height/2,z*(d-feet)*spread/2,feet,height,feet);};
 if(kind==='wardrobe'){const handle=Math.min(.035,d*.12),bodyD=d-handle;add('body','wood',0,h/2,-handle/2,w,h,bodyD);for(let i=0,n=Math.max(1,Math.ceil(w/.65));i<n;i++){const W=w/n,x=-w/2+(i+.5)*W;add(`door-${i}`,'paint',x,h*.51,d/2-handle-board/2,W-board*.3,h*.96,board);add(`handle-${i}`,'metal',x+W*.33,h*.52,d/2-handle/2,Math.min(.018,W*.06),Math.min(.24,h*.22),handle);}}
 else if(kind==='desk'||kind==='dining'){top();legs(h-board);if(kind==='desk')add('drawers','paint',w*.29,h*.62,-d*.04,w*.32,h*.66,d*.8);}
 else if(kind==='chair'){const seat=h*.49,th=Math.min(.08,h*.11);add('seat','fabric',0,seat,0,w,th,d*.88);add('back','fabric',0,(h+seat)/2,-d/2+board*2,w,h-seat,board*4);legs(seat-th/2);}
 else if(kind==='bed'){const head=Math.min(.09,d*.08),platform=h*.22,baseD=d-head;add('frame','wood',0,platform*.7,head/2,w,platform,baseD);add('headboard','wood',0,h/2,-d/2+head/2,w,h,head);add('mattress','linen',0,h*.34,head/2,w*.97,h*.24,baseD*.98);add('duvet','linen',0,h*.48,d*.10,w*.98,h*.08,baseD*.76);const n=w>1.25?2:1;for(let i=0;i<n;i++)add('pillow-'+i,'fabric',n===1?0:(i?1:-1)*w*.24,h*.50,-d*.30,w/(n+1.1),h*.10,d*.17);}
 else if(kind==='sofa'){const arm=Math.min(.16,w*.12);add('base','wood',0,h*.22,0,w,h*.30,d);add('seat','fabric',0,h*.46,d*.04,w-arm*2,h*.20,d*.8);add('back','fabric',0,h*.70,-d*.39,w-arm*2,h*.60,d*.22);for(const s of [-1,1])add('arm-'+s,'fabric',s*(w-arm)/2,h*.51,0,arm,h*.48,d);}
 else if(kind==='coffee'){top();legs(h-board);}
 else if(kind==='media'){add('console','wood',0,h*.17,0,w,h*.34,d);add('screen','screen',0,h*.69,-d*.1,w*.86,h*.62,Math.min(.05,d*.12));}
 return parts;
}
