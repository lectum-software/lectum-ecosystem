# ADR-0191: Layout social de compartilhamento de video-resposta

## Status

Accepted

## Task relacionada

TASK-42

## Contexto

A Lectum passara a ser tambem uma fonte de criacao de conteudo para psicologos. Videos-resposta feitos na comunidade devem poder ser compartilhados em redes sociais mantendo uma identidade visual padronizada da Lectum, mas sem parecer peca institucional.

As decisoes de produto definidas em 2026-06-30 foram: usar o mesmo botao Share, oferecer somente o formato vertical 9:16, remover play central, nao desenhar CTA/link clicavel, exibir "Pergunta na Lectum", usar titulo do post ou previa do comentario e suprimir identidade do psicologo, funcao, selo e wordmark de rodape no arquivo compartilhavel. A mudanca evita conflito com a UI de Reels/TikTok/Instagram, que ja exibe dados de usuario e controles no rodape. O formato quadrado/feed foi removido no mesmo dia apos validacao visual no localhost porque comprimia demais video e pergunta. A tela de compartilhamento tambem foi simplificada para se aproximar da galeria do celular: sem textos acima do video, apenas botao X e opcoes abaixo. Em seguida, a linha de acoes foi ajustada para `Copiar link`, `WhatsApp`, `Instagram`, `TikTok` e `Mais`, removendo a opcao direta de baixar. Para manter a folha mais limpa, o preview e os botoes deixaram de ter sombras externas. A interacao da modal foi refinada com animacao vertical de entrada/saida, gesto de arrastar para baixo, fechamento por `X` e fechamento ao clicar fora. Quando a resposta profissional tem texto escrito, a modal exibe ate duas linhas abaixo do preview e oferece copia discreta por icone para uso como legenda escrita.

## Decisao

- O layout social sera gerado no frontend com APIs nativas do navegador (`canvas`, `MediaRecorder`, `canvas.captureStream`, Web Share API e clipboard), sem package novo.
- O Share existente continua sendo a unica entrada. Para video-resposta profissional, abre um modal Lectum com preview vertical 9:16 unico para Stories/Reels/TikTok/Shorts; para outros casos, mantem o compartilhamento de link existente.
- A arte exportada renderiza video de fundo e card da pergunta/comentario no topo, sem identificacao do psicologo, sem selo verificado, sem funcao, sem wordmark `lectum` no rodape, sem play central, sem CTA e sem variante quadrada/feed.
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
- A remocao de identidade/wordmark no rodape reduz excesso visual quando a rede social adiciona nome do usuario, avatar, botoes de seguir/curtir/comentar/compartilhar e contadores.
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
