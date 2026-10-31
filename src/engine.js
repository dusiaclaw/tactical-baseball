'use strict';
/* =====================================================================
   TACTICAL BASEBALL — dice engine (pure logic, no DOM)
   Every at-bat: card die (1–3 batter card, 4–6 pitcher card) + two white dice (2–12).
   ===================================================================== */
const VERSION = '2.3';
const CHANGELOG = [
  ['2.3', 'Oct 31, 2026', ['Score card at every half-inning and inning change: both scores, who is up, runs just scored, final-inning and extra-inning tags', 'Changelog has its own button (Settings, and the version link on the title screen)', 'Complete backup: campaign, rosters, stats, gear, settings and imported names in one file. You can restore from the Settings page even with no campaign yet']],
  ['2.2', 'Oct 30, 2026', ['Rating shown in a coloured box on the game cards', 'Power restyles the batter card; Bunt shows only Safe vs Out on the batter card', 'Proper installable app: real manifest, icons and offline support, new app identity to fix a stuck Android install']],
  ['2.1', 'Oct 30, 2026', ['Playoff bracket with sudden-death semifinals and a best-of-3 Swiss Final', 'Tutorial mode: a guided 12-step game from the title screen', 'Pre-game matchup intro with team badges and roster ratings', 'Player of the game, season MVP and best pitcher awards', 'Injuries with automatic bench substitutes', 'Training points can be spent right on the post-game screen', 'Momentum gem flies to the card and glows', 'Pitcher stamina meter; optional level and rating on game cards', 'Back arrow on the player page', 'Changelog in Settings']],
  ['2.0', 'Oct 29, 2026', ['Dice and board game with the Swiss club campaign', 'Gear, levels and learnable moves', 'Drag-and-drop batting order and optimizer', 'Season stats, home parks, real names import, settings page']]
];
const SAVE_KEY = 'tactical-baseball-v2';

/* ---------- utilities ---------- */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rand = () => Math.random();
const d6 = () => 1 + Math.floor(rand() * 6);
function gauss() { let u = 0; while (!u) u = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand()); }
const pick = a => a[Math.floor(rand() * a.length)];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const ordinal = n => n + ((n % 100 > 10 && n % 100 < 14) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
const other = s => s === 'home' ? 'away' : 'home';

/* ---------- data ---------- */
const TEAMS = [
  { id: 'ZHE', name: 'Eighters', city: 'Zürich', badge: '8', c1: '#2457c5', c2: '#f2c230', str: 5.0 },
  { id: 'THF', name: 'Flyers', city: 'Therwil', badge: 'TF', c1: '#2f86d1', c2: '#e9f2fb', str: 6.1 },
  { id: 'BEC', name: 'Cardinals', city: 'Bern', badge: 'BC', c1: '#c4262e', c2: '#f3e6c8', str: 5.6 },
  { id: 'ZHB', name: 'Barracudas', city: 'Zürich', badge: 'ZB', c1: '#0f8b8d', c2: '#f28c28', str: 5.8 },
  { id: 'ZHC', name: 'Challengers', city: 'Zürich', badge: 'ZC', c1: '#6a35a0', c2: '#ece6f5', str: 5.9 },
  { id: 'LUE', name: 'Eagles', city: 'Luzern', badge: 'LE', c1: '#9a2145', c2: '#e0b44a', str: 5.3 },
  { id: 'SIF', name: 'Frogs', city: 'Sissach', badge: 'SF', c1: '#4f9a2a', c2: '#eef7d8', str: 4.8 },
  { id: 'HUU', name: 'Unicorns', city: 'Hünenberg', badge: 'HU', c1: '#c2387a', c2: '#fbe8f1', str: 4.7 }
];
const FIRST = ['Luca', 'Noah', 'Jonas', 'Elias', 'Nico', 'Marco', 'Yannick', 'Simon', 'Fabio', 'Timo', 'Reto', 'Lars', 'Matteo', 'Julien', 'Mathis', 'Kevin', 'Diego', 'Ryo', 'Carlos', 'Jake', 'Sven', 'Andrin', 'Gian', 'Flurin', 'Dario', 'Samuel', 'Levin', 'Joel', 'Pascal', 'Cédric', 'Loïc', 'Tobias', 'Mika', 'Aaron', 'Rafael', 'Hiro', 'Mateo', 'Tyler', 'Owen', 'Benji', 'Nils', 'Silvan', 'Janis', 'Remo', 'Urs', 'Dominik', 'Lionel', 'Emil', 'Kenji', 'Felipe', 'Adrian', 'Mirco', 'Linus', 'Oskar', 'Piotr', 'Tomás'];
const LAST = ['Meier', 'Keller', 'Brunner', 'Baumann', 'Frei', 'Gerber', 'Huber', 'Moser', 'Steiner', 'Wyss', 'Zimmermann', 'Bühler', 'Rossi', 'Bernasconi', 'Fontana', 'Rochat', 'Favre', 'Morel', 'Bonvin', 'Schmid', 'Graf', 'Kälin', 'Lüthi', 'Roth', 'Hess', 'Vogel', 'Arnold', 'Suter', 'Odermatt', 'Caflisch', 'Tanaka', 'Martínez', 'Reyes', 'Novak', 'Kowalski', 'Jensen', 'Okafor', 'Silva', 'Fässler', 'Gisler', 'Imhof', 'Tschopp', 'Zürcher', 'Ammann', 'Blaser', 'Christen', 'Dubois', 'Egli', 'Fuchs', 'Hauser', 'Iten', 'Jaquet', 'Kunz', 'Lang', 'Marti', 'Nussbaum', 'Pfister', 'Ritter', 'Sutter', 'Tobler', 'Ulrich', 'Vonlanthen', 'Wenger', 'Yildiz', 'Zaugg', 'Sato', 'Rivera', 'Duarte'];
const LINEUP_POS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
// [con, pow, spd, eye]
const POS_BIAS = { C: [-.4, .2, -1.4, 0], '1B': [0, 1.2, -1, .3], '2B': [.5, -.8, .8, 0], '3B': [0, .6, -.3, 0], SS: [.3, -.5, 1, 0], LF: [.2, .8, 0, 0], CF: [.3, 0, 1.5, .2], RF: [0, .8, 0, 0], DH: [.4, 1.5, -1, .5], UT: [-.3, -.5, .4, -.3] };
const posLabel = p => p === 'UT' ? 'UT' : p;

/* ---------- outcomes & cards ---------- */
const W = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
const SUMS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const RANK = { HR: 9, '3B': 8, '2B': 7, '1B': 6, BB: 5, FB: 3, GB: 2, DP: 1, K: 0 };
const OUTCOME = {
  HR: { name: 'Home run', short: 'HR', kind: 'hr' }, '3B': { name: 'Triple', short: '3B', kind: 'xbh' }, '2B': { name: 'Double', short: '2B', kind: 'xbh' },
  '1B': { name: 'Single', short: '1B', kind: 'hit' }, BB: { name: 'Walk', short: 'BB', kind: 'bb' }, K: { name: 'Strikeout', short: 'K', kind: 'k' },
  GB: { name: 'Ground out', short: 'GB', kind: 'out' }, DP: { name: 'Double-play ball', short: 'DP', kind: 'out' }, FB: { name: 'Fly out', short: 'FB', kind: 'out' }
};
const onBase = c => c === 'HR' || c === '3B' || c === '2B' || c === '1B' || c === 'BB';
function buildCard(targets) {
  const t = { ...targets }, cells = {};
  for (const s of [7, 6, 8, 5, 9, 4, 10, 3, 11, 2, 12]) {
    let best = null, bd = -1e9;
    for (const k in t) { const d = t[k] - W[s] / 2; if (d > bd) { bd = d; best = k; } }
    cells[s] = best; t[best] -= W[s];
  }
  for (const [lo, hi] of [[2, 12], [3, 11], [4, 10], [5, 9], [6, 8]]) if (RANK[cells[lo]] > RANK[cells[hi]]) [cells[lo], cells[hi]] = [cells[hi], cells[lo]];
  // keep the middle sensible: 7 should not outrank both neighbours' better cell order
  return SUMS.map(s => cells[s]);
}
function batterTargets(r) {
  const HR = Math.max(0, 2.1 + .9 * (r.pow - 5)), D = Math.max(.5, 3.3 + .45 * (r.pow - 5)), T = Math.max(0, .7 + .35 * (r.spd - 5));
  const S = Math.max(4, 9 + 1.15 * (r.con - 5)), BB = Math.max(1, 3.7 + .85 * (r.eye - 5)), K = Math.max(1, 4.6 - .55 * (r.con - 5) + .35 * (r.pow - 5));
  const rest = Math.max(2, 36 - HR - D - T - S - BB - K);
  return { HR, '2B': D, '3B': T, '1B': S, BB, K, GB: rest * .42, DP: rest * .16, FB: rest * .42 };
}
function pitcherTargets(r, f) {
  const K = Math.max(2, 9 + 1.25 * (r.stu - 5) - 4 * f), BB = Math.max(.5, 2 - .5 * (r.ctl - 5) + 2 * f), S = Math.max(1, 3.2 - .6 * (r.stu - 5) + 6 * f);
  const D = .8 + 2 * f, HR = Math.max(0, .3 - .12 * (r.stu - 5) + 1.6 * f);
  const rest = 36 - K - BB - S - D - HR;
  return { K, BB, '1B': S, '2B': D, HR, GB: rest * .4, DP: rest * .2, FB: rest * .4 };
}
const CARD_CACHE = {};
/* ---------- gear, moves, effective ratings ---------- */
const GEAR = {
  bat1: { slot: 'bat', kind: 'H', name: 'Ash bat', cost: 120, b: { pow: 1 } },
  bat2: { slot: 'bat', kind: 'H', name: 'Maple bat', cost: 280, b: { pow: 2 } },
  bat3: { slot: 'bat', kind: 'H', name: 'Pro-model maple bat', cost: 520, b: { pow: 2, con: 1 } },
  bgl1: { slot: 'gloves', kind: 'H', name: 'Batting gloves', cost: 100, b: { con: 1 } },
  bgl2: { slot: 'gloves', kind: 'H', name: 'Pro batting gloves', cost: 260, b: { con: 2 } },
  sun1: { slot: 'shades', kind: 'H', name: 'Sport sunglasses', cost: 90, b: { eye: 1 } },
  sun2: { slot: 'shades', kind: 'H', name: 'Polarized shades', cost: 240, b: { eye: 2 } },
  clt1: { slot: 'cleats', kind: 'H', name: 'Cleats', cost: 90, b: { spd: 1 } },
  clt2: { slot: 'cleats', kind: 'H', name: 'Featherlight cleats', cost: 240, b: { spd: 2 } },
  pgl1: { slot: 'glove', kind: 'P', name: "Pitcher's glove", cost: 140, b: { stu: 1 } },
  pgl2: { slot: 'glove', kind: 'P', name: 'Gold-lace glove', cost: 320, b: { stu: 2 } },
  cap1: { slot: 'cap', kind: 'P', name: 'Lucky cap', cost: 110, b: { ctl: 1 } },
  cap2: { slot: 'cap', kind: 'P', name: 'Flat-brim pro cap', cost: 260, b: { ctl: 2 } },
  slv1: { slot: 'sleeve', kind: 'P', name: 'Compression sleeve', cost: 110, b: { sta: 1 } },
  slv2: { slot: 'sleeve', kind: 'P', name: 'Pro arm sleeve', cost: 260, b: { sta: 2 } }
};
const SLOTS = { H: ['bat', 'gloves', 'shades', 'cleats'], P: ['glove', 'cap', 'sleeve'] };
const SLOT_NAME = { bat: 'Bat', gloves: 'Batting gloves', shades: 'Sunglasses', cleats: 'Cleats', glove: 'Glove', cap: 'Cap', sleeve: 'Arm sleeve' };
const MOVES = {
  spray: { kind: 'H', name: 'Spray Hitter', desc: 'one ground-out box becomes a single', from: ['GB', 'DP'], to: '1B' },
  eye: { kind: 'H', name: 'Patient Eye', desc: 'one strikeout box becomes a walk', from: ['K'], to: 'BB' },
  gap: { kind: 'H', name: 'Gap Hunter', desc: 'one single becomes a double', from: ['1B'], to: '2B' },
  slugger: { kind: 'H', name: 'Big Swing', desc: 'one fly-out box becomes a home run', from: ['FB'], to: 'HR' },
  speedster: { kind: 'H', name: 'Speedster', desc: '+1 SPD on the bases', stat: { spd: 1 } },
  kpitch: { kind: 'P', name: 'Strikeout Pitch', desc: 'one single on his card becomes a strikeout', from: ['1B'], to: 'K' },
  sinker: { kind: 'P', name: 'Sinker', desc: 'one fly-out box becomes a double-play ball', from: ['FB'], to: 'DP' },
  paint: { kind: 'P', name: 'Painted Corners', desc: 'one walk box becomes a strikeout', from: ['BB'], to: 'K' },
  workhorse: { kind: 'P', name: 'Workhorse', desc: '+2 STA, tires later', stat: { sta: 2 } }
};
const MOVE_LEVELS = [3, 6, 10, 15];
function movePlan(p) {
  const r = p.r;
  if (p.kind === 'P') return r.stu >= r.ctl ? ['kpitch', 'sinker', 'workhorse', 'paint'] : ['paint', 'sinker', 'kpitch', 'workhorse'];
  return r.pow >= 6 ? ['gap', 'eye', 'slugger', 'spray'] : r.spd >= 6 ? ['speedster', 'spray', 'eye', 'gap'] : ['spray', 'eye', 'gap', 'slugger'];
}
const levelOf = p => 1 + Math.floor(p.xp / 30);
function R(p) {
  if (!p.gear && !p.moves) return p.r;
  const r = { ...p.r };
  for (const s in p.gear || {}) { const g = GEAR[p.gear[s]]; if (g) for (const k in g.b) r[k] += g.b[k]; }
  for (const m of p.moves || []) { const mv = MOVES[m]; if (mv && mv.stat) for (const k in mv.stat) r[k] += mv.stat[k]; }
  return r;
}
function applyMoves(card, moves) {
  if (!moves || !moves.length) return card;
  const c = card.slice();
  for (const m of moves) {
    const mv = MOVES[m]; if (!mv || !mv.from) continue;
    let bi = -1, bw = 99;
    c.forEach((x, i) => { const w = W[i + 2]; if (mv.from.includes(x) && w >= 2 && w < bw) { bw = w; bi = i; } });
    if (bi < 0) c.forEach((x, i) => { if (bi < 0 && mv.from.includes(x)) bi = i; });
    if (bi >= 0) c[bi] = mv.to;
  }
  return c;
}
function batterCard(p, tactic) {
  const r = R(p), mk = (p.moves || []).join(',');
  const key = 'b' + r.con + '.' + r.pow + '.' + r.spd + '.' + r.eye + '|' + mk;
  const base = CARD_CACHE[key] || (CARD_CACHE[key] = applyMoves(buildCard(batterTargets(r)), p.moves));
  return tactic === 'power' ? base.map(c => c === '1B' ? 'FB' : c === '2B' ? 'HR' : c) : base;
}
function pitcherCard(p, f) {
  const fq = Math.round((f || 0) * 3) / 3;
  const r = R(p), key = 'p' + r.stu + '.' + r.ctl + '_' + fq + '|' + (p.moves || []).join(',');
  return CARD_CACHE[key] || (CARD_CACHE[key] = applyMoves(buildCard(pitcherTargets(r, fq)), p.moves));
}
function cardOdds(card) { const o = {}; card.forEach((c, i) => o[c] = (o[c] || 0) + W[i + 2] / 36); return o; }

/* ---------- campaign ---------- */
let C = null, G = null, PIDX = {};
function indexPlayers() { PIDX = {}; for (const id in C.teams) for (const p of C.teams[id].players) PIDX[p.id] = p; for (const p of C.fa || []) PIDX[p.id] = p; }
const getP = id => PIDX[id];
const teamInfo = id => TEAMS.find(t => t.id === id);
function genName() { for (let i = 0; i < 60; i++) { const f = pick(FIRST), l = pick(LAST), k = f + ' ' + l; if (!C.names[k]) { C.names[k] = 1; return [f, l]; } } return [pick(FIRST), pick(LAST)]; }
function jersey(t) { if (!t) return 1 + Math.floor(rand() * 98); for (let i = 0; i < 99; i++) { const n = 1 + Math.floor(rand() * 98); if (!t.nums[n]) { t.nums[n] = 1; return n; } } return 99; }
const rr = (str, b) => clamp(Math.round(str + b + gauss() * 1.3), 1, 10);
function blankStats() { return { g: 0, pa: 0, ab: 0, h: 0, d: 0, t: 0, hr: 0, rbi: 0, r: 0, bb: 0, k: 0, sb: 0, po: 0, ra: 0, pk: 0, pbb: 0, ph: 0, pg: 0 }; }
function genHitter(pos, str, t) {
  const b = POS_BIAS[pos], [first, last] = genName();
  return { id: 'p' + (C.nid++), first, last, kind: 'H', pos, hand: rand() < .32 ? 'L' : 'R', num: jersey(t),
    r: { con: rr(str, b[0]), pow: rr(str, b[1]), spd: rr(str, b[2]), eye: rr(str, b[3]) }, xp: 0, tp: 0, s: blankStats(), c: blankStats() };
}
function genPitcher(pos, str, t) {
  const [first, last] = genName();
  return { id: 'p' + (C.nid++), first, last, kind: 'P', pos, hand: rand() < .3 ? 'L' : 'R', num: jersey(t),
    r: { stu: rr(str, .2), ctl: rr(str, 0), sta: rr(str, pos === 'SP' ? 1 : -1.5) }, xp: 0, tp: 0, s: blankStats(), c: blankStats() };
}
function ovr(p) { const r = R(p); return p.kind === 'P' ? (1.3 * r.stu + 1 * r.ctl + .5 * r.sta) / 2.8 : (1.25 * r.con + 1.2 * r.pow + .6 * r.spd + .7 * r.eye) / 3.75; }
function autoOrder(hs) {
  const sc = p => p.r.con * 1.1 + p.r.pow + p.r.eye * .6;
  const s = [...hs].sort((a, b) => sc(b) - sc(a));
  const top = s.slice(0, 5).sort((a, b) => (b.r.spd + b.r.con + b.r.eye) - (a.r.spd + a.r.con + a.r.eye))[0];
  return [top, ...s.filter(p => p !== top)];
}
function genTeam(id, str) {
  const t = { id, players: [], lineup: [], bench: [], rotation: [], pen: [], nextSP: 0, nums: {} };
  const hs = LINEUP_POS.map(pos => genHitter(pos, str, t));
  const bench = [genHitter('UT', str - .4, t), genHitter('UT', str - .4, t)];
  const sp = [0, 1, 2].map(() => genPitcher('SP', str, t));
  const rp = [0, 1].map(() => genPitcher('RP', str - .2, t));
  t.players = [...hs, ...bench, ...sp, ...rp];
  t.lineup = autoOrder(hs).map(p => ({ id: p.id, pos: p.pos }));
  t.bench = bench.map(p => p.id); t.rotation = sp.map(p => p.id); t.pen = rp.map(p => p.id);
  return t;
}
function roundRobin(ids) {
  const a = [...ids], n = a.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const games = [];
    for (let i = 0; i < n / 2; i++) { let h = a[i], w = a[n - 1 - i]; if ((r + i) % 2) [h, w] = [w, h]; games.push({ home: h, away: w, res: null }); }
    rounds.push(games); a.splice(1, 0, a.pop());
  }
  return shuffle(rounds);
}
function newCampaign(o) {
  C = { v: 2, club: o.club, innings: o.innings, diff: o.diff, season: 1, week: 0, phase: 'season', outcome: null, credits: 150, nid: 1, names: {},
    teams: {}, schedule: [], fa: [], inv: [], game: null, po: null, hist: [], titles: 0, allW: 0, allL: 0, last: null,
    settings: { sound: true, speed: 'normal' }, created: Date.now() };
  const off = { rookie: -.7, pro: 0, legend: .6 }[o.diff];
  for (const t of TEAMS) C.teams[t.id] = genTeam(t.id, t.str + (t.id === o.club ? 0 : off));
  C.schedule = roundRobin(TEAMS.map(t => t.id));
  genFA(); indexPlayers();
}
function genFA() {
  C.fa = [];
  for (const k of shuffle(['H', 'H', 'P', pick(['H', 'P'])]).slice(0, 3)) {
    const str = 4.8 + rand() * 2.3 + (C.season - 1) * .25;
    const p = k === 'H' ? genHitter(pick(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'UT']), str, null) : genPitcher(pick(['SP', 'SP', 'RP']), str, null);
    p.cost = Math.round((50 + 60 * Math.max(0, ovr(p) - 4)) / 5) * 5;
    C.fa.push(p);
  }
}
function standings() {
  const st = {}; for (const t of TEAMS) st[t.id] = { id: t.id, w: 0, l: 0, rs: 0, ra: 0 };
  for (const rd of C.schedule) for (const g of rd) {
    if (!g.res) continue;
    const hw = g.res.h > g.res.a;
    st[g.home].rs += g.res.h; st[g.home].ra += g.res.a; st[g.away].rs += g.res.a; st[g.away].ra += g.res.h;
    st[hw ? g.home : g.away].w++; st[hw ? g.away : g.home].l++;
  }
  return Object.values(st).sort((a, b) => (b.w - a.w) || ((b.rs - b.ra) - (a.rs - a.ra)) || (b.rs - a.rs));
}
function nextGame() {
  if (C.phase === 'season') {
    const rd = C.schedule[C.week]; if (!rd) return null;
    const g = rd.find(x => x.home === C.club || x.away === C.club);
    return { home: g.home, away: g.away, label: `Week ${C.week + 1} of ${C.schedule.length}`, ref: g };
  }
  if (C.phase === 'playoffs' && C.po) {
    if (C.po.stage === 'semi') { const g = C.po.semis.find(x => (x.home === C.club || x.away === C.club) && !x.res); if (g) return { home: g.home, away: g.away, label: 'Semifinal', ref: g }; }
    if (C.po.stage === 'final' && C.po.final && !C.po.final.res) { const ref = finalGameRef(C.po.final); return { home: ref.home, away: ref.away, label: `Swiss Final · Game ${ref.n}`, ref }; }
  }
  return null;
}
function winnerOf(g) { return g.res.h > g.res.a ? g.home : g.away; }
// best-of-3 Swiss Final: games 1 and 3 at the higher seed, game 2 at the lower seed
function newFinal(hi, lo) { return { home: hi, away: lo, games: [], res: null }; }
function finalGameRef(f) { f.games = f.games || []; const n = f.games.length + 1; return n === 2 ? { home: f.away, away: f.home, res: null, n } : { home: f.home, away: f.away, res: null, n }; }
function seriesWins(f) { const w = { [f.home]: 0, [f.away]: 0 }; for (const g of f.games || []) w[winnerOf(g)]++; return w; }
function recordFinalGame(f, g) { f.games.push(g); const w = seriesWins(f); if (w[f.home] >= 2 || w[f.away] >= 2) f.res = { h: w[f.home], a: w[f.away] }; }
function simFinal(f) { let k = 0; while (!f.res && k++ < 5) { const g = finalGameRef(f); simGame(g); recordFinalGame(f, g); } }
function simGame(ref) {
  const g = newGameState(ref.home, ref.away, null, C.innings, '');
  let guard = 0;
  while (!g.over && guard++ < 600) autoPA(g);
  ref.res = { a: runsOf(g, 'away'), h: runsOf(g, 'home') };
  applyBoxToStats(g); injuries(g);
  for (const id of [ref.home, ref.away]) C.teams[id].nextSP++;
}
function aiGrowth(n) {
  for (const id in C.teams) {
    if (id === C.club) continue;
    const t = C.teams[id];
    for (let i = 0; i < n; i++) { const p = pick(t.players); const k = pick(Object.keys(p.r)); p.r[k] = Math.min(10, p.r[k] + 1); }
  }
}
function setupPlayoffs() {
  const top = standings().slice(0, 4).map(r => r.id);
  C.po = { stage: 'semi', seeds: top, semis: [{ home: top[0], away: top[3], res: null }, { home: top[1], away: top[2], res: null }], final: null, champ: null };
  C.phase = 'playoffs';
  if (!top.includes(C.club)) {
    for (const g of C.po.semis) simGame(g);
    const w = C.po.semis.map(winnerOf); w.sort((a, b) => top.indexOf(a) - top.indexOf(b));
    C.po.final = newFinal(w[0], w[1]); simFinal(C.po.final);
    C.po.stage = 'done'; C.po.champ = winnerOf(C.po.final); C.phase = 'over'; C.outcome = 'missed'; archiveSeason();
  }
}
function seasonAwards() {
  let mvp = null, cy = null, mv = -1, cv = -1e9;
  for (const id in C.teams) for (const p of C.teams[id].players) {
    const s = p.s;
    if (p.kind === 'H' && s.pa >= 6) { const v = s.h + s.d + 2 * s.t + 3 * s.hr + s.bb + .5 * (s.rbi + s.r + s.sb); if (v > mv) { mv = v; mvp = { id: p.id, team: id, name: `${p.first} ${p.last}`, line: `${s.h}-for-${s.ab}, ${s.hr} HR, ${s.rbi} RBI` }; } }
    if (p.kind === 'P' && s.po >= 6) { const v = s.po / 3 + .5 * s.pk - 1.5 * s.ra; if (v > cv) { cv = v; cy = { id: p.id, team: id, name: `${p.first} ${p.last}`, line: `${s.po / 3 | 0}.${s.po % 3} IP, ${s.ra} R, ${s.pk} K` }; } }
  }
  return { mvp, pitcher: cy };
}
function archiveSeason() {
  const st = standings(), me = st.find(r => r.id === C.club);
  C.hist.push({ season: C.season, w: me.w, l: me.l, place: st.indexOf(me) + 1, outcome: C.outcome, champ: C.po ? C.po.champ : null, awards: seasonAwards() });
}
function advanceCalendar(gameRef, res) {
  gameRef.res = res;
  if (C.phase === 'season') {
    for (const g of C.schedule[C.week]) if (!g.res) simGame(g);
    C.week++; aiGrowth(2); genFA();
    if (C.week >= C.schedule.length) setupPlayoffs();
  } else if (C.phase === 'playoffs') {
    const clubWon = winnerOf(gameRef) === C.club;
    if (C.po.stage === 'semi') {
      for (const g of C.po.semis) if (!g.res) simGame(g);
      const w = C.po.semis.map(winnerOf), s = C.po.seeds; w.sort((a, b) => s.indexOf(a) - s.indexOf(b));
      C.po.final = newFinal(w[0], w[1]);
      if (!clubWon) { simFinal(C.po.final); C.po.stage = 'done'; C.po.champ = winnerOf(C.po.final); C.phase = 'over'; C.outcome = 'semi'; archiveSeason(); }
      else { C.po.stage = 'final'; genFA(); }
    } else if (C.po.stage === 'final') {
      const f = C.po.final; recordFinalGame(f, gameRef);
      if (f.res) {
        const champWon = winnerOf(f) === C.club;
        C.po.stage = 'done'; C.po.champ = winnerOf(f); C.phase = 'over';
        C.outcome = champWon ? 'champion' : 'runnerup'; if (champWon) C.titles++;
        archiveSeason();
      }
    }
  }
}
function startNextSeason() {
  C.season++; C.week = 0; C.phase = 'season'; C.outcome = null; C.po = null; C.last = null;
  C.schedule = roundRobin(TEAMS.map(t => t.id));
  aiGrowth(8); C.credits += 100;
  for (const id in C.teams) for (const p of C.teams[id].players) p.s = blankStats();
  genFA(); indexPlayers();
}

/* ---------- game state ---------- */
function newGameState(home, away, human, innings, label) {
  const side = id => {
    const t = C.teams[id], sp = t.rotation[t.nextSP % t.rotation.length];
    const lineup = t.lineup.map(s => ({ ...s })), bench = t.bench.filter(b => !(getP(b).inj > 0)), subs = [];
    for (const sl of lineup) if (getP(sl.id).inj > 0 && bench.length) { const b = bench.shift(); subs.push({ out: sl.id, in: b }); sl.id = b; }
    return { lineup, bench, sp, pen: [...t.pen], subs };
  };
  const A = side(away), H = side(home);
  return { home, away, human, label, innings, inning: 1, half: 0, outs: 0, bases: [null, null, null],
    line: { away: [0], home: [] }, H: { away: 0, home: 0 }, bi: { away: 0, home: 0 },
    gl: { away: A.lineup, home: H.lineup }, bench: { away: A.bench, home: H.bench }, pit: { away: A.sp, home: H.sp },
    bf: { away: 0, home: 0 }, pen: { away: A.pen, home: H.pen }, usedP: { away: [A.sp], home: [H.sp] }, injSubs: { away: A.subs, home: H.subs },
    mom: { away: 2, home: 2 }, box: {}, log: [], over: false, walkoff: false, seq: 0, tactic: 'swing' };
}
const batSide = g => g.half === 0 ? 'away' : 'home';
const fieldSide = g => g.half === 0 ? 'home' : 'away';
const curBatterId = g => g.gl[batSide(g)][g.bi[batSide(g)]].id;
const curBatter = g => getP(curBatterId(g));
const curPitcher = g => getP(g.pit[fieldSide(g)]);
const runsOf = (g, side) => g.line[side].reduce((a, b) => a + (b || 0), 0);
const MOM_MAX = 5;
function pitchCap(p) { const s = R(p).sta; return p.pos === 'SP' ? 8 + 1.5 * s : 3 + .8 * s; }
function fatigueOf(g, side) { const p = getP(g.pit[side]); return clamp((g.bf[side] - pitchCap(p)) / 6, 0, 1); }
function cardsNow(g, tactic) {
  const bat = curBatter(g), pit = curPitcher(g), f = fatigueOf(g, fieldSide(g));
  return { bat: batterCard(bat, tactic), pit: pitcherCard(pit, f), pitFresh: pitcherCard(pit, 0), batBase: batterCard(bat, 'swing'), f };
}
function readDice(g, dice, tactic) {
  const cards = cardsNow(g, tactic), src = dice[0] <= 3 ? 'bat' : 'pit', sum = dice[1] + dice[2];
  return { src, sum, code: cards[src][sum - 2], idx: sum - 2 };
}
function blankBox() { return { pa: 0, ab: 0, h: 0, d: 0, t: 0, hr: 0, rbi: 0, r: 0, bb: 0, k: 0, sb: 0, po: 0, ra: 0, pk: 0, pbb: 0, ph: 0, bf: 0 }; }
function boxOf(g, id) { return g.box[id] || (g.box[id] = blankBox()); }
function logPlay(g, txt, cls) { g.log.unshift({ tag: (g.half === 0 ? '▲' : '▼') + g.inning, txt, cls: cls || '' }); if (g.log.length > 160) g.log.length = 160; }

/* ---------- advancement ---------- */
// Pure: given bases (ids), outs, batter id and code -> {bases, outs, runs, scorers, mv, notes}
function advance(B, outs, batId, code) {
  const mv = [], nb = [null, null, null], moved = new Set(), scorers = [], notes = [];
  let o = outs;
  const spd = id => { const p = getP(id); return p ? R(p).spd : 5; };
  const put = (id, from, to) => { moved.add(from); mv.push({ id, from, to }); if (to === 'out') o++; else if (to >= 4) scorers.push(id); else nb[to - 1] = id; };
  const [r1, r2, r3] = B;
  switch (code) {
    case 'HR': if (r3) put(r3, 3, 4); if (r2) put(r2, 2, 4); if (r1) put(r1, 1, 4); put(batId, 0, 4); break;
    case '3B': if (r3) put(r3, 3, 4); if (r2) put(r2, 2, 4); if (r1) put(r1, 1, 4); put(batId, 0, 3); break;
    case '2B':
      if (r3) put(r3, 3, 4); if (r2) put(r2, 2, 4);
      if (r1) { if (spd(r1) >= 7) { put(r1, 1, 4); notes.push(`${getP(r1).last} (SPD ${spd(r1)}) scores all the way from first`); } else put(r1, 1, 3); }
      put(batId, 0, 2); break;
    case '1B':
      if (r3) put(r3, 3, 4);
      if (r2) { if (spd(r2) >= 5) put(r2, 2, 4); else { put(r2, 2, 3); notes.push(`${getP(r2).last} (SPD ${spd(r2)}) has to stop at third`); } }
      if (r1) put(r1, 1, 2);
      put(batId, 0, 1); break;
    case 'BB':
      if (r1) { if (r2) { if (r3) put(r3, 3, 4); put(r2, 2, 3); } put(r1, 1, 2); }
      put(batId, 0, 1); break;
    case 'K': put(batId, 0, 'out'); break;
    case 'GB':
      put(batId, 0, 'out');
      if (o < 3) { if (r3) put(r3, 3, 4); if (r2) put(r2, 2, 3); if (r1) put(r1, 1, 2); if (r1 || r2 || r3) notes.push('runners move up'); }
      break;
    case 'DP':
      if (r1 && outs < 2) {
        put(r1, 1, 'out'); put(batId, 0, 'out');
        if (o < 3) { if (r3) put(r3, 3, 4); if (r2) put(r2, 2, 3); }
      } else {
        put(batId, 0, 'out');
        if (o < 3) { if (r3) put(r3, 3, 4); if (r2) put(r2, 2, 3); if (r1) put(r1, 1, 2); }
        if (!r1 || outs >= 2) notes.push('no runner on first, so just one out');
      }
      break;
    case 'FB':
      put(batId, 0, 'out');
      if (o < 3 && r3) { put(r3, 3, 4); notes.push('sacrifice fly'); }
      break;
  }
  for (let b = 1; b <= 3; b++) if (B[b - 1] && !moved.has(b)) nb[b - 1] = B[b - 1];
  if (o >= 3) { scorers.length = 0; }
  return { bases: o >= 3 ? [null, null, null] : nb, outs: o, runs: scorers.length, scorers, mv, notes };
}

/* ---------- valuation (run expectancy) ---------- */
const RE = [[.48, .86, 1.10, 1.35, 1.44, 1.75, 1.96, 2.29], [.25, .51, .66, .95, .88, 1.15, 1.37, 1.54], [.10, .22, .32, .35, .43, .48, .57, .75]];
const BCOL = { 0: 0, 1: 1, 2: 2, 4: 3, 3: 4, 5: 5, 6: 6, 7: 7 };
const reOf = (B, outs) => outs >= 3 ? 0 : RE[outs][BCOL[(B[0] ? 1 : 0) | (B[1] ? 2 : 0) | (B[2] ? 4 : 0)]];
function codeValue(g, code) { const a = advance(g.bases, g.outs, 'BAT', code); return a.runs + reOf(a.bases, a.outs) - reOf(g.bases, g.outs); }
function tacticEV(g, tactic) {
  const cards = cardsNow(g, tactic); let ev = 0;
  for (let w = 1; w <= 6; w++) { const card = w <= 3 ? cards.bat : cards.pit; for (let s = 2; s <= 12; s++) ev += W[s] / 36 / 6 * codeValue(g, card[s - 2]); }
  return ev;
}
function tacticOdds(g, tactic) {
  if (tactic === 'bunt') { const b = curBatter(g), need = buntNeed(b); return { ob: (7 - need) / 6, hr: 0 }; }
  const cards = cardsNow(g, tactic); let o = 0, hr = 0;
  const cb = cardOdds(cards.bat), cp = cardOdds(cards.pit);
  for (const k of ['HR', '3B', '2B', '1B', 'BB']) o += .5 * ((cb[k] || 0) + (cp[k] || 0));
  hr = .5 * ((cb.HR || 0) + (cp.HR || 0));
  return { ob: o, hr };
}
// distribution of outcome codes if die i is re-rolled
function rerollDist(g, dice, i, tactic) {
  const out = {};
  for (let f = 1; f <= 6; f++) { const d = dice.slice(); d[i] = f; const c = readDice(g, d, tactic).code; out[c] = (out[c] || 0) + 1 / 6; }
  return out;
}
function rerollEV(g, dice, i, tactic) { let ev = 0; for (let f = 1; f <= 6; f++) { const d = dice.slice(); d[i] = f; ev += codeValue(g, readDice(g, d, tactic).code) / 6; } return ev; }
function rerollGood(g, dice, i, tactic) { const d = rerollDist(g, dice, i, tactic); let p = 0; for (const k in d) if (onBase(k)) p += d[k]; return p; }

/* ---------- bunt & steal ---------- */
const buntNeed = p => R(p).spd >= 7 ? 5 : 6;
function stealInfo(g) { const B = g.bases; if (B[0] && !B[1]) return { from: 1, id: B[0] }; if (B[1] && !B[2]) return { from: 2, id: B[1] }; return null; }
function stealNeed(g) { const si = stealInfo(g); if (!si) return 7; const s = R(getP(si.id)).spd; return clamp((si.from === 1 ? 4 : 5) - (s >= 7 ? 1 : 0) - (s >= 9 ? 1 : 0) + (s <= 3 ? 1 : 0), 2, 6); }

/* ---------- applying results to the real game ---------- */
function gainMom(g, side, n, why) { const before = g.mom[side]; g.mom[side] = Math.min(MOM_MAX, g.mom[side] + n); return g.mom[side] > before ? why : null; }
function applyAtBat(g, code, info) {
  info = info || {};
  const bs = batSide(g), fs = fieldSide(g), batId = curBatterId(g), pitId = g.pit[fs];
  const a = advance(g.bases, g.outs, batId, code);
  const b = boxOf(g, batId), pb = boxOf(g, pitId);
  b.pa++; pb.bf++; g.bf[fs]++;
  if (code === 'BB') { b.bb++; pb.pbb++; }
  else if (info.sac) { }
  else { b.ab++; }
  if (code === 'K') { b.k++; pb.pk++; }
  if (onBase(code) && code !== 'BB') { b.h++; pb.ph++; g.H[bs]++; if (code === '2B') b.d++; if (code === '3B') b.t++; if (code === 'HR') b.hr++; }
  if (code !== 'DP') b.rbi += a.runs;
  for (const id of a.scorers) boxOf(g, id).r++;
  pb.ra += a.runs; pb.po += Math.min(3, a.outs) - g.outs;
  g.line[bs][g.inning - 1] = (g.line[bs][g.inning - 1] || 0) + a.runs;
  const mom = [];
  if (code === '2B' || code === '3B' || code === 'HR') { const m = gainMom(g, bs, 1, 'extra-base hit'); if (m) mom.push({ side: bs, why: m }); }
  if (code === 'K') { const m = gainMom(g, fs, 1, 'strikeout'); if (m) mom.push({ side: fs, why: m }); }
  g.bases = a.bases; g.outs = a.outs;
  g.bi[bs] = (g.bi[bs] + 1) % 9;
  g.seq++;
  return { ...a, mom, code };
}
function applyBunt(g, die) {
  const bat = curBatter(g), need = buntNeed(bat), hit = die >= need;
  const bs = batSide(g), fs = fieldSide(g), batId = bat.id, pitId = g.pit[fs];
  const B = g.bases, mv = [], nb = [null, null, null], scorers = [];
  const anyOn = B.some(Boolean);
  let o = g.outs, code;
  if (hit) { code = 'BH'; mv.push({ id: batId, from: 0, to: 1 }); nb[0] = batId; }
  else { code = anyOn ? 'SAC' : 'BO'; mv.push({ id: batId, from: 0, to: 'out' }); o++; }
  if (o < 3 && (hit || anyOn)) for (let b2 = 3; b2 >= 1; b2--) if (B[b2 - 1]) { mv.push({ id: B[b2 - 1], from: b2, to: b2 + 1 }); if (b2 + 1 >= 4) scorers.push(B[b2 - 1]); else nb[b2] = B[b2 - 1]; }
  const bx = boxOf(g, batId), pb = boxOf(g, pitId);
  bx.pa++; pb.bf++; g.bf[fs]++;
  if (hit) { bx.ab++; bx.h++; pb.ph++; g.H[bs]++; } else if (!anyOn) bx.ab++; else pb.po += 0;
  if (!hit) pb.po++;
  bx.rbi += scorers.length; pb.ra += scorers.length;
  for (const id of scorers) boxOf(g, id).r++;
  g.line[bs][g.inning - 1] = (g.line[bs][g.inning - 1] || 0) + scorers.length;
  g.bases = o >= 3 ? [null, null, null] : nb; g.outs = o; g.bi[bs] = (g.bi[bs] + 1) % 9; g.seq++;
  return { code, mv, runs: scorers.length, scorers, outs: o, notes: [], mom: [], need, die };
}
function applySteal(g, die) {
  const si = stealInfo(g), need = stealNeed(g), safe = die >= need;
  const mv = [{ id: si.id, from: si.from, to: safe ? si.from + 1 : 'out' }];
  g.bases[si.from - 1] = null;
  if (safe) { g.bases[si.from] = si.id; boxOf(g, si.id).sb++; }
  else { g.outs++; boxOf(g, g.pit[fieldSide(g)]).po++; if (g.outs >= 3) g.bases = [null, null, null]; }
  g.seq++;
  return { safe, need, mv, from: si.from, id: si.id };
}
function intentionalWalk(g) { return applyAtBat(g, 'BB', { ibb: true }); }
function changePitcher(g, side, id) {
  const old = getP(g.pit[side]), np = getP(id);
  g.pen[side] = g.pen[side].filter(x => x !== id);
  g.pit[side] = id; g.bf[side] = 0; g.usedP[side].push(id);
  logPlay(g, `${teamInfo(g[side]).name} bring in ${np.first} ${np.last} for ${old.last}.`, 'sys');
}
function pinchHit(g, benchId) {
  const bs = batSide(g), slot = g.gl[bs][g.bi[bs]], old = getP(slot.id), np = getP(benchId);
  slot.id = benchId; g.bench[bs] = g.bench[bs].filter(x => x !== benchId);
  logPlay(g, `${np.first} ${np.last} pinch-hits for ${old.last}.`, 'sys');
}
// returns 'over' | 'half' | null
function afterPlay(g) {
  const hs = runsOf(g, 'home'), as = runsOf(g, 'away');
  if (g.half === 1 && g.inning >= g.innings && hs > as) { g.over = true; g.walkoff = true; return 'over'; }
  if (g.outs >= 3) {
    if (g.half === 0) { if (g.inning >= g.innings && hs > as) { g.over = true; return 'over'; } g.half = 1; g.line.home[g.inning - 1] = 0; }
    else { if (g.inning >= g.innings && hs !== as) { g.over = true; return 'over'; } g.inning++; g.half = 0; g.line.away[g.inning - 1] = 0; }
    g.outs = 0; g.bases = [null, null, null];
    logPlay(g, `${g.half === 0 ? 'Top' : 'Bottom'} of the ${ordinal(g.inning)}${g.inning > g.innings ? ' (extra innings)' : ''}.`, 'sys');
    return 'half';
  }
  return null;
}

/* ---------- bot ---------- */
const BOT = { rookie: { thr: .55, skip: .7, noise: .3 }, pro: { thr: .2, skip: 0, noise: .06 }, legend: { thr: .12, skip: 0, noise: .02 } };
const botCfg = () => BOT[(C && C.diff) || 'pro'];
function botTactic(g) {
  const cfg = botCfg();
  const opts = ['swing', 'power'];
  const b = curBatter(g);
  if ((g.bases[0] || g.bases[1]) && g.outs < 2 && b.r.pow <= 6) opts.push('bunt');
  let best = 'swing', bv = -1e9;
  for (const t of opts) {
    let v = t === 'bunt' ? buntEV(g) : tacticEV(g, t);
    v += gauss() * cfg.noise;
    if (v > bv) { bv = v; best = t; }
  }
  return best;
}
function buntEV(g) {
  const need = buntNeed(curBatter(g)), pH = (7 - need) / 6;
  const hit = advance(g.bases, g.outs, 'BAT', 'BB');
  const B = g.bases, nb = [null, null, null]; let runs = 0; const o = g.outs + 1;
  if (o < 3) for (let b = 3; b >= 1; b--) if (B[b - 1]) { if (b + 1 >= 4) runs++; else nb[b] = 1; }
  const sac = runs + reOf(o >= 3 ? [null, null, null] : nb, o);
  return pH * (hit.runs + reOf(hit.bases, hit.outs)) + (1 - pH) * sac - reOf(g.bases, g.outs);
}
let TUT = null;
function botWantsSteal(g) {
  if (TUT) return false;
  const si = stealInfo(g); if (!si || g.outs >= 2) return false;
  const p = (7 - stealNeed(g)) / 6;
  const nb = g.bases.slice(); nb[si.from - 1] = null; nb[si.from] = 1;
  const ob = g.bases.slice(); ob[si.from - 1] = null;
  const ev = p * reOf(nb, g.outs) + (1 - p) * reOf(ob, g.outs + 1) - reOf(g.bases, g.outs);
  return ev > .03 && rand() < .7;
}
// offense: maximise; defense: minimise. returns die index or -1
function botReroll(g, dice, tactic, role) {
  if (TUT) return -1;
  const cfg = botCfg(), side = role === 'off' ? batSide(g) : fieldSide(g);
  if (g.mom[side] <= 0) return -1;
  if (cfg.skip && rand() < cfg.skip) return -1;
  const v0 = codeValue(g, readDice(g, dice, tactic).code);
  let bi = -1, bv = role === 'off' ? -1e9 : 1e9;
  for (let i = 0; i < 3; i++) { const v = rerollEV(g, dice, i, tactic); if (role === 'off' ? v > bv : v < bv) { bv = v; bi = i; } }
  const late = g.inning >= g.innings ? .06 : 0;
  const gain = role === 'off' ? bv - v0 : v0 - bv;
  return gain > cfg.thr - late ? bi : -1;
}
function botPitchingChange(g, side) {
  if (fatigueOf(g, side) >= .34 && g.pen[side].length) {
    const best = g.pen[side].map(getP).sort((a, b) => ovr(b) - ovr(a))[0];
    changePitcher(g, side, best.id); return true;
  }
  return false;
}
// one full plate appearance with bots on both sides (season simulation & testing)
function autoPA(g, hooks) {
  hooks = hooks || {};
  const bs = batSide(g), fs = fieldSide(g);
  botPitchingChange(g, fs);
  if ((hooks.steal ? hooks.steal(g) : botWantsSteal(g))) { applySteal(g, d6()); if (g.outs >= 3) { afterPlay(g); return; } }
  const tac = hooks.tactic ? hooks.tactic(g) : botTactic(g);
  if (tac === 'bunt') applyBunt(g, d6());
  else {
    const dice = [d6(), d6(), d6()];
    const o = hooks.off ? hooks.off(g, dice, tac) : botReroll(g, dice, tac, 'off'); if (o >= 0) { g.mom[bs]--; dice[o] = d6(); }
    const d = hooks.def ? hooks.def(g, dice, tac) : botReroll(g, dice, tac, 'def'); if (d >= 0) { g.mom[fs]--; dice[d] = d6(); }
    applyAtBat(g, readDice(g, dice, tac).code);
  }
  afterPlay(g);
}

/* ---------- describe ---------- */
function describe(g0, res, ctx) {
  const nm = id => getP(id).last, bat = ctx.bat;
  const runs = res.runs ? ` ${res.scorers.map(nm).join(' and ')} ${res.runs > 1 ? 'score' : 'scores'}.` : '';
  const notes = res.notes && res.notes.length ? ' ' + res.notes.map(n => n[0].toUpperCase() + n.slice(1)).join('. ') + '.' : '';
  const map = { HR: `${bat.last} homers!`, '3B': `${bat.last} triples.`, '2B': `${bat.last} doubles.`, '1B': `${bat.last} singles.`, BB: `${bat.last} walks.`, K: `${bat.last} strikes out.`,
    GB: `${bat.last} grounds out.`, DP: res.mv.filter(m => m.to === 'out').length > 1 ? `${bat.last} grounds into a double play.` : `${bat.last} grounds out.`, FB: `${bat.last} flies out.`,
    SAC: `${bat.last} lays down a sacrifice bunt.`, BH: `${bat.last} bunts for a hit!`, BO: `${bat.last} bunts and is thrown out.` };
  let t = map[res.code] || '';
  if (ctx.ibb) t = `${bat.last} is walked on purpose.`;
  const cls = res.runs ? 'run' : (onBase(res.code) || res.code === 'BH') ? 'hit' : 'out';
  return { t: t + notes + runs, cls };
}

/* ---------- finishing a game ---------- */
function injuries(g) {
  const hurt = [];
  for (const side of ['away', 'home']) {
    const t = C.teams[g[side]];
    for (const p of t.players) if (p.inj > 0) p.inj--;
    for (const sl of g.gl[side]) { const p = getP(sl.id), b = g.box[sl.id]; if (p && b && b.pa && rand() < .035) { p.inj = rand() < .35 ? 2 : 1; hurt.push({ id: p.id, team: g[side], games: p.inj }); } }
  }
  return hurt;
}
function playerOfGame(g) {
  const win = runsOf(g, 'home') > runsOf(g, 'away') ? 'home' : 'away';
  let best = null, bv = -1e9;
  for (const side of ['away', 'home']) {
    const ids = new Set([...g.gl[side].map(s => s.id), ...g.usedP[side], ...Object.keys(g.box).filter(id => C.teams[g[side]].players.some(p => p.id === id))]);
    for (const id of ids) {
      const b = g.box[id]; if (!b) continue;
      let v = b.pa ? b.h * 2 + b.d + 2 * b.t + 3 * b.hr + b.rbi + b.r + b.bb + b.sb : 0;
      if (b.bf) v = Math.max(v, b.po * .6 + b.pk * .8 - b.ra * 1.5);
      if (side === win) v += 2;
      if (v > bv) { bv = v; best = { id, team: g[side], box: b }; }
    }
  }
  return best;
}
function applyBoxToStats(g) {
  for (const id in g.box) {
    const p = getP(id); if (!p) continue; const b = g.box[id];
    for (const s of [p.s, p.c]) { s.g++; for (const k of ['pa', 'ab', 'h', 'd', 't', 'hr', 'rbi', 'r', 'bb', 'k', 'sb', 'po', 'ra', 'pk', 'pbb', 'ph']) s[k] += b[k] || 0; if (b.bf) s.pg++; }
  }
}
const XP_PER_TP = 30;
function finishGame() {
  const g = G, side = g.human, oppSide = other(side), opp = g[oppSide];
  const my = runsOf(g, side), them = runsOf(g, oppSide), won = my > them;
  const ng = nextGame();
  applyBoxToStats(g);
  const pog = playerOfGame(g), hurt = injuries(g).filter(h => h.team === C.club);
  const xp = {}, lv = [];
  for (const p of C.teams[C.club].players) {
    const b = g.box[p.id];
    let x = won ? 5 : 2;
    if (b) x += b.h * 6 + b.d * 3 + b.t * 6 + b.hr * 8 + b.rbi * 3 + b.r * 2 + b.bb * 3 + b.sb * 3 + b.po * 1 + b.pk * 2 - b.ra * 2;
    x = Math.max(2, x);
    const before = Math.floor(p.xp / XP_PER_TP), lvBefore = levelOf(p); p.xp += x; const gained = Math.floor(p.xp / XP_PER_TP) - before;
    const learned = [];
    for (const L of MOVE_LEVELS) if (lvBefore < L && levelOf(p) >= L) {
      p.moves = p.moves || []; const next = movePlan(p).find(m => !p.moves.includes(m));
      if (next && p.moves.length < 4) { p.moves.push(next); learned.push(next); }
    }
    if (gained > 0) { p.tp += gained; lv.push({ id: p.id, n: gained, level: levelOf(p), learned }); }
    xp[p.id] = x;
  }
  const cr = (won ? 120 : 60) + Math.min(60, my * 8);
  C.credits += cr; if (won) C.allW++; else C.allL++;
  C.teams[g.home].nextSP++; C.teams[g.away].nextSP++;
  const summary = { won, my, them, opp, home: g.home, away: g.away, label: g.label, line: JSON.parse(JSON.stringify(g.line)), H: { ...g.H }, innings: g.innings,
    box: Object.fromEntries(Object.entries(g.box).filter(([id]) => C.teams[C.club].players.some(p => p.id === id))), xp, lv, cr, walkoff: g.walkoff, final: /^Swiss Final/.test(g.label), pog, hurt };
  const res = g.home === C.club ? { h: my, a: them } : { h: them, a: my };
  C.game = null; G = null;
  if (ng) advanceCalendar(ng.ref, res);
  summary.phase = C.phase; summary.outcome = C.outcome;
  C.last = summary;
  indexPlayers();
  return summary;
}
function startGame() {
  const ng = nextGame(); if (!ng) return null;
  G = newGameState(ng.home, ng.away, ng.home === C.club ? 'home' : 'away', C.innings, ng.label);
  logPlay(G, `${teamInfo(G.away).name} at ${teamInfo(G.home).name}. ${G.label}.`, 'sys');
  for (const side of ['away', 'home']) for (const sb of G.injSubs[side] || []) logPlay(G, `${getP(sb.out).last} is injured. ${getP(sb.in).last} starts in his place.`, 'sys');
  C.game = G; return G;
}
function buyGear(key) { const g = GEAR[key]; if (!g || C.credits < g.cost) return false; C.credits -= g.cost; (C.inv = C.inv || []).push(key); return true; }
function equipGear(pid, key) {
  const p = getP(pid), g = GEAR[key]; if (!p || !g || g.kind !== p.kind) return false;
  const i = (C.inv || []).indexOf(key); if (i < 0) return false;
  C.inv.splice(i, 1); p.gear = p.gear || {};
  if (p.gear[g.slot]) C.inv.push(p.gear[g.slot]);
  p.gear[g.slot] = key; return true;
}
function unequipGear(pid, slot) { const p = getP(pid); if (!p || !p.gear || !p.gear[slot]) return; (C.inv = C.inv || []).push(p.gear[slot]); delete p.gear[slot]; }
function signFA(faId, releaseId) {
  const fa = C.fa.find(p => p.id === faId), t = C.teams[C.club];
  if (!fa || C.credits < fa.cost) return false;
  const rel = getP(releaseId); if (!rel || rel.kind !== fa.kind) return false;
  C.credits -= fa.cost; fa.num = jersey(t); delete fa.cost;
  t.players = t.players.map(p => p.id === releaseId ? fa : p);
  const swap = arr => arr.map(x => x === releaseId ? fa.id : x);
  t.lineup = t.lineup.map(s => s.id === releaseId ? { id: fa.id, pos: s.pos } : s);
  t.bench = swap(t.bench); t.rotation = swap(t.rotation); t.pen = swap(t.pen);
  if (fa.kind === 'P') fa.pos = t.rotation.includes(fa.id) ? 'SP' : 'RP';
  C.fa = C.fa.filter(p => p.id !== faId);
  indexPlayers(); return true;
}
