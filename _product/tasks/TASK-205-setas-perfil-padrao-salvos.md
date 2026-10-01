# TASK-205 - Setas do Perfil no padrao de Salvos

Dependencia: TASK-204 (Completed). Status: Completed.

## Escopo

Aplicar a seta azul sobre circulo azul-claro de Salvos a Meus posts e respostas
e Favoritos. Referencias: capturas 7e55d5c8, 85678981 e 4844c17f enviadas pelo
usuario em 01/10/2026. PROTO-INVENTORY e arquitetura consultados; padrao real
em AppPageHeader, sem necessidade de geracao Builder. Mobile-first 390px.

## Criterios de aceite

- [x] Mesmo ArrowLeft h-5, circulo h-10/w-10, bg-primary-soft e text-primary.
- [x] Hover identico a Salvos, com foco acessivel preservado.
- [x] Titulos, filtros, destino /app/perfil e politica da navbar preservados.
- [x] Slots simetricos de Meus posts comportam a seta maior.
- [x] Regressao, frontend check/build e smoke local aprovados.

## Validacao e deploy

ADR-0549. Comparar com Salvos no browser mobile e desktop usando sessao real,
sem criar posts ou alterar favoritos. Evidencias em outputs/setas-0540.md.
Somente frontend; sem API, env, migration ou dependencias novas. Publicar
em homologacao. Producao nao solicitada. Rollback por reversao revisada.

Frontend check/build aprovados em 0.1.540. Guards de versao, segredos,
encoding, ADRs, tasks, source-safety, source-size e ciclos aprovados.
Smoke local 390px: Meus posts protege rota sem sessao; Favoritos exibe estado
restrito sem navbar e retorna ao Perfil. Comparacao visual autenticada sera
registrada no relatorio externo apos deploy, sem simular sessao local.
