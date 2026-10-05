<div align="center">

<img src="docs/assets/converter-icon-moedas-app.svg" width="120" alt="Ícone do currency-converter-api" />

# currency-converter-api

API REST que converte valores entre moedas e mantém um histórico diário de cotações desde 2000.

</div>

As cotações vêm da [Frankfurter v2](https://frankfurter.dev) por uma tarefa agendada (cron) e uma carga inicial, e ficam salvas em um PostgreSQL. As requisições dos usuários sempre leem do banco, nunca chamam o provedor diretamente.

Moedas suportadas: USD, BRL, EUR, GBP, JPY, CAD, AUD, CHF, CNY e ARS. Todas as cotações são salvas em relação ao **USD**, e os demais pares são calculados a partir dele (taxa cruzada).

## Stack

<p>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/TypeORM-FE0803?style=for-the-badge&logo=typeorm&logoColor=white" alt="TypeORM" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

A lista completa, com versões e o uso de cada tecnologia, está em [docs/stack.md](docs/stack.md).

## Documentação

| Página                                                | O que tem                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| [Stack](docs/stack.md)                                | Todas as tecnologias, separadas por área, com versão e uso                |
| [Configuração](docs/configuracao.md)                  | Variáveis de ambiente, validação com Zod e namespaces do `@nestjs/config` |
| [Testes e comandos](docs/testes.md)                   | Tipos de teste, comandos, banco de teste e como escrever um teste novo    |
| [CI e releases](docs/CI.md)                           | GitHub Actions, CHANGELOG e como lançar uma versão                        |
| [Modelo de dados](docs/diagramas/modelo-de-dados.md)  | Diagrama das tabelas, o que cada uma guarda e como se relacionam          |
| [Diagramas de sequência](docs/diagramas/sequencia.md) | Passo a passo da sincronização, da carga inicial e dos endpoints          |

## Como rodar

### Pré-requisitos

- Docker com Docker Compose
- Node.js 24
- pnpm (`corepack enable` já disponibiliza)

### Passo a passo

```bash
# 1. Variáveis de ambiente
cp .env.example .env

# 2. Dependências (usadas pelas migrations e pelos scripts)
pnpm install

# 3. Banco de dados
docker compose up -d db

# 4. Tabelas e moedas suportadas
pnpm migration:run

# 5. API
docker compose up -d --build api
```

A API sobe em `http://localhost:3000` (porta definida por `PORT` no `.env`). Para conferir:

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

Para desenvolver com recarga automática, no lugar do passo 5 rode a API fora do Docker:

```bash
pnpm start:dev
```

## Como popular o banco

Depois das migrations, o banco tem as moedas, mas nenhuma cotação. Dispare a carga inicial:

```bash
curl -X POST http://localhost:3000/sync/backfill
```

Ela busca as cotações de 2000 até hoje, **um ano por chamada**, com uma pausa de 7 segundos entre os anos para respeitar o limite da API. São cerca de 27 chamadas e 88 mil linhas, então leva alguns minutos. A resposta chega na hora (`202`) e a carga continua em segundo plano. Uma segunda chamada enquanto ela roda recebe `409`.

Acompanhe pelo `GET /sync?type=BACKFILL`: quando terminar, o `status` vai de `RUNNING` para `SUCCESS`, com o total em `rowsInserted`.

Depois disso, um **cron diário** (6h, horário de Brasília) busca os últimos 5 dias. A janela de 5 dias corrige valores revisados pelo provedor e recupera dias perdidos se o cron falhar. Rodar a carga inicial de novo não duplica dados: cada moeda tem uma cotação por dia, atualizada se já existir.

## Fazendo uma conversão

```bash
curl "http://localhost:3000/exchange-rates/convert?from=EUR&to=BRL&amount=100"
```

```json
{
  "from": "EUR",
  "to": "BRL",
  "amount": 100,
  "rate": 6.271143,
  "result": 627.11,
  "date": "2026-09-28"
}
```

O cálculo usa as cotações do dia mais recente em que **as duas** moedas têm cotação: `rate = rate(BRL) / rate(EUR)`, com as duas em relação ao USD. A taxa é arredondada em 6 casas e o resultado em 2, só no final.

## Endpoints

A documentação completa, com todos os parâmetros e respostas, está no Swagger: **`http://localhost:3000/docs`**.

| Método | Rota                           | Descrição                                             |
| ------ | ------------------------------ | ----------------------------------------------------- |
| GET    | `/health`                      | Status da API                                         |
| GET    | `/currencies`                  | Moedas suportadas                                     |
| GET    | `/exchange-rates/convert`      | Converte um valor entre duas moedas                   |
| GET    | `/exchange-rates/latest/:base` | Cotações mais recentes de uma moeda base              |
| GET    | `/exchange-rates/history`      | Histórico de um par em um período                     |
| GET    | `/exchange-rates`              | Cotações salvas, paginadas                            |
| GET    | `/sync/status`                 | Última execução diária e data da cotação mais recente |
| GET    | `/sync`                        | Execuções da sincronização, paginadas                 |
| POST   | `/sync/backfill`               | Dispara a carga inicial                               |

Os valores dos exemplos abaixo são ilustrativos.

### `GET /currencies`

```bash
curl http://localhost:3000/currencies
```

```json
[
  {
    "id": "01a0e4e3-5b7e-763a-b9ec-d15cafb0617a",
    "code": "ARS",
    "name": "Peso argentino",
    "createdAt": "2026-10-05T00:42:15.673Z",
    "updatedAt": "2026-10-05T00:42:15.673Z"
  }
]
```

A lista traz as 10 moedas, em ordem alfabética do código.

### `GET /exchange-rates/convert`

Parâmetros: `from`, `to` e `amount` (aceita decimais, como `10.50`).

```bash
curl "http://localhost:3000/exchange-rates/convert?from=EUR&to=BRL&amount=100"
```

```json
{
  "from": "EUR",
  "to": "BRL",
  "amount": 100,
  "rate": 6.271143,
  "result": 627.11,
  "date": "2026-09-28"
}
```

Erros: `400` para moeda não suportada ou `amount` ausente, não numérico ou negativo; `503` se ainda não houver cotações.

```json
{ "message": "Moeda não suportado(a)", "error": "Bad Request", "statusCode": 400 }
```

### `GET /exchange-rates/latest/:base`

```bash
curl http://localhost:3000/exchange-rates/latest/EUR
```

```json
{
  "base": "EUR",
  "date": "2026-09-28",
  "rates": {
    "ARS": 1573.868289,
    "AUD": 1.776465,
    "BRL": 6.271143,
    "CAD": 1.628378,
    "CHF": 0.932039,
    "CNY": 8.340391,
    "GBP": 0.872968,
    "JPY": 174.195812,
    "USD": 1.169727
  }
}
```

Retorna `404` se a moeda não for suportada.

### `GET /exchange-rates/history`

Parâmetros: `from`, `to`, `start` e `end` (`AAAA-MM-DD`, inclusive). O período pode ter no máximo 2 anos.

```bash
curl "http://localhost:3000/exchange-rates/history?from=USD&to=BRL&start=2026-09-01&end=2026-09-03"
```

```json
{
  "from": "USD",
  "to": "BRL",
  "history": [
    { "date": "2026-09-01", "rate": 5.3824 },
    { "date": "2026-09-02", "rate": 5.4105 },
    { "date": "2026-09-03", "rate": 5.3987 }
  ]
}
```

A lista vem da data mais antiga para a mais recente. Dias em que falta a cotação de uma das moedas ficam de fora, e um período sem cotações retorna `history: []`. Retorna `400` para data inválida, `start` depois de `end` ou período acima do limite.

### `GET /exchange-rates`

Parâmetros opcionais: `page` (padrão 1), `perPage` (padrão 20, máximo 100) e `code`, para filtrar por moeda.

```bash
curl "http://localhost:3000/exchange-rates?code=BRL&perPage=2"
```

```json
{
  "data": [
    {
      "id": "01a10982-e578-7338-8c56-990d4e22907a",
      "currencyId": "01a0e4e3-5b7e-763a-b9ec-b2cbf89fce2a",
      "syncRunId": null,
      "rate": "5.3612",
      "rateDate": "2026-09-28",
      "createdAt": "2026-10-05T00:42:15.798Z"
    }
  ],
  "total": 4,
  "page": 1,
  "perPage": 2,
  "totalPages": 2
}
```

### `GET /sync/status`

```bash
curl http://localhost:3000/sync/status
```

```json
{
  "lastRun": {
    "type": "DAILY",
    "status": "SUCCESS",
    "startedAt": "2026-09-29T09:00:00.000Z",
    "finishedAt": "2026-09-29T09:00:02.000Z",
    "rowsInserted": 45,
    "error": null
  },
  "latestRateDate": "2026-09-28"
}
```

`lastRun` considera só as execuções diárias (a carga inicial fica de fora). Com o banco vazio, os dois campos vêm `null`.

### `GET /sync`

Parâmetros opcionais: `page`, `perPage`, `type` (`DAILY` ou `BACKFILL`) e `status` (`RUNNING`, `SUCCESS` ou `FAILED`).

```bash
curl "http://localhost:3000/sync?type=BACKFILL"
```

```json
{
  "data": [
    {
      "id": "01a10983-0f1c-7520-bf86-62fd1de73f6d",
      "type": "BACKFILL",
      "status": "RUNNING",
      "startedAt": "2026-10-05T00:42:26.454Z",
      "finishedAt": null,
      "rowsInserted": 0,
      "errorMessage": null
    }
  ],
  "total": 1,
  "page": 1,
  "perPage": 20,
  "totalPages": 1
}
```

### `POST /sync/backfill`

```bash
curl -X POST http://localhost:3000/sync/backfill
```

```json
{
  "id": "01a10983-0f1c-7520-bf86-62fd1de73f6d",
  "type": "BACKFILL",
  "status": "RUNNING",
  "startedAt": "2026-10-05T00:42:26.454Z",
  "finishedAt": null,
  "rowsInserted": 0,
  "errorMessage": null
}
```

Responde `202`. Se já houver uma carga inicial em execução, `409`:

```json
{ "message": "Carga inicial já está em execução", "error": "Conflict", "statusCode": 409 }
```

### Idioma das mensagens

As mensagens de erro saem em português por padrão. Para inglês, use `?lang=en` ou o header `Accept-Language: en`:

```bash
curl "http://localhost:3000/exchange-rates/history?from=USD&to=BRL&start=2026-09-03&end=2026-09-01&lang=en"
```

```json
{
  "message": "The end date must be on or after the start date",
  "error": "Bad Request",
  "statusCode": 400
}
```

## Como adicionar uma moeda

A tabela `currencies` é a única fonte das moedas suportadas: a sincronização lê a lista dela, então não é preciso mexer no código. Confira antes se a Frankfurter tem a moeda (`https://api.frankfurter.dev/v2/currencies`).

1. Crie uma migration:

   ```bash
   pnpm migration:create AddMexicanPeso
   ```

2. Insira a moeda no arquivo gerado em `src/database/migrations/`:

   ```ts
   public async up(queryRunner: QueryRunner): Promise<void> {
     await queryRunner.query(`INSERT INTO currencies (code, name) VALUES ('MXN', 'Peso mexicano')`);
   }

   public async down(queryRunner: QueryRunner): Promise<void> {
     await queryRunner.query(`DELETE FROM currencies WHERE code = 'MXN'`);
   }
   ```

3. Rode a migration:

   ```bash
   pnpm migration:run
   ```

As cotações novas começam no próximo cron diário. Para ter o histórico desde 2000, rode a carga inicial de novo (`POST /sync/backfill`); as cotações das outras moedas não são duplicadas.

## Scripts

| Script                                        | O que faz                                               |
| --------------------------------------------- | ------------------------------------------------------- |
| `pnpm start:dev`                              | API com recarga automática                              |
| `pnpm build` / `pnpm start:prod`              | Compila e roda a versão compilada                       |
| `pnpm migration:run`                          | Aplica as migrations pendentes                          |
| `pnpm migration:revert`                       | Desfaz a última migration                               |
| `pnpm migration:show`                         | Lista as migrations e quais já rodaram                  |
| `pnpm migration:create <Nome>`                | Cria uma migration vazia                                |
| `pnpm migration:generate <caminho>`           | Gera uma migration a partir das entidades               |
| `pnpm lint` / `pnpm lint:fix`                 | Lint com oxlint                                         |
| `pnpm format` / `pnpm format:check`           | Formatação com oxfmt                                    |
| `pnpm test`                                   | Testes unitários                                        |
| `pnpm test:unit`                              | Testes unitários (usado pelo CI)                        |
| `pnpm test:watch`                             | Testes unitários em modo watch                          |
| `pnpm test:cov`                               | Testes unitários com cobertura                          |
| `pnpm test:infra:up` / `pnpm test:infra:down` | Sobe e derruba o banco de teste                         |
| `pnpm test:docker:build` / `pnpm test:docker` | Builda o test-runner e roda todos os testes no Docker   |
| `pnpm test:integration` / `pnpm test:e2e`     | Testes de integração e e2e (precisam do banco de teste) |
| `pnpm test:all`                               | Todos os testes                                         |
| `pnpm pr`                                     | Lint, formatação, build e unitários com cobertura       |

## Testes

```bash
pnpm test                         # unitários: rápidos, sem banco nem rede
cp .env.test.example .env.test    # só na primeira vez
pnpm test:infra:up                # Postgres de teste na porta 5433, em memória
pnpm test:integration
pnpm test:e2e
pnpm test:infra:down
pnpm test:docker                  # ou tudo dentro do Docker (antes: pnpm test:docker:build)
```

- `test/unit`: espelha o `src/`; os testes de integrações externas ficam pelo nome (`test/unit/frankfurter/`)
- `test/integration` e `test/e2e`: usam o banco de teste, separado do banco de desenvolvimento. As migrations rodam sozinhas antes dos testes

Os testes do adapter simulam a Frankfurter com o **nock**, sem chamar a API real. O guia completo está em [docs/testes.md](docs/testes.md).

## Estrutura

```
src/
├── common/          # constantes, decorators, DTOs, pipes, interceptors e utils compartilhados
├── config/          # variáveis de ambiente: schema Zod e namespaces (veja docs/configuracao.md)
├── currency/        # moedas suportadas
├── exchange-rate/   # conversão, cotações mais recentes, histórico e listagem
├── sync/            # cron diário, carga inicial, execuções e a porta ExchangeRateProvider
├── integrations/
│   └── frankfurter/ # adapter que implementa a porta
├── health/
├── database/        # data-source e migrations
└── i18n/            # traduções pt-BR e en
test/
├── unit/
├── integration/
├── e2e/
└── setup/
```

O projeto tem dois fluxos que só se encontram no banco:

```
ESCRITA (cron e carga inicial)
  SyncService ──► ExchangeRateProvider (porta) ◄── FrankfurterAdapter ──► API Frankfurter
       └──► exchange_rates, sync_runs

LEITURA (endpoints)
  Controller ──► Service ──► exchange_rates, currencies
```

**A porta do sync:** o `SyncService` depende só da interface `ExchangeRateProvider`, definida no próprio módulo `sync`. O `FrankfurterAdapter` implementa essa interface e é o único lugar que conhece a API externa: HTTP, retry, validação da resposta com Zod e conversão para o formato do domínio. Trocar de provedor é escrever outro adapter; o resto do sistema não muda. Se a Frankfurter cair, a API continua respondendo com os dados salvos, e a falha fica registrada em `sync_runs`.

## Planejamento no Linear

O projeto foi planejado e acompanhado no Linear: [API Converter](https://linear.app/api-converter/project/api-converter-b2af76102ce9). Os links abrem só para quem tem acesso ao workspace.

**Documentos**

- [Enunciado](https://linear.app/api-converter/document/enunciado-fbf5d612fb8a): requisitos, endpoints e regras
- [Arquitetura e decisões](https://linear.app/api-converter/document/arquitetura-e-decisoes-ef10ca0e29ff): estrutura de pastas, porta do sync, testes e decisões tomadas
- [Guia da API Frankfurter](https://linear.app/api-converter/document/guia-da-api-frankfurter-fb2a0704591a): endpoints, parâmetros e comportamentos da v2

**Tasks, por milestone**

| Milestone                     | Task                                                                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Ajustes de base            | [API-5](https://linear.app/api-converter/issue/API-5/remover-o-body-do-log-no-interceptor-de-execucao) Remover o body do log no interceptor de execução (cancelada)                 |
|                               | [API-6](https://linear.app/api-converter/issue/API-6/remover-aliases-de-import-que-apontam-para-pastas-inexistentes) Remover aliases de import que apontam para pastas inexistentes |
| 2. Integração e sincronização | [API-7](https://linear.app/api-converter/issue/API-7/criar-a-porta-exchangerateprovider-no-modulo-sync) Criar a porta ExchangeRateProvider no módulo sync                           |
|                               | [API-8](https://linear.app/api-converter/issue/API-8/implementar-o-frankfurteradapter-api-v2) Implementar o FrankfurterAdapter (API v2)                                             |
|                               | [API-9](https://linear.app/api-converter/issue/API-9/implementar-a-sincronizacao-diaria-no-syncservice) Implementar a sincronização diária no SyncService                           |
|                               | [API-10](https://linear.app/api-converter/issue/API-10/implementar-a-carga-inicial-backfill-desde-2000) Implementar a carga inicial (backfill) desde 2000                           |
| 3. Endpoints de leitura       | [API-11](https://linear.app/api-converter/issue/API-11/implementar-o-calculo-da-conversao-convertcoins) Implementar o cálculo da conversão                                          |
|                               | [API-12](https://linear.app/api-converter/issue/API-12/criar-o-endpoint-de-cotacoes-mais-recentes-de-uma-base) Criar o endpoint de cotações mais recentes de uma base               |
|                               | [API-13](https://linear.app/api-converter/issue/API-13/criar-o-endpoint-de-historico-e-substituir-a-listagem-completa-de) Criar o endpoint de histórico                             |
|                               | [API-14](https://linear.app/api-converter/issue/API-14/criar-o-endpoint-de-status-da-sincronizacao) Criar o endpoint de status da sincronização                                     |
|                               | [API-19](https://linear.app/api-converter/issue/API-19/paginacao-nas-listagens-de-cotacoes-e-de-sincronizacoes) Paginação nas listagens de cotações e de sincronizações             |
| 4. Qualidade e documentação   | [API-15](https://linear.app/api-converter/issue/API-15/testar-o-frankfurteradapter-com-nock) Testar o FrankfurterAdapter com nock                                                   |
|                               | [API-16](https://linear.app/api-converter/issue/API-16/testes-unitarios-da-taxa-cruzada-e-do-syncservice) Testes unitários da taxa cruzada e do SyncService                         |
|                               | [API-17](https://linear.app/api-converter/issue/API-17/escrever-o-readme) Escrever o README                                                                                         |
|                               | [API-18](https://linear.app/api-converter/issue/API-18/atualizar-as-colecoes-do-bruno-e-do-postman) Atualizar as coleções do Bruno e do Postman                                     |

Cada task tem contexto, o que fazer e critérios de aceite. A partir da API-11, as tasks concluídas também têm um comentário com o que foi feito, o commit e como foi testado.

## Fonte dos dados

[Frankfurter v2](https://frankfurter.dev) (`https://api.frankfurter.dev/v2`): gratuita e sem API key. Ela reúne cotações de bancos centrais e fontes oficiais. O projeto usa a série combinada (padrão), que inclui o peso argentino e fins de semana, e salva cada cotação com a data de referência informada pelo provedor.
