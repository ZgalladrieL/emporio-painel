/* Sistema único de toast — antes existiam três variantes (mostrarToast v5, showToast v4
   morto, showToast moderno). Aqui consolidado em um só showToast(message, type). */

function showToast(message, type = 'success') {
  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = {
    success: '<svg class="toast-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="20 6 9 17 4 12"/></svg>',
    warning: '<svg class="toast-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2 1 21h22L12 2z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    error:   '<svg class="toast-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
  };
  t.innerHTML = `${icons[type] || icons.success}<div class="toast-body">${message}</div>`;
  wrap.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    t.addEventListener('animationend', () => t.remove(), { once: true });
  }, 3000);
}

function mostrarLoadingGlobal(ativo) {
  document
    .querySelectorAll('#financial .fin-kpi, #financial .chart-wrap, #financial .fin-table-wrap, #vg-hero .kpi-card')
    .forEach(el => el.classList.toggle('loading', ativo));
}
