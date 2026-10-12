import sys, asyncio, json
from playwright.async_api import async_playwright
EXE="/Users/chabanmazen/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell"
# usage: cap.py OUTDIR W H url1 [url2...]  ; url may be "url#js:code" to run code before shot ; prints console errors
async def main():
    out, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, args=["--use-gl=angle","--enable-unsafe-swiftshader"])
        ctx = await b.new_context(viewport={"width":w,"height":h}, device_scale_factor=1)
        for i,u in enumerate(sys.argv[4:]):
            js=None; wait=2500
            if "@@" in u: u, js = u.split("@@",1)
            pg = await ctx.new_page()
            errs=[]
            pg.on("console", lambda m: errs.append(m.type+": "+m.text) if m.type in("error","warning") else None)
            pg.on("pageerror", lambda e: errs.append("PAGEERROR: "+str(e)))
            await pg.goto(u, wait_until="load", timeout=30000)
            await pg.wait_for_timeout(wait)
            if js:
                for part in js.split("@@"):
                    if part.startswith("wait="): await pg.wait_for_timeout(int(part[5:])); continue
                    await pg.evaluate(part); await pg.wait_for_timeout(1200)
            name = f"{out}/{i:02d}.png"
            await pg.screenshot(path=name)
            print(name, u, "| errs:", errs[:6])
            await pg.close()
        await b.close()
asyncio.run(main())
