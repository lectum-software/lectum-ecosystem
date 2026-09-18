# ADR 0516 - Remocao do bloco legal em E-mail e senha

## Status

Aceita em 2026-09-17.

## Contexto

A pagina `E-mail e senha` e uma superficie privada de seguranca de conta compartilhada por pacientes e psicologos. O print enviado pelo usuario mostrou que o card `Termos e privacidade`, posicionado acima de `Excluir minha conta`, estava gerando ruido visual nessa tela. As rotas publicas de Termos de Servico e Politica de Privacidade continuam necessarias para governanca legal e aceite versionado, mas nao precisam ser atalho dentro dessa pagina especifica.

## Decisao

Remover somente o card de links legais da rota compartilhada `frontend/src/app/app/settings/account/logic.tsx`, preservando:

- a pagina privada `E-mail e senha` como ponto unico de exclusao self-service;
- as paginas publicas `/termos-de-servico` e `/politica-de-privacidade`;
- o fluxo de aceite legal versionado e qualquer exigencia de cadastro/onboarding.

A decisao vale igualmente para pacientes e psicologos porque ambos usam a mesma rota privada de conta.

## Consequencias

- A tela fica mais focada em credenciais, Google e exclusao de conta.
- Nao ha mudanca de backend, schema, migrations, envs, packages, contratos ou dados persistidos.
- Rollback e reverter o commit do frontend.
- A promocao para producao segue o fluxo homolog -> main por PR revisado, sem push direto em `main`.
