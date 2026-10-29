'use strict';
/* =====================================================================
   DIAMOND TACTICS — UI
   ===================================================================== */
(function () {
  const $ = s => document.querySelector(s);
  const app = $('#app');
  let screen = 'title', hubTab = 'next', busy = false, sheetLocked = false, installEvt = null;
  const newOpts = { club: 'ZHE', innings: 5, diff: 'pro', confirm: false };
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = () => ((C && C.settings.speed === 'fast') ? .55 : 1) * (REDUCED ? .4 : 1);
  const sleep = ms => new Promise(r => setTimeout(r, ms * SPEED()));
  const tween = (ms, fn) => new Promise(res => { const d = Math.max(1, ms * SPEED()), t0 = performance.now(); const f = t => { const k = Math.min(1, (t - t0) / d); fn(k); k < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const SX = p => p[0], SY = p => 400 - p[1];
  const short = p => `${p.first[0]}. ${p.last}`;
  const RLAB = { con: 'CON', pow: 'POW', spd: 'SPD', eye: 'EYE', fld: 'FLD', arm: 'ARM', stu: 'STU', ctl: 'CTL', sta: 'STA' };
  const RDESC = { con: 'Contact: fewer misses, better hits', pow: 'Power: distance on power swings', spd: 'Speed: running and steals', eye: 'Eye: fewer called strikes on the corners', fld: 'Fielding: range to reach balls', arm: 'Arm: throws beat runners', stu: 'Stuff: more misses and weak contact', ctl: 'Control: fewer missed spots and hangers', sta: 'Stamina: pitches before tiring' };
  const ICON_MENU = '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  const ICON_BACK = '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>';

  /* ---------- persistence ---------- */
  function save() { if (!C) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(C)); } catch (e) { toast('Could not save. Browser storage is full or blocked.'); } }
  function load() {
    try { const s = localStorage.getItem(SAVE_KEY); if (!s) return false; const c = JSON.parse(s); if (!c || c.v !== 1 || !c.teams) return false; C = c; G = C.game; indexPlayers(); return true; }
    catch (e) { return false; }
  }
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  let toastT = null;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }

  /* ---------- sound ---------- */
  const SFX = {
    ctx: null, noiseBuf: null,
    init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); const n = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, n, n); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; } catch (e) { this.ctx = null; } },
    noise(dur, f, q, vol, type) { const a = this.ctx, s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime; s.buffer = this.noiseBuf; fl.type = type || 'bandpass'; fl.frequency.value = f; fl.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(fl); fl.connect(g); g.connect(a.destination); s.start(t); s.stop(t + dur + .05); return g; },
    tone(f1, f2, dur, vol, type) { const a = this.ctx, o = a.createOscillator(), g = a.createGain(), t = a.currentTime; o.type = type || 'sine'; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05); },
    play(k) {
      if (!C || !C.settings.sound) return; this.init(); if (!this.ctx) return;
      try {
        if (k === 'crack') { this.noise(.09, 2600, .8, .9, 'highpass'); this.tone(900, 300, .05, .25, 'triangle'); }
        else if (k === 'pop') { this.noise(.07, 700, 1.4, .7); this.tone(160, 70, .08, .3); }
        else if (k === 'thud') this.tone(120, 50, .16, .35);
        else if (k === 'tap') this.tone(660, 520, .05, .08, 'triangle');
        else if (k === 'cheer') { const a = this.ctx, s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime; s.buffer = this.noiseBuf; s.loop = true; fl.type = 'bandpass'; fl.frequency.value = 1100; fl.Q.value = .6; g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(.35, t + .35); g.gain.exponentialRampToValueAtTime(.001, t + 1.9); s.connect(fl); fl.connect(g); g.connect(a.destination); s.start(t); s.stop(t + 2); }
        else if (k === 'organ') { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, f, .16, .12, 'square'), i * 130)); }
      } catch (e) { }
    }
  };
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };

  /* ---------- graphics helpers ---------- */
  function badge(id, size) {
    const t = teamInfo(id), one = t.badge.length === 1;
    return `<svg class="bdg" viewBox="0 0 40 44" width="${size}" height="${Math.round(size * 1.1)}" aria-hidden="true"><path d="M20 2L37 8V22C37 33 29 39 20 42C11 39 3 33 3 22V8Z" fill="${t.c1}" stroke="${t.c2}" stroke-width="2.6"/><text x="20" y="${one ? 31 : 27.5}" text-anchor="middle" font-family="Graduate, Georgia, serif" font-size="${one ? 22 : 14}" fill="${t.c2}">${t.badge}</text></svg>`;
  }
  const starsFor = str => { const n = clamp(Math.round((str - 4.4) * 2.4), 1, 5); return `<span class="stars" aria-label="${n} of 5">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`; };
  const ovrTag = p => { const o = ovr(p); return `<span class="ovr ${o >= 7 ? 'hi' : ''}">${o.toFixed(1)}</span>`; };
  const keyRatings = p => p.kind === 'P' ? `STU ${p.r.stu} · CTL ${p.r.ctl} · STA ${p.r.sta}` : `CON ${p.r.con} · POW ${p.r.pow} · SPD ${p.r.spd}`;
  const handTag = p => p.kind === 'P' ? (p.hand === 'R' ? 'RHP' : 'LHP') : `Bats ${p.hand}`;

  /* =================== TITLE =================== */
  function renderTitle() {
    const saved = hasSave() && (C || load());
    const sub = saved && C ? `${teamInfo(C.club).name} · Season ${C.season}${C.phase === 'season' ? ` · Week ${Math.min(C.week + 1, C.schedule.length)}` : C.phase === 'playoffs' ? ' · Playoffs' : ' · Season over'}` : '';
    app.innerHTML = `<section class="title wrap">
      <div class="art">${titleArt()}</div>
      <h1>Tactical<span>Baseball</span></h1>
      <p class="tag">Swiss league baseball. Every pitch is a decision.</p>
      <div class="menu">
        ${saved ? `<button class="btn primary" id="tContinue">Continue<small>${sub}</small></button>` : ''}
        <button class="btn ${saved ? '' : 'primary'}" id="tNew">New campaign</button>
        <button class="btn" id="tHow">How to play</button>
        <button class="btn ghost" id="tInstall" ${installEvt ? '' : 'hidden'}>Install on this phone</button>
      </div>
      <p class="foot">Fan-made game inspired by the Swiss baseball leagues. Not affiliated with or endorsed by the SBSF or any club. All players are fictional. v${VERSION}</p>
    </section>`;
    if (saved) $('#tContinue').onclick = () => { SFX.init(); go('hub'); };
    $('#tNew').onclick = () => { newOpts.confirm = false; go('new'); };
    $('#tHow').onclick = howTo;
    $('#tInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) { } installEvt = null; $('#tInstall').hidden = true; };
  }
  function titleArt() {
    const pts = []; for (let a = -45; a <= 45; a += 5) pts.push(polar(a, fenceAt(a)));
    const P = p => `${(p[0] * .5 + 200).toFixed(1)},${(330 - p[1] * .5).toFixed(1)}`;
    return `<svg viewBox="0 0 400 400" aria-hidden="true">
      <defs><radialGradient id="tg" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="#3c8a4b"/><stop offset="1" stop-color="#1c4a2a"/></radialGradient></defs>
      <circle cx="200" cy="200" r="190" fill="#0f1d16" stroke="#26402f" stroke-width="2"/>
      <path d="M200,330 L${pts.map(P).join(' L')} Z" fill="url(#tg)"/>
      <circle cx="200" cy="282" r="48" fill="#c27a4b"/>
      <path d="M200,326 L232,294 L200,262 L168,294 Z" fill="#3c8a4b"/>
      <g fill="#f7f4ea">${[[232, 294], [200, 262], [168, 294]].map(([x, y]) => `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" transform="rotate(45 ${x} ${y})"/>`).join('')}<path d="M196 324h8v4l-4 4l-4-4z"/></g>
      <path d="M200,330 L${P(polar(-45, fenceAt(-45)))} M200,330 L${P(polar(45, fenceAt(45)))}" stroke="#f7f4ea" stroke-width="1.5"/>
      <g class="orb"><circle cx="200" cy="22" r="13" fill="#f7f4ea"/><path d="M193 13q4 9 0 18M207 13q-4 9 0 18" stroke="#d1453b" stroke-width="1.6" fill="none" stroke-dasharray="2 2"/></g>
      ${[['SS', -13, 150], ['2B', 13, 150], ['CF', 0, 318], ['LF', -27, 288], ['RF', 27, 288]].map(([k, a, d]) => { const p = polar(a, d); return `<circle cx="${(p[0] * .5 + 200).toFixed(1)}" cy="${(330 - p[1] * .5).toFixed(1)}" r="7" fill="#2457c5" stroke="#f2c230" stroke-width="2"/>`; }).join('')}
    </svg>`;
  }

  /* =================== NEW CAMPAIGN =================== */
  function renderNew() {
    const existing = hasSave();
    app.innerHTML = `<section class="page wrap">
      <div style="display:flex;gap:10px;align-items:center"><button class="iconbtn" id="nBack" aria-label="Back">${ICON_BACK}</button><div class="eyebrow">New campaign</div></div>
      <div><h2>Pick your club</h2><p class="lede">Play a 7-week season against the other seven clubs, then the top four meet in the playoffs. Weaker clubs start with fewer stars, so growing your players matters more.</p></div>
      <div class="teamgrid" id="nTeams">${TEAMS.map(t => `<button class="tteam ${t.id === newOpts.club ? 'on' : ''}" data-id="${t.id}"><span class="r1">${badge(t.id, 30)}<span><b>${t.name}</b><small>${t.city}</small></span></span>${starsFor(t.str)}</button>`).join('')}</div>
      <div class="opt"><div class="eyebrow">Game length</div><div class="chips" id="nInn">${[3, 5, 7, 9].map(n => `<button class="chip ${newOpts.innings === n ? 'on' : ''}" data-n="${n}">${n} innings</button>`).join('')}</div><p class="muted" style="margin:0;font-size:13px">About ${({ 3: '6', 5: '10', 7: '15', 9: '20' })[newOpts.innings]} minutes per game. You can change this later.</p></div>
      <div class="opt"><div class="eyebrow">Difficulty</div><div class="diffs" id="nDiff">
        ${[['rookie', 'Rookie', 'Opponents are weaker and the bot guesses loosely. Good for learning the reads.'], ['pro', 'Pro', 'Balanced clubs. The bot studies your habits and punishes patterns.'], ['legend', 'Legend', 'Stronger clubs and a sharp bot. Mix everything up.']].map(([k, l, d]) => `<button class="diff ${newOpts.diff === k ? 'on' : ''}" data-d="${k}"><b>${l}</b><span>${d}</span></button>`).join('')}
      </div></div>
      ${existing && newOpts.confirm ? `<p style="margin:0;color:#ffb2a8">This replaces your saved campaign. Tap again to confirm, or export a backup first from Club settings.</p>` : ''}
      <button class="btn primary block" id="nStart" style="padding:15px;font-size:17px">${existing && newOpts.confirm ? 'Replace saved campaign' : 'Start campaign'}</button>
    </section>`;
    $('#nBack').onclick = () => go('title');
    $('#nTeams').onclick = e => { const b = e.target.closest('.tteam'); if (!b) return; newOpts.club = b.dataset.id; renderNew(); };
    $('#nInn').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; newOpts.innings = +b.dataset.n; renderNew(); };
    $('#nDiff').onclick = e => { const b = e.target.closest('.diff'); if (!b) return; newOpts.diff = b.dataset.d; renderNew(); };
    $('#nStart').onclick = () => {
      if (existing && !newOpts.confirm) { newOpts.confirm = true; renderNew(); return; }
      SFX.init(); newCampaign(newOpts); save(); hubTab = 'next'; go('hub');
    };
  }

  /* =================== HUB =================== */
  function recordOf(id) { const r = standings().find(x => x.id === id); return r ? `${r.w}–${r.l}` : '0–0'; }
  function renderHub() {
    const t = teamInfo(C.club), team = C.teams[C.club];
    document.documentElement.style.setProperty('--club1', t.c1); document.documentElement.style.setProperty('--club2', t.c2);
    const tpTotal = team.players.reduce((a, p) => a + p.tp, 0);
    const phaseTxt = C.phase === 'season' ? `Season ${C.season} · Week ${Math.min(C.week + 1, C.schedule.length)} of ${C.schedule.length}` : C.phase === 'playoffs' ? `Season ${C.season} · Playoffs` : `Season ${C.season} · Complete`;
    app.innerHTML = `<header class="hubhead"><div class="wrap">
      <div class="hubtop">${badge(C.club, 44)}<div class="nm"><h2>${t.city} ${t.name}</h2><p>${phaseTxt}</p></div><button class="iconbtn" id="hHome" aria-label="Title screen">${ICON_MENU}</button></div>
      <div class="stats3"><div class="stat"><small>Record</small><b>${recordOf(C.club)}</b></div><div class="stat"><small>Credits</small><b>◆ ${C.credits}</b></div><div class="stat"><small>Titles</small><b>${C.titles}</b></div></div>
      <nav class="tabs" id="hTabs">${[['next', 'Next game'], ['table', 'Table'], ['roster', 'Roster'], ['scout', 'Scouting'], ['club', 'Club']].map(([k, l]) => `<button class="tab ${hubTab === k ? 'on' : ''}" data-t="${k}">${l}${k === 'roster' && tpTotal ? `<span class="tp">${tpTotal}</span>` : ''}</button>`).join('')}</nav>
    </div></header>
    <main class="hubbody wrap" id="hBody"></main>`;
    $('#hHome').onclick = () => go('title');
    $('#hTabs').onclick = e => { const b = e.target.closest('.tab'); if (!b) return; hubTab = b.dataset.t; renderHub(); };
    const body = $('#hBody');
    ({ next: tabNext, table: tabTable, roster: tabRoster, scout: tabScout, club: tabClub })[hubTab](body);
  }
  function tabNext(body) {
    let html = '';
    if (C.game) {
      const g = C.game;
      html += `<section class="card nextgame"><div class="eyebrow">Game in progress · ${g.label}</div>
        <div class="vsrow"><div class="side">${badge(g.away, 46)}<b>${teamInfo(g.away).name}</b><small class="num">${g.line.away.reduce((a, b) => a + (b || 0), 0)} runs</small></div><div class="at">@</div><div class="side">${badge(g.home, 46)}<b>${teamInfo(g.home).name}</b><small class="num">${g.line.home.reduce((a, b) => a + (b || 0), 0)} runs</small></div></div>
        <p class="muted" style="margin:0;text-align:center">${g.half === 0 ? 'Top' : 'Bottom'} of the ${ordinal(g.inning)} · ${g.outs} out${g.outs === 1 ? '' : 's'}</p>
        <button class="btn primary block" id="hPlay" style="padding:15px;font-size:17px">Resume game</button></section>`;
    } else if (C.phase === 'over') {
      const o = C.outcome, st = standings(), place = st.findIndex(r => r.id === C.club) + 1;
      const head = { champion: 'Swiss champions!', runnerup: 'Lost in the final', semi: 'Out in the semifinal', missed: 'Missed the playoffs' }[o] || 'Season complete';
      const champ = C.po && C.po.champ ? teamInfo(C.po.champ) : null;
      html += `<section class="card nextgame"><div class="eyebrow">Season ${C.season} complete</div>
        ${o === 'champion' ? trophySVG() : ''}
        <h2 style="margin:0;font-family:var(--f-display);font-weight:400;font-size:28px;text-align:center">${head}</h2>
        <p class="muted" style="margin:0;text-align:center">Regular season ${recordOf(C.club)}, ${ordinal(place)} place.${champ && o !== 'champion' ? ` The ${champ.name} won the title.` : ''}</p>
        <p style="margin:0;text-align:center;font-size:14px">Your players keep their ratings and training points. Rivals get stronger over the winter, and you receive ◆ 100.</p>
        <button class="btn primary block" id="hNextSeason" style="padding:15px;font-size:17px">Start season ${C.season + 1}</button></section>`;
    } else {
      const ng = nextGame();
      const sp = side => { const t = C.teams[ng[side]]; return getP(t.rotation[t.nextSP % t.rotation.length]); };
      const me = ng.home === C.club ? 'home' : 'away';
      html += `<section class="card nextgame"><div class="eyebrow">${ng.label}${ng.label === 'Swiss Final' || ng.label === 'Semifinal' ? ' · single game' : ''}</div>
        <div class="vsrow"><div class="side">${badge(ng.away, 50)}<b>${teamInfo(ng.away).name}</b><small class="num">${recordOf(ng.away)}${ng.away === C.club ? ' · you' : ''}</small></div><div class="at">@</div><div class="side">${badge(ng.home, 50)}<b>${teamInfo(ng.home).name}</b><small class="num">${recordOf(ng.home)}${ng.home === C.club ? ' · you' : ''}</small></div></div>
        <div class="starters"><div><small>Your starter</small><b>${short(sp(me))}</b><span class="muted num" style="font-size:12px">${handTag(sp(me))} · ${keyRatings(sp(me))}</span></div><div><small>Their starter</small><b>${short(sp(other(me)))}</b><span class="muted num" style="font-size:12px">${handTag(sp(other(me)))} · ${keyRatings(sp(other(me)))}</span></div></div>
        <button class="btn primary block" id="hPlay" style="padding:15px;font-size:17px">Play ball · ${C.innings} innings</button></section>`;
    }
    if (C.last) {
      const L = C.last;
      html += `<section class="card"><div class="eyebrow">Last game · ${L.label}</div><div class="lastres" style="margin-top:8px">${badge(L.opp, 26)}<span>${L.won ? '<span class="w">W</span>' : '<span class="l">L</span>'} <span class="num">${L.my}–${L.them}</span> ${L.home === C.club ? 'vs' : 'at'} ${teamInfo(L.opp).name}${L.walkoff ? ' · walk-off' : ''}</span></div></section>`;
    }
    if (C.po) html += `<section class="card"><div class="eyebrow">Playoffs</div><div class="bracket" style="margin-top:8px">${bracketHTML()}</div></section>`;
    const tp = C.teams[C.club].players.filter(p => p.tp > 0).length;
    if (tp && !C.game) html += `<section class="card" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span><b>${tp} player${tp > 1 ? 's have' : ' has'} training points</b><br><span class="muted" style="font-size:13px">Spend them in the Roster tab.</span></span><button class="btn small" id="hToRoster">Open roster</button></section>`;
    body.innerHTML = html;
    const p = $('#hPlay'); if (p) p.onclick = () => { SFX.init(); SFX.play('organ'); if (!C.game) { startGame(); save(); } G = C.game; go('game'); };
    const n = $('#hNextSeason'); if (n) n.onclick = () => { startNextSeason(); save(); toast(`Season ${C.season} begins. ◆ 100 added.`); renderHub(); };
    const r = $('#hToRoster'); if (r) r.onclick = () => { hubTab = 'roster'; renderHub(); };
  }
  function bracketHTML() {
    const po = C.po; const m = (g, lbl) => {
      if (!g) return `<div class="bm"><span class="muted">${lbl}: waiting for semifinal winners</span></div>`;
      const w = g.res ? winnerOf(g) : null;
      return `<div class="bm"><span class="eyebrow" style="grid-column:1/-1">${lbl}</span>${[g.away, g.home].map(id => `<span class="t ${w === id ? 'win' : ''}">${badge(id, 18)}${teamInfo(id).name}${id === C.club ? ' (you)' : ''}</span><span class="s">${g.res ? (id === g.home ? g.res.h : g.res.a) : ''}</span>`).join('')}</div>`;
    };
    return m(po.semis[0], 'Semifinal 1 v 4') + m(po.semis[1], 'Semifinal 2 v 3') + m(po.final, 'Swiss Final');
  }
  function trophySVG() {
    return `<svg class="trophy" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="gold" x1="0" x2="1"><stop offset="0" stop-color="#b8860b"/><stop offset=".5" stop-color="#ffe08a"/><stop offset="1" stop-color="#b8860b"/></linearGradient></defs><path d="M34 14h52v18c0 20-12 34-26 34S34 52 34 32z" fill="url(#gold)"/><path d="M34 22H18c0 16 8 24 18 24M86 22h16c0 16-8 24-18 24" fill="none" stroke="#e0b44a" stroke-width="5"/><rect x="52" y="64" width="16" height="18" fill="#c99a2e"/><rect x="38" y="82" width="44" height="12" rx="3" fill="url(#gold)"/><rect x="30" y="94" width="60" height="12" rx="3" fill="#7a5a1a"/><circle cx="60" cy="34" r="10" fill="#f7f4ea"/><path d="M54 27q4 7 0 14M66 27q-4 7 0 14" stroke="#d1453b" stroke-width="1.4" fill="none"/></svg>`;
  }
  function tabTable(body) {
    const st = standings();
    let html = `<section class="card"><div class="eyebrow">Standings · top four make the playoffs</div><table class="std" style="margin-top:6px"><thead><tr><th>Club</th><th>W</th><th>L</th><th>RD</th><th>GB</th></tr></thead><tbody>`;
    st.forEach((r, i) => { const gb = ((st[0].w - r.w) + (r.l - st[0].l)) / 2; html += `<tr class="${r.id === C.club ? 'me' : ''} ${i === 3 ? 'cut' : ''}"><td><span class="tname">${badge(r.id, 20)}${teamInfo(r.id).name}</span></td><td>${r.w}</td><td>${r.l}</td><td>${r.rs - r.ra > 0 ? '+' : ''}${r.rs - r.ra}</td><td>${gb ? gb.toFixed(1).replace('.0', '') : '–'}</td></tr>`; });
    html += `</tbody></table></section>`;
    const lastW = C.phase === 'season' ? C.week - 1 : C.schedule.length - 1;
    if (lastW >= 0) {
      html += `<section class="card"><div class="eyebrow">Week ${lastW + 1} results</div><div class="bracket" style="margin-top:8px">${C.schedule[lastW].map(g => g.res ? `<div class="bm">${[g.away, g.home].map(id => `<span class="t ${winnerOf(g) === id ? 'win' : ''}">${badge(id, 18)}${teamInfo(id).name}</span><span class="s">${id === g.home ? g.res.h : g.res.a}</span>`).join('')}</div>` : '').join('')}</div></section>`;
    }
    if (C.phase === 'season') {
      const up = []; for (let w = C.week; w < C.schedule.length; w++) { const g = C.schedule[w].find(x => x.home === C.club || x.away === C.club); up.push(`<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #22362b"><span class="muted num" style="width:58px">Week ${w + 1}</span>${badge(g.home === C.club ? g.away : g.home, 20)}<span>${g.home === C.club ? 'vs' : 'at'} ${teamInfo(g.home === C.club ? g.away : g.home).name}</span></div>`); }
      html += `<section class="card"><div class="eyebrow">Your schedule</div><div style="margin-top:4px">${up.join('')}</div></section>`;
    }
    body.innerHTML = html;
  }

  /* ---------- roster ---------- */
  function tabRoster(body) {
    const t = C.teams[C.club];
    const row = (p, ord, posTxt, extra) => {
      const warn = p.kind === 'H' && posTxt && fitPen(p.pos, posTxt) >= 1.5;
      return `<button class="prow" data-id="${p.id}"><span class="ord">${ord ?? ''}</span><span class="pos ${warn ? 'warn' : ''}">${posTxt || posLabel(p.pos)}</span><span class="pn"><b>${short(p)}${extra || ''}</b><small>#${p.num} · ${handTag(p)} · ${keyRatings(p)}</small></span>${p.tp ? `<span class="tp">${p.tp}</span>` : '<span></span>'}${ovrTag(p)}</button>`;
    };
    const nextSP = t.rotation[t.nextSP % t.rotation.length];
    body.innerHTML = `
      ${C.game ? `<p class="card" style="margin:0;font-size:14px">A game is in progress. Lineup changes apply from the next game; use pinch hitters and the bullpen during play.</p>` : ''}
      <div class="sect"><h3><span>Batting order</span><span>OVR</span></h3>${t.lineup.map((s, i) => row(getP(s.id), i + 1, s.pos)).join('')}</div>
      <div class="sect"><h3><span>Bench</span></h3>${t.bench.map(id => row(getP(id), '', null)).join('')}</div>
      <div class="sect"><h3><span>Rotation</span></h3>${t.rotation.map((id, i) => row(getP(id), i + 1, 'SP', id === nextSP ? '<span class="nxt">NEXT</span>' : '')).join('')}</div>
      <div class="sect"><h3><span>Bullpen</span></h3>${t.pen.map(id => row(getP(id), '', 'RP')).join('')}</div>
      <p class="muted" style="margin:0;font-size:13px;line-height:1.45">Tap a player to train them, move them in the order, or swap them with someone. Players earn XP every game; each 40 XP gives one training point.</p>`;
    body.onclick = e => { const b = e.target.closest('.prow'); if (b) playerSheet(b.dataset.id); };
  }
  function playerSheet(id) {
    const p = getP(id), t = C.teams[C.club];
    const li = t.lineup.findIndex(s => s.id === id), bi = t.bench.indexOf(id), ri = t.rotation.indexOf(id), pi = t.pen.indexOf(id);
    const locked = !!C.game;
    const keys = p.kind === 'P' ? ['stu', 'ctl', 'sta'] : ['con', 'pow', 'spd', 'eye', 'fld', 'arm'];
    const s = p.s;
    const line = p.kind === 'P' ? `${s.pg} G · ${(s.po / 3 | 0)}.${s.po % 3} IP · ${s.ra} R · ${s.pk} K · ${s.pbb} BB` : `${s.g} G · ${s.h}-for-${s.ab} (${s.ab ? (s.h / s.ab).toFixed(3).replace(/^0/, '') : '.000'}) · ${s.hr} HR · ${s.rbi} RBI · ${s.sb} SB`;
    let acts = '';
    if (!locked) {
      if (li >= 0) {
        const cur = t.lineup[li];
        acts += `<div class="row2"><button class="btn small" data-a="up" ${li === 0 ? 'disabled' : ''}>Bat earlier</button><button class="btn small" data-a="down" ${li === 8 ? 'disabled' : ''}>Bat later</button></div>`;
        acts += `<div class="eyebrow">Swap with</div><div class="list">${t.bench.map(b => { const q = getP(b), pen = fitPen(q.pos, cur.pos); return `<button class="opt" data-a="bench" data-x="${b}"><span><b>${short(q)}</b> from bench<small>${keyRatings(q)} · plays ${cur.pos}${pen ? ` (−${pen} fielding)` : ''}</small></span>${ovrTag(q)}</button>`; }).join('')}
          ${t.lineup.filter(s => s.id !== id).map(s => { const q = getP(s.id), pa = fitPen(p.pos, s.pos), pb = fitPen(q.pos, cur.pos); return `<button class="opt" data-a="pos" data-x="${s.id}"><span><b>${short(q)}</b> swap positions<small>${short(p)} → ${s.pos}${pa ? ` (−${pa})` : ''} · ${short(q)} → ${cur.pos}${pb ? ` (−${pb})` : ''}</small></span><span class="pos">${s.pos}</span></button>`; }).join('')}</div>`;
      } else if (bi >= 0) {
        acts += `<div class="eyebrow">Start in place of</div><div class="list">${t.lineup.map(s => { const q = getP(s.id), pen = fitPen(p.pos, s.pos); return `<button class="opt" data-a="start" data-x="${s.id}"><span><b>${short(q)}</b> (${s.pos})<small>${short(p)} would play ${s.pos}${pen ? ` (−${pen} fielding)` : ''}</small></span>${ovrTag(q)}</button>`; }).join('')}</div>`;
      } else if (ri >= 0) {
        acts += `<div class="row2"><button class="btn small" data-a="nextsp" ${t.rotation[t.nextSP % t.rotation.length] === id ? 'disabled' : ''}>Start the next game</button></div>`;
        acts += `<div class="eyebrow">Swap roles with a reliever</div><div class="list">${t.pen.map(x => { const q = getP(x); return `<button class="opt" data-a="role" data-x="${x}"><span><b>${short(q)}</b> to the rotation<small>${keyRatings(q)}</small></span>${ovrTag(q)}</button>`; }).join('')}</div>`;
      } else if (pi >= 0) {
        acts += `<div class="eyebrow">Swap roles with a starter</div><div class="list">${t.rotation.map(x => { const q = getP(x); return `<button class="opt" data-a="role" data-x="${x}"><span><b>${short(q)}</b> to the bullpen<small>${keyRatings(q)}</small></span>${ovrTag(q)}</button>`; }).join('')}</div>`;
      }
    }
    const xpIn = p.xp % 40;
    openSheet(`<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><div class="eyebrow">#${p.num} · ${p.kind === 'P' ? p.pos : posLabel(p.pos)} · ${handTag(p)}</div><h3>${p.first} ${p.last}</h3></div>${ovrTag(p)}</div>
      <div class="rbars">${keys.map(k => `<div class="rbar"><span class="k" title="${RDESC[k]}">${RLAB[k]}</span><span class="bar"><i style="width:${p.r[k] * 10}%"></i></span><span class="v">${p.r[k]}</span>${p.tp > 0 && p.r[k] < 10 ? `<button class="plus" data-train="${k}" aria-label="Train ${RLAB[k]}">+1</button>` : '<span></span>'}</div>`).join('')}</div>
      <p style="font-size:13px" class="muted">${p.tp ? `<b style="color:var(--amber)">${p.tp} training point${p.tp > 1 ? 's' : ''}</b> to spend. ` : ''}${40 - xpIn} XP to the next point.</p><p style="font-size:12.5px" class="muted">${keys.map(k => `<b style="color:var(--text)">${RLAB[k]}</b> ${RDESC[k].split(':')[1].trim()}`).join(' · ')}</p>
      ${p.kind === 'H' ? `<p style="font-size:13px" class="muted">Tendency: ${p.pull > .35 ? 'pull hitter' : p.pull < -.1 ? 'sprays to the opposite field' : 'uses the whole field'}.</p>` : ''}
      <p style="font-size:14px"><span class="eyebrow">This season</span><br><span class="num">${line}</span></p>
      ${acts}
      <button class="btn block" data-a="close">Done</button>`, s => {
      s.onclick = e => {
        const tr = e.target.closest('[data-train]');
        if (tr) { const k = tr.dataset.train; if (p.tp > 0 && p.r[k] < 10) { p.r[k]++; p.tp--; SFX.play('tap'); save(); playerSheet(id); renderHub(); } return; }
        const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
        const a = b.dataset.a, x = b.dataset.x;
        if (a === 'close') { closeSheet(); return; }
        if (a === 'up' || a === 'down') { const j = li + (a === 'up' ? -1 : 1); [t.lineup[li], t.lineup[j]] = [t.lineup[j], t.lineup[li]]; }
        if (a === 'bench') { const bj = t.bench.indexOf(x); t.bench[bj] = id; t.lineup[li] = { id: x, pos: t.lineup[li].pos }; }
        if (a === 'pos') { const j = t.lineup.findIndex(s => s.id === x); const tmp = t.lineup[li].pos; t.lineup[li].pos = t.lineup[j].pos; t.lineup[j].pos = tmp; }
        if (a === 'start') { const j = t.lineup.findIndex(s => s.id === x); t.bench[bi] = x; t.lineup[j] = { id, pos: t.lineup[j].pos }; }
        if (a === 'nextsp') t.nextSP = ri + Math.floor(t.nextSP / t.rotation.length) * t.rotation.length;
        if (a === 'role') {
          const q = getP(x);
          if (ri >= 0) { const j = t.pen.indexOf(x); t.rotation[ri] = x; t.pen[j] = id; p.pos = 'RP'; q.pos = 'SP'; }
          else { const j = t.rotation.indexOf(x); t.pen[pi] = x; t.rotation[j] = id; p.pos = 'SP'; q.pos = 'RP'; }
        }
        save(); closeSheet(); renderHub();
      };
    });
  }
  function tabScout(body) {
    const t = C.teams[C.club];
    body.innerHTML = `<p class="muted" style="margin:0;line-height:1.45">New free agents appear every week. Signing one replaces a player of the same type, who leaves the club. You have <b style="color:var(--amber)">◆ ${C.credits}</b>. Wins pay ◆ 120 and losses ◆ 60, plus a bonus for runs.</p>
      ${C.fa.length ? C.fa.map(p => `<section class="card facard"><div class="top"><div><div class="eyebrow">${p.kind === 'P' ? (p.pos === 'SP' ? 'Starting pitcher' : 'Reliever') : 'Position: ' + posLabel(p.pos)} · ${handTag(p)}</div><b>${p.first} ${p.last}</b></div><div style="text-align:right">${ovrTag(p)}<div class="cost">◆ ${p.cost}</div></div></div>
        <div class="rbars">${Object.keys(p.r).map(k => `<div class="rbar" style="grid-template-columns:44px minmax(0,1fr) 26px"><span class="k">${RLAB[k]}</span><span class="bar"><i style="width:${p.r[k] * 10}%"></i></span><span class="v">${p.r[k]}</span></div>`).join('')}</div>
        <button class="btn ${C.credits >= p.cost && !C.game ? 'primary' : ''}" data-sign="${p.id}" ${C.credits >= p.cost && !C.game ? '' : 'disabled'}>${C.game ? 'Finish the current game first' : C.credits >= p.cost ? 'Sign' : `Need ◆ ${p.cost - C.credits} more`}</button></section>`).join('') : '<p class="card" style="margin:0">No free agents left this week.</p>'}`;
    body.onclick = e => {
      const b = e.target.closest('[data-sign]'); if (!b || b.disabled) return;
      const fa = C.fa.find(p => p.id === b.dataset.sign);
      const pool = t.players.filter(p => p.kind === fa.kind).sort((a, b) => ovr(a) - ovr(b));
      openSheet(`<h3>Sign ${fa.first} ${fa.last}?</h3><p>Pick who leaves to make room. ${fa.first} takes their spot${fa.kind === 'H' ? ' in the lineup or on the bench' : ' in the rotation or bullpen'}.</p>
        <div class="list">${pool.map(p => { const where = t.lineup.find(s => s.id === p.id) ? `starts at ${t.lineup.find(s => s.id === p.id).pos}` : t.bench.includes(p.id) ? 'bench' : t.rotation.includes(p.id) ? 'rotation' : 'bullpen'; return `<button class="opt" data-rel="${p.id}"><span><b>${short(p)}</b> · ${where}<small>${keyRatings(p)}${p.tp ? ` · ${p.tp} unspent TP` : ''}</small></span>${ovrTag(p)}</button>`; }).join('')}</div>
        <button class="btn block" data-a="close">Cancel</button>`, s => {
        s.onclick = ev => {
          if (ev.target.closest('[data-a="close"]')) { closeSheet(); return; }
          const r = ev.target.closest('[data-rel]'); if (!r) return;
          const rel = getP(r.dataset.rel);
          if (signFA(fa.id, rel.id)) { save(); closeSheet(); toast(`${fa.first} ${fa.last} signed. ${rel.first} ${rel.last} leaves the club.`); renderHub(); }
        };
      });
    };
  }
  function tabClub(body) {
    const s = C.settings;
    body.innerHTML = `<section class="card" style="display:grid;gap:4px"><div class="eyebrow">Settings</div>
      <div class="setrow"><span>Game length</span><div class="chips" id="cInn">${[3, 5, 7, 9].map(n => `<button class="chip ${C.innings === n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}</div></div>
      <div class="setrow"><span>Difficulty</span><div class="chips" id="cDiff">${['rookie', 'pro', 'legend'].map(d => `<button class="chip ${C.diff === d ? 'on' : ''}" data-d="${d}">${d[0].toUpperCase() + d.slice(1)}</button>`).join('')}</div></div>
      <div class="setrow"><span>Sound</span><div class="chips" id="cSnd"><button class="chip ${s.sound ? 'on' : ''}" data-v="1">On</button><button class="chip ${!s.sound ? 'on' : ''}" data-v="0">Off</button></div></div>
      <div class="setrow"><span>Animation speed</span><div class="chips" id="cSpd"><button class="chip ${s.speed !== 'fast' ? 'on' : ''}" data-v="normal">Normal</button><button class="chip ${s.speed === 'fast' ? 'on' : ''}" data-v="fast">Fast</button></div></div>
      <p class="muted" style="margin:4px 0 0;font-size:12.5px">Game length and difficulty apply from the next game. Difficulty changes the bot's reads, not the rosters.</p></section>
      <section class="card"><div class="eyebrow">Club history</div><div class="seasons" style="margin-top:6px">
        <div><span>All-time record</span><b class="num">${C.allW}–${C.allL}</b></div><div><span>Swiss titles</span><b class="num">${C.titles}</b></div>
        ${C.hist.map(h => `<div><span>Season ${h.season}: ${h.w}–${h.l}, ${ordinal(h.place)}</span><b>${{ champion: 'Champions', runnerup: 'Final', semi: 'Semifinal', missed: 'No playoffs' }[h.outcome] || ''}</b></div>`).join('')}
      </div></section>
      <section class="card" style="display:grid;gap:10px"><div class="eyebrow">Backup</div><p class="muted" style="margin:0;font-size:13.5px;line-height:1.45">Your campaign saves on this device after every pitch. Export a backup file to move it to another phone or keep it safe.</p>
        <div class="row2" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="cExport" style="flex:1">Export backup</button><button class="btn" id="cImport" style="flex:1">Restore backup</button><input type="file" id="cFile" accept="application/json,.json" hidden></div></section>
      <section class="card" style="display:grid;gap:10px"><div class="eyebrow">Help</div><button class="btn" id="cHow">How to play</button><button class="btn danger" id="cReset">Start a new campaign</button></section>`;
    $('#cInn').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; C.innings = +b.dataset.n; save(); renderHub(); };
    $('#cDiff').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; C.diff = b.dataset.d; save(); renderHub(); };
    $('#cSnd').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; s.sound = b.dataset.v === '1'; save(); renderHub(); };
    $('#cSpd').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; s.speed = b.dataset.v; save(); renderHub(); };
    $('#cHow').onclick = howTo;
    $('#cReset').onclick = () => { newOpts.confirm = true; go('new'); };
    $('#cExport').onclick = () => {
      try { const blob = new Blob([JSON.stringify(C)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tactical-baseball-${teamInfo(C.club).name.toLowerCase()}-season${C.season}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); toast('Backup file saved.'); }
      catch (e) { toast('Export failed on this device.'); }
    };
    $('#cImport').onclick = () => $('#cFile').click();
    $('#cFile').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => { try { const c = JSON.parse(rd.result); if (!c || c.v !== 1 || !c.teams || !c.club) throw 0; C = c; G = C.game; indexPlayers(); save(); toast('Backup restored.'); hubTab = 'next'; renderHub(); } catch (err) { toast('That file is not a Tactical Baseball backup.'); } };
      rd.readAsText(f);
    };
  }

  /* =================== HOW TO PLAY =================== */
  function howTo() {
    openSheet(`<h3>How to play</h3><div class="howto">
      <p>Every pitch, you and the bot choose at the same time. Then the play runs on the field.</p>
      <h4>At bat: your aim is your guess</h4>
      <ul><li>Tap the field where you want to hit it. Aiming to your <b>pull side</b> means you expect an <b>inside</b> pitch; the <b>opposite field</b> means <b>outside</b>.</li>
      <li>Aiming <b>deep</b> (past the dashed arc) means you expect a <b>high</b> pitch to lift. Aiming <b>short</b> means <b>low</b>: ground balls and liners.</li>
      <li>Read both right and you barrel it. Read neither and you'll miss or top it.</li>
      <li><b>Contact</b> is the safe swing. <b>Power</b> can clear the fence but misses more. <b>Take</b> lets it go: waste pitches become balls, corners are often called strikes. <b>Bunt</b> moves runners.</li>
      <li>The <b>Pitcher so far</b> box shows where the bot has been throwing. Use it.</li></ul>
      <h4>On the mound</h4>
      <ul><li>Pick inside or outside, high or low, or waste one off the plate. Inside pitches get pulled, outside go the other way, high ones get lifted, low ones get beaten into the ground.</li>
      <li>The bot learns your habits by count. Patterns get punished.</li>
      <li>Shift your defense with the presets or drag any fielder. Fielders with better range cover more ground.</li>
      <li>Pitchers tire. Watch the arm bar and go to the bullpen.</li></ul>
      <h4>Running and managing</h4>
      <ul><li>Turn on <b>Steal</b> before a pitch. The odds shown depend on runner speed and the catcher's arm. A waste pitch makes stealing much harder.</li>
      <li>On close plays you choose whether to send the runner.</li>
      <li><b>Pinch hit</b> from the bench. Batters hit better against pitchers who throw with the other hand.</li></ul>
      <h4>The campaign</h4>
      <ul><li>Seven weeks against the other clubs, then the top four play single-game semifinals and the Swiss Final.</li>
      <li>Players earn XP each game. Every 40 XP is a training point you spend on a rating.</li>
      <li>Win credits and sign free agents in Scouting.</li></ul>
    </div><button class="btn primary block" data-a="close">Got it</button>`, s => { s.querySelector('[data-a="close"]').onclick = closeSheet; });
  }

  /* =================== SHEET =================== */
  function openSheet(html, bind) { const w = $('#sheetWrap'), s = $('#sheet'); s.innerHTML = html; w.hidden = false; s.scrollTop = 0; if (bind) bind(s); }
  function closeSheet() { $('#sheetWrap').hidden = true; $('#sheet').innerHTML = ''; $('#sheet').onclick = null; sheetLocked = false; }
  $('#sheetWrap').addEventListener('click', e => { if (e.target.id === 'sheetWrap' && !sheetLocked) closeSheet(); });

  /* =================== GAME SCREEN =================== */
  const DL = { fld: null, run: null, bat: null, aim: null, guide: null, heat: null, ghost: null, ball: null, shadow: null };
  function fieldStatic(homeId) {
    const t = teamInfo(homeId);
    const S = p => `${p[0].toFixed(1)},${(400 - p[1]).toFixed(1)}`;
    const arc = (r, a0, a1, step) => { const pts = []; for (let a = a0; a <= a1 + .01; a += step) pts.push(polar(a, typeof r === 'function' ? r(a) : r)); return pts; };
    const fence = arc(fenceAt, -45, 45, 3);
    const foulR = a => Math.abs(a) <= 45 ? fenceAt(a) + 4 : 330 - (Math.abs(a) - 45) * 9;
    const foul = arc(foulR, -64, 64, 4);
    const track = arc(a => fenceAt(a) - 7, -45, 45, 3);
    const txtArc = arc(a => fenceAt(a) + 12, -40, 40, 4);
    const lab = (a, txt) => { const p = polar(a, fenceAt(a) - 24); return `<text x="${p[0].toFixed(1)}" y="${(400 - p[1]).toFixed(1)}" text-anchor="middle" class="fdist">${txt}</text>`; };
    return `
    <defs>
      <pattern id="mow" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45 0 400)"><rect width="40" height="40" fill="#3a7f46"/><rect width="20" height="40" fill="#33733f"/></pattern>
      <pattern id="mowIn" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45 0 336)"><rect width="16" height="16" fill="#3d8549"/><rect width="8" height="16" fill="#367842"/></pattern>
      <clipPath id="fairClip"><path d="M0,400 L${fence.map(S).join(' L')} Z"/></clipPath>
      <radialGradient id="lamp" cx="0" cy="0" r="1"><stop offset="0" stop-color="#fff6cf" stop-opacity=".22"/><stop offset="1" stop-color="#fff6cf" stop-opacity="0"/></radialGradient>
      <path id="fenceTxt" d="M${txtArc.map(S).join(' L')}" fill="none"/>
      <style>.fdist{font:800 11px Archivo, sans-serif; fill:#f5e9c8; opacity:.75; letter-spacing:.04em} .ftxt{font:800 10.5px Archivo, sans-serif; letter-spacing:.24em; fill:#f5c84f; opacity:.85} .tok{font:800 11px Archivo, sans-serif} .glab{font:800 10px Archivo, sans-serif; letter-spacing:.12em}</style>
    </defs>
    <rect x="-250" y="-6" width="500" height="434" fill="#0a130e"/>
    <circle cx="-235" cy="0" r="230" fill="url(#lamp)"/><circle cx="235" cy="0" r="230" fill="url(#lamp)"/>
    <path d="M0,400 L${foul.map(S).join(' L')} Z" fill="#245a31"/>
    <path d="M0,400 L${fence.map(S).join(' L')} Z" fill="url(#mow)"/>
    <path d="M${track.map(S).join(' L')}" fill="none" stroke="#a8683f" stroke-width="14" opacity=".9"/>
    <path d="M${fence.map(S).join(' L')}" fill="none" stroke="#0c2a19" stroke-width="6" stroke-linejoin="round"/>
    <path d="M${fence.map(S).join(' L')}" fill="none" stroke="#f5c84f" stroke-width="1.2" opacity=".8"/>
    <text class="ftxt"><textPath href="#fenceTxt" startOffset="50%" text-anchor="middle">${t.venue}</textPath></text>
    ${lab(-40, ftToM(fenceAt(-45)) + ' m')}${lab(40, ftToM(fenceAt(45)) + ' m')}${lab(0, ftToM(fenceAt(0)) + ' m')}${lab(-21, ftToM(fenceAt(-22)) + ' m')}${lab(21, ftToM(fenceAt(22)) + ' m')}
    <g clip-path="url(#fairClip)"><circle cx="0" cy="${400 - 95}" r="96" fill="#c27a4b"/><path d="M0,${400 - 12} L52,${400 - 64} L0,${400 - 116} L-52,${400 - 64} Z" fill="url(#mowIn)"/></g>
    <circle cx="0" cy="400" r="22" fill="#c27a4b"/>
    <circle cx="0" cy="${400 - 60.5}" r="9.5" fill="#cc8656"/><rect x="-4" y="${400 - 61.5}" width="8" height="2" fill="#f7f4ea"/>
    <path d="M0,400 L${S(polar(-45, fenceAt(-45)))} M0,400 L${S(polar(45, fenceAt(45)))}" stroke="#f7f4ea" stroke-width="1.8" opacity=".9"/>
    <g fill="none" stroke="#f7f4ea" stroke-width="1" opacity=".7"><rect x="-17" y="391" width="11" height="17"/><rect x="6" y="391" width="11" height="17"/></g>
    ${[1, 2, 3].map(i => { const p = basePt(i); return `<rect x="${p[0] - 5}" y="${400 - p[1] - 5}" width="10" height="10" fill="#f7f4ea" transform="rotate(45 ${p[0]} ${400 - p[1]})"/>`; }).join('')}
    <path d="M-4.5,397 h9 v4 l-4.5,4 l-4.5,-4z" fill="#f7f4ea"/>
    <g id="Lguide"></g><g id="Lheat"></g><g id="Lghost"></g><g id="Lfld"></g><g id="Lrun"></g><g id="Lbat"></g><g id="Laim"></g>
    <g id="Lball" opacity="0"><ellipse id="bShadow" rx="4" ry="2" fill="#000" opacity=".4"/><circle id="ball" r="4.2" fill="#fff" stroke="#c9463b" stroke-width="1"/></g>`;
  }
  function renderGameScreen() {
    if (!G) { go('hub'); return; }
    const hc = teamInfo(C.club);
    document.documentElement.style.setProperty('--club1', hc.c1); document.documentElement.style.setProperty('--club2', hc.c2);
    app.innerHTML = `<div class="game">
      <div class="gbar"><button class="iconbtn" id="gMenu" aria-label="Game menu">${ICON_MENU}</button><div class="bug" id="bug"></div><div class="cnt" id="cnt"></div></div>
      <div class="gmain">
        <div class="fieldbox" id="fieldbox"><svg id="field" viewBox="-250 -6 500 434" role="img" aria-label="Baseball field">${fieldStatic(G.home)}</svg><div class="banner" id="banner"></div><div class="hud" id="hud" hidden></div><div class="fhint" id="fhint" hidden></div></div>
        <div class="matchup" id="matchup"></div>
        <div class="panel" id="panel"></div>
      </div></div>`;
    ['fld', 'run', 'bat', 'aim', 'guide', 'heat', 'ghost'].forEach(k => DL[k] = $('#L' + k));
    DL.ball = $('#ball'); DL.shadow = $('#bShadow'); DL.ballG = $('#Lball');
    $('#gMenu').onclick = gameMenu;
    bindField();
    updateGame();
    if (G.over) setTimeout(showGameOver, 300);
  }
  function updateGame() {
    if (screen !== 'game' || !G) return;
    renderBug(); renderCount(); renderMatchup(); renderPanel(); drawDynamic();
  }
  function renderBug() {
    const bs = batSide();
    const tm = side => `<span class="tm ${!G.over && bs === side ? 'batting' : ''}">${badge(G[side], 20)}${G[side]}</span><span class="sc">${runsOf(side)}</span>`;
    $('#bug').innerHTML = `${tm('away')}<span class="inn">${G.over ? 'FINAL' : `<i class="${G.half === 0 ? 'up' : 'down'}"></i>${G.inning}`}</span>${tm('home')}`;
  }
  function renderCount() {
    const L = (n, max, c) => Array.from({ length: max }, (_, i) => `<i class="${i < n ? c : ''}"></i>`).join('');
    $('#cnt').innerHTML = `<div><b>B</b>${L(G.balls, 3, 'b')}</div><div><b>S</b>${L(G.strikes, 2, 's')}</div><div><b>O</b>${L(G.outs, 2, 'o')}</div>`;
  }
  function todayLine(id) { const b = G.box[id]; if (!b || !b.pa) return '1st PA'; const extra = []; if (b.hr) extra.push(`${b.hr} HR`); if (b.bb) extra.push(`${b.bb} BB`); if (b.rbi) extra.push(`${b.rbi} RBI`); return `${b.h}-${b.ab}${extra.length ? ', ' + extra.join(', ') : ''}`; }
  function renderMatchup() {
    if (G.over) { $('#matchup').innerHTML = ''; return; }
    const bat = curBatter(), fs = fieldSide(), pit = getP(G.pit[fs]), bt = teamInfo(G[batSide()]), ft = teamInfo(G[fs]);
    const slot = G.gl[batSide()][G.bi[batSide()]];
    const fat = fatigue(fs), arm = 1 - clamp(G.pc[fs] / (pitchCap(pit) + 28), 0, 1);
    const armCol = fat > .45 ? 'var(--out)' : fat > 0 ? 'var(--amber)' : 'var(--hit)';
    const edge = bat.hand !== pit.hand ? 'Batter edge' : 'Pitcher edge';
    $('#matchup').innerHTML = `
      <div class="mc"><span class="jn" style="background:${bt.c1};color:${bt.c2}">${bat.num}</span><span class="info"><b>${short(bat)}</b><small>${slot.pos} · bats ${bat.hand} · ${todayLine(bat.id)}</small><small class="num">CON ${bat.r.con} · POW ${bat.r.pow} · SPD ${bat.r.spd}</small></span></div>
      <div style="display:grid;justify-items:center;gap:2px"><span class="vs">vs</span><span class="edge">${edge}</span></div>
      <div class="mc r"><span class="jn" style="background:${ft.c1};color:${ft.c2}">${pit.num}</span><span class="info"><b>${short(pit)}</b><small class="num">${pit.hand}HP · ${G.pc[fs]} P · ${fat > .45 ? 'gassed' : fat > 0 ? 'tiring' : 'fresh'}</small><small class="num">STU ${pit.r.stu} · CTL ${pit.r.ctl}</small><span class="arm"><i style="width:${Math.round(arm * 100)}%;background:${armCol}"></i></span></span></div>`;
  }
  function readText(aim, bat) {
    const r = readOf(aim, bat);
    return { side: r.side === 'in' ? 'Inside' : r.side === 'out' ? 'Outside' : 'Middle', ht: r.ht === 'H' ? 'High' : 'Low', zone: `${r.side === 'in' ? 'Pull side' : r.side === 'out' ? 'Opposite field' : 'Up the middle'}, ${lenOf(aim) >= 150 ? 'deep' : 'short'} · ${ftToM(lenOf(aim))} m` };
  }
  function pct(n, d) { return d ? Math.round(100 * n / d) : 0; }
  function renderPanel() {
    const P = $('#panel');
    if (G.over) { P.innerHTML = `<button class="btn primary block" id="gOver" style="padding:15px;font-size:17px">See the final</button>`; $('#gOver').onclick = showGameOver; return; }
    const hb = humanBatting(), dis = busy ? 'disabled' : '';
    const last = G.log[0];
    const ticker = `<button class="ticker ${last ? last.cls : ''}" id="gTicker">${last ? last.txt : ''}</button>`;
    if (hb) {
      const bat = curBatter(), bp = G.botPitch;
      const rt = G.aim ? readText(G.aim, bat) : null;
      const si = stealFrom(G.bases.map(x => x ? 1 : 0));
      let stealBtn = '';
      if (si && G.outs < 3) { const ctx = makeCtx(); const p = stealOdds(ctx, si, false); stealBtn = `<button class="btn ${G.steal ? 'on' : ''}" id="gSteal" ${dis}>Steal ${ordinal(si + 1)} · ${Math.round(p * 100)}%${G.steal ? ' · ON' : ''}</button>`; }
      const bench = G.bench[batSide()];
      P.innerHTML = `
        <div class="read">
          <div>${rt ? `<small>YOUR READ</small><b>${rt.side} · ${rt.ht}</b><span>${rt.zone}</span>` : `<small>YOUR READ</small><b class="pend">Tap the field to aim</b><span>Where you aim is your pitch guess</span>`}</div>
          <div><small>PITCHER SO FAR${bp.n ? ` · ${bp.n}` : ''}</small>${bp.n >= 3 ? `<div class="bars2"><div><span>Inside</span><u><i style="width:${pct(bp.inn, bp.n - bp.waste)}%"></i></u><span>${pct(bp.inn, bp.n - bp.waste)}%</span></div><div><span>High</span><u><i style="width:${pct(bp.hi, bp.n - bp.waste)}%"></i></u><span>${pct(bp.hi, bp.n - bp.waste)}%</span></div><div><span>Waste</span><u><i style="width:${pct(bp.waste, bp.n)}%"></i></u><span>${pct(bp.waste, bp.n)}%</span></div></div>` : `<span>Watch a few pitches to read him</span>`}</div>
        </div>
        <div class="swing">
          <button class="sw contact" data-sw="contact" ${dis}><b>Contact</b><small>safer, line drives</small></button>
          <button class="sw power" data-sw="power" ${dis}><b>Power</b><small>can go deep, misses more</small></button>
          <button class="sw" data-sw="take" ${dis}><b>Take</b><small>let it go</small></button>
          <button class="sw" data-sw="bunt" ${dis} ${G.bases.some(Boolean) || G.strikes < 2 ? '' : ''}><b>Bunt</b><small>move runners</small></button>
        </div>
        <div class="tools">${stealBtn}<button class="btn" id="gPH" ${bench.length && !busy ? '' : 'disabled'}>Pinch hit (${bench.length})</button><button class="btn" id="gBox">Box score</button></div>
        ${ticker}`;
      P.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { if (!G.aim && b.dataset.sw !== 'take' && b.dataset.sw !== 'bunt') { G.aim = polar(0, 240); } doPitch(b.dataset.sw); });
      const st = $('#gSteal'); if (st) st.onclick = () => { G.steal = !G.steal; SFX.play('tap'); renderPanel(); };
      $('#gPH').onclick = pinchSheet;
    } else {
      const bat = curBatter(), fs = fieldSide(), al = G.align[fs], bb = G.botBat || [];
      const sw = bb.filter(x => x.type === 'contact' || x.type === 'power');
      const tend = bat.pull > .35 ? 'Pull hitter' : bat.pull < -.1 ? 'Sprays the other way' : 'Uses the whole field';
      const presets = [['std', 'Standard'], ['pull', 'Pull shift'], ['oppo', 'Oppo shift'], ['in', 'Infield in'], ['deep', 'No doubles']];
      P.innerHTML = `
        <div class="pitchrow">
          <div class="zone ${bat.hand === 'L' ? 'lhb' : ''}" id="gZone">
            <span class="zl c-in">INSIDE</span><span class="zl c-out">OUTSIDE</span>
            <button class="zc c-in r-h" data-loc="inH" ${dis}>High<small>pulled, lifted</small></button><button class="zc c-out r-h" data-loc="outH" ${dis}>High<small>oppo, lifted</small></button>
            <button class="zc c-in r-l" data-loc="inL" ${dis}>Low<small>pulled grounder</small></button><button class="zc c-out r-l" data-loc="outL" ${dis}>Low<small>oppo grounder</small></button>
          </div>
          <div class="def"><small class="eyebrow">Defense</small>
            <div class="chips" id="gDef">${presets.map(([k, l]) => `<button class="chip ${al.preset === k && !al.custom ? 'on' : ''}" data-p="${k}" ${dis}>${l}</button>`).join('')}${al.custom ? '<span class="chip on">Custom</span>' : ''}</div>
            <p><b style="color:var(--text)">${tend}</b> · POW ${bat.r.pow} · SPD ${bat.r.spd}${sw.length >= 4 ? `<br>Their lineup so far: pulls ${pct(sw.filter(x => x.pa > 6).length, sw.length)}%, goes deep ${pct(sw.filter(x => x.d >= 150).length, sw.length)}%, power ${pct(sw.filter(x => x.type === 'power').length, sw.length)}%` : '<br>Drag fielders on the field to fine-tune.'}</p>
          </div>
        </div>
        <button class="btn waste" data-loc="waste" ${dis}>Waste pitch · off the plate${G.balls === 3 ? ' (ball four risk)' : ''}</button>
        <div class="tools"><button class="btn" id="gPen" ${G.pen[fs].length && !busy ? '' : 'disabled'}>Bullpen (${G.pen[fs].length})</button><button class="btn" id="gIBB" ${dis}>Walk him</button><button class="btn" id="gBox">Box score</button></div>
        ${ticker}`;
      P.querySelectorAll('[data-loc]').forEach(b => b.onclick = () => doPitch(b.dataset.loc));
      $('#gDef').onclick = e => { const b = e.target.closest('[data-p]'); if (!b || busy) return; G.align[fs] = { preset: b.dataset.p, custom: false, pts: alignment(b.dataset.p, bat.hand) }; SFX.play('tap'); animateAlign(); renderPanel(); save(); };
      $('#gPen').onclick = penSheet;
      $('#gIBB').onclick = intentionalWalk;
    }
    $('#gBox').onclick = boxSheet;
    $('#gTicker').onclick = logSheet;
  }

  /* ---------- field drawing ---------- */
  function tokenSVG(pos, pt, t, label, kind) {
    return `<g class="${kind}" data-k="${pos}" transform="translate(${SX(pt).toFixed(1)} ${SY(pt).toFixed(1)})"><ellipse cy="6" rx="12" ry="4.5" fill="#000" opacity=".3"/><circle r="${kind === 'run' ? 12 : 13.5}" fill="${t.c1}" stroke="${t.c2}" stroke-width="2.6"/><text class="tok" y="4" text-anchor="middle" fill="${t.c2}">${label}</text></g>`;
  }
  function drawFielders() {
    const fs = fieldSide(), t = teamInfo(G[fs]), pts = G.align[fs].pts;
    DL.fld.innerHTML = Object.entries(pts).map(([pos, pt]) => tokenSVG(pos, pt, t, pos, 'fld')).join('');
  }
  function drawRunners() {
    const t = teamInfo(G[batSide()]);
    DL.run.innerHTML = G.bases.map((id, i) => id ? tokenSVG(id, basePt(i + 1), t, getP(id).num, 'run') : '').join('');
  }
  function drawBatter() {
    if (G.over) { DL.bat.innerHTML = ''; return; }
    const b = curBatter(), t = teamInfo(G[batSide()]), x = b.hand === 'R' ? -19 : 19;
    DL.bat.innerHTML = `<g transform="translate(${x} 398)"><ellipse cy="6" rx="11" ry="4" fill="#000" opacity=".3"/><circle r="11" fill="${t.c1}" stroke="${t.c2}" stroke-width="2.4"/><text class="tok" y="4" text-anchor="middle" fill="${t.c2}" font-size="10">${b.num}</text><path d="M${b.hand === 'R' ? 7 : -7} -7 L${b.hand === 'R' ? 20 : -20} -24" stroke="#e8d3a6" stroke-width="4" stroke-linecap="round"/></g>`;
  }
  function drawGuide() {
    if (!humanBatting() || G.over) { DL.guide.innerHTML = ''; DL.aim.innerHTML = ''; return; }
    const ps = pullSign(curBatter());
    const pts = []; for (let a = -45; a <= 45; a += 3) pts.push(polar(a, 150));
    const S = p => `${p[0].toFixed(1)},${(400 - p[1]).toFixed(1)}`;
    const line = a => `M0,400 L${S(polar(a, fenceAt(a) - 6))}`;
    const lab = (a, d, t) => { const p = polar(a, d); return `<text class="glab" x="${p[0].toFixed(1)}" y="${(400 - p[1]).toFixed(1)}" text-anchor="middle" fill="#fff" opacity=".8">${t}</text>`; };
    DL.guide.innerHTML = `<g opacity=".9"><path d="M${pts.map(S).join(' L')}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-dasharray="6 6"/>
      <path d="${line(6)} ${line(-6)}" stroke="#fff" stroke-opacity=".28" stroke-width="1.2" stroke-dasharray="4 6" fill="none"/>
      ${lab(ps * 30, 230, 'PULL · INSIDE')}${lab(-ps * 30, 230, 'OPPO · OUTSIDE')}${lab(-ps * 39, 176, '▲ DEEP · HIGH')}${lab(-ps * 39, 136, '▼ SHORT · LOW')}</g>`;
    drawAim();
  }
  function drawAim() {
    if (!G.aim || !humanBatting()) { DL.aim.innerHTML = ''; return; }
    const x = SX(G.aim), y = SY(G.aim);
    DL.aim.innerHTML = `<path d="M0,400 L${x.toFixed(1)},${y.toFixed(1)}" stroke="#f5b83d" stroke-width="1.6" stroke-dasharray="5 5" opacity=".7"/>
      <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="17" fill="#f5b83d22" stroke="#f5b83d" stroke-width="2.5"/><path d="M-24 0h-0M-26 0h8M18 0h8M0 -26v8M0 18v8" stroke="#f5b83d" stroke-width="2.5"/><circle r="3" fill="#f5b83d"/></g>`;
  }
  function drawHeat() {
    if (humanBatting() || G.over) { DL.heat.innerHTML = ''; return; }
    const bat = curBatter(), ps = pullSign(bat);
    const pull = clamp(.38 + .3 * (bat.pull || 0), .12, .75), oppo = clamp((1 - pull) * .55, .1, .5);
    const S = p => `${p[0].toFixed(1)},${(400 - p[1]).toFixed(1)}`;
    const wedge = (a0, a1, op) => { const pts = []; for (let a = a0; a <= a1 + .01; a += 3) pts.push(polar(a, fenceAt(a) - 10)); return `<path d="M0,400 L${pts.map(S).join(' L')} Z" fill="#f5b83d" opacity="${op.toFixed(2)}"/>`; };
    const pw = ps < 0 ? wedge(-45, -6, pull * .32) + wedge(6, 45, oppo * .32) : wedge(6, 45, pull * .32) + wedge(-45, -6, oppo * .32);
    const dots = (G.spray[bat.id] || []).map(s => `<circle cx="${SX(s.pt).toFixed(1)}" cy="${SY(s.pt).toFixed(1)}" r="5" fill="${s.hit ? '#6be39b' : '#ff6f5e'}" stroke="#000" stroke-width="1"/>`).join('');
    DL.heat.innerHTML = pw + dots;
  }
  function drawGhost() {
    const L = G.last;
    if (!L || !L.land) { DL.ghost.innerHTML = ''; return; }
    DL.ghost.innerHTML = `<g transform="translate(${SX(L.land).toFixed(1)} ${SY(L.land).toFixed(1)})" opacity=".55"><path d="M-6 -6L6 6M6 -6L-6 6" stroke="#fff" stroke-width="2.5"/></g>`;
  }
  function drawDynamic() { drawHeat(); drawGuide(); drawGhost(); drawFielders(); drawRunners(); drawBatter(); hintText(); }
  function hintText() {
    const h = $('#fhint'); if (!h) return;
    if (G.over || busy || G.seq > 8) { h.hidden = true; return; }
    h.hidden = false;
    h.textContent = humanBatting() ? (G.aim ? 'Drag to move your aim' : 'Tap where you want to hit it') : 'Drag fielders to reposition';
  }
  function showHud(L) {
    const hud = $('#hud'); if (!L || !L.loc) { hud.hidden = true; return; }
    const ps = L.batHand === 'L' ? 1 : -1; // inside is on the batter's side (catcher's view: RHB on left)
    const colX = side => side === 'in' ? (ps < 0 ? 20.5 : 37.5) : side === 'out' ? (ps < 0 ? 37.5 : 20.5) : 29;
    const rowY = h => h === 'H' ? 20.5 : h === 'L' ? 41.5 : 31;
    let dx, dy;
    const a = L.actual;
    if (a === 'mid') { dx = 29; dy = 31; }
    else if (a === 'waste') { dx = ps < 0 ? 53 : 5; dy = 47; }
    else if (a === 'ball') { const s = locSide(L.loc), h = locHt(L.loc); dx = colX(s) + (s === 'in' ? -1 : 1) * (ps < 0 ? 15 : -15) * (s === 'in' ? 1 : 1); dy = rowY(h) + (h === 'H' ? -14 : 14); dx = clamp(dx, 4, 54); dy = clamp(dy, 4, 62); }
    else { dx = colX(locSide(a)); dy = rowY(locHt(a)); }
    const ring = L.read ? `<circle cx="${colX(L.read.side)}" cy="${rowY(L.read.ht)}" r="8" fill="none" stroke="#f5b83d" stroke-width="2" stroke-dasharray="3 2"/>` : '';
    const bx = ps < 0 ? 4 : 50;
    hud.innerHTML = `<span>PITCH</span><svg viewBox="0 0 58 66"><rect x="${bx}" y="14" width="4" height="34" rx="2" fill="#97ad9f"/><rect x="12" y="10" width="34" height="42" fill="#ffffff08" stroke="#f7f4ea" stroke-opacity=".6"/><path d="M29 10v42M12 31h34" stroke="#f7f4ea" stroke-opacity=".25"/>${ring}<circle cx="${dx}" cy="${dy}" r="5" fill="#fff" stroke="#c9463b" stroke-width="1.5"/></svg><span>${({ mid: 'HANGER', ball: 'MISSED', waste: 'WASTE', inH: 'IN · HIGH', inL: 'IN · LOW', outH: 'OUT · HIGH', outL: 'OUT · LOW' })[a]}</span>`;
    hud.hidden = false;
  }

  /* ---------- field input ---------- */
  function toField(e) {
    const svg = $('#field'), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse()); return [q.x, 400 - q.y];
  }
  function clampAim(p) { const a = clamp(angOf(p), -44, 44), d = clamp(lenOf(p), 45, fenceAt(a) + 35); return polar(a, d); }
  function bindField() {
    const svg = $('#field'); let drag = null;
    svg.addEventListener('pointerdown', e => {
      if (busy || !G || G.over) return;
      const p = toField(e);
      if (humanBatting()) { drag = { kind: 'aim' }; G.aim = clampAim(p); drawAim(); renderPanel(); hintText(); svg.setPointerCapture(e.pointerId); e.preventDefault(); return; }
      const fs = fieldSide(), pts = G.align[fs].pts;
      let best = null, bd = 34;
      for (const pos in pts) { if (pos === 'P' || pos === 'C') continue; const d = dist(pts[pos], p); if (d < bd) { bd = d; best = pos; } }
      if (best) { drag = { kind: 'fld', pos: best }; svg.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    svg.addEventListener('pointermove', e => {
      if (!drag) return;
      const p = toField(e);
      if (drag.kind === 'aim') { G.aim = clampAim(p); drawAim(); updateReadBox(); }
      else { const fs = fieldSide(); G.align[fs].pts[drag.pos] = constrainFielder(drag.pos, p); if (!G.align[fs].custom) { G.align[fs].custom = true; drag.changed = true; } const g = DL.fld.querySelector(`[data-k="${drag.pos}"]`); const q = G.align[fs].pts[drag.pos]; if (g) g.setAttribute('transform', `translate(${SX(q).toFixed(1)} ${SY(q).toFixed(1)})`); }
    });
    const end = () => { if (!drag) return; const k = drag.kind, ch = drag.changed; drag = null; if (k === 'aim') renderPanel(); else if (ch) renderPanel(); save(); };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  }
  function updateReadBox() {
    const box = document.querySelector('.read > div'); if (!box || !G.aim) return;
    const rt = readText(G.aim, curBatter());
    box.innerHTML = `<small>YOUR READ</small><b>${rt.side} · ${rt.ht}</b><span>${rt.zone}</span>`;
  }

  /* ---------- animation ---------- */
  function setBall(p, h, show) {
    const x = SX(p), y = SY(p);
    DL.shadow.setAttribute('cx', x); DL.shadow.setAttribute('cy', y + 2);
    DL.ball.setAttribute('cx', x); DL.ball.setAttribute('cy', y - h * .3);
    DL.ball.setAttribute('r', 4.2 + h * .035);
    DL.ballG.setAttribute('opacity', show === false ? 0 : 1);
  }
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  function moveTok(layer, key, p) { const g = layer.querySelector(`[data-k="${key}"]`); if (g) g.setAttribute('transform', `translate(${SX(p).toFixed(1)} ${SY(p).toFixed(1)})`); }
  async function animPitch() {
    DL.aim.style.opacity = .35;
    await tween(360, k => setBall(lerp([0, 58], [0, 2], k), 6 * Math.sin(Math.PI * k)));
  }
  async function animBatted(out) {
    const bb = out.bb; if (!bb) return;
    const fs = fieldSide(), pts = G.align[fs].pts;
    let target = bb.caught ? (bb.land || bb.fieldPt) : (bb.fieldPt || bb.land);
    if (!target) return;
    const T = bb.T || 1.5;
    let dur, peak;
    if (bb.hr) { dur = 1500; peak = 160; target = polar(bb.th, bb.d + 25); }
    else if (out.res === 'foul') { dur = 700; peak = bb.type === 'ground' ? 0 : 60; }
    else if (bb.type === 'ground') { dur = 420 + lenOf(target) * 2.6; peak = 0; }
    else if (bb.type === 'bunt') { dur = 600; peak = 0; }
    else if (bb.type === 'liner') { dur = 450 + T * 260; peak = 18; }
    else if (bb.type === 'popup') { dur = 1300; peak = 140; }
    else { dur = 700 + T * 300; peak = 50 + bb.d * .3; }
    const f = bb.by && pts[bb.by] ? bb.by : null, f0 = f ? pts[f] : null;
    const fEnd = f ? (bb.caught ? target : (bb.fieldPt || target)) : null;
    SFX.play(out.res === 'foul' && bb.type === 'ground' ? 'tap' : 'crack');
    await tween(dur, k => {
      const pk = bb.type === 'ground' ? 1 - Math.pow(1 - k, 1.6) : k;
      setBall(lerp([0, 2], target, pk), peak * 4 * k * (1 - k));
      if (f && out.res !== 'foul') moveTok(DL.fld, f, lerp(f0, fEnd, Math.min(1, ease(k) * 1.08)));
    });
    if (bb.hr) { DL.ballG.setAttribute('opacity', 0); return; }
    if (bb.caught) SFX.play('pop');
    if (out.res === 'inplay' && !bb.caught && ['GO', 'DP', 'FC', 'SAC'].includes(out.event)) {
      SFX.play('pop');
      const from = bb.fieldPt || target;
      if (out.event === 'DP' || out.event === 'FC') { await tween(320, k => setBall(lerp(from, basePt(2), k), 10 * Math.sin(Math.PI * k))); if (out.event === 'DP') await tween(320, k => setBall(lerp(basePt(2), basePt(1), k), 10 * Math.sin(Math.PI * k))); }
      else await tween(380, k => setBall(lerp(from, basePt(1), k), 10 * Math.sin(Math.PI * k)));
      SFX.play('pop');
    }
    await sleep(120);
  }
  async function animSteal(out) {
    if (!out.steal) return;
    const to = out.steal.from + 1;
    await tween(320, k => setBall(lerp([0, -4], basePt(to), k), 10 * Math.sin(Math.PI * k)));
  }
  async function animRunners(anim) {
    if (!anim.length) return;
    const t = teamInfo(G[batSide()]);
    await Promise.all(anim.map(async m => {
      if (m.to === 'k') return;
      let g = DL.run.querySelector(`[data-k="${m.id}"]`);
      if (!g) { DL.run.insertAdjacentHTML('beforeend', tokenSVG(m.id, basePt(m.from), t, getP(m.id).num, 'run')); g = DL.run.querySelector(`[data-k="${m.id}"]`); if (m.from === 0) DL.bat.innerHTML = ''; }
      const leg = async (a, b) => tween(300, k => moveTok(DL.run, m.id, lerp(basePt(a), basePt(b), ease(k))));
      if (m.to === 'out') { const a = basePt(m.from), b = basePt(m.from + 1); await tween(320, k => moveTok(DL.run, m.id, lerp(a, lerp(a, b, .55), ease(k)))); await tween(240, k => g.setAttribute('opacity', 1 - k)); g.remove(); return; }
      for (let b = m.from; b < m.to; b++) await leg(b, b + 1);
      if (m.to >= 4) { await tween(220, k => g.setAttribute('opacity', 1 - k)); g.remove(); }
    }));
  }
  async function animateAlign() {
    const fs = fieldSide(), pts = G.align[fs].pts, starts = {};
    DL.fld.querySelectorAll('.fld').forEach(g => { const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(g.getAttribute('transform')); if (m) starts[g.dataset.k] = [+m[1], 400 - +m[2]]; });
    await tween(320, k => { for (const pos in pts) if (starts[pos]) moveTok(DL.fld, pos, lerp(starts[pos], pts[pos], ease(k))); });
  }
  let bannerT = null;
  function banner(txt, cls, ms) {
    const b = $('#banner'); if (!b) return; b.textContent = txt; b.className = 'banner show ' + (cls || '');
    clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), ms || 1100);
  }

  /* ---------- pitch flow ---------- */
  function trackBot(hb, ctx, loc, act) {
    if (hb) {
      G.hist.bat.push({ pa: angOf(act.aim) * pullSign(ctx.bat), d: lenOf(act.aim), type: act.type, bk: bucket() }); if (G.hist.bat.length > 40) G.hist.bat.shift();
      const bp = G.botPitch; bp.n++; if (loc === 'waste') bp.waste++; else { if (locSide(loc) === 'in') bp.inn++; if (locHt(loc) === 'H') bp.hi++; }
    } else {
      G.hist.pitch.push({ loc, bk: bucket() }); if (G.hist.pitch.length > 60) G.hist.pitch.shift();
      (G.botBat = G.botBat || []).push({ pa: angOf(act.aim) * pullSign(ctx.bat), d: lenOf(act.aim), type: act.type }); if (G.botBat.length > 40) G.botBat.shift();
    }
  }
  async function doPitch(choice) {
    if (busy || !G || G.over) return;
    busy = true; SFX.init();
    try {
      const ctx = makeCtx(), hb = humanBatting();
      const s0 = { bases: G.bases.slice(), outs: G.outs, balls: G.balls, strikes: G.strikes, batter: ctx.bat.id };
      let loc, act;
      if (hb) { act = { type: choice, aim: G.aim || polar(0, 240), steal: G.steal }; loc = botPitchChoice(ctx); }
      else { loc = choice; act = botBatChoice(ctx); act.steal = botStealChoice(ctx); }
      trackBot(hb, ctx, loc, act);
      renderPanel(); hintText();
      const out = resolve(ctx, loc, act, { auto: !hb, thresh: botDecideThresh() });
      G.pc[fieldSide()]++;
      if (out.steal) { const g = DL.run.querySelector(`[data-k="${out.steal.id}"]`); if (g) tween(500, k => moveTok(DL.run, out.steal.id, lerp(basePt(out.steal.from), basePt(out.steal.from + 1), k * .45))); }
      await animPitch();
      const L = { loc, actual: out.actual, read: (act.type === 'take' || act.type === 'bunt') ? null : readOf(act.aim, ctx.bat), batHand: ctx.bat.hand };
      showHud(L);
      if (out.bb && (out.res === 'inplay' || out.res === 'foul')) await animBatted(out);
      else { SFX.play(out.res === 'ball' ? 'tap' : 'pop'); DL.ballG.setAttribute('opacity', 0); }
      if (out.steal) await animSteal(out);
      if (out.decision) { const go = await askSend(out.decision); settleDecision(out, go); }
      const n = transition(s0, out);
      const d = describe(ctx, out, n);
      // banner
      if (n.paEnd) {
        const lbl = EVENT_BANNER[n.event] || '';
        const cls = n.runs ? 'run' : ['1B', '2B', '3B', 'HR', 'IH', 'BH', 'BB', 'E'].includes(n.event) ? 'hit' : ['K', 'GO', 'DP', 'FO', 'LO', 'PO', 'LDP'].includes(n.event) ? 'out' : '';
        banner(n.runs && n.event !== 'HR' ? `${lbl}${n.runs > 1 ? ` · ${n.runs} runs` : ' · run scores'}` : lbl, cls);
        if (n.event === 'HR') { SFX.play('cheer'); buzz([30, 40, 60]); } else if (n.runs) { SFX.play('cheer'); buzz(25); } else if (cls === 'out') SFX.play('thud');
      } else if (out.steal) banner(out.steal.safe ? 'Stolen base' : 'Caught stealing', out.steal.safe ? 'hit' : 'out');
      else banner(out.res === 'ball' ? `Ball ${n.balls}` : out.res === 'foul' ? 'Foul' : `Strike ${n.strikes}${out.whiff ? '' : ', looking'}`, 'small', 800);
      DL.ballG.setAttribute('opacity', 0);
      await animRunners(n.anim);
      commitPlay(ctx, out, n);
      G.steal = false;
      logPlay(d.t, d.cls);
      G.last = { land: out.bb && out.res === 'inplay' ? (out.bb.caught ? out.bb.land : (out.bb.fieldPt || out.bb.land)) : null };
      const r = afterPlay();
      DL.aim.style.opacity = 1;
      if (r === 'over') { save(); busy = false; updateGame(); await sleep(700); showGameOver(); return; }
      if (r === 'half') {
        await sleep(450); banner(G.half === 0 ? `${ordinal(G.inning)} inning` : 'Side retired', '', 1000);
        G.last = null; $('#hud').hidden = true;
        await sleep(900); prepPA();
      } else if (n.paEnd || n.midEnd) { prepPA(); }
      save();
    } catch (err) { console.error(err); toast('Something went wrong with that play. It was skipped.'); }
    busy = false;
    updateGame();
    if (G && !G.over && fieldSide() !== G.human) animateAlign();
  }
  function intentionalWalk() {
    if (busy || !G) return;
    const ctx = makeCtx();
    const s0 = { bases: G.bases.slice(), outs: G.outs, balls: 3, strikes: G.strikes, batter: ctx.bat.id };
    const out = { res: 'ball', ibb: true, act: {}, loc: 'waste', actual: 'waste' };
    const n = transition(s0, out);
    commitPlay(ctx, out, n);
    logPlay(`${ctx.bat.last} is walked intentionally.`, '');
    afterPlay(); prepPA(); save();
    banner('Intentional walk', '', 900);
    updateGame();
  }
  function askSend(dec) {
    return new Promise(res => {
      const p = getP(dec.id), pctv = Math.round(dec.p * 100);
      const where = dec.to === 4 ? 'home' : ordinal(dec.to);
      sheetLocked = true;
      openSheet(`<div class="eyebrow">Close play</div><h3>${dec.tag ? `Tag up and send ${short(p)} ${dec.to === 4 ? 'home' : 'to ' + where}?` : `Send ${short(p)} ${dec.to === 4 ? 'home' : 'to ' + where}?`}</h3>
        <div class="big num">${pctv}%</div><p style="text-align:center">Chance to be safe. SPD ${p.r.spd}. ${G.outs === 2 ? 'Two outs: an out ends the inning.' : `If he's out, that's out number ${G.outs + 1 + (dec.tag ? 1 : 0)}.`}</p>
        <div class="row2"><button class="btn" data-g="0">Hold</button><button class="btn primary" data-g="1">Send him</button></div>`, s => {
        s.onclick = e => { const b = e.target.closest('[data-g]'); if (!b) return; closeSheet(); res(b.dataset.g === '1'); };
      });
    });
  }
  function pinchSheet() {
    const bs = batSide(), bench = G.bench[bs], cur = curBatter(), pit = getP(G.pit[fieldSide()]);
    openSheet(`<h3>Pinch hit for ${short(cur)}?</h3><p>The pinch hitter takes over this spot in the order and plays ${G.gl[bs][G.bi[bs]].pos} for the rest of the game. ${pit.hand}HP on the mound.</p>
      <div class="list"><div class="opt" style="pointer-events:none;opacity:.7"><span><b>${short(cur)}</b> (now batting)<small>${keyRatings(cur)} · bats ${cur.hand}${cur.hand !== pit.hand ? ' · platoon edge' : ''}</small></span>${ovrTag(cur)}</div>
      ${bench.map(id => { const p = getP(id); return `<button class="opt" data-id="${id}"><span><b>${short(p)}</b><small>${keyRatings(p)} · EYE ${p.r.eye} · bats ${p.hand}${p.hand !== pit.hand ? ' · platoon edge' : ''}</small></span>${ovrTag(p)}</button>`; }).join('')}</div>
      <button class="btn block" data-a="close">Keep ${short(cur)}</button>`, s => {
      s.onclick = e => { if (e.target.closest('[data-a="close"]')) { closeSheet(); return; } const b = e.target.closest('[data-id]'); if (!b) return; pinchHit(b.dataset.id); closeSheet(); save(); updateGame(); banner('Pinch hitter', '', 900); };
    });
  }
  function penSheet() {
    const fs = fieldSide(), cur = getP(G.pit[fs]), fat = fatigue(fs);
    openSheet(`<h3>Go to the bullpen?</h3><p>${short(cur)} has thrown ${G.pc[fs]} pitches and is ${fat > .45 ? 'gassed: expect missed spots and hard contact' : fat > 0 ? 'starting to tire' : 'still fresh'}. A pitcher who leaves can't come back.</p>
      <div class="list">${G.pen[fs].map(id => { const p = getP(id); return `<button class="opt" data-id="${id}"><span><b>${short(p)}</b> · ${p.hand}HP<small>${keyRatings(p)} · about ${pitchCap(p)} pitches before tiring</small></span>${ovrTag(p)}</button>`; }).join('')}</div>
      <button class="btn block" data-a="close">Stay with ${short(cur)}</button>`, s => {
      s.onclick = e => { if (e.target.closest('[data-a="close"]')) { closeSheet(); return; } const b = e.target.closest('[data-id]'); if (!b) return; changePitcher(fs, b.dataset.id); closeSheet(); save(); updateGame(); banner('Pitching change', '', 900); };
    });
  }
  function boxTable(side) {
    const rows = G.gl[side].map(s => s.id);
    const subs = Object.keys(G.box).filter(id => !rows.includes(id) && C.teams[G[side]].players.some(p => p.id === id) && G.box[id].pa);
    const bat = [...rows, ...subs].map(id => { const p = getP(id), b = G.box[id] || blankBox(); return `<tr><td>${short(p)}</td><td>${b.ab}</td><td>${b.r}</td><td>${b.h}</td><td>${b.rbi}</td><td>${b.bb}</td><td>${b.k}</td></tr>`; }).join('');
    const pit = G.usedP[side].map(id => { const p = getP(id), b = G.box[id] || blankBox(); return `<tr><td>${short(p)}</td><td>${(b.po / 3 | 0)}.${b.po % 3}</td><td>${b.ph}</td><td>${b.ra}</td><td>${b.pbb}</td><td>${b.pk}</td><td>${b.pc}</td></tr>`; }).join('');
    return `<div class="eyebrow" style="display:flex;gap:6px;align-items:center">${badge(G[side], 18)}${teamInfo(G[side]).name}</div>
      <div class="box"><table><thead><tr><th>Batting</th><th>AB</th><th>R</th><th>H</th><th>RBI</th><th>BB</th><th>K</th></tr></thead><tbody>${bat}</tbody></table></div>
      <div class="box"><table><thead><tr><th>Pitching</th><th>IP</th><th>H</th><th>R</th><th>BB</th><th>K</th><th>P</th></tr></thead><tbody>${pit}</tbody></table></div>`;
  }
  function lineScore(line, H, away, home, innings) {
    const cols = Math.max(innings, line.away.length);
    let h = `<table><thead><tr><th></th>${Array.from({ length: cols }, (_, i) => `<th>${i + 1}</th>`).join('')}<th>R</th><th>H</th></tr></thead><tbody>`;
    for (const side of ['away', 'home']) {
      const id = side === 'away' ? away : home;
      h += `<tr><td class="t">${badge(id, 16)}</td>${Array.from({ length: cols }, (_, i) => { let v = line[side][i]; if (v === undefined && side === 'home' && line.away[i] !== undefined && i >= innings - 1) v = 'X'; return `<td>${v ?? ''}</td>`; }).join('')}<td class="R">${line[side].reduce((a, b) => a + (b || 0), 0)}</td><td class="R">${H[side]}</td></tr>`;
    }
    return `<div class="linescore">${h}</tbody></table></div>`;
  }
  function boxSheet() {
    openSheet(`<h3>Box score</h3>${lineScore(G.line, G.H, G.away, G.home, G.innings)}${boxTable('away')}${boxTable('home')}<button class="btn block" data-a="close">Close</button>`, s => { s.querySelector('[data-a="close"]').onclick = closeSheet; });
  }
  function logSheet() {
    openSheet(`<h3>Play-by-play</h3><div class="log">${G.log.map(l => `<div class="${l.cls}"><span>${l.tag}</span><span class="${l.cls}" style="color:inherit;font-size:14px">${l.txt}</span></div>`).join('')}</div><button class="btn block" data-a="close">Close</button>`, s => { s.querySelector('[data-a="close"]').onclick = closeSheet; });
  }
  function gameMenu() {
    openSheet(`<h3>Game menu</h3><div class="list">
      <button class="opt" data-a="box"><span><b>Box score</b><small>Line score and every player's game</small></span></button>
      <button class="opt" data-a="log"><span><b>Play-by-play</b><small>Everything that has happened</small></span></button>
      <button class="opt" data-a="snd"><span><b>Sound: ${C.settings.sound ? 'on' : 'off'}</b><small>Bat crack, glove pop, crowd</small></span></button>
      <button class="opt" data-a="spd"><span><b>Animation: ${C.settings.speed === 'fast' ? 'fast' : 'normal'}</b><small>Speed up plays</small></span></button>
      <button class="opt" data-a="how"><span><b>How to play</b><small>Reads, swings, pitching, defense</small></span></button>
      <button class="opt" data-a="exit"><span><b>Save and go to the clubhouse</b><small>The game resumes exactly here</small></span></button></div>
      <button class="btn primary block" data-a="close">Back to the game</button>`, s => {
      s.onclick = e => {
        const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
        if (a === 'close') closeSheet(); else if (a === 'box') boxSheet(); else if (a === 'log') logSheet(); else if (a === 'how') howTo();
        else if (a === 'snd') { C.settings.sound = !C.settings.sound; save(); gameMenu(); }
        else if (a === 'spd') { C.settings.speed = C.settings.speed === 'fast' ? 'normal' : 'fast'; save(); gameMenu(); }
        else if (a === 'exit') { save(); closeSheet(); hubTab = 'next'; go('hub'); }
      };
    });
  }
  function showGameOver() {
    if (!G) return;
    const me = runsOf(G.human), them = runsOf(other(G.human)), won = me > them;
    if (won) { SFX.play('organ'); setTimeout(() => SFX.play('cheer'), 500); }
    sheetLocked = true;
    openSheet(`<div class="eyebrow">Final · ${G.label}</div><h3>${won ? (G.walkoff ? 'Walk-off win!' : 'Ballgame. You win!') : 'Tough loss.'}</h3>
      ${lineScore(G.line, G.H, G.away, G.home, G.innings)}
      <button class="btn primary block" data-a="go">Continue</button>`, s => {
      s.querySelector('[data-a="go"]').onclick = () => { closeSheet(); finishGame(); save(); go('post'); };
    });
  }

  /* =================== POST GAME =================== */
  function renderPost() {
    const L = C.last; if (!L) { go('hub'); return; }
    const team = C.teams[C.club];
    const top = Object.entries(L.xp).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, x]) => {
      const p = getP(id); if (!p) return ''; const b = L.box[id];
      let line = '';
      if (b) { if (p.kind === 'P') line = `${(b.po / 3 | 0)}.${b.po % 3} IP, ${b.ra} R, ${b.pk} K`; else { line = `${b.h}-for-${b.ab}`; if (b.hr) line += `, ${b.hr} HR`; if (b.rbi) line += `, ${b.rbi} RBI`; if (b.bb) line += `, ${b.bb} BB`; if (b.sb) line += `, ${b.sb} SB`; } }
      return `<div class="star"><span class="pos">${p.kind === 'P' ? p.pos : (team.lineup.find(s => s.id === id) || {}).pos || posLabel(p.pos)}</span><span><b>${p.first} ${p.last}</b><small>${line || 'did not play'}</small></span><span class="xp">+${x} XP</span></div>`;
    }).join('');
    const champ = L.final && L.won;
    app.innerHTML = `<section class="post wrap">
      <div class="res"><span class="eyebrow">${L.label}</span>${champ ? trophySVG() : ''}<h2 class="${L.won ? 'w' : 'l'}">${champ ? 'Swiss champions!' : L.won ? (L.walkoff ? 'Walk-off win' : 'Victory') : 'Defeat'}</h2>
        <div class="score">${badge(L.away, 34)}<span>${L.away === C.club ? L.my : L.them}–${L.home === C.club ? L.my : L.them}</span>${badge(L.home, 34)}</div></div>
      ${lineScore(L.line, L.H, L.away, L.home, L.innings)}
      <section class="card" style="display:grid;gap:10px"><div class="eyebrow">Top performers</div><div class="stars3">${top}</div></section>
      ${L.lv.length ? `<section class="card" style="display:grid;gap:10px"><div class="eyebrow">Training points earned</div><div class="lvl">${L.lv.map(l => `<span>${short(getP(l.id))} +${l.n}</span>`).join('')}</div></section>` : ''}
      <section class="card" style="display:flex;justify-content:space-between;align-items:center"><span>Credits earned</span><b style="color:var(--amber);font-size:20px">◆ ${L.cr}</b></section>
      ${L.phase === 'over' && !champ ? `<p class="card" style="margin:0">${{ semi: 'Your season ends in the semifinal.', runnerup: 'So close. You fall in the Swiss Final.', missed: 'The season is over.' }[L.outcome] || ''}</p>` : ''}
      ${L.phase === 'playoffs' && C.po && C.po.stage === 'final' && L.label === 'Semifinal' ? `<p class="card" style="margin:0">You're through to the Swiss Final against the ${teamInfo(C.po.final.home === C.club ? C.po.final.away : C.po.final.home).name}.</p>` : ''}
      ${C.phase === 'playoffs' && L.label.startsWith('Week') ? `<p class="card" style="margin:0">Regular season complete. You made the playoffs as the ${ordinal(C.po.seeds.indexOf(C.club) + 1)} seed!</p>` : ''}
      <button class="btn primary block" id="pCont" style="padding:15px;font-size:17px">Back to the clubhouse</button>
    </section>`;
    $('#pCont').onclick = () => { hubTab = 'next'; go('hub'); };
    if (champ) confetti();
  }
  function confetti() {
    if (REDUCED) return;
    const c = document.createElement('canvas'); c.id = 'confetti'; document.body.appendChild(c);
    const x = c.getContext('2d'), W = c.width = innerWidth, H = c.height = innerHeight;
    const cols = ['#f5b83d', '#6be39b', '#ffffff', teamInfo(C.club).c1, teamInfo(C.club).c2, '#ff6f5e'];
    const ps = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H * .5, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3, r: Math.random() * 6.28, vr: (Math.random() - .5) * .2, c: pick(cols), s: 5 + Math.random() * 6 }));
    let t0 = performance.now();
    const f = t => { x.clearRect(0, 0, W, H); for (const p of ps) { p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); } if (t - t0 < 4500) requestAnimationFrame(f); else c.remove(); };
    requestAnimationFrame(f);
  }

  /* =================== ROUTER =================== */
  function go(s) {
    screen = s; closeSheet(); window.scrollTo(0, 0);
    if (s === 'title') renderTitle(); else if (s === 'new') renderNew(); else if (s === 'hub') renderHub(); else if (s === 'game') renderGameScreen(); else if (s === 'post') renderPost();
  }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; const b = $('#tInstall'); if (b) b.hidden = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  /* ---------- PWA manifest built at runtime (keeps the app a single file) ---------- */
  (function manifest() {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
      x.fillStyle = '#0c1611'; x.fillRect(0, 0, 512, 512);
      x.fillStyle = '#367a43'; x.beginPath(); x.moveTo(256, 430); x.lineTo(70, 244); x.quadraticCurveTo(256, 20, 442, 244); x.closePath(); x.fill();
      x.fillStyle = '#c27a4b'; x.beginPath(); x.arc(256, 350, 82, 0, 7); x.fill();
      x.fillStyle = '#3d8549'; x.beginPath(); x.moveTo(256, 418); x.lineTo(316, 358); x.lineTo(256, 298); x.lineTo(196, 358); x.closePath(); x.fill();
      x.fillStyle = '#f7f4ea'; x.beginPath(); x.arc(256, 180, 62, 0, 7); x.fill();
      x.strokeStyle = '#d1453b'; x.lineWidth = 7; x.setLineDash([10, 8]); x.beginPath(); x.arc(176, 180, 62, -.75, .75); x.stroke(); x.beginPath(); x.arc(336, 180, 62, Math.PI - .75, Math.PI + .75); x.stroke();
      const icon = c.toDataURL('image/png');
      const start = location.href.split('#')[0];
      const m = { name: 'Tactical Baseball', short_name: 'Tactical BB', description: 'Swiss league baseball strategy game', start_url: start, scope: start.replace(/[^/]*$/, ''), display: 'standalone', orientation: 'portrait', background_color: '#0c1611', theme_color: '#0c1611', icons: [{ src: icon, sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: icon, sizes: '192x192', type: 'image/png', purpose: 'any' }] };
      const l = document.createElement('link'); l.rel = 'manifest'; l.href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(m)); document.head.appendChild(l);
      const a = document.createElement('link'); a.rel = 'apple-touch-icon'; a.href = icon; document.head.appendChild(a);
      const fi = document.createElement('link'); fi.rel = 'icon'; fi.href = icon; document.head.appendChild(fi);
    } catch (e) { }
  })();

  load();
  go('title');
  window.__DT = { go, doPitch, askSend, get busy() { return busy; } };
})();
