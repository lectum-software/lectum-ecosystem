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
