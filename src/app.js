import {prepareDOM} from './dom.js?v=20261001-cachefix';
import {GEAR,findDescription} from './loot.js?v=20261001-cachefix';
import {portrait} from './portraits.js?v=20261001-cachefix';
import {COMPANIONS,companionOf,maxFloor,historyLimit,themeFloor,speak} from './companions.js?v=20261001-cachefix';
import {ORIGIN,layersFor,GUARDIAN,SEED,ENDING} from './story.js?v=20261001-cachefix';
import {ForestAudio,actionCues} from './audio.js?v=20261001-cachefix';
import {returnDescription,lightBand,lightAnnouncement} from './messages.js?v=20261001-cachefix';
import {CHESTS} from './rewards.js?v=20261001-cachefix';
import {protectControls} from './controls.js?v=20261001-cachefix';
import {fresh,act,restore,serialize,SAVE_KEY,floorName,DIRS,key} from './game.js?v=20261001-cachefix';
import {drawScene,drawMap} from './render.js?v=20261001-cachefix';
import {cameraAt,beginMotion} from './view.js?v=20261001-cachefix';
prepareDOM();
const $=id=>document.getElementById(id),scene=$('scene'),dialog=$('dialog');

const escapeText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titleState=fresh(188);
let effectTimer,finishTimer=null,impactState=null;
function finishStrike(){clearTimeout(finishTimer);finishTimer=null;impactState=null;clearEffect();render();}
function clearEffect(){clearTimeout(effectTimer);$('spell-effect').className='';scene.className='';}
function strikeEffect(kind,spell){clearEffect();if(state.phase!=='battle'&&!impactState)return;void scene.offsetWidth;if(spell){$('spell-effect').className=`active ${kind}`;effectTimer=setTimeout(clearEffect,360);}else scene.className=`strike-${kind}`;}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let motion=null,relicNoticeShown=false,rewardTimers=[],lastLightBand=null;
function stopRewardTimers(){rewardTimers.forEach(clearTimeout);rewardTimers=[];}
function revealReward(){stopRewardTimers();if(!document.querySelector('.reward-display')?.classList.contains('revealed')){audio.stop();sound('reward');}document.querySelector('.reward-display')?.classList.add('revealed');const skip=$('reward-skip');if(skip)skip.hidden=true;}

function drawView(time=performance.now()){const camera=cameraAt(motion,time);if(motion&&!camera)motion=null;scene.dataset.moving=String(Boolean(camera));drawScene(scene,impactState||state||titleState,reducedMotion.matches?0:time,camera);}
reducedMotion.addEventListener('change',()=>{motion=null;if(reducedMotion.matches&&finishTimer)finishStrike();if(reducedMotion.matches&&modalType==='reward')revealReward();drawView();});
let state=null,saved=null,muted=true,storageOK=true,modalType='',lastAction=0;
const input=protectControls(document,{getMode:()=>`${state?.phase||'title'}:${modalType}`});
try{saved=restore(localStorage.getItem(SAVE_KEY));muted=localStorage.getItem('suito-sound')!=='on';}catch{storageOK=false;}
if(saved){if(['dead','won','returned'].includes(saved.phase))$('last-result').hidden=false;else $('continue').hidden=false;}
const audio=new ForestAudio({onError:()=>{muted=true;updateSound();}});audio.setMuted(muted);
function sound(kind){void audio.play(kind,{floor:themeFloor(state),step:state?.steps||0});}
function updateSound(){$('sound').textContent=muted?'音 OFF':'音 ON';$('sound').setAttribute('aria-pressed',String(!muted));$('sound').setAttribute('aria-label',muted?'効果音をオンにする':'効果音をオフにする');}
function save(){try{localStorage.setItem(SAVE_KEY,serialize(state));storageOK=true;}catch{storageOK=false;}$('save-status').textContent=storageOK?'自動保存済み':'保存不可 · この画面で継続';}
let companionScroll=null,companionOpener=null;
function lockCompanion(){companionScroll=window.scrollY;companionOpener=document.activeElement;document.documentElement.style.setProperty('--modal-scroll-top',`-${companionScroll}px`);document.documentElement.classList.add('companion-open');}
function unlockCompanion(){if(companionScroll===null)return;const y=companionScroll;companionScroll=null;document.documentElement.classList.remove('companion-open');document.documentElement.style.removeProperty('--modal-scroll-top');window.scrollTo({top:y,behavior:'instant'});if(companionOpener?.isConnected)companionOpener.focus({preventScroll:true});companionOpener=null;}
dialog.addEventListener('close',()=>{if(!dialog.open)unlockCompanion();});
function open(content,type){if(finishTimer)finishStrike();clearEffect();if(!['reward','relic','result'].includes(type))audio.stop();stopRewardTimers();if(dialog.open)dialog.close();unlockCompanion();modalType=type;dialog.dataset.kind=type;$('dialog-content').innerHTML=content;if(['help','stairs'].includes(type)&&companionOf(state)){for(const p of $('dialog-content').querySelectorAll('p')){p.prepend(`${companionOf(state).name}「`);p.append('」');}}if(['companion','history','kit'].includes(type))lockCompanion();dialog.showModal();if(type==='companion')$('dialog-title').focus({preventScroll:true});}
function close(){if(modalType==='reward')audio.stop();stopRewardTimers();dialog.close();unlockCompanion();modalType='';}
function chooseCompanion(){open(`<header class="companion-header"><span class="eyebrow">十層の地下庭へ</span><h2 id="dialog-title" tabindex="-1">誰と、灯を守る？</h2></header><div class="companion-list" tabindex="0" role="region" aria-label="同行者の説明と選択"><p>ひとりを選ぶと探索が始まります。同行者は帰還まで変えられません。</p>${Object.entries(COMPANIONS).map(([id,c])=>`<button class="companion-choice" data-modal="companion-${id}">${portrait(id)}<strong>${c.mark} ${c.name} · ${c.role}</strong><small>${c.description}</small><span>「${c.intro}」</span></button>`).join('')}</div><footer class="companion-footer"><button data-modal="close">まだ出発しない</button></footer>`,'companion');}

function start(resume=false,companion=null){if(!resume&&!companion){chooseCompanion();return;}clearEffect();audio.stop();close();motion=null;relicNoticeShown=false;lastLightBand=null;$('light-announcement').textContent='';state=resume&&saved?saved:fresh(undefined,{companion});$('intro').hidden=true;$('play').hidden=false;$('start-note').hidden=true;$('map-button').hidden=false;save();render();if(!state.pendingReward)sound('enter');}

// Move existing nodes, preserving map/history/log state and handlers.
const extraNodes=['mission','light-warning','message','event-history','reward-history','story','kit','camp','treasure','map-button'].map(id=>{
 const element=$(id);if(!element)return null;
 const node=['message','treasure'].includes(id)?element.parentElement:element;if(!node)return null;
 const anchor=document.createComment('exploration position');node.before(anchor);return {node,anchor};
}).filter(Boolean);
let inBattle=false,explorationScroll=0;
function battleLayout(battle){
 if(battle===inBattle)return;input.transition();clearEffect();
 inBattle=battle;$('app').classList.toggle('in-battle',battle);$('battle-details').hidden=!battle;$('battle-details').open=false;
 if(battle){explorationScroll=window.scrollY;for(const {node} of extraNodes)$('battle-extra').append(node);window.scrollTo({top:0,behavior:'instant'});}
 else{for(const {node,anchor} of extraNodes)anchor.after(node);window.scrollTo({top:explorationScroll,behavior:'instant'});}
 requestAnimationFrame(()=>{if(dialog.open)return;const target=document.querySelector(battle?'[data-action="attack"]':'[data-action="forward"]');target?.focus({preventScroll:true});});
}

function battleFeedback(s){
 const hit=s.log[0].match(/敵の(?:強撃|反撃)：体力に(\d+)ダメージ/);
 if(s.lastAttack)return `${s.lastAttack.kind==='miss'?'ミス！':s.lastAttack.kind==='critical'?'クリティカル！':'命中'} ${s.lastAttack.damage}ダメージ${hit?` ／ 被害${hit[1]}`:''}`;
 return s.log[0].replace('露の薬による回復：','薬：').replace('身を守った。','防御：').replace(/ 敵の(?:強撃|反撃)：体力に(\d+)ダメージ。/,' ／ 被害$1').replace('（回復なし）','');
}
function render(){
 if(!state){drawView();$('map-button').hidden=true;return;}
 const s=state;$('floor-label').textContent=`第${s.floor}層${s.floor===maxFloor(s)?'・最深部':''} / ${floorName(s)}`;$('compass').textContent=['N · 北','E · 東','S · 南','W · 西'][s.dir];$('coordinates').textContent=`${String(s.x).padStart(2,'0')} : ${String(s.y).padStart(2,'0')}`;
 $('scene-tag').textContent=s.relic?'THE SEED IS YOURS':s.phase==='battle'?'STAND YOUR GROUND':'FOLLOW THE LITTLE LIGHT';
 $('hp-label').innerHTML=`${s.hp} <small>/ 100</small>`;$('hp-meter').style.width=`${s.hp}%`;$('hp-meter').style.background=s.hp<30?'#df9474':'#adc99e';$('light-label').textContent=s.light;$('light-meter').style.width=`${s.light}%`;$('focus-label').textContent='◆'.repeat(s.focus)+'◇'.repeat(6-s.focus);$('potions').textContent=s.potions;if($('message').textContent!==s.log[0])$('message').textContent=s.log[0];$('treasure').textContent=`結晶 ${s.gold} · ${s.steps}歩`;$('objective').textContent=s.relic?'星の種は入手済み。帰路の灯で町へ。':s.floor===maxFloor(s)?'最深部：ボス「星樹の守り手」を倒そう':`町の翠灯を灯し直そう：第${maxFloor(s)}層で星の種を受け継ぐ${s.version===1?'（旧3層の冒険）':''}`;
 $('mission').hidden=!s.relic;$('mission').classList.toggle('complete',s.relic);$('mission-return').hidden=!s.relic;$('mission-return').disabled=s.phase==='battle';
 updateLightWarning(s);$('reward-history').textContent=`宝箱の履歴 ${s.rewards?.length||0}/${historyLimit(s)}`;
 const battle=s.phase==='battle';battleLayout(battle);$('event-notice').hidden=battle||!s.eventNotice;$('event-notice').textContent=s.eventNotice||'';$('battle-feedback').textContent=s.lastRescue?'護符発動！ 致命傷をしのぎ、体力25で生存':battleFeedback(s)+(s.supportLog?` ／ ${s.supportLog}`:'');
 const companion=companionOf(s);$('companion-talk').hidden=!companion;const talk=s.phase==='battle'?(s.enemy.turn%3===2?'強撃が来る。身を守って、次の隙を待とう。':'次は通常攻撃。体力と気力を確かめよう。'):s.dialogue||companion?.intro||'';if(companion&&($('companion-talk').dataset.line!==talk||$('companion-talk').dataset.companion!==s.companion)){$('companion-talk').dataset.companion=s.companion;$('companion-talk').dataset.line=talk;$('companion-talk').innerHTML=`${portrait(s.companion,true)}<span><strong>${companion.name}</strong><span class="talk-line">${escapeText(talk)}</span></span><span aria-hidden="true">⋯</span>`;}$('companion-talk').setAttribute('aria-label',`${companion?.name||'仲間'}の会話を詳しく読む`);
 $('kit-status').hidden=!s.wardFound&&!s.gearOwned.length;$('kit-status').textContent=`装備：${GEAR[s.equipment]?.short||'なし'} ／ 護符 ${s.ward?'1回':'なし'}${s.lastRescue?' · 護符発動！体力25で生存':''}`;
 const campHere=['rest','rest-used'].includes(s.map.events[key(s.x,s.y)]);$('camp').hidden=!campHere||s.phase!=='explore';$('camp-title').textContent=`第${s.floor}層 · ${floorName(s)}`;$('rest').disabled=s.rested?.includes(s.floor)||s.map.events[key(s.x,s.y)]==='rest-used';$('rest').textContent=$('rest').disabled?'補給済み · この場所では一度だけ':'休む · 全回復と薬2個（一度だけ）';$('explore-controls').hidden=battle;$('battle-controls').hidden=!battle;$('enemy-hud').hidden=!battle;$('potion').disabled=!s.potions||s.hp===100;
 $('enemy-hud').classList.toggle('boss',Boolean(s.enemy?.boss));
 if(battle){$('encounter-label').textContent=s.enemy.boss?'最深部のボス · 退避不可':'魔物との遭遇';$('enemy-name').textContent=s.enemy.name;$('enemy-hp').style.width=`${s.enemy.hp/s.enemy.maxHp*100}%`;$('battle-enemy').textContent=(s.enemy.boss?'最深部のボス：':'')+s.enemy.name;$('intent').textContent=s.enemy.turn%3===2?'次は強撃。身を守ると被害を軽減':'次は通常攻撃。こちらの行動後に反撃';$('battle-enemy').parentElement.classList.toggle('heavy',s.enemy.turn%3===2);document.querySelector('[data-action="skill"]').disabled=s.focus<3;$('battle-potion').disabled=!s.potions||s.hp===100;$('battle-potion-count').textContent=`×${s.potions}`;$('battle-potion').setAttribute('aria-label',`露の薬、残り${s.potions}個、体力最大42回復`);$('flee').disabled=s.enemy.boss;}
 const total=s.map.grid.flat().filter(v=>!v).length;$('map-percent').textContent=`${Math.round(Object.keys(s.map.visited).length/total*100)}%`;
 drawView();drawMap($('map'),s);
 if(s.pendingReward&&s.phase==='explore'&&!dialog.open)showReward(s.rewards.find(r=>r.id===s.pendingReward));
 if(s.relic&&s.phase==='explore'&&!relicNoticeShown&&!dialog.open){relicNoticeShown=true;open('<span class="eyebrow">守り手を撃破</span><h2 id="dialog-title">星の種を手に入れた！</h2><p>最深部のボスを倒しました。守り手の根の手がほどけ、種を託しました。町の翠灯に、新しい光を。<br><strong>「帰路の灯」で森の外へ持ち帰ろう。</strong></p><button class="primary" data-modal="return">帰路の灯で帰還・クリア</button><button data-modal="close">もう少し探索する</button>','relic');}
 if(s.phase==='stairs'&&!dialog.open)stairs();
 if(['won','dead','returned'].includes(s.phase)&&modalType!=='result')result();
}
function updateLightWarning(s){
 const band=lightBand(s.light);if(band!==lastLightBand){const message=lightAnnouncement(band,lastLightBand);if(message)$('light-announcement').textContent=message;lastLightBand=band;}
 const warning=$('light-warning');warning.hidden=s.light>10;
 if(warning.hidden)return;
 const detail=s.light===0?'灯りが尽きた。移動するたび体力を4失います。':s.light===1?'灯りは残り1。次の一歩で0になり、体力を4失います。':`灯りは残り${s.light}。0になる一歩から、移動ごとに体力を4失います。`;
 warning.textContent=`⚠ ${companionOf(s)?companionOf(s).name+'：':''}${detail} 旋回は消費なし。${s.phase==='battle'?'戦闘中は灯りを消費しません。':'帰路の灯で帰還することもできます。'}`;
}
function rewardItems(r){const find=findDescription(r.find);return `${find?`<section class="find-card"><strong>${find.icon} ${find.name}</strong><p>${find.effect}</p></section>`:''}<ul class="reward-items"><li><span aria-hidden="true">◆</span><div><strong>結晶 ×${r.gold}</strong><small>持ち帰ると今回の探索スコアになります。お店での用途はありません。</small></div></li><li><span aria-hidden="true">⚗</span><div><strong>露の薬 ×${r.potions}</strong><small>所持数に追加。使うと体力を最大42回復。</small></div></li><li><span aria-hidden="true">☼</span><div><strong>灯り +${r.light}</strong><small>${r.light?`その場で実際に${r.light}回復しました。`:'すでに満タンのため回復なし。'}（取得時の上限${r.lightMax??10}）</small></div></li></ul>`;}
function showReward(r){
 if(!r)return;
 const chest=CHESTS[r.tier];
 open(`<div class="reward-display ${r.tier}"><span class="eyebrow">第${r.floor}層 · 宝箱の報酬</span><div class="chest-emblem" aria-hidden="true">▣ ${chest.mark}</div><h2 id="dialog-title">${chest.name}</h2><p class="reward-saved">${storageOK?'報酬は取得・保存済みです。':'報酬は取得済みです。このブラウザでは保存できません。'}</p>${rewardItems(r)}</div><button id="reward-skip" data-modal="reward-skip">演出をスキップ</button>${r.find?.kind==='gear'&&state.equipment!==r.find.id?`<button class="primary" data-modal="equip:${r.find.id}">${GEAR[r.find.id].name}を装備する</button>`:''}<button class="primary" data-modal="reward-close">閉じて探索へ</button>`,'reward');
 if(reducedMotion.matches)revealReward();
 else{rewardTimers.push(setTimeout(()=>{if(modalType==='reward'){sound('chest');document.querySelector('.reward-display')?.classList.add('opening');}},220));rewardTimers.push(setTimeout(revealReward,1400));}
}
function acknowledgeReward(){if(state?.pendingReward){state.pendingReward=null;save();}}
$('event-history').onclick=()=>open(`<h2 id="dialog-title">冒険の履歴</h2><p>直近の出来事（最大4件）。会話は顔付き欄から読み返せます。</p><ol>${state.log.map(t=>`<li>${escapeText(t)}</li>`).join('')}</ol><button data-modal="close">戻る</button>`,'history');
$('kit').onclick=()=>open(`<header class="kit-header"><h2 id="dialog-title">装備と護符</h2><p>装備は1個。選ぶと反映して探索へ戻ります。</p></header><div class="kit-list" tabindex="0" role="region" aria-label="装備の一覧">${Object.entries(GEAR).map(([id,g])=>`<div class="kit-row"><div><strong>${g.icon} ${g.name}</strong><small>${g.short}${state.equipment===id?' · 装備中':''}</small></div><button data-modal="equip:${id}" ${state.phase!=='explore'||!state.gearOwned.includes(id)||state.equipment===id?'disabled':''} aria-label="${g.name}を装備">${state.equipment===id?'装備中':state.gearOwned.includes(id)?'装備する':'未取得'}</button></div>`).join('')}<p class="kit-ward"><strong>✧ 帰り芽の護符：${state.ward?'残り1回':state.wardFound?'使用済み':'未取得'}</strong><small>致命傷を一度だけ体力25で生存</small></p><details class="kit-rules"><summary>詳しい条件</summary>${Object.values(GEAR).map(g=>`<p><strong>${g.name}</strong>：${g.effect}</p>`).join('')}<p>戦闘中は変更できません。所持品はこの冒険だけ。護符は自動発動し、休憩では補充されません。メイの小手当と同時なら護符を優先します。</p></details></div><footer class="kit-footer"><button data-modal="close">閉じる</button></footer>`,'kit');
$('companion-talk').onclick=()=>{const c=companionOf(state);open(`<h2 id="dialog-title">${c.name}の話</h2><div class="talk-portrait">${portrait(state.companion)}</div><p>${escapeText($('companion-talk').dataset.line)}</p><p>${c.role}：${c.description}</p><button data-modal="story">目的と物語を確かめる</button><button data-modal="close">戻る</button>`,'talk');};
$('story').onclick=()=>{const depth=state?.floor||1;open(`<span class="eyebrow">灯と地下庭の記憶</span><h2 id="dialog-title">翠灯を、もう一度。</h2><p>${speak(state,state?.relic?'星の種は入手済み。帰路の灯で町へ持ち帰ろう。':`目標は第${maxFloor(state)}層の星の種。いまは第${depth}層だ。` )}</p><p>${speak(state,ORIGIN)}</p>${layersFor(state).slice(0,depth).map((layer,i)=>`<h3>第${i+1}層 · ${layer.title}</h3><p>${speak(state,layer.text)}</p>`).join('')}${depth===maxFloor(state)?`<p>${speak(state,GUARDIAN)}</p>`:''}${state?.relic?`<p>${speak(state,SEED)}</p>`:''}<button class="primary" data-modal="close">探索に戻る</button>`,'story');};
$('reward-history').onclick=()=>{const records=state?.rewards||[];open(`<span class="eyebrow">今回の冒険</span><h2 id="dialog-title">宝箱の履歴</h2>${records.length?records.map(r=>`<section class="reward-record"><h3>第${r.floor}層 · ${CHESTS[r.tier].mark} ${CHESTS[r.tier].name}</h3>${rewardItems(r)}</section>`).join(''):'<p>記録はまだありません。旧セーブで開けた箱は記録されていません。</p>'}<button class="primary" data-modal="close">探索に戻る</button>`,'history');};
function dispatch(action){
 if(!state||dialog.open||finishTimer)return;
 const now=performance.now();if(motion&&cameraAt(motion,now))return;
 motion=null;if(now-lastAction<110)return;lastAction=now;
 const d=DIRS[(state.dir+(action==='back'?2:0))%4];
 const before={x:state.x,y:state.y,dir:state.dir,hp:state.hp,steps:state.steps,phase:state.phase,turn:state.enemy?.turn,kills:state.kills,relic:state.relic,event:state.map.events[key(state.x+d[0],state.y+d[1])]},hp=state.hp;
 const combatView=state.phase==='battle'?{...state,enemy:{...state.enemy}}:null;
 const ok=act(state,action);
 if(ok){
  if(state.phase==='explore'&&!reducedMotion.matches)motion=beginMotion(before,state,action,now);
  if(before.phase==='battle')audio.stop();sound(action==='rest'?'spring':actionCues(before,state,action));save();
  if(combatView&&state.kills>before.kills&&!reducedMotion.matches){impactState=combatView;$('enemy-hp').style.width='0%';$('battle-feedback').textContent=battleFeedback(state)+(state.supportLog?` ／ ${state.supportLog}`:'');strikeEffect(state.lastAttack.kind,action==='skill');drawView();finishTimer=setTimeout(finishStrike,340);return;}
  if(before.phase==='battle'&&['attack','skill'].includes(action)){strikeEffect(state.lastAttack?.kind||'normal',action==='skill');}
  if(state.hp<hp){$('app').classList.remove('damage');void $('app').offsetWidth;$('app').classList.add('damage');}
 }
 render();
}
function stairs(){open(`<span class="eyebrow">AT THE CROSSROADS</span><h2 id="dialog-title">もっと、深い森へ。</h2><p>第${state.floor+1}層へ続く階段。進むとこの層には戻れません。<br>階段で体力は最大18、灯りは最大25、気力は上限まで回復します。</p><p>体力 ${state.hp} / 100　・　露の薬 ${state.potions}個<br>手元の結晶 ${state.gold}個を持ち帰ることもできます。</p><button class="primary" data-modal="descend">第${state.floor+1}層へ進む</button><button data-modal="return">ここで帰還する</button><button data-modal="stay">この層をもう少し探索</button>`,'stairs');}
function result(){const won=state.phase==='won',dead=state.phase==='dead';open(`<span class="eyebrow">${won?'EXPEDITION COMPLETE':dead?'THE LIGHT FADES':'SAFE RETURN'}</span><h2 id="dialog-title">${won?'星を、持ち帰った。':dead?'灯りは、森の中へ。':'生きて帰る。それも冒険。'}</h2><p>${won?ENDING:dead?'帰路の灯に残った火が、あなたを町の入口へ運びました。戦利品は地下庭に残ったまま。翠灯が消える前に、もう一度。':returnDescription(state.floor,maxFloor(state))}</p><div class="result"><div>持ち帰った結晶<strong>${dead?0:state.gold}</strong></div><div>到達した深さ<strong>第${state.floor}層</strong></div><div>歩いた距離<strong>${state.steps}歩</strong></div><div>退けた魔物<strong>${state.kills}体</strong></div></div><button class="primary" data-modal="retry">新しい森を探索する</button><button data-modal="title">タイトルに戻る</button>`,'result');}
$('start').onclick=()=>{if(saved&&!['dead','won','returned'].includes(saved.phase)){open('<h2 id="dialog-title">新しい探索を始める？</h2><p>保存されている探索を上書きします。</p><button class="primary" data-modal="new">新しく始める</button><button data-modal="close">やめる</button>','new');}else start();};
$('continue').onclick=()=>start(true);$('last-result').onclick=()=>start(true);
$('sound').onclick=()=>{muted=!muted;audio.setMuted(muted);if(muted){if(finishTimer)finishStrike();clearEffect();}updateSound();try{localStorage.setItem('suito-sound',muted?'off':'on');}catch{}if(!muted)sound('enter');};updateSound();
$('help').onclick=()=>open('<span class="eyebrow">FIELD GUIDE</span><h2 id="dialog-title">小さな探索の手引き</h2><p>左右で向きを変え、△で一歩進む。▽は向きを変えず一歩下がります。PCでは矢印キー / WASDも使えます。</p><p>歩くたび灯りを1消費。0になると一歩ごとに体力を4失います。向きを変えるだけなら消費なし。</p><p>魔物は行動後に反撃。強撃の構えには「身を守る」。気力が戻り、次の「翠の一閃」につながります。</p><p>短剣も技も、ときどきミスやクリティカルになります。ミスの次は必ず命中。技の気力3は、ミスでも消費します。</p><p>宝箱には薬・結晶・灯り。階段では少し回復。新しい冒険は10層で、4・8層の入口に一度限りの休憩所があります。最深部の守り手から「星の種」を手に入れ、帰路の灯で脱出すれば達成です。</p><p>戦闘中以外はいつでも帰還できます。探索はこのブラウザに自動保存されます。端末間の同期はありません。</p><button class="primary" data-modal="close">わかった</button>','help');
$('map-button').onclick=()=>{if(!state)return;open('<span class="eyebrow">EXPLORER’S JOURNAL</span><h2 id="dialog-title">歩いた道が、地図になる。</h2><canvas id="large-map" width="440" height="440" aria-label="現在の層の探索地図"></canvas><p class="legend">▲ 現在地・向き　■ 訪れた道<br><span style="color:#edda93">● 宝箱 / ■ 階段</span>　<span style="color:#83d9cd">● 泉</span>　<span style="color:#d79774">● 通常敵　★ 守り手（最深部のボス）</span><br>⌂ 休憩所　✓ 補給済み<br>周囲の道が少しずつ記録されます。</p><button class="primary" data-modal="close">探索に戻る</button>','map');drawMap($('large-map'),state,true);};
$('return').onclick=()=>open('<span class="eyebrow">THE LIGHT HOME</span><h2 id="dialog-title">灯りを持って、帰ろう。</h2><p>帰路の灯を使うと、今回の探索を終えます。手元の結晶をすべて持ち帰れます。</p><button class="primary" data-modal="return">帰還する</button><button data-modal="close">まだ探索を続ける</button>','return');
$('mission-return').onclick=()=>$('return').click();
$('potion').onclick=()=>dispatch('potion');$('rest').onclick=()=>dispatch('rest');
for(const b of document.querySelectorAll('[data-action]'))b.onclick=()=>dispatch(b.dataset.action);
$('dialog-content').onclick=e=>{const a=e.target.closest('[data-modal]')?.dataset.modal;if(!a)return;const old=modalType;if(a==='reward-skip'){revealReward();return;}if(old==='reward')acknowledgeReward();close();if(a==='story'){$('story').click();return;}if(a.startsWith('companion-')){start(false,a.slice(10));return;}if(a==='retry'||a==='new'){start();return;}if(a==='title'){audio.stop();battleLayout(false);motion=null;saved=state;state=null;$('intro').hidden=false;$('play').hidden=true;$('continue').hidden=true;$('last-result').hidden=false;$('start-note').hidden=false;$('enemy-hud').hidden=true;$('floor-label').textContent='星眠りの森';render();return;}if(a==='close'||a==='reward-close'){if(old==='companion'&&state&&['won','dead','returned'].includes(state.phase)){result();return;}if(old==='help'&&state?.phase==='stairs')stairs();return;}if(act(state,a)){if(a==='descend')sound('enter');if(a==='return')sound('return');}save();render();};
dialog.addEventListener('keydown',e=>{if(modalType!=='companion'||e.key!=='Tab')return;const items=[...dialog.querySelectorAll('.companion-list,[data-modal]')],first=items[0],last=items.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('dialog-title'))){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
dialog.addEventListener('cancel',e=>{if(modalType==='companion'&&state&&['won','dead','returned'].includes(state.phase)){e.preventDefault();close();result();return;}if(['result','stairs'].includes(modalType)){e.preventDefault();return;}if(modalType==='reward'){acknowledgeReward();audio.stop();}stopRewardTimers();e.preventDefault();close();});
window.addEventListener('keydown',e=>{if(dialog.open||!state||e.repeat)return;const a={ArrowUp:'forward',w:'forward',ArrowDown:'back',s:'back',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right','1':'attack','2':'skill','3':'guard'}[e.key];if(a){e.preventDefault();dispatch(a);}});
document.addEventListener('visibilitychange',()=>{motion=null;if(document.hidden){input.reset();if(finishTimer)finishStrike();clearEffect();audio.background();if(modalType==='reward'){stopRewardTimers();document.querySelector('.reward-display')?.classList.add('revealed');if($('reward-skip'))$('reward-skip').hidden=true;}}if(state)save();});
// Resume only on a fresh gesture; never replay old cues after an interruption.
document.addEventListener('pointerdown',()=>{void audio.unlock();},{passive:true});document.addEventListener('keydown',()=>{void audio.unlock();});
let frame=0;function animate(time){if(!document.hidden && time-frame>(motion?15:80)){drawView(time);frame=time;}requestAnimationFrame(animate);}render();requestAnimationFrame(animate);
