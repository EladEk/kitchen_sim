import {BUILDING_FLOORS} from './building-layout.mjs';
// Visual reference: Efi's official complex-5 residential render. Horizontal
// positions come from the supplied balcony outlines, not perspective tracing.
// Frame thickness/height and unspecified floor finishes remain illustrative.
export const EFI_PROJECT_REFERENCE={project:'אפי באפיקי נחל, אופקים, שלב א׳ — מתחם 5',building:4102,plot:1410,url:'https://www.efficapital.co.il/פרויקטים/אפי-באפיקי-נחל-אופקים-שלב-א/',aerial:'https://efficapital.co.il/Effi-Afikim/wp-content/uploads/2024/06/104187-5_effi_hadmaya_c-1-1.pdf',facade:'https://efficapital.co.il/Effi-Afikim/wp-content/uploads/2024/05/2228_fn_002-scaled.jpg'};
function inside([x,y],poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export function balconyFrameStacks(){
 const stacks=new Map();
 for(const floor of BUILDING_FLOORS.filter(f=>f.level>0&&f.level<=6))for(const poly of floor.balconies){
  const edges=poly.map((a,i)=>{const b=poly[(i+1)%poly.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],touches=floor.envelope.some(p=>inside([mid[0]+dz/length*.13,mid[1]-dx/length*.13],p.polygon)||inside([mid[0]-dz/length*.13,mid[1]+dx/length*.13],p.polygon));return {a,b,length,touches};}).filter(e=>!e.touches&&e.length>2).sort((a,b)=>b.length-a.length);
  const edge=edges[0];if(!edge)continue;const ordered=[edge.a,edge.b].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),key=ordered.flat().map(v=>Math.round(v/.12)).join(':');
  if(!stacks.has(key))stacks.set(key,{a:ordered[0],b:ordered[1],levels:[]});stacks.get(key).levels.push(floor.level);
 }
 return [...stacks.values()].filter(s=>s.levels.length>=3).map(s=>({...s,levels:[...new Set(s.levels)].sort((a,b)=>a-b)}));
}
