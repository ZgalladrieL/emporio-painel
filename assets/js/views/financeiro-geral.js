/* Sub-aba GERAL: 4 KPIs + balanço acumulado dia a dia. */

function renderGeralPane() {
  const fat = FIN_DATA.faturamento.filter(f => inPeriod(f.data)).reduce((s,f) => s + f.total, 0);
  const boletosPer = FIN_DATA.boletos.filter(b => inPeriod(b.vencimento));
  const cfPer = FIN_DATA.contasFixas.filter(c => inPeriod(c.data));
  const totalAPagar = boletosPer.reduce((s,b) => s+b.valor, 0) + cfPer.reduce((s,c) => s+c.valor, 0);
  const totalPago = boletosPer.filter(b => b.status === 1).reduce((s,b) => s+b.valor, 0) + cfPer.reduce((s,c) => s+c.valor, 0);
  const pendente = totalAPagar - totalPago;

  setText('kpi-fat',  fmtBRL(fat));
  setText('kpi-pay',  fmtBRL(totalAPagar));
  setText('kpi-paid', fmtBRL(totalPago));
  setText('kpi-pend', fmtBRL(pendente));
  setText('kpi-fat-sub',  FIN_DATA.faturamento.filter(f => inPeriod(f.data)).length + ' dias com lançamento');
  setText('kpi-pay-sub',  (boletosPer.length + cfPer.length) + ' lançamentos');
  setText('kpi-paid-sub', boletosPer.filter(b => b.status===1).length + ' boletos pagos + fixas');
  setText('kpi-pend-sub', boletosPer.filter(b => b.status===0).length + ' boletos pendentes');

  // Balanço acumulado
  const movPer = FIN_DATA.movimentacoes
    .filter(m => inPeriod(m.data))
    .sort((a,b) => a.data - b.data);

  const labels = [];
  const data = [];
  let acc = 0;
  movPer.forEach(m => {
    acc += (m.tipo === 'Receita' ? m.valor : -m.valor);
    labels.push(fmtDateBR(m.data));
    data.push(acc);
  });

  destroyChart(chartBalance);
  chartBalance = new Chart(document.getElementById('finBalanceChart'), {
    type: 'line',
    data: { labels, datasets: [{
      data, borderColor: '#6a9e52', backgroundColor: 'rgba(106,158,82,0.10)',
      borderWidth: 2, pointRadius: 2, pointHoverRadius: 5, tension: 0.25, fill: true
    }] },
    options: { ...baseChartOpts,
      plugins: { ...baseChartOpts.plugins, tooltip: { ...baseChartOpts.plugins.tooltip,
        callbacks: { label: ctx => ' Saldo: R$ ' + fmtBRL(ctx.raw) } } } }
  });
}
