# TASK-16: Contato por WhatsApp

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-16 |
| Prioridade | P1 |
| EsforÃ§o | M |
| Fase | Perfil |
| Status | Completed |
| DependÃªncias | TASK-02, TASK-03, TASK-15 |
| ADR alvo | ADR-0022 |

## ReferÃªncias obrigatÃ³rias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## ReferÃªncias visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/ConfirmaÃ§Ã£o de WhatsApp - Inserir NÃºmero.jpg` | `figma-design-frame-54-Confirma--o-de-WhatsApp---Inserir-N-mero.html` |

As referÃªncias visuais sÃ£o norte de produto e layout. Elas nÃ£o autorizam recriar arquitetura, aceitar cÃ³digo gerado sem revisÃ£o, usar mock ou ignorar os padrÃµes atuais do projeto.

## Contexto

O produto promete levar pacientes ao WhatsApp do psicÃ³logo. Essa aÃ§Ã£o precisa ser registrada e sÃ³ deve usar integraÃ§Ã£o real ou link autorizado.

## Objetivo

Implementar confirmaÃ§Ã£o de contato WhatsApp com persistÃªncia de intenÃ§Ã£o e integraÃ§Ã£o real quando decidida.

## PrÃ©-requisitos e bloqueios

- Contato WhatsApp foi decidido na TASK-03 / ADR-0006: registrar `contact_request` e abrir link direto `wa.me` com o nÃºmero real do psicÃ³logo.
- VerificaÃ§Ã£o de nÃºmero usa Twilio SMS/OTP. Sem credenciais/nÃºmero de teste Twilio no ambiente, persistir o nÃºmero como nÃ£o verificado e nÃ£o preencher `whatsapp_verified_at`.
- WhatsApp Business API nÃ£o entra no MVP; nÃ£o disparar mensagem ativa pelo WhatsApp.

Se qualquer bloqueio obrigatÃ³rio estiver ativo, pare a implementaÃ§Ã£o, registre ADR/pendÃªncia e nÃ£o marque a task como concluÃ­da.

## Escopo frontend

Rotas esperadas:

- `/app/psychologist/[id]/contact` (dentro do shell privado da TASK-12, a partir do perfil da TASK-15)

ImplementaÃ§Ã£o esperada:

- Criar modal/tela de confirmaÃ§Ã£o antes de abrir WhatsApp.
- Solicitar/confirmar nÃºmero do paciente quando necessÃ¡rio.
- Registrar clique/intenÃ§Ã£o antes do redirecionamento.
- Exibir polÃ­tica curta de privacidade/consentimento.
- NÃ£o abrir WhatsApp com telefone fake ou placeholder.

## Escopo backend

ImplementaÃ§Ã£o esperada:

- Endpoint para criar contato/intenÃ§Ã£o, persistindo `contact_request` (ver `DATA-MODEL.md`; `channel` default `"whatsapp"`) para analytics e elegibilidade de avaliaÃ§Ã£o.
- Validar profissional publicado (`psychologist_profile.published`) e WhatsApp configurado (`psychologist_profile.whatsapp`).
- SÃ³ liberar/abrir o WhatsApp quando `psychologist_profile.whatsapp` existir; o preenchimento de `whatsapp_verified_at` depende de verificaÃ§Ã£o real por Twilio SMS/OTP (ADR-0006).
- Usar Twilio SMS/OTP quando for verificar o nÃºmero; usar `wa.me` para contato do paciente.
- NÃ£o expor telefone sem regra de privacidade definida.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `contact_request`
- `psychologist_profile` (`whatsapp`, `whatsapp_verified_at`)
- `patient_profile` (`phone`)

Guarda de papel (ver `DATA-MODEL.md`, "Camadas de autenticaÃ§Ã£o e autorizaÃ§Ã£o" e ADR-0002):

- Esta Ã© uma rota de contato caller-neutra, montada sob `/api/private/directory/*`, guardada apenas por `_auth` (qualquer autenticado) â€” **nunca** por `requireRole`. Pacientes precisam contatar psicÃ³logos a partir da descoberta, entÃ£o o contato nÃ£o pode ser psicÃ³logo-only.
- NÃ£o usar `/api/private/psychologists` (confundÃ­vel com a autogestÃ£o do psicÃ³logo em `/api/private/psychologist/*`).
- Expor apenas campos PUBLIC-safe do `psychologist_profile`; o `whatsapp` sÃ³ Ã© liberado pelo fluxo de contato e nunca `cpf` ou campos de conta.

Endpoints esperados (ver "ConvenÃ§Ã£o de rotas" do `DATA-MODEL.md`):

- POST `/api/private/directory/psychologists/:id/contact` (cria `contact_request`)

## Contrato tÃ©cnico detalhado

Arquitetura frontend obrigatÃ³ria:

- Telas em `frontend/src/app/{rota}/page.tsx`, `logic.tsx` e `use-form.tsx` quando houver formulÃ¡rio.
- Chamadas HTTP em `frontend/src/api/req/{dominio}/index.ts` usando `callEndpoint` e `handleReq`.
- Hooks React Query em `frontend/src/api/callers/{dominio}/index.tsx`.
- Query keys em `frontend/src/api/cache/keys.ts`.
- Shells/templates em `frontend/src/templates`.
- Componentes existentes em `frontend/src/registry/new-york-v4/ui` e `frontend/src/components/ui` devem ser reutilizados antes de criar novos.
- Quando houver formulÃ¡rio ou campo, usar `frontend/src/hooks/form`, `frontend/src/components/controllers`, React Hook Form e Zod conforme `TASK-02`.

Arquitetura backend obrigatÃ³ria:

- Novas APIs em `backend/src/modules/api/{public|private}/{dominio}/{caso}`.
- Rotas registradas em `backend/src/main/server/imports/write.ts`.
- Validadores em `validator/index.ts` usando os helpers/pacote local de validaÃ§Ã£o.
- Services e repositories separados quando houver regra de domÃ­nio ou persistÃªncia.
- Respostas usando `send`, `error500`, `error` e traduÃ§Ãµes em `backend/locales/pt/translation.json`.
- Prisma com nomes e padrÃµes jÃ¡ definidos em `ARCHITECTURE.md`.

Packages permitidos nesta task:

- libphonenumber-js
- TanStack Query
- Prisma
- twilio

Regras anti-recriaÃ§Ã£o especÃ­ficas:

- Procurar componente, helper, model, endpoint e query key equivalente antes de criar estrutura nova.
- NÃ£o criar client HTTP paralelo, store paralela, autenticaÃ§Ã£o paralela, validator paralelo ou design system paralelo.
- NÃ£o usar `sample/` como referÃªncia direta de implementaÃ§Ã£o futura.
- NÃ£o instalar package novo sem consultar `PACKAGES.md` e registrar ADR.

## Estados obrigatÃ³rios

- Loading inicial.
- Erro de rede/API em PT-BR.
- Estado vazio quando nÃ£o houver dado real.
- Sucesso com feedback visual discreto.
- Responsividade mobile-first baseada nas imagens exportadas.

## Fora do escopo

- Criar dados fake, seed artificial ou mock para preencher tela.
- Concluir integraÃ§Ã£o externa ausente.
- Refatorar mÃ³dulos nÃ£o relacionados Ã  task.
- Trocar package manager ou stack base.

## CritÃ©rios de aceite

- [x] As referÃªncias visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [x] Rotas de descoberta sob `/api/private/directory/*` usam sÃ³ `_auth` (neutras), nunca `requireRole`, conforme ADR-0002.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicÃ¡vel.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Todos os estados obrigatÃ³rios existem e usam textos em PT-BR.
- [x] FormulÃ¡rios e campos usam a fundaÃ§Ã£o da `TASK-02` quando aplicÃ¡vel.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum cÃ³digo gerado por Builder foi aceito sem revisÃ£o e adequaÃ§Ã£o Ã  arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## ValidaÃ§Ã£o mÃ­nima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluÃ­da em um commit prÃ³prio. Se houver bloqueio externo, registre claramente o bloqueio e nÃ£o avance para a prÃ³xima task.

## ExecuÃ§Ã£o TASK-16

- DependÃªncias confirmadas pelos arquivos das tasks: `TASK-02` e `TASK-03` estÃ£o `Completed`, e `TASK-15` estÃ¡ `Completed`.
- ReferÃªncia visual consultada: `_product/proto/ConfirmaÃ§Ã£o de WhatsApp - Inserir NÃºmero.jpg` (base mobile ~430px).
- Builder Quick Copy ativo (`vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`) foi tentado via `npx "@builder.io/dev-tools@latest" auth status`, mas o ambiente nÃ£o estava autenticado no Builder; a implementaÃ§Ã£o usou o fallback de imagem local e registrou a limitaÃ§Ã£o na ADR-0022.
- Backend implementado em `POST /api/private/directory/psychologists/:id/contact`, sob `/api/private/directory/*`, com guarda somente `_auth` e sem `requireRole`.
- PersistÃªncia implementada com `contact_request` e migration `20260606160655_add_contact_requests`.
- Regra adotada: o link `wa.me` sÃ³ Ã© retornado quando o perfil publicado possui `whatsapp` e `whatsapp_verified_at`, preservando a trava de verificaÃ§Ã£o real jÃ¡ exposta pela TASK-15.
- Frontend implementado em `/app/psychologist/[id]/contact`, mobile-first, com React Hook Form/Zod, `PhoneController` e `CheckboxController` da fundaÃ§Ã£o da TASK-02.
- Nenhum pacote novo foi instalado e nenhum mock/dado fake permanente foi criado. Os dados usados nos smokes de API/browser foram temporÃ¡rios e removidos ao final.

## ValidaÃ§Ã£o executada

- `pnpm --dir backend db:migrate --name add_contact_requests`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke real de API com paciente e psicÃ³logo temporÃ¡rios: persistiu `contact_request`, atualizou `patient_profile.phone` normalizado e retornou `whatsapp_url` `wa.me`.
- Browser local headless em Chrome na rota `/app/psychologist/[id]/contact`: renderizou cÃ³pia de WhatsApp, profissional temporÃ¡rio real, privacidade/consentimento, CTA e telefone inicial.

## ADR

- `adrs/0022-contato-whatsapp-wa-me.md`

## Complemento de verificaÃ§Ã£o de telefone em 2026-06-07

- A verificaÃ§Ã£o real do WhatsApp do psicÃ³logo foi implementada como complemento da TASK-16, sem
  alterar a decisÃ£o de contato por `wa.me`.
- Requisito externo auditado: `TWILIO_API_ACCOUNT_SID`, `TWILIO_API_AUTH_TOKEN` e
  `TWILIO_API_PHONE_NUMBER` existem no `backend/.env`; os valores nÃ£o foram expostos.
- Backend criado em `/api/private/psychologist/whatsapp/verification/request` e
  `/api/private/psychologist/whatsapp/verification/confirm`, sob `requireRole("psicologo")`.
- Prisma atualizado com `phone_verification`, armazenando somente hash do OTP, expiraÃ§Ã£o, tentativas
  e auditoria mÃ­nima; o cÃ³digo puro nunca Ã© persistido.
- Ao solicitar cÃ³digo, o WhatsApp Ã© persistido em E.164 com `whatsapp_verified_at=null`; ao confirmar
  cÃ³digo real enviado por Twilio SMS, `psychologist_profile.whatsapp_verified_at` Ã© preenchido.
- Frontend mobile-first criado em `/app/professional/whatsapp/verify`, usando React Hook Form/Zod e
  controllers `phone`/`otp` da TASK-02. O item â€œVerificar WhatsAppâ€ foi adicionado ao perfil privado
  atual para tornar o fluxo acessÃ­vel enquanto TASK-18 permanece bloqueada.
- NÃ£o foi enviado SMS de teste automaticamente para evitar custo/uso de nÃºmero pessoal sem confirmaÃ§Ã£o
  explÃ­cita do usuÃ¡rio; os endpoints foram validados por build/check e smoke sem autenticaÃ§Ã£o.

## ValidaÃ§Ã£o adicional executada

- `pnpm --dir backend db:migrate -- --name add_phone_verifications`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local sem autenticaÃ§Ã£o:
  `POST /api/private/psychologist/whatsapp/verification/request` retornou 401.
- Smoke local da rota:
  `/app/professional/whatsapp/verify` respondeu 307 para login sem cookie, confirmando proteÃ§Ã£o
  privada; a tela autenticada foi validada por build porque nÃ£o havia token real de psicÃ³logo ativo
  no banco local e nÃ£o foi criado usuÃ¡rio/token fake para passar pelo guard.

## Execucao complementar em 2026-06-07

- O sucesso da verificacao de telefone agora continua a jornada de onboarding do psicologo.
- Plano gratuito segue para `/app/professional/profile/setup`.
- Assinatura profissional ativa real segue para `/psychologist/cfp`, pois o endereco de faturamento
  passou a ser etapa anterior ao telefone, logo apos confirmacao real de pagamento.
- A etapa nao simula pagamento, endereco ou perfil final; apenas usa o status real de `professional_subscription` para decidir o proximo passo.

## Diagnostico de SMS em 2026-06-07

- A falha reportada na rota `/app/professional/whatsapp/verify` foi auditada sem expor segredos: as mensagens Twilio recentes para o telefone de teste estavam `failed` com `errorCode=21659`.
- A conta Twilio configurada nas variaveis `TWILIO_API_ACCOUNT_SID`/`TWILIO_API_AUTH_TOKEN` nao lista nenhum `incomingPhoneNumber` nem `Messaging Service`; portanto o `TWILIO_API_PHONE_NUMBER` atual nao e um remetente SMS valido dessa conta.
- Codigo ajustado para retornar erro especifico de remetente Twilio invalido, registrar `provider_message_id` quando o envio for aceito e aceitar `TWILIO_API_MESSAGING_SERVICE_SID` como alternativa real ao numero remetente.
- Nao houve envio simulado, OTP fake, preenchimento de `whatsapp_verified_at` sem SMS real nem alteracao destrutiva no banco.
- Pendencia externa: configurar um numero Twilio SMS-capable pertencente a conta ou um Messaging Service valido; depois disso, o mesmo fluxo real de OTP pode ser usado.

## Complemento em 2026-06-07: WhatsApp sem autenticação

- Por decisão de produto, o número de WhatsApp profissional não será mais autenticado por SMS nem por WhatsApp no MVP.
- A rota `/app/professional/whatsapp/verify` foi mantida como endereço existente, mas agora é apenas a etapa de informar e salvar o WhatsApp profissional.
- O backend salva o número normalizado em `psychologist_profile.whatsapp` e mantém `whatsapp_verified_at=null`.
- O contato do paciente continua gerando o link `wa.me` internamente apenas depois do consentimento e da persistência de `contact_request`.
- O campo `whatsapp_verified_at` permanece no banco por compatibilidade histórica, mas não bloqueia mais `whatsapp_available` nem a criação do link de contato.

## Execucao complementar: modal global de redirecionamento WhatsApp (2026-06-14)

- Pedido do usuario: corrigir a modal de redirecionamento para WhatsApp no desktop e no mobile, especialmente em `/app/psychologists`, para cobrir a tela inteira, ficar acima da sidebar/feed/botoes e centralizar o card na viewport.
- O componente compartilhado `PsychologistWhatsAppRedirectButton` passou a renderizar `PsychologistWhatsAppRedirectModal` via portal em `document.body`, com camada `position: fixed`, `inset: 0`, `z-index` global alto, overlay translucido e `backdrop-blur`.
- O card da transicao agora e centralizado por flex na viewport inteira, com largura maxima responsiva, sem depender do container do feed, da coluna do card ou do layout da comunidade.
- Enquanto a modal esta aberta, `body` e `documentElement` ficam com `overflow: hidden`, e a rota `/app/psychologists` passa a ignorar eventos de wheel/touch vindos de elementos com `data-psychologists-scroll-lock`, evitando que o feed interno role por tras da modal.
- O fluxo de registro de clique e redirecionamento para WhatsApp nao foi alterado; apenas a camada visual/portal da transicao foi corrigida.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, endpoints ou contratos de API.
- ADR atualizado: `adrs/0078-transicao-whatsapp-psicologo.md`.

Validacoes do complemento:

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- HTTP local em `/app/psychologists` e `/app/community/feed` respondeu `200`.

## Execucao complementar: padronizacao de CRP no WhatsApp (2026-06-14)

- Pedido do usuario: corrigir a modal de redirecionamento para WhatsApp que exibia `CRP CRP DEMO/00005`.
- Causa raiz: alguns campos `crp` ja chegam com o prefixo `CRP`, enquanto a modal adicionava o prefixo novamente durante a renderizacao.
- O utilitario compartilhado `formatCrpNumber` passou a remover prefixos `CRP` repetidos antes de normalizar o numero/registro.
- Foi criado `formatCrpLabel` para renderizar o label completo no padrao `CRP XX/00000` ou `CRP DEMO/00005`, com apenas uma ocorrencia do prefixo.
- A modal de WhatsApp, o perfil do psicologo, o perfil privado e o ranking de mentores passaram a reutilizar o formatter compartilhado.
- Cards de psicologos, favoritos, feed da comunidade e respostas profissionais continuam enviando o campo `crp` ao componente compartilhado de WhatsApp, portanto herdam a correcao na modal.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, endpoints ou contratos de API.
- ADR atualizado: `adrs/0078-transicao-whatsapp-psicologo.md`.
- Validacoes executadas nesta execucao:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- Smoke do formatter: `CRP DEMO/00005` e `CRP CRP DEMO/00005` renderizam como `CRP DEMO/00005`.
- HTTP local com cookie de sessao de desenvolvimento em `/app/psychologists`, `/app/favorites`, `/app/community/feed`, `/app/community/top-mentors`, `/app/profile` e `/app/psychologist/demo` respondeu `200`.

## Ajuste visual da tela WhatsApp profissional em 2026-06-18

- Pedido direto de produto: refinar a tela `/app/professional/whatsapp/verify` para reduzir ruido visual e alinhar a iconografia ao WhatsApp usado nos CTAs da plataforma.
- Referencia visual ativa consultada: `_product/proto/Confirmação de WhatsApp - Inserir Número.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente.
- O icone azul generico foi substituido pelo componente compartilhado `WhatsAppIcon`, mantendo a cor azul da Lectum.
- Removido o texto azul superior `WhatsApp profissional` abaixo do icone; o titulo principal passa a conduzir a tela.
- Texto descritivo atualizado para: `Usaremos este número para gerar o link de contato para o seu WhatsApp. Altere quando quiser.`
- Removido o texto auxiliar abaixo do label do campo de telefone.
- O seletor de codigo do pais passou a usar seta customizada com `appearance-none` e espacamento a direita, evitando que a seta fique colada na divisoria do campo.
- O link superior da configuracao inicial passou de `Voltar para perfil` para `Voltar para planos`, apontando para `/app/professional/billing/plans`.
- No estado de sucesso (`WhatsApp salvo`), o retorno passou a ser `Voltar para configuração de WhatsApp`, limpando o estado de sucesso e voltando ao formulário sem sair da rota.
- O card de proxima etapa passou a destacar `Vídeo de apresentação e perfil profissional` e a orientar o envio de video vertical para ativar a exibicao na pagina de psicologos.
- Removidos da configuração inicial o alerta verde `WhatsApp atual` e o CTA `Configurar perfil`, deixando a etapa focada somente na edição/salvamento do número.
- Nao houve alteracao de backend, Prisma, migrations, packages, endpoint ou regra de salvamento do WhatsApp.

### Validacao do ajuste

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local em `/app/professional/whatsapp/verify`, com sessao real de psicologo, validou a nova copy, ausencia dos textos removidos, ausencia do alerta `WhatsApp atual` e do CTA inicial `Configurar perfil`, link inicial `Voltar para planos`, estado de sucesso com `Voltar para configuração de WhatsApp`, novo card de etapa final, icone WhatsApp no cabecalho, seta com respiro no seletor de pais e ausencia de overflow horizontal mobile.

## Complemento em 2026-07-01: nome curto derivado no CTA de WhatsApp da comunidade

- Pedido direto de produto: substituir a regra do CTA `Falar com {primeiro nome}` por uma regra deterministica derivada do nome completo do psicologo, ja que ainda nao existe campo de nome curto/preferido.
- Regra adotada: normalizar espacos, usar os dois primeiros termos do nome completo e incluir tambem o terceiro termo quando o segundo for particula (`de`, `da`, `do`, `das`, `dos`, `di`, `du` ou `e`). Se houver apenas um termo, usar esse termo; se o nome estiver ausente, usar fallback `psicólogo`.
- Exemplo validado: `Ana Rúbia Cunha Papi` passa a renderizar `Falar com Ana Rúbia`.
- Implementacao centralizada no utilitario frontend `getProfessionalShortDisplayName`, consumido por `CommunityWhatsAppCta`.
- O texto contextual do link `wa.me` no backend nao foi alterado; esta execucao ajusta apenas a copy do CTA visual em posts/respostas da comunidade.
- Builder Quick Copy foi tentado por `npx "@builder.io/dev-tools@latest" auth status`, mas o ambiente retornou `Not Authenticated to Builder.io`; foi usado fallback visual local/produto.
- Referencias visuais consultadas: `_product/proto/Dentro do Post.jpg` e browser local mobile `390x844` na rota publica de post.
- ADR atualizado: `adrs/0164-cta-whatsapp-conectado-midias-comunidade.md`.

### Critérios de aceite do complemento

- [x] CTA de WhatsApp da comunidade deriva o nome de chamada a partir do nome completo real do psicologo.
- [x] Nomes compostos como `Ana Rúbia Cunha Papi` exibem os dois primeiros termos: `Falar com Ana Rúbia`.
- [x] Particulas de nome como `de`, `da`, `do`, `das`, `dos`, `di`, `du` e `e` incluem o terceiro termo quando existir.
- [x] Nenhum schema, endpoint, mock, seed artificial ou pacote novo foi criado.
- [x] ADR relevante atualizado.
- [x] Validacoes de frontend, build, check raiz e browser local foram executadas.

### Validação do complemento

- `pnpm --dir frontend exec biome check --write src/components/community/community-whatsapp-cta.tsx src/utils/professional-name.ts`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build` (primeira tentativa bloqueada por um build Next concorrente; repeticao concluida com sucesso)
- `pnpm check`
- Browser local via Chrome/CDP mobile `390x844` em `/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v`, confirmando `WhatsApp` + `Falar com Ana Rúbia` sem quebra visual no card.

## Complemento em 2026-07-01: nome curto derivado também na mensagem do WhatsApp

- Pedido direto de produto: a prévia/mensagem pronta do WhatsApp deve usar o mesmo nome do psicologo exibido no botão `Falar com ...`.
- O backend passou a usar a mesma regra de nome curto derivado na saudação do `wa.me`: `Ana Rúbia Cunha Papi` gera `Olá Ana Rúbia, ...`.
- A regra foi adicionada em `backend/src/utils/professional-name.ts` e consumida por `backend/src/utils/whatsapp-contact.ts`, sem alterar schema, endpoint, telefone exposto ou tracking de `contact_request`.
- `DATA-MODEL.md` foi atualizado apenas no complemento de mensagens `wa.me` para deixar de citar "primeiro nome" e documentar o "mesmo nome curto derivado do CTA".
- Nenhum pacote novo, mock, seed artificial ou migration foi criado.
- ADR atualizado: `adrs/0164-cta-whatsapp-conectado-midias-comunidade.md`.

### Critérios de aceite do complemento

- [x] A mensagem pronta do `wa.me` usa o mesmo nome curto derivado do botão.
- [x] `Ana Rúbia Cunha Papi` gera `Falar com Ana Rúbia` no CTA e `Olá Ana Rúbia, ...` na mensagem.
- [x] A mudança vale para URLs de WhatsApp de perfil, listagem, favoritos, posts e respostas por usar o utilitário backend compartilhado.
- [x] Nenhum contrato de API estrutural, banco, schema Prisma, endpoint ou package novo foi alterado.
- [x] ADR e documentação de task foram atualizados.

### Validação do complemento

- `pnpm --dir backend exec biome check --write src/utils/whatsapp-contact.ts src/utils/professional-name.ts`
- Smoke local do utilitário backend confirmou que `buildLectumWhatsappUrl` decodifica `text` como `Olá Ana Rúbia, encontrei seu post na Lectum e gostaria de conversar sobre atendimento.`
- `pnpm --dir backend check`
- `pnpm check`
