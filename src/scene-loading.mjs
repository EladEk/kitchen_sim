let pending=0;
const listeners=new Set();
export const sceneAssetCount=()=>pending;
export const subscribeSceneAssets=listener=>{listeners.add(listener);return()=>listeners.delete(listener);};
function notify(){for(const listener of listeners)listener();}
// Count real outstanding work, including failures; never invent percentages.
export function trackSceneAsset(task){pending++;notify();return Promise.resolve(task).finally(()=>{pending--;notify();});}
