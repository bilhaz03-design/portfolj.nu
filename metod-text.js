/* Metodsidans text på svenska och engelska. Talen hämtas ur datan via Tidning-api:t, så sidan och tidningen
   aldrig säger olika saker. Ytmetodens riktkurser är avskrivna ur portfolj/prototyp/surface_result_flat.json (2026-10-04). */
window.TidningMetod = function (T) {
  'use strict';
  const { L, LV, pub, fmt, POS, P } = T;
  const ordet = n => (T.en() ? ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'] : ['noll', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio'])[n] || String(n);
  const names = POS.map(T.nm);
  const nameList = names.slice(0, -1).join(', ') + L(' och ', ' and ') + names[names.length - 1];
  /* Den publika upplagan (Om portföljen): syftet, jämförelsen, riktkurserna och det som inte visas; varje sektion med
     "kol" blir en kolumn överst på sidan. Konceptets privata metodsida nedan följer inte med till sajten. */
  if (pub()) {
    const R = P.risk || {}, oi = T.S.oiret_inputs || {};
    /* kvällskörningens data (2026-10-05) räknar kronorna med Riksbankens dagliga kurser; prototypdatan med Yahoos */
    const riksbanken = !!(((T.S.meta || {}).riktmarke || {}).valuta);
    return [
      { h: L('Syftet', 'The aim'),
        kol: L('Portföljen ska slå världsindex. Varje köp ställs mot samma insats i MSCI World samma dag, så skillnaden visar vad valen har gett utöver att bara äga fonden.',
          'The portfolio aims to beat the world index. Every purchase is set against the same money in MSCI World on the same day, so the difference shows what the picks have added beyond simply owning the fund.'),
        body: [
          L('Portföljen följer ' + ordet(POS.length) + ' verkliga positioner: ' + nameList + '. Den jämförs hela tiden med det enklaste alternativet, en global indexfond. Slår den inte fonden över tid är fonden det bättre valet.',
            'Portföljen follows ' + ordet(POS.length) + ' real positions: ' + nameList + '. It is always compared with the simplest alternative, a global index fund. If it does not beat the fund over time, the fund is the better choice.'),
          T.PROTOTYP
            ? L('Talen räknas av en maskin ur marknadsdata; texterna och tankarna om innehaven skriver vi själva. Den här versionen är en prototyp med kurser från stängningen ' + fmt.wd(T.ASOF) + ' ' + fmt.dSY(T.ASOF) + '; snart uppdateras talen automatiskt varje vardagskväll efter stängningen.',
              'The numbers are calculated by a machine from market data; we write the texts and thoughts about the holdings ourselves. This version is a prototype with prices from the close on ' + fmt.wd(T.ASOF) + ', ' + fmt.dSY(T.ASOF) + '; soon the numbers will update automatically every weekday evening after the close.')
            : L('Talen räknas av en maskin ur marknadsdata och uppdateras automatiskt varje vardagskväll efter stängningen, senast med kurserna från ' + fmt.wd(T.ASOF) + ' ' + fmt.dSY(T.ASOF) + '. Texterna och tankarna om innehaven skriver vi själva.',
              'The numbers are calculated by a machine from market data and update automatically every weekday evening after the close, most recently with prices from ' + fmt.wd(T.ASOF) + ', ' + fmt.dSY(T.ASOF) + '. We write the texts and thoughts about the holdings ourselves.'),
          L('En portfölj på fem positioner under några månader bevisar ingen förmåga att slå marknaden. Sidan visar försöket öppet, även när det går dåligt.',
            'A portfolio of five positions over a few months proves no ability to beat the market. The site shows the attempt openly, even when it goes badly.'),
        ] },
      { h: L('Så jämför vi', 'How we compare'),
        kol: L('MSCI World Net direkt från MSCI, med utdelningarna återinvesterade, omräknat till kronor. Portföljens egna utdelningar räknas också in. Fondens avgift ingår inte.',
          'MSCI World Net straight from MSCI, with dividends reinvested, converted to SEK. The portfolio\'s own dividends are included too. The fund\'s fee is not.'),
        body: [
          L('Varje köp jämförs med samma insats, samma dag, i MSCI World med utdelningarna återinvesterade: MSCI:s eget index MSCI World Net, omräknat till kronor med ' + (riksbanken ? 'Riksbankens dollarkurs' : 'dollarkursen') + '. Skillnaden är vad valen har gett utöver världsindex. I dag har portföljen gett ' + fmt.pctS(P.ret) + ' på vad köpen kostade, och samma insats i MSCI World ' + fmt.pctS(P.msci_ret) + '.'
              + (riksbanken ? ' Alla kronor räknas med Riksbankens dagliga valutakurser: köpdagens kurs för insatsen och dagens kurs för värdet och indexet, så att vem som helst kan räkna om talen.' : ''),
            'Each purchase is compared with the same money invested on the same day in MSCI World with dividends reinvested: MSCI\'s own MSCI World Net index, converted to SEK at ' + (riksbanken ? 'the Riksbank\'s dollar rate' : 'the dollar rate') + '. The difference is what the picks have added beyond the world index. Today the portfolio has made ' + fmt.pctS(P.ret) + ' on what the purchases cost, and the same money in MSCI World ' + fmt.pctS(P.msci_ret) + '.'
              + (riksbanken ? ' All SEK amounts use the Riksbank\'s daily exchange rates: the purchase day\'s rate for the cost and today\'s rate for the value and the index, so anyone can recompute the numbers.' : '')),
          L('Båda sidor räknar in utdelningar: indexet efter källskatt, portföljen med de utdelningar innehaven har gett efter köpet. MSCI World Net är indexet som fonden en svensk sparare köper, iShares Core MSCI World (IWDA), följer, och det räknas som portföljen: varje marknad på sin egen stängning. Fondens avgift på 0,20 % per år ingår inte. Bara nuvarande innehav ingår.',
            'Both sides include dividends: the index after withholding tax, the portfolio with the dividends its holdings have paid since purchase. MSCI World Net is the index tracked by the fund a Swedish saver buys, iShares Core MSCI World (IWDA), and it is calculated like the portfolio: each market at its own close. The fund\'s fee of 0.20% a year is not included. Only current holdings are included.'),
        ] },
      { h: L('Riktkurserna', 'The price targets'),
        kol: L('Riktkurserna kommer från en studie från 2026 som läser förväntad avkastning ur optionspriser. Riktkursen är dagens kurs uppräknad med den förväntade avkastningen på ett år, avrundad till heltal. Det är marknadens prissättning, inte vår egen prognos.',
          'The price targets come from a 2026 study that reads expected returns from option prices. The price target is today\'s price grown by the expected return over a year, rounded to a whole number. It is the market\'s pricing, not our own forecast.'),
        body: [
          L('Riktkurserna räknas med OIRet, metoden i Martin, Rodenkirchen, Wagner och Wang (2026). Förväntad överavkastning = Rf × [marknadens SVIX² + ½ × (aktiens SVIX² − snittet för S&P 500)], där Rf = e^r är vad en riskfri insats växer till på ett år (r är den riskfria räntan), och den förväntade avkastningen är överavkastningen plus Rf − 1. SVIX² mäts ur optionspriserna och säger hur mycket marknaden betalar för att skydda sig. Formeln har inga skattade parametrar; optionspriserna jämnas först ut till en volatilitetsyta.',
            'Price targets use OIRet, the method in Martin, Rodenkirchen, Wagner and Wang (2026). Expected excess return = Rf × [market SVIX² + ½ × (stock SVIX² − the S&P 500 average)], where Rf = e^r is what a risk-free stake grows to in a year (r is the risk-free rate), and the expected return is the excess return plus Rf − 1. SVIX² is measured from option prices and says how much the market pays for protection. The formula has no estimated parameters; the option prices are first smoothed into a volatility surface.'),
          L('Riktkursen = dagens kurs × (1 + förväntad avkastning på ett år), avrundad till heltal. SVIX² mäts som i studien, över en volatilitetsyta. Författarna rapporterar att metoden, använd direkt som prognos, ger ett R² utanför urvalet på 21 % jämfört med analytikernas riktkurser.',
            'Price target = today\'s price × (1 + expected return over a year), rounded to a whole number. SVIX² is measured as in the study, over a volatility surface. The authors report that the method, used directly as a forecast, gives an out-of-sample R² of 21% relative to analysts\' price targets.'),
          { table: [[L('Innehav', 'Holding'), L('Riktkurs om ett år', 'Price target in a year'), L('Not', 'Note')]].concat(T.BYW.map(p => [T.nm(p),
            T.malTal(p) === null ? '—' : fmt.num(T.malTal(p), 0) + ' ' + (T.en() ? p.chart_ccy : ({ USD: 'dollar', EUR: 'euro' }[p.chart_ccy] || p.chart_ccy)) + (p.chart !== p.held ? ' (' + p.chart + ')' : ''),
            T.malTal(p) === null ? L('inga optioner hos datakällan', 'no options at the data source') : (T.malNot(p) || L('volatilitetsytan', 'volatility surface'))])) },
          L('Riktkurserna är ännu inte jämförda med författarnas egna serier, som slutar i augusti 2025. Emcor har optioner till ungefär ett halvår. Koreafondens egna optioner har för få bud, så dess riktkurs räknas ur optionerna på EWY, en fond med samma koreanska storbolag (korrelation 0,997 det senaste året); fonden ligger utanför studiens bevis. Siemens Energys optioner handlas på Eurex i Frankfurt: där räknas riktkursen ur Eurex dagliga avräkningspriser, med samma yta och med den euroränta som priserna ger. Studien prövade bara aktier i S&P 500, så även Siemens Energy ligger utanför dess bevis.',
            'The price targets are not yet compared with the authors\' own series, which end in August 2025. Emcor has options out to about half a year. The Korea fund\'s own options have too few bids, so its price target is calculated from the options on EWY, a fund holding the same large Korean companies (correlation 0.997 over the past year); the fund is outside the study\'s evidence. Siemens Energy\'s options trade on Eurex in Frankfurt: its price target is calculated from Eurex daily settlement prices, with the same surface and the euro rate the prices imply. The study only tested S&P 500 stocks, so Siemens Energy is outside its evidence too.'),
          { src: L('Riskfri ränta ' + fmt.pctU(oi.rf, 2) + ' (FRED DGS1, ' + fmt.dS(oi.rf_date) + '); för Siemens Energy euroräntan ' + fmt.pctU(oi.rf_eur, 2) + ' ur Eurex priser (ECB:s ettåriga AAA-ränta ' + fmt.dS(oi.rf_date) + ': ' + fmt.pctU(oi.rf_eur_ecb, 2) + '). Källa: Martin, Rodenkirchen, Wagner och Wang (2026); författarnas data och läsmig:',
            'Risk-free rate ' + fmt.pctU(oi.rf, 2) + ' (FRED DGS1, ' + fmt.dS(oi.rf_date) + '); for Siemens Energy the euro rate of ' + fmt.pctU(oi.rf_eur, 2) + ' from Eurex prices (the ECB one-year AAA rate on ' + fmt.dS(oi.rf_date) + ': ' + fmt.pctU(oi.rf_eur_ecb, 2) + '). Source: Martin, Rodenkirchen, Wagner and Wang (2026); the authors\' data and readme:'),
            url: 'https://personal.lse.ac.uk/martiniw/oiret.html', urlText: 'personal.lse.ac.uk/martiniw/oiret.html' },
        ] },
      { h: L('Det vi inte visar', 'What we do not show'),
        kol: L('Belopp, antal och konton. Reglerna för när en position köps eller säljs. Talen räknas ur marknadsdata; texterna om innehaven skrivs för hand.',
          'Amounts, quantities and accounts. The rules for when a position is bought or sold. The numbers come from market data; the texts about the holdings are written by hand.'),
        body: [
          { ul: [
            L('Belopp i kronor, antal och konton. Allt visas som procent av insatsen.', 'SEK amounts, quantities and accounts. Everything is shown as a percentage of the money in.'),
            L('Reglerna för när en position köps eller säljs. Nivåerna vi följer syns i graferna, men inte vad vi gör vid dem.', 'The rules for when a position is bought or sold. The levels we follow are shown in the charts, but not what we do at them.'),
            L('Skatt, avgifter och sålda positioner. Resultatet räknas på köpkurserna.', 'Tax, fees and sold positions. Results use the purchase prices.'),
            L('Framtiden. Riktkurserna är marknadens prissättning, inte en prognos.', 'The future. The price targets are the market\'s pricing, not a forecast.'),
            L('Risken är bakåtblickande: ett år med dagens vikter, volatilitet ' + fmt.pctU(R.vol_ann, 0) + ' per år och beta ' + fmt.num(R.beta_msci, 2) + ' mot MSCI World.', 'Risk looks backwards: one year at today\'s weights, volatility ' + fmt.pctU(R.vol_ann, 0) + ' a year and beta ' + fmt.num(R.beta_msci, 2) + ' to MSCI World.'),
          ] },
        ] },
      { h: L('Datan', 'The data'), body: [
        L('Kurser, valutor, optioner och rapportdatum kommer från Yahoo Finance, Siemens Energys optioner från Eurex, EWY:s optioner från Cboe, indexet från MSCI och den riskfria räntan från FRED. Ett tal som saknas visas som saknat, aldrig som noll.',
          'Prices, currencies, options and report dates come from Yahoo Finance, Siemens Energy\'s options from Eurex, EWY\'s options from Cboe, the index from MSCI and the risk-free rate from FRED. A missing number is shown as missing, never as zero.'),
      ] },
      { h: L('Kontrollerna', 'The checks'), body: [
        L('Varje version kontrolleras innan den publiceras. Ett test letar efter de riktiga beloppen i alla filer och stoppar versionen om något av dem syns, ett annat jämför sidans text med originalet, och tre oberoende granskare prövar ändringen.',
          'Every version is checked before it is published. One test searches all files for the real amounts and stops the version if any of them appears, another compares the page text with the original, and three independent reviewers test the change.'),
      ] },
    ];
  }
};
