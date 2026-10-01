"""Injected fixtures: result text, reward compatibility, live-region mutations.
DOM mutation tests are not a substitute for a real screen reader.
"""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory='dist'));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':390,'height':844},has_touch=True,reduced_motion='reduce')
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)));url=f'http://127.0.0.1:{server.server_port}'
  def fixture(floor=1,light=100,mode='empty'):
   page.goto(url)
   page.evaluate('''async({floor,light,mode})=>{const {fresh,DIRS,key}=await import('./src/game.js?v=20261001-kpt4');const {chestTier}=await import('./src/rewards.js?v=20261001-kpt4');let s=fresh(3,{legacy:true});if(mode==='gold'){for(let seed=0;seed<1000;seed++){const t=fresh(seed,{legacy:true}),[dx,dy]=DIRS[t.dir];if(chestTier(seed,1,1+dx,1+dy)==='gold'){s=t;break;}}}s.floor=floor;s.light=light;s.map.events={};const [dx,dy]=DIRS[s.dir];if(mode==='gold'||mode==='chest')s.map.events[key(1+dx,1+dy)]='chest';if(mode==='old')s.rewards=[{id:'3:5,5',floor:3,tier:'gold',gold:37,potions:1,light:2}];localStorage.setItem('suito-save-v1',JSON.stringify(s));}''',{'floor':floor,'light':light,'mode':mode})
   page.reload();page.locator('#continue').tap();page.wait_for_timeout(220)
  def press(action):page.locator(f'[data-action={action}]').tap();page.wait_for_timeout(220)
  for floor in [1,2,3]:
   fixture(floor);page.locator('#return').tap();page.locator('[data-modal=return]').tap();text=page.locator('#dialog-content').inner_text()
   assert ('最深部には到達しました' in text)==(floor==3)
   assert ('最深部には届かなくても' in text)==(floor<3)
  fixture(light=98,mode='gold');press('forward');text=page.locator('.reward-items').inner_text();assert '露の薬 ×2' in text and '灯り +3' in text and '上限20' in text
  page.locator('[data-modal=reward-close]').tap();page.reload();page.locator('#continue').tap();page.locator('#reward-history').tap();assert '露の薬 ×2' in page.locator('.reward-record').inner_text()
  fixture(mode='old');page.locator('#reward-history').tap();text=page.locator('.reward-record').inner_text();assert '露の薬 ×1' in text and '灯り +2' in text and '上限10' in text
  fixture(light=11)
  assert page.locator('#light-warning').get_attribute('role') is None
  page.evaluate("()=>{window.announcements=0;new MutationObserver(()=>window.announcements++).observe(document.querySelector('#light-announcement'),{childList:true,subtree:true,characterData:true})}")
  press('forward');assert page.evaluate('announcements')==1
  press('back');assert page.evaluate('announcements')==1;assert '残り9' in page.locator('#light-warning').inner_text()
  press('right');press('left');assert page.evaluate('announcements')==1
  for i in range(9):press('forward' if i%2==0 else 'back')
  assert page.evaluate('announcements')==3 # entering <=10, exactly1, exactly0
  page.evaluate("()=>{window.journalChanges=0;new MutationObserver(()=>window.journalChanges++).observe(document.querySelector('#message'),{childList:true,subtree:true,characterData:true})}")
  press('back');assert page.evaluate('announcements')==3;assert page.evaluate('journalChanges')==0
  fixture(light=10,mode='chest');assert '少なく' in page.locator('#light-announcement').inner_text();press('forward');assert '解除' in page.locator('#light-announcement').inner_text()
  assert page.locator('#light-warning').is_hidden()
  assert not errors,errors
  print('PASS: floor1/2/3 return text; gold2/light cap20 and old gold1/cap10 retained; live-region updates only <=10/1/0/recovery, not turns or intermediate steps; no JS errors')
  browser.close()
finally:server.shutdown();server.server_close()
