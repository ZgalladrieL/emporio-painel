# CLAUDE.md — Guia de navegação do PAINEL

Documento para desenvolvedores e IA. Lê isso antes de tocar no código.

## Arquitetura

3 arquivos, ordem de carga:

1. `index_v5.html` — markup puro (~700 linhas). Carrega Chart.js (CDN) + CSS + JS abaixo.
2. `assets/css/painel.css` — todo o estilo (~2200 linhas).
3. `assets/js/painel.js` — toda a lógica (~1140 linhas). Carregado no fim do `<body>` para garantir que o DOM exista.

Não há bundler, não há módulos ES, não há build step. Apenas Live Server.

## Mapa de `painel.js` (procure por `═══════════` para achar a seção)

| Seção | Linhas aprox. | O quê |
|-------|---------------|-------|
| UTILS | 1-40 | `fmtBRL`, `fmtDateBR`, `parseSheetDate`, `isoWeekKey` |
| INTEGRAÇÃO GOOGLE SHEETS | 40-160 | `SHEET_URLS`, `parseCSV`, processadores, `calcularMetricas`, `FIN_DATA` |
| TOAST + LOADING | 160-185 | `mostrarToast`, `mostrarLoadingGlobal` |
| CARREGAMENTO | 185-260 | `carregarDados()` — fetch + adapter + renderização |
| RENDERIZAÇÃO | 260-380 | `renderizarFinanceiro`, `renderizarVisaoGeral`, `renderBalancoChart` |
| TABELA DE BOLETOS | 380-435 | `renderBoletosTable`, `drawBoletosRows`, `statusBoleto` |
| HELPERS | 435-460 | `formatBRL`, `setFinStatus`, `seedDemoData` |
| PERIOD | 460-555 | `periodState`, `ymd`, `buildPeriodOptions`, `inPeriod`, `showToast` (legado) |
| FINANCIAL CHARTS | 555-680 | `baseChartOpts`, `destroyChart`, **dead code:** `renderFinancial`, `renderGeralPane`, `renderContasPane`, `renderFaturamentoPane` |
| FORN STATE + SUB-TABS | 680-720 | `fornState`, `renderFornecedoresTable` (dead), handlers de paginação |
| NAV + ANIMAÇÕES | 720-790 | `activate`, `animateCounter`, contadores e fades |
| DRAWER | 790-880 | `openDrawer`, `closeDrawer`, `drawerContent`, `bindDrawerHandlers` |
| TOAST (real) | 880-905 | `showToast` que escreve em `#toast-wrap` |
| RELATÓRIOS | 905-925 | Botões "Gerar relatório" |
| PROJETOS | 925-1010 | Tabela editável persistida em `localStorage` (`PROJ_KEY`) |
| INIT | 1010-1043 | `window.load` → render projetos + período padrão + `carregarDados()` |

## Fluxo de dados

```
window.load
  └─→ carregarDados({de, ate})
        ├─→ fetch 3 CSVs (boletos, faturamento, movimentacoes)
        ├─→ parseCSV → processarBoletos / Faturamento / Movimentacoes
        ├─→ filtrarPorPeriodo (se filtro)
        ├─→ FIN_DATA.boletos / faturamento / movimentacoes (formato adaptado v4)
        ├─→ renderizarFinanceiro({boletos, faturamento, movimentacoes})
        │     ├─→ calcularMetricas → setText nos KPIs
        │     ├─→ renderBalancoChart() — gráfico 2 linhas (Faturamento + Contas a Pagar)
        │     ├─→ renderBoletosTable(boletos)
        │     └─→ resetMockSubpanels() — limpa sub-abas Contas e Faturamento
        └─→ renderizarVisaoGeral({boletos, faturamento})
              └─→ KPIs da aba Visão Geral
```

## Shape de dados em `FIN_DATA`

```js
FIN_DATA = {
  boletos: [{ id, empresa, vencimento: Date, codigo, valor, status: 0|1 }],
  faturamento: [{ data: Date, dinheiro, pix, debito, credito, total }],
  movimentacoes: [{ data: Date, tipo: 'Receita'|'Despesa', valor }],
  contasFixas: [],  // vazio — não conectado
  loaded: bool, error: string|null,
  v5: { ... }       // formato original antes do adapter v4
}
```

## Convenções importantes

- **Sub-abas Contas e Faturamento são intencionalmente vazias.** `resetMockSubpanels()` destrói os charts e mostra "Sem dados conectados". O código de `renderContasPane`/`renderFaturamentoPane`/`renderFinancial` está presente mas **nunca é chamado** — é legado preservado caso queira reativar.
- **A única tabela com dados reais é boletos** (`#boletos-tbl`).
- **`kpi-pay` (Contas a Pagar) = totalPago + totalPendente.** Não confunda com `kpi-pend` (Saldo Pendente).
- **Período padrão:** 1º dia do mês atual até hoje. Configurado no `window.load`.
- **localStorage:**
  - `emporio_projetos_v3` — tabela editável de Projetos (Visão Geral)
  - `emporio_fornecedores_fin_v1` — **não usado mais** (Fornecedores Financeiros foi removido em Mai/2026)

## Edição

- **Sempre edite `painel.js` e `painel.css`.** Não duplique código no HTML.
- **`var`/`let`/`const` no top-level de `painel.js` ficam globais para o realm.** Funções são içadas. Não há ordem mágica entre arquivos pois há apenas um.
- **Chart.js 4.4.1** é a única dependência externa. Sempre chame `destroyChart(c)` antes de recriar `chartBalance`/etc. para evitar leak.

## Memória semântica conhecida

- "Boleto sem linha digitável" → se o OCR falha, nada é escrito/criado. É sinal de erro intencional, não bug.
