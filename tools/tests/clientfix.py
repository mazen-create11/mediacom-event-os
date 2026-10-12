import asyncio, json, subprocess
from playwright.async_api import async_playwright
EXE="/Users/chabanmazen/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell"
B="http://localhost:3100"; O="t14"
def api(path):
    return json.loads(subprocess.check_output(['curl','-s',B+path]))
async def tablet(b, op, w=1366, h=1024):
    ctx = await b.new_context(viewport={"width":w,"height":h}); pg = await ctx.new_page(); errs=[]
    pg.on("pageerror", lambda e: errs.append(f"[{op}] {e}")); pg.on("console", lambda m: errs.append(f"[{op}] {m.text}") if m.type=="error" else None)
    await pg.goto(B+"/"); await pg.evaluate(f"localStorage.setItem('mc_op','{op}')"); await pg.reload(); await pg.wait_for_timeout(1500)
    return ctx, pg, errs
async def main():
    r = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE)
        cA, A, eA = await tablet(b, 'mazen')
        cB, B2, eB = await tablet(b, 'coraline', 1180, 820)   # tiroir (iPad Air) ? 1180 > 900 -> côte à côte
        cC, C, eC = await tablet(b, 'nolan', 820, 1180)       # portrait -> tiroir
        # 5. double appui sur Enregistrer
        before = len(api('/api/state')['leads'])
        await A.click('#go'); await A.wait_for_timeout(500)
        await A.fill('#f-name', 'Double Appui'); await A.fill('#f-company', 'Test SA')
        await A.evaluate("() => { const b=document.querySelector('#cap-save'); b.click(); b.click(); b.click(); }")
        await A.wait_for_timeout(1200)
        r['double_appui_nouveaux'] = len(api('/api/state')['leads']) - before
        # 4. saisie en cours sur C (portrait) pendant qu'A supprime un autre contact
        await C.click('#go'); await C.wait_for_timeout(500); await C.fill('#f-name', 'Saisie en cours')
        lid = [l for l in api('/api/state')['leads'] if l['name']=='Double Appui'][0]['id']
        await A.evaluate(f"location.hash='contacts'"); await A.wait_for_timeout(700)
        await A.click(f'#v-contacts .lead-row[data-lead="{lid}"]'); await A.wait_for_timeout(400)
        await A.click('[data-act="delete"]'); await A.wait_for_timeout(300); await A.click('#sheet [data-ok]'); await A.wait_for_timeout(1200)
        r['saisie_C_toujours_ouverte'] = await C.evaluate("document.querySelector('#drawer').classList.contains('is-open') && document.querySelector('#f-name').value")
        # scrim sur saisie commencée -> confirmation
        await C.click('#scrim', position={"x":40,"y":600}); await C.wait_for_timeout(400)
        r['confirmation_abandon'] = await C.evaluate("document.querySelector('#sheet').open")
        await C.click('#sheet [data-close]'); await C.wait_for_timeout(300)
        r['saisie_gardee_apres_annuler'] = await C.evaluate("document.querySelector('#f-name')?.value")
        # transfert vers C pendant la saisie : la saisie n'est pas remplacée
        await A.evaluate("location.hash='contacts'")
        await A.click('#go'); await A.fill('#f-name', 'Pour Nolan'); await A.click('#cap-save'); await A.wait_for_timeout(800)
        nid = [l for l in api('/api/state')['leads'] if l['name']=='Pour Nolan'][0]['id']
        await A.click(f'#v-contacts .lead-row[data-lead="{nid}"]'); await A.wait_for_timeout(300)
        await A.click('[data-act="transfer"]'); await A.click('[data-to="nolan"]'); await A.click('[data-go]'); await A.wait_for_timeout(1200)
        await C.click('.toast.transfer >> text=Ouvrir la fiche'); await C.wait_for_timeout(800)
        r['saisie_C_intacte_apres_toast'] = await C.evaluate("document.querySelector('#f-name')?.value")
        await C.screenshot(path=f"{O}/c-saisie-protegee.png")
        # 6. fiche en tiroir mise à jour en direct (C ouvre la fiche, A la passe en Chaud)
        await C.evaluate("document.querySelector('#f-name').value=''"); 
        await C.evaluate("import('/js/ui.js').then(m=>m.closeDrawer({force:true}))"); await C.wait_for_timeout(500)
        await C.evaluate("location.hash='contacts'"); await C.wait_for_timeout(600)
        await C.click(f'#v-contacts .lead-row[data-lead="{nid}"]'); await C.wait_for_timeout(600)
        await A.click('#ct-detail [data-act="temp"][data-t="hot"]'); await A.wait_for_timeout(1000)
        r['tiroir_C_a_jour'] = await C.evaluate("document.querySelector('#drawer [data-act=temp][data-t=hot]')?.getAttribute('aria-pressed')")
        # 2 + hors ligne : B coupe le réseau, modifie, A transmet entre-temps, B revient
        await cB.set_offline(True); await B2.wait_for_timeout(500)
        await B2.evaluate(f"location.hash='contacts'"); await B2.wait_for_timeout(500)
        await B2.click(f'#v-contacts .lead-row[data-lead="{nid}"]'); await B2.wait_for_timeout(300)
        await B2.click('#ct-detail [data-act="temp"][data-t="cold"]'); await B2.wait_for_timeout(300)
        r['file_attente_B'] = await B2.evaluate("document.querySelector('#hub-led').textContent")
        await A.click('#ct-detail [data-act="transfer"]'); await A.click('[data-to="eric"]'); await A.click('[data-go]'); await A.wait_for_timeout(800)
        await cB.set_offline(False); await B2.wait_for_timeout(9000)
        l = [l for l in api('/api/state')['leads'] if l['id']==nid][0]
        r['apres_reconnexion'] = {'operator': l['operator'], 'temperature': l['temperature'], 'transferts': len([h for h in l['history'] if h['type']=='transfer'])}
        # nettoyage
        subprocess.call(['curl','-s','-o','/dev/null','-X','DELETE',f'{B}/api/leads/{nid}'])
        print(json.dumps(r, ensure_ascii=False, indent=1)); print((eA+eB+eC)[:8] or 'no errors')
        await b.close()
asyncio.run(main())
