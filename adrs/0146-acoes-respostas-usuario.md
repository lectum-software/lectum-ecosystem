# ADR-0146 - Ações de respostas do usuário

Status: Accepted

## Contexto

A tela `/app/posts/mine` passou a separar posts e respostas/comentários do usuário. Posts próprios já tinham menu de dono com editar, silenciar e excluir, mas as respostas do usuário ainda dependiam apenas da navegação para o post original. O produto pediu paridade de ações nas respostas, mantendo a mesma regra de exclusão segura aplicada a posts: preservar contribuições de psicólogos em conversas iniciadas por pacientes.

## Decisão

- Criar `PUT /api/private/posts/:id/replies/:replyId` para edição owner-only do texto de `post_reply`.
- Manter autoria, post, hierarquia e mídia da resposta imutáveis no fluxo de edição.
- Evoluir `DELETE /api/private/posts/:id/replies/:replyId` para bloquear exclusão por autores não psicólogos quando a subárvore ativa do comentário/resposta já contém contribuição de psicólogo.
- Permitir que autores psicólogos excluam seus próprios comentários/respostas a qualquer momento, incluindo subárvores, espelhando a regra de posts de psicólogos.
- Reutilizar o mute persistido do post para a opção `Silenciar` no menu de resposta, porque as notificações de respostas pertencem à conversa do post e não existe requisito de mute granular por reply.
- Na UI, renderizar menu próprio apenas quando `reply.author.id` é o usuário atual, com modal de edição baseado na fundação TASK-02 (React Hook Form/Zod/controllers) e confirmação de exclusão.

## Consequências

- Pacientes não conseguem apagar um comentário/resposta que já recebeu participação profissional abaixo dele; o conteúdo profissional fica preservado.
- Psicólogos mantêm autonomia para remover suas próprias contribuições quando necessário.
- O backend continua sendo a fonte final da regra; a UI apenas antecipa bloqueios quando o DTO já informa resposta profissional direta.
- Não há novo modelo de dados, migration, package ou storage; o mute por resposta é deliberadamente representado como mute da conversa do post.

## Task relacionada

- Complemento de produto sobre `/app/posts/mine` em TASK-28.

## Validações

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- Validações finais de build, `pnpm check` e browser local registradas na execução do complemento.

## Complemento 2026-06-21 - editar comentario proprio no detalhe do post

O menu de comentarios/respostas dentro da propria arvore do post deve ter paridade minima com as acoes do usuario em `Meus posts e respostas`.

Decisao complementar:

- Exibir `Editar` no menu de tres pontos de `ReplyCard` somente quando `reply.author.id` for o usuario autenticado.
- Reutilizar a `ReplyEditModal` existente e o endpoint real `PUT /api/private/posts/:id/replies/:replyId`, sem criar fluxo paralelo ou mock.
- Manter `Salvar`, `Compartilhar` e `Excluir` no mesmo menu para comentarios proprios; comentarios de terceiros continuam com `Salvar`, `Compartilhar` e `Denunciar`.
- Preservar o bloqueio de propagacao/collapse da arvore porque o menu continua dentro de `data-comment-collapse-ignore`.

Consequencias:

- O usuario consegue corrigir um comentario direto no contexto da conversa, sem voltar para `/app/posts/mine`.
- A regra de dominio permanece centralizada no backend e nos hooks ja existentes; nao houve novo schema, endpoint, package, storage ou alteracao de permissao.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- `git diff --check`: sucesso.
- Chrome/CDP mobile `390x844` no detalhe do post demo: sucesso ao abrir o menu do comentario proprio `cmqnag8iv0024g8uhognhksz3`, confirmar ordem `Editar/Salvar/Compartilhar/Excluir` e abrir a modal `Editar comentario` preenchida.

## Complemento 2026-06-21 - modal isolada de editar comentario e midia

A edicao de comentarios precisa ser uma experiencia isolada da arvore/card original, especialmente no mobile, e tambem deve permitir gestao de midia quando a resposta pertence a um psicologo com direito real ao recurso.

Decisao complementar:

- Renderizar a `ReplyEditModal` por portal em `document.body`, com overlay fixo acima da pagina, bloqueio de scroll global e scroll interno do conteudo.
- Manter a modal centralizada em mobile e desktop, em vez de bottom sheet, usando altura maxima responsiva e margens de seguranca para preservar textarea e rodape.
- A modal nao renderiza nenhum fragmento visual do `ReplyCard`: sem metadados, sem linha `Respondido em`, sem controles de upvote/downvote/salvar/compartilhar, sem divisorias herdadas e sem label redundante.
- Reutilizar `ReplyMediaAttachmentControl` para criar e editar midia de respostas, evitando componentes paralelos; o modo editor permite visualizar, substituir, remover e desfazer remocao da midia atual.
- Estender o contrato owner-only `PUT /api/private/posts/:id/replies/:replyId` para aceitar `mediaUrl`/`mediaType` opcionais, validando que substituicoes venham do upload publico permitido e que remocao seja representada por ambos os campos `null`.
- Exibir o controle de midia apenas para psicologos com entitlement real (`canAttach`) e esconder de pacientes ou psicologos gratuitos; o backend continua sendo a fonte final da permissao.

Consequencias:

- A experiencia de edicao fica limpa, focada e livre de vazamentos de stacking context do card original.
- O fluxo de midia de comentarios permanece reaproveitando o storage/upload ja configurado para respostas, sem novo bucket, package, modelo ou endpoint de upload.
- Autoria, post, hierarquia, regras de exclusao, votos, salvos e collapse continuam inalterados.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir backend check`: sucesso.
- `pnpm --dir backend build`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Chrome/CDP mobile `390x844` em `/app/posts/mine`: sucesso ao abrir `Editar comentario`, confirmar modal centralizada, `z-index=1000`, body travado, 1 textarea, ausencia de metadados/controles do card e opcao `Adicionar midia` para psicologo autorizado.

## Complemento 2026-06-21 - textarea compacto e botao de midia refinado

A modal limpa de edicao de comentarios precisava evitar que comentarios curtos ocupassem uma area editorial grande demais, sem perder conforto para textos longos. O controle de midia tambem precisava ficar mais discreto e alinhado ao design system.

Decisao complementar:

- O textarea da `ReplyEditModal` inicia com aproximadamente duas linhas, usa auto-resize e respeita altura maxima responsiva; ao atingir o limite, passa a usar rolagem interna.
- O controller compartilhado de textarea passa a considerar `max-height` computado durante o auto-resize, mantendo `overflow-y` automatico apenas quando necessario.
- No modo editor, o `ReplyMediaAttachmentControl` exibe o texto visivel `Midia`, preservando `aria-label`/`title` contextuais para adicionar ou substituir.
- O botao de midia do editor recebeu visual mais leve, borda azul suave, gradiente sutil, sombra discreta, icone menor e estados de hover/focus/active/disabled.
- A regra de exibicao nao mudou: o controle continua visivel apenas para psicologos com permissao real de anexar midia.

Consequencias:

- Comentarios curtos deixam a modal mais compacta em mobile e desktop.
- Comentarios longos continuam editaveis sem estourar a altura da modal.
- Nao houve mudanca de endpoint, schema, storage, payload, regra de permissao, exclusao, votos ou salvos.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso.
- Validacoes finais de build, `pnpm check` e browser local ficam registradas na execucao do complemento.

## Complemento 2026-06-22 - marcador editado em comentarios

Comentarios e respostas precisam comunicar ao leitor quando foram alterados depois da publicacao, com a mesma transparencia ja aplicada a posts editados.

Decisao complementar:

- Adicionar `post_reply.edited_at DateTime?` como metadado publico simples, sem historico completo de versoes no MVP.
- Preencher `edited_at` no endpoint owner-only `PUT /api/private/posts/:id/replies/:replyId` sempre que o autor salva uma edicao de texto ou midia.
- Expor `edited_at` nos DTOs de detalhe/thread, listas do usuario/salvos e respostas profissionais destacadas de comunidade/perfil.
- Renderizar `editado` junto do tempo relativo na arvore de comentarios, nas contribuicoes de resposta em cards compartilhados e nas previas profissionais.

Consequencias:

- O leitor reconhece comentarios e respostas alterados sem precisar de historico completo.
- O contrato fica consistente com `community_post.edited_at`, mantendo a mesma decisao de transparencia simples para o MVP.
- A migration `20260622013737_add_post_reply_edited_at` adiciona uma coluna anulavel, sem backfill obrigatorio e sem mudar autoria, hierarquia, votos, salvos, exclusao ou permissoes de midia.

Validacao complementar:

- `pnpm --dir backend db:migrate -- --name add_post_reply_edited_at`: sucesso.
- `pnpm --dir backend check`: sucesso.
- `pnpm --dir backend build`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Chrome/CDP mobile `390x844` no detalhe do post demo: sucesso, confirmando `Psic?logo ? h? 1 d ? editado` no comentario editado.

## Complemento 2026-06-22 - comentarios com texto ou midia

A edicao/criacao de comentarios deve aceitar tres composicoes validas: texto + midia, somente texto ou somente midia. A obrigatoriedade deixa de ser textual e passa a ser de conteudo final nao vazio.

Decisao complementar:

- Remover o `min(3)` de texto nos validadores de comentarios/respostas e aceitar `content` ausente ou vazio, preservando `max(2000)`.
- Manter `post_reply.content` como `String` nao nula, persistindo string vazia para respostas somente com midia, evitando nova migration.
- Validar no dominio que a composicao final tem texto ou midia valida: criacao sem ambos falha; edicao sem ambos falha; edicao com midia atual preservada e texto vazio e permitida.
- Reaproveitar o mesmo controle de midia e as mesmas permissoes existentes; pacientes e psicologos sem entitlement continuam sem anexar midia.

Consequencias:

- Psicologos verificados/cortesia podem publicar ou editar uma resposta usando apenas midia.
- Comentarios somente texto continuam funcionando, inclusive com textos curtos.
- O backend segue como fonte final da regra e impede registros vazios sem texto e sem midia.

Validacao complementar:

- `pnpm --dir backend check`: sucesso.
- `pnpm --dir backend build`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Smoke real de API: sucesso, criando resposta somente com midia sem `content`, bloqueando composicao vazia e bloqueando remocao simultanea de texto + midia.
- Chrome/CDP autenticado: sucesso, confirmando modal `Editar comentario` com textarea vazio, midia atual visivel, sem erro de texto minimo e `Salvar alteracoes` habilitado.

## Complemento 2026-06-22 - ocultar botao de midia quando ja ha anexo

A modal de edicao de comentario ainda mostrava o botao `Midia` mesmo quando a resposta ja possuia uma midia anexada, gerando duplicidade visual ao lado da miniatura e do botao de remover.

Decisao complementar:

- No modo editor do `ReplyMediaAttachmentControl`, manter a miniatura da midia atual/selecionada e o botao `X` de remocao como unica acao visivel enquanto houver anexo ativo.
- Ocultar o botao `Midia` enquanto `activeMedia` existir.
- Reexibir o botao `Midia` apenas depois que a midia for removida/marcada para remocao, permitindo anexar uma substituta sem manter duas acoes concorrentes.
- O modo composer permanece inalterado: quando ha anexo, o botao ja se transforma em miniatura.

Consequencias:

- A edicao de comentarios fica mais limpa em mobile e desktop.
- A substituicao de midia continua possivel pelo fluxo remover e anexar novamente, sem novo endpoint, payload, storage, schema ou permissao.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso.
- Chrome/CDP mobile `390x844` no detalhe do post demo: sucesso, abrindo `Editar comentario` em comentario proprio com midia atual, confirmando miniatura presente e zero botoes textuais `Midia` na modal.


## Complemento 2026-06-22 - previa horizontal no editor de comentarios

A modal `Editar comentario` precisava respeitar a orientacao real da midia anexada tambem durante a edicao. Antes, a miniatura do editor usava sempre um enquadramento vertical, mesmo para imagens ou videos horizontais.

Decisao complementar:

- Detectar a orientacao da midia atual do comentario por metadados reais de imagem/video quando a modal abre.
- Reaproveitar a orientacao ja detectada para arquivos selecionados localmente antes do upload.
- No modo editor do `ReplyMediaAttachmentControl`, alternar a previa entre `aspect-video` para paisagem, `aspect-square` para midia quadrada e `aspect-[9/14]` para retrato.
- Manter a previa compacta e isolada, preservando apenas o `X` de remocao quando ha midia ativa e mantendo o botao textual `Midia` oculto ate a remocao do anexo.

Consequencias:

- A edicao de comentarios fica consistente com o formato real da imagem ou do video anexado.
- Videos e imagens horizontais deixam de parecer cortados em card vertical na modal.
- Nao ha novo endpoint, schema, storage, package, permissao ou limite de upload; a mudanca e exclusivamente visual no componente compartilhado.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Chrome/CDP mobile `390x844` no detalhe do post demo: sucesso, abrindo `Editar comentario` em resposta propria com imagem horizontal e em resposta propria com video horizontal, confirmando frame `16:9`, miniatura renderizada, botao textual `Midia` ausente e `X` de remover presente.


## Complemento 2026-06-22 - rolagem interna do texto com midia na edicao

A modal `Editar comentario` ja isolava o card original, mas comentarios longos com midia ainda podiam gerar uma segunda barra de rolagem no corpo da modal. Isso fazia texto, midia e rodape disputarem uma area rolavel externa, contrariando a experiencia focada de edicao.

Decisao complementar:

- O corpo da modal de edicao deixa de ter rolagem propria e passa a ocultar overflow externo.
- O textarea continua com auto-grow, mas recebe limite dinamico: menor quando ha midia efetiva e maior quando nao ha midia.
- Textos longos passam a rolar dentro do proprio textarea, mantendo a midia posicionada abaixo do campo e acima do rodape.
- A regra de composicao continua igual: texto + midia, somente texto ou somente midia permanecem validos conforme backend.

Consequencias:

- A modal deixa de exibir barra de rolagem externa ao editar comentarios longos com midia.
- A midia fica visualmente estavel, sem ser empurrada para fora por textos extensos.
- Nao ha mudanca em schema, endpoints, upload, storage, permissoes ou contrato de edicao.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Chrome/CDP desktop `1440x900`: sucesso, em comentario proprio com texto longo e video, confirmando corpo da modal sem scroll externo, textarea com scroll interno e midia visivel acima do rodape.


## Complemento 2026-06-22 - botao de midia sem sombra na edicao

O botao textual `Midia` da modal `Editar comentario` mantinha uma sombra leve herdada do refinamento premium anterior. A solicitacao atual pede uma aparencia ainda mais limpa, sem sombreamento visual.

Decisao complementar:

- Remover a sombra do botao `Midia` no modo editor do `ReplyMediaAttachmentControl` usando `shadow-none`.
- Preservar a borda suave, o gradiente claro, os estados de hover/focus/active/disabled e o comportamento de permissao/upload existentes.
- Manter inalterado o modo composer, a miniatura quando existe anexo e o fluxo remover/anexar para substituicao.

Consequencias:

- A modal de edicao de comentario fica visualmente mais limpa, com menos peso no controle secundario de midia.
- Nao ha mudanca em contratos de API, storage, schema, permissoes, validacao de conteudo, upload ou regras de exibicao por perfil.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Chrome/CDP desktop `1440x900`: sucesso, abrindo `Editar comentario` em resposta propria sem midia e confirmando botao `Midia` sem sombra visivel.

## Complemento 2026-06-22 - editar midia sem remover anexo atual

A modal `Editar comentario` precisa permitir que psicologos verificados troquem a midia do comentario sem que a simples acao de abrir a galeria seja tratada como remocao do anexo existente.

Decisao complementar:

- Quando existe midia ativa no editor, o controle textual volta a aparecer como `Editar midia`.
- O botao `Editar midia` apenas abre o seletor de arquivos; ele nao chama a acao de remover midia atual.
- O `X` segue sendo a unica acao explicita para marcar a midia atual para remocao.
- Ao selecionar nova midia, a substituicao so e enviada no payload ao salvar; cancelar a modal preserva o anexo atual.

Consequencias:

- Reduz risco de perda acidental de midia durante a edicao.
- Mantem o fluxo claro: `Editar midia` para escolher arquivo, `X` para remover.
- Nao altera backend, schema, storage, validacoes de formato/tamanho, permissao por perfil ou limite atual de uma midia por comentario.

Validacao complementar:

- `pnpm --dir frontend biome:fix`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- `git diff --check`: sucesso.

## Complemento 2026-06-23 - copy compacta no menu de comentarios

O menu de tres pontos de comentarios e respostas passou a usar acoes curtas:
`Editar`, `Silenciar` e `Excluir`. A decisao remove a repeticao de
`comentario`/`resposta` do dropdown, deixando a interface mais limpa no mobile,
sem alterar permissoes, endpoints, regra de exclusao, silenciamento ou edicao.

O fluxo de bloqueio de exclusao/silenciamento tambem passou a usar a copy
compacta no botao de acao (`Silenciar`/`Silenciada`), mantendo as descricoes
explicativas para preservar clareza da regra de dominio.

## Complemento 2026-06-23 - anexar midia apenas com composer em foco

O botao `Anexar midia` no composer de comentarios aparecia em repouso para psicologos com permissao de midia, deixando o card mais carregado antes de qualquer intencao de comentar.

Decisao complementar:

- O controle de midia do composer passa a ser exibido somente quando o campo de comentario/resposta esta ativo, ou quando ja existe uma midia selecionada para envio.
- A miniatura de midia selecionada continua visivel mesmo se o campo perder foco, para evitar perda de contexto antes do envio.
- Psicologos gratuitos continuam vendo o estado bloqueado/motivo apenas quando interagem com o composer; pacientes continuam sem visualizar essa funcionalidade.

Consequencias:

- O estado de repouso do campo de comentario fica mais limpo em desktop e mobile.
- O fluxo de envio somente com midia permanece valido, pois a miniatura selecionada mantem o composer pronto para envio.
- Nao ha mudanca em backend, schema, storage, validacoes de formato/tamanho, permissao por perfil ou contrato de envio.

Validacao complementar:

- `pnpm --dir frontend biome:fix`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- `git diff --check`: sucesso.

## Complemento 2026-06-23 - remocao do fallback desktop do botao de midia

Apos a primeira restricao do botao `Anexar midia`, ainda existia um fallback visual no desktop (`sm:flex`) herdado do comportamento anterior. Para garantir que o controle nao apareca em repouso em nenhum viewport, a renderizacao agora depende exclusivamente do composer ativo/focado ou de uma midia ja selecionada.

Decisao complementar:

- Remover o fallback responsivo que permitia exibir o controle no desktop sem guidance/foco.
- Remover a condicao auxiliar `expanded` da renderizacao do controle de midia, evitando que contexto de resposta ou permissao de midia mantenha o botao visivel por si so.
- Manter a miniatura renderizada quando houver midia selecionada, mesmo sem foco, para preservar envio somente com midia.

Consequencias:

- `Anexar midia` fica oculto em repouso em desktop e mobile.
- O botao aparece ao focar/interagir com o campo e desaparece quando o composer perde foco sem anexo.
- Nao ha mudanca em backend, schema, endpoints, storage, upload, permissoes ou validacao de conteudo.

## Complemento 2026-06-23 - manter controle de midia durante seletor nativo

O botao `Anexar midia` abre o seletor nativo de arquivos. Como o seletor tira foco do textarea antes do evento `change`, o composer podia esconder o controle e desmontar o input de arquivo antes da midia selecionada ser aplicada.

Decisao complementar:

- Registrar uma interacao temporaria de media picker antes de chamar `input.click()`.
- Enquanto o seletor nativo esta aberto, manter o controle de midia montado mesmo que o textarea dispare blur.
- Ao selecionar arquivo, aplicar a miniatura, liberar o estado temporario e refocar o campo do comentario.
- Ao retornar do seletor sem arquivo, liberar o estado temporario e refocar o composer, preservando a regra de que o controle aparece apenas com o campo em foco ou com midia selecionada.

Consequencias:

- O clique em `Anexar midia` deixa de perder a selecao por desmontagem do input.
- O fluxo de enviar somente midia continua valido.
- Nao ha mudanca em backend, schema, endpoints, storage, upload, permissoes, formatos aceitos ou validacao de conteudo.

Validacao complementar:

- `pnpm --dir frontend biome:fix`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- `git diff --check`: sucesso.
