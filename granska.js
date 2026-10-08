/* granska.js: ägarens granskning av en kommentar (2026-10-08). Länken kommer i Telegram och bär en signerad nyckel efter
   # (den delen av adressen skickas aldrig till någon server). Sidan visar kommentaren och gör ingenting förrän en knapp
   trycks, så att en förhandsvisning av länken aldrig publicerar något. Nyckeln gäller i 30 dagar. */
(function () {
  'use strict';
  const KOM = 'https://dknavdczztzzbdmtzhot.supabase.co/functions/v1/kommentarer';
  const $ = id => document.getElementById(id), token = location.hash.slice(1);
  const status = $('status'), knappar = [$('publicera'), $('tabort')];
  const las = on => knappar.forEach(b => { b.disabled = !on; });
  const fraga = atgard => fetch(KOM, { method: 'POST', credentials: 'omit', body: JSON.stringify({ atgard, token }) })
    .then(r => r.json().catch(() => ({})).then(d => ({ st: r.status, d })));
  if (!token) { status.textContent = 'Länken saknar sin nyckel. Öppna den från Telegram.'; return; }
  fraga('visa').then(({ st, d }) => {
    if (st !== 200 || !d.kommentar) { status.textContent = st === 404 ? 'Kommentaren finns inte längre.' : 'Länken gäller inte: den är fel eller äldre än 30 dagar.'; return; }
    const k = d.kommentar, a = $('inlagg');
    $('namn').textContent = k.namn; $('text').textContent = k.text;
    $('tid').textContent = new Date(k.skapad).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' });
    a.textContent = k.inlagg; a.href = 'inlagg-' + k.inlagg + '.html';
    status.textContent = k.status === 'publicerad' ? 'Publicerad. Du kan ta bort den.' : 'Väntar på granskning.';
    $('publicera').hidden = k.status === 'publicerad'; $('kommentar').hidden = false; $('knappar').hidden = false;
  }).catch(() => { status.textContent = 'Kunde inte nå servern. Försök igen om en stund.'; });
  const gor = (atgard, klart) => () => {
    las(false);
    fraga(atgard).then(({ st }) => {
      if (st === 200) { status.textContent = klart; $('knappar').hidden = true; } else { status.textContent = 'Det gick inte. Försök igen.'; las(true); }
    }).catch(() => { status.textContent = 'Kunde inte nå servern. Försök igen.'; las(true); });
  };
  $('publicera').addEventListener('click', gor('publicera', 'Publicerad. Den syns nu under inlägget.'));
  $('tabort').addEventListener('click', gor('ta-bort', 'Borttagen.'));
})();
