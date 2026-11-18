import {Vector3,Quaternion} from 'three';
import {CSMShadowNode} from 'three/addons/csm/CSMShadowNode.js';
import {Fn,If,Loop,Break,float,vec2,ivec2,uniform,reference,textureLoad,max,min,cos,sin,sqrt,floor,fract,mix} from 'three/tsl';
import {photorealQuality} from './photoreal-quality.mjs';
import {resizeShadowTarget} from '../src/shadow-target.mjs';

// Directional PCSS: blocker/receiver separation is converted from orthographic
// depth back to metres before deriving the penumbra from the solar angular size.
// Raw blocker reads use textureLoad, not a comparison sampler at guessed LODs.
export function contactHardeningFilter({samples=uniform(16),blockers=uniform(8)}={}){
 return Fn(({depthTexture,shadowCoord,shadow,depthLayer},builder)=>{
  const size=reference('mapSize','vec2',shadow),extent=reference('camera.right','float',shadow).sub(reference('camera.left','float',shadow)).max(.01);
  const depthRange=reference('camera.far','float',shadow).sub(reference('camera.near','float',shadow));
  const receiver=shadowCoord.z,search=vec2(.10).div(extent).max(vec2(1).div(size));
  const sum=float(0).toVar(),found=float(0).toVar();
  const disk=(i,count)=>{const angle=float(i).mul(2.3999632297),r=sqrt(float(i).add(.5).div(count));return vec2(cos(angle),sin(angle)).mul(r);};
  const read=at=>{let tap=textureLoad(depthTexture,ivec2(at.clamp(vec2(0),size.sub(1))),0);if(depthTexture.isArrayTexture)tap=tap.depth(depthLayer);return tap.r;};
  const compare=d=>(builder.renderer.reversedDepthBuffer?receiver.greaterThanEqual(d):receiver.lessThanEqual(d)).select(float(1),float(0));
  Loop(8,({i})=>{
   If(float(i).greaterThanEqual(blockers),()=>{Break();});
   const at=shadowCoord.xy.add(disk(i,max(blockers,1)).mul(search)).clamp(0,.999999);
   const d=read(at.mul(size));
   If(builder.renderer.reversedDepthBuffer?d.greaterThan(receiver):d.lessThan(receiver),()=>{sum.addAssign(d);found.addAssign(1);});
  });
  const separation=receiver.sub(sum.div(max(found,1))).abs().mul(depthRange);
  // Sun diameter ~0.53 degrees; bounded 0.75–8 texels also avoids light leaks.
  const penumbra=separation.mul(.0093).div(extent).mul(size.x).clamp(.75,8);
  const radius=found.greaterThan(0).select(penumbra,float(.75)).div(size),visibility=float(0).toVar();
  Loop(16,({i})=>{
   If(float(i).greaterThanEqual(samples),()=>{Break();});
   // Manual bilinear PCF avoids mixing raw and comparison samplers of the same
   // depth texture, which r185 otherwise aliases in its TSL binding cache.
   const pixel=shadowCoord.xy.add(disk(i,samples).mul(radius)).mul(size).sub(.5),at=floor(pixel),f=fract(pixel);
   visibility.addAssign(mix(mix(compare(read(at)),compare(read(at.add(vec2(1,0)))),f.x),mix(compare(read(at.add(vec2(0,1)))),compare(read(at.add(vec2(1,1)))),f.x),f.y));
  });
  return visibility.div(max(samples,1));
 });
}

export function createCascadedSun(renderer,light,camera,{mobile=false,clock=()=>performance.now()}={}){
 let quality=photorealQuality({mobile}),disposed=false,key='',dirty=true,lastRefresh=-Infinity,interval=mobile?80:33;
 const lastPosition=new Vector3(Infinity,0,0),lastRotation=new Quaternion(),lastDirection=new Vector3(),direction=new Vector3();
 const samples=uniform(quality.shadowSamples),blockers=uniform(quality.blockerSamples),filter=contactHardeningFilter({samples,blockers});
 class ArchitecturalCSM extends CSMShadowNode{
  _init(builder){
   super._init(builder);
   for(const l of this.lights){l.shadow.filterNode=filter;l.shadow.autoUpdate=false;l.shadow.needsUpdate=true;l.shadow.normalBias=.012;l.shadow.camera.layers.enable(1);l.shadow.camera.near=.1;l.shadow.camera.far=700;l.shadow.camera.updateProjectionMatrix();}
  }
  updateBefore(builder){
   const now=clock();direction.subVectors(light.target.position,light.position).normalize();
   const moved=lastPosition.distanceToSquared(camera.position)>.0025||1-Math.abs(lastRotation.dot(camera.quaternion))>.000002,solar=lastDirection.distanceToSquared(direction)>1e-8;
   if(!dirty&&!solar&&(!moved||now-lastRefresh<interval))return;
   super.updateBefore(builder);
   lastPosition.copy(camera.position);lastRotation.copy(camera.quaternion);lastDirection.copy(direction);lastRefresh=now;dirty=false;
   // The addon inserts lightweight casters during rendering, after the scene's
   // world-matrix walk. Update both target and light before their shadow pass.
   for(const l of this.lights){l.updateMatrixWorld(true);l.target.updateMatrixWorld(true);l.shadow.needsUpdate=true;}
  }
 }
 const csm=new ArchitecturalCSM(light,{cascades:quality.cascades,maxFar:240,mode:'custom',lightMargin:120,customSplitsCallback:(count,near,far,out)=>{for(let i=1;i<=count;i++){const t=i/count;out.push((.8*near*(far/near)**t+.2*(near+(far-near)*t))/far);}}});
 csm.fade=true;light.shadow.shadowNode=csm;
 light.shadow.mapSize.setScalar(quality.shadowSize);
 return {
  update({focus,shadowRadius=55}={}){
   if(disposed)return;
   csm.maxFar=Math.min(camera.far,Math.ceil(Math.min(700,Math.max(80,(focus?.distanceTo(camera.position)||0)+shadowRadius*2.5))/8)*8);
   const next=[camera.near,camera.far,camera.fov,camera.aspect,csm.maxFar].join(':');
   if(next!==key&&csm.camera){csm.updateFrustums();key=next;dirty=true;}
  },
  setQuality(profile){interval=mobile?(profile.tier>=2?120:80):(profile.tier>=2?80:33);quality=photorealQuality({mobile,...profile});samples.value=quality.shadowSamples;blockers.value=quality.blockerSamples;light.shadow.mapSize.setScalar(quality.shadowSize);for(const l of csm.lights)if(resizeShadowTarget(renderer,l.shadow,quality.shadowSize))dirty=true;},
  invalidate(){dirty=true;for(const l of csm.lights)l.shadow.needsUpdate=true;},
  get cascades(){return csm.lights;},
  dispose(){if(disposed)return;disposed=true;for(const node of csm._shadowNodes)node.dispose();csm.dispose();delete light.shadow.shadowNode;}
 };
}
