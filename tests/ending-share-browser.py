"""Ending fixtures and mocked platform sharing; never posts to X or invokes real OS sharing."""
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
  for phase,legacy,mode in [('won',False,'ok'),('won',True,'cancel'),('returned',False,'unsupported'),('dead',False,'denied'),('won',False,'blob-fail')]:
   page=browser.new_page(viewport={'width':320,'height':568},has_touch=True,reduced_motion='reduce' if legacy else 'no-preference');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.add_init_script("""window.sent=[];Object.defineProperty(navigator,'canShare',{value:()=>true,configurable:true});Object.defineProperty(navigator,'share',{value:async data=>{window.sent.push({name:data.files[0].name,type:data.files[0].type,size:data.files[0].size,text:data.text});},configurable:true});Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new DOMException('denied','NotAllowedError');}},configurable:true});""")
   page.goto(f'http://127.0.0.1:{server.server_port}')
   page.evaluate("""async ({phase,legacy})=>{const {fresh}=await import('./src/game.js');const s=fresh(31,{legacy,companion:'mei'});s.floor=legacy?3:10;s.phase=phase;s.relic=phase==='won';s.gold=1234;s.steps=297;s.kills=21;localStorage.setItem('suito-save-v1',JSON.stringify(s));}""",{'phase':phase,'legacy':legacy})
   def tap(sel):page.locator(sel).tap();page.wait_for_timeout(450)
   page.reload();tap('#last-result');saved=page.evaluate("localStorage.getItem('suito-save-v1')")
   if phase=='won':
    assert page.locator('.ending-art').is_visible();assert f'第{3 if legacy else 10}層踏破' in page.locator('.ending-header').inner_text()
    if legacy:assert page.locator('.ending-sprout').evaluate('e=>getComputedStyle(e).animationName')=='none'
    else:assert 'メイ' in page.locator('.ending-farewell').inner_text()
    tap('[data-modal=ending-skip]');assert page.locator('.ending-sprout').evaluate('e=>getComputedStyle(e).animationName')=='none'
    for sel in ['[data-modal=retry]','[data-modal=title]']:
     box=page.locator(sel).bounding_box();assert box['height']>=44 and box['y']+box['height']<=568
    tap('[data-modal=title]');tap('#last-result');assert page.evaluate("localStorage.getItem('suito-save-v1')")==saved
   else:assert page.locator('.ending-art').count()==0
   if mode=='unsupported':page.evaluate("Object.defineProperty(navigator,'canShare',{value:()=>false})")
   if mode in ['cancel','denied']:page.evaluate("mode=>Object.defineProperty(navigator,'share',{value:async()=>{throw new DOMException('mock',mode==='cancel'?'AbortError':'NotAllowedError');}})",mode)
   if mode=='blob-fail':page.evaluate("()=>{HTMLCanvasElement.prototype.toBlob=function(cb){cb(null)};}")
   tap('[data-modal=share]');expect(page.locator('#share-status')).not_to_have_text('画像を準備しています。')
   if mode=='blob-fail':assert '画像を作れません' in page.locator('#share-status').inner_text()
   else:
    expect(page.locator('#score-image')).to_be_visible();assert page.locator('#score-preview').evaluate('e=>[e.width,e.height]')==[1080,1080]
    if mode=='ok':
     Path('artifacts').mkdir(exist_ok=True)
     with page.expect_download() as info:tap('#share-download')
     info.value.save_as('artifacts/share-score.png')
    if mode!='unsupported':
     tap('#share-native')
     assert ('共有先へ渡しました' if mode=='ok' else '取り消した' if mode=='cancel' else '共有できません') in page.locator('#share-status').inner_text()
     if mode=='ok':assert page.evaluate('sent[0].type')=='image/png' and page.evaluate('sent[0].size')>10000
    else:expect(page.locator('#share-native')).to_be_hidden()
   tap('#share-copy');assert 'コピーできません' in page.locator('#share-status').inner_text();expect(page.locator('textarea')).to_be_focused()
   if mode=='ok':
    page.evaluate("()=>{navigator.clipboard.writeText=async text=>{window.copied=text;};}");tap('#share-copy');assert 'コピーしました' in page.locator('#share-status').inner_text();assert page.evaluate('copied')==page.locator('textarea').input_value()
   assert 'monnouchi.github.io/verdant-lantern/' in page.locator('textarea').input_value()
   href=page.locator('#share-x').get_attribute('href');assert href.startswith('https://x.com/intent/tweet?') and 'media' not in href
   tap('[data-modal=share-back]');assert page.evaluate("localStorage.getItem('suito-save-v1')")==saved
   assert not errors,errors;print(f'PASS ending/share {phase} legacy={legacy} mode={mode}: replay/skip, PNG or fallback, no state changes/no actual post',flush=True);page.close()
  browser.close()
finally:server.shutdown();server.server_close()
