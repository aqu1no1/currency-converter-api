# Diagramas de sequência

Mostram, passo a passo, quem chama quem em cada fluxo da API. Foram feitos a partir do documento "Arquitetura e decisões" e das tasks API-9 a API-14 do Linear.

[← Voltar para a documentação](../README.md)

## Como ler

- Cada coluna é uma parte do sistema (classe, banco ou API externa). As setas mostram a ordem das chamadas, numeradas.
- Seta cheia (`->>`) é uma chamada; seta tracejada (`-->>`) é a resposta.
- Blocos `alt` / `else` são caminhos alternativos (sucesso ou erro). Blocos `loop` se repetem.
- As notas amarelas explicam uma regra que acontece naquele ponto.

O projeto tem dois tipos de fluxo, que só se encontram no banco:

- **Escrita** ([sincronização diária](#sincronização-diária) e [carga inicial](#carga-inicial-desde-2000)): buscam cotações na Frankfurter e salvam no PostgreSQL.
- **Leitura** ([convert](#get-exchange-ratesconvert), [latest](#get-exchange-rateslatestbase), [history](#get-exchange-rateshistory) e [sync/status](#get-syncstatus)): só leem do banco, nunca chamam a Frankfurter.

---

## Sincronização diária

Roda todo dia às 6h (horário de Brasília) e busca os **últimos 5 dias**. A janela de 5 dias corrige valores que o provedor revisou e recupera dias perdidos se o cron falhar em algum dia. O `SyncService` não conhece a Frankfurter: ele fala com a porta `ExchangeRateProvider`, e o `FrankfurterAdapter` é quem faz o HTTP. Qualquer falha fica registrada em `sync_runs`, e a API continua respondendo com os dados já salvos.

```mermaid
sequenceDiagram
    autonumber
    participant Cron as SyncDailyRatesCron
    participant S as SyncService
    participant C as CurrencyService
    participant P as ExchangeRateProvider (porta)
    participant F as FrankfurterAdapter
    participant API as Frankfurter v2
    participant DB as PostgreSQL

    Cron->>S: syncRates()
    S->>DB: INSERT sync_runs (DAILY, RUNNING)
    S->>C: listar moedas suportadas
    C->>DB: SELECT currencies
    DB-->>C: 10 moedas
    C-->>S: moedas
    Note over S: remove BASE_CURRENCY (USD)
    S->>P: buscar período (base USD, 9 moedas, from = hoje - 5 dias)
    P->>F: implementação injetada pelo FrankfurterModule
    F->>API: GET /v2/rates?base=usd&quotes=...&from=...
    Note over F,API: timeout + axios-retry só em rede, timeout e 5xx
    alt resposta válida
        API-->>F: [{ date, base, quote, rate }]
        Note over F: valida com Zod e mapeia (rate como string)
        F-->>S: cotações no formato da porta
        S->>DB: UPSERT exchange_rates ON CONFLICT (currency_id, rate_date) DO UPDATE
        Note over S,DB: rate_date = date da resposta
        S->>DB: UPDATE sync_runs SUCCESS, finished_at, rows_inserted
    else falha (rede, 4xx, 5xx após retry, Zod)
        F--)S: exceção da porta
        S->>DB: UPDATE sync_runs FAILED, finished_at, error_message
    end
```

## Carga inicial desde 2000

Disparada por `POST /sync/backfill`. Responde `202` na hora e continua em segundo plano. Busca **um ano por chamada**, de 2000 até o ano atual, com uma pausa de 7 segundos entre os anos para respeitar o limite da Frankfurter. Usa o mesmo `UPSERT` do sync diário, então rodar de novo não duplica dados.

```mermaid
sequenceDiagram
    autonumber
    actor U as Cliente
    participant S as SyncService
    participant C as CurrencyService
    participant P as ExchangeRateProvider (porta)
    participant API as Frankfurter v2
    participant DB as PostgreSQL

    U->>S: POST /sync/backfill
    alt já existe um backfill RUNNING
        S-->>U: 409
    else nenhum em execução
        S->>DB: INSERT sync_runs (BACKFILL, RUNNING)
        S-->>U: 202 com a execução criada
        S->>C: listar moedas (mesmo método do sync diário)
        C-->>S: 9 moedas sem a base
        loop cada ano de 2000 até o atual
            S->>P: buscar período (from AAAA-01-01, to AAAA-12-31)
            P->>API: GET /v2/rates?base=usd&quotes=...&from=...&to=...
            API-->>P: cotações do ano
            P-->>S: cotações validadas
            S->>DB: mesmo UPSERT do sync diário
            Note over S: soma as linhas do ano e espera 7s
        end
        alt todos os anos ok
            S->>DB: UPDATE sync_runs SUCCESS, rows_inserted (~88 mil)
        else algum ano falhou
            S->>DB: UPDATE sync_runs FAILED, error_message
        end
    end
```

## GET /exchange-rates/convert

Converte um valor entre duas moedas. Usa a data mais recente em que **as duas** moedas têm cotação. Como tudo é salvo em relação ao USD, a taxa do par é `rate(to) / rate(from)` (taxa cruzada). As contas usam `decimal.js` e só arredondam no final.

```mermaid
sequenceDiagram
    autonumber
    actor U as Cliente
    participant Ctl as ExchangeRateController
    participant Svc as ExchangeRateService
    participant DB as PostgreSQL

    U->>Ctl: GET /exchange-rates/convert?from=EUR&to=BRL&amount=100
    Ctl->>Svc: convertCoins(from, to, amount)
    Note over Svc: valida valor e códigos (ParseCodePipe)
    alt entrada inválida
        Svc-->>U: 400 com mensagem traduzida (i18n)
    else entrada válida
        Svc->>DB: data mais recente em que as duas moedas têm cotação (GROUP BY ... HAVING)
        alt nenhuma cotação salva
            Svc-->>U: 503
        else data encontrada
            DB-->>Svc: date + rates (NUMERIC como string)
            Note over Svc: BASE_CURRENCY vale 1<br/>rate = rate(to) / rate(from) com decimal.js<br/>result = amount x rate<br/>arredonda só no final (rate 4-6 casas, result 2)
            Svc-->>Ctl: from, to, amount, rate, result, date
            Ctl-->>U: 200
        end
    end
```

## GET /exchange-rates/latest/:base

Lista as cotações mais recentes de todas as moedas em relação a uma base. Faz uma única query para buscar todas as cotações do dia e calcula cada par em memória.

```mermaid
sequenceDiagram
    autonumber
    actor U as Cliente
    participant Ctl as ExchangeRateController
    participant Svc as ExchangeRateService
    participant DB as PostgreSQL

    U->>Ctl: GET /exchange-rates/latest/EUR
    Note over Ctl: ParseCodePipe valida o formato
    Ctl->>Svc: latest(base)
    Svc->>DB: a base está em currencies?
    alt moeda não suportada
        Svc-->>U: 404 com mensagem traduzida
    else suportada
        Svc->>DB: MAX(rate_date)
        Svc->>DB: todas as cotações dessa data (uma única query)
        DB-->>Svc: cotações do dia
        Note over Svc: rate(moeda) / rate(base) para cada uma<br/>inclui USD como 1 / rate(base)<br/>exclui a própria base
        Svc-->>Ctl: base, date, 9 cotações
        Ctl-->>U: 200
    end
```

## GET /exchange-rates/history

Histórico de um par de moedas em um período. Só entram os dias em que as duas moedas têm cotação. Um período sem dados devolve lista vazia, não erro.

```mermaid
sequenceDiagram
    autonumber
    actor U as Cliente
    participant Ctl as ExchangeRateController
    participant Svc as ExchangeRateService
    participant DB as PostgreSQL

    U->>Ctl: GET /exchange-rates/history?from=USD&to=BRL&start=...&end=...
    Note over Ctl: DTO com class-validator<br/>AAAA-MM-DD, start <= end, limite de período
    alt query inválida
        Ctl-->>U: 400 com mensagem traduzida
    else válida
        Ctl->>Svc: history(from, to, start, end)
        Svc->>DB: cotações das duas moedas no período (uma query, self join por rate_date)
        DB-->>Svc: linhas por dia
        Note over Svc: rate(to) / rate(from) por dia em que as duas têm cotação<br/>BASE_CURRENCY = 1<br/>ordena por data crescente
        Svc-->>Ctl: lista (pode ser vazia)
        Ctl-->>U: 200
    end
```

## GET /sync/status

Mostra se a sincronização diária está em dia: a última execução do cron e a data da cotação mais recente salva.

```mermaid
sequenceDiagram
    autonumber
    actor U as Cliente
    participant Ctl as SyncController
    participant Svc as SyncService
    participant DB as PostgreSQL

    U->>Ctl: GET /sync/status
    Ctl->>Svc: status()
    Svc->>DB: última sync_runs com type = DAILY
    Svc->>DB: MAX(rate_date) em exchange_rates
    DB-->>Svc: execução (ou nenhuma) + data
    Svc-->>Ctl: lastRun (ou null), latestRateDate
    Ctl-->>U: 200
```

---

## Como manter estes diagramas

- **Mudou um fluxo existente?** Atualize o diagrama dele e o parágrafo logo acima.
- **Criou um endpoint ou fluxo novo?** Adicione uma seção `##` com o nome do endpoint, um parágrafo curto dizendo o que ele faz e o diagrama. Copie um diagrama parecido como ponto de partida.
- Teste o diagrama em [mermaid.live](https://mermaid.live) antes de commitar; o GitHub renderiza o mesmo código.
