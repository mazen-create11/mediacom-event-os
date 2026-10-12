import asyncio
from playwright.async_api import async_playwright
O="t21"
async def main():
    async with async_playwright() as p:
        # WebKit = moteur de Safari (iPad / iPhone)
        b = await p.webkit.launch(executable_path="/Users/chabanmazen/Library/Caches/ms-playwright/webkit-2365/pw_run.sh")
        pg = await (await b.new_context(viewport={"width":1600,"height":800})).new_page()
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        import subprocess
        subprocess.call(['curl','-s','-o','/dev/null','-X','PUT','localhost:3100/api/wall','-H','Content-Type: application/json','-d','{"scene":"reel"}'])
        await pg.goto("http://localhost:3100/mur"); await pg.wait_for_timeout(4500)
        st = await pg.evaluate("""() => { const v=[...document.querySelectorAll('#w-reel video')]; const on=document.querySelector('#w-reel .s.on video'); return {n:v.length, playing: on ? !on.paused && on.currentTime>0 : null, t: on?.currentTime, ready: on?.readyState, cap: document.querySelector('#w-reel-t').textContent}; }""")
        await pg.screenshot(path=f"{O}/wall-video.png")
        print('mur (WebKit):', st)
        subprocess.call(['curl','-s','-o','/dev/null','-X','PUT','localhost:3100/api/wall','-H','Content-Type: application/json','-d','{"scene":"cloud"}'])
        print(errs[:4] or 'no errors')
        await b.close()
asyncio.run(main())
