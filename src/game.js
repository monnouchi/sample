import {COMPANIONS,maxFloor,speak} from './companions.js?v=20261001-ten';
import {LAYERS,layersFor} from './story.js?v=20261001-ten';
import {chestTier,rewardGold,restoreRewards,CHESTS} from './rewards.js?v=20261001-ten';
export const SIZE = 11;
export const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
export const FLOORS = LAYERS.map(l=>l.title);
export const floorName=s=>layersFor(s)[s.floor-1].title;
export const SAVE_KEY = 'suito-save-v1';
export const key = (x,y) => `${x},${y}`;
export function random(seed) { let n=seed>>>0; return ()=>{ n+=0x6D2B79F5; let t=n; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
function shuffle(a,r) { for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
export function generate(seed, floor=1, depth=10) {
 const r=random(seed+floor*7919), grid=Array.from({length:SIZE},()=>Array(SIZE).fill(1));
 const dig=(x,y)=>{grid[y][x]=0; for(const [dx,dy] of shuffle([...DIRS],r)){const nx=x+dx*2,ny=y+dy*2;if(nx>0&&ny>0&&nx<SIZE-1&&ny<SIZE-1&&grid[ny][nx]){grid[y+dy][x+dx]=0;dig(nx,ny);}}};
 dig(1,1);
 // A few cross passages keep routes short and offer meaningful map choices.
 for(let i=0;i<7;i++){const x=1+Math.floor(r()*9),y=1+Math.floor(r()*9);if(grid[y][x] && ((grid[y-1][x]===0&&grid[y+1][x]===0)||(grid[y][x-1]===0&&grid[y][x+1]===0)))grid[y][x]=0;}
 const distances={[key(1,1)]:0},queue=[[1,1]];
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of DIRS){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(grid[ny]?.[nx]===0&&distances[k]===undefined){distances[k]=distances[key(x,y)]+1;queue.push([nx,ny]);}}}
 const sorted=queue.sort((a,b)=>distances[key(...b)]-distances[key(...a)]),exit=sorted[0],events={};
 events[key(...exit)]=floor===depth?'shrine':'stairs';
 const cells=shuffle(sorted.filter(p=>distances[key(...p)]>3 && key(...p)!==key(...exit)),r);
 const respite=depth===10&&[4,8].includes(floor),enemies=respite?2:4,chests=respite?2:3;
 for(let i=0;i<cells.length;i++){if(i<enemies)events[key(...cells[i])]='enemy';else if(i<enemies+chests)events[key(...cells[i])]='chest';else if(i===enemies+chests)events[key(...cells[i])]='spring';}
 if(respite)events['1,1']='rest';
 return {grid,events,exit,seen:{},visited:{}};
}
export function reveal(s){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=s.x+dx,y=s.y+dy;if(x>=0&&y>=0&&x<SIZE&&y<SIZE)s.map.seen[key(x,y)]=true;}s.map.visited[key(s.x,s.y)]=true;}
export function fresh(seed=Math.floor(Math.random()*4294967296),{legacy=false,companion='ao'}={}){
 if(!legacy&&!Object.hasOwn(COMPANIONS,companion))throw new Error('同行者を選んでください');
 const s={version:legacy?1:2,...(legacy?{}:{companion,supportCharge:0,supportLog:'',rested:[]}),seed:seed>>>0,rng:seed>>>0,phase:'explore',floor:1,x:1,y:1,dir:1,hp:100,maxHp:100,focus:6,light:100,potions:3,gold:0,steps:0,kills:0,relic:false,lastMiss:false,lastAttack:null,rewards:[],pendingReward:null,map:generate(seed,1,legacy?3:10),enemy:null,log:['町の翠灯を灯し直すため、星の種が眠る地下庭へ。'],previous:[1,1]};
 if(s.map.grid[1][2])s.dir=2;if(!legacy)s.log=[speak(s,COMPANIONS[companion].intro)];reveal(s);return s;
}
function roll(s,n){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng%n;}
function recover(s,field,amount,max){const before=s[field];s[field]=Math.min(max,before+amount);return s[field]-before;}
function recovery(label,amount){return amount?`${label}が${amount}回復`:`${label}は満タン（回復なし）`;}
function log(s,t){s.log=[t,...s.log].slice(0,4);}
function hurt(s,n){s.hp=Math.max(0,s.hp-n);if(!s.hp){s.phase='dead';log(s,'灯りが遠のく。探索は、ここで終わった。');}}
function encounter(s,boss=false){s.lastAttack=null;const names=['苔角の獣','宵羽の蛾','根絡みの番人'];const hp=s.version===2?(boss?90:20+s.floor*2):(boss?65:19+s.floor*6);s.enemy={name:boss?'星樹の守り手':names[roll(s,3)],hp,maxHp:hp,turn:0,boss};s.phase='battle';if(s.version===2)s.supportLog='';log(s,boss?'最後の種を託す者か、星樹の守り手が試している。':`${s.enemy.name}が道をふさいだ。`);}
export function act(s,action){
 if(!s||['dead','won','returned'].includes(s.phase))return false;
 if(action==='return' && s.phase!=='battle'){s.phase=s.relic?'won':'returned';log(s,s.relic?'星の種を抱え、森の外へ帰還した。':'帰路の灯に導かれ、無事に森を出た。');return true;}
 if(s.phase==='battle')return battle(s,action);
 if(action==='rest'&&s.version===2&&s.phase==='explore'&&s.map.events[key(s.x,s.y)]==='rest'&&[4,8].includes(s.floor)&&!s.rested.includes(s.floor)){const hp=recover(s,'hp',100,100),light=recover(s,'light',100,100),focus=recover(s,'focus',6,6);s.potions+=2;s.rested.push(s.floor);s.map.events[key(s.x,s.y)]='rest-used';log(s,speak(s,`休めたね。${recovery('体力',hp)}。${recovery('灯り',light)}。${recovery('気力',focus)}。薬を2個補充した。`));return true;}
 if(action==='potion'){if(!s.potions||s.hp===s.maxHp)return false;s.potions--;const healed=recover(s,'hp',42,s.maxHp);log(s,`露の薬。${recovery('体力',healed)}。`);return true;}
 if(action==='descend'&&s.phase==='stairs'&&s.floor<maxFloor(s)){s.floor++;s.map=generate(s.seed,s.floor,maxFloor(s));s.x=s.y=1;s.dir=s.map.grid[1][2]?2:1;const light=recover(s,'light',25,100),focus=recover(s,'focus',6,6),hp=recover(s,'hp',18,100);s.phase='explore';s.previous=[1,1];reveal(s);log(s,`第${s.floor}層へ。${speak(s,layersFor(s)[s.floor-1].text)}${recovery('体力',hp)}。${recovery('灯り',light)}。${recovery('気力',focus)}。`);return true;}
 if(action==='stay'&&s.phase==='stairs'){s.phase='explore';return true;}
 if(s.phase==='stairs')return false;
 if(action==='left'||action==='right'){s.dir=(s.dir+(action==='left'?3:1))%4;return true;}
 if(action==='forward'||action==='back'){
 const d=DIRS[(s.dir+(action==='back'?2:0))%4],x=s.x+d[0],y=s.y+d[1];
 if(s.map.grid[y]?.[x]!==0){log(s,'深い茂みだ。この先には進めない。');return false;}
 s.previous=[s.x,s.y];s.x=x;s.y=y;s.steps++;s.light=Math.max(0,s.light-1);reveal(s);
 if(s.light===0){hurt(s,4);if(s.phase==='dead')return true;log(s,'灯りが尽きた。闇が体力を4奪う。帰還を急ごう。');}
 const k=key(x,y),e=s.map.events[k];
 if(e==='enemy')encounter(s);
 else if(e==='shrine')encounter(s,true);
 else if(e==='chest'){
 delete s.map.events[k];
 const id=`${s.floor}:${k}`;s.rewards??=[];
 if(s.rewards.some(item=>item.id===id)){log(s,'この宝箱は開封済みだ。');return true;}
 const tier=chestTier(s.seed,s.floor,x,y),gold=rewardGold(tier,roll(s,18));
 const {potions,lightMax}=CHESTS[tier];s.gold+=gold;s.potions+=potions;const light=recover(s,'light',lightMax,100);
 const reward={id,floor:s.floor,tier,gold,potions,light,lightMax};s.rewards.push(reward);s.pendingReward=id;
 log(s,`${CHESTS[tier].name}：結晶${gold}個と露の薬${potions}個。${recovery('灯り',light)}。`);
 }
 else if(e==='spring'){delete s.map.events[k];const hp=recover(s,'hp',30,100),focus=recover(s,'focus',6,6);log(s,`清らかな泉。${recovery('体力',hp)}。${recovery('気力',focus)}。`);}
 else if(e==='stairs'){s.phase='stairs';log(s,'根の階段を見つけた。この先は、さらに深い森。');}
 else if(e==='rest'||e==='rest-used')log(s,speak(s,e==='rest'?'休憩所に着いた。下の「休む」で補給できるよ。':'ここでの補給は使い切った。次へ進もう。'));
 else if(s.light>0)log(s,s.steps%4===0?speak(s,layersFor(s)[s.floor-1].detail):'地図に、新しい一歩を刻む。');
 return true;
 }
 return false;
}
function battle(s,a){
 const e=s.enemy;if(!['attack','skill','guard','potion','flee'].includes(a))return false;
 if(a==='skill'&&s.focus<3)return false;
 if(a==='potion'&&(!s.potions||s.hp===100))return false;
 if(a==='flee'){
 if(e.boss){log(s,'守り手の根が退路をふさいでいる。');return false;}
 hurt(s,4+s.floor);if(s.phase!=='dead'){[s.x,s.y]=s.previous;s.phase='explore';s.enemy=null;log(s,`身をひるがえして退いた。体力を${4+s.floor}失った。`);}return true;
 }
 let message='';if(s.version===2)s.supportLog='';
 if(a==='attack'||a==='skill'){
 const base=a==='skill'?23+roll(s,7):10+roll(s,5);
 // Independent deterministic strike stream: preserve enemy/base-damage RNG balance.
 s.strikeRng=(Math.imul(s.strikeRng??(s.seed^0x9e3779b9),1664525)+1013904223)>>>0;
 const chance=s.strikeRng/4294967296;
 const kind=chance<.05&&!s.lastMiss?'miss':chance>=.90?'critical':'normal';
 let dmg=kind==='miss'?0:kind==='critical'?Math.round(base*1.5):base;
 if(s.version===2&&s.companion==='ren'&&a==='skill'&&kind!=='miss'){dmg+=4;s.supportLog='レン：共鳴 +4ダメージ';}
 s.lastMiss=kind==='miss';s.lastAttack={kind,damage:dmg};
 if(a==='skill')s.focus-=3;e.hp=Math.max(0,e.hp-dmg);
 message=`${a==='skill'?'翠の一閃':'短剣の一撃'}。${kind==='miss'?'ミス！ ダメージなし':kind==='critical'?`クリティカル！ ${dmg}のダメージ`:`${dmg}のダメージ`}。`;
  if(s.version===2&&s.companion==='mei')s.supportCharge=(s.supportCharge||0)+1;
 }else s.lastAttack=null;
 if(a==='potion'){s.potions--;const hp=recover(s,'hp',42,100);message=`露の薬による回復：${recovery('体力',hp)}。`;}
 if(a==='guard'){const focus=recover(s,'focus',2,6);message=`身を守った。${recovery('気力',focus)}。`;}
 if(e.hp<=0){s.kills++;s.gold+=e.boss?100:8+s.floor*4;s.focus=Math.min(6,s.focus+1);delete s.map.events[key(s.x,s.y)];s.phase='explore';if(e.boss){s.relic=true;message+=' 星の種を手に入れた！ 帰路の灯を使おう。';}else message+=' 魔物を退けた。';s.enemy=null;supportHeal(s);log(s,message+(s.supportLog?` ${s.supportLog}。`:''));return true;}
 const heavy=e.turn%3===2;let damage=(s.version===2?(e.boss?10:4+Math.floor((s.floor-1)/3)):(e.boss?9:3+s.floor))+roll(s,4);if(heavy)damage*=2;if(a==='guard')damage=Math.max(1,Math.floor(damage/4));if(s.version===2&&s.companion==='ao'){const reduction=Math.min(2,damage-1);damage-=reduction;s.supportLog=reduction?`アオ：かばう 被害−${reduction}`:'アオ：守りを重ねた（追加軽減なし）';}
 e.turn++;hurt(s,damage);supportHeal(s);if(s.phase!=='dead')log(s,`${message} 敵の${heavy?'強撃':'反撃'}：体力に${damage}ダメージ。`);return true;
}
function supportHeal(s){if(s.version!==2||s.companion!=='mei'||s.supportCharge<2)return;s.supportCharge=0;if(s.phase==='dead')return;const gained=recover(s,'hp',6,100);s.supportLog=gained?`メイ：小手当 体力+${gained}`:'メイ：小手当 体力は満タン';}
export function serialize(s){return JSON.stringify(s);}
export function restore(raw){
 try{const s=JSON.parse(raw),int=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
 if(!s||![1,2].includes(s.version)||!int(s.seed,0,4294967295)||!int(s.rng,0,4294967295)||!int(s.floor,1,s.version===2?10:3)||!int(s.x,0,10)||!int(s.y,0,10)||!int(s.dir,0,3)||!int(s.hp,0,100)||s.maxHp!==100||!int(s.focus,0,6)||!int(s.light,0,100)||!int(s.potions,0,1000)||!int(s.gold,0,100000)||!int(s.steps,0,100000)||!int(s.kills,0,1000)||typeof s.relic!=='boolean')return null;
 if(!['explore','battle','stairs','dead','won','returned'].includes(s.phase))return null;
 if(!s.map||!Array.isArray(s.map.grid)||s.map.grid.length!==11||s.map.grid.some(r=>!Array.isArray(r)||r.length!==11||r.some(c=>c!==0&&c!==1))||s.map.grid[s.y][s.x]!==0)return null;
 for(const obj of [s.map.events,s.map.seen,s.map.visited])if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.keys(obj).some(k=>!/^([0-9]|10),([0-9]|10)$/.test(k)))return null;
 if(Object.values(s.map.events).some(e=>!['enemy','chest','spring','stairs','shrine','rest','rest-used'].includes(e)))return null;
 if(!Array.isArray(s.previous)||s.previous.length!==2||!s.previous.every(v=>int(v,0,10))||s.map.grid[s.previous[1]][s.previous[0]]!==0)return null;
 if(!Array.isArray(s.log)||s.log.length>4||s.log.some(t=>typeof t!=='string'||t.length>200))return null;
 if(s.phase==='battle'&&(!s.enemy||typeof s.enemy.name!=='string'||s.enemy.name.length>40||!int(s.enemy.hp,1,100)||!int(s.enemy.maxHp,1,100)||s.enemy.hp>s.enemy.maxHp||!int(s.enemy.turn,0,100000)||typeof s.enemy.boss!=='boolean'))return null;
 if(s.version===2){if(!Object.hasOwn(COMPANIONS,s.companion))return null;s.rested=Array.isArray(s.rested)?[...new Set(s.rested.filter(f=>[4,8].includes(f)&&f<=s.floor))]:[];s.supportCharge=s.supportCharge===1?1:0;s.supportLog=typeof s.supportLog==='string'&&s.supportLog.length<70?s.supportLog:'';if(s.rested.includes(s.floor)&&s.map.events['1,1']==='rest')s.map.events['1,1']='rest-used';}
 if(s.strikeRng!==undefined&&!int(s.strikeRng,0,4294967295))return null;
 s.lastMiss=s.lastMiss===true;s.lastAttack=s.lastAttack&&['normal','miss','critical'].includes(s.lastAttack.kind)&&int(s.lastAttack.damage,0,50)?s.lastAttack:null;
 s.rewards=restoreRewards(s.rewards,maxFloor(s));s.pendingReward=typeof s.pendingReward==='string'&&s.rewards.some(r=>r.id===s.pendingReward)?s.pendingReward:null;
 s.log=s.log.map(t=>t.replaceAll('帰還の糸','帰路の灯'));
 return s;
 }catch{return null;}
}
