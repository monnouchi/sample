import test from 'node:test';
import assert from 'node:assert/strict';
import {beginMotion,cameraAt,illumination} from '../src/view.js';
import {fresh as freshNew,serialize,restore} from '../src/game.js';
test('view interpolation reaches correct position and short turns across north',()=>{
 const m=beginMotion({x:1,y:1,dir:1},{x:2,y:1},'forward',100);
 assert.equal(cameraAt(m,100).x,1);assert.equal(cameraAt(m,190).x,1.5);assert.equal(cameraAt(m,280),null);
 const back=beginMotion({x:2,y:1,dir:1},{x:1,y:1},'back',0);assert.equal(cameraAt(back,90).x,1.5);
 const left=beginMotion({x:1,y:1,dir:0},{x:1,y:1},'left',0);assert.equal(cameraAt(left,90).angle,-Math.PI*.75);
 assert.equal(beginMotion({x:1,y:1,dir:1},{x:1,y:1},'forward',0),null);
});
test('light visibility decreases smoothly but has a nonzero floor',()=>{let prior=0;for(let light=0;light<=100;light++){const v=illumination(light);assert.ok(v.reach>=2&&v.reach>=prior);assert.ok(v.shade<=.48);prior=v.reach;}assert.equal(illumination(100).shade,0);});
test('old v1 saves remain compatible and legacy return wording is migrated',()=>{const s=fresh(1);s.relic=true;s.log=['帰還の糸を使おう。'];const restored=restore(serialize(s));assert.equal(restored.version,1);assert.equal(restored.relic,true);assert.equal(restored.log[0],'帰路の灯を使おう。');assert.deepEqual(restored.map,s.map);});

function fresh(seed){return freshNew(seed,{legacy:true});}
