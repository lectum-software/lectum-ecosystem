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
- [x] Título de post limitado a 100 caracteres na criação e edição, com validação no backend.
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

## Complemento 2026-06-21 - cortesia ativa no controle de midia

- Pedido do usuario: psicologos com cortesia devem ter 100% dos recursos de psicologos assinantes verificados; o usuario `tuliosrezende@gmail.com` estava sem acesso ao controle de midia na modal `Criar Post`.
- Frontend: `frontend/src/utils/community-media-permission.ts` passou a liberar o controle para psicologos com plano profissional ativo e `source="admin_grant"`, mesmo com `cfp_verified_at` nulo.
- Backend: a autorizacao real de midia em respostas tambem passou a aceitar cortesia administrativa ativa, preservando o bloqueio para plano gratuito.
- O upload de midia em post raiz permanece sem persistencia propria por ausencia de campos de midia em `community_post`; nao foi criado mock, schema paralelo ou endpoint simulado.
- Fonte visual auditavel: `_product/proto/Criar Nova Postagem - Psicologo.jpg` via inventario local e screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente.
- ADRs atualizados: `adrs/0138-create-post-media-permission-modal.md` e `adrs/0096-detalhe-post-composer-denuncia-midia.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir backend check`, `pnpm --dir frontend build`, `pnpm --dir backend build`, scripts locais de permissao backend e Chrome/CDP mobile em `http://localhost:3000/app/community/feed/post/new` confirmando botao de midia habilitado e ausencia da copy bloqueada.

## Complemento 2026-06-21 - storage real para midia de posts

- Pedido do usuario: configurar storage para upload de midia na criacao do post e trocar o icone de anexar midia para um icone de video.
- Backend: `community_post` recebeu `media_url` e `media_type`, com migration `20260621185539_add_community_post_media` aplicada via `pnpm --dir backend db:migrate -- --name add_community_post_media`.
- Backend: foi criado o endpoint real `POST /api/private/community/:slug/posts/media`, usando o middleware de upload existente, Cloudflare R2 publico e prefixo `posts/media/`; `POST /api/private/community/:slug/posts` passou a aceitar `mediaUrl`/`mediaType` ja validados.
- Regra de dominio: a autorizacao de midia de post raiz reutiliza o entitlement profissional real, liberando psicologos com plano profissional ativo e CFP verificado ou cortesia administrativa ativa (`source="admin_grant"`). Pacientes e psicologos sem entitlement continuam bloqueados.
- Frontend: a modal `Criar Post` passou a selecionar arquivo real, enviar primeiro para o endpoint de upload, anexar `mediaUrl`/`mediaType` no payload de criacao e preservar o rascunho em caso de erro.
- Frontend: o botao de midia da criacao de post usa icone `Video`, aceita imagens e videos permitidos e remove a copy antiga de pendencia de R2.
- Fonte visual auditavel: `_product/proto/Criar Nova Postagem - Psicologo.jpg` via inventario local e screenshots do usuario; Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente.
- ADRs atualizados: `adrs/0065-criacao-posts-comunidade.md` e `adrs/0138-create-post-media-permission-modal.md`.
- Validacoes executadas: `pnpm --dir backend db:migrate -- --name add_community_post_media`, `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm check`, smoke real do endpoint de upload com R2 em `posts/media/` e limpeza do objeto, e Chrome/CDP autenticado em `/app/community/ansiedade-em-equilibrio/post/new` confirmando botao `Midia` habilitado, accept com `video/mp4` e ausencia da copy antiga de storage.


## Complemento 2026-06-21 - edição de post publicado

- Pedido direto de produto: permitir que o autor edite um post depois de publicado, a partir do menu de ações do próprio post.
- Backend: foi adicionado `community_post.edited_at` via migration Prisma e o endpoint `PUT /api/private/posts/:id`, restrito ao autor autenticado, para atualizar título, conteúdo e mídia sem alterar comunidade, autoria, anonimato ou status.
- Regras de domínio: anexar/substituir mídia continua dependendo do upload R2 real em `/public/files/posts/media/` e do mesmo entitlement de mídia de posts; remover mídia usa `mediaUrl:null` e `mediaType:null`.
- Frontend: o menu do dono ganhou a opção `Editar post`, abrindo modal mobile-first com React Hook Form/Zod e controllers da TASK-02; o modal alerta quando já existem respostas para preservar o contexto da conversa.
- Feed, detalhe do post, perfil do psicólogo, Meus posts e Salvos passam a receber/exibir `edited_at` como metadado discreto `editado` quando aplicável, sem criar histórico completo no MVP.
- Referências visuais seguem os padrões já implementados para `Criar Post`, `Dentro do Post`, `Meus posts` e publicações do perfil; Builder/Quick Copy não está exposto como ferramenta callable neste ambiente, então a validação visual usa a aplicação local e protótipos exportados.
- DATA-MODEL atualizado com o campo `edited_at` e contrato `PUT /api/private/posts/:id`.
- ADR criado: `adrs/0145-edicao-post-publicado.md`.
- Validações executadas: `pnpm --dir backend db:migrate -- --name add_community_post_edited_at`, `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP local autenticado em `http://localhost:3000/app/posts/mine`, confirmando menu `Editar post` e modal preenchido com alerta de dados fixos.

## Complemento 2026-06-21 - miniatura de mídia no editor

- Pedido do usuário: ao selecionar/uploadar mídia na criação de post, exibir uma miniatura na área em branco após o texto do editor.
- Frontend: o estado de mídia selecionada passou a guardar `File`, tipo normalizado (`image`/`video`) e URL local via `URL.createObjectURL`, com revogação explícita ao remover/substituir mídia ou desmontar a modal.
- A miniatura é renderizada dentro da área de composição, logo abaixo do campo de conteúdo: imagens usam `next/image` com `unoptimized` para `blob:` local, vídeos usam `<video>` apenas como preview visual; não foi usado `<img>` cru no código.
- O botão de mídia no rodapé permanece como ação compacta; o nome do arquivo continua visível de forma discreta e a remoção principal fica sobre a própria miniatura.
- Escopo: sem mudanças de backend, Prisma, migrations, endpoints, payload, entitlement de mídia ou packages.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a validação visual usou `_product/proto/Criar Nova Postagem - Psicólogo.jpg`, o screenshot anexado pelo usuário e Chrome/CDP local.
- ADR atualizado: `adrs/0065-criacao-posts-comunidade.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP autenticado em `http://localhost:3000/app/community/ansiedade-em-equilibrio/post/new`, injetando um `File` real no input de mídia e confirmando a miniatura com `blob:` local, `figure` dimensionado e legenda do arquivo no editor.

## Complemento 2026-06-21 - miniatura de midia mais limpa

- Pedido do usuario: remover a linha com o nome do video e o icone de video sobreposto na base da miniatura; em desktop, reduzir a miniatura para nao roubar espaco do texto do editor.
- Frontend: a previa local da midia na criacao de post deixou de renderizar `figcaption` com o nome do arquivo e removeu o badge/icone sobreposto na parte inferior da miniatura.
- Desktop: a miniatura passa a usar largura menor a partir de `sm`, preservando a versao mobile e reduzindo a altura consumida dentro da area branca de composicao.
- O mesmo refinamento foi aplicado a modal de edicao de post, porque ela reutiliza o padrao visual da criacao e tambem pode exibir/substituir midia.
- Escopo: sem mudanca de backend, Prisma, endpoints, payload, entitlement de midia, storage ou packages.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia visual usada foi o screenshot do usuario e a modal local existente.
- ADR atualizado: `adrs/0065-criacao-posts-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP desktop `1280x900` em `/app/community/feed/post/new`, injetando um `File` de video real no input de midia e confirmando miniatura com `video`, sem texto `YTDown_Shorts`, sem `figcaption`, sem icone `lucide-video` sobreposto e largura desktop de 112px.

## Complemento 2026-06-22 - carrossel de imagens em posts

- Pedido do usuario: permitir upload de multiplas imagens para carrossel, no padrao de navegacao visual semelhante ao Reddit.
- Backend: criado `community_post_media` com migration `20260622210218_add_community_post_media_carousel`, relacao cascade com `community_post`, ordenacao por `position` e soft delete para substituicao em edicao.
- Backend: `POST /api/private/community/:slug/posts` e `PUT /api/private/posts/:id` agora aceitam `mediaItems` com ate 10 imagens reais ja enviadas para o storage R2 publico; videos continuam como midia unica.
- Compatibilidade: `community_post.media_url`/`media_type` continuam refletindo a primeira midia ativa para telas/contratos legados, enquanto os DTOs retornam `media_items` ordenado.
- Frontend: a modal `Criar Post` aceita selecao multipla de imagens, envia todos os arquivos pelo endpoint real de upload, exibe previa com setas/dots quando houver mais de uma imagem e preserva o fluxo de video unico.
- Frontend: cards do feed, detalhe do post e publicacoes do perfil renderizam `PostMediaCarousel` quando houver multiplas imagens, com viewport 16:9, setas laterais e indicadores.
- Frontend: a modal `Editar Post` tambem permite substituir a midia por carrossel de imagens, preservando a regra de entitlement de midia para psicologos verificados/cortesia.
- Fonte visual: Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia visual complementar foi o screenshot do Reddit enviado pelo usuario, aplicado sem copiar arquitetura externa.
- Criterios deste complemento:
  - [x] Upload multiplo de imagens sem mocks e usando storage real existente.
  - [x] Limite de ate 10 imagens validado no frontend e no backend.
  - [x] Videos continuam como anexo unico, sem misturar video e carrossel.
  - [x] Carrossel exibido no feed, detalhe do post, perfil e listas que reutilizam o card de post.
  - [x] Contrato e modelo documentados em `DATA-MODEL.md`.
- ADR criado: `adrs/0149-carrossel-imagens-posts-comunidade.md`.

Validacoes finais deste complemento:

- `pnpm --dir backend db:migrate` confirmou schema em sincronia apos a migration `20260622210218_add_community_post_media_carousel`.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`

## Complemento 2026-06-30 - fallback contextual da modal de criacao

- Pedido do usuario: a modal `Criar Post` estava abrindo com fundo cinza/branco, parecendo estar sobre uma pagina vazia, quando o acesso vinha do feed ou da comunidade e a rota interceptada nao era preservada.
- Frontend: o fallback direto de `/app/community/[slug]/post/new` deixou de renderizar um `PrivateTemplate` vazio e passou a renderizar a propria tela de contexto (`CommunityRouteLogic`) atras da sheet, com o onboarding de publicacao suprimido para nao sobrepor a modal.
- Frontend: o backdrop do editor passou a ser translúcido com `backdrop-blur-[6px]`, tanto na rota interceptada quanto no fallback direto, evitando a tela cinza opaca e mantendo a sensacao de modal real.
- Escopo: sem mudancas de backend, Prisma, migrations, endpoints, payload, regras de publicacao, anonimato, midia ou packages.
- Fonte visual auditavel: `_product/proto/Criar Nova Postagem - Pacientes.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0065-criacao-posts-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e Chrome/CDP local em `http://localhost:3000/app/community/ansiedade-em-equilibrio/post/new`, com cookie/localStorage temporarios e chamadas ao backend local bloqueadas apenas no smoke visual, confirmando `dialog` `Criar Post`, fundo contextual com estado real de erro de conexao da comunidade, ausencia do prompt restrito e backdrop com `blur(6px)`.

## Complemento 2026-06-30 - dropdown de comunidade no modo escuro

- Pedido do usuario: ajustar o dropdown de selecao de comunidade na modal `Criar Post` em modo escuro, onde o painel abria claro e deixava as opcoes com baixo contraste.
- Frontend: o `SelectController` da fundacao de formularios passou a usar tokens de tema no painel customizado (`bg-surface`, `text-foreground`, `border-border` e `shadow-[var(--lectum-shadow-soft)]`) em vez de `bg-white`/sombra fixa; a area sticky da busca tambem passou para `bg-surface`.
- Escopo: sem mudancas de backend, Prisma, migrations, endpoints, payload, regras de publicacao, anonimato, midia ou packages.
- Fonte visual auditavel: `_product/proto/Criar Nova Postagem - Pacientes.jpg` e smoke local em `http://localhost:3000/app/community/feed/post/new`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0065-criacao-posts-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e Chrome/CDP mobile em modo escuro com token real de desenvolvimento, confirmando dropdown com `backgroundColor=rgb(19, 28, 46)`, texto `rgb(226, 232, 240)`, borda `rgb(39, 51, 73)` e opcoes reais de comunidade legiveis.

## Complemento 2026-06-30 - backdrop escuro da modal Criar Post

- Pedido do usuário: deixar o blur/fundo da modal `Criar Post` escuro como nas modais de dicas de uso.
- Frontend: o overlay fixo de `CreateCommunityPostLogic` passou de `bg-background/20` para um backdrop escuro com tokens (`bg-foreground/45`, `dark:bg-background/75`) e `backdrop-blur-[8px]`, preservando a sheet, o fallback contextual, a rota interceptada e o comportamento mobile-first.
- Escopo: sem mudanças de backend, Prisma, migrations, endpoints, payload, regras de publicação, anonimato, mídia ou packages.
- Fonte visual auditável: `_product/proto/Criar Nova Postagem - Pacientes.jpg` e comparação com o padrão já implementado nas dicas de uso; Builder/Quick Copy não está exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0065-criacao-posts-comunidade.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, ESLint direcionado em `src/app/app/community/[slug]/post/new/logic.tsx` e Chrome/CDP headless em `http://localhost:3000/app/community/feed/post/new`, confirmando dialog `Criar Post`, overlay com `opacity=1`, fundo escuro `bg-foreground/45` computado e `backdrop-filter: blur(8px)`.
- Observação: uma tentativa posterior de `pnpm check`/`pnpm check:frontend` no workspace sujo falhou por alterações pendentes fora deste escopo (`frontend/src/app/app/community/[slug]/logic.tsx` e `frontend/src/app/app/community/[slug]/post/[id]/logic.tsx`), não relacionadas ao ajuste do backdrop.

## Complemento 2026-07-01 - limite de 100 caracteres no título

- Pedido do usuário: limitar o título do post a 100 caracteres, sem limitar a exibição a 2 linhas no feed/listagem e sem exibir contador no formulário.
- Backend: validadores reais de `POST /api/private/community/:slug/posts` e `PUT /api/private/posts/:id` passaram de `max: 140` para `max: 100` no campo `title`.
- Frontend: os schemas Zod de criação e edição usam o mesmo limite de 100 caracteres; o controller compartilhado de textarea passou a respeitar `max` como `maxLength`, sem contador visual.
- Contrato de produto atualizado em `DATA-MODEL.md`: `community_post.title` mantém obrigatoriedade e passa a registrar limite de produto/API de 100 caracteres.
- Escopo deliberadamente excluído conforme orientação do usuário: nenhum clamp de duas linhas no feed/listagem e nenhum contador `x/100` nos formulários.
- Fonte visual auditável: a decisão nasceu de validação visual sobre o card/feed existente; não houve nova tela nem necessidade de Builder/Quick Copy. O inventário ativo segue `_product/proto/Feed Comunidade.jpg` e `_product/proto/Criar Nova Postagem - Pacientes.jpg`/`Criar Nova Postagem - Psicólogo.jpg` para contexto.
- ADR atualizado: `adrs/0065-criacao-posts-comunidade.md`.
- Validações executadas: `git diff --check`, `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir backend build`, `pnpm --dir frontend build` e `pnpm check`.
