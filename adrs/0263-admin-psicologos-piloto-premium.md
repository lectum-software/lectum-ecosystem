# ADR-0263: Piloto visual premium do Admin em Psicólogos

## Status

Accepted

## Task relacionada

Piloto exploratório solicitado antes da criação de task formal.

## Contexto

O site/app público da Lectum transmite uma percepção mais premium, leve e sofisticada do que o painel Admin atual. Antes de criar uma task ampla para redesenhar todo o painel, foi decidido testar a nova direção visual somente no módulo administrativo de Psicólogos: dashboard, lista e detalhe do perfil.

O Builder/Quick Copy ativo não está acessível como ferramenta MCP neste ambiente. Foram consultadas as referências locais de `_product/proto/admin/Psicólogos` e a comparação visual fornecida em conversa. Não há protótipo específico para essa nova direção premium do Admin.

## Decisão

- Criar um escopo visual piloto aplicado por rota em `/psicologos*`, usando a classe `admin-premium-pilot`.
- Manter backend, contratos, queries e regras de negócio intactos.
- Reaproveitar tokens e componentes atuais do Admin, sem instalar packages e sem criar design system paralelo.
- Testar uma linguagem mais próxima do site:
  - sidebar clara;
  - azul Lectum como cor primária no escopo do piloto;
  - cards com borda mais suave, raio maior e sombra leve;
  - botões e campos mais arredondados;
  - abas e métricas menos agressivas visualmente.
- Não replicar automaticamente para Comunidades, Pacientes, Financeiro, Notificações ou demais telas até aprovação visual do piloto.

## Consequências

- O piloto permite validar a direção estética com baixo risco e sem mexer em domínio.
- A classe escopada evita uma troca global prematura do Admin.
- A sidebar muda para a linguagem premium somente nas rotas de Psicólogos, permitindo comparar com as demais áreas.
- Se aprovado, a próxima task deve formalizar a padronização para o Admin inteiro e transformar o piloto em fundação reutilizável.

## Refinamento pós-feedback

Após a primeira validação visual, foi identificado que a interface ficou mais leve, mas ainda mantinha detalhes pouco premium: pesos textuais agressivos, espaçamento uppercase duro e gráficos com curvas/linhas grossas.

Decisões adicionais:

- Carregar a fonte Manrope no Admin via `next/font`, alinhando a família tipográfica ao site público.
- Reduzir o peso efetivo de `font-black`/`font-extrabold` dentro de `admin-premium-pilot`, sem trocar o restante do Admin.
- Suavizar letter-spacing de textos uppercase administrativos no piloto.
- Criar `buildSmoothSvgPath` no utilitário de séries temporais do Admin para desenhar curvas SVG com cubic Bézier.
- Usar linhas e marcadores mais finos nos gráficos de Psicólogos e do detalhe Estatísticas, preservando dados reais e acessibilidade.

Consequência: o piloto passa a testar não só tema/cores/cards, mas também acabamento fino de tipografia e data visualization antes de virar task transversal.

## Ajuste de sombras p?s-feedback

Ap?s nova revis?o visual, o excesso de sombras no piloto foi considerado cafona e menos premium. A decis?o foi migrar o acabamento para uma linguagem mais editorial: superf?cie limpa, borda sutil e sombra quase impercept?vel apenas para separa??o de camadas.

Decis?es adicionais:

- Reduzir drasticamente `--admin-shadow`, `--admin-shadow-soft` e `--admin-shadow-control` dentro de `admin-premium-pilot`.
- For?ar `shadow-admin`, `shadow-admin-soft` e `shadow-control` no escopo premium a usarem sombras m?nimas.
- N?o trocar os componentes nem expandir a altera??o para o Admin inteiro at? aprova??o do piloto.

Consequ?ncia: o piloto passa a depender mais de espa?amento, borda e hierarquia tipogr?fica do que de profundidade artificial.

## Ajuste do gr?fico multi-linha p?s-feedback

O fundador esclareceu que todas as s?ries devem continuar vis?veis no mesmo gr?fico, mas o desenho das linhas e o fundo sombreado do plot n?o estavam alinhados com a est?tica premium.

Decis?es adicionais:

- Manter o gr?fico multi-linha e a sele??o por cards/chips.
- Remover o halo/glow das linhas para evitar apar?ncia artificial ou cafona.
- Reduzir strokes e marcadores para uma leitura mais editorial.
- Trocar o fundo sombreado do plot por superf?cie limpa com borda sutil.
- Aplicar a mesma dire??o ao dashboard e ao detalhe Estat?sticas de Psic?logos.

Consequ?ncia: o gr?fico preserva compara??o entre s?ries, mas com menos ru?do visual e sem efeito sombreado.

## Ajuste da lista de psic?logos p?s-feedback

A revis?o visual da lista mostrou que a tabela ainda destoava das demais telas do piloto: pesos textuais mais duros e largura m?nima fixa que gerava barra horizontal.

Decis?es adicionais:

- Remover a largura m?nima fixa da tabela de psic?logos e fazer a grade ocupar 100% da largura ?til dispon?vel.
- Substituir o wrapper com rolagem horizontal por conten??o sem scrollbar no desktop.
- Redistribuir colunas por percentuais para preservar todas as informa??es da lista sem barra horizontal.
- Reduzir o peso textual da p?gina, dos controles, cabe?alhos e c?lulas para seguir a tipografia do piloto premium.
- Adicionar leitura em cards no breakpoint mobile, evitando tabela comprimida ou scroll horizontal em telas menores.

Consequ?ncia: a lista mant?m todos os dados reais e a??es existentes, mas passa a se comportar como parte da mesma fam?lia visual do dashboard e do detalhe de Psic?logos.

## Remo??o de colunas de baixa prioridade na lista

Ap?s revis?o visual, as colunas **Favoritos** e **WhatsApp** foram consideradas ru?do para a leitura principal da lista administrativa. A decis?o foi remov?-las da tabela desktop e dos cards mobile, preservando esses dados nos contratos e em telas anal?ticas/detalhes onde fazem mais sentido.

Decis?es adicionais:

- Manter na lista apenas dados de identifica??o, plano, status de perfil, status de registro, avalia??o e a??es.
- Redistribuir a largura ?til da tabela entre as colunas restantes.
- N?o alterar backend, queries, ordena??o ou contratos neste ajuste visual.

Consequ?ncia: a lista fica mais limpa, respira melhor na largura dispon?vel e evita competir com dashboards/estat?sticas para m?tricas de engajamento.

## Busca autom?tica na lista de psic?logos

Ap?s revis?o do fluxo da lista, o bot?o **Buscar** foi considerado atrito desnecess?rio para uma busca simples por nome ou CRP. A decis?o foi transformar o campo em busca autom?tica com debounce, mantendo o estado real em URL e a mesma query backend j? existente.

Decis?es adicionais:

- Remover o bot?o expl?cito de busca da lista.
- Aplicar filtro automaticamente ap?s digita??o com debounce de 350ms.
- Manter `q` nos search params para deep link, reload e compartilhamento interno do estado da lista.
- N?o alterar contratos, endpoints ou regras de filtro no backend.

Consequ?ncia: a intera??o fica mais leve e compat?vel com a est?tica premium, sem criar estado paralelo nem endpoint novo.

## Valida??o

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Refinamento pós-feedback:
  - `pnpm --dir admin exec biome check --write "src/app/layout.tsx" "src/app/globals.css" "src/lib/chart-time-series.ts" "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/[id]/client.tsx"`
  - `pnpm --dir admin check`
  - `pnpm --dir admin build`
  - `pnpm check`
- Ajuste de sombras p?s-feedback:
  - `pnpm --dir admin exec biome check --write "src/app/globals.css"`
  - `pnpm --dir admin check`
  - `pnpm --dir admin build`
- Ajuste do gr?fico multi-linha p?s-feedback:
  - `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/[id]/client.tsx"`
  - `pnpm --dir admin check`
  - `pnpm --dir admin build`
- Browser local com sess?o Admin real j? existente:
  - `/psicologos` em desktop;
  - `/psicologos/lista` em desktop;
  - `/psicologos/[id]?tab=estatisticas` em desktop.
- Capturas locais foram usadas para inspeção visual durante a execução e descartadas como artefatos temporários.

- Ajuste da lista de psic?logos p?s-feedback:
  - `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/lista/client.tsx"`
  - `pnpm --dir admin check`
  - `pnpm --dir admin build`
  - Smoke HTTP local: `GET http://localhost:3002/psicologos/lista` retornou 200.

- Remo??o das colunas Favoritos e WhatsApp na lista:
  - `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/lista/client.tsx"`
  - `pnpm --dir admin check`
  - `pnpm --dir admin build`
  - Smoke HTTP local: `GET http://localhost:3002/psicologos/lista` retornou 200.

- Busca autom?tica na lista de psic?logos:
  - `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/lista/client.tsx"`
  - `pnpm --dir admin check`
  - `pnpm --dir admin build`
  - Smoke HTTP local: `GET http://localhost:3002/psicologos/lista` retornou 200.


## Microajustes da lista apos feedback

A lista recebeu ajustes finos de proporcao e interacao para manter o piloto com leitura premium:

- O seletor **Ordenar por** passou a usar seta propria com respiro interno a direita, evitando que o icone fique colado na borda.
- O cabecalho e as celulas da coluna **Acoes** foram centralizados para alinhar o titulo aos botoes de acao.
- A busca automatica deixou de remontar o componente de campo a cada atualizacao de `q`, preservando o foco durante a digitacao continua.
- O selo de perfil verificado ao lado do nome foi reduzido para ficar proporcional ao texto da lista.

Consequencia: os ajustes nao alteram contrato, backend, dados exibidos ou navegacao; refinam apenas a apresentacao e a ergonomia da lista.

- Microajustes de dropdown, coluna Acoes, foco da busca e selo verificado:
  - `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/lista/client.tsx"`
  - `pnpm --dir admin check`
  - `pnpm --dir admin build`
  - Smoke HTTP local: `GET http://localhost:3002/psicologos/lista` retornou 200.


## Refinamento da aba Avaliacoes

A aba Avaliacoes do detalhe do psicologo foi refinada dentro do piloto visual para reduzir a percepcao de fonte pesada/grosseira e alinhar a leitura ao restante das telas de Psicologos.

Decisoes:

- Reduzir pesos `font-black` em titulos, autores, contadores, barras de distribuicao e comentarios.
- Adicionar hierarquia com labels pequenos em uppercase, titulos com tracking mais refinado e corpo com `font-medium`.
- Isolar a nota geral em um bloco discreto, sem sombra extra e com tipografia numerica mais elegante.
- Afinar as barras de distribuicao e suavizar contadores/labels para diminuir ruido visual.
- Manter todos os dados reais, filtros por estrela, paginacao e endpoints existentes sem mudanca de contrato.

Validacao deste refinamento:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=avaliacoes` retornou 200.

## Expansao 2026-07-18: Pacientes no piloto premium

Por pedido direto de produto, o escopo `admin-premium-pilot` deixa de cobrir apenas Psicologos/Comunidades e passa a incluir tambem `/pacientes` e `/pacientes/:id`.

Decisoes:

- Aplicar o mesmo escopo visual premium no shell Admin para dashboard e detalhe de Pacientes.
- Manter endpoints, contratos, calculos, privacidade e regras read-only de Pacientes intactos.
- Reorganizar o dashboard de Pacientes em um card de **Visao Geral** com contadores e grafico juntos, seguindo a linguagem do piloto ja validado em Psicologos.
- Trocar os graficos SVG de Pacientes para curvas suaves com `buildSmoothSvgPath`, strokes/markers mais finos e area de plot limpa com borda sutil.
- Remover a largura minima fixa da tabela desktop resumida de Pacientes, mantendo cards mobile e evitando scrollbar horizontal na leitura desktop.
- Corrigir a cor da serie **Comentarios** do detalhe de paciente para um valor definido, evitando `var(--admin-info)` inexistente.

Consequencia: Pacientes passa a participar do piloto visual premium sem criar design system paralelo, sem package novo, sem schema/migration, sem mock e sem alteracao de dados sensiveis.

Validacao desta expansao:

- `pnpm --dir admin exec biome check --write "src/components/admin-shell/shell.tsx" "src/app/(admin)/pacientes/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou 200.
- Smoke HTTP local: `GET http://localhost:3002/pacientes/demo-patient-reviewer-01` retornou 200.

## Ajuste pos-feedback 2026-07-18: seletor de periodo em Pacientes

Por feedback direto no dashboard de Pacientes, os atalhos em botoes **7 dias**, **30 dias** e **90 dias** foram removidos dos headers de `/pacientes` e `/pacientes/:id`. O filtro passa a usar um seletor **Periodo** com a mesma linguagem visual do dashboard de Psicologos, mantendo os campos de data para intervalo personalizado.

Decisoes:

- Exibir presets suportados pelo contrato atual de Pacientes: **Hoje**, **Esta semana** e **Este mes**.
- Nao adicionar **Este ano** nem **Todo o periodo** nesta iteracao, porque os endpoints de Pacientes ainda recebem apenas `from`/`to` e validam limite maximo de 90 dias; expor opcoes sem suporte real poderia gerar erro ou semantica falsa.
- Ao editar manualmente qualquer data, o seletor passa para **Personalizado** e o commit do intervalo continua usando o hook existente `useDateRangeCommitOnBlur`.
- Remover a linha solta **Periodo consultado:** abaixo dos headers, preservando o resumo de periodo retornado pelo backend dentro dos blocos de conteudo.
- Nao alterar backend, contratos HTTP, schema Prisma, migrations, packages, seeds ou mocks.

Validacao deste ajuste:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou 200.
- Smoke HTTP local: `GET http://localhost:3002/pacientes/demo-patient-reviewer-01` retornou 200.

## Ajuste pos-feedback 2026-07-18: padrao completo de periodo em Pacientes

Novo feedback de produto pediu que o seletor de **Periodo** de Pacientes tivesse as mesmas opcoes das demais paginas do painel Admin. Para nao expor opcoes falsas, o contrato de Pacientes foi ampliado para aceitar `period=today|week|month|year|all|custom` em `/pacientes` e `/pacientes/:id`.

Decisoes:

- Adicionar **Este ano** e **Todo o periodo** aos seletores de `/pacientes` e `/pacientes/:id`, mantendo **Hoje**, **Esta semana**, **Este mes** e **Personalizado**.
- Alinhar o backend de Pacientes ao padrao de Psicologos, elevando `max_days` para 3660 dias e resolvendo presets no servidor.
- Em **Todo o periodo**, o dashboard usa o paciente mais antigo carregado de `user.createdAt`; o detalhe usa `user.createdAt` do paciente aberto.
- Presets enviam somente `period`; intervalo manual envia `period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`.
- Manter dados reais e evitar mock/backfill; nao houve mudanca de schema Prisma, migrations ou packages.

Validacao deste ajuste:

- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts" "src/modules/api/admin/private/patients/dashboard/validator/index.ts" "src/modules/api/admin/private/patients/detail/validator/index.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke de servico local: `buildPatientsDashboard({ period: "year" })` retornou `200 Este ano 3660`; `buildPatientsDashboard({ period: "all" })` retornou `200 Todo o periodo`; `showAdminPatient(...period: "year")` retornou `200 Este ano 3660`.

## Ajuste pos-feedback 2026-07-18: contadores e grafico de Pacientes

Novo feedback de produto pediu que o bloco **Visao Geral** de `/pacientes` seguisse exatamente a leitura dos contadores + grafico do dashboard de Psicologos, removendo o card de **Tempo medio do paciente** desse agrupamento.

Decisoes:

- Exibir na Visao Geral somente metricas agregaveis no grafico temporal: total, ativos, inativos e novos cadastros.
- Converter os cards de pacientes para botoes acessiveis com `aria-pressed`, estados ativo/inativo e alternancia de series, preservando pelo menos uma serie visivel.
- Remover legenda separada, resumo textual expansivel e texto auxiliar acima do grafico, porque no padrao de Psicologos os cards funcionam como controle/legenda das series.
- Manter `platform_usage` no contrato e nas notas de cobertura, mas sem card dentro do bloco de contadores + grafico.
- Nao alterar backend, contrato HTTP, schema Prisma, migrations, packages ou dados reais.

Validacao deste ajuste:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes` retornou 200.
- Browser local em `http://localhost:3002/pacientes` inspecionado com sessao Admin existente.

## Ajuste pos-feedback 2026-07-19: remocao dos controles superiores de Pacientes

O detalhe `/pacientes/:id` tinha controles superiores redundantes antes do card do paciente: hero com `TASK-61`, botao **Voltar para pacientes** e filtros de **Periodo**, **De** e **Ate**. Depois do feedback visual, a decisao foi iniciar a tela diretamente pelo card de identificacao do paciente.

Decisoes:

- Remover o hero/card superior do detalhe de Pacientes.
- Remover o botao **Voltar para pacientes** da tela de detalhe.
- Remover os controles visuais de periodo/data do topo do detalhe.
- Preservar o card de dados do paciente como primeiro bloco de conteudo da tela.
- Manter a consulta em dados reais do contrato atual, sem criar mock, fallback artificial ou endpoint novo.
- Nao alterar backend, contratos, privacidade, schema Prisma, migrations, packages ou dados retornados.

Validacao deste ajuste:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes/demo-patient-reviewer-01` retornou 200.

## Pendências

- Validar a aceitação visual com o fundador antes de criar a task de replicação para as demais telas.
- Se aprovado, criar task formal para consolidar tokens/componentes compartilhados e aplicar o modelo no restante do Admin.
- Validação mobile em ~390px deve ser repetida em sessão Admin autenticada dedicada; a tentativa headless sem sessão caiu no fluxo protegido/login e não serve como evidência completa do conteúdo autenticado.
