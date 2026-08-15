# TASK-17: Avaliações pelo paciente

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-17 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Avaliações |
| Status | Completed |
| Dependências | TASK-02, TASK-15, TASK-16 |
| ADR alvo | ADR-0023 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Avaliar do Psicólogo.jpg` | `figma-design-frame-32-Avaliar-do-Psic-logo.html` |
| `_product/proto/Confirmação de Avaliação.jpg` | `figma-design-frame-27-Confirma--o-de-Avalia--o.html` |
| `_product/proto/Avaliações Feitas - Paciente.jpg` | `figma-design-frame-26-Avalia--es-Feitas---Paciente.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Avaliações são sensíveis para reputação. Não podem ser criadas sem usuário real nem com profissional fake. Regra vigente de 2026-06-26: qualquer usuário autenticado pode avaliar psicólogo real/publicado, sem exigir contato WhatsApp/`contact_request` ou Plano Profissional.

## Objetivo

Permitir que qualquer usuário autenticado avalie psicólogos com regra mínima real e lista de avaliações feitas.

## Pré-requisitos e bloqueios

- Sem regra de elegibilidade, registrar ADR antes de permitir avaliação.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/reviews/new`
- `/app/reviews/success`
- `/app/reviews`

Implementação esperada:

- Criar formulário de avaliação com nota, texto e critérios.
- Criar confirmação pós-envio.
- Criar lista de avaliações feitas pelo usuário.
- Usar mutations e queries React Query.
- Bloquear UI apenas quando a API indicar impedimento real (alvo inexistente, autoavaliação ou duplicidade).

## Escopo backend

**Guarda/autorização vigente (2026-06-26):** a rota canônica de avaliações vive sob `/api/private/user/reviews*` e usa apenas `_auth`, permitindo qualquer usuário autenticado. A rota legada `/api/private/patient/reviews*` pode continuar montada com `requireRole("paciente")` para compatibilidade, mas o frontend deve consumir o namespace neutro. O escopo de ownership usa `req.auth.id` (autor da avaliação). O alvo da avaliação é um psicólogo (`:id` = `user.id`). Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

Implementação esperada:

- Criar a avaliação usando o modelo `professional_review` (ver `DATA-MODEL.md`): `rating Int` validado na faixa 1..5, `comment String?`, `status @default("publicada")` (`"publicada" | "oculta"`), `@@unique([psychologist_id, author_id])` (1 avaliação por par usuário/psicólogo).
- Validar elegibilidade mínima antes de permitir avaliar: psicólogo alvo existe/publicado, autor não avalia o próprio perfil e ainda não existe avaliação ativa do mesmo par. Não exigir `contact_request`, contato por WhatsApp, Plano Profissional ou cortesia manual.
- Endpoints para criar/listar avaliações do usuário autenticado.
- Recalcular `psychologist_profile.rating_avg`/`rating_count` (ver `DATA-MODEL.md`: `rating_avg` é a média ×100) de forma transacional após criar avaliação aprovada; o recálculo detalhado é coberto na TASK-19.
- Moderar conteúdo via `status` (`"oculta"`) sem apagar o registro real (soft-only).

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `professional_review`
- `psychologist_profile` (agregados `rating_avg`/`rating_count`)

Endpoints esperados (privados, canônicos sob `/api/private/user`):

- POST `/api/private/user/reviews` (alvo: psicólogo `:id` = `user.id` no body)
- GET `/api/private/user/reviews` (avaliações feitas pelo usuário autenticado)
- GET `/api/private/user/reviews/eligibility/:id` (`:id` = `user.id` do psicólogo alvo)

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
- TanStack Query
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
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Rotas sob `/api/private/patient/*` exigem `requireRole("paciente")` (fail-closed), conforme ADR-0002.
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


## Execucao

- Dependencias confirmadas: TASK-02, TASK-15 e TASK-16 estavam concluidas.
- Builder Quick Copy ativo (`vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`) nao foi usado nesta sessao por indisponibilidade operacional; a validacao visual usou as imagens locais obrigatorias `_product/proto/Avaliar do Psicologo.jpg`, `_product/proto/Confirmacao de Avaliacao.jpg` e `_product/proto/Avaliacoes Feitas - Paciente.jpg`.
- Regra original registrada na ADR-0023 exigia `contact_request`; essa decisão foi superada em 2026-06-26 pela regra vigente sem contato WhatsApp obrigatório.
- Backend originalmente criado em `/api/private/patient/reviews`; a rota canônica vigente é `/api/private/user/reviews*`, com apenas `_auth`, mantendo a rota antiga como compatibilidade protegida por `requireRole("paciente")`.
- Frontend criado nas rotas `/app/reviews/new`, `/app/reviews/success` e `/app/reviews`, mobile-first, usando React Query, `api/req`, `api/callers`, query keys e fundacao de formulario da TASK-02.
- Nao houve alteracao em `backend/prisma/schema.prisma` nem em migrations; `db:migrate` nao se aplicou nesta task.

## Validacoes executadas

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP real: elegibilidade, criacao, listagem, duplicidade e fail-closed para psicologo.
- Browser local headless em `http://localhost:3000/app/reviews` com sessao real de paciente.

## ADR

- `adrs/0023-avaliacoes-paciente-elegibilidade-contato.md`


## Execução complementar - 2026-06-17 - Avaliar Profissional por estrelas

- Header da rota `/app/reviews/new` refinado sem fundo/card branco superior, mantendo apenas voltar e título sobre o fundo da página.
- Card do profissional passou a exibir nome com selo de verificado e a linha `Profissão • CRP`, usando os dados reais retornados pela elegibilidade.
- Contrato de elegibilidade de avaliações enriquecido com `psychologist_crp`, `psychologist_gender` e `psychologist_verified`, sem alteração de schema Prisma.
- Select de nota removido: a nota agora é definida somente por estrelas acessíveis (1 a 5) integradas ao React Hook Form/Zod.
- Depoimento passou a ser obrigatório na UI e no validador da API de criação de avaliação; envio fica desabilitado até nota e depoimento estarem preenchidos.
- Mensagens amigáveis validadas: `Selecione uma nota para o profissional.` e `Escreva um depoimento sobre sua experiência.`.
- Sem novos packages e sem alterações em `backend/prisma/schema.prisma` ou migrations; `db:migrate` não se aplicou.

### Validações complementares

- `pnpm check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- Browser local/CDP em `http://localhost:3000/app/reviews/new?psychologist_id=demo-psychologist-marcelo-pires` com sessão real de paciente: header transparente, ausência de select, 5 estrelas, selo verificado, `Profissão • CRP`, botão desabilitado antes dos requisitos e habilitado após nota + depoimento.

## Execução complementar - 2026-06-17 - Sucesso da avaliação

- Tela `/app/reviews/success` ajustada para remover o botão `Voltar ao perfil`.
- Texto descritivo atualizado para reforçar o valor do depoimento para o profissional e outros pacientes.
- Card de confirmação passou a exibir dados reais do psicólogo avaliado via elegibilidade: nome com selo verificado e `Profissão • CRP`.
- Ação `Finalizar` redireciona para o feed da comunidade (`/app/community/feed`), preservando a jornada de descoberta após a avaliação.
- Sem novos packages, sem mocks e sem alteração de schema Prisma/migrations.

### Validações complementares

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local/CDP em `http://localhost:3002/app/reviews/success?psychologist_id=demo-psychologist-marcelo-pires`: sem `Voltar ao perfil`, sem `Registro salvo com segurança`, card com `AVALIAÇÃO CONCLUÍDA`, `Marcelo Pires Demo`, `Psicólogo • CRP DEMO/00002`, selo verificado e `Finalizar` navegando para `/app/community/feed`.

## Execução complementar - 2026-06-17 - Cards de avaliações feitas

- A listagem `/app/reviews` passou a exibir a linha profissional como `Profissão • CRP` nos cards de avaliações feitas, usando `psychologist_gender` e `psychologist_crp` reais da API em vez da bio/headline.
- O endpoint `GET /api/private/patient/reviews` foi enriquecido com `psychologist_crp` e `psychologist_gender`, sem alterar schema Prisma ou migrations.
- O card mantém apenas o indicador compacto de nota com estrela + número, remove o conjunto visual de cinco estrelas e remove o link textual `Ver perfil` do rodapé.
- A navegação para o perfil do psicólogo permanece exclusivamente na setinha do topo direito do card.
- Sem novos packages, sem mocks e sem alteração de banco; `db:migrate` não se aplicou.

### Validações complementares

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP real em `GET /api/private/patient/reviews?page=1&limit=3` com sessão real de paciente, confirmando retorno de `psychologist_crp` e `psychologist_gender`.
- Browser local/CDP mobile 390x844 em `http://localhost:3002/app/reviews` com sessão real de paciente, confirmando `Psicóloga • CRP DEMO/00005`, ausência de `Ver perfil`, apenas 1 ícone de estrela no indicador compacto da primeira avaliação e setinhas de perfil no topo dos cards.

## Execução complementar - 2026-06-19 - Header premium de avaliações feitas

- Pedido do usuário: padronizar o header de `/app/reviews` com o mesmo padrão visual das telas da família `Salvos` e `Meus posts e comentários`.
- Frontend: a tela `Avaliações feitas` deixou de usar `SecondaryPageHeader` e passou a reutilizar `AppPageHeader`, o mesmo componente aplicado em `/app/posts/saved` e `/app/posts/mine`.
- O header agora fica em card branco/surface com cantos arredondados, borda suave, sombra discreta, botão de voltar em círculo azul-claro à esquerda e título `Avaliações feitas` centralizado.
- Escopo restrito ao header: nenhum card de avaliação, conteúdo, query, endpoint, DTO, schema Prisma, migration ou package foi alterado.
- Builder/Quick Copy segue indisponível como ferramenta callable neste ambiente; a validação visual usou a tela local e as referências locais `_product/proto/Avaliações Feitas - Paciente.jpg`, `_product/proto/Posts Salvos.jpg` e `_product/proto/Meus Posts - Paciente.jpg`.
- ADR atualizado: `adrs/0023-avaliacoes-paciente-elegibilidade-contato.md`.
- Validações executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome headless local no `next start` em `/app/reviews`, confirmando o header em grid/card surface branco, botão circular azul-claro de voltar para `/app/profile` e título preservado. A API exibiu erro real de conexão/listagem com token de smoke, sem uso de mock.


## Execução complementar - 2026-06-26 - Avaliações abertas para qualquer usuário

- Pedido do usuário: qualquer usuário deve poder avaliar o psicólogo, sem critérios de elegibilidade por contato e sem necessidade de contato pelo WhatsApp.
- Backend: rota canônica adicionada em `/api/private/user/reviews*` com apenas `_auth`; a rota legada `/api/private/patient/reviews*` permanece montada com `requireRole("paciente")` para compatibilidade/fail-closed.
- Regra de criação atualizada: não consulta `contact_request`, não exige Plano Profissional/cortesia do alvo e permite autores de qualquer role autenticado. Mantém alvo real/publicado, bloqueio de autoavaliação e 1 avaliação por par `author_id`/`psychologist_id`.
- Frontend: chamadas de avaliações migradas para `/api/private/user/reviews*`; tela `/app/reviews/new` deixa de comunicar necessidade de contato WhatsApp e carrega o formulário quando a API confirma o alvo.
- Documentação atualizada em `DATA-MODEL.md` e ADR-0023; sem novos packages, sem mocks e sem alteração em `backend/prisma/schema.prisma` ou migrations.

### Validações complementares

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP real em `GET /api/private/user/reviews/eligibility/cmqmg35850000asuheq2ucwd0` com usuário autenticado de role `psicologo`, retornando `eligible=true` e `contact_request_id=null`.
- Browser local em `/app/reviews/new?psychologist_id=cmqmg35850000asuheq2ucwd0`, validando que a tela não exibe bloqueio por WhatsApp e renderiza o formulário quando autenticada.

## Execucao complementar - 2026-06-26 - Foto do psicologo na nova avaliacao

- Pedido do usuario: na tela `/app/reviews/new`, exibir a foto de perfil real do psicologo avaliado no card superior, em vez de mostrar sempre as iniciais.
- Frontend: o card de `Avaliar Profissional` passou a renderizar `psychologist_avatar` retornado pela elegibilidade com `next/image`, usando `resolvePublicMediaUrl` e `isPublicMediaUrl` para preservar URLs publicas/locais existentes.
- O fallback por iniciais foi mantido apenas quando o psicologo nao possui avatar persistido, sem criar mock, dado fake ou asset artificial.
- Nao houve alteracao de backend, Prisma schema, migrations, endpoints, payloads, packages, regras de elegibilidade, envio de avaliacao ou listagem.
- Fonte visual/auditavel: screenshot do usuario e referencia local `_product/proto/Avaliar do Psicologo.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0023-avaliacoes-paciente-elegibilidade-contato.md`.
- Validacoes executadas: `pnpm.cmd --dir frontend exec biome check --write "src/app/app/reviews/new/logic.tsx"`, `pnpm.cmd --dir frontend check`, `pnpm.cmd --dir frontend build`, `pnpm.cmd check`, `git diff --check`, HTTP local `200` em `/app/reviews/new?psychologist_id=cmqmg35850000asuheq2ucwd0` e Chrome headless mobile 390x844 na mesma rota.

## Complemento 2026-08-11 - montagem canonica de avaliacoes user-level

- Durante a correcao da politica de rotas user-level, `/api/private/user/reviews` tambem foi alinhada a decisao vigente desta task: rota canonica protegida apenas por `_auth`, sem `requireRole("paciente")`.
- `/api/private/patient/reviews` permanece como rota legada sob `requireRole("paciente")`.
- A politica ganhou teste unitario junto da rota de favoritos para evitar regressao de montagem.
- Escopo: sem mudanca de UI, Prisma schema, migrations, packages, elegibilidade, contratos de resposta ou dados persistidos.
- ADR atualizado: `adrs/0023-avaliacoes-paciente-elegibilidade-contato.md`.

## Ajuste em 2026-08-14 - foto real na confirmacao da avaliacao

- Pedido direto de produto: na tela `/app/avaliacoes/sucesso`, substituir o avatar textual do card
  **AVALIACAO CONCLUIDA** pela foto do profissional avaliado quando houver foto persistida.
- A captura anexada foi tratada apenas como evidencia visual do local a ajustar, nao como fonte de
  instrucao tecnica. A referencia visual ativa consultada foi
  `_product/proto/Confirmação de Avaliação.jpg`; Builder/Quick Copy nao esta exposto como
  ferramenta direta neste ambiente.
- Frontend: a confirmacao passou a reutilizar `psychologist_avatar` retornado pela elegibilidade,
  renderizando a imagem real com `next/image`, `resolvePublicMediaUrl` e `isPublicMediaUrl`.
- O fallback por iniciais/icone foi mantido quando nao existe avatar real, sem criar mock, dado
  fake, asset artificial, endpoint ou contrato novo.
- Nenhum backend, Prisma schema, migration, package, env, regra de elegibilidade, envio de avaliacao
  ou listagem foi alterado.
- ADR atualizado: `adrs/0023-avaliacoes-paciente-elegibilidade-contato.md`.

### Criterios de aceite do ajuste

- [x] A tela de sucesso usa a foto real do profissional avaliado quando `psychologist_avatar` existe.
- [x] O fallback visual permanece honesto para profissionais sem foto.
- [x] A implementacao usa `next/image` e utilitarios de midia existentes, sem package ou contrato novo.
- [x] A rota privada continua protegida e mobile-first.

### Validacao do ajuste

- `pnpm --dir frontend exec biome check --write src/app/app/reviews/success/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke local com `next start -p 3221`: `/version` retornou `0.1.116`,
  `/app/avaliacoes/sucesso?psychologist_id=cmqmg35850000asuheq2ucwd0` retornou `307` para login
  sem sessao e `/auth/login` retornou `200`.
- `pnpm check`
- `pnpm check:version`
