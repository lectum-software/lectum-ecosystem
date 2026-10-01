# TASK-203 - Retorno pela navegacao mobile

Dependencia: TASK-202 (Completed). Status: Completed.

## Escopo

Revisao de promocao das TASKs 201/202: Favoritos destaca Perfil na barra, mas
o clique nesse item era tratado como refresh da pagina atual. Distinguir o
destaque da secao da igualdade da rota antes de impedir a navegacao.

Mobile-first 390px. Sem mudanca visual, pacote, API, env ou migration.
PROTO-INVENTORY consultado; reutilizar a barra existente. Builder/Quick Copy
nao necessario para esta correcao de comportamento.

## Criterios de aceite

- [x] Favoritos permite voltar ao Perfil pelo item destacado da barra.
- [x] Perfil de profissional permite voltar a lista pelo item Psicologos.
- [x] Toque na rota atual preserva o refresh existente; desktop inalterado.
- [x] Modal do + continua abrindo sobre a pagina atual.
- [x] Regressoes, check/build e inspecao local aprovados.

## Deploy e validacao

ADR-0547 atualizado. Publicar primeiro em homolog, conferir retorno autenticado
Favoritos -> Perfil e modal do +. Promover por PR homolog -> main apos checks.
Usuario solicitou producao em 01/10/2026. Rollback por reversao revisada, sem
alterar dados. Resultados de deploy/smoke em outputs/producao-nav-0538.md.

Check frontend completo aprovado (incluindo 12/12 de navegacao); build Next
aprovado com 90 paginas. Um skip preexistente de symlink no Windows.
Guards de versao, tasks, ADRs, source-safety/size e encoding aprovados.
Preview local 390x844: Favoritos -> Perfil pelo item da barra navega corretamente;
+ no Perfil abre o convite anonimo mantendo /app/perfil. Sem dados enviados.
