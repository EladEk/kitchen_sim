import test from 'node:test';
import assert from 'node:assert/strict';
import {tourPreparationKey} from './tour-preparation.mjs';

test('the prepared floor is reused from lobby through all apartments, with floors and buildings isolated',()=>{
 const base={b:{id:'4102'},at:{floor:0,unit:4}};
 const keys=['living','hall','bathroom','master','hall','living'].map(key=>tourPreparationKey({...base,region:{key}}));assert.equal(new Set(keys).size,1);
 const lobby=tourPreparationKey({...base,at:{floor:0},region:{key:'lobby'}});assert.equal(lobby,tourPreparationKey({...base,at:{floor:0},region:{key:'stairs'}}));
 assert.equal(keys[0],lobby);assert.notEqual(keys[0],tourPreparationKey({...base,at:{floor:1,unit:4}}));assert.equal(keys[0],tourPreparationKey({...base,at:{floor:0,unit:3}}));assert.notEqual(keys[0],tourPreparationKey({...base,b:{id:'4092'}}));
});
