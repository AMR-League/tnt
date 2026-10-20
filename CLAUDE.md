# CLAUDE.md — TNT website

Public website for American Motor Racing's **Thursday Night Thunder** iRacing league: `https://amr-league.github.io/TNT/` (GitHub Pages, main / root). It only **reads** data. Points are run in the league's Google Sheet by League Tools (repo `AMR-League/league-tools`), which serves a JSON feed from its web app.

## Working with Marty (owner)
- Ask clarifying questions before building non-trivial changes; for visual changes, mock up first when the direction is unclear.
- Successors are likely **not technical**. The only file they should ever need to edit is `config.json` (data link, archived seasons, colors). Keep it that way and keep `README.md` current.
- Site versions are git tags (`v1.0` … ); bump `SITE_VERSION` in `app.js` each release (shown in the footer).

## Rules
- **Plain HTML/CSS/JS, no build step, no frameworks, no npm dependencies at runtime.** The repo files are the site.
- Data comes from `config.json` → `liveDataUrl` (League Tools `/exec`), or `seasons/<file>.json` for archived seasons (`?season=<id>`). Format: League Tools `docs/Web_Data_Contract.md` (schema v1). The site refuses unknown `schemaVersion`s with a message.
- No points math in the site. It shows what the feed says.
- **Cust IDs are only used in links (`#/driver/<custId>`), never displayed.** `custId: null` (inactive = left/removed drivers, guests) means no driver link.
- Everything a visitor sees must be escaped (`esc()`); the feed is data, not HTML.
- Pages use hash routes: `#/`, `#/standings[/chase|season|teams]`, `#/schedule`, `#/race/<n>`, `#/drivers`, `#/driver/<custId>`, `#/roster[/teams]`.
- The visitor's browser keeps the last data per season in localStorage and shows it instantly, then refreshes. Wrap all storage in try/catch.
- CSV exports are built client-side from the loaded data (standings tab, all driver stats, per-driver stats + race-by-race, race results).

## Look
- Layout: "Race Program" (logo header, home = next race + standings + last race + teams; desktop two columns, phone single column with bottom tab bar).
- Style: "Pit Wall" timing-screen look in AMR colors. **Dark is the default**; a header toggle switches to light and is remembered (`localStorage tnt-theme`; set before paint in `index.html`). Colors are CSS variables in `styles.css` (`:root` dark, `:root[data-theme="light"]`). The navy header + red rule stay the same in both themes.
- Fonts: Barlow / Barlow Condensed (headings, uppercase) / IBM Plex Mono (numbers), from Google Fonts.
- `config.json` `colors.primary` → `--navy`, `colors.accent` → `--red`.
- Must work on **both desktop and phone**: no sideways page scroll at 390px wide; wide tables hide secondary columns on phones (`.d-only`) and sit in `.table-scroll`.
- Accessibility: real links/buttons, visible focus, aria-labels on icon buttons, readable contrast in both themes.

## Testing (before every release)
- `tests/`: serve a copy of the site with `config.json` pointed at the sample data (`live.json` = Chase live, `projected.json`, `off.json`; archived-season entries for the picker), then run `shoot.py` (every page × season × phone/desktop: errors, sideways scroll, screenshots), `light.py` (theme toggle) and `csvtest.py` (exports). Look at the screenshots.
- Regenerate sample data with League Tools `tests/gen.js` whenever the contract changes.

## Seasons and handoff
- Finished seasons are archived as `seasons/<slug>.json` (League Tools → Website → Download Season Archive…) and listed in `config.json` → `archivedSeasons` (newest first), so history never depends on an old sheet.
- A new season's sheet has a new `/exec` link → update `liveDataUrl`.
- A second series gets its own repo copied from this one with its own `config.json`, logo and colors.
