import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,DIRS,key,restore,serialize} from '../src/game.js';
function battle(hp,focus=6){const s=fresh(3);s.hp=hp;s.focus=focus;s.phase='battle';s.enemy={name:'苔角の獣',hp:25,maxHp:25,turn:0,boss:false};return s;}
function event(type,hp=100,focus=6,light=100){const s=fresh(3);s.hp=hp;s.focus=focus;s.light=light;const [dx,dy]=DIRS[s.dir];s.map.events[key(s.x+dx,s.y+dy)]=type;act(s,'forward');return s;}
test('battle potion logs capped gain separately from unchanged enemy damage',()=>{
 for(const [hp,gain] of [[93,7],[25,42],[99,1]]){const s=battle(hp),damage=6; // Seed 3: the first enemy roll deals 6 damage.
act(s,'potion');assert.equal(s.hp,Math.min(100,hp+42)-damage);assert.equal(s.potions,2);assert.match(s.log[0],new RegExp(`回復：体力が${gain}回復。 敵の反撃：体力に${damage}ダメージ`));assert.deepEqual(restore(serialize(s)),s);}
 const full=battle(100),before=serialize(full);assert.equal(act(full,'potion'),false);assert.equal(serialize(full),before);
});
test('exploration potion, spring and full resources report actual gains',()=>{
 const s=fresh(2);s.hp=93;act(s,'potion');assert.equal(s.hp,100);assert.match(s.log[0],/体力が7回復/);
 const spring=event('spring',86,5);assert.equal(spring.hp,100);assert.equal(spring.focus,6);assert.match(spring.log[0],/体力が14回復。気力が1回復/);
 const full=event('spring');assert.match(full.log[0],/体力は満タン（回復なし）/);assert.match(full.log[0],/気力は満タン（回復なし）/);
});
test('guard gains zero, one or two focus without changing damage reduction',()=>{
 for(const [focus,gain] of [[6,0],[5,1],[2,2]]){const s=battle(80,focus);s.enemy.turn=2;const damage=3; // Seed 3: heavy attack 12, guarded to 3.
act(s,'guard');assert.equal(s.hp,80-damage);assert.equal(s.focus,focus+gain);assert.ok(s.log[0].includes(gain?`気力が${gain}回復`:'気力は満タン（回復なし）'));}
});
test('chest reports gain after movement cost; stairs report capped gains including zero',()=>{
 const chest=event('chest');assert.equal(chest.light,100);assert.match(chest.log[0],/灯りが1回復/);
 const s=fresh(1);s.phase='stairs';s.hp=95;s.light=98;s.focus=6;act(s,'descend');assert.equal(s.hp,100);assert.equal(s.light,100);assert.match(s.log[0],/体力が5回復。灯りが2回復。気力は満タン（回復なし）/);
 s.phase='stairs';act(s,'descend');assert.match(s.log[0],/体力は満タン（回復なし）/);assert.match(s.log[0],/灯りは満タン（回復なし）/);
});
