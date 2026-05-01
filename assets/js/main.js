/* INIT — boot do painel: render inicial das listas + período padrão + carregamento. */

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

  buildPeriodOptions();
  carregarDados({ de: ymd(inicio), ate: ymd(hoje) });
});

window.addEventListener('resize', () => {
  [chartBalance, chartExpWeek, chartFatWeek, chartFatDaily].forEach(c => c && c.resize());
});
