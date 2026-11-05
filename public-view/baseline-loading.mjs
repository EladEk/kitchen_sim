import {fetchLoadingJSON} from '../src/loading-progress.mjs';
import {APP_REVISION} from './revision.mjs';
// The build records decoded UTF-8 lengths. Content-Length alone can describe
// gzip transfer bytes while Fetch streams decoded bytes, giving a false 100%.
export async function loadPublicBaseline({revision=APP_REVISION,signal,onProgress=()=>{},fetcher}={}){
 const suffix='?v='+revision,manifest=await fetchLoadingJSON('/baseline/loading.json'+suffix,{signal,fetcher,cache:'no-cache'});onProgress(.04);
 if(manifest.revision!==revision)throw Error('Baseline loading manifest does not match '+revision);
 const paths=['navigation.json','building.json','site.json'],sizes=paths.map(path=>manifest.bytes[path]),loaded=new Array(paths.length).fill(0);
 if(sizes.some(n=>!Number.isSafeInteger(n)||n<=0))throw Error('Invalid baseline download sizes');
 const total=sizes.reduce((a,b)=>a+b,0);
 const data=await Promise.all(paths.map((path,i)=>fetchLoadingJSON('/baseline/'+path+suffix,{signal,fetcher,cache:'no-cache',expectedBytes:sizes[i],onProgress:event=>{loaded[i]=event.done?sizes[i]:Math.min(sizes[i]*.99,event.loaded);onProgress(.04+.96*loaded.reduce((a,b)=>a+b,0)/total);}})));
 const expected=Number(revision.replace(/^R/,''));
 if(!Number.isSafeInteger(expected)||data[0]?.revision!==expected)throw Object.assign(Error('נתוני הבניין אינם תואמים לגרסה '+revision+'.'),{code:'BASELINE_REVISION_MISMATCH',details:{expectedRevision:expected,receivedRevision:data[0]?.revision??null}});
 return data;
}
