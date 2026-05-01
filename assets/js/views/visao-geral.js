/* Render dos KPIs de Visão Geral (Card Resumo Executivo). */

function renderizarVisaoGeral({ boletos, faturamento }) {
  const m = calcularMetricas(boletos, faturamento);
  setText('vg-kpi-fat',    formatBRL(m.totalReceita).replace('R$', '').trim());
  setText('vg-kpi-melhor', formatBRL(m.melhorDia).replace('R$', '').trim());
  setText('vg-kpi-pior',   formatBRL(m.piorDia).replace('R$', '').trim());

  const dias = faturamento.length;
  document.getElementById('vg-kpi-fat-sub').textContent =
    dias > 0 ? `${dias} dia(s) · média ${formatBRL(m.mediaDiaria)}` : 'sem dados no período';

  const melhor = faturamento.find(f => f.total === m.melhorDia);
  document.getElementById('vg-kpi-melhor-sub').textContent =
    melhor ? formatarData(melhor.data) : '—';

  const pior = faturamento.find(f => f.total === m.piorDia);
  document.getElementById('vg-kpi-pior-sub').textContent =
    pior ? formatarData(pior.data) : '—';
}
