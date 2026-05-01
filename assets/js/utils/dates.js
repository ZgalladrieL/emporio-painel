/* Helpers de data: parsing, formatação ISO e filtro por período. */

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

/* Conversão Excel serial → Date (com ajuste de 1900 bissexto).
   Google CSV já entrega dd/mm/yyyy — converte direto; mantém fallback p/ serial. */
function excelDateToJS(valor) {
  if (typeof valor === 'string' && valor.includes('/')) {
    const [dia, mes, ano] = valor.split('/');
    return new Date(`${ano}-${mes}-${dia}T12:00:00`);
  }
  const serial = parseFloat(valor);
  if (!isNaN(serial) && serial > 1000) {
    return new Date((serial - 25569) * 86400 * 1000);
  }
  return new Date('invalid');
}

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return d.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
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

function allDates() {
  const out = [];
  const push = (d) => { if (d) out.push(d); };
  FIN_DATA.boletos.forEach(b => push(b.vencimento));
  FIN_DATA.contasFixas.forEach(c => push(c.data));
  FIN_DATA.faturamento.forEach(f => push(f.data));
  FIN_DATA.movimentacoes.forEach(m => push(m.data));
  return out;
}

function inPeriod(date) {
  if (!date || !periodState.from || !periodState.to) return false;
  const t = date.getTime();
  return t >= periodState.from.getTime() && t <= periodState.to.getTime();
}
