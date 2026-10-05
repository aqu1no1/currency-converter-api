# Pull Request

## 📌 Descrição

<!-- Descreva claramente o que esta PR faz. -->

---

## 🏷 Tipo de PR

Marque uma opção:

- [ ] 🐛 Bugfix
- [ ] ✨ Feature
- [ ] ♻️ Refactor
- [ ] ⚡ Performance
- [ ] 🧪 Testes
- [ ] 📚 Documentação
- [ ] 🔧 Chore
- [ ] 🚨 Hotfix

---

## 🔗 Links Relacionados

- Task no Linear:

- Issue:

---

## 🧠 Contexto

<!-- Explique o problema que esta PR resolve. -->

---

## 📋 Checklist

### Código

- [ ] Código segue os padrões do projeto
- [ ] Não há `console.log` desnecessários
- [ ] Não há código comentado desnecessário
- [ ] Variáveis e funções possuem nomes claros
- [ ] Mensagens de erro novas estão traduzidas em `src/i18n/pt-BR` e `src/i18n/en`
- [ ] Mudanças nas tabelas têm migration (`pnpm migration:generate` ou `pnpm migration:create`)

### Qualidade

- [ ] Rodei o linter (`pnpm lint`)
- [ ] Rodei o formatter (`pnpm format`)
- [ ] Build passou localmente (`pnpm build`)
- [ ] Testes passaram localmente (`pnpm test` e, se mexeu com banco, `pnpm test:integration` / `pnpm test:e2e`)
- [ ] Adicionei ou atualizei os testes da mudança
- [ ] Atualizei o `CHANGELOG.md` em `[Unreleased]` (se a mudança afeta quem usa a API)
- [ ] Atualizei a documentação (`README.md`, `docs/`, Swagger e coleções do Bruno/Postman), se aplicável

### Segurança

- [ ] Não expõe dados sensíveis
- [ ] Não adiciona dependências desnecessárias

### Variáveis de ambiente (se aplicável)

- [ ] Adicionei ao `src/config/env.schema.ts` e ao namespace em `src/config/`
- [ ] Adicionei ao `.env.example` e ao `.env.test.example`
- [ ] Adicionei ao serviço `api` do `docker-compose.yml` e ao `test-runner` do `docker-compose.test.yml`
- [ ] Adicionei ao bloco `env` do `.github/workflows/tests.yml`
- [ ] Adicionei à tabela de variáveis do `docs/configuracao.md`

---

## Variáveis de ambiente (se aplicável. Não inclua informação sensível)

### Adicionadas

```env

```

### Removidas

```env

```

---

## 📸 Evidências (se aplicável)

<!-- Requests e respostas (curl, Bruno, Postman), saída dos testes ou logs. -->

---

## 🚀 Observações adicionais

<!-- Informações extras relevantes. -->
