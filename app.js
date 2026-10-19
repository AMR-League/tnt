/* Thursday Night Thunder — league site.
 *
 * Plain JavaScript, no build step. Everything the site shows comes from:
 *   - config.json        → branding, the live data link and the list of archived seasons
 *   - the live data link  → League Tools web app (Google Sheet), see Web_Data_Contract_v1.md
 *   - seasons/*.json      → archived seasons (same format)
 * Pages use #/ links (e.g. #/standings), so they work on GitHub Pages without any server setup.
 */
(function () {
  'use strict';

  const SITE_VERSION = 'v1.0';
  const SUPPORTED_SCHEMA = 1;
  let CFG = null;         // config.json
  let DATA = null;        // season data (contract v1)
  let SEASON = 'live';    // 'live' or an archived season id
  let STALE = false;      // showing a saved copy because the live fetch failed

  // ------------------------------------------------------------------ helpers
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n = (v) => (v == null || v === '' ? '—' : esc(v));
  const plural = (k, word) => `${k} ${word}${k === 1 ? '' : 's'}`;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const LONG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function parseDay(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }
  function shortDate(s) { const d = parseDay(s); return d ? `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}` : (s ? esc(s) : 'TBD'); }
  function longDate(s) { const d = parseDay(s); return d ? `${LONG_DAYS[d.getDay()]}, ${LONG_MONTHS[d.getMonth()]} ${d.getDate()}` : (s ? esc(s) : 'Date TBD'); }
  function stamp(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  const carTag = (car) => (car ? `<span class="car">#${esc(car)}</span>` : '');
  const driverLink = (name, id) => (id ? `<a href="#/driver/${encodeURIComponent(id)}">${esc(name)}</a>` : esc(name));
  const raceLabel = (no) => `R${String(no).padStart(2, '0')}`;
  const gainCell = (g) => (g == null ? '<span class="muted">—</span>'
    : g > 0 ? `<span class="gain-up">▲${g}</span>` : g < 0 ? `<span class="gain-down">▼${-g}</span>` : '<span class="muted">0</span>');
  const behind = (b) => (b ? `−${b}` : '<span class="muted">Leader</span>');

  // ------------------------------------------------------------------ loading
  function cacheKey() { return 'tnt-season:' + SEASON; }
  function readCache(url) {
    try {
      const c = JSON.parse(localStorage.getItem(cacheKey()) || 'null');
      return c && c.url === url ? c.data : null;
    } catch (e) { return null; }
  }
  function writeCache(url, data) {
    try { localStorage.setItem(cacheKey(), JSON.stringify({ url, data })); } catch (e) { /* storage full or blocked: fine */ }
  }

  async function boot() {
    try {
      CFG = await fetch('config.json', { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error('config.json ' + r.status); return r.json(); });
    } catch (e) {
      $('#main').innerHTML = `<p class="notice">The site settings (config.json) couldn't be loaded. ${esc(e.message)}</p>`;
      return;
    }
    applyBranding();
    const wanted = new URLSearchParams(location.search).get('season');
    const archived = (CFG.archivedSeasons || []).find((s) => s.id === wanted);
    SEASON = archived ? archived.id : 'live';
    buildSeasonPicker();
    const url = archived ? archived.file : CFG.liveDataUrl;
    if (!url) { $('#main').innerHTML = '<p class="notice">No data link is set in config.json yet.</p>'; return; }

    const cached = readCache(url);
    if (cached) { DATA = cached; render(); }
    try {
      const fresh = await fetch(url, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
      if (fresh.error) throw new Error(fresh.error);
      if (fresh.schemaVersion !== SUPPORTED_SCHEMA) throw new Error(`data format v${fresh.schemaVersion} needs a site update`);
      STALE = false;
      if (!DATA || fresh.updatedAt !== DATA.updatedAt || fresh.scriptVersion !== DATA.scriptVersion) {
        DATA = fresh;
        writeCache(url, fresh);
        render();
      } else {
        renderFooter();
      }
    } catch (e) {
      if (DATA) { STALE = true; render(); return; }
      $('#main').innerHTML = `<p class="notice">Couldn't load the season data right now (${esc(e.message)}). Please try again in a minute.</p>`;
    }
  }

  function applyBranding() {
    const root = document.documentElement.style;
    if (CFG.colors && CFG.colors.primary) root.setProperty('--navy', CFG.colors.primary);
    if (CFG.colors && CFG.colors.accent) root.setProperty('--red', CFG.colors.accent);
    if (CFG.logo) { $('#logo').src = CFG.logo; document.querySelector('link[rel=icon]').href = CFG.logo; }
    if (CFG.siteTitle) $('#logo').alt = CFG.siteTitle;
  }

  function buildSeasonPicker() {
    const sel = $('#season-select');
    const list = [{ id: 'live', label: CFG.liveSeasonLabel || 'Current season' }].concat(CFG.archivedSeasons || []);
    sel.innerHTML = list.map((s) => `<option value="${esc(s.id)}"${s.id === SEASON ? ' selected' : ''}>${esc(s.label)}</option>`).join('');
    sel.parentElement.style.display = list.length > 1 ? '' : 'none';
    sel.addEventListener('change', () => {
      const p = new URLSearchParams(location.search);
      if (sel.value === 'live') p.delete('season'); else p.set('season', sel.value);
      const q = p.toString();
      location.href = location.pathname + (q ? '?' + q : '') + '#/';
    });
  }

  // ------------------------------------------------------------------ routing
  function route() {
    const path = location.hash.replace(/^#\/?/, '').split('?')[0];
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    return { page: parts[0] || 'home', id: parts[1] || null };
  }
  const NAV_OF = { race: 'schedule', driver: 'drivers' };

  function render() {
    if (!DATA) return;
    const r = route();
    const pages = { home, standings, schedule, race, drivers, driver, roster };
    const fn = pages[r.page] || home;
    let html;
    try { html = fn(r.id); } catch (e) { html = `<p class="notice">Something went wrong showing this page (${esc(e.message)}).</p>`; console.error(e); }
    $('#main').innerHTML = (STALE ? '<div class="banner">Showing the last saved copy — the live standings couldn\'t be reached just now.</div>' : '') + html;
    const navKey = NAV_OF[r.page] || (pages[r.page] ? r.page : 'home');
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const on = a.dataset.nav === navKey;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const name = DATA.season && DATA.season.name;
    if (SEASON === 'live' && name) {
      const opt = $('#season-select').querySelector('option[value="live"]');
      if (opt) opt.textContent = name;
    }
    document.title = [pageTitle(r), CFG.siteTitle || 'Thursday Night Thunder'].filter(Boolean).join(' · ');
    wirePage();
    renderFooter();
  }

  function pageTitle(r) {
    if (r.page === 'race' && r.id) return raceLabel(r.id) + ' results';
    if (r.page === 'driver') { const d = findDriver(r.id); return d ? d.name : 'Driver'; }
    return { standings: 'Standings', schedule: 'Schedule', drivers: 'Drivers', roster: 'Roster' }[r.page] || '';
  }

  function renderFooter() {
    const parts = [];
    if (DATA && DATA.updatedAt) parts.push(`Points updated ${esc(stamp(DATA.updatedAt))}`);
    if (DATA && DATA.scriptVersion) parts.push(`League Tools ${esc(DATA.scriptVersion)}`);
    parts.push(`Site ${SITE_VERSION}`);
    $('#footer').innerHTML = `<span>${esc(CFG.organization || '')}${CFG.organization ? ' · ' : ''}${esc(CFG.siteTitle || '')}</span><span>${parts.join(' · ')}</span>`;
  }

  // Search box on the Drivers page
  function wirePage() {
    const box = $('#driver-search');
    if (!box) return;
    box.addEventListener('input', () => {
      const q = box.value.trim().toLowerCase();
      document.querySelectorAll('.dcard').forEach((c) => { c.style.display = !q || c.dataset.q.includes(q) ? '' : 'none'; });
    });
  }

  // ------------------------------------------------------------------ data lookups
  const S = () => DATA.season || {};
  const chaseStatus = () => (DATA.standings && DATA.standings.chase ? DATA.standings.chase.status : 'off');
  function findDriver(id) {
    const key = Number(id);
    const st = (DATA.standings.drivers || []).find((d) => d.custId === key);
    const stats = (DATA.driverStats || []).find((d) => d.custId === key);
    const ro = (DATA.roster || []).find((d) => d.custId === key);
    const base = st || stats || ro;
    if (!base) return null;
    return { custId: key, name: base.name, team: base.team, car: (ro && ro.car) || base.car, standing: st, stats,
             chase: ((DATA.standings.chase || {}).rows || []).find((c) => c.custId === key) };
  }
  const postedRaces = () => Object.keys(DATA.races || {}).sort((a, b) => Number(a) - Number(b));
  const scheduleRow = (no) => (DATA.schedule || []).find((s) => s.race === String(no));

  // ------------------------------------------------------------------ shared blocks
  function driversTable(rows, opts) {
    const o = Object.assign({ limit: 0, full: true }, opts);
    const list = o.limit ? rows.slice(0, o.limit) : rows;
    const seed = S().chase && S().chase.on;
    return `<div class="table-scroll"><table class="tbl">
      <thead><tr><th class="c">Pos</th><th>#</th><th>Driver</th><th class="d-only">Team</th><th class="r">Pts</th><th class="r">Behind</th>
        ${o.full ? `<th class="c d-only">Wins</th><th class="c d-only">Top 5</th><th class="c d-only">Top 10</th><th class="c d-only">Poles</th>
        <th class="c d-only">Stage</th><th class="c d-only">Bonus</th>${seed ? '<th class="c d-only">Seed</th>' : ''}` : '<th class="c d-only">Wins</th>'}</tr></thead>
      <tbody>${list.map((d) => `<tr class="${d.pos === 1 ? 'lead' : ''}">
        <td class="c pos num">${d.pos}</td><td>${carTag(d.car)}</td>
        <td class="who">${driverLink(d.name, d.custId)}<span class="team-sub">${esc(d.team || '')}</span></td>
        <td class="d-only">${esc(d.team || '')}</td>
        <td class="r pts num">${d.points}</td><td class="r num">${behind(d.behind)}</td>
        ${o.full ? `<td class="c d-only num">${d.wins}</td><td class="c d-only num">${d.top5}</td><td class="c d-only num">${d.top10}</td>
        <td class="c d-only num">${d.poles}</td><td class="c d-only num">${d.stagePts}</td><td class="c d-only num">${d.bonusPts}</td>
        ${seed ? `<td class="c d-only num">${n(d.seed)}</td>` : ''}` : `<td class="c d-only num">${d.wins}</td>`}</tr>`).join('')}</tbody></table></div>`;
  }

  function chaseTable(rows, opts) {
    const o = Object.assign({ limit: 0, compact: false }, opts);
    const list = o.limit ? rows.slice(0, o.limit) : rows;
    const full = !o.compact;
    return `<div class="table-scroll"><table class="tbl">
      <thead><tr><th class="c">Pos</th><th>#</th><th>Driver</th><th class="d-only">Team</th>${full ? `<th class="c d-only">Seed</th>
        <th class="r d-only">Reset</th><th class="r d-only">Chase Pts</th>` : ''}<th class="r">Total</th><th class="r">Behind</th>${full ? '<th class="c d-only">Wins</th>' : ''}</tr></thead>
      <tbody>${list.map((c) => `<tr class="${c.pos === 1 ? 'lead' : ''}">
        <td class="c pos num">${c.pos}</td><td>${carTag(c.car)}</td>
        <td class="who">${driverLink(c.name, c.custId)}<span class="team-sub">${esc(c.team || '')} · Seed ${c.seed}</span></td>
        <td class="d-only">${esc(c.team || '')}</td>${full ? `<td class="c d-only num">${c.seed}</td>
        <td class="r d-only num">${c.resetPts}</td><td class="r d-only num">${c.chasePts}</td>` : ''}
        <td class="r pts num">${c.total}</td><td class="r num">${behind(c.behind)}</td>${full ? `<td class="c d-only num">${c.chaseWins}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
  }

  function teamsTable(rows) {
    return `<div class="table-scroll"><table class="tbl">
      <thead><tr><th class="c">Pos</th><th>Team</th><th class="r">Pts</th><th class="r">Behind</th><th class="c">Wins</th>
        <th class="c d-only">Top 5s</th><th class="c d-only">Races</th></tr></thead>
      <tbody>${rows.map((t) => `<tr class="${t.pos === 1 ? 'lead' : ''}">
        <td class="c pos num">${t.pos}</td><td class="who">${esc(t.team)}</td><td class="r pts num">${t.points}</td>
        <td class="r num">${behind(t.behind)}</td><td class="c num">${t.wins}</td>
        <td class="c d-only num">${t.top5}</td><td class="c d-only num">${t.races}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function teamBars(rows, limit) {
    const top = rows.length ? Math.max(rows[0].points, 1) : 1;
    return `<div class="bars">${rows.slice(0, limit || rows.length).map((t, i) => `<div class="${i === 0 ? 'first' : ''}">
      <div class="bar-top"><span>${esc(t.team)}</span><b class="num">${t.points}</b></div>
      <div class="bar"><span style="width:${Math.max(2, Math.round(Math.max(t.points, 0) / top * 100))}%"></span></div></div>`).join('')}</div>`;
  }

  function nextRaceCard() {
    const s = S();
    const row = s.nextRace ? scheduleRow(s.nextRace) : null;
    if (!row) {
      return `<div class="next"><span class="tag">SEASON COMPLETE</span><h2>${esc(s.name || 'Season')}</h2>
        <div class="when">${plural(s.racesComplete || 0, 'race')} run</div></div>`;
    }
    const seg = row.segment === 'Chase' ? ' · THE CHASE' : row.segment === 'Non-points' ? ' · NON-POINTS' : '';
    const facts = [['Laps', row.laps], ['Stage break', row.stageBreakLap != null ? 'Lap ' + row.stageBreakLap : null],
      ['Tire sets', row.tireSets], ['Car', row.carModel]].filter((f) => f[1] != null);
    return `<div class="next"><span class="tag">NEXT UP · ${raceLabel(row.race)}${seg}</span>
      <h2>${esc(row.track || 'TBD')}</h2><div class="when">${longDate(row.date)}</div>
      ${facts.length ? `<div class="facts">${facts.map((f) => `<div><div class="k">${f[0]}</div><div class="v">${esc(f[1])}</div></div>`).join('')}</div>` : ''}</div>`;
  }

  // ------------------------------------------------------------------ pages
  function home() {
    const s = S(), st = DATA.standings, status = chaseStatus();
    const pct = s.racesScheduled ? Math.round(s.racesComplete / s.racesScheduled * 100) : 0;
    const last = s.lastRace && DATA.races[s.lastRace];
    const chaseLive = status === 'live';
    const mainTitle = chaseLive ? `The Chase · ${s.chase.completed} of ${s.chase.races}` : status === 'projected' ? 'Driver standings · regular season' : 'Driver standings';
    const mainTable = chaseLive ? chaseTable(st.chase.rows, { compact: true }) : driversTable(st.drivers, { limit: 12, full: false });

    let lastCard = '';
    if (last) {
      const top = last.results.slice(0, 5);
      lastCard = `<div class="card"><div class="card-head"><h2>Last race</h2><a href="#/race/${esc(last.race)}">Full results →</a></div>
        <div style="padding-top:6px"><div class="eyebrow">${raceLabel(last.race)} · ${shortDate(last.date)}</div>
        <div style="font-weight:700;font-size:18px;margin:2px 0 8px">${esc(last.track || '')}</div></div>
        <table class="tbl"><tbody>${top.map((r) => `<tr><td class="c pos num">${r.fin}</td><td>${carTag(r.car)}</td>
          <td class="who">${driverLink(r.driver, r.custId)}</td><td class="r num">${r.total != null ? r.total + ' pts' : ''}</td></tr>`).join('')}</tbody></table></div>`;
    }

    return `<div class="page-head"><div><div class="eyebrow">${esc(CFG.organization || '')}</div><h1>${esc(s.name || CFG.siteTitle || '')}</h1>
        <div class="sub">${s.racesComplete} of ${s.racesScheduled} points races complete${s.chase && s.chase.on && s.chase.startRace
          ? ` · ${chaseLive ? 'The Chase is underway' : status === 'projected' ? 'The Chase starts at ' + raceLabel(s.chase.startRace) : 'Chase complete'}` : ''}</div>
        <div class="progress" aria-hidden="true"><span style="width:${pct}%"></span></div></div></div>
      <div class="grid-home">
        <div class="stack">
          ${SEASON === 'live' ? `<div class="show-m">${nextRaceCard()}</div>` : ''}
          <div class="card"><div class="card-head"><h2>${mainTitle}</h2><a href="#/standings">Full standings →</a></div>${mainTable}</div>
        </div>
        <div class="stack">
          ${SEASON === 'live' ? `<div class="show-d">${nextRaceCard()}</div>` : ''}
          ${lastCard}
          <div class="card"><div class="card-head"><h2>Teams</h2><a href="#/standings/teams">Team standings →</a></div>${teamBars(st.teams, 6)}</div>
        </div>
      </div>`;
  }

  function standings(tab) {
    const st = DATA.standings, status = chaseStatus(), s = S();
    const tabs = status === 'live' ? [['chase', 'The Chase'], ['season', 'Full season'], ['teams', 'Teams']]
      : status === 'projected' ? [['season', 'Regular season'], ['chase', 'Chase seeding'], ['teams', 'Teams']]
      : [['season', 'Drivers'], ['teams', 'Teams']];
    const cur = tabs.find((t) => t[0] === tab) ? tab : tabs[0][0];
    let body = '', note = '';
    if (cur === 'chase') {
      body = chaseTable(st.chase.rows);
      note = status === 'live'
        ? `Chase total = reset points + Chase race points${s.drops.driverChase ? `, minus ${plural(s.drops.driverChase, 'drop week')}` : ''}. ${s.chase.completed} of ${s.chase.races} Chase races run.`
        : `Projected seeding: the top ${s.chase.fieldSize} in regular-season points make the Chase, which starts at ${raceLabel(s.chase.startRace)}. Seeds lock after the regular season.`;
    } else if (cur === 'teams') {
      body = teamsTable(st.teams);
    } else {
      body = driversTable(st.drivers);
      const drops = s.drops.driverRegular;
      note = (status === 'live' ? 'Full season: every race, regular season and Chase. ' : '') +
        (drops ? `Points after drop weeks (lowest ${drops} regular-season race${drops === 1 ? '' : 's'}${s.chase.on && s.drops.driverChase ? ` and ${s.drops.driverChase} Chase` : ''} dropped). Stage and bonus columns are season totals before drops.` : '');
    }
    return `<div class="page-head"><div><h1>Standings</h1><div class="sub">${esc(s.name || '')} · after ${plural(s.racesComplete, 'race')}</div></div></div>
      <nav class="seg" aria-label="Standings">${tabs.map((t) => `<a href="#/standings/${t[0]}" class="${t[0] === cur ? 'on' : ''}"${t[0] === cur ? ' aria-current="page"' : ''}>${t[1]}</a>`).join('')}</nav>
      <div class="card">${body}</div>${note ? `<p class="muted" style="font-size:13px;margin-top:10px">${note}</p>` : ''}`;
  }

  function schedule() {
    const s = S(), rows = DATA.schedule || [];
    let lastSeg = null;
    const parts = [];
    let open = false;
    rows.forEach((r) => {
      const seg = r.segment === 'Chase' ? 'The Chase' : 'Regular season';
      if (s.chase.on && r.segment !== 'Non-points' && seg !== lastSeg) {
        if (open) parts.push('</ul>');
        parts.push(`<div class="sched-sec">${seg}</div><ul class="sched">`);
        lastSeg = seg; open = true;
      } else if (!open) { parts.push('<ul class="sched">'); open = true; }
      const isNext = SEASON === 'live' && r.race === s.nextRace;
      const right = r.posted && r.winner
        ? `<span class="muted">Winner</span><b>${esc(r.winner.name)}</b>`
        : isNext ? '<span class="pill">Next</span>' : r.posted ? '<b>Results</b>' : '';
      const meta = [shortDate(r.date), r.carModel ? esc(r.carModel) : '', r.laps ? r.laps + ' laps' : ''].filter(Boolean).join(' · ');
      const inner = `<span class="rno num">${raceLabel(r.race)}</span>
        <span><span class="trk">${esc(r.track || 'TBD')}</span>${r.segment === 'Non-points' ? ' <span class="pill grey">Non-points</span>' : ''}
        <span class="meta" style="display:block">${meta}</span></span><span class="right">${right}</span>`;
      parts.push(`<li class="${isNext ? 'is-next' : ''}">${r.posted ? `<a class="row" href="#/race/${esc(r.race)}">${inner}</a>` : `<div class="row">${inner}</div>`}</li>`);
    });
    if (open) parts.push('</ul>');
    return `<div class="page-head"><div><h1>Schedule</h1><div class="sub">${esc(s.name || '')} · ${s.racesComplete} of ${s.racesScheduled} points races complete</div></div></div>${parts.join('')}`;
  }

  function race(id) {
    const r = DATA.races[id];
    const sch = scheduleRow(id);
    if (!r) {
      if (!sch) return '<p class="notice">That race isn\'t on this season\'s schedule.</p>';
      return `<div class="page-head"><div><div class="eyebrow">${raceLabel(id)} · ${shortDate(sch.date)}</div><h1>${esc(sch.track || 'TBD')}</h1>
        <div class="sub">Results not posted yet.</div></div></div><a href="#/schedule">← Back to the schedule</a>`;
    }
    const posted = postedRaces(), i = posted.indexOf(String(id));
    const prev = posted[i - 1], next = posted[i + 1];
    const sm = r.summary || {};
    const tiles = [];
    const tile = (k, v, cls) => { if (v) tiles.push(`<div class="tile ${cls || ''}"><div class="k">${k}</div><div class="v">${v}</div></div>`); };
    tile('Winner', sm.winner ? `${driverLink(sm.winner.name, sm.winner.custId)} ${sm.winner.car ? `<small>#${esc(sm.winner.car)}</small>` : ''}` : '', 'hl');
    tile('Margin of victory', sm.margin ? esc(sm.margin) : '');
    tile('Pole', sm.pole && sm.pole.length ? esc(sm.pole.join(', ')) : '');
    tile('Stage winner', sm.stageWinner && sm.stageWinner.length ? esc(sm.stageWinner.join(', ')) : '');
    tile('Most laps led', sm.mostLed && sm.mostLed.length ? `${esc(sm.mostLed[0].name)} <small>${sm.mostLed.map((m) => `${esc(m.name)} ${m.laps}`).join(' · ')}</small>` : '');
    tile('Fastest lap', sm.fastestLap ? `${esc(sm.fastestLap.name)} <small>${esc(sm.fastestLap.time)}${sm.fastestLap.lap ? ' · lap ' + sm.fastestLap.lap : ''}</small>` : '');
    tile('Most positions gained', sm.mostGained ? `${esc(sm.mostGained.names.join(', '))} <small>+${sm.mostGained.positions}</small>` : '');
    tile('Laps · starters', `${n(sm.laps)} · ${n(sm.starters)}<small>${sm.running} running at the finish${sm.onLeadLap != null ? ` · ${sm.onLeadLap} on the lead lap` : ''}</small>`);
    const outs = Object.keys(sm.out || {});
    tile('Out of the race', outs.length ? outs.map((k) => `${esc(k)} ${sm.out[k]}`).join(' · ') : '');
    tile('Leaders', sm.driversWhoLed != null ? `${sm.driversWhoLed} drivers led${sm.leadChanges != null ? `<small>${sm.leadChanges} lead changes</small>` : ''}` : '');
    tile('Cautions', sm.cautions != null ? `${sm.cautions}${sm.cautionLaps != null ? ` <small>for ${sm.cautionLaps} laps</small>` : ''}` : '');
    tile('Incidents', sm.incidents ? `${sm.incidents.total} total <small>${sm.incidents.avg} avg · ${plural(sm.incidents.zeroX.length, 'driver')} 0x</small>` : '');

    const rows = r.results.map((x) => `<tr class="${x.fin === 1 ? 'lead' : ''}">
      <td class="c pos num">${x.fin}</td><td>${carTag(x.car)}</td>
      <td class="who">${driverLink(x.driver, x.custId)}<span class="team-sub">${esc(x.team || '')}</span></td>
      <td class="d-only">${esc(x.team || '')}</td><td class="c d-only num">${n(x.start)}</td><td class="c num">${gainCell(x.gain)}</td>
      <td class="c d-only num">${x.laps}</td><td class="c num">${x.led}</td><td class="r d-only num">${n(x.interval)}</td>
      <td class="c num">${n(x.inc)}</td><td class="r d-only num">${n(x.fastLap)}</td><td class="d-only">${n(x.status)}</td>
      <td class="c d-only num">${n(x.stagePos)}</td><td class="c d-only num">${n(x.racePts)}</td><td class="c d-only num">${n(x.stagePts)}</td>
      <td class="c d-only num">${n(x.bonus)}</td><td class="r pts num">${n(x.total)}</td></tr>`).join('');

    return `<div class="race-nav">${prev ? `<a href="#/race/${esc(prev)}">← ${raceLabel(prev)}</a>` : '<span></span>'}
        <a href="#/schedule">Schedule</a>${next ? `<a href="#/race/${esc(next)}">${raceLabel(next)} →</a>` : '<span></span>'}</div>
      <div class="page-head"><div><div class="eyebrow">${raceLabel(r.race)} · ${shortDate(r.date)}${r.segment === 'Chase' ? ' · The Chase' : r.segment === 'Non-points' ? ' · Non-points' : ''}</div>
        <h1>${esc(r.track || '')}</h1>${sch && sch.carModel ? `<div class="sub">${esc(sch.carModel)}</div>` : ''}</div></div>
      <div class="tiles">${tiles.join('')}</div>
      <div class="card"><div class="card-head"><h2>Results</h2></div><div class="table-scroll"><table class="tbl">
        <thead><tr><th class="c">Fin</th><th>#</th><th>Driver</th><th class="d-only">Team</th><th class="c d-only">Start</th><th class="c">+/-</th>
          <th class="c d-only">Laps</th><th class="c">Led</th><th class="r d-only">Interval</th><th class="c">Inc</th><th class="r d-only">Fast lap</th>
          <th class="d-only">Status</th><th class="c d-only">Stage</th><th class="c d-only">Race</th><th class="c d-only">Stage pts</th>
          <th class="c d-only">Bonus</th><th class="r">Pts</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }

  function drivers() {
    const st = DATA.standings.drivers || [];
    const stats = DATA.driverStats || [];
    const byId = {};
    stats.forEach((s) => { byId[s.custId] = s; });
    const list = st.filter((d) => d.custId);
    stats.forEach((s) => { if (s.custId && !list.some((d) => d.custId === s.custId)) list.push({ custId: s.custId, name: s.name, team: s.team, car: s.car }); });
    const cards = list.map((d) => {
      const s = byId[d.custId] || {};
      const line = d.pos ? `P${d.pos} · ${d.points} pts` : 'No points yet';
      const extra = s.starts != null ? ` · ${plural(s.starts, 'start')}${s.wins ? ' · ' + plural(s.wins, 'win') : ''}` : '';
      return `<a class="dcard" href="#/driver/${d.custId}" data-q="${esc([d.name, d.team, d.car].join(' ').toLowerCase())}">
        <span class="no">${esc(d.car || '–')}</span><span><span class="nm">${esc(d.name)}</span><span class="tm" style="display:block">${esc(d.team || '')}</span>
        <span class="st" style="display:block">${line}${extra}</span></span></a>`;
    }).join('');
    return `<div class="page-head"><div><h1>Drivers</h1><div class="sub">${plural(list.length, 'driver')} · in standings order</div></div>
      <input id="driver-search" class="search" type="search" placeholder="Search by name, team or number" aria-label="Search drivers"></div>
      <div class="driver-grid">${cards}</div>`;
  }

  function driver(id) {
    const d = findDriver(id);
    if (!d) return `<p class="notice">That driver isn't in this season's standings.</p><a href="#/drivers">← All drivers</a>`;
    const st = d.standing || {}, s = d.stats || {};
    const chips = [];
    if (st.pos) chips.push(`<span class="chip red">P${st.pos} · ${st.points} pts</span>`);
    if (d.chase) chips.push(`<span class="chip">Chase P${d.chase.pos} · ${d.chase.total}</span>`);
    else if (st.seed) chips.push(`<span class="chip">Proj. seed ${st.seed}</span>`);
    if (st.behind) chips.push(`<span class="chip">${st.behind} behind</span>`);

    const stat = (k, v) => `<div class="stat"><div class="v num">${n(v)}</div><div class="k">${k}</div></div>`;
    const statsHtml = [stat('Starts', s.starts), stat('Wins', s.wins), stat('Top 5', s.top5), stat('Top 10', s.top10), stat('Poles', s.poles),
      stat('Avg start', s.avgStart), stat('Avg finish', s.avgFinish), stat('Best finish', s.bestFinish), stat('Laps led', s.lapsLed),
      stat('Races led', s.racesLed), stat('Stage wins', s.stageWins), stat('Stage top 10s', s.stageTop10s), stat('Incidents', s.incidents),
      stat('Inc / race', s.incPerRace), stat('0x races', s.zeroXRaces), stat('DNFs', s.dnfs)].join('');

    const log = [];
    const chipsHtml = postedRaces().map((no) => {
      const race = DATA.races[no];
      const res = race.results.find((x) => x.custId === d.custId);
      if (res) log.push({ race, res });
      const cls = !res ? 'dns' : res.fin === 1 ? 'win' : res.fin <= 5 ? 't5' : res.fin <= 10 ? 't10' : '';
      return `<a class="fin ${cls}" href="#/race/${esc(no)}" title="${esc(race.track || '')}"><b class="num">${res ? res.fin : '–'}</b><span>${raceLabel(no)}</span></a>`;
    }).join('');
    const logRows = log.slice().reverse().map(({ race, res }) => `<tr><td><a href="#/race/${esc(race.race)}">${raceLabel(race.race)}</a></td>
      <td>${esc(race.track || '')}<span class="team-sub">${shortDate(race.date)}</span></td><td class="d-only">${shortDate(race.date)}</td>
      <td class="c num">${n(res.start)}</td><td class="c pos num">${res.fin}</td><td class="c num">${res.led}</td><td class="c num">${n(res.inc)}</td>
      <td class="d-only">${n(res.status)}</td><td class="r pts num">${n(res.total)}</td></tr>`).join('');

    return `<div class="race-nav"><a href="#/drivers">← All drivers</a><span></span></div>
      <div class="d-hero"><div class="big-no" aria-hidden="true">${esc(d.car || '')}</div>
        <h1>${esc(d.name)}</h1><div class="tm">${esc(d.team || '')}${d.car ? ` · #${esc(d.car)}` : ''}</div>
        <div class="chips">${chips.join('')}</div></div>
      <div class="card"><div class="card-head"><h2>Season stats</h2></div><div class="stat-grid" style="padding-top:8px">${statsHtml}</div></div>
      <div class="card"><div class="card-head"><h2>Finishes by race</h2></div><div class="finishes">${chipsHtml}</div>
        <div class="legend"><span><i style="background:var(--red)"></i>Win</span><span><i style="background:var(--navy)"></i>Top 5</span>
        <span><i style="background:#dfe5f1"></i>Top 10</span><span><i style="border:1px dashed var(--muted)"></i>Didn't race</span></div></div>
      ${logRows ? `<div class="card"><div class="card-head"><h2>Race by race</h2></div><div class="table-scroll"><table class="tbl">
        <thead><tr><th>Race</th><th>Track</th><th class="d-only">Date</th><th class="c">Start</th><th class="c">Fin</th><th class="c">Led</th><th class="c">Inc</th>
        <th class="d-only">Status</th><th class="r">Pts</th></tr></thead><tbody>${logRows}</tbody></table></div></div>` : ''}`;
  }

  function roster(view) {
    const list = DATA.roster || [];
    const byTeam = view === 'teams';
    let body;
    if (byTeam) {
      const teams = {};
      list.forEach((r) => { (teams[r.team || 'No team'] = teams[r.team || 'No team'] || []).push(r); });
      const order = (DATA.standings.teams || []).map((t) => t.team).filter((t) => teams[t]).concat(Object.keys(teams).filter((t) => !(DATA.standings.teams || []).some((x) => x.team === t)));
      body = `<div class="team-grid">${order.map((t) => `<div class="card"><h3>${esc(t)}</h3><ul>${teams[t].map((r) =>
        `<li>${carTag(r.car)}<span class="who">${driverLink(r.name, r.custId)}</span></li>`).join('')}</ul></div>`).join('')}</div>`;
    } else {
      body = `<div class="card"><div class="table-scroll"><table class="tbl"><thead><tr><th>#</th><th>Driver</th><th>Team</th></tr></thead><tbody>
        ${list.map((r) => `<tr><td class="car" style="font-size:18px">${esc(r.car || '—')}</td><td class="who">${driverLink(r.name, r.custId)}</td><td>${esc(r.team || '')}</td></tr>`).join('')}
        </tbody></table></div></div>`;
    }
    return `<div class="page-head"><div><h1>Roster</h1><div class="sub">${plural(list.length, 'active driver')}</div></div></div>
      <nav class="seg" aria-label="Roster view"><a href="#/roster" class="${byTeam ? '' : 'on'}">By number</a><a href="#/roster/teams" class="${byTeam ? 'on' : ''}">By team</a></nav>${body}`;
  }

  // ------------------------------------------------------------------ start
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  boot();
})();
