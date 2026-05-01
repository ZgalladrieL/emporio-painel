/* Orquestrador da aba Financeiro: período, sub-tabs, render top-level e fornecedores fin.
   --
   TODOs deixados pela rodada de modularização (escopo da próxima rodada — Financeiro):
   - Resolver duplicação vencimento/dataVencimento e status/pago no shape de boletos.
   - Centralizar filtro por período (hoje cada renderer chama .filter(inPeriod) inline).
   - Unificar renderFornecedoresTable (tabela) + renderFornecFin (cards de Fornecedores Financeiros).
*/

function renderizarFinanceiro({ boletos, faturamento, movimentacoes }) {
  const m = calcularMetricas(boletos, faturamento);

  // Cards GERAL
  setText('kpi-fat',      formatBRL(m.totalReceita).replace('R$', '').trim());
  setText('kpi-fat-sub',  faturamento.length + ' dia(s) com lançamento');
  setText('kpi-pay',      formatBRL(m.totalPendente).replace('R$', '').trim());
  setText('kpi-pay-sub',  m.totalContas + ' boleto(s) no período');
  setText('kpi-paid',     formatBRL(m.totalPago).replace('R$', '').trim());
  setText('kpi-paid-sub', m.contasPagas + ' boleto(s) pago(s)');
  setText('kpi-pend',     formatBRL(m.totalPendente).replace('R$', '').trim());
  setText('kpi-pend-sub', (m.totalContas - m.contasPagas) + ' boleto(s) em aberto');

  // Cards CONTAS pane
  setText('kpi-c-pend',     formatBRL(m.totalPendente).replace('R$', '').trim());
  setText('kpi-c-pend-sub', (m.totalContas - m.contasPagas) + ' boletos em aberto');
  setText('kpi-c-total',    formatBRL(m.totalPendente + m.totalPago).replace('R$', '').trim());
  setText('kpi-c-total-sub', m.totalContas + ' lançamentos no período');

  // Cards FATURAMENTO pane
  setText('kpi-f-tot',      formatBRL(m.totalReceita).replace('R$', '').trim());
  setText('kpi-f-tot-sub',  faturamento.length + ' dias com lançamento');
  setText('kpi-f-tkt',      formatBRL(m.mediaDiaria).replace('R$', '').trim());
  setText('kpi-f-tkt-sub',  'média diária do período');

  renderBalancoChart(movimentacoes || []);
  renderBoletosTable(boletos);
  resetMockSubpanels();
}

function renderFinancial() {
  if (!FIN_DATA.loaded && !FIN_DATA.error) return;
  renderGeralPane();
  renderContasPane();
  renderFaturamentoPane();
  renderFornecFin();
}

function renderFornecFin() {
  const grid = document.getElementById('fornec-fin-grid');
  if (!grid) return;
  const boletosPer = FIN_DATA.boletos.filter(b => inPeriod(b.vencimento));
  const map = new Map();
  boletosPer.forEach(b => {
    if (!map.has(b.empresa)) map.set(b.empresa, { pago:0, pendente:0, qtd:0 });
    const o = map.get(b.empresa);
    if (b.status === 1) o.pago += b.valor; else o.pendente += b.valor;
    o.qtd++;
  });

  // Mescla com fornecedores cadastrados localmente
  const cadastrados = JSON.parse(localStorage.getItem(STORAGE_KEYS.suppliers) || '[]');
  cadastrados.forEach(name => { if (!map.has(name)) map.set(name, { pago:0, pendente:0, qtd:0 }); });

  const list = Array.from(map.entries()).sort((a,b) => (b[1].pago+b[1].pendente) - (a[1].pago+a[1].pendente));
  document.getElementById('fornec-fin-count').textContent = list.length + (list.length === 1 ? ' fornecedor' : ' fornecedores');

  if (list.length === 0) {
    grid.innerHTML = `<div class="fornec-card" style="grid-column:1/-1;text-align:center;color:var(--text3);font-style:italic;font-family:'Cormorant Garamond',serif;padding:2rem;">Nenhum fornecedor com boletos no período.</div>`;
    return;
  }

  grid.innerHTML = list.map(([name, o]) => `
    <div class="fornec-card">
      <div class="fornec-name">${name}</div>
      <div class="fornec-row"><span class="lbl">Pago</span><span class="val paid">R$ ${fmtBRL(o.pago)}</span></div>
      <div class="fornec-row"><span class="lbl">Pendente</span><span class="val pending">R$ ${fmtBRL(o.pendente)}</span></div>
      <div class="fornec-row"><span class="lbl">Boletos</span><span class="val">${o.qtd}</span></div>
    </div>
  `).join('');
}

function buildPeriodOptions() {
  const inFrom = document.getElementById('fin-date-from');
  const inTo   = document.getElementById('fin-date-to');
  const btn    = document.getElementById('fin-apply');
  if (!inFrom || !inTo || !btn) return;

  // Default: primeiro dia do mês atual até hoje (v5)
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  if (!inFrom.value) inFrom.value = ymd(firstDay);
  if (!inTo.value)   inTo.value   = ymd(today);

  periodState = {
    from: new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate(), 0, 0, 0, 0),
    to:   new Date(today.getFullYear(),    today.getMonth(),    today.getDate(),    23, 59, 59, 999)
  };

  // Aplicar filtro = re-fetch dos dados reais com o range selecionado
  btn.onclick = () => {
    const de  = inFrom.value;
    const ate = inTo.value;
    if (!de || !ate) {
      showToast('Selecione as duas datas', 'error');
      return;
    }
    if (new Date(de) > new Date(ate)) {
      showToast('Data inicial maior que data final', 'error');
      return;
    }
    periodState = {
      from: new Date(de + 'T00:00:00'),
      to:   new Date(ate + 'T23:59:59')
    };
    carregarDados({ de, ate });
  };
}
