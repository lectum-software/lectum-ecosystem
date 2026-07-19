# TASK-60: Dashboard administrativo de pacientes

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-60 |
| Prioridade | P1 |
| Esfor√ßo | M |
| Fase | Admin |
| Status | Completed |
| Depend√™ncias | TASK-45, TASK-46 |
| ADR alvo | ADR se houver decis√£o nova sobre exposi√ß√£o de dados de pacientes ou c√°lculo de atividade |

## Contexto

A se√ß√£o **Pacientes** do painel Admin deve ser mais simples que Psic√≥logos. A refer√™ncia visual √© `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`.

Decis√µes de produto definidas:

- N√£o implementar status **Bloqueado** ou **Silenciado** nesta V1.
- N√£o implementar **taxa de reten√ß√£o** nesta V1.
- N√£o criar a√ß√µes administrativas de bloqueio, silenciamento, modera√ß√£o ou exclus√£o de paciente.
- Usar apenas dados reais existentes; n√£o preencher cards, gr√°ficos ou listas com dados fake.

## Objetivo

Implementar o dashboard administrativo de pacientes com vis√£o geral de crescimento, status b√°sico de conta, novos cadastros, lista resumida e estat√≠sticas simples.

## Pr√©-requisitos e bloqueios

- TASK-45 conclu√≠da: autentica√ß√£o Admin real.
- TASK-46 conclu√≠da: app `admin/` e shell lateral.
- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md`, `_product/tasks/PACKAGES.md` e `_product/tasks/PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` como refer√™ncia visual local.
- Se Builder/Quick Copy estiver dispon√≠vel, usar como complemento; se n√£o, registrar a limita√ß√£o e usar a imagem local.

## Escopo frontend

- Criar rota protegida:
  - `/patients` ou rota equivalente definida no app Admin.
- Renderizar:
  - t√≠tulo e subt√≠tulo;
  - filtro de per√≠odo;
  - exporta√ß√£o somente se houver endpoint real;
  - cards:
    - total de pacientes;
    - pacientes ativos;
    - pacientes inativos;
    - novos cadastros;
  - gr√°fico temporal sem linha/card de reten√ß√£o;
  - lista resumida de pacientes com acesso ao detalhe;
  - estat√≠sticas por g√™nero, localiza√ß√£o agregada e forma de cadastro.
- N√£o renderizar status "Bloqueado" ou "Silenciado".
- N√£o renderizar taxa de reten√ß√£o.
- A√ß√µes por linha:
  - abrir detalhe;
  - menu adicional somente com a√ß√µes reais e seguras j√° implementadas; caso contr√°rio, omitir.

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
  - `post_save`/`post_reply_save`, se necess√°rio para atividade recente;
  - `visitor_location` apenas para localiza√ß√£o agregada/coarse quando houver fonte real.
- Defini√ß√£o V1:
  - **total de pacientes**: usu√°rios n√£o deletados com `role="paciente"`;
  - **pacientes ativos**: contas com `user.active=true`;
  - **pacientes inativos**: contas com `user.active=false`;
  - **novos cadastros**: pacientes criados dentro do per√≠odo.
- Se o produto quiser "ativo por uso recente" em vez de `user.active`, criar ADR e ajustar copy para n√£o confundir status de conta com engajamento.

## Fora do escopo

- Status bloqueado/silenciado.
- A√ß√µes de bloquear, silenciar, banir, excluir ou moderar paciente.
- Taxa de reten√ß√£o.
- Definir cohort retention.
- Exibir localiza√ß√£o precisa.
- Criar tracking novo apenas para preencher gr√°fico.
- Criar dados fake, seeds permanentes ou endpoints simulados.

## Contrato t√©cnico detalhado

Backend esperado:

- M√≥dulo admin privado seguindo o padr√£o de controller/service/repository/validator existente.
- Per√≠odo:
  - default: √∫ltimos 7 dias;
  - aceitar `from` e `to`;
  - validar limites para evitar consultas excessivas.
- Resposta sugerida:
  - `summary`;
  - `series`;
  - `recentPatients`;
  - `demographics`;
  - `locations`;
  - `signupSources`;
  - `coverageNotes` para m√©tricas omitidas por falta de fonte.
- Localiza√ß√£o:
  - usar somente cidade/UF/pa√≠s agregados quando existir em `visitor_location`;
  - n√£o exibir coordenada, IP, endere√ßo ou localiza√ß√£o exata.
- Exporta√ß√£o:
  - s√≥ criar/habilitar se houver endpoint real, por exemplo `GET /api/admin/private/patients/dashboard/export`.

Frontend esperado:

- Reutilizar shell Admin da TASK-46.
- Reutilizar componentes/tokens existentes; n√£o criar design system paralelo.
- Mobile-first:
  - cards empilhados em mobile;
  - tabela convertida para lista/card em mobile se necess√°rio;
  - layout expandido em desktop seguindo a refer√™ncia visual.
- Gr√°ficos:
  - usar implementa√ß√£o existente ou CSS/SVG controlado sem instalar pacote novo, salvo valida√ß√£o em `PACKAGES.md` e ADR.
- Campos/filtros:
  - usar React Hook Form, Zod e controllers da TASK-02 quando houver formul√°rio.
- Imagens/avatar:
  - usar `Image` de `next/image`, nunca `<img>`.

## Crit√©rios de aceite

- [x] Rota de Pacientes s√≥ abre para admin autenticado.
- [x] Dashboard usa somente dados reais de pacientes.
- [x] Cards exibidos: total, ativos, inativos e novos cadastros.
- [x] Card/linha/gr√°fico de reten√ß√£o n√£o existe nesta V1.
- [x] Status bloqueado/silenciado n√£o aparece.
- [x] Lista resumida abre o detalhe do paciente.
- [x] Localiza√ß√£o √© agregada e s√≥ aparece quando houver fonte real.
- [x] M√©tricas sem fonte real aparecem como indispon√≠veis ou s√£o omitidas com copy honesta.
- [x] Exporta√ß√£o s√≥ aparece/habilita com endpoint real.
- [x] UI mobile-first validada.
- [x] Nenhum `<img>` cru foi usado.
- [x] `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` foi citada como refer√™ncia visual.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Checks/builds relevantes executados sem erros.
- [x] ADR criado/atualizado se houver decis√£o sobre dados sens√≠veis, localiza√ß√£o ou c√°lculo de atividade.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Valida√ß√£o m√≠nima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real e pacientes reais.

## Execu√ß√£o

- Implementado backend real `GET /api/admin/private/patients/dashboard` com autentica√ß√£o admin, valida√ß√£o de per√≠odo (m√°ximo de 90 dias) e agrega√ß√µes somente a partir de `user`, `patient_profile`, `visitor_location` e eventos reais de comunidade.
- Implementada rota protegida `/pacientes` no app `admin/` com cards de total, ativos, inativos e novos cadastros, gr√°fico temporal sem reten√ß√£o, lista resumida com link para detalhe, estat√≠sticas por g√™nero, localiza√ß√£o agregada e forma de cadastro.
- Criada rota reservada `/pacientes/[id]` como placeholder protegido e honesto para a TASK-61, sem dados fake de detalhe.
- Exporta√ß√£o n√£o foi exibida/habilitada porque o backend retorna `export.available=false` e n√£o existe endpoint real de exporta√ß√£o no escopo.
- Status bloqueado/silenciado, a√ß√µes destrutivas e taxa de reten√ß√£o permaneceram fora da V1 conforme decis√£o de produto.
- Builder/Quick Copy n√£o estava dispon√≠vel neste ambiente; a refer√™ncia visual usada foi `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`.
- N√£o houve altera√ß√£o em `backend/prisma/schema.prisma` nem em migrations; por isso `pnpm --dir backend db:migrate` n√£o foi executado.

## Valida√ß√µes executadas

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `buildPatientsDashboard({})` em banco local retornou dados reais: `total_patients=8`, `active_patients=8`, `inactive_patients=0`, `new_signups=8`, `recent=5`, `export.available=false`.
- `buildPatientsDashboard({ from: "2026-01-01", to: "2026-04-30" })` retornou `status=400` por exceder o limite de 90 dias.
- Backend local rec√©m-iniciado em `http://localhost:3101` respondeu `401` para `GET /api/admin/private/patients/dashboard` sem token admin.
- Rota local `http://localhost:3002/pacientes` respondeu `200` no servidor Admin local.

## ADR

- ADR-0240: Dashboard Admin de pacientes com dados agregados e sem reten√ß√£o V1.

## Ajuste complementar 2026-07-14 - Tempo mÈdio do paciente

- Pedido do usu·rio: alÈm do tempo mÈdio dos psicÛlogos, medir tambÈm o tempo mÈdio de uso dos pacientes.
- O dashboard Admin de Pacientes passou a retornar e exibir `platform_usage.average_duration_seconds`, calculado somente a partir de `page_view_event` autenticado de usu·rios `role="paciente"` no perÌodo selecionado.
- A mÈtrica usa a mesma regra de confiabilidade aplicada ao uso de psicÛlogos: sÛ exibe mÈdia quando pelo menos 50% dos pageviews de pacientes possuem `duration_seconds` positivo; caso contr·rio, mostra indisponibilidade honesta.
- A coleta de duraÁ„o foi ajustada no tracker global da TASK-49 para pausar quando o navegador fica oculto/minimizado e retomar ao voltar, sem contar tempo em background quando o browser informa visibilidade.
- N„o foram criados mocks, backfill artificial, endpoints paralelos, schema Prisma, migrations ou packages novos.
- ReferÍncia visual: `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`; n„o h· protÛtipo especÌfico para este novo card e Builder/Quick Copy n„o est· exposto como ferramenta direta neste ambiente.

### ValidaÁ„o complementar executada

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- ServiÁo local `buildPatientsDashboard({})` retornou `platform_usage` real com `average_duration_seconds=null`, `duration_unavailable_reason="Sem pageviews autenticados de pacientes no perÌodo."`, `pageviews_count=0` e `sessions_count=0` na base local, sem criar dados artificiais.
- `GET /api/admin/private/patients/dashboard` sem sess„o Admin retornou `401`.
- `GET http://localhost:3002/pacientes` retornou `200` no servidor Admin local.

## Ajuste complementar 2026-07-18 - Layout piloto premium em Pacientes

- Pedido do usu·rio: aplicar o layout piloto premium nas p·ginas de pacientes do Admin.
- O dashboard `/pacientes` passou a entrar no escopo visual `admin-premium-pilot`, compartilhando a sidebar clara, tokens azuis Lectum, cards com borda sutil e tipografia mais leve do piloto j· usado em PsicÛlogos/Comunidades.
- A ·rea principal foi reorganizada em um card **Vis„o Geral**, reunindo contadores e gr·fico temporal com curvas SVG suaves, strokes/markers mais finos e plot com superfÌcie limpa.
- A tabela desktop da lista resumida deixou de depender de largura mÌnima fixa e mantÈm cards mobile, evitando scrollbar horizontal na leitura de desktop.
- N„o houve alteraÁ„o de backend, endpoint, contrato, query, schema Prisma, migration, package, seed, mock, dados sensÌveis ou regras de exportaÁ„o/retenÁ„o.
- Builder/Quick Copy n„o est· exposto como ferramenta callable no ambiente; a referÍncia audit·vel continua sendo `_product/proto/admin/Pacientes/Pacientes - Dashboard.png` e o ADR do piloto visual foi atualizado em `adrs/0263-admin-psicologos-piloto-premium.md`.

### ValidaÁ„o complementar executada

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
- ServiÁo local: `buildPatientsDashboard({ period: "year" })` retornou `200 Este ano 3660`.
- ServiÁo local: `buildPatientsDashboard({ period: "all" })` retornou `200 Todo o perÌodo`.

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

## Ajuste pos-feedback 2026-07-19 - Mapa e ranking de localizaÁ„o de pacientes

- Pedido do usu·rio: evoluir o card **LocalizaÁ„o** com um mapa e listagens de cidades e estados mais acessados.
- O endpoint `GET /api/admin/private/patients/dashboard` passou a calcular `locations` com capturas reais de `visitor_location` vinculadas a pacientes dentro do perÌodo selecionado, em vez de usar apenas a ˙ltima localizaÁ„o por paciente sem recorte temporal.
- A UI `/pacientes` agora renderiza um mapa SVG simplificado de UFs brasileiras, sem package novo e sem usar imagem do protÛtipo como gr·fico final.
- O card tambÈm exibe rankings **Top estados** e **Top cidades**, usando apenas agregados reais. Cidades com frequÍncia menor que 2 capturas s„o agrupadas em **Outras cidades** para reduzir exposiÁ„o em dado sensÌvel de sa˙de.
- Locais fora do Brasil continuam aparecendo nas listagens; o mapa informa quando n„o h· UF brasileira identificada.
- N„o houve schema Prisma, migration, package novo, seed, mock, backfill artificial ou endpoint paralelo.
- Builder/Quick Copy n„o est· exposto como ferramenta callable neste ambiente; a referÍncia audit·vel continua sendo `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`, complementada pelos screenshots enviados pelo usu·rio em 2026-07-18/2026-07-19.

### ValidaÁ„o complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/repositories/AdminPatientsDashboardRepository.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- ServiÁo local `buildPatientsDashboard({ period: "all" })` retornou `status=200`, `locations.total=0`, `states=[]` e `cities=[]` na base local atual, sem criar dados artificiais.
- Smoke HTTP local `GET http://localhost:3002/pacientes` retornou `200`.
- Browser local headless em `http://localhost:3002/pacientes` carregou o fluxo protegido e exibiu redirecionamento para login por ausÍncia de sess„o Admin compartilhada; a validaÁ„o visual autenticada ficou limitada ao build/cÛdigo porque n„o usei nem criei credencial Admin artificial.

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
