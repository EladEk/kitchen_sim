export const EVIDENCE_LABELS={plan:['לפי תוכנית / מפרט','Plan / specification'],photo:['נצפה בצילום','Observed in photo'],estimate:['הערכה במודל','Model estimate'],user:['בחירה שלך','Your design choice']};
// Evidence for identity/appearance is separate from coordinate/size accuracy.
export function designEvidence(item,settings={}){
 const yardId=item?.id==='garden-pergola'?'pergola':item?.id==='garden-shed'?'shed':item?.id?.startsWith('fence-')&&item?.planned?'fence':null;
 const chosen=!!(settings.furnitureLayout?.[item?.id]||item?.userPlacement||item?.userDimensions||item?.relocation||item?.planned||settings.yardDesign?.[yardId]);
 if(yardId)return {basis:'user',position:yardId==='fence'?'plan':settings.yardDesign?.[yardId]?'user':'estimate',dimensions:settings.yardDesign?.[yardId]?'user':'estimate'};
 if(item?.lighting||item?.electrical||item?.status==='observed')return {basis:'photo',position:chosen?'user':'estimate',dimensions:'estimate'};
 if(item?.water)return {basis:'plan',position:'estimate',dimensions:'estimate'};
 if(item?.illustrative||item?.kind==='bed'||item?.kind==='desk')return {basis:chosen?'user':item?.ordered?'plan':'estimate',position:item?.userPlacement?'user':'estimate',dimensions:item?.userDimensions?'user':'estimate'};
 if(chosen)return {basis:'user',position:'user',dimensions:'user'};
 if(['site-photos','exterior-details','entry-services'].includes(item?.source))return {basis:'photo',position:'estimate',dimensions:'estimate'};
 return {basis:'plan',position:'plan',dimensions:item?.dimensionsInferred?'estimate':'plan'};
}
