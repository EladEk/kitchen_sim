export function initialRenderBudget({mobile=false,pixelRatio=1}={}){return {mobile,ratio:Math.min(pixelRatio,mobile?1.25:1.7),light:mobile,slowFrames:0};}
export function updateRenderBudget(budget,frameMs){
 if(!budget.mobile||!Number.isFinite(frameMs)||frameMs>250)return budget;
 const slowFrames=frameMs>45?budget.slowFrames+1:Math.max(0,budget.slowFrames-1);
 return slowFrames>=60?{...budget,ratio:Math.max(.8,budget.ratio-.15),slowFrames:0}:{...budget,slowFrames};
}
