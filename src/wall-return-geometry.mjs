import * as T from 'three';
// Split only the two end faces across the wall thickness. Their outer half
// may be stone while the half leading into a window/door remains painted.
// Existing broad-face indices stay intact; slots 6..9 are the four returns.
export function splitWallReturnGeometry(source,{vertical=false}={}){
 const axis=vertical?0:2,caps=vertical?[4,5]:[0,1],p=source.attributes.position,n=source.attributes.normal,uv=source.attributes.uv,index=source.index,positions=[],normals=[],uvs=[],groups=[];
 const vertex=i=>[p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i),uv?.getX(i)||0,uv?.getY(i)||0];
 const clip=(polygon,sign)=>{const out=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],da=a[axis]*sign,db=b[axis]*sign;if(da>=-1e-9)out.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push(a.map((v,k)=>v+(b[k]-v)*t));}}return out;};
 const append=poly=>{for(let i=1;i+1<poly.length;i++)for(const v of [poly[0],poly[i],poly[i+1]]){positions.push(...v.slice(0,3));normals.push(...v.slice(3,6));uvs.push(...v.slice(6,8));}};
 for(const group of source.groups){const cap=caps.indexOf(group.materialIndex),halves=cap<0?[null]:[-1,1];for(const sign of halves){const start=positions.length/3;for(let i=group.start;i<group.start+group.count;i+=3){const triangle=[0,1,2].map(j=>vertex(index?index.getX(i+j):i+j));append(sign===null?triangle:clip(triangle,sign));}groups.push({start,count:positions.length/3-start,materialIndex:cap<0?group.materialIndex:6+cap*2+(sign>0?1:0)});}}
 const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3)).setAttribute('normal',new T.Float32BufferAttribute(normals,3)).setAttribute('uv',new T.Float32BufferAttribute(uvs,2));for(const g of groups)if(g.count)geometry.addGroup(g.start,g.count,g.materialIndex);geometry.userData={...source.userData,splitWallReturns:true};return geometry;
}
