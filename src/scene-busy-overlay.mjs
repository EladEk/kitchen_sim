// Native renderer tasks share the same status design as React scene loaders.
// It remains pointer-transparent, so the photo toggle can always cancel work.
export function createSceneBusyOverlay(host){
 let root=null,title=null,detail=null,attached=false,disposed=false;
 return {
  show(message,description=''){
   if(disposed)return;
   if(!root){
    root=document.createElement('div');root.className='studio-loader studio-loader--overlay studio-loader--render-task';root.setAttribute('role','status');root.setAttribute('aria-live','polite');root.setAttribute('aria-busy','true');root.setAttribute('dir','auto');
    const ring=document.createElement('span');ring.className='studio-loader-ring';ring.setAttribute('aria-hidden','true');title=document.createElement('strong');detail=document.createElement('small');root.append(ring,title,detail);
   }
   title.textContent=message;detail.textContent=description;
   if(!attached){host.append(root);attached=true;}
  },
  hide(){if(attached){root.remove();attached=false;}},
  dispose(){if(disposed)return;disposed=true;if(attached)root.remove();attached=false;root=title=detail=null;}
 };
}
