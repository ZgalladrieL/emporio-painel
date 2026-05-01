/* Parser CSV robusto (lida com aspas e vírgulas internas). */

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
