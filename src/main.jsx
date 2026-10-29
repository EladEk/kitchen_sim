import {LoadingIndicator} from './LoadingIndicator.jsx';
import React,{Suspense,lazy,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import HomeApp from './HomeApp.jsx';
import './base.css';
import './private-shell.css';
import {DocumentAccessProvider,useDocumentAccess} from './DocumentAccess.jsx';
const KitchenApp=lazy(()=>import('./KitchenApp.jsx'));
function App(){
 const access=useDocumentAccess();
 useEffect(()=>{if(!access.checking&&!access.authorized)window.location.replace('/');},[access.checking,access.authorized]);
 const [hash,setHash]=useState(window.location.hash);
 useEffect(()=>{const change=()=>setHash(window.location.hash);window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);},[]);
 const kitchen=hash==='#/kitchen';
 if(!access.authorized)return <div className="app-loading"><LoadingIndicator message="בודק גישה…"/></div>;
 return <div className="private-shell"><div className="private-access-banner" dir="rtl"><span>תכנון אישי · גישה מוגנת</span><button onClick={async()=>{await access.lock();window.location.replace('/');}}>נעילה וחזרה לתצוגה הציבורית</button></div><div className="private-workspace"><Suspense fallback={<div className="app-loading" dir="rtl"><LoadingIndicator message="טוען את המטבח שלך…"/></div>}>{kitchen?<KitchenApp onHome={()=>{window.location.hash='/room/kitchen';}}/>:<HomeApp key={hash} initialRoom={hash.startsWith('#/room/')?hash.slice(7):'living'} onKitchen={()=>{window.location.hash='/kitchen';}}/>}</Suspense></div></div>;
}
createRoot(document.getElementById('root')).render(<DocumentAccessProvider><App/></DocumentAccessProvider>);
