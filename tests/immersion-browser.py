"""Explicit battle fixtures + WebAudio graph/render checks, not listening or Safari QA."""
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory='dist'));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':390,'height':650},has_touch=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  url=f'http://127.0.0.1:{server.server_port}'
  def fixture(kind='normal',hp=100):
   page.goto(url)
   page.evaluate('''async ({kind,hp})=>{const {fresh,act}=await import('./src/game.js');let s;
    for(let rng=0;rng<10000;rng++){s=fresh(3,{legacy:true});s.hp=93;s.phase='battle';s.enemy={name:'苔角の獣',hp:100,maxHp:100,turn:0,boss:false};s.strikeRng=rng;const clone=structuredClone(s);act(clone,'skill');if(clone.lastAttack.kind===kind)break;}
    s.enemy.hp=hp;localStorage.setItem('suito-save-v1',JSON.stringify(s));}''',{'kind':kind,'hp':hp})
   page.reload();page.locator('#continue').tap();page.wait_for_timeout(220)
  for w,h in [(390,844),(390,650),(390,568),(320,568),(320,480),(844,390),(1180,757)]:
   page.set_viewport_size({'width':w,'height':h});fixture()
   expect(page.locator('#battle-details')).not_to_have_attribute('open','')
   assert not page.locator('#map-button').is_visible()
   assert page.locator('.viewport').bounding_box()['height']>=180
   assert page.evaluate('scrollY')==0
   for sel in ['[data-action=attack]','[data-action=skill]','[data-action=guard]','#battle-potion','#flee']:
    b=page.locator(sel);box=b.bounding_box();assert box['height']>=44 and box['width']>=44
    if h>=568:assert box['y']+box['height']<=h,(w,h,sel,box)
    b.scroll_into_view_if_needed();assert b.bounding_box()['y']>=0
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
   page.locator('#battle-details summary').tap();expect(page.locator('#message')).to_be_visible();page.locator('#map-button').tap();expect(page.locator('#large-map')).to_be_visible();page.locator('[data-modal=close]').tap()
   page.locator('#battle-details summary').tap();page.locator('#flee').tap()
   expect(page.locator('#battle-details')).to_be_hidden();expect(page.locator('#map-button')).to_be_visible()
   assert page.locator('#map-button').evaluate("e=>e.parentElement.className")=='viewport'
   print(f'PASS compact battle {w}x{h}: actions/creature/details/map/flee/restoration',flush=True)
  page.set_viewport_size({'width':390,'height':650})
  for kind in ['normal','miss','critical']:
   fixture(kind);page.locator('[data-action=skill]').tap()
   assert page.locator('#spell-effect').get_attribute('class')==f'active {kind}'
   assert {'normal':'命中','miss':'ミス','critical':'クリティカル'}[kind] in page.locator('#battle-feedback').inner_text()
   saved=page.evaluate("localStorage.getItem('suito-save-v1')")
   page.wait_for_timeout(400);assert page.locator('#spell-effect').get_attribute('class')==''
   page.reload();page.locator('#continue').tap();assert page.evaluate("localStorage.getItem('suito-save-v1')")==saved
  fixture('normal',1);page.locator('[data-action=skill]').tap()
  assert page.locator('#spell-effect').get_attribute('class')=='active normal'
  assert page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1')).kills")==1
  page.locator('[data-action=attack]').tap();page.wait_for_timeout(400)
  expect(page.locator('#explore-controls')).to_be_visible();assert page.locator('#spell-effect').get_attribute('class')==''
  assert page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1')).kills")==1
  fixture('normal',1);page.locator('#sound').tap();page.locator('[data-action=skill]').tap();page.locator('#sound').tap()
  expect(page.locator('#explore-controls')).to_be_visible();assert page.locator('#spell-effect').get_attribute('class')==''
  page.emulate_media(reduced_motion='reduce');fixture('miss');page.locator('[data-action=skill]').tap()
  assert page.locator('.spell-impact').evaluate('e=>getComputedStyle(e).animationName')=='none'
  assert 'ミス' in page.locator('#battle-feedback').inner_text()
  page.wait_for_timeout(400);page.emulate_media(reduced_motion='no-preference')
  # Increased text sizes may scroll; no clipping or overlap, actions stay reachable.
  fixture();page.add_style_tag(content='button{font-size:24px!important}button small,#intent,#battle-feedback{font-size:20px!important}')
  for sel in ['[data-action=attack]','[data-action=skill]','#battle-potion','#flee']:
   b=page.locator(sel);b.scroll_into_view_if_needed();assert b.bounding_box()['height']>=44
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  Path('artifacts').mkdir(exist_ok=True);page.screenshot(path='artifacts/battle-large-text.png')
  fixture();page.screenshot(path='artifacts/battle-compact.png')
  # User gesture creates/resumes audio, muted default, capped groups and immediate shutdown.
  result=page.evaluate('''async()=>{const {ForestAudio}=await import('./src/audio.js');let hidden=false;const a=new ForestAudio({hidden:()=>hidden});await a.play('step');if(a.context)throw Error('mute allocated audio');a.setMuted(false);await a.play('skill');if(a.context.state!=='running')throw Error('not running');for(let i=0;i<12;i++)await a.play('critical');const cap=a.groups.length;a.setMuted(true);const mute=a.groups.length;a.setMuted(false);await a.play('step');hidden=true;a.background();await new Promise(r=>setTimeout(r,50));const bg=a.groups.length;hidden=false;await a.play('guard');const resumed=a.context.state;a.stop();await a.context.close();return {cap,mute,bg,resumed};}''')
  assert result=={'cap':4,'mute':0,'bg':0,'resumed':'running'},result
  # Offline render the same production graph; analyze real generated samples, not perceived quality.
  samples=page.evaluate('''async()=>{const {ForestAudio}=await import('./src/audio.js');const out=[];
   for(const kind of ['step','skill','spell-miss','critical','guard','chest','reward']){
    const c=new OfflineAudioContext(2,48000,48000);c.resume=async()=>{};
    const a=new ForestAudio({createContext:()=>c,hidden:()=>false});a.setMuted(false);await a.unlock();a.unlock=async()=>true;await a.play(kind,{floor:3,step:1});
    const b=await c.startRendering();const l=b.getChannelData(0),r=b.getChannelData(1);let peak=0,energy=0,stereo=0;for(let i=0;i<l.length;i++){peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));energy+=l[i]*l[i]+r[i]*r[i];stereo+=Math.abs(l[i]-r[i]);}a.stop();out.push({kind,peak,energy,stereo});
   }return out;}''')
  for sample in samples:assert 0.001<sample['peak']<.7 and sample['energy']>0,sample
  assert samples[0]['stereo']>0
  print('PASS audio lifecycle',result,'offline PCM',samples,flush=True)
  assert not errors,errors
  browser.close()
finally:server.shutdown();server.server_close()
