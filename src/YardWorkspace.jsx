import {useRef,useEffect,useState} from 'react';
import {HomeView} from './HomeView.jsx';
import {YardPlan} from './YardPlan.jsx';
export function YardWorkspace({settings,kitchenSettings,selectedId,onSelect,onMove}){
 const view=useRef(),[split,setSplit]=useState(true),he=settings.lang==='he';
 useEffect(()=>{view.current?.focusBuilding({shed:'garden-shed',pergola:'garden-pergola',fence:'fence-west'}[selectedId]);},[selectedId,split,settings.cleanView]);
 return <div className={`yard-workspace ${split?'is-split':''} ${settings.cleanView?'is-clean':''}`}>
  {!settings.cleanView&&<div className="yard-workspace-tools"><span>{he?'תוכנית ותוצאה חיה':'Plan and live result'}</span><label><input type="checkbox" checked={split} onChange={e=>setSplit(e.target.checked)}/>{he?'תלת־ממד לצד התוכנית':'3D beside plan'}</label></div>}
  {!settings.cleanView&&<div className="yard-workspace-plan"><YardPlan settings={settings} selectedId={selectedId} onSelect={onSelect} onMove={onMove}/></div>}
  {(split||settings.cleanView)&&<div className="yard-workspace-preview" aria-label={he?'תצוגה חיה של החצר':'Live yard preview'}><HomeView ref={view} settings={{...settings,cutaway:true,labels:false}} kitchenSettings={kitchenSettings} mode="room" selectedRoom="garden" navigationLocked={false}/></div>}
 </div>;
}
