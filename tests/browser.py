"""Run after npm run build and python -m http.server 4173 --directory dist.
Uses environment-installed Playwright, never a production dependency.
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('GAME_URL','http://127.0.0.1:4173')
OUT=Path('artifacts');OUT.mkdir(exist_ok=True)
KEY='suito-save-v1'
results=[]
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  try:
   browser=getattr(p,engine).launch(**({'executable_path':'/usr/bin/chromium','args':['--no-sandbox']} if engine=='chromium' else {}))
  except Exception as e:
   results.append({'engine':engine,'status':'unavailable','reason':str(e)[:400]});continue
  for width,height in [(320,568),(375,667),(390,844),(430,932),(844,390),(1280,800)]:
   ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=True,device_scale_factor=1)
   page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(BASE);page.locator('#start').tap();page.locator('[data-modal=companion-ao]').tap();page.wait_for_timeout(420)
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(engine,width,'horizontal overflow')
   for selector in ['#sound','#help','#potion','#return','[data-action="forward"]','[data-action="left"]','[data-action="right"]','[data-action="back"]']:
    box=page.locator(selector).bounding_box();assert box['width']>=44 and box['height']>=44,(engine,width,selector,box)
   state=lambda:page.evaluate(f'JSON.parse(localStorage.getItem("{KEY}"))')
   before=state();page.locator('[data-action="forward"]').tap();page.wait_for_timeout(420);after=state();assert after['steps']==before['steps']+1
   page.locator('[data-action="left"]').tap();page.wait_for_timeout(420);assert state()['dir']==(after['dir']+3)%4
   page.locator('#map-button').tap();assert page.locator('#large-map').is_visible();page.locator('[data-modal="close"]').tap()
   snap=state();page.reload();assert page.locator('#continue').is_visible();page.locator('#continue').tap();assert state()==snap
   page.locator('#sound').tap();assert page.locator('#sound').get_attribute('aria-pressed')=='true'
   page.locator('#sound').tap();assert page.locator('#sound').get_attribute('aria-pressed')=='false'
   page.locator('#help').tap();assert '小さな探索' in page.locator('#dialog-title').inner_text();page.locator('[data-modal="close"]').tap()
   page.screenshot(path=str(OUT/f'{engine}-{width}x{height}.png'),full_page=True)
   assert not errors,errors
   results.append({'engine':engine,'size':[width,height],'status':'passed','checks':['touch target >=44px','no horizontal overflow','move/turn','map','save/resume','sound','help','no JS errors']})
   ctx.close()
  ctx=browser.new_context(viewport={'width':390,'height':844},has_touch=True);page=ctx.new_page();page.goto(BASE)
  def fixture(patch):
   page.goto(BASE)  # Leave the prior run before setting the next save fixture.
   page.evaluate('''async patch=>{const {fresh}=await import('./src/game.js');const s=fresh(17,{legacy:true});Object.assign(s,patch);localStorage.setItem('suito-save-v1',JSON.stringify(s));}''',patch)
   page.reload();page.locator('#continue').tap();page.wait_for_timeout(420)
  fixture({'phase':'battle','hp':60,'enemy':{'name':'苔角の獣','hp':25,'maxHp':25,'turn':2,'boss':False}})
  page.locator('[data-action="guard"]').tap();page.wait_for_timeout(420)
  assert json.loads(page.evaluate(f'localStorage.getItem("{KEY}")'))['hp']>=57
  page.locator('[data-action="skill"]').tap();page.wait_for_timeout(420)
  if page.locator('#battle-controls').is_visible():page.locator('[data-action="attack"]').tap();page.wait_for_timeout(420)
  expect(page.locator('#explore-controls')).to_be_visible(timeout=1500)
  fixture({'phase':'battle','enemy':{'name':'星樹の守り手','hp':1,'maxHp':65,'turn':0,'boss':True},'floor':3})
  assert page.locator('#flee').is_disabled();page.screenshot(path=str(OUT/f'{engine}-battle.png'))
  page.locator('[data-action="attack"]').tap();page.wait_for_timeout(420);assert '星の種を手に入れた' in page.locator('#dialog-title').inner_text();page.locator('[data-modal="close"]').tap();page.locator('#return').tap();page.locator('[data-modal="return"]').tap();assert '星を' in page.locator('#dialog-title').inner_text()
  page.screenshot(path=str(OUT/f'{engine}-victory.png'));page.locator('[data-modal="retry"]').tap();page.locator('[data-modal=companion-ao]').tap();assert '第1層' in page.locator('#floor-label').inner_text()
  fixture({'phase':'battle','hp':1,'enemy':{'name':'苔角の獣','hp':100,'maxHp':100,'turn':2,'boss':False}})
  page.locator('[data-action="attack"]').tap();assert '灯りは' in page.locator('#dialog-title').inner_text();page.locator('[data-modal="retry"]').tap();page.locator('[data-modal=companion-ao]').tap()
  fixture({'phase':'stairs'});page.locator('[data-modal="descend"]').tap();assert '第2層' in page.locator('#floor-label').inner_text()
  page.locator('#return').tap();page.locator('[data-modal="return"]').tap();assert '生きて帰る' in page.locator('#dialog-title').inner_text()
  page.locator('[data-modal="title"]').tap();assert page.locator('#intro').is_visible()
  page.evaluate(f'localStorage.setItem("{KEY}","broken")');page.reload();assert not page.locator('#continue').is_visible();page.locator('#start').tap();page.locator('[data-modal=companion-ao]').tap();assert page.locator('#play').is_visible()
  results.append({'engine':engine,'status':'passed','checks':['guard/skill/battle win','boss no flee','victory/return','defeat','retry','descend','early extraction','title','corrupt save recovery']})
  fixture({'relic':True,'floor':3})
  assert '星の種を手に入れた' in page.locator('#dialog-title').inner_text()
  page.locator('[data-modal="close"]').tap();assert page.locator('#mission-return').is_visible()
  page.locator('[data-action="right"]').tap();page.wait_for_timeout(420);assert '入手済み' in page.locator('#objective').inner_text()
  fixture({})
  initial=page.evaluate(f'JSON.parse(localStorage.getItem("{KEY}"))')
  page.evaluate("()=>{const b=document.querySelector('[data-action=forward]');b.click();b.click();b.click()}")
  assert page.evaluate(f'JSON.parse(localStorage.getItem("{KEY}")).steps')==initial['steps']+1
  assert page.locator('#scene').get_attribute('data-moving')=='true'
  page.wait_for_timeout(420);assert page.locator('#scene').get_attribute('data-moving')=='false'
  page.emulate_media(reduced_motion='reduce');page.locator('[data-action="right"]').tap()
  assert page.locator('#scene').get_attribute('data-moving')=='false'
  page.reload();page.locator('#continue').tap();assert page.locator('#scene').get_attribute('data-moving')=='false'
  lighting=page.evaluate("""async()=>{const {fresh}=await import('./src/game.js');const {drawScene}=await import('./src/render.js');const s=fresh(1,{legacy:true}),canvas=document.createElement('canvas');canvas.width=840;canvas.height=640;return [100,50,0].map(light=>{s.light=light;drawScene(canvas,s,0);const pixels=canvas.getContext('2d').getImageData(0,0,840,640).data;let sum=0;for(let i=0;i<pixels.length;i+=4)sum+=pixels[i]+pixels[i+1]+pixels[i+2];return sum/(840*640*3);});}""")
  assert lighting[0]>lighting[1]>lighting[2]>5,lighting
  results.append({'engine':engine,'status':'passed','checks':['fixture: acquired legacy save notice + persistent objective','burst inputs consume one step','180ms animation completes','reduced motion and reload skip motion','canvas brightness decreases without blackout'],'brightness':lighting})
  ctx.close()
  # Denied storage must leave the game playable and report that progress is not persisted.
  ctx=browser.new_context();ctx.add_init_script("Storage.prototype.setItem=function(){throw new DOMException('Blocked','SecurityError')}")
  page=ctx.new_page();page.goto(BASE);page.locator('#start').click();page.locator('[data-modal=companion-ao]').click();assert '保存不可' in page.locator('#save-status').inner_text();ctx.close()
  results.append({'engine':engine,'status':'passed','checks':['storage failure warning / game remains usable']});browser.close()
Path('artifacts/browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False,indent=2))
