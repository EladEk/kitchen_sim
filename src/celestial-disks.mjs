import * as THREE from 'three';
// Analytic disks are evaluated at screen resolution rather than disappearing
// into a one-pixel HDR texel. View rotation only: no eye parallax in WebXR.
export function createCelestialDisks(){
 const uniforms={sunDirection:{value:new THREE.Vector3()},moonDirection:{value:new THREE.Vector3()},moonRadius:{value:.0045},moonFraction:{value:0},limbAngle:{value:0},sunVisible:{value:0},moonVisible:{value:0},daylight:{value:0}};
 const material=new THREE.ShaderMaterial({uniforms,side:THREE.BackSide,transparent:true,depthWrite:false,depthTest:true,fog:false,
  vertexShader:`varying vec3 skyDirection;
   void main(){skyDirection=position;vec4 clip=projectionMatrix*vec4(mat3(viewMatrix)*position,1.0);gl_Position=clip.xyww;}`,
  fragmentShader:`varying vec3 skyDirection;
   uniform vec3 sunDirection,moonDirection;
   uniform float moonRadius,moonFraction,limbAngle,sunVisible,moonVisible,daylight;
   void main(){
    vec3 d=normalize(skyDirection);float sd=dot(d,sunDirection),md=dot(d,moonDirection);
    float sunEdge=max(fwidth(sd),0.0000001),moonEdge=max(fwidth(md),0.0000001);
    float sunMask=smoothstep(cos(0.004653)-sunEdge,cos(0.004653)+sunEdge,sd)*sunVisible;
    float moonMask=smoothstep(cos(moonRadius)-moonEdge,cos(moonRadius)+moonEdge,md)*moonVisible;
    vec3 right=normalize(vec3(-moonDirection.z,0.0,moonDirection.x));vec3 up=cross(right,moonDirection);
    vec2 p=vec2(dot(d,right),dot(d,up))/sin(moonRadius);
    float nz=sqrt(max(0.0,1.0-dot(p,p))),phaseCos=2.0*moonFraction-1.0;
    float lit=max(0.0,(p.x*sin(limbAngle)+p.y*cos(limbAngle))*sqrt(max(0.0,1.0-phaseCos*phaseCos))+nz*phaseCos);
    float moonAlpha=moonMask*clamp(lit*2.0+0.025*(1.0-daylight),0.0,1.0);
    float alpha=max(sunMask,moonAlpha);if(alpha<0.001)discard;
    vec3 color=mix(vec3(1.5,1.6,1.8),vec3(18.0,16.8,13.0),sunMask);
    gl_FragColor=vec4(color,alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
 const geometry=new THREE.SphereGeometry(1,48,24),mesh=new THREE.Mesh(geometry,material);
 mesh.name='visible-sun-and-moon';mesh.frustumCulled=false;mesh.renderOrder=-10000;mesh.raycast=()=>{};mesh.userData.celestialBackground=true;
 return {mesh,update(state){uniforms.sunDirection.value.fromArray(state.sun.direction);uniforms.moonDirection.value.fromArray(state.moon.direction);uniforms.moonRadius.value=state.moon.angularRadius;uniforms.moonFraction.value=state.moon.fraction;uniforms.limbAngle.value=state.moon.limbAngle;uniforms.sunVisible.value=!state.dark&&state.sun.elevation>0?1:0;uniforms.moonVisible.value=!state.dark&&state.moon.elevation>0?1:0;uniforms.daylight.value=state.daylight;mesh.visible=uniforms.sunVisible.value+uniforms.moonVisible.value>0;},dispose(){geometry.dispose();material.dispose();}};
}
