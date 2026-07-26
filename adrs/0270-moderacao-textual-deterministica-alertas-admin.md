# ADR-0270: Moderação textual determinística V1 e alertas Admin para pacientes

## Status

Accepted — 2026-07-15

## Contexto

A Lectum permite publicações textuais de pacientes em comunidades de saúde mental. Pacientes não possuem upload de mídia, mas podem digitar links, convites externos, conteúdo sexual explícito ou textos com risco de autolesão/suicídio. A versão atual precisava começar simples, sem IA, sem serviço externo e sem pacote novo.

## Decisão

- Implementar moderação automática V1 com regras determinísticas em `backend/src/utils/content-moderation.ts`.
- Aplicar a regra somente a textos de pacientes nos fluxos reais de criação de post e resposta.
- Bloquear URLs/domínios/encurtadores e convites para canais externos, mesmo que a UI renderize links como texto puro.
- Não bloquear palavras sensíveis isoladas quando o texto aparenta relato terapêutico; classificar como `allow_sensitive` e publicar.
- Classificar padrões de solicitação/divulgação sexual, spam/golpe e contexto sexual envolvendo menor como `block`.
- Classificar intenção imediata, plano ou pedido de método de autolesão/suicídio como `safety_hold` urgente, sem publicar.
- Persistir eventos reais em `content_moderation_event` para `allow_sensitive`, `block` e `safety_hold`; `allow` não gera evento.
- Expor central Admin em `/moderacao`, badge no menu e alertas no dashboard de comunidades.
- Restringir `content_snapshot` ao detalhe Admin autenticado; listas mostram apenas `content_excerpt`.
- Revisão/resolução criam `admin_activity_log`; remoção de conteúdo `allow_sensitive` publicado reutiliza o fluxo auditado de comunidades e resolve o evento com nota.

## Consequências

- A solução tem falsos positivos e falsos negativos conhecidos, mas é auditável e calibrável sem custo externo.
- A lista de termos/regras não é exibida ao paciente para evitar incentivo a bypass.
- A copy de crise é conservadora: informa que o conteúdo não foi publicado por segurança e orienta buscar ajuda imediata local, sem prometer atendimento emergencial pela Lectum.
- A política de retenção/descarte de snapshots sensíveis permanece pendente para decisão jurídica/LGPD; esta task apenas persiste o mínimo necessário para revisão Admin.
- Builder/Quick Copy não esteve disponível como ferramenta executável no ambiente; a UI seguiu padrões locais do Admin e referências exportadas em `_product/proto/admin/Comunidades/Comunidades - Dashboard.png` e `_product/proto/admin/Notificações.png`.

## Validações

- Migration Prisma `20260715020539_add_content_moderation_events` aplicada com `pnpm --dir backend db:migrate -- --name add_content_moderation_events` após uma tentativa inicial de `pnpm --dir backend db:migrate` expirar aguardando entrada interativa de nome.
- Helper validado por `pnpm --dir backend exec tsx src/operations/moderation/check-content-moderation.ts`.

## Update 2026-07-26: post bloqueado com detalhe Admin

Posts raiz de pacientes classificados como `block` ou `safety_hold` passam a ser persistidos internamente como `community_post.status="bloqueado"`. A decisão mantém a resposta pública ao paciente como erro 422 e mantém o conteúdo fora de feeds, detalhes públicos, notificações e interações públicas, mas dá ao Admin um registro próprio do post para auditoria e investigação.

O `content_moderation_event` desses posts agora usa `target_type="community_post"` e `target_id` do post interno. Para decisões de bloqueio, `public_url` continua nulo; a central de moderação expõe `admin_content_url` para abrir a rota protegida `/comunidades/[slug]/conteudo/post/[id]`.

Respostas/comentários bloqueados continuam snapshot-only porque `post_reply` ainda não possui campo de status. Ampliar liberação/detalhe próprio de respostas bloqueadas exigirá nova decisão e possível migration.

Não houve schema/migration, package novo, IA, mock, seed ou endpoint paralelo. Builder/Quick Copy não estava disponível como ferramenta callable; a execução usou a captura enviada pelo usuário e padrões Admin existentes.

Validações: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check` (primeira tentativa expirou por timeout da ferramenta, segunda concluiu), `pnpm --dir admin build`, `pnpm check`, smoke HTTP 200 de `/moderacao/conteudo-sensivel` e smoke HTTP 200 da rota Admin existente de detalhe de post.

## Update 2026-07-26: ícone de detalhe ativo para bloqueios

A coluna de página/detalhe da central de conteúdo sensível deve navegar apenas para detalhe administrativo de conteúdo. Quando o evento possui `admin_content_url`, o ícone abre a rota protegida do conteúdo em `/comunidades/[slug]/conteudo/[type]/[id]`, inclusive se também existir `public_url`.

O ícone não abre o modal de snapshot protegido e não usa a URL pública do post. Eventos snapshot-only/legados sem `target_id` permanecem sem navegação nessa coluna porque não existe página própria de conteúdo para abrir; o detalhe protegido do evento continua restrito ao fluxo específico de revisão, sem criar backfill, seed, mock ou post artificial.

Como a diferença visual entre link ativo e estado indisponível estava ambígua e o Admin já possui um padrão consolidado em Operacionais, o ícone com `admin_content_url` passa a reutilizar a paleta do atalho de detalhes de Operacionais (`bg-surface text-foreground`, com hover primário). O estado sem URL permanece com `bg-surface-muted text-subtle`.

Para reduzir ruído visual na tabela, o cabeçalho visível da coluna de atalho deixa de exibir "Página". A coluna preserva rótulo não visual para acessibilidade, já que a função do atalho é comunicada pelo `aria-label` do link/estado indisponível em cada linha.

Essa decisão preserva a experiência esperada do Admin e evita levar moderadores para o ambiente público. O conteúdo bloqueado continua sem `public_url`, fora de feed público/privado e com snapshot completo restrito ao Admin autenticado.

Validações: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP 200 de `/moderacao/conteudo-sensivel`, smoke HTTP 200 de `/moderacao/operacionais`, smoke HTTP 200 da rota Admin de detalhe `/comunidades/tmp-layout-denuncias-cmrgztri70/conteudo/post/tmp_den_layout_cmrgztri70_thread_01` e smoke HTTP 200 da rota visual `/comunidades/visualizacao-moderacao/conteudo/post/visual-admin-detail-link-blocked-post`.
