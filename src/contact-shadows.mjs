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
export function createContactShadows(resources){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const a=contactShadowAlpha((x+.5)/size,(y+.5)/size);data.set([255,255,255,Math.round(a*255)],(y*size+x)*4);}
 const map=new THREE.DataTexture(data,size,size);map.needsUpdate=true;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearFilter;
 const material=new THREE.MeshBasicMaterial({color:'#000000',alphaMap:map,transparent:true,opacity:1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false});
 // alphaMap uses green; map's alpha is the coverage channel instead.
 material.alphaMap=null;material.map=map;const geometry=new THREE.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);resources.push(map,material,geometry);
 return {geometry,material,mesh(w,d){const mesh=new THREE.Mesh(geometry,material);mesh.scale.set(w*1.18,1,d*1.18);mesh.userData={part:'furniture-contact-shadow',visualOnly:true,tourNonPhysical:true};mesh.renderOrder=1;return mesh;}};
}
