# TASK-55: Detalhe administrativo do psicólogo — Geral e Perfil/Cadastro

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-55 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-54 |
| ADR alvo | ADR sobre exposição administrativa de dados sensíveis do psicólogo |

## Contexto

As abas "Geral" e "Perfil e cadastro" do detalhe do psicólogo usam como referências:

- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Geral.png`;
- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Perfil e Cadastro.png`.

Nesta V1, o Admin visualiza dados administrativos e públicos do profissional. Edição de perfil pelo Admin fica fora desta task, salvo ação mínima já existente e segura.

## Objetivo

Criar o shell de detalhe do psicólogo e as abas Geral e Perfil/Cadastro com dados reais, mantendo cuidado LGPD com CPF, endereço, telefone e dados profissionais.

## Pré-requisitos e bloqueios

- TASK-54 concluída com navegação para detalhe.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Definir em ADR como dados sensíveis serão exibidos para admin.

## Escopo frontend

- Criar rota protegida:
  - `/psychologists/[id]` ou equivalente.
- Criar cabeçalho reutilizável do detalhe:
  - avatar;
  - nome;
  - CRP;
  - status;
  - plano;
  - avaliação;
  - último acesso quando houver fonte real;
  - link "Ver perfil público".
- Criar tabs:
  - Geral;
  - Perfil e cadastro;
  - Plano e pagamentos;
  - Estatísticas;
  - Publicações;
  - Avaliações;
  - Atividades;
  - Denúncias.
- Implementar nesta task apenas:
  - aba Geral;
  - aba Perfil e cadastro.
- O botão "Editar psicólogo" deve ficar fora da V1 ou desabilitado com rota futura, sem falsa ação.

## Escopo backend

- Criar endpoint admin privado:
  - `GET /api/admin/private/psychologists/:id`
- Retornar dados reais de:
  - `user`;
  - `psychologist_profile`;
  - catálogos de especialidades/serviços/abordagens;
  - assinatura atual resumida;
  - métricas principais;
  - histórico resumido derivado de eventos reais;
  - integrações/status reais.

## Fora do escopo

- Editar perfil do psicólogo.
- Criar ou resetar senha.
- Aprovar/reprovar CRP manualmente.
- Criar psicólogo.
- Moderar avaliações.
- Alterar assinatura.

## Contrato técnico detalhado

- Dados sensíveis devem ser retornados apenas por rota admin autenticada.
- Não expor senha, tokens, hashes, dados de pagamento sensíveis, CPF completo em logs ou frontend público.
- Onde houver "Stripe" na imagem, substituir por **Mercado Pago** no produto real.
- Histórico da conta deve ser derivado de eventos existentes e não prometer auditoria completa.

## Critérios de aceite

- [x] Detalhe só abre para admin autenticado.
- [x] Header e tabs são reutilizáveis pelas tasks seguintes.
- [x] Aba Geral usa dados reais.
- [x] Aba Perfil e cadastro usa dados reais.
- [x] Dados sensíveis têm tratamento documentado em ADR.
- [x] "Stripe" não aparece; usar Mercado Pago quando aplicável.
- [x] Botões de edição que não funcionam não aparecem/habilitam.
- [x] UI mobile-first validada.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Nenhum `<img>` cru foi usado.
- [x] Imagens de referência foram citadas.
- [x] Checks/builds relevantes executados sem erros.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real e psicólogo real.

## Execucao TASK-55

- Backend implementado em `GET /api/admin/private/psychologists/:id`, montado em `backend/src/main/server/imports/write.ts` com `adminAuth`.
- Admin implementado em `/psicologos/[id]`, com shell/header/tabs reutilizaveis e abas V1 `Geral` e `Perfil e cadastro`.
- Botoes de edicao do psicologo nao foram exibidos nesta V1.
- Dados sensiveis sao exibidos somente no painel admin e documentados no ADR `0235-admin-detalhe-psicologo-dados-sensiveis.md`.
- Onde o prototipo citava Stripe, a implementacao usa Mercado Pago quando aplicavel e nao renderiza "Stripe".
- Builder/Quick Copy nao esteve disponivel como ferramenta neste ambiente; foram usadas as imagens locais:
  - `_product/proto/admin/Psicologos/Detalhes do psicologo/Geral.png`;
  - `_product/proto/admin/Psicologos/Detalhes do psicologo/Perfil e Cadastro.png`.
- Nao houve alteracao de schema Prisma nem migrations; `db:migrate` nao foi necessario.

## Evidencias de validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- API local com admin real e psicologo real: 200 autenticado, 401 sem autenticacao, sem `gateway_token`, sem `gateway_subscription_id`, sem `password` e sem "Stripe".
- Browser local no Admin em desktop e viewport mobile 390px: abas Geral/Perfil renderizadas com dados reais, sem botao "Editar psicologo" e sem "Stripe".


## Ajuste complementar 2026-07-11 - header administrativo

- Pedido direto de produto aplicado no header do detalhe Admin do psicólogo.
- Builder/Quick Copy nao esteve acessivel como ferramenta neste ambiente; a verificacao visual usou a tela local e as referencias ja inventariadas em `_product/proto/admin/Psicologos/Detalhes do psicologo/`.
- O botao `Lista` foi removido; o link `Ver perfil publico` permanece no header.
- A tag verde passou a representar `Ativo`/`Inativo` de `user.active`, e cortesia administrativa ativa passa a aparecer como `Plano de cortesia`.
- A avaliacao passou para `0,0 (0)`, o CRP para a mascara `00/00000`, o termo profissional para `Psicólogo`/`Psicóloga` conforme `psychologist_profile.gender` e o ultimo acesso para `dd/mm/aaaa às HH:mm`.
- A foto do header agora usa a mesma URL real de `user.avatar` retornada pelo endpoint Admin, renderizada com `next/image`; URLs publicas do backend em `/public/files/...` sao resolvidas contra `NEXT_PUBLIC_API_URL` e hosts externos continuam em allowlist explicita.
- O selo de verificado ao lado do nome foi alinhado ao mesmo SVG canonico `VerifiedBadgeIcon` usado na Lectum, substituindo o icone generico `BadgeCheck`.
- ADR criado: `adrs/0249-admin-detalhe-psicologo-header-canonico.md`.

## Evidencias de validacao do ajuste complementar

- `pnpm --dir admin exec biome check --write 'src/app/(admin)/psicologos/[id]/client.tsx' next.config.ts`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check`
- Browser local autenticado no Admin em `/psicologos/cmrfgznww0014xouh2tmz5dbf`, incluindo viewport 390px para o header: avatar real carregado por `next/image`, sem botao `Lista`, status `Ativo`, `Plano de cortesia`, avaliacao `0,0 (0)`, CRP `04/12345`, termo `Psicólogo` e ultimo acesso no formato `10/07/2026 às 21:57`; o selo `VerifiedBadgeIcon` foi validado em perfil verificado local com `viewBox="0 0 30 28"` e `fill="#308CE8"`.

## Ajuste complementar 2026-07-11 - visibilidade em Dados profissionais

- Pedido direto de produto aplicado na aba Admin `Perfil e cadastro`, card `Dados profissionais`.
- A linha `Perfil visivel para pacientes` usa dados reais ja retornados pelo detalhe Admin:
  - `header.active` para indicar se o perfil aparece agora para pacientes na busca publica;
  - `header.published` para explicar quando a preferencia do psicologo esta ativada, mas o perfil ainda nao cumpre todos os criterios publicos.
- Nao houve alteracao de contrato de API, schema Prisma, formulario ou package.
- Builder/Quick Copy nao esteve acessivel como ferramenta neste ambiente; a referencia visual local continuou sendo `_product/proto/admin/Psicologos/Detalhes do psicologo/Perfil e Cadastro.png`.
- Criterios do ajuste:
  - [x] `Dados profissionais` mostra se o perfil esta visivel para pacientes.
  - [x] O indicador usa dados reais do detalhe Admin, sem mock.
  - [x] UI permanece mobile-first por reutilizar `FieldRow` responsivo do card.
  - [x] Nenhum `<img>` cru foi usado.


## Evidencias de validacao do ajuste de visibilidade

- `pnpm --dir admin check` executado sem erros ou warnings.
- `pnpm --dir admin build` executado sem erros apos repetir a tentativa inicial, que foi bloqueada por outro processo Next build em andamento.
- `git diff --check -- admin/src/app/(admin)/psicologos/[id]/client.tsx _product/tasks/TASK-55-detalhe-psicologo-geral-perfil-admin.md adrs/0253-admin-visibilidade-publica-perfil-psicologo.md` executado sem erros.
- `pnpm check` foi executado: frontend passou, backend ficou bloqueado por arquivos preexistentes/untracked da TASK-68 em `backend/src/modules/api/admin/private/psychologists/account/` e organizacao de imports em `backend/src/main/server/imports/write.ts`, fora do escopo deste ajuste.
- Browser local: smoke em Chrome headless 390x844 para `/psicologos/cmrglzdds000ajkuhqedavedb?tab=perfil` gerou screenshot da protecao/carregamento do painel, mas a sessao Admin autenticada do navegador do usuario nao estava disponivel no headless para validar visualmente o card com dados reais.

## Ajuste complementar 2026-07-13 - Geral com status do registro CRP

- Pedido direto de produto aplicado na aba Admin `Geral` do detalhe do psicologo.
- O bloco `Integracoes automaticas` foi removido da aba Geral.
- O bloco `Historico da conta` foi removido da aba Geral para nao competir com a aba dedicada `Atividades` e com a aba `Conta`.
- Foi adicionado o card `Status do registro CRP`, usando o endpoint administrativo real de verificacao profissional para exibir status, origem, responsavel, Regional CRP, Numero CRP, Data de inscricao e ultima atualizacao.
- O card e somente resumo na aba Geral; as acoes e edicoes sensiveis continuam concentradas em `Perfil e cadastro > Registro profissional`.
- UI permanece mobile-first: cards empilhados em ~390px e grade em desktop.
- Builder/Quick Copy nao esteve acessivel como ferramenta neste ambiente; foram usadas a captura enviada pelo usuario e a referencia local `_product/proto/admin/Psicologos/Detalhes do psicologo/Geral.png`.
- Nao houve alteracao de Prisma schema ou migrations; `pnpm --dir backend db:migrate` nao se aplica.

### Validacao do ajuste de Geral/CRP

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check -- admin/src/app/(admin)/psicologos/[id]/client.tsx`
- Browser local/headless em `http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf` com viewports 390x844 e 1440x1000 retornou 200 e confirmou o guard real do Admin; validacao visual autenticada do conteudo da aba depende da sessao Admin do navegador do usuario.

## Ajuste complementar 2026-07-13 - remover faixa de aviso em assinatura

- Pedido direto de produto aplicado na aba Admin `Geral`, card `Dados da assinatura`.
- A faixa informativa `Dados de pagamento sensíveis não são retornados...` foi removida para reduzir ruído visual no resumo.
- O contrato seguro permanece inalterado: dados sensíveis de pagamento continuam sem ser retornados pelo backend.
- Não houve alteração de schema Prisma, migrations, contrato de API, package ou ADR arquitetural.

### Validacao do ajuste da faixa de assinatura

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `git diff --check -- admin/src/app/(admin)/psicologos/[id]/client.tsx _product/tasks/TASK-55-detalhe-psicologo-geral-perfil-admin.md`
- Smoke HTTP local em `http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf` retornou 200; validação visual autenticada segue dependente da sessão Admin real do navegador do usuário.

## Ajuste complementar 2026-07-19 - header enxuto do psicologo

- Pedido direto de produto aplicado no header do detalhe Admin do psicologo.
- As tags fortes `Ativo`, `Plano de cortesia` e avaliacao foram substituidas por metadados iconograficos leves.
- A linha de metadados ficou concentrada em e-mail, WhatsApp sem `+55`, plano e avaliacao.
- Genero, localizacao, forma de cadastro e data de cadastro foram removidos do header.
- O WhatsApp usa o `WhatsAppIcon` canonico ja usado na Lectum.
- A avaliacao usa estrela vazada azul, sem preenchimento.
- O header mantem somente `Ultimo acesso: ...` como informacao temporal secundaria.
- A alteracao usa somente dados reais ja retornados por `GET /api/admin/private/psychologists/:id`; nao houve backend, contrato, schema Prisma, migration, package, mock ou seed.
- UI permanece mobile-first: metadados quebram linha em ~390px e mantem espacamento uniforme em telas maiores.
- Builder/Quick Copy nao esteve acessivel como ferramenta callable; a referencia visual foi a captura enviada pelo usuario e o componente real de `/pacientes/[id]`.
- ADR criado: `adrs/0285-admin-psicologo-header-metadados.md`.

### Validacao complementar do header enxuto

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=perfil` retornou `200`.
- Validacao visual autenticada em browser local nao foi executada por nao haver ferramenta de browser interativa/sessao Admin disponivel no ambiente desta execucao.

## Ajuste complementar 2026-07-19 - status de conta no header

- Pedido direto de produto aplicado no header do detalhe Admin do psicologo.
- O status solicitado foi esclarecido como status de conta/acesso, nao status publico do perfil.
- Foi adicionada a quinta opcao de metadado entre WhatsApp e plano, usando o endpoint real `GET /api/admin/private/psychologists/:id/account` via `useAdminPsychologistAccount`.
- A copy do status usa `confirmed`, `active`, `account_status` e `account_status_label`:
  - `Conta ativa` quando o e-mail esta confirmado e o login esta liberado;
  - `E-mail pendente` quando a conta esta ativa, mas o e-mail nao foi confirmado;
  - `Conta suspensa`/`Conta desativada` quando o status operacional bloqueia login;
  - `Login bloqueado` como fallback seguro se `active=false`;
  - `Conta indisponivel` apenas se o endpoint real de conta falhar.
- A faixa de metadados foi ajustada para manter e-mail, WhatsApp, status da conta, plano e avaliacao em uma unica linha sem wrap; em telas estreitas, a linha rola horizontalmente em vez de criar nova linha.
- Nao houve alteracao de backend, schema Prisma, migrations, packages ou mocks.
- ADR atualizado: `adrs/0285-admin-psicologo-header-metadados.md`.

### Criterios do ajuste de status de conta

- [x] Status de conta aparece entre WhatsApp e plano.
- [x] As cinco opcoes do header ficam em uma unica linha sem wrap.
- [x] O status usa dados reais do endpoint Admin de conta, sem mock.
- [x] `Conta ativa` representa e-mail confirmado e login liberado.
- [x] UI permanece mobile-first com overflow horizontal em largura estreita.
- [x] Nenhum `<img>` cru foi usado.

### Validacao complementar do status de conta

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/[id]/client.tsx"`
- `git diff --check -- "admin/src/app/(admin)/psicologos/[id]/client.tsx"`
- Smoke HTTP local: `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=perfil` retornou `200`.
- `pnpm --dir admin check` foi executado e ficou bloqueado por lint/format preexistente em `admin/src/app/(admin)/comunidades/client.tsx`.
- `pnpm --dir admin build` foi executado e ficou bloqueado por alteracao local preexistente em `admin/src/app/(admin)/comunidades/client.tsx` (`charts.hourly_activity` fora do contrato TypeScript atual).
- `pnpm check` foi executado: frontend passou, mas o backend ficou bloqueado por `prisma generate` com `EBUSY` em `backend/src/external/generated/prisma/models`, antes de chegar novamente ao check Admin.

## Ajuste complementar 2026-07-19 - três colunas na aba Geral

- Pedido direto de produto aplicado na aba Admin `Geral` do detalhe do psicólogo.
- Foi adicionado o bloco `Situação da conta` antes de `Situação do registro` e `Dados da assinatura`.
- A área de resumos passou a ficar em três colunas no desktop, na ordem solicitada: `Situação da conta` / `Situação do registro` / `Dados da assinatura`.
- A UI permanece mobile-first: em largura base os cards continuam empilhados e só viram três colunas no breakpoint `xl`.
- O bloco de conta usa dados reais do endpoint Admin existente `GET /api/admin/private/psychologists/:id/account` via `useAdminPsychologistAccount`, sem mock, endpoint novo, schema Prisma, migration ou package.
- O bloco de registro foi nomeado visualmente como `Situação do registro`, mantendo as ações completas em `Perfil e cadastro`.
- Builder/Quick Copy não esteve acessível como ferramenta callable; a referência visual usada foi a captura enviada pelo usuário e o PNG local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Geral.png`.
- ADR criado: `adrs/0286-admin-psicologo-geral-tres-situacoes.md`.

### Critérios do ajuste de três colunas

- [x] Aba Geral exibe `Situação da conta`.
- [x] Aba Geral organiza os três blocos em desktop na ordem `Situação da conta`, `Situação do registro`, `Dados da assinatura`.
- [x] `Situação da conta` usa dados reais do endpoint Admin de conta, sem mock.
- [x] UI permanece mobile-first, com cards empilhados em larguras estreitas.
- [x] Nenhum `<img>` cru foi usado.

### Validação complementar do ajuste de três colunas

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build` executado com sucesso após uma primeira tentativa bloqueada por outro processo `next build` em andamento.
- Smoke HTTP local: `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf` retornou `200`.
- `pnpm check` foi executado: frontend e biome backend passaram, mas backend ficou bloqueado em `prisma generate` por `ENOTEMPTY` ao remover `backend/src/external/generated/prisma/models`, fora do escopo deste ajuste Admin/frontend.

## Ajuste complementar 2026-07-19 - refinamento dos cards de situação e assinatura

- Pedido direto de produto aplicado na aba Admin `Geral` do detalhe do psicólogo.
- No bloco `Situação do registro`, foram removidas as linhas `Origem`, `Responsável` e `última atualização`, mantendo apenas `Regional CRP`, `Nº CRP` e `Data de inscrição`.
- No bloco `Dados da assinatura`, o LTV permanece destacado por peso/tamanho/cor do texto, mas sem fundo azul na linha.
- O botão `Abrir assinatura` foi mantido no card para navegação direta à aba de assinatura.
- Os cards `Situação da conta`, `Situação do registro` e `Dados da assinatura` passaram a usar altura alinhada na grid desktop, preservando empilhamento mobile-first.
- Não houve alteração de backend, endpoint, schema Prisma, migrations, packages ou dados persistidos.

### Validação complementar do refinamento dos cards

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `git diff --check -- "admin/src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`

## Ajuste complementar 2026-07-19 - plano de cortesia no resumo de assinatura

- Pedido direto de produto aplicado no card `Dados da assinatura` da aba Admin `Geral`.
- A linha `Plano atual` passou a usar a mesma regra visual do header: assinatura `source="admin_grant"` ativa com plano profissional é exibida como `Plano de cortesia`, em vez de `Plano Profissional`.
- A mudança é somente de apresentação no Admin; não altera plano, assinatura, endpoint, schema Prisma, migrations ou dados persistidos.

### Validação complementar do plano de cortesia no resumo

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `git diff --check -- "admin/src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`

## Ajuste complementar 2026-07-22 - situacao da assinatura no resumo Geral

- Pedido direto de produto aplicado no card `Dados da assinatura` da aba Admin `Geral`.
- O card passou a ter um bloco azul no topo, igual aos blocos `Situacao da conta` e `Situacao do registro`, com `Situacao atual`, titulo de situacao, badge de status e texto explicativo.
- A situacao usa somente dados reais ja disponiveis no resumo administrativo e no endpoint real de billing quando carregado:
  - cortesia administrativa ativa aparece como `Cortesia ativa`;
  - assinatura profissional paga ativa aparece como `Assinatura paga ativa`;
  - plano gratuito ativo aparece como `Plano gratuito ativo`;
  - status `inadimplente`, `cancelada`, `inativa` e ausencia de assinatura tem fallback honesto.
- Nao houve alteracao de backend, endpoint, schema Prisma, migrations, packages, mock ou dado persistido.
- A UI permanece mobile-first: o bloco novo empilha conteudo em largura estreita e mantem o alinhamento dos tres cards na grade desktop.
- Builder/Quick Copy nao esteve acessivel como ferramenta callable neste ambiente; a referencia visual usada foi a captura enviada pelo usuario e o PNG local `_product/proto/admin/Psicologos/Detalhes do psicologo/Geral.png`.

### Criterios do ajuste de situacao da assinatura

- [x] `Dados da assinatura` exibe um bloco azul de `Situacao atual` no topo.
- [x] O bloco segue o mesmo padrao visual dos cards `Situacao da conta` e `Situacao do registro`.
- [x] A situacao da assinatura usa dados reais ja carregados, sem mock.
- [x] UI permanece mobile-first.
- [x] Nenhum `<img>` cru foi usado.

### Validacao complementar do ajuste de situacao da assinatura

- `pnpm --dir admin exec biome check "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin build` foi reexecutado, mas ficou bloqueado por lock preexistente em `.next/lock` apos outro processo `next build` nao finalizar limpo.
- `pnpm check` (frontend e backend passaram; admin ficou bloqueado por formatacao preexistente em `admin/src/app/(admin)/pacientes/[id]/client.tsx` e `admin/src/app/(admin)/pacientes/client.tsx`).
- Smoke HTTP local: `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf` retornou `200`.

## Ajuste pos-feedback 2026-07-23 - Nome completo em Dados pessoais

- Pedido direto de produto aplicado na aba Admin **Perfil e cadastro**, card **Dados pessoais** do psicologo.
- O endpoint `GET /api/admin/private/psychologists/:id` passou a retornar `profile.personal.full_name`, montado a partir de `psychologist_profile.professional_first_name` + `professional_last_name` e preservando prefixos/titulos definidos pelo psicologo, como `Dra.` ou `Psicologa`.
- Quando o nome profissional separado nao existir em perfis legados, o fallback usa `user.name` apenas com normalizacao de espacos.
- A primeira linha do card **Dados pessoais** agora e **Nome completo**; CPF, e-mail, WhatsApp e demais dados continuam abaixo.
- Nao houve alteracao de schema Prisma, migrations, packages, mock, seed ou endpoint simulado.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram a captura enviada pelo usuario e `_product/proto/admin/Psicologos/Detalhes do psicologo/Perfil e Cadastro.png`.
- ADR criado: `adrs/0313-admin-dados-pessoais-nomes-exibicao.md`.

### Criterios de aceite do ajuste

- [x] **Dados pessoais** do psicologo mostra **Nome completo** como primeira linha.
- [x] O nome exibido usa o nome profissional definido pelo psicologo e preserva prefixos/titulos digitados.
- [x] Perfis legados sem nome profissional separado usam fallback real de `user.name`.
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


## Ajuste pos-feedback 2026-07-27 - Peso textual dos titulos em todas as abas de detalhe

- Pedido do usuario: aplicar o mesmo peso textual reduzido aos titulos das paginas de detalhe administrativo do psicologo.
- A UI do Admin alterou os titulos semanticos `h2`, `h3` e `h4` do detalhe de psicologo de `font-black`/`font-extrabold` para `font-bold`, que no escopo `admin-premium-pilot` computa como `font-weight: 600`.
- Cobertura: abas **Geral**, **Perfil e cadastro**, **Assinatura**, **Estatisticas**, **Publicacoes**, **Avaliacoes**, **Denuncias**, **Atividades** e **Conta**.
- A alteracao preservou copy, hierarquia, icones, filtros, contratos, calculos e dados reais; valores, badges, labels de tabela e botoes nao foram rebaixados como titulo de bloco.
- Nao houve schema Prisma, migration, package novo, seed, mock, endpoint simulado, tracking ou backfill artificial. `db:migrate` nao se aplicou.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram o screenshot enviado pelo usuario em 2026-07-27 e os PNGs locais em `_product/proto/admin/Psicologos/Detalhes do psicologo/`.
- ADR nao atualizado por se tratar de ajuste visual local de tipografia sem decisao arquitetural nova.

### Criterios de aceite do ajuste

- [x] Os titulos de blocos do detalhe de psicologo usam peso textual reduzido e computam como `font-weight: 600`.
- [x] A cobertura inclui Geral, Perfil e cadastro, Assinatura, Estatisticas, Publicacoes, Avaliacoes, Denuncias, Atividades e Conta.
- [x] Nenhuma copy, filtro, icone, contrato, calculo ou dado real foi alterado.
- [x] O layout permanece mobile-first e sem overflow horizontal em 390px.
- [x] Nenhum schema Prisma, migration, package novo, mock, seed ou endpoint simulado foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless via Chrome CDP em `http://localhost:3002/psicologos/cmrwmw35t0000xkuhxoceh77v`: desktop `1366x900` e mobile `390x844` validaram as abas Geral, Perfil, Plano, Estatisticas, Publicacoes, Avaliacoes, Denuncias, Atividades e Conta sem `font-black`/`font-extrabold` em titulos `h2`/`h3`/`h4` visiveis e sem overflow horizontal. Admin temporario real removido ao final.


## Ajuste complementar 2026-07-28 - contadores de conversão e engajamento na aba Geral

- Pedido direto de produto aplicado na aba Admin `Geral` do detalhe do psicologo.
- Os tres blocos `Cliques no WhatsApp`, `Favoritado` e `Visualizacoes de perfil` foram unificados em um unico contador `Conversão`.
- O contador `Conversão` destaca o resultado real `business.profile_conversion.label` retornado por `GET /api/admin/private/psychologists/:id/statistics` no periodo `all`; os tres sinais originais continuam dentro do contador com menor peso textual.
- Foi adicionado o contador `Engajamento`, usando `community.engagement_diagnosis.label` do mesmo endpoint real de estatisticas.
- A ordem dos contadores passa a ser `Ranking`, `Avaliacoes`, `Conversão`, `Engajamento`.
- Nao houve alteracao de backend, endpoint, schema Prisma, migrations, package, mock, seed ou backfill.
- UI permanece mobile-first: os quatro contadores empilham em largura base e usam grade em duas colunas a partir de `sm` e quatro colunas em desktop largo.
- Builder/Quick Copy nao esteve acessivel como ferramenta callable; foram usadas a captura enviada pelo usuario e a referencia local `_product/proto/admin/Psicologos/Detalhes do psicologo/Geral.png`.
- ADR criado: `adrs/0329-admin-psicologo-contadores-conversao-engajamento.md`.

### Criterios do ajuste de contadores

- [x] WhatsApp, Favoritado e Visualizacoes de perfil aparecem dentro do contador `Conversão` com menor peso textual.
- [x] `Conversão` destaca o resultado real da classificacao de conversão do psicologo.
- [x] A aba Geral exibe um novo contador `Engajamento` com diagnostico real.
- [x] A ordem visual dos contadores e `Ranking`, `Avaliacoes`, `Conversão`, `Engajamento`.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo ou migration foi criado.
- [x] Nenhum `<img>` cru foi usado.

### Validacao complementar do ajuste de contadores

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build` executado com sucesso apos tentativas intermediarias bloqueadas por outro `next build` em andamento e uma tentativa bloqueada por falta de espaco em disco (`ENOSPC`). Perfis temporarios de browser em `.tmp/chrome-*` foram removidos para liberar espaco antes da validacao final.
- Smoke HTTP local: GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf retornou 200.


## Ajuste pos-feedback 2026-07-28 - Conversão sem sinais internos

- Pedido direto de produto aplicado na aba Admin `Geral` do detalhe do psicologo.
- O contador `Conversão` passou a exibir somente o resultado real `business.profile_conversion.label`, sem listar `WhatsApp`, `Favoritado` e `Visualizacoes de perfil` dentro do card.
- Os sinais continuam disponiveis nos blocos detalhados de estatisticas e nao foram removidos do contrato, tracking, backend ou calculo de conversão.
- Nao houve alteracao de backend, endpoint, schema Prisma, migrations, package, mock, seed ou backfill.
- UI permanece mobile-first com os quatro contadores na ordem `Ranking`, `Avaliacoes`, `Conversão`, `Engajamento`.
- Builder/Quick Copy nao esteve acessivel como ferramenta callable; foram usadas a captura enviada pelo usuario e a referencia local `_product/proto/admin/Psicologos/Detalhes do psicologo/Geral.png`.
- ADR atualizado: `adrs/0329-admin-psicologo-contadores-conversao-engajamento.md`.

### Criterios do ajuste pos-feedback

- [x] O contador `Conversão` nao exibe `WhatsApp`, `Favoritado` nem `Visualizacoes de perfil` dentro do card.
- [x] `Conversão` continua destacando o resultado real da classificacao de conversão do psicologo.
- [x] A ordem visual dos contadores permanece `Ranking`, `Avaliacoes`, `Conversão`, `Engajamento`.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo ou migration foi criado.
- [x] Nenhum `<img>` cru foi usado.

### Validacao complementar do ajuste pos-feedback

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx" "../adrs/0329-admin-psicologo-contadores-conversao-engajamento.md" "../_product/tasks/TASK-55-detalhe-psicologo-geral-perfil-admin.md"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf retornou 200.

## Ajuste pos-feedback 2026-08-03 - Cards superiores mais enxutos na aba Geral

- Pedido direto de produto aplicado na aba Admin `Geral` do detalhe do psicologo.
- O card `Conversao` deixa de renderizar textos auxiliares quando a classificacao real esta em `insufficient_data`, removendo da tela `Sem comparacao durante adaptacao` e a frase com dias minimos de adaptacao.
- O card `Engajamento` deixa de renderizar a legenda fixa `Diagnostico geral nas comunidades`, mantendo apenas o diagnostico real retornado pelo endpoint de estatisticas.
- O card `Avaliacoes` passa a mostrar a quantidade real de avaliacoes na mesma linha da nota, por exemplo `3,6 8 avaliacoes`, sem alterar a fonte dos dados.
- Nao houve alteracao de backend, endpoint, contrato, schema Prisma, migration, package novo, mock, seed ou dado persistido.
- UI permanece mobile-first: os quatro cards continuam empilhando em largura base e a quantidade de avaliacoes usa alinhamento inline sem introduzir overflow.
- Builder/Quick Copy nao esteve acessivel como ferramenta callable neste ambiente; as referencias auditaveis foram a captura enviada pelo usuario e o PNG local `_product/proto/admin/Psicologos/Detalhes do psicologo/Geral.png`.
- ADR atualizado: `adrs/0329-admin-psicologo-contadores-conversao-engajamento.md`.

### Criterios do ajuste pos-feedback

- [x] `Sem comparacao durante adaptacao` nao aparece mais no card `Conversao` quando a base e insuficiente.
- [x] A frase com dias minimos de adaptacao nao aparece mais no card `Conversao`.
- [x] `Diagnostico geral nas comunidades` nao aparece mais no card `Engajamento`.
- [x] A quantidade de avaliacoes aparece ao lado da nota no card `Avaliacoes`.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo ou migration foi criado.
- [x] Nenhum `<img>` cru foi usado.

### Validacao complementar do ajuste pos-feedback 2026-08-03

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check -- "admin/src/app/(admin)/psicologos/[id]/client.tsx"`
- Smoke HTTP local: GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf retornou 200.
- Validacao visual autenticada em browser interativo nao foi executada porque o ambiente nao expoe a sessao Admin do navegador do usuario; a validacao local ficou limitada ao build, checks, referencia visual e smoke HTTP da rota.
