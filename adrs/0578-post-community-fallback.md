# ADR-0578 - Comunidade geral como ultima opcao de publicacao

## Status

Aceito.

## Contexto

A selecao alfabetica mistura a comunidade geral com as especificas. O usuario
pediu que a geral apareca no fim com uma orientacao curta para quem nao encontrou
um tema especifico.

## Decisao

Identificar pelo slug publico saude-mental-em-geral, confirmado na API publica,
e ordenar apenas as opcoes da criacao de post. A lista original nao e alterada.
Adicionar description e separatorBefore opcionais a FieldOption, renderizados
pelo SelectController customizado. A descricao nao altera label, valor, pesquisa
ou gatilho; aria-describedby associa o texto a opcao. O separador so aparece se
ha uma opcao anterior no resultado filtrado. Nao sintetizar comunidade ausente.

## Consequencias

Sem dependencia ou mudanca de backend. Os demais selects nao mudam sem optar
pelas propriedades. Renomear o slug da comunidade exigira atualizar esta regra;
mudar apenas o nome preserva o comportamento. Busca continua por nome/grupo.
Rollback apenas de frontend. Relacionado a TASK-238.
