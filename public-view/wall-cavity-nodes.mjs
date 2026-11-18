import {abs,float,fract,normalWorldGeometry,positionWorld,select,smoothstep} from 'three/tsl';

// Metres, shared by painted and other opaque wall finishes. Contact shading
// stays within 18 mm; the 75 mm board and its joints have explicit albedo.
export function wallCavityNodes({storey=0,height=2.75,skirting=.075}={}){
 const y=storey>0?positionWorld.y.add(.015).mod(storey).sub(.015):positionWorld.y;
 const vertical=float(1).sub(smoothstep(.15,.5,abs(normalWorldGeometry.y)));
 // Differentiate the continuous world height, not the storey mod wrap.
 const skirtH=float(skirting||.075),py=abs(positionWorld.y.dFdy()).add(abs(positionWorld.y.dFdx())).max(.0005);
 const bottomGrout=float(1).sub(smoothstep(.0022,float(.0028).add(py),y.abs())).mul(vertical);
 const topSeam=float(1).sub(smoothstep(.0010,float(.0016).add(py),y.sub(skirtH).abs())).mul(vertical);
 const onSkirt=float(1).sub(smoothstep(skirtH.sub(.0008),skirtH.add(.0008),y)).mul(select(y.greaterThanEqual(0),1,0)).mul(vertical);
 const horizontal=select(abs(normalWorldGeometry.x).greaterThan(abs(normalWorldGeometry.z)),positionWorld.z,positionWorld.x);
 const distance=float(.5).sub(abs(fract(horizontal).sub(.5)));
 const pixel=abs(horizontal.dFdx()).add(abs(horizontal.dFdy()));
 const verticalGrout=float(1).sub(smoothstep(.0010,float(.0016).add(pixel),distance)).mul(onSkirt);
 const groutMask=bottomGrout.max(topSeam).max(verticalGrout).clamp(0,1);
 const bottom=float(1).sub(smoothstep(.001,.018,y.max(0)));
 const top=float(1).sub(smoothstep(.002,.035,float(height).sub(y).abs()));
 const contact=float(1).sub(vertical.mul(bottom.mul(.10).add(top.mul(.12)))).clamp(.82,1);
 return {onSkirt,groutMask,contact,bottomGrout};
}
