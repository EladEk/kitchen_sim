import {Fn,If,Loop,bool,float,int,reference,positionWorld,min,max,clamp,dot,select,textureLoad,ivec2} from 'three/tsl';
import {installSelectionNodeFactory} from './gpu-selection-clip.mjs';
const states=new WeakMap();
installSelectionNodeFactory((material,state,sectionCuttable)=>{
 let n=states.get(state);
 if(!n){n={};for(const key of ['uSectionCutY','uSelectionMode','uSelectionMargin'])n[key]=reference('value','float',state[key]);for(const key of ['uSelectionBoundsMin','uSelectionBoundsMax'])n[key]=reference('value','vec3',state[key]);n.rings=state.uSelectionRings.value;n.ringCount=reference('value','int',state.uSelectionRingCount);states.set(state,n);}
 const old=material.maskNode;
 material.maskNode=Fn(()=>{
  const p=positionWorld,visible=bool(true).toVar();
  If(n.uSelectionMode.greaterThan(.5),()=>{
   visible.assign(p.greaterThanEqual(n.uSelectionBoundsMin).all().and(p.lessThanEqual(n.uSelectionBoundsMax).all()));
   If(n.uSelectionMode.greaterThan(1.5),()=>{
    const anyInside=bool(false).toVar(),anyHole=bool(false).toVar();
    Loop({start:int(0),end:n.ringCount,type:'int',condition:'<'},({i:row})=>{
     const info=textureLoad(n.rings,ivec2(0,row)),inside=bool(false).toVar(),distance2=float(1e12).toVar(),count=int(info.z);
     Loop({start:int(0),end:int(24),type:'int',condition:'<'},({i})=>{
      If(i.lessThan(count),()=>{
       const j=select(i.add(1).equal(count),int(0),i.add(1)),a=textureLoad(n.rings,ivec2(i,row)).xy,b=textureLoad(n.rings,ivec2(j,row)).xy,v=b.sub(a),q=p.xz.sub(a),near=q.sub(v.mul(clamp(dot(q,v).div(max(dot(v,v),1e-10)),0,1)));
       distance2.assign(min(distance2,dot(near,near)));
       const dy=b.y.sub(a.y),safe=select(dy.abs().greaterThan(1e-10),dy,float(1e-10));
       If(a.y.greaterThan(p.z).notEqual(b.y.greaterThan(p.z)).and(p.x.lessThan(v.x.mul(p.z.sub(a.y)).div(safe).add(a.x))),()=>{inside.assign(inside.not());});
      });
     });
     const edge=distance2.lessThanEqual(n.uSelectionMargin.mul(n.uSelectionMargin));
     If(info.w.greaterThan(.5),()=>{anyHole.assign(anyHole.or(inside.and(edge.not())));}).Else(()=>{anyInside.assign(anyInside.or(inside).or(edge));});
    });visible.assign(visible.and(anyInside).and(anyHole.not()));
   });
  });
  if(sectionCuttable)visible.assign(visible.and(p.y.lessThanEqual(n.uSectionCutY)));
  if(old)visible.assign(visible.and(old));return visible;
 })();
});
