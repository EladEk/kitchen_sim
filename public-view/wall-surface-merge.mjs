import {BufferGeometry,BufferAttribute,Matrix3,Vector3} from 'three';

// Render-only union of rectangular, vertical wall faces. The original meshes
// remain the authority for collisions, openings, selection and door actions.
// Adjacent stone skins and their underlying wall face become one outer face.
export function mergeWallSurfaces(parts,{layerTolerance=.016}={}){
 const positions=[],normals=[],uvs=[],rectangles=[],point=new Vector3(),normal=new Vector3(),normalMatrix=new Matrix3();
 const append=triangle=>{for(const v of triangle){positions.push(...v.p);normals.push(...v.n);uvs.push(...v.uv);}};
 const snap=v=>Math.round(v*1e6)/1e6;
 for(const {geometry:g,matrix,start=0,count:partCount} of parts){
  const pos=g.attributes.position,nor=g.attributes.normal,uv=g.attributes.uv,index=g.index,end=Math.min(index?.count??pos.count,start+(partCount??Infinity)),faces=new Map();normalMatrix.getNormalMatrix(matrix);
  for(let j=start;j+2<end;j+=3){
   const triangle=[];for(const k of matrix.determinant()<0?[0,2,1]:[0,1,2]){const i=index?index.getX(j+k):j+k;point.fromBufferAttribute(pos,i).applyMatrix4(matrix);if(nor)normal.fromBufferAttribute(nor,i).applyNormalMatrix(normalMatrix);else normal.set(0,1,0);triangle.push({p:point.toArray(),n:normal.toArray(),uv:[uv?.getX(i)??0,uv?.getY(i)??0]});}
   const n=triangle[0].n,p=triangle[0].p,plane=n[0]*p[0]+n[2]*p[2];
   if(Math.abs(n[1])>1e-6||triangle.some(v=>v.n.some((x,k)=>Math.abs(x-n[k])>1e-5)||Math.abs(n[0]*v.p[0]+n[2]*v.p[2]-plane)>1e-5)){append(triangle);continue;}
   const key=[...n.map(v=>Math.round(v*1e5)),Math.round(plane*1e5)].join(':');
   if(!faces.has(key))faces.set(key,{n,plane,u0:Infinity,u1:-Infinity,y0:Infinity,y1:-Infinity,area:0,triangles:[]});
   const face=faces.get(key),projected=triangle.map(v=>[n[2]*v.p[0]-n[0]*v.p[2],v.p[1]]);face.triangles.push(triangle);
   face.area+=Math.abs((projected[1][0]-projected[0][0])*(projected[2][1]-projected[0][1])-(projected[2][0]-projected[0][0])*(projected[1][1]-projected[0][1]))/2;
   for(const [u,y]of projected){face.u0=Math.min(face.u0,u);face.u1=Math.max(face.u1,u);face.y0=Math.min(face.y0,y);face.y1=Math.max(face.y1,y);}
  }
  for(const face of faces.values()){
   const area=(face.u1-face.u0)*(face.y1-face.y0);
   // Sloped, perforated or nonrectangular faces retain their exact triangles.
   if(area>1e-10&&Math.abs(face.area-area)<Math.max(1e-7,area*1e-5)){delete face.triangles;rectangles.push(face);}else for(const triangle of face.triangles)append(triangle);
  }
 }
 const orientations=new Map();for(const rect of rectangles){const key=rect.n.map(v=>Math.round(v*1e5)).join(':');if(!orientations.has(key))orientations.set(key,[]);orientations.get(key).push(rect);}
 let outputRectangles=0,outputArea=0;
 for(const faces of orientations.values()){
  faces.sort((a,b)=>b.plane-a.plane);const layers=[];for(const face of faces){let layer=layers.at(-1);if(!layer||layer.plane-face.plane>layerTolerance){layer={plane:face.plane,n:face.n,faces:[]};layers.push(layer);}layer.faces.push(face);}
  for(const {plane,n,faces}of layers){
   const heights=[...new Set(faces.flatMap(f=>[snap(f.y0),snap(f.y1)]))].sort((a,b)=>a-b),panels=[];let previous=new Map();
   for(let i=1;i<heights.length;i++){
    const y0=heights[i-1],y1=heights[i],middle=(y0+y1)/2,spans=faces.filter(f=>f.y0<middle&&f.y1>middle).map(f=>[f.u0,f.u1]).sort((a,b)=>a[0]-b[0]),merged=[];
    for(const span of spans){const last=merged.at(-1);if(last&&span[0]<=last[1]+1e-6)last[1]=Math.max(last[1],span[1]);else merged.push([...span]);}
    const current=new Map();for(const [u0,u1]of merged){const key=[snap(u0),snap(u1)].join(':'),old=previous.get(key);if(old&&Math.abs(old.y1-y0)<1e-6){old.y1=y1;current.set(key,old);}else{const panel={u0,u1,y0,y1};panels.push(panel);current.set(key,panel);}}previous=current;
   }
   for(const {u0,u1,y0,y1}of panels){
    const vertex=(u,y)=>({p:[n[2]*u+n[0]*plane,y,-n[0]*u+n[2]*plane],n,uv:[u,y]}),a=vertex(u0,y0),b=vertex(u1,y0),c=vertex(u1,y1),d=vertex(u0,y1);append([a,b,c]);append([a,c,d]);outputRectangles++;outputArea+=(u1-u0)*(y1-y0);
   }
  }
 }
 if(!positions.length)return null;
 const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(new Float32Array(positions),3));geometry.setAttribute('normal',new BufferAttribute(new Float32Array(normals),3));geometry.setAttribute('uv',new BufferAttribute(new Float32Array(uvs),2));geometry.userData.surfaceConsolidation={inputRectangles:rectangles.length,outputRectangles,removedArea:rectangles.reduce((s,f)=>s+f.area,0)-outputArea,layerTolerance};return geometry;
}
