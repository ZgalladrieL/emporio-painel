/* Navegação entre abas top-level + sub-tabs do Financeiro. */

const navLinks    = document.querySelectorAll('.nav-link');
const navSections = document.querySelectorAll('.section');

function activate(target) {
  navLinks.forEach(l => l.classList.toggle('active', l.dataset.target === target));
  navSections.forEach(s => s.classList.toggle('active', s.id === target));

  const sec = document.getElementById(target);
  if (!sec) return;
  restartCardEntrances(sec);
  restartBarFills(sec);
  animateAllCountersIn(sec);
  if (target === 'financial') {
    [chartBalance, chartExpWeek, chartFatWeek, chartFatDaily].forEach(c => c && c.resize());
  }

  closeDrawer();
  currentTab = target;
  renderDrawerContent();
}

navLinks.forEach(l => l.addEventListener('click', () => activate(l.dataset.target)));

/* Sub-tabs do Financeiro */
document.querySelectorAll('.fin-subtab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.fin-subtab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.fin-pane').forEach(p => p.classList.toggle('active', p.id === btn.dataset.pane));
    [chartBalance, chartExpWeek, chartFatWeek, chartFatDaily].forEach(c => c && c.resize());
  });
});
