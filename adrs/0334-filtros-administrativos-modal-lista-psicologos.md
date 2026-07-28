# ADR-0334: Filtros administrativos antes de Especialidade na lista Admin de psicologos

## Status

Accepted

## Task relacionada

TASK-54

## Contexto

A modal de filtros da lista Admin de psicologos precisava priorizar filtros operacionais antes dos filtros clinicos. O pedido atual foi adicionar, antes de **Especialidade**, os filtros administrativos **Plano**, **Status perfil**, **Status registro**, **Tracao** e **Engajamento**.

A lista ja possui os sinais reais de tracao e engajamento por psicologo, calculados no backend a partir de eventos reais de visualizacao, contato, favoritos e atividade em comunidades. Tambem existe o filtro legado/composto `traction_engagement` usado por navegacao de quadrantes, mas ele nao deve competir visualmente com os cinco filtros solicitados na abertura da modal.

## Decisao

A modal de `/psicologos/lista` passa a abrir com esta ordem canonica mobile-first:

1. **Plano**
2. **Status perfil**
3. **Status registro**
4. **Tracao**
5. **Engajamento**
6. **Especialidade**

Os parametros simples `traction` e `engagement` continuam sendo persistidos na URL apenas ao aplicar a modal e enviados ao contrato real `GET /api/admin/private/psychologists`. Quando um deles e escolhido, a UI limpa `traction_engagement` para evitar recorte composto contraditorio.

O campo visual **Quadrante** foi removido da modal para atender ao pedido de posicionamento direto dos filtros administrativos. O parametro `traction_engagement` permanece aceito no contrato para preservar links existentes vindos do dashboard, mas nao aparece como filtro principal da modal.

## Consequencias

- O Admin encontra filtros de governanca e operacao antes de filtros clinicos, reduzindo scroll inicial na modal.
- Links legados com `traction_engagement` continuam funcionando sem expor um campo adicional entre **Status registro** e **Tracao**.
- Nao houve nova migration, package, seed, mock, endpoint paralelo ou dado derivado persistente.

## Validacao

- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir admin check`
- `NEXT_PRIVATE_BUILD_WORKER=0 node .\node_modules\next\dist\bin\next build --webpack --debug` em `admin/`
- `pnpm check`
- Browser local/headless/CDP com admin temporario real removido ao final em `http://localhost:3002/psicologos/lista?sort=relevance&limit=8`:
  - desktop `1440x1000`: labels iniciais `Plano`, `Status perfil`, `Status registro`, `Tracao`, `Engajamento`, `Especialidade`, `orderOk=true`, `hasQuadrante=false`, `scrollWidth=1425`, `innerWidth=1440`;
  - aplicacao real dos filtros gerou URL com `engagement=ativo` e `traction=strong_traction`;
  - mobile base `390x844`: mesma ordem de labels, `orderOk=true`, `hasQuadrante=false`, `scrollWidth=390`, `innerWidth=390`.

## Pendencias

- Nenhuma pendencia externa.
