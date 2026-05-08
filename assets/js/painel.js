const gridColor  = 'rgba(255,255,255,0.04)';
const tickColor  = 'rgba(255,255,255,0.22)';

const SPREADSHEET_ID = '1kpfN3EGarFjkkuMnMBr7ly3mjt3ssOt9AvtepGzWAHA';

/* ═══════════ UTILS ═══════════ */
const fmtBRL = (n, dec = 0) => (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtDateBR = (d) => {
  if (!(d instanceof Date) || isNaN(d)) return '—';
  return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
};

function parseSheetDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    // Date(2026,3,15) format from gviz
    const m = v.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
    if (m) return new Date(+m[1], +m[2], +m[3], +m[4]||0, +m[5]||0, +m[6]||0);
    // ISO yyyy-mm-dd
    const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(+iso[1], +iso[2]-1, +iso[3]);
  }
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return d.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}

/* Semana do ano contada a partir de 1-jan (sem 1 = dias 1-7, sem 2 = dias 8-14, …) */
function calendarWeekNum(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date - start) / 86400000) + 1;
  return Math.ceil(dayOfYear / 7);
}
function calendarWeekKey(date) {
  return date.getFullYear() + '-W' + String(calendarWeekNum(date)).padStart(2, '0');
}

/* ═══════════ v5 · INTEGRAÇÃO COM GOOGLE SHEETS (CSV) ═══════════ */

const SHEET_ID = '1kpfN3EGarFjkkuMnMBr7ly3mjt3ssOt9AvtepGzWAHA';
const SHEET_URLS = {
  boletos:        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=planilhaBoletos`,
  faturamento:    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=faturamentoDiario`,
  movimentacoes:  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=movimentacoes`
};

/* ── Conversão Excel serial → Date (com ajuste de 1900 bissexto) ── */
function excelDateToJS(valor) {
  // Google CSV já entrega dd/mm/yyyy — converter direto
  if (typeof valor === 'string' && valor.includes('/')) {
    const [dia, mes, ano] = valor.split('/');
    return new Date(`${ano}-${mes}-${dia}T12:00:00`);
  }
  // Fallback: serial Excel (caso mude algum dia)
  const serial = parseFloat(valor);
  if (!isNaN(serial) && serial > 1000) {
    return new Date((serial - 25569) * 86400 * 1000);
  }
  return new Date('invalid');
}
function formatarData(d) {
  return d instanceof Date && !isNaN(d) ? d.toLocaleDateString('pt-BR') : '—';
}

/* ── Parser CSV robusto (lida com aspas e vírgulas internas) ── */
function parseCSV(text) {
  const rows = [];
  const lines = text.trim().split(/\r?\n/);
  for (const line of lines) {
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}
function toNum(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

/* ── Processadores: cada linha vira objeto JS ── */
function processarBoletos(rows) {
  return rows
    .filter(r => r[0] && r[1])
    .map(r => ({
      id:              r[0],
      empresa:         r[1],
      dataVencimento:  excelDateToJS(r[2]),  // passa string direto, sem toNum
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

/* ── Métricas agregadas ── */
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

/* ── Estado global (mantém shape v4 para compat com renderers existentes) ── */
const FIN_DATA = {
  boletos: [],
  contasFixas: [],
  faturamento: [],
  movimentacoes: [],
  loaded: false,
  error: null,
  // v5 · armazena também o formato do briefing (nomes em PT-BR)
  v5: { boletos: [], faturamento: [], filtro: null }
};

/* ── Toast (v5) ── */
function mostrarToast(msg, type = 'success') {
  let el = document.getElementById('v5-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'v5-toast';
    el.className = 'v5-toast';
    document.body.appendChild(el);
  }
  el.classList.toggle('error', type === 'error');
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ── Loading shimmer ── */
function mostrarLoadingGlobal(ativo) {
  document
    .querySelectorAll('#financial .fin-kpi, #financial .chart-wrap, #financial .fin-table-wrap, #vg-hero .kpi-card')
    .forEach(el => el.classList.toggle('loading', ativo));
}

/* ══════════════ CARREGAMENTO ══════════════ */
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
    // Sem dados mockados em seções conectadas
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
    mostrarToast('Erro ao carregar dados: ' + err.message, 'error');
  } finally {
    mostrarLoadingGlobal(false);
  }
}

/* ══════════════ RENDERIZAÇÃO ══════════════ */

function renderizarFinanceiro({ boletos, faturamento, movimentacoes }) {
  const m = calcularMetricas(boletos, faturamento);

  // Cards GERAL — IDs já existentes no HTML
  setText('kpi-fat',      formatBRL(m.totalReceita).replace('R$', '').trim());
  setText('kpi-fat-sub',  faturamento.length + ' dia(s) com lançamento');
  setText('kpi-pay',      formatBRL(m.totalPago + m.totalPendente).replace('R$', '').trim());
  setText('kpi-pay-sub',  m.totalContas + ' boleto(s) no período');
  setText('kpi-paid',     formatBRL(m.totalPago).replace('R$', '').trim());
  setText('kpi-paid-sub', m.contasPagas + ' boleto(s) pago(s)');
  setText('kpi-pend',     formatBRL(m.totalPendente).replace('R$', '').trim());
  setText('kpi-pend-sub', (m.totalContas - m.contasPagas) + ' boleto(s) em aberto');

  // Cards CONTAS pane (mantém os 2 KPIs já presentes)
  setText('kpi-c-pend',     formatBRL(m.totalPendente).replace('R$', '').trim());
  setText('kpi-c-pend-sub', (m.totalContas - m.contasPagas) + ' boletos em aberto');
  setText('kpi-c-total',    formatBRL(m.totalPendente + m.totalPago).replace('R$', '').trim());
  setText('kpi-c-total-sub', m.totalContas + ' lançamentos no período');

  // Cards FATURAMENTO pane
  setText('kpi-f-tot',      formatBRL(m.totalReceita).replace('R$', '').trim());
  setText('kpi-f-tot-sub',  faturamento.length + ' dias com lançamento');
  setText('kpi-f-tkt',      formatBRL(m.mediaDiaria).replace('R$', '').trim());
  setText('kpi-f-tkt-sub',  'média diária do período');

  // Gráfico Balanço (Receita / Despesa / Saldo Acumulado a partir de movimentacoes)
  renderBalancoChart();

  // Tabela de boletos (Empresa · Vencimento · Valor · Status)
  renderBoletosTable(boletos);

  // Limpa charts/tabelas mockadas das outras sub-abas (sem dados conectados)
  resetMockSubpanels();
}

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

function renderBalancoChart() {
  const fatMap  = new Map();
  FIN_DATA.faturamento.forEach(f => {
    const key = f.data.toISOString().split('T')[0];
    fatMap.set(key, (fatMap.get(key) || 0) + f.total);
  });

  const despMap = new Map();
  FIN_DATA.boletos.forEach(b => {
    const key = b.vencimento.toISOString().split('T')[0];
    despMap.set(key, (despMap.get(key) || 0) + b.valor);
  });

  const allDates = Array.from(new Set([...fatMap.keys(), ...despMap.keys()])).sort();
  const labels   = allDates.map(d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
  const fatData  = allDates.map(d => parseFloat((fatMap.get(d) || 0).toFixed(2)));
  const despData = allDates.map(d => parseFloat((despMap.get(d) || 0).toFixed(2)));

  destroyChart(chartBalance);
  const canvas = document.getElementById('finBalanceChart');
  if (!canvas) return;
  chartBalance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Faturamento',
          data: fatData,
          borderColor: '#6a9e52',
          backgroundColor: 'rgba(106,158,82,0.07)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true
        },
        {
          label: 'Contas a Pagar',
          data: despData,
          borderColor: '#a03838',
          backgroundColor: 'rgba(160,56,56,0.07)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      ...baseChartOpts,
      plugins: {
        ...baseChartOpts.plugins,
        legend: { display: true, labels: { color: '#c2b9aa', font: { family: 'DM Sans', size: 11 }, boxWidth: 14, padding: 14 } },
        tooltip: {
          ...baseChartOpts.plugins.tooltip,
          callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + formatBRL(ctx.raw) }
        }
      }
    }
  });
}

/* ── Tabela de boletos (paginação simples Ver mais) ── */
const BOLETOS_PAGE = 20;
let boletosState = { rows: [], shown: 0 };
function statusBoleto(b) {
  if (b.pago) return { label: 'Pago', cls: 'tag-green' };
  if (b.dataVencimento < new Date()) return { label: 'Vencido', cls: 'tag-red' };
  return { label: 'Pendente', cls: 'tag-amber' };
}
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
  if (more) {
    if (next < total) {
      more.style.display = '';
      more.textContent = 'Ver mais';
    } else if (next > BOLETOS_PAGE) {
      more.style.display = '';
      more.textContent = 'Ver menos';
    } else {
      more.style.display = 'none';
    }
  }
}
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'boletos-more') {
    if (e.target.textContent.trim() === 'Ver menos') {
      boletosState.shown = 0;
    }
    drawBoletosRows();
  }
});

/* ── Limpa as sub-abas que não têm fonte conectada ── */
function resetMockSubpanels() {
  destroyChart(chartExpWeek);
  destroyChart(chartFatWeek);
  ['#tbl-cat tbody', '#tbl-forn tbody'].forEach(sel => {
    const tb = document.querySelector(sel);
    if (tb) tb.innerHTML = `<tr><td colspan="2" class="empty" style="text-align:center;color:var(--text3);padding:1.4rem 0;font-style:italic;">Sem dados conectados</td></tr>`;
  });
  const info = document.getElementById('forn-pager-info');
  if (info) info.textContent = '0 - 0 / 0';
}

/* ── Helpers de formatação ── */
function formatBRL(val) {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
// reaproveita ymd() já definida acima (Item 3 v4)

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

function seedDemoData() {
  // fallback mínimo para visualização offline
  const mk = (m, d) => new Date(2026, m, d);
  FIN_DATA.boletos = [
    { id: 1, empresa: 'PHILIP MORRIS', vencimento: mk(3,5),  valor: 1240,  status: 1 },
    { id: 2, empresa: 'CIFAL',         vencimento: mk(3,10), valor: 2300,  status: 1 },
    { id: 3, empresa: 'LOUVADA',       vencimento: mk(3,15), valor: 870,   status: 0 },
    { id: 4, empresa: 'RIO VERMELHO',  vencimento: mk(3,18), valor: 1530,  status: 0 },
    { id: 5, empresa: 'PHILIP MORRIS', vencimento: mk(3,22), valor: 549,   status: 0 },
    { id: 6, empresa: 'AMBEV',         vencimento: mk(3,25), valor: 4200,  status: 1 },
  ];
  FIN_DATA.contasFixas = [
    { descricao: 'Equatorial', categoria: 'Energia',       data: mk(3,8),  valor: 980 },
    { descricao: 'Saneago',    categoria: 'Agua',          data: mk(3,12), valor: 220 },
    { descricao: 'FCO',        categoria: 'Imposto',       data: mk(3,20), valor: 1840 },
    { descricao: 'Folha',      categoria: 'Colaboradores', data: mk(3,5),  valor: 6200 }
  ];
  const days = [1,3,5,7,9,12,15,18,21,24,28];
  FIN_DATA.faturamento = days.map(d => ({
    data: mk(3,d),
    dinheiro: 400 + Math.random()*600,
    pix:      900 + Math.random()*1400,
    debito:   500 + Math.random()*900,
    credito:  700 + Math.random()*1100,
    total: 0
  })).map(x => { x.total = x.dinheiro + x.pix + x.debito + x.credito; return x; });
  FIN_DATA.movimentacoes = [
    ...FIN_DATA.faturamento.map(f => ({ data: f.data, tipo: 'Receita', valor: f.total })),
    ...FIN_DATA.boletos.map(b => ({ data: b.vencimento, tipo: 'Despesa', valor: b.valor })),
    ...FIN_DATA.contasFixas.map(c => ({ data: c.data, tipo: 'Despesa', valor: c.valor }))
  ];
}

/* ═══════════ PERIOD (v4 — date range) ═══════════ */
let periodState = { from: null, to: null };

function allDates() {
  const out = [];
  const push = (d) => { if (d) out.push(d); };
  FIN_DATA.boletos.forEach(b => push(b.vencimento));
  FIN_DATA.contasFixas.forEach(c => push(c.data));
  FIN_DATA.faturamento.forEach(f => push(f.data));
  FIN_DATA.movimentacoes.forEach(m => push(m.data));
  return out;
}

function ymd(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function parseYMD(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
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

  // v5 · Aplicar filtro = re-fetch dos dados reais com o range selecionado
  btn.onclick = () => {
    const de  = inFrom.value;
    const ate = inTo.value;
    if (!de || !ate) {
      mostrarToast('Selecione as duas datas', 'error');
      return;
    }
    if (new Date(de) > new Date(ate)) {
      mostrarToast('Data inicial maior que data final', 'error');
      return;
    }
    periodState = {
      from: new Date(de + 'T00:00:00'),
      to:   new Date(ate + 'T23:59:59')
    };
    carregarDados({ de, ate });
  };
}

function inPeriod(date) {
  if (!date || !periodState.from || !periodState.to) return false;
  const t = date.getTime();
  return t >= periodState.from.getTime() && t <= periodState.to.getTime();
}

function showToast(msg) {
  let el = document.getElementById('v4-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'v4-toast';
    el.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(20px);background:linear-gradient(160deg,#1f1710 0%,#130e08 100%);color:var(--copper-lt);border:0.5px solid rgba(200,130,74,0.45);padding:11px 22px;border-radius:8px;font-family:DM Sans,sans-serif;font-size:13px;letter-spacing:0.04em;z-index:9999;opacity:0;transition:opacity .25s,transform .25s;box-shadow:0 12px 30px rgba(0,0,0,0.4);';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
  });
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2400);
}

/* ═══════════ FINANCIAL CHARTS ═══════════ */
let chartBalance = null, chartExpWeek = null, chartFatWeek = null;
let fatViewMode = 'semanal';

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

function renderFinancial() {
  if (!FIN_DATA.loaded && !FIN_DATA.error) return;
  renderGeralPane();
  renderContasPane();
  renderFaturamentoPane();
}

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

const fornState = { rows: [], page: 0, perPage: 10, sortKey: 'val', sortDir: 'desc' };

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

function renderFaturamentoPane() {
  const fatPer = FIN_DATA.faturamento.filter(f => inPeriod(f.data));
  const total = fatPer.reduce((s,f) => s+f.total, 0);
  const diasComFat = fatPer.filter(f => f.total > 0).length;
  const ticket = diasComFat ? total / diasComFat : 0;
  setText('kpi-f-tot', fmtBRL(total));
  setText('kpi-f-tkt', fmtBRL(ticket));
  setText('kpi-f-tot-sub', fatPer.length + ' dias com lançamento');
  setText('kpi-f-tkt-sub', diasComFat + ' dias com faturamento > 0');

  renderFatChart(fatPer);
}

function renderFatChart(fatPer) {
  if (!fatPer) fatPer = FIN_DATA.faturamento.filter(f => inPeriod(f.data));

  const sub = document.getElementById('fat-chart-sub');

  if (fatViewMode === 'semanal') {
    // Agrupa por semana calendário (sem 1 = 1-7 jan, sem 2 = 8-14 jan, …)
    const weekMap = new Map();
    fatPer.forEach(f => {
      const k = calendarWeekKey(f.data);
      weekMap.set(k, (weekMap.get(k) || 0) + f.total);
    });
    const weekKeys = Array.from(weekMap.keys()).sort();
    const labels = weekKeys.map(k => {
      const num = parseInt(k.split('-W')[1], 10);
      return 'Semana ' + num;
    });
    if (sub) sub.textContent = 'Soma do faturamento por semana · Semana 1 = 1–7 jan';

    destroyChart(chartFatWeek);
    const canvas = document.getElementById('finFatChart');
    if (!canvas) return;
    chartFatWeek = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets: [{
        data: weekKeys.map(k => weekMap.get(k)),
        backgroundColor: 'rgba(106,158,82,0.55)',
        borderColor: '#6a9e52', borderWidth: 1, borderRadius: 4
      }] },
      options: { ...baseChartOpts,
        plugins: { ...baseChartOpts.plugins, tooltip: { ...baseChartOpts.plugins.tooltip,
          callbacks: { label: ctx => ' ' + ctx.label + ': ' + formatBRL(ctx.raw) } } } }
    });
  } else {
    // Faturamento diário — preenche todos os dias do período com 0 onde não há registro
    const dailyMap = new Map();
    fatPer.forEach(f => { dailyMap.set(ymd(f.data), (dailyMap.get(ymd(f.data)) || 0) + f.total); });
    const labels = [], data = [];
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
    if (sub) sub.textContent = 'Total por dia · dias sem registro = R$ 0';

    destroyChart(chartFatWeek);
    const canvas = document.getElementById('finFatChart');
    if (!canvas) return;
    chartFatWeek = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets: [{
        data, borderColor: '#6a9e52', backgroundColor: 'rgba(106,158,82,0.10)',
        borderWidth: 2, pointRadius: 2, pointHoverRadius: 5, tension: 0.25, fill: true
      }] },
      options: { ...baseChartOpts,
        plugins: { ...baseChartOpts.plugins, tooltip: { ...baseChartOpts.plugins.tooltip,
          callbacks: { label: ctx => ' ' + formatBRL(ctx.raw) } } } }
    });
  }
}

/* Toggle Semanal / Diário */
document.addEventListener('click', e => {
  const btn = e.target.closest('.fat-view-btn');
  if (!btn) return;
  fatViewMode = btn.dataset.view;
  document.querySelectorAll('.fat-view-btn').forEach(b => b.classList.toggle('active', b === btn));
  const fatPer = FIN_DATA.faturamento.filter(f => inPeriod(f.data));
  renderFatChart(fatPer);
});

function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

/* ── COUNTER ANIMATION ── */
function formatBR(n, decimals) {
  if (decimals > 0) return n.toFixed(decimals).replace('.', ',');
  return Math.round(n).toLocaleString('pt-BR');
}
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

/* ── NAV ── */
const links    = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section');

function activate(target) {
  links.forEach(l => l.classList.toggle('active', l.dataset.target === target));
  sections.forEach(s => s.classList.toggle('active', s.id === target));

  const sec = document.getElementById(target);
  if (!sec) return;
  restartCardEntrances(sec);
  restartBarFills(sec);
  animateAllCountersIn(sec);
  if (target === 'financial') {
    // resize charts em caso de mudança de viewport enquanto a aba estava oculta
    [chartBalance, chartExpWeek, chartFatWeek].forEach(c => c && c.resize());
  }

  closeDrawer();
  currentTab = target;
  renderDrawerContent();
}

links.forEach(l => l.addEventListener('click', () => activate(l.dataset.target)));

/* ── SUB-TABS FINANCEIRO ── */
document.querySelectorAll('.fin-subtab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.fin-subtab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.fin-pane').forEach(p => p.classList.toggle('active', p.id === btn.dataset.pane));
    [chartBalance, chartExpWeek, chartFatWeek].forEach(c => c && c.resize());
  });
});

/* ── PAGINAÇÃO + SORT FORNECEDORES ── */
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

/* ═══════════ DRAWER ═══════════ */
const overlay      = document.getElementById('overlay');
const drawer       = document.getElementById('drawer');
const drawerBody   = document.getElementById('drawer-body');
const drawerTitle  = document.getElementById('drawer-title');
const drawerSub    = document.getElementById('drawer-sub');
const drawerClose  = document.getElementById('drawer-close');
const fab          = document.getElementById('fab');

let currentTab = 'overview';

function openDrawer()  {
  drawer.classList.add('open');
  overlay.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
}
function closeDrawer() {
  drawer.classList.remove('open');
  overlay.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
}
fab.addEventListener('click', () => { renderDrawerContent(); openDrawer(); });
overlay.addEventListener('click', closeDrawer);
drawerClose.addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

const drawerContent = {
  overview: () => ({
    title: 'Ações rápidas',
    sub:   'Visão geral',
    html: `
      <button class="drawer-action" data-toast="Exportação solicitada. Em breve disponível para download." data-toast-type="success">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Exportar relatório
      </button>
      <div class="drawer-section-eyebrow">Período</div>
      <div class="form-field">
        <label class="form-label" for="drawer-period">Configurar período</label>
        <input class="form-input" type="date" id="drawer-period" value="2026-04-25">
      </div>
    `
  }),
  automations: () => ({
    title: 'Ações de automação',
    sub:   'Pipelines',
    html: `
      <button class="drawer-action" data-toast="Execução manual disparada · aguardando retorno do pipeline." data-toast-type="success">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Forçar execução
      </button>
      <button class="drawer-action" data-toast="Abrindo histórico completo de execuções." data-toast-type="success">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Ver log completo
      </button>
      <button class="drawer-action" data-toast="Problema reportado para a Mente Ivo · resposta em até 1h." data-toast-type="warning">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2 1 21h22L12 2z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Reportar problema
      </button>
    `
  }),
  reports: () => ({
    title: 'Ações de relatórios',
    sub:   'Geração & Exportação',
    html: `
      <button class="drawer-action" data-toast="Relatório agendado para o próximo fechamento mensal." data-toast-type="success">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Agendar relatório
      </button>
      <button class="drawer-action" data-toast="Exportação em PDF iniciada · aguarde alguns instantes." data-toast-type="success">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Exportar PDF
      </button>
    `
  }),
  financial: () => ({
    title: 'Ações Financeiras',
    sub:   'Contexto Financeiro',
    html: `
      <button class="drawer-action" data-toast="Exportação solicitada. Em breve disponível para download." data-toast-type="success">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Exportar relatório
      </button>
    `
  }),
  stock: () => ({
    title: 'Estoque',
    sub:   'Em desenvolvimento',
    html: `
      <div style="padding: 1.4rem 1rem; text-align:center; border:0.5px dashed var(--border2); border-radius:12px; background: rgba(255,255,255,0.015);">
        <div style="font-family:'Cormorant Garamond', serif; font-size:18px; color:var(--copper-lt); margin-bottom:6px;">Em breve</div>
        <div style="font-size:13px; color:var(--text3); line-height:1.55;">Cadastro de fornecedores de estoque e fluxo de NF serão liberados em etapa futura.</div>
      </div>
    `
  })
};

function renderDrawerContent() {
  const cfg = (drawerContent[currentTab] || drawerContent.overview)();
  drawerTitle.textContent = cfg.title;
  drawerSub.textContent   = cfg.sub;
  drawerBody.innerHTML    = cfg.html;
  bindDrawerHandlers();
}

function bindDrawerHandlers() {
  drawerBody.querySelectorAll('[data-toast]').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast(btn.dataset.toast, btn.dataset.toastType || 'success');
      closeDrawer();
    });
  });
}

/* ═══════════ TOAST ═══════════ */
const toastWrap = document.getElementById('toast-wrap');
function showToast(message, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = {
    success: '<svg class="toast-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="20 6 9 17 4 12"/></svg>',
    warning: '<svg class="toast-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2 1 21h22L12 2z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    error:   '<svg class="toast-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
  };
  t.innerHTML = `${icons[type] || icons.success}<div class="toast-body">${message}</div>`;
  toastWrap.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    t.addEventListener('animationend', () => t.remove(), { once: true });
  }, 3000);
}

/* ═══════════ GERAR RELATÓRIO (aba Relatórios — preservada) ═══════════ */
document.querySelectorAll('.rep-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    if (btn.dataset.loading === '1') return;
    btn.dataset.loading = '1';
    const label = btn.querySelector('.btn-label');
    const wasGenerated = btn.dataset.done === '1';
    label.innerHTML = '<span class="spinner"></span><span style="margin-left:8px;">' + (wasGenerated ? 'Regerando…' : 'Gerando…') + '</span>';

    setTimeout(() => {
      const card = btn.closest('.rep-card');
      const result = card.querySelector('.rep-result');
      result.classList.add('open');
      label.textContent = 'Regerar ↻';
      btn.dataset.loading = '';
      btn.dataset.done = '1';
    }, 2000);
  });
});

/* ═══════════ PROJETOS · tabela editável + localStorage (v4 · Visão Geral 5.3) ═══════════ */
const PROJ_KEY = 'emporio_projetos_v3';
const STATUS_OPTS = [
  { v: 'done',   label: 'Concluído',    cls: 's-done'   },
  { v: 'doing',  label: 'Em andamento', cls: 's-doing'  },
  { v: 'paused', label: 'Pausado',      cls: 's-paused' }
];
const DEFAULT_PROJECTS = [
  { id: 1, name: 'AUTO_ORGANIZAR_NF',      sector: 'Automações', status: 'done',   note: 'Pipeline de NFs operacional' },
  { id: 2, name: 'AUTO_ORGANIZAR_BOLETOS', sector: 'Automações', status: 'done',   note: 'OCR e categorização funcionando' },
  { id: 3, name: 'Dashboard Empório',      sector: 'Gestão',     status: 'doing',  note: 'Refinamentos visuais em curso' },
  { id: 4, name: 'CRM Fornecedores',       sector: 'Comercial',  status: 'paused', note: 'Aguardando definição de escopo' }
];

function loadProjects() {
  try {
    const raw = localStorage.getItem(PROJ_KEY);
    if (!raw) return DEFAULT_PROJECTS.slice();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length ? arr : DEFAULT_PROJECTS.slice();
  } catch { return DEFAULT_PROJECTS.slice(); }
}
function saveProjects(list) { localStorage.setItem(PROJ_KEY, JSON.stringify(list)); }

let projects = loadProjects();

function renderProjects() {
  const tbody = document.getElementById('proj-tbody');
  if (!tbody) return;
  tbody.innerHTML = projects.map(p => {
    const statusOpt = STATUS_OPTS.find(s => s.v === p.status) || STATUS_OPTS[1];
    return `
      <tr data-id="${p.id}">
        <td><span class="proj-cell" contenteditable="true" data-field="name" spellcheck="false">${escapeHtml(p.name)}</span></td>
        <td><span class="proj-cell" contenteditable="true" data-field="sector" spellcheck="false">${escapeHtml(p.sector)}</span></td>
        <td>
          <select class="proj-status-sel ${statusOpt.cls}" data-field="status">
            ${STATUS_OPTS.map(s => `<option value="${s.v}" ${s.v===p.status?'selected':''}>${s.label}</option>`).join('')}
          </select>
        </td>
        <td><span class="proj-cell" contenteditable="true" data-field="note" data-placeholder="Observação…" spellcheck="false">${escapeHtml(p.note || '')}</span></td>
        <td><button class="proj-del" data-act="del" title="Remover" aria-label="Remover linha">×</button></td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('tr').forEach(tr => {
    const id = Number(tr.dataset.id);
    const proj = projects.find(p => p.id === id);
    if (!proj) return;

    tr.querySelectorAll('.proj-cell[contenteditable]').forEach(el => {
      el.addEventListener('blur', () => {
        proj[el.dataset.field] = el.innerText.trim();
        saveProjects(projects);
      });
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' && el.dataset.field !== 'note') { e.preventDefault(); el.blur(); }
      });
    });

    const sel = tr.querySelector('.proj-status-sel');
    sel.addEventListener('change', () => {
      proj.status = sel.value;
      saveProjects(projects);
      sel.classList.remove('s-done','s-doing','s-paused');
      const opt = STATUS_OPTS.find(s => s.v === sel.value);
      if (opt) sel.classList.add(opt.cls);
    });

    tr.querySelector('[data-act="del"]').addEventListener('click', () => {
      projects = projects.filter(p => p.id !== id);
      saveProjects(projects);
      renderProjects();
    });
  });
}

document.getElementById('proj-add-btn')?.addEventListener('click', () => {
  const newId = (projects.reduce((m,p) => Math.max(m, p.id||0), 0) || 0) + 1;
  projects.push({ id: newId, name: 'Novo projeto', sector: 'Setor', status: 'doing', note: '' });
  saveProjects(projects);
  renderProjects();
  // foca no nome da nova linha
  setTimeout(() => {
    const last = document.querySelector(`.proj-tbl tr[data-id="${newId}"] .proj-cell[data-field="name"]`);
    if (last) {
      last.focus();
      const range = document.createRange();
      range.selectNodeContents(last);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, 30);
});

function escapeHtml(s) {
  return String(s||'').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ═══════════ INIT (v5) ═══════════ */
window.addEventListener('load', () => {
  renderProjects();
  renderDrawerContent();

  // Período padrão = 1º dia do mês atual até hoje
  const hoje   = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inFrom = document.getElementById('fin-date-from');
  const inTo   = document.getElementById('fin-date-to');
  if (inFrom) inFrom.value = ymd(inicio);
  if (inTo)   inTo.value   = ymd(hoje);

  buildPeriodOptions(); // configura defaults + wire do botão
  carregarDados({ de: ymd(inicio), ate: ymd(hoje) });
});

window.addEventListener('resize', () => {
  [chartBalance, chartExpWeek, chartFatWeek].forEach(c => c && c.resize());
});
