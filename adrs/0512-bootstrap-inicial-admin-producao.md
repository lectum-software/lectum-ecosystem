# ADR-0512 — Bootstrap único do primeiro administrador de produção

## Status

Accepted

## Task relacionada

TASK-191

## Contexto

O bootstrap administrativo existente foi deliberadamente restrito a bancos locais descartáveis. Produção
pode iniciar sem nenhum administrador, mas contornar essa proteção com seed, SQL manual, troca de
`NODE_ENV` ou senha em linha de comando remove salvaguardas e deixa evidências sensíveis no host.

## Decisão

Criar uma modalidade distinta e manual de bootstrap inicial publicado. Ela exige `--confirm=production`,
senha por stdin, `NODE_ENV=production`, origem canônica da API produtiva e ausência total de registros
de administrador. Não há endpoint de rede e nenhum segredo permanente novo. A operação retorna somente
sucesso/falha sanitizados.

## Consequências

- Um operador ainda precisa de acesso ao container do backend, e-mail e nome aprovados para concluir a
  criação; o código não inventa identidade administrativa.
- O comando não pode ser reutilizado para atualizar, restaurar ou criar um segundo administrador.
- O fluxo existente de recuperação e gestão autenticada permanece o caminho de administração posterior.


## Validação

A modalidade publicada foi recusada em homologação, que possui origem de API distinta. Após o PR #4 e o smoke da versão `0.1.416` em produção, o operador executou a criação única com senha inserida localmente por stdin; o resultado foi sanitizado e o login administrativo foi confirmado.
