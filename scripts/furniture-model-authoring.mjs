// Offline model authoring. Runtime scenes load the finished GLB, never rebuild
// these curved surfaces. Layouts and collision envelopes are owned by the plans.
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {createVeredKitchenTap} from '../src/kitchen-tap.js';
export function authoredFurniture(){
 const models=new Map(),fabric=new T.MeshPhysicalMaterial({color:'#bbb7a7',roughness:.92,sheen:.85,sheenRoughness:.85,sheenColor:'#dad6c8'}),white=fabric.clone(),duvet=fabric.clone(),seam=fabric.clone(),wood=new T.MeshStandardMaterial({color:'#8d6b48',roughness:.68}),metal=new T.MeshStandardMaterial({color:'#656a6a',roughness:.24,metalness:.9}),dark=new T.MeshStandardMaterial({color:'#242b2b',roughness:.65}),screen=new T.MeshPhysicalMaterial({color:'#17212a',roughness:.16,clearcoat:.8});
 white.color.set('#e8e4d9');duvet.color.set('#a2aca2');seam.color.set('#8f8b7f');for(const m of [fabric,white,duvet,seam])m.userData={surfaceKind:'fabric',architecturalInterior:true};wood.userData={surfaceKind:'wood',architecturalInterior:true};
 function mesh(root,g,m,x=0,y=0,z=0,rotation=null){const o=new T.Mesh(g,m);o.position.set(x,y,z);if(rotation)o.rotation.set(...rotation);root.add(o);return o;}
 function rounded(root,m,x,y,z,w,h,d,r=.015){return mesh(root,new RoundedBoxGeometry(w,h,d,3,Math.min(r,w*.22,h*.22,d*.22)),m,x,y,z);}
 function cylinder(root,m,x,y,z,r,h,top=r){return mesh(root,new T.CylinderGeometry(top,r,h,20,1),m,x,y,z);}
 function tube(root,m,points,r=.002,closed=false){return mesh(root,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed,'centripetal'),Math.max(16,points.length*5),r,5,closed),m);}
 function piping(root,x,y,z,w,d){const r=Math.min(.06,w/5,d/5),p=[];for(const [cx,cz,start]of [[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]])for(let i=0;i<5;i++){const a=start+i*Math.PI/8;p.push([x+cx+r*Math.cos(a),y+.001*Math.sin(i*1.7),z+cz+r*Math.sin(a)]);}tube(root,seam,p,.0022,true);}
 function cloth(root,m,x,y,z,w,h,d,{folds=1,sag=.015,rotate=0}={}){
  const g=new T.BoxGeometry(w,h,d,24,6,22),p=g.attributes.position,v=new T.Vector3(),radius=Math.min(.055,h*.42),inner=new T.Vector3(w/2-radius,h/2-radius,d/2-radius),low=inner.clone().negate();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const c=v.clone().clamp(low,inner),delta=v.clone().sub(c);if(delta.lengthSq())v.copy(c).addScaledVector(delta.normalize(),radius);const u=v.x/(w/2),t=v.z/(d/2),envelope=Math.max(0,1-u*u)*Math.max(0,1-t*t),top=Math.max(0,v.y)/(h/2);let ripple=0;for(const [a,b,c,k,amp]of [[1,.45,-.62,.02,.013],[1,-.6,.21,.035,-.011],[.3,1,-.36,.025,.012],[-.8,1,.62,.015,.009]])ripple+=Math.exp(-Math.pow(a*u+b*t-c,2)/k)*amp;if(h<.3){v.y*=.72+.28*Math.sqrt(Math.max(0,1-u**4))*Math.sqrt(Math.max(0,1-t**4));v.y+=(ripple*folds*1.7-sag*Math.exp(-(u*u+t*t)*2))*envelope*top;v.y+=Math.sign(v.y)*.007*folds*Math.exp(-Math.pow(Math.abs(u)-.77,2)/.02)*Math.exp(-Math.pow(t-.35,2)/.2);}else v.y+=(ripple*folds-sag*Math.exp(-(u*u+t*t)*2))*envelope*top;p.setXYZ(i,...v.toArray());}
  g.deleteAttribute('normal');const smooth=mergeVertices(g,1e-6);g.dispose();smooth.computeVertexNormals();return mesh(root,smooth,m,x,y,z,[0,rotate,0]);
 }
 function bed(w){const root=new T.Group(),d=2.1;for(const x of [-w*.38,w*.38])for(const z of [-.84,.84])cylinder(root,wood,x,.07,z,.035,.14,.027);cloth(root,fabric,0,.24,0,w,.26,d,{folds:.3,sag:0});cloth(root,white,0,.45,.025,w-.035,.22,d-.09,{folds:.3,sag:.008});piping(root,0,.51,.025,w-.045,d-.10);piping(root,0,.39,.025,w-.045,d-.10);
  for(let i=0;i<3;i++){const span=w/3;cloth(root,fabric,-w/2+span*(i+.5),.65,-1.025,span-.006,.68,.11,{folds:.2,sag:0});}
  const n=w>1.3?2:1;for(let i=0;i<n;i++){const x=(i-(n-1)/2)*w*.47;cloth(root,white,x,.61,-.72,w/n-.12,.17,.44,{rotate:(i%2?1:-1)*.035,folds:1.2,sag:.023});piping(root,x,.62,-.72,w/n-.15,.41);}
  cloth(root,duvet,0,.582,.29,w-.015,.13,1.39,{folds:1.8,sag:.01});cloth(root,duvet,0,.64,-.23,w-.04,.10,.24,{folds:1.4,sag:0});
  // The foot and side drops have actual curved cloth surfaces, not a flat box.
  for(const side of [-1,1])cloth(root,duvet,side*(w/2-.025),.47,.33,.055,.23,1.26,{folds:1.8,sag:0});cloth(root,duvet,0,.45,.994,w-.04,.27,.065,{folds:1.8,sag:0});return root;
 }
 models.set('bed-double',bed(1.8));models.set('bed-single',bed(1.0));
 const sofa=new T.Group();for(const x of [-1.02,1.02])for(const z of [-.32,.32])cylinder(sofa,wood,x,.08,z,.034,.16,.025);cloth(sofa,fabric,0,.25,0,2.38,.23,.92,{folds:.3,sag:0});for(const x of [-1.08,1.08])cloth(sofa,fabric,x,.47,.015,.22,.51,.93,{folds:.4,sag:.007});cloth(sofa,fabric,0,.64,-.36,2.12,.56,.19,{folds:.3,sag:0});for(let i=0;i<3;i++){const x=(i-1)*.65;cloth(sofa,fabric,x,.455,.08,.63,.18,.66,{folds:.8,sag:.024});piping(sofa,x,.472,.08,.61,.64);const back=cloth(sofa,fabric,x,.71,-.255,.63,.48,.19,{folds:1,sag:.018});back.rotation.x=-.14;}for(const x of [-.84,.84]){const p=cloth(sofa,duvet,x,.68,-.025,.32,.34,.14,{folds:1.3,sag:.014});p.rotation.z=x>0?-.18:.18;p.rotation.x=-.2;}models.set('sofa',sofa);
 const office=new T.Group();cylinder(office,metal,0,.29,0,.025,.39);for(let i=0;i<5;i++){const a=i*Math.PI*2/5,x=Math.sin(a)*.25,z=Math.cos(a)*.25;tube(office,metal,[[0,.14,0],[x*.65,.095,z*.65],[x,.075,z]],.018);const wheel=cylinder(office,dark,x,.045,z,.038,.055);wheel.rotation.z=Math.PI/2;}cloth(office,dark,0,.51,.025,.49,.12,.47,{folds:.4,sag:.017});const back=cloth(office,dark,0,.77,-.205,.46,.48,.09,{folds:.3,sag:.01});back.rotation.x=-.12;for(const x of [-.27,.27]){tube(office,metal,[[x,.48,.12],[x,.66,.1],[x,.68,-.18]],.015);rounded(office,dark,x,.69,-.01,.055,.035,.32,.015);}models.set('office-chair',office);
 for(const kind of ['coffee','dining','desk']){const root=new T.Group(),w=kind==='coffee'?1.1:1.6,d=kind==='desk'?.65:.8,h=kind==='coffee'?.42:.76;rounded(root,wood,0,h-.025,0,w,.05,d,.012);for(const x of [-w/2+.08,w/2-.08])for(const z of [-d/2+.08,d/2-.08]){tube(root,wood,[[x*1.03,.018,z*1.03],[x,h*.5,z],[x*.98,h-.05,z*.98]],.026);}rounded(root,wood,0,h-.09,-d/2+.06,w-.12,.075,.035,.007);models.set(kind,root);}
 const faucet=new T.Group();cylinder(faucet,metal,0,.008,0,.023,.016);cylinder(faucet,metal,0,.11,0,.018,.21);tube(faucet,metal,[[0,.17,0],[0,.27,0],[0,.32,.055],[0,.31,.14],[0,.265,.165]],.015);cylinder(faucet,metal,0,.258,.165,.015,.022);cylinder(faucet,metal,.025,.13,0,.022,.035);tube(faucet,metal,[[.025,.14,0],[.045,.2,.015]],.009);models.set('faucet',faucet);
 const tv=new T.Group();rounded(tv,dark,0,.02,0,.43,.03,.22,.009);rounded(tv,metal,0,.15,-.035,.035,.26,.035,.007);rounded(tv,dark,0,.51,-.04,1.25,.71,.055,.011);rounded(tv,screen,0,.51,-.009,1.21,.672,.003,.006);models.set('tv',tv);
 const media=new T.Group();for(const x of [-.65,.65])for(const z of [-.15,.15])cylinder(media,dark,x,.07,z,.016,.14);rounded(media,wood,0,.32,0,1.6,.40,.44,.008);for(const x of [-.53,0,.53]){rounded(media,wood,x,.32,.228,.515,.34,.018,.004);rounded(media,metal,x,.4,.242,.12,.009,.015,.003);}const mediaTv=tv.clone(true);mediaTv.position.y=.535;media.add(mediaTv);models.set('media',media);
 // Legacy cloth components remain in the same GLB for non-furniture textiles.
 for(const kind of ['cushion','duvet']){const root=new T.Group();cloth(root,kind==='duvet'?duvet:white,0,0,0,1,1,1,{folds:1,sag:.05});models.set(kind,root);}
 models.set('kitchen-faucet',createVeredKitchenTap([],{authoring:true}));
 return models;
}
