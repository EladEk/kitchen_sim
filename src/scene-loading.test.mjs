import test from 'node:test';
import assert from 'node:assert/strict';
import {trackSceneAsset,sceneAssetCount,subscribeSceneAssets} from './scene-loading.mjs';
test('loader tracks concurrent real work, clears rejected loads and releases subscriptions',async()=>{
 const counts=[],off=subscribeSceneAssets(()=>counts.push(sceneAssetCount()));let done;
 const slow=trackSceneAsset(new Promise(resolve=>{done=resolve;}));
 const failed=trackSceneAsset(Promise.reject(Error('offline')));
 assert.equal(sceneAssetCount(),2);await assert.rejects(failed,/offline/);assert.equal(sceneAssetCount(),1);
 done('ready');assert.equal(await slow,'ready');assert.equal(sceneAssetCount(),0);assert.deepEqual(counts,[1,2,1,0]);off();
 await trackSceneAsset(Promise.resolve());assert.equal(counts.length,4);
});
test('asset percentages count settled work and stay monotonic as a batch discovers more textures',async()=>{const {sceneAssetProgress}=await import('./scene-loading.mjs');let a,b,c;const first=trackSceneAsset(new Promise(r=>a=r)),second=trackSceneAsset(new Promise(r=>b=r));const generation=sceneAssetProgress().generation;assert.equal(sceneAssetProgress().percent,0);a();await first;assert.equal(sceneAssetProgress().percent,50);const third=trackSceneAsset(new Promise(r=>c=r));assert.equal(sceneAssetProgress().percent,50);b();await second;assert(sceneAssetProgress().percent>=50&&sceneAssetProgress().percent<100);c();await third;assert.equal(sceneAssetProgress().percent,100);assert.equal(sceneAssetProgress().done,3);assert.equal(sceneAssetProgress().generation,generation);});
