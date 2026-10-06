/* inlagg.js: fristående inlägg på portfolj.nu, Utanför portföljen (2026-10-06; formen ur koncept/v3-wow/6-inlagg).
   På inlagg.html ritas inläggen, nyast först, med tidningens sidhuvud och sidfot. På förstasidan står en puff under
   I korthet som länkar till det senaste, så att huvudrubriken fortsätter att handla om försöket att slå världsindex.
   Texten är skribentens egen och står ordagrant (window.PORTFOLJ_INLAGG i inlagg-data.js). Inlägget är på svenska också
   när sidan är på engelska. Grafen är små grafer med gemensam tidsaxel, aldrig två y-axlar, med avläsning dag för dag
   och talen i en tabell. */
(function () {
  'use strict';
  const T = window.Tidning, INL = window.PORTFOLJ_INLAGG;
  if (!T || !Array.isArray(INL) || !INL.length) return;
  const L = T.L, el = T.dom.el, NS = 'http://www.w3.org/2000/svg';
  const sv = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) if (a[k] !== undefined && a[k] !== null) e.setAttribute(k, a[k]); if (p) p.append(e); return e; };
  const MAN = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const dag = (s, ar) => { const [y, m, d] = s.split('-').map(Number); return d + ' ' + MAN[m - 1] + (ar === false ? '' : ' ' + y); };
  const nfc = {}, nf = (x, d) => (nfc[d] || (nfc[d] = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: d, maximumFractionDigits: d }))).format(x).replace('-', '−');
  const varde = (s, v) => nf(v, s.decimaler) + (s.procent ? ' %' : '');
  const forstaMeningen = t => (t.match(/^.*?[.!?](?=\s|$)/) || [t])[0];

  /* tre små grafer, en per serie, med samma tidsaxel; avläsningen överst och i statusfältet för skärmläsare */
  function graf(host, g) {
    if (!host) return;
    host.textContent = '';
    const sk = T.chart.skin(document.body), N = g.datum.length, S = g.serier;
    const Wd = Math.max(300, host.clientWidth), smal = Wd < 560;
    const ph = smal ? 78 : 96, mellan = 30, padT = 22, padB = 20, padR = smal ? 52 : 62, pw = Wd - padR;
    const H = padT + S.length * ph + (S.length - 1) * mellan + padB, X = i => i / (N - 1) * pw;
    const avl = el('p', 'inl-avl'); avl.setAttribute('role', 'status'); host.append(avl);
    const svg = sv('svg', { viewBox: `0 0 ${Wd} ${H}`, height: H, role: 'img', class: 'inl-svg',
      'aria-label': S.map(s => s.kort.sv + ' från ' + varde(s, s.varden[0]) + ' till ' + varde(s, s.varden[N - 1])).join(', ') + ', ' + dag(g.datum[0]) + ' till ' + dag(g.datum[N - 1]) }, host);
    const txt = (x, y, str, a) => { const t = sv('text', Object.assign({ x: x.toFixed(1), y: y.toFixed(1), 'font-family': sk.sans, 'font-size': 11, fill: sk.ink3 }, a || {}), svg); t.textContent = str; return t; };
    // månaderna: lodräta linjer genom alla grafer och månadens namn under den sista
    txt(1, H - 5, MAN[+g.datum[0].slice(5, 7) - 1]);
    g.datum.forEach((d, i) => { if (i > 0 && d.slice(5, 7) !== g.datum[i - 1].slice(5, 7)) { sv('line', { x1: X(i).toFixed(1), x2: X(i).toFixed(1), y1: padT - 4, y2: H - padB, stroke: sk.grid, 'stroke-width': 1 }, svg); txt(X(i) + 3, H - 5, MAN[+d.slice(5, 7) - 1]); } });
    const paneler = S.map((s, n) => {
      const y0 = padT + n * (ph + mellan), v = s.varden, lo0 = Math.min(...v), hi0 = Math.max(...v), sp = (hi0 - lo0) || 1, lo = lo0 - sp * 0.1, hi = hi0 + sp * 0.1;
      const Y = x => y0 + (hi - x) / (hi - lo) * ph;
      const steg = (() => { const raw = (hi - lo) / 3, p10 = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p10; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p10; })();
      const dec = steg >= 1 ? 0 : steg >= 0.1 ? 1 : 2;
      for (let t = Math.ceil(lo / steg) * steg; t <= hi + 1e-9; t += steg) { const yy = Y(t); sv('line', { x1: 0, x2: pw + 4, y1: yy.toFixed(1), y2: yy.toFixed(1), stroke: sk.grid, 'stroke-width': 1 }, svg); txt(Wd, yy + 4, nf(t, dec), { 'text-anchor': 'end' }); }
      txt(0, y0 - 8, s.namn.sv, { fill: sk.ink2, 'font-size': 11.5, 'font-weight': 600 });
      const farg = n === 0 ? sk.accent : sk.ink2;
      sv('path', { d: 'M' + v.map((x, i) => X(i).toFixed(1) + ' ' + Y(x).toFixed(1)).join('L'), fill: 'none', stroke: farg, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      const prick = sv('circle', { r: 4, fill: farg, stroke: sk.paper, 'stroke-width': 2 }, svg);
      return { s, Y, prick };
    });
    const kors = sv('line', { y1: padT - 4, y2: H - padB, stroke: sk.ink2, 'stroke-width': 1, 'stroke-dasharray': '2 3', 'pointer-events': 'none' }, svg);
    const visa = i => {
      kors.setAttribute('x1', X(i).toFixed(1)); kors.setAttribute('x2', X(i).toFixed(1));
      paneler.forEach(p => { p.prick.setAttribute('cx', X(i).toFixed(1)); p.prick.setAttribute('cy', p.Y(p.s.varden[i]).toFixed(1)); });
      avl.textContent = '';
      avl.append(el('b', null, dag(g.datum[i])));
      S.forEach(s => { const sp = el('span'); sp.append(document.createTextNode(s.kort.sv + ' '), el('b', null, varde(s, s.varden[i]))); avl.append(document.createTextNode(' '), sp); });
    };
    // avläsning med pekare och tangenter; utan pekare står den på sista dagen
    const yta = sv('rect', { x: 0, y: padT - 4, width: pw + 4, height: H - padT - padB + 4, fill: 'transparent', tabindex: 0, class: 'hit', 'aria-label': 'Läs av dag för dag med pekaren eller piltangenterna' }, svg);
    let i = N - 1;
    yta.addEventListener('pointermove', e => { const r = svg.getBoundingClientRect(); i = Math.max(0, Math.min(N - 1, Math.round((e.clientX - r.left) * Wd / r.width / pw * (N - 1)))); visa(i); });
    const sist = () => { i = N - 1; visa(i); };
    yta.addEventListener('pointerleave', sist); yta.addEventListener('blur', sist);
    yta.addEventListener('keydown', e => {
      const st = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft') i = Math.max(0, i - st); else if (e.key === 'ArrowRight') i = Math.min(N - 1, i + st); else if (e.key === 'Home') i = 0; else if (e.key === 'End') i = N - 1; else return;
      e.preventDefault(); visa(i);
    });
    visa(N - 1);
  }

  /* talen dag för dag, som tabell (samma tal som grafen) */
  function tabell(g) {
    const d = el('details', 'numbers'), tb = el('table', 't'), hr = el('tr');
    d.append(el('summary', null, 'Talen dag för dag (' + g.datum.length + ' handelsdagar)'));
    hr.append(el('th', null, 'Dag')); g.serier.forEach(s => hr.append(el('th', null, s.namn.sv))); tb.append(hr);
    g.datum.forEach((dd, i) => { const tr = el('tr'); tr.append(el('td', null, dag(dd))); g.serier.forEach(s => tr.append(el('td', null, varde(s, s.varden[i])))); tb.append(tr); });
    d.append(tb); return d;
  }

  function artikel(p) {
    const a = el('article', 'inlagg'); a.id = p.id; a.lang = 'sv';
    const kick = el('p', 'inl-kick', L('Utanför portföljen', 'Outside the portfolio')); if (T.en()) kick.lang = 'en'; a.append(kick);
    if (T.en()) { const not = el('p', 'inl-sprak', 'This post is in Swedish.'); not.lang = 'en'; a.append(not); }
    a.append(el('h1', null, p.rubrik));
    const text = el('div', 'inl-text');
    p.stycken.forEach((t, n) => {
      const s = el('p');
      if (n === 0) { const b = el('b', 'inl-datum'), tm = el('time', null, dag(p.datum)); tm.setAttribute('datetime', p.datum); b.append(tm); s.append(b, document.createTextNode(' ')); }
      s.append(document.createTextNode(t)); text.append(s);
    });
    a.append(text);
    const fig = el('figure', 'inl-graf');
    fig.append(el('h2', null, p.graf.rubrik), el('p', 'gsub', 'Daglig stängning. Dra med pekaren eller använd piltangenterna för att läsa av en dag.'));
    const wrap = el('div', 'chartwrap'); wrap.id = 'graf-' + p.id; fig.append(wrap);
    fig.append(el('figcaption', null, p.graf.kalla.sv), tabell(p.graf));
    a.append(fig);
    const rad = (cls, lab, t) => { const e = el('p', cls); e.append(el('b', null, lab), document.createTextNode(' ' + t)); return e; };
    a.append(rad('inl-innehav', 'Innehav:', p.innehav), rad('inl-kallor', 'Källor:', p.kallor));
    return a;
  }

  function sida() {
    const host = document.getElementById('inlaggen'); if (!host) return;
    T.applyRoot();
    document.title = INL[0].rubrik + ' · ' + L('Utanför portföljen', 'Outside the portfolio') + ' · Portföljen';
    const tag = document.getElementById('tag'); tag.textContent = '';
    const back = el('a', null, L('← Förstasidan', '← Front page')); back.href = T.href('index.html'); tag.append(back);
    T.dom.controls(document.getElementById('ctrls'), ch => { T.setState(ch, true); sida(); });
    T.dom.ears(document.getElementById('ear-left'), document.getElementById('ear-right'), T.upplaga());
    host.textContent = ''; INL.forEach(p => host.append(artikel(p)));
    INL.forEach(p => graf(document.getElementById('graf-' + p.id), p.graf));
    T.dom.footer(document.getElementById('foot'));
  }

  /* förstasidan: en rad ovanför remsan som pekar på det senaste inlägget, så att det syns på första skärmen (mätt 2026-10-06:
     rutan under I korthet låg 1,5 skärmar ner på datorn och 5 i mobilen). Ritas om när tidningen ritar om. */
  function puff() {
    const strip = document.getElementById('strip'); if (!strip) return;
    const p = INL[0]; let box = document.querySelector('.inl-topp');
    if (!box) { box = el('aside', 'inl-topp'); strip.before(box); }
    box.textContent = ''; box.setAttribute('aria-label', L('Utanför portföljen', 'Outside the portfolio'));
    const a = el('a'); a.href = T.href('inlagg.html', p.id);
    const h = el('span', 'inl-topp-h', p.rubrik), ing = el('span', 'inl-topp-t', forstaMeningen(p.stycken[0])), tm = el('time', null, dag(p.datum, false));
    h.lang = 'sv'; ing.lang = 'sv'; tm.setAttribute('datetime', p.datum);
    a.append(el('span', 'inl-topp-k', L('Utanför portföljen', 'Outside the portfolio')), document.createTextNode(' '), h, document.createTextNode(' '), ing, document.createTextNode(' '), tm);
    if (T.en()) { const not = el('span', 'inl-sprak', 'In Swedish'); not.lang = 'en'; a.append(document.createTextNode(' '), not); }
    box.append(a);
  }

  if (document.getElementById('inlaggen')) { sida(); T.onResize(() => INL.forEach(p => graf(document.getElementById('graf-' + p.id), p.graf))); }
  const rader = document.getElementById('brief-lines');
  if (rader) { puff(); new MutationObserver(puff).observe(rader, { childList: true }); }
})();
