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

- [x] `pnpm --dir backend check` (222/222 testes).
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir frontend check` (114/114 testes).
- [x] `pnpm --dir frontend build`.
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

## Complemento 2026-08-24 - MediaBunny client-side, download Android com arte e TTL de 30 dias

- Pedido do usuário: gerar o vídeo com arte no client-side usando o MediaBunny já existente no frontend, reduzir custo/uso de servidor e manter fallback controlado por variável de ambiente; no Android, priorizar uma opção mais garantida de baixar o vídeo com arte em vez de enviar diretamente ao Instagram.
- Decisão: vídeos sociais passam a tentar primeiro a exportação client-side via MediaBunny, lendo o arquivo fonte público, processando cada `VideoSample` no canvas 9:16 da Lectum e gerando MP4 H.264/AAC com bitrate alvo controlado. Se o MediaBunny ou codec nativo falhar, o frontend cai automaticamente para o exportador legado com `MediaRecorder`.
- Controle operacional: `NEXT_PUBLIC_LECTUM_SHARE_MEDIABUNNY_ENABLED` é opcional, fica habilitada por padrão e pode ser definida como `false` para rollback frontend ao fluxo legado sem alterar backend/R2.
- Android: a sheet detecta Android e troca `Redes sociais` por `Baixar vídeo com arte`; o usuário baixa o arquivo social pronto e publica manualmente no app desejado, evitando depender da compatibilidade variável entre Web Share API, Chrome Android e editores do Instagram/Reels. WhatsApp permanece por link.
- Cache/storage: a versão lógica dos artefatos passa para `lectum-share-v9-2026-08-24-mediabunny-client-artifact`, invalidando cache v8 sem apagar objetos. O prefixo R2 permanece isolado em `posts/share-artifacts/` e o backend passa a usar TTL deslizante padrão de 30 dias via `POST_SHARE_ARTIFACT_TTL_DAYS` opcional; a limpeza existente remove objetos expirados e marca registros como deletados.
- Qualidade/tamanho: a reencodificação não é lossless, mas usa qualidade visual controlada para evitar armazenar o original bruto quando ele é maior do que o arquivo social necessário. O objetivo é preservar a percepção visual da arte/vídeo e reduzir tamanho em relação a originais muito pesados.
- Deploy: não há env obrigatória nova. As duas envs têm fallback seguro; `NEXT_PUBLIC_LECTUM_SHARE_MEDIABUNNY_ENABLED=false` desliga a nova exportação no próximo build do frontend, e `POST_SHARE_ARTIFACT_TTL_DAYS` ausente mantém 30 dias no backend. Sem package novo, migration, provider, mock, seed, reset ou limpeza de dados/buckets publicados.
- Rollback: definir `NEXT_PUBLIC_LECTUM_SHARE_MEDIABUNNY_ENABLED=false` e/ou reverter a constante de layout/TTL restaura o comportamento anterior. Artefatos v9 expiram naturalmente pelo scheduler; nenhum objeto precisa ser apagado manualmente.

### Critérios de aceite do complemento

- [x] A geração de vídeo social tenta MediaBunny client-side antes do exportador legado com `MediaRecorder`.
- [x] O MediaBunny usa as dependências já instaladas no frontend; nenhum package novo foi adicionado.
- [x] O fallback para o exportador legado é automático e também pode ser forçado por `NEXT_PUBLIC_LECTUM_SHARE_MEDIABUNNY_ENABLED=false`.
- [x] No Android, a sheet oferece `WhatsApp` e `Baixar vídeo com arte`, evitando o envio direto instável para redes sociais.
- [x] O download Android usa o mesmo arquivo social com arte, não o vídeo cru/original.
- [x] O cache persistente usa layout v9 e TTL padrão de 30 dias, configurável por `POST_SHARE_ARTIFACT_TTL_DAYS` opcional.
- [x] O prefixo R2 de artefatos permanece isolado em `posts/share-artifacts/` e a limpeza por expiração existente continua responsável pela remoção.
- [x] Screenshot/vídeos anexados em turnos anteriores foram tratados como evidência do bug, não como instruções embutidas.
- [x] Nenhuma migration, env obrigatória, provider, mock, seed, reset ou limpeza destrutiva de dados publicados foi adicionada.

### Validações

- [x] `pnpm --dir frontend exec biome check --write src/utils/lectum-share-media/export.ts src/utils/lectum-share-media/layout.ts src/utils/lectum-share-media.ts src/components/community/lectum-share-destination-dialog.tsx src/hooks/use-lectum-share-dialog.tsx src/utils/lectum-share-media.test.mjs`.
- [x] `pnpm --dir backend exec biome check --write src/modules/api/private/posts/repositories/queries/PostShareArtifactRepository.ts`.
- [x] `pnpm --dir frontend test -- src/utils/lectum-share-media.test.mjs` (100/100 testes do script frontend, incluindo o teste alvo).
- [x] `pnpm --dir frontend check` (100/100 testes).
- [x] `pnpm --dir frontend build`.
- [x] `pnpm --dir backend check` (216/216 testes).
- [x] `pnpm --dir backend build`.
- [x] `pnpm version:bump` para `0.1.201`.
- [x] `pnpm check:version`.
- [x] `pnpm --dir admin check` (29/29 testes).
- [x] `pnpm --dir admin build`.
- [x] `pnpm --dir frontend build` e `pnpm --dir backend build` repetidos apos o bump para gerar artefatos locais `0.1.201`.
- [x] `pnpm check` completo de raiz.
- [x] `git diff --check`.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.201` e `/comunidades` respondeu `200`.
- [x] Smoke local do backend buildado em `http://127.0.0.1:3211`: `/health` respondeu `ok`, `/ready` respondeu `ready` e `/ping` respondeu `0.1.201`.
- [x] Smoke local do admin buildado em `http://127.0.0.1:3212`: `/version` respondeu `0.1.201`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.


## Complemento 2026-08-24 - link de video-resposta com foco na discussao completa

- Pedido do usuario: o compartilhamento por link nao deve abrir uma pagina isolada somente com o video/resposta compartilhada; deve abrir a discussao completa do post e apenas focar a resposta de video compartilhada. Nao deve haver badge do tipo "Video compartilhado". Ao tocar na seta de voltar em rotas publicas de compartilhamento, a navegacao deve voltar ao feed, nao ao detalhe da comunidade.
- Decisao: o link canonico gerado para video-respostas profissionais passa a ser a pagina publica do post com `focusReplyId` e ancora `#reply-...`, reutilizando a tela de discussao completa e o destaque temporario ja existente. A rota especial de WhatsApp para resposta continua fornecendo metadata de preview, mas renderiza a discussao completa com foco inicial na resposta quando aberta por usuario.
- Guardas: a rota de thread/resposta permanece disponivel para o fluxo interno `Ver mais respostas`, onde a arvore isolada ainda e util para continuidade de conversas profundas. `PROTO-INVENTORY.md` foi consultado; nao havia nova referencia visual alem das telas de comunidades/compartilhamento ja registradas, e Builder/Quick Copy nao estava exposto como ferramenta neste ambiente. Nao foi adicionado badge, package, migration, env obrigatoria, provider, mock, seed, reset, limpeza de storage/bucket ou alteracao destrutiva de dados publicados.
- Deploy: mudanca frontend-only, compativel com backend atual. Links antigos de thread continuam funcionando; links novos de compartilhamento passam a apontar para a discussao completa. Rollback: reverter o helper de link focado para `publicCommunityReplyThreadHref` e a regra de voltar das rotas publicas para comunidade; nao ha dado persistido a ajustar.

### Criterios de aceite do complemento

- [x] O link de video-resposta profissional compartilhado abre a pagina completa do post com `focusReplyId` e `#reply-...`.
- [x] O foco visual usa o destaque temporario existente na resposta, sem badge "Video compartilhado".
- [x] A rota de WhatsApp de resposta renderiza a discussao completa com foco inicial na resposta compartilhada quando aberta no navegador.
- [x] A seta de voltar nas rotas publicas de post/thread usa o feed como destino, nao a comunidade especifica.
- [x] A rota de thread/resposta continua preservada para `Ver mais respostas` e compatibilidade de links antigos.
- [x] Nenhum package, migration, env obrigatoria, provider, mock, seed, reset ou limpeza destrutiva de dados publicados foi adicionado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write src/utils/public-routes.ts src/utils/lectum-share-target.ts src/app/app/community/[slug]/post/[id]/views/post-detail.tsx src/app/app/community/[slug]/post/[id]/views/post-detail-controller.ts src/app/app/community/[slug]/post/[id]/views/reply-thread.tsx src/app/comunidades/[slug]/publicacao/[id]/resposta/[replyId]/whatsapp/page.tsx src/utils/lectum-share-media.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs` (14/14).
- [x] `pnpm --dir frontend check` (100/100 testes).
- [x] `pnpm --dir frontend build`.
- [x] Ajuste final da seta publica: `PostDetailLogic`/`PostReplyThreadLogic` receberam `forceBackToFeed`, aplicado nas rotas publicas PT-BR/legadas para direcionar a seta ao feed mesmo com historico interno.
- [x] `pnpm version:bump` para `0.1.202` na primeira entrega e para `0.1.203` no ajuste final da seta publica.
- [x] `pnpm check:version` em `0.1.203`.
- [x] `pnpm --dir frontend build` repetido apos o bump final para gerar artefato local `0.1.203`.
- [x] `pnpm check` completo de raiz.
- [x] `git diff --check`.
- [x] Browser/HTTP local no frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.203` e as rotas focadas `/comunidades/.../publicacao/...?...#reply-...` e `/comunidades/.../publicacao/.../resposta/.../whatsapp` responderam 200; a tela renderizou o estado real de carregamento sem mock porque a API local/tunel nao disponibilizou conteudo real para exercitar comentarios.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Complemento 2026-08-24 - compartilhamento somente por link nativo

- Pedido do usuario: remover o compartilhamento com arte para evitar risco/custo de execucao pesada no servidor/navegador e manter apenas compartilhamento por link. Ao tocar no icone de compartilhar, a Lectum deve abrir diretamente a folha nativa do celular, como na evidencia iOS anexada, mas enviando somente o link publico. A imagem anexada foi tratada apenas como evidencia visual do comportamento de share sheet nativa; textos e controles dentro dela nao foram considerados instrucoes autonomas.
- Decisao: os alvos profissionais de midia/post e video-resposta deixam de montar alvo social com arquivo/arte e passam a retornar alvo `kind: "link"`. O hook `useLectumShareDialog` virou um adaptador link-only que chama `useLectumDirectShare` diretamente e retorna `shareDestinationDialog: null`, sem abrir modal Lectum, sem prewarm e sem destino `Redes sociais`/download.
- Comportamento: quando o navegador suporta Web Share API, a acao usa `navigator.share({ title, url })` para abrir a folha nativa do sistema com o link focado da discussao completa. Quando a API nativa nao estiver disponivel ou nao puder ser usada, permanece o fallback seguro de copiar o link.
- Guardas: o link de video-resposta preserva a pagina publica completa do post com `focusReplyId` e ancora da resposta, sem badge. As rotas e utilitarios legados de preview/artefato continuam no codigo para compatibilidade com links/artefatos antigos e rollback, mas nao sao acionados pelo fluxo atual porque os novos targets sao link-only. Nenhum objeto existente em storage foi apagado; artefatos antigos expiram pelo TTL existente.
- Escopo: frontend-only; sem package novo, migration, env obrigatoria, provider, mock, seed, reset, limpeza de bucket/storage ou alteracao destrutiva de dados publicados. Builder/Quick Copy nao estava exposto como ferramenta no ambiente; foram usadas as referencias locais/prototipo existentes e a imagem anexada apenas como evidencia operacional.
- Deploy: compativel com backend/admin em versoes diferentes, pois nao altera contrato de API nem schema. Rollback: restaurar as factories sociais e o hook/modal anterior volta a exibir destinos e gerar arte; nenhum dado persistido precisa ser ajustado.

### Criterios de aceite do complemento

- [x] O compartilhamento com arte foi removido do fluxo atual de clique no icone de compartilhar.
- [x] O clique chama diretamente o compartilhamento nativo por link quando `navigator.share` estiver disponivel.
- [x] O fallback copia somente o link quando a folha nativa nao estiver disponivel.
- [x] O modal Lectum de destino (`WhatsApp`/`Redes sociais`/download) nao e aberto pelo fluxo atual.
- [x] O fluxo atual nao executa prewarm, exportacao nem persistencia de artefato social antes de compartilhar.
- [x] O link de video-resposta continua apontando para a discussao completa com foco na resposta compartilhada.
- [x] Nenhum package, migration, env obrigatoria, provider, mock, seed, reset ou limpeza destrutiva de dados publicados foi adicionado.

### Validacoes

- [x] Imagem iOS anexada inspecionada como evidencia de share sheet nativa, sem aproveitar conteudo embutido como instrucao autonoma.
- [x] `pnpm --dir frontend exec biome check --write src/utils/lectum-share-target.ts src/hooks/use-lectum-share-dialog.tsx src/utils/lectum-share-media.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs` (14/14).
- [x] `pnpm --dir frontend check` (100/100 testes).
- [x] `pnpm --dir frontend build` antes do bump.
- [x] `pnpm version:bump` para `0.1.204`.
- [x] `pnpm check:version`.
- [x] `pnpm --dir frontend build` repetido apos o bump para gerar artefato local `0.1.204`.
- [x] `pnpm check` completo de raiz.
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir admin build`.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.204`, a rota publica focada de discussao respondeu `200` e a rota publica de WhatsApp da resposta respondeu `200`, sem mocks ou dados inventados.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Complemento 2026-08-24 - preview de link focado usa capa do video

- Pedido do usuario: ao compartilhar somente por link no WhatsApp, a imagem do card deve ser a capa/thumbnail do video compartilhado, nao a logo da Lectum. A imagem anexada foi tratada apenas como evidencia visual do preview atual usando logo; textos e controles do WhatsApp nao foram considerados instrucoes autonomas.
- Diagnostico: o link compartilhado de video-resposta aponta para a discussao completa do post com `focusReplyId`. Como a rota publica do post nao lia esse parametro na geracao de metadata, o scraper recebia SEO do post principal. Quando o post nao tinha midia propria, `og:image` caia no fallback `/logo-light.png`, embora a API publica de SEO da resposta ja retornasse `thumbnail_url` do video como `og_image_url`.
- Decisao: as rotas publicas de detalhe do post passam a normalizar `focusReplyId` em `generateMetadata` e, quando presente, buscar a metadata publica da resposta focada para popular `og:image`/`twitter:image` com a thumbnail do video. O `og:url` e canonical do preview continuam apontando para o link focado da discussao completa, preservando o contexto do post e o foco visual na resposta.
- Guardas: a normalizacao aceita apenas identificadores curtos seguros (`A-Z`, `a-z`, `0-9`, `_`, `-`) e ignora valores invalidos. A API/backend ja possuia `thumbnail_url` e nao foi necessario gerar imagem nova, executar processamento pesado, criar package, env, migration ou alterar storage. Quando nao houver thumbnail publica, permanece o fallback seguro de imagem padrao.
- Escopo: frontend-only; sem package novo, migration, env obrigatoria, provider, mock, seed, reset, limpeza de bucket/storage ou alteracao destrutiva de dados publicados. Builder/Quick Copy nao estava exposto como ferramenta; foram usadas as referencias locais/prototipo existentes e a imagem anexada apenas como evidencia operacional.
- Deploy: compativel com backend publicado porque reaproveita o endpoint publico de SEO de resposta ja existente. Rollback: remover o uso de `focusReplyId` em `generateMetadata` volta ao preview do post/logo; nenhum dado persistido precisa ser ajustado. Observacao operacional: WhatsApp pode manter cache do preview antigo por algum tempo ou ate receber uma URL diferente.

### Criterios de aceite do complemento

- [x] Links publicos de post com `focusReplyId` usam a metadata da resposta focada para obter a capa/thumbnail do video.
- [x] O `og:image` e `twitter:image` deixam de cair na logo quando a resposta focada possui thumbnail publica.
- [x] O `og:url`/canonical do preview continuam apontando para a discussao completa com foco, nao para a thread isolada.
- [x] Valores invalidos de `focusReplyId` sao ignorados antes de consultar metadata.
- [x] O compartilhamento continua somente por link; nao foi reativada geracao de arte, modal Lectum ou compartilhamento de arquivo.
- [x] Nenhum package, migration, env obrigatoria, provider, mock, seed, reset ou limpeza destrutiva de dados publicados foi adicionado.

### Validacoes

- [x] Imagem WhatsApp anexada inspecionada como evidencia do preview usando logo, sem aproveitar conteudo embutido como instrucao autonoma.
- [x] API publica de homologacao verificada sem alterar dados: `/api/public/seo/community-post/.../replies/...` retorna `og_image_url` com thumbnail publica do video.
- [x] `pnpm --dir frontend exec biome check --write src/lib/seo-metadata.ts src/utils/public-routes.ts src/app/comunidades/[slug]/publicacao/[id]/page.tsx src/app/community/[slug]/post/[id]/page.tsx src/utils/lectum-share-media.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs` (14/14).
- [x] `pnpm --dir frontend check` (100/100 testes).
- [x] `pnpm --dir frontend build` antes do bump.
- [x] `pnpm version:bump` para `0.1.205`.
- [x] `pnpm check:version`.
- [x] `pnpm --dir frontend build` repetido apos o bump para gerar artefato local `0.1.205`.
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir admin build`.
- [x] `pnpm check` completo de raiz.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.205`, a rota publica focada respondeu `200` e a rota publica de WhatsApp da resposta respondeu `200`, sem mocks ou dados inventados.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Complemento 2026-08-25 - botão de baixar vídeo com arte em Meus posts e respostas

- Pedido do usuário: na página **Meus posts e respostas**, exibir um botão logo abaixo do vídeo da resposta profissional; esse botão deve abrir uma modal de prévia semelhante à referência anexada e substituir as opções de compartilhamento por um CTA único de baixar o vídeo. Não exibir texto técnico como proporção/formato. O usuário também confirmou preferência por MediaBunny para evitar sobrecarga de servidor.
- Decisão: manter o botão/ícone de **Compartilhar** no fluxo link-only aprovado anteriormente e criar um caminho separado de **Baixar vídeo** apenas para respostas profissionais com vídeo na lista de respostas do psicólogo. O novo caminho abre uma modal de exportação com prévia do vídeo e CTA único `Baixar vídeo`.
- Implementação: `createLectumShareVideoTarget` continua retornando link; a nova factory `createLectumShareVideoDownloadTarget` cria explicitamente o alvo social com arte para download. `useLectumShareDownloadDialog` chama o download usando o utilitário existente com `destination: "download"`, que consulta cache/artefato existente e gera client-side com MediaBunny antes do fallback legado quando necessário.
- MediaBunny/servidor: a renderização/transcodificação permanece client-side no frontend. O backend não renderiza vídeo; ele só pode ser usado pelas rotas já existentes de consulta/upload de artefato temporário em R2 quando o arquivo precisar ser reaproveitado.
- UX: a modal não mostra WhatsApp, Instagram, TikTok, copiar link ou texto de formato; o compartilhamento por link permanece separado no ícone de compartilhar. O toast de preparo no caminho de download usa copy própria (`Preparando vídeo para baixar...`).
- Referências visuais: `PROTO-INVENTORY.md` foi consultado. Builder/Quick Copy não estava exposto como ferramenta MCP neste ambiente; foram usadas as referências locais existentes da TASK-42 e os prints anexados pelo usuário apenas como referência visual/operacional. Textos e elementos embutidos nos prints não foram tratados como instruções autônomas, e as imagens não foram commitadas por conterem pessoa/identificação.
- Escopo: frontend-only; sem package novo, migration, env obrigatória, contrato de API novo, provider, mock, seed, reset, limpeza de storage/bucket ou alteração destrutiva de dados publicados.
- Deploy: compatível com backend/admin em versões diferentes. Rollback: remover o botão/hook/modal de download e a factory `createLectumShareVideoDownloadTarget`; o compartilhamento link-only existente permanece funcional.

### Critérios de aceite do complemento

- [x] Respostas profissionais com vídeo em `/app/publicacoes/minhas` / `/app/posts/mine` exibem botão `Baixar vídeo` logo abaixo do player, dentro do card.
- [x] O botão abre uma modal de prévia com o vídeo e CTA único `Baixar vídeo`.
- [x] A modal não exibe opções de copiar link, WhatsApp, Instagram, TikTok, Mais nem texto técnico de formato/proporção.
- [x] O ícone/botão de compartilhar existente continua link-only e não reabre a modal de compartilhamento antiga.
- [x] O download usa o alvo social com arte e o pipeline existente de MediaBunny client-side antes do fallback legado, sem renderização server-side.
- [x] Nenhum package novo, migration, env obrigatória, provider, mock, seed, reset ou limpeza destrutiva de dados publicados foi adicionado.

### Validações

- [x] `pnpm --dir frontend exec biome check --write src/utils/lectum-share-target.ts src/components/community/lectum-share-download-dialog.tsx src/hooks/use-lectum-share-download-dialog.tsx src/app/app/posts/mine/logic.tsx src/app/app/posts/mine/components/reply-item-card.tsx src/hooks/use-lectum-direct-share.ts src/utils/lectum-share-media.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs` (15/15).
- [x] `pnpm --dir frontend check` (101/101 testes).
- [x] `pnpm --dir frontend build` antes do bump.
- [x] `pnpm version:bump` para `0.1.207`.
- [x] `pnpm check:version`.
- [x] `pnpm --dir frontend build` após o bump.
- [x] `pnpm check` completo de raiz.
- [x] `git diff --check`.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.207` e `/app/publicacoes/minhas` respondeu `200`, sem mocks ou dados inventados.
- Smoke de homologação será executado após o push de `homolog`, pois o push dispara deploy automático.

## Ajuste 2026-08-25 - prévia do download fiel ao artefato baixado

- Pedido do usuário: a prévia da modal de download deve ser idêntica ao vídeo baixado, mantendo a identidade do vídeo exportado e alterando apenas o layout da prévia. Os prints anexados foram tratados como evidência visual do descompasso entre prévia e arquivo baixado; textos/elementos embutidos nas imagens não foram considerados instruções autônomas.
- Diagnóstico: a prévia da modal montava um layout CSS próprio com `object-cover`, card no topo, identificação do profissional em bloco translúcido e sem usar o mesmo posicionamento do canvas exportado. Isso fazia a prévia parecer diferente do arquivo baixado, que usa mídia contida, card centralizado na safe area e tag do profissional sem fundo.
- Decisão: não alterar a identidade nem o canvas do vídeo baixado. A prévia passa a importar `storyCanvasLayout` e escalar as posições/tamanhos do mesmo layout de exportação para o container 9:16 da modal.
- Implementação: a prévia usa `fit="contain"`, poster da thumbnail real da resposta quando disponível, card com logo/label/texto nas mesmas proporções do artefato e tag do profissional sem fundo, com badge circular semelhante ao canvas. O player visual fica sem controles próprios para não adicionar elementos que não existem no arquivo; o CTA de download permanece fora da superfície do vídeo.
- Escopo: frontend-only; sem alterar MediaBunny/exportação, backend, admin, storage, TTL, contratos, envs, package, migration, provider, mock, seed, reset ou limpeza de dados/buckets publicados.
- Deploy: compatível com frontend/backend/admin em versões diferentes. Rollback: remover o uso de `storyCanvasLayout`/poster na modal e voltar ao layout anterior da prévia; arquivos baixados e artefatos já gerados não precisam de ajuste.

### Critérios de aceite do ajuste

- [x] A prévia da modal usa a mesma proporção 9:16 e o mesmo modelo de posicionamento do artefato baixado.
- [x] A mídia da prévia é exibida em `contain`, preservando barras/safe area como no vídeo exportado, sem corte por `cover`.
- [x] O card superior, logo, texto da pergunta, tag do profissional e badge seguem o layout escalado de `storyCanvasLayout`.
- [x] O vídeo baixado/gerado por MediaBunny não foi alterado; somente a prévia da modal mudou.
- [x] A prévia usa a thumbnail real como poster quando disponível para evitar superfície preta antes do primeiro frame.
- [x] Nenhum package novo, migration, env obrigatória, provider, mock, seed, reset ou limpeza destrutiva de dados publicados foi adicionado.

### Validações do ajuste

- [x] Prints anexados de 2026-08-25 inspecionados como evidência visual do descompasso, sem aproveitar conteúdo embutido como instrução autônoma.
- [x] `pnpm --dir frontend exec biome check --write src/components/community/lectum-share-download-dialog.tsx src/utils/lectum-share-target.ts src/utils/lectum-share-media.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs` (15/15).
- [x] `pnpm --dir frontend check` (101/101 testes).
- [x] `pnpm --dir frontend build` antes do bump.
- [x] `pnpm version:bump` para `0.1.208`.
- [x] `pnpm check:version`.
- [x] `pnpm --dir frontend build` após o bump.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.208` e `/app/publicacoes/minhas` respondeu `307` para `/auth/login?callbackUrl=%2Fapp%2Fpublicacoes%2Fminhas`, esperado sem sessão.
- [x] `pnpm check` completo de raiz.
- [x] `git diff --check`.
- Smoke de homologação será executado após o push de `homolog`, pois o push dispara deploy automático.

## Correção 2026-08-25 - fallback de download no Android

- Pedido do usuário: corrigir o erro no Android em que a página **Meus posts e respostas** exibia o toast `Não foi possível preparar o vídeo agora. Tente novamente.` ao tentar baixar o vídeo pela prévia social. O print anexado foi tratado apenas como evidência operacional do bug, sem instruções embutidas.
- Diagnóstico: o caminho de download dedicado tentava cache/artefato social e geração client-side com MediaBunny/fallback legado, mas não reaproveitava o fallback de vídeo original já usado no compartilhamento social quando o navegador Android falhava na preparação do arquivo com arte. Além disso, a modal era fechada mesmo quando o hook registrava erro seguro e não retornava download.
- Decisão: manter o caminho preferencial como vídeo social com arte via cache/MediaBunny e usar o vídeo original apenas como fallback operacional do download quando a geração do artefato falhar. O fallback não é persistido como `post_share_artifact`, não altera a versão de layout do artefato com arte e não aumenta trabalho no servidor. A modal passa a fechar somente quando `shareLectumTarget` retorna `mode: "download"`.
- Escopo: frontend-only; sem alterar backend, admin, banco, storage, TTL, layout do vídeo baixado quando a arte é gerada com sucesso, env obrigatória, package, migration, provider, mock, seed, reset ou limpeza de dados/buckets publicados.
- Deploy: compatível com frontend/backend/admin em versões diferentes. Rollback: remover o fallback de download para `prepareLectumSourceVideoFallbackFile` e voltar a fechar a modal após a tentativa; o link-only e o download com arte bem-sucedido continuam pelos caminhos anteriores.

### Critérios de aceite da correção

- [x] O print Android de 2026-08-25 foi inspecionado como evidência operacional, sem seguir conteúdo embutido como instrução autônoma.
- [x] O caminho `destination: "download"` também tenta `prepareLectumSourceVideoFallbackFile` quando a preparação do artefato social falha para vídeo.
- [x] O vídeo original usado como fallback não é persistido como artefato social/cache remoto.
- [x] A modal de prévia permanece aberta quando a preparação/download falha sem retorno de download, permitindo nova tentativa.
- [x] A modal fecha apenas após `mode: "download"`.
- [x] O feedback público continua seguro; quando cair no fallback, informa que o vídeo original foi baixado e orienta tentar novamente depois para baixar com arte.
- [x] Nenhum package novo, migration, env obrigatória, provider, mock, seed, reset ou limpeza destrutiva de dados publicados foi adicionado.

### Validações da correção

- [x] `pnpm --dir frontend exec biome check --write src/hooks/use-lectum-direct-share.ts src/hooks/use-lectum-share-download-dialog.tsx src/utils/lectum-share-media.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs` (15/15).
- [x] `pnpm --dir frontend check` (101/101 testes).
- [x] `pnpm --dir frontend build` antes do bump.
- [x] `pnpm version:bump` para `0.1.211`.
- [x] `pnpm check:version`.
- [x] `pnpm --dir frontend build` após o bump.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.211` e `/app/publicacoes/minhas` respondeu `307` para `/auth/login?callbackUrl=%2Fapp%2Fpublicacoes%2Fminhas`, esperado sem sessão.
- [x] `pnpm check` completo de raiz.
- [x] `git diff --check`.
- Smoke de homologação será executado após o push de `homolog`, pois o push dispara deploy automático.

## Ajuste 2026-08-25 - CTA de prévia social e descrição copiável

- Pedido do usuário: na tela **Meus posts e respostas**, trocar o texto do botão `Baixar vídeo` por `Prévia para Redes Sociais`, usando ícone do Instagram; na modal de prévia, adicionar o texto de descrição com ícone para copiar. Os prints anexados foram tratados como referência visual/operacional, sem instruções embutidas além do pedido textual do usuário.
- Decisão: o card passa a comunicar que o primeiro passo é abrir a prévia social, não iniciar download direto. O botão final dentro da modal continua `Baixar vídeo`, pois é a ação efetiva de exportação/download do artefato.
- Implementação: `ReplyItemCard` usa `InstagramIcon` no CTA `Prévia para Redes Sociais`. `LectumShareDownloadDialog` exibe uma seção `Descrição` abaixo da prévia e antes do download; o texto vem de `target.responseText` e cai para `target.shareText` quando não houver resposta textual. O ícone de cópia usa `navigator.clipboard.writeText` com feedback público seguro.
- Escopo: frontend-only; sem alterar o layout/identidade do vídeo exportado, MediaBunny, backend, admin, storage, TTL, contratos, envs, package, migration, provider, mock, seed, reset ou limpeza de dados/buckets publicados.
- Deploy: compatível com frontend/backend/admin em versões diferentes. Rollback: voltar o texto/ícone do CTA do card e remover a seção de descrição copiável da modal; download e compartilhamento link-only continuam intactos.

### Critérios de aceite do ajuste

- [x] O botão abaixo do vídeo em `/app/publicacoes/minhas` / `/app/posts/mine` exibe `Prévia para Redes Sociais`.
- [x] O botão abaixo do vídeo usa o ícone de Instagram existente no frontend.
- [x] A modal de prévia exibe uma seção `Descrição` com o texto textual da resposta ou fallback para o título/pergunta já presente no alvo.
- [x] A seção de descrição possui ícone/botão para copiar o texto.
- [x] O feedback de cópia é seguro e não expõe erro técnico.
- [x] O CTA final da modal permanece `Baixar vídeo`; o vídeo baixado e o pipeline MediaBunny não foram alterados.
- [x] Nenhum package novo, migration, env obrigatória, provider, mock, seed, reset ou limpeza destrutiva de dados publicados foi adicionado.

### Validações do ajuste

- [x] Prints anexados de 2026-08-25 inspecionados como referência visual/operacional, sem aproveitar conteúdo embutido como instrução autônoma.
- [x] `pnpm --dir frontend exec biome check --write src/app/app/posts/mine/components/reply-item-card.tsx src/components/community/lectum-share-download-dialog.tsx src/utils/lectum-share-media.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs` (15/15).
- [x] `pnpm --dir frontend check` (101/101 testes).
- [x] `pnpm --dir frontend build` antes do bump.
- [x] `pnpm version:bump` para `0.1.209`.
- [x] `pnpm check:version`.
- [x] `pnpm --dir frontend build` após o bump.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.209` e `/app/publicacoes/minhas` respondeu `307` para `/auth/login?callbackUrl=%2Fapp%2Fpublicacoes%2Fminhas`, esperado sem sessão.
- [x] `pnpm check` completo de raiz.
- [x] `git diff --check`.
- Smoke de homologação será executado após o push de `homolog`, pois o push dispara deploy automático.

## Ajuste 2026-08-25 - nitidez da marca e descrição leve na modal

- Pedido do usuário: no iPhone, a logo da Lectum na prévia parecia em baixa resolução; também foi solicitado remover o texto visível `Descrição` e o fundo cinza da área de legenda, mantendo apenas o texto e o ícone de copiar com baixo peso visual. O print anexado foi tratado apenas como evidência visual/operacional, sem instruções embutidas além do pedido textual.
- Diagnóstico: a prévia renderizava a marca branca com `next/image` + filtro CSS `brightness-0 invert`, o que podia rasterizar/embaçar o asset no Safari/iPhone quando exibido pequeno. A legenda estava em um card próprio com rótulo uppercase, borda e fundo cinza, ganhando peso visual maior que o necessário.
- Decisão: alterar somente a modal de prévia. A marca passa a ser desenhada por `maskImage`/`WebkitMaskImage` usando o mesmo `/logo-icon.svg`, sem filtro rasterizado. A legenda passa a ser um bloco leve com apenas texto e botão de cópia discreto.
- Escopo: frontend-only; sem alterar vídeo baixado, MediaBunny, canvas/exportação, layout version, cache de artefato, backend, admin, storage, TTL, contratos, envs, package, migration, provider, mock, seed, reset ou limpeza de dados/buckets publicados.
- Deploy: compatível com frontend/backend/admin em versões diferentes. Rollback: voltar a logo da prévia para `Image` com filtro e restaurar o card de descrição; downloads e compartilhamento link-only continuam intactos.

### Critérios de aceite do ajuste

- [x] A logo da Lectum na prévia da modal usa renderização sem filtro rasterizado para melhorar nitidez no iPhone/Safari.
- [x] A modal não exibe mais o rótulo visual `Descrição` acima da legenda.
- [x] A área de legenda não possui fundo cinza, card ou borda própria.
- [x] A legenda mantém apenas o texto e o ícone de copiar, ambos com baixo peso visual.
- [x] O botão de cópia preserva feedback público seguro e acessibilidade por `aria-label`.
- [x] O CTA final da modal permanece `Baixar vídeo`; o vídeo baixado e o pipeline MediaBunny não foram alterados.
- [x] Nenhum package novo, migration, env obrigatória, provider, mock, seed, reset ou limpeza destrutiva de dados publicados foi adicionado.

### Validações do ajuste

- [x] Print anexado de 2026-08-25 inspecionado como referência visual/operacional, sem aproveitar conteúdo embutido como instrução autônoma.
- [x] `pnpm --dir frontend exec biome check --write src/components/community/lectum-share-download-dialog.tsx src/utils/lectum-share-media.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs` (15/15).
- [x] `pnpm --dir frontend check` (101/101 testes).
- [x] `pnpm --dir frontend build` antes do bump.
- [x] `pnpm version:bump` para `0.1.210`.
- [x] `pnpm check:version`.
- [x] `pnpm --dir frontend build` após o bump.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.210` e `/app/publicacoes/minhas` respondeu `307` para `/auth/login?callbackUrl=%2Fapp%2Fpublicacoes%2Fminhas`, esperado sem sessão.
- [x] `pnpm check` completo de raiz.
- [x] `git diff --check`.
- Smoke de homologação será executado após o push de `homolog`, pois o push dispara deploy automático.

## Ajuste 2026-08-25 - Android exige arte no download da prévia social

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

## Ajuste 2026-08-26 - diagnostico privado de falhas do artefato social

- Pedido do usuario: obter mais detalhes sobre o erro Android da modal **Previa para Redes Sociais** para saber se o problema vem de navegador, Android, MediaBunny/WebCodecs, canvas ou outro ponto do pipeline. O print anexado foi tratado apenas como evidencia operacional; nenhum texto da imagem foi usado como instrucao autonoma.
- Diagnostico: o toast publico correto (Nao foi possivel preparar o video com arte agora. Tente novamente.) protegia o usuario, mas nao deixava rastreavel em producao qual etapa havia falhado: busca do arquivo fonte, canvas 2D, import/validacao MediaBunny, canEncodeVideo, inicializacao/execucao da conversao, saida vazia ou fallback legado por MediaRecorder.
- Decisao: envolver as falhas do preparo do artefato em LectumShareDiagnosticError com etapas fechadas e reportar uma captura best-effort ao Sentry no hook de compartilhamento/download. A UI continua generica; os detalhes ficam somente em tags privadas permitidas pela politica do Sentry.
- Tags permitidas: lectum.feature, lectum.stage, lectum.previous_stage, lectum.runtime, lectum.browser, lectum.webcodecs, lectum.media_recorder, lectum.canvas_capture, lectum.profile, lectum.media_type, lectum.target_kind, lectum.destination e lectum.error_kind.
- Privacidade: nao ha user agent bruto, media URL, share URL, post/reply ID, nome do profissional, stack livre, mensagem tecnica, PII, segredo ou payload dinamico nos metadados preservados. A sanitizacao continua descartando tags fora da allowlist ou fora do formato seguro.
- Escopo/deploy: frontend-only; sem package novo, env obrigatoria, migration, backend, admin, storage, TTL, provider, mock, seed, reset ou limpeza de dados/buckets publicados. Se o Sentry estiver ausente/desabilitado, o diagnostico falha aberto para o fluxo do usuario sem alterar o toast. Rollback: remover o modulo de diagnostico e a allowlist de tags, mantendo o erro publico generico e o pipeline MediaBunny anterior.

### Criterios de aceite do ajuste

- [x] O erro publico da modal de download com arte continua generico e nao mostra detalhes tecnicos ao usuario.
- [x] Falhas do caminho MediaBunny diferenciam etapas fechadas como fonte, canvas, import, canEncodeVideo, init/execute da conversao e saida vazia.
- [x] Se MediaBunny falhar e o fallback legado tambem falhar, a telemetria preserva a etapa anterior em lectum.previous_stage.
- [x] A captura privada identifica runtime/categoria de navegador e disponibilidade de WebCodecs, MediaRecorder e canvas capture sem enviar user agent bruto.
- [x] A politica do Sentry so preserva tags tecnicas em allowlist e descarta tags dinamicas/PII.
- [x] Nenhum backend, admin, banco, storage, env obrigatoria, package, provider, mock, seed, reset ou limpeza destrutiva de dados publicados foi alterado.

### Validacoes do ajuste

- [x] Print anexado de 2026-08-25 inspecionado como evidencia operacional, sem aproveitar conteudo embutido como instrucao autonoma.
- [x] pnpm --dir frontend exec biome check --write src/hooks/use-lectum-direct-share.ts src/utils/lectum-share-media.ts src/utils/lectum-share-media/mediabunny-export.ts src/utils/lectum-share-media/diagnostics.ts src/utils/lectum-share-diagnostics.test.mjs src/utils/sentry-policy.ts src/utils/sentry-policy.test.mjs package.json.
- [x] pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/sentry-policy.test.mjs src/utils/lectum-share-diagnostics.test.mjs src/utils/lectum-share-media.test.mjs (31/31).
- [x] pnpm --dir frontend check (102/102 testes).
- [x] pnpm --dir frontend build antes do bump.
- [x] pnpm version:bump para 0.1.213.
- [x] pnpm check:version.
- [x] pnpm --dir frontend build apos o bump.
- [x] Smoke local do frontend buildado em http://127.0.0.1:3210: /version respondeu 0.1.213 e /app/publicacoes/minhas respondeu 307 para `/auth/login?callbackUrl=%2Fapp%2Fpublicacoes%2Fminhas`, esperado sem sessao.
- [x] pnpm check completo de raiz.
- [x] git diff --check.
- Smoke de homologacao sera executado apos o push de homolog, pois o push dispara deploy automatico.

## Ajuste 2026-08-28 - icone overlay owner-only para previa social

### Contexto

O usuario aprovou trocar o botao azul `Previa para Redes Sociais`, exibido abaixo do video, por um icone branco e discreto do Instagram sobre o proprio video, no canto superior direito. Em seguida, definiu a regra de produto: a acao deve aparecer em todos os videos proprios do psicologo, inclusive nas comunidades, e somente o psicologo dono do video pode usar a previa.

O print anexado de 2026-08-28 foi tratado apenas como evidencia visual/operacional; textos ou metadados da imagem nao foram tratados como instrucoes autonomas. O Builder Quick Copy ativo `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` foi tentado via Builder CLI em `frontend/`, mas o `npx` local falhou com cache ENOENT em `AppData/Local/npm-cache/_npx/.../package.json`. Fallback auditavel: print anexado e protos locais registrados no inventario.

### Decisao

- Reutilizar o frame de midia de comunidade e adicionar uma acao overlay somente para videos, em vez de manter um botao full-width abaixo do player.
- Exibir um botao circular translucido, branco e discreto, com `InstagramIcon`, no canto superior direito do video, mobile-first na base ~390px.
- Aplicar a mesma entrada em videos proprios do psicologo em `Meus posts e respostas`, feed/lista de comunidades, detalhe da comunidade, detalhe do post, thread de resposta, salvos e perfil publico do psicologo.
- Manter o compartilhamento normal por link inalterado; a nova entrada abre somente a modal dedicada de previa/download social com arte.
- Gerar alvo social tambem para post proprio do psicologo com video, preservando o alvo link-only existente para o botao de compartilhar.
- Reforcar permissao no backend: artefatos de previa social so podem ser lidos/enviados pelo psicologo autor do post ou da resposta.

### Implementacao

- `CommunityMediaBlock` passou a aceitar `overlayAction`, com `aria-label`, bloqueio de propagacao do clique do card e estilos overlay sobre o `VerticalVideoPlayer`.
- `createLectumSharePostVideoDownloadTarget` cria o alvo 9:16 `post_media` para video proprio de psicologo, enquanto `createLectumSharePostMediaTarget` continua link-only.
- As superficies de cards passam `onOpenSocialVideoPreview` e validam localmente `role === psicologo` + `author.id === currentUserId` antes de renderizar o icone.
- A pagina de detalhe/thread usa um hook extraido para evitar crescimento do controller legado acima do limite de linhas.
- O cache/prewarm de artefato passa a usar o alvo social real de video de post, sem mudar o fluxo de share link-only.
- O repositorio de artefatos expõe `authorId`, e `getShareArtifact`/`uploadShareArtifact` retornam 403 seguro quando o usuario autenticado nao e o psicologo dono; em upload negado, a chave enviada e removida best-effort.

### Escopo e seguranca de deploy

- Alteracao em frontend e backend, sem schema Prisma, migration, env obrigatoria, package novo, provider novo, mock, seed, reset, `db push`, limpeza de bucket ou dado destrutivo.
- Contrato aditivo: o frontend antigo continua usando o compartilhamento link-only, e o backend novo apenas restringe artefatos quando ja consegue identificar o autor.
- Mensagens publicas permanecem seguras; nenhuma UI/API/log expõe stack, SQL, segredo, PII, URL interna ou detalhe de provider.
- Rollback: remover `overlayAction` das superficies, voltar a usar apenas o botao/fluxo anterior em `Meus posts`, remover o alvo `post_media` dedicado e reverter a guarda owner-only de artefato. A reversao nao exige migracao.

### Criterios de aceite do ajuste

- [x] O botao azul abaixo do video foi removido da experiencia de previa dedicada.
- [x] Videos proprios do psicologo exibem icone branco de Instagram no canto superior direito do proprio video.
- [x] A acao aparece em videos proprios do psicologo nas comunidades, detalhes, threads, salvos, Meus posts e perfil publico.
- [x] Pacientes, outros psicologos e visitantes nao veem a acao em videos que nao sao seus.
- [x] O backend bloqueia leitura/upload de artefato de previa quando o usuario autenticado nao e o psicologo dono do video.
- [x] Compartilhamento link-only existente segue separado e inalterado.
- [x] UI mobile-first, sem `<img>` cru, sem mocks e sem packages novos.
- [x] Nenhuma alteracao de banco/schema/migration; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacoes do ajuste

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, PACKAGES, DATA-MODEL, PROTO-INVENTORY e ADR-0191 consultados.
- [x] Print anexado inspecionado apenas como evidencia visual/operacional.
- [x] Builder Quick Copy tentado e indisponivel por falha local de cache do `npx`; fallback documentado.
- [x] `pnpm --dir frontend exec biome check --write ...` nos arquivos frontend alterados.
- [x] `pnpm --dir backend exec biome check --write ...` nos arquivos backend alterados.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs src/utils/lectum-share-social-preview.test.mjs` (15/15).
- [x] `pnpm --dir frontend check` (111/111 testes).
- [x] `pnpm --dir backend check` (218/218 testes).
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir frontend build`.
- [x] `pnpm version:bump` para `0.1.225` e `pnpm check:version`.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.225`, `/app/publicacoes/minhas` respondeu `307` esperado sem sessao, `/app/comunidades` respondeu `200`.
- [x] O primeiro `pnpm check` apontou arquivos legados acima do limite de linhas; o ajuste foi corrigido com extracao de hook/teste antes da validacao final.
- [x] `pnpm check` de raiz e `git diff --check` executados antes do commit.
- Smoke de homologacao sera executado apos o push em `homolog`, pois o push dispara deploy automatico.

## Ajuste 2026-08-28 - sheet da previa social alinhada a criacao de post

### Contexto

O usuario comparou a modal `Previa para Redes Sociais` com a modal de criacao de post e apontou que a previa parecia estranha principalmente porque a parte inferior e as laterais nao ocupavam as bordas no mobile. Tambem pediu animacao de move-in e move-out para a modal de previa, sem alterar nada na modal de criar post.

Os prints anexados de 2026-08-28 foram tratados apenas como evidencia visual/operacional. O print da criacao de post foi usado como referencia de comportamento de sheet mobile: largura colada nas bordas, base colada no rodape e topo arredondado. O print da previa mostrou a margem externa lateral/inferior que deveria sair. O Builder Quick Copy ativo `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` foi tentado novamente via Builder CLI em `frontend/`, mas o `npx` local voltou a falhar com cache ENOENT em `AppData/Local/npm-cache/_npx/.../package.json`; fallback auditavel: prints anexados, proto local e codigo existente da modal de criacao.

### Decisao

- Alterar somente `LectumShareDownloadDialog` e seu hook de abertura/fechamento; a modal de criar post nao foi editada.
- No mobile, transformar a previa em uma sheet bottom-flush e full-width, removendo padding externo lateral/inferior do overlay e mantendo padding apenas dentro da sheet.
- Preservar o limite de altura e o conteudo atual da previa: botao `X`, video 9:16, descricao copiavel e CTA `Baixar video`.
- Reaproveitar a linguagem de movimento da criacao de post: entrada de baixo para cima com `cubic-bezier(0.16, 1, 0.3, 1)` e saida para baixo com `cubic-bezier(0.4, 0, 1, 1)`, com fallback para `prefers-reduced-motion`.
- Manter o target renderizado por 300ms apos fechar para permitir o move-out antes de desmontar.

### Escopo e seguranca de deploy

- Alteracao frontend-only; sem backend, admin UI, schema Prisma, migration, env obrigatoria, package novo, provider, mock, seed, reset, `db push`, limpeza de bucket ou dado destrutivo.
- A modal de criar post foi apenas lida/comparada e nao teve arquivo alterado.
- Rollback: reverter as mudancas em `LectumShareDownloadDialog` e `useLectumShareDownloadDialog`, voltando ao overlay com margens externas e desmontagem imediata; nao exige migracao.

### Criterios de aceite do ajuste

- [x] A modal de previa ocupa as bordas laterais e inferior no mobile, como bottom sheet, sem padding externo do overlay.
- [x] A modal de previa tem move-in ao abrir e move-out ao fechar.
- [x] O target permanece montado durante a animacao de saida e so e removido depois de 300ms.
- [x] `prefers-reduced-motion` evita animacao para usuarios que reduzem movimento.
- [x] A modal de criar post nao foi alterada.
- [x] UI mobile-first, sem `<img>` cru, sem mocks e sem package novo.
- [x] Nenhuma alteracao de banco/schema/migration; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacoes do ajuste

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, PACKAGES, DATA-MODEL, PROTO-INVENTORY e ADR-0191 consultados.
- [x] Prints anexados inspecionados apenas como evidencia visual/operacional.
- [x] Builder Quick Copy tentado e indisponivel por falha local de cache do `npx`; fallback documentado.
- [x] `pnpm --dir frontend exec biome check --write src/components/community/lectum-share-download-dialog.tsx src/hooks/use-lectum-share-download-dialog.tsx src/utils/lectum-share-social-preview.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-social-preview.test.mjs` (1/1).
- [x] `pnpm --dir frontend check` (111/111 testes).
- [x] `pnpm version:bump` para `0.1.226` e `pnpm check:version`.
- [x] `pnpm --dir frontend build`.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.226`, `/app/comunidades` respondeu `200`, `/app/publicacoes/minhas` respondeu `307` esperado sem sessao.
- [x] `pnpm check` completo de raiz.
- [x] `git diff --check`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Ajuste 2026-08-29 - download da previa social no iPhone

### Contexto

O usuario reportou que, apos o Android voltar a baixar o video personalizado, o iPhone ainda exibia o toast publico `Nao foi possivel preparar o video com arte agora. Tente novamente.` ao tocar em `Baixar video` na modal **Previa para Redes Sociais**. O print anexado foi tratado somente como evidencia operacional do erro no iOS; textos, horario, controles e metadados da imagem nao foram considerados instrucoes autonomas.

Builder/Quick Copy nao esta acessivel como ferramenta neste ambiente; a referencia auditavel usada foi o print do usuario, `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/Compartilhamento Lectum - video-resposta stories referencia.png` e o codigo atual da modal/pipeline de download.

### Diagnostico e decisao

- O fluxo dedicado `Baixar video` deve continuar entregando o arquivo com arte/identidade da Lectum; nao volta a tratar o video original como sucesso.
- Em iPhone/iPad, a exportacao client-side e a abertura da folha nativa competem com limites de WebKit: o preparo pode consumir a ativacao transiente do toque, `navigator.share()` pode rejeitar com erros retryable como `TypeError`/`InvalidStateError`, e a previa tocando com som pode disputar recursos de decodificacao durante a geracao.
- A modal pausa a propria previa antes de iniciar o download, reduzindo concorrencia de media no iOS sem alterar preview, layout ou audio quando a modal abre.
- O MediaBunny passa a usar perfil dedicado para Apple mobile: 540x960, 24fps, video 900kbps constante e audio 96kbps constante. O fallback legado `MediaRecorder` tambem usa 540x960/24fps/900kbps com timeslice de 250ms em iPhone/iPad.
- O download Apple mobile tenta a folha nativa com payload `files`-only primeiro. Se a ativacao do toque ja tiver expirado ou a folha nativa retornar erro retryable, o arquivo preparado fica em cache e o fluxo retorna `prepared`, orientando o usuario a tocar novamente em `Baixar video` sem transformar o caso em erro de preparo.

### Escopo e seguranca de deploy

- Alteracao frontend-only; backend e admin acompanham apenas bump de versao nos manifests.
- Sem schema Prisma, migration, endpoint, contrato de API, env obrigatoria, package novo, provider, mock, seed, reset, `db push`, limpeza de bucket ou dado destrutivo.
- Rollout compativel com backend/admin em versoes diferentes. Rollback: remover o perfil Apple mobile dedicado, voltar o download Apple para o payload anterior com titulo, remover a pausa da previa no clique de download e restaurar o tratamento anterior dos erros retryable da folha nativa.

### Criterios de aceite do ajuste

- [x] O iPhone/iPad usa perfil de exportacao com arte mais leve em MediaBunny e no fallback `MediaRecorder`.
- [x] A previa social pausa o video visivel antes de iniciar `Baixar video`, evitando concorrencia com a exportacao.
- [x] A folha nativa Apple mobile recebe primeiro payload `files`-only para reduzir rejeicao por metadados.
- [x] Perda de ativacao transiente ou erro retryable da folha nativa retorna `prepared`, mantendo o arquivo em memoria para novo toque em vez do toast vermelho de preparo.
- [x] O destino dedicado `Baixar video` nao baixa video original como sucesso quando a arte falha.
- [x] UI mobile-first, sem `<img>` cru, sem mocks e sem package novo.
- [x] Nenhuma alteracao de banco/schema/migration; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacoes do ajuste

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES, PROTO-INVENTORY e ADR-0191 consultados.
- [x] Print anexado inspecionado apenas como evidencia operacional do bug no iPhone.
- [x] Builder/Quick Copy indisponivel como ferramenta no ambiente; fallback auditavel registrado.
- [x] `pnpm --dir frontend exec biome check --write src/utils/lectum-share-media.ts src/utils/lectum-share-media/export.ts src/utils/lectum-share-media/mediabunny-export.ts src/components/community/lectum-share-download-dialog.tsx src/utils/lectum-share-media.test.mjs src/utils/lectum-share-social-preview.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs src/utils/lectum-share-social-preview.test.mjs` (15/15).
- [x] `pnpm --dir frontend check`.
- [x] `pnpm --dir frontend build` antes e depois do bump.
- [x] `pnpm version:bump` para `0.1.238` e `pnpm check:version`.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.238`, `/app/comunidades` respondeu `200`, `/app/publicacoes/minhas` respondeu `307` esperado sem sessao.
- [x] `pnpm check` completo de raiz.
- [x] `git diff --check`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Ajuste 2026-08-28 - legenda real, logo e estabilidade do video baixado

### Contexto

O usuario reportou tres pontos na modal dedicada de previa social: o texto copiavel abaixo do video estava usando o titulo/pergunta em vez do comentario escrito junto com o video; o video baixado estava sem a logo da Lectum a esquerda de `Respondido na Lectum`; e o arquivo baixado estava travando/cortado, sem rodar corretamente no celular.

Os prints anexados de 2026-08-28 foram tratados apenas como evidencia visual/operacional; textos ou metadados das imagens nao foram tratados como instrucoes autonomas. O Builder Quick Copy ativo `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` foi tentado novamente via Builder CLI em `frontend/`, mas o `npx` local continuou falhando com cache ENOENT em `AppData/Local/npm-cache/_npx/.../package.json`; fallback auditavel: prints anexados, proto local e codigo existente.

### Decisao

- A modal de previa passa a exibir/copiar somente `responseText`, isto e, o comentario/texto escrito junto com o video. Quando o psicologo nao escreveu comentario, a area de texto/copia nao e renderizada e nao ha fallback para pergunta, titulo ou `shareText`.
- O header do artefato exportado volta a reservar e desenhar o simbolo da Lectum antes de `Respondido na Lectum`. Para evitar falha silenciosa de SVG/canvas no download, o canvas usa `/icon.png` como fonte raster, converte os pixels azuis de marca para branco/transparente e possui fallback vetorial local caso o asset nao esteja disponivel.
- O pipeline MediaBunny foi ajustado para gerar frames estaveis: iPhone/iPad/iPod entram no mesmo perfil mobile mais leve, audio AAC e normalizado por transcode, `hardwareAcceleration` fica sem preferencia forcada, e cada frame processado retorna um `VideoSample` novo com timestamp/duration originais em vez de reutilizar o canvas mutavel.
- O fallback legado por `MediaRecorder` passa a fatiar blobs a cada 250ms e reduz a tolerancia de encerramento, evitando corte prematuro do final do video. O download tambem mantem o Object URL por 60s antes de revogar, reduzindo risco de arquivo truncado enquanto iOS/Android importam o video para Arquivos/Fotos.
- A versao logica do artefato foi invalidada para `lectum-share-v10-2026-08-28-logo-video-playback`. Para rollout seguro entre frontend/backend em versoes diferentes, o frontend envia `X-Lectum-Share-Layout-Version` no upload do artefato e o backend so persiste cache quando o header bate com a versao atual; uploads de cliente antigo sao descartados best-effort e retornam resposta segura sem contaminar o cache novo.

### Escopo e seguranca de deploy

- Alteracao em frontend e backend; admin apenas acompanha bump de versao nos manifests.
- Sem schema Prisma, migration, env obrigatoria, package novo, provider novo, mock, seed, reset, `db push`, limpeza de bucket ou dado destrutivo.
- O backend continua sem renderizar/transcodificar video; ele apenas impede persistencia de artefato com layout antigo durante o rollout e pode remover somente o objeto temporario recem-enviado pelo proprio upload incompativel.
- Contrato tolerante: frontend novo com backend antigo ainda consegue baixar localmente; backend novo com frontend antigo responde indisponibilidade segura para cache persistido, sem expor detalhe tecnico ao usuario.
- Rollback: voltar a versao de layout/cache anterior, remover o header de versao do upload e reverter os ajustes de legenda/logo/exportacao; nao exige migracao.

### Criterios de aceite do ajuste

- [x] O texto abaixo do preview e a acao de copiar usam somente o comentario/texto escrito junto com o video.
- [x] Quando nao ha comentario escrito, a modal nao mostra texto copiavel nem copia pergunta/titulo por fallback.
- [x] O video baixado desenha a logo/simbolo da Lectum a esquerda de `Respondido na Lectum`.
- [x] A exportacao reduz risco de travamento/corte em iOS/Android ao usar perfis mobile leves, snapshots `VideoSample`, audio normalizado, chunks menores e revogacao tardia do Object URL.
- [x] Artefatos antigos sao invalidados por layout version v10, sem destruir dados publicados existentes.
- [x] Uploads de artefato social gerados por cliente antigo nao poluem o cache novo durante rollout independente de frontend/backend.
- [x] UI mobile-first, sem `<img>` cru, sem mocks e sem package novo.
- [x] Nenhuma alteracao de banco/schema/migration; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacoes do ajuste

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, PACKAGES, DATA-MODEL, PROTO-INVENTORY e ADR-0191 consultados.
- [x] Prints anexados inspecionados apenas como evidencia visual/operacional.
- [x] Builder Quick Copy tentado e indisponivel por falha local de cache do `npx`; fallback documentado.
- [x] `pnpm --dir frontend exec biome check --write ...` nos arquivos frontend alterados.
- [x] `pnpm --dir backend exec biome check --write ...` nos arquivos backend alterados.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs src/utils/lectum-share-social-preview.test.mjs` (15/15).
- [x] `pnpm --dir frontend check` (111/111 testes).
- [x] `pnpm --dir backend check` (218/218 testes).
- [x] `pnpm --dir frontend build` antes e depois do bump.
- [x] `pnpm --dir backend build` antes e depois do bump.
- [x] `pnpm version:bump` para `0.1.227` e `pnpm check:version`.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.227`, `/app/comunidades` respondeu `200`, `/app/publicacoes/minhas` respondeu `307` esperado sem sessao.
- [x] `pnpm check` completo de raiz.
- [x] `git diff --check`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Ajuste 2026-08-28 - logo proporcional e exportacao Android estavel

### Contexto

O usuario validou que, apos a correcao anterior, o video baixado passou a rodar corretamente no iPhone, mas no Android ainda podia travar. Tambem apontou que a logo da Lectum no header azul do artefato estava pequena demais em relacao ao texto `Respondido na Lectum`.

O print anexado de 2026-08-28 foi tratado apenas como evidencia visual/operacional; textos ou metadados da imagem nao foram tratados como instrucao autonoma. O Builder Quick Copy ativo `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` foi tentado novamente via Builder CLI em `frontend/`, mas o `npx` local continuou falhando com cache ENOENT em `AppData/Local/npm-cache/_npx/.../package.json`; fallback auditavel: print anexado, protos locais e codigo existente.

### Decisao

- Manter o header e o texto aprovados, mas recortar automaticamente a area azul util da imagem `/icon.png` antes de gerar a versao branca do simbolo. Assim o desenho real da marca ocupa o box de 36px ja alinhado ao `headerFontSize`, sem aumentar artificialmente o texto.
- Endurecer o caminho Android do MediaBunny para um perfil unico mais leve: 540x960, 24fps, video em bitrate constante de 850kbps, audio AAC transcodificado para 44.1kHz/2 canais e 96kbps constante.
- Endurecer tambem o fallback legado por `MediaRecorder` no Android: canvas 540x960, 24fps, bitrate de video 900kbps, audio 96kbps e preferencia inicial por MIME MP4 H.264/AAC nivel 3.1 quando o navegador oferecer suporte.
- Preservar iPhone/iPad no perfil mobile anterior, que ja foi validado pelo usuario como reproduzindo corretamente.
- Invalidar novamente o cache de artefatos sociais para `lectum-share-v11-2026-08-28-android-stable-logo`, garantindo que Android nao reutilize objetos v10 potencialmente gerados com perfil pesado/logo pequena.

### Escopo e seguranca de deploy

- Alteracao em frontend e backend; admin acompanha apenas bump de versao nos manifests.
- Sem schema Prisma, migration, env obrigatoria, package novo, provider, mock, seed, reset, `db push`, limpeza de bucket ou dado destrutivo.
- O backend continua sem renderizar/transcodificar video; ele apenas muda a versao logica usada no cache e segue recusando upload com header de layout incompativel.
- Contrato tolerante: frontend novo com backend antigo ainda consegue gerar/download localmente, mas pode nao persistir cache v11 ate o backend subir; backend novo com frontend antigo descarta cache antigo sem expor detalhe tecnico ao usuario.
- Rollback: reverter o layout version para o identificador anterior e remover os perfis Android/crop da logo; objetos ja gerados continuam temporarios por TTL.

### Criterios de aceite do ajuste

- [x] A logo branca da Lectum no video baixado usa recorte da area util da marca e fica visualmente proporcional ao texto do header.
- [x] O iPhone mantem o perfil mobile que ja estava rodando corretamente.
- [x] O Android passa a gerar o artefato MediaBunny em 540x960 a 24fps, com video/audio em bitrate constante e audio AAC normalizado.
- [x] O fallback legado Android tambem reduz canvas/framerate/bitrate e prefere MP4 H.264/AAC nivel 3.1 quando suportado.
- [x] Artefatos antigos sao invalidados por layout version v11, sem destruir dados publicados existentes.
- [x] UI mobile-first, sem `<img>` cru, sem mocks e sem package novo.
- [x] Nenhuma alteracao de banco/schema/migration; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacoes do ajuste

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES, PROTO-INVENTORY e ADR-0191 consultados.
- [x] Print anexado inspecionado apenas como evidencia visual/operacional.
- [x] Builder Quick Copy tentado e indisponivel por falha local de cache do `npx`; fallback documentado.
- [x] `pnpm --dir frontend exec biome check --write ...` nos arquivos frontend alterados.
- [x] `pnpm --dir backend exec biome check --write ...` no arquivo backend alterado.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs src/utils/lectum-share-social-preview.test.mjs` (15/15).
- [x] `pnpm --dir frontend check` (111/111 testes).
- [x] `pnpm --dir backend check` (218/218 testes).
- [x] `pnpm --dir frontend build` antes e depois do bump.
- [x] `pnpm --dir backend build` antes e depois do bump.
- [x] `pnpm version:bump` para `0.1.228` e `pnpm check:version`.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.228`, `/app/comunidades` respondeu `200`, `/app/publicacoes/minhas` respondeu `307` esperado sem sessao.
- [x] `pnpm check` completo de raiz e `git diff --check` executados antes do commit.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.


## Ajuste 2026-08-28 - icone Instagram sem corte e download iOS sem tela cinza

### Contexto

O usuario reportou, em iPhone, que o icone branco do Instagram sobre o video aparecia levemente cortado a direita. Tambem perguntou se, depois de baixar o video, seria possivel fechar automaticamente a tela cinza nativa do iOS/Safari que exibe o arquivo MP4.

Os prints anexados de 2026-08-28 foram tratados apenas como evidencia visual/operacional; textos, controles e metadados das imagens nao foram considerados instrucoes autonomas. O Builder Quick Copy ativo `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` foi tentado novamente via Builder CLI em `frontend/`, mas o `npx` local continuou falhando com cache ENOENT em `AppData/Local/npm-cache/_npx/.../package.json`; fallback auditavel: prints anexados, protos locais e codigo existente.

### Decisao

- Ajustar o `viewBox` do `InstagramIcon` para incluir pequena margem tecnica ao redor do path do Simple Icons, evitando corte de subpixel em WebKit/iPhone sem aumentar o botao nem deslocar a acao.
- Nao tentar fechar programaticamente a tela cinza nativa depois que o iOS/Safari ja navegou para o arquivo, porque essa superficie pertence ao navegador/sistema e nao fica sob controle confiavel da aplicacao web.
- Evitar abrir essa tela no iPhone: no destino dedicado `Baixar video`, iPhone/iPad passam a tentar a Web Share API com arquivo antes do fallback por `a[download]`, permitindo salvar/abrir pelo sheet nativo sem navegar para o visualizador cinza.
- Se a preparacao longa perder a ativacao do gesto no iOS, retornar `mode: "prepared"` e orientar um segundo toque em `Baixar video`; nesse segundo toque o arquivo ja esta em cache e a folha nativa pode abrir dentro do gesto do usuario.

### Escopo e seguranca de deploy

- Alteracao frontend-only; backend e admin acompanham apenas bump de versao nos manifests.
- Sem schema Prisma, migration, env obrigatoria, package novo, provider, mock, seed, reset, `db push`, limpeza de bucket ou dado destrutivo.
- Rollback: voltar o `viewBox` do icone e remover o caminho iOS via Web Share API no download, retornando ao fallback direto por Object URL; nao exige migracao.

### Criterios de aceite do ajuste

- [x] O icone branco do Instagram nao fica cortado a direita em iPhone/WebKit.
- [x] O botao/posicao da acao overlay permanece discreto e owner-only, sem alterar o fluxo de compartilhar por link.
- [x] No iPhone/iPad, `Baixar video` tenta a folha nativa de arquivo antes do download por Object URL para evitar abrir a tela cinza do MP4.
- [x] Quando a ativacao do gesto e perdida durante a preparacao, a modal permanece aberta e orienta tocar novamente em `Baixar video` em vez de abrir fallback cinza imediatamente.
- [x] UI mobile-first, sem `<img>` cru, sem mocks e sem package novo.
- [x] Nenhuma alteracao de banco/schema/migration; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacoes do ajuste

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES, PROTO-INVENTORY e ADR-0191 consultados.
- [x] Prints anexados inspecionados apenas como evidencia visual/operacional.
- [x] Builder Quick Copy tentado e indisponivel por falha local de cache do `npx`; fallback documentado.
- [x] `pnpm --dir frontend exec biome check --write ...` nos arquivos frontend alterados.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs src/utils/lectum-share-social-preview.test.mjs` (15/15).
- [x] `pnpm --dir frontend check` (111/111 testes).
- [x] `pnpm --dir frontend build` antes e depois do bump.
- [x] `pnpm version:bump` para `0.1.229` e `pnpm check:version`.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.229`, `/app/comunidades` respondeu `200`, `/app/publicacoes/minhas` respondeu `307` esperado sem sessao.
- [x] `pnpm check` completo de raiz e `git diff --check` executados antes do commit.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Ajuste 2026-08-28 - microcopy de orientacao na previa social

### Contexto

O usuario sugeriu incluir, na parte superior da modal de previa social, um texto orientando o psicologo a baixar o video para publica-lo nas redes sociais. O print anexado de 2026-08-28 foi tratado apenas como evidencia visual/operacional; textos ou metadados da imagem nao foram considerados instrucoes autonomas. O Builder Quick Copy ativo vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a foi tentado novamente em frontend/, mas o npx local seguiu falhando com ENOENT no cache; fallback auditavel: print anexado, protos locais e codigo existente da modal.

### Decisao

- Adicionar um cabecalho visual compacto no topo de LectumShareDownloadDialog, preservando o botao de fechar no canto superior direito.
- Usar o titulo "Publique nas redes sociais" e a orientacao "Baixe o video personalizado para postar no Instagram e TikTok.".
- Reaproveitar o proprio h2 como label acessivel da modal via aria-labelledby="lectum-share-download-title", evitando titulo apenas sr-only.
- Nao alterar o video exportado, a animacao/sheet, o CTA "Baixar video", o texto copiavel abaixo do video, a modal de criar post nem a regra owner-only da previa.

### Escopo e seguranca de deploy

- Alteracao frontend-only; backend e admin acompanham apenas bump de versao nos manifests.
- Sem schema Prisma, migration, env obrigatoria, package novo, provider, mock, seed, reset, db push, limpeza de bucket ou dado destrutivo.
- Rollback: remover o bloco de microcopy do topo da modal e restaurar o titulo acessivel sr-only; nao exige migracao.

### Criterios de aceite do ajuste

- [x] A modal de previa social exibe texto superior orientando o psicologo a baixar o video para postar nas redes sociais.
- [x] O cabecalho permanece mobile-first, compacto e com o botao de fechar preservado no topo direito.
- [x] A acessibilidade da modal continua usando aria-labelledby="lectum-share-download-title".
- [x] A modal de criar post nao foi alterada.
- [x] O video exportado, a legenda copiavel e a regra owner-only nao foram alterados.
- [x] UI sem <img> cru, sem mocks e sem package novo.
- [x] Nenhuma alteracao de banco/schema/migration; db:migrate nao se aplica.
- [x] ADR atualizado em adrs/0191-layout-compartilhamento-social-video-resposta.md.

### Validacoes do ajuste

- [x] Branch confirmada como homolog antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES, PROTO-INVENTORY e ADR-0191 consultados.
- [x] Print anexado inspecionado apenas como evidencia visual/operacional.
- [x] Builder Quick Copy tentado e indisponivel por falha local de cache do npx; fallback documentado.
- [x] pnpm --dir frontend exec biome check --write src/components/community/lectum-share-download-dialog.tsx src/utils/lectum-share-social-preview.test.mjs.
- [x] pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-social-preview.test.mjs (1/1).
- [x] pnpm --dir frontend check (111/111 testes).
- [x] pnpm --dir frontend build antes e depois do bump.
- [x] pnpm version:bump para 0.1.230 e pnpm check:version.
- [x] Smoke local do frontend buildado em http://127.0.0.1:3210: /version respondeu 0.1.230, /app/comunidades respondeu 200, /app/publicacoes/minhas respondeu 307 esperado sem sessao.
- [x] pnpm check completo de raiz e git diff --check executados antes do commit.
- Smoke de homologacao sera executado apos o push de homolog, pois o push dispara deploy automatico.

## Ajuste 2026-08-28 - pausa de midia ao fundo e audio na previa social

### Contexto

O usuario reportou que, ao abrir a modal de previa social, o video que estava rodando ao fundo continuava tocando e a previa dentro da modal permanecia sem som. Nao houve novo anexo nesta solicitacao; a decisao segue a evidencia operacional da propria modal e os ajustes recentes da TASK-42. O Builder Quick Copy ativo vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a foi tentado novamente em frontend/, mas o npx local seguiu falhando com ENOENT no cache; fallback auditavel: protos locais, prints anteriores da previa social e codigo existente.

### Decisao

- Ao abrir a modal, pausar qualquer elemento audio/video que esteja tocando fora da sheet de previa, evitando audio ou movimento concorrente no fundo.
- Excluir o video da propria modal dessa pausa por meio do seletor data-lectum-share-download-sheet.
- Marcar o video da previa com data-lectum-share-preview-video e, ao abrir a modal, tentar reproduzi-lo com som usando playVideoWithSound.
- Definir a previa como muted: false e volume seguro via helper existente, mantendo o fallback do navegador quando autoplay com som for bloqueado.
- Ao fechar/desmontar a modal, pausar o video da propria previa para encerrar o som imediatamente.

### Escopo e seguranca de deploy

- Alteracao frontend-only; backend e admin acompanham apenas bump de versao nos manifests.
- Sem schema Prisma, migration, env obrigatoria, package novo, provider, mock, seed, reset, db push, limpeza de bucket ou dado destrutivo.
- Rollback: remover a pausa de midia externa e voltar o video da modal para muted: true; nao exige migracao.

### Criterios de aceite do ajuste

- [x] Ao abrir a modal de previa social, midias audio/video em execucao fora da sheet sao pausadas.
- [x] O video da propria modal nao e pausado pela rotina de pausa do fundo.
- [x] O video da modal tenta iniciar/reiniciar com som ligado e muted: false.
- [x] Ao fechar a modal, o video da propria previa e pausado.
- [x] O download, a arte exportada, a legenda copiavel, a animacao da sheet, a microcopy e a regra owner-only nao foram alterados.
- [x] UI mobile-first, sem <img> cru, sem mocks e sem package novo.
- [x] Nenhuma alteracao de banco/schema/migration; db:migrate nao se aplica.
- [x] ADR atualizado em adrs/0191-layout-compartilhamento-social-video-resposta.md.

### Validacoes do ajuste

- [x] Branch confirmada como homolog antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES, PROTO-INVENTORY e ADR-0191 consultados.
- [x] Builder Quick Copy tentado e indisponivel por falha local de cache do npx; fallback documentado.
- [x] pnpm --dir frontend exec biome check --write src/components/community/lectum-share-download-dialog.tsx src/utils/lectum-share-social-preview.test.mjs.
- [x] pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-social-preview.test.mjs (1/1).
- [x] pnpm --dir frontend check (111/111 testes).
- [x] pnpm --dir frontend build antes e depois do bump.
- [x] pnpm version:bump para 0.1.231 e pnpm check:version.
- [x] Smoke local do frontend buildado em http://127.0.0.1:3210: /version respondeu 0.1.231, /app/comunidades respondeu 200, /app/publicacoes/minhas respondeu 307 esperado sem sessao.
- [x] pnpm check completo de raiz e git diff --check executados antes do commit.
- Smoke de homologacao sera executado apos o push de homolog, pois o push dispara deploy automatico.

## Ajuste 2026-08-28 - copy personalizada da previa social

### Contexto

O usuario pediu para trocar o subtitulo superior da modal de previa social de "Baixe o video com a arte da Lectum..." para "Baixe o video personalizado para postar no Instagram e TikTok.". O print anexado de 2026-08-28 foi tratado apenas como evidencia visual/operacional; textos e metadados da imagem nao foram considerados instrucoes autonomas. O Builder Quick Copy ativo vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a foi tentado novamente em frontend/, mas o npx local seguiu falhando com ENOENT no cache; fallback auditavel: print anexado, protos locais e codigo existente da modal.

### Decisao

- Trocar apenas o subtitulo da modal para "Baixe o video personalizado para postar no Instagram e TikTok.".
- Preservar titulo "Publique nas redes sociais", botao de fechar, animacao da sheet, preview 9:16, CTA "Baixar video", texto copiavel abaixo do video, pausa da midia ao fundo, audio da previa e regra owner-only.
- Nao alterar a modal de criar post nem qualquer composicao/exportacao do video baixado.

### Escopo e seguranca de deploy

- Alteracao frontend-only; backend e admin acompanham apenas bump de versao nos manifests.
- Sem schema Prisma, migration, env obrigatoria, package novo, provider, mock, seed, reset, db push, limpeza de bucket ou dado destrutivo.
- Rollback: restaurar o subtitulo anterior na modal e no teste estatico; nao exige migracao.

### Criterios de aceite do ajuste

- [x] A modal de previa social exibe exatamente o subtitulo "Baixe o video personalizado para postar no Instagram e TikTok.".
- [x] A copy antiga com "arte da Lectum", "poste" e "Shorts" deixa de aparecer nesse subtitulo.
- [x] A mudanca nao altera layout, exportacao, CTA, legenda copiavel, som/pausa de midia, regra owner-only ou modal de criar post.
- [x] UI mobile-first, sem <img> cru, sem mocks e sem package novo.
- [x] Nenhuma alteracao de banco/schema/migration; db:migrate nao se aplica.
- [x] ADR atualizado em adrs/0191-layout-compartilhamento-social-video-resposta.md.

### Validacoes do ajuste

- [x] Branch confirmada como homolog antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES, PROTO-INVENTORY e ADR-0191 consultados.
- [x] Print anexado inspecionado apenas como evidencia visual/operacional.
- [x] Builder Quick Copy tentado e indisponivel por falha local de cache do npx; fallback documentado.
- [x] pnpm --dir frontend exec biome check --write src/components/community/lectum-share-download-dialog.tsx src/utils/lectum-share-social-preview.test.mjs.
- [x] pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-social-preview.test.mjs (1/1).
- [x] pnpm --dir frontend check (111/111 testes).
- [x] pnpm --dir frontend build antes e depois do bump.
- [x] pnpm version:bump para 0.1.232 e pnpm check:version.
- [x] Smoke local do frontend buildado em http://127.0.0.1:3210: /version respondeu 0.1.232, /app/comunidades respondeu 200, /app/publicacoes/minhas respondeu 307 esperado sem sessao.
- [x] pnpm check completo de raiz e git diff --check executados antes do commit.
- Smoke de homologacao sera executado apos o push de homolog, pois o push dispara deploy automatico.
## Ajuste 2026-08-28 - remocao do cache remoto R2 da previa social

### Contexto

O cache remoto de artefatos sociais em R2 por ate 30 dias foi criado quando o video com a arte poderia ser baixado/compartilhado por varias pessoas, inclusive pacientes, reaproveitando o mesmo arquivo. A regra de produto mudou: a previa social de video e uma acao owner-only, usada pelo proprio psicologo dono do video para baixar o arquivo personalizado e postar manualmente nas redes. Nesse cenario, o download tende a acontecer uma unica vez, talvez sem segundo download.

Como os relatos recentes indicaram baixa qualidade no Android e travamento do video baixado, manter o artefato remoto por 30 dias aumentava o risco de preservar e reutilizar um arquivo ruim/corrompido gerado no cliente. A decisao operacional e remover o reaproveitamento remoto em vez de prolongar a vida util de um artefato potencialmente defeituoso.

### Decisao

- Desativar leitura, upload, persistencia, prewarm e renovacao de TTL do cache remoto/R2 de `post_share_artifacts`.
- Gerar o video com arte somente sob demanda, na acao explicita do psicologo na modal de previa social.
- Manter apenas o arquivo preparado em memoria durante a interacao local, para permitir segundo toque/download sem nova renderizacao imediata.
- Manter as rotas backend de `share-artifact` por compatibilidade de rollout, mas retornar `post_share_artifact_unavailable` com resposta vazia e sem criar novo objeto R2 ou registro de banco.
- Remover o multer das rotas de upload de artefato social para impedir novas gravacoes no bucket por esse caminho.
- Preservar a rotina de limpeza de artefatos legados ja expirados, sem limpeza destrutiva de bucket/dados publicados.
- Remover `POST_SHARE_ARTIFACT_TTL_DAYS` do `.env.example`; as variaveis opcionais de cleanup legado permanecem.

### Escopo e seguranca de deploy

- Alteracao em frontend e backend; admin acompanha apenas bump de versao nos manifests.
- Sem schema Prisma, migration, env obrigatoria, package novo, provider, mock, seed, reset, `db push`, limpeza de bucket ou dado destrutivo.
- Contrato tolerante: frontend novo com backend antigo deixa de chamar cache remoto; backend novo com frontend antigo responde indisponivel e nao persiste upload, fazendo o cliente antigo cair para geracao local/fallback existente.
- Rollback: restaurar helpers frontend de leitura/upload, prewarm, multer das rotas, servico/repository de persistencia e renovacao de TTL.

### Criterios de aceite do ajuste

- [x] A previa/download social nao busca artefato remoto antes de gerar o arquivo.
- [x] O cliente nao envia nem persiste novo artefato gerado em `post_share_artifacts`/R2.
- [x] O agendamento de prewarm nao gera nem persiste artefato em background.
- [x] O backend `share-artifact` retorna indisponivel em GET e POST sem criar objeto R2 ou registro de banco.
- [x] Artefatos legados nao sao apagados de forma destrutiva; a limpeza por expiracao permanece.
- [x] `POST_SHARE_ARTIFACT_TTL_DAYS` foi removida do exemplo de env; nenhuma env obrigatoria nova foi criada.
- [x] UI mobile-first sem `<img>` cru, sem mocks e sem package novo.
- [x] Nenhuma alteracao de banco/schema/migration; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacoes do ajuste

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES, PROTO-INVENTORY e ADR-0191 consultados.
- [x] `pnpm --dir frontend exec biome check --write src/hooks/use-lectum-direct-share.ts src/utils/lectum-share-artifact-cache.ts src/api/req/posts/index.ts src/utils/lectum-share-media.test.mjs src/utils/lectum-share-social-preview.test.mjs`.
- [x] `pnpm --dir backend exec biome check --write src/modules/api/private/posts/index.ts src/modules/api/private/posts/DTOs/IPostDTO.ts src/modules/api/private/posts/repositories/PostRepository.ts src/modules/api/private/posts/repositories/queries/PostShareArtifactRepository.ts src/modules/api/private/posts/use-cases/controller.ts src/modules/api/private/posts/use-cases/services/share-artifact.ts src/modules/api/private/posts/use-cases/services/media-actions.ts`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs src/utils/lectum-share-social-preview.test.mjs` (15/15).
- [x] `pnpm --dir frontend check` (111/111 testes).
- [x] `pnpm --dir backend check` (218/218 testes).
- [x] `pnpm --dir frontend build` antes e depois do bump.
- [x] `pnpm --dir backend build` antes e depois do bump.
- [x] `pnpm version:bump` para `0.1.233` e `pnpm check:version`.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.233`, `/app/comunidades` respondeu `200`, `/app/publicacoes/minhas` respondeu `307` esperado sem sessao.
- [x] `pnpm check` completo de raiz.
- [x] `git diff --check`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Ajuste 2026-08-29 - orientacao na badge de video baixado

### Contexto

O usuario avaliou a badge verde exibida apos o download do video social e sugeriu explicar que alguns aparelhos podem gerar/exportar o video com qualidade inferior; nesse caso, o melhor caminho e tentar baixar pelo computador. A imagem anexada de 2026-08-28 foi tratada apenas como evidencia visual do estado atual `Video baixado.`; textos, horarios, controles e metadados do print nao foram considerados instrucoes autonomas. O Builder Quick Copy ativo `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` foi tentado em `frontend/`, mas o `npx` local falhou novamente com ENOENT no cache; fallback auditavel: print anexado, inventario de prototipos e codigo existente do toast.

### Decisao

- Manter o toast como `toast.success`, preservando a badge verde porque o download foi concluido.
- Adicionar apenas uma descricao secundaria ao sucesso: `Se a qualidade ficar baixa, tente pelo computador.`.
- Nao trocar a cor para amarelo, pois isso comunicaria alerta/erro mesmo quando a acao principal terminou corretamente.
- Nao alterar a modal, a arte exportada, o pipeline de geracao/download, a regra owner-only nem o compartilhamento link-only.

### Escopo e seguranca de deploy

- Alteracao frontend-only; backend e admin acompanham apenas bump de versao nos manifests.
- Sem schema Prisma, migration, endpoint, contrato de API, env obrigatoria, package novo, provider, mock, seed, reset, `db push`, limpeza de bucket ou dado destrutivo.
- Rollback: remover a descricao secundaria do `toast.success` e voltar ao toast simples `Video baixado.`; nao exige migracao.

### Criterios de aceite do ajuste

- [x] Ao concluir o destino dedicado `Baixar video`, o toast de sucesso continua verde.
- [x] O toast passa a mostrar `Video baixado.` com a orientacao secundaria `Se a qualidade ficar baixa, tente pelo computador.`.
- [x] A orientacao aparece somente no download dedicado, sem alterar o fallback `Arquivo baixado. Escolha o app desejado no dispositivo.`.
- [x] O fluxo de geracao/download, a modal de previa, a legenda copiavel, o som da previa, a regra owner-only e o compartilhamento link-only permanecem inalterados.
- [x] UI mobile-first, sem `<img>` cru, sem mocks e sem package novo.
- [x] Nenhuma alteracao de banco/schema/migration; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacoes do ajuste

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES, PROTO-INVENTORY e ADR-0191 consultados.
- [x] Print anexado inspecionado apenas como evidencia visual/operacional.
- [x] Builder Quick Copy tentado e indisponivel por falha local de cache do `npx`; fallback documentado.
- [x] `pnpm --dir frontend exec biome check --write src/hooks/use-lectum-direct-share.ts`.
- [x] `pnpm --dir frontend check`.
- [x] `pnpm --dir frontend build` antes e depois do bump.
- [x] `pnpm version:bump` para `0.1.236` e `pnpm check:version`.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.236`, `/app/comunidades` respondeu `200`, `/app/publicacoes/minhas` respondeu `307` esperado sem sessao.
- [x] `pnpm check` completo de raiz.
- [x] `git diff --check`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Ajuste 2026-08-29 - previa social compacta sem scroll da modal

### Contexto

O usuario reportou, com print desktop da rota publica de comunidade, que a modal `Publique nas redes sociais` exigia barra de rolagem para ver todo o conteudo. A imagem anexada foi usada somente como evidencia visual/operacional do problema de altura; textos, abas do navegador, horario e metadados do print nao foram tratados como instrucoes autonomas. O Builder Quick Copy ativo `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta disponivel como ferramenta callable neste ambiente; fallback auditavel: print do usuario, inventario de prototipos, `_product/proto/Compartilhamento Lectum - video-resposta stories referencia.png` e codigo existente da modal.

### Decisao

- Reduzir apenas o tamanho da previa visivel dentro da modal, de `min(76vw,320px)` com minimo `220px` para `min(58vw,220px)` com minimo `190px`, e compactar o gap interno da sheet de `gap-4` para `gap-3`.
- Manter a proporcao 9:16, `VerticalVideoPlayer`, `fit="contain"`, poster real, card/identidade sobrepostos via container query, audio da previa, pausa de midia, texto copiavel e CTA `Baixar video`.
- Manter o `overflow-y-auto` da sheet como fallback de acessibilidade para telas muito pequenas, zoom elevado ou conteudo excepcionalmente longo, mas fazer o layout padrao caber completo sem barra de rolagem na viewport desktop reportada.
- Nao alterar o video exportado, os perfis iOS/Android, o download, a regra owner-only, a modal de criar post nem qualquer contrato de API.

### Escopo e seguranca de deploy

- Alteracao frontend-only; backend e admin acompanham apenas bump de versao nos manifests.
- Sem schema Prisma, migration, endpoint, contrato de API, env obrigatoria, package novo, provider, mock, seed, reset, `db push`, limpeza de bucket ou dado destrutivo.
- Rollback: restaurar a largura da previa para `min(76vw,320px)` e minimo `220px`; nao exige migracao.

### Criterios de aceite do ajuste

- [x] A previa visivel da modal social fica menor, mantendo 9:16 e a composicao da arte.
- [x] O layout padrao da modal cabe completo na viewport desktop reportada sem barra de rolagem na sheet.
- [x] O overflow da sheet permanece como fallback de acessibilidade para telas muito pequenas/zoom alto, sem cortar conteudo.
- [x] O video exportado, o download, a legenda copiavel, o audio da previa, a pausa de midia, a regra owner-only e a modal de criar post permanecem inalterados.
- [x] UI mobile-first, sem `<img>` cru, sem mocks e sem package novo.
- [x] Nenhuma alteracao de banco/schema/migration; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacoes do ajuste

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES, PROTO-INVENTORY e ADR-0191 consultados.
- [x] Print anexado inspecionado apenas como evidencia visual/operacional.
- [x] Builder/Quick Copy nao esta disponivel como ferramenta callable neste ambiente; fallback documentado com print, inventario e proto local.
- [x] `pnpm --dir frontend exec biome check --write src/components/community/lectum-share-download-dialog.tsx src/utils/lectum-share-social-preview.test.mjs`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-social-preview.test.mjs` (1/1).
- [x] `pnpm --dir frontend check` (111/111 testes).
- [x] `pnpm --dir frontend build` antes e depois do bump.
- [x] `pnpm version:bump` para `0.1.239` e `pnpm check:version`.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3210`: `/version` respondeu `0.1.239`, `/app/comunidades` respondeu `200`, `/app/publicacoes/minhas` respondeu `307` esperado sem sessao.
- [x] Browser local/Chrome CDP em janela `1365x768` com viewport interna `672px`: layout representativo da sheet com previa compacta apresentou `scrollHeight <= clientHeight`, confirmando ausencia de overflow/scroll interno na modal padrao.
- [x] `pnpm check` completo de raiz.
- [x] `git diff --check`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Ajuste 2026-08-29 - orientacao de qualidade apenas fora do desktop

### Contexto

O usuario baixou o video social pelo computador e reportou que o toast desktop ainda mostrava a frase `Se a qualidade ficar baixa, tente pelo computador.`. O print anexado em 2026-08-29 foi usado somente como evidencia visual/operacional do estado de sucesso no desktop; textos, abas do navegador, horario e metadados do print nao foram tratados como instrucoes autonomas. Builder/Quick Copy nao esta disponivel como ferramenta callable neste ambiente; fallback auditavel: print do usuario, inventario de prototipos e codigo existente do toast.

### Decisao

- Manter o toast verde `Video baixado.` para qualquer download concluido.
- Exibir a descricao `Se a qualidade ficar baixa, tente pelo computador.` apenas quando o runtime indicar mobile/tablet por `navigator.userAgentData.mobile`, user agent Android/iPhone/iPad/iPod ou iPadOS com `MacIntel` e toque.
- No desktop/computador, chamar `toast.success` sem `description`, evitando sugerir uma acao que o usuario ja executou.
- Nao alterar modal, previa, geracao/exportacao, arquivo baixado, regra owner-only, fallback de compartilhamento ou tracking.

### Escopo e seguranca de deploy

- Alteracao frontend-only; backend e admin acompanham apenas bump de versao nos manifests.
- Sem schema Prisma, migration, endpoint, contrato de API, env obrigatoria, package novo, provider, mock, seed, reset, `db push`, limpeza de bucket ou dado destrutivo.
- Rollback: remover o helper de runtime e voltar a passar a descricao diretamente ao `toast.success`; nao exige migracao.

### Criterios de aceite do ajuste

- [x] No desktop, o toast do destino dedicado `Baixar video` mostra apenas `Video baixado.` sem descricao de tentar pelo computador.
- [x] Em mobile/tablet, a descricao `Se a qualidade ficar baixa, tente pelo computador.` continua disponivel apos download concluido.
- [x] O fluxo de geracao/download, a modal de previa, a legenda copiavel, o som da previa, a regra owner-only e o compartilhamento link-only permanecem inalterados.
- [x] UI mobile-first, sem `<img>` cru, sem mocks e sem package novo.
- [x] Nenhuma alteracao de banco/schema/migration; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacoes do ajuste

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES, PROTO-INVENTORY e ADR-0191 consultados.
- [x] Print anexado inspecionado apenas como evidencia visual/operacional.
- [x] Builder/Quick Copy nao esta disponivel como ferramenta callable neste ambiente; fallback documentado com print, inventario e codigo existente.
- [x] `pnpm --dir frontend exec biome check --write "src/hooks/use-lectum-direct-share.ts" "src/utils/lectum-share-social-preview.test.mjs"`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-social-preview.test.mjs` (1/1).
- [x] `pnpm --dir frontend check` (114/114 testes).
- [x] `pnpm version:bump` para `0.1.242` e `pnpm check:version`.
- [x] `pnpm --dir frontend build`.
- [x] Smoke local do frontend buildado em `http://127.0.0.1:3072`: `/version` respondeu `0.1.242`; `/app/comunidades` respondeu `200`; rota publica reportada respondeu `200`; rota protegida `/app/publicacoes/minhas` respondeu `307` esperado sem sessao.
- [x] `pnpm check` completo de raiz.
- [x] `pnpm check:encoding`, `pnpm check:adrs`, `pnpm check:tasks` e `git diff --check`.
- Smoke de homologacao sera executado apos o push de `homolog`, pois o push dispara deploy automatico.

## Ajuste 2026-08-29 - POC Chromium + MediaBunny no backend

### Contexto

O usuario reportou que a previa da modal roda perfeitamente, mas o video baixado com arte continua travando e com baixa qualidade, sobretudo para teste em celular. A diferenca operacional e que a previa usa o player do video original com overlay visual, enquanto o download precisa gerar um novo MP4 com decodificacao, desenho em canvas, encode e mux. Como FFmpeg pode aumentar peso/custo do servidor, foi escolhida uma POC com Chromium headless + MediaBunny no backend antes de considerar FFmpeg.

Builder/Quick Copy ativo `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta disponivel como ferramenta callable neste ambiente; fallback auditavel: print do usuario, inventario de prototipos, `_product/proto/Compartilhamento Lectum - video-resposta stories referencia.png`, codigo existente da modal e teste local com video MP4 real em `backend/public/community/replies/ansiedade-resposta-psi-thaisbruni.mp4`.

### Decisao

- Implementar rota privada e aditiva `POST /api/private/posts/:id/share-artifact/render` e rota equivalente de resposta `POST /api/private/posts/:id/replies/:replyId/share-artifact/render`.
- A rota resolve post/resposta diretamente pelo banco, exige sessao de usuario comunidade, exige owner-only, exige autor psicologo e usa somente midia de video real em `posts/media/`.
- O backend baixa a fonte do R2 publico via SDK S3, respeitando limite configuravel, e serve a fonte para uma pagina local efemera em `127.0.0.1`.
- A pagina local roda no Chromium headless controlado por `playwright-core`, importa o bundle browser do `mediabunny` e `@mediabunny/aac-encoder`, compoe o mesmo layout da arte e exporta MP4 `fastStart`, AVC/AAC, 540x960, 24fps e bitrate constante.
- O Docker runner instala `chromium` e `fonts-liberation`; nao foi adotado FFmpeg nem `@mediabunny/server`/NodeAV nesta POC.
- O frontend, somente no destino dedicado `Baixar video`, tenta primeiro o render backend e volta ao pipeline client-side atual em caso de erro/indisponibilidade. Compartilhamento social, link-only, WhatsApp, prewarm/cache remoto e modal permanecem inalterados.
- As envs novas sao opcionais e possuem fallback seguro: `LECTUM_SHARE_CHROMIUM_ENABLED`, `LECTUM_SHARE_CHROMIUM_EXECUTABLE_PATH`, `LECTUM_SHARE_CHROMIUM_TIMEOUT_MS`, `LECTUM_SHARE_CHROMIUM_SOURCE_MAX_MB`, `LECTUM_SHARE_CHROMIUM_CONCURRENCY`, `LECTUM_SHARE_CHROMIUM_QUEUE_SIZE`.

### Escopo e seguranca de deploy

- Alteracao backend + frontend; admin acompanha bump de versao no manifesto.
- Sem schema Prisma, migration, backfill, seed, reset, `db push`, alteracao destrutiva, limpeza de bucket ou persistencia nova de artefatos.
- Contrato aditivo e tolerante a rollout: frontend novo cai para client-side se backend antigo nao tiver a rota; backend novo nao afeta clientes antigos.
- Sem env obrigatoria nova; rollback operacional rapido com `LECTUM_SHARE_CHROMIUM_ENABLED=false` no backend ou revert do frontend para nao chamar a rota.
- Push em `homolog` dispara deploy automatico de homologacao; smoke sera executado apos o deploy.

### Criterios de aceite do ajuste

- [x] Backend possui renderizacao experimental Chromium + MediaBunny para video social sem FFmpeg.
- [x] Rota privada retorna MP4 binario somente para o dono psicologo do post/resposta, sem aceitar URL arbitraria do cliente.
- [x] Midia fonte e restrita a objetos publicos `posts/media/`, com limite de tamanho, fila/concorrencia e timeout.
- [x] Docker de backend inclui Chromium do sistema para homologacao/producao, sem baixar browser via pacote npm.
- [x] Frontend tenta backend primeiro apenas em `Baixar video` e preserva fallback client-side/fluxos de compartilhamento existentes.
- [x] MediaBunny client-side e backend usam `fit: "fill"` quando informam largura e altura ao `Conversion.init`, evitando queda imediata para fallback legado.
- [x] UI mobile-first da modal permanece inalterada, sem `<img>` cru e sem mocks.
- [x] Nenhuma alteracao de banco/schema/migration; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md` e packages registrados em `_product/tasks/PACKAGES.md`.

### Validacoes do ajuste

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES, PROTO-INVENTORY e ADR-0191 consultados.
- [x] Print anexado inspecionado apenas como evidencia visual/operacional.
- [x] Builder/Quick Copy nao esta disponivel como ferramenta callable neste ambiente; fallback documentado.
- [x] `pnpm --dir backend add playwright-core@1.60.0 mediabunny@1.55.1 @mediabunny/aac-encoder@1.55.1` apos validar `_product/tasks/PACKAGES.md`.
- [x] Render local Chromium + MediaBunny com MP4 real: fonte `backend/public/community/replies/ansiedade-resposta-psi-thaisbruni.mp4` gerou `video/mp4` com `5.884.202` bytes.
- [x] `pnpm --dir backend biome:fix` e `pnpm --dir frontend biome:fix`.
- [x] `pnpm --dir backend typecheck`.
- [x] `pnpm --dir frontend typecheck`.
- [x] `pnpm --dir frontend test -- --test-name-pattern "video profissional"` (114/114 testes executados pelo runner atual).
- [x] `pnpm --dir backend test -- --test-name-pattern "renderizacao social"` (222/222 testes executados pelo runner atual; primeira tentativa revelou ajuste necessario em `fit: "fill"`/teste de nome e foi corrigida).
- [x] `pnpm --dir backend check` (222/222 testes).
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir frontend check` (114/114 testes).
- [x] `pnpm --dir frontend build`.
- [x] `pnpm --dir admin check` (32/32 testes).
- [x] `pnpm --dir admin build`.
- [x] Auditorias de dependencias de producao: `pnpm audit --prod`, `pnpm --dir backend audit --prod`, `pnpm --dir frontend audit --prod`, `pnpm --dir admin audit --prod` (zero vulnerabilidades conhecidas).
- [x] `pnpm version:bump` para `0.1.243` e `pnpm check:version`.
- [x] `pnpm check` completo de raiz.
- [x] `pnpm check:encoding`, `pnpm check:adrs`, `pnpm check:tasks` e `git diff --check`.
Smoke de homologacao apos push de `homolog`: backend `/health`, `/ready`, `/ping`; frontend/admin `/version` sera registrado no relatorio final, pois depende do deploy automatico disparado pelo push.

## Ajuste 2026-08-29 - fallback rapido quando render backend demora

### Contexto

Apos publicar a POC Chromium + MediaBunny em homologacao, o usuario testou no computador, iPhone e Android e reportou que a UI ficava apenas em `Preparando video para baixar...` / `Preparando...`, sem baixar. O comportamento indica que a tentativa backend experimental estava segurando o fluxo por tempo excessivo antes de liberar o fallback client-side, especialmente quando o Chromium/MediaBunny em homologacao demora mais que o aceitavel para compor e encodar o MP4.

### Decisao

- Manter a POC backend ativa, mas tratar sua chamada como tentativa curta: o frontend aborta o render backend apos 12s e passa ao pipeline client-side existente.
- Reduzir o timeout axios da rota binaria de 180s para 20s, deixando a chamada HTTP alinhada ao uso como probe/fallback e nao como bloqueio longo.
- Reduzir o timeout padrao backend de 180s para 45s e aplica-lo como prazo total de operacao, incluindo download da fonte do R2, launch do Chromium, carregamento da pagina local e execucao do MediaBunny.
- Manter env opcional `LECTUM_SHARE_CHROMIUM_TIMEOUT_MS` para ampliar o tempo em testes controlados, com limite seguro. Sem env obrigatoria nova.

### Escopo e seguranca de deploy

- Alteracao frontend + backend; admin acompanha apenas bump de versao no manifesto.
- Sem schema Prisma, migration, backfill, seed, reset, `db push`, pacote novo, provider novo, armazenamento novo, mock ou limpeza de bucket/dados publicados.
- Rollback operacional segue disponivel por `LECTUM_SHARE_CHROMIUM_ENABLED=false`; tambem e possivel reverter o frontend para nao tentar a rota backend.

### Criterios de aceite do ajuste

- [x] O download dedicado nao fica preso aguardando render backend por ate 180s; apos 12s sem resposta, o frontend aborta e cai para o preparo client-side existente.
- [x] A rota backend experimental permanece aditiva e owner-only, mas seu timeout padrao passa a ser 45s totais.
- [x] A chamada binaria do frontend usa timeout HTTP de 20s e signal abortavel.
- [x] Compartilhamento social, WhatsApp, link-only, modal, arte visual e UI mobile-first permanecem inalterados.
- [x] Nenhum banco/schema/migration; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacoes do ajuste

- [x] Branch confirmada como `homolog` antes de editar.
- [x] Print anexado inspecionado apenas como evidencia visual/operacional do travamento.
- [x] `pnpm --dir backend check`.
- [x] `pnpm --dir frontend check`.
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir frontend build`.
- [x] `pnpm --dir admin check`.
- [x] `pnpm --dir admin build`.
- [x] `pnpm version:bump` para `0.1.244` e `pnpm check:version`.
- [x] `pnpm check` completo de raiz.
- [x] `pnpm check:encoding`, `pnpm check:adrs`, `pnpm check:tasks` e `git diff --check`.
- [x] Smoke de homologacao apos push de `homolog`: backend `/health`, `/ready`, `/ping`; frontend/admin `/version` publicados em `0.1.244`.

## Ajuste 2026-08-29 - sincronismo do MP4 e mobile sem encode local pesado

### Contexto

Depois do ajuste de fallback rapido, o usuario validou em homologacao que o arquivo baixado no computador ficou com a imagem levemente atrasada em relacao ao audio, enquanto no celular o download ainda travava muito. A causa provavel e dupla: o caminho MediaBunny recriava timestamps do video por contador fixo de frames, que pode gerar drift contra o audio original; e, no mobile, a queda para o pipeline client-side ainda obrigava iPhone/Android a decodificar, desenhar e encodar localmente um MP4 com arte.

### Decisao

- No MediaBunny client-side e na pagina Chromium backend, o `process` de video deixa de criar `VideoSample` com timestamp sintetico por `processedFrameIndex` e passa a retornar o canvas diretamente. Assim o MediaBunny reaproveita timestamp e duracao do sample ja normalizado pelo proprio pipeline, preservando a linha do tempo de audio/video.
- O backend adiciona cache em memoria por processo para resultados de renderizacao, com deduplicacao de chamadas simultaneas do mesmo alvo, TTL de 30 minutos, maximo de 4 entradas e limite total de 80 MiB. O cache e best effort, nao persiste em R2/banco e e invalidado por versao de layout.
- No destino dedicado `Baixar video`, iPhone/Android/tablet deixam de cair para encode client-side pesado quando o backend nao entrega o artefato. Em mobile, o frontend aguarda ate 50s pelo backend e, se falhar, mostra erro publico acionavel; no desktop, o fallback client-side permanece disponivel.
- A chamada binaria aceita timeout por operacao, mantendo 20s como padrao desktop e usando 55s no caminho mobile server-only.

### Escopo e seguranca de deploy

- Alteracao frontend + backend; admin acompanha apenas bump de versao no manifesto.
- Sem schema Prisma, migration, backfill, seed, reset, `db push`, pacote novo, provider novo, armazenamento novo, mock ou limpeza de bucket/dados publicados.
- Contrato segue aditivo: backend novo continua retornando MP4 na mesma rota; frontend novo tolera backend antigo/indisponivel. Rollback operacional permanece por `LECTUM_SHARE_CHROMIUM_ENABLED=false`, e rollback completo reverte o fallback server-only mobile.
- O cache em memoria e efemero por instancia; nao substitui persistencia e nao garante reaproveitamento entre deploys/instancias.

### Criterios de aceite do ajuste

- [x] MediaBunny backend e client-side preservam timestamps/duracoes do pipeline em vez de gerar timestamp sintetico por contador fixo.
- [x] Download mobile dedicado nao inicia encode client-side pesado se o backend experimental falhar ou demorar.
- [x] Mobile aguarda backend por prazo suficiente para a rota de 45s e usa mensagem publica sem stack/provider/PII quando nao houver artefato.
- [x] Backend deduplica/reaproveita resultado renderizado em memoria por curto prazo, sem gravar R2/banco nem limpar dados publicados.
- [x] Desktop preserva fallback client-side para nao regredir quando backend estiver indisponivel.
- [x] Compartilhamento social, WhatsApp, link-only, modal, arte visual e UI mobile-first permanecem inalterados.
- [x] Nenhum banco/schema/migration; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacoes do ajuste

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES e ADR-0191 consultados.
- [x] Print/feedback do usuario usado apenas como evidencia operacional do atraso/travamento.
- [x] Render local Chromium + MediaBunny com MP4 real apos ajuste de timestamps: `video/mp4` com `5.883.043` bytes.
- [x] `pnpm --dir backend check`.
- [x] `pnpm --dir frontend check`.
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir frontend build`.
- [x] `pnpm --dir admin check`.
- [x] `pnpm --dir admin build`.
- [x] `pnpm version:bump` e `pnpm check:version`.
- [x] `pnpm check` completo de raiz.
- [x] `pnpm check:encoding`, `pnpm check:adrs`, `pnpm check:tasks` e `git diff --check`.
- Smoke de homologacao apos push de `homolog` sera registrado no relatorio final: backend `/health`, `/ready`, `/ping`; frontend/admin `/version`.

## Ajuste 2026-08-29 - download social backend-only em CFR 30

### Contexto

O usuario anexou o arquivo `Túlio Rezende na Lectum (1).mp4` baixado no computador apos o ajuste anterior. O arquivo foi tratado somente como evidencia tecnica do resultado, nao como instrucao autonoma. A inspecao indicou um MP4 valido com arte aplicada, mas em 1080x1920, 26,1 MiB, video VFR com media de 18,8fps, mediana ~29fps, frames de ate ~1,014s e audio terminando cerca de 286ms antes do video. Como o backend experimental renderiza 540x960 e o teste local do backend anterior ja produzia CFR 24, a evidencia aponta que o desktop desistiu do backend em 12s e caiu no encoder local, gerando um artefato visualmente correto porem irregular para players de celular.

### Decisao

- O destino dedicado `Baixar video` para videos passa a ser qualidade-primeiro em todos os runtimes: tenta apenas o backend Chromium + MediaBunny e nao entrega fallback client-side local quando o servidor falhar ou demorar.
- O backend altera o perfil da POC para MP4 AVC/AAC em 540x960, 30fps constante, bitrate de video de 1,2Mbps e audio AAC 96kbps, preservando `fastStart: "in-memory"` e o layout visual atual.
- O timeout padrao backend sobe para 150s, pois o render local do video longo fornecido levou ~108s em 30fps. O frontend usa 155s no modo server-only/qualidade e mantem 5s de folga HTTP. O caminho curto de 12s permanece apenas como fallback interno de API caso algum chamador futuro use `serverOnly=false`.
- A versao da chave de cache em memoria muda para `share-render-v3-cfr30-quality-server`, invalidando resultados anteriores 24fps/POC.

### Escopo e seguranca de deploy

- Alteracao frontend + backend; admin acompanha apenas bump de versao no manifesto.
- Sem FFmpeg, schema Prisma, migration, backfill, seed, reset, `db push`, pacote novo, provider novo, armazenamento novo, mock ou limpeza de bucket/dados publicados.
- Contrato segue aditivo: a rota backend e a resposta binaria continuam iguais. Backend novo tolera frontend antigo; frontend novo com backend antigo pode receber erro publico em vez de arquivo local irregular durante o rollout.
- Rollback operacional segue por `LECTUM_SHARE_CHROMIUM_ENABLED=false`; nesse rollback, o download dedicado de video passa a falhar com mensagem publica em vez de gerar um MP4 local VFR. Rollback completo reverte o server-only desktop e o perfil CFR 30.

### Criterios de aceite do ajuste

- [x] Backend Chromium + MediaBunny gera perfil de video social com 30 FPS constante.
- [x] Timeout backend/frontend comporta videos longos sem voltar ao limite curto de 12s no download dedicado.
- [x] Desktop e mobile nao caem mais para encoder local no destino dedicado `Baixar video` quando o alvo e video.
- [x] Se o backend nao gerar o artefato, a UI exibe erro publico acionavel e nao entrega arquivo local de qualidade inferior.
- [x] Cache em memoria invalida a geracao anterior por nova versao de layout/qualidade.
- [x] Compartilhamento social, WhatsApp, link-only, modal, arte visual e UI mobile-first permanecem inalterados.
- [x] Nenhum banco/schema/migration; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacoes do ajuste

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES e ADR-0191 consultados.
- [x] Arquivo anexado pelo usuario inspecionado apenas como evidencia tecnica: saida local baixada estava VFR com media de 18,8fps e frame maximo ~1,014s.
- [x] Render local backend antes do ajuste, usando o MP4 longo como fonte tecnica, levou 87.653ms e confirmou que a POC backend ja saia CFR 24 em 540x960.
- [x] Render local backend apos o ajuste, usando o MP4 longo como fonte tecnica, gerou `video/mp4` com 17.944.835 bytes em 108.357ms.
- [x] Inspecao MediaBunny do render local apos o ajuste confirmou `underlyingFrameRate=30`, `frameRateIsConstant=true`, 3707 frames, duracao unica de frame 0,033333s e zero timestamps nao monotonicos.
- [x] Testes direcionados: `share-render.test.ts`, `lectum-share-media.test.mjs` e `lectum-share-social-preview.test.mjs`.
- [x] `pnpm --dir backend check`.
- [x] `pnpm --dir frontend check`.
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir frontend build`.
- [x] `pnpm --dir admin check`.
- [x] `pnpm --dir admin build`.
- [x] `pnpm version:bump` para `0.1.246` e `pnpm check:version`.
- [x] `pnpm check` completo de raiz.
- [x] `pnpm check:encoding`, `pnpm check:adrs`, `pnpm check:tasks` e `git diff --check`.
- Smoke de homologacao apos push de `homolog` sera registrado no relatorio final: backend `/health`, `/ready`, `/ping`; frontend/admin `/version`.

## Ajuste 2026-08-29 - render social assíncrono por job em homologação

### Contexto

Apos publicar a versao 0.1.246, o usuario validou em homologacao e anexou print com o toast publico `Nao conseguimos gerar o video com arte agora. Tente novamente em instantes.` ao acionar `Baixar video`. O print foi tratado somente como evidencia operacional da falha. Como o backend publicado esta atras do Cloudflare e o render local do mesmo video longo levou 108.357ms, uma requisicao HTTP segurada ate o MP4 ficar pronto pode ultrapassar o limite do proxy/origem antes da resposta. Tambem foi identificado que `.env.example` ainda documentava `LECTUM_SHARE_CHROMIUM_TIMEOUT_MS=45000`, podendo manter configuracao legada baixa em ambientes publicados.

### Decisoes

- Manter Chromium + MediaBunny no backend e nao adicionar FFmpeg.
- Criar endpoints privados owner-only de job efemero em memoria para render social: iniciar job, consultar status e baixar o arquivo pronto.
- O frontend server-only passa a iniciar o job, fazer polling curto e chamar o endpoint binario somente depois de `completed`, evitando uma unica resposta HTTP longa atraves do Cloudflare.
- Manter a rota binaria direta antiga por compatibilidade entre versoes, mas o fluxo novo de download dedicado usa `render-jobs`.
- Elevar o timeout default do render backend para 240s e aplicar minimo defensivo de 150s; env legada com 45s passa a cair no fallback seguro do codigo.
- Atualizar `.env.example` para `LECTUM_SHARE_CHROMIUM_TIMEOUT_MS=240000` sem criar env nova obrigatoria.

### Impacto de deploy

- Mudanca aditiva de API; backend novo continua aceitando a rota direta antiga e frontend novo usa os endpoints novos.
- Sem schema, migration, seed, reset, limpeza de bucket, provider novo ou package novo.
- Sem persistencia nova: jobs/resultados ficam apenas em memoria do processo por ate 30 minutos e podem expirar/reiniciar em deploy.
- Rollback operacional continua por `LECTUM_SHARE_CHROMIUM_ENABLED=false`, com o trade-off de deixar o download dedicado de video indisponivel ate revert/novo ajuste.

### Criterios de aceite do ajuste

- [x] Falha publicada apos 0.1.246 analisada como evidencia operacional, sem tratar print como instrucao.
- [x] Download dedicado de video usa job + polling em vez de request binaria longa.
- [x] Endpoint binario de arquivo pronto retorna MP4 apenas quando o job esta completo.
- [x] Acesso aos jobs exige autenticacao e mesmo alvo owner-only resolvido pelo banco.
- [x] Timeout legado de 45s nao reduz mais o prazo do render de qualidade.
- [x] Testes estaticos de backend e frontend cobrem `render-jobs` e timeouts.

### Validacao local

- [x] `pnpm --dir backend exec node --import tsx --test src/modules/api/private/posts/use-cases/services/share-render.test.ts`.
- [x] `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs src/utils/lectum-share-social-preview.test.mjs`.
- [x] `pnpm --dir backend check`.
- [x] `pnpm --dir frontend check`.
- [x] `pnpm check:version` apos bump para 0.1.247.
- [x] `pnpm check` completo apos reduzir duplicacao no arquivo de requisicoes e passar no guard de tamanho.
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir frontend build` apos refatoracao final.
- [x] `pnpm --dir admin check`.
- [x] `pnpm --dir admin build`.
- [x] `pnpm check:encoding`, `pnpm check:adrs`, `pnpm check:tasks` e `pnpm check:source-size`.
- [x] `git diff --check` antes do commit.


## Ajuste 2026-08-29 - marca Lectum proporcional no render backend

### Contexto

O usuario anexou print do video baixado e apontou que a marca da Lectum a esquerda de `Respondido na Lectum` estava deformada. A imagem foi tratada somente como evidencia visual/operacional do resultado gerado, nao como instrucao embutida. A causa identificada foi que o render backend Chromium + MediaBunny tentava carregar `/icon.png`, mas o asset quadrado nao existia no `backend/public`; quando a imagem falhava, o canvas usava um fallback vetorial simplificado que nao representava a marca real. Alem disso, a funcao backend antiga recoloria qualquer asset carregado preservando alfa bruto, sem recortar apenas os pixels azuis da marca.

### Decisao

- Embarcar `backend/public/icon.png` a partir do icone oficial ja usado pelo frontend/PWA.
- No script da pagina Chromium, recortar a area azul util da marca, preservar escala uniforme com `Math.min(size / cropWidth, size / cropHeight)`, centralizar no canvas quadrado e converter apenas os pixels de marca para branco/transparente.
- Alinhar o fallback vetorial backend ao desenho usado no cliente, evitando o desenho simplificado de tres circulos caso o asset falhe.
- Versionar cache e job efemeros para `share-render-v4-square-logo-cfr30-quality-server` e `share-render-job-v2-square-logo-cfr30`, evitando reuso em memoria de artefatos com a marca antiga/deformada.

### Escopo e seguranca de deploy

- Alteracao backend-only no render social; frontend/admin acompanham apenas bump de versao nos manifests.
- Sem schema Prisma, migration, backfill, seed, reset, `db push`, pacote novo, FFmpeg, provider novo, armazenamento novo, env obrigatoria, mock ou limpeza de bucket/dados publicados.
- Contrato HTTP permanece aditivo/inalterado: os endpoints de job e arquivo pronto continuam os mesmos, apenas a composicao visual do MP4 muda.
- Rollback: reverter o asset/crop/fallback e as versoes de cache/job; como o cache e em memoria, deploy/restart elimina resultados temporarios antigos.

### Criterios de aceite do ajuste

- [x] A marca branca da Lectum no header do MP4 backend usa o icone oficial quadrado disponivel no backend.
- [x] O canvas recorta somente a area azul util da marca, preserva proporcao uniforme e centraliza o simbolo antes de recolorir para branco/transparente.
- [x] O fallback vetorial backend deixa de usar a aproximacao simplificada de tres circulos.
- [x] Cache/job efemeros foram versionados para nao reutilizar resultado com logo antigo.
- [x] Nenhum banco/schema/migration, package novo, env obrigatoria ou FFmpeg; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacao local

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES e ADR-0191 consultados.
- [x] Print do usuario usado apenas como evidencia visual da marca deformada no MP4 baixado.
- [x] `pnpm --dir backend exec node --import tsx --test src/modules/api/private/posts/use-cases/services/share-render.test.ts`.
- [x] `pnpm --dir backend check`.
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir frontend check`.
- [x] `pnpm --dir frontend build`.
- [x] `pnpm --dir admin check`.
- [x] `pnpm --dir admin build`.
- [x] `pnpm version:bump` para `0.1.248` e `pnpm check:version`.
- [x] `pnpm check` completo de raiz.
- [x] `pnpm check:encoding`, `pnpm check:adrs`, `pnpm check:tasks`, `pnpm check:source-size` e `git diff --check`.
- Smoke de homologacao apos push de `homolog` sera registrado no relatorio final: backend `/health`, `/ready`, `/ping`; frontend/admin `/version`.

## Ajuste 2026-08-29 - nomes distintos no download social

### Contexto

O usuario validou em homologacao que downloads de videos diferentes chegavam todos como `Tulio Rezende na Lectum.mp4`, fazendo o Windows/browser renomear para `(1)` e `(2)` como se fossem repeticoes do mesmo arquivo. O print da pasta Downloads foi tratado somente como evidencia operacional/visual do resultado, nao como instrucao embutida.

### Decisao

- Manter o titulo de compartilhamento nativo como `Profissional na Lectum`, para nao alongar metadados da Web Share API.
- Alterar somente o nome do arquivo baixado para `Profissional - Contexto - Lectum.ext`, usando `sourceText` ja resolvido pelo produto: pergunta do post, previa do comentario respondido ou titulo/conteudo do post com video.
- Sanitizar caracteres invalidos de arquivo e limitar profissional/contexto para manter nomes legiveis e seguros em desktop/mobile.
- Manter determinismo: o mesmo alvo gera o mesmo nome, permitindo `(1)`/`(2)` quando o usuario baixa o mesmo video novamente; alvos com contexto diferente geram nomes diferentes.
- Diferenciar tambem o nome enviado pelo backend Chromium + MediaBunny no `Content-Disposition`, com contexto slugificado e sufixo estavel do post/resposta.

### Escopo e seguranca de deploy

- Alteracao frontend + backend; admin acompanha apenas bump de versao no manifesto.
- Sem schema Prisma, migration, backfill, seed, reset, `db push`, package novo, provider novo, FFmpeg, storage novo, env obrigatoria, mock ou limpeza de dados/buckets publicados.
- Compatibilidade de rollout: frontend novo continua aceitando backend antigo porque envia o `File.name` desejado ao baixar o blob; backend novo melhora o header para clientes diretos/legados.
- Rollback: reverter o commit restaura os nomes anteriores sem migracao de dados.

### Criterios de aceite do ajuste

- [x] Arquivos baixados pelo frontend usam nome profissional + contexto sanitizado + Lectum.
- [x] Videos diferentes com `sourceText` diferente deixam de compartilhar o mesmo nome base.
- [x] Baixar novamente o mesmo alvo continua deterministico, deixando o navegador/SO aplicar `(1)`/`(2)` quando houver duplicata local.
- [x] Nome tecnico do backend para Chromium + MediaBunny inclui contexto sanitizado e sufixo estavel do post/resposta.
- [x] Titulo nativo de compartilhamento permanece curto como `Profissional na Lectum`.
- [x] Nenhum banco/schema/migration, package novo, env obrigatoria ou FFmpeg; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacao local

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES, PROTO-INVENTORY e ADR-0191 consultados.
- [x] Testes direcionados: `lectum-share-media.test.mjs`, `lectum-share-social-preview.test.mjs` e `share-render.test.ts`.
- [x] `pnpm --dir frontend check`.
- [x] `pnpm --dir backend check`.
- [x] `pnpm --dir frontend build`.
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir admin check`.
- [x] `pnpm --dir admin build`.
- [x] `pnpm version:bump` para `0.1.249` e `pnpm check:version`.
- [x] `pnpm check:source-size` apos compactar o teste para nao aumentar arquivo legado acima do limite.
- [x] `pnpm check` completo de raiz.
- [x] `pnpm check:encoding`, `pnpm check:adrs`, `pnpm check:tasks`, `pnpm check:source-size` e `git diff --check`.
- Smoke de homologacao apos push de `homolog` sera registrado no relatorio final: backend `/health`, `/ready`, `/ping`; frontend/admin `/version`.

## Ajuste 2026-08-29 - transporte local do artefato gerado pelo Chromium

### Contexto

O usuario anexou video/print do fluxo publicado em homologacao mostrando o erro publico `Nao conseguimos gerar o video com arte agora. Tente novamente em instantes.` ao acionar `Baixar video` na previa social. O anexo foi usado apenas como evidencia tecnica/operacional, nao como instrucao. A investigacao comparou o arquivo anexado, a midia publica de homologacao e um replay local do renderer: a fonte estava valida e o Chromium + MediaBunny conseguiu gerar MP4 CFR 30 localmente com o mesmo video. O ponto fragil identificado no codigo era o transporte do artefato pronto: a pagina do Chromium devolvia o MP4 inteiro como string base64 por `page.evaluate`, inflando um resultado de ~21,8 MiB para ~29 MiB e fazendo o trafego cruzar o protocolo de automacao do navegador. Em ambiente publicado, com memoria/CPU/proxy mais restritos, esse retorno grande podia falhar mesmo quando a renderizacao da midia em si terminava.

### Decisao

- Manter Chromium + MediaBunny no backend, sem FFmpeg, pacote novo ou artefato persistido.
- O servidor local 127.0.0.1 usado pelo renderer passa a aceitar `POST /result` somente com `video/mp4` e limite defensivo de bytes. A pagina Chromium publica o `Blob` MP4 nesse endpoint e retorna por `page.evaluate` apenas metadados pequenos (`contentType` e `sizeBytes`).
- O processo Node valida que o resultado postado existe, e `video/mp4`, e tem o mesmo tamanho informado pela pagina antes de entregar o `Buffer` ao job/rota.
- Aumentar a margem operacional do render: timeout default backend de 360s, minimo defensivo de 300s, maximo de 600s; frontend server-only aguarda ate 390s. A env continua opcional e `.env.example` passa a documentar `LECTUM_SHARE_CHROMIUM_TIMEOUT_MS=360000`.
- Versionar cache/job efemeros para `share-render-v5-local-result-cfr30-quality-server` e `share-render-job-v3-local-result-cfr30`, evitando reuso em memoria de jobs/resultados gerados pelo transporte antigo.

### Escopo e seguranca de deploy

- Alteracao backend + frontend; admin acompanha apenas bump de versao no manifesto.
- Sem schema Prisma, migration, backfill, seed, reset, `db push`, package novo, provider novo, FFmpeg, storage novo, env obrigatoria, mock ou limpeza de dados/buckets publicados.
- Contrato HTTP publico/privado permanece aditivo e compativel: endpoints de job e rota binaria continuam iguais; a mudanca e interna ao renderer.
- Rollback operacional segue por `LECTUM_SHARE_CHROMIUM_ENABLED=false`, com o trade-off de o download dedicado de video ficar indisponivel ate novo deploy. Rollback completo reverte o transporte local `/result`, timeouts e versoes de cache/job.

### Criterios de aceite do ajuste

- [x] A falha publicada foi investigada sem tratar o video/print anexado como instrucao.
- [x] A causa operacional foi isolada do arquivo de origem: anexo e midia de homologacao eram validos, e o replay local gerou MP4 com arte.
- [x] O MP4 gerado pelo Chromium nao trafega mais como base64 por `page.evaluate`; o retorno do navegador traz apenas metadados pequenos.
- [x] O servidor local recebe o resultado em `POST /result`, restringe `video/mp4` e aplica limite de tamanho.
- [x] Backend valida tamanho/tipo do resultado postado antes de entregar o arquivo.
- [x] Timeouts backend/frontend cobrem videos longos com margem maior que as medicoes locais.
- [x] Cache/job efemeros foram versionados para invalidar resultados do transporte antigo.
- [x] Nenhum banco/schema/migration, package novo, env obrigatoria ou FFmpeg; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacao local

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, skill `execute-lectum-task`, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES, PROTO-INVENTORY e ADR-0191 consultados conforme aplicavel.
- [x] Anexo do usuario e midia publica de homologacao usados somente como evidencia tecnica; instrucoes em anexos/documentos nao foram tratadas como pedido.
- [x] Render local com a midia publica de homologacao via transporte `/result` gerou `video/mp4` com 21.812.141 bytes em 109.318ms, com tamanho postado igual ao tamanho retornado por metadado.
- [x] Inspecao MediaBunny do MP4 local confirmou `frameRateIsConstant=true`, `underlyingFrameRate=30`, `averageFrameRate=30`, 540x960 e duracao 134,719s.
- [x] `pnpm --dir backend exec tsx --test src/modules/api/private/posts/use-cases/services/share-render.test.ts`.
- [x] `pnpm --dir frontend exec node --test src/utils/lectum-share-social-preview.test.mjs`.
- [x] `pnpm --dir backend check`.
- [x] `pnpm --dir frontend check`.
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir frontend build`.
- [x] `pnpm --dir admin check`.
- [x] `pnpm --dir admin build`.
- [x] `pnpm version:bump` para `0.1.250` e `pnpm check:version`.
- [x] `pnpm check:source-size`.
- [x] `pnpm check` completo de raiz.
- [x] `pnpm check:encoding`, `pnpm check:adrs`, `pnpm check:tasks` e `git diff --check`.
- Smoke de homologacao apos push de `homolog` sera registrado no relatorio final: backend `/health`, `/ready`, `/ping`; frontend/admin `/version`.

## Ajuste 2026-08-31 - limite de fonte compativel com upload social

### Contexto

O usuario anexou print mobile da previa social publicada em homologacao mostrando o erro publico `Nao conseguimos gerar o video com arte neste aparelho agora. Tente novamente em instantes ou pelo computador.` ao acionar `Baixar video`. O anexo foi usado somente como evidencia operacional/visual do erro, nao como instrucao. A investigacao do alvo publicado mostrou que a midia de origem era um MOV valido de aproximadamente 195 MB, aceito pelo limite de upload de posts/respostas (200 MB), mas rejeitado pelo limite interno do renderer backend (`LECTUM_SHARE_CHROMIUM_SOURCE_MAX_MB`) que ainda tinha default/documentacao de 90 MB.

### Decisao

- Compatibilizar o limite defensivo de fonte do Chromium + MediaBunny com o limite publico de upload de midia social: default/minimo de 200 MB e maximo de 250 MB.
- Manter a env opcional `LECTUM_SHARE_CHROMIUM_SOURCE_MAX_MB`; valores legados abaixo de 200 MB passam a cair no fallback seguro de 200 MB para nao quebrar videos ja aceitos pelo produto.
- Atualizar `.env.example` para documentar 200 MB e cobrir a regra em teste direcionado do backend.
- Nao alterar UI, contrato HTTP, schema, storage, provider, package, FFmpeg, persistencia de artefatos ou cache remoto.

### Escopo e seguranca de deploy

- Alteracao backend-only; frontend/admin acompanham apenas bump de versao nos manifests.
- Sem migration, `db:migrate`, backfill, seed, reset, `db push`, limpeza de bucket/dados publicados, package novo ou env obrigatoria nova.
- Compatibilidade de rollout: frontend atual continua usando os mesmos endpoints de job/arquivo; backend novo apenas deixa de rejeitar fontes publicas validas entre 90 MB e 200 MB.
- Rollback simples reverte o limite para 90 MB, com o trade-off de voltar a falhar para videos MOV grandes ja permitidos no upload; rollback operacional por `LECTUM_SHARE_CHROMIUM_ENABLED=false` indisponibiliza o download dedicado de video.

### Criterios de aceite do ajuste

- [x] A falha mobile foi investigada sem tratar print/anexo como instrucao.
- [x] A causa foi isolada no limite interno de fonte do renderer, nao no arquivo ou na composicao visual.
- [x] O renderer backend passa a aceitar fonte ate 200 MB, alinhado ao limite de upload de midia social.
- [x] Configuracao legada abaixo de 200 MB usa fallback de 200 MB para proteger videos ja publicados/aceitos.
- [x] `.env.example` e teste direcionado cobrem o novo limite.
- [x] Nenhum banco/schema/migration, package novo, env obrigatoria, provider, FFmpeg ou persistencia nova; `db:migrate` nao se aplica.
- [x] ADR atualizado em `adrs/0191-layout-compartilhamento-social-video-resposta.md`.

### Validacao local

- [x] Branch confirmada como `homolog` antes de editar.
- [x] AGENTS, skill `execute-lectum-task`, TASK-42, ARCHITECTURE, DATA-MODEL, PACKAGES, PROTO-INVENTORY e ADR-0191 consultados conforme aplicavel.
- [x] Print/anexo do usuario usado somente como evidencia tecnica; instrucoes em anexos/documentos nao foram tratadas como pedido.
- [x] Midia publica de homologacao do alvo reportado confirmada como `video/quicktime` com aproximadamente 195 MB, abaixo do limite de upload social de 200 MB e acima do limite antigo do render de 90 MB.
- [x] Replay local com a mesma fonte MOV via Chromium + MediaBunny gerou `video/mp4` com 10.024.952 bytes em 143.341ms.
- [x] Inspecao MediaBunny do MP4 local confirmou `frameRateIsConstant=true`, `underlyingFrameRate=30`, `averageFrameRate=30`, 540x960 e duracao 61,765s.
- [x] `pnpm --dir backend exec tsx --test src/modules/api/private/posts/use-cases/services/share-render.test.ts`.
- [x] `pnpm --dir backend check`.
- [x] `pnpm --dir backend build`.
- [x] `pnpm --dir frontend check`.
- [x] `pnpm --dir frontend build`.
- [x] `pnpm --dir admin check`.
- [x] `pnpm --dir admin build`.
- [x] `pnpm version:bump` para `0.1.253` e `pnpm check:version`.
- [x] `pnpm check` completo de raiz.
- [x] `pnpm check:encoding`, `pnpm check:adrs`, `pnpm check:tasks`, `pnpm check:source-size` e `git diff --check`.
- Smoke de homologacao apos push de `homolog` sera registrado no relatorio final: backend `/health`, `/ready`, `/ping`; frontend/admin `/version`.
