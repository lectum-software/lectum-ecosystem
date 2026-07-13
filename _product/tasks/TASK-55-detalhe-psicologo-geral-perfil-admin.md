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
