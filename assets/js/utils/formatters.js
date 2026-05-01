/* Formatadores e helpers de DOM. */

/* fmtBRL(n, dec=0) → "1.234" (sem prefixo, decimais configuráveis) */
const fmtBRL = (n, dec = 0) => (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

/* formatBRL(val) → "R$ 1.234,00" (com prefixo, 2 casas) */
function formatBRL(val) {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatBR(n, decimals) {
  if (decimals > 0) return n.toFixed(decimals).replace('.', ',');
  return Math.round(n).toLocaleString('pt-BR');
}

function fmtDateBR(d) {
  if (!(d instanceof Date) || isNaN(d)) return '—';
  return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
}

function formatarData(d) {
  return d instanceof Date && !isNaN(d) ? d.toLocaleDateString('pt-BR') : '—';
}

function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

function escapeHtml(s) {
  return String(s||'').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
