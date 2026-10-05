/* Portföljen v2: tidningens kärna.
   Läser window.SNAPSHOT (../data.js) och skriver tidningen: rubriker, ingress, I korthet, faktakollen och graferna.
   Inga sidoeffekter vid laddning: sidorna anropar Tidning.forsta(), Tidning.positionssida() eller Tidning.metod().
   Den privata vyn (../v2-brutal/) använder samma rubrikmotor och samma grafer i sin egen uniform.
   Vyn räknar inget som påverkar ett beslut: sådant kommer färdigt ur datan. Det vyn härleder är presentation:
   procentenheter, solfjäderns form mellan i dag och tolv månader (ändpunkterna är datans kvantiler), och portföljens
   försprång i procentenheter för publikläget.
   Konceptets privata delar står mellan raderna // PRIVAT-START och // PRIVAT-SLUT. Den publika sajten får filen utan
   dem (bygg-publik.py), så varje sådant avsnitt måste vara hela satser som koden klarar sig utan i publikläget. */
(function (root) {
'use strict';
const S = root.SNAPSHOT;
if (!S || !S.portfolio || !Array.isArray(S.positions) || !S.positions.length) { root.Tidning = null; return; }

/* ================= läget: upplaga, färgläge, språk, publik ================= */
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
function startTema() {
  const q = Q.get('tema'); if (q === 'ljus' || q === 'mork') return q;
  return pref.get('tema') === 'mork' ? 'mork' : 'ljus';
}
function startLang() {
  const q = Q.get('lang'); if (q === 'en' || q === 'sv') return q;
  return pref.get('lang') === 'en' ? 'en' : 'sv';
}
/* Den publika sajten (bygg-publik.py) sätter TIDNING_PUBLIK_ENDAST i sin data.js: publikläget är då låst, knappen
   finns inte och adressen bär inget publik-val. Datan där saknar dessutom riktiga belopp, så låset är inte det enda skyddet. */
const PUBLIK_ENDAST = root.TIDNING_PUBLIK_ENDAST === true;
const state = { upplaga: startUpplaga(), tema: startTema(), lang: startLang(), publik: PUBLIK_ENDAST || Q.get('publik') === '1' };
const en = () => state.lang === 'en';
const pub = () => PUBLIK_ENDAST || state.publik;
/* Sajten (2026-10-05): bara kvällsupplagan, efter stängningen, och färgläget fristående från upplagan: ljust som förval,
   mörkt bakom växeln Ljust/Mörkt. Konceptets egen vy har kvar båda upplagorna, och där följer ljuset upplagan. */
const upplaga = () => (pub() ? 'kvall' : state.upplaga);
const tema = () => (pub() ? state.tema : state.upplaga === 'kvall' ? 'mork' : 'ljus');
const L = (sv, eng) => (en() ? eng : sv);
/* Rösten: privat skriver maskinen till ägaren (du), publik skriver den om portföljen. */
const LV = (svDu, svPub, enYou, enPub) => (en() ? (pub() ? enPub : enYou) : (pub() ? svPub : svDu));

function setState(patch, persist) {
  Object.assign(state, patch);
  if (persist) {
    if ('upplaga' in patch) pref.set('upplaga', state.upplaga);
    if ('tema' in patch) pref.set('tema', state.tema);
    if ('lang' in patch) pref.set('lang', state.lang);
    try {
      const u = new URL(root.location.href);
      if (pub()) { u.searchParams.delete('upplaga'); if (state.tema === 'mork') u.searchParams.set('tema', 'mork'); else u.searchParams.delete('tema'); }
      else { u.searchParams.set('upplaga', state.upplaga); u.searchParams.delete('tema'); }
      if (state.lang === 'en') u.searchParams.set('lang', 'en'); else u.searchParams.delete('lang');
      if (state.publik && !PUBLIK_ENDAST) u.searchParams.set('publik', '1'); else u.searchParams.delete('publik');
      root.history.replaceState(null, '', u.toString());
    } catch (e) { /* file:// i vissa motorer */ }
  }
  applyRoot();
}
function applyRoot() {
  const h = document.documentElement;
  h.dataset.upplaga = upplaga(); h.dataset.tema = tema(); h.lang = state.lang;
}
function href(page, hash) {
  const q = new URLSearchParams();
  if (pub()) { if (state.tema === 'mork') q.set('tema', 'mork'); } else q.set('upplaga', state.upplaga);
  if (state.lang === 'en') q.set('lang', 'en');
  if (state.publik && !PUBLIK_ENDAST) q.set('publik', '1');
  const qs = q.toString();
  return page + (qs ? '?' + qs : '') + (hash ? '#' + hash : '');
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
/* utdelningarna på inköpskostnaden, bredvid kurs och valuta, så att delarna går ihop med totalen */
const divTxt = (p, sep) => (ok(p.div_ret) && p.div_ret > 0 ? sep + L('utdelningar ', 'dividends ') + pctS(p.div_ret) : '');
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
/* prototypdatan (byggd för hand) märks så; kvällskörningens data har meta.kind 'EOD' */
const PROTOTYP = !S.meta || S.meta.kind !== 'EOD';
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
const regW = p => (p.regression || []).find(r => r.tf === 'W' && r.channel) || null;
const regD = p => (p.regression || []).find(r => r.tf === 'D' && r.channel) || null;
const atWeeklyEdge = p => { const w = regW(p); return !!(w && w.channel.dir === 'upp' && w.channel.z <= -1.8); };
const hasOpt = p => { const o = p.oiret || {}; return !o.err && !!o.quantiles_12m && ok(o.er) && ok(o.sigma) && ok(o.target_12m); };
const approxMonths = o => { const m = /löptid ([\d.]+) år/.exec(o.approx || ''); return m ? Math.round(parseFloat(m[1]) * 12) : 6; };
const outside = o => !!(o.evidence && /^UTANFÖR/i.test(o.evidence));
/* ================= bloggen (publikläget): senaste händelsen, tankarna, nivåerna och riktkursen =================
   Publikt visas bara det bloggen säger: senaste händelsen, tankarna per innehav, nivåerna som namnlösa prisnivåer i
   grafen, och riktkursen ur optionspriserna. Sajten talar som "vi" och nämner ingen person. Varje publik väg nedan styrs
   av pub(), inte av att fälten saknas, så att konceptets publikläge (full data) och den publika sajten (avskalad data,
   bygg-publik.py) skriver exakt samma sak. */
const BLOGG = (root.PORTFOLJ_BLOGG && root.PORTFOLJ_BLOGG.innehav) || {};
const senaste = p => BLOGG[p.id] || null;
const senasteText = p => { const b = senaste(p); return b ? L(b.sv, b.en) : null; };
const tankar = p => ((BLOGG[p.id] || {}).tankar || []).filter(t => t && t.datum && t.sv).slice().sort((a, b) => b.datum.localeCompare(a.datum));
function watched(p) {
  let v = (p.nivaer || []).map(x => x.level);
  return [...new Set(v.filter(ok).map(x => Math.round(x * 100) / 100))].sort((a, b) => b - a);
}
const levelsText = p => { const w = watched(p); return w.length ? w.map(px).join(L(' och ', ' and ')) + ' ' + ccyWord(p.chart_ccy) + (p.chart !== p.held ? ' (' + p.chart + ')' : '') : '—'; };
const malTal = p => (hasOpt(p) ? Math.round(p.oiret.target_12m) : null);
/* riktkursen som belopp, i hela tal ("222 dollar"); money() visar två decimaler under 1 000 */
const malBelopp = p => (malTal(p) === null ? '—' : en() ? p.chart_ccy + NB + num(malTal(p), 0) : num(malTal(p), 0) + NB + (CCYW[p.chart_ccy] || p.chart_ccy));
/* varför en riktkurs ligger utanför studiens bevis: en ETF (Koreafonden) eller en aktie utanför S&P 500 (Siemens Energy) */
const isEtf = o => /ETF/.test(o.evidence || '');
/* kvällskörningen (2026-10-05) bär riktkursen från senaste beräkningen tills den räknas om; är den äldre än upplagan
   står beräkningsdagen bredvid, så att ingen läser den som dagens */
const malDatum = o => (o && o.datum && o.datum < ASOF ? o.datum : null);
function malNot(p) {
  const o = p.oiret || {}, bits = [];
  if (malDatum(o)) bits.push(L('räknad ' + dS(o.datum), 'calculated ' + dS(o.datum)));
  if (o.kalla === 'Eurex') bits.push(L('optioner från Eurex', 'options from Eurex'));
  if (o.kalla === 'EWY') bits.push(L('optioner på EWY', 'options on EWY'));
  if (o.approx) bits.push(L('optioner bara till ca ' + approxMonths(o) + ' mån', 'options only to about ' + approxMonths(o) + ' mo'));
  if (o.metod === 'rå') bits.push(L('tunn optionskedja', 'thin option chain'));
  if (outside(o)) bits.push(isEtf(o) ? L('ETF, utanför studiens bevis', "ETF, outside the study's evidence") : L('utanför studiens bevis', "outside the study's evidence"));
  return bits.join(', ');
}
const malText = p => (malTal(p) === null ? L('ingen riktkurs: inga optioner hos datakällan', 'no price target: no options at the data source') : num(malTal(p), 0) + ' ' + ccyWord(p.chart_ccy));
/* avståndet från dagens kurs till riktkursen, ur den oavrundade riktkursen (samma tal som grafens etikett) */
const tillRikt = p => (hasOpt(p) ? pctS(p.oiret.er) : '—');
const leadWord = () => (P.ret >= P.msci_ret ? L('före', 'ahead of') : L('efter', 'behind'));
const ccyWord = c => (en() ? c : (CCYW[c] || c));
function oiNote(o, shortForm) {
  if (!o || o.err) return '';
  const bits = [shortForm ? L('prel.', 'prelim.') : L('preliminär', 'preliminary')];
  if (malDatum(o)) bits.push(L('räknad ' + dS(o.datum), 'calculated ' + dS(o.datum)));
  if (o.approx) bits.push(shortForm ? L(approxMonths(o) + ' mån uppräknat', approxMonths(o) + ' mo annualised') : L('bara ca ' + approxMonths(o) + ' mån optioner, uppräknat', 'only about ' + approxMonths(o) + ' months of options, annualised'));
  if (o.kalla === 'Eurex') bits.push(shortForm ? 'Eurex' : L('Eurex avräkningspriser', 'Eurex settlement prices'));
  if (o.kalla === 'EWY') bits.push(shortForm ? 'EWY' : L('optionerna på EWY', 'the options on EWY'));
  if (outside(o)) bits.push(isEtf(o) ? (shortForm ? L('ETF, utanför evidensen', 'ETF, outside the evidence') : L('ETF utanför studiens evidens', "an ETF outside the study's evidence"))
    : (shortForm ? L('utanför evidensen', 'outside the evidence') : L('aktie utanför studiens evidens (bara S&P 500)', "a stock outside the study's evidence (S&P 500 only)")));
  return bits.join(', ');
}
function events() {
  const ev = [];
  POS.forEach(p => (p.calendar || []).filter(c => c.date).forEach(c => ev.push({ d: c.date.slice(0, 10), t: c.ticker, p, inner: c.ticker !== p.chart && c.ticker !== p.held, est: c.estimate === true })));
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
/* datum som bolaget inte själv har bekräftat (calendar[].estimate) märks efter listan, i en egen mening */
function estNot(list) {
  const est = list.filter(e => e.est);
  if (!est.length) return '';
  if (est.length === list.length) return list.length === 1 ? L('Datumet är preliminärt.', 'The date is not confirmed.') : L('Datumen är preliminära.', 'The dates are not confirmed.');
  const n = est.map(evName), lista = n.length < 2 ? n.join('') : n.slice(0, -1).join(', ') + L(' och ', ' and ') + n[n.length - 1];
  return est.length === 1 ? L('Datumet för ' + lista + ' är preliminärt.', 'The date for ' + lista + ' is not confirmed.') : L('Datumen för ' + lista + ' är preliminära.', 'The dates for ' + lista + ' are not confirmed.');
}
const medNot = list => { const t = estNot(list); return t ? ' ' + t : ''; };
/* börslistans rapportkolumn: alla datum preliminära ger "prel. datum"; blandat namnger de preliminära (2026-10-06) */
function kalPrel(cal) {
  const pe = cal.filter(e => e.estimate === true);
  if (!pe.length) return '';
  if (pe.length === cal.length) return L('prel. datum', pe.length > 1 ? 'prelim. dates' : 'prelim. date');
  return L('prel. datum: ', 'prelim. date: ') + pe.map(e => CAL[e.ticker] || e.ticker).join(L(' och ', ' and '));
}
const edDate = ed => (ed === 'kvall' ? ASOF : nextWeekday(ASOF));
const listNames = arr => { const n = arr.map(nm); return n.length < 2 ? n.join('') : n.slice(0, -1).join(', ') + L(' och ', ' and ') + n[n.length - 1]; };

/* ================= maskinen skriver ================= */
/* --- publikt: om händelserna, avkastningen och försprånget, aldrig om regler --- */
/* Huvudrubriken (2026-10-05): den viktiga händelse som ligger närmast upplagans dag, bakåt eller framåt, enligt E-A-R
   och kalendern. Bakåt: bloggens senaste-händelse per innehav (rapportens mottagande, ett räntebesked, ett makrosläpp)
   med sin egen handskrivna rubrik, högst 30 dagar gammal. Framåt: kalenderns rapporter, från upplagans dag. Lika nära:
   det som redan hänt, sedan det tyngre innehavet. Dagens kursrörelser blir aldrig huvudrubrik; de är brus. Utan någon
   händelse: försprånget mot världsindex. Allt räknas från upplagans dag, aldrig från läsarens klocka. */
const dagar = (a, b) => Math.round((D(b) - D(a)) / 864e5);  // dagar från a till b
const MAX_BAKAT = 30;
function nyheten(ed) {
  const dag = edDate(ed), kand = [];
  POS.forEach(p => { const b = senaste(p); if (b && b.rubrik && b.datum && b.datum <= dag && dagar(b.datum, dag) <= MAX_BAKAT) kand.push({ typ: 'blogg', p, avst: dagar(b.datum, dag), b }); });
  events().filter(e => e.d >= dag).forEach(e => kand.push({ typ: 'kal', p: e.p, avst: dagar(dag, e.d), e }));
  kand.sort((x, y) => x.avst - y.avst || (x.typ === 'blogg' ? 0 : 1) - (y.typ === 'blogg' ? 0 : 1) || y.p.weight - x.p.weight);
  return kand[0] || null;
}
const dLM = s => { const t = D(s), m = MONL[state.lang][t.getUTCMonth()]; return en() ? m + ' ' + t.getUTCDate() : t.getUTCDate() + ' ' + m; };
/* kalenderns datum kommer från Yahoo och är ibland bolagens uppskattning, inte ett fastställt datum: därav "väntas" */
function kalRubrik(e, dag) {
  const n = dagar(dag, e.d), vem = evName(e);
  const nar = n === 0 ? L('i dag', 'today') : n === 1 ? L('i morgon', 'tomorrow') : n < 7 ? L('på ' + wd(e.d), 'on ' + wd(e.d)) : L(dLM(e.d), 'on ' + dLM(e.d));
  return L(vem + ' väntas rapportera ' + nar, vem + ' is expected to report ' + nar);
}
function headlinePub(ed) {
  const n = nyheten(ed);
  if (n) return n.typ === 'blogg' ? L(n.b.rubrik.sv, n.b.rubrik.en || n.b.rubrik.sv) : kalRubrik(n.e, edDate(ed));
  const lead = Math.abs(P.ret - P.msci_ret) * 100;
  return cap(L('portföljen ' + num(lead, 1) + ' procentenheter ' + leadWord() + ' världsindex', 'the portfolio ' + num(lead, 1) + ' percentage points ' + leadWord() + ' the world index'));
}
/* Ingressen knyter rubrikens händelse till portföljen (innehavets vikt), sedan läget mot världsindex och nästa rapport. */
function ledePub(ed) {
  const top = maxBy(POS, p => p.pnl_sek), n = nyheten(ed), dag = edDate(ed);
  const share = P.pnl_sek > 0 && top.pnl_sek > 0 ? pctU(top.pnl_sek / P.pnl_sek, 0) : null;
  let s0 = '', topSagd = false;
  if (n) {
    const p = n.p, w = pctU(p.weight, 0), storst = p === BYW[0];
    if (n.typ === 'kal' && n.e.inner) s0 = L(evName(n.e) + ' ingår i ' + nm(p) + ', som väger ' + w + ' i portföljen.', evName(n.e) + ' is held through ' + prose(p) + ', which is ' + w + ' of the portfolio.');
    else if (storst && p === top && share) { s0 = L(nm(p) + ' är portföljens största innehav, ' + w + ', och står för ' + share + ' av vinsten.', cap(prose(p)) + " is the portfolio's largest holding, " + w + ', and accounts for ' + share + ' of the gain.'); topSagd = true; }
    else if (storst) s0 = L(nm(p) + ' är portföljens största innehav, ' + w + '.', cap(prose(p)) + " is the portfolio's largest holding, " + w + '.');
    else s0 = L(nm(p) + ' väger ' + w + ' i portföljen.', cap(prose(p)) + ' is ' + w + ' of the portfolio.');
    // rubriken är en kommande rapport vars datum bolaget inte har bekräftat: ingressen säger det först (2026-10-06)
    if (n.typ === 'kal' && n.e.est) s0 = L('Datumet är preliminärt. ', 'The date is not confirmed. ') + s0;
  }
  const s1 = n
    ? L('Målet är att slå världsindex: portföljen har gett ' + pctS(P.ret) + ' på vad köpen kostade, och samma insats i MSCI World ' + pctS(P.msci_ret) + '.',
      'The aim is to beat the world index: the portfolio has made ' + pctS(P.ret) + ' on what the purchases cost, and the same money in MSCI World ' + pctS(P.msci_ret) + '.')
    : L('Målet är att slå världsindex. Portföljen har gett ' + pctS(P.ret) + ' på vad köpen kostade, och samma insats i MSCI World ' + pctS(P.msci_ret) + '.',
      'The aim is to beat the world index. The portfolio has made ' + pctS(P.ret) + ' on what the purchases cost, and the same money in MSCI World ' + pctS(P.msci_ret) + '.');
  const s2 = share && !topSagd ? L(nm(top) + ' står för ' + share + ' av vinsten.', cap(prose(top)) + ' accounts for ' + share + ' of the gain.') : '';
  const s3 = ed === 'kvall' ? L('Portföljen ' + (P.day_ret >= 0 ? 'steg ' : 'föll ') + pctU(Math.abs(P.day_ret)) + ' ' + onDay(ASOF) + '.', 'The portfolio ' + (P.day_ret >= 0 ? 'rose ' : 'fell ') + pctU(Math.abs(P.day_ret)) + ' ' + onDay(ASOF) + '.') : '';
  // nästa rapport, men inte den som redan är rubriken
  const rubrikRapport = n && n.typ === 'kal' ? n.e : null;
  const ev = events().filter(e => e.d >= dag && !(rubrikRapport && e.d === rubrikRapport.d && e.t === rubrikRapport.t))[0];
  const s4 = ev ? L((rubrikRapport ? 'Därefter: ' : 'Nästa väntade rapport: ') + evName(ev) + ' ' + dS(ev.d) + (ev.est ? ' (prel.)' : '') + (ev.inner ? ', i ' + nm(ev.p) : '') + '.', (rubrikRapport ? 'After that: ' : 'Next expected report: ') + evName(ev) + ' on ' + dS(ev.d) + (ev.est ? ' (prelim.)' : '') + (ev.inner ? ', held through ' + prose(ev.p) : '') + '.') : '';
  return [s0, s1, s2, s3, s4].filter(Boolean).join(' ');
}
function briefPub() {
  // publikläget har bara kvällsupplagan (2026-10-05): dagens rörelser, läget mot världsindex och nästa rapporter
  const ev = events(), lead = L('Mot MSCI World: ' + ppS(P.ret - P.msci_ret) + ' sedan köpen.', 'Against MSCI World: ' + ppS(P.ret - P.msci_ret) + ' since the purchases.');
  const mv = maxBy(POS, p => Math.abs(p.day_local));
  const s1 = L('Största rörelsen var ' + nm(mv) + ', ' + pctS(mv.day_local) + '. Hela portföljen ' + pctS(P.day_ret) + '.', 'The biggest move was ' + prose(mv) + ', ' + pctS(mv.day_local) + '. The whole portfolio ' + pctS(P.day_ret) + '.');
  const s3 = ev.length ? L('Nästa rapporter: ', 'Next reports: ') + evList(ev.slice(0, 4)) + '.' + medNot(ev.slice(0, 4)) : L('Inga rapportdatum i datan.', 'No report dates in the data.');
  return [s1, lead, s3];
}
function dekPub(p) {
  const where = p.chart !== p.held ? L(' (' + p.chart + ')', ' (' + p.chart + ')') : '';
  const s1 = L('Kursen ' + money(p.chart_px, p.chart_ccy) + where + ', ' + pctS(p.ret) + ' sedan köpet och ' + ppS(p.ret - p.msci_ret) + ' mot samma insats i MSCI World.',
    'The price is ' + money(p.chart_px, p.chart_ccy) + where + ', ' + pctS(p.ret) + ' since purchase and ' + ppS(p.ret - p.msci_ret) + ' against the same money in MSCI World.');
  const s2 = malTal(p) === null ? L(' Datakällan har inga optioner för aktien, så ingen riktkurs kan räknas.', ' The data source has no options for the stock, so no price target can be calculated.')
    : L(' Optionerna säger ' + malBelopp(p) + ' om ett år' + (malDatum(p.oiret) ? ' (räknat ' + dS(p.oiret.datum) + ')' : '') + '.',
      ' The options say ' + malBelopp(p) + ' in a year' + (malDatum(p.oiret) ? ' (calculated ' + dS(p.oiret.datum) + ')' : '') + '.');
  return s1 + s2;
}
function chartCaptionPub(p) {
  const o = p.oiret || {}, parts = [L('Så läser du grafen. ', 'How to read the chart. ')];
  parts.push(L('Kursen är ' + px(p.chart_px) + '. De streckade linjerna är nivåer vi följer: ' + levelsText(p) + '. ', 'The price is ' + px(p.chart_px) + '. The dashed lines are levels we follow: ' + levelsText(p) + '. '));
  if (hasOpt(p)) {
    const q = o.quantiles_12m;
    parts.push(L('Till höger om i dag visar solfjädern vad optionspriserna säger om nästa år: hälften av utfallen mellan ' + px(q.q25) + ' och ' + px(q.q75) + ' och det förväntade priset ' + px(o.target_12m) + ', avrundat till riktkursen ' + num(malTal(p), 0) + '.',
      'Right of today, the fan shows what option prices say about the next year: half of outcomes between ' + px(q.q25) + ' and ' + px(q.q75) + ' and the expected price ' + px(o.target_12m) + ', rounded to the price target ' + num(malTal(p), 0) + '.'));
    if (malNot(p)) parts.push(L(' Obs: ' + malNot(p) + '.', ' Note: ' + malNot(p) + '.'));
  } else parts.push(L('Till höger om i dag visar bandet hur långt vanlig svängning brukar nå på 21 handelsdagar. Det är ingen prognos; datakällan har inga optioner för aktien.', 'Right of today, the band shows how far ordinary swings usually reach in 21 trading days. It is not a forecast; the data source has no options for the stock.'));
  if (p.chart !== p.held) parts.push(L(' Grafen visar ' + p.chart + ' i dollar; innehavet är ' + short(p.held) + ' i euro.', ' The chart shows ' + p.chart + ' in dollars; the holding is ' + short(p.held) + ' in euros.'));
  return parts.join('');
}

function headline(ed) {
  if (pub()) return headlinePub(ed);
}

function lede(ed) {
  if (pub()) return ledePub(ed);
}
const byline = () => LV('Skriven av maskinen ur kurserna och dina positionskort. Dina egna ord står i kursiv.',
  'Talen räknas ur marknadsdata; texterna om innehaven skrivs för hand.',
  'Written by the machine from prices and your position cards. Your own words are in italics.',
  'The numbers come from market data; the texts about the holdings are written by hand.');

function briefLabel(ed) {
  const day = edDate(ed);
  let lab = L('Rapporten ' + wd(day) + ' kväll', wd(day) + "'s evening report");
  return lab;
}
function brief(ed) {
  if (pub()) return briefPub(ed);
}

function storyHeadline(p) {
  const n = nm(p);
  if (Math.abs(p.day_local) >= 0.03) return L(n + (p.day_local > 0 ? ' steg ' : ' föll ') + pctU(Math.abs(p.day_local)) + ' ' + onDay(p.asof), n + (p.day_local > 0 ? ' rose ' : ' fell ') + pctU(Math.abs(p.day_local)) + ' ' + onDay(p.asof));
  if (atWeeklyEdge(p)) return L(n + ' vilar på veckokanalens nedre kant', n + ' rests on the lower edge of its weekly channel');
  const closes = p.series.d_close, last = closes[closes.length - 1], hi = Math.max(...closes);
  if (last >= hi) return L(n + ' stängde på ettårshögsta', n + ' closed at a one-year high');
  if (last >= 0.985 * hi) return L(n + ' ' + pctU(1 - last / hi) + ' under ettårstoppen', n + ' ' + pctU(1 - last / hi) + ' below its one-year high');
  if (Math.abs(p.asset_ret) < 0.02) return L(n + ' strax ' + (p.asset_ret < 0 ? 'under' : 'över') + ' köpkursen', n + ' just ' + (p.asset_ret < 0 ? 'below' : 'above') + ' the purchase price');
  return L(n + ' ' + pctS(p.ret) + ' sedan köpet', n + ' ' + pctS(p.ret) + ' since purchase');
}
function heldLine(p) {
  if (p.chart !== p.held && pub()) return L('Ägs som ' + short(p.held) + ' på ' + exchange(p) + ' i euro; grafen och riktkursen gäller ' + p.chart + ' i dollar.',
    'Held as ' + short(p.held) + ' on ' + exchange(p) + ' in euros; the chart and the price target apply to ' + p.chart + ' in dollars.');
  return L(exchange(p) + ', ' + ccyWord(p.ccy) + '. Köpt ' + dSY(p.entry_date) + '.', exchange(p) + ', ' + p.ccy + '. Bought ' + dSY(p.entry_date) + '.');
}
function dek(p) {
  if (pub()) return dekPub(p);
}

/* Faktakollen: maskinens kontroll av varje påstående på kortet. Varje post: {v: dom, c: ok|bad|na, parts: [text | {q: citat}]} */
function checks(p) {
  const out = [], o = p.oiret || {};
  const q = t => ({ q: t });
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
    bits.push(L('Husets test fann inget stöd för att kanalläget förutsäger kommande avkastning.', 'The house test found no evidence that the channel position predicts future returns.'));
    out.push({ v: L('– Beskrivning', '– Description'), c: 'na', parts: [bits.join(' ')] });
  }
  if (hasOpt(p) && pub()) {
    out.push({ v: L('Uträknat', 'Calculated'), c: 'na', parts: [L('Optionerna: förväntat pris om ett år ' + px(o.target_12m) + ', avrundat till riktkursen ' + num(malTal(p), 0) + (malNot(p) ? ' (' + malNot(p) + ')' : '') + '.',
      'The options: expected price in a year ' + px(o.target_12m) + ', rounded to the price target ' + num(malTal(p), 0) + (malNot(p) ? ' (' + malNot(p) + ')' : '') + '.')] });
  }
  else {
    out.push({ v: L('– Går inte', '– Not possible'), c: 'na', parts: [L('Datakällan har inga optioner för ' + p.chart + ', så ingen riktkurs ur optionerna kan räknas.', 'The data source has no options for ' + p.chart + ', so no option price target can be calculated.')] });
  }
  return out;
}

/* ================= DOM-verktyg ================= */
const $ = id => document.getElementById(id);
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; }
function put(parent, nodes) { nodes.forEach(x => { if (x === null || x === undefined || x === '') return; parent.append(typeof x === 'string' ? document.createTextNode(x) : x); }); return parent; }
function partsTo(parent, parts) { parts.forEach(x => { if (typeof x === 'string') parent.append(document.createTextNode(x)); else if (x && x.q !== undefined) parent.append(el('q', 'hans', x.q === null ? '—' : x.q)); }); return parent; }

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
    : L('Samma kronor som varje köp kostade, köpta samma dag i MSCI World (MSCI World Net, i kronor). Summa ' + krS(P.excess_sek) + '. Sålda positioner ingår inte.', 'The amount each purchase cost, invested the same day in MSCI World (MSCI World Net, converted to SEK). Total ' + krS(P.excess_sek) + '. Sold positions are not included.');
}

/* --- gnistan i puffarna --- */
function spark(host, p) {
  const sk = skin(host); host.textContent = '';
  const W = Math.max(120, host.clientWidth || 200), H = 32;
  const svg = sv('svg', { class: 'spark', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': p.chart + L(', 120 dagar', ', 120 days') }, host);
  let lv = [];
  const c = p.series.d_close.slice(-120), lo = Math.min(...c, ...lv), hi = Math.max(...c, ...lv);
  const x = i => 1 + i * (W - 6) / (c.length - 1), y = v => 3 + (H - 6) * (1 - (v - lo) / (hi - lo || 1));
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
  if (pub()) { if (watched(p).length) add(line(sk.regel, 1.2, '5 4'), L('Nivåer vi följer', 'Levels we follow')); }
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
  const rd = regD(p), rw = regW(p), other = pub() ? null : otherLevel(p);
  const lvPub = pub() ? watched(p).filter(v => Math.abs(v / S0 - 1) < 0.35) : [];
  const allD = s.d_dates;
  // kanalens värde per handelsdag: rak linje från start_line vid start till line i dag
  const chanVal = (r, i) => { const a = allD.findIndex(d => d >= r.channel.start); if (a < 0) return null; const span = Math.max(1, total - 1 - a); return { a, v: r.channel.start_line + (r.channel.line - r.channel.start_line) * (i - a) / span }; };
  const wTime = r => { const ta = D(r.channel.start).getTime(), tN = D(allD[total - 1]).getTime(); return i => r.channel.start_line + (r.channel.line - r.channel.start_line) * (D(allD[i]).getTime() - ta) / (tN - ta); };
  // y-skalan bär barerna, SMA, nivåerna, riktkursen, dagskanalen och solfjäderns mittersta hälft
  const vals = [];
  for (let i = off; i < total; i++) [s.d_high[i], s.d_low[i]].forEach(v => ok(v) && vals.push(v));
  // SMA bär skalan bara nära kursen; en SMA 252 långt under (en aktie som dubblats) ritas men klipps
  const hiBar = Math.max(...vals), loBar = Math.min(...vals);
  ['52', '252'].forEach(k => { for (let i = off; i < total; i++) { const v = s.d_sma[k][i]; if (ok(v) && v >= loBar * 0.88 && v <= hiBar * 1.12) vals.push(v); } });
  if (pub()) vals.push(...lvPub);
  if (rd) { const a = Math.max(chanVal(rd, off).a, off); [a, total - 1].forEach(i => { const c = chanVal(rd, i).v; vals.push(c + 2 * rd.channel.sd, c - 2 * rd.channel.sd); }); }
  if (fan) vals.push(fan.q12.q25, fan.q12.q75, o.target_12m); else vals.push(noise(2, T), noise(-2, T));
  const lo = Math.min(...vals) * 0.965, hi = Math.max(...vals) * 1.035;
  const Y = v => m.t + (H - m.t - m.b) * (1 - (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)));
  let aria = p.chart + ': ' + L('kurs ', 'price ') + px(S0) + (lvPub.length ? ', ' + L('nivåer vi följer ', 'levels we follow ') + lvPub.map(px).join(', ') : '') + (fan ? ', ' + L('riktkurs om ett år ', 'price target in a year ') + num(malTal(p), 0) : '');
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, height: H, role: 'img', 'aria-label': aria }, host);
  const id = 'pc' + Math.random().toString(36).slice(2, 7), defs = sv('defs', {}, svg);
  const cp = sv('clipPath', { id: id + 'c' }, defs); sv('rect', { x: m.l, y: m.t, width: pw, height: H - m.t - m.b }, cp);
  const plot = sv('g', { 'clip-path': `url(#${id}c)` }, svg);
  sv('rect', { x: r1(m.l + histW), y: m.t, width: r1(futW), height: H - m.t - m.b, fill: sk.zon }, svg);
  // rutnät och axel till höger
  // axeltal som skulle hamna under en skylt (nivå, riktkurs, förväntat, kurs) ritas inte
  let plateVals = [fan ? o.target_12m : null, S0];
  const plateYs = plateVals.filter(ok).map(Y);
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
  // nivåerna
  const plates = [];
  const hline = (v, col, w, dash, label, plate) => {
    if (!ok(v)) return; const y = Y(v); if (y < m.t || y > H - m.b) return;
    sv('line', { x1: m.l, x2: m.l + pw, y1: r1(y), y2: r1(y), stroke: col, 'stroke-width': w, 'stroke-dasharray': dash || null }, svg);
    if (label) halo(stext(svg, sk, m.l + 6, y - 6, label, { fill: col, 'font-size': 11.5, 'font-weight': 600 }), sk);
    if (plate) plates.push({ y, text: tal(v), color: col });
  };
  if (pub()) lvPub.forEach(v => hline(v, sk.regel, 1, '5 4', L('nivå ', 'level ') + px(v), false));
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
  // rubriken över framtiden får inte gå in i "i dag": i smala fönster en kort rubrik, och ingen om inte ens den får plats
  const fram = fan ? [L('Om 12 månader, enligt optionerna', '12 months ahead, per the options'), L('Om 12 mån.', 'In 12 mo')] : [L('Vanlig svängning, ingen prognos', 'Ordinary swings, not a forecast'), L('Svängning', 'Swings')];
  const framRubrik = fram.find(t => t.length * 6.1 <= pw - histW - 4);
  if (framRubrik) stext(svg, sk, m.l + pw, m.t - 8, framRubrik, { 'font-size': 11, fill: sk.ink2, 'text-anchor': 'end' });
  sv('line', { x1: r1(xi(N - 1)), x2: r1(m.l + histW), y1: r1(Y(S0)), y2: r1(Y(S0)), stroke: sk.ink3, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, svg);
  // optionernas tal
  if (fan) {
    const xe = xf(1), ye = Y(o.target_12m);
    sv('path', { d: `M${r1(xe)} ${r1(ye - 7)} l7 7 l-7 7 l-7 -7 z`, fill: sk.opt, stroke: sk.paper, 'stroke-width': 2 }, svg);
    plates.push({ y: ye, text: pub() ? num(malTal(p), 0) : px(o.target_12m), color: sk.opt });
    const lab = pub() ? L('riktkurs ', 'price target ') + num(malTal(p), 0) + ', ' + pctS(o.er) + (malNot(p) ? ' (' + malNot(p) + ')' : '') : L('förväntat ', 'expected ') + px(o.target_12m) + ', ' + pctS(o.er) + ' (' + oiNote(o, true) + ')';
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
  if (pub()) return chartCaptionPub(p);
}

/* ================= sidornas delar ================= */
/* sidfotens länkar och inställningspanelen ritar om sidan med samma funktion som toppradens knappar */
let andraLage = null, panelLyssnar = false;
function controls(host, onChange) {
  andraLage = onChange;
  // knappen som hade fokus får tillbaka det efter omritningen (tangentbordet tappar inte platsen)
  const prevK = document.activeElement && host.contains(document.activeElement) ? document.activeElement.dataset.k : null;
  host.textContent = '';
  const btn = (label, pressed, fn, k) => { const b = el('button', null, label); b.type = 'button'; b.dataset.k = k; b.setAttribute('aria-pressed', String(pressed)); b.addEventListener('click', fn); return b; };
  const g1 = el('div', 'seg'); g1.setAttribute('role', 'group');
  if (pub()) {
    // sajten: bara kvällsupplagan, så växeln byter färgläge (ljust är förval)
    g1.setAttribute('aria-label', L('Färgläge', 'Colour mode'));
    g1.append(btn(L('Ljust', 'Light'), state.tema !== 'mork', () => onChange({ tema: 'ljus' }), 'ljus'), btn(L('Mörkt', 'Dark'), state.tema === 'mork', () => onChange({ tema: 'mork' }), 'mork'));
  } else {
  }
  const g2 = el('div', 'seg'); g2.setAttribute('role', 'group'); g2.setAttribute('aria-label', L('Språk', 'Language'));
  g2.append(btn('SV', !en(), () => onChange({ lang: 'sv' }), 'sv'), btn('EN', en(), () => onChange({ lang: 'en' }), 'en'));
  const pb = el('button', 'solo'); pb.type = 'button'; pb.dataset.k = 'publik'; pb.setAttribute('aria-pressed', String(state.publik));
  pb.append(el('i'), document.createTextNode(L('Publik', 'Public')));
  pb.title = L('Publik upplaga: döljer kronor och antal, visar procent och vikter', 'Public edition: hides SEK amounts and quantities, shows percentages and weights');
  pb.addEventListener('click', () => onChange({ publik: !state.publik }));
  if (pub()) {
    // sajten (2026-10-05 kväll): ingen synlig rad med val; en liten knapp öppnar en panel med färgläge och språk, och
    // samma val står som länkar i sidfoten
    const oppen = host.dataset.oppen === '1';
    const knapp = el('button', 'inst-knapp'); knapp.type = 'button'; knapp.dataset.k = 'installningar';
    knapp.setAttribute('aria-expanded', String(oppen)); knapp.setAttribute('aria-controls', 'inst-panel');
    knapp.setAttribute('aria-label', L('Visning och språk', 'Display and language')); knapp.title = L('Visning och språk', 'Display and language');
    knapp.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor"/></svg>';
    const panel = el('div', 'inst-panel'); panel.id = 'inst-panel'; panel.hidden = !oppen;
    panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', L('Visning och språk', 'Display and language'));
    const rad = (lab, g) => { const r = el('div', 'rad'); r.append(el('span', null, lab), g); return r; };
    panel.append(rad(L('Färgläge', 'Colour mode'), g1), rad(L('Språk', 'Language'), g2));
    const satt = v => { host.dataset.oppen = v ? '1' : ''; panel.hidden = !v; knapp.setAttribute('aria-expanded', String(v)); };
    knapp.addEventListener('click', e => { e.stopPropagation(); satt(panel.hidden); });
    panel.addEventListener('click', e => e.stopPropagation());
    if (!panelLyssnar) {
      panelLyssnar = true;
      const stang = () => { const h = document.getElementById('ctrls'), p = document.getElementById('inst-panel'), k = h && h.querySelector('.inst-knapp');
        if (!p || p.hidden) return; h.dataset.oppen = ''; p.hidden = true; if (k) k.setAttribute('aria-expanded', 'false'); return k; };
      document.addEventListener('click', stang);
      document.addEventListener('keydown', e => { if (e.key === 'Escape') { const k = stang(); if (k) k.focus(); } });
    }
    host.append(knapp, panel);
  } else host.append(g1, g2);
  if (!PUBLIK_ENDAST) host.append(pb);
  if (prevK) { const b = host.querySelector('[data-k="' + prevK + '"]'); if (b) b.focus(); }
}
function ears(left, right, ed) {
  left.textContent = ''; right.textContent = '';
  const np = document.getElementById('np-link'); if (np) np.href = href('index.html');
  const day = edDate(ed);
  // sajten uppdateras efter stängningen när datan är klar (22:15 eller 22:30), så örat säger ingen fast tid
  let upplagan = L('Kvällsupplagan, efter stängningen', 'Evening edition, after the close');
  put(left, [el('strong', null, cap(wd(day)) + ' ' + dL(day)), el('br'), upplagan]);
  const nar = wd(BUILT) + ' ' + dS(BUILT) + ' ' + hhmm(BUILT);
  put(right, [el('strong', null, L('Kurser: stängning ' + wd(ASOF) + ' ' + dS(ASOF), 'Prices: close ' + wd(ASOF) + ' ' + dS(ASOF))), el('br'),
    PROTOTYP ? L('Byggd ' + nar + ', prototyp', 'Built ' + nar + ', prototype') : L('Uppdaterad ' + nar, 'Updated ' + nar)]);
}
function strip(host) {
  host.textContent = '';
  const cell = (lab, val, sub, cls) => { const c = el('div', 'cell'); c.append(el('span', 'lab', lab)); const v = el('span', 'val', val); if (cls) v.classList.add(cls); c.append(v); if (sub) c.append(el('span', 'sub', sub)); host.append(c); };
  const R = P.risk || {};
  if (pub()) {
    cell(L('Avkastning', 'Return'), pctS(P.ret), L('på vad köpen kostade', 'on what the purchases cost'));
    cell(cap(wd(ASOF)), pctS(P.day_ret), L('på dagen', 'on the day'), P.day_ret >= 0 ? 'pos' : 'neg');
    cell(L('Mot MSCI World', 'vs MSCI World'), ppS(P.ret - P.msci_ret), L('index gav ' + pctS(P.msci_ret) + ' på samma insats', 'the index made ' + pctS(P.msci_ret) + ' on the same money'));
    const ev = events()[0];
    cell(L('Nästa rapport', 'Next report'), ev ? dS(ev.d) : '—', ev ? evName(ev) + (ev.inner ? L(' (i ' + nm(ev.p) + ')', ' (in the ' + nm(ev.p) + ')') : '') + (ev.est ? L(', prel. datum', ', prelim. date') : '') : '');
    const big = BYW[0]; cell(L('Största vikt', 'Largest weight'), nm(big) + ' ' + pctU(big.weight, 0), L(POS.length + ' innehav', POS.length + ' holdings'));
    cell(L('Risk', 'Risk'), pctU(R.vol_ann, 0), L('volatilitet per år, beta ' + num(R.beta_msci, 2) + ' mot MSCI World', 'volatility per year, beta ' + num(R.beta_msci, 2) + ' to MSCI World'));
    return;
  }
}
function teaser(p) {
  const a = el('article', 'story');
  a.append(el('p', 'kicker', p.name));
  a.append(el('p', 'held', heldLine(p)));
  const h = el('h3'); const link = el('a', null, storyHeadline(p)); link.href = href('position.html', p.id); h.append(link); a.append(h);
  if (pub()) { const st = senasteText(p); if (st) a.append(el('p', 'senaste', st)); }
  const sp = el('div', 'sparkholder'); sp.dataset.id = p.id; a.append(sp);
  const foot = el('div', 'storyfoot');
  if (pub()) foot.append(el('span', null, L('Mot MSCI World ', 'vs MSCI World ') + ppS(p.ret - p.msci_ret)), el('span', null, L('Riktkurs ', 'Price target ') + (malTal(p) === null ? '—' : num(malTal(p), 0))));
  a.append(foot);
  const f = el('dl', 'facts'), o = p.oiret || {};
  const add = (dt, nodes) => { f.append(el('dt', null, dt)); const dd = el('dd'); put(dd, nodes); f.append(dd); };
  add(L('Vikt', 'Weight'), [pctU(p.weight, 0) + (pub() ? '' : ', ' + kr(p.value_sek))]);
  add(L('Resultat', 'Result'), [el('span', p.ret >= 0 ? 'pos' : 'neg', pctS(p.ret)), el('span', 'sub2', L(' kurs ', ' price ') + pctS(p.asset_ret) + L(', valuta ', ', currency ') + pctS(p.fx_ret) + divTxt(p, ', '))]);
  if (pub()) {
    // faktalistan är börslistan i smala fönster: samma kolumner, och nivåerna står bara i positionens graf
    add(L('Riktkurs', 'Price target'), [malText(p)].concat(hasOpt(p) ? [', ' + tillRikt(p) + L(' från i dag', ' from today')] : []).concat(malNot(p) ? [el('br'), el('span', 'sub2', malNot(p))] : []));
    add(L('Rapport', 'Report'), [calText(p)]);
    a.append(f);
    return a;
  }
}
function calText(p) {
  const c = (p.calendar || []).filter(e => e.date).slice().sort((a, b) => a.date.localeCompare(b.date));
  return c.length ? c.map(e => dS(e.date) + (e.estimate === true ? L(' (prel.)', ' (prelim.)') : '') + (e.ticker !== p.chart && e.ticker !== p.held ? ' ' + (CAL[e.ticker] || e.ticker) : '')).join(', ') : '—';
}
function calendarList(host) {
  host.textContent = '';
  events().forEach(e => { const li = el('li'); const t = el('time', null, dS(e.d)); t.setAttribute('datetime', e.d); li.append(t, el('span', null, L('Rapport, ', 'Report, ') + evName(e) + (e.inner ? L(' (i ' + nm(e.p) + ')', ' (in the ' + nm(e.p) + ')') : '') + (e.est ? L(', datum preliminärt', ', date not confirmed') : ''))); host.append(li); });
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
function borslistanPub(host, subHost) {
  host.textContent = '';
  subHost.textContent = L('Ordnad efter vikt. Riktkursen är optionsprisernas förväntade pris om ett år (studien från 2026), avrundat; avståndet räknas från dagens kurs.',
    "Ordered by weight. The price target is the expected price in a year implied by option prices (the 2026 study), rounded; the distance is from today's price.");
  const cols = [[L('Innehav', 'Holding'), 'l'], [L('Vikt', 'Weight')], [L('Sedan köp', 'Since purchase')], [L('Mot MSCI World', 'vs MSCI World')], [L('Riktkurs om ett år', 'Price target in a year')], [L('Till riktkursen', 'To price target')], [L('Rapport', 'Report')]];
  const thead = el('thead'), hr = el('tr'); cols.forEach(([h, c]) => { const th = el('th', c || null, h); th.scope = 'col'; hr.append(th); }); thead.append(hr); host.append(thead);
  const body = el('tbody');
  BYW.forEach(p => {
    const tr = el('tr');
    const td = (nodes, cls) => { const c = el('td', cls || null); put(c, nodes); tr.append(c); };
    const a = el('a', null, nm(p)); a.href = href('position.html', p.id);
    const nmSpan = el('span', 'nm'); nmSpan.append(a);
    td([nmSpan, el('span', 's', p.chart !== p.held ? short(p.held) + L(' i ', ' in ') + p.ccy + L(', graf ', ', chart ') + p.chart : short(p.held) + ' ' + px(p.px) + ' ' + p.ccy)]);
    td([pctU(p.weight, 0)]);
    td([el('span', p.ret >= 0 ? 'pos' : 'neg', pctS(p.ret)), el('span', 's', L('kurs ', 'price ') + sgn(p.asset_ret * 100, 1) + L(', valuta ', ', currency ') + sgn(p.fx_ret * 100, 1) + (ok(p.div_ret) && p.div_ret > 0 ? L(', utd. ', ', div. ') + sgn(p.div_ret * 100, 1) : ''))]);
    td([ppS(p.ret - p.msci_ret), el('span', 's', 'MSCI ' + pctS(p.msci_ret))]);
    td(malTal(p) === null ? ['—', el('span', 's', L('inga optioner', 'no options'))] : [num(malTal(p), 0), el('span', 's', malNot(p) || ccyWord(p.chart_ccy))]);
    td(hasOpt(p) ? [tillRikt(p), el('span', 's', L('från ', 'from ') + px(p.chart_px) + (p.chart !== p.held ? ' (' + p.chart + ')' : ''))] : ['—']);
    const cal = (p.calendar || []).filter(e => e.date).slice().sort((x, y) => x.date.localeCompare(y.date));
    const inner = cal.filter(e => e.ticker !== p.chart && e.ticker !== p.held);
    const prel = kalPrel(cal);
    td(cal.length ? [dS(cal[0].date)].concat(inner.length || prel ? [el('span', 's', [inner.map((e, i) => (CAL[e.ticker] || e.ticker) + (i ? ' ' + dS(e.date) : '')).join(', '), prel].filter(Boolean).join(', '))] : []) : ['—']);
    body.append(tr);
  });
  host.append(body);
}
function borslistan(host, subHost) {
  if (pub()) return borslistanPub(host, subHost);
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
  const nar = wd(BUILT) + ' ' + dS(BUILT) + ' ' + hhmm(BUILT);
  const left = el('span'); left.textContent = PROTOTYP
    ? L('Datans ålder: stängning ' + wd(ASOF) + ' ' + dSY(ASOF) + ', byggd ' + nar + '. Prototypdata ur Yahoo Finance, MSCI, Eurex, Cboe och FRED.', 'Data age: close ' + wd(ASOF) + ' ' + dSY(ASOF) + ', built ' + nar + '. Prototype data from Yahoo Finance, MSCI, Eurex, Cboe and FRED.')
    : L('Datans ålder: stängning ' + wd(ASOF) + ' ' + dSY(ASOF) + ', uppdaterad ' + nar + '. Data ur Yahoo Finance, MSCI, Eurex, Cboe och FRED.', 'Data age: close ' + wd(ASOF) + ' ' + dSY(ASOF) + ', updated ' + nar + '. Data from Yahoo Finance, MSCI, Eurex, Cboe and FRED.');
  const right = el('span'); const a = el('a', null, pub() ? L('Om portföljen: syftet och metoden', 'About the portfolio: the aim and the method') : L('Så räknas talen: metoden', 'How the numbers are made: the method')); a.href = href('metod.html'); right.append(a);
  if (pub()) {
    // färgläge och språk också här nere, som länkar (toppens panel är gömd tills någon öppnar den)
    const val = (text, k, patch) => { const b = el('button', 'fotval', text); b.type = 'button'; b.dataset.k = k; if (patch.lang) b.lang = patch.lang; b.addEventListener('click', () => andraLage && andraLage(patch)); return b; };
    right.append(document.createTextNode(' · '), state.tema === 'mork' ? val(L('Ljust läge', 'Light mode'), 'fot-ljus', { tema: 'ljus' }) : val(L('Mörkt läge', 'Dark mode'), 'fot-mork', { tema: 'mork' }),
      document.createTextNode(' · '), en() ? val('På svenska', 'fot-sv', { lang: 'sv' }) : val('In English', 'fot-en', { lang: 'en' }));
  }
  host.append(left, right);
}

/* ================= sidorna ================= */
let fontsReady = false, redraw = null, resizeHooked = false;
function whenFonts(fn) { if (fontsReady) { fn(); return; } const go = () => { fontsReady = true; fn(); }; if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go(); }
function onResize(fn) { let t; root.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fn, 150); }); }
function setRedraw(fn) { redraw = fn; if (!resizeHooked) { resizeHooked = true; onResize(() => redraw && redraw()); } }

/* notisen: syftet, en gång per webbläsare (publikt, "en notis som folk får en gång"). Den räknas som sedd när
   den visas; under samma sidvisning står den kvar vid omritning (språk, färgläge) tills Okej. Utan lagring visas den
   varje gång. */
let notisLage = null;  // null: inte avgjort; 'visas': visas under den här sidvisningen; 'stangd': stängd eller redan sedd
function notis() {
  const old = document.querySelector('.notis'); if (old) old.remove();
  if (!pub()) return;
  if (notisLage === null) { notisLage = pref.get('notis') === 'sedd' ? 'stangd' : 'visas'; pref.set('notis', 'sedd'); }
  if (notisLage !== 'visas') return;
  const box = el('section', 'notis'); box.setAttribute('aria-labelledby', 'notis-h');
  const h = el('h2', null, L('Här försöker vi slå världsindex', "We're trying to beat the world index")); h.id = 'notis-h';
  const lead = Math.abs(P.ret - P.msci_ret) * 100;
  box.append(h, el('p', null, L('Varje köp jämförs med samma insats, samma dag, i MSCI World, indexet som fonden iShares Core MSCI World följer. Just nu ligger portföljen ' + num(lead, 1) + ' procentenheter ' + leadWord() + ' indexet.',
    'Every purchase is compared with the same money, on the same day, in MSCI World, the index tracked by the iShares Core MSCI World fund. Right now the portfolio is ' + num(lead, 1) + ' percentage points ' + leadWord() + ' the index.')));
  const row = el('p', 'notis-rad');
  const b = el('button', null, L('Okej', 'Got it')); b.type = 'button';
  b.addEventListener('click', () => { notisLage = 'stangd'; box.remove(); });
  const a = el('a', null, L('Läs mer om portföljen', 'Read more about the portfolio')); a.href = href('metod.html');
  row.append(b, a); box.append(row);
  const anchor = document.querySelector('.rules'); if (anchor) anchor.after(box); else document.querySelector('.sheet').prepend(box);
}

function forsta() {
  applyRoot();
  const ed = upplaga();
  let titel = L('Kvällsupplagan', 'Evening edition');
  document.title = 'Portföljen · ' + titel;
  $('tag').textContent = pub() ? L('Försöket att slå världsindex: varje köp jämförs med samma insats i MSCI World samma dag.', 'Trying to beat the world index: every purchase is compared with the same money in MSCI World on the same day.')
    : L('En tidning om fem positioner, skriven av maskinen två gånger om dagen.', 'A newspaper about five positions, written by the machine twice a day.');
  controls($('ctrls'), ch => { setState(ch, true); forsta(); });
  ears($('ear-left'), $('ear-right'), ed);
  notis();
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

/* positionssidan, publikt: tankarna (bloggen), sedan senaste händelsen och riktkursen i rutorna under */
function tankarRuta(host, p) {
  host.textContent = '';
  host.append(el('h2', null, L('Tankar', 'Thoughts')));
  const t = tankar(p);
  if (!t.length) { host.append(el('p', 'empty', L('— inget skrivet ännu', '— nothing written yet'))); return; }
  t.forEach(x => {
    const a = el('article', 'post'), tm = el('time', null, dSY(x.datum)); tm.setAttribute('datetime', x.datum);
    a.append(tm, el('p', null, L(x.sv, x.en || x.sv))); host.append(a);
  });
}
function senasteRuta(pl, p) {
  const b = senaste(p);
  if (!b) { pl.append(el('p', 'empty', L('— inget skrivet ännu', '— nothing written yet'))); return; }
  const d = el('div'); d.append(el('b', null, dSY(b.datum)), el('p', 'plain', senasteText(p)));
  const k = el('p', 'kallor'); k.append(document.createTextNode(L('Källor: ', 'Sources: ')));
  (b.kallor || []).forEach((s, i) => { const a = el('a', null, L(s.sv, s.en)); a.href = s.url; a.rel = 'noopener noreferrer'; if (i) k.append(document.createTextNode('; ')); k.append(a); });
  k.append(document.createTextNode(L('. Reaktionen är egen beräkning ur stängningskurser.', '. The reaction is our own calculation from closing prices.')));
  d.append(k); pl.append(d);
}
function optPub(ob, marks, p, o) {
  marks.append(el('span', 'mark', o.metod === 'yta' ? L('volatilitetsytan', 'volatility surface') : L('lösenpriser med bud', 'strikes with bids')));
  if (o.kalla === 'Eurex') marks.append(el('span', 'mark', L('Eurex avräkningspriser', 'Eurex settlement prices')));
  if (o.kalla === 'EWY') marks.append(el('span', 'mark', L('optionerna på EWY', 'the options on EWY')));
  if (o.approx) marks.append(el('span', 'mark warn', L('bara ca ' + approxMonths(o) + ' mån optioner', 'only about ' + approxMonths(o) + ' months of options')));
  if (outside(o)) marks.append(el('span', 'mark warn', isEtf(o) ? L('ETF utanför studiens bevis', "ETF outside the study's evidence") : L('utanför studiens bevis', "outside the study's evidence")));
  ob.append(marks);
  if (o.kalla === 'Eurex') ob.append(el('p', null, L('Optionerna handlas på Eurex i Frankfurt, inte hos datakällan. Riktkursen räknas ur Eurex dagliga avräkningspriser med samma metod som för de amerikanska aktierna, och med euroräntan ' + pctU(o.rf, 2) + ' som priserna själva ger. Studien prövade bara aktier i S&P 500.',
    'The options trade on Eurex in Frankfurt, not at the data source. The price target is calculated from Eurex daily settlement prices with the same method as the US stocks, using the euro rate of ' + pctU(o.rf, 2) + ' that the prices themselves imply. The study only tested S&P 500 stocks.')));
  if (o.kalla === 'EWY') ob.append(el('p', null, L('Fondens egna optioner har för få bud för metoden. Riktkursen räknas därför ur optionerna på EWY, en annan fond med samma koreanska storbolag: de två har rört sig nästan exakt lika det senaste året (korrelation 0,997). Studien prövade bara aktier i S&P 500, inte fonder.',
    "The fund's own options have too few bids for the method. The price target is therefore calculated from the options on EWY, another fund holding the same large Korean companies: the two have moved almost exactly alike over the past year (correlation 0.997). The study only tested S&P 500 stocks, not funds.")));
  ob.append(el('p', null, L('Riktkursen är ' + malBelopp(p) + ': det förväntade priset om ett år enligt optionspriserna' + (malDatum(o) ? ' ' + dS(o.datum) : '') + ', ' + px(o.target_12m) + ', avrundat. Det är ' + pctS(o.er) + ' från dagens kurs. Medianen är ' + px(o.median_12m) + '.',
    'The price target is ' + malBelopp(p) + ': the expected price in a year according to option prices' + (malDatum(o) ? ' on ' + dS(o.datum) : '') + ', ' + px(o.target_12m) + ', rounded. That is ' + pctS(o.er) + " from today's price. The median is " + px(o.median_12m) + '.')));
  const tb = el('table', 't'); const h = el('tr'); [L('Utfall om ett år', 'Outcome in a year'), '5 %', '25 %', '50 %', '75 %', '95 %'].forEach(x => h.append(el('th', null, x))); tb.append(h);
  const r = el('tr'); r.append(el('td', null, L('Kurs', 'Price'))); ['q5', 'q25', 'q50', 'q75', 'q95'].forEach(k => r.append(el('td', null, px(o.quantiles_12m[k])))); tb.append(r); ob.append(tb);
  const src = el('p', 'muted'); src.append(document.createTextNode(L('Metod: Martin, Rodenkirchen, Wagner och Wang (2026); ', 'Method: Martin, Rodenkirchen, Wagner and Wang (2026); ')));
  const la = el('a', null, L('författarnas sida', "the authors' page")); la.href = 'https://personal.lse.ac.uk/martiniw/oiret.html'; la.rel = 'noopener noreferrer';
  src.append(la, document.createTextNode(L('. Nästa rapport: ', '. Next report: ') + calText(p) + '.')); ob.append(src);
}

function positionssida() {
  applyRoot();
  const ed = upplaga();
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
    a.append(el('b', null, nm(q)), document.createTextNode(pub() ? pctS(q.ret) + L(' sedan köp', ' since purchase') : stateOf(q).sym + ' ' + stateWord(q) + ', ' + pctS(q.ret)));
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
  fig(L('Sedan köp', 'Since purchase'), pctS(p.ret), (pub() ? L('kurs ', 'price ') + pctS(p.asset_ret) + L(', valuta ', ', currency ') + pctS(p.fx_ret) : krS(p.pnl_sek) + L('; kurs ', '; price ') + pctS(p.asset_ret) + L(', valuta ', ', currency ') + pctS(p.fx_ret)) + divTxt(p, ', '), p.ret >= 0 ? 'pos' : 'neg');
  fig(L('Vikt', 'Weight'), pctU(p.weight, 1), L('andel av risken ', 'share of risk ') + pctU(((P.risk || {}).contrib || {})[p.id], 0));
  fig(L('Mot MSCI World', 'vs MSCI World'), pub() ? ppS(p.ret - p.msci_ret) : krS(p.excess_sek), L('MSCI World samma dag ', 'MSCI World from the same day ') + pctS(p.msci_ret));
  if (pub()) {
    fig(L('Riktkurs om ett år', 'Price target in a year'), malBelopp(p), malTal(p) === null ? L('inga optioner hos datakällan', 'no options at the data source') : (malNot(p) || L('ur optionspriserna', 'from option prices')));
    fig(L('Nästa rapport', 'Next report'), calText(p), L('ur kalendern', 'from the calendar'));
  }
  chartLegend($('legend'), p);
  $('caption').textContent = chartCaption(p);
  // tankarna (publikt, bloggformat) i stället för kortets fält och faktakollen (privat)
  const yd = $('yours'), ol = $('check'), tk = $('tankar');
  yd.textContent = ''; ol.textContent = ''; $('yours-h').textContent = ''; $('check-h').textContent = '';
  $('twocol').classList.toggle('blogg', pub());
  tk.hidden = !pub(); tk.textContent = '';
  if (pub()) tankarRuta(tk, p);
  // rutan under tankarna (publikt) eller faktakollen (privat)
  $('plan-h').textContent = L('Senaste', 'Latest');
  const pl = $('plan-body'); pl.textContent = '';
  if (pub()) senasteRuta(pl, p);
  // optionerna
  $('opt-h').textContent = pub() ? L('Riktkursen om ett år, ur optionspriserna', 'The price target in a year, from option prices') : L('Optionerna om ett år', 'The options in a year');
  const ob = $('opt-body'); ob.textContent = '';
  const o = p.oiret || {};
  const marks = el('div', 'marks');
  if (!hasOpt(p)) { marks.append(el('span', 'mark warn', L('inga optioner', 'no options'))); ob.append(marks, el('p', null, L('Datakällan har inga optioner för ' + p.chart + ', så maskinen visar vanlig svängning i stället för en riktkurs.', 'The data source has no options for ' + p.chart + ', so the machine shows ordinary swings instead of a price target.'))); }
  else if (pub()) optPub(ob, marks, p, o);
  // talen bakom grafen
  const tt = $('chart-table'); tt.textContent = '';
  const rows = [[L('Stängning ', 'Close ') + dS(p.asof), px(p.chart_px)], ['SMA 52 / SMA 252 ' + L('(dag)', '(daily)'), px(p.sma_d['52'].v) + ' / ' + px(p.sma_d['252'].v)]];
  if (pub()) { if (watched(p).length) rows.push([L('Nivåer vi följer', 'Levels we follow'), watched(p).map(px).join(', ')]); }
  if (regD(p)) { const c = regD(p).channel; rows.push([L('Kanalen i dag: nedre, mitt, övre', 'Channel today: lower, mid, upper'), px(c.lower) + ', ' + px(c.line) + ', ' + px(c.upper)]); }
  if (hasOpt(p)) { rows.push([L('Optionerna om ett år: 5, 25, 50, 75, 95 %', 'Options in a year: 5, 25, 50, 75, 95%'), ['q5', 'q25', 'q50', 'q75', 'q95'].map(k => px(o.quantiles_12m[k])).join(', ')]); rows.push([L('Förväntat pris om ett år', 'Expected price in a year'), px(o.target_12m) + ' (' + (pub() ? (malNot(p) || (o.metod === 'yta' ? L('volatilitetsytan', 'volatility surface') : L('lösenpriser med bud', 'strikes with bids'))) : oiNote(o, true)) + ')']); if (pub()) rows.push([L('Riktkursen, avrundad', 'The price target, rounded'), num(malTal(p), 0)]); }
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
  document.title = pub() ? L('Om portföljen · Portföljen', 'About · Portföljen') : L('Metoden · Portföljen', 'The method · Portföljen');
  $('tag').textContent = '';
  const back = el('a', null, L('← Förstasidan', '← Front page')); back.href = href('index.html'); $('tag').append(back);
  controls($('ctrls'), ch => { setState(ch, true); metod(); });
  ears($('ear-left'), $('ear-right'), upplaga());
  const host = $('metod'); host.textContent = '';
  const content = root.TidningMetod ? root.TidningMetod(api) : [];
  const toc = $('toc'); toc.textContent = '';
  $('m-h1').textContent = pub() ? L('Om portföljen', 'About the portfolio') : L('Så räknas talen', 'How the numbers are made');
  $('m-ingress').textContent = L('Ett öppet försök att slå världsindex. Här står vad sidan mäter, hur riktkurserna räknas och vad den inte visar.', 'An open attempt to beat the world index. This page says what the site measures, how the price targets are calculated and what it does not show.');
  // kolumnerna överst (publikt): en kort text per huvudsektion och en länk ned till den
  const oldKol = document.querySelector('.om-kol'); if (oldKol) oldKol.remove();
  if (pub()) {
    const kol = el('section', 'om-kol'); kol.setAttribute('aria-label', L('Om portföljen i korthet', 'The portfolio in brief'));
    content.forEach((sec, i) => { if (!sec.kol) return; const d = el('div'); d.append(el('h2', null, sec.h), el('p', null, sec.kol)); const a = el('a', null, L('Läs mer', 'Read more')); a.href = '#m' + (i + 1); d.append(a); kol.append(d); });
    const mh = document.querySelector('.mhead'); if (mh) mh.after(kol);
  }
  content.forEach((sec, i) => {
    const s = el('section', 'msec'); s.id = 'm' + (i + 1);
    s.append(el('h2', null, sec.h));
    sec.body.forEach(b => {
      if (typeof b === 'string') s.append(el('p', null, b));
      else if (b.ul) { const ul = el('ul'); b.ul.forEach(t => ul.append(el('li', null, t))); s.append(ul); }
      else if (b.table) { const tb = el('table', 't'); const h = el('tr'); b.table[0].forEach(x => h.append(el('th', null, x))); tb.append(h); b.table.slice(1).forEach(r => { const tr = el('tr'); r.forEach(x => tr.append(el('td', null, x))); tb.append(tr); }); s.append(tb); }
      else if (b.src) { const ps = el('p', 'src', b.src); if (b.url) { const a = el('a', null, b.urlText || b.url); a.href = b.url; a.rel = 'noopener noreferrer'; ps.append(document.createTextNode(' '), a); } s.append(ps); }
    });
    host.append(s);
    const li = el('li'), a = el('a', null, sec.h); a.href = '#m' + (i + 1); li.append(a); toc.append(li);
  });
  footer($('foot'));
}

const api = {
  S, P, POS, BYW, ASOF, BUILT, PROTOTYP, state, setState, applyRoot, href, L, LV, en, pub, upplaga, tema,
  fmt: { num, sgn, pctU, pctS, pct0, ppS, kr, krS, kronor, px, money, tal, dS, dSY, dL, wd, cap, onDay },
  nm, prose, pos, watched, levelsText, malTal, malNot, malBelopp, senaste, senasteText, regD, regW, hasOpt, oiNote, events, evList, edDate, approxMonths, outside, short, exchange, calText,
  text: { headline, lede, byline, brief, briefLabel, storyHeadline, heldLine, dek, checks, chartCaption, barsNote },
  chart: { gauge, gaugeKeys, excess, bars, spark, positionChart, chartLegend, skin },
  dom: { el, put, partsTo, controls, ears, strip, calendarList, markets, borslistan, footer, teaser },
  forsta, positionssida, metod, whenFonts, onResize,
};
root.Tidning = api;
})(window);
