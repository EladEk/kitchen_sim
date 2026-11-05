// Native renderer tasks share the same status design as React scene loaders.
// It remains pointer-transparent, so the photo toggle can always cancel work.
export function createSceneBusyOverlay(host){
 let root=null,title=null,detail=null,number=null,bar=null,value=0,attached=false,disposed=false;
 const setProgress=next=>{if(disposed||!bar)return;value=Math.max(value,loadingPercent(next));number.textContent=value+'%';bar.value=value;};
 return {
  show(message,description='',progress=0){
   if(disposed)return;
   if(!root){
    root=document.createElement('div');root.className='studio-loader studio-loader--overlay studio-loader--render-task';root.setAttribute('role','status');root.setAttribute('aria-live','polite');root.setAttribute('aria-busy','true');root.setAttribute('dir','auto');
    const ring=document.createElement('span');ring.className='studio-loader-ring';ring.setAttribute('aria-hidden','true');title=document.createElement('strong');detail=document.createElement('small');const progressBox=document.createElement('div');progressBox.className='studio-loader-progress';progressBox.setAttribute('aria-live','off');number=document.createElement('span');number.className='studio-loader-percent';number.setAttribute('dir','ltr');number.setAttribute('aria-hidden','true');bar=document.createElement('progress');bar.max=100;bar.setAttribute('aria-label','התקדמות טעינה');progressBox.append(number,bar);root.append(ring,title,detail,progressBox);
   }
   title.textContent=message;detail.textContent=description;
   if(!attached){value=0;host.append(root);attached=true;}setProgress(progress);
  },
  setProgress,
  hide(){if(attached){root.remove();attached=false;}},
  dispose(){if(disposed)return;disposed=true;if(attached)root.remove();attached=false;root=title=detail=number=bar=null;}
 };
}
import {loadingPercent} from './loading-progress.mjs';
