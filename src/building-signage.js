import * as THREE from 'three';

// Small physical number plates, not screen-space annotation panels.
export function buildingNumberPlate(label,resources){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=160;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 ctx.fillStyle='#f1f1e8';ctx.fillRect(0,0,256,160);ctx.strokeStyle='#6a786b';ctx.lineWidth=5;ctx.strokeRect(4,4,248,152);ctx.fillStyle='#35473b';ctx.font='500 92px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(label),128,85);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshStandardMaterial({map:texture,roughness:.65}),geo=new THREE.PlaneGeometry(.20,.125);resources.push(texture,material,geo);
 return new THREE.Mesh(geo,material);
}
