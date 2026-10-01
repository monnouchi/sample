import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh as freshNew,act,restore,serialize} from '../src/game.js';
import {actionCues,score} from '../src/audio.js';
function battle(seed,boss=false){const s=fresh(seed);s.phase='battle';s.enemy={name:boss?'星樹の守り手':'苔角の獣',hp:boss?65:25,maxHp:boss?65:25,turn:0,boss};return s;}
test('strike rates, damage and no consecutive misses across 20000 seeded attacks',()=>{
 const counts={normal:0,miss:0,critical:0};let total=0,base=0;
 for(let seed=0;seed<20000;seed++){
  const s=battle(seed),old=restore(serialize(s));act(s,'attack');counts[s.lastAttack.kind]++;total+=s.lastAttack.damage;
  const r=(Math.imul(old.rng,1664525)+1013904223)>>>0;base+=10+r%5;
  const repeat=restore(serialize(old));act(repeat,'attack');assert.deepEqual(repeat,s);
  if(s.lastMiss){const saved=restore(serialize(s));saved.phase='battle';saved.enemy={name:'獣',hp:65,maxHp:65,turn:0,boss:true};act(saved,'attack');assert.notEqual(saved.lastAttack.kind,'miss');}
 }
 for(const [kind,rate] of [['miss',.05],['critical',.10]])assert.ok(Math.abs(counts[kind]/20000-rate)<.005);
 assert.ok(Math.abs(total/base-1)<.015);console.log('Strike sample:',counts,'damage ratio:',total/base);
});
test('miss skill spends focus, enemy responds, death and boss critical victory remain consistent',()=>{
 let miss,crit;for(let seed=0;!miss||!crit;seed++){const s=battle(seed,true);s.hp=1;act(s,'skill');if(s.lastAttack.kind==='miss')miss=s;if(s.lastAttack.kind==='critical')crit=seed;}
 assert.equal(miss.focus,3);assert.equal(miss.phase,'dead');assert.equal(miss.enemy.turn,1);assert.equal(miss.enemy.hp,65);
 const win=battle(crit,true);win.enemy.hp=1;act(win,'skill');assert.equal(win.phase,'explore');assert.equal(win.relic,true);assert.equal(win.hp,100);act(win,'return');assert.equal(win.phase,'won');
 const legacy=battle(5);delete legacy.lastAttack;delete legacy.lastMiss;const restored=restore(serialize(legacy));assert.ok(restored);act(legacy,'attack');act(restored,'attack');assert.deepEqual(restored,legacy);
});
test('foley follows accepted events including attacks with net healing and kill/no counterattack',()=>{
 const before={phase:'battle',turn:0,kills:0,relic:false,hp:90};
 assert.deepEqual(actionCues(before,{enemy:{turn:1},kills:0,hp:94},'potion'),['potion','hurt']);
 assert.deepEqual(actionCues(before,{enemy:{turn:1},kills:0,lastAttack:{kind:'miss'}},'skill'),['spell-miss','hurt']);
 assert.deepEqual(actionCues(before,{enemy:null,kills:1,relic:true,lastAttack:{kind:'critical'}},'attack'),['critical','relic']);
 for(const kind of ['step','left','right','attack','skill','miss','critical','hurt','heavy','guard','potion','spring','chest','reward','victory','relic','encounter','boss','flee','death','return','enter']){
  const notes=score(kind,2,3);assert.ok(notes.length);assert.ok(notes.every(n=>n[0]>=0&&n[1]>0&&n[1]<=.5&&n[4]<=.18&&Math.abs(n[6])<=.35));
 }
 assert.notDeepEqual(score('step',1,1),score('step',2,1));
});

function fresh(seed){return freshNew(seed,{legacy:true});}
