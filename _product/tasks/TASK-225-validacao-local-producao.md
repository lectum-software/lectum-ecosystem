# TASK-225 - Validacao local antes de producao

## Objetivo

Adotar localhost -> PR revisado -> producao por solicitacao do usuario,
reduzindo builds de homologacao durante ajustes. Nao atribuir as quedas
exclusivamente aos builds sem evidencias de metricas/logs.

## Escopo

Atualizar instrucoes ativas, skill de execucao e runbook. Preservar branch
de trabalho `homolog`, commits versionados, revisao por PR, checks e smoke.
Sem alteracoes de produto, API, banco, env ou dependencias.

## Aceite

- [x] Remover obrigacao de push/deploy de homologacao por task.
- [x] Exigir checks/builds e validacao local antes de publicacao autorizada.
- [x] Preservar isolamento de dados locais, PR e protecao de `main`.
- [x] Registrar confirmacao do usuario sobre Autodeploy off em Backend/Video.
- [x] Registrar limites: servicos continuam ativos e producao ainda faz build.
- [ ] Verificar/desativar previews de homologacao restantes nos provedores.
- [ ] Executar validacao integrada local das correcoes pendentes com build.
- [ ] Publicar o lote aprovado somente apos cumprir o novo gate.

## Validacao

Checks documentais de tasks, ADRs, encoding, segredos e versao; diff revisado.
Nao ha alteracao de runtime que exija iniciar o app nesta task documental.
Nao declarar ambiente localhost pronto apenas pela alteracao de instrucoes.
Limitacao preexistente: pouco disco livre no PC; preparar espaco/dependencias
antes do build integrado, sem recorrer automaticamente a VPS.

## Rollout e rollback

Nenhum push nesta etapa. Instrucoes ficam em commit local; nenhum novo deploy.
Nao desligar bancos, servicos ou remover volumes. Configuracoes externas sao
confirmadas separadamente; reativar autodeploy so com autorizacao explicita.
ADR-0565 documenta a decisao e o estado da transicao.
