# TASK-217 - Tema na identidade do post original

Data: 2026-10-06.

## Escopo

Substituir Postado em pela comunidade junto a identidade do autor, com chevron
e tema (category), no feed e detalhe do post. Uma unica linha: nome pode ser
truncado, selo e Favoritar preservados. Respostas/comentarios nunca recebem
chevron. Anonimos no post original usam Anonimo #0000, preservando o numero.
Referencia: imagens e instrucoes do usuario. Arquitetura e PROTO-INVENTORY
consultados; Builder/Quick Copy indisponivel. Usar componentes e tokens locais.

## Criterios de aceite

- [x] Tema usa category, com fallback para nome completo; destino inalterado.
- [x] Link acessivel preserva nome completo da comunidade e foco de teclado.
- [x] Feed e detalhe removem a faixa Postado em e o separador correspondente.
- [x] Nome com reticencias, selo e Favoritar na mesma linha, sem quebra.
- [x] Respostas e contribuicoes de resposta preservam seu cabecalho sem chevron.
- [x] Abreviacao anonima restrita a apresentacao do post original.
- [x] Testes direcionados, check frontend e build aprovados.
- [ ] Smoke mobile-first local e verificacao de homologacao registrados.

## Deploy

Somente frontend. Sem API, migration, env ou dependencia nova. Publicar em
homolog; nao promover producao nesta task. ADR-0557. Evidencias no workspace
outputs/original-post-topic-0589-*.

## Validacao

Frontend check completo e build 0.1.589 aprovados. Guards de versao, ADRs,
tasks, encoding e source-safety aprovados. Teste visual isolado do componente
real AuthorIdentityLine com CSS do build em 320/390/1440px: sem sobreposicao,
nome truncavel, selo e acao preservados e nenhuma seta nas respostas.
Fixtures apenas no teste externo, nunca na aplicacao ou API.

Browser local abriu, mas o feed retornou servico indisponivel por ausencia
do backend local. Navegador conectado falhou ao iniciar (kernel assets,
os error 3), inclusive apos reset; verificacao visual com dados reais em
homologacao permanece pendente. Nao tratar o teste isolado como smoke E2E.
Deploy e verificacoes HTTP serao registrados em outputs apos o push.
