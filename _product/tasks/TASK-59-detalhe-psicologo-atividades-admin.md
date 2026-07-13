# TASK-59: Detalhe administrativo do psicólogo — Atividades simples

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-59 |
| Prioridade | P2 |
| Esforço | M |
| Fase | Admin |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-55, TASK-57, TASK-58 |
| ADR alvo | ADR apenas se for criado novo modelo de auditoria |

## Contexto

A aba "Atividades" usa como referência `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Atividades.png`.

Regra de produto definida: fazer a versão mais simples e honesta. A tela não deve prometer "todas as ações"; deve listar apenas eventos principais que já possuem fonte real.

Copy recomendada:

> Histórico dos principais eventos registrados para esta psicóloga na plataforma.

## Objetivo

Exibir uma linha do tempo simples de eventos reais associados ao psicólogo, sem criar auditoria completa neste momento.

## Escopo frontend

- Implementar aba Atividades.
- Filtros:
  - período;
  - tipo de atividade;
  - área;
  - busca textual simples quando suportada pelo backend.
- Tabela/lista paginada com:
  - data/hora;
  - usuário/ator quando houver;
  - área;
  - tipo;
  - descrição;
  - link de detalhe quando houver rota real.
- Exportar somente se houver endpoint real.

## Escopo backend

- Criar endpoint admin privado:
  - `GET /api/admin/private/psychologists/:id/activities`
- Construir feed derivado de fontes reais existentes, por exemplo:
  - criação/atualização de `psychologist_profile` quando confiável;
  - `profile_video_watch_session`/alterações de vídeo quando houver fonte;
  - `community_post` criado pelo psicólogo;
  - `post_reply` criado pelo psicólogo;
  - `post_save`/`post_reply_save` quando atribuível;
  - `professional_subscription`/`payment_event`;
  - `contact_request`;
  - `professional_review` recebida/respondida;
  - `post_report` em conteúdo do psicólogo.
- Não criar modelo novo de auditoria nesta V1, salvo se a execução justificar em ADR.

## Fora do escopo

- Auditoria completa de todas as ações.
- Capturar ações novas só para preencher a tela.
- Exportação sem endpoint real.
- Mostrar eventos sem fonte confiável.

## Contrato técnico detalhado

- O service deve retornar também `coverage_note` ou `unavailable` quando alguma categoria visual não puder ser coberta.
- A descrição dos eventos deve ser gerada no backend com chaves/copy PT-BR, sem mensagens em inglês.
- Paginação padrão.

## Critérios de aceite

- [x] Aba só abre para admin autenticado.
- [x] Copy não promete "todas as ações".
- [x] Eventos são derivados de fontes reais existentes.
- [x] Categorias sem fonte confiável não aparecem ou aparecem como indisponíveis.
- [x] Filtros funcionam sobre dados reais.
- [x] Links "Ver detalhes" só aparecem quando há destino real.
- [x] Exportação só aparece/habilita se houver endpoint real.
- [x] UI mobile-first validada.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Nenhum `<img>` cru foi usado.
- [x] `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Atividades.png` foi citada como referência visual.
- [x] Checks/builds relevantes executados sem erros.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real e psicólogo real.

## Execução

- Implementado endpoint privado Admin `GET /api/admin/private/psychologists/:id/activities`.
- O feed deriva eventos reais de `user`, `psychologist_profile`, `professional_subscription`, `community_post`, `post_reply`, `post_save`, `post_reply_save`, `contact_request`, `professional_review` e `post_report`.
- Nenhum modelo novo de auditoria foi criado; categorias sem fonte confiável retornam em `unavailable` e a copy não promete listar todas as ações.
- Exportação não foi exibida porque não existe endpoint real de exportação para atividades nesta V1.
- A aba Atividades foi habilitada no Admin com filtros reais de período, área, tipo e busca textual, lista paginada mobile-first e links somente para rotas públicas reais.
- Referência visual usada: `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Atividades.png`; Builder/Quick Copy não estava disponível no ambiente.
- ADR criado: `adrs/0239-admin-atividades-psicologo-feed-derivado.md`.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, API local autenticada e browser local via Edge/CDP em `/psicologos/demo-profile-marina-rocha?tab=atividades`.

## Refinamento visual em 2026-07-13

- A lista principal da aba Atividades foi simplificada para uma tabela compacta, mais sóbria e alinhada ao bloco "Atividades recentes" da aba Geral.
- O refinamento manteve apenas as colunas Data, Ação, Descrição e Usuário na tabela; Área, Fonte e Detalhes permanecem no contrato do endpoint quando aplicável, mas não aparecem na listagem principal.
- O refinamento preservou dados reais, filtros e paginação; não houve alteração de endpoint, schema, mocks ou packages.
- Referências visuais usadas: screenshots enviados na solicitação e `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Atividades.png`; Builder/Quick Copy não estava disponível como ferramenta direta no ambiente.
- Validações do refinamento: `pnpm --dir admin check`, `pnpm --dir admin build` e `GET http://localhost:3002/psicologos/cmgrztri7000tn0uh1q4n8vxf?tab=atividades` com retorno `200`.
- ADR atualizado: `adrs/0239-admin-atividades-psicologo-feed-derivado.md`.
