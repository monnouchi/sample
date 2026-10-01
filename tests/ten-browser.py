"""Companion choice uses real UI; deeper battle/rest/legacy cases are explicit fixtures."""
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
  for companion,name in [('ao','アオ'),('mei','メイ'),('ren','レン')]:
   page=browser.new_page(viewport={'width':390,'height':650},has_touch=True)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   url=f'http://127.0.0.1:{server.server_port}';page.goto(url)
   page.locator('#start').tap();page.wait_for_timeout(420);expect(page.locator('#dialog-title')).to_have_text('誰と、灯を守る？')
   assert page.evaluate("localStorage.getItem('suito-save-v1')")==None
   page.locator('[data-modal=close]').tap();page.wait_for_timeout(420);assert page.evaluate("localStorage.getItem('suito-save-v1')")==None
   page.locator('#start').tap();page.wait_for_timeout(420);page.locator(f'[data-modal=companion-{companion}]').tap();page.wait_for_timeout(420)
   state=lambda:page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1'))")
   assert state()['version']==2 and state()['companion']==companion
   assert name in page.locator('#companion-talk').inner_text()
   page.locator('#story').tap();page.wait_for_timeout(420);assert name in page.locator('#dialog-content').inner_text();page.locator('[data-modal=close]').tap();page.wait_for_timeout(420)
   saved=state();page.reload();page.locator('#continue').tap();page.wait_for_timeout(420);assert state()==saved
   for floor in [4,8]:
    page.goto(url)
    page.evaluate('''async floor=>{const {generate}=await import('./src/game.js');const s=JSON.parse(localStorage.getItem('suito-save-v1'));s.floor=floor;s.x=s.y=1;s.hp=20;s.light=3;s.focus=0;s.map=generate(s.seed,floor);s.dir=s.map.grid[1][2]?2:1;s.map.seen={'1,1':true};s.map.visited={'1,1':true};localStorage.setItem('suito-save-v1',JSON.stringify(s));}''',floor)
    page.reload();page.locator('#continue').tap();page.wait_for_timeout(420);expect(page.locator('#camp')).to_be_visible();n=state()['potions'];page.locator('#rest').tap();page.wait_for_timeout(420)
    assert [state()['hp'],state()['light'],state()['focus'],state()['potions']]==[100,100,6,n+2]
    expect(page.locator('#rest')).to_be_disabled();page.reload();page.locator('#continue').tap();page.wait_for_timeout(420);expect(page.locator('#rest')).to_be_disabled();assert state()['potions']==n+2
   page.goto(url)
   page.evaluate('''()=>{const s=JSON.parse(localStorage.getItem('suito-save-v1'));s.phase='battle';s.strikeRng=1;s.hp=50;s.focus=6;s.supportCharge=1;s.enemy={name:'根絡みの番人',hp:100,maxHp:100,turn:0,boss:false};localStorage.setItem('suito-save-v1',JSON.stringify(s));}''')
   page.reload();page.locator('#continue').tap();page.wait_for_timeout(420);page.wait_for_timeout(420);page.locator('[data-action=skill]').tap();page.wait_for_timeout(420)
   assert name in page.locator('#battle-feedback').inner_text()
   for w,h in [(390,650),(320,568),(844,390)]:
    page.set_viewport_size({'width':w,'height':h});page.evaluate('window.scrollTo(0,0)')
    for sel in ['[data-action=attack]','[data-action=skill]','#battle-potion','#flee']:
     box=page.locator(sel).bounding_box();assert box['height']>=44
     if h>=568:assert box['y']+box['height']<=h,(companion,w,h,sel,box)
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
   page.set_viewport_size({'width':390,'height':650})
   page.add_style_tag(content='#app{padding-top:30px;padding-bottom:34px}')
   page.evaluate('window.scrollTo(0,0)');safe=page.locator('#flee').bounding_box();assert safe['y']+safe['height']<=650-34
   Path('artifacts').mkdir(exist_ok=True);page.screenshot(path=f'artifacts/companion-{companion}.png')
   saved=state();page.reload();page.locator('#continue').tap();page.wait_for_timeout(420);assert state()==saved;assert name in page.locator('#battle-feedback').inner_text()
   assert not errors,errors;page.close();print(f'PASS {companion}: choice/cancel, speech, 4/8 rest once/reload, support, compact UI, save',flush=True)
  page=browser.new_page(viewport={'width':320,'height':568},has_touch=True);page.goto(url)
  for phase in ['explore','won']:
   page.goto(url)
   page.evaluate('''async phase=>{const {fresh,generate}=await import('./src/game.js');const s=fresh(3,{legacy:true});s.floor=3;s.map=generate(3,3,3);s.phase=phase;s.relic=phase==='won';localStorage.setItem('suito-save-v1',JSON.stringify(s));}''',phase)
   page.reload()
   if phase=='explore':
    old=page.evaluate("localStorage.getItem('suito-save-v1')");page.locator('#start').tap();page.wait_for_timeout(420);page.locator('[data-modal=new]').tap();page.wait_for_timeout(420);page.locator('[data-modal=close]').tap();page.wait_for_timeout(420);assert page.evaluate("localStorage.getItem('suito-save-v1')")==old
   page.locator('#last-result' if phase=='won' else '#continue').tap();page.wait_for_timeout(420)
   assert page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1')).version")==1
   if phase=='won':
    expect(page.locator('#dialog-title')).to_have_text('星を、持ち帰った。');page.locator('[data-modal=retry]').tap();page.wait_for_timeout(420);page.locator('[data-modal=close]').tap();page.wait_for_timeout(420);expect(page.locator('#dialog-title')).to_have_text('星を、持ち帰った。')
   else:assert '最深部' in page.locator('#floor-label').inner_text()
  print('PASS legacy third-floor continuation and completed-result reread/cancel without overwriting',flush=True)
  browser.close()
finally:server.shutdown();server.server_close()
