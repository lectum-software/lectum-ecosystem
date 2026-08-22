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
- A duracao exportada e limitada a 60 segundos para reduzir risco de travamento e arquivos excessivos no browser.

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
