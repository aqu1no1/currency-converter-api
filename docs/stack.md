# Stack

Tudo o que o projeto usa, separado por área. As versões são as que estão no `package.json` (dependências) ou no `docker-compose.yml` / `Dockerfile` (infraestrutura).

[← Voltar para a documentação](README.md)

## Base

| Tecnologia             | Versão | Uso no projeto                                          |
| ---------------------- | ------ | ------------------------------------------------------- |
| Node.js                | 24     | Execução da API                                         |
| TypeScript             | 6.0    | Todo o código                                           |
| pnpm                   | 11     | Dependências e scripts                                  |
| NestJS                 | 12.1   | Módulos, controllers, services e injeção de dependência |
| @nestjs/config         | 12.0   | Leitura do `.env` / `.env.test`                         |
| @nestjs/schedule       | 12.0   | Cron diário da sincronização                            |
| @nestjs/swagger        | 12.0   | Swagger em `/docs`                                      |
| nestjs-i18n            | 10.8   | Mensagens em pt-BR e en                                 |

## Banco de dados

| Tecnologia                | Versão | Uso no projeto                                |
| ------------------------- | ------ | --------------------------------------------- |
| PostgreSQL                | 18     | Cotações, moedas e execuções (usa `uuidv7()`) |
| TypeORM + @nestjs/typeorm | 1.1    | Entidades, consultas e migrations             |
| pg                        | 8.23   | Driver de conexão com o PostgreSQL            |
| uuid                      | 14     | UUID v7                                       |
| tsx                       | 4.23   | Roda a CLI do TypeORM direto do TypeScript    |

O modelo das tabelas está em [Modelo de dados](diagramas/modelo-de-dados.md).

## Integração com o provedor de cotações

| Tecnologia            | Versão | Uso no projeto                                                  |
| --------------------- | ------ | --------------------------------------------------------------- |
| Frankfurter v2        | —      | Fonte dos dados, gratuita e sem API key                         |
| @nestjs/axios + axios | 1.20   | Chamadas à Frankfurter                                          |
| axios-retry           | 4.5    | Novas tentativas com espera crescente em falhas de rede e `5xx` |
| Zod                   | 4.6    | Valida a resposta da Frankfurter antes de usar                  |

## Validação e cálculos

| Tecnologia                          | Versão | Uso no projeto                        |
| ----------------------------------- | ------ | ------------------------------------- |
| class-validator + class-transformer | 0.15   | DTOs de query (paginação, histórico)  |
| decimal.js                          | 10.6   | Taxa cruzada e conversão sem `float`  |

## Testes

| Tecnologia                   | Versão | Uso no projeto                                                   |
| ---------------------------- | ------ | ---------------------------------------------------------------- |
| Vitest + @vitest/coverage-v8 | 4.1    | Testes unitários, de integração e e2e, com cobertura             |
| unplugin-swc + @swc/core     | 2.0    | Metadados de decorators para a injeção de dependência nos testes |
| nock                         | 14     | Simula a Frankfurter nos testes do adapter                       |

## Qualidade de código

| Tecnologia | Versão | Uso no projeto              |
| ---------- | ------ | --------------------------- |
| oxlint     | 1.85   | Lint com checagem de tipos  |
| oxfmt      | 0.70   | Formatação do código        |

## Infraestrutura e ferramentas

| Tecnologia              | Versão | Uso no projeto                                      |
| ----------------------- | ------ | --------------------------------------------------- |
| Docker + Docker Compose | —      | Banco de dev, banco de teste e imagem da API        |
| Bruno e Postman         | —      | Requests prontos em `api-collections/`              |
| Linear                  | —      | Enunciado, decisões e tasks ([veja no README](../README.md#planejamento-no-linear))|

## Como manter esta página

- **Adicionou ou removeu uma dependência?** Inclua ou apague a linha na tabela da área certa. Se nenhuma área servir, crie uma nova seção `##` com a mesma tabela de três colunas.
- **Atualizou uma versão?** Troque só a coluna "Versão". Use `major.minor` (ex.: `12.1`), sem o patch.
- **É uma tecnologia principal** (aparece logo de cara para quem abre o projeto)? Adicione também o badge no topo do [README](../README.md#stack).
