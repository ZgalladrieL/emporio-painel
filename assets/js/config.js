/* Constantes globais do painel — paleta Chart.js, IDs de planilha, chaves de localStorage. */

const gridColor = 'rgba(255,255,255,0.04)';
const tickColor = 'rgba(255,255,255,0.22)';

const SHEET_ID = '1kpfN3EGarFjkkuMnMBr7ly3mjt3ssOt9AvtepGzWAHA';
const SHEET_URLS = {
  boletos:       `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=planilhaBoletos`,
  faturamento:   `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=faturamentoDiario`,
  movimentacoes: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=movimentacoes`
};

const BOLETOS_PAGE = 20;

const STORAGE_KEYS = {
  projects:  'emporio_projetos_v3',
  suppliers: 'emporio_fornecedores_fin_v1'
};
