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
