import {LIGHTING_LAYOUT,KITCHEN_ANCHOR} from './home-model.mjs';
import {ROOM} from './model.mjs';
import {localKitchenLighting} from './home-lighting.mjs';
// The detailed room has its own pre-existing assumed ceiling height (260 cm).
// Keep horizontal source locations identical through the established transform.
export const KITCHEN_LIGHTING_POINTS=localKitchenLighting(LIGHTING_LAYOUT.points,KITCHEN_ANCHOR).map(p=>({...p,height:ROOM.height/1000,position:[p.position[0],ROOM.height/1000,p.position[2]]}));
