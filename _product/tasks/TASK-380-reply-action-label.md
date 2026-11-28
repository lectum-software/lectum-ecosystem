# TASK-380 - Responder nas acoes de comentarios

Status: Concluida localmente

## Ajuste de tipografia solicitado apos publicacao
Em 2026-11-28, usuario pediu Responder com o tamanho do conteudo do comentario.
Usar text-sm e font-normal como o conteudo, em vez de 14px fixos e peso medio.
Preservar linha de 20px, reticencias, cores e ordem das acoes. No mobile, com
raiz de 15px, text-sm corresponde a 13.125px; no desktop, a 14px.
Este ajuste permanece local ate nova autorizacao de publicacao.
Validacao do ajuste: 57 testes passaram, 1 ignorado; build frontend aprovado.
Chrome em 320/390/1440px confirmou igualdade de font-size e font-weight com o
conteudo; reticencias e linha de 20px contida no botao continuam funcionais.

## Escopo
Implementar a previa aprovada: substituir o balao por Responder nas respostas,
com fonte de 14px e cores existentes. Em respostas textuais de psicologos,
ordenar upvote, WhatsApp, Responder. Preservar comentarios do post principal,
contato de midia e demais acoes. Texto truncado com reticencias quando faltar
espaco, mantendo nome acessivel e tooltip completos.

Referencia: captura e previa local aprovadas pelo usuario em 2026-11-28.
Builder nao utilizado; componentes reais existentes sao a fonte visual.
Sem dependencia nova, migration, env ou alteracao de backend/admin/video.
Slot beforeReplySlot aditivo preserva beforeSaveSlot e consumidores existentes.
Sem decisao arquitetural nova; ajuste localizado de apresentacao.

## Aceite
- [x] Responder textual com cores existentes e ordem aprovada.
- [x] WhatsApp de midia nao duplicado; icone do post principal preservado.
- [x] Validacao automatizada e browser em larguras reduzidas.
- [x] Check completo do frontend e build locais.

## Publicacao
Implementacao local, sem autorizacao de push/deploy neste pedido.

## Evidencias
57 testes de controles aprovados, 1 ignorado. Build frontend aprovado.
Browser Chrome isolado, componentes reais renderizados com fixtures apenas de
teste, em 320/390/1440px: ordem preservada, nenhuma rolagem horizontal e
reticencias em barra reduzida a 140px. Fonte fixa 14px, linha 20px contida no
botao; captura normal e truncada confirma descendente do p sem corte.
Checagem inicial de tipos concorreu com a regeneracao de .next pelo build;
check completo do frontend aprovado na repeticao apos build. Nenhum mock de
API ou dado persistido. pnpm check passou validacoes de raiz e frontend, mas
parou no backend por DATABASE_URL ausente ao carregar Prisma. Nao configurar
credencial nem acessar banco real para esta mudanca de UI. Versao local 0.1.885.
