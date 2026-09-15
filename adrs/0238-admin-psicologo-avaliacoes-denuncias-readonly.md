# ADR-0238: Avaliações e denúncias do psicólogo no Admin são somente leitura

## Status

Accepted

## Data

2026-07-10

## Task relacionada

TASK-58: Detalhe administrativo do psicólogo — Avaliações e denúncias.

## Contexto

As abas administrativas **Avaliações** e **Denúncias** precisam apoiar operação e auditoria do perfil do psicólogo sem criar poderes de moderação fora do escopo da V1. A regra de produto definida para avaliações é explícita: o Admin não deve editar, aprovar, reprovar, excluir nem responder avaliações.

Denúncias (`post_report`) podem conter relatos sensíveis e, nesta etapa, ainda não há fluxo administrativo aprovado para resolução, aplicação de medidas ou alteração de status. O painel deve expor apenas o necessário para triagem visual e navegação até o conteúdo real.

## Decisão

- Criar endpoints privados Admin somente leitura:
  - `GET /api/admin/private/psychologists/:id/reviews`;
  - `GET /api/admin/private/psychologists/:id/reports`.
- Avaliações usam exclusivamente `professional_review` real, incluindo média, distribuição por estrelas, status real e resposta do psicólogo quando já existir.
- O Admin não recebe endpoint nem UI para editar, excluir, aprovar, reprovar ou responder avaliações.
- Denúncias usam exclusivamente `post_report` real relacionado a conteúdo do psicólogo:
  - posts cujo `community_post.author_id` é o usuário do psicólogo;
  - respostas cujo `post_reply.author_id` é o usuário do psicólogo.
- A aba de denúncias é somente leitura e não altera `post_report.status`.
- Para reduzir exposição desnecessária, a resposta de denúncias mostra o papel do denunciante (`Paciente`, `Psicólogo` ou `Usuário`), mas não expõe nome, e-mail ou identificador pessoal do denunciante.
- O link **Ver detalhes** aponta apenas para rotas públicas reais de post/resposta já existentes no frontend.

## Consequências

- O Admin ganha visibilidade operacional sem criar fluxo paralelo de moderação.
- Avaliações permanecem protegidas contra intervenção administrativa indevida.
- Denúncias podem ser triadas visualmente, mas resolução e medidas continuam dependentes de task futura específica.
- Como a base local não possui denúncia real para o psicólogo validado, a UI exibe estado vazio honesto sem seed artificial.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- API local com admin real:
  - `GET /api/admin/private/psychologists/:id/reviews` retornou `200`, fonte `professional_review`, média/distribuição reais e modo `read_only`;
  - `GET /api/admin/private/psychologists/:id/reports` retornou `200`, fonte `post_report+community_post+post_reply`, cards reais e modo `read_only`.
- Browser local via Edge/CDP em `http://localhost:3002/psicologos/demo-profile-marina-rocha?tab=avaliacoes` e `?tab=denuncias`, viewport mobile de 390px, confirmou renderização das duas abas, ausência de ações de moderação e estado vazio real de denúncias.

## Limitações da execução

- Builder/Quick Copy não estava disponível como ferramenta no ambiente; a implementação visual foi guiada pelos PNGs locais:
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Avaliações.png`;
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Denúncias.png`.
- Nenhum tracking, status de denúncia, seed ou dado artificial foi criado para preencher métricas ausentes.
