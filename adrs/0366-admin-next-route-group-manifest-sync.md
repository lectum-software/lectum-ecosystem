# ADR-0366 - Sincronizacao de manifests do route group do Admin no build

## Status

Aceita

## Contexto

O Admin usa o route group `src/app/(admin)` para aplicar o shell administrativo sem alterar as URLs
publicas internas, como `/psicologos` e `/psicologos/[id]`. Em `next start` com Next 16.2.9 e
webpack no ambiente Windows local, a pagina podia falhar com `This page couldn't load` e o servidor
registrava `The client reference manifest for route "/psicologos" does not exist`.

O build gerava os manifests em `.next/server/app/(admin)/...`, enquanto o runtime de producao
tentava localizar tambem a versao normalizada sem o route group.

## Decisao

- Manter o route group `(admin)` como separacao de layout do Admin, preservando as URLs atuais.
- Adicionar o script `admin/scripts/sync-route-group-manifests.mjs` ao final de `admin:build`.
- O script copia apenas arquivos `*_client-reference-manifest.js` de route groups para os caminhos
  normalizados em `.next/server/app`, sem alterar codigo fonte de telas, contratos de API, dados ou
  dependencias.
- Nao adicionar package novo nem mover a arquitetura de rotas do Admin nesta correcao pontual.

## Consequencias

- `next start` passa a encontrar os manifests esperados para rotas normalizadas como `/psicologos` e
  `/psicologos/[id]`.
- O workaround fica isolado no build do Admin e pode ser removido quando o comportamento do Next for
  corrigido ou quando a arquitetura de rotas do Admin mudar.
- A correcao nao introduz mock, endpoint simulado, migration ou nova dependencia.

## Validacao

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Browser local via Chrome/CDP em `http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf` com
  sessao administrativa real: a pagina carregou o detalhe do psicologo e nao exibiu `This page
  couldn't load`.

## Pendencias

Nenhuma.
