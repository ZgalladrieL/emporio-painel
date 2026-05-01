/* Estado global compartilhado entre views. Mantém shape v4 + v5 dual format —
   normalização para um shape único é trabalho da próxima rodada (Financeiro). */

const FIN_DATA = {
  boletos: [],
  contasFixas: [],
  faturamento: [],
  movimentacoes: [],
  loaded: false,
  error: null,
  v5: { boletos: [], faturamento: [], filtro: null }
};

let periodState = { from: null, to: null };

const fornState     = { rows: [], page: 0, perPage: 10, sortKey: 'val', sortDir: 'desc' };
let   boletosState  = { rows: [], shown: 0 };

let chartBalance  = null;
let chartExpWeek  = null;
let chartFatWeek  = null;
let chartFatDaily = null;

let currentTab = 'overview';
