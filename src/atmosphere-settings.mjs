// Shared clear-air defaults for physical WebGPU and analytic WebGL skies.
export const MEDITERRANEAN_ATMOSPHERE=Object.freeze({
 turbidity:1.95,rayleigh:1.45,cloudCoverage:.02,cloudDensity:.04,
 fogColor:'#f4efe6',fogDensity:.00008,indoorFogReduction:.95,
});

export function updateAtmosphereFog(fog,state,{interior=0}={}){
 fog.color.set(state.dark||state.sun.elevation<-6?'#050914':state.sun.elevation<10?'#bcb4b1':MEDITERRANEAN_ATMOSPHERE.fogColor);
 fog.density=MEDITERRANEAN_ATMOSPHERE.fogDensity*(1-Math.max(0,Math.min(1,interior))*MEDITERRANEAN_ATMOSPHERE.indoorFogReduction);
 return fog;
}
