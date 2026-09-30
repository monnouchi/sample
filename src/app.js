import {fresh,act,restore,serialize,SAVE_KEY,FLOORS,DIRS,key} from './game.js';
import {drawScene,drawMap} from './render.js';
import {cameraAt,beginMotion} from './view.js';
const $=id=>document.getElementById(id),scene=$('scene'),dialog=$('dialog');
const titleState=fresh(188);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let motion=null,relicNoticeShown=false;
function drawView(time=performance.now()){const camera=cameraAt(motion,time);if(motion&&!camera)motion=null;scene.dataset.moving=String(Boolean(camera));drawScene(scene,state||titleState,reducedMotion.matches?0:time,camera);}
reducedMotion.addEventListener('change',()=>{motion=null;drawView();});
let state=null,saved=null,muted=true,audio=null,storageOK=true,modalType='',lastAction=0;
try{saved=restore(localStorage.getItem(SAVE_KEY));muted=localStorage.getItem('suito-sound')!=='on';}catch{storageOK=false;}
if(saved&&!['dead','won','returned'].includes(saved.phase))$('continue').hidden=false;
function sound(kind='step'){if(muted)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);osc.type=kind==='hit'?'triangle':'sine';osc.frequency.setValueAtTime(kind==='hit'?130:kind==='turn'?330:440,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(kind==='hit'?55:220,audio.currentTime+.13);gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.16);osc.start();osc.stop(audio.currentTime+.17);}catch{muted=true;updateSound();}}
function updateSound(){$('sound').textContent=muted?'音 OFF':'音 ON';$('sound').setAttribute('aria-pressed',String(!muted));$('sound').setAttribute('aria-label',muted?'効果音をオンにする':'効果音をオフにする');}
function save(){try{localStorage.setItem(SAVE_KEY,serialize(state));storageOK=true;}catch{storageOK=false;}$('save-status').textContent=storageOK?'自動保存済み':'保存不可 · この画面で継続';}
function open(content,type){if(dialog.open)dialog.close();modalType=type;$('dialog-content').innerHTML=content;dialog.showModal();}
function close(){dialog.close();modalType='';}
function start(resume=false){close();motion=null;relicNoticeShown=false;state=resume&&saved?saved:fresh();$('intro').hidden=true;$('play').hidden=false;$('start-note').hidden=true;$('map-button').hidden=false;save();render();}
function render(){
 if(!state){drawView();$('map-button').hidden=true;return;}
 const s=state;$('floor-label').textContent=`第${s.floor}層${s.floor===3?'・最深部':''} / ${FLOORS[s.floor-1]}`;$('compass').textContent=['N · 北','E · 東','S · 南','W · 西'][s.dir];$('coordinates').textContent=`${String(s.x).padStart(2,'0')} : ${String(s.y).padStart(2,'0')}`;
 $('scene-tag').textContent=s.relic?'THE SEED IS YOURS':s.phase==='battle'?'STAND YOUR GROUND':'FOLLOW THE LITTLE LIGHT';
 $('hp-label').innerHTML=`${s.hp} <small>/ 100</small>`;$('hp-meter').style.width=`${s.hp}%`;$('hp-meter').style.background=s.hp<30?'#df9474':'#adc99e';$('light-label').textContent=s.light;$('light-meter').style.width=`${s.light}%`;$('focus-label').textContent='◆'.repeat(s.focus)+'◇'.repeat(6-s.focus);$('potions').textContent=s.potions;$('message').textContent=s.log[0];$('treasure').textContent=`結晶 ${s.gold} · ${s.steps}歩`;$('objective').textContent=s.relic?'星の種を入手済み！ 帰路の灯で帰還しよう':s.floor===3?'最深部：ボス「星樹の守り手」を倒そう':'目標：第3層のボスを倒し、星の種を持ち帰る';
 $('mission').classList.toggle('complete',s.relic);$('mission-return').hidden=!s.relic;$('mission-return').disabled=s.phase==='battle';
 const battle=s.phase==='battle';$('explore-controls').hidden=battle;$('battle-controls').hidden=!battle;$('enemy-hud').hidden=!battle;$('potion').disabled=!s.potions||s.hp===100;
 $('enemy-hud').classList.toggle('boss',Boolean(s.enemy?.boss));
 if(battle){$('encounter-label').textContent=s.enemy.boss?'最深部のボス · 退避不可':'魔物との遭遇';$('enemy-name').textContent=s.enemy.name;$('enemy-hp').style.width=`${s.enemy.hp/s.enemy.maxHp*100}%`;$('intent').textContent=s.enemy.turn%3===2?'強撃の構え！「身を守る」が有効':'こちらの行動後に、魔物が反撃する';document.querySelector('[data-action="skill"]').disabled=s.focus<3;$('battle-potion').disabled=!s.potions||s.hp===100;$('battle-potion-label').textContent=`露の薬 ×${s.potions}`;$('flee').disabled=s.enemy.boss;}
 const total=s.map.grid.flat().filter(v=>!v).length;$('map-percent').textContent=`${Math.round(Object.keys(s.map.visited).length/total*100)}%`;
 drawView();drawMap($('map'),s);
 if(s.relic&&s.phase==='explore'&&!relicNoticeShown&&!dialog.open){relicNoticeShown=true;open('<span class="eyebrow">守り手を撃破</span><h2 id="dialog-title">星の種を手に入れた！</h2><p>最深部のボスを倒しました。あと一歩で探索完了です。<br><strong>「帰路の灯」で森の外へ持ち帰ろう。</strong></p><button class="primary" data-modal="return">帰路の灯で帰還・クリア</button><button data-modal="close">もう少し探索する</button>','relic');}
 if(s.phase==='stairs'&&!dialog.open)stairs();
 if(['won','dead','returned'].includes(s.phase)&&modalType!=='result')result();
}
function dispatch(action){
 if(!state||dialog.open)return;
 const now=performance.now();if(motion&&cameraAt(motion,now))return;
 motion=null;if(now-lastAction<110)return;lastAction=now;
 const before={x:state.x,y:state.y,dir:state.dir},hp=state.hp;
 const ok=act(state,action);
 if(ok){
  if(state.phase==='explore'&&!reducedMotion.matches)motion=beginMotion(before,state,action,now);
  sound(state.hp<hp?'hit':state.dir!==before.dir?'turn':'step');save();
  if(state.hp<hp){$('app').classList.remove('damage');void $('app').offsetWidth;$('app').classList.add('damage');}
 }
 render();
}
function stairs(){open(`<span class="eyebrow">AT THE CROSSROADS</span><h2 id="dialog-title">もっと、深い森へ。</h2><p>第${state.floor+1}層へ続く階段。進むとこの層には戻れません。<br>階段で体力18・灯り25・気力が回復します。</p><p>体力 ${state.hp} / 100　・　露の薬 ${state.potions}個<br>手元の結晶 ${state.gold}個を持ち帰ることもできます。</p><button class="primary" data-modal="descend">第${state.floor+1}層へ進む</button><button data-modal="return">ここで帰還する</button><button data-modal="stay">この層をもう少し探索</button>`,'stairs');}
function result(){const won=state.phase==='won',dead=state.phase==='dead';open(`<span class="eyebrow">${won?'EXPEDITION COMPLETE':dead?'THE LIGHT FADES':'SAFE RETURN'}</span><h2 id="dialog-title">${won?'星を、持ち帰った。':dead?'灯りは、森の中へ。':'生きて帰る。それも冒険。'}</h2><p>${won?'あなたの灯りに、小さな星が宿った。星眠りの森の探索は、ここに完了です。':dead?'今回の戦利品は森に残されました。次の探索では、薬と帰路の灯を早めに使ってみよう。':'最深部には届かなくても、刻んだ地図と結晶は確かな収穫です。次は、もう一歩先へ。'}</p><div class="result"><div>持ち帰った結晶<strong>${dead?0:state.gold}</strong></div><div>到達した深さ<strong>第${state.floor}層</strong></div><div>歩いた距離<strong>${state.steps}歩</strong></div><div>退けた魔物<strong>${state.kills}体</strong></div></div><button class="primary" data-modal="retry">新しい森を探索する</button><button data-modal="title">タイトルに戻る</button>`,'result');}
$('start').onclick=()=>{if(saved&&!['dead','won','returned'].includes(saved.phase)){open('<h2 id="dialog-title">新しい探索を始める？</h2><p>保存されている探索を上書きします。</p><button class="primary" data-modal="new">新しく始める</button><button data-modal="close">やめる</button>','new');}else start();};
$('continue').onclick=()=>start(true);
$('sound').onclick=()=>{muted=!muted;updateSound();try{localStorage.setItem('suito-sound',muted?'off':'on');}catch{}sound();};updateSound();
$('help').onclick=()=>open('<span class="eyebrow">FIELD GUIDE</span><h2 id="dialog-title">小さな探索の手引き</h2><p>左右で向きを変え、△で一歩進む。▽は向きを変えず一歩下がります。PCでは矢印キー / WASDも使えます。</p><p>歩くたび灯りを1消費。0になると一歩ごとに体力を4失います。向きを変えるだけなら消費なし。</p><p>魔物は行動後に反撃。強撃の構えには「身を守る」。気力が戻り、次の「翠の一閃」につながります。</p><p>宝箱には薬・結晶・灯り。階段では少し回復。最深部の守り手から「星の種」を手に入れ、帰路の灯で脱出すれば達成です。</p><p>戦闘中以外はいつでも帰還できます。探索はこのブラウザに自動保存されます。端末間の同期はありません。</p><button class="primary" data-modal="close">わかった</button>','help');
$('map-button').onclick=()=>{if(!state)return;open('<span class="eyebrow">EXPLORER’S JOURNAL</span><h2 id="dialog-title">歩いた道が、地図になる。</h2><canvas id="large-map" width="440" height="440" aria-label="現在の層の探索地図"></canvas><p class="legend">▲ 現在地・向き　■ 訪れた道<br><span style="color:#edda93">● 宝箱 / ■ 階段</span>　<span style="color:#83d9cd">● 泉</span>　<span style="color:#d79774">● 魔物　★ 最深部のボス</span><br>周囲の道が少しずつ記録されます。</p><button class="primary" data-modal="close">探索に戻る</button>','map');drawMap($('large-map'),state,true);};
$('return').onclick=()=>open('<span class="eyebrow">THE LIGHT HOME</span><h2 id="dialog-title">灯りを持って、帰ろう。</h2><p>帰路の灯を使うと、今回の探索を終えます。手元の結晶をすべて持ち帰れます。</p><button class="primary" data-modal="return">帰還する</button><button data-modal="close">まだ探索を続ける</button>','return');
$('mission-return').onclick=()=>$('return').click();
$('potion').onclick=()=>dispatch('potion');
for(const b of document.querySelectorAll('[data-action]'))b.onclick=()=>dispatch(b.dataset.action);
$('dialog-content').onclick=e=>{const a=e.target.closest('[data-modal]')?.dataset.modal;if(!a)return;const old=modalType;close();if(a==='retry'||a==='new'){start();return;}if(a==='title'){motion=null;saved=state;state=null;$('intro').hidden=false;$('play').hidden=true;$('continue').hidden=true;$('start-note').hidden=false;$('enemy-hud').hidden=true;$('floor-label').textContent='星眠りの森';render();return;}if(a==='close'){if(old==='help'&&state?.phase==='stairs')stairs();return;}act(state,a);save();render();};
dialog.addEventListener('cancel',e=>{if(['result','stairs'].includes(modalType)){e.preventDefault();return;}modalType='';});
window.addEventListener('keydown',e=>{if(dialog.open||!state||e.repeat)return;const a={ArrowUp:'forward',w:'forward',ArrowDown:'back',s:'back',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right','1':'attack','2':'skill','3':'guard'}[e.key];if(a){e.preventDefault();dispatch(a);}});
document.addEventListener('visibilitychange',()=>{motion=null;if(state)save();});
let frame=0;function animate(time){if(!document.hidden && time-frame>(motion?15:80)){drawView(time);frame=time;}requestAnimationFrame(animate);}render();requestAnimationFrame(animate);
