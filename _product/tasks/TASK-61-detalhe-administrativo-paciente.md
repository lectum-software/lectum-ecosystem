# TASK-61: Detalhe administrativo do paciente

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-61 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-60 |
| ADR alvo | ADR sobre exposição administrativa de dados pessoais de pacientes |

## Contexto

A tela de detalhe do paciente usa como referência `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.

Esta tela é operacional e deve ser **somente leitura** na V1. O Admin visualiza perfil resumido, engajamento, atividade recente, comunidades e horários de maior atividade quando houver fonte real.

Decisões de produto:

- Não implementar bloqueio ou silenciamento de paciente.
- Não implementar taxa de retenção.
- Não criar ações administrativas destrutivas.
- Não expor dados sensíveis além do necessário para operação.

## Objetivo

Criar a tela de detalhe administrativo do paciente com dados reais e uma leitura simples de engajamento, sem moderação, sem retenção e sem ações de bloqueio/silenciamento.

## Pré-requisitos e bloqueios

- TASK-60 concluída com navegação da lista para o detalhe.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Pacientes/Pacientes - Detalhes.png` como referência visual local.
- Definir em ADR quais dados pessoais do paciente podem ser exibidos no Admin V1.

## Escopo frontend

- Criar rota protegida:
  - `/patients/[id]` ou equivalente.
- Renderizar:
  - botão "Voltar para pacientes";
  - cabeçalho com avatar, nome, ID do paciente, status básico, e-mail, gênero, localização agregada quando disponível, data de cadastro e origem de cadastro;
  - cards de engajamento;
  - gráfico de engajamento por período;
  - lista de atividade recente;
  - comunidades mais ativas;
  - heatmap de horários de maior atividade, quando houver dados reais.
- Status:
  - usar apenas `Ativo`/`Inativo` baseado em `user.active`;
  - não mostrar "Bloqueado" ou "Silenciado".
- Menu de três pontos:
  - omitir se não houver ações reais e seguras;
  - não incluir bloquear, silenciar, deletar ou moderar.

## Escopo backend

- Criar endpoint admin privado:
  - `GET /api/admin/private/patients/:id?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Retornar dados reais de:
  - `user`;
  - `patient_profile`;
  - `visitor_location` somente para localização agregada/coarse quando houver;
  - `community_member`;
  - `community_post`;
  - `post_reply`;
  - `post_vote`;
  - `post_save`;
  - `post_reply_save`;
  - `professional_review` quando o paciente for autor de avaliação, somente se necessário para atividade recente e respeitando regras de privacidade.

## Fora do escopo

- Silenciar, banir, moderar parcialmente ou aplicar restricoes fora da aba **Conta**.
- Acoes de conta/acesso (suspender, desativar, encerrar sessoes e excluir) foram reabertas por feedback explicito de 2026-07-20 e ficam limitadas a paridade auditada com a aba **Conta** do detalhe do psicologo.
- Moderação de publicações, comentários, votos ou avaliações.
- Taxa de retenção.
- Exibir localização precisa.
- Exibir telefone, nascimento, bio ou dados sensíveis sem decisão explícita.
- Criar novo modelo de auditoria.
- Criar tracking novo apenas para preencher a tela.

## Contrato técnico detalhado

Métricas de engajamento V1:

- **Posts criados**: contagem de `community_post.author_id = patient.id`.
- **Comentários**: contagem de `post_reply.author_id = patient.id`.
- **Upvotes recebidos**:
  - votos positivos em posts do paciente;
  - votos positivos em respostas do paciente;
  - se não for possível cobrir ambos com segurança, retornar nota de cobertura.
- **Downvotes recebidos**:
  - votos negativos em posts do paciente;
  - votos negativos em respostas do paciente;
  - se não for possível cobrir ambos com segurança, retornar nota de cobertura.
- **Respostas recebidas**:
  - respostas em posts criados pelo paciente;
  - replies encadeadas para respostas do paciente quando houver relação confiável.

Atividade recente:

- Derivar apenas de eventos reais existentes:
  - post criado;
  - comentário/resposta criada;
  - voto realizado;
  - post salvo;
  - resposta salva;
  - entrada em comunidade;
  - avaliação criada;
  - login apenas se houver fonte real de sessão/login.
- Não exibir "fez login" se não existir evento confiável de login/sessão.

Comunidades mais ativas:

- Combinar participação (`community_member`) com interações do paciente em cada comunidade.
- Mostrar contagem de interações no período.
- Exibir "seguindo"/"membro" somente se vier de `community_member` real.

Heatmap:

- Calcular por dia da semana e hora a partir de `createdAt` de posts, comentários, votos e salvamentos.
- Usar fuso `America/Sao_Paulo`/Brasília na agregação e informar a referência na UI.
- Se não houver eventos suficientes, exibir estado vazio honesto.

Privacidade/LGPD:

- E-mail pode ser exibido para admin autenticado se aprovado no ADR da task.
- Localização deve ser coarse e derivada de `visitor_location` ou omitida.
- Não expor IP, coordenadas, endereço completo, telefone, data de nascimento ou bio nesta V1.

Frontend esperado:

- Reutilizar shell Admin e componentes existentes.
- Mobile-first:
  - cabeçalho empilhado em mobile;
  - cards em grid responsivo;
  - listas legíveis sem tabela horizontal obrigatória.
- `Image` de `next/image` para avatar.
- Filtro de período com RHF/Zod/controllers se implementado como form.

## Critérios de aceite

- [x] Rota de detalhe só abre para admin autenticado.
- [x] Tela mantem ausencia de moderacao/silenciamento parcial e ganhou edicao administrativa auditada limitada de genero em Dados pessoais apos feedback de 2026-07-20.
- [x] A aba **Conta** possui acoes auditadas de conta/acesso por paridade com psicologo: alterar e-mail, reenviar confirmacao, reset/senha temporaria, encerrar sessoes, suspender, desativar e excluir.
- [x] Nao ha acao de silenciar, banir ou moderar paciente fora dos fluxos explicitos de conta/acesso.
- [x] Não há métrica de retenção.
- [x] Status usa apenas `Ativo`/`Inativo` baseado em fonte real.
- [x] Métricas de engajamento usam dados reais.
- [x] Atividade recente lista apenas eventos com fonte confiável.
- [x] "Fez login" só aparece se houver evento real de login/sessão.
- [x] Comunidades mais ativas são calculadas por interações reais.
- [x] Heatmap usa eventos reais e informa fuso horário.
- [x] Dados sensíveis são omitidos ou tratados conforme ADR.
- [x] UI mobile-first validada.
- [x] Nenhum `<img>` cru foi usado.
- [x] `_product/proto/admin/Pacientes/Pacientes - Detalhes.png` foi citada como referência visual.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Checks/builds relevantes executados sem erros.
- [x] ADR criado/atualizado sobre exposição de dados pessoais do paciente.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real e paciente real.

## Execução TASK-61

- Implementado endpoint admin privado `GET /api/admin/private/patients/:id?from=YYYY-MM-DD&to=YYYY-MM-DD` com autenticação admin real.
- Implementada tela protegida em `admin/src/app/(admin)/pacientes/[id]` usando o shell Admin existente.
- A tela é somente leitura, sem menu de ações destrutivas, sem bloqueio/silenciamento/banimento/exclusão/moderação e sem métrica de retenção.
- Status do paciente deriva exclusivamente de `user.active` e exibe apenas `Ativo`/`Inativo`.
- Métricas de engajamento usam dados reais de `community_post`, `post_reply`, `post_vote`, `post_save`, `post_reply_save`, `community_member` e `professional_review`.
- Atividades recentes são derivadas somente de eventos reais existentes; login não é exibido porque não há evento confiável de login/sessão para esta V1.
- Comunidades mais ativas combinam vínculo real de `community_member` com interações reais do paciente.
- Heatmap usa `createdAt` de eventos reais e informa o fuso `America/Sao_Paulo`/Brasília.
- Dados sensíveis foram omitidos conforme ADR-0241: sem telefone, nascimento, bio, endereço completo, IP ou coordenadas.
- UI implementada mobile-first com grids responsivos, cards empilhados em mobile e `Image` de `next/image` para avatar.
- Referência visual usada: `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- Builder/Quick Copy não esteve disponível como ferramenta neste ambiente; a limitação foi registrada no ADR-0241 e na própria UI.
- Não houve alteração em `backend/prisma/schema.prisma` nem em migrations; portanto `db:migrate` não se aplicou.

## Validações executadas

- `pnpm --dir backend check` — OK.
- `pnpm --dir backend build` — OK.
- `pnpm --dir admin check` — OK.
- `pnpm --dir admin build` — OK.
- `pnpm check` — OK.
- Service `showAdminPatient` validado contra paciente real existente no banco local (`demo-patient-reviewer-01`) — OK.
- Range inválido maior que 90 dias validado retornando `400 invalid_analytics_date_range` — OK.
- Endpoint HTTP sem token admin validado retornando `401` — OK.
- Rota local Admin `/pacientes/demo-patient-reviewer-01` validada com HTTP `200` no dev server — OK.

## ADR

- ADR-0241 — Detalhe Admin de paciente somente leitura e dados pessoais mínimos.

## Ajuste complementar 2026-07-18 - Layout piloto premium no detalhe

- Pedido do usu�rio: aplicar o layout piloto premium nas p�ginas de pacientes do Admin.
- A rota `/pacientes/[id]` passou a entrar no escopo visual `admin-premium-pilot`, preservando a tela somente leitura e todos os dados reais existentes.
- O cabe�alho operacional e os filtros passaram a usar superf�cie/borda/sombra do piloto; os cards de m�tricas foram compactados com pesos tipogr�ficos mais leves.
- O gr�fico de engajamento passou a usar curvas SVG suaves com `buildSmoothSvgPath`, strokes/markers mais finos e plot limpo com borda sutil.
- A s�rie **Coment�rios** deixou de depender de `var(--admin-info)` inexistente e passou a usar cor real definida no componente.
- N�o houve altera��o de backend, endpoint, contrato, query, schema Prisma, migration, package, seed, mock, dados sens�veis ou a��es administrativas de paciente.
- Builder/Quick Copy n�o est� exposto como ferramenta callable no ambiente; a refer�ncia audit�vel continua sendo `_product/proto/admin/Pacientes/Pacientes - Detalhes.png` e o ADR do piloto visual foi atualizado em `adrs/0263-admin-psicologos-piloto-premium.md`.

### Valida��o complementar executada

- `pnpm --dir admin exec biome check --write "src/components/admin-shell/shell.tsx" "src/app/(admin)/pacientes/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes/demo-patient-reviewer-01` retornou `200`.

## Ajuste pos-feedback 2026-07-18 - Seletor de periodo no header

- Pedido do usuario: manter as paginas de Pacientes alinhadas ao dashboard de Psicologos, removendo os atalhos visuais de 7, 30 e 90 dias no header.
- O header de `/pacientes/[id]` passou a exibir o seletor **Periodo** com presets reais suportados pelo contrato atual: **Hoje**, **Esta semana** e **Este mes**.
- A edicao manual dos campos `De`/`Ate` continua gerando periodo **Personalizado** via `useDateRangeCommitOnBlur`, sem mock e sem mudar endpoint.
- A linha solta **Periodo consultado:** abaixo do header foi removida.
- As opcoes **Este ano** e **Todo o periodo** nao foram adicionadas porque o endpoint de detalhe de Pacientes V1 valida `from`/`to` com limite maximo de 90 dias.
- Nao houve alteracao de backend, contrato HTTP, schema Prisma, migration, package, seed, dado sensivel ou acao administrativa.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes/demo-patient-reviewer-01` retornou `200`.

## Ajuste pos-feedback 2026-07-18 - Opcoes completas no seletor de periodo

- Pedido do usuario: adicionar as opcoes do seletor de **Periodo** conforme o padrao das demais paginas do painel Admin.
- O detalhe `/pacientes/[id]` agora oferece **Hoje**, **Esta semana**, **Este mes**, **Este ano**, **Todo o periodo** e **Personalizado**.
- Para nao expor opcoes falsas, o endpoint `GET /api/admin/private/patients/:id` passou a aceitar `period=today|week|month|year|all|custom` e a resolver os presets no backend.
- O limite de periodo do detalhe de Pacientes foi alinhado ao dashboard de Psicologos (`max_days=3660`) para suportar **Este ano** e **Todo o periodo** com dados reais.
- Em **Todo o periodo**, o detalhe usa o `user.createdAt` do paciente aberto como inicio real do intervalo.
- Nao houve schema Prisma, migration, package novo, seed, mock, backfill artificial ou ampliacao de dados sensiveis retornados.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts" "src/modules/api/admin/private/patients/dashboard/validator/index.ts" "src/modules/api/admin/private/patients/detail/validator/index.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Servi�o local: `showAdminPatient({ id: "demo-patient-reviewer-01", period: "year" })` retornou `200 Este ano 3660`.

## Ajuste pos-feedback 2026-07-19 - Remocao dos controles superiores do detalhe

- Pedido do usuario: remover o bloco superior, o botao **Voltar para pacientes** e os filtros de **Periodo**, **De** e **Ate** dentro de `/pacientes/[id]`.
- A rota agora inicia diretamente pelo card de identificacao do paciente, reduzindo redundancia visual e preservando o layout mobile-first.
- A consulta permanece usando dados reais do contrato atual, sem expor controles visuais de periodo/data nesta tela.
- Nao houve alteracao de backend, endpoint, contrato HTTP, schema Prisma, migration, package, seed, mock, dado sensivel ou acao administrativa.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes/demo-patient-reviewer-01` retornou `200`.

## Ajuste pos-feedback 2026-07-19 - Header do paciente com abas

- Pedido do usuario: fazer o header do detalhe de paciente seguir o layout do header do psicologo.
- O header de `/pacientes/[id]` passou a exibir o bloco de identidade com hierarquia visual equivalente ao detalhe de Psicologos e menu de abas: **Geral**, **Perfil e cadastro**, **Estatisticas**, **Publicacoes**, **Denuncias**, **Atividades** e **Conta**.
- As abas usam `?tab=` no App Router e reaproveitam somente dados reais ja retornados pelo contrato atual de paciente.
- Abas sem contrato dedicado, como **Denuncias**, exibem estado honesto sem simular dados ou acoes.
- Nao houve alteracao de backend, endpoint, contrato HTTP, schema Prisma, migration, package, seed, mock, dado sensivel ou acao administrativa.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: `GET http://localhost:3002/pacientes/demo-patient-reviewer-01` retornou `200`.
- Smoke HTTP local: `GET http://localhost:3002/pacientes/demo-patient-reviewer-01?tab=perfil` retornou `200`.
- `pnpm check` foi tentado, mas falhou em `pnpm --dir backend check` por erros TypeScript preexistentes em m�dulos backend n�o alterados nesta execu��o.

## Ajuste pos-feedback 2026-07-19 - Copy e metadado do header do paciente

- Pedido do usu�rio: remover o ID do header do detalhe do paciente, reduzir a copy de localiza��o ausente e trocar a linha de cadastro/onboarding pela data/hora de �ltimo acesso.
- O header de `/pacientes/[id]` agora mostra apenas **Paciente** abaixo do nome, sem o identificador visual nessa �rea.
- A localiza��o ausente passou de **Localiza��o agregada n�o capturada** para **Localiza��o n�o capturada**.
- O endpoint `GET /api/admin/private/patients/:id` passou a retornar `header.last_access_at` calculado a partir de `user_token.createdAt/updatedAt` real, sem tracking novo, seed, mock ou backfill.
- Quando n�o houver token real, a UI exibe estado honesto de informa��o n�o capturada pelo formatador existente.
- N�o houve schema Prisma, migration, package novo, a��o administrativa ou amplia��o de dados sens�veis al�m do metadado operacional de �ltimo acesso aprovado no ADR-0241.

## Ajuste pos-feedback 2026-07-19 - Status da conta no header

- Pedido do usu�rio: no header do detalhe do paciente, substituir a forma de cadastro pelo status da conta e remover a tag verde **Ativo** ao lado do nome.
- O header agora mant�m o status operacional apenas na linha de metadados como **Status da conta: Ativo/Inativo**, derivado de `user.active` real.
- A forma de cadastro continua dispon�vel nas abas internas de cadastro/conta, mas n�o aparece mais no header.
- N�o houve backend novo, schema Prisma, migration, package, seed, mock, tracking, dado sens�vel ou a��o administrativa.

## Ajuste pos-feedback 2026-07-19 - Ordem dos metadados do header

- Pedido do usu�rio: remover g�nero do header, trocar **Status da conta: Ativo** por **Conta ativa** e posicionar o status entre e-mail e localiza��o.
- O header agora lista e-mail, status da conta e localiza��o, nesta ordem.
- G�nero permanece somente na aba **Perfil e cadastro**, usando o dado real existente, e n�o aparece mais no header.

## Ajuste pos-feedback 2026-07-19 - Abas internas padronizadas com Psicologos

- Pedido do usuario: padronizar as abas de detalhe do paciente conforme o detalhe administrativo do psicologo, mantendo o volume reduzido de dados de pacientes.
- A aba **Geral** passou a seguir o mesmo padrao de leitura do psicologo: metricas principais no topo, tres cards de situacao (`Situacao da conta`, `Cadastro do paciente`, `Engajamento`) e atividades recentes em tabela.
- A aba **Perfil e cadastro** passou a usar cards com icone e `FieldRow` responsivo, concentrando somente nome, e-mail, genero, localizacao agregada, status, origem, criacao e onboarding.
- As abas **Estatisticas**, **Publicacoes**, **Denuncias**, **Atividades** e **Conta** foram alinhadas visualmente aos cards/listas do psicologo, sem criar paridade falsa de dados nem endpoint dedicado quando o contrato V1 nao existe.
- O header manteve o padrao ja ajustado com metadados em linha e abas com underline igual ao detalhe do psicologo.
- Nao houve alteracao de backend, contrato HTTP, schema Prisma, migration, package, seed, mock, tracking, dado sensivel novo ou acao administrativa de paciente.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia auditavel foi a captura enviada pelo usuario e os PNGs locais `_product/proto/admin/Pacientes/Pacientes - Detalhes.png` e `_product/proto/admin/Psicologos/Detalhes do psicologo/Perfil e Cadastro.png`.
- ADR criado: `adrs/0287-admin-paciente-abas-padronizadas.md`.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `/pacientes/cmrqsrab5001f1guh2ve5oy90`, `?tab=perfil`, `?tab=estatisticas`, `?tab=publicacoes`, `?tab=denuncias`, `?tab=atividades` e `?tab=conta` retornaram `200`.


## Ajuste pos-feedback 2026-07-20 - Dados pessoais sem blocos extras e edicao auditada

- Pedido do usuario: na aba **Perfil e cadastro** do detalhe de paciente, remover o bloco **Cadastro**, remover a faixa **Privacidade e cobertura dos dados**, retirar a descricao de **Dados pessoais**, manter apenas **E-mail**, **Genero** e **Localizacao** e adicionar o botao **Editar** como no detalhe do psicologo.
- A aba **Perfil e cadastro** agora renderiza somente o card **Dados pessoais**, sem descricao, com campos **E-mail**, **Genero** e **Localizacao**.
- O botao **Editar** reutiliza o padrao visual do detalhe administrativo do psicologo e abre edicao real, nao mockada, limitada ao campo **Genero**.
- **E-mail** e **Localizacao** permanecem somente leitura: e-mail pertence ao fluxo de conta e a localizacao coarse deriva de visitor_location, sem edicao manual.
- Criado endpoint admin privado `PUT /api/admin/private/patients/:id/personal-data` para persistir `patient_profile.gender` com motivo obrigatorio e auditoria em `admin_activity_log` (`target_type="patient"`, `domain="patient_profile"`, `action="patient_personal_data_updated"`).
- Nenhum schema Prisma, migration, package, mock, seed, backfill, acao destrutiva, moderacao, bloqueio, silenciamento, banimento ou exclusao de paciente foi adicionado.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia auditavel foi a captura enviada pelo usuario e os PNGs locais `_product/proto/admin/Pacientes/Pacientes - Detalhes.png` e `_product/proto/admin/Psicologos/Detalhes do psicologo/Perfil e Cadastro.png`.
- ADR criado: `adrs/0290-admin-paciente-edicao-dados-pessoais-limitada.md`.

### Validacao complementar executada

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=perfil` retornou `200`.
- Smoke HTTP local: `GET http://localhost:3002/pacientes/cmrqsrab5001f1guh2ve5oy90` retornou `200`.
- Smoke HTTP local sem token: `PUT http://localhost:3001/api/admin/private/patients/cmrqsrab5001f1guh2ve5oy90/personal-data` retornou `401`.

## Ajuste pos-feedback 2026-07-20 - Paridade da aba Conta com psicologo

- Pedido do usuario: em detalhes do paciente, na aba **Conta**, replicar as mesmas opcoes existentes na aba **Conta** do detalhe do psicologo.
- A decisao anterior de conta somente leitura da TASK-61 foi substituida apenas para a area de conta/acesso: permanecem fora do escopo silenciamento, banimento, moderacao parcial e automacoes de moderacao de paciente.
- Criado endpoint admin privado `/api/admin/private/patients/:id/account` com as mesmas familias de operacoes do psicologo: resumo, alteracao de e-mail, reenvio de confirmacao, reset de senha, senha temporaria, encerramento de sessoes, suspensao, desativacao e exclusao.
- Todas as operacoes exigem admin autenticado, motivo interno, confirmacao forte quando aplicavel e registram `admin_activity_log` com `target_type="patient"` e `domain="patient_account"`.
- A UI da aba **Conta** passou a usar React Hook Form, Zod e controllers existentes, mobile-first, com cards equivalentes aos do psicologo e estados honestos para contas Google sem senha local.
- Nao houve schema Prisma, migration, package novo, seed, mock ou endpoint simulado. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia auditavel foi a captura enviada pelo usuario e o padrao ja implementado em `/psicologos/[id]?tab=conta`.
- ADR criado: `adrs/0291-admin-paciente-conta-acesso-paridade-psicologo.md`.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/api/cache/keys.ts" "src/api/callers/patients/index.ts" "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend exec biome check --write "src/main/server/imports/write.ts" "src/modules/api/private/account/repositories/AccountRepository.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts" "src/modules/api/admin/private/patients/account/index.ts" "src/modules/api/admin/private/patients/account/DTOs/IAdminPatientAccountDTO.ts" "src/modules/api/admin/private/patients/account/repositories/AdminPatientAccountRepository.ts" "src/modules/api/admin/private/patients/account/use-cases/controller.ts" "src/modules/api/admin/private/patients/account/use-cases/services.ts" "src/modules/api/admin/private/patients/account/validator/index.ts"`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`

- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=conta` retornou `200`.
- Smoke HTTP local sem token: `POST http://localhost:3001/api/admin/private/patients/cmrqsrab5001f1guh2ve5oy90/account/suspend` retornou `401`.

## Ajuste pos-feedback 2026-07-20 - Correção de encoding dos textos

- Pedido do usuário: ajustar textos quebrados exibidos no detalhe administrativo de paciente.
- Corrigidos literais UTF-8 corrompidos no Admin em `/pacientes/[id]`, incluindo abas, métricas, cards de situação, tabelas, estados vazios e mensagens de formulário.
- Corrigidos labels/descriptions retornados pelo backend em `GET /api/admin/private/patients/:id`, para que o contrato não entregue copies com mojibake.
- Corrigidos textos compartilhados do frontend e mensagens operacionais pontuais que apresentavam o mesmo problema de encoding.
- Não houve alteração de contrato HTTP, schema Prisma, migration, package, seed, mock, endpoint simulado ou regra de domínio.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência auditável foi a captura enviada pelo usuário e o inventário local `_product/tasks/PROTO-INVENTORY.md`.
- ADR criado: `adrs/0292-correcao-encoding-copy-ui-admin.md`.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes/cmrqsr926001d1guhoz10yvaz` retornou `200`.


## Ajuste pos-feedback 2026-07-20 - Conta de paciente sem perfil complementar

- Pedido do usuario: explicar/corrigir por que as opcoes da aba **Conta** nao apareciam para o paciente `cmrqsr926001d1guhoz10yvaz`.
- Causa encontrada: esse registro existe em `users` com `role="paciente"`, mas ainda nao possui `patient_profile`; o detalhe carregava pelo `user.id`, enquanto o endpoint novo de **Conta** exigia `patient_profile` e retornava `404 not_found`.
- O backend da aba **Conta** passou a aceitar a mesma identidade do detalhe: usa `patient_profile.id`/`user_id` quando houver perfil e faz fallback real para `users.id` quando o paciente nao deletado ainda nao tiver `patient_profile`.
- As capacidades continuam derivadas de dados reais (`users`, `user_tokens`) e permanecem honestamente bloqueadas quando faltar senha local, sessao ativa ou e-mail pendente.
- Nao houve schema Prisma, migration, pacote novo, seed, mock, backfill ou endpoint simulado.
- ADR atualizado: `adrs/0291-admin-paciente-conta-acesso-paridade-psicologo.md`.

### Validacao complementar executada

- Service local: `showAdminPatientAccount({ id: "cmrqsr926001d1guhoz10yvaz" })` retornou `200`.
- `pnpm --dir backend exec biome check --write src/modules/api/admin/private/patients/account/repositories/AdminPatientAccountRepository.ts`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`

## Ajuste pos-feedback 2026-07-20 - Aba Atividades com paridade do psicologo

- Pedido do usuario: em detalhes do paciente, na aba **Atividades**, replicar a mesma configuracao da pagina de Atividades existente em detalhes do psicologo.
- Criado endpoint admin privado `GET /api/admin/private/patients/:id/activities` com filtros reais de periodo, area, tipo, busca textual e paginacao.
- O feed usa somente fontes reais persistidas: `user`, `patient_profile`, `community_member`, `community_post`, `post_reply`, `post_vote`, `post_save`, `post_reply_save`, `professional_review` e `admin_activity_log`.
- A UI de `/pacientes/[id]?tab=atividades` passou a usar o mesmo layout operacional do psicologo: card de filtros, tabela **Atividades da conta** com colunas **Data**, **Acao**, **Descricao** e **Usuario**, estado vazio e paginacao.
- Login continua nao exibido como evento porque nao ha fonte confiavel de login por ocorrencia nesta V1.
- Exportacao permanece indisponivel porque nao existe endpoint real de exportacao para atividades.
- Nao houve schema Prisma, migration, package novo, seed, mock, tracking novo, dado fake ou endpoint simulado. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia auditavel foi a captura enviada pelo usuario, `_product/proto/admin/Pacientes/Pacientes - Detalhes.png` e o padrao ja implementado em `_product/proto/admin/Psicologos/Detalhes do psicologo/Atividades.png`.
- ADR criado: `adrs/0293-admin-paciente-atividades-paridade-psicologo.md`.

### Validacao complementar executada

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes/cmrqsr926001d1guhoz10yvaz?tab=atividades` retornou `200`.
- Smoke HTTP local sem token: `GET http://localhost:3001/api/admin/private/patients/cmrqsr926001d1guhoz10yvaz/activities` retornou `401`.

## Ajuste pos-feedback 2026-07-20 - Estatisticas de comunidade do paciente

- Pedido do usuario: na aba **Estatisticas** do detalhe de paciente, replicar o bloco **Estatisticas de comunidade** do psicologo com contadores proprios do paciente.
- A aba `/pacientes/[id]?tab=estatisticas` passou a exibir o bloco **Estatisticas de comunidade** com carrossel horizontal de contadores e grafico de series reais.
- Os contadores exibidos agora sao: **Posts**, **Comentarios totais**, **Respostas de psicologos verificados**, **Upvotes**, **Downvotes**, **Salvamentos** e **Compartilhamentos**.
- **Respostas de psicologos verificados** conta apenas `post_reply` em posts/comentarios do paciente quando o autor e psicologo com verificacao/entitlement real pelo helper canonico `isVerifiedProfessionalEntitlement`.
- **Salvamentos** usa `post_save` e `post_reply_save` recebidos em conteudo do paciente, excluindo autoacoes do proprio paciente.
- **Compartilhamentos** usa `post_share` recebido em posts/respostas do paciente, incluindo compartilhamentos anonimos reais e excluindo autoacoes autenticadas do proprio paciente.
- A serie temporal da aba Estatisticas foi ampliada para os sete contadores, sem mock, seed, backfill, tracking novo, endpoint paralelo, schema Prisma, migration ou package novo.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; as referencias auditaveis foram a captura enviada pelo usuario, `_product/proto/admin/Pacientes/Pacientes - Detalhes.png` e `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png`.
- ADR criado: `adrs/0294-admin-paciente-estatisticas-comunidade-paridade.md`.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts" "src/modules/api/admin/private/patients/detail/repositories/AdminPatientDetailRepository.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Service local: `showAdminPatient({ id: "cmrqsr926001d1guhoz10yvaz", period: "month" })` retornou `200` com os sete contadores e a serie temporal correspondente.
- Smoke HTTP local: `GET http://localhost:3002/pacientes/cmrqsr926001d1guhoz10yvaz?tab=estatisticas` retornou `200`.

## Ajuste pos-feedback 2026-07-21 - Denuncias do paciente com layout do psicologo

- Pedido do usuario: replicar o layout da aba **Denuncias** do detalhe do psicologo na pagina de **Denuncias** do paciente e incluir o icone de alerta no menu quando houver alguma denuncia.
- Criado endpoint admin privado `GET /api/admin/private/patients/:id/reports`, protegido por Admin, usando apenas `post_report` real vinculado a conteudo autorado pelo paciente (`community_post.author_id` ou `post_reply.author_id`).
- A aba `/pacientes/[id]?tab=denuncias` passou a usar a mesma composicao visual do psicologo: quatro cards, filtros **Tipo**, **Status**, **Periodo**, **De** e **Ate**, lista de conteudo denunciado, historico do denunciante e link para conteudo publico quando disponivel.
- O menu de abas do paciente agora consulta o total real de denuncias e exibe `AlertTriangle` ao lado de **Denuncias** quando `post_report` retornar total maior que zero.
- A V1 permanece leitura operacional para paciente: sem botoes de resolucao, remocao de conteudo, sancao de conta, silenciamento ou moderacao parcial nesta aba.
- Nao houve schema Prisma, migration, package novo, seed, backfill, mock, endpoint simulado ou dado fake. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; as referencias auditaveis foram as capturas enviadas pelo usuario e o padrao local de `_product/proto/admin/Psicologos/Detalhes do psicologo/Denuncias.png`.
- ADR criado: `adrs/0296-admin-paciente-denuncias-post-report-readonly.md`.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/main/server/imports/write.ts" "src/modules/api/admin/private/patients/reports/DTOs/IAdminPatientReportsDTO.ts" "src/modules/api/admin/private/patients/reports/index.ts" "src/modules/api/admin/private/patients/reports/repositories/AdminPatientReportsRepository.ts" "src/modules/api/admin/private/patients/reports/use-cases/controller.ts" "src/modules/api/admin/private/patients/reports/use-cases/services.ts" "src/modules/api/admin/private/patients/reports/validator/index.ts"`
- `pnpm --dir admin exec biome check --write "src/api/cache/keys.ts" "src/api/callers/patients/index.ts" "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check` passou antes de alteracoes paralelas fora desta entrega. A reexecucao final ficou bloqueada por mudancas nao relacionadas em `backend/src/modules/api/admin/private/moderation/*` com `AdminModerationSummaryDTO.operational_alerts` incompleto.
- Service local: `showAdminPatientReports({ id: "cmrb6fbix0000y0uhdpu1bptl" })` retornou `200`, cards reais de denuncias e item de `post_report`.
- Browser local/headless via Chrome/CDP em `http://localhost:3002/pacientes/cmrb6fbix0000y0uhdpu1bptl?tab=denuncias`, com admin temporario real removido ao final, validou desktop `1365x900` e mobile `390x844`: cards, filtros, lista real de denuncia, icone de alerta no menu e `scrollWidth=390` no mobile.

## Ajuste pos-feedback 2026-07-21 - Paridade visual fina da aba Estatisticas

- Pedido do usuario: a aba **Estatisticas** do detalhe de paciente ainda estava diferente do layout das estatisticas do psicologo, principalmente nos detalhes de icones, filtros de periodo/data e elementos que deveriam sair.
- O bloco **Estatisticas de comunidade** passou a seguir a mesma composicao visual do psicologo: titulo e copy no topo, filtros **Periodo**, **De** e **Ate** no header do card, cards clicaveis como toggles de serie e grafico SVG logo abaixo.
- O seletor de **Periodo** da aba Estatisticas usa os mesmos presets operacionais do psicologo (**Hoje**, **Esta semana**, **Este mes**, **Este ano** e **Todo o periodo**) e mantém **Personalizado** apenas como estado tecnico quando o admin edita datas manuais.
- O periodo inicial da aba ficou em **Todo o periodo** sem refetch redundante, reutilizando o detalhe ja carregado; ao escolher outro preset/data, a aba refaz a consulta real com `period/from/to`.
- Os icones dos contadores foram alinhados ao padrao do psicologo: votos usam setas direcionais, salvamentos usam bookmark e os cards passam a controlar a visibilidade das series.
- Foram removidos da aba Estatisticas o badge cru de timezone (`America/Sao_Paulo`) e a legenda solta antiga abaixo dos cards; o heatmap permanece honesto com copy humana de fuso de Brasilia.
- Nao houve backend novo, contrato HTTP novo, schema Prisma, migration, package, mock, seed, tracking ou ampliacao de dados sensiveis. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; as referencias auditaveis foram a captura enviada pelo usuario e `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png`.
- ADR atualizado: `adrs/0294-admin-paciente-estatisticas-comunidade-paridade.md`.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx" "src/api/callers/patients/index.ts"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Browser local/headless via Chrome/CDP em `http://localhost:3002/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=estatisticas`, com admin temporario real removido ao final, validou desktop `1365x900` e mobile `390x844`: filtros **Periodo/De/Ate**, default **Todo o periodo**, sete cards toggles, grafico SVG novo, sem badge `America/Sao_Paulo`, sem legenda antiga e `scrollWidth=390` no mobile.
- `pnpm check` foi reexecutado e ficou bloqueado por formatacao de uma alteracao paralela nao relacionada em `admin/src/components/admin-shell/shell.tsx`; a validacao de escopo desta entrega permaneceu verde com `biome check` no arquivo alterado, `pnpm --dir admin typecheck` e `pnpm --dir admin build`.

## Ajuste pos-feedback 2026-07-21 - Blocos inferiores das Estatisticas do paciente

- Pedido do usuario: abaixo de **Estatisticas de comunidade**, adicionar e alinhar **Comunidades ativas**, **Horarios de maior atividade** e **Uso da plataforma** seguindo o mesmo modelo usado nas estatisticas do psicologo.
- A aba `/pacientes/[id]?tab=estatisticas` agora renderiza, nesta ordem, **Estatisticas de comunidade**, **Comunidades ativas**, **Horarios de maior atividade** e **Uso da plataforma**, com cards, tabelas, botoes de dia da semana, resumo de uso e estados vazios equivalentes ao padrao visual do psicologo.
- Cada bloco novo possui seus proprios filtros **Periodo**, **De** e **Ate**, iniciando em **Todo o periodo** sem refetch redundante; ao alterar periodo/data, o Admin refaz a consulta real do detalhe do paciente com `period/from/to` para aquele bloco.
- O backend do detalhe do paciente foi ampliado sem endpoint paralelo: `active_communities` agora informa posts, comentarios, votos e salvamentos por comunidade; `platform_usage` consolida pageviews, dias ativos, sessoes aproximadas, paginas mais acessadas, horarios de atividade e instalacao PWA.
- As fontes permanecem reais e persistidas: `page_view_event`, `important_action_event`, `community_post`, `post_reply`, `post_vote`, `post_save`, `post_reply_save`, `community_member` e `professional_review`.
- A duracao media da plataforma fica indisponivel quando a confiabilidade dos eventos de pageview e baixa, evitando apresentar numero inventado; nao houve mock, seed, backfill, tracking novo, schema Prisma, migration, package novo ou endpoint simulado. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; as referencias auditaveis foram as capturas enviadas pelo usuario, `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`, `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png` e a implementacao local do detalhe de psicologo.
- ADR atualizado: `adrs/0294-admin-paciente-estatisticas-comunidade-paridade.md`.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts" "src/modules/api/admin/private/patients/detail/repositories/AdminPatientDetailRepository.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless via Chrome/CDP em `http://localhost:3002/pacientes/cmrb6fbix0000y0uhdpu1bptl?tab=estatisticas`, com admin temporario real removido ao final, validou desktop `1365x900` e mobile `390x844`: quatro blocos da aba, filtros **Periodo/De/Ate** independentes, default **Todo o periodo**, tabela de **Comunidades ativas**, filtro **Todos** nos horarios de maior atividade, resumo de **Uso da plataforma**, sem badge `America/Sao_Paulo`, sem copy antiga do heatmap e `scrollWidth=390` no mobile.

## Ajuste p�s-feedback 2026-07-21 - Acentua��o e ortografia da aba Conta

- Pedido do usu�rio: corrigir acentua��o e ortografia dos textos exibidos na aba **Conta** do detalhe administrativo de paciente.
- Corrigidos labels, avisos, placeholders e toasts da UI de `/pacientes/[id]?tab=conta`, incluindo **M�todo de login**, **Troca obrigat�ria**, **Sem pend�ncia**, **Sess�es ativas**, **Motivo/observa��o interna** e **Confirma��o forte**.
- As confirma��es fortes vis�veis passaram a usar copy correta (`ALTERAR E-MAIL` e `ENCERRAR SESS�ES`) com normaliza��o compat�vel no frontend e backend para aceitar a entrada legada sem acento/h�fen, sem quebrar operadores acostumados ao formato anterior.
- Corrigidas mensagens backend de erro/sucesso da aba de conta do paciente em `backend/locales/pt/translation.json`.
- A contagem `sessao(oes)` foi substitu�da por pluraliza��o leg�vel: `1 sess�o`/`n sess�es` e `1 dispositivo`/`n dispositivos`.
- N�o houve altera��o de schema Prisma, migrations, package, endpoint, seed, mock, dado artificial ou regra de dom�nio.
- Builder/Quick Copy n�o est� exposto como ferramenta callable neste ambiente; a refer�ncia audit�vel foi o screenshot enviado pelo usu�rio em 2026-07-21.
- ADR atualizado: `adrs/0292-correcao-encoding-copy-ui-admin.md`.

### Crit�rios de aceite do ajuste

- [x] Textos vis�veis da aba **Conta** citados no screenshot est�o acentuados corretamente.
- [x] Mensagens backend usadas por a��es da conta do paciente est�o em PT-BR acentuado.
- [x] Confirma��es fortes continuam oper�veis com o formato anterior sem acentos.
- [x] Nenhum `<img>` cru, mock, seed, endpoint novo, migration ou package novo foi adicionado.

### Valida��o complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/account/use-cases/services.ts" "locales/pt/translation.json"`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir admin build`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=conta` retornou `200`.
- Chrome headless local abriu a rota, mas sem sess�o administrativa no perfil headless caiu no login; a confer�ncia autenticada visual ficou limitada ao screenshot enviado pelo usu�rio e � revis�o dos literais corrigidos.
## Ajuste p�s-feedback 2026-07-21 - Publica��es do paciente em tabela

- Pedido do usu�rio: exibir as publica��es do paciente como lista/tabela com colunas **Data**, **Tipo**, **Comunidade**, **Pr�via (t�tulo + descri��o)** e a��es de **Ver** e **Estat�sticas**, com linha de m�tricas abaixo e expansor na pr�pria tabela para ler o conte�do completo do post.
- O endpoint `GET /api/admin/private/patients/:id` foi ampliado com `publications.items`, derivado de `community_post` real do paciente e m�tricas reais de `page_view_event`, `post_reply`, `post_vote`, `post_save`, `post_share` e `post_report`.
- A aba `/pacientes/[id]?tab=publicacoes` deixou de depender do recorte limitado de atividades recentes e agora renderiza uma tabela mobile-first com rolagem horizontal controlada, a��es por linha, m�tricas no padr�o visual das publica��es do psic�logo e expansor de conte�do completo.
- A a��o **Ver** abre a publica��o p�blica e a a��o **Estat�sticas** reutiliza a rota Admin existente de analytics de conte�do (`/comunidades/[slug]/conteudo/post/[id]`), sem endpoint paralelo.
- N�o houve schema Prisma, migration, package novo, seed, mock, backfill, tracking novo, modera��o, edi��o ou remo��o de conte�do.
- Builder/Quick Copy n�o est� exposto como ferramenta callable no ambiente; as refer�ncias audit�veis foram a captura enviada pelo usu�rio, `_product/proto/admin/Pacientes/Pacientes - Detalhes.png` e `_product/proto/admin/Psic�logos/Detalhes do psic�logo/Publica��es.png`.
- ADR criado: `adrs/0299-admin-paciente-publicacoes-tabela-metricas.md`.

### Crit�rios de aceite do ajuste

- [x] A aba **Publica��es** usa posts reais do paciente, n�o atividades recentes truncadas.
- [x] A tabela possui colunas **Data**, **Tipo**, **Comunidade**, **Pr�via** e **A��es**.
- [x] Cada publica��o possui bot�es de **Ver** e **Estat�sticas**.
- [x] Cada publica��o exibe linha de m�tricas abaixo da linha principal.
- [x] O expansor da tabela mostra o conte�do completo do post.
- [x] Nenhum mock, seed, endpoint simulado, package novo ou migration foi adicionado.

### Valida��o complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts" "src/modules/api/admin/private/patients/detail/repositories/AdminPatientDetailRepository.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`

### Valida��o final complementar

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Service local: `showAdminPatient({ id: "cmrb6fbrv0002y0uhsqzg306b", period: "all" })` retornou `publications.items.length=2` e m�tricas reais no primeiro post.
- Browser local/headless via Chrome/CDP em `/pacientes/cmrb6fbrv0002y0uhsqzg306b?tab=publicacoes`, com admin tempor�rio real removido ao final, validou desktop `1365x900` e mobile `390x844`: colunas solicitadas, a��es **Ver**/**Estat�sticas**, linha de m�tricas, expansor de conte�do completo e rolagem horizontal controlada sem overflow global no mobile.
- Observa��o operacional: a primeira reexecu��o de `pnpm --dir admin build` encontrou lock stale em `admin/.next/lock` de build anterior; o arquivo gerado foi removido e o build foi reexecutado com sucesso.

## Ajuste pos-feedback 2026-07-21 - Diagnostico de Engajamento nas Comunidades ativas

- Pedido do usuario: chamar o indicador de **Diagnostico de Engajamento**, usando os rotulos **Muito ativo**, **Ativo**, **Pouco ativo** e **Sem base**, separar **Upvotes** e **Downvotes** e nao exibir comunidades sem atividade real no periodo.
- O bloco **Comunidades ativas** do paciente agora considera atividade real como post, comentario, upvote, downvote ou salvamento realizado pelo paciente na comunidade durante o periodo filtrado; comunidades apenas seguidas e sem interacao nao aparecem.
- A tabela passou a separar **Upvotes** e **Downvotes** em vez de exibir apenas votos agregados, preservando `votes` no contrato como total para compatibilidade.
- O endpoint real `GET /api/admin/private/patients/:id` foi expandido em `communities.items[]` com `upvotes`, `downvotes` e `engagement_diagnosis`, sem endpoint paralelo, mock, seed, backfill artificial, schema Prisma, migration ou package novo.
- A regra compartilhada de diagnostico foi centralizada em `backend/src/utils/admin-community-engagement-diagnosis.ts` e documentada no ADR-0300.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram o screenshot enviado pelo usuario em 2026-07-21 e `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- ADR criado: `adrs/0300-diagnostico-engajamento-comunidades-admin.md`.

### Criterios de aceite do ajuste

- [x] Comunidades sem post, comentario, upvote, downvote ou salvamento real do paciente no periodo nao aparecem em **Comunidades ativas**.
- [x] A tabela mostra **Upvotes** e **Downvotes** separados.
- [x] A tabela mostra **Diagnostico de Engajamento** com **Muito ativo**, **Ativo**, **Pouco ativo** ou **Sem base**.
- [x] Nenhum mock, seed, endpoint simulado, migration ou package novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=estatisticas` retornou `200`.
- Service local: `showAdminPatient({ period: "all" })` retornou votos separados e diagnostico para pacientes com atividade real, e lista vazia para pacientes sem atividade.

## Ajuste pos-feedback 2026-07-21 - Tabela de Comunidades ativas do paciente

- Pedido do usuario: na tabela **Comunidades ativas** do paciente, remover as colunas **Interacoes** e **Status**, adicionar a tag **Seguindo**/**Nao seguindo** junto ao nome da comunidade e encurtar **Diagnostico de Engajamento** para **Engajamento**.
- A alteracao e somente visual no Admin; os dados reais de `interactions`, `is_member` e `engagement_diagnosis` continuam no contrato para ordenacao, compatibilidade e leituras futuras.
- A tabela permanece mobile-first com rolagem horizontal controlada, mas com largura minima menor por ter menos colunas.
- Nao houve alteracao de backend, API, Prisma schema, migrations, packages, mocks, seeds ou dados artificiais; `pnpm --dir backend db:migrate` nao foi necessario.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a validacao visual usou o screenshot enviado pelo usuario em 2026-07-21 e o PNG local `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- ADR atualizado: `adrs/0300-diagnostico-engajamento-comunidades-admin.md`.

### Criterios de aceite do ajuste

- [x] Colunas **Interacoes** e **Status** nao aparecem na tabela de comunidades ativas do paciente.
- [x] A tag **Seguindo**/**Nao seguindo** aparece junto ao nome da comunidade.
- [x] A coluna **Diagnostico de Engajamento** aparece como **Engajamento**.
- [x] Nenhum mock, seed, endpoint simulado, migration ou package novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=estatisticas` retornou `200`.

## Ajuste pos-feedback 2026-07-21 - Contadores da aba Geral de pacientes

- Pedido do usuario: na aba **Geral** do detalhe administrativo de paciente, remover dos contadores **Upvotes**, **Downvotes**, **Salvamentos** e **Compartilhamentos** e trocar **Comentarios totais** por **Comentarios feitos**.
- A aba **Geral** agora mostra somente **Posts**, **Comentarios feitos** e **Respostas de psicologos verificados** nos contadores principais.
- O card resumido de **Engajamento** na aba **Geral** passou a somar apenas os mesmos sinais visiveis nesse recorte, evitando manter votos/salvamentos/compartilhamentos em um contador oculto.
- As metricas removidas continuam disponiveis nos contratos e nas areas analiticas especificas, sem apagar dados reais nem alterar o backend.
- Nao houve alteracao de endpoint, contrato HTTP, schema Prisma, migrations, packages, mocks, seeds ou dados artificiais; `pnpm --dir backend db:migrate` nao foi necessario.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia visual foi o screenshot enviado pelo usuario em 2026-07-21 e o PNG local `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- ADR atualizado: `adrs/0241-admin-detalhe-paciente-dados-minimos-readonly.md`.

### Criterios de aceite do ajuste

- [x] **Upvotes**, **Downvotes**, **Salvamentos** e **Compartilhamentos** nao aparecem nos contadores da aba **Geral**.
- [x] **Comentarios totais** aparece como **Comentarios feitos** na aba **Geral**.
- [x] O resumo de engajamento da aba **Geral** nao soma metricas removidas do recorte visual.
- [x] Nenhum mock, seed, endpoint simulado, migration ou package novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin build`
- Browser local/CDP em `/pacientes/cmrqsrab5001f1guh2ve5oy90`: contadores antigos ausentes, **Comentarios feitos** presente e largura mobile de 390px sem overflow horizontal.
- `pnpm --dir admin check`
- `pnpm check`


## Ajuste pos-feedback 2026-07-21 - Resumo e atividades da aba Geral

- Pedido do usuario: remover o bloco de status de cadastro do paciente, transformar o resumo de **Engajamento** em diagnostico textual, remover linhas operacionais antigas do card, remover **Privacidade e cobertura dos dados** e alinhar **Atividades recentes** ao layout do psicologo.
- O bloco **Cadastro do paciente** saiu da aba **Geral**; dados de cadastro permanecem acessiveis pela aba **Perfil e cadastro** e pela aba **Conta**, sem duplicacao visual.
- O card **Engajamento** agora mostra o diagnostico **Muito ativo**, **Ativo**, **Pouco ativo** ou **Sem base**, derivado apenas de comunidades ativas, posts e respostas reais do periodo padrao.
- O card **Engajamento** removeu as linhas **Periodo**, **Comunidade destaque**, **Eventos no heatmap** e **Fuso** e passou a listar **Comunidades ativas**, **Posts**, **Respostas** e **Ultima atividade**.
- O bloco **Privacidade e cobertura dos dados** foi removido da aba **Geral**; as regras de privacidade permanecem documentadas em ADR e preservadas no contrato.
- **Atividades recentes** passou a usar o mesmo layout do detalhe do psicologo: titulo/copy simples, tabela com **Data**, **Acao**, **Descricao** e **Usuario**, e estado vazio sem badge tecnico de fonte.
- Nao houve alteracao de endpoint, contrato HTTP, schema Prisma, migrations, packages, mocks, seeds ou dados artificiais; `pnpm --dir backend db:migrate` nao foi necessario.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia visual foi o screenshot enviado pelo usuario em 2026-07-21 e o layout local do detalhe de psicologo.
- ADR atualizado: `adrs/0241-admin-detalhe-paciente-dados-minimos-readonly.md`.

### Criterios de aceite do ajuste

- [x] O bloco **Cadastro do paciente** nao aparece na aba **Geral**.
- [x] O card **Engajamento** mostra diagnostico textual em vez de quantidade de sinais.
- [x] O card **Engajamento** lista **Comunidades ativas**, **Posts**, **Respostas** e **Ultima atividade**.
- [x] O bloco **Privacidade e cobertura dos dados** nao aparece na aba **Geral**.
- [x] **Atividades recentes** segue o layout visual do bloco correspondente do detalhe de psicologo.
- [x] Nenhum mock, seed, endpoint simulado, migration ou package novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin build`
- Browser local/CDP em `/pacientes/cmrqsrab5001f1guh2ve5oy90`: **Cadastro do paciente** e **Privacidade e cobertura dos dados** ausentes; **Engajamento** com diagnostico e novas linhas; **Atividades recentes** com layout de tabela de psicologo.
- `pnpm --dir admin check`
- `pnpm check`

## Ajuste pos-feedback 2026-07-22 - Contador de denuncias recebidas na aba Geral

- Pedido do usuario: ao lado do contador **Respostas de psicologos verificados**, adicionar um contador de **Denuncias recebidas**.
- O endpoint `GET /api/admin/private/patients/:id` passou a incluir a metrica real `reports_received`, calculada a partir de `post_report` vinculado a posts ou comentarios do paciente no periodo consultado, com comparativo contra periodo anterior pelo mesmo contrato de metricas do detalhe.
- A aba **Geral** passou a exibir **Denuncias recebidas** no grid de contadores principais, na sequencia de **Respostas de psicologos verificados**, com grid responsivo mobile-first (`sm` em 2 colunas e `xl` em 4 colunas).
- Nao houve schema Prisma, migration, package novo, seed, mock, backfill artificial, endpoint simulado ou acao de moderacao adicionada. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram o screenshot enviado pelo usuario e `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- ADR atualizado: `adrs/0241-admin-detalhe-paciente-dados-minimos-readonly.md`.

### Criterios de aceite do ajuste

- [x] A aba **Geral** mostra o contador **Denuncias recebidas** junto aos contadores principais.
- [x] O contador usa `post_report` real de posts e comentarios do paciente, sem mock ou dado artificial.
- [x] O grid dos contadores permanece mobile-first e comporta quatro cards lado a lado em telas amplas.
- [x] Nenhum schema Prisma, migration, package novo, seed ou endpoint simulado foi adicionado.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts" "src/modules/api/admin/private/patients/detail/repositories/AdminPatientDetailRepository.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Service local: `showAdminPatient({ id: "cmrqsrab5001f1guh2ve5oy90", period: "all" })` retornou a metrica `reports_received` com label **Denuncias recebidas** e fonte `post_report em conteudo do paciente`.
- Browser local/headless via Chrome/CDP em `/pacientes/cmrqsrab5001f1guh2ve5oy90`, com admin temporario real removido ao final, validou desktop `1365x900`: quatro cards principais, **Denuncias recebidas** ao lado de **Respostas de psicologos verificados**; e mobile `390x844`: contador presente e `scrollWidth=390`.

## Ajuste pos-feedback 2026-07-22 - Previa visual local das estatisticas do paciente

- Pedido do usuario: colocar numeros de exemplo nas estatisticas do paciente apenas para visualizacao.
- A aba **Estatisticas** do paciente ganhou uma previa visual local, restrita a `NODE_ENV=development` e ao paciente `cmrqsrab5001f1guh2ve5oy90`, para preencher graficos, comunidades ativas, horarios de maior atividade, uso da plataforma, paginas acessadas e devices quando os blocos estao sem dados reais.
- A previa mostra aviso explicito de que os numeros sao apenas para avaliacao de layout e nao altera API, banco ou dados reais.
- A logica preserva qualquer recorte que ja tenha dado real e so preenche visualmente blocos vazios; em build/producao (`NODE_ENV=production`) a previa fica desativada.
- Nao houve alteracao de backend, endpoint, contrato HTTP, schema Prisma, migrations, packages, seed, backfill artificial ou dado persistido. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia visual foi o screenshot enviado pelo usuario em 2026-07-22 e o layout atual da aba no browser local.
- ADR atualizado: `adrs/0241-admin-detalhe-paciente-dados-minimos-readonly.md`.

### Criterios de aceite do ajuste

- [x] Blocos vazios da aba **Estatisticas** exibem numeros de exemplo apenas na previa local de desenvolvimento.
- [x] A tela indica explicitamente que os numeros sao exemplo visual e nao dados reais.
- [x] A previa nao altera backend, API, banco, Prisma, migrations ou dados persistidos.
- [x] A previa nao aparece em build/producao.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin exec tsc --noEmit --pretty false`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=estatisticas` retornou `200`.
- Browser local/headless via Chrome/CDP em `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=estatisticas`, com token temporario de admin real removido ao final, validou desktop `1365x900` e mobile `390x844`: aviso de previa presente, comunidades de exemplo presentes, estados vazios removidos visualmente e `scrollWidth=390` no mobile.

## Ajuste pos-feedback 2026-07-22 - Layout dos blocos de conta e engajamento

- Pedido do usuario: fazer os blocos **Situacao da conta** e **Engajamento** do paciente seguirem o modelo de layout dos blocos do psicologo.
- Os dois cards da aba **Geral** em `/pacientes/[id]` agora usam o mesmo padrao visual dos cards do detalhe de psicologo: painel destacado interno com eyebrow, titulo, helper text e icone, linhas de dados abaixo e CTA no rodape.
- O card de conta passou a abrir com eyebrow **Conta** e titulo **Conta ativa/inativa**, mantendo dados reais de e-mail, ultimo acesso, origem e criacao.
- O card de engajamento passou a abrir com eyebrow **Engajamento** e titulo do diagnostico textual, mantendo comunidades ativas, posts, respostas e ultima atividade reais.
- Nao houve alteracao de backend, endpoint, contrato HTTP, schema Prisma, migrations, packages, mocks, seeds, backfill artificial ou dados sensiveis; `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram os screenshots enviados pelo usuario, `_product/proto/admin/Pacientes/Pacientes - Detalhes.png` e o layout local do detalhe de psicologo.

### Criterios de aceite do ajuste

- [x] **Situacao da conta** usa o modelo visual dos cards do psicologo, sem cabecalho externo duplicado.
- [x] **Engajamento** usa o modelo visual dos cards do psicologo, sem cabecalho externo duplicado.
- [x] Os dados exibidos permanecem derivados do contrato real existente de paciente.
- [x] O layout mobile-first foi validado em 390px sem overflow horizontal.
- [x] Nenhum mock, seed, endpoint simulado, migration ou package novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir backend check`
- `pnpm check`
- Browser local/headless via Chrome/CDP em `/pacientes/cmrqsrab5001f1guh2ve5oy90`, com admin temporario real removido ao final, validou desktop `1365x900` e mobile `390x844`: os dois cards possuem painel destacado interno no padrao do psicologo, as copies externas antigas nao aparecem e `scrollWidth=390` no mobile.

## Ajuste pos-feedback 2026-07-23 - Analise de intencao do paciente

- Pedido do usuario: na aba **Estatisticas** do paciente, antes do bloco **Estatisticas de comunidade**, adicionar uma analise interna para o Admin entender se o paciente parece estar apenas navegando ou se tem maior intencao de virar paciente de psicologos.
- O endpoint real `GET /api/admin/private/patients/:id` foi ampliado com `intent_analysis`, calculado no mesmo recorte de periodo da aba e com comparativo contra o periodo anterior.
- A analise usa somente fontes reais ja persistidas:
  - `profile_view_event.viewer_id` com `source=profile_page` para aberturas de perfil de psicologos;
  - `psychologist_favorite.user_id` com `deleted=false` para psicologos favoritados ativos;
  - `contact_request.user_id` com `channel=whatsapp` para cliques no WhatsApp.
- O score deterministico de 0 a 100 combina aberturas de perfil, retornos ao mesmo perfil, favoritos e cliques WhatsApp; clique no WhatsApp e favorito pesam mais por indicarem maior proximidade de contato.
- O bloco e exclusivo do Admin, nao e exibido publicamente nem para psicologos, e a propria UI informa que nao infere sessao, atendimento, diagnostico ou conteudo de conversa.
- A previa visual local de desenvolvimento existente na aba **Estatisticas** nao alimenta a analise de intencao; se nao houver sinais reais, o bloco mostra **Frio** e contadores zerados.
- Nao houve schema Prisma, migration, package novo, seed, mock, backfill artificial, endpoint simulado ou tracking novo. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia visual foi o screenshot enviado pelo usuario em 2026-07-23 e a validacao no browser local.
- ADR criado: `adrs/0312-admin-patient-intent-analysis.md`.

### Criterios de aceite do ajuste

- [x] A aba **Estatisticas** exibe **Analise de intencao do paciente** antes de **Estatisticas de comunidade**.
- [x] Score, nivel e metricas usam apenas aberturas reais de perfil, favoritos ativos, cliques reais no WhatsApp e retornos ao mesmo perfil.
- [x] O bloco e descrito como indicador interno do Admin e nao exposto a pacientes ou psicologos.
- [x] A UI explicita que a analise nao infere sessao, atendimento, diagnostico ou conteudo de conversa.
- [x] O filtro de periodo da analise funciona independente dos outros blocos de estatisticas.
- [x] O layout mobile-first foi validado em 390px sem overflow horizontal.
- [x] Nenhum mock, seed, endpoint simulado, tracking novo, migration ou package novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts" "src/modules/api/admin/private/patients/detail/repositories/AdminPatientDetailRepository.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Service local: `showAdminPatient({ id: "cmrqsrab5001f1guh2ve5oy90", period: "all" })` retornou `intent_analysis` real com fonte `profile_view_event+psychologist_favorite+contact_request` e sem usar a previa visual local.
- Browser local/headless via Chrome/CDP em `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=estatisticas`, com admin temporario real removido ao final, validou desktop `1365x900`: bloco de intencao antes de comunidade, score, metrica de WhatsApp e nota de privacidade presentes; e mobile `390x844`: bloco presente, comunidade abaixo e `scrollWidth=390`.

## Ajuste pos-feedback 2026-07-23 - Intencao na aba Geral

- Pedido do usuario: apos o bloco **Engajamento** da aba **Geral**, adicionar um terceiro bloco de **Intencao** mostrando a classificacao de intencao do paciente, sem expor a palavra interna "temperatura" na UI.
- A aba **Geral** agora renderiza os cards resumidos em grid mobile-first na ordem **Conta**, **Engajamento** e **Intencao**, progredindo para tres colunas em telas amplas.
- O novo card **Intencao** reutiliza o `intent_analysis` real do contrato existente e traduz o nivel em classificacao operacional visivel como **Frio**, **Curioso**, **Interessado** ou **Qualificado**.
- O resumo mostra nivel, score, sinais reais e ultimo sinal, com CTA para abrir a analise completa na aba **Estatisticas**.
- Nao houve backend novo, endpoint novo, contrato HTTP novo, schema Prisma, migration, package, seed, mock, backfill artificial ou tracking novo. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram o screenshot enviado pelo usuario em 2026-07-23 e `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- ADR atualizado: `adrs/0312-admin-patient-intent-analysis.md`.

### Criterios de aceite do ajuste

- [x] A aba **Geral** exibe um terceiro card **Intencao** imediatamente apos **Engajamento**.
- [x] O card mostra a classificacao do paciente derivada de `intent_analysis.level`, sem dado inventado e sem expor o termo interno "Temperatura" na UI.
- [x] O resumo exibe nivel, score, sinais reais e ultimo sinal com CTA para a analise completa.
- [x] O layout permanece mobile-first e sem overflow horizontal em 390px.
- [x] Nenhum mock, seed, endpoint simulado, tracking novo, migration ou package novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless via Chrome/CDP em `/pacientes/cmrqsrab5001f1guh2ve5oy90`, com Admin local em `localhost:3002`, validou desktop `1365x900` e mobile `390x844`: ordem **Conta** -> **Engajamento** -> **Intencao**, titulo **Frio**, ausencia do termo visivel **Temperatura**, score `0/100` e ausencia de overflow horizontal (`scrollWidth=390` no mobile).


## Ajuste pos-feedback 2026-07-23 - Nome de exibicao em Dados pessoais

- Pedido direto de produto aplicado na aba Admin **Perfil e cadastro**, card **Dados pessoais** do paciente.
- A primeira linha do card agora e **Nome de exibicao**, usando `header.name`, valor real derivado de `user.name` do paciente.
- O mesmo resumo somente leitura aparece no modo de edicao de genero antes de e-mail e localizacao, sem permitir alterar nome por este fluxo.
- E-mail e localizacao permanecem somente leitura; genero continua sendo o unico campo editavel nesse card.
- Nao houve alteracao de backend, contrato HTTP, schema Prisma, migrations, packages, mock, seed ou endpoint simulado.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram a captura enviada pelo usuario e `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- ADR criado: `adrs/0313-admin-dados-pessoais-nomes-exibicao.md`.

### Criterios de aceite do ajuste

- [x] **Dados pessoais** do paciente mostra **Nome de exibicao** como primeira linha.
- [x] O nome exibido usa `user.name` real ja retornado no detalhe administrativo do paciente.
- [x] O fluxo de edicao do card nao permite alterar nome, e-mail ou localizacao por este ajuste.
- [x] Nenhum schema Prisma, migration, package novo, mock, seed ou endpoint simulado foi adicionado.

### Validacao complementar executada

- `pnpm --dir backend exec biome check "src/modules/api/admin/private/psychologists/detail/DTOs/IAdminPsychologistDetailDTO.ts" "src/modules/api/admin/private/psychologists/detail/repositories/AdminPsychologistDetailRepository.ts" "src/modules/api/admin/private/psychologists/detail/use-cases/services.ts"`
- `pnpm --dir admin exec biome check "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/[id]/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build` executado com sucesso apos aguardar/remover lock stale de build anterior.
- `pnpm check`
- API local com admin temporario real removido ao final: `GET /api/admin/private/psychologists/cmrwmw35t0000xkuhxoceh77v` retornou `profile.personal.full_name="Ana Beatriz Lima"`; `GET /api/admin/private/patients/cmrqsrab5001f1guh2ve5oy90?period=all` retornou `header.name="Paciente preview 52"`.
- Browser local/headless via Chrome CDP em viewport 390x844: `/psicologos/cmrwmw35t0000xkuhxoceh77v?tab=perfil` exibiu a linha **Nome completo / Ana Beatriz Lima** e `scrollWidth=390`; `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=perfil` exibiu a linha **Nome de exibicao / Paciente preview 52** e `scrollWidth=390`.

## Ajuste pos-feedback 2026-07-23 - Previa visual de intencao sem aviso global

- Pedido do usuario: remover a frase **Previa visual local: numeros de exemplo apenas para avaliacao do layout. Nao sao dados reais e nao alteram API ou banco.** da aba **Estatisticas** e adicionar numeros de exemplo na **Analise de intencao do paciente** apenas para visualizacao local.
- A aba **Estatisticas** nao renderiza mais o aviso global da previa visual local.
- A **Analise de intencao do paciente** recebe numeros de exemplo somente em `NODE_ENV=development`, no paciente de preview `cmrqsrab5001f1guh2ve5oy90` e quando a propria analise nao possui sinais reais no periodo selecionado.
- A previa preserva qualquer sinal real existente, nao altera backend, endpoint, contrato HTTP, schema Prisma, migrations, packages, seed, banco, tracking ou dados persistidos.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram o screenshot enviado pelo usuario e `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- ADR atualizado: `adrs/0312-admin-patient-intent-analysis.md` e complemento em `adrs/0241-admin-detalhe-paciente-dados-minimos-readonly.md`.

### Criterios de aceite do ajuste

- [x] A frase solicitada nao aparece mais na aba **Estatisticas**.
- [x] A **Analise de intencao do paciente** mostra numeros de exemplo no preview local quando nao ha sinais reais.
- [x] A previa de intencao continua desativada em build/producao e nao substitui dados reais.
- [x] Nenhum schema Prisma, migration, package novo, mock persistente, seed, endpoint simulado ou tracking novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless via Chrome CDP em `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=estatisticas`, com admin temporario real removido ao final: desktop `1365x900` validou ausencia do aviso, score `96/100`, numeros de exemplo em perfis abertos/favoritados/WhatsApp e bloco antes de **Estatisticas de comunidade**; mobile `390x844` validou ausencia do aviso, score `96/100` e `scrollWidth=390`.

## Ajuste pos-feedback 2026-07-23 - Nomenclatura direcional nas estatisticas

- Pedido do usuario: explicitar se os contadores da aba **Estatisticas** do paciente sao acoes feitas ou recebidas e adicionar **Denuncias (recebidas)**.
- O backend manteve o contrato real `GET /api/admin/private/patients/:id`, renomeando labels de metricas para **Posts feitos**, **Comentarios feitos**, **Upvotes (recebidos)**, **Downvotes (recebidos)**, **Salvamentos (recebidos)**, **Compartilhamentos (recebidos)** e **Denuncias (recebidas)**.
- O contador **Denuncias (recebidas)** usa `reports_received` real ja calculado a partir de `post_report` em posts/respostas do paciente e agora tambem entra na serie temporal da aba **Estatisticas**.
- A UI do Admin adicionou o card ao carrossel mobile-first de **Estatisticas de comunidade**, mantendo os filtros independentes e sem criar endpoint paralelo.
- Nao houve schema Prisma, migration, package novo, seed, mock persistente, endpoint simulado, tracking novo ou backfill artificial. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram o screenshot enviado pelo usuario e `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- ADR atualizado: `adrs/0294-admin-paciente-estatisticas-comunidade-paridade.md`.

### Criterios de aceite do ajuste

- [x] A aba **Estatisticas** exibe os labels direcionais solicitados para posts, comentarios, votos, salvamentos e compartilhamentos.
- [x] A aba **Estatisticas** exibe o contador **Denuncias (recebidas)** no carrossel de **Estatisticas de comunidade**.
- [x] **Denuncias (recebidas)** usa `post_report` real vinculado a posts/respostas do paciente e aparece na serie temporal.
- [x] O layout permanece mobile-first e sem overflow horizontal em 390px.
- [x] Nenhum schema Prisma, migration, package novo, mock persistente, seed, endpoint simulado ou tracking novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `cmd /c pnpm check`
- Service local `showAdminPatient({ id: "cmrqsrab5001f1guh2ve5oy90", period: "all" })` confirmou labels direcionais, `reports_received` e `series.source` com `post_report`.
- Browser local/headless via Chrome CDP em `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=estatisticas`, com admin temporario real removido ao final: desktop `1365x900` e mobile `390x844` validaram todos os labels, **Denuncias (recebidas)**, ausencia de **Comentarios totais** e `scrollWidth=390` no mobile.


## Ajuste pos-feedback 2026-07-23 - Nome de exibicao editavel pelo Admin

- Pedido do usuario: o nome de exibicao do paciente deve ser editavel pelo Admin na aba **Perfil e cadastro**.
- O formulario de **Dados pessoais** passou a editar **Nome de exibicao** com a fundacao de formularios da TASK-02 (`React Hook Form`, `Zod` e `InputController`), mantendo layout mobile-first e campo em largura total.
- O endpoint real `PUT /api/admin/private/patients/:id/personal-data` agora aceita `display_name` junto do `reason`, persiste o valor normalizado em `user.name` e retorna o detalhe atualizado sem endpoint paralelo.
- A alteracao exige motivo administrativo e registra auditoria em `admin_activity_log` no dominio `patient_personal_data`, com `changed_fields`/metadados diferenciando `display_name` e `gender`.
- E-mail e localizacao continuam somente leitura neste fluxo; genero permanece editavel pelo mesmo endpoint quando enviado.
- Nao houve schema Prisma, migration, package novo, seed, mock, backfill artificial ou endpoint simulado. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram o screenshot enviado pelo usuario em 2026-07-23 e `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- ADRs atualizados: `adrs/0290-admin-paciente-edicao-dados-pessoais-limitada.md`, `adrs/0313-admin-dados-pessoais-nomes-exibicao.md` e `adrs/0241-admin-detalhe-paciente-dados-minimos-readonly.md`.

### Criterios de aceite do ajuste

- [x] O Admin consegue editar **Nome de exibicao** do paciente em **Perfil e cadastro > Dados pessoais**.
- [x] O valor editado e persistido em `user.name` e refletido no header/resumo administrativo do paciente.
- [x] A alteracao exige **Motivo da alteracao** e gera auditoria administrativa com o campo `display_name`.
- [x] E-mail e localizacao continuam somente leitura neste fluxo.
- [x] O formulario usa RHF/Zod/controllers, permanece mobile-first e foi validado em 390px sem overflow horizontal.
- [x] Nenhum schema Prisma, migration, package novo, mock, seed ou endpoint simulado foi adicionado.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/profile-edit/DTOs/IAdminPatientProfileEditDTO.ts" "src/modules/api/admin/private/patients/profile-edit/validator/index.ts" "src/modules/api/admin/private/patients/profile-edit/repositories/AdminPatientProfileEditRepository.ts" "src/modules/api/admin/private/patients/profile-edit/use-cases/services.ts" "locales/pt/translation.json"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir backend check` executado com sucesso apos regenerar o Prisma client por falha transiente de `ENOTEMPTY` no diretorio gerado.
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- API local com admin temporario real removido ao final: `PUT /api/admin/private/patients/cmrqsrab5001f1guh2ve5oy90/personal-data` alterou o nome para validar persistencia, auditoria `changed_fields=["Nome de exibicao"]`, metadata `changed_field_keys=["display_name"]`, e depois restaurou `Paciente preview 52`.
- Smoke HTTP sem token no mesmo endpoint retornou `401`.
- Browser local/headless via Chrome CDP em `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=perfil`, viewport mobile `390x844`, validou o campo editavel **Nome de exibicao**, helper text atualizado, motivo visivel e `scrollWidth=390`.

## Ajuste pos-feedback 2026-07-23 - Classificacao final da analise de intencao

- Pedido do usuario: na aba **Estatisticas** do paciente, o resultado da analise de intencao deve ser **Frio**, **Curioso**, **Interessado** ou **Qualificado**.
- O backend preservou os ids tecnicos `no_signals`, `low`, `medium` e `high`, mas passou a retornar os labels de produto **Frio**, **Curioso**, **Interessado** e **Qualificado** no contrato real `intent_analysis.level.label`.
- A UI do detalhe do paciente passou a usar a mesma classificacao na analise completa da aba **Estatisticas** e no card resumido **Intencao** da aba **Geral**, removendo labels operacionais anteriores como alta/media/baixa intencao e quente/morna/fria.
- Nao houve alteracao de calculo, fontes reais, endpoint HTTP, schema Prisma, migration, package, seed, mock, backfill artificial ou tracking novo. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram o screenshot enviado pelo usuario em 2026-07-23 e `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- ADR atualizado: `adrs/0312-admin-patient-intent-analysis.md`.

### Criterios de aceite do ajuste

- [x] `intent_analysis.level.label` retorna somente **Frio**, **Curioso**, **Interessado** ou **Qualificado**.
- [x] A aba **Estatisticas** exibe a classificacao com a nova nomenclatura de produto.
- [x] O card **Intencao** da aba **Geral** usa a mesma nomenclatura e nao exibe labels antigos de temperatura.
- [x] O layout mobile-first permanece sem overflow horizontal em 390px.
- [x] Nenhum schema Prisma, migration, package novo, mock, seed, endpoint simulado ou tracking novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts" "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Service local `showAdminPatient({ id: "cmrqsrab5001f1guh2ve5oy90", period: "all" })` retornou `intent_analysis.level.label="Frio"` com id tecnico `no_signals`, sem dados artificiais.
- Browser local/headless via Chrome CDP em `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=estatisticas`, com admin temporario real removido ao final, validou desktop `1365x900` e mobile `390x844`: classificacao permitida presente, labels antigos ausentes e `scrollWidth=390` no mobile.

## Ajuste pos-feedback 2026-07-23 - Plural em Upvotes recebidos

- Pedido: pluralizar o label de upvotes para **Upvotes (recebidos)** na aba Estatisticas do detalhe administrativo de paciente.
- Escopo: label do backend, labels exibidos pelo Admin e documentacao/ADR da TASK-61, sem alterar calculo, schema, migrations, pacotes ou tracking.
- Validacao executada: Biome nos arquivos alterados, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `cmd /c pnpm check` e browser local/headless via Chrome CDP no mobile `390x844`, confirmando **Upvotes (recebidos)** presente, label singular antigo ausente e `scrollWidth=390`; admin temporario real removido ao final.

## Ajuste pos-feedback 2026-07-23 - Copy e op��es das estat�sticas do paciente

- Pedido do usuario: ajustar a copy de **Estatisticas de comunidade** e **Comunidades ativas** e simplificar as opcoes do carrossel/grafico de estatisticas.
- A descricao de **Estatisticas de comunidade** passou para: "Publicacoes que realizou e respostas, votos, denuncias, salvamentos e compartilhamentos que recebeu.".
- A descricao de **Comunidades ativas** passou para: "Publicacoes que realizou, votos que deu e conteudo que salvou nas comunidades.".
- As opcoes visiveis em **Estatisticas de comunidade** agora sao: **Posts**, **Comentarios**, **Respostas de psicologos verificados**, **Denuncias**, **Upvotes**, **Downvotes**, **Salvamentos** e **Compartilhamentos**.
- A direcao semantica continua explicita nas descricoes e no contrato real; nao houve alteracao de calculo, endpoint, schema Prisma, migration, package, seed, mock, tracking ou backfill artificial. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram o screenshot enviado pelo usuario em 2026-07-23 e `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- ADR atualizado: `adrs/0294-admin-paciente-estatisticas-comunidade-paridade.md`.

### Criterios de aceite do ajuste

- [x] A descricao de **Estatisticas de comunidade** foi substituida pela copy solicitada.
- [x] A descricao de **Comunidades ativas** foi substituida pela copy solicitada.
- [x] As opcoes de **Estatisticas de comunidade** aparecem como Posts, Comentarios, Respostas de psicologos verificados, Denuncias, Upvotes, Downvotes, Salvamentos e Compartilhamentos.
- [x] O layout permanece mobile-first e sem overflow horizontal em 390px.
- [x] Nenhum schema Prisma, migration, package novo, mock, seed, endpoint simulado, tracking novo ou backfill artificial foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- API local com admin temporario real removido ao final: `GET /api/admin/private/patients/cmrqsrab5001f1guh2ve5oy90?period=all` retornou o detalhe real do paciente e confirmou o label de contrato **Upvotes (recebidos)**.
- Browser local/headless via Chrome CDP em `http://127.0.0.1:3023/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=estatisticas`, viewport mobile `390x844`, validou as duas copies novas, as oito opcoes solicitadas e `scrollWidth=390`; admin temporario real removido ao final.


## Ajuste pos-feedback 2026-07-27 - Peso textual dos titulos da aba Estatisticas

- Pedido do usuario: reduzir o peso textual dos titulos dos blocos na pagina de detalhe administrativo do paciente, aba **Estatisticas**.
- A UI do Admin alterou apenas os titulos e subtitulos de blocos da aba **Estatisticas** de `font-black` para `font-bold`, que no escopo `admin-premium-pilot` computa como `font-weight: 600`.
- Titulos ajustados: **Analise de intencao do paciente**, **Estatisticas de comunidade**, **Comunidades ativas**, **Horarios de maior atividade**, **Uso da plataforma**, **Paginas mais acessadas** e **Devices**.
- Tamanho, copy, icones, filtros, contratos, calculos e dados reais permaneceram inalterados.
- Nao houve schema Prisma, migration, package novo, seed, mock, endpoint simulado, tracking ou backfill artificial. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram o screenshot enviado pelo usuario em 2026-07-27 e `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- ADR nao atualizado por se tratar de ajuste visual local de tipografia sem decisao arquitetural nova.

### Criterios de aceite do ajuste

- [x] Os titulos dos blocos da aba **Estatisticas** usam peso textual reduzido e computam como `font-weight: 600`.
- [x] A alteracao cobre **Analise de intencao do paciente**, **Estatisticas de comunidade**, **Comunidades ativas**, **Horarios de maior atividade**, **Uso da plataforma**, **Paginas mais acessadas** e **Devices**.
- [x] Nenhuma copy, filtro, icone, contrato, calculo ou dado real foi alterado.
- [x] O layout permanece mobile-first e sem overflow horizontal em 390px.
- [x] Nenhum schema Prisma, migration, package novo, mock, seed ou endpoint simulado foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check` executou `frontend check` e `backend biome`, mas ficou bloqueado no `backend typecheck` por erros TypeScript preexistentes fora do escopo (ex.: `src/main/notification/digests.ts` e `src/modules/api/...`); `admin check` ja havia passado isoladamente.
- Browser local/headless via Chrome CDP em `http://localhost:3002/pacientes/cmrqsr42d00151guhdwy8tfj4?tab=estatisticas`, com admin temporario real removido ao final: desktop `1366x900` e mobile `390x844` validaram os sete titulos com `fontWeight="600"` e `scrollWidth=390` no mobile.


## Ajuste pos-feedback 2026-07-27 - Peso textual dos titulos em todas as abas de detalhe

- Pedido do usuario: aplicar o mesmo peso textual reduzido aos titulos das paginas de detalhe administrativo do paciente.
- A UI do Admin estendeu o ajuste da aba **Estatisticas** para todos os titulos semanticos `h2`, `h3` e `h4` do detalhe de paciente, trocando `font-black`/`font-extrabold` por `font-bold`, que no escopo `admin-premium-pilot` computa como `font-weight: 600`.
- Cobertura: abas **Geral**, **Perfil e cadastro**, **Estatisticas**, **Publicacoes**, **Denuncias**, **Atividades** e **Conta**.
- A alteracao preservou copy, hierarquia, icones, filtros, contratos, calculos e dados reais; valores, badges, labels de tabela e botoes nao foram rebaixados como titulo de bloco.
- Nao houve schema Prisma, migration, package novo, seed, mock, endpoint simulado, tracking ou backfill artificial. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram o screenshot enviado pelo usuario em 2026-07-27 e `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- ADR nao atualizado por se tratar de ajuste visual local de tipografia sem decisao arquitetural nova.

### Criterios de aceite do ajuste

- [x] Os titulos de blocos do detalhe de paciente usam peso textual reduzido e computam como `font-weight: 600`.
- [x] A cobertura inclui Geral, Perfil e cadastro, Estatisticas, Publicacoes, Denuncias, Atividades e Conta.
- [x] Nenhuma copy, filtro, icone, contrato, calculo ou dado real foi alterado.
- [x] O layout permanece mobile-first e sem overflow horizontal em 390px.
- [x] Nenhum schema Prisma, migration, package novo, mock, seed ou endpoint simulado foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless via Chrome CDP em `http://localhost:3002/pacientes/cmrqsr42d00151guhdwy8tfj4`: desktop `1366x900` e mobile `390x844` validaram as abas Geral, Perfil, Estatisticas, Publicacoes, Denuncias, Atividades e Conta sem `font-black`/`font-extrabold` em titulos `h2`/`h3`/`h4` visiveis e sem overflow horizontal. Admin temporario real removido ao final.

## Ajuste pos-feedback 2026-07-27 - Tag de engajamento geral em Comunidades ativas

- Pedido do usuario: aplicar aos pacientes a mesma logica de diagnostico geral ja usada em psicologos: analisar o engajamento individual nas comunidades e gerar uma tag geral.
- O resultado geral do paciente e derivado do melhor diagnostico individual entre as comunidades ativas no periodo selecionado: **Muito ativo** prevalece sobre **Ativo**, que prevalece sobre **Pouco ativo**, que prevalece sobre **Sem base**.
- O endpoint real `GET /api/admin/private/patients/:id` agora expoe `communities.engagement_diagnosis`, mantendo `communities.items[].engagement_diagnosis` como diagnostico individual por comunidade.
- A UI Admin renderiza **Engajamento geral: ...** ao lado do titulo **Comunidades ativas** do paciente, usando o mesmo periodo/filtro do bloco e preservando a tabela individual.
- Nao houve endpoint paralelo, schema Prisma, migration, package novo, mock, seed ou backfill.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; o ajuste reutilizou o padrao visual existente da aba **Estatisticas** e o inventario/proto local como referencia auditavel.
- ADR atualizado: `adrs/0300-diagnostico-engajamento-comunidades-admin.md`.

### Criterios de aceite do ajuste

- [x] A tabela **Comunidades ativas** do paciente continua exibindo o engajamento individual por comunidade.
- [x] O titulo **Comunidades ativas** do paciente exibe a tag **Engajamento geral: ...**.
- [x] O engajamento geral usa o melhor resultado individual do periodo selecionado.
- [x] O contrato real expoe `communities.engagement_diagnosis` sem endpoint paralelo.
- [x] Nenhum mock, seed, endpoint simulado, migration, package novo ou backfill artificial foi adicionado.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts src/modules/api/admin/private/patients/detail/use-cases/services.ts`
- `pnpm --dir admin exec biome check --write src/api/req/patients/index.ts "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm --dir admin check`
- `pnpm check`
- Smoke local via `pnpm --dir backend exec tsx -e ...`: validou que a agregacao retorna `ativo` para [Sem base, Ativo, Pouco ativo] e `muito_ativo` quando ha uma comunidade Muito ativa.
- Observacao: o primeiro `pnpm --dir admin check` falhou por artefato gerado stale em `.next/types`; apos `admin build`, o `admin check` passou. O primeiro `pnpm check` falhou transitoriamente em `prisma generate` com `ENOTEMPTY` na pasta gerada; a reexecucao completa passou.
- Browser/Builder: Builder Quick Copy nao esta exposto como ferramenta callable neste ambiente; validacao visual direta ficou limitada ao build do Admin e ao padrao existente/proto local.
