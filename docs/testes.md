# Testes e comandos

Como os testes funcionam, quais comandos rodar e onde cada arquivo fica.

- **Runner:** Vitest 4, com o plugin `unplugin-swc` para entender os decorators do NestJS
- **Nest:** `@nestjs/testing` (`Test.createTestingModule`)
- **HTTP externo:** `nock`, que simula a Frankfurter sem chamar a API real
- **Gerenciador:** pnpm (`pnpm-lock.yaml` commitado)

[← Voltar para a documentação](README.md)

---

## 1. Os três tipos de teste

A config fica em `vitest.config.mts`, com um **project** do Vitest para cada tipo:

| Tipo           | Onde fica          | Sufixo          | Project       | Precisa do banco?       | Comando                 |
| -------------- | ------------------ | --------------- | ------------- | ----------------------- | ----------------------- |
| **Unitário**   | `test/unit/`       | `*.spec.ts`     | `unit`        | Não (tudo mockado)      | `pnpm test`             |
| **Integração** | `test/integration` | `*.int-spec.ts` | `integration` | **Sim** (Postgres real) | `pnpm test:integration` |
| **E2E**        | `test/e2e/`        | `*.e2e-spec.ts` | `e2e`         | **Sim** (Postgres real) | `pnpm test:e2e`         |

Hoje são 5 arquivos e 45 testes unitários. As pastas `test/integration` e `test/e2e` já estão configuradas, mas ainda não têm testes (por isso esses scripts usam `--passWithNoTests`).

> Cada project só pega o próprio sufixo: o `pnpm test` não roda `*.int-spec.ts` nem `*.e2e-spec.ts`, e vice-versa. São suítes separadas.

---

## 2. Comandos

### Unitários

```bash
pnpm test                                        # todos os unitários
pnpm test test/unit/sync/sync.service.spec.ts    # só um arquivo
pnpm test sync                                   # arquivos cujo caminho contém "sync"
pnpm test -t "daily sync"                        # filtra pelo nome do describe/it
pnpm test:watch                                  # modo watch: roda de novo a cada alteração
pnpm test:cov                                    # com cobertura (gera ./coverage)
pnpm test:debug                                  # --inspect-brk, um arquivo por vez
pnpm test --maxWorkers 4                         # limitando a 4 workers
```

> No Vitest o `-w` é `--watch`. Para limitar os workers, use `--maxWorkers`.

### Integração e E2E

```bash
cp .env.test.example .env.test   # só na primeira vez
pnpm test:infra:up               # sobe o Postgres de teste (porta 5433) e espera ficar pronto
pnpm test:integration            # roda as migrations e os testes de integração
pnpm test:e2e                    # roda as migrations e os testes e2e
pnpm test:e2e test/e2e/<arquivo>.e2e-spec.ts   # só uma suíte
pnpm test:infra:down             # derruba o banco de teste
```

Para aplicar as migrations no banco de teste sem rodar teste nenhum: `pnpm test:infra:migrate`.

### Tudo dentro do Docker (não precisa de `.env.test` nem Node local)

```bash
pnpm test:docker:build   # builda a imagem do test-runner (Dockerfile.test)
pnpm test:docker         # sobe o Postgres e roda: integração, e2e e depois unitários (--maxWorkers 2)
pnpm test:infra:down     # limpa os containers
```

A imagem só tem as dependências: o código é montado como volume, então só precisa de `test:docker:build` de novo quando o `package.json` ou o `pnpm-lock.yaml` mudar.

Logs do banco: `docker compose -f docker-compose.test.yml logs -f db-test`

### Tudo de uma vez

```bash
pnpm test:all   # unit + integration + e2e (precisa do banco de teste no ar)
```

### Antes de abrir PR

```bash
pnpm pr   # = pnpm lint && pnpm format && pnpm build && pnpm test:cov --maxWorkers 4
```

> O `pnpm format` corrige a formatação dos arquivos. Confira o `git status` depois e inclua o que ele mudou.

> Mexeu em algo específico? Rode só o arquivo de teste daquele código. A suíte completa só vale a pena quando a mudança afeta vários módulos.

### Outros comandos do projeto

| Comando                             | O que faz                                    |
| ----------------------------------- | -------------------------------------------- |
| `pnpm start:dev`                    | API com recarga automática                   |
| `pnpm build` / `pnpm start:prod`    | Compila e roda a versão compilada            |
| `pnpm lint` / `pnpm lint:fix`       | Lint com oxlint (com checagem de tipos)      |
| `pnpm format` / `pnpm format:check` | Formata com oxfmt / só confere a formatação  |
| `pnpm migration:run`                | Aplica as migrations pendentes               |
| `pnpm migration:revert`             | Desfaz a última migration                    |
| `pnpm migration:show`               | Lista as migrations e quais já rodaram       |
| `pnpm migration:create <Nome>`      | Cria uma migration vazia                     |
| `pnpm migration:generate <caminho>` | Gera uma migration a partir das entidades    |
| `docker compose up -d db`           | Sobe o banco de desenvolvimento (porta 5432) |
| `docker compose up -d --build api`  | Sobe a API em Docker                         |

---

## 3. Estrutura de pastas

```
api-converter/
├── vitest.config.mts           ← config dos três projects (unit, integration, e2e)
├── docker-compose.test.yml     ← db-test (Postgres efêmero, porta 5433) e test-runner
├── Dockerfile.test             ← imagem do test-runner (node:24-alpine + dependências)
├── .env.test.example           ← modelo do .env.test
│
├── src/                        ← só código; os testes ficam em test/
│
└── test/
    ├── unit/                   ← espelha o src/
    │   ├── common/utils/
    │   │   ├── cross-rate.spec.ts       ← taxa cruzada e arredondamento
    │   │   └── pagination.spec.ts
    │   ├── config/
    │   │   └── env.schema.spec.ts       ← defaults e validação das variáveis
    │   ├── sync/
    │   │   └── sync.service.spec.ts     ← sincronização diária e carga inicial
    │   └── frankfurter/
    │       └── frankfurter.adapter.spec.ts   ← integração externa, pelo nome
    │
    ├── integration/            ← *.int-spec.ts (ainda vazio)
    ├── e2e/                    ← *.e2e-spec.ts (ainda vazio)
    │
    └── setup/
        ├── load-test-env.ts    ← carrega o .env.test (falha se não existir)
        └── migrate-test-db.ts  ← roda as migrations antes dos testes com banco
```

### Aliases de import

Os mesmos do `tsconfig.json` valem nos testes (o Vitest lê via `resolve.tsconfigPaths`):

`@/` → `src/`, `@constants/`, `@decorators/`, `@dto/`, `@utils/`, `@interceptors/`, `@pipes/` (todos em `src/common/`) e `@ports/` → `src/sync/ports/`.

```ts
import { SyncService } from '@/sync/sync.service';
import { ExchangeRateProvider } from '@ports/exchange-rate-provider.port';
import { BASE_CURRENCY } from '@constants/currency.constants';
```

---

## 4. Testes unitários: como funcionam

- Ficam em `test/unit/`, no mesmo caminho do arquivo em `src/` (`src/sync/sync.service.ts` → `test/unit/sync/sync.service.spec.ts`).
- Integrações externas ficam pelo nome da integração (`test/unit/frankfurter/`).
- `describe`, `it`, `expect` e `vi` são globais (`globals: true`), sem import.
- Montam um módulo Nest mínimo com `Test.createTestingModule`, trocando repositórios, a porta e outros services por objetos com `vi.fn()`.
- Não abrem conexão com o banco nem com a internet.

Exemplo (simplificado de `test/unit/sync/sync.service.spec.ts`):

```ts
describe('SyncService', () => {
  let service: SyncService;
  let provider: { fetchRecentRates: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined); // saída limpa

    provider = { fetchRecentRates: vi.fn().mockResolvedValue(recentRates) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: ExchangeRateProvider, useValue: provider }, // a porta, mockada
        { provide: getRepositoryToken(SyncRun), useValue: syncRunRepository },
        { provide: I18nService, useValue: { t: (key: string) => key } },
      ],
    }).compile();

    service = moduleRef.get(SyncService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('passes BASE_CURRENCY and the currencies without the base to the port', async () => {
    await service.syncRates({ type: SyncType.DAILY });

    expect(provider.fetchRecentRates).toHaveBeenCalledWith({
      base: BASE_CURRENCY.BASED,
      currencies: ['BRL', 'EUR'],
      days: 5,
    });
  });
});
```

### Mockando um módulo inteiro

Para pular as pausas da carga inicial, o spec troca o `sleep` antes de importar o service:

```ts
vi.mock('@utils/sleep', () => ({ sleep: vi.fn().mockResolvedValue(undefined) }));
```

### Testando o adapter com nock

`test/unit/frankfurter/frankfurter.adapter.spec.ts` sobe o `FrankfurterModule` de verdade (HTTP, retry e validação Zod) e só a rede é simulada:

```ts
beforeAll(async () => {
  nock.disableNetConnect(); // qualquer chamada não mockada falha

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [registerAs('frankfurter', () => ({ baseUrl: BASE_URL }))],
      }),
      FrankfurterModule,
    ],
  }).compile();

  provider = moduleRef.get(ExchangeRateProvider);
});

afterEach(() => nock.cleanAll());
afterAll(() => nock.enableNetConnect());
```

O namespace `frankfurter` é registrado direto no teste, então não precisa de `.env` (veja [Configuração](configuracao.md#8-testes)).

### Cobertura

`pnpm test:cov` usa o provider `v8` (`@vitest/coverage-v8`) e gera o relatório em `./coverage` (ignorado pelo git). Não há `coverage.include` configurado, então o relatório mostra só os arquivos que os testes carregaram.

---

## 5. Integração e E2E: como funcionam

Os projects `integration` e `e2e` compartilham a mesma preparação:

1. **`env: { NODE_ENV: 'test' }`**: faz o `ENV_FILE` apontar para o `.env.test` (veja `src/config/env-file.ts`).
2. **`globalSetup` (`test/setup/migrate-test-db.ts`)**: roda uma vez, antes de tudo. Executa `pnpm migration:run` com `NODE_ENV=test`. Se o banco não estiver no ar, falha com a mensagem `Is it up? Run "pnpm test:infra:up"`.
3. **`setupFiles` (`test/setup/load-test-env.ts`)**: roda antes de cada arquivo. Carrega o `.env.test` sem sobrescrever variáveis já setadas. Se o arquivo não existir, só segue quando as variáveis já vierem do ambiente (caso do `pnpm test:docker`); senão, falha.
4. **`fileParallelism: false`**: os arquivos rodam um de cada vez, porque todos usam o **mesmo banco**. Os unitários rodam em paralelo (até 2 workers, `maxWorkers: 2`).

> Como o banco é um só, cada teste deve preparar e limpar os próprios dados para não depender da ordem de execução.

### Diferença entre integração e E2E

| Tipo       | O que testa                                                                     |
| ---------- | ------------------------------------------------------------------------------- |
| Integração | Uma peça com o banco real: um service com os repositórios do TypeORM, uma query |
| E2E        | A API inteira por HTTP: sobe o `AppModule` e chama os endpoints                 |

Nos dois, a regra é a mesma do unitário: a Frankfurter é simulada com `nock`, e nenhum teste chama a API real.

---

## 6. Ambiente (`.env.test` e Docker)

O `docker-compose.test.yml` sobe um Postgres **efêmero** (dados em `tmpfs`, somem ao derrubar o container), em porta diferente da de dev:

| Serviço     | Container           | Porta teste | Porta dev |
| ----------- | ------------------- | ----------- | --------- |
| Postgres 18 | `converter-db-test` | **5433**    | 5432      |

O mesmo arquivo tem o serviço `test-runner` (imagem do `Dockerfile.test`), usado só pelo `pnpm test:docker`. Ele fica no profile `runner`, então o `test:infra:up` não o sobe. As variáveis dele vêm do próprio compose, apontando para `db-test:5432`.

O `pnpm test:infra:up` usa `--wait`: só termina quando o healthcheck (`pg_isready`) passa.

O `.env.test` vem do `.env.test.example`:

```env
NODE_ENV=test
LOG_LEVEL=error            # só erros, para não poluir a saída dos testes
PORT=3001
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=test
DB_PASSWORD=test
DB_NAME=currency_converter_test
LOG_QUERIES=false
FRANKFURTER_BASE_URL=https://api.frankfurter.dev
```

> ⚠️ Nunca aponte o `.env.test` para o banco de desenvolvimento: os testes de integração e e2e escrevem e apagam dados.

---

## 7. Fluxo do dia a dia

```bash
# mexi em um service ou util → roda só o unitário dele
pnpm test test/unit/<caminho>/<arquivo>.spec.ts

# mexi em algo que depende do banco → roda integração/e2e
pnpm test:infra:up
pnpm test:integration
pnpm test:e2e test/e2e/<arquivo>.e2e-spec.ts

# antes do PR
pnpm pr
pnpm test:e2e
pnpm test:infra:down
```

### Checklist ao criar um teste novo

- Unitário: `*.spec.ts` em `test/unit/`, no mesmo caminho do código em `src/`.
- Integração: `*.int-spec.ts` em `test/integration/`. E2E: `*.e2e-spec.ts` em `test/e2e/`.
- Mocke só o que sai do escopo do teste: repositórios e porta no unitário, a Frankfurter (com `nock`) em todos.
- Silencie o `Logger` com `vi.spyOn(Logger.prototype, ...)` quando o caso testado loga erro.
- Restaure tudo no `afterEach` (`vi.restoreAllMocks()`, `vi.useRealTimers()`, `nock.cleanAll()`).
- Use `vi.useFakeTimers()` para datas e esperas, nunca um `sleep` de verdade.
- Confira o comportamento observável: o retorno, o que foi passado para a porta e o que foi salvo.

---

## Como manter esta página

- **Adicionou ou mudou um script de teste no `package.json`?** Atualize a seção 2 e a tabela de scripts do [README](../README.md#scripts).
- **Criou um spec novo?** Inclua na árvore da seção 3 e atualize a contagem da seção 1.
- **Mudou o `vitest.config.mts`, o `docker-compose.test.yml` ou o `Dockerfile.test`?** Revise as seções 1, 2, 5 e 6.
