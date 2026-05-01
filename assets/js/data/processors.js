/* Processadores: cada linha CSV vira objeto JS, filtros e métricas agregadas. */

function processarBoletos(rows) {
  return rows
    .filter(r => r[0] && r[1])
    .map(r => ({
      id:              r[0],
      empresa:         r[1],
      dataVencimento:  excelDateToJS(r[2]),
      codigoDigitavel: r[3],
      valor:           toNum(r[4]),
      pago:            String(r[5]).trim() === '1'
    }))
    .filter(b => b.dataVencimento instanceof Date && !isNaN(b.dataVencimento));
}

function processarFaturamento(rows) {
  return rows
    .filter(r => r[0] && r[0] !== '')
    .map(r => ({
      data:     excelDateToJS(r[0]),
      dinheiro: toNum(r[1]),
      pix:      toNum(r[2]),
      debito:   toNum(r[3]),
      credito:  toNum(r[4]),
      total:    toNum(r[5])
    }))
    .filter(f => f.data instanceof Date && !isNaN(f.data) && f.total > 0);
}

function processarMovimentacoes(rows) {
  return rows
    .filter(r => r[5] && r[5] !== '')
    .map(r => ({
      data:  excelDateToJS(r[5]),
      tipo:  String(r[6]).trim(),
      valor: toNum(r[7])
    }))
    .filter(m => m.data instanceof Date && !isNaN(m.data) && m.valor > 0);
}

function filtrarPorPeriodo(arr, filtro, campoData) {
  const de  = new Date(filtro.de  + 'T00:00:00');
  const ate = new Date(filtro.ate + 'T23:59:59');
  return arr.filter(item => {
    const d = item[campoData];
    return d >= de && d <= ate;
  });
}

function calcularMetricas(boletos, faturamento) {
  const totalPago     = boletos.filter(b => b.pago).reduce((s, b) => s + b.valor, 0);
  const totalPendente = boletos.filter(b => !b.pago).reduce((s, b) => s + b.valor, 0);
  const totalContas   = boletos.length;
  const contasPagas   = boletos.filter(b => b.pago).length;
  const totalReceita  = faturamento.reduce((s, f) => s + f.total, 0);
  const mediaDiaria   = faturamento.length > 0 ? totalReceita / faturamento.length : 0;
  const totaisDiarios = faturamento.map(f => f.total);
  const melhorDia     = totaisDiarios.length ? Math.max(...totaisDiarios) : 0;
  const piorDia       = totaisDiarios.length ? Math.min(...totaisDiarios) : 0;
  const saldoLiquido  = totalReceita - totalPago - totalPendente;
  return {
    totalPago, totalPendente, totalContas, contasPagas,
    totalReceita, mediaDiaria, melhorDia, piorDia, saldoLiquido
  };
}

function statusBoleto(b) {
  if (b.pago) return { label: 'Pago', cls: 'tag-green' };
  if (b.dataVencimento < new Date()) return { label: 'Vencido', cls: 'tag-red' };
  return { label: 'Pendente', cls: 'tag-amber' };
}

function construirGraficoBalanco(movimentacoes) {
  const porData = {};
  movimentacoes.forEach(m => {
    const key = m.data.toISOString().split('T')[0];
    if (!porData[key]) porData[key] = { receita: 0, despesa: 0 };
    if (m.tipo === 'Receita')  porData[key].receita += m.valor;
    if (m.tipo === 'Despesa')  porData[key].despesa += m.valor;
  });

  const datas = Object.keys(porData).sort();
  let acumulado = 0;
  const labels = [], receitas = [], despesas = [], saldos = [];

  datas.forEach(d => {
    const mov = porData[d];
    acumulado += mov.receita - mov.despesa;
    labels.push(
      new Date(d + 'T12:00:00')
        .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    );
    receitas.push(parseFloat(mov.receita.toFixed(2)));
    despesas.push(parseFloat(mov.despesa.toFixed(2)));
    saldos.push(parseFloat(acumulado.toFixed(2)));
  });
  return { labels, receitas, despesas, saldos };
}
