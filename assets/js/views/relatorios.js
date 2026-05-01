/* Aba Relatórios — botões "Gerar relatório" com simulação de loading. */

document.querySelectorAll('.rep-btn').forEach(btn => {
  btn.addEventListener('click', () => {
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
