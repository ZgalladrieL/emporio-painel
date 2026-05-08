# Painel Empório Barretão

Interface web de gestão interna do Empório Barretão. Página HTML + 1 CSS + 1 JS, consumindo dados diretamente do Google Sheets via CSV público.

---

## Estrutura do projeto

```
PAINEL/
├── index_v5.html              ← Markup (head, body, modais) — ~700 linhas
├── CLAUDE.md                  ← Guia de navegação para desenvolvedores e IA
├── README.md
└── assets/
    ├── css/
    │   └── painel.css         ← Todo o estilo (~2200 linhas)
    └── js/
        └── painel.js          ← Toda a lógica (~1140 linhas)
```

> Antes de Mai/2026 o projeto tinha `<style>` e `<script>` inline no `index_v5.html` (4059 linhas). Foi extraído para reduzir contexto consumido em sessões de IA e facilitar navegação.

---

## Abas do painel

| Aba | Descrição | Dados |
|-----|-----------|-------|
| Visão Geral | Resumo executivo semanal — Mente Ivo | Mockado + faturamento real |
| Automações | Status e diagnóstico das automações Apps Script | Mockado |
| Relatórios | Relatórios fixos mensais | Mockado |
| Financeiro | KPIs, gráfico Faturamento vs Contas a Pagar, tabela de boletos | Google Sheets (live) |

---

## Fontes de dados (Google Sheets)

| Planilha | Aba | Uso |
|----------|-----|-----|
| BASE_FINANCEIRO | `planilhaBoletos` | Contas a pagar, status pago/pendente |
| BASE_FINANCEIRO | `faturamentoDiario` | Receita diária por modalidade |
| BASE_FINANCEIRO | `movimentacoes` | Receita e despesa consolidadas (legado) |

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
