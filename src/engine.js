'use strict';
/* =====================================================================
   DIAMOND TACTICS — engine (pure logic, no DOM)
   ===================================================================== */
const VERSION = '1.0';
const SAVE_KEY = 'diamond-tactics-v1';

/* ---------- utilities ---------- */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rand = () => Math.random();
function gauss() { let u = 0; while (!u) u = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand()); }
const pick = a => a[Math.floor(rand() * a.length)];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const sigmoid = x => 1 / (1 + Math.exp(-x));
const D2R = Math.PI / 180;
const polar = (deg, d) => [d * Math.sin(deg * D2R), d * Math.cos(deg * D2R)];
const angOf = p => Math.atan2(p[0], p[1]) / D2R;
const lenOf = p => Math.hypot(p[0], p[1]);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const fenceAt = deg => 325 + 60 * Math.cos(2 * clamp(deg, -45, 45) * D2R);
const BASEPT = [[0, 0], [63.6, 63.6], [0, 127.3], [-63.6, 63.6]];
const basePt = b => BASEPT[b % 4];
const ftToM = ft => Math.round(ft * 0.3048);
const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const ordinal = n => n + ((n % 100 > 10 && n % 100 < 14) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
function softmaxPick(scores, T) {
  const mx = Math.max(...scores); const w = scores.map(s => Math.exp((s - mx) / T));
  let r = rand() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; } return w.length - 1;
}
function poisson(l) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rand(); } while (p > L); return k - 1; }

/* ---------- data ---------- */
const TEAMS = [
  { id: 'ZHE', name: 'Eighters', city: 'Zürich', badge: '8', c1: '#2457c5', c2: '#f2c230', str: 5.0, venue: 'HEERENSCHÜRLI · ZÜRICH' },
  { id: 'THF', name: 'Flyers', city: 'Therwil', badge: 'TF', c1: '#2f86d1', c2: '#e9f2fb', str: 6.1, venue: 'KÄNELMATT · THERWIL' },
  { id: 'BEC', name: 'Cardinals', city: 'Bern', badge: 'BC', c1: '#c4262e', c2: '#f3e6c8', str: 5.6, venue: 'BALLPARK · BERN' },
  { id: 'ZHB', name: 'Barracudas', city: 'Zürich', badge: 'ZB', c1: '#0f8b8d', c2: '#f28c28', str: 5.8, venue: 'HEERENSCHÜRLI · ZÜRICH' },
  { id: 'ZHC', name: 'Challengers', city: 'Zürich', badge: 'ZC', c1: '#6a35a0', c2: '#ece6f5', str: 5.9, venue: 'HEERENSCHÜRLI · ZÜRICH' },
  { id: 'LUE', name: 'Eagles', city: 'Luzern', badge: 'LE', c1: '#9a2145', c2: '#e0b44a', str: 5.3, venue: 'EAGLES BALLPARK · LUZERN' },
  { id: 'SIF', name: 'Frogs', city: 'Sissach', badge: 'SF', c1: '#4f9a2a', c2: '#eef7d8', str: 4.8, venue: 'BALLPARK · SISSACH' },
  { id: 'HUU', name: 'Unicorns', city: 'Hünenberg', badge: 'HU', c1: '#c2387a', c2: '#fbe8f1', str: 4.7, venue: 'BALLPARK · HÜNENBERG' }
];
const FIRST = ['Luca', 'Noah', 'Jonas', 'Elias', 'Nico', 'Marco', 'Yannick', 'Simon', 'Fabio', 'Timo', 'Reto', 'Lars', 'Matteo', 'Julien', 'Mathis', 'Kevin', 'Diego', 'Ryo', 'Carlos', 'Jake', 'Sven', 'Andrin', 'Gian', 'Flurin', 'Dario', 'Samuel', 'Levin', 'Joel', 'Pascal', 'Cédric', 'Loïc', 'Tobias', 'Mika', 'Aaron', 'Rafael', 'Hiro', 'Mateo', 'Tyler', 'Owen', 'Benji', 'Nils', 'Silvan', 'Janis', 'Remo', 'Urs', 'Dominik', 'Lionel', 'Emil', 'Kenji', 'Felipe', 'Adrian', 'Mirco', 'Linus', 'Oskar', 'Piotr', 'Tomás'];
const LAST = ['Meier', 'Keller', 'Brunner', 'Baumann', 'Frei', 'Gerber', 'Huber', 'Moser', 'Steiner', 'Wyss', 'Zimmermann', 'Bühler', 'Rossi', 'Bernasconi', 'Fontana', 'Rochat', 'Favre', 'Morel', 'Bonvin', 'Schmid', 'Graf', 'Kälin', 'Lüthi', 'Roth', 'Hess', 'Vogel', 'Arnold', 'Suter', 'Odermatt', 'Caflisch', 'Tanaka', 'Martínez', 'Reyes', 'Novak', 'Kowalski', 'Jensen', 'Okafor', 'Silva', 'Fässler', 'Gisler', 'Imhof', 'Tschopp', 'Zürcher', 'Ammann', 'Blaser', 'Christen', 'Dubois', 'Egli', 'Fuchs', 'Hauser', 'Iten', 'Jaquet', 'Kunz', 'Lang', 'Marti', 'Nussbaum', 'Pfister', 'Ritter', 'Sutter', 'Tobler', 'Ulrich', 'Vonlanthen', 'Wenger', 'Yildiz', 'Zaugg', 'Sato', 'Rivera', 'Duarte'];
const IFP = ['1B', '2B', '3B', 'SS'], OFP = ['LF', 'CF', 'RF'];
const LINEUP_POS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
// [con, pow, spd, eye, fld, arm]
const POS_BIAS = {
  C: [-.5, 0, -1.5, 0, 0, 1.5], '1B': [0, 1.2, -1, .3, -.5, -1], '2B': [.5, -.8, .8, 0, 1, 0], '3B': [0, .6, -.3, 0, .3, 1.2],
  SS: [.2, -.5, 1, 0, 1.5, 1], LF: [.2, .8, 0, 0, -.3, 0], CF: [.3, 0, 1.5, .2, 1.2, .3], RF: [0, .8, 0, 0, 0, 1.3],
  DH: [.4, 1.5, -1, .5, -2, -1], UI: [-.3, -.6, .3, -.3, .8, .4], UO: [-.3, -.4, .6, -.3, .6, .3]
};
const POS_LABEL = { UI: 'IF', UO: 'OF' };
const posLabel = p => POS_LABEL[p] || p;
const FNAME = { P: 'the pitcher', C: 'the catcher', '1B': 'first', '2B': 'second', '3B': 'third', SS: 'short', LF: 'left', CF: 'center', RF: 'right' };

/* ---------- campaign state ---------- */
let C = null, G = null, PIDX = {};
function indexPlayers() { PIDX = {}; for (const id in C.teams) for (const p of C.teams[id].players) PIDX[p.id] = p; for (const p of C.fa || []) PIDX[p.id] = p; }
const getP = id => PIDX[id];
const teamInfo = id => TEAMS.find(t => t.id === id);
const other = s => s === 'home' ? 'away' : 'home';

function genName() {
  for (let i = 0; i < 60; i++) { const f = pick(FIRST), l = pick(LAST), k = f + ' ' + l; if (!C.names[k]) { C.names[k] = 1; return [f, l]; } }
  return [pick(FIRST), pick(LAST)];
}
function jersey(t) { if (!t) return 1 + Math.floor(rand() * 98); for (let i = 0; i < 99; i++) { const n = 1 + Math.floor(rand() * 98); if (!t.nums[n]) { t.nums[n] = 1; return n; } } return 99; }
const rr = (str, b) => clamp(Math.round(str + b + gauss() * 1.25), 1, 10);
function blankStats() { return { g: 0, pa: 0, ab: 0, h: 0, d: 0, t: 0, hr: 0, rbi: 0, r: 0, bb: 0, k: 0, sb: 0, po: 0, ra: 0, pk: 0, pbb: 0, ph: 0, pg: 0 }; }
function genHitter(pos, str, t) {
  const b = POS_BIAS[pos], [first, last] = genName();
  const p = { id: 'p' + (C.nid++), first, last, kind: 'H', pos, hand: rand() < .32 ? 'L' : 'R', num: jersey(t),
    r: { con: rr(str, b[0]), pow: rr(str, b[1]), spd: rr(str, b[2]), eye: rr(str, b[3]), fld: rr(str, b[4]), arm: rr(str, b[5]) },
    xp: 0, tp: 0, s: blankStats(), c: blankStats() };
  p.pull = Math.round(clamp(.1 + (p.r.pow - 5) * .1 + gauss() * .28, -.6, .9) * 100) / 100;
  return p;
}
function genPitcher(pos, str, t) {
  const [first, last] = genName();
  return { id: 'p' + (C.nid++), first, last, kind: 'P', pos, hand: rand() < .3 ? 'L' : 'R', num: jersey(t),
    r: { stu: rr(str, .2), ctl: rr(str, 0), sta: rr(str, pos === 'SP' ? 1 : -1.5) }, xp: 0, tp: 0, s: blankStats(), c: blankStats() };
}
function ovr(p) {
  const r = p.r;
  return p.kind === 'P' ? (1.3 * r.stu + 1.1 * r.ctl + .6 * r.sta) / 3 : (1.2 * r.con + 1.1 * r.pow + .6 * r.spd + .6 * r.eye + .7 * r.fld + .4 * r.arm) / 4.6;
}
function autoOrder(hs) {
  const sc = p => p.r.con * 1.1 + p.r.pow + p.r.eye * .6;
  const s = [...hs].sort((a, b) => sc(b) - sc(a));
  const top = s.slice(0, 5).sort((a, b) => (b.r.spd + b.r.con) - (a.r.spd + a.r.con))[0];
  return [top, ...s.filter(p => p !== top)];
}
function genTeam(id, str) {
  const t = { id, players: [], lineup: [], bench: [], rotation: [], pen: [], nextSP: 0, nums: {} };
  const hs = LINEUP_POS.map(pos => genHitter(pos, str, t));
  const bench = [genHitter('UI', str - .5, t), genHitter('UO', str - .5, t)];
  const sp = [0, 1, 2].map(() => genPitcher('SP', str, t));
  const rp = [0, 1].map(() => genPitcher('RP', str - .2, t));
  t.players = [...hs, ...bench, ...sp, ...rp];
  t.lineup = autoOrder(hs).map(p => ({ id: p.id, pos: p.pos }));
  t.bench = bench.map(p => p.id); t.rotation = sp.map(p => p.id); t.pen = rp.map(p => p.id);
  return t;
}
function fitPen(nat, pos) {
  if (pos === 'DH' || nat === pos) return 0;
  if (nat === 'UI') return IFP.includes(pos) ? .5 : OFP.includes(pos) ? 2.5 : 4;
  if (nat === 'UO') return OFP.includes(pos) ? .5 : IFP.includes(pos) ? 2.5 : 4;
  if (pos === 'C') return 4;
  if (nat === 'C') return 2;
  if (nat === 'DH') return 2.5;
  if (IFP.includes(nat) && IFP.includes(pos)) return 1.5;
  if (OFP.includes(nat) && OFP.includes(pos)) return 1;
  return 2.5;
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
  C = { v: 1, club: o.club, innings: o.innings, diff: o.diff, season: 1, week: 0, phase: 'season', outcome: null, credits: 150, nid: 1, names: {},
    teams: {}, schedule: [], fa: [], game: null, po: null, hist: [], titles: 0, allW: 0, allL: 0, last: null,
    settings: { sound: true, speed: 'normal' }, created: Date.now() };
  const off = { rookie: -.7, pro: 0, legend: .6 }[o.diff];
  for (const t of TEAMS) C.teams[t.id] = genTeam(t.id, t.str + (t.id === o.club ? 0 : off));
  C.schedule = roundRobin(TEAMS.map(t => t.id));
  genFA(); indexPlayers();
}
function genFA() {
  C.fa = [];
  const kinds = shuffle(['H', 'H', 'P', pick(['H', 'P'])]).slice(0, 3);
  for (const k of kinds) {
    const str = 4.7 + rand() * 2.3 + (C.season - 1) * .25;
    const p = k === 'H' ? genHitter(pick(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'UI', 'UO']), str, null) : genPitcher(pick(['SP', 'SP', 'RP']), str, null);
    p.cost = Math.round((50 + 55 * Math.max(0, ovr(p) - 4)) / 5) * 5;
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
    if (C.po.stage === 'final' && C.po.final && !C.po.final.res) return { home: C.po.final.home, away: C.po.final.away, label: 'Swiss Final', ref: C.po.final };
  }
  return null;
}
function teamPower(id) {
  const t = C.teams[id];
  const hs = t.lineup.map(s => getP(s.id));
  const off = avg(hs.map(p => p.r.con * .4 + p.r.pow * .35 + p.r.eye * .15 + p.r.spd * .1));
  const def = avg(hs.map(p => p.r.fld));
  const sp = getP(t.rotation[t.nextSP % t.rotation.length]);
  const pit = (sp.r.stu * .55 + sp.r.ctl * .45) * .75 + def * .25;
  return { off, pit };
}
function simGame(g) {
  const a = teamPower(g.away), h = teamPower(g.home);
  const lam = (o, p) => Math.max(.3, 4.3 * C.innings / 9 * Math.exp(.3 * (o - 5) - .24 * (p - 5)));
  let ra = poisson(lam(a.off, h.pit)), rh = poisson(lam(h.off, a.pit) * 1.04);
  while (ra === rh) { if (rand() < .5 + .05 * (h.off - a.off)) rh++; else ra++; }
  g.res = { a: ra, h: rh };
  for (const id of [g.home, g.away]) C.teams[id].nextSP++;
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
  if (!top.includes(C.club)) { simRestOfPlayoffs(); C.phase = 'over'; C.outcome = 'missed'; archiveSeason(); }
}
function winnerOf(g) { return g.res.h > g.res.a ? g.home : g.away; }
function simRestOfPlayoffs() {
  for (const g of C.po.semis) if (!g.res) simGame(g);
  if (!C.po.final) { const w = C.po.semis.map(winnerOf); const s = C.po.seeds; w.sort((a, b) => s.indexOf(a) - s.indexOf(b)); C.po.final = { home: w[0], away: w[1], res: null }; }
  if (!C.po.final.res) simGame(C.po.final);
  C.po.stage = 'done'; C.po.champ = winnerOf(C.po.final);
}
function archiveSeason() {
  const st = standings(), me = st.find(r => r.id === C.club);
  C.hist.push({ season: C.season, w: me.w, l: me.l, place: st.indexOf(me) + 1, outcome: C.outcome, champ: C.po ? C.po.champ : null });
}
function advanceCalendar(gameRef, res) {
  gameRef.res = res;
  if (C.phase === 'season') {
    for (const g of C.schedule[C.week]) if (!g.res) simGame(g);
    C.week++;
    aiGrowth(2); genFA();
    if (C.week >= C.schedule.length) setupPlayoffs();
  } else if (C.phase === 'playoffs') {
    const clubWon = winnerOf(gameRef) === C.club;
    if (C.po.stage === 'semi') {
      for (const g of C.po.semis) if (!g.res) simGame(g);
      const w = C.po.semis.map(winnerOf), s = C.po.seeds;
      w.sort((a, b) => s.indexOf(a) - s.indexOf(b));
      C.po.final = { home: w[0], away: w[1], res: null };
      if (!clubWon) { simGame(C.po.final); C.po.stage = 'done'; C.po.champ = winnerOf(C.po.final); C.phase = 'over'; C.outcome = 'semi'; archiveSeason(); }
      else { C.po.stage = 'final'; genFA(); }
    } else if (C.po.stage === 'final') {
      C.po.stage = 'done'; C.po.champ = winnerOf(gameRef); C.phase = 'over';
      C.outcome = clubWon ? 'champion' : 'runnerup'; if (clubWon) C.titles++;
      archiveSeason();
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

/* ---------- alignment ---------- */
const ALIGN_BASE = { '1B': [36, 108], '2B': [13, 150], 'SS': [-13, 150], '3B': [-36, 108], LF: [-27, 288], CF: [0, 318], RF: [27, 288] };
const SHIFT_AMT = { '1B': 4, '2B': 16, 'SS': 16, '3B': 6, LF: 12, CF: 12, RF: 12 };
const pullSign = p => p.hand === 'R' ? -1 : 1;
function alignment(preset, hand) {
  const s = hand === 'L' ? 1 : -1, A = { P: [0, 60.5], C: [0, -13] };
  for (const k in ALIGN_BASE) {
    let [a, d] = ALIGN_BASE[k];
    if (preset === 'pull') a += s * SHIFT_AMT[k];
    if (preset === 'oppo') a -= s * SHIFT_AMT[k] * .8;
    if (preset === 'in' && IFP.includes(k)) d = (k === '1B' || k === '3B') ? 80 : 100;
    if (preset === 'deep' && OFP.includes(k)) d = Math.min(d + 32, fenceAt(a) - 14);
    A[k] = polar(a, d);
  }
  return A;
}
function constrainFielder(pos, pt) {
  const a = clamp(angOf(pt), -47, 47); let d = lenOf(pt);
  if (IFP.includes(pos)) d = clamp(d, 55, 175); else if (OFP.includes(pos)) d = clamp(d, 150, fenceAt(a) - 8);
  return polar(a, d);
}

/* ---------- game helpers ---------- */
const batSide = () => G.half === 0 ? 'away' : 'home';
const fieldSide = () => G.half === 0 ? 'home' : 'away';
const humanBatting = () => batSide() === G.human;
const curBatterId = () => G.gl[batSide()][G.bi[batSide()]].id;
const curBatter = () => getP(curBatterId());
const runsOf = side => G.line[side].reduce((a, b) => a + (b || 0), 0);
const bucket = () => G.strikes === 2 ? 'two' : G.balls > G.strikes ? 'ahead' : G.strikes > G.balls ? 'behind' : 'even';
function pitchCap(p) { return p.pos === 'SP' ? 38 + 9 * p.r.sta : 14 + 4 * p.r.sta; }
function fatigue(side) { const p = getP(G.pit[side]); return clamp((G.pc[side] - pitchCap(p)) / 28, 0, 1); }
function mkF(pos, pt, p, fld, arm) { return { pos, pt, p, spd: (OFP.includes(pos) ? 21.5 : 19) + 1.6 * (fld - 5) - (pos === 'C' ? 2 : 0), arm: 85 + 6 * (arm - 5) }; }
function fieldersOf(side) {
  const pts = G.align[side].pts, arr = [];
  for (const slot of G.gl[side]) {
    if (slot.pos === 'DH') continue;
    const p = getP(slot.id);
    arr.push(mkF(slot.pos, pts[slot.pos], p, p.r.fld - fitPen(p.pos, slot.pos), p.r.arm));
  }
  arr.push(mkF('P', pts.P, getP(G.pit[side]), 5, 6));
  return arr;
}
function makeCtx() {
  const fs = fieldSide();
  return { bat: curBatter(), pit: getP(G.pit[fs]), fat: fatigue(fs), F: fieldersOf(fs), bases: G.bases.map(id => id ? getP(id) : null), outs: G.outs, balls: G.balls, strikes: G.strikes };
}
const LOCS = ['inH', 'inL', 'outH', 'outL', 'waste'];
const LOC_NAME = { inH: 'Inside · High', inL: 'Inside · Low', outH: 'Outside · High', outL: 'Outside · Low', waste: 'Waste pitch', mid: 'Hanger, middle-middle', ball: 'Missed, off the plate' };
const locSide = l => l.startsWith('in') ? 'in' : l.startsWith('out') ? 'out' : l;
const locHt = l => l.endsWith('H') ? 'H' : l.endsWith('L') ? 'L' : null;
function readOf(aim, bat) {
  const th = angOf(aim) * pullSign(bat);
  return { side: th > 6 ? 'in' : th < -6 ? 'out' : 'mid', ht: lenOf(aim) >= 150 ? 'H' : 'L' };
}
function stealFrom(B) { if (B[1] && !B[2]) return 2; if (B[0] && !B[1]) return 1; return 0; }
function stealOdds(ctx, si, waste) {
  const r = ctx.bases[si - 1], c = ctx.F.find(f => f.pos === 'C');
  return clamp(.58 + .055 * (r.r.spd - 5) - .045 * (c.p.r.arm - 5) - (waste ? .22 : 0) - (si === 2 ? .08 : 0), .08, .95);
}
const runFirst = p => 4.3 - .13 * (p.r.spd - 5) + (p.hand === 'R' ? .08 : 0);
const legTime = p => 3.75 * (1 - .03 * (p.r.spd - 5));
const batterTime = (p, k) => runFirst(p) + (k - 1) * legTime(p);

/* ---------- resolution ---------- */
// out = {loc, act, actual, res:'ball'|'strike'|'foul'|'inplay', moves, event, decision, steal, wpMoves, bb}
function resolve(ctx, loc, act, opt) {
  opt = opt || {};
  const out = { loc, act, auto: !!opt.auto, thresh: opt.thresh || .6 };
  const { bat, pit, fat } = ctx;
  const same = bat.hand === pit.hand;
  const stu = pit.r.stu + (same ? .8 : -.4) - 2.5 * fat;
  const pMiss = clamp(.11 + .025 * (5 - pit.r.ctl) + .25 * fat, .03, .5);
  let actual = loc;
  if (rand() < pMiss) actual = loc === 'waste' ? 'waste' : (rand() < .55 ? 'ball' : 'mid');
  out.actual = actual;
  const inZone = actual !== 'waste' && actual !== 'ball';
  if (act.type === 'take') {
    const pStrike = actual === 'mid' ? .97 : inZone ? clamp(.66 - .03 * (bat.r.eye - 5), .45, .85) : .06;
    out.res = rand() < pStrike ? 'strike' : 'ball'; out.called = true;
    if (out.res === 'ball' && actual === 'ball' && rand() < .08) out.wp = true;
    return finishNonContact(ctx, out);
  }
  const read = readOf(act.aim, bat);
  let m;
  if (actual === 'mid') m = 2;
  else if (!inZone) m = .5;
  else m = (read.side === locSide(actual) ? 1 : read.side === 'mid' ? .5 : 0) + (read.ht === locHt(actual) ? 1 : 0);
  out.m = m; out.read = read;
  const con = bat.r.con;
  if (act.type === 'bunt') {
    const pMissB = clamp(.12 - .02 * (con - 5) + (inZone ? 0 : .25), .03, .5);
    if (rand() < pMissB) { out.res = 'strike'; out.whiff = true; return finishNonContact(ctx, out); }
    if (rand() < .22) { out.res = 'foul'; out.bunt = true; return finishNonContact(ctx, out); }
    return bunting(ctx, out, act);
  }
  const power = act.type === 'power';
  let pWhiff = inZone ? (power ? .33 : .18) - .08 * m + .03 * (stu - 5) - .025 * (con - 5) - .1 * fat : .5 - .03 * (con - 5) + (power ? .1 : 0);
  pWhiff = clamp(pWhiff, .03, .7);
  if (rand() < pWhiff) { out.res = 'strike'; out.whiff = true; return finishNonContact(ctx, out); }
  const pFoul = clamp(.36 - .05 * m + (inZone ? 0 : .06), .12, .4);
  if (rand() < pFoul) { out.res = 'foul'; return finishNonContact(ctx, out); }
  let q = inZone ? .25 + .24 * m + .035 * (con - 5) - .03 * (stu - 5) + .15 * fat + (actual === 'mid' ? .08 : 0) + (rand() - .5) * .42 : rand() * .35;
  if (!power) q -= .16;
  q = clamp(q, .02, 1.1);
  out.q = q;
  return battedBall(ctx, out, act, q, power, actual, read);
}
function battedBall(ctx, out, act, q, power, actual, read) {
  const bat = ctx.bat, ps = pullSign(bat);
  const aimTh = clamp(angOf(act.aim), -44, 44), aimD = lenOf(act.aim);
  const side = locSide(actual);
  const nat = side === 'in' ? ps * 22 : side === 'out' ? -ps * 14 : side === 'mid' ? aimTh : ps * 6;
  const w = clamp(.25 + .55 * q, .25, .85);
  const sig = (power ? 15 : 11) * (1.3 - Math.min(q, 1));
  let th = aimTh * w + nat * (1 - w) + gauss() * sig;
  let ht = locHt(actual) || read.ht;
  let type;
  let topped = false;
  if (ht === 'H') type = aimD >= 150 ? (power ? 'fly' : (q > .74 ? 'liner' : 'fly')) : (q > .2 ? 'liner' : 'popup');
  else { type = aimD < 150 ? (q > .68 ? 'liner' : 'ground') : (q > .85 ? 'liner' : 'ground'); topped = aimD >= 150; }
  if (type === 'fly' && q < .1) type = 'popup';
  const maxD = (power ? 205 + 230 * Math.min(q, 1.05) + 16 * (bat.r.pow - 5) : 150 + 175 * Math.min(q, 1.05) + 8 * (bat.r.pow - 5)) * (.9 + .1 * rand());
  let d = 0;
  if (type === 'fly') { d = Math.max(140, Math.min(aimD + gauss() * 25 * (1.2 - q), maxD)); }
  else if (type === 'liner') { d = clamp(Math.max(aimD, 120) * .85 + gauss() * 25, 90, maxD * .85); }
  else if (type === 'popup') { d = 50 + rand() * 120; th += gauss() * 15; }
  const bb = { type, th, d, q, power, topped };
  out.bb = bb;
  if (Math.abs(th) > 45) {
    if (type === 'popup' && d < 150 && rand() < .6) {
      bb.foulOut = true; bb.land = polar(clamp(th, -75, 75), Math.min(d, 110)); bb.T = 4; out.res = 'inplay';
      bb.by = ctx.F.reduce((a, f) => dist(f.pt, bb.land) < dist(a.pt, bb.land) ? f : a).pos; bb.caught = true;
      return finishPlay(out, [{ from: 0, to: 'out' }], 'PO');
    }
    out.res = 'foul'; bb.land = polar(clamp(th, -72, 72), type === 'ground' ? 70 : Math.min(Math.max(d, 80), 220));
    return finishNonContact(ctx, out);
  }
  out.res = 'inplay';
  if (type === 'ground') return fieldGround(ctx, out, bb);
  return fieldAir(ctx, out, bb);
}
function fieldAir(ctx, out, bb) {
  const land = polar(bb.th, bb.d); bb.land = land;
  const T = bb.type === 'fly' ? 1.2 + bb.d / 100 : bb.type === 'liner' ? .3 + bb.d / 150 : 3.6 + rand() * .8;
  bb.T = T;
  if (bb.type === 'fly' && bb.d > fenceAt(bb.th)) { bb.hr = true; return hitAdvance(ctx, out, bb, land, T, ctx.F[0], false); }
  const wall = bb.type === 'fly' && bb.d > fenceAt(bb.th) - 14;
  bb.wall = wall;
  let best = null, bp = 0;
  for (const f of ctx.F) {
    if (f.pos === 'C' && bb.type !== 'popup') continue;
    const reach = Math.max(0, T - .45) * f.spd, r = dist(f.pt, land) / Math.max(reach, 1);
    let p = r < .85 ? .98 : r < 1.12 ? .98 * (1.12 - r) / .27 : 0;
    if (wall) p *= .25;
    if (p > bp) { bp = p; best = f; }
  }
  if (best && rand() < bp) { bb.caught = true; bb.by = best.pos; bb.dive = bp < .8; return airOut(ctx, out, bb, best); }
  let tr = Infinity, rf = null;
  for (const f of ctx.F) { if (f.pos === 'C' || f.pos === 'P') continue; const t = .4 + dist(f.pt, land) / f.spd; if (t < tr) { tr = t; rf = f; } }
  let ballPt = land;
  if (tr > T && bb.type !== 'popup') { const late = tr - T; tr += late * 1.2 + .8; ballPt = polar(bb.th, Math.min(bb.d + 25 + late * 30, fenceAt(bb.th) - 4)); }
  else tr = T + .3;
  if (wall) tr += .8;
  tr += .7;
  bb.by = rf.pos; bb.fieldPt = ballPt;
  return hitAdvance(ctx, out, bb, ballPt, tr, rf, bb.type === 'popup' || bb.d < 110);
}
function fieldGround(ctx, out, bb) {
  const v = 90 + 80 * Math.min(bb.q, 1) + (bb.power ? 10 : 0) - (bb.topped ? 30 : 0); bb.v = v;
  const u = [Math.sin(bb.th * D2R), Math.cos(bb.th * D2R)];
  const ballT = t => t / v * (1 + t / 900);
  let best = null, bt = Infinity, dive = false;
  for (const f of ctx.F) {
    if (f.pos === 'C') continue;
    const t = f.pt[0] * u[0] + f.pt[1] * u[1]; if (t < 15) continue;
    const L = Math.abs(f.pt[0] * u[1] - f.pt[1] * u[0]);
    if (f.pos === 'P' && L > 8) continue;
    const tb = ballT(t), tf = .38 + L / (f.spd * .86);
    let ok = false, dv = false;
    if (tf <= tb) ok = true; else if (tf <= tb + .2 && rand() < .5) { ok = true; dv = true; }
    if (ok && t < bt) { bt = t; best = f; dive = dv; }
  }
  bb.u = u;
  if (!best) {
    let of = null, tt = Infinity, opt = null;
    for (const f of ctx.F) {
      if (!OFP.includes(f.pos)) continue;
      for (let t = 130; t <= fenceAt(bb.th) - 5; t += 10) {
        const p = [u[0] * t, u[1] * t], tb = ballT(t), tf = .3 + dist(f.pt, p) / f.spd;
        if (tf <= tb) { const x = Math.max(tb, tf); if (x < tt) { tt = x; of = f; opt = p; } break; }
      }
    }
    if (!of) {
      const t = fenceAt(bb.th) - 4; opt = polar(bb.th, t);
      of = ctx.F.filter(f => OFP.includes(f.pos)).reduce((a, f) => dist(f.pt, opt) < dist(a.pt, opt) ? f : a);
      tt = Math.max(ballT(t) + .8, .3 + dist(of.pt, opt) / of.spd);
    }
    bb.through = true; bb.by = of.pos; bb.fieldPt = opt;
    return hitAdvance(ctx, out, bb, opt, tt + .4, of, false);
  }
  const fpt = [u[0] * bt, u[1] * bt]; bb.fieldPt = fpt; bb.by = best.pos; bb.dive = dive;
  const tf = ballT(bt) + (dive ? .45 : 0) + .1;
  if (OFP.includes(best.pos)) return hitAdvance(ctx, out, bb, fpt, tf + .3, best, true);
  if (rand() < .015) {
    bb.error = true;
    const mv = [{ from: 0, to: 1 }];
    for (let b = 3; b >= 1; b--) if (ctx.bases[b - 1]) mv.push({ from: b, to: b + 1 });
    return finishPlay(out, mv, 'E');
  }
  return groundPlay(ctx, out, bb, best, fpt, tf);
}
function groundPlay(ctx, out, bb, f, fpt, tf) {
  const B = ctx.bases, running = !!out.act.steal;
  const nearBag = base => dist(fpt, basePt(base)) < 28;
  const b1 = runFirst(ctx.bat) + gauss() * .1;
  const toFirst = tf + .5 + dist(fpt, basePt(1)) / f.arm - (f.pos === '1B' && nearBag(1) ? .6 : 0);
  const mv = []; let event = 'GO';
  const forced2 = !!(B[0] && B[1]), forced3 = !!(B[0] && B[1] && B[2]);
  if (B[0] && ctx.outs < 2 && !running) {
    const rt2 = legTime(B[0]) - .25 + gauss() * .1;
    const to2 = tf + (nearBag(2) ? dist(fpt, basePt(2)) / 18 : .5 + dist(fpt, basePt(2)) / f.arm);
    if (to2 < rt2) {
      mv.push({ from: 1, to: 'out' });
      if (to2 + .75 + 90 / 85 < b1) { mv.push({ from: 0, to: 'out' }); event = 'DP'; }
      else { mv.push({ from: 0, to: 1 }); event = 'FC'; }
    } else if (toFirst < b1) { mv.push({ from: 0, to: 'out' }); mv.push({ from: 1, to: 2 }); }
    else { mv.push({ from: 0, to: 1 }); mv.push({ from: 1, to: 2 }); event = 'IH'; }
  } else {
    if (toFirst + gauss() * .08 < b1) mv.push({ from: 0, to: 'out' }); else { mv.push({ from: 0, to: 1 }); event = 'IH'; }
    if (B[0]) mv.push({ from: 1, to: 2 });
  }
  let third = 3;
  if (B[2]) {
    const go = forced3 || running || (ctx.outs < 2 && lenOf(fpt) > 104 && rand() < .85);
    if (go) { mv.push({ from: 3, to: 4 }); third = 4; }
  }
  if (B[1]) {
    const want = forced2 || running || (bb.th > 5 && rand() < .8) || (bb.th > -5 && rand() < .35);
    if (want && (!B[2] || third === 4)) mv.push({ from: 2, to: 3 });
  }
  return finishPlay(out, mv, event);
}
function hitAdvance(ctx, out, bb, ballPt, tr, f, single) {
  const B = ctx.bases, arm = f.arm;
  const at = k => { const dd = dist(ballPt, basePt(k)); return tr + dd / arm + (dd > 120 ? .4 : 0) + (dd > 200 ? .3 : 0); };
  let bt = 1;
  if (bb.hr) bt = 4;
  else if (!single) { for (let k = 2; k <= 3; k++) { if (batterTime(ctx.bat, k) + .25 < at(k)) bt = k; else break; } }
  const moves = [{ from: 0, to: bt }];
  const ev = bb.hr ? 'HR' : ['', '1B', '2B', '3B'][bt];
  if (bb.hr) { for (let b = 1; b <= 3; b++) if (B[b - 1]) moves.push({ from: b, to: 4 }); return finishPlay(out, moves, ev); }
  const minT = {}; let behind = bt;
  for (let b = 1; b <= 3; b++) { if (!B[b - 1]) continue; minT[b] = Math.min(4, Math.max(b, behind >= b ? behind + 1 : b)); behind = minT[b]; }
  const lead = .35 + (out.act.steal ? .9 : 0) + (ctx.outs === 2 ? .45 : 0);
  const order = [3, 2, 1].filter(b => B[b - 1]);
  let ahead = 5;
  const blocked = k => ahead < 4 && k >= ahead;
  for (const b of order) {
    const r = B[b - 1];
    const pAt = k => sigmoid((at(k) - ((k - b) * legTime(r) - lead)) / .4);
    let t = minT[b];
    while (t < 4) { const k = t + 1; if (blocked(k)) break; if (pAt(k) >= .9) t = k; else break; }
    if (b === order[0] && t < 4 && !blocked(t + 1)) { const p = pAt(t + 1); if (p >= .12) out.decision = { from: b, to: t + 1, p, hold: t, id: r.id }; }
    moves.push({ from: b, to: t }); ahead = t;
  }
  out.timePlay = true;
  return finishPlay(out, moves, ev);
}
function airOut(ctx, out, bb, f) {
  const B = ctx.bases, moves = [{ from: 0, to: 'out' }];
  let event = bb.type === 'popup' ? 'PO' : bb.type === 'liner' ? 'LO' : 'FO';
  if (ctx.outs + 1 < 3) {
    const si = stealFrom(B);
    if (out.act.steal && bb.type !== 'fly' && si) {
      if (rand() < .7) { moves.push({ from: si, to: 'out' }); event = 'LDP'; }
    } else if (bb.type === 'fly') {
      const tagP = (b, k) => { const rt = legTime(B[b - 1]) * (k - b); const ta = bb.T + .35 + dist(bb.land, basePt(k)) / f.arm; return sigmoid((ta - rt) / .4); };
      let ahead = 5;
      for (const b of [3, 2]) {
        if (!B[b - 1]) continue;
        const k = b + 1; if (ahead < 4 && k >= ahead) { ahead = b; continue; }
        const p = tagP(b, k);
        if (p >= .9) { moves.push({ from: b, to: k }); ahead = k; }
        else if (p >= .15 && !out.decision) { out.decision = { from: b, to: k, p, hold: b, id: B[b - 1].id, tag: true }; ahead = b; }
        else ahead = b;
      }
    }
  }
  return finishPlay(out, moves, event);
}
function bunting(ctx, out, act) {
  const bat = ctx.bat, B = ctx.bases;
  const th = clamp(angOf(act.aim) * .85 + gauss() * 8, -55, 55);
  const d = clamp(22 + rand() * 38 - (bat.r.con - 5), 15, 70);
  const land = polar(th, d);
  const pop = locHt(out.actual) === 'H' && rand() < .25;
  const bb = { type: pop ? 'popup' : 'bunt', th, d, land, T: pop ? 2.2 : d / 28 };
  out.bb = bb;
  if (Math.abs(th) > 45) { out.res = 'foul'; out.bunt = true; return finishNonContact(ctx, out); }
  out.res = 'inplay';
  const ch = ctx.F.filter(f => ['P', 'C', '1B', '3B'].includes(f.pos));
  let f = ch[0], tF = Infinity;
  for (const x of ch) { const t = .35 + dist(x.pt, land) / (x.spd + 3); if (t < tF) { tF = t; f = x; } }
  bb.by = f.pos; bb.fieldPt = land;
  if (pop) {
    bb.caught = true; const mv = [{ from: 0, to: 'out' }]; const si = stealFrom(B);
    if (si && ctx.outs < 2 && rand() < .35) mv.push({ from: si, to: 'out' });
    return finishPlay(out, mv, 'PO');
  }
  const tField = Math.max(tF, bb.T) + .1;
  const b1 = runFirst(bat) - .2 + gauss() * .1;
  const toFirst = tField + .5 + dist(land, basePt(1)) / f.arm + gauss() * .12;
  const order = [3, 2, 1].filter(b => B[b - 1]);
  const mv = [];
  if (order.length) {
    const leadB = order.find(b => b === 3 ? ctx.outs < 2 : true) || order[order.length - 1];
    const forcedLead = leadB === 1 || (leadB === 2 && B[0]) || (leadB === 3 && B[0] && B[1]);
    const r = B[leadB - 1];
    const rt = legTime(r) - .45 - (leadB === 3 ? .3 : 0);
    const tLead = tField + .45 + dist(land, basePt(leadB + 1)) / f.arm;
    if ((forcedLead || leadB === 3) && tLead < rt - .2) {
      mv.push({ from: leadB, to: 'out' }, { from: 0, to: 1 });
      for (const b of order) if (b < leadB) mv.push({ from: b, to: b + 1 });
      return finishPlay(out, mv, 'FC');
    }
    for (const b of order) mv.push({ from: b, to: b + 1 });
    if (toFirst < b1) { mv.push({ from: 0, to: 'out' }); return finishPlay(out, mv, 'SAC'); }
    mv.push({ from: 0, to: 1 }); return finishPlay(out, mv, 'BH');
  }
  if (toFirst < b1) return finishPlay(out, [{ from: 0, to: 'out' }], 'GO');
  return finishPlay(out, [{ from: 0, to: 1 }], 'BH');
}
function finishNonContact(ctx, out) {
  const B = ctx.bases;
  if (out.act.steal && out.res !== 'foul') {
    const si = stealFrom(B);
    if (si) {
      const p = stealOdds(ctx, si, out.actual === 'waste') + (locHt(out.actual) === 'L' ? .04 : 0);
      const safe = rand() < p;
      const mv = [{ from: si, to: safe ? si + 1 : 'out' }];
      if (si === 2 && B[0]) mv.push({ from: 1, to: 2 });
      out.steal = { from: si, safe, p, id: B[si - 1].id, moves: mv };
    }
  }
  if (out.wp) { const mv = []; for (let b = 3; b >= 1; b--) if (B[b - 1]) mv.push({ from: b, to: b + 1 }); out.wpMoves = mv.length ? mv : null; if (!mv.length) out.wp = false; }
  return out;
}
function finishPlay(out, moves, event) {
  out.moves = moves; out.event = event;
  if (out.decision && out.auto) settleDecision(out, out.decision.p >= out.thresh);
  return out;
}
function settleDecision(out, go) {
  const d = out.decision; if (!d) return;
  const to = go ? (rand() < d.p ? d.to : 'out') : d.hold;
  out.dec = { ...d, go, result: to };
  const i = out.moves.findIndex(m => m.from === d.from);
  if (i >= 0) out.moves[i].to = to; else if (to !== d.from) out.moves.push({ from: d.from, to });
  out.decision = null;
}
function walkMoves(B) { const m = [{ from: 0, to: 1 }]; if (B[0]) { m.push({ from: 1, to: 2 }); if (B[1]) { m.push({ from: 2, to: 3 }); if (B[2]) m.push({ from: 3, to: 4 }); } } return m; }

/* ---------- state transition (shared by AI and real play) ---------- */
// s = {bases:[x,x,x], outs, balls, strikes, batter}
function transition(s, out) {
  const n = { bases: s.bases.slice(), outs: s.outs, balls: s.balls, strikes: s.strikes, scorers: [], paEnd: false, midEnd: false, event: null, anim: [] };
  const apply = (moves, batter) => {
    const occ = n.bases, nb = [null, null, null];
    for (let b = 1; b <= 3; b++) if (occ[b - 1] != null && !moves.some(m => m.from === b)) nb[b - 1] = occ[b - 1];
    const sorted = [...moves].sort((a, b) => (b.from - a.from));
    for (const m of sorted) {
      const id = m.from === 0 ? batter : occ[m.from - 1];
      if (id == null) continue;
      n.anim.push({ id, from: m.from, to: m.to });
      if (m.to === 'out') n.outs++;
      else if (m.to >= 4) n.scorers.push(id);
      else nb[m.to - 1] = id;
    }
    n.bases = nb;
  };
  if (out.steal) apply(out.steal.moves, null);
  if (out.wpMoves) apply(out.wpMoves, null);
  if (n.outs >= 3) { n.midEnd = true; n.bases = [null, null, null]; n.balls = 0; n.strikes = 0; n.runs = 0; n.scorers = []; return n; }
  switch (out.res) {
    case 'ball': n.balls++; if (n.balls >= 4) { n.paEnd = true; n.event = out.ibb ? 'IBB' : 'BB'; apply(walkMoves(n.bases), s.batter); } break;
    case 'strike': n.strikes++; if (n.strikes >= 3) { n.paEnd = true; n.event = 'K'; n.outs++; n.anim.push({ id: s.batter, from: 0, to: 'k' }); } break;
    case 'foul': if (n.strikes < 2) n.strikes++; else if (out.bunt) { n.paEnd = true; n.event = 'K'; n.outs++; } break;
    case 'inplay': n.paEnd = true; n.event = out.event; apply(out.moves, s.batter); break;
  }
  if (n.paEnd && n.event === 'FO' && n.scorers.length && n.outs < 3) n.event = 'SF';
  if (n.outs >= 3) { if (!(out.res === 'inplay' && out.timePlay)) n.scorers = []; n.bases = [null, null, null]; }
  n.runs = n.scorers.length;
  if (n.paEnd) { n.balls = 0; n.strikes = 0; }
  return n;
}

/* ---------- valuation ---------- */
const RE = [[.48, .86, 1.10, 1.35, 1.44, 1.75, 1.96, 2.29], [.25, .51, .66, .95, .88, 1.15, 1.37, 1.54], [.10, .22, .32, .35, .43, .48, .57, .75]];
const BCOL = { 0: 0, 1: 1, 2: 2, 4: 3, 3: 4, 5: 5, 6: 6, 7: 7 };
const CV = { '0-0': 0, '1-0': .035, '2-0': .09, '3-0': .17, '0-1': -.04, '1-1': -.01, '2-1': .04, '3-1': .13, '0-2': -.09, '1-2': -.07, '2-2': -.03, '3-2': .06 };
function stateVal(bases, outs, b, s, ended) { if (outs >= 3) return 0; const bits = (bases[0] ? 1 : 0) | (bases[1] ? 2 : 0) | (bases[2] ? 4 : 0); return RE[outs][BCOL[bits]] + (ended ? 0 : (CV[b + '-' + s] || 0)); }
function outcomeValue(ctx, out) {
  const s = { bases: ctx.bases, outs: ctx.outs, balls: ctx.balls, strikes: ctx.strikes, batter: ctx.bat };
  const n = transition(s, out);
  return n.runs + stateVal(n.bases, n.outs, n.balls, n.strikes, n.paEnd || n.midEnd) - stateVal(s.bases, s.outs, s.balls, s.strikes, false);
}

/* ---------- bot ---------- */
const TEMP = { rookie: .12, pro: .04, legend: .018 };
function predictPitch() {
  const pr = { inH: 1, inL: 1, outH: 1, outL: 1, waste: G.balls === 3 ? .12 : .55 };
  if (C.diff !== 'rookie') { const bk = bucket(); for (const h of G.hist.pitch) pr[h.loc] += h.bk === bk ? 1 : .35; }
  const t = Object.values(pr).reduce((a, b) => a + b, 0); for (const k in pr) pr[k] /= t; return pr;
}
function botBatChoice(ctx, pdIn) {
  const pd = pdIn || predictPitch(), locs = LOCS.filter(l => pd[l] > .01);
  const bat = ctx.bat, ps = pullSign(bat), opts = [];
  for (const th of [-36, -24, -12, 0, 12, 24, 36]) for (const d of [100, 175, 250, 320, 370]) { opts.push({ type: 'contact', aim: polar(th, d) }); opts.push({ type: 'power', aim: polar(th, d) }); }
  opts.push({ type: 'take', aim: [0, 200] });
  if ((ctx.bases[0] || ctx.bases[1]) && ctx.outs < 2 && ctx.strikes < 2 && bat.r.pow <= 6) { opts.push({ type: 'bunt', aim: polar(-24, 40) }); opts.push({ type: 'bunt', aim: polar(24, 40) }); }
  const S = C.diff === 'legend' ? 3 : 2;
  const sc = opts.map(a => {
    let ev = 0;
    for (const l of locs) { let s = 0; for (let i = 0; i < S; i++) s += outcomeValue(ctx, resolve(ctx, l, a, { auto: true, thresh: .6 })); ev += pd[l] * s / S; }
    if (a.type === 'contact' || a.type === 'power') { ev += .02 * (bat.pull || 0) * clamp(angOf(a.aim) * ps / 30, -1, 1); if (a.type === 'power') ev += .006 * (bat.r.pow - 5); }
    return ev;
  });
  const o = opts[softmaxPick(sc, TEMP[C.diff])];
  return { type: o.type, aim: o.aim };
}
function predictHumanBat(ctx) {
  const ps = pullSign(ctx.bat);
  const base = [[25, 280, 'power', 1], [22, 110, 'contact', 1], [-18, 260, 'contact', .8], [-15, 110, 'contact', .8], [0, 250, 'power', .7], [0, 120, 'contact', .7]];
  const list = base.map(([pa, d, type, w]) => ({ act: { type, aim: polar(pa * ps, d) }, w }));
  list.push({ act: { type: 'take', aim: [0, 200] }, w: ctx.balls === 3 ? 1.6 : ctx.strikes === 2 ? .3 : .8 });
  if (C.diff !== 'rookie') {
    const bk = bucket(), recent = G.hist.bat.slice(-18);
    recent.forEach((h, i) => list.push({ act: { type: h.type, aim: polar(h.pa * ps, h.d) }, w: (h.bk === bk ? 1.2 : .5) * (.6 + .4 * i / recent.length) }));
  }
  const t = list.reduce((a, b) => a + b.w, 0); list.forEach(x => x.w /= t); return list;
}
function botPitchChoice(ctx) {
  const acts = predictHumanBat(ctx), S = C.diff === 'legend' ? 3 : 2;
  const sc = LOCS.map(l => { let ev = 0; for (const { act, w } of acts) { let s = 0; for (let i = 0; i < S; i++) s += outcomeValue(ctx, resolve(ctx, l, act, { auto: true, thresh: .65 })); ev += w * s / S; } return -ev; });
  return LOCS[softmaxPick(sc, TEMP[C.diff])];
}
function botStealChoice(ctx) {
  const si = stealFrom(ctx.bases); if (!si || ctx.strikes >= 2 || ctx.outs >= 2) return false;
  const wasteRate = G.hist.pitch.filter(h => h.loc === 'waste').length / Math.max(5, G.hist.pitch.length);
  const p = stealOdds(ctx, si, false) - .22 * wasteRate;
  return p > { rookie: .6, pro: .7, legend: .72 }[C.diff] && rand() < .45;
}
function botAlign() {
  const fs = fieldSide(), bat = curBatter();
  let pm = (bat.pull || 0) * .6, n = 1, deep = 0;
  for (const h of G.hist.bat.slice(-14)) { if (h.type === 'take' || h.type === 'bunt') continue; pm += clamp(h.pa / 20, -1, 1); n++; if (h.d >= 150) deep++; }
  pm /= n;
  const late = G.inning >= G.innings - 1 && Math.abs(runsOf('home') - runsOf('away')) <= 1;
  let preset = 'std';
  if (G.bases[2] && G.outs < 2 && late) preset = 'in';
  else if (pm > .35) preset = 'pull'; else if (pm < -.3) preset = 'oppo'; else if (bat.r.pow >= 7 && deep / n > .5) preset = 'deep';
  if (C.diff === 'rookie' && rand() < .5) preset = 'std';
  G.align[fs] = { preset, custom: false, pts: alignment(preset, bat.hand) };
}
const botDecideThresh = () => ({ rookie: .5, pro: .62, legend: .66 }[C.diff]);

/* ---------- game lifecycle ---------- */
function blankBox() { return { pa: 0, ab: 0, h: 0, d: 0, t: 0, hr: 0, rbi: 0, r: 0, bb: 0, k: 0, sb: 0, po: 0, ra: 0, pk: 0, pbb: 0, ph: 0, pc: 0 }; }
function startGame() {
  const ng = nextGame(); if (!ng) return null;
  const human = ng.home === C.club ? 'home' : 'away';
  const side = id => { const t = C.teams[id]; const sp = t.rotation[t.nextSP % t.rotation.length]; return { lineup: t.lineup.map(s => ({ ...s })), bench: [...t.bench], sp, pen: [...t.pen] }; };
  const A = side(ng.away), H = side(ng.home);
  G = { home: ng.home, away: ng.away, human, label: ng.label, innings: C.innings, inning: 1, half: 0, outs: 0, balls: 0, strikes: 0, bases: [null, null, null],
    line: { away: [0], home: [] }, H: { away: 0, home: 0 }, bi: { away: 0, home: 0 },
    gl: { away: A.lineup, home: H.lineup }, bench: { away: A.bench, home: H.bench }, pit: { away: A.sp, home: H.sp }, sp: { away: A.sp, home: H.sp },
    pc: { away: 0, home: 0 }, pen: { away: A.pen, home: H.pen }, usedP: { away: [A.sp], home: [H.sp] },
    align: { away: { preset: 'std', custom: false, pts: alignment('std', 'R') }, home: { preset: 'std', custom: false, pts: alignment('std', 'R') } },
    steal: false, aim: null, hist: { pitch: [], bat: [] }, botPitch: { n: 0, inn: 0, hi: 0, waste: 0 }, spray: {}, log: [], box: {}, last: null, over: false, walkoff: false, seq: 0 };
  C.game = G;
  logPlay(`${teamInfo(G.away).name} at ${teamInfo(G.home).name}. ${G.label}.`, 'sys');
  prepPA();
  return G;
}
function logPlay(txt, cls) { G.log.unshift({ tag: (G.half === 0 ? '▲' : '▼') + G.inning, txt, cls: cls || '' }); if (G.log.length > 140) G.log.length = 140; }
function prepPA() {
  if (G.over) return;
  const fs = fieldSide();
  G.steal = false;
  if (fs !== G.human) {
    if (fatigue(fs) > .45 && G.pen[fs].length && G.balls === 0 && G.strikes === 0) {
      const best = G.pen[fs].map(getP).sort((a, b) => ovr(b) - ovr(a))[0];
      changePitcher(fs, best.id);
    }
    botAlign();
  } else if (!G.align[fs].custom) {
    G.align[fs].pts = alignment(G.align[fs].preset, curBatter().hand);
  }
}
function changePitcher(side, id) {
  const old = getP(G.pit[side]), np = getP(id);
  G.pen[side] = G.pen[side].filter(x => x !== id);
  G.pit[side] = id; G.pc[side] = 0; G.usedP[side].push(id);
  logPlay(`${teamInfo(G[side]).name} bring in ${np.first} ${np.last} to pitch for ${old.last}.`, 'sys');
}
function pinchHit(benchId) {
  const bs = batSide(), slot = G.gl[bs][G.bi[bs]], old = getP(slot.id), np = getP(benchId);
  slot.id = benchId; G.bench[bs] = G.bench[bs].filter(x => x !== benchId);
  logPlay(`${np.first} ${np.last} pinch-hits for ${old.last}.`, 'sys');
}
function boxOf(id) { return G.box[id] || (G.box[id] = blankBox()); }
function commitPlay(ctx, out, n) {
  const bs = batSide(), batId = ctx.bat.id, pitId = ctx.pit.id;
  if (!out.ibb) boxOf(pitId).pc++;
  for (const id of n.scorers) boxOf(id).r++;
  boxOf(pitId).ra += n.runs;
  boxOf(pitId).po += Math.min(3, n.outs) - G.outs;
  if (out.steal && out.steal.safe) boxOf(out.steal.id).sb++;
  if (n.paEnd) {
    const b = boxOf(batId), ev = n.event, pb = boxOf(pitId);
    b.pa++;
    if (ev === 'BB' || ev === 'IBB') { b.bb++; pb.pbb++; }
    else if (ev === 'K') { b.ab++; b.k++; pb.pk++; }
    else if (['1B', '2B', '3B', 'HR', 'IH', 'BH'].includes(ev)) { b.ab++; b.h++; pb.ph++; G.H[bs]++; if (ev === '2B') b.d++; if (ev === '3B') b.t++; if (ev === 'HR') b.hr++; }
    else if (ev !== 'SF' && ev !== 'SAC') b.ab++;
    if (!['DP', 'E', 'LDP'].includes(ev)) b.rbi += n.runs;
    G.bi[bs] = (G.bi[bs] + 1) % 9;
    if (out.bb && out.bb.land && out.res === 'inplay') {
      (G.spray[batId] = G.spray[batId] || []).push({ pt: (out.bb.fieldPt || out.bb.land), hit: ['1B', '2B', '3B', 'HR', 'IH', 'BH'].includes(ev) });
    }
  }
  G.line[bs][G.inning - 1] = (G.line[bs][G.inning - 1] || 0) + n.runs;
  G.bases = n.bases; G.outs = n.outs; G.balls = n.balls; G.strikes = n.strikes;
  G.seq++;
}
// returns 'over' | 'half' | null
function afterPlay() {
  const hs = runsOf('home'), as = runsOf('away');
  if (G.half === 1 && G.inning >= G.innings && hs > as) { G.over = true; G.walkoff = true; return 'over'; }
  if (G.outs >= 3) {
    if (G.half === 0) { if (G.inning >= G.innings && hs > as) { G.over = true; return 'over'; } G.half = 1; G.line.home[G.inning - 1] = 0; }
    else { if (G.inning >= G.innings && hs !== as) { G.over = true; return 'over'; } G.inning++; G.half = 0; G.line.away[G.inning - 1] = 0; }
    G.outs = 0; G.balls = 0; G.strikes = 0; G.bases = [null, null, null];
    logPlay(`${G.half === 0 ? 'Top' : 'Bottom'} of the ${ordinal(G.inning)}${G.inning > G.innings ? ' (extra innings)' : ''}.`, 'sys');
    return 'half';
  }
  return null;
}
function describe(ctx, out, n) {
  const nm = p => p.last;
  const bat = ctx.bat, ev = n.event, bb = out.bb;
  const dir = th => th < -30 ? 'down the left-field line' : th < -12 ? 'to left' : th < 12 ? 'to center' : th < 30 ? 'to right' : 'down the right-field line';
  const runs = n.runs ? ` ${n.scorers.map(id => nm(getP(id))).join(' and ')} ${n.runs > 1 ? 'score' : 'scores'}.` : '';
  let t = '', cls = '';
  if (out.steal) t += out.steal.safe ? `${nm(getP(out.steal.id))} steals ${ordinal(out.steal.from + 1)}. ` : `${nm(getP(out.steal.id))} caught stealing. `;
  if (out.wpMoves) t += 'Wild pitch, runners move up. ';
  if (n.midEnd) return { t: t + 'That ends the inning.', cls: 'out' };
  if (!n.paEnd) {
    const c = `${n.balls}–${n.strikes}`;
    if (out.res === 'ball') t += `Ball, ${c}.`;
    else if (out.res === 'strike') t += out.whiff ? `Swing and a miss, ${c}.` : `Called strike, ${c}.`;
    else if (out.res === 'foul') t += `Fouled off, ${c}.`;
    return { t: t + runs, cls: out.steal ? (out.steal.safe ? 'hit' : 'out') : '' };
  }
  switch (ev) {
    case 'BB': t += `${nm(bat)} walks.`; cls = 'hit'; break;
    case 'IBB': t += `${nm(bat)} is walked intentionally.`; break;
    case 'K': t += `${nm(bat)} strikes out ${out.whiff ? 'swinging' : 'looking'}.`; cls = 'out'; break;
    case '1B': t += `${nm(bat)} singles ${dir(bb.th)}.`; cls = 'hit'; break;
    case '2B': t += `${nm(bat)} doubles ${dir(bb.th)}${bb.wall ? ' off the wall' : ''}.`; cls = 'hit'; break;
    case '3B': t += `${nm(bat)} triples ${dir(bb.th)}!`; cls = 'hit'; break;
    case 'HR': t += `${nm(bat)} homers ${dir(bb.th)}, ${ftToM(bb.d)} m!`; cls = 'run'; break;
    case 'IH': t += `${nm(bat)} beats it out for an infield hit.`; cls = 'hit'; break;
    case 'BH': t += `${nm(bat)} bunts for a hit.`; cls = 'hit'; break;
    case 'SAC': t += `${nm(bat)} lays down a sacrifice bunt.`; break;
    case 'GO': t += `${nm(bat)} grounds out to ${FNAME[bb.by]}.`; cls = 'out'; break;
    case 'DP': t += `${nm(bat)} grounds into a double play.`; cls = 'out'; break;
    case 'FC': t += `${nm(bat)} reaches on a fielder's choice.`; break;
    case 'FO': t += `${nm(bat)} flies out to ${FNAME[bb.by]}${bb.dive ? ', running catch' : ''}.`; cls = 'out'; break;
    case 'SF': t += `${nm(bat)} hits a sacrifice fly to ${FNAME[bb.by]}.`; break;
    case 'LO': t += `${nm(bat)} lines out to ${FNAME[bb.by]}${bb.dive ? ', diving grab' : ''}.`; cls = 'out'; break;
    case 'LDP': t += `${nm(bat)} lines out and the runner is doubled off.`; cls = 'out'; break;
    case 'PO': t += `${nm(bat)} pops out to ${FNAME[bb.by]}.`; cls = 'out'; break;
    case 'E': t += `Error on ${FNAME[bb.by]}. ${nm(bat)} is safe.`; cls = 'hit'; break;
    default: t += `${nm(bat)} is retired.`;
  }
  if (out.dec && out.dec.go) t += out.dec.result === 'out' ? ` ${nm(getP(out.dec.id))} is thrown out trying for ${out.dec.to === 4 ? 'home' : ordinal(out.dec.to)}.` : '';
  if (n.runs) cls = 'run';
  return { t: t + runs, cls };
}
const EVENT_BANNER = { '1B': 'Single', '2B': 'Double', '3B': 'Triple', HR: 'Home run!', IH: 'Infield hit', BH: 'Bunt hit', SAC: 'Sacrifice', GO: 'Ground out', DP: 'Double play', FC: "Fielder's choice", FO: 'Fly out', SF: 'Sac fly', LO: 'Line out', LDP: 'Double play', PO: 'Pop out', E: 'Error', BB: 'Walk', IBB: 'Intentional walk', K: 'Strikeout' };

function finishGame() {
  const side = G.human, oppSide = other(side), opp = G[oppSide];
  const my = runsOf(side), them = runsOf(oppSide), won = my > them;
  const ng = nextGame();
  for (const id in G.box) {
    const p = getP(id); if (!p) continue; const b = G.box[id];
    for (const s of [p.s, p.c]) {
      s.g++; for (const k of ['pa', 'ab', 'h', 'd', 't', 'hr', 'rbi', 'r', 'bb', 'k', 'sb', 'po', 'ra', 'pk', 'pbb', 'ph']) s[k] += b[k];
      if (b.pc) s.pg++;
    }
  }
  const xp = {}, lv = [];
  for (const p of C.teams[C.club].players) {
    const b = G.box[p.id];
    let x = won ? 6 : 3;
    if (b) x += b.h * 8 + b.d * 4 + b.t * 8 + b.hr * 12 + b.rbi * 4 + b.r * 3 + b.bb * 4 + b.sb * 4 + Math.round(b.po * 1.5) + b.pk * 3 - b.ra * 2;
    x = Math.max(2, x);
    const before = Math.floor(p.xp / 40); p.xp += x; const gained = Math.floor(p.xp / 40) - before;
    if (gained > 0) { p.tp += gained; lv.push({ id: p.id, n: gained }); }
    xp[p.id] = x;
  }
  const cr = (won ? 120 : 60) + Math.min(60, my * 8);
  C.credits += cr;
  if (won) C.allW++; else C.allL++;
  C.teams[G.home].nextSP++; C.teams[G.away].nextSP++;
  const summary = { won, my, them, opp, home: G.home, away: G.away, label: G.label, line: JSON.parse(JSON.stringify(G.line)), H: { ...G.H }, innings: G.innings,
    box: Object.fromEntries(Object.entries(G.box).filter(([id]) => C.teams[C.club].players.some(p => p.id === id))), xp, lv, cr, walkoff: G.walkoff, final: G.label === 'Swiss Final' };
  const res = G.home === C.club ? { h: my, a: them } : { h: them, a: my };
  C.game = null; G = null;
  if (ng) advanceCalendar(ng.ref, res);
  summary.phase = C.phase; summary.outcome = C.outcome;
  C.last = summary;
  indexPlayers();
  return summary;
}

/* ---------- roster management ---------- */
function signFA(faId, releaseId) {
  const fa = C.fa.find(p => p.id === faId), t = C.teams[C.club];
  if (!fa || C.credits < fa.cost) return false;
  const rel = getP(releaseId); if (!rel || rel.kind !== fa.kind) return false;
  C.credits -= fa.cost;
  fa.num = jersey(t); delete fa.cost;
  t.players = t.players.map(p => p.id === releaseId ? fa : p);
  const swap = arr => arr.map(x => x === releaseId ? fa.id : x);
  t.lineup = t.lineup.map(s => s.id === releaseId ? { id: fa.id, pos: s.pos } : s);
  t.bench = swap(t.bench); t.rotation = swap(t.rotation); t.pen = swap(t.pen);
  if (fa.kind === 'P') fa.pos = t.rotation.includes(fa.id) ? 'SP' : 'RP';
  C.fa = C.fa.filter(p => p.id !== faId);
  indexPlayers();
  return true;
}
