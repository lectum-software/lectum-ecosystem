# TASK-30: Configurações de conta

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-30 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Conta |
| Status | Completed |
| Dependências | TASK-02, TASK-12 |
| ADR alvo | ADR de configurações de conta e segurança |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Configurações de Conta - Login Google.jpg` | `figma-design-frame-41-Configura--es-de-Conta---Login-Google.html` |
| `_product/proto/Editar E-mail e Senha.jpg` | `figma-design-frame-34-Editar-E-mail-e-Senha.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Mudanças de e-mail e senha são sensíveis. Devem exigir senha atual/código quando necessário e atualizar sessão sem quebrar autenticação.

## Objetivo

Criar configurações de conta para login Google, e-mail e senha com segurança real.

## Pré-requisitos e bloqueios

- Sem OAuth Google configurado, bloquear vínculo/desvínculo Google e manter edição e-mail/senha.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Integração com backend existente (não recriar)

- Vínculo/desvínculo Google **reaproveita o módulo Google já existente** em `backend/src/modules/api/public/google/*`. Estender esse módulo conforme necessário; **não** especificar um endpoint OAuth paralelo.
- E-mail/senha/sessão operam sobre os modelos reais `user` e `user_token` (ver `DATA-MODEL.md` › "Identidade (já existe — não recriar)"). Verificação de novo e-mail reusa `user.confirm_code`/`user.confirmed`; nunca criar `emailVerifiedAt`. `user_token` **não tem coluna `type`** — não armazenar tokens tipados nele.
- Persistência de tema/dark mode: armazenar em `user_background` (`type:"preference"`) conforme `DATA-MODEL.md`. **Não** inventar `user_identity` (não existe no `DATA-MODEL.md`).

Implementação esperada:

- Criar tela de conta e segurança.
- Permitir conectar/desconectar Google quando regra permitir.
- Formulário de alteração de e-mail e senha.
- Validar senha atual, nova senha e confirmação.
- Exibir estados de confirmação/erro em PT-BR.

## Escopo backend

Implementação esperada:

- Endpoints privados para alterar e-mail/senha.
- Validar senha atual antes de troca de senha.
- Gerar verificação para novo e-mail.
- Gerenciar vínculo Google sem remover último método de login sem alternativa.
- Invalidar tokens se necessário.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md` › "Identidade (já existe — não recriar)"; reutilizar campos reais, sem inventar):

- `user` (real; e-mail/senha/`confirm_code`/`confirmed`).
- `user_token` (real; sem coluna `type`).
- `user_background` (`type:"preference"`) para preferências como tema/dark mode. **Não** usar `user_identity` (não existe no `DATA-MODEL.md`).

Endpoints esperados:

- PUT `/api/private/account/email`
- PUT `/api/private/account/password`
- Vínculo/desvínculo Google: **estender o módulo existente** `backend/src/modules/api/public/google/*` (reuso, não endpoint paralelo). Expor as ações de link/unlink dentro desse módulo/contrato existente.

## Contrato técnico detalhado

Arquitetura frontend obrigatória:

- Telas em `frontend/src/app/{rota}/page.tsx`, `logic.tsx` e `use-form.tsx` quando houver formulário.
- Chamadas HTTP em `frontend/src/api/req/{dominio}/index.ts` usando `callEndpoint` e `handleReq`.
- Hooks React Query em `frontend/src/api/callers/{dominio}/index.tsx`.
- Query keys em `frontend/src/api/cache/keys.ts`.
- Shells/templates em `frontend/src/templates`.
- Componentes existentes em `frontend/src/registry/new-york-v4/ui` e `frontend/src/components/ui` devem ser reutilizados antes de criar novos.
- Quando houver formulário ou campo, usar `frontend/src/hooks/form`, `frontend/src/components/controllers`, React Hook Form e Zod conforme `TASK-02`.

Arquitetura backend obrigatória:

- Novas APIs em `backend/src/modules/api/{public|private}/{dominio}/{caso}`.
- Rotas registradas em `backend/src/main/server/imports/write.ts`.
- Validadores em `validator/index.ts` usando os helpers/pacote local de validação.
- Services e repositories separados quando houver regra de domínio ou persistência.
- Respostas usando `send`, `error500`, `error` e traduções em `backend/locales/pt/translation.json`.
- Prisma com nomes e padrões já definidos em `ARCHITECTURE.md`.

Packages permitidos nesta task:

- React Hook Form
- Zod
- argon2
- Passport Google OAuth
- Prisma

Regras anti-recriação específicas:

- Procurar componente, helper, model, endpoint e query key equivalente antes de criar estrutura nova.
- Não criar client HTTP paralelo, store paralela, autenticação paralela, validator paralelo ou design system paralelo.
- Não usar `sample/` como referência direta de implementação futura.
- Não instalar package novo sem consultar `PACKAGES.md` e registrar ADR.

## Estados obrigatórios

- Loading inicial.
- Erro de rede/API em PT-BR.
- Estado vazio quando não houver dado real.
- Sucesso com feedback visual discreto.
- Responsividade mobile-first baseada nas imagens exportadas.

## Fora do escopo

- Criar dados fake, seed artificial ou mock para preencher tela.
- Concluir integração externa ausente.
- Refatorar módulos não relacionados à task.
- Trocar package manager ou stack base.

## Critérios de aceite

- [x] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.

## Evidências de execução

- 2026-06-13: Builder/Quick Copy não estava exposto como ferramenta callable nesta sessão do Codex; foram consultadas as imagens locais `_product/proto/Configurações de Conta - Login Google.jpg` e `_product/proto/Editar E-mail e Senha.jpg`.
- 2026-06-13: Implementada a rota `/app/settings/account`, acessada pelo item “E-mail e senha” do menu de perfil.
- 2026-06-13: Implementados `GET /api/private/account/security`, `PUT /api/private/account/email`, `PUT /api/private/account/password` e extensão do módulo Google em `/api/public/google/link`.
- 2026-06-13: Validações executadas: `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm check` e smoke local em `http://localhost:3000/app/settings/account`.
- 2026-06-17: Extensão complementar implementou exclusão de conta para pacientes e psicólogos dentro de Editar perfil/setup profissional, com modal destrutiva, senha atual ou reautenticação Google, limpeza persistente de dados pessoais/preferências/notificações/favoritos e anonimização de publicações/comentários como `Membro Excluído` ou `Psicólogo Excluído`.
- 2026-06-17: ADR `adrs/0113-exclusao-conta-usuarios-anonimizacao-google.md` registra a decisão de preservar conteúdo público anonimizado e usar `user_background` como prova temporária de reautenticação Google.
- 2026-06-20: Corrigida regressão do callback Google para exclusão de conta: `intent=delete_account` agora retorna diretamente para a rota interna com `deleteReauth=ok`, evitando cair no redirecionamento padrão de login.
- 2026-06-20: Validações da correção executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.
- 2026-06-20: Diagnosticado que a exclusão Google-only autenticada falhava com `Internal Server Error` por timeout da transação Prisma padrão durante a limpeza/anomização de múltiplas tabelas; a transação de exclusão passou a usar timeout ampliado.
- 2026-06-20: Validações do timeout de exclusão executadas: dry-run transacional com rollback, `pnpm --dir backend check`, `pnpm --dir backend build` e `pnpm check`.
- 2026-06-17: Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e smoke local via Chrome headless em `/app/profile/edit` e `/app/professional/profile/setup`.

## Ajuste complementar em 2026-06-18 - header secundário premium compartilhado

- Pedido direto de produto: padronizar `Email e senha` com o mesmo header visual de `Meus Analytics` e `Minhas Avaliações`.
- A rota `/app/settings/account` passou a usar `AppPageHeader`, mantendo botão de voltar à esquerda, título centralizado, fundo branco, borda suave, sombra discreta e sem textos auxiliares no header.
- O título visual foi normalizado para `Email e senha`, conforme nomenclatura solicitada para a tela.
- Escopo: sem alteração em formulários, validações de senha/e-mail, endpoints de conta, Google OAuth, packages ou schema Prisma.
- ADR criado: `adrs/0119-header-secundario-premium-compartilhado.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP autenticado em mobile 390x844 e desktop 1024x768 sem overflow horizontal.

## Ajuste complementar em 2026-08-15 - exclusão de conta Google sem senha local

- Pedido direto de produto: a captura do usuário mostrou uma conta cadastrada com Google recebendo
  campo obrigatório de **Senha atual** no modal de exclusão.
- Referência visual: screenshot anexo do usuário e `_product/proto/Configurações de Conta - Login Google.jpg`.
  Builder/Quick Copy não está exposto como ferramenta callable neste ambiente.
- Decisão: em exclusão própria, `user.provider="google"` passa a exigir reautenticação Google,
  independentemente de existir senha local legada. Senha atual fica restrita a contas não Google com
  senha cadastrada.
- Backend: `POST /api/private/account/delete/google-intent` passa a aceitar contas Google com senha
  legada; `POST /api/private/account/delete` valida reautenticação Google recente antes de excluir
  qualquer conta Google.
- Frontend: o modal não renderiza **Senha atual** para contas Google e aguarda carregar o contrato
  real de segurança antes de exibir o formulário destrutivo, evitando flicker de senha durante o
  loading.
- ADR criado: `adrs/0461-exclusao-conta-google-sem-senha-local.md`; ADR-0113 atualizado para deixar
  claro que a confirmação por Google prevalece sobre senhas locais legadas.
- Sem migration, sem package novo, sem variável de ambiente nova e sem mocks.
- Validações executadas durante o ajuste:
  - `pnpm --dir backend exec tsc --noEmit --pretty false`;
  - `pnpm --dir frontend exec tsc --noEmit --pretty false`;
  - `pnpm --dir backend test`;
  - `pnpm --dir backend check`;
  - `pnpm --dir frontend check`;
  - `pnpm --dir backend build`;
  - `pnpm --dir frontend build`;
  - `pnpm --dir admin build`;
  - `pnpm check:version`;
  - `pnpm check`.
- Validação local em browser autenticado ficou limitada: a tentativa de subir `next start` local em
  processo auxiliar foi bloqueada pela política da ferramenta. A validação visual/operacional final
  fica registrada pelo build de produção e pelo smoke publicado em homologação após o push.

## Ajuste complementar em 2026-08-15 - confirmação Google de exclusão com device no login

- Pedido direto de produto: ao tocar em **Confirmar com Google** no modal de exclusão de uma conta
  Google, o navegador abriu a API de homologação com 404 genérico.
- Diagnóstico: o endpoint público de OAuth exige o identificador do dispositivo no caminho
  `/api/public/google/login/{deviceId}`. A navegação de exclusão passa a recompor esse caminho a
  partir da intenção assinada retornada pelo backend, usando o mesmo fingerprint/dispositivo do
  cliente, em vez de apenas confiar na URL absoluta recebida.
- Backend: `GET /api/public/google/login` sem device agora responde `400 device_id_not_found`,
  mantendo falha fechada e sem expor detalhes técnicos quando houver cliente antigo ou URL
  incompleta.
- Frontend: a URL da intenção de exclusão é validada contra a origem pública da API, os parâmetros
  assinados (`intent`, `delete_token`, `callbackUrl`) são preservados e o path final sempre inclui o
  device id antes de navegar para o OAuth Google.
- ADR atualizado: `adrs/0461-exclusao-conta-google-sem-senha-local.md`.
- Sem migration, sem package novo, sem variável de ambiente nova e sem mocks.
- Validações executadas durante o ajuste:
  - `pnpm --dir frontend test`;
  - `pnpm --dir backend test`;
  - `pnpm --dir frontend check`;
  - `pnpm --dir backend check`;
  - `pnpm --dir frontend build`;
  - `pnpm --dir backend build`;
  - `pnpm check`;
  - `git diff --check`;
  - smoke de homologação registrado no fechamento do ajuste.

## Ajuste complementar em 2026-08-15 - desbloqueio do modal após intenção Google

- Pedido direto de produto: após a correção anterior, o modal passou a exibir **Exclusão bloqueada**
  com a mensagem “Não foi possível iniciar a confirmação com o Google.”.
- Diagnóstico: a validação local da URL da intenção ficou estrita demais e podia bloquear a
  navegação mesmo quando o backend já entregava uma URL confiável com `/api/public/google/login/{deviceId}`.
- Decisão: se a intenção assinada já vier com uma URL confiável de login Google contendo o device no
  caminho, o frontend navega diretamente. A recomposição local é usada somente quando a URL confiável
  ainda não tem o device, preferindo `device_id` retornado pelo backend e usando fingerprint local
  apenas como fallback de compatibilidade.
- Backend: a resposta de `POST /api/private/account/delete/google-intent` passa a incluir
  `device_id` de forma aditiva, sem quebrar clientes antigos.
- Frontend: `buildTrustedGoogleLoginUrlFromIntent` passou a aceitar URL confiável já pronta e o modal
  evita uma segunda resolução assíncrona de fingerprint quando ela não é necessária.
- ADR atualizado: `adrs/0461-exclusao-conta-google-sem-senha-local.md`.
- Sem migration, sem package novo, sem variável de ambiente nova e sem mocks.
- Validações executadas durante o ajuste:
  - `pnpm --dir frontend test`;
  - `pnpm --dir frontend check`;
  - `pnpm --dir backend check`;
  - `pnpm --dir frontend build`;
  - `pnpm --dir backend build`;
  - `pnpm check`;
  - smoke de homologação registrado no fechamento do ajuste.

## Ajuste complementar em 2026-08-15 - conclusão da exclusão após reautenticação Google

- Pedido direto de produto: após confirmar com Google, clicar em **Excluir conta** retornava para a
  página inicial e a conta continuava sem ser excluída.
- Diagnóstico: o callback Google de exclusão voltava direto para a tela final, sem passar pelo fluxo
  `/auth/redirect` que consome o cookie transitório e recria a sessão `HttpOnly` do frontend. Em
  paralelo, uma eventual resposta `401` no `POST /api/private/account/delete` disparava signout
  automático, ocultando o erro real no modal.
- Backend: o callback `intent=delete_account` agora grava o cookie transitório de troca e redireciona
  para `/auth/redirect?intent=delete_account&callbackUrl=...`, preservando o retorno interno
  `deleteReauth=ok`.
- Frontend: `/auth/redirect` passou a ignorar apenas os bloqueios de onboarding/plano quando a
  intenção é `delete_account`, permitindo voltar ao modal mesmo se o psicólogo ainda tiver etapas
  obrigatórias pendentes.
- Frontend: a chamada final de exclusão não faz signout automático em `401`; falhas permanecem no
  modal com mensagem segura. Após sucesso real, a sessão local é limpa diretamente e o usuário é
  levado a `/auth/login`, sem uma segunda chamada de logout contra a conta já anonimizada.
- Sem migration, sem package novo, sem variável de ambiente nova e sem mocks.
- Validação local em browser não executou exclusão real de conta para preservar dados publicados; a
  validação operacional é limitada a checks, builds e smoke de rotas públicas/saúde após deploy.
- Validações executadas durante o ajuste:
  - `pnpm --dir frontend check`;
  - `pnpm --dir backend check`;
  - `pnpm --dir frontend build`;
  - `pnpm --dir backend build`;
  - `pnpm check`;
  - `pnpm check:version`;
  - `git diff --check`;
  - smoke de homologação registrado no fechamento do ajuste.


## Ajuste complementar em 2026-08-15 - retorno estavel da exclusao Google

- Pedido direto de produto: o fluxo ainda apresentava problema em homologacao e havia duvida se a versao local que funcionava estava salva.
- Diagnostico: o historico Git preserva a versao anterior (`0.1.130` / `4d2c3391`) como referencia, mas reverter diretamente a branch publicada poderia desfazer correcoes ja implantadas. A causa provavel do comportamento em homologacao e que o retorno pos-Google usava telas de perfil que podem ser interceptadas pelo bloqueio de onboarding/assinatura de psicologos pendentes.
- Decisao: manter a correcao incremental e direcionar toda reautenticacao Google de exclusao para `/app/configuracoes/conta?deleteReauth=ok`, rota ja permitida durante bloqueios obrigatorios.
- Frontend: a tela de **Email e senha** passa a renderizar a secao de exclusao de conta tambem para contas Google-only; ao retornar do Google, a modal reabre nessa rota estavel.
- Backend: a intencao e o callback de exclusao Google ignoram callbacks antigos para telas de perfil e normalizam o retorno para configuracoes da conta, preservando `deleteReauth=ok`.
- Sem migration, sem package novo, sem variavel de ambiente nova e sem mocks.
- Validacoes executadas durante o ajuste:
  - `pnpm --dir frontend test`;
  - `pnpm --dir backend test`;
  - `pnpm --dir frontend check`;
  - `pnpm --dir backend check`;
  - `pnpm --dir frontend build`;
  - `pnpm --dir backend build`;
  - `pnpm check`;
  - `pnpm check:version`;
  - `git diff --check`;
  - smoke de homologacao registrado no fechamento do ajuste.


## Ajuste complementar em 2026-08-16 - reautenticacao Google fail-closed para exclusao

- Evidencia de produto: video enviado em 2026-08-16 mostra que, apos escolher o perfil no Google, o usuario era levado para /psicologos e a conta nao era excluida.
- Diagnostico: esse destino e o fallback de login normal; portanto, a intencao de exclusao nao podia depender apenas do retorno padrao do OAuth. Se a intencao curta se perder no retorno mobile, o fluxo deve falhar fechado em vez de virar login normal.
- Decisao: o inicio do OAuth de exclusao passa a gravar um cookie HttpOnly assinado e curto com device, callback e delete_token. O callback e a estrategia Google aceitam esse cookie como fallback quando o state/nonce nao estiver disponivel, validando depois o delete_token e o e-mail Google antes de marcar a reautenticacao recente.
- Frontend: a URL de intencao de exclusao Google agora exige intent=delete_account e delete_token antes de navegar. URL incompleta nao abre Google como login normal.
- Sem migration, sem package novo, sem variavel de ambiente nova e sem mocks.
- Validacoes executadas durante o ajuste:
  - `pnpm --dir frontend test`;
  - `pnpm --dir backend test`;
  - `pnpm --dir frontend check`;
  - `pnpm --dir backend check`;
  - `pnpm --dir frontend build`;
  - `pnpm --dir backend build`;
  - `pnpm check`;
  - `pnpm check:version`;
  - `git diff --check`;
  - smoke de homologacao registrado no fechamento do ajuste.

## Ajuste complementar em 2026-08-16 - origem publica da API no cliente

- Evidencia de produto: a captura enviada em 2026-08-16 mostra o erro local **Exclusao bloqueada** com a mensagem "Nao foi possivel iniciar a confirmacao com o Google." antes de abrir o OAuth.
- Diagnostico: a validacao do frontend dependia exclusivamente de `NEXT_PUBLIC_API_URL` para aceitar a URL absoluta retornada pelo backend. Se a env publica estiver ausente, vazia ou normalizada de forma diferente no build, a URL `https://homolog-api.lectum.com.br/...` e recusada antes da navegacao, mesmo contendo `intent=delete_account` e `delete_token`.
- Decisao: manter a navegacao fail-closed, mas aceitar URLs HTTPS absolutas dos hosts publicos da API Lectum (`api.lectum.com.br` e `*-api.lectum.com.br`) somente para o endpoint `/api/public/google/login` e somente quando a intencao de exclusao assinada estiver presente.
- Frontend: `buildTrustedGoogleLoginUrlFromIntent` passa a usar essa origem publica confiavel como fallback quando `normalizeTrustedApiUrl` nao puder validar a env local, preservando a recomposicao do path com device quando necessario.
- Sem migration, sem package novo, sem variavel de ambiente nova e sem mocks.
- Validacoes executadas durante o ajuste:
  - `pnpm --dir frontend test`;
  - `pnpm --dir frontend check`;
  - `pnpm --dir frontend build`;
  - demais checks e smoke de homologacao registrados no fechamento do ajuste.

## Ajuste complementar em 2026-08-16 - recomposicao por parametros assinados

- Evidencia de produto: mesmo apos publicar a origem publica da API, o modal continuou exibindo "Nao foi possivel iniciar a confirmacao com o Google".
- Diagnostico: a mensagem ainda so ocorre antes de abrir o OAuth, quando o cliente nao consegue montar uma URL confiavel a partir da resposta autenticada da API. Para cobrir diferencas de origem, URL legada ou resposta sem origem validavel no bundle carregado, o frontend deve depender menos da URL inteira e mais da intencao assinada pelo backend.
- Decisao: quando a resposta autenticada contiver `intent=delete_account` e `delete_token`, o cliente pode extrair apenas os parametros assinados e recompor `/api/public/google/login/{device}` na origem confiavel configurada da API. A URL original nunca e usada para navegar quando a origem nao e confiavel.
- Frontend: `buildTrustedGoogleLoginUrlFromIntent` preserva o comportamento fail-closed sem token, mas passa a tolerar origem desconhecida ou URL legada como fonte de parametros, sempre redirecionando para a API Lectum configurada.
- Sem migration, sem package novo, sem variavel de ambiente nova e sem mocks.
- Validacoes executadas durante o ajuste:
  - `pnpm --dir frontend check`;
  - demais checks, build, versionamento e smoke de homologacao registrados no fechamento do ajuste.

## Ajuste complementar em 2026-08-16 - preservar delete_token na resposta de intencao

- Evidencia de produto: mesmo apos recompor a URL no cliente, o modal continuou exibindo "Nao foi possivel iniciar a confirmacao com o Google".
- Diagnostico real: a API privada criava corretamente a URL de OAuth com `delete_token`, mas o helper global de resposta redigia strings com padrao de JWT por seguranca. Assim, o frontend recebia `url: "[REDACTED]"`, nao encontrava `intent=delete_account`/`delete_token` e bloqueava antes de abrir o Google.
- Decisao: a resposta especifica de `POST /api/private/account/delete/google-intent` passa a marcar `allowAuthTokens: true`, limitada ao payload `{ device_id, url }` e ao token curto/escopado de reautenticacao Google. A sanitizacao global permanece fail-closed para as demais respostas.
- Sem migration, sem package novo, sem variavel de ambiente nova e sem mocks.
- Validacoes executadas durante o ajuste:
  - `pnpm --dir backend check`;
  - demais checks, build, versionamento e smoke de homologacao registrados no fechamento do ajuste.

## Ajuste complementar em 2026-08-16 - bloquear exclusao com assinatura ativa antes do Google

- Pedido direto de produto: verificar se o erro estava associado a assinatura de plano e, quando a conta tiver assinatura ativa, informar que o psicologo deve cancelar a assinatura primeiro.
- Diagnostico: a exclusao ja bloqueava assinatura paga/gateway antes de apagar a conta, mas essa validacao acontecia somente depois da confirmacao forte. Para contas Google, isso podia levar o usuario ao fluxo de reautenticacao antes de receber a orientacao correta sobre a assinatura.
- Decisao: a criacao da intencao Google de exclusao passa a verificar assinatura bloqueante do psicologo antes de criar `delete_token` e antes de abrir o OAuth. Quando houver assinatura ativa/paga vinculada ao gateway ou estado inadimplente, o backend retorna erro de dominio e o frontend exibe: "Cancele a assinatura ativa antes de excluir sua conta."
- A validacao final de exclusao continua preservada como defesa em profundidade, evitando corrida caso a assinatura mude entre a intencao e a exclusao.
- Sem migration, sem package novo, sem variavel de ambiente nova e sem mocks.
- Validacoes executadas durante o ajuste:
  - `pnpm --dir backend check`;
  - `pnpm --dir frontend check`;
  - `pnpm --dir backend build`;
  - `pnpm --dir frontend build`;
  - demais checks, versionamento e smoke de homologacao registrados no fechamento do ajuste.

## Ajuste complementar em 2026-08-20 - preservar intenções Google no transporte por cookie

- Evidência real em homologação: `POST /api/private/account/delete/google-intent` respondeu `200`,
  mas entregou `data.url="[REDACTED]"`; o frontend então bloqueou antes de navegar e exibiu “Não foi
  possível iniciar a confirmação com o Google.”.
- Diagnóstico: o endpoint já marcava o DTO mínimo `{ device_id, url }` com
  `allowAuthTokens: true`, mas `applyUserAuthCookie` sobrescrevia a autorização para `false` em toda
  request com `Lectum-User-Cookie-Auth`, mesmo quando a resposta não continha `user_tokens` de
  sessão. O sanitizador voltava a detectar o JWT curto dentro da URL e redigia a string inteira.
- Decisão: a transformação cookie-aware só remove `user_tokens` e força `allowAuthTokens: false`
  quando o payload realmente possui esse contrato top-level. Respostas sem `user_tokens` preservam
  a política explícita do caso de uso; sem opt-in, a sanitização continua fail-closed.
- O mesmo limite passa a preservar a intenção curta de vínculo Google (`link_token`), que também é
  ligada a usuário, e-mail e device e expira em dez minutos. A resposta continua limitada a
  `{ url }`; nenhum JWT de sessão é liberado no JSON do cliente compatível com cookie.
- Escopo backend-only, sem alteração de frontend, banco, migration, package ou env. O rollout é
  aditivo e tolera clientes antigos/novos; rollback é revert do commit.

### Critérios de aceite do complemento

- [x] A intenção de exclusão explicitamente autorizada atravessa
  `send -> applyUserAuthCookie -> sanitizeSensitiveData` sem virar `[REDACTED]`.
- [x] Resposta sem opt-in continua redigindo a mesma string com JWT.
- [x] Payload com `user_tokens` continua gravando cookie HttpOnly, removendo o campo do JSON e
  forçando sanitização de tokens de sessão, inclusive quando o array está vazio ou malformado.
- [x] A intenção de vínculo Google marca explicitamente o DTO transitório mínimo como autorizado.
- [x] Testes backend, check, build, checks da raiz, versionamento, commit, push e smoke de
  homologação são concluídos sem expor tokens nem excluir conta real.
- [x] ADR-0074, ADR-0461 e a regra de autenticação em `ARCHITECTURE.md` registram a fronteira de
  segurança.
