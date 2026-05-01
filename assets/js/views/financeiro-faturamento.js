/* Sub-aba FATURAMENTO: KPIs + faturamento por semana + faturamento diário (todos os dias do range). */

function renderFaturamentoPane() {
  const fatPer = FIN_DATA.faturamento.filter(f => inPeriod(f.data));
  const total = fatPer.reduce((s,f) => s+f.total, 0);
  const diasComFat = fatPer.filter(f => f.total > 0).length;
  const ticket = diasComFat ? total / diasComFat : 0;
  setText('kpi-f-tot', fmtBRL(total));
  setText('kpi-f-tkt', fmtBRL(ticket));
  setText('kpi-f-tot-sub', fatPer.length + ' dias com lançamento');
  setText('kpi-f-tkt-sub', diasComFat + ' dias com faturamento > 0');

  // Faturamento por semana
  const weekMap = new Map();
  fatPer.forEach(f => {
    const k = isoWeekKey(f.data);
    weekMap.set(k, (weekMap.get(k) || 0) + f.total);
  });
  const weekKeys = Array.from(weekMap.keys()).sort();
  destroyChart(chartFatWeek);
  chartFatWeek = new Chart(document.getElementById('finFatWeekChart'), {
    type: 'bar',
    data: { labels: weekKeys.map(k => k.replace(/^\d{4}-/, '')), datasets: [{
      data: weekKeys.map(k => weekMap.get(k)),
      backgroundColor: 'rgba(106,158,82,0.55)',
      borderColor: '#6a9e52', borderWidth: 1, borderRadius: 4
    }] },
    options: { ...baseChartOpts,
      plugins: { ...baseChartOpts.plugins, tooltip: { ...baseChartOpts.plugins.tooltip,
        callbacks: { label: ctx => ' R$ ' + fmtBRL(ctx.raw) } } } }
  });

  // Faturamento diário (todos os dias do range selecionado — v4)
  const dailyMap = new Map();
  fatPer.forEach(f => {
    const key = ymd(f.data);
    dailyMap.set(key, (dailyMap.get(key) || 0) + f.total);
  });
  const labels = [];
  const data = [];
  if (periodState.from && periodState.to) {
    const start = new Date(periodState.from.getFullYear(), periodState.from.getMonth(), periodState.from.getDate());
    const end   = new Date(periodState.to.getFullYear(),   periodState.to.getMonth(),   periodState.to.getDate());
    const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
    for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
      const key = ymd(d);
      const lbl = sameMonth
        ? String(d.getDate()).padStart(2, '0')
        : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
      labels.push(lbl);
      data.push(dailyMap.get(key) || 0);
    }
  }
  destroyChart(chartFatDaily);
  chartFatDaily = new Chart(document.getElementById('finFatDailyChart'), {
    type: 'line',
    data: { labels, datasets: [{
      data, borderColor: '#6a9e52', backgroundColor: 'rgba(106,158,82,0.10)',
      borderWidth: 2, pointRadius: 2, pointHoverRadius: 5, tension: 0.25, fill: true
    }] },
    options: { ...baseChartOpts,
      plugins: { ...baseChartOpts.plugins, tooltip: { ...baseChartOpts.plugins.tooltip,
        callbacks: { label: ctx => ' R$ ' + fmtBRL(ctx.raw) } } } }
  });
}
