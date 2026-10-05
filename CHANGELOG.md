# Changelog

Todas as mudanças relevantes do projeto ficam registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue o [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

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
