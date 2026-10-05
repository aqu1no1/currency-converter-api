# Configuração (@nestjs/config + Zod)

Como a API lê e valida as variáveis de ambiente. Baseado na documentação oficial: https://docs.nestjs.com/techniques/configuration

[← Voltar para a documentação](README.md)

---

## 1. Estrutura

```
src/
├── config/
│   ├── env.schema.ts          ← schema Zod de TODAS as variáveis (validação + tipos)
│   ├── env-file.ts            ← qual arquivo .env ler (.env ou .env.test)
│   ├── app.config.ts          ← namespace "app"         (ambiente, porta)
│   ├── logger.config.ts       ← namespace "logger"      (níveis de log, formato JSON)
│   ├── database.config.ts     ← namespace "database"    (conexão com o PostgreSQL)
│   ├── frankfurter.config.ts  ← namespace "frankfurter" (URL da API de cotações)
│   └── index.ts               ← exporta tudo + array `configs`
├── database/
│   ├── data-source-options.ts ← monta as opções do TypeORM a partir do namespace "database"
│   └── data-source.ts         ← DataSource da CLI do TypeORM (migrations)
├── app.module.ts              ← ConfigModule.forRoot (liga tudo)
└── main.ts                    ← lê a porta pelo namespace "app"
.env                           ← desenvolvimento (NÃO vai para o Git)
.env.example                   ← modelo do .env (vai para o Git)
.env.test.example              ← modelo do .env.test (vai para o Git, só valores fictícios)
```

---

## 2. `env.schema.ts`: o contrato das variáveis

Arquivo central. Descreve **todas** as variáveis de ambiente, seus tipos e quais são obrigatórias.

```ts
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.string().default('log'),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  LOG_QUERIES: z.stringbool().default(false),

  FRANKFURTER_BASE_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse(process.env);
}

export function validateEnv(env: Record<string, unknown>): Env {
  // igual ao parse, mas junta todos os erros em uma mensagem legível
}
```

### Variáveis

| Variável               | Obrigatória | Padrão        | Para que serve                                                |
| ---------------------- | ----------- | ------------- | ------------------------------------------------------------- |
| `NODE_ENV`             | Não         | `development` | Ambiente: `development`, `production` ou `test`               |
| `PORT`                 | Não         | `3000`        | Porta HTTP da API                                             |
| `LOG_LEVEL`            | Não         | `log`         | Nível mínimo (`warn`) ou lista exata (`debug,log,warn,error`) |
| `DB_HOST`              | **Sim**     | —             | Host do PostgreSQL                                            |
| `DB_PORT`              | Não         | `5432`        | Porta do PostgreSQL                                           |
| `DB_USERNAME`          | **Sim**     | —             | Usuário do banco                                              |
| `DB_PASSWORD`          | **Sim**     | —             | Senha do banco                                                |
| `DB_NAME`              | **Sim**     | —             | Nome do banco                                                 |
| `LOG_QUERIES`          | Não         | `false`       | Loga as queries SQL do TypeORM                                |
| `FRANKFURTER_BASE_URL` | **Sim**     | —             | URL da Frankfurter (`https://api.frankfurter.dev`)            |

O `TZ` (fuso horário) não está no schema: ele é lido direto pelo Node.js, antes de qualquer código da aplicação rodar.

### Pontos importantes

| Item                | Significado                                                                      |
| ------------------- | -------------------------------------------------------------------------------- |
| Com `.default()`    | Variável opcional: usa o valor padrão se não vier                                |
| Sem `.default()`    | Variável **obrigatória**: se faltar, a aplicação não sobe                        |
| `z.coerce.number()` | Converte texto em número (variáveis de ambiente **sempre** chegam como string)   |
| `z.stringbool()`    | Converte `"true"` / `"false"` (e `"1"` / `"0"`, `"yes"` / `"no"`) em boolean     |
| `Env`               | Tipo TypeScript gerado do schema (`z.infer`): nunca fica desatualizado           |
| `loadEnv()`         | Valida o `process.env` e devolve os valores convertidos e tipados                |
| `validateEnv()`     | Mesmo papel, usado pelo `ConfigModule` no boot, com uma mensagem de erro legível |

---

## 3. Namespaces: `app`, `logger`, `database` e `frankfurter`

Todos seguem o mesmo formato:

```ts
import { registerAs } from '@nestjs/config';
import { loadEnv } from '@/config/env.schema';

export const databaseConfig = registerAs('database', () => {
  const env = loadEnv();

  return {
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    name: env.DB_NAME,
    logQueries: env.LOG_QUERIES,
  };
});
```

### Como funciona

- `registerAs('database', factory)` cria um **namespace** chamado `database`: um grupo de configurações relacionadas.
- A **factory** é executada pelo Nest quando a aplicação sobe, e o objeto retornado fica guardado.
- O `registerAs` adiciona ao objeto a propriedade **`KEY`**, que é o "endereço" do namespace na injeção de dependência.

### Vantagens

- **Organização:** grupos por assunto em vez de uma lista enorme de variáveis soltas.
- **Tradução de nomes:** o `.env` usa `DB_HOST` (convenção de env), o código usa `host` (convenção TypeScript).
- **Valores derivados:** ex. `isProduction` no `app.config.ts` e `json` no `logger.config.ts`, calculados a partir do `NODE_ENV`.

### Os namespaces do projeto

| Namespace     | Arquivo                 | Campos                                                       | Quem usa                          |
| ------------- | ----------------------- | ------------------------------------------------------------ | --------------------------------- |
| `app`         | `app.config.ts`         | `nodeEnv`, `port`, `isProduction`, `isTest`                  | `main.ts`                         |
| `logger`      | `logger.config.ts`      | `level`, `json`                                              | `common/utils/logger.ts`          |
| `database`    | `database.config.ts`    | `host`, `port`, `username`, `password`, `name`, `logQueries` | `app.module.ts`, `data-source.ts` |
| `frankfurter` | `frankfurter.config.ts` | `baseUrl`                                                    | `FrankfurterModule`               |

---

## 4. `index.ts`: ponto de entrada

```ts
export { appConfig, databaseConfig, frankfurterConfig, loggerConfig };
export { envSchema, loadEnv, validateEnv, type Env } from '@/config/env.schema';
export { ENV_FILE } from '@/config/env-file';

export const configs = [appConfig, loggerConfig, databaseConfig, frankfurterConfig];
```

Dois papéis:

1. **Centralizar imports:** todo o projeto importa de `@/config`. Reorganizações internas não afetam quem usa.
2. **Array `configs`:** lista de namespaces carregados pelo `ConfigModule`. Namespace novo → adicionar aqui.

---

## 5. `app.module.ts`: onde tudo se conecta

```ts
ConfigModule.forRoot({
  isGlobal: true,
  cache: true,
  envFilePath: ENV_FILE,
  validate: validateEnv,
  load: configs,
}),
```

### Opções

| Opção            | Função                                                                       |
| ---------------- | ---------------------------------------------------------------------------- |
| `isGlobal: true` | Config disponível em todos os módulos sem importar `ConfigModule` em cada um |
| `cache: true`    | Guarda os valores em memória para leituras mais rápidas                      |
| `envFilePath`    | Qual arquivo ler: `.env.test` quando `NODE_ENV=test`, senão `.env`           |
| `validate`       | Valida as variáveis no boot com o schema Zod                                 |
| `load`           | Namespaces a carregar                                                        |

> O `@nestjs/config` só aceita schemas Joi na opção `validationSchema`. Por isso o Zod entra pela opção `validate`, que recebe uma função.

Em produção (Docker) não existe arquivo `.env` dentro da imagem: as variáveis vêm do `docker-compose.yml`, e o `ConfigModule` simplesmente não encontra arquivo para ler.

### Ordem do que acontece no boot

1. **Escolhe o arquivo** `.env` ou `.env.test` conforme o `NODE_ENV` (`env-file.ts`).
2. **Junta** o conteúdo do arquivo com o `process.env`. Se uma variável existir nos dois, **a do ambiente real ganha**.
3. **Valida** tudo com o `validateEnv`. Se algo faltar ou for inválido, a aplicação **para aqui**, listando todos os erros:
   ```
   Error: Variáveis de ambiente inválidas:
   ✖ Invalid input: expected string, received undefined
     → at DB_HOST
   ✖ Invalid input: expected number, received NaN
     → at PORT
   ```
4. **Executa as factories** do `load`, criando os namespaces `app`, `logger`, `database` e `frankfurter`.

---

## 6. Por que o schema é usado duas vezes

O `envSchema` aparece no `validateEnv` (boot) **e** no `loadEnv()` dos namespaces. Cada uso tem um papel:

| Onde          | Papel                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `validateEnv` | **Portão de entrada:** valida tudo no boot e mostra todos os erros juntos, com mensagem clara                                            |
| `loadEnv()`   | **Tipagem:** dentro do `registerAs`, o `process.env` ainda tem os valores como texto. Sem o `loadEnv()`, a `PORT` chegaria como `"3000"` |

Validar duas vezes custa praticamente nada e garante as duas coisas.

---

## 7. Como usar

### Em um módulo ou service (forma recomendada)

```ts
HttpModule.registerAsync({
  inject: [frankfurterConfig.KEY],
  useFactory: (frankfurter: ConfigType<typeof frankfurterConfig>) => ({
    baseURL: frankfurter.baseUrl, // string, com autocomplete
    timeout: TIMEOUT_IN_MS,
  }),
}),
```

Em um service, o mesmo vale pelo construtor:

```ts
constructor(
  @Inject(frankfurterConfig.KEY)
  private readonly frankfurter: ConfigType<typeof frankfurterConfig>,
) {}
```

- `frankfurterConfig.KEY` → "me entregue o namespace frankfurter".
- `ConfigType<typeof frankfurterConfig>` → tipo extraído do retorno da factory.

**Comparação:**

| Forma                                                    | Erro de digitação é detectado... |
| -------------------------------------------------------- | -------------------------------- |
| `@Inject(frankfurterConfig.KEY)` + `frankfurter.baseUrl` | Na compilação (TypeScript avisa) |
| `configService.get('FRANKFURTER_BASE_URL')`              | Só em tempo de execução          |

### No `main.ts`

```ts
const app = await NestFactory.create(AppModule, { logger: createLogger() });
const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

await app.listen(config.port);
```

### Fora do Nest (logger e CLI do TypeORM)

Dois lugares rodam **antes** ou **fora** do Nest e não têm injeção de dependência. Neles, a factory do namespace é chamada direto, como uma função comum:

```ts
// common/utils/logger.ts: o logger é criado antes do NestFactory.create
const logger = loggerConfig();

// database/data-source.ts: a CLI do TypeORM (pnpm migration:run) não sobe o Nest
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
export default new DataSource({ ...getDataSourceOptions(databaseConfig()), ... });
```

As opções do banco ficam em `getDataSourceOptions()`, usado tanto pela API (`app.module.ts`) quanto pela CLI, para os dois nunca divergirem.

---

## 8. Testes

| Tipo                 | Como a config chega                                                                     |
| -------------------- | --------------------------------------------------------------------------------------- |
| **Unitário**         | Sem `.env`. Fornece o namespace direto, com valores fixos (exemplo abaixo)              |
| **Integração / e2e** | O Vitest define `NODE_ENV=test` e o `test/setup/load-test-env.ts` carrega o `.env.test` |
| **Schema**           | `test/unit/config/env.schema.spec.ts` testa padrões, conversões e variáveis faltando    |

Exemplo de teste unitário (`frankfurter.adapter.spec.ts`):

```ts
ConfigModule.forRoot({
  isGlobal: true,
  ignoreEnvFile: true,
  load: [registerAs('frankfurter', () => ({ baseUrl: BASE_URL }))],
}),
```

Num service isolado, dá para fornecer só o namespace:

```ts
providers: [
  MeuService,
  { provide: frankfurterConfig.KEY, useValue: { baseUrl: 'https://frankfurter.test' } },
],
```

---

## 9. Arquivos `.env`

**`.env.example`** (vai para o Git, serve de modelo para o `.env`):

```env
NODE_ENV=development
LOG_LEVEL=debug,log,warn,error
PORT=3000
TZ=America/Sao_Paulo

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=currency_converter
LOG_QUERIES=false

FRANKFURTER_BASE_URL=https://api.frankfurter.dev
```

**`.env.test.example`** (vai para o Git, modelo do `.env.test`, só valores fictícios):

```env
NODE_ENV=test
LOG_LEVEL=error
PORT=3001
TZ=America/Sao_Paulo

DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=test
DB_PASSWORD=test
DB_NAME=currency_converter_test
LOG_QUERIES=false

FRANKFURTER_BASE_URL=https://api.frankfurter.dev
```

---

## 10. Regras do projeto

1. **Variável nova** entra em 4 lugares: `env.schema.ts`, `.env.example`, `.env.test.example` e o `environment` da API no `docker-compose.yml`. Atualize também a tabela da [seção 2](#variáveis).
2. **Namespace novo** (ex.: `redis.config.ts`): criar no mesmo formato, adicionar no array `configs` do `index.ts` e na tabela da [seção 3](#os-namespaces-do-projeto).
3. **Nunca** ler `process.env` fora de `src/config/`. As exceções são o `process.loadEnvFile` da CLI e os arquivos de setup dos testes.
4. **Preferir** `@Inject(xConfig.KEY)` a `configService.get('...')`.
5. **Imports** pelo alias `@/config`, sem extensão (o projeto compila para CommonJS).
