import * as THREE from 'three';

// Original generic vehicle geometry, in a 4 m long / 1.9 m wide envelope.
// These are body styles, not reproductions of a specific manufacturer's car.
export const CAR_MODELS=['sedan','hatchback','suv'];
const profiles={
 sedan:{width:1.77,belt:.88,hood:.80,roof:1.37,rearBase:-1.22,rearTop:-.67,frontTop:.39,frontBase:1.00,roofWidth:1.23,wheel:.288},
 hatchback:{width:1.72,belt:.91,hood:.82,roof:1.46,rearBase:-1.65,rearTop:-1.14,frontTop:.39,frontBase:1.00,roofWidth:1.27,wheel:.287},
 suv:{width:1.82,belt:1.02,hood:.94,roof:1.58,rearBase:-1.65,rearTop:-1.12,frontTop:.37,frontBase:1.04,roofWidth:1.34,wheel:.310}
};
const TAU=Math.PI*2;
const box=(x,y,z,w,h,d)=>new THREE.BoxGeometry(w,h,d).translate(x,y,z);
function panel(points,normal){
 const vertices=points.flat(),index=[];for(let i=1;i<points.length-1;i++)index.push(0,i,i+1);
 const a=new THREE.Vector3(...points[1]).sub(new THREE.Vector3(...points[0])),b=new THREE.Vector3(...points[2]).sub(new THREE.Vector3(...points[0]));
 if(a.cross(b).dot(new THREE.Vector3(...normal))<0)for(let i=0;i<index.length;i+=3)[index[i+1],index[i+2]]=[index[i+2],index[i+1]];
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(points.flatMap((_,i)=>[i%2,Math.floor(i/2)]),2));g.setIndex(index);g.computeVertexNormals();return g;
}
function rings(rows){
 const positions=[],uv=[],index=[],count=rows[0].length;
 rows.forEach((row,i)=>row.forEach((p,j)=>{positions.push(...p);uv.push(j/count,i/(rows.length-1));}));
 for(let i=1;i<rows.length;i++)for(let j=0;j<count;j++){const a=(i-1)*count+j,b=(i-1)*count+(j+1)%count,c=i*count+j,d=i*count+(j+1)%count;index.push(a,c,b,b,c,d);}
 for(let j=1;j<count-1;j++){index.push(0,j,j+1);const k=(rows.length-1)*count;index.push(k,k+j+1,k+j);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return g;
}
function body(profile,tier){
 const p=profile,base=[[-1.94,p.width*.78,p.belt-.15,.30],[-1.65,p.width*.98,p.belt-.02,.25],[-.95,p.width,p.belt,.25],[.98,p.width,p.belt-.02,.25],[1.64,p.width*.95,p.hood,.28],[1.94,p.width*.77,p.hood-.12,.32]],zs=new Set(base.map(r=>r[0]));
 if(tier<2)for(const wheel of [-1.22,1.22])for(let i=0,n=tier?6:12;i<=n;i++)zs.add(wheel-(p.wheel+.04)+(p.wheel+.04)*2*i/n);
 return rings([...zs].sort((a,b)=>a-b).map(z=>{
  const at=base.findIndex((r,i)=>i<base.length-1&&z>=r[0]&&z<=base[i+1][0]),a=base[Math.max(0,at)],b=base[Math.max(0,at)+1],t=(z-a[0])/(b[0]-a[0]),width=a[1]+(b[1]-a[1])*t,top=a[2]+(b[2]-a[2])*t;let bottom=a[3]+(b[3]-a[3])*t;
  if(tier<2)for(const wheel of [-1.22,1.22])if(Math.abs(z-wheel)<p.wheel+.04)bottom=Math.max(bottom,p.wheel+Math.sqrt((p.wheel+.04)**2-(z-wheel)**2));
  return [[-.43*width,bottom,z],[-.49*width,bottom+.035,z],[-.5*width,top-.075,z],[-.47*width,top-.015,z],[-.28*width,top+.015,z],[0,top+.025,z],[.28*width,top+.015,z],[.47*width,top-.015,z],[.5*width,top-.075,z],[.49*width,bottom+.035,z],[.43*width,bottom,z]];
 }));
}
function cabin(p){
 const base=p.width*.91;
 return rings([[p.rearBase,base,p.belt+.01],[p.rearTop,base,p.roof-.035],[(p.rearTop+p.frontTop)/2,base,p.roof],[p.frontTop,base,p.roof-.035],[p.frontBase,base,p.belt+.015]].map(([z,w,top])=>{
  const t=(top-p.belt)/(p.roof-p.belt),roofWidth=w+(p.roofWidth-w)*t;
  return [[-w/2,p.belt,z],[-roofWidth/2,top-.018,z],[0,top+.012,z],[roofWidth/2,top-.018,z],[w/2,p.belt,z]];
 }));
}
function tint(g,colour){const c=new THREE.Color(colour),values=[];for(let i=0;i<g.attributes.position.count;i++)values.push(c.r,c.g,c.b);g.setAttribute('color',new THREE.Float32BufferAttribute(values,3));return g;}

export function createCarTemplates({model,combine,materials}){
 const p=profiles[model];if(!p)throw Error('Unknown vehicle body style');
 return [0,1,2].map(tier=>{
  const painted=[body(p,tier),cabin(p)],windows=[],tyres=[],alloy=[],dark=[],front=[],rear=[];
  const sideX=y=>p.width*.91/2+(p.roofWidth/2-p.width*.91/2)*(y-p.belt)/(p.roof-p.belt)+.006;
  for(const side of [-1,1]){
   const sidePanel=(coords,offset=0)=>panel(coords.map(([z,y])=>[side*(sideX(y)+offset),y,z]),[side,0,0]),low=p.belt+.055,high=p.roof-.10;
   windows.push(sidePanel([[.035,low],[p.frontBase-.10,low],[p.frontTop-.065,high],[.035,high+.025]]));
   windows.push(sidePanel([[p.rearBase+.10,low],[-.055,low],[-.055,high+.025],[p.rearTop+.065,high]]));
   if(tier<2){
    // Physical pillars and the narrow lower trim keep the glazing distinct
    // from the body; the body shell supplies the remaining painted margins.
    dark.push(sidePanel([[-.07,low],[.05,low],[.05,high+.03],[-.07,high+.03]],.003));
    dark.push(box(side*p.width*.49,.41,0,.027,.06,2.05));
    painted.push(box(side*.898,p.belt+.19,.76,.095,.10,.17));
    dark.push(box(side*.85,p.belt+.16,.75,.12,.027,.055));
    windows.push(panel([[side*.947,p.belt+.16,.69],[side*.947,p.belt+.16,.82],[side*.947,p.belt+.22,.82],[side*.947,p.belt+.22,.69]],[side,0,0]));
    for(const z of [-.60,.58])alloy.push(box(side*p.width*.5,p.belt-.075,z,.018,.025,.16));
    for(const z of [-.97,-.015,1.02])dark.push(box(side*(p.width*.5+.002),p.belt-.24,z,.006,.29,.009));
    if(model==='suv')for(const z of [-1.22,1.22]){
     const radius=p.wheel+.043,points=[];for(let i=0;i<=12;i++){const a=Math.PI*i/12;points.push(new THREE.Vector3(side*(p.width*.5+.005),p.wheel+Math.sin(a)*radius,z+Math.cos(a)*radius));}
     dark.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),8,.014,3,false));
    }
   }
   for(const end of [-1,1]){
    const x=side*(p.width/2-.072),z=end*1.22;
    if(tier===0){const g=new THREE.TorusGeometry(p.wheel-.052,.052,5,20);g.rotateY(Math.PI/2);g.translate(x,p.wheel,z);tyres.push(g);}
    else tyres.push(new THREE.CylinderGeometry(p.wheel,p.wheel,.155,tier===1?12:8).rotateZ(Math.PI/2).translate(x,p.wheel,z));
    // A dark inner disc, brighter rim lip and five independent spokes.
    if(tier<2){
     const outer=x+side*.076;
     dark.push(new THREE.CylinderGeometry(p.wheel*.65,p.wheel*.65,.008,16).rotateZ(Math.PI/2).translate(outer,p.wheel,z));
     alloy.push(new THREE.TorusGeometry(p.wheel*.64,.012,3,tier===0?16:10).rotateY(Math.PI/2).translate(outer+side*.006,p.wheel,z));
     for(let i=0,n=tier===0?5:3;i<n;i++){const spoke=new THREE.BoxGeometry(.014,.023,p.wheel*1.12);spoke.rotateX(TAU*i/n);spoke.translate(outer+side*.009,p.wheel,z);alloy.push(spoke);}
     alloy.push(new THREE.CylinderGeometry(.042,.042,.017,10).rotateZ(Math.PI/2).translate(outer+side*.009,p.wheel,z));
    }
   }
   front.push(tint(panel([[side*.34,p.hood-.17,1.972],[side*.72,p.hood-.15,1.94],[side*.76,p.hood-.05,1.932],[side*.37,p.hood-.055,1.97]],[0,0,1]),'#e8eef1'));
   rear.push(panel([[side*.34,p.belt-.19,-1.97],[side*.73,p.belt-.17,-1.94],[side*.75,p.belt-.065,-1.93],[side*.34,p.belt-.07,-1.97]],[0,0,-1]));
   if(tier===0){
    front.push(tint(box(side*.55,p.hood-.065,1.98,.31,.014,.014),'#f0f4f3'));
    // Non-emissive daytime lenses do not illuminate the car park at night.
    rear.push(box(side*.55,p.belt-.079,-1.98,.28,.016,.012));
   }
  }
  for(const [end,base,top] of [[1,p.frontBase,p.frontTop],[-1,p.rearBase,p.rearTop]]){
   const bottom=p.belt+.06,high=p.roof-.085,w0=sideX(bottom)-.06,w1=sideX(high)-.06,parts=tier===0?6:2;
   const faceZ=y=>base+(top-base)*(y-p.belt)/(p.roof-.035-p.belt)+end*.05;
   // A slightly bowed windscreen catches the sky across several surface normals.
   for(let i=0;i<parts;i++){
    const u0=-1+2*i/parts,u1=-1+2*(i+1)/parts,point=(u,w,y)=>[u*w,y,faceZ(y)+end*.05*(1-u*u)];
    windows.push(panel([point(u0,w0,bottom),point(u1,w0,bottom),point(u1,w1,high),point(u0,w1,high)],[0,.3,end]));
   }
  }
  if(tier<2){
   dark.push(box(0,.47,1.94,.77,.14,.035),box(0,.39,-1.94,1.18,.07,.035));
   front.push(tint(box(0,.50,1.968,.34,.075,.012),'#edc943'),tint(box(0,.55,-1.969,.34,.075,.012),'#edc943'));
   if(tier===0){
    for(let i=0;i<4;i++)dark.push(box(0,.42+i*.025,1.962,.68,.010,.008));
    for(const x of [-.30,.27]){const wiper=box(x,p.belt+.075,p.frontBase-.10,.36,.014,.016);wiper.rotateY(x<0?.12:-.13);dark.push(wiper);}
    if(model==='suv')for(const side of [-1,1])dark.push(box(side*.52,p.roof+.023,-.30,.034,.035,1.20));
   }
  }
  const parts=[{name:'body',geometry:combine(painted),material:materials.body,colorize:true},{name:'windows',geometry:combine(windows),material:materials.glass},{name:'tyres',geometry:combine(tyres),material:materials.rubber},{name:'headlights',geometry:combine(front),material:materials.headlight},{name:'tail-lights',geometry:combine(rear),material:materials.tail}];
  if(alloy.length)parts.push({name:'rims-and-handles',geometry:combine(alloy),material:materials.chrome});
  if(dark.length)parts.push({name:'trim-and-door-seams',geometry:combine(dark),material:materials.trim});
  return parts;
 });
}
