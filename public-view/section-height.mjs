import * as T from 'three';
import {inside} from './navigation.mjs';
const EPS=1e-6;
export function isSectionWall(object){
 const d=object.userData||{},part=d.part||object.name||'';
 return !!d.sectionWall||!!d.tourDoor||/wall|facade|window|glazing|lintel|sill|door-frame|apartment-door|building-door|balcony-grey|rail-and|storey-separation/.test(part)&&!/cabinet|wardrobe|furniture/.test(part);
}
function clipTop(face,height){const out=[];for(let i=0;i<face.length;i++){const a=face[i],b=face[(i+1)%face.length],da=height-a[1],db=height-b[1];if(da>=-EPS)out.push(a);if((da>=-EPS)!==(db>=-EPS)){const t=da/(da-db);out.push(a.map((v,k)=>v+(b[k]-v)*t));}}return out;}
function capLoops(segments){
 const key=p=>Math.round(p[0]/EPS)+','+Math.round(p[2]/EPS),points=new Map(),links=new Map(),edges=new Map();
 for(const [a,b]of segments){const ka=key(a),kb=key(b);if(ka===kb)continue;points.set(ka,a);points.set(kb,b);const edge=[ka,kb].sort().join('|');if(edges.has(edge))continue;edges.set(edge,[ka,kb]);for(const [u,v]of [[ka,kb],[kb,ka]]){if(!links.has(u))links.set(u,[]);links.get(u).push(v);}}
 const left=new Set(edges.keys()),loops=[];
 while(left.size){const [start,next]=edges.get(left.values().next().value),loop=[start];let a=start,b=next;for(let budget=edges.size+1;budget>0;budget--){left.delete([a,b].sort().join('|'));if(b===start)break;loop.push(b);const c=(links.get(b)||[]).find(v=>left.has([b,v].sort().join('|')));if(!c){b=null;break;}a=b;b=c;}if(b===start&&loop.length>=3)loops.push(loop.map(k=>points.get(k)));}
 return loops;
}
// Produces owned local geometry. The original mesh, doors and walking world
// remain unchanged. Closed intersections receive a real horizontal cap.
export function cutGeometryAtHeight(geometry,matrix,height){
 if(!geometry.boundingBox)geometry.computeBoundingBox();const bounds=geometry.boundingBox.clone().applyMatrix4(matrix);if(bounds.max.y<=height+EPS)return null;
 const inverse=matrix.clone().invert(),normalMatrix=new T.Matrix3().getNormalMatrix(matrix),normalInverse=normalMatrix.clone().invert(),position=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv,index=geometry.index,limit=index?.count??position.count,buckets=new Map(),segments=[];
 function add(material,face){if(face.length<3)return;if(!buckets.has(material))buckets.set(material,[]);const out=buckets.get(material);for(let j=1;j+1<face.length;j++){const vertices=[face[0],face[j],face[j+1]],cross=new T.Vector3(...vertices[1]).sub(new T.Vector3(...vertices[0])).cross(new T.Vector3(...vertices[2]).sub(new T.Vector3(...vertices[0])));if(cross.lengthSq()<1e-16)continue;out.push(...vertices);}}
 for(let i=0;i+2<limit;i+=3){const face=[];for(let j=0;j<3;j++){const k=index?index.getX(i+j):i+j,p=new T.Vector3().fromBufferAttribute(position,k).applyMatrix4(matrix),n=normal?new T.Vector3().fromBufferAttribute(normal,k).applyMatrix3(normalMatrix).normalize():new T.Vector3(0,1,0);face.push([p.x,p.y,p.z,n.x,n.y,n.z,uv?.getX(k)||0,uv?.getY(k)||0]);}
  const material=geometry.groups.find(g=>i>=g.start&&i<g.start+g.count)?.materialIndex??0,cut=clipTop(face,height);add(material,cut);
  if(Math.min(...face.map(p=>p[1]))<height-EPS&&Math.max(...face.map(p=>p[1]))>height+EPS){const hits=[];for(let j=0;j<3;j++){const a=face[j],b=face[(j+1)%3];if((a[1]<height)!==(b[1]<height)){const t=(height-a[1])/(b[1]-a[1]);hits.push(a.map((v,k)=>v+(b[k]-v)*t));}}if(hits.length===2)segments.push(hits);}
 }
 const loops=capLoops(segments),depth=loops.map(p=>loops.filter(q=>q!==p&&inside([p[0][0],p[0][2]],q.map(v=>[v[0],v[2]]))).length);
 loops.forEach((outer,i)=>{if(depth[i]%2)return;const holes=loops.filter((p,j)=>depth[j]===depth[i]+1&&inside([p[0][0],p[0][2]],outer.map(v=>[v[0],v[2]]))),all=[outer,...holes].flat();for(const face of T.ShapeUtils.triangulateShape(outer.map(p=>new T.Vector2(p[0],p[2])),holes.map(h=>h.map(p=>new T.Vector2(p[0],p[2]))))){const vertices=face.map(k=>all[k]);if(new T.Vector3(...vertices[1]).sub(new T.Vector3(...vertices[0])).cross(new T.Vector3(...vertices[2]).sub(new T.Vector3(...vertices[0]))).y<0)vertices.reverse();add(0,vertices.map(p=>[p[0],height,p[2],0,1,0,p[0],p[2]]));}});
 const output=new T.BufferGeometry(),positions=[],normals=[],uvs=[];let start=0;
 for(const [material,vertices]of buckets){for(const v of vertices){const p=new T.Vector3(...v).applyMatrix4(inverse),n=new T.Vector3(...v.slice(3,6)).applyMatrix3(normalInverse).normalize();positions.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);uvs.push(v[6],v[7]);}output.addGroup(start,vertices.length,material);start+=vertices.length;}
 output.setAttribute('position',new T.Float32BufferAttribute(positions,3));output.setAttribute('normal',new T.Float32BufferAttribute(normals,3));output.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));output.computeBoundingBox();output.computeBoundingSphere();return output;
}
