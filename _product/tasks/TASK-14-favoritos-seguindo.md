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

## Execução completa (2026-06-06)

- Referências visuais consultadas: `_product/proto/Favoritos.jpg` e `_product/proto/Seguindo.jpg`. Builder/Quick Copy não está exposto como ferramenta MCP nesta sessão; foi usado o fallback auditável de imagens locais conforme `PROTO-INVENTORY.md`.
- Backend concluído sob guarda `requireRole("paciente")`:
  - `GET /api/private/patient/favorites`;
  - `POST /api/private/patient/favorites/:id`;
  - `DELETE /api/private/patient/favorites/:id`;
  - `GET /api/private/patient/follows`;
  - `POST /api/private/patient/follows/:id`;
  - `DELETE /api/private/patient/follows/:id`.
- Listagens paginadas usam dados reais, escopo por `req.auth.id`, filtros `deleted=false`, alvo psicólogo ativo e `psychologist_profile.published=true`.
- Frontend concluído nas rotas `/app/favorites` e `/app/following`, com estados de loading, erro e vazio em PT-BR, tabs entre listas, contadores reais e cards reutilizados da descoberta.
- O card de psicólogo da descoberta foi extraído para componente reutilizável e agora diferencia `favorited` e `followed` com atualizações otimistas e rollback por snapshot em erro.
- Não foram criados formulários nesta task; a fundação da TASK-02 não era aplicável.
- A rota de perfil profissional `/app/psychologist/[id]` ainda pertence à TASK-15 e não existe no produto atual; a integração dos mesmos botões no perfil deve ser feita quando a TASK-15 materializar essa tela.
- ADR atualizado: `adrs/0020-favoritar-psicologo-na-listagem.md`.
- Validações executadas:
  - `pnpm --dir backend db:migrate` (sem migration pendente; schema já sincronizado pela execução parcial anterior);
  - `pnpm --dir backend check`;
  - `pnpm --dir backend build`;
  - `pnpm --dir frontend check`;
  - `pnpm --dir frontend build`;
  - smoke real de API com paciente e psicólogo temporários: guarda 403 para psicólogo em rota paciente, criar/listar/remover favorito, criar/listar/remover seguindo e refletir `favorited/followed` no diretório;
  - browser local headless desktop `1440x1000`: `/app/favorites` com remoção pelo coração e estado vazio; `/app/following` com remoção pelo botão `Seguindo` e estado vazio.

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

## Complemento 2026-06-16 - header nativo mobile e grid 2 colunas

- Pedido do usuário: ajustar `/app/favorites` para remover o carrossel horizontal, transformar o topo mobile em header real sem faixa cinza acima/laterais, reduzir chips e simplificar o CTA dos cards.
- Referência visual ativa: `_product/proto/Favoritos.jpg`; Builder/Quick Copy não está exposto como ferramenta direta nesta sessão, então a validação visual usou o fallback auditável de imagens locais e browser local.
- O `PrivateTemplate` da tela passou a usar conteúdo sem padding superior/lateral no mobile, permitindo que o header branco encoste no topo e ocupe toda a largura útil; o card mantém apenas cantos inferiores arredondados no mobile e volta ao card arredondado completo em telas maiores.
- O coração do header deixou de ter overlay/fundo azul e passou a ser apenas um ícone discreto.
- Os chips de filtro foram compactados com menor altura, menor padding, fonte menor e borda mais refinada.
- O carrossel horizontal dos favoritos foi substituído por grid responsivo, com 2 cards por linha no mobile e colunas progressivas em telas maiores.
- Os cards foram levemente reduzidos, preservando avatar circular central, coração preenchido sem fundo, bolinha verde pulsante baseada em `available_today`, nome + selo, texto `Psicólogo` e CTA verde.
- O botão principal passou de `Chamar no WhatsApp` para `WhatsApp`, mantendo ícone, fundo verde preenchido e fluxo real `PsychologistWhatsAppRedirectButton`.
- Não houve alteração de backend, Prisma, migrations, packages, endpoints, filtros, paginação, favoritos ou tracking de contato.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, HTTP local `200` em `/app/favorites` e browser local Chrome headless autenticado em `/app/favorites`.

## Complemento 2026-06-16 - hero premium e cards mais compactos

- Pedido do usuário: repensar completamente o header de `/app/favorites`, com mais impacto visual e sem aparência de card comum, e reduzir o espaço morto entre nome, tipo profissional e CTA nos cards.
- Referência visual ativa: `_product/proto/Favoritos.jpg`; Builder/Quick Copy não está exposto como ferramenta direta nesta sessão, mantendo o fallback auditável por imagens locais e browser local.
- O header foi redesenhado como hero full-bleed no topo da página, sem faixa cinza superior/lateral, com gradientes suaves, profundidade discreta, coração azul da identidade Lectum e transição mais orgânica para o conteúdo.
- Os filtros continuam no mesmo contrato real, mas ganharam superfície translúcida/compacta para participar do hero sem parecer bloco de formulário.
- Os cards de psicólogos foram compactados: menor altura mínima, avatar preservado como foco, bloco de nome/tipo mais próximo do CTA e botão `WhatsApp` sem `mt-auto` para evitar vazio vertical.
- O nome do psicólogo continua permitindo até duas linhas com `line-clamp-2`, preservando nomes longos sem truncamento agressivo nem quebra da grade.
- Não houve alteração de backend, Prisma, migrations, packages, endpoints, filtros, paginação, favoritos ou tracking de contato.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e browser local Chrome headless autenticado em `/app/favorites`.

## Complemento 2026-06-16 - header limpo e cards com mais respiro

- Pedido do usuario: aproximar o header de `/app/favorites` do modelo limpo de `/app/notifications`, removendo o hero gradiente, reduzindo exageros tipograficos e refinando cards/CTA/coracao.
- Referencia visual ativa: `_product/proto/Favoritos.jpg` e o header real de `/app/notifications`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao, mantendo fallback auditavel por imagens locais e browser local.
- O header deixou de ser um bloco full-bleed com gradiente, blur e sombra; agora fica integrado ao fundo da pagina, sem fundo branco destacado, sem container colorido e com titulo/subtitulo em escala mais discreta.
- O chip `Sua curadoria` ficou menor, com borda/fundo azul muito sutis; os chips de filtro ficaram neutros/compactos fora do hero colorido.
- Os cards de favoritos ganharam mais padding e respiro entre avatar, nome, `Psicologo` e CTA, preservando a grade mobile de duas colunas.
- O CTA `WhatsApp` manteve fundo verde preenchido e icone, mas a tipografia foi reduzida para menor peso visual.
- O coracao do card foi aumentado e ganhou area clicavel maior, mantendo visual elegante e a mesma logica real de remover favorito.
- Nao houve alteracao de backend, Prisma, migrations, packages, endpoints, filtros, paginacao, favoritos ou tracking de contato.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e browser local Chrome/CDP autenticado em mobile 390px e desktop 1280px em `/app/favorites`.

## Complemento 2026-06-17 - limpeza visual de Comunidades Seguidas

- Pedido do usuario: simplificar `/app/following` para reduzir ruido visual e priorizar descoberta de comunidades.
- Referencia visual ativa: `_product/proto/Seguindo.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao, mantendo fallback auditavel nas imagens locais.
- O card `Em destaque` removeu a previa de descricao da comunidade, mantendo apenas badge `Novidade`/`Seguindo`, nome da comunidade e CTA `Explorar`.
- O layout do destaque foi compactado para nao deixar espacos vazios apos a remocao da descricao.
- A secao final `Acompanhe novidades` foi removida junto com os chips `Atualizacao diaria`, `Comunidades seguras` e `Conteudo real`.
- O fim da pagina agora acontece naturalmente apos `Recomendados para voce`, sem bloco informativo adicional.
- Escopo: sem mudancas de backend, Prisma, migrations, packages, endpoints, participacao em comunidades ou recomendacoes reais.
- ADR atualizado: `adrs/0073-comunidades-seguidas.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e Chrome/CDP autenticado em mobile 390px na rota `/app/following`, confirmando ausencia da descricao do destaque e da secao/chips de novidades, sem overflow horizontal.

## Complemento 2026-06-17 - header branco e filtros premium em Favoritos

- Pedido do usuario: refinar `/app/favorites` com header em fundo branco envolvendo `Sua curadoria`, titulo, descricao e filtros, chips mais premium e cards de psicologos favoritos menos comprimidos verticalmente.
- Referencia visual ativa: `_product/proto/Favoritos.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao, mantendo fallback auditavel nas imagens locais e validacao em browser local.
- O header voltou a ter uma superficie branca/surface propria, com borda sutil e sem bloco colorido, envolvendo o badge, titulo, descricao e a linha de chips de filtro.
- Os chips `Disponivel hoje`, `Verificados`, `Convenios` e demais filtros mantiveram a logica real existente, mas foram refinados com altura compacta, tipografia menor, icones alinhados, borda azul-clara sutil e sem glow/sombra no estado ativo.
- Os cards dos psicologos favoritos ganharam altura minima maior, padding interno ampliado, avatar levemente maior e mais respiro entre avatar, nome, profissao e CTA `WhatsApp`.
- Escopo: sem mudancas de backend, Prisma, migrations, packages, endpoints, filtros, paginacao, favoritos ou tracking de contato.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check src/components/psychologists/psychologist-relation-list.tsx`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP autenticado em desktop 1280px e mobile 390px na rota `/app/favorites`, confirmando header branco, chips sem `box-shadow`, alinhamento central e cards reais mais altos.

## Complemento 2026-06-18 - filtros independentes em Favoritos

- Pedido do usuário: mover os chips `Disponível hoje`, `Verificados`, `Convênios` e demais filtros para fora do header branco de `/app/favorites`, deixando o header apenas com badge `Sua curadoria`, título, descrição e ícone de coração.
- Referência visual ativa: `_product/proto/Favoritos.jpg`; Builder/Quick Copy não está exposto como ferramenta direta nesta sessão, mantendo fallback auditável pelas imagens locais e validação em browser local.
- A linha de filtros passou a ser uma faixa independente logo abaixo do header, com rolagem horizontal suave no mobile e alinhamento ao conteúdo da página.
- Os chips mantêm a lógica real de filtros/paginação, mas foram refinados com fundo branco ou azul muito claro, borda azul-clara sutil, tipografia menor, ícones alinhados, padding equilibrado e sem sombras/glow.
- O header branco agora contém somente a curadoria da tela: eyebrow, título, descrição e coração da identidade Lectum.
- Escopo: sem mudanças de backend, Prisma, migrations, packages, endpoints, filtros, paginação, favoritos ou tracking de contato.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
- Validações executadas: `pnpm --dir frontend exec biome check --write src/components/psychologists/psychologist-relation-list.tsx`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP autenticado em `/app/favorites`.

## Complemento 2026-06-18 - header secundário premium compartilhado em Comunidades seguidas

- Pedido direto de produto: padronizar `Comunidades seguidas` com o mesmo header visual de `Meus Analytics` e `Minhas Avaliações`.
- A rota `/app/following` passou a usar `AppPageHeader`, com botão de voltar à esquerda, título centralizado, fundo branco, borda suave, sombra discreta e sem textos auxiliares no header.
- O título visual foi normalizado para `Comunidades seguidas`, mantendo a nomenclatura solicitada e a navegação para `/app/profile`.
- Escopo: sem alteração de dados, APIs de comunidades, recomendações, participação em comunidades, schema Prisma ou packages.
- ADR criado: `adrs/0119-header-secundario-premium-compartilhado.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP autenticado em mobile 390x844 e desktop 1024x768, sem overflow horizontal.

## Complemento 2026-06-24 - Favoritos padronizado com Notificações

- Pedido: alinhar a tela de Favoritos à composição de Notificações, mantendo apenas o título "Favoritos" acima do estado vazio/lista.
- Builder/Quick Copy: não exposto como ferramenta direta neste ambiente; validação visual feita por comparação com a tela existente de Notificações e fallback auditável em `_product/proto/Favoritos.jpg`.
- Implementação: removidos tag "Sua curadoria", descrição, ícone de coração do header, superfície branca do header e chips de filtro.
- A tela agora usa o header secundário simples compartilhado, exibindo apenas o título "Favoritos" antes do conteúdo central.
- Responsividade: conteúdo centralizado em coluna responsiva com padding mobile seguro, `w-full/max-w-full` e grid sem larguras fixas que poderiam ultrapassar a viewport.
- Escopo: sem mudanças de backend, Prisma, migrations, packages, endpoints, dados de favoritos ou tracking de WhatsApp.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
- Validações executadas: `pnpm --dir frontend exec biome check --write src/components/psychologists/psychologist-relation-list.tsx`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`.

## Complemento 2026-06-25 - chips de filtro com contagens em Favoritos

- Pedido do usuario: remover o texto de contagem solto `1 perfil salvo`/`perfis salvos` e colocar, logo abaixo do titulo `Favoritos`, chips de filtros importantes com quantidade: `Tudo`, `Disponivel hoje`, `Convenio`, `Desconto 1ª Sessao`, `Valor social` e `Mais experientes`.
- Referencia visual ativa: `_product/proto/Favoritos.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao, entao a validacao visual usou o fallback auditavel e a rota local `/app/favorites`.
- Frontend: `/app/favorites` voltou a exibir uma linha horizontal mobile-first de chips abaixo do `SecondaryPageHeader`, sem o contador textual anterior acima da grade.
- Os chips sao botoes reais de filtro, sincronizados com a URL e com a paginacao resetada ao trocar o filtro.
- As quantidades dos chips nao sao mockadas: cada chip consulta o endpoint real de favoritos com `limit=1` e usa o `count` retornado pela API autenticada.
- Backend: o endpoint real de favoritos passou a aceitar `more_experienced=true`, com a mesma regra de `Mais experientes` da descoberta de psicologos: inscricao CRP anterior a 10 anos e `show_experience_tag=true`.
- Escopo: sem alteracao de Prisma, migrations, packages, dados persistidos, fluxo de favoritar/desfavoritar ou tracking de WhatsApp.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check --write src/components/psychologists/psychologist-relation-list.tsx src/api/generator/types/patient-relations.ts`, `pnpm --dir backend exec biome check --write src/modules/api/private/patient/favorites/validator/index.ts src/modules/api/private/patient/favorites/DTOs/IFavoriteDTO.ts src/modules/api/private/patient/favorites/repositories/FavoriteRepository.ts`, `pnpm --dir frontend check`, `pnpm --dir backend check`, `pnpm --dir frontend build`, `pnpm --dir backend build`, `pnpm check`, `git diff --check` e HTTP local `200` em `/app/favorites`.

## Complemento 2026-06-25 - refinamento visual dos chips e cards de Favoritos

- Pedido do usuario: refinar os chips de `/app/favorites` para ficarem mais modernos, sofisticados e sem sombra, inspirados nos chips de notificacoes do Instagram; ajustar detalhes dos cards mantendo o selo junto ao nome, removendo a borda branca da bolinha verde e removendo o sombreamento do botao de WhatsApp.
- Referencia visual adicional: imagem anexada pelo usuario `c:/Users/tulio/Downloads/WhatsApp Image 2026-06-25 at 17.00.02.jpeg`; referencia ativa do produto segue `_product/proto/Favoritos.jpg`. Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente.
- Frontend: os chips passaram a usar superficies planas, sem `box-shadow`, com estado ativo em azul suave e inativos em cinza claro, mantendo contagens reais e rolagem horizontal mobile-first.
- Cards: o selo verificado agora fica inline junto ao nome, a bolinha verde de disponibilidade perdeu o invólucro branco/ring/sombra e o CTA `WhatsApp` perdeu a sombra traseira.
- Escopo: sem mudancas de backend, Prisma, migrations, packages, endpoint, filtros reais, paginacao, favoritos ou tracking de WhatsApp.

## Complemento 2026-06-25 - hierarquia dos chips e respiro dos cards

- Pedido do usuario: destacar melhor chips nao selecionados, inserir navegacao horizontal por setas no desktop, impedir que o selo verificado fique sozinho na segunda linha, aumentar altura/respiro dos cards e remover sombreamento da foto de perfil mantendo apenas uma linha fina de limite.
- Frontend: chips inativos passaram a ter fundo branco e borda visivel sem sombra, mantendo o chip ativo em azul claro Lectum e as contagens reais do endpoint.
- Desktop: a faixa de chips ganhou botoes laterais de navegacao horizontal, preservando rolagem horizontal natural no mobile.
- Cards: altura minima e espaçamentos internos aumentados; avatar/foto perdeu sombra e ring branco espesso, ficando apenas com linha fina; fallback de iniciais tambem perdeu sombra.
- Nome/selo: o selo verificado passou a ficar preso ao ultimo termo do nome em um bloco sem quebra, evitando que apareça isolado em uma segunda linha.
- Escopo: sem mudancas de backend, Prisma, migrations, packages, filtros reais, paginacao, favoritos ou tracking de WhatsApp.

## Complemento 2026-06-25 - correção de overflow e proporção em Favoritos

- Pedido do usuario: a versao anterior nao ficou boa; a faixa de chips gerava composicao ruim/overflow no desktop e o card ficou grande demais.
- Frontend: o wrapper dos chips foi limitado com `min-w-0`, `max-w-full` e `overflow-hidden`, removendo a causa de scroll horizontal da pagina; a rolagem agora fica contida apenas dentro da faixa de filtros.
- Chips: os botoes de navegacao desktop foram reduzidos e a faixa interna usa `min-w-max` dentro do container rolavel, evitando expandir a largura da pagina.
- Cards: o card ganhou largura maxima explicita e a grid passou a usar `auto-fit` centralizado para impedir que um unico favorito estique exageradamente no desktop.
- Avatar: manteve a linha fina sem sombra, com tamanho um pouco mais controlado para recuperar proporcao.
- Escopo: sem mudancas de backend, Prisma, migrations, packages, filtros reais, paginacao, favoritos ou tracking de WhatsApp.


## Complemento 2026-06-25 - grade 2x e chips alinhados a Comunidade

- Pedido do usuario: em `/app/favorites`, cada linha deve ter dois cards, o texto do botao `WhatsApp` deve ganhar fonte/padding para nao cortar a base das letras e os chips devem seguir o mesmo layout dos chips `Em destaque`, `Novos` e `Mais comentados` da pagina de comunidade.
- Frontend: a grade da lista passou a usar duas colunas fixas responsivas, mantendo cards de favoritos reais e sem alterar a pagina de comunidade.
- Chips: somente os chips de Favoritos foram recalibrados para pills compactas com altura, borda, tipografia e estados equivalentes aos filtros da comunidade; os chips de `/app/community/[slug]` nao foram alterados.
- WhatsApp: o CTA dos cards ganhou `min-height`, padding vertical/horizontal, fonte maior, icone maior e `line-height` mais folgado para evitar corte visual em `WhatsApp`.
- Escopo: sem mudancas de backend, Prisma, migrations, packages, endpoint, filtros reais, paginacao, favoritos, pagina de Comunidade ou tracking de WhatsApp.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check --write src/components/psychologists/psychologist-relation-list.tsx`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `git diff --check` e HTTP local `200` em `/app/favorites`.


## Complemento 2026-06-25 - desktop com 3 cards e escala tipografica menor

- Pedido do usuario: manter 2 cards por linha no mobile, mas exibir 3 cards por linha no desktop; reduzir a escala visual das fontes do WhatsApp e dos chips, que ficaram grandes demais.
- Frontend: a grade de `/app/favorites` passou a usar `grid-cols-2` no mobile e `sm:grid-cols-3` em telas maiores, preservando o limite de largura dos cards.
- Chips: somente os chips de Favoritos tiveram altura, padding e fonte reduzidos, mantendo o layout em pill sem alterar os chips de Comunidade.
- WhatsApp: o CTA dos cards manteve respiro vertical para nao cortar a base do texto, mas voltou para escala tipografica menor e icone mais discreto.
- Escopo: sem mudancas de backend, Prisma, migrations, packages, endpoint, filtros reais, paginacao, favoritos, pagina de Comunidade ou tracking de WhatsApp.


## Complemento 2026-06-25 - microtipografia e nome em linha unica

- Pedido do usuario: diminuir novamente as fontes dos textos das chips e do botao `WhatsApp`; no card, exibir o nome do psicologo em uma unica linha, truncando com `...` quando necessario e mantendo o selo verificado sempre visivel.
- Frontend: as chips de Favoritos tiveram fonte reduzida para 9.5px e gap menor, sem alterar as chips da pagina de Comunidade.
- Card: o nome passou de `line-clamp-2` para uma linha unica com `truncate`; o selo verificado fica como item fixo `shrink-0` ao lado do nome quando existir.
- WhatsApp: o CTA teve fonte e icone reduzidos, preservando `min-height`, padding e `line-height` para evitar corte visual dos descendentes do texto.
- Escopo: sem mudancas de backend, Prisma, migrations, packages, endpoint, filtros reais, paginacao, favoritos, pagina de Comunidade ou tracking de WhatsApp.


## Complemento 2026-06-25 - chips de Favoritos iguais ao padrao de Comunidade

- Pedido do usuario: as chips de Favoritos ainda nao seguiam o mesmo padrao das chips da Comunidade; alterar apenas Favoritos e nao mexer nas chips de Comunidade.
- Frontend: as chips de `/app/favorites` passaram a usar helper proprio com a mesma composicao visual de `communityPostSortChipClassName`: `h-[30px]`, `min-h-[30px]`, borda, `px-3`, `text-[11px]`, `font-bold`, `leading-none`, `shadow-none`, transicoes e estados ativo/inativo equivalentes.
- A faixa de filtros de Favoritos tambem passou para `nav` com rolagem horizontal, `scroll-smooth`, `gap-1.5`, `py-1` e `pr-2`, alinhada ao trilho das chips de ordenacao da Comunidade.
- O arquivo de Comunidade nao foi alterado; o padrao foi apenas replicado localmente em Favoritos para evitar acoplamento prematuro.
- Escopo: sem mudancas de backend, Prisma, migrations, packages, endpoint, filtros reais, paginacao, favoritos, pagina de Comunidade ou tracking de WhatsApp.


## Complemento 2026-06-25 - header branco de Favoritos com chips abaixo

- Pedido do usuario: replicar em `/app/favorites` o modelo visual com titulo `Favoritos`, descricao `Profissionais que voce salvou para comparar e conversar quando quiser.`, header com fundo branco, icone de coracao a esquerda e chips logo abaixo do header.
- Frontend: o `SecondaryPageHeader` simples foi substituido por um header local de Favoritos com superficie branca, borda suave, sombra discreta, icone de coracao, titulo e descricao.
- As chips permanecem fora do header, imediatamente abaixo, preservando o padrao visual alinhado as chips da Comunidade e a rolagem horizontal mobile-first.
- Escopo: sem mudancas de backend, Prisma, migrations, packages, endpoint, filtros reais, paginacao, favoritos, pagina de Comunidade ou tracking de WhatsApp.


## Complemento 2026-06-25 - texto PT-BR e proporcao mobile dos cards

- Pedido do usuario: corrigir o texto em portugues, ajustar a proporcao entre icone e texto no botao de WhatsApp e replicar no mobile a disposicao mais espacada dos cards que ficou melhor no desktop.
- Frontend: a descricao do header de Favoritos foi normalizada para renderizar corretamente `voc?` no browser.
- Cards: a base mobile passou a usar a mesma composicao espacada do desktop, com card mais alto, padding maior, cantos maiores, avatar de 112px, maior respiro entre avatar/nome/profissao e CTA.
- WhatsApp: o CTA passou a usar o texto em portugues `Conversar`, com icone maior e proporcao mais equilibrada entre icone e texto, mantendo a acao/aria-label de WhatsApp.
- Escopo: sem mudancas de backend, Prisma, migrations, packages, endpoints, filtros reais, paginacao, favoritos, pagina de Comunidade ou tracking de WhatsApp.


## Complemento 2026-06-25 - contador em badge nas chips de Favoritos

- Pedido do usuario: trocar o contador textual entre parenteses das chips de Favoritos por um layout mais moderno, inspirado no contador da secao Publicacoes do perfil do psicologo, sem alterar nada no perfil; e voltar o texto do CTA dos cards para `WhatsApp`.
- Frontend: as chips de `/app/favorites` agora exibem a quantidade em um badge circular/oval separado, sem parenteses, com borda azul-clara, fundo azul muito claro e tipografia azul em destaque; no chip ativo o contador usa superficie branca para contraste.
- Cards: o CTA voltou a exibir `WhatsApp`, mantendo a proporcao atual entre icone, texto, altura e padding.
- Escopo: sem mudancas no perfil do psicologo, backend, Prisma, migrations, packages, endpoint, filtros reais, paginacao, favoritos ou tracking de WhatsApp.

## Complemento 2026-06-25 - compactacao visual dos cards mobile

- Pedido do usuario: os cards de Favoritos no mobile estavam com espacamento excessivo/desconfigurado e o texto `WhatsApp` do CTA estava truncando.
- Analise visual: a composicao mobile estava herdando a escala espacada do desktop; com duas colunas em 390px, o avatar de 112px, padding de 20px e respiros grandes deixavam pouco espaco util para texto e CTA.
- Frontend: somente o card mobile de `/app/favorites` foi recalibrado com altura, padding, raio, avatar, gap e tipografia menores; os tamanhos desktop permanecem aplicados a partir de `sm:` para preservar a disposicao mais aberta em telas maiores.
- WhatsApp: o CTA mobile ganhou largura util maior por reducao de padding interno do card, fonte/icone compactos e label sem truncamento, garantindo que `WhatsApp` caiba inteiro no botao.
- Escopo: sem mudancas no perfil do psicologo, pagina de Comunidade, backend, Prisma, migrations, packages, endpoints, filtros reais, paginacao, favoritos ou tracking de WhatsApp.

## Complemento 2026-06-25 - card de Favoritos com capa e bio

- Pedido do usuario: transformar os cards de Favoritos no modelo de perfil salvo inspirado na referencia visual, com imagem de capa, avatar sobreposto, coracao no lugar do `X`, bio no lugar de `Psicologo` e botao `WhatsApp` no lugar de `Conectar`.
- Frontend: o card de `/app/favorites` ganhou uma area de capa no topo usando `video_cover_url` quando disponivel e fallback visual Lectum quando nao houver capa real.
- Avatar: a foto/iniciais passou a sobrepor a capa, preservando `next/image`, borda fina e indicador de disponibilidade quando existir.
- Conteudo: o subtitulo agora usa `headline`, depois `bio`, depois especialidades reais como fallback; somente em ausencia desses dados usa o tipo profissional derivado do genero.
- Acao: o coracao preenchido permanece como controle de remover dos favoritos e o CTA principal continua abrindo o fluxo de WhatsApp com o label `WhatsApp` sem truncamento.
- Responsivo: a composicao foi ajustada mobile-first para duas colunas compactas e preserva tres cards por linha a partir de `sm:`.
- Escopo: sem mocks, sem novos packages, sem alteracao de Comunidade, perfil do psicologo, backend, Prisma, migrations, endpoints, filtros reais, paginacao, favoritos ou tracking de WhatsApp.

## Complemento 2026-06-25 - Favoritos alinhado ao layout amplo do Perfil

- Pedido do usuario: fazer a tela de Favoritos seguir o padrao espacial da pagina de Perfil, onde o header ocupa mais largura/altura e tem menos margem no topo e laterais, ajustando tambem chips e cards para acompanhar o novo layout.
- Frontend: somente `/app/favorites` teve o container principal ampliado de `max-w-2xl` para `max-w-[960px]`, com padding mobile-first menor no topo/laterais para aproximar a densidade visual do Perfil.
- Header: o bloco de Favoritos ficou maior, centralizado, com icone de coracao em destaque e altura mais proxima do header do Perfil, preservando titulo e descricao.
- Chips: a faixa de filtros agora acompanha a mesma largura do container maior, mantendo rolagem horizontal e estados existentes.
- Cards: a grade e os cards passaram a ocupar a largura disponivel do novo container, mantendo 2 colunas no mobile e 3 no desktop, com capa/avatar/bio/WhatsApp ajustados para a escala ampliada.
- Escopo: nenhuma alteracao na pagina de Perfil, Comunidade, backend, Prisma, migrations, endpoints, filtros reais, paginacao, favoritos ou tracking de WhatsApp.

## Complemento 2026-06-25 - header de Favoritos usando Perfil como modelo direto

- Pedido do usuario: obter o header da pagina de Perfil como modelo e ajustar o header de Favoritos e os elementos da tela para a mesma proporcao, sem alterar Perfil.
- Frontend: somente `/app/favorites` foi alterada; o header local passou a usar a mesma estrutura visual do header de Perfil: container com `rounded-[var(--lectum-card-radius)]`, borda/tokens globais, `shadow-[var(--lectum-shadow-soft)]`, bloco interno `px-6 py-8`, icone circular de 112px, titulo `text-2xl` e descricao alinhada como subtitulo.
- Layout: o container principal de Favoritos voltou ao mesmo envelope responsivo do Perfil (`max-w-[430px]` no mobile e `md:max-w-3xl`), para manter margens, largura e ritmo semelhantes.
- Chips e cards: continuam abaixo do header e acompanham a largura do novo envelope; a grade preserva 2 colunas no mobile e 3 no desktop com cards preenchendo a coluna disponivel.
- Escopo: nenhuma alteracao na pagina de Perfil, Comunidade, backend, Prisma, migrations, endpoints, filtros reais, paginacao, favoritos ou tracking de WhatsApp.

## Complemento 2026-06-25 - bio mais leve e capa real nos cards

- Pedido do usuario: deixar o texto da bio do card mais leve, aumentar o respiro entre bio e CTA de WhatsApp e corrigir a imagem de capa que nao estava aparecendo.
- Backend: o endpoint de Favoritos passou a retornar `cover_image_url` do perfil profissional, alem de manter `video_cover_url`; nao houve alteracao de schema/migration.
- Frontend: o card passou a priorizar `cover_image_url`, depois `video_cover_url`; quando nao ha capa dedicada, usa fallback visual neutro, sem promover o `avatar` para capa.
- Bio: a tipografia da bio foi reduzida de peso visual (`font-medium` e `text-muted/90`) para ficar menos pesada no card.
- WhatsApp: o CTA foi colocado em um wrapper com `pt-4 sm:pt-5`, preservando alinhamento inferior e criando mais respiro entre a bio e o botao.
- Escopo: sem alteracao na pagina de Perfil, Comunidade, Prisma schema, migrations, packages, filtros reais, paginacao, favoritos ou tracking de WhatsApp.

## Complemento 2026-06-25 - capa de Favoritos sem fallback de avatar

- Pedido do usuario: a imagem de capa em Favoritos nao deve ser a mesma imagem/foto do perfil.
- Frontend: a capa dos cards de `/app/favorites` passou a aceitar somente assets dedicados de capa (`cover_image_url` ou `video_cover_url`) e ignora candidatos iguais ao `avatar` do profissional.
- Fallback: quando nao houver capa dedicada real, a area de capa usa a superficie neutra/gradiente Lectum existente, sem repetir a foto ou icone de perfil como imagem de capa.
- Escopo: nenhuma alteracao na pagina de Perfil, Comunidade, backend, Prisma, migrations, endpoints, filtros reais, paginacao, favoritos ou tracking de WhatsApp.

## Complemento 2026-06-26 - proporcao de chips, status e CTA em Favoritos

- Pedido do usuario: aumentar as chips de `/app/favorites`, trocar `Tudo` por `Todos`, reposicionar a bolinha verde pulsante para ficar mais sobreposta ao avatar/foto e reduzir o texto do botao `WhatsApp` para ficar proporcional ao icone.
- Frontend: as chips de Favoritos passaram de 30px para 38px no mobile e 40px em telas maiores, com label de 12px/13px e badge de contagem maior, preservando rolagem horizontal e contagens reais do endpoint.
- Frontend: o primeiro filtro agora usa o texto `Todos`, sem alterar a chave `all`, a URL, a paginacao ou as queries reais.
- Frontend: o indicador `Disponivel hoje` foi movido para dentro do avatar (`right/bottom` internos), mantendo o pulso verde baseado somente em `available_today` real.
- Frontend: o CTA `WhatsApp` manteve o botao verde e o fluxo `PsychologistWhatsAppRedirectButton`, mas o label passou a ter tamanho explicito menor no `span` interno e o icone usa medida em pixels para equilibrar a proporcao.
- Escopo: sem mudancas de backend, Prisma, migrations, packages, endpoints, filtros reais, paginacao, favoritos ou tracking de WhatsApp.
- Fonte visual/auditavel: screenshots do usuario em `/app/favorites` e referencia local `_product/proto/Favoritos.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
- Validacoes executadas: `pnpm.cmd --dir frontend exec biome check --write src/components/psychologists/psychologist-relation-list.tsx`, `pnpm.cmd --dir frontend check`, `pnpm.cmd --dir frontend build`, `pnpm.cmd check`, `git diff --check`, HTTP local `200` em `/app/favorites` e Chrome headless local em viewport 390x844 renderizando a rota.

## Complemento 2026-06-26 - chips no padrão Comunidade e microajustes dos cards

- Pedido do usuário: aplicar em `/app/favorites` as alterações guardadas: chips no mesmo padrão visual dos filtros da Comunidade, bolinha verde pulsante mais alinhada/sobreposta ao avatar e CTA `WhatsApp` com ícone/texto mais proporcionais.
- Referência visual/auditável: screenshots do usuário em `/app/favorites`, referência local `_product/proto/Favoritos.jpg` e comparação com os chips `Em destaque`, `Novos` e `Mais comentados` de `/app/community/[slug]`; Builder/Quick Copy não está exposto como ferramenta callable neste ambiente.
- Frontend: as chips de Favoritos voltaram à composição visual do helper de Comunidade (`h-8`, `text-xs`, `px-3`, borda, estados ativo/inativo e transições equivalentes), preservando o badge de contagem real dentro de cada chip.
- Frontend: o indicador `available_today` foi reposicionado para dentro do círculo do avatar, mantendo o pulso verde baseado somente em dado real e sem simular presença online.
- Frontend: o CTA `WhatsApp` teve altura, peso, ícone e label recalibrados para reduzir a sensação de desproporção, preservando `PsychologistWhatsAppRedirectButton`, tracking e URL real de contato.
- Escopo: sem mudanças de backend, Prisma, migrations, packages, endpoint, filtros reais, paginação, favoritos persistidos ou tracking de WhatsApp.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
- Validações executadas: `pnpm.cmd --dir frontend exec biome check --write src/components/psychologists/psychologist-relation-list.tsx`, `pnpm.cmd --dir frontend check`, `pnpm.cmd --dir frontend build`, `pnpm.cmd check`, `git diff --check` e HTTP local `200` em `/app/favorites`.

## Complemento 2026-06-26 - correção fina dos chips, moldura e CTA mobile

- Pedido do usuário: corrigir a rodada anterior porque as chips ainda estavam grandes, a bolinha verde ficou dentro da imagem em vez de sobre a moldura e, no mobile, o texto do botão `WhatsApp` continuava desalinhado com o ícone.
- Referência visual/auditável: screenshots do usuário em `/app/favorites`, comparação com os chips de `/app/community/[slug]` e referência local `_product/proto/Favoritos.jpg`; Builder/Quick Copy não está exposto como ferramenta callable neste ambiente.
- Frontend: as chips de Favoritos foram reduzidas para altura de 28px, label de 11px, padding menor e badge de contagem de 20px, aproximando o volume visual dos filtros compactos da Comunidade sem alterar filtros reais ou contagens.
- Frontend: o indicador `available_today` passou a ficar centrado sobre a moldura do avatar, com offset de borda e ring de superfície para parecer encaixado na foto em vez de dentro dela.
- Frontend: o CTA `WhatsApp` foi recalibrado no mobile com altura menor, ícone de 12px, label em `inline-flex` com altura fixa e alinhamento vertical pelo próprio conteúdo.
- Escopo: sem mudanças de backend, Prisma, migrations, packages, endpoint, filtros reais, paginação, favoritos persistidos ou tracking de WhatsApp.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
- Validações executadas: `pnpm.cmd --dir frontend exec biome check --write src/components/psychologists/psychologist-relation-list.tsx`, `pnpm.cmd --dir frontend check`, `pnpm.cmd --dir frontend build`, `pnpm.cmd check`, `git diff --check` e HTTP local `200` em `/app/favorites`.
## Complemento 2026-06-26 - replica literal da classe de chips da Comunidade

- Pedido do usuário: corrigir a implementação anterior e replicar literalmente as configurações das chips da Comunidade nas chips de Favoritos, sem aproximações próprias.
- Referência visual/auditável: comparação direta com `communityPostSortChipClassName` em `frontend/src/app/app/community/[slug]/logic.tsx` e screenshots do usuário em `/app/favorites` e `/app/community/ansiedade-em-equilibrio`; Builder/Quick Copy não está exposto como ferramenta callable neste ambiente.
- Frontend: `favoriteFilterChipClassName` voltou a usar a mesma classe-base de `communityPostSortChipClassName` (`h-8`, `min-h-8`, `gap-1.5`, `px-3`, `text-xs`, `font-bold`, foco, transições e estados ativo/inativo equivalentes).
- Frontend: o contador real de Favoritos foi mantido, mas reduzido para um badge de 16px para não distorcer a altura ou a escala da chip replicada da Comunidade.
- Frontend: o ponto verde foi recalibrado para a moldura do avatar e o CTA `WhatsApp` teve alinhamento interno simplificado, preservando o fluxo real de contato.
- Escopo: sem mudanças de backend, Prisma, migrations, packages, endpoint, filtros reais, paginação, favoritos persistidos ou tracking de WhatsApp.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
- Validações executadas: `pnpm.cmd --dir frontend exec biome check --write src/components/psychologists/psychologist-relation-list.tsx`, `pnpm.cmd --dir frontend check`, `pnpm.cmd --dir frontend build`, `git diff --check` e HTTP local `200` em `/app/favorites`.
## Complemento 2026-06-26 - contador sem alterar layout das chips

- Pedido do usuario: replicar as configuracoes de layout das chips da Comunidade em Favoritos, alterando somente a largura necessaria para incluir os contadores, sem alterar tamanhos nem fontes.
- Frontend: `favoriteFilterChipClassName` permanece com a mesma classe-base de `communityPostSortChipClassName` (`h-8`, `min-h-8`, `gap-1.5`, `px-3`, `text-xs`, `font-bold`, `leading-none`, estados e foco equivalentes).
- Frontend: o contador deixou de ser badge com tamanho/fonte propria e passou a ser um `span` simples com `whitespace-nowrap text-xs font-bold leading-none`, igual ao texto da chip; assim a unica diferenca e a largura natural adicional para o numero real.
- Escopo: sem mudancas de backend, Prisma, migrations, packages, endpoint, filtros reais, paginacao, favoritos persistidos ou tracking de WhatsApp.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
## Complemento 2026-06-26 - bolinha azul suave nos contadores das chips

- Pedido do usuario: adicionar uma bolinha azul suave atras dos contadores nas chips de `/app/favorites`, mantendo a configuracao de layout das chips da Comunidade.
- Referencia visual/auditavel: screenshots do usuario em `/app/favorites`, comparacao com os chips de `/app/community/[slug]` e referencia local `_product/proto/Favoritos.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- Frontend: `favoriteFilterChipClassName` permanece com a mesma base visual de `communityPostSortChipClassName`; somente o contador voltou a ter uma superficie circular suave (`bg-primary-soft`) com a mesma fonte `text-xs font-bold leading-none`.
- Escopo: sem mudancas de backend, Prisma, migrations, packages, endpoints, filtros reais, paginacao, favoritos persistidos ou tracking de WhatsApp.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
- Validacoes executadas: `pnpm.cmd --dir frontend exec biome check --write src/components/psychologists/psychologist-relation-list.tsx`, `pnpm.cmd --dir frontend check`, `pnpm.cmd --dir frontend build`, `pnpm.cmd check`, `git diff --check` e HTTP local `200` em `/app/favorites`.

## Complemento 2026-07-05 - bloquear auto-favorito no próprio perfil/vídeo

- Pedido do usuário: quando o psicólogo autenticado estiver no próprio perfil público ou no próprio vídeo de apresentação em `/psychologists`, o botão de coração deve ficar desabilitado; psicólogos não podem favoritar a si mesmos.
- Fonte visual/auditável: prints do usuário, `_product/proto/Psicólogos.jpg` e `_product/proto/Perfil Profissional - Sobre.jpg`. Builder/Quick Copy foi testado com `npx "@builder.io/dev-tools@latest" auth status`, mas retornou `Not Authenticated to Builder.io`; a validação visual seguiu com imagens locais e browser local.
- Backend: `POST /api/private/user/favorites/:id` e a rota legada equivalente agora retornam `403 favorite_own_profile` quando `req.auth.id` é igual ao psicólogo alvo.
- Backend: leituras contextuais do diretório/perfil e a listagem de favoritos ignoram relações antigas de auto-favorito, mantendo `favorited=false` para o próprio psicólogo.
- Frontend: o coração do próprio perfil público e o coração do próprio vídeo/card em `/psychologists` renderizam desabilitados, sem estado vermelho, com `aria-label`/`title` em PT-BR: `Você não pode favoritar o próprio perfil`.
- Escopo: sem alteração de Prisma schema/migrations, sem packages novos, sem mocks e sem endpoints simulados.
- ADR atualizado: `adrs/0020-favoritar-psicologo-na-listagem.md`.
- Validações executadas: `npx "@builder.io/dev-tools@latest" auth status`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `git diff --check`, smoke HTTP local `POST /api/private/user/favorites/:id` retornando `403 favorite_own_profile` para auto-favorito e Chrome headless/CDP mobile 390x844 em `/psychologists/cmr6pzpbn000h5guht478a9l4` e `/psychologists?search=Rezende`, confirmando coração desabilitado (`disabled=true`, `aria-pressed=false`) no próprio perfil/vídeo.

## Complemento 2026-08-11 - liberacao da rota canonica de Favoritos para psicologos

- Pedido do usuario: corrigir a aba `/app/favorites`, que retornava `403` para usuario autenticado com role `psicologo`.
- Causa: a rota canonica `/api/private/user/favorites` estava montada com `requireRole("paciente")`, apesar da decisao vigente de 2026-06-08 permitir favoritos por qualquer usuario autenticado.
- Backend: `/api/private/user/favorites` passou a ser montada apenas com `_auth`; `/api/private/patient/favorites` permanece como rota legada com `requireRole("paciente")`.
- Segurança: a politica de rotas privadas foi extraida para helper testavel, cobrindo namespaces user-level `_auth-only` e mantendo `/api/private/patient/*` e `/api/private/psychologist/*` fail-closed por role.
- Escopo: sem mudanca de UI, Prisma schema, migrations, packages, contratos de resposta, filtros reais, paginacao, favoritos persistidos ou tracking de WhatsApp.
- ADR atualizado: `adrs/0020-favoritar-psicologo-na-listagem.md`.

## Complemento 2026-08-11 - estado vazio de Favoritos mais compacto

- Pedido do usuario: reduzir o espacamento vertical entre o icone de coracao, o titulo `Voce ainda nao possui favoritos`, a descricao `Explore psicologos...` e o botao `Explorar psicologos`.
- Referencias visuais/auditaveis: screenshot do usuario `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-11 at 10.37.39.jpeg` e referencia local `_product/proto/Favoritos.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao.
- Frontend: o estado vazio de `/app/favoritos` passou a centralizar o conteudo pelo proprio grid (`content-center`), reduziu o gap interno, o padding vertical e a altura minima do bloco, mantendo o card, borda tracejada, copy e CTA existentes.
- Escopo: sem mudancas de backend, Prisma schema, migrations, packages, endpoint, filtros reais, paginacao, favoritos persistidos ou tracking de WhatsApp.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check --write src/components/psychologists/psychologist-relation-list.tsx`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `git diff --check`, HTTP local `200` em `/app/favoritos` e Chrome headless local em viewport 390x844.

## Complemento 2026-08-15 - imagens reais em Comunidades seguidas

- Pedido do usuario: em `Comunidades seguidas`, corrigir as imagens do bloco **Em destaque** e o
  avatar das demais comunidades.
- Fonte visual/auditavel: screenshot do usuario em `/app/comunidades-seguidas`; a imagem anexada
  foi tratada apenas como evidencia visual. As referencias locais consultadas foram
  `_product/proto/Seguindo.jpg`, `_product/proto/Explorar Comunidades.jpg` e
  `_product/proto/Feed Comunidade.jpg`; Builder/Quick Copy nao esta exposto como ferramenta
  callable neste ambiente.
- Frontend: `/app/following` e a rota canonica `/app/comunidades-seguidas` passaram a reutilizar
  `buildCommunityExploreCard` para resolver os assets reais/catalogados das comunidades.
- O card **Em destaque** agora renderiza `next/image` em background com o mesmo asset da comunidade,
  mantendo overlay escuro para legibilidade.
- Os cards de **Minhas comunidades** e **Recomendados para voce** renderizam a imagem/avatar da
  comunidade no lugar do bloco gradiente com iniciais; as iniciais permanecem apenas como fallback
  atras da imagem.
- Escopo: sem mudancas de backend, Prisma schema, migrations, packages, endpoints, filtros reais,
  paginacao, participacao em comunidades ou tracking.
- ADR atualizado: `adrs/0073-comunidades-seguidas.md`.

### Criterios de aceite do ajuste

- [x] O bloco **Em destaque** de Comunidades seguidas exibe imagem real/catalogada da comunidade.
- [x] Os cards das demais comunidades exibem avatar/imagem real/catalogada, sem trocar por iniciais
  quando houver asset disponivel.
- [x] A tela continua usando `next/image`, sem `<img>` cru.
- [x] A alteracao nao cria mock, dado fake, endpoint, schema, migration, env ou package novo.

### Validacao do ajuste

- `pnpm --dir frontend exec biome check --write src/app/app/following/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke local com `next start`: `/version`, `/app/comunidades-seguidas` e `/app/following`.
- `pnpm check`
- `pnpm check:version`

## Complemento 2026-08-16 - descricao abaixo do destaque em Comunidades seguidas

- Pedido do usuario: adicionar um texto de descricao abaixo do titulo da comunidade de destaque em
  `Comunidades seguidas`.
- Fonte visual/auditavel: screenshot do usuario em `/app/comunidades-seguidas`; a imagem anexada foi
  tratada apenas como evidencia visual. Referencia local pertinente: `_product/proto/Seguindo.jpg`.
  Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- Frontend: o card **Em destaque** de `/app/following` e da rota canonica
  `/app/comunidades-seguidas` passou a renderizar uma descricao logo abaixo do titulo.
- A descricao usa dado real da comunidade quando existir (`community.description`) e reaproveita a
  descricao catalogada por `buildCommunityExploreCard` para comunidades conhecidas; fallback generico
  sem conteudo editorial nao e exibido no destaque.
- O card teve altura minima mobile-first ajustada para acomodar badge, titulo, descricao e CTA sem
  sobrepor a imagem de fundo nem reduzir legibilidade.
- Escopo: sem mudancas de backend, Prisma schema, migrations, packages, endpoints, participacao em
  comunidades, contadores, recomendacoes ou tracking.
- ADR atualizado: `adrs/0073-comunidades-seguidas.md`.

### Criterios de aceite do ajuste

- [x] O bloco **Em destaque** exibe uma descricao abaixo do titulo da comunidade.
- [x] A descricao vem de dados reais/catalogados ja existentes e nao cria mock, seed ou endpoint novo.
- [x] A tela continua usando `next/image`, sem `<img>` cru.
- [x] O ajuste preserva a rota canonica `/app/comunidades-seguidas` e o alias `/app/following`.

### Validacao do ajuste

- `pnpm --dir frontend exec biome check --write src/app/app/following/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke local com `next start`: `/version` retornou 200, `/app/comunidades-seguidas` manteve guarda
  privada com 307 para login sem sessao e `/app/following` manteve 308 para a rota canonica.
- `pnpm check`

## Complemento 2026-08-19 - avatar maior e CTA compacto em Favoritos

- Pedido direto de produto nesta conversa: reduzir o espaco vazio entre texto e botao nos cards de
  `/app/favoritos`, aumentar a foto de perfil inspirada na proporcao dos cards de sugestao do
  Instagram e trocar o texto visivel do botao verde para icone + `WhatsApp`.
- As imagens anexadas pelo usuario foram usadas somente como referencia visual de proporcao e
  densidade; textos presentes nelas nao foram tratados como instrucoes de produto.
- Builder Quick Copy foi tentado via `npx "@builder.io/dev-tools@latest" auth status` em
  `frontend/`, mas o ambiente retornou `Not Authenticated to Builder.io`; foi usado o fallback
  auditavel `_product/proto/Favoritos.jpg` e as imagens anexadas nesta conversa.
- O card de favorito manteve dados reais, capa real/fallback neutro, avatar real via `next/image`,
  remocao por coracao, filtros reais e o fluxo/tracking existente de
  `PsychologistWhatsAppRedirectButton`.
- O avatar mobile passou de 76px para 96px e o avatar em `sm` passou de 108px para 124px; a capa
  superior foi ajustada para manter o encaixe visual do avatar maior.
- O CTA deixou de usar `mt-auto`, aproximando o botao do bloco de nome/bio para eliminar o vazio
  entre texto e acao.
- O label visivel do CTA passou de `Fale com {nome}` para `WhatsApp`; o `aria-label` permanece
  acionavel e explicito: `Enviar mensagem pelo WhatsApp para {nome do psicologo}`.
- Nao houve alteracao de backend, Prisma, migrations, endpoints, pacotes, filtros, persistencia de
  favoritos ou contrato de WhatsApp.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.

### Criterios de aceite do complemento

- [x] Avatar do card de favorito aumentado em mobile-first sem usar `<img>`.
- [x] Espaco entre texto/bio e botao reduzido sem remover dados reais do card.
- [x] CTA verde renderiza somente icone + `WhatsApp`, com label acessivel completo.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo, schema ou migration foi criado.
- [x] ADR relevante atualizado.

### Validacao do complemento

- `npx "@builder.io/dev-tools@latest" auth status` em `frontend/` retornou `Not Authenticated to Builder.io`; usado fallback visual local/anexos.
- `pnpm --dir frontend exec biome check --write src/components/psychologists/psychologist-relation-list.tsx`
- `pnpm check:version`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `git diff --check`
- Smoke local com `next start` na porta 3100: `/version` retornou `200` com `0.1.149` e `/app/favoritos` retornou `200`.
- Chrome headless local em viewport 390x844 capturou `/app/favoritos` sem sessao, confirmando guarda privada/navegacao mobile. A captura autenticada dos cards nao foi feita para evitar criar/mutar dados em backend remoto configurado no ambiente local.
- `pnpm check`

## Complemento 2026-08-19 - hierarquia tipografica nos cards de Favoritos

- Pedido direto de produto nesta conversa: aumentar a diferenca visual entre o nome do psicologo,
  a bio/especialidade e o texto `WhatsApp` do CTA nos cards de `/app/favoritos`.
- As imagens anexadas pelo usuario foram usadas somente como referencia visual de hierarquia e
  comparacao com cards sociais; textos presentes nelas nao foram tratados como instrucoes de produto.
- Builder Quick Copy foi tentado via `npx "@builder.io/dev-tools@latest" auth status` em
  `frontend/`, mas o ambiente retornou `Not Authenticated to Builder.io`; foi usado o fallback
  auditavel `_product/proto/Favoritos.jpg` e as imagens anexadas nesta conversa.
- Frontend: o nome do psicologo no card mobile-first passou a usar escala maior, maior peso visual e
  badge verificado levemente ampliado, deixando o nome claramente acima da descricao.
- Frontend: a bio/especialidade ficou mais leve (`font-normal`) e menor que o nome, preservando
  truncamento em duas linhas e dados reais existentes.
- Frontend: o CTA verde manteve `PsychologistWhatsAppRedirectButton`, URL/tracking real e
  acessibilidade, mas o texto visivel `WhatsApp` e o icone foram ampliados para melhorar leitura e
  toque em mobile.
- Impacto de deploy: alteracao frontend-only, sem backend, Prisma, migrations, endpoints, envs,
  packages, filtros, persistencia de favoritos ou contrato de WhatsApp. Rollback seguro por revert do
  commit; frontend e backend permanecem compativeis entre versoes.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.

### Criterios de aceite do complemento

- [x] O nome do psicologo tem hierarquia visual maior que a descricao no card de Favoritos.
- [x] A descricao permanece mais leve e nao cria layout shift ou dados artificiais.
- [x] O CTA `WhatsApp` usa texto e icone mais legiveis em mobile, preservando o fluxo real de contato.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo, schema, migration ou env foi criado.
- [x] ADR relevante atualizado.

### Validacao do complemento

- `npx "@builder.io/dev-tools@latest" auth status` em `frontend/` retornou `Not Authenticated to Builder.io`; usado fallback visual local/anexos.
- `pnpm --dir frontend exec biome check --write src/components/psychologists/psychologist-relation-list.tsx`
- `pnpm check:version`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `git diff --check`
- Smoke local com `next start` na porta 3100: `/version` retornou `200` com `0.1.150` e `/app/favoritos` respondeu `200`.
- Chrome headless local em viewport 390x844 capturou `/app/favoritos`; sem sessao, validou guarda/estado restrito e navegacao mobile. A captura autenticada dos cards nao foi feita para evitar criar/mutar dados no backend remoto configurado localmente.
- `pnpm check`

## Complemento 2026-08-20 - bolinha verde ancorada no avatar em Favoritos

- Pedido direto de produto nesta conversa: corrigir a bolinha verde de disponibilidade no card de
  `/app/favoritos`, que aparecia solta no canto inferior direito do avatar, e aumentar um pouco o
  tamanho dela.
- A imagem anexada pelo usuario foi usada somente como evidencia visual do desalinhamento; textos e
  demais elementos presentes na captura nao foram tratados como instrucoes de produto alem do pedido
  explicito.
- Builder Quick Copy foi tentado via `npx "@builder.io/dev-tools@1.79.0" auth status` em
  `frontend/`, mas o CLI falhou com `ENOENT` no cache local do `npx`; foi usado o fallback auditavel
  `_product/proto/Favoritos.jpg` e a captura anexada.
- Frontend: o indicador `available_today` do card de favorito passou de 14px/16px para uma superficie
  de 20px/24px, com ponto verde interno de 14px/16px.
- Frontend: a posicao foi recalibrada para ficar na diagonal inferior direita da foto circular, sem
  usar o canto externo do quadrado do avatar, e ganhou moldura/surface por tokens para separar da
  imagem.
- Escopo: sem mudancas de backend, Prisma, migrations, endpoints, packages, envs, filtros reais,
  favoritos persistidos ou tracking de WhatsApp.
- Impacto de deploy: alteracao frontend-only, compativel com backend em versoes diferentes. Rollback
  seguro por revert do commit. Nenhuma env nova e nenhum ALERTA DE DEPLOY.
- ADR atualizado: `adrs/0061-favoritos-cards-premium-filtros-reais.md`.

### Criterios de aceite do ajuste

- [x] A bolinha verde fica visualmente ancorada sobre a borda inferior direita do avatar, nao no
  canto externo do quadrado da imagem.
- [x] O indicador ficou maior e mais legivel em mobile-first.
- [x] O indicador continua dependendo somente do dado real `available_today`, sem mock ou estado
  online artificial.
- [x] A tela continua usando `next/image`, sem `<img>` cru.
- [x] Nenhum backend, schema, migration, package, env, endpoint ou tracking foi alterado.
- [x] ADR relevante atualizado.

### Validacao do ajuste

- `npx "@builder.io/dev-tools@1.79.0" auth status` em `frontend/` falhou com `ENOENT`; usado fallback
  visual local/anexo.
- `pnpm --dir frontend exec biome check --write src/components/psychologists/psychologist-relation-list.tsx`
- `pnpm --dir frontend check` passou em nova execucao com timeout maior; a primeira tentativa excedeu
  o timeout local de 120s.
- `pnpm version:bump` atualizou os quatro manifests de `0.1.150` para `0.1.151`.
- `pnpm check:version`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local com `next start` na porta 3100: `/version` retornou `200` com `0.1.151` e
  `/app/favoritos` retornou `200`.
- Chrome headless local em viewport 390x844 capturou `/app/favoritos`; sem sessao, validou
  guarda/estado restrito e navegacao mobile. A captura autenticada dos cards nao foi feita para
  evitar criar/mutar dados reais no backend remoto configurado localmente.
