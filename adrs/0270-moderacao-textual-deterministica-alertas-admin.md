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
