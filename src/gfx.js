/* ---------- graphics: stadiums, sky and weather, crests, player sprites ---------- */
/* The board is a real diamond seen from a raised camera: y is squashed by FY. fp() maps (angle from centre field, distance from home) to board points. */
const FY = 62 / 78, HOME = [150, 156];
const fp = (a, d) => { const r = a * Math.PI / 180; return [150 + d * Math.sin(r), 156 - FY * d * Math.cos(r)]; };
const STADIUM = {
  ZHE: { name: 'Eighters Park', R: 205, st: 20, wall: '#1c3f8f', sb: 0, scene: 'city' },
  THF: { name: 'Flyers Field', R: 199, st: 14, wall: '#1f5f96', sb: -17, scene: 'hills' },
  BEC: { name: 'Cardinals Yard', R: 207, st: 20, wall: '#8e1c22', sb: 16, scene: 'alps' },
  ZHB: { name: 'Lakeside Park', R: 202, st: 16, wall: '#0b6466', sb: 0, scene: 'lake' },
  ZHC: { name: 'Challengers Stadium', R: 209, st: 24, wall: '#4b2478', sb: 15, scene: 'towers', monster: 1 },
  LUE: { name: 'Eagles Nest', R: 203, st: 18, wall: '#6d1631', sb: -16, scene: 'peak' },
  SIF: { name: 'Frog Pond', R: 197, st: 12, wall: '#356b1c', sb: 0, scene: 'forest' },
  HUU: { name: 'Unicorn Meadow', R: 200, st: 14, wall: '#8c2658', sb: 17, scene: 'castle' }
};
const WX_NAME = { clear: 'Clear', cloud: 'Cloudy', rain: 'Rain' }, TIME_NAME = { day: 'Day game', dusk: 'Evening game', night: 'Night game' };
function pickWx() { const a = Math.random(), b = Math.random(); return { time: a < .5 ? 'day' : a < .72 ? 'dusk' : 'night', w: b < .55 ? 'clear' : b < .8 ? 'cloud' : 'rain' }; }
function wxLabel(wx) { return `${TIME_NAME[wx.time]} · ${WX_NAME[wx.w]}`; }
function wxShort(wx) { return `${{ day: 'Day', dusk: 'Evening', night: 'Night' }[wx.time]} · ${WX_NAME[wx.w]}`; }
function skyPal(wx) {
  const n = wx.time === 'night', d = wx.time === 'dusk', grey = wx.w !== 'clear';
  if (n) return { sky: grey ? ['#0a0e1a', '#1a2233', '#252e40'] : ['#040818', '#0d1838', '#1a2c5c'], far: '#1c2a4f', mid: '#111b38', g1: '#16304a', g2: '#102540', water: '#12284f', lit: 1, tint: .44 };
  if (d) return { sky: grey ? ['#3d3a55', '#7a6470', '#a98a80'] : ['#2f2a6b', '#d9667a', '#ffc978'], far: '#7d5d8f', mid: '#4a376b', g1: '#4d5a6e', g2: '#3d4a5f', water: '#b9708a', lit: 1, tint: .2 };
  if (wx.w === 'rain') return { sky: ['#56616b', '#77838c', '#99a4ab'], far: '#7b8a94', mid: '#5e6e79', g1: '#4d7d59', g2: '#42704e', water: '#6f8794', lit: 0, tint: .14 };
  if (grey) return { sky: ['#8d9aa5', '#aeb9c1', '#cfd6da'], far: '#93a5b1', mid: '#6f8794', g1: '#5a9160', g2: '#4d8254', water: '#8fa9b8', lit: 0, tint: .06 };
  return { sky: ['#3f9be6', '#84c4f4', '#c9e8fb'], far: '#8fb9da', mid: '#5f93b8', g1: '#5aa856', g2: '#4a9448', water: '#3d8fd0', lit: 0, tint: 0 };
}
const B0 = 60; // scenery base line, hidden behind the stands
const bld = (x, w, h, c, lit) => `<rect x="${x}" y="${B0 - h}" width="${w}" height="${h}" fill="${c}"/>${lit ? `<rect x="${x + 1.5}" y="${B0 - h + 2}" width="${w - 3}" height="${h - 2}" fill="url(#win)"/>` : ''}`;
const pine = (x, h, c) => `<path d="M${x} ${B0 - h} L${x + h * .32} ${B0} H${x - h * .32} Z" fill="${c}"/>`;
const tree = (x, y, r, c) => `<rect x="${x - 1}" y="${y}" width="2" height="${r + 3}" fill="#6b4a2c"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const SCENES = {
  city: p => `<path d="M-80 ${B0} V8 Q10 -22 120 4 T380 0 V${B0}Z" fill="${p.far}"/><rect x="262" y="-20" width="2" height="14" fill="${p.far}"/>
    ${bld(-40, 30, 44, p.mid, p.lit)}${bld(14, 9, 74, p.mid)}${bld(27, 9, 74, p.mid)}<path d="M13 -14 L18.5 -27 L24 -14Z M26 -14 L31.5 -27 L37 -14Z" fill="${p.mid}"/>${bld(22, 6, 50, p.mid)}
    ${bld(40, 20, 42, p.mid, p.lit)}${bld(62, 16, 30, p.mid, p.lit)}${bld(214, 18, 34, p.mid, p.lit)}${bld(234, 14, 52, p.mid, p.lit)}
    ${bld(252, 7, 70, p.mid)}<path d="M251 -10 L255.5 -34 L260 -10Z" fill="${p.mid}"/><circle cx="255.5" cy="-2" r="2.4" fill="#f4e7b0"/>${bld(262, 26, 40, p.mid, p.lit)}${bld(290, 40, 56, p.mid, p.lit)}`,
  alps: p => `<path d="M-80 ${B0} L-30 -4 L8 -30 L40 2 L70 -12 L110 ${B0}Z M190 ${B0} L226 -8 L262 -34 L300 -6 L330 -20 L380 ${B0}Z" fill="${p.far}"/>
    <path d="M8 -30 L-6 -16 L4 -19 L10 -13 L18 -20 L26 -12Z M262 -34 L246 -20 L256 -22 L263 -15 L271 -23 L282 -16Z M70 -12 L62 -3 L70 -6 L77 -1Z" fill="#f4f7fb" opacity="${p.lit ? .7 : 1}"/>
    ${bld(26, 13, 60, p.mid)}<path d="M23 0 L32.5 -24 L42 0Z" fill="#b5462f" opacity="${p.lit ? .7 : 1}"/><circle cx="32.5" cy="10" r="4" fill="#f4e7b0"/><path d="M32.5 10V7.4M32.5 10h2" stroke="#333" stroke-width=".8"/>
    ${bld(-30, 52, 26, p.mid, p.lit)}${bld(44, 30, 22, p.mid, p.lit)}${bld(230, 60, 24, p.mid, p.lit)}${bld(292, 50, 30, p.mid, p.lit)}`,
  lake: p => `<path d="M-80 12 Q20 -18 110 6 T380 -2 V20 H-80Z" fill="${p.far}"/><rect x="-80" y="10" width="460" height="${B0}" fill="${p.water}"/>
    <path d="M-20 22h18M30 30h14M250 24h16M286 34h14M8 40h12M222 38h10" stroke="#fff" stroke-width="1" opacity=".5"/>
    <g class="bob"><path d="M36 26 V8 L48 24Z" fill="#fff"/><path d="M34 26 V12 L26 24Z" fill="#ffd9a0"/><path d="M24 26 H50 L46 30 H28Z" fill="#7a3b2e"/></g>
    <g class="bob b2"><path d="M268 18 V4 L277 16Z" fill="#fff"/><path d="M259 18 H279 L276 21 H262Z" fill="#234"/></g>`,
  towers: p => `${bld(-40, 26, 50, p.far)}${bld(-10, 22, 70, p.mid, p.lit)}${bld(16, 16, 96, p.mid, p.lit)}<path d="M16 -36 L32 -42 V-36Z" fill="${p.mid}"/>${bld(36, 22, 58, p.far)}${bld(60, 18, 40, p.mid, p.lit)}
    ${bld(206, 20, 36, p.far)}${bld(228, 18, 78, p.mid, p.lit)}${bld(250, 24, 54, p.mid, p.lit)}${bld(300, 40, 66, p.far)}
    <path d="M284 ${B0} V-30 M270 -24 H306 M284 -30 L306 -24 M298 -24 V-12" stroke="#e0a030" stroke-width="1.6" fill="none"/><rect x="294" y="-12" width="8" height="5" fill="#e0a030"/>`,
  peak: p => `<path d="M170 ${B0} L206 6 L224 -8 L238 -30 L250 -20 L262 -38 L280 -10 L300 -2 L380 ${B0}Z" fill="${p.far}"/><path d="M262 -38 L252 -24 L260 -27 L266 -20 L272 -24Z M238 -30 L231 -19 L238 -22 L244 -17Z" fill="#f4f7fb" opacity="${p.lit ? .7 : 1}"/>
    <path d="M-80 ${B0} V10 Q-10 -12 60 8 T130 ${B0}Z" fill="${p.far}"/><rect x="-80" y="20" width="460" height="${B0}" fill="${p.water}"/>
    <path d="M22 24 h14 v-34 h-14Z" fill="${p.mid}"/><path d="M19 -10 L29 -30 L39 -10Z" fill="#8b4a2b" opacity="${p.lit ? .7 : 1}"/><path d="M-30 22 H22 V16 L-30 16Z" fill="#8b4a2b" opacity="${p.lit ? .7 : 1}"/><path d="M-30 22h52" stroke="${p.mid}" stroke-width="3" stroke-dasharray="2 6"/>`,
  forest: p => `<path d="M-80 ${B0} V6 Q40 -16 150 0 T380 4 V${B0}Z" fill="${p.g2}"/>
    ${[-34, -14, 6, 26, 48, 70, 226, 246, 268, 288, 310].map((x, i) => pine(x, 62 + (i * 37 % 22), i % 2 ? p.g1 : p.mid === '#5f93b8' ? '#2f7d4a' : p.mid)).join('')}
    ${[-24, -2, 18, 38, 60, 236, 258, 278, 300].map((x, i) => pine(x, 46 + (i * 23 % 14), p.lit ? p.far : '#3d8f55')).join('')}`,
  hills: p => `<path d="M-80 ${B0} V4 Q0 -26 90 2 T250 -6 T380 0 V${B0}Z" fill="${p.g2}"/><path d="M-80 ${B0} V22 Q30 0 120 20 T380 14 V${B0}Z" fill="${p.g1}"/>
    <rect x="27" y="-4" width="5" height="20" fill="#f1ece0" opacity="${p.lit ? .6 : 1}"/><path d="M25.5 -4 L29.5 -20 L33.5 -4Z" fill="#7a3b2e"/>
    <rect x="252" y="4" width="20" height="13" fill="#b5462f" opacity="${p.lit ? .6 : 1}"/><path d="M250 4 L262 -5 L274 4Z" fill="#6b2c1e"/>
    ${tree(10, 6, 6, p.lit ? p.mid : '#2f7d4a')}${tree(48, 12, 5, p.lit ? p.mid : '#3d8f55')}${tree(236, 8, 6, p.lit ? p.mid : '#2f7d4a')}${tree(284, 12, 5, p.lit ? p.mid : '#3d8f55')}`,
  castle: (p, wx) => `${wx.time === 'day' && wx.w === 'clear' ? ['#e5533d', '#f5b83d', '#5fd08d', '#4aa3e8', '#9a6bd6'].map((c, i) => `<path d="M${-14 + i * 3} ${B0} A${44 - i * 3} ${44 - i * 3} 0 0 1 ${74 - i * 3} ${B0}" fill="none" stroke="${c}" stroke-width="3" opacity=".8"/>`).join('') : ''}
    <path d="M-80 ${B0} V16 Q-10 0 70 18 T200 16 Q260 -18 320 6 L380 10 V${B0}Z" fill="${p.g2}"/>
    <path d="M250 6 V-14 h4 v3 h4 v-3 h4 v3 h4 v-3 h4 V6Z" fill="${p.lit ? p.mid : '#b9b3a8'}"/><path d="M270 6 V-24 h3 v3 h3 v-3 h3 V6Z" fill="${p.lit ? p.mid : '#a39c90'}"/><path d="M279 -24 V-32 l7 3 -7 3" fill="#c2387a"/><rect x="257" y="-4" width="4" height="10" rx="2" fill="${p.lit ? '#f4e7b0' : '#4a4038'}"/>
    ${tree(14, 12, 6, p.lit ? p.mid : '#3d8f55')}${tree(40, 16, 5, p.lit ? p.mid : '#2f7d4a')}${tree(232, 10, 5, p.lit ? p.mid : '#2f7d4a')}`
};
function skySVG(wx, p) {
  const stars = wx.time === 'night' && wx.w === 'clear' ? Array.from({ length: 26 }, (_, i) => `<circle class="${i % 3 ? '' : 'tw'}" cx="${(i * 73 + 11) % 300}" cy="${-38 + (i * 29) % 44}" r="${i % 4 ? .6 : 1}" fill="#fff"/>`).join('') : '';
  const orb = wx.w !== 'clear' ? '' : wx.time === 'night' ? `<circle cx="196" cy="-28" r="6" fill="#f4f0dc"/><circle cx="198.5" cy="-29.5" r="5" fill="${p.sky[0]}"/>` : wx.time === 'dusk' ? `<circle cx="104" cy="-22" r="9" fill="#ffe7a8" opacity=".9"/>` : `<circle cx="198" cy="-27" r="7" fill="#ffe27a"/><circle cx="198" cy="-27" r="11" fill="#ffe27a" opacity=".25"/>`;
  const cc = wx.time === 'night' ? '#2c3650' : wx.time === 'dusk' ? '#c79aa8' : wx.w === 'clear' ? '#fff' : '#b9c2c9';
  const cloud = (x, y, s, k) => `<g class="cl ${k}" opacity="${wx.w === 'clear' ? .9 : .95}"><g transform="translate(${x} ${y}) scale(${s})"><ellipse rx="14" ry="5" fill="${cc}"/><ellipse cx="-5" cy="-4" rx="7" ry="5" fill="${cc}"/><ellipse cx="5" cy="-5.5" rx="8" ry="6" fill="${cc}"/></g></g>`;
  const clouds = wx.w === 'clear' ? cloud(70, -22, .8, 'c1') + cloud(250, -12, .6, 'c2') : cloud(40, -26, 1.3, 'c1') + cloud(120, -30, 1.1, 'c2') + cloud(200, -24, 1.4, 'c1') + cloud(275, -30, 1.2, 'c2') + cloud(160, -14, .9, 'c2');
  return `<rect x="-300" y="-200" width="900" height="${200 + B0}" fill="url(#sky)"/>${stars}${orb}${clouds}`;
}
function stadiumSVG(id, wx, t, grass) {
  const S = STADIUM[id] || STADIUM.ZHE, p = skyPal(wx), R = S.R, st = S.st, rs = R + 3 + st / 2;
  const ell = (r, attr) => `<ellipse cx="150" cy="156" rx="${r}" ry="${(r * FY).toFixed(1)}" fill="none" ${attr}/>`;
  const pat = grass === 'checks' ? `<pattern id="mw" width="28" height="22" patternUnits="userSpaceOnUse"><rect width="28" height="22" style="fill:var(--g1)"/><rect width="14" height="11" style="fill:var(--g2)"/><rect x="14" y="11" width="14" height="11" style="fill:var(--g2)"/></pattern>`
    : grass === 'rows' ? `<pattern id="mw" width="24" height="20" patternUnits="userSpaceOnUse"><rect width="24" height="20" style="fill:var(--g1)"/><rect width="24" height="10" style="fill:var(--g2)"/></pattern>`
    : `<pattern id="mw" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(${grass === 'diag' ? 45 : 0})"><rect width="20" height="20" style="fill:var(--g1)"/><rect width="10" height="20" style="fill:var(--g2)"/></pattern>`;
  const fl = fp(45, R), fr = fp(-45, R);
  const tower = a => { const [x, y] = fp(a, R + st + 2); return `<rect x="${(x - .8).toFixed(1)}" y="${(y - 13).toFixed(1)}" width="1.6" height="13" fill="#59636b"/><rect x="${(x - 5).toFixed(1)}" y="${(y - 17).toFixed(1)}" width="10" height="5" rx="1" fill="#2b3238"/><path d="M${(x - 3.6).toFixed(1)} ${(y - 14.5).toFixed(1)}h7.2" stroke="${p.lit ? '#fff7c8' : '#cfd6da'}" stroke-width="2" stroke-dasharray="1.6 1.2"/>${p.lit ? `<circle cx="${x.toFixed(1)}" cy="${(y - 14.5).toFixed(1)}" r="11" fill="url(#glow)"/>` : ''}`; };
  const [sx, sy] = fp(S.sb, R + st + 4);
  const mon = S.monster ? (() => { const a = fp(-40, R), b = fp(-14, R); return `<path d="M${a[0].toFixed(1)} ${a[1].toFixed(1)} A${R} ${(R * FY).toFixed(1)} 0 0 1 ${b[0].toFixed(1)} ${b[1].toFixed(1)}" fill="none" stroke="#2f7a4d" stroke-width="10"/>`; })() : '';
  return `<defs>${pat}
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 -40) scale(1 100)"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset=".6" stop-color="${p.sky[1]}"/><stop offset="1" stop-color="${p.sky[2]}"/></linearGradient>
      <radialGradient id="glow"><stop offset="0" stop-color="#fff7c8" stop-opacity=".95"/><stop offset=".35" stop-color="#fff2a8" stop-opacity=".35"/><stop offset="1" stop-color="#fff2a8" stop-opacity="0"/></radialGradient>
      <pattern id="win" width="4" height="5" patternUnits="userSpaceOnUse"><rect x="1" y="1" width="1.6" height="2" fill="#ffd978" opacity=".9"/></pattern>
      <clipPath id="skin"><path d="M150 178 L400 -21 V-80 H-100 V-21 Z"/></clipPath></defs>
    ${skySVG(wx, p)}<g>${SCENES[S.scene](p, wx)}</g>
    <ellipse cx="150" cy="156" rx="${R + 5 + st}" ry="${((R + 5 + st) * FY).toFixed(1)}" fill="#3a4148"/>
    ${ell(rs, `stroke="${t.c1}" stroke-width="${st}"`)}
    ${ell(rs + st * .22, `stroke="${t.c2}" stroke-width="1" opacity=".35"`)}${ell(rs - st * .2, `stroke="#000" stroke-width="1" opacity=".18"`)}
    <g class="crowd">${ell(rs + st * .3, `stroke="#fff" stroke-width="1.8" stroke-dasharray="1.4 3.1" opacity=".75"`)}${ell(rs, `stroke="${t.c2}" stroke-width="1.8" stroke-dasharray="1.4 4.3" opacity=".85"`)}${ell(rs - st * .3, `stroke="#f1c9a5" stroke-width="1.8" stroke-dasharray="1.4 3.7" opacity=".8"`)}</g>
    <ellipse cx="150" cy="156" rx="${R + 2}" ry="${((R + 2) * FY).toFixed(1)}" fill="url(#mw)"/>
    ${ell(R - 3, `style="stroke:var(--dirt)" stroke-width="7" opacity=".85"`)}${ell(R + 1, `stroke="${S.wall}" stroke-width="4.5"`)}${ell(R + 3, `stroke="#f2c230" stroke-width="1"`)}${mon}
    <g clip-path="url(#skin)"><ellipse cx="150" cy="94" rx="93" ry="73" style="fill:var(--dirt)"/></g><ellipse cx="150" cy="158" rx="19" ry="15" style="fill:var(--dirt)"/>
    <path d="M150 148 L218 94 L150 40 L82 94 Z" style="fill:var(--infield)"/>
    <g opacity=".45">${crestAt(id, 138, 104, 24)}</g>
    <path d="M150 156 L${fl[0].toFixed(1)} ${fl[1].toFixed(1)} M150 156 L${fr[0].toFixed(1)} ${fr[1].toFixed(1)}" style="stroke:var(--lines)" stroke-width="1.4" opacity=".8"/>
    <path d="M${fl[0].toFixed(1)} ${fl[1].toFixed(1)}v-16M${fr[0].toFixed(1)} ${fr[1].toFixed(1)}v-16" stroke="#f2c230" stroke-width="2"/>
    <ellipse cx="150" cy="94" rx="10" ry="8" fill="#cc8656"/><rect x="146" y="93" width="8" height="2" fill="#f7f4ea"/>
    ${[[228, 94], [150, 32], [72, 94]].map(b => `<path d="M${b[0]} ${b[1] - 6} l7.5 6 l-7.5 6 l-7.5 -6Z" fill="#f7f4ea"/>`).join('')}
    <path d="M144 152h12v6l-6 6l-6-6z" fill="#f7f4ea"/>
    <g transform="translate(${sx.toFixed(1)} ${(sy - 1).toFixed(1)})"><rect x="-21" y="-9" width="42" height="17" rx="2" fill="#10161a" stroke="#59636b" stroke-width="1.2"/><text id="sbTxt" y="4" text-anchor="middle" fill="#ffc94a" style="font:800 10px Archivo, sans-serif;letter-spacing:.5px"></text></g>
    ${[-33, -9, 9, 33].map(a => a + (Math.abs(a - S.sb) < 12 ? (a < S.sb ? -8 : 8) : 0)).map(tower).join('')}
    ${p.tint ? `<rect x="-300" y="-200" width="900" height="600" fill="#050b24" opacity="${p.tint}" style="pointer-events:none"/>` : ''}
    ${p.lit ? `<ellipse cx="150" cy="96" rx="120" ry="80" fill="url(#glow)" opacity=".16"/>` : ''}`;
}
/* paper look: plain board, no stadium */
function paperSVG(id) {
  const fl = fp(45, 205), fr = fp(-45, 205);
  return `<defs><clipPath id="skin"><path d="M150 178 L400 -21 V-80 H-100 V-21 Z"/></clipPath></defs><rect x="-300" y="-200" width="900" height="600" style="fill:var(--g1)"/>
    <ellipse cx="150" cy="156" rx="205" ry="163" fill="none" style="stroke:var(--lines)" stroke-width="1.5" opacity=".6"/>
    <g clip-path="url(#skin)"><ellipse cx="150" cy="94" rx="93" ry="73" style="fill:var(--dirt)"/></g><ellipse cx="150" cy="158" rx="19" ry="15" style="fill:var(--dirt)"/>
    <path d="M150 148 L218 94 L150 40 L82 94 Z" style="fill:var(--infield)"/><g opacity=".45">${crestAt(id, 138, 104, 24)}</g>
    <path d="M150 156 L${fl[0]} ${fl[1]} M150 156 L${fr[0]} ${fr[1]}" style="stroke:var(--lines)" stroke-width="1.4" opacity=".7"/>
    <ellipse cx="150" cy="94" rx="10" ry="8" fill="#cc8656"/><rect x="146" y="93" width="8" height="2" fill="#f7f4ea"/>
    ${[[228, 94], [150, 32], [72, 94]].map(b => `<path d="M${b[0]} ${b[1] - 6} l7.5 6 l-7.5 6 l-7.5 -6Z" fill="#f7f4ea" stroke="#5a4a35" stroke-width=".6"/>`).join('')}<path d="M144 152h12v6l-6 6l-6-6z" fill="#f7f4ea" stroke="#5a4a35" stroke-width=".6"/><text id="sbTxt" display="none"></text>`;
}

/* ---------- team crests ---------- */
const EMBLEM = {
  ZHE: t => `<circle cx="20" cy="20.5" r="12.5" fill="${t.c2}"/><path d="M11 13q5 7.5 0 15M29 13q-5 7.5 0 15" fill="none" stroke="${t.c1}" stroke-width="1.1" stroke-dasharray="1.2 1.4"/><text x="20" y="28" text-anchor="middle" font-family="Graduate, Georgia, serif" font-size="21" fill="${t.c1}">8</text>`,
  THF: t => `<path d="M6 27 Q14 9 35 10 Q27 13 24 17 Q30 15.5 34 17 Q27 20 23 23.5 Q28 23 31 24.5 Q19 34 6 27Z" fill="${t.c2}"/><path d="M12 25 Q18 18 26 14M14 27.5 Q20 23 27 20.5" fill="none" stroke="${t.c1}" stroke-width="1.2"/>`,
  BEC: t => `<path d="M11 34 Q8 22 15 16 L13 7 L21 13 Q30 13 31 21 L37 25 L30 27.5 Q28 34 20 34.5 Z" fill="${t.c2}"/><path d="M24 20 L37 25 L30 27.5 Q26 25 24 20Z" fill="#f2a12e"/><path d="M19 17 Q26 16 28 23 Q22 24 19 17Z" fill="#1a1a1a"/><circle cx="23.5" cy="19.5" r="1.3" fill="#fff"/>`,
  ZHB: t => `<path d="M3 22 Q15 11 29 19 L37 13 L35 22 L37 31 L29 25 Q15 33 3 22Z" fill="${t.c2}"/><path d="M17 15.5 L21 9 L25 17Z" fill="${t.c2}"/><circle cx="10" cy="20.5" r="1.7" fill="${t.c1}"/><path d="M3.5 22.5 l3 1.6 l2 -1.8 l2 2 l2 -1.8 l2 2" fill="none" stroke="${t.c1}" stroke-width="1.2"/><path d="M20 19v6M24 19.500v5" stroke="${t.c1}" stroke-width="1" opacity=".6"/>`,
  ZHC: t => `<path d="M24 5 L10 24 H18.5 L15 39 L30 18.5 H21.5 Z" fill="${t.c2}"/><path d="M24 5 L10 24 H18.5 L15 39 L30 18.5 H21.5 Z" fill="none" stroke="#f5b83d" stroke-width="1.2"/>`,
  LUE: t => `<path d="M20 12 L23 17 Q30 10 38 11 Q35 16 31 18 Q35 19 36 21.5 Q31 24 27 22.5 Q25 30 20 36 Q15 30 13 22.5 Q9 24 4 21.5 Q5 19 9 18 Q5 16 2 11 Q10 10 17 17 Z" fill="${t.c2}"/><path d="M18 17 h4 l-2 5Z" fill="${t.c1}"/>`,
  SIF: t => `<ellipse cx="20" cy="26" rx="13" ry="9" fill="${t.c2}"/><circle cx="12.5" cy="16" r="5.5" fill="${t.c2}"/><circle cx="27.5" cy="16" r="5.5" fill="${t.c2}"/><circle cx="12.5" cy="16" r="2.4" fill="${t.c1}"/><circle cx="27.5" cy="16" r="2.4" fill="${t.c1}"/><path d="M11 26 Q20 33 29 26" fill="none" stroke="${t.c1}" stroke-width="1.8" stroke-linecap="round"/>`,
  HUU: t => `<path d="M13 38 Q10 27 15 20 L13 12 L19 16 Q27 14 31 22 L35 31 Q33 35 29 33 L26 29 Q22 31 24 38 Z" fill="${t.c2}"/><path d="M17.5 15 L24 1 L22.5 16 Z" fill="#f6d55c"/><path d="M13 38 Q9 28 14 21 Q10 22 8 26 Q9 20 13 17" fill="none" stroke="#f6d55c" stroke-width="1.6"/><circle cx="25" cy="22" r="1.4" fill="${t.c1}"/>`
};
const SHIELD = 'M20 2L37 8V22C37 33 29 39 20 42C11 39 3 33 3 22V8Z';
function crestInner(id) { const t = teamInfo(id); return `<path d="${SHIELD}" fill="${t.c1}" stroke="${t.c2}" stroke-width="2.6"/>${(EMBLEM[id] || (() => ''))(t)}`; }
function crestAt(id, x, y, w) { return `<svg x="${x}" y="${y}" width="${w}" height="${w * 1.1}" viewBox="0 0 40 44">${crestInner(id)}</svg>`; }

/* ---------- player sprites in team uniform ---------- */
function sprite(key, pt, t, label, o) {
  o = o || {}; const s = o.s || 1;
  return `<g data-k="${key}" transform="translate(${pt[0].toFixed(1)} ${pt[1].toFixed(1)})"><g transform="scale(${s})">
    <ellipse cy="11" rx="9.5" ry="3.2" fill="#000" opacity=".3"/>
    ${o.bat ? `<path d="M${o.left ? -9 : 9} -1 L${o.left ? -17 : 17} -17" stroke="#e2bd84" stroke-width="2.6" stroke-linecap="round"/>` : ''}
    <path d="M-9.5 10 V-1 Q-9.5 -6.5 -4 -6.5 H4 Q9.5 -6.5 9.5 -1 V10 Z" fill="${t.c1}" stroke="${t.c2}" stroke-width="1.7"/>
    ${o.glove ? `<circle cx="10.5" cy="2" r="3.6" fill="#8a5a2b" stroke="#5e3b18" stroke-width=".8"/>` : ''}
    <circle cy="-11" r="5.8" fill="#f1c9a5"/><path d="M-6.3 -11.5 A6.3 6.3 0 0 1 6.3 -11.5 Z" fill="${t.c1}"/><rect x="-1" y="-12.6" width="9.6" height="2.3" rx="1.1" fill="${t.c2}"/>
    ${label != null ? `<text y="6.8" text-anchor="middle" fill="${t.c2}" style="font:800 9.500px Archivo, sans-serif">${label}</text>` : ''}
  </g></g>`;
}
const FIELD_POS = { P: [0, 78], C: [0, -14], '1B': [36, 122], '2B': [15, 150], SS: [-15, 150], '3B': [-36, 122], LF: [-27, 186], CF: [0, 191], RF: [27, 186] };
