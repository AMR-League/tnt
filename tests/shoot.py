import asyncio, json, sys
from playwright.async_api import async_playwright
BASE='http://127.0.0.1:8765/'
pages=['#/','#/standings','#/standings/season','#/standings/teams','#/schedule','#/race/1','#/race/12','#/race/14','#/drivers','#/driver/2000','#/driver/2019','#/roster','#/roster/teams']
async def main():
    errs=[]
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for label,vp,mobile in [('desk',{'width':1366,'height':900},False),('mob',{'width':390,'height':844},True)]:
            ctx=await b.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile, device_scale_factor=1)
            pg=await ctx.new_page()
            pg.on('console', lambda m: errs.append(f'{label} console {m.type}: {m.text}') if m.type in ('error','warning') else None)
            pg.on('pageerror', lambda e: errs.append(f'{label} pageerror: {e}'))
            for season in ['', '?season=2026-summer', '?season=offseason']:
                for h in pages:
                    await pg.goto(BASE+season+h); await pg.wait_for_timeout(250)
                    txt=await pg.inner_text('main')
                    if 'went wrong' in txt or "Couldn't" in txt: errs.append(f'{label}{season}{h}: {txt[:120]}')
                    sw=await pg.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
                    if sw: errs.append(f'{label}{season}{h}: horizontal page scroll')
            for name,h in [('home','#/'),('standings','#/standings'),('race','#/race/12'),('driver','#/driver/2000'),('schedule','#/schedule')]:
                await pg.goto(BASE+h); await pg.wait_for_timeout(300)
                await pg.screenshot(path=f'shot_{label}_{name}.png', full_page=(label=='desk'))
            await ctx.close()
        await b.close()
    print('\n'.join(errs) if errs else 'NO ERRORS')
asyncio.run(main())
