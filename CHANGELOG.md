# Changelog

Todas as mudanças relevantes do projeto ficam registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue o [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

## [1.0.1] - 2026-10-06

Nenhuma mudança no comportamento da API: esta versão só adiciona testes e documentação.

### Added

- Testes de integração com o Postgres real: leitura das cotações, sincronização, migrations, constraint única e chaves estrangeiras.
- Testes e2e de todos os endpoints, conferindo status e body, validação, idioma das mensagens e a carga inicial (`202` e `409`).
- Teste e2e do fluxo completo pela Frankfurter simulada com `nock`: sincronização diária → banco → `GET /exchange-rates/convert`.
- Documentação da arquitetura da integração com a Frankfurter (ports and adapters) em `docs/arquitetura.md`, e dos helpers de teste em `docs/testes.md`.

## [1.0.0] - 2026-10-05

### Added

- `GET /currencies`: lista as 10 moedas suportadas.
- `GET /exchange-rates/convert`: converte um valor entre duas moedas usando as cotações do dia mais recente em que as duas têm cotação.
- `GET /exchange-rates/latest/:base`: cotações mais recentes de uma moeda base.
- `GET /exchange-rates/history`: histórico de um par de moedas em um período de até 2 anos.
- `GET /exchange-rates`: cotações salvas, paginadas e com filtro por moeda.
- `GET /sync/status`: última sincronização diária e data da cotação mais recente.
- `GET /sync`: execuções da sincronização, paginadas e com filtros por tipo e status.
- `POST /sync/backfill`: carga inicial das cotações desde 2000, em segundo plano.
- Sincronização diária às 6h (horário de Brasília) com a Frankfurter, buscando os últimos 5 dias.
- Mensagens de erro em pt-BR e en (`?lang=en` ou `Accept-Language: en`).
- Validação das variáveis de ambiente na inicialização: a API não sobe com variável faltando ou inválida.
