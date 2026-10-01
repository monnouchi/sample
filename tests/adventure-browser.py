"""Explicit save fixtures for chest/low-light/art QA, separate from full normal play."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory='dist'));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width,height in [(390,844),(320,568),(844,390)]:
   context=browser.new_context(viewport={'width':width,'height':height},has_touch=True)
   context.add_init_script("window.audioCreations=0;const Original=window.AudioContext;if(Original)window.AudioContext=new Proxy(Original,{construct(target,args){window.audioCreations++;return Reflect.construct(target,args);}})")
   page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   url=f'http://127.0.0.1:{server.server_port}'
   def fixture(mode='chest',light=95,enemy='苔角の獣',floor=1):
    page.goto(url)
    page.evaluate('''async({mode,light,enemy,floor})=>{const {fresh,generate,DIRS,key}=await import('./src/game.js?v=20261001-adventure');const s=fresh(3,{legacy:true});s.floor=floor;s.map=generate(3,floor);s.dir=s.map.grid[1][2]?2:1;s.light=light;s.map.events={};const [dx,dy]=DIRS[s.dir];if(mode==='chest')s.map.events[key(s.x+dx,s.y+dy)]='chest';if(mode==='battle'){s.phase='battle';s.enemy={name:enemy,hp:25,maxHp:25,turn:2,boss:false};}localStorage.setItem('suito-save-v1',JSON.stringify(s));}''',{'mode':mode,'light':light,'enemy':enemy,'floor':floor})
    page.reload();page.locator('#continue').tap();page.wait_for_timeout(420)
   get=lambda:page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1'))")
   fixture();page.locator('[data-action=forward]').tap();expect(page.locator('#dialog')).to_be_visible()
   earned=get();assert len(earned['rewards'])==1 and earned['rewards'][0]['light']==6
   # Timer-driven reveal finishes; reduced motion has its own immediate path below.
   page.wait_for_timeout(1600)
   assert page.locator('.reward-display').evaluate("e=>e.classList.contains('revealed')")
   assert page.locator('.reward-items').inner_text().count('露の薬')==1
   assert '灯り +6' in page.locator('.reward-items').inner_text()
   assert page.evaluate('window.audioCreations')==0
   page.evaluate("document.querySelector('[data-action=forward]').click()");assert get()==earned
   page.reload();page.locator('#continue').tap();expect(page.locator('#dialog')).to_be_visible();assert get()==earned
   page.locator('#reward-skip').tap();assert page.locator('.reward-display').evaluate("e=>e.classList.contains('revealed')")
   page.locator('[data-modal=reward-close]').tap();assert get()['pendingReward'] is None
   page.wait_for_timeout(420);page.locator('[data-action=back]').tap();page.wait_for_timeout(420);page.locator('[data-action=forward]').tap();page.wait_for_timeout(420)
   assert get()['gold']==earned['gold'] and len(get()['rewards'])==1
   page.locator('#reward-history').tap();assert page.locator('.reward-record').count()==1;page.locator('[data-modal=close]').tap()
   fixture(light=9);expect(page.locator('#light-warning')).to_be_visible();page.locator('[data-action=forward]').tap();page.locator('#reward-skip').tap();page.locator('[data-modal=reward-close]').tap();expect(page.locator('#light-warning')).to_be_hidden()
   fixture('empty',1);assert '次の一歩で0' in page.locator('#light-warning').text_content();page.locator('[data-action=left]').tap();page.wait_for_timeout(420);assert get()['light']==1
   page.locator('[data-action=right]').tap();page.wait_for_timeout(420);page.locator('[data-action=forward]').tap();page.wait_for_timeout(420);assert get()['light']==0 and get()['hp']==96;assert '移動するたび' in page.locator('#light-warning').text_content()
   page.locator('#return').tap();page.locator('[data-modal=return]').tap();assert get()['phase']=='returned'
   fixture('battle',0);assert '帰路の灯' not in page.locator('#light-warning').text_content();assert '戦闘中' in page.locator('#light-warning').text_content()
   page.emulate_media(reduced_motion='reduce');fixture();page.locator('[data-action=forward]').tap();assert page.locator('.reward-display').evaluate("e=>e.classList.contains('revealed')");expect(page.locator('#reward-skip')).to_be_hidden()
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
   close=page.locator('[data-modal=reward-close]');close.scroll_into_view_if_needed();box=close.bounding_box();assert box['height']>=44 and box['width']>=44
   if width==390:
    Path('artifacts').mkdir(exist_ok=True)
    page.screenshot(path='artifacts/rewards-mobile.png')
    for i,name in enumerate(['苔角の獣','宵羽の蛾','根絡みの番人']):
     fixture('battle',0,name,i+1);page.screenshot(path=f'artifacts/enemy-floor-{i+1}.png',full_page=True)
     # Drawing repeatedly must not advance gameplay or combat RNG.
     before=get();page.wait_for_timeout(400);assert get()==before
   fixture();page.evaluate("()=>{Storage.prototype.setItem=function(){throw new DOMException('Blocked','SecurityError')};}");page.locator('[data-action=forward]').tap();assert '保存できません' in page.locator('.reward-saved').inner_text()
   assert not errors,errors
   print(f'PASS {width}x{height}: reward/reload/no-duplicate/history/reveal/skip/mute/reduced-motion; light1/0/recovery/return/battle warning; width',flush=True)
   context.close()
  browser.close()
finally:server.shutdown();server.server_close()
