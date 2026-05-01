/* Sub-aba CONTAS: KPIs + despesas por semana + categorias + fornecedores paginados. */

function renderContasPane() {
  const boletosPer = FIN_DATA.boletos.filter(b => inPeriod(b.vencimento));
  const cfPer = FIN_DATA.contasFixas.filter(c => inPeriod(c.data));

  const pendente = boletosPer.filter(b => b.status === 0).reduce((s,b) => s+b.valor, 0);
  const total = boletosPer.reduce((s,b) => s+b.valor, 0) + cfPer.reduce((s,c) => s+c.valor, 0);
  setText('kpi-c-pend',  fmtBRL(pendente));
  setText('kpi-c-total', fmtBRL(total));
  setText('kpi-c-pend-sub',  boletosPer.filter(b => b.status===0).length + ' boletos em aberto');
  setText('kpi-c-total-sub', (boletosPer.length + cfPer.length) + ' lançamentos no período');

  // Despesas por semana
  const weekMap = new Map();
  boletosPer.forEach(b => {
    const k = isoWeekKey(b.vencimento);
    weekMap.set(k, (weekMap.get(k) || 0) + b.valor);
  });
  const weekKeys = Array.from(weekMap.keys()).sort();
  destroyChart(chartExpWeek);
  chartExpWeek = new Chart(document.getElementById('finExpWeekChart'), {
    type: 'bar',
    data: { labels: weekKeys.map(k => k.replace(/^\d{4}-/, '')), datasets: [{
      data: weekKeys.map(k => weekMap.get(k)),
      backgroundColor: 'rgba(160,56,56,0.55)',
      borderColor: '#a03838', borderWidth: 1, borderRadius: 4
    }] },
    options: { ...baseChartOpts,
      plugins: { ...baseChartOpts.plugins, tooltip: { ...baseChartOpts.plugins.tooltip,
        callbacks: { label: ctx => ' R$ ' + fmtBRL(ctx.raw) } } } }
  });

  // Tabela categorias
  const cats = new Map();
  cfPer.forEach(c => cats.set(c.categoria, (cats.get(c.categoria) || 0) + c.valor));
  const catRows = Array.from(cats.entries()).sort((a,b) => b[1]-a[1]);
  document.querySelector('#tbl-cat tbody').innerHTML = catRows.length
    ? catRows.map(([cat, v]) => `<tr><td>${cat}</td><td class="num">R$ ${fmtBRL(v)}</td></tr>`).join('')
    : `<tr><td colspan="2" style="text-align:center;color:var(--text3);padding:1.4rem 0;font-style:italic;">Sem lançamentos no período</td></tr>`;

  // Tabela fornecedores (paginada)
  const fornMap = new Map();
  boletosPer.forEach(b => fornMap.set(b.empresa, (fornMap.get(b.empresa) || 0) + b.valor));
  fornState.rows = Array.from(fornMap.entries()).sort((a,b) => b[1]-a[1]);
  fornState.page = 0;
  renderFornecedoresTable();
}

function renderFornecedoresTable() {
  const { rows, page, perPage } = fornState;
  const sorted = rows.slice().sort((a,b) => {
    const dir = fornState.sortDir === 'asc' ? 1 : -1;
    if (fornState.sortKey === 'name') return a[0].localeCompare(b[0]) * dir;
    return (a[1] - b[1]) * dir;
  });
  const start = page * perPage;
  const slice = sorted.slice(start, start + perPage);
  document.querySelector('#tbl-forn tbody').innerHTML = slice.length
    ? slice.map(([emp, v]) => `<tr><td class="name">${emp}</td><td class="num">R$ ${fmtBRL(v)}</td></tr>`).join('')
    : `<tr><td colspan="2" style="text-align:center;color:var(--text3);padding:1.4rem 0;font-style:italic;">Sem boletos no período</td></tr>`;
  const total = sorted.length;
  const from = total ? start + 1 : 0;
  const to = Math.min(start + perPage, total);
  document.getElementById('forn-pager-info').textContent = `${from} - ${to} / ${total}`;
  document.getElementById('forn-prev').disabled = page === 0;
  document.getElementById('forn-next').disabled = (start + perPage) >= total;

  // sort indicators
  document.querySelectorAll('#tbl-forn thead th').forEach(th => {
    th.classList.remove('sort-asc','sort-desc');
    if (th.dataset.sort === fornState.sortKey) th.classList.add(fornState.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  });
}

/* Wiring de paginação + sort (executa no load do script — DOM já existe pois script vai no fim do body) */
document.getElementById('forn-prev')?.addEventListener('click', () => {
  if (fornState.page > 0) { fornState.page--; renderFornecedoresTable(); }
});
document.getElementById('forn-next')?.addEventListener('click', () => {
  if ((fornState.page+1) * fornState.perPage < fornState.rows.length) { fornState.page++; renderFornecedoresTable(); }
});
document.querySelectorAll('#tbl-forn thead th').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if (!key) return;
    if (fornState.sortKey === key) fornState.sortDir = fornState.sortDir === 'asc' ? 'desc' : 'asc';
    else { fornState.sortKey = key; fornState.sortDir = key === 'name' ? 'asc' : 'desc'; }
    fornState.page = 0;
    renderFornecedoresTable();
  });
});
