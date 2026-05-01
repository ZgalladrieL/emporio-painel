/* Re-trigger de animações ao trocar de aba (counters, bars, card entrances). */

function animateCounter(el) {
  const raw = el.dataset.num;
  const decimals = parseInt(el.dataset.decimal || '0', 10);
  const target = parseFloat(raw.replace(',', '.'));
  if (isNaN(target)) return;
  const dur = 900;
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = formatBR(target * eased, decimals);
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = formatBR(target, decimals);
  }
  requestAnimationFrame(tick);
}

function animateAllCountersIn(section) {
  section.querySelectorAll('.num[data-num]').forEach(el => { el.textContent = '0'; animateCounter(el); });
}

function restartBarFills(section) {
  section.querySelectorAll('.bar-fill').forEach(el => { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; });
}

function restartCardEntrances(section) {
  section.querySelectorAll('.kpi-card, .auto-card, .sup-card, .rep-card, .card').forEach(el => {
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  });
}
