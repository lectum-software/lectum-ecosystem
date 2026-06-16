# ADR-0096 - Detalhe de post com composer compacto, denúncia e mídia profissional

## Status

Accepted

## Contexto

A tela interna do post precisava ficar mais próxima da referência `Dentro do Post` e de padrões do Reddit: post principal no topo, campo de resposta compacto, discussão em árvore, vídeos profissionais em proporção vertical moderada e fluxo de denúncia acessível no menu de três pontos.

Também havia uma regra nova para mídia em respostas: somente psicólogos verificados e com Plano Profissional ativo podem anexar mídia. A validação não poderia ficar apenas no frontend.

## Decisão

- Transformar o composer de resposta em um campo compacto mobile-first: no desktop ele fica logo após o post; no mobile ele é fixo no rodapé e expande apenas quando o usuário interage ou digita.
- Manter o texto da resposta usando React Hook Form/Zod e controllers da fundação da TASK-02; a mídia é anexada como arquivo opcional do composer.
- Criar upload real `POST /api/private/posts/:id/replies/media`, usando o middleware de upload existente e o bucket público já configurado, retornando `media_url` e `media_type` para uso na criação da resposta.
- Validar no backend que upload e criação de resposta com `mediaUrl`/`mediaType` só passam para psicólogos com `cfp_verified_at` e assinatura profissional ativa via `activeProfessionalEntitlementWhere()`.
- Criar `post_report` com uma denúncia ativa por usuário/post e endpoint `POST /api/private/posts/:id/report`; denunciar não remove automaticamente o post, mantendo a moderação reativa já adotada.
- Limitar vídeo de resposta (`post_reply.media_type=video`) a um card 9:16 com largura máxima, para complementar a discussão sem dominar a página.
- Complemento em 2026-06-16: manter o contexto de resposta apenas no placeholder do composer (`Comentar no post` para comentário direto e `Responder [nome]` para resposta), removendo a linha separada `Respondendo [nome]`.
- Complemento em 2026-06-16: exibir um cancelamento discreto somente quando o composer está focado; cancelar limpa rascunho/mídia local, remove o alvo de resposta ativo, desfoca o campo e não muda a mutation real de envio.
- Complemento em 2026-06-16: no mobile, permitir arrastar o composer focado para baixo para cancelar, com limite mínimo e captura restrita ao campo para não interferir no scroll normal da página.

## Consequências

- Usuários comuns e psicólogos sem assinatura/validação visualizam o anexo desabilitado com explicação e são bloqueados no backend se tentarem enviar mídia por API.
- Psicólogos aptos podem anexar imagem/vídeo em respostas usando infraestrutura real de upload; se a criação da resposta falhar após upload, pode haver arquivo público órfão até existir rotina de limpeza específica.
- O fluxo de denúncia passa a ser persistido e preparado para painel/admin futuro, mas sem automatizar remoção ou pré-moderação.
- O cancelamento do composer é uma decisão de UX local: não cancela requests já iniciadas e não altera contrato, payload ou persistência de respostas.

## Validação

- `pnpm --dir backend db:migrate --name add_post_reports`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video` respondeu `200`.
- Complemento 2026-06-16: `pnpm --dir frontend check`.
- Complemento 2026-06-16: `pnpm --dir frontend build`.
- Complemento 2026-06-16: HTTP local em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video` respondeu `200` com cookie de sessão local de validação.
