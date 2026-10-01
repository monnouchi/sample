import test from 'node:test';
import assert from 'node:assert/strict';
import {CHESTS,chestTier,restoreRewards} from '../src/rewards.js';
import {fresh as freshNew,act,DIRS,key,restore,serialize} from '../src/game.js';
import {returnDescription,lightBand,lightAnnouncement} from '../src/messages.js';
test('return copy distinguishes reaching floor3 without claiming a relic',()=>{
 for(const floor of [1,2])assert.match(returnDescription(floor),/届かなくても/);
 assert.match(returnDescription(3),/最深部には到達/);assert.match(returnDescription(3),/星の種はまだ/);assert.doesNotMatch(returnDescription(3),/届かなくても/);
});
test('upper tier resources improve modestly with the same 70/25/5 probabilities',()=>{
 const probability={common:.7,silver:.25,gold:.05};let potions=0,light=0;
 for(const tier of Object.keys(CHESTS)){potions+=probability[tier]*CHESTS[tier].potions;light+=probability[tier]*CHESTS[tier].lightMax;}
 assert.equal(potions,1.05);assert.equal(light,11.75);
 for(const tier of Object.keys(CHESTS)){
  let chosen;
  for(let seed=0;seed<1000;seed++){const s=fresh(seed),[dx,dy]=DIRS[s.dir];if(chestTier(seed,1,s.x+dx,s.y+dy)===tier){chosen=s;break;}}
  assert.ok(chosen);const [dx,dy]=DIRS[chosen.dir],k=key(chosen.x+dx,chosen.y+dy);
  for(const before of [30,99]){const s=structuredClone(chosen);s.light=before;s.map.events[k]='chest';act(s,'forward');const r=s.rewards[0],amount=Math.min(CHESTS[tier].lightMax,101-before);assert.equal(r.potions,CHESTS[tier].potions);assert.equal(s.potions,3+CHESTS[tier].potions);assert.equal(r.lightMax,CHESTS[tier].lightMax);assert.equal(r.light,amount);assert.match(s.log[0],new RegExp(`露の薬${r.potions}個`));assert.match(s.log[0],new RegExp(`灯りが${amount}回復`));assert.deepEqual(restore(serialize(s)),s);const gold=s.gold,qty=s.potions;act(s,'back');act(s,'forward');assert.equal(s.gold,gold);assert.equal(s.potions,qty);assert.equal(s.rewards.length,1);}
 }
});
test('old gold history retains its original one potion and light cap10',()=>{
 const old={id:'3:5,5',floor:3,tier:'gold',gold:37,potions:1,light:2};assert.deepEqual(restoreRewards([old]),[old]);
 const s=fresh(1);s.rewards=[old];s.potions=3;s.gold=37;const loaded=restore(serialize(s));assert.deepEqual(loaded.rewards,[old]);assert.equal(loaded.potions,3);assert.equal(loaded.gold,37);
});
test('announcements change only at bands and safe initial entry stays silent',()=>{
 let previous=null;const emitted=[];
 for(const light of [50,11,10,9,8,7,6,5,4,3,2,1,0,0,0,15,16]){const band=lightBand(light),message=lightAnnouncement(band,previous);if(message)emitted.push(message);previous=band;}
 assert.equal(emitted.length,4);assert.match(emitted[0],/少なく/);assert.match(emitted[1],/残り1/);assert.match(emitted[2],/尽き/);assert.match(emitted[3],/解除/);
});

function fresh(seed){return freshNew(seed,{legacy:true});}
