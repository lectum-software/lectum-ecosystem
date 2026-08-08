# Quality Review das Tasks

O prompt exigiu três loops de interação sobre as tasks criadas. Este arquivo registra os passes de revisão e os ajustes aplicados.

> **Revisão vigente:** desde 2026-08-07 o produto está publicado. A auditoria integral de produção
> está resumida em [`../AUDITORIA-CORRECOES-2026-08-07.md`](../AUDITORIA-CORRECOES-2026-08-07.md)
> e as decisões técnicas estão no
> [`ADR-0418`](../../adrs/0418-auditoria-producao-seguranca-estabilidade.md). As seções abaixo são
> histórico das revisões anteriores e não substituem as regras atuais de deploy.

## Loop 1 - Auto-suficiência

Critério revisado: cada task precisa conter contexto suficiente para ser executada isoladamente.

Ajustes aplicados:

- Cada task recebeu metadata, contexto, objetivo, escopo, fora do escopo, critérios e validação.
- As tasks citam fluxos do PRD/fluxogramas relevantes.
- As tasks visuais indicam protótipos/imagens conhecidos e exigem consulta ao inventário visual ativo.
- Foi removida qualquer dependência de referência arquitetural externa ao workspace da task.

## Loop 2 - Anti-mock e pré-requisitos externos

Critério revisado: o executor não pode concluir uma task usando simulação.

Ajustes aplicados:

- Todas as tasks têm proibição implícita via `AGENTS.md` e workflow da skill.
- TASK-03 centraliza decisões externas.
- TASK-27, TASK-31, TASK-32 e TASK-33 bloqueiam explicitamente ranking/assinatura/checkout quando regra de pontuação, plano profissional ou gateway não estiverem definidos.
- Estados vazios devem ser honestos e baseados em dados reais.

## Loop 3 - Critérios de aceite e rastreabilidade

Critério revisado: a IA precisa conseguir marcar conclusão e preservar histórico.

Ajustes aplicados:

- Todas as tasks têm checkboxes.
- Todas exigem ADR quando há decisão/execução importante.
- Todas exigem commit com mensagem convencional.
- O README define ordem, dependências e comandos de validação.
- A skill `execute-lectum-task` formaliza validação, ADR e commit.

## Gaps conhecidos

- A coleta visual inicial por ferramenta externa ficou incompleta. As tasks preservam essa realidade e agora usam Builder/proto como referência ativa.
- Os provedores externos ainda precisam ser decididos na TASK-03 antes de implementação real de pagamento, WhatsApp avançado, CFP, storage e push.

## Reavaliação 2026-06-03 - Arquivos não commitados

Critério revisado: qualidade dos documentos para execução por usuários não-devs e agentes diferentes.

Achados:

- `AGENTS.md` era útil, mas `.github/copilot-instructions.md` estava curto demais para operar como resumo always-on independente.
- Faltavam instruções segmentadas para frontend, backend e documentação de produto.
- O prompt recorrente existia em `.codex/prompts`, mas não no padrão `.github/prompts/*.prompt.md` usado por VS Code/Copilot.
- Não havia template para criar novas tasks ou ADRs com o mesmo padrão.
- O inventário visual conhecido estava implícito nas tasks, mas não centralizado no README.

Ajustes aplicados:

- `.github/copilot-instructions.md` agora contém regras curtas e verificáveis.
- Criadas instruções específicas em `.github/instructions/`.
- Criado prompt file em `.github/prompts/execute-next-lectum-task.prompt.md`.
- Criados templates `TASK-TEMPLATE.md` e `adrs/TEMPLATE.md`.
- README passou a listar os documentos de inventário visual e roadmap revalidado.

## Reavaliação 2026-06-03 - Profundidade técnica das tasks

Critério revisado: as tasks precisavam deixar de ser apenas descritivas e passar a orientar execução técnica sem incentivar criação do zero.

Achados:

- As tasks tinham bom fluxo de produto, mas pouca indicação de arquivos, módulos, endpoints, models e packages.
- A regra anti-mock estava clara, mas a regra anti-recriação ainda dependia do bom senso do agente.
- Não havia inventário de packages instalados/candidatos para o usuário validar antes da implementação.
- O Builder está autenticado e o Quick Copy foi validado pelo fluxo oficial `builder.io code`.

Ajustes aplicados:

- Criado `ARCHITECTURE.md` com padrões obrigatórios de frontend/backend.
- Criado `PACKAGES.md` com versões instaladas, versões verificadas e candidatos condicionais.
- Todas as tasks receberam `Contrato técnico detalhado`.
- TASK-00 passou a validar também `ARCHITECTURE.md` e `PACKAGES.md`.
- Prompts e skill agora exigem leitura de arquitetura/packages antes da execução.
- Templates foram atualizados para exigir contrato técnico em novas tasks.

## Reavaliação 2026-06-03 - Builder/proto e granularidade visual

Critério revisado: troca da fonte visual ativa e suficiência da fila de execução diante de 62 imagens exportadas.

Achados:

- A fila inicial estava adequada como agrupamento macro, mas grande demais para execução visual por não-devs.
- `_product/proto` contém 62 JPEGs: 61 telas de produto e 1 asset isolado.
- As instruções ainda apontavam para uma fonte visual desativada, o que criava conflito operacional.
- Builder CLI está autenticado no espaço `Lectum` e o Quick Copy foi validado por geração controlada em diretório temporário.
- O servidor MCP stdio sobe, mas não respondeu ao handshake manual local; o fluxo oficial `builder.io code` confirmou acesso aos artefatos virtuais.
- O Builder pode ajudar na leitura visual, mas não deve definir arquitetura nem ser aceito como código final.

Ajustes aplicados:

- Criado `PROTO-INVENTORY.md` com status do Builder MCP, Quick Copy ativo, regras de uso e inventário das 62 imagens.
- Criado `ROADMAP-REVALIDADO.md` com 35 etapas, de `TASK-00` a `TASK-34`.
- Configurados `.mcp.json`, `.vscode/mcp.json`, `.cursor/mcp.json` e `.codex/config.toml` para Builder MCP.
- Criados `.builderignore`, `frontend/.builderignore` e `frontend/.builder/rules/lectum-frontend.mdc` para proteger arquitetura e evitar geração descontrolada.
- README, prompts, skill e instruções foram atualizados para Builder/proto.
- `PROTO-INVENTORY.md` foi atualizado com a confirmação de autenticação, Space ID e acesso aos 62 artefatos virtuais.

Decisão:

- `ROADMAP-REVALIDADO.md` passa a ser o plano visual vigente.
- Os arquivos `TASK-04` a `TASK-34` foram materializados como fila operacional granular.

## Reavaliação 2026-06-03 - Compatibilidade Claude e materialização da fila

Critério revisado: suporte a vários modelos/agentes e existência real dos arquivos de execução.

Achados:

- Havia configuração para Codex, GitHub/Copilot e Cursor, mas faltavam instruções visíveis para Claude Code.
- O README já falava em `TASK-04` a `TASK-34`, mas os arquivos reais ainda precisavam ser materializados.
- `TASK-00`, `TASK-01` e `TASK-03` ainda não estavam no mesmo padrão técnico das tasks novas.

Ajustes aplicados:

- Criado `CLAUDE.md` com memória de projeto para Claude Code.
- Criada skill Claude em `.claude/skills/execute-lectum-task/SKILL.md`.
- Criado comando Claude legado em `.claude/commands/execute-next-lectum-task.md`.
- Materializadas 31 tasks novas de `TASK-04` a `TASK-34`.
- Atualizado `_product/tasks/README.md` para listar a fila completa `TASK-00` a `TASK-34`.
- Normalizadas `TASK-00`, `TASK-01` e `TASK-03` com contrato técnico, validação mínima e critério anti-mock.

## Reavaliação 2026-06-03 - Auditoria honesta dos não commitados

Critério revisado: todos os arquivos não commitados, contexto defasado, arquivos potencialmente desnecessários e qualidade das tasks.

Achados:

- Algumas instruções ainda falavam como se o problema do Builder fosse autenticação. A autenticação já foi validada; o risco real é a ferramenta não estar disponível no cliente usado pelo executor.
- `_product/Prompt.md` ainda podia ser lido como se `sample/` fosse fonte ativa de arquitetura. Isso conflita com as regras atuais de não depender de `sample/`.
- `TASK-00`, `TASK-01` e `TASK-03` eram úteis, mas ainda tinham formato menos completo que `TASK-04` a `TASK-34`.
- Não foi encontrado arquivo claramente desnecessário. Os arquivos duplicados por ambiente são intencionais: Codex, Claude, GitHub/Copilot, Cursor, VS Code e Builder usam pontos de entrada diferentes.

Ajustes aplicados:

- Troquei instruções de "quando autenticado" para "quando disponível no cliente/ambiente".
- Transformei a referência a `sample/` no prompt em histórico, não fonte ativa.
- Atualizei `TASK-00`, `TASK-01` e `TASK-03` com escopo frontend/backend, estados verificáveis, validação mínima e notas para executor.
- Reforcei `.builderignore` e criei `.builderrules` raiz para impedir geração Builder a partir da raiz e proteger instruções de agentes/MCP.
- Expliquei em `README.md` e `PROTO-INVENTORY.md` que `figma-design-frame-*` é somente nome virtual preservado pelo Builder, não retorno do Figma como fonte ativa.
- Revalidei cobertura documental; após a fundação de formulários registrada abaixo, a fila vigente é de 35 tasks, IDs `00` a `34`, com 62 imagens cobertas e nenhuma referência de imagem quebrada.

## Reavaliação 2026-06-03 - Packages frontend e fundação de formulários

Critério revisado: melhores práticas de frontend em junho/2026, uso correto de TanStack, React Hook Form, Zod e portabilidade conceitual do sample.

Achados:

- A lista de packages estava boa, mas ainda não distinguia claramente stack ativo, candidatos condicionais e pacotes avaliados mas não recomendados.
- O sample possui uma camada forte em `sample/frontend/src/components/controllers` e `sample/frontend/src/hooks/form`, com controllers por tipo de campo, container de label/erro e composição dinâmica de fields.
- Sem uma task estrutural própria, cada tela com campo tenderia a recriar input, erro inline, máscara e submit localmente.
- TanStack Form foi avaliado, mas adotá-lo agora criaria arquitetura paralela a React Hook Form.
- TanStack Router foi avaliado, mas conflita com o uso atual de Next App Router.
- TanStack Table/Virtual e Query Devtools/ESLint Query são bons candidatos condicionais, não dependências obrigatórias imediatas.

Ajustes aplicados:

- Criada `TASK-02-form-composition-foundation.md`.
- A antiga `TASK-02` de decisões externas foi renumerada para `TASK-03`, e as tasks visuais passaram a iniciar em `TASK-04`.
- Tasks com campos, filtros avançados, edição ou submit passaram a depender explicitamente da `TASK-02`.
- `ARCHITECTURE.md`, `PACKAGES.md`, `RESEARCH.md`, `TASK-TEMPLATE.md`, README e instruções de agentes foram atualizados com a regra de forms.
- `PACKAGES.md` passou a separar decisões frontend junho/2026, candidatos de formulário e candidatos TanStack.

Decisão:

- React Hook Form + Zod + controllers é regra de ouro do frontend.
- `@tanstack/react-form` e `@tanstack/react-router` ficam fora do stack ativo por enquanto.
- `@tanstack/react-table`, `@tanstack/react-virtual`, `@tanstack/react-query-devtools`, `@tanstack/eslint-plugin-query` e `nuqs` são candidatos condicionais com ADR quando instalados.

## Reavaliação 2026-06-03 - Profundidade técnica para execução por agentes

Critério revisado: cada task precisa dar ao agente contexto técnico suficiente para executar sem inventar schema nem contrariar o backend existente. Auditoria fez cross-check das 35 tasks contra o código real.

Achados:

- Forte no "onde/como" (layout de arquivos, callers, query keys, helpers de resposta, anti-mock, validação); fraco no "o quê" (campos de modelo, enums, relações, DTOs). Nenhum alvo de reuso era alucinado — todos os caminhos citados existem.
- Gap sistêmico nº1: todo deliverable de backend (TASK-07+) citava modelos/endpoints sem definir campos. Modelos compartilhados (`community_post`, `professional_review`, `psychologist_profile`) podiam divergir entre tasks.
- Gap sistêmico nº2 (mais perigoso): TASK-05/06/07/08 mandavam **criar** fluxos que já existem no backend, sob nomes diferentes, violando a regra anti-autenticação-paralela:
  - recuperação real = `POST /api/public/auth/recovery` + `POST /api/public/auth/reset/:code` (link por e-mail, `user.recovery_code`).
  - verificação real = privados `GET /api/private/auth/confirm` (envia código 6 dígitos) + `PUT /api/private/auth/code/:code` (valida) usando `user.confirm_code`.
  - cadastro real = `POST /api/public/user/store` (hidrata sessão, não marca `confirmed`).
  - `user` não tem campo de papel; modelos `patient_profile`/`emailVerifiedAt` citados não existiam.

Ajustes aplicados:

- Criado `DATA-MODEL.md` como fonte única de modelos Prisma, enums, relações, papel do usuário (`user.role`), paginação e convenção de rotas. Decisão registrada: `user.role` (`"paciente" | "psicologo"`) + `patient_profile`/`psychologist_profile` 1:1.
- Reescritas TASK-05, TASK-06, TASK-07 e TASK-08 para **reutilizar/estender** os fluxos reais de auth, com seção "Integração com backend existente" citando endpoints, validators, campos e chaves de tradução verificados no código.
- `README.md`, `ARCHITECTURE.md` e a skill `execute-lectum-task` passaram a listar `DATA-MODEL.md` como leitura/fonte obrigatória antes de criar modelo ou contrato.

Pendências para próximo passe:

- ~~Tasks 09-34 ainda devem migrar de "modelo nomeado" para "referência ao `DATA-MODEL.md`".~~ Concluído: as 26 tasks (09-34) foram amarradas ao `DATA-MODEL.md`, com modelos/endpoints citados por seção e critério de aceite "segue `DATA-MODEL.md` (sem inventar schema)".
- ~~Reconciliar namespace de rotas de comunidade (22-28).~~ Concluído: rotas de comunidade/posts unificadas na convenção canônica (`/app/community`, `/app/community/[slug]`, `/app/community/[slug]/post/[id]`; backend `/api/private/community` e `/api/private/posts/:id/...`). Detalhe de psicólogo fixado em `/app/psychologist/[id]` (`[id]=user.id`).
- ~~Confirmar com o usuário a decisão de `user.role` antes da execução da TASK-07.~~ Confirmada e registrada em `adrs/0002-arquitetura-auth-roles.md`.

## Reavaliação 2026-06-03 - Amarração das tasks 09-34 ao DATA-MODEL

Critério revisado: eliminar invenção de schema e divergência de rotas nas 26 tasks restantes.

Ajustes aplicados:

- `DATA-MODEL.md` adicionado às Referências obrigatórias de todas as tasks 09-34 e à skill `execute-lectum-task`.
- Modelos/endpoints passaram a citar a seção do `DATA-MODEL.md` em vez de redefinir campos; campos inventados que contradiziam o schema foram removidos (ex.: `psychologist_profile.slug`/`displayName`/`.status`, `professional_specialty/service/approach` como modelo, `post_attachment`, `user_identity` não-opcional, `/me` inventado).
- Rotas de comunidade/posts reconciliadas para a convenção canônica; detalhe de psicólogo fixado em `/app/psychologist/[id]`.
- Melhorias direcionadas apontadas na auditoria: TASK-18 ganhou decomposição campo→seção; TASK-20 ganhou tabela métrica→fonte com regra anti-fabricação; TASK-26 ganhou decomposição de componentes e endpoints exatos de voto/save/reply; TASK-30 reusa o módulo Google real; TASK-34 trocou critérios vagos por objetivos e removeu o checkbox de "referências visuais" (não tem tela); TASK-27 mantida como bloqueio duro na fórmula de score.
- Decisão de identificador travada: psicólogo identificado por `user.id` em relações e rotas.

## Reavaliação 2026-06-03 - Arquitetura de auth e papéis (ADR-0002)

Critério revisado: impedir que um usuário `paciente` acesse rotas de psicólogo, e fixar o lugar do papel admin.

Decisão (ver `adrs/0002-arquitetura-auth-roles.md`), espelhando o `sample/backend`:

- Camada 1 (isolamento por audiência, fronteira dura): paciente + psicólogo compartilham `user`/`user_token` e a estratégia `jwt-user-api` existentes, diferenciados por `user.role` (`"paciente" | "psicologo"`); admin é audiência separada (`admin`/`admin_token` + estratégia própria), reservada e fora do MVP. `user.role` nunca recebe `"admin"`.
- Camada 2 (guarda de papel na audiência `api`): middleware `requireRole(...)` fail-closed, aplicado por namespace no `write.ts`; ownership scoping por `req.auth.id`; trava redundante por existência de perfil; `role` lido do banco a cada request; check de boot + smoke test.

Ajustes aplicados:

- `DATA-MODEL.md`: seções "Camadas de autenticação e autorização" (com mapa de guardas por rota) e "Admin (audiência separada — reservado, pós-MVP)"; convenção de rotas separando descoberta (`/api/private/directory/*`, neutra) de autogestão (`/api/private/psychologist/*`, `/api/private/patient/*`).
- `adrs/0002-arquitetura-auth-roles.md` criada; índice de ADRs atualizado.
- TASK-12 estabelece o `requireRole` + check de boot + smoke test; TASK-34 audita os guards de forma transversal.
- Tasks psicólogo-only (10, 11, 18, 19, 20, 31, 32, 33) e paciente-only (08, 14, 17, 21) ganharam nota de guarda + critério de aceite; tasks de descoberta (13, 15, 16) movidas para `/api/private/directory/*` com `_auth` neutro. Webhook de billing permanece público (autenticado por assinatura do gateway).

## Reavaliação 2026-06-03 - Gateway de pagamento decidido (Mercado Pago, ADR-0003)

Decisão de cliente: gateway = **Mercado Pago**. Pesquisa na doc oficial (jun/2026) confirmou compatibilidade total, sem breaking change com o `DATA-MODEL.md`.

Confirmado no Mercado Pago:

- Checkout transparente via **Checkout Bricks (Card Payment Brick)**: tokenização client-side (PAN/CVV não tocam o backend; escopo PCI reduzido).
- Recorrência via **API de Assinaturas (Preapproval)** com `card_token_id` (`auto_recurring`, `external_reference`, `status: authorized`).
- Webhooks `subscription_preapproval`/`subscription_authorized_payment`/`payment` com validação `x-signature` (HMAC-SHA256).

Ajustes aplicados:

- `DATA-MODEL.md` › "Assinatura e cobrança": seção "Abstração de gateway" (porta `PaymentGateway` + `MercadoPagoAdapter`), modo de integração MP, mapa de status MP→nosso, webhook e nota de re-tokenização (token não-portável). Cabeçalho passou a refletir "Mercado Pago; pendência = credenciais".
- `adrs/0003-gateway-pagamento-mercado-pago.md` criada (Accepted); índice de ADRs atualizado.
- TASK-03: gateway marcado como decidido (MP/ADR-0003); o ADR-bundle das demais integrações passou a `0006`; pendência restante = credenciais.
- TASK-31/32/33: alinhadas ao MP via porta/adapter; TASK-32 com Card Payment Brick + Preapproval + webhook `x-signature`; TASK-33 com troca de cartão por re-tokenização. Bloqueio dessas tasks deixou de ser "qual provedor" e passou a "credenciais MP".
- `PACKAGES.md`: `mercadopago` (backend) e `@mercadopago/sdk-react` (frontend) marcados como escolhidos (instalar só na TASK-32 + ADR); Stripe/Asaas como não escolhidos.

Arquitetura preservada: ports & adapters + soberania de dados (nosso banco é a fonte de verdade do entitlement; MP nunca é consultado de forma síncrona para "é Pro?"). Troca de gateway futura = novo adapter + re-tokenização.

Pendência aberta: credenciais Mercado Pago (sandbox/prod) e preço/free-trial final do Plano Profissional — TASK-03.

## Reavaliação 2026-06-30 - Code review técnico pré-produção

Escopo revisado: arquivos versionáveis de `backend/` e `frontend/` fora do `.gitignore`, validações automáticas, build, audit de dependências de produção, rotas, autenticação, dados sensíveis, uploads, CORS/proxy e comparação pontual com o `sample/` para padrões herdados.

Achados críticos corrigidos:

- Dependências: `pnpm audit --prod` apontava advisories em `ws`, `form-data`, `postcss`, `multer`, `nodemailer`, `hono` e `@hono/node-server`. Foram aplicados updates diretos e overrides transitivos por aplicação; audits de frontend e backend passaram sem vulnerabilidades conhecidas.
- Autenticação: removidos fallbacks `development-secret`; JWT agora passa por `getJwtSecret` e `JWT_SECRET_KEY` mínimo de 32 caracteres é obrigatório no backend.
- Dados sensíveis: respostas HTTP backend passam por sanitização central para remover senha/hash, códigos, tokens de gateway, secrets e API keys; logs de criação removem também tokens de auth; o frontend mantém o usuário somente em memória e hidrata a sessão por cookie `HttpOnly` + API.
- Segurança HTTP: `helmet` passou a ser aplicado no Express.
- Rate limit: `getLimiter` deixou de ser stub e passou a limitar por IP/janela sem package novo, seguindo a semântica do sample (`window` em minutos, `max` por janela).
- Privacidade/LGPD: `GET /api/public/user` não expõe mais e-mail, `active` nem `confirmed`; retorna apenas dados públicos mínimos.
- Frontend proxy: rotas pessoais (`/app/favorites`, `/app/notifications`, `/app/profile`) e rotas de escrita de comunidade (`suggest`, `post/new`, `post/success`) deixaram de ser públicas.
- API client frontend: `handleReq` passou a usar `api.request`, evitando assinatura incorreta de Axios para GET/DELETE e preservando `config`.
- Upload: middleware de Multer não chama mais `next(err)` após enviar 400, evitando double-response.
- Configuração: `.env.example` de backend/frontend foi atualizado com variáveis obrigatórias e portas coerentes (`backend:3001`, `frontend:3000` no runner raiz por padrão).
- Proxy reverso: `trust proxy` deixou de aceitar todos os proxies por padrão e agora depende de `TRUST_PROXY`, evitando spoof de IP quando a API estiver exposta diretamente.
- E-mail: Nodemailer passou a exigir TLS mínimo 1.2 e deixou de logar objetos de erro completos.
- Next/Image: removido wildcard `hostname: "**"`; hosts remotos agora são explícitos e configuráveis via `NEXT_PUBLIC_IMAGE_REMOTE_HOSTS`.
- Swagger/Scalar: geração deixou de falhar com pastas auxiliares sem `index.ts` e com validators nomeados, removendo erros no boot local.
- Erros HTTP: handler genérico não devolve mais mensagem interna em respostas 5xx.
- Workspace: removido `pnpm-workspace.yaml` raiz para manter frontend/backend como aplicações separadas e permitir overrides por app sem warnings.

Validações registradas nesta revisão:

- `pnpm --dir frontend audit --prod`
- `pnpm --dir backend audit --prod`
- `pnpm check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm --dir backend exec prisma migrate status`
- Smoke local: `pnpm dev`, `GET /health` no backend e `HEAD /auth/login` no frontend.

Decisão registrada em `adrs/0175-hardening-code-review-pre-producao.md`.
