/* Carregamento via Google Sheets CSV + status badge da aba Financeiro. */

function setFinStatus(state, msg) {
  ['fin-status', 'fin-status-foot'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('live', 'error', 'loading');
    el.classList.add(state);
    const txt = el.querySelector('.txt');
    if (txt) txt.textContent = msg;
    else el.textContent = msg;
  });
}

async function carregarDados(filtro = null) {
  setFinStatus('loading', 'Carregando dados…');
  mostrarLoadingGlobal(true);

  try {
    const [csvBoletos, csvFaturamento, csvMovimentacoes] = await Promise.all([
      fetch(SHEET_URLS.boletos).then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' (boletos)');
        return r.text();
      }),
      fetch(SHEET_URLS.faturamento).then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' (faturamento)');
        return r.text();
      }),
      fetch(SHEET_URLS.movimentacoes).then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' (movimentacoes)');
        return r.text();
      })
    ]);

    const rowsBoletos       = parseCSV(csvBoletos).slice(1);
    const rowsFaturamento   = parseCSV(csvFaturamento).slice(1);
    const rowsMovimentacoes = parseCSV(csvMovimentacoes).slice(1);

    let boletos       = processarBoletos(rowsBoletos);
    let faturamento   = processarFaturamento(rowsFaturamento);
    let movimentacoes = processarMovimentacoes(rowsMovimentacoes);

    if (filtro) {
      boletos       = filtrarPorPeriodo(boletos,       filtro, 'dataVencimento');
      faturamento   = filtrarPorPeriodo(faturamento,   filtro, 'data');
      movimentacoes = filtrarPorPeriodo(movimentacoes, filtro, 'data');
    }

    FIN_DATA.v5 = { boletos, faturamento, movimentacoes, filtro };

    // Adapta para o shape v4 (vencimento, status:0|1) — mantém renderers existentes
    FIN_DATA.boletos = boletos.map(b => ({
      id: b.id,
      empresa: b.empresa,
      vencimento: b.dataVencimento,
      codigo: b.codigoDigitavel,
      valor: b.valor,
      status: b.pago ? 1 : 0
    }));
    FIN_DATA.faturamento = faturamento.map(f => ({
      data: f.data,
      dinheiro: f.dinheiro,
      pix: f.pix,
      debito: f.debito,
      credito: f.credito,
      total: f.total
    }));
    FIN_DATA.contasFixas   = [];
    FIN_DATA.movimentacoes = movimentacoes;
    FIN_DATA.loaded = true;
    FIN_DATA.error  = null;

    setFinStatus('live', 'Conectado · ' + new Date().toLocaleTimeString('pt-BR'));

    renderizarFinanceiro({ boletos, faturamento, movimentacoes });
    renderizarVisaoGeral({ boletos, faturamento });

  } catch (err) {
    console.error(err);
    FIN_DATA.error = err.message;
    setFinStatus('error', 'Falha ao conectar · ' + err.message);
    showToast('Erro ao carregar dados: ' + err.message, 'error');
  } finally {
    mostrarLoadingGlobal(false);
  }
}
