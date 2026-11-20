import {Effect,EffectAttribute,BlendFunction} from 'postprocessing';
import {Uniform,Matrix4} from 'three';
// R186: WebGL2 screen-space reflections restricted to floors (world normal
// up, near the camera). Normals are reconstructed from the depth buffer; the
// march runs in view space against the scene depth and fades with Fresnel,
// distance and screen edges, so tiles and parquet pick up the room without
// turning roads or lawns into mirrors (the effect only exists in the
// enhanced indoor view; see webglFloorReflections()).
const GLSL=`
uniform mat4 floorProjection;uniform mat4 floorInverseProjection;uniform mat4 floorViewToWorld;uniform float floorIntensity;
vec3 floorViewPosition(vec2 uv,float depth){vec4 p=floorInverseProjection*vec4(vec3(uv,depth)*2.-1.,1.);return p.xyz/p.w;}
void mainImage(const in vec4 inputColor,const in vec2 uv,const in float depth,out vec4 outputColor){
 outputColor=inputColor;if(depth>=1.)return;
 vec3 p=floorViewPosition(uv,depth);float dist=-p.z;if(dist>9.)return;
 vec3 n=normalize(cross(dFdx(p),dFdy(p)));if(dot(n,p)>0.)n=-n;
 vec3 worldN=normalize((floorViewToWorld*vec4(n,0.)).xyz);if(worldN.y<.96)return;
 vec3 v=normalize(p),r=reflect(v,n);float fres=.04+.96*pow(1.-max(dot(-v,n),0.),5.);
 vec3 q=p;float stepLen=.09;vec2 hit=vec2(-1.);
 for(int i=0;i<28;i++){q+=r*stepLen;stepLen*=1.08;vec4 c=floorProjection*vec4(q,1.);vec2 s=c.xy/c.w*.5+.5;if(s.x<0.||s.x>1.||s.y<0.||s.y>1.)break;
  float sceneZ=getViewZ(readDepth(s));float delta=sceneZ-q.z;if(delta>0.&&delta<.25+stepLen){hit=s;break;}}
 if(hit.x<0.)return;
 vec2 edge=smoothstep(0.,.12,hit)*smoothstep(0.,.12,1.-hit);float fade=edge.x*edge.y*(1.-smoothstep(5.,9.,dist));
 vec3 reflected=texture2D(inputBuffer,hit).rgb;
 outputColor=vec4(inputColor.rgb+reflected*fres*floorIntensity*fade,inputColor.a);
}`;
export class FloorReflectionEffect extends Effect{
 constructor(camera,{intensity=.5}={}){
  super('FloorReflectionEffect',GLSL,{attributes:EffectAttribute.DEPTH|EffectAttribute.CONVOLUTION,blendFunction:BlendFunction.SRC,uniforms:new Map([['floorProjection',new Uniform(new Matrix4())],['floorInverseProjection',new Uniform(new Matrix4())],['floorViewToWorld',new Uniform(new Matrix4())],['floorIntensity',new Uniform(intensity)]])});
  this.camera=camera;
 }
 update(){const c=this.camera;this.uniforms.get('floorProjection').value.copy(c.projectionMatrix);this.uniforms.get('floorInverseProjection').value.copy(c.projectionMatrixInverse);this.uniforms.get('floorViewToWorld').value.copy(c.matrixWorld);}
}
