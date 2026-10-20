import {Eye,Maximize2,Minimize2} from 'lucide-react';
import './render-controls.css';
import {VrControls} from './VrControls.jsx';
export function RenderControls({settings,onChange,onEyeLevel,vr,onVR}){
 const he=settings.lang==='he';return <div className="render-controls" role="group" aria-label={he?'איכות ותצוגת ההדמיה':'Rendering and display'}><Eye size={15}/><select aria-label={he?'איכות תצוגה':'Render quality'} value={settings.renderQuality==='light'?'light':'realistic'} onChange={e=>onChange('renderQuality',e.target.value)}><option value="realistic">{he?'חומרים ועומק':'Materials & depth'}</option><option value="light">{he?'תצוגה קלה':'Light rendering'}</option></select><button data-scene-ui-toggle aria-pressed={!!settings.cleanView} onClick={()=>onChange('cleanView',!settings.cleanView)}>{settings.cleanView?<Minimize2 size={15}/>:<Maximize2 size={15}/>}<span>{settings.cleanView?(he?'הצגת הפקדים':'Show controls'):(he?'הסתרת כל הפקדים':'Hide all controls')}</span></button>{onEyeLevel&&<button onClick={onEyeLevel}><Eye size={15}/><span>{he?'גובה עיניים':'Eye level'}</span></button>}{onVR&&<VrControls state={vr} lang={settings.lang} onToggle={onVR}/>}</div>;
}
