export function returnDescription(floor,depth=3){
 return floor===depth?'最深部には到達しました。星の種はまだですが、地図と結晶を持って無事に帰還です。次は守り手への挑戦を。':'最深部には届かなくても、刻んだ地図と結晶は確かな収穫です。次は、もう一歩先へ。';
}
export function lightBand(light){return light===0?'dark':light===1?'last':light<=10?'low':'safe';}
export function lightAnnouncement(band,previous){
 if(band===previous)return '';
 if(band==='safe')return previous&&previous!=='safe'?'灯りが回復し、残量の警告が解除されました。':'';
 if(band==='low')return '灯りが少なくなっています。0になる一歩から、移動ごとに体力を4失います。旋回は消費しません。';
 if(band==='last')return '灯りは残り1。次の一歩で0になり、体力を4失います。';
 return '灯りが尽きました。移動するたび体力を4失います。旋回は消費しません。';
}
