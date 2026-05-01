/* Drawer lateral + FAB + conteúdo contextual por aba. */

const overlay     = document.getElementById('overlay');
const drawer      = document.getElementById('drawer');
const drawerBody  = document.getElementById('drawer-body');
const drawerTitle = document.getElementById('drawer-title');
const drawerSub   = document.getElementById('drawer-sub');
const drawerClose = document.getElementById('drawer-close');
const fab         = document.getElementById('fab');

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
    title: 'Cadastrar Fornecedor',
    sub:   'Contexto Financeiro',
    html: `
      <form id="form-supplier" autocomplete="off">
        <div class="form-field">
          <label class="form-label" for="sup-name">Nome do fornecedor</label>
          <input class="form-input" type="text" id="sup-name" placeholder="Ex: Distribuidora Aurora" required>
        </div>
        <div class="form-field" style="margin-top:0.9rem;">
          <label class="form-label">Tipo</label>
          <input class="form-input" type="text" value="Financeiro" readonly style="opacity:0.7;cursor:not-allowed;">
        </div>
        <button class="form-submit" type="submit">
          <span class="btn-label">Cadastrar</span>
        </button>
        <div class="form-note">
          Cadastro local · integração com a pasta <strong style="color:var(--text2);">BOLETOS/</strong> no Drive em etapa futura.
        </div>
      </form>
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
  const form = drawerBody.querySelector('#form-supplier');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = form.querySelector('#sup-name').value.trim().toUpperCase();
      if (!name) return;
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.suppliers) || '[]');
      if (!list.includes(name)) {
        list.push(name);
        localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify(list));
      }
      closeDrawer();
      showToast('Fornecedor cadastrado: ' + name, 'success');
      form.reset();
      renderFornecFin();
    });
  }
}

/* atalho Cadastrar Fornecedor (footer da aba Financeiro) */
document.getElementById('btn-open-add-supplier')?.addEventListener('click', () => {
  currentTab = 'financial';
  renderDrawerContent();
  openDrawer();
});
