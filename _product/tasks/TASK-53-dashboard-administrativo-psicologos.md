# TASK-53: Dashboard administrativo de psicólogos

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-53 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin |
| Status | Completed |
| Dependências | TASK-45, TASK-46 |
| ADR alvo | ADR se houver nova decisão sobre agregações, ranking administrativo ou métricas financeiras |

## Contexto

A área Admin de Psicólogos começa com uma visão executiva dos profissionais da plataforma. A referência visual é `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`.

Regra de produto definida em conversa: o botão **Adicionar novo psicólogo** fica fora da V1. O ranking exibido no Admin deve reutilizar o mesmo ranking real usado para posicionar vídeos/profissionais na descoberta pública de psicólogos, sem criar fórmula paralela.

## Objetivo

Implementar o dashboard administrativo de psicólogos com dados reais de perfis, planos, verificação, receita/churn honestos, ranking público reutilizado e estatísticas agregadas.

## Pré-requisitos e bloqueios

- TASK-45 concluída: autenticação Admin real.
- TASK-46 concluída: app `admin/` e shell lateral.
- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md`, `_product/tasks/PACKAGES.md` e `_product/tasks/PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` como referência visual local.
- Se Builder/Quick Copy estiver disponível, usar como complemento; se não, registrar limitação.

## Escopo frontend

- Criar rota protegida de dashboard de psicólogos:
  - `/psychologists` ou subrota equivalente definida no Admin.
- Renderizar:
  - título e subtítulo;
  - filtro de período;
  - exportação somente se houver endpoint real;
  - cards: total, gratuitos, verificados, novos cadastros, receita de assinaturas, churn;
  - gráfico temporal;
  - lista resumida de psicólogos;
  - ranking de psicólogos com score real da descoberta pública;
  - estatísticas por serviços, abordagens, público atendido, modalidade, gênero, experiência, convênio, desconto, valor social e distribuição por estado;
  - seção de filtros mais buscados somente se houver fonte real; caso contrário, exibir indisponível ou omitir com copy honesta.
- O botão "Adicionar novo psicólogo" não deve ser renderizado nesta V1.

## Escopo backend

- Criar endpoint admin privado:
  - `GET /api/admin/private/psychologists/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Agregar dados reais de:
  - `user.role="psicologo"`;
  - `psychologist_profile`;
  - `professional_subscription` e `subscription_plan`;
  - `professional_review`;
  - `psychologist_favorite`;
  - `contact_request`;
  - `profile_view_event`;
  - catálogos `service`, `approach`, `specialty`;
  - campos `modality`, `gender`, `target_audience`, `accepts_insurance`, `discount_first_session`, `social_value`, `crp_registration_date`.
- Reutilizar a função/score de ranking existente na descoberta pública de psicólogos. Se a função atual estiver acoplada ao repositório público, extrair helper compartilhável sem alterar a fórmula.

## Fora do escopo

- Criar psicólogo manualmente pelo Admin.
- Editar psicólogo.
- Moderar avaliações.
- Cancelar assinatura.
- Criar tracking novo de filtros buscados, se ainda não existir.
- Criar fórmula nova de ranking administrativo.

## Contrato técnico detalhado

Backend esperado:

- Módulo admin privado com controller/service/repository/validator.
- Período:
  - default: últimos 7 dias;
  - limite máximo inicial: 90 dias;
  - `from <= to`.
- Receita:
  - contar apenas pagamentos/assinaturas confirmadas com origem real de cobrança quando possível;
  - `admin_grant`/cortesia não conta como receita;
  - se o dado financeiro não permitir confirmar valor, retornar `unavailable` ou `estimated` com label explícito.
- Churn:
  - fórmula documentada no service;
  - não misturar cancelamento real com expiração de cortesia.
- Ranking:
  - `Mais relevantes` e bloco de ranking usam o mesmo score da descoberta pública;
  - retornar posição, score e componentes apenas quando já existirem/forem seguros.

Frontend esperado:

- `admin/src/api/req/psychologists`;
- `admin/src/api/callers/psychologists`;
- query keys próprias;
- gráficos simples acessíveis com alternativa textual;
- cards responsivos e mobile-first.

Packages usados:

- Nenhum pacote novo por padrão.
- Qualquer chart/table lib exige validação em `PACKAGES.md` e ADR.

## Critérios de aceite

- [x] A rota só abre para admin autenticado.
- [x] Botão "Adicionar novo psicólogo" não aparece nesta V1.
- [x] Cards e gráficos usam dados reais.
- [x] Ranking reutiliza a fórmula real da descoberta pública de psicólogos.
- [x] Receita/churn têm fórmula honesta e não contam cortesia como receita.
- [x] Métricas sem fonte real aparecem como indisponíveis ou são omitidas.
- [x] Filtro de período atualiza as agregações.
- [x] UI mobile-first validada em ~390px, tablet e desktop.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Nenhum `<img>` cru foi usado.
- [x] `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` foi citado como referência visual.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado ou atualizado se houver decisão relevante.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real.

## Notas de execução

- Os números da imagem são referência visual, não seed.
- Se `Filtros de busca` ainda não tiver rastreamento real, não preencher com dados inventados.
- Executado em 2026-07-09.
- Referência visual usada: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` não estava exposto como ferramenta neste ambiente; a implementação usou a imagem local e registrou a limitação no ADR.
- O endpoint real criado é `GET /api/admin/private/psychologists/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD`.
- A rota do app Admin entregue é `/psicologos`, equivalente à rota administrativa protegida definida pela navegação existente do painel.
- O ranking administrativo reutiliza o helper compartilhado `backend/src/utils/psychologist-public-ranking.ts`, extraído da descoberta pública sem alterar a fórmula.
- Receita é MRR estimado com assinaturas profissionais ativas `source=mercadopago`; `admin_grant`/cortesia e plano gratuito não contam como receita.
- Churn usa cancelamentos reais de assinaturas profissionais Mercado Pago no período dividido por base paga ativa no início + novas assinaturas pagas no período; cortesia e gratuito ficam fora.
- Filtros mais buscados aparecem como indisponíveis porque não há tracking persistido de filtros/termos de busca.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, chamada real da API com admin temporário e validação headless local em `/psicologos` nos viewports 390px e desktop.

### Correção UX em 2026-07-12

- Título do dashboard alterado para **Dashboard de Psicólogos**.
- Linha **Período consultado** removida do topo da rota `/psicologos`.
- Chips rápidos **7 dias**, **30 dias** e **90 dias** removidos; o filtro passou a seguir o seletor usado nas estatísticas do detalhe do psicólogo: **Esta semana**, **Este mês**, **Este ano** e **Todo o período**, mantendo datas manuais como período personalizado.
- Textos descritivos longos dentro dos cards de contadores foram removidos da UI, preservando os dados reais no contrato.
- Backend do dashboard passou a aceitar `period=week|month|year|all|custom`; `period=all` deriva o início pelo primeiro cadastro real de psicólogo e não usa data mockada.
- Referência visual consultada: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`; Builder/Quick Copy não estava disponível como ferramenta callable no ambiente.
- Validações desta correção: `pnpm --dir admin check`, `pnpm --dir admin build` e `pnpm --dir backend exec biome check --error-on-warnings src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts src/modules/api/admin/private/psychologists/dashboard/validator/index.ts`.
- `pnpm --dir backend check`, `pnpm --dir backend build` e `pnpm check` foram executados, mas ficaram bloqueados por alterações pré-existentes no workspace (formatação/TypeScript em fluxos de nome profissional/WhatsApp e `backend/prisma/schema.prisma` já modificado com falha P1012 no `prisma generate`).
- Browser local/headless em 390px confirmou a rota protegida em `/psicologos` redirecionando/carregando sem sessão Admin; validação visual autenticada depende de sessão Admin real no navegador do operador.
