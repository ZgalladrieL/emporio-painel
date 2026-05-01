# Painel Empório Barretão

Interface web de gestão interna do Empório Barretão. Página HTML modularizada com CSS e JS separados por responsabilidade, consumindo dados diretamente do Google Sheets via CSV público.

---

## Estrutura do projeto

```
PAINEL/
├── index_v5.html              ← Ponto de entrada principal
└── assets/
    ├── css/
    │   ├── tokens.css         ← Variáveis de cor e tipografia
    │   ├── layout.css         ← Shell, header, navegação
    │   ├── responsive.css     ← Breakpoints e adaptações mobile
    │   └── components/        ← CSS por componente
    │       ├── kpi-cards.css
    │       ├── panels.css
    │       ├── financeiro.css
    │       ├── automacoes.css
    │       ├── visao-geral.css
    │       ├── relatorios.css
    │       ├── projetos.css
    │       ├── drawer.css
    │       ├── tables.css
    │       ├── tags.css
    │       ├── toast.css
    │       └── estoque.css
    └── js/
        ├── config.js          ← IDs das planilhas e configurações globais
        ├── main.js            ← Ponto de entrada JS, inicialização
        ├── state.js           ← Estado global da aplicação
        ├── data/
        │   ├── loader.js      ← Fetch das planilhas Google Sheets
        │   └── processors.js  ← Processamento e transformação dos dados
        ├── ui/
        │   ├── nav.js         ← Navegação entre abas
        │   ├── drawer.js      ← Painel lateral de ações contextual
        │   ├── animations.js  ← Animações de entrada e transições
        │   └── toast.js       ← Notificações temporárias
        ├── utils/
        │   ├── dates.js       ← Conversão de datas (serial Excel → JS)
        │   ├── formatters.js  ← Formatação monetária e numérica
        │   └── csv.js         ← Parser CSV robusto
        ├── storage/
        │   └── projects.js    ← Persistência de projetos via localStorage
        └── views/
            ├── visao-geral.js
            ├── financeiro.js
            ├── financeiro-geral.js
            ├── financeiro-charts.js
            ├── financeiro-contas.js
            ├── financeiro-faturamento.js
            └── relatorios.js
```

---

## Abas do painel

| Aba | Descrição | Dados |
|-----|-----------|-------|
| Visão Geral | Resumo executivo semanal — Mente Ivo | Mockado + futuro Sheets |
| Automações | Status e diagnóstico das automações Apps Script | Mockado |
| Relatórios | Relatórios fixos mensais | Mockado |
| Financeiro | KPIs, gráfico Receita/Despesa, contas a pagar | Google Sheets (live) |
| Fornecedores | CRM básico de fornecedores | localStorage |

---

## Fontes de dados (Google Sheets)

| Planilha | Aba | Uso |
|----------|-----|-----|
| BASE_FINANCEIRO | `planilhaBoletos` | Contas a pagar, status pago/pendente |
| BASE_FINANCEIRO | `faturamentoDiario` | Receita diária por modalidade |
| BASE_FINANCEIRO | `movimentacoes` | Receita e Despesa consolidadas para gráfico |

**Sheet ID:** `1kpfN3EGarFjkkuMnMBr7ly3mjt3ssOt9AvtepGzWAHA`

> A planilha deve estar compartilhada como "Qualquer pessoa com o link — Visualizador" para o fetch funcionar.

---

## Identidade visual

- **Fundo:** `#0c0d0f` com painéis em `#111317`
- **Acento principal:** Cobre `#c8824a` / `#e8a96e`
- **Tipografia:** Cinzel (marca) · Cormorant Garamond (títulos/números) · DM Sans (interface)
- **Tema:** Dark premium com profundidade em camadas, ghost watermarks, radial glow cobre

---

## Como rodar localmente

1. Instalar extensão **Live Server** no VS Code
2. Clicar com botão direito em `index_v5.html` → **Open with Live Server**
3. Acessar `http://localhost:5500/PAINEL/index_v5.html`

> Necessário rodar via servidor local (não abrir como `file://`) para o fetch das planilhas funcionar corretamente.

---

## Roadmap

- [ ] Conectar seção Visão Geral com dados reais via Mente Ivo (API Claude)
- [ ] Conectar status das Automações via Apps Script Web App
- [ ] Implementar relatórios fixos mensais com dados reais
- [ ] Migrar hospedagem para Google Sites (autenticação corporativa)
- [ ] Evoluir Fornecedores para CRM completo integrado ao fluxo de NFs
