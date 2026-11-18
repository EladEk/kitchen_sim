import test from 'node:test';
import assert from 'node:assert/strict';
import {peekFulfilled} from './peek-fulfilled.mjs';

test('peekFulfilled returns a value that already resolved and does not wait for a pending promise',async()=>{
 assert.equal(await peekFulfilled(Promise.resolve('ready')),'ready');
 let finished=false;const pending=new Promise(resolve=>setTimeout(()=>{finished=true;resolve('late');},20));
 assert.equal(await peekFulfilled(pending),undefined);
 assert.equal(finished,false);
 await pending;assert.equal(finished,true);
});

test('peekFulfilled rethrows a rejection that has already settled',async()=>{
 const failed=Promise.reject(Object.assign(Error('missing'),{code:'FURNITURE'}));
 failed.catch(()=>{});
 await assert.rejects(peekFulfilled(failed),{code:'FURNITURE'});
});
