# TASK-372 — Manifesto runtime do adapter no admin

| Campo | Valor |
|---|---|
| Status | Concluida localmente |

## Escopo
Corrigir o postbuild do admin que bloqueou a publicacao autorizada da versao 0.1.876 na Vercel por ausencia de config.repoRoot no manifesto runtime.

## Criterios de aceite
- [x] Reutilizar a descoberta de raiz do Next ja aplicada no frontend, com validacao de appDir e contencao do build.
- [x] Preservar arquivos runtime e mapas externos; remover apenas referencias aos mapas do build.
- [x] Testes de regressao, check e build do admin aprovados.

Sem alteracao de UI, contrato, banco ou variavel obrigatoria. Publicacao via PR homolog para main, dentro da autorizacao de publicar todas as atualizacoes pendentes.
