# ADR-0253: Visibilidade pública do perfil no detalhe Admin do psicólogo

## Status

Accepted

## Task relacionada

TASK-55

## Contexto

O card `Dados profissionais` do detalhe Admin do psicólogo já consolidava catálogos, modalidade e origem de cadastro, mas não deixava explícito se o perfil estava visível para pacientes. O psicólogo controla essa preferência no perfil privado por meio do campo persistido `psychologist_profile.published`, porém a exibição pública real também depende dos critérios de elegibilidade já usados pela listagem pública.

## Decisão

Exibir em `Dados profissionais` a linha `Perfil visível para pacientes` sem criar novo contrato de API. A UI do Admin deve reutilizar:

- `header.active` como resposta operacional principal: indica se o perfil aparece agora para pacientes na busca pública;
- `header.published` como contexto adicional quando a preferência do psicólogo está ativada, mas outros critérios públicos ainda impedem a exibição.

A decisão evita duplicar regras de elegibilidade no frontend e preserva o backend como fonte do estado consolidado de visibilidade pública.

## Consequências

- O Admin enxerga a mesma informação operacional que importa para suporte: se pacientes conseguem ver o perfil agora.
- Quando o psicólogo habilitou a visibilidade, mas o perfil segue inelegível, o Admin recebe uma explicação sem confundir `published` com exibição pública efetiva.
- Nenhuma migration, endpoint ou package novo é necessário.
- Se futuramente o produto separar formalmente “preferência de publicação” e “visibilidade pública efetiva” no contrato, este campo deve ser revisitado para usar nomes explícitos no DTO.

## Validacao

- `pnpm --dir admin check` passou sem erros ou warnings.
- `pnpm --dir admin build` passou sem erros apos repetir a tentativa inicial bloqueada por outro processo Next build em andamento.
- `git diff --check` nos arquivos deste ajuste passou sem erros.
- `pnpm check` foi executado: frontend passou; backend ficou bloqueado por arquivos preexistentes/untracked da TASK-68 em `backend/src/modules/api/admin/private/psychologists/account/` e organizacao de imports em `backend/src/main/server/imports/write.ts`, fora do escopo desta decisao.
- Browser local em Chrome headless 390x844 acessou `/psicologos/[id]?tab=perfil`, mas sem sessao Admin autenticada disponivel no perfil headless; o smoke ficou limitado a protecao/carregamento do painel.

## Pendências

- Nenhuma pendência externa.
