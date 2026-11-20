// R186: one subtle display grade for both backends, applied to the tone-mapped
// linear frame (before sRGB encoding): a slight warm white balance, +6%
// saturation, gentle perceptual contrast and a soft vignette. It rides in an
// existing pass on each backend (no extra target or draw) and switches off on
// reduced tiers (tier >= 2) and when effects are disabled.
export const COLOUR_GRADE=Object.freeze({warmth:Object.freeze([1.016,1,.978]),saturation:1.06,contrast:1.045,vignette:.13});
export function colourGradeWeight({effects=true,tier=0}={}){return effects&&tier<2?1:0;}
// Floor-only screen-space reflections for the WebGL2 composer (WebGPU keeps
// its r185 SSR node). Desktop, top tier, and only in the enhanced indoor view.
export function webglFloorReflections({mobile=false,enhanced=false,tier=0}={}){return !mobile&&enhanced&&tier===0;}
export const COLOUR_GRADE_GLSL=`
vec3 homeGrade(vec3 c,vec2 uv,float weight){
 if(weight<=0.)return c;
 vec3 g=c*vec3(${COLOUR_GRADE.warmth.join(',')});
 float l=dot(g,vec3(.2126,.7152,.0722));g=max(mix(vec3(l),g,${COLOUR_GRADE.saturation.toFixed(3)}),vec3(0.));
 vec3 s=pow(clamp(g,0.,1.),vec3(1./2.2));s=clamp((s-.5)*${COLOUR_GRADE.contrast.toFixed(3)}+.5,0.,1.);g=pow(s,vec3(2.2));
 float v=smoothstep(.38,.98,length((uv-.5)*vec2(1.,.82))*1.414);g*=1.-${COLOUR_GRADE.vignette.toFixed(3)}*v;
 return mix(c,g,weight);
}`;
