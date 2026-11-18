// Return a promise's value if it has already settled, without waiting for a
// pending one. Rejects immediately if the promise has already failed.
export function peekFulfilled(promise){
 let status='pending',value,error;
 promise.then(next=>{status='fulfilled';value=next;},reason=>{status='rejected';error=reason;});
 return Promise.resolve().then(()=>{
  if(status==='fulfilled')return value;
  if(status==='rejected')throw error;
 });
}
