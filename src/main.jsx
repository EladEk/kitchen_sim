import React,{Suspense,lazy,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import HomeApp from './HomeApp.jsx';
import './base.css';
const KitchenApp=lazy(()=>import('./KitchenApp.jsx'));
function App(){
 const [hash,setHash]=useState(window.location.hash);
 useEffect(()=>{const change=()=>setHash(window.location.hash);window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);},[]);
 const kitchen=hash==='#/kitchen';
 return <Suspense fallback={<div className="app-loading" dir="rtl">טוען את המטבח שלך…</div>}>{kitchen?<KitchenApp onHome={()=>{window.location.hash='/room/kitchen';}}/>:<HomeApp key={hash} initialRoom={hash.startsWith('#/room/')?hash.slice(7):'living'} onKitchen={()=>{window.location.hash='/kitchen';}}/>}</Suspense>;
}
createRoot(document.getElementById('root')).render(<App/>);
