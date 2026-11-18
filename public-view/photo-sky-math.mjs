// Pure helpers for photo-sky.mjs (testable without Vite asset imports).
export const PHOTO_SKY_SUN_U=.592;// horizontal position of the sun in the pano
export function photoSkyStrength(state){
 if(!state||state.dark)return 0;const e=state.sun?.elevation??0;return Math.max(0,Math.min(1,(e-2)/12));
}
// Mesh yaw that puts the photographed sun on the real sun azimuth. The sphere is
// mirrored (scale.x=-1) so the pano reads correctly from inside.
export function photoSkyYaw(direction){
 const a=2*Math.PI*PHOTO_SKY_SUN_U;return Math.atan2(Math.sin(a),Math.cos(a))-Math.atan2(direction?.[2]??0,direction?.[0]??1);
}
