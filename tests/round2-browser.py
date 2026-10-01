"""Round 2: explicit saved-state fixtures; not an ordinary full playthrough."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright, expect

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory='dist'))
Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':390,'height':844},has_touch=True)
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        url=f'http://127.0.0.1:{server.server_port}'
        def fixture(mode):
            page.goto(url)
            page.evaluate('''async mode=>{
                const {fresh,DIRS,key}=await import('./src/game.js?v=20260930-round2');const s=fresh(3,{legacy:true});
                if(mode==='battle'){s.hp=93;s.phase='battle';s.enemy={name:'苔角の獣',hp:25,maxHp:25,turn:0,boss:false};}
                else{s.hp=86;const [dx,dy]=DIRS[s.dir];s.map.events[key(s.x+dx,s.y+dy)]='spring';}
                localStorage.setItem('suito-save-v1',JSON.stringify(s));
            }''',mode)
            page.reload();page.locator('#continue').tap();page.wait_for_timeout(250)
        fixture('battle')
        expect(page.locator('#battle-potion')).to_have_accessible_name('露の薬、残り3個、体力最大42回復')
        page.locator('#battle-potion').tap();page.wait_for_timeout(250)
        assert page.locator('#message').text_content()=='露の薬による回復：体力が7回復。 敵の反撃：体力に6ダメージ。'
        assert page.locator('#hp-label').inner_text().startswith('94 ')
        before=page.locator('#message').text_content();page.reload();page.locator('#continue').tap()
        assert page.locator('#message').text_content()==before
        page.wait_for_timeout(250);page.locator('[data-action="guard"]').tap()
        assert '気力は満タン（回復なし）' in page.locator('#message').text_content()
        fixture('spring');page.locator('[data-action="forward"]').tap();page.wait_for_timeout(250)
        assert page.locator('#message').text_content()=='清らかな泉。体力が14回復。気力は満タン（回復なし）。'
        assert page.locator('#hp-label').inner_text().startswith('100 ')
        assert not page.locator('#dialog').is_visible()
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
        assert not errors,errors
        print('PASS: UI potion 93→100→94 (gain7/damage6), persisted log, full-focus guard, spring86→100 (gain14), max42 accessible description, no added dialog/JS errors/overflow')
        browser.close()
finally:
    server.shutdown();server.server_close()
