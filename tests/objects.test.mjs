import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh as freshNew} from '../src/game.js';
import {projectObjects} from '../src/objects.js';
test('objects obey discovery, distance, wall occlusion, camera motion and consumption',()=>{
 const s=fresh(1);s.dir=1;s.map.grid=Array.from({length:11},(_,y)=>Array.from({length:11},(_,x)=>x===0||y===0||x===10||y===10?1:0));s.map.events={'2,1':'chest','4,1':'spring'};s.map.seen={'2,1':true,'4,1':true};
 const items=projectObjects(s);assert.equal(items.length,2);assert.equal(items[0].type,'spring');assert.ok(items[1].scale>items[0].scale);
 s.map.grid[1][3]=1;assert.deepEqual(projectObjects(s).map(o=>o.type),['chest']);
 delete s.map.seen['2,1'];assert.equal(projectObjects(s).length,0);s.map.seen['2,1']=true;
 const moving=projectObjects(s,{x:1.5,y:1,angle:0});assert.ok(moving[0].scale>items[1].scale);
 assert.equal(projectObjects(s,{x:1,y:1,angle:Math.PI}).length,0);
 delete s.map.events['2,1'];assert.equal(projectObjects(s).length,0);
});

function fresh(seed){return freshNew(seed,{legacy:true});}
