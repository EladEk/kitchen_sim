import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {HomePlan} from './HomePlan.jsx';
import {FloorPlan} from './PlanViews.jsx';
import {planningReport} from './planning-report.mjs';
export function downloadPlanningSheet(pair,image){
 const home={...pair.home,cleanView:false,showElectrical:true,showWater:true,showLighting:true},kitchen={...pair.kitchen,cleanView:false,showElectrical:true,showWater:true,showLighting:true};
 const planSvg=renderToStaticMarkup(<HomePlan settings={home} selectedRoom={null}/>),kitchenSvg=renderToStaticMarkup(<FloorPlan settings={kitchen}/>);
 const html=planningReport({...pair,planSvg,kitchenSvg,image}),url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`home-studio-planning-${new Date().toISOString().slice(0,10)}.html`;link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
