/* Tabela editável de Projetos (Visão Geral 5.3) — persistida em localStorage. */

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
    const raw = localStorage.getItem(STORAGE_KEYS.projects);
    if (!raw) return DEFAULT_PROJECTS.slice();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length ? arr : DEFAULT_PROJECTS.slice();
  } catch { return DEFAULT_PROJECTS.slice(); }
}

function saveProjects(list) { localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(list)); }

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
