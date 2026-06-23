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

## Atualizacao 2026-06-22 - CTA compacto na arvore de comentarios

O WhatsApp segue sendo a conversao principal da Lectum, inclusive quando o CTA aparece em comentarios. Entretanto, dentro de arvores profundas o botao nao deve ocupar a largura completa do comentario, para nao dominar a leitura e as acoes da thread.

Decisao complementar:

- Manter o CTA forte em comentarios: verde, borda destacada, icone do WhatsApp e label `Chamar no WhatsApp`.
- Reduzir somente a apresentacao do CTA na arvore do detalhe do post, usando pill `inline-flex`/`w-fit`, altura menor, largura maxima do container e fonte destacada.
- Remover a centralizacao/faixa full-width nesse contexto, mantendo o botao alinhado ao fluxo do comentario e proporcional a respostas aninhadas.
- Preservar os CTAs maiores em post principal, resposta profissional destacada, perfil publico e cards de psicologos, onde a acao ocupa papel de CTA principal do bloco.
- Nao alterar tracking de clique, modal de redirecionamento, backend, schema, endpoints ou regra de exposicao de `author.whatsapp_url`.

Validacao complementar:

- Chrome/CDP mobile autenticado `390x844` confirmou botoes de comentario com `inline-flex`, largura entre 150px e 230px, altura compacta, `white-space: nowrap`, label sem quebra e icone visivel.
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`


## Atualizacao 2026-06-22 - CTA compacto centralizado sob midia no desktop

O CTA compacto de WhatsApp dentro da arvore de comentarios continuou correto para comentarios sem midia, mas em desktop ficava visualmente desalinhado quando aparecia logo abaixo de uma imagem ou video centralizado.

Decisao complementar:

- Manter o CTA de comentarios como pill compacto, sem voltar ao formato full-width.
- Quando a resposta/comentario tiver `media_url`, centralizar apenas em breakpoints desktop/tablet (`sm:`) usando wrapper flex com `justify-center`.
- No mobile, preservar o comportamento compacto alinhado ao fluxo do comentario para evitar perda de largura util em arvores profundas.
- Em comentarios sem midia, preservar o alinhamento anterior.

Consequencias:

- Em desktop, video/imagem e CTA compartilham o mesmo eixo visual, reforcando a acao principal sem criar faixa grande.
- A arvore profunda continua compacta no mobile e em respostas sem midia.
- Nao ha mudanca no tracking, regra de exibicao de WhatsApp, backend, endpoints, schema ou storage.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Chrome/CDP desktop `1440x900`: sucesso, em resposta com video e WhatsApp, media center `779.50` e botao center `779.49`.

## Atualizacao 2026-06-22 - CTA WhatsApp anexado a midia e neutro

O produto decidiu manter o WhatsApp como CTA principal de conversao, mas reduzir o peso visual verde em posts e comentarios com midia. A referencia aprovada foi um card anexado a midia, com nome do anunciante/autor acima e acao abaixo.

Decisao complementar:

- Criar `CommunityWhatsAppCta` como camada visual compartilhada para contextos de comunidade, preservando `PsychologistWhatsAppRedirectButton` para tracking, modal intermediaria e redirecionamento seguro.
- Renderizar o nome do psicologo na primeira linha e `Chamar no WhatsApp` na segunda, com icone discreto e paleta neutra/cinza; o verde fica reservado ao simbolo/associacao do WhatsApp, nao ao bloco inteiro.
- Quando houver midia, renderizar o CTA dentro do mesmo wrapper da midia, para herdar a largura: full-width em carrossel/midia horizontal e largura compacta em videos verticais.
- Quando nao houver midia, usar o mesmo formato retangular arredondado em `w-fit`, evitando voltar ao pill verde ou a faixa full-width.
- Aplicar o padrao nos cards compartilhados, detalhe do post, tela da comunidade e respostas salvas; preservar cards de diretorio/perfil fora da comunidade.
- Nao alterar backend, DTOs, tracking, modal de redirecionamento, storage, regras de permissao, schema ou endpoints.

Consequencias:

- A chamada para WhatsApp fica visualmente integrada a fotos/videos sem competir com a midia ou com a leitura do comentario.
- O mesmo componente reduz divergencias entre feed, comunidade, detalhe, salvos e contribuicoes reutilizadas.
- A acao continua clara e rastreavel, mas com linguagem visual mais premium e menos agressiva.

Validacao complementar:

- `pnpm --dir frontend biome:fix`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- `git diff --check`: sucesso.
