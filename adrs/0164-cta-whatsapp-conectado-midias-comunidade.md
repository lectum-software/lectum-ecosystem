# ADR-0164 — CTA de WhatsApp conectado às mídias da comunidade

Data: 2026-06-24
Status: Aceita

## Contexto

O CTA de WhatsApp exibido em posts e respostas/comentários com mídia estava visualmente separado do vídeo/imagem, parecendo um card independente abaixo do conteúdo. Isso reduzia a sensação de unidade entre mídia e CTA, apesar de o WhatsApp continuar sendo uma ação central para a Lectum.

## Decisão

Quando o CTA de WhatsApp estiver anexado a uma mídia em posts, respostas ou comentários da comunidade, ele passa a ser renderizado como extensão visual do frame: sem espaçamento entre mídia e CTA, com topo conectado, borda superior removida e cantos inferiores arredondados. A copy anexada à mídia passa a usar `WhatsApp` na primeira linha e `Falar com {nome curto derivado do nome completo do psicólogo}` na segunda.

CTAs sem mídia permanecem como botões independentes para preservar legibilidade e consistência nos casos em que não há frame ao qual conectar.

## Consequências

- O CTA mantém destaque, mas deixa de parecer um card separado.
- A solução é reaproveitada em mídia única e carrossel.
- A lógica de clique, tracking e abertura do WhatsApp permanece centralizada em `PsychologistWhatsAppRedirectButton`.

## Atualizacao 2026-06-25 — respiro e legibilidade do CTA

O CTA anexado a midia foi refinado para evitar aparencia de texto espremido/cortado:

- a variante anexada recebeu mais padding vertical e gap entre as duas linhas;
- as linhas do CTA passaram de `leading-none` para `leading-[1.35]`;
- a linha `WhatsApp` deixou de depender de `truncate`/`overflow-hidden`, usando `overflow-visible` e mantendo `whitespace-nowrap`;
- a segunda linha passou a exibir `Falar com {nome curto derivado} →`, com seta discreta no texto.

A largura do CTA continua seguindo a largura do frame de imagem/video por estar renderizado como footer do mesmo bloco de midia. A logica de clique, tracking e abertura do WhatsApp permanece centralizada em `PsychologistWhatsAppRedirectButton`.

### Validacao desta atualizacao

- `pnpm.cmd --dir frontend exec biome check --write "src/components/community/community-whatsapp-cta.tsx"`
- `pnpm.cmd --dir frontend check`
- `pnpm.cmd --dir frontend build`
- `pnpm.cmd check`
- HTTP local `200` em `http://127.0.0.1:3000/app/community/feed`
- HTTP local `200` em `http://127.0.0.1:3000/app/community/ansiedade-em-equilibrio`
- HTTP local `200` em `http://127.0.0.1:3000/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`

## Atualizacao 2026-06-25 — CTA sem mídia padronizado

O CTA independente exibido em posts e respostas sem mídia passa a usar os mesmos elementos textuais da variante anexada: `WhatsApp` na primeira linha e `Falar com {nome curto derivado} →` na segunda. A diferença permanece apenas no contêiner visual: sem mídia, o botão continua independente, com largura ajustada ao conteúdo e cantos completos; com mídia, segue conectado ao frame.

A decisão evita duas hierarquias concorrentes para a mesma ação de conversão e mantém a implementação centralizada em `CommunityWhatsAppCta`, reaproveitando `PsychologistWhatsAppRedirectButton` e `PsychologistWhatsAppButtonContent`.

### Validacao desta atualizacao

- `pnpm.cmd --dir frontend exec biome check --write "src/components/community/community-whatsapp-cta.tsx"`
- `pnpm.cmd --dir frontend check`
- `pnpm.cmd --dir frontend build`
- `pnpm.cmd check`
- HTTP local `200` em `http://127.0.0.1:3000/app/community/feed`
- HTTP local `200` em `http://127.0.0.1:3000/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`


## Atualizacao 2026-06-25 - seta do CTA como asset SVG

O CTA de WhatsApp deixa de depender da seta textual no label `Falar com {nome curto derivado}` e passa a renderizar o SVG fornecido pelo usuario como asset local versionado. A decisao mantem a copy `Falar com {nome curto derivado}` no componente compartilhado e adiciona um icone decorativo ao final da linha via `next/image`, sem `<img>`.

### Consequencias

- O icone fica consistente com o asset solicitado e preserva o tom discreto `#64748B`.
- A abertura do WhatsApp, tracking e modal de transicao continuam centralizados em `PsychologistWhatsAppRedirectButton`.
- CTAs anexados a midia e CTAs independentes seguem usando a mesma composicao textual.

### Validacao desta atualizacao

- `pnpm --dir frontend exec biome check --write "src/components/community/community-whatsapp-cta.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- HTTP local `200` em `http://127.0.0.1:3000/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`

## Atualizacao 2026-07-01 - nome curto derivado no CTA

Como o perfil do psicologo ainda nao possui campo de nome curto/preferido, a copy `Falar com ...` passa a derivar o nome de chamada diretamente do nome completo publico:

1. normalizar espacos;
2. usar os dois primeiros termos do nome completo;
3. quando o segundo termo for particula de nome (`de`, `da`, `do`, `das`, `dos`, `di`, `du` ou `e`), incluir tambem o terceiro termo, se existir;
4. se houver apenas um termo, usar esse termo;
5. se o nome estiver ausente, usar o fallback `psicólogo`.

Exemplos esperados:

- `Ana Rúbia Cunha Papi` -> `Falar com Ana Rúbia`;
- `Maria de Fátima Souza` -> `Falar com Maria de Fátima`;
- `João da Silva` -> `Falar com João da Silva`.

A regra fica no frontend em `getProfessionalShortDisplayName`, usada pelo `CommunityWhatsAppCta`. O texto contextual do `wa.me` no backend continua seguindo a regra historica de saudacao curta do link e nao foi alterado nesta decisao.

### Validacao desta atualizacao

- Builder Quick Copy indisponivel neste ambiente: `npx "@builder.io/dev-tools@latest" auth status` retornou `Not Authenticated to Builder.io`; foi usado fallback visual local/produto.
- Referencias visuais consultadas: `_product/proto/Dentro do Post.jpg` e tela local mobile `390x844`.
- `pnpm --dir frontend exec biome check --write src/components/community/community-whatsapp-cta.tsx src/utils/professional-name.ts`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome/CDP mobile `390x844` em `/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v`, confirmando `WhatsApp` + `Falar com Ana Rúbia`.
