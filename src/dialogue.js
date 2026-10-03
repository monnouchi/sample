import {COMPANIONS} from './companions.js?v=20261003-title-only';
import {layersFor} from './story.js?v=20261003-title-only';
// Conversation and event records have separate output paths. Migration is limited
// to exact formats emitted by older builds, never a substring match to current speech.
export function say(s,text){if(s.version===2)s.dialogue=text;}
export function migrateDialogue(s){
 if(s.version!==2||s.dialogueSchema===1)return;
 const c=COMPANIONS[s.companion],wrap=t=>`${c.name}「${t}」`;
 const pure=[c.intro,...layersFor(s).map(l=>l.detail),'休憩所に着いた。下の「休む」で補給できるよ。','ここでの補給は使い切った。次へ進もう。'];
 s.log=s.log.map(t=>{
  if(pure.some(line=>t===wrap(line)))return null;
  for(const [i,l] of layersFor(s).entries()){
   const prefix=`第${i+1}層へ。${wrap(l.text)}`;
   if(t.startsWith(prefix))return `第${i+1}層へ。${t.slice(prefix.length)}`;
  }
  const prefix=`${c.name}「休めたね。`;
  if(t.startsWith(prefix)&&t.endsWith('薬を2個補充した。」'))return `休憩所で補給。${t.slice(prefix.length,-1)}`;
  return t;
 }).filter(t=>t!==null);
 if(!s.log.length)s.log=['探索を再開した。'];
 s.dialogueSchema=1;
}
