# TASK-76: Ajuste dos filtros de período do Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-76 |
| Prioridade | P1 |
| Esforço | S |
| Fase | Admin |
| Status | Completed |
| Dependências | TASK-46, TASK-48, TASK-51, TASK-53, TASK-57, TASK-58, TASK-59, TASK-60, TASK-61, TASK-71 |
| ADR alvo | ADR-0295 |

## Contexto

O painel Admin possui filtros de período em dashboards e abas de detalhe. Em alguns selects, a opção `Personalizado` aparecia como alternativa selecionável no dropdown. A regra de produto solicitada em 2026-07-20 é que `Personalizado` não seja uma opção manual do select: esse estado deve surgir automaticamente apenas quando uma data for digitada nos campos `De`/`Até`. A seleção padrão deve permanecer em `Todo o período`.

Referência visual: `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Publicações.png` e screenshot enviado pelo usuário na rota de publicações do detalhe administrativo de psicólogo. O Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a validação visual usou os protótipos locais e browser local.

## Objetivo

Padronizar todos os filtros de período do Admin para:

- iniciar por padrão em `Todo o período` quando houver select de período;
- ocultar `Personalizado` da lista de opções do select;
- exibir `Personalizado` como valor atual apenas depois de edição manual dos campos de data;
- preservar consultas reais existentes, sem mocks e sem alterar contratos backend.

## Pré-requisitos e bloqueios

- Sem requisito externo novo.
- Sem mudança de banco, schema Prisma ou migrations.
- Sem pacote novo.
- Arquitetura obrigatória: `_product/tasks/ARCHITECTURE.md`.
- Política de packages: `_product/tasks/PACKAGES.md`.
- Protótipos locais: `_product/tasks/PROTO-INVENTORY.md` e `_product/proto/admin`.

## Escopo frontend

- Admin dashboard de psicólogos, pacientes e comunidades.
- Detalhe administrativo de psicólogo: Estatísticas, Publicações, Denúncias e Atividades.
- Detalhe administrativo de comunidade: Conteúdo, Estatísticas, Denúncias e Atividades.
- Detalhe administrativo de paciente: Atividades.

## Escopo backend

- Nenhuma alteração backend nesta task.

## Fora do escopo

- Alterar endpoints, DTOs, query keys ou semântica de agregação.
- Adicionar filtros novos em telas que hoje usam apenas intervalo de datas/atalhos rápidos sem select de período.
- Recriar componentes de formulário ou design system.

## Contrato técnico detalhado

Frontend esperado:

- Opções de período preset continuam como `Hoje`, `Esta semana`, `Este mês`, `Este ano`, `Todo o período` ou janelas reais (`Últimos 30/90/180 dias`) quando aplicável.
- `custom` permanece apenas como valor interno de estado/query quando datas manuais forem preenchidas.
- Quando `custom` estiver selecionado por data manual, inserir `<option disabled hidden value="custom">Personalizado</option>` apenas para exibir o valor atual sem aparecer como opção aberta do dropdown.
- Filtros de atividades que antes só mostravam datas após escolher `Personalizado` passam a deixar `De`/`Até` visíveis; digitar neles muda o estado para `custom`.

Packages usados:

- Nenhum pacote novo.

Regras de UI obrigatórias:

- Mobile-first preservado com grids empilhados por padrão e breakpoints progressivos.
- Nenhum `<img>` adicionado.
- Cores/classes existentes por tokens do Admin preservadas.

## Critérios de aceite

- [x] Nenhum select de período do Admin contém `Personalizado` como opção selecionável manualmente.
- [x] O valor `Personalizado` aparece somente como opção `disabled hidden` quando o usuário digita data nos campos `De`/`Até`.
- [x] Filtros com select de período iniciam em `Todo o período` por padrão.
- [x] Filtros de atividades de psicólogo, paciente e comunidade permitem digitar datas sem selecionar `Personalizado` no dropdown.
- [x] UI mobile-first preservada; nenhum `<img>` cru foi adicionado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [x] Não houve criação de formulário de produto com submit; os campos simples de filtro preservam composição local existente.
- [x] Builder/Quick Copy não estava callable; imagem local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Publicações.png` foi usada como referência.
- [x] `pnpm --dir admin check` executado sem erros.
- [x] ADR criado em `adrs/0295-admin-filtros-periodo-sem-personalizado-visivel.md`.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir admin check` — OK.
- `pnpm --dir admin build` — OK.
- Scan estático — OK: nenhuma opção `Personalizado` visível e nenhum default antigo nos selects de período mapeados.
- Chrome headless local abriu `http://localhost:3002/psicologos`, mas sem sessão administrativa exibiu login; a validação autenticada ficou limitada ao código, build e referência local.

## Notas de execução

Esta task é uma correção transversal de UX no Admin e não altera API, persistência ou regras de domínio. O estado `custom` continua necessário para consultas reais com intervalo manual.


## Ajuste complementar 2026-07-25 - Labels de período sem prefixo nos blocos analíticos

- Pedido do usuário: em todos os blocos de gráficos e análises do painel Admin, quando o texto estiver no formato **Período: Todo o período · 28 de jun. a 24 de jul.**, manter somente **Todo o período · 28 de jun. a 24 de jul.**.
- Os formatadores dos dashboards administrativos de **Psicólogos**, **Pacientes** e **Comunidades** passaram a renderizar somente o label do preset e o intervalo de datas, sem o prefixo **Período:**.
- O bloco **Origem do tráfego** em `/psicologos`, que possuía o prefixo hardcoded, foi alinhado ao mesmo padrão.
- Financeiro e Moderação já estavam no padrão sem prefixo e não precisaram de alteração.
- Não houve mudança de backend, contratos HTTP, query keys, Prisma schema/migrations, packages, formulários ou dados persistidos.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a alteração textual usou o inventário local `_product/tasks/PROTO-INVENTORY.md` e os padrões Admin já registrados em `_product/proto/admin` como referência auditável.

### Critérios de aceite deste ajuste

- [x] Os blocos analíticos de `/psicologos` não exibem mais o prefixo **Período:**.
- [x] Os blocos analíticos de `/pacientes` não exibem mais o prefixo **Período:**.
- [x] Os blocos analíticos de `/comunidades` não exibem mais o prefixo **Período:**.
- [x] O scan estático de `admin/src` não encontra ocorrências de **Período:**.
- [x] Nenhum mock, dado artificial, endpoint simulado, package novo ou alteração de banco foi usado.
- [x] ADR criado em `adrs/0315-admin-labels-periodo-sem-prefixo.md`.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/pacientes/client.tsx" "src/app/(admin)/comunidades/client.tsx"` - OK.
- `rg -n "Período:|PerÃ­odo:" admin/src` - OK, sem ocorrências.
- `pnpm --dir admin check` - OK na reexecução isolada.
- Smoke HTTP local no Admin: `GET http://localhost:3002/psicologos`, `GET http://localhost:3002/pacientes` e `GET http://localhost:3002/comunidades` retornaram 200.
- `pnpm --dir admin build` foi tentado, mas o workspace atual está bloqueado por uma alteração não relacionada em `admin/src/api/req/patients/index.ts`/`admin/src/app/(admin)/pacientes/[id]/client.tsx`: o tipo passou a exigir `operating_systems` nos itens de device usage do detalhe de paciente.

## Ajuste complementar 2026-07-25 - Presets relativos de 7/30/90 dias

- Pedido do usuário: em todos os filtros de período do painel Admin que exibem `Esta semana` e `Este mês`, adicionar `Últimos 7 dias`, `Últimos 30 dias` e `Últimos 90 dias`.
- Frontend Admin passou a renderizar os três presets nos selects de dashboards, detalhes, notificações, financeiro e moderação que seguem o padrão de período.
- Backend Admin passou a aceitar `7d`, `30d` e `90d` nos DTOs/resolvers afetados, sempre como janela móvel inclusiva encerrada em hoje.
- `custom` segue como estado interno/`disabled hidden` apenas para datas digitadas manualmente.
- Listas financeiras aceitam os novos valores em URL para preservar navegação a partir do dashboard.
- Sem package novo, mock, endpoint simulado, schema Prisma ou migration.
- Builder/Quick Copy não está callable; validação visual usou `_product/tasks/PROTO-INVENTORY.md`, protótipos locais e browser/HTTP local.

### Critérios de aceite deste ajuste

- [x] Todos os selects Admin com `Esta semana`/`Este mês` também exibem `Últimos 7 dias`, `Últimos 30 dias`, `Últimos 90 dias`.
- [x] Backend responde aos presets `7d`, `30d`, `90d` nos contratos Admin afetados.
- [x] Janelas relativas são inclusivas e encerram no dia atual.
- [x] `custom` permanece apenas como estado interno/`disabled hidden` quando há datas manuais.
- [x] UI mobile-first preservada; nenhum `<img>` cru, mock, package novo ou migration foi adicionado.
- [x] ADR criado em `adrs/0320-admin-presets-relativos-periodo.md`.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write ...` - OK.
- `pnpm --dir backend exec biome check --write ...` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir backend check` - OK.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- Smoke HTTP local no Admin: `/psicologos`, `/pacientes`, `/comunidades`, `/financeiro`, `/notificacoes`, `/moderacao` retornaram 200 em `http://localhost:3002`.
- Chrome headless local abriu `http://localhost:3002/psicologos` com DOM carregado.

## Ajuste complementar 2026-07-25 - Ordem dos presets de período

- Pedido do usuário: em todos os filtros de período do painel Admin, ordenar as opções como `Hoje`, `Esta semana`, `Este mês`, `Este ano`, `Últimos 7 dias`, `Últimos 30 dias`, `Últimos 90 dias`, `Todo o período`.
- Os filtros padrão de dashboards, detalhes, financeiro, notificações, moderação e estatísticas de comunidade foram alinhados na mesma ordem visual.
- Filtros especializados que já exibiam `Últimos 180 dias` mantiveram esse recorte após `Últimos 90 dias` e antes de `Todo o período`, para não remover uma janela existente.
- `custom` continua apenas como estado interno/`disabled hidden` quando há datas manuais.
- Não houve mudança de backend, contratos HTTP, query keys, Prisma schema/migrations, packages, formulários ou dados persistidos.
- Builder/Quick Copy não está callable neste ambiente; a conferência visual usou o inventário local e o browser local com o Admin em `localhost:3002`.

### Critérios de aceite deste ajuste

- [x] Filtros padrão de período do Admin seguem a ordem solicitada.
- [x] Filtros especializados com `Últimos 180 dias` preservam esse recorte após `Últimos 90 dias` e antes de `Todo o período`.
- [x] `custom` permanece oculto como estado interno para intervalo manual.
- [x] UI mobile-first preservada; nenhum `<img>` cru, mock, package novo ou migration foi adicionado.
- [x] ADR criado em `adrs/0321-ordem-presets-periodo-admin.md`.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write ...` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm --dir backend check` - OK após isolar alterações paralelas não relacionadas.
- `pnpm check` - tentado, mas não concluiu de forma limpa no workspace porque alterações paralelas não relacionadas da TASK-84 reapareceram em arquivos backend de tração do dashboard de psicólogos; não houve falha atribuída a este ajuste.
- Smoke HTTP local no Admin: `/psicologos`, `/pacientes`, `/comunidades`, `/financeiro`, `/notificacoes` e `/moderacao` retornaram 200 em `http://localhost:3002`.
- Chrome headless local abriu `http://localhost:3002/psicologos` e gerou screenshot; sem sessão administrativa, a página exibiu redirecionamento para login.

