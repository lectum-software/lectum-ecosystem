# ADR-0191: Layout social de compartilhamento de video-resposta

## Status

Accepted

## Task relacionada

TASK-42

## Contexto

A Lectum passara a ser tambem uma fonte de criacao de conteudo para psicologos. Videos-resposta feitos na comunidade devem poder ser compartilhados em redes sociais mantendo uma identidade visual padronizada da Lectum, mas sem parecer peca institucional.

As decisoes de produto definidas em 2026-06-30 foram: usar o mesmo botao Share, oferecer somente o formato vertical 9:16, remover play central, nao desenhar CTA/link clicavel, exibir "Pergunta na Lectum", usar titulo do post ou previa do comentario e inicialmente suprimir identidade do psicologo, funcao, selo e wordmark de rodape no arquivo compartilhavel. Em 2026-07-01, a regra evoluiu para reintroduzir apenas uma tag compacta sem foto de perfil, com nome limitado a 18 caracteres e selo de verificado, sem funcao, CRP ou wordmark de rodape. A mudanca evita conflito com a UI de Reels/TikTok/Instagram, que ja exibe dados de usuario e controles no rodape. O formato quadrado/feed foi removido no mesmo dia apos validacao visual no localhost porque comprimia demais video e pergunta. A tela de compartilhamento tambem foi simplificada para se aproximar da galeria do celular: sem textos acima do video, apenas botao X e opcoes abaixo. Em seguida, a linha de acoes foi ajustada para `Copiar link`, `WhatsApp`, `Instagram`, `TikTok` e `Mais`, removendo a opcao direta de baixar. Para manter a folha mais limpa, o preview e os botoes deixaram de ter sombras externas. A interacao da modal foi refinada com animacao vertical de entrada/saida, gesto de arrastar para baixo, fechamento por `X` e fechamento ao clicar fora. Quando a resposta profissional tem texto escrito, a modal exibe ate duas linhas abaixo do preview e oferece copia discreta por icone para uso como legenda escrita.

## Decisao

- O layout social sera gerado no frontend com APIs nativas do navegador (`canvas`, `MediaRecorder`, `canvas.captureStream`, Web Share API e clipboard), sem package novo.
- O Share existente continua sendo a unica entrada. Para video-resposta profissional, abre um modal Lectum com preview vertical 9:16 unico para Stories/Reels/TikTok/Shorts; para outros casos, mantem o compartilhamento de link existente.
- A arte exportada renderiza video de fundo, card da pergunta/comentario no topo e uma tag compacta do psicologo no terco inferior do video, sem foto de perfil, com nome limitado a 18 caracteres e selo quando verificado; continua sem funcao, sem CRP, sem wordmark `lectum` no rodape, sem play central, sem CTA e sem variante quadrada/feed.
- O card da pergunta/comentario usa visual inspirado na caixinha do Instagram: faixa superior azul Lectum, texto "Pergunta na Lectum" em branco e corpo claro com a pergunta.
- O modal usa padrao de share sheet: preview no topo, botao X de saida e uma unica linha abaixo do video com `Copiar link`, `WhatsApp`, `Instagram`, `TikTok` e `Mais`. Atalhos visuais como WhatsApp, Instagram e TikTok acionam a Web Share API nativa; a web nao consegue garantir abertura direta de um app especifico com arquivo anexado.
- Se o video-resposta tambem tiver texto escrito pelo psicologo, a modal mostra ate duas linhas abaixo do preview, sem titulo e sem fundo cinza, com copia por icone discreto. Esse texto tambem e enviado como `text` na Web Share API, sem depender de que Instagram/TikTok aceitem preencher a legenda automaticamente.
- A confirmacao de copia do texto usa `toast.success` global no topo da tela, evitando faixa verde inline que aumenta a altura da modal.
- No desktop, o preview e as acoes reduzem escala para caber sem scroll interno na modal; o clique fora da sheet fecha o compartilhamento por backdrop dedicado.
- O preview da modal deve preservar a proporcao visual 9:16. Para isso, a largura e calculada considerando o limite de altura disponivel, em vez de aplicar `max-height` que poderia comprimir o card.
- Os icones de WhatsApp, Instagram e TikTok ficam salvos como SVGs locais em `frontend/public/svg/brand-*.svg`, derivados do Simple Icons, para evitar instalar package novo. Na share sheet, a cor/fundo de marca ocupa todo o bloco visual do botao, enquanto o simbolo interno branco mantem tamanho equivalente ao icone de `Copiar link`.
- O preview do video, os botoes da linha de acoes e o botao `X` nao usam sombras externas; a hierarquia passa a depender de borda, espacamento e contraste.
- A bottom sheet usa transicao de `transform`/opacidade para entrada e saida, sem package novo, e aceita gesto de arrastar para baixo com threshold de fechamento.
- A linha de acoes deixa de usar rolagem horizontal visivel quando as cinco opcoes cabem na modal.
- O backend apenas enriquece os DTOs de `highlighted_professional_reply` com `parent_reply_id` e `parent_content`, permitindo usar a previa do comentario em cards/listagens sem novo endpoint e sem migration.
- O evento real continua sendo persistido via `POST /api/private/posts/:id/replies/:replyId/share` quando houver Web Share API ou fallback com copia de link.
- A exportacao usa a duracao real conhecida da midia; apenas quando a metadata de duracao esta ausente ou invalida aplica fallback curto para evitar travamento no browser.

## Consequencias

- A solucao fica disponivel sem dependencia externa, fila de renderizacao server-side ou integracao direta com Instagram/TikTok.
- A remocao do quadrado reduz escolha no modal e evita exportacao com composicao espremida.
- A remocao do header textual acima do preview deixa o fluxo mais parecido com compartilhamento de midia nativa no celular.
- A remocao de funcao, CRP e wordmark no rodape reduz excesso visual quando a rede social adiciona controles; a tag compacta preserva autoria profissional dentro do video sem competir com a UI nativa.
- A copia discreta por icone melhora o fluxo de legenda escrita sem exigir integracao direta com Instagram/TikTok nem prometer preenchimento automatico do campo de legenda dessas plataformas.
- A remocao da acao direta de baixar reduz ruido visual; download permanece apenas como fallback quando o browser nao suporta compartilhamento com arquivo.
- SVGs locais reduzem dependencia de CDN/runtime e preservam melhor a leitura dos icones de marca, mas continuam sujeitos as regras de marca dos respectivos proprietarios.
- Os atalhos de apps sao affordances visuais para o compartilhamento nativo; a selecao final do app continua dependendo da folha nativa do sistema operacional/navegador.
- A compatibilidade depende do navegador: Web Share API com arquivos, `MediaRecorder`, codecs, audio via `captureStream` e CORS de midia podem variar.
- Quando o navegador nao suportar o fluxo completo, o fallback baixa o arquivo gerado e tenta copiar o link direto; essa limitacao e exibida na UI sem mascarar suporte.
- Como a renderizacao acontece no cliente, a identidade visual do canvas usa valores fixos da marca quando necessario, enquanto a UI do modal continua baseada nos tokens existentes.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local em `http://localhost:3000/community` com Chrome headless mobile (390x844), confirmando render da rota publica sem erro; a base de desenvolvimento local nao possui video-resposta profissional real para abrir o modal sem criar dados artificiais.
- Ajuste vertical-only em 2026-06-30: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Ajuste share sheet em 2026-06-30: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Ajuste de icones/linha unica em 2026-06-30: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Ajuste visual sem sombras em 2026-06-30: remover sombreamento externo do preview, dos botoes e do `X`; validar junto aos checks frontend/root e rota local da task.
- Ajuste visual de icones em 2026-06-30: botoes de WhatsApp, Instagram e TikTok passaram a separar fundo de marca em tela cheia do botao e simbolo interno pequeno, removendo o fundo claro intermediario sem ampliar o simbolo.
- Ajuste de interacao em 2026-06-30: animacao vertical de entrada/saida e gesto de arrastar para baixo para fechar a share sheet; validar junto aos checks frontend/root e rota local da task.
- Ajuste visual de rolagem em 2026-06-30: remover barra horizontal visivel abaixo dos botoes, distribuindo as cinco acoes na linha.
- Ajuste de proporcao do preview em 2026-06-30: remover `max-height` do preview e calcular largura por `min(76vw, 320px, 34.875dvh)` mantendo `aspect-ratio: 9 / 16`.
- Ajuste de composicao/legenda escrita em 2026-06-30: card superior alterado para "Pergunta na Lectum", identidade/wordmark de rodape removidos do preview e da exportacao canvas, e bloco opcional com copia por icone adicionado abaixo do preview para respostas com texto escrito.
- Validacao do ajuste de composicao/legenda escrita em 2026-06-30: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Ajuste de refinamento visual em 2026-06-30: card com faixa azul/topo branco, legenda escrita sem titulo/fundo cinza e copia por icone, feedback de copia por toast global, escala desktop sem scroll interno e fechamento por `X`/backdrop. Validado com `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Correção de interação em 2026-06-30: feedbacks positivos deixam de renderizar faixa verde inline dentro da share sheet e usam somente `toast.success`; `X`/backdrop fecham por `pointerdown` com guarda de fechamento único; a escala desktop foi reduzida e a sheet usa `touch-none`/vídeo sem ponteiro para habilitar o gesto de arrastar para baixo no mobile.
- Validação da correção em 2026-06-30: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Correção visual em 2026-06-30: o card superior do preview no desktop passou a usar tipografia e espaçamento reduzidos em breakpoint `sm`, preservando a proporção do modelo vertical sem parecer ampliado em relação ao vídeo.
- Validação da correção visual do card em 2026-06-30: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Decisão complementar em 2026-06-30: o compartilhamento agora diferencia conteúdo textual, post original de psicólogo com mídia e vídeo-resposta. Conteúdo textual abre apenas a share sheet de link (`Copiar link` e `WhatsApp`); mídia original de psicólogo usa `Postado na Lectum`; vídeo-resposta usa `Respondido na Lectum`; carrossel exporta a primeira imagem no MVP; vídeo horizontal é preservado em canvas 9:16 com fundo preto/letterbox para evitar cortes automáticos.
- Validação das novas regras de compartilhamento em 2026-06-30: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Ajuste complementar em 2026-07-01: o texto de legenda abaixo do preview passou a ter menor peso visual; posts originais de psicologo com midia reutilizam o `content` do post como legenda/copiar texto; e o card superior reduziu a escala do corpo e passou a limitar titulo/previa a 2 linhas com reticencias tambem no canvas exportado.
- Validacao do ajuste complementar em 2026-07-01: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Ajuste premium do card em 2026-07-01: o card superior do layout social passou a usar proporcao mais estreita, cantos menos arredondados, sombra mais sutil, header compacto e corpo com peso visual menor. A mesma decisao foi refletida no canvas exportado para manter consistencia entre preview e arquivo compartilhavel.
- Validacao do ajuste premium do card em 2026-07-01: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Ajuste de escala desktop em 2026-07-01: a modal social desktop aumentou sua largura maxima e o preview 9:16 passou a usar mais altura disponivel da tela, mantendo a proporcao visual dos elementos e sem alterar a exportacao do arquivo compartilhavel.
- Validacao do ajuste de escala desktop em 2026-07-01: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Refinamento premium do card em 2026-07-01: a composicao do card superior passou a usar proporcao mais editorial, gradiente azul no header, fundo branco com leve tonalidade no corpo, sombra interna/externa mais polida, cantos mais contidos e tipografia menos pesada. A mesma regra foi aplicada ao canvas 9:16 para manter consistencia entre preview e arquivo compartilhavel.
- Validacao do refinamento premium em 2026-07-01: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Ajuste de autoria profissional em 2026-07-01: o preview e o canvas exportado passaram a renderizar uma tag compacta do psicologo no terco inferior do video, com nome normalizado sem `Dra./Dr.` e selo quando verificado. A decisao preserva a autoria dentro do arquivo compartilhavel sem voltar a exibir foto de perfil, funcao, CRP ou wordmark de rodape.
- Validacao da tag de autoria em 2026-07-01: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Refinamento de tag/card em 2026-07-01: a tag do psicologo foi centralizada no video, ganhou fundo mais translucido e passou a exibir o cargo em linha menor abaixo do nome. Nomes longos ficam limitados a 18 caracteres antes de `...`, mantendo selo e cargo legiveis.
- Correcao do card superior em 2026-07-01: o texto da pergunta/titulo foi reduzido e o preview passou a usar clamp CSS explicito de 2 linhas para impedir vazamento de uma terceira linha apos `...`; o canvas exportado acompanhou com fonte, padding e line-height menores.
- Validacao do refinamento de tag/card em 2026-07-01: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Refinamento de tag em 2026-07-01: a tag ficou menor, sem foto de perfil, com nome/cargo alinhados entre si e com line-height do cargo ajustado para nao cortar a base do `g` em `Psicologo`.
- Refinamento do card superior em 2026-07-01: os cantos do card `Respondido na Lectum`/`Postado na Lectum` foram reduzidos novamente no preview e no canvas para preservar uma aparencia mais premium.
- Ajuste visual em 2026-07-01: a opacidade do background da tag do psicologo foi reduzida novamente no preview e no canvas exportado para diminuir interferencia sobre a imagem do video.
- Ajuste visual em 2026-07-01: o background da tag do psicologo foi removido no preview e no canvas exportado; a autoria permanece como texto branco com sombra discreta e selo quando verificado.
- Validacao do ajuste sem background em 2026-07-01: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.

## Complemento 2026-07-01: largura da share sheet textual no desktop

A share sheet de conteudo textual preserva o fluxo simples de link, sem preview social e com apenas `Copiar link` e `WhatsApp` habilitados. No desktop, a largura maxima da sheet textual passa a ser 430px, alinhada a base mobile-first existente, para que a linha completa `Copiar link`, `WhatsApp`, `Instagram`, `TikTok` e `Mais` permaneça visivel sem corte lateral apesar do padding interno da modal. Nao houve mudanca de canal, payload, persistencia de `post_share`, fallback ou composicao social 9:16.

Validacao complementar: `pnpm --dir frontend exec biome check --write "src/components/share/lectum-share-video-modal.tsx"`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, HTTP local `200` em `/community/autocuidado-em-pratica/post/cmr26lrh70003nouhg6pd23j6` e Chrome/CDP local desktop 1365x768 confirmando as cinco acoes dentro da sheet de 430px.

## Complemento 2026-08-12: clamp real de duas linhas no card de pergunta

O preview da share sheet continuava exibindo uma terceira linha cortada no card superior `Respondido na Lectum`. A causa provavel era a combinacao de `-webkit-line-clamp` com padding vertical no mesmo elemento textual, comportamento que pode vazar linhas extras em WebKit/iOS.

Decisao complementar:

- Manter o layout 9:16 e o card superior existentes.
- Separar o padding do card em um wrapper e aplicar `-webkit-line-clamp: 2` somente no elemento interno de texto.
- Adicionar `max-height` equivalente a duas linhas no elemento clampado para impedir que uma terceira linha seja parcialmente visivel.
- Remover a truncagem fixa por quantidade de caracteres no preview HTML, deixando a largura real do card determinar a elipse de duas linhas.
- Reforcar o `wrapText` do canvas/exportacao para respeitar `maxQuestionLines=2` e aplicar reticencias na ultima linha quando houver truncagem.

Consequencias:

- Preview e arquivo exportado ficam alinhados: pergunta/titulo em ate duas linhas, com reticencias quando necessario.
- A mudanca e apenas visual no frontend; nao altera API, backend, banco, envs, packages, persistencia de `post_share`, upload ou tracking.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso, repetido apos o bump em `0.1.76`.
- `pnpm --dir frontend build`: sucesso, repetido apos o bump em `0.1.76`.
- Next local buildado em `http://127.0.0.1:3050`: `/version` respondeu `0.1.75`, a rota `/comunidades/ansiedade-em-equilibrio/publicacao/demo-post-ansiedade-apresentacao-video` respondeu `200`, e validacao estatica confirmou `maxHeight: "2.16em"` no clamp do preview e `maxQuestionLines: 2`/reticencias no canvas; repetido em `http://127.0.0.1:3051` apos o bump, com `/version` em `0.1.76` e rota `200`.
- `pnpm check`: sucesso.
- `pnpm check:encoding`: sucesso.
- `pnpm check:adrs`: sucesso.
- `pnpm check:tasks`: sucesso.
- `git diff --check`: sucesso.
- `pnpm version:bump` para `0.1.76`: sucesso.
- `pnpm check:version`: sucesso.

## Complemento 2026-08-12 - audio audivel no preview de compartilhamento

### Contexto

O preview do layout social de compartilhamento usava `<video muted autoplay loop>`, o que garantia reproducao automatica silenciosa, mas impedia ouvir o audio original antes de compartilhar. A experiencia desejada e permitir que o usuario confira o som do video dentro da propria share sheet.

### Decisao

Extrair o preview social para `SharePreview` e alterar o comportamento de videos:

- tentar iniciar a previa com som usando `playVideoWithSound`;
- se o navegador bloquear autoplay com audio, manter o video tocando mudo como fallback visual honesto;
- exibir um botao discreto de som no preview para ativacao por gesto do usuario;
- preservar a exportacao existente, que adiciona ao canvas as trilhas de audio obtidas via `captureStream` quando suportadas pelo navegador.

### Consequencias

- Browsers que permitem reproducao com som apos a acao de compartilhar passam a abrir a previa audivel.
- Em iOS/Safari e outros navegadores com politica restritiva, a previa continua visivel e o usuario pode tocar no botao de som para ativar audio sem quebrar autoplay mudo.
- A modal ficou menor porque o preview foi isolado em arquivo dedicado.
- Nao ha alteracao de backend, banco, endpoints, packages, envs, storage ou tracking.

### Validacao

- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- Validacao estatica via Node para confirmar som habilitado no preview, fallback com botao de audio e preservacao de trilhas de audio na exportacao.
- Browser local/headless mobile em 390x844 na rota do detalhe de post com video, antes e apos o bump para `0.1.80`.
- `pnpm version:bump` para `0.1.80` e `pnpm check:version`.

## Complemento 2026-08-22 - preparo antecipado e payload movel do Web Share

### Contexto

A captura do usuario mostrou erro ao tentar compartilhar/uploadar a arte de video-resposta para WhatsApp e redes sociais. A investigacao usou a midia real em homologacao (`/public/files/posts/media/ocjjmug8tro0hls869qoddta.mp4`) e confirmou que a rota publica retornava CORS adequado e que Chrome conseguia carregar a midia, desenhar canvas e gerar arquivo. A causa provavel estava na ordem do fluxo: o arquivo era gerado depois do toque no app social; em videos longos, a chamada `navigator.share()` acontecia apenas apos a renderizacao client-side, fora da ativacao transiente exigida por navegadores moveis para abrir a share sheet nativa.

### Decisao

- Iniciar a preparacao do arquivo social quando a modal abre, usando a mesma geracao real por canvas/MediaRecorder ja aprovada na TASK-42.
- Manter WhatsApp, Instagram, TikTok e Mais desabilitados ate o arquivo estar pronto, com copy curta de preparo.
- No clique do usuario, chamar o compartilhamento com o arquivo ja preparado, reduzindo o risco de bloqueio por perda do gesto.
- Separar a preparacao (`prepareLectumShareFile`) do compartilhamento (`sharePreparedLectumVideoResponse`) para evitar regerar o arquivo por destino.
- Tentar Web Share com `files + text + title`; se `navigator.canShare` recusar, tentar `files`-only antes de cair para download/copia.
- Se `navigator.share()` falhar por motivo tecnico diferente de cancelamento do usuario, usar fallback honesto de download/copia de link.
- Nao alterar backend, storage, contratos, schema, envs, providers, eventos de compartilhamento ou packages.

### Consequencias

- O clique no destino social passa a ser leve e imediato quando o arquivo ja esta pronto, mais compativel com iOS/Android.
- O usuario ve que o arquivo esta sendo preparado, em vez de tocar imediatamente e receber erro generico.
- Destinos moveis que nao aceitam texto/titulo com arquivo ainda podem receber o arquivo por `files`-only.
- O fallback continua honesto: quando o compartilhamento nativo nao aceita arquivo, baixa o arquivo gerado e copia o link quando o navegador permite.
- Rollback: reverter este complemento volta a gerar o arquivo apenas no clique e a usar o payload anterior do Web Share; nao ha impacto persistente em dados ou integracoes.

### Validacao

- HEAD/GET da midia real de homologacao com origem do frontend confirmou CORS, tipo MP4, tamanho e range.
- Chrome/CDP validou canvas/toBlob/MediaRecorder com a midia real, descartando CORS/canvas como causa no Chrome.
- Teste unitario novo cobre payload completo, fallback `files`-only, ausencia de share nativo e cancelamento `AbortError`.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso apos o bump para `0.1.173`.
- Smoke local do frontend buildado em `http://127.0.0.1:3185`: `/version` respondeu `0.1.173`.
- `pnpm version:bump` para `0.1.173` e `pnpm check:version`: sucesso.
- `pnpm check`: sucesso.
## Complemento 2026-08-22 - supressao da modal Lectum no caminho principal

### Contexto

Novo feedback do usuario mostrou que a share sheet da Lectum estava duplicando a experiencia nativa: a aplicacao exibia uma modal propria com previa e botoes de WhatsApp/Instagram/TikTok/Mais, e cada botao abria outra folha de compartilhamento do celular. A etapa intermediaria aumentava atrito e confundia a hierarquia de acoes.

### Decisao

- Remover a `LectumShareVideoModal` e o preview HTML proprio do caminho principal de compartilhamento.
- Criar `useLectumDirectShare` para centralizar preparo real de arquivo, chamada a `navigator.share()`, fallback e tracking.
- Em targets com midia/video, continuar usando a exportacao real por canvas/MediaRecorder e o fallback `files`-only quando metadata junto com arquivo nao for aceita.
- Em targets textuais, tentar Web Share de `title/text/url` diretamente e copiar o link apenas quando o share nativo nao estiver disponivel.
- Manter a limitacao explicita: navegadores web nao garantem abertura direta de app especifico com arquivo anexado; a folha nativa do sistema e a responsavel por listar WhatsApp, Instagram, TikTok, Salvar etc.
- Nao alterar backend, storage, contratos, banco, envs, providers, packages ou eventos persistentes.

### Consequencias

- O usuario nao ve mais uma modal Lectum antes da folha nativa do dispositivo.
- O fluxo fica mais alinhado ao comportamento de iOS/Android: uma unica folha nativa decide destino e acoes.
- A geracao de video continua podendo exigir tempo de preparo; se o navegador perder permissao/ativacao ou nao suportar arquivo, o fallback baixa o arquivo e copia o link quando permitido.
- O tracking deixa de depender de estado de modal e passa a ser executado pelo hook compartilhado quando ha canal conhecido (`web_share` ou `clipboard`).
- Rollback: reintroduzir a modal removida e voltar a setar `shareVideoTarget` nas superficies de feed/detalhe/perfil/salvos/minhas publicacoes.

### Validacao

- Teste unitario do resolvedor de payload de link alem dos testes existentes de arquivo, `files`-only e cancelamento nativo: sucesso.
- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso em `0.1.175`.
- Smoke local do frontend buildado em `http://127.0.0.1:3186`: `/version` respondeu `0.1.175` e `/comunidades` respondeu `200`.
- `pnpm check`: primeira tentativa teve timeout transitorio em testes de boot safety do backend; repeticao isolada de `pnpm --dir backend check` e segunda execucao completa de `pnpm check` passaram.
- Smoke de homologacao apos push automatico de `homolog` sera reportado ao usuario.

## Complemento 2026-08-22 - preparo silencioso e ativacao nativa

### Contexto

Novo feedback mostrou tres problemas no compartilhamento direto: durante o toast de preparo o audio do video tocava em segundo plano; no iOS, apos a geracao, a aplicacao podia cair em uma tela cinza de arquivo antes da folha nativa; e o arquivo ainda aparecia com nome tecnico `lectum-respondido-vertical-9x16`.

### Decisao

- O elemento `<video>` criado apenas para exportacao por canvas/MediaRecorder deve ser sempre silencioso (`muted=true` e `volume=0`) antes de qualquer `play()`, pois ele nao e um player visivel ao usuario.
- Perdas de ativacao do Web Share (`NotAllowedError`/`SecurityError`) nao devem acionar fallback de download automatico. O arquivo preparado fica em cache e a UI instrui o usuario a tocar novamente em compartilhar para reutilizar o arquivo dentro de um novo gesto.
- Quando o arquivo ja esta cacheado, o hook de compartilhamento chama `navigator.share()` de forma imediata no toque, preservando a ativacao transiente sempre que o navegador permitir.
- O fallback de download/copia de link permanece apenas para cenarios em que compartilhamento de arquivo nativo nao existe ou nao e suportado pelo navegador.
- O nome do arquivo e o `shareTitle` de midia passam a usar o nome do profissional e o contexto de origem: `[Nome do psicologo] - Respondido na Lectum` ou `[Nome do psicologo] - Postado na Lectum`.

### Consequencias

- O preparo do arquivo deixa de emitir audio de fundo, mantendo a tela atual limpa enquanto o usuario aguarda.
- Em iOS/Safari, a experiencia evita abrir automaticamente a tela cinza de download quando o problema e apenas perda de gesto; o usuario faz um segundo toque com o arquivo ja pronto.
- A Web Share API continua limitada pelo sistema operacional e pelo navegador: nao ha API web confiavel para forcar a folha nativa depois de uma renderizacao longa se a ativacao do usuario ja expirou.
- Arquivos compartilhados deixam de expor um nome tecnico e passam a aparecer com autoria/contexto claros.
- Nao ha alteracao de backend, banco, storage, envs, providers, packages ou dados persistidos.
- Rollback: reverter este complemento volta ao comportamento anterior de preparo audivel, download automatico em perda de ativacao e nome tecnico de arquivo.

### Validacao

- Testes unitarios cobrem reconhecimento de perda de ativacao e nome do arquivo com profissional/contexto.
- `pnpm --dir frontend check`: sucesso.
- Validacoes finais, build, versionamento e smoke constam na TASK-42.


## Complemento 2026-08-22 - audio preservado sem saida audivel

### Contexto

A correcao anterior silenciou o elemento de video invisivel usado para gerar o arquivo compartilhavel, evitando audio de fundo durante o toast de preparo. Novo feedback mostrou que o arquivo exportado passou a chegar sem audio nas redes sociais, indicando que a mesma decisao de `muted/volume=0` tambem silenciava a trilha capturada para gravacao em alguns navegadores.

### Decisao

- Capturar a trilha de audio do video por Web Audio durante a exportacao por canvas/MediaRecorder.
- Conectar `MediaElementAudioSourceNode` a `MediaStreamAudioDestinationNode` e adicionar as tracks do destination ao stream do `MediaRecorder`.
- Nao conectar o grafo a `audioContext.destination`, mantendo o preparo sem saida audivel para o usuario.
- Se Web Audio nao estiver disponivel ou nao produzir track, manter o video invisivel em silencio e exportar sem audio como fallback seguro, em vez de reproduzir audio em segundo plano.
- Nao alterar backend, storage, contratos, banco, envs, providers, packages ou dados persistidos.

### Consequencias

- Browsers com Web Audio e permissao de reproducao no gesto de compartilhamento passam a gerar arquivo com audio novamente.
- O preparo continua imersivo e silencioso na tela atual, sem regressao do problema de audio de fundo.
- O suporte segue dependente de APIs nativas do navegador; onde a captura de audio nao existir, o fallback e video silencioso, nao erro tecnico nem som invisivel.
- Rollback: reverter este complemento volta ao preparo sempre mudo, com risco de arquivo compartilhado sem audio.

### Validacao

- Teste unitario estatico cobre uso de `createMediaElementSource(video)`, `createMediaStreamDestination()`, adicao de tracks ao stream do recorder e ausencia de conexao com `audioContext.destination`.
- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- Validacoes finais, build, versionamento e smoke constam na TASK-42.

## Complemento 2026-08-22 - remocao do corte fixo de 60 segundos

### Contexto

Novo feedback mostrou que videos-resposta mais longos eram enviados incompletos para a rede social. O exemplo tinha duracao original de 2:07, mas o arquivo gerado pela Lectum chegava com aproximadamente 1 minuto. A causa era o limite defensivo original de 60 segundos na exportacao por canvas/MediaRecorder.

### Decisao

- Remover o teto fixo de 60 segundos da exportacao de videos compartilhaveis.
- Centralizar a resolucao de duracao em `lectum-share-media/duration.ts`: videos com metadata valida usam a duracao real; videos sem metadata usam fallback de 15 segundos.
- Manter timeout defensivo proporcional (`duracao * 1.25 + 15s`) para impedir loop infinito quando o browser nao dispara `ended`, mas sem cortar videos longos saudaveis.
- Preservar a captura de audio por Web Audio e a ausencia de conexao com saida audivel decididas no complemento anterior.
- Nao alterar backend, storage, contratos, banco, envs, providers, packages ou dados persistidos.

### Consequencias

- Arquivos compartilhados pela Lectum podem ter a duracao completa do video original quando o navegador informa metadata valida.
- Videos longos demoram proporcionalmente mais para preparar; o retry cacheado da folha nativa continua sendo o caminho seguro quando o preparo excede a ativacao transiente do gesto.
- O arquivo gerado pode ficar maior; o limite final de aceitacao do app de destino continua fora do controle da Web.
- Rollback: restaurar um teto fixo volta a reduzir tempo/tamanho de preparo, mas reintroduz corte de videos acima desse teto.

### Validacao

- Teste unitario cobre video de 127 segundos e 60,5 segundos mantendo a duracao real, alem do fallback de metadata invalida.
- Teste estatico confirma ausencia de `MAX_VIDEO_EXPORT_SECONDS` na exportacao.
- Validacoes finais, build, versionamento e smoke constam na TASK-42.

## Complemento 2026-08-22 - cache temporario do video com arte

### Contexto

Depois da remocao do corte fixo, videos longos passaram a ser preparados por toda a duracao real. Isso corrige o arquivo incompleto, mas aumenta o tempo de preparo no navegador. O usuario confirmou que nem todo video sera compartilhado e que pre-renderizar tudo no backend/upload aumentaria custo/armazenamento sem necessidade. Tambem ficou claro que manter duas versoes permanentes do mesmo video nao e desejavel.

### Decisao

- Criar cache temporario sob demanda do arquivo social com arte por 15 dias, usando a geracao real do frontend como origem.
- Nao pre-renderizar videos no upload original e nao criar arte para conteudo que nunca foi compartilhado.
- Persistir metadados em `post_share_artifacts`, com `cache_key` derivado do alvo, URL da midia fonte, fingerprint de conteudo/autoria e `layout_version`.
- Armazenar o objeto publico em R2 sob `posts/share-artifacts/`, com `Cache-Control: public, max-age=3600` para evitar cache longo alem da TTL de negocio.
- Expor leitura publica de cache para que compartilhamentos futuros possam reutilizar a arte sem autenticar; manter o upload autenticado para evitar abuso do bucket publico.
- No frontend, consultar o cache antes de chamar `prepareLectumShareFile`; se o artefato existir e estiver valido, baixar o arquivo publico, salvar no cache em memoria e abrir a folha nativa.
- Quando nao houver arte valida, manter a exportacao client-side por canvas/MediaRecorder e persistir o arquivo em background apos a geracao, sem bloquear o compartilhamento atual.
- Limpar artefatos expirados por scheduler no backend. As envs `POST_SHARE_ARTIFACT_CLEANUP_ENABLED`, `POST_SHARE_ARTIFACT_CLEANUP_INTERVAL_MS` e `POST_SHARE_ARTIFACT_CLEANUP_BATCH_SIZE` sao opcionais; sem configuracao, a limpeza roda com defaults seguros.
- Se outro upload substituir o mesmo `cache_key`, remover best-effort o objeto antigo para evitar duas versoes ativas do mesmo alvo.

### Consequencias

- O primeiro compartilhamento de um video ainda pode exibir preparo, porque a arte precisa ser gerada pelo navegador ao menos uma vez.
- Compartilhamentos posteriores, inclusive apos reload/outro dispositivo, podem reutilizar o arquivo com arte enquanto ele nao expirar, reduzindo espera e chance de perder a ativacao da Web Share API.
- O armazenamento cresce apenas para videos efetivamente compartilhados e por tempo limitado; nao ha fila de renderizacao, worker de video nem custo de CPU backend para todos os uploads.
- A midia original continua sendo a fonte canonica do post/resposta. A arte e derivada, temporaria e pode ser regenerada se expirar ou se o layout/fingerprint mudar.
- Visitantes anonimos podem reutilizar arte ja existente, mas nao podem criar novos arquivos no bucket; se nao houver cache, geram localmente sem persistir.
- Rollback: remover as chamadas frontend de cache e desabilitar as rotas/scheduler volta ao comportamento anterior de cache apenas em memoria. A tabela/objetos temporarios podem expirar naturalmente ou ser limpos pelo scheduler antes de uma contracao futura.
- Deploy: backend deve subir antes ou junto do frontend. O frontend tolera ausencia/falha do cache porque cai para geracao client-side; o backend tolera frontend antigo porque as rotas sao aditivas. Nao ha env obrigatoria nova.

### Validacao

- `pnpm --dir backend db:migrate --name add-post-share-artifacts` aplicado com sucesso, criando `20260822183235_add_post_share_artifacts`.
- Validacoes finais de backend, frontend, root, versionamento e smoke constam na TASK-42.


## Complemento 2026-08-22 - caixinha com logo Lectum e autoria mais legivel

### Contexto

Novo feedback comparou a caixinha de pergunta da Lectum com a referencia visual do Instagram. A decisao de usar header compacto com copies genericas como `Pergunta recebida` ou `Pergunta anonima` foi descartada pelo usuario; a intencao e manter `Respondido na Lectum` e reforcar reconhecimento de marca com a logo da plataforma. O usuario tambem sinalizou que o header e o corpo da pergunta estavam menores que a referencia, que o icone nao deveria ter fundo branco/azul e que `Psicologo` deveria alinhar pela esquerda com o nome.

### Decisao

- Manter a copy de contexto do compartilhamento (`Respondido na Lectum`/`Postado na Lectum`) no header do card.
- Carregar o SVG publico `/logo-icon.svg` como asset opcional do canvas, converter o asset carregado em mascara branca e desenhar somente o simbolo branco ao lado do texto do header, sem chip/fundo branco.
- Tornar o card superior mais proximo do formato de stories: largura maior, cantos mais arredondados, header maior, corpo de pergunta maior e limite de ate 3 linhas antes de reticencias.
- Aumentar a tipografia do nome do profissional, centralizar o conjunto nome+selo e separar `Psicologo` por um gap vertical explicito, mas mantendo o cargo alinhado pela esquerda com o inicio do nome.
- Preservar fallback seguro: falha no SVG nao impede a geracao do arquivo; o header volta para texto centralizado.
- Atualizar `POST_SHARE_ARTIFACT_LAYOUT_VERSION` para `lectum-share-v3-2026-08-22-white-logo-large-card`, evitando reaproveitar arte temporaria antiga com escala/logo anteriores; nao alterar APIs, banco, storage, envs, providers, packages, tracking ou dados persistidos neste complemento.

### Consequencias

- O arquivo social fica mais reconhecivel como Lectum sem adicionar wordmark de rodape nem competir com a UI nativa do Instagram/TikTok/Reels.
- Header e pergunta ganham escala mais proxima da caixinha de stories, reduzindo friccao cognitiva para quem ja conhece esse padrao.
- A autoria do profissional fica mais legivel em video mobile, mantendo o cargo discreto, separado e alinhado ao inicio do nome.
- A renderizacao passa a aguardar um asset leve de marca e a gerar uma mascara branca antes do canvas; se o carregamento falhar, a experiencia continua operacional.
- Rollback: reverter este complemento retorna ao card com header/corpo menores, logo azul com chip, nome menor e cargo centralizado/proximo.

### Validacao

- Teste unitario estatico cobre uso de `/logo-icon.svg`, mascara branca da logo, ausencia do chip por arco no icone, largura/min-height do card, header/corpo maiores, limite de 3 linhas, nome maior, gap do cargo, alinhamento do cargo ao nome e layout_version v3.
- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs`: sucesso.
- `pnpm check:version`: sucesso em `0.1.181`.
- Validacoes finais, build, versionamento e smoke constam na TASK-42.

## Complemento 2026-08-22 - safe area da caixinha no Instagram/Reels

### Contexto

Novo feedback analisou a arte depois de postada no Instagram/Reels. A caixinha de pergunta estava grande e legivel, mas posicionada alta demais, competindo com a linha nativa do app composta por seta de voltar, titulo `Reels` e icone de camera. Em telas altas, o Instagram tambem pode preencher a altura e recortar laterais do video 9:16, fazendo cards muito largos parecerem colados nas bordas.

### Decisao

- Manter a escala do texto da pergunta e do header aprovada no complemento anterior.
- Deslocar o card superior para baixo no canvas 1080x1920, criando safe area para a UI nativa de Reels/status bar antes da caixinha.
- Reduzir levemente a largura do card e seu padding horizontal para ficar dentro da area central segura quando o Instagram exibe o video 9:16 em telas mais altas.
- Atualizar `POST_SHARE_ARTIFACT_LAYOUT_VERSION` para `lectum-share-v4-2026-08-22-instagram-safe-card`, evitando reutilizar arte temporaria antiga com card alto demais.
- Nao alterar backend de dados, storage, banco, rotas, payloads, envs, providers, packages ou tracking; a mudanca backend e somente a constante de versao do cache visual.

### Consequencias

- O arquivo social fica menos colado ao topo e se comporta mais como sticker do video, nao como uma barra sobreposta ao chrome do Instagram.
- A pergunta continua grande e legivel, mas o card ganha mais respiro e reduz risco de crop lateral em Reels.
- Arte ja cacheada com a versao visual anterior sera naturalmente ignorada por `layout_version`/`cache_key` e regenerada sob demanda.
- Rollback: reverter este complemento volta ao card v3 mais alto e largo; artefatos v4 temporarios podem expirar naturalmente pelo TTL existente.

### Validacao

- Teste unitario estatico cobre `x: 110`, `y: 250`, `width: 860`, `paddingX: 50` e `layout_version` v4.
- Validacoes finais, build, versionamento e smoke constam na TASK-42, com versao `0.1.182`.

## Complemento 2026-08-22 - arquivo social primeiro e video completo

### Contexto

Depois do experimento de priorizar link puro para melhorar o card do WhatsApp, o usuario reportou que a folha nativa perdeu opcoes de compartilhamento para Instagram Reels/Stories, que a arte da caixinha de pergunta deixou de seguir para redes sociais e que videos voltaram a chegar incompletos.

### Decisao

- O caminho principal para videos volta a ser o compartilhamento do arquivo social gerado por canvas/MediaRecorder, preservando a arte da pergunta e restaurando destinos que exigem arquivo.
- O link da Lectum permanece junto do payload quando o navegador/destino aceitar e como fallback de link se o arquivo nao puder ser preparado/compartilhado.
- Para video-resposta, `shareText` passa a ser o titulo do post; a arte continua usando `sourceText` para mostrar a pergunta/comentario no card.
- A exportacao deixa de depender de timeout curto quando a metadata nao e confiavel: videos sem duracao conhecida aguardam `ended` com hard cap alto, videos conhecidos recebem margem maior, e um controle de stall interrompe apenas quando `currentTime` para de progredir.
- Antes de parar o `MediaRecorder`, a exportacao chama `requestData()` best-effort para flush dos chunks finais.
- O upload do artefato temporario em background passa a ter timeout de 300s e a versao de cache muda para `lectum-share-v5-2026-08-22-file-first-complete-video`, evitando reutilizar arquivos anteriores potencialmente incompletos ou gerados sob decisao link-first.

### Consequencias

- A primeira tentativa pode voltar a exibir o preparo do arquivo, mas a folha nativa recebe um MP4 real e tende a oferecer Reels/Stories/Instagram alem de mensageiros.
- O fallback de link continua preservando abertura dentro da Lectum, mas nao e mais o caminho principal porque prejudica destinos de video.
- Arquivos longos podem demorar mais para preparar/uploadar em background; o cache temporario reduz essa espera nos compartilhamentos seguintes.
- Apps de destino ainda podem aplicar seus proprios cortes ou limites depois que recebem o arquivo completo; isso permanece fora do controle da Web.
- Deploy: frontend e constante backend de layout/cache, sem migration, env obrigatoria, package novo, provider, mock, seed ou dado publicado.

## Complemento 2026-08-22 - escolha explicita de destino para videos

### Contexto

A tentativa de resolver WhatsApp e Instagram pela mesma folha nativa mostrou uma limitacao estrutural: a Web Share API nao informa qual app sera escolhido antes do envio. O usuario aceitou o caminho de perguntar antes, desde que WhatsApp gere link estilo Instagram e Redes Sociais/Baixar mantenham o video com arte.

### Decisao

- Adicionar uma sheet mobile-first da Lectum somente para alvos de video profissional, com opcoes WhatsApp, Redes Sociais e Baixar.
- WhatsApp nao prepara nem envia arquivo; abre o deep link do WhatsApp com a URL publica especifica de preview, evitando reproducao de video dentro da conversa.
- Redes Sociais usa o fluxo existente de arquivo social 9:16 com canvas, cache temporario e Web Share API.
- Baixar reutiliza o mesmo arquivo social preparado/cacheado e dispara download local, sem abrir a folha nativa.
- Posts sem video seguem no fluxo direto anterior para nao apresentar uma modal com linguagem de video em compartilhamentos de imagem/texto.

### Consequencias

- A decisao transfere a escolha de canal para uma UI explicita do produto, removendo a ambiguidade impossivel de resolver depois que a folha nativa abre.
- WhatsApp ganha link clicavel e preview de pagina; Instagram/Reels/Stories continuam recebendo arquivo de video com a arte da caixinha de pergunta.
- O usuario passa por uma etapa a mais antes do compartilhamento de video, mas ela e necessaria para preparar payloads diferentes por canal.
- Rollback: voltar ao `useLectumDirectShare` direto nos pontos de chamada remove a sheet e retorna ao comportamento file-first unico.

## Complemento 2026-08-22 - arquivo social sem link para redes sociais

### Contexto

A folha nativa do iOS mostrou `1 Link e 1 Documento` quando a opcao Redes Sociais recebia arquivo de video e URL da Lectum no mesmo payload. O usuario confirmou que, para redes sociais, o link e inutil: Instagram/Reels/Stories precisam do arquivo com arte, enquanto a navegacao para a Lectum fica restrita ao caminho WhatsApp.

### Decisao

- Remover `url` e `text` do payload de arquivo usado por Redes Sociais, mantendo somente `files` e `title`.
- Usar o titulo `[Nome do psicologo] na Lectum` para o payload nativo e para o nome do arquivo compartilhavel/baixado.
- Reembrulhar artefatos temporarios recuperados do cache com o novo nome de arquivo, evitando reaproveitar nomes antigos como `Respondido na Lectum` quando o iOS decidir mostrar o nome do documento.
- Remover o fallback de link no destino Redes Sociais; se o share nativo por arquivo nao estiver disponivel, a Lectum baixa apenas o arquivo com arte.

### Consequencias

- A folha nativa deixa de receber `1 Link e 1 Documento` no destino Redes Sociais; o unico item semantico enviado e o arquivo social.
- O WhatsApp permanece como destino separado com link `/whatsapp`, preview Open Graph e abertura na Lectum.
- A Lectum nao controla totalmente o texto `1 Documento`, pois ele e gerado pelo iOS; o app apenas fornece `title` e nome de arquivo para aumentar a chance de exibir `[Nome do psicologo] na Lectum`.
- Rollback: restaurar `url`/`text` no payload de arquivo e o fallback de link volta a exibir `1 Link e 1 Documento` quando o iOS aceitar ambos.

## Complemento 2026-08-23 - sheet de destino compacta

### Contexto

O usuario enviou screenshot da sheet mobile `Compartilhar video` e pediu para reduzir a copy exibida antes de abrir o app de destino, removendo descricoes como `Envia um link com previa...` e substituindo o icone generico do WhatsApp pelo icone ja usado na Lectum. O print foi tratado como referencia visual; textos dentro da imagem nao foram considerados instrucoes autonomas alem do pedido explicito do usuario.

### Decisao

- Alterar a copy auxiliar para `Escolha o formato de compartilhamento.`
- Remover descricoes longas das tres opcoes e manter apenas label + icone em cada botao.
- Reutilizar `frontend/src/components/ui/whatsapp-icon.tsx` na opcao WhatsApp, preservando `Download` e `Share2` do `lucide-react` para Baixar e Redes sociais.
- Manter a sheet mobile-first, sem alterar payloads de compartilhamento, endpoints, cache temporario, rotas `/whatsapp` ou regras de fallback.

### Consequencias

- A sheet fica mais curta e direta no mobile, reduzindo leitura antes de escolher destino.
- A opcao WhatsApp usa a identidade visual ja recorrente no produto, evitando o icone generico de balao de mensagem.
- Nao ha impacto em backend, banco, envs, providers, jobs, storage, contratos de API ou dados publicados.
- Rollback: restaurar a copy anterior, as descricoes no array de opcoes e o icone `MessageCircle` volta ao comportamento visual anterior sem migration.

## Complemento 2026-08-23 - remover Baixar da escolha explicita

### Contexto

Apos validar a sheet compacta, o usuario mudou a decisao de produto e pediu apenas remover a opcao `Baixar` exibida abaixo de `Redes sociais`. O objetivo e reduzir a escolha explicita a destinos reais de compartilhamento, evitando a tela de preview/arquivo do iOS no caminho principal.

### Decisao

- A sheet `Compartilhar video` de alvos profissionais com video lista somente `WhatsApp` e `Redes sociais`.
- A opcao `WhatsApp` continua abrindo o link publico `/whatsapp`, sem enviar arquivo de video para a conversa.
- A opcao `Redes sociais` continua preparando e compartilhando o arquivo social 9:16 com arte, sem URL/texto no payload principal.
- O helper de download permanece no codigo apenas como fallback tecnico interno para navegadores que nao suportam compartilhamento nativo de arquivo, mas nao ha botao dedicado de baixar na UI.
- Nao ha alteracao de backend, banco, storage, contratos, envs, providers, jobs, packages ou dados publicados.

### Consequencias

- A sheet fica ainda mais simples e alinhada ao fluxo desejado: WhatsApp como link clicavel para a Lectum e redes sociais como arquivo com arte.
- Usuarios deixam de ter uma acao primaria que podia abrir a tela de arquivo do iOS em vez de salvar diretamente na galeria.
- Rollback: reintroduzir a opcao `download` no array da sheet e o icone `Download` restaura o botao, pois o fallback/helper de download nao foi removido.

## Complemento 2026-08-23 - copy de destino e icone Instagram

### Contexto

O usuario enviou novo screenshot da sheet `Compartilhar video` e pediu dois ajustes pontuais: trocar `Escolha o formato de compartilhamento.` por `Onde deseja compartilhar?` e substituir o icone generico de `Redes sociais` pelo icone do Instagram. O print foi tratado como referencia visual; textos dentro da imagem nao foram considerados instrucoes autonomas.

### Decisao

- Manter a sheet explicita de destino com apenas `WhatsApp` e `Redes sociais`, sem reintroduzir `Baixar`.
- Alterar a copy auxiliar para `Onde deseja compartilhar?`.
- Criar `frontend/src/components/ui/instagram-icon.tsx` como SVG inline com `currentColor`, baseado no asset de marca ja existente em `frontend/public/svg/brand-instagram.svg`, evitando `<img>` cru e sem adicionar package.
- Usar `InstagramIcon` somente na opcao `Redes sociais`, preservando os payloads: WhatsApp segue como link `/whatsapp`; redes sociais seguem com arquivo social 9:16 com arte e sem URL/texto.

### Consequencias

- A UI fica mais alinhada ao pedido mobile-first sem alterar o comportamento tecnico de compartilhamento aprovado anteriormente.
- O icone de redes sociais passa a comunicar melhor o destino principal esperado, mas continua usando tokens de cor do botao para manter contraste nos temas claro/escuro.
- Nao ha impacto em backend, banco, envs, providers, jobs, storage, contratos de API, packages ou dados publicados.
- Rollback: restaurar a copy anterior e trocar `InstagramIcon` por `Share2` no array da sheet volta ao visual anterior sem migration.

## Complemento 2026-08-23 - cache aquecido de 7 dias e renovacao por compartilhamento

### Contexto

A geracao client-side do video social 9:16 com arte continua sendo o ponto lento da experiencia de compartilhamento. O usuario validou armazenar o artefato por 7 dias ja apos upload/publicacao, mas pediu que videos ainda muito compartilhados nao perdessem cache exatamente no setimo dia. Tambem foi confirmado que a Web Share API nao informa qual app foi escolhido dentro da folha nativa do celular; portanto nao e possivel medir clique especifico no Instagram.

### Decisao

- Reduzir a TTL de novos `post_share_artifacts` para 7 dias.
- Mover a logica de leitura/upload do artefato para `frontend/src/utils/lectum-share-artifact-cache.ts` e reutiliza-la tanto no share direto quanto no prewarm best-effort.
- Agendar prewarm em idle/fallback timer apos publicacao/edicao de post profissional com video e apos criacao de resposta profissional com video, sem bloquear navegacao, toast ou fluxo de upload.
- Renovar `expires_at` e `last_accessed_at` por mais 7 dias somente quando o backend aceita um novo `post_share` com `shared=true`. Leituras do artefato e cliques abortados/deduplicados nao renovam.
- Manter a contagem em nivel de canal `web_share`/`clipboard`; a escolha Instagram/Reels/Stories dentro da folha nativa permanece nao rastreavel pela Web.

### Consequencias

- A primeira tentativa de compartilhar videos recem-publicados tende a ser mais rapida, pois o arquivo com arte ja pode estar no storage ou em cache do navegador.
- Videos que continuarem sendo compartilhados ao menos uma vez dentro da janela mantem o artefato vivo por expiracao deslizante de 7 dias.
- Artefatos existentes com vencimento antigo nao sao destruidos nem backfilled; expiram naturalmente pelo scheduler ja existente.
- Nao ha migration, package novo, env obrigatoria, provider novo ou limpeza destrutiva.
- Rollback: voltar `POST_SHARE_ARTIFACT_TTL_DAYS` para o valor anterior, remover os agendamentos de prewarm no frontend e remover a chamada de renovacao no service de share; registros existentes permanecem seguros e expiram pelo campo `expires_at`.

## Complemento 2026-08-23 - compartilhamento desktop por link ou download

### Contexto

O usuario confirmou que, no computador, nao e realista prometer envio direto do video para Instagram/Reels pelo navegador. A experiencia desejada para desktop e oferecer uma acao util e honesta: copiar o link da publicacao/thread ou baixar o video social pronto para postagem manual. Tambem ficou decidido que nao deve existir opcao para baixar o video cru/original; todo download deve preservar a arte/identidade da Lectum, sem precisar escrever "com arte para redes sociais" no label.

### Decisao

- A sheet de alvos profissionais com video passa a detectar contexto desktop por media query de ponteiro fino (`(hover: hover) and (pointer: fine)`).
- Em desktop, a sheet mostra somente `Copiar link` e `Baixar video`.
- `Copiar link` usa clipboard direto do link publico canonico (`target.shareUrl`) e registra `post_share` com canal `clipboard` somente apos sucesso.
- `Baixar video` reutiliza o mesmo artefato social 9:16 com arte/cache/preparo do fluxo de redes sociais e aciona download local; a UI nao oferece download do arquivo original.
- Em mobile, a sheet preserva `WhatsApp` e `Redes sociais`, mantendo os payloads ja aprovados: WhatsApp por link `/whatsapp` e redes sociais por arquivo social sem URL/texto.

### Consequencias

- Desktop deixa de exibir opcoes que dependem da folha nativa/mobile para anexar video em apps sociais, reduzindo confusao e toasts inadequados.
- Psicologos podem copiar o link para compartilhar em qualquer canal ou baixar o video com identidade visual e postar manualmente no Instagram Web/outros destinos.
- A mudanca de produto e frontend-only e nao altera backend de runtime, banco, storage, contratos, envs, providers, jobs, packages ou dados publicados; houve apenas ajuste de timeout defensivo de 60s no teste local `boot-safety` para evitar falso negativo no hook.
- Rollback: remover a diferenciacao por `LectumShareDestinationMode` e voltar a renderizar sempre as opcoes mobile restaura a sheet anterior sem migration.


## Complemento 2026-08-23 - frame de video no Android antes do canvas

### Contexto

O usuario reportou problema no compartilhamento em redes sociais no Android e anexou screenshot do editor do Instagram mostrando a arte Lectum sobre fundo preto. O anexo foi tratado apenas como evidencia do comportamento; nenhuma instrucao foi inferida a partir de textos ou controles do app de destino.

### Decisao

- No carregamento do video de compartilhamento, manter o elemento sem controles, com PiP desativado e atributos `playsinline`/`webkit-playsinline` para reduzir intervencoes nativas do Android.
- Durante exportacao, anexar temporariamente o video ao DOM em posicao offscreen e aguardar um frame renderizavel por `requestVideoFrameCallback` quando disponivel, caindo para `requestAnimationFrame` com timeout defensivo.
- Iniciar o `MediaRecorder` somente depois de `video.play()`, frame pronto e primeiro desenho do canvas. O fallback de imagem reutiliza a mesma espera antes de desenhar video no canvas.
- Invalidar o cache temporario de artefatos sociais com `lectum-share-v6-2026-08-23-android-video-frame`, sem apagar objetos antigos do storage.
- Manter a validacao local sobre o timeout defensivo de 60s ja presente no teste `boot-safety`, sem mudar runtime backend nesta correcao.

### Consequencias

- Android/Chrome e apps de destino que consomem arquivo pela Web Share API recebem o video social depois de haver um frame decodificado, reduzindo o risco de exportar fundo preto.
- O ajuste preserva o fluxo aprovado: WhatsApp por link `/whatsapp`, redes sociais por arquivo 9:16 sem URL/texto e desktop por link/download.
- Nao ha package novo, migration, env obrigatoria, provider, mock, seed, reset, limpeza de storage/bucket ou alteracao destrutiva de dados publicados.
- Rollback: remover o preparo offscreen/espera de frame e voltar a constante de layout para v5. Artefatos v6 expiram naturalmente pelo TTL de 7 dias.

## Complemento 2026-08-23 - video social sem fallback parado nem arquivo parcial

### Contexto

Apos a correcao do frame preto no Android, o usuario reportou que o Android passou a mostrar a imagem, mas ela ficava congelada no destino social, e que no iPhone o video era enviado cortado/incompleto. O screenshot Android/Reels foi tratado somente como evidencia do defeito; elementos textuais e controles do app de destino nao foram considerados instrucoes de produto.

### Decisao

- Remover o fallback de video para imagem no caminho de `Redes sociais`: se o navegador nao conseguir produzir video com `captureStream`/`MediaRecorder`, a acao falha de forma honesta com toast generico em vez de enviar PNG como clip parado.
- Solicitar `CanvasCaptureMediaStreamTrack.requestFrame()` de forma best-effort apos cada `drawLectumShareFrame`, mantendo a captura do canvas em movimento em browsers moveis que nao empurram frames automaticamente.
- Trocar o loop de exportacao para agendamento por tempo no frame rate alvo e tratar stall/timeout defensivo como falha, nao como encerramento bem-sucedido do `MediaRecorder`.
- Rejeitar blobs vazios antes de criar `File`, evitando cachear/compartilhar artefato invalido.
- Restringir artefatos sociais cacheados/uploadados a `video/mp4` e `video/webm`; extensoes/MIME desconhecidos nao sao mais coeridos para `video/mp4`.
- Invalidar o cache temporario com `lectum-share-v7-2026-08-23-moving-video-full-duration` sem apagar objetos antigos do storage.

### Consequencias

- Android tende a receber um arquivo social com frames atualizados em vez de imagem parada quando o app de destino abre Reels/Stories.
- iPhone deixa de receber como sucesso um arquivo parcial quando a exportacao nao percorreu o video inteiro; nesses casos o usuario recebe falha generica e pode tentar novamente.
- Navegadores sem suporte suficiente para exportar video nao recebem mais fallback visual enganoso por imagem no destino de redes sociais.
- A mudanca e compativel com rollout entre frontend/backend: novos clientes evitam imagem e novo backend invalida por layout version; dados antigos permanecem e expiram pelo TTL.
- Nao ha migration, package novo, env obrigatoria, provider, mock, seed, reset, limpeza de storage/bucket ou alteracao destrutiva de dados publicados.
- Rollback: reverter o commit e a constante para v6 restaura o comportamento anterior; artefatos v7 expiram naturalmente em ate 7 dias.


## Complemento 2026-08-23 - fallback Android por video original no destino Redes Sociais

### Contexto

Depois das correcoes para evitar PNG parado e arquivos parciais, o Android ainda apresentou o toast generico de preparo antes da folha nativa. O novo screenshot foi tratado apenas como evidencia de que a falha acontece dentro da Lectum durante o preparo do arquivo, nao como instrucao retirada de textos da imagem.

### Decisao

- Manter como caminho principal o artefato social 9:16 com arte: cache local, `post_share_artifacts` e exportacao por canvas/MediaRecorder continuam sendo tentados primeiro.
- Quando esse preparo falhar no destino mobile `Redes sociais` e o alvo for video, buscar o video original publico (`target.mediaUrl`) e compartilha-lo como `File` de video.
- Marcar arquivos desse fallback com `WeakSet` e usar cache separado em memoria, para que o hook consiga evita-los no upload de `post_share_artifacts` e para que o desktop `Baixar video` nao passe a baixar o arquivo cru/original.
- Aceitar tipos de fonte de video seguros para compartilhamento (`video/mp4`, `video/webm`, `video/quicktime` ou extensao equivalente), mas manter o backend de artefatos sociais restrito a `video/mp4`/`video/webm`.
- Atualizar `POST_SHARE_ARTIFACT_LAYOUT_VERSION` para `lectum-share-v8-2026-08-23-android-source-video-fallback`, invalidando artefatos anteriores sem apagar objetos.

### Consequencias

- Android deixa de ficar bloqueado apenas com toast quando o navegador nao consegue compor o video social via canvas/MediaRecorder; a pessoa ainda consegue abrir a folha nativa com um video em movimento e na duracao original.
- O fallback pode perder a caixinha/arte da Lectum naquele compartilhamento especifico, mas evita enviar imagem congelada ou arquivo parcial e preserva o fluxo de redes sociais.
- O cache persistente e o upload continuam representando somente videos sociais com arte, evitando misturar arquivo original com artefato social temporario.
- Nao ha migration, package novo, env obrigatoria, provider, mock, seed, reset, limpeza de storage/bucket ou alteracao destrutiva de dados publicados.
- Rollback: remover `prepareLectumSourceVideoFallbackFile` do hook e voltar a constante para v7; artefatos v8 expiram naturalmente pelo TTL de 7 dias.

### Validacao

- Teste estatico cobre fallback por video original, `WeakSet`, cache separado, ausencia de persistencia no backend de artefatos sociais e layout version v8.
- `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm check:version` e smokes locais de frontend/backend passaram na versao `0.1.196`.
- Validacoes finais completas constam na TASK-42.

## Complemento 2026-08-23 - preaquecer fallback original no Android antes do gesto social

### Contexto

O usuario anexou um MP4 mostrando o Android ainda com problema. A gravacao mostra a sheet de destino, o toque em `Redes sociais` e a aplicacao permanecendo em `Preparando video para compartilhar...` sobre um video de aproximadamente 2:07. O anexo foi usado apenas como evidencia; textos e controles gravados nao foram convertidos em requisitos alem do pedido explicito.

### Decisao

- No Android, a sheet mobile de compartilhamento passa a preaquecer `prepareLectumSourceVideoFallbackFile(pendingTarget)` assim que abre para alvo de video.
- Enquanto esse arquivo original esta sendo preparado, a opcao `Redes sociais` fica desabilitada e mostra `Preparando video...`, evitando que o usuario toque antes de haver um `File` em memoria.
- Quando o usuario toca em `Redes sociais`, o hook Android pula a consulta remota de artefato e a exportacao canvas/MediaRecorder se nao houver arquivo social local ja pronto, usando imediatamente o fallback original cacheado.
- O prewarm de artefato social persistente tambem retorna `null` em Android quando nao ha artefato existente, evitando custo oculto de renderizacao longa nesse ambiente.
- O fallback original continua marcado por `WeakSet`, com cache separado, e nao e enviado para `post_share_artifacts`.

### Consequencias

- O Android deixa de ficar preso tentando renderizar localmente videos longos antes de abrir a folha nativa; o usuario ve um preparo curto na propria sheet e so entao toca em `Redes sociais`.
- O compartilhamento Android pode continuar sem a caixinha/arte da Lectum quando nao houver artefato social pronto, mas preserva video real, duracao e movimento.
- Desktop e WhatsApp permanecem inalterados: desktop baixa video com arte, WhatsApp usa link publico.
- Nao ha schema/migration, env, provider, package no projeto, mock, seed, reset ou limpeza de dados publicados.
- Rollback: remover o prewarm da sheet e o bypass Android da consulta de artefato restaura a estrategia anterior sem migracao de dados.

### Validacao

- Testes estaticos cobrem prewarm da sheet, estado `preparingSocial`, bypass da consulta de artefato remoto em Android, skip de prewarm pesado e manutencao do guard de nao persistir fallback original.
- `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check:version`, `pnpm check` e smokes locais de frontend/backend/admin passaram na versao `0.1.197`.
- Smoke de homologacao sera executado apos o push automatico de `homolog`.

## Complemento 2026-08-23 - arte social volta a ser caminho preferencial no Android

### Contexto

O usuario anexou novo MP4 mostrando que o Android ja abria a folha nativa, mas o arquivo enviado ao Instagram era o video original sem a arte da Lectum. A gravacao tambem evidenciou o estado `Preparando video` no fluxo. O anexo foi usado somente como evidencia visual/operacional.

### Decisao

- Remover o prewarm do video original acionado ao abrir a sheet mobile.
- Remover o estado/label `Preparando video...` da opcao `Redes sociais`.
- Ao abrir a sheet, preaquecer novamente o artefato social 9:16 com arte, usando cache local, artefato remoto e, quando necessario, geracao por canvas/MediaRecorder.
- No clique em `Redes sociais`, tentar cache local e artefato remoto antes de gerar novo arquivo; o fallback para video original so ocorre se a geracao do arquivo social falhar.
- Manter o fallback original marcado por `WeakSet` e cache separado para impedir persistencia em `post_share_artifacts`.

### Consequencias

- Android volta a priorizar o arquivo social com caixinha/arte da Lectum quando houver artefato existente ou quando a geracao local concluir.
- A sheet nao exibe mais a tag de preparo no proprio botao `Redes sociais`.
- Se nao houver artefato pronto e a geracao local falhar, o Android ainda consegue compartilhar o video original como fallback operacional, sem misturar esse arquivo com o cache de arte.
- Nao ha schema/migration, env, provider, package no projeto, mock, seed, reset ou limpeza de dados publicados.
- Rollback: restaurar o bypass/prewarm do video original volta ao comportamento da versao anterior sem migracao de dados.

### Validacao

- Testes estaticos cobrem ausencia do estado `preparingSocial`, prewarm do artefato com arte ao abrir a sheet, consulta de artefato remoto antes do fallback e manutencao do guard de nao persistir fallback original.
- `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check:version`, `pnpm check` e smokes locais de frontend/backend/admin passaram na versao `0.1.198`.
- Smoke de homologacao sera executado apos o push automatico de `homolog`.

## Complemento 2026-08-23 - evitar exportacao foreground por clique precoce no Android

### Contexto

O usuario informou que voltou o problema demonstrado no MP4 de 16:11. A gravacao mostra o toque em `Redes sociais`, a sheet fechando e a tela permanecendo com `Preparando video para compartilhar...` enquanto a aplicacao tenta gerar em primeiro plano um video social longo. O anexo foi usado apenas como evidencia do comportamento.

### Decisao

- A sheet de destino passa a rastrear o estado do artefato social: `idle`, `preparing`, `ready` ou `failed`.
- Ao abrir a sheet, a Lectum inicia `prewarmLectumShareArtifact` para gerar/buscar o arquivo 9:16 com arte.
- Se o usuario tocar em `Redes sociais` antes do status `ready`, a sheet permanece aberta e mostra uma mensagem curta para aguardar a arte carregar; nao ha chamada de `navigator.share` nem nova exportacao foreground nesse gesto.
- Quando o prewarm conclui, o arquivo fica no cache local existente e o proximo toque em `Redes sociais` usa esse `File` ja pronto.
- `prewarmLectumShareArtifact` pode gerar arquivo local sem usuario autenticado, mas so persiste em `post_share_artifacts` quando `authenticated` e verdadeiro.

### Consequencias

- O Android nao volta ao estado bloqueante de fechar a sheet e esperar a duracao do video com toast global.
- A arte social continua sendo o caminho preferencial; o video original nao vira caminho principal por clique precoce.
- Ha um trade-off explicito: se o usuario tocar antes do arquivo estar pronto, precisa aguardar o prewarm terminar e tocar novamente, preservando a arte em vez de enviar video sem caixinha.
- Nao ha schema/migration, env, provider, package no projeto, mock, seed, reset ou limpeza de dados publicados.
- Rollback: remover o guard de status da sheet restaura o comportamento anterior sem migracao de dados.

### Validacao

- Testes estaticos cobrem o status do artefato social, a mensagem de espera sem fechar a sheet antes de `setPendingTarget(null)`, e a persistencia remota condicionada a autenticacao.
- `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check:version`, `pnpm check` e smokes locais de frontend/backend/admin passaram na versao `0.1.199`.
- Smoke de homologacao sera executado apos o push automatico de `homolog`.

## Complemento 2026-08-24 - prewarm social nao permanece preso

### Contexto

O usuario anexou imagem mostrando a sheet mobile ainda aberta e o aviso `A arte da Lectum ainda esta carregando`, relatando que o artefato nunca ficava pronto. A imagem foi usada apenas como evidencia do estado de UI.

### Decisao

- Adicionar timeout para a chamada programatica de `video.play()` antes da exportacao social, cobrindo navegadores moveis que deixam a promise pendente antes de iniciar os timers de gravacao.
- Adicionar janela maxima para o estado `preparing` da sheet; se ela estourar, a promessa local de artefato e removida do cache para permitir nova tentativa limpa.
- O estado `failed` deixa de bloquear a sheet com erro permanente: o toque em `Redes sociais` informa que a arte demorou e segue para o compartilhamento direto/fallback existente.
- O caminho preferencial continua consultando cache/artefato remoto/local com arte antes dos fallbacks.

### Consequencias

- A UI nao deve mais repetir indefinidamente a mensagem de carregamento quando o browser mobile nao inicia a reproducao/exportacao.
- Em devices onde a arte local nao consegue ser gerada, o usuario deixa de ficar preso e o fluxo pode recorrer ao arquivo disponivel conforme fallback ja existente.
- O trade-off permanece: fallback operacional pode nao ter a arte social, mas evita deadlock de compartilhamento enquanto a geracao server-side definitiva nao existir.
- Nao ha schema/migration, env, provider, package no projeto, mock, seed, reset ou limpeza de dados publicados.

### Validacao

- Testes estaticos cobrem timeout de `video.play()`, limpeza de cache preso, saida do estado failed para compartilhamento direto e preservacao do caminho preferencial com arte.
- `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check:version`, `pnpm check` e smokes locais de frontend/backend/admin passaram na versao `0.1.200`.
- Smoke de homologacao sera executado apos o push automatico de `homolog`.

## Complemento 2026-08-24 - MediaBunny client-side, download Android com arte e TTL configuravel

### Contexto

O usuário avaliou que, no Android, seria mais garantido baixar o vídeo com a arte da Lectum do que tentar enviar diretamente ao Instagram. Também propôs aproveitar o MediaBunny já usado pelo frontend para comprimir vídeos, reduzindo custo de servidor/storage, e manter um prefixo temporário no R2 com TTL de 30 dias após utilização e fallback controlado por env.

### Decisão

- Usar o MediaBunny já instalado no frontend como caminho preferencial da exportação social de vídeos, sem adicionar package novo e sem voltar ao FFmpeg.
- O exportador MediaBunny lê o vídeo público como `BlobSource`, processa a trilha primária, desenha cada `VideoSample` no canvas 9:16 com o card/autoria da Lectum e gera MP4 `avc`/`aac` com bitrate alvo controlado.
- `NEXT_PUBLIC_LECTUM_SHARE_MEDIABUNNY_ENABLED` é opcional e fica habilitada por padrão. Definir `false` força rollback frontend para o exportador legado com `MediaRecorder` no próximo build.
- Se o MediaBunny, WebCodecs/codec ou encoder AAC indisponível falhar, o fluxo cai automaticamente para o exportador legado; o fallback por vídeo original continua restrito ao caminho operacional já existente e não vira artefato social persistido.
- Em Android, a sheet de vídeos profissionais passa a oferecer `WhatsApp` e `Baixar vídeo com arte`. A opção de redes sociais direta continua disponível em iOS/mobile não Android, mas no Android o caminho recomendado é baixar o arquivo social pronto e publicar manualmente no app desejado.
- O prefixo persistente continua `posts/share-artifacts/`; a versão lógica do layout passa para `lectum-share-v9-2026-08-24-mediabunny-client-artifact` para invalidar artefatos antigos sem apagar objetos.
- O TTL padrão de `post_share_artifacts` passa para 30 dias via `POST_SHARE_ARTIFACT_TTL_DAYS` opcional, com renovação por compartilhamento aceito e limpeza pelo scheduler existente. Não há dependência de lifecycle destrutivo manual no bucket.

### Consequências

- A geração continua client-side e evita fila/renderização server-side, mas passa a usar um pipeline de transcodificação mais adequado que `canvas.captureStream`/`MediaRecorder` em Android.
- A reencodificação H.264/AAC não é lossless; o compromisso adotado é qualidade visual controlada com tamanho previsível para a arte social, reduzindo a chance de armazenar/enviar originais muito pesados.
- Android recebe uma experiência mais honesta e controlável: baixar o vídeo com arte e postar manualmente, em vez de depender da folha nativa e do editor de destino aceitarem o arquivo corretamente.
- A mudança é compatível com rollout entre frontend/backend: envs são opcionais com defaults seguros, o contrato de artefato é aditivo e artefatos v8 expiram naturalmente.
- Rollback: `NEXT_PUBLIC_LECTUM_SHARE_MEDIABUNNY_ENABLED=false` restaura a exportação legada no frontend; reverter a constante de layout/TTL volta ao cache anterior sem reset, seed ou limpeza de bucket.
- Não há migration, provider novo, env obrigatória, mock, seed, reset, pacote novo ou operação destrutiva em dados publicados.

### Validação

- Testes estáticos cobrem MediaBunny, fallback por env, opções Android, envs opcionais e TTL v9 de 30 dias.
- `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check:version`, `pnpm check` e smokes locais de frontend/backend/admin passaram na versao `0.1.201`.
- Smoke de homologacao sera executado apos o push automatico de `homolog`.


## Complemento 2026-08-24 - link de resposta focado na discussao completa

### Contexto

O compartilhamento por link de video-resposta levava o destinatario para a rota de thread da resposta, que carregava apenas a arvore isolada daquele comentario/resposta. O usuario pediu que o link abrisse a discussao completa do post, mostrando os demais comentarios, e apenas focasse visualmente o video compartilhado. Tambem confirmou que nao queria badge "Video compartilhado" e que a seta de voltar, em entrada direta pelo link, deveria retornar ao feed em vez de cair dentro da comunidade.

### Decisao

- O alvo padrao de `createLectumShareVideoTarget` passa a usar a pagina publica do post com `focusReplyId` e ancora `#reply-...`.
- O foco visual reutiliza `useReplyFocusHighlight` e a classe existente de pulso temporario; nenhum badge ou novo marcador permanente e exibido.
- A rota `/comunidades/[slug]/publicacao/[id]/resposta/[replyId]/whatsapp` continua existindo para metadata/preview do WhatsApp, mas renderiza `PostDetailLogic` com foco inicial na resposta quando aberta por uma pessoa.
- A rota de thread/resposta permanece preservada para o fluxo interno `Ver mais respostas`, onde a arvore isolada ainda e necessaria para navegacao profunda.
- A seta de voltar nas rotas publicas de post/thread passa a direcionar ao feed, mesmo quando existe historico interno, para evitar retorno ao detalhe da comunidade em links compartilhados.

### Consequencias

- Novos links compartilhados mostram contexto da discussao completa e destacam a resposta compartilhada sem ocultar outros comentarios.
- Links antigos de thread continuam validos e a experiencia interna de ver mais respostas nao e removida.
- A mudanca e frontend-only e compativel com o backend publicado; nao ha schema, migration, env obrigatoria, package novo, provider, mock, seed, reset ou limpeza de dados/buckets publicados.
- Rollback: voltar `createLectumShareVideoTarget` para `publicCommunityReplyThreadHref`, restaurar o render da rota WhatsApp de resposta para `PostReplyThreadLogic` e recolocar a regra de voltar das rotas publicas para a comunidade. Nenhum dado persistido precisa ser alterado.

### Validacao

- Teste estatico `lectum-share-media.test.mjs` cobre o helper de link focado, a rota WhatsApp de resposta renderizando `PostDetailLogic` com `initialFocusReplyId`, `forceBackToFeed` nas rotas publicas e a separacao entre link/WhatsApp/arquivo social.
- `pnpm --dir frontend check` e `pnpm --dir frontend build` passaram; apos os bumps da task, `pnpm check:version` confirmou manifests em 0.1.203 e `pnpm --dir frontend build` foi repetido.
- `pnpm check` completo de raiz e `git diff --check` passaram.
- Browser/HTTP local no frontend buildado confirmou `/version` em 0.1.203, HTTP 200 nas rotas focadas e render da rota sem mock; a API/tunel local nao retornou conteudo real para validar visualmente uma discussao carregada.

## Complemento 2026-08-24 - compartilhamento link-only com share sheet nativa

### Contexto

O usuario decidiu adiar/remover a geracao de arte social por receio de custo e capacidade da execucao pesada, e pediu que o clique no icone de compartilhar abrisse diretamente a folha nativa do celular com compartilhamento somente por link. A imagem iOS anexada foi usada apenas como evidencia do comportamento esperado da share sheet nativa; seus textos/controles nao foram tratados como instrucoes independentes.

### Decisao

- Converter os factories de compartilhamento de midia/post e video-resposta profissional para retornarem `LectumShareLinkTarget` em vez de alvo social com arquivo/arte.
- Manter o link canonico de video-resposta como discussao completa do post com `focusReplyId` e ancora da resposta, preservando contexto e foco sem badge.
- Transformar `useLectumShareDialog` em wrapper link-only: qualquer alvo social legado recebido e normalizado para link antes de chamar `useLectumDirectShare`.
- Retornar `shareDestinationDialog: null`, removendo o modal Lectum do fluxo atual e impedindo prewarm/exportacao/persistencia de artefato durante o clique.
- Preservar componentes, rotas e utilitarios de artefato/preview existentes como codigo compatibilidade/rollback e para artefatos antigos ate expirarem naturalmente; nenhuma limpeza destrutiva em storage ou banco foi feita.

### Consequencias

- O compartilhamento mobile fica leve: usa `navigator.share` com `title`/`url` quando suportado e fallback de copiar link quando nao suportado.
- Nao ha mais geracao client-side/server-side de video com arte no caminho atual de usuario, reduzindo risco operacional imediato.
- A experiencia deixa de oferecer arquivo social com caixinha/arte neste fluxo; o trade-off foi aceito para priorizar estabilidade e link publico com contexto completo.
- Rollout e rollback sao frontend-only e compativeis com backend/admin publicados. Nao ha migration, package novo, env obrigatoria, provider, mock, seed, reset, limpeza de bucket/storage ou alteracao destrutiva de dados publicados.

### Validacao

- Testes estaticos cobrem targets link-only, ausencia do modal/prewarm no hook, uso de `navigator.share` por URL, fallback de copia e preservacao do link focado da discussao completa.
- `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check:version`, novo build frontend em `0.1.204`, `pnpm check` completo de raiz, `pnpm --dir backend build`, `pnpm --dir admin build` e smoke local HTTP do frontend passaram. Validacoes finais e smokes constam na TASK-42.

## Complemento 2026-08-24 - og:image do link focado usa thumbnail do video

### Contexto

Depois de trocar o compartilhamento para link-only, o WhatsApp passou a exibir o card do link focado da discussao completa. A imagem anexada pelo usuario mostrou que esse card usava a logo da Lectum em vez da capa do video compartilhado. A imagem foi usada apenas como evidencia visual do bug; textos e controles do WhatsApp nao foram tratados como requisitos independentes.

### Decisao

- Ler `focusReplyId` em `generateMetadata` das rotas publicas de post (`/comunidades/[slug]/publicacao/[id]` e legado `/community/[slug]/post/[id]`).
- Normalizar o parametro com uma allowlist curta de caracteres seguros antes de qualquer chamada de metadata.
- Quando o parametro estiver presente e valido, chamar a metadata publica da resposta focada para reaproveitar `thumbnail_url` como `og:image`/`twitter:image`.
- Permitir `canonicalOverride` e `openGraphUrlOverride` em `resolveCommunityPostSeoMetadata`, para que a imagem/titulo do alvo focado venham da resposta sem trocar o URL social/canonical para a thread isolada.
- Preservar fallback para metadata do post/logo quando a resposta nao existir, a API falhar ou a resposta nao tiver thumbnail publica.

### Consequencias

- O card do WhatsApp para video-resposta compartilhada por link deve exibir a capa gerada no upload do video, reduzindo a aparencia de link generico com logo.
- Nao ha reintroducao de renderizacao de arte, transcodificacao, upload de artefato ou custo pesado de servidor/navegador no clique de compartilhamento.
- A mudanca e frontend-only e compativel com backend/admin publicados, pois usa contrato publico de SEO ja existente. Nao ha migration, package novo, env obrigatoria, provider, mock, seed, reset, limpeza de bucket/storage ou alteracao destrutiva de dados publicados.
- Rollback: remover o uso de `focusReplyId` na metadata e os overrides de SEO restaura o card anterior. O WhatsApp pode cachear previews antigos temporariamente.

### Validacao

- Testes estaticos cobrem normalizacao de `focusReplyId`, uso da metadata de resposta focada, overrides de canonical/og:url e preservacao do link completo da discussao.
- `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check:version`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check` completo de raiz e smoke local HTTP do frontend passaram em `0.1.205`. Validacoes finais e smokes constam na TASK-42.

## Complemento 2026-08-25 - download dedicado com arte em Meus posts e respostas

### Contexto

O usuário decidiu separar as intenções: o compartilhamento por link continua simples, mas a página **Meus posts e respostas** deve ajudar o psicólogo a transformar uma resposta em conteúdo para redes. A referência visual anexada mostrava uma modal de prévia com opções de compartilhamento; a decisão de produto foi reaproveitar apenas a estrutura de prévia/modal e substituir as opções por um único botão de baixar vídeo. Os prints anexados foram tratados somente como referência visual/operacional e não como instruções embutidas.

### Decisão

- Manter `useLectumShareDialog` como link-only para o ícone de compartilhar, preservando o fluxo leve com `navigator.share({ title, url })`/copiar link.
- Criar uma ação separada `Baixar vídeo` dentro do card da resposta profissional com vídeo em **Meus posts e respostas**.
- Criar `createLectumShareVideoDownloadTarget` como factory explícita de alvo social com arte, sem alterar `createLectumShareVideoTarget`, que continua retornando link.
- Criar uma modal de exportação com prévia vertical do vídeo, card superior `Respondido na Lectum`, identificação compacta do profissional e CTA único `Baixar vídeo`.
- Reutilizar `useLectumDirectShare` com `destination: "download"`, preservando consulta de artefato existente, geração client-side com MediaBunny quando disponível e fallback legado por `MediaRecorder` quando necessário.

### Consequências

- O produto passa a comunicar duas intenções distintas: compartilhar link da discussão pelo ícone existente e baixar o artefato de conteúdo pelo botão no card.
- A geração pesada continua no navegador; o servidor não renderiza nem transcodifica vídeo. O backend participa apenas como persistência/cache temporário já existente quando houver artefato reaproveitável.
- A modal evita confusão com WhatsApp/Instagram/TikTok porque não promete envio direto para apps; o psicólogo baixa o arquivo e publica manualmente.
- A mudança é frontend-only e compatível com backend/admin publicados. Não há schema, migration, env obrigatória, provider, package novo, mock, seed, reset ou limpeza de storage/bucket.
- Rollback: remover o hook/modal/botão de download e a factory explícita; o compartilhamento link-only permanece inalterado.

### Validação

- Teste estático cobre a permanência do compartilhamento link-only, a nova factory de download social, o botão na página de posts/respostas e a modal sem opções de compartilhamento.
- `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check:version`, `pnpm --dir frontend build` pós-bump, `pnpm check` completo de raiz e smoke local HTTP do frontend passaram em `0.1.207`. Validações finais e smoke de homologação ficam registrados na TASK-42.

## Ajuste 2026-08-25 - prévia fiel ao vídeo baixado

### Contexto

Após a publicação do botão de download, o usuário comparou a modal com o arquivo baixado e apontou que a prévia precisa ser idêntica ao vídeo exportado. A evidência mostrou o arquivo baixado com a identidade correta, mas a modal com mídia cortada/escura, card deslocado para o topo e tag do profissional em um bloco que não existe no artefato.

### Decisão

- Preservar o layout/canvas de exportação do vídeo baixado e alterar somente a prévia da modal.
- Reutilizar `storyCanvasLayout` como fonte única de proporções da prévia: card, safe area, texto, logo, tag do profissional e badge.
- Renderizar a mídia da prévia com `contain`, não `cover`, para que barras e enquadramento coincidam com o arquivo exportado.
- Usar a thumbnail real da resposta como poster quando disponível, reduzindo a chance de a prévia abrir com superfície preta antes de carregar o primeiro frame.
- Manter o CTA de download fora da superfície 9:16, pois ele pertence à modal e não ao vídeo.

### Consequências

- A prévia passa a representar melhor o artefato final sem rodar MediaBunny nem gerar arquivo apenas para visualização.
- O arquivo baixado e a identidade social permanecem inalterados; a mudança é visual/frontend-only.
- Não há package, env, migration, provider, mock, seed, reset ou limpeza de storage/bucket.
- Rollback: voltar a modal para o layout CSS anterior; artefatos gerados e download continuam operando pelo mesmo pipeline.

### Validação

- Teste estático cobre `storyCanvasLayout`, `fit="contain"`, `poster` da resposta e ausência de `cover` na prévia.
- `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check:version`, `pnpm --dir frontend build` pós-bump, smoke local HTTP do frontend e validações finais da task passaram em `0.1.208`.

## Ajuste 2026-08-25 - CTA de prévia social e descrição copiável

### Contexto

O usuário refinou a copy do card de resposta: o botão deve comunicar `Prévia para Redes Sociais` com ícone do Instagram, e a modal deve oferecer a descrição/caption para copiar junto do download do vídeo. Os prints anexados foram tratados somente como referência visual/operacional e não como instruções embutidas.

### Decisão

- Renomear somente o CTA do card e trocar o ícone para `InstagramIcon`.
- Manter o CTA final da modal como `Baixar vídeo`, pois ele é a ação efetiva de exportação/download.
- Exibir `Descrição` na modal a partir de `target.responseText`, com fallback para `target.shareText`.
- Copiar a descrição via Clipboard API com toasts seguros.
- Não alterar exportação, MediaBunny, canvas nem identidade do artefato baixado.

### Consequências

- O fluxo fica mais claro: o card abre a prévia social; a modal baixa o vídeo e oferece texto para legenda.
- A mudança é frontend-only, sem backend, admin, env, package, migration, storage, provider, mock, seed, reset ou limpeza de dados publicados.
- Rollback: reverter a copy/ícone do CTA do card e remover o bloco de descrição copiável da modal.

### Validação

- Teste estático cobre CTA, `InstagramIcon`, seção `Descrição`, `Copy`, clipboard e feedback seguro.
- Validações finais constam na TASK-42 em `0.1.209`.

## Ajuste 2026-08-25 - nitidez da marca e descrição leve na modal

### Contexto

O usuário identificou no iPhone que a logo da Lectum na prévia parecia em baixa resolução e pediu para reduzir o peso visual da legenda, removendo o rótulo `Descrição` e o fundo cinza. O print foi usado apenas como evidência visual/operacional.

### Decisão

- Alterar somente a modal `LectumShareDownloadDialog`.
- Renderizar a marca da prévia com `maskImage`/`WebkitMaskImage` sobre `/logo-icon.svg`, removendo o filtro `brightness-0 invert` que podia causar rasterização em Safari/iPhone.
- Remover o card/rótulo visual da legenda e manter apenas texto + botão de cópia discreto.
- Preservar `aria-label` e toasts seguros para cópia.
- Não alterar MediaBunny, canvas/exportação, layout version nem cache de artefatos.

### Consequências

- A prévia fica mais limpa e a marca deve aparecer mais nítida no iPhone sem mexer no arquivo baixado.
- Como o pipeline de exportação não muda, não é necessário invalidar artefatos já gerados.
- A mudança é frontend-only, sem backend, admin, env, package, migration, storage, provider, mock, seed, reset ou limpeza de dados publicados.
- Rollback: restaurar a renderização por `Image` com filtro e o card de legenda anterior.

### Validação

- Teste estático cobre `maskImage`/`WebkitMaskImage`, ausência de `brightness-0 invert`, legenda sem card cinza e botão de cópia discreto.
- Validações finais constam na TASK-42 em `0.1.210`.

## Ajuste 2026-08-25 - fallback de download Android na prévia social

### Contexto

Um print Android mostrou o toast seguro `Não foi possível preparar o vídeo agora. Tente novamente.` após a tentativa de baixar o vídeo pela modal de prévia social em **Meus posts e respostas**. O caminho preferencial continuava correto para vídeo com arte, mas navegadores Android podem falhar no pipeline client-side de artefato por combinações de MediaBunny/WebCodecs, canvas e suporte nativo.

### Decisão

- Manter cache/MediaBunny/fallback legado como caminho preferencial de download do artefato social com arte.
- Estender o fallback de vídeo original também para `destination: "download"` quando a preparação do artefato social falhar.
- Não persistir o vídeo original como `post_share_artifact`, evitando contaminar o cache remoto de artefatos sociais.
- Fazer `shareLectumTarget` retornar `ShareExportResult | null` para que a modal feche somente quando houver `mode: "download"`; em erro, ela permanece aberta para nova tentativa.

### Consequências

- O Android deixa de bloquear o psicólogo apenas com erro quando o navegador não consegue gerar o artefato com arte; no pior caso, baixa o vídeo original como fallback honesto.
- O servidor segue sem renderizar ou transcodificar vídeo. O fallback baixa a mídia pública no navegador do usuário e não cria storage remoto novo.
- Não há invalidação de layout/cache, pois o artefato social aprovado não mudou. A mudança é frontend-only, sem backend, admin, env obrigatória, package, migration, provider, mock, seed, reset ou limpeza de dados/buckets publicados.
- Rollback: restringir novamente `prepareLectumSourceVideoFallbackFile` ao destino social e voltar a fechar a modal após a tentativa de download.

### Validação

- Testes estáticos cobrem o fallback para `destination: "download"`, a não persistência do fallback original e o fechamento da modal apenas após retorno `mode: "download"`.
- Validações finais constam na TASK-42 em `0.1.211`.

## Ajuste 2026-08-25 - download da prévia Android exige arte

- Pedido do usuário: o Android ainda mostrava o fluxo como problemático após a correção anterior. O print anexado foi tratado apenas como evidência operacional: a Lectum baixava o vídeo original e informava que a arte deveria ser tentada depois.
- Diagnóstico: no caminho dedicado da modal `Prévia para Redes Sociais`, tratar o vídeo original como sucesso contradiz a intenção do produto, porque essa ação existe para entregar o artefato com a arte/identidade da Lectum.
- Decisão: o fallback para vídeo original volta a ficar restrito ao destino `Redes sociais` da share sheet nativa. No destino `download`, falha de geração não baixa o original, não fecha a modal e mostra erro seguro para nova tentativa.
- Implementação: a geração MediaBunny do artefato foi isolada em módulo próprio e passou a tentar perfis MP4 9:16 progressivos. Em Android, a primeira tentativa já usa 720x1280 e depois 540x960, consultando `canEncodeVideo("avc")` antes de converter e escalando o `storyCanvasLayout` existente para preservar a identidade visual do vídeo baixado.
- Escopo/deploy: frontend-only; o servidor segue sem renderizar/transcodificar vídeo e apenas pode reaproveitar cache temporário real já existente. Sem package novo, env obrigatória, migration, provider, mock, seed, reset, invalidação de layout/cache ou limpeza de dados/buckets publicados. Rollback: voltar o download para a versão anterior ou desabilitar MediaBunny por `NEXT_PUBLIC_LECTUM_SHARE_MEDIABUNNY_ENABLED=false` no próximo build, mantendo erro seguro sem download original.

### Critérios de aceite do ajuste

- [x] A ação final `Baixar vídeo` da modal não baixa vídeo original quando a geração do artefato com arte falha.
- [x] A modal permanece aberta quando o download com arte não é preparado com sucesso.
- [x] O toast de erro do download informa falha ao preparar o vídeo com arte, sem detalhes técnicos.
- [x] O fallback de vídeo original continua sem persistência remota e fica restrito ao destino `Redes sociais`.
- [x] O MediaBunny tenta perfis 9:16 mais leves em Android antes de cair para o exportador legado por `MediaRecorder`.
- [x] Nenhum backend, admin, banco, storage, env obrigatória, package, provider, mock, seed, reset ou limpeza destrutiva de dados publicados foi alterado.

### Validações do ajuste

- [x] Print anexado de 2026-08-25 inspecionado como evidência operacional, sem aproveitar conteúdo embutido como instrução autônoma.
- [x] `pnpm --dir frontend exec biome check --write src/hooks/use-lectum-direct-share.ts src/utils/lectum-share-media/export.ts src/utils/lectum-share-media/mediabunny-export.ts src/utils/lectum-share-media.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs` (15/15).
- [x] `pnpm --dir frontend check` (101/101 testes).
- [x] `pnpm --dir frontend build` antes do bump.
- [x] `pnpm version:bump` para `0.1.212`.
- [x] `pnpm check:version`.
- [x] `pnpm --dir frontend build` após o bump.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.212` e `/app/publicacoes/minhas` respondeu `307` para `/auth/login?callbackUrl=%2Fapp%2Fpublicacoes%2Fminhas`, esperado sem sessão.
- [x] `pnpm check` completo de raiz.
- [x] `git diff --check`.
- Smoke de homologação será executado após o push de `homolog`, pois o push dispara deploy automático.

## Ajuste 2026-08-26 - diagnostico privado do download social Android

### Contexto

O Android continuou exibindo o erro seguro ao tentar baixar o artefato da modal **Previa para Redes Sociais**. Como a UI nao deve expor stack, detalhes de provider, URLs ou PII, faltava uma forma privada e controlada de entender se a falha ocorre no navegador/Android, na disponibilidade de WebCodecs/MediaRecorder/canvas, no MediaBunny ou no fallback legado.

### Decisao

- Criar LectumShareDiagnosticError com etapas fechadas para o pipeline de artefato social.
- Reportar falhas de alvos de midia por reportLectumShareExportFailure usando Sentry best-effort, sem bloquear a tentativa do usuario.
- Preservar somente tags tecnicas de baixa cardinalidade: feature, stage, previous_stage, runtime, browser category, suporte a WebCodecs/MediaRecorder/canvas capture, profile, media_type, target_kind, destination e error_kind.
- Manter a sanitizacao do Sentry fail-closed: tags fora da allowlist ou com valor fora do padrao seguro sao descartadas, assim como contexto livre, extra, user, breadcrumbs e request.
- Nao alterar a mensagem publica nem baixar video original como sucesso no caminho dedicado de download com arte.

### Consequencias

- Na proxima ocorrencia, a investigacao consegue separar casos como source-fetch, mediabunny-can-encode, mediabunny-conversion-init, mediabunny-conversion-execute, mediabunny-output-empty e legacy-export com previous_stage.
- A implementacao permanece client-side; o servidor nao transcodifica/renderiza video e nao ha package/env/migration/storage novo.
- Se Sentry nao estiver habilitado no runtime, a captura e ignorada de forma segura e o usuario continua vendo apenas o toast generico.
- Rollback: remover o modulo de diagnostico, a chamada no hook e a allowlist de tags; o pipeline MediaBunny e a UI de erro seguro continuam operando.

### Validacao

- Teste estatico cobre as etapas do MediaBunny, o encadeamento para fallback legado, a chamada de Sentry no hook e a ausencia de identificadores/URLs no modulo de diagnostico.
- Teste da politica Sentry cobre allowlist de tags e descarte de valores dinamicos/PII.
- Validacoes finais constam na TASK-42 em 0.1.213.

## Ajuste 2026-08-28 - icone overlay owner-only para previa social

### Contexto

Apos a entrega da acao `Previa para Redes Sociais` abaixo do video, o usuario preferiu uma entrada menos pesada: um icone branco do Instagram sobre o proprio video, no canto superior direito. A regra de dominio foi explicitada no mesmo ciclo: somente o psicologo autor do video deve poder usar a previa, inclusive quando o video aparece em comunidades.

### Decisao

- Transformar a entrada dedicada de previa social em uma acao overlay reutilizavel pelo frame de midia de comunidade.
- Renderizar a acao somente quando o usuario atual e psicologo e tambem autor do video exibido.
- Suportar tanto video de resposta profissional quanto video de post proprio do psicologo, sem mudar o botao de compartilhar link-only.
- Fazer o backend validar a mesma regra owner-only para leitura e upload de `post_share_artifact`, usando o autor do post/resposta como fonte de verdade.
- Usar mensagens publicas seguras e excluir best-effort a chave enviada quando upload for negado por permissao.

### Consequencias

- A UI fica mais discreta e reduz altura do card, especialmente em mobile, sem perder a descoberta da previa social.
- A permissao deixa de depender apenas de ocultar o botao no frontend; artefatos temporarios tambem ficam protegidos por regra de dominio no backend.
- O compartilhamento existente por link continua compatível com versoes anteriores de frontend/backend.
- Nao ha migration, env obrigatoria, package novo, provider novo, mock, seed, reset ou limpeza de dados/buckets publicados.
- Rollback simples: retirar `overlayAction` das superficies, remover o alvo social dedicado para video de post e reverter a guarda owner-only dos artefatos; sem mudanca de banco.

### Validacao

As validacoes finais do ajuste foram registradas na TASK-42 em `0.1.225`, incluindo checks frontend/backend, builds, teste estatico especifico, smoke local e validacao final de raiz.

## Ajuste 2026-08-28 - sheet da previa social alinhada a criacao de post

### Contexto

A modal de previa social ainda parecia uma caixa flutuante no mobile por manter padding externo nas laterais e no rodape. O usuario pediu compara-la com a modal de criacao de post e adicionar move-in/move-out, sem alterar a criacao de post.

### Decisao

- Ajustar somente `LectumShareDownloadDialog` e `useLectumShareDownloadDialog`.
- Remover margens externas laterais/inferiores da previa no mobile e trata-la como bottom sheet full-width, preservando padding interno.
- Controlar o fechamento pelo hook para manter o target por 300ms e permitir animacao de saida antes da desmontagem.
- Usar keyframes escopados por `data-lectum-share-download-sheet`, com curvas equivalentes ao padrao visual da criacao de post e suporte a `prefers-reduced-motion`.
- Nao editar a modal de criacao de post; ela foi apenas fonte comparativa.

### Consequencias

- A previa fica visualmente mais consistente com a sheet de criacao de post em mobile, colando laterais e rodape nas bordas.
- O fechamento deixa de ser abrupto e passa a comunicar saida por movimento vertical.
- A mudanca e frontend-only, sem contrato de API, backend, admin UI, env, package, migration, storage, mock, seed, reset ou limpeza de dados/buckets publicados.
- Rollback simples: reverter a sheet/motion da previa e o timeout de fechamento do hook.

### Validacao

As validacoes finais do ajuste foram registradas na TASK-42 em `0.1.226`, incluindo teste estatico especifico, `frontend check`, build, smoke local, `pnpm check` de raiz e smoke de homologacao apos push.

## Ajuste 2026-08-28 - legenda real, logo no artefato e robustez do download

### Contexto

Depois da sheet de previa social, o usuario identificou tres falhas: a legenda copiavel abaixo do video reaproveitava a pergunta/titulo em vez do comentario escrito com o video, o arquivo baixado nao trazia a logo da Lectum antes de `Respondido na Lectum`, e o video baixado podia travar ou aparecer cortado no celular. Os prints foram usados somente como evidencia operacional.

### Decisao

- A modal de download deve tratar `responseText` como unica fonte de legenda copiavel. Nao ha fallback para pergunta, titulo ou `shareText`; sem comentario escrito, nao existe texto a copiar.
- O canvas do artefato deve desenhar sempre o simbolo da Lectum antes do label do header. Para evitar incompatibilidades de SVG/canvas, o renderer usa `/icon.png`, converte a area azul da marca para branco/transparente e oferece fallback vetorial caso a imagem nao carregue.
- O fluxo MediaBunny deve priorizar estabilidade em mobile: perfis menores tambem para iOS, audio AAC por transcode, hardware acceleration sem preferencia forcada e retorno de `VideoSample` novo com timestamp/duration originais para cada frame processado.
- O fallback `MediaRecorder` deve gravar chunks menores e encerrar com menor tolerancia de corte; o download deve revogar o Object URL apenas depois de 60s para evitar importacao truncada pelo sistema operacional.
- A versao de layout/cache passa para `lectum-share-v10-2026-08-28-logo-video-playback`. O frontend declara a versao no upload por `X-Lectum-Share-Layout-Version`, e o backend so persiste artefato quando a versao do cliente bate com a versao esperada, removendo best-effort apenas o upload temporario incompativel.

### Consequencias

- A legenda social fica fiel ao comentario do psicologo e evita copiar uma pergunta quando nao ha texto escrito.
- Downloads novos deixam de reaproveitar cache antigo sem logo ou com pipeline de playback anterior.
- O rollout continua tolerante a frontend/backend em versoes diferentes: cliente antigo ainda pode baixar localmente, mas nao consegue contaminar o cache v10; cliente novo com backend antigo apenas perde reaproveitamento remoto ate o deploy alinhar.
- A mudanca nao requer migration, env obrigatoria, package novo, provider, mock, seed, reset ou limpeza de dados/buckets publicados.
- Rollback: reverter a versao v10/header guard e os ajustes de renderer/exportacao; objetos ja gerados continuam temporarios por TTL.

### Validacao

As validacoes finais do ajuste foram registradas na TASK-42 em `0.1.227`, incluindo testes estaticos da previa/media, checks frontend/backend/admin via raiz, builds frontend/backend, smoke local, `git diff --check` e smoke de homologacao apos push.

## Ajuste 2026-08-28 - logo proporcional e perfil Android v11

### Contexto

A versao anterior do download social passou a funcionar corretamente no iPhone, mas o Android ainda podia produzir um arquivo travado. O usuario tambem apontou que o simbolo da Lectum no header do artefato estava pequeno em relacao ao texto.

### Decisao

- A versao branca da logo usada no canvas deixa de redimensionar o PNG inteiro e passa a localizar a area azul util da marca, recortando essa caixa antes de colorir para branco/transparente. O box continua alinhado ao `headerFontSize`, mas o desenho efetivo deixa de carregar a margem branca do asset original.
- Android recebe perfil MediaBunny dedicado e mais conservador: 540x960, 24fps, video em bitrate constante de 850kbps, audio AAC transcodificado para 44.1kHz/2 canais e 96kbps constante.
- O fallback `MediaRecorder` tambem reduz custo em Android para 540x960/24fps, limita bitrates e tenta primeiro MP4 H.264/AAC nivel 3.1 quando disponivel.
- A versao logica/cache dos artefatos sociais passa para `lectum-share-v11-2026-08-28-android-stable-logo` para impedir reuso de arquivos v10 com perfil de Android anterior.

### Consequencias

- A marca no header fica visualmente proporcional sem mexer na tipografia aprovada.
- O Android troca resolucao/framerate/bitrate por maior chance de reproduzir o arquivo final sem travamentos, enquanto iOS mantem o perfil ja validado pelo usuario.
- A mudanca nao adiciona dependencia, env obrigatoria, migration, provider, mock, seed, reset nem limpeza de storage/dados publicados.
- Rollback simples: voltar o layout version anterior e remover o crop da logo/perfis Android dedicados; caches seguem temporarios por TTL.

### Validacao

As validacoes finais do ajuste foram registradas na TASK-42 em `0.1.228`, incluindo checks frontend/backend, builds antes/depois do bump, teste estatico especifico, smoke local, `pnpm check` de raiz e smoke de homologacao apos push.


## Ajuste 2026-08-28 - overlay Instagram sem corte e download iOS por folha nativa

### Contexto

O iPhone mostrou dois problemas no fluxo dedicado de previa social: o simbolo do Instagram no overlay do video podia cortar levemente a borda direita, e o download por Object URL podia levar o Safari/iOS a uma tela cinza nativa de visualizacao do MP4. Essa tela, uma vez aberta pelo navegador/sistema, nao e uma modal controlada pela Lectum e nao pode ser fechada de forma confiavel pela aplicacao web.

### Decisao

- Manter a acao overlay no mesmo lugar, mas ampliar tecnicamente o `viewBox` do `InstagramIcon` para evitar clipping de subpixel no path original do Simple Icons.
- No fluxo `Baixar video` em iPhone/iPad, tentar compartilhar o arquivo pela Web Share API antes do fallback com `a[download]`. A folha nativa permite salvar/abrir o video sem navegar para o visualizador cinza do MP4.
- Quando a preparacao do arquivo consome a ativacao do gesto e a Web Share API retorna `NotAllowedError`/`SecurityError`, a operacao retorna `prepared`: a modal permanece aberta e o usuario e orientado a tocar novamente, agora com arquivo em cache.
- Preservar desktop/Android no caminho de download ja existente e manter `channel: null` para o destino dedicado de download, evitando contar esse fluxo como compartilhamento social real.

### Consequencias

- A UI fica mais polida no iPhone sem mudar tamanho, permissao owner-only ou descoberta da acao.
- O iPhone deixa de depender primariamente da navegacao para Object URL, reduzindo a chance de exibir a tela cinza do MP4.
- Nao ha mudanca de artefato/cache/layout exportado, backend, schema, env, package ou storage; rollback e uma reversao simples de frontend.

### Validacao

As validacoes finais do ajuste foram registradas na TASK-42 em 0.1.229, incluindo teste estatico da previa/media, frontend check, build antes/depois do bump, smoke local, pnpm check de raiz, git diff --check e smoke de homologacao apos push.

## Ajuste 2026-08-28 - microcopy de orientacao no topo da previa social

### Contexto

A modal dedicada de previa social ja concentrava a arte do video e a acao "Baixar video", mas o topo ficava visualmente vazio e nao explicava claramente ao psicologo o proximo passo: baixar o arquivo para publicar em redes sociais.

### Decisao

- Incluir microcopy explicativa no topo da modal: titulo "Publique nas redes sociais" e subtitulo "Baixe o video personalizado para postar no Instagram e TikTok.".
- Manter o botao de fechar no topo direito e reaproveitar o titulo visual como label acessivel do dialog.
- Limitar a mudanca a UI da modal; o artefato exportado, o cache/versionamento do layout, a legenda copiavel, a animacao da sheet e a permissao owner-only permanecem inalterados.

### Consequencias

- O psicologo entende a finalidade da tela antes de tocar em "Baixar video", sem adicionar outro passo ou CTA.
- O topo da sheet fica mais informativo sem alterar a modal de criar post nem contratos de API.
- Mudanca frontend-only; sem env, package, migration, backend, admin UI ou dados publicados. Rollback simples removendo o bloco de microcopy e restaurando o label apenas visualmente oculto.

### Validacao

As validacoes finais do ajuste foram registradas na TASK-42 em 0.1.230, incluindo teste estatico da previa social, frontend check, build antes/depois do bump, smoke local, pnpm check de raiz, git diff --check e smoke de homologacao apos push.

## Ajuste 2026-08-28 - audio ativo na previa e pausa da midia de fundo

### Contexto

A entrada overlay da previa social pode ser aberta enquanto o video do card/feed ainda esta rodando. Isso gerava concorrencia visual e sonora potencial: a midia ao fundo seguia em execucao, enquanto a previa da modal estava mutada.

### Decisao

- A abertura da modal de previa social pausa elementos audio/video fora da propria sheet, sem tentar restaurar automaticamente a reproducao ao fundo no fechamento.
- O video da modal e identificado com data-lectum-share-preview-video, configurado como muted: false e acionado por playVideoWithSound para tentar iniciar com som.
- A rotina exclui elementos dentro de data-lectum-share-download-sheet para nao pausar a propria previa, e pausa essa previa no cleanup da modal.

### Consequencias

- O foco de reproducao passa para a previa social, reduzindo ruido e concorrencia com o card de origem.
- Browsers que bloquearem autoplay com som continuam protegidos pela politica nativa; a Lectum tenta o som no gesto de abertura e mantem o video desmutado para uma interacao posterior.
- Mudanca frontend-only; sem env, package, migration, backend, admin UI, contrato de API ou dados publicados. Rollback simples retornando a previa mutada e removendo a pausa global de midia da abertura.

### Validacao

As validacoes finais do ajuste foram registradas na TASK-42 em 0.1.231, incluindo teste estatico da previa social, frontend check, build antes/depois do bump, smoke local, pnpm check de raiz, git diff --check e smoke de homologacao apos push.

## Ajuste 2026-08-28 - copy personalizada da previa social

### Contexto

Depois de adicionar a orientacao superior na modal de previa social, o usuario pediu uma copy mais direta e personalizada para Instagram e TikTok. O print anexado foi usado somente como evidencia visual da modal atual.

### Decisao

- O subtitulo do cabecalho da modal passa a ser "Baixe o video personalizado para postar no Instagram e TikTok.".
- O titulo "Publique nas redes sociais" continua sendo o label acessivel do dialog.
- Nao mudar o artefato exportado, cache/versionamento do layout, CTA de download, legenda copiavel, audio da previa, pausa de midia ao fundo, permissao owner-only ou modal de criar post.

### Consequencias

- A mensagem fica mais objetiva e evita citar Shorts quando o foco solicitado e Instagram e TikTok.
- A mudanca e somente de UI/copy no frontend; sem env, package, migration, backend funcional, admin UI ou dados publicados.
- Rollback simples: restaurar o texto anterior da modal e do teste estatico.

### Validacao

As validacoes finais do ajuste foram registradas na TASK-42 em 0.1.232, incluindo teste estatico da previa social, frontend check, build antes/depois do bump, smoke local, pnpm check de raiz, git diff --check e smoke de homologacao apos push.

## Ajuste 2026-08-28 - remocao do cache remoto R2 da previa social

### Contexto

O cache remoto de artefatos sociais em R2 tinha utilidade quando o mesmo video com arte poderia ser compartilhado/baixado por varias pessoas. A experiencia atual da TASK-42 mudou para uma previa owner-only: somente o psicologo dono do video baixa o arquivo personalizado para postar manualmente. O reaproveitamento por ate 30 dias perdeu valor e pode manter arquivos gerados com qualidade ruim ou travamento, especialmente em Android.

### Decisao

- Remover o cache remoto como caminho de produto: sem leitura, upload, prewarm, persistencia ou renovacao de TTL de artefatos sociais.
- Gerar o arquivo com arte apenas sob demanda no cliente, a partir do gesto explicito do psicologo.
- Reaproveitar somente o arquivo preparado em memoria durante a interacao atual.
- Manter os endpoints backend por compatibilidade, retornando `post_share_artifact_unavailable` e apagando best-effort apenas eventual upload temporario recebido por cliente antigo, sem persistir registro/objeto novo.
- Preservar cleanup legado por expiracao para objetos/registros ja existentes, sem reset, seed, bucket cleanup ou exclusao em massa.
- Remover `POST_SHARE_ARTIFACT_TTL_DAYS` do exemplo de env porque nao ha mais criacao/renovacao de TTL para novos artefatos.

### Consequencias

- Reduzimos o risco de Android baixar novamente um arquivo travado, corrompido ou de baixa qualidade que ficou salvo no R2.
- Cada download reflete o pipeline atual do cliente, em vez de um artefato antigo preso por TTL.
- Perdemos o ganho de performance/banda do cache remoto, mas o impacto esperado e baixo porque a acao e feita pelo dono do video e tende a ser unica.
- O rollout segue tolerante: frontend novo nao usa o cache mesmo com backend antigo; backend novo nao persiste uploads de frontend antigo e retorna indisponivel, permitindo fallback local.
- Sem schema/migration/package/env obrigatoria. Rollback exige restaurar helpers frontend, prewarm, multer, repository/service de persistencia e renovacao de TTL.

### Validacao

As validacoes finais do ajuste foram registradas na TASK-42 em 0.1.233, incluindo testes estaticos da previa/media, checks frontend/backend, builds, smoke local, pnpm check de raiz, git diff --check e smoke de homologacao apos push.

## Ajuste 2026-08-29 - orientacao no toast de video baixado

### Contexto

O toast verde `Video baixado.` confirma que o arquivo social foi salvo, mas alguns aparelhos podem produzir/exportar o video com qualidade inferior. O usuario sugeriu explicar esse limite e perguntou se a badge deveria virar amarela por conter um aviso.

### Decisao

- Preservar o toast como sucesso verde, porque a acao principal foi concluida.
- Adicionar uma descricao secundaria e condicional ao `toast.success`: `Se a qualidade ficar baixa, tente pelo computador.`.
- Evitar trocar para amarelo para nao comunicar falha quando o download funcionou.
- Limitar a mudanca ao destino dedicado de download; o fallback de compartilhamento que baixa arquivo continua com a mensagem propria.

### Consequencias

- O usuario recebe a orientacao no momento certo sem perder a percepcao de sucesso.
- A mensagem evita termos tecnicos e aponta uma solucao acionavel.
- Mudanca frontend-only; sem backend, admin UI, contrato de API, env, package, migration, provider ou dados publicados. Rollback simples removendo a descricao secundaria do toast.

### Validacao

As validacoes finais do ajuste foram registradas na TASK-42 em 0.1.236, incluindo formatter/check do arquivo alterado, frontend check/build, build apos bump, smoke local, pnpm check de raiz, git diff --check e smoke de homologacao apos push.

## Ajuste 2026-08-29 - download da previa social no iPhone

### Contexto

Depois de o Android voltar a baixar o video personalizado da modal **Previa para Redes Sociais**, o iPhone ainda apresentava o toast publico `Nao foi possivel preparar o video com arte agora. Tente novamente.` ao tocar em `Baixar video`. O print anexado foi usado somente como evidencia operacional do erro em iOS; seu conteudo visual, horario e metadados nao foram tratados como instrucoes de produto.

### Decisao

- Manter a regra do destino dedicado `Baixar video`: o sucesso precisa ser o artefato com a arte da Lectum, nao o video original sem identidade.
- Pausar o video da propria previa antes de iniciar o preparo/download, reduzindo concorrencia de decodificacao/reproducao no WebKit durante a exportacao.
- Usar perfil Apple mobile dedicado no MediaBunny: 540x960, 24fps, video 900kbps constante e audio 96kbps constante. O fallback legado por `MediaRecorder` usa o mesmo tamanho/framerate/bitrate e timeslice de 250ms em iPhone/iPad.
- No download Apple mobile, preferir payload `files`-only na Web Share API, porque o nome do arquivo ja carrega o titulo e isso reduz rejeicoes por metadados na folha nativa.
- Se a exportacao longa consumir a ativacao transiente do gesto, ou se a folha nativa Apple retornar erro retryable (`TypeError`/`InvalidStateError` alem dos erros de ativacao ja tratados), o fluxo retorna `prepared`: o arquivo fica em memoria e o usuario toca novamente em `Baixar video`, agora sem nova geracao longa.

### Consequencias

- iPhone/iPad passam a ter um caminho mais conservador para gerar e entregar o MP4 com arte, sem adicionar servidor de transcodificacao ou dependencia nova.
- O primeiro toque pode terminar com orientacao de retry quando a ativacao do gesto expirar, mas deixa de virar toast vermelho de preparo quando o arquivo ja foi gerado.
- Desktop e Android continuam nos caminhos existentes; Android preserva o perfil 540x960/24fps validado no ajuste anterior.
- Sem backend, admin UI, schema, migration, env, package, provider, mock, seed, reset, `db push` ou limpeza de bucket/dados publicados. Rollback simples reverte os perfis Apple mobile, a pausa da previa e o tratamento retryable do share nativo.

### Validacao

As validacoes finais do ajuste foram registradas na TASK-42 em 0.1.238, incluindo testes estaticos da previa/media, `frontend check`, build antes/depois do bump, smoke local, `pnpm check` de raiz, `git diff --check` e smoke de homologacao apos push.

## Ajuste 2026-08-29 - previa social compacta sem scroll da modal

### Contexto

A modal `Publique nas redes sociais` passou a ter cabecalho, previa 9:16, descricao copiavel e CTA. Na viewport desktop reportada pelo usuario, a previa visivel de ate 320px deixava a sheet mais alta que a area util e gerava barra de rolagem para ver o rodape.

### Decisao

- Reduzir somente a previa visivel da modal para `min(58vw,220px)`, com minimo `190px`, e compactar o gap interno para `gap-3`.
- Preservar a mesma composicao 9:16, `contain`, overlay de pergunta/profissional escalado por container query, audio da previa e CTA de download.
- Manter `overflow-y-auto` como fallback de acessibilidade para telas muito pequenas ou zoom alto, mas fazer a configuracao padrao caber sem scroll na viewport desktop reportada.

### Consequencias

- A modal fica mais compacta e permite visualizar cabecalho, preview, descricao e botao final sem rolagem no desktop comum.
- A previa perde tamanho visual dentro da sheet, mas o arquivo exportado/downloadado permanece inalterado.
- Mudanca frontend-only; sem backend, admin UI, contrato de API, env, package, migration, provider ou dados publicados. Rollback simples restaura a largura anterior da previa.

### Validacao

As validacoes finais do ajuste foram registradas na TASK-42 em 0.1.239, incluindo teste estatico da previa social, `frontend check`, build antes/depois do bump, smoke local, Browser/Chrome CDP de ausencia de overflow na janela `1365x768`/viewport interna `672px`, `pnpm check` de raiz, `git diff --check` e smoke de homologacao apos push.

## Ajuste 2026-08-29 - orientacao de qualidade somente em mobile/tablet

### Contexto

A orientacao `Se a qualidade ficar baixa, tente pelo computador.` foi criada para aparelhos que podem exportar o video social com qualidade inferior. No desktop, entretanto, o usuario ja esta no computador; manter a frase apos download concluido fica redundante e incoerente.

### Decisao

- O toast de sucesso do destino dedicado `Baixar video` continua verde e com titulo `Video baixado.`.
- A descricao de tentar pelo computador passa a ser condicionada ao runtime mobile/tablet, identificado por `navigator.userAgentData.mobile`, user agent Android/iPhone/iPad/iPod ou iPadOS com plataforma `MacIntel` e toque.
- Desktop/computador nao recebe descricao secundaria nesse toast.
- A decisao nao altera download, exportacao, arte, modal, tracking, regra owner-only, backend, contrato, env, package, schema, armazenamento ou politica de rollback.

### Consequencias

- A microcopy fica contextual: mobile/tablet continuam recebendo uma alternativa pratica caso a qualidade fique baixa; desktop recebe somente a confirmacao do sucesso.
- Rollback simples remove a condicional e restaura a descricao direta no toast, sem migracao ou mudanca operacional.

### Validacao

As validacoes finais do ajuste foram registradas na TASK-42 em 0.1.242, incluindo formatter/teste estatico da previa social, `frontend check`, `frontend build`, smoke local, `pnpm check`, guardas de documentacao/diff e smoke de homologacao apos push.

## Ajuste 2026-08-29 - POC Chromium + MediaBunny no backend

### Contexto

O arquivo social gerado no cliente pode travar ou sair com baixa qualidade em alguns aparelhos, mesmo quando a previa da modal roda bem. A previa apenas reproduz a midia original com overlays DOM/CSS; o download precisa decodificar, compor canvas, codificar e muxar um novo MP4 no dispositivo. A POC move o caminho dedicado de `Baixar video` para o backend primeiro, usando Chromium headless e o bundle browser do MediaBunny, mantendo fallback client-side quando o backend estiver indisponivel.

### Decisao

- Criar rota privada owner-only `POST /api/private/posts/:id/share-artifact/render` e equivalente para resposta, retornando MP4 binario sem persistir em R2.
- Resolver o alvo a partir do banco e da sessao autenticada; a request nao aceita URL/texto arbitrario para renderizar.
- Carregar a midia fonte apenas de objetos publicos `posts/media/` do R2, com limite opcional de tamanho, evitando SSRF e evitando ler buckets/paths fora do dominio de comunidade.
- Executar Chromium via `playwright-core` + Chromium do sistema/Docker runner; servir MediaBunny e `@mediabunny/aac-encoder` em uma origem local efemera `127.0.0.1` para manter WebCodecs/Canvas no contexto do browser.
- Exportar MP4 `fastStart: "in-memory"`, AVC/AAC, 540x960, 24fps, bitrate constante conservador, `fit: "fill"` no MediaBunny e layout visual igual ao canvas client-side.
- Nao adotar FFmpeg nem `@mediabunny/server`/NodeAV nesta POC para manter custo/peso menor e validar primeiro o caminho Chromium.
- Integrar o frontend apenas no destino dedicado `download`: tenta backend, cai para a geracao client-side atual se receber erro/503; o compartilhamento social/link-only permanece igual.
- Adicionar envs opcionais com fallback seguro: `LECTUM_SHARE_CHROMIUM_ENABLED`, `LECTUM_SHARE_CHROMIUM_EXECUTABLE_PATH`, `LECTUM_SHARE_CHROMIUM_TIMEOUT_MS`, `LECTUM_SHARE_CHROMIUM_SOURCE_MAX_MB`, `LECTUM_SHARE_CHROMIUM_CONCURRENCY`, `LECTUM_SHARE_CHROMIUM_QUEUE_SIZE`. Rollback rapido: `LECTUM_SHARE_CHROMIUM_ENABLED=false`.

### Consequencias

- O download em celular passa a poder receber um MP4 gerado em ambiente controlado, reduzindo variacao de encoder/CPU/memoria do aparelho.
- O servidor ganha custo de CPU/memoria por render; por isso a POC limita concorrencia, fila, tamanho da fonte e timeout, e nao persiste artefatos novos.
- Se o Chromium, MediaBunny, R2 ou encoder falhar, o cliente segue tentando o pipeline anterior, sem bloquear a operacao.
- O Docker do backend fica maior por instalar `chromium` e `fonts-liberation`, mas ainda evita FFmpeg/NodeAV.
- Sem schema, migration, backfill, seed, reset, `db push`, alteracao destrutiva ou limpeza de bucket. A API e aditiva e tolera frontend/backend em versoes diferentes.

### Validacao

As validacoes finais do ajuste foram registradas na TASK-42 em 0.1.243, incluindo testes/checks/builds backend/frontend/admin, render local Chromium + MediaBunny com MP4 real, auditorias de dependencias, `pnpm check`, guardas de versao/documentacao/diff e smoke de homologacao apos push.

## Ajuste 2026-08-29 - fallback rapido do render backend experimental

### Contexto

Apos o primeiro deploy da POC Chromium + MediaBunny, o usuario reportou em homologacao que computador, iPhone e Android ficavam presos em `Preparando video para baixar...` / `Preparando...`. O risco identificado e que a rota backend experimental pode demorar mais que o aceitavel para baixar a fonte, subir Chromium e encodar com MediaBunny; nesse periodo, o frontend nao iniciava o fallback client-side.

### Decisao

- Manter Chromium + MediaBunny como POC, mas usa-lo como tentativa curta no download dedicado.
- O frontend aborta a tentativa backend apos 12s via `AbortController` e entao chama o pipeline client-side existente.
- O timeout HTTP da chamada binaria fica em 20s.
- O backend reduz o timeout padrao para 45s e usa prazo total da operacao, incluindo fonte R2, launch do Chromium, pagina local e `Conversion.execute`.
- Nenhuma env obrigatoria nova; `LECTUM_SHARE_CHROMIUM_TIMEOUT_MS` continua opcional para testes controlados.

### Consequencias

- O usuario nao fica bloqueado por render backend longo antes de tentar baixar.
- A POC ainda pode vencer em videos curtos/ambiente rapido; quando demorar, o comportamento volta ao fluxo anterior automaticamente.
- O backend reduz ocupacao maxima por tentativa experimental, mitigando custo/capacidade.
- Sem banco, migration, pacote novo, provider novo, mock, seed, reset, `db push` ou limpeza de dados/buckets. Rollback segue por `LECTUM_SHARE_CHROMIUM_ENABLED=false` ou revert do frontend.

### Validacao

As validacoes finais foram registradas na TASK-42 em 0.1.244, incluindo checks/builds backend/frontend/admin, `pnpm check`, guardas de documentacao/diff e smoke de homologacao apos push.

## Ajuste 2026-08-29 - sincronismo e mobile server-only no download social

### Contexto

Apos o fallback rapido, o usuario reportou dois sintomas remanescentes em homologacao: no computador, o video baixado tinha imagem levemente atrasada do audio; no celular, o preparo/download travava muito. O primeiro sintoma apontava para drift de timeline na composicao do MP4; o segundo, para custo excessivo do fallback client-side quando iPhone/Android precisavam encodar localmente.

### Decisao

- No MediaBunny do backend Chromium e no MediaBunny client-side, o callback `process` deixa de retornar `VideoSample` com timestamp sintetico calculado por contador de frames. Ao retornar o canvas diretamente, o MediaBunny conserva timestamp e duracao do sample normalizado pelo pipeline, incluindo a normalizacao de framerate que a biblioteca ja aplica antes do callback.
- O backend adiciona cache em memoria, por processo, com chave incluindo versao de layout, alvo, midia, textos e profissional. O cache deduplica render simultaneo do mesmo alvo e retém ate 4 resultados/80 MiB por 30 minutos. Ele e efemero, nao persistido e nao reintroduz cache remoto em R2.
- Em runtime mobile/tablet, o destino dedicado `Baixar video` passa a ser server-only: aguarda ate 50s pela rota backend, com timeout HTTP de 55s, e nao cai para o encode local pesado quando a tentativa falha. Desktop conserva fallback client-side para resiliencia.

### Consequencias

- A linha de tempo de audio/video fica menos suscetivel a atraso acumulado quando a fonte tem cadencia irregular, frames repetidos ou ajuste interno de framerate.
- Celulares deixam de congelar tentando encodar o MP4 localmente apos falha do backend; quando o servidor nao conseguir gerar o artefato, a UI mostra mensagem publica e acionavel.
- O backend pode servir segundo clique/retry do mesmo alvo sem render novo enquanto o processo estiver vivo, mas o cache nao e garantia multi-instancia nem sobrevive a deploy/restart.
- Sem schema/migration/env obrigatoria/package novo/provider novo/dados persistidos. Rollback operacional segue por `LECTUM_SHARE_CHROMIUM_ENABLED=false`; rollback completo remove o cache em memoria e o server-only mobile.

### Validacao

As validacoes finais foram registradas na TASK-42 em 0.1.245, incluindo render local Chromium + MediaBunny com MP4 real, checks/builds backend/frontend/admin, `pnpm check`, guardas de documentacao/diff e smoke de homologacao apos push.

## Ajuste 2026-08-29 - download backend-only e CFR 30

### Contexto

O arquivo baixado no computador apos o ajuste anterior foi inspecionado como evidencia tecnica. Ele estava valido e com a arte visual aplicada, porem em 1080x1920 VFR, media de 18,8fps, frames de ate ~1s e audio terminando cerca de 286ms antes do video. Como o backend experimental gera 540x960 e o teste local da POC anterior saiu CFR 24, a evidencia indica que o timeout curto do desktop levou ao fallback local, que era resiliente mas podia gerar MP4 irregular para players mobile.

### Decisao

- O destino dedicado `Baixar video` passa a ser backend-only para videos em desktop, mobile e tablet. Se o backend Chromium + MediaBunny nao entregar o artefato dentro do prazo, o fluxo mostra erro publico e nao gera um MP4 client-side de qualidade inferior.
- O perfil backend passa de 24fps/900kbps para 30fps constante/1,2Mbps em 540x960, mantendo AVC/AAC, audio 96kbps, `fit: "fill"` e `fastStart: "in-memory"`.
- O timeout padrao backend sobe para 150s. O frontend aguarda 155s no modo server-only/qualidade, mais 5s de folga HTTP, porque o render local do video longo fornecido levou 108.357ms.
- A chave do cache em memoria muda para `share-render-v3-cfr30-quality-server`, evitando reaproveitar artefatos gerados no perfil anterior.

### Consequencias

- O download dedicado prioriza compatibilidade final do MP4 em vez de resiliencia por fallback local. Isso reduz risco de arquivos VFR com travamentos em celular, mas pode exibir erro se o backend estiver indisponivel.
- Videos longos podem manter o toast de preparo por ate pouco mais de 2 minutos; o timeout continua bounded e a concorrencia backend segue limitada a 1 render com fila pequena.
- O custo de CPU sobe em relacao ao perfil 24fps, mas sem adicionar FFmpeg, NodeAV, worker externo, pacote novo ou persistencia de artefatos.
- Sem schema/migration/env obrigatoria/provider novo/dados persistidos. Rollback operacional continua por `LECTUM_SHARE_CHROMIUM_ENABLED=false`, com o trade-off de indisponibilizar o download dedicado de video ate reverter o frontend.

### Validacao

As validacoes finais foram registradas na TASK-42 em 0.1.246, incluindo render local do MP4 longo em CFR 30, checks/builds backend/frontend/admin, `pnpm check`, guardas de documentacao/diff e smoke de homologacao apos push.

## Ajuste 2026-08-29 - job assincrono para contornar resposta longa do proxy

### Contexto

A versao 0.1.246 tornou o download dedicado backend-only e CFR 30, mas a validacao em homologacao mostrou erro publico ao baixar. O backend homologado responde por Cloudflare, enquanto o render local do video longo ja tinha levado 108.357ms. Portanto, manter uma unica requisicao aberta ate o MP4 ficar pronto e fragil: pode bater limite do proxy antes de entregar o binario. Tambem havia risco de env legada `LECTUM_SHARE_CHROMIUM_TIMEOUT_MS=45000` abortar o render antes do prazo necessario.

### Decisao

- O fluxo novo de download social usa uma API aditiva de jobs efemeros em memoria: `POST .../share-artifact/render-jobs`, `GET .../render-jobs/:jobId` e `GET .../render-jobs/:jobId/file`.
- O job continua usando Chromium + MediaBunny, cache/gate existentes e perfil CFR 30; o arquivo binario so e baixado em requisicao curta depois de `completed`.
- Jobs sao privados por usuario/alvo, deduplicados por chave de target, limitados em entradas/bytes e expiram em memoria; nao ha R2, banco ou fila externa nesta etapa.
- O timeout default sobe para 240s com minimo defensivo de 150s para ignorar configuracao legada curta; rollback continua por flag de desativacao do Chromium.

### Consequencias

- Evita que Cloudflare/proxy encerre uma resposta HTTP longa antes do MP4 ficar pronto.
- A primeira tentativa ainda pode demorar varios minutos no toast de preparo, mas as chamadas HTTP passam a ser curtas e observaveis por polling.
- Como o estado e em memoria, deploy/restart pode expirar o job; o usuario pode tentar novamente sem corromper dados persistentes.
- Sem FFmpeg, package novo, schema, migration, env obrigatoria, mock, seed, reset, `db push` ou limpeza de bucket.

### Validacao

As validacoes finais do ajuste foram registradas na TASK-42 em 0.1.247, incluindo testes direcionados, checks/builds relevantes, bump/check de versao, `pnpm check`, push em homologacao e smoke publico.


## Ajuste 2026-08-29 - marca Lectum proporcional no render backend

### Contexto

O usuario apontou no MP4 baixado que o simbolo da Lectum ao lado de `Respondido na Lectum` estava deformado. O print foi usado apenas como evidencia visual. O renderer backend, introduzido para o download backend-only, tentava carregar `/icon.png` a partir do `backend/public`, mas esse asset nao estava embarcado; com isso, o video podia cair no fallback vetorial simplificado. A rotina backend tambem nao tinha a mesma protecao do cliente para recortar apenas a area azul da marca antes de gerar a versao branca.

### Decisao

- Duplicar de forma explicita o asset oficial quadrado como `backend/public/icon.png`, porque backend e frontend sao apps separados em producao e o container do backend nao deve depender de `frontend/public`.
- Levar para a pagina Chromium o mesmo principio do cliente: detectar pixels azuis da marca, calcular bounding box, aplicar padding minimo, escalar com proporcao uniforme e centralizar o resultado em canvas quadrado antes de recolorir para branco/transparente.
- Atualizar o fallback vetorial backend para o desenho com elipses e hastes usado no cliente, evitando a aproximacao anterior de tres circulos.
- Invalidar resultados efemeros por nova chave de cache/job: `share-render-v4-square-logo-cfr30-quality-server` e `share-render-job-v2-square-logo-cfr30`.

### Consequencias

- O header do MP4 gerado pelo backend deve exibir a marca real da Lectum em branco, proporcional ao texto e sem aparencia achatada/deformada.
- O backend ganha um asset estatico pequeno ja existente no produto, sem dependencia nova e sem acoplar o deploy ao frontend.
- Nao ha mudanca de API, banco, storage, provider, env, pacote, FFmpeg ou dados persistidos. Rollback simples reverte o asset, o crop/fallback e as versoes efemeras.

### Validacao

As validacoes finais foram registradas na TASK-42 em 0.1.248, incluindo teste direcionado do renderer backend, checks/builds relevantes, guardas de documentacao e smoke de homologacao apos push.
