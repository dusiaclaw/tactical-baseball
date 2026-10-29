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
  const SET = Object.assign({ sound: true, vibrate: true, speed: 'normal', accent: 'amber', board: 'day', cards: 'classic', odds: true, names: 'fictional' }, (() => { try { return JSON.parse(localStorage.getItem(SET_KEY) || '{}'); } catch (e) { return {}; } })());
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
  function save() { if (!C) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(C)); } catch (e) { toast('Could not save. Browser storage is full or blocked.'); } }
  function load() {
    try { const s = localStorage.getItem(SAVE_KEY); if (!s) return false; const c = JSON.parse(s); if (!c || c.v !== 2 || !c.teams) return false; C = c; G = C.game; indexPlayers(); return true; }
    catch (e) { return false; }
  }
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
  const keyRatings = p => p.kind === 'P' ? `STU ${p.r.stu} · CTL ${p.r.ctl} · STA ${p.r.sta}` : `CON ${p.r.con} · POW ${p.r.pow} · SPD ${p.r.spd} · EYE ${p.r.eye}`;
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
        <button class="btn" id="tHow">How to play</button>
        <button class="btn" id="tSet">Settings</button>
        <button class="btn ghost" id="tInstall" ${installEvt ? '' : 'hidden'}>Install on this phone</button>
      </div>
      <p class="foot">Fan-made game inspired by the Swiss baseball leagues. Not affiliated with or endorsed by the SBSF or any club. ${realNamesOn() ? 'Player names come from public league stats, stored only on this device.' : 'All players are fictional.'} v${VERSION}</p>
    </section>`;
    if (saved) $('#tContinue').onclick = () => { SFX.init(); go('hub'); };
    $('#tNew').onclick = () => { newOpts.confirm = false; go('new'); };
    $('#tHow').onclick = howTo;
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
      <nav class="tabs" id="hTabs">${[['next', 'Next'], ['table', 'Table'], ['roster', 'Roster'], ['scout', 'Scouting'], ['club', 'Club']].map(([k, l]) => `<button class="tab ${hubTab === k ? 'on' : ''}" data-t="${k}">${l}${k === 'roster' && tpTotal ? `<span class="tp">${tpTotal}</span>` : ''}</button>`).join('')}</nav>
    </div></header>
    <main class="hubbody wrap" id="hBody"></main>`;
    $('#hHome').onclick = () => go('title');
    $('#hSet').onclick = () => openSettings('hub');
    $('#hTabs').onclick = e => { const b = e.target.closest('.tab'); if (!b) return; hubTab = b.dataset.t; renderHub(); };
    ({ next: tabNext, table: tabTable, roster: tabRoster, scout: tabScout, club: tabClub })[hubTab]($('#hBody'));
  }
  function tabNext(body) {
    let html = '';
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
        <p style="margin:0;text-align:center;font-size:14px">Your players keep their cards and training points. Rivals get stronger over the winter, and you receive Fr. 100.</p>
        <button class="btn primary block" id="hNextSeason" style="padding:15px;font-size:17px">Start season ${C.season + 1}</button></section>`;
    } else {
      const ng = nextGame();
      const sp = side => { const t = C.teams[ng[side]]; return getP(t.rotation[t.nextSP % t.rotation.length]); };
      const me = ng.home === C.club ? 'home' : 'away';
      html += `<section class="card nextgame"><div class="eyebrow">${ng.label}${ng.label === 'Swiss Final' || ng.label === 'Semifinal' ? ' · single game' : ''}</div>
        <div class="vsrow"><div class="side">${badge(ng.away, 50)}<b>${teamInfo(ng.away).name}</b><small class="num">${recordOf(ng.away)}${ng.away === C.club ? ' · you' : ''}</small></div><div class="at">@</div><div class="side">${badge(ng.home, 50)}<b>${teamInfo(ng.home).name}</b><small class="num">${recordOf(ng.home)}${ng.home === C.club ? ' · you' : ''}</small></div></div>
        <div class="starters"><div><small>Your starter</small><b>${short(sp(me))}</b><span class="muted num" style="font-size:12px">${keyRatings(sp(me))}</span></div><div><small>Their starter</small><b>${short(sp(other(me)))}</b><span class="muted num" style="font-size:12px">${keyRatings(sp(other(me)))}</span></div></div>
        <button class="btn primary block" id="hPlay" style="padding:15px;font-size:17px">Play ball · ${C.innings} innings</button></section>`;
    }
    if (C.last) { const L = C.last; html += `<section class="card"><div class="eyebrow">Last game · ${L.label}</div><div class="lastres" style="margin-top:8px">${badge(L.opp, 26)}<span>${L.won ? '<span class="w">W</span>' : '<span class="l">L</span>'} <span class="num">${L.my}–${L.them}</span> ${L.home === C.club ? 'vs' : 'at'} ${teamInfo(L.opp).name}${L.walkoff ? ' · walk-off' : ''}</span></div></section>`; }
    if (C.po) html += `<section class="card"><div class="eyebrow">Playoffs</div><div class="bracket" style="margin-top:8px">${bracketHTML()}</div></section>`;
    const tp = C.teams[C.club].players.filter(p => p.tp > 0).length;
    if (tp && !C.game) html += `<section class="card" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span><b>${tp} player${tp > 1 ? 's have' : ' has'} training points</b><br><span class="muted" style="font-size:13px">Upgrade their cards in the Roster tab.</span></span><button class="btn small" id="hToRoster">Open roster</button></section>`;
    body.innerHTML = html;
    const p = $('#hPlay'); if (p) p.onclick = () => { SFX.init(); SFX.play('organ'); if (!C.game) { startGame(); save(); } G = C.game; go('game'); };
    const n = $('#hNextSeason'); if (n) n.onclick = () => { startNextSeason(); save(); toast(`Season ${C.season} begins. Fr. 100 added.`); renderHub(); };
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
  function trophySVG() { return `<svg class="trophy" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="gold" x1="0" x2="1"><stop offset="0" stop-color="#b8860b"/><stop offset=".5" stop-color="#ffe08a"/><stop offset="1" stop-color="#b8860b"/></linearGradient></defs><path d="M34 14h52v18c0 20-12 34-26 34S34 52 34 32z" fill="url(#gold)"/><path d="M34 22H18c0 16 8 24 18 24M86 22h16c0 16-8 24-18 24" fill="none" stroke="#e0b44a" stroke-width="5"/><rect x="52" y="64" width="16" height="18" fill="#c99a2e"/><rect x="38" y="82" width="44" height="12" rx="3" fill="url(#gold)"/><rect x="30" y="94" width="60" height="12" rx="3" fill="#7a5a1a"/><circle cx="60" cy="34" r="10" fill="#f7f4ea"/><path d="M54 27q4 7 0 14M66 27q-4 7 0 14" stroke="#d1453b" stroke-width="1.4" fill="none"/></svg>`; }
  function tabTable(body) {
    const st = standings();
    let html = `<section class="card"><div class="eyebrow">Standings · top four make the playoffs</div><table class="std" style="margin-top:6px"><thead><tr><th>Club</th><th>W</th><th>L</th><th>RD</th><th>GB</th></tr></thead><tbody>`;
    st.forEach((r, i) => { const gb = ((st[0].w - r.w) + (r.l - st[0].l)) / 2; html += `<tr class="${r.id === C.club ? 'me' : ''} ${i === 3 ? 'cut' : ''}"><td><span class="tname">${badge(r.id, 20)}${teamInfo(r.id).name}</span></td><td>${r.w}</td><td>${r.l}</td><td>${r.rs - r.ra > 0 ? '+' : ''}${r.rs - r.ra}</td><td>${gb ? gb.toFixed(1).replace('.0', '') : '–'}</td></tr>`; });
    html += `</tbody></table></section>`;
    const lastW = C.phase === 'season' ? C.week - 1 : C.schedule.length - 1;
    if (lastW >= 0) html += `<section class="card"><div class="eyebrow">Week ${lastW + 1} results</div><div class="bracket" style="margin-top:8px">${C.schedule[lastW].map(g => g.res ? `<div class="bm">${[g.away, g.home].map(id => `<span class="t ${winnerOf(g) === id ? 'win' : ''}">${badge(id, 18)}${teamInfo(id).name}</span><span class="s">${id === g.home ? g.res.h : g.res.a}</span>`).join('')}</div>` : '').join('')}</div></section>`;
    if (C.phase === 'season') {
      const up = []; for (let w = C.week; w < C.schedule.length; w++) { const g = C.schedule[w].find(x => x.home === C.club || x.away === C.club); const o = g.home === C.club ? g.away : g.home; up.push(`<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #22362b"><span class="muted num" style="width:58px">Week ${w + 1}</span>${badge(o, 20)}<span>${g.home === C.club ? 'vs' : 'at'} ${teamInfo(o).name}</span></div>`); }
      html += `<section class="card"><div class="eyebrow">Your schedule</div><div style="margin-top:4px">${up.join('')}</div></section>`;
    }
    body.innerHTML = html;
  }

  /* ---------- roster ---------- */
  function tabRoster(body) {
    const t = C.teams[C.club];
    const row = (p, ord, posTxt, extra) => `<button class="prow" data-id="${p.id}"><span class="ord">${ord ?? ''}</span><span class="pos">${posTxt || posLabel(p.pos)}</span><span class="pn"><b>${short(p)}${extra || ''}</b><small>#${p.num} · ${keyRatings(p)}</small></span>${p.tp ? `<span class="tp">${p.tp}</span>` : '<span></span>'}${ovrTag(p)}</button>`;
    const nextSP = t.rotation[t.nextSP % t.rotation.length];
    body.innerHTML = `
      ${C.game ? `<p class="card" style="margin:0;font-size:14px">A game is in progress. Lineup changes apply from the next game; use pinch hitters and the bullpen during play.</p>` : ''}
      <div class="sect"><h3><span>Batting order</span><span>OVR</span></h3>${t.lineup.map((s, i) => row(getP(s.id), i + 1, s.pos)).join('')}</div>
      <div class="sect"><h3><span>Bench</span></h3>${t.bench.map(id => row(getP(id), '', null)).join('')}</div>
      <div class="sect"><h3><span>Rotation</span></h3>${t.rotation.map((id, i) => row(getP(id), i + 1, 'SP', id === nextSP ? '<span class="nxt">NEXT</span>' : '')).join('')}</div>
      <div class="sect"><h3><span>Bullpen</span></h3>${t.pen.map(id => row(getP(id), '', 'RP')).join('')}</div>
      <p class="muted" style="margin:0;font-size:13px;line-height:1.45">Tap a player to see their card, train them, or change their spot. Players earn XP every game; each ${XP_PER_TP} XP gives one training point.</p>`;
    body.onclick = e => { const b = e.target.closest('.prow'); if (b) playerSheet(b.dataset.id); };
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
    const xpIn = p.xp % XP_PER_TP;
    openSheet(`<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><div class="eyebrow">#${p.num} · ${posLabel(p.pos)} · ${handTag(p)}</div><h3>${p.first} ${p.last}</h3></div>${ovrTag(p)}</div>
      <div class="pcard"><div class="hd"><div class="who"><b>${p.kind === 'P' ? 'Pitcher card' : 'Batter card'}</b><small>${p.kind === 'P' ? `Outs ${pct(1 - sm.ob)} · strikeouts ${pct(sm.k)}${p.pos === 'SP' ? ` · tires after about ${Math.round(pitchCap(p))} batters` : ` · tires after about ${Math.round(pitchCap(p))} batters`}` : `On base ${pct(sm.ob)} · home run ${pct(sm.hr)} · strikeout ${pct(sm.k)}`}</small></div></div>${stripHTML(card)}</div>
      <div class="rbars">${keys.map(k => `<div class="rbar"><span class="k">${RLAB[k]}</span><span class="bar"><i style="width:${p.r[k] * 10}%"></i></span><span class="v">${p.r[k]}</span>${p.tp > 0 && p.r[k] < 10 ? `<button class="plus" data-train="${k}" aria-label="Train ${RLAB[k]}">+1</button>` : '<span></span>'}</div>`).join('')}</div>
      <p style="font-size:12.5px" class="muted">${keys.map(k => `<b style="color:var(--text)">${RLAB[k]}</b> ${RDESC[k]}`).join(' · ')}</p>
      <p style="font-size:13px" class="muted">${p.tp ? `<b style="color:var(--amber)">${p.tp} training point${p.tp > 1 ? 's' : ''}</b> to spend. Each +1 can change a box on the card. ` : ''}${XP_PER_TP - xpIn} XP to the next point.</p>
      <p style="font-size:14px"><span class="eyebrow">This season</span><br><span class="num">${line}</span></p>
      <button class="btn small" data-a="edit">Edit name and number</button>
      ${acts}
      <button class="btn block" data-a="close">Done</button>`, sh => {
      sh.onclick = e => {
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
        ${C.hist.map(h => `<div><span>Season ${h.season}: ${h.w}–${h.l}, ${ordinal(h.place)}</span><b>${{ champion: 'Champions', runnerup: 'Final', semi: 'Semifinal', missed: 'No playoffs' }[h.outcome] || ''}</b></div>`).join('')}
      </div></section>
      <button class="btn block" id="cSet">Settings, look and backup</button><button class="btn block" id="cHow">How to play</button>`;
    $('#cSet').onclick = () => openSettings('hub');
    $('#cHow').onclick = howTo;
  }

  /* =================== SETTINGS =================== */
  function openSettings(from) { backTo = from; go('settings'); }
  function seg(id, cur, opts) { return `<div class="chips" id="${id}">${opts.map(([v, l]) => `<button class="chip ${String(cur) === String(v) ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`; }
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
        <div class="setrow"><span>Field</span>${seg('sBoard', SET.board, [['day', 'Day'], ['night', 'Night'], ['paper', 'Paper']])}</div>
        <div class="setrow"><span>Card colours</span>${seg('sCards', SET.cards, [['classic', 'Classic'], ['contrast', 'High contrast']])}</div></section>
      <section class="card setlist"><div class="eyebrow">Sound and feel</div>
        <div class="setrow"><span>Sound</span>${seg('sSnd', SET.sound, [[true, 'On'], [false, 'Off']])}</div>
        <div class="setrow"><span>Vibration</span>${seg('sVib', SET.vibrate, [[true, 'On'], [false, 'Off']])}</div>
        <div class="setrow"><span>Animations</span>${seg('sSpd', SET.speed, [['normal', 'Normal'], ['fast', 'Fast']])}</div>
        <div class="setrow"><span>Show odds</span>${seg('sOdds', SET.odds, [[true, 'On'], [false, 'Off']])}</div></section>
      <section class="card setlist"><div class="eyebrow">Player names</div>
        <p class="muted" style="margin:0;font-size:13.5px;line-height:1.45">${names ? `Real names saved on this phone: ${names.count} players from ${Object.keys(names.teams).length} clubs (${new Date(names.at).toLocaleDateString()}).` : 'Using fictional names.'}</p>
        <div class="setrow"><span>Names in game</span>${seg('sNames', realNamesOn() ? 'real' : 'fictional', [['fictional', 'Fictional'], ['real', 'Real']])}</div>
        <button class="btn" id="sLoad">${names ? 'Update real names' : 'Load real names'}</button></section>
      ${C ? `<section class="card setlist"><div class="eyebrow">Backup</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="cExport" style="flex:1">Export backup</button><button class="btn" id="cImport" style="flex:1">Restore backup</button><input type="file" id="cFile" accept="application/json,.json" hidden></div>
        <button class="btn danger" id="cReset">Start a new campaign</button></section>` : ''}
    </section>`;
    const bindSeg = (id, fn) => { const el = $('#' + id); if (el) el.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; fn(b.dataset.v); SFX.play('tap'); renderSettings(); }; };
    $('#sBack').onclick = () => go(backTo === 'game' && C && C.game ? 'game' : backTo === 'hub' && C ? 'hub' : 'title');
    bindSeg('sInn', v => { C.innings = +v; save(); }); bindSeg('sDiff', v => { C.diff = v; save(); });
    bindSeg('sAcc', v => { SET.accent = v; saveSet(); }); bindSeg('sBoard', v => { SET.board = v; saveSet(); }); bindSeg('sCards', v => { SET.cards = v; saveSet(); });
    bindSeg('sSnd', v => { SET.sound = v === 'true'; saveSet(); }); bindSeg('sVib', v => { SET.vibrate = v === 'true'; saveSet(); });
    bindSeg('sSpd', v => { SET.speed = v; saveSet(); }); bindSeg('sOdds', v => { SET.odds = v === 'true'; saveSet(); });
    bindSeg('sNames', v => { if (v === 'real' && !loadNames()) { namesSheet(); return; } SET.names = v; saveSet(); applyNames(); });
    $('#sLoad').onclick = namesSheet;
    if (C) {
      $('#cReset').onclick = () => { newOpts.confirm = true; go('new'); };
      $('#cExport').onclick = () => {
        try { const blob = new Blob([JSON.stringify(C)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tactical-baseball-${teamInfo(C.club).name.toLowerCase()}-season${C.season}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); toast('Backup file saved.'); }
        catch (e) { toast('Export failed on this device.'); }
      };
      $('#cImport').onclick = () => $('#cFile').click();
      $('#cFile').onchange = e => {
        const f = e.target.files[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = () => { try { const c = JSON.parse(rd.result); if (!c || c.v !== 2 || !c.teams || !c.club) throw 0; C = c; G = C.game; indexPlayers(); applyNames(); save(); toast('Backup restored.'); renderSettings(); } catch (err) { toast('That file is not a Tactical Baseball backup.'); } };
        rd.readAsText(f);
      };
    }
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
  function boardStatic() {
    return `<defs><pattern id="mw" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="20" height="20" style="fill:var(--g1)"/><rect width="10" height="20" style="fill:var(--g2)"/></pattern></defs>
      <rect x="0" y="0" width="300" height="180" fill="url(#mw)"/>
      <path d="M150 176 L248 94 L150 12 L52 94 Z" style="fill:var(--dirt)"/>
      <path d="M150 148 L218 94 L150 40 L82 94 Z" style="fill:var(--infield)"/>
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
        <div class="board" id="board"><svg id="boardSvg" viewBox="44 6 212 174" role="img" aria-label="Bases">${boardStatic()}</svg><div class="banner" id="banner"></div><div class="note" id="note"></div></div>
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
  const gems = side => `<div class="gems" aria-label="${G.mom[side]} momentum">${Array.from({ length: MOM_MAX }, (_, i) => `<i class="gem ${i < G.mom[side] ? 'on' : ''}"></i>`).join('')}</div>`;
  function curTactic() { return humanBatting() ? (G.tactic || 'swing') : (G.botTac || 'swing'); }
  const humanBatting = () => batSide(G) === G.human;
  function renderCards() {
    if (G.over) { $('#cards').innerHTML = ''; return; }
    const bs = batSide(G), fs = fieldSide(G), bat = curBatter(G), pit = curPitcher(G), bt = teamInfo(G[bs]), ft = teamInfo(G[fs]);
    const tac = curTactic(), cards = cardsNow(G, tac === 'bunt' ? 'swing' : tac);
    const lr = lastRoll && lastRoll.seq === G.seq ? lastRoll : null;
    const f = cards.f;
    const batCls = lr ? (lr.src === 'bat' ? 'live' : 'dim') : '', pitCls = lr ? (lr.src === 'pit' ? 'live' : 'dim') : '';
    const chip = tac !== 'swing' ? `<span class="tchip">${tac === 'power' ? 'POWER' : 'BUNT'}</span>` : '';
    $('#cards').innerHTML = `
      <div class="pcard ${batCls}" data-card="bat"><div class="hd"><span class="jn" style="background:${bt.c1};color:${bt.c2}">${icon(true, 18)}</span><b class="nm">${short(bat)}</b>${chip}${gems(bs)}</div>
        ${stripHTML(cards.bat, { pick: lr && lr.src === 'bat' ? lr.idx : null, base: tac === 'power' ? cards.batBase : null, mark: 'pw' })}</div>
      <div class="pcard ${pitCls}" data-card="pit"><div class="hd"><span class="jn" style="background:${ft.c1};color:${ft.c2}">${icon(false, 18)}</span><b class="nm">${short(pit)}</b>${f > 0 ? '<span class="tchip warn">TIRED</span>' : ''}${gems(fs)}</div>
        ${stripHTML(cards.pit, { pick: lr && lr.src === 'pit' ? lr.idx : null, base: f > 0 ? cards.pitFresh : null })}</div>`;
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
      P.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { if (busy) return; G.tactic = b.dataset.t; SFX.play('tap'); renderCards(); renderPanel(); save(); });
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
    return new Promise(res => { phase = { kind: 'reroll', role, dice: dice.slice(), tactic, resolve: res }; renderTray(); renderPanel(); });
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
      let dice = [d6(), d6(), d6()];
      await animRoll(dice, [0, 1, 2]);
      let r = showRoll(dice, tac);
      // offense re-roll by the human
      if (G.mom[bs] > 0 && !onBase(r.code)) {
        const i = await waitReroll('off', dice, tac);
        if (i >= 0) { G.mom[bs]--; SFX.play('gem'); dice[i] = d6(); await animRoll(dice, [i], { start: dice }); r = showRoll(dice, tac); setExplain(`You spent ◆ to re-roll. ` + rollText(dice, tac)); }
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
      let dice = [d6(), d6(), d6()];
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
        if (i >= 0) { G.mom[fs]--; SFX.play('gem'); dice[i] = d6(); await animRoll(dice, [i], { start: dice }); r = showRoll(dice, tac); setExplain(`You spent ◆ to re-roll their die. ` + rollText(dice, tac)); }
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
    for (const m of (res.mom || [])) { banner(`${m.side === G.human ? 'You gain' : teamInfo(G[m.side]).name + ' gain'} ◆ (${m.why})`, 'mom', 1200); SFX.play('gem'); await sleep(500); }
    const end = afterPlay(G);
    if (end) { await endOfHalf(end); return; }
    prepTurn(); save(); busy = false; updateGame();
  }
  async function endOfHalf(end) {
    if (end === 'over') { save(); busy = false; updateGame(); await sleep(700); showGameOver(); return; }
    await sleep(500); banner(G.half === 0 ? `${ordinal(G.inning)} inning` : 'Side retired', '', 1000); await sleep(900);
    lastRoll = null; prepTurn(); save(); busy = false; updateGame();
    setExplain(humanBatting() ? 'You bat. Pick a swing and roll.' : 'You pitch. Tap Pitch.');
  }
  function prepTurn() {
    if (!G || G.over) return;
    if (humanBatting()) { if (botPitchingChange(G, fieldSide(G))) banner('Pitching change', '', 900); G.tactic = 'swing'; }
    else G.botTac = botTactic(G);
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
        else if (a === 'exit') { if (busy) return; save(); closeSheet(); hubTab = 'next'; go('hub'); }
      };
    });
  }
  function showGameOver() {
    if (!G) return;
    const me = runsOf(G, G.human), them = runsOf(G, other(G.human)), won = me > them;
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
      <section class="card" style="display:flex;justify-content:space-between;align-items:center"><span>Prize money</span><b style="color:var(--amber);font-size:20px">Fr. ${L.cr}</b></section>
      ${L.phase === 'over' && !champ ? `<p class="card" style="margin:0">${{ semi: 'Your season ends in the semifinal.', runnerup: 'So close. You fall in the Swiss Final.', missed: 'The season is over.' }[L.outcome] || ''}</p>` : ''}
      ${C.po && C.po.stage === 'final' && L.label === 'Semifinal' ? `<p class="card" style="margin:0">You're through to the Swiss Final against the ${teamInfo(C.po.final.home === C.club ? C.po.final.away : C.po.final.home).name}.</p>` : ''}
      ${C.phase === 'playoffs' && L.label.startsWith('Week') ? `<p class="card" style="margin:0">Regular season complete. You made the playoffs as the ${ordinal(C.po.seeds.indexOf(C.club) + 1)} seed!</p>` : ''}
      <button class="btn primary block" id="pCont" style="padding:15px;font-size:17px">Back to the clubhouse</button>
    </section>`;
    $('#pCont').onclick = () => { hubTab = 'next'; go('hub'); };
    if (champ) confetti();
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
    if (s === 'game' && G && !G.over) { if (!humanBatting() && !G.botTac) G.botTac = botTactic(G); }
    if (s === 'title') renderTitle(); else if (s === 'settings') renderSettings(); else if (s === 'new') renderNew(); else if (s === 'hub') renderHub(); else if (s === 'game') { renderGameScreen(); if (G && !G.over) setExplain(humanBatting() ? 'You bat. Pick a swing and roll.' : 'You pitch. Tap Pitch.'); } else if (s === 'post') renderPost();
  }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; const b = $('#tInstall'); if (b) b.hidden = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  (function manifest() {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
      x.fillStyle = '#0c1611'; x.fillRect(0, 0, 512, 512);
      x.fillStyle = '#c27a4b'; x.beginPath(); x.moveTo(256, 440); x.lineTo(440, 256); x.lineTo(256, 72); x.lineTo(72, 256); x.closePath(); x.fill();
      x.fillStyle = '#367a43'; x.beginPath(); x.moveTo(256, 400); x.lineTo(400, 256); x.lineTo(256, 112); x.lineTo(112, 256); x.closePath(); x.fill();
      const die = (cx, cy, s, v, bg, fg) => { x.fillStyle = bg; x.beginPath(); x.roundRect(cx - s / 2, cy - s / 2, s, s, s * .2); x.fill(); x.fillStyle = fg; const P = [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]; for (const i of PIPS[v]) { x.beginPath(); x.arc(cx + P[i][0] * s * .27, cy + P[i][1] * s * .27, s * .09, 0, 7); x.fill(); } };
      die(200, 270, 150, 5, '#2457c5', '#ffffff'); die(320, 250, 150, 6, '#f6f1e3', '#1b1b1b');
      const icon = c.toDataURL('image/png'), start = location.href.split('#')[0];
      const m = { name: 'Tactical Baseball', short_name: 'Tactical BB', description: 'Dice-and-cards baseball with a Swiss league campaign', start_url: start, scope: start.replace(/[^/]*$/, ''), display: 'standalone', orientation: 'portrait', background_color: '#0c1611', theme_color: '#0c1611', icons: [{ src: icon, sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: icon, sizes: '192x192', type: 'image/png', purpose: 'any' }] };
      const l = document.createElement('link'); l.rel = 'manifest'; l.href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(m)); document.head.appendChild(l);
      for (const rel of ['apple-touch-icon', 'icon']) { const a = document.createElement('link'); a.rel = rel; a.href = icon; document.head.appendChild(a); }
    } catch (e) { }
  })();

  load();
  go('title');
  window.__TB = { go, get busy() { return busy; }, get phase() { return phase; } };
})();
