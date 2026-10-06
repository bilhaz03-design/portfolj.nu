/* wow.js: rörelsen på portfolj.nu (2026-10-06, valt ur galleriet koncept/v3-wow). Tre delar i en fil: basen
   (v3-wow/wow-bas.js), Tryckningen (1-tryckningen/wow.js) och Loppet (2-loppet/wow.js).
   Lagret läser tidningens data och ritade sidor men ändrar inga tal och ingen text: efter introt är sidan samma text
   som utan rörelse. Sammanslagningen: Loppet äger huvudgrafen och mätaren (mätaren följer loppets dag), så Tryckningens
   penna och nål är borttagna, och loppet startar när Tryckningen kommer fram till grafen. Ett intro skriver aldrig
   tillbaka text i ett element som tidningen hunnit rita om (språk, färgläge, en annan position). */

/* ---- basen ---- */
/* Det gemensamma för lagren. Introt spelas första gången per webbläsare och sida (sidans huvud sätter klassen wow-intro), inte när
   systemet ber om mindre rörelse; ?spela=1 spelar det ändå och ?spela=0 stänger av det. */
(function (root) {
  'use strict';
  const T = root.Tidning;
  if (!T) return;
  const W = {};
  W.T = T;
  W.rm = (() => { try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  W.intro = () => document.documentElement.classList.contains('wow-intro');
  W.introKlart = () => {
    document.documentElement.classList.remove('wow-intro');
    try { localStorage.setItem('wow.intro.' + location.pathname.replace(/\/index\.html$/, '/'), '1'); } catch (e) { /* privat läge */ }
  };
  W.ease = {
    ut: t => 1 - Math.pow(1 - t, 3),
    ut5: t => 1 - Math.pow(1 - t, 5),
    inut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  };
  /* en dämpad fjäder från 0 mot 1: läget efter s sekunder (z = dämpning, f = egenfrekvens i Hz) */
  W.fjader = (s, z, f) => {
    z = z === undefined ? 0.38 : z; f = f === undefined ? 1.5 : f;
    const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * s) * (Math.cos(wd * s) + (z * w / wd) * Math.sin(wd * s));
  };
  /* kör fn(t 0..1, sekunder) varje bildruta i ms millisekunder, sedan klar() */
  W.anim = (ms, fn, klar) => {
    const t0 = performance.now();
    const steg = nu => {
      // rAF-tiden kan ligga före starttiden; därför klämd till 0..1
      const t = Math.max(0, Math.min(1, (nu - t0) / ms));
      fn(t, Math.max(0, nu - t0) / 1000);
      if (t < 1) requestAnimationFrame(steg); else if (klar) klar();
    };
    requestAnimationFrame(steg);
  };
  W.senare = (ms, fn) => setTimeout(fn, ms);
  /* kör fn(host) när tidningen har ritat i host, och igen varje gång tidningen ritar om (färgläge, språk, storlek) */
  W.efter = (id, fn) => {
    const host = typeof id === 'string' ? document.getElementById(id) : id;
    if (!host) return;
    let egen = false;
    const kor = () => { egen = true; try { fn(host); } finally { setTimeout(() => { egen = false; }, 0); } };
    new MutationObserver(() => { if (!egen) kor(); }).observe(host, { childList: true });
    if (host.firstChild) kor();
  };
  /* kör fn(host) en gång, när tidningen har ritat i host (graferna ritas först när typsnitten har laddats) */
  W.nar = (id, fn) => {
    const host = typeof id === 'string' ? document.getElementById(id) : id;
    if (!host) return;
    if (host.firstChild) { fn(host); return; }
    const mo = new MutationObserver(() => { if (host.firstChild) { mo.disconnect(); fn(host); } });
    mo.observe(host, { childList: true });
  };
  /* kör fn en gång när el syns till minst andelen (förval 35 %): i mobilen ligger graferna nedanför första skärmen,
     och ett intro som spelas där ingen ser det är bortkastat (mätt 2026-10-05: 0,0 % skillnad på mobilens första skärm) */
  W.synlig = (el, fn, andel) => {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const r = el.getBoundingClientRect(), kravet = Math.min(andel || 0.35, (window.innerHeight * 0.9) / Math.max(1, r.height));
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && e.intersectionRatio >= kravet - 0.01) { io.disconnect(); fn(); } }), { threshold: [0, kravet, 1] });
    io.observe(el);
  };
  /* tid kvar till ett planerat ögonblick i introt, räknat från när lagret startade */
  const T0 = performance.now();
  W.om = ms => Math.max(0, ms - (performance.now() - T0));
  W.skin = () => T.chart.skin(document.body);
  W.ns = 'http://www.w3.org/2000/svg';
  W.sv = (tag, attrs, parent) => {
    const e = document.createElementNS(W.ns, tag);
    if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  W.el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; };
  /* serien bakom kurvan: avkastning på insatsen dag för dag, portföljen och samma insats i MSCI World.
     Sista punkten bär huvudets tal, precis som tidningens egen kurva. */
  W.serie = () => {
    const P = T.P, nav = P.nav, N = nav.dates.length;
    const ret = nav.value.map((v, i) => v / nav.cost[i] - 1), msci = nav.msci.map((v, i) => v / nav.cost[i] - 1);
    ret[N - 1] = P.value_sek / nav.cost[N - 1] - 1; msci[N - 1] = P.msci_shadow_sek / nav.cost[N - 1] - 1;
    const ex = ret.map((v, i) => (v - msci[i]) * 100);
    const kop = T.POS.map(p => ({ p, i: nav.dates.indexOf(p.entry_date) })).filter(b => b.i >= 0).sort((a, b) => a.i - b.i);
    return { d: nav.dates, N, ret, msci, ex, kop };
  };
  root.Wow = W;
})(window);

/* ---- 1. Tryckningen ---- */
/* Ett enda förlopp när sidan öppnas: linjerna dras, namnet färgas in, räkneverken rullar fram, rubriken sätts ord för
   ord och staplarna växer. Allt utgår från sidan som tidningen redan ritat; inga tal räknas om, de rullas bara fram.
   Kurvan och mätaren spelas av Loppet nedan. */
(function () {
  'use strict';
  const W = window.Wow;
  if (!W || !W.intro()) return;
  const T = W.T, $ = id => document.getElementById(id), sida = document.body.querySelector('.front') ? 'forsta' : document.getElementById('a-h1') ? 'pos' : 'annan';
  const ANIM = { 'wow-fram': 'wow-fram .42s ease-out both', 'wow-trycks': 'wow-trycks .62s cubic-bezier(.2, .8, .2, 1) both', 'wow-dras': 'wow-dras .46s cubic-bezier(.2, .7, .2, 1) both' };
  const valda = [];  // väljarna som får en animation, för städningen efter introt
  const klass = (sel, k, ms) => { valda.push(sel); setTimeout(() => document.querySelectorAll(sel).forEach(e => { e.style.animation = ANIM[k]; }), ms); };
  /* efter introt byts animationerna mot none. En fylld animation på opacity ger elementet ett eget lager, och då låg
     öronen ovanpå inställningspanelen (mätt 2026-10-06: klicket på EN fångades av #ear-right). Slutläget är sidans vanliga,
     och none hindrar tidningens egna toningar från att spelas en gång till när klassen tas bort. */
  const klar = () => { valda.forEach(sel => document.querySelectorAll(sel).forEach(e => { e.style.animation = 'none'; })); W.introKlart(); };

  /* räkneverket: varje siffra blir ett hjul som snurrar två varv och stannar på sin siffra */
  function rakneverk(val, ms) {
    const text = val.textContent, cs = getComputedStyle(val);
    const h = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.15;
    const matt = ch => { const s = W.el('span', null, ch); s.style.visibility = 'hidden'; s.style.position = 'absolute'; val.append(s); const w = s.getBoundingClientRect().width; s.remove(); return w; };
    const bredd = {}; [...text].forEach(ch => { if (/[0-9]/.test(ch) && !(ch in bredd)) bredd[ch] = matt(ch); });
    val.setAttribute('aria-label', text);
    const hjul = [], frag = document.createDocumentFragment();
    [...text].forEach(ch => {
      if (!/[0-9]/.test(ch)) { frag.append(document.createTextNode(ch)); return; }
      const box = W.el('span', 'wow-odo'); box.setAttribute('aria-hidden', 'true'); box.style.height = h + 'px'; box.style.width = bredd[ch] + 'px';
      const band = W.el('span');
      for (let r = 0; r < 3; r++) for (let d = 0; d < 10; d++) { const i = W.el('i', null, String(d)); i.style.height = h + 'px'; i.style.lineHeight = h + 'px'; band.append(i); }
      box.append(band); frag.append(box); hjul.push({ band, d: +ch });
    });
    val.textContent = ''; val.append(frag);
    hjul.forEach((x, k) => {
      const mal = (20 + x.d) * h;
      setTimeout(() => W.anim(760 + k * 55, t => { x.band.style.transform = `translateY(${-mal * W.ease.ut5(t)}px)`; }), ms + k * 45);
    });
    // tillbaka till tidningens text, men bara om tidningen inte har hunnit rita om elementet (då står rätt text redan där)
    setTimeout(() => { if (!val.querySelector('.wow-odo')) return; val.textContent = text; val.removeAttribute('aria-label'); }, ms + hjul.length * 45 + 760 + hjul.length * 55 + 60);
  }

  /* rubriken: orden färgas in ett i taget, utan att raderna bryts om */
  function satt(h, ms) {
    if (!h) return;
    const text = h.textContent; h.style.animation = 'none';
    h.textContent = '';
    const ord = [];
    text.split(/(\s+)/).forEach(del => { if (!del) return; if (/^\s+$/.test(del)) h.append(document.createTextNode(del)); else { const s = W.el('span', 'wow-ord', del); h.append(s); ord.push(s); } });
    ord.forEach((s, i) => setTimeout(() => s.classList.add('pa'), ms + i * 34));
    // som i räkneverket: en rubrik som tidningen ritat om under introt (språkbyte, ny position) får stå kvar
    setTimeout(() => { if (h.querySelector('.wow-ord')) h.textContent = text; }, ms + ord.length * 34 + 450);
  }

  /* staplarna växer ut från nollan i bidragets ordning, och talen räknas upp */
  function staplar(host, ms) {
    const val = p => p.excess_sek / T.P.cost_sek;
    const pos = T.POS.slice().sort((a, b) => val(b) - val(a));
    [...host.querySelectorAll('.barrow')].forEach((rad, i) => {
      const rect = rad.querySelector('rect'), noll = rad.querySelector('line'), v = rad.querySelector('.v'); if (!rect || !noll) return;
      const w = +rect.getAttribute('width'), x = +rect.getAttribute('x'), z = +noll.getAttribute('x1'), neg = x < z - 0.01, slut = v ? v.textContent : '';
      rect.setAttribute('width', 0); if (neg) rect.setAttribute('x', z);
      if (v) v.textContent = T.fmt.ppS(0);
      W.synlig(host, () => setTimeout(() => W.anim(620, t => {
        const e = W.ease.ut(t); rect.setAttribute('width', (w * e).toFixed(2)); if (neg) rect.setAttribute('x', (z - w * e).toFixed(2));
        if (v && pos[i]) v.textContent = T.fmt.ppS(val(pos[i]) * e);
      }, () => { if (v) v.textContent = slut; }), W.om(ms) + i * 70));
    });
  }

  klass('.rules', 'wow-dras', 0);
  klass('.nameplate', 'wow-trycks', 70);
  klass('.ear, .topbar .tag, .topbar .ctrls', 'wow-fram', 230);
  if (sida === 'forsta') {
    document.querySelectorAll('#strip .cell .val').forEach((v, i) => rakneverk(v, 300 + i * 80));
    satt($('headline'), 430);
    klass('.notis', 'wow-fram', 260);
    klass('.lede, .byline', 'wow-fram', 760);
    klass('.lead .ghead, .lead .gsub, details.numbers, .rail .ghead, .rail .gsub, .keys, .gauge-note', 'wow-fram', 820);
    // staplarna ritas när typsnitten har laddats; de växer på sin planerade tid, eller direkt om den redan passerat
    W.nar('bars', h => staplar(h, 1050));
    setTimeout(klar, 2500);
  } else if (sida === 'pos') {
    document.querySelectorAll('#figs .val').forEach((v, i) => rakneverk(v, 320 + i * 70));
    satt($('a-h1'), 420);
    klass('.dek, .ahead .kick, .lede, .byline', 'wow-fram', 700);
    setTimeout(klar, 2000);
  } else {
    setTimeout(klar, 900);
  }
})();

/* ---- 2. Loppet ---- */
/* Huvudgrafen blir ett lopp: portföljen och samma insats i MSCI World växer fram dag för dag från första köpet till i dag.
   Datumet löper med, köpen dyker upp när loppet passerar dem och avståndet mellan linjerna fylls i. Efteråt går det att
   dra i grafen till vilken dag som helst; mätaren i högerspalten följer med. Talen är tidningens egna (avkastning på
   insatsen samma dagar), inga nya beräkningar. */
(function () {
  'use strict';
  const W = window.Wow;
  if (!W) return;
  const T = W.T, L = T.L, F = T.fmt;
  const KORT = { NVDA: 'Nvidia', FLKR: 'Korea', EME: 'Emcor', ENR: 'Siemens', PLTR: 'Palantir' };
  const MANAD = { sv: ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
  const datum = d => { const [y, m, dd] = d.split('-').map(Number); return T.en() ? `${MANAD.en[m - 1]} ${dd}, ${y}` : `${dd} ${MANAD.sv[m - 1]} ${y}`; };
  const pct = v => F.pctS(v), pp = v => F.ppS(v);
  // spelat: introts lopp är bestämt; vantar: introt väntar på att grafen syns (överlever en omritning av grafen)
  let spelat = false, vantar = false;

  /* mätaren i högerspalten visar dag i: nålen = portföljen, märket = MSCI World, talet = försprånget */
  function matare(s, i) {
    const svg = document.querySelector('#gauge svg'); if (!svg) return;
    const sk = W.skin(), cx = 132, cy = 106, r = 92;
    const ang = v => (210 - (Math.max(-0.10, Math.min(0.30, v)) + 0.10) / 0.40 * 240) * Math.PI / 180;
    const pt = (v, rr) => [cx + rr * Math.cos(ang(v)), cy - rr * Math.sin(ang(v))];
    const arc = (v1, v2, rr) => { const [x1, y1] = pt(v1, rr), [x2, y2] = pt(v2, rr), large = Math.abs(v2 - v1) / 0.40 * 240 > 180 ? 1 : 0; return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${rr} ${rr} 0 ${large} ${v2 > v1 ? 1 : 0} ${x2.toFixed(1)} ${y2.toFixed(1)}`; };
    const ret = s.ret[i], ms = s.msci[i], lead = ret - ms;
    const nalen = [...svg.querySelectorAll('line')].find(l => l.getAttribute('x1') === '132' && l.getAttribute('y1') === '106');
    if (nalen) { const [nx, ny] = pt(ret, r - 22); nalen.setAttribute('x2', nx.toFixed(1)); nalen.setAttribute('y2', ny.toFixed(1)); }
    const bage = [...svg.querySelectorAll('path')].filter(p => p.getAttribute('stroke-width') === '6')[1];
    if (bage) { bage.setAttribute('d', arc(Math.min(ms, ret), Math.max(ms, ret), r - 12)); bage.setAttribute('stroke', lead >= 0 ? sk.up : sk.down); }
    const bug = svg.querySelector('g[transform]');
    if (bug) { const a = ang(ms); bug.setAttribute('transform', `translate(${(cx + (r + 1) * Math.cos(a)).toFixed(1)} ${(cy - (r + 1) * Math.sin(a)).toFixed(1)}) rotate(${(-a * 180 / Math.PI + 90).toFixed(1)})`); }
    const texter = [...svg.querySelectorAll('text')], stor = texter.find(t => t.getAttribute('font-size') === '29'), liten = texter.find(t => t.getAttribute('font-size') === '11.5');
    if (stor) stor.textContent = pp(lead);
    if (liten) liten.textContent = lead >= 0 ? L('före MSCI World, samma insats', 'ahead of MSCI World, same money') : L('efter MSCI World, samma insats', 'behind MSCI World, same money');
    const keys = document.querySelectorAll('#gauge-keys b');
    if (keys[0]) keys[0].textContent = pct(ret);
    if (keys[1]) keys[1].textContent = pct(ms);
  }

  function lopp(host) {
    const sk = W.skin(), s = W.serie(), N = s.N;
    const Wd = Math.max(300, host.clientWidth), smal = Wd < 560, H = smal ? 250 : 286;
    const padT = smal ? 48 : 30, padB = 40, padR = smal ? 40 : 104, plotW = Wd - padR;
    const v = s.ret.concat(s.msci).map(x => x * 100);
    let lo = Math.min(0, ...v), hi = Math.max(0, ...v); const sp = hi - lo; lo -= sp * 0.08; hi += sp * 0.1;
    const X = i => i / (N - 1) * plotW, Y = x => padT + (hi - x) / (hi - lo) * (H - padT - padB);
    host.textContent = '';
    const lastLead = (s.ret[N - 1] - s.msci[N - 1]);
    const svg = W.sv('svg', { viewBox: `0 0 ${Wd} ${H}`, height: H, role: 'img', class: 'wow-lopp',
      'aria-label': L('Portföljen och samma insats i MSCI World, avkastning på insatsen dag för dag från första köpet; i dag ', 'The portfolio and the same money in MSCI World, return on the money in, day by day since the first purchase; today ')
        + pct(s.ret[N - 1]) + L(' mot ', ' against ') + pct(s.msci[N - 1]) + ', ' + pp(lastLead) }, host);
    const txt = (x, y, str, a) => { const t = W.sv('text', Object.assign({ x: x.toFixed(1), y: y.toFixed(1), 'font-family': sk.sans, 'font-size': 11, fill: sk.ink3 }, a || {}), svg); t.textContent = str; return t; };
    const halo = (t, w) => { t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke', sk.paper); t.setAttribute('stroke-width', w || 4); t.setAttribute('stroke-linejoin', 'round'); return t; };
    // rutnätet: procent på insatsen, nollan tydligare
    const steg = (() => { const raw = (hi - lo) / 4, p10 = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p10; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p10; })();
    for (let g = Math.ceil(lo / steg) * steg; g <= hi + 1e-9; g += steg) {
      const yy = Y(g), noll = Math.abs(g) < steg / 1e6;
      W.sv('line', { x1: 0, x2: plotW + 6, y1: yy.toFixed(1), y2: yy.toFixed(1), stroke: noll ? sk.rule : sk.grid, 'stroke-width': 1 }, svg);
      txt(Wd, yy + 4, noll ? '0 %' : (g > 0 ? '+' : '−') + Math.abs(Math.round(g)) + ' %', { 'text-anchor': 'end' });
    }
    const arY = smal ? padT + 11 : padT - 14;  // i smala fönster står årtalen inne i ritytan, under talraden
    txt(2, arY, s.d[0].slice(0, 4));
    s.d.forEach((d, i) => { if (i > 0 && d.slice(0, 4) !== s.d[i - 1].slice(0, 4)) { W.sv('line', { x1: X(i).toFixed(1), x2: X(i).toFixed(1), y1: padT - 6, y2: H - padB, stroke: sk.grid, 'stroke-width': 1 }, svg); txt(X(i) + 4, arY, d.slice(0, 4)); } });
    // avståndet mellan linjerna: blått när portföljen leder, rött när den ligger efter (tidningens färger för försprånget)
    const band = W.sv('g', {}, svg);
    let seg = null;
    const stang = () => { if (!seg) return; const pts = seg.ovre.concat(seg.undre.reverse()); W.sv('path', { d: 'M' + pts.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z', fill: seg.fore ? sk.wash : sk.washNeg }, band); seg = null; };
    for (let i = 0; i < N; i++) {
      const a = s.ret[i] * 100, b = s.msci[i] * 100, fore = a >= b, x = X(i);
      if (!seg) seg = { fore, ovre: [], undre: [] };
      if (seg.fore !== fore && i > 0) {
        // skärningen mellan dag i-1 och i, linjärt
        const a0 = s.ret[i - 1] * 100, b0 = s.msci[i - 1] * 100, t = (a0 - b0) / ((a0 - b0) - (a - b)), xc = X(i - 1) + t * (x - X(i - 1)), yc = Y(a0 + t * (a - a0));
        seg.ovre.push([xc, yc]); seg.undre.push([xc, yc]); stang(); seg = { fore, ovre: [[xc, yc]], undre: [[xc, yc]] };
      }
      seg.ovre.push([x, Y(a)]); seg.undre.push([x, Y(b)]);
    }
    stang();
    const linje = (arr, farg, w) => W.sv('path', { d: 'M' + arr.map((x, i) => X(i).toFixed(1) + ' ' + Y(x * 100).toFixed(1)).join('L'), fill: 'none', stroke: farg, 'stroke-width': w, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    const lM = linje(s.msci, sk.ink3, 1.7), lP = linje(s.ret, sk.accent, 2.4);
    // avslöjandet under loppet: allt i ritytan klipps vid loppets front
    const id = 'lopp' + Math.random().toString(36).slice(2, 7), defs = W.sv('defs', {}, svg);
    const klipp = W.sv('rect', { x: -4, y: 0, width: plotW + 8, height: H }, W.sv('clipPath', { id }, defs));
    [band, lM, lP].forEach(e => e.setAttribute('clip-path', `url(#${id})`));
    // tidsaxeln med köpen
    W.sv('line', { x1: 0, x2: plotW, y1: H - padB, y2: H - padB, stroke: sk.rule, 'stroke-width': 1 }, svg);
    const kop = s.kop.map(b => {
      const g = W.sv('g', {}, svg), x = X(b.i);
      W.sv('line', { x1: x.toFixed(1), x2: x.toFixed(1), y1: H - padB - 5, y2: H - padB + 4, stroke: sk.ink2, 'stroke-width': 1.25 }, g);
      return { b, g, x, namn: KORT[b.p.id] || T.nm(b.p) };
    });
    // namnen under strecken, i rader så att de inte krockar
    const radSlut = [-1e9, -1e9, -1e9];
    kop.forEach(k => { const w = k.namn.length * 6.1; let rr = radSlut.findIndex(e => e < k.x - 6); if (rr < 0) rr = 2; radSlut[rr] = k.x + w; const t = txt(k.x, H - padB + 15 + rr * 12, k.namn, { fill: sk.ink2, 'text-anchor': k.x + w > Wd ? 'end' : 'start' }); k.g.append(t); });
    // markören: datum överst, prickar på linjerna och talen bredvid linjernas huvuden (klasserna avl-* läses av kontrollerna)
    const mark = W.sv('g', { 'pointer-events': 'none' }, svg);
    const mLinje = W.sv('line', { y1: padT - 4, y2: H - padB, stroke: sk.ink2, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, mark);
    const mDatum = halo(txt(0, padT - 14, '', { fill: sk.ink, 'font-weight': 600, 'text-anchor': 'middle', class: 'avl-datum' }));
    mark.append(mDatum);
    const dP = W.sv('circle', { r: 4.2, fill: sk.accent, stroke: sk.paper, 'stroke-width': 2 }, mark), dM = W.sv('circle', { r: 3.6, fill: sk.ink3, stroke: sk.paper, 'stroke-width': 2 }, mark);
    const etP = W.sv('g', {}, mark), etM = W.sv('g', {}, mark), etGap = W.sv('g', {}, mark);
    const tP1 = halo(txt(0, 0, L('Portföljen', 'Portfolio'), { fill: sk.ink2, 'font-size': 11 })), tP2 = halo(txt(0, 0, '', { fill: sk.ink, 'font-family': sk.serif, 'font-size': 15, 'font-weight': 600, class: 'avl-port' }));
    const tM1 = halo(txt(0, 0, 'MSCI World', { fill: sk.ink3, 'font-size': 11 })), tM2 = halo(txt(0, 0, '', { fill: sk.ink2, 'font-family': sk.serif, 'font-size': 15, 'font-weight': 600, class: 'avl-msci' }));
    const tG = halo(txt(0, 0, '', { fill: sk.ink, 'font-family': sk.serif, 'font-size': 13, 'font-weight': 600 }), 5);
    etP.append(tP1, tP2); etM.append(tM1, tM2); etGap.append(tG);
    const flagga = halo(txt(0, 0, '', { fill: sk.ink, 'font-size': 11.5, 'font-weight': 600 }), 5); mark.append(flagga);
    const rad2 = smal ? txt(0, padT - 30, '', { 'font-size': 11.5, class: 'avl-rad2' }) : null;
    if (rad2) mark.append(rad2);
    let flaggTid = 0;
    function visa(f, lage) {
      // f = index som flyttal (loppets front); lage 'lopp' klipper linjerna, 'las' visar hela linjerna
      const i = Math.max(0, Math.min(N - 1, Math.round(f)));
      const a = s.ret[i] * 100, b = s.msci[i] * 100, x = X(i), ya = Y(a), yb = Y(b);
      klipp.setAttribute('width', lage === 'lopp' ? (x + 0.5).toFixed(1) : (plotW + 8));
      mLinje.setAttribute('x1', x.toFixed(1)); mLinje.setAttribute('x2', x.toFixed(1));
      const gapNu = (a - b) / 100;
      mDatum.textContent = '';
      const ts1 = W.sv('tspan', { 'font-weight': 600, fill: sk.ink }, mDatum); ts1.textContent = datum(s.d[i]);
      const ts2 = W.sv('tspan', { 'font-weight': 400, dx: 10, fill: gapNu >= 0 ? sk.ink2 : sk.neg }, mDatum);
      ts2.textContent = F.num(Math.abs(gapNu) * 100, 1) + ' pp ' + (gapNu >= 0 ? L('före', 'ahead') : L('efter', 'behind'));
      const half = (mDatum.getComputedTextLength() || 60) / 2;
      if (smal) { mDatum.setAttribute('text-anchor', 'start'); mDatum.setAttribute('x', 0); mDatum.setAttribute('y', (padT - 14).toFixed(1)); }
      else mDatum.setAttribute('x', Math.max(half + 2, Math.min(Wd - half - 2, x)).toFixed(1));
      dP.setAttribute('cx', x.toFixed(1)); dP.setAttribute('cy', ya.toFixed(1)); dM.setAttribute('cx', x.toFixed(1)); dM.setAttribute('cy', yb.toFixed(1));
      // etiketterna vid linjernas huvuden; de skjuts isär om de hamnar för nära
      let yA = ya - 3, yB = yb + 3; const fore = a >= b;
      const ovre = fore ? 'P' : 'M';
      let yo = Math.min(ya, yb), yu = Math.max(ya, yb); if (yu - yo < 30) { const m = (yo + yu) / 2; yo = m - 15; yu = m + 15; }
      yA = ovre === 'P' ? yo : yu; yB = ovre === 'P' ? yu : yo;
      const tx = Math.min(x + 9, Wd - 6), hoger = x + 9 + 70 > Wd;
      const lagg = (g, t1, t2, y, upp) => { const anchor = hoger ? 'end' : 'start', xx = hoger ? x - 9 : tx; [t1, t2].forEach(t => { t.setAttribute('x', xx.toFixed(1)); t.setAttribute('text-anchor', anchor); }); t1.setAttribute('y', (upp ? y - 13 : y + 12).toFixed(1)); t2.setAttribute('y', (upp ? y + 2 : y + 27).toFixed(1)); };
      tP2.textContent = pct(a / 100); tM2.textContent = pct(b / 100);
      lagg(etP, tP1, tP2, yA, ovre === 'P'); lagg(etM, tM1, tM2, yB, ovre !== 'P');
      const tidigt = x < 56; etP.setAttribute('opacity', tidigt || smal ? 0 : 1); etM.setAttribute('opacity', tidigt || smal ? 0 : 1);
      if (rad2) {
        rad2.textContent = '';
        const a1 = W.sv('tspan', { fill: sk.accent, 'font-weight': 600 }, rad2); a1.textContent = L('Portföljen ', 'Portfolio ') + pct(a / 100);
        const a2 = W.sv('tspan', { fill: sk.ink3, 'font-weight': 600, dx: 12 }, rad2); a2.textContent = 'MSCI World ' + pct(b / 100);
      }
      etGap.setAttribute('opacity', 0);
      // köpen dyker upp när loppet passerar dem
      kop.forEach(k => { const syns = lage !== 'lopp' || k.x <= x + 0.5; k.g.setAttribute('opacity', syns ? 1 : 0); if (lage === 'lopp' && syns && !k.visad) { k.visad = true; flagga.textContent = L('Köp: ', 'Bought: ') + T.nm(k.b.p); flaggTid = performance.now(); flagga.setAttribute('x', (Math.max(4, k.x - 4)).toFixed(1)); flagga.setAttribute('text-anchor', k.x > Wd * 0.6 ? 'end' : 'start'); flagga.setAttribute('y', (Math.min(Y(s.ret[k.b.i] * 100), Y(s.msci[k.b.i] * 100)) - 12).toFixed(1)); } });
      flagga.setAttribute('opacity', lage === 'lopp' ? Math.max(0, 1 - (performance.now() - flaggTid) / 1100).toFixed(2) : 0);
      // i läsläget står ingen flagga kvar, så att sidan efter loppet är samma text som utan lopp
      if (lage !== 'lopp') flagga.textContent = '';
      // en ritning som tidningen redan har ersatt (omritning mitt i loppet) styr inte längre mätaren
      if (svg.isConnected) matare(s, i);
    }
    // läsning med pekare och tangenter efter loppet
    const yta = W.sv('rect', { x: 0, y: padT - 6, width: plotW + 10, height: H - padT - padB + 6, fill: 'transparent', tabindex: 0, class: 'hit', 'aria-label': L('Läs av dag för dag med pekaren eller piltangenterna', 'Read day by day with the pointer or arrow keys') }, svg);
    // skärmläsaren får avläsningen i ett statusfält utanför bilden, som tidningens egen graf gjorde med sin tooltip
    // (granskning 2026-10-06: avläsningen inne i en role=img lästes inte upp); bara när läsaren själv läser av
    const status = W.el('div', 'wow-status'); status.setAttribute('role', 'status'); host.append(status);
    const las = j => { visa(j, 'las'); const a = s.ret[j], b = s.msci[j], g = a - b; status.textContent = datum(s.d[j]) + ': ' + L('portföljen ', 'portfolio ') + pct(a) + ', MSCI World ' + pct(b) + ', ' + F.num(Math.abs(g) * 100, 1) + ' pp ' + (g >= 0 ? L('före', 'ahead') : L('efter', 'behind')); };
    let i = N - 1, igang = false;
    const tillIdag = () => { if (igang) return; visa(N - 1, 'las'); i = N - 1; status.textContent = ''; };
    yta.addEventListener('pointermove', e => { if (igang) return; const r = svg.getBoundingClientRect(); i = Math.max(0, Math.min(N - 1, Math.round((e.clientX - r.left) * Wd / r.width / plotW * (N - 1)))); las(i); });
    yta.addEventListener('pointerleave', tillIdag); yta.addEventListener('blur', tillIdag);
    yta.addEventListener('keydown', e => {
      if (igang) return; const st = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft') i = Math.max(0, i - st); else if (e.key === 'ArrowRight') i = Math.min(N - 1, i + st); else if (e.key === 'Home') i = 0; else if (e.key === 'End') i = N - 1; else return;
      e.preventDefault(); las(i);
    });
    function spela() {
      if (igang) return;  // ett lopp i taget: ett nytt klick mitt i loppet gör ingenting
      igang = true; kop.forEach(k => { k.visad = false; }); status.textContent = '';
      const ms = smal ? 2400 : 2800;
      W.anim(ms, t => visa(W.ease.inut(t) * (N - 1), 'lopp'), () => { igang = false; visa(N - 1, 'las'); });
    }
    return { visa, spela, N };
  }

  // rubriken över grafen beskriver loppet; knappen spelar det igen
  function rubrik() {
    const h = document.getElementById('g-ex-h'), u = document.getElementById('g-ex-sub');
    if (h) h.textContent = L('Portföljen mot världsindex, dag för dag', 'The portfolio against the world index, day by day');
    if (u) u.textContent = L('Avkastning på insatsen: portföljen och samma insats i MSCI World samma dagar. Ytan mellan linjerna är försprånget. Dra i grafen för att se en viss dag.',
      'Return on the money in: the portfolio and the same money in MSCI World on the same days. The area between the lines is the lead. Drag across the chart to see a given day.');
  }
  let senaste = null;
  W.efter('excess', host => {
    rubrik();
    senaste = lopp(host);
    const head = document.querySelector('.lead .ghead');
    if (head && !head.querySelector('.wow-spela')) {
      const b = W.el('button', 'wow-spela', L('Spela loppet igen', 'Replay the race')); b.type = 'button';
      b.addEventListener('click', () => senaste && senaste.spela()); head.append(b);
    }
    const b = head && head.querySelector('.wow-spela'); if (b) b.textContent = L('Spela loppet igen', 'Replay the race');
    if (!spelat && W.intro()) {
      // introt: loppet står på första köpet tills grafen syns och startar när Tryckningen kommer fram till grafen
      spelat = true; vantar = true; senaste.visa(0, 'lopp');
      W.synlig(host, () => setTimeout(() => { vantar = false; senaste.spela(); setTimeout(W.introKlart, 3200); }, W.om(780)));
    } else if (vantar) senaste.visa(0, 'lopp');  // omritad innan grafen syntes: loppet väntar kvar och spelas i den nya ritningen
    else senaste.visa(senaste.N - 1, 'las');
  });
})();
