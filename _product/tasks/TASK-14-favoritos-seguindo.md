# TASK-14: Favoritos e seguindo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-14 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Descoberta |
| Status | Completed |
| Dependências | TASK-13 |
| ADR alvo | ADR de favoritos e seguindo |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Favoritos.jpg` | `figma-design-frame-21-Favoritos.html` |
| `_product/proto/Seguindo.jpg` | `figma-design-frame-16-Seguindo.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Favoritos e seguindo aparecem como listas próprias. A implementação precisa diferenciar ações, atualizar contadores e refletir mudanças imediatamente no frontend.

## Objetivo

Permitir que pacientes favoritem e sigam psicólogos com persistência real e telas dedicadas.

## Pré-requisitos e bloqueios

- Depende da listagem real de psicólogos.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/favorites`
- `/app/following`

Implementação esperada:

- Adicionar botão favoritar/seguir nos cards (TASK-13) e no perfil profissional (`/app/psychologist/[id]`, TASK-15).
- Criar telas Favoritos e Seguindo no shell privado da TASK-12.
- Usar optimistic update apenas com rollback real em erro.
- Exibir estados vazio, loading e erro.
- Reutilizar card de psicólogo da TASK-13.

## Escopo backend

**Guarda de papel:** estes endpoints são exclusivos de paciente, vivem sob `/api/private/patient/*` e são protegidos por `requireRole("paciente")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`). O escopo de ownership usa `req.auth.id`. O **alvo** da ação (favoritar/seguir) é um psicólogo (`:id` = `user.id`), mas a ação é executada **pelo** paciente sob `/api/private/patient/...`. Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

Implementação esperada:

- Usar os modelos `psychologist_favorite` e `psychologist_follow` (modelos distintos — favoritar é diferente de seguir; ver `DATA-MODEL.md`), com unicidade `@@unique([user_id, psychologist_id])`.
- Endpoints para listar, criar e remover; listagens paginadas conforme o "Contrato padrão de API" do `DATA-MODEL.md` (`page`/`limit`).
- Garantir que usuário não favorite/siga profissional inexistente ou não publicado (`psychologist_profile.published`).
- Índices por usuário e profissional já previstos no `DATA-MODEL.md`.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `psychologist_favorite`
- `psychologist_follow`

Endpoints esperados (ver "Convenção de rotas" do `DATA-MODEL.md`):

- GET `/api/private/patient/favorites`
- POST `/api/private/patient/favorites/:id` (`:id` = `user.id` do psicólogo alvo)
- DELETE `/api/private/patient/favorites/:id`
- GET `/api/private/patient/follows`
- POST `/api/private/patient/follows/:id` (`:id` = `user.id` do psicólogo alvo)
- DELETE `/api/private/patient/follows/:id`

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

## Execução parcial solicitada no card da TASK-13 (2026-06-06)

- Para atender ao pedido de coração clicável no card de `/app/psychologists`, foi implementado o toggle real de
  favorito, sem concluir a TASK-14 inteira.
- Backend criado neste recorte:
  - modelos `psychologist_favorite` e `psychologist_follow` previstos no `DATA-MODEL.md`;
  - `POST /api/private/patient/favorites/:id`;
  - `DELETE /api/private/patient/favorites/:id`;
  - montagem sob `/api/private/patient/favorites` com `requireRole("paciente")`.
- Frontend criado neste recorte:
  - campo `favorited` em `GET /api/private/directory/psychologists`;
  - botão de coração persistente no card da listagem.
- Naquele momento não foram marcados critérios de aceite desta task porque ainda faltavam:
  - `GET /api/private/patient/favorites`;
  - rotas e ações de `follows`;
  - telas dedicadas `/app/favorites` e `/app/following` com dados reais.
- ADR relacionado: `adrs/0020-favoritar-psicologo-na-listagem.md`.
- Pendências resolvidas na execução completa de 2026-06-06, mantendo como histórica a execução parcial acima.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.

## Execução complementar: favoritos por usuário e coração vermelho (2026-06-08)

- Pedido do usuário: o coração do card deve ficar vermelho ao favoritar e o psicólogo deve aparecer em `/app/favorites`; o selo `Disponível hoje` deve ter fundo branco para ficar legível sobre vídeos.
- Regra de produto atualizada: favoritar psicólogo é relação de qualquer usuário autenticado, enquanto seguir usuários segue removido/depreciado na UI porque usuários seguem comunidades.
- Backend manteve `/api/private/patient/favorites` como rota legada role-guarded e adicionou a rota canônica `/api/private/user/favorites`, protegida apenas por `_auth`, reutilizando a persistência real `psychologist_favorite`.
- Frontend passou a chamar `/api/private/user/favorites`, habilitou o coração para qualquer sessão autenticada, manteve optimistic update/rollback e preservou a listagem real em `/app/favorites`.
- O coração favoritado usa estado vermelho (`text-red-500`, `fill-current`) no card e no perfil público.
- O badge `Disponível hoje` passou a usar fundo branco, borda/sombra e bolinha verde pulsante para contraste sobre vídeo.
- ADRs atualizados: `adrs/0019-descoberta-psicologos-taxonomias.md` e `adrs/0020-favoritar-psicologo-na-listagem.md`.
- Validações executadas:
  - `pnpm --dir backend check`
  - `pnpm --dir frontend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend build`
  - `pnpm check`

## Complemento 2026-06-14 — layout compacto da tela Favoritos

- Pedido do usuário: ajustar apenas texto, organização visual e layout de `/app/favorites`, mantendo dados, lógica de favoritos e lógica dos filtros por chips.
- Referência visual adicional consultada: imagem anexada pelo usuário `WhatsApp Image 2026-06-12 at 20.25.57.jpeg`, usada como direção para grade compacta inspirada em Reddit/Pinterest.
- Frontend: o cabeçalho passou a usar o texto `Profissionais que você salvou para comparar e chamar no WhatsApp quando quiser.`.
- Busca, botão de filtros e scrollbar nativa da área de busca foram removidos da tela; permaneceram apenas chips de filtro em linha única, com rolagem horizontal suave e scrollbar oculta.
- A listagem de favoritos foi reorganizada em cards compactos em grade responsiva, com 2 colunas no mobile quando há espaço, mais colunas em breakpoints maiores, mídia no topo, nome/metadados abaixo, botão de favoritar no canto superior direito e ação discreta de WhatsApp.
- Escopo: sem mudanças de backend, endpoints, schema Prisma, dados carregados, mutações de favorito ou filtros persistidos.
- ADR não atualizado por se tratar de refinamento visual local sem nova decisão arquitetural ou regra de domínio.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e HTTP local 200 em `/app/favorites`.

## Execu??o completa (2026-06-06)

- Refer?ncias visuais consultadas: `_product/proto/Favoritos.jpg` e `_product/proto/Seguindo.jpg`. Builder/Quick Copy n?o est? exposto como ferramenta MCP nesta sess?o; foi usado o fallback audit?vel de imagens locais conforme `PROTO-INVENTORY.md`.
- Backend conclu?do sob guarda `requireRole("paciente")`:
  - `GET /api/private/patient/favorites`;
  - `POST /api/private/patient/favorites/:id`;
  - `DELETE /api/private/patient/favorites/:id`;
  - `GET /api/private/patient/follows`;
  - `POST /api/private/patient/follows/:id`;
  - `DELETE /api/private/patient/follows/:id`.
- Listagens paginadas usam dados reais, escopo por `req.auth.id`, filtros `deleted=false`, alvo psic?logo ativo e `psychologist_profile.published=true`.
- Frontend conclu?do nas rotas `/app/favorites` e `/app/following`, com estados de loading, erro e vazio em PT-BR, tabs entre listas, contadores reais e cards reutilizados da descoberta.
- O card de psic?logo da descoberta foi extra?do para componente reutiliz?vel e agora diferencia `favorited` e `followed` com atualiza??es otimistas e rollback por snapshot em erro.
- N?o foram criados formul?rios nesta task; a funda??o da TASK-02 n?o era aplic?vel.
- A rota de perfil profissional `/app/psychologist/[id]` ainda pertence ? TASK-15 e n?o existe no produto atual; a integra??o dos mesmos bot?es no perfil deve ser feita quando a TASK-15 materializar essa tela.
- ADR atualizado: `adrs/0020-favoritar-psicologo-na-listagem.md`.
- Valida??es executadas:
  - `pnpm --dir backend db:migrate` (sem migration pendente; schema j? sincronizado pela execu??o parcial anterior);
  - `pnpm --dir backend check`;
  - `pnpm --dir backend build`;
  - `pnpm --dir frontend check`;
  - `pnpm --dir frontend build`;
  - smoke real de API com paciente e psic?logo tempor?rios: guarda 403 para psic?logo em rota paciente, criar/listar/remover favorito, criar/listar/remover seguindo e refletir `favorited/followed` no diret?rio;
  - browser local headless desktop `1440x1000`: `/app/favorites` com remo??o pelo cora??o e estado vazio; `/app/following` com remo??o pelo bot?o `Seguindo` e estado vazio.

## Complemento 2026-06-15 - refinamento visual do header e cards de favoritos

- Pedido do usuario: ajustar apenas layout, responsividade e hierarquia visual de `/app/favorites`, sem alterar filtros, contagem, rotas, dados, remocao de favorito ou fluxo WhatsApp.
- Referencia visual ativa: `_product/proto/Favoritos.jpg`; Builder/Quick Copy nao foi acessado diretamente como ferramenta neste ambiente e o fallback auditavel permaneceu nas imagens locais.
- Header mobile-first: o coracao azul foi deslocado para o canto superior direito, alinhado ao topo de `SUA CURADORIA`, liberando largura util para a descricao.
- Header desktop: o mesmo icone de coracao azul passou a aparecer tambem no desktop, com descricao usando a largura horizontal disponivel.
- Cards de favoritos: midia com cantos internos, placeholder premium com gradiente/iniciais, sombra/borda mais suaves, hierarquia de nome/selo/metadados, chips discretos e CTA WhatsApp mais limpo.
- Escopo: sem mudancas de backend, endpoints, schema Prisma, dados carregados ou logica de filtros/favoritos.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e HTTP local 200 em `/app/favorites`.

## Complemento 2026-06-16 - cards estilo sugestões do Instagram

- Pedido do usuário: refazer os cards de `/app/favorites` inspirando-se na seção `Sugestões para você` do Instagram, com visual premium Lectum e foco em conversão para WhatsApp.
- Referências visuais consultadas: imagem anexada `c:/Users/tulio/Downloads/WhatsApp Image 2026-06-16 at 09.37.03.jpeg` e `_product/proto/Favoritos.jpg`. Builder/Quick Copy não está exposto como ferramenta direta nesta sessão.
- O card passou a ser vertical, branco, com borda/sombra suaves, largura fixa e comportamento de carrossel horizontal com `snap`.
- A foto circular do psicólogo virou o principal ponto de atenção; quando não há avatar real, o card usa fallback de iniciais, sem mockar imagem.
- O coração preenchido ativo permanece no canto superior direito como controle discreto de remoção do favorito.
- A bolinha verde pulsante usa apenas o dado real `available_today`, evitando simular um estado online inexistente na API.
- As informações do card foram reduzidas para nome + selo verificado, `Psicólogo` e botão `Chamar no WhatsApp`.
- Foram removidos do card especialidades, abordagens, área, experiência, avaliações, tags comerciais e demais metadados.
- O CTA de WhatsApp agora é preenchido em verde, com texto branco e ícone à esquerda, mantendo o fluxo real `PsychologistWhatsAppRedirectButton`.
- Não houve alteração de backend, Prisma, migrations, packages, endpoints, filtros, paginação, favoritos ou tracking de contato.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e HTTP local `200` em `/app/favorites`.
