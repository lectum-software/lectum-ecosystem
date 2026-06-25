# ADR-0164 — CTA de WhatsApp conectado às mídias da comunidade

Data: 2026-06-24
Status: Aceita

## Contexto

O CTA de WhatsApp exibido em posts e respostas/comentários com mídia estava visualmente separado do vídeo/imagem, parecendo um card independente abaixo do conteúdo. Isso reduzia a sensação de unidade entre mídia e CTA, apesar de o WhatsApp continuar sendo uma ação central para a Lectum.

## Decisão

Quando o CTA de WhatsApp estiver anexado a uma mídia em posts, respostas ou comentários da comunidade, ele passa a ser renderizado como extensão visual do frame: sem espaçamento entre mídia e CTA, com topo conectado, borda superior removida e cantos inferiores arredondados. A copy anexada à mídia passa a usar `WhatsApp` na primeira linha e `Falar com {primeiro nome do psicólogo}` na segunda.

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
- a segunda linha passou a exibir `Falar com {primeiro nome} →`, com seta discreta no texto.

A largura do CTA continua seguindo a largura do frame de imagem/video por estar renderizado como footer do mesmo bloco de midia. A logica de clique, tracking e abertura do WhatsApp permanece centralizada em `PsychologistWhatsAppRedirectButton`.

### Validacao desta atualizacao

- `pnpm.cmd --dir frontend exec biome check --write "src/components/community/community-whatsapp-cta.tsx"`
- `pnpm.cmd --dir frontend check`
- `pnpm.cmd --dir frontend build`
- `pnpm.cmd check`
- HTTP local `200` em `http://127.0.0.1:3000/app/community/feed`
- HTTP local `200` em `http://127.0.0.1:3000/app/community/ansiedade-em-equilibrio`
- HTTP local `200` em `http://127.0.0.1:3000/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`
