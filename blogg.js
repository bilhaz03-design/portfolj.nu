/* Bloggen: kort text per innehav om senaste rapportmottagandet eller viktiga händelsen (E-A-R), med datum och källor.
   Skrivs för hand och läses av både den privata och den publika upplagan. Siffrorna är kontrollerade mot källorna
   2026-10-05; reaktionerna är egna beräkningar ur stängningskurser (Yahoo Finance): aktien mot S&P 500 i USA och mot
   STOXX 600 för Siemens Energy, stängning till stängning. Inga belopp ur portföljen och inga regler hör hemma här. */
window.PORTFOLJ_BLOGG = {
  uppdaterad: '2026-10-05',
  innehav: {
    ENR: {
      datum: '2026-08-05',
      sv: 'Rapporten 5 augusti slog förväntningarna: ordern blev 6 % och vinsten 18 % högre än analytikerna väntat. Aktien steg 5 % i öppningen men stängde oförändrad, andra rapporten i rad som marknaden inte belönade. Nästa rapport 11 november.',
      en: 'The 5 August report beat expectations: orders came in 6% and profit 18% above analyst forecasts. The shares opened 5% higher but closed flat, the second report in a row the market did not reward. Next report 11 November.',
      kallor: [
        { sv: 'Siemens Energy, rapport Q3 2026', en: 'Siemens Energy, Q3 FY2026 release', url: 'https://www.siemens-energy.com/global/en/home/press-releases/earnings-release-q3-fy-2026.html' },
        { sv: 'Siemens Energys sammanställning av analytikernas förväntningar', en: "Siemens Energy's consensus summary", url: 'https://assets.siemens-energy.com/dam/42012d6d-c863-4d27-9045-b49600ece6a6/2026-07-29-SE-Consensus_Summary---Q3-FY26_FINAL-pdf_Original%20file.pdf' },
      ],
    },
    PLTR: {
      datum: '2026-08-03',
      sv: 'Rapporten 3 augusti: intäkterna steg 93 % till 1,94 miljarder dollar och bolaget höjde helårsprognosen till 8,15 miljarder. Aktien steg 30 % dagen efter, 28 procentenheter mer än S&P 500. Nästa rapport 2 november.',
      en: 'The 3 August report: revenue rose 93% to $1.94 billion and the company raised its full-year forecast to $8.15 billion. The shares rose 30% the next day, 28 percentage points more than the S&P 500. Next report 2 November.',
      kallor: [
        { sv: 'Palantir, rapport Q2 2026 (SEC 8-K)', en: 'Palantir, Q2 2026 release (SEC 8-K)', url: 'https://www.sec.gov/Archives/edgar/data/0001321655/000132165526000039/a2026q2ex991pressrelease.htm' },
      ],
    },
    NVDA: {
      datum: '2026-08-26',
      sv: 'Rapporten 26 augusti: intäkterna steg 106 % till 96 miljarder dollar och prognosen för nästa kvartal blev 108 miljarder. Aktien steg 9 % dagen efter, 8 procentenheter mer än S&P 500. Nästa rapport 17 november.',
      en: 'The 26 August report: revenue rose 106% to $96 billion and the forecast for next quarter is $108 billion. The shares rose 9% the next day, 8 percentage points more than the S&P 500. Next report 17 November.',
      kallor: [
        { sv: 'Nvidia, rapport Q2 räkenskapsåret 2027 (SEC 8-K)', en: 'Nvidia, Q2 fiscal 2027 release (SEC 8-K)', url: 'https://www.sec.gov/Archives/edgar/data/0001045810/000104581026000073/q2fy27pr.htm' },
      ],
    },
    EME: {
      datum: '2026-07-30',
      sv: 'Rapporten 30 juli: intäkterna steg 20 %, orderstocken 44 % och bolaget höjde helårsprognosen. Aktien steg 19 % samma dag, 18 procentenheter mer än S&P 500. Nästa rapport i slutet av oktober.',
      en: 'The 30 July report: revenue rose 20%, the order backlog 44% and the company raised its full-year forecast. The shares rose 19% the same day, 18 percentage points more than the S&P 500. Next report in late October.',
      kallor: [
        { sv: 'Emcor, rapport Q2 2026 (SEC 8-K)', en: 'Emcor, Q2 2026 release (SEC 8-K)', url: 'https://www.sec.gov/Archives/edgar/data/0000105634/000010563426000112/eme-ex991_2026630xq2.htm' },
      ],
    },
    FLKR: {
      datum: '2026-10-01',
      sv: '1 oktober: Sydkoreas export slog rekord i september, +84 % till 121 miljarder dollar, och chipexporten gick för första gången över 60 miljarder. Koreas börs steg 2 % samma dag. Nästa viktiga datum är centralbankens räntebesked 22 oktober.',
      en: "1 October: South Korea's exports hit a record in September, up 84% to $121 billion, and chip exports passed $60 billion for the first time. Korea's stock market rose 2% the same day. The next key date is the central bank's rate decision on 22 October.",
      kallor: [
        { sv: 'The Korea Times, 1 oktober 2026', en: 'The Korea Times, 1 October 2026', url: 'https://www.koreatimes.co.kr/economy/20261001/koreas-sept-exports-hit-record-1209-bil-on-robust-chip-sales' },
      ],
    },
  },
};
