import * as THREE from 'three';
// A shared radial occlusion decal; approximate contact only, not a second
// shadow render. Excluded from walking/selection by the existing part filters.
// Rounded-rectangle falloff (superellipse metric): dense under the footprint,
// fading out at the 1.18x quad edge. The old radial .27 disc left sofas and beds
// floating, most visibly on phones where AO is off.
export function contactShadowAlpha(u,v,{inset=.62,peak=.46}={}){
 const x=Math.abs(u*2-1),y=Math.abs(v*2-1),d=Math.pow(x**4+y**4,.25);if(d>=1)return 0;
 const t=Math.min(1,Math.max(0,(d-inset)/(1-inset))),s=1-t*t*(3-2*t);return peak*s**1.5;
}
export function createContactShadows(resources,profile={}){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const a=contactShadowAlpha((x+.5)/size,(y+.5)/size,profile);data.set([255,255,255,Math.round(a*255)],(y*size+x)*4);}
 const map=new THREE.DataTexture(data,size,size);map.needsUpdate=true;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearFilter;
 const material=new THREE.MeshBasicMaterial({color:'#000000',alphaMap:map,transparent:true,opacity:1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false});
 // alphaMap uses green; map's alpha is the coverage channel instead.
 material.alphaMap=null;material.map=map;const geometry=new THREE.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);resources.push(map,material,geometry);
 // R190 footprint decal: a 3x3-slice quad whose border has a fixed metric width, so
 // the falloff hugs the real footprint at any size instead of growing with it
 // (the old 1.18x scale left a wide, hard-edged grey slab around long sofas).
 // UVs run 0 at the outer rim to .5 at the inner ring, i.e. along the profile's
 // radius; the corners read the superellipse corner of the same texture.
 const footprints=new Map();
 function footprintGeometry(w,d,spread,inner){
  const key=[w,d,spread,inner].map(v=>v.toFixed(3)).join('|');if(footprints.has(key))return footprints.get(key);
  const ix=Math.max(0,Math.min(inner,w/2-.01)),iz=Math.max(0,Math.min(inner,d/2-.01)),xs=[-w/2-spread,-w/2+ix,w/2-ix,w/2+spread],zs=[-d/2-spread,-d/2+iz,d/2-iz,d/2+spread],us=[0,.5,.5,1];
  const position=[],uv=[],normal=[],index=[];
  for(let j=0;j<4;j++)for(let i=0;i<4;i++){position.push(xs[i],0,zs[j]);uv.push(us[i],1-us[j]);normal.push(0,1,0);}
  for(let j=0;j<3;j++)for(let i=0;i<3;i++){const a=j*4+i,b=a+1,c=a+4,e=c+1;index.push(a,c,b,b,c,e);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeBoundingBox();g.computeBoundingSphere();
  footprints.set(key,g);resources.push(g);return g;
 }
 return {geometry,material,footprint(w,d,{spread=.14,inner=.08}={}){const mesh=new THREE.Mesh(footprintGeometry(w,d,spread,inner),material);mesh.userData={part:'furniture-contact-shadow',visualOnly:true,tourNonPhysical:true,renderFixture:true,footprint:[w,d]};mesh.renderOrder=1;return mesh;},mesh(w,d){const mesh=new THREE.Mesh(geometry,material);mesh.scale.set(w*1.18,1,d*1.18);mesh.userData={part:'furniture-contact-shadow',visualOnly:true,tourNonPhysical:true,renderFixture:true};mesh.renderOrder=1;return mesh;}};
}
