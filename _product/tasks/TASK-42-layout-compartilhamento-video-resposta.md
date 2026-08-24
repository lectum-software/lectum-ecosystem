# TASK-42: Layout de compartilhamento social para vídeo-resposta

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-42 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Comunidades e crescimento orgânico |
| Status | Completed |
| Dependências | TASK-23, TASK-26, TASK-28, TASK-29B |
| ADR alvo | ADR-0191 |

## Contexto

A Lectum será fonte de criação de conteúdo para psicólogos. Vídeos-resposta feitos para responder perguntas ou comentários na comunidade precisam poder sair da Lectum com um layout social padronizado, parecido com resposta de caixinha do Instagram, sem aparência institucional.

Decisão de produto definida em 2026-06-30:

- o botão existente de **Compartilhar/SHARE** deve ser a entrada única para exportar o layout;
- não criar botão separado de exportar redes;
- o layout deve existir somente no formato vertical 9:16 (Stories/Reels/TikTok/Shorts);
- a miniatura/preview da modal também deve preservar 9:16 visualmente, sem compressão por limite de altura em mobile ou desktop;
- a tela de compartilhamento deve se aproximar da experiência de compartilhar mídia pela galeria do celular: sem textos/cabeçalho acima do vídeo, apenas botão `X` de saída, vídeo em destaque e opções abaixo;
- a modal deve entrar e sair com animação suave de movimento vertical;
- o usuário deve conseguir arrastar a modal para baixo para fechá-la, como uma bottom sheet nativa;
- enquanto a modal estiver aberta, o scroll da página ao fundo deve ficar bloqueado; todo gesto de rolagem deve ficar restrito à própria modal;
- as opções abaixo do vídeo devem ficar em uma única linha, na ordem `Copiar link`, `WhatsApp`, `Instagram`, `TikTok` e `Mais`;
- o preview do vídeo e os botões da share sheet não devem ter sombreamento externo, mantendo a tela mais limpa;
- WhatsApp, Instagram e TikTok devem usar SVGs locais de marca baseados no Simple Icons, sem instalar package novo; a cor/fundo de marca preenche todo o bloco do botão, mas o símbolo interno mantém o mesmo tamanho visual do ícone de `Copiar link`;
- a linha de botões não deve exibir barra de rolagem horizontal quando as ações couberem no espaço disponível;
- não incluir play central;
- não incluir botão/link/CTA dentro da arte, porque links clicáveis são configurados dentro do Instagram/TikTok;
- o topo usa card estilo story com o texto "Pergunta na Lectum";
- o card da pergunta deve se aproximar da caixinha do Instagram, com faixa superior azul Lectum e o texto "Pergunta na Lectum" em branco;
- para vídeo-resposta de post, o card mostra o título/pergunta do post;
- para vídeo-resposta de comentário, o card mostra uma prévia do comentário;
- a arte compartilhável deve evitar identidade completa no rodapé (função, CRP e marca `lectum`), mas pode exibir uma tag compacta sem foto de perfil, com nome do psicólogo limitado a 18 caracteres e selo quando verificado, posicionada acima da área de UI das redes;
- quando a resposta profissional também tiver texto escrito, a modal deve exibir abaixo do preview até duas linhas desse texto e uma ação discreta apenas com ícone de copiar, sem fundo cinza nem rótulo "Texto da resposta", para o psicólogo usar como legenda escrita em Reels/TikTok/feed quando fizer sentido;
- ao copiar o texto da resposta, a confirmação deve usar toast/tag verde global no topo da tela, sem faixa verde inline dentro da modal;
- no desktop, a composição deve caber na altura visível sem barra de rolagem na modal, mantendo o `X` funcional e permitindo fechar ao clicar fora da share sheet.

Referência visual complementar aprovada pelo usuário:

- `_product/proto/Compartilhamento Lectum - video-resposta stories referencia.png`

A referência é norte visual e não arquitetura final. O Builder/Quick Copy não possui tela específica de compartilhamento social no inventário vigente; nesta execução, a referência auditável é a imagem complementar registrada em `PROTO-INVENTORY.md`.

## Objetivo

Ao tocar em Compartilhar em uma vídeo-resposta profissional, o usuário visualiza o modelo Lectum vertical 9:16 em uma share sheet limpa, parecida com a galeria do celular: `X` no topo, vídeo em destaque e opções de compartilhamento abaixo. Quando o navegador não suporta compartilhamento de arquivos, o arquivo é baixado como fallback honesto e o link direto é copiado quando possível.

## Pré-requisitos e bloqueios

- Arquitetura obrigatória em `ARCHITECTURE.md`.
- Política de packages em `PACKAGES.md`.
- `PROTO-INVENTORY.md` consultado e atualizado com a referência complementar.
- Não instalar package novo.
- Não alterar schema Prisma nem migrations.
- Usar APIs reais existentes de post/reply/share; sem mock ou endpoint simulado.
- Browser pode limitar `MediaRecorder`, `canvas.captureStream`, Web Share API com arquivos ou CORS da mídia. A implementação deve ter fallback honesto para download/cópia de link.

## Escopo frontend

- Criar componente mobile-first de modal/preview para layout de vídeo-resposta.
- Gerar arquivo via APIs nativas do navegador, mantendo overlay com:
  - card da pergunta/comentário;
  - vídeo de fundo;
  - tag compacta do psicólogo com nome/selo quando verificado, sem foto de perfil, sem função, sem CRP, sem wordmark de rodapé, sem play central e sem CTA/link.
- Integrar o mesmo fluxo ao botão Compartilhar em:
  - feed geral de comunidade;
  - página interna da comunidade;
  - detalhe do post e tela de thread;
  - meus posts/respostas;
  - posts salvos;
  - publicações no perfil público do psicólogo.
- Quando não for vídeo-resposta profissional, manter o compartilhamento de link existente.

## Escopo backend

- Sem migration.
- Ajustar DTOs já existentes para que `highlighted_professional_reply` carregue `parent_reply_id` e `parent_content`, permitindo usar prévia do comentário quando a vídeo-resposta responde a comentário.
- Manter rotas e persistência de `post_share` existentes.

## Fora do escopo

- Renderização server-side de vídeo.
- Integração direta com APIs do Instagram/TikTok.
- Link clicável dentro da arte exportada.
- Garantia de suporte universal a áudio/codec em todos os navegadores.
- Nova métrica além do `post_share` real já existente.
- Mudança de schema, storage ou upload.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`, seções "Frontend", "Data fetching", "Regras de UI" e "Anti-recriação".
- `DATA-MODEL.md`, seção de comunidade/posts e `post_share`.
- `PACKAGES.md`, política de dependências: usar apenas dependências já instaladas e APIs Web nativas.
- `PROTO-INVENTORY.md`, referência visual complementar do layout de compartilhamento.

Backend esperado:

- `PostProfessionalReplyDTO` e `CommunityProfessionalReplyDTO` devem incluir:
  - `parent_reply_id: string | null`;
  - `parent_content: string | null`.
- Repositórios de posts, comunidade e perfil público de psicólogo devem selecionar `parent_reply` para preencher a prévia.
- Sem novo endpoint.
- Sem migration.

Frontend esperado:

- Utilitário de target para decidir quando a resposta é vídeo profissional compartilhável.
- Utilitário de exportação por canvas/MediaRecorder sem package novo.
- Modal de preview vertical 9:16 sem seletor de formato e sem textos acima do vídeo.
- Bloco opcional abaixo do preview com duas linhas do texto escrito da resposta e botão discreto de copiar apenas com ícone.
- Share sheet abaixo do vídeo com uma única linha de ações: copiar link, WhatsApp, Instagram, TikTok e Mais.
- Integração nas superfícies que já chamam `useSharePost`/`useShareReply`.
- Persistir `shareReply` quando o compartilhamento/exportação for concluído por Web Share ou fallback com cópia de link.

Packages usados:

- Já instalados: React/Next, lucide-react, componentes existentes.
- Assets locais: SVGs de marca do Simple Icons em `frontend/public/svg/brand-*.svg`.
- APIs nativas: `canvas`, `MediaRecorder`, `Web Share API`, `navigator.clipboard`.
- Nenhum package novo.

Regras anti-recriação:

- Reutilizar `CommunityPostCard`, `CommunityActionBar`, `VerifiedBadgeIcon`, `resolvePublicMediaUrl`, `useSharePost` e `useShareReply`.
- Não criar design system paralelo.
- Não alterar o fluxo de criação de post/resposta.

Regras de UI obrigatórias:

- Mobile-first, base ~390px, com modal responsivo para desktop.
- Nunca usar `<img>` cru; imagens da UI usam `next/image`.
- Sem campos/formulários.
- Cores da UI do modal por tokens sempre que aplicável; cores fixas só na arte canvas exportada para preservar identidade do arquivo gerado.

## Critérios de aceite

- [x] Botão Compartilhar abre o layout Lectum para vídeo-resposta profissional em posts, comentários/thread, salvos, meus posts e perfil público.
- [x] Layout vertical 9:16 usa o card padronizado com "Pergunta na Lectum"; modelo quadrado/feed foi removido por ficar espremido no preview.
- [x] Preview da modal preserva 9:16 visualmente no mobile e desktop, calculando a largura pelo limite de altura disponível.
- [x] Modal de compartilhamento não exibe cabeçalho/textos acima do vídeo; mantém somente botão `X` de saída e opções abaixo do vídeo.
- [x] Modal entra e sai com animação suave de movimento vertical.
- [x] Modal pode ser arrastada para baixo para fechar, sem depender apenas do botão `X`.
- [x] Modal bloqueia o scroll da página ao fundo enquanto aberta, mantendo controle de rolagem apenas na própria share sheet.
- [x] Preview do vídeo e botões da share sheet não exibem sombreamento externo.
- [x] Vídeo-resposta de post usa o título/pergunta do post; vídeo-resposta de comentário usa prévia do comentário quando disponível.
- [x] Exportação e preview exibem apenas tag compacta sem foto de perfil, com nome limitado a 18 caracteres e selo do psicólogo, suprimindo função, CRP e wordmark de rodapé para evitar excesso de elementos nas redes sociais.
- [x] Quando a resposta tem texto escrito, a modal mostra até duas linhas abaixo do preview e oferece ação de cópia para uso como legenda escrita.
- [x] Card da pergunta usa faixa superior azul Lectum com "Pergunta na Lectum" em branco, aproximando a composição da caixinha do Instagram.
- [x] Texto escrito da resposta aparece sem título/fundo cinza, com ação de copiar apenas por ícone discreto.
- [x] Cópia do texto usa toast verde global no topo, sem faixa verde inline na modal.
- [x] Desktop ajustado para caber sem barra de rolagem na modal; `X` e clique fora fecham a share sheet.
- [x] Exportação não mostra play central e não inclui CTA/link clicável desenhado.
- [x] Share sheet exibe `Copiar link`, `WhatsApp`, `Instagram`, `TikTok` e `Mais` em uma única linha, sem a opção direta de baixar.
- [x] Botões de WhatsApp, Instagram e TikTok usam fundo de marca ocupando todo o botão, com símbolo interno no mesmo tamanho visual do ícone de `Copiar link`.
- [x] Linha de botões não exibe barra de rolagem horizontal visível.
- [x] Fallback de navegador baixa o arquivo e copia o link quando possível, sem mascarar limitação.
- [x] `highlighted_professional_reply` expõe `parent_reply_id` e `parent_content` sem migration.
- [x] UI mobile-first; nenhum `<img>` cru (somente `next/image`).
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [x] Formulários/campos da TASK-02 não se aplicam.
- [x] Builder/Quick Copy não tinha tela específica acessível; referência local registrada em `_product/proto` e `PROTO-INVENTORY.md`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- `pnpm check`.
- Browser local em rota com cards de comunidade/post, validando abertura do modal e ausência de play central no layout.

## Notas de execução

- A geração de vídeo usa capacidades do navegador; em browsers sem `MediaRecorder`/`canvas.captureStream` ou sem suporte a compartilhamento de arquivos, o fallback é download/cópia de link.
- A duração exportada é limitada a até 60 segundos para evitar arquivos excessivos e travamentos no navegador.
- Ajuste de produto em 2026-06-30: modelo quadrado/feed removido; manter somente o vertical 9:16 porque preserva melhor a leitura e o enquadramento do vídeo-resposta.
- Ajuste de produto em 2026-06-30: modal redesenhado como share sheet de galeria, sem header textual acima do vídeo e com opções abaixo. Os atalhos de WhatsApp/Instagram/TikTok usam a Web Share API nativa para abrir a folha de compartilhamento do dispositivo; browsers web não permitem forçar programaticamente um app específico recebendo o arquivo.
- Validações executadas em 2026-06-30: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome headless mobile em `http://localhost:3000/community`.
- O browser local validou render da rota pública sem erro. A base local retornou comunidades reais, mas nenhum post/vídeo-resposta profissional; por isso, a abertura visual do modal não foi exercitada com dados reais para evitar mock/seed artificial.
- Ajuste vertical-only validado em 2026-06-30 com `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` retornando 200. Tentativa de screenshot headless dessa rota excedeu timeout local do Chrome, sem bloquear porque a página já estava validada no browser do usuário.
- Ajuste share sheet validado em 2026-06-30 com `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` retornando 200. O modal agora começa pelo preview do vídeo, tem apenas `X` acima e move WhatsApp/Instagram/TikTok/baixar/copiar para abaixo do vídeo.
- Ajuste de ícones/ações em 2026-06-30: SVGs locais de marca do WhatsApp, Instagram e TikTok foram salvos a partir do Simple Icons em `frontend/public/svg/brand-*.svg`, sem package novo. A share sheet removeu a opção direta de baixar e passou a mostrar uma única linha na ordem `Copiar link`, `WhatsApp`, `Instagram`, `TikTok` e `Mais`. Validado com `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` retornando 200.
- Ajuste de controle de scroll em 2026-06-30: a modal aplica scroll lock em `html/body` enquanto aberta, restaura a posição original ao fechar e usa `overscroll-contain` para manter a rolagem dentro da share sheet.
- Ajuste visual em 2026-06-30: removidos os sombreamentos externos do preview do vídeo, dos botões de ação e do botão `X`, preservando apenas a estrutura limpa da share sheet.
- Ajuste visual em 2026-06-30: os botões de WhatsApp, Instagram e TikTok foram separados em fundo de marca ocupando todo o bloco visual e símbolo interno branco com tamanho equivalente ao ícone de `Copiar link`, evitando ampliar o símbolo junto com o fundo.
- Ajuste de interação em 2026-06-30: adicionada animação de entrada/saída vertical da bottom sheet e gesto de arrastar para baixo para fechar, com threshold de fechamento e retorno suave quando o gesto não atinge o limite. Refinamentos visuais/interativos validados com `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` retornando 200.
- Ajuste visual em 2026-06-30: removida a rolagem horizontal visível da linha de botões, substituindo `overflow-x-auto` por distribuição fixa das cinco ações. Validação final dos refinamentos com `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check`.
- Ajuste de proporção em 2026-06-30: removido o `max-height` que comprimia o preview; a largura agora usa `min(76vw, 320px, 34.875dvh)` com `aspect-ratio: 9 / 16`, preservando a miniatura vertical em mobile e desktop.
- Ajuste de composição em 2026-06-30: por análise da visualização de Reels/Instagram, a arte passou a focar somente no card superior, com o texto "Pergunta na Lectum"; identidade do psicólogo, selo, função e wordmark de rodapé foram removidos do preview e do arquivo exportado para evitar conflito com a UI das redes. A modal também passou a exibir, quando existir, duas linhas do texto escrito da resposta e uma ação de copiar para uso como legenda escrita.
- Validação do ajuste de composição/legenda escrita em 2026-06-30: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` retornando 200.
- Ajuste de refinamento visual em 2026-06-30: card da pergunta passou a ter faixa superior azul Lectum com texto branco, o bloco de texto da resposta removeu título/fundo cinza e passou a usar cópia apenas por ícone, a confirmação de cópia usa toast global, e a modal desktop foi reduzida para caber sem scroll interno com fechamento por `X` e clique fora. Validado com `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` retornando 200.
- Correção em 2026-06-30: removido definitivamente o feedback verde inline da modal; cópia de texto, cópia de link e compartilhamento concluído passam a usar apenas toast global no topo. O fechamento por `X` e clique externo passou a usar `pointerdown` com guarda contra disparo duplicado, o desktop foi reduzido para uma caixa mais proporcional e a sheet recebeu `touch-none` com vídeo sem captura de ponteiro para permitir arrastar para baixo também no mobile.
- Validação da correção em 2026-06-30: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` retornando 200.
- Correção visual em 2026-06-30: o card superior do preview no desktop recebeu escala própria, com fonte e padding menores, mantendo o card mobile inalterado para evitar o título desproporcional sobre o vídeo.
- Validação da correção visual do card em 2026-06-30: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` retornando 200.
- Ajuste de regras de compartilhamento em 2026-06-30: posts textuais de pacientes e psicólogos passaram a abrir uma share sheet simples, sem preview/miniatura textual, com apenas `Copiar link` e `WhatsApp` habilitados; `Instagram`, `TikTok` e `Mais` ficam desabilitados porque a web não controla DMs desses apps de forma confiável. Posts originais de psicólogo com vídeo, imagem única ou carrossel usam layout social 9:16 com faixa `Postado na Lectum`; carrossel usa a primeira imagem no MVP e informa que o link abre o post completo. Vídeo-respostas usam faixa `Respondido na Lectum`. Vídeos horizontais são preservados em 9:16 com fundo preto/letterbox, sem crop agressivo.
- Validação das novas regras de compartilhamento em 2026-06-30: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` retornando 200.
- Ajuste complementar em 2026-07-01: a legenda abaixo do preview ficou mais discreta (menor, com menor peso e cor muted), posts originais de psicologo com midia passam a mostrar o texto escrito do post como legenda/copiar texto abaixo do video, e o card superior reduziu a tipografia do titulo/previa, limitando o corpo a 2 linhas com reticencias no preview e no canvas exportado.
- Validacao do ajuste complementar em 2026-07-01: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Ajuste premium do card em 2026-07-01: o card superior do preview/exportacao ficou mais sofisticado, com largura um pouco menor, bordas menos arredondadas, tipografia menos pesada, faixa azul mais compacta, sombra mais suave e radius reduzido tambem no canvas 9:16.
- Validacao do ajuste premium do card em 2026-07-01: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Ajuste de escala desktop em 2026-07-01: a share sheet social no desktop passou a aproveitar melhor o espaco util da tela, aumentando proporcionalmente a largura da modal e do preview 9:16 sem alterar o layout mobile nem a composicao exportada.
- Validacao do ajuste de escala desktop em 2026-07-01: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Refinamento premium do card em 2026-07-01: o card superior do layout social ganhou composicao mais editorial, com largura ligeiramente menor, cantos mais contidos, header azul em gradiente, corpo em fundo branco sutilmente tonalizado, tipografia menos pesada e alinhamento central para reduzir o aspecto de banner bruto no preview e no canvas exportado.
- Validacao do refinamento premium em 2026-07-01: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Ajuste de autoria profissional em 2026-07-01: o layout social voltou a exibir uma tag compacta com nome do psicologo e selo quando verificado, posicionada no terco inferior do video para preservar autoria sem reintroduzir foto de perfil, funcao, CRP ou wordmark de rodape.
- Validacao da tag de autoria em 2026-07-01: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Refinamento de tag/card em 2026-07-01: a tag do psicologo foi centralizada no video, recebeu fundo mais translucido e passou a mostrar o cargo `Psicologo/Psicologa` em linha menor abaixo do nome. Para nomes longos, a tag fica limitada a 18 caracteres antes de `...`, preservando selo e cargo visiveis.
- Correcao do card superior em 2026-07-01: o texto da pergunta/titulo ficou menor e o preview passou a usar clamp CSS explicito de 2 linhas, evitando a terceira linha residual depois das reticencias. O canvas exportado tambem reduziu tipografia, padding e line-height do card.
- Validacao do refinamento de tag/card em 2026-07-01: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Refinamento de tag em 2026-07-01: a tag de identificacao do psicologo ficou menor, sem foto de perfil, com nome e cargo alinhados entre si e line-height do cargo aumentado para nao cortar a base do `g` em `Psicologo`.
- Refinamento do card superior em 2026-07-01: o card `Respondido na Lectum`/`Postado na Lectum` recebeu cantos ainda menos arredondados no preview e no canvas exportado, mantendo o visual mais premium e menos grosseiro.
- Ajuste visual em 2026-07-01: o background da tag do psicologo ficou ainda mais transparente no preview e no canvas exportado para interferir menos no video.
- Ajuste visual em 2026-07-01: o background da tag do psicologo foi removido do preview e do canvas exportado; a leitura passa a depender de texto branco com sombra discreta, nome limitado e selo quando verificado.
- Validacao do ajuste sem background em 2026-07-01: `pnpm --dir frontend typecheck`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `GET http://localhost:3000/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` com status 200.
- Ajuste textual desktop em 2026-07-01: a share sheet de posts textuais passou a usar a mesma largura maxima mobile-first de 430px tambem no breakpoint desktop, evitando que a linha `Copiar link`, `WhatsApp`, `Instagram`, `TikTok` e `Mais` seja cortada pelo padding interno da modal. A regra de acoes permanece inalterada: em conteudo textual, apenas `Copiar link` e `WhatsApp` ficam habilitados.
- Validacao do ajuste textual desktop em 2026-07-01: `pnpm --dir frontend exec biome check --write "src/components/share/lectum-share-video-modal.tsx"`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, HTTP local `200` em `/community/autocuidado-em-pratica/post/cmr26lrh70003nouhg6pd23j6` e Chrome/CDP local desktop 1365x768 confirmando as cinco acoes visiveis dentro de uma sheet de 430px, sem corte lateral.

## Complemento 2026-07-01 - controles de cards com resposta destacada pertencem ao post

- Pedido do usuario: quando um post do feed exibe uma resposta destacada de psicologo, a barra unica de controles nao deve misturar entidades diferentes; upvote/downvote, comentar, salvar e compartilhar pertencem ao proprio post.
- Frontend: em cards de post do feed geral, pagina interna da comunidade, meus posts e posts salvos, o botao Compartilhar deixou de usar a resposta profissional destacada como fallback de layout social. A barra agora compartilha o post: layout `Postado na Lectum` somente quando o post original de psicologo tem midia; caso contrario, share sheet de link do post.
- Frontend: respostas salvas ou cards cujo item exibido e explicitamente uma resposta continuam podendo compartilhar a propria resposta, pois nesse caso a barra pertence a resposta exibida.
- Acesso ao compartilhamento do video destaque passa a exigir abrir o detalhe do post e acionar o compartilhamento da resposta no contexto da thread.
- Nao houve alteracao de backend, Prisma schema, migrations, endpoints, payloads, packages, votos, salvos ou persistencia de `post_share`/`reply_share`.
- Fonte visual/auditavel: screenshot do usuario nesta conversa e `_product/proto/Feed Comunidade.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR criado: `adrs/0196-controles-post-feed-resposta-destacada.md`.

### Criterios de aceite do complemento

- [x] A barra unica do card de post aciona voto, comentario, salvamento e compartilhamento do proprio post.
- [x] Compartilhar em card de post com resposta destacada nao abre mais o layout social da resposta destacada.
- [x] Video-resposta destacada continua compartilhavel ao entrar no detalhe do post e usar a acao da propria resposta.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo ou migration foi usado.
- [x] Validacoes frontend foram executadas sem erro; browser local mobile-first foi aberto em `/`, mas nao exercitou cards porque a API local `localhost:3001` retornou 500 para o feed nesta sessao, sem uso de mock/seed.

### Validacoes do complemento

- [x] `pnpm --dir frontend exec biome check --write -- "src/app/app/community/[slug]/logic.tsx" "src/app/app/posts/saved/logic.tsx" "src/app/app/posts/mine/logic.tsx"`
- [x] `pnpm --dir frontend check` (primeira tentativa excedeu timeout durante `tsc`; repetida com timeout maior e concluiu sem erros)
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] HTTP local `200` em `http://localhost:3000/`.
- [x] Chrome headless local mobile 390x844 abriu `http://localhost:3000/` e confirmou render do shell do feed; a lista permaneceu em loading porque `http://localhost:3001/api/private/community/feed/posts?limit=1` retornou 500 nesta sessao.

## Complemento 2026-07-07 - destaque automatico somente em respostas diretas

- Pedido do usuario: quando o card do post exibe uma resposta profissional em destaque, essa resposta deve ser uma resposta direta ao post original. Respostas de psicologos a comentarios de outros usuarios nao devem aparecer como se respondessem o autor/pergunta principal.
- Backend: os seletores automaticos de `highlighted_professional_reply` no feed/comunidade, listas de posts e publicacoes do perfil profissional passam a filtrar `parent_reply_id=null`.
- Respostas aninhadas continuam existindo e seguem visiveis no detalhe/thread; quando um card representa explicitamente uma contribuicao do tipo resposta, a resposta persistida continua podendo ser exibida como conteudo principal dessa contribuicao.
- Nao houve alteracao de schema, migration, endpoint, payload, upload, share ou packages.
- ADR criado: `adrs/0223-destaque-profissional-apenas-resposta-direta.md`.

### Criterios de aceite do complemento

- [x] `highlighted_professional_reply` automatico considera apenas respostas profissionais diretas ao post.
- [x] Video-resposta profissional a comentario de terceiro deixa de aparecer como destaque do card do post.
- [x] Respostas aninhadas continuam acessiveis no detalhe/thread, sem exclusao ou mock de dados.
- [x] Sem package novo, migration ou endpoint paralelo.

### Validacoes do complemento

- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm check`
- [x] `git diff --check`

## Complemento 2026-08-12 - clamp de 2 linhas no preview de compartilhamento

- Pedido do usuario: no preview do video a compartilhar, a caixinha de pergunta ainda mostrava 3 linhas com a ultima cortada; deve exibir somente 2 linhas com reticencias.
- Fonte visual auditavel: screenshot enviado pelo usuario em `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-12 at 17.43.16.jpeg` e referencia local `_product/proto/Compartilhamento Lectum - video-resposta stories referencia.png`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- Frontend: o preview HTML da share sheet separou o padding do elemento que aplica `-webkit-line-clamp`, evitando o vazamento conhecido do WebKit/iOS quando o clamp fica no mesmo elemento com padding vertical.
- Frontend: o texto da pergunta no preview passou a depender do clamp visual de 2 linhas, com `max-height` equivalente a duas linhas e normalizacao de espacos, em vez de truncagem fixa por quantidade de caracteres.
- Frontend: o `wrapText` do canvas/exportacao foi reforcado para respeitar `maxQuestionLines=2` e aplicar reticencias na ultima linha quando houver conteudo truncado.
- Escopo: sem mudancas de backend, Prisma schema, migrations, endpoints, payloads, packages, envs, storage, persistencia de compartilhamento, tracking ou upload.
- ADR atualizado: `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Criterios de aceite do complemento

- [x] A caixinha de pergunta do preview da share sheet mostra no maximo 2 linhas.
- [x] Quando a pergunta/titulo passa de 2 linhas, a segunda linha recebe reticencias e a terceira nao aparece cortada.
- [x] A exportacao por canvas segue o mesmo limite de 2 linhas com reticencias.
- [x] O ajuste permanece frontend-only e compativel com backend antigo/novo.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir frontend check` (repetido apos o bump em `0.1.76`)
- [x] `pnpm --dir frontend build` (repetido apos o bump em `0.1.76`)
- [x] Next local buildado em `http://127.0.0.1:3050`: `/version` respondeu `0.1.75`, a rota `/comunidades/ansiedade-em-equilibrio/publicacao/demo-post-ansiedade-apresentacao-video` respondeu `200`, e validacao estatica confirmou `maxHeight: "2.16em"` no clamp do preview e `maxQuestionLines: 2`/reticencias no canvas; repetido em `http://127.0.0.1:3051` apos o bump, com `/version` em `0.1.76` e rota `200`.
- [x] `pnpm check`
- [x] `pnpm check:encoding`
- [x] `pnpm check:adrs`
- [x] `pnpm check:tasks`
- [x] `git diff --check`
- [x] `pnpm version:bump` para `0.1.76`
- [x] `pnpm check:version`

## Complemento 2026-07-07 - exemplos locais com video-respostas diretas

- Pedido do usuario: apos restringir o destaque automatico a respostas diretas ao post, ajustar os exemplos locais para que video-respostas de psicologos aparecam em destaque nos posts de pacientes.
- Dados operacionais: as cinco video-respostas demonstrativas existentes em ansiedade, autocuidado, depressao, relacionamentos e TDAH foram atualizadas no banco de desenvolvimento para `parent_reply_id=null`, reaproveitando os mesmos registros e URLs de midia reais ja persistidos.
- Nenhum mock, endpoint paralelo, migration, package ou seed novo foi criado. A alteracao e intencionalmente operacional no banco de desenvolvimento atual para exemplificacao visual.
- ADR criado: `adrs/0224-exemplos-video-respostas-diretas.md`.

### Criterios de aceite do complemento

- [x] Posts demonstrativos de pacientes exibem `highlighted_professional_reply` com `media_type="video"`.
- [x] As video-respostas destacadas dos exemplos possuem `parent_reply_id=null`.
- [x] A regra de dominio da ADR-0223 permanece inalterada.
- [x] Sem schema, migration, endpoint, package ou seed novo.

### Validacoes do complemento

- [x] `GET http://localhost:3001/api/private/community/feed/posts?limit=30` retornou os cinco posts `[Exemplo Lectum]` com destaque de video e `parent_reply_id=null`.
- [x] `pnpm --dir backend check`
- [x] `pnpm check`
- [x] `git diff --check`

## Complemento 2026-08-12 - som no preview do video compartilhavel

- Pedido do usuario: no preview do video a ser compartilhado, exibir/reproduzir o som do video.
- Fonte visual auditavel: screenshot enviado pelo usuario em `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-12 at 17.43.16.jpeg` e referencia local `_product/proto/Compartilhamento Lectum - video-resposta stories referencia.png`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- Diagnostico: o preview HTML da share sheet renderizava o `<video>` com `muted`, entao a previa ficava sempre silenciosa apesar de a exportacao ja tentar capturar trilhas de audio via `captureStream` quando o navegador suporta.
- Frontend: o preview foi extraido para `frontend/src/components/share/lectum-share-preview.tsx` para manter a modal abaixo do limite de tamanho e isolar a logica de midia.
- Frontend: videos no preview agora tentam iniciar com som por `playVideoWithSound`; quando o navegador bloqueia autoplay com audio, o preview continua tocando mudo e exibe um botao de som para ativacao por gesto do usuario.
- Frontend: a modal continua usando a mesma share sheet e o arquivo exportado segue preservando trilhas de audio quando disponiveis pelo suporte nativo do browser.
- Escopo: sem mudancas de backend, Prisma schema, migrations, endpoints, payloads, packages, envs, storage, persistencia de compartilhamento, upload ou tracking.
- ADR atualizado: `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Criterios de aceite do complemento

- [x] O preview de video da share sheet nao fica mais forcado como mudo no markup.
- [x] A previa tenta reproduzir com som ao abrir a modal.
- [x] Se o navegador bloquear autoplay com audio, existe botao de som no preview para ativar por gesto do usuario.
- [x] A exportacao continua preservando audio quando `captureStream` disponibiliza trilhas de audio.
- [x] O ajuste permanece frontend-only e compativel com backend antigo/novo.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] Validacao estatica via Node confirmou `playVideoWithSound`, `muted={videoIsMuted}`, botao `Ativar som do video do preview`, extracao de `SharePreview` e preservacao de `getAudioTracks()` na exportacao.
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build` (repetido apos o bump para validar a versao `0.1.80`)
- [x] Browser local/headless mobile no frontend buildado em `http://127.0.0.1:3055`: `/version` respondeu `0.1.79` e a rota `/comunidades/ansiedade-em-equilibrio/publicacao/demo-post-ansiedade-apresentacao-video` carregou em viewport 390x844; repetido apos o bump em `http://127.0.0.1:3056`, com `/version` em `0.1.80`.
- [x] `pnpm check` (primeira tentativa falhou por caractere corrompido na documentacao; apos normalizar para ASCII, foi repetido com sucesso)
- [x] `git diff --check`
- [x] `pnpm check:encoding`
- [x] `pnpm check:adrs`
- [x] `pnpm check:tasks`
- [x] `pnpm version:bump` para `0.1.80`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.

## Complemento 2026-08-22 - preparo antecipado do arquivo de compartilhamento

- Pedido do usuario: verificar por que o upload/compartilhamento do video para WhatsApp, Instagram, TikTok e redes sociais estava falhando na share sheet de video-resposta.
- Diagnostico: a midia real da captura em homologacao (`/public/files/posts/media/ocjjmug8tro0hls869qoddta.mp4`) responde com CORS correto e pode ser desenhada em canvas no Chrome; a falha provavel estava no momento da chamada nativa de compartilhamento. O fluxo anterior gerava o arquivo somente depois do toque no app social e, em videos longos, a chamada `navigator.share()` acontecia fora da ativacao transiente do gesto do usuario, comportamento bloqueado em navegadores moveis.
- Frontend: a share sheet social agora inicia `prepareLectumShareFile` assim que a modal abre, mantendo os botoes de WhatsApp, Instagram, TikTok e Mais desabilitados enquanto o arquivo esta sendo preparado.
- Frontend: ao tocar em uma rede social, o fluxo usa o arquivo ja preparado com `sharePreparedLectumVideoResponse`, reduzindo o risco de perder o gesto do usuario antes de abrir a folha nativa de compartilhamento.
- Frontend: o payload do Web Share agora tenta primeiro arquivo + texto/titulo e cai para `files`-only quando o navegador/app nao aceita metadata junto com arquivo, caso comum em destinos moveis.
- Frontend: se `navigator.share()` falhar por motivo tecnico diferente de cancelamento do usuario, o fluxo cai para download do arquivo e copia do link quando possivel, em vez de exibir erro de geracao indevido.
- Escopo: sem mudanca de backend, Prisma, migrations, endpoints, payloads, storage/R2, envs, providers, dados publicados ou packages.
- Fonte visual auditavel: screenshot do usuario `WhatsApp Image 2026-08-22 at 00.36.53.jpeg` e referencia local `_product/proto/Compartilhamento Lectum - video-resposta stories referencia.png`; Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao.
- ADR atualizado: `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Criterios de aceite do complemento

- [x] A midia publica real usada no relato continua carregando com CORS adequado para canvas.
- [x] A share sheet social prepara o arquivo assim que a modal abre, antes do toque em WhatsApp/Instagram/TikTok/Mais.
- [x] Os botoes de destino com arquivo ficam desabilitados e informam preparo enquanto o arquivo ainda nao esta pronto.
- [x] O toque nos destinos sociais usa o arquivo preparado, preservando a ativacao do usuario para `navigator.share()`.
- [x] O Web Share cai para payload `files`-only quando texto/titulo junto com arquivo nao sao suportados.
- [x] Falha tecnica do share nativo diferente de cancelamento cai para download/copia de link, sem mensagem falsa de erro de geracao.
- [x] Cancelamento da folha nativa pelo usuario nao vira erro visual.
- [x] Nenhum backend, endpoint, migration, env, provider ou package novo foi adicionado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.

### Validacoes

- [x] HEAD/GET com `Origin: https://homolog.lectum.com.br` na midia real de homologacao confirmou `Access-Control-Allow-Origin`, `Content-Type: video/mp4`, `Content-Length: 28427310` e suporte a range.
- [x] Chrome/CDP em `https://homolog.lectum.com.br` carregou a midia real, desenhou frame em canvas 1080x1920, gerou PNG via `toBlob` e gravou amostra MP4 via `MediaRecorder`, confirmando que CORS/canvas nao eram a causa no Chrome.
- [x] `pnpm --dir frontend exec biome check --write src/components/share/lectum-share-video-modal.tsx src/utils/lectum-share-media.ts src/utils/lectum-share-media/native-share.ts src/utils/lectum-share-media.test.mjs package.json`
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3185`: `/version` respondeu `0.1.173`.
- [x] `pnpm version:bump` para `0.1.173`
- [x] `pnpm check:version`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] `pnpm check:encoding`
- [x] `pnpm check:adrs`
- [x] `pnpm check:tasks`
- [x] `pnpm check:source-size`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.

## Complemento 2026-08-22 - caixinha com logo Lectum e autoria mais legivel

- Pedido do usuario: aproximar a proporcao da caixinha de pergunta da referencia Instagram, manter o texto `Respondido na Lectum`, adicionar a logo SVG da plataforma ao lado do texto para reconhecimento de marca e aumentar o bloco de autoria porque o nome estava pequeno e `Psicologo` muito junto ao nome.
- Decisao visual: o canvas 9:16 do compartilhamento passa a usar card superior mais largo e mais alto, com corpo minimo maior, ate 3 linhas para a pergunta/comentario e header com icone `frontend/public/logo-icon.svg` em chip claro ao lado de `Respondido na Lectum`/`Postado na Lectum`.
- Decisao visual: a tag de autoria profissional fica mais legivel no video exportado, com nome maior, selo alinhado ao nome, cargo centralizado em linha propria e espaco vertical explicito entre nome e cargo.
- Decisao operacional: como a arte cacheada depende da composicao visual, `POST_SHARE_ARTIFACT_LAYOUT_VERSION` foi atualizado para `lectum-share-v2-2026-08-22-brand-card`, invalidando naturalmente artefatos antigos sem apagar dados nem objetos.
- Escopo: ajuste mobile-first no layout exportado por canvas e versionamento interno do cache; sem package novo, env nova obrigatoria, contrato publico novo, provider novo, seed/mock ou dados artificiais.
- Fonte visual auditavel: screenshots do usuario `WhatsApp Image 2026-08-22 at 14.10.08.jpeg` e `WhatsApp Image 2026-08-22 at 14.01.46.jpeg`; Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao.
- ADR atualizado: `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Criterios de aceite do complemento

- [x] A caixinha de pergunta/resposta do arquivo social fica mais proxima da proporcao Instagram, com largura maior, altura minima maior e leitura de ate 3 linhas.
- [x] O header preserva `Respondido na Lectum`/`Postado na Lectum` e adiciona a logo SVG da Lectum ao lado do texto, com fallback seguro se o asset nao carregar.
- [x] O nome do profissional fica maior no arquivo exportado e o cargo `Psicologo`/`Psicologa` ganha respiro vertical em linha propria.
- [x] Artefatos cacheados antigos deixam de ser reaproveitados porque a versao interna do layout foi incrementada.
- [x] Nenhum package novo ou env obrigatoria nova foi adicionado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write src/utils/lectum-share-media/layout.ts src/utils/lectum-share-media/export.ts src/utils/lectum-share-media.test.mjs src/hooks/use-lectum-direct-share.ts src/api/req/posts/index.ts`
- [x] `pnpm --dir backend exec biome check --write src/modules/api/private/posts/repositories/queries/PostShareArtifactRepository.ts`
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir backend db:migrate --name add-post-share-artifacts` concluiu com `Already in sync, no schema change or pending migration was found.`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir backend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm --dir backend build`
- [x] Manifests sincronizados em `0.1.179`.
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.

## Complemento 2026-08-22 - compartilhamento direto pela folha nativa

- Pedido do usuario: a modal da Lectum com previa/opcoes ficava redundante, porque tocar em WhatsApp, Instagram ou TikTok abria em seguida a propria folha nativa de compartilhamento do celular.
- Decisao: suprimir a modal intermediaria da Lectum no caminho principal de compartilhamento de posts, respostas, salvos, minhas publicacoes e publicacoes no perfil do psicologo.
- Frontend: o clique em compartilhar agora chama `useLectumDirectShare`, que prepara o arquivo social real quando houver midia/video e aciona `navigator.share()` diretamente; posts textuais usam Web Share de link/texto direto.
- Frontend: a geracao de arquivo e o fallback de `files`-only da correcao anterior foram preservados. Se o navegador/app nao aceitar o arquivo ou bloquear a chamada nativa, o fallback baixa o arquivo e copia o link quando possivel; para link sem suporte nativo, copia o link.
- Frontend: a antiga `LectumShareVideoModal`, o preview HTML interno e o hook de tracking dependente de estado de modal foram removidos; o tracking de post/resposta passou para o hook direto.
- Limite tecnico mantido: a Web nao consegue abrir WhatsApp/Instagram/TikTok especificos com arquivo anexado de forma confiavel; o sistema operacional continua decidindo os destinos exibidos na folha nativa.
- Escopo: sem mudanca de backend, Prisma, migrations, endpoints, payloads, storage/R2, envs, providers, dados publicados ou packages.
- Fonte visual auditavel: screenshots do usuario `WhatsApp Image 2026-08-22 at 11.07.38.jpeg`, `WhatsApp Image 2026-08-22 at 11.06.46.jpeg` e `WhatsApp Image 2026-08-22 at 11.20.14.jpeg`; Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao.
- ADR atualizado: `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Criterios de aceite do complemento

- [x] Tocar em compartilhar em publicacoes com midia/video nao renderiza mais a modal de previa/opcoes da Lectum.
- [x] O compartilhamento de midia/video tenta preparar o arquivo social real e abrir a folha nativa do dispositivo diretamente.
- [x] O compartilhamento de posts textuais abre Web Share de link/texto diretamente quando suportado.
- [x] O tracking real de compartilhamento de post/resposta continua sendo enviado apos resultado com canal conhecido.
- [x] Falhas tecnicas do share nativo continuam com fallback seguro para download/copia, sem expor detalhe tecnico ao usuario.
- [x] Nenhum backend, endpoint, migration, env, provider ou package novo foi adicionado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.

### Validacoes

- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3186`: `/version` respondeu `0.1.175` e `/comunidades` respondeu `200`.
- [x] `pnpm version:bump` para `0.1.175`
- [x] `pnpm check:version`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] `pnpm check:encoding`
- [x] `pnpm check:adrs`
- [x] `pnpm check:tasks`
- [x] `pnpm check:source-size`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.

## Complemento 2026-08-22 - preparo silencioso e retry nativo cacheado

- Pedido do usuario: ao tocar em compartilhar, o toast de preparo aparecia e o audio do video comecava a tocar em segundo plano; depois do preparo, o iOS abria uma tela cinza de arquivo e exigia tocar em `Mais...`; alem disso, o arquivo aparecia como `lectum-respondido-vertical-9x16`.
- Diagnostico: a exportacao client-side usava um `<video>` invisivel para redesenhar a midia no canvas e chamava `play()` com `muted=false`, tornando audivel o elemento de preparo. Em navegadores moveis, quando a geracao termina fora da ativacao transiente do toque, `navigator.share()` pode ser bloqueado e o fallback de download abre a tela cinza de arquivo no iOS.
- Decisao: o elemento de video usado apenas para exportacao passa a ser sempre silencioso (`muted` e `volume=0`) antes de tocar para captura, sem afetar controles dos videos visiveis no feed.
- Decisao: quando a Web Share API sinaliza perda de ativacao do gesto (`NotAllowedError`/`SecurityError`), o frontend nao dispara mais download automatico do arquivo; ele mantem o arquivo preparado em cache e orienta o usuario a tocar em compartilhar novamente para abrir a folha nativa com o arquivo ja pronto.
- Decisao: quando o arquivo ja esta em cache, o proximo toque chama `navigator.share()` imediatamente, aumentando a chance de abrir diretamente a folha nativa do celular. Limite tecnico mantido: a Web nao consegue forcar a folha nativa apos uma geracao longa quando a ativacao do gesto ja expirou.
- Frontend: o nome/titulo compartilhado para midia agora usa `[Nome do psicologo] - Respondido na Lectum` ou `[Nome do psicologo] - Postado na Lectum`, com sanitizacao segura para nome de arquivo.
- Escopo: frontend-only, mobile-first; sem mudanca de backend, banco, Prisma, migrations, endpoints, payloads, storage/R2, envs, providers, jobs, dados publicados ou packages.
- Fonte visual auditavel: screenshots do usuario `WhatsApp Image 2026-08-22 at 12.46.45.jpeg`, `WhatsApp Image 2026-08-22 at 12.47.23.jpeg` e `WhatsApp Image 2026-08-22 at 12.47.48.jpeg`; Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao.
- ADR atualizado: `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Criterios de aceite do complemento

- [x] O preparo/exportacao do video compartilhavel nao toca audio em segundo plano.
- [x] Perda de ativacao do Web Share nao abre automaticamente a tela cinza de arquivo/download no iOS.
- [x] O arquivo preparado fica cacheado para o proximo toque abrir a folha nativa diretamente quando o navegador permitir.
- [x] O usuario recebe uma mensagem publica e nao tecnica quando precisa tocar de novo apos o preparo.
- [x] O arquivo compartilhado usa o nome do psicologo e o contexto `Respondido na Lectum` ou `Postado na Lectum`.
- [x] O fallback de download/copia permanece para navegadores sem Web Share de arquivo.
- [x] Nenhum backend, endpoint, migration, env, provider ou package novo foi adicionado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write src/hooks/use-lectum-direct-share.ts src/utils/lectum-share-media.ts src/utils/lectum-share-media/export.ts src/utils/lectum-share-media/file-name.ts src/utils/lectum-share-media/layout.ts src/utils/lectum-share-media/native-share.ts src/utils/lectum-share-target.ts src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build` antes e depois do bump para `0.1.176`.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3187`: `/version` respondeu `0.1.176` e `/comunidades` respondeu `200`.
- [x] `pnpm version:bump` para `0.1.176`
- [x] `pnpm check:version`
- [x] `pnpm check` (primeira tentativa falhou pelo timeout transitorio ja conhecido em `backend/scripts/boot-safety.test.mjs`; `pnpm --dir backend check` isolado passou e a repeticao completa de `pnpm check` passou).
- [x] `git diff --check`
- [x] `pnpm check:encoding`
- [x] `pnpm check:adrs`
- [x] `pnpm check:tasks`
- [x] `pnpm check:source-size`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.


## Complemento 2026-08-22 - audio preservado no arquivo exportado

- Pedido do usuario: o video compartilhado/exportado chegava sem audio nas redes sociais depois do ajuste que silenciou o preparo em segundo plano.
- Diagnostico: manter o video invisivel de exportacao com `muted=true` e `volume=0` impede audio audivel durante o preparo, mas tambem pode fazer a trilha capturada pelo `MediaRecorder` sair silenciosa; em Safari/iOS, `video.captureStream()` tambem nao e uma base confiavel para audio.
- Decisao: a exportacao passa a capturar a trilha de audio do elemento de video por Web Audio, conectando `createMediaElementSource(video)` a um `MediaStreamDestination` e adicionando essas tracks ao stream gravado pelo `MediaRecorder`.
- Decisao: o grafo de audio nao e conectado a `audioContext.destination`, entao o arquivo preserva audio quando o navegador suporta Web Audio sem voltar a tocar som em segundo plano durante o toast de preparo.
- Fallback seguro: se Web Audio/track de audio nao estiver disponivel no navegador, o preparo continua silencioso e exporta video sem audio em vez de tocar audio invisivel para o usuario.
- Escopo: frontend-only, mobile-first; sem mudanca de backend, banco, Prisma, migrations, endpoints, payloads, storage/R2, envs, providers, jobs, dados publicados ou packages.
- Fonte visual auditavel: screenshot do usuario `WhatsApp Image 2026-08-22 at 14.01.46.jpeg`; Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao.
- ADR atualizado: `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Criterios de aceite do complemento

- [x] O arquivo de video compartilhavel volta a preservar audio quando o navegador suporta captura por Web Audio.
- [x] A exportacao nao conecta o audio ao alto-falante/saida audivel durante o preparo invisivel.
- [x] O fallback de navegador sem Web Audio permanece silencioso e honesto, sem tocar audio em segundo plano.
- [x] A alteracao reaproveita a exportacao real por canvas/MediaRecorder, sem mock ou endpoint simulado.
- [x] Nenhum backend, endpoint, migration, env, provider ou package novo foi adicionado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write src/utils/lectum-share-media/export.ts src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build` antes e depois do bump para `0.1.177`
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3188`: `/version` respondeu `0.1.177` e `/comunidades` respondeu `200`.
- [x] `pnpm version:bump` para `0.1.177`
- [x] `pnpm check:version`
- [x] `pnpm check` (primeira tentativa falhou pelo timeout transitorio ja conhecido em `backend/scripts/boot-safety.test.mjs`; `pnpm --dir backend check` isolado passou e a repeticao completa de `pnpm check` passou).
- [x] `git diff --check`
- [x] `pnpm check:encoding`
- [x] `pnpm check:adrs`
- [x] `pnpm check:tasks`
- [x] `pnpm check:source-size`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.

## Complemento 2026-08-22 - videos completos no compartilhamento social

- Pedido do usuario: videos com mais de 2 minutos estavam chegando incompletos nas redes sociais; no exemplo, a resposta original tinha 2:07 e o arquivo enviado ao Instagram ficava com cerca de 1 minuto.
- Diagnostico: a exportacao client-side por canvas/MediaRecorder ainda mantinha o limite defensivo original de 60 segundos (MAX_VIDEO_EXPORT_SECONDS), criado para reduzir risco de travamento, mas agora incompativel com o requisito de compartilhar a resposta completa.
- Decisao: remover o teto fixo de 60 segundos e usar a duracao real conhecida do video como duracao de exportacao.
- Decisao: manter apenas um timeout defensivo proporcional (duracao * 1.25 + 15s) para evitar loop infinito quando o navegador trava, a metadata fica inconsistente ou o evento ended nao chega.
- Fallback seguro: quando a duracao real nao estiver disponivel, a exportacao usa fallback curto de 15 segundos, porque nao ha como saber o final do arquivo sem metadata confiavel.
- Limite tecnico: depois que a Lectum entrega o arquivo completo para a folha nativa, cada app de destino ainda pode aplicar suas proprias regras de corte/edicao; a Web nao consegue forcar o modo especifico do Instagram/WhatsApp/TikTok.
- Escopo: frontend-only, mobile-first; sem mudanca de backend, banco, Prisma, migrations, endpoints, payloads, storage/R2, envs, providers, jobs, dados publicados ou packages.
- Fonte visual auditavel: screenshots do usuario `WhatsApp Image 2026-08-22 at 14.39.17.jpeg` e `WhatsApp Image 2026-08-22 at 14.38.02.jpeg`; Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao.
- ADR atualizado: `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Criterios de aceite do complemento

- [x] A exportacao de video nao possui mais teto fixo de 60 segundos.
- [x] Videos com duracao real conhecida usam a duracao completa da propria midia.
- [x] O fluxo mantem timeout defensivo proporcional para nao travar em caso de stall/metadata inconsistente.
- [x] Videos sem duracao real conhecida usam fallback seguro e documentado.
- [x] Nenhum backend, endpoint, migration, env, provider ou package novo foi adicionado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write src/utils/lectum-share-media/duration.ts src/utils/lectum-share-media/export.ts src/utils/lectum-share-media/layout.ts src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build` antes e depois do bump para `0.1.178`
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3189`: `/version` respondeu `0.1.178` e `/comunidades` respondeu `200`.
- [x] `pnpm version:bump` para `0.1.178`
- [x] `pnpm check:version`
- [x] `pnpm check` (primeira tentativa falhou pelo timeout transitorio ja conhecido em `backend/scripts/boot-safety.test.mjs`; `pnpm --dir backend check` isolado passou e a repeticao completa de `pnpm check` passou).
- [x] `git diff --check`
- [x] `pnpm check:encoding`
- [x] `pnpm check:adrs`
- [x] `pnpm check:tasks`
- [x] `pnpm check:source-size`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.

## Complemento 2026-08-22 - cache temporario do video com arte por 15 dias

- Pedido do usuario: evitar que o proprio video precise ser preparado novamente em todo compartilhamento, sem pre-renderizar todos os videos e sem manter duas versoes permanentes pesando storage.
- Decisao: armazenar sob demanda apenas o arquivo social com arte, gerado no fluxo real de compartilhamento, por 15 dias.
- Backend: adicionada a tabela `post_share_artifacts` com `cache_key`, `source_fingerprint`, `layout_version`, `storage_key`, metadados do arquivo e `expires_at`.
- Backend: novas rotas `GET/POST /api/private/posts/:id/share-artifact` e `GET/POST /api/private/posts/:id/replies/:replyId/share-artifact`; leitura publica reaproveita arte valida, upload exige usuario autenticado para evitar abuso de bucket publico.
- Backend: o upload usa o storage publico existente em `posts/share-artifacts/`, com `Cache-Control` curto, sem package novo e sem env obrigatoria nova.
- Backend: scheduler periodico remove objetos expirados do R2 e marca registros como deletados; as envs `POST_SHARE_ARTIFACT_CLEANUP_ENABLED`, `POST_SHARE_ARTIFACT_CLEANUP_INTERVAL_MS` e `POST_SHARE_ARTIFACT_CLEANUP_BATCH_SIZE` sao opcionais e possuem defaults seguros.
- Backend: quando um novo arquivo substitui o mesmo `cache_key`, o objeto anterior e removido best-effort para evitar duas versoes ativas do mesmo video/arte.
- Frontend: antes de renderizar localmente, o compartilhamento direto consulta o cache; quando encontra arte valida, baixa o arquivo publico e compartilha sem reprocessar canvas/MediaRecorder.
- Frontend: quando nao existe cache, mantem a geracao client-side real e tenta persistir o arquivo preparado em background para os proximos compartilhamentos.
- Escopo: nao ha pre-render no upload original de midia e videos nunca compartilhados nao criam arte temporaria. A midia original do post/resposta continua existindo como fonte canonica; a arte e derivada, temporaria e expira em 15 dias.
- Migration criada/aplicada: `backend/prisma/migrations/20260822183235_add_post_share_artifacts/migration.sql`.
- Fonte visual auditavel: referencia local `_product/proto/Compartilhamento Lectum - video-resposta stories referencia.png`; Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao.
- ADR atualizado: `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Criterios de aceite do complemento

- [x] O primeiro compartilhamento de um video sem arte cacheada continua gerando o arquivo real no navegador.
- [x] Depois da geracao, o frontend tenta persistir o arquivo com arte em background para reutilizacao.
- [x] Compartilhamentos seguintes consultam o backend e reutilizam o arquivo com arte quando ele ainda nao expirou.
- [x] O cache de arte expira em 15 dias e possui limpeza periodica de objeto R2 + registro logico.
- [x] O backend nao pre-renderiza todos os videos no upload original e nao cria arte para video nunca compartilhado.
- [x] O upload de arte temporaria exige usuario autenticado e aceita somente video sob `posts/share-artifacts/`.
- [x] Reenvio para o mesmo `cache_key` remove a versao anterior best-effort, evitando duas versoes ativas do mesmo alvo.
- [x] Nenhum package novo ou env obrigatoria nova foi adicionado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.

### Validacoes

- [x] `pnpm --dir backend db:migrate --name add-post-share-artifacts`
- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `pnpm version:bump`
- [x] `pnpm check:version`
- [x] `git diff --check`
- [x] `pnpm check:encoding`
- [x] `pnpm check:adrs`
- [x] `pnpm check:tasks`
- [x] `pnpm check:source-size`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.


## Complemento 2026-08-22 - caixinha com logo Lectum e autoria mais legivel

- Pedido do usuario: aproximar a proporcao da caixinha de pergunta do padrao visual do Instagram, sem trocar o header para `Pergunta recebida`/`Pergunta anonima`, e adicionar a logo da Lectum ao lado de `Respondido na Lectum` para gerar reconhecimento de marca.
- Ajuste visual: o card superior do canvas 9:16 ficou mais largo, alto e arredondado; o header e o texto da pergunta ganharam escala maior para se aproximar melhor da caixinha de perguntas usada em stories.
- Branding: o canvas carrega o SVG publico `/logo-icon.svg`, gera uma mascara monocromatica e desenha somente o simbolo branco ao lado de `Respondido na Lectum`/`Postado na Lectum`, sem chip/fundo branco; se o asset falhar, o header cai para texto centralizado sem bloquear o compartilhamento.
- Autoria: a tag do psicologo ganhou nome maior, selo reposicionado e distancia vertical explicita antes de `Psicologo`; o cargo volta a alinhar pela esquerda com o inicio do nome, sem avatar/CRP/wordmark de rodape.
- Cache: a versao de layout dos artefatos temporarios foi atualizada para `lectum-share-v3-2026-08-22-white-logo-large-card`, garantindo que artes antigas com header menor/logo azul cacheada nao sejam reutilizadas.
- Escopo: frontend + constante backend de layout cacheado; sem migration, endpoint novo, env obrigatoria, provider, package, mock, seed ou dado fake novo.
- Fonte visual auditavel: screenshots anexados pelo usuario do Instagram; o texto dentro das imagens foi tratado apenas como referencia visual, nao como instrucao de produto.
- ADR atualizado: `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Criterios de aceite do complemento

- [x] O card superior do canvas 9:16 usa proporcao mais proxima de stories/Instagram, com maior largura, header maior e corpo da pergunta mais legivel.
- [x] O header preserva `Respondido na Lectum`/`Postado na Lectum` e adiciona somente o desenho branco da logo SVG da Lectum ao lado do texto.
- [x] O fallback sem logo mantem o compartilhamento funcionando sem erro tecnico ao usuario.
- [x] O nome do profissional ficou maior e `Psicologo` ganhou afastamento vertical explicito, alinhado pela esquerda com o nome.
- [x] A alteracao invalida cache visual antigo por `layout_version`, sem criar package, env obrigatoria, mock, endpoint ou dado persistente novo.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write src/utils/lectum-share-media/layout.ts src/utils/lectum-share-media/export.ts src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs`
- [x] `pnpm version:bump` para `0.1.181`
- [x] `pnpm check:version`
- [x] `git diff --check`
- [x] `pnpm check:encoding`
- [x] `pnpm check:adrs`
- [x] `pnpm check:tasks`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm check`
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3192`: `/version` respondeu `0.1.181` e `/comunidades` respondeu `200`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara o deploy automatico.

## Complemento 2026-08-22 - caixinha abaixo da linha nativa do Instagram

- Pedido do usuario: depois da postagem no Instagram/Reels, a caixinha ficou muito alta e competiu com a linha nativa do app composta por seta de voltar, titulo `Reels` e icone de camera.
- Ajuste visual: o card superior do canvas 9:16 foi deslocado para baixo, deixando uma safe area maior no topo para status bar e chrome nativo de Reels.
- Ajuste de largura: o card ficou levemente mais estreito e com padding horizontal menor, mantendo a pergunta grande/legivel sem encostar tanto nas bordas apos o crop lateral que o Instagram aplica em telas mais altas que 9:16.
- Cache: a versao de layout dos artefatos temporarios foi atualizada para `lectum-share-v4-2026-08-22-instagram-safe-card`, garantindo que artes antigas posicionadas no topo nao sejam reutilizadas.
- Escopo: frontend + constante backend de layout cacheado; sem migration, endpoint novo, env obrigatoria, provider, package, mock, seed ou dado fake novo.
- Fonte visual auditavel: screenshot anexado pelo usuario do Instagram/Reels postado; o texto dentro da imagem foi tratado apenas como referencia visual, nao como instrucao de produto.
- ADR atualizado: `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Criterios de aceite do complemento

- [x] O topo da caixinha fica abaixo da linha nativa de Reels/seta/camera quando o video 9:16 e exibido em tela alta.
- [x] A largura do card respeita melhor a safe area horizontal de Reels, sem voltar a deixar o texto pequeno.
- [x] O header com logo branca, `Respondido na Lectum`/`Postado na Lectum` e o corpo da pergunta continuam legiveis.
- [x] A alteracao invalida cache visual antigo por `layout_version`, sem criar package, env obrigatoria, mock, endpoint ou dado persistente novo.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write src/utils/lectum-share-media/layout.ts src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir backend exec biome check --write src/modules/api/private/posts/repositories/queries/PostShareArtifactRepository.ts`
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir backend check` (uma tentativa inicial falhou no timeout transitorio conhecido de `scripts/boot-safety.test.mjs`; repeticao isolada passou)
- [x] `pnpm version:bump` para `0.1.182`
- [x] `pnpm check:version`
- [x] `pnpm --dir frontend build`
- [x] `pnpm --dir backend build`
- [x] `pnpm check` (uma tentativa inicial falhou no mesmo timeout transitorio de boot-safety dentro do backend; repeticao completa passou)
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3193`: `/version` respondeu `0.1.182` e `/comunidades` respondeu `200`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara o deploy automatico.

## Complemento 2026-08-22 - arquivo social primeiro apos preview de link

- Pedido do usuario: o ajuste que priorizou link puro para o WhatsApp removeu opcoes de Instagram Reels/Stories da folha nativa, deixou de compartilhar a arte com caixinha de pergunta e voltou a expor descricao textual indesejada no card do WhatsApp.
- Diagnostico: a Web Share API nao informa antes da abertura qual app sera escolhido; quando o payload principal e apenas link, o sistema tende a mostrar apps de mensagem/link e pode ocultar destinos que exigem arquivo de video, como Reels/Stories.
- Decisao: o fluxo principal de videos volta a preparar e compartilhar primeiro o arquivo social 9:16 com arte/canvas; o link publico da Lectum permanece no payload de arquivo quando suportado e como fallback se o arquivo falhar.
- Decisao: o texto compartilhado para video-resposta passa a ser o titulo do post, preservando a caixinha de pergunta no canvas via `sourceText`.
- Decisao: a exportacao de video ganhou timeout defensivo mais conservador, controle de stall por progresso do `currentTime`, `requestData()` antes de parar o `MediaRecorder`, timeout de upload temporario ampliado para 300s e nova `layout_version` `lectum-share-v5-2026-08-22-file-first-complete-video` para invalidar artefatos anteriores potencialmente incompletos/sem o fluxo correto.
- Escopo: frontend e constante backend de layout/cache; sem migration, endpoint novo, env obrigatoria, package, provider, mock, seed, reset ou dado fake novo.
- Fonte visual auditavel: `_product/proto/WhatsApp preview link sem arte social referencia.jpeg`; textos dentro da imagem foram tratados apenas como evidencia visual do WhatsApp.
- ADRs atualizados: `adrs/0191-layout-compartilhamento-social-video-resposta.md` e `adrs/0409-miniaturas-video-seo-open-graph-posts.md`.

### Criterios de aceite do complemento

- [x] Videos voltam a usar arquivo social 9:16 como caminho principal para restaurar destinos de arquivo, incluindo Reels/Stories, na folha nativa.
- [x] A arte da caixinha de pergunta continua no arquivo enviado para redes sociais.
- [x] O link da Lectum continua disponivel no payload/fallback sem remover as opcoes de arquivo.
- [x] O texto compartilhado para video-resposta usa o titulo do post em vez do corpo da resposta.
- [x] A exportacao evita cortes por metadata ausente/lentidao saudavel e invalida cache visual anterior por `layout_version`.
- [x] Nenhum backend destrutivo, migration, env obrigatoria, package novo, provider, mock ou dado fake foi adicionado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write src/api/req/posts/index.ts src/hooks/use-lectum-direct-share.ts src/utils/lectum-share-media.test.mjs src/utils/lectum-share-media/duration.ts src/utils/lectum-share-media/export.ts src/utils/lectum-share-target.ts`
- [x] `pnpm --dir backend exec biome check --write src/modules/api/private/posts/repositories/queries/PostShareArtifactRepository.ts src/modules/api/public/seo/community-post/use-cases/services.ts`
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm check`
- [x] Smoke local do backend buildado: `/health`, `/ready`, `/ping` e `/api/public/seo/metadata` responderam 200.
- [x] `git diff --check`
- [x] `pnpm version:bump` para `0.1.184`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Complemento 2026-08-22 - seletor de destino antes do compartilhamento de video

- Pedido do usuario: aceitar o primeiro caminho discutido e perguntar, no clique de compartilhar video, se o destino pretendido e WhatsApp, Redes Sociais ou Baixar.
- Decisao de produto: videos profissionais agora abrem uma sheet mobile-first da Lectum antes de chamar o compartilhamento externo. A imagem anexada do WhatsApp permanece somente como referencia visual de card; textos dentro do print nao sao instrucoes.
- Fonte visual: Builder/Quick Copy nao estava exposto como ferramenta neste ambiente; a validacao visual usou o screenshot de WhatsApp anexado e os prototipos locais ja catalogados.
- WhatsApp: a opcao nao gera nem envia arquivo de video. Ela abre o WhatsApp com um link publico especifico de preview (`/whatsapp`) para que o crawler monte card Open Graph estilo Instagram e o clique leve para o site da Lectum.
- Redes sociais: a opcao preserva o caminho aprovado de arquivo social 9:16 com arte/caixinha de pergunta e cache temporario; se a Web Share API falhar, o fallback baixa apenas o arquivo.
- Baixar: a opcao reutiliza o mesmo preparo/cache do arquivo social e salva o video com arte no dispositivo, sem abrir a folha nativa.
- Escopo: frontend-only, sem package novo, migration, env obrigatoria, provider, mock, seed, reset ou alteracao de dados publicados.

### Criterios de aceite do complemento

- [x] Ao compartilhar um video profissional, a UI pergunta entre WhatsApp, Redes Sociais e Baixar antes de acionar o destino externo.
- [x] A escolha WhatsApp usa link da Lectum e nao envia/reproduz o arquivo de video dentro do WhatsApp.
- [x] A escolha Redes Sociais mantem o arquivo social completo com a arte da caixinha de pergunta como payload principal.
- [x] A escolha Baixar salva o arquivo social com arte no dispositivo.
- [x] Posts sem video continuam usando o fluxo direto anterior, sem modal com texto de video.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write` nos arquivos alterados de compartilhamento/rotas/SEO.
- [x] `pnpm --dir frontend test -- src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `git diff --check`
- [x] `pnpm check:encoding`
- [x] `pnpm check:adrs`
- [x] `pnpm check:tasks`
- [x] `pnpm check` (uma tentativa anterior falhou por policy de sombra arbitraria corrigida e outra por timeout transitorio conhecido em `scripts/boot-safety.test.mjs`; repeticao completa passou)
- [x] `pnpm --dir backend check` isolado apos a falha transitoria de boot-safety no root check.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3198`: `/version` respondeu `0.1.185`; as rotas `/comunidades/.../whatsapp` de post e resposta responderam `200`, o HTML nao publicou `og:video`, `og:url` apontou para a propria rota `/whatsapp` e o canonical permaneceu na rota publica original.
- [x] Browser local/headless mobile-first 390x844 abriu a rota publica `/whatsapp` no build `0.1.185`; em ambiente local sem API autenticada, a tela ficou no loading seguro de post sem quebrar a rota.
- [x] `pnpm version:bump` para `0.1.185`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Complemento 2026-08-22 - redes sociais sem link no payload

- Pedido do usuario: no destino Redes Sociais, remover o link porque ele e inutil para Instagram/Reels/Stories e causa a previa nativa `1 Link e 1 Documento` no iOS.
- Decisao: a opcao Redes Sociais passa a compartilhar somente o arquivo social com arte, enviando `files` e `title`, sem `url` nem `text` no payload de arquivo.
- O titulo do arquivo/payload foi normalizado para `[Nome do psicologo] na Lectum`, e artefatos temporarios reaproveitados passam a ser reembrulhados com esse nome de arquivo no cliente.
- Se o navegador nao conseguir abrir compartilhamento por arquivo, o fallback baixa somente o arquivo com arte; nao copia nem compartilha link no destino Redes Sociais.
- Limite tecnico: o rotulo `1 Documento` e gerado pela folha nativa do iOS; a Lectum consegue fornecer titulo e nome de arquivo, mas nao consegue garantir que o sistema substitua esse rotulo em todos os apps/versoes.
- Escopo: frontend-only, sem package novo, migration, env obrigatoria, provider, mock, seed, reset ou alteracao de dados publicados.

### Criterios de aceite do complemento

- [x] Redes Sociais nao envia `url` junto do arquivo de video com arte.
- [x] Redes Sociais nao envia texto/legenda junto do arquivo de video com arte.
- [x] O titulo e o nome de arquivo compartilhavel usam `[Nome do psicologo] na Lectum`.
- [x] WhatsApp continua sendo o unico destino que usa link `/whatsapp`.
- [x] O fallback de Redes Sociais baixa apenas o arquivo, sem copiar link.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write` nos arquivos de compartilhamento alterados.
- [x] `pnpm --dir frontend test -- src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check:version`
- [x] `pnpm check` (houve falhas transitorias anteriores nos testes `boot-safety`; a repeticao completa passou).
- [x] `git diff --check`
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3199`: `/version` respondeu `0.1.186` e `/comunidades` respondeu `200`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Complemento 2026-08-23 - sheet de compartilhamento mais enxuta

- Pedido do usuario: na sheet `Compartilhar video`, trocar a frase `Escolha o formato antes de abrir o app de destino.` por `Escolha o formato de compartilhamento.`, remover as descricoes de cada opcao e usar no WhatsApp o icone ja usado na Lectum.
- Decisao: manter a sheet de destino, mas compactar a UI mobile-first para label + icone, sem alterar payloads, destinos, cache, rotas `/whatsapp`, fallback ou tracking.
- Fonte visual auditavel: screenshot anexado pelo usuario; textos dentro da imagem foram tratados apenas como referencia visual/contexto do feedback, nao como instrucoes alem do pedido explicito.
- Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao; a validacao visual usa screenshot anexado e referencia local do inventario ja catalogado.
- Escopo: frontend-only, sem package novo, migration, env obrigatoria, provider, mock, seed, reset ou alteracao de dados publicados.
- ADR atualizado: `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Criterios de aceite do complemento

- [x] A copy auxiliar da sheet passa a ser `Escolha o formato de compartilhamento.`
- [x] As opcoes WhatsApp, Redes sociais e Baixar nao exibem textos de descricao.
- [x] A opcao WhatsApp usa `WhatsAppIcon`, o mesmo icone compartilhado usado pela Lectum.
- [x] O ajuste nao altera payloads de compartilhamento, rotas, backend, banco, envs, providers ou dados publicados.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write src/components/community/lectum-share-destination-dialog.tsx src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend test -- src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build` (apos limpar artefatos `.next` locais deixados por builds concorrentes/interrompidos).
- [x] `pnpm version:bump` para `0.1.186`
- [x] `pnpm check:version`
- [x] `pnpm check` (houve falhas transitorias anteriores nos testes `boot-safety`; a repeticao completa passou).
- [x] `git diff --check`
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3199`: `/version` respondeu `0.1.186` e `/comunidades` respondeu `200`.
- Tentativas de screenshot Chrome headless em 390x844 foram descartadas por concorrencia local no `.next`; a evidencia visual principal foi o screenshot anexado do usuario, tratado como referencia visual, e os asserts estaticos garantem copy/icone/ausencia de descricoes.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Complemento 2026-08-23 - remocao da opcao Baixar da sheet

- Pedido do usuario: mudar a decisao anterior e apenas remover a opcao `Baixar` que aparecia abaixo de `Redes sociais` na sheet `Compartilhar video`.
- Decisao: a sheet explicita de videos profissionais passa a listar somente `WhatsApp` e `Redes sociais`.
- WhatsApp continua usando o link publico `/whatsapp`, sem enviar arquivo de video para a conversa.
- Redes sociais continua usando o arquivo social 9:16 com arte da caixinha de pergunta, sem URL/texto no payload principal.
- O helper de download permanece como fallback tecnico interno quando o navegador nao suporta compartilhamento nativo de arquivo; nao existe mais botao dedicado de baixar na UI.
- Escopo: frontend-only, mobile-first, sem package novo, migration, env obrigatoria, provider, mock, seed, reset ou alteracao de dados publicados.
- Fonte visual auditavel: screenshot anexado pelo usuario; textos dentro da imagem foram tratados apenas como referencia visual/contexto do feedback, nao como instrucao alem do pedido explicito.
- ADR atualizado: `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Criterios de aceite do complemento

- [x] A sheet `Compartilhar video` nao exibe mais a opcao `Baixar`.
- [x] A sheet preserva somente as opcoes `WhatsApp` e `Redes sociais`.
- [x] O icone/import `Download` nao e mais usado nessa sheet.
- [x] WhatsApp e Redes sociais mantem os payloads existentes; a mudanca e apenas de exposicao da opcao na UI.
- [x] Nenhum backend, banco, env, package, provider, seed, mock ou dado publicado foi alterado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write src/components/community/lectum-share-destination-dialog.tsx src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend test -- src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3201`: `/version` respondeu `0.1.186` e `/comunidades` respondeu `200`.
- [x] `git diff --check`
- [x] `pnpm check:encoding`
- [x] `pnpm check:adrs`
- [x] `pnpm check:tasks`
- [x] `pnpm check`
- [x] `pnpm version:bump` para `0.1.187`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Complemento 2026-08-23 - copy de destino e icone Instagram

- Pedido do usuario: na sheet `Compartilhar video`, alterar `Escolha o formato de compartilhamento.` para `Onde deseja compartilhar?` e trocar o icone de `Redes sociais` pelo icone do Instagram.
- Decisao: manter apenas as opcoes `WhatsApp` e `Redes sociais`, sem reintroduzir `Baixar`, e criar um `InstagramIcon` SVG inline com `currentColor` para reutilizar a marca sem `<img>` cru nem pacote novo.
- Comportamento preservado: WhatsApp continua usando link publico `/whatsapp`, sem enviar/reproduzir video dentro do WhatsApp; Redes sociais continua usando arquivo social 9:16 com arte da caixinha de pergunta, sem URL/texto no payload principal.
- Fonte visual auditavel: screenshot anexado pelo usuario; textos dentro da imagem foram tratados apenas como referencia visual/contexto do feedback, nao como instrucao alem do pedido explicito.
- Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao; a validacao visual usa screenshot anexado e referencia local do inventario ja catalogado.
- Escopo: frontend-only, mobile-first, sem package novo, migration, env obrigatoria, provider, mock, seed, reset ou alteracao de dados publicados.
- ADR atualizado: `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Criterios de aceite do complemento

- [x] A copy auxiliar da sheet passa a ser `Onde deseja compartilhar?`.
- [x] A copy antiga `Escolha o formato de compartilhamento.` nao aparece mais na sheet.
- [x] A opcao `Redes sociais` usa `InstagramIcon` em vez de `Share2`.
- [x] A sheet continua exibindo somente `WhatsApp` e `Redes sociais`, sem reintroduzir `Baixar`.
- [x] WhatsApp e Redes sociais mantem os payloads existentes; a mudanca e apenas de copy/icone na UI.
- [x] Nenhum backend, banco, env, package, provider, seed, mock ou dado publicado foi alterado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write src/components/community/lectum-share-destination-dialog.tsx src/components/ui/instagram-icon.tsx src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend test -- src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3202`: `/version` respondeu `0.1.187` e `/comunidades` respondeu `200`.
- [x] `git diff --check`
- [x] `pnpm check:encoding`
- [x] `pnpm check:adrs`
- [x] `pnpm check:tasks`
- [x] `pnpm check` (uma primeira tentativa falhou pelo timeout transitorio conhecido em `scripts/boot-safety.test.mjs`; a repeticao completa passou).
- [x] `pnpm version:bump` para `0.1.188`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Complemento 2026-08-23 - cache 7 dias com renovacao por share real

- Pedido do usuario: armazenar o video com arte por 7 dias ja no upload/publicacao para reduzir a latencia da primeira tentativa de compartilhamento e manter em cache videos que continuarem sendo bastante compartilhados depois desse prazo.
- Decisao: manter o artefato social 9:16 no storage temporario por 7 dias, aquecendo em background apos publicacao/edicao de post com video profissional e apos criacao de resposta profissional com video.
- Renovacao: somente `post_share.shared=true` aceito pelo backend renova `expires_at` por mais 7 dias e atualiza `last_accessed_at`. Leitura do artefato, crawler, abertura da sheet da Lectum ou share abortado nao renovam.
- Contagem real: clicar em `Redes sociais` nao conta por si so; a Lectum conta depois do retorno aceito da Web Share API/fallback. A Web nao informa se o usuario clicou no Instagram dentro da folha nativa do celular.
- Escopo: frontend + backend, sem package novo, migration, env obrigatoria, provider novo, mock, seed, reset ou limpeza destrutiva de buckets/dados publicados.
- ADR atualizado: `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Criterios de aceite do complemento

- [x] Novos artefatos de compartilhamento social com arte expiram em 7 dias.
- [x] Publicacao/edicao de post profissional com video agenda prewarm best-effort do artefato.
- [x] Criacao de resposta profissional com video agenda prewarm best-effort do artefato.
- [x] O botao `Redes sociais` nao incrementa contagem antes da conclusao aceita do compartilhamento nativo/fallback.
- [x] `post_share.shared=true` renova o artefato vigente por mais 7 dias; shares deduplicados/abortados nao renovam.
- [x] O cache continua reaproveitando artefato existente antes de reprocessar canvas/MediaRecorder.
- [x] Nenhum banco, package, env, provider, mock, seed, reset ou limpeza destrutiva foi adicionado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write src/hooks/use-lectum-direct-share.ts src/utils/lectum-share-artifact-cache.ts src/app/app/community/[slug]/post/new/hooks/use-create-community-post-controller.ts src/app/app/community/[slug]/post/[id]/views/post-detail-controller.ts src/app/app/community/[slug]/post/[id]/views/reply-thread.tsx src/components/community/post-edit-modal.tsx src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir backend exec biome check --write src/modules/api/private/posts/repositories/queries/PostShareArtifactRepository.ts src/modules/api/private/posts/repositories/PostRepository.ts src/modules/api/private/posts/use-cases/services/media-actions.ts`
- [x] `pnpm --dir frontend test -- src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm check:source-size`
- [x] `pnpm version:bump` para `0.1.189`
- [x] `pnpm check:version`
- [x] `pnpm check` (uma primeira tentativa falhou por encoding corrompido em `_product/tasks/DATA-MODEL.md` durante a edicao local; o arquivo foi restaurado/reaplicado em UTF-8 e a repeticao completa passou).
- [x] `git diff --check`
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Complemento 2026-08-23 - opcoes de compartilhamento no desktop

- Pedido do usuario: no computador, o compartilhamento de video deve oferecer `Copiar link` ou `Baixar video`; o download sempre deve baixar o video social com arte, sem opcao de baixar o arquivo cru/original e sem copy explicita "com arte para redes sociais".
- Decisao: alvos profissionais com video continuam abrindo a sheet explicita, mas a UI diferencia contexto por dispositivo. Em desktop com ponteiro fino, a sheet mostra somente `Copiar link` e `Baixar video`; em mobile, preserva `WhatsApp` e `Redes sociais`.
- `Copiar link` usa clipboard diretamente e registra o canal `clipboard` apenas apos copia aceita. `Baixar video` reutiliza o mesmo preparo/cache do arquivo social 9:16 com arte ja existente e mostra feedback simples `Video baixado.`
- O fluxo de mobile, WhatsApp `/whatsapp`, Redes sociais com arquivo social sem link, cache temporario, prewarm e renovacao por share real permanecem inalterados.
- Escopo de produto: frontend-only, mobile-first/desktop-aware, sem package novo, migration, env obrigatoria, provider, mock, seed, reset ou alteracao de dados publicados; ajuste complementar apenas no timeout defensivo do teste local `boot-safety` para estabilizar o hook de push.
- ADR atualizado: `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Criterios de aceite do complemento

- [x] No desktop, a sheet `Compartilhar video` exibe somente `Copiar link` e `Baixar video`.
- [x] No mobile, a sheet preserva somente `WhatsApp` e `Redes sociais`.
- [x] `Baixar video` salva o arquivo social 9:16 com arte, sem expor opcao de baixar o video cru/original.
- [x] A UI e os toasts nao usam a copy `com arte para redes sociais`.
- [x] `Copiar link` copia o link publico canonico da publicacao/thread e registra compartilhamento `clipboard` apos sucesso.
- [x] Nenhum backend de runtime, banco, env, package, provider, seed, mock ou dado publicado foi alterado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write src/components/community/lectum-share-destination-dialog.tsx src/hooks/use-lectum-share-dialog.tsx src/hooks/use-lectum-direct-share.ts src/utils/lectum-share-media.ts src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend test -- src/utils/lectum-share-media.test.mjs`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3203`: `/version` respondeu `0.1.191` antes do bump final; a versao final `0.1.193` foi validada por `pnpm check:version`, `/comunidades` respondeu `200` e Chrome headless abriu `/comunidades` com exit code `0`.
- [x] `git diff --check`
- [x] `pnpm check:encoding`
- [x] `pnpm check:adrs`
- [x] `pnpm check:tasks`
- [x] `pnpm --dir backend check`
- [x] `pnpm --dir admin check`
- [x] `pnpm check` executado; uma tentativa anterior oscilou no timeout local de 10s do `backend/scripts/boot-safety.test.mjs`, que foi ampliado para 60s para suportar a carga do hook. `pnpm --dir backend check` isolado passou depois do ajuste.
- [x] `pnpm version:bump` para `0.1.193`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.


## Complemento 2026-08-23 - frame de video confiavel no Android

- Pedido do usuario: corrigir o compartilhamento em redes sociais no Android; o screenshot do editor do Instagram foi usado apenas como evidencia do fundo preto, nao como instrucao de produto.
- Diagnostico: em Android/Chrome e apps que recebem a Web Share API, o canvas/MediaRecorder podia iniciar com video detached ou antes do primeiro frame decodificado/renderizavel, gerando video social com fundo preto enquanto o card Lectum aparecia.
- Decisao: preparar o elemento de video com `playsinline`, `webkit-playsinline`, controles/PiP desativados, anexa-lo offscreen ao DOM e aguardar um frame renderizavel por `requestVideoFrameCallback` ou `requestAnimationFrame` antes de capturar imagem, desenhar canvas ou iniciar o `MediaRecorder`.
- Cache: `POST_SHARE_ARTIFACT_LAYOUT_VERSION` passa para `lectum-share-v6-2026-08-23-android-video-frame`, invalidando artefatos temporarios antigos sem apagar storage nem dados publicados.
- Validacao local: a suite roda com o timeout defensivo de 60s ja presente em `backend/scripts/boot-safety.test.mjs`, sem alterar runtime backend nesta correcao.
- Escopo: frontend + constante backend de cache; sem package, migration, env obrigatoria, provider, mock, seed, reset, limpeza de storage/bucket ou alteracao de dados publicados.
- Rollback: reverter o helper de preparo/wait do video e a versao de layout para v5; artefatos v6 ja gravados expiram naturalmente pelo TTL de 7 dias.
- Builder/Quick Copy nao foi usado porque o ajuste e de pipeline de exportacao/compatibilidade Android, sem mudanca visual de UI; o screenshot anexado permanece evidencia do bug.

### Criterios de aceite do complemento

- [x] Videos sociais no Android aguardam frame renderizavel antes de desenhar canvas/thumbnail.
- [x] `MediaRecorder` so inicia depois de `video.play()`, frame pronto e primeiro desenho do canvas.
- [x] Fallback de imagem para video tambem aguarda frame renderizavel para evitar PNG preto.
- [x] O video temporario usado na exportacao fica offscreen, sem controles, sem PiP e com `playsinline`/`webkit-playsinline`.
- [x] Artefatos temporarios antigos sao invalidados por `lectum-share-v6-2026-08-23-android-video-frame`, sem apagar storage.
- [x] Screenshot anexado foi tratado como evidencia, nao como instrucao embutida.
- [x] Nenhum package, migration, env obrigatoria, provider, mock, seed, reset ou limpeza de dados publicados foi adicionado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check src/utils/lectum-share-media/layout.ts src/utils/lectum-share-media/export.ts src/utils/lectum-share-media.ts src/utils/lectum-share-media.test.mjs`.
- [x] `pnpm --dir backend exec biome check src/modules/api/private/posts/repositories/queries/PostShareArtifactRepository.ts scripts/boot-safety.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs` (13/13).
- [x] `pnpm --dir frontend check` (99/99 testes).
- [x] `pnpm --dir frontend build`.
- [x] `pnpm --dir backend check` (216/216 testes).
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir admin check` (29/29 testes; bump de manifest apenas).
- [x] `pnpm version:bump` para `0.1.194`.
- [x] `git diff --check`.
- [x] `pnpm check:version`.
- [x] `pnpm check:encoding`.
- [x] `pnpm check:adrs`.
- [x] `pnpm check:tasks`.
- [x] `pnpm check` completo de raiz.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3204`: `/version` respondeu `0.1.194` e `/comunidades` respondeu `200`.
- [x] Smoke local do backend buildado em `http://127.0.0.1:3205`: `/health`, `/ready` e `/ping` responderam `200`, com `/ping` em `0.1.194`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Complemento 2026-08-23 - video social em movimento e sem corte parcial

- Pedido do usuario: apos a correcao do fundo preto, no Android a imagem aparece mas fica congelada e, no iPhone, o video chega cortado/incompleto.
- Diagnostico: o fluxo de video ainda tinha dois caminhos perigosos para redes sociais: queda para `createImageShareFile` quando a exportacao de video falhava, que gerava um PNG aceito pelo destino como clip parado, e parada por stall/timeout defensivo tratada como `stopRecorder()`, que podia resolver um arquivo parcial. O stream do canvas tambem nao forçava `CanvasCaptureMediaStreamTrack.requestFrame()` a cada desenho em browsers moveis que dependem desse pedido.
- Decisao: o destino `Redes sociais` para alvo de video passa a exigir video real; se `captureStream`/`MediaRecorder` nao estiver disponivel ou se a exportacao travar antes do fim, a acao falha com toast generico em vez de enviar imagem ou arquivo truncado. A captura chama `requestFrame()` best-effort a cada frame desenhado e usa `setTimeout` no ritmo de `VIDEO_EXPORT_FRAME_RATE` para manter o canvas mudando de forma independente do repaint visual.
- Guardas de cache/upload: `withShareArtifactFileType` nao converte extensao desconhecida para `video/mp4`; o cache local so reaproveita artefatos `video/mp4`/`video/webm`; e o backend so aceita esses dois MIME types para `posts/share-artifacts/`.
- Cache: `POST_SHARE_ARTIFACT_LAYOUT_VERSION` passa para `lectum-share-v7-2026-08-23-moving-video-full-duration`, invalidando artefatos v6 sem apagar storage nem dados publicados.
- Fonte visual auditavel: screenshot Android/Reels anexado pelo usuario; textos e controles do app de destino foram tratados apenas como evidencia do bug, nao como instrucoes embutidas.
- Builder/Quick Copy nao foi usado porque a mudanca e de pipeline de exportacao/cache mobile, sem alteracao visual de UI/canvas aprovado.
- Escopo: frontend + guard/constante backend; sem package novo, migration, env obrigatoria, provider, mock, seed, reset, limpeza de bucket/storage ou alteracao destrutiva de dados publicados.
- Rollback: reverter o commit restaura o fallback anterior e a versao v6; artefatos v7 eventualmente gravados expiram naturalmente pelo TTL de 7 dias, sem limpeza manual.

### Criterios de aceite do complemento

- [x] Redes sociais para alvo de video nao compartilha PNG/imagem como fallback quando a exportacao de video falha.
- [x] O canvas capturado solicita frame do track (`requestFrame`) a cada desenho quando o browser oferece essa API, reduzindo risco de video congelado no Android.
- [x] Stall ou timeout defensivo antes do fim do video rejeita a exportacao, sem resolver arquivo parcial/cortado como sucesso.
- [x] Arquivo de video vazio e rejeitado antes de ser compartilhado/cacheado.
- [x] Cache e upload de artefatos sociais aceitam apenas `video/mp4` ou `video/webm`.
- [x] Artefatos temporarios v6 sao invalidados por `lectum-share-v7-2026-08-23-moving-video-full-duration`, sem apagar storage.
- [x] Screenshot anexado foi tratado como evidencia, nao como instrucao embutida.
- [x] Nenhum package, migration, env obrigatoria, provider, mock, seed, reset ou limpeza de dados publicados foi adicionado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write src/utils/lectum-share-media/export.ts src/utils/lectum-share-media.ts src/utils/lectum-share-artifact-cache.ts src/utils/lectum-share-media.test.mjs src/api/req/posts/index.ts`.
- [x] `pnpm --dir backend exec biome check --write src/modules/api/private/posts/repositories/queries/PostShareArtifactRepository.ts src/modules/api/private/posts/use-cases/services/share-artifact.ts`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs` (13/13).
- [x] `pnpm --dir frontend check`.
- [x] `pnpm --dir frontend build`.
- [x] `pnpm --dir backend check`.
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir admin check` (bump de manifest apenas).
- [x] `pnpm version:bump` para `0.1.195`.
- [x] `pnpm check:version`.
- [x] `git diff --check`.
- [x] `pnpm check:encoding`.
- [x] `pnpm check:adrs`.
- [x] `pnpm check:tasks`.
- [x] `pnpm check` completo de raiz.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3206`: `/version` respondeu `0.1.195` e `/comunidades` respondeu `200`.
- [x] Smoke local do backend buildado em `http://127.0.0.1:3207`: `/health` respondeu `ok`, `/ready` respondeu `ready` e `/ping` respondeu `0.1.195`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.


## Complemento 2026-08-23 - fallback Android para video original quando exportacao social falha

- Pedido do usuario: o Android ainda exibe o toast `Nao foi possivel preparar o compartilhamento agora` antes de abrir a folha nativa; o screenshot anexado foi tratado somente como evidencia do erro na Lectum, sem transformar textos da imagem em instrucoes.
- Diagnostico: depois de remover o fallback de imagem, alguns Androids continuam falhando no preparo client-side por `canvas.captureStream`/`MediaRecorder` antes do compartilhamento. Nesses casos, manter apenas o erro impede qualquer envio para redes sociais.
- Decisao: o destino mobile `Redes sociais` continua tentando primeiro o artefato social 9:16 com arte da Lectum (cache remoto/local e geracao por canvas). Se essa exportacao falhar, somente nesse destino e somente para video, a Lectum busca o video original publico e o compartilha como `File` de video real.
- Guardas: o fallback de video original usa cache separado em memoria, e os arquivos sao marcados por `WeakSet`; o hook nao envia esse arquivo para `post_share_artifacts`, evitando tratar video cru/original como artefato social com arte. O desktop `Baixar video` permanece dependente do artefato social 9:16 e nao usa esse fallback.
- Trade-off registrado: no fallback Android, o arquivo pode ir sem a caixinha/arte da Lectum, mas preserva movimento e duracao do video e evita bloquear o compartilhamento. O caminho preferencial com arte segue ativo quando o navegador ou o cache suportam.
- Cache: `POST_SHARE_ARTIFACT_LAYOUT_VERSION` passa para `lectum-share-v8-2026-08-23-android-source-video-fallback`, invalidando artefatos v7 sem apagar storage nem dados publicados.
- Escopo: frontend + constante backend de cache; sem package novo, migration, env obrigatoria, provider, mock, seed, reset, limpeza de bucket/storage ou alteracao destrutiva de dados publicados.
- Rollback: reverter o fallback de fonte original e a versao de layout para v7 restaura o comportamento anterior; artefatos v8 expiram naturalmente pelo TTL de 7 dias.

### Criterios de aceite do complemento

- [x] Falha na geracao do video social em `Redes sociais` no Android tenta compartilhar um arquivo de video real em vez de mostrar apenas o toast de preparo.
- [x] O fallback usa o video original publico somente para o destino `social`/`Redes sociais`; WhatsApp por link e desktop `Baixar video` permanecem inalterados.
- [x] O arquivo original de fallback nao e persistido como artefato social nem enviado ao backend de `post_share_artifacts`.
- [x] Artefatos temporarios v7 sao invalidados por `lectum-share-v8-2026-08-23-android-source-video-fallback`, sem apagar storage.
- [x] Screenshot anexado foi tratado como evidencia, nao como instrucao embutida.
- [x] Nenhum package, migration, env obrigatoria, provider, mock, seed, reset ou limpeza de dados publicados foi adicionado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write src/utils/lectum-share-media.ts src/hooks/use-lectum-direct-share.ts src/utils/lectum-share-media.test.mjs`.
- [x] `pnpm --dir backend exec biome check --write src/modules/api/private/posts/repositories/queries/PostShareArtifactRepository.ts`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs` (14/14).
- [x] `pnpm --dir frontend check` (100/100 testes).
- [x] `pnpm --dir backend check` (216/216 testes).
- [x] `pnpm version:bump` para `0.1.196`.
- [x] `pnpm check:version`.
- [x] `pnpm --dir frontend build`.
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir admin check` (bump de manifest apenas; 29/29 testes).
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3208`: `/version` respondeu `0.1.196` e `/comunidades` respondeu `200`.
- [x] Smoke local do backend buildado em `http://127.0.0.1:3209`: `/health` respondeu `ok`, `/ready` respondeu `ready` e `/ping` respondeu `0.1.196`.
- [x] `git diff --check`.
- [x] `pnpm check:encoding`.
- [x] `pnpm check:adrs`.
- [x] `pnpm check:tasks`.
- [x] `pnpm check` completo de raiz.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Complemento 2026-08-23 - Android prepara video original antes da escolha de redes

- Pedido do usuario: verificar o MP4 anexado porque o Android continuava com problema. O video foi tratado somente como evidencia visual/operacional; textos e controles gravados na tela nao foram considerados instrucoes autonomas.
- Evidencia do video: ao tocar em `Redes sociais`, a Lectum ficava presa no estado `Preparando video para compartilhar...` em um conteudo de aproximadamente 2:07 antes de abrir a folha nativa. O anexo gravado pelo WhatsApp tem 28,33s, H.264 Baseline 576x1024 com AAC, e mostra a demora no preparo dentro da Lectum.
- Diagnostico: a correcao anterior so usava o video original depois que a exportacao social por canvas/MediaRecorder falhava. Para videos longos, essa exportacao pode demorar a duracao inteira do video ou mais no Android, entao o fallback chegava tarde demais.
- Decisao: em Android, quando a sheet de destino mobile abre, a Lectum preaquece o video original publico em cache de memoria separado e desabilita temporariamente a opcao `Redes sociais` com o label `Preparando video...`. Ao tocar nessa opcao depois do preparo, o fluxo usa imediatamente o arquivo original cacheado, sem consultar artefato remoto nem tentar renderizar canvas/MediaRecorder no momento do gesto.
- Guardas preservadas: WhatsApp continua por link, desktop `Baixar video` continua exigindo o artefato social com arte, e o video original de fallback nao e persistido em `post_share_artifacts` nem renova cache de arte.
- Escopo: frontend-only sobre a versao v8 ja publicada; sem package no projeto, migration, env obrigatoria, provider, mock, seed, reset, limpeza de bucket/storage ou alteracao destrutiva de dados publicados.
- Rollback: remover o prewarm Android da sheet e voltar a tentar exportacao social antes do fallback; nenhum dado persistido precisa ser alterado.

### Criterios de aceite do complemento

- [x] O video anexado foi inspecionado como evidencia e mostrou o Android preso no preparo apos escolher `Redes sociais`.
- [x] Em Android, a sheet preaquece o video original antes do toque em `Redes sociais`.
- [x] Enquanto o fallback original esta sendo preparado no Android, `Redes sociais` fica desabilitado e informa `Preparando video...`.
- [x] Depois de preparado, o toque em `Redes sociais` usa o arquivo original cacheado diretamente, sem exportacao social nem consulta remota de artefato naquele gesto.
- [x] O prewarm pesado de artefato social por canvas/MediaRecorder e ignorado em Android quando nao ha artefato existente.
- [x] O arquivo original de fallback nao e persistido como artefato social nem enviado ao backend de `post_share_artifacts`.
- [x] Nenhum package no projeto, migration, env obrigatoria, provider, mock, seed, reset ou limpeza de dados publicados foi adicionado.

### Validacoes

- [x] MP4 anexado inspecionado com ferramenta temporaria fora do repositorio: H.264 Baseline, 576x1024, 28,33s; frames extraidos confirmaram a demora no preparo Android.
- [x] `pnpm --dir frontend exec biome check --write src/hooks/use-lectum-share-dialog.tsx src/components/community/lectum-share-destination-dialog.tsx src/utils/lectum-share-media.ts src/hooks/use-lectum-direct-share.ts src/utils/lectum-share-artifact-cache.ts src/utils/lectum-share-media.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs` (14/14).
- [x] `pnpm --dir frontend check` (100/100 testes).
- [x] `pnpm --dir frontend build`.
- [x] `pnpm --dir backend check` (216/216 testes).
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir admin check` (29/29 testes).
- [x] `pnpm --dir admin build`.
- [x] `pnpm version:bump` para `0.1.197`.
- [x] `pnpm check:version`.
- [x] `pnpm check` completo de raiz.
- [x] Smoke local do frontend buildado em `http://localhost:3000`: `/version` respondeu `0.1.197` e `/comunidades` respondeu `200`.
- [x] Smoke local do backend buildado: `/health` respondeu `ok`, `/ready` respondeu `ready` e `/ping` respondeu `0.1.197`.
- [x] Smoke local do admin buildado em `http://localhost:3002`: `/version` respondeu `0.1.197`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Complemento 2026-08-23 - Android volta a priorizar arte social antes do fallback original

- Pedido do usuario: analisar o novo MP4 anexado porque o fluxo Android ainda estava com problema, sem carregar a arte da Lectum e exibindo o estado `Preparando video`.
- Evidencia do video: a gravacao de 59,94s, 576x1280, H.264 High com AAC, mostra a folha nativa Android recebendo `Igor Rezende na Lectum.mp4` sem a caixinha/arte da Lectum e o editor do Instagram abrindo o video original em tela cheia.
- Diagnostico: a correcao anterior passou a preaquecer o video original ao abrir a sheet e, no clique de `Redes sociais`, pulava a consulta ao artefato social remoto e a geracao com canvas/MediaRecorder. Isso resolvia a demora, mas transformava o fallback original em caminho principal no Android e tambem expunha a label `Preparando video...` na sheet.
- Decisao: remover o prewarm do video original e a label `Preparando video...` da sheet. Ao abrir a sheet, a Lectum volta a preaquecer o artefato social 9:16 com arte. No clique em `Redes sociais`, o fluxo tenta cache local/artefato remoto com arte antes de gerar novo arquivo; o video original volta a ser apenas fallback quando a geracao do arquivo social falhar.
- Guardas preservadas: WhatsApp continua por link, desktop `Baixar video` continua usando arquivo social com arte, fallback original nao e persistido em `post_share_artifacts` e o cache de arte continua reaproveitando artefato existente antes de reprocessar.
- Escopo: frontend-only sobre a versao v8; sem package no projeto, migration, env obrigatoria, provider, mock, seed, reset, limpeza de bucket/storage ou alteracao destrutiva de dados publicados.
- Rollback: restaurar o prewarm/bypass Android do video original volta ao comportamento anterior; nenhum dado persistido precisa ser alterado.

### Criterios de aceite do complemento

- [x] O video anexado foi inspecionado como evidencia e mostrou o Android compartilhando o video original sem arte.
- [x] A sheet mobile nao troca mais `Redes sociais` por `Preparando video...`.
- [x] Ao abrir a sheet, a Lectum tenta preaquecer o artefato social com arte em vez do video original.
- [x] `Redes sociais` consulta cache local e artefato remoto com arte antes de qualquer fallback para video original.
- [x] O fallback de video original continua existindo apenas quando a geracao do arquivo social falha e continua sem persistencia em `post_share_artifacts`.
- [x] Nenhum package no projeto, migration, env obrigatoria, provider, mock, seed, reset ou limpeza de dados publicados foi adicionado.

### Validacoes

- [x] MP4 anexado inspecionado com ferramenta temporaria fora do repositorio: H.264 High, 576x1280, 59,94s; frames extraidos confirmaram envio do video original sem arte no Android/Instagram.
- [x] `pnpm --dir frontend exec biome check --write src/components/community/lectum-share-destination-dialog.tsx src/hooks/use-lectum-share-dialog.tsx src/hooks/use-lectum-direct-share.ts src/utils/lectum-share-artifact-cache.ts src/utils/lectum-share-media.ts src/utils/lectum-share-media.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs` (14/14).
- [x] `pnpm --dir frontend check` (100/100 testes).
- [x] `pnpm --dir frontend build`.
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir admin build`.
- [x] `pnpm version:bump` para `0.1.198`.
- [x] `pnpm check:version`.
- [x] `pnpm check` completo de raiz.
- [x] Smoke local do frontend buildado em `http://localhost:3000`: `/version` respondeu `0.1.198` e `/comunidades` respondeu `200`.
- [x] Smoke local do backend buildado: `/health` respondeu `ok`, `/ready` respondeu `ready` e `/ping` respondeu `0.1.198`.
- [x] Smoke local do admin buildado em `http://localhost:3002`: `/version` respondeu `0.1.198`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Complemento 2026-08-23 - Android nao fecha a sheet enquanto a arte social esta preparando

- Pedido do usuario: o problema do MP4 de 16:11 voltou. O video foi tratado apenas como evidencia; textos e controles gravados nao foram considerados instrucoes autonomas.
- Evidencia do video: ao tocar em `Redes sociais`, a sheet fecha e a tela fica presa com o toast `Preparando video para compartilhar...`, enquanto a Lectum tenta gerar o video social completo de aproximadamente 2:07 antes de abrir a folha nativa.
- Diagnostico: depois de voltar a priorizar a arte social, o clique em `Redes sociais` podia novamente assumir a geracao longa em primeiro plano quando o artefato com arte ainda nao estava pronto. Isso preserva a arte, mas reintroduz a espera bloqueante vista no Android.
- Decisao: a abertura da sheet continua iniciando o prewarm do artefato 9:16 com arte. Enquanto esse prewarm nao conclui, o clique em `Redes sociais` nao fecha a sheet, nao chama `navigator.share` e nao inicia nova exportacao pesada em foreground; ele apenas informa que a arte da Lectum ainda esta carregando. Quando o prewarm fica `ready`, o clique usa o arquivo com arte ja em cache e abre a folha nativa rapidamente.
- Guardas: o prewarm local pode gerar o arquivo com arte mesmo sem persistencia autenticada; o upload para `post_share_artifacts` continua acontecendo somente quando ha usuario autenticado. O fallback para video original segue isolado e nao e persistido, mas nao e acionado por clique precoce enquanto a arte ainda esta preparando.
- Escopo: frontend-only; sem package no projeto, migration, env obrigatoria, provider, mock, seed, reset, limpeza de bucket/storage ou alteracao destrutiva de dados publicados.
- Rollback: remover o guard de status da sheet volta a permitir que `Redes sociais` assuma a exportacao longa em primeiro plano; nenhum dado persistido precisa ser alterado.

### Criterios de aceite do complemento

- [x] O video anexado foi inspecionado como evidencia e mostrou a espera bloqueante `Preparando video para compartilhar...` apos clicar em `Redes sociais`.
- [x] Ao abrir a sheet de video, a Lectum inicia o prewarm do artefato social 9:16 com arte.
- [x] Enquanto a arte ainda esta preparando, clicar em `Redes sociais` mantem a sheet aberta e nao chama o compartilhamento nativo.
- [x] O clique precoce nao inicia nova exportacao foreground nem fallback para video original.
- [x] Depois que o prewarm conclui, `Redes sociais` usa o arquivo com arte ja cacheado.
- [x] O prewarm local nao exige persistencia autenticada; upload remoto de artefato continua restrito a usuario autenticado.
- [x] Nenhum package no projeto, migration, env obrigatoria, provider, mock, seed, reset ou limpeza de dados publicados foi adicionado.

### Validacoes

- [x] MP4 anexado inspecionado com ferramenta temporaria fora do repositorio: H.264 Baseline, 576x1024, 28,33s; frames extraidos confirmaram o fluxo preso no preparo Android apos `Redes sociais`.
- [x] `pnpm --dir frontend exec biome check --write src/hooks/use-lectum-share-dialog.tsx src/utils/lectum-share-artifact-cache.ts src/utils/lectum-share-media.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs` (14/14).
- [x] `pnpm --dir frontend check` (100/100 testes).
- [x] `pnpm --dir frontend build`.
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir admin build`.
- [x] `pnpm version:bump` para `0.1.199`.
- [x] `pnpm check:version`.
- [x] `pnpm check` completo de raiz.
- [x] Smoke local do frontend buildado em `http://localhost:3000`: `/version` respondeu `0.1.199` e `/comunidades` respondeu `200`.
- [x] Smoke local do backend buildado: `/health` respondeu `ok`, `/ready` respondeu `ready` e `/ping` respondeu `0.1.199`.
- [x] Smoke local do admin buildado em `http://localhost:3002`: `/version` respondeu `0.1.199`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Complemento 2026-08-24 - carregamento de arte nao fica preso indefinidamente

- Pedido do usuario: a mensagem `A arte da Lectum ainda esta carregando` permanecia sem o artefato ficar pronto. A imagem anexada foi tratada apenas como evidencia visual/operacional; textos e controles gravados nao foram considerados instrucoes autonomas.
- Evidencia: a sheet `Compartilhar video` continuava aberta e o toque em `Redes sociais` repetia o aviso de carregamento, sem transicionar para pronto nem para uma falha acionavel.
- Diagnostico: o prewarm podia ficar preso em `preparing` quando a reproducao programatica do elemento de video nao resolvia/rejeitava no navegador mobile antes de iniciar os timers de exportacao. Como o clique precoce estava bloqueado ate `ready`, a UI ficava em espera indefinida.
- Decisao: limitar a espera do `video.play()` usado na exportacao social, limpar promessa de artefato presa apos janela curta da sheet e transformar o estado `failed` em tentativa acionavel de compartilhamento com o arquivo disponivel, em vez de manter a sheet bloqueada.
- Guardas: o caminho preferencial continua sendo cache/artefato remoto/local com arte; se a preparacao local nao concluir, o fluxo sai da espera e deixa o compartilhamento direto aplicar os fallbacks existentes sem persistir video original como artefato social.
- Escopo: frontend-only; sem package no projeto, migration, env obrigatoria, provider, mock, seed, reset, limpeza de bucket/storage ou alteracao destrutiva de dados publicados.
- Rollback: remover o timeout de prewarm/play e voltar a bloquear `Redes sociais` enquanto `preparing`; nenhum dado persistido precisa ser alterado.

### Criterios de aceite do complemento

- [x] A evidencia anexada foi analisada como bug de UI presa em `A arte da Lectum ainda esta carregando`.
- [x] A reproducao programatica do video para exportacao nao pode ficar pendente indefinidamente antes dos timers de gravacao.
- [x] A sheet deixa de manter `Redes sociais` bloqueado para sempre quando o prewarm nao conclui.
- [x] Uma promessa de artefato presa e removida do cache local para permitir nova tentativa limpa.
- [x] Quando a arte demora alem do limite da sheet, o toque em `Redes sociais` passa para o fluxo direto/fallback em vez de repetir apenas o aviso de carregamento.
- [x] Nenhum package no projeto, migration, env obrigatoria, provider, mock, seed, reset ou limpeza de dados publicados foi adicionado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write src/hooks/use-lectum-share-dialog.tsx src/utils/lectum-share-media.ts src/utils/lectum-share-media/export.ts src/utils/lectum-share-media.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs` (14/14).
- [x] `pnpm --dir frontend check` (100/100 testes).
- [x] `pnpm --dir frontend build`.
- [x] `pnpm version:bump` para `0.1.200`.
- [x] `pnpm check:version`.
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir admin build`.
- [x] `pnpm check` completo de raiz.
- [x] Smoke local do frontend buildado em `http://localhost:3000`: `/version` respondeu `0.1.200` e `/comunidades` respondeu `200`.
- [x] Smoke local do backend buildado: `/health` respondeu `ok`, `/ready` respondeu `ready` e `/ping` respondeu `0.1.200`.
- [x] Smoke local do admin buildado em `http://localhost:3002`: `/version` respondeu `0.1.200`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.
