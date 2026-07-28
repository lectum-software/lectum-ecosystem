# TASK-60: Dashboard administrativo de pacientes

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-60 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin |
| Status | Completed |
| Dependências | TASK-45, TASK-46 |
| ADR alvo | ADR se houver decisão nova sobre exposição de dados de pacientes ou cálculo de atividade |

## Contexto

A seção **Pacientes** do painel Admin deve ser mais simples que Psicólogos. A referência visual é `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`.

Decisões de produto definidas:

- Não implementar status **Bloqueado** ou **Silenciado** nesta V1.
- Não implementar **taxa de retenção** nesta V1.
- Não criar ações administrativas de bloqueio, silenciamento, moderação ou exclusão de paciente.
- Usar apenas dados reais existentes; não preencher cards, gráficos ou listas com dados fake.

## Objetivo

Implementar o dashboard administrativo de pacientes com visão geral de crescimento, status básico de conta, novos cadastros, lista resumida e estatísticas simples.

## Pré-requisitos e bloqueios

- TASK-45 concluída: autenticação Admin real.
- TASK-46 concluída: app `admin/` e shell lateral.
- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md`, `_product/tasks/PACKAGES.md` e `_product/tasks/PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` como referência visual local.
- Se Builder/Quick Copy estiver disponível, usar como complemento; se não, registrar a limitação e usar a imagem local.

## Escopo frontend

- Criar rota protegida:
  - `/patients` ou rota equivalente definida no app Admin.
- Renderizar:
  - título e subtítulo;
  - filtro de período;
  - exportação somente se houver endpoint real;
  - cards:
    - total de pacientes;
    - pacientes ativos;
    - pacientes inativos;
    - novos cadastros;
  - gráfico temporal sem linha/card de retenção;
  - lista resumida de pacientes com acesso ao detalhe;
  - estatísticas por gênero, localização agregada e forma de cadastro.
- Não renderizar status "Bloqueado" ou "Silenciado".
- Não renderizar taxa de retenção.
- Ações por linha:
  - abrir detalhe;
  - menu adicional somente com ações reais e seguras já implementadas; caso contrário, omitir.

## Escopo backend

- Criar endpoint admin privado:
  - `GET /api/admin/private/patients/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Agregar dados reais de:
  - `user.role="paciente"`;
  - `user.active`;
  - `user.provider`;
  - `patient_profile.gender`;
  - `patient_profile.createdAt` e `user.createdAt`;
  - `community_member`;
  - `community_post`;
  - `post_reply`;
  - `post_vote`;
  - `post_save`/`post_reply_save`, se necessário para atividade recente;
  - `visitor_location` apenas para localização agregada/coarse quando houver fonte real.
- Definição V1:
  - **total de pacientes**: usuários não deletados com `role="paciente"`;
  - **pacientes ativos**: contas com `user.active=true`;
  - **pacientes inativos**: contas com `user.active=false`;
  - **novos cadastros**: pacientes criados dentro do período.
- Se o produto quiser "ativo por uso recente" em vez de `user.active`, criar ADR e ajustar copy para não confundir status de conta com engajamento.

## Fora do escopo

- Status bloqueado/silenciado.
- Ações de bloquear, silenciar, banir, excluir ou moderar paciente.
- Taxa de retenção.
- Definir cohort retention.
- Exibir localização precisa.
- Criar tracking novo apenas para preencher gráfico.
- Criar dados fake, seeds permanentes ou endpoints simulados.

## Contrato técnico detalhado

Backend esperado:

- Módulo admin privado seguindo o padrão de controller/service/repository/validator existente.
- Período:
  - default: últimos 7 dias;
  - aceitar `from` e `to`;
  - validar limites para evitar consultas excessivas.
- Resposta sugerida:
  - `summary`;
  - `series`;
  - `recentPatients`;
  - `demographics`;
  - `locations`;
  - `signupSources`;
  - `coverageNotes` para métricas omitidas por falta de fonte.
- Localização:
  - usar somente cidade/UF/país agregados quando existir em `visitor_location`;
  - não exibir coordenada, IP, endereço ou localização exata.
- Exportação:
  - só criar/habilitar se houver endpoint real, por exemplo `GET /api/admin/private/patients/dashboard/export`.

Frontend esperado:

- Reutilizar shell Admin da TASK-46.
- Reutilizar componentes/tokens existentes; não criar design system paralelo.
- Mobile-first:
  - cards empilhados em mobile;
  - tabela convertida para lista/card em mobile se necessário;
  - layout expandido em desktop seguindo a referência visual.
- Gráficos:
  - usar implementação existente ou CSS/SVG controlado sem instalar pacote novo, salvo validação em `PACKAGES.md` e ADR.
- Campos/filtros:
  - usar React Hook Form, Zod e controllers da TASK-02 quando houver formulário.
- Imagens/avatar:
  - usar `Image` de `next/image`, nunca `<img>`.

## Critérios de aceite

- [x] Rota de Pacientes só abre para admin autenticado.
- [x] Dashboard usa somente dados reais de pacientes.
- [x] Cards exibidos: total, ativos, inativos e novos cadastros.
- [x] Card/linha/gráfico de retenção não existe nesta V1.
- [x] Status bloqueado/silenciado não aparece.
- [x] Lista resumida abre o detalhe do paciente.
- [x] Localização é agregada e só aparece quando houver fonte real.
- [x] Métricas sem fonte real aparecem como indisponíveis ou são omitidas com copy honesta.
- [x] Exportação só aparece/habilita com endpoint real.
- [x] UI mobile-first validada.
- [x] Nenhum `<img>` cru foi usado.
- [x] `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` foi citada como referência visual.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Checks/builds relevantes executados sem erros.
- [x] ADR criado/atualizado se houver decisão sobre dados sensíveis, localização ou cálculo de atividade.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real e pacientes reais.

## Execução

- Implementado backend real `GET /api/admin/private/patients/dashboard` com autenticação admin, validação de período (máximo de 90 dias) e agregações somente a partir de `user`, `patient_profile`, `visitor_location` e eventos reais de comunidade.
- Implementada rota protegida `/pacientes` no app `admin/` com cards de total, ativos, inativos e novos cadastros, gráfico temporal sem retenção, lista resumida com link para detalhe, estatísticas por gênero, localização agregada e forma de cadastro.
- Criada rota reservada `/pacientes/[id]` como placeholder protegido e honesto para a TASK-61, sem dados fake de detalhe.
- Exportação não foi exibida/habilitada porque o backend retorna `export.available=false` e não existe endpoint real de exportação no escopo.
- Status bloqueado/silenciado, ações destrutivas e taxa de retenção permaneceram fora da V1 conforme decisão de produto.
- Builder/Quick Copy não estava disponível neste ambiente; a referência visual usada foi `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`.
- Não houve alteração em `backend/prisma/schema.prisma` nem em migrations; por isso `pnpm --dir backend db:migrate` não foi executado.

## Validações executadas

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `buildPatientsDashboard({})` em banco local retornou dados reais: `total_patients=8`, `active_patients=8`, `inactive_patients=0`, `new_signups=8`, `recent=5`, `export.available=false`.
- `buildPatientsDashboard({ from: "2026-01-01", to: "2026-04-30" })` retornou `status=400` por exceder o limite de 90 dias.
- Backend local recém-iniciado em `http://localhost:3101` respondeu `401` para `GET /api/admin/private/patients/dashboard` sem token admin.
- Rota local `http://localhost:3002/pacientes` respondeu `200` no servidor Admin local.

## ADR

- ADR-0240: Dashboard Admin de pacientes com dados agregados e sem retenção V1.

## Ajuste complementar 2026-07-14 - Tempo m�dio do paciente

- Pedido do usu�rio: al�m do tempo m�dio dos psic�logos, medir tamb�m o tempo m�dio de uso dos pacientes.
- O dashboard Admin de Pacientes passou a retornar e exibir `platform_usage.average_duration_seconds`, calculado somente a partir de `page_view_event` autenticado de usu�rios `role="paciente"` no per�odo selecionado.
- A m�trica usa a mesma regra de confiabilidade aplicada ao uso de psic�logos: s� exibe m�dia quando pelo menos 50% dos pageviews de pacientes possuem `duration_seconds` positivo; caso contr�rio, mostra indisponibilidade honesta.
- A coleta de dura��o foi ajustada no tracker global da TASK-49 para pausar quando o navegador fica oculto/minimizado e retomar ao voltar, sem contar tempo em background quando o browser informa visibilidade.
- N�o foram criados mocks, backfill artificial, endpoints paralelos, schema Prisma, migrations ou packages novos.
- Refer�ncia visual: `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`; n�o h� prot�tipo espec�fico para este novo card e Builder/Quick Copy n�o est� exposto como ferramenta direta neste ambiente.

### Valida��o complementar executada

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Servi�o local `buildPatientsDashboard({})` retornou `platform_usage` real com `average_duration_seconds=null`, `duration_unavailable_reason="Sem pageviews autenticados de pacientes no per�odo."`, `pageviews_count=0` e `sessions_count=0` na base local, sem criar dados artificiais.
- `GET /api/admin/private/patients/dashboard` sem sess�o Admin retornou `401`.
- `GET http://localhost:3002/pacientes` retornou `200` no servidor Admin local.

## Ajuste complementar 2026-07-18 - Layout piloto premium em Pacientes

- Pedido do usu�rio: aplicar o layout piloto premium nas p�ginas de pacientes do Admin.
- O dashboard `/pacientes` passou a entrar no escopo visual `admin-premium-pilot`, compartilhando a sidebar clara, tokens azuis Lectum, cards com borda sutil e tipografia mais leve do piloto j� usado em Psic�logos/Comunidades.
- A �rea principal foi reorganizada em um card **Vis�o Geral**, reunindo contadores e gr�fico temporal com curvas SVG suaves, strokes/markers mais finos e plot com superf�cie limpa.
- A tabela desktop da lista resumida deixou de depender de largura m�nima fixa e mant�m cards mobile, evitando scrollbar horizontal na leitura de desktop.
- N�o houve altera��o de backend, endpoint, contrato, query, schema Prisma, migration, package, seed, mock, dados sens�veis ou regras de exporta��o/reten��o.
- Builder/Quick Copy n�o est� exposto como ferramenta callable no ambiente; a refer�ncia audit�vel continua sendo `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e o ADR do piloto visual foi atualizado em `adrs/0263-admin-psicologos-piloto-premium.md`.

### Valida��o complementar executada

- `pnpm --dir admin exec biome check --write "src/components/admin-shell/shell.tsx" "src/app/(admin)/pacientes/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou `200`.

## Ajuste pos-feedback 2026-07-18 - Seletor de periodo no header

- Pedido do usuario: remover os atalhos visuais de 7, 30 e 90 dias do header e usar um seletor de periodo como no dashboard de Psicologos.
- O header de `/pacientes` passou a exibir o seletor **Periodo** com presets reais suportados pelo contrato atual: **Hoje**, **Esta semana** e **Este mes**.
- A edicao manual dos campos `De`/`Ate` continua gerando periodo **Personalizado** via `useDateRangeCommitOnBlur`, sem mock e sem mudar endpoint.
- A linha solta **Periodo consultado:** abaixo do header foi removida; o periodo retornado pelo backend permanece dentro do bloco **Visao Geral**.
- As opcoes **Este ano** e **Todo o periodo** nao foram adicionadas porque o endpoint de Pacientes V1 valida `from`/`to` com limite maximo de 90 dias.
- Nao houve alteracao de backend, contrato HTTP, schema Prisma, migration, package, seed ou dado fake.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou `200`.

## Ajuste pos-feedback 2026-07-18 - Opcoes completas no seletor de periodo

- Pedido do usuario: adicionar as opcoes do seletor de **Periodo** conforme o padrao das demais paginas do painel Admin.
- O dashboard `/pacientes` agora oferece **Hoje**, **Esta semana**, **Este mes**, **Este ano**, **Todo o periodo** e **Personalizado**.
- Para nao expor opcoes falsas, o endpoint `GET /api/admin/private/patients/dashboard` passou a aceitar `period=today|week|month|year|all|custom` e a resolver os presets no backend.
- O limite de periodo de Pacientes foi alinhado ao dashboard de Psicologos (`max_days=3660`) para suportar **Este ano** e **Todo o periodo** com dados reais.
- Em **Todo o periodo**, o dashboard usa o menor `user.createdAt` entre pacientes reais carregados; sem pacientes, preserva fallback honesto dos ultimos 7 dias.
- Nao houve schema Prisma, migration, package novo, seed, mock ou backfill artificial.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts" "src/modules/api/admin/private/patients/dashboard/validator/index.ts" "src/modules/api/admin/private/patients/detail/validator/index.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Servi�o local: `buildPatientsDashboard({ period: "year" })` retornou `200 Este ano 3660`.
- Servi�o local: `buildPatientsDashboard({ period: "all" })` retornou `200 Todo o per�odo`.

## Ajuste pos-feedback 2026-07-18 - Contadores e grafico alinhados a Psicologos

- Pedido do usuario: remover o contador **Tempo medio do paciente** do bloco de grafico e padronizar contadores + grafico conforme o dashboard de Psicologos.
- O bloco **Visao Geral** de `/pacientes` agora exibe somente os quatro contadores agregaveis no grafico: **Total de pacientes**, **Pacientes ativos**, **Pacientes inativos** e **Novos cadastros**.
- Os contadores foram convertidos para botoes acessiveis com `aria-pressed`, estados ativo/inativo e alternancia das series visiveis, mantendo pelo menos uma serie ativa como em Psicologos.
- O grafico temporal passou a usar o mesmo padrao visual de Psicologos: largura/padding compartilhados, legenda removida, series controladas pelos cards e sem resumo textual expansivel dentro do bloco.
- O dado real de `platform_usage` permanece no payload e nas notas de cobertura quando aplicavel, mas nao e mais exibido como contador dentro da Visao Geral.
- Nao houve alteracao de backend, contrato HTTP, schema Prisma, migration, package novo, seed, mock ou backfill artificial.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou `200`.
- Browser local em `http://localhost:3002/pacientes` inspecionado visualmente com sessao Admin existente: o bloco Visao Geral nao exibe mais o card de tempo medio e o grafico aparece logo abaixo dos contadores.

## Ajuste pos-feedback 2026-07-19 - Forma de cadastro normalizada

- Pedido do usuario: o grafico **Forma de cadastro** deve comparar somente **E-mail e senha** e **Google**.
- O backend do dashboard `/pacientes` passou a normalizar `user.provider`: `google` aparece como **Google** e qualquer outro valor real de provider e agrupado como **E-mail e senha**, evitando exibir valores operacionais/legados como categoria de produto.
- A lista/detalhe de paciente continua preservando o `provider` bruto no contrato para auditoria, mas o label exibido ao Admin foi alinhado para **E-mail e senha** ou **Google**.
- Nao houve alteracao de schema Prisma, migration, package, seed, mock, endpoint novo ou backfill artificial.

### Validacao complementar executada

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Servico local `buildPatientsDashboard({ period: "all" })` retornou `signup_sources` com **E-mail e senha** (151, 100%) e **Google** (0, 0%), sem `admin_preview` como categoria.
- Servico local `showAdminPatient(...)` retornou `provider="admin_preview"` preservado e `provider_label="E-mail e senha"`.
- Browser local headless em `http://localhost:3002/pacientes` com sessao Admin real confirmou **Forma de cadastro**, **E-mail e senha**, **Google** e ausencia de `admin_preview` no texto da tela.


## Ajuste pos-feedback 2026-07-19 - Remocao da lista e da cobertura no dashboard

- Pedido do usuario: remover do dashboard `/pacientes` a **Lista de pacientes** e o bloco **Cobertura dos dados**.
- A rota `/pacientes` agora renderiza apenas o header, o bloco **Visao Geral** com contadores/grafico e as **Estatisticas simples** por genero, localizacao agregada e forma de cadastro.
- A lista resumida deixou de ser renderizada no dashboard em mobile e desktop; a ancora `#lista-de-pacientes` tambem foi removida do menu lateral para evitar navegacao para uma secao inexistente.
- O submenu de Pacientes foi simplificado para item direto no menu Admin, ja que nao ha rota real `/pacientes/lista` com paginacao/filtros dedicados.
- O bloco de cobertura deixou de aparecer na UI por decisao de produto. O contrato backend nao foi alterado nesta iteracao; `coverage_notes`, `unavailable`, `export` e `recent_patients` permanecem no payload existente para evitar mudanca de contrato fora do escopo.
- Nao houve schema Prisma, migration, package novo, endpoint novo, seed, mock ou backfill artificial.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia auditavel continua sendo `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`, complementada pelos screenshots enviados pelo usuario em 2026-07-18.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx" "src/components/admin-shell/nav.ts"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check` foi tentado na validacao final, mas falhou em alteracoes fora do escopo ja presentes/concorrentes em `backend/src/modules/api/admin/private/communities/dashboard/use-cases/services.ts` (organizeImports/formatacao Biome de Comunidades). Nao alterei esse trabalho externo.
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou `200`.
- Browser local headless em `http://localhost:3002/pacientes` carregou o fluxo protegido/login sem sessao Admin compartilhada; a ausencia dos blocos removidos foi validada no codigo fonte porque a sessao autenticada do navegador do usuario nao e acessivel por esta execucao.

## Ajuste pos-feedback 2026-07-19 - Uso da plataforma e graficos em pizza

- Pedido do usuario: replicar no dashboard `/pacientes` o bloco **Uso da plataforma** existente em Psicologos e alinhar os graficos **Genero** e **Forma de cadastro** ao layout do grafico **Modo de cadastro** dos psicologos.
- O endpoint `GET /api/admin/private/patients/dashboard` passou a expandir `platform_usage` com usuarios pacientes ativos por uso no periodo, taxa ativa, instalacoes PWA por paciente, dias/sessoes medias, tempo medio confiavel, serie diaria e paginas mais acessadas.
- As metricas usam somente `page_view_event` autenticado de usuarios `role="paciente"` e `important_action_event.action_type="pwa_installed"` reais; nao houve mock, seed, backfill artificial, endpoint paralelo, schema Prisma, migration ou package novo.
- A UI `/pacientes` agora renderiza o card **Uso da plataforma** com o mesmo conjunto de contadores e lista de paginas mais acessadas do bloco de Psicologos, usando estados honestos de indisponibilidade quando nao ha pageviews autenticados.
- Os cards **Genero** e **Forma de cadastro** deixaram o donut com total central e passaram para pizza com rotulos percentuais nas fatias e legenda em cards laterais, seguindo o layout visual de **Modo de cadastro** em `/psicologos`.
- **Forma de cadastro** preserva apenas as duas categorias de produto ja normalizadas: **E-mail e senha** e **Google**; **Genero** preserva os dados reais de `patient_profile.gender`.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia auditavel continua sendo `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`, complementada pelos screenshots enviados pelo usuario em 2026-07-18/2026-07-19.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/dashboard/repositories/AdminPatientsDashboardRepository.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build` foi executado com sucesso apos uma primeira tentativa retornar `Another next build process is already running`.
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou `200`.
- Smoke HTTP local: `GET http://localhost:3001/api/admin/private/patients/dashboard` sem token Admin retornou `401`.
- Smoke de servico local `buildPatientsDashboard({ period: "all" })` foi tentado, mas o banco de desenvolvimento recusou nova sessao com `EMAXCONNSESSION max clients reached in session mode`; nao foi resetado nem feita acao destrutiva.
- `pnpm check` foi executado na validacao final e falhou em alteracao fora do escopo desta execucao: `admin/src/app/(admin)/pacientes/lista/client.tsx` (arquivo de lista de pacientes nao pertencente a este ajuste) com regra `react-hooks/set-state-in-effect`; nao alterei esse trabalho paralelo.

## Ajuste pos-feedback 2026-07-19 - Submenu com Lista de pacientes real

- Pedido do usuario: no submenu de **Pacientes**, adicionar a opcao **Lista de pacientes**.
- O menu lateral Admin voltou a tratar **Pacientes** como grupo expansivel com **Visao geral** (`/pacientes`) e **Lista de pacientes** (`/pacientes/lista`).
- Para evitar rota quebrada ou ancora removida, foi criada a rota real `/pacientes/lista` e o endpoint real `GET /api/admin/private/patients`, protegido por autenticacao Admin.
- A listagem usa somente dados reais de `user`, `patient_profile` e `visitor_location`, com paginacao, busca simples, status ativo/inativo, forma de cadastro normalizada e link para o detalhe existente do paciente.
- Nao houve mock, seed, schema Prisma, migration, package novo, acao destrutiva, bloqueio/silenciamento ou dado clinico.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia auditavel segue `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e o screenshot enviado pelo usuario.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/main/server/imports/write.ts" "src/modules/api/admin/private/patients/list/DTOs/IAdminPatientsListDTO.ts" "src/modules/api/admin/private/patients/list/repositories/AdminPatientsListRepository.ts" "src/modules/api/admin/private/patients/list/validator/index.ts" "src/modules/api/admin/private/patients/list/use-cases/controller.ts" "src/modules/api/admin/private/patients/list/use-cases/services.ts" "src/modules/api/admin/private/patients/list/index.ts"`
- `pnpm --dir admin exec biome check --write "src/api/cache/keys.ts" "src/api/req/patients/list.ts" "src/api/callers/patients/list.ts" "src/app/(admin)/pacientes/lista/page.tsx" "src/app/(admin)/pacientes/lista/client.tsx" "src/components/admin-shell/nav.ts"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Servico local `listAdminPatients({ limit: 1 })` retornou `status=200`, `count=151`, `items=1` e `source="user+patient_profile+visitor_location"`.
- Smoke HTTP local: `GET http://localhost:3002/pacientes/lista` retornou `200`.
- Smoke HTTP local: `GET http://localhost:3001/api/admin/private/patients?limit=1` sem token Admin retornou `401`.

## Ajuste pos-feedback 2026-07-19 - Mapa e ranking de localiza��o de pacientes

- Pedido do usu�rio: evoluir o card **Localiza��o** com um mapa e listagens de cidades e estados mais acessados.
- O endpoint `GET /api/admin/private/patients/dashboard` passou a calcular `locations` com capturas reais de `visitor_location` vinculadas a pacientes dentro do per�odo selecionado, em vez de usar apenas a �ltima localiza��o por paciente sem recorte temporal.
- A UI `/pacientes` agora renderiza um mapa SVG simplificado de UFs brasileiras, sem package novo e sem usar imagem do prot�tipo como gr�fico final.
- O card tamb�m exibe rankings **Top estados** e **Top cidades**, usando apenas agregados reais. Cidades com frequ�ncia menor que 2 capturas s�o agrupadas em **Outras cidades** para reduzir exposi��o em dado sens�vel de sa�de.
- Locais fora do Brasil continuam aparecendo nas listagens; o mapa informa quando n�o h� UF brasileira identificada.
- N�o houve schema Prisma, migration, package novo, seed, mock, backfill artificial ou endpoint paralelo.
- Builder/Quick Copy n�o est� exposto como ferramenta callable neste ambiente; a refer�ncia audit�vel continua sendo `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`, complementada pelos screenshots enviados pelo usu�rio em 2026-07-18/2026-07-19.

### Valida��o complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/repositories/AdminPatientsDashboardRepository.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Servi�o local `buildPatientsDashboard({ period: "all" })` retornou `status=200`, `locations.total=0`, `states=[]` e `cities=[]` na base local atual, sem criar dados artificiais.
- Smoke HTTP local `GET http://localhost:3002/pacientes` retornou `200`.
- Browser local headless em `http://localhost:3002/pacientes` carregou o fluxo protegido e exibiu redirecionamento para login por aus�ncia de sess�o Admin compartilhada; a valida��o visual autenticada ficou limitada ao build/c�digo porque n�o usei nem criei credencial Admin artificial.

## Ajuste pos-feedback 2026-07-19 - Preview local de localizacao com dados de exemplo

- Pedido do usuario: como a base local ainda nao possui `visitor_location` de pacientes para preencher o card **Localizacao**, exibir numeros de exemplo apenas para visualizacao do layout.
- A UI `/pacientes` agora ativa um preview somente quando `window.location.hostname` e `localhost`, `127.0.0.1` ou `::1` e o total real de `summary.locations` e `0`.
- O preview e renderizado apenas no cliente Admin local, com badge **exemplo local** e aviso explicito de que os dados nao representam pacientes reais.
- O backend, contrato HTTP, schema Prisma, migrations, seeds, queries reais, fontes de dados e ambiente de producao nao foram alterados. Quando houver localizacao real, o preview deixa de aparecer e o card usa `visitor_location` real.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia visual usada permanece `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`, complementada pelos screenshots enviados pelo usuario.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou `200`.

## Ajuste pós-feedback 2026-07-19 - Devices dos pacientes e seção sem título

- Pedido do usuário: remover o título visual **Estatísticas simples** do dashboard `/pacientes` e adicionar gráfico de uso de devices como no dashboard de Psicólogos.
- A UI de `/pacientes` deixou de renderizar o `<h2>` **Estatísticas simples**; a seção permanece acessível por `aria-label="Estatísticas agregadas de pacientes"` e continua exibindo Gênero, Localização e Forma de cadastro.
- O endpoint `GET /api/admin/private/patients/dashboard` passou a retornar `device_usage`, agregado exclusivamente de `visitor_session` real vinculada a usuários `role="paciente"`, sem mock, seed, backfill ou endpoint paralelo.
- O gráfico **Devices dos pacientes** reutiliza o padrão visual do card **Devices dos psicólogos**: pizza SVG, legenda por Desktop/Mobile/Tablet/Não identificado, percentual por sessões e contagem complementar de pacientes únicos por device.
- O card de devices foi posicionado junto de **Uso da plataforma** em grid mobile-first: empilhado no mobile e em duas colunas no desktop.
- Não houve alteração de schema Prisma, migration, package novo, dado fake ou fonte externa. Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências usadas foram `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`, `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e os screenshots enviados pelo usuário em 2026-07-19.

### Validação complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/dashboard/repositories/AdminPatientsDashboardRepository.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Serviço local `buildPatientsDashboard({ period: "all" })` retornou `status=200`, `device_usage.total_sessions=0`, `total_active_patients=0` e `unavailable_reason="Sem sessões autenticadas de pacientes no período selecionado."` na base local, sem criar dados artificiais.
- `GET http://localhost:3001/api/admin/private/patients/dashboard?period=week` sem token Admin retornou `401`.
- Smoke HTTP local `GET http://localhost:3002/pacientes` retornou `200`.
- Browser local headless em `http://localhost:3002/pacientes` foi executado com perfil isolado; por não ter sessão Admin real nesse perfil, a validação visual autenticada redirecionou para `/login`. A validação visual autenticada ficou limitada aos screenshots enviados pelo usuário e à inspeção do código/renderização compilada.

## Ajuste pós-feedback 2026-07-19 - Ordem dos blocos agregados

- Pedido do usuário: reorganizar o dashboard `/pacientes` para exibir a primeira linha como **Gênero**, **Devices** e **Forma de cadastro**, e a segunda linha como **Localização** e **Uso da plataforma**.
- A seção agregada agora renderiza um grid mobile-first: todos os cards empilham no mobile, passam para 3 colunas no desktop para **Gênero / Devices / Forma de cadastro** e para 2 colunas no desktop para **Localização / Uso da plataforma**.
- O ajuste é exclusivamente visual no Admin; não houve alteração de backend, contrato HTTP, schema Prisma, migration, package novo, endpoint novo, seed, mock ou dado artificial.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências usadas foram os screenshots enviados pelo usuário em 2026-07-19 e `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou `200`.

## Ajuste pos-feedback 2026-07-19 - Recorte temporal em genero, cadastro e localizacao

- Pedido do usuario: fazer os blocos **Genero**, **Forma de cadastro** e **Localizacao** responderem ao periodo selecionado no dashboard `/pacientes`.
- O backend `GET /api/admin/private/patients/dashboard` passou a calcular `demographics.gender` e `demographics.signup_sources` somente com pacientes cadastrados dentro do periodo resolvido (`user.createdAt` entre `period.from` e `period.to`).
- O card **Localizacao** permanece baseado em `visitor_location` real filtrada pelo periodo selecionado, preservando agregacao coarse e sem coordenadas, IP, endereco ou inferencia de localizacao precisa.
- Em **Todo o periodo**, os blocos voltam a considerar a base completa real, porque o proprio preset resolve o inicio pelo primeiro cadastro real de paciente.
- Quando nao houver cadastro no periodo, `demographics` retorna total `0` e a UI exibe estado vazio honesto; os dados de outros periodos nao sao reaproveitados.
- Nao houve schema Prisma, migration, package novo, seed, mock, endpoint paralelo ou alteracao de frontend. Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias usadas foram `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e o screenshot enviado pelo usuario em 2026-07-19.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts"`
- Servico local `buildPatientsDashboard({ period: "week" })` retornou `new_signups=52`, `demographics.gender.total=52`, `demographics.signup_sources.total=52` e `locations.total=0` no periodo `2026-07-13` a `2026-07-19`, sem criar dados artificiais.
- Servico local `buildPatientsDashboard({ period: "all" })` retornou `new_signups=151`, `demographics.gender.total=151` e `demographics.signup_sources.total=151`.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3001/api/admin/private/patients/dashboard?period=week` sem token Admin retornou `401`.
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou `200`.

## Ajuste pos-feedback 2026-07-19 - Periodo abaixo dos titulos dos blocos

- Pedido do usuario: exibir o periodo selecionado abaixo dos titulos dos blocos **Genero**, **Forma de cadastro** e **Localizacao** no dashboard `/pacientes`.
- A UI Admin agora reutiliza `formatSelectedPeriod(summary.period)` logo abaixo dos titulos desses tres blocos, alinhando a leitura visual ao padrao ja existente em **Devices dos pacientes** e **Uso da plataforma**.
- O ajuste e exclusivamente visual no cliente Admin; nao houve alteracao de backend, contrato HTTP, schema Prisma, migration, package novo, seed, mock ou dado artificial.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias usadas foram `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e o screenshot enviado pelo usuario em 2026-07-19.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou `200`.

## Ajuste pos-feedback 2026-07-19 - Localizacao no padrao visual do Wix

- Pedido do usuario: substituir o layout de mapa do card **Localizacao** por uma composicao mais parecida com a referencia do Wix, com mapa amplo, ranking lateral e barra de intensidade.
- A UI `/pacientes` trocou o cartograma em tiles por um painel estilo analytics: cabecalho interno, mapa grande a esquerda, ranking lateral com barras e legenda inferior de menor/maior volume.
- O mapa de **Estados** agora usa paths SVG locais de UFs brasileiras derivados de TopoJSON simplificado com licenca MIT, sem instalar package de mapa e sem carregar dado externo em runtime.
- Foi adicionado alternador **Estados / Paises** para cobrir tambem a leitura de paises mostrada na segunda referencia do Wix; a aba **Paises** agora usa uma malha SVG mundial real (world-atlas 110m/Natural Earth) com paises destacados por intensidade, enquanto o ranking continua exibindo todos os agregados reais recebidos.
- Rankings de **Top cidades**, **Paises** ou **Top estados** continuam usando `visitor_location` agregado, sem IP, coordenada, endereco, seed, mock ou endpoint novo.
- A implementacao permanece mobile-first: em telas estreitas o mapa e o ranking empilham; em desktop seguem a composicao lado a lado da referencia.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias usadas foram os screenshots do Wix enviados pelo usuario em 2026-07-19 e `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx" "src/lib/brazil-state-map.ts" "src/lib/world-country-map.ts"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou `200`.
- Preview visual isolado do mapa-mundi foi capturado com Chrome headless local e confirmou mapa continuo, com Brasil destacado sem formas soltas/desconfiguradas. A validacao autenticada completa no browser do Admin segue dependente da sessao local do usuario.

## Ajuste pos-feedback 2026-07-22 - Filtros no bloco Visao Geral

- Pedido do usuario: mover os filtros **Periodo**, **De** e **Ate** do header do dashboard `/pacientes` para o bloco **Visao Geral**.
- O header de `/pacientes` agora renderiza apenas a identificacao da secao, titulo e subtitulo, sem controles analiticos.
- Os filtros foram mantidos com o mesmo estado real e passaram para o topo do card **Visao Geral**, ao lado do titulo em desktop e empilhados de forma mobile-first em telas menores.
- A regra vigente de `Personalizado` permanece preservada: a opcao continua apenas como `disabled hidden` quando a digitacao nos campos de data ativa intervalo customizado.
- Nao houve alteracao de backend, contrato HTTP, schema Prisma, migration, package novo, endpoint, seed, mock ou dado artificial.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias usadas foram `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e o screenshot enviado pelo usuario em 2026-07-22.
- ADR atualizado: `adrs/0295-admin-filtros-periodo-sem-personalizado-visivel.md`.

### Criterios de aceite do ajuste

- [x] Header de `/pacientes` nao contem os filtros de periodo/data.
- [x] Card **Visao Geral** contem **Periodo**, **De** e **Ate** antes dos contadores e do grafico.
- [x] Layout mobile-first preservado, com filtros empilhados antes de expandirem para desktop.
- [x] Nenhum `<img>` cru, mock, seed, dado artificial, endpoint novo ou package novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou `200`.

## Ajuste pos-feedback 2026-07-23 - Analise agregada de intencao dos pacientes

- Pedido do usuario: no dashboard `/pacientes`, abaixo do bloco **Visao Geral**, adicionar uma analise de intencao mostrando o percentual de pacientes **Frios**, **Curiosos**, **Interessados** e **Qualificados**.
- O endpoint `GET /api/admin/private/patients/dashboard` passou a retornar `intent_analysis`, com distribuicao agregada e totais de sinais reais no periodo selecionado.
- Fontes usadas: `profile_view_event.viewer_id` com `source="profile_page"`, `psychologist_favorite.user_id` ainda ativo e `contact_request.user_id` com `channel="whatsapp"`; retornos ao mesmo perfil sao derivados de repeticao real de abertura por paciente/psicologo.
- Denominador: pacientes reais existentes ao final do periodo selecionado. Pacientes sem sinais no periodo entram como **Frios** para preservar leitura percentual da base total.
- Classificacao V1: **Frios** sem sinais; **Curiosos** com abertura de perfil/baixa intencao sem favorito ou WhatsApp; **Interessados** com favoritos ou retorno relevante ao perfil sem WhatsApp; **Qualificados** com clique no WhatsApp ou multiplos sinais fortes.
- A UI exibe o bloco imediatamente apos **Visao Geral**, com barra de distribuicao, totais de sinais e cards percentuais/contagens por categoria.
- A analise e exclusivamente interna do Admin: nao e exibida publicamente, nem para pacientes, nem para psicologos; a copy deixa claro que nao infere sessao, atendimento, diagnostico ou conteudo de conversa.
- Nao houve criacao de tracking novo, schema Prisma, migration, package, seed, mock, backfill artificial ou endpoint paralelo.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias usadas foram `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e os screenshots enviados pelo usuario em 2026-07-23.

### Criterios de aceite do ajuste

- [x] Bloco **Analise da intencao dos pacientes** aparece abaixo de **Visao Geral** no dashboard `/pacientes`.
- [x] O bloco mostra percentuais e contagens de **Frios**, **Curiosos**, **Interessados** e **Qualificados**.
- [x] O calculo usa apenas sinais reais ja persistidos de abertura de perfil, favoritos e clique no WhatsApp.
- [x] O filtro de periodo do dashboard altera a consulta usada pela analise.
- [x] A UI deixa claro que o indicador e agregado, interno do Admin e nao representa diagnostico, atendimento ou conversa.
- [x] Layout mobile-first validado em 390px sem overflow horizontal.
- [x] Nenhum mock, seed, dado artificial, migration, package novo ou tracking novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/dashboard/repositories/AdminPatientsDashboardRepository.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Servico local `buildPatientsDashboard({ period: "all" })` retornou `status=200`, `intent_analysis.total_patients=151`, `patients_with_signals=22`, categorias `cold`, `curious`, `objective`, `very_qualified` e `source="profile_view_event+psychologist_favorite+contact_request"`.
- API local autenticada `GET http://localhost:3001/api/admin/private/patients/dashboard?period=all` retornou `intent_analysis` com as quatro categorias.
- Browser local headless autenticado com Admin real temporario em `http://localhost:3102/pacientes` confirmou ordem abaixo de **Visao Geral**, exibicao das quatro categorias, nota de privacidade, totais de sinais e mobile 390px com `overflow=false`; screenshots salvos em `.tmp/patient-dashboard-intent-desktop.png` e `.tmp/patient-dashboard-intent-mobile.png`.
- Admins temporarios de validacao foram removidos do banco apos a verificacao.

### ADR

- ADR-0314: Distribuicao agregada de intencao dos pacientes no dashboard Admin.

## Ajuste pos-feedback 2026-07-23 - Simplificacao visual da analise de intencao

- Pedido do usuario: no bloco **Analise da intencao dos pacientes**, remover a tag de quantidade de pacientes com sinais reais, remover o texto de cobertura logo abaixo do periodo e remover a faixa final de privacidade.
- Pedido complementar do usuario: trocar o icone de **Frios** para um simbolo de frio e deixar o icone de **Qualificados** em vermelho.
- A UI do Admin foi ajustada sem mudar contrato HTTP, calculo, fontes reais, schema Prisma, migration, package, seed, mock ou tracking.
- O backend continua retornando `coverage_note`, `patients_with_signals` e `privacy_note` para preservar compatibilidade do contrato, mas esses textos nao sao mais renderizados neste bloco do dashboard.
- O segmento **Frios** agora usa icone `Snowflake`; **Qualificados** mantem `Flame` com tom visual `danger`.
- ADR-0314 permanece vigente; nao houve nova decisao arquitetural, apenas refinamento visual.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Browser local headless autenticado em `http://localhost:3002/pacientes` confirmou: textos removidos, icone `lucide-snowflake` em **Frios** e `text-danger` em **Qualificados**.
- Admin temporario de validacao foi removido do banco apos a verificacao.

## Ajuste pos-feedback 2026-07-23 - Renomeacao de Objetivos para Interessados

- Pedido do usuario: o termo **Objetivos** era dubio porque poderia sugerir decisao objetiva/rapida de clicar no WhatsApp, embora o segmento represente favoritos ou retornos a perfis sem contato.
- Decisao de produto: renomear o label exibido para **Interessados**, mantendo o id tecnico `objective` para preservar compatibilidade do contrato entre backend e Admin.
- A classificacao, fontes reais e pesos nao mudaram: o segmento continua representando pacientes que favoritaram psicologos ou retornaram a perfis, sem clique no WhatsApp.
- Nao houve alteracao de schema Prisma, migration, package, seed, mock, tracking ou endpoint novo.
- ADR-0314 atualizado para registrar a nomenclatura de produto.

### Criterios de aceite do ajuste

- [x] Dashboard `/pacientes` mostra **Interessados** no lugar de **Objetivos**.
- [x] Contrato tecnico mantem o id `objective` estavel.
- [x] Nenhum mock, seed, dado artificial, migration, package novo ou tracking novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Servico local `buildPatientsDashboard({ period: "all" })` retornou o segmento `objective` com `label="Interessados"`, `count=22` e `percentage=14.6` na base local atual, sem criar dados artificiais.
- Browser local headless autenticado em `http://localhost:3002/pacientes` confirmou o label **INTERESSADOS** e ausencia de **OBJETIVOS**.
- Admin temporario de validacao foi removido do banco apos a verificacao.

### ADR

- ADR-0314 atualizado: label de produto do segmento `objective` renomeado para **Interessados**.

## Ajuste pos-feedback 2026-07-23 - Renomeacao de Muito qualificados para Qualificados

- Pedido do usuario: na analise agregada de intencao do dashboard `/pacientes`, trocar o termo **Muito qualificados** por **Qualificados**.
- O backend preservou o id tecnico `very_qualified` para compatibilidade do contrato, mas passou a retornar `label="Qualificados"`.
- A UI do Admin continua renderizando a categoria a partir do payload real de `GET /api/admin/private/patients/dashboard`, sem override local, endpoint paralelo ou dado artificial.
- A classificacao, fontes reais e pesos nao mudaram: o segmento continua representando pacientes que clicaram no WhatsApp ou concentraram multiplos sinais fortes.
- Nao houve schema Prisma, migration, package novo, seed, mock, backfill artificial, tracking novo ou mudanca de endpoint. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia auditavel foi o screenshot enviado pelo usuario em 2026-07-23 e `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`.
- ADR atualizado: `adrs/0314-admin-patient-dashboard-intent-distribution.md`.

### Criterios de aceite do ajuste

- [x] Dashboard `/pacientes` exibe **Qualificados** no segmento `very_qualified`.
- [x] O texto **Muito qualificados** nao aparece mais no Admin nem no contrato tipado do dashboard.
- [x] O id tecnico `very_qualified` foi mantido estavel para compatibilidade.
- [x] Nenhum mock, seed, dado artificial, migration, package novo, endpoint simulado ou tracking novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Service local `buildPatientsDashboard({ period: "all" })` retornou labels `["Frios","Curiosos","Interessados","Qualificados"]` em `intent_analysis.items`, sem criar dados artificiais.
- Browser local/headless via Chrome CDP em `/pacientes`, com admin temporario real removido ao final, validou desktop `1365x900` e mobile `390x844`: **QUALIFICADOS** presente, **MUITO QUALIFICADOS** ausente e `scrollWidth=390` no mobile.

## Ajuste pos-feedback 2026-07-25 - Filtros de intenção nos blocos agregados

- Pedido do usuário: nos blocos **Gênero**, **Forma de cadastro**, **Devices e sistemas**, **Uso da plataforma** e **Localização**, adicionar filtros com as opções **Todos**, **Frios**, **Curiosos**, **Interessados** e **Qualificados**.
- O endpoint `GET /api/admin/private/patients/dashboard` passou a retornar `intent_filters`, com opções e recortes agregados por segmento de intenção para os mesmos blocos, usando a classificação real já calculada em `intent_analysis`.
- Os recortes filtram somente agregados internos do Admin: gênero/forma de cadastro por pacientes do período, devices/sistemas por `visitor_session`, uso por `page_view_event`/PWA e localização coarse por `visitor_location`, sem lista nominal, sem endpoint paralelo, sem tracking novo e sem recalcular segmento no cliente.
- A UI mobile-first adicionou um dropdown compacto em cada bloco. Após feedback visual, o rótulo visível **Intenção** foi removido, mantendo texto apenas para leitores de tela, e o dropdown foi reduzido para preservar **Devices e sistemas** em uma linha.
- Não houve alteração de schema Prisma, migration, package novo, seed, mock, backfill artificial ou exposição de dado sensível.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências usadas foram `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e o screenshot enviado pelo usuário em 2026-07-25.
- ADR atualizado: `adrs/0314-admin-patient-dashboard-intent-distribution.md`.

### Critérios de aceite do ajuste

- [x] Os blocos **Gênero**, **Forma de cadastro**, **Devices e sistemas**, **Uso da plataforma** e **Localização** exibem filtro por intenção.
- [x] Cada filtro oferece **Todos**, **Frios**, **Curiosos**, **Interessados** e **Qualificados**.
- [x] A opção **Todos** preserva o agregado original do dashboard.
- [x] Os filtros usam somente dados reais já retornados pelo backend e não criam cálculo fake no cliente.
- [x] O texto visível **Intenção** não aparece nos filtros compactos, mas a acessibilidade mantém label `sr-only`.
- [x] O título **Devices e sistemas** não quebra linha no desktop validado.
- [x] Nenhum mock, seed, dado artificial, migration, package novo, endpoint simulado ou tracking novo foi adicionado.

### Validação complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Serviço local `buildPatientsDashboard({ period: "all" })` retornou `intent_filters.options` com **Todos**, **Frios**, **Curiosos**, **Interessados** e **Qualificados**, além de `breakdowns` para `all`, `cold`, `curious`, `objective` e `very_qualified`.
- Browser local/headless autenticado em `http://localhost:3002/pacientes` validou 5 dropdowns, ausência de texto visível **Intenção**, largura compacta de 124px e **Devices e sistemas** em linha única; screenshot salvo em `.tmp/patient-dashboard-intent-filters.png`.

## Ajuste pos-feedback 2026-07-25 - Periodo imediatamente abaixo dos titulos dos blocos

- Pedido do usuario: no dashboard `/pacientes`, fazer o texto **Todo o periodo · 28 de jun. a 25 de jul.** ficar imediatamente abaixo do titulo do bloco, sem ser empurrado pela altura do filtro, permitindo quebra de linha quando necessario.
- O componente local `PanelTitle` passou a aceitar `description` e renderizar o periodo dentro da coluna do titulo, logo abaixo do `h3`; o filtro compacto continua alinhado a direita no desktop e empilha em mobile.
- O ajuste foi aplicado aos blocos **Genero**, **Forma de cadastro**, **Devices e sistemas**, **Localizacao** e **Uso da plataforma**.
- O texto do periodo nao usa `whitespace-nowrap`, preservando a quebra natural de linha quando o espaco restante ao lado do filtro for estreito.
- Nao houve alteracao de backend, contrato HTTP, schema Prisma, migration, package novo, seed, mock, dado artificial ou uso de `<img>`.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias usadas foram `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e o screenshot enviado pelo usuario em 2026-07-25.
- ADR nao foi criado/atualizado porque a mudanca e exclusivamente visual/local de spacing, sem decisao arquitetural, integracao, regra de dominio ou trade-off novo.

### Criterios de aceite do ajuste

- [x] O texto de periodo fica imediatamente abaixo do titulo dos blocos agregados de pacientes.
- [x] A altura do dropdown de filtro nao empurra o periodo para baixo.
- [x] O texto do periodo pode quebrar linha quando necessario.
- [x] Layout mobile-first preservado, com filtro empilhado em telas estreitas.
- [x] Nenhum mock, seed, dado artificial, migration, package novo, endpoint simulado ou tracking novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless autenticado em `http://localhost:3002/pacientes` validou os cinco blocos com periodo abaixo do titulo e gap de 4px entre titulo e periodo. Nos cards mais estreitos, o periodo quebrou em duas linhas de forma natural (`periodHeight=40`) sem ser empurrado pela altura do filtro. O admin temporario de validacao foi removido do banco apos a verificacao.

## Ajuste pos-feedback 2026-07-26 - Gráficos de pizza no layout de Tráfego

- Pedido do usuário: fazer os gráficos de pizza do dashboard `/pacientes` seguirem o mesmo layout visual dos gráficos de pizza de `/trafego`.
- Os blocos **Gênero**, **Forma de cadastro** e **Devices e sistemas** passaram a renderizar donut SVG com total central, anel com `strokeWidth` equivalente ao padrão de Tráfego e legenda simples ao lado/abaixo com marcador, label, contagem e percentual.
- As etiquetas percentuais desenhadas dentro das fatias e os cards de legenda em `bg-surface-muted` foram removidos desses gráficos; em **Devices e sistemas**, o resumo de sistemas operacionais foi preservado como texto secundário na legenda para não perder a leitura adicionada pela TASK-81.
- Não houve alteração de backend, contrato HTTP, schema Prisma, migration, package novo, seed, mock, dado artificial ou uso de `<img>`.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências visuais usadas foram o layout real de `/trafego`, `_product/proto/admin/Tráfego.png`, `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e os screenshots enviados pelo usuário em 2026-07-26.
- ADR não foi criado/atualizado porque a mudança é exclusivamente visual/local de layout de gráficos, sem nova decisão arquitetural, integração, regra de domínio ou trade-off de dados.

### Critérios de aceite do ajuste

- [x] **Gênero** usa donut com total central e legenda no padrão de Tráfego.
- [x] **Forma de cadastro** usa donut com total central e legenda no padrão de Tráfego.
- [x] **Devices e sistemas** usa donut com total central e legenda no padrão de Tráfego, preservando o resumo real de sistemas operacionais.
- [x] Percentuais não aparecem mais desenhados dentro das fatias dos três SVGs.
- [x] Layout mobile-first preservado em 390px sem overflow horizontal.
- [x] Nenhum mock, seed, dado artificial, migration, package novo, endpoint simulado ou `<img>` foi adicionado.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir backend check`
- `pnpm check`
- Browser local/headless autenticado em `http://localhost:3002/pacientes` com Admin real temporário removido após o teste: validou os três cards com donut SVG, total central, `figcaption` apenas `sr-only`, ausência de percentuais dentro das fatias, ausência dos cards antigos de legenda, contagem + percentual na legenda e mobile `390x844` com `scrollWidth=390`. Screenshots salvos em `.tmp/patient-dashboard-donut-desktop.png` e `.tmp/patient-dashboard-donut-mobile.png`.

## Ajuste pos-feedback 2026-07-26 - Sistemas em uma linha no card de devices

- Pedido do usuario: no card **Devices e sistemas**, manter os detalhes de sistema operacional na mesma linha, sem quebra visual entre opcoes como **Android / iOS**, **Windows / macOS** e equivalentes.
- A legenda do donut de `/pacientes` passou a aplicar `whitespace-nowrap` somente no sublabel dos sistemas operacionais, preservando a quebra normal do nome do device e sem alterar dados, percentuais ou contrato HTTP.
- O ajuste tambem foi espelhado no dashboard `/psicologos` para manter o mesmo comportamento visual no card homonimo.
- Nao houve alteracao de backend, Prisma, migration, package novo, mock, seed, endpoint ou regra de calculo.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia auditavel continua sendo `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`, complementada pelo screenshot enviado pelo usuario em 2026-07-26.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx" "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless em `http://localhost:3002/pacientes` validou desktop 1365px e mobile 390px: **Android 75% / iOS 25%** e **iPadOS 100%** ficaram com `white-space: nowrap`, uma unica linha (`Range.getClientRects() = 1`) e sem overflow horizontal. A rota `/psicologos` tambem carregou sem overflow; a base local nao retornou sublabels de sistemas para esse card.
- Admin temporario de validacao `codex-device-nowrap-*` foi criado apenas para sessao autenticada de browser e removido ao final.

## Ajuste pos-feedback 2026-07-26 - Label de genero sem quebra de palavra

- Pedido do usuario: no grafico **Genero**, evitar que **Nao informado** quebre a palavra deixando a letra final isolada.
- A legenda do donut de genero em `/pacientes` passou a aplicar `whitespace-nowrap` e `break-normal` somente ao item de id `nao_informado`, preservando o comportamento dos demais labels e os dados reais retornados pelo backend.
- Nao houve alteracao de backend, contrato HTTP, Prisma, migration, package novo, mock, seed, endpoint ou regra de calculo.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia auditavel continua sendo `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`, complementada pelo screenshot enviado pelo usuario em 2026-07-26.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check` foi tentado, mas falhou por alteracoes fora do escopo ja presentes em `backend/src/modules/api/admin/private/traffic/summary/use-cases/services.ts` (imports nao usados/organizacao Biome).
- Browser local/headless em `http://localhost:3002/pacientes` validou desktop 1365px e mobile 390px: o span visual de **Nao informado** ficou com `white-space: nowrap`, `word-break: normal`, uma unica linha (`Range.getClientRects() = 1`) e sem overflow horizontal.
- Admins temporarios de validacao `codex-device-nowrap-*` foram removidos ao final.

## Ajuste pos-feedback 2026-07-27 - Quebra controlada de Nao informado no genero

- Pedido do usuario: no bloco **Genero** do dashboard `/pacientes`, o label **Nao informado** se sobrepunha ao numero; a palavra **informado** deveria quebrar para a segunda linha.
- A legenda do donut de genero removeu o `whitespace-nowrap` do item `nao_informado` e passou a renderizar visualmente **Nao** + `<br>` + **informado**, mantendo o texto completo em `sr-only` para acessibilidade.
- O ajuste permanece local ao Admin e preserva os dados reais, contagem, percentual e contrato HTTP existentes.
- Nao houve alteracao de backend, Prisma, migration, package novo, mock, seed, endpoint ou regra de calculo.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e o screenshot enviado pelo usuario em 2026-07-27.
- ADR nao foi criado/atualizado porque a mudanca e exclusivamente visual/local de legenda, sem decisao arquitetural, integracao, regra de dominio ou trade-off novo.

### Criterios de aceite do ajuste

- [x] **Nao informado** aparece com **Nao** na primeira linha e **informado** na segunda linha no bloco **Genero**.
- [x] A contagem `144 (92,9%)` permanece separada do label, sem sobreposicao no desktop validado.
- [x] O layout mobile-first em 390px nao apresenta overflow horizontal nem sobreposicao entre label e contagem.
- [x] O texto completo **Nao informado** continua disponivel para leitores de tela.
- [x] Nenhum mock, seed, dado artificial, migration, package novo, endpoint simulado ou `<img>` foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local/headless autenticado em `http://localhost:3002/pacientes?period=all` validou desktop `1366x900` e mobile `390x844`: existe um unico `<br aria-hidden>` no label de genero, o texto visivel foi dividido em duas partes (**Nao** / **informado**), a contagem `144 (92,9%)` nao sobrepoe o label e `scrollWidth` permaneceu igual ao viewport em ambos os tamanhos.

## Ajuste pos-feedback 2026-07-27 - Peso textual dos titulos dos blocos

- Pedido do usuario: reduzir o peso textual dos titulos dos blocos no dashboard `/pacientes`.
- O componente local `PanelTitle` trocou o titulo padrao dos blocos agregados de `font-black` para `font-bold`; no escopo `admin-premium-pilot`, isso reduz o peso computado de 650 para 600, mantendo tamanho, hierarquia, alinhamento com icone e quebra atual do periodo.
- O ajuste se aplica aos blocos **Genero**, **Forma de cadastro**, **Devices e sistemas**, **Localizacao** e **Uso da plataforma** sem alterar dados, filtros, graficos, contrato HTTP, schema Prisma, migration, package, seed, mock ou endpoint.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e o screenshot enviado pelo usuario em 2026-07-27.
- ADR nao foi criado/atualizado porque a mudanca e exclusivamente visual/local de tipografia, sem decisao arquitetural, integracao, regra de dominio ou trade-off novo.

### Criterios de aceite do ajuste

- [x] Os titulos dos blocos agregados de `/pacientes` usam peso visual reduzido.
- [x] A reducao nao muda tamanho, copy, icones, filtros ou dados reais dos blocos.
- [x] Layout mobile-first em 390px permanece sem overflow horizontal.
- [x] Nenhum mock, seed, dado artificial, migration, package novo, endpoint simulado ou `<img>` foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- Browser local/headless autenticado em `http://localhost:3002/pacientes?period=all` validou desktop `1366x900` e mobile `390x844`: titulos **Genero**, **Forma de cadastro**, **Devices e sistemas**, **Localizacao** e **Uso da plataforma** com `fontWeight=600`, classe `font-bold` e `scrollWidth` igual ao viewport em ambos os tamanhos. Screenshots salvos em `.tmp/patient-dashboard-title-weight-desktop-1366.png` e `.tmp/patient-dashboard-title-weight-mobile-390.png`.
- Admin temporario de validacao `codex-title-weight-*` foi removido do banco apos a verificacao.

## Ajuste pos-feedback 2026-07-28 - Intencao e engajamento em duas colunas

- Pedido do usuario: dividir o bloco **Analise da intencao dos pacientes** em duas colunas com graficos: **Intencao dos pacientes** e **Engajamento dos pacientes**.
- O card principal passou a se chamar **Intencao e engajamento dos pacientes** e manteve o periodo logo abaixo do titulo.
- A coluna **Intencao dos pacientes** usa os mesmos dados reais de `intent_analysis.items`, agora com donut, barra percentual empilhada e cards de Frios, Curiosos, Interessados e Qualificados.
- A coluna **Engajamento dos pacientes** usa `intent_analysis.signal_totals` sem alterar contrato, exibindo grafico de barras para aberturas de perfil, favoritos ativos, cliques no WhatsApp e retornos ao perfil.
- O texto do grafico de engajamento deixa claro que uma pessoa pode gerar mais de um sinal; logo, o grafico mede acoes reais, nao pacientes unicos.
- Nao houve alteracao de backend, contrato HTTP, Prisma, migration, package novo, tracking, seed, mock, backfill artificial ou uso de `<img>`.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e o screenshot enviado pelo usuario em 2026-07-27.
- ADR atualizado: `adrs/0314-admin-patient-dashboard-intent-distribution.md`.

### Criterios de aceite do ajuste

- [x] O bloco principal exibe o titulo **Intencao e engajamento dos pacientes**.
- [x] Em desktop, o layout progride para duas colunas: **Intencao dos pacientes** e **Engajamento dos pacientes**.
- [x] **Intencao dos pacientes** possui grafico proprio usando dados reais de distribuicao por segmento.
- [x] **Engajamento dos pacientes** possui grafico proprio usando sinais reais de `signal_totals`.
- [x] O layout mobile-first empilha as colunas em telas estreitas sem overflow horizontal observado no browser headless.
- [x] Nenhum mock, seed, dado artificial, migration, package novo, endpoint simulado ou `<img>` foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local/headless autenticado em `http://localhost:3002/pacientes?period=all` com Admin temporario real removido ao final: confirmou o bloco **Intencao e engajamento dos pacientes**, as secoes **Intencao dos pacientes** e **Engajamento dos pacientes**, donut de intencao, barras de engajamento e percentual arredondado `14,2% sobre a base considerada.`; screenshot salvo em `.tmp/patient-dashboard-intent-engagement-browser.png`.
- Durante a validacao, o primeiro build complementar encontrou `ENOSPC` por falta de espaco em artefatos gerados; foram removidos apenas caches/artefatos temporarios de build/browser dentro do workspace e o build foi reexecutado com sucesso.


## Ajuste pos-feedback 2026-07-28 - Foco nos graficos de intencao e engajamento

- Pedido do usuario: na coluna **Intencao dos pacientes**, remover a barra horizontal e os quatro contadores abaixo dela, mantendo o foco no grafico; na coluna **Engajamento dos pacientes**, criar um espelho da primeira coluna com grafico por nivel (**Muito engajados**, **Engajados**, **Pouco engajados** e **Sem engajamento**), sem descrever cada sinal.
- O backend de `GET /api/admin/private/patients/dashboard` passou a retornar `engagement_analysis`, calculado somente com os mesmos sinais reais ja persistidos de abertura de perfil, favoritos ativos e cliques no WhatsApp, sem endpoint paralelo, tracking novo, seed, mock ou backfill.
- A classificacao de engajamento e por paciente unico: sem acao real entra em **Sem engajamento**; uma acao de descoberta entra em **Pouco engajados**; favorito, retorno ao mesmo perfil ou duas/mais acoes entram em **Engajados**; clique no WhatsApp, quatro/mais acoes ou multiplos retornos entram em **Muito engajados**.
- A UI mobile-first manteve o bloco **Intencao e engajamento dos pacientes** em duas colunas no desktop e empilhado em telas estreitas. A coluna de intencao exibe somente o donut e a legenda; a coluna de engajamento espelha a estrutura com donut proprio por nivel.
- Nao houve alteracao de schema Prisma, migration, package novo, seed, mock, dado artificial, backfill, uso de `<img>` ou mudanca nos filtros por intencao ja existentes.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e os screenshots enviados pelo usuario em 2026-07-27/2026-07-28.
- ADR atualizado: `adrs/0314-admin-patient-dashboard-intent-distribution.md`.

### Criterios de aceite do ajuste

- [x] A coluna **Intencao dos pacientes** nao renderiza mais a barra horizontal percentual.
- [x] A coluna **Intencao dos pacientes** nao renderiza mais os quatro cards/contadores de Frios, Curiosos, Interessados e Qualificados abaixo do grafico.
- [x] O foco visual da coluna **Intencao dos pacientes** permanece no donut com legenda real.
- [x] A coluna **Engajamento dos pacientes** espelha a primeira coluna com grafico de donut proprio.
- [x] O grafico de engajamento usa niveis por paciente unico: **Muito engajados**, **Engajados**, **Pouco engajados** e **Sem engajamento**.
- [x] O engajamento e calculado no backend com dados reais e nao descreve cada sinal na UI.
- [x] Layout mobile-first preservado, sem novo package, mock, seed, migration, endpoint simulado ou `<img>`.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build` via `cmd /c` no Windows; o build concluiu com avisos de cache Webpack corrompido/recriado, sem falhar.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Servico local `buildPatientsDashboard({ period: "all" })` retornou `engagement_analysis.items` com **Muito engajados**, **Engajados**, **Pouco engajados** e **Sem engajamento**, totalizando 155 pacientes reais na base local.
- HTTP local `GET /api/admin/private/patients/dashboard?period=all` com Admin temporario real retornou `engagement_analysis.items` com os quatro niveis e percentuais reais; o Admin temporario foi removido ao final.
- Browser local/headless em `http://localhost:3002/pacientes?period=all` validou desktop `1366x900` e mobile `390x844`: donuts de intencao e engajamento presentes, barra percentual antiga ausente, textos antigos de sinais individuais ausentes e `scrollWidth` sem overflow horizontal. Screenshots salvos em `.tmp/patient-dashboard-engagement-donut-desktop.png` e `.tmp/patient-dashboard-engagement-donut-mobile.png`.

## Ajuste pos-feedback 2026-07-28 - Cabecalhos limpos nos graficos de intencao e engajamento

- Pedido do usuario: nos blocos **Intencao dos pacientes** e **Engajamento dos pacientes**, remover o texto **Grafico**, remover o icone decorativo a direita e remover as linhas descritivas de distribuicao.
- A UI mobile-first de `/pacientes` manteve o card principal **Intencao e engajamento dos pacientes** e os dois donuts/legendas reais, mas simplificou o cabecalho interno de cada coluna para focar no titulo, total e grafico.
- Nao houve alteracao de backend, contrato HTTP, schema Prisma, migration, package novo, seed, mock, dado artificial, endpoint simulado, tracking novo ou uso de `<img>`.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e o screenshot enviado pelo usuario em 2026-07-28.
- ADR nao foi criado/atualizado porque a mudanca e exclusivamente visual/local de copy e ornamentos, sem decisao arquitetural, integracao, regra de dominio ou trade-off novo.

### Criterios de aceite do ajuste

- [x] O texto **Grafico** nao aparece mais nos blocos internos **Intencao dos pacientes** e **Engajamento dos pacientes**.
- [x] Os icones decorativos a direita dos dois cabecalhos internos foram removidos.
- [x] As duas linhas descritivas de distribuicao foram removidas.
- [x] Os donuts e legendas reais de intencao e engajamento permanecem visiveis.
- [x] Layout mobile-first preservado, sem overflow horizontal em 390px.
- [x] Nenhum mock, seed, dado artificial, migration, package novo, endpoint simulado ou `<img>` foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build` via `cmd /c` no Windows
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Browser local/headless autenticado em `http://localhost:3002/pacientes?period=all` validou desktop `1366x900` e mobile `390x844`: os dois blocos internos nao exibem **Grafico**, nao possuem o `span` de icone no cabecalho, nao exibem as linhas descritivas removidas, preservam os donuts/legendas reais e nao geram overflow horizontal. Screenshots salvos em `.tmp/patient-dashboard-clean-charts-desktop.png` e `.tmp/patient-dashboard-clean-charts-mobile.png`.
- Admin temporario de validacao `codex-patient-clean-charts-*` foi removido do banco apos a verificacao.

## Ajuste pos-feedback 2026-07-28 - Bloco Intencao x Engajamento

- Pedido do usuario: assim como existe **Demanda x Engajamento** no dashboard de psicologos, adicionar em `/pacientes`, abaixo de **Intencao e engajamento dos pacientes**, um bloco **Intencao x Engajamento** para entender a relacao entre as duas metricas.
- O backend passou a retornar `intent_engagement` no payload real de `GET /api/admin/private/patients/dashboard`, cruzando a classificacao unica de intencao com a classificacao unica de engajamento ja calculadas para cada paciente do periodo.
- A matriz tem 16 celulas: **Frios**, **Curiosos**, **Interessados** e **Qualificados** versus **Muito engajados**, **Engajados**, **Pouco engajados** e **Sem engajamento**, com contagem, percentual da base, percentual da linha e percentual da coluna.
- O bloco tambem exibe metricas resumidas de alta intencao entre pacientes engajados, alta intencao entre pouco/sem engajamento e diferenca observada em pontos percentuais.
- A UI permanece mobile-first: em telas estreitas a matriz empilha por categoria de intencao; no desktop progride para matriz com colunas de engajamento e resumo lateral.
- A leitura e explicitamente observacional, agregada e interna ao Admin; nao indica causalidade, atendimento, diagnostico, conversa, ranking publico ou lista nominal de pacientes.
- Nao houve schema Prisma, migration, package novo, tracking, seed, mock, endpoint paralelo, backfill artificial ou uso de `<img>`.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`, o comportamento existente de **Demanda x Engajamento** em `/psicologos` e o pedido/screenshot enviado pelo usuario em 2026-07-28.
- ADR atualizado: `adrs/0314-admin-patient-dashboard-intent-distribution.md`.

### Criterios de aceite do ajuste

- [x] O bloco **Intencao x Engajamento** aparece abaixo de **Intencao e engajamento dos pacientes**.
- [x] A relacao usa dados reais e classificacoes backend por paciente unico, sem recalculo no cliente.
- [x] A matriz cruza as quatro categorias de intencao com os quatro niveis de engajamento.
- [x] O resumo lateral mostra alta intencao entre engajados, alta intencao entre pouco/sem engajamento e diferenca observada.
- [x] Layout mobile-first preservado em 390px sem overflow horizontal.
- [x] Nenhum mock, seed, dado artificial, migration, package novo, endpoint simulado ou `<img>` foi adicionado.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build` via `cmd /c` no Windows
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Servico local `buildPatientsDashboard({ period: "all" })` validou `intent_engagement` com 16 celulas, soma das celulas igual a 155 pacientes reais, total coerente com `intent_analysis.total_patients`, `high_intent_patients=22` e diferenca observada de `+100 p.p.` na base local.
- Browser local/headless autenticado em `http://localhost:3002/pacientes?period=all` com Admin temporario real removido ao final validou desktop `1366x900` e mobile `390x844`: bloco abaixo de **Intencao e engajamento dos pacientes**, textos/labels de matriz e resumo lateral presentes, 16 celulas logicas renderizadas em matriz desktop/mobile e sem overflow horizontal. Screenshots salvos em `.tmp/patient-dashboard-intent-engagement-matrix-desktop.png` e `.tmp/patient-dashboard-intent-engagement-matrix-mobile.png`.

## Ajuste pos-feedback 2026-07-28 - Colunas da lista de pacientes

- Pedido do usuario: na rota `/pacientes/lista`, exibir somente as colunas **Paciente**, **Data de cadastro**, **Perfil**, **Intencao** e **Engajamento**.
- A tabela desktop agora usa exatamente essas cinco colunas e remove a coluna visual de **Acoes**; a navegacao para o detalhe permanece pelo clique/teclado na linha.
- Os cards mobile exibem os mesmos campos (**Data de cadastro**, **Perfil**, **Intencao** e **Engajamento**) em layout mobile-first, sem criar tabela comprimida nem overflow horizontal em 390px.
- **Perfil** continua sendo o status operacional real da conta (`user.active`), exibido como **Ativo** ou **Inativo**.
- **Intencao** e **Engajamento** passaram a vir do backend da lista, calculados apenas com sinais reais ja persistidos de `profile_view_event`, `psychologist_favorite` e `contact_request` para os pacientes reais da pagina retornada.
- A regra e observacional e interna ao Admin: a intencao usa os pesos ja adotados no dashboard de pacientes; o engajamento classifica acoes reais em **Sem engajamento**, **Pouco engajado**, **Engajado** e **Muito engajado**, sem inferencia clinica, diagnostico, atendimento, ranking publico, mock, seed ou backfill.
- O contrato `GET /api/admin/private/patients` foi enriquecido com `intent` e `engagement` e a fonte declarada passou a citar as tabelas reais de sinais; nao houve endpoint paralelo, tracking novo, schema Prisma, migration, package novo, dado artificial ou `<img>`.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e o screenshot enviado pelo usuario em 2026-07-28.
- ADR atualizado: `adrs/0281-submenu-admin-pacientes.md`.

### Criterios de aceite do ajuste

- [x] O desktop de `/pacientes/lista` renderiza os cabecalhos exatamente como **Paciente**, **Data de cadastro**, **Perfil**, **Intencao** e **Engajamento**.
- [x] Cada linha da tabela desktop possui cinco celulas de dados alinhadas as colunas solicitadas.
- [x] Os cards mobile exibem os mesmos campos e permanecem sem overflow horizontal em 390px.
- [x] **Intencao** e **Engajamento** sao calculados no backend com sinais reais ja persistidos, sem mock, seed, backfill, tracking novo ou endpoint simulado.
- [x] A navegacao para o detalhe do paciente permanece disponivel por clique/teclado na linha ou no card, mesmo sem a coluna visual de acoes.
- [x] Nenhum schema Prisma, migration, package novo, dado artificial ou `<img>` foi adicionado.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/list/DTOs/IAdminPatientsListDTO.ts" "src/modules/api/admin/private/patients/list/repositories/AdminPatientsListRepository.ts" "src/modules/api/admin/private/patients/list/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/list.ts" "src/app/(admin)/pacientes/lista/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build` (a primeira tentativa encontrou outro processo `next build` em execucao; a reexecucao concluiu com sucesso)
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Servico local `listAdminPatients({ limit: 3 })` retornou `status=200`, `count=155`, `source="user+patient_profile+visitor_location+profile_view_event+psychologist_favorite+contact_request"` e itens reais com `status` (Perfil), `intent` e `engagement` preenchidos.
- Browser local/headless autenticado em `http://localhost:3002/pacientes/lista` validou desktop `1366x900` com os cinco cabecalhos solicitados e linhas com cinco celulas; validou mobile `390x844` com labels **Data de cadastro**, **Perfil**, **Intencao** e **Engajamento** e `scrollWidth=390`. Screenshots salvos em `.tmp/patient-list-columns-desktop.png` e `.tmp/patient-list-columns-mobile.png`.
- Admin temporario de validacao `codex-patient-list-columns-*` foi removido do banco apos a verificacao.

## Ajuste pos-feedback 2026-07-28 - Exemplos visuais de intencao e engajamento

- Pedido do usuario: nas colunas **Intencao** e **Engajamento**, exibir todos os resultados possiveis como exemplo apenas para visualizacao.
- A lista `/pacientes/lista` passou a mostrar chips de **Exemplos visuais** diretamente nos cabecalhos desktop das colunas **Intencao** e **Engajamento**.
- Em mobile, como nao ha colunas, os mesmos exemplos aparecem em um painel compacto antes dos cards de pacientes.
- Os exemplos sao apenas uma legenda visual de estados possiveis: nao alteram linhas reais, filtros, ordenacao, payload, classificacao backend, contagem, paginacao ou navegacao para detalhe.
- Resultados exibidos para **Intencao**: **Frio**, **Curioso**, **Interessado** e **Qualificado**.
- Resultados exibidos para **Engajamento**: **Sem engajamento**, **Pouco engajado**, **Engajado** e **Muito engajado**.
- Nao houve backend, contrato HTTP, schema Prisma, migration, package novo, mock, seed, backfill, dado artificial, endpoint simulado ou `<img>`.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram o screenshot enviado pelo usuario em 2026-07-28 e `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`.
- ADR nao foi atualizado porque a mudanca e somente uma legenda visual temporaria/local de UI, sem decisao arquitetural, integracao, regra de dominio ou trade-off novo.

### Criterios de aceite do ajuste

- [x] A coluna **Intencao** exibe exemplos visuais dos quatro resultados possiveis.
- [x] A coluna **Engajamento** exibe exemplos visuais dos quatro resultados possiveis.
- [x] Os valores reais das linhas continuam vindo do backend e nao foram substituidos por exemplos.
- [x] Em mobile, os exemplos aparecem em painel proprio antes dos cards e o layout permanece sem overflow horizontal em 390px.
- [x] Nenhum mock, seed, dado artificial, migration, package novo, endpoint simulado ou `<img>` foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/lista/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/pacientes/lista/client.tsx"`
- `pnpm --dir admin exec tsc --noEmit --pretty false`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- Browser local/headless autenticado em `http://localhost:3002/pacientes/lista` validou desktop `1366x900` com exemplos visuais nos cabecalhos e linhas reais com cinco celulas; validou mobile `390x844` com os oito labels possiveis e `scrollWidth=390`. Screenshots salvos em `.tmp/patient-list-examples-desktop.png` e `.tmp/patient-list-examples-mobile.png`.
- `pnpm --dir admin check` foi executado, mas segue bloqueado por alteracao local fora do escopo em `admin/src/app/(admin)/psicologos/lista/client.tsx:699` (`aria-label` em `div` sem role). A validacao direcionada do arquivo alterado nesta task passou.
- Admin temporario de validacao `codex-patient-list-examples-*` foi removido do banco apos a verificacao.

## Ajuste pos-feedback 2026-07-28 - Exemplos nas linhas da lista

- Pedido do usuario: os exemplos de **Intencao** e **Engajamento** nao devem ficar no header; devem aparecer associados aos itens listados para visualizar os estados na propria tabela.
- Os cabecalhos desktop voltaram a exibir apenas **Intencao** e **Engajamento**.
- Cada linha/card passa a manter o valor real retornado pelo backend e, abaixo dele, um chip **Exemplo visual** alternando os estados possiveis para visualizacao da UI.
- A distribuicao visual percorre os quatro exemplos de **Intencao** (**Frio**, **Curioso**, **Interessado**, **Qualificado**) e os quatro de **Engajamento** (**Sem engajamento**, **Pouco engajado**, **Engajado**, **Muito engajado**) nas linhas renderizadas.
- Os chips sao marcados explicitamente como **Exemplo visual** e nao alteram backend, payload, filtros, ordenacao, paginacao, classificacao real, navegacao para detalhe, schema Prisma, migration, package, seed, mock, backfill, endpoint simulado ou `<img>`.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram o screenshot enviado pelo usuario em 2026-07-28 e `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`.
- ADR nao foi atualizado porque a mudanca continua sendo apenas visual/local de UI, sem decisao arquitetural, integracao, regra de dominio ou trade-off novo.

### Criterios de aceite do ajuste

- [x] Os cabecalhos **Intencao** e **Engajamento** nao exibem mais todos os exemplos.
- [x] Os exemplos aparecem nas linhas/cards listados, abaixo do valor real de cada coluna.
- [x] Os oito resultados possiveis aparecem distribuídos entre os itens renderizados.
- [x] Os valores reais das linhas continuam visiveis e separados dos chips **Exemplo visual**.
- [x] Layout mobile-first validado em 390px sem overflow horizontal.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/lista/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/pacientes/lista/client.tsx"`
- `pnpm --dir admin exec tsc --noEmit --pretty false`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- Browser local/headless autenticado em `http://localhost:3002/pacientes/lista` validou desktop `1366x900`: cabecalhos limpos, exemplos no corpo da tabela e linhas com cinco celulas; validou mobile `390x844`: exemplos nos cards e `scrollWidth=390`. Screenshots salvos em `.tmp/patient-list-row-examples-desktop.png` e `.tmp/patient-list-row-examples-mobile.png`.
- Admin temporario de validacao `codex-patient-row-examples-*` foi removido do banco apos a verificacao.

## Ajuste pos-feedback 2026-07-28 - Texto simples na tabela de pacientes

- Pedido do usuario: na tabela de `/pacientes/lista`, remover o formato visual de tags e manter somente texto simples para reduzir o peso visual.
- A coluna **Perfil** deixou de renderizar chips/badges arredondados e passou a usar texto simples com a cor semantica do status real.
- Os exemplos visuais de **Intencao** e **Engajamento** continuam abaixo do valor real de cada linha/card, mas sem fundo, borda, pill ou formato de tag.
- Os valores reais continuam vindo do backend e nao houve alteracao de contrato HTTP, filtros, ordenacao, paginacao, schema Prisma, migration, package, seed, mock, backfill, endpoint simulado ou uso de `<img>`.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram o screenshot enviado pelo usuario em 2026-07-28 e `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`.
- ADR nao foi criado/atualizado porque a mudanca e exclusivamente visual/local de apresentacao, sem decisao arquitetural, integracao, regra de dominio ou trade-off novo.

### Criterios de aceite do ajuste

- [x] A coluna **Perfil** nao usa mais chip/badge/tag visual.
- [x] Os exemplos visuais de **Intencao** e **Engajamento** nao usam mais chip/badge/tag visual.
- [x] Os textos reais e os exemplos continuam legiveis no desktop e nos cards mobile.
- [x] Layout mobile-first preservado em 390px sem overflow horizontal.
- [x] Nenhum mock, seed, dado artificial, migration, package novo, endpoint simulado ou `<img>` foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/lista/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check` (apos uma primeira tentativa com timeout de 244s, reexecutado com timeout maior e concluido sem erros)
- Browser local/headless autenticado em `http://localhost:3002/pacientes/lista` validou desktop `1366x900` e mobile `390x844`: nenhum texto de **Perfil**, **Intencao** ou **Engajamento** ficou em elemento com `rounded-full`, `border` ou `bg-*`; mobile retornou `scrollWidth=390`. Screenshots salvos em `.tmp/patient-list-plain-text-tags-desktop.png` e `.tmp/patient-list-plain-text-tags-mobile.png`.
- Admin temporario de validacao `codex-patient-list-plain-text-*` foi removido do banco apos a verificacao.

## Ajuste pos-feedback 2026-07-28 - Engajamento comunitario de pacientes

- Pedido do usuario: em pacientes, **Engajamento** deve considerar somente acoes em comunidades; cliques no WhatsApp, abertura de perfil, favoritos e retornos ao perfil devem permanecer em **Intencao**.
- Backend Admin: `GET /api/admin/private/patients/dashboard` agora calcula `engagement_analysis` a partir de `community_post`, `post_reply`, `post_vote`, `post_save` e `post_reply_save`, filtrando pacientes reais e conteudos publicados/nao deletados.
- Backend Admin: `intent_analysis` permanece calculado por `profile_view_event`, `psychologist_favorite` e `contact_request`; `intent_engagement` cruza a intencao de busca com o novo engajamento comunitario.
- Lista Admin: `/pacientes/lista` tambem passou a exibir **Engajamento** por acoes comunitarias reais, mantendo WhatsApp/perfil/favorito apenas como sinais de **Intencao**.
- A classificacao de engajamento usa a mesma fundacao de diagnostico comunitario ja usada no produto: 0 interacoes = **Sem engajamento**; interacoes abaixo do corte normalizado = **Pouco engajado**; cortes normalizados superiores = **Engajado** e **Muito engajado**.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a execucao usou `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e as capturas enviadas pelo usuario.
- Nenhuma alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- ADR criado: `adrs/0338-engajamento-comunitario-pacientes-e-sem-dados-insuficientes-psicologos.md`.

### Criterios complementares

- [x] **Engajamento dos pacientes** usa somente `community_post`, `post_reply`, `post_vote`, `post_save` e `post_reply_save`.
- [x] Abertura de perfil, favorito, clique no WhatsApp e retorno ao perfil permanecem somente em **Intencao**.
- [x] `intent_engagement` cruza intencao de busca com engajamento comunitario, sem misturar os sinais no calculo de engajamento.
- [x] A lista de pacientes usa a mesma regra comunitaria para a coluna **Engajamento**.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo ou migration foi criado.

### Validacao complementar

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/dashboard/repositories/AdminPatientsDashboardRepository.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts" "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts" "src/modules/api/admin/private/psychologists/list/DTOs/IAdminPsychologistsListDTO.ts" "src/modules/api/admin/private/psychologists/list/use-cases/services.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/list/DTOs/IAdminPatientsListDTO.ts" "src/modules/api/admin/private/patients/list/repositories/AdminPatientsListRepository.ts" "src/modules/api/admin/private/patients/list/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/list.ts"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Smoke de servico local `buildPatientsDashboard({ period: "all" })` retornou `engagement_analysis.source="community_post+post_reply+post_vote+post_save+post_reply_save"`, `intent_engagement.source` combinando intencao + comunidade, 16 celulas e itens reais **Muito engajados**, **Engajados**, **Pouco engajados** e **Sem engajamento**.
- Smoke de servico local `listAdminPatients({ limit: 5 })` retornou `source` com tabelas de intencao + comunidade e labels reais de engajamento por comunidade, sem mock.
- Browser local/headless autenticado em `http://localhost:3002/pacientes` e `http://localhost:3002/pacientes/lista` validou mobile `390x844`, `scrollWidth=390`, textos de **Engajamento** e **Sem engajamento** presentes. Screenshots salvos em `.tmp/admin-patients-engagement-mobile.png` e `.tmp/admin-patients-list-engagement-mobile.png`.
