// Furniture-local assemblies. The pose is transient; it never changes a saved layout.
export function cabinetMotions(item, parts) {
 const motions=[];
 const add=(id,type,names,options={})=>{
  const members=parts.filter(p=>names.includes(p.part));if(!members.length)return;
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const {box}of members)for(let a=0;a<3;a++){min[a]=Math.min(min[a],box[a]-box[a+3]/2);max[a]=Math.max(max[a],box[a]+box[a+3]/2);}
  motions.push({id,type,parts:members.map(p=>p.part),min,max,...options});
 };
 const hinge=(id,names,right=false)=>{
  const panel=parts.find(p=>p.part===id);if(!panel)return;
  const [x,,z,w,,d]=panel.box;
  add(id,'hinge',names,{pivot:[x+(right?1:-1)*w/2,0,z-d/2],angle:(right?1:-1)*Math.PI/2});
 };
 for(const p of parts){
  let match=/^door-(\d+)$/.exec(p.part);
  if(match){const i=+match[1];hinge(p.part,[p.part,p.part+'-handle','handle-'+i,...(i===0?parts.filter(q=>/^vent-/.test(q.part)).map(q=>q.part):[])],i%2===1);continue;}
  match=/^sliding-door-(\d+)$/.exec(p.part);
  if(match){const i=+match[1];add(p.part,'slide-door',[p.part,'sliding-grip-'+i],{delta:[(i===0?1:-1)*item.w*.42,0,0]});continue;}
  match=/^drawer-(-?\d+)$/.exec(p.part);
  if(match){const i=match[1];add(p.part,'drawer',[p.part,'drawer-handle-'+i,'handle-'+i,...parts.filter(q=>q.part.startsWith('tray-'+i+'-')).map(q=>q.part)],{delta:[0,0,item.d*.72]});}
 }
 for(const id of ['corner-front-door','pantry-tall-front'])hinge(id,[id,id+'-handle']);
 const side=parts.find(p=>p.part==='corner-side-door');
 if(side){const [x,,z,w,,d]=side.box;add(side.part,'hinge',[side.part,'corner-side-handle'],{pivot:[x-w/2,0,z-d/2],angle:Math.PI/2});}
 const glassIds=new Set(parts.flatMap(p=>{const m=/^glass-pane-(\d+)$/.exec(p.part);return m?[+m[1]]:[];}));
 for(const i of glassIds){const panel=parts.find(p=>p.part==='glass-pane-'+i),members=parts.filter(p=>p.part==='glass-pane-'+i||p.part==='glass-handle-'+i||new RegExp('^glass-door-(vertical|horizontal)-'+i+'-').test(p.part)),min=Math.min(...members.map(p=>p.box[0]-p.box[3]/2)),max=Math.max(...members.map(p=>p.box[0]+p.box[3]/2));add('glass-door-'+i,'hinge',members.map(p=>p.part),{pivot:[i%2?max:min,0,panel.box[2]],angle:(i%2?1:-1)*Math.PI/2});}
 return motions;
}

export function withDrawerTrays(item,parts){
 const b=Math.min(.018,item.w*.04,item.d*.04,item.h*.04),extras=[];
 for(const p of parts){const m=/^drawer-(-?\d+)$/.exec(p.part);if(!m)continue;
  const [x,y,z,w,h,d]=p.box,W=Math.min(w-b*2,item.w-b*4),H=h*.68,D=Math.max(b,item.d*.72-b*2),front=z-d/2-b,z0=front-D;
  if(W<=b*2||H<=b*2||z0 < -item.d/2)continue;
  const add=(name,X,Y,Z,A,B,C)=>extras.push({part:'tray-'+m[1]+'-'+name,material:'wood',box:[X,Y,Z,A,B,C]});
  add('bottom',x,y-H/2+b/2,(front+z0)/2,W,b,D);
  add('back',x,y,z0+b/2,W,H,b);
  for(const sign of [-1,1])add('side-'+sign,x+sign*(W-b)/2,y,(front+z0)/2,b,H,D);
 }
 return [...parts,...extras];
}
