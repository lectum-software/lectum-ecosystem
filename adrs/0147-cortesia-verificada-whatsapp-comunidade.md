# ADR-0147: Cortesia verificada e WhatsApp na comunidade

## Status

Accepted — 2026-06-21

## Contexto

Psicologos com cortesia administrativa ativa devem receber a mesma confianca publica de um psicologo assinante verificado dentro da comunidade. O caso real de `tuliosrezende@gmail.com` possuia `professional_subscription.source="admin_grant"` ativo, mas seus posts apareciam sem selo de verificado porque os DTOs de comunidade ainda dependiam apenas de `psychologist_profile.cfp_verified_at`.

Ao mesmo tempo, produto definiu que o CTA de WhatsApp em posts e respostas da comunidade deve aparecer para qualquer psicologo com numero publico cadastrado, inclusive no plano gratuito. O WhatsApp deixa de ser um beneficio exclusivo de selo/assinatura nesses cards, embora os cliques continuem usando o fluxo seguro de redirecionamento ja existente.

Posts editados ja persistem `community_post.edited_at`, mas o card do feed/comunidade mantinha uma linha de tempo que nao evidenciava o metadado em todos os contextos.

## Decisao

- Derivar `author.verified` para psicologos de comunidade/post quando houver `cfp_verified_at` ou assinatura profissional ativa concedida pelo administrador (`source="admin_grant"`).
- Reutilizar `activeProfessionalCourtesyEntitlementWhere()` para manter a regra de cortesia centralizada no backend.
- Manter `highlighted_professional_reply` e flags de resposta profissional verificada restritas a psicologos publicamente verificados, incluindo a equivalencia de cortesia administrativa ativa.
- Gerar `author.whatsapp_url` para qualquer psicologo nao excluido com WhatsApp cadastrado, sem exigir `cfp_verified_at`, assinatura paga ou cortesia.
- Renderizar CTA `Chamar no WhatsApp` nos cards de posts/respostas e no detalhe do post quando `author.whatsapp_url` existir.
- Exibir `editado` em cards do feed/comunidade e no card compartilhado quando `edited_at` existir.
- Nao alterar schema, storage, eventos, tracking de clique, fluxo de criacao/edicao, regras de midia, votos, salvos ou ordenacao.

## Consequencias

- A cortesia administrativa passa a ter paridade visual publica com o assinante verificado na comunidade, sem preencher artificialmente `cfp_verified_at`.
- Psicologos gratuitos com WhatsApp cadastrado ganham CTA direto nos posts/respostas, atendendo a regra de produto sem ampliar entitlement de midia ou outros recursos pagos.
- `edited_at` continua sendo apenas transparencia publica da ultima edicao, sem historico versionado.
- O backend segue public-safe: CPF, e-mail e telefone bruto nao sao expostos; o frontend recebe apenas `wa.me` derivado.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke real de API em `/api/private/community/feed/posts?search=teste%20novo&limit=20`, confirmando `author.verified=true`, `author.whatsapp_url` preenchido e `edited_at` para post de `tuliosrezende@gmail.com`.
- Chrome/CDP autenticado em `/app/community/feed`, confirmando no card `teste novo`: selo verificado, `Psicologo • ha 1 d · editado` e botao `Chamar no WhatsApp`; e em resposta profissional destacada: botao `Chamar no WhatsApp`.

## Atualizacao 2026-06-22 - CTA WhatsApp sem quebra

O CTA `Chamar no WhatsApp` em posts/respostas da comunidade deve preservar a organizacao visual da arvore de comentarios em qualquer profundidade. Em camadas aninhadas, a largura disponivel pode ficar menor do que o texto completo do botao.

Decisao complementar:

- Padronizar o conteudo do CTA em `PsychologistWhatsAppButtonContent`, com icone do WhatsApp `shrink-0` e rotulo em `truncate`/`whitespace-nowrap`.
- Manter `PsychologistWhatsAppRedirectButton` como wrapper de tracking/redirecionamento, mas com base visual segura para CTA: `inline-flex`, `min-w-0`, `max-w-full`, `items-center`, `justify-center`, `gap-2` e `whitespace-nowrap`.
- Preservar a altura fixa declarada nos pontos de uso (`h-8`, `h-11`, `h-[clamp(...)]`), evitando que texto aumente a altura do comentario.
- Quando o espaco horizontal nao comportar o rotulo, truncar somente o texto com reticencias e manter o icone sempre visivel.
- Nao alterar tracking de clique, modal de redirecionamento, regras de exposicao de `author.whatsapp_url`, backend, schema, migrations ou endpoints.

Consequencias:

- Comentarios profundos mantem a arvore compacta mesmo quando o CTA fica estreito.
- O mesmo padrao se aplica a respostas destacadas, detalhe do post, salvos, cards de psicologos e CTA mobile do perfil publico, reduzindo divergencia visual.

Validacao complementar:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP local em mobile `390x844` e desktop `1440x900`, confirmando `white-space: nowrap`, texto com `text-overflow: ellipsis`, icone `flex-shrink: 0` visivel e altura fixa nos botoes de WhatsApp.
