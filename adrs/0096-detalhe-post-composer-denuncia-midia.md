# ADR-0096 - Detalhe de post com composer compacto, denúncia e mídia profissional

## Status

Accepted

## Contexto

A tela interna do post precisava ficar mais próxima da referência `Dentro do Post` e de padrões do Reddit: post principal no topo, campo de resposta compacto, discussão em árvore, vídeos profissionais em proporção vertical moderada e fluxo de denúncia acessível no menu de três pontos.

Também havia uma regra nova para mídia em respostas: somente psicólogos verificados e com Plano Profissional ativo podem anexar mídia. A validação não poderia ficar apenas no frontend.

## Decisão

- Transformar o composer de resposta em um campo compacto mobile-first: no desktop ele fica logo após o post; no mobile ele é fixo no rodapé e expande apenas quando o usuário interage ou digita.
- Manter o texto da resposta usando React Hook Form/Zod e controllers da fundação da TASK-02; a mídia é anexada como arquivo opcional do composer.
- Criar upload real `POST /api/private/posts/:id/replies/media`, usando o middleware de upload existente e o bucket público já configurado, retornando `media_url` e `media_type` para uso na criação da resposta.
- Validar no backend que upload e criação de resposta com `mediaUrl`/`mediaType` só passam para psicólogos com `cfp_verified_at` e assinatura profissional ativa via `activeProfessionalEntitlementWhere()`.
- Criar `post_report` com uma denúncia ativa por usuário/post e endpoint `POST /api/private/posts/:id/report`; denunciar não remove automaticamente o post, mantendo a moderação reativa já adotada.
- Limitar vídeo de resposta (`post_reply.media_type=video`) a um card 9:16 com largura máxima, para complementar a discussão sem dominar a página.
- Complemento em 2026-06-16: manter o contexto de resposta apenas no placeholder do composer (`Comentar no post` para comentário direto e `Responder [nome]` para resposta), removendo a linha separada `Respondendo [nome]`.
- Complemento em 2026-06-16: exibir um cancelamento discreto somente quando o composer está focado; cancelar limpa rascunho/mídia local, remove o alvo de resposta ativo, desfoca o campo e não muda a mutation real de envio.
- Complemento em 2026-06-16: no mobile, permitir arrastar o composer focado para baixo para cancelar, com limite mínimo e captura restrita ao campo para não interferir no scroll normal da página.

## Consequências

- Usuários comuns e psicólogos sem assinatura/validação visualizam o anexo desabilitado com explicação e são bloqueados no backend se tentarem enviar mídia por API.
- Psicólogos aptos podem anexar imagem/vídeo em respostas usando infraestrutura real de upload; se a criação da resposta falhar após upload, pode haver arquivo público órfão até existir rotina de limpeza específica.
- O fluxo de denúncia passa a ser persistido e preparado para painel/admin futuro, mas sem automatizar remoção ou pré-moderação.
- O cancelamento do composer é uma decisão de UX local: não cancela requests já iniciadas e não altera contrato, payload ou persistência de respostas.

## Validação

- `pnpm --dir backend db:migrate --name add_post_reports`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video` respondeu `200`.
- Complemento 2026-06-16: `pnpm --dir frontend check`.
- Complemento 2026-06-16: `pnpm --dir frontend build`.
- Complemento 2026-06-16: HTTP local em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video` respondeu `200` com cookie de sessão local de validação.

## Atualizacao 2026-06-21 - Cortesia como entitlement de midia em respostas

A regra backend de midia em respostas passou a aceitar duas formas de aptidao profissional:

- `cfp_verified_at` preenchido com plano profissional ativo; ou
- plano profissional ativo concedido pelo administrador (`source = "admin_grant"`), mesmo com `cfp_verified_at` nulo.

Essa excecao e limitada ao entitlement de recurso para psicologos com cortesia. Ela nao altera schema, storage, contratos de resposta, limites de arquivo, fluxo de denuncia ou demais criterios publicos de verificacao.

Validacao adicional:

- `pnpm --dir backend exec biome check --write src/utils/subscription-entitlement.ts src/modules/api/private/posts/repositories/PostRepository.ts`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- Script local confirmou `canAttachReplyMedia=true` para `<CONTA_DE_TESTE_AUTORIZADA>` com assinatura `admin_grant` ativa e `cfp_verified_at=null`.
- Service real `authorizeReplyMediaUpload` retornou `status=200` para um post publicado existente, sem criar midia fake.

## Atualizacao 2026-06-21 - icone de video no composer de respostas

O composer de comentarios/respostas manteve o mesmo contrato real de upload `POST /api/private/posts/:id/replies/media`, mas o controle visual de anexo passou a usar o icone `Video` em vez de `Paperclip`, em paridade com a nova modal de criacao de posts.

A alteracao e somente visual no fluxo de respostas: nao muda endpoint, payload, storage, validacao backend, limites de arquivo, ordenacao da arvore, votos, salvar/compartilhar ou denuncia. A permissao continua usando o entitlement profissional compartilhado, incluindo cortesia administrativa ativa quando houver plano profissional ativo.

Validacao adicional:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP autenticado em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video` confirmou o botao `Anexar midia` habilitado com SVG no novo controle.

## Atualizacao 2026-06-22 - miniatura compacta no anexo de respostas

O composer de comentarios/respostas deve comunicar que a midia ja foi escolhida sem ocupar uma linha extra com nome de arquivo. A decisao complementar e transformar o proprio controle `Anexar midia` em uma miniatura compacta quando existe arquivo selecionado.

Decisao:

- Reutilizar `ReplyMediaAttachmentControl` e manter a diferenca por variante: no modo composer, arquivo selecionado vira um botao de miniatura em formato pill com preview de imagem/video; no modo editor, permanece o preview maior ja usado na modal de edicao.
- Remover do composer a chip separada com o nome do arquivo, reduzindo ruido visual e mantendo a altura do bloco de resposta mais estavel.
- Manter a miniatura clicavel para substituir a midia e expor uma acao pequena de remocao no proprio controle.
- Preservar o contrato real existente: texto e midia, somente texto ou somente midia sao validos; somente composicao vazia continua bloqueada.
- Nao alterar endpoint, storage, limites de arquivo, permissao profissional, schema, migrations, votos, salvos, denuncia ou ordenacao da arvore.

Validacao adicional:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke real de API criando e excluindo resposta somente com midia e `content: ""`.
- Chrome/CDP mobile autenticado no detalhe do post demo confirmou miniatura `Substituir midia anexada`, preview renderizado, botao `Anexar midia` removido do composer ativo, textarea vazio e envio habilitado.

## Atualizacao 2026-06-22 - orientacao real da miniatura no composer

A miniatura compacta do anexo no composer de comentarios/respostas nao deve forcar todo arquivo para o mesmo formato visual. Imagens e videos selecionados localmente passam a ter seus metadados lidos antes do upload para classificar a previa como paisagem, retrato ou quadrada.

Decisao complementar:

- Estender `SelectedReplyMedia` com `orientation` opcional, derivado de `naturalWidth/naturalHeight` em imagens e `videoWidth/videoHeight` em videos.
- Aplicar tamanhos maximos pequenos por orientacao no modo composer, evitando previews grandes e mantendo a leitura da orientacao real da midia.
- Manter o modo editor com a previa maior existente, pois ele e uma modal dedicada de edicao e nao o composer compacto.
- Exibir o controle de midia tambem no comentario principal do post para psicologos com permissao, sem exigir texto ou resposta aninhada para acessar o upload.
- Preservar o contrato backend atual: texto + midia, somente texto ou somente midia sao validos; somente texto vazio sem midia valida continua bloqueado.

Validacao adicional:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Upload real via `POST /api/private/posts/:id/replies/media`, criacao de comentario com `content: ""` e exclusao em seguida.
- Chrome/CDP mobile autenticado confirmou controle `Anexar midia` disponivel no comentario principal, previa vertical compacta para arquivo vertical, `Enviar resposta` habilitado sem texto e substituicao visual do botao pela miniatura.

## Atualizacao 2026-06-22 - miniatura anexada sem substituir direto

A miniatura compacta do composer passa a ser apenas uma representacao visual da midia selecionada. A acao de substituicao direta sobre a miniatura foi removida para reduzir ambiguidade de toque/click e evitar controles sobrepostos no preview compacto.

Decisao complementar:

- No modo composer, renderizar a miniatura como elemento visual nao clicavel, mantendo somente o botao `X` para remover a midia anexada.
- Remover o overlay inferior com icone/texto `Midia` sobre a miniatura ativa.
- Para trocar o arquivo, o usuario remove a midia atual e usa novamente o controle de anexo exibido apos a remocao.
- Manter o modo editor com o botao dedicado `Midia`, pois a modal tem espaco e contexto para substituicao explicita.
- Preservar o contrato real de upload e criacao: texto + midia, somente texto ou somente midia continuam validos; composicao vazia segue bloqueada.

Validacao adicional:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP mobile autenticado no detalhe do post demo confirmou ausencia de `Substituir midia anexada`, miniatura renderizada, botao `Remover midia anexada` presente, preview sem label sobreposto e envio habilitado com textarea vazio.

## Atualizacao 2026-06-22 - botao de midia escondido no repouso mobile

O composer fixo de comentarios no mobile precisa economizar altura no estado de repouso. A mensagem de conduta e a acao de anexo de midia passam a formar um estado expandido acionado por foco, rascunho ou midia selecionada.

Decisao complementar:

- Ocultar o bloco de midia apenas em breakpoints mobile quando o composer nao esta ativo, nao possui rascunho e nao possui midia selecionada, usando `hidden sm:flex` para evitar dependencia de variante `max-sm` no build.
- Manter o comportamento desktop com o botao de midia sempre disponivel para psicologos com permissao, preservando o fluxo ja validado.
- Manter a midia visivel quando ja existir anexo selecionado, mesmo no mobile, para permitir remover ou publicar somente a midia.
- Implementar a regra por composicao de classes no `ReplyMediaAttachmentControl`, sem duplicar componente, endpoint ou regra de permissao.
- Usar `onFocusCapture` no composer para garantir expansao assim que qualquer controle interno receber foco.

Validacao adicional:

- Chrome/CDP mobile autenticado `390x844` confirmou `Anexar midia` e `Comente com respeito e empatia...` invisiveis em repouso e visiveis apos foco do textarea.
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`

## Atualizacao 2026-08-11 - composer mobile solido e midia icon-only

O produto comparou a barra de comentario da Lectum com a do Reddit em capturas reais de iPhone e apontou tres problemas: o compositor parecia deixar a tela vazar por tras, o controle de anexo ocupava uma linha propria com o texto `Anexar midia`, e a barra nativa do iOS com setas/check parecia fazer parte da Lectum sem utilidade clara.

Decisao complementar:

- Tornar o composer fixo mobile uma superficie solida (`bg-surface`) sem translucidez/backdrop blur, com topo arredondado, borda superior e camada acima do conteudo (`z-[80]`).
- Mover o controle de midia para a esquerda do campo de comentario no mesmo row do textarea e do botao de envio.
- No modo composer, renderizar o controle de midia como botao circular icon-only, mantendo `aria-label`, `title`, permissao real e input de arquivo existente.
- Preservar React Hook Form/Zod e o controller `textarea` da TASK-02; nao trocar por `contenteditable` nem criar hack frágil apenas para tentar esconder a toolbar nativa do iOS. Essa toolbar e controlada pelo navegador/PWA, entao o ajuste da Lectum deve evitar que ela pareca parte quebrada da interface, mas nao depender de removela via CSS.
- Manter endpoint, payload, upload real, permissao profissional, validacao backend, safe area e fluxo de envio inalterados.

Consequencias:

- O compositor fica mais proximo do padrao de bottom sheet do Reddit, mais limpo e com menor altura.
- O botao de midia continua descobrivel para psicologos elegiveis, mas sem ocupar texto/linha extra.
- Usuarios que nao podem anexar midia continuam bloqueados visualmente e pelo backend; a razao fica preservada em `title`/texto acessivel.
- Nenhum contrato de API, schema, migration, env, pacote ou dado persistido foi alterado.


## Atualizacao 2026-08-11 - remocao do X de saida no composer

A barra de comentario no mobile estava acumulando controles: midia, campo, X de cancelamento e envio. A decisao complementar e remover o X de saida/cancelamento visivel do row principal para deixar o composer mais proximo de uma barra de resposta simples, como a referencia do Reddit.

Decisao complementar:

- Remover apenas o botao circular de cancelar exibido ao lado do textarea no composer de comentarios/respostas.
- Manter o comportamento interno de cancelamento/limpeza que ja atende gestos e saida de contexto sem depender de um botao visivel no row.
- Preservar os outros usos de X que tem funcao clara: fechar a modal de denuncia e remover uma midia anexada selecionada.
- Nao alterar React Hook Form/Zod, controller do textarea, endpoint, payload, upload real, permissao profissional, schema, migrations, envs ou packages.

Consequencias:

- O composer fica com menos ruido visual e com mais espaco horizontal para o campo de comentario no mobile.
- O usuario ainda consegue enviar texto/midia e remover midia anexada; apenas perde o atalho visual redundante de cancelar no row.
- O rollback e reverter este commit, pois a mudanca e puramente frontend e nao altera dados persistidos.


## Atualizacao 2026-08-11 - previa de midia abaixo do campo

A iteracao visual do composer separa a acao de anexar midia da previa da midia selecionada. A referencia de produto pediu que apenas o icone de adicionar permanecesse a esquerda do campo, enquanto a midia subida ficasse abaixo do textarea.

Decisao complementar:

- Dividir o modo composer de `ReplyMediaAttachmentControl` em apresentacoes `trigger`, `preview` e `combined`, preservando o comportamento historico como padrao.
- Usar `trigger` no row principal para manter somente o botao circular icon-only de midia ao lado do campo de comentario.
- Renderizar `preview` em linha separada abaixo do campo quando ha `selectedMedia`, com miniatura, orientacao real e remocao explicita.
- Permitir que o icone de adicionar substitua o arquivo selecionado por outro, mantendo a miniatura apenas como previa/remocao e sem torna-la clicavel.
- Nao alterar endpoints, payloads, upload real, validacao backend, permissao profissional, React Hook Form/Zod, schema, migrations, envs ou packages.

Consequencias:

- O campo de comentario volta a ocupar a linha principal sem ser deslocado pela miniatura vertical.
- A midia anexada fica visualmente associada ao comentario, mas abaixo do campo, reduzindo o desalinhamento visto no iPhone.
- O rollback e reverter este commit; a mudanca e puramente frontend e nao altera dados persistidos.


## Atualizacao 2026-08-11 - padding compacto com teclado ativo no iOS

O iOS/Safari exibe uma toolbar nativa de formulario com setas de navegacao e botao de concluir quando um `textarea` web recebe foco. Essa barra nao pertence a Lectum e nao pode ser removida de forma confiavel por CSS sem trocar o campo por uma implementacao fragil. O problema visual observado era agravado porque o composer mantinha o padding de safe-area do estado de repouso enquanto o teclado estava aberto.

Decisao complementar:

- Manter o `textarea` da fundacao de formularios com React Hook Form/Zod.
- No composer fixo mobile, usar `pb-2` quando `composerActive=true` para remover o safe-area extra enquanto o teclado esta aberto.
- Manter `var(--lectum-bottom-fixed-padding)` no estado de repouso, preservando o home indicator e a barra inferior em iPhones sem teclado.
- Nao criar hack com `contenteditable`, input oculto ou manipulacao nao confiavel da toolbar nativa do iOS.
- Nao alterar endpoint, payload, upload real, validacao backend, permissao profissional, schema, migrations, envs ou packages.

Consequencias:

- A Lectum deixa de criar um vao proprio acima da toolbar nativa; o campo fica visualmente mais baixo e mais proximo do teclado.
- A toolbar nativa do iOS pode continuar aparecendo por decisao do sistema operacional/browser, diferente do Reddit nativo.
- Rollback: reverter este commit; a mudanca e puramente frontend e nao altera dados persistidos.

## Atualizacao 2026-08-11 - composer contextual com midia integrada e foco no teclado

O feedback de produto consolidou o composer mobile como uma caixa de resposta mais proxima de apps nativos: a midia precisa parecer parte do texto que sera enviado, o contexto de resposta precisa ser explicito, o teclado deve fechar quando o usuario volta a rolar a thread e o toque em `Responder` precisa acionar foco imediato.

Decisao complementar:

- Manter o `textarea` React Hook Form/Zod como campo padrao, mas envolver textarea e preview de midia no mesmo contorno visual para comunicar uma unica resposta composta.
- Deixar o botao circular de midia ativo somente enquanto nao existe anexo selecionado; depois da selecao, o fluxo exige remover a midia antes de escolher outra, evitando substituicao acidental.
- Para videos selecionados localmente, gerar uma miniatura client-side em canvas para preview do composer, sem alterar o upload real nem depender de thumbnail remota antes do envio.
- Reintroduzir o contexto textual acima do composer como `Respondendo a [Nome]`/`Respondendo ao post` e mover a frase de conduta para baixo da caixa com menor hierarquia visual.
- Desfocar o textarea ao detectar scroll da pagina no mobile, preservando rascunho/midia e usando o fechamento nativo do teclado em vez de tentar manipular a toolbar do iOS.
- Exibir um header fixo compacto apenas no mobile quando a direcao de scroll for para cima e a pagina ja estiver afastada do topo.
- Ao responder comentario da arvore no mobile, focar o textarea de forma sincronica no gesto do usuario e repetir o foco apos a troca de alvo, aumentando a chance de o iOS/PWA abrir o teclado.
- Nao alterar endpoint, payload, upload real, validacao backend, permissao profissional, schema, migrations, envs ou packages.

Consequencias:

- O composer comunica melhor que texto e midia formam uma unica resposta, com menos ambiguidade de toque no controle de midia.
- O teclado deve abrir com mais confiabilidade ao tocar em `Responder` na arvore, respeitando a exigencia de foco dentro do gesto do usuario em browsers mobile.
- O header de retorno melhora navegacao em leitura profunda sem impactar desktop.
- Rollback: reverter este commit; a mudanca e puramente frontend e nao altera dados persistidos.

Validacao adicional:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check` (sem erro; apenas avisos locais de normalizacao CRLF/LF na task e no ADR atualizados)
- Chrome headless local 390x844 no frontend buildado em `/comunidades/ansiedade-em-equilibrio/publicacao/demo-post-ansiedade-apresentacao-video` confirmou carregamento da rota; sem API/autenticacao local disponivel, a validacao visual autenticada final fica para smoke de homologacao apos push.

## Atualizacao 2026-08-11 - teclado Android, foco fluido e header completo

O teste em Android/Chrome de homologacao mostrou que `position: fixed; bottom: 0` podia ficar atras do teclado quando o navegador sobrepunha o teclado ao viewport visual. O mesmo fluxo tambem evidenciou que o auto-scroll/resize disparado pela abertura do teclado nao deve ser tratado como rolagem intencional do usuario, pois isso pode desfocar o textarea sozinho.

Decisao complementar:

- No composer fixo mobile, observar `window.visualViewport` quando o textarea esta ativo e aplicar `bottom` dinamico igual ao espaco ocupado pelo teclado virtual, com fallback sem efeito quando a API nao estiver disponivel.
- Manter o fechamento do teclado por rolagem apenas apos intencao real de usuario (`touchmove`/`wheel`), ignorando scrolls automaticos causados por foco, resize e abertura do teclado.
- Remover a classe mobile `touch-none` do composer focado para evitar sensacao de trava; o gesto de arrastar para cancelar continua validando direcao/distancia antes de impedir o padrao.
- Para respostas diretas ao post, passar o nome publico do autor do post ao composer e renderizar `Respondendo [nome]`; respostas aninhadas usam a mesma copy sem preposicao.
- Tornar o header flutuante mobile equivalente ao topo do post em acoes essenciais: voltar, titulo `Post` e menu lateral com denuncia ou menu de dono do post.
- Nao alterar endpoint, payload, upload real, validacao backend, permissao profissional, schema, migrations, envs ou packages.

Consequencias:

- O composer passa a acompanhar melhor teclados virtuais de Android/Chrome e PWA, sem depender de hacks de `contenteditable` ou troca da fundacao de formularios.
- A selecao do campo e a abertura do teclado ficam mais fluidas porque resize/auto-scroll deixam de fechar o foco.
- O header de retorno fornece a mesma acao de denuncia do header original durante leitura profunda.
- Rollback: reverter este commit; a mudanca e puramente frontend e nao altera dados persistidos.

Validacao adicional:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check` (primeira tentativa excedeu timeout local; repetido com timeout maior e concluido sem erro)
- `git diff --check` (sem erro; apenas avisos locais de normalizacao CRLF/LF na task e no ADR atualizados)
- Chrome headless local 390x844 no frontend buildado em `/comunidades/ansiedade-em-equilibrio/publicacao/demo-post-ansiedade-apresentacao-video` confirmou carregamento HTTP 200 da rota; a API local retornou estado `Post indisponivel`, entao a validacao autenticada final de teclado/header fica para smoke em homologacao e reteste no aparelho real.
