# TASK-48: Dashboard administrativo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-48 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-47 |
| ADR alvo | ADR se houver decisão nova sobre agregação financeira, exportação ou visualização de gráficos sem package externo |

## Contexto

O painel Admin terá uma aba Dashboard para visão geral da plataforma Lectum. A referência visual inicial é `_product/proto/admin/Dashboard.png`, com sidebar escura, filtros de período, cards de métricas, gráficos de comunidades/faturamento/localização/dispositivo e lista de denúncias pendentes.

O Dashboard não pode usar mocks. Cada número exibido deve vir de agregação real do backend ou aparecer como indisponível com explicação honesta.

## Objetivo

Criar a primeira versão funcional do Dashboard Admin com dados reais agregados do backend, filtro de período e layout alinhado à referência visual.

## Pré-requisitos e bloqueios

- TASK-45 concluída: auth admin real.
- TASK-46 concluída: app `admin/` e shell lateral.
- TASK-47 concluída: sessões com tipo de dispositivo.
- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/PACKAGES.md` e `_product/tasks/PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Dashboard.png` como referência visual local.
- Se Builder/Quick Copy estiver disponível no cliente, usar como complemento; se não, registrar limitação e usar a imagem local.

## Escopo frontend

- Implementar rota protegida `/dashboard` no app `admin/`.
- Renderizar:
  - cabeçalho "Dashboard" com subtítulo;
  - filtro de período;
  - botão de exportação somente se houver endpoint real;
  - cards de sessões, receita/faturamento, pacientes, psicólogos e denúncias pendentes;
  - gráfico de atividade nas comunidades;
  - gráfico financeiro;
  - card de acessos por localização;
  - gráfico de atividade por dispositivo;
  - lista lateral de denúncias pendentes.
- Estados obrigatórios:
  - loading;
  - erro;
  - vazio/indisponível por métrica sem dado real;
  - período sem registros.
- UI mobile-first:
  - cards em coluna no mobile;
  - sidebar/drawer herdado da TASK-46;
  - grids progressivos para tablet/desktop.

## Escopo backend

- Criar endpoint admin privado:
  - `GET /api/admin/private/dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Criar exportação real, se a UI mantiver o botão:
  - `GET /api/admin/private/dashboard/export?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - CSV ou JSON documentado, sem dados inventados.
- Agregar dados reais:
  - sessões: `visitor_session`;
  - pacientes: `user.role="paciente"`;
  - psicólogos: `user.role="psicologo"` e/ou `psychologist_profile`;
  - denúncias pendentes: `post_report.status="pendente"`;
  - atividade de comunidade: `community_post` e `post_reply`;
  - localização: `visitor_location`;
  - dispositivo: `visitor_session.device_type`;
  - financeiro: `payment_event` e/ou `professional_subscription` + `subscription_plan`, com campo `source` no retorno deixando claro se é receita confirmada, estimativa de assinatura ativa ou indisponível.

## Fora do escopo

- Criar telas completas de Tráfego, Comunidades, Psicólogos, Pacientes, Financeiro, Notificações ou Configurações.
- Resolver denúncias/moderar posts a partir do Dashboard.
- Criar tracking de pageviews detalhado.
- Instalar biblioteca de gráficos/mapa sem ADR.
- Exibir mapa mundial se não houver solução real compatível com packages; nesse caso, usar lista/ranking de países e registrar limitação.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`: módulos backend, rotas, helpers de resposta e separação de aplicações.
- `PACKAGES.md`: não instalar chart/map/table libs sem necessidade concreta e ADR.
- `PROTO-INVENTORY.md`: referência visual Admin Dashboard.

Backend esperado:

- Módulo em namespace admin privado, seguindo controller/service/repository/validator.
- Validator para período:
  - `from` e `to` opcionais;
  - default: últimos 7 dias completos ou janela equivalente documentada;
  - limite máximo inicial: 90 dias, salvo decisão em ADR.
- Resposta sugerida:
  - `period`;
  - `cards`;
  - `community_activity`;
  - `financial`;
  - `locations`;
  - `devices`;
  - `pending_reports`.
- Cada métrica deve incluir metadado de origem/indisponibilidade quando aplicável.
- Denúncias:
  - retornar últimas pendentes ordenadas por severidade derivada e `createdAt`;
  - severidade derivada por mapeamento determinístico de `reason`/`target_type`, documentado no service;
  - não criar coluna nova de severidade nesta task, salvo ADR.
- Financeiro:
  - não somar dados ambíguos como receita confirmada;
  - se `payment_event` não permitir confirmar valor, retornar financeiro como estimativa ou indisponível, com label honesto para o frontend.

Frontend esperado:

- `admin/src/api/req/dashboard`;
- `admin/src/api/callers/dashboard`;
- query keys próprias;
- componentes internos para cards e gráficos simples.
- Gráficos:
  - preferir SVG/CSS próprio e acessível, sem package novo;
  - incluir alternativa textual/tabela resumida para acessibilidade;
  - não usar imagem estática de gráfico.
- Export:
  - se implementado, baixa dados reais do período;
  - se não implementado nesta task, o botão não deve aparecer habilitado.

Packages usados:

- Nenhum pacote novo por padrão.
- Qualquer adoção de chart/table/map lib exige validação de `PACKAGES.md` e ADR.

Regras anti-recriação:

- Reutilizar shell, API client e tokens criados na TASK-46.
- Reutilizar modelos e dados existentes; não criar tabelas duplicadas para métricas que já podem ser agregadas.
- Não usar sample data, seed visual ou JSON estático como métrica.

Regras de UI obrigatórias:

- Mobile-first obrigatório.
- Nenhum `<img>` cru; usar `next/image` se imagem for inevitável.
- Tema claro/escuro/sistema por tokens, se o admin app tiver suporte de tema desde TASK-46; caso contrário, registrar limitação e manter tokens preparados.
- Componentes com foco visível e labels acessíveis.

## Critérios de aceite

- [x] Dashboard carrega somente para admin autenticado.
- [x] Cards principais usam dados reais do endpoint admin.
- [x] Gráfico de dispositivo usa dados reais de `visitor_session` da TASK-47.
- [x] Atividade de comunidades usa `community_post` e `post_reply` reais.
- [x] Denúncias pendentes usam `post_report` real e abrem caminho claro para a futura tela de moderação.
- [x] Financeiro exibe label honesto conforme origem dos dados; não apresenta estimativa como receita confirmada.
- [x] Filtro de período altera todas as consultas/agregações.
- [x] Exportação só aparece/habilita se usar endpoint real.
- [x] Estados loading, erro, vazio e indisponível foram implementados.
- [x] UI mobile-first validada em ~390px, tablet e desktop.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Nenhum `<img>` cru foi usado.
- [x] `_product/proto/admin/Dashboard.png` foi citado como referência visual; Builder/Quick Copy foi usado se disponível.
- [x] `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build` e `pnpm check` foram executados sem erros.
- [x] Browser local validado com admin real.
- [x] ADR criado ou atualizado em `adrs/` se houver nova decisão relevante.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local:
  - login admin;
  - abrir `/dashboard`;
  - trocar período;
  - validar mobile ~390px e desktop;
  - conferir estados vazios quando não houver dados.

## Notas de execução

- A imagem de referência mostra números exemplificativos; eles não devem ser copiados para a implementação.
- O card "Acessos por localização" pode começar com ranking de países se mapa real/package não for aprovado.
- Se alguma métrica depender de dado ainda não capturado, retornar `unavailable` em vez de simular.

### Execução TASK-48 (2026-07-09)

- Implementado o endpoint protegido `GET /api/admin/private/dashboard/summary` com agregações reais de `visitor_session`, `visitor_location`, `users`, `community_post`, `post_reply`, `post_report` e `professional_subscription` + `subscription_plan`.
- Implementado `GET /api/admin/private/dashboard/export` com CSV real do período selecionado; por isso o botão de exportação permanece habilitado na UI.
- Financeiro exibido como **MRR estimado por assinaturas profissionais ativas**, excluindo cortesias administrativas; `payment_event` continua listado como indisponível para receita confirmada por não possuir campo monetário normalizado.
- Gráficos de comunidade, financeiro e dispositivo foram implementados com SVG/CSS próprio, sem package novo; localização inicia como ranking de países, sem mapa/package externo.
- Severidade de denúncias pendentes é derivada deterministicamente de `reason`/`target_type`, sem nova coluna no banco.
- Referência visual usada: `_product/proto/admin/Dashboard.png`. Builder/Quick Copy não estava acessível como ferramenta MCP neste ambiente; a limitação foi registrada no ADR.
- Browser local validado em app Admin temporário com backend temporário, admin real transitório, larguras 390px, 768px e 1366px, troca de período para 30 dias e remoção do admin transitório ao final.

### Complemento visual solicitado (2026-07-27)

- Aplicado o layout piloto premium ao `/dashboard`, mantendo dados reais e contratos da TASK-48 intactos.
- A rota passou a entrar no escopo `admin-premium-pilot` do AdminShell, com sidebar clara, cards com borda/sombra suave e hierarquia tipografica igual ao piloto ja validado em outras telas Admin.
- O topo agora usa card informativo com **Exportar CSV** real; os controles de periodo foram movidos para o card **Visao geral** com seletor 7/30/90 dias e campos **De/Ate**, preservando o contrato `from`/`to` existente.
- Graficos continuam em SVG/CSS proprio, sem pacote novo e sem imagem estatica; a curva de comunidades usa `buildSmoothSvgPath` e os grids foram deduplicados para evitar warnings com poucos valores.
- UI mobile-first validada em 390px via browser local/headless; desktop validado em 1440px. Builder/Quick Copy nao estava exposto como ferramenta no ambiente, entao a referencia auditavel foi `_product/proto/admin/Dashboard.png` mais o piloto premium local ja aprovado.
- Validacoes executadas neste complemento: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e browser local/headless em `/dashboard`.
