# ADR-0241 - Detalhe Admin de paciente somente leitura e dados pessoais mínimos

Status: Accepted

## Contexto

A TASK-61 cria a tela de detalhe administrativo do paciente. A tela precisa apoiar operação e suporte com dados reais, mas sem criar moderação, bloqueio, silenciamento, exclusão ou tracking novo apenas para preencher métricas.

A referência visual usada foi `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`. O Builder/Quick Copy ativo não ficou acessível como ferramenta neste ambiente, então a implementação usou a imagem local exportada como referência visual.

## Decisão

- O endpoint `GET /api/admin/private/patients/:id` é privado de Admin e usa a audiência admin existente.
- A tela é somente leitura na V1.
- O status exibido é apenas `Ativo` ou `Inativo`, derivado de `user.active`.
- O e-mail do paciente pode ser exibido para Admin autenticado por ser necessário para suporte/identificação operacional.
- A localização exibida é apenas coarse, derivada de `visitor_location.city/state/country` quando houver.
- Não são expostos telefone, data de nascimento, bio, endereço completo, IP, coordenadas, senha, comentários textuais de avaliações ou qualquer campo sensível não necessário para a V1.
- Atividade recente é derivada somente de eventos reais já persistidos: posts, respostas, votos, salvamentos, entrada em comunidades e avaliações publicadas criadas pelo paciente.
- Login não é exibido como atividade porque não há evento de sessão/login confiável para esse propósito na V1.
- Métricas de engajamento usam `community_post`, `post_reply`, `post_vote`, `post_save`, `post_reply_save`, `community_member` e `professional_review` reais.
- O heatmap usa `createdAt` desses eventos reais e agrega no fuso `America/Sao_Paulo`.

## Consequências

- O Admin tem uma visão operacional útil sem ampliar superfície de LGPD além do necessário.
- A tela pode apresentar estados vazios honestos quando não houver interações reais.
- O endpoint não cria auditoria nova, tracking novo, seed ou dados artificiais.
- A V1 não oferece ações administrativas sobre pacientes; qualquer ação futura precisará de task e ADR próprios.
- Não houve alteração de schema Prisma nem migration nesta task.

## Task relacionada

- TASK-61: Detalhe administrativo do paciente

## Validações

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Validação de service com paciente real existente no banco local.
- Validação HTTP do endpoint sem token retornando `401`.
- Validação local da rota Admin `/pacientes/demo-patient-reviewer-01` retornando `200` no dev server.
