# ADR-0228: Dashboard Admin com agregações reais e gráficos sem pacote externo

## Status

Accepted

## Contexto

A TASK-48 inaugura a tela funcional `/dashboard` do app `admin/`, usando a referência visual `_product/proto/admin/Dashboard.png`. O Dashboard precisa apresentar métricas reais do backend, filtro de período, exportação real e estados de indisponibilidade sem recorrer a mocks ou dados estáticos.

O Builder/Quick Copy ativo `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` não estava disponível como ferramenta MCP nesta execução. A implementação usou a imagem local exportada e os contratos definidos na task.

## Decisão

- Criar endpoints privados do Admin:
  - `GET /api/admin/private/dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`;
  - `GET /api/admin/private/dashboard/export?from=YYYY-MM-DD&to=YYYY-MM-DD`.
- Reutilizar o middleware real de autenticação administrativa da TASK-45 e o app/shell separado da TASK-46.
- Agregar os dados diretamente das fontes já existentes:
  - sessões e dispositivos: `visitor_session`;
  - localização: `visitor_location`;
  - pacientes/psicólogos: `users.role`;
  - comunidades: `community_post` e `post_reply`;
  - denúncias: `post_report`;
  - financeiro estimado: `professional_subscription` + `subscription_plan`.
- Definir o período padrão como os últimos 7 dias do calendário local do servidor, com limite inicial de 90 dias.
- Exibir financeiro como **MRR estimado por assinaturas profissionais ativas**, excluindo cortesias administrativas, e marcar receita confirmada por `payment_event` como indisponível porque o modelo armazena payload bruto sem campo monetário normalizado.
- Derivar severidade de denúncias por mapeamento determinístico de `reason` e `target_type`, sem criar coluna nova nesta task.
- Implementar gráficos com SVG/CSS próprio no frontend Admin, sem instalar chart/map/table packages.
- Substituir o mapa mundial do protótipo por ranking real de países, evitando pacote de mapa sem necessidade e sem inventar geodados.
- Exportar CSV real do mesmo contrato agregado usado pela tela.

## Consequências

- O Dashboard Admin já pode ser usado com dados reais e período variável, sem acoplar o Admin ao app principal.
- A métrica financeira é útil para operação, mas permanece explicitamente estimada até existir normalização monetária confiável de eventos de pagamento.
- Ranking de países entrega o valor operacional inicial de localização sem custo de dependência visual; mapa pode ser reavaliado em task futura.
- A futura tela de moderação pode reutilizar IDs, severidade derivada e contexto de `post_report`, mas resolução/moderação continua fora do escopo desta task.
- Não houve alteração de schema Prisma nem instalação de pacote novo.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke API com admin real transitório:
  - bootstrap administrativo;
  - login;
  - `GET /api/admin/private/dashboard/summary?from=2026-07-03&to=2026-07-09`;
  - `GET /api/admin/private/dashboard/export?from=2026-07-03&to=2026-07-09`;
  - remoção do admin transitório ao final.
- Browser local automatizado por Chrome DevTools Protocol:
  - app Admin temporário em `http://localhost:3012`;
  - backend temporário em `http://localhost:3101`;
  - sessão com admin real transitório;
  - `/dashboard` carregado;
  - troca para período de 30 dias;
  - validação responsiva em 390px, 768px e 1366px;
  - remoção do admin transitório ao final.

## Pendências

- Normalizar eventos de pagamento em estrutura monetária própria antes de chamar a métrica financeira de receita confirmada.
- Reavaliar mapa real apenas se uma task futura aprovar biblioteca/solução compatível com `PACKAGES.md`.
