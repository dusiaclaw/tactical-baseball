'use strict';
/* =====================================================================
   TACTICAL BASEBALL — UI (dice board edition)
   ===================================================================== */
(function () {
  const $ = s => document.querySelector(s);
  const app = $('#app');
  let screen = 'title', hubTab = 'next', busy = false, sheetLocked = false, installEvt = null;
  let phase = null; // null | {kind:'reroll', role, dice, tactic, resolve}
  let lastRoll = null; // {dice, tactic, src, idx, code}
  const newOpts = { club: 'ZHE', innings: 3, diff: 'pro', confirm: false };
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SET_KEY = 'tb-settings', NAMES_KEY = 'tb-real-names', NAMES_URL = 'https://www.easyscore.com/stats/2026/10143/0/off';
  const SET = Object.assign({ sound: true, vibrate: true, speed: 'normal', accent: 'amber', board: 'day', cards: 'classic', odds: true, names: 'fictional', cardInfo: false }, (() => { try { return JSON.parse(localStorage.getItem(SET_KEY) || '{}'); } catch (e) { return {}; } })());
  function saveSet() { try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); } catch (e) { } applyLook(); }
  function applyLook() { const r = document.documentElement; r.dataset.accent = SET.accent; r.dataset.board = SET.board; r.dataset.cards = SET.cards; }
  applyLook();
  const SPEED = () => (SET.speed === 'fast' ? .55 : 1) * (REDUCED ? .4 : 1);
  let backTo = 'title';
  const sleep = ms => new Promise(r => setTimeout(r, ms * SPEED()));
  const tween = (ms, fn) => new Promise(res => { const d = Math.max(1, ms * SPEED()), t0 = performance.now(); const f = t => { const k = Math.min(1, (t - t0) / d); fn(k); k < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const short = p => `${p.first[0]}. ${p.last}`;
  const RLAB = { con: 'CON', pow: 'POW', spd: 'SPD', eye: 'EYE', stu: 'STU', ctl: 'CTL', sta: 'STA' };
  const RDESC = { con: 'more singles, fewer strikeouts', pow: 'more doubles and home runs', spd: 'triples, steals, scoring from first and second', eye: 'more walks', stu: 'more strikeouts, fewer hits', ctl: 'fewer walks', sta: 'batters faced before the card wears down' };
  const ICON_MENU = '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  const ICON_GEAR = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>';
  const ICON_BACK = '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>';
  const KIND = c => ({ HR: 'k-hr', '3B': 'k-xbh', '2B': 'k-xbh', '1B': 'k-hit', BB: 'k-bb', K: 'k-k', GB: 'k-out', FB: 'k-out', DP: 'k-dp' })[c];
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const pct = x => Math.round(x * 100) + '%';
  const ICON_BAT = '<path d="M8.5 33.5 L12 30 L29 10.5 C31 8 34 7.5 35.5 9 C37 10.5 36.5 13.5 34 15.5 L14.5 32.5 L11 36 Z"/><circle cx="7.6" cy="36.6" r="2.6"/>';
  const ICON_GLOVE = '<path d="M11 35 C7.5 29 7 21 9 15.5 C9.8 13 12.8 13 13.3 15.6 L14.2 21 L14.6 9.6 C14.8 6.6 18.6 6.4 18.9 9.4 L19.6 19.5 L20.6 8.2 C21 5.3 24.8 5.5 24.9 8.5 L24.9 19.8 L26.6 11.4 C27.3 8.8 30.7 9.4 30.4 12.2 L29.4 23 C30.8 20.6 33.6 19.6 35 21.2 C35.9 22.4 34.6 24.8 32.6 27.6 L27.6 35 Z"/><path d="M13 30.5 Q20 33 26.5 30.5" fill="none" stroke="var(--dc,#2457c5)" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>';
  const icon = (bat, size, color) => `<svg class="ico" viewBox="0 0 44 44" width="${size}" height="${size}" fill="${color || 'currentColor'}" aria-hidden="true">${bat ? ICON_BAT : ICON_GLOVE}</svg>`;

  /* ---------- persistence ---------- */
  function save() { if (!C || TUT) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(C)); } catch (e) { toast('Could not save. Browser storage is full or blocked.'); } }
  function load() {
    try { const s = localStorage.getItem(SAVE_KEY); if (!s) return false; const c = JSON.parse(s); if (!c || c.v !== 2 || !c.teams) return false; C = c; G = C.game; indexPlayers(); return true; }
    catch (e) { return false; }
  }
  function loadSaved() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } }
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  let toastT = null;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }

  /* ---------- sound ---------- */
  const SFX = {
    ctx: null, nb: null,
    init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); const n = this.ctx.sampleRate; this.nb = this.ctx.createBuffer(1, n, n); const d = this.nb.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; } catch (e) { this.ctx = null; } },
    noise(dur, f, q, vol, type, at) { const a = this.ctx, s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + (at || 0); s.buffer = this.nb; fl.type = type || 'bandpass'; fl.frequency.value = f; fl.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(fl); fl.connect(g); g.connect(a.destination); s.start(t); s.stop(t + dur + .05); },
    tone(f1, f2, dur, vol, type, at) { const a = this.ctx, o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (at || 0); o.type = type || 'sine'; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05); },
    play(k) {
      if (!SET.sound) return; this.init(); if (!this.ctx) return;
      try {
        if (k === 'dice') { for (let i = 0; i < 5; i++) { this.noise(.035, 2200 + Math.random() * 1500, 2, .35, 'bandpass', i * .07 + Math.random() * .03); } }
        else if (k === 'crack') { this.noise(.09, 2600, .8, .9, 'highpass'); this.tone(900, 300, .05, .25, 'triangle'); }
        else if (k === 'pop') { this.noise(.07, 700, 1.4, .7); this.tone(160, 70, .08, .3); }
        else if (k === 'thud') this.tone(120, 50, .16, .35);
        else if (k === 'gem') { this.tone(1200, 1800, .12, .12, 'triangle'); this.tone(1800, 2400, .1, .08, 'triangle', .08); }
        else if (k === 'tap') this.tone(660, 520, .05, .08, 'triangle');
        else if (k === 'cheer') { const a = this.ctx, s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime; s.buffer = this.nb; s.loop = true; fl.type = 'bandpass'; fl.frequency.value = 1100; fl.Q.value = .6; g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(.35, t + .35); g.gain.exponentialRampToValueAtTime(.001, t + 1.9); s.connect(fl); fl.connect(g); g.connect(a.destination); s.start(t); s.stop(t + 2); }
        else if (k === 'organ') { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, .16, .12, 'square', i * .13)); }
      } catch (e) { }
    }
  };
  const buzz = ms => { if (!SET.vibrate) return; try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };

  /* ---------- shared graphics ---------- */
  function badge(id, size) {
    const t = teamInfo(id), one = t.badge.length === 1;
    return `<svg class="bdg" viewBox="0 0 40 44" width="${size}" height="${Math.round(size * 1.1)}" aria-hidden="true"><path d="M20 2L37 8V22C37 33 29 39 20 42C11 39 3 33 3 22V8Z" fill="${t.c1}" stroke="${t.c2}" stroke-width="2.6"/><text x="20" y="${one ? 31 : 27.5}" text-anchor="middle" font-family="Graduate, Georgia, serif" font-size="${one ? 22 : 14}" fill="${t.c2}">${t.badge}</text></svg>`;
  }
  const starsFor = str => { const n = clamp(Math.round((str - 4.4) * 2.4), 1, 5); return `<span class="stars" aria-label="${n} of 5">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`; };
  const ovrTag = p => { const o = ovr(p); return `<span class="ovr ${o >= 7 ? 'hi' : ''}">${o.toFixed(1)}</span>`; };
  const keyRatings = p => { const r = R(p); return p.kind === 'P' ? `STU ${r.stu} · CTL ${r.ctl} · STA ${r.sta}` : `CON ${r.con} · POW ${r.pow} · SPD ${r.spd} · EYE ${r.eye}`; };
  const handTag = p => p.kind === 'P' ? (p.hand === 'R' ? 'RHP' : 'LHP') : `Bats ${p.hand}`;
  function stripHTML(card, opt) {
    opt = opt || {};
    return `<div class="${opt.mini ? 'mini' : 'strip'}">${card.map((c, i) => { const s = i + 2; const cls = [KIND(c)]; if (W[s] <= 2) cls.push('nar'); if (opt.pick === i) cls.push('pick'); if (opt.base && opt.base[i] !== c) cls.push(opt.mark || 'chg'); return `<div class="cell ${cls.join(' ')}" style="--w:${W[s] + 2}"><span class="s">${s}</span><b>${OUTCOME[c].short}</b></div>`; }).join('')}</div>`;
  }
  function cardSummary(card) { const o = cardOdds(card); let ob = 0; for (const k of ['HR', '3B', '2B', '1B', 'BB']) ob += o[k] || 0; return { ob, hr: o.HR || 0, k: o.K || 0 }; }
  function dieHTML(v, opt) {
    opt = opt || {};
    const face = opt.card && v;
    const pips = v && !face ? PIPS[v] : [];
    return `<button class="die ${opt.card ? 'card' : ''} ${opt.cls || ''}" ${opt.idx != null ? `data-die="${opt.idx}"` : ''} style="${opt.color ? `--dc:${opt.color}` : ''}" ${opt.disabled ? 'tabindex="-1"' : ''} aria-label="${opt.aria || (face ? (v <= 3 ? 'bat' : 'glove') : 'die ' + (v || ''))}">${face ? icon(v <= 3, 40, '#fff') : Array.from({ length: 9 }, (_, i) => `<i class="${pips.includes(i) ? 'on' : ''}"></i>`).join('')}${!v ? '<span class="q">?</span>' : ''}${opt.lab ? `<span class="lab ${opt.labCls || ''}">${opt.lab}</span>` : ''}</button>`;
  }

  /* =================== TITLE =================== */
  function renderTitle() {
    const saved = hasSave() && (C || load());
    const sub = saved && C ? `${teamInfo(C.club).name} · Season ${C.season}${C.phase === 'season' ? ` · Week ${Math.min(C.week + 1, C.schedule.length)}` : C.phase === 'playoffs' ? ' · Playoffs' : ' · Season over'}` : '';
    app.innerHTML = `<section class="title wrap">
      <div class="art">${titleArt()}</div>
      <h1>Tactical<span>Baseball</span></h1>
      <p class="tag">Dice, cards and nerve. Swiss league edition.</p>
      <div class="menu">
        ${saved ? `<button class="btn primary" id="tContinue">Continue<small>${sub}</small></button>` : ''}
        <button class="btn ${saved ? '' : 'primary'}" id="tNew">New campaign</button>
        <div class="row2"><button class="btn" id="tTut">Tutorial</button><button class="btn" id="tHow">How to play</button><button class="btn" id="tSet">Settings</button></div>
        <button class="btn ghost" id="tInstall" ${installEvt ? '' : 'hidden'}>Install on this phone</button>
      </div>
      <p class="foot">Fan-made game inspired by the Swiss baseball leagues. Not affiliated with or endorsed by the SBSF or any club. ${realNamesOn() ? 'Player names come from public league stats, stored only on this device.' : 'All players are fictional.'} <button class="verlink" id="tVer">v${VERSION} · Changelog</button></p>
    </section>`;
    if (saved) $('#tContinue').onclick = () => { SFX.init(); go('hub'); };
    $('#tNew').onclick = () => { newOpts.confirm = false; go('new'); };
    $('#tHow').onclick = howTo;
    $('#tTut').onclick = startTutorial; $('#tVer').onclick = changelogSheet;
    $('#tSet').onclick = () => openSettings('title');
    $('#tInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) { } installEvt = null; $('#tInstall').hidden = true; };
  }
  function titleArt() {
    const die = (x, y, r, v, fill, pip) => { const P = [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]; return `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-34" y="-34" width="68" height="68" rx="14" fill="${fill}" stroke="#0004" stroke-width="2"/>${PIPS[v].map(i => `<circle cx="${P[i][0] * 18}" cy="${P[i][1] * 18}" r="7" fill="${pip}"/>`).join('')}</g>`; };
    return `<svg viewBox="0 0 400 400" aria-hidden="true">
      <circle cx="200" cy="200" r="190" fill="#14261b" stroke="#26402f" stroke-width="2"/>
      <path d="M200 330 L320 210 L200 90 L80 210 Z" fill="#c27a4b"/><path d="M200 300 L290 210 L200 120 L110 210 Z" fill="#367a43"/>
      <g fill="#f7f4ea">${[[320, 210], [200, 90], [80, 210]].map(([x, y]) => `<rect x="${x - 9}" y="${y - 9}" width="18" height="18" transform="rotate(45 ${x} ${y})"/>`).join('')}<path d="M190 322h20v10l-10 9l-10-9z"/></g>
      <g class="orb"><g transform="translate(120 260) rotate(-14)"><rect x="-34" y="-34" width="68" height="68" rx="14" fill="#2457c5" stroke="#0004" stroke-width="2"/><g transform="translate(-26 -26) scale(1.18)" fill="#fff">${ICON_BAT}</g></g></g>
      ${die(205, 215, 8, 6, '#f6f1e3', '#1b1b1b')}${die(285, 270, 22, 4, '#f6f1e3', '#1b1b1b')}
    </svg>`;
  }

  /* =================== NEW CAMPAIGN =================== */
  function renderNew() {
    const existing = hasSave();
    app.innerHTML = `<section class="page wrap">
      <div style="display:flex;gap:10px;align-items:center"><button class="iconbtn" id="nBack" aria-label="Back">${ICON_BACK}</button><div class="eyebrow">New campaign</div></div>
      <div><h2>Pick your club</h2><p class="lede">Play a 7-week season against the other seven clubs, then the top four meet in the playoffs. Clubs with fewer stars have weaker player cards to start with.</p></div>
      <div class="teamgrid" id="nTeams">${TEAMS.map(t => `<button class="tteam ${t.id === newOpts.club ? 'on' : ''}" data-id="${t.id}"><span class="r1">${badge(t.id, 30)}<span><b>${t.name}</b><small>${t.city}</small></span></span>${starsFor(t.str)}</button>`).join('')}</div>
      <div class="opt"><div class="eyebrow">Game length</div><div class="chips" id="nInn">${[3, 5, 7].map(n => `<button class="chip ${newOpts.innings === n ? 'on' : ''}" data-n="${n}">${n} innings</button>`).join('')}</div><p class="muted" style="margin:0;font-size:13px">About ${({ 3: '3–4', 5: '6', 7: '9' })[newOpts.innings]} minutes per game. You can change this later.</p></div>
      <div class="opt"><div class="eyebrow">Difficulty</div><div class="diffs" id="nDiff">
        ${[['rookie', 'Rookie', 'Weaker rivals. The bot rarely spends its momentum.'], ['pro', 'Pro', 'Even clubs. The bot spends momentum when the odds favour it.'], ['legend', 'Legend', 'Stronger clubs and a bot that never wastes a re-roll.']].map(([k, l, d]) => `<button class="diff ${newOpts.diff === k ? 'on' : ''}" data-d="${k}"><b>${l}</b><span>${d}</span></button>`).join('')}
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
      SFX.init(); newCampaign(newOpts); applyNames(); save(); hubTab = 'next'; go('hub');
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
      <div class="hubtop">${badge(C.club, 44)}<div class="nm"><h2>${t.city} ${t.name}</h2><p>${phaseTxt}</p></div><button class="iconbtn" id="hSet" aria-label="Settings">${ICON_GEAR}</button><button class="iconbtn" id="hHome" aria-label="Title screen">${ICON_MENU}</button></div>
      <div class="stats3"><div class="stat"><small>Record</small><b>${recordOf(C.club)}</b></div><div class="stat"><small>Club funds</small><b>Fr. ${C.credits}</b></div><div class="stat"><small>Titles</small><b>${C.titles}</b></div></div>
      <nav class="tabs" id="hTabs">${[['next', 'Next'], ['table', 'Table'], ['stats', 'Stats'], ['roster', 'Roster'], ['market', 'Market']].map(([k, l]) => `<button class="tab ${hubTab === k ? 'on' : ''}" data-t="${k}">${l}${k === 'roster' && tpTotal ? `<span class="tp">${tpTotal}</span>` : ''}</button>`).join('')}</nav>
    </div></header>
    <main class="hubbody wrap" id="hBody"></main>`;
    $('#hHome').onclick = () => go('title');
    $('#hSet').onclick = () => openSettings('hub');
    $('#hTabs').onclick = e => { const b = e.target.closest('.tab'); if (!b) return; hubTab = b.dataset.t; renderHub(); };
    ({ next: tabNext, table: tabTable, stats: tabStats, roster: tabRoster, market: tabMarket, club: tabClub, scout: tabMarket })[hubTab]($('#hBody'));
  }
  function tabNext(body) {
    let html = '';
    if (C.po) html += `<section class="card"><div class="eyebrow">Playoffs</div><div class="bracket" style="margin-top:8px">${bracketHTML()}</div></section>`;
    if (C.game) {
      const g = C.game;
      html += `<section class="card nextgame"><div class="eyebrow">Game in progress · ${g.label}</div>
        <div class="vsrow"><div class="side">${badge(g.away, 46)}<b>${teamInfo(g.away).name}</b><small class="num">${runsOf(g, 'away')} runs</small></div><div class="at">@</div><div class="side">${badge(g.home, 46)}<b>${teamInfo(g.home).name}</b><small class="num">${runsOf(g, 'home')} runs</small></div></div>
        <p class="muted" style="margin:0;text-align:center">${g.half === 0 ? 'Top' : 'Bottom'} of the ${ordinal(g.inning)} · ${g.outs} out${g.outs === 1 ? '' : 's'}</p>
        <button class="btn primary block" id="hPlay" style="padding:15px;font-size:17px">Resume game</button></section>`;
    } else if (C.phase === 'over') {
      const o = C.outcome, st = standings(), place = st.findIndex(r => r.id === C.club) + 1;
      const head = { champion: 'Swiss champions!', runnerup: 'Lost in the final', semi: 'Out in the semifinal', missed: 'Missed the playoffs' }[o] || 'Season complete';
      const champ = C.po && C.po.champ ? teamInfo(C.po.champ) : null;
      html += `<section class="card nextgame"><div class="eyebrow">Season ${C.season} complete</div>${o === 'champion' ? trophySVG() : ''}
        <h2 style="margin:0;font-family:var(--f-display);font-weight:400;font-size:28px;text-align:center">${head}</h2>
        <p class="muted" style="margin:0;text-align:center">Regular season ${recordOf(C.club)}, ${ordinal(place)} place.${champ && o !== 'champion' ? ` The ${champ.name} won the title.` : ''}</p>
        ${awardsHTML(C.hist[C.hist.length - 1])}
        <p style="margin:0;text-align:center;font-size:14px">Your players keep their cards and training points. Rivals get stronger over the winter, and you receive Fr. 100.</p>
        <button class="btn primary block" id="hNextSeason" style="padding:15px;font-size:17px">Start season ${C.season + 1}</button></section>`;
    } else {
      const ng = nextGame();
      const sp = side => { const t = C.teams[ng[side]]; return getP(t.rotation[t.nextSP % t.rotation.length]); };
      const me = ng.home === C.club ? 'home' : 'away';
      html += `<section class="card nextgame"><div class="eyebrow">${ng.label}${ng.label === 'Semifinal' ? ' · sudden death' : /^Swiss Final/.test(ng.label) ? ` · best of 3 · series ${seriesTxt()}` : ''}</div>
        <div class="vsrow"><div class="side">${badge(ng.away, 50)}<b>${teamInfo(ng.away).name}</b><small class="num">${recordOf(ng.away)}${ng.away === C.club ? ' · you' : ''}</small></div><div class="at">@</div><div class="side">${badge(ng.home, 50)}<b>${teamInfo(ng.home).name}</b><small class="num">${recordOf(ng.home)}${ng.home === C.club ? ' · you' : ''}</small></div></div>
        <div class="starters"><div><small>Your starter</small><b>${short(sp(me))}</b><span class="muted num" style="font-size:12px">${keyRatings(sp(me))}</span></div><div><small>Their starter</small><b>${short(sp(other(me)))}</b><span class="muted num" style="font-size:12px">${keyRatings(sp(other(me)))}</span></div></div>
        <button class="btn primary block" id="hPlay" style="padding:15px;font-size:17px">Play ball · ${C.innings} innings</button></section>`;
    }
    if (C.last) { const L = C.last; html += `<section class="card"><div class="eyebrow">Last game · ${L.label}</div><div class="lastres" style="margin-top:8px">${badge(L.opp, 26)}<span>${L.won ? '<span class="w">W</span>' : '<span class="l">L</span>'} <span class="num">${L.my}–${L.them}</span> ${L.home === C.club ? 'vs' : 'at'} ${teamInfo(L.opp).name}${L.walkoff ? ' · walk-off' : ''}</span></div></section>`; }
    const tp = C.teams[C.club].players.filter(p => p.tp > 0).length;
    if (tp && !C.game) html += `<section class="card" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span><b>${tp} player${tp > 1 ? 's have' : ' has'} training points</b><br><span class="muted" style="font-size:13px">Upgrade their cards in the Roster tab.</span></span><button class="btn small" id="hToRoster">Open roster</button></section>`;
    body.innerHTML = html;
    const p = $('#hPlay'); if (p) p.onclick = () => { SFX.init(); SFX.play('organ'); const fresh = !C.game; if (fresh) { startGame(); save(); } G = C.game; go('game'); if (fresh) matchupIntro(); };
    const n = $('#hNextSeason'); if (n) n.onclick = () => { startNextSeason(); save(); toast(`Season ${C.season} begins. Fr. 100 added.`); renderHub(); };
    const r = $('#hToRoster'); if (r) r.onclick = () => { hubTab = 'roster'; renderHub(); };
  }
  function seriesTxt() { const f = C.po && C.po.final; if (!f) return ''; const w = seriesWins(f), me = f.home === C.club || f.away === C.club ? C.club : f.home; const op = me === f.home ? f.away : f.home; return `${w[me]}–${w[op]}`; }
  function bracketHTML() {
    const po = C.po;
    const fin = f => {
      if (!f) return `<div class="bm"><span class="eyebrow" style="grid-column:1/-1">Swiss Final · best of 3</span><span class="muted" style="grid-column:1/-1">Waiting for the semifinal winners</span></div>`;
      const w = seriesWins(f), champ = f.res ? winnerOf(f) : null;
      const games = (f.games || []).map((g, i) => `<span class="gpill ${winnerOf(g) === C.club ? 'w' : (g.home === C.club || g.away === C.club) ? 'l' : ''}">G${i + 1} ${winnerOf(g)} ${Math.max(g.res.h, g.res.a)}–${Math.min(g.res.h, g.res.a)}</span>`).join('');
      return `<div class="bm final"><span class="eyebrow" style="grid-column:1/-1">Swiss Final · best of 3</span>${[f.home, f.away].map(id => `<span class="t ${champ === id ? 'win' : ''}">${badge(id, 18)}${teamInfo(id).name}${id === C.club ? ' (you)' : ''}${champ === id ? ' 🏆' : ''}</span><span class="s">${w[id]}</span>`).join('')}${games ? `<span class="gpills" style="grid-column:1/-1">${games}</span>` : ''}</div>`;
    };
    const m = (g, lbl) => {
      if (!g) return `<div class="bm"><span class="muted">${lbl}: waiting for semifinal winners</span></div>`;
      const w = g.res ? winnerOf(g) : null;
      return `<div class="bm"><span class="eyebrow" style="grid-column:1/-1">${lbl}</span>${[g.away, g.home].map(id => `<span class="t ${w === id ? 'win' : ''}">${badge(id, 18)}${teamInfo(id).name}${id === C.club ? ' (you)' : ''}</span><span class="s">${g.res ? (id === g.home ? g.res.h : g.res.a) : ''}</span>`).join('')}</div>`;
    };
    return m(po.semis[0], 'Semifinal 1 v 4 · sudden death') + m(po.semis[1], 'Semifinal 2 v 3 · sudden death') + fin(po.final);
  }
  function awardsHTML(h) {
    if (!h || !h.awards) return '';
    const a = h.awards, row = (lbl, x) => x ? `<div class="award">${badge(x.team, 26)}<span><small>${lbl}</small><b>${x.name}</b><i>${teamInfo(x.team).name} · ${x.line}</i></span></div>` : '';
    return `<div class="awards">${row('Season MVP', a.mvp)}${row('Best pitcher', a.pitcher)}</div>`;
  }
  function trophySVG() { return `<svg class="trophy" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="gold" x1="0" x2="1"><stop offset="0" stop-color="#b8860b"/><stop offset=".5" stop-color="#ffe08a"/><stop offset="1" stop-color="#b8860b"/></linearGradient></defs><path d="M34 14h52v18c0 20-12 34-26 34S34 52 34 32z" fill="url(#gold)"/><path d="M34 22H18c0 16 8 24 18 24M86 22h16c0 16-8 24-18 24" fill="none" stroke="#e0b44a" stroke-width="5"/><rect x="52" y="64" width="16" height="18" fill="#c99a2e"/><rect x="38" y="82" width="44" height="12" rx="3" fill="url(#gold)"/><rect x="30" y="94" width="60" height="12" rx="3" fill="#7a5a1a"/><circle cx="60" cy="34" r="10" fill="#f7f4ea"/><path d="M54 27q4 7 0 14M66 27q-4 7 0 14" stroke="#d1453b" stroke-width="1.4" fill="none"/></svg>`; }
  function tabTable(body) {
    const st = standings();
    let html = `${C.po ? `<section class="card"><div class="eyebrow">Playoffs</div><div class="bracket" style="margin-top:8px">${bracketHTML()}</div></section>` : ''}<section class="card"><div class="eyebrow">${C.po ? 'Final regular-season standings' : 'Standings'} · top four make the playoffs</div><table class="std" style="margin-top:6px"><thead><tr><th>Club</th><th>W</th><th>L</th><th>RD</th><th>GB</th></tr></thead><tbody>`;
    st.forEach((r, i) => { const gb = ((st[0].w - r.w) + (r.l - st[0].l)) / 2; html += `<tr class="${r.id === C.club ? 'me' : ''} ${i === 3 ? 'cut' : ''}"><td><span class="tname">${badge(r.id, 20)}${teamInfo(r.id).name}</span></td><td>${r.w}</td><td>${r.l}</td><td>${r.rs - r.ra > 0 ? '+' : ''}${r.rs - r.ra}</td><td>${gb ? gb.toFixed(1).replace('.0', '') : '–'}</td></tr>`; });
    html += `</tbody></table></section>`;
    const lastW = C.phase === 'season' ? C.week - 1 : C.schedule.length - 1;
    if (lastW >= 0) html += `<section class="card"><div class="eyebrow">Week ${lastW + 1} results</div><div class="bracket" style="margin-top:8px">${C.schedule[lastW].map(g => g.res ? `<div class="bm">${[g.away, g.home].map(id => `<span class="t ${winnerOf(g) === id ? 'win' : ''}">${badge(id, 18)}${teamInfo(id).name}</span><span class="s">${id === g.home ? g.res.h : g.res.a}</span>`).join('')}</div>` : '').join('')}</div></section>`;
    if (C.phase === 'season') {
      const up = []; for (let w = C.week; w < C.schedule.length; w++) { const g = C.schedule[w].find(x => x.home === C.club || x.away === C.club); const o = g.home === C.club ? g.away : g.home; up.push(`<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #22362b"><span class="muted num" style="width:58px">Week ${w + 1}</span>${badge(o, 20)}<span>${g.home === C.club ? 'vs' : 'at'} ${teamInfo(o).name}</span></div>`); }
      html += `<section class="card"><div class="eyebrow">Your schedule</div><div style="margin-top:4px">${up.join('')}</div></section>`;
    }
    body.innerHTML = html + '<div id="clubBox" style="display:grid;gap:14px"></div>';
    tabClub($('#clubBox'));
  }

  /* ---------- season statistics ---------- */
  let statsView = 'teams', statsWho = 'league', statsKind = 'bat', statsSort = null;
  const f3 = x => isFinite(x) ? x.toFixed(3).replace(/^0/, '') : '–';
  function teamTotals(id) {
    const t = { ab: 0, h: 0, hr: 0, bb: 0, pa: 0, k: 0, sb: 0, r: 0, po: 0, ra: 0, pk: 0, pbb: 0 };
    for (const p of C.teams[id].players) for (const k in t) t[k] += p.s[k] || 0;
    return t;
  }
  function tabStats(body) {
    const segs = `<div class="chips" id="stView">${[['teams', 'Teams'], ['players', 'Players']].map(([v, l]) => `<button class="chip ${statsView === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`;
    let cols, rows;
    if (statsView === 'teams') {
      const st = standings();
      cols = [['club', 'Club', 0], ['wl', 'W–L', 1], ['r', 'R', 1], ['ra', 'RA', 0], ['avg', 'AVG', 1], ['obp', 'OBP', 1], ['hr', 'HR', 1], ['pk', 'K', 1]];
      rows = st.map(r => { const t = teamTotals(r.id); return { id: r.id, me: r.id === C.club, club: `<span class="tname">${badge(r.id, 18)}${teamInfo(r.id).name}</span>`, wl: r.w - r.l, wlT: `${r.w}–${r.l}`, r: r.rs, ra: r.ra, avg: t.ab ? t.h / t.ab : 0, obp: t.pa ? (t.h + t.bb) / t.pa : 0, hr: t.hr, pk: t.pk }; });
    } else {
      const ids = statsWho === 'mine' ? [C.club] : TEAMS.map(t => t.id);
      const ps = []; for (const id of ids) for (const p of C.teams[id].players) if (p.kind === (statsKind === 'bat' ? 'H' : 'P')) ps.push({ p, team: id });
      if (statsKind === 'bat') {
        cols = [['name', 'Player', 0], ['pa', 'PA', 1], ['avg', 'AVG', 1], ['obp', 'OBP', 1], ['hr', 'HR', 1], ['rbi', 'RBI', 1], ['sb', 'SB', 1]];
        rows = ps.filter(x => x.p.s.pa > 0).map(({ p, team }) => ({ id: p.id, me: team === C.club, name: `<span class="tname">${badge(team, 16)}${short(p)}</span>`, pa: p.s.pa, avg: p.s.ab ? p.s.h / p.s.ab : 0, obp: p.s.pa ? (p.s.h + p.s.bb) / p.s.pa : 0, hr: p.s.hr, rbi: p.s.rbi, sb: p.s.sb, rate: p.s.pa >= 5 }));
      } else {
        cols = [['name', 'Pitcher', 0], ['ip', 'IP', 1], ['ra9', 'RA/9', -1], ['pk', 'K', 1], ['pbb', 'BB', -1]];
        rows = ps.filter(x => x.p.s.po > 0).map(({ p, team }) => ({ id: p.id, me: team === C.club, name: `<span class="tname">${badge(team, 16)}${short(p)}</span>`, ip: p.s.po / 3, ipT: `${p.s.po / 3 | 0}.${p.s.po % 3}`, ra9: p.s.ra * 27 / p.s.po, pk: p.s.pk, pbb: p.s.pbb, rate: p.s.po >= 6 }));
      }
    }
    const sk = statsSort && cols.some(c => c[0] === statsSort.k) ? statsSort : { k: cols[1][0], dir: cols[1][2] || 1 };
    const rateKeys = ['avg', 'obp', 'ra9'];
    rows.sort((a, b) => { if (rateKeys.includes(sk.k) && a.rate !== undefined && a.rate !== b.rate) return a.rate ? -1 : 1; const x = a[sk.k], y = b[sk.k]; return typeof x === 'string' ? x.localeCompare(y) : (y - x) * (sk.dir >= 0 ? 1 : -1); });
    const cell = (r, k) => k === 'wl' ? r.wlT : k === 'ip' ? r.ipT : ['avg', 'obp'].includes(k) ? f3(r[k]) : k === 'ra9' ? r[k].toFixed(2) : r[k];
    body.innerHTML = `<section class="card" style="display:grid;gap:10px">${segs}
      ${statsView === 'players' ? `<div class="chips" id="stWho">${[['league', 'League'], ['mine', 'My club']].map(([v, l]) => `<button class="chip ${statsWho === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div><div class="chips" id="stKind">${[['bat', 'Batting'], ['pit', 'Pitching']].map(([v, l]) => `<button class="chip ${statsKind === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>` : ''}
      ${rows.length ? `<div class="box"><table class="std stats"><thead><tr>${cols.map(([k, l]) => `<th data-k="${k}" class="${sk.k === k ? 'sorted' : ''}">${l}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, 60).map(r => `<tr class="${r.me ? 'me' : ''}">${cols.map(([k]) => `<td>${cell(r, k)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0">No games played yet this season.</p>'}
      <p class="muted" style="margin:0;font-size:12px">Tap a column to sort. ${statsView === 'players' ? 'Rate stats need 5 PA or 2 IP to rank.' : 'K = strikeouts by the club\'s pitchers.'}</p></section>`;
    const seg = (id, fn) => { const el = $('#' + id); if (el) el.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; fn(b.dataset.v); statsSort = null; tabStats(body); }; };
    seg('stView', v => statsView = v); seg('stWho', v => statsWho = v); seg('stKind', v => statsKind = v);
    body.querySelectorAll('th[data-k]').forEach(th => th.onclick = () => { const c = cols.find(x => x[0] === th.dataset.k); if (!c[2]) return; statsSort = { k: c[0], dir: sk.k === c[0] ? -sk.dir : c[2] }; tabStats(body); });
  }

  /* ---------- roster ---------- */
  const GRIP = '<span class="grip" data-grip aria-label="Drag to move"><svg viewBox="0 0 12 18" width="12" height="18"><g fill="currentColor"><circle cx="3" cy="3" r="1.6"/><circle cx="9" cy="3" r="1.6"/><circle cx="3" cy="9" r="1.6"/><circle cx="9" cy="9" r="1.6"/><circle cx="3" cy="15" r="1.6"/><circle cx="9" cy="15" r="1.6"/></g></svg></span>';
  function tabRoster(body) {
    const t = C.teams[C.club], locked = !!C.game;
    const row = (p, ord, posTxt, extra, drag) => `<div class="prow" role="button" tabindex="0" data-id="${p.id}" ${drag && !locked ? 'data-drop' : ''}>${drag && !locked ? GRIP : `<span class="ord">${ord ?? ''}</span>`}<span class="pos">${posTxt || posLabel(p.pos)}</span><span class="pn"><b>${drag && !locked && ord ? `<span class="muted">${ord}.</span> ` : ''}${short(p)}${extra || ''}${p.inj > 0 ? `<span class="injtag">INJ ${p.inj}</span>` : ''}</b><small>Lv ${levelOf(p)} · ${keyRatings(p)}</small></span>${p.tp ? `<span class="tp">${p.tp}</span>` : '<span></span>'}${ovrTag(p)}</div>`;
    const nextSP = t.rotation[t.nextSP % t.rotation.length];
    body.innerHTML = `
      ${locked ? `<p class="card" style="margin:0;font-size:14px">A game is in progress. Lineup changes apply from the next game; use pinch hitters and the bullpen during play.</p>` : ''}
      <div class="sect"><h3><span>Batting order</span>${locked ? '<span>OVR</span>' : '<button class="btn small" id="rOpt">Optimize order</button>'}</h3>${t.lineup.map((sl, i) => row(getP(sl.id), i + 1, sl.pos, '', true)).join('')}</div>
      <div class="sect"><h3><span>Bench</span></h3>${t.bench.map(id => row(getP(id), '', null, '', true)).join('')}</div>
      <div class="sect"><h3><span>Rotation</span></h3>${t.rotation.map((id, i) => row(getP(id), i + 1, 'SP', id === nextSP ? '<span class="nxt">NEXT</span>' : '')).join('')}</div>
      <div class="sect"><h3><span>Bullpen</span></h3>${t.pen.map(id => row(getP(id), '', 'RP')).join('')}</div>
      <p class="muted" style="margin:0;font-size:13px;line-height:1.45">${locked ? '' : 'Drag the dots to change the batting order or swap a starter with a bench player. '}Tap a player for his card, gear, moves and training.</p>`;
    body.onclick = e => { if (e.target.closest('[data-grip]')) return; const b = e.target.closest('.prow'); if (b) playerSheet(b.dataset.id); };
    const opt = $('#rOpt'); if (opt) opt.onclick = () => { t.lineup = optimizeOrder(t); save(); SFX.play('gem'); toast('Batting order optimized: on-base at the top, power in the middle.'); renderHub(); };
    if (!locked) bindDrag(body, t);
  }
  function optimizeOrder(t) {
    const ps = t.lineup.map(sl => { const p = getP(sl.id), c = cardOdds(batterCard(p, 'swing')); const ob = ['HR', '3B', '2B', '1B', 'BB'].reduce((a, k) => a + (c[k] || 0), 0); return { sl, ob, pw: (c.HR || 0) * 3 + (c['2B'] || 0) * 1.5 + (c['3B'] || 0) * 2, spd: R(p).spd }; });
    const take = f => { ps.sort((a, b) => f(b) - f(a)); return ps.shift(); };
    const o = [take(x => x.ob * 10 + x.spd * .15), take(x => x.ob * 10 + x.pw * 2), take(x => x.ob * 10 + x.pw * 6), take(x => x.pw * 10 + x.ob * 3), take(x => x.pw * 8 + x.ob * 4)];
    ps.sort((a, b) => (b.ob * 10 + b.pw * 4) - (a.ob * 10 + a.pw * 4));
    return [...o, ...ps].map(x => x.sl);
  }
  function bindDrag(body, t) {
    let d = null;
    body.onpointerdown = e => {
      const g = e.target.closest('[data-grip]'); if (!g) return;
      const row = g.closest('.prow'), r = row.getBoundingClientRect();
      e.preventDefault();
      const ghost = row.cloneNode(true); ghost.classList.add('ghost'); Object.assign(ghost.style, { width: r.width + 'px', left: r.left + 'px', top: r.top + 'px' });
      document.body.appendChild(ghost); row.classList.add('dragging');
      d = { row, ghost, id: row.dataset.id, dy: e.clientY - r.top, over: null };
      g.setPointerCapture(e.pointerId); SFX.play('tap');
    };
    body.onpointermove = e => {
      if (!d) return;
      d.ghost.style.top = (e.clientY - d.dy) + 'px';
      if (e.clientY < 70) window.scrollBy(0, -10); else if (e.clientY > innerHeight - 70) window.scrollBy(0, 10);
      const el = document.elementFromPoint(e.clientX, e.clientY), tgt = el && el.closest('.prow[data-drop]');
      if (d.over && d.over !== tgt) d.over.classList.remove('over');
      d.over = tgt && tgt !== d.row ? tgt : null; if (d.over) d.over.classList.add('over');
    };
    const end = () => {
      if (!d) return;
      const { ghost, row, id, over } = d; d = null;
      ghost.remove(); row.classList.remove('dragging'); if (over) over.classList.remove('over');
      if (!over) return;
      const a = id, b = over.dataset.id;
      const la = t.lineup.findIndex(x => x.id === a), lb = t.lineup.findIndex(x => x.id === b), ba = t.bench.indexOf(a), bb = t.bench.indexOf(b);
      if (la >= 0 && lb >= 0) { const [m] = t.lineup.splice(la, 1); t.lineup.splice(lb, 0, m); }
      else if (la >= 0 && bb >= 0) { t.bench[bb] = a; t.lineup[la] = { id: b, pos: t.lineup[la].pos }; }
      else if (ba >= 0 && lb >= 0) { t.bench[ba] = b; t.lineup[lb] = { id: a, pos: t.lineup[lb].pos }; }
      else if (ba >= 0 && bb >= 0) { [t.bench[ba], t.bench[bb]] = [t.bench[bb], t.bench[ba]]; }
      save(); SFX.play('gem'); renderHub();
    };
    body.onpointerup = end; body.onpointercancel = end;
  }
  function playerSheet(id) {
    const p = getP(id), t = C.teams[C.club];
    const li = t.lineup.findIndex(s => s.id === id), bi = t.bench.indexOf(id), ri = t.rotation.indexOf(id), pi = t.pen.indexOf(id);
    const locked = !!C.game;
    const keys = p.kind === 'P' ? ['stu', 'ctl', 'sta'] : ['con', 'pow', 'spd', 'eye'];
    const s = p.s;
    const card = p.kind === 'P' ? pitcherCard(p, 0) : batterCard(p, 'swing'), sm = cardSummary(card);
    const line = p.kind === 'P' ? `${s.pg} G · ${(s.po / 3 | 0)}.${s.po % 3} IP · ${s.ra} R · ${s.pk} K · ${s.pbb} BB` : `${s.g} G · ${s.h}-for-${s.ab} (${s.ab ? (s.h / s.ab).toFixed(3).replace(/^0/, '') : '.000'}) · ${s.hr} HR · ${s.rbi} RBI · ${s.sb} SB`;
    let acts = '';
    if (!locked) {
      if (li >= 0) {
        acts += `<div class="row2"><button class="btn small" data-a="up" ${li === 0 ? 'disabled' : ''}>Bat earlier</button><button class="btn small" data-a="down" ${li === 8 ? 'disabled' : ''}>Bat later</button></div>`;
        acts += `<div class="eyebrow">Swap with a bench player</div><div class="list">${t.bench.map(b => { const q = getP(b), qs = cardSummary(batterCard(q, 'swing')); return `<button class="opt" data-a="bench" data-x="${b}"><span><b>${short(q)}</b> takes over at ${t.lineup[li].pos}<small>${keyRatings(q)} · on base ${pct(qs.ob)} on his card</small></span>${ovrTag(q)}</button>`; }).join('')}</div>`;
      } else if (bi >= 0) {
        acts += `<div class="eyebrow">Start in place of</div><div class="list">${t.lineup.map(sl => { const q = getP(sl.id); return `<button class="opt" data-a="start" data-x="${sl.id}"><span><b>${short(q)}</b> (${sl.pos})<small>${keyRatings(q)}</small></span>${ovrTag(q)}</button>`; }).join('')}</div>`;
      } else if (ri >= 0) {
        acts += `<div class="row2"><button class="btn small" data-a="nextsp" ${t.rotation[t.nextSP % t.rotation.length] === id ? 'disabled' : ''}>Start the next game</button></div>`;
        acts += `<div class="eyebrow">Swap roles with a reliever</div><div class="list">${t.pen.map(x => { const q = getP(x); return `<button class="opt" data-a="role" data-x="${x}"><span><b>${short(q)}</b> to the rotation<small>${keyRatings(q)}</small></span>${ovrTag(q)}</button>`; }).join('')}</div>`;
      } else if (pi >= 0) {
        acts += `<div class="eyebrow">Swap roles with a starter</div><div class="list">${t.rotation.map(x => { const q = getP(x); return `<button class="opt" data-a="role" data-x="${x}"><span><b>${short(q)}</b> to the bullpen<small>${keyRatings(q)}</small></span>${ovrTag(q)}</button>`; }).join('')}</div>`;
      }
    }
    const xpIn = p.xp % XP_PER_TP, lvl = levelOf(p), er = R(p);
    const plan = movePlan(p).filter(m => !(p.moves || []).includes(m)), nextL = MOVE_LEVELS.find(L => L > lvl);
    const gearHTML = SLOTS[p.kind].map(sl => { const g = p.gear && GEAR[p.gear[sl]]; return `<button class="gslot ${g ? 'on' : ''}" data-slot="${sl}"><small>${SLOT_NAME[sl]}</small><b>${g ? g.name : 'Empty'}</b>${g ? `<i>${Object.entries(g.b).map(([k, v]) => `+${v} ${RLAB[k]}`).join(' ')}</i>` : ''}</button>`; }).join('');
    const movesHTML = (p.moves || []).map(m => `<div class="move"><b>${MOVES[m].name}</b><span>${MOVES[m].desc}</span></div>`).join('') + (plan.length && nextL && (p.moves || []).length < 4 ? `<div class="move next"><b>Lv ${nextL}: ${MOVES[plan[0]].name}</b><span>${MOVES[plan[0]].desc}</span></div>` : '');
    openSheet(`<div class="shhead"><div style="min-width:0"><div class="eyebrow">#${p.num} · ${posLabel(p.pos)} · ${handTag(p)}${p.inj > 0 ? ` · <span class="injtag">INJURED ${p.inj} GAME${p.inj > 1 ? 'S' : ''}</span>` : ''}</div><h3>${p.first} ${p.last}</h3><div style="display:flex;gap:6px;align-items:center;margin-top:5px"><span class="lvtag">Lv ${lvl}</span>${ovrTag(p)}</div></div><button class="iconbtn back" data-a="close" aria-label="Back">${ICON_BACK}</button></div>
      <div class="xpbar"><i style="width:${xpIn / XP_PER_TP * 100}%"></i></div>
      <div class="pcard"><div class="hd"><div class="who"><b>${p.kind === 'P' ? 'Pitcher card' : 'Batter card'}</b><small>${p.kind === 'P' ? `Outs ${pct(1 - sm.ob)} · strikeouts ${pct(sm.k)}${p.pos === 'SP' ? ` · tires after about ${Math.round(pitchCap(p))} batters` : ` · tires after about ${Math.round(pitchCap(p))} batters`}` : `On base ${pct(sm.ob)} · home run ${pct(sm.hr)} · strikeout ${pct(sm.k)}`}</small></div></div>${stripHTML(card)}</div>
      <div class="rbars">${keys.map(k => `<div class="rbar"><span class="k">${RLAB[k]}</span><span class="bar"><i style="width:${Math.min(100, p.r[k] * 10)}%"></i>${er[k] > p.r[k] ? `<i class="boost" style="width:${Math.min(100 - p.r[k] * 10, (er[k] - p.r[k]) * 10)}%"></i>` : ''}</span><span class="v">${p.r[k]}${er[k] > p.r[k] ? `<em>+${er[k] - p.r[k]}</em>` : ''}</span>${p.tp > 0 && p.r[k] < 10 ? `<button class="plus" data-train="${k}" aria-label="Train ${RLAB[k]}">+1</button>` : '<span></span>'}</div>`).join('')}</div>
      <p style="font-size:12.5px" class="muted">${keys.map(k => `<b style="color:var(--text)">${RLAB[k]}</b> ${RDESC[k]}`).join(' · ')}</p>
      <p style="font-size:13px" class="muted">${p.tp ? `<b style="color:var(--amber)">${p.tp} training point${p.tp > 1 ? 's' : ''}</b> to spend. ` : ''}${XP_PER_TP - xpIn} XP to level ${lvl + 1}. Each level gives a training point; levels ${MOVE_LEVELS.join(', ')} teach a new move.</p>
      <div class="eyebrow">Gear</div><div class="gear">${gearHTML}</div>
      <div class="eyebrow">Moves</div><div class="moves">${movesHTML || '<span class="muted" style="font-size:13px">No moves yet.</span>'}</div>
      <p style="font-size:14px"><span class="eyebrow">This season</span><br><span class="num">${line}</span></p>
      <button class="btn small" data-a="edit">Edit name and number</button>
      ${acts}
      <button class="btn block" data-a="close">Done</button>`, sh => {
      sh.onclick = e => {
        const gs = e.target.closest('[data-slot]'); if (gs) { gearSheet(id, gs.dataset.slot); return; }
        const tr = e.target.closest('[data-train]');
        if (tr) { const k = tr.dataset.train; if (p.tp > 0 && p.r[k] < 10) { p.r[k]++; p.tp--; SFX.play('gem'); save(); playerSheet(id); renderHub(); } return; }
        const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
        const a = b.dataset.a, x = b.dataset.x;
        if (a === 'close') { closeSheet(); return; }
        if (a === 'edit') { editPlayer(id); return; }
        if (a === 'up' || a === 'down') { const j = li + (a === 'up' ? -1 : 1); [t.lineup[li], t.lineup[j]] = [t.lineup[j], t.lineup[li]]; }
        if (a === 'bench') { const bj = t.bench.indexOf(x); t.bench[bj] = id; t.lineup[li] = { id: x, pos: t.lineup[li].pos }; }
        if (a === 'start') { const j = t.lineup.findIndex(sl => sl.id === x); t.bench[bi] = x; t.lineup[j] = { id, pos: t.lineup[j].pos }; }
        if (a === 'nextsp') t.nextSP = ri + Math.floor(t.nextSP / t.rotation.length) * t.rotation.length;
        if (a === 'role') { const q = getP(x); if (ri >= 0) { const j = t.pen.indexOf(x); t.rotation[ri] = x; t.pen[j] = id; p.pos = 'RP'; q.pos = 'SP'; } else { const j = t.rotation.indexOf(x); t.pen[pi] = x; t.rotation[j] = id; p.pos = 'SP'; q.pos = 'RP'; } }
        save(); closeSheet(); renderHub();
      };
    });
  }
  function editPlayer(id) {
    const p = getP(id), t = C.teams[C.club];
    const clean = v => v.replace(/[<>&"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
    openSheet(`<h3>Edit player</h3>
      <label class="fld"><span>First name</span><input id="eFirst" maxlength="20" value="${p.first}" autocomplete="off"></label>
      <label class="fld"><span>Last name</span><input id="eLast" maxlength="20" value="${p.last}" autocomplete="off"></label>
      <label class="fld"><span>Number</span><input id="eNum" type="number" inputmode="numeric" min="0" max="99" value="${p.num}"></label>
      <p id="eMsg" class="muted" style="font-size:13px">Your edits are kept even if you switch between real and fictional names.</p>
      <div class="row2"><button class="btn" data-a="cancel">Cancel</button><button class="btn primary" data-a="save">Save</button></div>`, sh => {
      sh.onclick = e => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        if (b.dataset.a === 'cancel') { playerSheet(id); return; }
        const first = clean($('#eFirst').value), last = clean($('#eLast').value), num = parseInt($('#eNum').value, 10);
        const msg = $('#eMsg');
        if (!first || !last) { msg.textContent = 'Enter a first and last name.'; msg.style.color = '#ffb2a8'; return; }
        if (!(num >= 0 && num <= 99)) { msg.textContent = 'Use a number from 0 to 99.'; msg.style.color = '#ffb2a8'; return; }
        const clash = t.players.find(q => q !== p && q.num === num);
        if (clash) { msg.textContent = `#${num} is already worn by ${clash.first} ${clash.last}.`; msg.style.color = '#ffb2a8'; return; }
        p.first = first; p.last = last; p.num = num; p.custom = true;
        save(); SFX.play('tap'); toast('Player updated.'); playerSheet(id); renderHub();
      };
    });
  }
  function gearSheet(pid, slot) {
    const p = getP(pid), cur = p.gear && p.gear[slot];
    const owned = [...new Set((C.inv || []).filter(k => GEAR[k].slot === slot))];
    openSheet(`<h3>${SLOT_NAME[slot]} for ${short(p)}</h3>
      ${cur ? `<p>Wearing <b>${GEAR[cur].name}</b>.</p>` : ''}
      <div class="list">${owned.map(k => { const g = GEAR[k], n = C.inv.filter(x => x === k).length; return `<button class="opt" data-eq="${k}"><span><b>${g.name}</b><small>${Object.entries(g.b).map(([s2, v]) => `+${v} ${RLAB[s2]}`).join(' · ')} · ${n} in the locker</small></span><span class="chip">Equip</span></button>`; }).join('') || `<p class="muted" style="margin:0">Nothing in the locker for this slot. Buy gear in the Market tab.</p>`}</div>
      <div class="row2">${cur ? '<button class="btn" data-a="off">Take it off</button>' : ''}<button class="btn" data-a="market">Go to Market</button><button class="btn primary" data-a="back">Done</button></div>`, sh => {
      sh.onclick = e => {
        const eq = e.target.closest('[data-eq]'); if (eq) { equipGear(pid, eq.dataset.eq); save(); SFX.play('gem'); playerSheet(pid); renderHub(); return; }
        const b = e.target.closest('[data-a]'); if (!b) return;
        if (b.dataset.a === 'off') { unequipGear(pid, slot); save(); playerSheet(pid); renderHub(); }
        else if (b.dataset.a === 'market') { closeSheet(); hubTab = 'market'; renderHub(); }
        else playerSheet(pid);
      };
    });
  }
  function tabMarket(body) {
    const inv = C.inv || [];
    const item = k => { const g = GEAR[k], n = inv.filter(x => x === k).length; return `<div class="gitem"><div><small>${SLOT_NAME[g.slot]}</small><b>${g.name}</b><i>${Object.entries(g.b).map(([s2, v]) => `+${v} ${RLAB[s2]}`).join(' · ')}</i></div><button class="btn small ${C.credits >= g.cost ? 'primary' : ''}" data-buy="${k}" ${C.credits >= g.cost ? '' : 'disabled'}>Fr. ${g.cost}</button>${n ? `<span class="owned">×${n}</span>` : ''}</div>`; };
    body.innerHTML = `<p class="muted" style="margin:0;line-height:1.45">Club funds: <b style="color:var(--amber)">Fr. ${C.credits}</b>. Buy gear here, then equip it from a player's page in the Roster.</p>
      <section class="card" style="display:grid;gap:8px"><div class="eyebrow">Hitter gear</div><div class="glist">${Object.keys(GEAR).filter(k => GEAR[k].kind === 'H').map(item).join('')}</div></section>
      <section class="card" style="display:grid;gap:8px"><div class="eyebrow">Pitcher gear</div><div class="glist">${Object.keys(GEAR).filter(k => GEAR[k].kind === 'P').map(item).join('')}</div></section>
      <div class="eyebrow" style="margin-top:4px">Free agents</div><div id="faBox" style="display:grid;gap:14px"></div>`;
    body.onclick = e => { const b = e.target.closest('[data-buy]'); if (!b || b.disabled) return; if (buyGear(b.dataset.buy)) { save(); SFX.play('gem'); toast(`${GEAR[b.dataset.buy].name} is in the locker. Equip it from the Roster.`); renderHub(); } };
    tabScout($('#faBox'));
  }
  function tabScout(body) {
    const t = C.teams[C.club];
    body.innerHTML = `<p class="muted" style="margin:0;line-height:1.45">New free agents appear every week. Signing one replaces a player of the same type, who leaves the club. You have <b style="color:var(--amber)">Fr. ${C.credits}</b>. Wins pay Fr. 120 and losses Fr. 60, plus a bonus for runs.</p>
      ${C.fa.length ? C.fa.map(p => { const card = p.kind === 'P' ? pitcherCard(p, 0) : batterCard(p, 'swing'), sm = cardSummary(card); return `<section class="card facard"><div class="top"><div><div class="eyebrow">${p.kind === 'P' ? (p.pos === 'SP' ? 'Starting pitcher' : 'Reliever') : 'Position: ' + posLabel(p.pos)} · ${handTag(p)}</div><b>${p.first} ${p.last}</b><div class="muted num" style="font-size:12.5px">${keyRatings(p)}</div></div><div style="text-align:right">${ovrTag(p)}<div class="cost">Fr. ${p.cost}</div></div></div>
        <div class="pcard"><div class="hd"><div class="who"><small>${p.kind === 'P' ? `Outs ${pct(1 - sm.ob)} · strikeouts ${pct(sm.k)}` : `On base ${pct(sm.ob)} · home run ${pct(sm.hr)}`}</small></div></div>${stripHTML(card, { mini: true })}</div>
        <button class="btn ${C.credits >= p.cost && !C.game ? 'primary' : ''}" data-sign="${p.id}" ${C.credits >= p.cost && !C.game ? '' : 'disabled'}>${C.game ? 'Finish the current game first' : C.credits >= p.cost ? 'Sign' : `Need Fr. ${p.cost - C.credits} more`}</button></section>`; }).join('') : '<p class="card" style="margin:0">No free agents left this week.</p>'}`;
    body.onclick = e => {
      const b = e.target.closest('[data-sign]'); if (!b || b.disabled) return;
      const fa = C.fa.find(p => p.id === b.dataset.sign);
      const pool = t.players.filter(p => p.kind === fa.kind).sort((a, b2) => ovr(a) - ovr(b2));
      openSheet(`<h3>Sign ${fa.first} ${fa.last}?</h3><p>Pick who leaves to make room. ${fa.first} takes their spot.</p>
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
    body.innerHTML = `<section class="card"><div class="eyebrow">Club history</div><div class="seasons" style="margin-top:6px">
        <div><span>All-time record</span><b class="num">${C.allW}–${C.allL}</b></div><div><span>Swiss titles</span><b class="num">${C.titles}</b></div>
        ${C.hist.map(h => `<div><span>Season ${h.season}: ${h.w}–${h.l}, ${ordinal(h.place)}</span><b>${{ champion: 'Champions', runnerup: 'Final', semi: 'Semifinal', missed: 'No playoffs' }[h.outcome] || ''}</b></div>${h.awards && h.awards.mvp ? `<div style="border:0;padding-top:0;font-size:12.5px" class="muted"><span>MVP ${h.awards.mvp.name} (${teamInfo(h.awards.mvp.team).name})</span></div>` : ''}`).join('')}
      </div></section>
      <button class="btn block" id="cSet">Settings, look and backup</button><button class="btn block" id="cHow">How to play</button>`;
    $('#cSet').onclick = () => openSettings('hub');
    $('#cHow').onclick = howTo;
  }

  /* =================== SETTINGS =================== */
  function openSettings(from) { backTo = from; go('settings'); }
  function seg(id, cur, opts) { return `<div class="chips" id="${id}">${opts.map(([v, l]) => `<button class="chip ${String(cur) === String(v) ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`; }
  function changelogSheet() {
    openSheet(`<div class="eyebrow">Changelog</div><h3>Tactical Baseball v${VERSION}</h3>${CHANGELOG.map(c => `<div class="clog"><b>v${c[0]}</b> <span class="muted">${c[1]}</span><ul>${c[2].map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}<button class="btn block" data-a="close">Close</button>`, sh => sh.querySelector('[data-a="close"]').onclick = closeSheet);
  }
  function renderSettings() {
    const names = loadNames();
    const sw = (v, col, l) => `<button class="swatch ${SET.accent === v ? 'on' : ''}" data-v="${v}" style="--sw:${col}" aria-label="${l}"></button>`;
    app.innerHTML = `<section class="page wrap">
      <div style="display:flex;gap:10px;align-items:center"><button class="iconbtn" id="sBack" aria-label="Back">${ICON_BACK}</button><h2 style="font-size:26px">Settings</h2></div>
      ${C ? `<section class="card setlist"><div class="eyebrow">Gameplay</div>
        <div class="setrow"><span>Game length</span>${seg('sInn', C.innings, [[3, '3 inn'], [5, '5 inn'], [7, '7 inn']])}</div>
        <div class="setrow"><span>Difficulty</span>${seg('sDiff', C.diff, [['rookie', 'Rookie'], ['pro', 'Pro'], ['legend', 'Legend']])}</div></section>` : ''}
      <section class="card setlist"><div class="eyebrow">Look</div>
        <div class="setrow"><span>Accent colour</span><div class="chips" id="sAcc">${sw('amber', '#f5b83d', 'Amber')}${sw('red', '#ff5a5f', 'Swiss red')}${sw('ice', '#6cc4ff', 'Ice blue')}${sw('lime', '#b5e853', 'Lime')}</div></div>
        <div class="setrow"><span>Field</span>${seg('sBoard', SET.board, [['day', 'Home parks'], ['night', 'Night'], ['paper', 'Paper']])}</div>
        <div class="setrow"><span>Card colours</span>${seg('sCards', SET.cards, [['classic', 'Classic'], ['contrast', 'High contrast']])}</div></section>
      <section class="card setlist"><div class="eyebrow">Sound and feel</div>
        <div class="setrow"><span>Sound</span>${seg('sSnd', SET.sound, [[true, 'On'], [false, 'Off']])}</div>
        <div class="setrow"><span>Vibration</span>${seg('sVib', SET.vibrate, [[true, 'On'], [false, 'Off']])}</div>
        <div class="setrow"><span>Animations</span>${seg('sSpd', SET.speed, [['normal', 'Normal'], ['fast', 'Fast']])}</div>
        <div class="setrow"><span>Show odds</span>${seg('sOdds', SET.odds, [[true, 'On'], [false, 'Off']])}</div>
        <div class="setrow"><span>Level and rating on game cards</span>${seg('sMeta', SET.cardInfo, [[true, 'On'], [false, 'Off']])}</div></section>
      <section class="card setlist"><div class="eyebrow">Player names</div>
        <p class="muted" style="margin:0;font-size:13.5px;line-height:1.45">${names ? `Real names saved on this phone: ${names.count} players from ${Object.keys(names.teams).length} clubs (${new Date(names.at).toLocaleDateString()}).` : 'Using fictional names.'}</p>
        <div class="setrow"><span>Names in game</span>${seg('sNames', realNamesOn() ? 'real' : 'fictional', [['fictional', 'Fictional'], ['real', 'Real']])}</div>
        <button class="btn" id="sLoad">${names ? 'Update real names' : 'Load real names'}</button></section>
      <section class="card setlist"><div class="eyebrow">About</div><button class="btn" id="sLog">Changelog<small>What's new in v${VERSION}</small></button></section>
      <section class="card setlist"><div class="eyebrow">Backup</div>
        <p class="muted" style="margin:0;font-size:13.5px;line-height:1.45">One file with everything: campaign, rosters, stats, gear and purchases, club history, settings and imported names.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${C ? '<button class="btn" id="cExport" style="flex:1">Export backup</button>' : ''}<button class="btn" id="cImport" style="flex:1">Restore backup</button><input type="file" id="cFile" accept="application/json,.json" hidden></div>
        ${C ? '<button class="btn danger" id="cReset">Start a new campaign</button>' : ''}</section>
    </section>`;
    const bindSeg = (id, fn) => { const el = $('#' + id); if (el) el.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; fn(b.dataset.v); SFX.play('tap'); renderSettings(); }; };
    $('#sBack').onclick = () => go(backTo === 'game' && C && C.game ? 'game' : backTo === 'hub' && C ? 'hub' : 'title');
    bindSeg('sInn', v => { C.innings = +v; save(); }); bindSeg('sDiff', v => { C.diff = v; save(); });
    bindSeg('sAcc', v => { SET.accent = v; saveSet(); }); bindSeg('sBoard', v => { SET.board = v; saveSet(); }); bindSeg('sCards', v => { SET.cards = v; saveSet(); });
    bindSeg('sSnd', v => { SET.sound = v === 'true'; saveSet(); }); bindSeg('sVib', v => { SET.vibrate = v === 'true'; saveSet(); });
    bindSeg('sSpd', v => { SET.speed = v; saveSet(); }); bindSeg('sOdds', v => { SET.odds = v === 'true'; saveSet(); }); bindSeg('sMeta', v => { SET.cardInfo = v === 'true'; saveSet(); });
    bindSeg('sNames', v => { if (v === 'real' && !loadNames()) { namesSheet(); return; } SET.names = v; saveSet(); applyNames(); });
    $('#sLoad').onclick = namesSheet; $('#sLog').onclick = changelogSheet;
    if (C) $('#cReset').onclick = () => { newOpts.confirm = true; go('new'); };
    if (C) $('#cExport').onclick = () => {
      try {
        const file = { app: 'tactical-baseball', backup: 3, version: VERSION, at: new Date().toISOString(), campaign: C, settings: SET, names: loadNames() };
        const blob = new Blob([JSON.stringify(file)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `tactical-baseball-${teamInfo(C.club).name.toLowerCase()}-season${C.season}-week${C.week}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
        toast(`Backup saved: campaign, settings${file.names ? ', names' : ''}.`);
      } catch (e) { toast('Export failed on this device.'); }
    };
    $('#cImport').onclick = () => $('#cFile').click();
    $('#cFile').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const raw = JSON.parse(rd.result), full = raw && raw.backup && raw.campaign, c = full ? raw.campaign : raw;
          if (!c || c.v !== 2 || !c.teams || !c.club) throw 0;
          C = c; G = C.game; indexPlayers();
          if (full) {
            if (raw.settings && typeof raw.settings === 'object') Object.assign(SET, raw.settings);
            if (raw.names && raw.names.teams) { try { localStorage.setItem(NAMES_KEY, JSON.stringify(raw.names)); } catch (er) { } }
            saveSet();
          }
          applyNames(); save();
          const players = Object.keys(C.teams).reduce((n, k) => n + ((C.teams[k].players || C.teams[k].roster || []).length || 0), 0);
          const ok = !!(loadSaved() && loadSaved().club === C.club);
          toast(ok ? `Backup restored${full ? ' with settings and names' : ' (campaign only: old file)'}.` : 'Restored, but saving to this browser failed.');
          renderSettings();
        } catch (err) { toast('That file is not a Tactical Baseball backup.'); }
      };
      rd.readAsText(f);
    };
  }

  /* =================== REAL PLAYER NAMES =================== */
  const TEAM_KEYS = [[/eighters/i, 'ZHE'], [/flyers|therwil/i, 'THF'], [/cardinals|\bbern\b/i, 'BEC'], [/barracudas/i, 'ZHB'], [/challengers/i, 'ZHC'], [/eagles|luzern|lucerne/i, 'LUE'], [/frogs|sissach/i, 'SIF'], [/unicorns|h[uü]nenberg/i, 'HUU']];
  function loadNames() { try { const n = JSON.parse(localStorage.getItem(NAMES_KEY) || 'null'); return n && n.teams ? n : null; } catch (e) { return null; } }
  const realNamesOn = () => SET.names === 'real' && !!loadNames();
  function parseNames(raw) {
    let lines;
    if (/<table|<tr/i.test(raw)) {
      const doc = new DOMParser().parseFromString(raw, 'text/html');
      lines = [...doc.querySelectorAll('tr, h1, h2, h3, h4, caption')].map(r => [...r.children].length ? [...r.children].map(c => c.textContent.trim()).join('\t') : r.textContent.trim());
    } else lines = raw.split(/\r?\n/);
    const teams = {}; let cur = null;
    const W = "[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ'’\\-]+";
    const reComma = new RegExp(`(${W}(?: ${W})*),\\s*(${W}(?:[ -]${W})?)`), reSpace = new RegExp(`^(${W}(?:[ -]${W})?)\\s+(${W}(?:[ -]${W})*)$`);
    for (const ln of lines) {
      if (!ln || !ln.trim()) continue;
      const tm = TEAM_KEYS.find(([re]) => re.test(ln));
      const cells = ln.split(/\t|\s{2,}|\|/).map(c => c.trim()).filter(Boolean);
      let first = null, last = null;
      for (const c of cells) {
        if (TEAM_KEYS.some(([re]) => re.test(c)) || /\d/.test(c)) continue;
        let m = c.match(reComma); if (m) { last = m[1]; first = m[2]; break; }
        m = c.match(reSpace); if (m && c.length < 40) { first = m[1]; last = m[2]; break; }
      }
      if (tm && !first) { cur = tm[1]; continue; }
      const team = tm ? tm[1] : cur;
      if (!team || !first) continue;
      const list = teams[team] || (teams[team] = []);
      if (!list.some(n => n.first === first && n.last === last)) list.push({ first, last });
    }
    const count = Object.values(teams).reduce((a, l) => a + l.length, 0);
    return { teams, count };
  }
  const CSV_TEAMS = { EIG: 'ZHE', CAR: 'BEC', BAR: 'ZHB', CHA: 'ZHC', EAG: 'LUE', UNI: 'HUU', FLY: 'THF', THE: 'THF', FRO: 'SIF', SIS: 'SIF' };
  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return null;
    const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
    const head = lines[0].split(sep).map(h => h.trim().toUpperCase());
    const col = k => head.indexOf(k);
    if (col('PLAYER') < 0) return null;
    const rows = [], skipped = {};
    for (const ln of lines.slice(1)) {
      const c = ln.split(sep); const raw = (c[col('PLAYER')] || '').trim();
      const m = raw.match(/^(.+?),\s*(.+?)\s+([A-Z0-9\/]+)$/); if (!m) continue;
      const last = m[1].trim(), first = m[2].trim();
      if (/^Z-/.test(first) || /\d|Liga|Lizenz/.test(last)) continue;
      const codes = m[3].split('/').map(x => x.replace(/\d+$/, ''));
      const team = codes.map(x => CSV_TEAMS[x]).find(Boolean);
      if (!team) { skipped[m[3]] = 1; continue; }
      const n = k => { const i = col(k); return i >= 0 ? parseFloat(c[i]) || 0 : 0; };
      const pa = n('PA'), ab = n('AB'), h = n('H'), d = n('2B'), t3 = n('3B'), hr = n('HR');
      rows.push({ team, first, last, pa, g: n('G'), avg: ab ? h / ab : 0, iso: ab ? (d + 2 * t3 + 3 * hr) / ab : 0, hr, bbr: pa ? n('BB') / pa : 0, sbg: n('G') ? n('SB') / n('G') : 0, kr: pa ? n('SO') / pa : 0 });
    }
    if (!rows.length) return { teams: {}, count: 0, skipped: Object.keys(skipped) };
    // ratings relative to the league in the file, shrunk toward average for small samples
    const stat = k => { const v = rows.filter(r => r.pa >= 10).map(r => r[k]); const mu = avg(v); const sd = Math.sqrt(avg(v.map(x => (x - mu) ** 2))) || 1; return [mu, sd]; };
    const S = { avg: stat('avg'), iso: stat('iso'), bbr: stat('bbr'), sbg: stat('sbg'), kr: stat('kr') };
    const z = (r, k) => (r[k] - S[k][0]) / S[k][1];
    const teams = {};
    rows.sort((a, b) => b.pa - a.pa);
    for (const r of rows) {
      const w = r.pa / (r.pa + 25), f = x => clamp(Math.round(5 + w * x), 1, 10);
      const list = teams[r.team] || (teams[r.team] = []);
      if (list.some(x => x.first === r.first && x.last === r.last)) continue;
      list.push({ first: r.first, last: r.last, r: { con: f(1.7 * z(r, 'avg') - .5 * z(r, 'kr')), pow: f(1.8 * z(r, 'iso') + (r.hr ? .6 : 0)), spd: f(1.6 * z(r, 'sbg')), eye: f(1.8 * z(r, 'bbr')) } });
    }
    return { teams, count: Object.values(teams).reduce((a, l) => a + l.length, 0), skipped: Object.keys(skipped), stats: true };
  }
  function applyNames() {
    if (!C) return;
    const n = realNamesOn() ? loadNames() : null;
    for (const id in C.teams) {
      const t = C.teams[id];
      const hitters = [...t.lineup.map(s => getP(s.id)), ...t.bench.map(getP)];
      const list = n && n.teams[id] ? n.teams[id] : [];
      hitters.forEach((p, i) => {
        if (!p.gr) p.gr = { ...p.r };
        if (n && n.useStats && list[i] && list[i].r) Object.assign(p.r, list[i].r); else if (p.gr) Object.assign(p.r, p.gr);
        if (p.custom) return;
        if (!p.gn) p.gn = [p.first, p.last];
        if (list[i]) { p.first = list[i].first; p.last = list[i].last; } else { p.first = p.gn[0]; p.last = p.gn[1]; }
      });
    }
    save();
  }
  function namesSheet() {
    let found = null;
    const show = (msg, cls) => { const el = $('#nMsg'); if (el) { el.innerHTML = msg; el.className = cls || ''; } };
    const preview = res => {
      found = res;
      $('#nStatsRow').style.display = res.stats && res.count ? 'flex' : 'none';
      const per = Object.entries(res.teams).map(([id, l]) => `${teamInfo(id).name} ${l.length}`).join(' · ');
      show((res.count ? `Found <b>${res.count}</b> players. ${per}.` : 'No players from the eight clubs found in that text.') + (res.skipped && res.skipped.length ? `<br><span class="muted">Skipped clubs not in the game: ${res.skipped.join(', ')}.</span>` : ''), res.count ? 'ok' : 'err');
      $('#nUse').disabled = !res.count;
    };
    openSheet(`<h3>Load real player names</h3>
      <p>Import the CSV export from the league stats page (or fetch or paste it). Names are saved only on this phone. Batting stats list hitters, so pitchers keep fictional names. Each club's players with the most plate appearances fill its lineup first, then the bench.</p>
      <button class="btn primary" id="nCsv">Import CSV export</button><input type="file" id="nCsvFile" accept=".csv,text/csv,text/plain" hidden>
      <label id="nStatsRow" style="display:none;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="nStats" checked style="width:20px;height:20px"> Also set their ratings from these stats</label>
      <button class="btn" id="nFetch">Fetch from easyscore.com</button>
      <p id="nMsg"></p>
      <details id="nPasteBox"><summary class="eyebrow" style="cursor:pointer">Or paste the table yourself</summary>
        <p style="font-size:13.5px;margin-top:8px">Open the <a href="${NAMES_URL}" target="_blank" rel="noopener" style="color:var(--amber)">stats page</a>, select the whole table, copy it, and paste it here.</p>
        <textarea id="nText" rows="6" style="width:100%;background:var(--bg2);color:var(--text);border:1px solid var(--line2);border-radius:10px;padding:8px;font:13px var(--f-ui)" placeholder="Paste the stats table here"></textarea>
        <button class="btn" id="nParse" style="margin-top:6px">Read names</button></details>
      <div class="row2"><button class="btn" data-a="close">Cancel</button><button class="btn primary" id="nUse" disabled>Use these names</button></div>`, sh => {
      $('#nFetch').onclick = async () => {
        show('Fetching…');
        try {
          const r = await fetch(NAMES_URL, { mode: 'cors' });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          preview(parseNames(await r.text()));
        } catch (e) {
          show("The stats site doesn't let other apps read its pages directly, so the fetch was blocked. Use the paste option below instead.", 'err');
          $('#nPasteBox').open = true;
        }
      };
      $('#nParse').onclick = () => { const t = $('#nText').value; preview(parseCSV(t) || parseNames(t)); };
      $('#nCsv').onclick = () => $('#nCsvFile').click();
      $('#nCsvFile').onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const r = parseCSV(String(rd.result)); if (r) preview(r); else show("That file doesn't look like the stats export: it needs a Player column.", 'err'); }; rd.readAsText(f); };
      $('#nUse').onclick = () => {
        if (!found || !found.count) return;
        try { localStorage.setItem(NAMES_KEY, JSON.stringify({ at: Date.now(), teams: found.teams, count: found.count, useStats: !!(found.stats && $('#nStats').checked) })); } catch (e) { toast('Could not save the names.'); return; }
        SET.names = 'real'; saveSet(); applyNames(); closeSheet(); toast(`${found.count} real names saved.`); if (screen === 'settings') renderSettings();
      };
      sh.querySelector('[data-a="close"]').onclick = closeSheet;
    });
  }

  /* =================== HOW TO PLAY =================== */
  function howTo() {
    const ex = ['K', 'GB', 'DP', 'FB', '1B', '1B', 'FB', 'BB', '2B', '1B', 'HR'];
    openSheet(`<h3>How to play</h3><div class="howto">
      <p>Every at-bat is one roll of three dice.</p>
      <div style="display:flex;gap:12px;justify-content:center;padding-bottom:16px">${dieHTML(2, { card: true, color: '#2457c5', lab: 'BAT', disabled: true })}${dieHTML(5, { card: true, color: '#c4262e', lab: 'GLOVE', disabled: true })}${dieHTML(4, { lab: 'WHITE', disabled: true })}${dieHTML(5, { lab: 'WHITE', disabled: true })}</div>
      <ul><li>The <b>coloured die</b> shows a <b>bat</b> or a <b>glove</b>, each half the time. Bat: read the <b>batter's card</b>. Glove: read the <b>pitcher's card</b>.</li>
      <li>The <b>two white dice</b> add up to 2–12. That number points to a box on the card. Say it shows the bat and the white dice show 4 + 5 = 9: a walk on the batter's card:</li></ul>
      <div class="pcard">${stripHTML(ex, { pick: 7 })}</div>
      <ul><li>Wider boxes come up more often. 7 is the most likely roll; 2 and 12 are rare.</li>
      <li>Higher numbers usually favour the batter. Batter cards are full of hits, pitcher cards full of outs.</li></ul>
      <h4>Momentum ◆</h4>
      <ul><li>Spend one ◆ to re-roll a single die. The odds for each die show before you choose.</li>
      <li>On defense you can spend ◆ to re-roll a die of <b>their</b> good result. The bot can do the same to you.</li>
      <li>You start each game with 2 ◆ (max 5) and earn one for every double, triple or home run you hit, and every strikeout your pitcher gets.</li></ul>
      <h4>Batting choices</h4>
      <ul><li><b>Swing</b>: use the batter's card as printed.</li>
      <li><b>Power</b>: singles on his card become fly outs, doubles become home runs.</li>
      <li><b>Bunt</b>: roll one die. A 6 (5–6 for fast runners) is a bunt hit; otherwise the batter is out but every runner moves up.</li>
      <li><b>Steal</b>: roll one die to take the next base. Faster runners need lower numbers.</li></ul>
      <h4>Running the bases</h4>
      <ul><li>Singles move runners one base; a runner from second scores if his SPD is 5 or more.</li>
      <li>Doubles move runners two bases; a runner from first scores if his SPD is 7 or more.</li>
      <li>GB: runners move up one. DP: double play when a runner is on first. FB: a runner on third scores (sacrifice fly).</li></ul>
      <h4>Pitching</h4>
      <ul><li>Pitchers tire. Boxes on a tired pitcher's card turn into hits (marked red). Go to the bullpen before that happens.</li>
      <li>You can walk a dangerous batter on purpose.</li></ul>
      <h4>The campaign</h4>
      <ul><li>Seven weeks, then single-game semifinals and the Swiss Final for the top four.</li>
      <li>Players earn XP each game. Training points raise ratings, which improves their cards. Credits sign free agents.</li></ul>
    </div><button class="btn primary block" data-a="close">Got it</button>`, s => { s.querySelector('[data-a="close"]').onclick = closeSheet; });
  }

  /* =================== SHEET =================== */
  function openSheet(html, bind) { const w = $('#sheetWrap'), s = $('#sheet'); s.innerHTML = html; w.hidden = false; s.scrollTop = 0; if (bind) bind(s); }
  function closeSheet() { $('#sheetWrap').hidden = true; $('#sheet').innerHTML = ''; $('#sheet').onclick = null; sheetLocked = false; }
  $('#sheetWrap').addEventListener('click', e => { if (e.target.id === 'sheetWrap' && !sheetLocked) closeSheet(); });

  /* =================== GAME SCREEN =================== */
  const BP = [[150, 156], [228, 94], [150, 32], [72, 94]]; // home, 1B, 2B, 3B on the board
  const PARKS = {
    ZHE: { g1: '#2f6d3b', g2: '#27602f', pat: 'stripes', dirt: '#c27a4b', infield: '#3a7f46' },
    THF: { g1: '#33743f', g2: '#2b6536', pat: 'checks', dirt: '#b86f43', infield: '#3d8549' },
    BEC: { g1: '#2e6a3a', g2: '#265b31', pat: 'diag', dirt: '#c98552', infield: '#387a44' },
    ZHB: { g1: '#2d6b3e', g2: '#255c34', pat: 'rows', dirt: '#b07048', infield: '#367a47' },
    ZHC: { g1: '#30703d', g2: '#296235', pat: 'checks', dirt: '#bf7a50', infield: '#3b8148' },
    LUE: { g1: '#285f36', g2: '#21522e', pat: 'diag', dirt: '#a8694a', infield: '#326f40' },
    SIF: { g1: '#367a3c', g2: '#2e6b34', pat: 'stripes', dirt: '#c4844f', infield: '#418a47' },
    HUU: { g1: '#2f6b40', g2: '#285d37', pat: 'rows', dirt: '#c07757', infield: '#397c4a' }
  };
  function parkVars(id) { if (SET.board !== 'day') return ''; const p = PARKS[id]; return p ? `--g1:${p.g1};--g2:${p.g2};--dirt:${p.dirt};--infield:${p.infield}` : ''; }
  function badgeAt(id, x, y, w) { const t = teamInfo(id), one = t.badge.length === 1; return `<svg x="${x}" y="${y}" width="${w}" height="${w * 1.1}" viewBox="0 0 40 44"><path d="M20 2L37 8V22C37 33 29 39 20 42C11 39 3 33 3 22V8Z" fill="${t.c1}" stroke="${t.c2}" stroke-width="2.6"/><text x="20" y="${one ? 31 : 27.5}" text-anchor="middle" font-family="Graduate, Georgia, serif" font-size="${one ? 22 : 14}" fill="${t.c2}">${t.badge}</text></svg>`; }
  function boardStatic() {
    const pk = (PARKS[G && G.home] || PARKS.ZHE).pat;
    const pat = pk === 'checks' ? `<pattern id="mw" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" style="fill:var(--g1)"/><rect width="14" height="14" style="fill:var(--g2)"/><rect x="14" y="14" width="14" height="14" style="fill:var(--g2)"/></pattern>`
      : pk === 'rows' ? `<pattern id="mw" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" style="fill:var(--g1)"/><rect width="24" height="12" style="fill:var(--g2)"/></pattern>`
      : `<pattern id="mw" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(${pk === 'diag' ? 45 : 0})"><rect width="20" height="20" style="fill:var(--g1)"/><rect width="10" height="20" style="fill:var(--g2)"/></pattern>`;
    return `<defs>${pat}</defs>
      <rect x="0" y="0" width="300" height="180" fill="url(#mw)"/>
      <path d="M150 176 L248 94 L150 12 L52 94 Z" style="fill:var(--dirt)"/>
      <path d="M150 148 L218 94 L150 40 L82 94 Z" style="fill:var(--infield)"/>
      ${G ? `<g opacity=".5">${badgeAt(G.home, 138, 106, 24)}</g>` : ''}
      <circle cx="150" cy="94" r="9" fill="#cc8656"/><rect x="146" y="93" width="8" height="2" fill="#f7f4ea"/>
      <path d="M150 156 L10 16 M150 156 L290 16" style="stroke:var(--lines)" stroke-width="1.5" opacity=".6"/>
      ${[1, 2, 3].map(i => `<rect x="${BP[i][0] - 7}" y="${BP[i][1] - 7}" width="14" height="14" fill="#f7f4ea" transform="rotate(45 ${BP[i][0]} ${BP[i][1]})"/>`).join('')}
      <path d="M144 152h12v6l-6 6l-6-6z" fill="#f7f4ea"/>
      <g id="Lrun"></g><g id="Lbat"></g>`;
  }
  function renderGameScreen() {
    if (!G) { go('hub'); return; }
    const hc = teamInfo(C.club);
    document.documentElement.style.setProperty('--club1', hc.c1); document.documentElement.style.setProperty('--club2', hc.c2);
    phase = null; lastRoll = null;
    app.innerHTML = `<div class="game">
      <div class="gbar"><button class="iconbtn" id="gMenu" aria-label="Game menu">${ICON_MENU}</button><div class="bug" id="bug"></div><div class="outs" id="outs"></div></div>
      <div class="gmain">
        <div class="board" id="board" style="${parkVars(G.home)}"><svg id="boardSvg" viewBox="44 6 212 174" role="img" aria-label="Bases">${boardStatic()}</svg><div class="banner" id="banner"></div><div class="note" id="note"></div></div>
        <div id="cards"></div>
        <div class="tray" id="tray"></div>
        <div id="panel" style="display:grid;gap:8px"></div>
      </div></div>`;
    $('#gMenu').onclick = gameMenu;
    $('#board').onclick = () => { if (lastNote) setExplain(lastNote); };
    $('#cards').onclick = e => { const c = e.target.closest('[data-card]'); if (c && !phase) cardInfo(c.dataset.card); };
    updateGame();
    if (G.over) setTimeout(showGameOver, 300);
  }
  function updateGame() {
    if (screen !== 'game' || !G) return;
    renderBug(); renderCards(); renderTray(); renderPanel(); drawRunners(); drawBatter();
  }
  function renderBug() {
    const bs = batSide(G);
    const tm = side => `<span class="tm ${!G.over && bs === side ? 'batting' : ''}">${badge(G[side], 20)}${G[side]}</span><span class="sc">${runsOf(G, side)}</span>`;
    $('#bug').innerHTML = `${tm('away')}<span class="inn">${G.over ? 'FINAL' : `<i class="${G.half === 0 ? 'up' : 'down'}"></i>${G.inning}`}</span>${tm('home')}`;
    $('#outs').innerHTML = `OUTS<div>${[0, 1].map(i => `<i class="${i < G.outs ? 'o' : ''}"></i>`).join('')}</div>`;
  }
  const glow = {};
  const gems = side => `<div class="gems" aria-label="${G.mom[side]} momentum">${Array.from({ length: MOM_MAX }, (_, i) => `<i class="gem ${i < G.mom[side] ? 'on' : ''} ${i === G.mom[side] - 1 && glow[side] > Date.now() ? 'glow' : ''}"></i>`).join('')}</div>`;
  function curTactic() { return humanBatting() ? (G.tactic || 'swing') : (G.botTac || 'swing'); }
  const humanBatting = () => batSide(G) === G.human;
  function renderCards() {
    if (G.over) { $('#cards').innerHTML = ''; return; }
    const bs = batSide(G), fs = fieldSide(G), bat = curBatter(G), pit = curPitcher(G), bt = teamInfo(G[bs]), ft = teamInfo(G[fs]);
    const tac = curTactic(), cards = cardsNow(G, tac === 'bunt' ? 'swing' : tac);
    const lr = lastRoll && lastRoll.seq === G.seq ? lastRoll : null;
    const f = cards.f;
    const batCls = lr ? (lr.src === 'bat' ? 'live' : 'dim') : '', pitCls = lr ? (lr.src === 'pit' ? 'live' : 'dim') : '';
    const chip = '', pw = tac === 'power' ? ' power' : '';
    $('#cards').innerHTML = `
      <div class="pcard ${batCls}${pw}" data-card="bat"><div class="hd"><span class="jn" style="background:${bt.c1};color:${bt.c2}">${icon(true, 18)}</span><b class="nm">${short(bat)}</b>${pst(bat)}${SET.cardInfo ? meta(bat) : ''}${chip}${gems(bs)}</div>
        ${tac === 'bunt' ? buntStrip() : stripHTML(cards.bat, { pick: lr && lr.src === 'bat' ? lr.idx : null, base: tac === 'power' ? cards.batBase : null, mark: 'pw' })}</div>
      <div class="pcard ${pitCls}" data-card="pit"><div class="hd"><span class="jn" style="background:${ft.c1};color:${ft.c2}">${icon(false, 18)}</span><b class="nm">${short(pit)}</b>${pst(pit)}${SET.cardInfo ? meta(pit) : ''}${armMeter(pit, fs, f)}${gems(fs)}</div>
        ${stripHTML(cards.pit, { pick: lr && lr.src === 'pit' ? lr.idx : null, base: f > 0 ? cards.pitFresh : null })}</div>`;
  }
  function pst(p) { const o = ovr(p), tier = o >= 7 ? 'hi' : o >= 5 ? 'mid' : 'lo'; return `<span class="pst"><b class="ovrbox ${tier}">${o.toFixed(1)}</b></span>`; }
  function buntStrip() {
    const h = tacticOdds(G, 'bunt').ob;
    return `<div class="strip bunt"><div class="cell k-hit" style="--w:${Math.round(h * 100)}"><b>SAFE<br>${pct(h)}</b></div><div class="cell k-out" style="--w:${Math.round((1 - h) * 100)}"><b>OUT<br>${pct(1 - h)}</b></div></div>`;
  }
  function meta(p) { const o = ovr(p); return `<span class="pmeta"><span>Lv${levelOf(p)}</span><span class="pm"><i style="width:${Math.min(100, o * 10)}%"></i></span><b>${o.toFixed(1)}</b></span>`; }
  function armMeter(p, side, f) {
    const cap = pitchCap(p), left = clamp(1 - G.bf[side] / (cap + 6), 0, 1), col = f > 0 ? '#e5533d' : G.bf[side] >= cap - 2 ? '#f5b83d' : '#5fd08d';
    return `<span class="arm ${f > 0 ? 'tired' : ''}" title="Stamina"><svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3 13c2-1 3-3 3-6 0-2 1-4 3-4s3 2 3 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="pm"><i style="width:${left * 100}%;background:${col}"></i></span></span>`;
  }
  function cardInfo(which) {
    const bs = batSide(G), fs = fieldSide(G);
    if (which === 'bat') {
      const p = curBatter(G), b = G.box[p.id], slot = G.gl[bs][G.bi[bs]], sm = cardSummary(batterCard(p, 'swing'));
      openSheet(`<div class="eyebrow">${teamInfo(G[bs]).name} · batting ${G.bi[bs] + 1}${['st', 'nd', 'rd'][G.bi[bs]] || 'th'} · ${slot.pos}</div><h3>#${p.num} ${p.first} ${p.last}</h3>
        <p class="num">${keyRatings(p)} · bats ${p.hand}</p><p>On base ${pct(sm.ob)} · home run ${pct(sm.hr)} · strikeout ${pct(sm.k)} on his card.</p>
        <p>Today: ${b && b.pa ? `${b.h}-for-${b.ab}${b.hr ? `, ${b.hr} HR` : ''}${b.rbi ? `, ${b.rbi} RBI` : ''}${b.bb ? `, ${b.bb} BB` : ''}` : 'first time up'}.</p>
        <p class="muted" style="font-size:13px">◆ ${G.mom[bs]} momentum for ${teamInfo(G[bs]).name}. Gems re-roll one die each.</p><button class="btn block" data-a="close">Close</button>`, s => s.querySelector('[data-a]').onclick = closeSheet);
    } else {
      const p = curPitcher(G), b = G.box[p.id], f = fatigueOf(G, fs), sm = cardSummary(pitcherCard(p, 0));
      openSheet(`<div class="eyebrow">${teamInfo(G[fs]).name} · pitching</div><h3>#${p.num} ${p.first} ${p.last}</h3>
        <p class="num">${keyRatings(p)} · ${p.hand}HP</p><p>Outs ${pct(1 - sm.ob)} · strikeouts ${pct(sm.k)} on his card when fresh.</p>
        <p>${G.bf[fs]} batters faced. ${f > 0 ? 'Tired: boxes marked red have turned into hits.' : `Fresh for about ${Math.max(0, Math.round(pitchCap(p) - G.bf[fs]))} more batters.`}</p>
        <p class="muted" style="font-size:13px">◆ ${G.mom[fs]} momentum for ${teamInfo(G[fs]).name}.</p><button class="btn block" data-a="close">Close</button>`, s => s.querySelector('[data-a]').onclick = closeSheet);
    }
  }
  function trayDice(dice, opt) {
    opt = opt || {};
    const bs = batSide(G), fs = fieldSide(G);
    const owner = dice && dice[0] ? (dice[0] <= 3 ? teamInfo(G[bs]).c1 : teamInfo(G[fs]).c1) : null;
    const labs = opt.labs || ['', '', ''];
    return dieHTML(dice ? dice[0] : 0, { card: true, color: owner, idx: 0, cls: opt.cls && opt.cls[0], lab: labs[0], labCls: opt.labCls }) +
      dieHTML(dice ? dice[1] : 0, { idx: 1, cls: opt.cls && opt.cls[1], lab: labs[1], labCls: opt.labCls }) +
      dieHTML(dice ? dice[2] : 0, { idx: 2, cls: opt.cls && opt.cls[2], lab: labs[2], labCls: opt.labCls });
  }
  function renderTray() {
    const T = $('#tray');
    if (G.over) { T.innerHTML = ''; return; }
    if (phase && phase.kind === 'reroll') {
      const labs = SET.odds ? [0, 1, 2].map(i => { const p = phase.role === 'off' ? rerollGood(G, phase.dice, i, phase.tactic) : 1 - rerollGood(G, phase.dice, i, phase.tactic); return `${pct(p)} ${phase.role === 'off' ? 'safe' : 'out'}`; }) : ['', '', ''];
      T.classList.toggle('lab', SET.odds);
      T.innerHTML = trayDice(phase.dice, { cls: ['pickable', 'pickable', 'pickable'], labs, labCls: 'odds' });
      T.onclick = e => { const d = e.target.closest('[data-die]'); if (!d || !phase) return; const r = phase.resolve; phase = null; r(+d.dataset.die); };
      return;
    }
    T.classList.remove('lab'); T.onclick = null;
    const lr = lastRoll && lastRoll.seq === G.seq ? lastRoll : null;
    T.innerHTML = lr && lr.dice ? trayDice(lr.dice) : trayDice(null);
  }
  let lastNote = '', noteT = null;
  function setExplain(html) {
    if (!html) return; lastNote = html;
    const n = $('#note'); if (!n) return;
    n.innerHTML = html; n.classList.add('show');
    clearTimeout(noteT); noteT = setTimeout(() => n.classList.remove('show'), 3200 * Math.max(.7, SPEED()));
  }
  function renderPanel() {
    const P = $('#panel');
    if (G.over) { P.innerHTML = `<button class="btn primary bigbtn" id="gOver">See the final</button>`; $('#gOver').onclick = showGameOver; return; }
    const dis = busy ? 'disabled' : '';
    if (phase && phase.kind === 'reroll') {
      const cur = readDice(G, phase.dice, phase.tactic).code;
      P.innerHTML = phase.role === 'off'
        ? `<button class="btn primary bigbtn two" id="gKeep">Keep: ${OUTCOME[cur].name}<small>or tap a die to re-roll · ◆1 of ${G.mom[G.human]}</small></button>`
        : `<button class="btn bigbtn two" id="gKeep">Let it stand: ${OUTCOME[cur].name}<small>or tap one of their dice · ◆1 of ${G.mom[G.human]}</small></button>`;
      $('#gKeep').onclick = () => { if (!phase) return; const r = phase.resolve; phase = null; r(-1); };
      return;
    }
    if (humanBatting()) {
      const tac = G.tactic || 'swing', si = stealInfo(G), bench = G.bench[batSide(G)];
      const sw = tacticOdds(G, 'swing'), pw = tacticOdds(G, 'power'), bn = tacticOdds(G, 'bunt');
      const o = (t, x) => SET.odds ? `<small>${x}</small>` : '';
      P.innerHTML = `
        <div class="tactics">
          <button class="tac ${tac === 'swing' ? 'on' : ''}" data-t="swing" ${dis}><b>Swing</b>${o('swing', `${pct(sw.ob)} · HR ${pct(sw.hr)}`)}</button>
          <button class="tac ${tac === 'power' ? 'on' : ''}" data-t="power" ${dis}><b>Power</b>${o('power', `${pct(pw.ob)} · HR ${pct(pw.hr)}`)}</button>
          <button class="tac ${tac === 'bunt' ? 'on' : ''}" data-t="bunt" ${dis}><b>Bunt</b>${o('bunt', `hit ${pct(bn.ob)}`)}</button>
        </div>
        <div class="actrow"><button class="btn primary bigbtn" id="gRoll" ${dis}>${tac === 'bunt' ? 'Bunt' : 'Roll'}</button>
          ${si ? `<button class="btn side" id="gSteal" ${dis}>Steal<small>${stealNeed(G)}+</small></button>` : ''}<button class="btn side" id="gPH" ${bench.length && !busy ? '' : 'disabled'}>Sub<small>${bench.length} left</small></button></div>`;
      P.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { if (busy) return; G.tactic = b.dataset.t; SFX.play('tap'); renderCards(); renderPanel(); save(); tutEvent('tac-' + b.dataset.t); });
      $('#gRoll').onclick = humanBats;
      const st = $('#gSteal'); if (st) st.onclick = humanSteal;
      $('#gPH').onclick = pinchSheet;
    } else {
      const fs = fieldSide(G);
      P.innerHTML = `<div class="actrow"><button class="btn primary bigbtn" id="gPitch" ${dis}>Pitch</button>
        <button class="btn side" id="gPen" ${G.pen[fs].length && !busy ? '' : 'disabled'}>Pen<small>${G.pen[fs].length} left</small></button><button class="btn side" id="gIBB" ${dis}>Walk<small>on purpose</small></button></div>`;
      $('#gPitch').onclick = humanPitches;
      $('#gPen').onclick = penSheet;
      $('#gIBB').onclick = humanIBB;
    }
  }

  /* ---------- board ---------- */
  function meeple(id, pt, t, label) { return `<g data-k="${id}" transform="translate(${pt[0]} ${pt[1]})"><ellipse cy="9" rx="10" ry="3.5" fill="#000" opacity=".35"/><circle r="12" fill="${t.c1}" stroke="${t.c2}" stroke-width="2.6"/><text y="4.5" text-anchor="middle" fill="${t.c2}" style="font:800 11px Archivo, sans-serif">${label}</text></g>`; }
  function drawRunners() { const t = teamInfo(G[batSide(G)]); $('#Lrun').innerHTML = G.bases.map((id, i) => id ? meeple(id, BP[i + 1], t, getP(id).num) : '').join(''); }
  function drawBatter() { if (G.over) { $('#Lbat').innerHTML = ''; return; } const b = curBatter(G), t = teamInfo(G[batSide(G)]); $('#Lbat').innerHTML = meeple('bat', [b.hand === 'R' ? 128 : 172, 160], t, b.num); }
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  function moveTok(key, p) { const g = $('#Lrun').querySelector(`[data-k="${key}"]`); if (g) g.setAttribute('transform', `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`); }
  async function animRunners(mv) {
    if (!mv || !mv.length) return;
    const t = teamInfo(G[batSide(G)]);
    await Promise.all(mv.map(async m => {
      let g = $('#Lrun').querySelector(`[data-k="${m.id}"]`);
      if (!g) { $('#Lrun').insertAdjacentHTML('beforeend', meeple(m.id, BP[m.from % 4], t, getP(m.id).num)); g = $('#Lrun').querySelector(`[data-k="${m.id}"]`); if (m.from === 0) $('#Lbat').innerHTML = ''; }
      if (m.to === 'out') { const a = BP[m.from % 4], b = BP[(m.from + 1) % 4]; await tween(300, k => moveTok(m.id, lerp(a, lerp(a, b, .5), ease(k)))); await tween(220, k => g.setAttribute('opacity', 1 - k)); g.remove(); return; }
      for (let b = m.from; b < m.to; b++) await tween(260, k => moveTok(m.id, lerp(BP[b % 4], BP[(b + 1) % 4], ease(k))));
      if (m.to >= 4) { await tween(200, k => g.setAttribute('opacity', 1 - k)); g.remove(); }
    }));
  }
  let bannerT = null;
  function banner(txt, cls, ms) { const b = $('#banner'); if (!b) return; b.textContent = txt; b.className = 'banner show ' + (cls || ''); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), ms || 1100); }

  /* ---------- dice animation ---------- */
  async function animRoll(dice, which, opt) {
    // which: indices being rolled
    SFX.play('dice');
    const tray = $('#tray');
    const shown = (opt && opt.start) ? opt.start.slice() : [0, 0, 0];
    const t0 = performance.now(), dur = 650 * SPEED();
    await new Promise(res => {
      const f = () => {
        const done = performance.now() - t0 > dur;
        for (const i of which) shown[i] = done ? dice[i] : d6();
        tray.innerHTML = opt && opt.single ? dieHTML(shown[0], { lab: opt.lab || '' }) : trayDice(shown, { cls: [0, 1, 2].map(i => !done && which.includes(i) ? 'rolling' : ''), labs: [done ? (shown[0] <= 3 ? 'BAT' : 'GLOVE') : 'BAT / GLOVE', '', ''] });
        if (done) res(); else setTimeout(f, 70);
      };
      f();
    });
    await sleep(120);
  }
  function rollText(dice, tactic) {
    const r = readDice(G, dice, tactic);
    return `<b>${r.src === 'bat' ? 'Bat' : 'Glove'}</b> → ${r.src === 'bat' ? "batter's card" : "pitcher's card"} · ${dice[1]} + ${dice[2]} = <b>${r.sum}</b> → <b class="${onBase(r.code) ? (r.code === 'HR' ? 'run' : 'hit') : 'out'}">${OUTCOME[r.code].name}</b>`;
  }
  function showRoll(dice, tactic) {
    const r = readDice(G, dice, tactic);
    lastRoll = { dice: dice.slice(), tactic, src: r.src, idx: r.idx, code: r.code, seq: G.seq };
    renderCards(); renderTray();
    setExplain(rollText(dice, tactic));
    return r;
  }
  function waitReroll(role, dice, tactic) {
    return new Promise(res => { phase = { kind: 'reroll', role, dice: dice.slice(), tactic, resolve: res }; renderTray(); renderPanel(); tutEvent('choice'); });
  }

  /* ---------- turn flow ---------- */
  async function humanBats() {
    if (busy || !G || G.over) return;
    busy = true; SFX.init(); renderPanel();
    const bs = batSide(G), fs = fieldSide(G), tac = G.tactic || 'swing', ctx = { bat: curBatter(G) };
    try {
      if (tac === 'bunt') {
        const die = d6();
        await animRoll([die], [0], { single: true, lab: `need ${buntNeed(ctx.bat)}+` });
        const res = applyBunt(G, die);
        setExplain(`Bunt die <b>${die}</b> (need ${res.need}+) → <b class="${res.code === 'BH' ? 'hit' : 'out'}">${res.code === 'BH' ? 'Bunt hit!' : res.code === 'SAC' ? 'Sacrifice: runners move up' : 'Thrown out'}</b>`);
        await finishPlay(res, ctx);
        return;
      }
      let dice = tutDice() || [d6(), d6(), d6()];
      await animRoll(dice, [0, 1, 2]);
      let r = showRoll(dice, tac);
      // offense re-roll by the human
      if (G.mom[bs] > 0 && !onBase(r.code)) {
        const i = await waitReroll('off', dice, tac);
        if (i >= 0) { G.mom[bs]--; SFX.play('gem'); dice[i] = d6(); if (TUT) dice[i] = forceFace(dice, i, tac, true); await animRoll(dice, [i], { start: dice }); r = showRoll(dice, tac); setExplain(`You spent ◆ to re-roll. ` + rollText(dice, tac)); }
      }
      // defense re-roll by the bot
      if (onBase(r.code)) {
        const j = botReroll(G, dice, tac, 'def');
        if (j >= 0) {
          G.mom[fs]--; banner(`${teamInfo(G[fs]).name} spend ◆`, 'mom', 1200); SFX.play('gem'); renderCards(); await sleep(700);
          dice[j] = d6(); await animRoll(dice, [j], { start: dice }); r = showRoll(dice, tac);
          setExplain(`They re-rolled your ${j === 0 ? 'bat/glove die' : 'white die'}. ` + rollText(dice, tac));
        }
      }
      await sleep(250);
      const res = applyAtBat(G, r.code);
      await finishPlay(res, ctx);
    } catch (err) { console.error(err); toast('Something went wrong with that roll.'); busy = false; updateGame(); }
  }
  async function humanPitches() {
    if (busy || !G || G.over) return;
    busy = true; SFX.init(); renderPanel();
    const bs = batSide(G), fs = fieldSide(G), ctx = { bat: curBatter(G) };
    try {
      if (botWantsSteal(G)) {
        const si = stealInfo(G), runner = getP(si.id), need = stealNeed(G);
        banner(`${runner.last} is running!`, 'small', 1000); await sleep(500);
        const die = d6(); await animRoll([die], [0], { single: true, lab: `steal needs ${need}+` });
        const res = applySteal(G, die);
        setExplain(`Steal die <b>${die}</b> (needs ${need}+) → <b class="${res.safe ? 'hit' : 'out'}">${res.safe ? 'Safe!' : 'Caught stealing'}</b>`);
        banner(res.safe ? 'Stolen base' : 'Caught stealing', res.safe ? 'hit' : 'out');
        await animRunners(res.mv); logPlay(G, `${runner.last} ${res.safe ? 'steals ' + ordinal(res.from + 1) : 'is caught stealing'}.`, res.safe ? 'hit' : 'out');
        const end = afterPlay(G);
        if (end) { await endOfHalf(end); return; }
        updateGame(); await sleep(500);
      }
      const tac = G.botTac || 'swing';
      if (tac === 'bunt') {
        const die = d6(); await animRoll([die], [0], { single: true, lab: `bunt needs ${buntNeed(ctx.bat)}+` });
        const res = applyBunt(G, die);
        setExplain(`Bunt die <b>${die}</b> (needs ${res.need}+) → <b class="${res.code === 'BH' ? 'hit' : 'out'}">${res.code === 'BH' ? 'Bunt hit' : res.code === 'SAC' ? 'Sacrifice: runners move up' : 'Thrown out'}</b>`);
        await finishPlay(res, ctx); return;
      }
      let dice = tutDice() || [d6(), d6(), d6()];
      await animRoll(dice, [0, 1, 2]);
      let r = showRoll(dice, tac);
      const o = botReroll(G, dice, tac, 'off');
      if (o >= 0) {
        await sleep(400); G.mom[bs]--; banner(`${teamInfo(G[bs]).name} spend ◆`, 'mom', 1200); SFX.play('gem'); renderCards(); await sleep(700);
        dice[o] = d6(); await animRoll(dice, [o], { start: dice }); r = showRoll(dice, tac);
        setExplain(`They re-rolled their ${o === 0 ? 'bat/glove die' : 'white die'}. ` + rollText(dice, tac));
      }
      if (onBase(r.code) && G.mom[fs] > 0) {
        const i = await waitReroll('def', dice, tac);
        if (i >= 0) { G.mom[fs]--; SFX.play('gem'); dice[i] = d6(); if (TUT) dice[i] = forceFace(dice, i, tac, false); await animRoll(dice, [i], { start: dice }); r = showRoll(dice, tac); setExplain(`You spent ◆ to re-roll their die. ` + rollText(dice, tac)); }
      }
      await sleep(250);
      const res = applyAtBat(G, r.code);
      await finishPlay(res, ctx);
    } catch (err) { console.error(err); toast('Something went wrong with that roll.'); busy = false; updateGame(); }
  }
  async function humanSteal() {
    if (busy || !G) return;
    busy = true; SFX.init(); renderPanel();
    const si = stealInfo(G), runner = getP(si.id), need = stealNeed(G);
    const die = d6(); await animRoll([die], [0], { single: true, lab: `need ${need}+` });
    const res = applySteal(G, die);
    setExplain(`Steal die <b>${die}</b> (need ${need}+) → <b class="${res.safe ? 'hit' : 'out'}">${res.safe ? 'Safe!' : 'Caught stealing'}</b>`);
    banner(res.safe ? 'Stolen base' : 'Caught stealing', res.safe ? 'hit' : 'out');
    await animRunners(res.mv);
    logPlay(G, `${runner.last} ${res.safe ? 'steals ' + ordinal(res.from + 1) : 'is caught stealing'}.`, res.safe ? 'hit' : 'out');
    const end = afterPlay(G);
    if (end) { await endOfHalf(end); return; }
    lastRoll = null; save(); busy = false; updateGame();
  }
  async function humanIBB() {
    if (busy || !G) return;
    busy = true; const ctx = { bat: curBatter(G), ibb: true };
    const res = intentionalWalk(G);
    setExplain(`You walk <b>${ctx.bat.last}</b> on purpose.`);
    await finishPlay(res, ctx);
  }
  async function finishPlay(res, ctx) {
    const d = describe(G, res, ctx);
    const lbl = { HR: 'Home run!', '3B': 'Triple!', '2B': 'Double', '1B': 'Single', BB: ctx.ibb ? 'Intentional walk' : 'Walk', K: 'Strikeout', GB: 'Ground out', DP: res.mv.filter(m => m.to === 'out').length > 1 ? 'Double play' : 'Ground out', FB: res.notes.includes('sacrifice fly') ? 'Sac fly' : 'Fly out', SAC: 'Sacrifice', BH: 'Bunt hit', BO: 'Out' }[res.code] || '';
    const cls = res.runs ? 'run' : (onBase(res.code) || res.code === 'BH') ? 'hit' : 'out';
    banner(res.runs && res.code !== 'HR' ? `${lbl} · ${res.runs} run${res.runs > 1 ? 's' : ''}` : lbl, cls);
    if (res.code === 'HR') { SFX.play('crack'); setTimeout(() => SFX.play('cheer'), 200); buzz([30, 40, 60]); }
    else if (onBase(res.code) && res.code !== 'BB') SFX.play('crack');
    else if (res.code === 'K') SFX.play('pop'); else if (cls === 'out') SFX.play('thud');
    if (res.runs && res.code !== 'HR') { setTimeout(() => SFX.play('cheer'), 300); buzz(25); }
    await animRunners(res.mv);
    logPlay(G, d.t, d.cls);
    for (const m of (res.mom || [])) await gemFly(m);
    const end = afterPlay(G);
    if (end) { await endOfHalf(end); return; }
    prepTurn(); save(); busy = false; updateGame(); tutEvent('played');
  }
  async function gemFly(m) {
    banner(`${m.side === G.human ? 'You gain' : teamInfo(G[m.side]).name + ' gain'} ◆ (${m.why})`, 'mom', 1400);
    glow[m.side] = Date.now() + 3500;
    renderCards();
    const card = m.side === batSide(G) ? 'bat' : 'pit', tgt = document.querySelector(`[data-card="${card}"] .gem:nth-child(${G.mom[m.side]})`);
    const board = $('#board');
    if (tgt && board && !REDUCED) {
      const a = board.getBoundingClientRect(), b = tgt.getBoundingClientRect();
      const fx = document.createElement('div'); fx.className = 'flygem'; document.body.appendChild(fx);
      tgt.style.visibility = 'hidden';
      const x0 = a.left + a.width / 2, y0 = a.top + a.height * .45, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
      await tween(700, k => { const e = ease(k), x = x0 + (x1 - x0) * e, y = y0 + (y1 - y0) * e - Math.sin(Math.PI * k) * 60, sc = 2.4 - 1.4 * e; fx.style.transform = `translate(${x - 8}px,${y - 8}px) rotate(45deg) scale(${sc})`; });
      fx.remove(); tgt.style.visibility = '';
    }
    SFX.play('gem'); buzz(15);
    await sleep(350);
  }
  function halfCard() {
    return new Promise(res => {
      const ph = G.half === 1 ? 0 : 1, pin = G.half === 1 ? G.inning : G.inning - 1, ps = ph === 0 ? 'away' : 'home';
      const runs = (G.line[ps][pin - 1]) || 0, last = G.inning >= G.innings, hs = runsOf(G, 'home'), as = runsOf(G, 'away');
      const tag = G.inning > G.innings ? (G.half === 0 ? 'Extra innings' : 'Extra innings') : last ? (G.half === 1 ? 'Final inning, bottom half' : 'Final inning') : '';
      const t = side => teamInfo(G[side]), me = side => side === G.human ? 'you' : '';
      const sc = side => `<div class="hc-team ${G.human === side ? 'me' : ''}">${badge(G[side], 46)}<b>${t(side).name}</b><span class="hc-n">${side === 'away' ? as : hs}</span></div>`;
      const msg = runs ? `${t(ps).name} scored <b>${runs}</b> ${runs === 1 ? 'run' : 'runs'} in the ${ph === 0 ? 'top' : 'bottom'} of the ${ordinal(pin)}` : `${t(ps).name} went scoreless in the ${ph === 0 ? 'top' : 'bottom'} of the ${ordinal(pin)}`;
      const el = document.createElement('div'); el.id = 'halfcard';
      el.innerHTML = `<div class="hc-box"><div class="hc-title"><span class="hc-arrow">${G.half === 0 ? '▲' : '▼'}</span>${G.half === 0 ? 'Top' : 'Bottom'} of the ${ordinal(G.inning)}</div>${tag ? `<div class="hc-tag">${tag}</div>` : ''}
        <div class="hc-score">${sc('away')}<span class="hc-dash">–</span>${sc('home')}</div><div class="hc-msg">${msg}</div></div>`;
      document.body.appendChild(el); SFX.play('pop');
      let fin = false; const done = () => { if (fin) return; fin = true; el.classList.add('out'); setTimeout(() => { el.remove(); res(); }, 260); };
      el.onclick = done; setTimeout(done, 1900 * SPEED());
    });
  }
  async function endOfHalf(end) {
    if (end === 'over') { save(); busy = false; updateGame(); if (TUT) { tutEvent('played'); return; } await sleep(700); showGameOver(); return; }
    await sleep(400);
    if (TUT) { banner(G.half === 0 ? `${ordinal(G.inning)} inning` : 'Side retired', '', 1000); await sleep(900); }
    else await halfCard();
    lastRoll = null; prepTurn(); save(); busy = false; updateGame(); tutEvent('played');
    setExplain(humanBatting() ? 'You bat. Pick a swing and roll.' : 'You pitch. Tap Pitch.');
  }
  function prepTurn() {
    if (!G || G.over) return;
    if (humanBatting()) { if (botPitchingChange(G, fieldSide(G))) banner('Pitching change', '', 900); G.tactic = 'swing'; }
    else G.botTac = TUT ? 'swing' : botTactic(G);
  }
  function pinchSheet() {
    const bs = batSide(G), bench = G.bench[bs], cur = curBatter(G);
    const row = p => { const s = cardSummary(batterCard(p, 'swing')); return `${keyRatings(p)} · on base ${pct(s.ob)} · HR ${pct(s.hr)}`; };
    openSheet(`<h3>Pinch hit for ${short(cur)}?</h3><p>The pinch hitter takes over this spot in the order for the rest of the game.</p>
      <div class="list"><div class="opt" style="pointer-events:none;opacity:.7"><span><b>${short(cur)}</b> (up now)<small>${row(cur)}</small></span>${ovrTag(cur)}</div>
      ${bench.map(id => { const p = getP(id); return `<button class="opt" data-id="${id}"><span><b>${short(p)}</b><small>${row(p)}</small></span>${ovrTag(p)}</button>`; }).join('')}</div>
      <button class="btn block" data-a="close">Keep ${short(cur)}</button>`, s => {
      s.onclick = e => { if (e.target.closest('[data-a="close"]')) { closeSheet(); return; } const b = e.target.closest('[data-id]'); if (!b) return; pinchHit(G, b.dataset.id); closeSheet(); save(); updateGame(); banner('Pinch hitter', '', 900); };
    });
  }
  function penSheet() {
    const fs = fieldSide(G), cur = getP(G.pit[fs]), f = fatigueOf(G, fs);
    openSheet(`<h3>Go to the bullpen?</h3><p>${short(cur)} has faced ${G.bf[fs]} batters and ${f > 0 ? 'is tiring: some outs on his card have turned into hits' : `stays fresh for about ${Math.max(0, Math.round(pitchCap(cur) - G.bf[fs]))} more`}. A pitcher who leaves can't come back.</p>
      <div class="list">${G.pen[fs].map(id => { const p = getP(id), s = cardSummary(pitcherCard(p, 0)); return `<button class="opt" data-id="${id}"><span><b>${short(p)}</b> · ${p.hand}HP<small>${keyRatings(p)} · outs ${pct(1 - s.ob)} · K ${pct(s.k)}</small></span>${ovrTag(p)}</button>`; }).join('')}</div>
      <button class="btn block" data-a="close">Stay with ${short(cur)}</button>`, s => {
      s.onclick = e => { if (e.target.closest('[data-a="close"]')) { closeSheet(); return; } const b = e.target.closest('[data-id]'); if (!b) return; changePitcher(G, fs, b.dataset.id); closeSheet(); save(); lastRoll = null; updateGame(); banner('Pitching change', '', 900); };
    });
  }
  function boxTable(side) {
    const rows = G.gl[side].map(s => s.id);
    const subs = Object.keys(G.box).filter(id => !rows.includes(id) && C.teams[G[side]].players.some(p => p.id === id) && G.box[id].pa);
    const bat = [...rows, ...subs].map(id => { const p = getP(id), b = G.box[id] || blankBox(); return `<tr><td>${short(p)}</td><td>${b.ab}</td><td>${b.r}</td><td>${b.h}</td><td>${b.hr}</td><td>${b.rbi}</td><td>${b.bb}</td><td>${b.k}</td></tr>`; }).join('');
    const pit = G.usedP[side].map(id => { const p = getP(id), b = G.box[id] || blankBox(); return `<tr><td>${short(p)}</td><td>${(b.po / 3 | 0)}.${b.po % 3}</td><td>${b.ph}</td><td>${b.ra}</td><td>${b.pbb}</td><td>${b.pk}</td><td>${b.bf}</td></tr>`; }).join('');
    return `<div class="eyebrow" style="display:flex;gap:6px;align-items:center">${badge(G[side], 18)}${teamInfo(G[side]).name}</div>
      <div class="box"><table><thead><tr><th>Batting</th><th>AB</th><th>R</th><th>H</th><th>HR</th><th>RBI</th><th>BB</th><th>K</th></tr></thead><tbody>${bat}</tbody></table></div>
      <div class="box"><table><thead><tr><th>Pitching</th><th>IP</th><th>H</th><th>R</th><th>BB</th><th>K</th><th>BF</th></tr></thead><tbody>${pit}</tbody></table></div>`;
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
  function boxSheet() { openSheet(`<h3>Box score</h3>${lineScore(G.line, G.H, G.away, G.home, G.innings)}${boxTable('away')}${boxTable('home')}<button class="btn block" data-a="close">Close</button>`, s => { s.querySelector('[data-a="close"]').onclick = closeSheet; }); }
  function logSheet() { openSheet(`<h3>Play-by-play</h3><div class="log">${G.log.map(l => `<div><span>${l.tag}</span><span class="${l.cls}" style="font-size:14px">${l.txt}</span></div>`).join('')}</div><button class="btn block" data-a="close">Close</button>`, s => { s.querySelector('[data-a="close"]').onclick = closeSheet; }); }
  function gameMenu() {
    if (phase) return;
    openSheet(`<h3>Game menu</h3><div class="list">
      <button class="opt" data-a="box"><span><b>Box score</b><small>Line score and every player's game</small></span></button>
      <button class="opt" data-a="log"><span><b>Play-by-play</b><small>Everything that has happened</small></span></button>
      <button class="opt" data-a="set"><span><b>Settings</b><small>Sound, colours, odds, names</small></span></button>
      <button class="opt" data-a="how"><span><b>How to play</b><small>Dice, cards, momentum, tactics</small></span></button>
      <button class="opt" data-a="exit"><span><b>Save and go to the clubhouse</b><small>The game resumes exactly here</small></span></button></div>
      <button class="btn primary block" data-a="close">Back to the game</button>`, s => {
      s.onclick = e => {
        const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
        if (a === 'close') closeSheet(); else if (a === 'box') boxSheet(); else if (a === 'log') logSheet(); else if (a === 'how') howTo();
        else if (a === 'set') { if (busy) return; save(); closeSheet(); openSettings('game'); }
        else if (a === 'exit') { if (busy) return; if (TUT) { closeSheet(); exitTutorial(); return; } save(); closeSheet(); hubTab = 'next'; go('hub'); }
      };
    });
  }
  function showGameOver() {
    if (!G || TUT) return;
    const me = runsOf(G, G.human), them = runsOf(G, other(G.human)), won = me > them;
    if (won) { SFX.play('organ'); setTimeout(() => SFX.play('cheer'), 500); }
    sheetLocked = true;
    openSheet(`<div class="eyebrow">Final · ${G.label}</div><h3>${won ? (G.walkoff ? 'Walk-off win!' : 'Ballgame. You win!') : 'Tough loss.'}</h3>
      ${lineScore(G.line, G.H, G.away, G.home, G.innings)}
      <button class="btn primary block" data-a="go">Continue</button>`, s => {
      s.querySelector('[data-a="go"]').onclick = () => { closeSheet(); finishGame(); save(); go('post'); };
    });
  }

  /* =================== PRE-GAME MATCHUP =================== */
  function teamPowerAvg(side) { const ids = [...G.gl[side].map(s => s.id), G.pit[side]]; return avg(ids.map(id => ovr(getP(id)))); }
  function matchupIntro() {
    if (!G || G.over) return;
    const col = side => {
      const t = teamInfo(G[side]), pw = teamPowerAvg(side), sp = getP(G.pit[side]);
      return `<div class="mu-side ${side}" style="--c1:${t.c1};--c2:${t.c2}">
        <div class="mu-badge">${badge(G[side], 64)}</div><b class="mu-name">${t.name}</b><small>${t.city} · ${recordOf(G[side])}</small>
        <div class="mu-pow"><span class="seg">${Array.from({ length: 10 }, (_, i) => `<i class="${i < Math.round(pw) ? 'on' : ''}" style="animation-delay:${.6 + i * .05}s"></i>`).join('')}</span><b>${pw.toFixed(1)}</b></div>
        <ol class="mu-list">${G.gl[side].map((sl, i) => `<li style="animation-delay:${.9 + i * .06}s"><span>${sl.pos}</span>${short(getP(sl.id))}</li>`).join('')}<li class="sp" style="animation-delay:${1.5}s"><span>SP</span>${short(sp)}</li></ol></div>`;
    };
    const el = document.createElement('div'); el.id = 'matchup';
    el.innerHTML = `<div class="mu-top">${G.label}${G.home ? ` · at ${teamInfo(G.home).city}` : ''}</div><div class="mu-grid">${col('away')}<div class="mu-vs">VS</div>${col('home')}</div><div class="mu-tap">Tap to play ball</div>`;
    document.body.appendChild(el);
    SFX.play('crack');
    const done = () => { if (!el.isConnected) return; el.classList.add('out'); setTimeout(() => el.remove(), 400); };
    el.onclick = done; setTimeout(done, 6000);
  }

  /* =================== TUTORIAL =================== */
  let tutStep = 0;
  const TSTEPS = [
    { t: () => 'Welcome! Every at-bat is <b>one roll of three dice</b>. These two cards decide what happens: your <b>batter</b> (bat) and their <b>pitcher</b> (glove).', hl: 'cards', wait: 'next' },
    { t: () => 'Tap <b>Roll</b> to bat.', hl: 'roll', wait: 'played', dice: () => findRoll('bat', ['1B', '2B', 'BB'], 'swing') },
    { t: () => `The coloured die showed the <b>bat</b>, so the <b>batter's card</b> was read. The two white dice added up to a box on it: ${G.log[0] ? G.log[0].txt : ''} Wider boxes come up more often.`, wait: 'next' },
    { t: () => 'Roll again. Watch the coloured die this time.', hl: 'roll', wait: 'choice', dice: () => findRoll('pit', ['GB', 'FB', 'K'], 'swing') },
    { t: () => `A <b>glove</b>: the pitcher's card, and it's an out. But you have <b>momentum</b>, the blue gems. Spend one to re-roll a single die. The % under each die is your chance to reach base after re-rolling it. <b>Tap the best die.</b>`, hl: 'tray', wait: 'played', good: true },
    { t: () => 'Re-rolls can rescue an at-bat, and the other team can use theirs against you. You earn gems with doubles, triples, home runs and strikeouts.', wait: 'next' },
    { t: () => 'Try a <b>Power</b> swing: singles on the card turn into fly outs, but doubles turn into home runs. Tap <b>Power</b>, then <b>Roll</b>.', hl: 'power', wait: 'played', dice: () => findRoll('bat', ['HR'], 'power') },
    { t: () => 'Home run! Did you see the gem fly to your card? That was your reward for an extra-base hit. Now you take the field.', wait: 'next', run: () => { G.outs = 3; afterPlay(G); lastRoll = null; prepTurn(); updateGame(); } },
    { t: () => 'You are <b>pitching</b>. Tap <b>Pitch</b>.', hl: 'pitch', wait: 'choice', dice: () => findRoll('bat', ['1B', '2B', 'BB'], 'swing') },
    { t: () => 'They reached base. Spend a gem to re-roll <b>one of their dice</b>. Now the % shows the chance of an <b>out</b>. Tap a die.', hl: 'tray', wait: 'played', bad: true },
    { t: () => 'That\'s the heart of the game. Your other tools: <b>Steal</b> and <b>Sub</b> when batting, <b>Pen</b> (bullpen) and <b>Walk</b> when pitching. Tap a player card any time for details.', wait: 'next' },
    { t: () => 'You\'re ready. Win games, earn prize money, buy gear in the Market, level up your players and chase the Swiss title!', final: true }
  ];
  function findRoll(src, codes, tactic) {
    if (!G) return null;
    const card = cardsNow(G, tactic)[src];
    for (const s of [7, 6, 8, 5, 9, 4, 10, 3, 11, 2, 12]) if (codes.includes(card[s - 2])) { const a = Math.min(6, s - 1); return [src === 'bat' ? 2 : 5, a, s - a]; }
    return null;
  }
  function forceFace(dice, i, tac, good) { for (let v = 1; v <= 6; v++) { const d = dice.slice(); d[i] = v; if (onBase(readDice(G, d, tac).code) === good) return v; } return dice[i]; }
  function tutDice() { if (!TUT || !TUT.dice) return null; const d = TUT.dice; TUT.dice = null; return d; }
  function startTutorial() {
    TUT = { dice: null };
    newCampaign({ club: 'ZHE', innings: 1, diff: 'rookie' });
    G = newGameState('ZHB', 'ZHE', 'away', 1, 'Tutorial'); C.game = G; G.mom.home = 0;
    document.body.classList.add('tut');
    tutStep = 0; go('game'); runTutStep();
  }
  function exitTutorial(then) {
    TUT = null; tutStep = 0; document.body.classList.remove('tut'); delete document.body.dataset.tut;
    const c = $('#coach'); if (c) c.remove();
    C = null; G = null; load();
    if (then === 'new') { newOpts.confirm = false; go('new'); } else go('title');
  }
  function runTutStep() {
    const st = TSTEPS[tutStep]; if (!st) { exitTutorial(); return; }
    if (st.run) st.run();
    TUT.dice = st.dice ? st.dice() : null;
    document.body.dataset.tut = st.hl || '';
    let c = $('#coach'); if (!c) { c = document.createElement('div'); c.id = 'coach'; document.body.appendChild(c); } c.classList.remove('wait');
    c.innerHTML = `<div class="coach-step">Tutorial · ${tutStep + 1} of ${TSTEPS.length}</div><p>${st.t()}</p><div class="coach-btns">${st.final ? '<button class="btn" data-c="title">Title screen</button><button class="btn primary" data-c="new">Start a campaign</button>' : `<button class="btn ghost small" data-c="skip">Skip tutorial</button>${st.wait === 'next' ? '<button class="btn primary small" data-c="next">Next</button>' : ''}`}</div>`;
    c.onclick = e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      const a = b.dataset.c;
      if (a === 'next') { tutStep++; runTutStep(); }
      else if (a === 'skip' || a === 'title') exitTutorial();
      else if (a === 'new') exitTutorial('new');
    };
  }
  function tutEvent(name) {
    if (!TUT) return;
    const st = TSTEPS[tutStep]; if (!st) return;
    if (st.wait === name) { tutStep++; document.body.dataset.tut = ''; const c = $('#coach'); if (c) c.classList.add('wait'); setTimeout(runTutStep, name === 'played' ? 400 : 50); }
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
    const champ = L.final && L.outcome === 'champion';
    const pogP = L.pog && getP(L.pog.id);
    const pogLine = pogP ? (pogP.kind === 'P' ? `${(L.pog.box.po / 3 | 0)}.${L.pog.box.po % 3} IP, ${L.pog.box.ra} R, ${L.pog.box.pk} K` : `${L.pog.box.h}-for-${L.pog.box.ab}${L.pog.box.hr ? `, ${L.pog.box.hr} HR` : ''}${L.pog.box.rbi ? `, ${L.pog.box.rbi} RBI` : ''}${L.pog.box.bb ? `, ${L.pog.box.bb} BB` : ''}`) : '';
    const sf = L.final && C.po && C.po.final && !C.po.final.res ? C.po.final : null;
    app.innerHTML = `<section class="post wrap">
      <div class="res"><span class="eyebrow">${L.label}</span>${champ ? trophySVG() : ''}<h2 class="${L.won ? 'w' : 'l'}">${champ ? 'Swiss champions!' : L.won ? (L.walkoff ? 'Walk-off win' : 'Victory') : 'Defeat'}</h2>
        <div class="score">${badge(L.away, 34)}<span>${L.away === C.club ? L.my : L.them}–${L.home === C.club ? L.my : L.them}</span>${badge(L.home, 34)}</div></div>
      ${lineScore(L.line, L.H, L.away, L.home, L.innings)}
      ${pogP ? `<section class="card pog">${badge(L.pog.team, 40)}<span><small>Player of the game</small><b>${pogP.first} ${pogP.last}</b><i>${teamInfo(L.pog.team).name} · ${pogLine}</i></span></section>` : ''}
      ${sf ? `<p class="card" style="margin:0">Swiss Final series: <b>${seriesTxt()}</b>. ${seriesWins(sf)[C.club] === 1 && seriesWins(sf)[sf.home === C.club ? sf.away : sf.home] === 1 ? 'It all comes down to Game 3!' : 'Next up: Game ' + (sf.games.length + 1) + '.'}</p>` : ''}
      <section class="card" style="display:grid;gap:10px"><div class="eyebrow">Top performers</div><div class="stars3">${top}</div></section>
      ${L.lv.length ? `<section class="card" style="display:grid;gap:10px" id="lvSect"><div class="eyebrow">Level ups · spend training points</div>${L.lv.map(l => lvBox(l)).join('')}</section>` : ''}
      ${L.hurt && L.hurt.length ? `<section class="card" style="display:grid;gap:6px"><div class="eyebrow">Injury report</div>${L.hurt.map(h => `<div style="font-size:14px"><span class="injtag">INJ</span> <b>${short(getP(h.id))}</b> misses the next ${h.games > 1 ? h.games + ' games' : 'game'}. A bench player starts in his place.</div>`).join('')}</section>` : ''}
      <section class="card" style="display:flex;justify-content:space-between;align-items:center"><span>Prize money</span><b style="color:var(--amber);font-size:20px">Fr. ${L.cr}</b></section>
      ${L.phase === 'over' && !champ ? `<p class="card" style="margin:0">${{ semi: 'Your season ends in the semifinal.', runnerup: 'So close. You fall in the Swiss Final.', missed: 'The season is over.' }[L.outcome] || ''}</p>` : ''}
      ${C.po && C.po.stage === 'final' && L.label === 'Semifinal' ? `<p class="card" style="margin:0">You're through to the Swiss Final against the ${teamInfo(C.po.final.home === C.club ? C.po.final.away : C.po.final.home).name}.</p>` : ''}
      ${C.phase === 'playoffs' && L.label.startsWith('Week') ? `<p class="card" style="margin:0">Regular season complete. You made the playoffs as the ${ordinal(C.po.seeds.indexOf(C.club) + 1)} seed!</p>` : ''}
      <button class="btn primary block" id="pCont" style="padding:15px;font-size:17px">Back to the clubhouse</button>
    </section>`;
    $('#pCont').onclick = () => { hubTab = 'next'; go('hub'); };
    const ls = $('#lvSect'); if (ls) ls.onclick = e => {
      const b = e.target.closest('[data-train]'); if (!b) return;
      const box = b.closest('[data-pid]'), p = getP(box.dataset.pid), k = b.dataset.train;
      if (p.tp > 0 && p.r[k] < 10) { p.r[k]++; p.tp--; save(); SFX.play('gem'); box.outerHTML = lvBox(L.lv.find(l => l.id === p.id)); }
    };
    if (champ) confetti();
  }
  function lvBox(l) {
    const p = getP(l.id), keys = p.kind === 'P' ? ['stu', 'ctl', 'sta'] : ['con', 'pow', 'spd', 'eye'], er = R(p);
    return `<div class="lvbox" data-pid="${p.id}"><div class="lvh"><b>${p.first} ${p.last}</b><span class="lvtag">Lv ${levelOf(p)}</span><span class="muted" style="font-size:12.5px;margin-left:auto">${p.tp ? `${p.tp} point${p.tp > 1 ? 's' : ''} to spend` : 'All points spent'}</span></div>
      ${(l.learned || []).map(m => `<div class="move learned"><b>Learned ${MOVES[m].name}!</b><span>${MOVES[m].desc}</span></div>`).join('')}
      <div class="rbars">${keys.map(k => `<div class="rbar"><span class="k">${RLAB[k]}</span><span class="bar"><i style="width:${Math.min(100, p.r[k] * 10)}%"></i>${er[k] > p.r[k] ? `<i class="boost" style="width:${Math.min(100 - p.r[k] * 10, (er[k] - p.r[k]) * 10)}%"></i>` : ''}</span><span class="v">${p.r[k]}</span>${p.tp > 0 && p.r[k] < 10 ? `<button class="plus" data-train="${k}" aria-label="Train ${RLAB[k]}">+1</button>` : '<span></span>'}</div>`).join('')}</div></div>`;
  }
  function confetti() {
    if (REDUCED) return;
    const c = document.createElement('canvas'); c.id = 'confetti'; document.body.appendChild(c);
    const x = c.getContext('2d'), W2 = c.width = innerWidth, H2 = c.height = innerHeight;
    const cols = ['#f5b83d', '#6be39b', '#ffffff', teamInfo(C.club).c1, teamInfo(C.club).c2, '#ff6f5e'];
    const ps = Array.from({ length: 140 }, () => ({ x: Math.random() * W2, y: -20 - Math.random() * H2 * .5, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3, r: Math.random() * 6.28, vr: (Math.random() - .5) * .2, c: pick(cols), s: 5 + Math.random() * 6 }));
    const t0 = performance.now();
    const f = t => { x.clearRect(0, 0, W2, H2); for (const p of ps) { p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); } if (t - t0 < 4500) requestAnimationFrame(f); else c.remove(); };
    requestAnimationFrame(f);
  }

  /* =================== ROUTER =================== */
  function go(s) {
    screen = s; closeSheet(); window.scrollTo(0, 0);
    if (s === 'game' && G && !G.over) { if (!humanBatting() && !G.botTac) G.botTac = TUT ? 'swing' : botTactic(G); }
    if (s === 'title') renderTitle(); else if (s === 'settings') renderSettings(); else if (s === 'new') renderNew(); else if (s === 'hub') renderHub(); else if (s === 'game') { renderGameScreen(); if (G && !G.over) setExplain(humanBatting() ? 'You bat. Pick a swing and roll.' : 'You pitch. Tap Pitch.'); } else if (s === 'post') renderPost();
  }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; const b = $('#tInstall'); if (b) b.hidden = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  if ('serviceWorker' in navigator && window.isSecureContext) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));

  load();
  (function intro() {
    if (REDUCED) { go('title'); return; }
    go('title');
    const el = document.createElement('div'); el.id = 'intro';
    el.innerHTML = `<svg viewBox="0 0 300 300" aria-hidden="true"><path class="ifield" d="M150 270 L30 150 A170 170 0 0 1 270 150 Z"/><path class="idirt" d="M150 262 L222 190 L150 118 L78 190 Z"/>
      <path class="iline" d="M150 262 L222 190 L150 118 L78 190 Z"/>${[[222, 190], [150, 118], [78, 190]].map(([x, y], i) => `<rect class="ibase" style="animation-delay:${.55 + i * .12}s;transform-origin:${x}px ${y}px" x="${x - 7}" y="${y - 7}" width="14" height="14" transform="rotate(45 ${x} ${y})"/>`).join('')}
      <g class="iballx"><g class="ibally"><circle r="8" fill="#fff"/><path d="M-4 -6q3 6 0 12M4 -6q-3 6 0 12" stroke="#d1453b" stroke-width="1.3" fill="none"/></g></g></svg>
      <h1>Tactical<span>Baseball</span></h1>`;
    document.body.appendChild(el);
    const done = () => { if (!el.isConnected) return; el.classList.add('out'); setTimeout(() => el.remove(), 450); };
    el.onclick = done; setTimeout(done, 2500);
  })();
  window.__TB = { go, get busy() { return busy; }, get phase() { return phase; } };
})();
