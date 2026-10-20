import asyncio, csv, io
from playwright.async_api import async_playwright
B='http://127.0.0.1:8765/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for label,vp in [('desk',{'width':1366,'height':900}),('mob',{'width':390,'height':844})]:
            ctx=await b.new_context(viewport=vp, accept_downloads=True); pg=await ctx.new_page()
            errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
            for h,sel in [('#/standings','[data-export="standings-chase"]'),('#/standings/season','[data-export="standings-season"]'),
                          ('#/standings/teams','[data-export="standings-teams"]'),('#/drivers','[data-export="stats-all"]'),
                          ('#/driver/2000','[data-export^="driver-stats"]'),('#/driver/2000','[data-export^="driver-races"]'),('#/race/12','[data-export="race:12"]')]:
                await pg.goto(B+h); await pg.wait_for_timeout(250)
                async with pg.expect_download() as dl:
                    await pg.click(sel)
                d=await dl.value
                txt=open(await d.path(),encoding='utf-8-sig').read()
                rows=list(csv.reader(io.StringIO(txt)))
                if label=='desk': print(f'{d.suggested_filename:55s} {len(rows)-1:3d} rows | {rows[0][:6]} | {rows[1][:6]}')
            if label=='desk':
                await pg.goto(B+'#/drivers'); await pg.wait_for_timeout(200); await pg.screenshot(path='csv_desk_drivers.png')
                await pg.goto(B+'#/driver/2000'); await pg.wait_for_timeout(200); await pg.screenshot(path='csv_desk_driver.png')
            else:
                await pg.goto(B+'#/drivers'); await pg.wait_for_timeout(200); await pg.screenshot(path='csv_mob_drivers.png')
                await pg.goto(B+'#/driver/2000'); await pg.wait_for_timeout(200); await pg.screenshot(path='csv_mob_driver.png')
                await pg.goto(B+'#/standings'); await pg.wait_for_timeout(200); await pg.screenshot(path='csv_mob_standings.png')
            print(label,'page errors:',errs or 'none')
            await ctx.close()
        await b.close()
asyncio.run(main())
