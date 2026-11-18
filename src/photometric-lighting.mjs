import {Color} from 'three';

// Full power preserves the chosen colour temperature. Dimmed warm-white
// apertures move smoothly toward 2400 K, with a gentle evening bias.
export function warmDimColor(baseHex='#fff1e0',dimmerLevel=1,nightMode=false){
 const level=Math.max(0,Math.min(1,Number.isFinite(dimmerLevel)?dimmerLevel:1));
 const smooth=level*level*(3-2*level),amount=1-smooth;
 return new Color(baseHex).lerp(new Color('#ffbe7b'),amount+(nightMode?.18:0)*(1-amount));
}
