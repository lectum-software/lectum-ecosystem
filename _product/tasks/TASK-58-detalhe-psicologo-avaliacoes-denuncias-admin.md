# TASK-58: Detalhe administrativo do psicólogo — Avaliações e denúncias

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-58 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin |
| Status | Pending |
| Dependências | TASK-45, TASK-46, TASK-55 |
| ADR alvo | ADR somente se houver nova decisão sobre exposição de denúncias |

## Contexto

As abas "Avaliações" e "Denúncias" usam como referências:

- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Avaliações.png`;
- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Denúncias.png`.

Regra de produto definida: **avaliações são somente leitura no Admin**. O admin não deve moderar, editar, aprovar, reprovar, excluir ou responder avaliações.

## Objetivo

Exibir avaliações e denúncias relacionadas ao conteúdo do psicólogo de forma operacional e somente leitura na V1.

## Escopo frontend

- Implementar aba Avaliações:
  - média;
  - distribuição por estrelas;
  - lista de avaliações;
  - respostas do psicólogo quando existirem;
  - filtro simples por nota/status se houver dado real.
- Implementar aba Denúncias:
  - cards de total/em análise/improcedentes/procedentes conforme status real existente;
  - filtros por período, tipo de conteúdo e status;
  - lista de denúncias em posts/respostas do psicólogo;
  - link "Ver detalhes" apenas se houver rota real de detalhe/visualização.

## Escopo backend

- Endpoints admin privados:
  - `GET /api/admin/private/psychologists/:id/reviews`;
  - `GET /api/admin/private/psychologists/:id/reports`.
- Reviews:
  - usar `professional_review`;
  - somente leitura.
- Reports:
  - usar `post_report` relacionado a `community_post.author_id` ou `post_reply.author_id` do psicólogo;
  - não alterar status nesta task.

## Fora do escopo

- Moderar avaliações.
- Editar/excluir avaliação.
- Responder avaliação pelo Admin.
- Resolver denúncias.
- Aplicar medidas/moderação.
- Alterar status de `post_report`.

## Critérios de aceite

- [ ] Abas só abrem para admin autenticado.
- [ ] Avaliações são 100% somente leitura.
- [ ] Não existe ação de editar, excluir, aprovar, reprovar ou responder avaliação.
- [ ] Distribuição por estrelas usa dados reais.
- [ ] Denúncias usam `post_report` real relacionado ao conteúdo do psicólogo.
- [ ] Denúncias são somente leitura nesta V1.
- [ ] Métricas sem fonte real aparecem como indisponíveis/omitidas.
- [ ] UI mobile-first validada.
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] Nenhum `<img>` cru foi usado.
- [ ] Imagens de referência foram citadas.
- [ ] Checks/builds relevantes executados sem erros.
- [ ] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real.
