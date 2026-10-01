"""Round 3: battle fixtures for viewport/scroll/action/save regressions."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory='dist'))
Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        for width,height in [(320,568),(390,568)]:
            page=browser.new_page(viewport={'width':width,'height':height},has_touch=True)
            url=f'http://127.0.0.1:{server.server_port}/'
            page.goto(url)
            for sel in ['#scene-tag','#coordinates','#map-button','.expedition','#enemy-hud']:expect(page.locator(sel)).to_be_hidden()
            page.evaluate("""async()=>{const {fresh}=await import('./src/game.js');const s=fresh(31,{companion:'mei'});s.gold=71;localStorage.setItem('suito-save-v1',JSON.stringify(s));}""")
            page.reload();page.locator('#continue').tap();page.wait_for_timeout(420)
            expect(page.locator('#map-button')).to_be_visible();expect(page.locator('.expedition')).to_be_visible()
            page.locator('#companion-talk').tap();page.wait_for_timeout(420);page.locator('[data-modal=story]').tap();page.wait_for_timeout(420);assert page.locator('#dialog').get_attribute('data-kind')=='story';page.locator('[data-modal=close]').tap();page.wait_for_timeout(420)
            page.locator('#map-button').tap();page.wait_for_timeout(420)
            assert '現在位置：1 : 1' in page.locator('#dialog-content').inner_text()
            page.locator('[data-modal=close]').tap();page.wait_for_timeout(420)
            page.goto(url+'?visit=1');page.locator('#continue').tap();page.wait_for_timeout(420)
            before=page.evaluate("localStorage.getItem('suito-save-v1')")
            page.locator('#return').tap();page.wait_for_timeout(420);expect(page.locator('[data-modal=close]')).to_be_focused()
            page.go_back();page.locator('#continue').tap();page.wait_for_timeout(420)
            assert page.evaluate("localStorage.getItem('suito-save-v1')")==before
            page.locator('#return').tap();page.wait_for_timeout(420);page.locator('[data-modal=return]').tap();page.wait_for_timeout(420)
            for sel in ['#scene-tag','#coordinates','#map-button','.expedition','#enemy-hud']:expect(page.locator(sel)).to_be_hidden()
            page.locator('[data-modal=title]').tap();page.wait_for_timeout(420)
            for sel in ['#coordinates','#map-button','.expedition','#enemy-hud']:expect(page.locator(sel)).to_be_hidden()
            print(f'PASS {width}x{height}: coordinates only in map, title/result HUD hidden, browser-back cancels pending return without changing save',flush=True)
            page.close()
        browser.close()
finally:
    server.shutdown();server.server_close()
