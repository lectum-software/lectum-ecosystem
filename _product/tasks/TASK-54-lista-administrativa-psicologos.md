# TASK-54: Lista administrativa de psicólogos

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-54 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-53 |
| ADR alvo | ADR se houver nova decisão sobre filtros persistidos, ordenação ou exposição de dados sensíveis |

## Contexto

A listagem administrativa de psicólogos tem referência visual em `_product/proto/admin/Psicólogos/Psicólogos- Lista.png`. Ela deve permitir encontrar profissionais por nome/CRP, filtrar, ordenar e abrir o detalhe.

Regra definida: o botão **Adicionar novo psicólogo** fica fora da V1. Ordenação "Mais relevantes" deve usar o mesmo ranking da descoberta pública de psicólogos.

## Objetivo

Criar a lista administrativa de psicólogos com filtros reais, paginação, ordenação por ranking público e métricas operacionais por profissional.

## Pré-requisitos e bloqueios

- TASK-45, TASK-46 e TASK-53 concluídas.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Psicólogos/Psicólogos- Lista.png` como referência visual local.

## Escopo frontend

- Criar rota protegida:
  - `/psychologists/list` ou equivalente.
- Renderizar:
  - breadcrumb;
  - busca por nome/CRP;
  - filtros laterais;
  - indicadores de filtros ativos;
  - limpar filtros;
  - ordenação;
  - alternância visual grid/lista somente se ambas forem implementadas com dados reais; caso contrário, manter apenas lista;
  - paginação;
  - ações por linha: abrir detalhe e abrir perfil público.
- Não renderizar "Adicionar novo psicólogo" nesta V1.
- "Salvar busca" fica fora da V1 salvo se existir persistência real de preferências admin; não usar local fake como requisito de produto.

## Escopo backend

- Criar endpoint admin privado:
  - `GET /api/admin/private/psychologists`
- Filtros:
  - nome/CRP;
  - estado/cidade;
  - status de verificação;
  - plano;
  - experiência;
  - desconto 1ª sessão;
  - aceita convênios;
  - valor social;
  - público atendido;
  - abordagem;
  - serviço;
  - modalidade;
  - idioma;
  - gênero.
- Ordenações:
  - `relevance`: score real da descoberta pública;
  - avaliação;
  - favoritos;
  - cliques WhatsApp;
  - cadastro recente;
  - nome.
- Métricas por linha:
  - posição no ranking;
  - avaliação média e quantidade;
  - favoritos;
  - cliques WhatsApp;
  - experiência derivada de `crp_registration_date`;
  - localização;
  - plano/status.

## Fora do escopo

- Criar psicólogo manualmente.
- Editar psicólogo na lista.
- Ações em massa.
- Persistir buscas salvas.
- Exportação da lista, salvo se endpoint real for implementado explicitamente.

## Contrato técnico detalhado

Backend esperado:

- Paginação padrão do projeto.
- Filtros validados.
- Nenhum `select/include` vindo do frontend.
- `deleted=false` em todos os modelos.
- Reutilizar helper de ranking público.

Frontend esperado:

- `admin/src/api/req/psychologists`;
- `admin/src/api/callers/psychologists`;
- query keys e invalidação quando aplicável;
- filtros em URL/search params quando fizer sentido;
- layout mobile-first com filtros em drawer no mobile.

## Critérios de aceite

- [x] Lista só abre para admin autenticado.
- [x] Busca por nome/CRP usa backend real.
- [x] Filtros usam campos reais do banco.
- [x] Ordenação "Mais relevantes" usa ranking público real.
- [x] Métricas por linha vêm de dados reais.
- [x] Botão "Adicionar novo psicólogo" não aparece.
- [x] "Salvar busca" não aparece/habilita sem persistência real.
- [x] Paginação funciona.
- [x] UI mobile-first validada.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Nenhum `<img>` cru foi usado.
- [x] `_product/proto/admin/Psicólogos/Psicólogos- Lista.png` foi citado como referência visual.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real.

## Notas de execução

- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` não estava disponível como ferramenta neste ambiente; a implementação visual usou `_product/proto/admin/Psicólogos/Psicólogos- Lista.png`.
- Endpoint real criado: `GET /api/admin/private/psychologists`, protegido por autenticação administrativa da TASK-45.
- Rota Admin criada: `/psicologos/lista`, com filtros em URL, paginação, ordenação e layout mobile-first.
- Ordenação `relevance` reutiliza o helper de ranking público `rankPsychologistCandidates`, compartilhado com a descoberta pública.
- Campos pessoais sensíveis não foram expostos na lista; a resposta retorna apenas dados operacionais necessários para busca e triagem administrativa.
- O botão **Adicionar novo psicólogo** e a ação **Salvar busca** permanecem fora da V1.
- A rota mínima `/psicologos/[id]` foi adicionada sem dados simulados para evitar ação quebrada; o detalhe real fica para a TASK-55.
- Nenhuma alteração em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `db:migrate` não se aplica a esta task.
- ADR criado: `adrs/0234-admin-lista-psicologos-ranking-filtros.md`.

## Evidências de validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- API real autenticada: `GET /api/admin/private/psychologists?page=1&limit=2&sort=relevance` retornou `status=200`, `count=6`, `items=2` e `firstRank=1`.
- API sem autenticação retornou `401`.
- Browser local headless com admin real em `http://localhost:3002/psicologos/lista?sort=relevance&limit=8`: desktop com 6 linhas e ações reais; mobile 390px com 6 cards; sem **Adicionar novo psicólogo** e sem **Salvar busca**.

## Correcao de regressao em 2026-07-11

- Corrigido overflow horizontal da rota Admin `/psicologos/lista` sem alterar contrato de API nem dados: containers agora podem encolher com `min-w-0`/`minmax(0,1fr)`, a tabela densa so aparece em larguras amplas e os cards mobile-first cobrem larguras menores.
- Removido o icone inerte de menu por linha, mantendo apenas as acoes reais da V1: abrir detalhe administrativo e abrir perfil publico.
- Referencia visual mantida: `_product/proto/admin/Psicólogos/Psicólogos- Lista.png`; Builder/Quick Copy continua indisponivel como ferramenta neste ambiente.
- Validacao executada:
  - `pnpm --dir admin check`
  - `pnpm --dir admin build`
  - Browser local headless com sessao admin real em `http://localhost:3002/psicologos/lista?sort=relevance&limit=8`: desktop 1920px e mobile 390px com `documentScrollWidth <= innerWidth`, sem overflow horizontal de viewport.

## Execucao complementar: filtros em modal na lista Admin (2026-07-12)

- Pedido do usuario: remover a coluna lateral **Filtros de busca** da lista Admin de psicologos e fazer o botao **Filtros ativos** abrir uma modal com as opcoes de filtros, alinhada ao comportamento da descoberta publica de psicologos.
- Referencias visuais usadas: `_product/proto/admin/Psicólogos/Psicólogos- Lista.png` e `_product/proto/Filtros de Psicólogos - Serviços Expandidos.jpg`. Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente.
- Frontend Admin: a rota `/psicologos/lista` deixou de renderizar a coluna fixa de filtros em desktop; todos os breakpoints usam o botao **Filtros ativos** para abrir uma modal/drawer responsiva.
- A modal e mobile-first: ocupa a altura da viewport em ~390px, abre como sheet inferior e, em desktop, centraliza com largura maxima; Escape/backdrop/cancelar fecham sem aplicar alteracoes.
- Os filtros continuam usando os mesmos campos reais, query params e endpoint Admin privado ja existentes; as alteracoes feitas na modal usam estado local e so atualizam a URL ao clicar **Aplicar filtros**.
- Nao houve alteracao de backend, Prisma, migrations, packages, contratos de API, dados, ranking, paginacao ou ordenacao.
- Nenhum `<img>`, mock, endpoint simulado ou dado fake permanente foi usado.

### Criterios complementares

- [x] A coluna lateral **Filtros de busca** nao aparece mais na lista Admin antes de abrir a modal.
- [x] O botao **Filtros ativos** abre uma modal com Localizacao, Status/plano, Selos/diferenciais e Perfil profissional.
- [x] A modal funciona em desktop e mobile base ~390px sem overflow horizontal de viewport.
- [x] Filtros continuam persistidos em URL/search params somente ao aplicar.
- [x] Nenhuma alteracao de backend, Prisma/migrations ou package foi feita.

### Validacao complementar

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Browser local headless/CDP com admin temporario real removido ao final em `http://localhost:3002/psicologos/lista?sort=relevance&limit=8`:
  - desktop `1440x1000`: sem titulo de filtros visivel fora da modal; modal abriu com secoes esperadas e largura `768px`;
  - mobile `390x844`: sem titulo de filtros visivel fora da modal; modal abriu ocupando `390x844`;
  - ambos com `document.documentElement.scrollWidth <= innerWidth`.
- `pnpm check` foi executado e ficou bloqueado por erros de formatacao preexistentes no `frontend/` fora deste ajuste:
  - `frontend/src/app/app/professional/profile/setup/use-form.tsx`;
  - `frontend/src/app/auth/register/psychologist/use-form.tsx`.

## Execucao complementar: refinamento de cabecalho, busca e controles (2026-07-12)

- Pedido do usuario: remover o texto **Ranking publico aplicado**, reduzir a barra de pesquisa, posicionar **Ordenar por** pequeno acima do seletor, mover **Filtros ativos** para a direita do seletor de ordenacao e remover textos auxiliares/badges do card de resultados.
- Frontend Admin: a rota `/psicologos/lista` manteve o endpoint, query params, filtros reais, modal de filtros e ordenacao existentes; a alteracao foi apenas de composicao visual.
- O cabecalho da lista ficou mais limpo, sem a etiqueta de ranking. O ranking publico continua aplicado pela ordenacao `relevance`, sem expor texto redundante na UI.
- O grupo de controles agora fica mobile-first: busca em largura total no mobile e limitada em desktop, seletor de ordenacao com label compacto em cima, e botao **Filtros ativos** imediatamente a direita do seletor em telas amplas.
- O card de resultados exibe apenas a contagem de psicologos encontrados, sem a linha de fonte tecnica e sem os badges de escopo V1.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; a referencia visual permanece `_product/proto/admin/Psicólogos/Psicólogos- Lista.png` e a captura enviada pelo usuario.
- Nao houve alteracao de backend, Prisma, migrations, packages, contratos de API, dados, filtros ou ranking.

### Criterios complementares

- [x] O texto **Ranking publico aplicado** nao aparece mais no cabecalho.
- [x] **Ordenar por** aparece como label pequeno acima do seletor.
- [x] O botao **Filtros ativos** fica a direita do seletor de ordenacao em desktop e segue empilhado de forma mobile-first em telas estreitas.
- [x] A barra de pesquisa foi limitada em desktop sem perder largura total no mobile.
- [x] A linha de fonte tecnica e os badges **Criacao manual fora da V1**/**Preferencias fora da V1** foram removidos do card de resultados.
- [x] Nenhum backend, Prisma/migrations ou package foi alterado.

### Validacao complementar

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Browser local/headless com admin temporario real removido ao final:
  - desktop `1440x1000`: textos removidos ausentes, busca com largura aproximada `470px`, **Ordenar por** acima do seletor e **Filtros ativos** a direita do seletor;
  - modal de filtros ainda abriu pelo botao **Filtros ativos**;
  - mobile `390x844`: textos removidos ausentes e sem overflow horizontal de viewport.

## Execucao complementar: copy e acao de limpar filtros (2026-07-12)

- Pedido do usuario: remover a acao textual **Limpar filtros** da area principal de controles e simplificar o subtitulo para **Encontre profissionais por nome, CRP e filtros cadastrados.**
- A acao de limpar filtros continua disponivel dentro da modal de filtros como **Limpar**, preservando a capacidade de resetar filtros sem ocupar a area principal da lista.
- Nao houve alteracao de backend, Prisma, migrations, packages, contratos de API, dados, filtros, ranking, paginacao ou ordenacao.

### Criterios complementares

- [x] O texto **Limpar filtros** nao aparece mais na area principal da lista.
- [x] O subtitulo do cabecalho usa a copy **Encontre profissionais por nome, CRP e filtros cadastrados.**
- [x] A modal de filtros continua abrindo pelo botao **Filtros ativos**.
- [x] Nenhum backend, Prisma/migrations ou package foi alterado.

### Validacao complementar

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Browser local/headless com admin temporario real removido ao final validando desktop e mobile base `390px`.
