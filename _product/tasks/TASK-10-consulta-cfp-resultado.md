# TASK-10: Consulta CFP e resultado

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-10 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Psicólogo |
| Status | Completed |
| Dependências | TASK-02, TASK-03, TASK-09 |
| ADR alvo | ADR-0026 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Verificação de CPF - Consulta CFP.jpg` | `figma-design-frame-50-Verifica--o-de-CPF---Consulta-CFP.html` |
| `_product/proto/Carregando Consulta CFP.jpg` | `figma-design-frame-52-Carregando-Consulta-CFP.html` |
| `_product/proto/Resultado CFP - Variação em Cards.jpg` | `figma-design-frame-35-Resultado-CFP---Varia--o-em-Cards.html` |
| `_product/proto/Resultado CFP - Não Encontrado.jpg` | `figma-design-frame-51-Resultado-CFP---N-o-Encontrado.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

A jornada mostra consulta por CPF/CFP, loading e resultados em cards. Como não se pode simular dado profissional, esta task é dependente da decisão de integração.

## Objetivo

Consultar CFP/CRP por integracao real via InfoSimples ou registrar bloqueio formal se o token/contrato do provedor nao estiver disponivel.

## Pré-requisitos e bloqueios

- A consulta CFP automatica foi desbloqueada em 2026-06-06 pela decisao ADR-0026: usar InfoSimples `Conselho Federal de Psicologia / Cadastro` com token backend-only em `DOCUMENT_TOKEN`.
- Parar antes de qualquer chamada real se `DOCUMENT_TOKEN` estiver ausente, invalido ou sem acesso ao produto `cfp-cadastro`. Nao usar mock, scraping nao autorizado nem dado inventado.
- A documentacao tecnica completa da InfoSimples fica atras de login em `https://api.infosimples.com/consultas/docs`; durante a implementacao, confirmar no painel autenticado o endpoint/payload HTTP exato antes de codar a chamada.
- A aprovação manual de CRP é o fluxo inicial decidido e continua necessária mesmo se uma API CFP for adicionada futuramente. Se a consulta automática não existir, encaminhar para TASK-11 (upload CRP + análise manual).
- `psychologist_profile.cfp_verified_at` só é preenchido com consulta CFP real (ver `DATA-MODEL.md`); sem ela, manter `crp_status="pendente"`.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/psychologist/cfp`

Implementação esperada:

- Criar tela de entrada de CPF/CRP e estados de loading/resultado/não encontrado.
- Exibir somente dados retornados pela integração real.
- Permitir seleção de resultado quando houver múltiplos registros.
- Não preencher cards com dados inventados.
- Persistir seleção no perfil profissional.

## Escopo backend

Este é um **módulo novo** (domínio de verificação profissional): seguir os padrões de controller/service/repository do `ARCHITECTURE.md` e registrar as rotas em `backend/src/main/server/imports/write.ts`. Não recriar autenticação, helpers de resposta ou validator.

Implementação esperada:

- Criar provider/interface de consulta CFP **agnostica ao fornecedor**, com implementacao `InfoSimplesCfpProvider` isolada em adapter de backend e sem expor `DOCUMENT_TOKEN` ao frontend.
- Endpoint privado para consultar e salvar resultado selecionado.
- Persistir payload auditável mínimo da consulta em `professional_registry_check` (campo `raw`, ver `DATA-MODEL.md`).
- Ao confirmar resultado, atualizar `psychologist_profile.cpf` e `psychologist_profile.cfp_verified_at` (ver `DATA-MODEL.md`).
- Tratar rate limit, não encontrado (`professional_registry_check.found=false`) e erro de provedor.
- Não fazer scraping não autorizado sem decisão explícita.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `professional_registry_check` (ver `DATA-MODEL.md`) — log da consulta (`cpf`, `found`, `raw`, `checked_at`).
- `psychologist_profile` (ver `DATA-MODEL.md`) — campos `cpf`, `cfp_verified_at`, `crp_status`; **não inventar campos**.

Endpoints esperados (autogestão do psicólogo, sob `/api/private/psychologist/*`):

- POST `/api/private/psychologist/cfp/search`
- POST `/api/private/psychologist/cfp/confirm`

**Guarda de papel:** estes endpoints são exclusivos de psicólogo. Vivem sob `/api/private/psychologist/*` e são protegidos por `requireRole("psicologo")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`, sem `next()`). O escopo de ownership é feito por `req.auth.id`. Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

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

- Prisma
- Zod
- date-fns

Nao instalar `infosimples-sdk` nesta task sem nova validacao/ADR: a decisao atual e usar HTTP nativo do backend apos confirmar a documentacao autenticada.

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
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Rotas sob `/api/private/psychologist/*` exigem `requireRole("psicologo")` (fail-closed), conforme ADR-0002.
- [x] Integracao InfoSimples respeitada: sem `DOCUMENT_TOKEN` valido/acesso ao `cfp-cadastro`, parar com pendencia; sem mock nem scraping nao autorizado.
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
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

## Desbloqueio InfoSimples em 2026-06-06

- Fonte/API autorizada definida: InfoSimples, consulta publica `Conselho Federal de Psicologia / Cadastro` (`cfp-cadastro`), conforme ADR-0026.
- Variavel de ambiente backend-only: `DOCUMENT_TOKEN`. Nao ler, logar, commitar ou enviar este token para o frontend.
- Campos publicamente documentados para consulta: `cnpj`, `cpf`, `nome`, `registro`, `uf`; para o Lectum, preferir minimo necessario (`registro` + `uf`, e `cpf`/`nome` apenas quando precisos para desambiguacao).
- Campos publicamente documentados de retorno: `resultados[].data_inscricao`, `nome`, `nome_regional`, `registro`, `situacao`.
- Regra de confirmacao: aceitar somente resultado unico/inequivoco com `registro`+UF compativeis, nome compativel quando informado e `situacao` ativa/regular conforme valores reais observados no primeiro teste autenticado. Resultado ausente, ambiguo, divergente ou inativo nao aprova automaticamente.
- Persistir auditoria minima em `professional_registry_check.raw`, sem expor resposta bruta em rotas publicas.
- `cfp_verified_at` so pode ser preenchido depois de confirmacao real da InfoSimples; falha de provedor/rate limit deve manter status honesto e retentavel.
- Observacao: a documentacao completa de chamadas fica atras de login; confirmar endpoint, metodo, parametros e shape de erro no painel `api.infosimples.com` durante a execucao desta task.

## Execucao bloqueada em 2026-06-05 (historico)

- Dependências documentais confirmadas: TASK-02, TASK-03 e TASK-09 estão com `Status | Completed |` em seus arquivos.
- Referências visuais consultadas pelas imagens locais:
  - `_product/proto/Verificação de CPF - Consulta CFP.jpg`;
  - `_product/proto/Carregando Consulta CFP.jpg`;
  - `_product/proto/Resultado CFP - Variação em Cards.jpg`;
  - `_product/proto/Resultado CFP - Não Encontrado.jpg`.
- Builder/Quick Copy não está exposto como ferramenta direta neste ambiente; por isso foi usado o fallback auditável das imagens locais.
- Bloqueio externo confirmado: não há fonte oficial, API contratada ou processo autorizado para consulta automática CFP/CRP.
- A implementação de `POST /api/private/psychologist/cfp/search`, `POST /api/private/psychologist/cfp/confirm`, provider CFP e modelo `professional_registry_check` foi interrompida antes de qualquer código, chamada real, scraping ou dado inventado.
- `psychologist_profile.cfp_verified_at` deve permanecer `null`; `psychologist_profile.crp_status` deve permanecer `"pendente"` sem consulta real.
- ADR criado: `adrs/0015-bloqueio-consulta-cfp-automatica.md`.
- Encaminhamento operacional: seguir para o fluxo manual da TASK-11 (upload/validação de CRP) quando houver storage R2 privado e credenciais/bucket reais conforme a própria TASK-11.

## Execucao concluida em 2026-06-06

- Dependencias confirmadas como concluidas: TASK-02, TASK-03 e TASK-09.
- Referencias visuais consultadas pelas imagens locais em `_product/proto`; Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente, entao foi usado o fallback auditavel.
- Endpoint InfoSimples confirmado com `DOCUMENT_TOKEN` sem expor o segredo: `POST https://api.infosimples.com/api/v2/consultas/cfp/cadastro`. A chamada autenticada sem parametros retornou `code=606`, validando token/servico e exigencia de `cpf`, `nome`, `registro` ou `cnpj`.
- Backend implementado em `backend/src/modules/api/private/psychologist/cfp` com provider isolado `InfoSimplesCfpProvider`, endpoints `/search` e `/confirm`, respostas traduzidas e guard `requireRole("psicologo")` via `write.ts`.
- Prisma atualizado com `professional_registry_check` e migration `20260606223155_add_professional_registry_check`; `pnpm --dir backend db:migrate -- --name add_professional_registry_check` executado com sucesso.
- Frontend implementado em `/psychologist/cfp` com React Hook Form/Zod, controller CPF da TASK-02, estados de entrada, loading, resultado, vazio e erro.
- Nenhum mock, seed artificial, scraping nao autorizado ou dado inventado foi usado; a tela so exibe dados retornados pelo backend/InfoSimples.
- ADR atualizado: `adrs/0026-infosimples-validacao-cfp-crp.md`.

## Validacao executada

- `pnpm --dir backend db:migrate -- --name add_professional_registry_check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local backend: `POST http://localhost:3001/api/private/psychologist/cfp/search` sem auth retornou 401, confirmando rota privada.
- Browser local: `http://localhost:3000/psychologist/cfp` respondeu 200 e foi renderizado em Chrome headless 390x884 para validar a rota principal.

## Observacao sobre criterios de aceite

Todos os criterios aplicaveis foram atendidos. A confirmacao real de um CPF profissional valido depende de dados reais do usuario/provedor em uso; sem resultado ativo, o fluxo permanece honesto e nao aprova automaticamente.

## Correcao de vazio InfoSimples em 2026-06-06

- Caso real validado: CPF sem registro no CFP retorna `code=612` na InfoSimples, com `data=[]` e sem `resultados`.
- Esse codigo agora e tratado como estado vazio funcional, nao como erro de provedor: o backend persiste `professional_registry_check.found=false` e retorna `cfp_search_empty`.
- A UI de `/psychologist/cfp` passa a receber `found=false` e exibir a tela "Resultado CFP - Nao Encontrado" para o usuario tentar novamente.

## Correcao operacional InfoSimples em 2026-07-04

- Caso real validado sem expor `DOCUMENT_TOKEN`: a InfoSimples retornou `code=603` para `cfp/cadastro`, indicando token sem autorizacao de acesso ao servico ou limite de uso especificado.
- O backend passa a tratar `code=603` como erro de configuracao/acesso do provedor (`cfp_provider_config_error`), e nao como rate limit temporario disparado pela palavra "limite" da mensagem do fornecedor.
- A correcao nao cria fallback, mock ou aprovacao manual automatica: sem token/contrato/saldo autorizados no provedor, `cfp_verified_at` permanece nulo e o fluxo deve ser resolvido operacionalmente na InfoSimples.

## Correcao de timeout InfoSimples em 2026-07-04

- Caso real validado sem expor `DOCUMENT_TOKEN` nem payload bruto: a consulta CFP por CPF ultrapassou o timeout local anterior de 20s; com janela maior, a InfoSimples retornou `code=609` apos cerca de 51s, indicando tentativas excedidas na origem CFP, nao problema de saldo.
- O provider InfoSimples CFP passa a usar timeout padrao de 90s, configuravel por `DOCUMENT_REQUEST_TIMEOUT_MS`, e registra logs sanitizados de erro operacional.
- `code=609` passa a ser indisponibilidade temporaria (`cfp_provider_unavailable`) em vez de rate limit/saldo; o fluxo permanece sem mock e sem aprovacao automatica quando a origem falha.

## Compatibilidade de indisponibilidade InfoSimples em 2026-08-06

- Caso real de homologacao retornou HTTP 200 com `code=615` e mensagem de indisponibilidade do site/aplicativo de origem apos aproximadamente 5,3s, confirmando que token, rede e timeout estavam operacionais.
- O backend passa a reconhecer `code=609` e `code=615` como `cfp_provider_unavailable`, mantendo a resposta HTTP 502 e encaminhando a interface para a orientacao de suporte.
- O fallback de produto e exclusivamente a aprovacao humana auditada pelo Admin (TASK-66/ADR-0251): a falha automatica nao altera `crp_status`, nao preenche `cfp_verified_at` e nao aprova o profissional.

## Observabilidade InfoSimples em 2026-07-04

- O fluxo CFP passa a emitir logs estruturados e sanitizados com `traceId` para correlacionar request, provider e classificacao final.
- Os logs registram tempos, status HTTP, codigo/mensagem InfoSimples, contagens de arrays e presenca/tamanho dos campos de busca, sem `DOCUMENT_TOKEN`, CPF completo, payload bruto, nome ou dados profissionais.
- Os logs podem ser desligados por `CFP_PROVIDER_LOGS=false` apos estabilizacao operacional.

## Mensagem de suporte em instabilidade CFP em 2026-07-04

- Quando a consulta automatica ao cadastro CFP falhar por instabilidade da origem, a tela passa a informar que o sistema do Conselho Federal de Psicologia esta instavel no momento.
- A tela tambem passa a exibir um link de suporte para o psicologo solicitar aprovacao manual, mantendo a regra de nao aprovar automaticamente sem validacao real/manual.
- A pagina CFP exibe no rodape "Problemas? Fale com o suporte" com link para o WhatsApp operacional `wa.me/5537998739534`.
- A UI tambem cobre falhas HTTP 5xx genericas, como 502 de proxy/backend sem `code` JSON, exibindo a mensagem de suporte em vez do texto tecnico do cliente HTTP.

## Correcao de preservacao CRP no perfil em 2026-07-04

- A confirmacao de resultado CFP passou a persistir `psychologist_profile.crp` no formato `nome_regional/registro`, mantendo os dois campos retornados pela consulta publica CFP/InfoSimples.
- A mudanca evita que a tela de edicao do perfil trate `registro` como regional quando o resultado confirmado possui regional separado.
- A correcao nao altera schema, nao cria mock e nao aprova profissional sem resultado CFP ativo confirmado.
- ADR criado: `adrs/0206-crp-cfp-preserva-regional-registro.md`.

Validacoes executadas:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Consulta real ao endpoint `GET /api/private/psychologist/free-profile` com token temporario real removido ao final confirmou que o CRP confirmado e exposto como `06ª Região - SP/161904`, preservando `nome_regional` e `registro` da auditoria CFP.
