import {loadPublicBaseline} from '../public-view/baseline-loading.mjs';
import {APP_REVISION,BASELINE_REVISION} from '../public-view/revision.mjs';
const origin=process.argv[2];if(!origin)throw Error('Pass the deployed public Site origin.');
const requests=[];
const [nav,building,site]=await loadPublicBaseline({fetcher:async(path,options)=>{const response=await fetch(new URL(path,origin),options);requests.push({path,status:response.status});return response;}});
if(nav.revision!==BASELINE_REVISION||!building.object||!site)throw Error('Incomplete live baseline');
console.log(JSON.stringify({revision:APP_REVISION,navigationRevision:nav.revision,apartments:nav.destinations.filter(d=>d.unit).length,buildingLoaded:true,siteLoaded:true,requests}));
