import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,DIRS,key,serialize,restore} from '../src/game.js';
import {chestTier,rewardGold,restoreRewards} from '../src/rewards.js';
function chest(seed=3,light=95){const s=fresh(seed);s.light=light;const [dx,dy]=DIRS[s.dir];const k=key(s.x+dx,s.y+dy);s.map.events[k]='chest';return [s,k];}
test('reward is awarded once, persisted before presentation, and unchanged by reload/re-entry',()=>{
 const [s,k]=chest();act(s,'forward');assert.equal(s.rewards.length,1);assert.equal(s.rewards[0].light,6);assert.equal(s.potions,4);assert.equal(s.pendingReward,s.rewards[0].id);assert.equal(s.map.events[k],undefined);
 const reloaded=restore(serialize(s));assert.deepEqual(reloaded,s);const gold=s.gold,rng=s.rng;act(reloaded,'back');act(reloaded,'forward');assert.equal(reloaded.gold,gold);assert.equal(reloaded.rng,rng);assert.equal(reloaded.rewards.length,1);
 // Even an accidentally duplicated event with a recorded ID cannot grant again.
 act(reloaded,'back');reloaded.map.events[k]='chest';act(reloaded,'forward');assert.equal(reloaded.gold,gold);assert.equal(reloaded.potions,4);
});
test('legacy and malformed optional reward history preserve the core save',()=>{
 const s=fresh(3);delete s.rewards;delete s.pendingReward;s.hp=73;
 const old=restore(serialize(s));assert.equal(old.hp,73);assert.deepEqual(old.rewards,[]);assert.equal(old.pendingReward,null);
 const [opened]=chest();act(opened,'forward');for(const value of [null,'bad',{},[null,{tier:'gold'}]]){const raw={...opened,rewards:value,pendingReward:'bad'};const r=restore(serialize(raw));assert.equal(r.hp,opened.hp);assert.equal(r.gold,opened.gold);assert.deepEqual(r.rewards,[]);assert.equal(r.pendingReward,null);}
 const valid=opened.rewards[0];assert.deepEqual(restoreRewards([null,valid,valid,{...valid,id:'oops'}]),[valid]);
 const nine=Array.from({length:12},(_,i)=>({...valid,id:`${1+Math.floor(i/9)}:${1+i%9},1`,floor:1+Math.floor(i/9)}));assert.equal(restoreRewards(nine).length,9);
});
test('tiers are deterministic, approximately 70/25/5 and maintain useful rewards near prior average',()=>{
 const counts={common:0,silver:0,gold:0};let sum=0;
 for(let seed=0;seed<10000;seed++){const t=chestTier(seed,1,3,5);assert.equal(t,chestTier(seed,1,3,5));counts[t]++;for(let roll=0;roll<18;roll++){const gold=rewardGold(t,roll);assert.ok(gold>=18&&gold<=45);sum+=gold;}}
 assert.ok(counts.common>6800&&counts.common<7200);assert.ok(counts.silver>2300&&counts.silver<2700);assert.ok(counts.gold>400&&counts.gold<600);assert.ok(sum/180000>26&&sum/180000<28);
 console.log('Tier samples / mean crystals:',counts,sum/180000);
});
test('low light costs only movement, causes death before chest grant, and return stays legal only outside battle',()=>{
 const [s]=chest(3,1);s.hp=3;act(s,'left');assert.equal(s.light,1);act(s,'right');act(s,'forward');assert.equal(s.phase,'dead');assert.equal(s.hp,0);assert.deepEqual(s.rewards,[]);assert.equal(act(s,'return'),false);
 const a=fresh(3);a.light=1;a.map.events={};act(a,'forward');assert.equal(a.light,0);assert.equal(a.hp,96);act(a,'back');assert.equal(a.hp,92);act(a,'return');assert.equal(a.phase,'returned');
 const b=fresh(3);b.phase='battle';b.enemy={name:'敵',hp:25,maxHp:25,turn:0,boss:false};assert.equal(act(b,'return'),false);
});
