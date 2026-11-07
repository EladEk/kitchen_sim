import * as T from 'three';
import {DISTRICT,buildingTransform} from './district.mjs';
import {clearanceLabel,clearanceCentimetres} from './furniture-clearances.mjs';
const SVG='http://www.w3.org/2000/svg';
export function clearanceWorldGuides(value){
 if(!value)return [];const building=DISTRICT.find(b=>b.id===value.scope.building);if(!building)return [];const transform=buildingTransform(building),base=value.elevation+.03;
 const point=(p,y)=>new T.Vector3(p[0],base+y,p[1]).applyMatrix4(transform);
 return value.guides.map(g=>({...g,from:point(g.from,g.fromY??value.height-.03),to:point(g.to,g.toY??value.height-.03),targetOutlines:(g.type==='furniture'?g.targetPolygons||[]:[]).map(p=>p.map(v=>point(v,g.toY??value.height-.03)))}));
}
// Homogeneous clipping keeps lines whose far endpoint is behind or outside the
// camera, as long as part of the actual dimension is still in the viewport.
export function projectClearanceGuide(guide,camera,width,height){
 if(width<=0||height<=0)return null;const m=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),project=p=>new T.Vector4(p.x,p.y,p.z,1).applyMatrix4(m),a=project(guide.from),b=project(guide.to);let low=0,high=1;
 for(const [axis,sign]of [['x',1],['x',-1],['y',1],['y',-1],['z',1],['z',-1]]){const fa=a.w+sign*a[axis],fb=b.w+sign*b[axis];if(fa<0&&fb<0)return null;if(fa<0||fb<0){const t=fa/(fa-fb);if(fa<0)low=Math.max(low,t);else high=Math.min(high,t);if(low>high)return null;}}
 const at=t=>{const p=a.clone().lerp(b,t);if(p.w<=1e-9)return null;return [(p.x/p.w+1)*width/2,(1-p.y/p.w)*height/2];},from=at(low),to=at(high);if(!from||!to)return null;return {from,to,clipped:low>0||high<1,label:[(from[0]+to[0])/2,(from[1]+to[1])/2-20]};
}
export function createFurnitureClearanceOverlay(host,{onSelect=null}={}){
 const hadHostClass=host.classList.contains('furniture-clearance-host');host.classList.add('furniture-clearance-host');
 const doc=host.ownerDocument,svg=doc.createElementNS(SVG,'svg');svg.classList.add('furniture-clearance-overlay');svg.setAttribute('aria-label','ארבעה מרווחים לצדדים ומרווח גובה בין רהיטים');svg.setAttribute('role','img');svg.style.display='none';host.appendChild(svg);const rows=[];let guides=[],localGuides=[],disposed=false;
 const element=(tag,parent,attrs={})=>{const node=doc.createElementNS(SVG,tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,value);parent.appendChild(node);return node;};
 function set(value){
  if(disposed)return;guides=clearanceWorldGuides(value);localGuides=value?.guides||[];
  while(rows.length<guides.length){const group=element('g',svg),outline=element('path',group,{class:'clearance-target-outline'}),halo=element('line',group,{class:'clearance-line-halo'}),line=element('line',group,{class:'clearance-dimension-line'}),caps=element('path',group,{class:'clearance-end-caps'}),start=element('circle',group,{r:2}),end=element('path',group,{class:'clearance-target-diamond'}),leader=element('line',group,{class:'clearance-label-leader'}),label=element('g',group,{class:'clearance-label'}),background=element('rect',label,{x:-28,y:-8,width:56,height:16,rx:4}),name=element('text',label,{y:-6,'text-anchor':'middle','dominant-baseline':'central',class:'clearance-target-name'}),text=element('text',label,{y:0,'text-anchor':'middle','dominant-baseline':'central'}),title=element('title',group);const index=rows.length;label.setAttribute('role','button');label.setAttribute('tabindex','0');label.addEventListener('click',e=>{e.stopPropagation();onSelect?.(localGuides[index]);});label.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect?.(localGuides[index]);}});rows.push({group,outline,halo,line,caps,start,end,leader,label,background,name,text,title});}
  rows.forEach((r,i)=>{r.group.style.display=i<guides.length?'':'none';if(i>=guides.length)return;const g=guides[i],key=g.axis==='vertical'?(g.direction==='above'?'↑':'↓'):g.number;r.text.textContent=''+clearanceCentimetres(g.gap)+' ס״מ';r.name.textContent='';r.title.textContent=clearanceLabel(g);r.group.style.setProperty('--clearance-color',g.color||'#2b8162');r.group.setAttribute('data-clearance-type',g.type);r.group.setAttribute('data-clearance-direction',g.direction);r.group.setAttribute('data-clearance-target',g.id);r.group.setAttribute('aria-label',clearanceLabel(g));});if(!guides.length)svg.style.display='none';
 }
 function update(camera,{width=host.clientWidth,height=host.clientHeight,visible=true}={}){
  if(disposed)return;svg.style.display=visible&&guides.length?'':'none';if(!visible||!guides.length)return;svg.setAttribute('viewBox',`0 0 ${width} ${height}`);camera.updateMatrixWorld(true);const labels=[];
  guides.forEach((guide,i)=>{const r=rows[i],p=projectClearanceGuide(guide,camera,width,height);r.group.style.display=p?'':'none';if(!p)return;
   const attrs={x1:p.from[0],y1:p.from[1],x2:p.to[0],y2:p.to[1]};for(const node of [r.line,r.halo])for(const [key,value]of Object.entries(attrs))node.setAttribute(key,value.toFixed(2));
   r.start.setAttribute('cx',p.from[0].toFixed(2));r.start.setAttribute('cy',p.from[1].toFixed(2));const [ex,ey]=p.to;r.end.setAttribute('d',`M ${ex} ${ey-3} L ${ex+3} ${ey} L ${ex} ${ey+3} L ${ex-3} ${ey} Z`);
   const dx=ex-p.from[0],dy=ey-p.from[1],length=Math.hypot(dx,dy),nx=length>1?-dy/length:1,ny=length>1?dx/length:0,cap=(x,y)=>`M ${x-nx*3} ${y-ny*3} L ${x+nx*3} ${y+ny*3}`;r.caps.setAttribute('d',cap(...p.from)+' '+cap(ex,ey));
   let outline='';for(const poly of guide.targetOutlines||[])for(let j=0;j<poly.length;j++){const edge=projectClearanceGuide({from:poly[j],to:poly[(j+1)%poly.length]},camera,width,height);if(edge)outline+=`M ${edge.from[0]} ${edge.from[1]} L ${edge.to[0]} ${edge.to[1]} `;}r.outline.setAttribute('d',outline);
   const margin=Math.min(30,width/2),x=Math.max(margin,Math.min(width-margin,p.label[0]));let y=Math.max(20,Math.min(height-20,p.label[1]));
   for(let tries=0;tries<guides.length*3&&labels.some(p=>Math.abs(p[0]-x)<60&&Math.abs(p[1]-y)<19);tries++)y=Math.max(20,Math.min(height-20,p.label[1]+(tries%2?1:-1)*19*Math.ceil((tries+1)/2)));
   labels.push([x,y]);r.label.setAttribute('transform',`translate(${x.toFixed(2)} ${y.toFixed(2)})`);const mid=[(p.from[0]+ex)/2,(p.from[1]+ey)/2],bottom=mid[1]>=y?y+8:y-8;for(const [key,value]of Object.entries({x1:mid[0],y1:mid[1],x2:x,y2:bottom}))r.leader.setAttribute(key,value.toFixed(2));
  });
 }
 return {element:svg,set,update,dispose(){if(disposed)return;disposed=true;svg.remove();if(!hadHostClass)host.classList.remove('furniture-clearance-host');rows.length=guides.length=0;}};
}
