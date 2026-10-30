import React,{useCallback,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {DocumentAccessProvider,useDocumentAccess} from './DocumentAccess.jsx';
import {LoadingIndicator} from './LoadingIndicator.jsx';
import {DistrictViewer} from '../public-view/DistrictViewer.jsx';
import {createPersonalDistrictVariant} from './personal-district.mjs';
import {readPersonalDistrictDesign,personalTourView} from './personal-district-state.mjs';
import './personal-district.css';

function PersonalDistrict(){
 const access=useDocumentAccess(),[design]=useState(()=>readPersonalDistrictDesign(localStorage)),[view]=useState(()=>personalTourView(window.location.search,design.home.solar));
 const createVariant=useCallback(args=>createPersonalDistrictVariant({...args,settings:design.home,kitchenSettings:design.kitchen}),[design]);
 useEffect(()=>{if(!access.checking&&!access.authorized)window.location.replace('/');},[access.checking,access.authorized]);
 if(!access.authorized)return <div className="personal-loading" dir="rtl"><LoadingIndicator message="בודק גישה…"/></div>;
 const lock=async()=>{await access.lock();window.location.replace('/');};
 return <DistrictViewer createVariant={createVariant} initialView={view} banner={<nav className="personal-district-banner" aria-label="תכנון אישי"><span>המתחם שלי · תכנון אישי</span><a href="/_personal/index.html#/edit">עריכת הבית שלי</a><button onClick={lock}>נעילה</button></nav>} optionsContent={<section className="personal-district-actions"><h3>הדירה שלי · 4102</h3><p>המתחם המלא עם השינויים השמורים בדירה ובחצר שלך. לשינוי ריהוט, חומרים ותכנון — פתחו את העורך.</p><a className="primary" href="/_personal/index.html#/edit">עריכת הבית והחצר</a><a className="primary" href="/_personal/index.html#/kitchen">המטבח המפורט</a><p>בסיום העריכה, חזרו ל״המתחם שלי״ כדי לראות את השינויים. בתצוגת הדירה ובסיור אפשר לפתוח ולסגור דלתות בכל הדירות ובכל הבניינים. דלתות הכניסה כהות וקירות המסדרון המשותף בגוון מרווה.</p></section>}/>;
}
createRoot(document.getElementById('root')).render(<DocumentAccessProvider><PersonalDistrict/></DocumentAccessProvider>);
