export const GEAR={
 blade:{name:'根打ちの刃',short:'刃 +2',icon:'⚔',effect:'通常攻撃が命中すると追加2ダメージ。技には加算しません。'},
 bark:{name:'樹皮のお守り',short:'守り −1',icon:'🛡',effect:'敵からの被害を1軽減。防御・アオの支援後も最低1ダメージは受けます。闇の被害は軽減しません。'},
 wick:{name:'樹脂の灯芯',short:'灯り節約',icon:'☼',effect:'4歩ごとに、その一歩の灯り消費が0になります。灯り0の闇による被害は防ぎません。'}
};
export function restoreFind(value){
 if(value?.kind==='ward')return {kind:'ward'};
 if(value?.kind==='gear'&&Object.hasOwn(GEAR,value.id))return {kind:'gear',id:value.id};
 if(value?.kind==='supply')return {kind:'supply'};
 return undefined;
}
export function restoreKit(s){
 s.gearOwned=Array.isArray(s.gearOwned)?[...new Set(s.gearOwned.filter(id=>Object.hasOwn(GEAR,id)))]:[];
 s.equipment=s.gearOwned.includes(s.equipment)?s.equipment:null;
 s.wardFound=s.wardFound===true||s.ward===1||(s.rewards||[]).some(r=>r.find?.kind==='ward');
 s.ward=s.ward===1?1:0;s.lastRescue=s.lastRescue===true;
}
export function grantFind(s){
 if(!s.wardFound){s.wardFound=true;s.ward=1;return {kind:'ward'};}
 const available=Object.keys(GEAR).filter(id=>!s.gearOwned.includes(id));
 if(available.length){const id=available[((s.seed^Math.imul(s.floor,7919)^s.steps)>>>0)%available.length];s.gearOwned.push(id);s.equipment??=id;return {kind:'gear',id};}
 s.potions++;return {kind:'supply'};
}
export function findDescription(find){
 if(find?.kind==='ward')return {icon:'✧',name:'帰り芽の護符',effect:'この冒険で一度だけ、致命傷を受けた瞬間に体力25で踏みとどまります。自動発動し、その後は消滅。休憩所では補充されません。'};
 if(find?.kind==='gear')return {...GEAR[find.id],effect:GEAR[find.id].effect+' 装備は同時に1個。探索中に切替できます。'};
 if(find?.kind==='supply')return {icon:'⚗',name:'旅の補給',effect:'装備3種は収集済み。重複する品の代わりに、露の薬を追加で1個受け取りました。'};
 return null;
}
