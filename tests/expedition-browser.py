"""Full new run via UI only. Routing reads the saved map (omniscient automation);
no seed, HP, inventory, enemy or save-state injection. Not blind human play.
"""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from collections import deque
import os
from playwright.sync_api import sync_playwright
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory='dist'));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':390,'height':844},has_touch=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}');page.locator('#sound').tap();page.locator('#start').tap();page.wait_for_timeout(420);page.locator(f'[data-modal=companion-{os.environ.get("COMPANION","ao")}]').tap();page.wait_for_timeout(420)
  state=lambda:page.evaluate("JSON.parse(localStorage.getItem('suito-save-v1'))")
  def press(selector):page.locator(selector).tap();page.wait_for_timeout(420)
  last_floor=0
  dirs=[(0,-1),(1,0),(0,1),(-1,0)];actions=0;resumed=False
  for _ in range(1100):
   s=state()
   if s['floor']!=last_floor:last_floor=s['floor'];print(f'UI floor {last_floor}, HP {s["hp"]}, steps {s["steps"]}',flush=True)
   assert s['phase']!='dead',f'Run died: seed={s["seed"]},floor={s["floor"]},hp={s["hp"]}'
   if s['phase']=='won':break
   if page.locator('#dialog').is_visible():
    if s['pendingReward']:
     if page.locator('#reward-skip').is_visible():press('#reward-skip')
     press('[data-modal=reward-close]')
    elif s['relic']:press('[data-modal=return]')
    elif s['phase']=='stairs':press('[data-modal=descend]')
    else:raise AssertionError('Unexpected dialog')
    continue
   if not resumed and s['steps']>=5:
    saved=s;page.reload();press('#continue');assert state()==saved;resumed=True;continue
   if s['phase']=='explore' and s['floor'] in [4,8] and s['floor'] not in s['rested'] and s['x']==1 and s['y']==1:
    press('#rest');continue
   if s['phase']=='battle':
    a='potion' if s['hp']<=40 and s['potions'] else 'guard' if s['enemy']['turn']%3==(1 if s['enemy'].get('pattern')==1 else 2) else 'skill' if s['focus']>=3 else 'attack'
   elif s['relic']:
    press('#mission-return');press('[data-modal=return]');continue
   else:
    target=tuple(s['map']['exit']);queue=deque([(s['x'],s['y'],[])]);seen={(s['x'],s['y'])};route=None
    while queue:
     x,y,path=queue.popleft()
     if (x,y)==target:route=path;break
     for d,(dx,dy) in enumerate(dirs):
      nx,ny=x+dx,y+dy
      if 0<=nx<11 and 0<=ny<11 and s['map']['grid'][ny][nx]==0 and (nx,ny) not in seen:seen.add((nx,ny));queue.append((nx,ny,path+[d]))
    assert route
    delta=(route[0]-s['dir'])%4;a='forward' if delta==0 else 'left' if delta==3 else 'right'
   press(f'[data-action="{a}"]');actions+=1
  s=state();assert s['phase']=='won' and s['relic'] and resumed
  assert s['floor']==10 and s['rested']==[4,8] and not errors
  assert '灯を、育てよう。' in page.locator('#dialog-title').inner_text()
  print(f'PASS UI full run (map-guided, no state injection): seed={s["seed"]}, companion={s['companion']}, rested={s['rested']}, steps={s["steps"]}, kills={s["kills"]}, chests={len(s["rewards"])}, gold={s["gold"]}, hp={s["hp"]}, actions={actions}, reload/resume, boss and return victory',flush=True)
  b.close()
finally:server.shutdown();server.server_close()
