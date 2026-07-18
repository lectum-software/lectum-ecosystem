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
