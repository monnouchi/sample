export function intent(enemy){
 if(enemy?.boss&&enemy.pattern===1)return ['normal','heavy','opening'][enemy.turn%3];
 return enemy?.turn%3===2?'heavy':'normal';
}
export function intentText(enemy){
 const phase=intent(enemy);
 if(phase==='opening')return '一手の隙：反撃なし。命中ダメージ +6';
 if(phase==='heavy')return enemy.boss&&enemy.pattern===1?'次は強撃：防御で軽減／技が命中すると威力半減':'次は強撃。身を守ると被害を軽減';
 return '次は通常攻撃。こちらの行動後に反撃';
}
export function bossAdvice(enemy,companion){
 const lines={ao:['絡む根を狙おう。帰り道は僕が守る。','強撃が来る。守りを固めよう。','今は反撃がない。攻めるか、立て直そう。'],mei:['守り手自身も苦しんでいる。根をほどこう。','強撃の前に、体力と薬を確かめて。','手当てするなら今。攻めるのもいいね。'],ren:['根の流れが見えた。そこへ一閃を。','技が当たれば強撃を弱められる。','隙ができた。気力を使うなら今だ。']};
 return lines[companion]?.[['normal','heavy','opening'].indexOf(intent(enemy))]||'';
}
