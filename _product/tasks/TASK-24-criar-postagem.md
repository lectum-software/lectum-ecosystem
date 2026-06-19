# TASK-24: Criar postagem

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-24 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Comunidades |
| Status | Completed |
| Dependências | TASK-02, TASK-23 |
| ADR alvo | `adrs/0065-criacao-posts-comunidade.md` |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Criar Nova Postagem - Pacientes.jpg` | `figma-design-frame-38-Criar-Nova-Postagem---Pacientes.html` |
| `_product/proto/Criar Nova Postagem - Psicólogo.jpg` | `figma-design-frame-29-Criar-Nova-Postagem---Psic-logo.html` |
| `_product/proto/Confirmação de Postagem.jpg` | `figma-design-frame-28-Confirma--o-de-Postagem.html` |
| `_product/proto/post_add_24dp_64748B_FILL0_wght400_GRAD0_opsz24 1.jpg` | `figma-design-frame-62-post-add-24dp-64748B-FILL0-wght400-GRAD0-opsz24-1.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Os protótipos mostram variações por tipo de usuário. A implementação precisa respeitar role, comunidade selecionada e regras de publicação.

## Objetivo

Permitir criação real de post por paciente e psicólogo, com diferenças de perfil e confirmação.

## Pré-requisitos e bloqueios

- Anexos usam Cloudflare R2 via API S3-compatible (decisão da TASK-03 / ADR-0006); sem credenciais/bucket no ambiente, implementar texto sem upload e registrar pendência.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas (convenção canônica de `DATA-MODEL.md`):

- `/app/community/[slug]/post/new`
- `/app/community/[slug]/post/success`

Implementação esperada:

- Criar formulário de post com comunidade, título, conteúdo e anexos se permitidos.
- Usar variação visual por paciente/psicólogo sem duplicar lógica.
- Criar tela/modal de confirmação.
- Usar ícone de adicionar via lucide ou asset estável.
- Invalidar feed após criação.

## Escopo backend

Implementação esperada:

- Endpoint privado para criar post.
- Validar comunidade existente (por `slug`) e usuário autenticado.
- Persistir `community_post.status` segundo a decisão de moderação abaixo.
- Se anexos forem usados, depender de storage real R2.
- Registrar `author_id`; o tipo de perfil deriva de `user.role`, não é coluna nova do post.

Decisão de moderação (ADR desta task): adotar o default de `DATA-MODEL.md` — criar post diretamente como `status = "publicado"` com **moderação reativa** (remoção posterior para `"removido"`), pois o PRD §16 só prevê moderação por IA na V3. O valor `"pendente"` fica reservado para quando uma regra de pré-moderação for aprovada em ADR; não implementar fila de aprovação agora. Registrar esta decisão no ADR alvo.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `community_post` (`status`: `"publicado" | "pendente" | "removido"`)
- `community`

Endpoints esperados (convenção canônica de `DATA-MODEL.md`):

- POST `/api/private/community/:slug/posts`

Request/response: seguir o "Contrato padrão de API" de `DATA-MODEL.md` (envelope de sucesso/erro; validação via `validator/index.ts`). Após criar, invalidar a query key do feed da comunidade.

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
- multer/R2 S3-compatible apenas se credenciais reais estiverem disponíveis

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
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Rotas seguem a convenção canônica do `DATA-MODEL.md`.
- [x] Decisão de moderação (publicar vs pré-moderar) registrada no ADR alvo.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
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

## Registro de execução

- Referências consultadas: PDFs anexados pelo usuário e imagens locais em `_product/proto` para paciente, psicólogo e confirmação.
- Backend criado em `POST /api/private/community/:slug/posts`, usando o modelo existente `community_post` sem migration.
- Frontend criado nas rotas canônicas `/app/community/[slug]/post/new` e `/app/community/[slug]/post/success`; `/app/community/post/new` redireciona para `/app/community/feed/post/new`.
- Mídia/anexos ficaram como pendência explícita por ausência de credenciais/bucket R2 no ambiente; a publicação de texto foi implementada de ponta a ponta.
- ADR: `adrs/0065-criacao-posts-comunidade.md`.
- Refinamento de hierarquia/UX: o formulário agora segue `Comunidade → título → conteúdo → anonimato → postar`, mantendo apenas o seletor como exibição da comunidade, com textarea inicial maior/autocrescimento e CTA azul com estado desabilitado.
- Refinamento do switch anônimo: o anonimato permanece desligado por padrão, abaixo dos campos principais, com peso visual reduzido; a dica educativa `💡 Publicar com seu nome ajuda a tornar as conversas mais pessoais e acolhedoras.` aparece apenas quando ativado; posts anônimos passam a ser exibidos como `Membro Anônimo #1234` no feed.
- Ajuste complementar de criação contextual: links originados de uma comunidade específica usam `/app/community/[slug]/post/new`; o formulário também aceita `?community=slug`, valida a opção carregada e pré-seleciona a comunidade sem criar chip ou preview duplicado.
- Builder Quick Copy não está disponível como ferramenta neste ambiente; a validação visual deste ajuste usou a tela local existente e os protótipos exportados em `_product/proto`.

## Complemento 2026-06-14 — refinamento do seletor e fechamento

- Pedido do usuário: ajustar a tela `Criar Post` sem alterar a lógica de anonimato nem a aparência do switch.
- Frontend: o seletor de comunidade passou a usar o asset SVG anexado pelo usuário em `frontend/public/svg/public_24dp_64748B_FILL0_wght400_GRAD0_opsz24.svg`, renderizado com `next/image` e mantendo padding/alinhamento do campo.
- Navegação: o botão `X` do topo agora usa navegação de histórico (`router.back()`), retornando para a origem imediata em vez de uma rota fixa.
- Formulário: o bloco `Postar como anônimo` foi movido para imediatamente abaixo do seletor de comunidade, mantendo a nova ordem `Comunidade → Anonimato → Título → Conteúdo → demais elementos`.
- Escopo: sem mudanças de backend, schema Prisma, packages, endpoint, payload de criação ou lógica do anonimato.
- ADR não atualizado por se tratar de refinamento visual/comportamental local, sem nova decisão arquitetural, integração ou regra de domínio.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`; HTTP local sem cookie autenticado retornou 307 esperado para `/app/community/feed/post/new`.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.

## Complemento 2026-06-17 - altura do seletor de comunidade

- Pedido do usuario: corrigir corte visual de descendentes (`q`, `g`, `p`, `j`) no texto do pill de comunidade da tela `Criar Post`, observado em `Ansiedade em equilibrio`.
- Frontend: o seletor de comunidade de `/app/community/[slug]/post/new` recebeu altura levemente maior (`h-11`), line-height mais confortável (`1.35`), padding vertical controlado e `overflow-visible` no botão, preservando largura, radius, ícone, texto e seta.
- O ícone do seletor foi realinhado ao centro da nova altura do pill, sem alterar a largura útil nem criar componente paralelo ao controller de select existente.
- Escopo: sem mudanças de backend, Prisma, migrations, endpoint, payload, lógica de criação, anonimato, ordenação de comunidades ou packages.
- ADR atualizado: `adrs/0065-criacao-posts-comunidade.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile em `/app/community/ansiedade-em-equilibrio/post/new`, confirmando botão com `overflow: visible`, texto dentro do pill e ícone/seta centralizados.

## Complemento 2026-06-19 - editor leve em sheet

- Pedido do usuário: refatorar completamente a tela `Criar Post` para parecer menos formulário e mais editor livre de comunidade, inspirado em Threads/Reddit/LinkedIn, usando também as imagens anexadas de referência.
- Frontend: `/app/community/[slug]/post/new` passou a renderizar como sheet/modal mobile-first que entra de baixo, com cantos superiores arredondados, header `X | Criar Post | i` e fechamento com transição suave.
- O card fixo de regras saiu do rodapé e virou popover discreto no ícone de informação, preservando a copy de respeito/moderação.
- O seletor de comunidade permanece logo abaixo do header, compacto, real e pré-selecionado quando a rota/contexto fornece slug.
- Título e conteúdo continuam usando React Hook Form/Zod + controllers da TASK-02, mas agora com estilo borderless, integrado ao editor, título obrigatório e placeholder orientativo definido pelo brief.
- O textarea deixou de crescer com a digitação; ele usa área interna rolável para textos longos sem redimensionar a interface.
- A barra inferior agora fica fixa no rodapé visual da sheet, acima do teclado quando o viewport mobile redimensiona:
  - pacientes: texto permanente `Deseja publicar anonimamente?`, switch e botão `Postar` na mesma linha;
  - psicólogos: botão compacto de mídia à esquerda e `Postar` à direita, sem a seção grande `Adicionar mídia`.
- A tip de anonimato aparece somente quando o paciente ativa o switch, acima da barra, com tom informativo e acolhedor.
- Foram adicionadas tentativas de preservação de foco/teclado no mobile: autofoco no título, refoco do último campo ativo ao tocar em áreas vazias e botões auxiliares que evitam tomar foco do editor.
- O upload real de mídia para post segue pendente pelo mesmo bloqueio de storage/schema já registrado; o botão compacto apenas informa a dependência real, sem simular upload.
- Builder/Quick Copy não está exposto como ferramenta neste ambiente; a validação visual usou `_product/proto/Criar Nova Postagem - Pacientes.jpg`, `_product/proto/Criar Nova Postagem - Psicólogo.jpg` e os screenshots anexados pelo usuário.
- Escopo: sem mudanças de backend, Prisma, migrations, endpoint, payload, regras de anonimato, ordenação de comunidades ou packages.
- ADR atualizado: `adrs/0065-criacao-posts-comunidade.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`; Chrome headless local confirmou carregamento da rota no servidor dev existente, mas a captura autenticada da sheet ficou limitada porque a sessão local disponível não aceitou token gerado fora do servidor em execução.

## Complemento 2026-06-19 - ajustes finos do editor em sheet

- Pedido do usuario: refinar a nova tela `Criar Post` apos validacao visual em desktop, mantendo o modelo de editor livre em sheet.
- Frontend: o microtexto do switch de anonimato foi reduzido para `Publicar anonimamente?`.
- A tip de anonimato ganhou icone de lampada, botao `X` proprio e fechamento independente do estado do switch; desligar o switch continua escondendo a tip e reativa-lo volta a exibi-la.
- A copy da tip foi atualizada para orientar o uso de primeiro nome ou apelido no perfil, sem tom de julgamento contra o anonimato.
- Placeholders de titulo e conteudo receberam menor contraste/peso; o titulo digitado passou a usar hierarquia semelhante aos cards do feed (`font-black`, cor mais escura e tamanho maior), enquanto o conteudo permanece como texto normal.
- O backdrop da sheet ficou mais leve (`bg-foreground/[0.06]`), preservando a sensacao de modal sem deixar o fundo com aparencia desligada.
- Validacoes client-side agora limpam imediatamente erros corrigidos de comunidade, titulo e descricao; o alerta geral `Nao foi possivel postar` deixa de aparecer quando nao ha erros ativos ou quando a mensagem de API ficou obsoleta apos edicao.
- O erro do seletor de comunidade foi isolado abaixo do pill em slot absoluto/reservado, sem alterar altura, padding, alinhamento interno ou largura do dropdown.
- Escopo: sem mudancas de backend, Prisma, migrations, endpoint, payload, regras de anonimato, permissoes de midia ou packages.
- Builder/Quick Copy segue indisponivel como ferramenta neste ambiente; a validacao visual usa os prototipos locais e os screenshots anexados pelo usuario.
- ADR atualizado: `adrs/0065-criacao-posts-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome headless local em `http://localhost:3000/app/community/feed/post/new` com sessao real recente, validando hierarquia do titulo (24.32px/900), limpeza dos erros corrigidos, copy curta do switch, tip com X independente e backdrop mais leve.

## Complemento 2026-06-19 - placeholder, rolagem e overlay do editor em sheet

- Pedido do usuario: novos ajustes finos na tela `Criar Post`, mantendo o editor livre em sheet.
- Frontend: o microtexto do switch foi alterado para `Publicar anonimamente`, sem ponto de interrogacao, incluindo o `aria-label`.
- O campo de titulo passou a usar o controller de textarea da fundacao da TASK-02 para permitir quebra de linha do placeholder, mantendo estilo borderless, hierarquia de titulo e texto digitado forte.
- O placeholder do titulo foi suavizado com menor contraste, menor peso e tamanho controlado para caber em duas linhas quando necessario sem parecer conteudo digitado.
- A area de edicao foi reorganizada em flex para nao criar rolagem externa quando o conteudo vazio cabe no espaco util; o textarea de conteudo permanece com `overflow-y-auto` e so rola quando o texto exceder sua propria altura.
- O backdrop da sheet foi reduzido para opacidade muito baixa (`bg-slate-950/[0.025]` no mobile e `[0.018]` no desktop), preservando a modalidade sem deixar o fundo com aparencia de tela cinza apagada.
- Escopo: sem mudancas de backend, Prisma, migrations, endpoint, payload, regras de anonimato, validacoes de dominio ou packages.
- Builder/Quick Copy segue indisponivel como ferramenta neste ambiente; a validacao visual usou os prototipos locais, os screenshots anexados e Chrome headless local.
- ADR atualizado: `adrs/0065-criacao-posts-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome headless local em `http://localhost:3000/app/community/feed/post/new` com sessao real recente, validando titulo como `TEXTAREA`, placeholder claro em 18.56px, texto digitado em 24.32px/900, switch sem `?`, conteudo com `overflow-y: auto`, area externa sem scroll inicial e overlay em baixa opacidade.

## Complemento 2026-06-19 - modal real sobre o feed

- Pedido do usuario: transformar a experiencia de `Criar Post` em uma modal real, mantendo o feed visivel/desfocado atras quando a criacao nasce do feed ou do detalhe de comunidade.
- Frontend: foi adicionada uma parallel route `@modal` em `/app/community/[slug]` com rota interceptada `@modal/(.)post/new`, para que a navegacao interna para `/app/community/[slug]/post/new` renderize o editor no slot de modal sem desmontar a rota de origem.
- A logica compartilhada `CreateCommunityPostLogic` agora aceita `asModalSlot`; nesse modo ela renderiza apenas a sheet/modal, sem criar outro `PrivateTemplate`, evitando tela inteira cinza e permitindo o backdrop real sobre o conteudo anterior.
- A rota direta canonica `/app/community/[slug]/post/new` continua existindo como fallback de acesso direto/reload, preservando compatibilidade e evitando dependencia exclusiva de historico client-side.
- Links do feed filtrado por comunidade passaram a usar `/app/community/feed/post/new?community=slug`, preservando a rota de fundo `feed` e mantendo a pre-selecao real da comunidade por query string.
- O overlay do slot modal usa opacidade muito baixa e `backdrop-blur-[6px]`, com fechamento por `X`, `Esc` e bloqueio temporario do scroll do documento enquanto a modal esta aberta.
- Escopo: sem mudancas de backend, Prisma, migrations, endpoint, payload, regras de anonimato, validacoes de dominio ou packages.
- Builder/Quick Copy segue indisponivel como ferramenta neste ambiente; a validacao visual usou os prototipos locais, os screenshots anexados e Chrome headless local.
- ADR atualizado: `adrs/0065-criacao-posts-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`; Chrome headless local em `http://127.0.0.1:3010/app/community/feed` confirmou navegacao interna para `/app/community/feed/post/new` via rota interceptada, dialog `Criar Post` no slot modal e overlay com `backdrop-filter: blur(6px)`/fundo translucido. `pnpm check` executado na raiz nesta mesma alteracao.

## Complemento 2026-06-19 - ajustes de contexto, espaçamento e erros inline

- Pedido do usuário: garantir que `Criar Post` abra como sobreposição contextual sobre o feed ou comunidade atual, aproximar título e conteúdo e remover a faixa geral vermelha `Não foi possível postar`.
- Frontend: os CTAs de criação do feed e do detalhe de comunidade agora navegam com `scroll={false}`; o `PrivateTemplate` passou a aceitar essa opção no botão central mobile para não reposicionar a tela de fundo ao abrir a rota interceptada.
- Fechamento: o fallback do `X` preserva o recorte do feed quando a criação veio de `/app/community/feed/post/new?community=slug`, evitando retorno para outro contexto quando não houver histórico confiável.
- Formulário: título e conteúdo foram agrupados em um bloco contínuo, sem gap extra entre eles, e o slot reservado de erro do título ficou menor para que os campos pareçam partes do mesmo post.
- Validação: o alerta/card geral `Não foi possível postar` foi removido; erros conhecidos de API continuam mapeados para os campos reais (`community_slug`, `title`, `content`) e erros inesperados aparecem via toast, sem faixa vermelha geral no editor.
- Escopo: sem mudanças de backend, Prisma, migrations, endpoints, payload, regras de anonimato, permissões de mídia ou packages.
- Builder/Quick Copy segue indisponível como ferramenta neste ambiente; a validação visual usou os protótipos locais, a tela existente e Chrome headless local.
- ADR atualizado: `adrs/0065-criacao-posts-comunidade.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`; Chrome headless local em `http://127.0.0.1:3011/app/community/feed` confirmou rota interceptada `/app/community/feed/post/new` com dialog `Criar Post`, ausência da faixa `Não foi possível postar` e erro inline de título/conteúdo. A API local em `localhost:3001` não estava ativa durante o smoke visual, então o feed permaneceu em estado real de erro de conexão, sem uso de mock.

## Complemento 2026-06-19 - refinamento premium e menu desktop estável

- Pedido do usuário: reduzir ainda mais a distância visual entre o campo de título e o texto principal e impedir que o menu lateral desktop recolha ao abrir a modal pelo feed.
- Frontend: o campo de título continua usando o controller de textarea da fundação da TASK-02, mas agora inicia com uma linha, altura mínima menor e padding vertical mais compacto; o conteúdo começa sem padding superior extra, deixando os dois campos com aparência de um único post.
- Shell desktop: o `PrivateTemplate` passou a calcular um pathname de contexto para navegação quando a rota atual é `/app/community/[slug]/post/new`; no feed, esse contexto permanece `/app/community/feed`, então a preferência e o default do menu lateral não mudam enquanto a modal está aberta.
- A decisão preserva a rota real e o slot interceptado da modal; apenas impede que o shell trate a URL contextual de criação como uma página secundária que deveria recolher a sidebar.
- Escopo: sem mudanças de backend, Prisma, migrations, endpoint, payload, regras de anonimato, permissões de mídia ou packages.
- Builder/Quick Copy segue indisponível como ferramenta neste ambiente; a validação visual usou a tela local existente, os protótipos locais e o screenshot anexado pelo usuário.
- ADR atualizado: `adrs/0065-criacao-posts-comunidade.md`.
- Validações executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`; Chrome headless local no `next start` em `http://localhost:3011/app/community/feed` confirmou sidebar expandida em 240px antes e depois de abrir `/app/community/feed/post/new`, dialog `Criar Post`, altura do título em 36px, gap de 12px até o conteúdo e ausência do card `Não foi possível postar`.
