# ADR-0553 - Pergunta completa na arte social

## Status

Aceita em 2026-10-02.

## Contexto

A arte social limitava a pergunta a tres linhas, embora o perfil mostrasse todo
o titulo. O usuario pediu remover reticencias, alterando somente o espaco para o
texto, sem outras mudancas no layout.

## Decisao

Preservar a quebra de linha existente de 30 caracteres, permitindo todas as linhas
do texto normalizado aceito pelo servico. Palavras longas sao divididas sem perda.
O corpo branco mantem 266px ate tres linhas e cresce 60px por linha adicional.
Mantemos fontes de 50/44px, entrelinha, centralizacao, cabecalho e demais medidas.

O fundo PNG existente e dividido em topo, faixa branca e cantos inferiores;
somente a faixa branca e estendida antes de recompor o PNG no filtergraph FFmpeg.
Assim o cabecalho e os cantos nao sofrem escala. O fallback portatil usa a mesma
altura calculada no desenho do retangulo.

## Consequencias

O trecho da ADR-0540 que limitava perguntas a tres linhas e substituido por esta
regra. Textos longos ocupam mais altura do video, sem alteracao de fonte ou posicao.
O limite de entrada de 180 caracteres permanece; titulos de posts aceitam 100.
Novos renders recebem a mudanca, sem reescrever arquivos existentes. Rollback por
reversao do codigo em homolog. Sem alteracao de banco, API, env, fila ou pacotes.

## Task relacionada

TASK-213 - Pergunta completa na arte social.

## Complemento 0.1.551 - previa

A previa e composta em HTML sobre a midia original, sem antecipar um job de
exportacao. Ela passa a preservar todas as linhas com a mesma quebra do renderer
e remove o line-clamp de tres linhas. O corpo mantem 13.85cqh ate tres linhas e
cresce 3.125cqh por linha extra (equivalente a 60px / 1920px). O restante dos
estilos e comportamento da modal permanece intacto. Testes do helper e do
contrato do componente evitam reintroduzir corte ou altura fixa.
