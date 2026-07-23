# ADR-0294: Estatisticas de comunidade do paciente no Admin

## Status

Accepted

## Task relacionada

TASK-61

## Contexto

A aba **Estatisticas** do detalhe administrativo de paciente ainda mostrava o bloco antigo de
engajamento com cinco contadores. Apos feedback em 2026-07-20, a tela precisava seguir a mesma
hierarquia visual do bloco **Estatisticas de comunidade** do detalhe administrativo do psicologo,
mas com contadores especificos para paciente.

A decisao precisava preservar a regra de dados reais: nao criar mock, seed, backfill artificial,
tracking novo ou endpoint paralelo apenas para preencher a UI.

## Decisao

- Manter o contrato real `GET /api/admin/private/patients/:id` como fonte da aba do paciente.
- Trocar os contadores de comunidade do paciente para: **Posts**, **Comentarios totais**,
  **Respostas de psicologos verificados**, **Upvotes**, **Downvotes**, **Salvamentos** e
  **Compartilhamentos**.
- Contar respostas verificadas apenas quando a resposta vier de `post_reply.author.role="psicologo"`
  com entitlement profissional verificado pelo helper canonico `isVerifiedProfessionalEntitlement`.
- Contar salvamentos recebidos por `post_save` e `post_reply_save` sobre posts/respostas do paciente,
  excluindo autoacoes do proprio paciente.
- Contar compartilhamentos recebidos por `post_share` sobre posts/respostas do paciente, incluindo
  compartilhamentos anonimos reais e excluindo autoacoes autenticadas do proprio paciente.
- Reusar o layout mobile-first do bloco de comunidade com carrossel horizontal de contadores e grafico
  de series reais, sem criar design system paralelo.

## Consequencias

- A aba de paciente ganha paridade visual com o bloco de comunidade do psicologo sem acoplar os dois
  dominios ou misturar contratos.
- A serie temporal agora reflete todos os sete contadores solicitados.
- "Respostas de psicologos verificados" nao conta respostas de pacientes, psicologos sem entitlement
  profissional vigente ou terceiros sem verificacao.
- Nao houve alteracao em Prisma schema, migrations, packages ou tracking.

## Validacao

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts" "src/modules/api/admin/private/patients/detail/repositories/AdminPatientDetailRepository.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Service local: `showAdminPatient({ id: "cmrqsr926001d1guhoz10yvaz", period: "month" })`
  retornou `200` com os sete contadores e series correspondentes.
- Smoke HTTP local: `GET http://localhost:3002/pacientes/cmrqsr926001d1guhoz10yvaz?tab=estatisticas`
  retornou `200`.

## Pendencias

- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias
  auditaveis foram a captura enviada pelo usuario, `_product/proto/admin/Pacientes/Pacientes -
  Detalhes.png` e `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`.

## Revisao 2026-07-21 - Paridade visual fina com psicologo

### Contexto

Novo feedback indicou que a aba **Estatisticas** do paciente ainda preservava detalhes visuais diferentes do bloco equivalente de psicologos: legenda solta, badge tecnico de timezone, icones de voto diferentes e ausencia dos filtros de periodo/data no header do card.

### Decisao

- Manter `GET /api/admin/private/patients/:id` como fonte unica dos dados reais da aba.
- Levar os filtros **Periodo**, **De** e **Ate** para o card **Estatisticas de comunidade**, com presets equivalentes aos do psicologo e **Personalizado** apenas como estado derivado de datas manuais.
- Usar **Todo o periodo** como estado inicial sem segunda chamada HTTP redundante; os demais periodos continuam consultando o backend com `period/from/to`.
- Transformar os cards de metricas em toggles de series, com icones e cores alinhados ao padrao do psicologo, incluindo setas para upvotes/downvotes.
- Remover a legenda visual antiga e o badge cru `America/Sao_Paulo`; manter apenas copy humana de fuso de Brasilia no heatmap.

### Consequencias

- A aba de paciente fica visualmente consistente com o detalhe de psicologos sem criar componente compartilhado prematuro nem acoplar contratos de dominio distintos.
- O admin continua trabalhando apenas com dados reais persistidos e filtros suportados pelo contrato existente.
- Nao houve alteracao de schema Prisma, migration, package, seed, mock, tracking ou endpoint paralelo.

### Validacao

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx" "src/api/callers/patients/index.ts"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Browser local/headless via Chrome/CDP em `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=estatisticas`, desktop `1365x900` e mobile `390x844`, validando filtros, cards toggles, grafico, remocao do badge de timezone e remocao da legenda antiga.

## Revisao 2026-07-21 - Blocos inferiores com modelo das estatisticas do psicologo

### Contexto

Novo feedback pediu que os blocos abaixo de **Estatisticas de comunidade** no detalhe de paciente tambem seguissem o mesmo modelo ja aplicado no detalhe de psicologo: **Comunidades ativas**, **Horarios de maior atividade** e **Uso da plataforma**, incluindo filtros de periodo/data, cards e tabelas com a mesma hierarquia visual.

### Decisao

- Manter `GET /api/admin/private/patients/:id` como fonte unica da aba, ampliando o contrato do detalhe em vez de criar endpoint paralelo por bloco.
- Enriquecer `active_communities` com posts, comentarios, votos e salvamentos por comunidade, alem de status de membro e total de interacoes.
- Incluir `platform_usage` no detalhe do paciente a partir de eventos reais de `page_view_event`, `important_action_event` e eventos de comunidade/avaliacao ja persistidos.
- Permitir que **Comunidades ativas**, **Horarios de maior atividade** e **Uso da plataforma** tenham filtros independentes **Periodo**, **De** e **Ate** reutilizando o mesmo contrato de periodo do detalhe.
- Marcar duracao media como indisponivel quando a cobertura de `duration_ms` dos pageviews for insuficiente, em vez de inferir ou preencher dado artificial.

### Consequencias

- A aba de paciente passa a ter a mesma narrativa analitica do psicologo sem duplicar rotas nem misturar modelos de dominio.
- O custo operacional e de manutencao fica concentrado no contrato existente do detalhe, com refetch independente por bloco no Admin quando o operador altera filtros.
- Os estados vazios continuam honestos para pacientes sem interacao no periodo.
- Nao houve schema Prisma, migration, package novo, seed, backfill, mock, tracking novo ou endpoint simulado.

### Validacao

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts" "src/modules/api/admin/private/patients/detail/repositories/AdminPatientDetailRepository.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless via Chrome/CDP em `/pacientes/cmrb6fbix0000y0uhdpu1bptl?tab=estatisticas`, desktop `1365x900` e mobile `390x844`, validando os quatro blocos, filtros independentes, tabela de comunidades ativas, filtro de dia da semana, resumo de uso da plataforma, remocao de elementos antigos e `scrollWidth=390` no mobile.

## Revisao 2026-07-23 - Nomenclatura direcional e denuncias na estatistica

### Contexto

Feedback de produto identificou ambiguidade nos contadores da aba **Estatisticas** do paciente:
alguns indicadores representam acoes feitas pelo paciente, enquanto outros representam engajamento
recebido no conteudo dele.

### Decisao

- Renomear os contadores do bloco **Estatisticas de comunidade** para explicitar a direcao:
  **Posts feitos**, **Comentarios feitos**, **Upvotes (recebido)**,
  **Downvotes (recebidos)**, **Salvamentos (recebidos)** e
  **Compartilhamentos (recebidos)**.
- Incluir **Denuncias (recebidas)** no mesmo carrossel e na serie temporal, usando o contador real
  `reports_received` ja calculado a partir de `post_report` em posts/respostas do paciente.
- Manter **Respostas de psicologos verificados** inalterado, pois o label ja descreve a fonte de
  interacao recebida.
- Nao criar tracking, endpoint paralelo, schema Prisma, migration, package, seed, mock ou backfill.

### Consequencias

- O Admin passa a distinguir visualmente acoes feitas pelo paciente de engajamentos recebidos.
- Denuncias recebidas podem ser comparadas no mesmo periodo e exibidas no grafico junto aos demais
  contadores reais.
- A semantica de calculo permanece a mesma: posts/comentarios sao autorias do paciente; votos,
  salvamentos, compartilhamentos e denuncias sao recebidos no conteudo do paciente.

### Validacao

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `cmd /c pnpm check`
- Service local `showAdminPatient({ id: "cmrqsrab5001f1guh2ve5oy90", period: "all" })` confirmou os labels novos, `reports_received` e `series.source` com `post_report`.
- Browser local/headless via Chrome CDP em `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=estatisticas`, desktop `1365x900` e mobile `390x844`, validou todos os labels direcionais, **Denuncias (recebidas)** no bloco e `scrollWidth=390` no mobile; admin temporario real removido ao final.
