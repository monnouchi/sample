from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright,expect
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory='dist'));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':390,'height':568},has_touch=True)
  url=f'http://127.0.0.1:{server.server_port}'
  for legacy in [True,False]:
   for relic in [False,True]:
    page.goto(url);page.evaluate('''async ({legacy,relic})=>{const {fresh}=await import('./src/game.js');const s=fresh(3,{legacy,companion:'ren'});s.floor=legacy?3:10;s.light=5;s.relic=relic;localStorage.setItem('suito-save-v1',JSON.stringify(s));}''',{'legacy':legacy,'relic':relic})
    page.reload();page.locator('#continue').tap();page.wait_for_timeout(420)
    if relic:page.locator('[data-modal=close]').tap();expect(page.locator('#mission')).to_be_visible();assert '入手済み' in page.locator('#objective').inner_text()
    else:expect(page.locator('#mission')).to_be_hidden()
    expect(page.locator('#light-warning')).to_be_visible()
    page.locator('#story').tap();text=page.locator('#dialog-content').inner_text();assert ('入手済み' if relic else ('目標は第3層' if legacy else '目標は第10層')) in text
    page.locator('[data-modal=close]').tap();page.reload();page.locator('#continue').tap()
    if not relic:expect(page.locator('#mission')).to_be_hidden()
  print('PASS old/new goals on demand, ordinary mission hidden, relic return guidance and low-light warning retained across reload',flush=True)
  browser.close()
finally:server.shutdown();server.server_close()
