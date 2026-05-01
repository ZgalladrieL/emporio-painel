/* Chart.js helpers compartilhados + renderers de balanço e tabela de boletos.
   Atenção: instâncias chartBalance/chartExpWeek/chartFatWeek/chartFatDaily ficam em state.js
   — destruir antes de recriar para liberar memória ao trocar de sub-aba. */

const baseChartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1c1f28', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
      titleColor: '#ede8e0', bodyColor: '#c2b9aa', padding: 10
    }
  },
  scales: {
    x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { family: 'DM Sans', size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
    y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { family: 'DM Sans', size: 10 }, callback: v => 'R$ ' + (v/1000).toFixed(0) + 'k' } }
  }
};

function destroyChart(c) { if (c) { c.destroy(); } }

function renderBalancoChart(movimentacoes) {
  const { labels, receitas, despesas, saldos } = construirGraficoBalanco(movimentacoes || []);
  destroyChart(chartBalance);
  const canvas = document.getElementById('finBalanceChart');
  if (!canvas) return;
  chartBalance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Receita',
          data: receitas,
          borderColor: '#6a9e52',
          backgroundColor: 'rgba(106,158,82,0.07)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true
        },
        {
          label: 'Despesa',
          data: despesas,
          borderColor: '#a03838',
          backgroundColor: 'rgba(160,56,56,0.07)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true
        },
        {
          label: 'Saldo Acumulado',
          data: saldos,
          borderColor: '#c8824a',
          backgroundColor: 'rgba(200,130,74,0.05)',
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.3,
          fill: false,
          borderDash: [4, 3]
        }
      ]
    },
    options: {
      ...baseChartOpts,
      plugins: {
        ...baseChartOpts.plugins,
        tooltip: {
          ...baseChartOpts.plugins.tooltip,
          callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + formatBRL(ctx.raw) }
        }
      }
    }
  });
}

/* ── Tabela de boletos (paginação simples Ver mais) ── */
function renderBoletosTable(boletos) {
  boletosState.rows = boletos.slice().sort((a, b) => b.dataVencimento - a.dataVencimento);
  boletosState.shown = 0;
  drawBoletosRows();
}

function drawBoletosRows() {
  const tbody = document.querySelector('#boletos-tbl tbody');
  const more  = document.getElementById('boletos-more');
  const count = document.getElementById('boletos-count');
  if (!tbody) return;
  const total = boletosState.rows.length;
  const next  = Math.min(boletosState.shown + BOLETOS_PAGE, total);
  const slice = boletosState.rows.slice(0, next);
  boletosState.shown = next;

  tbody.innerHTML = slice.length
    ? slice.map(b => {
        const s = statusBoleto(b);
        return `<tr>
          <td class="empresa">${escapeHtml(b.empresa)}</td>
          <td class="venc">${formatarData(b.dataVencimento)}</td>
          <td class="valor">${formatBRL(b.valor)}</td>
          <td><span class="${s.cls}">${s.label}</span></td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="4" class="empty">Sem boletos no período selecionado</td></tr>`;

  if (count) count.textContent = total + ' boleto(s)' + (next < total ? ` · exibindo ${next}` : '');
  if (more)  more.style.display = next < total ? '' : 'none';
}

document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'boletos-more') drawBoletosRows();
});

/* Limpa as sub-abas que não têm fonte conectada */
function resetMockSubpanels() {
  destroyChart(chartExpWeek);
  destroyChart(chartFatWeek);
  destroyChart(chartFatDaily);
  ['#tbl-cat tbody', '#tbl-forn tbody'].forEach(sel => {
    const tb = document.querySelector(sel);
    if (tb) tb.innerHTML = `<tr><td colspan="2" class="empty" style="text-align:center;color:var(--text3);padding:1.4rem 0;font-style:italic;">Sem dados conectados</td></tr>`;
  });
  const info = document.getElementById('forn-pager-info');
  if (info) info.textContent = '0 - 0 / 0';
}
