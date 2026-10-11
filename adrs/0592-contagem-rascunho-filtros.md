# ADR-0592: Contagem real do rascunho de filtros

## Status

Accepted

## Task relacionada

TASK-13

## Decisao

O botao Aplicar filtros mostra count da API existente, nao o tamanho da pagina. Observar o formulario RHF completo, normalizar como a aplicacao dos filtros e consultar page 1/limit 1 pelo caller existente, apenas com modal aberta. Debounce de 300ms limita requisicoes; chaves por consulta isolam respostas fora de ordem. Enquanto o rascunho difere da consulta ou ha carregamento, mostrar indicador, nunca o total antigo. Erro omite numero sem inventar zero e permite aplicar.

## Consequencias

Uma consulta adicional por escolha estabilizada; payload limitado a um perfil. Nao criar endpoint ou cliente paralelo. Contagem nao altera resultados aplicados.

## Producao e rollback

Frontend independente; nenhuma env, migration, package ou mudanca de contrato. Reverter frontend restaura botao anterior. Sem publicacao nesta execucao.

## Validacao

Check completo, build e 3 regressoes aprovados. Browser real 390/1280px: (0), carregamento, modalidade, aplicar/reabrir/limpar; sem fixtures permanentes. Estado vazio agora permite abrir filtros. Base local nao possui resultado positivo elegivel. Referencia screenshot do usuario e proto local; Builder indisponivel.
