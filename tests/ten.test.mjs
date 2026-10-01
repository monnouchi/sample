import {intent} from '../src/boss.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,generate,act,restore,serialize,key,DIRS,floorName} from '../src/game.js';
import {maxFloor,COMPANIONS} from '../src/companions.js';
function route(s,to){const q=[[s.x,s.y,[]]],seen=new Set([key(s.x,s.y)]);for(const [x,y,path] of q){if(key(x,y)===key(...to))return path;for(let d=0;d<4;d++){const [dx,dy]=DIRS[d],nx=x+dx,ny=y+dy,k=key(nx,ny);if(s.map.grid[ny]?.[nx]===0&&!seen.has(k)){seen.add(k);q.push([nx,ny,[...path,d]]);}}}throw Error('unreachable');}
export function expedition(seed,companion){let s=fresh(seed,{companion}),turns=0,uses=0;for(let floor=1;floor<=10;floor++){
 if([4,8].includes(floor)){assert.ok(act(s,'rest'));uses++;const before=serialize(s);assert.equal(act(s,'rest'),false);assert.equal(serialize(s),before);}
 const restored=restore(serialize(s));assert.deepEqual(restored,s);s=restored;
 for(const d of route(s,s.map.exit)){while(s.dir!==d)act(s,'right');act(s,'forward');
  while(s.phase==='battle'){turns++;if(turns>200)throw Error('infinite fight');const a=s.hp<=40&&s.potions?'potion':intent(s.enemy)==='heavy'?'guard':s.focus>=3?'skill':'attack';act(s,a);const r=restore(serialize(s));assert.ok(r);assert.deepEqual(r,s);s=r;}
  if(s.phase==='dead')return {won:false,turns,hp:0,floor,seed,companion};
 }
 if(floor<10){assert.equal(s.phase,'stairs');assert.ok(act(s,'descend'));}else{assert.equal(s.relic,true);assert.ok(act(s,'return'));}
 }
 return {won:s.phase==='won',turns,hp:s.hp,uses,steps:s.steps,potions:s.potions,seed,companion};}
test('3000 ten-floor maps: reachable exits, two respite floors and only final guardian',()=>{
 for(let seed=0;seed<300;seed++)for(let floor=1;floor<=10;floor++){
  const map=generate(seed,floor);const s={x:1,y:1,map};for(const k of Object.keys(map.events))route(s,k.split(',').map(Number));
  assert.equal(map.events[key(...map.exit)],floor===10?'shrine':'stairs');assert.equal(map.events['1,1'],[4,8].includes(floor)?'rest':undefined);
  assert.equal(Object.values(map.events).filter(e=>e==='enemy').length,[4,8].includes(floor)?2:4);
 }
});
test('600 full ten-floor expeditions, all companions, every floor/battle save and single-use rest',()=>{
 for(const companion of Object.keys(COMPANIONS)){const results=[];for(let seed=0;seed<200;seed++)results.push(expedition(seed,companion));const wins=results.filter(r=>r.won);console.log('Ten-floor balance',companion,{wins:wins.length,total:results.length,meanTurns:results.reduce((n,r)=>n+r.turns,0)/200,meanFinishHp:wins.reduce((n,r)=>n+r.hp,0)/wins.length,failures:results.filter(r=>!r.won).slice(0,3)});assert.ok(wins.length>=190,`${companion}: below 95% map-guided policy survival`);}
});
test('legacy maps and completed save remain v1 with three-floor goal; new saves use ten',()=>{
 for(const phase of ['explore','stairs','battle','won','dead','returned']){
  const old=fresh(9,{legacy:true});old.floor=3;old.map=generate(9,3,3);old.phase=phase;if(phase==='battle')old.enemy={name:'星樹の守り手',hp:65,maxHp:65,turn:0,boss:true};if(phase==='won')old.relic=true;
  const r=restore(serialize(old));assert.deepEqual(r,old);assert.equal(maxFloor(r),3);assert.equal(floorName(r),'星眠りの庭');assert.equal(act(r,'descend'),false);
 }
 const n=fresh(9,{companion:'mei'});assert.equal(maxFloor(n),10);assert.equal(restore(serialize(n)).companion,'mei');
});
test('distinct support: guard mitigates, healer requires strikes, spell support requires hit and focus',()=>{
 const make=c=>{const s=fresh(3,{companion:c});s.hp=50;s.phase='battle';s.enemy={name:'敵',hp:100,maxHp:100,turn:0,boss:false};return s;};
 const ao=make('ao'),mei=make('mei'),ren=make('ren');act(ao,'attack');act(mei,'attack');act(ren,'attack');assert.equal(ao.hp,ren.hp+2);assert.equal(mei.hp,ren.hp);assert.equal(mei.supportCharge,1);
 act(mei,'guard');assert.equal(mei.supportCharge,1);act(mei,'attack');assert.match(mei.supportLog,/体力\+6/);assert.equal(mei.supportCharge,0);
 const a=make('ao'),r=make('ren');act(a,'skill');act(r,'skill');assert.equal(r.lastAttack.damage,a.lastAttack.damage+4);assert.equal(r.focus,3);r.focus=0;assert.equal(act(r,'skill'),false);
 const death=make('mei');death.hp=1;death.supportCharge=1;act(death,'attack');assert.equal(death.phase,'dead');assert.equal(death.hp,0);
});
test('rest abuse and history capacity across ten floors survive reload',()=>{
 const s=fresh(2);s.floor=4;s.map=generate(s.seed,4);s.hp=1;s.focus=0;s.light=1;assert.ok(act(s,'rest'));assert.deepEqual([s.hp,s.focus,s.light,s.potions],[100,6,100,5]);
 const r=restore(serialize(s));assert.equal(act(r,'rest'),false);r.map.events['1,1']='rest';assert.equal(act(r,'rest'),false);
 const records=[];for(let f=1;f<=10;f++)for(let x=1;x<=([4,8].includes(f)?2:3);x++)records.push({id:`${f}:${x},1`,floor:f,tier:'common',gold:18,potions:1,light:5,lightMax:10});
 s.floor=10;s.map=generate(s.seed,10);s.rewards=records;s.pendingReward=records.at(-1).id;const loaded=restore(serialize(s));assert.equal(loaded.rewards.length,28);assert.equal(loaded.pendingReward,s.pendingReward);
});
