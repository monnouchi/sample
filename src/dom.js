// Pages/CDN/browser caches can briefly mix old HTML with current module bodies.
// Reconcile additive UI nodes before any handlers or battle layout access them.
// Never read, clear or replace a saved adventure here.
export function prepareDOM(doc=document){
 const ensure=(id,tag,classes,anchor,text='')=>{
  if(doc.getElementById(id))return;
  const target=doc.getElementById(anchor);if(!target)return;
  const node=doc.createElement(tag);node.id=id;node.className=classes;node.textContent=text;
  if(tag==='p'||id==='companion-talk')node.hidden=true;
  target.before(node);
 };
 ensure('companion-talk','button','companion-talk','light-warning');
 ensure('kit-status','p','kit-status','camp');
 ensure('event-notice','p','event-notice','explore-controls');
 ensure('event-history','button','history-button','reward-history','冒険の履歴');
 ensure('kit','button','history-button','reward-history','装備と護符');
 doc.getElementById('event-notice')?.setAttribute('role','status');
 const journal=doc.getElementById('message')?.parentElement;if(journal)journal.hidden=true;
 const obsolete=doc.getElementById('companion-info');if(obsolete)obsolete.hidden=true;
 // Refresh stylesheet too when an older cached document names an old release.
 const style=doc.querySelector('link[rel="stylesheet"]');
 if(style&&!style.href.includes('20261001-input-boundaries'))style.href='./style.css?v=20261001-input-boundaries';
}
