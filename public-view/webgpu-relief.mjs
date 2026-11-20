import {FACADE_COURSES} from '../src/facade-finish.mjs';
import {Fn,If,Loop,Break,float,vec2,vec3,texture,uniform,positionView,normalViewGeometry,max,min,abs,fract,floor,sin,dot,smoothstep,mix} from 'three/tsl';

export const surfaceHash=p=>fract(sin(dot(p,vec2(127.1,311.7))).mul(43758.5453));

// Blend four independently offset samples with continuous weights. Gradients
// come from the original coordinates, never from the discontinuous cell hash.
// This preserves mip/anisotropic filtering at cell boundaries and oblique views.
export function stochasticTexture(map,coordinates){
 map.updateMatrix();
 const p=uniform(map.matrix).mul(vec3(coordinates,1)).xy,cell=floor(p),f=fract(p),w=f.mul(f).mul(float(3).sub(f.mul(2)));
 const dx=p.dFdx(),dy=p.dFdy();
 const tap=(x,y)=>{const c=cell.add(vec2(x,y)),offset=vec2(surfaceHash(c),surfaceHash(c.add(17.3))).mul(13);return texture(map,p.add(offset)).grad(dx,dy);};
 return mix(mix(tap(0,0),tap(1,0),w.x),mix(tap(0,1),tap(1,1),w.x),w.y);
}

// Dominant-axis metric UVs are retained for architectural joints. Seamless
// stone grain is blended over all three projections on bevels/rounded edges.
export function triplanarTexture(map,position,normal){
 const weights=abs(normal).pow(6),w=weights.div(max(dot(weights,vec3(1)),.00001));
 return stochasticTexture(map,position.zy).mul(w.x)
  .add(stochasticTexture(map,position.xz).mul(w.y))
  .add(stochasticTexture(map,position.xy).mul(w.z));
}

export function stoneHeight(p){
 const {width:w,height:h}=FACADE_COURSES,row=floor(p.y.div(h)),q=vec2(p.x.add(row.mod(2).mul(w/2)),p.y),f=fract(q.div(vec2(w,h)).add(.5)),d=abs(f.sub(.5)).mul(vec2(w,h));
 return smoothstep(.002,.005,min(d.x,d.y));
}

export function floorHeight(p,tile,joint){
 const f=fract(p.div(vec2(...tile))),d=min(f,float(1).sub(f)).mul(vec2(...tile));
 return smoothstep(joint*.4,joint*.5+.0008,min(d.x,d.y));
}

// Parallax occlusion in physical metres. Solve the derivative frame rather than
// assuming model tangents: metric, instanced and mirrored UVs all use the same
// ray. A bounded loop plus linear intersection refinement avoids layer bands.
export function parallaxUV(coordinates,heightAt,depthMetres,steps){
 return Fn(()=>{
  const origin=coordinates.toVar(),dx=positionView.dFdx().toVar(),dy=positionView.dFdy().toVar();
  const ux=coordinates.dFdx().toVar(),uy=coordinates.dFdy().toVar(),n=normalViewGeometry.normalize();
  const view=positionView.negate().normalize(),cosine=dot(n,view).abs();
  const r1=dy.cross(n),r2=n.cross(dx),det=dot(dx,r1);
  const result=origin.toVar(),fade=float(1).sub(smoothstep(10,25,positionView.length())).mul(smoothstep(.07,.22,cosine));
  If(steps.greaterThan(0).and(abs(det).greaterThan(1e-10)).and(fade.greaterThan(.001)),()=>{
   const count=max(steps,1),layer=float(1).div(count),distance=float(depthMetres).mul(fade);
   const tangent=view.sub(n.mul(dot(n,view))).div(max(cosine,.22)).mul(distance);
   const travel=ux.mul(dot(tangent,r1)).add(uy.mul(dot(tangent,r2))).div(det);
   const delta=travel.div(count),at=origin.toVar(),previous=origin.toVar(),z=float(0).toVar();
   const sampled=float(1).sub(heightAt(at)).clamp().toVar(),oldSample=sampled.toVar();
   Loop(24,({i})=>{
    If(float(i).greaterThanEqual(count).or(z.greaterThanEqual(sampled)),()=>{Break();});
    previous.assign(at);oldSample.assign(sampled);at.subAssign(delta);z.addAssign(layer);
    sampled.assign(float(1).sub(heightAt(at)).clamp());
   });
   const after=z.sub(sampled),before=z.sub(layer).sub(oldSample),weight=after.div(max(after.sub(before),.00001)).clamp();
   result.assign(mix(at,previous,weight));
  });
  return result;
 })();
}

// Public TSL entry point, using the shared metric derivative frame.
export const parallaxOcclusionMap=parallaxUV;
