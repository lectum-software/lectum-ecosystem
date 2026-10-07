# ADR-0565 - Validacao local e publicacao direta por PR

## Status

Aceito em 2026-10-06; transicao operacional em andamento.

## Contexto

Usuario relatou quedas e consumo alto durante implementacoes em homologacao
e producao, solicitando testar no localhost antes de publicar em producao.
A causa unica da sobrecarga nao foi comprovada. A politica anterior obrigava
push a cada task e acionava builds remotos em homologacao.

## Decisao

- Localhost passa a ser o ambiente padrao de validacao; homologacao remota
  deixa de ser gate obrigatorio. Manter verificacoes de dados/dependencias.
- Manter `homolog` como branch de trabalho para preservar PRs e historico,
  mas reter commits localmente ate autorizacao de publicacao.
- Publicar via PR revisado `homolog` -> `main`, sem push direto em producao,
  sem bypass de checks, com smoke e rollback definidos.
- Usuario confirmou Autodeploy desativado nos servicos Backend e Video de
  homologacao. Screenshot confirma Video off; nao parar servicos/bancos.
- Conferir outros gatilhos externos antes de push. Vercel e router Cloudflare
  nao foram reconfigurados por esta decisao. Seguir LOCAL-TO-PRODUCTION.md.
- Falta de disco/dependencias locais e bloqueio explicito, nao autorizacao
  para enviar build a VPS. Localhost nao pode mutar recursos produtivos.

## Consequencias

Menos builds intermediarios quando os gatilhos forem desativados. Nao garante
estabilidade da VPS nem elimina carga dos containers existentes ou do build
produtivo. Emulacao nao substitui dispositivo fisico em bugs nativos de PWA.
Backup, migrations compativeis, checks obrigatorios e smoke continuam exigidos.
Separar build de runtime em CI e selecionar apps por alteracao sao melhorias
futuras, nao configuracoes entregues nesta task. Nenhuma mudanca de runtime.
