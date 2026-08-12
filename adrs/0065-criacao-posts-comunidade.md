# ADR-0065: Criação real de posts da comunidade

## Status

Accepted

## Task relacionada

TASK-24

## Contexto

A TASK-24 substitui o destino preparado de criação de post por um fluxo real para pacientes e psicólogos. As referências visuais ativas são os PDFs anexados pelo usuário e as imagens locais listadas em `_product/tasks/PROTO-INVENTORY.md`: `Criar Nova Postagem - Pacientes.jpg`, `Criar Nova Postagem - Psicólogo.jpg` e `Confirmação de Postagem.jpg`.

O `DATA-MODEL.md` já prevê `community_post` com `author_id`, `community_id`, `title`, `content`, `anonymous` e `status`. A tarefa não exige novo schema para mídia. Anexos dependem de Cloudflare R2/S3-compatible conforme ADR-0006/TASK-03; sem credenciais e bucket no ambiente, o fluxo deve publicar texto sem upload e registrar a pendência.

## Decisão

- Criar o endpoint privado `POST /api/private/community/:slug/posts`, mantendo validação no validator local e persistência via Prisma no módulo `backend/src/modules/api/private/community`.
- Reutilizar o modelo existente `community_post`, sem nova migration, e gravar `status = "publicado"` no momento da criação.
- Adotar moderação reativa: posts publicados podem ser removidos depois com `status = "removido"`; `status = "pendente"` fica reservado para uma futura decisão de pré-moderação/IA.
- Validar a comunidade pelo `slug` da rota e derivar o tipo de autor de `req.auth.role`; não criar coluna nova para perfil do autor.
- Permitir criação apenas para `role = "paciente"` ou `role = "psicologo"`.
- Permitir `anonymous` somente para pacientes; posts criados por psicólogos são sempre identificados, mesmo que o cliente envie `anonymous=true`.
- Retornar o `CommunityPost` recém-criado no mesmo formato usado pelo feed, permitindo invalidar o cache e navegar para a tela de sucesso.
- Implementar as rotas canônicas `/app/community/[slug]/post/new` e `/app/community/[slug]/post/success` no frontend.
- Manter `/app/community/post/new` como compatibilidade, redirecionando para o fluxo global `/app/community/feed/post/new` usado pelo CTA central do feed.
- Usar React Hook Form, Zod, `frontend/src/hooks/form` e controllers existentes para comunidade, título e texto; o toggle anônimo usa `Controller` do React Hook Form para respeitar a base de formulário e reproduzir o layout do protótipo.
- Diferenciar a UI por perfil: pacientes veem a opção “Postar como anônimo”; psicólogos veem a seção visual de mídia, desabilitada como pendência de R2.
- No seletor de comunidade, manter as opções ordenadas alfabeticamente por nome em `pt-BR`, usar ícone de grupo alinhado ao texto e abrir busca interna com placeholder `Buscar comunidade`; quando o filtro não encontrar resultados, exibir `Nenhuma comunidade encontrada`.
- Refinar a hierarquia mobile-first do formulário para `Comunidade → título → conteúdo → anonimato → postar`, mantendo o switch anônimo apenas para pacientes e abaixo dos campos principais para não competir com título e conteúdo.
- Aumentar o textarea de conteúdo para uma entrada inicial de 7 linhas, com placeholder orientativo longo e crescimento automático via extensão do controller `textarea`, sem criar componente paralelo.
- Fortalecer o CTA `Postar` com azul Lectum, altura ligeiramente maior e estado desabilitado visualmente claro enquanto comunidade, título e conteúdo obrigatórios não estiverem preenchidos.
- Manter o switch `Postar como anônimo` desligado por padrão, em container mais leve e discreto, e exibir a dica `💡 Publicar com seu nome ajuda a tornar as conversas mais pessoais e acolhedoras.` somente quando o paciente ativar o anonimato, em tom cinza e sem alerta punitivo.
- Remover qualquer duplicação visual da comunidade selecionada no formulário: a comunidade aparece apenas no seletor; o ícone do seletor recebe largura/padding reservados para não colidir com o texto.
- Pré-selecionar a comunidade quando a criação é iniciada de `/app/community/[slug]/post/new` ou por `?community=slug`, desde que o slug exista nas opções reais retornadas pela API; CTAs do feed com recorte de comunidade passam a apontar para a rota contextual.
- Ao retornar posts anônimos de pacientes para o feed, usar `Membro Anônimo #1234` com sufixo determinístico por `community_post.id`, evitando que todos os anônimos pareçam o mesmo autor sem criar perfil público.

## Consequências

- O feed passa a receber posts reais, sem mock ou endpoint simulado.
- O fluxo global exige seleção explícita de comunidade quando acessado por `/app/community/feed/post/new` sem contexto; quando acessado por `/app/community/[slug]/post/new` ou com `?community=slug`, a comunidade é pré-selecionada após validação contra as opções reais.
- A publicação já aparece para o feed imediatamente porque a moderação é reativa.
- A UI de mídia para psicólogos fica preparada visualmente, mas não envia arquivos até existir storage R2 configurado e schema/endpoint de anexos aprovado.
- A rota antiga do CTA central não quebra navegações existentes, mas o destino canônico passa a ser a rota com slug.
- A criação de post fica mais focada para pacientes: título e conteúdo ocupam a hierarquia principal, enquanto a decisão de anonimato vira configuração secundária e discreta.
- O anonimato continua seguro para o paciente, mas cada card anônimo ganha diferenciação visual estável pelo sufixo do post.

## Validação

- `pnpm --dir backend check`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir backend build`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- Refinamento do seletor de comunidade: `pnpm --dir frontend check` e `pnpm --dir frontend build`: sucesso.
- Refinamento de hierarquia/UX do Criar Post: `pnpm --dir frontend check` e `pnpm --dir frontend build`: sucesso.
- Ajuste complementar do formulário de criação contextual, placeholder longo, seletor de comunidade e anonimato discreto: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`: sucesso.
- Refinamento do switch anônimo: `pnpm --dir frontend check` e `pnpm --dir frontend build`: sucesso.
- Refinamento de anonimato numerado e nova dica do switch: `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir backend build`, `pnpm --dir frontend build` e `pnpm check`: sucesso.
- Validação HTTP local das rotas Next:
  - `GET http://localhost:3000/app/community/feed/post/new`: sucesso (`200`), incluindo os refinamentos do seletor, da hierarquia/UX do formulário, da nova dica e do switch anônimo.
  - `GET http://localhost:3000/app/community/ansiedade-em-equilibrio/post/new`: sucesso (`200`).
  - `GET http://localhost:3000/app/community/ansiedade-em-equilibrio/post/success`: sucesso (`200`).
- Validação HTTP local complementar com cookie de sessão de desenvolvimento:
  - `GET http://localhost:3000/app/community/feed/post/new`: sucesso (`200`).
  - `GET http://localhost:3000/app/community/ansiedade-em-equilibrio/post/new`: sucesso (`200`).
  - `GET http://localhost:3000/app/community/feed?community=ansiedade-em-equilibrio`: sucesso (`200`).
- `pnpm check`: sucesso.
- Validação HTTP local do endpoint: `POST /api/private/community/:slug/posts` sem autenticação retornou `401`, confirmando rota privada registrada.

## Pendências

- Implementar upload real de imagens/vídeos quando houver credenciais/bucket R2 e schema de anexos aprovado.
- Criar detalhe real de comunidade e detalhe real do post nas tasks posteriores.
- Adicionar pré-moderação/IA somente após nova ADR aprovar a regra de negócio e infraestrutura.

## Atualizacao 2026-06-17 - ajuste de line-height do seletor de comunidade

- O seletor de comunidade da tela `Criar Post` permanece usando o `SelectController` compartilhado, mas o caso visual desta tela passa a sobrescrever apenas escala vertical e line-height do pill.
- A decisao preserva a largura do seletor, a busca interna e a ordenacao real das comunidades, ajustando `h-11`, `line-height: 1.35`, `overflow-visible` e centralizacao do icone para evitar corte de letras descendentes em nomes como `Ansiedade em equilibrio`.
- A mudanca e estritamente visual e nao altera contratos de API, payload de criacao, validacao de formulario, regras de anonimato, storage de midia, backend, Prisma ou packages.

Validacao complementar:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP mobile em `http://localhost:3000/app/community/ansiedade-em-equilibrio/post/new`, validando `overflow: visible`, label dentro do botao, respiro vertical para descendentes e alinhamento central de icone/seta.

## Atualização 2026-06-19 - editor em sheet para criação espontânea

A tela de criação de posts deixou de tratar a experiência como formulário de página inteira e passou a operar como um editor leve em sheet/modal, preservando o contrato real de criação de `community_post`.

Decisões complementares:

- Manter a rota canônica `/app/community/[slug]/post/new`, mas renderizá-la visualmente como sheet mobile-first com transição vertical de entrada/saída. Isso evita criar uma arquitetura paralela de modal route/intercepting route neste momento e preserva compatibilidade com CTAs existentes.
- Continuar usando a fundação da TASK-02 (`useFormList`, React Hook Form, Zod e controllers) para comunidade, título e conteúdo, porém com estilos borderless e integrados ao editor para reduzir a aparência de formulário.
- Manter título obrigatório por organização do feed, busca futura e qualidade das respostas, com placeholder orientado a pergunta/assunto.
- Transformar a regra fixa de convivência em popover no ícone de informação, removendo o card fixo do rodapé para reduzir peso visual.
- Fixar a barra inferior dentro da sheet: pacientes recebem texto permanente de anonimato + switch + `Postar`; psicólogos recebem botão compacto de mídia + `Postar`. A seção grande de mídia foi removida.
- Não implementar upload simulado. Enquanto storage/schema de anexos de posts não estiverem aprovados e configurados, o botão de mídia apenas informa a dependência real.
- Para reduzir perda de teclado em mobile, a UI tenta manter foco no último campo editável em toques sobre áreas vazias e em botões auxiliares. O fechamento explícito da sheet continua encerrando a edição.
- Builder/Quick Copy não estava disponível como ferramenta nesta execução; a decisão visual foi baseada nos protótipos locais da TASK-24 e nos screenshots anexados pelo usuário.

Consequências:

- A criação de posts fica mais próxima de um editor social leve sem alterar backend, payload, schema, anonimato ou permissões.
- A validação continua client-side por Zod e server-side pelo endpoint real; o botão pode parecer inativo quando título/conteúdo/comunidade ainda não estão prontos, mas continua permitindo submit para exibir feedback de campos obrigatórios.
- Uma implementação futura com modal routes/intercepting routes pode preservar a tela anterior real atrás da sheet; por ora a compatibilidade de rota foi priorizada.

Validação complementar:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome headless local em `http://localhost:3000/app/community/feed/post/new` confirmou carregamento da rota no servidor dev existente; captura autenticada da sheet ficou limitada pela sessão local disponível não aceitar token gerado fora do servidor em execução.

## Atualizacao 2026-06-19 - ajustes finos de hierarquia e validacao do editor

O editor em sheet de `Criar Post` foi refinado sem alterar contrato de API, payload de criacao, schema, anonimato ou permissoes de midia.

Decisoes complementares:

- O switch de paciente mantem a regra de anonimato, mas passa a usar a copy curta `Publicar anonimamente?` para reduzir ruido na barra fixa.
- A dica de anonimato continua vinculada ao switch ligado, porem pode ser dispensada por um `X` interno que fecha somente a tip. Essa dispensa e estado local de UI e nao altera o valor enviado no formulario.
- A tip recebeu icone de lampada e texto acolhedor para sugerir primeiro nome/apelido no perfil como alternativa de privacidade, sem desencorajar anonimato quando necessario.
- A hierarquia tipografica do campo de titulo foi alinhada ao padrao visual dos titulos dos posts no feed: texto digitado maior, escuro e `font-black`; placeholder separado por cor mais clara e peso menor para nao parecer conteudo ja preenchido.
- O conteudo mantem tipografia de corpo, com placeholder ainda mais discreto, preservando o modelo de editor livre em vez de voltar ao formulario tradicional.
- O backdrop do sheet usa menor opacidade para evitar a aparencia de tela desligada no desktop; a rota segue renderizando como sheet por compatibilidade, sem introduzir modal route/intercepting route.
- Os erros de validacao sao tratados como estados transitorios: ao corrigir comunidade, titulo ou conteudo, o erro especifico e o alerta geral derivado deixam de ser exibidos imediatamente.
- O erro do seletor de comunidade e posicionado em slot reservado abaixo do pill para nao alterar largura, padding nem alinhamento interno do dropdown.

Consequencias:

- A percepcao de estrutura do post melhora sem mudar as regras obrigatorias de titulo e conteudo.
- A validacao fica menos pegajosa apos tentativa invalida, evitando mensagens antigas quando o usuario ja corrigiu o campo.
- O fechamento da tip de anonimato passa a ser independente do switch, preservando controle e previsibilidade para pacientes.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Chrome headless local em `http://localhost:3000/app/community/feed/post/new`, com sessao real recente de paciente, validou: erro de comunidade removido apos selecao, sem alerta geral ativo apos correcao, titulo digitado em 24.32px/900, copy `Publicar anonimamente?`, tip com texto atualizado e fechamento por `X` mantendo `aria-checked=true` no switch.

## Atualizacao 2026-06-19 - placeholder responsivo, scroll interno e backdrop leve

O editor em sheet de `Criar Post` recebeu novo refinamento visual e de comportamento sem alterar API, schema, payload, anonimato ou regras de publicacao.

Decisoes complementares:

- O texto visivel e acessivel do switch de paciente passa a ser `Publicar anonimamente`, removendo o ponto de interrogacao para soar como opcao direta.
- O titulo deixa de usar input de linha unica e passa a usar o controller de textarea da fundacao de formularios, permitindo que o placeholder quebre linha quando necessario sem truncar nem espremer a copy.
- O placeholder do titulo mantem hierarquia acima do corpo, mas com cor, peso e tamanho mais leves do que o texto real digitado.
- A area principal da sheet usa layout flex sem scroll externo inicial; a rolagem fica no textarea de conteudo via `overflow-y: auto`, aparecendo apenas quando o texto ultrapassa a altura disponivel.
- O backdrop foi reduzido para opacidade quase transparente, especialmente no desktop, para manter o efeito de modal moderna sem transformar o fundo em uma tela cinza desligada.

Consequencias:

- O editor preserva o comportamento mobile-first e a sensacao de composicao livre, mas o placeholder do titulo passa a caber melhor em telas estreitas.
- A barra de rolagem deixa de aparecer em estado vazio por excesso de altura estatica e continua disponivel quando o usuario escreve conteudos longos.
- O desktop fica visualmente menos pesado sem trocar a arquitetura de rota ou introduzir route interception.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Chrome headless local em `http://localhost:3000/app/community/feed/post/new`, com sessao real recente de paciente, validou: titulo renderizado como `TEXTAREA`, placeholder claro e responsivo, texto real do titulo em 24.32px/900, switch sem interrogacao, `content` com `overflow-y: auto`, area externa sem scroll inicial (`scrollHeight == clientHeight`) e backdrop em opacidade baixa.

## Atualizacao 2026-06-19 - modal route interceptada para Criar Post

A experiencia de criacao de post passou de uma sheet em rota dedicada para uma modal route interceptada quando aberta a partir do feed ou do detalhe de comunidade.

Decisoes complementares:

- Adicionar um `layout.tsx` em `/app/community/[slug]` com slot paralelo `@modal`, mantendo `children` para a tela de origem e `modal` para sobreposicoes contextuais.
- Criar `@modal/(.)post/new/page.tsx` para interceptar a navegacao client-side para `/app/community/[slug]/post/new` e renderizar `CreateCommunityPostLogic` em modo `asModalSlot`.
- Manter `/app/community/[slug]/post/new/page.tsx` como fallback direto, para reload, compartilhamento de URL e acessos sem estado anterior de navegacao.
- Separar comportamento visual por contexto: no slot interceptado, o overlay e transparente com blur; no acesso direto, a pagina continua usando fundo de aplicacao porque nao ha conteudo anterior confiavel para desfocar.
- Ajustar os CTAs do feed filtrado para permanecerem sob `/app/community/feed/post/new?community=slug`, evitando trocar o `children` de fundo para uma rota de detalhe e preservando a pre-selecao da comunidade por query string.
- Bloquear o scroll do documento e permitir fechamento por `Esc` enquanto a modal esta aberta, alem do fechamento explicito pelo `X`.

Consequencias:

- Em navegacao interna, o feed/detalhe permanece como contexto visual atras da criacao de post, resolvendo a limitacao anterior em que uma rota de pagina inteira nao tinha conteudo real para desfocar.
- URLs diretas continuam funcionais e semanticamente canonicas, mas nao prometem blur sobre feed porque nao carregam uma origem anterior.
- A mudanca fica restrita ao frontend e a roteamento Next, sem alterar API, payload, schema, regras de anonimato ou packages.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- Chrome headless local em `http://127.0.0.1:3010/app/community/feed`: sucesso ao clicar no CTA de criar post com cookie de smoke local, navegando para `/app/community/feed/post/new`, renderizando o dialog `Criar Post` pelo slot interceptado e expondo overlay com `backdrop-filter: blur(6px)` e fundo translucido.
- `pnpm check`: sucesso.

## Atualização 2026-06-19 - preservação de contexto e erros inline no editor

O editor interceptado de `Criar Post` foi ajustado para reforçar que a criação é uma sobreposição contextual, não uma troca visual de página.

Decisões complementares:

- Todos os CTAs de criação vindos do feed e do detalhe de comunidade usam navegação client-side com `scroll={false}`. O objetivo é preservar posição, rota de fundo e contexto visual enquanto o slot `@modal` renderiza o editor.
- O `PrivateTemplate` passa a aceitar a opção `scroll` no `bottomNavigationCenterAction`, evitando que o botão central mobile do feed tenha comportamento diferente do FAB desktop.
- O fallback de fechamento da modal preserva a query `?community=slug` quando a criação nasceu do feed filtrado, para não devolver o usuário a outro contexto se o histórico de navegação não estiver disponível.
- Título e conteúdo ficam em um bloco visual contínuo, com o gap entre campos removido e o slot de erro do título reduzido. A decisão mantém a fundação de formulários da TASK-02 e apenas ajusta classes específicas do editor.
- O card geral `Não foi possível postar` foi removido do editor. Erros conhecidos vindos da API são direcionados aos campos reais (`community_slug`, `title`, `content`); falhas inesperadas continuam usando toast, sem reintroduzir uma faixa vermelha global.

Consequências:

- O fundo do feed ou da comunidade permanece como referência visual ao abrir a modal por navegação interna, inclusive em CTAs mobile.
- A validação fica mais localizada: a correção de cada campo remove seu erro inline sem depender de um alerta geral obsoleto.
- O fluxo continua sem mudança de backend, payload, schema, anonimato, mídia ou packages.

Validação complementar:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Chrome headless local em `http://127.0.0.1:3011/app/community/feed`: sucesso ao abrir o CTA de criação para `/app/community/feed/post/new`, renderizar o dialog `Criar Post`, manter o fundo do feed em estado real de erro de conexão quando a API local `localhost:3001` não estava ativa, confirmar distância reduzida entre título e conteúdo e ausência do card `Não foi possível postar`; erros inline de título/conteúdo permaneceram visíveis após submit inválido.

## Atualização 2026-06-19 - sidebar desktop não reage à modal contextual

O refinamento posterior do editor interceptado tratou duas regressões visuais observadas em desktop: espaçamento ainda excessivo entre título e corpo e recolhimento indevido da sidebar ao abrir a modal pelo feed.

Decisões complementares:

- O `PrivateTemplate` passa a derivar um `navigationContextPathname` para rotas de criação em `/app/community/[slug]/post/new`. Quando o slug é `feed`, o shell usa `/app/community/feed` para calcular item ativo, default de colapso e chave de persistência da sidebar.
- A rota visual continua sendo `/app/community/feed/post/new`, e a modal continua no slot interceptado; a mudança é limitada ao estado do shell para que a sobreposição não altere o menu lateral.
- Para slugs de comunidade, o contexto de navegação vira `/app/community/[slug]`, preservando o comportamento contextual sem marcar a criação como rota primária nova.
- O campo de título mantém React Hook Form/Zod/controller da TASK-02, mas reduz `rows`, altura mínima e padding; o conteúdo remove padding superior extra para que título e corpo pareçam partes do mesmo post.

Consequências:

- Abrir ou fechar a modal de `Criar Post` no feed desktop não muda a largura do menu lateral nem a preferência salva do usuário.
- O editor fica mais compacto e premium sem trocar componente, sem criar formulário paralelo e sem alterar validações, payload, backend, schema ou packages.

Validação complementar:

- `pnpm --dir frontend biome:fix`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Chrome headless local no `next start` em `http://localhost:3011/app/community/feed`: sucesso ao abrir o CTA de criação para `/app/community/feed/post/new`; a sidebar permaneceu com 240px antes/depois, o dialog `Criar Post` abriu no slot modal, o título mediu 36px de altura, o gap até o conteúdo ficou em 12px e o card `Não foi possível postar` não apareceu.

## Atualizacao 2026-06-21 - storage real para midia de posts raiz

O bloqueio anterior de midia na criacao de post foi encerrado para o ambiente atual: o storage R2 real esta configurado e o schema de `community_post` agora persiste `media_url` e `media_type`.

Decisoes complementares:

- Adicionar migration `20260621185539_add_community_post_media` com os campos opcionais `community_post.media_url` e `community_post.media_type`.
- Criar `POST /api/private/community/:slug/posts/media` como etapa de upload anterior a criacao do post, usando `multer`, R2 publico e prefixo `posts/media/`.
- Fazer `POST /api/private/community/:slug/posts` aceitar somente URLs publicas geradas pelo proprio fluxo (`/public/files/posts/media/`) e `mediaType` normalizado para `image` ou `video`.
- Reutilizar o entitlement profissional real de midia: psicologo com plano profissional ativo e CFP verificado ou cortesia administrativa ativa pode anexar; pacientes e psicologos sem direito sao bloqueados no backend.
- Manter upload e criacao em duas etapas. Se a criacao falhar depois do upload, pode existir objeto publico orfao ate uma rotina futura de limpeza; isso evita criar transacao falsa com storage externo.
- Publicar arquivos de `posts/media/` pela rota publica de arquivos ja existente.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta execucao; a validacao visual usou os prototipos locais e screenshots do usuario.

Consequencias:

- O feed, detalhe de post e perfil do psicologo passam a receber `media_url`/`media_type` reais de posts raiz.
- A pendencia historica de storage para a modal `Criar Post` fica substituida por contrato real de upload.
- O mesmo helper de entitlement evita divergencia entre midia de post raiz e midia de respostas.

Validacao complementar:

- `pnpm --dir backend db:migrate -- --name add_community_post_media`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke real do endpoint `POST /api/private/community/ansiedade-em-equilibrio/posts/media` com token temporario para `<CONTA_DE_TESTE_AUTORIZADA>`, upload em R2 no prefixo `posts/media/` e remocao do objeto ao final.
- Chrome/CDP autenticado em `/app/community/ansiedade-em-equilibrio/post/new` validou botao `Midia` habilitado, input aceitando `video/mp4` e ausencia da copy antiga de R2 pendente.

## Atualização 2026-06-21 - miniatura local de mídia no editor

A criação de post passa a mostrar uma prévia visual da mídia selecionada dentro da própria área de composição, antes do envio definitivo para o R2.

Decisões complementares:

- Manter o upload real em duas etapas: seleção local no editor, upload R2 somente no submit e persistência de `media_url`/`media_type` depois do retorno do endpoint real.
- Guardar a mídia selecionada como `File` + `previewUrl` local (`URL.createObjectURL`) + tipo normalizado, revogando a URL ao remover, substituir ou desmontar a modal para evitar vazamento de objeto local.
- Renderizar a miniatura no espaço em branco logo após o texto do post, aproximando a experiência de composição visual pedida pelo produto.
- Usar `next/image` para previews de imagem com `blob:` local e `unoptimized`; usar `<video>` apenas para miniatura de vídeo local, mantendo a proibição de `<img>` cru.
- Não alterar backend, schema, payload, entitlement, validação de storage, endpoint de upload ou packages.

Consequências:

- O usuário recebe confirmação visual imediata de que a mídia foi selecionada, sem precisar publicar o post primeiro.
- A remoção/substituição continua local até o submit, preservando o rascunho e evitando uploads desnecessários.
- A lógica de persistência e autorização permanece concentrada nos contratos reais já existentes.

Validação complementar:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Chrome/CDP autenticado em `http://localhost:3000/app/community/ansiedade-em-equilibrio/post/new`: sucesso ao injetar `preview-validacao.png` no input de mídia e confirmar preview com `blob:` local, figura dimensionada dentro do editor e legenda do arquivo visível.

## Atualizacao 2026-06-21 - miniatura de midia sem legenda e menor no desktop

O refinamento visual posterior da previa local de midia remove ruidos que competiam com o conteudo do post.

Decisoes complementares:

- Nao exibir o nome do arquivo selecionado dentro do card de miniatura.
- Nao sobrepor o icone de video no canto inferior da miniatura; o tipo de acao ja e comunicado pelo botao de midia do rodape e pelo proprio preview.
- Reduzir a largura da miniatura em breakpoints desktop (`sm`) para preservar area de leitura/escrita do texto acima, mantendo o comportamento mobile-first.
- Aplicar a mesma regra a edicao de post, pois ela usa a mesma superficie visual da criacao.

Consequencias:

- A confirmacao visual de midia permanece imediata, mas com menos poluicao visual.
- O editor desktop conserva mais espaco util para titulo e conteudo, sem alterar upload, persistencia, storage ou autorizacao.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Chrome/CDP desktop `1280x900` em `/app/community/feed/post/new`: sucesso ao injetar `YTDown_Shorts_NA_validacao.mp4` no input de midia e confirmar preview com `<video>`, sem nome do arquivo, sem `figcaption`, sem icone de video sobreposto e miniatura com largura de 112px.

## Atualizacao 2026-06-30 - fallback contextual quando a rota interceptada nao preserva a origem

Foi identificada uma regressao na experiencia de criacao: quando a navegacao para
`/app/community/[slug]/post/new` nao passava pelo slot interceptado do App Router, a pagina
canonica renderizava apenas a sheet dentro de um `PrivateTemplate` vazio. Visualmente, a modal
parecia abrir sobre uma tela branca/cinza, em vez de sobre o feed ou a comunidade de origem.

Decisoes complementares:

- Manter a rota canonica direta como fallback obrigatorio, mas renderizar por baixo dela o mesmo
  `CommunityRouteLogic` usado no feed/detalhe de comunidade. Assim, acesso direto, reload ou
  navegacoes que nao ativem a parallel route continuam exibindo contexto real atras da sheet.
- Adicionar a flag `suppressPublishOnboarding` ao `CommunityRouteLogic`, `CommunityFeedLogic` e ao
  detalhe de comunidade para que o onboarding/coachmark de publicacao nao apareca acima da modal
  enquanto a tela e usada apenas como plano de fundo contextual.
- Usar o mesmo backdrop translucido com `backdrop-blur-[6px]` no slot interceptado e no fallback
  direto. A modalidade permanece visivel, mas sem substituir o plano de fundo por uma pagina vazia.
- Nao alterar contratos, endpoints, queries, payload, regras de anonimato, midia, storage, Prisma ou
  packages.

Consequencias:

- Feed e comunidade continuam sendo o contexto visual da criacao mesmo quando o App Router nao
  preserva a interceptacao client-side.
- O fallback direto fica mais pesado do que uma pagina branca porque tambem monta a tela de contexto,
  mas isso e aceitavel para preservar orientacao e compatibilidade de reload/deep link.
- O onboarding de publicacao continua existindo nas telas normais; ele e suprimido apenas no uso
  dessa tela como fundo da modal.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- Chrome/CDP local em `http://localhost:3000/app/community/ansiedade-em-equilibrio/post/new`:
  sucesso ao confirmar dialog `Criar Post`, fundo contextual da comunidade em estado real de erro de
  conexao quando `localhost:3001` foi bloqueado no smoke visual, ausencia do prompt restrito e
  backdrop computado com `blur(6px)`.

## Atualizacao 2026-06-30 - dropdown de comunidade em modo escuro

A validacao visual da modal `Criar Post` em tema escuro mostrou que o painel customizado do seletor de comunidade ainda usava `bg-white` e sombra fixa. Como o texto ja seguia `text-foreground`, as opcoes ficavam quase invisiveis quando o documento estava com a classe `.dark`.

Decisoes complementares:

- Centralizar a superficie do dropdown customizado do `SelectController` em uma classe interna reutilizada pelos modos `searchMode="dropdown"`, `searchable` e `useCustomSelect`.
- Trocar `bg-white` por `bg-surface`, adicionar `text-foreground` no painel e usar `shadow-[var(--lectum-shadow-soft)]`, preservando `border-border` e os estados existentes de hover/selecionado.
- Trocar a faixa sticky da busca de `bg-white` para `bg-surface`, evitando recorte claro no topo do painel quando a lista rola.
- Nao criar componente paralelo para a tela de post; o ajuste fica na fundacao de selects para corrigir tambem outros dropdowns customizados no tema escuro.

Consequencias:

- O dropdown de comunidade passa a herdar os tokens claro/escuro e mantem contraste consistente com a sheet mobile-first.
- Outros selects customizados que usam o mesmo controller tambem deixam de abrir com fundo branco no modo escuro.
- O escopo permanece visual/frontend; nao ha alteracao de API, schema, regra de dominio, anonimato, midia, storage ou packages.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- Chrome/CDP mobile em `http://localhost:3000/app/community/feed/post/new`, modo escuro e token real de desenvolvimento: sucesso ao abrir o dropdown e confirmar painel `rgb(19, 28, 46)`, texto `rgb(226, 232, 240)`, borda `rgb(39, 51, 73)` e opcoes reais legiveis.

## Atualizacao 2026-06-30 - backdrop escuro da modal Criar Post

O overlay da modal `Criar Post` foi ajustado para seguir a leitura visual escura das dicas de uso/onboarding, evitando que o fundo pareça claro ou apagado quando a sheet está aberta sobre o feed ou comunidade.

Decisoes complementares:

- Substituir o backdrop claro (`bg-background/20` com fallback claro) por `bg-foreground/45` no tema claro e `dark:bg-background/75` no tema escuro, mantendo tokens de tema em vez de introduzir cor fixa nova.
- Aumentar o blur do overlay para `backdrop-blur-[8px]`, alinhando a modal de criação aos overlays escuros usados em dicas/prompts e preservando a hierarquia do dialog.
- Manter a mesma implementação para rota interceptada e fallback direto, sem mudar roteamento, API, payload, schema, anonimato, mídia, storage, Prisma ou packages.

Consequencias:

- O feed/comunidade de fundo permanece reconhecível, mas agora com obscurecimento suficiente para a modal se destacar como estado modal real.
- O comportamento mobile-first da sheet, o foco do editor, o fechamento por `X`/`Esc` e o bloqueio de scroll permanecem inalterados.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso antes das alterações pendentes externas aparecerem no workspace.
- `pnpm --dir frontend build`: sucesso.
- `pnpm --dir frontend exec eslint "src/app/app/community/[slug]/post/new/logic.tsx"`: sucesso.
- Chrome/CDP headless em `http://localhost:3000/app/community/feed/post/new`: sucesso ao confirmar dialog `Criar Post`, `opacity=1`, classe de overlay com `bg-foreground/45 backdrop-blur-[8px] dark:bg-background/75`, cor de fundo escura computada e `backdrop-filter: blur(8px)`.
- `pnpm check` e nova rodada de `pnpm check:frontend` ficaram bloqueados por mudanças pendentes fora deste escopo em arquivos já modificados do workspace, especialmente lint `react-hooks/set-state-in-effect` em `frontend/src/app/app/community/[slug]/logic.tsx` e avisos de imports não usados em `frontend/src/app/app/community/[slug]/post/[id]/logic.tsx`.

## Atualização 2026-07-01 - limite de título de post em 100 caracteres

O título de `community_post` foi reduzido de 140 para 100 caracteres por decisão de produto, mantendo o feed sem clamp obrigatório de duas linhas e os formulários sem contador visual.

Decisões complementares:

- Aplicar `max: 100` nos validadores backend de criação (`POST /api/private/community/:slug/posts`) e edição (`PUT /api/private/posts/:id`) para que integrações diretas não persistam títulos longos.
- Alinhar os schemas Zod de criação e edição no frontend ao mesmo limite de 100 caracteres.
- Fazer o `TextareaController` respeitar a propriedade `max` como `maxLength`, sem exibir contador, para limitar a digitação nos títulos que usam textarea pela fundação da TASK-02.
- Atualizar `DATA-MODEL.md` para registrar que `community_post.title` é obrigatório e tem limite de produto/API de 100 caracteres.
- Não alterar a renderização do feed/listagens: títulos continuam fluindo naturalmente, sem `line-clamp` de duas linhas.

Consequências:

- O backend passa a ser a fronteira canônica do limite de título para criação e edição de posts.
- A experiência de escrita fica mais curta e previsível sem adicionar ruído de contador no editor.
- Posts existentes com títulos maiores permanecem dados legados exibíveis; a nova regra atua nas próximas criações/edições.

Validação complementar 2026-07-01:

- `git diff --check`: sucesso.
- `pnpm --dir backend check`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir backend build`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.

## Atualização 2026-08-10 - modal imediata na rota canônica PT-BR

A rota canônica privada de criação de post passou a ser PT-BR
(`/app/comunidades/[slug]/publicacao/nova`), mas a experiência modal imediata dependia de o
segmento `[slug]` renderizar o slot paralelo `@modal`. A pasta PT-BR já possuía a rota interceptada,
porém não possuía `layout.tsx` local com a prop `modal`; na prática, a navegação podia cair primeiro
na página direta/fallback e exibir um carregamento de contexto antes da sheet.

Decisões complementares:

- Adicionar `frontend/src/app/app/comunidades/[slug]/layout.tsx` espelhando o layout do segmento
  legado em inglês, apenas renderizando `{children}` e `{modal}`. Assim, a URL PT-BR ativa a
  interceptação do App Router sem desmontar o feed/comunidade de origem.
- Manter a rota direta/fallback para deep link, reload e compatibilidade, mas iniciar a sheet de
  `Criar Post` já aberta para evitar o primeiro frame invisível/fora da tela quando o fallback for
  necessário.
- Não alterar contratos, API, payload, schema, regras de anonimato, permissões de mídia, storage,
  envs ou packages.

Consequências:

- Cliques originados do feed ou do detalhe de comunidade passam a abrir a modal imediatamente sobre o
  contexto existente na URL PT-BR canônica.
- O fallback contextual continua existindo para acesso direto, mas deixa de causar uma percepção de
  "tela antes da modal".
- A animação de fechamento, o bloqueio de scroll, o fechamento por `X`/`Esc` e o foco no editor
  permanecem preservados.

Validação complementar 2026-08-10:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso; o mapa de rotas confirmou
  `/app/comunidades/[slug]/(.)publicacao/nova`.
- `git diff --check` nos arquivos do ajuste: sucesso.
- Chrome/CDP mobile em `http://localhost:3011/app/comunidades/feed/publicacao/nova`, com cookie de
  sessão local apenas para atravessar o proxy privado: sucesso ao confirmar `dialog` `Criar Post`,
  overlay com `opacity=1` e sheet sem `translate-y-full` inicial (`transform: none`).

## Atualização 2026-08-10 - abertura local no PWA sem loading global

A validação em PWA mostrou que, mesmo com a rota interceptada PT-BR disponível, o clique de criação de
post ainda podia exibir o `loading.tsx` global (`Carregando página`) enquanto o App Router carregava a
rota. Em standalone/PWA, essa tela ocupa toda a experiência e quebra a percepção de modal contextual.

Decisões complementares:

- Para cliques autenticados no feed e no detalhe de comunidade, impedir a navegação do `Link` e montar
  `CreateCommunityPostLogic` localmente no mesmo React tree da tela de origem. A rota canônica
  `/app/comunidades/[slug]/publicacao/nova` permanece como fallback para acesso direto, reload e
  deep link, mas deixa de ser necessária no clique primário do PWA.
- Estender a lógica da modal com `onCloseComplete`: no modo local, o fechamento anima a sheet para
  baixo e depois apenas desmonta o componente; no modo de rota direta/interceptada, continua usando o
  fallback de navegação já existente.
- Restaurar a animação de subida (`up`) iniciando `isSheetOpen=false` e abrindo por
  `requestAnimationFrame` duplo. Isso força uma pintura inicial com `translate-y-full` antes de
  transicionar para `translate-y-0`, evitando que a correção de loading transforme a abertura em um
  aparecimento seco.
- Mover a composição de fallback visual das rotas diretas para os `page.tsx` canônicos, mantendo
  `CreateCommunityPostLogic` sem import estático para as views de comunidade e preservando o grafo sem
  ciclos.
- Não alterar API, payload, schema, autorização, storage, anonimato, mídia, envs ou packages.

Consequências:

- O PWA não deve mais mostrar `Carregando página` ao tocar no botão `+` para criar post a partir do
  feed/comunidade já carregados.
- A URL visível permanece na tela de origem durante a composição local; esse é o trade-off aceito para
  priorizar a experiência app-like. Deep links e reloads da rota de criação continuam suportados pelo
  fallback existente.
- A modalidade visual, bloqueio de scroll, `Esc`, foco do editor e publicação real permanecem
  centralizados na mesma lógica compartilhada.

Validação complementar 2026-08-10:

- `pnpm check:version`: sucesso em `0.1.20`.
- `pnpm check:cycles`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `git diff --check` nos arquivos do ajuste: sucesso.
- Chrome/CDP mobile em `http://127.0.0.1:3138/app/comunidades/feed`: sucesso ao confirmar frontend
  `0.1.20`, clique autenticado mantendo a URL em `/app/comunidades/feed`, sem `Carregando página`, 1
  `dialog` com título `Criar Post`, `transitionDuration=0.3s` e alternância da sheet de
  `translate-y-full` para `translate-y-0`.

## Atualizacao 2026-08-11 - limite de 200MB para midia em posts de comunidade

Para manter consistencia com o novo limite de midia em respostas, o upload real de midia de posts raiz tambem passa de 50MB para 200MB. Isso evita que um psicologo consiga publicar um video de resposta maior, mas seja bloqueado ao publicar ou editar um post de comunidade com o mesmo tipo de midia.

Decisao complementar:

- Alterar o limite do middleware `multer` de `POST /api/private/community/:slug/posts/media` para 200MB.
- Validar no frontend, antes de iniciar upload, arquivos acima de 200MB na criacao e edicao de posts.
- Manter os tipos permitidos atuais: JPEG, PNG, WebP, MP4, WebM e QuickTime/MOV.
- Nao alterar payload, persistencia, carrossel, permissao profissional, buckets, Prisma, migrations, envs ou packages.

Consequencias:

- Videos e imagens de posts de comunidade ate 200MB passam a ser aceitos pelo backend quando a permissao profissional ja existir.
- O storage atual ainda valida assinatura a partir do buffer antes de enviar ao R2; portanto arquivos maiores aumentam uso de memoria/tempo de upload, mitigado pela concorrencia/fila de upload ja existentes.
- Rollback: reverter este commit retorna o limite para 50MB e remove a validacao local de 200MB.

Validacao adicional:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`

## Atualizacao 2026-08-12 - composicao mobile da modal Criar Post

Feedback real em iPhone/PWA mostrou regressao visual e de comportamento na modal de criacao de post:
o seletor de comunidade parecia desabilitado por usar superficie cinza, o botao de midia nao seguia
o padrao azul do compositor de comentarios, o CTA `Postar` precisava explicitar a familia textual da
Lectum e o rodape da composicao precisava acompanhar a abertura do teclado como em apps sociais.

Decisoes complementares:

- Reutilizar a identidade do botao azul circular de midia dos comentarios: `bg-primary`, texto/icone em
  `text-primary-foreground`, borda primaria, sombra Lectum e icone `Camera` do `lucide-react`.
- Manter `Postar` com a familia de texto Lectum via `fontFamily: var(--font-sans)` e peso explicito
  para evitar fallback visual do botao nativo quando o CTA estiver desabilitado.
- Tornar o seletor de comunidade ativo visualmente: superficie `bg-surface`, borda tokenizada,
  sombra suave, texto em `text-foreground` e copy `Selecionar comunidade`.
- Fazer o controller de `textarea` respeitar `autoFocus` por foco imperativo no `ref`, sem usar o
  atributo nativo proibido por lint/a11y. A modal tambem refoca o titulo em tentativas curtas ao montar.
- Monitorar `window.visualViewport` e aplicar a diferenca entre layout viewport e visual viewport como
  padding inferior da sheet. Assim, o footer que contem midia/switch/`Postar` sobe acima do teclado em
  navegadores/PWAs que nao recalculam `100dvh` junto com o teclado.
- Nao alterar API, payload, schema, permissao de midia, anonimato, storage, envs, packages ou backend.

Consequencias:

- A experiencia continua mobile-first e app-like: ao abrir a modal, o titulo recebe foco imediatamente
  e, em iOS/PWA real, isso deve acionar o teclado quando permitido pelo navegador apos o gesto do usuario.
- O rodape permanece dentro da mesma sheet e nao cria componente paralelo; apenas reserva espaco dinamico
  quando o teclado ocupa parte do viewport.
- Em navegadores/headless sem teclado virtual, o offset permanece `0px`, preservando desktop e testes.
- Rollback: reverter este complemento volta ao foco anterior, ao seletor cinza e ao footer sem offset de
  `visualViewport`, sem efeito persistente em dados.

Validacao complementar 2026-08-12:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- Chrome/CDP mobile em `http://127.0.0.1:3019/app/comunidades/feed/publicacao/nova`, com cookie local
  apenas para atravessar o proxy privado: sucesso ao confirmar `dialog` `Criar Post`, foco ativo no
  `TEXTAREA#create-post-title`, seletor com `bg-surface`/texto foreground/copy `Selecionar comunidade`,
  CTA `Postar` com `fontFamily` Manrope/`var(--font-sans)` e `fontWeight=800`, footer no rodape da sheet
  e offset de teclado `0px` no ambiente headless sem teclado virtual.

## Atualizacao 2026-08-12 - footer da modal proximo ao teclado e scroll lock mobile

O primeiro refinamento com `visualViewport` mantinha o footer acima do teclado, mas fazia isso por
padding inferior interno da sheet. Em iPhone/PWA real, esse padding podia aparecer como uma faixa
branca abaixo da linha de acoes, deixando camera/`Postar` altos demais e consumindo area textual. A
mesma validacao mostrou que `overflow: hidden` simples em `body/html` nao era suficiente para impedir
rolagem da tela de fundo em todos os gestos mobile.

Decisoes complementares:

- Trocar o padding inferior de offset por reposicionamento da sheet: `margin-bottom` recebe o offset de
  `visualViewport` e a altura da sheet subtrai o mesmo valor. Assim, o fundo da sheet termina no topo do
  teclado e o footer permanece junto a essa borda, sem espaco branco interno abaixo dele.
- Compactar o footer mobile: `pt-2`, CTA `Postar` com `h-11` e padding inferior reduzido para `0.35rem`
  quando existe teclado virtual; sem teclado, o padding volta a respeitar `env(safe-area-inset-bottom)`.
- Fortalecer o scroll lock da modal fixando o `body` no scroll atual (`position: fixed`, `top` negativo,
  `left/right: 0`, `width: 100%`) e aplicando `overflow: hidden`/`overscroll-behavior: none` em
  `body`/`html`. No unmount, todos os estilos anteriores e a posicao de scroll sao restaurados.
- Manter a solucao local ao `CreateCommunityPostLogic`, sem criar dependencia global ou pacote novo e
  sem alterar contrato, persistencia, permissao de midia, anonimato, storage ou backend.

Consequencias:

- O rodape da composicao fica mais proximo do teclado e libera mais area para titulo/conteudo no mobile.
- A tela de fundo nao deve rolar enquanto a modal estiver aberta, inclusive em PWAs iOS onde apenas
  `overflow: hidden` costuma ser insuficiente.
- A restauracao do scroll original evita salto visual ao fechar a modal e retornar ao feed/comunidade.
- Rollback: reverter este complemento volta ao padding interno baseado em `visualViewport` e ao scroll
  lock simples; nao ha efeito persistente em dados ou providers.

Validacao complementar 2026-08-12:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- `pnpm check:version` apos `pnpm version:bump` para `0.1.58`: sucesso.
- Chrome/CDP mobile em `http://127.0.0.1:3026/app/comunidades/feed/publicacao/nova`: sucesso ao
  confirmar foco ativo no titulo, `bodyPosition=fixed`, `bodyOverflow=hidden`, `htmlOverflow=hidden`,
  footer base compacto (`61px`) e, com offset de teclado de `260px` aplicado ao CSS var em headless,
  `sheetMarginBottom=260px`, `sheetHeight=572.75px`, `footerHeight=55px` e
  `footerBottomToKeyboardTop=1px`.
