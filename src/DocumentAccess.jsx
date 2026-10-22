import React,{createContext,useCallback,useContext,useEffect,useState} from 'react';
import {LockKeyhole,X} from 'lucide-react';
import './document-access.css';

// This context controls presentation only. Every source request is authorized
// separately by the server, including direct URLs and media range requests.
const Context=createContext(null);
const fallback={authorized:typeof window==='undefined',checking:false,configured:true,requestUnlock:()=>{},lock:()=>{},login:async()=>false};
export const useDocumentAccess=()=>useContext(Context)||fallback;
export function DocumentAccessProvider({children}){
 const [authorized,setAuthorized]=useState(false),[checking,setChecking]=useState(true),[configured,setConfigured]=useState(true),[prompt,setPrompt]=useState(false),[expiresAt,setExpiresAt]=useState(0);
 const refresh=useCallback(async()=>{try{const response=await fetch('/api/documents/session',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();setAuthorized(data.authorized===true);setConfigured(data.configured===true);setExpiresAt(data.expiresAt||0);}catch{setAuthorized(false);setConfigured(false);}finally{setChecking(false);}},[]);
 useEffect(()=>{refresh();const visible=()=>{if(document.visibilityState==='visible')refresh();};document.addEventListener('visibilitychange',visible);return()=>document.removeEventListener('visibilitychange',visible);},[refresh]);
 useEffect(()=>{if(!expiresAt)return;const timer=setTimeout(()=>{setAuthorized(false);setExpiresAt(0);},Math.max(0,expiresAt-Date.now()));return()=>clearTimeout(timer);},[expiresAt]);
 const login=useCallback(async password=>{const response=await fetch('/api/documents/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});if(response.status===401)throw Error('password');if(response.status===429)throw Error('attempts');if(!response.ok)throw Error('service');const data=await response.json();setAuthorized(true);setConfigured(true);setExpiresAt(data.expiresAt);setPrompt(false);return true;},[]);
 const lock=useCallback(async()=>{setAuthorized(false);setExpiresAt(0);await fetch('/api/documents/logout',{method:'POST',credentials:'same-origin'}).catch(()=>{});},[]);
 const value={authorized,checking,configured,login,lock,requestUnlock:()=>setPrompt(true)};
 return <Context.Provider value={value}>{children}{prompt&&!authorized&&<div className="document-auth-overlay" onClick={()=>setPrompt(false)}><section role="dialog" aria-modal="true" aria-labelledby="document-auth-title" onClick={e=>e.stopPropagation()}><button className="document-auth-close" aria-label="סגירה" onClick={()=>setPrompt(false)}><X size={20}/></button><DocumentLockForm/></section></div>}</Context.Provider>;
}
export function DocumentLockForm({lang='he'}){
 const he=lang==='he',{login,checking,configured}=useDocumentAccess(),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event){event.preventDefault();const entered=password;setPassword('');setBusy(true);setError('');try{await login(entered);}catch(e){setError(e.message==='password'?(he?'הסיסמה אינה נכונה':'Incorrect password'):e.message==='attempts'?(he?'בוצעו ניסיונות רבים. נסו שוב מאוחר יותר.':'Too many attempts. Please try later.'):(he?'שירות המסמכים אינו זמין כרגע':'Document service is unavailable'));}finally{setBusy(false);}}
 return <form className="document-lock-form" dir={he?'rtl':'ltr'} onSubmit={submit}><LockKeyhole size={24}/><h3 id="document-auth-title">{he?'מסמכים ותמונות מוגנים':'Protected documents & photos'}</h3><p>{he?'הזינו סיסמה לפתיחת תמונות המקור והתוכניות. הגישה נפתחת לשעתיים.':'Enter the password to view original photographs and plans. Access lasts two hours.'}</p>{checking?<p role="status">{he?'בודק גישה…':'Checking access…'}</p>:!configured?<p role="alert">{he?'הגישה למסמכים טרם הוגדרה בשרת.':'Document access has not been configured on the server.'}</p>:<><label>{he?'סיסמה':'Password'}<input type="password" autoComplete="current-password" maxLength={256} required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label><button type="submit" disabled={busy}>{busy?(he?'בודק…':'Checking…'):(he?'פתיחת המסמכים':'Unlock documents')}</button></>}{error&&<p role="alert">{error}</p>}</form>;
}
export function DocumentGate({children,lang='he'}){
 const {authorized,lock}=useDocumentAccess();return authorized?<><div className="document-session-bar"><span>{lang==='he'?'מסמכים פתוחים זמנית':'Documents temporarily unlocked'}</span><button onClick={lock}><LockKeyhole size={14}/>{lang==='he'?'נעילה':'Lock'}</button></div>{children}</>:<DocumentLockForm lang={lang}/>;
}
export function ProtectedImage({src,alt,...props}){
 const {authorized,requestUnlock}=useDocumentAccess();const protectedSource=/^\/(house|plans)\//.test(src||'')||(src||'').startsWith('/materials/owner-products/')||(src||'').startsWith('/materials/harash/');
 if(!protectedSource||authorized)return <img src={src} alt={alt} {...props}/>;
 return <span className="document-image-lock" role="button" tabIndex={0} aria-label="פתיחת תמונת מקור מוגנת" onClick={e=>{e.preventDefault();e.stopPropagation();requestUnlock();}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();requestUnlock();}}}><LockKeyhole size={20}/><span>{alt}</span><small>פתיחת תמונת המקור</small></span>;
}
