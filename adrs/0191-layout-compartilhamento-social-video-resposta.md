# ADR-0191: Layout social de compartilhamento de video-resposta

## Status

Accepted

## Task relacionada

TASK-42

## Contexto

A Lectum passara a ser tambem uma fonte de criacao de conteudo para psicologos. Videos-resposta feitos na comunidade devem poder ser compartilhados em redes sociais mantendo uma identidade visual padronizada da Lectum, mas sem parecer peca institucional.

As decisoes de produto definidas em 2026-06-30 foram: usar o mesmo botao Share, oferecer somente o formato vertical 9:16, remover play central, nao desenhar CTA/link clicavel, exibir "Perguntaram na Lectum", usar titulo do post ou previa do comentario, nao exibir CRP, remover prefixos "Dr./Dra.", mostrar "Psicologa"/"Psicologo" conforme genero conhecido e exibir selo verificado quando o psicologo estiver verificado. O formato quadrado/feed foi removido no mesmo dia apos validacao visual no localhost porque comprimia demais video, pergunta e identidade do psicologo.

## Decisao

- O layout social sera gerado no frontend com APIs nativas do navegador (`canvas`, `MediaRecorder`, `canvas.captureStream`, Web Share API e clipboard), sem package novo.
- O Share existente continua sendo a unica entrada. Para video-resposta profissional, abre um modal Lectum com preview vertical 9:16 unico para Stories/Reels/TikTok/Shorts; para outros casos, mantem o compartilhamento de link existente.
- A arte exportada renderiza video de fundo, card da pergunta/comentario, identificacao do psicologo, selo verificado condicional e wordmark `lectum`, sem play central, sem CTA e sem variante quadrada/feed.
- O backend apenas enriquece os DTOs de `highlighted_professional_reply` com `parent_reply_id` e `parent_content`, permitindo usar a previa do comentario em cards/listagens sem novo endpoint e sem migration.
- O evento real continua sendo persistido via `POST /api/private/posts/:id/replies/:replyId/share` quando houver Web Share API ou fallback com copia de link.
- A duracao exportada e limitada a 60 segundos para reduzir risco de travamento e arquivos excessivos no browser.

## Consequencias

- A solucao fica disponivel sem dependencia externa, fila de renderizacao server-side ou integracao direta com Instagram/TikTok.
- A remocao do quadrado reduz escolha no modal e evita exportacao com composicao espremida.
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
