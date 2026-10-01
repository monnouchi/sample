"""Reproduce stale HTML/new modules, then verify normal reload recovery without clearing storage."""
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from subprocess import check_output
from playwright.sync_api import sync_playwright,expect
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory='dist'));Thread(target=server.serve_forever,daemon=True).start()
oldhtml=check_output(['git','show','d52eb4c:index.html'],text=True)
brokenapp=check_output(['git','show','283f9a3:src/app.js'],text=True)
oldapp=check_output(['git','show','54c94bb:src/app.js'],text=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  url=f'http://127.0.0.1:{server.server_port}/'
  page=browser.new_page(viewport={'width':390,'height':568},has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url)
  page.evaluate("""async()=>{const {fresh}=await import('./src/game.js');const s=fresh(31,{companion:'mei'});s.hp=73;s.gold=51;localStorage.setItem('suito-save-v1',JSON.stringify(s));}""")
  saved=page.evaluate("localStorage.getItem('suito-save-v1')")
  page.route(url,lambda route:route.fulfill(body=oldhtml,content_type='text/html'))
  page.route('**/src/app.js?*',lambda route:route.fulfill(body=brokenapp,content_type='text/javascript'))
  page.reload();page.wait_for_timeout(500)
  assert any("before" in e for e in errors),errors
  assert page.evaluate("localStorage.getItem('suito-save-v1')")==saved
  print('REPRODUCED old HTML + pre-fix current JS: missing event-history crashes node.before',flush=True)
  page.unroute('**/src/app.js?*');errors.clear()
  for _ in range(2):
   page.reload();page.wait_for_timeout(500)
   assert not errors,errors
   assert page.locator('#event-history').count()==1 and page.locator('#event-notice').count()==1
   assert 'guardian' in page.locator('link[rel=stylesheet]').get_attribute('href')
   page.locator('#continue').tap();page.wait_for_timeout(420);expect(page.locator('#play')).to_be_visible()
   s=page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1'))");assert (s['seed'],s['hp'],s['gold'])==(31,73,51)
   page.locator('#event-history').tap();page.wait_for_timeout(420);page.locator('[data-modal=close]').tap();page.wait_for_timeout(420)
  print('PASS normal reload with stale HTML + repaired graph: title/continue/history and saved resources preserved',flush=True)
  page.unroute(url);page.route('**/src/app.js?*',lambda route:route.fulfill(body=oldapp,content_type='text/javascript'))
  errors.clear();page.reload();page.wait_for_timeout(500);assert not errors,errors
  page.locator('#continue').tap();page.wait_for_timeout(420);expect(page.locator('#play')).to_be_visible();assert not errors,errors
  print('PASS current HTML + cached pre-loot app: retained compatibility anchor prevents null startup',flush=True)
  page.unroute('**/src/app.js?*');errors.clear();page.reload();page.wait_for_timeout(500)
  page.locator('#start').tap();page.wait_for_timeout(420);page.locator('[data-modal=new]').tap();page.wait_for_timeout(420);page.locator('[data-modal=companion-mei]').tap();page.wait_for_timeout(420);expect(page.locator('#play')).to_be_visible();assert not errors,errors
  print('PASS clean current assets: new adventure starts without console errors',flush=True)
  browser.close()
finally:server.shutdown();server.server_close()
