import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,restore,serialize} from '../src/game.js';
import {LAYERS} from '../src/story.js';
function step(s){assert.ok(act(s,s.steps%2?'back':'forward'));}
test('scenery speaks once per floor including reload; next floor still speaks',()=>{
 let s=fresh(3,{companion:'ren'});s.map.events={};let delivered=0;
 for(let i=0;i<24;i++){step(s);if(s.log[0].includes(LAYERS[0].detail))delivered++;s=restore(serialize(s));}
 assert.equal(delivered,1);assert.deepEqual(s.ambientSeen,[1]);
 s.phase='stairs';act(s,'descend');assert.match(s.log[0],/レン/);s.map.events={};
 for(let i=0;i<4;i++)step(s);assert.ok(s.log[0].includes(LAYERS[1].detail));assert.deepEqual(s.ambientSeen,[1,2]);
});
test('pre-update saves suppress replay without changing old logs/resources; warnings and support remain',()=>{
 let s=fresh(3,{companion:'ren'});s.map.events={};for(let i=0;i<8;i++)step(s);delete s.ambientSeen;
 const oldLog=[...s.log],hp=s.hp;s=restore(serialize(s));assert.deepEqual(s.log,oldLog);assert.equal(s.hp,hp);
 for(let i=0;i<4;i++)step(s);assert.ok(!s.log[0].includes(LAYERS[0].detail));
 s.light=1;step(s);assert.match(s.log[0],/闇が体力を4/);
 s.phase='battle';s.enemy={name:'敵',hp:100,maxHp:100,turn:0,boss:false};act(s,'skill');assert.match(s.supportLog,/レン：共鳴/);
});
