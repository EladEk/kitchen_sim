import {Effect,BlendFunction} from 'postprocessing';
import {Uniform} from 'three';

// Self-contained AgX for the WebGL composer, with an explicit exposure uniform
// fed from renderer.toneMappingExposure each frame, so WebGL matches the WebGPU
// renderOutput path. Previously tone mapping and FXAA shared one EffectPass;
// FXAA re-sampled the raw HDR buffer, so the shipped frame was effectively
// un-tone-mapped (an unlit #ff0000 stayed #ff0000, whites clipped flat): the
// milky, plastic look.
export const HOME_AGX_GLSL=`
uniform float homeExposure;
uniform float homeNeutral;
const mat3 HOME_REC2020_TO_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);

const mat3 HOME_SRGB_TO_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);

// https://iolite-engine.com/blog_posts/minimal_agx_implementation
// Mean error^2: 3.6705141e-06
vec3 homeAgxContrast( vec3 x ) {

	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;

	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;

}

// AgX Tone Mapping implementation based on Filament, which in turn is based
// on Blender's implementation using rec 2020 primaries
// https://github.com/google/filament/pull/7236
// Inputs and outputs are encoded as Linear-sRGB.

vec3 homeAgX( vec3 color ) {

	// AgX constants
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);

	// explicit AgXOutsetMatrix generated from Filaments AgXOutsetMatrixInv
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);

	// LOG2_MIN      = -10.0
	// LOG2_MAX      =  +6.5
	// MIDDLE_GRAY   =  0.18
	const float AgxMinEv = - 12.47393;  // log2( pow( 2, LOG2_MIN ) * MIDDLE_GRAY )
	const float AgxMaxEv = 4.026069;    // log2( pow( 2, LOG2_MAX ) * MIDDLE_GRAY )

	color *= homeExposure;

	color = HOME_SRGB_TO_REC2020 * color;

	color = AgXInsetMatrix * color;

	// Log2 encoding
	color = max( color, 1e-10 ); // avoid 0 or negative numbers for log2
	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );

	color = clamp( color, 0.0, 1.0 );

	// Apply sigmoid
	color = homeAgxContrast( color );

	// Apply AgX look
	// v = agxLook(v, look);

	color = AgXOutsetMatrix * color;

	// Linearize
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );

	color = HOME_REC2020_TO_SRGB * color;

	// Gamut mapping. Simple clamp for now.
	color = clamp( color, 0.0, 1.0 );

	return color;

}


// Khronos PBR Neutral (three's NeutralToneMapping): base-colour white stays
// white and hues stay true, with a soft highlight roll-off.
vec3 homeNeutralCurve( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= homeExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}

void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){
 vec3 c=max(inputColor.rgb,vec3(0.));
 outputColor=vec4(homeNeutral>.5?homeNeutralCurve(c):homeAgX(c),inputColor.a);
}
`;
export class HomeToneMappingEffect extends Effect{
 constructor({exposure=1}={}){super('HomeToneMappingEffect',HOME_AGX_GLSL,{blendFunction:BlendFunction.SRC,uniforms:new Map([['homeExposure',new Uniform(exposure)],['homeNeutral',new Uniform(0)]])});}
 get exposure(){return this.uniforms.get('homeExposure').value;}
 set exposure(value){this.uniforms.get('homeExposure').value=Number.isFinite(value)?value:1;}
 // Follows renderer.toneMapping: NeutralToneMapping selects the PBR Neutral curve.
 set neutral(value){this.uniforms.get('homeNeutral').value=value?1:0;}
 get neutral(){return this.uniforms.get('homeNeutral').value>.5;}
}
