import asyncio, json, subprocess, os, time, glob
from playwright.async_api import async_playwright
EXE="/Users/chabanmazen/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell"
APP=os.path.expanduser('~/.gemini/antigravity/scratch/mediacom-event-app'); B="http://localhost:3100"
LOG="hub.log"
def state(): return json.loads(subprocess.check_output(['curl','-s',B+'/api/state']))
def restart(corrupt=False):
    pid = subprocess.run(['lsof','-tiTCP:3100','-sTCP:LISTEN'],capture_output=True,text=True).stdout.strip()
    if pid: subprocess.call(['kill', pid]); time.sleep(0.8)
    if corrupt:
        open(f'{APP}/data/db.json','w').write('{"leads":[{"id":"ld-tro')  # coupure pendant l'écriture
        for f in glob.glob(f'{APP}/data/db.bak.json'): os.remove(f)
    subprocess.Popen(['node','server.js'], cwd=APP, env={**os.environ,'PORT':'3100'}, stdout=open(LOG,'a'), stderr=subprocess.STDOUT); time.sleep(1.5)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE)
        pg = await (await b.new_context(viewport={"width":1366,"height":1024})).new_page()
        await pg.goto(B+"/"); await pg.evaluate("localStorage.setItem('mc_op','mazen')"); await pg.reload(); await pg.wait_for_timeout(1500)
        await pg.evaluate("import('/js/views/contacts.js').then(m => m.loadDemo({ hub: window.__hub }))") if False else None
        # 3 contacts saisis depuis la tablette
        for n in ['Alpha Survie', 'Bravo Survie', 'Charlie Survie']:
            await pg.click('#go'); await pg.wait_for_timeout(450); await pg.fill('#f-name', n); await pg.click('#cap-save'); await pg.wait_for_timeout(500)
        before = len([l for l in state()['leads'] if 'Survie' in l['name']])
        await pg.wait_for_timeout(600)
        restart(corrupt=True)
        after_crash = len([l for l in state()['leads'] if 'Survie' in l['name']])
        await pg.wait_for_timeout(9000)  # la tablette se reconnecte et renvoie ce que le hub a perdu
        recovered = len([l for l in state()['leads'] if 'Survie' in l['name']])
        tablet = await pg.evaluate("[...document.querySelectorAll('#v-regie .lead-row .name')].map(e=>e.textContent)")
        print({'avant': before, 'hub_apres_coupure': after_crash, 'hub_apres_reconnexion': recovered, 'tablette_affiche': tablet[:4]})
        print('fichier mis de côté :', [os.path.basename(f) for f in glob.glob(f'{APP}/data/db.illisible-*.json')])
        for l in state()['leads']:
            subprocess.call(['curl','-s','-o','/dev/null','-X','DELETE',f"{B}/api/leads/{l['id']}"])
        await b.close()
asyncio.run(main())
