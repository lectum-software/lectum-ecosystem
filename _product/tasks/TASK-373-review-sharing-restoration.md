# TASK-373 - Restaurar link de avaliacoes

## Escopo

Restaurar, por solicitacao do usuario, o campo de compartilhamento na aba de
avaliacoes do proprio perfil e em Minhas Avaliacoes do psicologo.
Reutilizar OwnReviewsLink/ReviewsLinkCard sem mudar cores, regras de elegibilidade,
contratos, banco ou notificacoes. Nao publicar sem autorizacao de release.

## Criterios

- [x] Perfil consome showOwnReviewsLink, com guarda existente de autenticacao e autoria.
- [x] Minhas Avaliacoes exibe o componente apenas para psicologo com id.
- [x] Copia preserva psychologist_id e destino /app/avaliacoes/nova.
- [x] Permissoes de recebimento continuam consultadas no servidor pelo componente existente.
- [x] Testes, check e build do frontend.
- [x] Verificacao local do componente real em navegador mobile e desktop.

## Referencia visual

Restauracao do componente original, sem redesenho. Builder Quick Copy nao esta
disponivel nas ferramentas desta sessao; usada a implementacao preexistente.
O teste isolado de componente nao substitui login real como profissional nem
validacao ponta a ponta do envio de avaliacao.

Em 2026-11-26 o usuario aprovou o bloco e depois as capturas contextuais nas
duas paginas em 390 e 1440 px, autorizando a publicacao. Capturas usam as telas
reais com dados demonstrativos interceptados apenas no navegador isolado;
nao foram feitas escritas reais nem validado o envio ponta a ponta.
Check completo do frontend e build local passaram. Release preparada: 0.1.878.

## Decisao

ADR-0737. Nenhuma alteracao em backend, admin ou video.
