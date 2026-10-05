/* Portföljen v2: tidningens kärna.
   Läser window.SNAPSHOT (../data.js) och skriver tidningen: rubriker, ingress, I korthet, faktakollen och graferna.
   Inga sidoeffekter vid laddning: sidorna anropar Tidning.forsta(), Tidning.positionssida() eller Tidning.metod().
   Bobbo OS-vyn (../v2-brutal/) använder samma rubrikmotor och samma grafer i sin egen uniform.
   Vyn räknar inget som påverkar ett beslut: regelläge, avstånd, brus, optionsmål och chanser kommer färdiga ur datan.
   Det vyn härleder är presentation: procentenheter, solfjäderns form mellan i dag och tolv månader (ändpunkterna är
   datans kvantiler), och portföljens försprång i procentenheter för publikläget. */
(function (root) {
'use strict';
const S = root.SNAPSHOT;
if (!S || !S.portfolio || !Array.isArray(S.positions) || !S.positions.length) { root.Tidning = null; return; }

/* ================= läget: upplaga, språk, publik ================= */
const Q = new URLSearchParams(root.location ? root.location.search : '');
const pref = {
  get(k) { try { return root.localStorage.getItem('portfoljen.v2.' + k); } catch (e) { return null; } },
  set(k, v) { try { root.localStorage.setItem('portfoljen.v2.' + k, v); } catch (e) { /* privat läge eller blockerad lagring */ } },
};
function startUpplaga() {
  const q = Q.get('upplaga'); if (q === 'morgon' || q === 'kvall') return q;
  const p = pref.get('upplaga'); if (p === 'morgon' || p === 'kvall') return p;
  try { return root.matchMedia('(prefers-color-scheme: dark)').matches ? 'kvall' : 'morgon'; } catch (e) { return 'morgon'; }
}
function startLang() {
  const q = Q.get('lang'); if (q === 'en' || q === 'sv') return q;
  return pref.get('lang') === 'en' ? 'en' : 'sv';
}
/* Den publika sajten (bygg-publik.py) sätter TIDNING_PUBLIK_ENDAST i sin data.js: publikläget är då låst, knappen
   finns inte och adressen bär inget publik-val. Datan där saknar dessutom riktiga belopp, så låset är inte det enda skyddet. */
const PUBLIK_ENDAST = root.TIDNING_PUBLIK_ENDAST === true;
const state = { upplaga: startUpplaga(), lang: startLang(), publik: PUBLIK_ENDAST || Q.get('publik') === '1' };
const en = () => state.lang === 'en';
const pub = () => PUBLIK_ENDAST || state.publik;
const L = (sv, eng) => (en() ? eng : sv);
/* Rösten: privat skriver maskinen till ägaren (du), publik skriver den om portföljen. */
const LV = (svDu, svPub, enYou, enPub) => (en() ? (pub() ? enPub : enYou) : (pub() ? svPub : svDu));

function setState(patch, persist) {
  Object.assign(state, patch);
  if (persist) {
    if ('upplaga' in patch) pref.set('upplaga', state.upplaga);
    if ('lang' in patch) pref.set('lang', state.lang);
    try {
      const u = new URL(root.location.href);
      u.searchParams.set('upplaga', state.upplaga);
      if (state.lang === 'en') u.searchParams.set('lang', 'en'); else u.searchParams.delete('lang');
      if (state.publik && !PUBLIK_ENDAST) u.searchParams.set('publik', '1'); else u.searchParams.delete('publik');
      root.history.replaceState(null, '', u.toString());
    } catch (e) { /* file:// i vissa motorer */ }
  }
  applyRoot();
}
function applyRoot() {
  const h = document.documentElement;
  h.dataset.upplaga = state.upplaga; h.lang = state.lang;
}
function href(page, hash) {
  const q = new URLSearchParams();
  q.set('upplaga', state.upplaga);
  if (state.lang === 'en') q.set('lang', 'en');
  if (state.publik && !PUBLIK_ENDAST) q.set('publik', '1');
  return page + '?' + q.toString() + (hash ? '#' + hash : '');
}

/* ================= format ================= */
const NB = ' ', MINUS = '−';
const ok = x => x !== null && x !== undefined && Number.isFinite(x);
const nfc = {};
function nf(d) { const k = state.lang + d; return nfc[k] || (nfc[k] = new Intl.NumberFormat(en() ? 'en-US' : 'sv-SE', { minimumFractionDigits: d, maximumFractionDigits: d })); }
function isZero(x, d) { return Number(Math.abs(x).toFixed(d)) === 0; }
function num(x, d = 2) { if (!ok(x)) return '—'; return (x < 0 && !isZero(x, d) ? MINUS : '') + nf(d).format(Math.abs(x)); }
function sgn(x, d = 0) { if (!ok(x)) return '—'; if (isZero(x, d)) return nf(d).format(0); return (x > 0 ? '+' : MINUS) + nf(d).format(Math.abs(x)); }
const PCT = () => (en() ? '%' : NB + '%');
const pctU = (x, d = 1) => (ok(x) ? num(x * 100, d) + PCT() : '—');
const pctS = (x, d = 1) => (ok(x) ? sgn(x * 100, d) + PCT() : '—');
const pct0 = x => (!ok(x) ? '—' : x < 0.005 ? (en() ? '<1%' : '<1' + NB + '%') : x > 0.995 ? (en() ? '>99%' : '>99' + NB + '%') : num(x * 100, 0) + PCT());
const ppS = (x, d = 1) => (ok(x) ? sgn(x * 100, d) + NB + 'pp' : '—');
const kr = x => (!ok(x) ? '—' : en() ? 'SEK' + NB + num(x, 0) : num(x, 0) + NB + 'kr');
const krS = x => { if (!ok(x)) return '—'; if (!en()) return sgn(x, 0) + NB + 'kr'; const s = isZero(x, 0) ? '' : x > 0 ? '+' : MINUS; return s + 'SEK' + NB + num(Math.abs(x), 0); };
const kronor = x => (!ok(x) ? '—' : en() ? 'SEK' + NB + num(x, 0) : num(x, 0) + NB + 'kronor');
const px = x => (ok(x) ? num(x, Math.abs(x) >= 1000 ? 0 : 2) : '—');
const pxq = x => (ok(x) ? num(x, Math.abs(x) >= 100 ? 0 : 2) : '—'); /* fjäderns ytterkanter: hela tal räcker */
const CCYW = { EUR: 'euro', USD: 'dollar', SEK: 'kronor' };
const money = (x, ccy) => (en() ? ccy + NB + px(x) : px(x) + NB + (CCYW[ccy] || ccy));
const tal = x => (ok(x) ? num(x, Number.isInteger(x) ? 0 : 2) : '—');

/* ================= datum ================= */
const MON = { sv: ['jan', 'feb', 'mars', 'apr', 'maj', 'juni', 'juli', 'aug', 'sep', 'okt', 'nov', 'dec'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
const MONL = { sv: ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] };
const DAY = { sv: ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
function D(s) { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
const mon = t => MON[state.lang][t.getUTCMonth()];
const dS = s => { const t = D(s); return en() ? mon(t) + ' ' + t.getUTCDate() : t.getUTCDate() + ' ' + mon(t); };
const dSY = s => { const t = D(s); return en() ? mon(t) + ' ' + t.getUTCDate() + ', ' + t.getUTCFullYear() : t.getUTCDate() + ' ' + mon(t) + ' ' + t.getUTCFullYear(); };
const dL = s => { const t = D(s); const m = MONL[state.lang][t.getUTCMonth()]; return en() ? m + ' ' + t.getUTCDate() + ', ' + t.getUTCFullYear() : t.getUTCDate() + ' ' + m + ' ' + t.getUTCFullYear(); };
const wd = s => DAY[state.lang][D(s).getUTCDay()];
const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const iso = t => t.toISOString().slice(0, 10);
function addDays(s, n) { const t = D(s); t.setUTCDate(t.getUTCDate() + n); return iso(t); }
function nextWeekday(s) { let x = s; do { x = addDays(x, 1); } while ([0, 6].includes(D(x).getUTCDay())); return x; }
/* klockslag avrundat till närmaste minut (21:45:49 blir 21:46, som i datans egen beskrivning) */
const hhmm = s => { const m = /(\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(s).slice(11)); if (!m) return ''; let t = (+m[1]) * 60 + (+m[2]) + ((+m[3] || 0) >= 30 ? 1 : 0); t %= 1440; return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
/* "i fredags" på svenska, "on Friday" på engelska */
const onDay = s => (en() ? 'on ' + wd(s) : 'i ' + wd(s) + 's');

/* ================= domänen ================= */
const P = S.portfolio, POS = S.positions.slice();
const BYW = POS.slice().sort((a, b) => b.weight - a.weight);
const pos = id => POS.find(p => p.id === id) || null;
const ASOF = POS.map(p => p.asof).filter(Boolean).sort().pop();
const BUILT = (S.meta && S.meta.built) || ASOF;
const maxBy = (a, f) => a.reduce((b, x) => (f(x) > f(b) ? x : b));
const minBy = (a, f) => a.reduce((b, x) => (f(x) < f(b) ? x : b));
const NAMES = {
  sv: { ENR: 'Siemens Energy', PLTR: 'Palantir', NVDA: 'Nvidia', EME: 'Emcor', FLKR: 'Koreafonden' },
  en: { ENR: 'Siemens Energy', PLTR: 'Palantir', NVDA: 'Nvidia', EME: 'Emcor', FLKR: 'Korea fund' },
};
/* nm: namnet i rubriker och listor; prose: namnet mitt i en mening (engelskan vill ha artikel). */
const nm = p => (NAMES[state.lang][p.id] || p.name);
const prose = p => (en() && p.id === 'FLKR' ? 'the Korea fund' : nm(p));
const TINY = { ENR: 'Siemens', PLTR: 'Palantir', NVDA: 'Nvidia', EME: 'Emcor', FLKR: 'Korea' };
const CAL = { 'ENR.DE': 'Siemens Energy', PLTR: 'Palantir', NVDA: 'Nvidia', EME: 'Emcor', '005930.KS': 'Samsung', '000660.KS': 'SK hynix' };
const short = t => String(t || '').replace(/\.[A-Z]{1,3}$/, '');
const exchange = p => { const m = /\(([^)]*)\)\s*$/.exec(p.held_name || ''); if (!m) return ''; const parts = m[1].split(','); return parts[parts.length - 1].trim(); };
const STATE = {
  'INTAKT': { sym: '●', sv: 'Intakt', en: 'Intact', cls: 'ok' },
  'VARNING': { sym: '◆', sv: 'Varning', en: 'Warning', cls: 'bad' },
  'PÅ VÄG': { sym: '◐', sv: 'På väg', en: 'Closing in', cls: 'bad' },
  'UTLÖST': { sym: '■', sv: 'Utlöst', en: 'Triggered', cls: 'bad' },
};
const stateOf = p => STATE[p.rule.state] || { sym: '?', sv: p.rule.state, en: p.rule.state, cls: 'bad' };
const stateWord = p => stateOf(p)[state.lang];
const ruleLvl = p => (p.levels || []).find(l => Math.abs(l.level - p.rule.level) < 1e-9 && l.tf === p.rule.tf) || null;
const ruleDist = p => { const l = ruleLvl(p); return l ? l.dist : p.chart_px / p.rule.level - 1; };
const ruleAtr = p => { const l = ruleLvl(p); return l ? l.dist_atr : null; };
const noise5 = p => ((p.rule || {}).noise_touch || {})['5d'];
const noise21 = p => ((p.rule || {}).noise_touch || {})['21d'];
const near = () => minBy(POS, p => Math.abs(ruleDist(p)));
const regW = p => (p.regression || []).find(r => r.tf === 'W' && r.channel) || null;
const regD = p => (p.regression || []).find(r => r.tf === 'D' && r.channel) || null;
const atWeeklyEdge = p => { const w = regW(p); return !!(w && w.channel.dir === 'upp' && w.channel.z <= -1.8); };
const hasOpt = p => { const o = p.oiret || {}; return !o.err && !!o.quantiles_12m && ok(o.er) && ok(o.sigma) && ok(o.target_12m); };
const approxMonths = o => { const m = /löptid ([\d.]+) år/.exec(o.approx || ''); return m ? Math.round(parseFloat(m[1]) * 12) : 6; };
const outside = o => !!(o.evidence && /^UTANFÖR/i.test(o.evidence));
function otherLevel(p) {
  return (p.levels || []).find(l => Math.abs(l.level - p.rule.level) > 1e-9) || null;
}
const ccyWord = c => (en() ? c : (CCYW[c] || c));
const levelText = p => px(p.rule.level) + ' ' + ccyWord(p.chart_ccy) + (p.chart !== p.held ? ' (' + p.chart + ')' : '');
function ruleWords(p, withLevel) {
  const r = p.rule, n = r.need;
  if (en()) {
    const tf = { '4H': 'four-hour', D: 'daily', W: 'weekly' }[r.tf] || r.tf;
    return (n === 1 ? 'the first ' + tf + ' close' : (n === 2 ? 'two ' : n + ' ') + tf + ' closes') + ' below' + (withLevel ? ' ' + px(r.level) : '');
  }
  const tf = { '4H': 'fyratimmars', D: 'dags', W: 'vecko' }[r.tf] || r.tf;
  return (n === 1 ? 'första ' + tf + 'stängningen' : (n === 2 ? 'två ' : n + ' ') + tf + 'stängningar') + ' under' + (withLevel ? ' ' + px(r.level) : '');
}
function oiNote(o, shortForm) {
  if (!o || o.err) return '';
  const bits = [shortForm ? L('prel.', 'prelim.') : L('preliminär', 'preliminary')];
  if (o.approx) bits.push(shortForm ? L(approxMonths(o) + ' mån uppräknat', approxMonths(o) + ' mo annualised') : L('bara ca ' + approxMonths(o) + ' mån optioner, uppräknat', 'only about ' + approxMonths(o) + ' months of options, annualised'));
  if (outside(o)) bits.push(shortForm ? L('ETF, utanför evidensen', 'ETF, outside the evidence') : L('ETF utanför studiens evidens', "an ETF outside the study's evidence"));
  return bits.join(', ');
}
function events() {
  const ev = [];
  POS.forEach(p => (p.calendar || []).filter(c => c.date).forEach(c => ev.push({ d: c.date.slice(0, 10), t: c.ticker, p, inner: c.ticker !== p.chart && c.ticker !== p.held })));
  return ev.filter(e => e.d >= ASOF).sort((a, b) => a.d.localeCompare(b.d));
}
const evName = e => CAL[e.t] || e.t;
function evList(list) {
  // grannar ur samma fond grupperas: "SK hynix 27 okt och Samsung 28 okt (i Koreafonden)"
  const parts = [];
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e.inner && list[i + 1] && list[i + 1].inner && list[i + 1].p === e.p) {
      const f = list[i + 1];
      parts.push(evName(e) + ' ' + dS(e.d) + L(' och ', ' and ') + evName(f) + ' ' + dS(f.d) + L(' (i ' + nm(e.p) + ')', ' (in the ' + nm(e.p).replace(/^the /, '') + ')'));
      i++;
    } else parts.push(evName(e) + ' ' + dS(e.d) + (e.inner ? L(' (i ' + nm(e.p) + ')', ' (in the ' + nm(e.p) + ')') : ''));
  }
  if (parts.length < 2) return parts.join('');
  return parts.slice(0, -1).join(', ') + L(' och ', ' and ') + parts[parts.length - 1];
}
const edDate = ed => (ed === 'kvall' ? ASOF : nextWeekday(ASOF));
const listNames = arr => { const n = arr.map(nm); return n.length < 2 ? n.join('') : n.slice(0, -1).join(', ') + L(' och ', ' and ') + n[n.length - 1]; };

/* ================= maskinen skriver ================= */
function headline(ed) {
  const trig = POS.filter(p => p.rule.state === 'UTLÖST'), pav = POS.filter(p => p.rule.state === 'PÅ VÄG'), varn = POS.filter(p => p.rule.state === 'VARNING');
  const nr = near(), nd = ruleDist(nr);
  if (trig.length) return ed === 'morgon'
    ? L(listNames(trig) + ': exitregeln utlöstes vid stängningen', listNames(trig) + ': exit rule triggered at the close')
    : L('Exitregeln utlöst för ' + listNames(trig), 'Exit rule triggered for ' + listNames(trig));
  if (pav.length) { const p = pav[0]; return L(nm(p) + ' under regelnivån, ' + p.rule.closes_beyond + ' av ' + p.rule.need + ' stängningar', nm(p) + ' below its rule level, ' + p.rule.closes_beyond + ' of ' + p.rule.need + ' closes'); }
  if (varn.length) return L(nm(varn[0]) + ' har stängt under varningsnivån', nm(varn[0]) + ' has closed below its warning level');
  if (ed === 'morgon') {
    const monday = D(edDate(ed)).getUTCDay() === 1;
    return L(nm(nr) + ' ' + pctU(Math.abs(nd)) + (nd >= 0 ? ' över' : ' under') + ' sin regelnivå ' + (monday ? 'när veckan börjar' : 'inför dagens handel'),
      nm(nr) + ' ' + pctU(Math.abs(nd)) + (nd >= 0 ? ' above' : ' below') + ' its rule level ' + (monday ? 'as the week begins' : 'ahead of trading'));
  }
  const mv = maxBy(POS, p => Math.abs(p.day_local)), top = maxBy(POS, p => p.pnl_sek);
  let a, used;
  if (Math.abs(mv.day_local) >= 0.02) { a = L(nm(mv) + (mv.day_local > 0 ? ' steg ' : ' föll ') + pctU(Math.abs(mv.day_local)), nm(mv) + (mv.day_local > 0 ? ' rises ' : ' falls ') + pctU(Math.abs(mv.day_local))); used = mv.id; }
  else { a = top.pnl_sek / P.pnl_sek > 0.5 ? L(nm(top) + ' bär portföljen', nm(top) + ' carries the portfolio') : L(nm(top) + ' ger mest', nm(top) + ' leads the gains'); used = top.id; }
  const edge = POS.filter(p => p.id !== used && atWeeklyEdge(p));
  let b;
  if (edge.length === 1) b = L(nm(edge[0]) + ' vid veckokanalens nedre kant', nm(edge[0]) + ' at the lower edge of its weekly channel');
  else if (edge.length > 1) b = L(edge.length + ' innehav vid veckokanalens nedre kant', edge.length + ' holdings at the lower edge of their weekly channels');
  else b = nr.id !== used ? L(nm(nr) + ' närmast sin regelnivå', nm(nr) + ' closest to its rule level') : L('inga regler utlösta', 'no rules triggered');
  return cap(a) + ', ' + b;
}

function nearSentence(nr) {
  // "Siemens Energy ligger närmast: kursen 4,5 % över 139,16 euro" (nivån är basen)
  const nd = ruleDist(nr);
  return L(nm(nr) + ' ligger närmast: kursen ' + pctU(Math.abs(nd)) + (nd >= 0 ? ' över ' : ' under ') + money(nr.rule.level, nr.chart_ccy),
    cap(prose(nr)) + ' is closest: the price is ' + pctU(Math.abs(nd)) + (nd >= 0 ? ' above ' : ' below ') + money(nr.rule.level, nr.chart_ccy));
}
function lede(ed) {
  const nr = near(), bad = POS.filter(p => p.rule.state !== 'INTAKT');
  const top = maxBy(POS, p => p.pnl_sek), day = ASOF;
  const rules = bad.length === 0 ? null : L(bad.length + ' av fem regler kräver uppmärksamhet: ' + bad.map(p => nm(p) + ' (' + stateWord(p).toLowerCase() + ')').join(', ') + '.',
    bad.length + ' of five rules need attention: ' + bad.map(p => nm(p) + ' (' + stateWord(p).toLowerCase() + ')').join(', ') + '.');
  if (ed === 'morgon') {
    const ev = events()[0];
    const s1 = rules || L('Ingen av de fem exitreglerna utlöstes vid ' + wd(day) + 'ens stängning.', "None of the five exit rules triggered at " + wd(day) + "'s close.");
    const s2 = nearSentence(nr) + L(', och vanlig svängning når dit inom fem dagar i ' + pct0(noise5(nr)) + ' av fallen; ', ', and ordinary swings reach it within five days in ' + pct0(noise5(nr)) + ' of cases; ')
      + LV('din regel säljer vid ', 'regeln säljer vid ', 'your rule sells on ', 'the rule sells on ') + ruleWords(nr, false) + L('.', ' it.');
    const s3 = pub()
      ? L('Portföljen ligger ' + pctU(P.ret) + ' över vad köpen kostade, ' + num((P.ret - P.msci_ret) * 100, 1) + ' procentenheter ' + (P.ret >= P.msci_ret ? 'före' : 'efter') + ' samma insats i MSCI World.',
        'The portfolio stands ' + pctU(P.ret) + ' above what the purchases cost, ' + num((P.ret - P.msci_ret) * 100, 1) + ' percentage points ' + (P.ret >= P.msci_ret ? 'ahead of' : 'behind') + ' the same money in MSCI World.')
      : L('Portföljen står på ' + kronor(P.value_sek) + ', ' + pctU(P.ret) + ' över vad köpen kostade och ' + num((P.ret - P.msci_ret) * 100, 1) + ' procentenheter ' + (P.ret >= P.msci_ret ? 'före' : 'efter') + ' samma kronor i MSCI World.',
        'The portfolio stands at ' + kronor(P.value_sek) + ', ' + pctU(P.ret) + ' above what the purchases cost and ' + num((P.ret - P.msci_ret) * 100, 1) + ' percentage points ' + (P.ret >= P.msci_ret ? 'ahead of' : 'behind') + ' the same money in MSCI World.');
    const s4 = ev ? L('Nästa rapport: ' + evName(ev) + ' ' + dS(ev.d) + (ev.inner ? ', i ' + nm(ev.p) : '') + '.', 'Next report: ' + evName(ev) + ' on ' + dS(ev.d) + (ev.inner ? ', held through ' + prose(ev.p) : '') + '.') : '';
    return [s1, s2, s3, s4].filter(Boolean).join(' ');
  }
  const up = P.day_sek >= 0;
  const s1 = pub()
    ? L('Portföljen ' + (up ? 'steg ' : 'föll ') + pctU(Math.abs(P.day_ret)) + ' ' + onDay(day) + ' och ligger ' + pctU(P.ret) + ' över vad köpen kostade; samma insats i MSCI World hade gett ' + pctU(P.msci_ret) + '.',
      'The portfolio ' + (up ? 'rose ' : 'fell ') + pctU(Math.abs(P.day_ret)) + ' ' + onDay(day) + ' and stands ' + pctU(P.ret) + ' above what the purchases cost; the same money in MSCI World would have made ' + pctU(P.msci_ret) + '.')
    : L('Portföljen ' + (up ? 'steg ' : 'föll ') + kronor(Math.abs(P.day_sek)) + ' ' + onDay(day) + ' och är värd ' + kronor(P.value_sek) + ', ' + pctU(P.ret) + ' mer än köpen kostade; samma kronor i MSCI World hade gett ' + pctU(P.msci_ret) + '.',
      'The portfolio ' + (up ? 'rose ' : 'fell ') + kronor(Math.abs(P.day_sek)) + ' ' + onDay(day) + ' and is worth ' + kronor(P.value_sek) + ', ' + pctU(P.ret) + ' more than the purchases cost; the same money in MSCI World would have made ' + pctU(P.msci_ret) + '.');
  let s2 = '';
  if (P.pnl_sek > 0 && top.pnl_sek > 0) s2 = pub()
    ? L(nm(top) + ' står för ' + pctU(top.pnl_sek / P.pnl_sek, 0) + ' av vinsten.', cap(prose(top)) + ' accounts for ' + pctU(top.pnl_sek / P.pnl_sek, 0) + ' of the gain.')
    : L(nm(top) + ' står för ' + num(top.pnl_sek, 0) + ' av de ' + kronor(P.pnl_sek) + 'na i vinst.', cap(prose(top)) + ' accounts for ' + kr(top.pnl_sek) + ' of the ' + kr(P.pnl_sek) + ' gain.');
  const s3 = rules || L('Ingen exitregel har utlösts.', 'No exit rule has triggered.');
  const s4 = rules ? '' : nearSentence(nr) + L(', så nära att vanlig svängning når dit inom fem dagar i ' + pct0(noise5(nr)) + ' av fallen.', ', close enough that ordinary swings reach it within five days in ' + pct0(noise5(nr)) + ' of cases.');
  return [s1, s2, s3, s4].filter(Boolean).join(' ');
}
const byline = () => LV('Skriven av maskinen ur kurserna och dina positionskort. Dina egna ord står i kursiv.',
  'Skriven av maskinen ur kurserna och positionskorten. Bilels egna ord står i kursiv.',
  'Written by the machine from prices and your position cards. Your own words are in italics.',
  "Written by the machine from prices and the position cards. Bilel's own words are in italics.");

function briefLabel(ed) {
  const day = edDate(ed);
  return ed === 'kvall' ? L('Rapporten ' + wd(day) + ' 22:15', wd(day) + "'s 22:15 report") : L('Rapporten ' + wd(day) + ' 09:00', wd(day) + "'s 09:00 report");
}
function brief(ed) {
  const nr = near(), nd = ruleDist(nr), bad = POS.filter(p => p.rule.state !== 'INTAKT'), ev = events();
  const nearTxt = L(nm(nr) + ', ' + pctU(Math.abs(nd)) + (nd >= 0 ? ' över ' : ' under ') + px(nr.rule.level), prose(nr) + ', ' + pctU(Math.abs(nd)) + (nd >= 0 ? ' above ' : ' below ') + px(nr.rule.level));
  const noiseTxt = L('vanlig svängning når dit inom fem dagar i ' + pct0(noise5(nr)) + ' av fallen.', 'ordinary swings reach it within five days in ' + pct0(noise5(nr)) + ' of cases.');
  if (ed === 'morgon') {
    const M = S.macro || {}, m = k => (M[k] && !M[k].err ? M[k] : null);
    const parts = [['^GSPC', 'S&P 500'], ['^NDX', 'Nasdaq 100'], ['^KS11', 'KOSPI']].filter(([k]) => m(k)).map(([k, lab]) => lab + ' ' + pctS(m(k).chg));
    const vix = m('^VIX');
    const mDay = (m('^GSPC') || {}).asof || ASOF;
    const s1 = L('Senaste stängning, ' + wd(mDay) + ': ', 'Latest close, ' + wd(mDay) + ': ') + parts.join(', ') + (vix ? L(' och VIX ', ' and VIX ') + num(vix.last, 1) : '') + '.';
    const s2 = bad.length
      ? L('Att bevaka: ', 'To watch: ') + bad.map(p => nm(p) + ' (' + stateWord(p).toLowerCase() + ')').join(', ') + '.'
      : L('Att bevaka: ', 'To watch: ') + nearTxt + '; ' + LV('din regel säljer vid ', 'regeln säljer vid ', 'your rule sells on ', 'the rule sells on ') + ruleWords(nr, false) + L('. Vanlig svängning når nivån inom fem dagar i ' + pct0(noise5(nr)) + ' av fallen.', ' it. Ordinary swings reach the level within five days in ' + pct0(noise5(nr)) + ' of cases.');
    const week = ev.filter(e => e.d <= addDays(edDate(ed), 6));
    const nHeld = POS.filter(p => ok(p.px) && ok(p.chart_px)).length, keys = Object.keys(M), nMac = keys.filter(k => M[k] && !M[k].err && ok(M[k].last)).length;
    const s3 = (week.length ? L('Veckan: ' + evList(week) + '.', 'This week: ' + evList(week) + '.') : L('Veckan: inga rapporter; nästa är ' + (ev[0] ? evList([ev[0]]) : '—') + '.', 'This week: no reports; the next is ' + (ev[0] ? evList([ev[0]]) : '—') + '.'))
      + L(' Datan: ' + nHeld + ' av ' + POS.length + ' innehav och ' + nMac + ' av ' + keys.length + ' marknader lästa utan fel.', ' Data: ' + nHeld + ' of ' + POS.length + ' holdings and ' + nMac + ' of ' + keys.length + ' markets read without errors.');
    return [s1, s2, s3];
  }
  const s1 = bad.length
    ? LV(bad.length + ' av dina fem säljregler larmar: ', bad.length + ' av de fem säljreglerna larmar: ', bad.length + ' of your five sell rules are flagging: ', bad.length + ' of the five sell rules are flagging: ') + bad.map(p => nm(p) + ' ' + stateWord(p).toLowerCase()).join(', ') + '.'
    : LV('Ingen av dina fem säljregler har slagit till.', 'Ingen av de fem säljreglerna har slagit till.', 'None of your five sell rules has triggered.', 'None of the five sell rules has triggered.')
      + L(' Närmast är ', ' Closest is ') + nearTxt + '; ' + noiseTxt;
  const mv = maxBy(POS, p => Math.abs(p.day_local));
  const s2 = L('Största rörelsen var ' + nm(mv) + ', ' + pctS(mv.day_local) + '.', 'The biggest move was ' + prose(mv) + ', ' + pctS(mv.day_local) + '.')
    + (pub() ? L(' Hela portföljen ' + pctS(P.day_ret) + '.', ' The whole portfolio ' + pctS(P.day_ret) + '.') : L(' Hela portföljen ' + krS(P.day_sek) + ', ' + pctS(P.day_ret) + '.', ' The whole portfolio ' + krS(P.day_sek) + ', ' + pctS(P.day_ret) + '.'));
  const s3 = ev.length ? L('Nästa rapporter: ', 'Next reports: ') + evList(ev.slice(0, 4)) + '.' : L('Inga rapportdatum i datan.', 'No report dates in the data.');
  return [s1, s2, s3];
}

function storyHeadline(p) {
  const n = nm(p), st = p.rule.state;
  if (st === 'UTLÖST') return L(n + ': exitregeln har utlösts', n + ': the exit rule has triggered');
  if (st === 'PÅ VÄG') return L(n + ' under regelnivån, ' + p.rule.closes_beyond + ' av ' + p.rule.need + ' stängningar', n + ' below its rule level, ' + p.rule.closes_beyond + ' of ' + p.rule.need + ' closes');
  if (st === 'VARNING') return L(n + ' har stängt under varningsnivån', n + ' has closed below its warning level');
  if (Math.abs(p.day_local) >= 0.03) return L(n + (p.day_local > 0 ? ' steg ' : ' föll ') + pctU(Math.abs(p.day_local)) + ' ' + onDay(p.asof), n + (p.day_local > 0 ? ' rose ' : ' fell ') + pctU(Math.abs(p.day_local)) + ' ' + onDay(p.asof));
  if (atWeeklyEdge(p)) return L(n + ' vilar på veckokanalens nedre kant', n + ' rests on the lower edge of its weekly channel');
  const closes = p.series.d_close, last = closes[closes.length - 1], hi = Math.max(...closes);
  if (last >= hi) return L(n + ' stängde på ettårshögsta', n + ' closed at a one-year high');
  if (last >= 0.985 * hi) return L(n + ' ' + pctU(1 - last / hi) + ' under ettårstoppen', n + ' ' + pctU(1 - last / hi) + ' below its one-year high');
  const nums = (p.plan_hold || '').match(/\d+(?:[.,]\d+)?/g);
  if (nums && nums.length) {
    const lv = Math.max(...nums.map(x => parseFloat(x.replace(',', '.'))));
    if (p.chart_px > lv) {
      const back = closes.slice(-20).some(c => c < lv);
      return L(n + (back ? ' tillbaka över ' : ' över ') + num(lv, 0) + ', där planen vill se stöd', n + (back ? ' back above ' : ' above ') + num(lv, 0) + ', where the plan wants support');
    }
  }
  if (Math.abs(p.asset_ret) < 0.02) return L(n + ' strax ' + (p.asset_ret < 0 ? 'under' : 'över') + ' köpkursen', n + ' just ' + (p.asset_ret < 0 ? 'below' : 'above') + ' the purchase price');
  return L(n + ' ' + pctS(p.ret) + ' sedan köpet', n + ' ' + pctS(p.ret) + ' since purchase');
}
function heldLine(p) {
  if (p.chart !== p.held) return L('Ägs som ' + short(p.held) + ' på ' + exchange(p) + ' i euro; nivåer och mål gäller ' + p.chart + ' i dollar.',
    'Held as ' + short(p.held) + ' on ' + exchange(p) + ' in euros; levels and target apply to ' + p.chart + ' in dollars.');
  return L(exchange(p) + ', ' + ccyWord(p.ccy) + '. Köpt ' + dSY(p.entry_date) + '.', exchange(p) + ', ' + p.ccy + '. Bought ' + dSY(p.entry_date) + '.');
}
function targetPhrase(p) {
  // "Ditt mål, cirka 990," när kortet anger ett spann eller ungefär
  const approx = /\d\s*[-–]\s*\d|ungefär|cirka|\bca\b/i.test(p.target_text || '');
  const t = (approx ? L('cirka ', 'about ') : '') + tal(p.target);
  return LV('Ditt mål ', 'Målet ', 'Your target ', 'The target ') + t;
}
function dek(p) {
  const d = ruleDist(p), o = p.oiret || {};
  const where = p.chart !== p.held ? L(' på ' + p.chart + ', där nivåerna gäller,', ' on ' + p.chart + ', where the levels apply,') : '';
  let s = L('Kursen ' + money(p.chart_px, p.chart_ccy) + where + ' ligger ' + pctU(Math.abs(d)) + (d >= 0 ? ' över ' : ' under ') + LV('din regelnivå ', 'regelnivån ', 'your rule level ', 'the rule level ') + px(p.rule.level) + '.',
    'The price of ' + money(p.chart_px, p.chart_ccy) + where + ' is ' + pctU(Math.abs(d)) + (d >= 0 ? ' above ' : ' below ') + LV('', '', 'your rule level ', 'the rule level ') + px(p.rule.level) + '.');
  if (ok(p.target)) {
    const g = p.target / p.chart_px - 1;
    s += ' ' + targetPhrase(p) + L(' ligger ' + pctU(Math.abs(g)) + (g >= 0 ? ' över' : ' under') + ' kursen', ' is ' + pctU(Math.abs(g)) + (g >= 0 ? ' above' : ' below') + ' the price');
    s += hasOpt(p) ? L('; optionerna säger ' + px(o.target_12m) + ' om ett år (' + oiNote(o) + ').', '; the options say ' + px(o.target_12m) + ' in a year (' + oiNote(o) + ').') : L('.', '.');
  } else {
    s += ' ' + LV('Kortet har inget mål', 'Kortet har inget mål', 'The card has no target', 'The card has no target')
      + (hasOpt(p) ? L('; optionerna säger ' + px(o.target_12m) + ' om ett år (' + oiNote(o) + ').', '; the options say ' + px(o.target_12m) + ' in a year (' + oiNote(o) + ').')
        : L(', och datakällan har inga optioner för aktien.', ', and the data source has no options for the stock.'));
  }
  return s;
}

/* Faktakollen: maskinens kontroll av varje påstående på kortet. Varje post: {v: dom, c: ok|bad|na, parts: [text | {q: citat}]} */
function checks(p) {
  const out = [], o = p.oiret || {};
  const q = t => ({ q: t });
  if (/bull/i.test(p.bias || '') && /bear/i.test(p.thesis || '') || /bear/i.test(p.bias || '') && /bull/i.test(p.thesis || '')) {
    out.push({ v: L('! Avviker', '! Diverges'), c: 'bad', parts: [L('Bias ', 'Bias '), q(p.bias), L(' men kort tes ', ' but short thesis '), q(p.thesis), L('. Kortet säger två saker; orsaken är inte utredd.', '. The card says two things; the reason is not established.')] });
  }
  const said = new Set();
  [['W', p.sma_W, p.sma_w], ['D', p.sma_D, p.sma_d]].forEach(([tf, text, sma]) => {
    if (!text || said.has(text)) return; said.add(text);
    const nums = []; const re = /SMA\s*(\d{2,3})/g; let m;
    while ((m = re.exec(text))) if (!nums.includes(m[1]) && sma && sma[m[1]]) nums.push(m[1]);
    if (!nums.length) return;
    // Påståendets typ per SMA: uttryckligen över eller under, ett stöd som höll (respekterade, räddning, reaktion),
    // eller bara en mätning. "nästan en reaktion" och liknande räknas inte som ett påstående om stöd.
    const words = '(\\s+[a-zåäö]+){0,2}\\s+';
    const kind = k => {
      if (new RegExp('(över|ovanför)\\s+SMA\\s*' + k + '\\b', 'i').test(text)) return 'above';
      if (new RegExp('under\\s+SMA\\s*' + k + '\\b', 'i').test(text)) return 'below';
      const sup = '(respekter|räddning|reaktion|stöd)[a-zåäö]*' + words + 'SMA\\s*' + k + '\\b';
      if (new RegExp('(nästan|inte|ingen)\\s+(en\\s+)?' + sup, 'i').test(text)) return null;
      return new RegExp(sup, 'i').test(text) ? 'support' : null;
    };
    const kinds = nums.map(kind), explicit = nums.filter((k, i) => kinds[i] === 'above' || kinds[i] === 'below'), support = nums.filter((k, i) => kinds[i] === 'support');
    let verdict = L('· Mätt', '· Measured'), cls = 'na';
    if (explicit.length) { const all = explicit.every(k => (kinds[nums.indexOf(k)] === 'above') === sma[k].above); verdict = all ? L('✓ Stämmer', '✓ Holds true') : L('✗ Stämmer inte', '✗ Not true'); cls = all ? 'ok' : 'bad'; }
    else if (support.length) { const all = support.every(k => sma[k].above); verdict = all ? L('✓ Håller', '✓ Holding') : L('✗ Bruten', '✗ Broken'); cls = all ? 'ok' : 'bad'; }
    const meas = nums.map(k => {
      const v = sma[k];
      const tfw = tf === 'W' ? L('veckografen', 'the weekly chart') : L('dagsgrafen', 'the daily chart');
      return L('SMA ' + k + ' på ' + tfw + ' är ' + px(v.v) + '; kursen ligger ' + pctU(Math.abs(v.dist)) + (v.dist >= 0 ? ' över.' : ' under.'),
        'SMA ' + k + ' on ' + tfw + ' is ' + px(v.v) + '; the price is ' + pctU(Math.abs(v.dist)) + (v.dist >= 0 ? ' above.' : ' below.'));
    });
    out.push({ v: verdict, c: cls, parts: [q(text), ' ' + meas.join(' ')] });
  });
  const regs = (p.regression || []).filter(r => r.anchor_date);
  if (regs.length) {
    const found = regs.every(r => ok(r.match_pct) && r.match_pct <= 1);
    const tfn = tf => ({ W: L('vecka', 'weekly'), D: L('dag', 'daily'), '4H': L('4 tim', '4-hour') }[tf] || tf);
    const list = regs.map(r => tfn(r.tf) + ' ' + dSY(r.anchor_date) + ' (' + px(r.anchor) + ')');
    const maxDev = Math.max(...regs.map(r => r.match_pct || 0));
    out.push({ v: found ? L('✓ Hittade', '✓ Found') : L('✗ Saknas', '✗ Missing'), c: found ? 'ok' : 'bad',
      parts: [LV('Dina ankare finns i kursdatan: ', 'Ankarna finns i kursdatan: ', 'Your anchors are in the price data: ', 'The anchors are in the price data: ') + list.join(', ') + L('; största avvikelse ' + num(maxDev, 1) + ' %.', '; largest deviation ' + num(maxDev, 1) + '%.')] });
  }
  const rd = regD(p), rw = regW(p);
  if (rd || rw) {
    const bits = [];
    if (rd) bits.push(L('Dagskanalen från ankaret ' + (rd.channel.dir === 'upp' ? 'stiger' : 'faller') + '; kursen ligger ' + num(Math.abs(rd.channel.z), 2) + ' standardavvikelser ' + (rd.channel.z < 0 ? 'under' : 'över') + ' mittlinjen ' + px(rd.channel.line) + '.',
      'The daily channel from the anchor ' + (rd.channel.dir === 'upp' ? 'rises' : 'falls') + '; the price is ' + num(Math.abs(rd.channel.z), 2) + ' standard deviations ' + (rd.channel.z < 0 ? 'below' : 'above') + ' the midline ' + px(rd.channel.line) + '.'));
    if (rw && Math.abs(rw.channel.z) >= 1.5) bits.push(L('Veckokanalen: ' + num(Math.abs(rw.channel.z), 2) + ' standardavvikelser ' + (rw.channel.z < 0 ? 'under' : 'över') + ' mittlinjen, ' + (rw.channel.z < 0 ? 'vid nedre kanten.' : 'vid övre kanten.'),
      'Weekly channel: ' + num(Math.abs(rw.channel.z), 2) + ' standard deviations ' + (rw.channel.z < 0 ? 'below' : 'above') + ' the midline, ' + (rw.channel.z < 0 ? 'at the lower edge.' : 'at the upper edge.')));
    bits.push(L('Husets test fann ingen köp- eller säljfördel i kanalläget.', "The house test found no buy or sell edge in the channel position."));
    out.push({ v: L('– Beskrivning', '– Description'), c: 'na', parts: [bits.join(' ')] });
  }
  const l = ruleLvl(p), s = stateOf(p);
  out.push({ v: s.sym + ' ' + stateWord(p), c: s.cls, parts: [
    L('Regelnivån ' + px(p.rule.level) + ': kursen ' + pctU(Math.abs(ruleDist(p))) + (ruleDist(p) >= 0 ? ' över, ' : ' under, ') + num(l ? l.dist_atr : null, 1) + ' ATR, ' + p.rule.closes_beyond + ' av ' + p.rule.need + ' stängningar under. ',
      'Rule level ' + px(p.rule.level) + ': the price is ' + pctU(Math.abs(ruleDist(p))) + (ruleDist(p) >= 0 ? ' above, ' : ' below, ') + num(l ? l.dist_atr : null, 1) + ' ATR, ' + p.rule.closes_beyond + ' of ' + p.rule.need + ' closes below. '),
    LV('Maskinens tolkning av ditt kort: sälj vid ', 'Maskinens tolkning av kortet: sälj vid ', 'The machine reads your card as: sell on ', 'The machine reads the card as: sell on ') + ruleWords(p, true) + L(' (exitbekräftelse ', ' (exit confirmation '), q(p.exit_confirm), ').' + LV(' Bekräfta den.', '', ' Confirm it.', '')] });
  if (hasOpt(p)) {
    const tp = ok(p.target) ? [L('Mot ', 'Against '), q(p.target_text), L(' säger optionerna: förväntat pris om ett år ', ' the options say: expected price in a year ')] : [L('Optionerna: förväntat pris om ett år ', 'The options: expected price in a year ')];
    let rest = px(o.target_12m) + ' (' + oiNote(o) + ').';
    if (ok(p.target) && ok(o.p_above_own_target_12m)) rest += L(' Chans att vara över ' + tal(p.target) + ' om ett år: ' + pct0(o.p_above_own_target_12m) + '.', ' Chance of being above ' + tal(p.target) + ' in a year: ' + pct0(o.p_above_own_target_12m) + '.');
    if (ok(p.target) && o.first_passage && ok(o.first_passage.p_target_first)) rest += L(' Chans att nå ' + tal(p.target) + ' före regelnivån inom ett år: ' + pct0(o.first_passage.p_target_first) + '.', ' Chance of reaching ' + tal(p.target) + ' before the rule level within a year: ' + pct0(o.first_passage.p_target_first) + '.');
    out.push({ v: L('Uträknat', 'Calculated'), c: 'na', parts: tp.concat([rest]) });
  } else {
    out.push({ v: L('– Går inte', '– Not possible'), c: 'na', parts: [L('Datakällan har inga optioner för ' + p.chart + ', så inget optionsmål kan räknas.', 'The data source has no options for ' + p.chart + ', so no option target can be calculated.')] });
  }
  if (p.plan_worry) out.push({ v: L('– Går inte att pröva', '– Cannot be tested'), c: 'na', parts: [q(p.plan_worry), L(' Ett omdöme som maskinen inte har något mått för.', ' A judgment the machine has no measure for.')] });
  return out;
}

/* ================= DOM-verktyg ================= */
const $ = id => document.getElementById(id);
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; }
function put(parent, nodes) { nodes.forEach(x => { if (x === null || x === undefined || x === '') return; parent.append(typeof x === 'string' ? document.createTextNode(x) : x); }); return parent; }
function partsTo(parent, parts) { parts.forEach(x => { if (typeof x === 'string') parent.append(document.createTextNode(x)); else if (x && x.q !== undefined) parent.append(el('q', 'hans', x.q === null ? '—' : x.q)); }); return parent; }
function stateNode(p) { const s = stateOf(p); const w = el('span', 'st ' + s.cls); w.append(el('span', 'sym', s.sym), document.createTextNode(stateWord(p))); return w; }

/* ================= grafer ================= */
const NS = 'http://www.w3.org/2000/svg';
const r1 = v => Math.round(v * 10) / 10;
function sv(tag, attrs, parent) { const e = document.createElementNS(NS, tag); if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
const pathD = pts => pts.map((p, i) => (i ? 'L' : 'M') + r1(p[0]) + ' ' + r1(p[1])).join('');
function skin(host) {
  const cs = getComputedStyle(host), v = k => cs.getPropertyValue(k).trim();
  return { paper: v('--paper') || '#fff', box: v('--box'), ink: v('--ink'), ink2: v('--ink-2'), ink3: v('--ink-3'), hair: v('--hair'), rule: v('--rule'), grid: v('--grid'),
    pos: v('--pos'), neg: v('--neg'), up: v('--c-up'), down: v('--c-down'), regel: v('--c-regel'), mal: v('--c-mal'), opt: v('--c-opt'), accent: v('--c-accent'),
    sma52: v('--c-sma52'), sma252: v('--c-sma252'), kanal: v('--c-kanal'), kanalkant: v('--c-kanalkant'), zon: v('--c-zon'), wash: v('--c-wash'), washNeg: v('--c-wash-neg'),
    optUt: v('--c-opt-ut'), optIn: v('--c-opt-in'), sans: v('--sans') || 'Arial, sans-serif', serif: v('--serif') || 'Georgia, serif' };
}
function stext(parent, sk, x, y, str, attrs) { const t = sv('text', Object.assign({ x: r1(x), y: r1(y), 'font-family': sk.sans, 'font-size': 11, fill: sk.ink3 }, attrs || {}), parent); t.textContent = str; return t; }
function halo(t, sk, w) { t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke', sk.paper); t.setAttribute('stroke-width', w || 4); t.setAttribute('stroke-linejoin', 'round'); return t; }
function niceStep(span, target) { const raw = span / target, p10 = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p10; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p10; }
function spreadYs(ys, gap) { const idx = ys.map((y, i) => [y, i]).sort((a, b) => a[0] - b[0]), out = ys.slice(); for (let k = 1; k < idx.length; k++) { const prev = out[idx[k - 1][1]]; if (out[idx[k][1]] - prev < gap) out[idx[k][1]] = prev + gap; } return out; }
const reduceMotion = (() => { try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
const drawn = new WeakSet();
function drawOnce(path, key) { if (reduceMotion || drawn.has(key)) return; drawn.add(key); try { path.style.setProperty('--len', path.getTotalLength()); path.classList.add('draw'); } catch (e) { /* mätning saknas */ } }
function tipFor(wrap) { let t = wrap.querySelector(':scope > .tip'); if (!t) { t = el('div', 'tip'); t.setAttribute('role', 'status'); wrap.append(t); } return t; }
function tipRow(t, label, val, color) { const r = el('div'); if (color) { const k = el('span', 'k'); k.style.borderTopColor = color; r.append(k); } r.append(el('b', null, val), document.createTextNode(' ' + label)); t.append(r); }
function placeTip(tip, wrap, xPix, top) {
  const w = tip.offsetWidth || 200, W = wrap.clientWidth;
  let left = xPix + 14; if (left + w > W) left = xPix - 14 - w;
  tip.style.left = Math.max(0, Math.min(W - w, left)) + 'px'; tip.style.top = (top || 0) + 'px';
}
/* hårkors som hittar X; pilarna gör samma sak från tangentbordet */
function crosshair(svg, wrap, W, o) {
  const cross = sv('line', { y1: o.y0, y2: o.y1, stroke: o.sk.ink2, 'stroke-width': 1, opacity: 0, 'pointer-events': 'none' }, svg);
  const dots = sv('g', { 'pointer-events': 'none' }, svg);
  const hit = sv('rect', { x: o.hx, y: o.y0, width: o.hw, height: o.y1 - o.y0, fill: 'transparent', tabindex: 0, 'aria-label': o.label, class: 'hit' }, svg);
  const tip = tipFor(wrap); let cur = o.start;
  function show(i) {
    cur = Math.max(0, Math.min(o.n - 1, i));
    const x = o.x(cur); cross.setAttribute('x1', r1(x)); cross.setAttribute('x2', r1(x)); cross.setAttribute('opacity', 1);
    while (dots.firstChild) dots.removeChild(dots.firstChild);
    (o.dots ? o.dots(cur) : []).forEach(([y, c]) => sv('circle', { cx: r1(x), cy: r1(y), r: 4, fill: c, stroke: o.sk.paper, 'stroke-width': 2 }, dots));
    tip.textContent = ''; o.fill(tip, cur); tip.classList.add('on');
    placeTip(tip, wrap, x / W * wrap.clientWidth, o.tipTop || 0);
  }
  const hide = () => { cross.setAttribute('opacity', 0); while (dots.firstChild) dots.removeChild(dots.firstChild); tip.classList.remove('on'); };
  hit.addEventListener('pointermove', e => { const r = svg.getBoundingClientRect(); show(o.iAt((e.clientX - r.left) * W / r.width)); });
  hit.addEventListener('pointerleave', hide); hit.addEventListener('blur', hide); hit.addEventListener('focus', () => show(cur));
  hit.addEventListener('keydown', e => {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft') { show(cur - step); e.preventDefault(); } else if (e.key === 'ArrowRight') { show(cur + step); e.preventDefault(); }
    else if (e.key === 'Home') { show(0); e.preventDefault(); } else if (e.key === 'End') { show(o.n - 1); e.preventDefault(); } else if (e.key === 'Escape') hide();
  });
  return { show, hide };
}

/* --- mätaren mot MSCI World (bild 01, tecknad i tidningens bläck) --- */
function gauge(host) {
  const sk = skin(host); host.textContent = '';
  const W = 264, H = 172, cx = 132, cy = 106, r = 92, lo = -0.10, hi = 0.30, a0 = 210, sweep = 240;
  const lead = P.ret - P.msci_ret;
  const ang = v => (a0 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * sweep) * Math.PI / 180;
  const pt = (v, rr) => [cx + rr * Math.cos(ang(v)), cy - rr * Math.sin(ang(v))];
  const arc = (v1, v2, rr) => { const [x1, y1] = pt(v1, rr), [x2, y2] = pt(v2, rr); const large = Math.abs(v2 - v1) / (hi - lo) * sweep > 180 ? 1 : 0; return `M${r1(x1)} ${r1(y1)} A${rr} ${rr} 0 ${large} ${v2 > v1 ? 1 : 0} ${r1(x2)} ${r1(y2)}`; };
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': L('Portföljen ', 'The portfolio ') + pctS(P.ret) + L(' mot MSCI World ', ' against MSCI World ') + pctS(P.msci_ret) + L(' med samma insats samma dagar; skillnad ', ' with the same money on the same days; difference ') + (pub() ? ppS(lead) : krS(P.excess_sek)) }, host);
  sv('path', { d: arc(lo, hi, r - 12), stroke: sk.hair, 'stroke-width': 6, fill: 'none' }, svg);
  for (let v = lo; v <= hi + 1e-9; v += 0.05) {
    const major = Math.abs(Math.round(v * 100)) % 10 === 0;
    const [x1, y1] = pt(v, r - 1), [x2, y2] = pt(v, r - (major ? 8 : 5));
    sv('line', { x1: r1(x1), y1: r1(y1), x2: r1(x2), y2: r1(y2), stroke: major ? sk.ink2 : sk.ink3, 'stroke-width': major ? 1.4 : 1 }, svg);
    if (major && v > lo + 1e-9 && v < hi - 1e-9) { const [tx, ty] = pt(v, r + 9); stext(svg, sk, tx, ty + 4, (v > 0.0001 ? '+' : '') + (Math.abs(v) < 1e-9 ? '0' : (v < 0 ? MINUS : '') + Math.round(Math.abs(v) * 100)), { 'text-anchor': 'middle', 'font-size': 10.5 }); }
  }
  sv('path', { d: arc(Math.min(P.msci_ret, P.ret), Math.max(P.msci_ret, P.ret), r - 12), stroke: lead >= 0 ? sk.up : sk.down, 'stroke-width': 6, fill: 'none' }, svg);
  const bA = ang(P.msci_ret), bx = cx + (r + 1) * Math.cos(bA), by = cy - (r + 1) * Math.sin(bA);
  const bug = sv('g', { transform: `translate(${r1(bx)} ${r1(by)}) rotate(${r1(-bA * 180 / Math.PI + 90)})` }, svg);
  sv('path', { d: 'M-6 -9 L6 -9 L6 -3 L0 3 L-6 -3 Z', fill: sk.ink2, stroke: sk.paper, 'stroke-width': 1.5 }, bug);
  const [nx, ny] = pt(P.ret, r - 22);
  sv('line', { x1: cx, y1: cy, x2: r1(nx), y2: r1(ny), stroke: sk.ink, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, svg);
  sv('circle', { cx, cy, r: 5, fill: sk.ink, stroke: sk.paper, 'stroke-width': 2 }, svg);
  stext(svg, sk, cx, cy + 36, pub() ? ppS(lead) : krS(P.excess_sek), { 'text-anchor': 'middle', 'font-family': sk.serif, 'font-size': 29, 'font-weight': 600, fill: sk.ink });
  stext(svg, sk, cx, cy + 56, pub() ? L('före MSCI World, samma insats', 'ahead of MSCI World, same money') : ppS(lead) + L(lead >= 0 ? ' före MSCI World' : ' efter MSCI World', lead >= 0 ? ' ahead of MSCI World' : ' behind MSCI World'), { 'text-anchor': 'middle', 'font-size': 11.5, fill: sk.ink2 });
  return svg;
}
function gaugeKeys(host) {
  const sk = skin(host); host.textContent = '';
  const k1 = el('span'); const s1 = sv('svg', { width: 18, height: 10 }); sv('line', { x1: 1, y1: 5, x2: 17, y2: 5, stroke: sk.ink, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, s1);
  k1.append(s1, document.createTextNode(L('Portföljen', 'Portfolio')), el('b', null, pctS(P.ret)));
  const k2 = el('span'); const s2 = sv('svg', { width: 14, height: 12 }); sv('path', { d: 'M2 1 L12 1 L12 6 L7 11 L2 6 Z', fill: sk.ink2 }, s2);
  k2.append(s2, document.createTextNode(pub() ? L('Samma insats i MSCI World', 'Same money in MSCI World') : L('Samma kronor i MSCI World', 'Same money in MSCI World')), el('b', null, pctS(P.msci_ret)));
  host.append(k1, k2);
}

/* --- kurvan: vad valen har gett utöver MSCI World (bild 04) --- */
function excess(host, opt) {
  opt = opt || {};
  const sk = skin(host); host.textContent = '';
  const nav = P.nav, Dd = nav.dates, N = Dd.length, pp = pub();
  const exK = nav.value.map((v, i) => v - nav.msci[i]);
  exK[N - 1] = P.value_sek - P.msci_shadow_sek; // sista punkten bär huvudets tal (en valutaögonblicksbild)
  const ex = pp ? exK.map((v, i) => v / nav.cost[i] * 100) : exK;
  const W = Math.max(280, host.clientWidth), padT = 16, padR = pp ? 64 : 80;
  const X = i => i / (N - 1) * (W - padR);
  const buys = POS.map(p => ({ p, i: Dd.indexOf(p.entry_date) })).filter(b => b.i >= 0).sort((a, b) => a.i - b.i);
  const groups = []; buys.forEach(b => { const g = groups[groups.length - 1]; if (g && X(b.i) - X(g[g.length - 1].i) < 12) g.push(b); else groups.push([b]); });
  const rowEnd = [-1e9, -1e9, -1e9], labels = [];
  groups.forEach(g => {
    const t = g.map(b => TINY[b.p.id]).join(', '), w = t.length * 6.1, xa = X(g[0].i), xb = X(g[g.length - 1].i);
    const fits = xa + w <= W, x0 = fits ? xa : xb - w; let rr = rowEnd.findIndex(e => e < x0 - 8); if (rr < 0) rr = 2; rowEnd[rr] = x0 + w;
    labels.push({ g, t, rr, ax: fits ? xa : xb, anchor: fits ? 'start' : 'end' });
  });
  const rows = Math.max(1, ...labels.map(b => b.rr + 1)), padB = 22 + rows * 12, H = (opt.height || 190) + rows * 12;
  const lo = Math.min(...ex), hi = Math.max(...ex), span = Math.max(Math.abs(lo), Math.abs(hi));
  const ymin = Math.min(lo * 1.18, -span * 0.25), ymax = Math.max(hi * 1.18, span * 0.25);
  const Y = v => padT + (ymax - v) / (ymax - ymin) * (H - padT - padB);
  const fmtV = v => (pp ? sgn(v, Math.abs(v) < 10 ? 1 : 0) + NB + 'pp' : krS(v));
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, height: H, role: 'img', 'aria-label': (pp ? L('Försprånget mot MSCI World i procentenheter, dag för dag; i dag ', 'Lead over MSCI World in percentage points, day by day; today ') : L('Kronor över eller under MSCI World, dag för dag; i dag ', 'SEK above or below MSCI World, day by day; today ')) + fmtV(ex[N - 1]) }, host);
  const step = niceStep(ymax - ymin, 4);
  for (let v = Math.ceil(ymin / step) * step; v <= ymax + 1e-9; v += step) {
    const yy = Y(v), zero = Math.abs(v) < step / 1e6;
    sv('line', { x1: 0, x2: W - padR + 6, y1: r1(yy), y2: r1(yy), stroke: zero ? sk.rule : sk.grid, 'stroke-width': 1 }, svg);
    stext(svg, sk, W, yy + 4, zero ? (pp ? '0 pp' : L('0 kr', 'SEK 0')) : fmtV(v), { 'text-anchor': 'end', 'font-size': 11 });
  }
  halo(stext(svg, sk, 2, Y(0) - 6, L('lika med MSCI World', 'even with MSCI World'), { 'font-size': 11 }), sk);
  const pts = ex.map((v, i) => [X(i), Y(v)]);
  const area = 'M' + r1(X(0)) + ' ' + r1(Y(0)) + 'L' + pts.map(q => r1(q[0]) + ' ' + r1(q[1])).join('L') + 'L' + r1(X(N - 1)) + ' ' + r1(Y(0)) + 'Z';
  const id = 'ex' + Math.random().toString(36).slice(2, 7), defs = sv('defs', {}, svg);
  const cu = sv('clipPath', { id: id + 'u' }, defs); sv('rect', { x: 0, y: 0, width: W, height: r1(Y(0)) }, cu);
  const cd = sv('clipPath', { id: id + 'd' }, defs); sv('rect', { x: 0, y: r1(Y(0)), width: W, height: H }, cd);
  sv('path', { d: area, fill: sk.wash, 'clip-path': `url(#${id}u)` }, svg);
  sv('path', { d: area, fill: sk.washNeg, 'clip-path': `url(#${id}d)` }, svg);
  const line = sv('path', { d: pathD(pts), fill: 'none', stroke: sk.accent, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
  drawOnce(line, host);
  sv('line', { x1: 0, x2: W - padR, y1: H - padB, y2: H - padB, stroke: sk.rule, 'stroke-width': 1 }, svg);
  labels.forEach(b => {
    b.g.forEach(x => sv('line', { x1: r1(X(x.i)), x2: r1(X(x.i)), y1: H - padB - 5, y2: H - padB + 4, stroke: sk.ink2, 'stroke-width': 1.25 }, svg));
    stext(svg, sk, b.ax, H - padB + 15 + b.rr * 12, b.t, { 'font-size': 11, fill: sk.ink2, 'text-anchor': b.anchor });
  });
  stext(svg, sk, 2, padT + 8, Dd[0].slice(0, 4), { 'font-size': 11 });
  Dd.forEach((d, i) => { if (i > 0 && d.slice(0, 4) !== Dd[i - 1].slice(0, 4)) { sv('line', { x1: r1(X(i)), x2: r1(X(i)), y1: padT - 2, y2: H - padB, stroke: sk.grid, 'stroke-width': 1 }, svg); stext(svg, sk, X(i) + 4, padT + 8, d.slice(0, 4), { 'font-size': 11 }); } });
  const li = N - 1, mi = ex.indexOf(Math.min(...ex));
  sv('circle', { cx: r1(pts[li][0]), cy: r1(pts[li][1]), r: 4, fill: sk.accent, stroke: sk.paper, 'stroke-width': 2 }, svg);
  stext(svg, sk, pts[li][0] + 8, pts[li][1] + 4, fmtV(ex[li]), { 'font-family': sk.serif, 'font-size': 14, 'font-weight': 600, fill: sk.ink });
  if (ex[mi] < 0) {
    sv('circle', { cx: r1(pts[mi][0]), cy: r1(pts[mi][1]), r: 3.5, fill: sk.paper, stroke: sk.ink3, 'stroke-width': 1.5 }, svg);
    halo(stext(svg, sk, pts[mi][0] - 7, pts[mi][1] + 4, fmtV(ex[mi]) + ', ' + dS(Dd[mi]), { 'font-size': 11, 'text-anchor': 'end' }), sk);
  }
  crosshair(svg, host, W, {
    sk, n: N, start: N - 1, x: i => X(i), y0: padT, y1: H - padB, hx: 0, hw: W - padR + 16, tipTop: -6,
    label: L('Läs av dag för dag med pekaren eller piltangenterna', 'Read day by day with the pointer or arrow keys'),
    iAt: xx => Math.round(xx / (W - padR) * (N - 1)),
    dots: i => [[Y(ex[i]), sk.accent]],
    fill: (t, i) => {
      const last = i === N - 1, val = last ? P.value_sek : nav.value[i], ms = last ? P.msci_shadow_sek : nav.msci[i], cost = nav.cost[i];
      t.append(el('div', 'd', dSY(Dd[i])));
      if (pp) {
        tipRow(t, L('före MSCI World', 'ahead of MSCI World'), fmtV(ex[i]), sk.accent);
        tipRow(t, L('portföljen på insatsen', 'portfolio on the money in'), pctS(val / cost - 1));
        tipRow(t, L('MSCI World på samma insats', 'MSCI World on the same money'), pctS(ms / cost - 1));
      } else {
        tipRow(t, L('mot MSCI World', 'against MSCI World'), krS(ex[i]), sk.accent);
        tipRow(t, L('dina köp', 'your holdings'), kr(val));
        tipRow(t, L('samma kronor i MSCI World', 'same money in MSCI World'), kr(ms));
        tipRow(t, L('insatt', 'invested'), kr(cost));
      }
      const b = POS.filter(p => p.entry_date === Dd[i]); if (b.length) t.append(el('div', null, L('Köp: ', 'Bought: ') + b.map(p => nm(p)).join(', ')));
    },
  });
  return svg;
}

/* --- staplarna: varje position mot samma kronor i MSCI World (bild 03) --- */
function bars(host) {
  const sk = skin(host); host.textContent = '';
  const pp = pub(), val = p => (pp ? p.excess_sek / P.cost_sek : p.excess_sek);
  const rows = POS.slice().sort((a, b) => val(b) - val(a));
  const lo = Math.min(0, ...rows.map(val)), hi = Math.max(0, ...rows.map(val)), span = (hi - lo) || 1;
  const wrap = el('div', 'bars'); host.append(wrap);
  const tip = tipFor(host);
  rows.forEach(p => {
    const v = val(p), row = el('div', 'barrow');
    row.tabIndex = 0;
    const s = sv('svg', { viewBox: '0 0 100 14', preserveAspectRatio: 'none', role: 'img', 'aria-label': nm(p) + ' ' + (pp ? ppS(v) : krS(v)) });
    const zero = (0 - lo) / span * 100, w = Math.abs(v) / span * 100;
    sv('line', { x1: r1(zero), x2: r1(zero), y1: 0, y2: 14, stroke: sk.ink3, 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }, s);
    sv('rect', { x: r1(v >= 0 ? zero : zero - w), y: 3, width: r1(Math.max(0.6, w)), height: 8, rx: 1.5, fill: v >= 0 ? sk.up : sk.down }, s);
    row.append(el('span', null, nm(p)), s, el('span', 'v', pp ? ppS(v) : krS(v)));
    const show = () => {
      tip.textContent = ''; tip.append(el('div', 'd', nm(p)));
      tipRow(tip, pp ? L('av hela insatsen', 'of the whole stake') : L('mot MSCI World', 'against MSCI World'), pp ? ppS(v) : krS(v), v >= 0 ? sk.up : sk.down);
      tipRow(tip, L('positionen sedan köpet', 'the position since purchase'), pctS(p.ret));
      tipRow(tip, L('MSCI World samma dag', 'MSCI World from the same day'), pctS(p.msci_ret));
      tip.classList.add('on'); placeTip(tip, host, row.offsetLeft + row.offsetWidth * 0.5, row.offsetTop + row.offsetHeight + 4);
    };
    const hide = () => tip.classList.remove('on');
    row.addEventListener('pointerenter', show); row.addEventListener('pointerleave', hide); row.addEventListener('focus', show); row.addEventListener('blur', hide);
    wrap.append(row);
  });
  return wrap;
}
function barsNote() {
  return pub()
    ? L('Bidrag till försprånget i procentenheter av hela insatsen. Summa ' + ppS(P.excess_sek / P.cost_sek) + '. Sålda positioner ingår inte.', 'Contribution to the lead in percentage points of the whole stake. Total ' + ppS(P.excess_sek / P.cost_sek) + '. Sold positions are not included.')
    : L('Samma kronor som varje köp kostade, köpta samma dag i MSCI World (URTH i kronor). Summa ' + krS(P.excess_sek) + '. Sålda positioner ingår inte.', 'The amount each purchase cost, invested the same day in MSCI World (URTH converted to SEK). Total ' + krS(P.excess_sek) + '. Sold positions are not included.');
}

/* --- gnistan i puffarna --- */
function spark(host, p) {
  const sk = skin(host); host.textContent = '';
  const W = Math.max(120, host.clientWidth || 200), H = 32;
  const svg = sv('svg', { class: 'spark', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': p.chart + L(', 120 dagar, regelnivå ', ', 120 days, rule level ') + px(p.rule.level) }, host);
  const c = p.series.d_close.slice(-120), lo = Math.min(...c, p.rule.level), hi = Math.max(...c, p.rule.level);
  const x = i => 1 + i * (W - 6) / (c.length - 1), y = v => 3 + (H - 6) * (1 - (v - lo) / (hi - lo || 1));
  sv('line', { x1: 0, x2: W, y1: r1(y(p.rule.level)), y2: r1(y(p.rule.level)), stroke: sk.regel, 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
  sv('path', { d: pathD(c.map((v, i) => [x(i), y(v)])), fill: 'none', stroke: sk.ink, 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
  sv('circle', { cx: r1(x(c.length - 1)), cy: r1(y(c[c.length - 1])), r: 3, fill: sk.ink, stroke: sk.paper, 'stroke-width': 2 }, svg);
}

/* --- den stora positionsgrafen (bild 02 och 06): ljus, SMA, kanal, nivåer, köp, solfjäder --- */
const ZQ = { q5: -1.6448536, q25: -0.6744898, q50: 0, q75: 0.6744898, q95: 1.6448536 };
function fanFn(p) {
  const o = p.oiret, S0 = p.chart_px, sig = o.sigma, mu = Math.log(1 + o.er) - sig * sig / 2, q12 = o.quantiles_12m;
  const q = (k, t) => (t <= 0 ? S0 : S0 * Math.exp(mu * t + ZQ[k] * sig * Math.sqrt(t)) * Math.pow(q12[k] / (S0 * Math.exp(mu + ZQ[k] * sig)), t));
  const E = t => S0 * Math.pow(o.target_12m / S0, t);
  return { q, E, q12 };
}
function chartLegend(host, p) {
  const sk = skin(host); host.textContent = '';
  const line = (c, w, dash) => { const s = sv('svg', { width: 20, height: 10 }); sv('line', { x1: 1, y1: 5, x2: 19, y2: 5, stroke: c, 'stroke-width': w, 'stroke-dasharray': dash || null }, s); return s; };
  const box = (c, c2) => { const s = sv('svg', { width: 14, height: 10 }); sv('rect', { x: 0, y: 0, width: 14, height: 10, fill: c }, s); if (c2) sv('rect', { x: 0, y: 3, width: 14, height: 4, fill: c2 }, s); return s; };
  const candle = () => { const s = sv('svg', { width: 16, height: 12 }); sv('line', { x1: 4, x2: 4, y1: 0, y2: 12, stroke: sk.up }, s); sv('rect', { x: 2, y: 3, width: 4, height: 6, fill: sk.paper, stroke: sk.up }, s); sv('line', { x1: 12, x2: 12, y1: 0, y2: 12, stroke: sk.down }, s); sv('rect', { x: 10, y: 2, width: 4, height: 7, fill: sk.down }, s); return s; };
  const add = (svgEl, text) => { const s = el('span'); s.append(svgEl, document.createTextNode(text)); host.append(s); };
  add(candle(), L('Kurs, dag (ihålig upp, fylld ned)', 'Price, daily (hollow up, filled down)'));
  add(line(sk.sma52, 1.5), 'SMA 52'); add(line(sk.sma252, 1.5), 'SMA 252');
  if (regD(p)) add(box(sk.kanal), LV('Kanal från ditt ankare, ±2σ', 'Kanal från ankaret, ±2σ', 'Channel from your anchor, ±2σ', 'Channel from the anchor, ±2σ'));
  add(line(sk.regel, 1.6), LV('Din regel', 'Regeln', 'Your rule', 'The rule'));
  if (ok(p.target)) add(line(sk.mal, 1.6), LV('Ditt mål', 'Målet', 'Your target', 'The target'));
  if (hasOpt(p)) {
    add(box(sk.optUt, sk.optIn), L('Optionerna om 12 mån: hälften och 90 % av utfallen', 'Options in 12 months: half and 90% of outcomes'));
    const s = sv('svg', { width: 12, height: 12 }); sv('path', { d: 'M6 0.5 L11.5 6 L6 11.5 L0.5 6 Z', fill: sk.opt }, s); add(s, L('Förväntat pris', 'Expected price'));
  } else add(box(sk.kanal), L('Vanlig svängning 21 dagar, ±1 och ±2σ', 'Ordinary swings, 21 days, ±1 and ±2σ'));
}
function positionChart(host, p, opt) {
  opt = opt || {};
  const sk = skin(host); host.textContent = '';
  const s = p.series, o = p.oiret || {}, fan = hasOpt(p) ? fanFn(p) : null;
  const W = Math.max(320, host.clientWidth), small = W < 720;
  const H = opt.height || (small ? 360 : 450);
  const m = { l: small ? 4 : 8, r: small ? 58 : 74, t: 24, b: 28 };
  const total = s.d_dates.length, N = Math.min(small ? 110 : 180, total), off = total - N;
  const pw = W - m.l - m.r, histW = pw * (fan ? (small ? 0.6 : 0.68) : 0.8), futW = pw - histW;
  const xi = i => m.l + (i + 0.5) * histW / N;
  const T = fan ? 1 : 21 / 252;
  const xf = t => m.l + histW + (t / T) * futW;
  const S0 = p.chart_px, sigD = p.vol60_ann / Math.sqrt(252);
  const noise = (z, t) => S0 * Math.exp(z * sigD * Math.sqrt(t * 252));
  const rd = regD(p), rw = regW(p), other = otherLevel(p);
  const allD = s.d_dates;
  // kanalens värde per handelsdag: rak linje från start_line vid start till line i dag
  const chanVal = (r, i) => { const a = allD.findIndex(d => d >= r.channel.start); if (a < 0) return null; const span = Math.max(1, total - 1 - a); return { a, v: r.channel.start_line + (r.channel.line - r.channel.start_line) * (i - a) / span }; };
  const wTime = r => { const ta = D(r.channel.start).getTime(), tN = D(allD[total - 1]).getTime(); return i => r.channel.start_line + (r.channel.line - r.channel.start_line) * (D(allD[i]).getTime() - ta) / (tN - ta); };
  // y-skalan bär barerna, SMA, nivåerna, målet, dagskanalen och solfjäderns mittersta hälft
  const vals = [];
  for (let i = off; i < total; i++) [s.d_high[i], s.d_low[i]].forEach(v => ok(v) && vals.push(v));
  // SMA bär skalan bara nära kursen; en SMA 252 långt under (en aktie som dubblats) ritas men klipps
  const hiBar = Math.max(...vals), loBar = Math.min(...vals);
  ['52', '252'].forEach(k => { for (let i = off; i < total; i++) { const v = s.d_sma[k][i]; if (ok(v) && v >= loBar * 0.88 && v <= hiBar * 1.12) vals.push(v); } });
  vals.push(p.rule.level); if (ok(p.target)) vals.push(p.target); if (other && Math.abs(other.level / S0 - 1) < 0.35) vals.push(other.level);
  if (rd) { const a = Math.max(chanVal(rd, off).a, off); [a, total - 1].forEach(i => { const c = chanVal(rd, i).v; vals.push(c + 2 * rd.channel.sd, c - 2 * rd.channel.sd); }); }
  if (fan) vals.push(fan.q12.q25, fan.q12.q75, o.target_12m); else vals.push(noise(2, T), noise(-2, T));
  const lo = Math.min(...vals) * 0.965, hi = Math.max(...vals) * 1.035;
  const Y = v => m.t + (H - m.t - m.b) * (1 - (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)));
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, height: H, role: 'img', 'aria-label': p.chart + ': ' + L('kurs ', 'price ') + px(S0) + ', ' + L('regelnivå ', 'rule level ') + px(p.rule.level) + (ok(p.target) ? ', ' + L('mål ', 'target ') + tal(p.target) : '') + (fan ? ', ' + L('optionernas förväntade pris om ett år ', "options' expected price in a year ") + px(o.target_12m) : '') }, host);
  const id = 'pc' + Math.random().toString(36).slice(2, 7), defs = sv('defs', {}, svg);
  const cp = sv('clipPath', { id: id + 'c' }, defs); sv('rect', { x: m.l, y: m.t, width: pw, height: H - m.t - m.b }, cp);
  const plot = sv('g', { 'clip-path': `url(#${id}c)` }, svg);
  sv('rect', { x: r1(m.l + histW), y: m.t, width: r1(futW), height: H - m.t - m.b, fill: sk.zon }, svg);
  // rutnät och axel till höger
  // axeltal som skulle hamna under en skylt (nivå, mål, förväntat, kurs) ritas inte
  const plateYs = [p.rule.level, ok(p.target) ? p.target : null, fan ? o.target_12m : null, S0].filter(ok).map(Y);
  const step = niceStep(hi - lo, small ? 4 : 6);
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
    const y = Y(v); if (y < m.t + 6 || y > H - m.b - 4) continue;
    sv('line', { x1: m.l, x2: m.l + pw, y1: r1(y), y2: r1(y), stroke: sk.grid, 'stroke-width': 1 }, svg);
    if (!plateYs.some(py => Math.abs(py - y) < 13)) stext(svg, sk, m.l + pw + 8, y + 4, num(v, step < 1 ? 1 : 0), { 'font-size': 11 });
  }
  // månader under historiken, framtiden under zonen
  let lastM = -1, lastX = -99;
  for (let i = 0; i < N; i++) {
    const dd = D(allD[off + i]), mo = dd.getUTCMonth();
    if (mo !== lastM) { const x = xi(i) - 0.5 * histW / N; if (lastM !== -1 && x - lastX > (small ? 34 : 28) && x < m.l + histW - 24) { sv('line', { x1: r1(x), x2: r1(x), y1: H - m.b, y2: H - m.b + 4, stroke: sk.rule }, svg); stext(svg, sk, x, H - 9, MON[state.lang][mo] + (mo === 0 ? ' ' + String(dd.getUTCFullYear()).slice(2) : ''), { 'text-anchor': 'middle', 'font-size': 10.5 }); lastX = x; } lastM = mo; }
  }
  const fticks = fan ? (futW < 170 ? [[0.5, L('+6 mån', '+6 mo')], [1, L('+12 mån', '+12 mo')]] : [[0.25, L('+3 mån', '+3 mo')], [0.5, L('+6 mån', '+6 mo')], [0.75, L('+9 mån', '+9 mo')], [1, L('+12 mån', '+12 mo')]])
    : [[5 / 252, L('1 v', '1 wk')], [10 / 252, L('2 v', '2 wk')], [15 / 252, L('3 v', '3 wk')], [21 / 252, L('21 d', '21 d')]].filter((x, k) => futW >= 170 || k % 2 === 1);
  fticks.forEach(([t, lab]) => stext(svg, sk, xf(t), H - 9, lab, { 'text-anchor': t >= T - 1e-9 ? 'end' : 'middle', 'font-size': 10.5 }));
  // kanalerna
  if (rd) {
    const a = Math.max(chanVal(rd, off).a, off), up = [], dn = [], mid = [], sd2 = 2 * rd.channel.sd;
    for (let i = a; i < total; i++) { const v = chanVal(rd, i).v, x = xi(i - off); up.push([x, Y(v + sd2)]); dn.push([x, Y(Math.max(1e-6, v - sd2))]); mid.push([x, Y(v)]); }
    sv('path', { d: pathD(up) + pathD(dn.slice().reverse()).replace('M', 'L') + 'Z', fill: sk.kanal }, plot);
    [up, dn].forEach(pts => sv('path', { d: pathD(pts), fill: 'none', stroke: sk.kanalkant, 'stroke-width': 1 }, plot));
    sv('path', { d: pathD(mid), fill: 'none', stroke: sk.kanalkant, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, plot);
  }
  if (rw && (!rd || Math.abs(rw.anchor - rd.anchor) > 1e-9)) {
    const f = wTime(rw), sd2 = 2 * rw.channel.sd, up = [], dn = [];
    for (let i = off; i < total; i++) { const v = f(i), x = xi(i - off); up.push([x, Y(v + sd2)]); if (v - sd2 > 0) dn.push([x, Y(v - sd2)]); }
    [up, dn].forEach(pts => pts.length > 1 && sv('path', { d: pathD(pts), fill: 'none', stroke: sk.kanalkant, 'stroke-width': 1, 'stroke-dasharray': '6 4' }, plot));
    // etiketten bara när kursen faktiskt står vid kanten (rubriken kan bygga på den)
    const yEdge = dn.length ? dn[dn.length - 1][1] : null;
    if (rw.channel.z <= -1.5 && yEdge !== null && yEdge > m.t + 10 && yEdge < H - m.b - 6) halo(stext(svg, sk, m.l + histW - 6, yEdge + 14, L('veckokanalens nedre kant', 'lower edge, weekly channel'), { 'text-anchor': 'end', 'font-size': 10.5, fill: sk.ink2 }), sk);
  }
  // solfjädern eller bruset
  const K = 48, TT = [...Array(K + 1).keys()].map(k => k / K * T);
  const band = (fa, fb, fill) => sv('path', { d: pathD(TT.map(t => [xf(t), Y(fb(t))])) + pathD(TT.slice().reverse().map(t => [xf(t), Y(fa(t))])).replace('M', 'L') + 'Z', fill }, plot);
  if (fan) {
    band(t => fan.q('q5', t), t => fan.q('q95', t), sk.optUt);
    band(t => fan.q('q25', t), t => fan.q('q75', t), sk.optIn);
    sv('path', { d: pathD(TT.map(t => [xf(t), Y(fan.q('q50', t))])), fill: 'none', stroke: sk.opt, 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.85 }, plot);
    sv('path', { d: pathD(TT.map(t => [xf(t), Y(fan.E(t))])), fill: 'none', stroke: sk.opt, 'stroke-width': 1.6 }, plot);
  } else {
    band(t => noise(-2, t), t => noise(2, t), sk.kanal);
    band(t => noise(-1, t), t => noise(1, t), sk.kanal);
  }
  // SMA
  ['252', '52'].forEach(k => { const pts = []; for (let i = 0; i < N; i++) { const v = s.d_sma[k][off + i]; if (ok(v)) pts.push([xi(i), Y(v)]); } if (pts.length > 1) sv('path', { d: pathD(pts), fill: 'none', stroke: k === '52' ? sk.sma52 : sk.sma252, 'stroke-width': 1.5, 'stroke-linejoin': 'round' }, plot); });
  // ljusen: ihåliga uppåt, fyllda nedåt
  const bw = Math.max(1.4, Math.min(6, histW / N * 0.62));
  for (let i = 0; i < N; i++) {
    const j = off + i, O = s.d_open[j], Hh = s.d_high[j], Lo = s.d_low[j], C = s.d_close[j];
    if (![O, Hh, Lo, C].every(ok)) continue;
    const up = C >= O, col = up ? sk.up : sk.down, x = xi(i);
    sv('line', { x1: r1(x), x2: r1(x), y1: r1(Y(Hh)), y2: r1(Y(Lo)), stroke: col, 'stroke-width': 1 }, plot);
    const y1 = Y(Math.max(O, C)), y2 = Y(Math.min(O, C));
    sv('rect', { x: r1(x - bw / 2), y: r1(y1), width: r1(bw), height: r1(Math.max(1, y2 - y1)), fill: up ? sk.paper : col, stroke: col, 'stroke-width': up ? 1 : 0 }, plot);
  }
  // nivåerna: regeln och målet heldragna, den andra nivån streckad
  const plates = [];
  const hline = (v, col, w, dash, label, plate) => {
    if (!ok(v)) return; const y = Y(v); if (y < m.t || y > H - m.b) return;
    sv('line', { x1: m.l, x2: m.l + pw, y1: r1(y), y2: r1(y), stroke: col, 'stroke-width': w, 'stroke-dasharray': dash || null }, svg);
    if (label) halo(stext(svg, sk, m.l + 6, y - 6, label, { fill: col, 'font-size': 11.5, 'font-weight': 600 }), sk);
    if (plate) plates.push({ y, text: tal(v), color: col });
  };
  if (other && Math.abs(other.level / S0 - 1) < 0.35) hline(other.level, sk.regel, 1, '5 4', (other.tf === '4H' ? L('4H-varning ', '4H warning ') : L('dagsnivå ', 'daily level ')) + px(other.level), false);
  hline(p.rule.level, sk.regel, 1.6, null, LV('din regel ', 'regeln ', 'your rule ', 'the rule ') + px(p.rule.level) + ': ' + ruleWords(p, false), true);
  if (ok(p.target)) hline(p.target, sk.mal, 1.6, null, LV('ditt mål ', 'målet ', 'your target ', 'the target ') + tal(p.target), true);
  // ankaret
  if (rd) {
    const ai = allD.findIndex(d => d >= rd.channel.start);
    if (ai >= off) {
      const ax = xi(ai - off), ay = Y(rd.anchor), below = /low/i.test(rd.label || '');
      sv('circle', { cx: r1(ax), cy: r1(ay), r: 4.5, fill: sk.paper, stroke: sk.mal, 'stroke-width': 2 }, svg);
      // under en botten när det finns plats, annars till höger om punkten; över en topp
      const ly = below ? (ay + 16 < H - m.b - 4 ? ay + 16 : ay + 4) : (ay - 8 > m.t + 10 ? ay - 8 : ay + 4), lx = below && ay + 16 >= H - m.b - 4 ? ax + 9 : ax + 8;
      halo(stext(svg, sk, lx, ly, LV('ditt ankare ', 'ankaret ', 'your anchor ', 'the anchor ') + px(rd.anchor), { fill: sk.mal, 'font-size': 11, 'font-weight': 600 }), sk);
    }
  }
  // köpet
  const ei = allD.indexOf(p.entry_date);
  if (ei >= off) {
    const x = xi(ei - off), yb = Y(s.d_low[ei]) + 6, mine = p.chart === p.held;
    sv('path', { d: `M${r1(x)} ${r1(yb)} l-5 9 h10 z`, fill: sk.mal }, svg);
    const txt = mine ? L('köp ', 'buy ') + px(p.entry_px) : L('köp ' + short(p.held) + ' ' + px(p.entry_px) + ' euro', 'buy ' + short(p.held) + ' EUR ' + px(p.entry_px));
    const right = x > m.l + histW - 110;
    halo(stext(svg, sk, right ? x - 8 : x + 8, yb + 9, txt, { fill: sk.mal, 'font-size': 11, 'font-weight': 600, 'text-anchor': right ? 'end' : 'start' }), sk);
  }
  // i dag
  sv('line', { x1: r1(m.l + histW), x2: r1(m.l + histW), y1: m.t - 6, y2: H - m.b, stroke: sk.rule, 'stroke-width': 1 }, svg);
  stext(svg, sk, m.l + histW - 6, m.t - 8, L('i dag', 'today'), { 'font-size': 11, fill: sk.ink2, 'text-anchor': 'end' });
  stext(svg, sk, m.l + pw, m.t - 8, fan ? L('Om 12 månader, enligt optionerna', '12 months ahead, per the options') : L('Vanlig svängning, ingen prognos', 'Ordinary swings, not a forecast'), { 'font-size': 11, fill: sk.ink2, 'text-anchor': 'end' });
  sv('line', { x1: r1(xi(N - 1)), x2: r1(m.l + histW), y1: r1(Y(S0)), y2: r1(Y(S0)), stroke: sk.ink3, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, svg);
  // optionernas tal
  if (fan) {
    const xe = xf(1), ye = Y(o.target_12m);
    sv('path', { d: `M${r1(xe)} ${r1(ye - 7)} l7 7 l-7 7 l-7 -7 z`, fill: sk.opt, stroke: sk.paper, 'stroke-width': 2 }, svg);
    plates.push({ y: ye, text: px(o.target_12m), color: sk.opt });
    const lab = L('förväntat ', 'expected ') + px(o.target_12m) + ', ' + pctS(o.er) + ' (' + oiNote(o, true) + ')';
    halo(stext(svg, sk, xe - 12, ye - 10, lab, { 'text-anchor': 'end', 'font-size': 11, 'font-weight': 600, fill: sk.ink }), sk);
    const q = fan.q12;
    if (Y(q.q95) < m.t + 4) stext(svg, sk, xe - 4, m.t + 12, L('5 % chans över ', '5% chance above ') + pxq(q.q95) + ' ↑', { 'text-anchor': 'end', 'font-size': 10.5 });
    else halo(stext(svg, sk, xe - 4, Y(q.q95) - 4, L('5 % över ', '5% above ') + pxq(q.q95), { 'text-anchor': 'end', 'font-size': 10.5 }), sk);
    if (Y(q.q5) > H - m.b - 4) stext(svg, sk, xe - 4, H - m.b - 6, L('5 % chans under ', '5% chance below ') + pxq(q.q5) + ' ↓', { 'text-anchor': 'end', 'font-size': 10.5 });
    else halo(stext(svg, sk, xe - 4, Y(q.q5) + 13, L('5 % under ', '5% below ') + pxq(q.q5), { 'text-anchor': 'end', 'font-size': 10.5 }), sk);
  } else {
    halo(stext(svg, sk, m.l + histW + 8, m.t + 14, L('Inga optioner hos datakällan', 'No options at the data source'), { 'font-size': 10.5, fill: sk.ink2 }), sk);
  }
  // skyltar i högermarginalen: nivåerna, förväntat pris och dagens kurs, knuffade isär
  plates.push({ y: Y(S0), text: px(S0), color: sk.ink, now: true });
  plates.sort((a, b) => a.y - b.y); for (let i = 1; i < plates.length; i++) if (plates[i].y - plates[i - 1].y < 18) plates[i].y = plates[i - 1].y + 18;
  plates.forEach(pl => {
    const g = sv('g', {}, svg), w = m.r - 6;
    sv('rect', { x: r1(m.l + pw + 3), y: r1(pl.y - 9), width: w, height: 18, rx: 2, fill: pl.now ? sk.ink : sk.paper, stroke: pl.color, 'stroke-width': 1.2 }, g);
    stext(g, sk, m.l + pw + 3 + w / 2, pl.y + 4.5, pl.text, { 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 600, fill: pl.now ? sk.paper : sk.ink });
  });
  // läsning: historiken dag för dag, framtiden månad för månad
  const nFut = fan ? 12 : 4, futT = k => (fan ? (k + 1) / 12 : [5, 10, 15, 21][k] / 252);
  crosshair(svg, host, W, {
    sk, n: N + nFut, start: N - 1, y0: m.t, y1: H - m.b, hx: m.l, hw: pw, tipTop: 8,
    label: L('Läs av grafen med pekaren eller piltangenterna', 'Read the chart with the pointer or arrow keys'),
    x: k => (k < N ? xi(k) : xf(futT(k - N))),
    iAt: xx => { if (xx <= m.l + histW) return Math.max(0, Math.min(N - 1, Math.round((xx - m.l) / (histW / N) - 0.5))); let best = N, bd = 1e9; for (let k = 0; k < nFut; k++) { const d = Math.abs(xf(futT(k)) - xx); if (d < bd) { bd = d; best = N + k; } } return best; },
    dots: k => (k < N ? [[Y(s.d_close[off + k]), sk.ink]] : fan ? [[Y(fan.E(futT(k - N))), sk.opt]] : []),
    fill: (t, k) => {
      if (k < N) {
        const j = off + k;
        t.append(el('div', 'd', cap(wd(allD[j])) + ' ' + dSY(allD[j])));
        tipRow(t, L('stängning', 'close'), px(s.d_close[j]), sk.ink);
        tipRow(t, L('öppning', 'open'), px(s.d_open[j]));
        tipRow(t, L('högsta', 'high'), px(s.d_high[j]));
        tipRow(t, L('lägsta', 'low'), px(s.d_low[j]));
        tipRow(t, 'SMA 52', px(s.d_sma['52'][j]), sk.sma52);
        tipRow(t, 'SMA 252', px(s.d_sma['252'][j]), sk.sma252);
        if (rd) { const c = chanVal(rd, j); if (c && j >= c.a) tipRow(t, L('kanalens mitt', 'channel midline'), px(c.v), sk.kanalkant); }
      } else if (fan) {
        const mth = k - N + 1, tt = mth / 12, dd = D(ASOF); dd.setUTCMonth(dd.getUTCMonth() + mth);
        t.append(el('div', 'd', L('Om ' + mth + ' mån, ' + MON.sv[dd.getUTCMonth()] + ' ' + dd.getUTCFullYear() + ', enligt optionerna', 'In ' + mth + ' mo, ' + MON.en[dd.getUTCMonth()] + ' ' + dd.getUTCFullYear() + ', per the options')));
        tipRow(t, L('förväntat', 'expected'), px(fan.E(tt)), sk.opt);
        tipRow(t, L('median', 'median'), px(fan.q('q50', tt)));
        tipRow(t, L('hälften av utfallen', 'half of outcomes'), px(fan.q('q25', tt)) + '–' + px(fan.q('q75', tt)));
        tipRow(t, L('90 % av utfallen', '90% of outcomes'), px(fan.q('q5', tt)) + '–' + px(fan.q('q95', tt)));
      } else {
        const dN = [5, 10, 15, 21][k - N], tt = dN / 252;
        t.append(el('div', 'd', L('Om ' + dN + ' handelsdagar, vanlig svängning', 'In ' + dN + ' trading days, ordinary swings')));
        tipRow(t, L('±1 standardavvikelse', '±1 standard deviation'), px(noise(-1, tt)) + '–' + px(noise(1, tt)));
        tipRow(t, L('±2 standardavvikelser', '±2 standard deviations'), px(noise(-2, tt)) + '–' + px(noise(2, tt)));
      }
    },
  });
  return { svg, N, off };
}
function chartCaption(p) {
  const o = p.oiret || {}, d = ruleDist(p), parts = [];
  parts.push(L('Så läser du grafen. ', 'How to read the chart. '));
  parts.push(L('Kursen ' + px(p.chart_px) + ' ligger ' + pctU(Math.abs(d)) + (d >= 0 ? ' över ' : ' under ') + 'regelnivån', 'The price of ' + px(p.chart_px) + ' is ' + pctU(Math.abs(d)) + (d >= 0 ? ' above ' : ' below ') + 'the rule level'));
  if (ok(p.target)) { const g = p.target / p.chart_px - 1; parts.push(L(', och ' + LV('ditt mål ', 'målet ', '', '') + tal(p.target) + ' ligger ' + pctU(Math.abs(g)) + (g >= 0 ? ' över' : ' under') + ' kursen. ', ', and ' + LV('', '', 'your target ', 'the target ') + tal(p.target) + ' is ' + pctU(Math.abs(g)) + (g >= 0 ? ' above' : ' below') + ' the price. ')); }
  else parts.push('. ');
  if (hasOpt(p)) {
    const q = o.quantiles_12m;
    parts.push(L('Till höger om i dag visar solfjädern vad optionspriserna säger om nästa år: hälften av utfallen mellan ' + px(q.q25) + ' och ' + px(q.q75) + ', medianen ' + px(q.q50) + ' och det förväntade priset ' + px(o.target_12m) + '. Medianen ligger under det förväntade priset eftersom några få stora uppgångar drar upp snittet. ',
      'Right of today, the fan shows what option prices say about the next year: half of outcomes between ' + px(q.q25) + ' and ' + px(q.q75) + ', the median ' + px(q.q50) + ' and the expected price ' + px(o.target_12m) + '. The median sits below the expected price because a few large gains pull the average up. '));
    if (ok(p.target) && ok(o.p_above_own_target_12m)) parts.push(L('Chansen att vara över ' + tal(p.target) + ' om ett år är ' + pct0(o.p_above_own_target_12m) + (o.first_passage && ok(o.first_passage.p_target_first) ? ', och chansen att nå dit innan kursen når regelnivån ' + pct0(o.first_passage.p_target_first) : '') + '. ',
      'The chance of being above ' + tal(p.target) + ' in a year is ' + pct0(o.p_above_own_target_12m) + (o.first_passage && ok(o.first_passage.p_target_first) ? ', and the chance of getting there before the price reaches the rule level ' + pct0(o.first_passage.p_target_first) : '') + '. '));
    parts.push(L('Optionsmålet är ' + oiNote(o) + '.', 'The option target is ' + oiNote(o) + '.'));
  } else {
    parts.push(L('Till höger om i dag visar bandet hur långt vanlig svängning brukar nå på 21 handelsdagar, ±1 och ±2 standardavvikelser med 60 dagars volatilitet. Det är ingen prognos; datakällan har inga optioner för aktien.',
      'Right of today, the band shows how far ordinary swings usually reach in 21 trading days, ±1 and ±2 standard deviations at 60-day volatility. It is not a forecast; the data source has no options for the stock.'));
  }
  const ei = p.series.d_dates.indexOf(p.entry_date), N = Math.min(180, p.series.d_dates.length);
  if (ei >= 0 && ei < p.series.d_dates.length - N) parts.push(L(' Köpet ' + dSY(p.entry_date) + ' ligger före grafens början.', ' The purchase on ' + dSY(p.entry_date) + ' is before the start of the chart.'));
  if (p.chart !== p.held) parts.push(L(' Grafen visar ' + p.chart + ' i dollar, där nivåerna gäller; innehavet är ' + short(p.held) + ' i euro.', ' The chart shows ' + p.chart + ' in dollars, where the levels apply; the holding is ' + short(p.held) + ' in euros.'));
  return parts.join('');
}

/* ================= sidornas delar ================= */
function controls(host, onChange) {
  // knappen som hade fokus får tillbaka det efter omritningen (tangentbordet tappar inte platsen)
  const prevK = document.activeElement && host.contains(document.activeElement) ? document.activeElement.dataset.k : null;
  host.textContent = '';
  const btn = (label, pressed, fn, k) => { const b = el('button', null, label); b.type = 'button'; b.dataset.k = k; b.setAttribute('aria-pressed', String(pressed)); b.addEventListener('click', fn); return b; };
  const g1 = el('div', 'seg'); g1.setAttribute('role', 'group'); g1.setAttribute('aria-label', L('Upplaga', 'Edition'));
  g1.append(btn(L('Morgon 09:00', 'Morning 09:00'), state.upplaga === 'morgon', () => onChange({ upplaga: 'morgon' }), 'morgon'), btn(L('Kväll 22:15', 'Evening 22:15'), state.upplaga === 'kvall', () => onChange({ upplaga: 'kvall' }), 'kvall'));
  const g2 = el('div', 'seg'); g2.setAttribute('role', 'group'); g2.setAttribute('aria-label', L('Språk', 'Language'));
  g2.append(btn('SV', !en(), () => onChange({ lang: 'sv' }), 'sv'), btn('EN', en(), () => onChange({ lang: 'en' }), 'en'));
  const pb = el('button', 'solo'); pb.type = 'button'; pb.dataset.k = 'publik'; pb.setAttribute('aria-pressed', String(state.publik));
  pb.append(el('i'), document.createTextNode(L('Publik', 'Public')));
  pb.title = L('Publik upplaga: döljer kronor och antal, visar procent och vikter', 'Public edition: hides SEK amounts and quantities, shows percentages and weights');
  pb.addEventListener('click', () => onChange({ publik: !state.publik }));
  host.append(g1, g2);
  if (!PUBLIK_ENDAST) host.append(pb);
  if (prevK) { const b = host.querySelector('[data-k="' + prevK + '"]'); if (b) b.focus(); }
}
function ears(left, right, ed) {
  left.textContent = ''; right.textContent = '';
  const np = document.getElementById('np-link'); if (np) np.href = href('index.html');
  const day = edDate(ed);
  put(left, [el('strong', null, cap(wd(day)) + ' ' + dL(day)), el('br'), ed === 'kvall' ? L('Kvällsupplagan 22:15, efter stängningen', 'Evening edition 22:15, after the close') : L('Morgonupplagan 09:00, före öppningen', 'Morning edition 09:00, before the open')]);
  put(right, [el('strong', null, L('Kurser: stängning ' + wd(ASOF) + ' ' + dS(ASOF), 'Prices: close ' + wd(ASOF) + ' ' + dS(ASOF))), el('br'), L('Byggd ' + wd(BUILT) + ' ' + dS(BUILT) + ' ' + hhmm(BUILT) + ', prototyp', 'Built ' + wd(BUILT) + ' ' + dS(BUILT) + ' ' + hhmm(BUILT) + ', prototype')]);
}
function strip(host) {
  host.textContent = '';
  const cell = (lab, val, sub, cls) => { const c = el('div', 'cell'); c.append(el('span', 'lab', lab)); const v = el('span', 'val', val); if (cls) v.classList.add(cls); c.append(v); if (sub) c.append(el('span', 'sub', sub)); host.append(c); };
  const bad = POS.filter(p => p.rule.state !== 'INTAKT'), nr = near(), R = P.risk || {};
  const rulesCell = () => cell(L('Exitregler', 'Exit rules'), bad.length ? L(bad.length + ' av ' + POS.length + ' larmar', bad.length + ' of ' + POS.length + ' flagging') : L(POS.length + ' av ' + POS.length + ' intakta', POS.length + ' of ' + POS.length + ' intact'),
    L('närmast: ' + nm(nr) + ', ' + pctU(Math.abs(ruleDist(nr))) + ' över', 'closest: ' + nm(nr) + ', ' + pctU(Math.abs(ruleDist(nr))) + ' above'));
  if (pub()) {
    cell(L('Avkastning', 'Return'), pctS(P.ret), L('på vad köpen kostade', 'on what the purchases cost'));
    cell(cap(wd(ASOF)), pctS(P.day_ret), L('på dagen', 'on the day'), P.day_ret >= 0 ? 'pos' : 'neg');
    cell(L('Mot MSCI World', 'vs MSCI World'), ppS(P.ret - P.msci_ret), L('index gav ' + pctS(P.msci_ret) + ' på samma insats', 'the index made ' + pctS(P.msci_ret) + ' on the same money'));
    rulesCell();
    const big = BYW[0]; cell(L('Största vikt', 'Largest weight'), nm(big) + ' ' + pctU(big.weight, 0), L(POS.length + ' innehav', POS.length + ' holdings'));
    cell(L('Risk', 'Risk'), pctU(R.vol_ann, 0), L('volatilitet per år, beta ' + num(R.beta_msci, 2) + ' mot MSCI World', 'volatility per year, beta ' + num(R.beta_msci, 2) + ' to MSCI World'));
    return;
  }
  cell(L('Värde', 'Value'), kr(P.value_sek), L(POS.length === 5 ? 'fem innehav' : POS.length + ' innehav', POS.length + ' holdings'));
  cell(L('Sedan köpen', 'Since purchase'), krS(P.pnl_sek), L(pctS(P.ret) + ' på ' + kr(P.cost_sek), pctS(P.ret) + ' on ' + kr(P.cost_sek)), P.pnl_sek >= 0 ? null : 'neg');
  cell(cap(wd(ASOF)), krS(P.day_sek), L(pctS(P.day_ret) + ' på dagen', pctS(P.day_ret) + ' on the day'));
  cell(L('Mot MSCI World', 'vs MSCI World'), krS(P.excess_sek), L(ppS(P.ret - P.msci_ret) + '; index gav ' + pctS(P.msci_ret), ppS(P.ret - P.msci_ret) + '; the index made ' + pctS(P.msci_ret)));
  rulesCell();
  cell(L('Insatt', 'Invested'), kr(P.cost_sek), L('ditt kort: ' + kr(P.invested_reported_sek), 'your cards: ' + kr(P.invested_reported_sek)));
}
function teaser(p) {
  const a = el('article', 'story');
  a.append(el('p', 'kicker', p.name));
  a.append(el('p', 'held', heldLine(p)));
  const h = el('h3'); const link = el('a', null, storyHeadline(p)); link.href = href('position.html', p.id); h.append(link); a.append(h);
  if (p.thesis) { const qn = el('p', 'quote', '”' + p.thesis + '”'); qn.title = p.thesis; a.append(qn); }
  const sp = el('div', 'sparkholder'); sp.dataset.id = p.id; a.append(sp);
  const foot = el('div', 'storyfoot'); foot.append(stateNode(p), el('span', null, pctU(Math.abs(ruleDist(p))) + (ruleDist(p) >= 0 ? L(' över regeln', ' above the rule') : L(' under regeln', ' below the rule')))); a.append(foot);
  const f = el('dl', 'facts'), o = p.oiret || {};
  const add = (dt, nodes) => { f.append(el('dt', null, dt)); const dd = el('dd'); put(dd, nodes); f.append(dd); };
  add(L('Vikt', 'Weight'), [pctU(p.weight, 0) + (pub() ? '' : ', ' + kr(p.value_sek))]);
  add(L('Resultat', 'Result'), [el('span', p.ret >= 0 ? 'pos' : 'neg', pctS(p.ret)), el('span', 'sub2', L(' kurs ', ' price ') + pctS(p.asset_ret) + L(', valuta ', ', currency ') + pctS(p.fx_ret))]);
  add(L('Regel', 'Rule'), [stateNode(p), ' ' + pctU(Math.abs(ruleDist(p))) + L(' över, ', ' above, ') + num(ruleAtr(p), 1) + ' ATR', el('br'), el('span', 'sub2', levelText(p) + ', ' + ruleWords(p, false))]);
  add(L('Brus', 'Noise'), [pct0(noise5(p)) + L(' chans att nå nivån inom 5 dagar', ' chance of reaching the level within 5 days')]);
  const t = [LV('Ditt ', 'Kortets ', 'Yours ', "Card's "), el('i', null, p.target_text ? '”' + p.target_text + '”' : '—'), el('br')];
  if (!hasOpt(p)) t.push(el('span', 'sub2', L('Optionerna: inga hos datakällan', 'Options: none at the data source')));
  else { t.push(L('Optionerna ', 'Options ') + px(o.target_12m) + L(' om ett år', ' in a year'), el('br'), el('span', 'sub2', oiNote(o))); }
  add(L('Mål', 'Target'), t);
  add(L('Rapport', 'Report'), [calText(p)]);
  a.append(f);
  return a;
}
function calText(p) {
  const c = (p.calendar || []).filter(e => e.date).slice().sort((a, b) => a.date.localeCompare(b.date));
  return c.length ? c.map(e => dS(e.date) + (e.ticker !== p.chart && e.ticker !== p.held ? ' ' + (CAL[e.ticker] || e.ticker) : '')).join(', ') : '—';
}
function calendarList(host) {
  host.textContent = '';
  events().forEach(e => { const li = el('li'); const t = el('time', null, dS(e.d)); t.setAttribute('datetime', e.d); li.append(t, el('span', null, L('Rapport, ', 'Report, ') + evName(e) + (e.inner ? L(' (i ' + nm(e.p) + ')', ' (in the ' + nm(e.p) + ')') : ''))); host.append(li); });
}
function markets(host) {
  host.textContent = '';
  const thead = el('thead'), tr0 = el('tr'); [L('Index', 'Index'), L('Senast', 'Last'), cap(wd(ASOF))].forEach(h => tr0.append(el('th', null, h))); thead.append(tr0); host.append(thead);
  const tb = el('tbody');
  ['URTH', '^GSPC', '^NDX', '^OMX', '^GDAXI', '^KS11', '^VIX', 'EURSEK=X', 'USDSEK=X'].forEach(k => {
    const x = (S.macro || {})[k]; if (!x) return; const tr = el('tr');
    tr.append(el('td', null, String(x.label).replace(' (URTH, USD)', L(' (URTH, dollar)', ' (URTH, USD)'))));
    tr.append(el('td', null, x.err ? '—' : num(x.last, x.last >= 100 ? 0 : 2)));
    tr.append(el('td', x.err ? null : (isZero(x.chg * 100, 1) ? 'flat' : x.chg > 0 ? 'pos' : 'neg'), x.err ? '—' : pctS(x.chg)));
    tb.append(tr);
  });
  host.append(tb);
}
function borslistan(host, subHost) {
  host.textContent = '';
  subHost.textContent = L('Ordnad efter vikt' + (pub() ? '' : ', belopp i kronor') + '. Regelnivåerna är maskinens tolkning av korten. Optionerna: prel. = preliminär metod; kort löptid = bara ca 6 mån optioner, uppräknat; ETF = utanför studiens evidens.',
    'Ordered by weight' + (pub() ? '' : ', amounts in SEK') + '. The rule levels are the machine\'s reading of the cards. Options: prelim. = preliminary method; short expiry = only about 6 months of options, annualised; ETF = outside the study\'s evidence.');
  const cols = [[L('Innehav', 'Holding'), 'l'], [L('Vikt', 'Weight')]].concat(pub() ? [] : [[L('Värde', 'Value')]]).concat([[L('Sedan köp', 'Since purchase')], [L('Regel', 'Rule'), 'l'], [L('Avstånd', 'Distance')], [L('Regelnivå', 'Rule level'), 'l'], [L('Brus 5 dagar', 'Noise 5 days')], [LV('Ditt mål', 'Mål', 'Your target', 'Target'), 'l'], [L('Optionerna, 12 mån', 'Options, 12 mo')], [LV('Över ditt mål', 'Över målet', 'Above your target', 'Above target')], [L('Rapport', 'Report')]]);
  const thead = el('thead'), hr = el('tr'); cols.forEach(([h, c]) => { const th = el('th', c || null, h); th.scope = 'col'; hr.append(th); }); thead.append(hr); host.append(thead);
  const body = el('tbody');
  BYW.forEach(p => {
    const tr = el('tr'), l = ruleLvl(p), o = p.oiret || {};
    const td = (nodes, cls) => { const c = el('td', cls || null); put(c, nodes); tr.append(c); };
    const a = el('a', null, nm(p)); a.href = href('position.html', p.id);
    const nmSpan = el('span', 'nm'); nmSpan.append(a);
    td([nmSpan, el('span', 's', p.chart !== p.held ? short(p.held) + L(' i ', ' in ') + p.ccy + L(', graf ', ', chart ') + p.chart : short(p.held) + ' ' + px(p.px) + ' ' + p.ccy)]);
    td([pctU(p.weight, 0)]);
    if (!pub()) td([kr(p.value_sek)]);
    td([el('span', p.ret >= 0 ? 'pos' : 'neg', pctS(p.ret)), el('span', 's', L('kurs ', 'price ') + sgn(p.asset_ret * 100, 1) + L(', valuta ', ', currency ') + sgn(p.fx_ret * 100, 1))]);
    td([stateNode(p), el('span', 's', p.rule.closes_beyond + L(' av ', ' of ') + p.rule.need + L(' stängningar', ' closes'))], 'l');
    td([pctU(l ? l.dist : ruleDist(p)), el('span', 's', num(l ? l.dist_atr : null, 1) + ' ATR')]);
    td([levelText(p), el('span', 's', ruleWords(p, false))], 'l');
    td([pct0(noise5(p))]);
    td([el('i', null, p.target_text ? '”' + p.target_text + '”' : '—')], 'l wrap');
    if (!hasOpt(p)) td(['—', el('span', 's', L('inga optioner', 'no options'))]);
    else { const tag = [L('prel.', 'prelim.')]; if (o.approx) tag.push(L('kort löptid', 'short expiry')); if (outside(o)) tag.push('ETF'); td([px(o.target_12m), el('span', 's', tag.join(', '))]); }
    td([!hasOpt(p) || !ok(o.p_above_own_target_12m) ? '—' : pct0(o.p_above_own_target_12m)]);
    const cal = (p.calendar || []).filter(e => e.date).slice().sort((x, y) => x.date.localeCompare(y.date));
    const inner = cal.filter(e => e.ticker !== p.chart && e.ticker !== p.held);
    td(cal.length ? [dS(cal[0].date)].concat(inner.length ? [el('span', 's', inner.map((e, i) => (CAL[e.ticker] || e.ticker) + (i ? ' ' + dS(e.date) : '')).join(', '))] : []) : ['—']);
    body.append(tr);
  });
  host.append(body);
}
/* tabellen bakom kurvan: sista handelsdagen i varje månad, i kronor eller (publikt) i procentenheter */
function excessTable(tb, sumEl) {
  const nav = P.nav, N = nav.dates.length;
  tb.textContent = ''; if (sumEl) sumEl.textContent = L('Talen bakom kurvan', 'The numbers behind the curve');
  const h = el('tr');
  (pub() ? [L('Månad', 'Month'), L('Portföljen', 'Portfolio'), 'MSCI World', L('Försprång', 'Lead')]
    : [L('Månad', 'Month'), L('Insatt', 'Invested'), L('Dina köp', 'Your holdings'), L('Samma kronor i MSCI World', 'Same money in MSCI World'), L('Skillnad', 'Difference')]).forEach(c => h.append(el('th', null, c)));
  tb.append(h);
  nav.dates.forEach((d, i) => {
    if (i < N - 1 && nav.dates[i + 1].slice(0, 7) === d.slice(0, 7)) return;
    const last = i === N - 1, val = last ? P.value_sek : nav.value[i], ms = last ? P.msci_shadow_sek : nav.msci[i], c = nav.cost[i];
    const tr = el('tr'), t = D(d);
    tr.append(el('td', null, MON[state.lang][t.getUTCMonth()] + ' ' + t.getUTCFullYear()));
    (pub() ? [pctS(val / c - 1), pctS(ms / c - 1), ppS((val - ms) / c)] : [kr(c), kr(val), kr(ms), krS(val - ms)]).forEach(x => tr.append(el('td', null, x)));
    tb.append(tr);
  });
}
function footer(host) {
  host.textContent = '';
  const left = el('span'); left.textContent = L('Datans ålder: stängning ' + wd(ASOF) + ' ' + dSY(ASOF) + ', byggd ' + wd(BUILT) + ' ' + dS(BUILT) + ' ' + hhmm(BUILT) + '. Prototypdata ur Yahoo Finance och FRED.', 'Data age: close ' + wd(ASOF) + ' ' + dSY(ASOF) + ', built ' + wd(BUILT) + ' ' + dS(BUILT) + ' ' + hhmm(BUILT) + '. Prototype data from Yahoo Finance and FRED.');
  const right = el('span'); const a = el('a', null, L('Så räknas talen: metoden', 'How the numbers are made: the method')); a.href = href('metod.html'); right.append(a);
  host.append(left, right);
}

/* ================= sidorna ================= */
let fontsReady = false, redraw = null, resizeHooked = false;
function whenFonts(fn) { if (fontsReady) { fn(); return; } const go = () => { fontsReady = true; fn(); }; if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go(); }
function onResize(fn) { let t; root.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fn, 150); }); }
function setRedraw(fn) { redraw = fn; if (!resizeHooked) { resizeHooked = true; onResize(() => redraw && redraw()); } }

function forsta() {
  applyRoot();
  const ed = state.upplaga;
  document.title = L('Portföljen · ', 'Portföljen · ') + (ed === 'kvall' ? L('Kvällsupplagan', 'Evening edition') : L('Morgonupplagan', 'Morning edition'));
  $('tag').textContent = L('En tidning om fem positioner, skriven av maskinen två gånger om dagen.', 'A newspaper about five positions, written by the machine twice a day.');
  controls($('ctrls'), ch => { setState(ch, true); forsta(); });
  ears($('ear-left'), $('ear-right'), ed);
  strip($('strip'));
  $('headline').textContent = headline(ed);
  $('lede').textContent = lede(ed);
  $('byline').textContent = byline();
  $('g-gauge-h').textContent = L('Mot MSCI World', 'Against MSCI World');
  $('g-gauge-sub').textContent = pub() ? L('Samma insats samma dagar i världsindex', 'The same money on the same days in the world index') : L('Samma kronor samma dagar i världsindex', 'The same money on the same days in the world index');
  $('g-ex-h').textContent = LV('Vad dina val har gett utöver MSCI World', 'Vad valen har gett utöver MSCI World', 'What your picks have added beyond MSCI World', 'What the picks have added beyond MSCI World');
  $('g-ex-sub').textContent = pub()
    ? L('Procentenheter dag för dag: portföljens avkastning minus MSCI Worlds, på samma insats samma dagar. Strecken på tidsaxeln är köpen.', 'Percentage points day by day: the portfolio\'s return minus MSCI World\'s, on the same money on the same days. The ticks on the time axis are the purchases.')
    : LV('Kronor dag för dag: dina köp minus samma kronor i MSCI World samma dagar. Strecken på tidsaxeln är dina köp.', '', 'SEK, day by day: your holdings minus the same money in MSCI World on the same days. The ticks on the time axis are your purchases.', '');
  $('g-bars-h').textContent = pub() ? L('Varje position, bidrag till försprånget', 'Each position, contribution to the lead') : L('Varje position mot samma kronor i MSCI World', 'Each position against the same money in MSCI World');
  $('g-bars-note').textContent = barsNote();
  excessTable($('ex-table'), $('ex-sum'));
  const desk = $('desk'); desk.textContent = ''; BYW.forEach(p => desk.append(teaser(p)));
  $('brief-h').textContent = briefLabel(ed);
  const bl = $('brief-lines'); bl.textContent = ''; brief(ed).forEach(t => bl.append(el('p', null, t)));
  $('cal-h').textContent = L('Kalendern', 'Calendar'); calendarList($('cal'));
  $('mk-h').textContent = L('Marknaderna ' + onDay(ASOF), 'Markets ' + onDay(ASOF)); markets($('macro'));
  $('list-h').textContent = L('Börslistan', 'The stock table'); borslistan($('list'), $('list-sub'));
  footer($('foot'));
  setRedraw(drawFront);
  whenFonts(drawFront);
}
function drawFront() {
  gauge($('gauge')); gaugeKeys($('gauge-keys'));
  excess($('excess'));
  bars($('bars'));
  document.querySelectorAll('.sparkholder').forEach(h => spark(h, pos(h.dataset.id)));
}

function positionssida() {
  applyRoot();
  const ed = state.upplaga;
  const id = (root.location.hash || '#PLTR').slice(1).toUpperCase();
  const p = pos(id) || pos('PLTR');
  document.title = nm(p) + ' · Portföljen';
  $('tag').textContent = '';
  const back = el('a', null, L('← Förstasidan', '← Front page')); back.href = href('index.html'); $('tag').append(back);
  controls($('ctrls'), ch => { setState(ch, true); positionssida(); });
  ears($('ear-left'), $('ear-right'), ed);
  const nav = $('posnav'); nav.textContent = '';
  BYW.forEach(q => {
    const a = el('a'); a.href = href('position.html', q.id); if (q.id === p.id) a.setAttribute('aria-current', 'page');
    a.append(el('b', null, nm(q)), document.createTextNode(stateOf(q).sym + ' ' + stateWord(q) + ', ' + pctS(q.ret)));
    a.addEventListener('click', e => { e.preventDefault(); root.history.replaceState(null, '', a.getAttribute('href')); positionssida(); root.scrollTo({ top: 0 }); });
    nav.append(a);
  });
  const kick = $('kick'); kick.textContent = '';
  kick.append(document.createTextNode(p.name + ' '), el('span', null, p.chart !== p.held ? L('Graf ' + p.chart + ' i dollar, ägd som ' + short(p.held) + ' på ' + exchange(p) + ' i euro', 'Chart ' + p.chart + ' in dollars, held as ' + short(p.held) + ' on ' + exchange(p) + ' in euros') : p.chart + ', ' + exchange(p) + ', ' + ccyWord(p.ccy)));
  $('a-h1').textContent = storyHeadline(p);
  $('a-dek').textContent = dek(p);
  $('a-byline').textContent = byline();
  const figs = $('figs'); figs.textContent = '';
  const fig = (lab, val, sub, cls) => { const d = el('div'); d.append(el('span', 'lab', lab)); const v = el('span', 'val', val); if (cls) v.classList.add(cls); d.append(v); if (sub) d.append(el('span', 'sub', sub)); figs.append(d); };
  fig(L('Kurs', 'Price'), money(p.chart_px, p.chart_ccy), (p.chart !== p.held ? short(p.held) + ' ' + money(p.px, p.ccy) + ', ' : '') + wd(p.asof) + ' ' + pctS(p.day_local));
  fig(L('Sedan köp', 'Since purchase'), pctS(p.ret), pub() ? L('kurs ', 'price ') + pctS(p.asset_ret) + L(', valuta ', ', currency ') + pctS(p.fx_ret) : krS(p.pnl_sek) + L('; kurs ', '; price ') + pctS(p.asset_ret) + L(', valuta ', ', currency ') + pctS(p.fx_ret), p.ret >= 0 ? 'pos' : 'neg');
  fig(L('Vikt', 'Weight'), pctU(p.weight, 1), L('andel av risken ', 'share of risk ') + pctU(((P.risk || {}).contrib || {})[p.id], 0));
  fig(L('Mot MSCI World', 'vs MSCI World'), pub() ? ppS(p.ret - p.msci_ret) : krS(p.excess_sek), L('MSCI World samma dag ', 'MSCI World from the same day ') + pctS(p.msci_ret));
  fig(L('Regeln', 'The rule'), stateOf(p).sym + ' ' + stateWord(p), pctU(Math.abs(ruleDist(p))) + (ruleDist(p) >= 0 ? L(' över ', ' above ') : L(' under ', ' below ')) + px(p.rule.level) + ', ' + num(ruleAtr(p), 1) + ' ATR');
  fig(L('Brus', 'Noise'), pct0(noise5(p)), L('chans att nå nivån inom 5 dagar; ', 'chance of reaching the level within 5 days; ') + pct0(noise21(p)) + L(' inom 21', ' within 21'));
  chartLegend($('legend'), p);
  $('caption').textContent = chartCaption(p);
  // hans ord
  const yd = $('yours'); yd.textContent = '';
  $('yours-h').textContent = LV('Du skriver', 'Bilel skriver', 'You write', 'Bilel writes');
  const qv = v => (v ? '”' + v + '”' : null);
  const add = (k, v, plain) => { yd.append(el('dt', null, k)); const dd = el('dd'); if (v === null || v === undefined || v === '') dd.append(el('span', 'empty', L('— ej ifyllt', '— not filled in'))); else if (plain) dd.append(el('span', 'plain', v)); else dd.textContent = v; yd.append(dd); };
  const rw = regW(p), rdd = regD(p);
  add('Bias', p.bias, true);
  add(L('Kort tes', 'Short thesis'), qv(p.thesis));
  add(L('Ankare vecka', 'Weekly anchor'), rw ? qv(px(rw.anchor) + ' ' + rw.label) : null);
  add(L('Ankare dag', 'Daily anchor'), rdd ? qv(px(rdd.anchor) + ' ' + rdd.label) : null);
  add(L('Regression', 'Regression'), qv(p.reg_comment));
  add(L('SMA vecka', 'SMA weekly'), qv(p.sma_W));
  add(L('SMA dag', 'SMA daily'), qv(p.sma_D));
  add(L('Nivåer', 'Levels'), (ok(p.warn_4h) ? '4H ' + px(p.warn_4h) : '') + (ok(p.main_d) ? L(', daglig ', ', daily ') + px(p.main_d) : '') + L(', exit ', ', exit ') + (p.exit_confirm || '—'), true);
  if (p.level_comment) add(L('Om nivåerna', 'On the levels'), qv(p.level_comment));
  add(L('Mål', 'Target'), qv(p.target_text));
  if (p.note) add(L('Anteckning', 'Note'), qv(p.note));
  add(L('Uppdaterad', 'Updated'), p.updated ? dSY(p.updated) + (p.updated.length > 10 ? ' ' + p.updated.slice(11, 16) : '') : null, true);
  $('check-h').textContent = L('Faktakollen: maskinen prövade orden mot kurserna', 'The fact check: the machine tested the words against the prices');
  const ol = $('check'); ol.textContent = '';
  checks(p).forEach(c => { const li = el('li'); li.append(el('span', 'verdict ' + c.c, c.v)); const t = el('span'); partsTo(t, c.parts); li.append(t); ol.append(li); });
  // planen
  $('plan-h').textContent = L('Planen', 'The plan');
  const pl = $('plan-body'); pl.textContent = '';
  [[L('Håller så länge', 'Holds as long as'), p.plan_hold], [L('Orolig om', 'Worried if'), p.plan_worry], [L('Säljer om', 'Sells if'), p.plan_sell]].forEach(([k, v]) => { const d = el('div'); d.append(el('b', null, k), el('p', v ? null : 'empty', v ? '”' + v + '”' : L('— ej ifyllt', '— not filled in'))); pl.append(d); });
  // optionerna
  $('opt-h').textContent = L('Optionerna om ett år', 'The options in a year');
  const ob = $('opt-body'); ob.textContent = '';
  const o = p.oiret || {};
  const marks = el('div', 'marks');
  if (!hasOpt(p)) { marks.append(el('span', 'mark warn', L('inga optioner', 'no options'))); ob.append(marks, el('p', null, L('Datakällan har inga optioner för ' + p.chart + '. Eurex-optioner finns men är inte fritt tillgängliga, så maskinen visar vanlig svängning i stället för en riktkurs.', 'The data source has no options for ' + p.chart + '. Eurex options exist but are not freely available, so the machine shows ordinary swings instead of a target.'))); }
  else {
    marks.append(el('span', 'mark', L('preliminär', 'preliminary')));
    if (o.approx) marks.append(el('span', 'mark warn', L('bara ca ' + approxMonths(o) + ' mån optioner, uppräknat', 'only about ' + approxMonths(o) + ' months of options, annualised')));
    if (outside(o)) marks.append(el('span', 'mark warn', L('ETF utanför studiens evidens', "ETF outside the study's evidence")));
    ob.append(marks);
    ob.append(el('p', null, L('Förväntat pris om ett år ' + px(o.target_12m) + ', en förväntad avkastning på ' + pctS(o.er) + ' från dagens kurs. Medianen är ' + px(o.median_12m) + '.', 'Expected price in a year ' + px(o.target_12m) + ', an expected return of ' + pctS(o.er) + ' from today\'s price. The median is ' + px(o.median_12m) + '.')));
    const tb = el('table', 't'); const h = el('tr'); [L('Utfall om ett år', 'Outcome in a year'), '5 %', '25 %', '50 %', '75 %', '95 %'].forEach(x => h.append(el('th', null, x))); tb.append(h);
    const r = el('tr'); r.append(el('td', null, L('Kurs', 'Price'))); ['q5', 'q25', 'q50', 'q75', 'q95'].forEach(k => r.append(el('td', null, px(o.quantiles_12m[k])))); tb.append(r); ob.append(tb);
    if (ok(p.target)) ob.append(el('p', null, L('Chans att vara över ' + tal(p.target) + ' om ett år: ' + pct0(o.p_above_own_target_12m) + '. Chans att nå ' + tal(p.target) + ' före regelnivån ' + px(p.rule.level) + ' inom ett år: ' + pct0((o.first_passage || {}).p_target_first) + '; regelnivån först: ' + pct0((o.first_passage || {}).p_stop_first) + '.',
      'Chance of being above ' + tal(p.target) + ' in a year: ' + pct0(o.p_above_own_target_12m) + '. Chance of reaching ' + tal(p.target) + ' before the rule level ' + px(p.rule.level) + ' within a year: ' + pct0((o.first_passage || {}).p_target_first) + '; the rule level first: ' + pct0((o.first_passage || {}).p_stop_first) + '.')));
    ob.append(el('p', 'muted', L('Metod: Martin, Rodenkirchen, Wagner och Wang (2026). Nästa rapport: ', 'Method: Martin, Rodenkirchen, Wagner and Wang (2026). Next report: ') + calText(p) + '.'));
  }
  // talen bakom grafen
  const tt = $('chart-table'); tt.textContent = '';
  const rows = [[L('Stängning ', 'Close ') + dS(p.asof), px(p.chart_px)], ['SMA 52 / SMA 252 ' + L('(dag)', '(daily)'), px(p.sma_d['52'].v) + ' / ' + px(p.sma_d['252'].v)], [L('Regelnivå', 'Rule level'), px(p.rule.level)]];
  if (ok(p.target)) rows.push([LV('Ditt mål', 'Målet', 'Your target', 'Target'), tal(p.target)]);
  if (regD(p)) { const c = regD(p).channel; rows.push([L('Kanalen i dag: nedre, mitt, övre', 'Channel today: lower, mid, upper'), px(c.lower) + ', ' + px(c.line) + ', ' + px(c.upper)]); }
  if (hasOpt(p)) { rows.push([L('Optionerna om ett år: 5, 25, 50, 75, 95 %', 'Options in a year: 5, 25, 50, 75, 95%'), ['q5', 'q25', 'q50', 'q75', 'q95'].map(k => px(o.quantiles_12m[k])).join(', ')]); rows.push([L('Förväntat pris om ett år', 'Expected price in a year'), px(o.target_12m) + ' (' + oiNote(o, true) + ')']); }
  const th = el('tr'); th.append(el('th', null, L('Mått', 'Measure')), el('th', null, L('Värde', 'Value'))); tt.append(th);
  rows.forEach(([a, b]) => { const tr = el('tr'); tr.append(el('td', null, a), el('td', null, b)); tt.append(tr); });
  $('chart-sum').textContent = L('Talen bakom grafen', 'The numbers behind the chart');
  footer($('foot'));
  const draw = () => positionChart($('bigchart'), p);
  setRedraw(draw);
  whenFonts(draw);
}

function metod() {
  applyRoot();
  document.title = L('Metoden · Portföljen', 'The method · Portföljen');
  $('tag').textContent = '';
  const back = el('a', null, L('← Förstasidan', '← Front page')); back.href = href('index.html'); $('tag').append(back);
  controls($('ctrls'), ch => { setState(ch, true); metod(); });
  ears($('ear-left'), $('ear-right'), state.upplaga);
  const host = $('metod'); host.textContent = '';
  const content = root.TidningMetod ? root.TidningMetod(api) : [];
  const toc = $('toc'); toc.textContent = '';
  $('m-h1').textContent = L('Så räknas talen', 'How the numbers are made');
  $('m-ingress').textContent = L('En tidning om fem positioner, skriven av en maskin två gånger om dagen. Ägarens omdöme står kvar i ägarens egna ord; allt som går att mäta räknas och prövas mot de regler ägaren själv har skrivit. Den här sidan säger vad som mäts, hur, och vad som inte mäts.',
    "A newspaper about five positions, written by a machine twice a day. The owner's judgment stays in the owner's own words; everything that can be measured is calculated and tested against rules the owner wrote. This page says what is measured, how, and what is not.");
  content.forEach((sec, i) => {
    const s = el('section', 'msec'); s.id = 'm' + (i + 1);
    s.append(el('h2', null, sec.h));
    sec.body.forEach(b => {
      if (typeof b === 'string') s.append(el('p', null, b));
      else if (b.ul) { const ul = el('ul'); b.ul.forEach(t => ul.append(el('li', null, t))); s.append(ul); }
      else if (b.table) { const tb = el('table', 't'); const h = el('tr'); b.table[0].forEach(x => h.append(el('th', null, x))); tb.append(h); b.table.slice(1).forEach(r => { const tr = el('tr'); r.forEach(x => tr.append(el('td', null, x))); tb.append(tr); }); s.append(tb); }
      else if (b.src) s.append(el('p', 'src', b.src));
    });
    host.append(s);
    const li = el('li'), a = el('a', null, sec.h); a.href = '#m' + (i + 1); li.append(a); toc.append(li);
  });
  footer($('foot'));
}

const api = {
  S, P, POS, BYW, ASOF, BUILT, state, setState, applyRoot, href, L, LV, en, pub,
  fmt: { num, sgn, pctU, pctS, pct0, ppS, kr, krS, kronor, px, money, tal, dS, dSY, dL, wd, cap, onDay },
  nm, prose, pos, ruleLvl, ruleDist, ruleAtr, noise5, noise21, near, regD, regW, hasOpt, oiNote, ruleWords, levelText, stateOf, stateWord, events, evList, edDate, approxMonths, outside, short, exchange, calText,
  text: { headline, lede, byline, brief, briefLabel, storyHeadline, heldLine, dek, checks, chartCaption, barsNote },
  chart: { gauge, gaugeKeys, excess, bars, spark, positionChart, chartLegend, skin },
  dom: { el, put, partsTo, stateNode, controls, ears, strip, calendarList, markets, borslistan, footer, teaser },
  forsta, positionssida, metod, whenFonts, onResize,
};
root.Tidning = api;
})(window);
