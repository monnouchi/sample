export const COMPANIONS={
 ao:{name:'アオ',role:'門番',mark:'🛡',description:'敵の攻撃を毎回2軽減（最低1）。長い戦いに強いが、攻撃力は増えない。',intro:'先を急がなくていい。灯と帰り道は、僕が見ている。'},
 mei:{name:'メイ',role:'薬師',mark:'✚',description:'攻撃・技を2回使うごとに体力6回復。防御中や致命傷では回復しない。',intro:'歩く速さは合わせるよ。傷は隠さず、教えてね。'},
 ren:{name:'レン',role:'灯技師',mark:'✦',description:'翠の一閃が命中すると追加4ダメージ。気力が切れると支援できない。',intro:'君の光に、僕の光を重ねよう。短い一閃でも、道は開く。'}
};
export const companionOf=s=>s?.version===2?COMPANIONS[s.companion]:null;
export const speak=(s,text)=>companionOf(s)?`${companionOf(s).name}「${text}」`:text;
export const maxFloor=s=>s?.version===2?10:3;
export const historyLimit=s=>s?.version===2?28:9;
export const themeFloor=s=>s?.version===2?(s.floor<=3?1:s.floor<=7?2:3):(s?.floor||1);
