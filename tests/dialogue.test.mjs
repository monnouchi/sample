import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,restore,serialize} from '../src/game.js';
import {LAYERS} from '../src/story.js';
import {COMPANIONS} from '../src/companions.js';
const copy=s=>restore(serialize(s));
function step(s){assert.ok(act(s,s.steps%2?'back':'forward'));}
test('conversation and event outputs stay separate on start, movement, descent, rest and reload',()=>{
 let s=fresh(3,{companion:'mei'});assert.equal(s.dialogue,COMPANIONS.mei.intro);assert.ok(!s.log.join('').includes(s.dialogue));s.map.events={};
 for(let i=0;i<24;i++){step(s);assert.ok(!s.log.join('').includes(LAYERS[0].detail));s=copy(s);}
 assert.equal(s.dialogue,LAYERS[0].detail);assert.deepEqual(s.ambientSeen,[1]);
 s.phase='stairs';act(s,'descend');assert.equal(s.dialogue,LAYERS[1].text);assert.match(s.eventNotice,/第2層/);assert.ok(!s.log[0].includes(s.dialogue));
 s.floor=4;s.map.events[`${s.x},${s.y}`]='rest';s.hp=20;act(s,'rest');assert.match(s.log[0],/体力が80回復/);assert.ok(!s.log[0].includes(s.dialogue));assert.deepEqual(copy(s),s);
});
test('legacy conversation migration retains recovery, unknown events and important seed results',()=>{
 const s=fresh(3,{companion:'mei'});delete s.dialogueSchema;
 s.log=[`メイ「${COMPANIONS.mei.intro}」`,`第2層へ。メイ「${LAYERS[1].text}」体力が18回復。`,`メイ「休めたね。体力が80回復。薬を2個補充した。」`,'星の種を手に入れた！'];
 const out=copy(s);assert.equal(out.log.length,3);assert.match(out.log[0],/体力が18回復/);assert.match(out.log[1],/体力が80回復/);assert.match(out.log[2],/灯草の種/);assert.deepEqual(copy(out),out);
 delete s.dialogueSchema;s.log=[`宝箱の刻文：メイ「${COMPANIONS.mei.intro}」`];assert.deepEqual(copy(s).log,s.log);
 const old=fresh(1,{legacy:true});assert.deepEqual(copy(old).log,old.log);
});
test('support remains mechanical feedback; potion notice and important results survive restore',()=>{
 const s=fresh(31,{companion:'mei'});s.phase='battle';s.hp=60;s.supportCharge=1;s.enemy={name:'敵',hp:100,maxHp:100,turn:0,boss:false};act(s,'attack');assert.match(s.supportLog,/小手当/);assert.equal(s.dialogue,COMPANIONS.mei.intro);
 s.phase='explore';s.enemy=null;act(s,'potion');assert.match(s.eventNotice,/露の薬/);assert.deepEqual(copy(s),s);
});
