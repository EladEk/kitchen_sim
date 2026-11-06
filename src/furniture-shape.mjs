// Shared dimensions and floor footprint for resident furniture, in metres.
const round=n=>Math.round(n*10000)/10000;
export function cornerSofaSpec(item){return {depth:item.seatDepth??Math.min(.9,item.w-.1,item.d-.1),side:item.cornerSide==='left'?-1:1};}
export function normalizeFurnitureShape(item){
 if(item.kind!=='corner_sofa')return {};
 const {depth}=cornerSofaSpec(item),side=item.cornerSide??'right';
 if(!Number.isFinite(depth)||depth<.45||depth>1.4||depth+.1>Math.min(item.w,item.d)||!['left','right'].includes(side))throw Error('בספה פינתית כל זרוע צריכה להיות ארוכה מעומק המושב ב־10 ס״מ לפחות. עומק המושב: 45–140 ס״מ.');
 return {seatDepth:round(depth),cornerSide:side};
}
export function furnitureFootprintBoxes(item){
 if(item.kind!=='corner_sofa')return [[0,0,item.w,item.d]];
 const {depth,side}=cornerSofaSpec(item);
 return [[0,(-item.d+depth)/2,item.w,depth],[side*(item.w-depth)/2,depth/2,depth,item.d-depth]];
}
