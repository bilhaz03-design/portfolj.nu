/* Metodsidans text på svenska och engelska. Talen hämtas ur datan via Tidning-api:t, så sidan och tidningen
   aldrig säger olika saker. Ytmetodens mål är avskrivna ur portfolj/prototyp/surface_result_flat.json (2026-10-04). */
window.TidningMetod = function (T) {
  'use strict';
  const { L, LV, pub, fmt, POS, P } = T;
  const nr = T.near(), nd = T.ruleDist(nr);
  const R = P.risk || {};
  const oi = T.S.oiret_inputs || {};
  const meta = T.S.meta || {};
  const raw = id => { const p = T.pos(id); return p && p.oiret && !p.oiret.err ? fmt.px(p.oiret.target_12m) : '—'; };
  const surface = { PLTR: 221.58965607702896, NVDA: 250.26460109569157, EME: 845.095763918052 };
  const ordet = n => (T.en() ? ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'] : ['noll', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio'])[n] || String(n);
  const names = POS.map(T.nm);
  const nameList = names.slice(0, -1).join(', ') + L(' och ', ' and ') + names[names.length - 1];
  return [
    { h: L('Vad det här är', 'What this is'), body: [
      L('Portföljen följer ' + ordet(POS.length) + ' verkliga positioner: ' + nameList + '. För varje position finns ett kort som ägaren fyller i för hand: tes, ankarpunkter, glidande medelvärden, nivåer, exitregel, mål och plan. Maskinen gör kortet levande. Ägarens ord står kvar oförändrade, i kursiv, och allt som går att mäta räknas om och prövas mot ägarens egna regler.',
        'Portföljen follows ' + ordet(POS.length) + ' real positions: ' + nameList + '. Each position has a card the owner fills in by hand: thesis, anchor points, moving averages, levels, exit rule, target and plan. The machine brings the card to life. The owner\'s words stay as written, in italics, and everything that can be measured is recalculated and tested against the owner\'s own rules.'),
      L('Tidningen kommer i två upplagor. Morgonupplagan 09:00 säger vad som är värt att bevaka under dagen. Kvällsupplagan 22:15 säger vad som hände, en kvart efter att den amerikanska börsen stängt.',
        'The paper comes in two editions. The 09:00 morning edition says what is worth watching during the day. The 22:15 evening edition says what happened, a quarter of an hour after the US market closes.'),
      L('Den här versionen är en prototyp med riktiga kurser från stängningen ' + fmt.wd(T.ASOF) + ' ' + fmt.dSY(T.ASOF) + '. Rapporterna körs ännu inte automatiskt.',
        'This version is a prototype with real prices from the close on ' + fmt.wd(T.ASOF) + ', ' + fmt.dSY(T.ASOF) + '. The reports do not yet run automatically.'),
    ] },
    { h: L('Mallen', 'The template'), body: [
      L('Varje kort har samma fält, i samma ordning:', 'Every card has the same fields, in the same order:'),
      { ul: [
        L('Position: instrument, köp, bias och en kort tes.', 'Position: instrument, purchase, bias and a short thesis.'),
        L('Regression: ankarpunkter på vecko-, dags- och fyratimmarsgrafen, och en kommentar.', 'Regression: anchor points on the weekly, daily and four-hour charts, and a comment.'),
        L('SMA: läget mot glidande medelvärden på 21, 52, 126 och 252 dagar och veckor.', 'SMA: position against the 21, 52, 126 and 252-day and week moving averages.'),
        L('Nivåer: varningsnivå på fyratimmarsgrafen, huvudnivå på dagsgrafen och exitbekräftelse, direkt eller efter två stängningar.', 'Levels: a warning level on the four-hour chart, a main level on the daily chart and an exit confirmation, immediate or after two closes.'),
        L('Mål, händelser och plan: håller så länge, orolig om, säljer om.', 'Target, events and plan: holds as long as, worried if, sells if.'),
      ] },
      L('Tomma fält visas som tomma. Maskinen skriver aldrig text i ägarens fält.', 'Empty fields are shown as empty. The machine never writes in the owner\'s fields.'),
    ] },
    { h: L('Vad maskinen kontrollerar', 'What the machine checks'), body: [
      { ul: [
        L('Glidande medelvärden. Står det ”äntligen över SMA 252” kontrolleras att kursen ligger över SMA 252, och hur långt över.', 'Moving averages. If the card says "finally above the SMA 252", the machine checks that the price is above it, and by how much.'),
        L('Ankarpunkter. Varje ankare letas upp i kursdatan och avvikelsen redovisas.', 'Anchor points. Every anchor is located in the price data and the deviation is reported.'),
        L('Regressionskanaler. Kanalen från ankaret ritas som TradingViews Regression Trend: minsta kvadrat på stängningskursen, band på två standardavvikelser. Husets eget test fann ingen köp- eller säljfördel i kanalläget, så kanalen beskriver men signalerar inte.', 'Regression channels. The channel from the anchor is drawn like TradingView\'s Regression Trend: least squares on the close, bands at two standard deviations. The house\'s own test found no buy or sell edge in the channel position, so the channel describes but does not signal.'),
        L('Motsägelser. Säger ett kort både ”Bullish” och ”Svag bear” flaggas det, utan att maskinen gissar vilket som gäller.', 'Contradictions. If a card says both "Bullish" and "weak bear" it is flagged, without the machine guessing which one holds.'),
        L('Omdömen som ”bränslet börjar ta slut” går inte att mäta och märks så.', 'Judgments such as "running out of fuel" cannot be measured and are marked that way.'),
      ] },
    ] },
    { h: L('Regelmotorn', 'The rule engine'), body: [
      L('Exitregeln är maskinens tolkning av kortets ord. Den läser nivån och exitbekräftelsen: ”Direkt” betyder här första stängningen förbi nivån, ”2 closes” två stängningar i rad. Tolkningen väntar på ägarens bekräftelse.',
        'The exit rule is the machine\'s reading of the card. It reads the level and the exit confirmation: "Direkt" means the first close beyond the level, "2 closes" two closes in a row. The reading awaits the owner\'s confirmation.'),
      L('Varje regel har fyra lägen, och bara en övergång mellan dem larmar:', 'Each rule has four states, and only a change between them raises an alert:'),
      { ul: [
        L('Intakt: ingen stängning bortom nivån.', 'Intact: no close beyond the level.'),
        L('Varning: minst en fyratimmarsstängning under varningsnivån.', 'Warning: at least one four-hour close below the warning level.'),
        L('På väg: minst en stängning bortom regelnivån, men färre än regeln kräver.', 'Closing in: at least one close beyond the rule level, but fewer than the rule requires.'),
        L('Utlöst: så många stängningar i rad som regeln kräver.', 'Triggered: as many closes in a row as the rule requires.'),
      ] },
      { table: [[L('Position', 'Position'), L('Regeln, maskinens tolkning', 'The rule, as the machine reads it'), L('Läge i dag', 'State today')]].concat(T.BYW.map(p => [T.nm(p), L('Sälj vid ', 'Sell on ') + T.ruleWords(p, true) + (p.chart !== p.held ? ' (' + p.chart + ')' : ''), T.stateWord(p) + ', ' + fmt.pctU(Math.abs(T.ruleDist(p))) + L(' över', ' above')])) },
    ] },
    { h: L('Brusrisken', 'The noise risk'), body: [
      L('Brusrisken är chansen att kursen når regelnivån inom 5 eller 21 handelsdagar av ren normal svängning: en slumpvandring utan riktning med de senaste 60 dagarnas volatilitet. För ' + T.nm(nr) + ' är den ' + fmt.pct0(T.noise5(nr)) + ' inom fem dagar och ' + fmt.pct0(T.noise21(nr)) + ' inom 21, med kursen ' + fmt.pctU(Math.abs(nd)) + ' över nivån. Nivån ligger alltså inom vardagsbruset.',
        'The noise risk is the chance that the price reaches the rule level within 5 or 21 trading days from ordinary swings alone: a random walk with no direction and the last 60 days\' volatility. For ' + T.prose(nr) + ' it is ' + fmt.pct0(T.noise5(nr)) + ' within five days and ' + fmt.pct0(T.noise21(nr)) + ' within 21, with the price ' + fmt.pctU(Math.abs(nd)) + ' above the level. The level is within everyday noise.'),
      L('Det är information, inte en dom. Vad regeln ska skydda mot är ägarens beslut.', 'It is information, not a verdict. What the rule should protect against is the owner\'s decision.'),
    ] },
    { h: L('Riktkurser ur optionspriser', 'Price targets from option prices'), body: [
      L('Målen räknas med OIRet, metoden i Martin, Rodenkirchen, Wagner och Wang (september 2026). Förväntad överavkastning = riskfri ränta × [marknadens SVIX² + ½ × (aktiens SVIX² − snittet för S&P 500)]. SVIX² mäts ur optionspriserna och säger hur mycket marknaden betalar för att skydda sig. Ingen parameter skattas.',
        'Targets use OIRet, the method in Martin, Rodenkirchen, Wagner and Wang (September 2026). Expected excess return = risk-free rate × [market SVIX² + ½ × (stock SVIX² − the S&P 500 average)]. SVIX² is measured from option prices and says how much the market pays for protection. No parameter is estimated.'),
      L('Författarna rapporterar att metoden, använd direkt som prognos utan anpassning, ger ett R² utanför urvalet på 21 % jämfört med analytikernas riktkurser. Spridningen och sannolikheterna i tidningen kommer ur optionernas implicita volatilitet.',
        'The authors report that the method, used directly as a forecast with no fitting, gives an out-of-sample R² of 21% relative to analysts\' price targets. The spread and probabilities in the paper come from the options\' implied volatility.'),
      L('Målen är preliminära. Prototypen integrerar över de lösenpriser som har bud. Författarna räknar över en volatilitetsyta, och den versionen, som produkten ska använda, flyttar målen några dollar:',
        'The targets are preliminary. The prototype integrates over the strikes that have bids. The authors compute over a volatility surface, and that version, which the product will use, moves the targets by a few dollars:'),
      { table: [[L('Mål om 12 mån', 'Target in 12 months'), L('Prototypen', 'Prototype'), L('Volatilitetsytan', 'Volatility surface')], ['Palantir', raw('PLTR'), fmt.px(surface.PLTR)], ['Nvidia', raw('NVDA'), fmt.px(surface.NVDA)], ['Emcor', raw('EME'), fmt.px(surface.EME)]] },
      L('Emcor och Koreafonden har optioner till ungefär sex månader; deras mål är uppräknade till ett år och märkta. Koreafonden är en ETF och ligger utanför studiens evidens. Siemens Energy saknar optioner hos datakällan. Dagens tal är ännu inte validerade mot författarnas egna serier.',
        'Emcor and the Korea fund have options out to about six months; their targets are annualised and marked. The Korea fund is an ETF and outside the study\'s evidence. Siemens Energy has no options at the data source. Today\'s figures are not yet validated against the authors\' own series.'),
      { src: L('Riskfri ränta ' + fmt.pctU(oi.rf, 2) + ' (FRED DGS1, ' + fmt.dS(oi.rf_date) + '). Källa: Martin, Rodenkirchen, Wagner och Wang (2026); författarnas data och läsmig på personal.lse.ac.uk/martiniw/oiret.html.',
        'Risk-free rate ' + fmt.pctU(oi.rf, 2) + ' (FRED DGS1, ' + fmt.dS(oi.rf_date) + '). Source: Martin, Rodenkirchen, Wagner and Wang (2026); the authors\' data and readme at personal.lse.ac.uk/martiniw/oiret.html.') },
    ] },
    { h: L('Jämförelsen mot MSCI World', 'The comparison with MSCI World'), body: [
      L('Varje köp jämförs med samma kronor, samma dag, i MSCI World med utdelningarna återinvesterade: fonden URTH vid New Yorks stängning, omräknad till kronor med dollarkursen. Skillnaden är vad valen har gett utöver världsindex. I dag har portföljen gett ' + fmt.pctS(P.ret) + ' på vad köpen kostade, och samma insats i MSCI World ' + fmt.pctS(P.msci_ret) + (pub() ? '.' : ', en skillnad på ' + fmt.krS(P.excess_sek) + '.'),
        'Each purchase is compared with the same amount invested on the same day in MSCI World with dividends reinvested: the URTH fund at the New York close, converted to SEK at the dollar rate. The difference is what the picks have added beyond the world index. Today the portfolio has made ' + fmt.pctS(P.ret) + ' on what the purchases cost, and the same money in MSCI World ' + fmt.pctS(P.msci_ret) + (pub() ? '.' : ', a difference of ' + fmt.krS(P.excess_sek) + '.')),
      L('Båda sidor räknar in utdelningar: världsindex med utdelningarna återinvesterade, portföljen med de utdelningar innehaven har gett efter köpet. URTH används för att den prissätts vid samma tidpunkt som MSCI World själv. Fonden en svensk sparare köper, iShares Core MSCI World (IWDA), följer samma index men handlas i Europa, och dess börspris missar halva New York-dagen. Bara nuvarande innehav ingår; sålda positioner kräver transaktionshistoriken och läggs till senare.',
        'Both sides include dividends: the world index with dividends reinvested, the portfolio with the dividends its holdings have paid since purchase. URTH is used because it is priced at the same time as MSCI World itself. The fund a Swedish saver buys, iShares Core MSCI World (IWDA), tracks the same index but trades in Europe, and its market price misses half of the New York day. Only current holdings are included; sold positions need the transaction history and will be added later.'),
    ] },
    { h: L('Vad som inte mäts', 'What is not measured'), body: [
      { ul: [
        L('En portfölj på fem positioner under några månader bevisar ingen förmåga att slå marknaden. Tidningen visar en process, inte en avkastningshistorik.', 'A portfolio of five positions over a few months proves no ability to beat the market. The paper shows a process, not a track record.'),
        pub() ? L('Avgifter och växling: resultatet räknas på köpkurserna, och korten anger ett något högre insatt belopp.', 'Fees and currency conversion: results use the purchase prices, and the cards state a slightly higher amount invested.')
          : L('Avgifter och växling: resultatet räknas på köpkurserna; korten säger ' + fmt.kr(P.invested_reported_sek) + ' insatt mot ' + fmt.kr(P.cost_sek) + ' i köpkurser.', 'Fees and currency conversion: results use the purchase prices; the cards say ' + fmt.kr(P.invested_reported_sek) + ' invested against ' + fmt.kr(P.cost_sek) + ' at purchase prices.'),
        L('Skatt och sålda positioner.', 'Tax and sold positions.'),
        L('Nyheter, fundamenta och omdömen som ”AI-bubblan spricker”.', 'News, fundamentals and judgments such as "the AI bubble bursts".'),
        L('Framtiden. Optionsmålen är marknadens prissättning, inte en prognos från ägaren eller maskinen.', 'The future. The option targets are the market\'s pricing, not a forecast by the owner or the machine.'),
        L('Risken är bakåtblickande: ett år med dagens vikter, volatilitet ' + fmt.pctU(R.vol_ann, 0) + ' per år och beta ' + fmt.num(R.beta_msci, 2) + ' mot MSCI World.', 'Risk looks backwards: one year at today\'s weights, volatility ' + fmt.pctU(R.vol_ann, 0) + ' a year and beta ' + fmt.num(R.beta_msci, 2) + ' to MSCI World.'),
      ] },
    ] },
    { h: L('Prognosliggaren', 'The forecast ledger'), body: [
      L('Planerad. Varje riktkurs och sannolikhet ska publiceras innan utfallet och poängsättas när tiden gått ut, även missarna. Den finns inte i prototypen.',
        'Planned. Every target and probability will be published before the outcome and scored when the time is up, misses included. It is not in the prototype.'),
    ] },
    { h: L('Datan', 'The data'), body: [
      L('Kurser, valutor, optioner och rapportdatum kommer från Yahoo Finance och den riskfria räntan från FRED. Datan byggdes ' + fmt.wd(T.BUILT) + ' ' + fmt.dS(T.BUILT) + ' ' + String(T.BUILT).slice(11, 16) + (meta.seconds ? ' på ' + fmt.num(meta.seconds, 1) + ' sekunder' : '') + '. Ett tal som saknas visas som saknat, aldrig som noll.',
        'Prices, currencies, options and report dates come from Yahoo Finance and the risk-free rate from FRED. The data was built ' + fmt.wd(T.BUILT) + ' ' + fmt.dS(T.BUILT) + ' ' + String(T.BUILT).slice(11, 16) + (meta.seconds ? ' in ' + fmt.num(meta.seconds, 1) + ' seconds' : '') + '. A missing number is shown as missing, never as zero.'),
      L('Rapporterna ska köras i molnet 09:00 och 22:15, eftersom en bärbar dator med stängt lock inte kan lova en tid.', 'The reports will run in the cloud at 09:00 and 22:15, because a laptop with its lid closed cannot promise a time.'),
    ] },
    { h: L('Den publika upplagan', 'The public edition'), body: [
      L('Den publika upplagan visar procent, vikter, kurser, nivåer och mål. Den visar aldrig kronor, antal eller konto. Ett test letar efter de kända beloppen i sidans text och underkänner sidan om något av dem syns.',
        'The public edition shows percentages, weights, prices, levels and targets. It never shows SEK amounts, quantities or account details. A test searches the page text for the known amounts and fails the page if any of them appears.'),
    ] },
  ];
};
