# Documentação

Documentação técnica do currency-converter-api. O [README principal](../README.md) explica como rodar, popular o banco e usar os endpoints. Aqui fica o que ajuda a entender **por dentro** como o projeto funciona.

| Página                                           | O que tem                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| [Stack](stack.md)                                | Todas as tecnologias, separadas por área, com versão e uso                |
| [Configuração](configuracao.md)                  | Variáveis de ambiente, validação com Zod e namespaces do `@nestjs/config` |
| [Testes e comandos](testes.md)                   | Tipos de teste, comandos, banco de teste e como escrever um teste novo    |
| [Modelo de dados](diagramas/modelo-de-dados.md)  | Diagrama das tabelas, o que cada uma guarda e como se relacionam          |
| [Diagramas de sequência](diagramas/sequencia.md) | Passo a passo da sincronização, da carga inicial e dos endpoints          |

## Por onde começar

1. **Stack**, para saber com o que o projeto foi feito.
2. **Configuração**, para saber quais variáveis a API precisa para subir.
3. **Testes e comandos**, para rodar e escrever testes.
4. **Modelo de dados**, para entender o que fica salvo.
5. **Diagramas de sequência**, para ver como os dados entram (sincronização) e saem (endpoints).

## Estrutura da pasta

```
docs/
├── README.md                 # esta página (índice)
├── stack.md
├── configuracao.md
├── testes.md
├── assets/                   # imagens usadas na documentação (ex.: ícone do projeto)
│   └── converter-icon-moedas-app.svg
└── diagramas/
    ├── modelo-de-dados.md
    └── sequencia.md
```

## Como manter

- Cada página termina com uma seção **"Como manter"** dizendo quando e como atualizá-la.
- Os diagramas são escritos em [Mermaid](https://mermaid.js.org), direto no Markdown. Não há imagens para exportar: editou o texto, o GitHub mostra o diagrama atualizado.
- Página nova? Crie o `.md` aqui (ou em `diagramas/`, se for um diagrama) e adicione uma linha na tabela acima.
