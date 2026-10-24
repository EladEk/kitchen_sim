import {LAUNDRY_SCREEN_LAYOUT} from './laundry-screen-layout.mjs';
// Each floor retains its own native CAD registration, including the L returns.
// Repeated storey heights and slat profiles remain photographic estimates.
export const laundryScreens=level=>LAUNDRY_SCREEN_LAYOUT.filter(s=>s.level===level);
export const LAUNDRY_SCREENS=laundryScreens(1).filter(s=>!s.id.endsWith('-return'));
