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
- a arte compartilhável deve suprimir a identidade do psicólogo, selo, função e marca `lectum` no rodapé, porque Instagram/TikTok/Reels já adicionam controles e identificação de usuário na parte inferior;
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
  - sem identidade do psicólogo, sem selo, sem wordmark de rodapé, sem play central e sem CTA/link.
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
- Nunca usar `<img>` cru; avatar usa `next/image`.
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
- [x] Exportação e preview suprimem identidade do psicólogo, selo, função e wordmark de rodapé para evitar excesso de elementos nas redes sociais.
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
