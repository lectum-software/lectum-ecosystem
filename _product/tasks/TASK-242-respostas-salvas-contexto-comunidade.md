# TASK-242 - Respostas salvas com contexto da comunidade

## Escopo

Alinhar respostas salvas ao padrao de identidade usado nos cards atuais da Lectum.
Todas as respostas passam a mostrar a comunidade com chevron na mesma linha do
autor. Respostas de psicologos tambem reutilizam a pergunta original usada no
perfil profissional. A referencia visual enviada em 09/10/2026 e os componentes
reais do perfil sao a fonte de verdade. Builder/Quick Copy nao esta exposto neste
cliente. ADR-0585.

## Aceite

- [x] Mostrar a comunidade com chevron na mesma linha do autor em todas as respostas.
- [x] Mostrar a pergunta original dentro do player quando a resposta profissional tiver video.
- [x] Mostrar a pergunta original antes da autoria quando a resposta profissional nao tiver video.
- [x] Mostrar a acao `Favoritar` entre o selo e a comunidade nas respostas de psicologos.
- [x] Preservar conteudo, controles, WhatsApp e navegacao dos itens salvos.
- [x] Validar checks, build e comparacao visual local em viewport mobile.

## Validacao

- `pnpm --dir frontend test:profile-reply-actions`: 17 testes aprovados.
- `pnpm --dir frontend typecheck`: aprovado.
- `pnpm --dir frontend check`: aprovado; 551 testes principais aprovados e 1 teste de symlink ignorado por permissao do Windows.
- `pnpm --dir frontend build`: aprovado, com aviso nao bloqueante de cache Webpack por `ENOSPC`; compilacao, tipos e 90 paginas foram concluidos.
- QA visual autenticado em 393 x 852: aprovado, sem diferencas P0, P1 ou P2. Evidencias em `design-qa.md`.
- Nao havia comentario de paciente salvo nos dados locais. O estado compartilha `SavedReplyAuthorHeader` com a resposta profissional e foi validado por teste de contrato; o usuario aceitou essa verificacao por equivalencia.
- Complemento de 09/10/2026: `FeedFavoriteButton` reutilizado no cabecalho salvo, com o mesmo slot fixo de 66 px do perfil. O teste garante a ordem selo, favorito e comunidade. A automacao do navegador interno ficou indisponivel depois da alteracao; a confirmacao final foi feita por contrato de componente, teste e typecheck.

## Impacto de deploy

Frontend apenas. O payload atual ja contem pergunta, comunidade e resposta. Sem
backend, banco, migration, env, dependencia, job ou mudanca de contrato. O
rollback e a reversao do commit desta task. Commit local em `homolog`; sem push ou
deploy ate autorizacao explicita.
